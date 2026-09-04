import { isConversationSnapshot, isMessage, isSection } from '@src/core'
import { roundTripJSON } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import { buildConversationSnapshot } from '../../setup.js'

// The core read-boundary guards — `isMessage`, `isSection`, and `isConversationSnapshot`. Each is
// TOTAL: adversarial input returns `false` and never throws, so an untrusted storage read narrows
// through a guard rather than an assertion. Real data throughout — `buildConversationSnapshot`
// produces a genuine compacted conversation, no mocks.

// A snapshot valid in every field EXCEPT the planted `calls` value, so a rejection isolates the
// deepened per-call check rather than some sibling field.
const withCalls = (calls: unknown): unknown => ({
	id: 'c',
	sections: [],
	messages: [{ id: 'a1', role: 'assistant', content: '', calls }],
})

describe('isMessage — the per-message shape guard (total + defensive)', () => {
	it('accepts the real Message shape, with and without its optionals', () => {
		expect(isMessage({ id: 'm1', role: 'user', content: 'hi' })).toBe(true)
		expect(isMessage({ id: 'm1', role: 'assistant', content: '', calls: [] })).toBe(true)
		expect(
			isMessage({
				id: 'm1',
				role: 'assistant',
				content: '',
				calls: [{ id: 'c1', name: 'search', arguments: { q: 'acme' } }],
			}),
		).toBe(true)
		expect(isMessage({ id: 'm1', role: 'user', content: 'see', images: ['DATA'] })).toBe(true)
		// The role stays a broad string, so a storage-read role outside the current literal set passes.
		expect(isMessage({ id: 'm1', role: 'developer', content: 'hi' })).toBe(true)
	})

	it('rejects a non-record, a nullish, and a primitive without throwing', () => {
		expect(isMessage(undefined)).toBe(false)
		expect(isMessage(null)).toBe(false)
		expect(isMessage(42)).toBe(false)
		expect(isMessage('message')).toBe(false)
		expect(isMessage(['m'])).toBe(false)
	})

	it('rejects a missing or wrong-typed required field', () => {
		expect(isMessage({ role: 'user', content: 'hi' })).toBe(false) // no id
		expect(isMessage({ id: 'm1', content: 'hi' })).toBe(false) // no role
		expect(isMessage({ id: 'm1', role: 'user' })).toBe(false) // no content
		expect(isMessage({ id: 1, role: 'user', content: 'hi' })).toBe(false)
		expect(isMessage({ id: 'm1', role: 7, content: 'hi' })).toBe(false)
		expect(isMessage({ id: 'm1', role: 'user', content: 7 })).toBe(false)
	})

	it('rejects a non-array calls, a malformed calls element, and a non-array images', () => {
		expect(isMessage({ id: 'm1', role: 'assistant', content: '', calls: 'nope' })).toBe(false)
		expect(isMessage({ id: 'm1', role: 'assistant', content: '', calls: [null] })).toBe(false)
		expect(
			isMessage({ id: 'm1', role: 'assistant', content: '', calls: [{ id: 'c1', name: 'tool' }] }),
		).toBe(false)
		expect(isMessage({ id: 'm1', role: 'user', content: 'see', images: 'DATA' })).toBe(false)
	})
})

describe('isSection — the per-section shape guard (total + defensive)', () => {
	it('accepts the real Section shape, including an empty retained list', () => {
		expect(
			isSection({
				id: 's',
				summary: 'recap',
				messages: [{ id: '1', role: 'user', content: 'hi' }],
			}),
		).toBe(true)
		expect(isSection({ id: 's', summary: 'recap', messages: [] })).toBe(true)
	})

	it('rejects a non-record, a nullish, and a primitive without throwing', () => {
		expect(isSection(undefined)).toBe(false)
		expect(isSection(null)).toBe(false)
		expect(isSection(42)).toBe(false)
		expect(isSection('section')).toBe(false)
	})

	it('rejects a missing required field, a non-array messages, and a malformed element', () => {
		expect(isSection({ id: 's', messages: [] })).toBe(false) // no summary
		expect(isSection({ summary: 'recap', messages: [] })).toBe(false) // no id
		expect(isSection({ id: 's', summary: 7, messages: [] })).toBe(false)
		expect(isSection({ id: 's', summary: 'recap', messages: 'nope' })).toBe(false)
		expect(isSection({ id: 's', summary: 'recap', messages: [{ id: 'm', role: 'user' }] })).toBe(
			false,
		)
	})
})

describe('isConversationSnapshot — the read-boundary guard (total + defensive)', () => {
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

	it('rejects a snapshot whose assistant calls[] carries a tampered element (fail-closed)', () => {
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
