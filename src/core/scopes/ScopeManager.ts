import type { EmitterErrorHandler, EmitterHooks, EmitterInterface } from '@orkestrel/emitter'
import type {
	ScopeInput,
	ScopeInterface,
	ScopeManagerEventMap,
	ScopeManagerInterface,
} from '../types.js'
import { isArray } from '@orkestrel/contract'
import { Emitter } from '@orkestrel/emitter'
import { Scope } from './Scope.js'

/**
 * The scope registry a richer context reuses named filters from — immutable {@link Scope}s
 * keyed by their minted `id`, in insertion order.
 *
 * @remarks
 * - **Registry.** Scopes live in an insertion-ordered `Map` keyed by their minted `id`;
 *   `create` mints a {@link Scope} from a {@link ScopeInput} (an `id` plus the three
 *   allow-lists), stores it, and returns it. `count` is the map size, `scope(id)` looks
 *   one up, and `scopes()` lists them in insertion order. (Unlike the name-keyed
 *   instruction registry, a scope's key is its minted `id`, so two scopes may share a
 *   `name`; `create` therefore always adds — it never overwrites.)
 * - **Removal.** `remove` drops one by id, or a batch (§9.2) — `true` when any was
 *   removed; `clear` empties the registry.
 * - **Observable (§13).** The owned {@link emitter} ({@link ScopeManagerEventMap}) carries
 *   `create` (the created scope) / `remove` (the id) / `clear`. Every event is emitted
 *   directly, strictly AFTER the map mutation completes; the emitter isolates a listener
 *   throw and routes it to its `error` handler (the `error` option), so a buggy observer can
 *   never corrupt a mutation.
 *
 * @example
 * ```ts
 * const manager = new ScopeManager()
 * const reader = manager.create({ name: 'reader', tools: ['search', 'read'] })
 * manager.scope(reader.id) // the same scope
 * manager.count // 1
 * ```
 */
export class ScopeManager implements ScopeManagerInterface {
	readonly #scopes = new Map<string, ScopeInterface>()
	// The PUSH observation surface (§13) — owned, never inherited. The emitter isolates a
	// listener throw (routing it to the `error` handler), so it can never escape into a mutation.
	readonly #emitter: Emitter<ScopeManagerEventMap>

	constructor(on?: EmitterHooks<ScopeManagerEventMap>, error?: EmitterErrorHandler) {
		this.#emitter = new Emitter<ScopeManagerEventMap>({ on, error })
	}

	get emitter(): EmitterInterface<ScopeManagerEventMap> {
		return this.#emitter
	}

	get count(): number {
		return this.#scopes.size
	}

	create(input: ScopeInput): ScopeInterface {
		const scope = new Scope(input)
		this.#scopes.set(scope.id, scope)
		// Observe the created scope — AFTER the map set, so a swallowed listener throw can't
		// perturb the store the caller is about to use.
		this.#emitter.emit('create', scope)
		return scope
	}

	scope(id: string): ScopeInterface | undefined {
		return this.#scopes.get(id)
	}

	scopes(): readonly ScopeInterface[] {
		return [...this.#scopes.values()]
	}

	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	remove(ids: string | readonly string[]): boolean {
		if (isArray(ids)) {
			let removed = false
			for (const id of ids) {
				if (this.#delete(id)) removed = true
			}
			return removed
		}
		return this.#delete(ids)
	}

	clear(): void {
		this.#scopes.clear()
		// Observe the cleared registry — AFTER the map emptied, so a swallowed listener
		// throw can never alter the clear (no payload — `clear` is a pure signal).
		this.#emitter.emit('clear')
	}

	// Delete one scope, emitting `remove` only when one was actually removed (a delete of
	// an absent id returns `false` and emits nothing) — AFTER the deletion.
	#delete(id: string): boolean {
		const removed = this.#scopes.delete(id)
		if (removed) this.#emitter.emit('remove', id)
		return removed
	}
}
