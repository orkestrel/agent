import type {
	ConversationSnapshot,
	JudgeEntry,
	JudgeQuestion,
	Message,
	Section,
	SystemOneAnswer,
	SystemOneResponse,
} from './types.js'
import {
	arrayOf,
	attempt,
	boundsOf,
	isArray,
	isJSONValue,
	isNumber,
	isRecord,
	isString,
	nullableOf,
	optionalOf,
} from '@orkestrel/contract'
import { isToolCall } from '@orkestrel/tool'

/**
 * Checks whether a value satisfies the domain conversation-message contract.
 *
 * @remarks
 * Roles belong to MessageRole and image elements are strings. Tool arguments may
 * carry non-JSON values, as the domain type permits; the message wire contract is
 * narrower. Unreadable fields and hostile inputs return false.
 *
 * @param value - The unknown message candidate
 * @returns True if the domain message fields are valid; false otherwise
 * @example
 * ```ts
 * isMessage({ id: '1', role: 'user', content: 'hi' }) // true
 * isMessage({ id: '1', role: 'other', content: '' }) // false
 * isMessage({ id: '1', role: 'user', content: '', images: [1] }) // false
 * ```
 */
export function isMessage(value: unknown): value is Message {
	const checked = attempt(() => {
		if (!isRecord(value)) return false
		const { id, role, content, calls, images } = value
		if (!isString(id) || !isString(content)) return false
		if (role !== 'system' && role !== 'user' && role !== 'assistant' && role !== 'tool')
			return false
		if (calls !== undefined && !arrayOf(isToolCall)(calls)) return false
		return images === undefined || arrayOf(isString)(images)
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
 * {@link import('./conversations/stores/DatabaseConversationStore.js').DatabaseConversationStore}
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
 * {@link import('./conversations/stores/DatabaseConversationStore.js').DatabaseConversationStore}
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
	if (!isRecord(value)) return false
	if (!isString(value.id)) return false
	if (value.summary !== undefined && !isString(value.summary)) return false
	if (!isArray(value.sections) || !value.sections.every(isSection)) return false
	return isArray(value.messages) && value.messages.every(isMessage)
}

/**
 * Checks whether a value is a judge entry: a string, a JSON record, or a JSON array.
 *
 * @remarks
 * Total: a cycle, a non-JSON member, a class instance, and a hostile input return false. `null`
 * is not an entry; a criteria guard admits it where the protocol keeps it.
 *
 * @param value - The unknown entry candidate
 * @returns True if the value is a string or JSON structure the model can read; false otherwise
 * @example
 * ```ts
 * isJudgeEntry('Customer asks for a refund') // true
 * isJudgeEntry({ ticket: 4182, tags: ['billing'] }) // true
 * isJudgeEntry(null) // false
 * isJudgeEntry({ opened: new Date() }) // false
 * ```
 */
export function isJudgeEntry(value: unknown): value is JudgeEntry {
	if (isString(value)) return true
	return (isRecord(value) || isArray(value)) && isJSONValue(value)
}

/**
 * Checks whether a value is a well-formed judge question of the choice, score, or noul form.
 *
 * @remarks
 * Total: a hostile input returns false. A choice needs at least 2 options and a score at least 2
 * levels, because the confidence formula divides by the candidate count; a description or a level
 * can be `null`. `instructions` and noul `criteria` are omitted when absent and never `null`.
 * Server limits on option, level, and question counts are left to the server.
 *
 * @param value - The unknown question candidate
 * @returns True if the value is a question the judge engine can send; false otherwise
 * @example
 * ```ts
 * isJudgeQuestion({ form: 'choice', criteria: { billing: null, bug: 'Software defect' } }) // true
 * isJudgeQuestion({ form: 'score', criteria: ['Cosmetic', null, 'Blocking'] }) // true
 * isJudgeQuestion({ form: 'noul', instructions: 'Is a refund owed?' }) // true
 * isJudgeQuestion({ form: 'choice', criteria: { billing: null } }) // false
 * ```
 */
export function isJudgeQuestion(value: unknown): value is JudgeQuestion {
	const checked = attempt(() => {
		if (!isRecord(value)) return false
		const { form, instructions, criteria } = value
		if (instructions !== undefined && !isJudgeEntry(instructions)) return false
		if (form === 'choice') {
			return (
				isRecord(criteria) &&
				Object.keys(criteria).length >= 2 &&
				Object.values(criteria).every(nullableOf(isJudgeEntry))
			)
		}
		if (form === 'score') {
			return arrayOf(nullableOf(isJudgeEntry))(criteria) && criteria.length >= 2
		}
		if (form !== 'noul') return false
		if (criteria === undefined) return true
		if (!isRecord(criteria)) return false
		return optionalOf(isJudgeEntry)(criteria.true) && optionalOf(isJudgeEntry)(criteria.false)
	})
	return checked.success && checked.value
}

/**
 * Checks whether a value is a System One response envelope with optional model and usage.
 *
 * @remarks
 * Answers remain unknown until checked against their questions. Missing and null usage counts
 * are accepted. Extra members are ignored, and unreadable fields return false.
 *
 * @param value - The unknown response candidate
 * @returns True if the envelope fields have their wire types; false otherwise
 * @example
 * ```ts
 * isSystemOneResponse({ answers: {}, usage: { input_tokens: null } }) // true
 * ```
 */
export function isSystemOneResponse(value: unknown): value is SystemOneResponse {
	const checked = attempt(() => {
		if (!isRecord(value)) return false
		const { model, answers, usage } = value
		if (!optionalOf(isString)(model) || !isRecord(answers)) return false
		if (usage === undefined) return true
		if (!isRecord(usage)) return false
		return (
			optionalOf(nullableOf(isNumber))(usage.input_tokens) &&
			optionalOf(nullableOf(isNumber))(usage.output_tokens)
		)
	})
	return checked.success && checked.value
}

/**
 * Checks whether a value is a System One answer with bounded probabilities and typed metadata.
 *
 * @remarks
 * Score probabilities and legends accept maps or dense arrays. Legend entries follow the wire
 * entry contract without imposing question length or key equality. Distribution sums are not
 * constrained; values are never normalized. Extra members are ignored, and hostile reads return false.
 *
 * @param value - The unknown answer candidate
 * @returns True if the answer fields satisfy the wire contract; false otherwise
 * @example
 * ```ts
 * isSystemOneAnswer({ type: 'noul', noul: 0.9 }) // true
 * isSystemOneAnswer({ type: 'score', probabilities: [0.2, 0.8] }) // true
 * ```
 */
export function isSystemOneAnswer(value: unknown): value is SystemOneAnswer {
	const checked = attempt(() => {
		if (!isRecord(value)) return false
		const { type, confidence } = value
		if (!optionalOf(isNumber)(confidence)) return false
		if (type === 'noul') {
			const { noul } = value
			return boundsOf(0, 1)(noul)
		}
		if (type !== 'choice' && type !== 'score') return false
		const { probabilities } = value
		if (type === 'choice' && !optionalOf(isString)(value.choice)) return false
		if (type === 'score') {
			const { score, legend } = value
			if (!optionalOf(isNumber)(score)) return false
			if (legend !== undefined) {
				if (isArray(legend)) {
					if (!arrayOf(nullableOf(isJudgeEntry))(legend)) return false
				} else if (!isRecord(legend) || !Object.values(legend).every(nullableOf(isJudgeEntry))) {
					return false
				}
			}
		}
		if (type === 'score' && isArray(probabilities)) {
			return arrayOf(boundsOf(0, 1))(probabilities)
		}
		return isRecord(probabilities) && Object.values(probabilities).every(boundsOf(0, 1))
	})
	return checked.success && checked.value
}
