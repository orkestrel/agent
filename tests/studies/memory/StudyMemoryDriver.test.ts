import { describe, expect, it } from 'vitest'
import { canonicalStringify, isRecord, parseJSON } from '@orkestrel/contract'
import { waitForCondition } from '@orkestrel/test'
import { createScratch, destroyScratch } from '@orkestrel/test/server'
import { collectStudyEvidence, readStudyResult, readStudyExchanges } from '@orkestrel/study/server'
import { join } from 'node:path'
import {
	isStudyMemoryProvider,
	isStudyMemoryAgent,
	StudyMemoryDriver,
	StudyMemorySession,
	isStudyMemoryCheckpoint,
	STUDY_MEMORY_POLICY,
} from '../../../studies/memory/index.js'
import {
	assertMemoryReplay,
	assertMemoryDaemonClosed,
	writeMemoryTriageDaemon,
	buildMemoryObservationResponses,
	createStudyInstallFixture,
	executeStudyInstall,
	writeMemoryTriageInstall,
	writeMemoryTriageHorizon,
	MEMORY_TRIAGE_GOALS,
	MEMORY_TRIAGE_UNAVAILABLE,
	MEMORY_TRIAGE_FAILURES,
	MEMORY_TRIAGE_GOAL,
	MEMORY_TRIAGE_OPEN,
	MEMORY_TRIAGE_PROFILE,
	createMemoryRouteServer,
	buildMemoryProfile,
	createMemoryContext,
	createMemoryIdentity,
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
	it('keeps a real System One answer and stores its judgment under the composite model', async () => {
		const server = await createMemoryRouteServer()
		const profile = buildMemoryProfile({
			url: server.url,
			triage: { model: 'model', digest: 'a'.repeat(64) },
			settings: {
				observe: true,
				checkpoints: [MEMORY_TRIAGE_GOAL.id],
			},
		})
		const fixture = createMemoryContext(profile)
		try {
			const identity = createMemoryIdentity(profile)
			const session = await identity.driver.open(
				{ id: 'records', scenario: 'public', arm: 'records', repetition: 0 },
				fixture.context.signal,
			)
			try {
				await expect(session.execute(MEMORY_TRIAGE_GOAL, fixture.context)).resolves.toMatchObject({
					partial: false,
				})
				const decisions = fixture.evidence.filter((row) => row.event === 'triage')
				expect(decisions).toHaveLength(1)
				expect(decisions[0]?.value).toMatchObject({
					model: 'model',
					questions: [{ outcome: 'kept', winner: 'fact', probability: 0.9 }],
				})
				expect(server.requests.filter((request) => request.path === '/v1/systemone')).toHaveLength(
					1,
				)
				expect(server.responses).toHaveLength(0)
				expect(
					fixture.evidence.filter(
						(row) => row.event === 'dispatch' && isRecord(row.value) && row.value.role === 'triage',
					),
				).toHaveLength(1)
				expect(fixture.context.meter.usage.filter((row) => row.role === 'triage')).toMatchObject([
					{ calls: 1 },
				])
				const category = STUDY_MEMORY_MODULES.agent.LEDGER_QUESTIONS.category.instructions
				if (typeof category !== 'string') throw new Error('Missing category instructions')
				expect(
					server.requests
						.filter((request) => request.path === '/api/generate')
						.some((request) => {
							const body = parseJSON(request.body)
							return (
								isRecord(body) && typeof body.prompt === 'string' && body.prompt.includes(category)
							)
						}),
				).toBe(false)
				const snapshot = readMemoryCheckpoint(fixture.evidence, MEMORY_TRIAGE_GOAL.id)
				if (!isStudyMemoryCheckpoint(snapshot) || snapshot.ledger === undefined)
					throw new Error('Missing ledger checkpoint')
				const judgments = snapshot.ledger.conversation.judgments?.filter(
					(judgment) => judgment.question.form === 'choice',
				)
				expect(judgments).toHaveLength(1)
				const mica = identity.models.calls.find(([label]) => label === 'mica')?.[1]
				const model = identity.models.calls.find(([label]) => label === 'ledger')?.[1]
				if (mica === undefined || model === undefined) throw new Error('Missing judge identity')
				expect(model).toBe(
					canonicalStringify({ policy: STUDY_MEMORY_POLICY, first: 'model', second: mica }),
				)
				expect(judgments?.[0]?.model).toBe(model)
				expect(judgments?.[0]?.answer).toMatchObject({
					form: 'choice',
					probabilities: { fact: 0.9 },
				})
				expect(model).not.toBe(mica)
			} finally {
				await session.close()
			}
		} finally {
			fixture.close()
			await server.close()
		}
	})
	it('rejects execute when its context aborts an open triage inventory request', async () => {
		const server = await createMemoryServer(MEMORY_TRIAGE_OPEN)
		const profile = buildMemoryProfile({
			url: server.url,
			triage: { model: 'model', digest: 'a'.repeat(64) },
		})
		const controller = new AbortController()
		const fixture = createMemoryContext(profile, controller.signal)
		try {
			const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
				{ id: 'records', scenario: 'public', arm: 'records', repetition: 0 },
				new AbortController().signal,
			)
			try {
				const execution = session.execute(MEMORY_TRIAGE_GOAL, fixture.context).then(
					() => undefined,
					(error: unknown) => error,
				)
				await waitForCondition(
					'the open triage inventory request',
					() => server.requests.some((request) => request.path === '/api/tags'),
					{ budget: 5000 },
				)
				controller.abort(new Error('Inventory cancelled by context'))
				expect(await execution).toBeDefined()
				expect(server.requests.map((request) => request.path)).toEqual(['/api/tags'])
			} finally {
				await session.close()
			}
		} finally {
			fixture.close()
			await server.close()
		}
	})
	it('refuses a triage session whose admitted namespace lacks the System One runtime', async () => {
		const profile = buildMemoryProfile({
			url: 'http://127.0.0.1:1',
			triage: { model: 'model', digest: 'a'.repeat(64) },
		})
		const driver = new StudyMemoryDriver({
			...STUDY_MEMORY_MODULES,
			agent: { ...STUDY_MEMORY_MODULES.agent, createSystemOneJudge: undefined },
			profile,
		})
		await expect(
			driver.open(
				{ id: 'records', scenario: 'public', arm: 'records', repetition: 0 },
				new AbortController().signal,
			),
		).rejects.toThrow('Memory triage requires the admitted System One runtime')
	})
	it('fails a real records session on a triage transport fault before a referral or another goal', async () => {
		const result = await runMemoryTrial({
			arm: 'records',
			responses: MEMORY_TRIAGE_FAILURES,
			goals: STUDY_MEMORY_OBSERVATION_GOALS.slice(0, 2),
			triage: { model: 'model', digest: 'a'.repeat(64) },
		})
		expect(result.failure).toBeDefined()
		expect(result.products).toHaveLength(0)
		expect(result.requests.filter((request) => request.path === '/api/tags')).toHaveLength(
			result.evidence.filter(
				(row) => row.event === 'dispatch' && isRecord(row.value) && row.value.path === '/api/tags',
			).length,
		)
		expect(result.requests.some((request) => request.path === '/v1/systemone')).toBe(true)
		expect(result.requests.some((request) => request.path === '/api/generate')).toBe(false)
		const decisions = result.evidence.filter((row) => row.event === 'triage')
		expect(decisions).toMatchObject([{ value: { questions: [{ outcome: 'referred' }] } }])
	})
	it('preserves the real Mica identity when the profile has no triage', async () => {
		const fixture = createMemoryIdentity(buildMemoryProfile({ url: 'http://127.0.0.1:1' }))
		const session = await fixture.driver.open(
			{ id: 'records', scenario: 'public', arm: 'records', repetition: 0 },
			new AbortController().signal,
		)
		try {
			expect(fixture.models.calls.map(([label]) => label)).toEqual(['mica', 'ledger'])
			expect(fixture.models.calls[0]?.[1]).toBe(fixture.models.calls[1]?.[1])
		} finally {
			await session.close()
		}
	})
	// One recording under the owned daemon serves the offline prefix replay, which builds no daemon, and the extension.
	it('records a reused triage session through a scripted owned daemon, replays it offline and extends it', async () => {
		const scratch = createScratch({ prefix: 'study-triage-daemon-' })
		const server = await createMemoryRouteServer(32)
		try {
			expect(Number(new URL(server.url).port)).toBeGreaterThan(40000)
			const fixture = createStudyInstallFixture(scratch, server.url)
			writeMemoryTriageInstall(fixture)
			await writeMemoryTriageDaemon(fixture, server.url)
			const execute = ['execute', 'capacity', '--profile', MEMORY_TRIAGE_PROFILE]
			const recorded = join(scratch.path, 'tmp', 'recorded')
			const executed = await executeStudyInstall(fixture, [...execute, '--out', recorded], 260000)
			if (executed.code !== 0) throw new Error(executed.stderr + executed.stdout)
			expect(executed).toMatchObject({ code: 0 })
			assertMemoryDaemonClosed(scratch)
			const result = await readStudyResult(recorded)
			if (result.status !== 'sealed') throw new Error('Recording did not seal')
			expect(result.manifest.schedule).toHaveLength(1)
			const trial = result.manifest.schedule[0]
			if (trial === undefined) throw new Error('Missing trial')
			const history = await readStudyExchanges(result, trial.id)
			const roles = history.exchanges.map((exchange) => exchange.attempt.role)
			expect(roles).toEqual(expect.arrayContaining(['triage', 'judge', 'metadata', 'agent']))
			expect(
				history.exchanges.filter((exchange) => exchange.attempt.path === '/api/tags'),
			).toHaveLength(2)
			// The owned daemon's manager reads its readiness ahead of the trial, outside the recording; the recording holds every request after it, in order.
			const paths = server.requests.map((request) => request.path)
			const leading = paths.slice(0, paths.length - history.exchanges.length)
			expect(paths.slice(leading.length)).toEqual(
				history.exchanges.map((exchange) => exchange.attempt.path),
			)
			expect(leading.filter((path) => path !== '/api/version' && path !== '/api/tags')).toEqual([])
			expect(
				history.exchanges
					.filter((exchange) => exchange.attempt.role === 'triage')
					.map((exchange) => exchange.attempt.goal),
			).toEqual(['triage', 'followup'])
			expect(history.exchanges.some((exchange) => exchange.attempt.stage === 'maintenance')).toBe(
				true,
			)
			const evidence = (await collectStudyEvidence(result))[trial.id] ?? []
			const checkpoints = evidence.filter((row) => row.event === 'checkpoint')
			expect(checkpoints.map((row) => row.goal)).toEqual(['triage', 'followup'])
			const final = checkpoints.at(-1)?.value
			if (!isStudyMemoryCheckpoint(final)) throw new Error('Missing checkpoint')
			expect(final.arrivals).toEqual(['triage-source', 'delivery'])
			const decisions = evidence
				.filter((row) => row.event === 'triage')
				.map((row) => (isRecord(row.value) ? row.value.questions : undefined))
			expect(decisions).toHaveLength(2)
			const sent = server.requests.length
			const replayed = join(scratch.path, 'tmp', 'replayed')
			const replayedRun = await executeStudyInstall(
				fixture,
				[
					...execute,
					'--replay',
					recorded,
					'--prefix',
					JSON.stringify({ [trial.id]: history.exchanges.length }),
					'--offline',
					'true',
					'--out',
					replayed,
				],
				260000,
			)
			if (replayedRun.code !== 0)
				throw new Error(
					replayedRun.stderr +
						replayedRun.stdout +
						(
							scratch.read(
								join('tmp', 'replayed', 'execution', 'trials', trial.id, 'exchanges.jsonl'),
							) ?? ''
						)
							.split(/\r\n|\n/)
							.filter((line) => line.includes('"phase":"failure"'))
							.join('\n'),
				)
			expect(replayedRun.code).toBe(0)
			expect(server.requests).toHaveLength(sent)
			const replay = await readStudyResult(replayed)
			if (replay.status !== 'sealed') throw new Error('Replay did not seal')
			const replayEvidence = (await collectStudyEvidence(replay))[trial.id] ?? []
			assertMemoryReplay(evidence, replayEvidence)
			writeMemoryTriageHorizon(scratch, 3)
			const extended = join(scratch.path, 'tmp', 'extended')
			const extendedRun = await executeStudyInstall(
				fixture,
				[...execute, '--extend', recorded, '--out', extended],
				260000,
			)
			if (extendedRun.code !== 0) throw new Error(extendedRun.stderr + extendedRun.stdout)
			expect(extendedRun.code).toBe(0)
			assertMemoryDaemonClosed(scratch)
			const continuation = await readStudyResult(extended)
			if (continuation.status !== 'sealed') throw new Error('Continuation did not seal')
			expect(continuation.manifest.scenarios[0]?.goals.map((goal) => goal.id)).toEqual(
				MEMORY_TRIAGE_GOALS.map((goal) => goal.id),
			)
			const extendedHistory = await readStudyExchanges(continuation, trial.id)
			const prefix = history.exchanges.findIndex(
				(exchange) => exchange.attempt.stage === 'postflight',
			)
			expect(prefix).toBeGreaterThan(0)
			expect(
				extendedHistory.exchanges.slice(0, prefix).map((exchange) => exchange.attempt.body),
			).toEqual(history.exchanges.slice(0, prefix).map((exchange) => exchange.attempt.body))
			expect(
				extendedHistory.exchanges
					.filter((exchange) => exchange.attempt.role === 'triage')
					.map((exchange) => exchange.attempt.goal),
			).toEqual(['triage', 'followup', 'extended'])
			expect(
				server.requests.slice(sent).filter((request) => request.path === '/v1/systemone'),
			).toHaveLength(1)
		} finally {
			await server.close()
			await destroyScratch(scratch)
		}
	}, 167000)
	it('refuses an absent triage model or digest mismatch before any goal request', async () => {
		for (const triage of MEMORY_TRIAGE_UNAVAILABLE) {
			const server = await createMemoryServer()
			const profile = buildMemoryProfile({ url: server.url, triage })
			const fixture = createMemoryContext(profile)
			try {
				const driver = new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile })
				const session = await driver.open(
					{ id: 'records', scenario: 'public', arm: 'records', repetition: 0 },
					fixture.context.signal,
				)
				try {
					const goal = STUDY_MEMORY_OBSERVATION_GOALS[0]
					if (goal === undefined) throw new Error('Missing goal')
					await expect(session.execute(goal, fixture.context)).rejects.toMatchObject({
						code: 'FAULT',
					})
					await expect(session.execute(goal, fixture.context)).rejects.toMatchObject({
						code: 'FAULT',
					})
					expect(server.requests.map((request) => request.path)).toEqual(['/api/tags'])
				} finally {
					await session.close()
				}
			} finally {
				fixture.close()
				await server.close()
			}
		}
	})
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
			if (!isStudyMemoryAgent(admitted) || !isStudyMemoryProvider(ollama))
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
