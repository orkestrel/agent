import type { LedgerQuestion, LedgerSnapshot, LedgerWindowSnapshot } from './types.js'
import { arrayOf, holds, isFiniteNumber, isRecord, isString } from '@orkestrel/contract'
import { LEDGER_CATEGORIES } from './constants.js'
import { isConversationSnapshot } from '../conversations/validators.js'
import { isJudgeEntry, isJudgeQuestion, isNonNegativeSafeInteger } from '../validators.js'

/**
 * Checks whether a value has the exact shape of a nonempty exchange window.
 * @param value - The untrusted window
 * @returns True if the window and its members are well shaped; false otherwise
 * @example
 * ```ts
 * isLedgerWindowSnapshot({ digest: 'checksum', exchanges: [{ request: 'request', reply: 'reply', lines: [] }], amendments: [] }) // true
 * ```
 */
export function isLedgerWindowSnapshot(value: unknown): value is LedgerWindowSnapshot {
	return holds(() => {
		if (!isRecord(value) || Object.keys(value).length !== 3 || !isString(value.digest)) return false
		const { exchanges, amendments } = value
		if (!arrayOf(isRecord)(exchanges) || exchanges.length === 0 || !arrayOf(isRecord)(amendments))
			return false
		return (
			exchanges.every((entry) => {
				const { request, reply, copy, lines } = entry
				return (
					Object.keys(entry).length === 3 + Number(copy !== undefined) &&
					isString(request) &&
					isString(reply) &&
					(copy === undefined || isString(copy)) &&
					arrayOf(isRecord)(lines) &&
					lines.every(
						(line) =>
							Object.keys(line).length === 4 &&
							isString(line.key) &&
							isString(line.title) &&
							isString(line.source) &&
							isNonNegativeSafeInteger(line.sentence),
					)
				)
			}) &&
			amendments.every(
				(edge) => Object.keys(edge).length === 2 && isString(edge.earlier) && isString(edge.later),
			)
		)
	})
}

/**
 * Checks whether a value is finite and lies in the interval (0, 1].
 * @param value - The value to inspect
 * @returns True if the value is a valid ledger fraction; false otherwise
 * @example
 * ```ts
 * isFraction(0.8) // true
 * ```
 */
export function isFraction(value: unknown): value is number {
	return isFiniteNumber(value) && value > 0 && value <= 1
}

/**
 * Checks whether a value holds the wording a ledger files with: a choice `category` question whose
 * criteria describe every category, a non-empty `topic` string, and noul `amends` and `supersedes`
 * questions.
 *
 * @remarks
 * A ledger asks these on every message, so a hole in them would otherwise surface as filing that quietly
 * stays undecided. Total: an unreadable member returns false.
 *
 * @param value - The value to inspect
 * @returns True if the value holds the wording the ledger's questions read; false otherwise
 * @example
 * ```ts
 * isLedgerQuestion(LEDGER_QUESTIONS) // true
 * isLedgerQuestion({ topic: 'Does it concern this?' }) // false
 * ```
 */
export function isLedgerQuestion(value: unknown): value is LedgerQuestion {
	return holds(() => {
		if (!isRecord(value)) return false
		const { category, topic, amends, supersedes } = value
		if (!isJudgeQuestion(category) || category.form !== 'choice') return false
		const { criteria } = category
		return (
			LEDGER_CATEGORIES.every((one) => isJudgeEntry(criteria[one])) &&
			isString(topic) &&
			topic.trim() !== '' &&
			isJudgeQuestion(amends) &&
			amends.form === 'noul' &&
			isJudgeQuestion(supersedes) &&
			supersedes.form === 'noul'
		)
	})
}

/**
 * Checks whether a value is a ledger snapshot whose marked ids name messages of its own conversation.
 *
 * @remarks
 * `conversation` must pass `isConversationSnapshot`, and `requests`, `notes`, and `failures` must be
 * dense arrays of strings. Each request and note id must name a `user` message of
 * `conversation.messages` and each failure id a `tool` message, so an id only a section original
 * holds is refused. A `gauge`, when present, must hold a finite `scale` greater than 0 and a finite
 * `overhead` of at least 0. The guard is exact: an unknown member and an own `undefined` `gauge` return
 * false, at the snapshot and in its `gauge`. Unreadable members and untrusted inputs return false. The
 * guard is structural: it admits a conversation holding a stored `system` role
 * or a repeated id, which `requireConversationSnapshot` and the `Conversation` constructor then
 * refuse as the stored-data check a ledger's hydrate runs.
 * A present `window` must be nonempty and exactly shaped. This guard does not audit its references
 * or sentence ranges. Hydration discards the window when its digest disagrees or cannot be computed.
 *
 * @param value - The value to inspect, such as a parsed checkpoint
 * @returns True if the value has the shape of a ledger snapshot whose marked ids name messages of its own conversation; false otherwise
 * @example
 * ```ts
 * const conversation = { id: 'c1', sections: [], messages: [{ id: 'm1', role: 'user', content: 'Check FX-111.' }] }
 * isLedgerSnapshot({ conversation, requests: ['m1'], notes: [], failures: [] }) // true
 * isLedgerSnapshot({ conversation, requests: [], notes: [], failures: ['m1'] }) // false
 * ```
 */
export function isLedgerSnapshot(value: unknown): value is LedgerSnapshot {
	return holds(() => {
		if (!isRecord(value)) return false
		const { conversation, requests, notes, failures, gauge, window } = value
		if (
			Object.keys(value).length !==
			4 + Number(gauge !== undefined) + Number(window !== undefined)
		)
			return false
		if (!isConversationSnapshot(conversation)) return false
		const isIds = arrayOf(isString)
		if (!isIds(requests) || !isIds(notes) || !isIds(failures)) return false
		if (gauge !== undefined) {
			if (!isRecord(gauge) || Object.keys(gauge).length !== 2) return false
			const { scale, overhead } = gauge
			if (!isFiniteNumber(scale) || scale <= 0 || !isFiniteNumber(overhead) || overhead < 0)
				return false
		}
		const roles = new Map(conversation.messages.map((message) => [message.id, message.role]))
		return (
			requests.every((id) => roles.get(id) === 'user') &&
			notes.every((id) => roles.get(id) === 'user') &&
			failures.every((id) => roles.get(id) === 'tool') &&
			(window === undefined || isLedgerWindowSnapshot(window))
		)
	})
}
