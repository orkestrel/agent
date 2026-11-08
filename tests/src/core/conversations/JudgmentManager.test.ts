import type { JSONRecord } from '@orkestrel/contract'
import type { JudgeInterface, Judgment, JudgeRequest } from '@src/core'
import {
	createConversation,
	isConversationError,
	isJudgeAbortError,
	isJudgment,
	JudgmentManager,
	JudgeAbortError,
} from '@src/core'
import { arrayOf, canonicalStringify, parseJSONAs } from '@orkestrel/contract'
import { captureError, requireValue } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import {
	buildSystemOnePositions,
	JUDGMENT_INPUT,
	JUDGMENT_QUESTION,
	JUDGMENT_RECORD,
	JUDGMENT_USAGE,
	createRecordedJudge,
	SilentJudge,
	SequentialSystemOneJudge,
	createFailingJudge,
	createSettledJudge,
	SYSTEM_ONE_JUDGE_REQUEST,
	SYSTEM_ONE_JUDGE_OBJECT,
	SYSTEM_ONE_OBJECT,
	SYSTEM_ONE_TEV1,
	SYSTEM_ONE_TEV1_REQUEST,
	TEV1_CHOICE,
	TEV1_NOUL,
	TEV1_SCORE,
} from '../../../setup.js'

describe('JudgmentManager — the write door', () => {
	const noul = { form: 'noul' } as const
	const input = { id: 'q', question: noul, model: 'judge', sources: [], state: 'text' }

	it.each([
		['a noul out of bounds', noul, { form: 'noul', noul: 2 }, 'max'],
		[
			'a form that is not the question form',
			noul,
			{ form: 'score', probabilities: [0.5, 0.5] },
			'type',
		],
		[
			'a choice missing a criterion',
			{ form: 'choice', criteria: { a: null, b: null } },
			{ form: 'choice', probabilities: { a: 1 } },
			'missing',
		],
		[
			'a choice with an undeclared key',
			{ form: 'choice', criteria: { a: null, b: null } },
			{ form: 'choice', probabilities: { a: 0.5, b: 0.5, c: 0 } },
			'extra',
		],
		[
			'a score shorter than its levels',
			{ form: 'score', criteria: ['low', 'high'] },
			{ form: 'score', probabilities: [1] },
			'min',
		],
		[
			'a score probability below zero',
			{ form: 'score', criteria: ['low', 'high'] },
			{ form: 'score', probabilities: [-0.5, 1] },
			'min',
		],
	])('refuses %s with faults', (_title, question, answer, finding) => {
		const manager = new JudgmentManager()
		const error = captureError(() =>
			Reflect.apply(manager.add, manager, [{ ...input, question, answer }]),
		)
		expect(isConversationError(error) && error.code).toBe('JUDGMENT')
		expect(
			JSON.stringify(isConversationError(error) ? error.context?.faults : undefined),
		).toContain(finding)
		expect(manager.count).toBe(0)
	})

	it('refuses a stored noul answer outside its shape bounds', () => {
		const stored = { ...input, answer: { form: 'noul', noul: 2 } as const, time: 1 }
		expect(captureError(() => new JudgmentManager([stored]))).toSatisfy(
			(error: unknown) => isConversationError(error) && error.code === 'JUDGMENT',
		)
	})

	it('refuses an empty questions map, as the judge engine does', async () => {
		const manager = new JudgmentManager()
		const error = await manager
			.resolve(
				new SilentJudge(),
				{ state: 'text', questions: {} },
				[],
				new AbortController().signal,
			)
			.catch((caught: unknown) => caught)
		expect(isConversationError(error) && error.code).toBe('JUDGMENT')
	})

	it('refuses a judge that leaves a question neither answered nor refused', async () => {
		const manager = new JudgmentManager()
		const judge = createSettledJudge({ model: 'judge', answers: {} })
		const error = await manager
			.resolve(judge, { state: 'text', questions: { q: noul } }, [], new AbortController().signal)
			.catch((caught: unknown) => caught)
		expect(isConversationError(error) && error.code).toBe('JUDGMENT')
		expect(isConversationError(error) && error.context).toEqual({ questions: ['q'] })
	})

	it.each([
		['an undefined answer', { model: 'judge', answers: { q: undefined } }],
		['an undefined refusal', { model: 'judge', answers: {}, refusals: { q: undefined } }],
		['both undefined', { model: 'judge', answers: { q: undefined }, refusals: { q: undefined } }],
	])('refuses a settled result whose question holds %s', async (_, result) => {
		const manager = new JudgmentManager()
		const judge: JudgeInterface = Reflect.apply(createSettledJudge, undefined, [result])
		const error = await manager
			.resolve(judge, { state: 'text', questions: { q: noul } }, [], new AbortController().signal)
			.catch((caught: unknown) => caught)
		expect(isConversationError(error) && error.code).toBe('JUDGMENT')
		expect(isConversationError(error) && error.context).toEqual({ questions: ['q'] })
		expect(manager.judgments()).toEqual([])
	})

	it('stores nothing from an abort partial holding an undefined answer, which its guard refuses', async () => {
		const manager = new JudgmentManager()
		const judge = createFailingJudge(
			Reflect.construct(JudgeAbortError, [
				{ model: 'judge', answers: { q: { form: 'noul', noul: 0.5 }, r: undefined } },
			]),
		)
		await expect(
			manager.resolve(
				judge,
				{ state: 'text', questions: { q: noul, r: noul } },
				[],
				new AbortController().signal,
			),
		).rejects.toBeInstanceOf(JudgeAbortError)
		expect(manager.judgments()).toEqual([])
	})

	it('stores an abort partial that answers only some of its questions', async () => {
		const manager = new JudgmentManager()
		const judge = createFailingJudge(
			new JudgeAbortError({ model: 'judge', answers: { q: { form: 'noul', noul: 0.5 } } }),
		)
		await manager
			.resolve(
				judge,
				{ state: 'text', questions: { q: noul, r: noul } },
				[],
				new AbortController().signal,
			)
			.catch(() => undefined)
		expect(manager.judgments().map((one) => one.id)).toEqual(['q'])
	})
})

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
		const { judge, transport } = createRecordedJudge({
			response: {
				...SYSTEM_ONE_TEV1,
				answers: buildSystemOnePositions(SYSTEM_ONE_TEV1.answers, ['label', 'severity']),
			},
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
			questions: buildSystemOnePositions(SYSTEM_ONE_TEV1_REQUEST.questions, ['label', 'severity']),
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
		const { judge, transport } = createRecordedJudge({
			respond: (recorded) =>
				Response.json({
					...SYSTEM_ONE_TEV1,
					answers: buildSystemOnePositions(
						SYSTEM_ONE_TEV1.answers,
						recorded.requests.length === 1 ? ['label', 'refund', 'severity'] : ['refund'],
					),
				}),
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
			questions: buildSystemOnePositions(SYSTEM_ONE_TEV1_REQUEST.questions, ['refund']),
		})
	})

	it('serializes structured state and reuses only the unchanged state and source order', async () => {
		const { judge, transport } = createRecordedJudge({
			response: {
				...SYSTEM_ONE_OBJECT,
				answers: buildSystemOnePositions(SYSTEM_ONE_OBJECT.answers),
			},
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

	it('reuses a hydrated judgment whose keys were sorted', async () => {
		const { judge, transport } = createRecordedJudge({
			respond: (recorded) =>
				Response.json({
					...SYSTEM_ONE_TEV1,
					answers: buildSystemOnePositions(
						SYSTEM_ONE_TEV1.answers,
						recorded.requests.length === 1 ? ['label', 'refund', 'severity'] : ['refund'],
					),
				}),
		})
		const first = new JudgmentManager()
		await first.resolve(judge, SYSTEM_ONE_JUDGE_REQUEST, ['a'], new AbortController().signal)
		const sorted = requireValue(
			parseJSONAs(requireValue(canonicalStringify(first.judgments())), arrayOf(isJudgment)),
		)
		const manager = new JudgmentManager(sorted)
		expect(Object.keys(requireValue(manager.judgment('refund')).question)[0]).toBe('criteria')
		await manager.resolve(judge, SYSTEM_ONE_JUDGE_REQUEST, ['a'], new AbortController().signal)
		expect(transport.requests).toHaveLength(1)
		await manager.resolve(
			judge,
			{
				...SYSTEM_ONE_JUDGE_REQUEST,
				questions: {
					...SYSTEM_ONE_JUDGE_REQUEST.questions,
					refund: {
						form: 'noul',
						instructions: 'Does the customer ask for money back?',
						criteria: {
							true: 'The customer asks to be repaid.',
							false: 'The customer does not ask for money back.',
						},
					},
				},
			},
			['a'],
			new AbortController().signal,
		)
		expect(transport.requests).toHaveLength(2)
	})

	it('records completed partial answers before propagating the original judge abort', async () => {
		const controller = new AbortController()
		const { judge, transport } = createRecordedJudge({
			create: (options) => new SequentialSystemOneJudge({ ...options, batch: false }),
			respond: (recorded) => {
				if (recorded.requests.length === 2) controller.abort()
				return Response.json({
					...SYSTEM_ONE_TEV1,
					answers: buildSystemOnePositions(
						SYSTEM_ONE_TEV1.answers,
						recorded.requests.length === 1 ? ['label'] : ['refund'],
					),
				})
			},
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
		const judge = new SilentJudge()
		const manager = new JudgmentManager()
		await expect(
			manager.resolve(judge, SYSTEM_ONE_JUDGE_REQUEST, [], AbortSignal.abort()),
		).rejects.toBeInstanceOf(JudgeAbortError)
		expect(judge.requests).toHaveLength(0)
		expect(manager.count).toBe(0)
	})

	it('refuses a state JSON cannot carry with the JUDGMENT code before asking', async () => {
		const judge = new SilentJudge()
		const manager = new JudgmentManager()
		const state: JSONRecord = new Proxy(
			{},
			{
				ownKeys() {
					throw new Error('unreadable')
				},
			},
		)

		await expect(
			manager.resolve(
				judge,
				{ state, questions: { refund: JUDGMENT_QUESTION } },
				[],
				new AbortController().signal,
			),
		).rejects.toSatisfy(
			(error: unknown) =>
				isConversationError(error) && error.code === 'JUDGMENT' && error.context === undefined,
		)
		expect(judge.requests).toHaveLength(0)
		expect(manager.count).toBe(0)
	})

	it('refuses a malformed question with the JUDGMENT code naming the question, before asking', async () => {
		const judge = new SilentJudge()
		const manager = new JudgmentManager()

		await expect(
			manager.resolve(
				judge,
				{
					state: 'Charged twice',
					questions: {
						refund: JUDGMENT_QUESTION,
						label: { form: 'choice', criteria: { billing: null } },
					},
				},
				[],
				new AbortController().signal,
			),
		).rejects.toSatisfy(
			(error: unknown) =>
				isConversationError(error) &&
				error.code === 'JUDGMENT' &&
				error.context?.question === 'label',
		)
		expect(judge.requests).toHaveLength(0)
		expect(manager.count).toBe(0)
	})

	it('propagates a judge failure that is not an abort and records nothing', async () => {
		const { judge, transport } = createRecordedJudge({
			respond: () => new Response('unavailable', { status: 503 }),
		})
		const manager = new JudgmentManager()

		const error: unknown = await manager
			.resolve(judge, SYSTEM_ONE_JUDGE_REQUEST, ['a'], new AbortController().signal)
			.catch((cause: unknown) => cause)

		expect(error).toBeInstanceOf(Error)
		expect(isJudgeAbortError(error)).toBe(false)
		expect(transport.requests).toHaveLength(1)
		expect(manager.count).toBe(0)
	})

	it('returns every cached record under an aborted signal without asking', async () => {
		const judge = new SilentJudge()
		const manager = new JudgmentManager()
		const cached = manager.add({ ...JUDGMENT_INPUT, model: judge.model, sources: ['a'] })

		const records = await manager.resolve(
			judge,
			{ state: JUDGMENT_INPUT.state, questions: { refund: JUDGMENT_QUESTION } },
			['a'],
			AbortSignal.abort(),
		)

		expect(records).toEqual([cached])
		expect(judge.requests).toHaveLength(0)
	})

	it('refuses an empty question set without asking', async () => {
		const judge = new SilentJudge()
		const manager = new JudgmentManager()

		await expect(
			manager.resolve(
				judge,
				{ state: 'Charged twice', questions: {} },
				[],
				new AbortController().signal,
			),
		).rejects.toSatisfy((error: unknown) => isConversationError(error) && error.code === 'JUDGMENT')
		expect(judge.requests).toHaveLength(0)
		expect(manager.count).toBe(0)
	})

	it('owns a proxied request through JSON before comparing or asking', async () => {
		const { judge, transport } = createRecordedJudge()
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

	it('refuses a hole in the restored list with the JUDGMENT code, as a for…of visits it as an undefined record', () => {
		const judgments: Judgment[] = []
		judgments[1] = JUDGMENT_RECORD
		const error = captureError(() => new JudgmentManager(judgments))
		expect(isConversationError(error)).toBe(true)
		expect(error).toMatchObject({ code: 'JUDGMENT' })
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

describe('JudgmentManager — frozen records', () => {
	it('reads one frozen record on every read', () => {
		const manager = new JudgmentManager()
		manager.add(JUDGMENT_INPUT)
		const record = requireValue(manager.judgment('refund'))
		expect(manager.judgment('refund')).toBe(record)
		expect(record.question.criteria).toEqual(JUDGMENT_QUESTION.criteria)
		expect(Object.isFrozen(record)).toBe(true)
		expect(Object.isFrozen(record.question)).toBe(true)
		expect(Object.isFrozen(record.question.criteria)).toBe(true)
		expect(Object.isFrozen(requireValue(record.answer))).toBe(true)
		expect(Object.isFrozen(record.sources)).toBe(true)
	})

	it('lists frozen records in a fresh array', () => {
		const manager = new JudgmentManager()
		manager.add([
			{ ...JUDGMENT_INPUT, id: 'first' },
			{ ...JUDGMENT_INPUT, id: 'second' },
		])
		const listed = manager.judgments()
		expect(manager.judgments()).not.toBe(listed)
		expect(listed.map((record) => record.id)).toEqual(['first', 'second'])
		expect(listed[0]).toBe(manager.judgment('first'))
		expect(listed[1]).toBe(manager.judgment('second'))
		expect(listed.every((record) => Object.isFrozen(record))).toBe(true)
	})

	it('refuses a nested write to a read record', () => {
		const manager = new JudgmentManager()
		const added = manager.add(JUDGMENT_INPUT)
		const record = requireValue(manager.judgment('refund'))
		expect(Reflect.set(record.question, 'instructions', 'changed')).toBe(false)
		expect(Reflect.set(record.sources, '0', 'changed')).toBe(false)
		expect(Reflect.defineProperty(requireValue(record.answer), 'noul', { value: 0 })).toBe(false)
		expect(manager.judgment('refund')).toEqual({ ...JUDGMENT_INPUT, time: added.time })
	})

	it('freezes a restored record, not its input', () => {
		const input: Judgment = {
			...JUDGMENT_RECORD,
			question: { ...JUDGMENT_QUESTION },
			answer: { form: 'noul', noul: 0.9 },
			sources: ['message-a', 'message-b'],
		}
		const record = requireValue(new JudgmentManager([input]).judgment('refund'))
		expect(record).toEqual(input)
		expect(Object.isFrozen(record)).toBe(true)
		expect(Object.isFrozen(record.question)).toBe(true)
		expect(Object.isFrozen(record.sources)).toBe(true)
		expect(Object.isFrozen(input)).toBe(false)
		expect(Object.isFrozen(input.question)).toBe(false)
		expect(Object.isFrozen(input.sources)).toBe(false)
	})

	it('returns the stored record from add', () => {
		const manager = new JudgmentManager()
		const added = manager.add(JUDGMENT_INPUT)
		expect(added).toBe(manager.judgment('refund'))
		expect(Object.isFrozen(added)).toBe(true)
		const batch = manager.add([
			{ ...JUDGMENT_INPUT, id: 'first' },
			{ ...JUDGMENT_INPUT, id: 'second' },
		])
		expect(batch[0]).toBe(manager.judgment('first'))
		expect(batch[1]).toBe(manager.judgment('second'))
	})

	it('resolves to the stored frozen records', async () => {
		const { judge, transport } = createRecordedJudge({
			response: {
				...SYSTEM_ONE_TEV1,
				answers: buildSystemOnePositions(SYSTEM_ONE_TEV1.answers, ['label', 'severity']),
			},
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
		expect(transport.requests).toHaveLength(1)
		expect(records.map((record) => record.id)).toEqual(['label', 'refund', 'severity'])
		expect(records[0]).toBe(manager.judgment('label'))
		expect(records[1]).toBe(cached)
		expect(records[1]).toBe(manager.judgment('refund'))
		expect(records[2]).toBe(manager.judgment('severity'))
		expect(records.every((record) => Object.isFrozen(record))).toBe(true)
	})
})
