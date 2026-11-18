import type { ConversationErrorCode } from './types.js'
import type { CodedErrorOptions } from '../types.js'
import { INTRINSICS, holds, isObject, isFunction } from '@orkestrel/contract'

/**
 * Reports a judgment or judge request that JSON cannot carry, a stored or selected message whose
 * role is not a conversation role, a malformed message input, a malformed snapshot, a manager's
 * `add` of an id it already holds, or a reference label that could rewrite its fence — thrown by
 * the `add` and `reference` methods of a {@link ConversationInterface}, its construction, its
 * judgment store, or its manager, or returned as the `fault` of an agent selection, carrying the
 * machine-readable `code` `'JUDGMENT' | 'ROLE' | 'MESSAGE' | 'SNAPSHOT' | 'ID' | 'LABEL'`.
 *
 * @remarks
 * A judgment record or a judge request that JSON cannot carry, or whose copy fails its guard, is a
 * programmer error and throws this with `'JUDGMENT'`, its `context` naming the `question` id where
 * one exists. A stored message plays a `ConversationRole`: `add` refuses any other role with
 * `'ROLE'` before it stores any message of the batch, a hydrating snapshot that holds one throws
 * `'ROLE'`, and an agent's selection that holds one becomes a `'ROLE'` fault. `add` refuses an input
 * that is not a plain record, before its role is read, or whose other members fail `isMessageInput`
 * with `'MESSAGE'`, its `context` holding the `faults`, before it stores any message of the batch. A
 * hydrating snapshot that fails `isConversationSnapshot`, repeats an id, or holds call arguments JSON
 * cannot carry, and a store row or written snapshot that does, throw `'SNAPSHOT'`; a judgment the
 * guard admits but JSON cannot carry still throws `'JUDGMENT'`. A manager's `add` of an id it
 * already holds throws `'ID'`. A `reference` label holding a double quote or a line break throws
 * `'LABEL'`, its `context` holding the refused `label`. Narrow a caught value with
 * {@link isConversationError} and branch on `error.code`.
 */
export class ConversationError extends Error {
	/** Names the machine-readable condition — `'JUDGMENT'`: a judgment or judge request that is not JSON; `'ROLE'`: a stored or selected message whose role is not a `ConversationRole`; `'MESSAGE'`: a message input that is not a plain record or whose other members fail `isMessageInput`; `'SNAPSHOT'`: a snapshot that fails `isConversationSnapshot`, repeats an id, or holds call arguments JSON cannot carry; `'ID'`: a manager's `add` of an id it already holds; `'LABEL'`: a `reference` label that holds a double quote or a line break. */
	readonly code: ConversationErrorCode
	/** Holds the values that locate the failure, such as the `question` id of a malformed question, or `undefined` when none were supplied. */
	readonly context: Readonly<Record<string, unknown>> | undefined

	/**
	 * Creates the error with its code, message, and optional cause and context.
	 *
	 * @param code - The machine-readable {@link ConversationErrorCode}
	 * @param message - The human-readable description
	 * @param options - The optional {@link CodedErrorOptions}; `cause` reaches `Error.cause` only when present
	 */
	constructor(code: ConversationErrorCode, message: string, options?: CodedErrorOptions) {
		super(message, options?.cause === undefined ? undefined : { cause: options.cause })
		this.name = 'ConversationError'
		INTRINSICS.define(this, Symbol.for('@orkestrel/agent.ConversationError'), { value: this })
		this.code = code
		this.context = options?.context
	}
}

/**
 * Narrows an unknown caught value to a {@link ConversationError} through its identity brand and declared members, so a
 * `catch` can branch on its `code`.
 *
 * @param value - The value to test (typically a `catch` binding)
 * @returns True if `value` is a {@link ConversationError}; false otherwise
 *
 * @example
 * ```ts
 * try {
 * 	conversation.add({ role: 'system', content: 'You are terse.' })
 * } catch (error) {
 * 	if (isConversationError(error) && error.code === 'ROLE') useInstruction()
 * }
 * ```
 */
export function isConversationError(value: unknown): value is ConversationError {
	return holds(() => {
		if (
			!(
				value instanceof Error &&
				INTRINSICS.prototype(value) !== Error.prototype &&
				INTRINSICS.describe(value, Symbol.for('@orkestrel/agent.ConversationError'))?.value ===
					value
			)
		)
			return false
		const code = INTRINSICS.reflect.read(value, 'code')
		if (
			!(
				code === 'JUDGMENT' ||
				code === 'ROLE' ||
				code === 'MESSAGE' ||
				code === 'SNAPSHOT' ||
				code === 'ID' ||
				code === 'LABEL'
			)
		)
			return false
		const context = INTRINSICS.reflect.read(value, 'context')
		return context === undefined || isObject(context) || isFunction(context)
	})
}
