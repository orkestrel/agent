import type { WorkspaceSnapshot, WorkspaceStoreInterface } from '../../types.js'

/**
 * The in-memory {@link WorkspaceStoreInterface} — a process-lifetime `Map` of
 * {@link WorkspaceSnapshot}s keyed by workspace id, the DEFAULT store
 * {@link import('../../factories.js').createMemoryWorkspaceStore} builds.
 *
 * @remarks
 * A plain `Map<string, WorkspaceSnapshot>` (AGENTS §21 — the snapshot is already pure,
 * self-contained JSON, so no encoding is needed for the memory tier). Like the
 * {@link import('../../../workflows/stores/MemoryWorkflowStore.js').MemoryWorkflowStore} it twins,
 * there is NO idle-TTL and NO eviction: a persisted workspace lives until an explicit `delete`. A
 * durable backend (JSON / SQLite / IndexedDB) swaps in through the SAME interface without touching
 * the {@link import('../WorkspaceManager.js').WorkspaceManager} or the
 * {@link import('../Workspace.js').Workspace} — its driver-pluggable twin is
 * {@link import('./DatabaseWorkspaceStore.js').DatabaseWorkspaceStore} (the snapshot as one opaque
 * JSON column).
 *
 * - **`get` resolves the persisted snapshot for an id**, or `undefined` if none is stored.
 * - **`set` inserts / replaces under the snapshot's OWN `id`** (no separate id param).
 * - **`delete` drops a snapshot by id**; an absent id is a no-op (no throw).
 *
 * The public surface is EXACTLY `get` / `set` / `delete` — no extra members (the §22 method
 * bijection with {@link WorkspaceStoreInterface}). Hydration is a caller concern: a
 * {@link import('../WorkspaceManager.js').WorkspaceManager} reads a snapshot back and rebuilds the
 * live workspace through the constructor `seed` (its `open` / `save`).
 *
 * @example
 * ```ts
 * import { createMemoryWorkspaceStore, createWorkspace } from '@src/core'
 *
 * const store = createMemoryWorkspaceStore()
 * const workspace = createWorkspace()
 * workspace.write('notes.txt', 'hello')
 * await store.set(workspace.snapshot())     // persist the workspace
 * const snapshot = await store.get(workspace.id)
 * await store.delete(workspace.id)          // drop it
 * ```
 */
export class MemoryWorkspaceStore implements WorkspaceStoreInterface {
	readonly #snapshots = new Map<string, WorkspaceSnapshot>()

	get(id: string): Promise<WorkspaceSnapshot | undefined> {
		return Promise.resolve(this.#snapshots.get(id))
	}

	set(snapshot: WorkspaceSnapshot): Promise<void> {
		// Insert / replace under the snapshot's OWN id (no separate id param).
		this.#snapshots.set(snapshot.id, snapshot)
		return Promise.resolve()
	}

	delete(id: string): Promise<void> {
		// Drop by id; `Map.delete` of an absent id is already a no-op (no throw).
		this.#snapshots.delete(id)
		return Promise.resolve()
	}
}
