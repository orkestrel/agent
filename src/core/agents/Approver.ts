import type {
	AgentAnswer,
	AgentFrame,
	ApproverInterface,
	AuthorityContext,
	AuthorityDecision,
	AuthorityHandler,
} from './types.js'
import type { ToolCall } from '@orkestrel/tool'
import { preview } from '@orkestrel/contract'
import { AgentError } from './errors.js'
import { renderArguments } from './helpers.js'

/**
 * Holds a server's waiting asks between the run that asked them and the page that answers them — an
 * {@link ApproverInterface} whose `ask` is the authority's handler, keyed by the asked call object.
 *
 * @remarks
 * - **One bound handler.** The constructor binds `ask` once, so `ask: approver.ask` and a
 *   destructured `ask` both register on this approver, and every read returns the same function.
 * - **Keyed by the call.** Each waiting ask is found through the call object the run handed the
 *   handler, never through `call.id`, which a provider can repeat. The ask mints its own `id`, and
 *   its frame carries that `id`, the tool `name`, the decision's `zone`, and the call's `arguments`
 *   rendered by {@link renderArguments}.
 * - **Fail closed.** A call framed while no ask waits for it, a second ask for a waiting call, and
 *   arguments that cannot be rendered each reject with `AgentError` code `'APPROVER'`, which the
 *   loop reads as unanswered. A run abort deletes the waiting ask and resolves it `false`.
 * - **Strict approval.** An answer settles only the ask whose `id` it names, and only
 *   `approved: true` approves.
 *
 * @example
 * ```ts
 * const approver = new Approver()
 * const authority = createAuthority({ rules, ask: approver.ask })
 * approver.answer({ id, approved: true }) // true while that ask waits
 * ```
 */
export class Approver implements ApproverInterface {
	// The waiting asks, keyed by the call object the run handed the handler; each entry is deleted on
	// every path that settles it.
	readonly #asks = new Map<
		ToolCall,
		{
			readonly id: string
			readonly frame: AgentFrame
			readonly resolve: (approved: boolean) => void
			readonly settled: AbortController
		}
	>()
	// The calls framed while no ask waited for them; a later ask for one is refused.
	readonly #missed = new WeakSet<ToolCall>()
	// The handler bound once to this approver, so every read of `ask` returns the same function.
	readonly #ask: AuthorityHandler

	constructor() {
		this.#ask = this.#register.bind(this)
	}

	get ask(): AuthorityHandler {
		return this.#ask
	}

	frame(call: ToolCall): AgentFrame | undefined {
		const entry = this.#asks.get(call)
		if (entry === undefined) {
			this.#missed.add(call)
			return undefined
		}
		return entry.frame
	}

	answer(answer: AgentAnswer): boolean {
		const found = [...this.#asks].find(([, entry]) => entry.id === answer.id)
		if (found === undefined) return false
		const [call, entry] = found
		this.#asks.delete(call)
		entry.settled.abort()
		entry.resolve(answer.approved === true)
		return true
	}

	// Registers one ask before its first suspension, so a reader that pulls the run's `ask` chunk
	// finds it waiting; a run abort deletes it and resolves it `false`.
	async #register(
		context: AuthorityContext,
		decision: AuthorityDecision,
		signal: AbortSignal,
	): Promise<boolean> {
		const call = context.call
		if (signal.aborted) return false
		if (this.#missed.has(call)) {
			throw new AgentError(
				'APPROVER',
				`the ask for ${preview(call.name)} arrived after its chunk was framed; enter the approver synchronously from the authority's ask handler`,
				{ context: { tool: preview(call.name) } },
			)
		}
		if (this.#asks.has(call)) {
			throw new AgentError(
				'APPROVER',
				`an ask for ${preview(call.name)} already waits; ask each call once`,
				{ context: { tool: preview(call.name) } },
			)
		}
		const rendered = renderArguments(call.arguments)
		if (rendered === undefined) {
			throw new AgentError(
				'APPROVER',
				`the arguments of ${preview(call.name)} cannot be rendered as JSON; pass JSON arguments`,
				{ context: { tool: preview(call.name) } },
			)
		}
		const id = crypto.randomUUID()
		const settled = new AbortController()
		const pending = Promise.withResolvers<boolean>()
		this.#asks.set(call, {
			id,
			frame: { category: 'ask', id, name: call.name, zone: decision.zone, arguments: rendered },
			resolve: pending.resolve,
			settled,
		})
		signal.addEventListener(
			'abort',
			() => {
				this.#asks.delete(call)
				pending.resolve(false)
			},
			{ once: true, signal: settled.signal },
		)
		return pending.promise
	}
}
