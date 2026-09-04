import type {
	ConversationSnapshot,
	ConversationSnapshotRow,
	ConversationStoreInterface,
} from '../../types.js'
import type { TableInterface } from '@orkestrel/database'
import { isConversationSnapshot } from '../../validators.js'

/**
 * Backs a {@link ConversationStoreInterface} with one table of the `databases` layer — a
 * conversation's durable state IS a row, so persistence reduces to keyed point-access (`get` / `set`
 * / `delete`) over a {@link TableInterface}, the driver-pluggable twin of the plain-`Map`
 * {@link import('./MemoryConversationStore.js').MemoryConversationStore}. The EXACT twin of
 * {@link import('@orkestrel/workspace').DatabaseWorkspaceStore}.
 *
 * @remarks
 * The store is driver-agnostic: it holds a single {@link TableInterface} whose backend (memory,
 * JSON, SQLite, IndexedDB) is chosen by whoever builds it (the factories), so a JSON / SQLite /
 * IndexedDB backend swaps in WITHOUT touching the
 * {@link import('../ConversationManager.js').ConversationManager} or the
 * {@link import('../Conversation.js').Conversation} — the same seam as
 * {@link import('@orkestrel/workspace').DatabaseWorkspaceStore}. The
 * driver defaults to memory ({@link import('../../factories.js').createDatabaseConversationStore}
 * passes `createMemoryDriver()`), so it ALSO works in memory out of the box; you opt into the
 * durable plumbing by passing a JSON / SQLite / IndexedDB driver.
 *
 * The {@link ConversationSnapshot} is stored as ONE OPAQUE JSON COLUMN — the table is a row of
 * `{ id; snapshot }` ({@link ConversationSnapshotRow}), the snapshot the whole JSON blob (a
 * `rawShape` column the factory builds) — exactly as `DatabaseWorkspaceStore` stores its snapshot.
 * The snapshot is already a COMPLETE, self-contained, pure-JSON payload, so storing it whole is
 * lossless AND keeps the row type flat (`snapshot` reads back as `unknown`).
 *
 * - **`set(snapshot)` upserts under the snapshot's OWN `id`** (no separate id param) — it writes
 *   the row `{ id: snapshot.id, snapshot }`.
 * - **`get(id)` resolves the stored snapshot for an id**, narrowing the opaque JSON column back to
 *   a {@link ConversationSnapshot} ({@link import('../../validators.js').isConversationSnapshot} — the
 *   total guard for an untrusted storage read), or `undefined` if none is stored.
 * - **`delete(id)` drops a snapshot by id**; an absent id is a no-op (no throw).
 *
 * UNLIKE a session store there is NO idle-TTL / eviction — a persisted conversation lives until an
 * explicit `delete`. The public surface is EXACTLY `get` / `set` / `delete` — no extra members (the
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

	/** Resolves the persisted snapshot for `id`, narrowing the opaque JSON column back to a `ConversationSnapshot`. */
	async get(id: string): Promise<ConversationSnapshot | undefined> {
		const row = await this.#table.get(id)
		if (row === undefined) return undefined
		// The snapshot crosses back as an untrusted storage read (a structured clone / a JSON row),
		// so narrow the opaque JSON column with the total boundary guard rather than a cast;
		// a malformed blob resolves `undefined`, never a broken conversation.
		return isConversationSnapshot(row.snapshot) ? row.snapshot : undefined
	}

	/** Inserts or replaces under the snapshot's OWN `id` (no separate id param) — the row is `{ id, snapshot }`. */
	async set(snapshot: ConversationSnapshot): Promise<void> {
		await this.#table.set({ id: snapshot.id, snapshot })
	}

	/** Drops a snapshot by id; an absent id is a no-op (no throw). */
	async delete(id: string): Promise<void> {
		await this.#table.remove(id)
	}
}
