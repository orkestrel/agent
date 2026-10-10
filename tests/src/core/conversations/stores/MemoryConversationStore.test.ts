import { createMemoryConversationStore } from '@src/core'
import { roundTripJSON } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import {
	buildConversationSnapshot,
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

// The C-c MemoryConversationStore — the in-memory default behind the ConversationStoreInterface
// persistence seam (get / set / delete, async, keyed by a snapshot's own id). It persists the
// ConversationSnapshot (the self-contained, pure-JSON conversation state) UNCHANGED. REAL data only
// — a real Conversation's `snapshot()` carrying BOTH compacted sections AND a live tail
// (produced by a genuine compaction over a data-stub summarizer), NO mocks.

// The shared `ConversationStoreInterface` contract scenarios (round-trip / upsert / delete & absent /
// two-ids-coexist) plus the real `buildConversationSnapshot` fixture both store twins drive live in
// tests/setup.ts, so the scenario + snapshot logic stay in ONE place. `setup.ts` exports
// each scenario as a plain function returning its result (NO `describe` / `it` / `expect` bound in), so
// THIS file registers the battery against the memory factory and asserts on what each scenario
// returns, keeping only its TWIN-SPECIFIC blocks: the JSON driver-swap-parity round-trip and the
// tool-message round-trip. The snapshot, section, and message guards live in
// tests/src/core/conversations/validators.test.ts, beside their module.
describe('MemoryConversationStore', () => {
	it('round trips judgment answers, refusals, and recorded times', async () => {
		const { got } = await exerciseConversationStoreRoundTrip(
			createMemoryConversationStore,
			async () => JUDGMENT_SNAPSHOT,
		)
		expect(got).toEqual(JUDGMENT_SNAPSHOT)
	})
	describe('set → get round-trip (sections + live tail)', () => {
		it('set → get returns an equal snapshot (sections + tail survive)', async () => {
			const { snapshot, got } = await exerciseConversationStoreRoundTrip(
				createMemoryConversationStore,
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
				createMemoryConversationStore,
				buildConversationSnapshot,
			)
			expect(got).toEqual(second)
		})
	})

	describe('delete & absent', () => {
		it('set → delete → get returns undefined', async () => {
			const { beforeDelete, afterDelete } = await exerciseConversationStoreDeleteThenAbsent(
				createMemoryConversationStore,
				buildConversationSnapshot,
			)
			expect(beforeDelete).toBeDefined()
			expect(afterDelete).toBeUndefined()
		})

		it('deleting an absent id does not throw (a no-op)', async () => {
			await expect(
				exerciseConversationStoreDeleteAbsent(createMemoryConversationStore),
			).resolves.toBeUndefined()
		})

		it('get of an absent id returns undefined', async () => {
			expect(
				await exerciseConversationStoreGetAbsent(createMemoryConversationStore),
			).toBeUndefined()
		})
	})

	describe('two distinct conversation ids coexist', () => {
		it('two distinct conversation ids coexist without cross-contamination', async () => {
			const { alpha, beta, gotAlpha, gotBeta, gotAlphaAfterDelete, gotBetaAfterDelete } =
				await exerciseConversationStoreTwoIds(
					createMemoryConversationStore,
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

describe('MemoryConversationStore — JSON driver-swap parity', () => {
	it('the retrieved snapshot survives JSON.stringify/parse identically (driver-swap parity)', async () => {
		// After `set`, the retrieved payload must survive a full JSON round-trip, so it persists
		// unchanged across ANY JSON / SQLite / IndexedDB backend.
		const store = createMemoryConversationStore()
		const snapshot = await buildConversationSnapshot()

		await store.set(snapshot)
		const got = await store.get(snapshot.id)
		expect(got).toBeDefined()
		if (got === undefined) return
		// `JSONSafe` maps the all-optional `NoulCriteria` under a judgment to `never`, so the round trip
		// is typed `unknown` here.
		expect(roundTripJSON<unknown>(got)).toEqual(got)
	})
})

describe('MemoryConversationStore — tool messages with and without call', () => {
	it('round-trips a tool message naming its call beside one saved without call', async () => {
		const { got } = await exerciseConversationStoreRoundTrip(
			createMemoryConversationStore,
			async () => TOOL_SNAPSHOT,
		)
		expect(got).toEqual(TOOL_SNAPSHOT)
		expect(roundTripJSON<unknown>(got)).toEqual(TOOL_SNAPSHOT)
		expect(got?.messages.at(-1)?.call).toBe('call-oslo')
		expect(got?.sections[0]?.messages.at(-1)).not.toHaveProperty('call')
	})
})
