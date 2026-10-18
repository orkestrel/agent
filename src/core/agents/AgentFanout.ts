import type { AgentJobInput, AgentRegistryInterface, AgentResult } from './types.js'
import type { ControllerInterface } from '@orkestrel/workflow'
import { settleAgentJob } from './helpers.js'

/**
 * Executes one runner's agent jobs — spawning each unit's declared children on its first attempt
 * only, then rehydrating the unit through a registry with the controller signal and settling it
 * under the shared partial-result policy.
 *
 * @remarks
 * One instance serves one runner, because it records every unit it has fanned out. The runner
 * calls its handler once per attempt with the same unit id, so a retried attempt finds its unit
 * recorded and spawns no child again. Children are fired through the controller without being
 * awaited inline, so a bounded runner frees the parent's slot for them. `createAgentRunner`
 * creates one instance per runner and binds its `execute` method as the runner's handler.
 *
 * @example
 * ```ts
 * import type { AgentJobInput, ProviderInterface } from '@orkestrel/agent'
 * import { AgentFanout, createAgentRegistry } from '@orkestrel/agent'
 * import { createRunner } from '@orkestrel/workflow'
 *
 * declare const provider: ProviderInterface // any concrete implementation supplied by the host app
 * const fanout = new AgentFanout(createAgentRegistry({ providers: { main: provider } }), false)
 * const runner = createRunner({ handler: fanout.execute.bind(fanout), retries: 1 })
 * const child: AgentJobInput = { provider: 'main', messages: [{ role: 'user', content: 'child' }] }
 * const parent: AgentJobInput = { ...child, messages: [{ role: 'user', content: 'parent' }], children: [child] }
 * const results = await runner.execute([parent]) // the parent's result, then the child's
 * ```
 */
export class AgentFanout {
	readonly #registry: AgentRegistryInterface
	readonly #partial: boolean
	// The ids of the units whose children this runner already spawned. Copy-on-write, and never
	// shrunk: a unit id stays recorded so every later attempt of that unit skips the fan-out.
	#spawned: ReadonlySet<string> = new Set<string>()

	/**
	 * Creates the fan-out for one runner over a registry and a partial policy.
	 *
	 * @param registry - The registry that rehydrates each serializable job
	 * @param partial - The partial policy. If `true`, a partial result resolves; if `false`, it throws an `AgentJobError`
	 */
	constructor(registry: AgentRegistryInterface, partial: boolean) {
		this.#registry = registry
		this.#partial = partial
	}

	/**
	 * Executes one unit: spawns its declared children unless an earlier attempt of the unit already
	 * did, then runs the rehydrated agent and settles it under the partial policy.
	 *
	 * @param controller - The runner controller for this unit's attempt
	 * @returns The settled agent result of the unit
	 * @throws {AgentJobError} Thrown when the run ended partial and the partial policy is `false`
	 */
	execute(controller: ControllerInterface<AgentJobInput, AgentResult>): Promise<AgentResult> {
		const children = controller.input.children
		if (children !== undefined && !this.#spawned.has(controller.id)) {
			this.#spawned = new Set([...this.#spawned, controller.id])
			for (const child of children) void controller.spawn(child)
		}
		return settleAgentJob(this.#registry.build(controller.input, controller.signal), this.#partial)
	}
}
