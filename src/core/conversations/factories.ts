import type {
	ConversationInterface,
	ConversationManagerInterface,
	ConversationManagerOptions,
	ConversationOptions,
	ConversationSnapshotRow,
	ConversationStoreInterface,
} from './types.js'
import type { DriverInterface, TableInterface } from '@orkestrel/database'
import { rawShape, stringShape } from '@orkestrel/contract'
import { createDatabase, createMemoryDriver } from '@orkestrel/database'
import { Conversation } from './Conversation.js'
import { ConversationManager } from './ConversationManager.js'
import { MemoryConversationStore } from './stores/MemoryConversationStore.js'
import { DatabaseConversationStore } from './stores/DatabaseConversationStore.js'

/**
 * Creates a conversation — a {@link ConversationInterface} holding owned, frozen messages in
 * insertion order beside the judgments recorded about them, with substring `search`, a fenced
 * `reference`, and a JSON `snapshot`.
 *
 * @remarks
 * Append turns through the conversation's own `add`; `messages()` is what a run sends. `remove` of
 * any member of a call group removes the whole group, and `remove` and `clear` drop every judgment
 * that quotes a removed message. Observable (`emitter` — `add` / `remove` / `clear`), wired through
 * the reserved `on` option; the emitter isolates a listener throw and routes it to its `error`
 * handler (the `error` option). Serve a conversation that outgrows a model's context through
 * `createLedger`, which bounds every request it sends.
 *
 * @param options - Optional `id` / `on` hooks / `error` handler / `snapshot` (see {@link ConversationOptions})
 * @returns A working {@link ConversationInterface}
 *
 * @example Conversations
 * ```ts
 * import { createConversation } from '@orkestrel/agent'
 *
 * const conversation = createConversation({ id: 'desk' })
 * const [, call] = conversation.add([
 * 	{ role: 'user', content: 'Is order LH-81660 late?' },
 * 	{
 * 		role: 'assistant',
 * 		content: '',
 * 		calls: [{ id: 'order', name: 'lookup', arguments: { order: 'LH-81660' } }],
 * 	},
 * 	{ role: 'tool', content: 'LH-81660 ships on Friday.', call: 'order' },
 * 	{ role: 'assistant', content: 'It ships on Friday.' },
 * ])
 *
 * conversation.search('friday').length // 2 — case-insensitive over every stored message
 * Object.isFrozen(call) // true — every stored message is owned and frozen
 * conversation.remove(call?.id ?? '') // true — removes the call and its tool result together
 * conversation.count // 2
 * conversation.reference({ label: 'orders', messages: conversation.messages() })
 * // a block fenced by [Reference — conversation "orders" — …] and [End of reference "orders"]
 * ```
 */
export function createConversation(options?: ConversationOptions): ConversationInterface {
	return new Conversation(options)
}

/**
 * Creates a conversation registry — a {@link ConversationManagerInterface} holding
 * {@link ConversationInterface} instances keyed by their `id`, in insertion order, with an active pointer:
 * the id-keyed store over the conversation layer plus the `active` / `switch` seam the context
 * renders. `add` auto-activates the first conversation.
 *
 * @remarks
 * Starts empty; `add(input?)` mints a {@link ConversationInterface} (its `id` from the input
 * or a random UUID) and stores it (an already-present `id` throws, code `'ID'`) — and
 * auto-activates the first one (a registry with conversations always has one `active`); a later
 * `add` leaves `active` unchanged. `switch(id)` re-points `active` (an unknown `id` returns
 * `undefined`, leaving `active` unchanged — lenient, never throws); `conversation(id)` /
 * `conversations()` look up; `remove` (one or a batch) reports `true` only when every supplied id
 * was removed and clears `active` if it was a removed one; `clear` empties it and clears `active`.
 * Event-free (each conversation owns its own observable `emitter`).
 *
 * @param options - Optional durable `store` (see {@link ConversationManagerOptions})
 * @returns An empty {@link ConversationManagerInterface}
 *
 * @example
 * ```ts
 * import { createConversationManager } from '@orkestrel/agent'
 *
 * const conversations = createConversationManager()
 * const chat = conversations.add() // auto-activates — conversations.active === chat
 * chat.add({ role: 'user', content: 'Hello' })
 * ```
 */
export function createConversationManager(
	options?: ConversationManagerOptions,
): ConversationManagerInterface {
	return new ConversationManager(options)
}

/**
 * Creates the in-memory conversation store — a {@link ConversationStoreInterface} backed by a
 * process-lifetime `Map` of {@link import('./types.js').ConversationSnapshot} records keyed by conversation
 * id, the default backing for the durable {@link ConversationManagerInterface.open} /
 * {@link ConversationManagerInterface.save} seam. The exact twin of
 * {@link import('@orkestrel/workspace').createMemoryWorkspaceStore}.
 *
 * @remarks
 * A plain `Map` (the snapshot is already pure JSON, so no encoding is needed for the memory tier),
 * the structural twin of {@link import('@orkestrel/workspace').createMemoryWorkspaceStore}.
 * `get` / `set` / `delete` are async (the
 * same shape a durable backend fits); unlike a session store there is no idle-TTL / eviction — a
 * persisted conversation lives until an explicit `delete`. Its driver-pluggable twin is
 * {@link createDatabaseConversationStore} (the snapshot as one opaque JSON column over a `databases`
 * table) — for a durable store pass it a JSON / SQLite / IndexedDB driver, and it swaps in without
 * touching the manager or the conversation. Hydration stays a manager concern: read a snapshot back
 * and rebuild the live conversation through the `snapshot` option.
 *
 * @returns A memory-backed {@link ConversationStoreInterface}
 *
 * @example
 * ```ts
 * import { createConversationManager, createMemoryConversationStore } from '@orkestrel/agent'
 *
 * const store = createMemoryConversationStore()
 * const manager = createConversationManager({ store })
 * const conversation = manager.add()
 * conversation.add({ role: 'user', content: 'hello' })
 * await manager.save(conversation.id)            // persist the conversation
 * ```
 */
export function createMemoryConversationStore(): ConversationStoreInterface {
	return new MemoryConversationStore()
}

/**
 * Creates a {@link DatabaseConversationStore} over any {@link DriverInterface} — the durable,
 * driver-pluggable backing for the conversation persistence
 * seam, holding each snapshot as one opaque JSON column and standing as the opt-in twin of
 * {@link createMemoryConversationStore}. The exact twin of
 * {@link import('@orkestrel/workspace').createDatabaseWorkspaceStore}.
 *
 * @remarks
 * Builds a one-table database (`conversations`, keyed by `id`) over the supplied driver, the snapshot
 * held as one opaque JSON column — the column map is `{ id; snapshot }` where `snapshot` is a
 * `rawShape` (a JSON blob), exactly as
 * {@link import('@orkestrel/workspace').createDatabaseWorkspaceStore} stores its snapshot. The
 * snapshot is already a complete, self-contained, pure-JSON payload, so storing it whole is lossless
 * and keeps the row type flat (the column reads back as `unknown`, narrowed on `get` by
 * {@link import('./validators.js').isConversationSnapshot}). Default driver:
 * {@link createMemoryDriver}, so the store also works in memory out of the box; pass a server
 * `createJSONDriver` / `createSQLiteDriver` (or a browser IndexedDB driver) for a persistent one —
 * the durability is the driver's job, the store engine is shared. It swaps in behind
 * {@link ConversationStoreInterface} without touching the manager or the conversation.
 *
 * @param driver - The storage backend the snapshots persist to. Default: {@link createMemoryDriver}
 * @returns A {@link ConversationStoreInterface} over the driver
 *
 * @example
 * ```ts
 * import { createConversationManager, createDatabaseConversationStore } from '@orkestrel/agent'
 * import { createMemoryDriver } from '@orkestrel/database'
 *
 * const store = createDatabaseConversationStore(createMemoryDriver()) // a durable driver swaps in here
 * const manager = createConversationManager({ store })
 * const conversation = manager.add()
 * conversation.add({ role: 'user', content: 'hello' })
 * await manager.save(conversation.id)            // persist the conversation (one JSON column)
 * ```
 */
export function createDatabaseConversationStore(
	driver: DriverInterface = createMemoryDriver(),
): ConversationStoreInterface {
	// The snapshot is stored as one opaque JSON column (`rawShape`), so the row infers flat —
	// `{ id: string; snapshot: unknown }` = `ConversationSnapshotRow` — and the snapshot shape never
	// forces a contract `Infer`.
	const columns = { id: stringShape(), snapshot: rawShape({}) }
	const database = createDatabase({ driver, tables: { conversations: columns } })
	const table: TableInterface<ConversationSnapshotRow> = database.table('conversations')
	return new DatabaseConversationStore(table)
}
