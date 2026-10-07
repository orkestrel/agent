/**
 * Caps an {@link AgentInterface} turn's tool iterations by default — `10` context → provider →
 * tools cycles before the loop stops, so a model that keeps requesting tools can never loop
 * forever. Overridable per agent through `AgentOptions.limit`.
 */
export const DEFAULT_AGENT_LIMIT = 10

/**
 * Names the zone an {@link AuthorityInterface}'s default fallback {@link AuthorityDecision}
 * carries — `'default'`, the classification for a tool call that matched no rule. Paired with
 * the default `allowed: true` fallback, an unmatched call is allowed under this zone, so a
 * rules list of denials acts as a denylist; a caller wanting deny-by-default supplies an
 * `allowed: false` `fallback` of their own (see `AuthorityOptions`).
 */
export const DEFAULT_AUTHORITY_ZONE = 'default'

/**
 * Estimates the per-message role and framing overhead {@link import('./helpers.js').estimateMessages}
 * adds on top of a message's content estimate — `4` tokens for the fixed wire framing every
 * conversation turn carries (its role tag, its delimiters) that
 * {@link import('./helpers.js').estimateTokens}'s content-only heuristic does not otherwise
 * capture.
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
