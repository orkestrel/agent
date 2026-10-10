/**
 * Sets the default number of recent live messages the `compact()` method of a
 * {@link ConversationInterface} retains verbatim — `0`, so a manual `compact()` keeps no recent tail and folds every
 * exchange before the newest user message into one summarized section. A caller retains a recent
 * tail by passing `keep` (on
 * {@link ConversationOptions}, {@link ConversationManagerOptions}, or per-fold through
 * {@link CompactOptions}), folding at most the older `count - keep` messages, cut back to whole
 * exchanges, and leaving at least the most recent `keep` live for the next turn. Overridable everywhere `keep` is accepted.
 */
export const DEFAULT_CONVERSATION_KEEP = 0

/**
 * Names the framing label the `view()` method of a {@link ConversationInterface} prefixes onto the
 * summary of each compacted section so a small model reads it as a condensed recap of earlier turns — the lean
 * `'[Summary of earlier messages] '` marker, never a literal assistant turn to echo or treat as
 * the live answer.
 *
 * @remarks
 * Deliberately a fixed, lean handful of tokens (a short bracketed marker) so the framing adds a
 * bounded `prefix × sections` overhead and never an open-ended blow-up — the
 * {@link ConversationInterface} no-bloat test guard pins exactly that. Kept here (beside
 * {@link DEFAULT_CONVERSATION_KEEP}) as the one tunable framing constant of the conversation
 * layer, so the wording has a single source of truth (the `view()` recap framing is distinct
 * from the cross-conversation provenance marker of `reference()`, which is rendered inline
 * because it interpolates the per-call provenance `label`).
 */
export const CONVERSATION_RECAP_PREFIX = '[Summary of earlier messages] '
