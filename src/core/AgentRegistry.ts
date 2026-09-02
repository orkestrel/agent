import type {
	AgentInterface,
	AgentJobInput,
	AgentOptions,
	AgentRegistryInterface,
	AgentRegistryOptions,
	AuthorityInterface,
	ConversationStoreInterface,
	ProviderInterface,
} from './types.js'
import type { BudgetInterface, TokenUsage } from '@orkestrel/budget'
import type { ToolInterface } from '@orkestrel/tool'
import type { SchedulerInterface } from '@orkestrel/workflow'
import { createTokenBudget } from '@orkestrel/budget'
import { ToolManager } from '@orkestrel/tool'
import { Agent } from './Agent.js'
import { ConversationManager } from './conversations/ConversationManager.js'

/**
 * The bridge that makes a durable, JSON-serializable {@link AgentJobInput} runnable —
 * it holds the named pools of live, non-serializable pieces (providers, tools,
 * authorities, schedulers) and rehydrates a seeded, signal-wired {@link Agent} from a
 * job's names + data.
 *
 * @remarks
 * - **Why it exists.** An `AgentJobInput` is serializable so it can survive a crash in a
 *   Queue's store; the live objects it needs (a provider with sockets, tools / rules /
 *   schedulers carrying functions) cannot serialize. The registry closes that gap:
 *   construct it once with the live pools, then a queue / runner handler calls `build`
 *   on each (possibly restored) job to get a ready agent.
 * - **Accessors throw on a miss (§9.1 + §12).** `provider` / `tool` / `authority` /
 *   `scheduler` resolve a name against their pool and THROW `unknown <category>: <name>`
 *   when it is absent — an unknown name in a rehydrated job is a programmer / config
 *   error that must fail LOUDLY at build time, never silently resolve to `undefined` and
 *   run an agent missing a dependency.
 * - **`build` rehydrates.** Resolve the job's `provider`; assemble a fresh
 *   {@link ToolManager} from the `tools` names; rebuild the token `budget` from its
 *   ceiling (`createTokenBudget({ max })`); resolve the optional `authority` /
 *   `scheduler` names; construct the {@link Agent} with `system` / `limit` / `timeout` /
 *   the threaded `signal`; seed its context with the job's `messages`; return it. The
 *   `signal` is the queue attempt's / runner unit's cancel, so a bounded abort propagates
 *   into the agent (which commits a partial — the job's `partial` policy then
 *   decides success vs. retry).
 * - **Event-free.** A pure resolver — no Emitter, no events.
 *
 * @example
 * ```ts
 * declare const provider: ProviderInterface // any concrete implementation supplied by the host app
 * const registry = new AgentRegistry({ providers: { main: provider } })
 * const agent = registry.build({ provider: 'main', messages: [{ role: 'user', content: 'Say ok.' }] })
 * const result = await agent.generate()
 * ```
 */
export class AgentRegistry implements AgentRegistryInterface {
	readonly #providers: ReadonlyMap<string, ProviderInterface>
	readonly #tools: ReadonlyMap<string, ToolInterface>
	readonly #authorities: ReadonlyMap<string, AuthorityInterface>
	readonly #schedulers: ReadonlyMap<string, SchedulerInterface>
	readonly #store: ConversationStoreInterface | undefined

	constructor(options: AgentRegistryOptions) {
		this.#providers = new Map(Object.entries(options.providers))
		this.#tools = new Map(Object.entries(options.tools ?? {}))
		this.#authorities = new Map(Object.entries(options.authorities ?? {}))
		this.#schedulers = new Map(Object.entries(options.schedulers ?? {}))
		this.#store = options.store
	}

	provider(name: string): ProviderInterface {
		return this.#resolve(this.#providers, 'provider', name)
	}

	tool(name: string): ToolInterface {
		return this.#resolve(this.#tools, 'tool', name)
	}

	authority(name: string): AuthorityInterface {
		return this.#resolve(this.#authorities, 'authority', name)
	}

	scheduler(name: string): SchedulerInterface {
		return this.#resolve(this.#schedulers, 'scheduler', name)
	}

	build(input: AgentJobInput, signal?: AbortSignal): AgentInterface {
		const provider = this.provider(input.provider)
		const agent = new Agent(provider, this.#options(input, signal))
		// Seed the conversation onto the rehydrated agent's context — the serializable
		// MessageInputs become stored messages (each id minted by the manager).
		for (const message of input.messages) agent.context.messages.add(message)
		return agent
	}

	// Assemble the AgentOptions for one job: a fresh ToolManager loaded from the named
	// tools, the rebuilt token budget, the resolved authority / scheduler, plus the data
	// fields and the threaded cancel. Optional fields are OMITTED (not set to `undefined`)
	// so the Agent's `?? default` fallbacks behave exactly as for a hand-built agent. When
	// the registry carries a conversation store, thread a fresh store-backed
	// ConversationManager for THIS build (a fresh conversation id per build ⇒ no
	// collisions in the shared store) — omitted when no store is set, so the shape stays
	// byte-identical to a registry with no `store`.
	#options(input: AgentJobInput, signal: AbortSignal | undefined): AgentOptions {
		const budget = this.#budget(input.budget)
		return {
			tools: this.#manager(input.tools),
			...(input.system === undefined ? {} : { system: input.system }),
			...(input.limit === undefined ? {} : { limit: input.limit }),
			...(input.timeout === undefined ? {} : { timeout: input.timeout }),
			...(budget === undefined ? {} : { budget }),
			...(input.authority === undefined ? {} : { authority: this.authority(input.authority) }),
			...(input.scheduler === undefined ? {} : { scheduler: this.scheduler(input.scheduler) }),
			...(this.#store === undefined
				? {}
				: { conversations: new ConversationManager({ store: this.#store }) }),
			...(signal === undefined ? {} : { signal }),
		}
	}

	// A fresh tool registry loaded with the named tools (each resolved — an unknown name
	// throws). Always a new manager per build, so concurrent jobs never share one.
	#manager(names: readonly string[] | undefined): ToolManager {
		const manager = new ToolManager()
		if (names !== undefined) for (const name of names) manager.add(this.tool(name))
		return manager
	}

	// Rebuild a token budget from a job's serializable ceiling — `undefined` when the job
	// declared none (no bound), else a fresh `createTokenBudget({ max })`.
	#budget(max: number | undefined): BudgetInterface<TokenUsage> | undefined {
		return max === undefined ? undefined : createTokenBudget({ max })
	}

	// Resolve a name against a pool, throwing a clear, loud error on a miss (§9.1 accessor
	// + §12 programmer-error throw) — an unknown name in a rehydrated job must not pass.
	#resolve<T>(pool: ReadonlyMap<string, T>, category: string, name: string): T {
		const value = pool.get(name)
		if (value === undefined) throw new Error(`unknown ${category}: ${name}`)
		return value
	}
}
