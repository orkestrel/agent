import { isConversationError } from '@src/core'
import { createDatabaseConversationStore } from '@src/core'
import { createMemoryDriver } from '@orkestrel/database'
import { createDatabaseWorkspaceStore, createWorkspace } from '@orkestrel/workspace'
import { describe, expect, it } from 'vitest'
import {
	buildConversationSnapshot,
	JUDGMENT_RECORD,
	plantSnapshotRow,
	exerciseConversationStoreDeleteAbsent,
	exerciseConversationStoreDeleteThenAbsent,
	exerciseConversationStoreGetAbsent,
	exerciseConversationStoreRoundTrip,
	CONVERSATION_STORE_ROUND_TRIP_EXPECTATION,
	exerciseConversationStoreTwoIds,
	exerciseConversationStoreUpsert,
	TOOL_SNAPSHOT,
	NESTED_SNAPSHOT,
	JUDGMENT_SNAPSHOT,
} from '../../../../setup.js'

// src/core/conversations/stores/DatabaseConversationStore.ts — the durable, driver-pluggable
// twin of the plain-Map MemoryConversationStore behind the ConversationStoreInterface seam (get /
// set / delete, async, keyed by a snapshot's own id). It persists the ConversationSnapshot as ONE
// OPAQUE JSON column over a `databases` table (driver default = createMemoryDriver), narrowing the
// column back to a ConversationSnapshot on `get` (the total boundary guard). Exercised over a REAL
// memory driver, with REAL ConversationSnapshot values (NO mocks) — a genuine `compact()`
// produces real sections plus a live tail.

// The shared `ConversationStoreInterface` contract scenarios (round-trip / upsert / delete & absent /
// two-ids-coexist) plus the real `buildConversationSnapshot` fixture both store twins drive live in
// tests/setup.ts. `setup.ts` exports each scenario as a plain function returning its
// result (NO `describe` / `it` / `expect` bound in), so THIS file registers the battery against the
// database factory (over a REAL memory driver) and asserts on what each scenario returns, keeping only
// its TWIN-SPECIFIC blocks in the following describe: the default-driver overload, cross-instance durability over a shared
// driver, and sibling-store non-collision.
describe('DatabaseConversationStore', () => {
	it('refuses an out-of-range noul row without overwriting it', async () => {
		const driver = createMemoryDriver()
		await plantSnapshotRow(driver, 'conversations', {
			id: JUDGMENT_SNAPSHOT.id,
			snapshot: {
				...JUDGMENT_SNAPSHOT,
				judgments: [{ ...JUDGMENT_RECORD, answer: { form: 'noul', noul: 2 } }],
			},
		})
		const store = createDatabaseConversationStore(driver)
		await expect(store.get(JUDGMENT_SNAPSHOT.id)).rejects.toSatisfy(
			(error: unknown) => isConversationError(error) && error.code === 'SNAPSHOT',
		)
		await expect(store.get(JUDGMENT_SNAPSHOT.id)).rejects.toSatisfy(
			(error: unknown) => isConversationError(error) && error.code === 'SNAPSHOT',
		)
		await store.delete(JUDGMENT_SNAPSHOT.id)
		expect(await store.get(JUDGMENT_SNAPSHOT.id)).toBeUndefined()
	})
	it('round trips judgment answers, refusals, and recorded times', async () => {
		const { got } = await exerciseConversationStoreRoundTrip(
			() => createDatabaseConversationStore(createMemoryDriver()),
			async () => JUDGMENT_SNAPSHOT,
		)
		expect(got).toEqual(JUDGMENT_SNAPSHOT)
	})

	it('refuses a malformed judgments member read from its real table', async () => {
		const driver = createMemoryDriver()
		await plantSnapshotRow(driver, 'conversations', {
			id: JUDGMENT_SNAPSHOT.id,
			snapshot: { ...JUDGMENT_SNAPSHOT, judgments: [{ id: 'broken' }] },
		})
		await expect(
			createDatabaseConversationStore(driver).get(JUDGMENT_SNAPSHOT.id),
		).rejects.toSatisfy((error: unknown) => isConversationError(error) && error.code === 'SNAPSHOT')
	})
	describe('set → get round-trip (sections + live tail)', () => {
		it('set → get returns an equal snapshot (sections + tail survive)', async () => {
			const { snapshot, got } = await exerciseConversationStoreRoundTrip(
				() => createDatabaseConversationStore(createMemoryDriver()),
				buildConversationSnapshot,
			)
			// The retrieved snapshot deep-equals what was stored (the durable payload survives intact).
			expect(got).toEqual(snapshot)
			// It carries a compacted section AND a live tail (round-trip is non-vacuous).
			expect(got?.sections).toHaveLength(1)
			expect(got?.sections[0]?.summary).toBe(
				CONVERSATION_STORE_ROUND_TRIP_EXPECTATION.section.summary,
			)
			expect(got?.sections[0]?.messages.map((message) => message.content)).toEqual(
				CONVERSATION_STORE_ROUND_TRIP_EXPECTATION.section.messages,
			)
			expect(got?.messages.map((message) => message.content)).toEqual(
				CONVERSATION_STORE_ROUND_TRIP_EXPECTATION.tail,
			)
		})
	})

	describe('upsert (set replaces under the same id)', () => {
		it('set replaces an existing snapshot under the same id', async () => {
			const { second, got } = await exerciseConversationStoreUpsert(
				() => createDatabaseConversationStore(createMemoryDriver()),
				buildConversationSnapshot,
			)
			expect(got).toEqual(second)
		})
	})

	describe('delete & absent', () => {
		it('set → delete → get returns undefined', async () => {
			const { before, after } = await exerciseConversationStoreDeleteThenAbsent(
				() => createDatabaseConversationStore(createMemoryDriver()),
				buildConversationSnapshot,
			)
			expect(before).toBeDefined()
			expect(after).toBeUndefined()
		})

		it('deleting an absent id does not throw (a no-op)', async () => {
			await expect(
				exerciseConversationStoreDeleteAbsent(() =>
					createDatabaseConversationStore(createMemoryDriver()),
				),
			).resolves.toBeUndefined()
		})

		it('get of an absent id returns undefined', async () => {
			expect(
				await exerciseConversationStoreGetAbsent(() =>
					createDatabaseConversationStore(createMemoryDriver()),
				),
			).toBeUndefined()
		})
	})

	describe('two distinct conversation ids coexist', () => {
		it('two distinct conversation ids coexist without cross-contamination', async () => {
			const { alpha, beta } = await exerciseConversationStoreTwoIds(
				() => createDatabaseConversationStore(createMemoryDriver()),
				buildConversationSnapshot,
			)
			expect(alpha.before).toEqual(alpha.snapshot)
			expect(beta.before).toEqual(beta.snapshot)
			// Dropping one leaves the other intact.
			expect(alpha.after).toBeUndefined()
			expect(beta.after).toEqual(beta.snapshot)
		})
	})

	it('round trips a snapshot whose call arguments nest arbitrary keys, arrays, and nulls', async () => {
		const { got } = await exerciseConversationStoreRoundTrip(
			() => createDatabaseConversationStore(createMemoryDriver()),
			async () => NESTED_SNAPSHOT,
		)
		expect(got).toEqual(NESTED_SNAPSHOT)
	})
})

describe('DatabaseConversationStore — driver overloads & durability', () => {
	it('the same store works over the default memory driver (no explicit driver)', async () => {
		// The default-driver factory overload (no arg) builds an equivalent memory-backed store, so
		// the same set → get round-trip holds — the ConversationStoreInterface seam is driver-agnostic.
		const store = createDatabaseConversationStore() // driver defaults to createMemoryDriver()
		const snapshot = await buildConversationSnapshot()

		await store.set(snapshot)
		expect(await store.get(snapshot.id)).toEqual(snapshot)
	})

	it('a SECOND store over the SAME driver reads back the snapshot (cross-instance durability)', async () => {
		// A snapshot written through one store instance is readable through a DISTINCT store
		// instance over the SAME driver — the row persists in the shared backend, not in the store
		// object. (The memory driver's table is the durable seam a real DB would be.)
		const driver = createMemoryDriver()
		const writer = createDatabaseConversationStore(driver)
		const snapshot = await buildConversationSnapshot('shared')
		await writer.set(snapshot)

		const reader = createDatabaseConversationStore(driver)
		expect(await reader.get('shared')).toEqual(snapshot)
	})

	it('a TAMPERED row (a hostile calls[] element) throws SNAPSHOT from get (fail-closed)', async () => {
		// Plant a tampered row OUT-OF-BAND over the store's own driver — the same one-table shape
		// the factory builds — whose snapshot column smuggles a malformed assistant calls[] element
		// (the shape a real chat template would otherwise render). The isMessage guard rejects
		// it at the read boundary, so the store throws: reading it as absent would let a fresh
		// thread overwrite the row, and replaying it would render the poisoned call.
		const driver = createMemoryDriver()
		await plantSnapshotRow(driver, 'conversations', {
			id: 'poisoned',
			snapshot: {
				id: 'poisoned',
				sections: [],
				messages: [{ id: 'a1', role: 'assistant', content: '', calls: [null, 'x'] }],
			},
		})
		const store = createDatabaseConversationStore(driver)
		await expect(store.get('poisoned')).rejects.toSatisfy(
			(error: unknown) => isConversationError(error) && error.code === 'SNAPSHOT',
		)
	})

	it('reads back a tool message naming its call beside one saved without call', async () => {
		const { got } = await exerciseConversationStoreRoundTrip(
			() => createDatabaseConversationStore(createMemoryDriver()),
			async () => TOOL_SNAPSHOT,
		)
		expect(got).toEqual(TOOL_SNAPSHOT)
		expect(got?.messages.at(-1)?.call).toBe('call-oslo')
		expect(got?.sections[0]?.messages.at(-1)).not.toHaveProperty('call')
	})

	it('a TAMPERED row (a non-string call) throws SNAPSHOT from get (fail-closed)', async () => {
		const driver = createMemoryDriver()
		await plantSnapshotRow(driver, 'conversations', {
			id: 'poisoned',
			snapshot: {
				id: 'poisoned',
				sections: [],
				messages: [{ id: 't1', role: 'tool', content: 'sunny', call: 7 }],
			},
		})
		const store = createDatabaseConversationStore(driver)
		await expect(store.get('poisoned')).rejects.toSatisfy(
			(error: unknown) => isConversationError(error) && error.code === 'SNAPSHOT',
		)
	})

	it('a conversation store and a workspace store over ONE driver keep one id apart', async () => {
		// Both stores share the driver and write the same key, so a shared table name or a shared
		// key space would make one read back the other's snapshot (or nothing). A memory driver
		// serves the schema of the database that opened it last, and keeps every table's rows
		// across opens, so each step opens a fresh store over the shared driver.
		const driver = createMemoryDriver()
		const conversation = await buildConversationSnapshot('shared')
		const workspace = createWorkspace({ id: 'shared' }).snapshot()

		await createDatabaseConversationStore(driver).set(conversation)
		await createDatabaseWorkspaceStore(driver).set(workspace)

		expect(await createDatabaseConversationStore(driver).get('shared')).toEqual(conversation)
		expect(await createDatabaseWorkspaceStore(driver).get('shared')).toEqual(workspace)
		await createDatabaseConversationStore(driver).delete('shared')
		expect(await createDatabaseConversationStore(driver).get('shared')).toBeUndefined()
		expect(await createDatabaseWorkspaceStore(driver).get('shared')).toEqual(workspace)
	})

	it('a row whose snapshot names another id throws SNAPSHOT from get, and an absent row stays absent', async () => {
		const driver = createMemoryDriver()
		const snapshot = await buildConversationSnapshot('b')
		await plantSnapshotRow(driver, 'conversations', { id: 'a', snapshot })
		const store = createDatabaseConversationStore(driver)

		await expect(store.get('a')).rejects.toSatisfy(
			(error: unknown) => isConversationError(error) && error.code === 'SNAPSHOT',
		)
		expect(await store.get('b')).toBeUndefined()
	})

	it.each([Number.NaN, Number.POSITIVE_INFINITY])(
		'a judgment time of %s throws SNAPSHOT from get, before any hydration',
		async (time) => {
			const driver = createMemoryDriver()
			await plantSnapshotRow(driver, 'conversations', {
				id: JUDGMENT_SNAPSHOT.id,
				snapshot: { ...JUDGMENT_SNAPSHOT, judgments: [{ ...JUDGMENT_RECORD, time }] },
			})

			await expect(
				createDatabaseConversationStore(driver).get(JUDGMENT_SNAPSHOT.id),
			).rejects.toSatisfy(
				(error: unknown) => isConversationError(error) && error.code === 'SNAPSHOT',
			)
		},
	)
})

describe('DatabaseConversationStore — a present row that fails the guard throws', () => {
	it('names the id, the key, the table, and store.delete when a row carries a summary', async () => {
		const driver = createMemoryDriver()
		await plantSnapshotRow(driver, 'conversations', {
			id: 'c1',
			snapshot: { id: 'c1', sections: [], messages: [], summary: 'x' },
		})
		const store = createDatabaseConversationStore(driver)
		const error = await store.get('c1').catch((caught: unknown) => caught)
		expect(isConversationError(error) && error.code).toBe('SNAPSHOT')
		const message = isConversationError(error) ? error.message : ''
		expect(message).toContain('"c1"')
		expect(message).toContain('"summary"')
		expect(message).toContain('your own table')
		expect(message).toContain('store.delete("c1")')
		expect(isConversationError(error) && error.context?.faults).toEqual([
			{ reason: 'extra', path: ['summary'] },
		])
	})

	it('throws on a row that names another id, and still deletes it', async () => {
		const driver = createMemoryDriver()
		await plantSnapshotRow(driver, 'conversations', {
			id: 'c1',
			snapshot: { id: 'c2', sections: [], messages: [] },
		})
		const store = createDatabaseConversationStore(driver)
		const error = await store.get('c1').catch((caught: unknown) => caught)
		expect(isConversationError(error) && error.code).toBe('SNAPSHOT')
		await store.delete('c1')
		expect(await store.get('c1')).toBeUndefined()
	})

	it('resolves undefined only for a missing row', async () => {
		const store = createDatabaseConversationStore(createMemoryDriver())
		expect(await store.get('absent')).toBeUndefined()
	})

	it('writes nothing for a malformed snapshot', async () => {
		const store = createDatabaseConversationStore(createMemoryDriver())
		const malformed = { id: 'c1', sections: [], messages: [], summary: 'x' }
		const error = await Reflect.apply(store.set, store, [malformed]).catch(
			(caught: unknown) => caught,
		)
		expect(isConversationError(error) && error.code).toBe('SNAPSHOT')
		expect(await store.get('c1')).toBeUndefined()
	})
})
