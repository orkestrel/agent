// Reads what the judge would file if the summaries were in its state: node bench5/shadow.ts --run DIR --cache DIR --out FILE [--live] [--url URL] [--copies DIR]
// Exit: 0 on success, 1 on a missing input or a failed read, 64 on usage.
import type { JudgeAnswer, JudgeInterface, Message } from '../vendor/agent-0.0.30-trimmed/index.js'
import type { ToolCall } from '@orkestrel/tool'
import type { MatrixRequest } from './matrix/types.js'
import type {
	AggregateMaintenance,
	MirrorReading,
	ShadowAggregate,
	ShadowConfig,
	ShadowConfigOutcome,
	ShadowCounts,
	ShadowEntities,
	ShadowEntry,
	ShadowFlips,
	ShadowHead,
	ShadowInputs,
	ShadowItem,
	ShadowJudgment,
	ShadowMessage,
	ShadowOutcome,
	ShadowPairs,
	ShadowRate,
	ShadowRates,
	ShadowReport,
	ShadowRun,
	ShadowSnapshot,
	ShadowTruth,
	ShadowVerdict,
} from './types.js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { isDeepStrictEqual, parseArgs } from 'node:util'
import { isArray, isNumber, isRecord, isString } from '@orkestrel/contract'
// The vendored build is the one import of the agent in bench5; repoint this path when a later build is vendored.
import {
	LEDGER_OWNER_PREFIX,
	QUIET_CATEGORIES,
	collectRegistry,
	collectToolGroups,
	extractTokens,
	isJudgeQuestion,
	isMessage,
	linkOwners,
	matchEntities,
	findLedgerCall,
} from '../vendor/agent-0.0.30-trimmed/index.js'
import { createOllamaJudge } from '../vendor/ollama/index.js'
import {
	COPIES_DIR,
	DAEMON,
	FIT,
	HARNESS,
	JUDGE_MISS,
	MICA_CALIBRATION,
	MICA_CONTEXT,
	MICA_MODEL,
	MICA_SYSTEM,
	MODELS,
	TIMEOUT,
} from './constants.js'
import { describeError, readJSON, readLookup, readRows, readWireReading } from './helpers.js'
import { JudgeCache } from './JudgeCache.js'
import { isAggregateState } from './aggregates/validators.js'
import { nameMatrix, readModelDigest } from './matrix/helpers.js'
import { parseMatrixRun } from './matrix/parsers.js'

const OPTIONS = {
	run: { type: 'string' },
	cache: { type: 'string' },
	out: { type: 'string' },
	live: { type: 'boolean' },
	url: { type: 'string' },
	copies: { type: 'string' },
} as const

const USAGE =
	'usage: node bench5/shadow.ts --run DIR --cache DIR --out FILE [--live] [--url URL] [--copies DIR]'
const FILES = Object.freeze({
	run: 'run.json',
	messages: 'messages.jsonl',
	judgments: 'judgments.jsonl',
	aggregates: 'aggregates.jsonl',
	judge: 'judge.jsonl',
})
const SUMMARIES_LABEL = 'Topic summaries:'
const MESSAGE_LABEL = 'Message: '
// The two lookup tools whose results the ledger reads for owners (Driver.ts builds both with `readLookup`).
const LOOKUPS: ReadonlySet<string> = new Set(['lookup_order', 'lookup_customer'])
const KEEP: readonly string[] = Object.freeze(['fact', 'rule', 'correction'])
const DROP: readonly string[] = QUIET_CATEGORIES
const HEADS: readonly string[] = Object.freeze(['category', 'amends', 'supersedes'])

/**
 * Checks whether a judgment head is one that the shadow re-asks.
 *
 * @param value - The head of a judgment key
 * @returns True if the head is `category`, `amends`, or `supersedes`; false otherwise.
 */
export function isShadowHead(value: string): value is ShadowHead {
	return HEADS.includes(value)
}

/**
 * Checks whether a value is a tool call.
 *
 * @param value - The parsed value
 * @returns True if the value has a string `id` and `name` and a record of `arguments`; false otherwise.
 */
export function isToolCall(value: unknown): value is ToolCall {
	return isRecord(value) && isString(value.id) && isString(value.name) && isRecord(value.arguments)
}

function resolveRoot(path: string): string {
	return isAbsolute(path) ? path : resolve(HARNESS, path)
}

function readArgs(argv: readonly string[]) {
	return parseArgs({ args: [...argv], options: OPTIONS, strict: true }).values
}

/**
 * Parses the flags of one shadow invocation.
 *
 * @param argv - The arguments after the script path
 * @returns The configuration with `--cache` resolved against the harness directory and `--run`, `--out`, and `--copies` against the working directory, or the reasons the flags are refused
 * @example
 * ```ts
 * const outcome = parseFlags(['--run', 'tmp/l5/q2-aggregate-1', '--out', 'tmp/l5/shadow-1.json'])
 * ```
 */
export function parseFlags(argv: readonly string[]): ShadowConfigOutcome {
	let values: ReturnType<typeof readArgs>
	try {
		values = readArgs(argv)
	} catch (error) {
		return { success: false, error: `${describeError(error)}\n${USAGE}` }
	}
	const problems: string[] = []
	if (values.run === undefined) problems.push('--run is required')
	if (values.out === undefined) problems.push('--out is required')
	const url = values.url ?? DAEMON
	if (!URL.canParse(url)) problems.push('--url must be a URL')
	if (problems.length > 0 || values.run === undefined || values.out === undefined) {
		return { success: false, error: `${problems.join('\n')}\n${USAGE}` }
	}
	return {
		success: true,
		value: {
			run: resolve(values.run),
			cache: resolveRoot(values.cache ?? join('tmp', 'l5', 'cache')),
			out: resolve(values.out),
			live: values.live === true,
			url,
			copies: resolve(values.copies ?? COPIES_DIR),
		},
	}
}

/**
 * Parses the lines of a run's `messages.jsonl`.
 *
 * @param rows - The parsed lines
 * @returns One entry per line that holds a valid message, with its seed index and request flag
 */
export function parseMessages(rows: readonly unknown[]): readonly ShadowMessage[] {
	return rows.flatMap((row): readonly ShadowMessage[] =>
		isRecord(row) && isMessage(row)
			? [
					{
						message: row,
						index: isNumber(row.index) ? row.index : undefined,
						request: row.request === true,
					},
				]
			: [],
	)
}

function parseKey(id: string): readonly string[] {
	try {
		const key: unknown = JSON.parse(id)
		return isArray(key) ? key.filter(isString) : []
	} catch {
		return []
	}
}

function readAnswer(value: unknown): JudgeAnswer | undefined {
	if (!isRecord(value)) return undefined
	if (value.form === 'noul' && isNumber(value.noul)) return { form: 'noul', noul: value.noul }
	if (value.form !== 'choice' || !isRecord(value.probabilities)) return undefined
	const probabilities: Record<string, number> = {}
	for (const [name, probability] of Object.entries(value.probabilities)) {
		if (isNumber(probability)) probabilities[name] = probability
	}
	return { form: 'choice', probabilities }
}

/**
 * Parses the lines of a run's `judgments.jsonl`.
 *
 * @param rows - The parsed lines
 * @returns One entry per line that holds an id, a question, and a string state, in file order; the answer is `undefined` for a refusal
 */
export function parseJudgments(rows: readonly unknown[]): readonly ShadowJudgment[] {
	return rows.flatMap((row): readonly ShadowJudgment[] =>
		isRecord(row) && isString(row.id) && isJudgeQuestion(row.question) && isString(row.state)
			? [
					{
						id: row.id,
						key: parseKey(row.id),
						question: row.question,
						state: row.state,
						answer: readAnswer(row.answer),
					},
				]
			: [],
	)
}

/**
 * Parses the lines of a run's `aggregates.jsonl`.
 *
 * @param rows - The parsed lines
 * @returns One entry per line that holds a topic, a title, a read point, an event, and a status, in file order
 */
export function parseAggregates(
	rows: readonly unknown[],
): ReadonlyArray<ShadowAggregate | AggregateMaintenance> {
	return rows.flatMap((row): ReadonlyArray<ShadowAggregate | AggregateMaintenance> => {
		if (
			isRecord(row) &&
			row.event === 'maintenance' &&
			isString(row.goal) &&
			isNumber(row.lastSeed) &&
			(row.status === 'complete' || row.status === 'failed' || row.status === 'aborted')
		)
			return [{ event: 'maintenance', goal: row.goal, lastSeed: row.lastSeed, status: row.status }]
		return isRecord(row) &&
			isString(row.topic) &&
			isString(row.title) &&
			isNumber(row.lastSeed) &&
			isString(row.event) &&
			isString(row.status)
			? [
					{
						topic: row.topic,
						title: row.title,
						lastSeed: row.lastSeed,
						event: row.event,
						status: row.status,
						prose: isString(row.prose) ? row.prose : undefined,
						result: isAggregateState(row.result) ? row.result : undefined,
					},
				]
			: []
	})
}

function readNumbers(value: unknown): readonly number[] {
	return isArray(value) ? value.filter(isNumber) : []
}

/**
 * Reads the seed truth of a scenario copy.
 *
 * @param copy - The parsed copy file
 * @returns The first read point (the least `after` of the goals), the truth category of each seed index, and the truth pairs after the first read point as `EARLIER:LATER` seed indices
 * @remarks Thrown when the copy has no seed or no goal. A truth `supersedes` pair also enters the `amends` pairs, because the ledger screens a pair with the `amends` question before it asks `supersedes`.
 */
export function readTruth(copy: unknown): ShadowTruth {
	const seed = isRecord(copy) ? copy.seed : undefined
	const goals = isRecord(copy) ? copy.goals : undefined
	if (!isArray(seed) || !isArray(goals)) throw new Error('the copy has no seed or no goals')
	const afters = goals.flatMap((goal) =>
		isRecord(goal) && isNumber(goal.after) ? [goal.after] : [],
	)
	if (afters.length === 0) throw new Error('the copy has no goal with a read point')
	const first = Math.min(...afters)
	const categories = new Map<number, string>()
	const amends = new Set<string>()
	const supersedes = new Set<string>()
	seed.forEach((entry, index) => {
		const truth = isRecord(entry) && isRecord(entry.truth) ? entry.truth : undefined
		if (truth === undefined) return
		if (isString(truth.category)) categories.set(index, truth.category)
		if (index <= first) return
		for (const earlier of readNumbers(truth.amends)) amends.add(`${earlier}:${index}`)
		for (const earlier of readNumbers(truth.supersedes)) {
			supersedes.add(`${earlier}:${index}`)
			amends.add(`${earlier}:${index}`)
		}
	})
	return { first, categories, amends, supersedes }
}

/**
 * Builds the aggregates that were current at each read point.
 *
 * @param rows - The aggregate rows in file order
 * @returns One snapshot per completed, failed, or aborted maintenance boundary; unmaintained topics are absent, and incomplete passes are unavailable
 */
export function buildTimeline(
	rows: ReadonlyArray<ShadowAggregate | AggregateMaintenance>,
): readonly ShadowSnapshot[] {
	const snapshots: ShadowSnapshot[] = []
	let topics = new Map<string, ShadowEntry>()
	let seed: number | undefined
	for (const row of rows) {
		if (seed !== row.lastSeed) {
			topics = new Map()
			seed = row.lastSeed
		}
		if (row.event === 'maintenance' && 'goal' in row) {
			snapshots.push({
				seed: row.lastSeed,
				topics:
					row.status === 'complete'
						? new Map([...topics].filter(([, entry]) => entry.state.goal === row.goal))
						: new Map(),
			})
			topics = new Map()
		} else if (
			'topic' in row &&
			(row.event === 'build' || row.event === 'keep') &&
			row.status === 'current' &&
			row.prose !== undefined &&
			row.result !== undefined &&
			row.result.point === row.lastSeed
		) {
			topics.set(row.topic, { title: row.title, prose: row.prose, state: row.result })
		} else if (
			'topic' in row &&
			(row.event === 'withhold' ||
				row.event === 'retire' ||
				row.event === 'fail' ||
				row.status === 'stale')
		) {
			topics.delete(row.topic)
		}
	}
	return snapshots
}

/**
 * Finds the aggregates that were current before a message arrived.
 *
 * @param snapshots - The timeline, in read-point order
 * @param point - The seed index of the message
 * @returns The snapshot with the greatest read point that lies before the message, or `undefined` when none does
 */
export function findSnapshot(
	snapshots: readonly ShadowSnapshot[],
	point: number,
): ShadowSnapshot | undefined {
	return snapshots.findLast((snapshot) => snapshot.seed < point)
}

/**
 * Reads the lookups of a conversation prefix into the registry and the links that name owners.
 *
 * @param messages - The conversation prefix, in order
 * @returns The registry of ids and owner names, and the owner that each looked-up id links to
 */
export function buildEntities(messages: readonly Message[]): ShadowEntities {
	const readings: MirrorReading[] = []
	for (const group of collectToolGroups(messages)) {
		for (const message of group.slice(1)) {
			const call = findLedgerCall(group, message)
			if (call === undefined || !LOOKUPS.has(call.name)) continue
			const result = readLookup(call.arguments, message.content)
			const named = Object.values(call.arguments)
				.filter(isString)
				.flatMap((value) => [...extractTokens(value).ids])
			readings.push({
				id: message.id,
				name: call.name,
				arguments: call.arguments,
				text: message.content,
				result:
					result === undefined
						? undefined
						: { ...result, ids: [...new Set([...result.ids, ...named])] },
			})
		}
	}
	const registry = collectRegistry(readings)
	return { registry, links: linkOwners(readings, registry.owners) }
}

/**
 * Collects the desk topics that the recorded topic judgments file each message under.
 *
 * @param judgments - The run's judgments in file order
 * @returns The topic names per message id, in judgment order, for the answers that reach the topic cutoff
 */
export function collectDesk(
	judgments: readonly ShadowJudgment[],
): ReadonlyMap<string, readonly string[]> {
	const desk = new Map<string, readonly string[]>()
	for (const judgment of judgments) {
		const [head, id, name] = judgment.key
		if (head !== 'topic' || id === undefined || name === undefined) continue
		if (judgment.answer?.form !== 'noul' || judgment.answer.noul < FIT.topic) continue
		desk.set(id, [...(desk.get(id) ?? []), name])
	}
	return desk
}

/**
 * Lists the summary topics that one message names.
 *
 * @param id - The message id
 * @param text - The message text
 * @param desk - The desk topics per message id
 * @param entities - The registry and links at the read point
 * @returns The owner topic keys that the text names through the registry, then the desk topic names of the message
 */
export function listTopics(
	id: string,
	text: string,
	desk: ReadonlyMap<string, readonly string[]>,
	entities: ShadowEntities,
): readonly string[] {
	const owners = [...matchEntities(entities.registry, text, true)]
		.map((entity) => (entities.registry.owners.has(entity) ? entity : entities.links.get(entity)))
		.filter(isString)
		.map((owner) => `${LEDGER_OWNER_PREFIX}${owner}`)
	return [...owners, ...(desk.get(id) ?? [])]
}

/**
 * Renders the state that the shadow asks about.
 *
 * @param head - The judgment head
 * @param plain - The state that the ledger asked about
 * @param entries - The summaries to put before it, in order
 * @returns The plain state when no summary applies; otherwise `Topic summaries:` and one `TITLE: PROSE` line per entry, a blank line, then the plain state (labelled `Message: ` for a category question)
 */
export function renderShadow(
	head: ShadowHead,
	plain: string,
	entries: ReadonlyArray<Pick<ShadowEntry, 'title' | 'prose'>>,
): string {
	if (entries.length === 0) return plain
	const block = [SUMMARIES_LABEL, ...entries.map((entry) => `${entry.title}: ${entry.prose}`)].join(
		'\n',
	)
	return `${block}\n\n${head === 'category' ? MESSAGE_LABEL : ''}${plain}`
}

/**
 * Reads the decision that an answer makes at the ledger's cutoffs.
 *
 * @param head - The judgment head
 * @param answer - The answer, or `undefined` for a refusal
 * @returns For `category`, whether the quiet categories carry at least the category cutoff; for a pair head, whether the answer reaches that head's cutoff; `undefined` when the answer has the wrong form or is absent
 */
export function readVerdict(
	head: ShadowHead,
	answer: JudgeAnswer | undefined,
): boolean | undefined {
	if (answer === undefined) return undefined
	if (head === 'category') {
		if (answer.form !== 'choice') return undefined
		return DROP.reduce((sum, name) => sum + (answer.probabilities[name] ?? 0), 0) >= FIT.category
	}
	return answer.form === 'noul' ? answer.noul >= FIT[head] : undefined
}

/**
 * Builds the key of a pair for the truth sets.
 *
 * @param seeds - The seed indices of the pair, earlier then later
 * @returns `EARLIER:LATER`, or `undefined` when either message is no seed message
 */
export function buildPairKey(seeds: ReadonlyArray<number | undefined>): string | undefined {
	const [earlier, later] = seeds
	return earlier === undefined || later === undefined ? undefined : `${earlier}:${later}`
}

/**
 * Computes a rate from its hits and total.
 *
 * @param hits - The count that holds
 * @param total - The count asked
 * @returns The counts and their ratio, or `undefined` for the ratio when the total is 0
 */
export function computeRate(hits: number, total: number): ShadowRate {
	return { hits, total, rate: total === 0 ? undefined : hits / total }
}

function isMatched(item: ShadowItem): boolean {
	return item.plain !== undefined && item.shadow !== undefined
}

function tallyPairs(
	items: readonly ShadowItem[],
	keys: ReadonlySet<string>,
	pick: ShadowVerdict,
): ShadowPairs {
	const seen = new Map<string, ShadowItem>()
	for (const item of items) {
		const key = buildPairKey(item.seeds)
		if (key !== undefined) seen.set(key, item)
	}
	let recalled = 0
	let truths = 0
	for (const key of keys) {
		const item = seen.get(key)
		if (item !== undefined && !isMatched(item)) continue
		truths += 1
		if (item !== undefined && pick(item) === true) recalled += 1
	}
	let dropped = 0
	let outside = 0
	for (const item of items) {
		const key = buildPairKey(item.seeds)
		if (!isMatched(item) || (key !== undefined && keys.has(key))) continue
		outside += 1
		if (pick(item) === true) dropped += 1
	}
	return { recall: computeRate(recalled, truths), falsedrop: computeRate(dropped, outside) }
}

/**
 * Computes the keep, drop, pair recall, and false-drop rates of one side of the reading.
 *
 * @param items - Every shadowed item
 * @param truth - The seed truth
 * @param pick - Reads the side's decision from an item: the plain answer or the shadow answer
 * @returns The rates over the items that both sides decided. Keep counts truth `fact`, `rule`, and `correction` messages filed not quiet; drop counts truth `chatter` and `distractor` messages filed quiet; recall counts truth pairs read at the cutoff, and a truth pair that the ledger never screened counts as not read; false drop counts screened pairs outside the truth that read at the cutoff
 */
export function computeRates(
	items: readonly ShadowItem[],
	truth: ShadowTruth,
	pick: ShadowVerdict,
): ShadowRates {
	let kept = 0
	let wanted = 0
	let dropped = 0
	let unwanted = 0
	for (const item of items) {
		if (item.head !== 'category' || !isMatched(item)) continue
		const seed = item.seeds[0]
		const category = seed === undefined ? undefined : truth.categories.get(seed)
		if (category === undefined) continue
		if (KEEP.includes(category)) {
			wanted += 1
			if (pick(item) === false) kept += 1
		} else if (DROP.includes(category)) {
			unwanted += 1
			if (pick(item) === true) dropped += 1
		}
	}
	return {
		keep: computeRate(kept, wanted),
		drop: computeRate(dropped, unwanted),
		amends: tallyPairs(
			items.filter((item) => item.head === 'amends'),
			truth.amends,
			pick,
		),
		supersedes: tallyPairs(
			items.filter((item) => item.head === 'supersedes'),
			truth.supersedes,
			pick,
		),
	}
}

/**
 * Counts the items whose decision differs between the plain and the shadow answer.
 *
 * @param items - Every shadowed item
 * @returns The flips per head, over the items that both sides decided
 */
export function countFlips(items: readonly ShadowItem[]): ShadowFlips {
	return {
		category: countFlipped(items, 'category'),
		amends: countFlipped(items, 'amends'),
		supersedes: countFlipped(items, 'supersedes'),
	}
}

function countFlipped(items: readonly ShadowItem[], head: ShadowHead): number {
	return items.filter((item) => item.head === head && isMatched(item) && item.plain !== item.shadow)
		.length
}

/**
 * Counts the items by outcome and the topics that had no aggregate.
 *
 * @param items - Every shadowed item
 * @returns The item count, the count per outcome, and the number of named topics without a current aggregate
 */
export function countItems(items: readonly ShadowItem[]): ShadowCounts {
	return {
		items: items.length,
		plain: countOutcome(items, 'plain'),
		asked: countOutcome(items, 'asked'),
		missed: countOutcome(items, 'missed'),
		failed: countOutcome(items, 'failed'),
		absent: items.reduce((sum, item) => sum + item.absent.length, 0),
	}
}

function countOutcome(items: readonly ShadowItem[], outcome: ShadowOutcome): number {
	return items.filter((item) => item.outcome === outcome).length
}

/**
 * Formats a rate for the terminal.
 *
 * @param rate - The rate
 * @returns `HITS/TOTAL` and the ratio to three places, or `HITS/TOTAL (none)` when the total is 0
 */
export function formatRate(rate: ShadowRate): string {
	return `${rate.hits}/${rate.total} ${rate.rate === undefined ? '(none)' : rate.rate.toFixed(3)}`
}

/**
 * Reads the judge's filing with the aggregates in its state and compares it with the recorded filing.
 *
 * @example
 * ```ts
 * const outcome = parseFlags(['--run', 'tmp/l5/q2-aggregate-1', '--out', 'tmp/l5/shadow-1.json'])
 * if (outcome.success) process.exitCode = await new Shadow(outcome.value).execute()
 * ```
 */
export class Shadow {
	readonly #requests: MatrixRequest[] = []
	readonly #config: ShadowConfig
	readonly #entities = new Map<number, ShadowEntities>()

	/**
	 * Holds the flags of one invocation.
	 * @param config - The parsed flags
	 */
	constructor(config: ShadowConfig) {
		this.#config = config
	}

	/**
	 * Reads the run, asks the shadow questions, and writes the report.
	 * @returns 0 after the report is written
	 * @remarks Thrown when an input file is missing, when the copy lacks seed truth, or when a live miss fails every retry.
	 */
	async execute(): Promise<number> {
		const inputs = this.#load()
		if (inputs.run.frozen !== undefined && inputs.run.execution !== undefined) {
			if (this.#config.live) {
				const response = await fetch(new URL('/api/tags', this.#config.url))
				if (
					!response.ok ||
					readModelDigest(await response.json(), MICA_MODEL) !== inputs.run.frozen.judge.digest
				)
					throw new Error('shadow judge digest differs from freeze')
			}
			const lineage = {
				shadow: nameMatrix(inputs.run.execution),
				frozen: inputs.run.execution.frozen,
				judge: inputs.run.frozen.judge,
				seed: inputs.run.frozen.seed,
			}
			mkdirSync(this.#config.cache, { recursive: true })
			const path = join(this.#config.cache, 'lineage.json')
			if (existsSync(path)) {
				if (!isDeepStrictEqual(readJSON(path), lineage))
					throw new Error('shadow cache lineage differs')
			} else {
				if (existsSync(join(this.#config.cache, FILES.judge)))
					throw new Error('unbound shadow cache')
				writeFileSync(
					join(this.#config.cache, FILES.judge),
					readFileSync(inputs.run.frozen.seed.path),
					{ flag: 'wx' },
				)
				writeFileSync(path, `${JSON.stringify(lineage, null, 2)}\n`, { flag: 'wx' })
			}
		}
		const abort = new AbortController()
		const cache = this.#createCache(inputs.run, abort)
		const items = await this.#collect(inputs, cache, abort.signal)
		const report: ShadowReport = {
			...inputs.run,
			counts: countItems(items),
			plain: computeRates(items, inputs.truth, (item) => item.plain),
			shadow: computeRates(items, inputs.truth, (item) => item.shadow),
			flips: countFlips(items),
			items,
			...(inputs.run.execution === undefined ? {} : { requests: this.#requests }),
		}
		mkdirSync(dirname(this.#config.out), { recursive: true })
		writeFileSync(this.#config.out, `${JSON.stringify(report, null, 2)}\n`)
		this.#print(report)
		return 0
	}

	#load(): ShadowInputs {
		const { run, copies, cache, live } = this.#config
		const missing = [join(run, FILES.run)].filter((path) => !existsSync(path))
		if (missing.length > 0) throw new Error(`missing input: ${missing.join(', ')}`)
		const meta = readJSON(join(run, FILES.run))
		const matrix = isRecord(meta) && meta.protocol === 'l6' ? parseMatrixRun(run) : undefined
		if (
			isRecord(meta) &&
			meta.protocol === 'l6' &&
			(matrix === undefined || matrix.failures.length > 0 || matrix.execution.arm !== 'aggregate')
		)
			throw new Error('l6 shadow requires a valid maintained aggregate run')
		const info: ShadowRun = {
			copy: isRecord(meta) && isNumber(meta.copy) ? meta.copy : 0,
			model: isRecord(meta) && isString(meta.model) ? meta.model : '',
			arm: isRecord(meta) && isString(meta.arm) ? meta.arm : '',
			...(matrix === undefined ? {} : { execution: matrix.execution, frozen: matrix.frozen }),
		}
		const copyPath = join(copies, `v${info.copy}.json`)
		const paths = [
			join(run, FILES.messages),
			join(run, FILES.judgments),
			join(run, FILES.aggregates),
			copyPath,
			...(live ? [] : [join(cache, FILES.judge)]),
		].filter((path) => !existsSync(path))
		if (paths.length > 0) throw new Error(`missing input: ${paths.join(', ')}`)
		return {
			run: info,
			messages: parseMessages(readRows(join(run, FILES.messages))),
			judgments: parseJudgments(readRows(join(run, FILES.judgments))),
			timeline: buildTimeline(parseAggregates(readRows(join(run, FILES.aggregates)))),
			truth: readTruth(readJSON(copyPath)),
		}
	}

	// Builds the judge cache over the shared rows file; without `--live` the inner judge cannot reach the network.
	#createCache(run: ShadowRun, abort: AbortController): JudgeCache {
		const { live, url, cache } = this.#config
		const judge: JudgeInterface = createOllamaJudge({
			url,
			model: MICA_MODEL,
			system: MICA_SYSTEM,
			calibration: { temperature: MICA_CALIBRATION },
			options: { num_ctx: MICA_CONTEXT },
			keepAlive: '5m',
			timeout: TIMEOUT,
			fetch: (input: Parameters<typeof fetch>[0], init?: RequestInit) =>
				live
					? this.#fetch(input, init)
					: Promise.reject(
							new Error(`${JUDGE_MISS}: the shadow reads the cache only without --live`),
						),
		})
		return new JudgeCache({
			judge,
			path: join(cache, FILES.judge),
			live,
			retry: live ? (run.frozen?.configuration.retry ?? this.#readRetry(run.model)) : 0,
			abort: (fault) => abort.abort(fault),
		})
	}

	async #fetch(input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> {
		const started = performance.now()
		const timestamp = Date.now()
		const request: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
		const sequence = this.#requests.length + 1
		try {
			const response = await fetch(input, init)
			const text = await response.clone().text()
			const reading = readWireReading({ body: request }, { text })
			this.#requests.push({
				sequence,
				role: 'judge',
				started: timestamp,
				finished: Date.now(),
				sent: true,
				request,
				response: text,
				status: response.status,
				wall: performance.now() - started,
				prompt: reading.prompt,
				completion: reading.completion,
				reason: reading.reason,
				failures: response.ok ? [] : ['transport'],
			})
			return response
		} catch (error) {
			this.#requests.push({
				sequence,
				role: 'judge',
				started: timestamp,
				finished: Date.now(),
				sent: true,
				request,
				error: describeError(error),
				wall: performance.now() - started,
				failures: ['transport'],
			})
			throw error
		}
	}

	#readRetry(model: string): number {
		const key = Object.entries(MODELS).find(([, tag]) => tag === model)?.[0]
		const settings = readJSON(join(HARNESS, 'bench5', 'settings.json'))
		const entry = key !== undefined && isRecord(settings) ? settings[key] : undefined
		if (!isRecord(entry) || !isNumber(entry.retry))
			throw new Error(`bench5/settings.json has no retry for the model ${model}`)
		return entry.retry
	}

	async #collect(
		inputs: ShadowInputs,
		cache: JudgeCache,
		signal: AbortSignal,
	): Promise<readonly ShadowItem[]> {
		const { messages, judgments, timeline, truth } = inputs
		const positions = new Map(messages.map((one, position) => [one.message.id, position]))
		const seeds = new Map(
			messages.flatMap((one) => (one.index === undefined ? [] : [[one.message.id, one.index]])),
		)
		const desk = collectDesk(judgments)
		const items: ShadowItem[] = []
		for (const judgment of judgments) {
			const [head, ...ids] = judgment.key
			if (head === undefined || !isShadowHead(head) || ids.length !== (head === 'category' ? 1 : 2))
				continue
			const members = ids.map((id) => positions.get(id))
			const indices = ids.map((id) => seeds.get(id))
			const point = indices[indices.length - 1]
			const later = members[members.length - 1]
			if (point === undefined || later === undefined || point <= truth.first) continue
			const boundary = messages.findIndex((one, position) => position > later && one.request)
			const entities = this.#readEntities(messages, boundary < 0 ? messages.length : boundary)
			const named = [...members, boundary < 0 ? undefined : boundary].flatMap((position) => {
				const one = position === undefined ? undefined : messages[position]
				return one === undefined
					? []
					: listTopics(one.message.id, one.message.content, desk, entities)
			})
			const snapshot = findSnapshot(timeline, point)
			const wanted = [...new Set(named)]
			const shown = wanted.filter((key) => snapshot?.topics.has(key) === true)
			const entries = shown.flatMap((key) => {
				const entry = snapshot?.topics.get(key)
				return entry === undefined ? [] : [entry]
			})
			const state = renderShadow(head, judgment.state, entries)
			const plain = readVerdict(head, judgment.answer)
			const base = {
				aggregates: shown.flatMap((topic) => {
					const entry = snapshot?.topics.get(topic)
					return entry === undefined ? [] : [{ topic, state: entry.state, prose: entry.prose }]
				}),
				id: judgment.id,
				head,
				seeds: indices,
				point,
				topics: shown,
				absent: wanted.filter((key) => !shown.includes(key)),
				state,
				plain,
			}
			if (entries.length === 0) {
				items.push({ ...base, outcome: 'plain', shadow: plain })
				continue
			}
			const asked = await this.#ask(cache, judgment, state, signal)
			items.push({ ...base, outcome: asked.outcome, shadow: readVerdict(head, asked.answer) })
		}
		return items
	}

	#readEntities(messages: readonly ShadowMessage[], boundary: number): ShadowEntities {
		const known = this.#entities.get(boundary)
		if (known !== undefined) return known
		const built = buildEntities(messages.slice(0, boundary).map((one) => one.message))
		this.#entities.set(boundary, built)
		return built
	}

	async #ask(
		cache: JudgeCache,
		judgment: ShadowJudgment,
		state: string,
		signal: AbortSignal,
	): Promise<{ readonly outcome: ShadowOutcome; readonly answer: JudgeAnswer | undefined }> {
		try {
			const result = await cache.ask(
				{ state, questions: { [judgment.id]: judgment.question } },
				signal,
			)
			const answer = result.answers[judgment.id]
			return { outcome: answer === undefined ? 'failed' : 'asked', answer }
		} catch (error) {
			if (cache.fault !== undefined) throw cache.fault
			return {
				outcome: error instanceof Error && error.message === JUDGE_MISS ? 'missed' : 'failed',
				answer: undefined,
			}
		}
	}

	#print(report: ShadowReport): void {
		const { counts, plain, shadow, flips } = report
		console.log(
			`shadow v${report.copy} ${report.model} ${report.arm}: items ${counts.items} (plain ${counts.plain}, asked ${counts.asked}, missed ${counts.missed}, failed ${counts.failed}); topics without an aggregate ${counts.absent}`,
		)
		console.log(`keep      plain ${formatRate(plain.keep)} | shadow ${formatRate(shadow.keep)}`)
		console.log(`drop      plain ${formatRate(plain.drop)} | shadow ${formatRate(shadow.drop)}`)
		for (const head of ['amends', 'supersedes'] as const) {
			console.log(
				`${head} recall plain ${formatRate(plain[head].recall)} | shadow ${formatRate(shadow[head].recall)}`,
			)
			console.log(
				`${head} falsedrop plain ${formatRate(plain[head].falsedrop)} | shadow ${formatRate(shadow[head].falsedrop)}`,
			)
		}
		console.log(
			`flips     category ${flips.category}, amends ${flips.amends}, supersedes ${flips.supersedes}`,
		)
		console.log(`wrote ${this.#config.out}`)
	}
}

if (import.meta.main) {
	const outcome = parseFlags(process.argv.slice(2))
	if (outcome.success) {
		try {
			process.exitCode = await new Shadow(outcome.value).execute()
		} catch (error) {
			process.stderr.write(`${describeError(error)}\n`)
			process.exitCode = 1
		}
	} else {
		process.stderr.write(`${outcome.error}\n`)
		process.exitCode = 64
	}
}
