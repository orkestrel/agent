import type {
	AgentInterface,
	AgentResult,
	ConversationInterface,
	LedgerResult,
	Message,
	ProviderInterface,
} from '../../../vendor/agent-0.0.30-trimmed/index.js'
import type { PlainArmOptions, TrialArm } from '../types.js'
import { createBudget } from '@orkestrel/budget'
import {
	createAgent,
	createConversationManager,
	estimateMessages,
} from '../../../vendor/agent-0.0.30-trimmed/index.js'
import { COMPACTION_SYSTEM } from '../constants.js'
import { renderTranscript } from '../helpers.js'

/**
 * Serves requests through an agent whose prompt is the whole conversation view: verbatim history for the `full` arm, and the package's own section recaps plus the live tail for the `compaction` arm.
 *
 * @example
 * ```ts
 * const arm = new PlainArm({ provider, system, tools, limit: 8, timeout: 60000 })
 * const result = await arm.respond('Prepare the handoff.', signal)
 * ```
 */
export class PlainArm implements TrialArm {
	readonly #agent: AgentInterface
	readonly #conversation: ConversationInterface
	readonly #summarizer: ProviderInterface | undefined
	readonly #abort = new AbortController()

	/**
	 * Builds the conversation, its summarizer when compaction is configured, and the agent over them.
	 * @param options - The provider, system text, tools, loop bounds, and optional compaction
	 */
	constructor(options: PlainArmOptions) {
		const compaction = options.compaction
		this.#summarizer = compaction?.summarizer
		const conversations = createConversationManager(
			compaction === undefined
				? {}
				: {
						summarize: (messages) => this.#summarize(messages),
						keep: compaction.keep,
						sections: compaction.sections,
					},
		)
		this.#conversation = conversations.add()
		conversations.switch(this.#conversation.id)
		this.#agent = createAgent(options.provider, {
			conversations,
			system: options.system,
			tools: options.tools,
			limit: options.limit,
			timeout: options.timeout,
			strict: false,
			...(compaction === undefined
				? {}
				: {
						window: createBudget<readonly Message[]>({
							max: compaction.window,
							consumer: estimateMessages,
						}),
					}),
		})
	}

	get agent(): AgentInterface {
		return this.#agent
	}

	get conversation(): ConversationInterface {
		return this.#conversation
	}

	/**
	 * Appends the request and runs the agent to its reply; a thrown run settles as an empty partial.
	 * @param content - The request text
	 * @param signal - The caller's cancellation signal
	 * @returns The reply as the one pass the request took
	 */
	async respond(content: string, signal?: AbortSignal): Promise<LedgerResult> {
		this.#conversation.add({ role: 'user', content })
		let result: AgentResult
		try {
			result = await this.#agent.generate(signal === undefined ? {} : { signal })
		} catch {
			result = { content: '', partial: true }
		}
		return { ...result, passes: [result] }
	}

	/** Ends any summarizer call still in flight. */
	destroy(): void {
		this.#abort.abort('destroy')
	}

	async #summarize(messages: readonly Message[]): Promise<string> {
		if (this.#summarizer === undefined) throw new Error('the arm folds without a summarizer')
		const result = await this.#summarizer.generate(
			[
				{ id: 'recap-system', role: 'system', content: COMPACTION_SYSTEM },
				{ id: 'recap-transcript', role: 'user', content: renderTranscript(messages) },
			],
			this.#abort.signal,
			undefined,
			{ think: false },
		)
		const summary = result.content.trim()
		if (summary === '') throw new Error('the summarizer returned no recap')
		return summary
	}
}
