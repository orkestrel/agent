import type { MemoSnapshot, MemoSnapshotRow, MemoStoreInterface } from '../types.js'
import type { TableInterface } from '@orkestrel/database'
import { isMemoSnapshot } from '../validators.js'

/**
 * Backs a {@link MemoStoreInterface} with one table of the `databases` layer — a memo set's durable
 * state is a row holding the snapshot as one opaque JSON column, narrowed back on `get` by
 * {@link import('../validators.js').isMemoSnapshot}.
 *
 * @remarks
 * The store is driver-agnostic: it holds a single {@link TableInterface} whose backend (memory,
 * JSON, SQLite, IndexedDB) is chosen by whoever builds it (the factories), so a JSON / SQLite /
 * IndexedDB backend swaps in without touching the
 * {@link import('../memos/MemoManager.js').MemoManager}. Default driver: memory
 * ({@link import('../factories.js').createDatabaseMemoStore} passes `createMemoryDriver()`), so it
 * also works in memory out of the box; pass a JSON / SQLite / IndexedDB driver for a durable store.
 *
 * The {@link MemoSnapshot} is stored as one opaque JSON column — the table is a row of
 * `{ id; snapshot }` ({@link MemoSnapshotRow}), the snapshot the whole JSON blob (a `rawShape`
 * column the factory builds). The snapshot is already a complete, self-contained, pure-JSON payload,
 * so storing it whole is lossless and keeps the row type flat (`snapshot` reads back as `unknown`).
 *
 * - **`set(snapshot)` upserts under the snapshot's own `id`** (no separate id param) — it writes
 *   the row `{ id: snapshot.id, snapshot }`.
 * - **`get(id)` resolves the stored snapshot for an id**, narrowing the opaque JSON column back to
 *   a {@link MemoSnapshot} ({@link import('../validators.js').isMemoSnapshot} — the total guard for
 *   an untrusted storage read), or `undefined` if none is stored, the blob is malformed, or the
 *   blob's own `id` is not the requested one.
 * - **`delete(id)` drops a snapshot by id**; an absent id is a no-op (no throw).
 *
 * @example
 * ```ts
 * import { createDatabaseMemoStore, createMemoManager } from '@orkestrel/agent'
 * import { createMemoryDriver } from '@orkestrel/database'
 *
 * const store = createDatabaseMemoStore(createMemoryDriver()) // a durable driver swaps in here
 * const memos = createMemoManager({ id: 'ada' })
 * memos.add({ name: 'tone', description: 'Prefers short replies.', content: 'Answer briefly.' })
 * await store.set(memos.snapshot())   // store the memo set (one JSON column)
 * const snapshot = await store.get('ada')
 * await store.delete('ada')           // drop it
 * ```
 */
export class DatabaseMemoStore implements MemoStoreInterface {
	readonly #table: TableInterface<MemoSnapshotRow>

	/**
	 * Wraps a table as a memo store.
	 *
	 * @param table - The {@link TableInterface} holding the snapshots — its row is the
	 *   {@link MemoSnapshotRow} `{ id; snapshot }` shape (the snapshot one opaque JSON column)
	 */
	constructor(table: TableInterface<MemoSnapshotRow>) {
		this.#table = table
	}

	/**
	 * Resolves the stored snapshot for `id`, narrowing the opaque JSON column back to a
	 * `MemoSnapshot`.
	 *
	 * @remarks
	 * The column is an untrusted storage read, so a blob that fails
	 * {@link import('../validators.js').isMemoSnapshot}, or whose own `id` is not `id`, resolves
	 * `undefined` rather than a memo set under the wrong key.
	 *
	 * @param id - The memo set id to resolve (the row key)
	 * @returns The stored snapshot, or `undefined` when no row is stored, the blob is malformed, or
	 * the blob names another id
	 */
	async get(id: string): Promise<MemoSnapshot | undefined> {
		const row = await this.#table.get(id)
		if (row === undefined) return undefined
		// The snapshot crosses back as an untrusted storage read (a structured clone / a JSON row),
		// so narrow the opaque JSON column with the total boundary guard rather than a cast;
		// a malformed blob resolves `undefined`, never a broken memo set.
		const snapshot = row.snapshot
		return isMemoSnapshot(snapshot) && snapshot.id === id ? snapshot : undefined
	}

	/**
	 * Inserts or replaces under the snapshot's own `id` (no separate id param) — the row is
	 * `{ id, snapshot }`.
	 *
	 * @param snapshot - The snapshot to store, keyed by its `id`
	 * @returns A promise that resolves after the row is written
	 */
	async set(snapshot: MemoSnapshot): Promise<void> {
		await this.#table.set({ id: snapshot.id, snapshot })
	}

	/**
	 * Drops a snapshot by id; an absent id is a no-op (no throw).
	 *
	 * @param id - The memo set id to drop
	 * @returns A promise that resolves after the row is gone
	 */
	async delete(id: string): Promise<void> {
		await this.#table.remove(id)
	}
}
