import type { ConversationSnapshot, Section } from './types.js'
import type {
	ConversationRole,
	JudgeRequest,
	JudgeResult,
	Judgment,
	JudgmentInput,
	Message,
	MessageInput,
} from '../types.js'
import type { ContractInterface } from '@orkestrel/contract'
import { attempt, isArray, isRecord, isString, preview } from '@orkestrel/contract'
import { describeFaults } from '@orkestrel/tool'
import { CONVERSATION_RECAP_PREFIX } from './constants.js'
import { ConversationError } from './errors.js'
import { isConversationSnapshot, isJudgment, isMessageInput } from './validators.js'
import { CONVERSATION_ROLES } from '../constants.js'
import { isNonNegativeSafeInteger, isPositiveSafeInteger } from '../validators.js'

/**
 * Returns after checking a complete judge result answered or refused every question it was asked, or
 * throws a coded error naming those it left out.
 *
 * @remarks
 * A cancelled call's partial is not complete, so `JudgmentManager` reads this on a settled result only,
 * and {@link buildJudgments} stores whatever a partial holds.
 *
 * @param request - The request whose question keys must be answered
 * @param result - The result the judge settled
 * @throws ConversationError Thrown when a question has neither an answer nor a refusal (code `'JUDGMENT'`), naming them under `context.questions`
 * @example
 * ```ts
 * requireJudgeResult({ state: 'text', questions: { a: { form: 'noul' } } }, { model: 'm', answers: {} })
 * // throws ConversationError ('JUDGMENT')
 * ```
 */
export function requireJudgeResult(request: JudgeRequest, result: JudgeResult): void {
	const left = Object.keys(request.questions).filter(
		(id) =>
			!Object.hasOwn(result.answers, id) &&
			(result.refusals === undefined || !Object.hasOwn(result.refusals, id)),
	)
	if (left.length === 0) return
	throw new ConversationError(
		'JUDGMENT',
		`conversation error: the judge left ${left.map((id) => preview(id)).join(', ')} neither answered nor refused; a judge must answer or refuse every question it is asked`,
		{ context: { questions: left } },
	)
}

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
	const single = Object.keys(request.questions).length === 1
	return Object.entries(request.questions).flatMap(([id, question]): readonly JudgmentInput[] => {
		const answer = Object.hasOwn(result.answers, id) ? result.answers[id] : undefined
		const refusal =
			result.refusals !== undefined && Object.hasOwn(result.refusals, id)
				? result.refusals[id]
				: undefined
		if (answer === undefined && refusal === undefined) return []
		return [
			{
				id,
				question,
				model,
				sources,
				state,
				...(answer !== undefined ? { answer } : refusal !== undefined ? { refusal } : {}),
				...(single && result.usage !== undefined ? { usage: result.usage } : {}),
			},
		]
	})
}

/**
 * Builds the raw synthetic summary message for one compacted section — role `'assistant'`, the
 * section's stable `id`, and its `summary` verbatim as content.
 *
 * @remarks
 * Pure and total. This is the unframed form a `sections` cap merge digests when it folds the
 * oldest sections into one (a summary over their section summaries); the recap label is absent
 * from that merge input. A cumulative fold instead re-reads the framed recap — see
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
 * Returns a stored message role after checking it is a conversation role, or throws a coded error.
 *
 * @remarks
 * A stored conversation message plays a `ConversationRole`; the `system` message is built per
 * request and never stored. The error message names the received role JSON-encoded and cut to 32
 * characters, or its `typeof` when it is not a string, and for the role `'system'` adds that host
 * text goes in the `system` option or an instruction.
 *
 * @param role - The role to check
 * @returns The role, narrowed to a `ConversationRole`
 * @throws ConversationError Thrown when the role is not a `CONVERSATION_ROLES` member (code `'ROLE'`)
 *
 * @example
 * ```ts
 * requireRole('user') // 'user'
 * requireRole('system') // throws ConversationError ('ROLE')
 * ```
 */
export function requireRole(role: unknown): ConversationRole {
	const stored = CONVERSATION_ROLES.find((one) => one === role)
	if (stored === undefined) {
		throw new ConversationError(
			'ROLE',
			`a stored message role must be one of ${CONVERSATION_ROLES.map((one) => JSON.stringify(one)).join(', ')}; received ${typeof role === 'string' ? JSON.stringify(role.slice(0, 32)) : typeof role}${role === 'system' ? '; host text goes in the system option or an instruction' : ''}`,
		)
	}
	return stored
}

/**
 * Returns a message input after checking its role and its members, or throws a coded error.
 *
 * @remarks
 * The role goes first, through {@link requireRole}, so its refusal names what it received. The members
 * cross {@link isMessageInput}, and `audit` runs only after it refused, so a stored message costs one
 * guard read.
 *
 * @param input - The message input to check
 * @param contract - The message input contract, whose `audit` is read only on a refusal
 * @returns The input, narrowed
 * @throws ConversationError Thrown when the role is not a `ConversationRole` (code `'ROLE'`) or a member fails `isMessageInput` (code `'MESSAGE'`), with the faults under `context.faults`
 *
 * @example
 * ```ts
 * requireMessageInput({ role: 'user', content: 'hi' }, messageInputContract) // the input
 * requireMessageInput({ role: 'user' }, messageInputContract) // throws ConversationError ('MESSAGE')
 * ```
 */
export function requireMessageInput(
	input: unknown,
	contract: Pick<ContractInterface<unknown>, 'audit' | 'schema'>,
): MessageInput {
	requireRole(isRecord(input) ? input.role : undefined)
	if (isMessageInput(input)) return input
	const faults = contract.audit(input)
	throw new ConversationError(
		'MESSAGE',
		`a message input must carry string content, and calls, call, images, and thinking of their declared types\n${describeFaults(faults, contract.schema)}`,
		{ context: { faults } },
	)
}

/**
 * Returns a conversation snapshot after checking its shape, its stored roles, and its ids, or
 * throws a coded error.
 *
 * @remarks
 * The check reads every own member of `value` once and builds a candidate from those reads: each
 * array member becomes a fresh array holding the same element objects, and a member that is not an
 * array stays as read, so the guard refuses it. The candidate must pass `isConversationSnapshot`, which
 * is exact, so an unknown key refuses rather than being dropped; every section message and live message
 * must play a `ConversationRole`; and no id may repeat across section ids, section message ids, and live
 * message ids. The `'ROLE'` refusal of a `system` message names the row a snapshot written before
 * 0.0.35 can hold, and each `'SNAPSHOT'` refusal asks for what `snapshot()` returned. The candidate
 * is returned, never `value`, so the check and the seating share one read. Element objects are kept
 * by reference, so a host is trusted not to edit a seated message object or to back its members
 * with accessors. The contract's `audit` runs only after the guard refused, to fill `context.faults`.
 *
 * @param value - The snapshot to check, typically a stored read
 * @param contract - The snapshot contract, whose `audit` is read only on a refusal
 * @returns The candidate snapshot
 * @throws ConversationError Thrown when the value fails `isConversationSnapshot` (code `'SNAPSHOT'`, its faults under `context.faults`), repeats an id (code `'SNAPSHOT'`), or holds a message whose role is not a `ConversationRole` (code `'ROLE'`)
 *
 * @example
 * ```ts
 * requireConversationSnapshot({ id: 'c1', sections: [], messages: [] }, conversationSnapshotContract) // { id: 'c1', sections: [], messages: [] }
 * requireConversationSnapshot({ id: 'c1', sections: 'nope', messages: [] }, conversationSnapshotContract) // throws ConversationError ('SNAPSHOT')
 * ```
 */
export function requireConversationSnapshot(
	value: unknown,
	contract: Pick<ContractInterface<unknown>, 'audit' | 'schema'>,
): ConversationSnapshot {
	const candidate = attempt(() => {
		if (!isRecord(value)) return undefined
		const read = { ...value }
		const { sections, messages, judgments } = read
		return {
			...read,
			sections: isArray(sections) ? Array.from(sections) : sections,
			messages: isArray(messages) ? Array.from(messages) : messages,
			...(judgments === undefined
				? {}
				: { judgments: isArray(judgments) ? Array.from(judgments) : judgments }),
		}
	})
	if (!candidate.success) {
		throw new ConversationError(
			'SNAPSHOT',
			'a conversation snapshot must be readable; pass what snapshot() returned',
			{ cause: candidate.error },
		)
	}
	if (!isConversationSnapshot(candidate.value)) {
		const faults = contract.audit(candidate.value)
		throw new ConversationError(
			'SNAPSHOT',
			`a conversation snapshot must carry a string id, valid sections and messages, valid judgments when present, and no other member; pass what snapshot() returned\n${describeFaults(faults, contract.schema)}`,
			{ context: { faults } },
		)
	}
	const snapshot = candidate.value
	snapshot.sections
		.flatMap((section) => section.messages)
		.concat(snapshot.messages)
		.forEach((message) => {
			if (message.role === 'system')
				throw new ConversationError(
					'ROLE',
					'a conversation snapshot holds a system message; a snapshot written before 0.0.35 can hold a system row; remove it before loading',
				)
			requireRole(message.role)
		})
	const ids = [
		...snapshot.sections.map((section) => section.id),
		...snapshot.sections.flatMap((section) => section.messages.map((message) => message.id)),
		...snapshot.messages.map((message) => message.id),
	]
	// Built from the reversed pairs, the map keeps each id's first index.
	const pairs = ids.map((id, index): readonly [string, number] => [id, index])
	const firsts = new Map(pairs.toReversed())
	const repeated = ids.find((id, index) => firsts.get(id) !== index)
	if (repeated !== undefined) {
		throw new ConversationError(
			'SNAPSHOT',
			`a conversation snapshot repeats the id ${JSON.stringify(repeated.slice(0, 64))}; pass what snapshot() returned`,
		)
	}
	return snapshot
}

/**
 * Returns a `sections` cap after checking it is a positive safe integer, or throws a coded error.
 *
 * @remarks
 * A fraction, positive infinity, and `NaN` are refused with `0` and a negative, because a count of
 * sections is a whole number. An absent cap leaves the sections list unbounded.
 *
 * @param cap - The cap to check, or `undefined` for no cap
 * @returns The cap unchanged, or `undefined` when none was supplied
 * @throws ConversationError Thrown when the cap is not a positive safe integer (code `'SECTIONS'`)
 *
 * @example
 * ```ts
 * requireSectionsCap(2) // 2
 * requireSectionsCap(undefined) // undefined
 * requireSectionsCap(0) // throws ConversationError ('SECTIONS')
 * ```
 */
export function requireSectionsCap(cap: number | undefined): number | undefined {
	if (cap !== undefined && !isPositiveSafeInteger(cap)) {
		throw new ConversationError('SECTIONS', 'a sections cap must be a positive safe integer', {
			context: { sections: cap },
		})
	}
	return cap
}

/**
 * Returns the cumulative switch after checking it does not combine with a `sections` cap, or throws a
 * coded error.
 *
 * @remarks
 * A cumulative conversation keeps one section, so a cap has nothing to bound. The cap checked is the
 * effective one: inherited from a manager, configured on the conversation, or supplied to one
 * `compact()` call.
 *
 * @param cumulative - Whether folds accumulate every prior section into one
 * @param cap - The effective `sections` cap, or `undefined` for none
 * @returns The cumulative switch unchanged
 * @throws ConversationError Thrown when `cumulative` is true and a cap is present (code `'SECTIONS'`)
 *
 * @example
 * ```ts
 * requireCumulative(true, undefined) // true
 * requireCumulative(false, 2) // false
 * requireCumulative(true, 2) // throws ConversationError ('SECTIONS')
 * ```
 */
export function requireCumulative(cumulative: boolean, cap: number | undefined): boolean {
	if (cumulative && cap !== undefined) {
		throw new ConversationError('SECTIONS', 'cumulative cannot combine with a sections cap', {
			context: { sections: cap },
		})
	}
	return cumulative
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
 * Returns a summarizer digest after checking it carries non-whitespace text, or throws a coded error.
 *
 * @remarks
 * A digest whose trimmed text is empty would commit a section that recaps nothing, so it is
 * refused. Any digest with a non-whitespace character passes unchanged, surrounding whitespace
 * included.
 *
 * @param summary - The summarizer digest to check
 * @returns The digest unchanged
 * @throws ConversationError Thrown when the digest is not a string or its trimmed text is empty (code `'SUMMARY'`)
 *
 * @example
 * ```ts
 * requireSummary('recap') // 'recap'
 * requireSummary('  \n') // throws ConversationError ('SUMMARY')
 * ```
 */
export function requireSummary(summary: string): string {
	if (!isString(summary) || summary.trim() === '') {
		throw new ConversationError('SUMMARY', 'a summarizer digest must carry non-whitespace text')
	}
	return summary
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
		// Aborting `settled` removes the abort listener after the promise settles.
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
