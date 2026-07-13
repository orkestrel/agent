import type { EmitterErrorHandler, EmitterHooks } from '../../emitters/types.js'
import type {
	WorkspaceEventMap,
	WorkspaceInput,
	WorkspaceInterface,
	WorkspaceManagerInterface,
	WorkspaceManagerOptions,
	WorkspaceStoreInterface,
} from '../types.js'
import { isArray } from '../../contracts/index.js'
import { Workspace } from './Workspace.js'

/**
 * The registry of {@link Workspace}s keyed by `id`, in insertion order, WITH an active pointer
 * — the §9 store over the workspace layer PLUS the `active` / `switch` seam the context renders.
 * Event-free (a registry, like {@link ConversationManager}); the observability lives on each
 * {@link Workspace}.
 *
 * @remarks
 * - **Registry.** Workspaces live in an insertion-ordered `Map` keyed by `id`. `add(input?)`
 *   mints a {@link Workspace} (its `id` from `input` or `crypto.randomUUID()`), flowing the
 *   manager's default `on` / `error` in unless the `input` OVERRIDES them, and stores it (an
 *   already-present `id` OVERWRITES — last write wins). `count` is the map size, `workspace(id)`
 *   looks one up, `workspaces()` lists them in insertion order.
 * - **Active pointer.** `active` is the active workspace (what the context renders), `undefined`
 *   until the FIRST `add` (which auto-activates it — a registry with workspaces always has one
 *   active). A subsequent `add` leaves `active` unchanged. `switch(id)` re-points `active` to the
 *   workspace with `id` and returns it; an unknown `id` returns `undefined` and leaves `active`
 *   unchanged (the lenient lookup style — never throws, no new error code).
 * - **Removal.** `remove` drops one by id, or a batch (§9.2) — `true` when any was removed;
 *   removing the ACTIVE workspace sets `active` to `undefined`. `clear` empties the registry and
 *   sets `active` to `undefined`.
 * - **Durable open / save (the optional `store`).** With a {@link WorkspaceStoreInterface} supplied
 *   (the `store` option), `open(id)` HYDRATES a workspace on a registry miss — it `store.get(id)`s
 *   the snapshot and rebuilds a fresh {@link Workspace} through the constructor `seed`
 *   (`snapshot.files` → path → File), then activates it — and `save(id)` PERSISTS a registered
 *   workspace's `snapshot()`. Both are LENIENT without a store (open resolves only registered ids,
 *   save is a no-op `false`), consistent with the lenient `switch`.
 * - **Event-free.** A purely registry store — no Emitter, no events (each workspace owns its own
 *   observable `emitter`).
 *
 * @example
 * ```ts
 * const manager = new WorkspaceManager()
 * const first = manager.add() // auto-activates — active === first
 * manager.add({ id: 'scratch' }) // leaves active unchanged
 * manager.switch('scratch') // re-points active to the 'scratch' workspace
 * manager.count // 2
 * ```
 */
export class WorkspaceManager implements WorkspaceManagerInterface {
	readonly #workspaces = new Map<string, WorkspaceInterface>()
	// The active workspace's id — what the context renders; `undefined` until the first `add`
	// auto-activates one (kept as an id, never a stale reference, so a re-add / removal of that id
	// is reflected through the live map lookup in `active`).
	#active: string | undefined
	// The default event listeners flowed into every workspace `add` creates (a per-`add` override
	// wins).
	readonly #on: EmitterHooks<WorkspaceEventMap> | undefined
	// The default listener-error handler flowed into every workspace `add` creates (overridable).
	readonly #error: EmitterErrorHandler | undefined
	// The optional durable store backing `open` / `save`; `undefined` ⇒ registry-only (both lenient).
	readonly #store: WorkspaceStoreInterface | undefined

	constructor(options?: WorkspaceManagerOptions) {
		this.#on = options?.on
		this.#error = options?.error
		this.#store = options?.store
	}

	get count(): number {
		return this.#workspaces.size
	}

	get active(): WorkspaceInterface | undefined {
		return this.#active === undefined ? undefined : this.#workspaces.get(this.#active)
	}

	workspace(id: string): WorkspaceInterface | undefined {
		return this.#workspaces.get(id)
	}

	workspaces(): readonly WorkspaceInterface[] {
		return [...this.#workspaces.values()]
	}

	add(input?: WorkspaceInput): WorkspaceInterface {
		// The manager's defaults flow in unless the input overrides them — so a workspace created
		// through the manager inherits its `on` / `error` by default.
		const workspace = new Workspace(
			{
				...(input?.id === undefined ? {} : { id: input.id }),
				on: input?.on ?? this.#on,
				error: input?.error ?? this.#error,
			},
			input?.seed,
		)
		this.#workspaces.set(workspace.id, workspace)
		// First workspace auto-activates: a registry that holds workspaces always has one active.
		if (this.#active === undefined) this.#active = workspace.id
		return workspace
	}

	switch(id: string): WorkspaceInterface | undefined {
		// Lenient (mirrors `workspace(id)`): an unknown id re-points nothing and returns undefined.
		const workspace = this.#workspaces.get(id)
		if (workspace === undefined) return undefined
		this.#active = id
		return workspace
	}

	async open(id: string): Promise<WorkspaceInterface | undefined> {
		// Already registered ⇒ just activate it (no store hit) — the registry is the live source.
		const existing = this.#workspaces.get(id)
		if (existing !== undefined) {
			this.#active = id
			return existing
		}
		// No store ⇒ a registry miss resolves nothing (lenient, like `switch`/`workspace`).
		if (this.#store === undefined) return undefined
		// Store hit ⇒ rehydrate through the constructor `seed` (snapshot.files → path → File) by
		// reusing `add`, which registers + auto-activates a fresh Workspace; a miss ⇒ undefined.
		const snapshot = await this.#store.get(id)
		if (snapshot === undefined) return undefined
		const workspace = this.add({ id, seed: snapshot.files.map((file) => [file.path, file]) })
		// Re-point `active` explicitly: `add` only auto-activates the FIRST workspace, so an open into
		// a non-empty registry must still make the rehydrated one active.
		this.#active = workspace.id
		return workspace
	}

	async save(id: string): Promise<boolean> {
		// Lenient: persist only when a store is set AND the id is registered; otherwise a no-op.
		const workspace = this.#workspaces.get(id)
		if (this.#store === undefined || workspace === undefined) return false
		await this.#store.set(workspace.snapshot())
		return true
	}

	// §9.2: the array overload FIRST, so a list resolves to the batch form (an `id` is a string,
	// never an array, so the two never overlap — but the project declares the array overload
	// first by convention).
	remove(ids: readonly string[]): boolean
	remove(id: string): boolean
	remove(ids: string | readonly string[]): boolean {
		if (isArray(ids)) {
			let removed = false
			for (const id of ids) {
				if (this.#drop(id)) removed = true
			}
			return removed
		}
		return this.#drop(ids)
	}

	clear(): void {
		this.#workspaces.clear()
		// An emptied registry has no active workspace.
		this.#active = undefined
	}

	// Delete one workspace by id; when it was the ACTIVE one, clear the active pointer (a removed
	// workspace can never stay active).
	#drop(id: string): boolean {
		const removed = this.#workspaces.delete(id)
		if (removed && this.#active === id) this.#active = undefined
		return removed
	}
}
