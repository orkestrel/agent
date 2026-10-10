import type { Section } from './types.js'
import type { JudgeRequest, JudgeResult, Judgment, JudgmentInput, Message } from '../types.js'
import { CONVERSATION_RECAP_PREFIX } from './constants.js'
import { ConversationError } from './errors.js'
import { isJudgment } from './validators.js'

/**
 * Builds records for answered or refused request keys, attaching usage only for a single question.
 *
 * @param request - The request whose question keys define record order
 * @param result - The reported answers, refusals, model, and usage
 * @param sources - The ordered source message ids
 * @param state - The rendered state read by the judge
 * @param model - The configured judge identity the records carry
 * @returns Inputs for completed question keys in request order
 * @example
 * ```ts
 * buildJudgments(request, result, ['message-a'], 'Charged twice', judge.model)
 * ```
 */
export function buildJudgments(
	request: JudgeRequest,
	result: JudgeResult,
	sources: readonly string[],
	state: string,
	model: string,
): readonly JudgmentInput[] {
	const judgments: JudgmentInput[] = []
	const single = Object.keys(request.questions).length === 1
	for (const [id, question] of Object.entries(request.questions)) {
		const answer = Object.hasOwn(result.answers, id) ? result.answers[id] : undefined
		const refusal =
			result.refusals !== undefined && Object.hasOwn(result.refusals, id)
				? result.refusals[id]
				: undefined
		if (answer === undefined && refusal === undefined) continue
		judgments.push({
			id,
			question,
			model,
			sources,
			state,
			...(answer !== undefined ? { answer } : refusal !== undefined ? { refusal } : {}),
			...(single && result.usage !== undefined ? { usage: result.usage } : {}),
		})
	}
	return judgments
}

/**
 * Builds the raw synthetic summary message for one compacted section — role `'assistant'`, the
 * section's stable `id`, and its `summary` verbatim as content.
 *
 * @remarks
 * Pure and total. This is the unframed form a `sections` cap merge digests when it folds the
 * oldest sections into one (a summary over their section summaries); the recap label is a
 * `view()` presentation concern kept out of what the summarizer re-reads — see
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

/**
 * Returns a stored judgment record after checking it, or throws a coded error.
 *
 * @remarks
 * A stored record is the JSON copy of its input, so a proxied record is accepted and the stored
 * value is exactly what a snapshot can carry. The check is {@link isJudgment}.
 *
 * @param value - The JSON copy of a judgment record or input
 * @returns The value, narrowed to a {@link Judgment}
 * @throws ConversationError Thrown when the value is not a valid judgment record (code `'JUDGMENT'`)
 *
 * @example
 * ```ts
 * requireJudgment(copyJSON(record)) // the record, narrowed
 * requireJudgment({ id: 'refund' }) // throws ConversationError ('JUDGMENT')
 * ```
 */
export function requireJudgment(value: unknown): Judgment {
	if (!isJudgment(value)) {
		throw new ConversationError('JUDGMENT', 'conversation error: a judgment must be a JSON record')
	}
	return value
}

/**
 * Returns a `sections` cap after checking its lower bound, or throws a coded error.
 *
 * @remarks
 * A supplied cap must satisfy `>= 1`; fractional caps and positive infinity pass, and `NaN`
 * is refused. An absent cap leaves the sections list unbounded.
 *
 * @param cap - The cap to check, or `undefined` for no cap
 * @returns The cap unchanged, or `undefined` when none was supplied
 * @throws ConversationError Thrown when the cap does not satisfy `>= 1` (code `'SECTIONS'`, including `NaN`)
 *
 * @example
 * ```ts
 * requireSectionsCap(2) // 2
 * requireSectionsCap(undefined) // undefined
 * requireSectionsCap(0) // throws ConversationError ('SECTIONS')
 * ```
 */
export function requireSectionsCap(cap: number | undefined): number | undefined {
	if (cap !== undefined && !(cap >= 1)) {
		throw new ConversationError('SECTIONS', 'a sections cap must be >= 1')
	}
	return cap
}
