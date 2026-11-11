import type { Memo, MemoOrigin, MemoSnapshot, ScopeInterface } from './types.js'
import {
	arrayOf,
	holds,
	isFiniteNumber,
	isFunction,
	isObject,
	isRecord,
	isString,
	optionalOf,
} from '@orkestrel/contract'

/**
 * Checks whether a value is a memo's origin: a record with a string `conversation` and an optional
 * string `message`.
 *
 * @remarks
 * The guard is exact: an unknown member and an own `undefined` `message` return false. Malformed and
 * unreadable inputs return false.
 *
 * @param value - The value to test
 * @returns True if `value` has the shape of a {@link MemoOrigin}; false otherwise
 * @example
 * ```ts
 * isMemoOrigin({ conversation: 'c1', message: 'm1' }) // true
 * isMemoOrigin({ conversation: 'c1', extra: true }) // false
 * ```
 */
export function isMemoOrigin(value: unknown): value is MemoOrigin {
	return holds(() => {
		if (!isRecord(value)) return false
		const { conversation, message } = value
		return (
			isString(conversation) &&
			(message === undefined || isString(message)) &&
			Object.keys(value).length === (message === undefined ? 1 : 2)
		)
	})
}

/**
 * Checks whether a value is a stored memo revision: a record with a string `id`, `name`,
 * `description`, and `content`, a finite `time`, and an optional `origin`.
 *
 * @remarks
 * An `origin`, when present, is a record with a string `conversation` and an optional string
 * `message`. The guard is exact: an unknown member and an own `undefined` optional return false. The
 * `time` must be finite, because a stored revision is owned through JSON, which turns `NaN` and the
 * infinities into `null`. Malformed and unreadable inputs, a throwing getter or a revoked proxy
 * included, return false. Every revision of a hydrate reads this guard, so it counts keys by hand
 * rather than through a built one, and `memoSnapshotContract` holds it in lockstep.
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
export function isMemo(value: unknown): value is Memo {
	return holds(() => {
		if (!isRecord(value)) return false
		const { id, name, description, content, time, origin } = value
		return (
			isString(id) &&
			isString(name) &&
			isString(description) &&
			isString(content) &&
			isFiniteNumber(time) &&
			(origin === undefined || isMemoOrigin(origin)) &&
			Object.keys(value).length === (origin === undefined ? 5 : 6)
		)
	})
}

/**
 * Checks whether a value is a stored memo set: a record with a string `id` and a dense `memos`
 * array of {@link isMemo} values.
 *
 * @remarks
 * The guard is exact: an unknown member returns false, as a sparse `memos` array, a malformed
 * revision, and unreadable inputs, a throwing getter or a revoked proxy included, do.
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
	return holds(() => {
		if (!isRecord(value) || Object.keys(value).length !== 2) return false
		const { id, memos } = value
		return isString(id) && arrayOf(isMemo)(memos)
	})
}

/**
 * Checks whether a value implements `ScopeInterface`; total, each member read one time, any
 * implementation admitted.
 *
 * @remarks
 * A scope is a string `id` and `name`, each of `instructions`, `skills`, `memos`, `tools`, `files`,
 * and `workspaces` absent or a dense array of strings, `select` absent or a function, and a `narrow`
 * function. The guard reads each of those members one time and never calls a method. It admits
 * unknown members, a class instance, and a transparent proxy, and returns false for a throwing
 * getter, a revoked proxy, and any other malformed input.
 *
 * @param value - The value to test
 * @returns True if `value` carries the members of a {@link ScopeInterface}; false otherwise
 *
 * @example
 * ```ts
 * import { createScope, isScope } from '@orkestrel/agent'
 *
 * isScope(createScope({ name: 'reader', tools: ['search'] })) // true
 * isScope({ id: 's1', name: 'reader' }) // false
 * ```
 */
export function isScope(value: unknown): value is ScopeInterface {
	return holds(() => {
		if (!isObject(value)) return false
		const list = optionalOf(arrayOf(isString))
		return (
			isString(Reflect.get(value, 'id')) &&
			isString(Reflect.get(value, 'name')) &&
			list(Reflect.get(value, 'instructions')) &&
			list(Reflect.get(value, 'skills')) &&
			list(Reflect.get(value, 'memos')) &&
			list(Reflect.get(value, 'tools')) &&
			list(Reflect.get(value, 'files')) &&
			list(Reflect.get(value, 'workspaces')) &&
			optionalOf(isFunction)(Reflect.get(value, 'select')) &&
			isFunction(Reflect.get(value, 'narrow'))
		)
	})
}
