import type { ConversationSnapshot, ConversationStoreInterface } from '../types.js'

/**
 * Implements the {@link ConversationStoreInterface} in memory — a process-lifetime `Map` of
 * {@link ConversationSnapshot} records keyed by conversation id, the default store
 * {@link import('../factories.js').createMemoryConversationStore} builds and the default
 * backing for `open` / `save`. The exact twin of
 * {@link import('@orkestrel/workspace').MemoryWorkspaceStore}.
 *
 * @remarks
 * A plain `Map<string, ConversationSnapshot>` — the snapshot is already pure,
 * self-contained JSON, so no encoding is needed for the memory tier. Like the
 * {@link import('@orkestrel/workspace').MemoryWorkspaceStore} it twins,
 * there is no idle-TTL and no eviction: a persisted conversation lives until an explicit `delete`. A
 * durable backend (JSON / SQLite / IndexedDB) swaps in through the same interface without touching
 * the {@link import('../ConversationManager.js').ConversationManager} or the
 * {@link import('../Conversation.js').Conversation} — its driver-pluggable twin is
 * {@link import('./DatabaseConversationStore.js').DatabaseConversationStore} (the snapshot as one
 * opaque JSON column).
 *
 * - **`get` resolves the persisted snapshot for an id**, or `undefined` if none is stored.
 * - **`set` inserts / replaces under the snapshot's own `id`** (no separate id param).
 * - **`delete` drops a snapshot by id**; an absent id is a no-op (no throw).
 *
 * The public surface is exactly `get` / `set` / `delete` — no extra members (the method
 * bijection with {@link ConversationStoreInterface}). Hydration is a caller concern: a
 * {@link import('../ConversationManager.js').ConversationManager} reads a snapshot back and rebuilds
 * the live conversation through the `snapshot` option (its `open` / `save`).
 *
 * @example
 * ```ts
 * import { createConversation, createMemoryConversationStore } from '@orkestrel/agent'
 *
 * const store = createMemoryConversationStore()
 * const conversation = createConversation()
 * conversation.add({ role: 'user', content: 'hello' })
 * await store.set(conversation.snapshot())   // persist the conversation
 * const snapshot = await store.get(conversation.id)
 * await store.delete(conversation.id)        // drop it
 * ```
 */
export class MemoryConversationStore implements ConversationStoreInterface {
	readonly #snapshots = new Map<string, ConversationSnapshot>()

	/**
	 * Resolves the persisted snapshot for `id`, or `undefined` if none is stored.
	 *
	 * @param id - The conversation id to resolve (a {@link ConversationSnapshot.id})
	 * @returns The persisted snapshot, or `undefined` if absent
	 */
	get(id: string): Promise<ConversationSnapshot | undefined> {
		return Promise.resolve(this.#snapshots.get(id))
	}

	/**
	 * Inserts or replaces a snapshot under its own `snapshot.id` (no separate id param —
	 * mirroring the `set` method of {@link import('@orkestrel/workspace').WorkspaceStoreInterface}).
	 *
	 * @param snapshot - The snapshot to store (keyed by its `id`)
	 * @returns A promise that resolves after the snapshot is stored
	 */
	set(snapshot: ConversationSnapshot): Promise<void> {
		this.#snapshots.set(snapshot.id, snapshot)
		return Promise.resolve()
	}

	/**
	 * Drops a snapshot by id; an absent id is a no-op (no throw).
	 *
	 * @param id - The conversation id to drop
	 * @returns A promise that resolves after the snapshot is dropped
	 */
	delete(id: string): Promise<void> {
		// `Map.delete` of an absent id is a no-op, so no presence check is needed.
		this.#snapshots.delete(id)
		return Promise.resolve()
	}
}
