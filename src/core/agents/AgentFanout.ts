import type { AgentJobInput, AgentRegistryInterface, AgentResult } from './types.js'
import type { ControllerInterface } from '@orkestrel/workflow'
import { JOB_REFUSAL_PREFIX } from './constants.js'
import { AgentError } from './errors.js'
import { scanJobTree, settleAgentJob } from './helpers.js'

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
 * A child job runs within its parent. Before a unit spawns or runs, on every attempt, the
 * `execute` method walks the whole tree under it through the `scanJobTree` helper and refuses the
 * unit when any job exceeds its own parent on `tools`, `builtins`, `scope`, `authority`,
 * `provider`, `scheduler`, `limit`, `timeout`, or `budget`, or when a job is malformed or its build
 * would refuse it (the lines `collectJobRefusals` returns), so nothing in a refused tree spawns, builds,
 * or runs. A child's `workspace` is free, because it renders nothing its own `scope`
 * omits. Each child is held within its parent alone, so the children of one parent can together
 * spend more than it. A job that needs another provider, another authority, a skill, memo,
 * workspace, or built-in its parent lacks, or more room than its parent is a root job the host
 * enqueues.
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
	 * Executes one unit: refuses its tree when a job in it is malformed or exceeds its parent, spawns
	 * its declared children unless an earlier attempt of the unit already did, then runs the
	 * rehydrated agent and settles it under the partial policy.
	 *
	 * @remarks
	 * The check runs on every attempt, before the unit spawns or runs, and throws synchronously. The
	 * error's message opens with the rule each kind of finding breaks, a refused job's rule when a
	 * finding opens with `JOB_REFUSAL_PREFIX` and the within-parent rule when a finding names an
	 * exceeded member, then lists every finding, one a line. Its `context.findings` holds the same
	 * findings in walk order.
	 *
	 * @param controller - The runner controller for this unit's attempt
	 * @returns The settled agent result of the unit
	 * @throws {AgentError} Thrown with code `'REGISTRY'` when a job in the unit's tree is malformed or exceeds its parent, or when the registry cannot rehydrate the unit
	 * @throws {AgentJobError} Thrown when the run ended partial and the partial policy is `false`
	 */
	execute(controller: ControllerInterface<AgentJobInput, AgentResult>): Promise<AgentResult> {
		const findings = scanJobTree(controller.input)
		if (findings.length > 0) {
			const refused = findings.filter((finding) => finding.startsWith(JOB_REFUSAL_PREFIX))
			throw new AgentError(
				'REGISTRY',
				[
					...(refused.length === 0
						? []
						: [
								'every job in a tree must be readable, hold only the declared members of AgentJobInput, and build under its parent; correct each job a following finding names',
							]),
					...(refused.length === findings.length
						? []
						: [
								'a child job must stay within its parent on tools, builtins, scope, authority, provider, scheduler, limit, timeout, and budget; enqueue a job that needs more as a root job',
							]),
					...findings,
				].join('\n'),
				{ context: { findings } },
			)
		}
		const children = controller.input.children
		if (children !== undefined && !this.#spawned.has(controller.id)) {
			this.#spawned = new Set([...this.#spawned, controller.id])
			for (const child of children) void controller.spawn(child)
		}
		return settleAgentJob(this.#registry.build(controller.input, controller.signal), this.#partial)
	}
}
