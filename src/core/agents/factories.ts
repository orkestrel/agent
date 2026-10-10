import type { ProviderInterface } from '../providers/index.js'
import type {
	AgentInterface,
	AgentJobInput,
	AgentOptions,
	AgentQueueOptions,
	AgentRegistryInterface,
	AgentRegistryOptions,
	AgentResult,
	AgentRunnerOptions,
	AuthorityInterface,
	AuthorityOptions,
	ChannelInterface,
} from './types.js'
import type { QueueInterface } from '@orkestrel/queue'
import type { RunnerInterface } from '@orkestrel/workflow'
import { createQueue } from '@orkestrel/queue'
import { createRunner } from '@orkestrel/workflow'
import { Agent } from './Agent.js'
import { Channel } from './Channel.js'
import { Authority } from './Authority.js'
import { AgentRegistry } from './AgentRegistry.js'
import { extractQueueOptions, handleAgentQueueJob, handleAgentRunnerJob } from './helpers.js'

/**
 * Creates an agent loop — an {@link AgentInterface} composing a
 * {@link ProviderInterface}, its {@link AgentContextInterface}, and a tool registry
 * into a bounded context → provider → tools → repeat turn, exposed as a one-shot
 * `generate` and a live `stream`.
 *
 * @remarks
 * One private loop drives the turn; `generate` drains the same stream `stream`
 * exposes, so they can never diverge. Each turn is bounded by one cancel folded from
 * `signal` + `timeout` + `budget` (through `AbortSignal.any`) — any trip (or `abort()`)
 * commits a partial result (the stream's `result` resolves on a cancel, rejects only
 * on a genuine provider / tool error). The `scheduler` paces between turns; tool
 * iteration is capped at `limit`. Default: `DEFAULT_AGENT_LIMIT`. Tools are advertised
 * structurally through `context.tools.definitions()`. Two observation surfaces: the
 * {@link AgentChunk} stream (pull — per-token content) and a typed `emitter` (push —
 * lifecycle + `usage` / `tool` / `deny` for fire-and-forget observers).
 *
 * @param provider - The {@link ProviderInterface} the loop drives each turn
 * @param options - Optional `system` / `tools` / `limit` / `timeout` / `budget` /
 *   `scheduler` / `signal` (see {@link AgentOptions})
 * @returns A working {@link AgentInterface}
 *
 * @example
 * ```ts
 * import type { ProviderInterface } from '@orkestrel/agent'
 * import { createAgent } from '@orkestrel/agent'
 * import { createTokenBudget } from '@orkestrel/budget'
 *
 * declare const provider: ProviderInterface // any concrete implementation supplied by the host app
 * const agent = createAgent(provider, {
 * 	system: 'You are concise.',
 * 	budget: createTokenBudget({ max: 50_000, scope: 'total' }),
 * })
 * agent.context.messages.add({ role: 'user', content: 'Say hi.' })
 *
 * const stream = agent.stream()
 * for await (const chunk of stream.events) {
 * 	if (chunk.category === 'token') process.stdout.write(chunk.content)
 * }
 * const result = await stream.result // { content, usage?, partial }
 * ```
 */
export function createAgent(provider: ProviderInterface, options?: AgentOptions): AgentInterface {
	return new Agent(provider, options)
}

/**
 * Creates an empty unbounded async channel — a {@link ChannelInterface} a producer writes
 * values into (`push`) and ends (`close` / `fail`) regardless of consumption, while a
 * consumer reads them back live through `drain`.
 *
 * @remarks
 * Write and read are decoupled, so the producer never waits for a consumer: an agent's eager
 * pump writes each chunk into one, which is why a run's `result` settles whether or not the
 * live events are drained. A value pushed at an already-parked consumer is delivered, buffered
 * values are yielded before the end is reported, and the first failure wins.
 *
 * @typeParam T - The value type the channel carries
 * @returns A fresh, empty {@link ChannelInterface}
 *
 * @example
 * ```ts
 * import { createChannel } from '@orkestrel/agent'
 *
 * const channel = createChannel<number>()
 * channel.push(1)
 * channel.close()
 * for await (const value of channel.drain()) {
 * 	value // 1
 * }
 * ```
 */
export function createChannel<T>(): ChannelInterface<T> {
	return new Channel<T>()
}

/**
 * Creates a policy gate — an {@link AuthorityInterface} the agent loop consults before
 * each tool call runs, evaluating the ordered rules first-match-wins and falling back
 * to the configured default when none match.
 *
 * @remarks
 * `rules` are evaluated in order — the first whose `match` is true decides (a matched
 * rule allows unless its `allowed` is explicitly `false`). When no rule matches, the
 * `fallback` decides. Default: `{ zone: DEFAULT_AUTHORITY_ZONE, allowed: true }`
 * (allow-unmatched — a rules list of denials acts as a denylist). Pass an
 * `allowed: false` `fallback` to flip the gate to deny-by-default (an allowlist). Wire
 * the result into `createAgent` through `AgentOptions.authority`: a denied call is fed back
 * to the model as a denial `ToolResult` (not executed), so the model
 * can react. Synchronous — `evaluate` returns the verdict directly.
 *
 * @param options - Optional `rules` (ordered) and `fallback` (see {@link AuthorityOptions})
 * @returns A working {@link AuthorityInterface}
 *
 * @example
 * ```ts
 * import { createAgent, createAuthority } from '@orkestrel/agent'
 *
 * // Deny the `delete` tool, allow everything else.
 * const authority = createAuthority({
 * 	rules: [{ match: (c) => c.call.name === 'delete', zone: 'restricted', allowed: false }],
 * })
 * const agent = createAgent(provider, { tools, authority })
 * ```
 */
export function createAuthority(options?: AuthorityOptions): AuthorityInterface {
	return new Authority(options)
}

/**
 * Creates a registry of live providers, tools, authorities, and schedulers whose `build` method returns a seeded, signal-wired {@link AgentInterface} from a serializable job.
 *
 * @remarks
 * `providers` is required; `tools` / `authorities` / `schedulers` are optional pools.
 * The accessors (`provider` / `tool` / `authority` / `scheduler`) throw an
 * {@link import('./errors.js').AgentError} carrying `code: 'REGISTRY'` and the message
 * `unknown <category>: <name>` on an unregistered name — a misconfigured or crash-restored
 * job fails loudly rather than running with a missing dependency. `build(input, signal)`
 * resolves the names, rebuilds the token budget from its ceiling, seeds the agent's
 * context with the job's messages, and threads `signal` so a queue / runner abort
 * propagates. This is the bridge that makes durable, serializable agent jobs runnable.
 *
 * @param options - The named pools (see {@link AgentRegistryOptions})
 * @returns A working {@link AgentRegistryInterface}
 *
 * @example
 * ```ts
 * import { createAgentRegistry } from '@orkestrel/agent'
 * import type { ProviderInterface } from '@orkestrel/agent'
 * import { createTool } from '@orkestrel/tool'
 *
 * declare const provider: ProviderInterface // any concrete implementation supplied by the host app
 * const registry = createAgentRegistry({
 * 	providers: { main: provider },
 * 	tools: { add: createTool({ name: 'add', execute: (a) => Number(a.x) + Number(a.y) }) },
 * })
 * const agent = registry.build({ provider: 'main', messages: [{ role: 'user', content: 'Hi.' }] })
 * ```
 */
export function createAgentRegistry(options: AgentRegistryOptions): AgentRegistryInterface {
	return new AgentRegistry(options)
}

/**
 * Creates a durable, bounded-concurrency agent-job queue — a {@link QueueInterface} over
 * serializable values of {@link AgentJobInput} that composes `createQueue`: each job is rehydrated
 * through the `registry` into a live {@link AgentInterface}, run to its {@link AgentResult},
 * and subjected to the partial-as-configurable-failure policy.
 *
 * @remarks
 * - **Composes the substrate (no new engine).** The handler is the only new logic;
 *   bounded `concurrency`, `retries`, the per-attempt `timeout`, and durable persistence
 *   through `store` (+ `restore()` after a crash) are all the backing Queue's. `enqueue`
 *   returns a per-job promise.
 * - **Durable + serializable.** Because `AgentJobInput` is JSON-serializable, a `store`
 *   (for example `createMemoryQueueStore` / `createDatabaseQueueStore`) persists outstanding
 *   jobs; `restore()` re-enqueues them after a restart and the `registry` rehydrates the
 *   live pieces from the names — so a job survives a crash.
 * - **Partial policy.** A partial result throws an
 *   {@link import('./errors.js').AgentJobError} by default, so a job cancelled by its
 *   attempt deadline / a queue abort retries while attempts remain; `partial: true`
 *   resolves the partial as success instead.
 * - **Cancellation threads through.** The handler passes `context.signal` into
 *   `registry.build`, so a queue `abort()` or a per-attempt timeout cancels the in-flight
 *   agent (which commits a partial → throws → retries / fails per policy).
 *
 * @param options - The `registry`, the `partial` policy, and the substrate knobs
 *   (`concurrency` / `retries` / `timeout` / `store`) (see {@link AgentQueueOptions})
 * @returns A {@link QueueInterface} of {@link AgentJobInput} → {@link AgentResult}
 *
 * @example
 * ```ts
 * import { createAgentQueue, createAgentRegistry } from '@orkestrel/agent'
 * import { createMemoryQueueStore } from '@orkestrel/queue'
 *
 * const registry = createAgentRegistry({ providers: { main: provider } })
 * const store = createMemoryQueueStore(agentJobShape) // survives a restart through restore()
 * const queue = createAgentQueue({ registry, concurrency: 2, retries: 1, store })
 * const result = await queue.enqueue({ provider: 'main', messages: [{ role: 'user', content: 'ok?' }] })
 * ```
 */
export function createAgentQueue(
	options: AgentQueueOptions,
): QueueInterface<AgentJobInput, AgentResult> {
	const { registry, partial = false, store } = options
	return createQueue<AgentJobInput, AgentResult>({
		...extractQueueOptions(options),
		...(store === undefined ? {} : { store }),
		handler: handleAgentQueueJob.bind(undefined, registry, partial),
	})
}

/**
 * Creates an agent-job runner — a {@link RunnerInterface} over serializable
 * values of {@link AgentJobInput} that composes `createRunner` (one-shot, ordered, fail-fast), each unit
 * rehydrated through the `registry` and subjected to the partial policy. The runner also carries
 * sub-agent fan-out: a parent job's handler can call `controller.spawn` with a child job.
 *
 * @remarks
 * - **Composes the substrate (no new engine).** Bounded `concurrency`, `retries`, the
 *   per-attempt `timeout`, ordered results, and fail-fast are all the backing Runner's;
 *   the handler adds only rehydration + the partial policy.
 * - **Sub-agent fan-out.** Each unit's handler receives a `ControllerInterface` whose
 *   `spawn(childJob)` launches a child agent job through the same bounded queue (the
 *   child's result joins the run after the declared units, in spawn order). On a bounded
 *   runner, fan out and return — do not await a spawn inline from within the handler (a
 *   slot-holding handler awaiting its own spawn can deadlock; see `ControllerInterface`).
 * - **Partial policy + cancellation.** Same as `createAgentQueue`: a partial result
 *   throws by default (the run's fail-fast engages), `partial: true` resolves it; the
 *   handler threads `controller.signal` into `registry.build`, so a runner abort / a
 *   per-attempt timeout cancels the agent.
 *
 * @param options - The `registry`, the `partial` policy, and the substrate knobs
 *   (`concurrency` / `retries` / `timeout`) (see {@link AgentRunnerOptions})
 * @returns A {@link RunnerInterface} of {@link AgentJobInput} → {@link AgentResult}
 *
 * @example
 * ```ts
 * import { createAgentRunner, createAgentRegistry } from '@orkestrel/agent'
 *
 * const registry = createAgentRegistry({ providers: { main: provider } })
 * const runner = createAgentRunner({ registry, concurrency: 2 })
 * // Run one job that fans out a child; results hold the parent, then the spawn.
 * const child = { provider: 'main', messages: [{ role: 'user', content: 'child' }] }
 * const parent = { provider: 'main', messages: [{ role: 'user', content: 'parent' }], children: [child] }
 * const results = await runner.execute([parent]) // declared first, then any spawns
 * ```
 */
export function createAgentRunner(
	options: AgentRunnerOptions,
): RunnerInterface<AgentJobInput, AgentResult> {
	const { registry, partial = false } = options
	return createRunner<AgentJobInput, AgentResult>({
		...extractQueueOptions(options),
		handler: handleAgentRunnerJob.bind(undefined, registry, partial),
	})
}
