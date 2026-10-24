import type { StudySentencePopulation, StudySentenceRuntime } from './types.js'
import {
	arrayOf,
	holds,
	isBoolean,
	isFunction,
	isNonNegativeInteger,
	isObject,
	isRecord,
	isString,
	literalOf,
	objectOf,
} from '@orkestrel/contract'

/** Checks the admitted runtime's required lexical exports. @param value - Admitted Agent namespace. @returns True if the real helper capabilities are present; false otherwise. */
export function isStudySentenceRuntime(value: unknown): value is StudySentenceRuntime {
	return objectOf({ extractTokens: isFunction, splitSentences: isFunction })(value)
}

/** Checks the consumer's public declaration shape without interpreting labels. @param value - Public population JSON. @returns True if the shape is complete; false otherwise. */
export function isStudySentencePopulation(value: unknown): value is StudySentencePopulation {
	return holds(
		() =>
			isObject(value) &&
			'cases' in value &&
			arrayOf(
				objectOf({
					id: isString,
					account: isString,
					names: arrayOf(isString),
					partition: literalOf('fitting', 'validation'),
				}),
			)(value.cases) &&
			'membership' in value &&
			isRecord(value.membership) &&
			Object.values(value.membership).every(arrayOf(isString)) &&
			'neutral' in value &&
			arrayOf(isString)(value.neutral) &&
			'standing' in value &&
			arrayOf(isString)(value.standing) &&
			'aliases' in value &&
			arrayOf(
				objectOf({
					id: isString,
					source: objectOf({ id: isString, version: isNonNegativeInteger }),
					role: literalOf('user', 'tool'),
					text: isString,
					evidence: isString,
				}),
			)(value.aliases) &&
			'pairs' in value &&
			arrayOf(
				objectOf({
					earlier: objectOf({ id: isString, version: isNonNegativeInteger }),
					later: objectOf({ id: isString, version: isNonNegativeInteger }),
					required: isBoolean,
					evidence: isString,
				}),
			)(value.pairs) &&
			'controls' in value &&
			arrayOf(
				objectOf({
					id: isString,
					category: isString,
					partition: literalOf('fitting', 'validation'),
					earlier: isString,
					later: isString,
					sentence: isNonNegativeInteger,
					intent: isBoolean,
				}),
			)(value.controls),
	)
}
