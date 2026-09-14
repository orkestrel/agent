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
 * Sets the default number of recent live messages a {@link ConversationInterface}'s `compact()`
 * retains verbatim — `0`, so a manual `compact()` folds every current live message into one
 * summarized section and keeps no tail. A caller retains a recent tail by passing `keep` (on
 * {@link ConversationOptions}, {@link ConversationManagerOptions}, or per-fold through
 * {@link CompactOptions}), folding only the older `count - keep` messages and leaving the most
 * recent `keep` live for the next turn. Overridable everywhere `keep` is accepted.
 */
export const DEFAULT_CONVERSATION_KEEP = 0

/**
 * Names the framing label a {@link ConversationInterface}'s `view()` prefixes onto each compacted
 * section's summary so a small model reads it as a condensed recap of earlier turns — the lean
 * `'[Summary of earlier messages] '` marker, never a literal assistant turn to echo or treat as
 * the live answer.
 *
 * @remarks
 * Deliberately a fixed, lean handful of tokens (a short bracketed marker) so the framing adds a
 * bounded `prefix × sections` overhead and never an open-ended blow-up — the
 * {@link ConversationInterface} no-bloat test guard pins exactly that. Kept here (beside
 * {@link DEFAULT_CONVERSATION_KEEP}) as the conversation layer's one tunable framing constant, so
 * the wording has a single source of truth as it is optimized against real small-model behavior
 * (the `view()` recap framing is distinct from `reference()`'s cross-conversation provenance
 * marker, which is rendered inline since it interpolates the per-call provenance `label`).
 */
export const CONVERSATION_RECAP_PREFIX = '[Summary of earlier messages] '

/**
 * Names the opening tag a {@link import('./ThinkSplitter.js').ThinkSplitter} recognizes as the start of
 * an in-content reasoning span — `'<think>'`, the de-facto wire convention thinking models
 * (qwen3, DeepSeek-R1 family) emit their chain-of-thought under when a daemon renders it inline
 * instead of on a separate wire field. Paired with {@link THINK_CLOSE}.
 */
export const THINK_OPEN = '<think>'

/**
 * Names the closing tag that ends a {@link THINK_OPEN} reasoning span — `'</think>'`. A span the
 * stream never closes (the model was cut off mid-reasoning) is treated as thinking to its end,
 * and {@link import('./types.js').ThinkSplitterInterface.flush} settles it.
 */
export const THINK_CLOSE = '</think>'

/**
 * Names the section header {@link import('./AgentContext.js').AgentContext}'s `build()` renders the
 * active workspace's text files under — `'## Workspace'`, the leading line of the dedicated
 * workspace block in the system message and the carrier-split counterpart to the documents and
 * images section headers.
 *
 * @remarks
 * `build()` owns the workspace render (a `Workspace` / `WorkspaceManager` stays file-focused — no
 * `open` / `format` getters), so this header lives here as the agents module's one
 * workspace-section framing constant rather than on a manager. Each workspace text file renders
 * beneath it as a fenced `` File: <path>\n```<language>\n<text>\n``` `` block — the same framing
 * the documents section uses — placed immediately after the documents section in the system block.
 */
export const WORKSPACE_SECTION_HEADER = '## Workspace'

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

/** Holds the default provider deadline in milliseconds. */
export const DEFAULT_PROVIDER_TIMEOUT = 120_000

/** Bounds the decoded error excerpt's input in bytes. */
export const MAX_ERROR_BODY_LENGTH = 2048

/** Holds the default relay request limit in bytes. */
export const DEFAULT_RELAY_LIMIT = 1_048_576

/** Names the relay's newline-delimited JSON content type. */
export const RELAY_CONTENT_TYPE = 'application/x-ndjson; charset=utf-8'

/** Names the public message for an unexpected upstream relay failure. */
export const RELAY_PROVIDER_MESSAGE = 'relay provider failed'

/** Rejects a relay request whose authorization does not succeed. */
export const UNAUTHORIZED_RELAY_STATUS = 401

/** Identifies a relay provider call that could not be constructed. */
export const UPSTREAM_RELAY_STATUS = 502

/** Rejects a relay request whose body fails validation. */
export const INVALID_RELAY_STATUS = 400

/** Rejects a relay request that exceeds its byte budget. */
export const OVERSIZED_RELAY_STATUS = 413
