import type { ConversationSnapshot } from './types.js'
import type {
	ConversationRole,
	JudgeAnswer,
	JudgeRequest,
	JudgeResult,
	Judgment,
	JudgmentInput,
	Message,
	MessageInput,
	Refusal,
} from '../types.js'
import type { ContractInterface } from '@orkestrel/contract'
import {
	describeFaults,
	attempt,
	isArray,
	isJSONValue,
	isRecord,
	preview,
} from '@orkestrel/contract'
import { REFERENCE_BREAK_PATTERN, REFERENCE_LABEL_PATTERN } from './constants.js'
import { ConversationError } from './errors.js'
import { isConversationSnapshot, isJudgment, isMessage, isMessageInput } from './validators.js'
import { CONVERSATION_ROLES } from '../constants.js'
import { collectToolGroups } from '../helpers.js'

/**
 * Reads what a judge result holds for one question, from its own keys alone.
 *
 * @param result - The reported answers and refusals
 * @param id - The question's id
 * @returns The answer and the refusal, each undefined when the result holds none
 * @example
 * ```ts
 * readJudgeOutcome({ model: 'm', answers: {} }, 'q') // { answer: undefined, refusal: undefined }
 * ```
 */
export function readJudgeOutcome(
	result: JudgeResult,
	id: string,
): { readonly answer: JudgeAnswer | undefined; readonly refusal: Refusal | undefined } {
	return {
		answer: Object.hasOwn(result.answers, id) ? result.answers[id] : undefined,
		refusal:
			result.refusals !== undefined && Object.hasOwn(result.refusals, id)
				? result.refusals[id]
				: undefined,
	}
}

/**
 * Returns after checking a complete judge result answered or refused every question it was asked, or
 * throws a coded error naming those it left out.
 *
 * @remarks
 * A cancelled call's partial is not complete, so `JudgmentManager` reads this on a settled result only,
 * and {@link buildJudgments} stores whatever a partial holds.
 *
 * An undefined value is no answer, as {@link buildJudgments} reads it, so a key alone doesn't count.
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
	const left = Object.keys(request.questions).filter((id) => {
		const { answer, refusal } = readJudgeOutcome(result, id)
		return answer === undefined && refusal === undefined
	})
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
		const { answer, refusal } = readJudgeOutcome(result, id)
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
 * A value that is not a plain record, such as a class instance or an object that inherits its
 * `role`, refuses first, through `isRecord` of `@orkestrel/contract`, with a text saying so. The role
 * goes next, through {@link requireRole}, so its refusal names what it received. The members
 * cross {@link isMessageInput}, an exact record guard, so a member `MessageInput` does not declare or a
 * declared member holding `undefined` refuses, and `audit` runs only after a refusal. Tool-call
 * arguments must also be JSON values before a message is stored.
 *
 * @param input - The message input to check
 * @param contract - The message input contract, whose `audit` is read only on a refusal
 * @returns The input, narrowed
 * @throws ConversationError Thrown when the input is not a plain record (code `'MESSAGE'`), when the role is not a `ConversationRole` (code `'ROLE'`), or when a member fails `isMessageInput`, an undeclared member included (code `'MESSAGE'`), with the faults under `context.faults`
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
	if (!isRecord(input)) {
		const faults = contract.audit(input)
		throw new ConversationError(
			'MESSAGE',
			'a message input must be a plain record, an object literal or parsed JSON holding its role and content as its own members, not a class instance or an object that inherits them',
			{ context: { faults } },
		)
	}
	requireRole(input.role)
	if (
		isMessageInput(input) &&
		(input.calls === undefined || input.calls.every((call) => isJSONValue(call.arguments)))
	)
		return input
	const faults = contract.audit(input)
	throw new ConversationError(
		'MESSAGE',
		`a message input must carry string content, calls, call, images, and thinking of their declared types, and no other member\n${describeFaults(faults, contract.schema)}`,
		{ context: { faults } },
	)
}

/**
 * Returns a conversation snapshot after checking its shape, its stored roles, its ids, and its call
 * arguments, or throws a coded error.
 *
 * @remarks
 * The check reads every own member of `value` once and builds a candidate from those reads: each
 * array member becomes a fresh array holding the same element objects, and a member that is not an
 * array stays as read, so the guard refuses it. The candidate must pass `isConversationSnapshot`, which
 * is exact, so an unknown key refuses rather than being dropped, a `sections` member included; every
 * message must play a `ConversationRole`; no message id may repeat; and every call's arguments must be
 * a JSON value, as `add` requires, because the conversation owns each message through JSON and a value
 * JSON would change is one `snapshot()` never wrote. The `'ROLE'` refusal of a `system` message names
 * the row a snapshot written before 0.0.35 can hold, and each `'SNAPSHOT'` refusal asks for what
 * `snapshot()` returned. The candidate is returned, never `value`, so the check and the seating share
 * one read of the top-level members. The contract's `audit` runs only after the guard refused, to fill
 * `context.faults`.
 *
 * @param value - The snapshot to check, typically a stored read
 * @param contract - The snapshot contract, whose `audit` is read only on a refusal
 * @returns The candidate snapshot
 * @throws ConversationError Thrown when the value fails `isConversationSnapshot` (code `'SNAPSHOT'`, its faults under `context.faults`), repeats an id or holds call arguments JSON cannot carry (code `'SNAPSHOT'`), or holds a message whose role is not a `ConversationRole` (code `'ROLE'`)
 *
 * @example
 * ```ts
 * requireConversationSnapshot({ id: 'c1', messages: [] }, conversationSnapshotContract) // { id: 'c1', messages: [] }
 * requireConversationSnapshot({ id: 'c1', sections: [], messages: [] }, conversationSnapshotContract) // throws ConversationError ('SNAPSHOT')
 * ```
 */
export function requireConversationSnapshot(
	value: unknown,
	contract: Pick<ContractInterface<unknown>, 'audit' | 'schema'>,
): ConversationSnapshot {
	const candidate = attempt(() => {
		if (!isRecord(value)) return undefined
		const read = { ...value }
		const { messages, judgments } = read
		return {
			...read,
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
			`a conversation snapshot must carry a string id, valid messages, valid judgments when present, and no other member; pass what snapshot() returned\n${describeFaults(faults, contract.schema)}`,
			{ context: { faults } },
		)
	}
	const snapshot = candidate.value
	snapshot.messages.forEach((message) => {
		if (message.role === 'system')
			throw new ConversationError(
				'ROLE',
				'a conversation snapshot holds a system message; a snapshot written before 0.0.35 can hold a system row; remove it before loading',
			)
		requireRole(message.role)
	})
	const ids = snapshot.messages.map((message) => message.id)
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
	const unowned = snapshot.messages.find(
		(message) =>
			message.calls !== undefined && !message.calls.every((call) => isJSONValue(call.arguments)),
	)
	if (unowned !== undefined) {
		throw new ConversationError(
			'SNAPSHOT',
			`a conversation snapshot holds call arguments JSON cannot carry on message ${JSON.stringify(unowned.id.slice(0, 64))}; pass what snapshot() returned`,
		)
	}
	return snapshot
}

/**
 * Returns the owned copy of a stored message after checking it is a message of a conversation role,
 * or throws a coded error.
 *
 * @remarks
 * A conversation owns each message through JSON before it stores it, as `freezeJSON` returns it, and
 * this narrows that copy. The door checked the value it was given before the copy read it again, so a
 * refusal here means a member read differently on the second read, as an accessor can; the error then
 * carries the door's own code.
 *
 * @param value - The owned copy of a message, as `freezeJSON` returns it
 * @param code - The code of the door that admitted the message: `'MESSAGE'` for `add`, `'SNAPSHOT'` for a hydrate
 * @returns The copy, narrowed to a {@link Message}
 * @throws ConversationError Thrown when the copy is not a message of a conversation role (with `code`)
 *
 * @example
 * ```ts
 * requireStoredMessage(freezeJSON({ id: 'm1', role: 'user', content: 'Hello.' }), 'MESSAGE') // the frozen copy
 * requireStoredMessage(undefined, 'SNAPSHOT') // throws ConversationError ('SNAPSHOT')
 * ```
 */
export function requireStoredMessage(value: unknown, code: 'MESSAGE' | 'SNAPSHOT'): Message {
	if (!isMessage(value) || !CONVERSATION_ROLES.some((role) => role === value.role)) {
		throw new ConversationError(
			code,
			'a stored message must be a record of a conversation role that JSON carries and that reads the same on every read; pass a plain record',
		)
	}
	return value
}

/**
 * Collects the ids a removal takes, in message order: every supplied id a message holds, and every
 * other member of each call group one of them belongs to.
 *
 * @remarks
 * Pure. A call group is an assistant message that carries calls and the tool messages that answer
 * it, as {@link import('../helpers.js').collectToolGroups} groups them, so removing any member takes
 * the whole group and a provider never receives half of one. A tool message no assistant message owns
 * belongs to no call group and leaves alone. A supplied id no message holds adds nothing.
 *
 * @param messages - The stored messages, in insertion order
 * @param ids - The ids a caller asked to remove
 * @returns The ids to remove, in message order
 *
 * @example
 * ```ts
 * collectRemovals(
 * 	[
 * 		{ id: 'lookup', role: 'assistant', content: '', calls: [{ id: 'order', name: 'lookup', arguments: {} }] },
 * 		{ id: 'result', role: 'tool', content: 'LH-81660 is late', call: 'order' },
 * 	],
 * 	['result'],
 * ) // ['lookup', 'result']
 * ```
 */
export function collectRemovals(
	messages: readonly Message[],
	ids: readonly string[],
): readonly string[] {
	// `Array.from` visits a hole in `ids` as `undefined`, which names no message; `new Set` would too.
	const named = new Set<unknown>(Array.from(ids))
	const grouped = collectToolGroups(messages).flatMap((group) => {
		const [leader] = group
		return leader?.role === 'assistant' && group.some((message) => named.has(message.id))
			? group.map((message) => message.id)
			: []
	})
	const removed = new Set<unknown>([...named, ...grouped])
	return messages.filter((message) => removed.has(message.id)).map((message) => message.id)
}

/**
 * Returns a reference label after checking it holds no double quote and no line break, or throws a
 * coded error.
 *
 * @remarks
 * The label is interpolated between double quotes in both markers of a reference block, so a double
 * quote would close the quoted name early and a line break would start a line a small model could
 * read as a marker or an excerpt. A line break is any of line feed, vertical tab, form feed,
 * carriage return, next line, line separator, and paragraph separator. The refusal names the label
 * JSON-encoded and cut to 64 characters.
 *
 * @param label - The label to check
 * @returns The label unchanged
 * @throws ConversationError Thrown when the label holds a double quote or a line break (code `'LABEL'`)
 *
 * @example
 * ```ts
 * requireLabel('planning') // 'planning'
 * requireLabel('planning "desk"') // throws ConversationError ('LABEL')
 * ```
 */
export function requireLabel(label: string): string {
	if (REFERENCE_LABEL_PATTERN.test(label)) {
		throw new ConversationError(
			'LABEL',
			`a reference label must hold no double quote and no line break, either of which could rewrite the block's markers; received ${JSON.stringify(label.slice(0, 64))}`,
			{ context: { label: label.slice(0, 64) } },
		)
	}
	return label
}

/**
 * Renders a reference block: an opening marker naming the label, the excerpts under a
 * `Relevant messages:` line when there are any, and a closing marker naming the label.
 *
 * @remarks
 * Pure. Each excerpt renders as `- role: content`, and every line of it after its first is indented
 * by two spaces, so no excerpt text starts a line at the margin, where it could read as another
 * excerpt or as a marker; a carriage return before a line feed counts as one break. The caller checks
 * the label with {@link requireLabel} first. A hole in `messages` is visited as an undefined message,
 * as iteration visits it, and its read throws.
 *
 * @param label - The provenance label, already checked
 * @param messages - The excerpts, in the order to render them
 * @returns The block, its lines joined with line feeds
 *
 * @example
 * ```ts
 * renderReference('desk', [{ id: 'm1', role: 'user', content: 'Line one\nLine two' }])
 * // '[Reference — conversation "desk" — NOT part of this conversation]\nRelevant messages:\n- user: Line one\n  Line two\n[End of reference "desk"]'
 * ```
 */
export function renderReference(label: string, messages: readonly Message[]): string {
	return [
		`[Reference — conversation "${label}" — NOT part of this conversation]`,
		...(messages.length > 0
			? [
					'Relevant messages:',
					...Array.from(messages, (message) =>
						`- ${message.role}: ${message.content}`.split(REFERENCE_BREAK_PATTERN).join('\n  '),
					),
				]
			: []),
		`[End of reference "${label}"]`,
	].join('\n')
}
