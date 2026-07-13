import type {
	WorkspaceSnapshot,
	WorkspaceSnapshotRow,
	WorkspaceStoreInterface,
} from '../../types.js'
import type { TableInterface } from '@orkestrel/database'
import { isWorkspaceSnapshot } from '../../helpers.js'

/**
 * A {@link WorkspaceStoreInterface} backed by one table of the `databases` layer — a workspace's
 * durable state IS a row, so persistence reduces to keyed point-access (`get` / `set` / `delete`)
 * over a {@link TableInterface}, the driver-pluggable twin of the plain-`Map`
 * {@link import('./MemoryWorkspaceStore.js').MemoryWorkspaceStore}.
 *
 * @remarks
 * The store is driver-agnostic: it holds a single {@link TableInterface} whose backend (memory,
 * JSON, SQLite, IndexedDB) is chosen by whoever builds it (the factories), so a JSON / SQLite /
 * IndexedDB backend swaps in WITHOUT touching the
 * {@link import('../WorkspaceManager.js').WorkspaceManager} or the
 * {@link import('../Workspace.js').Workspace} — the same seam as
 * the analogous `DatabaseWorkflowStore` in `@orkestrel/workflow`. The
 * driver defaults to memory ({@link import('../../factories.js').createDatabaseWorkspaceStore}
 * passes `createMemoryDriver()`), so it ALSO works in memory out of the box; you opt into the
 * durable plumbing by passing a JSON / SQLite / IndexedDB driver.
 *
 * The {@link WorkspaceSnapshot} is stored as ONE OPAQUE JSON COLUMN — the table is a row of
 * `{ id; snapshot }` ({@link WorkspaceSnapshotRow}), the snapshot the whole JSON blob (a `rawShape`
 * column the factory builds) — exactly as `DatabaseWorkflowStore` stores its snapshot. The snapshot
 * is already a COMPLETE, self-contained, pure-JSON payload, so storing it whole is lossless AND
 * keeps the row type flat (`snapshot` reads back as `unknown`).
 *
 * - **`set(snapshot)` upserts under the snapshot's OWN `id`** (no separate id param) — it writes
 *   the row `{ id: snapshot.id, snapshot }`.
 * - **`get(id)` resolves the stored snapshot for an id**, narrowing the opaque JSON column back to
 *   a {@link WorkspaceSnapshot} ({@link import('../../helpers.js').isWorkspaceSnapshot} — the AGENTS
 *   §14 boundary narrow for an untrusted storage read), or `undefined` if none is stored.
 * - **`delete(id)` drops a snapshot by id**; an absent id is a no-op (no throw).
 *
 * UNLIKE a session store there is NO idle-TTL / eviction — a persisted workspace lives until an
 * explicit `delete`. The public surface is EXACTLY `get` / `set` / `delete` — no extra members (the
 * §22 method bijection with {@link WorkspaceStoreInterface}). Hydration stays a caller concern: a
 * {@link import('../WorkspaceManager.js').WorkspaceManager} reads a snapshot back and rebuilds the
 * live workspace through the constructor `seed` (its `open` / `save`).
 *
 * @example
 * ```ts
 * import { createDatabaseWorkspaceStore, createMemoryDriver, createWorkspace } from '@src/core'
 *
 * const store = createDatabaseWorkspaceStore(createMemoryDriver()) // a durable driver swaps in here
 * const workspace = createWorkspace()
 * workspace.write('notes.txt', 'hello')
 * await store.set(workspace.snapshot())          // persist the workspace (one JSON column)
 * const snapshot = await store.get(workspace.id)
 * await store.delete(workspace.id)               // drop it
 * ```
 */
export class DatabaseWorkspaceStore implements WorkspaceStoreInterface {
	readonly #table: TableInterface<WorkspaceSnapshotRow>

	/**
	 * Wrap a table as a workspace store.
	 *
	 * @param table - The {@link TableInterface} holding the snapshots — its row is the
	 *   {@link WorkspaceSnapshotRow} `{ id; snapshot }` shape (the snapshot one opaque JSON column)
	 */
	constructor(table: TableInterface<WorkspaceSnapshotRow>) {
		this.#table = table
	}

	/** Resolve the persisted snapshot for `id`, narrowing the opaque JSON column back to a `WorkspaceSnapshot`. */
	async get(id: string): Promise<WorkspaceSnapshot | undefined> {
		const row = await this.#table.get(id)
		if (row === undefined) return undefined
		// The snapshot crosses back as an untrusted storage read (a structured clone / a JSON row),
		// so narrow the opaque JSON column with the boundary guard rather than a cast (AGENTS §14);
		// a malformed blob resolves `undefined`, never a broken workspace.
		return isWorkspaceSnapshot(row.snapshot) ? row.snapshot : undefined
	}

	/** Insert or replace under the snapshot's OWN `id` (no separate id param) — the row is `{ id, snapshot }`. */
	async set(snapshot: WorkspaceSnapshot): Promise<void> {
		await this.#table.set({ id: snapshot.id, snapshot })
	}

	/** Drop a snapshot by id; an absent id is a no-op (no throw). */
	async delete(id: string): Promise<void> {
		await this.#table.remove(id)
	}
}
