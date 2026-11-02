import type { MemoSnapshot, MemoStoreInterface } from '../types.js'

/**
 * Implements the {@link MemoStoreInterface} in memory — a process-lifetime map of
 * {@link MemoSnapshot} records keyed by memo set id, the store
 * {@link import('../factories.js').createMemoryMemoStore} builds.
 *
 * @remarks
 * The snapshot is plain JSON data, so the memory tier needs no encoding. A stored set lives until
 * an explicit `delete`. Its driver-pluggable twin is
 * {@link import('./DatabaseMemoStore.js').DatabaseMemoStore} (the snapshot as one opaque JSON
 * column).
 *
 * This store copies nothing: `get` returns the object `set` received, as a readonly
 * {@link MemoSnapshot}, where the twin reads back the copy its driver made. `createMemoManager`
 * copies a snapshot through JSON, so a restored manager shares no state with this store.
 *
 * - **`get` resolves the stored snapshot for an id**, or `undefined` if none is stored.
 * - **`set` inserts or replaces under the snapshot's own `id`** (no separate id param).
 * - **`delete` drops a snapshot by id**; an absent id is a no-op (no throw).
 *
 * @example
 * ```ts
 * import { createMemoManager, createMemoryMemoStore } from '@orkestrel/agent'
 *
 * const store = createMemoryMemoStore()
 * const memos = createMemoManager({ id: 'ada' })
 * memos.add({ name: 'tone', description: 'Prefers short replies.', content: 'Answer briefly.' })
 * await store.set(memos.snapshot())   // store the memo set
 * const snapshot = await store.get('ada')
 * await store.delete('ada')           // drop it
 * ```
 */
export class MemoryMemoStore implements MemoStoreInterface {
	// Every stored set by id. Replaced on every change rather than mutated in place.
	#snapshots: ReadonlyMap<string, MemoSnapshot> = new Map()

	/**
	 * Resolves the stored snapshot for `id`, or `undefined` if none is stored.
	 *
	 * @param id - The memo set id to resolve (a {@link MemoSnapshot.id})
	 * @returns The stored snapshot, or `undefined` if absent
	 */
	get(id: string): Promise<MemoSnapshot | undefined> {
		return Promise.resolve(this.#snapshots.get(id))
	}

	/**
	 * Inserts or replaces a snapshot under its own `snapshot.id`.
	 *
	 * @param snapshot - The snapshot to store, keyed by its `id`
	 */
	set(snapshot: MemoSnapshot): Promise<void> {
		this.#snapshots = new Map([...this.#snapshots, [snapshot.id, snapshot]])
		return Promise.resolve()
	}

	/**
	 * Drops a snapshot by id; an absent id is a no-op.
	 *
	 * @param id - The memo set id to drop
	 */
	delete(id: string): Promise<void> {
		this.#snapshots = new Map([...this.#snapshots].filter(([key]) => key !== id))
		return Promise.resolve()
	}
}
