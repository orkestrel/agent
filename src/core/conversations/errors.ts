import { isInstance } from '@orkestrel/contract'

/**
 * Reports a conversation with no {@link ConversationSummaryHandler} to fold its messages with, a
 * `sections` cap below `1`, or a judgment or judge request that JSON cannot carry — thrown by the
 * `compact()` method of a {@link ConversationInterface}, its construction, or its judgment store,
 * carrying the machine-readable `code` `'SUMMARIZER' | 'SECTIONS' | 'JUDGMENT'`.
 *
 * @remarks
 * Compaction requires a summarizer (it digests the folded slice into a section summary); a
 * conversation created without one can still store + `view()` its live tail, but a `compact()`
 * is a programmer error and throws this with `'SUMMARIZER'`.
 * A `sections` cap (on {@link import('./types.js').ConversationOptions} /
 * {@link import('./types.js').ConversationManagerOptions} /
 * {@link import('./types.js').CompactOptions}) must be `>= 1` — a sub-1 cap is a programmer
 * error and throws this with `'SECTIONS'`. A judgment record or a judge request that JSON cannot
 * carry, or whose copy fails its guard, is a programmer error and throws this with `'JUDGMENT'`.
 * Narrow a caught value with
 * {@link isConversationError} and branch on `error.code`.
 */
export class ConversationError extends Error {
	/** Names the machine-readable condition — `'SUMMARIZER'`: a `compact()` with no summarizer; `'SECTIONS'`: a sub-1 `sections` cap; `'JUDGMENT'`: a judgment or judge request that is not JSON. */
	readonly code: 'SUMMARIZER' | 'SECTIONS' | 'JUDGMENT'

	constructor(code: 'SUMMARIZER' | 'SECTIONS' | 'JUDGMENT', message: string) {
		super(message)
		this.name = 'ConversationError'
		this.code = code
	}
}

/**
 * Narrows an unknown caught value to a {@link ConversationError} through `instanceof`, so a
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
	return isInstance(value, ConversationError)
}
