import type {
	JudgeInterface,
	JudgeRequest,
	Judgment,
	JudgmentInput,
	Message,
	MessageInput,
} from '../types.js'
import type { EmitterErrorHandler, EmitterHooks, EmitterInterface } from '@orkestrel/emitter'

/**
 * Names the machine-readable condition a {@link import('./errors.js').ConversationError} reports.
 *
 * @remarks
 * `'JUDGMENT'`: a judgment or judge request that JSON cannot carry, or whose copy fails its guard.
 * `'ROLE'`: a stored or selected message whose role is not a `ConversationRole`.
 * `'MESSAGE'`: a message input that is not a plain record or whose other members fail
 * `isMessageInput`.
 * `'SNAPSHOT'`: a snapshot that fails `isConversationSnapshot`, repeats an id, or holds call
 * arguments JSON cannot carry; a judgment the guard admits but JSON cannot carry still raises
 * `'JUDGMENT'`.
 * `'ID'`: a manager's `add` of an id it already holds.
 * `'LABEL'`: a `reference` label that holds a double quote or a line break.
 */
export type ConversationErrorCode = 'JUDGMENT' | 'ROLE' | 'MESSAGE' | 'SNAPSHOT' | 'ID' | 'LABEL'

/**
 * Stores judgments by caller key and resolves requests by reusing matching records.
 *
 * @remarks
 * Every record the store returns, from `add`, `judgment`, `judgments`, and `resolve`, is the
 * stored record, deep-frozen, so a caller copies a record before changing it.
 */
export interface JudgmentManagerInterface {
	readonly count: number
	/**
	 * Stores inputs with the current epoch milliseconds; an existing key is replaced.
	 *
	 * @param input - One {@link JudgmentInput}, or a batch
	 * @returns The stored {@link Judgment} record or records, each stamped with its storage time
	 */
	add(input: JudgmentInput): Judgment
	add(inputs: readonly JudgmentInput[]): readonly Judgment[]
	/**
	 * Returns the record for a key, or `undefined` when absent.
	 *
	 * @param id - The judgment key to resolve
	 * @returns The {@link Judgment}, or `undefined` when absent
	 */
	judgment(id: string): Judgment | undefined
	/**
	 * Returns stored records in insertion order.
	 *
	 * @returns Every stored {@link Judgment}, in insertion order
	 */
	judgments(): readonly Judgment[]
	/**
	 * Removes every supplied key; returns `true` only when all were present.
	 *
	 * @param id - One judgment key, or a batch
	 * @returns True if every supplied key was present and removed; false otherwise
	 */
	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	/** Removes all records. */
	clear(): void
	/**
	 * Reuses matching records and asks for the unmatched questions in one request.
	 *
	 * @param judge - The judge whose model identity participates in reuse
	 * @param request - The state and keyed questions to resolve
	 * @param sources - The ordered message ids the questions concern
	 * @param signal - The cancellation signal checked before asking
	 * @returns The resolved records in request key order
	 * @throws JudgeAbortError Thrown when asking aborts, after completed partial records are stored
	 */
	resolve(
		judge: JudgeInterface,
		request: JudgeRequest,
		sources: readonly string[],
		signal: AbortSignal,
	): Promise<readonly Judgment[]>
}

/**
 * Stores immutable {@link Message} records in insertion order and mints each `id` on `add` — the
 * message-store contract every {@link ConversationInterface} satisfies structurally, the
 * {@link AgentContextInterface.messages} conversation included.
 *
 * @remarks
 * - **Store.** Messages live in insertion order; `count` is how many are stored.
 *   `add` takes one {@link MessageInput} or a batch and mints the `id` of each message
 *   (a random UUID), returning the created message or messages. A stored message is
 *   immutable — created once from its input, never mutated.
 * - **Lookup.** `message(id)` resolves one by id (`undefined` when absent);
 *   `messages()` lists every message in insertion order.
 * - **Removal.** `remove` drops one by id, or a batch — `true` only when every supplied id
 *   was removed; `clear` empties the store.
 */
export interface MessageManagerInterface {
	readonly count: number
	/**
	 * Stores one {@link MessageInput}, or a batch — mints each message's `id` and returns the
	 * created message or messages; a stored message is immutable.
	 *
	 * @param input - One {@link MessageInput}, or a batch
	 * @returns The created {@link Message} record or records, each with its minted `id` value
	 * @throws ConversationError Thrown when a role is not a `ConversationRole` (code `'ROLE'`), before any message of the batch is stored
	 */
	add(input: MessageInput): Message
	add(inputs: readonly MessageInput[]): readonly Message[]
	/**
	 * Looks up one stored message by id (`undefined` when absent).
	 *
	 * @param id - The message id to resolve
	 * @returns The {@link Message}, or `undefined` when absent
	 */
	message(id: string): Message | undefined
	/**
	 * Lists every stored message, in insertion order.
	 *
	 * @returns Every stored {@link Message}, in insertion order
	 */
	messages(): readonly Message[]
	/**
	 * Removes one message by id, or a batch — `true` only when every supplied id was removed.
	 *
	 * @param id - One message id, or a batch
	 * @returns True if every supplied id was present and removed; false otherwise
	 */
	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	/** Removes every stored message. */
	clear(): void
}

/**
 * Maps the push observation surface of a {@link ConversationInterface} — the mutations a
 * fire-and-forget observer subscribes to through `conversation.emitter.on`.
 *
 * @remarks
 * Each event fires after its mutation is whole. A batch `add` stores every message, then emits
 * `add` once per message in insertion order. A `remove` deletes every message it removes, the
 * rest of each call group included, and every judgment that quotes one, then emits `remove` once
 * per removed message in insertion order. `clear` emits one `clear`. Listener isolation is the
 * emitter's: a listener throw is routed to the `error` handler of the emitter (the `error`
 * option), never onto this map, so an observer cannot interrupt a mutation. A `type` alias (not
 * `interface extends EventMap`) so the type-literal satisfies `EventMap` structurally.
 */
export type ConversationEventMap = {
	/** Reports one stored message, after it is stored. */
	readonly add: readonly [message: Message]
	/** Reports one removed message by id, after it and the judgments that quote it are removed. */
	readonly remove: readonly [id: string]
	/** Reports the conversation emptied, once per `clear` call. */
	readonly clear: readonly []
}

/**
 * Configures `createConversation` — the optional `id`, the reserved `on` hooks, the emitter's
 * `error` handler, and a {@link ConversationSnapshot} to hydrate from.
 *
 * @remarks
 * An own enumerable member this type does not declare refuses at construction with a
 * `ContractError` coded `'structure'`. `id` is the identity of the conversation. Default: a
 * random UUID. `on` is the reserved listener key (initial {@link ConversationEventMap}
 * listeners). `error` is the listener-error handler of the emitter. `snapshot` is the hydration
 * seam — a {@link ConversationSnapshot} whose `id`, messages, and judgments are restored into the
 * conversation. Restoring is silent (no events — nothing was edited), and a `snapshot.id` wins
 * over `id` (the snapshot is the identity of the conversation). It is what lets
 * `createConversation` hydrate, and what a {@link ConversationManagerInterface.open} reads a
 * stored snapshot back through.
 */
export interface ConversationOptions {
	readonly id?: string
	readonly on?: EmitterHooks<ConversationEventMap>
	/** Holds the listener-error handler of the emitter — a listener throw routes here, not to a domain event. */
	readonly error?: EmitterErrorHandler
	/**
	 * Hydrates from a {@link ConversationSnapshot} — its `id` wins over `id`; restoring is silent.
	 * The constructor checks it with `requireConversationSnapshot` before seating any member: a
	 * malformed snapshot, a repeated id, or call arguments JSON cannot carry throw
	 * `ConversationError` code `'SNAPSHOT'`, and a stored `system` message throws code `'ROLE'`.
	 * Each message is then owned through JSON and deep-frozen, so the conversation shares no object
	 * with the snapshot.
	 */
	readonly snapshot?: ConversationSnapshot
}

/**
 * Configures {@link ConversationInterface.reference} — how to render one conversation as a
 * self-labeled, fenced provenance block to pull into another conversation by writing it to the
 * active workspace of the active context: `label` names the source and `messages` lists the
 * cherry-picked excerpts.
 *
 * @remarks
 * The rendered block is a cross-conversation reference a small model must read as foreign
 * material, not as part of the live thread — so every member keeps it concise and unmistakably
 * attributed:
 * - `label` — the human provenance name shown in the opening and closing markers of the block
 *   (for example `'planning'`). It is what the model attributes the content to, so it holds no
 *   double quote and no line break. Default: the `id` of the conversation.
 * - `messages` — the cherry-picked excerpts to include (each rendered `role: content`). The
 *   intended source is the `search(query)` output of the conversation (select the few relevant
 *   turns), not its whole history — dumping every message re-bloats the destination context a
 *   small model then has to wade through. Default: none.
 */
export interface ConversationReferenceOptions {
	/** Names the human provenance label in the markers of the block. Default: the `id` of the conversation. */
	readonly label?: string
	/** Lists the cherry-picked excerpts to include (`role: content`). Default: none. */
	readonly messages?: readonly Message[]
}

/**
 * Holds one conversation's messages in insertion order, the judgments recorded about them, a
 * substring `search`, a fenced cross-conversation `reference`, and a JSON `snapshot` — the log a
 * memory strategy and a host share, observable through its own emitter.
 *
 * @remarks
 * - **Message verbs.** `add` takes one {@link MessageInput} or a batch, checks every input before
 *   it stores any, mints the `id` of each message (a random UUID), owns the message through JSON,
 *   deep-freezes it, stores it, and returns the stored message or messages. `message(id)` resolves
 *   one (`undefined` when absent); `messages()` lists them in insertion order; `count` is how many
 *   are stored. A stored message never changes, so identity equality is content equality.
 * - **Call groups.** An assistant message with `calls` and the tool messages that answer it, as
 *   {@link import('../helpers.js').collectToolGroups} groups them, leave together: `remove` of any
 *   member removes the whole group, so a provider never receives half a group. A tool message no
 *   assistant message owns leaves alone.
 * - **Judgments.** `judgments` stores frozen records by key. `remove` and `clear` also remove every
 *   judgment whose `sources` name a removed message, so a removed message's text survives neither
 *   in memory nor in a snapshot; a judgment with no source stays.
 * - **`search(query)` / `reference(options?)`.** `search` is a case-insensitive substring scan of
 *   every stored message's `content`. `reference` is a pure string render (no model call) of a
 *   self-labeled block fenced at both ends, holding cherry-picked excerpts, framed so a small model
 *   reads it as foreign material.
 * - **Synchronous.** Every member completes in one synchronous call, so no mutation interleaves
 *   with another, and each event fires after its mutation is whole.
 * - **Observable.** The owned `emitter` ({@link ConversationEventMap}) carries `add`, `remove`, and
 *   `clear`; the emitter isolates a listener throw and routes it to its `error` handler (the `error`
 *   option). `destroy()` tears the emitter down.
 */
export interface ConversationInterface {
	readonly id: string
	/** Holds the judgments recorded beside the messages of this conversation. */
	readonly judgments: JudgmentManagerInterface
	readonly emitter: EmitterInterface<ConversationEventMap>
	/** Counts the stored messages. */
	readonly count: number
	/**
	 * Appends one {@link MessageInput}, or a batch — mints each message's `id` (a random UUID),
	 * stores an owned, deep-frozen copy, emits `add` per message, and returns the stored message or
	 * messages.
	 *
	 * @param input - One {@link MessageInput}, or a batch
	 * @returns The stored {@link Message} record or records, each with its minted `id` value
	 * @throws ConversationError Thrown when an input is not a plain record or a member fails its declared type (code `'MESSAGE'`), or a role is not a `ConversationRole` (code `'ROLE'`), before any message of the batch is stored
	 */
	add(input: MessageInput): Message
	add(inputs: readonly MessageInput[]): readonly Message[]
	/**
	 * Looks up one stored message by id (`undefined` when absent).
	 *
	 * @param id - The message id to resolve
	 * @returns The {@link Message}, or `undefined` when absent
	 */
	message(id: string): Message | undefined
	/**
	 * Lists every stored message, in insertion order.
	 *
	 * @returns Every stored message, in insertion order
	 */
	messages(): readonly Message[]
	/**
	 * Removes one message by id, or a batch, with the rest of each call group a removed message
	 * belongs to and every judgment that quotes a removed message, then emits `remove` per removed
	 * message — `true` only when every supplied id was present.
	 *
	 * @param id - One message id, or a batch
	 * @returns True if every supplied id was present and removed; false otherwise
	 */
	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	/** Removes every stored message and every judgment that quotes one, then emits one `clear`. */
	clear(): void
	/**
	 * Searches every stored message's `content` for a case-insensitive substring.
	 *
	 * @param query - The substring to match (case-insensitive)
	 * @returns The matching messages, in insertion order
	 */
	search(query: string): readonly Message[]
	/**
	 * Renders this conversation as a self-labeled provenance block fenced at both ends, to pull into
	 * another conversation — a pure string with no model call: an opening
	 * `[Reference — conversation "<label>" — NOT part of this conversation]` marker, then the
	 * cherry-picked excerpts (`- role: content`) when `messages` is supplied, then a closing
	 * `[End of reference "<label>"]` marker.
	 *
	 * @remarks
	 * Every line of an excerpt after its first is indented by two spaces, so no excerpt text starts
	 * a line at the margin, where it could read as another excerpt or as a marker. The intended flow
	 * is to pull another conversation B into the active workspace of the active conversation A:
	 * select the few right turns with `B.search(query)`, frame them here, then
	 * `A.context.workspaces.active?.write(\`conversation:${B.id}.md\`, B.reference({ label, messages }))`.
	 * Keep the excerpts cherry-picked, never the whole history of B — this content enters another
	 * context a small model must read.
	 *
	 * @param options - The {@link ConversationReferenceOptions} (label / cherry-picked messages)
	 * @returns The rendered provenance block
	 * @throws ConversationError Thrown when the effective label holds a double quote or a line break (code `'LABEL'`)
	 */
	reference(options?: ConversationReferenceOptions): string
	/**
	 * Serializes this conversation to a plain, JSON-serializable {@link ConversationSnapshot} —
	 * its `id`, its messages, and its judgments when it holds one.
	 *
	 * @remarks
	 * The container serializes itself (`{ id, messages, judgments? }`) — the payload of the
	 * {@link ConversationStoreInterface} persistence seam, the analogue of the `snapshot` method of
	 * {@link import('@orkestrel/workspace').WorkspaceInterface}. Pure: the messages and the
	 * judgments are the stored frozen records, so a JSON round trip keeps the snapshot lossless,
	 * snapshotting mutates nothing, and a host copies a record before changing it. A
	 * {@link ConversationManagerInterface} hydrates a conversation from it through the `snapshot`
	 * option (see {@link ConversationManagerInterface.open}).
	 *
	 * @returns The {@link ConversationSnapshot} (`{ id, messages, judgments? }`), the judgments
	 * present only when the store holds one
	 */
	snapshot(): ConversationSnapshot
	/** Tears down the emitter: drops every listener, so later mutations reach no observer. */
	destroy(): void
}

/**
 * Holds a JSON-serializable snapshot of the state of a conversation — its `id`, its `messages`,
 * and its judgments — the durable payload the {@link ConversationStoreInterface} persists. The
 * analogue of {@link import('@orkestrel/workspace').WorkspaceSnapshot}.
 *
 * @remarks
 * Pure JSON data (no class instances, no functions): each {@link Message} and {@link Judgment} is
 * a plain record that a JSON round trip keeps lossless. The container produces the snapshot from
 * itself ({@link ConversationInterface.snapshot}); it is the durable analogue of the
 * {@link ConversationOptions.snapshot} hydration seam. It is narrowed back from an untrusted
 * storage read by {@link import('./validators.js').isConversationSnapshot} (the total boundary
 * guard), which is exact: an unknown member refuses, a `sections` member included.
 */
export interface ConversationSnapshot {
	readonly id: string
	/** Carries recorded judgments; absent when the conversation holds none. */
	readonly judgments?: readonly Judgment[]
	/** Lists the stored messages, in insertion order. */
	readonly messages: readonly Message[]
}

/**
 * Persists a {@link ConversationSnapshot} durably — the async `get` / `set` / `delete` primitives,
 * keyed by a conversation id and holding no expiry, the analogue of {@link
 * import('@orkestrel/workspace').WorkspaceStoreInterface}.
 *
 * @remarks
 * The store persists the {@link ConversationSnapshot} — the self-contained, pure-JSON conversation
 * state — so a JSON / SQLite / IndexedDB backend swaps in without touching the manager or the
 * conversation: the in-memory default
 * {@link import('./stores/MemoryConversationStore.js').MemoryConversationStore} and its
 * driver-pluggable twin
 * {@link import('./stores/DatabaseConversationStore.js').DatabaseConversationStore} (the
 * snapshot as one opaque JSON column) share this one interface. Hydration is not a store concern
 * — a {@link ConversationManagerInterface} reads a snapshot back and rebuilds the live conversation
 * through the {@link ConversationOptions.snapshot} seam (see
 * {@link ConversationManagerInterface.open} / {@link ConversationManagerInterface.save}).
 *
 * Every primitive is async (a `Promise`), so a durable backend (a database round-trip) fits the
 * same shape as the memory one. The snapshot carries its own id, so `set` takes no separate id
 * param (mirroring the `set` method of
 * {@link import('@orkestrel/workspace').WorkspaceStoreInterface}). Unlike a session store
 * there is no idle-TTL
 * / eviction — a persisted conversation lives until an explicit `delete`. It is concrete over
 * {@link ConversationSnapshot} — no generic parameter, because the
 * snapshot is the one payload a conversation store persists.
 */
export interface ConversationStoreInterface {
	/**
	 * Resolves the persisted snapshot for `id`, or `undefined` if none is stored.
	 *
	 * @param id - The conversation id to resolve (a {@link ConversationSnapshot.id})
	 * @returns The persisted snapshot, or `undefined` if absent
	 */
	get(id: string): Promise<ConversationSnapshot | undefined>
	/**
	 * Inserts or replaces a snapshot under its own `snapshot.id` (no separate id param —
	 * mirroring the `set` method of {@link import('@orkestrel/workspace').WorkspaceStoreInterface}).
	 *
	 * @param snapshot - The snapshot to store (keyed by its `id`)
	 */
	set(snapshot: ConversationSnapshot): Promise<void>
	/**
	 * Drops a snapshot by id; an absent id is a no-op (no throw).
	 *
	 * @param id - The conversation id to drop
	 */
	delete(id: string): Promise<void>
}

/**
 * Represents one row of the table a {@link
 * import('./stores/DatabaseConversationStore.js').DatabaseConversationStore} persists
 * — a conversation `id` plus its {@link ConversationSnapshot} held as one opaque JSON column, read
 * back as `unknown` and narrowed on `get`. The analogue of {@link
 * import('@orkestrel/workspace').WorkspaceSnapshotRow}.
 *
 * @remarks
 * The Database twin of {@link ConversationStoreInterface} stores the snapshot whole (the `snapshot`
 * column is a `rawShape`, an opaque JSON blob — exactly as
 * {@link import('@orkestrel/workspace').WorkspaceSnapshotRow} stores a workspace snapshot), so the
 * row type stays flat and the snapshot shape never forces the contract to `Infer` it. The column
 * therefore reads back as the broad `unknown`; the store narrows it to a {@link ConversationSnapshot}
 * on `get` ({@link import('./validators.js').isConversationSnapshot}, the total boundary guard). `id`
 * mirrors {@link ConversationSnapshot.id} (the primary key), so a `set` writes
 * `{ id: snapshot.id, snapshot }`.
 */
export interface ConversationSnapshotRow {
	readonly id: string
	/** Holds the whole {@link ConversationSnapshot} as one opaque JSON blob — read back as `unknown`, narrowed on `get`. */
	readonly snapshot: unknown
}

/**
 * Carries the data to author a {@link ConversationInterface} through a {@link
 * ConversationManagerInterface} — the optional `id`, the reserved `on` hooks, the emitter's `error`
 * handler, and a {@link ConversationSnapshot} to hydrate from.
 *
 * @remarks
 * An own enumerable member this type does not declare refuses with a `ContractError` coded
 * `'structure'`. `id` is the identity of the conversation. Default: a minted id. `on` is the
 * reserved listener key (initial {@link ConversationEventMap} listeners). `error` is the
 * listener-error handler of the conversation's emitter, so a throwing `on` listener reports there.
 * Default: the emitter's own handler. `snapshot` is the construction-time hydration seam — a
 * {@link ConversationSnapshot} whose `id`, messages, and judgments are restored into the
 * conversation, the conversation analogue of the `seed` option of
 * {@link import('@orkestrel/workspace').WorkspaceOptions}, carried onto
 * {@link ConversationOptions.snapshot}, that a {@link ConversationManagerInterface.open} reads a
 * stored snapshot back through; hydration is silent (no events). When both `snapshot.id` and `id`
 * are given, `snapshot.id` wins (the snapshot is the identity of the conversation).
 */
export interface ConversationInput {
	readonly id?: string
	readonly on?: EmitterHooks<ConversationEventMap>
	/** Holds the listener-error handler of the conversation's emitter — a listener throw routes here, not to a domain event. */
	readonly error?: EmitterErrorHandler
	/**
	 * Hydrates from a {@link ConversationSnapshot}, passed on as {@link ConversationOptions.snapshot},
	 * whose checks throw `ConversationError` code `'SNAPSHOT'` or `'ROLE'` before anything registers.
	 */
	readonly snapshot?: ConversationSnapshot
}

/**
 * Configures `createConversationManager` — the optional durable `store` backing `open` / `save`.
 *
 * @remarks
 * An own enumerable member this type does not declare refuses at construction with a
 * `ContractError` coded `'structure'`.
 */
export interface ConversationManagerOptions {
	/**
	 * Holds the optional durable {@link ConversationStoreInterface} backing
	 * {@link ConversationManagerInterface.open} / {@link ConversationManagerInterface.save} — a memory
	 * / JSON / SQLite / IndexedDB store a conversation is hydrated from (`open` a registry-miss) and
	 * persisted to (`save`). Default: none, so the manager is registry-only: `open` resolves only
	 * what is already registered, and `save` is a no-op (`false`). The analogue of the `store`
	 * option of {@link import('@orkestrel/workspace').WorkspaceManagerOptions}.
	 */
	readonly store?: ConversationStoreInterface
}

/**
 * Registers {@link ConversationInterface} instances keyed by their `id`, in insertion order, with an
 * active pointer — the id-keyed store over the conversation layer, the `active` / `switch` seam the
 * {@link AgentContextInterface} renders, and the durable `open` / `save` store seam. Event-free (a
 * registry, like {@link import('@orkestrel/workspace').WorkspaceManagerInterface}); the
 * observability lives on each {@link ConversationInterface}.
 *
 * @remarks
 * - **Registry.** `count` is how many are stored. `add(input?)` mints a
 *   {@link ConversationInterface} (its `id` from `input` or a random UUID); `add` of an
 *   already-present `id` throws (code `'ID'`). `conversation(id)` looks one up
 *   (`undefined` when absent); `conversations()` lists them in insertion order.
 * - **Active pointer.** `active` is the active conversation (the conversation an agent run binds
 *   when it names none, and the one the context renders with no selection), `undefined` until the
 *   first `add` (which auto-activates it — a registry with conversations always has one active). A
 *   subsequent `add` leaves `active` unchanged. `switch(id)` re-points `active` to the
 *   conversation with `id` and returns it, never moving a live run; an
 *   unknown `id` returns `undefined` and leaves `active` unchanged (the lenient lookup style —
 *   never throws, no added error code).
 * - **Removal.** `remove` drops one by id, or a batch — `true` only when every supplied id was
 *   removed; removing the active conversation sets `active` to `undefined`. `clear` empties the
 *   registry and sets `active` to `undefined`.
 * - **Durable open / save (the optional `store` seam).** When a {@link ConversationStoreInterface}
 *   is supplied (the `store` option), `open(id)` hydrates a conversation from the store on a registry
 *   miss (rebuilding it through the `snapshot` option) and `save(id)` persists the
 *   {@link ConversationInterface.snapshot} of a registered conversation. Both are lenient without a
 *   store — `open` resolves only registered ids, `save` is a no-op (`false`) — consistent with the
 *   lenient `switch`. It mirrors the `open` / `save` seam of the workspace package manager.
 * - **Event-free.** A purely registry store — no Emitter, no events (each conversation owns
 *   its own).
 */
export interface ConversationManagerInterface {
	readonly count: number
	/** Holds the active conversation — the conversation an agent run binds when it names none; `undefined` until the first `add`. */
	readonly active: ConversationInterface | undefined
	/**
	 * Looks up one conversation by id (`undefined` when absent).
	 *
	 * @param id - The conversation id to resolve
	 * @returns The conversation, or `undefined` when absent
	 */
	conversation(id: string): ConversationInterface | undefined
	/**
	 * Lists every conversation, in insertion order.
	 *
	 * @returns Every registered conversation, in insertion order
	 */
	conversations(): readonly ConversationInterface[]
	/**
	 * Mints a conversation, taking its `id` from the input or a fresh UUID — auto-activates the
	 * first, and an already-present `id` throws.
	 *
	 * @param input - Optional {@link ConversationInput} overrides
	 * @returns The created conversation
	 * @throws ConversationError Thrown when the `id` is already live (code `'ID'`), or when `snapshot` is malformed, repeats an id, or holds call arguments JSON cannot carry (code `'SNAPSHOT'`) or holds a message whose role is not a `ConversationRole` (code `'ROLE'`); nothing registers and `active` is unchanged
	 */
	add(input?: ConversationInput): ConversationInterface
	/**
	 * Re-points `active` at the conversation with `id` and returns it; an unknown `id` returns
	 * `undefined` and leaves `active` unchanged, never throwing.
	 *
	 * @param id - The conversation id to activate
	 * @returns The activated conversation, or `undefined` for an unknown id
	 */
	switch(id: string): ConversationInterface | undefined
	/**
	 * Resolves a conversation by id and activates it — from the registry when present, else
	 * hydrated from the optional {@link ConversationStoreInterface} (`store`); `undefined` when
	 * it is neither registered nor stored.
	 *
	 * @remarks
	 * - If `id` is already registered, it is activated through `switch` and returned — no store hit.
	 * - Else if a `store` is set, `store.get(id)` is awaited; on a hit the snapshot is rehydrated
	 *   into a fresh {@link ConversationInterface} through the `snapshot` option
	 *   (`add({ snapshot })`), which registers and activates it, and it is returned.
	 * - A conversation registered under `id` while the store read was pending wins: it is
	 *   activated and returned, and the stored snapshot is discarded. So a concurrent `add({ id })`
	 *   keeps its turns, and concurrent `open(id)` calls return the one registered instance.
	 * - Else (no store, or a store miss) ⇒ `undefined` (lenient — no throw).
	 * - A stored snapshot whose `id` is not `id`, that holds a message whose role is not a
	 *   `ConversationRole`, that repeats an id, or that is malformed rejects with a
	 *   `ConversationError` (code `'SNAPSHOT'` or `'ROLE'`) and leaves the registry and `active`
	 *   unchanged. `DatabaseConversationStore` refuses a malformed row itself, with `'SNAPSHOT'`.
	 *
	 * @param id - The conversation id to open
	 * @returns The activated {@link ConversationInterface}, or `undefined` when neither registered nor stored
	 * @throws ConversationError Thrown when the stored snapshot names another id, holds a message whose role is not a `ConversationRole` (code `'ROLE'`), repeats an id, or is malformed (code `'SNAPSHOT'`)
	 */
	open(id: string): Promise<ConversationInterface | undefined>
	/**
	 * Persists a registered conversation's {@link ConversationInterface.snapshot} to the optional
	 * {@link ConversationStoreInterface} (`store`) — `true` when persisted, `false` when there is
	 * no store or the id is unknown; a store failure propagates.
	 *
	 * @remarks
	 * Lenient: when a `store` is set and `id` is registered, `store.set(conversation.snapshot())` is
	 * awaited and `true` is returned; otherwise (no store, or an unknown id) it is a no-op returning
	 * `false`. A failure from `store.set` propagates.
	 *
	 * @param id - The id of the registered conversation to persist
	 * @returns True if the snapshot was persisted; false otherwise (no store, or an unknown id)
	 */
	save(id: string): Promise<boolean>
	/**
	 * Removes one conversation by id, or a batch — `true` only when every supplied id was
	 * removed; clears `active` when a removed conversation was the active one.
	 *
	 * @param id - One conversation id, or a batch
	 * @returns True if every supplied id was present and removed; false otherwise
	 */
	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	/** Removes every conversation and clears `active`. */
	clear(): void
}
