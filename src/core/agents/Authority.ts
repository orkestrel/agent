import type {
	AuthorityContext,
	AuthorityDecision,
	AuthorityHandler,
	AuthorityInterface,
	AuthorityOptions,
	AuthorityRule,
} from './types.js'
import { DEFAULT_AUTHORITY_ZONE } from './constants.js'
import { AgentError } from './errors.js'

/**
 * Gates the agent loop's tool calls — the synchronous policy consulted before each call runs,
 * turning one {@link AuthorityContext} into an {@link AuthorityDecision} by walking the ordered
 * rules first-match-wins and falling back to a configurable default, which allows an unmatched
 * call unless its `fallback` decides otherwise, and the approver that answers an `ask` verdict.
 *
 * @remarks
 * - **Ordered, first-match-wins.** `evaluate` walks the configured rules in order and
 *   returns the first whose `match(context)` is true as
 *   `{ zone, verdict: rule.verdict ?? 'allow', reason }` — a matched rule with no `verdict`
 *   allows.
 * - **Fallback.** When no rule matches, `evaluate` returns the configured `fallback`.
 *   Default: `{ zone: DEFAULT_AUTHORITY_ZONE, verdict: 'allow' }` (allow-unmatched),
 *   so a rules list of denials behaves as a denylist. To make the gate deny-by-default
 *   (an allowlist — only matched rules that allow get through), pass a `verdict: 'deny'`
 *   `fallback`.
 * - **Consulted before each tool call.** The agent loop calls `evaluate({ call })` for
 *   every {@link import('@orkestrel/tool').ToolCall} the model emits; a denied call is fed
 *   back to the model as a denial {@link import('@orkestrel/tool').ToolResult} (a `tool`
 *   chunk + a tool message) instead of being executed — no tool execution —
 *   so the model receives the denial and can react.
 * - **Approver.** `ask` answers an `ask` verdict through the `ask` option's
 *   {@link AuthorityHandler}, as a promise for a synchronous or an async handler; a handler
 *   throw rejects it. With no handler it rejects with an `AgentError` coded `'APPROVER'`, which
 *   the loop reads as an unanswered ask. It never throws synchronously.
 * - **Synchronous.** `evaluate` returns the verdict directly; only `ask` is async.
 * - **Event-free.** A purely functional gate — no Emitter, no events.
 *
 * @example
 * ```ts
 * // A denylist: deny the `delete` tool, allow everything else (default fallback).
 * const authority = new Authority({
 * 	rules: [{ match: (c) => c.call.name === 'delete', zone: 'restricted', verdict: 'deny' }],
 * })
 * authority.evaluate({ call: { id: '1', name: 'delete', arguments: {} } }) // { zone: 'restricted', verdict: 'deny' }
 * authority.evaluate({ call: { id: '2', name: 'add', arguments: {} } }) // { zone: 'default', verdict: 'allow' }
 * ```
 */
export class Authority implements AuthorityInterface {
	readonly #rules: readonly AuthorityRule[]
	readonly #fallback: AuthorityDecision
	readonly #handler: AuthorityHandler | undefined

	constructor(options?: AuthorityOptions) {
		this.#rules = options?.rules ?? []
		this.#fallback = options?.fallback ?? { zone: DEFAULT_AUTHORITY_ZONE, verdict: 'allow' }
		this.#handler = options?.ask
	}

	evaluate(context: AuthorityContext): AuthorityDecision {
		for (const rule of this.#rules) {
			if (rule.match(context))
				return {
					zone: rule.zone,
					verdict: rule.verdict ?? 'allow',
					...(rule.reason === undefined ? {} : { reason: rule.reason }),
				}
		}
		return this.#fallback
	}

	async ask(
		context: AuthorityContext,
		decision: AuthorityDecision,
		signal: AbortSignal,
	): Promise<boolean> {
		if (this.#handler === undefined) {
			throw new AgentError('APPROVER', 'an asked call needs an approver and none is set', {
				context: { tool: context.call.name },
			})
		}
		return this.#handler(context, decision, signal)
	}
}
