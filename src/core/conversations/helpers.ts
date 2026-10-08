import type { Judgment, JudgmentInput, Section } from './types.js'
import type { JudgeQuestion, JudgeRequest, JudgeResult, Message } from '../types.js'
import { CONVERSATION_RECAP_PREFIX } from './constants.js'

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
 * Matches a recorded question, ordered sources, rendered state, and judge identity by JSON text, so key order counts.
 *
 * @param judgment - The recorded judgment to compare
 * @param question - The question to ask
 * @param sources - The ordered source message ids
 * @param state - The rendered state to compare
 * @param model - The configured judge identity
 * @returns True if every identity component matches; false otherwise
 * @example
 * ```ts
 * matchesJudgment(judgment, question, ['message-a'], 'Charged twice', judge.model)
 * ```
 */
export function matchesJudgment(
	judgment: Judgment,
	question: JudgeQuestion,
	sources: readonly string[],
	state: string,
	model: string,
): boolean {
	return (
		judgment.model === model &&
		judgment.state === state &&
		judgment.sources.length === sources.length &&
		judgment.sources.every((id, index) => id === sources[index]) &&
		JSON.stringify(judgment.question) === JSON.stringify(question)
	)
}

/**
 * Builds the raw synthetic summary message for one compacted section — role `'assistant'`, the
 * section's stable `id`, and its `summary` verbatim as content.
 *
 * @remarks
 * Pure and total. This is the unframed form an opted-in rollup regeneration digests (a
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

/**
 * Collects each assistant message that carries calls together with the tool messages that answer
 * it, then each run of tool messages that no assistant message owns.
 *
 * @remarks
 * A tool message belongs to the one assistant message whose calls hold its `call` id. Without that
 * unique owner, it belongs to the assistant message that leads its run of tool messages when that
 * leader holds the id, repeats a call id, or the tool message has no `call`. Any other tool message
 * joins the orphan run it sits in. Compaction and the stock selection each keep a group on one side
 * of their cut.
 *
 * @param messages - The messages in prompt order
 * @returns The owned groups in owner order, then the orphan runs, each in prompt order
 * @example
 * ```ts
 * collectToolGroups([
 * 	{ id: 'lookup', role: 'assistant', content: '', calls: [{ id: 'order', name: 'lookup', arguments: {} }] },
 * 	{ id: 'result', role: 'tool', content: 'LH-81660 is late', call: 'order' },
 * ]) // one group holding the lookup call and its result
 * ```
 */
export function collectToolGroups(messages: readonly Message[]): ReadonlyArray<readonly Message[]> {
	const groups = new Map<Message, Message[]>()
	const calls = new Map<string, Message[]>()
	for (const message of messages) {
		if (message.role !== 'assistant' || !message.calls?.length) continue
		groups.set(message, [message])
		for (const call of message.calls) {
			const owners = calls.get(call.id) ?? []
			owners.push(message)
			calls.set(call.id, owners)
		}
	}
	let leader: Message | undefined
	let orphan: Message[] = []
	const orphans: Message[][] = []
	for (const message of messages) {
		if (message.role !== 'tool') {
			leader = groups.has(message) ? message : undefined
			orphan = []
			continue
		}
		const local = leader?.calls ?? []
		const duplicate = new Set(local.map((call) => call.id)).size !== local.length
		const paired =
			leader !== undefined &&
			(duplicate || message.call === undefined || local.some((call) => call.id === message.call))
		const owners = message.call === undefined ? undefined : calls.get(message.call)
		const owner = owners?.length === 1 ? owners[0] : paired ? leader : undefined
		const group = owner === undefined ? undefined : groups.get(owner)
		if (group !== undefined) group.push(message)
		else {
			if (orphan.length === 0) orphans.push(orphan)
			orphan.push(message)
		}
	}
	return [...groups.values(), ...orphans]
}
