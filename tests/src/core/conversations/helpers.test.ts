import {
	buildJudgments,
	buildRecapMessage,
	buildSummaryMessage,
	CONVERSATION_RECAP_PREFIX,
	ConversationError,
	requireJudgment,
	requireSectionsCap,
} from '@src/core'
import { describe, expect, it } from 'vitest'
import {
	CONVERSATION_SECTION,
	INVALID_JUDGMENTS,
	JUDGMENT_INPUT,
	JUDGMENT_QUESTION,
	JUDGMENT_RECORD,
	JUDGMENT_USAGE,
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
