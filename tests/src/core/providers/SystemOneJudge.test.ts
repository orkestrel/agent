import type {
	JudgeInterface,
	JudgeRequest,
	SystemOneJudgeOptions,
	SYSTEM_ONE_OPTION_KEYS,
} from '@src/core'
import { isContractError } from '@orkestrel/contract'
import {
	measureAnswer,
	createSystemOneJudge,
	isJudgeError,
	JudgeError,
	SYSTEM_ONE_PATH,
	SystemOneJudge,
} from '@src/core'
import { captureError, requireValue } from '@orkestrel/test'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
	RecordedTransport,
	buildSystemOnePositions,
	buildSystemOneProbabilityCases,
	SYSTEM_ONE_ERRORS,
	SYSTEM_ONE_INVALID_PROBABILITIES,
	SYSTEM_ONE_JUDGE_OBJECT,
	SYSTEM_ONE_JUDGE_REQUEST,
	SYSTEM_ONE_LLAMA,
	SYSTEM_ONE_MICA,
	SYSTEM_ONE_OBJECT,
	SYSTEM_ONE_OBJECT_REQUEST,
	SYSTEM_ONE_PROTOCOL_CASES,
	SYSTEM_ONE_QUICKSTART_STATE,
	SYSTEM_ONE_TEV1,
	SYSTEM_ONE_TEV1_REQUEST,
	TEV1_ANSWERS,
	buildOptionDoors,
	readDoorRefusal,
} from '../../../setup.js'

describe('SystemOneJudge — what it refuses', () => {
	it('throws PROTOCOL on a malformed envelope, naming what it read, bounded', () => {
		const judge = new SystemOneJudge({
			url: 'http://judge.test',
			model: 'tev1:0.8b',
		})
		const error = captureError(() =>
			judge.read({ answers: 'x'.repeat(4000) }, { state: 'text', questions: {} }),
		)
		expect(isJudgeError(error) && error.code).toBe('PROTOCOL')
		expect(isJudgeError(error) && error.message).toContain('received')
		expect(isJudgeError(error) && error.message.length).toBeLessThan(200)
	})
})

describe('SystemOneJudge', () => {
	it('encodes identical bytes for equivalent questions under different caller ids', () => {
		const judge = new SystemOneJudge({ url: 'http://judge.test', model: 'tev1:0.8b' })
		const renamed = {
			...SYSTEM_ONE_JUDGE_REQUEST,
			questions: Object.fromEntries(
				Object.values(SYSTEM_ONE_JUDGE_REQUEST.questions).map((question, index) => [
					`caller-${index}`,
					question,
				]),
			),
		}
		expect(JSON.stringify(judge.encode(renamed))).toBe(
			JSON.stringify(judge.encode(SYSTEM_ONE_JUDGE_REQUEST)),
		)
		expect(Object.keys(judge.encode(renamed).questions)).toEqual(['0', '1', '2'])
	})
	it('maps positional answers to caller ids in request order and names a missing caller id', () => {
		const judge = new SystemOneJudge({ url: 'http://judge.test', model: 'tev1:0.8b' })
		const result = judge.read(
			{
				answers: {
					0: SYSTEM_ONE_TEV1.answers.label,
					1: SYSTEM_ONE_TEV1.answers.refund,
					2: SYSTEM_ONE_TEV1.answers.severity,
				},
			},
			SYSTEM_ONE_JUDGE_REQUEST,
		)
		expect(Object.keys(result.answers)).toEqual(['label', 'refund', 'severity'])
		expect(result.answers).toEqual(TEV1_ANSWERS)
		expect(() =>
			judge.read({ answers: { 0: SYSTEM_ONE_TEV1.answers.label } }, SYSTEM_ONE_JUDGE_REQUEST),
		).toThrow('question refund has no System One answer')
	})
	it('projects the TypeSafe quickstart with no extra members', () => {
		const judge = new SystemOneJudge({ url: 'https://api.typesafe.ai', model: 'jev-latest' })
		expect(judge.name).toBe('systemone')
		expect(judge.model).toBe('jev-latest')
		expect(
			judge.encode({
				state: SYSTEM_ONE_QUICKSTART_STATE,
				questions: {
					urgency: { form: 'noul', instructions: 'Does this message express urgency?' },
				},
			}),
		).toEqual({
			state: SYSTEM_ONE_QUICKSTART_STATE,
			model: 'jev-latest',
			questions: { 0: { type: 'noul', instructions: 'Does this message express urgency?' } },
		})
	})

	it('posts the exact recorded request once with authentication and decodes the recorded response', async () => {
		const transport = new RecordedTransport(() =>
			Response.json({
				...SYSTEM_ONE_TEV1,
				answers: buildSystemOnePositions(SYSTEM_ONE_TEV1.answers),
			}),
		)
		const judge = createSystemOneJudge({
			url: 'http://judge.test',
			model: 'tev1:0.8b',
			fetch: transport.fetch,
			headers: () => ({ authorization: 'Bearer fixture-key' }),
		})
		expectTypeOf(judge).toEqualTypeOf<JudgeInterface>()
		expect(judge).toBeInstanceOf(SystemOneJudge)
		const result = await judge.ask(SYSTEM_ONE_JUDGE_REQUEST, new AbortController().signal)
		expect(result).toEqual({
			model: 'tev1:0.8b',
			answers: TEV1_ANSWERS,
			usage: { prompt: 975, completion: 4, total: 979 },
		})
		expect(transport.requests).toHaveLength(1)
		const request = requireValue(transport.requests[0])
		expect(SYSTEM_ONE_PATH).toBe('/v1/systemone')
		expect(request.url).toBe('http://judge.test' + SYSTEM_ONE_PATH)
		expect(request.method).toBe('POST')
		expect(request.headers.get('content-type')).toBe('application/json')
		expect(request.headers.get('authorization')).toBe('Bearer fixture-key')
		expect(await request.json()).toEqual({
			...SYSTEM_ONE_TEV1_REQUEST,
			questions: buildSystemOnePositions(SYSTEM_ONE_TEV1_REQUEST.questions),
		})
		const choice = measureAnswer(requireValue(result.answers.label))
		expect(choice.winner).toBe('bug')
		expect(choice.confidence).toBeCloseTo(0.9536, 4)
		expect(measureAnswer(requireValue(result.answers.severity)).score).toBeCloseTo(0.99192, 5)
	})

	it('preserves the recorded object state and instructions across the request', async () => {
		const transport = new RecordedTransport(() =>
			Response.json({
				...SYSTEM_ONE_OBJECT,
				answers: buildSystemOnePositions(SYSTEM_ONE_OBJECT.answers),
			}),
		)
		const judge = new SystemOneJudge({
			url: 'http://judge.test',
			model: 'tev1:0.8b',
			fetch: transport.fetch,
		})
		expect(judge.encode(SYSTEM_ONE_JUDGE_OBJECT)).toEqual({
			...SYSTEM_ONE_OBJECT_REQUEST,
			questions: buildSystemOnePositions(SYSTEM_ONE_OBJECT_REQUEST.questions),
		})
		expect(await judge.ask(SYSTEM_ONE_JUDGE_OBJECT, new AbortController().signal)).toEqual({
			model: 'tev1:0.8b',
			answers: {
				intent: {
					form: 'choice',
					probabilities: { refund: 0.672163600162288, other: 0.32783639983771207 },
				},
			},
			usage: { prompt: 148, completion: 1, total: 149 },
		})
		expect(await requireValue(transport.requests[0]).json()).toEqual({
			...SYSTEM_ONE_OBJECT_REQUEST,
			questions: buildSystemOnePositions(SYSTEM_ONE_OBJECT_REQUEST.questions),
		})
	})

	it('decodes transliterated llama.cpp arrays and ignores Mica server measures and extra fields', () => {
		const judge = new SystemOneJudge({ url: 'http://judge.test', model: 'configured' })
		expect(
			judge.read(
				{ ...SYSTEM_ONE_LLAMA, answers: buildSystemOnePositions(SYSTEM_ONE_LLAMA.answers) },
				SYSTEM_ONE_JUDGE_REQUEST,
			),
		).toEqual({
			model: 'tev1:0.8b',
			answers: TEV1_ANSWERS,
			usage: { prompt: 975, completion: 4, total: 979 },
		})
		expect(
			judge.read(
				{ ...SYSTEM_ONE_MICA, answers: buildSystemOnePositions(SYSTEM_ONE_MICA.answers) },
				SYSTEM_ONE_JUDGE_REQUEST,
			),
		).toEqual({
			model: 'mica-v0.1-4b',
			answers: TEV1_ANSWERS,
			usage: { prompt: 975, completion: 0, total: 975 },
		})
	})

	it('reports gateway model names verbatim and falls back only when model is absent', () => {
		const judge = new SystemOneJudge({ url: 'http://judge.test', model: 'jev-latest' })
		expect(
			judge.read(
				{
					...SYSTEM_ONE_TEV1,
					answers: buildSystemOnePositions(SYSTEM_ONE_TEV1.answers),
					model: 'typesafe/jev-1.13.0',
				},
				SYSTEM_ONE_JUDGE_REQUEST,
			).model,
		).toBe('typesafe/jev-1.13.0')
		expect(
			judge.read(
				{ answers: buildSystemOnePositions(SYSTEM_ONE_TEV1.answers) },
				SYSTEM_ONE_JUDGE_REQUEST,
			),
		).toEqual({
			model: 'jev-latest',
			answers: TEV1_ANSWERS,
		})
		expect(
			judge.read(
				{
					answers: buildSystemOnePositions(SYSTEM_ONE_TEV1.answers),
					usage: { input_tokens: null, output_tokens: 4 },
				},
				SYSTEM_ONE_JUDGE_REQUEST,
			),
		).not.toHaveProperty('usage')
		expect(
			judge.read(
				{ answers: buildSystemOnePositions(SYSTEM_ONE_TEV1.answers), usage: { input_tokens: 975 } },
				SYSTEM_ONE_JUDGE_REQUEST,
			),
		).not.toHaveProperty('usage')
	})

	it.each(SYSTEM_ONE_PROTOCOL_CASES)(
		'names $id for a missing, incomplete, or mismatched answer',
		({ id, answers }) => {
			const judge = new SystemOneJudge({ url: 'http://judge.test', model: 'tev1:0.8b' })
			const error = captureError(() =>
				judge.read(
					{
						answers: buildSystemOnePositions(
							answers,
							Object.keys(SYSTEM_ONE_JUDGE_REQUEST.questions),
						),
					},
					SYSTEM_ONE_JUDGE_REQUEST,
				),
			)
			expect(error).toBeInstanceOf(JudgeError)
			if (!isJudgeError(error)) throw new Error('expected JudgeError')
			expect(error.code).toBe('PROTOCOL')
			expect(error.message).toContain(`question ${id} `)
		},
	)

	it.each(SYSTEM_ONE_INVALID_PROBABILITIES)(
		'names each question for invalid probability %s',
		(probability) => {
			const judge = new SystemOneJudge({ url: 'http://judge.test', model: 'tev1:0.8b' })
			const answers = buildSystemOneProbabilityCases(probability)
			for (const [id, answer] of Object.entries(answers)) {
				const error = captureError(() =>
					judge.read(
						{ answers: buildSystemOnePositions({ ...SYSTEM_ONE_TEV1.answers, [id]: answer }) },
						SYSTEM_ONE_JUDGE_REQUEST,
					),
				)
				expect(error).toBeInstanceOf(JudgeError)
				if (!isJudgeError(error)) throw new Error('expected JudgeError')
				expect(error.code).toBe('PROTOCOL')
				expect(error.message).toContain(`question ${id} `)
			}
		},
	)

	it('ignores unrequested answers and safely projects prototype-like ids and labels', () => {
		const judge = new SystemOneJudge({ url: 'http://judge.test', model: 'tev1:0.8b' })
		const request: JudgeRequest = {
			state: ['ticket'],
			questions: {
				['__proto__']: { form: 'choice', criteria: { ['__proto__']: null, other: null } },
			},
		}
		expect(Object.keys(judge.encode(request).questions)).toEqual(['0'])
		expect(
			judge.read(
				{
					answers: {
						0: { type: 'choice', probabilities: { other: 0.1, ['__proto__']: 0.9 } },
						extra: null,
					},
				},
				request,
			),
		).toEqual({
			model: 'tev1:0.8b',
			answers: {
				['__proto__']: { form: 'choice', probabilities: { ['__proto__']: 0.9, other: 0.1 } },
			},
		})
		expect(() => judge.read({ answers: {} }, request)).toThrow('question __proto__')
	})

	it('reports a malformed envelope as a protocol error', () => {
		const judge = new SystemOneJudge({ url: 'http://judge.test', model: 'tev1:0.8b' })
		expect(() => judge.read({ answers: [] }, SYSTEM_ONE_JUDGE_REQUEST)).toThrow(
			'judge error: invalid System One response envelope; received',
		)
	})

	it.each(SYSTEM_ONE_ERRORS)(
		'preserves recorded HTTP $status error text: $body.error',
		async ({ status, body }) => {
			const transport = new RecordedTransport(() => Response.json(body, { status }))
			const judge = createSystemOneJudge({
				url: 'http://judge.test',
				model: 'tev1:0.8b',
				fetch: transport.fetch,
			})
			await expect(
				judge.ask(SYSTEM_ONE_JUDGE_REQUEST, new AbortController().signal),
			).rejects.toMatchObject({
				name: 'JudgeError',
				code: 'HTTP',
				status: 400,
				message: expect.stringContaining(JSON.stringify(body)),
			})
			expect(transport.requests).toHaveLength(1)
		},
	)
})

describe('SystemOneJudge — the census door refuses a member its type does not declare', () => {
	it.each(
		buildOptionDoors().filter(
			(door) => door.owner === 'SystemOneJudge' && ['SystemOneJudgeOptions'].includes(door.shape),
		),
	)('refuses a stray member of $shape with a structure refusal', async (door) => {
		const error = await readDoorRefusal(door)

		expect(isContractError(error) ? [error.code, error.context] : error).toEqual([
			'structure',
			{ path: ['stray'], shape: door.shape },
		])
	})

	it('lists every member each door type declares', () => {
		expectTypeOf<
			Exclude<keyof SystemOneJudgeOptions, (typeof SYSTEM_ONE_OPTION_KEYS)[number]>
		>().toEqualTypeOf<never>()
	})
})
