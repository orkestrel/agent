import { createDatabaseConversationStore } from '@src/core'
import { createMemoryDriver } from '@orkestrel/database'
import { createDatabaseWorkspaceStore } from '@orkestrel/workspace'
import { describe, expect, it } from 'vitest'
import {
	buildConversationSnapshot,
	plantConversationRow,
	exerciseConversationStoreDeleteAbsent,
	exerciseConversationStoreDeleteThenAbsent,
	exerciseConversationStoreGetAbsent,
	exerciseConversationStoreRoundTrip,
	CONVERSATION_STORE_ROUND_TRIP_EXPECTATION,
	exerciseConversationStoreTwoIds,
	exerciseConversationStoreUpsert,
	TOOL_SNAPSHOT,
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
	it('round trips judgment answers, refusals, and recorded times', async () => {
		const { got } = await exerciseConversationStoreRoundTrip(
			() => createDatabaseConversationStore(createMemoryDriver()),
			async () => JUDGMENT_SNAPSHOT,
		)
		expect(got).toEqual(JUDGMENT_SNAPSHOT)
	})

	it('refuses a malformed judgments member read from its real table', async () => {
		const driver = createMemoryDriver()
		await plantConversationRow(driver, {
			id: JUDGMENT_SNAPSHOT.id,
			snapshot: { ...JUDGMENT_SNAPSHOT, judgments: [{ id: 'broken' }] },
		})
		expect(await createDatabaseConversationStore(driver).get(JUDGMENT_SNAPSHOT.id)).toBeUndefined()
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
				CONVERSATION_STORE_ROUND_TRIP_EXPECTATION.sectionSummary,
			)
			expect(got?.sections[0]?.messages.map((message) => message.content)).toEqual(
				CONVERSATION_STORE_ROUND_TRIP_EXPECTATION.sectionMessages,
			)
			expect(got?.messages.map((message) => message.content)).toEqual(
				CONVERSATION_STORE_ROUND_TRIP_EXPECTATION.liveTail,
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
			const { beforeDelete, afterDelete } = await exerciseConversationStoreDeleteThenAbsent(
				() => createDatabaseConversationStore(createMemoryDriver()),
				buildConversationSnapshot,
			)
			expect(beforeDelete).toBeDefined()
			expect(afterDelete).toBeUndefined()
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
			const { alpha, beta, gotAlpha, gotBeta, gotAlphaAfterDelete, gotBetaAfterDelete } =
				await exerciseConversationStoreTwoIds(
					() => createDatabaseConversationStore(createMemoryDriver()),
					buildConversationSnapshot,
				)
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

	it('a TAMPERED row (a hostile calls[] element) resolves UNDEFINED from get (fail-closed)', async () => {
		// Plant a tampered row OUT-OF-BAND over the store's own driver — the same one-table shape
		// the factory builds — whose snapshot column smuggles a malformed assistant calls[] element
		// (the shape a real chat template would otherwise render). The isMessage guard rejects
		// it at the read boundary, so the store resolves ABSENT: hydrate mints a fresh thread
		// instead of replaying (or throwing on) the poisoned call.
		const driver = createMemoryDriver()
		await plantConversationRow(driver, {
			id: 'poisoned',
			snapshot: {
				id: 'poisoned',
				sections: [],
				messages: [{ id: 'a1', role: 'assistant', content: '', calls: [null, 'x'] }],
			},
		})
		const store = createDatabaseConversationStore(driver)
		expect(await store.get('poisoned')).toBeUndefined()
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

	it('a TAMPERED row (a non-string call) resolves UNDEFINED from get (fail-closed)', async () => {
		const driver = createMemoryDriver()
		await plantConversationRow(driver, {
			id: 'poisoned',
			snapshot: {
				id: 'poisoned',
				sections: [],
				messages: [{ id: 't1', role: 'tool', content: 'sunny', call: 7 }],
			},
		})
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
