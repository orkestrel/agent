// Fits the CHANGE and AGREE cutoffs from seed truth: node bench5/calibrate.ts --cache DIR --model TAG --out DIR [--live] [--url URL]
// Exit: 0 on success, 1 on a failed run, 64 on usage.
import type { JudgeInterface, Message } from '../vendor/agent-0.0.30-trimmed/index.js'
import type {
	AggregateSource,
	CalibrateAsked,
	CalibrateConfig,
	CalibrateConfigOutcome,
	CalibrateCounts,
	CalibrateCutoff,
	CalibrateFit,
	CalibrateHead,
	CalibrateItem,
	CalibrateMessage,
	CalibrateScenario,
	CalibrateSelection,
	CalibrateSummary,
	CalibrateSwap,
	CalibrateTally,
	CalibrateVariant,
	Settings,
	SummarizerInterface,
	TopicSpec,
} from './types.js'
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, isAbsolute, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { isArray, isNumber, isRecord, isString } from '@orkestrel/contract'
// The vendored build is the one import of the agent in bench5; repoint this path when a later build is vendored.
import { splitSentences } from '../vendor/agent-0.0.30-trimmed/index.js'
import { createOllama, createOllamaJudge } from '../vendor/ollama/index.js'
import { AGREE_HEAD, AGREE_QUESTION, CHANGE_HEAD } from './aggregates/constants.js'
import { Support } from './aggregates/Support.js'
import {
	buildAgreeState,
	reduceSupport,
	buildChangeQuestion,
	buildChangeState,
	buildSummaryPrompt,
	checkProse,
	collectStaleTokens,
	renderSource,
} from './aggregates/helpers.js'
import {
	DAEMON,
	HARNESS,
	MICA_CALIBRATION,
	MICA_CONTEXT,
	MICA_MODEL,
	MICA_SYSTEM,
	MODELS,
	SAMPLER,
	SCENARIO_LONG,
	TIMEOUT,
} from './constants.js'
import { readSettings } from './Driver.js'
import {
	describeError,
	extractHead,
	findDay,
	isMessageRole,
	matchesDeterministic,
	readJSON,
} from './helpers.js'
import { JudgeCache } from './JudgeCache.js'
import { Summarizer } from './Summarizer.js'

const OPTIONS = {
	cache: { type: 'string' },
	model: { type: 'string' },
	out: { type: 'string' },
	live: { type: 'boolean' },
	url: { type: 'string' },
} as const

const OFFLINE = 'calibration reads the caches only without --live'
const USAGE =
	'usage: node bench5/calibrate.ts --cache DIR --model TAG --out DIR [--live] [--url URL]'
const FILES = Object.freeze({
	judge: 'judge.jsonl',
	summary: 'summary.jsonl',
	items: 'items.jsonl',
	fit: 'fit.json',
})
// The truth categories whose messages state what a summary must carry.
const DECISIVE: readonly string[] = Object.freeze(['fact', 'rule', 'correction'])
// The sampling seed is fixed so that a rerun draws the same negatives; each item logs the message indices it drew.
const RANDOM_SEED = 7
// Every cutoff from 0.51 to 1 in steps of 0.01, so that a fit is "the lowest value above 0.5".
const GRID: readonly number[] = Object.freeze(
	Array.from({ length: 50 }, (_unused, at) => (51 + at) / 100),
)
// A value is a date, an id, an amount, or a number; the alternation order keeps the digits of an id or a date inside one value.
const VALUE = /\d{4}-\d{2}-\d{2}|\b[A-Za-z]{2,}-\d+\b|\$\d[\d,]*(?:\.\d+)?|\d+(?:\.\d+)?/g

function resolveRoot(path: string): string {
	return isAbsolute(path) ? path : resolve(HARNESS, path)
}

function readArgs(argv: readonly string[]) {
	return parseArgs({ args: [...argv], options: OPTIONS, strict: true }).values
}

/**
 * Parses the flags of one calibration invocation.
 *
 * @param argv - The arguments after the script path
 * @returns The configuration with `--cache` resolved against the harness directory and `--out` against the working directory, or the reasons the flags are refused
 * @example
 * ```ts
 * const outcome = parseFlags(['--cache', 'tmp/l5/cache', '--model', 'qwen3.5:2b-q4_K_M', '--out', 'tmp/l5/calibrate'])
 * ```
 */
export function parseFlags(argv: readonly string[]): CalibrateConfigOutcome {
	let values: ReturnType<typeof readArgs>
	try {
		values = readArgs(argv)
	} catch (error) {
		return { success: false, error: `${describeError(error)}\n${USAGE}` }
	}
	const problems: string[] = []
	if (values.cache === undefined) problems.push('--cache is required')
	if (values.out === undefined) problems.push('--out is required')
	const model = values.model
	const key = Object.entries(MODELS).find(([, tag]) => tag === model)?.[0]
	if (key === undefined) problems.push(`--model must be one of ${Object.values(MODELS).join(', ')}`)
	const url = values.url ?? DAEMON
	if (!URL.canParse(url)) problems.push('--url must be a URL')
	if (
		problems.length > 0 ||
		values.cache === undefined ||
		values.out === undefined ||
		model === undefined ||
		key === undefined
	) {
		return { success: false, error: `${problems.join('\n')}\n${USAGE}` }
	}
	return {
		success: true,
		value: {
			cache: resolveRoot(values.cache),
			model,
			key,
			out: resolve(values.out),
			live: values.live === true,
			url,
			scenario: SCENARIO_LONG,
			settings: join(HARNESS, 'bench5', 'settings.json'),
		},
	}
}

function readNumbers(value: unknown): readonly number[] {
	return isArray(value) ? value.filter(isNumber) : []
}

/**
 * Reads the parts of the long scenario that the calibration uses.
 *
 * @param raw - The parsed scenario file
 * @returns The desk topics, the days, every seed message with its truth, and the distinct read points in ascending order
 * @remarks Thrown when the scenario has no topic table, no seed, or no goal with a read point, or when a seed message has no text or a role the build does not know.
 */
export function readScenario(raw: unknown): CalibrateScenario {
	const ledger = isRecord(raw) ? raw.ledger : undefined
	const topics = isRecord(ledger) ? ledger.topics : undefined
	const seed = isRecord(raw) ? raw.seed : undefined
	const goals = isRecord(raw) ? raw.goals : undefined
	const days = isRecord(raw) ? raw.days : undefined
	if (!isRecord(topics)) throw new Error('the scenario field ledger.topics is not a table')
	if (!isArray(seed) || !isArray(goals)) throw new Error('the scenario has no seed or no goals')
	const points = [
		...new Set(
			goals.flatMap((goal) => (isRecord(goal) && isNumber(goal.after) ? [goal.after] : [])),
		),
	].sort((left, right) => left - right)
	if (points.length === 0) throw new Error('the scenario has no goal with a read point')
	return {
		topics: Object.entries(topics).map(([name, criterion]): TopicSpec => ({
			name,
			criterion: String(criterion),
		})),
		days: (isArray(days) ? days : []).flatMap((day) =>
			isRecord(day) && isString(day.date) && isNumber(day.from)
				? [{ date: day.date, from: day.from }]
				: [],
		),
		messages: seed.map((entry, index): CalibrateMessage => {
			const truth = isRecord(entry) && isRecord(entry.truth) ? entry.truth : {}
			if (!isRecord(entry) || !isString(entry.content) || !isMessageRole(entry.role)) {
				throw new Error(`the seed message ${index} has no text or a role the build does not know`)
			}
			return {
				index,
				role: entry.role,
				content: entry.content,
				category: isString(truth.category) ? truth.category : '',
				topics: isArray(truth.topics) ? truth.topics.filter(isString) : [],
				amends: readNumbers(truth.amends),
				supersedes: readNumbers(truth.supersedes),
			}
		}),
		points,
	}
}

/**
 * Selects the decisive messages that a topic's summary reads at a read point.
 *
 * @param messages - The seed messages in order
 * @param topic - The desk topic name
 * @param point - The index of the last seed message added
 * @returns The live carriers of the topic and the stale carriers, in message order
 * @remarks A carrier is a message up to the read point with a decisive truth category whose truth topics include the topic. A carrier is stale when a truth `amends` or `supersedes` pair of a message up to the read point names it as the earlier side; the pair's later message can have any category.
 */
export function selectSources(
	messages: readonly CalibrateMessage[],
	topic: string,
	point: number,
): CalibrateSelection {
	const replaced = new Set(
		messages
			.filter((message) => message.index <= point)
			.flatMap((message) => [...message.amends, ...message.supersedes]),
	)
	const carriers = messages.filter(
		(message) =>
			message.index <= point &&
			DECISIVE.includes(message.category) &&
			message.topics.includes(topic),
	)
	return {
		live: carriers.filter((message) => !replaced.has(message.index)),
		stale: carriers.filter((message) => replaced.has(message.index)),
	}
}

/**
 * Finds the next decisive message that carries a topic.
 *
 * @param messages - The seed messages in order
 * @param topic - The desk topic name
 * @param point - The index of the last seed message added
 * @returns The first message after the read point with a decisive truth category and the topic, or `undefined` when none follows
 */
export function findNext(
	messages: readonly CalibrateMessage[],
	topic: string,
	point: number,
): CalibrateMessage | undefined {
	return messages.find(
		(message) =>
			message.index > point &&
			DECISIVE.includes(message.category) &&
			message.topics.includes(topic),
	)
}

/**
 * Splits a seed message into the source lines a summary reads.
 *
 * @param message - The seed message
 * @param days - The scenario's days
 * @returns One source per sentence, with the message's date
 */
export function buildSources(
	message: CalibrateMessage,
	days: CalibrateScenario['days'],
): readonly AggregateSource[] {
	const day = findDay(days, message.index)?.date ?? ''
	return splitSentences(message.content).map((text, sentence) => ({
		id: `m${message.index}`,
		sentence,
		role: message.role,
		text,
		day,
	}))
}

/**
 * Creates a seeded random source.
 *
 * @param seed - The integer seed
 * @returns A function that returns the next number from 0 up to, and not including, 1
 */
export function createRandom(seed: number): () => number {
	let state = seed >>> 0
	return () => {
		state = (state + 0x6d2b79f5) >>> 0
		let mixed = Math.imul(state ^ (state >>> 15), state | 1)
		mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
		return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
	}
}

/**
 * Picks one member of a list with a random source.
 *
 * @param list - The members
 * @param random - The random source
 * @returns The member at the drawn position, or `undefined` for an empty list; an empty list draws nothing from the source
 */
export function pickOne<T>(list: readonly T[], random: () => number): T | undefined {
	return list.length === 0 ? undefined : list[Math.floor(random() * list.length)]
}

/**
 * Lists the values of a text: its dates, ids, amounts, and numbers.
 *
 * @param text - The text to read
 * @returns The distinct values as written, in the order they first occur
 */
export function extractValues(text: string): readonly string[] {
	return [...new Set(text.match(VALUE) ?? [])]
}

/**
 * Computes the shape of a value.
 *
 * @param value - A value from `extractValues`
 * @returns The value with every letter read as `A` and every digit as `9`, so `MX-4471` and `ESC-2219` share one shape
 */
export function computeShape(value: string): string {
	return value.replace(/[A-Za-z]/g, 'A').replace(/\d/g, '9')
}

/**
 * Replaces one value of a text and leaves every other value as written.
 *
 * @param text - The text
 * @param from - The value to replace, as `extractValues` reads it
 * @param to - The replacement
 * @returns The text with each whole value equal to `from` replaced by `to`
 */
export function replaceValue(text: string, from: string, to: string): string {
	return text.replace(VALUE, (match) => (match === from ? to : match))
}

function findSwap(
	prose: string,
	variant: CalibrateSwap['variant'],
	candidates: readonly string[],
	taken: ReadonlySet<string>,
): CalibrateSwap | undefined {
	const own = extractValues(prose)
	for (const from of own) {
		const to = candidates.find(
			(value) =>
				value !== from &&
				!own.includes(value) &&
				!taken.has(value) &&
				computeShape(value) === computeShape(from),
		)
		if (to !== undefined) return { variant, from, to, prose: replaceValue(prose, from, to) }
	}
	return undefined
}

/**
 * Builds the summaries that disagree with their sources by one value.
 *
 * @param prose - A summary that passes the code check
 * @param live - The texts of the sources the summary was built from
 * @param stale - The texts of the topic's stale messages
 * @param foreign - The texts of decisive messages that carry other topics
 * @returns Up to two swaps: one `stale` swap that puts a value of a stale message in place of a value of the summary, and one `cross` swap that puts a value from another topic in its place; both take a replacement of the same shape that no live source carries, and a swap is absent when no value of the summary has one
 */
export function buildSwaps(
	prose: string,
	live: readonly string[],
	stale: readonly string[],
	foreign: readonly string[],
): readonly CalibrateSwap[] {
	const current = new Set(extractValues(live.join('\n')))
	const old = extractValues(stale.join('\n')).filter((value) => !current.has(value))
	const other = extractValues(foreign.join('\n')).filter(
		(value) => !current.has(value) && !old.includes(value),
	)
	return [findSwap(prose, 'stale', old, current), findSwap(prose, 'cross', other, current)].flatMap(
		(swap) => (swap === undefined ? [] : [swap]),
	)
}

/**
 * Builds the labelled judge items of one summary.
 *
 * @param summary - A summary that passes the code check
 * @param scenario - The scenario whose seed truth labels the items
 * @param random - The random source that draws the CHANGE negatives
 * @returns The CHANGE items, then the AGREE items. CHANGE: the next decisive message that carries the topic is the positive; a decisive message with later index that lacks the topic, and a message among the summary's live sources, are the negatives, one drawn each, and a summary with no next message has no CHANGE item. AGREE: the summary is the positive; each swap of `buildSwaps` is a negative.
 */
export function buildItems(
	summary: CalibrateSummary,
	scenario: CalibrateScenario,
	random: () => number,
): readonly CalibrateItem[] {
	const { topic, after, asOf, prose, sources } = summary
	const { messages, days } = scenario
	const items: CalibrateItem[] = []
	const next = findNext(messages, topic, after)
	if (next !== undefined) {
		const foreign = messages.filter(
			(message) =>
				message.index > after &&
				message.index !== next.index &&
				DECISIVE.includes(message.category) &&
				!message.topics.includes(topic),
		)
		const repeats = messages.filter((message) => summary.live.includes(message.index))
		const events: ReadonlyArray<
			readonly [CalibrateVariant, CalibrateMessage | undefined, boolean]
		> = [
			['next', next, true],
			['foreign', pickOne(foreign, random), false],
			['repeat', pickOne(repeats, random), false],
		]
		for (const [variant, message, label] of events) {
			if (message === undefined) continue
			items.push({
				id: JSON.stringify([CHANGE_HEAD, `m${message.index}`, topic, after]),
				head: CHANGE_HEAD,
				variant,
				label,
				topic,
				after,
				events: [message.index],
				swap: undefined,
				state: buildChangeState({ title: topic, asOf, prose }, buildSources(message, days)),
				question: buildChangeQuestion(topic),
			})
		}
	}
	const texts = (list: readonly CalibrateMessage[]): readonly string[] =>
		list.map((message) => message.content)
	const selection = selectSources(messages, topic, after)
	const swaps = buildSwaps(
		prose,
		sources.map((source) => source.text),
		texts(selection.stale),
		texts(
			messages.filter(
				(message) => DECISIVE.includes(message.category) && !message.topics.includes(topic),
			),
		),
	)
	const agrees: ReadonlyArray<
		readonly [CalibrateVariant, boolean, string, CalibrateSwap | undefined]
	> = [
		['summary', true, prose, undefined],
		...swaps.map((swap): readonly [CalibrateVariant, boolean, string, CalibrateSwap] => [
			swap.variant,
			false,
			swap.prose,
			swap,
		]),
	]
	for (const [variant, label, text, swap] of agrees) {
		items.push({
			id: JSON.stringify([AGREE_HEAD, topic, after, variant]),
			head: AGREE_HEAD,
			variant,
			label,
			topic,
			after,
			events: [],
			swap: swap === undefined ? undefined : `${swap.from} -> ${swap.to}`,
			support: { candidate: text, sources },
			state: buildAgreeState({ prose: text }, sources),
			question: AGREE_QUESTION,
		})
	}
	return items
}

function computeBalance(
	positives: readonly number[],
	negatives: readonly number[],
	cutoff: number,
): number {
	const recall =
		positives.length === 0
			? 0
			: positives.filter((noul) => noul >= cutoff).length / positives.length
	const rejection =
		negatives.length === 0 ? 0 : negatives.filter((noul) => noul < cutoff).length / negatives.length
	return (recall + rejection) / 2
}

/**
 * Fits one cutoff from the answers on its positive and negative items.
 *
 * @param positives - The noul answers of the items that must read yes
 * @param negatives - The noul answers of the items that must read no
 * @returns The lowest cutoff from 0.51 to 1 in steps of 0.01 that gives no yes on the negatives, with `separated` true; when no such cutoff exists, or either list is empty, the cutoff with the best balanced accuracy (the lowest one on a tie) and `separated` false
 * @remarks A yes is an answer at or above the cutoff, the reading `Aggregator` applies.
 */
export function fitCutoff(
	positives: readonly number[],
	negatives: readonly number[],
): CalibrateCutoff {
	const lowest = GRID.find((cutoff) => negatives.every((noul) => noul < cutoff))
	if (lowest !== undefined && positives.length > 0 && negatives.length > 0)
		return { cutoff: lowest, separated: true }
	let best = GRID[0] ?? 1
	let score = -1
	for (const cutoff of GRID) {
		const balance = computeBalance(positives, negatives, cutoff)
		if (balance > score) {
			best = cutoff
			score = balance
		}
	}
	return { cutoff: best, separated: false }
}

/**
 * Tallies one head's items at its fitted cutoff.
 *
 * @param asked - The items of the head with their outcomes
 * @param cutoff - The fitted cutoff
 * @param separated - Whether the fit separated the negatives
 * @returns The positives and negatives answered, the items refused and failed, the answers from the cache, the positives at or above the cutoff, and the negatives at or above it
 */
export function countTally(
	asked: readonly CalibrateAsked[],
	cutoff: number,
	separated: boolean,
): CalibrateTally {
	const answered = asked.filter((one) => one.noul !== undefined)
	const yes = (one: CalibrateAsked): boolean => one.noul !== undefined && one.noul >= cutoff
	return {
		positives: answered.filter((one) => one.item.label).length,
		negatives: answered.filter((one) => !one.item.label).length,
		refused: asked.filter((one) => one.outcome === 'refused').length,
		failed: asked.filter((one) => one.outcome === 'failed').length,
		cached: answered.filter((one) => one.cached).length,
		recalled: answered.filter((one) => one.item.label && yes(one)).length,
		leaked: answered.filter((one) => !one.item.label && yes(one)).length,
		separated,
	}
}

function collectNouls(
	asked: readonly CalibrateAsked[],
	head: CalibrateHead,
	label: boolean,
): readonly number[] {
	return asked.flatMap((one) =>
		one.item.head === head && one.item.label === label && one.noul !== undefined ? [one.noul] : [],
	)
}

/**
 * Fits both cutoffs from the asked items.
 *
 * @param asked - Every asked item
 * @param counts - The summary counts of the run
 * @returns The CHANGE and AGREE cutoffs, the combined `separated` flag, and the counts
 */
export function fitAsked(
	asked: readonly CalibrateAsked[],
	counts: CalibrateCounts['summaries'],
): CalibrateFit {
	const change = fitCutoff(
		collectNouls(asked, CHANGE_HEAD, true),
		collectNouls(asked, CHANGE_HEAD, false),
	)
	const agree = fitCutoff(
		collectNouls(asked, AGREE_HEAD, true),
		collectNouls(asked, AGREE_HEAD, false),
	)
	const support = asked.filter((one) => one.item.head === AGREE_HEAD)
	const complete =
		support.length > 0 &&
		support.every(
			(one) =>
				one.support !== undefined &&
				one.item.support !== undefined &&
				one.support.candidate === one.item.support.candidate &&
				JSON.stringify(one.support.sources) === JSON.stringify(one.item.support.sources) &&
				reduceSupport(one.support) !== undefined &&
				reduceSupport(one.support) === one.noul,
		)
	const positives = support.filter((one) => one.item.label)
	const admitted = positives.filter(
		(one) => one.noul !== undefined && one.noul >= agree.cutoff,
	).length
	const qualified =
		agree.separated && complete && positives.length > 0 && admitted / positives.length >= 0.5
	return {
		change: change.cutoff,
		agree: agree.cutoff,
		separated: change.separated && qualified,
		counts: {
			summaries: counts,
			change: countTally(
				asked.filter((one) => one.item.head === CHANGE_HEAD),
				change.cutoff,
				change.separated,
			),
			agree: countTally(
				asked.filter((one) => one.item.head === AGREE_HEAD),
				agree.cutoff,
				qualified,
			),
		},
	}
}

/**
 * Fits the CHANGE and AGREE cutoffs from seed truth.
 *
 * @example
 * ```ts
 * const outcome = parseFlags(['--cache', 'tmp/l5/cache', '--model', 'qwen3.5:2b-q4_K_M', '--out', 'tmp/l5/calibrate'])
 * if (outcome.success) process.exitCode = await new Calibrator(outcome.value).execute()
 * ```
 */
export class Calibrator {
	readonly #config: CalibrateConfig
	readonly #abort = new AbortController()

	/**
	 * Holds the flags of one invocation.
	 * @param config - The parsed flags, the scenario path, and the settings path
	 */
	constructor(config: CalibrateConfig) {
		this.#config = config
	}

	/**
	 * Builds the labelled items, asks each through the judge cache, fits both cutoffs, and writes `items.jsonl` and `fit.json`.
	 * @returns 0 after the files are written
	 * @remarks Thrown when the scenario or the settings are invalid, when an offline run misses the summary or judge cache, or when a live miss fails every retry.
	 */
	async execute(): Promise<number> {
		const { out } = this.#config
		const scenario = readScenario(readJSON(this.#config.scenario))
		const settings = readSettings(this.#config.settings, this.#config.key)
		const cache = this.#createCache(settings)
		const summarizer = this.#createSummarizer(settings)
		mkdirSync(out, { recursive: true })
		writeFileSync(join(out, FILES.items), '')
		const random = createRandom(RANDOM_SEED)
		const asked: CalibrateAsked[] = []
		const seen = new Set<string>()
		const counts = { asked: 0, passed: 0, failed: 0 }
		for (const point of scenario.points) {
			for (const topic of scenario.topics) {
				const selection = selectSources(scenario.messages, topic.name, point)
				if (selection.live.length === 0) continue
				counts.asked += 1
				const summary = await this.#summarize(
					summarizer,
					scenario,
					topic.name,
					point,
					selection,
					settings,
				)
				if (summary === undefined) {
					counts.failed += 1
					continue
				}
				counts.passed += 1
				for (const item of buildItems(summary, scenario, random)) {
					const key = JSON.stringify([item.head, item.label, item.state])
					if (seen.has(key)) continue
					seen.add(key)
					const one = await this.#ask(cache, item)
					asked.push(one)
					appendFileSync(
						join(out, FILES.items),
						`${JSON.stringify({ ...item, bundle: one.support, noul: one.noul, outcome: one.outcome, cached: one.cached, wall: one.wall })}\n`,
					)
				}
			}
		}
		const fit = fitAsked(asked, counts)
		writeFileSync(join(out, FILES.fit), `${JSON.stringify(fit, null, 2)}\n`)
		this.#print(fit)
		return 0
	}

	// Without `--live` no request leaves the process, so a cache miss surfaces as an error.
	#fetch(input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> {
		return this.#config.live ? fetch(input, init) : Promise.reject(new Error(OFFLINE))
	}

	#createSummarizer(settings: Settings): SummarizerInterface {
		const { url, model, cache, live } = this.#config
		const provider = createOllama({
			url,
			model,
			think: false,
			keepAlive: '30m',
			timeout: TIMEOUT,
			options: { ...SAMPLER, num_predict: settings.predict },
			fetch: (input: Parameters<typeof fetch>[0], init?: RequestInit) => this.#fetch(input, init),
		})
		return new Summarizer({
			provider,
			model,
			sampler: SAMPLER,
			predict: settings.predict,
			cache: join(cache, FILES.summary),
			live,
		})
	}

	// Builds the judge cache over the shared rows file; without `--live` the inner judge cannot reach the network.
	#createCache(settings: Settings): JudgeCache {
		const { url, cache, live } = this.#config
		const judge: JudgeInterface = createOllamaJudge({
			url,
			model: MICA_MODEL,
			system: MICA_SYSTEM,
			calibration: { temperature: MICA_CALIBRATION },
			options: { num_ctx: MICA_CONTEXT },
			keepAlive: '5m',
			timeout: TIMEOUT,
			fetch: (input: Parameters<typeof fetch>[0], init?: RequestInit) => this.#fetch(input, init),
		})
		return new JudgeCache({
			judge,
			path: join(cache, FILES.judge),
			live,
			retry: settings.retry,
			abort: (fault) => this.#abort.abort(fault),
		})
	}

	// Summarizes the selection as the aggregator does: a failed code check builds again with a note, up to the retry bound.
	async #summarize(
		summarizer: SummarizerInterface,
		scenario: CalibrateScenario,
		topic: string,
		point: number,
		selection: CalibrateSelection,
		settings: Settings,
	): Promise<CalibrateSummary | undefined> {
		const asOf = findDay(scenario.days, point)?.date ?? ''
		const sources = selection.live.flatMap((message) => buildSources(message, scenario.days))
		const stale = collectStaleTokens(
			selection.stale.map((message) => message.content),
			[],
			sources.map((source) => source.text),
		)
		let failures: ReturnType<typeof checkProse> = []
		for (let attempt = 0; attempt <= Math.max(0, settings.retry); attempt += 1) {
			const messages: readonly Message[] = buildSummaryPrompt(topic, topic, asOf, sources, failures)
			const result = await summarizer.summarize(messages, this.#abort.signal)
			failures = checkProse(result.prose, [...sources.map(renderSource), topic, asOf], [], stale)
			if (failures.length === 0) {
				return {
					topic,
					after: point,
					asOf,
					prose: result.prose,
					sources,
					live: selection.live.map((message) => message.index),
					stale: selection.stale.map((message) => message.index),
				}
			}
		}
		return undefined
	}

	async #ask(cache: JudgeCache, item: CalibrateItem): Promise<CalibrateAsked> {
		if (item.head === AGREE_HEAD) {
			if (item.support === undefined)
				throw new Error('complete contextual calibration input required')
			const support = await new Support({ judge: cache }).evaluate(
				item.support.candidate,
				item.support.sources,
				this.#abort.signal,
			)
			const noul = reduceSupport(support)
			return {
				item,
				support,
				noul,
				outcome: noul === undefined ? 'failed' : 'answered',
				cached:
					support.components.length > 0 &&
					support.components.every((component) => component.cached),
				wall: support.wall,
			}
		}
		const head = extractHead(item.id)
		const before = cache.stats().hits[head] ?? 0
		const started = performance.now()
		try {
			const result = await cache.ask(
				{ state: item.state, questions: { [item.id]: item.question } },
				this.#abort.signal,
			)
			const answer = result.answers[item.id]
			const wall = performance.now() - started
			const cached = (cache.stats().hits[head] ?? 0) > before
			if (answer === undefined) return { item, noul: undefined, outcome: 'refused', cached, wall }
			return answer.form === 'noul'
				? { item, noul: answer.noul, outcome: 'answered', cached, wall }
				: { item, noul: undefined, outcome: 'failed', cached, wall }
		} catch (error) {
			if (cache.fault !== undefined) throw cache.fault
			if (!matchesDeterministic(error)) throw error
			return {
				item,
				noul: undefined,
				outcome: 'failed',
				cached: (cache.stats().hits[head] ?? 0) > before,
				wall: performance.now() - started,
			}
		}
	}

	#print(fit: CalibrateFit): void {
		const { summaries, change, agree } = fit.counts
		console.log(
			`calibrate ${this.#config.model}: summaries ${summaries.passed}/${summaries.asked} passed, ${summaries.failed} failed`,
		)
		for (const [head, tally, cutoff] of [
			['change', change, fit.change],
			['agree', agree, fit.agree],
		] as const) {
			console.log(
				`${head} cutoff ${cutoff} separated ${tally.separated}: positives ${tally.positives} (at cutoff ${tally.recalled}), negatives ${tally.negatives} (at cutoff ${tally.leaked}), refused ${tally.refused}, failed ${tally.failed}`,
			)
		}
		console.log(`separated ${fit.separated}; wrote ${join(this.#config.out, FILES.fit)}`)
	}
}

if (import.meta.main) {
	const outcome = parseFlags(process.argv.slice(2))
	if (outcome.success) {
		try {
			process.exitCode = await new Calibrator(outcome.value).execute()
		} catch (error) {
			process.stderr.write(`${describeError(error)}\n`)
			process.exitCode = 1
		}
	} else {
		process.stderr.write(`${outcome.error}\n`)
		process.exitCode = 64
	}
}
