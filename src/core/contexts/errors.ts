import type { ContextErrorCode } from './types.js'
import type { CodedErrorOptions } from '../types.js'
import { INTRINSICS, holds, isObject, isFunction } from '@orkestrel/contract'

/**
 * Reports a context snapshot that `isMemoSnapshot` refuses, thrown by the construction of a
 * {@link import('./memos/MemoManager.js').MemoManager} before it seats any state, carrying the
 * machine-readable `code` `'SNAPSHOT'`.
 *
 * @remarks
 * A `snapshot` option crosses a foreign boundary (a client, a store, a file), so the manager copies
 * it through JSON and checks the copy: a value JSON cannot carry, a revision missing a field, a
 * non-finite `time`, a sparse `memos` array, a non-string `id`, or a non-array `memos` is a
 * programmer error and throws this with `'SNAPSHOT'`. Narrow a caught value with
 * {@link isContextError} and branch on `error.code`.
 */
export class ContextError extends Error {
	/** Names the machine-readable condition — `'SNAPSHOT'`: a snapshot option that is not a memo snapshot. */
	readonly code: ContextErrorCode
	/** Holds the values that locate the failure, or `undefined` when none were supplied. */
	readonly context: Readonly<Record<string, unknown>> | undefined

	/**
	 * Creates the error with its code, message, and optional cause and context.
	 *
	 * @param code - The machine-readable {@link ContextErrorCode}
	 * @param message - The human-readable description
	 * @param options - The optional {@link CodedErrorOptions}; `cause` reaches `Error.cause` only when present
	 */
	constructor(code: ContextErrorCode, message: string, options?: CodedErrorOptions) {
		super(message, options?.cause === undefined ? undefined : { cause: options.cause })
		this.name = 'ContextError'
		INTRINSICS.define(this, Symbol.for('@orkestrel/agent.ContextError'), { value: this })
		this.code = code
		this.context = options?.context
	}
}

/**
 * Narrows an unknown caught value to a {@link ContextError} through its identity brand and declared members, so a
 * `catch` can branch on its `code`.
 *
 * @param value - The value to test (typically a `catch` binding)
 * @returns True if `value` is a {@link ContextError}; false otherwise
 *
 * @example
 * ```ts
 * try {
 * 	new MemoManager({ snapshot })
 * } catch (error) {
 * 	if (isContextError(error) && error.code === 'SNAPSHOT') discard(snapshot)
 * }
 * ```
 */
export function isContextError(value: unknown): value is ContextError {
	return holds(() => {
		if (
			!(
				value instanceof Error &&
				INTRINSICS.prototype(value) !== Error.prototype &&
				INTRINSICS.describe(value, Symbol.for('@orkestrel/agent.ContextError'))?.value === value
			)
		)
			return false
		const code = INTRINSICS.reflect.read(value, 'code')
		if (code !== 'SNAPSHOT') return false
		const context = INTRINSICS.reflect.read(value, 'context')
		return context === undefined || isObject(context) || isFunction(context)
	})
}
