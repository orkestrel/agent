import type { ScopeFilter, ScopeInput, ScopeInterface } from '../types.js'
import { intersectKeys } from '../helpers.js'

/**
 * Represents a named, immutable filter over a richer context's items — an optional allow-list per
 * category (`instructions` / `tools` / `files`), each keyed by that category's identity (an
 * instruction's `name`, a tool's `name`, a workspace file's `path`) and read as an allow-list:
 * `undefined` lets everything pass, `[]` lets nothing pass, and a non-empty list passes the listed
 * keys alone. `narrow` composes a tighter child by set intersection.
 *
 * @remarks
 * - **A category list is three-way.** `undefined` ⇒ no constraint on that category (all
 *   pass); `[]` ⇒ none pass; a non-empty list ⇒ only the listed keys pass. The build
 *   step / loop apply this through `filterAllowList`.
 * - **Immutable.** The `id` is minted at construction; every supplied list is copied in
 *   (so a later mutation of the caller's array can't leak in), and the lists are
 *   `readonly`. A `Scope` is never mutated after construction — `narrow` returns a new
 *   one rather than altering this one.
 * - **`narrow` is set-intersection (immutable composition).** A child scope's visible set
 *   per category is the intersection of this scope's list and the config's list — but
 *   `undefined` means "no constraint", so it acts as the universal set: intersecting
 *   `undefined` with a list yields the list, and `undefined` with `undefined` stays
 *   `undefined`. Narrowing can only tighten, never widen — a key excluded by a parent
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
	readonly instructions?: readonly string[]
	readonly tools?: readonly string[]
	readonly files?: readonly string[]

	constructor(input: ScopeInput) {
		this.name = input.name
		// Copy each supplied list in (a later mutation of the caller's array can't leak in);
		// an omitted list stays `undefined` — the "no constraint" sentinel.
		if (input.instructions !== undefined) this.instructions = [...input.instructions]
		if (input.tools !== undefined) this.tools = [...input.tools]
		if (input.files !== undefined) this.files = [...input.files]
	}

	narrow(config: ScopeFilter): ScopeInterface {
		// A child = the per-category set-intersection of this scope and the config, keeping
		// this scope's name. Immutable: a brand-new Scope, this one untouched.
		const instructions = intersectKeys(this.instructions, config.instructions)
		const tools = intersectKeys(this.tools, config.tools)
		const files = intersectKeys(this.files, config.files)
		return new Scope({
			name: this.name,
			...(instructions === undefined ? {} : { instructions }),
			...(tools === undefined ? {} : { tools }),
			...(files === undefined ? {} : { files }),
		})
	}
}
