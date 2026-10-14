import type {
	AgentContextInterface,
	AgentInterface,
	ScopeInterface,
} from '../vendor/agent-0.0.30-trimmed/index.js'
import { createScope } from '../vendor/agent-0.0.30-trimmed/index.js'

/** Composes the active ledger selector at every public run-start boundary. */
export class FullViewAdapter {
	readonly #agent: AgentInterface
	readonly #context: AgentContextInterface
	readonly #sources = new WeakMap<ScopeInterface, ScopeInterface | undefined>()
	readonly #start = this.#apply.bind(this)

	/** Subscribes before the initial and recovery selections.
	 * @param agent - The real ledger agent
	 */
	constructor(agent: AgentInterface) {
		this.#agent = agent
		this.#context = agent.context
		agent.emitter.on('start', this.#start)
	}

	/** Releases the subscription and restores the underlying scope without clearing history. */
	destroy(): void {
		this.#agent.emitter.off('start', this.#start)
		const current = this.#context.scope
		if (current !== undefined && this.#sources.has(current))
			this.#context.apply(this.#sources.get(current))
	}

	#apply(): void {
		const context = this.#context
		const current = context.scope
		const source =
			current !== undefined && this.#sources.has(current) ? this.#sources.get(current) : current
		const adapter = createScope({
			name: source?.name ?? 'full',
			...(source?.tools === undefined ? {} : { tools: source.tools }),
			...(source?.instructions === undefined ? {} : { instructions: source.instructions }),
			...(source?.files === undefined ? {} : { files: source.files }),
			select: async (conversation, request, signal) => {
				const active = context.scope
				context.apply(source)
				try {
					const selection = await context.select(request, signal)
					return {
						messages: conversation.view(),
						judgments: selection?.judgments ?? [],
						...(selection?.usage === undefined ? {} : { usage: selection.usage }),
						...(selection?.fault === undefined ? {} : { fault: selection.fault }),
					}
				} finally {
					context.apply(active)
				}
			},
		})
		this.#sources.set(adapter, source)
		context.apply(adapter)
	}
}
