import type { Section } from './types.js'
import type { Message } from '../types.js'
import { CONVERSATION_RECAP_PREFIX } from './constants.js'

/**
 * Builds the raw synthetic summary message for one compacted section — role `'assistant'`, the
 * section's stable `id`, and its `summary` verbatim as content.
 *
 * @remarks
 * Pure and total. This is the unframed form the rollup regeneration digests (a
 * summary-of-summaries over the section summaries); the recap label is a `view()`
 * presentation concern kept out of what the summarizer re-reads — see
 * {@link buildRecapMessage}.
 *
 * @param section - The compacted section to render
 * @returns The synthetic summary message
 *
 * @example
 * ```ts
 * buildSummaryMessage({ id: 's1', summary: 'recap', messages: [] })
 * // { id: 's1', role: 'assistant', content: 'recap' }
 * ```
 */
export function buildSummaryMessage(section: Section): Message {
	return { id: section.id, role: 'assistant', content: section.summary }
}

/**
 * Builds the framed recap message for one compacted section — the same role and stable `id` as
 * {@link buildSummaryMessage}, with the content prefixed by {@link
 * import('./constants.js').CONVERSATION_RECAP_PREFIX}.
 *
 * @remarks
 * Pure and total. The prefix is what makes a small model read the message as a condensed
 * recap of earlier turns rather than a literal assistant turn to echo or answer from. It is a
 * fixed handful of tokens, so a conversation's `view()` stays lean however many sections it
 * carries.
 *
 * @param section - The compacted section to render
 * @returns The framed recap message
 *
 * @example
 * ```ts
 * buildRecapMessage({ id: 's1', summary: 'recap', messages: [] })
 * // { id: 's1', role: 'assistant', content: `${CONVERSATION_RECAP_PREFIX}recap` }
 * ```
 */
export function buildRecapMessage(section: Section): Message {
	return {
		id: section.id,
		role: 'assistant',
		content: `${CONVERSATION_RECAP_PREFIX}${section.summary}`,
	}
}
