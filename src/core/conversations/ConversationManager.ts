import type {
	ConversationInput,
	ConversationInterface,
	ConversationManagerInterface,
	ConversationManagerOptions,
	ConversationStoreInterface,
	ConversationSummarizer,
} from '../types.js'
import { isArray } from '@orkestrel/contract'
import { DEFAULT_CONVERSATION_KEEP } from '../constants.js'
import { Conversation } from './Conversation.js'

/**
 * The registry of {@link Conversation}s keyed by `id`, in insertion order, WITH an active pointer
 * — the §9 store over the conversation layer PLUS the `active` / `switch` seam the
 * {@link import('../AgentContext.js').AgentContext} renders. Event-free (a registry, like
 * {@link import('../workspaces/WorkspaceManager.js').WorkspaceManager}); the observability lives
 * on each {@link Conversation}.
 *
 * @remarks
 * - **Registry.** Conversations live in an insertion-ordered `Map` keyed by `id`. `add(input?)`
 *   mints a {@link Conversation} (its `id` from `input` or `crypto.randomUUID()`), flowing the
 *   manager's default `#summarize` / `#keep` in unless the `input` OVERRIDES them, and stores
 *   it (an already-present `id` OVERWRITES — last write wins). `count` is the map size,
 *   `conversation(id)` looks one up, `conversations()` lists them in insertion order.
 * - **Active pointer.** `active` is the active conversation (the agent's message source the
 *   context renders), `undefined` until the FIRST `add` (which auto-activates it — a registry
 *   with conversations always has one active). A subsequent `add` leaves `active` unchanged.
 *   `switch(id)` re-points `active` to the conversation with `id` and returns it; an unknown `id`
 *   returns `undefined` and leaves `active` unchanged (the lenient lookup style — never throws,
 *   no new error code).
 * - **Removal.** `remove` drops one by id, or a batch (§9.2) — `true` when any was removed;
 *   removing the ACTIVE conversation sets `active` to `undefined`. `clear` empties the registry
 *   and sets `active` to `undefined`.
 * - **Event-free.** A purely registry store — no Emitter, no events (each conversation owns
 *   its own observable `emitter`).
 *
 * @example
 * ```ts
 * const manager = new ConversationManager({ summarize: async (m) => `recap of ${m.length}` })
 * const conversation = manager.add() // auto-activates — active === conversation
 * manager.add({ id: 'scratch' }) // leaves active unchanged
 * manager.switch('scratch') // re-points active to the 'scratch' conversation
 * manager.count // 2
 * ```
 */
export class ConversationManager implements ConversationManagerInterface {
	readonly #conversations = new Map<string, ConversationInterface>()
	// The active conversation's id — the message source the context renders; `undefined` until the
	// first `add` auto-activates one (kept as an id, never a stale reference, so a re-add / removal
	// of that id is reflected through the live map lookup in `active`).
	#active: string | undefined
	// The default summarizer flowed into every conversation `add` creates (a per-`add` override
	// wins); a conversation created with neither cannot `compact` (it throws a ConversationError).
	readonly #summarize: ConversationSummarizer | undefined
	// The default retained-tail size flowed into every conversation `add` creates (overridable).
	readonly #keep: number
	// The optional durable store backing `open` / `save`; `undefined` ⇒ registry-only (both lenient).
	readonly #store: ConversationStoreInterface | undefined

	constructor(options?: ConversationManagerOptions) {
		this.#summarize = options?.summarize
		this.#keep = options?.keep ?? DEFAULT_CONVERSATION_KEEP
		this.#store = options?.store
	}

	get count(): number {
		return this.#conversations.size
	}

	get active(): ConversationInterface | undefined {
		return this.#active === undefined ? undefined : this.#conversations.get(this.#active)
	}

	conversation(id: string): ConversationInterface | undefined {
		return this.#conversations.get(id)
	}

	conversations(): readonly ConversationInterface[] {
		return [...this.#conversations.values()]
	}

	add(input?: ConversationInput): ConversationInterface {
		// The manager's defaults flow in unless the input overrides them — so a conversation
		// created through the manager inherits its summarizer / keep by default. An optional
		// `snapshot` HYDRATES the conversation through the constructor `seed` (the second arg) —
		// its `id` / `summary` / `sections` / live tail restored, the live summarize / keep above
		// re-supplied alongside it (mirroring how WorkspaceManager threads `seed`).
		const conversation = new Conversation(
			{
				...(input?.id === undefined ? {} : { id: input.id }),
				...(input?.on === undefined ? {} : { on: input.on }),
				summarize: input?.summarize ?? this.#summarize,
				keep: input?.keep ?? this.#keep,
			},
			input?.snapshot,
		)
		this.#conversations.set(conversation.id, conversation)
		// First conversation auto-activates: a registry that holds conversations always has one active.
		if (this.#active === undefined) this.#active = conversation.id
		return conversation
	}

	switch(id: string): ConversationInterface | undefined {
		// Lenient (mirrors `conversation(id)`): an unknown id re-points nothing and returns undefined.
		const conversation = this.#conversations.get(id)
		if (conversation === undefined) return undefined
		this.#active = id
		return conversation
	}

	async open(id: string): Promise<ConversationInterface | undefined> {
		// Already registered ⇒ just activate it (no store hit) — the registry is the live source.
		const existing = this.#conversations.get(id)
		if (existing !== undefined) {
			this.#active = id
			return existing
		}
		// No store ⇒ a registry miss resolves nothing (lenient, like `switch`/`conversation`).
		if (this.#store === undefined) return undefined
		// Store hit ⇒ rehydrate through the constructor `seed` (the snapshot restores id / summary /
		// sections / live tail) by reusing `add`, which registers + auto-activates a fresh
		// Conversation (flowing the manager's default summarize / keep in); a miss ⇒ undefined.
		const snapshot = await this.#store.get(id)
		if (snapshot === undefined) return undefined
		const conversation = this.add({ snapshot })
		// Re-point `active` explicitly: `add` only auto-activates the FIRST conversation, so an open
		// into a non-empty registry must still make the rehydrated one active.
		this.#active = conversation.id
		return conversation
	}

	async save(id: string): Promise<boolean> {
		// Lenient: persist only when a store is set AND the id is registered; otherwise a no-op.
		const conversation = this.#conversations.get(id)
		if (this.#store === undefined || conversation === undefined) return false
		await this.#store.set(conversation.snapshot())
		return true
	}

	// §9.2: the array overload FIRST, so a list resolves to the batch form (an `id` is a string,
	// never an array, so the two never overlap — but the project declares the array overload
	// first by convention).
	remove(ids: readonly string[]): boolean
	remove(id: string): boolean
	remove(ids: string | readonly string[]): boolean {
		if (isArray(ids)) {
			let removed = false
			for (const id of ids) {
				if (this.#drop(id)) removed = true
			}
			return removed
		}
		return this.#drop(ids)
	}

	clear(): void {
		this.#conversations.clear()
		// An emptied registry has no active conversation.
		this.#active = undefined
	}

	// Delete one conversation by id; when it was the ACTIVE one, clear the active pointer (a removed
	// conversation can never stay active).
	#drop(id: string): boolean {
		const removed = this.#conversations.delete(id)
		if (removed && this.#active === id) this.#active = undefined
		return removed
	}
}
