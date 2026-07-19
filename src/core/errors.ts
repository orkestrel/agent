import type { AgentResult, ProviderResult, WorkspaceErrorCode } from './types.js'

// AGENTS §12: a real error type, not a sentinel. `stream` throws a
// ProviderAbortError when its bound signal aborts mid-flight, carrying the partial
// result it had assembled so far so the agent loop can recover the streamed content
// on cancellation. The guard narrows a caught value with `instanceof`.

/**
 * Thrown by a {@link ProviderInterface}'s `stream` when its bound signal aborts
 * mid-flight — carries the {@link ProviderResult} assembled from whatever streamed
 * before the cancel.
 *
 * @remarks
 * Lets a caller recover the partial content (and any tool calls / usage seen so far)
 * on cancellation: `catch` the throw, narrow with {@link isProviderAbortError}, and
 * read `partial`.
 */
export class ProviderAbortError extends Error {
	readonly partial: ProviderResult

	constructor(partial: ProviderResult) {
		super('provider stream aborted')
		this.name = 'ProviderAbortError'
		this.partial = partial
	}
}

/**
 * Narrow an unknown caught value to a {@link ProviderAbortError}.
 *
 * @param value - The value to test (typically a `catch` binding)
 * @returns `true` when `value` is a {@link ProviderAbortError}
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
 * Thrown by an agent-job handler (a `createAgentQueue` / `createAgentRunner` job) when
 * its {@link AgentInterface} run ended {@link AgentResult.partial} and the job's
 * `allowPartial` policy is `false` (the default) — carries the partial
 * {@link AgentResult} so the failure stays inspectable.
 *
 * @remarks
 * A partial result means the agent was cancelled (an external `signal` abort, a queue /
 * runner abort threaded in, a `timeout` deadline, or an exhausted token `budget`) rather
 * than finishing naturally. For a durable JOB that is a failure by default: throwing this
 * lets the Queue's retries re-run the job and a Runner's fail-fast abort its siblings.
 * Set `allowPartial: true` (see `AgentQueueOptions` / `AgentRunnerOptions`) to treat a
 * partial as success instead, in which case this is never thrown. Narrow a caught value
 * with {@link isAgentJobError} to read `partial`.
 */
export class AgentJobError extends Error {
	/** The partial {@link AgentResult} the cancelled job produced. */
	readonly partial: AgentResult

	constructor(message: string, partial: AgentResult) {
		super(message)
		this.name = 'AgentJobError'
		this.partial = partial
	}
}

/**
 * Narrow an unknown caught value to an {@link AgentJobError}.
 *
 * @param value - The value to test (typically a `catch` binding or a rejected enqueue)
 * @returns `true` when `value` is an {@link AgentJobError}
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
// PROGRAMMER error when no `ConversationSummarizer` was supplied — there is nothing to fold
// the messages with — so it THROWS this, carrying a machine-readable `code` ('SUMMARIZER')
// so a `catch` branches on `error.code` instead of parsing the message. The guard narrows a
// caught value with `instanceof`, mirroring the other errors in this file.

/**
 * Thrown by a {@link ConversationInterface}'s `compact()` when the conversation has no
 * {@link ConversationSummarizer} to fold its messages with, or when its `sections` cap is
 * structurally invalid — carries a machine-readable `code`.
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
	/** The machine-readable condition — `'SUMMARIZER'`: a `compact()` with no summarizer; `'SECTIONS'`: a sub-1 `sections` cap. */
	readonly code: 'SUMMARIZER' | 'SECTIONS'

	constructor(code: 'SUMMARIZER' | 'SECTIONS', message: string) {
		super(message)
		this.name = 'ConversationError'
		this.code = code
	}
}

/**
 * Narrow an unknown caught value to a {@link ConversationError}.
 *
 * @param value - The value to test (typically a `catch` binding)
 * @returns `true` when `value` is a {@link ConversationError}
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

// AGENTS §12: a text-only edit aimed at an image file, an invalid search/replace pattern,
// or a structurally invalid edit range `throw`s a `WorkspaceError` carrying a
// machine-readable `code`, so a `catch` branches on `error.code` instead of parsing the
// message. The optional `context` bag names the offending path / range. Optional lookups
// (`file`, a plain `read` of an absent or image path) return `undefined` — they never throw.

/**
 * An error thrown by the in-memory {@link import('./workspaces/Workspace.js').Workspace} edit
 * surface.
 *
 * @remarks
 * Carries a {@link WorkspaceErrorCode} and an optional `context` bag naming the offending
 * path / range. Thrown for a text-only operation aimed at an image file (`MODALITY` — a
 * ranged read / write, `prepend`, or `append`), an invalid `search` / `replace` regular
 * expression (`PATTERN`), and a structurally invalid ranged-write {@link import('./types.js').Range}
 * (`RANGE` — inverted, or a sub-1 line / column).
 */
export class WorkspaceError extends Error {
	readonly code: WorkspaceErrorCode
	readonly context?: Readonly<Record<string, unknown>>

	constructor(
		code: WorkspaceErrorCode,
		message: string,
		context?: Readonly<Record<string, unknown>>,
	) {
		super(message)
		this.name = 'WorkspaceError'
		this.code = code
		this.context = context
	}
}

/**
 * Narrow an unknown caught value to a {@link WorkspaceError}.
 *
 * @param value - The value to test (typically a `catch` binding)
 * @returns `true` when `value` is a {@link WorkspaceError}
 *
 * @example
 * ```ts
 * try {
 * 	workspace.prepend('icon.png', '// header')
 * } catch (error) {
 * 	if (isWorkspaceError(error) && error.code === 'MODALITY') skipBinary()
 * }
 * ```
 */
export function isWorkspaceError(value: unknown): value is WorkspaceError {
	return value instanceof WorkspaceError
}

// AGENTS §12: a real error type, not a sentinel. Concurrent runs on one Agent whose
// construction carries a SHARED accounting instance (a `window` context budget, or a
// construction-level `budget` with no per-run override) would corrupt that shared
// accounting — so `stream()` throws this SYNCHRONOUSLY, before any state mutation or
// emit, rather than letting the runs race. Carries a machine-readable `code` ('CONCURRENCY')
// so a `catch` branches on `error.code`, mirroring `ConversationError` above.

/**
 * Thrown synchronously by an {@link AgentInterface}'s `stream()` when a concurrent run would
 * corrupt SHARED per-agent accounting — carries a machine-readable `code`.
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
	/** The machine-readable condition — `'CONCURRENCY'`: a concurrent run on a shared accounting agent. */
	readonly code: 'CONCURRENCY'

	constructor(code: 'CONCURRENCY', message: string) {
		super(message)
		this.name = 'AgentError'
		this.code = code
	}
}

/**
 * Narrow an unknown caught value to an {@link AgentError}.
 *
 * @param value - The value to test (typically a `catch` binding)
 * @returns `true` when `value` is an {@link AgentError}
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
