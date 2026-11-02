import { createDatabaseConversationStore, createDatabaseMemoStore } from '@src/core'
import { createMemoryDriver } from '@orkestrel/database'
import { describe, expect, it } from 'vitest'
import {
	buildConversationSnapshot,
	buildMemoSnapshot,
	MALFORMED_MEMO_SNAPSHOTS,
	plantSnapshotRow,
} from '../../../../setup.js'

describe('DatabaseMemoStore', () => {
	it('reads each malformed row as undefined', async () => {
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
				return { malformed: await store.get('ada'), control: await store.get('c') }
			}),
		)

		expect(reads).toEqual(rows.map(() => ({ malformed: undefined, control })))
	})

	it('reads a foreign-id row as undefined', async () => {
		const driver = createMemoryDriver()
		const control = buildMemoSnapshot(2, 'c')
		await plantSnapshotRow(driver, 'memos', { id: 'a', snapshot: buildMemoSnapshot(2, 'b') })
		await plantSnapshotRow(driver, 'memos', { id: 'c', snapshot: control })
		const store = createDatabaseMemoStore(driver)

		expect(await store.get('a')).toBeUndefined()
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
