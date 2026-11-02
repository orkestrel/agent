import type { AuthorityNote } from './types.js'

/**
 * Caps an {@link AgentInterface} turn's tool iterations by default — `10` context → provider →
 * tools cycles before the loop stops, so a model that keeps requesting tools can never loop
 * forever. Overridable per agent through `AgentOptions.limit`.
 */
export const DEFAULT_AGENT_LIMIT = 10

/**
 * Names the default zone for an unmatched tool call allowed by an authority.
 */
export const DEFAULT_AUTHORITY_ZONE = 'default'

/**
 * Holds the model-facing texts the loop writes after a tool name in a denial result — the
 * `denied` note for a deny with no reason, an evaluate throw, or an invalid decision; the
 * `refused` note for an ask the approver refused; and the `unanswered` note for an ask no
 * approver answered, frozen.
 */
export const AUTHORITY_NOTES: AuthorityNote = Object.freeze({
	denied: 'it is not allowed. Do not call it again; answer with what you have.',
	refused: 'it was refused. Do not call it again; continue without it.',
	unanswered:
		'it needs approval and none was given. Do not call it again; tell the user it needs approval.',
})

/**
 * Holds the model-facing text the loop writes after a tool name in the denial result of a call
 * outside the active scope's tool allow-list or whose name no definition advertises this turn.
 */
export const SCOPE_NOTE =
	'it is not one of the listed tools. Use a listed tool or answer with what you have.'

/**
 * Estimates the role and framing overhead added to each message by {@link estimateMessages}.
 */
export const MESSAGE_TOKEN_OVERHEAD = 4

/**
 * Names the coarse, deliberately approximate per-image token cost
 * {@link import('./helpers.js').estimateMessages} charges for each attached image — `512`, because
 * a base64 payload's length is no reliable token proxy.
 *
 * @remarks
 * A base64 image payload's length is not a reliable token proxy (a vision model's actual image
 * token cost depends on resolution / tiling, not byte size), so this is a fixed, coarse
 * per-image estimate rather than a derivation from `image.length` — a planning heuristic, not an
 * exact count.
 */
export const IMAGE_TOKEN_ESTIMATE = 512
