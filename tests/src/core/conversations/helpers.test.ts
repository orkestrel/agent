import {
	buildJudgments,
	buildRecapMessage,
	buildSummaryMessage,
	CONVERSATION_RECAP_PREFIX,
	ConversationError,
	raceSignal,
	requireJudgment,
	requireKeep,
	requireSectionsCap,
} from '@src/core'
import { waitForDelay } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import {
	CONVERSATION_SECTION,
	INVALID_JUDGMENTS,
	JUDGMENT_INPUT,
	JUDGMENT_QUESTION,
	JUDGMENT_RECORD,
	JUDGMENT_USAGE,
	TEV1_NOUL,
} from '../../../setup.js'

describe('judgment helpers', () => {
	it('builds the answered record and attaches single-question usage', () => {
		expect(
			buildJudgments(
				{ state: JUDGMENT_INPUT.state, questions: { refund: JUDGMENT_QUESTION } },
				{
					model: JUDGMENT_INPUT.model,
					answers: { refund: { form: 'noul', noul: 0.9 } },
					usage: JUDGMENT_USAGE,
				},
				JUDGMENT_INPUT.sources,
				JUDGMENT_INPUT.state,
				JUDGMENT_INPUT.model,
			),
		).toEqual([{ ...JUDGMENT_INPUT, usage: JUDGMENT_USAGE }])
	})
	it('keeps request order, includes refusals, carries the configured identity, omits unanswered keys and batch usage', () => {
		expect(
			buildJudgments(
				{
					state: 'state',
					questions: {
						refund: JUDGMENT_QUESTION,
						refused: JUDGMENT_QUESTION,
						pending: JUDGMENT_QUESTION,
					},
				},
				{
					model: 'reported',
					answers: { refund: { form: 'noul', noul: 0.9 }, extra: { form: 'noul', noul: 1 } },
					refusals: { refused: { missing: ['true'] } },
					usage: JUDGMENT_USAGE,
				},
				JUDGMENT_INPUT.sources,
				'state',
				'configured',
			),
		).toEqual([
			{ ...JUDGMENT_INPUT, model: 'configured', state: 'state' },
			{
				id: 'refused',
				question: JUDGMENT_QUESTION,
				refusal: { missing: ['true'] },
				model: 'configured',
				sources: JUDGMENT_INPUT.sources,
				state: 'state',
			},
		])
	})

	it('reads only own answer and refusal keys, so a question id named after a prototype member stays unanswered', () => {
		expect(
			buildJudgments(
				{
					state: 'state',
					questions: { constructor: JUDGMENT_QUESTION, toString: JUDGMENT_QUESTION },
				},
				{ model: 'reported', answers: {}, refusals: {} },
				[],
				'state',
				'configured',
			),
		).toEqual([])
	})

	it('records an own answer for a question id named after a prototype member', () => {
		expect(
			buildJudgments(
				{ state: 'state', questions: { constructor: JUDGMENT_QUESTION } },
				{ model: 'reported', answers: { constructor: TEV1_NOUL } },
				[],
				'state',
				'configured',
			),
		).toEqual([
			{
				id: 'constructor',
				question: JUDGMENT_QUESTION,
				answer: TEV1_NOUL,
				model: 'configured',
				sources: [],
				state: 'state',
			},
		])
	})

	it('prefers the answer when one key carries both an answer and a refusal', () => {
		const [record] = buildJudgments(
			{ state: 'state', questions: { refund: JUDGMENT_QUESTION } },
			{
				model: 'reported',
				answers: { refund: { form: 'noul', noul: 0.9 } },
				refusals: { refund: { missing: ['true'] } },
			},
			[],
			'state',
			'configured',
		)
		expect(record?.answer).toEqual({ form: 'noul', noul: 0.9 })
		expect(record).not.toHaveProperty('refusal')
	})
})

describe('requireKeep', () => {
	it('returns zero, negative zero, and a positive safe integer unchanged', () => {
		expect(requireKeep(0)).toBe(0)
		expect(Object.is(requireKeep(-0), -0)).toBe(true)
		expect(requireKeep(3)).toBe(3)
		expect(requireKeep(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
	})

	it.each([
		Number.NaN,
		-1,
		1.5,
		Number.POSITIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
		Number.MAX_SAFE_INTEGER + 1,
	])('throws the KEEP code with the refused value as context for %s', (keep) => {
		expect(() => requireKeep(keep)).toThrow(ConversationError)
		expect(() => requireKeep(keep)).toThrow(
			expect.objectContaining({ code: 'KEEP', context: { keep } }),
		)
	})
})

describe('raceSignal', () => {
	it('returns the promise itself when no signal is supplied', () => {
		const promise = Promise.resolve('value')
		expect(raceSignal(promise, undefined)).toBe(promise)
	})

	it('settles as the promise does while the signal stays live', async () => {
		const failure = new Error('failed')
		await expect(raceSignal(Promise.resolve('value'), new AbortController().signal)).resolves.toBe(
			'value',
		)
		await expect(raceSignal(Promise.reject(failure), new AbortController().signal)).rejects.toBe(
			failure,
		)
	})

	it('rejects with the reason of an already-aborted signal without waiting', async () => {
		const reason = new Error('cancelled')
		const never = Promise.withResolvers<string>()
		await expect(raceSignal(never.promise, AbortSignal.abort(reason))).rejects.toBe(reason)
	})

	it('rejects with the abort reason while the promise is pending, and handles its later rejection', async () => {
		const pending = Promise.withResolvers<string>()
		const controller = new AbortController()
		const reason = new Error('cancelled')
		const raced = raceSignal(pending.promise, controller.signal)

		controller.abort(reason)
		await expect(raced).rejects.toBe(reason)
		// Vitest fails the run on an unhandled rejection, so this late reject must be handled.
		pending.reject(new Error('late'))
		await waitForDelay()
	})

	it('ignores an abort that lands after the promise settled', async () => {
		const controller = new AbortController()
		const raced = raceSignal(Promise.resolve('value'), controller.signal)
		await expect(raced).resolves.toBe('value')
		controller.abort(new Error('late'))
		await expect(raced).resolves.toBe('value')
	})
})

describe('buildSummaryMessage / buildRecapMessage — a section as a message', () => {
	it('carries the section summary verbatim, keyed by the section id', () => {
		expect(buildSummaryMessage(CONVERSATION_SECTION)).toEqual({
			id: 's1',
			role: 'assistant',
			content: 'recap of 2',
		})
	})

	it('frames the recap with the prefix a small model reads it by', () => {
		expect(buildRecapMessage(CONVERSATION_SECTION)).toEqual({
			id: 's1',
			role: 'assistant',
			content: `${CONVERSATION_RECAP_PREFIX}recap of 2`,
		})
	})
})

describe('requireJudgment', () => {
	it('returns a valid record unchanged', () => {
		expect(requireJudgment(JUDGMENT_RECORD)).toBe(JUDGMENT_RECORD)
	})

	it.each(INVALID_JUDGMENTS)('throws the JUDGMENT code for malformed record %#', (record) => {
		expect(() => requireJudgment(record)).toThrow(ConversationError)
		expect(() => requireJudgment(record)).toThrow(expect.objectContaining({ code: 'JUDGMENT' }))
	})

	it('throws the JUDGMENT code for an input that carries no storage time', () => {
		expect(() => requireJudgment(JUDGMENT_INPUT)).toThrow(
			expect.objectContaining({ code: 'JUDGMENT' }),
		)
	})
})

describe('requireSectionsCap', () => {
	it('returns undefined, a cap of 1, a fractional cap above 1, and positive infinity unchanged', () => {
		expect(requireSectionsCap(undefined)).toBeUndefined()
		expect(requireSectionsCap(1)).toBe(1)
		expect(requireSectionsCap(1.5)).toBe(1.5)
		expect(requireSectionsCap(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY)
	})

	it('throws the SECTIONS code for NaN', () => {
		expect(() => requireSectionsCap(Number.NaN)).toThrow(
			expect.objectContaining({ code: 'SECTIONS' }),
		)
	})

	it('throws the SECTIONS code below 1, at zero of either sign, and for negative infinity', () => {
		for (const cap of [0.5, 0, -0, -1, Number.NEGATIVE_INFINITY]) {
			expect(() => requireSectionsCap(cap)).toThrow(expect.objectContaining({ code: 'SECTIONS' }))
		}
	})
})
