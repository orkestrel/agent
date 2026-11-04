import type { ConversationErrorCode } from './types.js'
import type { CodedErrorOptions } from '../types.js'
import { INTRINSICS, holds, isObject, isFunction } from '@orkestrel/contract'

/**
 * Reports a conversation with no {@link ConversationSummaryHandler} to fold its messages with, a
 * `sections` cap that is not a positive safe integer, a `keep` that is not a nonnegative safe integer, a summarizer digest
 * whose trimmed text is empty, a judgment or judge request that JSON cannot carry, a stored or
 * selected message whose role is not a conversation role, or a malformed snapshot — thrown by the
 * `compact()` and `add` methods of a {@link ConversationInterface}, its construction, or its
 * judgment store, or returned as the `fault` of an agent selection, carrying the machine-readable
 * `code` `'SUMMARIZER' | 'SECTIONS' | 'JUDGMENT' | 'KEEP' | 'SUMMARY' | 'ROLE' | 'MESSAGE' | 'SNAPSHOT' | 'ID'`.
 *
 * @remarks
 * Compaction requires a summarizer (it digests the folded slice into a section summary); a
 * conversation created without one can still store + `view()` its live tail, but a `compact()`
 * is a programmer error and throws this with `'SUMMARIZER'`.
 * A `sections` cap (on {@link import('./types.js').ConversationOptions} /
 * {@link import('./types.js').ConversationManagerOptions} /
 * {@link import('./types.js').CompactOptions}) must be a positive safe integer, and cannot combine with
 * `cumulative` — either is a programmer error and throws this with `'SECTIONS'`. A `keep` on the same options must be a nonnegative
 * safe integer — any other value is a programmer error and throws this with `'KEEP'`. A judgment
 * record or a judge request that JSON cannot carry, or whose copy fails its guard, is a
 * programmer error and throws this with `'JUDGMENT'`, its `context` naming the `question` id
 * where one exists. A summarizer digest whose trimmed text is empty rejects the `compact()` with
 * `'SUMMARY'`. A stored message plays a `ConversationRole`: `add` refuses any other role with
 * `'ROLE'` before it stores any message of the batch, a hydrating snapshot that holds one throws
 * `'ROLE'`, and an agent's selection that holds one becomes a `'ROLE'` fault. `add` refuses an input
 * whose other members fail `isMessageInput` with `'MESSAGE'`, its `context` holding the `faults`,
 * before it stores any message of the batch. A hydrating snapshot that fails
 * `isConversationSnapshot` or repeats an id, and a store row or written snapshot that does, throw
 * `'SNAPSHOT'`; a judgment the guard admits but JSON cannot carry still throws `'JUDGMENT'`. A
 * manager's `add` of an id it already holds throws `'ID'`. Narrow a caught value with
 * {@link isConversationError} and branch on `error.code`.
 */
export class ConversationError extends Error {
	/** Names the machine-readable condition — `'SUMMARIZER'`: a `compact()` with no summarizer; `'SECTIONS'`: a `sections` cap that is not a positive safe integer, or a cap combined with `cumulative`; `'JUDGMENT'`: a judgment or judge request that is not JSON; `'KEEP'`: a `keep` that is not a nonnegative safe integer; `'SUMMARY'`: a summarizer digest whose trimmed text is empty; `'ROLE'`: a stored or selected message whose role is not a `ConversationRole`; `'MESSAGE'`: a message input whose other members fail `isMessageInput`; `'SNAPSHOT'`: a snapshot that fails `isConversationSnapshot` or repeats an id; `'ID'`: a manager's `add` of an id it already holds. */
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
		if (
			!(
				code === 'SUMMARIZER' ||
				code === 'SECTIONS' ||
				code === 'JUDGMENT' ||
				code === 'KEEP' ||
				code === 'SUMMARY' ||
				code === 'ROLE' ||
				code === 'MESSAGE' ||
				code === 'SNAPSHOT' ||
				code === 'ID'
			)
		)
			return false
		const context = INTRINSICS.reflect.read(value, 'context')
		return context === undefined || isObject(context) || isFunction(context)
	})
}
