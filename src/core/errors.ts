import type {
	AgentResult,
	ProviderErrorCode,
	ProviderErrorOptions,
	ProviderResult,
} from './types.js'
import { isInstance } from '@orkestrel/contract'

// A real error type, not a sentinel. `stream` throws a
// ProviderAbortError when its bound signal aborts mid-flight, carrying the partial
// result it had assembled so far so the agent loop can recover the streamed content
// on cancellation. The guard narrows a caught value with `instanceof`.

/**
 * Reports a provider stream cancelled mid-flight by its bound signal — thrown by a
 * {@link ProviderInterface}'s `stream`, carrying the {@link ProviderResult} assembled from
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

// A real error type, not a sentinel. An agent job treats a partial result
// (a job committed early from an abort / budget / timeout) as a failure by default — the
// queue / runner handler throws this so the Queue's retries + a Runner's fail-fast
// engage. It carries the partial AgentResult so a caller (or a `retries: 0` enqueue that
// rejects with it) can still inspect what accumulated. The guard narrows with
// `instanceof`, mirroring ProviderAbortError / isProviderAbortError above.

/**
 * Reports an {@link AgentInterface} run that ended {@link AgentResult.partial} under a
 * `partial` policy of `false` (the default) — thrown by an agent-job handler (a
 * `createAgentQueue` / `createAgentRunner` job), carrying the partial {@link AgentResult} so
 * the failure stays inspectable, and the machine-readable `code` `'PARTIAL'`.
 *
 * @remarks
 * A partial result means the agent was cancelled (an external `signal` abort, a queue /
 * runner abort threaded in, a `timeout` deadline, or an exhausted token `budget`) rather
 * than finishing naturally. For a durable job that is a failure by default: throwing this
 * lets the Queue's retries re-run the job and a Runner's fail-fast abort its siblings.
 * Set `partial: true` (see `AgentQueueOptions` / `AgentRunnerOptions`) to treat a
 * partial as success instead, in which case this is never thrown. Narrow a caught value
 * with {@link isAgentJobError} to read `partial`. `code` is the machine-readable condition
 * (`'PARTIAL'` — the only one this error reports), so a `catch` branches on it rather than on
 * the message string.
 */
export class AgentJobError extends Error {
	/** Names the machine-readable condition — `'PARTIAL'`: a job that ended partial under a disallowing policy. */
	readonly code = 'PARTIAL' as const
	/** Holds the partial {@link AgentResult} the cancelled job produced. */
	readonly partial: AgentResult

	constructor(message: string, partial: AgentResult) {
		super(message)
		this.name = 'AgentJobError'
		this.partial = partial
	}
}

/**
 * Narrows an unknown caught value to an {@link AgentJobError} through `instanceof`, so a
 * `catch` can recover its `partial` result.
 *
 * @param value - The value to test (typically a `catch` binding or a rejected enqueue)
 * @returns True if `value` is an {@link AgentJobError}; false otherwise
 *
 * @example
 * ```ts
 * try {
 * 	await queue.enqueue(job) // retries: 0 → a partial rejects with the error
 * } catch (error) {
 * 	if (isAgentJobError(error)) keep(error.partial.content) // recover the partial content
 * }
 * ```
 */
export function isAgentJobError(value: unknown): value is AgentJobError {
	return isInstance(value, AgentJobError)
}

// A real error type, not a sentinel. A `ConversationInterface.compact()` is a
// programmer error when no `ConversationSummaryHandler` was supplied — there is nothing to fold
// the messages with — so it throws this, carrying a machine-readable `code` ('SUMMARIZER')
// so a `catch` branches on `error.code` instead of parsing the message. The guard narrows a
// caught value with `instanceof`, mirroring the other errors in this file.

/**
 * Reports a conversation with no {@link ConversationSummaryHandler} to fold its messages with,
 * or with a `sections` cap below `1` — thrown by a {@link ConversationInterface}'s `compact()`
 * or its construction, carrying the machine-readable `code`
 * `'SUMMARIZER' | 'SECTIONS'`.
 *
 * @remarks
 * Compaction requires a summarizer (it digests the folded slice into a section summary and
 * regenerates the rollup); a conversation created without one can still store + `view()` its
 * live tail, but a `compact()` is a programmer error and throws this with `'SUMMARIZER'`.
 * A `sections` cap (on {@link import('./types.js').ConversationOptions} /
 * {@link import('./types.js').ConversationManagerOptions} /
 * {@link import('./types.js').CompactOptions}) must be `>= 1` — a sub-1 cap is a programmer
 * error and throws this with `'SECTIONS'`. Narrow a caught value with
 * {@link isConversationError} and branch on `error.code`.
 */
export class ConversationError extends Error {
	/** Names the machine-readable condition — `'SUMMARIZER'`: a `compact()` with no summarizer; `'SECTIONS'`: a sub-1 `sections` cap. */
	readonly code: 'SUMMARIZER' | 'SECTIONS'

	constructor(code: 'SUMMARIZER' | 'SECTIONS', message: string) {
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

// A real error type, not a sentinel. Concurrent runs on one Agent whose
// construction carries a shared accounting instance (a `window` context budget, or a
// construction-level `budget` with no per-run override) would corrupt that shared
// accounting — so `stream()` throws this synchronously, before any state mutation or
// emit, rather than letting the runs race. An `AgentRegistry` accessor throws it too, when a
// rehydration name is absent from its pool. Carries a machine-readable `code` so a `catch`
// branches on `error.code`, mirroring `ConversationError` above.

/**
 * Reports a concurrent run that would corrupt shared per-agent accounting, or a rehydration
 * name absent from its registry pool — thrown synchronously by an {@link AgentInterface}'s
 * `stream()` (and so by `generate()`, which calls it) and by an
 * {@link AgentRegistryInterface}'s accessors, carrying the machine-readable `code`
 * `'CONCURRENCY' | 'REGISTRY'`. Synchronous means a fire-and-forget
 * `agent.generate().catch(…)` never catches it: `await` the call inside `try`/`catch`, or wrap
 * the call expression itself.
 *
 * @remarks
 * `'CONCURRENCY'` reports a run already in flight on the same agent, plus a construction-level
 * `window` (a shared context budget) or a construction-level `budget` with no per-run override
 * (a shared cost budget) — a second concurrent `stream()` would race its charges against the
 * same shared instance, corrupting the accounting. Use separate agents, or per-run `budget`
 * overrides with no `window`, for genuinely concurrent runs. `'REGISTRY'` reports a rehydration
 * name absent from its registry pool, on `provider` / `tool` / `authority` / `scheduler` /
 * `build`. Narrow a caught value with {@link isAgentError} and branch on `error.code`.
 */
export class AgentError extends Error {
	/** Names the machine-readable condition — `'CONCURRENCY'`: a concurrent run on a shared accounting agent; `'REGISTRY'`: a rehydration name absent from its registry pool. */
	readonly code: 'CONCURRENCY' | 'REGISTRY'

	constructor(code: 'CONCURRENCY' | 'REGISTRY', message: string) {
		super(message)
		this.name = 'AgentError'
		this.code = code
	}
}

/**
 * Narrows an unknown caught value to an {@link AgentError} through `instanceof`, so a `catch`
 * can branch on its `code`.
 *
 * @param value - The value to test (typically a `catch` binding)
 * @returns True if `value` is an {@link AgentError}; false otherwise
 *
 * @example
 * ```ts
 * try {
 * 	agent.stream()
 * } catch (error) {
 * 	if (isAgentError(error) && error.code === 'CONCURRENCY') useSeparateAgents()
 * }
 * ```
 */
export function isAgentError(value: unknown): value is AgentError {
	return isInstance(value, AgentError)
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
 * Narrows a caught value to the provider failure class through instanceof.
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
