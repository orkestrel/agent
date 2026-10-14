import type { JudgeQuestion, Message, MessageRole } from '../vendor/agent-0.0.30-trimmed/index.js'
import type { TokenUsage } from '@orkestrel/budget'
import type {
	AssignCategory,
	AssignMessage,
	AssignResult,
	CacheRow,
	CopyGoal,
	CorpusQuery,
	CorpusRow,
	JudgeState,
	LookupReading,
	QuestionSet,
	ScenarioDay,
	ScenarioLookup,
	ScenarioLookups,
	ScenarioSystem,
	ScoreCarriers,
	StateMessage,
	SummarizerOptions,
	SummaryRow,
	TopicSpec,
	WireReading,
	WireRun,
} from './types.js'
import { isFiniteNumber, isRecord } from '@orkestrel/contract'
import { compileRules, plainText, scoreText } from '../bench/rescore.mjs'
import { INSTRUCTION_SUMMARIES, SUMMARIES_HEADING } from './aggregates/constants.js'
import { collectSummaryBodies, countSoleTokens } from './aggregates/helpers.js'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
// The vendored build is the one import of the agent in bench5; repoint this path when a later build is vendored.
import {
	DETERMINISTIC_JUDGE_ERROR,
	LEDGER_CATEGORIES,
	LEDGER_QUESTIONS,
	MESSAGE_ROLES,
} from '../vendor/agent-0.0.30-trimmed/index.js'
import {
	COMPLETION_LIMIT,
	SAMPLER,
	CORPUS_FIELD_TYPES,
	JUDGE_HEAD_OTHER,
	LOOKUP_ORDER_ID,
	LOOKUP_OWNER_PATTERNS,
	SYSTEM_HANDLE_SENTENCE,
	SYSTEM_PIN_SENTENCE,
	SYSTEM_REPLACEMENTS,
} from './constants.js'

/** Reads scored and forbidden phrases actually present, preserving the scorer's normalization.
 * @param goal - The accepted goal rules
 * @param text - The exact rendered or wire text
 * @returns Positive and stale carriers, excluding zero-width absence predicates
 */
export function readScoreCarriers(goal: CopyGoal, text: string): ScoreCarriers {
	const scored: unknown = scoreText(compileRules(goal), text)
	if (
		!isRecord(scored) ||
		!Array.isArray(scored.missing) ||
		!Array.isArray(scored.violations) ||
		!Array.isArray(scored.patterns) ||
		![...scored.missing, ...scored.violations, ...scored.patterns].every(
			(value: unknown) => typeof value === 'string',
		)
	)
		throw new Error('invalid score carrier reading')
	const missing = new Set(scored.missing)
	const expected = goal.expected.filter((phrase) => !missing.has(phrase))
	const choice = `any of ${goal.expectedAny.join('/')}`
	if (goal.expectedAny.length > 0 && !missing.has(choice)) expected.push(choice)
	const plain = plainText(text)
	const patterns = scored.patterns.filter(
		(source: unknown): source is string =>
			typeof source === 'string' &&
			[...plain.matchAll(new RegExp(source, 'gi'))].some((match) => match[0].length > 0),
	)
	return {
		expected,
		stale: [
			...scored.violations.filter((value: unknown): value is string => typeof value === 'string'),
			...patterns,
		],
	}
}

/**
 * Reads terminal usage and request content from recorded Ollama wire envelopes.
 * @param request - The recorder's request envelope
 * @param response - The recorder's response envelope
 * @returns The available evidence; malformed or missing usage remains absent
 */
export function readWireReading(request: unknown, response: unknown): WireReading {
	let terminal: Readonly<Record<string, unknown>> | undefined
	let malformed = false
	if (isRecord(response) && typeof response.text === 'string') {
		for (const line of response.text.split(/\r\n|\n/)) {
			if (line.trim() === '') continue
			try {
				const value: unknown = JSON.parse(line)
				if (!isRecord(value)) malformed = true
				else if (value.done === true) terminal = value
			} catch {
				malformed = true
			}
		}
	}
	const prompt = terminal?.prompt_eval_count
	const completion = terminal?.eval_count
	const body = isRecord(request) && isRecord(request.body) ? request.body : undefined
	return {
		prompt:
			isFiniteNumber(prompt) && Number.isSafeInteger(prompt) && prompt >= 0 ? prompt : undefined,
		completion:
			isFiniteNumber(completion) && Number.isSafeInteger(completion) && completion >= 0
				? completion
				: undefined,
		reason: typeof terminal?.done_reason === 'string' ? terminal.done_reason : undefined,
		complete: terminal !== undefined && !malformed,
		messages: Array.isArray(body?.messages)
			? body.messages.flatMap((message: unknown) =>
					isRecord(message) &&
					typeof message.role === 'string' &&
					typeof message.content === 'string'
						? [{ role: message.role, content: message.content }]
						: [],
				)
			: [],
	}
}

/**
 * Lists violations of the per-completion usage boundary.
 * @param reading - The recorded request and terminal response evidence
 * @returns Missing or malformed evidence, excessive completion, length termination, and context exhaustion
 */
export function listUsageFailures(reading: WireReading | undefined): readonly string[] {
	if (reading === undefined) return ['missing wire usage']
	const { prompt, completion, reason, complete } = reading
	return [
		...(!complete || prompt === undefined || completion === undefined
			? ['missing or malformed wire usage']
			: []),
		...(completion !== undefined && completion > COMPLETION_LIMIT
			? [`completion ${completion} exceeds ${COMPLETION_LIMIT}`]
			: []),
		...(reason === 'length' ? ['length-limited completion'] : []),
		...(prompt !== undefined && completion !== undefined && prompt + completion >= SAMPLER.num_ctx
			? [`prompt plus completion ${prompt + completion} reaches ${SAMPLER.num_ctx}`]
			: []),
	]
}

/**
 * Reads one JSON file.
 *
 * @param path - The file to read
 * @returns The parsed value; the caller narrows it
 */
export function readJSON(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'))
}

/**
 * Reads a JSON Lines file, skipping blank lines.
 *
 * @param path - The file to read
 * @returns The parsed rows in file order; the caller narrows each
 */
export function readRows(path: string): readonly unknown[] {
	return readFileSync(path, 'utf8')
		.split(/\r\n|\n/)
		.filter((line) => line.trim() !== '')
		.map((line) => JSON.parse(line))
}

/**
 * Computes the SHA-256 of a string, or of the JSON text of any other value.
 *
 * @param value - The text or value to digest
 * @returns The lowercase hexadecimal digest
 */
export function computeDigest(value: unknown): string {
	return createHash('sha256')
		.update(typeof value === 'string' ? value : JSON.stringify(value))
		.digest('hex')
}

/**
 * Describes an error and its causes on one line.
 *
 * @param error - The thrown value
 * @returns Each cause as `name: message`, joined by an arrow, outermost first
 */
export function describeError(error: unknown): string {
	const messages: string[] = []
	const seen = new Set<unknown>()
	let current: unknown = error
	while (current !== undefined && !seen.has(current)) {
		seen.add(current)
		messages.push(
			current instanceof Error ? `${current.name}: ${current.message}` : String(current),
		)
		current = current instanceof Error ? current.cause : undefined
	}
	return messages.join(' <- ')
}

/**
 * Checks whether an error is the judge fault that repeats for the same question.
 *
 * @param error - The thrown value
 * @returns True if the error chain matches the ledger's deterministic judge error; false otherwise.
 */
export function matchesDeterministic(error: unknown): boolean {
	return DETERMINISTIC_JUDGE_ERROR.test(describeError(error))
}

/**
 * Builds the agent's system text for the ledger arm, with no date line.
 *
 * @param scenario - A copy that carries `ledger.system`
 * @returns The system text with the full-view protocol removed and the handle sentence appended
 */
export function buildSystem(scenario: ScenarioSystem): string {
	let text = scenario.ledger.system
	for (const { from, to } of SYSTEM_REPLACEMENTS) text = text.replace(from, to)
	return `${text.replace(SYSTEM_PIN_SENTENCE, '')}${SYSTEM_HANDLE_SENTENCE}`
}

/**
 * Renders the date instruction.
 *
 * @param date - The date as `YYYY-MM-DD`
 * @returns `Today is WEEKDAY DATE.`, with the weekday computed in UTC
 */
export function renderDate(date: string): string {
	const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(
		new Date(`${date}T00:00:00Z`),
	)
	return `Today is ${weekday} ${date}.`
}

/**
 * Finds the day that a seed index falls in.
 *
 * @param days - The scenario's days
 * @param index - The seed index
 * @returns The day with the greatest `from` that is at most the index, or `undefined` before the first day
 */
export function findDay(days: readonly ScenarioDay[], index: number): ScenarioDay | undefined {
	let found: ScenarioDay | undefined
	for (const day of days) {
		if (day.from <= index && (found === undefined || day.from > found.from)) found = day
	}
	return found
}

/**
 * Reads the ids and owners that a lookup result names.
 *
 * @param args - The lookup call's arguments
 * @param text - The lookup result text
 * @returns The ids and owner names, or `undefined` when the result reports no record
 */
export function readLookup(
	args: Readonly<Record<string, unknown>>,
	text: string,
): LookupReading | undefined {
	if (/^no record\b/i.test(text)) return undefined
	const ids = new Set<string>()
	const argument = String(args['id'] ?? args['account'] ?? '')
		.trim()
		.toUpperCase()
	if (argument !== '') ids.add(argument)
	for (const match of text.matchAll(LOOKUP_ORDER_ID)) {
		const id = match[1]
		if (id !== undefined) ids.add(id.toUpperCase())
	}
	const owners = new Map<string, string[]>()
	for (const pattern of LOOKUP_OWNER_PATTERNS) {
		for (const match of text.matchAll(pattern)) {
			const id = match[1]
			const name = match[2]
			if (id === undefined || name === undefined || !/\p{L}/u.test(name)) continue
			const names = owners.get(id.toUpperCase()) ?? []
			if (!names.includes(name.trim())) names.push(name.trim())
			owners.set(id.toUpperCase(), names)
		}
	}
	return { ids: [...ids], owners: [...owners].map(([id, names]) => ({ id, names })) }
}

/**
 * Resolves what a lookup tool returns after the seed has reached a position.
 *
 * @param scenario - The copy's lookup tables
 * @param name - The tool name
 * @param id - The looked-up id; trimmed and uppercased
 * @param position - The index of the last seed message added
 * @returns The versioned text with the greatest `from` that is at most the position, else the base text, else `no record for ID`
 */
export function resolveLookup(
	scenario: ScenarioLookups,
	name: string,
	id: string,
	position: number,
): string {
	const key = id.trim().toUpperCase()
	let latest: ScenarioLookup | undefined
	for (const entry of scenario.lookups) {
		if (entry.tool !== name || entry.id.toUpperCase() !== key || entry.from > position) continue
		if (latest === undefined || entry.from >= latest.from) latest = entry
	}
	return latest?.text ?? scenario.tools[name]?.[key] ?? `no record for ${key || 'an empty id'}`
}

/**
 * Builds the content key of one judge question.
 *
 * @param model - The judge model identity
 * @param state - The state the question reads
 * @param question - The question
 * @returns The SHA-256 of the JSON text of the three, in that order
 */
export function buildCacheKey(
	model: string,
	state: JudgeState,
	question: JudgeQuestion,
	context?: string,
): string {
	return computeDigest(
		context === undefined ? [model, state, question] : [model, state, question, context],
	)
}

/**
 * Extracts the head of a judgment key.
 *
 * @param id - The question id, a JSON array such as `["topic","ID","NAME"]`
 * @returns The array's first element when it is a string, else `other`
 */
export function extractHead(id: string): string {
	try {
		const key: unknown = JSON.parse(id)
		const head: unknown = Array.isArray(key) ? key[0] : undefined
		return typeof head === 'string' ? head : JUDGE_HEAD_OTHER
	} catch {
		return JUDGE_HEAD_OTHER
	}
}

/**
 * Renders a message as the ledger's classifier states it.
 *
 * @param message - The message
 * @returns `ROLE: CONTENT`
 */
export function renderMessageState(message: StateMessage): string {
	return `${message.role}: ${message.content}`
}

/**
 * Renders two messages as the classifier states a pair.
 *
 * @param earlier - The earlier message
 * @param later - The later message
 * @returns The two states under `Earlier message:` and `Later message:` lines
 */
export function renderPairState(earlier: StateMessage, later: StateMessage): string {
	return `Earlier message: ${renderMessageState(earlier)}\nLater message: ${renderMessageState(later)}`
}

/**
 * Builds the category question in the order the classifier asks it.
 *
 * @param questions - The ledger's questions
 * @returns The choice question with its criteria in `LEDGER_CATEGORIES` order
 */
export function buildCategoryQuestion(questions: QuestionSet): JudgeQuestion {
	return {
		form: 'choice',
		...(questions.category.instructions === undefined
			? {}
			: { instructions: questions.category.instructions }),
		criteria: Object.fromEntries(
			LEDGER_CATEGORIES.map((category: string) => [
				category,
				questions.category.criteria[category],
			]),
		),
	}
}

/**
 * Builds the question that asks whether a message concerns a desk topic.
 *
 * @param topic - The topic and its criterion
 * @param questions - The ledger's questions
 * @returns The noul question the classifier asks for the topic
 */
export function buildTopicQuestion(topic: TopicSpec, questions: QuestionSet): JudgeQuestion {
	return {
		form: 'noul',
		instructions: questions.topic,
		criteria: {
			true: `The message concerns ${topic.name}: ${topic.criterion}`,
			false: `The message does not concern ${topic.name}`,
		},
	}
}

/**
 * Checks whether a value is a corpus row with the field types the importer reads.
 *
 * @param value - The parsed row
 * @returns True if `question` is a string and every present field has its expected type; false otherwise.
 */
export function isCorpusRow(value: unknown): value is CorpusRow {
	if (typeof value !== 'object' || value === null) return false
	if (typeof Reflect.get(value, 'question') !== 'string') return false
	const probabilities: unknown = Reflect.get(value, 'probabilities')
	if (probabilities !== undefined && (typeof probabilities !== 'object' || probabilities === null))
		return false
	return Object.entries(CORPUS_FIELD_TYPES).every(([key, type]) => {
		const field: unknown = Reflect.get(value, key)
		return field === undefined || typeof field === type
	})
}

/**
 * Checks whether a value is a cache row that can answer a question.
 *
 * @param value - The parsed row
 * @returns True if the row carries its key fields and one of an answer, a refusal, or an error; false otherwise.
 */
export function isCacheRow(value: unknown): value is CacheRow {
	if (typeof value !== 'object' || value === null) return false
	const state: unknown = Reflect.get(value, 'state')
	const question: unknown = Reflect.get(value, 'question')
	const origin: unknown = Reflect.get(value, 'origin')
	const outcomes = ['answer', 'refusal'].filter((key) => {
		const outcome: unknown = Reflect.get(value, key)
		return typeof outcome === 'object' && outcome !== null
	})
	const error: unknown = Reflect.get(value, 'error')
	return (
		typeof Reflect.get(value, 'key') === 'string' &&
		(Reflect.get(value, 'context') === undefined ||
			typeof Reflect.get(value, 'context') === 'string') &&
		typeof Reflect.get(value, 'model') === 'string' &&
		state !== undefined &&
		state !== null &&
		typeof question === 'object' &&
		question !== null &&
		typeof Reflect.get(value, 'wall') === 'number' &&
		typeof Reflect.get(value, 'at') === 'number' &&
		(origin === 'corpus' || origin === 'live') &&
		(outcomes.length === 1
			? error === undefined
			: outcomes.length === 0 && typeof error === 'string')
	)
}

/**
 * Rebuilds the state and question that a corpus row's judgment was asked under.
 *
 * @param row - The corpus row
 * @param seed - The seed messages the row's indices point into
 * @param topics - The desk topics
 * @returns The state and question, or `undefined` for a reversed category row, a missing message or topic, or a row whose recorded question differs from the rebuilt one
 */
export function buildCorpusQuery(
	row: CorpusRow,
	seed: readonly StateMessage[],
	topics: readonly TopicSpec[],
): CorpusQuery | undefined {
	const questions: QuestionSet = LEDGER_QUESTIONS
	const message = row.index === undefined ? undefined : seed[row.index]
	const earlier = row.earlier === undefined ? undefined : seed[row.earlier]
	const later = row.later === undefined ? undefined : seed[row.later]
	let query: CorpusQuery | undefined
	if (row.question === 'category' && row.order === 'forward' && message !== undefined) {
		query = { state: renderMessageState(message), question: buildCategoryQuestion(questions) }
	} else if (row.question === 'topic' && message !== undefined) {
		const topic = topics.find((one) => one.name === row.topic)
		if (topic !== undefined)
			query = { state: renderMessageState(message), question: buildTopicQuestion(topic, questions) }
	} else if (
		(row.question === 'amends' || row.question === 'supersedes') &&
		earlier !== undefined &&
		later !== undefined
	) {
		query = { state: renderPairState(earlier, later), question: questions[row.question] }
	}
	if (query === undefined) return undefined
	return row.asked === undefined || row.asked === JSON.stringify(query.question) ? query : undefined
}

/**
 * Imports the recorded judgments of the corpus as cache rows.
 *
 * @param rows - The parsed rows of the corpus file
 * @param seed - The long scenario's seed messages
 * @param topics - The desk topics
 * @param model - The judge model identity that the rows are keyed under
 * @returns One corpus row per forward category, topic, amends, and supersedes judgment that rebuilds to its recorded question, and one error row per deterministic judge error; every other row is skipped
 */
export function importCorpus(
	rows: readonly unknown[],
	seed: readonly StateMessage[],
	topics: readonly TopicSpec[],
	model: string,
): readonly CacheRow[] {
	const imported: CacheRow[] = []
	for (const row of rows) {
		if (!isCorpusRow(row)) continue
		const query = buildCorpusQuery(row, seed, topics)
		if (query === undefined) continue
		const base = {
			key: buildCacheKey(model, query.state, query.question),
			model,
			state: query.state,
			question: query.question,
			wall: row.ms ?? 0,
			origin: 'corpus' as const,
			// The corpus records no time of its own.
			at: 0,
		}
		if (row.error !== undefined) {
			if (DETERMINISTIC_JUDGE_ERROR.test(row.error)) imported.push({ ...base, error: row.error })
		} else if (row.probabilities !== undefined) {
			imported.push({ ...base, answer: { form: 'choice', probabilities: row.probabilities } })
		} else if (row.p !== undefined) {
			imported.push({ ...base, answer: { form: 'noul', noul: row.p } })
		}
	}
	return imported
}

/**
 * Files a message the way the ledger assigns it without asking the judge.
 *
 * @param message - The message to file
 * @param messages - The conversation in order
 * @param requests - The ids of the user messages that are requests
 * @param annotations - The ids of the ledger's own cue and digest messages
 * @param results - The tool outcome recorded for each tool message id
 * @returns `chatter` for an annotation, a failed tool result, an assistant call, and an assistant message after the first request; `fact` for any other tool result; `undefined` when the judge must decide
 */
export function assignCategory(
	message: AssignMessage,
	messages: ReadonlyArray<{ readonly id: string }>,
	requests: ReadonlySet<string>,
	annotations: ReadonlySet<string>,
	results: ReadonlyMap<string, AssignResult>,
): AssignCategory | undefined {
	if (annotations.has(message.id)) return 'chatter'
	if (message.role === 'tool')
		return results.get(message.id)?.success === false ? 'chatter' : 'fact'
	if (message.role !== 'assistant') return undefined
	if ((message.calls?.length ?? 0) > 0) return 'chatter'
	const first = messages.findIndex((one) => requests.has(one.id))
	return first >= 0 && messages.findIndex((one) => one.id === message.id) > first
		? 'chatter'
		: undefined
}

/**
 * Checks whether a value is a message role of the vendored build.
 *
 * @param value - The parsed value
 * @returns True if the value is one of the build's `MESSAGE_ROLES`; false otherwise.
 */
export function isMessageRole(value: unknown): value is MessageRole {
	return MESSAGE_ROLES.some((role) => role === value)
}

/**
 * Builds the content key of one summary call.
 *
 * @param options - The summarizer's options, whose model, sampler, and generation cap the key records
 * @param messages - The system and user messages of the summary prompt
 * @returns The SHA-256 of the JSON text of the model, sampler, cap, and the role and content of each message
 */
export function buildSummaryKey(
	options: Pick<SummarizerOptions, 'model' | 'sampler' | 'predict'>,
	messages: readonly Message[],
): string {
	return computeDigest([
		options.model,
		options.sampler,
		options.predict,
		messages.map((message) => [message.role, message.content]),
	])
}

/**
 * Checks whether a value is a token usage.
 *
 * @param value - The parsed value
 * @returns True if `prompt`, `completion`, and `total` are numbers; false otherwise.
 */
export function isUsage(value: unknown): value is TokenUsage {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof Reflect.get(value, 'prompt') === 'number' &&
		typeof Reflect.get(value, 'completion') === 'number' &&
		typeof Reflect.get(value, 'total') === 'number'
	)
}

/**
 * Checks whether a value is a summary row that can answer a call.
 *
 * @param value - The parsed row
 * @returns True if the row carries its key, prose, raw output, wall time, time, and origin, and a usage when present; false otherwise.
 */
export function isSummaryRow(value: unknown): value is SummaryRow {
	if (typeof value !== 'object' || value === null) return false
	const usage: unknown = Reflect.get(value, 'usage')
	const origin: unknown = Reflect.get(value, 'origin')
	return (
		typeof Reflect.get(value, 'key') === 'string' &&
		typeof Reflect.get(value, 'prose') === 'string' &&
		typeof Reflect.get(value, 'raw') === 'string' &&
		typeof Reflect.get(value, 'wall') === 'number' &&
		typeof Reflect.get(value, 'at') === 'number' &&
		(origin === 'corpus' || origin === 'live') &&
		(usage === undefined || isUsage(usage))
	)
}

/**
 * Checks whether the system messages contain exactly one matching recorded summaries block.
 * @param summary - The summaries instruction recorded for the selection
 * @param messages - The actual request messages
 * @returns True if only the recorded block is present; false if it is absent, repeated, or accompanied by another block
 */
export function matchesSummaryBlock(summary: string, messages: WireReading['messages']): boolean {
	const system = messages
		.filter((message) => message.role === 'system')
		.map((message) => message.content)
	return (
		summary.startsWith(SUMMARIES_HEADING) &&
		system.some((text) => text.includes(summary)) &&
		system.reduce((count, text) => count + text.split(SUMMARIES_HEADING).length - 1, 0) === 1
	)
}

/**
 * Checks whether a goal sent a recorded nonempty topic body to the provider.
 * @param run - The run evidence
 * @param goal - The served goal
 * @returns True if a request carries the recorded topic body; false otherwise
 */
export function matchesExposure(run: WireRun, goal: string): boolean {
	return run.calls.some((call) => {
		if (call.role !== 'agent' || call.goal !== goal) return false
		const pick = run.picks.findLast((one) => one.goal === goal && one.sequence < call.sequence)
		const summary = pick?.instructions[INSTRUCTION_SUMMARIES.name] ?? ''
		return (
			collectSummaryBodies(summary).length > 0 &&
			matchesSummaryBlock(summary, run.wire.get(call.sequence)?.messages ?? [])
		)
	})
}

/**
 * Lists missing usage, completion-limit failures, and stale or sole-token request content.
 * @param run - The run evidence
 * @returns The per-request failures, including tool continuations and answer passes
 */
export function listWireFailures(run: WireRun): readonly string[] {
	return run.calls
		.filter((call) => call.role === 'agent')
		.flatMap((call) => {
			const reading = run.wire.get(call.sequence)
			const failures = [...listUsageFailures(reading)]
			if (reading === undefined || reading.messages.length === 0)
				failures.push('missing wire request')
			const pick = run.picks.findLast(
				(one) => one.goal === call.goal && one.sequence < call.sequence,
			)
			const summary = pick?.instructions[INSTRUCTION_SUMMARIES.name] ?? ''
			const system =
				reading?.messages
					.filter((message) => message.role === 'system')
					.map((message) => message.content)
					.join('\n') ?? ''
			const matched = matchesSummaryBlock(summary, reading?.messages ?? [])
			if (system.includes(SUMMARIES_HEADING) && !matched)
				failures.push('unrecorded or stale summaries block')
			if (collectSummaryBodies(summary).length > 0 && matched) {
				const shown =
					reading?.messages
						.map((message) =>
							message.role === 'system' ? message.content.replace(summary, '') : message.content,
						)
						.join('\n') ?? ''
				const sole = countSoleTokens(collectSummaryBodies(summary).join('\n'), shown)
				if (sole > 0) failures.push(`${sole} sole-carried tokens on the actual request`)
			}
			return failures.map(
				(failure) =>
					`${run.info.arm} ${call.goal ?? 'calibration'} request ${call.sequence}: ${failure}`,
			)
		})
}
