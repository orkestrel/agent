import { attempt, parseJSON } from '@orkestrel/contract'

/**
 * Owns a value by serializing it to JSON and parsing the text, so the copy shares nothing with its source.
 *
 * @remarks
 * A value that JSON cannot carry, such as a cycle or a bigint, and a value that serializes to
 * nothing, such as a function, both return undefined, so a guard over the result refuses them.
 * A proxied value serializes through its traps, where a structured clone refuses it.
 *
 * @param value - The value to own
 * @returns The owned JSON copy, or undefined when the value is not JSON
 * @example
 * ```ts
 * copyJSON({ state: 'A ticket.' }) // { state: 'A ticket.' }
 * copyJSON(() => 1) // undefined
 * ```
 */
export function copyJSON(value: unknown): unknown {
	const text = attempt(() => JSON.stringify(value))
	if (!text.success || typeof text.value !== 'string') return undefined
	return parseJSON(text.value)
}
