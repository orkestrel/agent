import type { Judgment, JudgeRequest } from '@src/core'
import {
	createConversation,
	createSystemOneJudge,
	isJudgeAbortError,
	JudgmentManager,
	JudgeAbortError,
} from '@src/core'
import { requireValue } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import {
	JUDGMENT_INPUT,
	JUDGMENT_RECORD,
	JUDGMENT_USAGE,
	RecordedTransport,
	RecordingJudge,
	SequentialSystemOneJudge,
	SYSTEM_ONE_JUDGE_REQUEST,
	SYSTEM_ONE_JUDGE_OBJECT,
	SYSTEM_ONE_OBJECT,
	SYSTEM_ONE_TEV1,
	SYSTEM_ONE_TEV1_REQUEST,
	TEV1_CHOICE,
	TEV1_NOUL,
	TEV1_SCORE,
} from '../../../setup.js'

describe('JudgmentManager', () => {
	it('stamps additions, replaces keys in insertion order, and removes every batch key', () => {
		const manager = new JudgmentManager()
		const before = Date.now()
		const first = manager.add(JUDGMENT_INPUT)
		expect(first.time).toBeGreaterThanOrEqual(before)
		expect(first.time).toBeLessThanOrEqual(Date.now())
		const records = manager.add([
			{ ...JUDGMENT_INPUT, id: 'other' },
			{ ...JUDGMENT_INPUT, state: 'replacement' },
		])
		expect(manager.count).toBe(2)
		expect(manager.judgments()).toEqual([records[1], records[0]])
		expect(manager.judgment('refund')).toEqual(records[1])
		expect(manager.remove(['missing', 'refund'])).toBe(false)
		expect(manager.judgment('refund')).toBeUndefined()
		expect(manager.remove('other')).toBe(true)
		expect(manager.remove([])).toBe(true)
		expect(manager.remove('other')).toBe(false)
		manager.add(JUDGMENT_INPUT)
		manager.clear()
		expect(manager.count).toBe(0)
		expect(manager.judgments()).toEqual([])
	})

	it('owns nested input and returned records and preserves restored times', () => {
		const input = { ...JUDGMENT_INPUT, sources: ['message-a', 'message-b'] }
		const manager = new JudgmentManager([JUDGMENT_RECORD])
		expect(manager.judgment('refund')).toEqual(JUDGMENT_RECORD)
		const added = manager.add(input)
		input.sources.reverse()
		Reflect.set(added.sources, '0', 'changed')
		Reflect.set(requireValue(manager.judgment('refund')).question, 'instructions', 'changed')
		expect(manager.judgment('refund')).toEqual({ ...JUDGMENT_INPUT, time: added.time })
	})

	it('asks only unmatched questions, records them, and returns request order without batch usage', async () => {
		const transport = new RecordedTransport(() => Response.json(SYSTEM_ONE_TEV1))
		const judge = createSystemOneJudge({
			url: 'http://judge.test',
			model: 'tev1:0.8b',
			fetch: transport.fetch,
		})
		const manager = new JudgmentManager()
		const cached = manager.add({
			id: 'refund',
			question: requireValue(SYSTEM_ONE_JUDGE_REQUEST.questions.refund),
			answer: TEV1_NOUL,
			model: judge.model,
			sources: JUDGMENT_INPUT.sources,
			state: SYSTEM_ONE_TEV1_REQUEST.state,
		})
		const records = await manager.resolve(
			judge,
			SYSTEM_ONE_JUDGE_REQUEST,
			JUDGMENT_INPUT.sources,
			new AbortController().signal,
		)
		expect(records.map((record) => record.id)).toEqual(['label', 'refund', 'severity'])
		expect(records.map((record) => record.answer)).toEqual([TEV1_CHOICE, TEV1_NOUL, TEV1_SCORE])
		expect(records[1]).toEqual(cached)
		expect(records.every((record) => record.usage === undefined)).toBe(true)
		expect(manager.count).toBe(3)
		expect(await requireValue(transport.requests[0]).json()).toEqual({
			...SYSTEM_ONE_TEV1_REQUEST,
			questions: {
				label: SYSTEM_ONE_TEV1_REQUEST.questions.label,
				severity: SYSTEM_ONE_TEV1_REQUEST.questions.severity,
			},
		})
		expect(
			await manager.resolve(
				judge,
				SYSTEM_ONE_JUDGE_REQUEST,
				JUDGMENT_INPUT.sources,
				new AbortController().signal,
			),
		).toEqual(records)
		expect(transport.requests).toHaveLength(1)
	})

	it('attaches usage when the unmatched sub-request carries one question', async () => {
		const transport = new RecordedTransport(() => Response.json(SYSTEM_ONE_TEV1))
		const judge = createSystemOneJudge({
			url: 'http://judge.test',
			model: 'tev1:0.8b',
			fetch: transport.fetch,
		})
		const manager = new JudgmentManager()
		await manager.resolve(judge, SYSTEM_ONE_JUDGE_REQUEST, [], new AbortController().signal)
		manager.remove('refund')
		const result = await manager.resolve(
			judge,
			SYSTEM_ONE_JUDGE_REQUEST,
			[],
			new AbortController().signal,
		)
		expect(result[1]?.usage).toEqual(JUDGMENT_USAGE)
		expect(result[0]).not.toHaveProperty('usage')
		expect(result[2]).not.toHaveProperty('usage')
		expect(transport.requests).toHaveLength(2)
		expect(await requireValue(transport.requests[1]).json()).toEqual({
			...SYSTEM_ONE_TEV1_REQUEST,
			questions: { refund: SYSTEM_ONE_TEV1_REQUEST.questions.refund },
		})
	})

	it('serializes structured state and reuses only the unchanged state and source order', async () => {
		const transport = new RecordedTransport(() => Response.json(SYSTEM_ONE_OBJECT))
		const judge = createSystemOneJudge({
			url: 'http://judge.test',
			model: 'tev1:0.8b',
			fetch: transport.fetch,
		})
		const manager = new JudgmentManager()
		const first = await manager.resolve(
			judge,
			SYSTEM_ONE_JUDGE_OBJECT,
			['a', 'b'],
			new AbortController().signal,
		)
		expect(first[0]?.state).toBe('{"message":"Hi, I was charged twice","plan":"pro"}')
		await manager.resolve(judge, SYSTEM_ONE_JUDGE_OBJECT, ['a', 'b'], new AbortController().signal)
		expect(transport.requests).toHaveLength(1)
		await manager.resolve(
			judge,
			{ ...SYSTEM_ONE_JUDGE_OBJECT, state: { message: 'Changed', plan: 'pro' } },
			['a', 'b'],
			new AbortController().signal,
		)
		await manager.resolve(judge, SYSTEM_ONE_JUDGE_OBJECT, ['b', 'a'], new AbortController().signal)
		expect(transport.requests).toHaveLength(3)
	})

	it('records completed partial answers before propagating the original judge abort', async () => {
		const controller = new AbortController()
		const transport = new RecordedTransport(() => {
			if (transport.requests.length === 2) controller.abort()
			return Response.json(SYSTEM_ONE_TEV1)
		})
		const judge = new SequentialSystemOneJudge({
			url: 'http://judge.test',
			model: 'tev1:0.8b',
			batch: false,
			fetch: transport.fetch,
		})
		const manager = new JudgmentManager()
		const error: unknown = await manager
			.resolve(judge, SYSTEM_ONE_JUDGE_REQUEST, ['a'], controller.signal)
			.catch((cause: unknown) => cause)
		expect(error).toBeInstanceOf(JudgeAbortError)
		if (!isJudgeAbortError(error)) throw new Error('expected judge abort')
		expect(error.partial).toEqual({
			model: 'tev1:0.8b',
			answers: { label: TEV1_CHOICE },
			usage: JUDGMENT_USAGE,
		})
		expect(manager.judgments()).toEqual([
			{
				id: 'label',
				question: SYSTEM_ONE_JUDGE_REQUEST.questions.label,
				answer: TEV1_CHOICE,
				model: 'tev1:0.8b',
				sources: ['a'],
				state: SYSTEM_ONE_TEV1_REQUEST.state,
				time: expect.any(Number),
			},
		])
		expect(transport.requests).toHaveLength(2)
	})

	it('checks cancellation before asking and leaves the store unchanged', async () => {
		// The recording judge answers an aborted signal like any other, so a request it never
		// received proves the manager's own check, not the engine's.
		const judge = new RecordingJudge()
		const manager = new JudgmentManager()
		await expect(
			manager.resolve(judge, SYSTEM_ONE_JUDGE_REQUEST, [], AbortSignal.abort()),
		).rejects.toBeInstanceOf(JudgeAbortError)
		expect(judge.requests).toHaveLength(0)
		expect(manager.count).toBe(0)
	})

	it('owns a proxied request through JSON before comparing or asking', async () => {
		const transport = new RecordedTransport(() => Response.json(SYSTEM_ONE_TEV1))
		const judge = createSystemOneJudge({
			url: 'http://judge.test',
			model: 'tev1:0.8b',
			fetch: transport.fetch,
		})
		const proxied: JudgeRequest = new Proxy(
			{
				state: SYSTEM_ONE_JUDGE_REQUEST.state,
				questions: new Proxy(SYSTEM_ONE_JUDGE_REQUEST.questions, {}),
			},
			{},
		)
		expect(() => structuredClone(proxied)).toThrow(DOMException)
		const manager = new JudgmentManager()
		const records = await manager.resolve(judge, proxied, [], new AbortController().signal)
		expect(records.map((record) => record.id)).toEqual(['label', 'refund', 'severity'])
		expect(transport.requests).toHaveLength(1)
	})

	it('refuses a record or input that JSON cannot carry with the JUDGMENT code', () => {
		const hostile: Judgment = new Proxy(JUDGMENT_RECORD, {
			get() {
				throw new Error('hostile')
			},
		})
		expect(() => new JudgmentManager([hostile])).toThrow(
			expect.objectContaining({ name: 'ConversationError', code: 'JUDGMENT' }),
		)
		expect(() => new JudgmentManager().add(hostile)).toThrow(
			expect.objectContaining({ name: 'ConversationError', code: 'JUDGMENT' }),
		)
	})

	it('creates an independent manager per conversation and restores snapshot records', () => {
		const conversation = createConversation({
			snapshot: { id: 'saved', sections: [], messages: [], judgments: [JUDGMENT_RECORD] },
		})
		expect(conversation.snapshot().judgments).toEqual([JUDGMENT_RECORD])
		expect(createConversation().judgments.count).toBe(0)
		expect(createConversation().snapshot()).not.toHaveProperty('judgments')
		const restored = createConversation({ snapshot: conversation.snapshot() })
		expect(restored.judgments.judgments()).toEqual([JUDGMENT_RECORD])
		conversation.judgments.clear()
		expect(restored.judgments.count).toBe(1)
	})
})
