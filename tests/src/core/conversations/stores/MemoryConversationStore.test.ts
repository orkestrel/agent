import { createMemoryConversationStore } from '@src/core'
import { roundTripJSON } from '@orkestrel/test'
import { isToolCall } from '@orkestrel/tool'
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

const makeStore = (): ReturnType<typeof createMemoryConversationStore> =>
	createMemoryConversationStore()

// The C-c MemoryConversationStore — the in-memory default behind the ConversationStoreInterface
// persistence seam (get / set / delete, async, keyed by a snapshot's own id). It persists the
// ConversationSnapshot (the self-contained, pure-JSON conversation state) UNCHANGED. REAL data only
// — a real Conversation's `snapshot()` carrying BOTH compacted sections AND a live tail
// AND a rollup `summary` (produced by a genuine compaction over a data-stub summarizer), NO mocks.

// The shared `ConversationStoreInterface` contract scenarios (round-trip / upsert / delete & absent /
// two-ids-coexist) plus the real `buildConversationSnapshot` fixture both store twins drive live in
// tests/setup.ts, so the scenario + snapshot logic stay in ONE place. `setup.ts` exports
// each scenario as a plain function returning its result (NO `describe` / `it` / `expect` bound in), so
// THIS file registers the battery against the memory factory and asserts on what each scenario
// returns, keeping only its TWIN-SPECIFIC blocks: the JSON driver-swap-parity round-trip and the
// per-call element guard the snapshot's assistant `calls` rests on. The core snapshot / message /
// section guards live in tests/src/core/validators.test.ts, their module's own mirror.
describe('MemoryConversationStore', () => {
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

describe('MemoryConversationStore — JSON driver-swap parity', () => {
	it('the retrieved snapshot survives JSON.stringify/parse identically (driver-swap parity)', async () => {
		// After `set`, the retrieved payload must survive a full JSON round-trip — proving it persists
		// unchanged across ANY JSON / SQLite / IndexedDB backend (the real driver-swap guarantee).
		const store = createMemoryConversationStore()
		const snapshot = await buildConversationSnapshot()

		await store.set(snapshot)
		const got = await store.get(snapshot.id)
		expect(got).toBeDefined()
		if (got === undefined) return
		expect(roundTripJSON(got)).toEqual(got)
	})
})

describe('isToolCall — the per-call guard (the fail-closed element check)', () => {
	it('accepts the real ToolCall shape (string id / name + a record arguments)', () => {
		expect(isToolCall({ id: 'c1', name: 'search', arguments: { q: 'acme' } })).toBe(true)
		expect(isToolCall({ id: 'c1', name: 'search', arguments: {} })).toBe(true)
	})

	it('rejects hostile shapes without throwing (total guard)', () => {
		expect(isToolCall(null)).toBe(false)
		expect(isToolCall(undefined)).toBe(false)
		expect(isToolCall('x')).toBe(false)
		expect(isToolCall(42)).toBe(false)
		expect(isToolCall({ id: 'c1', name: 'search' })).toBe(false) // missing arguments
		expect(isToolCall({ id: 'c1', name: 123, arguments: {} })).toBe(false) // non-string name
		expect(isToolCall({ id: 1, name: 'search', arguments: {} })).toBe(false) // non-string id
		expect(isToolCall({ id: 'c1', name: 'search', arguments: null })).toBe(false) // non-record args
		expect(isToolCall({ id: 'c1', name: 'search', arguments: 'q=acme' })).toBe(false)
		expect(isToolCall({ id: 'c1', name: 'search', arguments: ['q'] })).toBe(false)
	})
})
