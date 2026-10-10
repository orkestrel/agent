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
 * Creates a conversation — a {@link ConversationInterface} grouping messages above a flat
 * message store it owns directly, with compaction into summarized sections, on-demand
 * `rehydrate`, and substring `search`, driven by a provider-agnostic
 * {@link ConversationSummaryHandler} seam.
 *
 * @remarks
 * Append turns through the conversation's own `add` (the live tail it owns); `view()` is the model input
 * (each section as a summary message, then the live tail). `compact()` folds the older live
 * messages into a summarized {@link Section}, whole exchanges at a time — it requires a
 * `summarize` (without one `compact()` throws a `ConversationError`); `keep` retains a recent
 * tail (Default: `DEFAULT_CONVERSATION_KEEP`, which folds up to the newest user message).
 * `rehydrate(id)` / `search(query)` read the retained originals. Observable (`emitter` —
 * `compact` / `collapse` / `rehydrate`), wired
 * through the reserved `on` option; the emitter isolates a listener throw and routes it to
 * its `error` handler (the `error` option), so it can never corrupt a compaction.
 *
 * @param options - Optional `id` / `on` hooks + the `summarize` seam + `keep` + `sections` (see {@link ConversationOptions})
 * @returns A working {@link ConversationInterface}
 *
 * @example Conversations & compaction
 * ```ts
 * import type { ProviderInterface } from '@orkestrel/agent'
 * import { createConversation } from '@orkestrel/agent'
 *
 * declare const provider: ProviderInterface // any concrete implementation supplied by the host app
 * // The summarizer seam — built from the provider by the runtime; core stays provider-agnostic.
 * // Append the instruction as the FINAL user turn: a chat model emits nothing when the prompt
 * // ends on an assistant turn, so a leading-system instruction is unreliable.
 * const conversation = createConversation({
 * 	summarize: async (messages) =>
 * 		(
 * 			await provider.generate(
 * 				[
 * 					...messages,
 * 					{ id: 's', role: 'user', content: 'Summarize the conversation so far concisely.' },
 * 				],
 * 				AbortSignal.timeout(30_000),
 * 			)
 * 		).content,
 * 	keep: 2, // retain at least the 2 most recent messages verbatim on each compaction
 * })
 * conversation.add([
 * 	{ role: 'user', content: 'My name is Ada.' },
 * 	{ role: 'assistant', content: 'Nice to meet you, Ada.' },
 * 	{ role: 'user', content: 'Book a table for two at 19:00.' },
 * 	{ role: 'assistant', content: 'Booked for two at 19:00.' },
 * 	{ role: 'user', content: 'What did I say my name was?' },
 * ])
 *
 * const section = await conversation.compact() // folds the first exchange → a summarized section
 * conversation.view() // [<section summary message>, ...the retained recent exchanges] — the model input
 * conversation.search('ada') // case-insensitive across sections' originals + the live tail
 * section && conversation.rehydrate(section.id) // the section's full original messages (a pure read)
 * ```
 */
export function createConversation(options?: ConversationOptions): ConversationInterface {
	return new Conversation(options)
}

/**
 * Creates a conversation registry — a {@link ConversationManagerInterface} holding
 * {@link ConversationInterface} instances keyed by their `id`, in insertion order, with an active pointer:
 * the id-keyed store over the conversation layer plus the `active` / `switch` seam the context
 * renders. `add` auto-activates the first conversation and flows the registry's default
 * `summarize` / `keep` into every conversation it creates.
 *
 * @remarks
 * Starts empty; `add(input?)` mints a {@link ConversationInterface} (its `id` from the input
 * or a random UUID), flowing the manager's default `summarize` / `keep` in unless the input
 * overrides them, and stores it (an already-present `id` overwrites — last write wins) — and
 * auto-activates the first one (a registry with conversations always has one `active`); a later
 * `add` leaves `active` unchanged. `switch(id)` re-points `active` (an unknown `id` returns
 * `undefined`, leaving `active` unchanged — lenient, never throws); `conversation(id)` /
 * `conversations()` look up; `remove` (one or a batch) reports `true` only when every supplied id
 * was removed and clears `active` if it was a removed one; `clear` empties it and clears `active`.
 * Event-free
 * (each conversation owns its own observable `emitter`). A conversation created with neither a
 * manager default nor a per-`add` `summarize` cannot `compact` (it throws a `ConversationError`).
 *
 * @param options - Optional default `summarize` / `keep` (see {@link ConversationManagerOptions})
 * @returns An empty {@link ConversationManagerInterface}
 *
 * @example
 * ```ts
 * import { createConversationManager } from '@orkestrel/agent'
 *
 * const conversations = createConversationManager({ summarize: async (m) => `recap of ${m.length}` })
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
 * and rebuild the live conversation through the `snapshot` option (re-supplying the live
 * `summarize` / `keep`).
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
	// `{ id: string; snapshot: unknown }` = `ConversationSnapshotRow` — and the sections/messages
	// snapshot shape never forces a contract `Infer`.
	const columns = { id: stringShape(), snapshot: rawShape({}) }
	const database = createDatabase({ driver, tables: { conversations: columns } })
	const table: TableInterface<ConversationSnapshotRow> = database.table('conversations')
	return new DatabaseConversationStore(table)
}
