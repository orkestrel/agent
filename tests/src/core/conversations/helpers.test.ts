import type { Message } from '@src/core'
import {
	buildJudgments,
	matchesJudgment,
	buildRecapMessage,
	buildSummaryMessage,
	collectToolGroups,
	CONVERSATION_RECAP_PREFIX,
} from '@src/core'
import { describe, expect, it } from 'vitest'
import {
	createToolCall,
	JUDGMENT_INPUT,
	JUDGMENT_RECORD,
	JUDGMENT_QUESTION,
	JUDGMENT_MISMATCHES,
	JUDGMENT_USAGE,
} from '../../../setup.js'

describe('collectToolGroups', () => {
	it('groups a result with its unique owner, a positional result with its leader, and an orphan run', () => {
		const messages: readonly Message[] = [
			{ id: 'U', role: 'user', content: 'Which order is late?' },
			{ id: 'A1', role: 'assistant', content: '', calls: [createToolCall({ id: 'one' })] },
			{ id: 'R1', role: 'tool', content: 'positional result' },
			{ id: 'A2', role: 'assistant', content: '', calls: [createToolCall({ id: 'two' })] },
			{ id: 'R2', role: 'tool', content: 'second result', call: 'two' },
			{ id: 'L1', role: 'tool', content: 'late first result', call: 'one' },
			{ id: 'N', role: 'assistant', content: 'Order LH-81660 is late.' },
			{ id: 'O1', role: 'tool', content: 'lost result', call: 'missing' },
			{ id: 'O2', role: 'tool', content: 'other lost result' },
		]

		expect(collectToolGroups(messages).map((group) => group.map(({ id }) => id))).toEqual([
			['A1', 'R1', 'L1'],
			['A2', 'R2'],
			['O1', 'O2'],
		])
	})

	it('returns no group for messages without calls or tool results', () => {
		expect(collectToolGroups([{ id: 'U', role: 'user', content: 'Which order is late?' }])).toEqual(
			[],
		)
	})
})

describe('judgment helpers', () => {
	it('matches the shared record and ignores its time', () => {
		expect(
			matchesJudgment(
				JUDGMENT_RECORD,
				JUDGMENT_QUESTION,
				JUDGMENT_INPUT.sources,
				JUDGMENT_INPUT.state,
				JUDGMENT_INPUT.model,
			),
		).toBe(true)
	})
	it.each(JUDGMENT_MISMATCHES)('rejects a changed %s alone', (_name, record) => {
		expect(
			matchesJudgment(
				record,
				JUDGMENT_QUESTION,
				JUDGMENT_INPUT.sources,
				JUDGMENT_INPUT.state,
				JUDGMENT_INPUT.model,
			),
		).toBe(false)
	})
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
