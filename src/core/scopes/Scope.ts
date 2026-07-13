import type { ScopeConfiguration, ScopeInput, ScopeInterface } from '../types.js'

/**
 * A named, immutable filter over a richer context's items — three optional allow-lists,
 * one per category (`instructions` / `tools` / `files`), each keyed by that category's
 * identity (an instruction's `name`, a tool's `name`, a workspace file's `path`).
 *
 * @remarks
 * - **A category list is three-way.** `undefined` ⇒ NO constraint on that category (all
 *   pass); `[]` ⇒ NONE pass; a non-empty list ⇒ only the listed keys pass. The build
 *   step / loop apply this via `filterAllowList`.
 * - **Immutable.** The `id` is minted at construction; every supplied list is COPIED in
 *   (so a later mutation of the caller's array can't leak in), and the lists are
 *   `readonly`. A `Scope` is never mutated after construction — `narrow` returns a NEW
 *   one rather than altering this one.
 * - **`narrow` is set-INTERSECTION (immutable composition).** A child scope's visible set
 *   per category is the intersection of THIS scope's list and the config's list — but
 *   `undefined` means "no constraint", so it acts as the universal set: intersecting
 *   `undefined` with a list yields the list, and `undefined` with `undefined` stays
 *   `undefined`. Narrowing can only TIGHTEN, never widen — a key excluded by a parent
 *   can never be re-admitted by a child.
 *
 * @example
 * ```ts
 * const scope = new Scope({ name: 'reader', tools: ['search', 'read'] })
 * // narrow intersects: tools ∩ ['read', 'write'] = ['read'] (write was never in the parent).
 * const tighter = scope.narrow({ tools: ['read', 'write'] })
 * tighter.tools // ['read']
 * // instructions had no parent constraint (undefined) → the child's list passes through.
 * tighter.narrow({ instructions: ['safety'] }).instructions // ['safety']
 * ```
 */
export class Scope implements ScopeInterface {
	readonly id: string = crypto.randomUUID()
	readonly name: string
	readonly instructions: readonly string[] | undefined
	readonly tools: readonly string[] | undefined
	readonly files: readonly string[] | undefined

	constructor(input: ScopeInput) {
		this.name = input.name
		// Copy each supplied list in (a later mutation of the caller's array can't leak in);
		// an omitted list stays `undefined` — the "no constraint" sentinel.
		this.instructions = input.instructions === undefined ? undefined : [...input.instructions]
		this.tools = input.tools === undefined ? undefined : [...input.tools]
		this.files = input.files === undefined ? undefined : [...input.files]
	}

	narrow(config: ScopeConfiguration): ScopeInterface {
		// A child = the per-category set-intersection of this scope and the config, keeping
		// THIS scope's name. Immutable: a brand-new Scope, this one untouched.
		return new Scope({
			name: this.name,
			instructions: Scope.#intersect(this.instructions, config.instructions),
			tools: Scope.#intersect(this.tools, config.tools),
			files: Scope.#intersect(this.files, config.files),
		})
	}

	// Intersect two category lists under the "undefined = universal set (no constraint)"
	// rule: undefined ∩ undefined = undefined; undefined ∩ list = a copy of the list (the
	// undefined side imposes nothing); list ∩ list = the child keys that are also in the
	// parent (so narrowing can only TIGHTEN — a parent-excluded key never returns).
	static #intersect(
		parent: readonly string[] | undefined,
		child: readonly string[] | undefined,
	): readonly string[] | undefined {
		if (parent === undefined) return child === undefined ? undefined : [...child]
		if (child === undefined) return [...parent]
		const allowed = new Set(parent)
		return child.filter((key) => allowed.has(key))
	}
}
