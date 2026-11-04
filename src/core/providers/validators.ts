import type { ProviderDelta, ProviderResult, SystemOneAnswer, SystemOneResponse } from './types.js'
import type { Guard } from '@orkestrel/contract'
import { isBudgetAmount } from '@orkestrel/budget'
import {
	arrayOf,
	attempt,
	boundsOf,
	isArray,
	isBoolean,
	isNumber,
	isRecord,
	isString,
	nullableOf,
	objectOf,
	optionalOf,
} from '@orkestrel/contract'
import { isToolCall } from '@orkestrel/tool'

/**
 * Checks whether a value carries the members {@link ProviderResult} publishes: a string `content`, and
 * `thinking`, `tools`, `usage`, and `truncated` absent or of their published types.
 *
 * @remarks
 * A provider is a foreign interface, so the guard is open: unknown members and a class instance pass,
 * and each `usage` count is a finite nonnegative number with no integer check. An unreadable member
 * returns false. {@link import('./helpers.js').requireProviderResult} runs it on an owned copy, the one
 * door a run's result crosses.
 *
 * @param value - The unknown result candidate
 * @returns True if the value satisfies the published result; false otherwise
 *
 * @example
 * ```ts
 * isProviderResult({ content: 'answer', extra: true }) // true
 * isProviderResult({}) // false
 * isProviderResult({ content: 'answer', usage: { prompt: -1, completion: 0, total: 0 } }) // false
 * ```
 */
export const isProviderResult: Guard<ProviderResult> = objectOf(
	{
		content: isString,
		thinking: isString,
		tools: arrayOf(isToolCall),
		usage: objectOf({ prompt: isBudgetAmount, completion: isBudgetAmount, total: isBudgetAmount }),
		truncated: isBoolean,
	},
	['thinking', 'tools', 'usage', 'truncated'],
)

/**
 * Checks whether a value is a provider delta: a `channel` of `content` or `thinking` and a string
 * `text`.
 *
 * @remarks
 * A hand guard, because a stream checks every delta: it destructures the two members rather than
 * composing a record guard. Unknown members and a class instance pass, and an unreadable member returns
 * false.
 *
 * @param value - The unknown delta candidate
 * @returns True if the value is a delta the loop can read; false otherwise
 *
 * @example
 * ```ts
 * isProviderDelta({ channel: 'content', text: 'Hi' }) // true
 * isProviderDelta({ channel: 'audio', text: 'Hi' }) // false
 * ```
 */
export function isProviderDelta(value: unknown): value is ProviderDelta {
	if (typeof value !== 'object' || value === null) return false
	try {
		const { channel, text }: { readonly channel?: unknown; readonly text?: unknown } = value
		return (channel === 'content' || channel === 'thinking') && typeof text === 'string'
	} catch {
		return false
	}
}

/**
 * Checks whether a value is a System One response envelope with optional model and usage.
 *
 * @remarks
 * Answers remain unknown until checked against their questions. Missing and null usage counts
 * are accepted. Extra members are ignored, and unreadable fields return false.
 *
 * @param value - The unknown response candidate
 * @returns True if the envelope fields have their wire types; false otherwise
 * @example
 * ```ts
 * isSystemOneResponse({ answers: {}, usage: { input_tokens: null } }) // true
 * ```
 */
export function isSystemOneResponse(value: unknown): value is SystemOneResponse {
	const checked = attempt(() => {
		if (!isRecord(value)) return false
		const { model, answers, usage } = value
		if (!optionalOf(isString)(model) || !isRecord(answers)) return false
		if (usage === undefined) return true
		if (!isRecord(usage)) return false
		return (
			optionalOf(nullableOf(isNumber))(usage.input_tokens) &&
			optionalOf(nullableOf(isNumber))(usage.output_tokens)
		)
	})
	return checked.success && checked.value
}

/**
 * Checks whether a value is a System One answer whose type and distribution the wire can read.
 *
 * @remarks
 * The guard checks `type` and the distribution the wire dereferences: the `noul` number for a
 * noul, the `probabilities` map for a choice, and the `probabilities` map or dense array for a
 * score, each probability a finite number in [0, 1]. The `choice`, `score`, `confidence`, and
 * `legend` members are carried unchecked, because the wire never reads them, so a value this
 * guard accepts can hold any value in those members. Distribution sums are not constrained;
 * values are never normalized. A read that throws returns false.
 *
 * @param value - The unknown answer candidate
 * @returns True if the type and the distribution satisfy the wire contract; false otherwise
 * @example
 * ```ts
 * isSystemOneAnswer({ type: 'noul', noul: 0.9 }) // true
 * isSystemOneAnswer({ type: 'score', probabilities: [0.2, 0.8] }) // true
 * isSystemOneAnswer({ type: 'noul', noul: 1.1 }) // false
 * ```
 */
export function isSystemOneAnswer(value: unknown): value is SystemOneAnswer {
	const checked = attempt(() => {
		if (!isRecord(value)) return false
		const { type } = value
		if (type === 'noul') return boundsOf(0, 1)(value.noul)
		if (type !== 'choice' && type !== 'score') return false
		const { probabilities } = value
		if (type === 'score' && isArray(probabilities)) {
			return arrayOf(boundsOf(0, 1))(probabilities)
		}
		return isRecord(probabilities) && Object.values(probabilities).every(boundsOf(0, 1))
	})
	return checked.success && checked.value
}
