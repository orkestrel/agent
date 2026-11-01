import type { LedgerSnapshot } from './types.js'
import { arrayOf, holds, isFiniteNumber, isRecord, isString } from '@orkestrel/contract'
import { isConversationSnapshot } from '../conversations/validators.js'

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
 * Checks whether a value is a positive safe integer.
 * @param value - The value to inspect
 * @returns True if the value is a positive safe integer; false otherwise
 * @example
 * ```ts
 * isPositiveSafeInteger(4096) // true
 * ```
 */
export function isPositiveSafeInteger(value: unknown): value is number {
	return isFiniteNumber(value) && Number.isSafeInteger(value) && value > 0
}

/**
 * Checks whether a value is a ledger snapshot whose marked ids name messages of its own conversation.
 *
 * @remarks
 * `conversation` must pass `isConversationSnapshot`, and `requests`, `notes`, and `failures` must be
 * dense arrays of strings. Each request and note id must name a `user` message of
 * `conversation.messages` and each failure id a `tool` message, so an id only a section original
 * holds is refused. A `gauge`, when present, must hold a finite `scale` greater than 0 and a finite
 * `overhead` of at least 0. Unknown members are admitted. Unreadable members and hostile inputs
 * return false. The guard is structural: it admits a conversation holding a stored `system` role
 * or a repeated id, which `requireConversationSnapshot` and the `Conversation` constructor then
 * refuse as the stored-data check a ledger's hydrate runs.
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
		const { conversation, requests, notes, failures, gauge } = value
		if (!isConversationSnapshot(conversation)) return false
		const isIds = arrayOf(isString)
		if (!isIds(requests) || !isIds(notes) || !isIds(failures)) return false
		if (gauge !== undefined) {
			if (!isRecord(gauge)) return false
			const { scale, overhead } = gauge
			if (!isFiniteNumber(scale) || scale <= 0 || !isFiniteNumber(overhead) || overhead < 0)
				return false
		}
		const roles = new Map(conversation.messages.map((message) => [message.id, message.role]))
		return (
			requests.every((id) => roles.get(id) === 'user') &&
			notes.every((id) => roles.get(id) === 'user') &&
			failures.every((id) => roles.get(id) === 'tool')
		)
	})
}
