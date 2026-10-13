import type {
	ConversationSnapshot,
	ConversationSnapshotRow,
	ConversationStoreInterface,
} from '../types.js'
import type { TableInterface } from '@orkestrel/database'
import { isConversationSnapshot } from '../validators.js'

/**
 * Backs a {@link ConversationStoreInterface} with one table of the `databases` layer — a
 * conversation's durable state is a row holding the snapshot as one opaque JSON column, narrowed
 * back on `get` by {@link import('../validators.js').isConversationSnapshot}, so persistence
 * reduces to keyed point-access (`get` / `set` / `delete`) over a {@link TableInterface}. The
 * driver-pluggable twin of the plain-`Map`
 * {@link import('./MemoryConversationStore.js').MemoryConversationStore}, and the exact twin of
 * {@link import('@orkestrel/workspace').DatabaseWorkspaceStore}.
 *
 * @remarks
 * The store is driver-agnostic: it holds a single {@link TableInterface} whose backend (memory,
 * JSON, SQLite, IndexedDB) is chosen by whoever builds it (the factories), so a JSON / SQLite /
 * IndexedDB backend swaps in without touching the
 * {@link import('../ConversationManager.js').ConversationManager} or the
 * {@link import('../Conversation.js').Conversation} — the same seam as
 * {@link import('@orkestrel/workspace').DatabaseWorkspaceStore}. Default driver: memory
 * ({@link import('../factories.js').createDatabaseConversationStore} passes
 * `createMemoryDriver()`), so it also works in memory out of the box; you opt into the
 * durable plumbing by passing a JSON / SQLite / IndexedDB driver.
 *
 * The {@link ConversationSnapshot} is stored as one opaque JSON column — the table is a row of
 * `{ id; snapshot }` ({@link ConversationSnapshotRow}), the snapshot the whole JSON blob (a
 * `rawShape` column the factory builds) — exactly as `DatabaseWorkspaceStore` stores its snapshot.
 * The snapshot is already a complete, self-contained, pure-JSON payload, so storing it whole is
 * lossless and keeps the row type flat (`snapshot` reads back as `unknown`).
 *
 * - **`set(snapshot)` upserts under the snapshot's own `id`** (no separate id param) — it writes
 *   the row `{ id: snapshot.id, snapshot }`.
 * - **`get(id)` resolves the stored snapshot for an id**, narrowing the opaque JSON column back to
 *   a {@link ConversationSnapshot} ({@link import('../validators.js').isConversationSnapshot} — the
 *   total guard for an untrusted storage read), or `undefined` if none is stored, the blob is
 *   malformed, or the blob's own `id` is not the requested one.
 * - **`delete(id)` drops a snapshot by id**; an absent id is a no-op (no throw).
 *
 * Unlike a session store there is no idle-TTL / eviction — a persisted conversation lives until an
 * explicit `delete`. The public surface is exactly `get` / `set` / `delete` — no extra members (the
 * method bijection with {@link ConversationStoreInterface}). Hydration stays a caller concern: a
 * {@link import('../ConversationManager.js').ConversationManager} reads a snapshot back and rebuilds
 * the live conversation through the `snapshot` option (its `open` / `save`).
 *
 * @example
 * ```ts
 * import { createConversation, createDatabaseConversationStore } from '@orkestrel/agent'
 * import { createMemoryDriver } from '@orkestrel/database'
 *
 * const store = createDatabaseConversationStore(createMemoryDriver()) // a durable driver swaps in here
 * const conversation = createConversation()
 * conversation.add({ role: 'user', content: 'hello' })
 * await store.set(conversation.snapshot())        // persist the conversation (one JSON column)
 * const snapshot = await store.get(conversation.id)
 * await store.delete(conversation.id)             // drop it
 * ```
 */
export class DatabaseConversationStore implements ConversationStoreInterface {
	readonly #table: TableInterface<ConversationSnapshotRow>

	/**
	 * Wraps a table as a conversation store.
	 *
	 * @param table - The {@link TableInterface} holding the snapshots — its row is the
	 *   {@link ConversationSnapshotRow} `{ id; snapshot }` shape (the snapshot one opaque JSON column)
	 */
	constructor(table: TableInterface<ConversationSnapshotRow>) {
		this.#table = table
	}

	/**
	 * Resolves the persisted snapshot for `id`, narrowing the opaque JSON column back to a
	 * `ConversationSnapshot`.
	 *
	 * @remarks
	 * The column is an untrusted storage read, so a blob that fails
	 * {@link import('../validators.js').isConversationSnapshot}, or whose own `id` is not `id`,
	 * resolves `undefined` rather than a conversation under the wrong key.
	 *
	 * @param id - The conversation id to resolve (the row key)
	 * @returns The persisted snapshot, or `undefined` when no row is stored, the blob is malformed,
	 * or the blob names another id
	 */
	async get(id: string): Promise<ConversationSnapshot | undefined> {
		const row = await this.#table.get(id)
		if (row === undefined) return undefined
		// The snapshot crosses back as an untrusted storage read (a structured clone / a JSON row),
		// so narrow the opaque JSON column with the total boundary guard rather than a cast;
		// a malformed blob resolves `undefined`, never a broken conversation.
		const snapshot = row.snapshot
		return isConversationSnapshot(snapshot) && snapshot.id === id ? snapshot : undefined
	}

	/**
	 * Inserts or replaces under the snapshot's own `id` (no separate id param) — the row is
	 * `{ id, snapshot }`.
	 *
	 * @param snapshot - The snapshot to store, keyed by its `id`
	 * @returns A promise that resolves once the row is written
	 */
	async set(snapshot: ConversationSnapshot): Promise<void> {
		await this.#table.set({ id: snapshot.id, snapshot })
	}

	/**
	 * Drops a snapshot by id; an absent id is a no-op (no throw).
	 *
	 * @param id - The conversation id to drop
	 * @returns A promise that resolves once the row is gone
	 */
	async delete(id: string): Promise<void> {
		await this.#table.remove(id)
	}
}
