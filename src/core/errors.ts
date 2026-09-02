import type { AgentResult, ProviderResult } from './types.js'

// AGENTS §12: a real error type, not a sentinel. `stream` throws a
// ProviderAbortError when its bound signal aborts mid-flight, carrying the partial
// result it had assembled so far so the agent loop can recover the streamed content
// on cancellation. The guard narrows a caught value with `instanceof`.

/**
 * Reports a provider stream cancelled mid-flight by its bound signal — thrown by a
 * {@link ProviderInterface}'s `stream`, carrying the {@link ProviderResult} assembled
 * from whatever streamed before the cancel.
 *
 * @remarks
 * Lets a caller recover the partial content (and any tool calls / usage seen so far)
 * on cancellation: `catch` the throw, narrow with {@link isProviderAbortError}, and
 * read `partial`. `code` is the machine-readable condition (`'ABORT'` — the only one this
 * error reports), so a `catch` branches on it rather than on the message string.
 */
export class ProviderAbortError extends Error {
	/** Names the machine-readable condition — `'ABORT'`: a stream cancelled mid-flight. */
	readonly code = 'ABORT' as const
	readonly partial: ProviderResult

	constructor(partial: ProviderResult) {
		super('provider stream aborted')
		this.name = 'ProviderAbortError'
		this.partial = partial
	}
}

/**
 * Narrows an unknown caught value to a {@link ProviderAbortError}.
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
	return value instanceof ProviderAbortError
}

// AGENTS §12: a real error type, not a sentinel. An agent JOB treats a partial result
// (a job committed early from an abort / budget / timeout) as a FAILURE by default — the
// queue / runner handler THROWS this so the Queue's retries + a Runner's fail-fast
// engage. It carries the partial AgentResult so a caller (or a `retries: 0` enqueue that
// rejects with it) can still inspect what accumulated. The guard narrows with
// `instanceof`, mirroring ProviderAbortError / isProviderAbortError above.

/**
 * Reports an {@link AgentInterface} run that ended {@link AgentResult.partial} under a
 * `partial` policy of `false` (the default) — thrown by an agent-job handler (a
 * `createAgentQueue` / `createAgentRunner` job), carrying the partial
 * {@link AgentResult} so the failure stays inspectable.
 *
 * @remarks
 * A partial result means the agent was cancelled (an external `signal` abort, a queue /
 * runner abort threaded in, a `timeout` deadline, or an exhausted token `budget`) rather
 * than finishing naturally. For a durable JOB that is a failure by default: throwing this
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
 * Narrows an unknown caught value to an {@link AgentJobError}.
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
	return value instanceof AgentJobError
}

// AGENTS §12: a real error type, not a sentinel. A `ConversationInterface.compact()` is a
// PROGRAMMER error when no `ConversationSummaryHandler` was supplied — there is nothing to fold
// the messages with — so it THROWS this, carrying a machine-readable `code` ('SUMMARIZER')
// so a `catch` branches on `error.code` instead of parsing the message. The guard narrows a
// caught value with `instanceof`, mirroring the other errors in this file.

/**
 * Reports a conversation with no {@link ConversationSummaryHandler} to fold its messages
 * with, or with a structurally invalid `sections` cap — thrown by a
 * {@link ConversationInterface}'s `compact()`, carrying a machine-readable `code`.
 *
 * @remarks
 * Compaction REQUIRES a summarizer (it digests the folded slice into a section summary and
 * regenerates the rollup); a conversation created without one can still store + `view()` its
 * live tail, but a `compact()` is a programmer error (§12) and throws this with `'SUMMARIZER'`.
 * A `sections` cap (§F2, on {@link import('./types.js').ConversationOptions} /
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
 * Narrows an unknown caught value to a {@link ConversationError}.
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
	return value instanceof ConversationError
}

// AGENTS §12: a real error type, not a sentinel. Concurrent runs on one Agent whose
// construction carries a SHARED accounting instance (a `window` context budget, or a
// construction-level `budget` with no per-run override) would corrupt that shared
// accounting — so `stream()` throws this SYNCHRONOUSLY, before any state mutation or
// emit, rather than letting the runs race. Carries a machine-readable `code` ('CONCURRENCY')
// so a `catch` branches on `error.code`, mirroring `ConversationError` above.

/**
 * Reports a concurrent run that would corrupt SHARED per-agent accounting — thrown
 * synchronously by an {@link AgentInterface}'s `stream()`, carrying a machine-readable `code`.
 *
 * @remarks
 * A run already in flight on the same agent, PLUS a construction-level `window` (a shared
 * context budget) or a construction-level `budget` with no per-run override (a shared cost
 * budget), means a second concurrent `stream()` would race its charges against the same
 * shared instance — corrupting the accounting. `code` is `'CONCURRENCY'` (the only condition
 * so far). Use separate agents, or per-run `budget` overrides with no `window`, for genuinely
 * concurrent runs. Narrow a caught value with {@link isAgentError} and branch on `error.code`.
 */
export class AgentError extends Error {
	/** Names the machine-readable condition — `'CONCURRENCY'`: a concurrent run on a shared accounting agent. */
	readonly code: 'CONCURRENCY'

	constructor(code: 'CONCURRENCY', message: string) {
		super(message)
		this.name = 'AgentError'
		this.code = code
	}
}

/**
 * Narrows an unknown caught value to an {@link AgentError}.
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
	return value instanceof AgentError
}
