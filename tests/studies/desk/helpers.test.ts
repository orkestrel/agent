import type { StudyAttempt, StudyCriterion, StudyEvidence, StudyTrial } from '@orkestrel/study'
import { describe, expect, it } from 'vitest'
import {
	STUDY_DESK_TOOLS,
	buildStudyDeskDefinition,
	buildStudyDeskSummary,
	collectStudyDeskTools,
	computeStudyDeskMedian,
	computeStudyDeskTally,
	inferStudyDeskOutcome,
	readStudyDeskEvidence,
	readStudyDeskGrade,
	readStudyDeskProgress,
} from '../../../studies/desk/index.js'

const trial: StudyTrial = { id: 'r1-s1-a2', scenario: 'c1', arm: 'index', repetition: 0 }
const criterion: StudyCriterion = {
	id: 'c1-turn-3',
	scenario: 'c1',
	goal: 'turn-3',
	method: 'state',
	critical: false,
	assertion: { tool: 'invoice_lookup', area: 'billing' },
}
const rows: readonly StudyEvidence[] = [
	{ event: 'turn', goal: 'turn-3', value: { tools: ['load'] } },
	{
		event: 'tool',
		goal: 'turn-3',
		value: {
			id: 'c1',
			name: 'load',
			arguments: { skill: 'billing' },
			success: true,
			value: 'Loaded.',
		},
	},
	{ event: 'turn', goal: 'turn-3', value: { tools: ['invoice_lookup', 'load'] } },
	{
		event: 'tool',
		goal: 'turn-3',
		value: {
			id: 'c2',
			name: 'invoice_lookup',
			arguments: { invoice: 'INV-2290' },
			success: true,
			value: 'Done.',
		},
	},
	{ event: 'turn', goal: 'turn-3', value: { tools: ['invoice_lookup', 'load'] } },
	{
		event: 'result',
		goal: 'turn-3',
		value: { content: 'Done.', partial: false, prompt: 30, first: 1.5 },
	},
]
const attempt: StudyAttempt = {
	trial,
	failure: undefined,
	duration: 10,
	executed: true,
	observations: [
		{
			goal: 'turn-3',
			product: { value: { content: 'Done.' }, partial: false },
			failure: undefined,
			usage: [],
			duration: 10,
			executed: true,
		},
	],
}

describe('the phase 0 grader, promoted', () => {
	it('reads right, late, wrong, text, and failed from the calls other than load', () => {
		const load = { name: 'load', denied: false, success: true, arguments: {} }
		const status = { name: 'status', denied: false, success: true, arguments: {} }
		const items = { name: 'order_items', denied: false, success: true, arguments: {} }
		expect(inferStudyDeskOutcome('status', [load, status], false)).toBe('right')
		expect(inferStudyDeskOutcome('status', [items, status], false)).toBe('late')
		expect(inferStudyDeskOutcome('status', [items], false)).toBe('wrong')
		expect(inferStudyDeskOutcome('status', [load], false)).toBe('text')
		expect(inferStudyDeskOutcome('status', [], false)).toBe('text')
		expect(inferStudyDeskOutcome('status', [], true)).toBe('failed')
		expect(inferStudyDeskOutcome('status', [items], true)).toBe('failed')
		expect(inferStudyDeskOutcome('status', [status], true)).toBe('right')
	})

	it('never counts a denied call as reaching its tool', () => {
		const denied = { name: 'status', denied: true, success: false, arguments: {} }
		const ran = { name: 'status', denied: false, success: true, arguments: {} }
		expect(inferStudyDeskOutcome('status', [denied], false)).toBe('wrong')
		expect(inferStudyDeskOutcome('status', [denied, ran], false)).toBe('late')
	})

	it("judges each call that shares a denied call's id on its own, by its name and its place", () => {
		const shared = readStudyDeskEvidence([
			{
				event: 'tool',
				goal: 'turn-1',
				value: { id: 'x', name: 'status', arguments: {}, success: true, value: 'Done.' },
			},
			{ event: 'denial', goal: 'turn-1', value: { id: 'x', name: 'cancel_order' } },
			{
				event: 'tool',
				goal: 'turn-1',
				value: { id: 'x', name: 'cancel_order', arguments: {}, success: false, error: 'Denied.' },
			},
		])
		expect(shared.calls.map((call) => [call.name, call.denied])).toEqual([
			['status', false],
			['cancel_order', true],
		])
		expect(inferStudyDeskOutcome('status', shared.calls, false)).toBe('right')
		const twice = readStudyDeskEvidence([
			{ event: 'denial', goal: 'turn-1', value: { id: 'x', name: 'status' } },
			{
				event: 'tool',
				goal: 'turn-1',
				value: { id: 'x', name: 'status', arguments: {}, success: false, error: 'Denied.' },
			},
			{
				event: 'tool',
				goal: 'turn-1',
				value: { id: 'x', name: 'status', arguments: {}, success: true, value: 'Done.' },
			},
		])
		expect(twice.calls.map((call) => call.denied)).toEqual([true, false])
		expect(inferStudyDeskOutcome('status', twice.calls, false)).toBe('late')
	})

	it('counts only an admitted load, one that returned its note and was not denied', () => {
		const reading = readStudyDeskEvidence([
			{
				event: 'tool',
				goal: 'turn-1',
				value: {
					id: 'a',
					name: 'load',
					arguments: { skill: 'shipping' },
					success: false,
					error: 'No skill you can load has that name.',
				},
			},
			{ event: 'denial', goal: 'turn-1', value: { id: 'b', name: 'load', reason: 'overflow' } },
			{
				event: 'tool',
				goal: 'turn-1',
				value: {
					id: 'b',
					name: 'load',
					arguments: { skill: 'orders' },
					success: false,
					error: 'overflow',
				},
			},
			{
				event: 'tool',
				goal: 'turn-1',
				value: {
					id: 'c',
					name: 'load',
					arguments: { skill: 'staff' },
					success: true,
					value: 'The skill is loaded. Its instructions and tools are yours from your next step.',
				},
			},
		])
		expect(reading.calls.filter((call) => call.name === 'load')).toHaveLength(3)
		expect(reading.loads).toEqual(['staff'])
	})

	it('reads one goal: its calls with their denials, its loads, its turns, and its result', () => {
		expect(readStudyDeskEvidence(rows)).toEqual({
			calls: [
				{ name: 'load', denied: false, success: true, arguments: { skill: 'billing' } },
				{
					name: 'invoice_lookup',
					denied: false,
					success: true,
					arguments: { invoice: 'INV-2290' },
				},
			],
			loads: ['billing'],
			turns: 3,
			partial: false,
			prompt: 30,
			first: 1.5,
		})
		const refused = readStudyDeskEvidence([
			...rows.slice(0, 3),
			{ event: 'denial', goal: 'turn-3', value: { id: 'c1', name: 'load' } },
		])
		expect(refused.calls[0]?.denied).toBe(true)
		expect(refused.loads).toEqual([])
		expect(refused.partial).toBeUndefined()
		expect(readStudyDeskEvidence([])).toEqual({
			calls: [],
			loads: [],
			turns: 0,
			partial: undefined,
			prompt: undefined,
			first: undefined,
		})
	})

	it('computes the median, averaging an even list', () => {
		expect(computeStudyDeskMedian([])).toBeUndefined()
		expect(computeStudyDeskMedian([3])).toBe(3)
		expect(computeStudyDeskMedian([4, 1, 3, 2])).toBe(2.5)
		expect(computeStudyDeskMedian([9, 1, 5])).toBe(5)
	})
})

describe('grading through Study', () => {
	it('achieves a right call and leaves a missing or failed request unknown', () => {
		expect(readStudyDeskGrade({ trial, criterion, attempt, evidence: rows })).toMatchObject({
			verdict: 'achieved',
			method: 'state',
		})
		expect(
			readStudyDeskGrade({
				trial,
				criterion: { ...criterion, assertion: { tool: 'issue_refund', area: 'billing' } },
				attempt,
				evidence: rows,
			}).verdict,
		).toBe('unsuccessful')
		expect(
			readStudyDeskGrade({ trial, criterion, attempt: undefined, evidence: [] }),
		).toMatchObject({ verdict: 'unknown', references: [] })
		const failed: StudyAttempt = {
			...attempt,
			failure: { cause: 'deadline', message: 'stalled', role: 'agent', stop: undefined },
			observations: [
				{
					goal: 'turn-3',
					product: undefined,
					failure: { cause: 'deadline', message: 'stalled', role: 'agent', stop: undefined },
					usage: [],
					duration: 10,
					executed: true,
				},
			],
		}
		expect(
			readStudyDeskGrade({ trial, criterion, attempt: failed, evidence: rows.slice(0, 2) }).verdict,
		).toBe('unknown')
		expect(
			readStudyDeskGrade({
				trial,
				criterion: { ...criterion, assertion: { tool: 'status' } },
				attempt,
				evidence: rows,
			}).verdict,
		).toBe('unknown')
	})

	it('lists a goal for study progress without the rubric', () => {
		expect(readStudyDeskProgress(rows)).toEqual({
			calls: ['load', 'invoice_lookup'],
			loads: ['billing'],
			turns: 3,
			partial: false,
			prompt: 30,
			first: 1.5,
		})
	})
})

describe('the bar table', () => {
	it('tallies outcomes, opened and misopened loads, turns, and first text apart for opening goals', () => {
		const row = {
			trial: 'r1-s1-a2',
			arm: 'index',
			scenario: 'c1',
			goal: 'turn-1',
			initial: true,
			tool: 'status',
			area: 'orders' as const,
			outcome: 'right' as const,
			loads: ['orders'],
			turns: 3,
			prompt: 20,
			first: 7,
		}
		expect(
			computeStudyDeskTally([
				row,
				{ ...row, goal: 'turn-2', initial: false, loads: [], turns: 2, prompt: 40, first: 1 },
				{ ...row, goal: 'turn-3', initial: false, loads: ['staff'], outcome: 'wrong', first: 3 },
				{ ...row, goal: 'turn-4', initial: false, loads: [], outcome: 'failed', first: undefined },
			]),
		).toEqual({
			requests: 4,
			right: 2,
			late: 0,
			wrong: 1,
			text: 0,
			failed: 1,
			loads: 2,
			opened: 1,
			misopened: 1,
			turns: 11,
			prompt: 20,
			first: { initial: 7, loaded: 3, later: 1 },
		})
	})

	it('joins a sealed trial to the rubric through the same grader', () => {
		const summary = buildStudyDeskSummary({
			schedule: [trial],
			attempts: [attempt],
			scenarios: [
				{
					id: 'c1',
					goals: [
						{ id: 'turn-1', input: { prompt: 'Has order 4471 shipped?', area: 'orders' } },
						{ id: 'turn-3', input: { prompt: 'Show me invoice INV-2290.', area: 'billing' } },
					],
				},
			],
			rubric: { version: '1', criteria: [criterion] },
			evidence: new Map([[trial.id, rows]]),
		})
		expect(summary.rows).toEqual([
			{
				trial: 'r1-s1-a2',
				arm: 'index',
				scenario: 'c1',
				goal: 'turn-3',
				initial: false,
				tool: 'invoice_lookup',
				area: 'billing',
				outcome: 'right',
				loads: ['billing'],
				turns: 3,
				prompt: 30,
				first: 1.5,
			},
		])
		expect(summary.tallies.index).toMatchObject({ requests: 1, right: 1, opened: 1 })
		expect(() =>
			buildStudyDeskSummary({
				schedule: [trial],
				attempts: [attempt],
				scenarios: [{ id: 'c1', goals: [] }],
				rubric: { version: '1', criteria: [criterion] },
				evidence: new Map(),
			}),
		).toThrow(/join/)
	})
})

describe('the catalog', () => {
	it('builds each definition with its first field required, and lists an area in catalog order', () => {
		const ticket = STUDY_DESK_TOOLS.find((tool) => tool.name === 'open_ticket')
		expect(ticket && buildStudyDeskDefinition(ticket)).toEqual({
			name: 'open_ticket',
			description: 'Opens a support ticket for a customer.',
			parameters: {
				type: 'object',
				properties: {
					customer: { type: 'string', description: 'Customer name or id' },
					subject: { type: 'string', description: 'One-line summary of the problem' },
				},
				required: ['customer'],
			},
		})
		const staff = STUDY_DESK_TOOLS.find((tool) => tool.name === 'staff_on_call')
		expect(staff && buildStudyDeskDefinition(staff).parameters).toEqual({
			type: 'object',
			properties: {},
			required: [],
		})
		expect(collectStudyDeskTools('orders')).toEqual([
			'status',
			'order_items',
			'track_package',
			'change_address',
			'cancel_order',
			'reship_order',
		])
	})
})
