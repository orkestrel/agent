import { parseJSON, isRecord } from '@orkestrel/contract'
import { expect, it } from 'vitest'
import {
	runMemoryRecording,
	buildMemoryRecentGoals,
	buildMemoryPinTrial,
	runMemoryTrial,
	readMemoryEvents,
	buildMemoryWorkFixture,
	STUDY_MEMORY_WORK_REPLY,
	buildMemoryGrammarTrial,
	buildMemoryFoldGoals,
	STUDY_MEMORY_SETTINGS,
	buildMemoryProfile,
	STUDY_MEMORY_LOOKUP_VALID,
	STUDY_MEMORY_LOOKUP_INVALID,
} from '../../setupStudy.js'
import {
	isStudyMemoryOptions,
	validateStudyMemoryProfile,
	STUDY_MEMORY_LOOKUP,
	STUDY_MEMORY_GRAMMAR,
} from '../../../studies/memory/index.js'

it('R1 changes closure agent messages at ordinal 14 and replays omitted, false, and empty groups fully', async () => {
	const result = await runMemoryRecording({
		arm: 'records',
		goals: buildMemoryRecentGoals(),
		treatments: {
			omitted: {},
			disabled: { ledger: { recent: false } },
			empty: { ledger: {} },
			enabled: { ledger: { recent: true } },
		},
	})
	expect(result.replayed).toBe(0)
	for (const reading of result.readings.filter(({ name }) => name !== 'enabled')) {
		expect(reading.command.code).toBe(0)
		expect(reading.status).toBe('sealed')
		expect(reading.differential).toEqual({
			complete: true,
			divergence: undefined,
			change: undefined,
			selection: undefined,
		})
	}
	const enabled = result.readings.find(({ name }) => name === 'enabled')
	expect(enabled?.command.code).not.toBe(0)
	expect(enabled?.differential.divergence).toMatchObject({
		ordinal: 14,
		expected: { goal: 'closure', role: 'agent' },
	})
	expect(enabled?.differential.change).toMatchObject({ member: 'messages' })
	const actual = parseJSON(
		Buffer.from(enabled?.differential.divergence?.actual?.body ?? '', 'base64').toString('utf8'),
	)
	expect(isRecord(actual) ? actual.messages : undefined).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ role: 'user', content: 'Acknowledge the desk.' }),
			expect.objectContaining({ role: 'assistant', content: 'Receipt retained.' }),
		]),
	)
}, 480000)

it('R1 replays the first goal fully when there is no completed earlier exchange', async () => {
	const result = await runMemoryRecording({
		arm: 'records',
		goals: buildMemoryRecentGoals().slice(0, 1),
		treatments: { enabled: { ledger: { recent: true } } },
	})
	expect(result.readings[0]?.command.code).toBe(0)
	expect(result.readings[0]?.differential).toEqual({
		complete: true,
		divergence: undefined,
		change: undefined,
		selection: undefined,
	})
	expect(result.replayed).toBe(0)
}, 180000)

it('Q3a changes the first agent tools at ordinal 5 while omitted, false, and empty lookup groups replay fully', async () => {
	const result = await runMemoryRecording({
		arm: 'compaction',
		goals: buildMemoryRecentGoals().slice(0, 1),
		treatments: {
			omitted: {},
			disabled: { lookup: { grammar: false } },
			empty: { lookup: {} },
			enabled: { lookup: { grammar: true } },
		},
	})
	for (const reading of result.readings.filter(({ name }) => name !== 'enabled')) {
		expect(reading.command.code).toBe(0)
		expect(reading.differential).toEqual({
			complete: true,
			divergence: undefined,
			change: undefined,
			selection: undefined,
		})
	}
	const enabled = result.readings.find(({ name }) => name === 'enabled')
	expect(enabled?.differential.divergence).toMatchObject({
		ordinal: 5,
		expected: { goal: 'opening', role: 'agent' },
	})
	expect(enabled?.differential.change).toMatchObject({ member: 'tools' })
	const expected = parseJSON(
		Buffer.from(enabled?.differential.divergence?.expected?.body ?? '', 'base64').toString('utf8'),
	)
	const actual = parseJSON(
		Buffer.from(enabled?.differential.divergence?.actual?.body ?? '', 'base64').toString('utf8'),
	)
	if (!isRecord(actual) || !isRecord(expected)) throw new Error('Missing grammar requests')
	const { tools: before, ...rest } = expected
	const { tools: after, ...remaining } = actual
	expect(remaining).toEqual(rest)
	expect(before).toEqual([
		{
			type: 'function',
			function: {
				name: 'lookup',
				description: STUDY_MEMORY_LOOKUP,
				parameters: {
					type: 'object',
					properties: { id: { type: 'string' } },
					required: ['id'],
					additionalProperties: false,
				},
			},
		},
	])
	expect(after).toEqual([
		{
			type: 'function',
			function: {
				name: 'lookup',
				description: `${STUDY_MEMORY_LOOKUP}. ${STUDY_MEMORY_GRAMMAR}`,
				parameters: {
					type: 'object',
					properties: { id: { type: 'string' } },
					required: ['id'],
					additionalProperties: false,
				},
			},
		},
	])
	expect(result.replayed).toBe(0)
}, 480000)

it('Q3a leaves the summary request unchanged and first changes the post-fold agent tools at ordinal 6', async () => {
	const result = await runMemoryRecording({
		arm: 'compaction',
		goals: buildMemoryFoldGoals(),
		treatments: { enabled: { lookup: { grammar: true } } },
	})
	expect(
		result.history.exchanges.find(({ attempt }) => attempt.role === 'summary')?.attempt.ordinal,
	).toBe(5)
	expect(result.readings[0]?.differential.divergence).toMatchObject({
		ordinal: 6,
		expected: { role: 'agent' },
	})
	expect(result.readings[0]?.differential.change).toMatchObject({ member: 'tools' })
	expect(result.replayed).toBe(0)
}, 180000)

it('Q3a preserves released prefixed lookup hits and bare or unreleased misses', async () => {
	const result = await runMemoryTrial(buildMemoryGrammarTrial())
	expect(result.failure).toBeUndefined()
	expect(readMemoryEvents(result.evidence, 'lookup')).toEqual([
		{ id: 'order:BC-7301', found: true },
		{ id: 'BC-7301', found: false },
		{ id: 'customer:BC-4101', found: false },
	])
	const sent = result.requests.filter(({ path }) => path === '/api/chat').at(-1)?.body ?? ''
	expect(sent).toContain('order:BC-7301: Mara')
	expect(sent.match(/No record/g)).toHaveLength(2)
})

it('Q3a admits lookup on every arm and refuses unknown or non-boolean leaves', () => {
	for (const lookup of STUDY_MEMORY_LOOKUP_VALID) {
		expect(isStudyMemoryOptions({ lookup })).toBe(true)
		const profile = buildMemoryProfile({
			url: 'http://127.0.0.1:1',
			settings: { ...STUDY_MEMORY_SETTINGS, lookup },
		})
		expect(() =>
			validateStudyMemoryProfile(profile, ['records', 'compaction', 'full']),
		).not.toThrow()
	}
	for (const lookup of STUDY_MEMORY_LOOKUP_INVALID)
		expect(isStudyMemoryOptions({ lookup })).toBe(false)
})

it('R1 holds only the declared standing arrivals after whole recent replies exceed the tail allowance', async () => {
	const result = await runMemoryTrial(buildMemoryPinTrial())
	expect(result.failure).toBeUndefined()
	const request = result.requests.filter(({ path }) => path === '/api/chat').at(-1)
	const body = parseJSON(request?.body ?? '')
	if (!isRecord(body) || !Array.isArray(body.messages)) throw new Error('Missing agent messages')
	const users = body.messages.filter((message) => isRecord(message) && message.role === 'user')
	for (const source of ['endurance-desk', 'ev-opening', 'ev-register']) {
		expect(users).toContainEqual(
			expect.objectContaining({ content: `[Source ${source}] Keep policy ${source}.` }),
		)
	}
	expect(users).not.toContainEqual(
		expect.objectContaining({ content: '[Source day] The opening day is Monday.' }),
	)
	expect(users).not.toContainEqual(
		expect.objectContaining({ content: '[Source ev-source-1-1] The opening case is dormant.' }),
	)
	expect(readMemoryEvents(result.evidence, 'selection').length).toBeGreaterThan(0)
})

it('R2 changes goal-2 agent messages at ordinal 10 with the exact wrong earlier draft and passive controls', async () => {
	const fixture = buildMemoryWorkFixture()
	const result = await runMemoryRecording({
		arm: 'records',
		goals: fixture.goals,
		responses: fixture.responses,
		treatments: {
			omitted: {},
			disabled: { ledger: { work: false } },
			empty: { ledger: {} },
			enabled: { ledger: { work: true } },
		},
	})
	for (const reading of result.readings.filter(({ name }) => name !== 'enabled')) {
		expect(reading.command.code).toBe(0)
		expect(reading.differential).toEqual({
			complete: true,
			divergence: undefined,
			change: undefined,
			selection: undefined,
		})
	}
	const enabled = result.readings.find(({ name }) => name === 'enabled')
	expect(enabled?.differential.divergence).toMatchObject({
		ordinal: 10,
		expected: { goal: 'goal-2', role: 'agent' },
	})
	expect(enabled?.differential.change).toMatchObject({
		member: 'messages',
		index: 0,
		origin: 'mixed',
	})
	const body = Buffer.from(enabled?.differential.divergence?.actual?.body ?? '', 'base64').toString(
		'utf8',
	)
	expect(body).toContain(`[goal-1] ${STUDY_MEMORY_WORK_REPLY}`)
	expect(body).toContain('Your own earlier replies')
	expect(body).toContain('not evidence that an action happened')
	expect(result.replayed).toBe(0)
}, 480000)

it('R2 replays fully when later prompts name no earlier goal', async () => {
	const result = await runMemoryRecording({
		arm: 'records',
		goals: buildMemoryRecentGoals(),
		treatments: { enabled: { ledger: { work: true } } },
	})
	expect(result.readings[0]?.command.code).toBe(0)
	expect(result.readings[0]?.differential).toEqual({
		complete: true,
		divergence: undefined,
		change: undefined,
		selection: undefined,
	})
	expect(result.replayed).toBe(0)
}, 180000)
