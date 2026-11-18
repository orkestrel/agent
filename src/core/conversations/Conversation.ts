import type {
	ConversationEventMap,
	ConversationInterface,
	ConversationOptions,
	ConversationReferenceOptions,
	ConversationSnapshot,
	JudgmentManagerInterface,
} from './types.js'
import type { Message, MessageInput } from '../types.js'
import type { EmitterInterface } from '@orkestrel/emitter'
import { isArray, refuseOptionKeys } from '@orkestrel/contract'
import { Emitter } from '@orkestrel/emitter'
import { freezeJSON } from '../cloners.js'
import { messageInputContract } from '../contracts.js'
import { conversationSnapshotContract } from './contracts.js'
import { CONVERSATION_OPTION_KEYS, REFERENCE_OPTION_KEYS } from './constants.js'
import { ConversationError } from './errors.js'
import {
	collectRemovals,
	renderReference,
	requireConversationSnapshot,
	requireLabel,
	requireMessageInput,
	requireStoredMessage,
} from './helpers.js'
import { JudgmentManager } from './JudgmentManager.js'

/**
 * Represents a conversation — the messages it owns in insertion order, the judgments recorded about
 * them, a substring `search`, a fenced cross-conversation `reference`, and a JSON `snapshot`,
 * observable through its own `emitter`.
 *
 * @remarks
 * - **Owned messages.** `#messages` is an insertion-ordered `Map` keyed by each message's minted
 *   id. Every stored message is owned through JSON and deep-frozen, from `add` and from a hydrating
 *   `snapshot` alike, so a holder can keep one by reference and its content never changes.
 * - **Stored roles.** Every stored message plays a `ConversationRole`. `add` checks every input of a
 *   batch before it stores any and throws `ConversationError` code `'ROLE'` for a `system` or
 *   unknown role and `'MESSAGE'` for a malformed input; the `system` message is built per request
 *   and never stored. A hydrating `snapshot` is checked by `requireConversationSnapshot` before any
 *   member is seated: a malformed snapshot, a repeated id, or call arguments JSON cannot carry
 *   throws `'SNAPSHOT'`, and a stored `system` message throws `'ROLE'`.
 * - **Call groups.** `remove` takes the whole call group of any message it removes, as
 *   `collectRemovals` collects it, so a provider never receives half a group.
 * - **Judgments.** `remove` and `clear` also remove every judgment whose `sources` name a removed
 *   message, so its text survives neither in memory nor in the next snapshot.
 * - **Observable.** The owned {@link emitter} ({@link ConversationEventMap}) carries `add`,
 *   `remove`, and `clear`, emitted directly after each mutation is whole; the emitter isolates a
 *   listener throw and routes it to its `error` handler (the `error` option). `destroy()` tears it
 *   down last.
 *
 * @example
 * ```ts
 * const conversation = new Conversation({ id: 'desk' })
 * conversation.add([
 * 	{ role: 'user', content: 'The Brightwater refund is $148.50.' },
 * 	{ role: 'assistant', content: 'Noted.' },
 * ])
 * conversation.search('refund') // [the user message]
 * ```
 */
export class Conversation implements ConversationInterface {
	readonly #id: string
	// The push observation surface — owned, never inherited. The emitter isolates a listener throw
	// (routing it to the `error` handler), so it can never interrupt a mutation.
	readonly #emitter: Emitter<ConversationEventMap>
	// The messages the conversation owns — an insertion-ordered Map of frozen messages keyed by id.
	readonly #messages: Map<string, Message>
	readonly #judgments: JudgmentManager

	constructor(options?: ConversationOptions) {
		refuseOptionKeys(options, CONVERSATION_OPTION_KEYS, 'Conversation', 'ConversationOptions')
		// Restoring is silent: nothing was edited, so no event fires. The snapshot is checked before
		// any member is seated, and every member is seated from the checked read alone.
		const supplied = options?.snapshot
		const snapshot =
			supplied === undefined
				? undefined
				: requireConversationSnapshot(supplied, conversationSnapshotContract)
		// The copy reads each message again, so the owned copy is checked too.
		const owned = (snapshot?.messages ?? []).map((message) =>
			requireStoredMessage(freezeJSON(message), 'SNAPSHOT'),
		)
		this.#messages = new Map(owned.map((message) => [message.id, message]))
		if (this.#messages.size !== owned.length) {
			throw new ConversationError(
				'SNAPSHOT',
				'a conversation snapshot repeats a message id on its second read; pass what snapshot() returned',
			)
		}
		this.#judgments = new JudgmentManager(snapshot?.judgments)
		this.#id = snapshot?.id ?? options?.id ?? crypto.randomUUID()
		this.#emitter = new Emitter<ConversationEventMap>(options)
	}

	get id(): string {
		return this.#id
	}

	get judgments(): JudgmentManagerInterface {
		return this.#judgments
	}

	get emitter(): EmitterInterface<ConversationEventMap> {
		return this.#emitter
	}

	get count(): number {
		return this.#messages.size
	}

	add(input: MessageInput): Message
	add(inputs: readonly MessageInput[]): readonly Message[]
	add(input: MessageInput | readonly MessageInput[]): Message | readonly Message[] {
		if (isArray(input)) {
			// Every input is checked and owned before any element is stored, so a refused batch stores
			// nothing, and every message is stored before the first `add` event. `Array.from` visits a
			// hole as an undefined input, which the check refuses; `map` would skip it.
			const created = Array.from(input, (one) =>
				this.#create(requireMessageInput(one, messageInputContract)),
			)
			for (const message of created) this.#messages.set(message.id, message)
			for (const message of created) this.#emitter.emit('add', message)
			return created
		}
		const message = this.#create(requireMessageInput(input, messageInputContract))
		this.#messages.set(message.id, message)
		this.#emitter.emit('add', message)
		return message
	}

	message(id: string): Message | undefined {
		return this.#messages.get(id)
	}

	messages(): readonly Message[] {
		return [...this.#messages.values()]
	}

	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	remove(ids: string | readonly string[]): boolean {
		const named = isArray(ids) ? ids : [ids]
		// Presence is read before anything leaves, so a batch naming two members of one call group
		// still counts both as present.
		// `Array.from` passes a hole in `named` to the check as `undefined`, which no message holds.
		const present = Array.from(named, (id) => this.#messages.has(id)).every((held) => held)
		const removed = collectRemovals([...this.#messages.values()], named)
		this.#drop(removed)
		for (const id of removed) this.#emitter.emit('remove', id)
		return present
	}

	clear(): void {
		this.#drop([...this.#messages.keys()])
		this.#emitter.emit('clear')
	}

	search(query: string): readonly Message[] {
		const needle = query.toLowerCase()
		return [...this.#messages.values()].filter((message) =>
			message.content.toLowerCase().includes(needle),
		)
	}

	reference(options?: ConversationReferenceOptions): string {
		refuseOptionKeys(options, REFERENCE_OPTION_KEYS, 'Conversation', 'ConversationReferenceOptions')
		// The markers state the block is not part of the live conversation, so a small model reads the
		// cherry-picked excerpts as foreign material it attributes to that source.
		return renderReference(requireLabel(options?.label ?? this.#id), options?.messages ?? [])
	}

	snapshot(): ConversationSnapshot {
		return {
			id: this.#id,
			messages: this.messages(),
			...(this.#judgments.count === 0 ? {} : { judgments: this.#judgments.judgments() }),
		}
	}

	destroy(): void {
		this.#emitter.destroy()
	}

	// Deletes the messages by id, then every judgment whose sources name one of them, so a removed
	// message's text leaves the judgment store with it.
	#drop(ids: readonly string[]): void {
		const removed = new Set(ids)
		for (const id of removed) this.#messages.delete(id)
		const quoting = this.#judgments
			.judgments()
			.filter((judgment) => judgment.sources.some((source) => removed.has(source)))
			.map((judgment) => judgment.id)
		if (quoting.length > 0) this.#judgments.remove(quoting)
	}

	// Builds the message from its checked input, spreading each optional only when present so an
	// absent optional is never stored as `undefined`, then owns and freezes it through JSON.
	#create(input: MessageInput): Message {
		const message: Message = {
			id: crypto.randomUUID(),
			role: input.role,
			content: input.content,
			...(input.calls === undefined
				? {}
				: {
						calls: input.calls.map(({ id, name, arguments: arguments_ }) => ({
							id,
							name,
							arguments: arguments_,
						})),
					}),
			...(input.call === undefined ? {} : { call: input.call }),
			...(input.images === undefined ? {} : { images: input.images }),
			...(input.thinking === undefined ? {} : { thinking: input.thinking }),
		}
		return requireStoredMessage(freezeJSON(message), 'MESSAGE')
	}
}
