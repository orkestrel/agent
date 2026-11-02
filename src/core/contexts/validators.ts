import type { Memo, MemoSnapshot } from './types.js'
import type { Guard } from '@orkestrel/contract'
import { andOf, arrayOf, isFiniteNumber, isRecord, isString, objectOf } from '@orkestrel/contract'

/**
 * Checks whether a value is a stored memo revision: a record with a string `id`, `name`,
 * `description`, and `content`, a finite `time`, and an optional `origin`.
 *
 * @remarks
 * An `origin`, when present, is a record with a string `conversation` and an optional string
 * `message`. Unknown members are admitted. The `time` must be finite, because a stored revision
 * is owned through JSON, which turns `NaN` and the infinities into `null`. Malformed and
 * unreadable inputs, a throwing getter or a revoked proxy included, return false.
 *
 * @param value - The value to test
 * @returns True if `value` has the shape of a {@link Memo}; false otherwise
 *
 * @example
 * ```ts
 * import { isMemo } from '@orkestrel/agent'
 *
 * isMemo({ id: 'm1', name: 'tone', description: 'Prefers short replies.', content: 'Answer briefly.', time: 0 }) // true
 * isMemo({ id: 'm1', name: 'tone', description: 'Prefers short replies.', content: 'Answer briefly.', time: Number.NaN }) // false
 * ```
 */
export const isMemo: Guard<Memo> = andOf(
	isRecord,
	objectOf(
		{
			id: isString,
			name: isString,
			description: isString,
			content: isString,
			time: isFiniteNumber,
			origin: andOf(isRecord, objectOf({ conversation: isString, message: isString }, ['message'])),
		},
		['origin'],
	),
)

/**
 * Checks whether a value is a stored memo set: a record with a string `id` and a dense `memos`
 * array of {@link isMemo} values.
 *
 * @remarks
 * Unknown members are admitted. A sparse `memos` array, a malformed revision, and unreadable
 * inputs, a throwing getter or a revoked proxy included, return false.
 *
 * @param value - The value to test (an opaque storage read)
 * @returns True if `value` has the shape of a {@link MemoSnapshot}; false otherwise
 *
 * @example
 * ```ts
 * import { isMemoSnapshot } from '@orkestrel/agent'
 *
 * isMemoSnapshot({ id: 'ada', memos: [] }) // true
 * isMemoSnapshot({ id: 'ada', memos: [{ name: 'tone' }] }) // false
 * ```
 */
export function isMemoSnapshot(value: unknown): value is MemoSnapshot {
	return isRecord(value) && objectOf({ id: isString, memos: arrayOf(isMemo) })(value)
}
