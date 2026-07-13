import { Scope } from '@src/core'
import { describe, expect, it } from 'vitest'

// Scope is the named, immutable allow-list filter over a context's items (AGENTS §16 —
// real behavior, no mocks). Covers construction (a minted id + the three per-category
// lists, copied in), and narrow's set-INTERSECTION semantics under the "undefined =
// universal set (no constraint)" rule: undefined ∩ undefined = undefined, undefined ∩
// list = the list, list ∩ list = the intersection, [] ⇒ none — narrowing only tightens.

describe('Scope — construction', () => {
	it('mints an id and a name, with every list undefined when omitted', () => {
		const scope = new Scope({ name: 'open' })

		expect(scope.id.length).toBeGreaterThan(0)
		expect(scope.name).toBe('open')
		expect(scope.instructions).toBeUndefined()
		expect(scope.tools).toBeUndefined()
		expect(scope.files).toBeUndefined()
	})

	it('carries the three per-category allow-lists verbatim', () => {
		const scope = new Scope({
			name: 'full',
			instructions: ['safety'],
			tools: ['search', 'read'],
			files: ['src/main.ts', 'icon.png'],
		})

		expect(scope.instructions).toEqual(['safety'])
		expect(scope.tools).toEqual(['search', 'read'])
		expect(scope.files).toEqual(['src/main.ts', 'icon.png'])
	})

	it('mints a distinct id per scope', () => {
		const a = new Scope({ name: 'x' })
		const b = new Scope({ name: 'x' })

		expect(a.id).not.toBe(b.id)
	})

	it('copies each supplied list in — a later mutation of the caller array cannot leak in', () => {
		const tools = ['search']
		const scope = new Scope({ name: 'r', tools })
		tools.push('write')

		expect(scope.tools).toEqual(['search'])
	})

	it('distinguishes an empty list ([] ⇒ none) from an omitted one (undefined ⇒ all)', () => {
		const scope = new Scope({ name: 'none-tools', tools: [] })

		expect(scope.tools).toEqual([])
		expect(scope.instructions).toBeUndefined()
	})
})

describe('Scope — narrow (set-intersection)', () => {
	it('intersects list ∩ list to the keys present in BOTH', () => {
		const parent = new Scope({ name: 'p', tools: ['a', 'b', 'c'] })

		const child = parent.narrow({ tools: ['b', 'c', 'd'] })

		expect(child.tools).toEqual(['b', 'c'])
	})

	it('passes the child list through when the parent imposes no constraint (undefined ∩ list = list)', () => {
		const parent = new Scope({ name: 'p' }) // instructions undefined ⇒ no constraint

		const child = parent.narrow({ instructions: ['safety'] })

		expect(child.instructions).toEqual(['safety'])
	})

	it('keeps the parent list when the child imposes no constraint (list ∩ undefined = list)', () => {
		const parent = new Scope({ name: 'p', tools: ['a', 'b'] })

		const child = parent.narrow({}) // tools omitted ⇒ no further constraint

		expect(child.tools).toEqual(['a', 'b'])
	})

	it('stays undefined when neither side constrains (undefined ∩ undefined = undefined)', () => {
		const parent = new Scope({ name: 'p' })

		const child = parent.narrow({})

		expect(child.tools).toBeUndefined()
		expect(child.instructions).toBeUndefined()
	})

	it('admits NOTHING when the child list is empty ([] ⇒ none)', () => {
		const parent = new Scope({ name: 'p', tools: ['a', 'b'] })

		expect(parent.narrow({ tools: [] }).tools).toEqual([])
	})

	it('admits NOTHING when the parent list is empty (∅ ∩ anything = ∅)', () => {
		const parent = new Scope({ name: 'p', tools: [] })

		expect(parent.narrow({ tools: ['a'] }).tools).toEqual([])
	})

	it('can only TIGHTEN — a parent-excluded key never returns through narrowing', () => {
		const parent = new Scope({ name: 'p', tools: ['a'] })

		// 'b' was never in the parent, so it cannot be re-admitted by a child.
		expect(parent.narrow({ tools: ['a', 'b'] }).tools).toEqual(['a'])
	})

	it('narrows every category independently in one call', () => {
		const parent = new Scope({
			name: 'p',
			instructions: ['i1', 'i2'],
			files: ['f1', 'f2'],
			// `tools` omitted ⇒ no parent constraint (the undefined ∩ list case below).
		})

		const child = parent.narrow({
			instructions: ['i2', 'i3'],
			tools: ['t1'],
			files: [],
		})

		expect(child.instructions).toEqual(['i2']) // list ∩ list
		expect(child.files).toEqual([]) // [] ⇒ none
		expect(child.tools).toEqual(['t1']) // undefined ∩ list = list
	})

	it('returns a NEW scope, leaving the parent unchanged (immutable)', () => {
		const parent = new Scope({ name: 'p', tools: ['a', 'b'] })

		const child = parent.narrow({ tools: ['a'] })

		expect(child).not.toBe(parent)
		expect(parent.tools).toEqual(['a', 'b']) // the parent is untouched
		expect(child.id).not.toBe(parent.id)
	})

	it('keeps the scope’s name across a narrow', () => {
		const parent = new Scope({ name: 'reader', tools: ['a'] })

		expect(parent.narrow({ tools: ['a'] }).name).toBe('reader')
	})

	it('composes across repeated narrows (intersection chains)', () => {
		const scope = new Scope({ name: 'p', tools: ['a', 'b', 'c', 'd'] })

		const narrowed = scope.narrow({ tools: ['a', 'b', 'c'] }).narrow({ tools: ['b', 'c', 'e'] })

		expect(narrowed.tools).toEqual(['b', 'c'])
	})
})
