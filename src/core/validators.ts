import type { JudgeEntry, JudgeQuestion } from './types.js'
import {
	arrayOf,
	attempt,
	isArray,
	isJSONValue,
	isRecord,
	isString,
	nullableOf,
	optionalOf,
} from '@orkestrel/contract'

/**
 * Checks whether a value is a judge entry: a string, a JSON record, or a JSON array.
 *
 * @remarks
 * Total: a cycle, a non-JSON member, a class instance, and a hostile input return false. `null`
 * is not an entry; a criteria guard admits it where the protocol keeps it.
 *
 * @param value - The unknown entry candidate
 * @returns True if the value is a string or JSON structure the model can read; false otherwise
 * @example
 * ```ts
 * isJudgeEntry('Customer asks for a refund') // true
 * isJudgeEntry({ ticket: 4182, tags: ['billing'] }) // true
 * isJudgeEntry(null) // false
 * isJudgeEntry({ opened: new Date() }) // false
 * ```
 */
export function isJudgeEntry(value: unknown): value is JudgeEntry {
	if (isString(value)) return true
	return (isRecord(value) || isArray(value)) && isJSONValue(value)
}

/**
 * Checks whether a value is a well-formed judge question of the choice, score, or noul form.
 *
 * @remarks
 * Total: a hostile input returns false. A choice needs at least 2 options and a score at least 2
 * levels, because the confidence formula divides by the candidate count; a description or a level
 * can be `null`. `instructions` and noul `criteria` are omitted when absent and never `null`.
 * Server limits on option, level, and question counts are left to the server.
 *
 * @param value - The unknown question candidate
 * @returns True if the value is a question the judge engine can send; false otherwise
 * @example
 * ```ts
 * isJudgeQuestion({ form: 'choice', criteria: { billing: null, bug: 'Software defect' } }) // true
 * isJudgeQuestion({ form: 'score', criteria: ['Cosmetic', null, 'Blocking'] }) // true
 * isJudgeQuestion({ form: 'noul', instructions: 'Is a refund owed?' }) // true
 * isJudgeQuestion({ form: 'choice', criteria: { billing: null } }) // false
 * ```
 */
export function isJudgeQuestion(value: unknown): value is JudgeQuestion {
	const checked = attempt(() => {
		if (!isRecord(value)) return false
		const { form, instructions, criteria } = value
		if (instructions !== undefined && !isJudgeEntry(instructions)) return false
		if (form === 'choice') {
			return (
				isRecord(criteria) &&
				Object.keys(criteria).length >= 2 &&
				Object.values(criteria).every(nullableOf(isJudgeEntry))
			)
		}
		if (form === 'score') {
			return arrayOf(nullableOf(isJudgeEntry))(criteria) && criteria.length >= 2
		}
		if (form !== 'noul') return false
		if (criteria === undefined) return true
		if (!isRecord(criteria)) return false
		return optionalOf(isJudgeEntry)(criteria.true) && optionalOf(isJudgeEntry)(criteria.false)
	})
	return checked.success && checked.value
}
