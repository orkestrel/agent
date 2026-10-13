import type {
	ContinuousArm,
	ContinuousFailurePolicy,
	ContinuousManifest,
	SeriesEntry,
} from './types.js'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { isRecord } from '@orkestrel/contract'
import { readBuild, readWorkload } from '../build/helpers.js'
import {
	DAEMON,
	HARNESS,
	MICA_MODEL,
	MODELS,
	SAMPLER,
	TIMEOUT,
	VENDOR_AGENT,
	VENDOR_OLLAMA,
} from '../constants.js'
import { readSettings } from '../Driver.js'
import { readRuntime } from '../endurance/helpers.js'
import { describeError, readJSON } from '../helpers.js'
import { buildBudget, readModelDigest } from '../matrix/helpers.js'
import { hashFile } from '../refit/helpers.js'
import {
	CONTINUOUS_ARMS,
	CONTINUOUS_BLIND,
	CONTINUOUS_COMPACTION,
	CONTINUOUS_FAILURE,
	CONTINUOUS_LIMITS,
	CONTINUOUS_RESERVE,
	CONTINUOUS_TERMINAL,
	ENDURANCE_ORACLE,
	ENDURANCE_RUNTIME,
	ENDURANCE_WORKLOAD,
} from './constants.js'
import { Audit } from './audit/Audit.js'
import { readContinuousManifest, readContinuousWorkload, unloadModels } from './helpers.js'
import { Trial } from './Trial.js'
import { isContinuousArm, isContinuousFailurePolicy, isContinuousStatus } from './validators.js'

const USAGE =
	'usage: continuous.js freeze --key KEY --out DIR --live [--url URL] [--think true|false] [--reserve TOKENS] [--failure stop|continue] [--workload FILE --runtime FILE --oracle FILE] | run --manifest FILE --arm ARM --out DIR --live [--url URL] | series --manifest FILE... --base DIR --live [--url URL] [--arms a,b,c] | blind ... | report ...'
const AUDIT_USAGE =
	'usage: continuous.js blind --manifest FILE --run DIR... --oracle FILE --out PACKET --keys KEYS | labels --packet PACKET --labels LABELS | report --manifest FILE --run DIR... --oracle FILE --packet PACKET --keys KEYS --labels LABELS --out REPORT'

/** Freezes, runs, and serializes the continuous comparison from the emitted build. */
export class Continuous {
	/**
	 * Parses and executes one phase.
	 * @param argv - The phase and its named arguments
	 * @returns 0 on success, 3 when a run or a series ended at a retained design outcome
	 * @remarks Thrown on a usage error, a custody refusal, or an operational fault.
	 */
	static async execute(argv: readonly string[]): Promise<number> {
		readBuild()
		const { values, positionals } = parseArgs({
			args: [...argv],
			allowPositionals: true,
			options: {
				key: { type: 'string' },
				think: { type: 'string' },
				reserve: { type: 'string' },
				failure: { type: 'string' },
				out: { type: 'string' },
				url: { type: 'string' },
				live: { type: 'boolean', default: false },
				workload: { type: 'string' },
				runtime: { type: 'string' },
				oracle: { type: 'string' },
				settings: { type: 'string' },
				manifest: { type: 'string', multiple: true },
				arm: { type: 'string' },
				arms: { type: 'string' },
				base: { type: 'string' },
				run: { type: 'string', multiple: true },
				keys: { type: 'string' },
				packet: { type: 'string' },
				labels: { type: 'string' },
			},
		})
		const phase = positionals[0]
		if (positionals.length !== 1) throw new Error(USAGE)
		const runner = new Continuous()
		if (phase === 'freeze') {
			if (values.key === undefined || values.out === undefined || !values.live)
				throw new Error(USAGE)
			if (values.think !== undefined && values.think !== 'true' && values.think !== 'false')
				throw new Error('--think must be true or false')
			if (values.failure !== undefined && !isContinuousFailurePolicy(values.failure))
				throw new Error('--failure must be stop or continue')
			const reserve = values.reserve === undefined ? CONTINUOUS_RESERVE : Number(values.reserve)
			if (!Number.isSafeInteger(reserve) || reserve <= 0)
				throw new Error('--reserve must be a positive whole number of tokens on the fixed ladder')
			return await runner.#freeze(
				values.key,
				values.think === 'true',
				values.failure ?? CONTINUOUS_FAILURE,
				reserve,
				resolve(values.out),
				values.url ?? DAEMON,
				values.workload,
				values.runtime,
				values.oracle,
				values.settings,
			)
		}
		if (phase === 'run') {
			const manifest = values.manifest?.[0]
			if (
				manifest === undefined ||
				values.manifest?.length !== 1 ||
				!isContinuousArm(values.arm) ||
				values.out === undefined ||
				!values.live
			)
				throw new Error(USAGE)
			return await runner.#run(resolve(manifest), values.arm, resolve(values.out), values.url)
		}
		if (phase === 'series') {
			if (values.manifest === undefined || values.base === undefined || !values.live)
				throw new Error(USAGE)
			const arms = (values.arms ?? '').split(',').filter((arm) => arm !== '')
			if (!arms.every(isContinuousArm)) throw new Error('--arms must name arms')
			return await runner.#series(
				values.manifest.map((path) => resolve(path)),
				resolve(values.base),
				values.url,
				arms,
			)
		}
		if (phase === 'labels') {
			if (values.packet === undefined || values.labels === undefined) throw new Error(AUDIT_USAGE)
			const checked = new Audit().labels(resolve(values.packet), resolve(values.labels))
			for (const entry of checked.refused)
				console.log(`REFUSED ${entry.id}\n${entry.failures.map((failure) => `  ${failure}`).join('\n')}`)
			console.log(
				`labels: refused ${checked.refused.length}, unlabeled ${checked.unlabeled.length}${checked.unlabeled.length === 0 ? '' : `: ${checked.unlabeled.join(', ')}`}`,
			)
			return checked.refused.length === 0 ? 0 : 3
		}
		const manifest = values.manifest?.[0]
		if (
			(phase === 'blind' || phase === 'report') &&
			(manifest === undefined ||
				values.manifest?.length !== 1 ||
				values.run === undefined ||
				values.oracle === undefined ||
				values.out === undefined ||
				values.keys === undefined)
		)
			throw new Error(AUDIT_USAGE)
		if (phase === 'blind' && manifest !== undefined && values.run !== undefined && values.oracle !== undefined && values.out !== undefined && values.keys !== undefined) {
			new Audit().blind(manifest, values.run, values.oracle, values.out, values.keys)
			return 0
		}
		if (phase === 'report' && manifest !== undefined && values.run !== undefined && values.oracle !== undefined && values.out !== undefined && values.keys !== undefined) {
			if (values.packet === undefined || values.labels === undefined) throw new Error(AUDIT_USAGE)
			new Audit().report(manifest, values.run, values.oracle, values.packet, values.keys, values.labels, values.out)
			return 0
		}
		throw new Error(USAGE)
	}

	async #freeze(
		key: string,
		think: boolean,
		failure: ContinuousFailurePolicy,
		reserve: number,
		out: string,
		url: string,
		workloadPath: string | undefined,
		runtimePath: string | undefined,
		oraclePath: string | undefined,
		settingsPath: string | undefined,
	): Promise<number> {
		const model = Object.entries(MODELS).find(([name]) => name === key)?.[1]
		if (model === undefined) throw new Error(`--key must be one of ${Object.keys(MODELS).join(', ')}`)
		const tags = await fetch(new URL('/api/tags', url))
		if (!tags.ok) throw new Error(`model inventory HTTP ${tags.status}`)
		const inventory: unknown = await tags.json()
		const version = await fetch(new URL('/api/version', url))
		const reported: unknown = await version.json()
		if (!isRecord(reported) || typeof reported.version !== 'string')
			throw new Error('daemon reports no version')
		const runtime = hashFile(resolve(runtimePath ?? ENDURANCE_RUNTIME))
		const oracle = hashFile(resolve(oraclePath ?? ENDURANCE_ORACLE))
		const workload = hashFile(resolve(workloadPath ?? ENDURANCE_WORKLOAD))
		if (workloadPath === undefined) readWorkload(runtime)
		const pinned = readContinuousWorkload(workload.path)
		if (![runtime, oracle].every((file) => pinned.some((entry) => entry.hash === file.hash)))
			throw new Error('workload manifest does not pin the runtime and the oracle')
		const goals = readRuntime(runtime.path).goals.length
		const settings = readSettings(
			settingsPath === undefined ? join(HARNESS, 'bench5', 'settings.json') : resolve(settingsPath),
			key,
		)
		mkdirSync(out, { recursive: true })
		writeFileSync(join(out, 'tags.json'), `${JSON.stringify(inventory, null, 2)}\n`, { flag: 'wx' })
		const manifest: ContinuousManifest = {
			protocol: 'c1',
			key,
			think,
			decision: { model, digest: readModelDigest(inventory, model) },
			summarizer: { model, digest: readModelDigest(inventory, model) },
			judge: { model: MICA_MODEL, digest: readModelDigest(inventory, MICA_MODEL) },
			sampler: { ...SAMPLER },
			budget: buildBudget(reserve),
			compaction: CONTINUOUS_COMPACTION,
			retry: settings.retry,
			timeout: TIMEOUT,
			limits: { ...CONTINUOUS_LIMITS, goals },
			workload,
			runtime,
			oracle,
			agent: hashFile(VENDOR_AGENT),
			ollama: hashFile(VENDOR_OLLAMA),
			tags: hashFile(join(out, 'tags.json')),
			daemon: { url, version: reported.version },
			arms: CONTINUOUS_ARMS,
			blind: CONTINUOUS_BLIND,
			failure,
		}
		const path = join(out, 'manifest.json')
		writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
		readContinuousManifest(path)
		console.log(
			`frozen ${key} think=${think} reserve=${reserve} failure=${failure} daemon=${reported.version} goals=${goals} at ${path}`,
		)
		return 0
	}

	async #run(
		path: string,
		arm: ContinuousArm,
		out: string,
		url: string | undefined,
	): Promise<number> {
		const reference = hashFile(path)
		const { manifest } = readContinuousManifest(path)
		if (!manifest.arms.includes(arm)) throw new Error(`the manifest does not serve the ${arm} arm`)
		return await new Trial({
			manifest,
			reference,
			arm,
			out,
			url: url ?? manifest.daemon.url,
			live: true,
		}).execute()
	}

	async #series(
		paths: readonly string[],
		base: string,
		url: string | undefined,
		arms: readonly ContinuousArm[],
	): Promise<number> {
		mkdirSync(base, { recursive: true })
		const entries: SeriesEntry[] = []
		const journal = join(base, 'series.jsonl')
		for (const path of paths) {
			const reference = hashFile(path)
			const { manifest } = readContinuousManifest(path)
			for (const arm of manifest.arms) {
				if (arms.length > 0 && !arms.includes(arm)) continue
				const out = join(base, manifest.key, arm)
				const started = Date.now()
				let entry: SeriesEntry
				if (existsSync(out)) {
					const info = existsSync(join(out, 'run.json')) ? readJSON(join(out, 'run.json')) : undefined
					const status =
						isRecord(info) && isContinuousStatus(info.status) ? info.status : undefined
					if (status === undefined || !CONTINUOUS_TERMINAL.includes(status))
						throw new Error(`run output exists without a terminal status: ${out}`)
					entry = { manifest: reference, key: manifest.key, arm, out, status: 'skipped', wall: 0 }
				} else {
					const daemon = url ?? manifest.daemon.url
					let error: string | undefined
					try {
						await unloadModels(daemon)
						await new Trial({ manifest, reference, arm, out, url: daemon, live: true }).execute()
					} catch (fault) {
						error = describeError(fault)
					}
					const info = existsSync(join(out, 'run.json')) ? readJSON(join(out, 'run.json')) : undefined
					const status =
						isRecord(info) && isContinuousStatus(info.status) ? info.status : 'failed'
					entry = {
						manifest: reference,
						key: manifest.key,
						arm,
						out,
						status,
						...(error === undefined ? {} : { error }),
						wall: Date.now() - started,
					}
				}
				entries.push(entry)
				writeFileSync(journal, `${entries.map((one) => JSON.stringify(one)).join('\n')}\n`)
				console.log(
					`series ${manifest.key} ${arm}: ${entry.status}${entry.error === undefined ? '' : ` (${entry.error})`} wall=${entry.wall}ms`,
				)
			}
		}
		return entries.every(
			(entry) => entry.status === 'skipped' || CONTINUOUS_TERMINAL.includes(entry.status),
		)
			? 0
			: 3
	}
}
