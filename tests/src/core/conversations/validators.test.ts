import {
	createConversation,
	createConversationManager,
	isConversation,
	isConversationSnapshot,
	isJudgment,
	isMessage,
	JudgmentManager,
} from '@src/core'
import { createRecorder, roundTripJSON } from '@orkestrel/test'
import {
	conversationSnapshotContract,
	isMessageInput,
	judgmentContract,
	messageContract,
	messageInputContract,
} from '@src/core'
import {
	CONVERSATION_SNAPSHOT_FIXTURES,
	MALFORMED_CONVERSATION_SNAPSHOTS,
	buildNonPlainMessages,
	MESSAGE_FIXTURES,
	MESSAGE_REFUSALS,
} from '../../../setup.js'
import { describe, expect, it } from 'vitest'
import {
	approveEvery,
	buildCallsSnapshot,
	buildConversationSnapshot,
	createMalformedConversationCases,
	TOOL_SNAPSHOT,
	JUDGMENT_EDGE_RECORDS,
	JUDGMENT_RECORD,
	JUDGMENT_SNAPSHOT,
	INVALID_JUDGMENTS,
	JUDGMENT_USAGE,
	TEV1_CHOICE,
	TEV1_SCORE,
	throwProxyRead,
} from '../../../setup.js'

describe('isJudgment and snapshot carriage', () => {
	it('refuses unknown judgment members even when JSON can render them', () => {
		expect(isJudgment({ ...JUDGMENT_RECORD, extra: 1n })).toBe(false)
		expect(isJudgment({ ...JUDGMENT_RECORD, extra: 1 })).toBe(false)
		expect(
			isConversationSnapshot({
				...JUDGMENT_SNAPSHOT,
				judgments: [{ ...JUDGMENT_RECORD, extra: 1n }],
			}),
		).toBe(false)
		for (const record of JUDGMENT_SNAPSHOT.judgments ?? []) {
			expect(isJudgment(record)).toBe(true)
			expect(new JudgmentManager([record]).judgments()).toEqual([record])
		}
	})

	it('accepts answers, refusals, usage, and snapshots with or without judgments', () => {
		expect(isJudgment(JUDGMENT_RECORD)).toBe(true)
		expect(isJudgment({ ...JUDGMENT_RECORD, usage: JUDGMENT_USAGE })).toBe(true)
		expect(isJudgment({ ...JUDGMENT_RECORD, answer: TEV1_CHOICE })).toBe(true)
		expect(isJudgment({ ...JUDGMENT_RECORD, answer: TEV1_SCORE })).toBe(true)
		expect(JUDGMENT_SNAPSHOT.judgments?.every(isJudgment)).toBe(true)
		expect(isConversationSnapshot(JUDGMENT_SNAPSHOT)).toBe(true)
		expect(isConversationSnapshot({ id: 'old', messages: [] })).toBe(true)
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
	it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
		'refuses a %s time, noul, or probability, so every accepted record hydrates',
		(value) => {
			const records = [
				{ ...JUDGMENT_RECORD, time: value },
				{ ...JUDGMENT_RECORD, answer: { form: 'noul', noul: value } },
				{ ...JUDGMENT_RECORD, answer: { ...TEV1_SCORE, probabilities: [value, 0.5] } },
				{ ...JUDGMENT_RECORD, answer: { ...TEV1_CHOICE, probabilities: { billing: value } } },
			]
			for (const record of records) {
				expect(isJudgment(record)).toBe(false)
				expect(isConversationSnapshot({ ...JUDGMENT_SNAPSHOT, judgments: [record] })).toBe(false)
			}
			// The finite twins pass the guard and hydrate through the judgment store.
			const finite = [
				JUDGMENT_RECORD,
				{ ...JUDGMENT_RECORD, answer: TEV1_SCORE },
				{ ...JUDGMENT_RECORD, answer: TEV1_CHOICE },
			]
			for (const record of finite) {
				expect(isJudgment(record)).toBe(true)
				expect(new JudgmentManager([record]).judgments()).toEqual([record])
			}
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

	it('pins each judgment verdict by shape', () => {
		expect(JUDGMENT_EDGE_RECORDS.map(([title, record]) => [title, isJudgment(record)])).toEqual(
			JUDGMENT_EDGE_RECORDS.map(([title, , verdict]) => [title, verdict]),
		)
	})
})

// The conversation read-boundary guard — `isConversationSnapshot`. It is TOTAL: adversarial input
// returns `false` and never throws, so an untrusted storage read narrows through a guard rather than
// an assertion. Real data throughout — `buildConversationSnapshot` produces a genuine conversation,
// no mocks.

describe('isConversationSnapshot — the read-boundary guard (total + defensive)', () => {
	it('accepts a real snapshot (messages + judgments)', async () => {
		expect(isConversationSnapshot(await buildConversationSnapshot())).toBe(true)
		// An empty snapshot is still valid (a fresh conversation).
		expect(isConversationSnapshot({ id: 'c', messages: [] })).toBe(true)
		expect(isConversationSnapshot(TOOL_SNAPSHOT)).toBe(true)
	})

	it('refuses the sections and the summary an older snapshot carries, as unknown members', () => {
		expect(isConversationSnapshot({ id: 'c', sections: [], messages: [] })).toBe(false)
		expect(
			isConversationSnapshot({
				id: 'c',
				sections: [{ id: 's', summary: 'recap', messages: [] }],
				messages: [],
			}),
		).toBe(false)
		expect(isConversationSnapshot({ id: 'c', summary: 'recap', messages: [] })).toBe(false)
		expect(isConversationSnapshot({ id: 'c', summary: 7, messages: [] })).toBe(false)
	})

	it('rejects a sparse messages array', () => {
		const sparse: unknown[] = []
		sparse.length = 1
		expect(isConversationSnapshot({ id: 'c', messages: sparse })).toBe(false)
	})

	it('returns false for a throwing getter and a revoked proxy without throwing', () => {
		const reads = createRecorder<readonly [string]>()
		const revoked = Proxy.revocable({}, {})
		revoked.revoke()
		expect(
			isConversationSnapshot({
				id: 'c',
				get messages(): never {
					reads.handler('messages')
					throw new Error('unreadable')
				},
			}),
		).toBe(false)
		expect(reads.calls).toEqual([['messages']])
		expect(isConversationSnapshot(revoked.proxy)).toBe(false)
	})

	it('rejects malformed input without throwing (total guard)', () => {
		// Non-records / primitives / nullish.
		expect(isConversationSnapshot(undefined)).toBe(false)
		expect(isConversationSnapshot(null)).toBe(false)
		expect(isConversationSnapshot(42)).toBe(false)
		expect(isConversationSnapshot('snapshot')).toBe(false)
		// Missing / wrong-typed `id`.
		expect(isConversationSnapshot({ messages: [] })).toBe(false)
		expect(isConversationSnapshot({ id: 1, messages: [] })).toBe(false)
		// `messages` not an array, or missing.
		expect(isConversationSnapshot({ id: 'c', messages: { a: 1 } })).toBe(false)
		expect(isConversationSnapshot({ id: 'c' })).toBe(false)
		// `messages` carries a malformed message element (missing content).
		expect(isConversationSnapshot({ id: 'c', messages: [{ id: 'm', role: 'user' }] })).toBe(false)
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
		expect(
			isMessage({
				id: 'm1',
				role: 'assistant',
				content: '',
				calls: 'nope',
			}),
		).toBe(false)
		expect(
			isMessage({
				id: 'm1',
				role: 'assistant',
				content: '',
				calls: [null],
			}),
		).toBe(false)
		expect(
			isMessage({
				id: 'm1',
				role: 'assistant',
				content: '',
				calls: [{ id: 'c1', name: 'tool' }],
			}),
		).toBe(false)
		expect(
			isMessage({
				id: 'm1',
				role: 'user',
				content: 'see',
				images: 'DATA',
			}),
		).toBe(false)
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

describe('isConversation', () => {
	it('refuses every malformed conversation without throwing', () => {
		for (const [title, value] of createMalformedConversationCases()) {
			expect([title, isConversation(value)]).toEqual([title, false])
		}
	})

	it('accepts created, managed, and extended conversations', () => {
		expect(isConversation(createConversation())).toBe(true)
		expect(isConversation(createConversationManager().add())).toBe(true)
		expect(isConversation(Object.assign(createConversation(), { extra: 1 }))).toBe(true)
	})

	it('accepts a structural conversation without calling it', () => {
		const calls = createRecorder<[]>()
		const conversation = {
			id: 'c1',
			add: calls.handler,
			messages: calls.handler,
		}
		expect(isConversation(conversation)).toBe(true)
		expect(calls.calls).toEqual([])
	})
})

describe('the owned conversation guards, in lockstep with their shapes', () => {
	it.each(MESSAGE_FIXTURES)('holds both ways on the owned message %#', (message) => {
		expect(isMessage(message)).toBe(true)
		expect(messageContract.is(message)).toBe(true)
	})

	it.each(MESSAGE_REFUSALS)('holds is ⟹ guard on the message value %#', (value) => {
		expect(isMessage(value)).toBe(false)
		expect(messageContract.is(value)).toBe(false)
	})

	it.each(CONVERSATION_SNAPSHOT_FIXTURES)(
		'holds both ways on the owned snapshot %#',
		(snapshot) => {
			expect(isConversationSnapshot(snapshot)).toBe(true)
			expect(conversationSnapshotContract.is(snapshot)).toBe(true)
		},
	)

	it.each(MALFORMED_CONVERSATION_SNAPSHOTS)('holds is ⟹ guard on %s', (_title, snapshot) => {
		expect(isConversationSnapshot(snapshot)).toBe(false)
		expect(conversationSnapshotContract.is(snapshot)).toBe(false)
	})

	it('holds both ways on a judgment of the fixtures', () => {
		expect(isJudgment(JUDGMENT_RECORD)).toBe(true)
		expect(judgmentContract.is(JUDGMENT_RECORD)).toBe(true)
	})
})

describe('the owned conversation guards are exact', () => {
	it.each([
		['an unknown snapshot key, as a 0.0.35 summary', { id: 'c', messages: [], summary: 'x' }],
		['the sections key an older snapshot carries', { id: 'c', sections: [], messages: [] }],
		['an own undefined judgments', { id: 'c', messages: [], judgments: undefined }],
		[
			'an unknown message key',
			{
				id: 'c',
				messages: [{ id: 'm', role: 'user', content: '', at: 1 }],
			},
		],
		[
			'an own undefined message optional',
			{
				id: 'c',
				messages: [{ id: 'm', role: 'user', content: '', call: undefined }],
			},
		],
	])('refuses %s', (_title, snapshot) => {
		expect(isConversationSnapshot(snapshot)).toBe(false)
		expect(conversationSnapshotContract.is(snapshot)).toBe(false)
	})

	it.each([
		['a judgment key', { ...JUDGMENT_RECORD, extra: 1 }],
		[
			'an answer key',
			{
				...JUDGMENT_RECORD,
				answer: { form: 'noul', noul: 0.9, why: 'x' },
			},
		],
		[
			'a refusal key',
			{
				...JUDGMENT_RECORD,
				answer: undefined,
				refusal: { missing: [], why: 'x' },
			},
		],
		['a question key', { ...JUDGMENT_RECORD, question: { form: 'noul', extra: 1 } }],
	])('refuses an unknown %s in a judgment', (_title, record) => {
		expect(isJudgment(record)).toBe(false)
	})

	it('refuses noul shape violations while keeping question ties on the write side', () => {
		expect(
			isJudgment({
				...JUDGMENT_RECORD,
				answer: { form: 'noul', noul: 2 },
			}),
		).toBe(false)
		expect(
			isJudgment({
				...JUDGMENT_RECORD,
				question: { form: 'choice', criteria: { a: null, b: null } },
				answer: { form: 'choice', probabilities: { a: 0.5 } },
			}),
		).toBe(true)
	})
})

describe('isMessageInput', () => {
	it('admits each member of its declared type and a ConversationRole', () => {
		expect(isMessageInput({ role: 'user', content: 'hi' })).toBe(true)
		expect(
			isMessageInput({
				role: 'assistant',
				content: '',
				calls: [{ id: 'c', name: 'n', arguments: {} }],
				thinking: 't',
			}),
		).toBe(true)
	})

	it.each([
		[{}],
		[{ role: 'user' }],
		[{ role: 'user', content: 1 }],
		[{ role: 'user', content: '', calls: [{}] }],
		[{ role: 'user', content: '', call: 1 }],
		[{ role: 'user', content: '', images: [1] }],
		[{ role: 'user', content: '', thinking: 1 }],
		// An exact record: a role outside ConversationRole, an undeclared member, and a declared
		// optional member holding undefined each refuse.
		[{ role: 'other', content: 'hi' }],
		[{ role: 'system', content: 'hi' }],
		[{ id: 'm', role: 'user', content: 'hi' }],
		[{ role: 'user', content: 'hi', disclosure: { skills: ['billing'] } }],
		[{ role: 'user', content: 'hi', thinking: undefined }],
		[null],
		[
			new Proxy(
				{},
				{
					get() {
						throw new Error('unreadable')
					},
				},
			),
		],
	])('refuses row %#', (value) => {
		expect(isMessageInput(value)).toBe(false)
	})

	it.each(buildNonPlainMessages())('refuses $name as no plain record (claim F-R6)', ({ input }) => {
		expect(isMessageInput(input)).toBe(false)
	})

	it('holds is ⟹ guard against the input shape', () => {
		for (const { id: _id, ...input } of MESSAGE_FIXTURES) {
			expect(messageInputContract.is(input)).toBe(true)
			expect(isMessageInput(input)).toBe(true)
		}
	})
})
