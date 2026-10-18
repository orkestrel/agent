import type { JudgeQuestion, Judgment, Message, ThinkingReplay } from './types.js'
import type { TokenUsage } from '@orkestrel/budget'
import { attempt, isFiniteNumber } from '@orkestrel/contract'

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
 * Pure and total. `running` is `undefined` until a call surfaces reasoning, so the first join
 * returns `next` verbatim. Each call's non-empty thinking is recorded on the assistant message
 * that call appends. The joined result also includes thinking from calls that appended no
 * message, such as an aborted call. Only recorded thinking can return to a provider,
 * as its `replay` policy allows. Thinking stays out of `content`.
 *
 * @param running - The reasoning accumulated so far (`undefined` before the first)
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
export function joinThinking(running: string | undefined, next: string): string {
	if (running === undefined || running.length === 0) return next
	return next.length === 0 ? running : `${running}\n\n${next}`
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
 * budget or folded into the run total.
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
 * Pure and total: the first call seeds the total (`running` `undefined` returns `next`
 * unchanged), later calls accumulate. No sanitization happens here — charge a provider's
 * reported usage through {@link sanitizeUsage} first.
 *
 * @param running - The total so far (`undefined` before the first usage-bearing call)
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
export function sumUsage(running: TokenUsage | undefined, next: TokenUsage): TokenUsage {
	if (running === undefined) return next
	return {
		prompt: running.prompt + next.prompt,
		completion: running.completion + next.completion,
		total: running.total + next.total,
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
	return keys.map((key) => remove(key)).every((removed) => removed)
}

/**
 * Yields each whole number from zero up to, and excluding, a count, one at a time, so a loop counts
 * turns without a reassigned counter.
 *
 * @remarks
 * Lazy: it holds no list of the numbers, so a count near `Number.MAX_SAFE_INTEGER` costs nothing
 * until a consumer pulls that far. A count of `0` yields nothing.
 *
 * @param count - The nonnegative safe integer count of numbers to yield
 * @returns A generator of `0` through `count - 1` in ascending order
 *
 * @example
 * ```ts
 * [...iterateRange(3)] // [0, 1, 2]
 * [...iterateRange(0)] // []
 * ```
 */
export function* iterateRange(count: number): Generator<number, void> {
	// `Array(n).keys()` walks indexes without allocating them, but `n` stops at `2 ** 32 - 1`, so
	// a larger count is yielded block by block.
	const block = 2 ** 30
	for (const start of Array(Math.ceil(count / block)).keys()) {
		const base = start * block
		for (const offset of Array(Math.min(block, count - base)).keys()) yield base + offset
	}
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
	const boundaries = new Set([0])
	const positions = new Map(messages.map((message, index) => [message, index]))
	for (const [index, message] of messages.entries())
		if (message.role === 'user') boundaries.add(index)
	for (const group of collectToolGroups(messages)) {
		const spanned = group
			.map((message) => positions.get(message))
			.filter((position): position is number => position !== undefined)
		const start = Math.min(messages.length, ...spanned)
		const end = Math.max(0, ...spanned)
		for (const boundary of boundaries)
			if (start < boundary && boundary <= end) boundaries.delete(boundary)
	}
	const exchanges: Message[][] = []
	for (const [index, message] of messages.entries()) {
		if (boundaries.has(index)) exchanges.push([])
		exchanges.at(-1)?.push(message)
	}
	return exchanges
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
	const groups = new Map<Message, Message[]>()
	const calls = new Map<string, Message[]>()
	for (const message of messages) {
		if (message.role !== 'assistant' || !hasCalls(message)) continue
		groups.set(message, [message])
		for (const call of message.calls ?? []) {
			const owners = calls.get(call.id) ?? []
			owners.push(message)
			calls.set(call.id, owners)
		}
	}
	// A run is one non-tool message, which leads it when it owns calls, and the tool messages after it.
	const runs: Array<{ leader: Message | undefined; tools: Message[] }> = [
		{ leader: undefined, tools: [] },
	]
	for (const message of messages) {
		if (message.role === 'tool') runs.at(-1)?.tools.push(message)
		else runs.push({ leader: groups.has(message) ? message : undefined, tools: [] })
	}
	const orphans: Message[][] = []
	for (const { leader, tools } of runs) {
		const orphan: Message[] = []
		for (const message of tools) {
			const local = leader?.calls ?? []
			const duplicate = new Set(local.map((call) => call.id)).size !== local.length
			const paired =
				leader !== undefined &&
				(duplicate || message.call === undefined || local.some((call) => call.id === message.call))
			const owners = message.call === undefined ? undefined : calls.get(message.call)
			const owner = owners?.length === 1 ? owners[0] : paired ? leader : undefined
			const group = owner === undefined ? undefined : groups.get(owner)
			if (group !== undefined) group.push(message)
			else {
				if (orphan.length === 0) orphans.push(orphan)
				orphan.push(message)
			}
		}
	}
	return [...groups.values(), ...orphans]
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
 * Matches a recorded question, ordered sources, rendered state, and judge identity by JSON text, so key order counts.
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
		JSON.stringify(judgment.question) === JSON.stringify(question)
	)
}
