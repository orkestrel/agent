import { createMemoryConversationStore, isConversationSnapshot, isToolCall } from '@src/core'
import { describe, expect, it } from 'vitest'
import {
	assertConversationStoreContract,
	buildConversationSnapshot,
	roundTripJSON,
} from '../../../../setup.js'

// The C-c MemoryConversationStore — the in-memory default behind the ConversationStoreInterface
// persistence seam (get / set / delete, async, keyed by a snapshot's own id). It persists the
// ConversationSnapshot (the self-contained, pure-JSON conversation state) UNCHANGED. REAL data only
// (AGENTS §16) — a real Conversation's `snapshot()` carrying BOTH compacted sections AND a live tail
// AND a rollup `summary` (produced by a genuine compaction over a data-stub summarizer), NO mocks.

// The shared `ConversationStoreInterface` contract battery (round-trip / upsert / delete & absent /
// two-ids-coexist) plus the real `buildConversationSnapshot` fixture both store twins drive live in
// tests/setup.ts (AGENTS §16.1), so the contract + snapshot stay in ONE place. This file invokes
// that battery against the memory factory and keeps only its TWIN-SPECIFIC blocks below: the JSON
// driver-swap-parity round-trip and the `isConversationSnapshot` read-boundary guard.
describe('MemoryConversationStore', () => {
	assertConversationStoreContract(() => createMemoryConversationStore(), buildConversationSnapshot)
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

describe('isConversationSnapshot — the §14 read-boundary guard (total + defensive)', () => {
	it('accepts a real snapshot (sections + tail + summary)', async () => {
		expect(isConversationSnapshot(await buildConversationSnapshot())).toBe(true)
		// An empty-sections + empty-tail snapshot is still valid (a fresh conversation, no summary).
		expect(isConversationSnapshot({ id: 'c', sections: [], messages: [] })).toBe(true)
		// An optional rollup `summary` (present) is accepted.
		expect(isConversationSnapshot({ id: 'c', summary: 'rollup', sections: [], messages: [] })).toBe(
			true,
		)
	})

	it('rejects malformed input without throwing (total guard)', () => {
		// Non-records / primitives / nullish.
		expect(isConversationSnapshot(undefined)).toBe(false)
		expect(isConversationSnapshot(null)).toBe(false)
		expect(isConversationSnapshot(42)).toBe(false)
		expect(isConversationSnapshot('snapshot')).toBe(false)
		// Missing / wrong-typed `id`.
		expect(isConversationSnapshot({ sections: [], messages: [] })).toBe(false)
		expect(isConversationSnapshot({ id: 1, sections: [], messages: [] })).toBe(false)
		// A non-string `summary` when present.
		expect(isConversationSnapshot({ id: 'c', summary: 7, sections: [], messages: [] })).toBe(false)
		// `sections` / `messages` not arrays.
		expect(isConversationSnapshot({ id: 'c', sections: 'nope', messages: [] })).toBe(false)
		expect(isConversationSnapshot({ id: 'c', sections: [], messages: { a: 1 } })).toBe(false)
		// `messages` carries a malformed message element (missing content).
		expect(
			isConversationSnapshot({ id: 'c', sections: [], messages: [{ id: 'm', role: 'user' }] }),
		).toBe(false)
		// `sections` carries a malformed section element (missing summary).
		expect(
			isConversationSnapshot({ id: 'c', sections: [{ id: 's', messages: [] }], messages: [] }),
		).toBe(false)
		// A section whose `messages` carries a malformed element.
		expect(
			isConversationSnapshot({
				id: 'c',
				sections: [{ id: 's', summary: 'r', messages: [{ id: 'm', role: 'user' }] }],
				messages: [],
			}),
		).toBe(false)
	})

	it('rejects a snapshot whose assistant calls[] carries a tampered element (ASI06 fail-closed)', () => {
		// A message-level helper: the snapshot is valid EXCEPT for the planted calls value, so a
		// rejection isolates the deepened per-call check (isToolCall), not some sibling field.
		const withCalls = (calls: unknown): unknown => ({
			id: 'c',
			sections: [],
			messages: [{ id: 'a1', role: 'assistant', content: '', calls }],
		})
		// A null / bare-string element, a missing-arguments call, a non-string name, and a
		// non-record arguments are each rejected WITHOUT throwing — the poisoned row reads
		// back as absent and hydrate mints a fresh thread (the absent-on-tamper posture).
		expect(isConversationSnapshot(withCalls([null]))).toBe(false)
		expect(isConversationSnapshot(withCalls(['x']))).toBe(false)
		expect(isConversationSnapshot(withCalls([{ id: 'c1', name: 'tool' }]))).toBe(false)
		expect(isConversationSnapshot(withCalls([{ id: 'c1', name: 123, arguments: {} }]))).toBe(false)
		expect(isConversationSnapshot(withCalls([{ id: 'c1', name: 'tool', arguments: null }]))).toBe(
			false,
		)
		// A well-formed calls[] still passes (the deepening rejects only real tampering).
		expect(
			isConversationSnapshot(withCalls([{ id: 'c1', name: 'tool', arguments: { q: 'acme' } }])),
		).toBe(true)
	})

	it('accepts a snapshot revived from JSON (the storage-read shape the DB store narrows)', async () => {
		// The exact value a DatabaseConversationStore reads back from its opaque JSON column — a plain
		// object the guard must accept structurally (no class instances required).
		const revived = roundTripJSON(await buildConversationSnapshot())
		expect(isConversationSnapshot(revived)).toBe(true)
	})
})

describe('isToolCall — the per-call §14 guard (the ASI06 fail-closed element check)', () => {
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
