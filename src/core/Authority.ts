import type {
	AuthorityContextInterface,
	AuthorityDecision,
	AuthorityInterface,
	AuthorityOptions,
	AuthorityRule,
} from './types.js'
import { DEFAULT_AUTHORITY_ZONE } from './constants.js'

/**
 * The synchronous policy gate the agent loop consults before each tool call runs —
 * it turns one {@link AuthorityContextInterface} into an {@link AuthorityDecision}.
 *
 * @remarks
 * - **Ordered, first-match-wins.** `evaluate` walks the configured rules in order and
 *   returns the FIRST whose `match(context)` is true as
 *   `{ zone, allowed: rule.allowed ?? true, reason }` — a matched rule ALLOWS by
 *   default and DENIES only when its `allowed` is explicitly `false`.
 * - **Fallback.** When no rule matches, `evaluate` returns the configured `fallback`.
 *   It defaults to `{ zone: DEFAULT_AUTHORITY_ZONE, allowed: true }` (allow-unmatched),
 *   so a rules list of denials behaves as a DENYLIST. To make the gate deny-by-default
 *   (an ALLOWLIST — only matched rules that allow get through), pass an `allowed: false`
 *   `fallback`.
 * - **Consulted before each tool call.** The agent loop calls `evaluate({ call })` for
 *   every {@link import('./types.js').ToolCall} the model emits; a denied call is fed
 *   back to the model as a denial {@link import('./types.js').ToolResult} (a `tool`
 *   chunk + a tool message) instead of being executed — no tool run, no budget cost —
 *   so the model sees the denial and can react.
 * - **Synchronous now.** The async human-approval handshake (request / grant / deny) is
 *   deferred to a later chunk; `evaluate` returns a verdict directly.
 * - **Event-free.** A purely functional gate — no Emitter, no events.
 *
 * @example
 * ```ts
 * // A denylist: deny the `delete` tool, allow everything else (default fallback).
 * const authority = new Authority({
 * 	rules: [{ match: (c) => c.call.name === 'delete', zone: 'restricted', allowed: false }],
 * })
 * authority.evaluate({ call: { id: '1', name: 'delete', arguments: {} } }) // { zone: 'restricted', allowed: false }
 * authority.evaluate({ call: { id: '2', name: 'add', arguments: {} } }) // { zone: 'default', allowed: true }
 * ```
 */
export class Authority implements AuthorityInterface {
	readonly #rules: readonly AuthorityRule[]
	readonly #fallback: AuthorityDecision

	constructor(options?: AuthorityOptions) {
		this.#rules = options?.rules ?? []
		this.#fallback = options?.fallback ?? { zone: DEFAULT_AUTHORITY_ZONE, allowed: true }
	}

	evaluate(context: AuthorityContextInterface): AuthorityDecision {
		for (const rule of this.#rules) {
			if (rule.match(context))
				return { zone: rule.zone, allowed: rule.allowed ?? true, reason: rule.reason }
		}
		return this.#fallback
	}
}
