import type { LedgerBenchArm } from './setup.js'
import type { LedgerSnapshot, Selection } from '@src/core'
import type { RouteInput } from '@orkestrel/router'
import type { ServerInterface } from '@orkestrel/server'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { dirname } from 'node:path'
import { createLedger, isLedgerSnapshot } from '@src/core'
import { isRecord, isString, parseJSONAs } from '@orkestrel/contract'
import { createDispatcher } from '@orkestrel/router'
import { createServer } from '@orkestrel/server'
import { createRecorder, requireValue } from '@orkestrel/test'
import {
	buildLedgerBenchOptions,
	computeTextDigest,
	createLedgerJudge,
	createScriptedProvider,
	LEDGER_BENCH_MODEL,
	renderLedgerPositions,
	seedLedgerPrefix,
} from './setup.js'

/**
 * Creates a protocol fixture server bound to IPv4 loopback on an ephemeral port.
 *
 * @remarks
 * The caller owns start and stop. After start resolves, stop it in a finally block.
 * Each call creates its own dispatcher and listener; no process lifecycle hook is installed.
 *
 * @param routes - The real dispatcher routes served by this fixture
 * @returns An unstarted server whose caller owns cleanup
 * @example
 * ```ts
 * const server = createFixtureServer([{ method: 'POST', path: '/answer', handler: () => Response.json({ answer: 1 }) }])
 * const port = await server.start()
 * try { await fetch('http://127.0.0.1:' + port + '/answer', { method: 'POST' }) }
 * finally { await server.stop() }
 * ```
 */
export function createFixtureServer(routes: readonly RouteInput[]): ServerInterface<undefined> {
	return createServer({
		dispatcher: createDispatcher({ routes }),
		state: () => undefined,
		host: '127.0.0.1',
		port: 0,
	})
}

/**
 * Releases a parked scenario, stops a started fixture server, and times the stop.
 *
 * @remarks
 * The interval opens after `release` returns, so it measures what the server spends draining
 * the work the release unparked, never the release itself. The caller supplies the failure path:
 * stopping from a rejection handler runs the same cleanup before the error is rethrown.
 *
 * @param server - The started server to stop
 * @param release - Unparks the work the server is holding, such as a gate's `resolve`
 * @returns The milliseconds `server.stop()` took, read with `performance.now()`
 * @example
 * ```ts
 * const gate = Promise.withResolvers<void>()
 * const elapsed = await stopTimed(server, gate.resolve)
 * ```
 */
export async function stopTimed(
	server: ServerInterface<undefined>,
	release: () => void,
): Promise<number> {
	release()
	const closing = performance.now()
	await server.stop()
	return performance.now() - closing
}

/** Carries what one timed ledger bench request measured, from the agent's first `start` event to its first `select` event. */
export interface LedgerSample {
	readonly wall: number
	readonly cpu: number
	readonly asked: number
	readonly starts: number
	readonly selects: number
	readonly faults: number
	readonly outcomes: Readonly<Record<string, number>>
	readonly digest: string
}

/** Carries the host's summed core times, its summed idle time, and this process's CPU, in milliseconds. */
export interface HostTimes {
	readonly total: number
	readonly idle: number
	readonly own: NodeJS.CpuUsage
}

/** Names what a ledger bench process does with its cell: seed the prefix, log one digest, or time samples. */
export type LedgerCellTask = 'seed' | 'digest' | 'time'

/**
 * Carries one ledger bench cell: the arm and size, the measured sample count, the task, and the
 * optional busy wait, fixed warmup count, seed file, and record file.
 */
export interface LedgerCell {
	readonly arm: LedgerBenchArm
	readonly size: number
	readonly count: number
	readonly task: LedgerCellTask
	readonly wait?: number
	readonly warmups?: number
	readonly seed?: string
	readonly record?: string
}

/** Carries what a ledger bench run reports of its measurement: tinybench's latency mean and relative margin of error. */
export interface LedgerBenchResult {
	readonly latency: { readonly mean: number; readonly rme: number }
}

/** Carries the run options a ledger bench measurement passes to tinybench. */
export interface LedgerBenchRun {
	readonly time: number
	readonly iterations: number
	readonly warmup: boolean
	readonly throws: boolean
}

/** Registers one ledger bench measurement, as the Vitest `bench` test-context fixture does. */
export type LedgerBench = (
	name: string,
	options: Readonly<Record<never, never>>,
	fn: () => Promise<void>,
) => { run(options: LedgerBenchRun): Promise<LedgerBenchResult> }

/** Carries what one ledger bench process recorded: its cell, its worker, its samples, and its readings. */
export interface LedgerCellRecord {
	readonly cell: LedgerCell
	readonly pid: number
	readonly version: string
	readonly v8: string
	readonly flags: readonly string[]
	readonly seed: string
	readonly warmups: readonly LedgerSample[]
	readonly samples: readonly LedgerSample[]
	readonly digests: readonly string[]
	readonly load: number
	readonly mean?: number
	readonly rme?: number
}

/** Names the environment variable that holds the path of a ledger bench cell file. */
export const LEDGER_CELL_VARIABLE = 'LEDGER_BENCH_CELL'

/** Holds what a ledger bench process does when no cell file is named: three timed samples, seeded in memory. */
export const LEDGER_CELL_DEFAULT = Object.freeze({ count: 3, task: 'time' } as const)

/** Holds the warmup rule of a ledger bench process: at least `wall` milliseconds of region wall and `least` samples, at most `most` samples. */
export const LEDGER_WARMUP = Object.freeze({ wall: 1000, least: 2, most: 30 })

/** Names the line prefix a ledger bench process logs before each sample's JSON. */
export const LEDGER_SAMPLE_LINE = 'ledger-sample'

/**
 * Registers a busy wait on an emitter's `start` event, spun on `performance.now()`, so the wait
 * holds the thread as a slower selection would.
 *
 * @param emitter - The emitter to register on, such as an agent's
 * @param milliseconds - The wait; undefined registers nothing
 * @example
 * ```ts
 * addBusyWait(ledger.agent.emitter, 20)
 * ```
 */
export function addBusyWait(
	emitter: { on(event: 'start', handler: () => void): void },
	milliseconds: number | undefined,
): void {
	if (milliseconds === undefined) return
	emitter.on('start', () => {
		const deadline = performance.now() + milliseconds
		while (performance.now() < deadline) {
			// Spins on the clock until the deadline passes.
		}
	})
}

/**
 * Takes one timed sample of a ledger bench request: a fresh ledger hydrated from `snapshot`, with
 * every topic skipping requests and a judge that rejects when a question reaches it.
 *
 * @param snapshot - The seeded snapshot to hydrate from
 * @param wait - The busy wait in milliseconds, registered after the `start` mark; undefined registers none
 * @returns The wall and CPU time from the first `start` to the first `select`, the judge-call count, the event tallies, the reading outcomes, and the digest of the position-labelled selection
 */
export async function takeLedgerSample(
	snapshot: LedgerSnapshot,
	wait?: number,
): Promise<LedgerSample> {
	const asked = createRecorder<readonly [key: string]>()
	const ledger = createLedger(
		createScriptedProvider([{ content: 'Noted.' }]),
		buildLedgerBenchOptions(
			createLedgerJudge(
				asked,
				() => Promise.reject(new Error('the timed ledger judge was reached')),
				LEDGER_BENCH_MODEL,
			),
			false,
			snapshot,
		),
	)
	const marks =
		createRecorder<
			readonly [name: 'start' | 'select' | 'fault', usage: NodeJS.CpuUsage, at: number]
		>()
	const selections = createRecorder<readonly [selection: Selection]>()
	ledger.agent.emitter.on('start', () =>
		marks.handler('start', process.cpuUsage(), performance.now()),
	)
	addBusyWait(ledger.agent.emitter, wait)
	ledger.agent.emitter.on('select', (selection) => {
		marks.handler('select', process.cpuUsage(), performance.now())
		selections.handler(selection)
	})
	ledger.agent.emitter.on('fault', () =>
		marks.handler('fault', process.cpuUsage(), performance.now()),
	)
	const result = await ledger.respond('What is the status of OR-1000?')
	const [, startUsage, startAt] = requireValue(marks.calls.find(([name]) => name === 'start'))
	const [, selectUsage, selectAt] = requireValue(marks.calls.find(([name]) => name === 'select'))
	const [selection] = requireValue(selections.calls.at(0))
	return {
		wall: selectAt - startAt,
		cpu: (selectUsage.user - startUsage.user + (selectUsage.system - startUsage.system)) / 1000,
		asked: asked.count,
		starts: marks.calls.filter(([name]) => name === 'start').length,
		selects: marks.calls.filter(([name]) => name === 'select').length,
		faults: marks.calls.filter(([name]) => name === 'fault').length,
		outcomes: Object.fromEntries(
			[...Map.groupBy(result.readings, (reading) => reading.outcome)].map(
				([outcome, group]) => [outcome, group.length] as const,
			),
		),
		digest: await computeTextDigest(
			renderLedgerPositions(selection.messages, ledger.conversation.messages()),
		),
	}
}

/**
 * Reads the host's summed core times, its summed idle time, and this process's CPU.
 *
 * @returns The host reading
 */
export function readHostTimes(): HostTimes {
	const times = cpus().map((core) => core.times)
	return {
		total: times.reduce((sum, one) => sum + one.user + one.nice + one.sys + one.idle + one.irq, 0),
		idle: times.reduce((sum, one) => sum + one.idle, 0),
		own: process.cpuUsage(),
	}
}

/**
 * Measures the host's other load while a run is in flight: the busy share of the host's capacity
 * less this process's own CPU.
 *
 * @param run - The run to wait for
 * @returns The run's value and the other load, from 0 to 1
 */
export async function measureOtherLoad<T>(
	run: () => Promise<T>,
): Promise<{ readonly value: T; readonly load: number }> {
	const before = readHostTimes()
	const value = await run()
	const after = readHostTimes()
	const total = after.total - before.total
	const own = (after.own.user - before.own.user + (after.own.system - before.own.system)) / 1000
	return {
		value,
		load: total <= 0 ? 0 : Math.max(0, total - (after.idle - before.idle) - own) / total,
	}
}

/**
 * Checks whether a value is a ledger bench cell.
 *
 * @param value - The value to check
 * @returns True if the value carries a known arm and task, a positive size and count, and well-typed optional members; false otherwise.
 */
export function isLedgerCell(value: unknown): value is LedgerCell {
	return (
		isRecord(value) &&
		(value.arm === 'correction' || value.arm === 'control') &&
		(value.task === 'seed' || value.task === 'digest' || value.task === 'time') &&
		Number.isSafeInteger(value.size) &&
		Number(value.size) > 0 &&
		Number.isSafeInteger(value.count) &&
		Number(value.count) > 0 &&
		(value.wait === undefined || (Number.isFinite(value.wait) && Number(value.wait) >= 0)) &&
		(value.warmups === undefined ||
			(Number.isSafeInteger(value.warmups) && Number(value.warmups) >= 0)) &&
		(value.seed === undefined || isString(value.seed)) &&
		(value.record === undefined || isString(value.record))
	)
}

/**
 * Reads the ledger bench cell the environment names for one arm and size.
 *
 * @param arm - The arm the calling bench case measures
 * @param size - The conversation length the calling bench case measures
 * @param env - The environment to read {@link LEDGER_CELL_VARIABLE} from. Default: `process.env`
 * @returns The cell the named file holds, or the arm and size with {@link LEDGER_CELL_DEFAULT} when the variable is unset
 * @throws {Error} Thrown when the named file holds no ledger bench cell, or a cell for another arm or size
 */
export function readLedgerCell(
	arm: LedgerBenchArm,
	size: number,
	env: Readonly<Record<string, string | undefined>> = process.env,
): LedgerCell {
	const path = env[LEDGER_CELL_VARIABLE]
	if (path === undefined) return { arm, size, ...LEDGER_CELL_DEFAULT }
	const cell = parseJSONAs(readFileSync(path, 'utf8'), isLedgerCell)
	if (cell === undefined) throw new Error(`${path} holds no ledger bench cell`)
	if (cell.arm !== arm || cell.size !== size)
		throw new Error(`${path} names the ${cell.arm} arm at ${cell.size}, not ${arm} at ${size}`)
	return cell
}

/**
 * Checks that a ledger bench sample kept the bench's invariants: the judge never asked, one
 * `start`, one `select`, no `fault`, and every reading filed from cache.
 *
 * @param sample - The sample to check
 * @returns The same sample
 * @throws {Error} Thrown when the sample breaks an invariant
 */
export function checkLedgerSample(sample: LedgerSample): LedgerSample {
	const outcomes = Object.keys(sample.outcomes)
	if (
		sample.asked !== 0 ||
		sample.starts !== 1 ||
		sample.selects !== 1 ||
		sample.faults !== 0 ||
		outcomes.length !== 1 ||
		outcomes[0] !== 'cached'
	)
		throw new Error(`the ledger bench sample broke an invariant: ${JSON.stringify(sample)}`)
	return sample
}

/**
 * Takes the warmup samples of a ledger bench process through the timed sample: `count` samples
 * when given, or else samples until {@link LEDGER_WARMUP} is met.
 *
 * @param snapshot - The seeded snapshot each sample hydrates from
 * @param wait - The busy wait each sample registers; undefined registers none
 * @param count - The fixed warmup count; undefined applies {@link LEDGER_WARMUP}
 * @param taken - The warmup samples taken so far
 * @returns Every warmup sample in the order taken
 */
export async function warmLedgerSamples(
	snapshot: LedgerSnapshot,
	wait: number | undefined,
	count: number | undefined,
	taken: readonly LedgerSample[] = [],
): Promise<readonly LedgerSample[]> {
	const wall = taken.reduce((sum, sample) => sum + sample.wall, 0)
	const warm =
		count === undefined
			? taken.length >= LEDGER_WARMUP.most ||
				(taken.length >= LEDGER_WARMUP.least && wall >= LEDGER_WARMUP.wall)
			: taken.length >= count
	if (warm) return taken
	const sample = logLedgerSample(
		'warmup',
		checkLedgerSample(await takeLedgerSample(snapshot, wait)),
	)
	return warmLedgerSamples(snapshot, wait, count, [...taken, sample])
}

/**
 * Logs one ledger bench sample as a {@link LEDGER_SAMPLE_LINE} line of JSON, which the slot
 * runner compares with the cell record.
 *
 * @param phase - Whether the sample warmed the process or was measured
 * @param sample - The sample to log
 * @returns The same sample
 */
export function logLedgerSample(phase: 'warmup' | 'measured', sample: LedgerSample): LedgerSample {
	console.log(`${LEDGER_SAMPLE_LINE} ${JSON.stringify({ phase, ...sample })}`)
	return sample
}

/**
 * Runs the ledger bench cell the environment names for one arm and size: seeds its prefix, logs one
 * digest, or warms and times its samples through `bench`, then writes its record.
 *
 * @remarks
 * A seed task loads or writes the seed file and takes no sample. A digest task takes one sample
 * and no warmup. A time task takes the warmups, then `count` measured samples through one
 * `bench(name, {}, fn).run({ time: 0, iterations: count, warmup: false, throws: true })` call,
 * whose own timing serves only the reported `mean` and `rme`. Every sample is checked and logged,
 * and the record lists the distinct selection digests of the warmups and the measured samples.
 *
 * @param bench - The `bench` test-context fixture
 * @param arm - The arm the calling bench case measures
 * @param size - The conversation length the calling bench case measures
 * @param env - The environment to read the cell from. Default: `process.env`
 * @returns The cell record, also written to the cell's record file when it names one
 * @throws {Error} Thrown when the cell cannot be read or a sample breaks an invariant
 */
export async function runLedgerCell(
	bench: LedgerBench,
	arm: LedgerBenchArm,
	size: number,
	env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<LedgerCellRecord> {
	const cell = readLedgerCell(arm, size, env)
	const snapshot = await loadLedgerSeed(cell.seed, arm, size)
	const seed = await computeTextDigest(JSON.stringify(snapshot))
	const warmups =
		cell.task === 'time' ? await warmLedgerSamples(snapshot, cell.wait, cell.warmups) : []
	const samples = createRecorder<readonly [sample: LedgerSample]>()
	const measured = await measureOtherLoad(async () => {
		if (cell.task === 'time')
			return bench(`${arm} ${size}`, {}, async () =>
				samples.handler(
					logLedgerSample(
						'measured',
						checkLedgerSample(await takeLedgerSample(snapshot, cell.wait)),
					),
				),
			).run({ time: 0, iterations: cell.count, warmup: false, throws: true })
		if (cell.task === 'digest')
			samples.handler(
				logLedgerSample('measured', checkLedgerSample(await takeLedgerSample(snapshot))),
			)
		return undefined
	})
	const taken = samples.calls.map(([sample]) => sample)
	const record: LedgerCellRecord = {
		cell,
		pid: process.pid,
		version: process.version,
		v8: process.versions.v8,
		flags: process.execArgv,
		seed,
		warmups,
		samples: taken,
		digests: [...new Set([...warmups, ...taken].map((sample) => sample.digest))],
		load: measured.load,
		...(measured.value === undefined
			? {}
			: { mean: measured.value.latency.mean, rme: measured.value.latency.rme }),
	}
	if (cell.record !== undefined) writeLedgerRecord(cell.record, record)
	return record
}

/**
 * Loads a ledger bench seed: reads the snapshot a seed file holds, or seeds the prefix and writes
 * it there when the file is absent.
 *
 * @param path - The seed file; undefined seeds in memory and writes nothing
 * @param arm - The history the prefix serves
 * @param size - The conversation length the seeded snapshot holds
 * @returns The seeded snapshot
 * @throws {Error} Thrown when the file holds no ledger snapshot
 */
export async function loadLedgerSeed(
	path: string | undefined,
	arm: LedgerBenchArm,
	size: number,
): Promise<LedgerSnapshot> {
	if (path !== undefined && existsSync(path)) {
		const snapshot = parseJSONAs(readFileSync(path, 'utf8'), isLedgerSnapshot)
		if (snapshot === undefined) throw new Error(`${path} holds no ledger snapshot`)
		return snapshot
	}
	const seed = await seedLedgerPrefix(size, arm)
	if (path !== undefined) {
		mkdirSync(dirname(path), { recursive: true })
		writeFileSync(path, JSON.stringify(seed.snapshot))
	}
	return seed.snapshot
}

/**
 * Writes a ledger bench cell record as JSON, creating its directory.
 *
 * @param path - The record file
 * @param record - The record: the samples, digests, tallies, other load, and the worker's process id
 */
export function writeLedgerRecord(path: string, record: unknown): void {
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, `${JSON.stringify(record, null, '\t')}\n`)
}
