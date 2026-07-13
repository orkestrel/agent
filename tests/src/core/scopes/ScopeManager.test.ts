import type { ScopeInterface } from '@src/core'
import { ScopeManager } from '@src/core'
import { describe, expect, it } from 'vitest'
import { createErrorRecorder, createRecorder, recordEmitterEvents } from '../../../setup.js'

// ScopeManager is the id-keyed registry of reusable named scopes (AGENTS §16 — real
// behavior, no mocks). Covers create (minting an id, always adding — never overwriting),
// scope/scopes lookup + insertion order, remove (single + batch §9.2) + clear + count,
// the create/remove/clear event emissions, and the emit-safety guarantee (a throwing
// listener can't corrupt a mutation + routes to the emitter's `error` handler, with no
// recursion) mirroring the Table / InstructionManager §13 convention.

// The ScopeManagerEventMap event names recorded across the emitter tests — fed to the
// shared `recordEmitterEvents` (AGENTS §16.1: the per-event wiring is centralized; this
// file keeps only the names its scenarios observe).
const SCOPE_EVENTS = ['create', 'remove', 'clear'] as const

describe('ScopeManager — create & lookup', () => {
	it('starts empty', () => {
		const manager = new ScopeManager()

		expect(manager.count).toBe(0)
		expect(manager.scopes()).toEqual([])
	})

	it('creates a scope with a minted id and the supplied lists', () => {
		const manager = new ScopeManager()
		const scope = manager.create({ name: 'reader', tools: ['search'] })

		expect(scope.id.length).toBeGreaterThan(0)
		expect(scope.name).toBe('reader')
		expect(scope.tools).toEqual(['search'])
		expect(manager.count).toBe(1)
		expect(manager.scope(scope.id)).toBe(scope)
	})

	it('returns undefined for an unknown id', () => {
		const manager = new ScopeManager()

		expect(manager.scope('missing')).toBeUndefined()
	})

	it('always adds — two scopes sharing a name coexist (never overwrites)', () => {
		const manager = new ScopeManager()
		const first = manager.create({ name: 'dupe', tools: ['a'] })
		const second = manager.create({ name: 'dupe', tools: ['b'] })

		expect(manager.count).toBe(2)
		expect(first.id).not.toBe(second.id)
		expect(manager.scope(first.id)).toBe(first)
		expect(manager.scope(second.id)).toBe(second)
	})

	it('lists scopes in insertion order', () => {
		const manager = new ScopeManager()
		const a = manager.create({ name: 'a' })
		const b = manager.create({ name: 'b' })
		const c = manager.create({ name: 'c' })

		expect(manager.scopes()).toEqual([a, b, c])
	})
})

describe('ScopeManager — remove & clear', () => {
	it('removes one by id and reports presence', () => {
		const manager = new ScopeManager()
		const scope = manager.create({ name: 'gone' })

		expect(manager.remove(scope.id)).toBe(true)
		expect(manager.remove(scope.id)).toBe(false)
		expect(manager.count).toBe(0)
	})

	it('removes a batch (§9.2) and returns true when any was removed', () => {
		const manager = new ScopeManager()
		const a = manager.create({ name: 'a' })
		const b = manager.create({ name: 'b' })
		manager.create({ name: 'c' })

		expect(manager.remove([a.id, 'missing', b.id])).toBe(true)
		expect(manager.count).toBe(1)
		expect(manager.remove(['nope', 'gone'])).toBe(false)
	})

	it('clears every scope', () => {
		const manager = new ScopeManager()
		manager.create({ name: 'a' })
		manager.create({ name: 'b' })

		manager.clear()

		expect(manager.count).toBe(0)
		expect(manager.scopes()).toEqual([])
	})
})

describe('ScopeManager — emitter (push observation surface §13)', () => {
	it('fires create on each created scope, in order', () => {
		const manager = new ScopeManager()
		const events = recordEmitterEvents(manager.emitter, SCOPE_EVENTS)
		const one = manager.create({ name: 'a' })
		const two = manager.create({ name: 'b' })

		expect(events.create.calls).toEqual([[one], [two]])
	})

	it('fires remove on a real removal; a miss emits nothing', () => {
		const manager = new ScopeManager()
		const scope = manager.create({ name: 'a' })
		const events = recordEmitterEvents(manager.emitter, SCOPE_EVENTS)

		expect(manager.remove(scope.id)).toBe(true)
		expect(manager.remove('missing')).toBe(false)
		expect(events.remove.calls).toEqual([[scope.id]])
	})

	it('fires one remove per actually-removed id on a batch', () => {
		const manager = new ScopeManager()
		const a = manager.create({ name: 'a' })
		const b = manager.create({ name: 'b' })
		const events = recordEmitterEvents(manager.emitter, SCOPE_EVENTS)

		manager.remove([a.id, 'missing', b.id])
		expect(events.remove.calls).toEqual([[a.id], [b.id]])
	})

	it('fires clear when emptied', () => {
		const manager = new ScopeManager()
		manager.create({ name: 'a' })
		const events = recordEmitterEvents(manager.emitter, SCOPE_EVENTS)

		manager.clear()
		expect(events.clear.calls).toEqual([[]])
	})

	it('wires initial listeners through the reserved on option', () => {
		const create = createRecorder<[scope: ScopeInterface]>()
		const manager = new ScopeManager({ create: create.handler })
		manager.create({ name: 'a' })

		expect(create.count).toBe(1)
		expect(create.calls[0]?.[0]?.name).toBe('a')
	})

	it('EMIT SAFETY: a throwing create listener cannot corrupt the registry, and routes to the error handler', () => {
		const errors = createErrorRecorder()
		const manager = new ScopeManager(undefined, errors.handler)
		manager.emitter.on('create', () => {
			throw new Error('create observer blew up')
		})

		const scope = manager.create({ name: 'a' })
		// THE LOAD-BEARING ASSERTION: the scope landed despite the throwing observer.
		expect(manager.scope(scope.id)).toBe(scope)
		expect(manager.count).toBe(1)
		// The error handler received (error, event) — note the arg order.
		expect(errors.calls).toEqual([[expect.any(Error), 'create']])
		// A subsequent create still works after the throw.
		manager.create({ name: 'b' })
		expect(manager.count).toBe(2)
	})

	it('EMIT SAFETY: a throwing error handler neither escapes nor recurses', () => {
		const errors = createErrorRecorder()
		const manager = new ScopeManager(undefined, (error, event) => {
			errors.handler(error, event)
			throw new Error('error handler blew up too')
		})
		manager.emitter.on('create', () => {
			throw new Error('create listener blew up')
		})

		// The create STILL lands — neither throw escaped.
		const scope = manager.create({ name: 'a' })
		expect(manager.scope(scope.id)).toBe(scope)
		// Fired exactly once (its own throw was swallowed, not re-entered — no recursion).
		expect(errors.count).toBe(1)
		expect(errors.calls[0]?.[1]).toBe('create')
	})
})
