import { isString, literalOf, parseJSONAs, tupleOf } from '@orkestrel/contract'

/**
 * Parses a judgment id as a needed condition key, the inverse of `buildConditionKey`.
 * @param key - The judgment id to read
 * @returns The condition, subject id, and request id, or `undefined` when the id is not a needed key
 * @example
 * ```ts
 * parseConditionKey('["needed","a","b"]') // ['needed', 'a', 'b']
 * parseConditionKey('other-condition') // undefined
 * ```
 */
export function parseConditionKey(key: string): readonly ['needed', string, string] | undefined {
	return parseJSONAs(key, tupleOf(literalOf('needed'), isString, isString))
}
