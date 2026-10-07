import type { TokenUsage } from '@orkestrel/budget'
import { isFiniteNumber } from '@orkestrel/contract'

/**
 * Filters a list of items by a {@link import('./contexts/index.js').ScopeInterface} allow-list of keys —
 * `undefined` passes everything, `[]` passes nothing, and a non-empty list passes the listed keys
 * alone, order preserved. The pure, total set-membership primitive the context's build step and
 * the agent loop's tool-advertise step apply a scope through.
 *
 * @remarks
 * Three-way by the allow-list's shape, so a `Scope` category cleanly expresses "all /
 * none / only these":
 * - `undefined` ⇒ no constraint — every item passes (returned unchanged).
 * - `[]` (empty) ⇒ none pass (no key is in an empty set).
 * - a non-empty list ⇒ only items whose `key(item)` is in the list pass.
 *
 * Order-preserving (it filters `items` in place order, never reorders) and total — never
 * throws. Keys are matched by a `Set` for O(1) membership, so a large list is cheap.
 *
 * @typeParam T - The item type being filtered
 * @param allow - The allow-list of keys (`undefined` ⇒ all, `[]` ⇒ none, else only-listed)
 * @param items - The items to filter (returned unchanged when `allow` is `undefined`)
 * @param key - Extracts the key an item is matched on (for example an instruction's `name`)
 * @returns The items that pass the allow-list, in their original order
 *
 * @example
 * ```ts
 * const items = [{ name: 'a' }, { name: 'b' }]
 * filterAllowList(undefined, items, (i) => i.name) // [{ name: 'a' }, { name: 'b' }] (all)
 * filterAllowList([], items, (i) => i.name) // [] (none)
 * filterAllowList(['b'], items, (i) => i.name) // [{ name: 'b' }] (only listed)
 * ```
 */
export function filterAllowList<T>(
	allow: readonly string[] | undefined,
	items: readonly T[],
	key: (item: T) => string,
): readonly T[] {
	if (allow === undefined) return items
	if (allow.length === 0) return []
	const set = new Set(allow)
	return items.filter((item) => set.has(key(item)))
}

/**
 * Joins the reasoning a run's provider calls separated from the answer — the first call
 * seeds the accumulation, a later call appends blank-line separated so each turn's reasoning
 * stays readable.
 *
 * @remarks
 * Pure and total. `running` is `undefined` until a call surfaces reasoning, so the first join
 * returns `next` verbatim (no leading separator). The result is display/audit metadata that
 * never re-enters the conversation.
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
 * Sanitizes one reported token count into a safe non-negative integer — a non-finite or
 * non-positive value becomes `0`, and a positive fractional value floors down.
 *
 * @param value - The token count to sanitize
 * @returns The floored count, or `0` when the value is non-finite or non-positive
 */
export function sanitizeToken(value: number): number {
	return isFiniteNumber(value) && value > 0 ? Math.floor(value) : 0
}

/**
 * Sanitizes a {@link TokenUsage} into safe, non-negative integers — the guard an agent's
 * abort-usage path applies to a provider's partial usage before it is charged against a
 * budget or folded into the run total.
 *
 * @remarks
 * Per field (`prompt` / `completion` / `total`): a non-finite value (`NaN`, `+Infinity`,
 * `-Infinity`) or a negative value floors to `0`; a fractional value floors to its
 * non-negative integer part. No upper cap is applied. Total — never throws.
 *
 * @param usage - The token usage to sanitize (for example a provider's abort-partial usage)
 * @returns A new {@link TokenUsage} with every field a safe non-negative integer
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
