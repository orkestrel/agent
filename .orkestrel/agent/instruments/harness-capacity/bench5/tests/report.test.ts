import { BUILD } from '../constants.js'
import { buildSupportPlan } from '../aggregates/helpers.js'
import { buildCacheKey } from '../helpers.js'
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { HARNESS } from '../constants.js'

type Table = Readonly<Record<string, unknown>>
type Arm = 'control' | 'aggregate'

interface RunData {
	readonly info: Table
	readonly rows: readonly Table[]
	readonly picks: readonly Table[]
	readonly calls: readonly Table[]
	readonly events: readonly Table[]
	/** Maps a request sequence to the prompt count its wire response holds. */
	readonly wire: Readonly<Record<number, number>>
}

interface Outcome {
	readonly status: number | null
	readonly stdout: string
	readonly stderr: string
}

interface Passes {
	readonly control: ReadonlyArray<readonly boolean[]>
	readonly aggregate: ReadonlyArray<readonly boolean[]>
}

type Tweak = (data: RunData, arm: Arm, copy: number) => RunData

const REPORT = join(BUILD, 'bench5', 'report.js')
const MODEL = 'qwen3.5:2b-q4_K_M'
// The goals in file order; g06 is outside every comparison.
const GOALS = ['g01-alpha', 'g06-skip', 'g11-gamma', 'g12-delta']
const SUMMARIES =
	'### Topic summaries\n\n#### Refunds, as of 2026-10-08\nIds: LH-100\nThe refund is 40 dollars.'
const SEED = [
	'Order LH-100 refund is 40 dollars.',
	'Late code WKND15 gives 15 percent off.',
	'Adeyemi signs off on exceptions.',
]
const SEED_KINDS = SEED.map((content) => ({ role: 'user', content }))
// Hand-computed: d is 1, 1, -1, 2 over g01, g11, and g12; the g06 flips would change every value.
const POSITIVE: Passes = {
	control: [
		[true, false, true, false],
		[true, false, false, false],
		[true, true, true, true],
		[false, false, false, true],
	],
	aggregate: [
		[true, true, true, true],
		[true, false, true, false],
		[true, false, false, true],
		[true, true, true, true],
	],
}
// Hand-computed: d is -1, -2, -1, -2, so mean + 2·sd/√4 is -1.5 + 0.57735 < 0.
const NEGATIVE: Passes = {
	control: [
		[true, false, true, true],
		[true, false, true, true],
		[true, false, true, true],
		[true, false, true, true],
	],
	aggregate: [
		[true, false, true, false],
		[false, false, true, false],
		[true, false, true, false],
		[false, false, true, false],
	],
}

const scratch = join(HARNESS, '..', '..', '..', '..', 'tmp', 'units')
mkdirSync(scratch, { recursive: true })
const directory = mkdtempSync(join(scratch, 'bench5-report-'))
const blocker = join(directory, 'blocker.ts')
const copies = join(directory, 'copies')
let bases = 0

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function dig(value: unknown, ...path: ReadonlyArray<string | number>): unknown {
	let found = value
	for (const step of path) {
		if (typeof step === 'number') found = Array.isArray(found) ? found[step] : undefined
		else found = isRecord(found) ? found[step] : undefined
	}
	return found
}

function readNumberAt(value: unknown, ...path: ReadonlyArray<string | number>): number {
	const found = dig(value, ...path)
	assert.equal(typeof found, 'number', path.join('.'))
	return Number(found)
}

function expectClose(actual: number, expected: number, label: string): void {
	assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: ${actual} against ${expected}`)
}

function buildRow(arm: Arm, goal: string, success: boolean): Table {
	const aggregate = arm === 'aggregate'
	return {
		goal,
		success,
		reply: '',
		via: 'final',
		passes: 1,
		faults: 0,
		wall: 100,
		stage: aggregate ? 50 : 0,
		flush: 0,
		prompt: 900,
		entry: 900,
		overflow: false,
		recalls: { calls: 0, closed: 0 },
		lookups: { calls: 1, repeats: 0 },
		questions: { category: { fresh: 1, hits: 2 } },
		briefing: { tokens: 100, facts: 1, stale: 0, digest: `digest-${goal}` },
		scale: 2,
		tail: `tail-${goal}`,
		rendered: aggregate ? ['refunds'] : [],
		cut: [],
		withheld: [],
		emptied: [],
		summary: aggregate ? 20 : 0,
		filtered: 0,
		sole: 0,
	}
}

function buildPick(arm: Arm, goal: string, at: number): Table {
	return {
		goal,
		pass: 1,
		sequence: 10 * (at + 1) + 1,
		briefing: `Briefing for ${goal}`,
		digest: `digest-${goal}`,
		tail: [{ index: 0, role: 'user', content: SEED[0] }],
		instructions: {
			date: 'Today is Thursday 2026-10-08.',
			...(arm === 'aggregate' ? { summaries: SUMMARIES } : {}),
		},
		scale: 2,
	}
}

// Each goal sends one agent, judge, and flush request, and the aggregate arm one summarizer request too; the calibration call has no goal.
function buildCalls(arm: Arm): readonly Table[] {
	const calls: Table[] = [{ sequence: 1, role: 'agent', started: 0, wall: 10, status: 200 }]
	for (const [at, goal] of GOALS.entries()) {
		const base = 10 * (at + 1)
		calls.push({ sequence: base + 2, role: 'agent', goal, started: 0, wall: 100, status: 200 })
		calls.push({ sequence: base + 3, role: 'judge', goal, started: 0, wall: 400, status: 200 })
		calls.push({ sequence: base + 5, role: 'flush', goal, started: 0, wall: 5, status: 200 })
		if (arm === 'aggregate')
			calls.push({
				sequence: base + 4,
				role: 'summarizer',
				goal,
				started: 0,
				wall: 1000,
				status: 200,
			})
	}
	return calls
}

function buildEvent(goal: string, event: string, fields: Table): Table {
	return {
		topic: 'refunds',
		title: 'Refunds',
		goal,
		lastSeed: 0,
		event,
		version: 1,
		status: 'current',
		sources: [],
		trigger: undefined,
		answers: {},
		failures: [],
		wall: 0,
		cached: false,
		...fields,
	}
}

function buildEvents(): readonly Table[] {
	return [
		buildEvent('g01-alpha', 'build', { trigger: 'first', wall: 500 }),
		buildEvent('g01-alpha', 'agree', { answers: { agree: 0.9 }, wall: 300 }),
		buildEvent('g11-gamma', 'change', { answers: { change: 0.9 }, wall: 200 }),
		buildEvent('g11-gamma', 'build', { trigger: 'change', wall: 600, cached: true }),
		buildEvent('g12-delta', 'change', { answers: { change: 0.5 }, wall: 100 }),
	]
}

// The wire holds the agent requests at 1000 tokens, the calibration request at 2000, and the summarizer requests at 4000.
function buildWire(arm: Arm): Readonly<Record<number, number>> {
	const wire: Record<number, number> = { 1: 2000 }
	for (const at of GOALS.keys()) {
		wire[10 * (at + 1) + 2] = 1000
		if (arm === 'aggregate') wire[10 * (at + 1) + 4] = 4000
	}
	return wire
}

function buildData(arm: Arm, copy: number, pass: readonly boolean[]): RunData {
	return {
		info: {
			status: 'complete',
			arm,
			copy,
			model: MODEL,
			goals: GOALS,
			judge: { hits: {}, misses: {}, transient: 0 },
			fit: { change: 0.8, agree: 0.8, separated: true },
			gauge: { fixed: 400, scale: 2 },
			wall: 12000,
		},
		rows: GOALS.map((goal, at) => buildRow(arm, goal, pass[at] === true)),
		picks: GOALS.map((goal, at) => buildPick(arm, goal, at)),
		calls: buildCalls(arm),
		events: arm === 'aggregate' ? buildEvents() : [],
		wire: buildWire(arm),
	}
}

function writeLines(path: string, rows: readonly Table[]): void {
	writeFileSync(path, rows.map((row) => `${JSON.stringify(row)}\n`).join(''))
}

function writeRun(base: string, name: string, arm: Arm, data: RunData): void {
	const dir = join(base, name)
	mkdirSync(dir, { recursive: true })
	writeFileSync(join(dir, 'run.json'), JSON.stringify(data.info))
	writeLines(join(dir, 'rows.jsonl'), data.rows)
	writeLines(join(dir, 'selections.jsonl'), data.picks)
	writeLines(join(dir, 'calls.jsonl'), data.calls)
	if (arm === 'aggregate') writeLines(join(dir, 'aggregates.jsonl'), data.events)
	mkdirSync(`${dir}-wire`)
	for (const [sequence, count] of Object.entries(data.wire)) {
		const text = `${JSON.stringify({ message: { content: 'a' }, done: false })}\n${JSON.stringify({ done: true, done_reason: 'stop', prompt_eval_count: count, eval_count: 50 })}\n`
		writeFileSync(
			join(`${dir}-wire`, `${sequence.padStart(5, '0')}_api_chat-response.json`),
			JSON.stringify({ status: 200, ms: 5, text }),
		)
		const goal = data.calls.find((call) => call['sequence'] === Number(sequence))?.['goal']
		const pick = data.picks.find((one) => one['goal'] === goal)
		const instructions = dig(pick, 'instructions')
		const tail = dig(pick, 'tail')
		writeFileSync(
			join(`${dir}-wire`, `${sequence.padStart(5, '0')}_api_chat-request.json`),
			JSON.stringify({
				body: {
					messages: [
						{
							role: 'system',
							content: [
								'The Refunds desk.',
								...(isRecord(instructions) ? Object.values(instructions) : []),
								dig(pick, 'briefing'),
							].join('\n\n'),
						},
						...(Array.isArray(tail) ? tail : []),
					],
				},
			}),
		)
	}
}

function keep(data: RunData): RunData {
	return data
}

// Writes the runs of copies 1 to 4 of one model under a fresh base and returns it; the first copy's aggregate folder takes the fill name when asked.
function writeBase(passes: Passes, tweak: Tweak = keep, fill = false): string {
	bases += 1
	const base = join(directory, `base-${bases}`)
	mkdirSync(base)
	for (let copy = 1; copy <= 4; copy += 1) {
		for (const arm of ['control', 'aggregate'] as const) {
			const pass = passes[arm][copy - 1] ?? []
			const name = `l5-q2-${arm === 'aggregate' && fill && copy === 1 ? 'aggregatefill' : arm}-v${copy}`
			writeRun(base, name, arm, tweak(buildData(arm, copy, pass), arm, copy))
		}
	}
	return base
}

function editRows(data: RunData, goal: string, fields: Table): RunData {
	return {
		...data,
		rows: data.rows.map((row) => (row['goal'] === goal ? { ...row, ...fields } : row)),
	}
}

function editPicks(data: RunData, goal: string, fields: Table): RunData {
	return {
		...data,
		picks: data.picks.map((pick) => (pick['goal'] === goal ? { ...pick, ...fields } : pick)),
	}
}

function onCopy(copy: number, arm: Arm, edit: (data: RunData) => RunData): Tweak {
	return (data, at, number) => (at === arm && number === copy ? edit(data) : data)
}

function onArms(copy: number, edit: (data: RunData, arm: Arm) => RunData): Tweak {
	return (data, arm, number) => (number === copy ? edit(data, arm) : data)
}

function onAggregates(edit: (data: RunData) => RunData): Tweak {
	return (data, arm) => (arm === 'aggregate' ? edit(data) : data)
}

interface GoalSpec {
	readonly id: string
	readonly after: number
	readonly facts: readonly number[]
	readonly expected: readonly string[]
	readonly any: readonly string[]
	readonly patterns: readonly string[]
}

const GOAL_SPECS: readonly GoalSpec[] = [
	{
		id: 'g01-alpha',
		after: 0,
		facts: [0],
		expected: ['40 dollars'],
		any: ['refund'],
		patterns: [],
	},
	{ id: 'g06-skip', after: 1, facts: [], expected: ['nothing'], any: [], patterns: [] },
	{ id: 'g11-gamma', after: 2, facts: [1], expected: ['wknd15'], any: [], patterns: [] },
	{ id: 'g12-delta', after: 2, facts: [2], expected: ['adeyemi'], any: [], patterns: ['late10'] },
]

function buildGoal(spec: GoalSpec): Table {
	return {
		id: spec.id,
		request: `Request for ${spec.id}`,
		after: spec.after,
		facts: spec.facts,
		stale: [],
		expected: spec.expected,
		expectedAny: spec.any,
		forbidden: [],
		forbiddenPatterns: spec.patterns,
	}
}

function writeCopy(target = copies, replacement?: Table): void {
	const scenario = {
		ledger: { system: 'You help the support desk.', topics: { refunds: 'Refund rules' } },
		days: [{ date: '2026-10-08', from: 0 }],
		seed: SEED_KINDS,
		tools: {},
		lookups: [],
		goals: GOAL_SPECS.map((spec) =>
			spec.id === 'g11-gamma' && replacement !== undefined ? replacement : buildGoal(spec),
		),
		cases: [
			{ case: 'expiry', goal: 'g11-gamma' },
			{ case: 'amend', goal: 'g12-delta' },
			{ case: 'ignored', goal: 'g06-skip' },
			{ case: 'unscored', goal: 'g12-delta', scored: false },
		],
	}
	mkdirSync(target)
	for (let copy = 1; copy <= 4; copy += 1)
		writeFileSync(join(target, `v${copy}.json`), JSON.stringify(scenario))
}

function runReport(args: readonly string[]): Outcome {
	const run = spawnSync(
		process.execPath,
		['--import', pathToFileURL(blocker).href, REPORT, '--archive', ...args],
		{ cwd: HARNESS, encoding: 'utf8' },
	)
	return { status: run.status, stdout: run.stdout, stderr: run.stderr }
}

function runPair(
	base: string,
	range = '1-4',
	extra: readonly string[] = [],
	scenario = copies,
): Outcome {
	return runReport(['--base', base, '--copies', scenario, '--pair', `q2,${range}`, ...extra])
}

function readPair(base: string, range = '1-4', scenario = copies): unknown {
	const json = join(base, 'report.json')
	const outcome = runPair(base, range, ['--json', json], scenario)
	assert.equal(outcome.status, 0, outcome.stderr)
	return dig(JSON.parse(readFileSync(json, 'utf8')), 'pairs', 0)
}

// Reads the failures of one invariant from a pair report.
function listFailures(pair: unknown, name: string): readonly unknown[] {
	const invariants = dig(pair, 'invariants')
	assert.ok(Array.isArray(invariants))
	const found = invariants.find((invariant) => dig(invariant, 'name') === name)
	const failures = dig(found, 'failures')
	assert.ok(Array.isArray(failures), name)
	return failures
}

function expectStop(base: string, name: string, pattern: RegExp): void {
	const outcome = runPair(base)
	assert.equal(outcome.status, 0, outcome.stderr)
	assert.match(outcome.stdout, new RegExp(`^invariant ${name} FAIL .*${pattern.source}`, 'm'))
	assert.match(
		outcome.stdout,
		new RegExp(`^verdict STOP \\(invariant [^)]*\\b${name}\\b[^)]*\\)$`, 'm'),
	)
}

describe('report.ts', () => {
	before(() => {
		writeFileSync(
			blocker,
			[
				'const original = globalThis.fetch',
				'globalThis.fetch = (input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> => {',
				"\tconst href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url",
				'\tif (/:11434\\b/.test(href)) return Promise.reject(new Error(`blocked daemon request ${href}`))',
				'\treturn original(input, init)',
				'}',
				'',
			].join('\n'),
		)
		writeCopy()
	})

	after(() => {
		rmSync(directory, { recursive: true, force: true })
	})

	describe('usage', () => {
		it('exits 64 with the usage line for a missing flag, a bad pair, an unknown model, and an unknown flag', () => {
			const base = writeBase(POSITIVE)
			for (const args of [
				[],
				['--base', base],
				['--pair', 'q2,1-4'],
				['--base', base, '--pair', 'q2,1-9'],
				['--base', base, '--pair', 'q2,3-2'],
				['--base', base, '--pair', 'q2,0-2'],
				['--base', base, '--pair', 'zz,1-2'],
				['--base', base, '--pair', 'q2'],
				['--base', base, '--pair', 'q2,1-2', '--pair', 'q2,x'],
				['--base', base, '--pair', 'q2,1-2', '--other'],
				['--base', base, '--pair', 'q2,1-2', 'extra'],
			]) {
				const outcome = runReport(args)
				assert.equal(outcome.status, 64, args.join(' '))
				assert.match(outcome.stderr, /^usage: node bench5\/report\.ts/m)
			}
		})
	})

	describe('pair statistics', () => {
		it('computes d without the g06 goal, its mean, deviation, and bounds, and continues', () => {
			const pair = readPair(writeBase(POSITIVE))
			assert.deepEqual(
				[0, 1, 2, 3].map((at) => readNumberAt(pair, 'copies', at, 'd')),
				[1, 1, -1, 2],
			)
			assert.equal(readNumberAt(pair, 'stats', 'n'), 4)
			assert.equal(readNumberAt(pair, 'stats', 'mean'), 0.75)
			const deviation = Math.sqrt(4.75 / 3)
			expectClose(readNumberAt(pair, 'stats', 'deviation'), deviation, 'deviation')
			expectClose(readNumberAt(pair, 'stats', 'low'), 0.75 - deviation, 'low')
			expectClose(readNumberAt(pair, 'stats', 'high'), 0.75 + deviation, 'high')
			assert.equal(dig(pair, 'verdict'), 'CONTINUE')
			assert.deepEqual(
				[0, 1, 2, 3].map((at) => readNumberAt(pair, 'copies', at, 'aggregate', 'passes')),
				[4, 2, 2, 4],
			)
		})

		it('prints the d line, the bounds, and the verdict', () => {
			const outcome = runPair(writeBase(POSITIVE))
			assert.equal(outcome.status, 0, outcome.stderr)
			assert.match(outcome.stdout, /^pair q2 qwen3\.5:2b-q4_K_M copies 1-4$/m)
			assert.match(outcome.stdout, /^d 1, 1, -1, 2$/m)
			assert.match(
				outcome.stdout,
				/^n 4 mean 0\.75 sd 1\.26 bounds \[-0\.51, 2\.01\] scorer end, goals without g06$/m,
			)
			for (const name of [
				'sole',
				'soleScored',
				'soleStale',
				'check',
				'overflow',
				'plan',
				'scale',
				'timeout',
			]) {
				assert.match(outcome.stdout, new RegExp(`^invariant ${name} PASS$`, 'm'))
			}
			assert.match(
				outcome.stdout,
				/^verdict CONTINUE \(mean\(d\) \+ 2·sd\(d\)\/√n is not below 0\)$/m,
			)
		})

		it('stops when the upper bound is below 0', () => {
			const pair = readPair(writeBase(NEGATIVE))
			assert.deepEqual(
				[0, 1, 2, 3].map((at) => readNumberAt(pair, 'copies', at, 'd')),
				[-1, -2, -1, -2],
			)
			assert.equal(readNumberAt(pair, 'stats', 'mean'), -1.5)
			expectClose(readNumberAt(pair, 'stats', 'high'), -1.5 + Math.sqrt(1 / 3), 'high')
			assert.equal(dig(pair, 'verdict'), 'STOP')
			assert.match(
				runPair(writeBase(NEGATIVE)).stdout,
				/^verdict STOP \(mean\(d\) \+ 2·sd\(d\)\/√n is below 0\)$/m,
			)
		})

		it('gives no bound for one copy and continues', () => {
			const pair = readPair(writeBase(POSITIVE), '1-1')
			assert.equal(readNumberAt(pair, 'stats', 'n'), 1)
			assert.equal(readNumberAt(pair, 'stats', 'mean'), 1)
			assert.equal(dig(pair, 'stats', 'high'), undefined)
			assert.equal(dig(pair, 'verdict'), 'CONTINUE')
			assert.match(runPair(writeBase(POSITIVE), '1-1').stdout, /bounds \[-, -\]/)
		})

		it('splits d by the goals where recall closed only in the aggregate arm', () => {
			const closed: Tweak = onCopy(1, 'aggregate', (data) =>
				editRows(data, 'g12-delta', { recalls: { calls: 3, closed: 1, cause: 'room' } }),
			)
			const pair = readPair(writeBase(POSITIVE, closed))
			assert.equal(readNumberAt(pair, 'copies', 0, 'closed', 'goals'), 1)
			assert.equal(readNumberAt(pair, 'copies', 0, 'closed', 'd'), 1)
			assert.equal(readNumberAt(pair, 'copies', 0, 'rest', 'd'), 0)
			assert.equal(readNumberAt(pair, 'copies', 1, 'closed', 'goals'), 0)
			assert.equal(readNumberAt(pair, 'closed', 'mean'), 0.25)
			assert.equal(readNumberAt(pair, 'rest', 'mean'), 0.5)
			assert.equal(readNumberAt(pair, 'copies', 0, 'aggregate', 'recalls', 'room'), 1)
			assert.equal(readNumberAt(pair, 'copies', 0, 'aggregate', 'recalls', 'closed'), 1)
		})

		it('gives pass rates for g01 to g10 against g11 to g24 and for each scored lifetime case', () => {
			const pair = readPair(writeBase(POSITIVE))
			assert.deepEqual(dig(pair, 'rates', 'g01-g10'), {
				control: { passes: 3, total: 4 },
				aggregate: { passes: 4, total: 4 },
			})
			assert.deepEqual(dig(pair, 'rates', 'g11-g24'), {
				control: { passes: 4, total: 8 },
				aggregate: { passes: 6, total: 8 },
			})
			assert.deepEqual(dig(pair, 'cases', 'expiry'), {
				control: { passes: 2, total: 4 },
				aggregate: { passes: 3, total: 4 },
			})
			assert.deepEqual(dig(pair, 'cases', 'amend'), {
				control: { passes: 2, total: 4 },
				aggregate: { passes: 3, total: 4 },
			})
			assert.equal(dig(pair, 'cases', 'ignored'), undefined)
			assert.equal(dig(pair, 'cases', 'unscored'), undefined)
			const outcome = runPair(writeBase(POSITIVE))
			assert.match(outcome.stdout, /^rate g01-g10 control 3\/4 aggregate 4\/4$/m)
			assert.match(outcome.stdout, /^case expiry control 2\/4 aggregate 3\/4$/m)
		})

		it('reads the folder of the copy that fills the caches', () => {
			const base = writeBase(POSITIVE, keep, true)
			const outcome = runPair(base)
			assert.equal(outcome.status, 0, outcome.stderr)
			assert.match(outcome.stdout, /aggregate l5-q2-aggregatefill-v1 4 /)
		})
	})

	describe('run metrics', () => {
		it('counts the walls by role, the prompts of agent requests from the wire, and the questions', () => {
			const pair = readPair(writeBase(POSITIVE))
			const run = dig(pair, 'copies', 0, 'aggregate')
			assert.deepEqual(dig(run, 'walls'), { agent: 410, judge: 1600, summarizer: 4000, flush: 20 })
			assert.equal(dig(run, 'prompt'), 1000)
			assert.equal(dig(run, 'overflows'), 0)
			assert.deepEqual(dig(run, 'questions'), { category: { fresh: 4, hits: 8 } })
			assert.deepEqual(dig(run, 'lookups'), { calls: 4, repeats: 0 })
			assert.deepEqual(dig(run, 'briefing'), { tokens: 400, facts: 4, stale: 0 })
			assert.equal(dig(pair, 'copies', 0, 'control', 'prompt'), 1000)
		})

		it('falls back to the row when no wire folder exists', () => {
			const base = writeBase(POSITIVE)
			rmSync(join(base, 'l5-q2-control-v1-wire'), { recursive: true })
			assert.equal(dig(readPair(base), 'copies', 0, 'control', 'prompt'), 900)
		})

		it('reports builds, triggers, CHANGE and AGREE rates, code failures, and the seconds by head', () => {
			const events: Tweak = onCopy(1, 'aggregate', (data) => ({
				...data,
				events: [
					...data.events,
					buildEvent('g12-delta', 'build', {
						status: 'stale',
						trigger: 'check',
						failures: [
							{ kind: 'id', token: 'LH-9' },
							{ kind: 'number', token: '7' },
						],
					}),
					buildEvent('g12-delta', 'build', { version: 2, trigger: 'retry' }),
					buildEvent('g12-delta', 'agree', { status: 'stale', answers: { agree: 0.2 }, wall: 100 }),
					buildEvent('g12-delta', 'withhold', { status: 'withheld' }),
				],
			}))
			const aggregate = dig(
				readPair(writeBase(POSITIVE, events)),
				'copies',
				0,
				'aggregate',
				'aggregate',
			)
			assert.equal(dig(aggregate, 'builds'), 4)
			assert.deepEqual(dig(aggregate, 'triggers'), { first: 1, change: 1, check: 1, retry: 1 })
			assert.deepEqual(dig(aggregate, 'change'), { asked: 2, yes: 1 })
			assert.deepEqual(dig(aggregate, 'agree'), {
				asked: 2,
				failed: 1,
				components: 0,
				replay: 0,
				prompt: 0,
				completion: 0,
			})
			assert.deepEqual(dig(aggregate, 'failures'), { id: 1, number: 1 })
			assert.equal(dig(aggregate, 'failed'), 1)
			assert.equal(dig(aggregate, 'consistency'), 0.25)
			assert.equal(dig(aggregate, 'withheld'), 1)
			assert.equal(dig(aggregate, 'stale'), 1)
			assert.deepEqual(dig(aggregate, 'summarizer'), { calls: 4, hits: 1, seconds: 4 })
			expectClose(readNumberAt(aggregate, 'mica', 'change'), 0.3, 'change seconds')
			expectClose(readNumberAt(aggregate, 'mica', 'agree'), 0.4, 'agree seconds')
			expectClose(readNumberAt(aggregate, 'mica', 'ledger'), 0.9, 'ledger seconds')
		})

		it('counts whole candidates separately from complete component expenditure and replay', () => {
			const plan = buildSupportPlan('First. Second.', [
				{ id: 'one', sentence: 0, role: 'user', day: '', text: 'First. Second.' },
			])
			const support = {
				...plan,
				model: 'inert',
				wall: 999,
				components: plan.components.map((component, index) => ({
					...component,
					key: buildCacheKey('inert', component.state, component.question, plan.context),
					score: 0.9,
					cached: index === 0,
					wall: 100,
					usage: { prompt: 30, completion: 1, total: 31 },
				})),
			}
			const events: Tweak = onCopy(1, 'aggregate', (data) => ({
				...data,
				events: data.events.map((event) =>
					event.event === 'agree' ? { ...event, support } : event,
				),
			}))
			const aggregate = dig(
				readPair(writeBase(POSITIVE, events)),
				'copies',
				0,
				'aggregate',
				'aggregate',
			)
			assert.deepEqual(dig(aggregate, 'agree'), {
				asked: 1,
				failed: 0,
				components: 3,
				replay: 1,
				prompt: 60,
				completion: 2,
			})
			expectClose(readNumberAt(aggregate, 'mica', 'agree'), 0.2, 'uncached component seconds')
		})

		it('reports the facts and stale tokens that the rendered summaries carry for each goal', () => {
			const aggregate = dig(readPair(writeBase(POSITIVE)), 'copies', 0, 'aggregate', 'aggregate')
			const goals = dig(aggregate, 'goals')
			assert.ok(Array.isArray(goals))
			assert.equal(goals.length, 4)
			assert.deepEqual(dig(goals, 0, 'facts'), 1)
			assert.deepEqual(dig(goals, 2, 'facts'), 0)
			assert.equal(dig(goals, 0, 'rendered'), 1)
			assert.equal(dig(goals, 0, 'summary'), 20)
		})
	})

	describe('invariants', () => {
		describe('g03 stale-carrier regression', () => {
			const scenario = join(directory, 'g03-copies')
			const source: unknown = JSON.parse(
				readFileSync(join(HARNESS, 'bench', 'scenario.json'), 'utf8'),
			)
			const goals = dig(source, 'goals')
			assert.ok(Array.isArray(goals))
			const goal: unknown = goals.find((entry) => dig(entry, 'id') === 'g03-grace-escalation')
			assert.ok(isRecord(goal))
			const shown = dig(source, 'seed', 18, 'content')
			assert.ok(typeof shown === 'string')
			const briefing = shown
			assert.match(briefing, /Marcus to sign off first/)
			assert.doesNotMatch(briefing, /ESC-2291/i)

			before(() => writeCopy(scenario, { ...goal, after: 2, facts: [], stale: [] }))

			for (const summary of ['', 'The carrier trace is open.', 'Use ESC-2291.']) {
				it(`g03 stale-carrier regression: ${summary === '' ? 'empty summary' : summary}`, () => {
					const base = writeBase(
						POSITIVE,
						onArms(1, (data, arm) => ({
							...data,
							info: {
								...data.info,
								goals: GOALS.map((id) => (id === 'g11-gamma' ? 'g03-grace-escalation' : id)),
							},
							rows: data.rows.map((row) =>
								row['goal'] === 'g11-gamma' ? { ...row, goal: 'g03-grace-escalation' } : row,
							),
							picks: data.picks.map((pick) =>
								pick['goal'] === 'g11-gamma'
									? {
											...pick,
											goal: 'g03-grace-escalation',
											briefing,
											instructions: {
												date: 'Today is Thursday 2026-10-08.',
												...(arm === 'aggregate' && summary !== '' ? { summaries: summary } : {}),
											},
										}
									: pick,
							),
							calls: data.calls.map((call) =>
								call['goal'] === 'g11-gamma' ? { ...call, goal: 'g03-grace-escalation' } : call,
							),
							events: data.events.map((event) =>
								event['goal'] === 'g11-gamma' ? { ...event, goal: 'g03-grace-escalation' } : event,
							),
						})),
					)
					const pair = readPair(base, '1-1', scenario)
					const leakage = dig(pair, 'copies', 0, 'aggregate', 'aggregate', 'goals')
					assert.ok(Array.isArray(leakage))
					const actual: unknown = leakage.find(
						(entry) => dig(entry, 'goal') === 'g03-grace-escalation',
					)
					const stale = summary === 'Use ESC-2291.'
					if (stale) {
						assert.ok(readNumberAt(actual, 'soleStale') > 0)
						assert.match(
							String(listFailures(pair, 'soleStale')[0]),
							/^v1 g03-grace-escalation: soleStale [1-9]\d*$/,
						)
					} else {
						assert.equal(dig(actual, 'soleStale'), 0)
						assert.deepEqual(listFailures(pair, 'soleStale'), [])
					}
					assert.equal(dig(pair, 'verdict'), stale ? 'STOP' : 'CONTINUE')
					const outcome = runPair(base, '1-1', [], scenario)
					assert.equal(outcome.status, 0, outcome.stderr)
					if (stale) assert.match(outcome.stdout, /^verdict STOP \(invariant soleStale\)$/m)
					else assert.match(outcome.stdout, /^invariant soleStale PASS$/m)
				})
			}
		})

		it('stops on a token that only the summaries carry', () => {
			const sole = onCopy(2, 'aggregate', (data) => editRows(data, 'g11-gamma', { sole: 2 }))
			const base = writeBase(POSITIVE, sole)
			expectStop(base, 'sole', /v2 g11-gamma: 2 sole-carried tokens/)
			assert.equal(listFailures(readPair(base), 'sole').length, 1)
		})

		it('stops on a scored value that only the summaries carry, though the token filter reads none', () => {
			const leak = onCopy(3, 'aggregate', (data) =>
				editPicks(
					editPicks(data, 'g11-gamma', {
						instructions: {
							date: 'Today is Thursday 2026-10-08.',
							summaries: '### Topic summaries\n\nWKND15 takes fifteen percent off a late order.',
						},
					}),
					'g12-delta',
					{
						instructions: {
							date: 'Today is Thursday 2026-10-08.',
							summaries: '### Topic summaries\n\nAdeyemi signs off. Use LATE10 today.',
						},
					},
				),
			)
			const base = writeBase(POSITIVE, leak)
			const pair = readPair(base)
			assert.deepEqual(listFailures(pair, 'soleScored'), [
				'v3 g11-gamma: soleScored 1',
				'v3 g12-delta: soleScored 1',
			])
			assert.deepEqual(listFailures(pair, 'soleStale'), ['v3 g12-delta: soleStale 1'])
			assert.deepEqual(listFailures(pair, 'sole'), [])
			expectStop(base, 'soleScored', /v3 g11-gamma: soleScored 1; v3 g12-delta: soleScored 1/)
		})

		it('reads a scored value that the shown text also carries as no leak', () => {
			const shown = onCopy(3, 'aggregate', (data) =>
				editPicks(data, 'g11-gamma', {
					briefing: 'Late code WKND15 applies.',
					instructions: {
						date: 'Today is Thursday 2026-10-08.',
						summaries: '### Topic summaries\n\nWKND15 takes fifteen percent off a late order.',
					},
				}),
			)
			const pair = readPair(writeBase(POSITIVE, shown))
			assert.deepEqual(listFailures(pair, 'soleScored'), [])
			assert.equal(dig(pair, 'verdict'), 'CONTINUE')
		})

		it('counts an any-of phrase that only the summaries carry as a scored leak', () => {
			const leak = onCopy(2, 'aggregate', (data) =>
				editPicks(data, 'g01-alpha', {
					tail: [{ index: 0, role: 'user', content: 'Order LH-100 total is 40 dollars.' }],
				}),
			)
			const pair = readPair(writeBase(POSITIVE, leak))
			assert.deepEqual(listFailures(pair, 'soleScored'), ['v2 g01-alpha: soleScored 1'])
		})

		it('stops on a rendered aggregate whose last build failed or was withheld, and passes after a successful retry', () => {
			const stale = onCopy(2, 'aggregate', (data) => ({
				...data,
				events: [
					buildEvent('g01-alpha', 'build', { trigger: 'first', wall: 500 }),
					buildEvent('g11-gamma', 'build', {
						status: 'stale',
						trigger: 'change',
						failures: [{ kind: 'id', token: 'LH-9' }],
					}),
				],
			}))
			expectStop(
				writeBase(POSITIVE, stale),
				'check',
				/v2 g11-gamma: refunds rendered after a failed check/,
			)
			const withheld = onCopy(2, 'aggregate', (data) => ({
				...data,
				events: [
					buildEvent('g01-alpha', 'build', { trigger: 'first' }),
					buildEvent('g11-gamma', 'withhold', { status: 'withheld' }),
				],
			}))
			expectStop(writeBase(POSITIVE, withheld), 'check', /rendered after a failed check/)
			const retried = onCopy(2, 'aggregate', (data) => ({
				...data,
				events: [
					buildEvent('g01-alpha', 'build', { trigger: 'first' }),
					buildEvent('g11-gamma', 'build', {
						status: 'stale',
						trigger: 'change',
						failures: [{ kind: 'id', token: 'LH-9' }],
					}),
					buildEvent('g11-gamma', 'build', { version: 2, trigger: 'retry' }),
				],
			}))
			assert.deepEqual(listFailures(readPair(writeBase(POSITIVE, retried)), 'check'), [])
		})

		it('stops on a rendered topic that no build row backs', () => {
			const none = onCopy(1, 'aggregate', (data) => ({ ...data, events: [] }))
			expectStop(writeBase(POSITIVE, none), 'check', /rendered with no build/)
		})

		it('stops on an aggregate overflow with no paired control overflow, from the row or the wire, and ignores a summarizer prompt', () => {
			const row = onCopy(2, 'aggregate', (data) => editRows(data, 'g12-delta', { overflow: true }))
			expectStop(
				writeBase(POSITIVE, row),
				'overflow',
				/v2 g12-delta: overflow at 1000 tokens with no control overflow/,
			)
			const wire = onCopy(2, 'aggregate', (data) => ({ ...data, wire: { ...data.wire, 42: 3100 } }))
			expectStop(writeBase(POSITIVE, wire), 'overflow', /v2 g12-delta: overflow at 3100 tokens/)
			const both = onArms(2, (data) => editRows(data, 'g12-delta', { overflow: true }))
			const pair = readPair(writeBase(POSITIVE, both))
			assert.deepEqual(listFailures(pair, 'overflow'), [])
			assert.equal(readNumberAt(pair, 'copies', 1, 'aggregate', 'overflows'), 1)
			const summarizer = onCopy(2, 'aggregate', (data) => ({
				...data,
				wire: { ...data.wire, 44: 9000 },
			}))
			assert.deepEqual(listFailures(readPair(writeBase(POSITIVE, summarizer)), 'overflow'), [])
		})

		it('stops when the first select of g01 differs in its briefing or its tail, and only there', () => {
			const briefing = onCopy(4, 'aggregate', (data) =>
				editPicks(data, 'g01-alpha', { briefing: 'Another briefing' }),
			)
			expectStop(
				writeBase(POSITIVE, briefing),
				'plan',
				/v4 g01-alpha: the first select's briefing differs/,
			)
			const tail = onCopy(1, 'aggregate', (data) =>
				editPicks(data, 'g01-alpha', {
					tail: [
						{ index: 0, role: 'user', content: SEED[0] },
						{ index: 1, role: 'user', content: SEED[1] },
					],
				}),
			)
			expectStop(writeBase(POSITIVE, tail), 'plan', /v1 g01-alpha: the first select's tail differs/)
			const later = onCopy(1, 'aggregate', (data) =>
				editPicks(data, 'g11-gamma', { briefing: 'Another briefing' }),
			)
			assert.deepEqual(listFailures(readPair(writeBase(POSITIVE, later)), 'plan'), [])
			const second = onCopy(1, 'aggregate', (data) => ({
				...data,
				picks: [
					...data.picks,
					{ ...buildPick('aggregate', 'g01-alpha', 9), pass: 2, briefing: 'Answer pass' },
				],
			}))
			assert.deepEqual(listFailures(readPair(writeBase(POSITIVE, second)), 'plan'), [])
		})

		it('stops when the gauge scale drifts by more than the ledger bound and passes within it', () => {
			const drift = onCopy(3, 'aggregate', (data) => editRows(data, 'g11-gamma', { scale: 2.2 }))
			expectStop(writeBase(POSITIVE, drift), 'scale', /v3 g11-gamma: gauge scale 2\.2 against 2/)
			const near = onCopy(3, 'aggregate', (data) => editRows(data, 'g11-gamma', { scale: 2.1 }))
			const pair = readPair(writeBase(POSITIVE, near))
			assert.deepEqual(listFailures(pair, 'scale'), [])
			expectClose(readNumberAt(pair, 'copies', 2, 'plans', 2, 'scale'), 0.05, 'drift')
		})

		it('stops on a timeout or partial reply in the aggregate arm alone while the stage outlasts the agent', () => {
			const slow = onCopy(2, 'aggregate', (data) =>
				editRows(data, 'g12-delta', { partial: true, stage: 900 }),
			)
			expectStop(
				writeBase(POSITIVE, slow),
				'timeout',
				/v2 g12-delta: aggregate stage 900 ms exceeds agent wall 100 ms/,
			)
			const aborted = onCopy(2, 'aggregate', (data) =>
				editRows(data, 'g12-delta', { error: 'TimeoutError: The operation timed out', stage: 900 }),
			)
			expectStop(writeBase(POSITIVE, aborted), 'timeout', /v2 g12-delta/)
			const short = onCopy(2, 'aggregate', (data) =>
				editRows(data, 'g12-delta', { partial: true, stage: 40 }),
			)
			assert.deepEqual(listFailures(readPair(writeBase(POSITIVE, short)), 'timeout'), [])
			const paired = onArms(2, (data, arm) =>
				editRows(data, 'g12-delta', { partial: true, stage: arm === 'aggregate' ? 900 : 0 }),
			)
			assert.deepEqual(listFailures(readPair(writeBase(POSITIVE, paired)), 'timeout'), [])
		})
	})

	describe('dose', () => {
		it('requires more than half of served goals to expose nonempty topic bodies, ignoring rendered counters', () => {
			const base = writeBase(
				POSITIVE,
				onAggregates((data) => ({
					...data,
					picks: data.picks.map((pick, at) =>
						at < 2 ? { ...pick, instructions: { summaries: '### Topic summaries' } } : pick,
					),
				})),
			)
			const pair = readPair(base)
			assert.deepEqual(dig(pair, 'share'), {
				goals: 16,
				zero: 8,
				withheld: 0,
				cut: 0,
				majority: true,
			})
			assert.equal(dig(pair, 'verdict'), 'REFUSED')
		})

		it('does not infer exposure from a rendered row or a selection when the wire carries no summary', () => {
			const base = writeBase(POSITIVE)
			for (const copy of [1, 2, 3, 4])
				for (const sequence of [12, 22, 32, 42]) {
					const path = join(
						base,
						`l5-q2-aggregate-v${copy}-wire`,
						`${String(sequence).padStart(5, '0')}_api_chat-request.json`,
					)
					writeFileSync(
						path,
						JSON.stringify({
							body: { messages: [{ role: 'user', content: 'No treatment arrived.' }] },
						}),
					)
				}
			const pair = readPair(base)
			assert.equal(dig(pair, 'share', 'zero'), 16)
			assert.equal(dig(pair, 'verdict'), 'REFUSED')
		})
		it('refuses a null verdict when most goals rendered no topic, and splits them by withheld and cut', () => {
			const empty = onAggregates((data) => ({
				...editRows(
					editRows(editRows(data, 'g01-alpha', { rendered: [] }), 'g06-skip', {
						rendered: [],
						withheld: ['refunds'],
					}),
					'g11-gamma',
					{ rendered: [], cut: ['refunds'] },
				),
				picks: data.picks.map((pick) =>
					pick['goal'] === 'g12-delta'
						? pick
						: { ...pick, instructions: { date: 'Today is Thursday 2026-10-08.' } },
				),
			}))
			const base = writeBase(POSITIVE, empty)
			const pair = readPair(base)
			assert.deepEqual(dig(pair, 'share'), {
				goals: 16,
				zero: 12,
				withheld: 4,
				cut: 4,
				majority: true,
			})
			assert.equal(dig(pair, 'verdict'), 'REFUSED')
			assert.match(
				runPair(base).stdout,
				/^verdict REFUSED \(12 of 16 goals have no nonempty wire exposure\)$/m,
			)
			assert.match(
				runPair(base).stdout,
				/^zero rendered 12\/16 \(withheld 4, cut 4\) majority true$/m,
			)
		})

		it('keeps a negative verdict when most goals rendered no topic', () => {
			const empty = onAggregates((data) => ({
				...data,
				rows: data.rows.map((row) => ({ ...row, rendered: [] })),
				events: [],
			}))
			assert.equal(dig(readPair(writeBase(NEGATIVE, empty)), 'verdict'), 'STOP')
		})

		it('counts a minority of empty goals as no dose limit', () => {
			const pair = readPair(writeBase(POSITIVE))
			assert.deepEqual(dig(pair, 'share'), {
				goals: 16,
				zero: 0,
				withheld: 0,
				cut: 0,
				majority: false,
			})
		})
	})

	describe('per-request wire boundaries', () => {
		it('fails missing usage even when a row reports a usable prompt count', () => {
			const base = writeBase(POSITIVE)
			const path = join(base, 'l5-q2-control-v1-wire', '00012_api_chat-response.json')
			writeFileSync(path, JSON.stringify({ text: '{"done":true,"prompt_eval_count":1000}\n' }))
			expectStop(base, 'wire', /missing or malformed wire usage/)
		})

		it('checks a tool continuation that fits by prompt alone but exhausts the context with its completion', () => {
			const base = writeBase(
				POSITIVE,
				onCopy(1, 'aggregate', (data) => ({
					...data,
					calls: [
						...data.calls,
						{ sequence: 13, role: 'agent', goal: 'g01-alpha', started: 0, wall: 10, status: 200 },
					],
					wire: { ...data.wire, 13: 2560 },
				})),
			)
			const path = join(base, 'l5-q2-aggregate-v1-wire', '00013_api_chat-response.json')
			writeFileSync(
				path,
				JSON.stringify({
					text: '{"done":true,"done_reason":"stop","prompt_eval_count":2560,"eval_count":512}\n',
				}),
			)
			expectStop(base, 'wire', /request 13: prompt plus completion 3072/)
		})

		it('detects stale summary content on an answer pass and records its selection', () => {
			const base = writeBase(
				POSITIVE,
				onCopy(1, 'aggregate', (data) => ({
					...data,
					picks: [
						...data.picks,
						{
							...data.picks[0],
							pass: 2,
							sequence: 12,
							instructions: { date: 'Today is Thursday 2026-10-08.' },
						},
					],
					calls: [
						...data.calls,
						{ sequence: 13, role: 'agent', goal: 'g01-alpha', started: 0, wall: 10, status: 200 },
					],
					wire: { ...data.wire, 13: 1000 },
				})),
			)
			const path = join(base, 'l5-q2-aggregate-v1-wire', '00013_api_chat-request.json')
			writeFileSync(
				path,
				JSON.stringify({ body: { messages: [{ role: 'system', content: SUMMARIES }] } }),
			)
			expectStop(base, 'wire', /request 13: unrecorded or stale summaries block/)
			const pair = readPair(base)
			assert.equal(dig(pair, 'copies', 0, 'aggregate', 'observations', 'answers'), 1)
			writeFileSync(
				path,
				JSON.stringify({
					body: { messages: [{ role: 'user', content: 'Answer from the retained evidence.' }] },
				}),
			)
			assert.deepEqual(listFailures(readPair(base), 'wire'), [])
		})

		it('checks never-only-carrier against each request rather than the union of selections', () => {
			const base = writeBase(POSITIVE)
			const path = join(base, 'l5-q2-aggregate-v1-wire', '00012_api_chat-request.json')
			writeFileSync(
				path,
				JSON.stringify({ body: { messages: [{ role: 'system', content: SUMMARIES }] } }),
			)
			expectStop(base, 'wire', /sole-carried tokens on the actual request/)
		})

		it('reports shortened recall listings and later plan differences as consequences following treatment', () => {
			const base = writeBase(
				POSITIVE,
				onCopy(1, 'aggregate', (data) => editRows(data, 'g11-gamma', { tail: 'later-difference' })),
			)
			const path = join(base, 'l5-q2-aggregate-v1-wire', '00032_api_chat-request.json')
			const request: unknown = JSON.parse(readFileSync(path, 'utf8'))
			const messages = dig(request, 'body', 'messages')
			assert.ok(Array.isArray(messages))
			writeFileSync(
				path,
				JSON.stringify({
					body: {
						messages: [
							...messages,
							{
								role: 'tool',
								content:
									'A recalled line.\n2 older items not shown; name a narrower topic to narrow the recall',
							},
						],
					},
				}),
			)
			const pair = readPair(base)
			assert.equal(dig(pair, 'copies', 0, 'aggregate', 'observations', 'shortened'), 1)
			assert.equal(dig(pair, 'copies', 0, 'plans', 2, 'equal'), false)
			assert.equal(dig(pair, 'copies', 0, 'plans', 2, 'treated'), true)
			assert.equal(dig(pair, 'copies', 0, 'plans', 0, 'treated'), false)
		})
	})

	describe('refusals', () => {
		it('exits 1 for a missing run and names it', () => {
			const base = writeBase(POSITIVE)
			rmSync(join(base, 'l5-q2-aggregate-v3'), { recursive: true })
			const outcome = runPair(base)
			assert.equal(outcome.status, 1)
			assert.match(outcome.stderr, /REFUSED q2 copies 1-4: .*missing run l5-q2-aggregate-v3/)
			assert.doesNotMatch(outcome.stdout, /^verdict/m)
		})

		it('exits 1 for a short run', () => {
			const short = onCopy(2, 'control', (data) => ({ ...data, rows: data.rows.slice(0, 3) }))
			const outcome = runPair(writeBase(POSITIVE, short))
			assert.equal(outcome.status, 1)
			assert.match(outcome.stderr, /l5-q2-control-v2: 3 rows where run\.json names 4 goals/)
		})

		it('exits 1 for a run that did not complete', () => {
			const failed = onCopy(1, 'aggregate', (data) => ({
				...data,
				info: { ...data.info, status: 'fault' },
			}))
			const outcome = runPair(writeBase(POSITIVE, failed))
			assert.equal(outcome.status, 1)
			assert.match(outcome.stderr, /l5-q2-aggregate-v1: run\.json status is fault/)
		})

		it('exits 1 for a pair with a transient judge error', () => {
			const transient = onCopy(3, 'control', (data) => ({
				...data,
				info: { ...data.info, judge: { hits: {}, misses: {}, transient: 2 } },
			}))
			const outcome = runPair(writeBase(POSITIVE, transient))
			assert.equal(outcome.status, 1)
			assert.match(outcome.stderr, /l5-q2-control-v3: 2 transient judge errors; rerun the pair/)
			assert.doesNotMatch(outcome.stdout, /^d /m)
		})

		it('exits 1 for runs whose arm, copy, or model differs from their folder', () => {
			const model = onCopy(1, 'control', (data) => ({
				...data,
				info: { ...data.info, model: 'other:tag' },
			}))
			assert.match(
				runPair(writeBase(POSITIVE, model)).stderr,
				/run\.json names arm control, copy 1, and model other:tag/,
			)
		})

		it('exits 1 for arms that served different goals', () => {
			const other = onCopy(1, 'control', (data) => ({
				...data,
				rows: data.rows.map((row) =>
					row['goal'] === 'g12-delta' ? { ...row, goal: 'g11-gamma' } : row,
				),
			}))
			const outcome = runPair(writeBase(POSITIVE, other))
			assert.equal(outcome.status, 1)
			assert.match(outcome.stderr, /the arms served different goals/)
		})

		it('exits 1 for a goal that the scenario copy lacks', () => {
			const extra = onArms(1, (data, arm) => ({
				...data,
				rows: [...data.rows, buildRow(arm, 'g99-extra', true)],
			}))
			const outcome = runPair(writeBase(POSITIVE, extra))
			assert.equal(outcome.status, 1)
			assert.match(outcome.stderr, /goal g99-extra is not in the scenario copy/)
		})

		it('prints the readable pair, refuses the other, and exits 1', () => {
			const base = writeBase(POSITIVE)
			const outcome = runReport([
				'--base',
				base,
				'--copies',
				copies,
				'--pair',
				'q2,1-2',
				'--pair',
				'g2,1-1',
			])
			assert.equal(outcome.status, 1)
			assert.match(outcome.stdout, /^pair q2 /m)
			assert.match(outcome.stderr, /REFUSED g2 copies 1-1: .*missing run l5-g2-control-v1/)
		})
	})

	describe('json output', () => {
		it('writes the pairs and the refusals', () => {
			const base = writeBase(POSITIVE)
			const json = join(base, 'out.json')
			const outcome = runReport([
				'--base',
				base,
				'--copies',
				copies,
				'--pair',
				'q2,1-4',
				'--pair',
				'g2,1-1',
				'--json',
				json,
			])
			assert.equal(outcome.status, 1)
			const report: unknown = JSON.parse(readFileSync(json, 'utf8'))
			assert.equal(dig(report, 'pairs', 0, 'short'), 'q2')
			assert.equal(dig(report, 'pairs', 0, 'stats', 'mean'), 0.75)
			assert.equal(dig(report, 'refused', 0, 'pair'), 'g2 copies 1-1')
		})
	})
})
