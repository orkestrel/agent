import type {
	JudgeAnswer,
	JudgeQuestion,
	Judgment,
	LiteralSet,
	Message,
	ThinkingReplay,
} from './types.js'
import type { TokenUsage } from '@orkestrel/budget'
import type { AuditFault, JSONSchema } from '@orkestrel/contract'
import { describeFaults } from '@orkestrel/tool'
import { attempt, isArray, isFiniteNumber, isRecord, isString, preview } from '@orkestrel/contract'

/**
 * Filters a list of members by a {@link import('./contexts/index.js').ScopeInterface} allow-list of keys —
 * `undefined` passes everything, `[]` passes nothing, and a non-empty list passes the listed keys
 * alone, order preserved. The pure, total set-membership primitive the context's build step and
 * the agent loop's tool-advertise step apply a scope through.
 *
 * @remarks
 * Varies by the allow-list's shape, so a `Scope` category expresses "all /
 * none / only these":
 * - `undefined` ⇒ no constraint — every member passes (returned unchanged).
 * - `[]` (empty) ⇒ none pass (no key is in an empty set).
 * - a non-empty list ⇒ only members whose `key(member)` is in the list pass.
 *
 * Preserves the members' order. Keys are matched by a `Set` for membership.
 *
 * @typeParam T - The member type being filtered
 * @param allow - The allow-list of keys (`undefined` ⇒ all, `[]` ⇒ none, else only-listed)
 * @param members - The members to filter (returned unchanged when `allow` is `undefined`)
 * @param key - Extracts the key a member is matched on (for example an instruction's `name`)
 * @returns The members that pass the allow-list, in their original order
 *
 * @example
 * ```ts
 * const members = [{ name: 'refunds' }, { name: 'billing' }]
 * filterAllowList(undefined, members, (member) => member.name) // [{ name: 'refunds' }, { name: 'billing' }]
 * filterAllowList([], members, (member) => member.name) // []
 * filterAllowList(['billing'], members, (member) => member.name) // [{ name: 'billing' }]
 * ```
 */
export function filterAllowList<T>(
	allow: readonly string[] | undefined,
	members: readonly T[],
	key: (member: T) => string,
): readonly T[] {
	if (allow === undefined) return members
	if (allow.length === 0) return []
	const set = new Set(allow)
	return members.filter((member) => set.has(key(member)))
}

/**
 * Joins the reasoning a run's provider calls separated from the answer — the first call
 * seeds the accumulation, a later call appends blank-line separated so each turn's reasoning
 * stays readable.
 *
 * @remarks
 * Pure and total. `prior` is `undefined` until a call surfaces reasoning, so the first join
 * returns `next` verbatim. Each call's non-empty thinking is recorded on the assistant message
 * that call appends. The joined result also includes thinking from calls that appended no
 * message, such as an aborted call. Only recorded thinking can return to a provider,
 * as its `replay` policy allows. Thinking stays out of `content`.
 *
 * @param prior - The reasoning accumulated so far (`undefined` before the first)
 * @param next - This call's separated reasoning
 * @returns The joined reasoning
 *
 * @example
 * ```ts
 * joinThinking(undefined, 'first') // 'first'
 * joinThinking('', 'x') // 'x'
 * joinThinking('first', 'second') // 'first\n\nsecond'
 * ```
 */
export function joinThinking(prior: string | undefined, next: string): string {
	if (prior === undefined || prior.length === 0) return next
	return next.length === 0 ? prior : `${prior}\n\n${next}`
}

/**
 * Applies a {@link ThinkingReplay} policy to a conversation, returning the messages a provider
 * sends with only the assistant thinking the policy allows.
 *
 * @remarks
 * Pure and total. `'all'` returns the input array itself. `'none'` drops `thinking` from every
 * message that carries it. `'turn'` drops it from every message at or before the last `user`
 * message and keeps it after, the turn in progress; with no `user` message every message counts
 * as inside the turn. A message without `thinking`, or one that keeps it, is the same object;
 * a message that loses it is a copy without that member, so no `undefined` member is written.
 *
 * @param messages - The conversation to project (left unchanged)
 * @param replay - The policy naming which thinking stays
 * @returns The messages with the policy applied
 *
 * @example
 * ```ts
 * const messages = [
 * 	{ id: '1', role: 'user', content: 'Plan the trip' },
 * 	{ id: '2', role: 'assistant', content: 'Booked', thinking: 'Compare fares first' },
 * ]
 * stripThinking(messages, 'none') // [{ id: '1', ... }, { id: '2', role: 'assistant', content: 'Booked' }]
 * stripThinking(messages, 'turn') // the thinking on '2' stays: it follows the last user message
 * ```
 */
export function stripThinking(
	messages: readonly Message[],
	replay: ThinkingReplay,
): readonly Message[] {
	if (replay === 'all') return messages
	const last =
		replay === 'none' ? messages.length - 1 : messages.findLastIndex((one) => one.role === 'user')
	return messages.map((message, index) => {
		if (message.thinking === undefined || index > last) return message
		const { thinking: _thinking, ...rest } = message
		return rest
	})
}

/**
 * Estimates the context-token footprint of a string — the deterministic `ceil(length / 4)`
 * character heuristic {@link import('./agents/helpers.js').estimateMessages} sums over a conversation's
 * messages (the default context-budget estimator).
 *
 * @remarks
 * Approximates `ceil(length / 4)` (4 characters per token), so the same input always yields the same estimate (no model round-trip).
 * Empty text is `0`. This is a planning heuristic for reasoning about how much a turn's
 * messages cost the next request, not an exact tokenizer count — it never calls a provider,
 * so the agent layer stays provider-agnostic and synchronous where it can be.
 *
 * @param text - The text to estimate (a section summary, a message's content)
 * @returns The estimated token count (`ceil(text.length / 4)`; `0` for empty text)
 *
 * @example
 * ```ts
 * estimateTokens('') // 0
 * estimateTokens('hello') // 2  (ceil(5 / 4))
 * estimateTokens('a'.repeat(40)) // 10
 * ```
 */
export function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4)
}

/**
 * Describes a snapshot a store refuses, naming its id, the first fault, and what a host does about it.
 *
 * @remarks
 * A store's row is the host's table, so the text tells the host to read the row itself and rewrite it,
 * or to delete it, rather than reading a refused row as absent, which would let `open` overwrite it.
 * The id and each fault segment are JSON-encoded and length-capped.
 *
 * @param noun - What the snapshot holds, such as `conversation`
 * @param id - The id the row is keyed by
 * @param faults - The faults of the snapshot's shape
 * @returns The refusal's text
 * @example
 * ```ts
 * describeSnapshotRefusal('conversation', 'c1', [{ reason: 'extra', path: ['summary'] }])
 * // 'conversation "c1" holds a snapshot this version refuses (extra key "summary" at the root; ...'
 * ```
 */
export function describeSnapshotRefusal(
	noun: string,
	id: unknown,
	faults: readonly AuditFault[],
): string {
	const [first] = faults
	const path = first === undefined ? [] : isString(first.path) ? [first.path] : first.path
	const held = preview(id)
	const finding =
		first?.reason === 'extra'
			? `extra key ${preview(path.at(-1))} at ${path.length === 1 ? 'the root' : preview(path.slice(0, -1).join('.'))}`
			: first === undefined
				? 'a value its shape cannot name'
				: `${first.reason} at ${path.length === 0 ? 'the root' : preview(path.join('.'))}`
	const remedy =
		first?.reason === 'extra' ? 'rewrite it without the key' : 'rewrite it to the declared shape'
	return `${noun} ${held} holds a snapshot this version refuses (${finding}; a snapshot written before this change can carry it); read the row through your own table and ${remedy}, or delete it with store.delete(${held})`
}

/**
 * Describes why a judge question refuses, in the text both of its doors throw.
 *
 * @remarks
 * The rule travels in the text because the question shape cannot state it: a record has no minimum
 * size, so a single-option choice refuses at the guard with no fault for the list to name.
 *
 * @param id - The question's id
 * @param faults - What the question shape's audit found
 * @param schema - The question shape's JSON Schema
 * @returns The refusal text, with the fault list on the lines after it
 * @example
 * ```ts
 * describeQuestionRefusal('team', [], judgeQuestionContract.schema)
 * // 'question team is malformed; a choice names two or more criteria, a score two or more levels, and a noul only true and false'
 * ```
 */
export function describeQuestionRefusal(
	id: string,
	faults: readonly AuditFault[],
	schema: JSONSchema,
): string {
	const refusal = `question ${id} is malformed; a choice names two or more criteria, a score two or more levels, and a noul only true and false`
	return faults.length === 0 ? refusal : `${refusal}\n${describeFaults(faults, schema)}`
}

/**
 * Scans what a judge's answer must hold to its question: the same form, every probability in
 * `[0, 1]`, a choice's keys equal to the criteria keys, and a score as long as its levels.
 *
 * @remarks
 * These ties run where a judgment is written, at `JudgmentManager.add` and the `AgentJudge` result
 * ingestion. A read of a stored record checks only exact keys, literal forms, and number types,
 * because records written before the ties can miss them.
 *
 * @param question - The question that was asked
 * @param answer - The answer the judge gave
 * @returns Every broken tie as a fault, or an empty list
 * @example
 * ```ts
 * scanJudgmentTies({ form: 'noul' }, { form: 'noul', noul: 2 })
 * // [{ reason: 'constraint', path: ['answer', 'noul'], expected: 'number', constraint: 'max', limit: 1, received: '2' }]
 * ```
 */
export function scanJudgmentTies(
	question: JudgeQuestion,
	answer: JudgeAnswer,
): readonly AuditFault[] {
	if (question.form === 'noul' && answer.form === 'noul') {
		return scanProbability(answer.noul, ['answer', 'noul'])
	}
	if (question.form === 'choice' && answer.form === 'choice') {
		const wanted = Object.keys(question.criteria)
		const held = Object.keys(answer.probabilities)
		return [
			...wanted
				.filter((key) => !Object.hasOwn(answer.probabilities, key))
				.map((key): AuditFault => ({
					reason: 'missing',
					path: ['answer', 'probabilities', key],
					expected: 'number',
				})),
			...held
				.filter((key) => !Object.hasOwn(question.criteria, key))
				.map((key): AuditFault => ({
					reason: 'extra',
					path: ['answer', 'probabilities', key],
				})),
			...held.flatMap((key) =>
				scanProbability(answer.probabilities[key], ['answer', 'probabilities', key]),
			),
		]
	}
	if (question.form === 'score' && answer.form === 'score') {
		const levels = question.criteria.length
		const count = answer.probabilities.length
		return [
			...(count === levels
				? []
				: [
						{
							reason: 'constraint',
							path: ['answer', 'probabilities'],
							expected: 'array',
							constraint: count < levels ? 'min' : 'max',
							limit: levels,
							received: String(count),
						} satisfies AuditFault,
					]),
			...answer.probabilities.flatMap((value, index) =>
				scanProbability(value, ['answer', 'probabilities', String(index)]),
			),
		]
	}
	return [
		{
			reason: 'type',
			path: ['answer', 'form'],
			expected: 'literal',
			received: answer.form,
		},
	]
}

/**
 * Scans one probability against `[0, 1]`.
 *
 * @param value - The probability
 * @param path - Where it sits
 * @returns A constraint fault when it is out of bounds, or an empty list
 * @example
 * ```ts
 * scanProbability(0.5, ['answer', 'noul']) // []
 * ```
 */
export function scanProbability(
	value: number | undefined,
	path: readonly string[],
): readonly AuditFault[] {
	if (value !== undefined && value >= 0 && value <= 1) return []
	return [
		{
			reason: 'constraint',
			path,
			expected: 'number',
			constraint: value !== undefined && value < 0 ? 'min' : 'max',
			limit: value !== undefined && value < 0 ? 0 : 1,
			received: String(value),
		},
	]
}

/**
 * Sanitizes one reported token count into a non-negative integer — a non-finite or
 * non-positive value becomes `0`, and a positive fractional value floors down.
 *
 * @param value - The token count to sanitize
 * @returns The floored count, or `0` when the value is non-finite or non-positive
 * @example
 * ```ts
 * sanitizeToken(12.7) // 12
 * sanitizeToken(-1) // 0
 * sanitizeToken(Number.NaN) // 0
 * ```
 */
export function sanitizeToken(value: number): number {
	return isFiniteNumber(value) && value > 0 ? Math.floor(value) : 0
}

/**
 * Sanitizes a {@link TokenUsage} into non-negative integers — the guard an agent's
 * abort-usage path applies to a provider's partial usage before it is charged against a
 * budget or folded into the run total, because a cancelled stream has no settled result to refuse;
 * a settled result's usage crosses the provider-result door instead.
 *
 * @remarks
 * Per field (`prompt` / `completion` / `total`): a non-finite value (`NaN`, `+Infinity`,
 * `-Infinity`) or a negative value floors to `0`; a fractional value floors to its
 * non-negative integer part. No upper cap is applied. Total — never throws.
 *
 * @param usage - The token usage to sanitize (for example a provider's abort-partial usage)
 * @returns A new {@link TokenUsage} with every field a non-negative integer
 *
 * @example
 * ```ts
 * sanitizeUsage({ prompt: -5, completion: NaN, total: 12.7 }) // { prompt: 0, completion: 0, total: 12 }
 * ```
 */
export function sanitizeUsage(usage: TokenUsage): TokenUsage {
	return {
		prompt: sanitizeToken(usage.prompt),
		completion: sanitizeToken(usage.completion),
		total: sanitizeToken(usage.total),
	}
}

/**
 * Adds two {@link TokenUsage} values field by field — the running total an agent run keeps
 * across its provider calls.
 *
 * @remarks
 * Pure and total: the first call seeds the total (`prior` `undefined` returns `next`
 * unchanged), later calls accumulate. No sanitization happens here — charge a provider's
 * reported usage through {@link sanitizeUsage} first.
 *
 * @param prior - The total so far (`undefined` before the first usage-bearing call)
 * @param next - This call's reported usage
 * @returns The summed usage
 *
 * @example
 * ```ts
 * sumUsage(undefined, { prompt: 2, completion: 1, total: 3 }) // { prompt: 2, completion: 1, total: 3 }
 * sumUsage({ prompt: 2, completion: 1, total: 3 }, { prompt: 1, completion: 1, total: 2 })
 * // { prompt: 3, completion: 2, total: 5 }
 * ```
 */
export function sumUsage(prior: TokenUsage | undefined, next: TokenUsage): TokenUsage {
	if (prior === undefined) return next
	return {
		prompt: prior.prompt + next.prompt,
		completion: prior.completion + next.completion,
		total: prior.total + next.total,
	}
}

/**
 * Removes each key through a single-key remover and folds the outcomes, so a batch `remove`
 * reports whether the whole batch applied.
 *
 * @remarks
 * Every key is passed to `remove` even after one is missing, so a present key still takes
 * effect (and emits) when an earlier key was absent.
 *
 * @typeParam K - The key type the remover accepts
 * @param keys - The keys to remove, in order
 * @param remove - Removes one key and returns whether it was present
 * @returns True if every key was present and removed; false otherwise (an empty list returns true)
 *
 * @example
 * ```ts
 * const stored = new Set(['refunds', 'billing'])
 * removeEntries(['refunds', 'escalations'], (key) => stored.delete(key)) // false
 * removeEntries(['billing'], (key) => stored.delete(key)) // true
 * ```
 */
export function removeEntries<K>(keys: readonly K[], remove: (key: K) => boolean): boolean {
	// `Array.from` passes a hole in `keys` to `remove` as `undefined`, as iteration does; `map` skips it.
	return Array.from(keys, (key) => remove(key)).every((removed) => removed)
}

/**
 * Collects whole exchanges, joining every exchange spanned by a tool group.
 *
 * @remarks
 * A user message opens an exchange that ends before the next user message. Leading messages
 * form their own exchange. A tool group joins every exchange between its first and last member.
 *
 * @param messages - The messages in prompt order
 * @returns The exchanges in prompt order, with each message retained unchanged
 * @example
 * ```ts
 * collectExchanges([
 * 	{ id: 'greeting', role: 'assistant', content: 'Welcome.' },
 * 	{ id: 'request', role: 'user', content: 'Read the order.' },
 * ]) // a leading exchange and a request exchange
 * ```
 */
export function collectExchanges(messages: readonly Message[]): ReadonlyArray<readonly Message[]> {
	if (messages.length === 0) return []
	const positions = new Map(messages.map((message, index) => [message, index]))
	const spans = collectToolGroups(messages).map((group) => {
		const spanned = group.flatMap((message) => {
			const position = positions.get(message)
			return position === undefined ? [] : [position]
		})
		return {
			start: spanned.reduce((least, position) => Math.min(least, position), messages.length),
			end: spanned.reduce((most, position) => Math.max(most, position), 0),
		}
	})
	const starts = [
		...new Set([
			0,
			...[...messages.entries()].flatMap(([index, message]) =>
				message.role === 'user' ? [index] : [],
			),
		]),
	].filter((boundary) => !spans.some((span) => span.start < boundary && boundary <= span.end))
	return starts.map((start, position) =>
		messages.slice(start, starts[position + 1] ?? messages.length),
	)
}

/**
 * Checks whether a message carries at least one tool call.
 *
 * @remarks
 * Pure and total. An absent `calls` member and an empty list both return false, so a tool-free
 * assistant turn and a turn whose provider reported an empty call list read alike.
 *
 * @param message - The message to inspect; only its `calls` member is read
 * @returns True if `calls` holds at least one call; false otherwise
 * @example
 * ```ts
 * hasCalls({ calls: [{ id: 'order', name: 'lookup', arguments: {} }] }) // true
 * hasCalls({ calls: [] }) // false
 * hasCalls({}) // false
 * ```
 */
export function hasCalls(message: Pick<Message, 'calls'>): boolean {
	return (message.calls?.length ?? 0) > 0
}

/**
 * Collects each assistant message that carries calls together with the tool messages that answer
 * it, then each run of tool messages that no assistant message owns.
 *
 * @remarks
 * A tool message belongs to the one assistant message whose calls hold its `call` id. Without that
 * unique owner, it belongs to the assistant message that leads its run of tool messages when that
 * leader holds the id, repeats a call id, or the tool message has no `call`. Any other tool message
 * joins the orphan run it sits in. Compaction and the stock selection each keep a group on one side
 * of their cut.
 *
 * @param messages - The messages in prompt order
 * @returns The owned groups in owner order, then the orphan runs, each in prompt order
 * @example
 * ```ts
 * collectToolGroups([
 * 	{ id: 'lookup', role: 'assistant', content: '', calls: [{ id: 'order', name: 'lookup', arguments: {} }] },
 * 	{ id: 'result', role: 'tool', content: 'LH-81660 is late', call: 'order' },
 * ]) // one group holding the lookup call and its result
 * ```
 */
export function collectToolGroups(messages: readonly Message[]): ReadonlyArray<readonly Message[]> {
	const leaders = messages.filter((message) => message.role === 'assistant' && hasCalls(message))
	const distinct = new Set(leaders)
	// `Array.from` passes a hole in `calls` to the mapper as `undefined`, as iteration does; `map` skips it.
	const owners = Map.groupBy(
		leaders.flatMap((leader) =>
			Array.from(leader.calls ?? [], (call) => ({ id: call.id, leader })),
		),
		(entry) => entry.id,
	)
	const starts = [...messages.entries()].flatMap(([index, message]) =>
		message.role === 'tool' ? [] : [index],
	)
	// A run is one non-tool message, which leads it when it owns calls, and the tool messages after it.
	const runs = [
		{ leader: undefined, tools: messages.slice(0, starts[0] ?? messages.length) },
		...starts.map((start, position) => {
			const message = messages[start]
			return {
				leader: message !== undefined && distinct.has(message) ? message : undefined,
				tools: messages.slice(start + 1, starts[position + 1] ?? messages.length),
			}
		}),
	]
	const placed = runs.map(({ leader, tools }) => {
		const local = leader?.calls ?? []
		const duplicate = new Set(local.map((call) => call.id)).size !== local.length
		return tools.map((message) => {
			const paired =
				leader !== undefined &&
				(duplicate || message.call === undefined || local.some((call) => call.id === message.call))
			const claims = message.call === undefined ? undefined : owners.get(message.call)
			const owner = claims?.length === 1 ? claims[0]?.leader : paired ? leader : undefined
			return { message, owner }
		})
	})
	const owned = Map.groupBy(
		placed.flat().filter((entry) => entry.owner !== undefined),
		(entry) => entry.owner,
	)
	const groups = [...distinct].map((leader) => [
		leader,
		...(owned.get(leader) ?? []).map((entry) => entry.message),
	])
	const orphans = placed.flatMap((run) => {
		const orphan = run.filter((entry) => entry.owner === undefined).map((entry) => entry.message)
		return orphan.length > 0 ? [orphan] : []
	})
	return [...groups, ...orphans]
}

/**
 * Renders a value as the JSON text `JSON.stringify` produces, or `undefined` when JSON cannot
 * carry the value.
 *
 * @remarks
 * Pure and total. Where `JSON.stringify` returns text, the result is the same text, property order
 * included; `canonicalStringify` from `@orkestrel/contract` sorts keys instead. A value
 * `JSON.stringify` throws on, such as a `BigInt` or a cycle, and a value it renders as nothing,
 * such as `undefined`, a function, or a symbol, return `undefined`.
 *
 * @param value - The value to render
 * @returns The JSON text, or `undefined` when the value has no JSON text
 * @example
 * ```ts
 * renderJSON({ order: 'LH-81660', late: true }) // '{"order":"LH-81660","late":true}'
 * renderJSON(10n) // undefined
 * renderJSON(undefined) // undefined
 * ```
 */
export function renderJSON(value: unknown): string | undefined {
	const outcome = attempt((): string | undefined => JSON.stringify(value))
	return outcome.success ? outcome.value : undefined
}

/**
 * Matches two values of JSON data by JSON value, whatever their key order, and reads a value with no JSON text as no match.
 *
 * @remarks
 * True exactly when the two values' JSON texts, as `JSON.stringify` renders them, parse to the
 * same JSON value, and false when either side has no JSON text, a cycle aside. A record member
 * whose value is `undefined`, a function, or a symbol is absent, as JSON renders it, and each
 * member is read as an own member, so a `__proto__` or `constructor` key counts only on a side
 * that holds it. A list compares by position and length. The walk stops at the first difference.
 *
 * Bounded to JSON data. It promises nothing for a cycle, a `toJSON` object, `NaN`, an infinity, or
 * an `undefined`, function, symbol, or hole inside a list.
 *
 * @param left - One value
 * @param right - The other value
 * @returns True if the two values are the same JSON value; false otherwise
 * @example
 * ```ts
 * matchesJSON({ order: 'LH-81660', late: true }, { late: true, order: 'LH-81660' }) // true
 * matchesJSON(['LH-81660', 'LH-81661'], ['LH-81661', 'LH-81660']) // false
 * matchesJSON(undefined, undefined) // false
 * ```
 */
export function matchesJSON(left: unknown, right: unknown): boolean {
	if (typeof left !== 'object' || left === null) {
		return (
			left === right &&
			(typeof left === 'string' ||
				typeof left === 'number' ||
				typeof left === 'boolean' ||
				left === null)
		)
	}
	if (isArray(left)) {
		return (
			isArray(right) &&
			left.length === right.length &&
			left.every((member, index) => matchesJSON(member, right[index]))
		)
	}
	if (!isRecord(left) || !isRecord(right)) return false
	const ours = Object.keys(left).filter(
		(key) =>
			left[key] !== undefined && typeof left[key] !== 'function' && typeof left[key] !== 'symbol',
	)
	const theirs = Object.keys(right).filter(
		(key) =>
			right[key] !== undefined &&
			typeof right[key] !== 'function' &&
			typeof right[key] !== 'symbol',
	)
	return (
		ours.length === theirs.length &&
		ours.every((key) => Object.hasOwn(right, key) && matchesJSON(left[key], right[key]))
	)
}

/**
 * Matches a recorded question by JSON value, the ordered sources, the rendered state, and the judge identity.
 *
 * @param judgment - The recorded judgment to compare
 * @param question - The question to ask
 * @param sources - The ordered source message ids
 * @param state - The rendered state to compare
 * @param model - The configured judge identity
 * @returns True if every identity component matches; false otherwise
 * @example
 * ```ts
 * matchesJudgment(judgment, question, ['message-a'], 'Charged twice', judge.model)
 * ```
 */
export function matchesJudgment(
	judgment: Judgment,
	question: JudgeQuestion,
	sources: readonly string[],
	state: string,
	model: string,
): boolean {
	return (
		judgment.model === model &&
		judgment.state === state &&
		judgment.sources.length === sources.length &&
		judgment.sources.every((id, index) => id === sources[index]) &&
		matchesJSON(judgment.question, question)
	)
}

/**
 * Reads the ids and the numbers of a text.
 *
 * @param text - The text to read
 * @returns The uppercased hyphenated ids that hold a digit, and the numbers outside those ids with grouping commas removed
 *
 * @example
 * ```ts
 * const literals = extractLiterals('Order bw-5512 totals 1,200.50')
 * // literals.ids is Set { 'BW-5512' }, literals.numbers is Set { 1200.5 }
 * ```
 */
export function extractLiterals(text: string): LiteralSet {
	const idShape = /\b[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+\b/g
	const ids = new Set(
		[...text.matchAll(idShape)].flatMap(([token]) =>
			/\d/.test(token) ? [token.toUpperCase()] : [],
		),
	)
	const rest = text.replace(idShape, (token) => (/\d/.test(token) ? ' ' : token))
	const numbers = new Set(
		[...rest.matchAll(/(?<![\w.])\d[\d,]*(?:\.\d+)?/g)].flatMap(([token]) => {
			const value = Number(token.replace(/,/g, ''))
			return Number.isFinite(value) ? [value] : []
		}),
	)
	return { ids, numbers }
}
