/**
 * Caps an {@link AgentInterface} turn's tool iterations by default — the maximum
 * number of context → provider → tools cycles before the loop stops, so a model that
 * keeps requesting tools can never loop forever. Overridable per agent through
 * `AgentOptions.limit`.
 */
export const DEFAULT_AGENT_LIMIT = 10

/**
 * Names the zone an {@link AuthorityInterface}'s default fallback {@link AuthorityDecision}
 * carries — the classification for a tool call that matched no rule. Paired with the
 * default `allowed: true` fallback, an unmatched call is allowed under this zone, so a
 * rules list of denials acts as a denylist; a caller wanting deny-by-default supplies
 * an `allowed: false` `fallback` of their own (see `AuthorityOptions`).
 */
export const DEFAULT_AUTHORITY_ZONE = 'default'

/**
 * Sets the default number of recent live messages a {@link ConversationInterface}'s `compact()`
 * RETAINS verbatim — `0`, so a manual `compact()` folds ALL of the current live messages
 * into one summarized section (no tail kept). A caller retains a recent tail by passing
 * `keep` (on {@link ConversationOptions}, {@link ConversationManagerOptions}, or per-fold
 * through {@link CompactOptions}), folding only the older `count - keep` messages and leaving
 * the most recent `keep` live for the next turn. Overridable everywhere `keep` is accepted.
 */
export const DEFAULT_CONVERSATION_KEEP = 0

/**
 * Names the framing label a {@link ConversationInterface}'s `view()` prefixes onto each compacted
 * section's summary so a small model reads it as a CONDENSED RECAP of earlier turns — not a
 * literal assistant turn to echo or treat as the live answer.
 *
 * @remarks
 * Deliberately a FIXED, lean handful of tokens (a short bracketed marker) so the framing adds a
 * bounded `prefix × sections` overhead and NEVER an open-ended blow-up — the
 * {@link ConversationInterface} no-bloat test guard pins exactly that. Kept here (beside
 * {@link DEFAULT_CONVERSATION_KEEP}) as the conversation layer's one tunable framing constant, so
 * the wording has a single source of truth as it is optimized against real small-model behavior
 * (the `view()` recap framing is distinct from `reference()`'s cross-conversation provenance
 * marker, which is rendered inline since it interpolates the per-call provenance `label`).
 */
export const CONVERSATION_RECAP_PREFIX = '[Summary of earlier messages] '

/**
 * Names the opening tag a {@link import('./ThinkSplitter.js').ThinkSplitter} recognizes as the start of
 * an in-content reasoning span — the de-facto wire convention thinking models (qwen3, DeepSeek-R1
 * family) emit their chain-of-thought under when a daemon renders it inline instead of on a
 * separate wire field. Paired with {@link THINK_CLOSE}.
 */
export const THINK_OPEN = '<think>'

/**
 * Names the closing tag that ends a {@link THINK_OPEN} reasoning span. A span the stream never closes
 * (the model was cut off mid-reasoning) is treated as thinking to its end —
 * {@link import('./types.js').ThinkSplitterInterface.flush} settles it.
 */
export const THINK_CLOSE = '</think>'

/**
 * Names the section header {@link import('./AgentContext.js').AgentContext}'s `build()` renders the
 * ACTIVE workspace's TEXT files under — the leading line of the dedicated workspace block in the
 * system message, the carrier-split counterpart to the documents / images section headers.
 *
 * @remarks
 * `build()` OWNS the workspace render (a `Workspace` / `WorkspaceManager` stays file-focused — no
 * `open` / `format` getters), so this header lives here as the agents module's one
 * workspace-section framing constant rather than on a manager. Each workspace text file renders
 * beneath it as a fenced `` File: <path>\n```<language>\n<text>\n``` `` block — the SAME framing
 * the documents section uses — placed immediately after the documents section in the system block.
 */
export const WORKSPACE_SECTION_HEADER = '## Workspace'

/**
 * Estimates the per-message role/framing overhead {@link import('./helpers.js').estimateMessages}
 * adds on top of a message's content estimate — accounts for the fixed wire framing every
 * conversation turn carries (its role tag, delimiters) that {@link import('./helpers.js').estimateTokens}'s
 * content-only heuristic does not otherwise capture.
 */
export const MESSAGE_TOKEN_OVERHEAD = 4

/**
 * Names the coarse, deliberately-approximate per-image token cost {@link import('./helpers.js').estimateMessages}
 * charges for each attached image.
 *
 * @remarks
 * A base64 image payload's LENGTH is NOT a reliable token proxy (a vision model's actual image
 * token cost depends on resolution / tiling, not byte size), so this is a fixed, coarse
 * per-image estimate rather than a derivation from `image.length` — a planning heuristic, not an
 * exact count.
 */
export const IMAGE_TOKEN_ESTIMATE = 512
