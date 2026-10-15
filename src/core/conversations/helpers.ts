import type { Section } from './types.js'
import type { JudgeRequest, JudgeResult, Judgment, JudgmentInput, Message } from '../types.js'
import { CONVERSATION_RECAP_PREFIX } from './constants.js'
import { ConversationError } from './errors.js'
import { isJudgment } from './validators.js'
import { isNonNegativeSafeInteger } from '../validators.js'

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
 * oldest sections into one (a summary over their section summaries); the recap label is absent
 * from that merge input. A rolling fold instead re-reads the framed recap — see
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

/**
 * Returns the rolling switch after checking it does not combine with a `sections` cap, or throws a
 * coded error.
 *
 * @remarks
 * A rolling conversation keeps one section, so a cap has nothing to bound. The cap checked is the
 * effective one: inherited from a manager, configured on the conversation, or supplied to one
 * `compact()` call.
 *
 * @param rolling - Whether folds roll every prior section into one
 * @param cap - The effective `sections` cap, or `undefined` for none
 * @returns The rolling switch unchanged
 * @throws ConversationError Thrown when `rolling` is true and a cap is present (code `'SECTIONS'`)
 *
 * @example
 * ```ts
 * requireRolling(true, undefined) // true
 * requireRolling(false, 2) // false
 * requireRolling(true, 2) // throws ConversationError ('SECTIONS')
 * ```
 */
export function requireRolling(rolling: boolean, cap: number | undefined): boolean {
	if (rolling && cap !== undefined) {
		throw new ConversationError('SECTIONS', 'rolling cannot combine with a sections cap', {
			context: { sections: cap },
		})
	}
	return rolling
}

/**
 * Returns a retained-tail size after checking it is a nonnegative safe integer, or throws a coded
 * error.
 *
 * @remarks
 * The check is {@link import('../validators.js').isNonNegativeSafeInteger}, so `0` and `-0`
 * pass while `NaN`, a fraction, a negative, and either infinity are refused. The error's `context`
 * carries the refused value as `keep`.
 *
 * @param keep - The retained-tail size to check
 * @returns The size unchanged
 * @throws ConversationError Thrown when `keep` is not a nonnegative safe integer (code `'KEEP'`)
 *
 * @example
 * ```ts
 * requireKeep(2) // 2
 * requireKeep(1.5) // throws ConversationError ('KEEP')
 * ```
 */
export function requireKeep(keep: number): number {
	if (!isNonNegativeSafeInteger(keep)) {
		throw new ConversationError('KEEP', 'a keep must be a nonnegative safe integer', {
			context: { keep },
		})
	}
	return keep
}

/**
 * Settles with a promise, or rejects with the reason of a signal that aborts first, so a caller
 * is released at once even when the work behind the promise ignores the signal.
 *
 * @remarks
 * An absent signal returns `promise` itself. An already-aborted signal rejects with its reason
 * without waiting. The abort listener is removed as soon as `promise` settles. A rejection of
 * `promise` after the abort is handled here and never surfaces as unhandled.
 *
 * @param promise - The work to wait for
 * @param signal - The cancellation signal, or `undefined` for none
 * @returns A promise that settles as `promise` does, or rejects with `signal.reason` on abort
 *
 * @example
 * ```ts
 * const controller = new AbortController()
 * const raced = raceSignal(new Promise<string>(() => {}), controller.signal)
 * controller.abort(new Error('stop'))
 * await raced // rejects with the Error 'stop'
 * ```
 */
export function raceSignal<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
	if (signal === undefined) return promise
	return new Promise<T>((resolve, reject) => {
		// Aborting `settled` removes the abort listener once the promise settles.
		const settled = new AbortController()
		if (signal.aborted) reject(signal.reason)
		else {
			signal.addEventListener('abort', () => reject(signal.reason), {
				once: true,
				signal: settled.signal,
			})
		}
		// Settling an already-rejected race is a no-op, and this handler is what keeps a late
		// rejection of `promise` from surfacing as unhandled.
		void promise.then(resolve, reject).finally(() => settled.abort())
	})
}
