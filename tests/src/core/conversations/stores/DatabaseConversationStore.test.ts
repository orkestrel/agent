import { createDatabaseConversationStore } from '@src/core'
import { createDatabase, createMemoryDriver } from '@orkestrel/database'
import { rawShape, stringShape } from '@orkestrel/contract'
import { createDatabaseWorkspaceStore } from '@orkestrel/workspace'
import { describe, expect, it } from 'vitest'
import {
	buildConversationSnapshot,
	conversationStoreDeleteAbsent,
	conversationStoreDeleteThenAbsent,
	conversationStoreGetAbsent,
	conversationStoreRoundTrip,
	conversationStoreRoundTripExpectation,
	conversationStoreTwoIds,
	conversationStoreUpsert,
} from '../../../../setup.js'

const makeStore = (): ReturnType<typeof createDatabaseConversationStore> =>
	createDatabaseConversationStore(createMemoryDriver())

// src/core/agents/conversations/stores/DatabaseConversationStore.ts — the durable, driver-pluggable
// twin of the plain-Map MemoryConversationStore behind the ConversationStoreInterface seam (get /
// set / delete, async, keyed by a snapshot's own id). It persists the ConversationSnapshot as ONE
// OPAQUE JSON column over a `databases` table (driver default = createMemoryDriver), narrowing the
// column back to a ConversationSnapshot on `get` (the total boundary guard). Exercised over a REAL
// memory driver, with REAL ConversationSnapshot values (NO mocks) — a genuine `compact()`
// produces real sections + a rollup, plus a live tail.

// The shared `ConversationStoreInterface` contract scenarios (round-trip / upsert / delete & absent /
// two-ids-coexist) plus the real `buildConversationSnapshot` fixture both store twins drive live in
// tests/setup.ts. `setup.ts` exports each scenario as a plain function returning its
// result (NO `describe` / `it` / `expect` bound in), so THIS file registers the battery against the
// database factory (over a REAL memory driver) and asserts on what each scenario returns, keeping only
// its TWIN-SPECIFIC blocks below: the default-driver overload, cross-instance durability over a shared
// driver, and sibling-store non-collision.
describe('DatabaseConversationStore', () => {
	describe('set → get round-trip (sections + live tail + rollup summary)', () => {
		it('set → get returns an equal snapshot (sections + tail + summary survive)', async () => {
			const { snapshot, got } = await conversationStoreRoundTrip(
				makeStore,
				buildConversationSnapshot,
			)
			// The retrieved snapshot deep-equals what was stored (the durable payload survives intact).
			expect(got).toEqual(snapshot)
			// It carries a compacted section, a live tail, AND a rollup summary (round-trip is non-vacuous).
			expect(got?.sections).toHaveLength(1)
			expect(got?.sections[0]?.summary).toBe(conversationStoreRoundTripExpectation.sectionSummary)
			expect(got?.sections[0]?.messages.map((message) => message.content)).toEqual(
				conversationStoreRoundTripExpectation.sectionMessages,
			)
			expect(got?.messages.map((message) => message.content)).toEqual(
				conversationStoreRoundTripExpectation.liveTail,
			)
			expect(got?.summary).toBe(conversationStoreRoundTripExpectation.rollupSummary)
		})
	})

	describe('upsert (set replaces under the same id)', () => {
		it('set replaces an existing snapshot under the same id', async () => {
			const { second, got } = await conversationStoreUpsert(makeStore, buildConversationSnapshot)
			expect(got).toEqual(second)
		})
	})

	describe('delete & absent', () => {
		it('set → delete → get returns undefined', async () => {
			const { beforeDelete, afterDelete } = await conversationStoreDeleteThenAbsent(
				makeStore,
				buildConversationSnapshot,
			)
			expect(beforeDelete).toBeDefined()
			expect(afterDelete).toBeUndefined()
		})

		it('deleting an absent id does not throw (a no-op)', async () => {
			await expect(conversationStoreDeleteAbsent(makeStore)).resolves.toBeUndefined()
		})

		it('get of an absent id returns undefined', async () => {
			expect(await conversationStoreGetAbsent(makeStore)).toBeUndefined()
		})
	})

	describe('two distinct conversation ids coexist', () => {
		it('two distinct conversation ids coexist without cross-contamination', async () => {
			const { alpha, beta, gotAlpha, gotBeta, gotAlphaAfterDelete, gotBetaAfterDelete } =
				await conversationStoreTwoIds(makeStore, buildConversationSnapshot)
			expect(gotAlpha).toEqual(alpha)
			expect(gotBeta).toEqual(beta)
			// Dropping one leaves the other intact.
			expect(gotAlphaAfterDelete).toBeUndefined()
			expect(gotBetaAfterDelete).toEqual(beta)
		})
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
		// The durable guarantee: a snapshot written through one store instance is readable through a
		// DISTINCT store instance over the SAME driver — the row persists in the shared backend, not
		// in the store object. (The memory driver's table is the durable seam a real DB would be.)
		const driver = createMemoryDriver()
		const writer = createDatabaseConversationStore(driver)
		const snapshot = await buildConversationSnapshot('shared')
		await writer.set(snapshot)

		const reader = createDatabaseConversationStore(driver)
		expect(await reader.get('shared')).toEqual(snapshot)
	})

	it('a TAMPERED row (a hostile calls[] element) resolves UNDEFINED from get (fail-closed)', async () => {
		// Plant a tampered row OUT-OF-BAND over the store's own driver — the same one-table shape
		// the factory builds — whose snapshot column smuggles a malformed assistant calls[] element
		// (the shape a real chat template would otherwise render). The deepened isMessage rejects
		// it at the read boundary, so the store resolves ABSENT: hydrate mints a fresh thread
		// instead of replaying (or throwing on) the poisoned call.
		const driver = createMemoryDriver()
		const database = createDatabase({
			driver,
			tables: { conversations: { id: stringShape(), snapshot: rawShape({}) } },
		})
		await database.table('conversations').set({
			id: 'poisoned',
			snapshot: {
				id: 'poisoned',
				sections: [],
				messages: [{ id: 'a1', role: 'assistant', content: '', calls: [null, 'x'] }],
			},
		})
		await database.close()
		const store = createDatabaseConversationStore(driver)
		expect(await store.get('poisoned')).toBeUndefined()
	})

	it('a conversation store and a workspace store over their own drivers do not collide', async () => {
		// Defensive: the conversation store builds its own `conversations` table; a sibling workspace
		// store (its own `workspaces` table) over a SEPARATE driver coexists — the two seams are
		// independent (no shared table name, no cross-read).
		const conversationStore = createDatabaseConversationStore(createMemoryDriver())
		const workspaceStore = createDatabaseWorkspaceStore(createMemoryDriver())
		const snapshot = await buildConversationSnapshot('only-conversation')

		await conversationStore.set(snapshot)
		// The workspace store never saw this id — its own table is empty for it.
		expect(await workspaceStore.get('only-conversation')).toBeUndefined()
		expect(await conversationStore.get('only-conversation')).toEqual(snapshot)
	})
})
