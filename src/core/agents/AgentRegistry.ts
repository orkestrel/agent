import type {
	AgentInterface,
	AgentJobInput,
	AgentOptions,
	AgentRegistryInterface,
	AgentRegistryOptions,
	AuthorityInterface,
} from './types.js'
import type { ProviderInterface } from '../providers/index.js'
import type { ConversationStoreInterface } from '../conversations/index.js'
import type { MemoManagerInterface, SkillManagerInterface } from '../contexts/index.js'
import type { ToolInterface } from '@orkestrel/tool'
import type { SchedulerInterface } from '@orkestrel/workflow'
import type { WorkspaceManagerInterface } from '@orkestrel/workspace'
import { describeFaults, refuseOptionKeys } from '@orkestrel/contract'
import { createTokenBudget } from '@orkestrel/budget'
import { ToolManager } from '@orkestrel/tool'
import { Agent } from './Agent.js'
import { REGISTRY_OPTION_KEYS } from './constants.js'
import { agentJobContract } from './contracts.js'
import { AgentError } from './errors.js'
import { ConversationManager } from '../conversations/index.js'
import { createScope } from '../contexts/index.js'
import { collectJobRefusals, requireEntry } from './helpers.js'

/**
 * Makes a durable, JSON-serializable {@link AgentJobInput} runnable — holds the named pools of
 * live, non-serializable pieces (providers, tools, authorities, schedulers), throws on a name
 * absent from its pool, and its `build` method returns a seeded, signal-wired {@link Agent} from a job's names and
 * data.
 *
 * @remarks
 * - **Why it exists.** An `AgentJobInput` is serializable so it can survive a crash in a
 *   Queue's store; the live objects it needs (a provider with sockets, tools / rules /
 *   schedulers carrying functions) cannot serialize. The registry closes that gap:
 *   construct it once with the live pools, then a queue / runner handler calls `build`
 *   on each (possibly restored) job to get a ready agent.
 * - **Accessors throw on a miss.** `provider` / `tool` / `authority` / `scheduler` resolve a
 *   name against their pool and throw an {@link AgentError} carrying `code: 'REGISTRY'` and
 *   the message `unknown <category>: <name>` when it is absent — an unknown name in a
 *   rehydrated job is a programmer / config error that must fail loudly at build time, never
 *   silently resolve to `undefined` and run an agent missing a dependency.
 * - **`build` rehydrates.** Refuse with `code: 'REGISTRY'` a job `agentJobContract` refuses,
 *   its faults under `context.faults`, and a job `collectJobRefusals` refuses, its lines under
 *   `context.refusals`: tools or built-ins with no `authority`, a `builtins` list an agent
 *   refuses, and a built-in the job's `tools` also name. Then resolve the job's `provider`;
 *   assemble a fresh {@link ToolManager} from the `tools` names; rebuild the token `budget` from
 *   its ceiling (`createTokenBudget({ max })`); resolve the optional `authority` /
 *   `scheduler` names; construct the {@link Agent} with `system` / `limit` / `timeout` /
 *   the threaded `signal`; seed its context with the job's `messages`; return it. The
 *   `signal` is the queue attempt's / runner unit's cancel, so a bounded abort propagates
 *   into the agent (which commits a partial — the job's `partial` policy then
 *   decides success vs. retry). A job is a record, so a malformed `limit`, `timeout`, `budget`,
 *   seed role, or `builtins` list refuses as one, with `code: 'REGISTRY'`.
 * - **A job holds what it names.** A job with a `scope` gets the registry's `skills`, `memos`, and
 *   `workspaces` managers, which every scoped job shares, and a scope named `job` built from its
 *   three lists; a job with no `scope` gets none of them. Its `workspace` and `builtins` pass to
 *   the agent.
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
	readonly #skills: SkillManagerInterface | undefined
	readonly #memos: MemoManagerInterface | undefined
	readonly #workspaces: WorkspaceManagerInterface | undefined

	constructor(options: AgentRegistryOptions) {
		refuseOptionKeys(options, REGISTRY_OPTION_KEYS, 'AgentRegistry', 'AgentRegistryOptions')
		this.#providers = new Map(Object.entries(options.providers))
		this.#tools = new Map(Object.entries(options.tools ?? {}))
		this.#authorities = new Map(Object.entries(options.authorities ?? {}))
		this.#schedulers = new Map(Object.entries(options.schedulers ?? {}))
		this.#store = options.store
		this.#skills = options.skills
		this.#memos = options.memos
		this.#workspaces = options.workspaces
	}

	provider(name: string): ProviderInterface {
		return requireEntry(this.#providers, 'provider', name)
	}

	tool(name: string): ToolInterface {
		return requireEntry(this.#tools, 'tool', name)
	}

	authority(name: string): AuthorityInterface {
		return requireEntry(this.#authorities, 'authority', name)
	}

	scheduler(name: string): SchedulerInterface {
		return requireEntry(this.#schedulers, 'scheduler', name)
	}

	build(input: AgentJobInput, signal?: AbortSignal): AgentInterface {
		// A job is an owned record, so it crosses exactly: no key is repaired, and a typo refuses.
		const faults = agentJobContract.audit(input)
		if (faults.length > 0) {
			throw new AgentError(
				'REGISTRY',
				`a job must hold only the declared members of AgentJobInput\n${describeFaults(faults, agentJobContract.schema)}`,
				{ context: { faults } },
			)
		}
		const refusals = collectJobRefusals(input)
		if (refusals.length > 0) {
			throw new AgentError(
				'REGISTRY',
				[
					'a job must build as it is written; correct each member a following line names',
					...refusals,
				].join('\n'),
				{ context: { refusals } },
			)
		}
		const provider = this.provider(input.provider)
		const agent = new Agent(provider, this.#buildOptions(input, signal))
		// Seed the conversation onto the rehydrated agent's context — the serializable
		// MessageInputs become stored messages (each id minted by the manager).
		for (const message of input.messages ?? []) agent.context.messages.add(message)
		return agent
	}

	// Assemble the AgentOptions for one job: a fresh ToolManager loaded from the named
	// tools, the rebuilt token budget, the resolved authority / scheduler, plus the data
	// fields and the threaded cancel. Optional fields are omitted (not set to `undefined`)
	// so the Agent's `?? default` fallbacks behave exactly as for a hand-built agent. When
	// the registry carries a conversation store, thread a fresh store-backed
	// ConversationManager for this build (a fresh conversation id per build ⇒ no
	// collisions in the shared store) — omitted when no store is set, so the shape matches a
	// registry with no `store`. The pools and the scope ride only a job that carries a `scope`, so
	// a job with none takes the same options whatever pools the registry holds.
	#buildOptions(input: AgentJobInput, signal: AbortSignal | undefined): AgentOptions {
		const names = input.tools ?? []
		const builtins = input.builtins ?? []
		const scope = input.scope
		const budget = input.budget === undefined ? undefined : createTokenBudget({ max: input.budget })
		return {
			...(names.length === 0 ? {} : { tools: this.#buildToolManager(names) }),
			...(input.system === undefined ? {} : { system: input.system }),
			...(input.limit === undefined ? {} : { limit: input.limit }),
			...(input.timeout === undefined ? {} : { timeout: input.timeout }),
			...(budget === undefined ? {} : { budget }),
			...(input.authority === undefined ? {} : { authority: this.authority(input.authority) }),
			...(input.scheduler === undefined ? {} : { scheduler: this.scheduler(input.scheduler) }),
			...(this.#store === undefined
				? {}
				: { conversations: new ConversationManager({ store: this.#store }) }),
			...(scope === undefined || this.#skills === undefined ? {} : { skills: this.#skills }),
			...(scope === undefined || this.#memos === undefined ? {} : { memos: this.#memos }),
			...(scope === undefined || this.#workspaces === undefined
				? {}
				: { workspaces: this.#workspaces }),
			...(scope === undefined ? {} : { scope: createScope({ name: 'job', ...scope }) }),
			...(input.workspace === undefined ? {} : { workspace: input.workspace }),
			...(builtins.length === 0 ? {} : { builtins }),
			...(signal === undefined ? {} : { signal }),
		}
	}

	// A fresh tool registry loaded with the named tools (each resolved — an unknown name
	// throws). Always a new manager per build, so concurrent jobs never share one.
	#buildToolManager(names: readonly string[]): ToolManager {
		const manager = new ToolManager()
		for (const name of names) manager.add(this.tool(name))
		return manager
	}
}
