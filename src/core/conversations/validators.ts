import type { ConversationSnapshot, Section } from './types.js'
import type { Judgment, Message } from '../types.js'
import { isTokenUsage } from '@orkestrel/budget'
import {
	arrayOf,
	attempt,
	isArray,
	isNumber,
	isRecord,
	isString,
	optionalOf,
	objectOf,
} from '@orkestrel/contract'
import { isToolCall } from '@orkestrel/tool'
import { MESSAGE_ROLES } from '../constants.js'
import { isJudgeQuestion } from '../validators.js'

/**
 * Checks whether a value satisfies the domain conversation-message contract.
 *
 * @remarks
 * Roles belong to MessageRole, image elements are strings, `thinking` is a string, and `call` is a string on any
 * role, as the flat Message type admits. Tool arguments may carry non-JSON values, as the
 * domain type permits; the message wire contract is narrower. Unreadable fields and hostile
 * inputs return false.
 *
 * @param value - The unknown message candidate
 * @returns True if the domain message fields are valid; false otherwise
 * @example
 * ```ts
 * isMessage({ id: '1', role: 'user', content: 'hi' }) // true
 * isMessage({ id: '1', role: 'other', content: '' }) // false
 * isMessage({ id: '1', role: 'user', content: '', images: [1] }) // false
 * isMessage({ id: '1', role: 'assistant', content: '', thinking: 1 }) // false
 * ```
 */
export function isMessage(value: unknown): value is Message {
	const checked = attempt(() => {
		if (!isRecord(value)) return false
		const { id, role, content, calls, call, images, thinking } = value
		if (!isString(id) || !isString(content)) return false
		if (!MESSAGE_ROLES.some((one) => one === role)) return false
		if (calls !== undefined && !arrayOf(isToolCall)(calls)) return false
		if (call !== undefined && !isString(call)) return false
		if (images !== undefined && !arrayOf(isString)(images)) return false
		return thinking === undefined || isString(thinking)
	})
	return checked.success && checked.value
}

/**
 * Checks whether a stored judgment carries a valid question and exactly one answer or refusal.
 *
 * @remarks
 * Malformed members and unreadable inputs return false. Answer fields follow the root judge
 * value types; this storage guard does not impose a wire's probability or candidate limits.
 *
 * @param value - The unknown stored record
 * @returns True if the record satisfies the judgment contract; false otherwise
 * @example
 * ```ts
 * isJudgment({ id: 'q', question: { form: 'noul' }, answer: { form: 'noul', noul: 0.9 }, model: 'judge', sources: [], state: 'text', time: 0 }) // true
 * isJudgment({ id: 'q' }) // false
 * ```
 */
export function isJudgment(value: unknown): value is Judgment {
	const checked = attempt(() => {
		if (!isRecord(value)) return false
		const { answer, refusal } = value
		if (
			!objectOf(
				{
					id: isString,
					question: isJudgeQuestion,
					model: isString,
					sources: arrayOf(isString),
					state: isString,
					time: isNumber,
					usage: optionalOf(isTokenUsage),
				},
				['usage'],
			)(value)
		)
			return false
		if (answer === undefined) return objectOf({ missing: arrayOf(isString) })(refusal)
		if (refusal !== undefined || !isRecord(answer)) return false
		if (answer.form === 'noul') return isNumber(answer.noul)
		if (answer.form === 'score') return arrayOf(isNumber)(answer.probabilities)
		return (
			answer.form === 'choice' &&
			isRecord(answer.probabilities) &&
			Object.values(answer.probabilities).every(isNumber)
		)
	})
	return checked.success && checked.value
}

/**
 * Checks whether an `unknown` is structurally a {@link Section} record — a `string` `id` and
 * `summary` beside a `messages` array of valid {@link Message}s, the per-section step of the
 * {@link isConversationSnapshot} read-boundary narrow. Total, never throwing, and never an
 * assertion.
 *
 * @remarks
 * A total guard (it never throws — adversarial input returns `false`). It checks the section's
 * shape: a record with a `string` `id`, a `string` `summary`, and a `messages` array every element
 * of which is a valid {@link Message} record ({@link isMessage}). Enough to safely impose
 * the {@link Section} type at a storage boundary without a cast.
 *
 * @param value - The value to test (one element of a snapshot's `sections` array)
 * @returns True if `value` has the structural shape of a {@link Section}; false otherwise
 *
 * @example
 * ```ts
 * isSection({ id: 's', summary: 'recap', messages: [{ id: '1', role: 'user', content: 'hi' }] }) // true
 * isSection({ id: 's', summary: 'recap', messages: 'nope' }) // false
 * isSection({ id: 's', messages: [] }) // false (missing summary)
 * ```
 */
export function isSection(value: unknown): value is Section {
	if (!isRecord(value)) return false
	if (!isString(value.id) || !isString(value.summary)) return false
	return isArray(value.messages) && value.messages.every(isMessage)
}

/**
 * Narrows an `unknown` to a {@link ConversationSnapshot} — a `string` `id`, an optional `string`
 * `summary`, and valid `sections` and `messages` arrays; the total boundary guard for an
 * untrusted snapshot read (a storage row a
 * {@link import('./stores/DatabaseConversationStore.js').DatabaseConversationStore}
 * reads back from its opaque JSON column, a snapshot loaded from disk), never throwing. The exact
 * analogue of {@link import('@orkestrel/workspace').isWorkspaceSnapshot}.
 *
 * @remarks
 * A total guard (it never throws — adversarial input returns `false`). It checks the snapshot's
 * shape: a `string` `id`, an optional `string` `summary` (present-or-absent — the rollup is
 * `undefined` until the first compaction), a `sections` array every element of which is a valid
 * {@link Section} ({@link isSection}), and a `messages` array every element of which is a
 * valid {@link Message} ({@link isMessage}) — enough to safely impose the
 * {@link ConversationSnapshot} type at a storage boundary without a cast. The structural twin of
 * {@link import('@orkestrel/workspace').isWorkspaceSnapshot}. A malformed blob (a non-record, a missing / non-string `id`, a
 * non-string `summary` when present, a non-array `sections` / `messages`, or any malformed
 * element) resolves `false`, so a
 * {@link import('./stores/DatabaseConversationStore.js').DatabaseConversationStore}
 * read yields `undefined` rather than a broken conversation.
 *
 * @param value - The value to test (an opaque storage read)
 * @returns True if `value` has the structural shape of a {@link ConversationSnapshot}; false otherwise
 *
 * @example
 * ```ts
 * isConversationSnapshot({ id: 'c1', sections: [], messages: [] }) // true
 * isConversationSnapshot({ id: 'c1', summary: 'recap', sections: [], messages: [] }) // true
 * isConversationSnapshot({ id: 'c1', sections: 'nope', messages: [] }) // false
 * isConversationSnapshot({ sections: [], messages: [] }) // false (missing id)
 * ```
 */
export function isConversationSnapshot(value: unknown): value is ConversationSnapshot {
	return (
		isRecord(value) &&
		objectOf(
			{
				id: isString,
				summary: optionalOf(isString),
				sections: arrayOf(isSection),
				messages: arrayOf(isMessage),
				judgments: optionalOf(arrayOf(isJudgment)),
			},
			['summary', 'judgments'],
		)(value)
	)
}
