import type { SystemOneAnswer, SystemOneResponse } from './types.js'
import {
	arrayOf,
	attempt,
	boundsOf,
	isArray,
	isNumber,
	isRecord,
	isString,
	nullableOf,
	optionalOf,
} from '@orkestrel/contract'

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
 * values are never normalized. Hostile reads return false.
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
