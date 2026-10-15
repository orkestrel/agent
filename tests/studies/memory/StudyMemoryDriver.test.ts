import type { MemoryTrialFixture } from './types.js'
import { describe, expect, it, vi } from 'vitest'
import { isRecord, parseJSON } from '@orkestrel/contract'
import { isStudyError, readStudyFailure, validateStudyInputs } from '@orkestrel/study'
import {
	isStudyMemoryProvider,
	isStudyMemoryRuntime,
	StudyMemoryDriver,
	StudyMemorySession,
} from '../../../studies/memory/index.js'
import {
	buildMemoryEdge,
	buildMemoryFoldGoals,
	buildMemoryObservationGoals,
	buildMemoryObservationResponses,
	buildMemoryProfile,
	buildMemoryReply,
	buildMemoryRollingGoals,
	buildMemorySummaryGoals,
	createMemoryContext,
	createMemoryServer,
	listMemoryKeys,
	loadMemoryInputs,
	readMemoryAdmission,
	readMemoryEvents,
	readMemoryModels,
	readMemoryOrigins,
	readMemoryParts,
	readMemoryShapes,
	readMemorySnapshot,
	readMemoryTimeline,
	readMemoryToolResults,
	runMemorySummary,
	runMemoryTrial,
	totalMemoryUsage,
	STUDY_MEMORY_DISABLED_SETTINGS,
	STUDY_MEMORY_CONTEXT_KEYS,
	STUDY_MEMORY_ESTIMATE_KEYS,
	STUDY_MEMORY_EVENT_KEYS,
	STUDY_MEMORY_OBSERVED_EVENTS,
	STUDY_MEMORY_REFUSAL_KEYS,
	STUDY_MEMORY_FIXED_PROJECTION,
	STUDY_MEMORY_FIXED_SETTINGS,
	STUDY_MEMORY_SUMMARY_FOLDS,
	STUDY_MEMORY_SUMMARY_LIMIT,
	STUDY_MEMORY_SUMMARY_PROJECTIONS,
	STUDY_MEMORY_SUMMARY_ROOM,
	STUDY_MEMORY_MALFORMED_SETTINGS,
	STUDY_MEMORY_MODULES,
	STUDY_MEMORY_OBSERVATION_GOALS,
	STUDY_MEMORY_OBSERVED_KEYS,
	STUDY_MEMORY_OBSERVED_SETTINGS,
	STUDY_MEMORY_PASSIVE_SETTINGS,
	STUDY_MEMORY_RELEASE_GOALS,
	STUDY_MEMORY_SETTINGS,
	WINDOW_GOAL,
	STUDY_MEMORY_TIMING,
	STUDY_MEMORY_TIMING_CASES,
} from '../../setupStudy.js'

describe('actual Agent/Ledger/Ollama memory consumer', () => {
	it('releases and replaces snapshots while preserving earlier wire receipts and fresh trial isolation', async () => {
		const server = await createMemoryServer(
			Array.from({ length: 5 }, () => [
				{
					path: '/api/chat',
					body: buildMemoryReply({
						content: '',
						calls: [{ function: { name: 'lookup', arguments: { id: 'order:BC-7301' } } }],
					}),
				},
				{ path: '/api/chat', body: buildMemoryReply() },
			]).flat(),
		)
		const profile = buildMemoryProfile({ url: server.url })
		const fixture = createMemoryContext(profile)
		const driver = new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile })
		try {
			const session = await driver.open(
				{ id: 'release', scenario: 'public', arm: 'full', repetition: 0 },
				fixture.context.signal,
			)
			try {
				for (const [index, goal] of STUDY_MEMORY_RELEASE_GOALS.entries()) {
					await session.execute(
						{
							id: goal.id,
							input: {
								prompt: 'Read lookup id order:BC-7301',
								arrivals: [],
								records: goal.records,
							},
						},
						fixture.context,
					)
					const request = server.requests.filter((entry) => entry.path === '/api/chat').at(-1)
					if (request === undefined) throw new Error('Missing actual chat request')
					const expected =
						goal.id === 'before'
							? 'No record'
							: goal.id === 'initial'
								? 'order:BC-7301: Mara Ellison\nOriginal $265.86'
								: 'order:BC-7301: Mara Ellison revised\nCorrected $260.35'
					expect(readMemoryToolResults(request.body).at(-1)).toBe(expected)
					expect(readMemoryToolResults(request.body)).toEqual(
						[
							'No record',
							'order:BC-7301: Mara Ellison\nOriginal $265.86',
							'order:BC-7301: Mara Ellison revised\nCorrected $260.35',
							'order:BC-7301: Mara Ellison revised\nCorrected $260.35',
						].slice(0, index + 1),
					)
				}
				expect(
					fixture.evidence.filter((row) => row.event === 'lookup').map((row) => row.value),
				).toEqual([
					{ id: 'order:BC-7301', found: false },
					{ id: 'order:BC-7301', found: true },
					{ id: 'order:BC-7301', found: true },
					{ id: 'order:BC-7301', found: true },
				])
				expect(
					fixture.context.meter.usage.filter((row) => row.role === 'tool').map((row) => row.bytes),
				).toEqual(
					[
						'No record',
						'order:BC-7301: Mara Ellison\nOriginal $265.86',
						'order:BC-7301: Mara Ellison revised\nCorrected $260.35',
						'order:BC-7301: Mara Ellison revised\nCorrected $260.35',
					].map(
						(receipt) =>
							new TextEncoder().encode(
								JSON.stringify({ id: 'order:BC-7301' }) + JSON.stringify(receipt),
							).byteLength,
					),
				)
			} finally {
				await session.close()
				fixture.close()
			}
			const fresh = createMemoryContext(profile)
			const trial = await driver.open(
				{ id: 'fresh', scenario: 'public', arm: 'full', repetition: 1 },
				fresh.context.signal,
			)
			try {
				await trial.execute(
					{
						id: 'before',
						input: { prompt: 'Read lookup id order:BC-7301', arrivals: [], records: [] },
					},
					fresh.context,
				)
				const request = server.requests.filter((entry) => entry.path === '/api/chat').at(-1)
				if (request === undefined) throw new Error('Missing fresh trial request')
				expect(readMemoryToolResults(request.body)).toEqual(['No record'])
			} finally {
				await trial.close()
				fresh.close()
			}
		} finally {
			fixture.close()
			await server.close()
		}
	})
	it('dispatches actual memory work after generic validation and rejects invalid room controls', async () => {
		const server = await createMemoryServer()
		const profile = buildMemoryProfile({ url: server.url })
		const fixture = createMemoryContext(profile)
		try {
			const input = await loadMemoryInputs(profile)
			expect(() =>
				validateStudyInputs(input.definition, input.scenarios, input.rubric, profile),
			).not.toThrow()
			expect(() =>
				validateStudyInputs(input.definition, input.scenarios, input.rubric, {
					...profile,
					roots: [],
				}),
			).toThrow('profile')
			expect(() =>
				validateStudyInputs(input.definition, input.scenarios, input.rubric, {
					...profile,
					bounds: {
						...profile.bounds,
						request: { ...profile.bounds.request, tokens: profile.room.context },
					},
				}),
			).toThrow('room')
			const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
				{ id: 'generic', scenario: 'handoff', arm: 'full', repetition: 0 },
				fixture.context.signal,
			)
			try {
				const goal = input.scenarios[0]?.goals[0]
				if (goal === undefined) throw new Error('Missing authored memory goal')
				await expect(session.execute(goal, fixture.context)).resolves.toEqual({
					value: { content: 'Receipt retained.' },
					partial: false,
				})
				expect(server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(1)
				expect(fixture.context.meter.usage.find((row) => row.role === 'agent')).toMatchObject({
					calls: 1,
					tokens: 12,
				})
			} finally {
				await session.close()
			}
		} finally {
			fixture.close()
			await server.close()
		}
	})

	it('constructs from the selected runtime without reading the subject and needs Ledger and judge factories only for records', async () => {
		const server = await createMemoryServer()
		const profile = buildMemoryProfile({ url: server.url, settings: STUDY_MEMORY_SETTINGS })
		const fixture = createMemoryContext(profile)
		const { agent, provider } = STUDY_MEMORY_MODULES
		// The subject identifies the tested artifact: an object that throws on any read proves it is never touched.
		const untouched = new Proxy(
			{},
			{
				get: () => {
					throw new Error('subject read')
				},
				has: () => {
					throw new Error('subject read')
				},
			},
		)
		const runtime = {
			Agent: agent.Agent,
			createConversationManager: agent.createConversationManager,
			estimateRequest: agent.estimateRequest,
			measureRequest: agent.measureRequest,
			isAgentError: agent.isAgentError,
		}
		const lean = { createOllama: provider.createOllama, extractTiming: provider.extractTiming }
		const records = { id: 'records', scenario: 'public', arm: 'records', repetition: 0 }
		try {
			// The runtime is the selected Agent: a valid subject cannot stand in for an invalid runtime.
			expect(
				() => new StudyMemoryDriver({ agent: untouched, subject: agent, provider, profile }),
			).toThrow(expect.objectContaining({ code: 'CONFIG' }))
			const driver = new StudyMemoryDriver({
				agent: runtime,
				subject: untouched,
				provider: lean,
				profile,
			})
			for (const arm of ['full', 'compaction']) {
				const session = await driver.open(
					{ id: arm, scenario: 'public', arm, repetition: 0 },
					fixture.context.signal,
				)
				await session.close()
			}
			await expect(driver.open(records, fixture.context.signal)).rejects.toThrow(
				expect.objectContaining({ code: 'CONFIG', message: expect.stringContaining('Ledger') }),
			)
			// A full runtime without the judge factory still refuses the records arm.
			await expect(
				new StudyMemoryDriver({ agent, subject: untouched, provider: lean, profile }).open(
					records,
					fixture.context.signal,
				),
			).rejects.toThrow(expect.objectContaining({ code: 'CONFIG' }))
			const session = await new StudyMemoryDriver({
				agent,
				subject: untouched,
				provider,
				profile,
			}).open(records, fixture.context.signal)
			await session.close()
			expect(server.requests).toEqual([])
		} finally {
			fixture.close()
			await server.close()
		}
	})

	it('runs the full arm with no declared judge or recap and pins only the served model', async () => {
		const server = await createMemoryServer()
		const base = buildMemoryProfile({ url: server.url })
		const declared = base.provider
		if (declared === undefined) throw new Error('Missing fixture provider')
		const profile = {
			...base,
			provider: {
				...declared,
				judge: undefined,
				digest: { model: declared.digest.model, judge: undefined },
			},
			room: { ...base.room, recap: undefined },
		}
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'plain', scenario: 'public', arm: 'full', repetition: 0 },
			fixture.context.signal,
		)
		try {
			await expect(session.execute(WINDOW_GOAL, fixture.context)).resolves.toEqual({
				value: { content: 'Receipt retained.' },
				partial: false,
			})
			expect(readMemoryEvents(fixture.evidence, 'inventory')).toEqual([
				{ model: 'a'.repeat(64) },
				{ model: 'a'.repeat(64) },
			])
			expect(readMemoryEvents(fixture.evidence, 'support').map((value) => value.model)).toEqual([
				'model',
				'model',
			])
			expect(server.requests.some((request) => request.body.includes('judge'))).toBe(false)
			expect(fixture.context.meter.usage.some((row) => row.role === 'judge')).toBe(false)
		} finally {
			await session.close()
			fixture.close()
			await server.close()
		}
	})

	it('refuses lookup before record access or evidence when the goal call allowance is exhausted', async () => {
		const server = await createMemoryServer([
			{
				path: '/api/chat',
				body: buildMemoryReply({
					content: '',
					calls: [{ function: { name: 'lookup', arguments: { id: 'record' } } }],
				}),
			},
		])
		const base = buildMemoryProfile({ url: server.url })
		const profile = { ...base, bounds: { ...base.bounds, goal: { ...base.bounds.goal, calls: 4 } } }
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'refusal', scenario: 'handoff', arm: 'full', repetition: 0 },
			fixture.context.signal,
		)
		try {
			await expect(
				session.execute(
					{
						id: 'first',
						input: {
							prompt: 'Read record',
							arrivals: [],
							records: [{ id: 'record', name: 'Owner', content: 'Never returned' }],
						},
					},
					fixture.context,
				),
			).rejects.toBeDefined()
			expect(
				fixture.evidence.filter((row) => row.event === 'lookup' || row.event === 'result'),
			).toEqual([])
			expect(fixture.context.meter.usage.filter((row) => row.role === 'tool')).toEqual([])
			expect(server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(1)
		} finally {
			await session.close()
			fixture.close()
			await server.close()
		}
	})

	it('retains actual lookup bytes once when the result exceeds its reservation', async () => {
		const server = await createMemoryServer([
			{
				path: '/api/chat',
				body: buildMemoryReply({
					content: '',
					calls: [{ function: { name: 'lookup', arguments: { id: 'record' } } }],
				}),
			},
		])
		const base = buildMemoryProfile({ url: server.url })
		const profile = {
			...base,
			bounds: { ...base.bounds, request: { ...base.bounds.request, bytes: 8192 } },
		}
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'bytes', scenario: 'handoff', arm: 'full', repetition: 0 },
			fixture.context.signal,
		)
		const content = 'a'.repeat(profile.bounds.request.bytes)
		try {
			await expect(
				session.execute(
					{
						id: 'first',
						input: {
							prompt: 'Read record',
							arrivals: [],
							records: [{ id: 'record', name: 'Owner', content }],
						},
					},
					fixture.context,
				),
			).rejects.toBeDefined()
			expect(fixture.context.meter.usage.filter((row) => row.role === 'tool')).toEqual([
				expect.objectContaining({
					calls: 1,
					tokens: 0,
					bytes: new TextEncoder().encode(
						JSON.stringify({ id: 'record' }) + JSON.stringify(`record: Owner\n${content}`),
					).byteLength,
				}),
			])
			expect(fixture.evidence.filter((row) => row.event === 'result')).toEqual([])
			expect(server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(1)
		} finally {
			await session.close()
			fixture.close()
			await server.close()
		}
	})

	it('settles malformed lookup arguments with their known cost and stops subsequent work', async () => {
		const server = await createMemoryServer([
			{
				path: '/api/chat',
				body: buildMemoryReply({
					content: '',
					calls: [{ function: { name: 'lookup', arguments: { id: 42 } } }],
				}),
			},
		])
		const profile = buildMemoryProfile({ url: server.url })
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'arguments', scenario: 'handoff', arm: 'full', repetition: 0 },
			fixture.context.signal,
		)
		try {
			await expect(
				session.execute(
					{ id: 'first', input: { prompt: 'Read record', arrivals: [], records: [] } },
					fixture.context,
				),
			).rejects.toThrow('id')
			expect(fixture.context.meter.usage.filter((row) => row.role === 'tool')).toEqual([
				expect.objectContaining({
					calls: 1,
					tokens: 0,
					bytes: new TextEncoder().encode(JSON.stringify({ id: 42 })).byteLength,
				}),
			])
			expect(
				fixture.evidence.filter((row) => row.event === 'lookup' || row.event === 'result'),
			).toEqual([])
			expect(server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(1)
		} finally {
			await session.close()
			fixture.close()
			await server.close()
		}
	})

	it('admits and settles absent record lookups with the encoded response cost', async () => {
		const server = await createMemoryServer([
			{
				path: '/api/chat',
				body: buildMemoryReply({
					content: '',
					calls: [{ function: { name: 'lookup', arguments: { id: 'absent' } } }],
				}),
			},
		])
		const profile = buildMemoryProfile({ url: server.url })
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'absent', scenario: 'handoff', arm: 'full', repetition: 0 },
			fixture.context.signal,
		)
		try {
			await session.execute(
				{ id: 'first', input: { prompt: 'Read record', arrivals: [], records: [] } },
				fixture.context,
			)
			expect(fixture.context.meter.usage.filter((row) => row.role === 'tool')).toEqual([
				expect.objectContaining({
					calls: 1,
					tokens: 0,
					bytes: new TextEncoder().encode(
						JSON.stringify({ id: 'absent' }) + JSON.stringify('No record'),
					).byteLength,
				}),
			])
			expect(fixture.evidence).toContainEqual({
				event: 'lookup',
				goal: 'first',
				value: { id: 'absent', found: false },
			})
			expect(server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(2)
		} finally {
			await session.close()
			fixture.close()
			await server.close()
		}
	})

	it('preserves corrections and lookup traces across goals and starts repetitions fresh', async () => {
		const server = await createMemoryServer([
			{
				path: '/api/chat',
				body: buildMemoryReply({
					content: '',
					calls: [{ function: { name: 'lookup', arguments: { id: 'order-1' } } }],
				}),
			},
			{ path: '/api/chat', body: buildMemoryReply({ content: 'Initial handoff' }) },
			{ path: '/api/chat', body: buildMemoryReply({ content: 'Corrected handoff' }) },
		])
		const profile = buildMemoryProfile({ url: server.url })
		const fixture = createMemoryContext(profile)
		const driver = new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile })
		const session = await driver.open(
			{ id: 'full-1', scenario: 'public', arm: 'full', repetition: 0 },
			fixture.context.signal,
		)
		try {
			await expect(
				session.execute(
					{
						id: 'opening',
						input: {
							prompt: 'Look up order-1',
							arrivals: [{ id: 'source-1', content: 'Count was three.' }],
							records: [{ id: 'order-1', name: 'Owner', content: 'Confirmed reference' }],
						},
					},
					fixture.context,
				),
			).resolves.toEqual({ value: { content: 'Initial handoff' }, partial: false })
			await expect(
				session.execute(
					{
						id: 'correction',
						input: {
							prompt: 'Repair handoff',
							arrivals: [{ id: 'source-2', content: 'Correction: count is two.' }],
							records: [],
						},
					},
					fixture.context,
				),
			).resolves.toEqual({ value: { content: 'Corrected handoff' }, partial: false })
			expect(fixture.evidence).toContainEqual({
				event: 'lookup',
				goal: 'opening',
				value: { id: 'order-1', found: true },
			})
			expect(
				server.requests.filter((request) => request.path === '/api/chat').at(-1)?.body,
			).toContain('Count was three.')
			expect(
				server.requests.filter((request) => request.path === '/api/chat').at(-1)?.body,
			).toContain('Correction: count is two.')
			expect(fixture.context.meter.usage).toHaveLength(server.requests.length + 1)
			expect(fixture.context.meter.usage.filter((row) => row.role === 'tool')).toEqual([
				expect.objectContaining({
					calls: 1,
					tokens: 0,
					bytes: new TextEncoder().encode(
						JSON.stringify({ id: 'order-1' }) +
							JSON.stringify('order-1: Owner\nConfirmed reference'),
					).byteLength,
				}),
			])
			await session.close()
			const repeat = await driver.open(
				{ id: 'full-2', scenario: 'public', arm: 'full', repetition: 1 },
				fixture.context.signal,
			)
			try {
				await repeat.execute(
					{ id: 'fresh', input: { prompt: 'Fresh request', arrivals: [], records: [] } },
					fixture.context,
				)
				expect(
					server.requests.filter((request) => request.path === '/api/chat').at(-1)?.body,
				).not.toContain('source-1')
			} finally {
				await repeat.close()
			}
		} finally {
			await session.close()
			fixture.close()
			await server.close()
		}
	})

	it('runs actual Ledger classification and accepts its one-token judge readouts', async () => {
		const server = await createMemoryServer()
		const profile = buildMemoryProfile({ url: server.url })
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'records-1', scenario: 'public', arm: 'records', repetition: 0 },
			fixture.context.signal,
		)
		try {
			const result = await session.execute(
				{
					id: 'opening',
					input: {
						prompt: 'State the current order count',
						arrivals: [{ id: 'source', content: 'The order count is two.' }],
						records: [],
					},
				},
				fixture.context,
			)
			expect(result.partial).toBe(false)
			expect(server.requests.some((request) => request.path === '/api/generate')).toBe(true)
			expect(
				fixture.evidence.some(
					(row) =>
						row.event === 'wire' &&
						isRecord(row.value) &&
						row.value.role === 'judge' &&
						row.value.finish === 'length',
				),
			).toBe(true)
			expect(fixture.context.meter.usage).toHaveLength(server.requests.length)
		} finally {
			await session.close()
			fixture.close()
			await server.close()
		}
	})

	it('uses the actual Conversation summary path under an Agent window budget', async () => {
		const server = await createMemoryServer()
		const profile = buildMemoryProfile({
			url: server.url,
			room: STUDY_MEMORY_SUMMARY_ROOM,
			settings: STUDY_MEMORY_SETTINGS,
		})
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'compact-1', scenario: 'public', arm: 'compaction', repetition: 0 },
			fixture.context.signal,
		)
		try {
			await session.execute(
				{
					id: 'opening',
					input: {
						prompt: 'Retain obligations',
						arrivals: Array.from({ length: 8 }, (_, index) => ({
							id: `source-${index}`,
							content: `Obligation ${index}. ${'Maintain this source detail. '.repeat(40)}`,
						})),
						records: [],
					},
				},
				fixture.context,
			)
			expect(fixture.evidence.some((row) => row.event === 'summary')).toBe(true)
			expect(fixture.context.meter.usage.some((row) => row.role === 'summary')).toBe(true)
			expect(fixture.context.meter.usage).toHaveLength(server.requests.length)
		} finally {
			await session.close()
			fixture.close()
			await server.close()
		}
	})

	it('rolls repeated Compaction summaries into one recap that covers the prior recap and the new live slice', async () => {
		const responses = ['Recap one', 'Answer one', 'Recap two', 'Answer two'].map((content) => ({
			path: '/api/chat',
			body: buildMemoryReply({ content }),
		}))
		const trial: MemoryTrialFixture = {
			arm: 'compaction',
			responses,
			goals: buildMemoryRollingGoals(),
			room: STUDY_MEMORY_SUMMARY_ROOM,
			settings: { ...STUDY_MEMORY_SETTINGS, observe: true },
		}
		const rolling = await runMemoryTrial({
			...trial,
			settings: { ...STUDY_MEMORY_SETTINGS, observe: true, rolling: true },
		})
		const control = await runMemoryTrial(trial)

		for (const result of [rolling, control]) {
			expect(result.failure).toBeUndefined()
			const chats = result.requests.filter((request) => request.path === '/api/chat')
			expect(chats.map((request) => request.body.includes('Summarize the conversation'))).toEqual([
				true,
				false,
				true,
				false,
			])
		}
		const rollingChats = rolling.requests.filter((request) => request.path === '/api/chat')
		const controlChats = control.requests.filter((request) => request.path === '/api/chat')
		const framed = '[Summary of earlier messages] '

		// The second summary digests the framed first recap and the new slice, never the folded originals.
		expect(rollingChats[2]?.body).toContain(`${framed}Recap one`)
		expect(rollingChats[2]?.body).toContain('[Source a7]')
		expect(rollingChats[2]?.body).toContain('[Source b5]')
		expect(rollingChats[2]?.body).not.toContain('[Source a0]')
		expect(rollingChats[2]?.body).not.toContain('[Source b6]')
		// The next agent request carries the single newest recap and the live arrival.
		expect(rollingChats[3]?.body).toContain(`${framed}Recap two`)
		expect(rollingChats[3]?.body).not.toContain('Recap one')
		expect(rollingChats[3]?.body).toContain('[Source b6]')
		// The second summary names the prior recap among its sources beside the slice.
		const [, rolled] = readMemoryEvents(rolling.evidence, 'summary').map((row) =>
			Array.isArray(row.sources) ? row.sources.length : -1,
		)
		const [, appended] = readMemoryEvents(control.evidence, 'summary').map((row) =>
			Array.isArray(row.sources) ? row.sources.length : -1,
		)
		expect(appended).toBeGreaterThan(0)
		expect(rolled).toBe(Number(appended) + 1)

		// The captured second summary dispatch names its first history member as the first section's recap.
		const dispatched = readMemoryEvents(rolling.evidence, 'context').filter(
			(row) => row.stage === 'dispatch',
		)
		const summaryDispatches = dispatched.filter((row) => row.role === 'summary')
		const agentDispatches = dispatched.filter((row) => row.role === 'agent')
		expect([summaryDispatches.length, agentDispatches.length]).toEqual([2, 2])
		const secondOrigins = readMemoryOrigins(summaryDispatches[1]?.origins)
		expect(secondOrigins[0]).toEqual({ origin: 'instructions', source: 'summary' })
		const recap = secondOrigins[1]
		expect(recap?.origin).toBe('summary')
		expect(recap?.source).toBeDefined()
		const [, secondSummary] = readMemoryEvents(rolling.evidence, 'summary')
		const covered = Array.isArray(secondSummary?.sources) ? secondSummary.sources : []
		expect(covered[0]).toBe(recap?.source)
		expect(covered).toContain(recap?.source)
		// The slice the second summary covers keeps its arrival provenance.
		expect(secondOrigins).toContainEqual({ origin: 'arrival', source: 'a7' })
		expect(secondOrigins).toContainEqual({ origin: 'arrival', source: 'b5' })
		// The first agent request already named that recap; the last names the single new one and the live input.
		expect(readMemoryOrigins(agentDispatches[0]?.origins)).toContainEqual(recap)
		const lastOrigins = readMemoryOrigins(agentDispatches[1]?.origins)
		expect(lastOrigins).toContainEqual({ origin: 'arrival', source: 'b6' })
		expect(lastOrigins).toContainEqual({ origin: 'input', source: 'second' })
		expect(lastOrigins.filter((entry) => entry.origin === 'summary')).toHaveLength(1)
		expect(lastOrigins).not.toContainEqual(recap)

		// The default stays append-only: the second summary sees no recap and the agent sees both.
		expect(controlChats[2]?.body).not.toContain('Recap one')
		expect(controlChats[3]?.body).toContain(`${framed}Recap one`)
		expect(controlChats[3]?.body).toContain(`${framed}Recap two`)
	})

	it('keeps wire bytes identical for rolling false or omitted, and for a non-Compaction arm given rolling', async () => {
		const goals = buildMemoryRollingGoals()
		const room = STUDY_MEMORY_SUMMARY_ROOM
		const omitted = await runMemoryTrial({
			arm: 'compaction',
			responses: [],
			goals,
			room,
			settings: STUDY_MEMORY_SETTINGS,
		})
		const disabled = await runMemoryTrial({
			arm: 'compaction',
			responses: [],
			goals,
			room,
			settings: { ...STUDY_MEMORY_SETTINGS, rolling: false },
		})
		const full = await runMemoryTrial({ arm: 'full', responses: [], goals: [WINDOW_GOAL] })
		const ignored = await runMemoryTrial({
			arm: 'full',
			responses: [],
			goals: [WINDOW_GOAL],
			settings: { rolling: true },
		})

		expect([omitted.failure, disabled.failure, full.failure, ignored.failure]).toEqual([
			undefined,
			undefined,
			undefined,
			undefined,
		])
		expect(omitted.requests.length).toBeGreaterThan(2)
		expect(disabled.requests).toEqual(omitted.requests)
		expect(ignored.requests).toEqual(full.requests)
	})

	it.each(['length', 'overflow', 'malformed', 'missing', 'duplicate', 'http'])(
		'latches %s failures before subsequent dispatch',
		async (fault) => {
			const body =
				fault === 'length'
					? buildMemoryReply({ reason: 'length' })
					: fault === 'overflow'
						? buildMemoryReply({ prompt: 40000 })
						: fault === 'malformed'
							? '{broken\n'
							: fault === 'missing'
								? `${JSON.stringify({ model: 'model', done: false, message: { role: 'assistant', content: 'partial' } })}\n`
								: fault === 'duplicate'
									? buildMemoryReply() + buildMemoryReply()
									: 'Unavailable'
			const server = await createMemoryServer([
				{ path: '/api/chat', body, ...(fault === 'http' ? { status: 503 } : {}) },
			])
			const profile = buildMemoryProfile({ url: server.url })
			const fixture = createMemoryContext(profile)
			const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
				{ id: 'failed', scenario: 'public', arm: 'full', repetition: 0 },
				fixture.context.signal,
			)
			try {
				await expect(
					session.execute(
						{ id: 'first', input: { prompt: 'Respond', arrivals: [], records: [] } },
						fixture.context,
					),
				).rejects.toBeDefined()
				const requests = server.requests.length
				expect(fixture.context.meter.usage.find((row) => row.role === 'agent')?.tokens).toBe(
					fault === 'length' ? 12 : fault === 'overflow' ? 40002 : undefined,
				)
				await expect(
					session.execute(
						{ id: 'next', input: { prompt: 'Continue', arrivals: [], records: [] } },
						fixture.context,
					),
				).rejects.toBeDefined()
				expect(server.requests).toHaveLength(requests)
			} finally {
				await session.close()
				fixture.close()
				await server.close()
			}
		},
	)

	it('retains unknown token usage without inventing a zero', async () => {
		const server = await createMemoryServer([
			{ path: '/api/chat', body: buildMemoryReply({ unknown: true }) },
		])
		const profile = buildMemoryProfile({ url: server.url })
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'unknown', scenario: 'public', arm: 'full', repetition: 0 },
			fixture.context.signal,
		)
		try {
			await session.execute(
				{ id: 'first', input: { prompt: 'Respond', arrivals: [], records: [] } },
				fixture.context,
			)
			expect(
				fixture.context.meter.usage.find((row) => row.role === 'agent')?.tokens,
			).toBeUndefined()
			expect(fixture.context.meter.usage).toHaveLength(7)
		} finally {
			await session.close()
			fixture.close()
			await server.close()
		}
	})

	it('refuses unsupported context before any model call', async () => {
		const server = await createMemoryServer([{ path: '/api/show', body: '{}' }])
		const profile = buildMemoryProfile({ url: server.url })
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'metadata', scenario: 'public', arm: 'full', repetition: 0 },
			fixture.context.signal,
		)
		try {
			await expect(
				session.execute(
					{ id: 'first', input: { prompt: 'Respond', arrivals: [], records: [] } },
					fixture.context,
				),
			).rejects.toThrow('metadata')
			expect(server.requests.map((request) => request.path)).toEqual(['/api/tags', '/api/show'])
		} finally {
			await session.close()
			fixture.close()
			await server.close()
		}
	})

	it('retains product evidence but refuses completion after a serving digest changes', async () => {
		const server = await createMemoryServer([
			{ path: '/api/chat', body: buildMemoryReply({ content: 'Actual product' }) },
			{
				path: '/api/tags',
				body: JSON.stringify({
					models: [
						{ name: 'model', digest: 'c'.repeat(64) },
						{ name: 'judge', digest: 'b'.repeat(64) },
					],
				}),
			},
		])
		const profile = buildMemoryProfile({ url: server.url })
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'changed', scenario: 'public', arm: 'full', repetition: 0 },
			fixture.context.signal,
		)
		try {
			await expect(
				session.execute(
					{ id: 'first', input: { prompt: 'Respond', arrivals: [], records: [] } },
					fixture.context,
				),
			).rejects.toThrow('digest')
			expect(
				fixture.evidence.some(
					(row) =>
						row.event === 'result' && isRecord(row.value) && row.value.content === 'Actual product',
				),
			).toBe(true)
			const requests = server.requests.length
			await expect(
				session.execute(
					{ id: 'next', input: { prompt: 'Continue', arrivals: [], records: [] } },
					fixture.context,
				),
			).rejects.toThrow('digest')
			expect(server.requests).toHaveLength(requests)
		} finally {
			await session.close()
			fixture.close()
			await server.close()
		}
	})

	it('latches real judge decoding errors caught by Ledger classification', async () => {
		const server = await createMemoryServer([
			{
				path: '/api/generate',
				body: JSON.stringify({
					model: 'judge',
					done: true,
					done_reason: 'length',
					prompt_eval_count: 10,
					eval_count: 1,
					logprobs: [],
				}),
			},
		])
		const profile = buildMemoryProfile({ url: server.url })
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'judge-fault', scenario: 'public', arm: 'records', repetition: 0 },
			fixture.context.signal,
		)
		try {
			await expect(
				session.execute(
					{
						id: 'first',
						input: {
							prompt: 'Respond',
							arrivals: [{ id: 'source', content: 'Order count is two.' }],
							records: [],
						},
					},
					fixture.context,
				),
			).rejects.toBeDefined()
			expect(server.requests.filter((request) => request.path === '/api/generate')).toHaveLength(1)
			const requests = server.requests.length
			await expect(
				session.execute(
					{ id: 'next', input: { prompt: 'Continue', arrivals: [], records: [] } },
					fixture.context,
				),
			).rejects.toBeDefined()
			expect(server.requests).toHaveLength(requests)
		} finally {
			await session.close()
			fixture.close()
			await server.close()
		}
	})

	it('refuses budget before native model dispatch', async () => {
		const server = await createMemoryServer()
		const base = buildMemoryProfile({ url: server.url })
		const profile = {
			...base,
			bounds: { ...base.bounds, request: { ...base.bounds.request, tokens: 1 } },
		}
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'budget', scenario: 'public', arm: 'full', repetition: 0 },
			fixture.context.signal,
		)
		try {
			await expect(
				session.execute(
					{ id: 'first', input: { prompt: 'Respond', arrivals: [], records: [] } },
					fixture.context,
				),
			).rejects.toBeDefined()
			expect(server.requests.map((request) => request.path)).toEqual([
				'/api/tags',
				'/api/show',
				'/api/show',
			])
		} finally {
			await session.close()
			fixture.close()
			await server.close()
		}
	})

	it.each([undefined, {}, { observe: true }])(
		'refuses a compaction arm declared with settings %j before any model request',
		async (settings) => {
			const server = await createMemoryServer()
			const profile = buildMemoryProfile({ url: server.url, settings })
			const fixture = createMemoryContext(profile)
			const driver = new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile })
			try {
				await expect(
					driver.open(
						{ id: 'ungauged', scenario: 'public', arm: 'compaction', repetition: 0 },
						fixture.context.signal,
					),
				).rejects.toThrow(
					expect.objectContaining({ code: 'CONFIG', message: expect.stringContaining('gauge') }),
				)
				for (const arm of ['records', 'full']) {
					const session = await driver.open(
						{ id: arm, scenario: 'public', arm, repetition: 0 },
						fixture.context.signal,
					)
					await session.close()
				}
				expect(server.requests).toEqual([])
			} finally {
				fixture.close()
				await server.close()
			}
		},
	)

	it('refuses malformed settings when the driver is constructed', () => {
		for (const settings of [
			{ extra: 1 },
			{ gauge: { scale: 0, overhead: 0 } },
			{ gauge: { scale: 1, overhead: -1 } },
		])
			expect(
				() =>
					new StudyMemoryDriver({
						...STUDY_MEMORY_MODULES,
						profile: buildMemoryProfile({ url: 'http://127.0.0.1:1', settings }),
					}),
			).toThrow('settings')
	})

	it('admits a request priced one unit below the window max and leaves the provider payload unchanged', async () => {
		const server = await createMemoryServer()
		const base = buildMemoryProfile({ url: server.url })
		const profile = { ...base, settings: buildMemoryEdge(base, -2) }
		const fixture = createMemoryContext(profile)
		const driver = new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile })
		try {
			for (const arm of ['compaction', 'full']) {
				const session = await driver.open(
					{ id: arm, scenario: 'public', arm, repetition: 0 },
					fixture.context.signal,
				)
				try {
					await expect(session.execute(WINDOW_GOAL, fixture.context)).resolves.toEqual({
						value: { content: 'Receipt retained.' },
						partial: false,
					})
				} finally {
					await session.close()
				}
			}
			const chats = server.requests.filter((request) => request.path === '/api/chat')
			expect(chats).toHaveLength(2)
			const [windowed, plain] = chats.map((request) => parseJSON(request.body))
			if (!isRecord(windowed) || !isRecord(plain)) throw new Error('Invalid chat request')
			expect(windowed).toMatchObject({
				model: 'model',
				stream: true,
				think: false,
				options: { num_ctx: 32768, num_predict: 512, temperature: 0, seed: 0 },
			})
			// Compaction adds only the two explicit native controls; every other member matches the plain request.
			expect(Object.keys(windowed).toSorted()).toEqual(
				[...Object.keys(plain), 'shift', 'truncate'].toSorted(),
			)
			expect([windowed.truncate, windowed.shift]).toEqual([false, false])
			expect('truncate' in plain || 'shift' in plain).toBe(false)
			expect(windowed.options).toEqual(plain.options)
			expect(windowed.tools).toEqual(plain.tools)
			expect(chats[0]?.body).not.toContain('overhead')
			expect(chats[0]?.body).not.toContain('"gauge"')
		} finally {
			fixture.close()
			await server.close()
		}
	})

	it('refuses a request priced at the window max before dispatch, attributes capacity to the agent and stays latched', async () => {
		const server = await createMemoryServer()
		const base = buildMemoryProfile({ url: server.url })
		const profile = { ...base, settings: buildMemoryEdge(base, -1) }
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'edge', scenario: 'public', arm: 'compaction', repetition: 0 },
			fixture.context.signal,
		)
		try {
			const refused = await session.execute(WINDOW_GOAL, fixture.context).then(
				() => undefined,
				(reason: unknown) => reason,
			)
			expect(isStudyError(refused)).toBe(true)
			expect(refused).toMatchObject({
				code: 'CAPACITY',
				failure: { cause: 'capacity', role: 'agent' },
			})
			expect(readStudyFailure(refused)).toMatchObject({ cause: 'capacity', role: 'agent' })
			expect(server.requests.filter((request) => request.path === '/api/chat')).toEqual([])
			expect(
				fixture.evidence.filter(
					(row) => row.event === 'dispatch' && isRecord(row.value) && row.value.role !== 'metadata',
				),
			).toEqual([])
			expect(
				fixture.context.meter.usage.filter((row) => row.role === 'agent' || row.role === 'summary'),
			).toEqual([])
			const again = await session.execute(WINDOW_GOAL, fixture.context).then(
				() => undefined,
				(reason: unknown) => reason,
			)
			expect(again).toBe(refused)
			expect(server.requests.filter((request) => request.path === '/api/chat')).toEqual([])
		} finally {
			await session.close()
			fixture.close()
			await server.close()
		}
	})

	it('prices the same request by the declared scale', async () => {
		const server = await createMemoryServer()
		const base = buildMemoryProfile({ url: server.url })
		const outcomes: unknown[] = []
		try {
			for (const scale of [1, 1_000_000]) {
				const profile = { ...base, settings: { gauge: { scale, overhead: 0 } } }
				const fixture = createMemoryContext(profile)
				const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
					{ id: `scale-${scale}`, scenario: 'public', arm: 'compaction', repetition: 0 },
					fixture.context.signal,
				)
				try {
					outcomes.push(
						await session.execute(WINDOW_GOAL, fixture.context).then(
							(product) => product,
							(reason: unknown) => reason,
						),
					)
				} finally {
					await session.close()
					fixture.close()
				}
			}
			expect(outcomes[0]).toEqual({ value: { content: 'Receipt retained.' }, partial: false })
			expect(outcomes[1]).toMatchObject({
				code: 'CAPACITY',
				failure: { cause: 'capacity', role: 'agent' },
			})
			expect(server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(1)
		} finally {
			await server.close()
		}
	})

	it('retains the post-response guard when an identity gauge admits a prompt over the reserved room', async () => {
		const server = await createMemoryServer([
			{ path: '/api/chat', body: buildMemoryReply({ prompt: 32129 }) },
		])
		const profile = buildMemoryProfile({ url: server.url, settings: STUDY_MEMORY_SETTINGS })
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'over-reserve', scenario: 'public', arm: 'compaction', repetition: 0 },
			fixture.context.signal,
		)
		try {
			await expect(session.execute(WINDOW_GOAL, fixture.context)).rejects.toBeDefined()
			expect(server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(1)
			expect(fixture.context.meter.usage.find((row) => row.role === 'agent')?.tokens).toBe(32131)
			const requests = server.requests.length
			await expect(
				session.execute(
					{ id: 'next', input: { prompt: 'Continue', arrivals: [], records: [] } },
					fixture.context,
				),
			).rejects.toMatchObject({
				code: 'CAPACITY',
				message: expect.stringContaining('reserved context capacity'),
			})
			expect(server.requests).toHaveLength(requests)
		} finally {
			await session.close()
			fixture.close()
			await server.close()
		}
	})

	it('preserves a failing summarizer instead of reporting window capacity', async () => {
		const server = await createMemoryServer([
			{ path: '/api/chat', body: 'Unavailable', status: 503 },
		])
		const profile = buildMemoryProfile({
			url: server.url,
			room: STUDY_MEMORY_SUMMARY_ROOM,
			settings: STUDY_MEMORY_SETTINGS,
		})
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'summarizer', scenario: 'public', arm: 'compaction', repetition: 0 },
			fixture.context.signal,
		)
		try {
			const failed = await session
				.execute(
					{
						id: 'opening',
						input: {
							prompt: 'Retain obligations',
							arrivals: Array.from({ length: 8 }, (_, index) => ({
								id: `source-${index}`,
								content: `Obligation ${index}. ${'Maintain this source detail. '.repeat(40)}`,
							})),
							records: [],
						},
					},
					fixture.context,
				)
				.then(
					() => undefined,
					(reason: unknown) => reason,
				)
			expect(failed).toBeDefined()
			expect(failed).not.toMatchObject({ code: 'CAPACITY' })
			expect(readStudyFailure(failed).cause).not.toBe('capacity')
			const dispatched = fixture.evidence
				.filter((row) => row.event === 'dispatch')
				.map((row) => (isRecord(row.value) ? row.value.role : undefined))
			expect(dispatched).toContain('summary')
			expect(dispatched).not.toContain('agent')
			const requests = server.requests.length
			await expect(
				session.execute(
					{ id: 'next', input: { prompt: 'Continue', arrivals: [], records: [] } },
					fixture.context,
				),
			).rejects.toMatchObject({ code: 'FAULT', message: expect.stringContaining('503') })
			expect(server.requests).toHaveLength(requests)
		} finally {
			await session.close()
			fixture.close()
			await server.close()
		}
	})

	it('keeps parent cancellation distinct from window capacity', async () => {
		const server = await createMemoryServer([
			{
				path: '/api/chat',
				body: `${JSON.stringify({ model: 'model', done: false, message: { content: 'partial' } })}\n`,
				open: true,
			},
		])
		const profile = buildMemoryProfile({ url: server.url, settings: STUDY_MEMORY_SETTINGS })
		const controller = new AbortController()
		const fixture = createMemoryContext(profile, controller.signal)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'cancelled', scenario: 'public', arm: 'compaction', repetition: 0 },
			controller.signal,
		)
		try {
			const running = session.execute(WINDOW_GOAL, fixture.context).then(
				() => undefined,
				(reason: unknown) => reason,
			)
			await vi.waitFor(
				() => expect(server.requests.some((request) => request.path === '/api/chat')).toBe(true),
				{ timeout: 5000 },
			)
			controller.abort(new Error('Cancelled by the study caller'))
			const cancelled = await running
			expect(cancelled).toBeDefined()
			expect(cancelled).not.toMatchObject({ code: 'CAPACITY' })
			expect(readStudyFailure(cancelled).cause).not.toBe('capacity')
		} finally {
			await session.close()
			fixture.close()
			await server.close()
		}
	})

	it('aborts a hung native response and closes within the finite request deadline', async () => {
		const server = await createMemoryServer([
			{
				path: '/api/chat',
				body: `${JSON.stringify({ model: 'model', done: false, message: { content: 'partial' } })}\n`,
				open: true,
			},
		])
		const base = buildMemoryProfile({ url: server.url })
		const profile = {
			...base,
			bounds: { ...base.bounds, request: { ...base.bounds.request, duration: 100 } },
		}
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'abort', scenario: 'public', arm: 'full', repetition: 0 },
			fixture.context.signal,
		)
		try {
			await expect(
				session.execute(
					{ id: 'first', input: { prompt: 'Respond', arrivals: [], records: [] } },
					fixture.context,
				),
			).rejects.toBeDefined()
			await session.close()
			expect(server.requests).toHaveLength(4)
		} finally {
			await session.close()
			fixture.close()
			await server.close()
		}
	})
})

describe('summary admission under the Compaction gauge', () => {
	it('pins the hand-counted summary fixtures to their arithmetic', () => {
		const { context, output, safety, recap } = STUDY_MEMORY_SUMMARY_ROOM
		expect(context - recap - safety).toBe(STUDY_MEMORY_SUMMARY_LIMIT)
		expect(context - output - safety).toBe(1920)
		// The instruction is 113 characters: ceil(113 / 4) = 29 plus 4 of framing.
		const instruction = 29 + 4
		const counted = Object.fromEntries(
			Object.entries(STUDY_MEMORY_SUMMARY_FOLDS).map(([name, lengths]) => [
				name,
				instruction + lengths.reduce((sum, length) => sum + length / 4 + 4, 0),
			]),
		)
		expect(counted).toEqual(STUDY_MEMORY_SUMMARY_PROJECTIONS)
		expect(STUDY_MEMORY_SUMMARY_PROJECTIONS.equal).toBe(STUDY_MEMORY_SUMMARY_LIMIT)
		expect(STUDY_MEMORY_SUMMARY_PROJECTIONS.below).toBe(STUDY_MEMORY_SUMMARY_LIMIT - 1)
		expect(STUDY_MEMORY_SUMMARY_PROJECTIONS.over).toBeGreaterThan(STUDY_MEMORY_SUMMARY_LIMIT)
		expect(STUDY_MEMORY_SUMMARY_PROJECTIONS.small).toBeLessThan(STUDY_MEMORY_SUMMARY_LIMIT)
		const input = buildMemorySummaryGoals([2196, 2192], 400)[0]?.input
		if (!isRecord(input) || !Array.isArray(input.arrivals)) throw new Error('Invalid summary goal')
		expect(
			input.arrivals.map((arrival) =>
				isRecord(arrival) ? `[Source ${String(arrival.id)}] ${String(arrival.content)}`.length : 0,
			),
		).toEqual([2196, 2192, 400])
	})

	it.each([
		['equal to', STUDY_MEMORY_SUMMARY_FOLDS.equal, STUDY_MEMORY_SUMMARY_PROJECTIONS.equal],
		['over', STUDY_MEMORY_SUMMARY_FOLDS.over, STUDY_MEMORY_SUMMARY_PROJECTIONS.over],
	])(
		'refuses a summary request %s the summary room before the provider and retains its admission and refusal',
		async (_name, folded, projected) => {
			const result = await runMemorySummary(folded, 400, [], true)
			expect(result.failure).toContain('Summary request')
			// Neither the summary nor any agent request reached the model.
			expect(result.requests.filter((request) => request.path === '/api/chat')).toEqual([])
			const contexts = readMemoryEvents(result.evidence, 'context')
			const admissions = contexts.filter((value) => value.role === 'summary')
			expect(admissions).toHaveLength(1)
			const [admission] = admissions
			expect(admission).toMatchObject({ stage: 'admission', estimate: projected, projected })
			expect(Object.keys(admission ?? {}).sort()).toEqual(listMemoryKeys(STUDY_MEMORY_CONTEXT_KEYS))
			expect(typeof admission?.revision).toBe('string')
			expect(readMemoryParts(admission?.parts)).toEqual({
				count: 8,
				tools: 0,
				schema: 0,
				total: projected,
			})
			expect(readMemoryOrigins(admission?.origins)[0]).toEqual({
				origin: 'instructions',
				source: 'summary',
			})
			const refusals = readMemoryEvents(result.evidence, 'refusal')
			expect(refusals).toHaveLength(1)
			expect(Object.keys(refusals[0] ?? {}).sort()).toEqual(STUDY_MEMORY_REFUSAL_KEYS)
			expect(refusals[0]).toMatchObject({
				cause: 'capacity',
				role: 'summary',
				ordinal: admission?.ordinal,
				revision: admission?.revision,
				consumed: projected,
				max: STUDY_MEMORY_SUMMARY_LIMIT,
			})
			for (const event of ['dispatch', 'wire', 'wire-failure'])
				expect(
					readMemoryEvents(result.evidence, event).filter(
						(value) => value.role === 'summary' || value.role === 'agent',
					),
				).toEqual([])
			expect(result.usage.filter((row) => row.role === 'summary' || row.role === 'agent')).toEqual(
				[],
			)
			const agent = contexts.filter((value) => value.role === 'agent')
			expect(agent.length).toBeGreaterThan(0)
			expect(
				agent.every(
					(value) =>
						value.stage === 'admission' && Number(value.ordinal) < Number(admission?.ordinal),
				),
			).toBe(true)
		},
	)

	it('applies the declared scale and overhead to summary admission', async () => {
		const result = await runMemoryTrial({
			arm: 'compaction',
			responses: [],
			goals: buildMemorySummaryGoals(STUDY_MEMORY_SUMMARY_FOLDS.below, 400),
			settings: { gauge: { scale: 2, overhead: 7 }, observe: true },
			room: STUDY_MEMORY_SUMMARY_ROOM,
		})
		expect(result.failure).toContain('Summary request')
		expect(result.requests.filter((request) => request.path === '/api/chat')).toEqual([])
		expect(
			readMemoryEvents(result.evidence, 'context').find((value) => value.role === 'summary'),
		).toMatchObject({ stage: 'admission', estimate: 3903, projected: 7813 })
		expect(readMemoryEvents(result.evidence, 'refusal')).toMatchObject([
			{ role: 'summary', consumed: 7813, max: 3904 },
		])
	})

	it('admits a summary request one below the room and stamps its dispatch with the admitted projection', async () => {
		const result = await runMemorySummary(STUDY_MEMORY_SUMMARY_FOLDS.below, 400, [], true)
		expect(result.failure).toBeUndefined()
		expect(result.requests.filter((request) => request.path === '/api/chat')).toHaveLength(2)
		const rows = readMemoryEvents(result.evidence, 'context').filter(
			(value) => value.role === 'summary',
		)
		expect(rows).toHaveLength(1)
		const [row] = rows
		expect(row).toMatchObject({
			stage: 'dispatch',
			estimate: STUDY_MEMORY_SUMMARY_PROJECTIONS.below,
			projected: STUDY_MEMORY_SUMMARY_PROJECTIONS.below,
		})
		expect(readMemoryParts(row?.parts)).toEqual({
			count: 8,
			tools: 0,
			schema: 0,
			total: STUDY_MEMORY_SUMMARY_PROJECTIONS.below,
		})
		expect(readMemoryEvents(result.evidence, 'refusal')).toEqual([])
		for (const event of ['dispatch', 'wire']) {
			const joined = readMemoryEvents(result.evidence, event).filter(
				(value) => value.role === 'summary',
			)
			expect(joined).toHaveLength(1)
			expect(joined[0]).toMatchObject({ canonical: row?.dispatch, revision: row?.revision })
		}
		expect(
			readMemoryEvents(result.evidence, 'wire').find((value) => value.role === 'summary'),
		).toMatchObject({ prompt: 10 })
		expect(result.evidence.some((entry) => entry.event === 'summary')).toBe(true)
	})

	it('accepts a post-call prompt equal to the admitted projection and keeps its wire usage', async () => {
		const prompt = STUDY_MEMORY_SUMMARY_PROJECTIONS.below
		const result = await runMemorySummary(
			STUDY_MEMORY_SUMMARY_FOLDS.below,
			400,
			[{ path: '/api/chat', body: buildMemoryReply({ content: 'Recap', prompt }) }],
			true,
		)
		expect(result.failure).toBeUndefined()
		expect(
			readMemoryEvents(result.evidence, 'wire').find((value) => value.role === 'summary'),
		).toMatchObject({ prompt })
	})

	it('returns a post-call prompt above the admitted projection with its wire usage and retains the miss beside the forecast', async () => {
		const prompt = STUDY_MEMORY_SUMMARY_PROJECTIONS.below + 1
		const result = await runMemorySummary(
			STUDY_MEMORY_SUMMARY_FOLDS.below,
			400,
			[{ path: '/api/chat', body: buildMemoryReply({ content: 'Recap', prompt }) }],
			true,
		)
		// The transport admits this prompt (it equals the room); only the gauge projection is exceeded.
		expect(prompt).toBe(STUDY_MEMORY_SUMMARY_LIMIT)
		expect(result.failure).toBeUndefined()
		expect(result.products).toHaveLength(1)
		// The summary completes and the goal continues into the agent request that carries the recap.
		expect(result.requests.filter((request) => request.path === '/api/chat')).toHaveLength(2)
		expect(
			readMemoryEvents(result.evidence, 'wire').find((value) => value.role === 'summary'),
		).toMatchObject({ prompt })
		expect(result.usage.find((row) => row.role === 'summary')?.tokens).toBe(prompt + 2)
		const forecast = readMemoryEvents(result.evidence, 'context').find(
			(value) => value.role === 'summary',
		)
		expect(forecast).toMatchObject({
			stage: 'dispatch',
			projected: STUDY_MEMORY_SUMMARY_PROJECTIONS.below,
		})
		expect(readMemoryEvents(result.evidence, 'refusal')).toEqual([])
	})

	it.each([
		['unknown counts', { unknown: true }],
		['a zero prompt count', { prompt: 0 }],
	])('terminates on %s after a summary call', async (_name, reply) => {
		const result = await runMemorySummary(
			STUDY_MEMORY_SUMMARY_FOLDS.below,
			400,
			[{ path: '/api/chat', body: buildMemoryReply({ content: 'Recap', ...reply }) }],
			true,
		)
		expect(result.failure).toContain('usable prompt count')
		expect(result.requests.filter((request) => request.path === '/api/chat')).toHaveLength(1)
	})

	it.each([
		['admitted', STUDY_MEMORY_SUMMARY_FOLDS.below],
		['refused', STUDY_MEMORY_SUMMARY_FOLDS.over],
	])(
		'keeps wire bytes, products, usage and outcome identical with observation off and on for a %s summary',
		async (_name, folded) => {
			const off = await runMemorySummary(folded, 400, [], false)
			const on = await runMemorySummary(folded, 400, [], true)
			expect(readMemoryAdmission(on)).toEqual(readMemoryAdmission(off))
			expect(off.evidence.some((row) => STUDY_MEMORY_OBSERVED_EVENTS.includes(row.event))).toBe(
				false,
			)
			expect(on.evidence.some((row) => row.event === 'context')).toBe(true)
		},
	)

	it.each([
		['an over-room summary request', STUDY_MEMORY_SUMMARY_FOLDS.over, {}, 'CAPACITY', 'capacity'],
		['an equal-room summary request', STUDY_MEMORY_SUMMARY_FOLDS.equal, {}, 'CAPACITY', 'capacity'],
		[
			'a prompt one over the summary room',
			STUDY_MEMORY_SUMMARY_FOLDS.below,
			{ prompt: STUDY_MEMORY_SUMMARY_LIMIT + 1 },
			'CAPACITY',
			'capacity',
		],
		[
			'a summary that exhausts its recap allowance',
			STUDY_MEMORY_SUMMARY_FOLDS.below,
			{ completion: STUDY_MEMORY_SUMMARY_ROOM.recap },
			'CAPACITY',
			'capacity',
		],
		[
			'unknown counts',
			STUDY_MEMORY_SUMMARY_FOLDS.below,
			{ unknown: true },
			'FAULT',
			'infrastructure',
		],
		[
			'a zero prompt count',
			STUDY_MEMORY_SUMMARY_FOLDS.below,
			{ prompt: 0 },
			'FAULT',
			'infrastructure',
		],
	])(
		'retains the summary role in the study failure of %s',
		async (_name, folded, reply, code, cause) => {
			const server = await createMemoryServer([
				{ path: '/api/chat', body: buildMemoryReply({ content: 'Recap', ...reply }) },
			])
			const profile = buildMemoryProfile({
				url: server.url,
				room: STUDY_MEMORY_SUMMARY_ROOM,
				settings: STUDY_MEMORY_SETTINGS,
			})
			const fixture = createMemoryContext(profile)
			const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
				{ id: 'role', scenario: 'public', arm: 'compaction', repetition: 0 },
				fixture.context.signal,
			)
			try {
				const goal = buildMemorySummaryGoals(folded, 400)[0]
				if (goal === undefined) throw new Error('Missing summary goal')
				await expect(session.execute(goal, fixture.context)).rejects.toBeDefined()
				// The first failure is latched, so the next goal rethrows the very error the summary raised.
				const latched = await session
					.execute(
						{ id: 'next', input: { prompt: 'Continue', arrivals: [], records: [] } },
						fixture.context,
					)
					.then(
						() => undefined,
						(error: unknown) => error,
					)
				expect(isStudyError(latched)).toBe(true)
				expect(latched).toMatchObject({ code })
				expect(readStudyFailure(latched)).toMatchObject({ cause, role: 'summary' })
			} finally {
				await session.close()
				fixture.close()
				await server.close()
			}
		},
	)

	it.each([
		['an empty', ''],
		['a whitespace-only', ' \n\t '],
	])(
		'rejects %s completed summary after retaining its exact output and usage, before any later dispatch',
		async (_name, content) => {
			const server = await createMemoryServer([
				{ path: '/api/chat', body: buildMemoryReply({ content }) },
			])
			const profile = buildMemoryProfile({
				url: server.url,
				room: STUDY_MEMORY_SUMMARY_ROOM,
				settings: { ...STUDY_MEMORY_SETTINGS, observe: true },
			})
			const fixture = createMemoryContext(profile)
			const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
				{ id: 'blank', scenario: 'public', arm: 'compaction', repetition: 0 },
				fixture.context.signal,
			)
			try {
				const goal = buildMemorySummaryGoals(STUDY_MEMORY_SUMMARY_FOLDS.below, 400)[0]
				if (goal === undefined) throw new Error('Missing summary goal')
				const failure = await session.execute(goal, fixture.context).then(
					() => undefined,
					(error: unknown) => error,
				)
				expect(isStudyError(failure)).toBe(true)
				expect(failure).toMatchObject({
					code: 'FAULT',
					message: 'Summary returned no usable content',
				})
				expect(readStudyFailure(failure)).toMatchObject({ cause: 'content', role: 'summary' })
				// The rejected output is retained byte for byte, ahead of the refusal.
				const summaries = readMemoryEvents(fixture.evidence, 'summary')
				expect(summaries).toHaveLength(1)
				expect(summaries[0]?.content).toBe(content)
				// Only the summary reached the model: no agent request or tool dispatch followed.
				expect(server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(1)
				expect(readMemoryEvents(fixture.evidence, 'lookup')).toEqual([])
				// The actual summary usage stays accounted and no agent usage exists.
				const summaryTokens = fixture.context.meter.usage
					.filter((row) => row.role === 'summary')
					.map((row) => row.tokens)
				// Unknown summary usage must refuse the fixture, never count as zero.
				expect(summaryTokens.length).toBeGreaterThan(0)
				expect(summaryTokens.every((tokens) => tokens !== undefined)).toBe(true)
				expect(summaryTokens.reduce<number>((sum, tokens) => sum + (tokens ?? 0), 0)).toBe(12)
				expect(fixture.context.meter.usage.some((row) => row.role === 'agent')).toBe(false)
				// The failure is latched, so the next goal rethrows it instead of dispatching.
				const latched = await session
					.execute(
						{ id: 'next', input: { prompt: 'Continue', arrivals: [], records: [] } },
						fixture.context,
					)
					.then(
						() => undefined,
						(error: unknown) => error,
					)
				expect(readStudyFailure(latched)).toMatchObject({ cause: 'content', role: 'summary' })
				expect(server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(1)
			} finally {
				await session.close()
				fixture.close()
				await server.close()
			}
		},
	)

	it.each(['x', ' x\n'])(
		'returns the nonblank summary %j unchanged into the next agent request',
		async (content) => {
			const result = await runMemorySummary(
				STUDY_MEMORY_SUMMARY_FOLDS.below,
				400,
				[{ path: '/api/chat', body: buildMemoryReply({ content }) }],
				true,
			)
			expect(result.failure).toBeUndefined()
			const chats = result.requests.filter((request) => request.path === '/api/chat')
			expect(chats).toHaveLength(2)
			expect(chats[1]?.body).toContain(JSON.stringify(`[Summary of earlier messages] ${content}`))
			expect(readMemoryEvents(result.evidence, 'summary')[0]?.content).toBe(content)
			expect(readMemoryEvents(result.evidence, 'refusal')).toEqual([])
		},
	)

	it('refuses a summary request with observation off exactly as with it on', async () => {
		const off = await runMemorySummary(STUDY_MEMORY_SUMMARY_FOLDS.over, 400, [], false)
		expect(off.failure).toContain('Summary request')
		expect(off.requests.filter((request) => request.path === '/api/chat')).toEqual([])
	})

	it('links an Agent window refusal to its own admission after an admitted summary', async () => {
		const result = await runMemorySummary(STUDY_MEMORY_SUMMARY_FOLDS.small, 8000, [], true)
		expect(result.failure).toBeDefined()
		// Only the admitted summary reached the model; the post-fold agent request was refused by the window.
		expect(result.requests.filter((request) => request.path === '/api/chat')).toHaveLength(1)
		const contexts = readMemoryEvents(result.evidence, 'context')
		const summary = contexts.find((value) => value.role === 'summary')
		expect(summary).toMatchObject({
			stage: 'dispatch',
			projected: STUDY_MEMORY_SUMMARY_PROJECTIONS.small,
		})
		const last = contexts
			.filter((value) => value.role === 'agent' && value.stage === 'admission')
			.at(-1)
		expect(Number(last?.ordinal)).toBeGreaterThan(Number(summary?.ordinal))
		const refusals = readMemoryEvents(result.evidence, 'refusal')
		expect(refusals).toHaveLength(1)
		expect(refusals[0]).toMatchObject({
			cause: 'capacity',
			role: 'agent',
			ordinal: last?.ordinal,
			revision: last?.revision,
			max: 1920,
		})
		expect(refusals[0]?.ordinal).not.toBe(summary?.ordinal)
	})
})

describe('passive observation of actual memory requests', () => {
	const goals = STUDY_MEMORY_OBSERVATION_GOALS
	const base: MemoryTrialFixture = {
		arm: 'full',
		responses: buildMemoryObservationResponses(STUDY_MEMORY_TIMING),
		goals,
	}

	it('keeps requests, products and admission identical with observation off and on, and fails on a changed byte', async () => {
		const off = await runMemoryTrial(base)
		const control = await runMemoryTrial(base)
		const on = await runMemoryTrial({ ...base, settings: STUDY_MEMORY_OBSERVED_SETTINGS })
		const changed = await runMemoryTrial({
			...base,
			goals: buildMemoryObservationGoals('Look up order-2'),
			settings: STUDY_MEMORY_OBSERVED_SETTINGS,
		})
		expect(off.failure).toBeUndefined()
		expect(off.products.map((product) => product.value)).toEqual([
			{ content: 'Initial handoff' },
			{ content: 'Corrected handoff' },
			{ content: 'Closed handoff' },
		])
		expect(off.requests.filter((request) => request.path === '/api/chat')).toHaveLength(4)
		expect(off.usage.filter((row) => row.role === 'tool')).toHaveLength(1)
		expect(readMemoryAdmission(control)).toEqual(readMemoryAdmission(off))
		expect(readMemoryAdmission(on)).toEqual(readMemoryAdmission(off))
		expect(
			on.evidence
				.filter((row) => !STUDY_MEMORY_OBSERVED_EVENTS.includes(row.event))
				.map((row) => [row.event, row.goal]),
		).toEqual(off.evidence.map((row) => [row.event, row.goal]))
		expect(off.evidence.some((row) => STUDY_MEMORY_OBSERVED_EVENTS.includes(row.event))).toBe(false)
		expect(readMemoryAdmission(changed)).not.toEqual(readMemoryAdmission(off))
		expect(changed.requests.map((request) => request.body)).not.toEqual(
			off.requests.map((request) => request.body),
		)
	})

	it('keeps the failure outcome and admission identical when a malformed terminal fails the request', async () => {
		const failing: MemoryTrialFixture = {
			arm: 'full',
			responses: [
				{
					path: '/api/chat',
					body: buildMemoryReply({ completion: -1, timing: STUDY_MEMORY_TIMING }),
				},
			],
			goals: [{ id: 'opening', input: { prompt: 'Respond', arrivals: [], records: [] } }],
		}
		const off = await runMemoryTrial(failing)
		const on = await runMemoryTrial({ ...failing, settings: STUDY_MEMORY_PASSIVE_SETTINGS })
		expect(off.failure).toBeDefined()
		expect(readMemoryAdmission(on)).toEqual(readMemoryAdmission(off))
		const [disabled] = readMemoryEvents(off.evidence, 'wire-failure')
		const [observed] = readMemoryEvents(on.evidence, 'wire-failure')
		expect(Object.keys(disabled ?? {}).sort()).toEqual(STUDY_MEMORY_EVENT_KEYS['wire-failure'])
		expect(Object.keys(observed ?? {}).sort()).toEqual(
			listMemoryKeys(
				STUDY_MEMORY_EVENT_KEYS['wire-failure'],
				STUDY_MEMORY_OBSERVED_KEYS['wire-failure'],
			),
		)
	})

	it.each(STUDY_MEMORY_DISABLED_SETTINGS)(
		'leaves existing events unchanged for $name settings',
		async ({ settings }) => {
			const result = await runMemoryTrial({
				...base,
				...(settings === undefined ? {} : { settings }),
			})
			const events: ReadonlyArray<'dispatch' | 'wire'> = ['dispatch', 'wire']
			for (const event of events) {
				const keys = readMemoryEvents(result.evidence, event).map((value) =>
					Object.keys(value).sort(),
				)
				expect(keys.length).toBeGreaterThan(0)
				expect(keys).toEqual(keys.map(() => STUDY_MEMORY_EVENT_KEYS[event]))
			}
			expect(
				readMemoryEvents(result.evidence, 'result').map((value) => Object.keys(value).sort()),
			).toEqual(goals.map(() => ['content', 'conversation', 'partial']))
		},
	)

	it.each(STUDY_MEMORY_MALFORMED_SETTINGS)(
		'refuses $name settings with a CONFIG error through the driver and the session',
		async ({ settings }) => {
			await expect(runMemoryTrial({ ...base, settings })).rejects.toThrow(
				expect.objectContaining({ code: 'CONFIG', message: expect.stringContaining('settings') }),
			)
			const { agent: admitted, provider: ollama } = STUDY_MEMORY_MODULES
			if (!isStudyMemoryRuntime(admitted) || !isStudyMemoryProvider(ollama))
				throw new Error('Missing admitted modules')
			expect(
				() =>
					new StudyMemorySession({
						agent: admitted,
						ledger: undefined,
						provider: ollama,
						classifier: undefined,
						profile: buildMemoryProfile({ url: 'http://127.0.0.1:1', settings }),
						arm: 'full',
						signal: new AbortController().signal,
					}),
			).toThrow(
				expect.objectContaining({ code: 'CONFIG', message: expect.stringContaining('settings') }),
			)
		},
	)

	it('adds only the declared keys to existing events and keeps bodies and the snapshot to selected goals', async () => {
		const result = await runMemoryTrial({ ...base, settings: STUDY_MEMORY_OBSERVED_SETTINGS })
		const rows = result.evidence.filter((row) => row.event === 'dispatch' || row.event === 'wire')
		const selected = new Set(STUDY_MEMORY_OBSERVED_SETTINGS.checkpoints)
		const carried = new Set<string>()
		const expected = rows.map((row) => {
			const extra: string[] = []
			if (row.event === 'dispatch' && selected.has(row.goal)) {
				extra.push('body')
				if (!carried.has(row.goal)) {
					carried.add(row.goal)
					extra.push('snapshot')
				}
			}
			return row.event === 'dispatch'
				? listMemoryKeys(
						STUDY_MEMORY_EVENT_KEYS.dispatch,
						STUDY_MEMORY_OBSERVED_KEYS.dispatch,
						extra,
					)
				: listMemoryKeys(STUDY_MEMORY_EVENT_KEYS.wire, STUDY_MEMORY_OBSERVED_KEYS.wire, extra)
		})
		expect(rows.map((row) => (isRecord(row.value) ? Object.keys(row.value).sort() : []))).toEqual(
			expected,
		)
		expect([...carried]).toEqual(['opening', 'closure'])
		expect(rows.some((row) => row.event === 'dispatch' && row.goal === 'correction')).toBe(true)
	})

	it('correlates trial-local ids, pinned digests and a monotonic timeline across dispatch and wire rows', async () => {
		const result = await runMemoryTrial({ ...base, settings: STUDY_MEMORY_PASSIVE_SETTINGS })
		const dispatches = readMemoryEvents(result.evidence, 'dispatch')
		const wires = readMemoryEvents(result.evidence, 'wire')
		expect(dispatches).toHaveLength(result.requests.length)
		expect(dispatches.map((value) => value.id)).toEqual(
			Array.from({ length: dispatches.length }, (_, index) => index + 1),
		)
		expect(wires.map((value) => value.id)).toEqual(dispatches.map((value) => value.id))
		expect(wires.map((value) => [value.role, value.path, value.model])).toEqual(
			dispatches.map((value) => [value.role, value.path, value.model]),
		)
		expect(dispatches.map((value) => value.path)).toEqual(
			result.requests.map((entry) => entry.path),
		)
		expect(dispatches.map((value) => value.digest)).toEqual(
			result.requests.map((entry) => {
				if (entry.path === '/api/tags') return null
				if (entry.path === '/api/chat') return 'a'.repeat(64)
				const body = parseJSON(entry.body)
				return isRecord(body) && body.model === 'judge' ? 'b'.repeat(64) : 'a'.repeat(64)
			}),
		)
		const timeline = readMemoryTimeline(wires)
		expect(timeline.every((row) => row.sent >= row.started && row.elapsed >= 0)).toBe(true)
		expect(
			timeline.slice(1).every((row, index) => {
				const prior = timeline[index]
				return prior !== undefined && row.sent >= prior.sent + prior.elapsed - 1e-6
			}),
		).toBe(true)
	})

	it('records the previous model across metadata and a model switch, first request included', async () => {
		const result = await runMemoryTrial({
			arm: 'records',
			responses: [],
			goals: [
				{
					id: 'opening',
					input: {
						prompt: 'State the current order count',
						arrivals: [{ id: 'source', content: 'The order count is two.' }],
						records: [],
					},
				},
			],
			settings: STUDY_MEMORY_PASSIVE_SETTINGS,
		})
		expect(result.failure).toBeUndefined()
		const models = readMemoryModels(result.requests)
		expect(new Set(models)).toEqual(new Set(['model', 'judge']))
		const dispatches = readMemoryEvents(result.evidence, 'dispatch')
		expect(
			dispatches.filter((value) => value.role !== 'metadata').map((value) => value.model),
		).toEqual(models)
		const expected: unknown[] = []
		let previous: string | null = null
		let cursor = 0
		for (const value of dispatches) {
			const model = value.role === 'metadata' ? undefined : models[cursor]
			expected.push([previous, model !== undefined && previous !== null && previous !== model])
			if (model !== undefined) {
				previous = model
				cursor += 1
			}
		}
		expect(dispatches.map((value) => [value.previous, value.changed])).toEqual(expected)
		const generated = dispatches.filter((value) => value.role !== 'metadata')
		expect(generated[0]).toMatchObject({ previous: null, changed: false })
		expect(generated.some((value) => value.changed === true)).toBe(true)
		expect(
			dispatches
				.filter((value) => value.role === 'metadata')
				.every((value) => value.changed === false),
		).toBe(true)
		expect(dispatches[0]?.previous).toBeNull()
	})

	it('retains exact request bodies only for selected goals, in request order', async () => {
		const result = await runMemoryTrial({ ...base, settings: STUDY_MEMORY_OBSERVED_SETTINGS })
		const rows = result.evidence.filter((row) => row.event === 'dispatch')
		expect(rows).toHaveLength(result.requests.length)
		const selected = new Set(STUDY_MEMORY_OBSERVED_SETTINGS.checkpoints)
		const captured = rows.map((row) =>
			isRecord(row.value) && 'body' in row.value ? row.value.body : undefined,
		)
		expect(captured).toEqual(
			rows.map((row, index) => {
				const request = result.requests[index]
				if (!selected.has(row.goal)) return undefined
				return request?.path === '/api/tags' ? null : request?.body
			}),
		)
		const chats = result.requests.filter((request) => request.path === '/api/chat')
		const opening = rows
			.filter(
				(row) => row.goal === 'opening' && isRecord(row.value) && row.value.path === '/api/chat',
			)
			.map((row) => (isRecord(row.value) ? row.value.body : undefined))
		expect(opening).toEqual(chats.slice(0, 2).map((request) => request.body))
		expect(captured.some((body) => body === undefined)).toBe(true)
		expect(captured.some((body) => typeof body === 'string')).toBe(true)
	})

	it('attaches an owned pre-arrival snapshot once to the first dispatch of a selected goal', async () => {
		const result = await runMemoryTrial({
			...base,
			settings: { observe: true, checkpoints: ['correction'] },
		})
		const carriers = result.evidence.filter((row) => isRecord(row.value) && 'snapshot' in row.value)
		expect(carriers).toHaveLength(1)
		const first = result.evidence.find((row) => row.goal === 'correction')
		expect(first).toBe(carriers[0])
		expect(first?.event).toBe('dispatch')
		const snapshot = readMemorySnapshot(result.evidence, 'correction')
		expect(snapshot.arrivals).toEqual(['source-1'])
		expect(snapshot.records).toEqual([
			{ id: 'order-1', name: 'Owner', content: 'Confirmed reference' },
		])
		expect(snapshot.gauge).toBeNull()
		expect(snapshot.input).toEqual(goals[1]?.input)
		expect(snapshot.input).not.toBe(goals[1]?.input)
		const view = JSON.stringify(snapshot.conversation)
		expect(view).toContain('Count was three.')
		expect(view).toContain('Confirmed reference')
		expect(view).toContain('Initial handoff')
		expect(view).not.toContain('Correction: count is two.')
		expect(result.requests.filter((request) => request.path === '/api/chat').at(2)?.body).toContain(
			'Correction: count is two.',
		)
		// The snapshot retains the goal's own input by design; its pre-arrival state must not hold it.
		expect(JSON.stringify(snapshot.input)).toContain('Correction: count is two.')
		expect(JSON.stringify(snapshot.records)).not.toContain('Correction: count is two.')
		expect(JSON.stringify(snapshot.arrivals)).not.toContain('source-2')
		expect(parseJSON(JSON.stringify(snapshot))).toEqual(snapshot)
		const later = await runMemoryTrial({
			...base,
			settings: { observe: true, checkpoints: ['correction', 'closure'] },
		})
		expect(
			JSON.stringify(readMemorySnapshot(later.evidence, 'correction').conversation),
		).not.toContain('Correction: count is two.')
		const closing = readMemorySnapshot(later.evidence, 'closure')
		expect(JSON.stringify(closing.conversation)).toContain('Correction: count is two.')
		expect(closing.arrivals).toEqual(['source-1', 'source-2'])
	})

	it('retains the snapshot of a selected goal whose model later fails', async () => {
		const result = await runMemoryTrial({
			arm: 'full',
			responses: [{ path: '/api/chat', body: buildMemoryReply({ reason: 'length' }) }],
			goals,
			settings: { observe: true, checkpoints: ['opening'] },
		})
		expect(result.failure).toBeDefined()
		expect(readMemorySnapshot(result.evidence, 'opening').input).toEqual(goals[0]?.input)
		expect(
			result.evidence.filter((row) => isRecord(row.value) && 'snapshot' in row.value),
		).toHaveLength(1)
	})

	it.each(STUDY_MEMORY_TIMING_CASES)(
		'retains $name terminal timing for every response without changing the product',
		async ({ timing, expected }) => {
			const responses = buildMemoryObservationResponses(timing)
			const off = await runMemoryTrial({ ...base, responses })
			const on = await runMemoryTrial({
				...base,
				responses,
				settings: STUDY_MEMORY_PASSIVE_SETTINGS,
			})
			expect(readMemoryAdmission(on)).toEqual(readMemoryAdmission(off))
			const wires = readMemoryEvents(on.evidence, 'wire')
			const chats = wires.filter((value) => value.role === 'agent')
			expect(chats).toHaveLength(4)
			expect(chats.map((value) => value.timing)).toEqual(chats.map(() => expected))
			const metadata = wires.filter((value) => value.role === 'metadata')
			expect(metadata.length).toBeGreaterThan(0)
			expect(metadata.map((value) => value.timing)).toEqual(metadata.map(() => null))
		},
	)

	it('keeps unknown counts null instead of inventing zero', async () => {
		const result = await runMemoryTrial({
			arm: 'full',
			responses: [{ path: '/api/chat', body: buildMemoryReply({ unknown: true }) }],
			goals: [{ id: 'opening', input: { prompt: 'Respond', arrivals: [], records: [] } }],
			settings: STUDY_MEMORY_PASSIVE_SETTINGS,
		})
		expect(result.failure).toBeUndefined()
		expect(
			readMemoryEvents(result.evidence, 'wire').find((value) => value.role === 'agent')?.timing,
		).toEqual({
			durations: { total: null, load: null, prompt: null, decode: null },
			counts: { prompt: null, decode: null, cached: null },
			invalid: [],
		})
	})

	it('reports cancellation and a refused response truthfully without terminal timing', async () => {
		const hung = await runMemoryTrial({
			arm: 'full',
			responses: [
				{
					path: '/api/chat',
					body: `${JSON.stringify({ model: 'model', done: false, message: { content: 'partial' } })}\n`,
					open: true,
				},
			],
			goals,
			settings: STUDY_MEMORY_PASSIVE_SETTINGS,
			duration: 100,
		})
		expect(hung.failure).toBeDefined()
		const [cancelled] = readMemoryEvents(hung.evidence, 'wire-failure')
		expect(Object.keys(cancelled ?? {}).sort()).toEqual(
			listMemoryKeys(
				STUDY_MEMORY_EVENT_KEYS['wire-failure'],
				STUDY_MEMORY_OBSERVED_KEYS['wire-failure'],
			),
		)
		expect(cancelled?.elapsed).toBeGreaterThan(0)
		const hungDispatch = readMemoryEvents(hung.evidence, 'dispatch').find(
			(value) => value.role === 'agent',
		)
		expect(cancelled?.id).toBe(hungDispatch?.id)
		expect(readMemoryEvents(hung.evidence, 'wire').map((value) => value.id)).not.toContain(
			cancelled?.id,
		)
		const refused = await runMemoryTrial({
			arm: 'full',
			responses: [{ path: '/api/chat', body: 'Unavailable', status: 503 }],
			goals,
			settings: STUDY_MEMORY_PASSIVE_SETTINGS,
		})
		expect(refused.failure).toBeDefined()
		const sent = readMemoryEvents(refused.evidence, 'dispatch').find(
			(value) => value.role === 'agent',
		)
		expect(sent?.id).toBeDefined()
		expect(readMemoryEvents(refused.evidence, 'wire').map((value) => value.id)).not.toContain(
			sent?.id,
		)
		// A refused response is accounted once as a failure that keeps its status, never as a successful wire row.
		const [refusal] = readMemoryEvents(refused.evidence, 'wire-failure')
		expect(readMemoryEvents(refused.evidence, 'wire-failure')).toHaveLength(1)
		expect(refusal).toMatchObject({ role: 'agent', status: 503, id: sent?.id })
		expect(Object.keys(refusal ?? {}).sort()).toEqual(
			listMemoryKeys(
				STUDY_MEMORY_EVENT_KEYS['wire-failure'],
				STUDY_MEMORY_OBSERVED_KEYS['wire-failure'],
			),
		)
	})

	it('attaches logical classifier readings and the calibrated gauge without leaking into requests or products', async () => {
		const trial: MemoryTrialFixture = {
			arm: 'records',
			responses: [],
			goals: [
				{
					id: 'opening',
					input: {
						prompt: 'State the current order count',
						arrivals: [{ id: 'source', content: 'The order count is two.' }],
						records: [],
					},
				},
				{
					id: 'closure',
					input: { prompt: 'Repeat the order count', arrivals: [], records: [] },
				},
			],
		}
		const off = await runMemoryTrial(trial)
		const on = await runMemoryTrial({ ...trial, settings: STUDY_MEMORY_OBSERVED_SETTINGS })
		expect(off.failure).toBeUndefined()
		expect(on.failure).toBeUndefined()
		expect(on.products).toEqual(off.products)
		expect(on.requests.map((request) => request.path)).toEqual(
			off.requests.map((request) => request.path),
		)
		expect(totalMemoryUsage(on.usage)).toEqual(totalMemoryUsage(off.usage))
		expect(readMemoryEvents(off.evidence, 'result').map((value) => 'readings' in value)).toEqual([
			false,
			false,
		])
		const readings = readMemoryEvents(on.evidence, 'result').map((value) => value.readings)
		expect(readings.every((entry) => Array.isArray(entry))).toBe(true)
		const entries = readings.flatMap((entry) => (Array.isArray(entry) ? entry : []))
		expect(entries.length).toBeGreaterThan(0)
		expect(
			entries.every(
				(entry) =>
					isRecord(entry) &&
					typeof entry.key === 'string' &&
					typeof entry.phase === 'string' &&
					typeof entry.outcome === 'string' &&
					(entry.duration === null || typeof entry.duration === 'number'),
			),
		).toBe(true)
		expect(
			on.products.map((product) => (isRecord(product.value) ? Object.keys(product.value) : [])),
		).toEqual(on.products.map(() => ['content']))
		const shapes = readMemoryShapes(on.requests)
		expect(shapes).toEqual(readMemoryShapes(off.requests))
		expect(shapes.map((shape) => shape.options)).toEqual(
			shapes.map(() => ['num_ctx', 'num_predict', 'seed', 'temperature']),
		)
		const judges = readMemoryEvents(on.evidence, 'wire').filter((value) => value.role === 'judge')
		expect(judges.length).toBeGreaterThan(0)
		expect(judges.map((value) => value.timing)).toEqual(
			judges.map(() => ({
				durations: { total: null, load: null, prompt: null, decode: null },
				counts: { prompt: 10, decode: 1, cached: null },
				invalid: [],
			})),
		)
		expect(readMemorySnapshot(on.evidence, 'opening').gauge).toBeNull()
		expect(readMemorySnapshot(on.evidence, 'closure').gauge).toEqual({
			scale: expect.any(Number),
			overhead: expect.any(Number),
		})
	})

	it('retains one ordered estimate row per agent dispatch and a projection only for Compaction', async () => {
		const full = await runMemoryTrial({ ...base, settings: STUDY_MEMORY_PASSIVE_SETTINGS })
		const compaction = await runMemoryTrial({
			...base,
			arm: 'compaction',
			settings: { ...STUDY_MEMORY_FIXED_SETTINGS, observe: true },
		})
		const silent = await runMemoryTrial({
			...base,
			arm: 'compaction',
			settings: STUDY_MEMORY_FIXED_SETTINGS,
		})
		expect(silent.evidence.some((row) => row.event === 'estimate')).toBe(false)
		for (const result of [full, compaction]) {
			expect(result.failure).toBeUndefined()
			const rows = readMemoryEvents(result.evidence, 'estimate')
			const dispatched = readMemoryEvents(result.evidence, 'dispatch').filter(
				(value) => value.role === 'agent',
			)
			expect(rows).toHaveLength(dispatched.length)
			expect(rows).toHaveLength(4)
			for (const goal of goals)
				expect(readMemoryEvents(result.evidence, 'estimate', goal.id)).toHaveLength(
					readMemoryEvents(result.evidence, 'dispatch', goal.id).filter(
						(value) => value.role === 'agent',
					).length,
				)
			expect(rows.map((row) => Object.keys(row).sort())).toEqual(
				rows.map(() => STUDY_MEMORY_ESTIMATE_KEYS),
			)
			const estimates = rows.map((row) => row.estimate)
			expect(estimates.every((value) => typeof value === 'number' && value > 0)).toBe(true)
			// Each request appends the previous reply and any tool receipt, so the complete request only grows.
			expect(estimates).toEqual(estimates.toSorted((a, b) => Number(a) - Number(b)))
			expect(new Set(estimates).size).toBe(estimates.length)
		}
		expect(readMemoryEvents(full.evidence, 'estimate').map((row) => row.projected)).toEqual([
			null,
			null,
			null,
			null,
		])
		expect(readMemoryEvents(compaction.evidence, 'estimate').map((row) => row.projected)).toEqual([
			STUDY_MEMORY_FIXED_PROJECTION,
			STUDY_MEMORY_FIXED_PROJECTION,
			STUDY_MEMORY_FIXED_PROJECTION,
			STUDY_MEMORY_FIXED_PROJECTION,
		])
		expect(readMemoryEvents(compaction.evidence, 'estimate').map((row) => row.estimate)).toEqual(
			readMemoryEvents(full.evidence, 'estimate').map((row) => row.estimate),
		)
	})

	it('retains one dispatch context row per agent request, joined to its estimate, dispatch and wire rows by ordinal, canonical id and revision', async () => {
		const result = await runMemoryTrial({ ...base, settings: STUDY_MEMORY_PASSIVE_SETTINGS })
		expect(result.failure).toBeUndefined()
		const contexts = readMemoryEvents(result.evidence, 'context')
		const estimates = readMemoryEvents(result.evidence, 'estimate')
		const dispatches = readMemoryEvents(result.evidence, 'dispatch')
		const agents = dispatches.filter((value) => value.role === 'agent')
		const wires = readMemoryEvents(result.evidence, 'wire').filter(
			(value) => value.role === 'agent',
		)
		expect(contexts.map((value) => [value.stage, value.role])).toEqual(
			Array.from({ length: 4 }, () => ['dispatch', 'agent']),
		)
		expect(contexts.map((value) => value.ordinal)).toEqual([1, 2, 3, 4])
		expect(contexts.map((value) => Object.keys(value).sort())).toEqual(
			contexts.map(() => listMemoryKeys(STUDY_MEMORY_CONTEXT_KEYS, ['dispatch'])),
		)
		for (const rows of [contexts, estimates])
			expect(rows.map((value) => value.dispatch)).toEqual([1, 2, 3, 4])
		for (const rows of [agents, wires])
			expect(rows.map((value) => value.canonical)).toEqual([1, 2, 3, 4])
		const revisions = contexts.map((value) => value.revision)
		expect(
			revisions.every((value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)),
		).toBe(true)
		expect(new Set(revisions).size).toBe(4)
		for (const rows of [estimates, agents, wires])
			expect(rows.map((value) => value.revision)).toEqual(revisions)
		const metadata = dispatches.filter((value) => value.role === 'metadata')
		expect(metadata.length).toBeGreaterThan(0)
		expect(metadata.map((value) => [value.canonical, value.revision])).toEqual(
			metadata.map(() => [null, null]),
		)
		expect(contexts.map((value) => value.projected)).toEqual([null, null, null, null])
		for (const [index, value] of contexts.entries()) {
			const parts = readMemoryParts(value.parts)
			// The structural components sum to the estimator reading taken for the same request.
			expect(parts.total).toBe(estimates[index]?.estimate)
			expect(parts.total).toBe(value.estimate)
			expect(parts.tools).toBeGreaterThan(0)
			expect(parts.schema).toBe(0)
			expect(readMemoryOrigins(value.origins)).toHaveLength(parts.count)
		}
	})

	it('annotates each message with a nonadditive origin from session joins and leaves the rest unknown', async () => {
		const result = await runMemoryTrial({ ...base, settings: STUDY_MEMORY_PASSIVE_SETTINGS })
		const origins = readMemoryEvents(result.evidence, 'context').map((value) =>
			readMemoryOrigins(value.origins),
		)
		expect(origins).toHaveLength(4)
		expect(origins.flat().some((entry) => entry.origin === 'unknown')).toBe(false)
		expect(origins[0]).toEqual(
			expect.arrayContaining([
				{ origin: 'instructions', source: 'desk' },
				{ origin: 'arrival', source: 'source-1' },
				{ origin: 'input', source: 'opening' },
			]),
		)
		// After the tool turn the call is stored history and its receipt is a tool message.
		expect(origins[1]?.map((entry) => entry.origin)).toEqual(
			expect.arrayContaining(['history', 'tool', 'input']),
		)
		// The first request of the next goal: the old input is history, only the new prompt is input.
		const correction = origins[2] ?? []
		expect(correction.filter((entry) => entry.origin === 'input')).toEqual([
			{ origin: 'input', source: 'correction' },
		])
		expect(
			correction.filter((entry) => entry.origin === 'arrival').map((entry) => entry.source),
		).toEqual(['source-1', 'source-2'])
		expect(correction.some((entry) => entry.origin === 'history')).toBe(true)
		expect(origins.flat().some((entry) => entry.origin === 'mixed')).toBe(false)
	})

	it('marks a composer-built Records system message mixed and never claims instructions or input', async () => {
		const result = await runMemoryTrial({
			arm: 'records',
			responses: [],
			goals: [
				{
					id: 'opening',
					input: {
						prompt: 'State the current order count',
						arrivals: [{ id: 'source', content: 'The order count is two.' }],
						records: [],
					},
				},
			],
			settings: STUDY_MEMORY_PASSIVE_SETTINGS,
		})
		expect(result.failure).toBeUndefined()
		const origins = readMemoryEvents(result.evidence, 'context').flatMap((value) =>
			readMemoryOrigins(value.origins),
		)
		expect(origins.some((entry) => entry.origin === 'mixed')).toBe(true)
		expect(
			origins.some((entry) => entry.origin === 'instructions' || entry.origin === 'input'),
		).toBe(false)
	})

	it('retains the admission measurement and a single refusal row for an oversize request with no agent dispatch', async () => {
		const edge = buildMemoryEdge(buildMemoryProfile({ url: 'http://127.0.0.1:1' }), -1)
		const result = await runMemoryTrial({
			arm: 'compaction',
			responses: [],
			goals: [WINDOW_GOAL],
			settings: { ...edge, observe: true },
		})
		expect(result.failure).toBeDefined()
		expect(result.requests.filter((request) => request.path === '/api/chat')).toEqual([])
		const contexts = readMemoryEvents(result.evidence, 'context')
		expect(contexts.length).toBeGreaterThan(0)
		expect(contexts.map((value) => [value.stage, value.role])).toEqual(
			contexts.map(() => ['admission', 'agent']),
		)
		expect(contexts.map((value) => Object.keys(value).sort())).toEqual(
			contexts.map(() => listMemoryKeys(STUDY_MEMORY_CONTEXT_KEYS)),
		)
		expect(
			readMemoryEvents(result.evidence, 'dispatch').filter((value) => value.role === 'agent'),
		).toEqual([])
		expect(readMemoryEvents(result.evidence, 'estimate')).toEqual([])
		const refusals = readMemoryEvents(result.evidence, 'refusal')
		expect(refusals).toHaveLength(1)
		const [refusal] = refusals
		const last = contexts.at(-1)
		expect(Object.keys(refusal ?? {}).sort()).toEqual(STUDY_MEMORY_REFUSAL_KEYS)
		expect(refusal).toMatchObject({ cause: 'capacity', role: 'agent', max: 32128 })
		expect(refusal?.ordinal).toBe(last?.ordinal)
		expect(refusal?.revision).toBe(last?.revision)
		expect(typeof refusal?.revision).toBe('string')
		// The window refused the very projection the final admission row retained.
		expect(refusal?.consumed).toBe(last?.projected)
		expect(Number(refusal?.consumed)).toBeGreaterThanOrEqual(32128)
		const parts = readMemoryParts(last?.parts)
		expect(parts.total).toBe(last?.estimate)
		expect(parts.tools).toBeGreaterThan(0)
	})

	it('records pre-fold and rebuilt post-fold admissions and the summary dispatch as separate joined measurements', async () => {
		const settings = { ...STUDY_MEMORY_SETTINGS, observe: true }
		const result = await runMemoryTrial({
			arm: 'compaction',
			responses: [],
			goals: buildMemoryFoldGoals(),
			settings,
			room: STUDY_MEMORY_SUMMARY_ROOM,
		})
		expect(result.failure).toBeUndefined()
		const max =
			STUDY_MEMORY_SUMMARY_ROOM.context -
			STUDY_MEMORY_SUMMARY_ROOM.output -
			STUDY_MEMORY_SUMMARY_ROOM.safety
		const contexts = readMemoryEvents(result.evidence, 'context')
		const sequence = contexts.map((value) => `${String(value.stage)}:${String(value.role)}`)
		const summaryAt = sequence.indexOf('dispatch:summary')
		expect(summaryAt).toBeGreaterThan(0)
		expect(sequence[0]).toBe('admission:agent')
		expect(sequence.at(-1)).toBe('dispatch:agent')
		expect(sequence.slice(summaryAt + 1)).toContain('admission:agent')
		// Ordinals are one increasing count over admissions and dispatches of both roles.
		expect(contexts.map((value) => value.ordinal)).toEqual(
			Array.from({ length: contexts.length }, (_, index) => index + 1),
		)
		const admissions = contexts.filter((value) => value.stage === 'admission')
		const first = admissions[0]
		const final = admissions.at(-1)
		expect(Number(first?.projected)).toBeGreaterThan(max)
		expect(Number(final?.projected)).toBeLessThanOrEqual(max)
		expect(first?.revision).not.toBe(final?.revision)
		expect(final?.dispatch).toBeUndefined()
		// Summary and agent dispatches keep their own canonical ids across the interleaving.
		const summary = contexts[summaryAt]
		const dispatched = contexts.filter((value) => value.stage === 'dispatch')
		expect(dispatched.map((value) => value.dispatch)).toEqual(
			Array.from({ length: dispatched.length }, (_, index) => index + 1),
		)
		for (const role of ['summary', 'agent']) {
			const rows = dispatched.filter((value) => value.role === role)
			const sent = readMemoryEvents(result.evidence, 'dispatch').filter(
				(value) => value.role === role,
			)
			const settled = readMemoryEvents(result.evidence, 'wire').filter(
				(value) => value.role === role,
			)
			expect(rows.length).toBeGreaterThan(0)
			for (const events of [sent, settled]) {
				expect([role, events.map((value) => value.canonical)]).toEqual([
					role,
					rows.map((value) => value.dispatch),
				])
				expect([role, events.map((value) => value.revision)]).toEqual([
					role,
					rows.map((value) => value.revision),
				])
			}
		}
		// The summary request is exactly its instruction plus the folded messages: no tools, no schema.
		expect(readMemoryParts(summary?.parts)).toMatchObject({ tools: 0, schema: 0 })
		expect(readMemoryOrigins(summary?.origins)[0]).toEqual({
			origin: 'instructions',
			source: 'summary',
		})
		// An admitted summary is stamped with the very estimate and gauge projection it was admitted on.
		expect(summary?.projected).toBe(summary?.estimate)
		expect(Number(summary?.projected)).toBeLessThan(STUDY_MEMORY_SUMMARY_LIMIT)
		expect(Number(readMemoryParts(summary?.parts).count)).toBeGreaterThan(2)
	})

	it('keeps the fold trajectory identical with observation off and on, and fails on a changed byte', async () => {
		const trial: MemoryTrialFixture = {
			arm: 'compaction',
			responses: [],
			goals: buildMemoryFoldGoals(),
			room: STUDY_MEMORY_SUMMARY_ROOM,
		}
		const off = await runMemoryTrial({ ...trial, settings: STUDY_MEMORY_SETTINGS })
		const on = await runMemoryTrial({
			...trial,
			settings: { ...STUDY_MEMORY_SETTINGS, observe: true },
		})
		const changed = await runMemoryTrial({
			...trial,
			goals: buildMemoryFoldGoals('Maintain this other detail. '),
			settings: { ...STUDY_MEMORY_SETTINGS, observe: true },
		})
		expect(off.failure).toBeUndefined()
		expect(off.requests.some((request) => request.path === '/api/chat')).toBe(true)
		expect(readMemoryAdmission(on)).toEqual(readMemoryAdmission(off))
		expect(readMemoryAdmission(changed)).not.toEqual(readMemoryAdmission(off))
		expect(off.evidence.some((row) => STUDY_MEMORY_OBSERVED_EVENTS.includes(row.event))).toBe(false)
	})

	it('adds only the raw prompt units and bytes to judge dispatch evidence, read from the actual body', async () => {
		const trial: MemoryTrialFixture = {
			arm: 'records',
			responses: [],
			goals: [
				{
					id: 'opening',
					input: {
						prompt: 'State the current order count',
						arrivals: [{ id: 'source', content: 'The order count is two.' }],
						records: [],
					},
				},
			],
		}
		const on = await runMemoryTrial({ ...trial, settings: STUDY_MEMORY_PASSIVE_SETTINGS })
		const off = await runMemoryTrial(trial)
		const prompts = on.requests
			.filter((request) => request.path === '/api/generate')
			.map((request) => {
				const body = parseJSON(request.body)
				if (!isRecord(body) || typeof body.prompt !== 'string')
					throw new Error('Missing raw prompt')
				return body.prompt
			})
		expect(prompts.length).toBeGreaterThan(0)
		const judged = readMemoryEvents(on.evidence, 'dispatch').filter(
			(value) => value.role === 'judge',
		)
		expect(judged.map((value) => value.raw)).toEqual(
			prompts.map((prompt) => ({
				encoding: 'utf-8',
				units: prompt.length,
				bytes: Buffer.byteLength(prompt, 'utf8'),
			})),
		)
		const others = readMemoryEvents(on.evidence, 'dispatch').filter(
			(value) => value.role !== 'judge',
		)
		expect(others.some((value) => 'raw' in value)).toBe(false)
		expect(readMemoryEvents(off.evidence, 'dispatch').some((value) => 'raw' in value)).toBe(false)
		expect(on.requests.map((request) => request.path)).toEqual(
			off.requests.map((request) => request.path),
		)
	})

	it('keeps Compaction requests, products and admission identical with observation off and on, and fails on a changed byte', async () => {
		const gauged: MemoryTrialFixture = { ...base, arm: 'compaction' }
		const off = await runMemoryTrial({ ...gauged, settings: STUDY_MEMORY_FIXED_SETTINGS })
		const on = await runMemoryTrial({
			...gauged,
			settings: { ...STUDY_MEMORY_FIXED_SETTINGS, observe: true },
		})
		const changed = await runMemoryTrial({
			...gauged,
			goals: buildMemoryObservationGoals('Look up order-2'),
			settings: { ...STUDY_MEMORY_FIXED_SETTINGS, observe: true },
		})
		expect(off.failure).toBeUndefined()
		expect(off.products).toHaveLength(3)
		expect(readMemoryAdmission(on)).toEqual(readMemoryAdmission(off))
		expect(readMemoryAdmission(changed)).not.toEqual(readMemoryAdmission(off))
	})

	it('returns a Compaction reply above the projection with its usage and leaves Full and Records unbounded', async () => {
		const goal: ReadonlyArray<MemoryTrialFixture['goals'][number]> = [
			{ id: 'opening', input: { prompt: 'Respond', arrivals: [], records: [] } },
		]
		const over = {
			path: '/api/chat',
			body: buildMemoryReply({ prompt: STUDY_MEMORY_FIXED_PROJECTION + 1 }),
		}
		for (const arm of ['full', 'records'] as const) {
			const result = await runMemoryTrial({
				arm,
				responses: [over],
				goals: goal,
				settings: STUDY_MEMORY_FIXED_SETTINGS,
			})
			expect(result.failure).toBeUndefined()
		}
		const equal = await runMemoryTrial({
			arm: 'compaction',
			responses: [
				{ path: '/api/chat', body: buildMemoryReply({ prompt: STUDY_MEMORY_FIXED_PROJECTION }) },
			],
			goals: goal,
			settings: STUDY_MEMORY_FIXED_SETTINGS,
		})
		expect(equal.failure).toBeUndefined()
		const missed = await runMemoryTrial({
			arm: 'compaction',
			responses: [
				{
					path: '/api/chat',
					body: buildMemoryReply({
						content: '',
						calls: [{ function: { name: 'lookup', arguments: { id: 'order-1' } } }],
						prompt: STUDY_MEMORY_FIXED_PROJECTION + 1,
					}),
				},
				{ path: '/api/chat', body: buildMemoryReply({ content: 'Follow-up received' }) },
			],
			goals: goal,
			settings: { ...STUDY_MEMORY_FIXED_SETTINGS, observe: true },
		})
		// The miss is not a refusal: the tool turn continues into its follow-up request and the goal completes.
		expect(missed.failure).toBeUndefined()
		expect(missed.products).toEqual([{ value: { content: 'Follow-up received' }, partial: false }])
		expect(missed.requests.filter((request) => request.path === '/api/chat')).toHaveLength(2)
		expect(readMemoryEvents(missed.evidence, 'lookup')).toHaveLength(1)
		// The pre-dispatch forecast stays retained beside the actual count that exceeded it.
		expect(readMemoryEvents(missed.evidence, 'estimate').map((value) => value.projected)).toEqual([
			STUDY_MEMORY_FIXED_PROJECTION,
			STUDY_MEMORY_FIXED_PROJECTION,
		])
		expect(
			readMemoryEvents(missed.evidence, 'wire')
				.filter((value) => value.role === 'agent')
				.map((value) => value.prompt),
		).toEqual([STUDY_MEMORY_FIXED_PROJECTION + 1, 10])
		expect(readMemoryEvents(missed.evidence, 'refusal')).toEqual([])
	})

	it.each([
		['unknown counts', { unknown: true }],
		['a zero prompt count', { prompt: 0 }],
	])('refuses %s only for a gauged request', async (_name, reply) => {
		const goal: ReadonlyArray<MemoryTrialFixture['goals'][number]> = [
			{ id: 'opening', input: { prompt: 'Respond', arrivals: [], records: [] } },
		]
		const responses = [{ path: '/api/chat', body: buildMemoryReply(reply) }]
		const ungauged = await runMemoryTrial({ arm: 'full', responses, goals: goal })
		expect(ungauged.failure).toBeUndefined()
		const gauged = await runMemoryTrial({
			arm: 'compaction',
			responses,
			goals: goal,
			settings: STUDY_MEMORY_FIXED_SETTINGS,
		})
		expect(gauged.failure).toContain('usable prompt count')
	})
})
