import { expect, it } from 'vitest'
import {
	buildStudyChatCriteria,
	buildStudyChatSummary,
	readStudyChatGrade,
} from '../../../studies/chat/helpers.js'
import { buildMemoryGradeFixture, buildStudyAssessment } from '../../setupStudy.js'

it('keeps primary, denial and older-value outcomes distinct and missing or partial replies unknown', () => {
	const fixture = buildMemoryGradeFixture()
	const criteria = buildStudyChatCriteria('desk', 'goal', {
		observation: 'primary',
		conversation: 'original.json',
		turn: 2,
		group: 'near',
		accept: ['cambridge'],
		refuse: ['norwich'],
	})
	const complete = {
		...fixture.complete,
		attempt: {
			...fixture.complete.attempt,
			observations: [
				{
					goal: 'goal',
					product: {
						value: { content: 'I cannot confirm Cambridge; the old value was Norwich.' },
						partial: false,
					},
					failure: undefined,
					usage: [],
					duration: 1,
					executed: true,
				},
			],
		},
	}
	expect(
		criteria.map((criterion) => readStudyChatGrade({ ...complete, criterion }).verdict),
	).toEqual(['achieved', 'achieved', 'achieved'])
	const criterion = criteria[0]
	if (criterion === undefined) throw new Error('Missing primary criterion')
	expect(readStudyChatGrade({ ...complete, criterion, attempt: undefined }).verdict).toBe('unknown')
	expect(readStudyChatGrade({ ...fixture.complete, criterion }).verdict).toBe('unknown')
	expect(
		readStudyChatGrade({
			...complete,
			criterion,
			attempt: {
				...complete.attempt,
				observations: complete.attempt.observations.map((row) => ({
					...row,
					product: { ...row.product, partial: true },
				})),
			},
		}).verdict,
	).toBe('unknown')
	expect(
		readStudyChatGrade({
			...complete,
			criterion,
			attempt: {
				...complete.attempt,
				observations: complete.attempt.observations.map((row) => ({
					...row,
					product: { value: { content: '' }, partial: false },
				})),
			},
		}).verdict,
	).toBe('unsuccessful')
	const shorter = {
		...criterion,
		assertion: {
			observation: 'primary',
			conversation: 'original.json',
			turn: 2,
			group: 'shorter',
			accept: ['cambridge'],
			refuse: [],
			previous: 'before',
		},
	}
	expect(readStudyChatGrade({ ...complete, criterion: shorter }).verdict).toBe('unknown')
})

it('grades a shortening only when the matching reply is shorter than its retained predecessor', () => {
	const fixture = buildMemoryGradeFixture()
	const [primary] = buildStudyChatCriteria('desk', 'goal', {
		observation: 'primary',
		conversation: 'OR-7',
		turn: 2,
		group: 'shorter',
		accept: ['12.50'],
		refuse: [],
		previous: 'before',
	})
	if (primary === undefined) throw new Error('Missing primary criterion')
	const before =
		'Your refund of $12.50 is on its way, and the order ships Friday from the Tacoma depot.'
	const replies = [
		'Refund $12.50 ships Friday.',
		`${before.slice(0, -1)}!`,
		`${before} Thank you for waiting.`,
		'It ships Friday.',
	]
	expect(
		replies.map(
			(content) =>
				readStudyChatGrade({
					...fixture.complete,
					criterion: primary,
					attempt: {
						...fixture.complete.attempt,
						observations: [
							{
								goal: 'before',
								product: { value: { content: before }, partial: false },
								failure: undefined,
								usage: [],
								duration: 1,
								executed: true,
							},
							{
								goal: 'goal',
								product: { value: { content }, partial: false },
								failure: undefined,
								usage: [],
								duration: 1,
								executed: true,
							},
						],
					},
				}).verdict,
		),
	).toEqual(['achieved', 'unsuccessful', 'unsuccessful', 'unsuccessful'])
})

it('joins original ids and turns, excludes diagnostics from parity and excludes opening latency', () => {
	const fixture = buildMemoryGradeFixture()
	const criteria = [
		...buildStudyChatCriteria('desk', 'turn-2', {
			observation: 'primary',
			conversation: 'original.json',
			turn: 2,
			group: 'near',
			accept: ['cambridge'],
			refuse: ['norwich'],
		}),
		// A scripted row: right without denial in its own group, and outside the dialogue rows `right` reads.
		...buildStudyChatCriteria('desk', 'turn-3', {
			observation: 'primary',
			conversation: 'original.json',
			turn: 3,
			group: 'lookup',
			accept: ['12.50'],
			refuse: [],
		}),
	]
	const trial = fixture.complete.trial
	const assessment = buildStudyAssessment(
		[trial],
		criteria.map((criterion) => ({
			trial: trial.id,
			criterion: criterion.id,
			verdict: criterion.id.endsWith('primary') ? 'achieved' : 'unsuccessful',
			method: 'state',
			reason: 'Retained reply',
			references: ['attempt'],
		})),
	)
	const summary = buildStudyChatSummary({
		assessment,
		rubric: { version: '1', criteria },
		scenarios: [
			{
				id: 'desk',
				goals: [
					{ id: 'turn-2', input: {} },
					{ id: 'turn-3', input: {} },
				],
			},
		],
		evidence: new Map([
			[
				trial.id,
				[
					{ goal: 'turn-1', event: 'result', value: { first: 100 } },
					{ goal: 'turn-2', event: 'result', value: { first: 1 } },
					{ goal: 'turn-3', event: 'result', value: { first: 2 } },
					{ goal: 'turn-4', event: 'result', value: { first: 3 } },
					{ goal: 'turn-5', event: 'result', value: {} },
				],
			],
		]),
	})
	expect(summary.rows).toEqual([
		{
			trial: trial.id,
			conversation: 'original.json',
			turn: 2,
			group: 'near',
			primary: true,
			denial: false,
			older: false,
			first: 1,
		},
		{
			trial: trial.id,
			conversation: 'original.json',
			turn: 3,
			group: 'lookup',
			primary: true,
			denial: false,
			older: undefined,
			first: 2,
		},
	])
	expect(summary.parity.near).toEqual({ right: 1, undenied: 1, total: 1, unknown: 0 })
	expect(summary.parity.lookup).toEqual({ right: 1, undenied: 1, total: 1, unknown: 0 })
	expect(summary.right).toBe(1)
	// The follow-up readings are 1, 2, and 3 seconds: the first turn and a row with no reading stay out, and p90 interpolates.
	expect(summary.first).toEqual({ count: 3, median: 2, p90: expect.closeTo(2.8, 10) })
})
