import type { ConversationInterface, ConversationSnapshot, Section } from './types.js'
import type { Judgment, Message, MessageInput } from '../types.js'
import type { Guard } from '@orkestrel/contract'
import { isTokenUsage } from '@orkestrel/budget'
import {
	arrayOf,
	attempt,
	holds,
	isBoolean,
	isFiniteNumber,
	isFunction,
	isObject,
	isRecord,
	isString,
	literalOf,
	optionalOf,
	recordOf,
	unionOf,
} from '@orkestrel/contract'
import { isToolCall } from '@orkestrel/tool'
import { CONVERSATION_ROLES, MESSAGE_ROLES } from '../constants.js'
import { isJudgeAnswer, isJudgeQuestion } from '../validators.js'

/**
 * Checks whether a value satisfies the domain conversation-message contract.
 *
 * @remarks
 * Roles belong to MessageRole, image elements are strings, `thinking` is a string, and `call` is a string on any
 * role, as the flat Message type admits. Tool arguments may carry non-JSON values, as the
 * domain type permits; the message wire contract is narrower. The guard is exact on the message's own
 * keys: an unknown member, and an own `undefined` optional, return false. Unreadable fields and
 * untrusted inputs return false.
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
		if (thinking !== undefined && !isString(thinking)) return false
		// Three members are required, and a key the count misses is an unknown or an own undefined.
		return (
			Object.keys(value).length ===
			3 +
				(calls === undefined ? 0 : 1) +
				(call === undefined ? 0 : 1) +
				(images === undefined ? 0 : 1) +
				(thinking === undefined ? 0 : 1)
		)
	})
	return checked.success && checked.value
}

/**
 * Checks whether a value is a message input a conversation can store: a `ConversationRole`, a string
 * `content`, and `calls`, `call`, `images`, and `thinking` absent or of their declared types.
 *
 * @remarks
 * An exact record, because a stored message is one: a value that is not a plain record, such as a
 * class instance or an object that inherits its `role`, returns false through `recordOf`'s own plain
 * record check, as does a member `MessageInput` does not declare or a declared optional member holding
 * `undefined`. Each tool call crosses `isToolCall` of
 * `@orkestrel/tool`, whose interface admits more members, so the store keeps `id`, `name`, and
 * `arguments` and leaves the rest. `add` reads the role through `requireRole` first, so its text can
 * name the role received. An unreadable member returns false.
 *
 * @param value - The unknown input candidate
 * @returns True if the input's members are valid; false otherwise
 * @example
 * ```ts
 * isMessageInput({ role: 'user', content: 'hi' }) // true
 * isMessageInput({ role: 'user' }) // false
 * ```
 */
export const isMessageInput: Guard<MessageInput> = recordOf(
	{
		role: literalOf(CONVERSATION_ROLES),
		content: isString,
		calls: arrayOf(isToolCall),
		call: isString,
		images: arrayOf(isString),
		thinking: isString,
	},
	['calls', 'call', 'images', 'thinking'],
)

/**
 * Checks whether a stored judgment carries a valid question and exactly one answer or refusal.
 *
 * @remarks
 * Unknown members, malformed members, and unreadable inputs return false, the answer's and the
 * refusal's own included. Answer fields follow the root judge value types; this storage guard does not
 * impose a wire's probability or candidate limits, and the ties an answer holds to its question run
 * where a judgment is written, because records written before them can miss them. The `time`, `noul`,
 * and probability numbers must be finite, because a stored record is owned through JSON, which turns
 * `NaN` and the infinities into `null`; so every record this guard accepts hydrates through a
 * `JudgmentManager`.
 *
 * @param value - The unknown stored record
 * @returns True if the record satisfies the judgment contract; false otherwise
 * @example
 * ```ts
 * isJudgment({ id: 'q', question: { form: 'noul' }, answer: { form: 'noul', noul: 0.9 }, model: 'judge', sources: [], state: 'text', time: 0 }) // true
 * isJudgment({ id: 'q' }) // false
 * ```
 */
export const isJudgment: Guard<Judgment> = unionOf(
	recordOf(
		{
			id: isString,
			question: isJudgeQuestion,
			model: isString,
			sources: arrayOf(isString),
			state: isString,
			time: isFiniteNumber,
			usage: isTokenUsage,
			answer: isJudgeAnswer,
		},
		['usage'],
	),
	recordOf(
		{
			id: isString,
			question: isJudgeQuestion,
			model: isString,
			sources: arrayOf(isString),
			state: isString,
			time: isFiniteNumber,
			usage: isTokenUsage,
			refusal: recordOf({ missing: arrayOf(isString) }),
		},
		['usage'],
	),
)

/**
 * Checks whether an `unknown` is structurally a {@link Section} record — a `string` `id` and
 * `summary` beside a `messages` array of valid {@link Message} records, the per-section step of
 * the {@link isConversationSnapshot} read-boundary narrow. Total, never throwing, and never an
 * assertion.
 *
 * @remarks
 * A total guard (it never throws — untrusted input, a throwing getter included, returns
 * `false`). It checks the shape of the section: a record with a `string` `id`, a `string`
 * `summary`, and a dense `messages` array every element of which is a valid {@link Message}
 * record ({@link isMessage}), and no other member; a sparse `messages` array is refused. Enough to
 * safely impose the {@link Section} type at a storage boundary without a cast.
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
	return holds(() => {
		if (!isRecord(value) || Object.keys(value).length !== 3) return false
		const { id, summary, messages } = value
		return isString(id) && isString(summary) && arrayOf(isMessage)(messages)
	})
}

/**
 * Narrows an `unknown` to a {@link ConversationSnapshot} — a `string` `id` and valid
 * `sections` and `messages` arrays; the total boundary guard for an untrusted snapshot read (a storage row a
 * {@link import('./stores/DatabaseConversationStore.js').DatabaseConversationStore}
 * reads back from its opaque JSON column, a snapshot loaded from disk), never throwing. The exact
 * analogue of {@link import('@orkestrel/workspace').isWorkspaceSnapshot}.
 *
 * @remarks
 * A total guard (it never throws — untrusted input returns `false`). It checks the shape of the
 * snapshot: a `string` `id`, a `sections` array every element of which is a valid
 * {@link Section} ({@link isSection}), a `messages` array every element of which is a
 * valid {@link Message} ({@link isMessage}), and optional valid `judgments` — enough to safely
 * impose the
 * {@link ConversationSnapshot} type at a storage boundary without a cast. The structural twin of
 * {@link import('@orkestrel/workspace').isWorkspaceSnapshot}. The guard is exact: an unknown member, a
 * 0.0.35 snapshot's conversation `summary` included, and an own `undefined` `judgments` return
 * `false`, as a malformed blob (a non-record, a missing / non-string `id`, a non-array `sections` /
 * `messages`, or any malformed element) does, so a
 * {@link import('./stores/DatabaseConversationStore.js').DatabaseConversationStore}
 * read refuses it rather than seating a broken conversation. The guard is structural: it admits a
 * stored `system` role and a repeated id, which `requireConversationSnapshot` and the
 * {@link import('./Conversation.js').Conversation} constructor then refuse as the stored-data
 * check a conversation runs at hydrate.
 *
 * @param value - The value to test (an opaque storage read)
 * @returns True if `value` has the structural shape of a {@link ConversationSnapshot}; false otherwise
 *
 * @example
 * ```ts
 * isConversationSnapshot({ id: 'c1', sections: [], messages: [] }) // true
 * isConversationSnapshot({ id: 'c1', sections: 'nope', messages: [] }) // false
 * isConversationSnapshot({ sections: [], messages: [] }) // false (missing id)
 * ```
 */
export function isConversationSnapshot(value: unknown): value is ConversationSnapshot {
	return holds(() => {
		if (!isRecord(value)) return false
		const { id, sections, messages, judgments } = value
		return (
			Object.keys(value).length === (judgments === undefined ? 3 : 4) &&
			isString(id) &&
			arrayOf(isSection)(sections) &&
			arrayOf(isMessage)(messages) &&
			optionalOf(arrayOf(isJudgment))(judgments)
		)
	})
}

/**
 * Checks whether a value carries the {@link ConversationInterface} members a run reads: a string
 * `id`, a boolean `summarizable`, and `view`, `add`, `compact`, and `messages` methods.
 *
 * @remarks
 * A total guard: a throwing getter, a revoked `Proxy`, and any other malformed input return false.
 * It checks each member as its declared type and admits unknown members and class instances, so
 * any implementation the interface admits passes; it never calls a method.
 *
 * @param value - The value to test
 * @returns True if `value` carries the conversation members a run reads; false otherwise
 * @example
 * ```ts
 * isConversation(createConversation()) // true
 * isConversation({ id: 'c1' }) // false
 * ```
 */
export function isConversation(value: unknown): value is ConversationInterface {
	const checked = attempt(() => {
		if (!isObject(value)) return false
		return (
			isString(Reflect.get(value, 'id')) &&
			isBoolean(Reflect.get(value, 'summarizable')) &&
			isFunction(Reflect.get(value, 'view')) &&
			isFunction(Reflect.get(value, 'add')) &&
			isFunction(Reflect.get(value, 'compact')) &&
			isFunction(Reflect.get(value, 'messages'))
		)
	})
	return checked.success && checked.value
}
