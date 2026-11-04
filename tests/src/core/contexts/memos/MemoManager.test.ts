import type { MemoEventName } from '../../../../setup.js'
import type { Memo, MemoManagerEventMap } from '@src/core'
import {
	isContextError,
	isMemoSnapshot,
	MEMO_SECTION_HEADER,
	MemoManager,
	renderSection,
} from '@src/core'
import { describe, expect, it } from 'vitest'
import { captureError, createRecorder, createRecorders, roundTripJSON } from '@orkestrel/test'
import { MALFORMED_MEMO_SNAPSHOTS, MEMO_EVENTS, MEMO_REVISION } from '../../../../setup.js'

// MemoManager is the name-keyed memo set: one append-ordered list of revisions from which the
// current memos, each history, and the snapshot derive. Real behavior, no mocks.

describe('MemoManager — hydrate is exact', () => {
	it('refuses an unknown key, with the key in its faults', () => {
		const error = captureError(() =>
			Reflect.construct(MemoManager, [{ snapshot: { id: 'ada', memos: [], extra: 1 } }]),
		)
		expect(isContextError(error) && error.code).toBe('SNAPSHOT')
		expect(isContextError(error) && error.context?.faults).toEqual([
			{ reason: 'extra', path: ['extra'] },
		])
	})
})

describe('MemoManager — add & lookup', () => {
	it('starts empty with a minted id', () => {
		const manager = new MemoManager()

		expect(manager.id.length).toBeGreaterThan(0)
		expect(manager.count).toBe(0)
		expect(manager.memos()).toEqual([])
		expect(manager.snapshot()).toEqual({ id: manager.id, memos: [] })
	})

	it('mints a distinct id per manager and takes the id option', () => {
		expect(new MemoManager().id).not.toBe(new MemoManager().id)
		expect(new MemoManager({ id: 'ada' }).id).toBe('ada')
	})

	it('adds a revision with a minted id and time and the verbatim fields', () => {
		const manager = new MemoManager()
		const before = Date.now()
		const memo = manager.add({
			name: 'tone',
			description: 'Prefers short replies.',
			content: 'Answer in two sentences.',
		})
		const after = Date.now()

		expect(memo.id.length).toBeGreaterThan(0)
		expect(memo.name).toBe('tone')
		expect(memo.description).toBe('Prefers short replies.')
		expect(memo.content).toBe('Answer in two sentences.')
		expect(memo.time).toBeGreaterThanOrEqual(before)
		expect(memo.time).toBeLessThanOrEqual(after)
		expect('origin' in memo).toBe(false)
		expect(manager.memo('tone')).toBe(memo)
		expect(manager.count).toBe(1)
	})

	it('carries a supplied origin onto the revision', () => {
		const manager = new MemoManager()
		const memo = manager.add({
			name: 'tone',
			description: 'Prefers short replies.',
			content: 'Answer briefly.',
			origin: { conversation: 'c1', message: 'm4' },
		})

		expect(memo.origin).toEqual({ conversation: 'c1', message: 'm4' })
	})

	it('appends a revision when the content changes', () => {
		const manager = new MemoManager()
		const first = manager.add({
			name: 'tone',
			description: 'Prefers short replies.',
			content: 'v1',
		})
		const second = manager.add({
			name: 'tone',
			description: 'Prefers short replies.',
			content: 'v2',
		})

		expect(second).not.toBe(first)
		expect(second.id).not.toBe(first.id)
		expect(manager.memo('tone')).toBe(second)
		expect(manager.history('tone')).toEqual([first, second])
		expect(manager.count).toBe(1)
		expect(manager.memos()).toEqual([second])
	})

	it('appends a revision when the description alone changes', () => {
		const manager = new MemoManager()
		const first = manager.add({ name: 'tone', description: 'Short replies.', content: 'Same.' })
		const second = manager.add({ name: 'tone', description: 'Bullet lists.', content: 'Same.' })

		expect(manager.history('tone')).toEqual([first, second])
		expect(manager.memo('tone')?.description).toBe('Bullet lists.')
	})

	it('re-adding unchanged text is a no-op', () => {
		const manager = new MemoManager()
		const first = manager.add({
			name: 'tone',
			description: 'Prefers short replies.',
			content: 'Answer briefly.',
			origin: { conversation: 'c1' },
		})
		const events = createRecorders<MemoManagerEventMap, MemoEventName>(manager.emitter, MEMO_EVENTS)

		const again = manager.add({
			name: 'tone',
			description: 'Prefers short replies.',
			content: 'Answer briefly.',
		})
		const moved = manager.add({
			name: 'tone',
			description: 'Prefers short replies.',
			content: 'Answer briefly.',
			origin: { conversation: 'c2', message: 'm9' },
		})

		expect(again).toBe(first)
		expect(moved).toBe(first)
		expect(manager.history('tone')).toEqual([first])
		expect(events.add.count).toBe(0)
	})

	it('runs a batch in input order against the state each input left', () => {
		const manager = new MemoManager()
		const results = manager.add([
			{ name: 'tone', description: 'Short replies.', content: 'v1' },
			{ name: 'tone', description: 'Short replies.', content: 'v1' },
			{ name: 'tone', description: 'Short replies.', content: 'v2' },
			{ name: 'units', description: 'Uses metric units.', content: 'Write kilometers.' },
		])

		expect(results[1]).toBe(results[0])
		expect(results[2]).not.toBe(results[0])
		expect(manager.history('tone')).toEqual([results[0], results[2]])
		expect(manager.memos()).toEqual([results[2], results[3]])
	})

	it('returns undefined and an empty history for an unknown name', () => {
		const manager = new MemoManager()

		expect(manager.memo('missing')).toBeUndefined()
		expect(manager.history('missing')).toEqual([])
	})

	it('returns a fresh history array on each call', () => {
		const manager = new MemoManager()
		manager.add({ name: 'tone', description: 'Short replies.', content: 'v1' })

		expect(manager.history('tone')).not.toBe(manager.history('tone'))
		expect(manager.history('tone')).toEqual(manager.history('tone'))
	})

	it('orders current memos by each name first revision', () => {
		const manager = new MemoManager()
		manager.add({ name: 'tone', description: 'Short replies.', content: 'v1' })
		const units = manager.add({ name: 'units', description: 'Metric units.', content: 'km' })
		const tone = manager.add({ name: 'tone', description: 'Short replies.', content: 'v2' })

		expect(manager.memos()).toEqual([tone, units])
		expect(manager.count).toBe(2)
	})
})

describe('MemoManager — remove & clear', () => {
	it('remove forgets the whole history, and a re-add starts fresh at the end', () => {
		const manager = new MemoManager()
		manager.add({ name: 'tone', description: 'Short replies.', content: 'v1' })
		manager.add({ name: 'tone', description: 'Short replies.', content: 'v2' })
		const units = manager.add({ name: 'units', description: 'Metric units.', content: 'km' })

		expect(manager.remove('tone')).toBe(true)
		expect(manager.history('tone')).toEqual([])
		expect(manager.memo('tone')).toBeUndefined()
		expect(manager.count).toBe(1)
		expect(manager.snapshot().memos).toEqual([units])

		const fresh = manager.add({ name: 'tone', description: 'Short replies.', content: 'v1' })
		expect(manager.history('tone')).toEqual([fresh])
		expect(manager.memos()).toEqual([units, fresh])
	})

	it('reports a miss as false', () => {
		const manager = new MemoManager()

		expect(manager.remove('missing')).toBe(false)
	})

	it('removes a batch and returns true only when every supplied name was removed', () => {
		const manager = new MemoManager()
		manager.add([
			{ name: 'a', description: 'a', content: 'a' },
			{ name: 'b', description: 'b', content: 'b' },
			{ name: 'c', description: 'c', content: 'c' },
		])

		expect(manager.remove(['a', 'missing', 'b'])).toBe(false)
		expect(manager.memos().map((one) => one.name)).toEqual(['c'])
		expect(manager.remove(['c'])).toBe(true)
		expect(manager.count).toBe(0)
	})

	it('clears every memo and its history', () => {
		const manager = new MemoManager({ id: 'ada' })
		manager.add([
			{ name: 'a', description: 'a', content: 'a1' },
			{ name: 'a', description: 'a', content: 'a2' },
			{ name: 'b', description: 'b', content: 'b' },
		])

		manager.clear()

		expect(manager.count).toBe(0)
		expect(manager.memos()).toEqual([])
		expect(manager.history('a')).toEqual([])
		expect(manager.snapshot()).toEqual({ id: 'ada', memos: [] })
	})
})

describe('MemoManager — snapshot', () => {
	it('lists every revision oldest first across names, in a fresh array', () => {
		const manager = new MemoManager({ id: 'ada' })
		const toneOne = manager.add({ name: 'tone', description: 'Short replies.', content: 'v1' })
		const units = manager.add({ name: 'units', description: 'Metric units.', content: 'km' })
		const toneTwo = manager.add({ name: 'tone', description: 'Short replies.', content: 'v2' })

		const snapshot = manager.snapshot()

		expect(snapshot).toEqual({ id: 'ada', memos: [toneOne, units, toneTwo] })
		expect(snapshot.memos).not.toBe(manager.snapshot().memos)
		expect(isMemoSnapshot(snapshot)).toBe(true)
	})

	it('hydrates an equal manager directly and through a JSON round trip', () => {
		const source = new MemoManager({ id: 'ada' })
		source.add([
			{
				name: 'tone',
				description: 'Short replies.',
				content: 'v1',
				origin: { conversation: 'c1' },
			},
			{ name: 'units', description: 'Metric units.', content: 'km' },
			{ name: 'tone', description: 'Short replies.', content: 'v2' },
		])
		const snapshot = source.snapshot()

		const direct = new MemoManager({ snapshot })
		const parsed = new MemoManager({ snapshot: roundTripJSON(snapshot) })

		for (const restored of [direct, parsed]) {
			expect(restored.id).toBe('ada')
			expect(restored.snapshot()).toEqual(snapshot)
			expect(restored.memos()).toEqual(source.memos())
			expect(restored.history('tone')).toEqual(source.history('tone'))
			expect(restored.count).toBe(2)
		}
	})

	it('lets a snapshot id win over the id option', () => {
		const manager = new MemoManager({ id: 'option', snapshot: { id: 'stored', memos: [] } })

		expect(manager.id).toBe('stored')
	})

	it('hydrates silently, and an unchanged re-add stays a no-op', () => {
		const source = new MemoManager()
		const memo = source.add({ name: 'tone', description: 'Short replies.', content: 'v1' })
		const add = createRecorder<[memo: Memo]>()

		const restored = new MemoManager({ snapshot: source.snapshot(), on: { add: add.handler } })

		expect(add.count).toBe(0)
		expect(restored.add({ name: 'tone', description: 'Short replies.', content: 'v1' })).toEqual(
			memo,
		)
		expect(add.count).toBe(0)
	})

	it('copies the snapshot list, so a later change to it cannot leak in', () => {
		const source = new MemoManager()
		source.add({ name: 'tone', description: 'Short replies.', content: 'v1' })
		const memos = [...source.snapshot().memos]
		const restored = new MemoManager({ snapshot: { id: 'ada', memos } })

		memos.pop()

		expect(restored.count).toBe(1)
	})
})

describe('MemoManager — format cascade', () => {
	it('uses the built-in open, render, and close', () => {
		const manager = new MemoManager()
		const memo = manager.add({ name: 'tone', description: 'Prefers short replies.', content: 'x' })

		expect(manager.open).toBe('## Memos')
		expect(manager.open).toBe(MEMO_SECTION_HEADER)
		expect(manager.render(memo)).toBe('- tone: Prefers short replies.')
		expect(manager.close).toBeUndefined()
	})

	it('overrides open alone', () => {
		const manager = new MemoManager({ format: { open: '<memos>' } })
		const memo = manager.add({ name: 'tone', description: 'Prefers short replies.', content: 'x' })

		expect(manager.open).toBe('<memos>')
		expect(manager.render(memo)).toBe('- tone: Prefers short replies.')
		expect(manager.close).toBeUndefined()
	})

	it('overrides render alone', () => {
		const manager = new MemoManager({ format: { render: (one) => `* ${one.content}` } })
		const memo = manager.add({ name: 'tone', description: 'Prefers short replies.', content: 'x' })

		expect(manager.open).toBe('## Memos')
		expect(manager.render(memo)).toBe('* x')
		expect(manager.close).toBeUndefined()
	})

	it('overrides close alone', () => {
		const manager = new MemoManager({ format: { close: '</memos>' } })
		const memo = manager.add({ name: 'tone', description: 'Prefers short replies.', content: 'x' })

		expect(manager.open).toBe('## Memos')
		expect(manager.render(memo)).toBe('- tone: Prefers short replies.')
		expect(manager.close).toBe('</memos>')
	})

	it('renders one memo section through renderSection', () => {
		const manager = new MemoManager()
		manager.add({ name: 'tone', description: 'Prefers short replies.', content: 'x' })

		expect(
			renderSection(manager.open, manager.memos(), (one) => manager.render(one), manager.close),
		).toBe('## Memos\n\n- tone: Prefers short replies.')
	})
})

describe('MemoManager — emitter', () => {
	it('fires add on each appended revision (single + batch), in order', () => {
		const manager = new MemoManager()
		const events = createRecorders<MemoManagerEventMap, MemoEventName>(manager.emitter, MEMO_EVENTS)
		const one = manager.add({ name: 'a', description: 'a', content: 'a' })
		const [two, three] = manager.add([
			{ name: 'b', description: 'b', content: 'b' },
			{ name: 'a', description: 'a', content: 'a2' },
		])

		expect(events.add.calls).toEqual([[one], [two], [three]])
	})

	it('fires remove once per removed name, a miss emits nothing', () => {
		const manager = new MemoManager()
		manager.add([
			{ name: 'a', description: 'a', content: 'a1' },
			{ name: 'a', description: 'a', content: 'a2' },
			{ name: 'b', description: 'b', content: 'b' },
		])
		const events = createRecorders<MemoManagerEventMap, MemoEventName>(manager.emitter, MEMO_EVENTS)

		expect(manager.remove('a')).toBe(true)
		expect(manager.remove('missing')).toBe(false)
		manager.remove(['b', 'missing'])

		expect(events.remove.calls).toEqual([['a'], ['b']])
	})

	it('fires clear when emptied', () => {
		const manager = new MemoManager()
		manager.add({ name: 'a', description: 'a', content: 'a' })
		const events = createRecorders<MemoManagerEventMap, MemoEventName>(manager.emitter, MEMO_EVENTS)

		manager.clear()

		expect(events.clear.calls).toEqual([[]])
	})

	it('wires initial listeners through the reserved on option', () => {
		const add = createRecorder<[memo: Memo]>()
		const manager = new MemoManager({ on: { add: add.handler } })
		const memo = manager.add({ name: 'a', description: 'a', content: 'a' })

		expect(add.calls).toEqual([[memo]])
	})

	it('routes a throwing add listener to the error handler with the revision applied', () => {
		const errors = createRecorder<readonly [error: unknown, event: string]>()
		const manager = new MemoManager({ error: errors.handler })
		manager.emitter.on('add', () => {
			throw new Error('the add observer failed')
		})

		const memo = manager.add({ name: 'a', description: 'a', content: 'a' })

		expect(manager.memo('a')).toBe(memo)
		expect(errors.calls).toEqual([[expect.any(Error), 'add']])
		manager.add({ name: 'b', description: 'b', content: 'b' })
		expect(manager.count).toBe(2)
	})

	it('swallows a throwing error handler without recursion', () => {
		const errors = createRecorder<readonly [error: unknown, event: string]>()
		const manager = new MemoManager({
			error: (error, event) => {
				errors.handler(error, event)
				throw new Error('the error handler failed')
			},
		})
		manager.emitter.on('add', () => {
			throw new Error('the add listener failed')
		})

		manager.add({ name: 'a', description: 'a', content: 'a' })

		expect(manager.memo('a')?.content).toBe('a')
		expect(errors.count).toBe(1)
		expect(errors.calls[0]?.[1]).toBe('add')
	})
})

describe('MemoManager — foreign snapshot', () => {
	it.each(MALFORMED_MEMO_SNAPSHOTS)('refuses %s and emits nothing', async (_label, snapshot) => {
		const add = createRecorder<readonly [memo: Memo]>()
		const clear = createRecorder<readonly []>()

		// A foreign value is untyped on arrival, so the construct goes through Reflect.
		await expect(
			Promise.resolve().then(() =>
				Reflect.construct(MemoManager, [
					{ snapshot, on: { add: add.handler, clear: clear.handler } },
				]),
			),
		).rejects.toSatisfy((error) => isContextError(error) && error.code === 'SNAPSHOT')
		expect(add.count).toBe(0)
		expect(clear.count).toBe(0)
	})

	it('hints snapshot() on a SNAPSHOT refusal', () => {
		const messages = MALFORMED_MEMO_SNAPSHOTS.map(([, snapshot]) => {
			// A foreign value is untyped on arrival, so the construct goes through Reflect.
			const error = captureError(() => Reflect.construct(MemoManager, [{ snapshot }]))

			return isContextError(error) && error.message.split('\n')[0]
		})

		expect(messages).toEqual(
			MALFORMED_MEMO_SNAPSHOTS.map(
				() => 'context error: memo snapshot is malformed; pass what snapshot() returned',
			),
		)
	})

	it('owns a passed snapshot: mutating its revision or origin later changes nothing', () => {
		const revision: Omit<Memo, 'content' | 'origin'> & {
			content: string
			origin: { conversation: string; message: string }
		} = {
			...MEMO_REVISION,
			origin: { conversation: 'c1', message: 'x' },
		}
		const passed: { readonly id: string; readonly memos: Memo[] } = { id: 'ada', memos: [revision] }
		const manager = new MemoManager({ snapshot: passed })

		revision.content = 'changed'
		revision.origin.conversation = 'other'
		passed.memos.push({ ...MEMO_REVISION, id: 'm2', name: 'extra' })

		expect(manager.memo('tone')?.content).toBe('Answer briefly.')
		expect(manager.memo('tone')?.origin).toEqual({ conversation: 'c1', message: 'x' })
		expect(manager.history('tone')).toHaveLength(1)
		expect(manager.count).toBe(1)
		expect(manager.snapshot().memos[0]?.origin).toEqual({ conversation: 'c1', message: 'x' })
	})

	it('returns an owned snapshot: mutating it reaches nothing in the manager', () => {
		const manager = new MemoManager({
			snapshot: { id: 'ada', memos: [{ ...MEMO_REVISION, origin: { conversation: 'c1' } }] },
		})
		const returned = manager.snapshot()
		const first = returned.memos[0]
		if (first === undefined) throw new Error('the snapshot lost its revision')

		Object.assign(first, { content: 'changed' })
		Object.assign(first.origin ?? {}, { conversation: 'other' })
		Reflect.apply(Array.prototype.push, returned.memos, [
			{ ...MEMO_REVISION, id: 'm2', name: 'extra' },
		])

		expect(manager.memo('tone')?.content).toBe('Answer briefly.')
		expect(manager.memo('tone')?.origin).toEqual({ conversation: 'c1' })
		expect(manager.count).toBe(1)
		expect(manager.snapshot().memos).toEqual([{ ...MEMO_REVISION, origin: { conversation: 'c1' } }])
	})
})
