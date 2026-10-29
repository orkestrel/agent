import type { ConversationErrorCode } from './types.js'
import type { CodedErrorOptions } from '../types.js'
import { INTRINSICS, holds, isObject, isFunction } from '@orkestrel/contract'

/**
 * Reports a conversation with no {@link ConversationSummaryHandler} to fold its messages with, a
 * `sections` cap below `1`, a `keep` that is not a nonnegative safe integer, or a judgment or
 * judge request that JSON cannot carry — thrown by the `compact()` method of a
 * {@link ConversationInterface}, its construction, or its judgment store, carrying the
 * machine-readable `code` `'SUMMARIZER' | 'SECTIONS' | 'JUDGMENT' | 'KEEP'`.
 *
 * @remarks
 * Compaction requires a summarizer (it digests the folded slice into a section summary); a
 * conversation created without one can still store + `view()` its live tail, but a `compact()`
 * is a programmer error and throws this with `'SUMMARIZER'`.
 * A `sections` cap (on {@link import('./types.js').ConversationOptions} /
 * {@link import('./types.js').ConversationManagerOptions} /
 * {@link import('./types.js').CompactOptions}) must be `>= 1`, and cannot combine with
 * `rolling` — either is a programmer error and throws this with `'SECTIONS'`. A `keep` on the same options must be a nonnegative
 * safe integer — any other value is a programmer error and throws this with `'KEEP'`. A judgment
 * record or a judge request that JSON cannot carry, or whose copy fails its guard, is a
 * programmer error and throws this with `'JUDGMENT'`, its `context` naming the `question` id
 * where one exists. Narrow a caught value with {@link isConversationError} and branch on
 * `error.code`.
 */
export class ConversationError extends Error {
	/** Names the machine-readable condition — `'SUMMARIZER'`: a `compact()` with no summarizer; `'SECTIONS'`: a sub-1 `sections` cap, or a cap combined with `rolling`; `'JUDGMENT'`: a judgment or judge request that is not JSON; `'KEEP'`: a `keep` that is not a nonnegative safe integer. */
	readonly code: ConversationErrorCode
	/** Holds the values that locate the failure, such as the `question` id of a malformed question, or `undefined` when none were supplied. */
	readonly context: Readonly<Record<string, unknown>> | undefined

	/**
	 * Creates the error with its code, message, and optional cause and context.
	 *
	 * @param code - The machine-readable {@link ConversationErrorCode}
	 * @param message - The human-readable description
	 * @param options - The optional {@link CodedErrorOptions}; `cause` reaches `Error.cause` only when present
	 */
	constructor(code: ConversationErrorCode, message: string, options?: CodedErrorOptions) {
		super(message, options?.cause === undefined ? undefined : { cause: options.cause })
		this.name = 'ConversationError'
		INTRINSICS.define(this, Symbol.for('@orkestrel/agent.ConversationError'), { value: this })
		this.code = code
		this.context = options?.context
	}
}

/**
 * Narrows an unknown caught value to a {@link ConversationError} through its identity brand and declared members, so a
 * `catch` can branch on its `code`.
 *
 * @param value - The value to test (typically a `catch` binding)
 * @returns True if `value` is a {@link ConversationError}; false otherwise
 *
 * @example
 * ```ts
 * try {
 * 	await conversation.compact()
 * } catch (error) {
 * 	if (isConversationError(error) && error.code === 'SUMMARIZER') addSummarizer()
 * }
 * ```
 */
export function isConversationError(value: unknown): value is ConversationError {
	return holds(() => {
		if (
			!(
				value instanceof Error &&
				INTRINSICS.prototype(value) !== Error.prototype &&
				INTRINSICS.describe(value, Symbol.for('@orkestrel/agent.ConversationError'))?.value ===
					value
			)
		)
			return false
		const code = INTRINSICS.reflect.read(value, 'code')
		if (!(code === 'SUMMARIZER' || code === 'SECTIONS' || code === 'JUDGMENT' || code === 'KEEP'))
			return false
		const context = INTRINSICS.reflect.read(value, 'context')
		return context === undefined || isObject(context) || isFunction(context)
	})
}
