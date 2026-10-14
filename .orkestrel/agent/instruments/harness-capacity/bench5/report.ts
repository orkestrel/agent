// Reads the paired runs of the aggregate arm and prints their metrics, the invariant verdicts, and the stopping verdict:
//   node bench5/report.ts --base DIR --pair SHORT,A-B [--pair SHORT,A-B]... [--json FILE] [--copies DIR]
// DIR holds the run folders `l5-SHORT-control-vN` and `l5-SHORT-aggregate-vN` (or `l5-SHORT-aggregatefill-vN` for a copy that
// fills the caches) that bench5/bench.ts wrote, with the `-wire` folder of each beside it. SHORT is a MODELS key, A-B is a copy range,
// and the flag --pair repeats. DIR resolves against the working directory. --copies names the folder of the scenario copies
// (default: bench/variants/long); a proof points it at a fixture.
// A pair reads d per copy as the aggregate arm's passes less the control arm's over the goals without the g06 prefix, at the
// scorer end only; the audited ends come from audit/tally.ts. The verdict is STOP when an invariant fails or
// mean(d) + 2·sd(d)/√n < 0, REFUSED when it would be CONTINUE but at most half the aggregate goals have nonempty wire exposure, else CONTINUE.
// A pair is refused, with no statistics, when a run is missing or short, did not complete, or counts a transient judge error.
// Exit: 0; 1 when a run is missing or short or a pair is refused; 64 on usage.
import type {
	AggregateBinding,
	AggregateMaintenance,
	AggregateState,
	AggregateCheck,
	AggregateEvent,
	AggregateRow,
	AggregateStatus,
	AggregateTrigger,
	CallRecord,
	CallRole,
	Copy,
	CopyGoal,
	LookupCount,
	QuestionCount,
	Row,
	ArchiveArm,
	SelectionRecord,
	TailMessage,
	WireReading,
} from './types.js'
import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isDeepStrictEqual, parseArgs } from 'node:util'
// The vendored build is the one import of the agent in bench5; repoint this path when a later build is vendored.
import { LEDGER_SCALE_DRIFT, matchesCutLine } from '../vendor/agent-0.0.30-trimmed/index.js'
import { Comparison } from './matrix/Comparison.js'
import { INSTRUCTION_SUMMARIES } from './aggregates/constants.js'
import { readTokens, reduceSupport } from './aggregates/helpers.js'
import { isAggregateSource, isAggregateState, isAggregateBundle } from './aggregates/validators.js'
import { buildTimeline, parseAggregates } from './shadow.js'
import { COPIES_DIR, MODELS, SAMPLER } from './constants.js'
import { readCopy } from './Driver.js'
import {
	buildSystem,
	readScoreCarriers,
	describeError,
	listWireFailures,
	matchesExposure,
	readJSON,
	readRows,
	readWireReading,
} from './helpers.js'

type Reading = Pick<
	Row,
	| 'goal'
	| 'success'
	| 'error'
	| 'partial'
	| 'faults'
	| 'wall'
	| 'stage'
	| 'prompt'
	| 'entry'
	| 'overflow'
	| 'recalls'
	| 'lookups'
	| 'questions'
	| 'briefing'
	| 'scale'
	| 'tail'
	| 'rendered'
	| 'cut'
	| 'withheld'
	| 'emptied'
	| 'summary'
	| 'filtered'
	| 'sole'
>

type AggregateReading = Pick<
	AggregateRow,
	'topic' | 'goal' | 'event' | 'status' | 'trigger' | 'answers' | 'failures' | 'wall' | 'cached'
> &
	Partial<
		Pick<
			AggregateRow,
			'lastSeed' | 'version' | 'title' | 'prose' | 'prior' | 'result' | 'projection' | 'support'
		>
	>

type AggregateJournal = AggregateReading | AggregateMaintenance

type Verdict = 'STOP' | 'CONTINUE' | 'REFUSED'

interface PairFlag {
	readonly short: string
	readonly model: string
	readonly first: number
	readonly last: number
}

interface Flags {
	readonly base: string
	readonly pairs: readonly PairFlag[]
	readonly json: string | undefined
	readonly copies: string
}

/** Holds what a run's `run.json` says about the run. */
interface Info {
	readonly status: string
	readonly arm: ArchiveArm
	readonly copy: number
	readonly model: string
	readonly goals: readonly string[]
	readonly transient: number
	readonly change: number
	readonly wall: number | undefined
	readonly gauge: unknown
}

interface Run {
	readonly name: string
	readonly info: Info
	readonly rows: readonly Reading[]
	readonly picks: readonly SelectionRecord[]
	readonly calls: readonly CallRecord[]
	readonly journal: readonly AggregateJournal[]
	readonly events: readonly AggregateReading[]
	/** Maps a request sequence to the prompt token count its wire response reports. */
	readonly wire: ReadonlyMap<number, WireReading>
}

/** Holds what the rendered summaries of one goal carry beyond the shown text, and which goal facts and stale tokens they hold. */
interface Leak {
	readonly goal: string
	readonly soleScored: number
	readonly soleStale: number
	readonly facts: number
	readonly stale: number
}

interface Tally {
	readonly passes: number
	readonly total: number
}

interface Stats {
	readonly n: number
	readonly mean: number
	readonly deviation: number | undefined
	readonly low: number | undefined
	readonly high: number | undefined
}

interface Invariant {
	readonly name: string
	readonly failures: readonly string[]
}

interface AggregateReport {
	readonly builds: number
	readonly triggers: Readonly<Record<string, number>>
	readonly change: { readonly asked: number; readonly yes: number }
	readonly agree: {
		readonly asked: number
		readonly failed: number
		readonly components: number
		readonly replay: number
		readonly prompt: number
		readonly completion: number
	}
	/** Counts the failed checks of the builds by kind. */
	readonly failures: Readonly<Record<string, number>>
	/** Counts the builds with at least one failed check. */
	readonly failed: number
	/** Holds failed builds over builds, or `undefined` when nothing built. */
	readonly consistency: number | undefined
	readonly withheld: number
	readonly stale: number
	readonly summarizer: { readonly calls: number; readonly hits: number; readonly seconds: number }
	readonly mica: { readonly change: number; readonly agree: number; readonly ledger: number }
	readonly goals: ReadonlyArray<
		Leak & {
			readonly rendered: number
			readonly summary: number
			readonly filtered: number
			readonly sole: number
		}
	>
}

interface RunReport {
	readonly name: string
	readonly arm: ArchiveArm
	readonly copy: number
	readonly goals: number
	readonly passes: number
	readonly faults: number
	readonly overflows: number
	readonly prompt: number
	readonly recalls: {
		readonly calls: number
		readonly closed: number
		readonly limit: number
		readonly room: number
	}
	readonly lookups: LookupCount
	readonly questions: Readonly<Record<string, QuestionCount>>
	readonly briefing: { readonly tokens: number; readonly facts: number; readonly stale: number }
	/** Holds the sum of the request walls in milliseconds by role. */
	readonly walls: Readonly<Record<string, number>>
	readonly wall: number | undefined
	readonly transient: number
	readonly gauge: unknown
	readonly aggregate: AggregateReport | undefined
	/** Counts answer selections and distinct shortened recall texts visible on the wire. */
	readonly observations: { readonly answers: number; readonly shortened: number }
}

/** Holds how one goal's prompt differs between the arms of a copy. */
interface Plan {
	readonly goal: string
	readonly equal: boolean
	/** Holds the aggregate arm's briefing tokens less the control arm's. */
	readonly tokens: number
	/** Holds the scale difference over the control's scale. */
	readonly scale: number
	/** Holds the first-call prompt difference over the control's, or `undefined` when an arm reported none. */
	readonly entry: number | undefined
	/** Reports whether an earlier goal exposed treatment before this plan was selected. */
	readonly treated: boolean
}

interface Partition {
	readonly goals: number
	readonly d: number
}

interface CopyReport {
	readonly copy: number
	readonly control: RunReport
	readonly aggregate: RunReport
	readonly d: number
	readonly closed: Partition
	readonly rest: Partition
	readonly plans: readonly Plan[]
}

interface Share {
	readonly goals: number
	readonly zero: number
	readonly withheld: number
	readonly cut: number
	readonly majority: boolean
}

interface PairReport {
	readonly short: string
	readonly model: string
	readonly first: number
	readonly last: number
	readonly copies: readonly CopyReport[]
	readonly stats: Stats
	readonly closed: Stats | undefined
	readonly rest: Stats | undefined
	readonly rates: Readonly<Record<string, { readonly control: Tally; readonly aggregate: Tally }>>
	readonly cases: Readonly<Record<string, { readonly control: Tally; readonly aggregate: Tally }>>
	readonly share: Share
	readonly invariants: readonly Invariant[]
	readonly verdict: Verdict
	readonly reason: string
}

interface Refusal {
	readonly pair: string
	readonly reasons: readonly string[]
}

const OPTIONS = {
	base: { type: 'string' },
	pair: { type: 'string', multiple: true },
	json: { type: 'string' },
	copies: { type: 'string' },
} as const

const USAGE =
	'usage: node bench5/report.ts --base DIR --pair SHORT,A-B [--pair SHORT,A-B]... [--json FILE] [--copies DIR]'
const RUN_PREFIX = 'l5'
const FILL_ARM = 'aggregatefill'
const SKIPPED_GOAL = 'g06'
const FIRST_GOAL = 'g01'
const EARLY_LAST = 10
const EARLY = 'g01-g10'
const LATE = 'g11-g24'
const LAST_COPY = 8
const WIRE_FILE = /^(\d+)_api_chat-response\.json$/
const TIMEOUT_ERROR = /time ?out|abort/i
const ROLES: readonly CallRole[] = ['agent', 'judge', 'summarizer', 'flush']
const EVENTS: readonly AggregateEvent[] = [
	'build',
	'agree',
	'change',
	'withhold',
	'keep',
	'retire',
	'fail',
]
const STATUSES: readonly AggregateStatus[] = ['current', 'stale', 'withheld', 'retired', 'failed']
const TRIGGERS: readonly AggregateTrigger[] = [
	'first',
	'removed',
	'change',
	'check',
	'retry',
	'unchanged',
	'retained',
]
const CHECKS: readonly AggregateCheck[] = ['empty', 'id', 'number', 'name', 'stale', 'agree']

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readField(value: unknown, key: string): unknown {
	return isRecord(value) ? value[key] : undefined
}

function readText(value: unknown, key: string, label: string): string {
	const field = readField(value, key)
	if (typeof field !== 'string') throw new Error(`${label}: ${key} is not text`)
	return field
}

function readNumber(value: unknown, key: string, label: string): number {
	const field = readField(value, key)
	if (typeof field !== 'number' || !Number.isFinite(field))
		throw new Error(`${label}: ${key} is not a number`)
	return field
}

function readBoolean(value: unknown, key: string, label: string): boolean {
	const field = readField(value, key)
	if (typeof field !== 'boolean') throw new Error(`${label}: ${key} is not a boolean`)
	return field
}

function readList(value: unknown, key: string, label: string): readonly unknown[] {
	const field = readField(value, key)
	if (!Array.isArray(field)) throw new Error(`${label}: ${key} is not a list`)
	return field
}

function readTexts(value: unknown, key: string, label: string): readonly string[] {
	return readList(value, key, label).map((entry) => {
		if (typeof entry !== 'string')
			throw new Error(`${label}: ${key} holds a value that is not text`)
		return entry
	})
}

function readNumbers(value: unknown, key: string, label: string): Readonly<Record<string, number>> {
	const field = readField(value, key)
	if (!isRecord(field)) throw new Error(`${label}: ${key} is not a table`)
	return Object.fromEntries(
		Object.entries(field).map(([name, count]) => {
			if (typeof count !== 'number' || !Number.isFinite(count))
				throw new Error(`${label}: ${key}.${name} is not a number`)
			return [name, count]
		}),
	)
}

function readCounts(value: unknown, label: string): Readonly<Record<string, QuestionCount>> {
	const field = readField(value, 'questions')
	if (!isRecord(field)) throw new Error(`${label}: questions is not a table`)
	return Object.fromEntries(
		Object.entries(field).map(([head, count]) => [
			head,
			{
				fresh: readNumber(count, 'fresh', `${label} ${head}`),
				hits: readNumber(count, 'hits', `${label} ${head}`),
			},
		]),
	)
}

function readOptional(value: unknown, key: string): number | undefined {
	const field = readField(value, key)
	return typeof field === 'number' ? field : undefined
}

function isRole(value: unknown): value is CallRole {
	return ROLES.some((role) => role === value)
}

function isEvent(value: unknown): value is AggregateEvent {
	return EVENTS.some((event) => event === value)
}

function isStatus(value: unknown): value is AggregateStatus {
	return STATUSES.some((status) => status === value)
}

function isTrigger(value: unknown): value is AggregateTrigger {
	return TRIGGERS.some((trigger) => trigger === value)
}

function isCheck(value: unknown): value is AggregateCheck {
	return CHECKS.some((check) => check === value)
}

function isArm(value: unknown): value is ArchiveArm {
	return value === 'control' || value === 'aggregate'
}

function readArgs(argv: readonly string[]) {
	return parseArgs({ args: [...argv], options: OPTIONS, strict: true }).values
}

function parsePair(text: string): PairFlag | undefined {
	const match = /^([a-z0-9]+),(\d+)-(\d+)$/.exec(text)
	if (match === null) return undefined
	const short = match[1]
	const model = Object.entries(MODELS).find(([key]) => key === short)?.[1]
	const first = Number(match[2])
	const last = Number(match[3])
	if (model === undefined || first < 1 || last > LAST_COPY || first > last) return undefined
	return { short, model, first, last }
}

function parseFlags(argv: readonly string[]): Flags | undefined {
	let values: ReturnType<typeof readArgs>
	try {
		values = readArgs(argv)
	} catch {
		return undefined
	}
	if (values.base === undefined || values.pair === undefined || values.pair.length === 0)
		return undefined
	const pairs = values.pair.map(parsePair)
	const parsed = pairs.filter((pair) => pair !== undefined)
	if (parsed.length !== pairs.length) return undefined
	return {
		base: resolve(values.base),
		pairs: parsed,
		json: values.json === undefined ? undefined : resolve(values.json),
		copies: values.copies === undefined ? COPIES_DIR : resolve(values.copies),
	}
}

function readReading(value: unknown, label: string): Reading {
	const recalls = readField(value, 'recalls')
	const lookups = readField(value, 'lookups')
	const briefing = readField(value, 'briefing')
	const cause = readField(recalls, 'cause')
	const partial = readField(value, 'partial')
	const error = readField(value, 'error')
	return {
		goal: readText(value, 'goal', label),
		success: readBoolean(value, 'success', label),
		error: typeof error === 'string' ? error : undefined,
		partial: typeof partial === 'boolean' ? partial : undefined,
		faults: readNumber(value, 'faults', label),
		wall: readNumber(value, 'wall', label),
		stage: readNumber(value, 'stage', label),
		prompt: readNumber(value, 'prompt', label),
		entry: readOptional(value, 'entry'),
		overflow: readBoolean(value, 'overflow', label),
		recalls: {
			calls: readNumber(recalls, 'calls', label),
			closed: readNumber(recalls, 'closed', label),
			size: readOptional(recalls, 'size'),
			cause: cause === 'limit' || cause === 'room' ? cause : undefined,
		},
		lookups: {
			calls: readNumber(lookups, 'calls', label),
			repeats: readNumber(lookups, 'repeats', label),
		},
		questions: readCounts(value, label),
		briefing: {
			tokens: readNumber(briefing, 'tokens', label),
			facts: readNumber(briefing, 'facts', label),
			stale: readNumber(briefing, 'stale', label),
			digest: readText(briefing, 'digest', label),
		},
		scale: readNumber(value, 'scale', label),
		tail: readText(value, 'tail', label),
		rendered: readTexts(value, 'rendered', label),
		cut: readTexts(value, 'cut', label),
		withheld: readTexts(value, 'withheld', label),
		emptied: readTexts(value, 'emptied', label),
		summary: readNumber(value, 'summary', label),
		filtered: readNumber(value, 'filtered', label),
		sole: readNumber(value, 'sole', label),
	}
}

function readTail(value: unknown, label: string): TailMessage {
	return {
		index: readOptional(value, 'index'),
		role: readText(value, 'role', label),
		content: readText(value, 'content', label),
	}
}

function readState(value: unknown, label: string): AggregateState | undefined {
	if (value === undefined) return undefined
	if (!isAggregateState(value)) throw new Error(label + ': invalid aggregate state')
	return value
}

function readBindings(value: unknown, label: string): readonly AggregateBinding[] | undefined {
	if (value === undefined) return undefined
	if (!Array.isArray(value)) throw new Error(label + ': aggregates is not a list')
	return value.map((binding) => {
		const state = readState(readField(binding, 'state'), label)
		if (state === undefined) throw new Error(label + ': missing aggregate state')
		return {
			topic: readText(binding, 'topic', label),
			prose: readText(binding, 'prose', label),
			state,
		}
	})
}

function readPick(value: unknown, label: string): SelectionRecord {
	const instructions = readField(value, 'instructions')
	if (!isRecord(instructions)) throw new Error(`${label}: instructions is not a table`)
	return {
		goal: readText(value, 'goal', label),
		pass: readNumber(value, 'pass', label),
		sequence: readNumber(value, 'sequence', label),
		briefing: readText(value, 'briefing', label),
		digest: readText(value, 'digest', label),
		tail: readList(value, 'tail', label).map((message) => readTail(message, label)),
		instructions: Object.fromEntries(
			Object.entries(instructions).map(([name, content]) => [name, String(content)]),
		),
		scale: readOptional(value, 'scale'),
		aggregates: readBindings(readField(value, 'aggregates'), label),
	}
}

function readCall(value: unknown, label: string): CallRecord {
	const role = readField(value, 'role')
	const goal = readField(value, 'goal')
	const error = readField(value, 'error')
	if (!isRole(role)) throw new Error(`${label}: role is not a call role`)
	return {
		sequence: readNumber(value, 'sequence', label),
		role,
		goal: typeof goal === 'string' ? goal : undefined,
		started: readNumber(value, 'started', label),
		wall: readNumber(value, 'wall', label),
		status: readOptional(value, 'status'),
		...(typeof error === 'string' ? { error } : {}),
	}
}

function readJournal(value: unknown, label: string): AggregateJournal {
	if (readField(value, 'event') !== 'maintenance') return readEvent(value, label)
	const status = readField(value, 'status')
	if (status !== 'complete' && status !== 'failed' && status !== 'aborted')
		throw new Error(label + ': invalid maintenance status')
	const error = readField(value, 'error')
	return {
		event: 'maintenance',
		goal: readText(value, 'goal', label),
		lastSeed: readNumber(value, 'lastSeed', label),
		status,
		...(typeof error === 'string' ? { error } : {}),
	}
}

function readEvent(value: unknown, label: string): AggregateReading {
	const support = readField(value, 'support')
	if (support !== undefined && !isAggregateBundle(support))
		throw new Error(label + ': invalid contextual support')
	if (
		support !== undefined &&
		readNumbers(value, 'answers', label).agree !== reduceSupport(support)
	)
		throw new Error(label + ': support minimum differs')
	const event = readField(value, 'event')
	const status = readField(value, 'status')
	const trigger = readField(value, 'trigger')
	const projection = readField(value, 'projection')
	const title = readField(value, 'title')
	const prose = readField(value, 'prose')
	if (
		projection !== undefined &&
		(!Array.isArray(projection) || !projection.every(isAggregateSource))
	)
		throw new Error(label + ': invalid aggregate projection')
	if (!isEvent(event) || !isStatus(status))
		throw new Error(`${label}: event or status is not a member of its set`)
	return {
		topic: readText(value, 'topic', label),
		support,
		goal: readText(value, 'goal', label),
		event,
		status,
		trigger: isTrigger(trigger) ? trigger : undefined,
		lastSeed: readOptional(value, 'lastSeed'),
		version: readOptional(value, 'version'),
		title: typeof title === 'string' ? title : undefined,
		prose: typeof prose === 'string' ? prose : undefined,
		prior: readState(readField(value, 'prior'), label),
		result: readState(readField(value, 'result'), label),
		projection,
		answers: readNumbers(value, 'answers', label),
		failures: readList(value, 'failures', label).map((failure) => {
			const kind = readField(failure, 'kind')
			if (!isCheck(kind)) throw new Error(`${label}: a failure kind is not a check`)
			return { kind, token: readText(failure, 'token', label) }
		}),
		wall: readNumber(value, 'wall', label),
		cached: readBoolean(value, 'cached', label),
	}
}

function readInfo(path: string): Info {
	const value = readJSON(path)
	const arm = readField(value, 'arm')
	const wall = readField(value, 'wall')
	if (!isArm(arm)) throw new Error('run.json: arm is not control or aggregate')
	return {
		status: readText(value, 'status', 'run.json'),
		arm,
		copy: readNumber(value, 'copy', 'run.json'),
		model: readText(value, 'model', 'run.json'),
		goals: readTexts(value, 'goals', 'run.json'),
		transient: readNumber(readField(value, 'judge'), 'transient', 'run.json judge'),
		change: readNumber(readField(value, 'fit'), 'change', 'run.json fit'),
		wall: typeof wall === 'number' ? wall : undefined,
		gauge: readField(value, 'gauge'),
	}
}

function readWire(dir: string): ReadonlyMap<number, WireReading> {
	const prompts = new Map<number, WireReading>()
	if (!existsSync(dir)) return prompts
	for (const name of readdirSync(dir)) {
		const match = WIRE_FILE.exec(name)
		if (match === null) continue
		const request = join(dir, name.replace('-response.json', '-request.json'))
		prompts.set(
			Number(match[1]),
			readWireReading(
				existsSync(request) ? readJSON(request) : undefined,
				readJSON(join(dir, name)),
			),
		)
	}
	return prompts
}

function readLines<Entry>(
	path: string,
	read: (value: unknown, label: string) => Entry,
): readonly Entry[] {
	return readRows(path).map((value, at) => read(value, `${path} line ${at + 1}`))
}

function locateRun(base: string, short: string, arm: ArchiveArm, copy: number): string | undefined {
	const names = arm === 'control' ? ['control'] : ['aggregate', FILL_ARM]
	return names
		.map((name) => `${RUN_PREFIX}-${short}-${name}-v${copy}`)
		.find((name) => existsSync(join(base, name)))
}

function readRun(base: string, short: string, model: string, arm: ArchiveArm, copy: number): Run {
	const name = locateRun(base, short, arm, copy)
	if (name === undefined) throw new Error(`missing run ${RUN_PREFIX}-${short}-${arm}-v${copy}`)
	const dir = join(base, name)
	const info = readInfo(join(dir, 'run.json'))
	if (info.arm !== arm || info.copy !== copy || info.model !== model) {
		throw new Error(
			`${name}: run.json names arm ${info.arm}, copy ${info.copy}, and model ${info.model}`,
		)
	}
	if (info.status !== 'complete') throw new Error(`${name}: run.json status is ${info.status}`)
	const rows = readLines(join(dir, 'rows.jsonl'), readReading)
	if (rows.length < info.goals.length)
		throw new Error(`${name}: ${rows.length} rows where run.json names ${info.goals.length} goals`)
	const events = join(dir, 'aggregates.jsonl')
	if (arm === 'aggregate' && !existsSync(events))
		throw new Error(`${name}: aggregates.jsonl is missing`)
	const journal = existsSync(events) ? readLines(events, readJournal) : []
	return {
		name,
		info,
		rows,
		picks: readLines(join(dir, 'selections.jsonl'), readPick),
		calls: readLines(join(dir, 'calls.jsonl'), readCall),
		journal,
		events: journal.filter((entry) => entry.event !== 'maintenance'),
		wire: readWire(`${dir}-wire`),
	}
}

function computeMean(values: readonly number[]): number {
	return values.reduce((sum, value) => sum + value, 0) / values.length
}

function computeStats(values: readonly number[]): Stats {
	const mean = computeMean(values)
	if (values.length < 2)
		return { n: values.length, mean, deviation: undefined, low: undefined, high: undefined }
	const deviation = Math.sqrt(
		values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1),
	)
	const half = (2 * deviation) / Math.sqrt(values.length)
	return { n: values.length, mean, deviation, low: mean - half, high: mean + half }
}

function isScored(goal: string): boolean {
	return !goal.startsWith(SKIPPED_GOAL)
}

function computePrompt(run: Run, row: Reading): number {
	const counts = run.calls
		.filter((call) => call.role === 'agent' && call.goal === row.goal)
		.flatMap((call) => {
			const count = run.wire.get(call.sequence)?.prompt
			return count === undefined ? [] : [count]
		})
	return counts.length === 0 ? row.prompt : Math.max(...counts)
}

function matchesOverflow(run: Run, row: Reading): boolean {
	return row.overflow || computePrompt(run, row) >= SAMPLER.num_ctx
}

function matchesTimeout(row: Reading): boolean {
	return row.partial === true || TIMEOUT_ERROR.test(row.error ?? '')
}

function listTokens(text: string): ReadonlySet<string> {
	const { ids, numbers } = readTokens(text)
	return new Set([
		...[...ids].map((id) => `id ${id}`),
		...[...numbers].map((number) => `number ${number}`),
	])
}

function listSeedTokens(scenario: Copy, index: number): readonly string[] {
	return [...listTokens(scenario.seed[index]?.content ?? '')]
}

function collectSummaries(picks: readonly SelectionRecord[]): string {
	return [
		...new Set(picks.flatMap((pick) => pick.instructions[INSTRUCTION_SUMMARIES.name] ?? [])),
	].join('\n')
}

// The shown text is what the control arm's prompt carries: the system text, every instruction but the summaries, the briefing, and the tail of each pass.
function collectShown(system: string, picks: readonly SelectionRecord[]): string {
	return [
		system,
		...picks.flatMap((pick) => [
			...Object.entries(pick.instructions)
				.filter(([name]) => name !== INSTRUCTION_SUMMARIES.name)
				.map(([, content]) => content),
			pick.briefing,
			...pick.tail.map((message) => message.content),
		]),
	].join('\n')
}

// A fact counts when the summaries carry every id and number of its seed message; a stale token counts when no goal fact carries it.
function auditLeak(goal: CopyGoal, scenario: Copy, summaries: string, shown: string): Leak {
	const own = readScoreCarriers(goal, summaries)
	const seen = readScoreCarriers(goal, shown)
	const carried = listTokens(summaries)
	const tokens = goal.facts.map((index) => listSeedTokens(scenario, index))
	const held = new Set(tokens.flat())
	const lower = summaries.toLowerCase()
	const stale = new Set(
		goal.stale
			.flatMap((index) => listSeedTokens(scenario, index))
			.filter((token) => !held.has(token) && carried.has(token)),
	)
	return {
		goal: goal.id,
		soleScored: own.expected.filter((phrase) => !seen.expected.includes(phrase)).length,
		soleStale: own.stale.filter((phrase) => !seen.stale.includes(phrase)).length,
		facts: tokens.filter((fact) => fact.length > 0 && fact.every((token) => carried.has(token)))
			.length,
		stale:
			stale.size + goal.forbidden.filter((phrase) => lower.includes(phrase.toLowerCase())).length,
	}
}

function findGoal(scenario: Copy, id: string): CopyGoal {
	const goal = scenario.goals.find((one) => one.id === id)
	if (goal === undefined) throw new Error(`goal ${id} is not in the scenario copy`)
	return goal
}

function auditRun(run: Run, scenario: Copy): readonly Leak[] {
	const system = buildSystem({ ledger: { system: scenario.system } })
	return run.rows.map((row) => {
		const picks = run.picks.filter((pick) => pick.goal === row.goal)
		return auditLeak(
			findGoal(scenario, row.goal),
			scenario,
			collectSummaries(picks),
			collectShown(system, picks),
		)
	})
}

function sumWalls(calls: readonly CallRecord[], role: CallRole): number {
	return calls.filter((call) => call.role === role).reduce((sum, call) => sum + call.wall, 0)
}

function sumBy(rows: readonly Reading[], pick: (row: Reading) => number): number {
	return rows.reduce((sum, row) => sum + pick(row), 0)
}

function countBy(names: readonly string[]): Readonly<Record<string, number>> {
	const counts: Record<string, number> = {}
	for (const name of names) counts[name] = (counts[name] ?? 0) + 1
	return counts
}

function sumQuestions(rows: readonly Reading[]): Readonly<Record<string, QuestionCount>> {
	const sums: Record<string, QuestionCount> = {}
	for (const row of rows) {
		for (const [head, count] of Object.entries(row.questions)) {
			const earlier = sums[head] ?? { fresh: 0, hits: 0 }
			sums[head] = { fresh: earlier.fresh + count.fresh, hits: earlier.hits + count.hits }
		}
	}
	return sums
}

function sumSeconds(events: readonly AggregateReading[], kind: AggregateEvent): number {
	if (kind === 'agree')
		return (
			events
				.filter((event) => event.event === kind)
				.reduce(
					(sum, event) =>
						sum +
						(event.support === undefined
							? event.cached
								? 0
								: event.wall
							: event.support.components
									.filter((component) => !component.cached)
									.reduce((total, component) => total + component.wall, 0)),
					0,
				) / 1000
		)
	return (
		events
			.filter((event) => event.event === kind && !event.cached)
			.reduce((sum, event) => sum + event.wall, 0) / 1000
	)
}

function measureAggregate(run: Run, leaks: readonly Leak[]): AggregateReport {
	const { events, info, rows, calls } = run
	const builds = events.filter((event) => event.event === 'build')
	const asked = events.filter((event) => event.event === 'change')
	const agreed = events.filter((event) => event.event === 'agree')
	const components = agreed.flatMap((event) => event.support?.components ?? [])
	const failed = builds.filter((event) => event.failures.length > 0)
	const change = sumSeconds(events, 'change')
	const agree = sumSeconds(events, 'agree')
	return {
		builds: builds.length,
		triggers: countBy(builds.flatMap((event) => event.trigger ?? [])),
		change: {
			asked: asked.length,
			yes: asked.filter((event) => (event.answers['change'] ?? 0) >= info.change).length,
		},
		agree: {
			asked: agreed.length,
			failed: agreed.filter((event) => event.status === 'stale').length,
			components: components.length,
			replay: components.filter((component) => component.cached).length,
			prompt: components
				.filter((component) => !component.cached)
				.reduce((sum, component) => sum + (component.usage?.prompt ?? 0), 0),
			completion: components
				.filter((component) => !component.cached)
				.reduce((sum, component) => sum + (component.usage?.completion ?? 0), 0),
		},
		failures: countBy(builds.flatMap((event) => event.failures.map((failure) => failure.kind))),
		failed: failed.length,
		consistency: builds.length === 0 ? undefined : failed.length / builds.length,
		withheld: events.filter((event) => event.event === 'withhold').length,
		stale: builds.filter((event) => event.status === 'stale').length,
		summarizer: {
			calls: calls.filter((call) => call.role === 'summarizer').length,
			hits: builds.filter((event) => event.cached).length,
			seconds: sumWalls(calls, 'summarizer') / 1000,
		},
		mica: { change, agree, ledger: Math.max(0, sumWalls(calls, 'judge') / 1000 - change - agree) },
		goals: rows.flatMap((row) => {
			const leak = leaks.find((one) => one.goal === row.goal)
			return leak === undefined
				? []
				: [
						{
							...leak,
							rendered: row.rendered.length,
							summary: row.summary,
							filtered: row.filtered,
							sole: row.sole,
						},
					]
		}),
	}
}

function measureRun(run: Run, leaks: readonly Leak[] | undefined): RunReport {
	const { rows, calls, info } = run
	const causes = rows.map((row) => row.recalls.cause)
	return {
		name: run.name,
		arm: info.arm,
		copy: info.copy,
		goals: rows.length,
		passes: rows.filter((row) => row.success).length,
		faults: sumBy(rows, (row) => row.faults),
		overflows: rows.filter((row) => matchesOverflow(run, row)).length,
		prompt: Math.max(0, ...rows.map((row) => computePrompt(run, row))),
		recalls: {
			calls: sumBy(rows, (row) => row.recalls.calls),
			closed: sumBy(rows, (row) => row.recalls.closed),
			limit: causes.filter((cause) => cause === 'limit').length,
			room: causes.filter((cause) => cause === 'room').length,
		},
		lookups: {
			calls: sumBy(rows, (row) => row.lookups.calls),
			repeats: sumBy(rows, (row) => row.lookups.repeats),
		},
		questions: sumQuestions(rows),
		briefing: {
			tokens: sumBy(rows, (row) => row.briefing.tokens),
			facts: sumBy(rows, (row) => row.briefing.facts),
			stale: sumBy(rows, (row) => row.briefing.stale),
		},
		walls: Object.fromEntries(ROLES.map((role) => [role, sumWalls(calls, role)])),
		wall: info.wall,
		transient: info.transient,
		gauge: info.gauge,
		aggregate: leaks === undefined ? undefined : measureAggregate(run, leaks),
		observations: {
			answers: run.picks.filter((pick) => pick.pass > 1).length,
			shortened: new Set(
				run.calls
					.filter((call) => call.role === 'agent' && call.goal !== undefined)
					.flatMap((call) => run.wire.get(call.sequence)?.messages ?? [])
					.filter(
						(message) =>
							message.role === 'tool' && message.content.split(/\r\n|\n/).some(matchesCutLine),
					)
					.map((message) => message.content),
			).size,
		},
	}
}

function listSoleFailures(aggregate: Run): readonly string[] {
	return aggregate.rows
		.filter((row) => row.sole > 0)
		.map((row) => `${row.goal}: ${row.sole} sole-carried tokens`)
}

function listCheckFailures(aggregate: Run): readonly string[] {
	// Historical l5 compatibility only. The l6 admission gate must separately require maintenance custody.
	if (!aggregate.journal.some((entry) => entry.event === 'maintenance'))
		return listLegacyCheckFailures(aggregate)
	const failures: string[] = []
	for (const row of aggregate.rows) {
		const end = aggregate.journal.findLastIndex(
			(entry) => entry.goal === row.goal && entry.event === 'maintenance',
		)
		const marker = aggregate.journal[end]
		const snapshot = buildTimeline(parseAggregates(aggregate.journal.slice(0, end + 1))).at(-1)
		if (marker?.event !== 'maintenance' || marker.status !== 'complete') {
			if (row.rendered.length > 0)
				failures.push(row.goal + ': rendered without completed maintenance')
		}
		for (const topic of row.rendered) {
			if (snapshot?.topics.get(topic)?.state.goal !== row.goal)
				failures.push(row.goal + ': ' + topic + ' rendered without current state')
		}
		for (const pick of aggregate.picks.filter((entry) => entry.goal === row.goal)) {
			const body = pick.instructions[INSTRUCTION_SUMMARIES.name]
			if (pick.aggregates === undefined) {
				failures.push(row.goal + ': selection lacks maintained bindings')
				continue
			}
			if ((body === undefined) !== (pick.aggregates.length === 0))
				failures.push(row.goal + ': summary body and bindings disagree')
			for (const binding of pick.aggregates) {
				const current = snapshot?.topics.get(binding.topic)
				if (binding.state.goal !== row.goal || !isDeepStrictEqual(binding.state, current?.state))
					failures.push(row.goal + ': ' + binding.topic + ' selection state mismatch')
				if (binding.prose.length === 0 || !body?.includes(binding.prose))
					failures.push(row.goal + ': ' + binding.topic + ' admitted prose mismatch')
			}
		}
	}
	return failures
}

function listLegacyCheckFailures(aggregate: Run): readonly string[] {
	const latest = new Map<string, AggregateReading>()
	const failures: string[] = []
	let cursor = 0
	for (const row of aggregate.rows) {
		const end = aggregate.events.findLastIndex((event) => event.goal === row.goal)
		for (const event of aggregate.events.slice(cursor, end + 1)) {
			if (event.event === 'build' || event.event === 'withhold') latest.set(event.topic, event)
		}
		cursor = Math.max(cursor, end + 1)
		for (const topic of row.rendered) {
			const event = latest.get(topic)
			if (event === undefined) failures.push(`${row.goal}: ${topic} rendered with no build`)
			else if (event.event === 'withhold' || event.status !== 'current')
				failures.push(`${row.goal}: ${topic} rendered after a failed check`)
		}
	}
	return failures
}

function listOverflowFailures(control: Run, aggregate: Run): readonly string[] {
	return aggregate.rows
		.filter((row) => {
			const paired = control.rows.find((one) => one.goal === row.goal)
			return (
				matchesOverflow(aggregate, row) && paired !== undefined && !matchesOverflow(control, paired)
			)
		})
		.map(
			(row) =>
				`${row.goal}: overflow at ${computePrompt(aggregate, row)} tokens with no control overflow`,
		)
}

function findFirstPick(run: Run): SelectionRecord | undefined {
	return run.picks.find((pick) => pick.goal.startsWith(FIRST_GOAL) && pick.pass === 1)
}

function listPlanFailures(control: Run, aggregate: Run): readonly string[] {
	const own = findFirstPick(control)
	const other = findFirstPick(aggregate)
	if (own === undefined || other === undefined) return []
	return [
		...(own.briefing === other.briefing
			? []
			: [`${own.goal}: the first select's briefing differs`]),
		...(isDeepStrictEqual(own.tail, other.tail)
			? []
			: [`${own.goal}: the first select's tail differs`]),
	]
}

function computeDrift(control: number, aggregate: number): number {
	if (control === 0) return aggregate === 0 ? 0 : Number.POSITIVE_INFINITY
	return Math.abs(aggregate - control) / control
}

function listScaleFailures(control: Run, aggregate: Run): readonly string[] {
	return aggregate.rows.flatMap((row) => {
		const paired = control.rows.find((one) => one.goal === row.goal)
		if (paired === undefined || computeDrift(paired.scale, row.scale) <= LEDGER_SCALE_DRIFT)
			return []
		return [`${row.goal}: gauge scale ${row.scale} against ${paired.scale}`]
	})
}

function listTimeoutFailures(control: Run, aggregate: Run): readonly string[] {
	return aggregate.rows.flatMap((row) => {
		const paired = control.rows.find((one) => one.goal === row.goal)
		if (
			paired === undefined ||
			!matchesTimeout(row) ||
			matchesTimeout(paired) ||
			row.stage <= row.wall
		)
			return []
		return [
			`${row.goal}: aggregate stage ${Math.round(row.stage)} ms exceeds agent wall ${Math.round(row.wall)} ms`,
		]
	})
}

function listPlans(control: Run, aggregate: Run): readonly Plan[] {
	return aggregate.rows.flatMap((row) => {
		const paired = control.rows.find((one) => one.goal === row.goal)
		if (paired === undefined) return []
		return [
			{
				goal: row.goal,
				equal: row.briefing.digest === paired.briefing.digest && row.tail === paired.tail,
				tokens: row.briefing.tokens - paired.briefing.tokens,
				scale: computeDrift(paired.scale, row.scale),
				entry:
					row.entry === undefined || paired.entry === undefined
						? undefined
						: computeDrift(paired.entry, row.entry),
				treated: aggregate.rows
					.slice(0, aggregate.rows.indexOf(row))
					.some((prior) => matchesExposure(aggregate, prior.goal)),
			},
		]
	})
}

function countPasses(run: Run, goals: ReadonlySet<string>): number {
	return run.rows.filter((row) => goals.has(row.goal) && row.success).length
}

function computePartition(control: Run, aggregate: Run, goals: ReadonlySet<string>): Partition {
	return { goals: goals.size, d: countPasses(aggregate, goals) - countPasses(control, goals) }
}

function compareGoals(control: Run, aggregate: Run): readonly string[] {
	const own = control.rows.map((row) => row.goal).sort()
	const other = aggregate.rows.map((row) => row.goal).sort()
	return isDeepStrictEqual(own, other) ? own : []
}

function readCases(path: string): ReadonlyMap<string, ReadonlySet<string>> {
	const cases = new Map<string, Set<string>>()
	const list = readField(readJSON(path), 'cases')
	for (const entry of Array.isArray(list) ? list : []) {
		const kind = readField(entry, 'case')
		const goal = readField(entry, 'goal')
		if (
			typeof kind !== 'string' ||
			typeof goal !== 'string' ||
			readField(entry, 'scored') === false
		)
			continue
		cases.set(kind, (cases.get(kind) ?? new Set<string>()).add(goal))
	}
	return cases
}

function addTally(tally: Tally, run: Run, goals: ReadonlySet<string>): Tally {
	const rows = run.rows.filter((row) => goals.has(row.goal))
	return {
		passes: tally.passes + rows.filter((row) => row.success).length,
		total: tally.total + rows.length,
	}
}

function groupGoals(
	goals: readonly string[],
	key: (goal: string) => readonly string[],
): ReadonlyMap<string, ReadonlySet<string>> {
	const groups = new Map<string, Set<string>>()
	for (const goal of goals)
		for (const name of key(goal))
			groups.set(name, (groups.get(name) ?? new Set<string>()).add(goal))
	return groups
}

function describeRange(goal: string): readonly string[] {
	const number = Number(/^g(\d+)/.exec(goal)?.[1])
	if (!Number.isInteger(number)) return []
	return [number <= EARLY_LAST ? EARLY : LATE]
}

function tallyGroups(
	pairs: ReadonlyArray<{
		readonly control: Run
		readonly aggregate: Run
		readonly groups: ReadonlyMap<string, ReadonlySet<string>>
	}>,
): Readonly<Record<string, { readonly control: Tally; readonly aggregate: Tally }>> {
	const names = new Set(pairs.flatMap((pair) => [...pair.groups.keys()]))
	const none: Tally = { passes: 0, total: 0 }
	const rates = [...names].sort().map((name) => {
		let control = none
		let aggregate = none
		for (const pair of pairs) {
			const goals = pair.groups.get(name) ?? new Set<string>()
			control = addTally(control, pair.control, goals)
			aggregate = addTally(aggregate, pair.aggregate, goals)
		}
		return [name, { control, aggregate }] as const
	})
	return Object.fromEntries(rates.filter(([, rate]) => rate.control.total > 0))
}

function mergeInvariants(parts: ReadonlyArray<readonly Invariant[]>): readonly Invariant[] {
	const names = [...new Set(parts.flatMap((part) => part.map((invariant) => invariant.name)))]
	return names.map((name) => ({
		name,
		failures: parts.flatMap((part) =>
			part
				.filter((invariant) => invariant.name === name)
				.flatMap((invariant) => invariant.failures),
		),
	}))
}

function labelFailures(copy: number, failures: readonly string[]): Invariant['failures'] {
	return failures.map((failure) => `v${copy} ${failure}`)
}

function listLeaked(leaks: readonly Leak[], label: 'soleScored' | 'soleStale'): readonly string[] {
	return leaks
		.filter((leak) => leak[label] > 0)
		.map((leak) => `${leak.goal}: ${label} ${leak[label]}`)
}

function buildInvariants(
	control: Run,
	aggregate: Run,
	leaks: readonly Leak[],
): readonly Invariant[] {
	const { copy } = aggregate.info
	return [
		{
			name: 'wire',
			failures: labelFailures(copy, [...listWireFailures(control), ...listWireFailures(aggregate)]),
		},
		{ name: 'sole', failures: labelFailures(copy, listSoleFailures(aggregate)) },
		{ name: 'soleScored', failures: labelFailures(copy, listLeaked(leaks, 'soleScored')) },
		{ name: 'soleStale', failures: labelFailures(copy, listLeaked(leaks, 'soleStale')) },
		{ name: 'check', failures: labelFailures(copy, listCheckFailures(aggregate)) },
		{ name: 'overflow', failures: labelFailures(copy, listOverflowFailures(control, aggregate)) },
		{ name: 'plan', failures: labelFailures(copy, listPlanFailures(control, aggregate)) },
		{ name: 'scale', failures: labelFailures(copy, listScaleFailures(control, aggregate)) },
		{ name: 'timeout', failures: labelFailures(copy, listTimeoutFailures(control, aggregate)) },
	]
}

function computeShare(aggregates: readonly Run[]): Share {
	const rows = aggregates.flatMap((run) => run.rows)
	const zero = aggregates.flatMap((run) =>
		run.rows.filter((row) => !matchesExposure(run, row.goal)),
	)
	return {
		goals: rows.length,
		zero: zero.length,
		withheld: zero.filter((row) => row.withheld.length > 0).length,
		cut: zero.filter((row) => row.cut.length > 0).length,
		majority: zero.length * 2 >= rows.length,
	}
}

function decideVerdict(
	stats: Stats,
	invariants: readonly Invariant[],
	share: Share,
): { readonly verdict: Verdict; readonly reason: string } {
	const failed = invariants
		.filter((invariant) => invariant.failures.length > 0)
		.map((invariant) => invariant.name)
	if (failed.length > 0) return { verdict: 'STOP', reason: `invariant ${failed.join(', ')}` }
	if (stats.high !== undefined && stats.high < 0)
		return { verdict: 'STOP', reason: 'mean(d) + 2·sd(d)/√n is below 0' }
	if (share.majority)
		return {
			verdict: 'REFUSED',
			reason: `${share.zero} of ${share.goals} goals have no nonempty wire exposure`,
		}
	return {
		verdict: 'CONTINUE',
		reason:
			stats.high === undefined ? 'one copy gives no bound' : 'mean(d) + 2·sd(d)/√n is not below 0',
	}
}

function listRefusals(pair: PairFlag, runs: readonly Run[]): readonly string[] {
	return runs
		.filter((run) => run.info.transient > 0)
		.map((run) => `${run.name}: ${run.info.transient} transient judge errors; rerun the pair`)
}

function buildPair(flags: Flags, pair: PairFlag): PairReport | Refusal {
	const label = `${pair.short} copies ${pair.first}-${pair.last}`
	const controls: Run[] = []
	const aggregates: Run[] = []
	const scenarios: Copy[] = []
	try {
		for (let copy = pair.first; copy <= pair.last; copy += 1) {
			controls.push(readRun(flags.base, pair.short, pair.model, 'control', copy))
			aggregates.push(readRun(flags.base, pair.short, pair.model, 'aggregate', copy))
			scenarios.push(readCopy(join(flags.copies, `v${copy}.json`)))
		}
	} catch (error) {
		return { pair: label, reasons: [describeError(error)] }
	}
	const reasons = listRefusals(pair, [...controls, ...aggregates])
	if (reasons.length > 0) return { pair: label, reasons }
	const copies: CopyReport[] = []
	const invariants: Array<readonly Invariant[]> = []
	const cells: Array<{
		readonly control: Run
		readonly aggregate: Run
		readonly goals: readonly string[]
		readonly path: string
	}> = []
	for (const [at, control] of controls.entries()) {
		const aggregate = aggregates[at]
		const scenario = scenarios[at]
		const goals = compareGoals(control, aggregate)
		if (goals.length === 0)
			return { pair: label, reasons: [`${aggregate.name}: the arms served different goals`] }
		const scored = new Set(goals.filter(isScored))
		const closed = new Set(
			aggregate.rows
				.filter(
					(row) =>
						scored.has(row.goal) &&
						row.recalls.closed > 0 &&
						(control.rows.find((one) => one.goal === row.goal)?.recalls.closed ?? 0) === 0,
				)
				.map((row) => row.goal),
		)
		const rest = new Set([...scored].filter((goal) => !closed.has(goal)))
		let leaks: readonly Leak[]
		try {
			leaks = auditRun(aggregate, scenario)
		} catch (error) {
			return { pair: label, reasons: [describeError(error)] }
		}
		copies.push({
			copy: aggregate.info.copy,
			control: measureRun(control, undefined),
			aggregate: measureRun(aggregate, leaks),
			d: countPasses(aggregate, scored) - countPasses(control, scored),
			closed: computePartition(control, aggregate, closed),
			rest: computePartition(control, aggregate, rest),
			plans: listPlans(control, aggregate),
		})
		invariants.push(buildInvariants(control, aggregate, leaks))
		cells.push({
			control,
			aggregate,
			goals: [...scored],
			path: join(flags.copies, `v${aggregate.info.copy}.json`),
		})
	}
	const stats = computeStats(copies.map((copy) => copy.d))
	const merged = mergeInvariants(invariants)
	const share = computeShare(aggregates)
	const { verdict, reason } = decideVerdict(stats, merged, share)
	return {
		short: pair.short,
		model: pair.model,
		first: pair.first,
		last: pair.last,
		copies,
		stats,
		closed: copies.some((copy) => copy.closed.goals > 0)
			? computeStats(copies.map((copy) => copy.closed.d))
			: undefined,
		rest: computeStats(copies.map((copy) => copy.rest.d)),
		rates: tallyGroups(
			cells.map((cell) => ({
				control: cell.control,
				aggregate: cell.aggregate,
				groups: groupGoals(cell.goals, describeRange),
			})),
		),
		cases: tallyGroups(
			cells.map((cell) => {
				const cases = readCases(cell.path)
				return {
					control: cell.control,
					aggregate: cell.aggregate,
					groups: new Map(
						[...cases].map(([kind, goals]) => [
							kind,
							new Set([...goals].filter((goal) => cell.goals.includes(goal))),
						]),
					),
				}
			}),
		),
		share,
		invariants: merged,
		verdict,
		reason,
	}
}

function formatNumber(value: number | undefined): string {
	return value === undefined ? '-' : Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function formatTally(tally: Tally): string {
	return `${tally.passes}/${tally.total}`
}

function formatSeconds(run: RunReport, role: CallRole): string {
	return formatNumber((run.walls[role] ?? 0) / 1000)
}

function renderRun(run: RunReport): readonly string[] {
	const lines = [
		`run ${run.name} passes ${run.passes}/${run.goals} faults ${run.faults} overflow ${run.overflows} prompt ${run.prompt} recalls ${run.recalls.calls} (closed ${run.recalls.closed}: limit ${run.recalls.limit}, room ${run.recalls.room}) lookups ${run.lookups.calls} (repeats ${run.lookups.repeats})`,
		`  answer selections ${run.observations.answers}; distinct shortened recall listings ${run.observations.shortened}`,
		`  wall s agent ${formatSeconds(run, 'agent')} judge ${formatSeconds(run, 'judge')} summarizer ${formatSeconds(run, 'summarizer')} flush ${formatSeconds(run, 'flush')}; briefing tokens ${formatNumber(run.briefing.tokens)} facts ${run.briefing.facts} stale ${run.briefing.stale}; questions ${Object.entries(
			run.questions,
		)
			.map(([head, count]) => `${head} ${count.fresh} fresh ${count.hits} hit`)
			.join(', ')}`,
	]
	const { aggregate } = run
	if (aggregate === undefined) return lines
	return [
		...lines,
		`  builds ${aggregate.builds} (${Object.entries(aggregate.triggers)
			.map(([name, count]) => `${name} ${count}`)
			.join(
				', ',
			)}) failed ${aggregate.failed} consistency ${formatNumber(aggregate.consistency)} failures ${Object.entries(
			aggregate.failures,
		)
			.map(([kind, count]) => `${kind} ${count}`)
			.join(', ')} withheld ${aggregate.withheld} stale ${aggregate.stale}`,
		`  change asked ${aggregate.change.asked} yes ${aggregate.change.yes}; agree asked ${aggregate.agree.asked} failed ${aggregate.agree.failed}; summarizer calls ${aggregate.summarizer.calls} hits ${aggregate.summarizer.hits} s ${formatNumber(aggregate.summarizer.seconds)}; mica s change ${formatNumber(aggregate.mica.change)} agree ${formatNumber(aggregate.mica.agree)} ledger ${formatNumber(aggregate.mica.ledger)}`,
		...aggregate.goals.map(
			(goal) =>
				`  goal ${goal.goal} rendered ${goal.rendered} tokens ${formatNumber(goal.summary)} filtered ${goal.filtered} sole ${goal.sole} soleScored ${goal.soleScored} soleStale ${goal.soleStale} facts ${goal.facts} stale ${goal.stale}`,
		),
	]
}

function renderPair(report: PairReport): string {
	const { stats, share } = report
	const lines = [
		`pair ${report.short} ${report.model} copies ${report.first}-${report.last}`,
		'Later plan, recall, and answer-pass differences are observations of the method, not independent treatment effects.',
	]
	for (const copy of report.copies) {
		const equal = copy.plans.filter((plan) => plan.equal).length
		const entries = copy.plans.flatMap((plan) => plan.entry ?? [])
		lines.push(
			`copy ${copy.copy} control ${copy.control.name} ${copy.control.passes} aggregate ${copy.aggregate.name} ${copy.aggregate.passes} d ${copy.d} (recall closed only in aggregate: ${copy.closed.goals} goals d ${copy.closed.d}; rest ${copy.rest.goals} goals d ${copy.rest.d}) plans equal ${equal}/${copy.plans.length} first-call drift max ${formatNumber(entries.length === 0 ? undefined : Math.max(...entries))}`,
			...renderRun(copy.control),
			...renderRun(copy.aggregate),
		)
	}
	lines.push(
		`d ${report.copies.map((copy) => copy.d).join(', ')}`,
		`n ${stats.n} mean ${formatNumber(stats.mean)} sd ${formatNumber(stats.deviation)} bounds [${formatNumber(stats.low)}, ${formatNumber(stats.high)}] scorer end, goals without ${SKIPPED_GOAL}`,
		`split closed-only mean ${formatNumber(report.closed?.mean)} rest mean ${formatNumber(report.rest?.mean)}`,
		...Object.entries(report.rates).map(
			([name, rate]) =>
				`rate ${name} control ${formatTally(rate.control)} aggregate ${formatTally(rate.aggregate)}`,
		),
		...Object.entries(report.cases).map(
			([name, rate]) =>
				`case ${name} control ${formatTally(rate.control)} aggregate ${formatTally(rate.aggregate)}`,
		),
		`zero rendered ${share.zero}/${share.goals} (withheld ${share.withheld}, cut ${share.cut}) majority ${share.majority}`,
		...report.invariants.map(
			(invariant) =>
				`invariant ${invariant.name} ${invariant.failures.length === 0 ? 'PASS' : `FAIL ${invariant.failures.join('; ')}`}`,
		),
		`verdict ${report.verdict} (${report.reason})`,
	)
	return lines.join('\n')
}

function isRefusal(report: PairReport | Refusal): report is Refusal {
	return 'pair' in report
}

function main(argv: readonly string[]): number {
	const flags = parseFlags(argv)
	if (flags === undefined) {
		console.error(USAGE)
		return 64
	}
	const reports = flags.pairs.map((pair) => buildPair(flags, pair))
	for (const report of reports) {
		if (isRefusal(report)) console.error(`REFUSED ${report.pair}: ${report.reasons.join('; ')}`)
		else console.log(renderPair(report))
	}
	if (flags.json !== undefined)
		writeFileSync(
			flags.json,
			`${JSON.stringify({ pairs: reports.filter((report) => !isRefusal(report)), refused: reports.filter(isRefusal) }, null, 1)}\n`,
		)
	return reports.some(isRefusal) ? 1 : 0
}

process.exitCode = process.argv.includes('--archive')
	? main(process.argv.slice(2).filter((arg) => arg !== '--archive'))
	: Comparison.execute(['report', ...process.argv.slice(2)])
