import type { ContextSectionFormat, InstructionInterface } from '@src/core'
import { InstructionManager } from '@src/core'
import { describe, expect, it } from 'vitest'
import { createErrorRecorder, createRecorder, recordEmitterEvents } from '../../../../setup.js'

// InstructionManager is the name-keyed instruction registry a richer context renders a
// directives block from (AGENTS §16 — real behavior, no mocks). Covers add (single +
// batch §9.2) minting ids, last-write-wins overwrite by name, instruction/instructions
// lookup with descending-priority (stable) ordering, format/description build contract,
// remove (single + batch) + clear + count, the add/remove/clear event emissions, and the
// emit-safety guarantee (a throwing listener can't corrupt a mutation + routes to the
// emitter's `error` handler, with no recursion) mirroring Table's §13 convention.

// The InstructionManagerEventMap event names recorded across the emitter tests — fed to
// the shared `recordEmitterEvents` (AGENTS §16.1: the per-event wiring is centralized;
// this file keeps only the names its scenarios observe).
const INSTRUCTION_EVENTS = ['add', 'remove', 'clear'] as const

describe('InstructionManager — add & lookup', () => {
	it('starts empty', () => {
		const manager = new InstructionManager()

		expect(manager.count).toBe(0)
		expect(manager.instructions()).toEqual([])
	})

	it('adds a single instruction with a minted id and verbatim fields', () => {
		const manager = new InstructionManager()
		const instruction = manager.add({ name: 'tone', content: 'Be concise.', priority: 3 })

		expect(instruction.id.length).toBeGreaterThan(0)
		expect(instruction.name).toBe('tone')
		expect(instruction.content).toBe('Be concise.')
		expect(instruction.priority).toBe(3)
		expect(manager.count).toBe(1)
		expect(manager.instruction('tone')).toBe(instruction)
	})

	it('adds a batch (§9.2) and returns the created instructions in order', () => {
		const manager = new InstructionManager()
		const created = manager.add([
			{ name: 'a', content: 'one' },
			{ name: 'b', content: 'two' },
		])

		expect(created.map((one) => one.name)).toEqual(['a', 'b'])
		expect(new Set(created.map((one) => one.id)).size).toBe(2)
		expect(manager.count).toBe(2)
	})

	it('returns undefined for an unknown name', () => {
		const manager = new InstructionManager()

		expect(manager.instruction('missing')).toBeUndefined()
	})

	it('overwrites a same-name instruction (last write wins)', () => {
		const manager = new InstructionManager()
		const first = manager.add({ name: 'tone', content: 'v1' })
		const second = manager.add({ name: 'tone', content: 'v2' })

		expect(manager.count).toBe(1)
		expect(manager.instruction('tone')).toBe(second)
		expect(manager.instruction('tone')).not.toBe(first)
		expect(manager.instruction('tone')?.content).toBe('v2')
	})
})

describe('InstructionManager — ordering', () => {
	it('lists instructions by descending priority', () => {
		const manager = new InstructionManager()
		manager.add({ name: 'low', content: 'a', priority: 1 })
		manager.add({ name: 'high', content: 'b', priority: 10 })
		manager.add({ name: 'mid', content: 'c', priority: 5 })

		expect(manager.instructions().map((one) => one.name)).toEqual(['high', 'mid', 'low'])
	})

	it('is stable for equal priorities (keeps insertion order)', () => {
		const manager = new InstructionManager()
		manager.add([
			{ name: 'first', content: 'a', priority: 5 },
			{ name: 'second', content: 'b', priority: 5 },
			{ name: 'third', content: 'c', priority: 5 },
		])

		expect(manager.instructions().map((one) => one.name)).toEqual(['first', 'second', 'third'])
	})

	it('treats an omitted priority as 0 in the ordering', () => {
		const manager = new InstructionManager()
		manager.add({ name: 'default', content: 'a' }) // priority 0
		manager.add({ name: 'boosted', content: 'b', priority: 2 })
		manager.add({ name: 'sunk', content: 'c', priority: -1 })

		expect(manager.instructions().map((one) => one.name)).toEqual(['boosted', 'default', 'sunk'])
	})
})

describe('InstructionManager — build contract', () => {
	it('format renders the instruction content', () => {
		const manager = new InstructionManager()
		const instruction = manager.add({ name: 'tone', content: 'Be concise.' })

		expect(manager.format(instruction)).toBe('Be concise.')
	})

	it('description is a stable section header', () => {
		const manager = new InstructionManager()

		expect(manager.description).toBe('## Instructions')
	})
})

describe('InstructionManager — manager-options format override', () => {
	it('description / format consult the options override when set, else built-in', () => {
		const format: ContextSectionFormat<InstructionInterface> = {
			open: '<<rules>>',
			render: (one) => `- ${one.content}`,
		}
		const manager = new InstructionManager({ format })
		const one = manager.add({ name: 'tone', content: 'Be terse.' })

		// The override wins over the built-in for BOTH the header and the per-item render.
		expect(manager.description).toBe('<<rules>>')
		expect(manager.format(one)).toBe('- Be terse.')
		// A manager with NO override keeps the built-ins.
		const plain = new InstructionManager()
		const two = plain.add({ name: 'tone', content: 'Be terse.' })
		expect(plain.description).toBe('## Instructions')
		expect(plain.format(two)).toBe('Be terse.')
	})

	it('a partial override falls back per-member to the built-in', () => {
		// Only `render` overridden ⇒ the header is still the built-in; only the rendering changes.
		const manager = new InstructionManager({ format: { render: (one) => `* ${one.content}` } })
		const one = manager.add({ name: 'tone', content: 'Be terse.' })

		expect(manager.description).toBe('## Instructions')
		expect(manager.format(one)).toBe('* Be terse.')
	})

	it('exposes the raw override via framing (undefined when none)', () => {
		const format: ContextSectionFormat<InstructionInterface> = { open: 'X' }
		expect(new InstructionManager({ format }).framing).toBe(format)
		expect(new InstructionManager().framing).toBeUndefined()
	})

	it('round-trips a per-item format override through add (present-when-given)', () => {
		const manager = new InstructionManager()
		const withFormat = manager.add({ name: 'a', content: 'plain', format: 'RENDERED' })
		const without = manager.add({ name: 'b', content: 'plain' })

		// The per-item override is carried on the stored instruction when given …
		expect(withFormat.format).toBe('RENDERED')
		expect(manager.instruction('a')?.format).toBe('RENDERED')
		// … and `undefined` when absent — so it serializes AWAY (no `format` key survives a
		// JSON round-trip), the present-when-given contract like a message's `images`.
		expect(without.format).toBeUndefined()
		expect('format' in JSON.parse(JSON.stringify(without))).toBe(false)
	})
})

describe('InstructionManager — remove & clear', () => {
	it('removes one by name and reports presence', () => {
		const manager = new InstructionManager()
		manager.add({ name: 'gone', content: 'x' })

		expect(manager.remove('gone')).toBe(true)
		expect(manager.remove('gone')).toBe(false)
		expect(manager.count).toBe(0)
	})

	it('removes a batch (§9.2) and returns true when any was removed', () => {
		const manager = new InstructionManager()
		manager.add([
			{ name: 'a', content: 'a' },
			{ name: 'b', content: 'b' },
			{ name: 'c', content: 'c' },
		])

		expect(manager.remove(['a', 'missing', 'b'])).toBe(true)
		expect(manager.count).toBe(1)
		expect(manager.instruction('c')?.content).toBe('c')
		expect(manager.remove(['nope', 'gone'])).toBe(false)
	})

	it('clears every instruction', () => {
		const manager = new InstructionManager()
		manager.add([
			{ name: 'a', content: 'a' },
			{ name: 'b', content: 'b' },
		])

		manager.clear()

		expect(manager.count).toBe(0)
		expect(manager.instructions()).toEqual([])
	})
})

describe('InstructionManager — emitter (push observation surface §13)', () => {
	it('fires add on each created instruction (single + batch), in order', () => {
		const manager = new InstructionManager()
		const events = recordEmitterEvents(manager.emitter, INSTRUCTION_EVENTS)
		const one = manager.add({ name: 'a', content: 'a' })
		const [two, three] = manager.add([
			{ name: 'b', content: 'b' },
			{ name: 'c', content: 'c' },
		])

		expect(events.add.calls).toEqual([[one], [two], [three]])
	})

	it('fires add again on an overwrite (last write wins)', () => {
		const manager = new InstructionManager()
		const events = recordEmitterEvents(manager.emitter, INSTRUCTION_EVENTS)
		manager.add({ name: 'tone', content: 'v1' })
		manager.add({ name: 'tone', content: 'v2' })

		expect(events.add.count).toBe(2)
		expect(events.add.calls[1]?.[0]?.content).toBe('v2')
	})

	it('fires remove on a real removal; a miss emits nothing', () => {
		const manager = new InstructionManager()
		manager.add({ name: 'a', content: 'a' })
		const events = recordEmitterEvents(manager.emitter, INSTRUCTION_EVENTS)

		expect(manager.remove('a')).toBe(true)
		expect(manager.remove('missing')).toBe(false)
		expect(events.remove.calls).toEqual([['a']])
	})

	it('fires one remove per actually-removed key on a batch', () => {
		const manager = new InstructionManager()
		manager.add([
			{ name: 'a', content: 'a' },
			{ name: 'b', content: 'b' },
		])
		const events = recordEmitterEvents(manager.emitter, INSTRUCTION_EVENTS)

		manager.remove(['a', 'missing', 'b'])
		expect(events.remove.calls).toEqual([['a'], ['b']])
	})

	it('fires clear when emptied', () => {
		const manager = new InstructionManager()
		manager.add({ name: 'a', content: 'a' })
		const events = recordEmitterEvents(manager.emitter, INSTRUCTION_EVENTS)

		manager.clear()
		expect(events.clear.calls).toEqual([[]])
	})

	it('wires initial listeners through the reserved on option', () => {
		const add = createRecorder<[instruction: InstructionInterface]>()
		const manager = new InstructionManager({ on: { add: add.handler } })
		manager.add({ name: 'a', content: 'a' })

		expect(add.count).toBe(1)
		expect(add.calls[0]?.[0]?.name).toBe('a')
	})

	it('EMIT SAFETY: a throwing add listener cannot corrupt the registry, and routes to the error handler', () => {
		const errors = createErrorRecorder()
		const manager = new InstructionManager({ error: errors.handler })
		manager.emitter.on('add', () => {
			throw new Error('add observer blew up')
		})

		const instruction = manager.add({ name: 'a', content: 'a' })
		// THE LOAD-BEARING ASSERTION: the instruction landed despite the throwing observer.
		expect(manager.instruction('a')).toBe(instruction)
		expect(manager.count).toBe(1)
		// The error handler received (error, event) — note the arg order.
		expect(errors.calls).toEqual([[expect.any(Error), 'add']])
		// A subsequent add still works after the throw.
		manager.add({ name: 'b', content: 'b' })
		expect(manager.count).toBe(2)
	})

	it('EMIT SAFETY: a throwing error handler neither escapes nor recurses', () => {
		const errors = createErrorRecorder()
		const manager = new InstructionManager({
			error: (error, event) => {
				errors.handler(error, event)
				throw new Error('error handler blew up too')
			},
		})
		manager.emitter.on('add', () => {
			throw new Error('add listener blew up')
		})

		// The add STILL lands — neither throw escaped.
		manager.add({ name: 'a', content: 'a' })
		expect(manager.instruction('a')?.content).toBe('a')
		// Fired exactly once (its own throw was swallowed, not re-entered — no recursion).
		expect(errors.count).toBe(1)
		expect(errors.calls[0]?.[1]).toBe('add')
	})
})
