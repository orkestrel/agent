import { createMemoManager, MemoryMemoStore } from '@src/core'
import { requireValue, roundTripJSON } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import { buildMemoSnapshot } from '../../../../setup.js'

describe('MemoryMemoStore', () => {
	it('restores a manager from a stored set', async () => {
		const store = new MemoryMemoStore()
		const stored = buildMemoSnapshot(4, 'ada')
		await store.set(stored)

		const restored = createMemoManager({
			snapshot: requireValue(await store.get('ada'), 'the stored memo set'),
		})

		expect(restored.count).toBe(2)
		expect(restored.history('topic-1')).toEqual(
			stored.memos.filter((memo) => memo.name === 'topic-1'),
		)
	})

	it('holds a set that survives JSON', async () => {
		const store = new MemoryMemoStore()
		await store.set(buildMemoSnapshot(4, 'ada'))

		const stored = requireValue(await store.get('ada'), 'the stored memo set')

		expect(stored).toEqual(roundTripJSON(stored))
	})

	it('returns the object it was given', async () => {
		const store = new MemoryMemoStore()
		const stored = buildMemoSnapshot(2, 'ada')
		await store.set(stored)

		expect(await store.get('ada')).toBe(stored)
	})
})
