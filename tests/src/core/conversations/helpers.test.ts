import {
	buildJudgments,
	buildRecapMessage,
	buildSummaryMessage,
	CONVERSATION_RECAP_PREFIX,
} from '@src/core'
import { describe, expect, it } from 'vitest'
import { JUDGMENT_INPUT, JUDGMENT_QUESTION, JUDGMENT_USAGE } from '../../../setup.js'

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
	const section = { id: 's1', summary: 'recap of 2', messages: [] }

	it('carries the section summary verbatim, keyed by the section id', () => {
		expect(buildSummaryMessage(section)).toEqual({
			id: 's1',
			role: 'assistant',
			content: 'recap of 2',
		})
	})

	it('frames the recap with the prefix a small model reads it by', () => {
		expect(buildRecapMessage(section)).toEqual({
			id: 's1',
			role: 'assistant',
			content: `${CONVERSATION_RECAP_PREFIX}recap of 2`,
		})
	})
})
