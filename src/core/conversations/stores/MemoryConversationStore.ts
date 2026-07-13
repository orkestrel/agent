import type { ConversationSnapshot, ConversationStoreInterface } from '../../types.js'

/**
 * The in-memory {@link ConversationStoreInterface} — a process-lifetime `Map` of
 * {@link ConversationSnapshot}s keyed by conversation id, the DEFAULT store
 * {@link import('../../factories.js').createMemoryConversationStore} builds. The EXACT twin of
 * {@link import('../../workspaces/stores/MemoryWorkspaceStore.js').MemoryWorkspaceStore}.
 *
 * @remarks
 * A plain `Map<string, ConversationSnapshot>` (AGENTS §21 — the snapshot is already pure,
 * self-contained JSON, so no encoding is needed for the memory tier). Like the
 * {@link import('../../workspaces/stores/MemoryWorkspaceStore.js').MemoryWorkspaceStore} it twins,
 * there is NO idle-TTL and NO eviction: a persisted conversation lives until an explicit `delete`. A
 * durable backend (JSON / SQLite / IndexedDB) swaps in through the SAME interface without touching
 * the {@link import('../ConversationManager.js').ConversationManager} or the
 * {@link import('../Conversation.js').Conversation} — its driver-pluggable twin is
 * {@link import('./DatabaseConversationStore.js').DatabaseConversationStore} (the snapshot as one
 * opaque JSON column).
 *
 * - **`get` resolves the persisted snapshot for an id**, or `undefined` if none is stored.
 * - **`set` inserts / replaces under the snapshot's OWN `id`** (no separate id param).
 * - **`delete` drops a snapshot by id**; an absent id is a no-op (no throw).
 *
 * The public surface is EXACTLY `get` / `set` / `delete` — no extra members (the §22 method
 * bijection with {@link ConversationStoreInterface}). Hydration is a caller concern: a
 * {@link import('../ConversationManager.js').ConversationManager} reads a snapshot back and rebuilds
 * the live conversation through the constructor `seed` (its `open` / `save`).
 *
 * @example
 * ```ts
 * import { createConversation, createMemoryConversationStore } from '@src/core'
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

	get(id: string): Promise<ConversationSnapshot | undefined> {
		return Promise.resolve(this.#snapshots.get(id))
	}

	set(snapshot: ConversationSnapshot): Promise<void> {
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
