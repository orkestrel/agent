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
	STUDY_MEMORY_INSTRUCTION_VALID,
	STUDY_MEMORY_INSTRUCTION_INVALID,
	buildMemoryStandingGoals,
	buildMemoryStandingTrial,
	buildMemoryGradingFixture,
	STUDY_MEMORY_PROTOTYPE_DRY_RUNS,
	readMemoryPrototypeGoals,
} from '../../setupStudy.js'
import {
	isStudyMemoryOptions,
	validateStudyMemoryProfile,
	STUDY_MEMORY_LOOKUP,
	STUDY_MEMORY_GRAMMAR,
	readStudyMemoryGrade,
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

it('Q1 changes opening agent system messages at ordinal 5 and replays omitted, false, and empty groups fully', async () => {
	const result = await runMemoryRecording({
		arm: 'compaction',
		goals: buildMemoryStandingGoals(),
		treatments: {
			omitted: {},
			disabled: { instructions: { standing: false } },
			empty: { instructions: {} },
			enabled: { instructions: { standing: true } },
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
	expect(enabled?.differential.change).toMatchObject({
		member: 'messages',
		index: 0,
		origin: 'instructions',
	})
	const actual = parseJSON(
		Buffer.from(enabled?.differential.divergence?.actual?.body ?? '', 'base64').toString('utf8'),
	)
	if (!isRecord(actual) || !Array.isArray(actual.messages))
		throw new Error('Missing standing request')
	const system = actual.messages.find((message) => isRecord(message) && message.role === 'system')
	if (!isRecord(system) || typeof system.content !== 'string')
		throw new Error('Missing standing system message')
	for (const source of ['endurance-desk', 'ev-opening', 'ev-register']) {
		expect(system.content).toContain(`[Source ${source}]`)
		expect(
			JSON.stringify(actual.messages).match(new RegExp(`\\[Source ${source}\\]`, 'g')),
		).toHaveLength(1)
	}
	expect(actual.messages).toContainEqual({
		role: 'user',
		content: '[Source ordinary] This arrival stays in conversation.',
	})
	expect(result.replayed).toBe(0)
}, 480000)

it('Q1 replays a complete forced fold when no standing source arrives', async () => {
	const result = await runMemoryRecording({
		arm: 'compaction',
		goals: buildMemoryFoldGoals(),
		treatments: { enabled: { instructions: { standing: true } } },
	})
	expect(result.history.exchanges.some(({ attempt }) => attempt.role === 'summary')).toBe(true)
	expect(result.readings[0]?.command.code).toBe(0)
	expect(result.readings[0]?.differential).toEqual({
		complete: true,
		divergence: undefined,
		change: undefined,
		selection: undefined,
	})
	expect(result.replayed).toBe(0)
}, 180000)

it('Q1 retains released standing instructions through repeated real folds without duplicates or premature sources and grades the arrival id', async () => {
	const trial = buildMemoryStandingTrial()
	const result = await runMemoryTrial(trial)
	expect(result.failure).toBeUndefined()
	expect(result.products).toHaveLength(3)
	const summaries = readMemoryEvents(result.evidence, 'summary')
	expect(summaries.length).toBeGreaterThanOrEqual(2)
	const chats = result.requests
		.filter(({ path }) => path === '/api/chat')
		.map(({ body }) => parseJSON(body))
	const agents = chats.filter((body) => isRecord(body) && Array.isArray(body.tools))
	expect(agents).toHaveLength(3)
	for (const [index, body] of agents.entries()) {
		if (!isRecord(body) || !Array.isArray(body.messages))
			throw new Error('Missing post-fold agent messages')
		const system = body.messages.find((message) => isRecord(message) && message.role === 'system')
		if (!isRecord(system) || typeof system.content !== 'string')
			throw new Error('Missing post-fold instructions')
		for (const [position, source] of ['endurance-desk', 'ev-opening', 'ev-register'].entries()) {
			expect(system.content.includes(`[Source ${source}] Standing text for ${source}.`)).toBe(
				position <= index,
			)
			expect(
				JSON.stringify(body.messages).match(new RegExp(`\\[Source ${source}\\]`, 'g'))?.length ?? 0,
			).toBe(position <= index ? 1 : 0)
		}
	}
	for (const body of chats.filter((entry) => isRecord(entry) && entry.tools === undefined)) {
		expect(JSON.stringify(body)).not.toContain('Standing text for')
		expect(JSON.stringify(body)).toContain('Public case detail.')
	}
	const arrivals = readMemoryEvents(result.evidence, 'arrival').filter(
		(row) => row.instruction !== undefined,
	)
	expect(arrivals).toEqual(
		['endurance-desk', 'ev-opening', 'ev-register'].map((id) => ({ id, instruction: id })),
	)
	expect(
		readMemoryEvents(result.evidence, 'context').filter(
			(row) => row.role === 'agent' && row.stage === 'dispatch',
		),
	).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				origins: expect.arrayContaining([expect.objectContaining({ origin: 'mixed' })]),
			}),
		]),
	)
	const grading = buildMemoryGradingFixture()
	expect(
		readStudyMemoryGrade({
			trial: grading.complete.trial,
			criterion: { ...grading.source, assertion: { observation: 'arrival', id: 'endurance-desk' } },
			attempt: grading.complete.attempt,
			evidence: result.evidence.map((row) => ({ ...row, goal: 'goal' })),
		}).verdict,
	).toBe('achieved')
})

it('Q1 refuses instruction groups outside compaction and validates every leaf', () => {
	for (const instructions of STUDY_MEMORY_INSTRUCTION_VALID) {
		expect(isStudyMemoryOptions({ instructions })).toBe(true)
		const profile = buildMemoryProfile({
			url: 'http://127.0.0.1:1',
			settings: { ...STUDY_MEMORY_SETTINGS, instructions },
		})
		expect(() => validateStudyMemoryProfile(profile, ['compaction'])).not.toThrow()
		expect(() => validateStudyMemoryProfile(profile, ['records'])).toThrow(
			expect.objectContaining({ code: 'CONFIG' }),
		)
		expect(() => validateStudyMemoryProfile(profile, ['full'])).toThrow(
			expect.objectContaining({ code: 'CONFIG' }),
		)
		expect(() => validateStudyMemoryProfile(profile, ['compaction', 'records'])).toThrow(
			expect.objectContaining({ code: 'CONFIG' }),
		)
	}
	for (const instructions of STUDY_MEMORY_INSTRUCTION_INVALID)
		expect(isStudyMemoryOptions({ instructions })).toBe(false)
})

it.each(STUDY_MEMORY_PROTOTYPE_DRY_RUNS)(
	'$name reads its first changed public packet request on CPU',
	async ({ name, arm, enabled, disabled }) => {
		const result = await runMemoryRecording({
			arm,
			goals: readMemoryPrototypeGoals(arm),
			room: { context: 32768, output: 512, recap: 256 },
			treatments: { disabled, enabled },
		})
		const off = result.readings.find((reading) => reading.name === 'disabled')
		expect(off?.command.code).toBe(0)
		expect(off?.differential).toEqual({
			complete: true,
			divergence: undefined,
			change: undefined,
			selection: undefined,
		})
		expect(result.replayed).toBe(0)
		const on = result.readings.find((reading) => reading.name === 'enabled')
		const first = on?.differential.divergence
		process.stdout.write(
			`PROTOTYPE_DRY_RUN ${JSON.stringify({ name, arm, goals: result.history.declaration.goals, first: first === undefined ? undefined : { ordinal: first.ordinal, goal: first.expected?.goal, role: first.expected?.role, member: on?.differential.change?.member, index: on?.differential.change?.index }, complete: on?.differential.complete, baseline: result.history.completion, status: on?.status })}\n`,
		)
	},
	480000,
)
