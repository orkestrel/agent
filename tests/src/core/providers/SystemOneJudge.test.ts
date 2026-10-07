import type { JudgeInterface, JudgeRequest } from '@src/core'
import {
	computeReading,
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
} from '../../../setup.js'

describe('SystemOneJudge', () => {
	it('projects the TypeSafe quickstart with no extra members', () => {
		const judge = new SystemOneJudge({ url: 'https://api.typesafe.ai', model: 'jev-latest' })
		expect(judge.name).toBe('systemone')
		expect(judge.model).toBe('jev-latest')
		expect(
			judge.body({
				state: SYSTEM_ONE_QUICKSTART_STATE,
				questions: {
					urgency: { form: 'noul', instructions: 'Does this message express urgency?' },
				},
			}),
		).toEqual({
			state: SYSTEM_ONE_QUICKSTART_STATE,
			model: 'jev-latest',
			questions: { urgency: { type: 'noul', instructions: 'Does this message express urgency?' } },
		})
	})

	it('posts the exact recorded request once with authentication and decodes the recorded response', async () => {
		const transport = new RecordedTransport(() => Response.json(SYSTEM_ONE_TEV1))
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
		expect(await request.json()).toEqual(SYSTEM_ONE_TEV1_REQUEST)
		const choice = computeReading(requireValue(result.answers.label))
		expect(choice.winner).toBe('bug')
		expect(choice.confidence).toBeCloseTo(0.9536, 4)
		expect(computeReading(requireValue(result.answers.severity)).score).toBeCloseTo(0.99192, 5)
	})

	it('preserves the recorded object state and instructions across the request', async () => {
		const transport = new RecordedTransport(() => Response.json(SYSTEM_ONE_OBJECT))
		const judge = new SystemOneJudge({
			url: 'http://judge.test',
			model: 'tev1:0.8b',
			fetch: transport.fetch,
		})
		expect(judge.body(SYSTEM_ONE_JUDGE_OBJECT)).toEqual(SYSTEM_ONE_OBJECT_REQUEST)
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
		expect(await requireValue(transport.requests[0]).json()).toEqual(SYSTEM_ONE_OBJECT_REQUEST)
	})

	it('decodes transliterated llama.cpp arrays and ignores Mica server measures and extra fields', () => {
		const judge = new SystemOneJudge({ url: 'http://judge.test', model: 'configured' })
		expect(judge.read(SYSTEM_ONE_LLAMA, SYSTEM_ONE_JUDGE_REQUEST)).toEqual({
			model: 'tev1:0.8b',
			answers: TEV1_ANSWERS,
			usage: { prompt: 975, completion: 4, total: 979 },
		})
		expect(judge.read(SYSTEM_ONE_MICA, SYSTEM_ONE_JUDGE_REQUEST)).toEqual({
			model: 'mica-v0.1-4b',
			answers: TEV1_ANSWERS,
			usage: { prompt: 975, completion: 0, total: 975 },
		})
	})

	it('reports gateway model names verbatim and falls back only when model is absent', () => {
		const judge = new SystemOneJudge({ url: 'http://judge.test', model: 'jev-latest' })
		expect(
			judge.read({ ...SYSTEM_ONE_TEV1, model: 'typesafe/jev-1.13.0' }, SYSTEM_ONE_JUDGE_REQUEST)
				.model,
		).toBe('typesafe/jev-1.13.0')
		expect(judge.read({ answers: SYSTEM_ONE_TEV1.answers }, SYSTEM_ONE_JUDGE_REQUEST)).toEqual({
			model: 'jev-latest',
			answers: TEV1_ANSWERS,
		})
		expect(
			judge.read(
				{ answers: SYSTEM_ONE_TEV1.answers, usage: { input_tokens: null, output_tokens: 4 } },
				SYSTEM_ONE_JUDGE_REQUEST,
			),
		).not.toHaveProperty('usage')
		expect(
			judge.read(
				{ answers: SYSTEM_ONE_TEV1.answers, usage: { input_tokens: 975 } },
				SYSTEM_ONE_JUDGE_REQUEST,
			),
		).not.toHaveProperty('usage')
	})

	it.each(SYSTEM_ONE_PROTOCOL_CASES)(
		'names $id for a missing, incomplete, or mismatched answer',
		({ id, answers }) => {
			const judge = new SystemOneJudge({ url: 'http://judge.test', model: 'tev1:0.8b' })
			const error = captureError(() => judge.read({ answers }, SYSTEM_ONE_JUDGE_REQUEST))
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
			const answers = {
				label: { type: 'choice', probabilities: { billing: probability, bug: 0.5, account: 0 } },
				refund: { type: 'noul', noul: probability },
				severity: { type: 'score', probabilities: [0, probability, 0.5] },
			}
			for (const [id, answer] of Object.entries(answers)) {
				const error = captureError(() =>
					judge.read(
						{ answers: { ...SYSTEM_ONE_TEV1.answers, [id]: answer } },
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
		expect(Object.keys(judge.body(request).questions)).toEqual(['__proto__'])
		expect(
			judge.read(
				{
					answers: {
						['__proto__']: { type: 'choice', probabilities: { other: 0.1, ['__proto__']: 0.9 } },
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
			new JudgeError('PROTOCOL', 'judge error: invalid System One response envelope'),
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
