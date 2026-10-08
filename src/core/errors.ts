import type { JudgeResult } from './types.js'
import { isInstance } from '@orkestrel/contract'

/**
 * Reports a judge call cancelled by the caller's signal or its deadline, carrying the
 * {@link JudgeResult} merged from the calls that completed before the cancel and the
 * machine-readable `code` `'ABORT'`.
 *
 * @remarks
 * `partial` keeps the answers and the usage of every completed call, so usage reported by
 * completed calls is retained; a cancel before the first call carries an empty partial. `cause` holds the failure the
 * cancel superseded when a throw raced the abort, and is undefined when the cancel was the only
 * failure.
 */
export class JudgeAbortError extends Error {
	/** Names the machine-readable condition — `'ABORT'`: a judge call cancelled mid-flight. */
	readonly code = 'ABORT' as const
	readonly partial: JudgeResult

	constructor(partial: JudgeResult, options?: ErrorOptions) {
		super('judge call aborted', options)
		this.name = 'JudgeAbortError'
		this.partial = partial
	}
}

/**
 * Narrows a caught value to a {@link JudgeAbortError} through `instanceof`, so a `catch` can
 * recover its `partial` result.
 *
 * @param value - The caught value
 * @returns True if the value is a {@link JudgeAbortError}; false otherwise
 * @example
 * ```ts
 * isJudgeAbortError(new JudgeAbortError({ model: 'tev1:0.8b', answers: {} })) // true
 * ```
 */
export function isJudgeAbortError(value: unknown): value is JudgeAbortError {
	return isInstance(value, JudgeAbortError)
}
