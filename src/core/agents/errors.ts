import type { AgentErrorCode, AgentResult } from './types.js'
import type { CodedErrorOptions } from '../types.js'
import { isInstance } from '@orkestrel/contract'

// A real error type, not a sentinel. An agent job treats a partial result
// (a job committed early from an abort / budget / timeout) as a failure by default — the
// queue / runner handler throws this so the Queue's retries + a Runner's fail-fast
// engage. It carries the partial AgentResult so a caller (or a `retries: 0` enqueue that
// rejects with it) can still inspect what accumulated. The guard narrows with
// `instanceof`, mirroring `ProviderAbortError` and `isProviderAbortError` in `providers/errors.ts`.

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

// A real error type, not a sentinel. A run that would share an accounting instance with a live
// run would corrupt that accounting, so `stream()` throws this synchronously, before any state
// mutation or emit, rather than letting the runs race. Carries a machine-readable `code` so a
// `catch` branches on `error.code`, mirroring `ConversationError` in `conversations/errors.ts`.

/**
 * Reports a run sharing accounting with a live run, a `limit` that is not a nonnegative safe integer, or a name absent from a registry pool. Agent construction, the `stream` and `generate` methods, and registry accessors throw synchronously, before returning a handle or promise. Await the call inside `try`/`catch` to catch it.
 *
 * @remarks
 * `'CONCURRENCY'` reports a run started while another run on the same agent is live, when the
 * agent carries a `window` (a shared context budget) or when the run's effective `budget` is the
 * instance a live run holds — the second run's `start()` would replace the budget's signal and
 * race its charges against the first run's. Use separate agents, or a distinct budget instance
 * per run with no `window`, for concurrent runs. Its `context` names the `agent` id.
 * `'LIMIT'` reports a construction or per-run `limit` that is not a nonnegative safe integer,
 * including one a rehydrated job carries into `build`. `'REGISTRY'` reports a rehydration name
 * absent from its registry pool, on `provider` / `tool` / `authority` / `scheduler` / `build`;
 * its `context` names the `category` and the `name`. Narrow a caught value with
 * {@link isAgentError} and branch on `error.code`.
 */
export class AgentError extends Error {
	/** Names the machine-readable condition — `'CONCURRENCY'`: a run sharing accounting with a live run; `'LIMIT'`: a `limit` that is not a nonnegative safe integer; `'REGISTRY'`: a rehydration name absent from its registry pool. */
	readonly code: AgentErrorCode
	/** Holds the values that locate the failure, such as the `agent` id of a refused run, or `undefined` when none were supplied. */
	readonly context: Readonly<Record<string, unknown>> | undefined

	/**
	 * Creates the error with its code, message, and optional cause and context.
	 *
	 * @param code - The machine-readable {@link AgentErrorCode}
	 * @param message - The human-readable description
	 * @param options - The optional {@link CodedErrorOptions}; `cause` reaches `Error.cause` only when present
	 */
	constructor(code: AgentErrorCode, message: string, options?: CodedErrorOptions) {
		super(message, options?.cause === undefined ? undefined : { cause: options.cause })
		this.name = 'AgentError'
		this.code = code
		this.context = options?.context
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
