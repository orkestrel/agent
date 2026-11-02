import { describe, expect, it } from 'vitest'
import {
	isStudyMemoryProvider,
	isStudyMemoryRuntime,
	StudyMemoryDriver,
	StudyMemorySession,
} from '../../../studies/memory/index.js'
import {
	buildMemoryObservationResponses,
	buildMemoryProfile,
	createMemoryContext,
	createMemoryServer,
	readMemoryCheckpoint,
	runMemoryTrial,
	STUDY_MEMORY_INERT_EXCHANGES,
	STUDY_MEMORY_INERT_REPLAY,
	STUDY_MEMORY_MALFORMED_SETTINGS,
	STUDY_MEMORY_MODULES,
	STUDY_MEMORY_OBSERVATION_GOALS,
	STUDY_MEMORY_SETTINGS,
	STUDY_MEMORY_TIMING,
} from '../../setupStudy.js'

describe('actual Agent/Ledger/Ollama memory consumer', () => {
	it('refuses a malformed seed', async () => {
		const server = await createMemoryServer()
		const profile = buildMemoryProfile({ url: server.url, settings: STUDY_MEMORY_SETTINGS })
		const fixture = createMemoryContext(profile)
		const driver = new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile })
		const compaction = await runMemoryTrial({
			arm: 'compaction',
			responses: [],
			goals: STUDY_MEMORY_OBSERVATION_GOALS.slice(0, 1),
			settings: { ...STUDY_MEMORY_SETTINGS, observe: true, checkpoints: ['opening'] },
		})
		const row = readMemoryCheckpoint(compaction.evidence, 'opening')
		const records = { id: 'records', scenario: 'public', arm: 'records', repetition: 0 }
		try {
			for (const seed of [
				7,
				null,
				[],
				{},
				{ records: [], arrivals: [] },
				{ ledger: {}, conversation: {}, records: [], arrivals: [] },
				{ conversation: 7, records: [], arrivals: [] },
				{ conversation: {}, arrivals: [] },
				{ conversation: {}, records: [] },
				{ conversation: {}, records: [7], arrivals: [] },
				{ conversation: {}, records: [], arrivals: [7] },
				row,
			])
				await expect(driver.open(records, fixture.context.signal, seed)).rejects.toMatchObject({
					code: 'CONFIG',
				})
			await expect(
				driver.open({ ...records, arm: 'compaction' }, fixture.context.signal, {
					ledger: {},
					records: [],
					arrivals: [],
				}),
			).rejects.toMatchObject({ code: 'CONFIG' })
			expect(server.requests).toEqual([])
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
			createAuthority: agent.createAuthority,
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

	it('forwards the sink and the replay to the session', async () => {
		const server = await createMemoryServer()
		const profile = buildMemoryProfile({ url: server.url })
		const fixture = createMemoryContext(profile)
		const trial = { id: 'forward', scenario: 'public', arm: 'full', repetition: 0 }
		try {
			for (const collaborator of [
				{ exchanges: STUDY_MEMORY_INERT_EXCHANGES },
				{ replay: STUDY_MEMORY_INERT_REPLAY },
			])
				await expect(
					new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile, ...collaborator }).open(
						trial,
						fixture.context.signal,
					),
				).rejects.toThrow(
					expect.objectContaining({
						code: 'CONFIG',
						message: 'Memory exchanges and replay require declared recording',
					}),
				)
			const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
				trial,
				fixture.context.signal,
			)
			await session.close()
			expect(server.requests).toEqual([])
		} finally {
			fixture.close()
			await server.close()
		}
	})

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

	it.each(STUDY_MEMORY_MALFORMED_SETTINGS)(
		'refuses $name settings with a CONFIG error through the driver and the session',
		async ({ settings }) => {
			await expect(
				runMemoryTrial({
					arm: 'full',
					responses: buildMemoryObservationResponses(STUDY_MEMORY_TIMING),
					goals: STUDY_MEMORY_OBSERVATION_GOALS,
					settings,
				}),
			).rejects.toThrow(
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
})
