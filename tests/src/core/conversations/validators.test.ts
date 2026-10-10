import { isConversationSnapshot, isJudgment, isMessage, isSection } from '@src/core'
import { roundTripJSON } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import {
	approveEvery,
	buildCallsSnapshot,
	buildConversationSnapshot,
	SUMMARIZED_CONVERSATION_SNAPSHOT,
	TOOL_SNAPSHOT,
	JUDGMENT_RECORD,
	JUDGMENT_SNAPSHOT,
	INVALID_JUDGMENTS,
	JUDGMENT_USAGE,
	TEV1_CHOICE,
	TEV1_SCORE,
	throwProxyRead,
} from '../../../setup.js'

describe('isJudgment and snapshot carriage', () => {
	it('accepts answers, refusals, usage, and snapshots with or without judgments', () => {
		expect(isJudgment(JUDGMENT_RECORD)).toBe(true)
		expect(isJudgment({ ...JUDGMENT_RECORD, usage: JUDGMENT_USAGE })).toBe(true)
		expect(isJudgment({ ...JUDGMENT_RECORD, answer: TEV1_CHOICE })).toBe(true)
		expect(isJudgment({ ...JUDGMENT_RECORD, answer: TEV1_SCORE })).toBe(true)
		expect(JUDGMENT_SNAPSHOT.judgments?.every(isJudgment)).toBe(true)
		expect(isConversationSnapshot(JUDGMENT_SNAPSHOT)).toBe(true)
		expect(isConversationSnapshot({ id: 'old', sections: [], messages: [] })).toBe(true)
		expect(isConversationSnapshot({ ...JUDGMENT_SNAPSHOT, judgments: null })).toBe(false)
		expect(isConversationSnapshot({ ...JUDGMENT_SNAPSHOT, judgments: {} })).toBe(false)
	})
	it.each(INVALID_JUDGMENTS)(
		'refuses malformed record %# in isolation and in a snapshot',
		(record) => {
			expect(isJudgment(record)).toBe(false)
			expect(isConversationSnapshot({ ...JUDGMENT_SNAPSHOT, judgments: [record] })).toBe(false)
		},
	)
	it('contains unreadable fields and cyclic questions at the storage boundary', () => {
		const hostile = new Proxy(JUDGMENT_RECORD, {
			get() {
				throw new Error('unreadable')
			},
		})
		expect(isJudgment(hostile)).toBe(false)
		expect(isConversationSnapshot({ ...JUDGMENT_SNAPSHOT, judgments: [hostile] })).toBe(false)
		const cycle: Record<string, unknown> = {}
		cycle.self = cycle
		expect(
			isJudgment({ ...JUDGMENT_RECORD, question: { form: 'noul', instructions: cycle } }),
		).toBe(false)
		expect(
			isConversationSnapshot(
				new Proxy(JUDGMENT_SNAPSHOT, {
					get() {
						throw new Error('unreadable')
					},
				}),
			),
		).toBe(false)
	})
})

// The conversation read-boundary guards — `isSection` and `isConversationSnapshot`. Each is
// TOTAL: adversarial input returns `false` and never throws, so an untrusted storage read narrows
// through a guard rather than an assertion. Real data throughout — `buildConversationSnapshot`
// produces a genuine compacted conversation, no mocks.

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

	it('rejects a sparse messages array, as the snapshot guard rejects one', () => {
		const sparse: unknown[] = []
		sparse.length = 1
		expect(isSection({ id: 's', summary: 'recap', messages: sparse })).toBe(false)
		expect(isConversationSnapshot({ id: 'c', sections: [], messages: sparse })).toBe(false)
	})

	it('returns false for a throwing getter and a revoked proxy without throwing', () => {
		let sectionReads = 0
		let snapshotReads = 0
		const revoked = Proxy.revocable({}, {})
		revoked.revoke()
		expect(
			isSection({
				id: 's',
				summary: 'recap',
				get messages(): never {
					sectionReads += 1
					throw new Error('unreadable')
				},
			}),
		).toBe(false)
		expect(sectionReads).toBe(1)
		expect(isSection(revoked.proxy)).toBe(false)
		expect(
			isConversationSnapshot({
				id: 'c',
				sections: [
					{
						id: 's',
						summary: 'recap',
						get messages(): never {
							snapshotReads += 1
							throw new Error('unreadable')
						},
					},
				],
				messages: [],
			}),
		).toBe(false)
		expect(snapshotReads).toBe(1)
	})
})

describe('isConversationSnapshot — the read-boundary guard (total + defensive)', () => {
	it('accepts a real snapshot (sections + tail)', async () => {
		expect(isConversationSnapshot(await buildConversationSnapshot())).toBe(true)
		// An empty-sections + empty-tail snapshot is still valid (a fresh conversation, no summary).
		expect(isConversationSnapshot({ id: 'c', sections: [], messages: [] })).toBe(true)
		expect(isConversationSnapshot(TOOL_SNAPSHOT)).toBe(true)
	})

	it('admits the conversation summary a 0.0.29 snapshot carries, as an unknown member', () => {
		expect(isConversationSnapshot(SUMMARIZED_CONVERSATION_SNAPSHOT)).toBe(true)
		expect(isConversationSnapshot({ id: 'c', summary: 7, sections: [], messages: [] })).toBe(true)
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
		expect(isConversationSnapshot(buildCallsSnapshot([null]))).toBe(false)
		expect(isConversationSnapshot(buildCallsSnapshot(['x']))).toBe(false)
		expect(isConversationSnapshot(buildCallsSnapshot([undefined]))).toBe(false)
		expect(isConversationSnapshot(buildCallsSnapshot([42]))).toBe(false)
		expect(
			isConversationSnapshot(buildCallsSnapshot([{ id: 1, name: 'tool', arguments: {} }])),
		).toBe(false)
		expect(
			isConversationSnapshot(buildCallsSnapshot([{ id: 'c1', name: 'tool', arguments: 'q=acme' }])),
		).toBe(false)
		expect(
			isConversationSnapshot(buildCallsSnapshot([{ id: 'c1', name: 'tool', arguments: ['q'] }])),
		).toBe(false)
		expect(isConversationSnapshot(buildCallsSnapshot([{ id: 'c1', name: 'tool' }]))).toBe(false)
		expect(
			isConversationSnapshot(buildCallsSnapshot([{ id: 'c1', name: 123, arguments: {} }])),
		).toBe(false)
		expect(
			isConversationSnapshot(buildCallsSnapshot([{ id: 'c1', name: 'tool', arguments: null }])),
		).toBe(false)
		// The valid control distinguishes malformed calls from supported call shapes.
		expect(
			isConversationSnapshot(
				buildCallsSnapshot([{ id: 'c1', name: 'tool', arguments: { q: 'acme' } }]),
			),
		).toBe(true)
		expect(
			isConversationSnapshot(buildCallsSnapshot([{ id: 'c1', name: 'tool', arguments: {} }])),
		).toBe(true)
	})

	it('accepts a snapshot revived from JSON (the storage-read shape the DB store narrows)', async () => {
		// The exact value a DatabaseConversationStore reads back from its opaque JSON column — a plain
		// object the guard must accept structurally (no class instances required).
		// `JSONSafe` maps the all-optional `NoulCriteria` under a judgment to `never`, so the round trip
		// is typed `unknown`, which is what a read-boundary guard takes.
		const revived = roundTripJSON<unknown>(await buildConversationSnapshot())
		expect(isConversationSnapshot(revived)).toBe(true)
	})
})

describe('isMessage — the per-message shape guard (total + defensive)', () => {
	it('rejects images with a hostile own every method', () => {
		const images = Object.assign([1], { every: approveEvery })
		expect(isMessage({ id: '1', role: 'user', content: '', images })).toBe(false)
	})

	it('accepts an absent or string thinking and refuses any other value', () => {
		expect(
			isMessage({ id: '1', role: 'assistant', content: '', thinking: 'weigh the fares' }),
		).toBe(true)
		expect(isMessage({ id: '1', role: 'assistant', content: '' })).toBe(true)
		expect(isMessage({ id: '1', role: 'assistant', content: '', thinking: 1 })).toBe(false)
	})

	it('rejects calls with a hostile own every method', () => {
		const calls = Object.assign([null], { every: approveEvery })
		expect(isMessage({ id: '1', role: 'assistant', content: '', calls })).toBe(false)
	})

	it('rejects a throwing proxy and a revoked proxy', () => {
		expect(isMessage(new Proxy({}, { get: throwProxyRead }))).toBe(false)
		const revoked = Proxy.revocable({}, {})
		revoked.revoke()
		expect(isMessage(revoked.proxy)).toBe(false)
		expect(isMessage({ id: '1', role: 'user', content: '', images: revoked.proxy })).toBe(false)
		expect(
			isMessage({
				id: '1',
				role: 'assistant',
				content: '',
				calls: new Proxy([], { get: throwProxyRead }),
			}),
		).toBe(false)
	})

	it('rejects an arbitrary role outside the domain union', () => {
		expect(isMessage({ id: '1', role: 'other', content: '' })).toBe(false)
	})

	it('rejects a non-string image element', () => {
		expect(isMessage({ id: '1', role: 'user', content: '', images: [1] })).toBe(false)
	})

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
		expect(isMessage({ id: 'm1', role: 'developer', content: 'hi' })).toBe(false)
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

	it('accepts a string call on a tool message and on every other role the flat type admits', () => {
		expect(isMessage({ id: 't1', role: 'tool', content: 'sunny', call: 'call-weather' })).toBe(true)
		expect(isMessage({ id: 't1', role: 'tool', content: 'sunny' })).toBe(true)
		expect(isMessage({ id: 'u1', role: 'user', content: 'hi', call: 'call-weather' })).toBe(true)
	})

	it('rejects a non-string call', () => {
		expect(isMessage({ id: 't1', role: 'tool', content: 'sunny', call: 7 })).toBe(false)
		expect(isMessage({ id: 't1', role: 'tool', content: 'sunny', call: null })).toBe(false)
		expect(isMessage({ id: 't1', role: 'tool', content: 'sunny', call: ['call-weather'] })).toBe(
			false,
		)
		expect(
			isMessage({
				id: 't1',
				role: 'tool',
				content: 'sunny',
				call: { id: 'call-weather', name: 'weather', arguments: {} },
			}),
		).toBe(false)
	})
})
