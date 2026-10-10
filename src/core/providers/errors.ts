import type {
	JudgeErrorCode,
	ProviderErrorCode,
	ProviderErrorOptions,
	ProviderResult,
} from './types.js'
import { isInstance } from '@orkestrel/contract'

/**
 * Reports a provider stream cancelled mid-flight by its bound signal — thrown by the
 * `stream` method of a {@link ProviderInterface}, carrying the {@link ProviderResult} assembled from
 * whatever streamed before the cancel and the machine-readable `code` `'ABORT'`.
 *
 * @remarks
 * Lets a caller recover the partial content (and any tool calls / usage seen so far)
 * on cancellation: `catch` the throw, narrow with {@link isProviderAbortError}, and
 * read `partial`. `code` is the machine-readable condition (`'ABORT'` — the only one this
 * error reports), so a `catch` branches on it rather than on the message string. `cause`
 * holds the failure the cancel superseded when a throw raced the abort — the wire decoder's
 * {@link ProviderError}, say — and is undefined when the cancel was the only failure.
 */
export class ProviderAbortError extends Error {
	/** Names the machine-readable condition — `'ABORT'`: a stream cancelled mid-flight. */
	readonly code = 'ABORT' as const
	readonly partial: ProviderResult

	constructor(partial: ProviderResult, options?: ErrorOptions) {
		super('provider stream aborted', options)
		this.name = 'ProviderAbortError'
		this.partial = partial
	}
}

/**
 * Narrows an unknown caught value to a {@link ProviderAbortError} through `instanceof`, so a
 * `catch` can recover its `partial` result.
 *
 * @param value - The value to test (typically a `catch` binding)
 * @returns True if `value` is a {@link ProviderAbortError}; false otherwise
 *
 * @example
 * ```ts
 * try {
 * 	for await (const delta of provider.stream(messages, signal)) render(delta)
 * } catch (error) {
 * 	if (isProviderAbortError(error)) keep(error.partial.content) // recover partial
 * }
 * ```
 */
export function isProviderAbortError(value: unknown): value is ProviderAbortError {
	return isInstance(value, ProviderAbortError)
}

/**
 * Reports a coded provider failure with its HTTP status and underlying cause when available.
 *
 * @remarks
 * The provider base throws this error for a non-OK HTTP response, a missing response
 * body, or a missing settled result when strict assembly is enabled. Concrete wire
 * decoders also use it for malformed records and relayed provider failures.
 * `status` is present only for an `HTTP` failure; other codes leave it undefined.
 */
export class ProviderError extends Error {
	/** Names the machine-readable condition — `'HTTP'`: a non-OK response, including a relay refusing an oversized request with 413; `'PROTOCOL'`: a missing response body, a malformed wire record, or a strict stream with no settled result; `'PROVIDER'`: an upstream failure carried by a relay error record. */
	readonly code: ProviderErrorCode
	/** Holds the response status for an HTTP failure, or undefined for other codes. */
	readonly status: number | undefined

	constructor(code: ProviderErrorCode, message: string, options?: ProviderErrorOptions) {
		super(message, options)
		this.name = 'ProviderError'
		this.code = code
		this.status = options?.status
	}
}

/**
 * Narrows a caught value to the provider failure class through `instanceof`.
 *
 * @param value - The caught value
 * @returns True if the value is a provider failure; false otherwise
 * @example
 * ```ts
 * isProviderError(new ProviderError('HTTP', 'unavailable', { status: 503 })) // true
 * ```
 */
export function isProviderError(value: unknown): value is ProviderError {
	return isInstance(value, ProviderError)
}

/**
 * Reports a coded judge failure with its HTTP status and underlying cause when available.
 *
 * @remarks
 * The judge engine throws this error for a non-OK HTTP response, a missing or unparsable
 * response body, and a request refused before inference. Concrete wire decoders also use it for
 * a response they cannot read and for a wire limit. `status` is present only for an `HTTP`
 * failure; other codes leave it undefined.
 */
export class JudgeError extends Error {
	/** Names the machine-readable condition — `'HTTP'`: a non-OK response; `'PROTOCOL'`: a missing, unparsable, or unreadable response body; `'QUESTION'`: a request refused before inference. */
	readonly code: JudgeErrorCode
	/** Holds the response status for an HTTP failure, or undefined for other codes. */
	readonly status: number | undefined

	constructor(code: JudgeErrorCode, message: string, options?: ProviderErrorOptions) {
		super(message, options)
		this.name = 'JudgeError'
		this.code = code
		this.status = options?.status
	}
}

/**
 * Narrows a caught value to the judge failure class through `instanceof`.
 *
 * @param value - The caught value
 * @returns True if the value is a {@link JudgeError}; false otherwise
 * @example
 * ```ts
 * isJudgeError(new JudgeError('HTTP', 'judge error: 429', { status: 429 })) // true
 * ```
 */
export function isJudgeError(value: unknown): value is JudgeError {
	return isInstance(value, JudgeError)
}
