import { isContextError } from '@src/core'
import { createDatabaseConversationStore, createDatabaseMemoStore } from '@src/core'
import { createMemoryDriver } from '@orkestrel/database'
import { describe, expect, it } from 'vitest'
import {
	buildConversationSnapshot,
	buildMemoSnapshot,
	MALFORMED_MEMO_SNAPSHOTS,
	NESTED_JSON,
	plantSnapshotRow,
} from '../../../../setup.js'

describe('DatabaseMemoStore', () => {
	it('refuses each malformed row, and reads its neighbour', async () => {
		const control = buildMemoSnapshot(2, 'c')
		const rows = MALFORMED_MEMO_SNAPSHOTS.filter(
			([label]) => label !== 'a snapshot JSON cannot copy',
		)

		const reads = await Promise.all(
			rows.map(async ([, snapshot]) => {
				const driver = createMemoryDriver()
				await plantSnapshotRow(driver, 'memos', { id: 'ada', snapshot })
				await plantSnapshotRow(driver, 'memos', { id: 'c', snapshot: control })
				const store = createDatabaseMemoStore(driver)
				const malformed = await store.get('ada').catch((error: unknown) => error)
				return {
					malformed: isContextError(malformed) && malformed.code,
					control: await store.get('c'),
				}
			}),
		)

		expect(reads).toEqual(rows.map(() => ({ malformed: 'SNAPSHOT', control })))
	})

	it('refuses a foreign-id row, and an absent row stays absent', async () => {
		const driver = createMemoryDriver()
		const control = buildMemoSnapshot(2, 'c')
		await plantSnapshotRow(driver, 'memos', { id: 'a', snapshot: buildMemoSnapshot(2, 'b') })
		await plantSnapshotRow(driver, 'memos', { id: 'c', snapshot: control })
		const store = createDatabaseMemoStore(driver)

		await expect(store.get('a')).rejects.toSatisfy(
			(error: unknown) => isContextError(error) && error.code === 'SNAPSHOT',
		)
		expect(await store.get('b')).toBeUndefined()
		expect(await store.get('c')).toEqual(control)
	})

	it('keeps one id apart from conversations', async () => {
		const driver = createMemoryDriver()
		const memos = buildMemoSnapshot(2, 'shared')
		const conversation = await buildConversationSnapshot('shared')
		await createDatabaseMemoStore(driver).set(memos)
		await createDatabaseConversationStore(driver).set(conversation)

		expect(await createDatabaseMemoStore(driver).get('shared')).toEqual(memos)
		expect(await createDatabaseConversationStore(driver).get('shared')).toEqual(conversation)

		await createDatabaseMemoStore(driver).delete('shared')

		expect(await createDatabaseMemoStore(driver).get('shared')).toBeUndefined()
		expect(await createDatabaseConversationStore(driver).get('shared')).toEqual(conversation)
	})

	it('reads a copy of the stored set', async () => {
		const store = createDatabaseMemoStore(createMemoryDriver())
		const stored = buildMemoSnapshot(2, 'ada')
		await store.set(stored)

		const read = await store.get('ada')

		expect(read).toEqual(stored)
		expect(read).not.toBe(stored)
	})
})

describe('DatabaseMemoStore — a present row that fails the guard throws', () => {
	it('names the id, the key, and store.delete', async () => {
		const driver = createMemoryDriver()
		await plantSnapshotRow(driver, 'memos', {
			id: 'ada',
			snapshot: { id: 'ada', memos: [], extra: 1 },
		})
		const store = createDatabaseMemoStore(driver)
		const error = await store.get('ada').catch((caught: unknown) => caught)
		expect(isContextError(error) && error.code).toBe('SNAPSHOT')
		const message = isContextError(error) ? error.message : ''
		expect(message).toContain('"ada"')
		expect(message).toContain('"extra"')
		expect(message).toContain('store.delete("ada")')
		expect(isContextError(error) && error.context?.faults).toEqual([
			{ reason: 'extra', path: ['extra'] },
		])
	})

	it('throws on a row that names another id', async () => {
		const driver = createMemoryDriver()
		await plantSnapshotRow(driver, 'memos', { id: 'ada', snapshot: { id: 'grace', memos: [] } })
		const store = createDatabaseMemoStore(driver)
		const error = await store.get('ada').catch((caught: unknown) => caught)
		expect(isContextError(error) && error.code).toBe('SNAPSHOT')
	})

	it('writes nothing for a malformed snapshot', async () => {
		const store = createDatabaseMemoStore(createMemoryDriver())
		const error = await Reflect.apply(store.set, store, [{ id: 'ada', memos: 'nope' }]).catch(
			(caught: unknown) => caught,
		)
		expect(isContextError(error) && error.code).toBe('SNAPSHOT')
		expect(await store.get('ada')).toBeUndefined()
	})

	it('stores a row whose snapshot nests arbitrary keys, arrays, and nulls, refuses it on read, and writes its neighbour', async () => {
		const driver = createMemoryDriver()
		await plantSnapshotRow(driver, 'memos', {
			id: 'ada',
			snapshot: { id: 'ada', memos: [], nested: NESTED_JSON },
		})
		const store = createDatabaseMemoStore(driver)
		const control = buildMemoSnapshot(2, 'c')
		await store.set(control)
		const error = await store.get('ada').catch((caught: unknown) => caught)
		expect(isContextError(error) && error.code).toBe('SNAPSHOT')
		expect(isContextError(error) && error.context?.faults).toEqual([
			{ reason: 'extra', path: ['nested'] },
		])
		expect(await store.get('c')).toEqual(control)
	})
})
