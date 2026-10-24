import { parseJSON, isRecord } from '@orkestrel/contract'
import { expect, it } from 'vitest'
import { waitForCondition } from '@orkestrel/test'
import {
	executeMemoryRecording,
	STUDY_MEMORY_RECENT_TREATMENTS,
	STUDY_MEMORY_WORK_TREATMENTS,
	STUDY_MEMORY_GRAMMAR_TREATMENTS,
	STUDY_MEMORY_STANDING_TREATMENTS,
	STUDY_MEMORY_STANDING_SOURCES,
	STUDY_MEMORY_LOOKUP_DESCRIPTION,
	STUDY_MEMORY_GRAMMAR_DESCRIPTION,
	STUDY_MEMORY_GROUP_CASES,
	buildMemoryHiddenGroups,
	createMemoryLedgerFixture,
	buildMemoryRejectedWorkResponses,
	buildMemoryPartialWorkResponses,
	STUDY_MEMORY_WORK_COMPARISON,
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
	readStudyMemoryGrade,
	isStudyMemoryReceipt,
} from '../../../studies/memory/index.js'

it('R1 changes closure agent messages at ordinal 14 and replays omitted, false, and empty groups fully', async () => {
	const result = await executeMemoryRecording({
		arm: 'records',
		goals: buildMemoryRecentGoals(),
		treatments: STUDY_MEMORY_RECENT_TREATMENTS,
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
	const result = await executeMemoryRecording({
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
	const result = await executeMemoryRecording({
		arm: 'compaction',
		goals: buildMemoryRecentGoals().slice(0, 1),
		treatments: STUDY_MEMORY_GRAMMAR_TREATMENTS,
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
				description: STUDY_MEMORY_LOOKUP_DESCRIPTION,
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
				description: STUDY_MEMORY_GRAMMAR_DESCRIPTION,
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
	const result = await executeMemoryRecording({
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
	for (const source of STUDY_MEMORY_STANDING_SOURCES) {
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
	expect(users).not.toContainEqual(
		expect.objectContaining({
			content: '[Source ordinary-label] [Source endurance-desk] This is ordinary text.',
		}),
	)
	const rows = readMemoryEvents(result.evidence, 'selection', 'closure')
	expect(rows.length).toBeGreaterThan(0)
	for (const row of rows) {
		if (!isStudyMemoryReceipt(row)) throw new Error('Malformed adopted selection')
		expect(row.receipt.calls.length).toBeGreaterThan(0)
		for (const call of row.receipt.calls) {
			if (call.selection === undefined) throw new Error('Missing adopted selection index')
			const selection = row.receipt.selections[call.selection]
			expect(selection).toBeDefined()
			for (const id of STUDY_MEMORY_STANDING_SOURCES) {
				const arrival = row.arrivals.find((entry) => entry.id === id)
				expect(arrival?.message).toBeDefined()
				expect(selection?.tail).toContain(arrival?.message)
			}
			const ordinary = readMemoryEvents(result.evidence, 'arrival').find(
				(entry) => entry.id === 'ordinary-label',
			)
			expect(ordinary?.message).toBeDefined()
			expect(selection?.tail).not.toContain(ordinary?.message)
		}
	}
})

it('R1 pins the real standing arrival identity and refuses a different message with identical content', async () => {
	const fixture = await createMemoryLedgerFixture({ ledger: { recent: true } })
	try {
		const [goal] = buildMemoryRecentGoals()
		if (goal === undefined) throw new Error('Missing standing goal')
		await fixture.session.execute(goal, fixture.context.context)
		const arrival = fixture.ledger.conversation
			.messages()
			.find((message) => message.content === '[Source endurance-desk] Keep the public desk policy.')
		if (arrival === undefined || fixture.options.pins === undefined)
			throw new Error('Missing arrival or pin handler')
		expect(fixture.options.pins(arrival)).toBe(true)
		expect(fixture.options.pins({ ...arrival, id: 'different-message' })).toBe(false)
	} finally {
		await fixture.close()
	}
})

it('R2 leaves pending and rejected requests unnamed on the real Ledger', async () => {
	const controller = new AbortController()
	const fixture = await createMemoryLedgerFixture(
		{ ledger: { work: true } },
		buildMemoryRejectedWorkResponses(controller.signal),
		true,
	)
	try {
		const [goal] = buildMemoryWorkFixture().goals
		if (goal === undefined) throw new Error('Missing work goal')
		const pending = fixture.session.execute(goal, fixture.context.context).then(
			(product) => ({ product, error: undefined }),
			(error: unknown) => ({ product: undefined, error }),
		)
		await waitForCondition(
			'the pending work request reaches the protocol peer',
			() => fixture.server.requests.filter(({ path }) => path === '/api/chat').length === 3,
		)
		const request = fixture.ledger.conversation
			.messages()
			.find((message) => message.content === 'Prepare the desk draft.')
		if (request === undefined || fixture.options.names === undefined)
			throw new Error('Missing current request or naming handler')
		expect(fixture.options.names(request)).toBeUndefined()
		controller.abort(new Error('Rejected work control'))
		const rejected = await pending
		expect(rejected.error).toBeDefined()
		expect(rejected.product).toBeUndefined()
		expect(fixture.options.names(request)).toBeUndefined()
	} finally {
		controller.abort()
		await fixture.close()
	}
})

it('R2 names resolved partial work and carries its exact eligible reply without changing earlier associations', async () => {
	const fixture = await createMemoryLedgerFixture(
		{ observe: true, ledger: { work: true } },
		buildMemoryPartialWorkResponses(),
	)
	try {
		const [first, second] = buildMemoryWorkFixture().goals
		if (first === undefined || second === undefined || fixture.options.names === undefined)
			throw new Error('Missing work controls')
		fixture.ledger.agent.emitter.on('usage', () => fixture.ledger.agent.abort())
		const product = await fixture.session
			.execute(first, fixture.context.context)
			.finally(() => fixture.ledger.agent.emitter.clear('usage'))
		expect(product).toEqual({ value: { content: STUDY_MEMORY_WORK_REPLY }, partial: true })
		const request = fixture.ledger.conversation
			.messages()
			.find((message) => message.content === 'Prepare the desk draft.')
		if (request === undefined) throw new Error('Missing partial work request')
		expect(fixture.options.names(request)).toBe('goal-1')
		await fixture.session.execute(second, fixture.context.context)
		const later = fixture.ledger.conversation
			.messages()
			.find((message) => message.content === 'Revise goal-1 using the available evidence.')
		if (later === undefined) throw new Error('Missing later request')
		expect(fixture.options.names(request)).toBe('goal-1')
		expect(fixture.options.names(later)).toBe('goal-2')
		const body = fixture.server.requests.filter(({ path }) => path === '/api/chat').at(-1)?.body
		expect(body).toContain(`[goal-1] ${STUDY_MEMORY_WORK_REPLY}`)
		expect(body).not.toContain('[goal-1] Earlier partial pass.')
		await fixture.session.execute(STUDY_MEMORY_WORK_COMPARISON, fixture.context.context)
		expect(fixture.options.names(request)).toBe('goal-1')
		expect(fixture.options.names(later)).toBe('goal-2')
		const final = fixture.server.requests.filter(({ path }) => path === '/api/chat').at(-1)?.body
		expect(final).toContain(`[goal-1] ${STUDY_MEMORY_WORK_REPLY}`)
		expect(final).toContain('[goal-2] Later complete draft.')
	} finally {
		await fixture.close()
	}
})

it.each(STUDY_MEMORY_GROUP_CASES)(
	'$name checks all own keys and refuses hidden invalid or unknown fields and unreadable groups',
	({ name, leaf, guard }) => {
		expect(guard(Object.defineProperty({}, leaf, { value: true }))).toBe(true)
		expect(guard(Object.defineProperty({}, leaf, { value: false }))).toBe(true)
		for (const value of buildMemoryHiddenGroups(leaf)) {
			expect(guard(value)).toBe(false)
			expect(isStudyMemoryOptions({ [name]: value })).toBe(false)
		}
	},
)

it('R2 changes goal-2 agent messages at ordinal 10 with the exact wrong earlier draft and passive controls', async () => {
	const fixture = buildMemoryWorkFixture()
	const result = await executeMemoryRecording({
		arm: 'records',
		goals: fixture.goals,
		responses: fixture.responses,
		treatments: STUDY_MEMORY_WORK_TREATMENTS,
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
	const result = await executeMemoryRecording({
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
	const result = await executeMemoryRecording({
		arm: 'compaction',
		goals: buildMemoryStandingGoals(),
		treatments: STUDY_MEMORY_STANDING_TREATMENTS,
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
	for (const source of STUDY_MEMORY_STANDING_SOURCES) {
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
	const result = await executeMemoryRecording({
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
		for (const [position, source] of STUDY_MEMORY_STANDING_SOURCES.entries()) {
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
	expect(arrivals).toEqual(STUDY_MEMORY_STANDING_SOURCES.map((id) => ({ id, instruction: id })))
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
		const result = await executeMemoryRecording({
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
