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

/**
 * Owns a value through JSON and freezes every record and list of the copy, leaving the value unchanged.
 *
 * @remarks
 * Returns undefined exactly where `copyJSON` does, a value too deep for `JSON.stringify` among them.
 * A worklist over the owned copy does the freezing, so any depth `JSON.stringify` holds also freezes.
 *
 * @param value - The value to own and freeze
 * @returns The frozen JSON copy, or undefined when the value is not JSON
 * @example
 * ```ts
 * Object.isFrozen(freezeJSON({ state: 'A ticket.' })) // true
 * freezeJSON(() => 1) // undefined
 * ```
 */
export function freezeJSON(value: unknown): unknown {
	const copy = copyJSON(value)
	if (typeof copy !== 'object' || copy === null) return copy
	const worklist: object[] = [copy]
	for (const node of worklist) {
		Object.freeze(node)
		const children: readonly unknown[] = Object.values(node)
		for (const child of children) {
			if (typeof child === 'object' && child !== null) worklist.push(child)
		}
	}
	return copy
}
