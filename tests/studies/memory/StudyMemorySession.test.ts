import type { MemoryTrialFixture } from '../../setupStudy.js'
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { isRecord, parseJSON } from '@orkestrel/contract'
import { waitForCondition } from '@orkestrel/test'
import { parseStudyProfile, readStudyFailure, validateStudyInputs } from '@orkestrel/study'
import {
	isStudyMemoryCheckpoint,
	isStudyMemoryProvider,
	isStudyMemoryAgent,
	STUDY_MEMORY_SYSTEM,
	StudyMemoryDriver,
	StudyMemorySession,
} from '../../../studies/memory/index.js'
import {
	buildMemoryCall,
	buildMemoryCapture,
	buildMemoryObservationGoals,
	buildMemoryObservationResponses,
	buildMemoryProfile,
	buildMemoryRecordProfile,
	buildMemoryReply,
	buildMemorySeedLedger,
	buildMemorySeedResponses,
	buildMemoryVerdict,
	countMemoryPairs,
	createMemoryContext,
	createMemoryFixture,
	MemoryScript,
	executeMemoryGoals,
	listMemoryKeys,
	loadMemoryInputs,
	MEMORY_DESK_OPENING,
	MEMORY_DESK_REGISTER,
	readMemoryAdmission,
	readMemoryCheckpoint,
	readMemoryDeskRecord,
	readMemoryEvents,
	readMemoryFirstChat,
	readMemoryGoalRequests,
	readMemoryOrigins,
	readMemoryParts,
	readMemorySealedCheckpoint,
	readMemoryShapes,
	readMemorySnapshot,
	readMemoryTimeline,
	readMemoryToolResults,
	runMemoryTrial,
	totalMemoryUsage,
	STUDY_MEMORY_CALIBRATION,
	STUDY_MEMORY_CONTEXT_KEYS,
	STUDY_MEMORY_DESK_GOALS,
	STUDY_MEMORY_DESK_SETTINGS,
	STUDY_MEMORY_ESTIMATE_KEYS,
	STUDY_MEMORY_EVENT_KEYS,
	STUDY_MEMORY_OBSERVED_EVENTS,
	STUDY_MEMORY_INERT_EXCHANGES,
	STUDY_MEMORY_MODULES,
	STUDY_MEMORY_OBSERVATION_GOALS,
	STUDY_MEMORY_OBSERVED_KEYS,
	STUDY_MEMORY_OBSERVED_SETTINGS,
	STUDY_MEMORY_OPTION_KEYS,
	STUDY_MEMORY_PASSIVE_SETTINGS,
	STUDY_MEMORY_RELEASE_GOALS,
	STUDY_MEMORY_REPLAY_REFUSAL,
	STUDY_MEMORY_SEED_GOALS,
	STUDY_MEMORY_SEED_SETTINGS,
	STUDY_MEMORY_SHORT_GOAL,
	STUDY_MEMORY_TIMING,
} from '../../setupStudy.js'

describe('actual Agent/Ledger/Ollama memory consumer', () => {
	it('releases and replaces snapshots while preserving earlier wire receipts and fresh trial isolation', async () => {
		const server = await createMemoryFixture(
			new MemoryScript(
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
			),
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
			await server.destroy()
		}
	})

	it('charges a lookup to the goal that is running and never to a goal that already settled', async () => {
		const lookup = {
			path: '/api/chat',
			body: buildMemoryReply({
				content: '',
				calls: [{ function: { name: 'lookup', arguments: { id: 'order:BC-7301' } } }],
			}),
		}
		const server = await createMemoryFixture(
			new MemoryScript([
				lookup,
				{ path: '/api/chat', body: buildMemoryReply() },
				lookup,
				{ path: '/api/chat', body: buildMemoryReply() },
			]),
		)
		const profile = buildMemoryProfile({ url: server.url })
		const earlier = createMemoryContext(profile)
		const later = createMemoryContext(profile)
		try {
			const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
				{ id: 'accounting', scenario: 'public', arm: 'full', repetition: 0 },
				earlier.context.signal,
			)
			try {
				const input = { prompt: 'Read lookup id order:BC-7301', arrivals: [], records: [] }
				await session.execute({ id: 'first', input }, earlier.context)
				await session.execute({ id: 'second', input }, later.context)
				expect(earlier.context.meter.usage.filter((row) => row.role === 'tool')).toHaveLength(1)
				expect(later.context.meter.usage.filter((row) => row.role === 'tool')).toHaveLength(1)
			} finally {
				await session.close()
			}
		} finally {
			earlier.close()
			later.close()
			await server.destroy()
		}
	})

	it('dispatches actual memory work after generic validation and rejects invalid room controls', async () => {
		const server = await createMemoryFixture()
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
			await server.destroy()
		}
	})

	it('runs the full arm with no declared judge and pins only the served model', async () => {
		const server = await createMemoryFixture()
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
		}
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'plain', scenario: 'public', arm: 'full', repetition: 0 },
			fixture.context.signal,
		)
		try {
			await expect(session.execute(STUDY_MEMORY_SHORT_GOAL, fixture.context)).resolves.toEqual({
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
			await server.destroy()
		}
	})

	it('runs the plain arm with no conversation memory, so each goal sends only its own arrivals and prompt', async () => {
		const server = await createMemoryFixture()
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
		}
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'plain', scenario: 'public', arm: 'plain', repetition: 0 },
			fixture.context.signal,
		)
		const goals = [
			{
				id: 'first',
				input: {
					prompt: 'State the order count',
					arrivals: [{ id: 'a1', content: 'Order 77 shipped.' }],
					records: [],
				},
			},
			{
				id: 'second',
				input: {
					prompt: 'Name the courier',
					arrivals: [{ id: 'a2', content: 'The courier is Vega.' }],
					records: [],
				},
			},
		]
		try {
			for (const goal of goals)
				await expect(session.execute(goal, fixture.context)).resolves.toMatchObject({
					partial: false,
				})
			const chats = server.requests.filter((request) => request.path === '/api/chat')
			const first = chats[0]?.body ?? ''
			const last = chats.at(-1)?.body ?? ''
			expect(first).toContain('Order 77 shipped.')
			expect(first).toContain('State the order count')
			expect(last).toContain('The courier is Vega.')
			expect(last).toContain('Name the courier')
			expect(last).not.toContain('Order 77 shipped.')
			expect(last).not.toContain('State the order count')
			expect(server.requests.some((request) => request.body.includes('judge'))).toBe(false)
		} finally {
			await session.close()
			fixture.close()
			await server.destroy()
		}
	})

	it('refuses lookup before record access or evidence when the goal call allowance is exhausted', async () => {
		const server = await createMemoryFixture(
			new MemoryScript([
				{
					path: '/api/chat',
					body: buildMemoryReply({
						content: '',
						calls: [{ function: { name: 'lookup', arguments: { id: 'record' } } }],
					}),
				},
			]),
		)
		const base = buildMemoryProfile({ url: server.url })
		const profile = { ...base, bounds: { ...base.bounds, goal: { ...base.bounds.goal, calls: 1 } } }
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
			await server.destroy()
		}
	})

	it('retains actual lookup bytes once when the result exceeds its reservation', async () => {
		const server = await createMemoryFixture(
			new MemoryScript([
				{
					path: '/api/chat',
					body: buildMemoryReply({
						content: '',
						calls: [{ function: { name: 'lookup', arguments: { id: 'record' } } }],
					}),
				},
			]),
		)
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
			await server.destroy()
		}
	})

	it('executes an agent reply cut at the output allowance under the recommended byte bound', async () => {
		const recommended = parseStudyProfile(
			parseJSON(await readFile('studies/memory/profiles/recommended.json', 'utf8')),
		)
		// Each streamed row is 136 B, the chunk size goal 53's cut reply read.
		const chunk = `${JSON.stringify({
			model: 'model',
			created_at: '2026-11-03T05:00:00.0000000Z',
			message: { role: 'assistant', content: 'a'.repeat(17) },
			done: false,
		})}\n`
		const server = await createMemoryFixture(
			new MemoryScript([
				...STUDY_MEMORY_CALIBRATION,
				{
					path: '/api/chat',
					body: `${chunk.repeat(recommended.room.output - 1)}${buildMemoryReply({
						content: '',
						reason: 'length',
						completion: recommended.room.output,
					})}`,
				},
			]),
		)
		const base = buildMemoryProfile({ url: server.url, room: recommended.room, duration: 15000 })
		const profile = {
			...base,
			bounds: {
				...base.bounds,
				request: { ...base.bounds.request, bytes: recommended.bounds.request.bytes },
			},
		}
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'cut', scenario: 'public', arm: 'records', repetition: 0 },
			fixture.context.signal,
		)
		try {
			const result = await executeMemoryGoals(
				session,
				[{ id: 'opening', input: { prompt: 'Write the sheet', arrivals: [], records: [] } }],
				fixture.context,
			)
			// The stop is read first so that a refusal names its layer and id.
			expect(result.failure && readStudyFailure(result.failure.error).stop).toBeUndefined()
			expect(result.failure).toBeUndefined()
			const results = readMemoryEvents(fixture.evidence, 'result')
			expect(results).toEqual([expect.objectContaining({ partial: false })])
			expect(results[0]?.content).toHaveLength(17 * (recommended.room.output - 1))
			const wire = readMemoryEvents(fixture.evidence, 'wire')
				.filter((row) => row.role === 'agent')
				.at(-1)
			expect(wire).toMatchObject({ finish: 'length', completion: recommended.room.output })
			// The reply outgrows the bound the failing run held, 1048576 B.
			expect(wire?.bytes).toBeGreaterThan(1048576)
			expect(readMemoryEvents(fixture.evidence, 'stop')).toEqual([])
			// A nonempty cut reply takes no cue pass: the calibration pair and the reply are every chat request.
			expect(server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(
				STUDY_MEMORY_CALIBRATION.length + 1,
			)
		} finally {
			await session.close()
			fixture.close()
			await server.destroy()
		}
	})

	it('settles malformed lookup arguments with their known cost and stops subsequent work', async () => {
		const server = await createMemoryFixture(
			new MemoryScript([
				{
					path: '/api/chat',
					body: buildMemoryReply({
						content: '',
						calls: [{ function: { name: 'lookup', arguments: { id: 42 } } }],
					}),
				},
			]),
		)
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
			await server.destroy()
		}
	})

	it('admits and settles absent record lookups with the encoded response cost', async () => {
		const server = await createMemoryFixture(
			new MemoryScript([
				{
					path: '/api/chat',
					body: buildMemoryReply({
						content: '',
						calls: [{ function: { name: 'lookup', arguments: { id: 'absent' } } }],
					}),
				},
			]),
		)
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
			await server.destroy()
		}
	})

	it('preserves corrections and lookup traces across goals and starts repetitions fresh', async () => {
		const server = await createMemoryFixture(
			new MemoryScript([
				{
					path: '/api/chat',
					body: buildMemoryReply({
						content: '',
						calls: [{ function: { name: 'lookup', arguments: { id: 'order-1' } } }],
					}),
				},
				{ path: '/api/chat', body: buildMemoryReply({ content: 'Initial handoff' }) },
				{ path: '/api/chat', body: buildMemoryReply({ content: 'Corrected handoff' }) },
			]),
		)
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
			expect(fixture.context.meter.usage).toHaveLength(
				server.requests.filter((request) => request.path === '/api/chat').length + 1,
			)
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
			await server.destroy()
		}
	})

	it('runs actual Ledger classification and accepts its one-token judge readouts', async () => {
		const server = await createMemoryFixture()
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
			expect(fixture.context.meter.usage).toHaveLength(
				server.requests.filter(
					(request) => request.path === '/api/chat' || request.path === '/api/generate',
				).length,
			)
		} finally {
			await session.close()
			fixture.close()
			await server.destroy()
		}
	})

	it('latches http failures before subsequent dispatch', async () => {
		const server = await createMemoryFixture(
			new MemoryScript([{ path: '/api/chat', body: 'Unavailable', status: 503 }]),
		)
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
			expect(
				fixture.context.meter.usage.find((row) => row.role === 'agent')?.tokens,
			).toBeUndefined()
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
			await server.destroy()
		}
	})

	it('retains product evidence but refuses completion after a serving digest changes', async () => {
		const server = await createMemoryFixture(
			new MemoryScript([
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
			]),
		)
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
			await server.destroy()
		}
	})

	it('latches real judge decoding errors caught by Ledger classification', async () => {
		const server = await createMemoryFixture(
			new MemoryScript([
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
			]),
		)
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
			await server.destroy()
		}
	})

	it('keeps parent cancellation distinct from capacity', async () => {
		const server = await createMemoryFixture(
			new MemoryScript([
				{
					path: '/api/chat',
					body: `${JSON.stringify({ model: 'model', done: false, message: { content: 'partial' } })}\n`,
					open: true,
				},
			]),
		)
		const profile = buildMemoryProfile({ url: server.url })
		const controller = new AbortController()
		const fixture = createMemoryContext(profile, controller.signal)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'cancelled', scenario: 'public', arm: 'full', repetition: 0 },
			controller.signal,
		)
		try {
			const running = session.execute(STUDY_MEMORY_SHORT_GOAL, fixture.context).then(
				() => undefined,
				(reason: unknown) => reason,
			)
			await waitForCondition(
				'the first chat request',
				() => server.requests.some((request) => request.path === '/api/chat'),
				{ budget: 5000 },
			)
			controller.abort(new Error('Cancelled by the study caller'))
			const cancelled = await running
			expect(cancelled).toBeDefined()
			expect(cancelled).not.toMatchObject({ code: 'CAPACITY' })
			expect(readStudyFailure(cancelled).cause).not.toBe('capacity')
		} finally {
			await session.close()
			fixture.close()
			await server.destroy()
		}
	})
})

describe('passive observation of actual memory requests', () => {
	const goals = STUDY_MEMORY_OBSERVATION_GOALS
	const base: MemoryTrialFixture = {
		arm: 'full',
		responses: buildMemoryObservationResponses(STUDY_MEMORY_TIMING),
		goals,
	}

	it.each([
		{
			name: 'Full',
			trial: base,
			observed: STUDY_MEMORY_OBSERVED_SETTINGS,
			changed: buildMemoryObservationGoals('Look up order-2'),
			products: ['Initial handoff', 'Corrected handoff', 'Closed handoff'],
			chats: 4,
			tools: 1,
		},
	])(
		'keeps the $name trajectory identical with observation off and on, and fails on a changed byte',
		async ({ trial, observed, changed, products, chats, tools }) => {
			const off = await runMemoryTrial(trial)
			const control = await runMemoryTrial({ ...trial, settings: { observe: false } })
			const on = await runMemoryTrial({ ...trial, settings: observed })
			const moved = await runMemoryTrial({ ...trial, goals: changed, settings: observed })
			expect(off.failure).toBeUndefined()
			expect(off.products.map((product) => product.value)).toEqual(
				products.map((content) => ({ content })),
			)
			expect(off.requests.filter((request) => request.path === '/api/chat')).toHaveLength(chats)
			expect(off.usage.filter((row) => row.role === 'tool')).toHaveLength(tools)
			expect(readMemoryAdmission(control)).toEqual(readMemoryAdmission(off))
			expect(readMemoryAdmission(on)).toEqual(readMemoryAdmission(off))
			expect(
				on.evidence
					.filter((row) => !STUDY_MEMORY_OBSERVED_EVENTS.includes(row.event))
					.map((row) => [row.event, row.goal]),
			).toEqual(off.evidence.map((row) => [row.event, row.goal]))
			expect(off.evidence.some((row) => STUDY_MEMORY_OBSERVED_EVENTS.includes(row.event))).toBe(
				false,
			)
			expect(readMemoryAdmission(moved)).not.toEqual(readMemoryAdmission(off))
			expect(moved.requests.map((request) => request.body)).not.toEqual(
				off.requests.map((request) => request.body),
			)
			// Absent and false observation settings leave every existing event at its unobserved keys.
			for (const result of [off, control]) {
				for (const event of ['dispatch', 'wire'] as const) {
					const rows = readMemoryEvents(result.evidence, event)
					expect(rows.length).toBeGreaterThan(0)
					expect(rows.map((value) => Object.keys(value).sort())).toEqual(
						rows.map(() => STUDY_MEMORY_EVENT_KEYS[event]),
					)
				}
				expect(
					readMemoryEvents(result.evidence, 'result').map((value) => Object.keys(value).sort()),
				).toEqual(trial.goals.map(() => ['content', 'conversation', 'partial']))
			}
		},
	)

	it('keeps the failure outcome and admission identical when a malformed terminal fails the request', async () => {
		const failed: MemoryTrialFixture = {
			arm: 'full',
			responses: [
				{
					path: '/api/chat',
					body: buildMemoryReply({ completion: -1, timing: STUDY_MEMORY_TIMING }),
				},
			],
			goals: [{ id: 'opening', input: { prompt: 'Respond', arrivals: [], records: [] } }],
		}
		const off = await runMemoryTrial(failed)
		const on = await runMemoryTrial({ ...failed, settings: STUDY_MEMORY_PASSIVE_SETTINGS })
		expect(off.failure).toBeDefined()
		expect(readMemoryAdmission(on)).toEqual(readMemoryAdmission(off))
		const [observed] = readMemoryEvents(on.evidence, 'failure')
		expect(Object.keys(observed ?? {}).sort()).toEqual(
			listMemoryKeys(STUDY_MEMORY_EVENT_KEYS.failure, STUDY_MEMORY_OBSERVED_KEYS.failure),
		)
	})

	it('adds only the declared keys to existing events and keeps bodies and the snapshot to selected goals', async () => {
		const result = await runMemoryTrial({ ...base, settings: STUDY_MEMORY_OBSERVED_SETTINGS })
		const rows = result.evidence.filter((row) => row.event === 'dispatch' || row.event === 'wire')
		const selected = new Set(STUDY_MEMORY_OBSERVED_SETTINGS.checkpoints)
		const bodied = rows.map((row) => row.event === 'dispatch' && selected.has(row.goal))
		// The earliest bodied dispatch of each selected goal carries the snapshot; reversing lets the earliest index win the key.
		const firsts = new Map(
			[...rows.entries()]
				.toReversed()
				.filter(([index]) => bodied[index])
				.map(([index, row]): [string, number] => [row.goal, index]),
		)
		const expected = rows.map((row, index) => {
			const extra = [
				...(bodied[index] ? ['body'] : []),
				...(firsts.get(row.goal) === index ? ['snapshot'] : []),
			]
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
		const carried = [...firsts]
			.toSorted(([, left], [, right]) => left - right)
			.map(([goal]) => goal)
		expect(carried).toEqual(['opening', 'closure'])
		expect(rows.some((row) => row.event === 'dispatch' && row.goal === 'correction')).toBe(true)
		const dispatches = result.evidence.filter((row) => row.event === 'dispatch')
		expect(dispatches).toHaveLength(result.requests.length)
		const captured = dispatches.map((row) =>
			isRecord(row.value) && 'body' in row.value ? row.value.body : undefined,
		)
		expect(captured).toEqual(
			dispatches.map((row, index) => {
				const request = result.requests[index]
				if (!selected.has(row.goal)) return undefined
				return request?.path === '/api/tags' ? null : request?.body
			}),
		)
		const chats = result.requests.filter((request) => request.path === '/api/chat')
		const first = dispatches
			.filter(
				(row) => row.goal === 'opening' && isRecord(row.value) && row.value.path === '/api/chat',
			)
			.map((row) => (isRecord(row.value) ? row.value.body : undefined))
		expect(first).toEqual(chats.slice(0, 2).map((request) => request.body))
		expect(captured.some((body) => body === undefined)).toBe(true)
		expect(captured.some((body) => typeof body === 'string')).toBe(true)
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
		expect(timeline.every((row) => row.elapsed >= 0)).toBe(true)
		expect(
			timeline.slice(1).every((row, index) => {
				const prior = timeline[index]
				return prior !== undefined && row.sent >= prior.sent + prior.elapsed - 1e-6
			}),
		).toBe(true)
	})

	it('attaches an owned input once to the first dispatch of a selected goal', async () => {
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
		expect(Object.keys(snapshot)).toEqual(['input'])
		expect(snapshot.input).toEqual(goals[1]?.input)
		expect(snapshot.input).not.toBe(goals[1]?.input)
		expect(parseJSON(JSON.stringify(snapshot))).toEqual(snapshot)
	})

	it('appends a checkpoint row after result', async () => {
		for (const arm of ['records', 'full'] as const) {
			const result = await runMemoryTrial({
				arm,
				responses: buildMemorySeedResponses(arm),
				goals: STUDY_MEMORY_OBSERVATION_GOALS,
				settings: { observe: true, checkpoints: ['correction'] },
			})
			expect(result.failure).toBeUndefined()
			const rows = result.evidence.filter((row) => row.goal === 'correction')
			const events = rows.map((row) => row.event)
			expect(events.filter((event) => event === 'checkpoint')).toHaveLength(1)
			expect(events.indexOf('checkpoint')).toBeGreaterThan(events.indexOf('result'))
			expect(events.indexOf('result')).toBeGreaterThanOrEqual(0)
			expect(
				result.evidence.filter((row) => row.event === 'checkpoint').map((row) => row.goal),
			).toEqual(['correction'])
			const failed = await runMemoryTrial({
				arm,
				responses: [{ path: '/api/chat', status: 503, body: 'unavailable' }],
				goals: STUDY_MEMORY_OBSERVATION_GOALS.slice(0, 1),
				settings: { observe: true, checkpoints: ['opening'] },
			})
			expect(failed.failure).toBeDefined()
			expect(failed.evidence.filter((row) => row.event === 'checkpoint')).toEqual([])
		}
	})

	it('holds the end of a goal in a checkpoint row', async () => {
		const result = await runMemoryTrial({
			arm: 'full',
			responses: buildMemorySeedResponses('full'),
			goals: STUDY_MEMORY_OBSERVATION_GOALS,
			settings: STUDY_MEMORY_SEED_SETTINGS,
		})
		const value = readMemoryCheckpoint(result.evidence, 'correction')
		if (!isRecord(value)) throw new Error('Missing checkpoint value')
		expect(Object.keys(value).sort()).toEqual(['arrivals', 'cases', 'conversation', 'records'])
		expect(value.arrivals).toEqual(['source-1', 'source-2'])
		// A control files nothing out of its conversation.
		expect(value.cases).toEqual([])
		expect(value.records).toEqual([
			{ id: 'order-1', name: 'Owner', content: 'Confirmed reference' },
		])
		const view = JSON.stringify(value.conversation)
		expect(view).toContain('Correction: count is two.')
		expect(view).toContain('Corrected handoff')
		expect(view).not.toContain('Close handoff')
		const final = readMemoryCheckpoint(result.evidence, 'closure')
		expect(JSON.stringify(final)).toContain('Close handoff')
		expect(parseJSON(JSON.stringify(value))).toEqual(value)
	})

	it('seeds goal three byte-identical', async () => {
		for (const arm of ['records', 'full'] as const) {
			const uninterrupted = await runMemoryTrial({
				arm,
				responses: buildMemorySeedResponses(arm),
				goals: STUDY_MEMORY_SEED_GOALS,
				settings: STUDY_MEMORY_SEED_SETTINGS,
			})
			expect(uninterrupted.failure).toBeUndefined()
			const seeded = await runMemoryTrial({
				arm,
				responses: [],
				goals: STUDY_MEMORY_SEED_GOALS.slice(2),
				settings: STUDY_MEMORY_SEED_SETTINGS,
				seed: readMemorySealedCheckpoint(uninterrupted.evidence, 'correction'),
			})
			expect(seeded.failure).toBeUndefined()
			const first = readMemoryFirstChat(uninterrupted, 'closure')
			expect(first).toBeDefined()
			expect(readMemoryFirstChat(seeded, 'closure')).toBe(first)
			for (const goal of ['closure', 'review'])
				expect(readMemoryGoalRequests(seeded, goal)).toEqual(
					readMemoryGoalRequests(uninterrupted, goal),
				)
		}
	}, 60000)

	it('files a single-case statement out of the conversation and keeps a statement naming several cases in it', async () => {
		const result = await runMemoryTrial({
			arm: 'records',
			responses: STUDY_MEMORY_CALIBRATION,
			goals: STUDY_MEMORY_DESK_GOALS.slice(0, 2),
			settings: STUDY_MEMORY_DESK_SETTINGS,
		})
		expect(result.failure).toBeUndefined()
		const arrivals = readMemoryEvents(result.evidence, 'arrival')
		expect(arrivals.filter((row) => 'filed' in row)).toEqual([
			{ id: 'ev-01-2', filed: 'BC-7301' },
			{ id: 'ev-02-1', filed: 'BC-7302' },
		])
		expect(arrivals.filter((row) => !('filed' in row)).map((row) => row.id)).toEqual([
			'ev-opening',
			'ev-register',
		])
		const value = readMemoryCheckpoint(result.evidence, 'desk-second')
		if (!isStudyMemoryCheckpoint(value) || value.ledger === undefined)
			throw new Error('Missing ledger checkpoint')
		expect(value.cases).toEqual([
			{
				id: 'BC-7301',
				statements: [{ id: 'ev-01-2', content: 'BC-7301 filter arrived cracked.' }],
			},
			{
				id: 'BC-7302',
				statements: [{ id: 'ev-02-1', content: 'BC-7302 meter left at the locked gate.' }],
			},
		])
		const contents = value.ledger.conversation.messages.map((message) => message.content)
		expect(contents).toContain(`[Source ev-opening] ${MEMORY_DESK_OPENING.content}`)
		expect(contents).toContain(`[Source ev-register] ${MEMORY_DESK_REGISTER.content}`)
		expect(contents.filter((content) => content.startsWith('[Source ev-0'))).toEqual([])
		// Each goal's request carries the record of the case its own arrival filed; the opening goal's
		// calibration requests come first, so its pass is its last chat request.
		const opening = readMemoryGoalRequests(result, 'desk-opening')
			.filter((request) => request.path === '/api/chat')
			.at(-1)?.body
		expect(readMemoryDeskRecord(opening ?? '')).toBe(
			'Case record for BC-7301:\n\norder:BC-7301: Mara Ellison\nOrder BC-7301; ceramic filter breakage.\n\ncustomer:BC-4101: Mara Ellison\nAccount BC-4101; owner Mara Ellison; order BC-7301.\n\n[Source ev-01-2] BC-7301 filter arrived cracked.',
		)
		expect(readMemoryDeskRecord(readMemoryFirstChat(result, 'desk-second') ?? '')).toBe(
			'Case record for BC-7302:\n\norder:BC-7302: Ivo Mercer\nOrder BC-7302; meter delivery.\n\n[Source ev-02-1] BC-7302 meter left at the locked gate.',
		)
	}, 60000)

	it('renders the case a request names and removes the desk file when a request names none', async () => {
		const result = await runMemoryTrial({
			arm: 'records',
			responses: STUDY_MEMORY_CALIBRATION,
			goals: STUDY_MEMORY_DESK_GOALS,
			settings: STUDY_MEMORY_DESK_SETTINGS,
		})
		expect(result.failure).toBeUndefined()
		expect(readMemoryDeskRecord(readMemoryFirstChat(result, 'desk-return') ?? '')).toBe(
			'Case record for BC-7301:\n\norder:BC-7301: Mara Ellison\nOrder BC-7301; ceramic filter breakage.\n\ncustomer:BC-4101: Mara Ellison\nAccount BC-4101; owner Mara Ellison; order BC-7301.\n\n[Source ev-01-2] BC-7301 filter arrived cracked.',
		)
		const closing = readMemoryFirstChat(result, 'desk-close')
		expect(closing).toBeDefined()
		expect(readMemoryDeskRecord(closing ?? '')).toBeUndefined()
		expect(closing).not.toContain('Case record for')
	}, 60000)

	it('files nothing and renders no desk on a control', async () => {
		const result = await runMemoryTrial({
			arm: 'full',
			responses: [],
			goals: STUDY_MEMORY_DESK_GOALS,
			settings: STUDY_MEMORY_DESK_SETTINGS,
		})
		expect(result.failure).toBeUndefined()
		expect(readMemoryEvents(result.evidence, 'arrival').filter((row) => 'filed' in row)).toEqual([])
		const value = readMemoryCheckpoint(result.evidence, 'desk-close')
		if (!isStudyMemoryCheckpoint(value)) throw new Error('Missing checkpoint')
		expect(value.cases).toEqual([])
		expect(readMemoryDeskRecord(readMemoryFirstChat(result, 'desk-return') ?? '')).toBeUndefined()
	})

	it('reopens a desk checkpoint and sends the record the continuous session sends', async () => {
		const continuous = await runMemoryTrial({
			arm: 'records',
			responses: STUDY_MEMORY_CALIBRATION,
			goals: STUDY_MEMORY_DESK_GOALS,
			settings: STUDY_MEMORY_DESK_SETTINGS,
		})
		expect(continuous.failure).toBeUndefined()
		const seed = readMemorySealedCheckpoint(continuous.evidence, 'desk-second')
		const reopened = await runMemoryTrial({
			arm: 'records',
			responses: [],
			goals: STUDY_MEMORY_DESK_GOALS.slice(2),
			settings: STUDY_MEMORY_DESK_SETTINGS,
			seed,
		})
		expect(reopened.failure).toBeUndefined()
		const record = readMemoryDeskRecord(readMemoryFirstChat(continuous, 'desk-return') ?? '')
		expect(record).toContain('[Source ev-01-2] BC-7301 filter arrived cracked.')
		expect(readMemoryDeskRecord(readMemoryFirstChat(reopened, 'desk-return') ?? '')).toBe(record)
		for (const goal of ['desk-return', 'desk-close']) {
			expect(readMemoryFirstChat(reopened, goal)).toBe(readMemoryFirstChat(continuous, goal))
			expect(readMemoryGoalRequests(reopened, goal)).toEqual(
				readMemoryGoalRequests(continuous, goal),
			)
		}
		// No filed statement returns to the reopened ledger conversation.
		for (const goal of ['desk-return', 'desk-close']) {
			const value = readMemoryCheckpoint(reopened.evidence, goal)
			if (!isStudyMemoryCheckpoint(value) || value.ledger === undefined)
				throw new Error('Missing ledger checkpoint')
			expect(
				value.ledger.conversation.messages.filter((message) =>
					message.content.startsWith('[Source ev-0'),
				),
			).toEqual([])
			expect(value.cases.map((entry) => entry.id)).toEqual(['BC-7301', 'BC-7302'])
		}
	}, 60000)

	it('asks no judge question again', async () => {
		const uninterrupted = await runMemoryTrial({
			arm: 'records',
			responses: buildMemorySeedResponses('records'),
			goals: STUDY_MEMORY_SEED_GOALS,
			settings: STUDY_MEMORY_SEED_SETTINGS,
		})
		const seeded = await runMemoryTrial({
			arm: 'records',
			responses: [],
			goals: STUDY_MEMORY_SEED_GOALS.slice(2),
			settings: STUDY_MEMORY_SEED_SETTINGS,
			seed: readMemorySealedCheckpoint(uninterrupted.evidence, 'correction'),
		})
		expect(seeded.failure).toBeUndefined()
		for (const goal of ['closure', 'review']) {
			const asked = readMemoryGoalRequests(uninterrupted, goal)
				.filter((request) => request.path === '/api/generate')
				.map((request) => request.body)
			expect(
				readMemoryGoalRequests(seeded, goal)
					.filter((request) => request.path === '/api/generate')
					.map((request) => request.body),
			).toEqual(asked)
		}
		// The arrival goal asks, so the compare above holds a body.
		expect(
			readMemoryGoalRequests(uninterrupted, 'review').some(
				(request) => request.path === '/api/generate',
			),
		).toBe(true)
	}, 60000)

	it('differs with failures emptied', async () => {
		const lookup = buildMemoryCall('lookup', { id: 'order-1' })
		const held = await runMemoryTrial({
			arm: 'records',
			responses: [
				...STUDY_MEMORY_CALIBRATION,
				lookup,
				lookup,
				{ path: '/api/chat', body: buildMemoryReply({ content: 'Answered' }) },
			],
			goals: STUDY_MEMORY_SEED_GOALS.slice(0, 2),
			settings: STUDY_MEMORY_SEED_SETTINGS,
		})
		expect(held.failure).toBeUndefined()
		const row = readMemoryCheckpoint(held.evidence, 'correction')
		if (!isRecord(row) || !isRecord(row.ledger) || !Array.isArray(row.ledger.failures))
			throw new Error('Missing checkpoint ledger')
		expect(row.ledger.failures.length).toBeGreaterThan(0)
		// The recent window shows the last 8 exchanges with their lookups, so 8 answered filler goals put
		// the failed lookup behind it; a request that names the record then reads its lookup results,
		// which is where a mark can show.
		const fillers = Array.from({ length: 8 }, (_unused, at) => ({
			id: `filler-${at + 1}`,
			input: { prompt: `Note filler ${at + 1}`, arrivals: [], records: [] },
		}))
		const trial: MemoryTrialFixture = {
			arm: 'records',
			responses: fillers.map(() => ({
				path: '/api/chat',
				body: buildMemoryReply({ content: 'Noted' }),
			})),
			goals: [
				...fillers,
				{ id: 'closure', input: { prompt: 'Close order-1 handoff', arrivals: [], records: [] } },
			],
			settings: STUDY_MEMORY_SEED_SETTINGS,
		}
		const intact = await runMemoryTrial({ ...trial, seed: row })
		const emptied = await runMemoryTrial({
			...trial,
			seed: buildMemorySeedLedger(row, { failures: [] }),
		})
		expect(intact.failure).toBeUndefined()
		expect(emptied.failure).toBeUndefined()
		const seated = readMemoryFirstChat(intact, 'closure')
		expect(seated).toBeDefined()
		expect(readMemoryFirstChat(emptied, 'closure')).toBeDefined()
		expect(readMemoryFirstChat(emptied, 'closure')).not.toBe(seated)
	}, 60000)

	it('calibrates with the gauge removed', async () => {
		const uninterrupted = await runMemoryTrial({
			arm: 'records',
			responses: buildMemorySeedResponses('records'),
			goals: STUDY_MEMORY_SEED_GOALS.slice(0, 2),
			settings: STUDY_MEMORY_SEED_SETTINGS,
		})
		const row = readMemoryCheckpoint(uninterrupted.evidence, 'correction')
		if (!isRecord(row) || !isRecord(row.ledger)) throw new Error('Missing checkpoint ledger')
		expect(row.ledger.gauge).toEqual({
			scale: expect.any(Number),
			overhead: expect.any(Number),
			digest: expect.any(String),
			model: 'model',
		})
		const trial: MemoryTrialFixture = {
			arm: 'records',
			responses: [],
			goals: STUDY_MEMORY_SEED_GOALS.slice(2, 3),
			settings: STUDY_MEMORY_SEED_SETTINGS,
		}
		const present = await runMemoryTrial({ ...trial, seed: row })
		const removed = await runMemoryTrial({
			...trial,
			seed: buildMemorySeedLedger(row, { gauge: undefined }),
		})
		expect(present.failure).toBeUndefined()
		expect(removed.failure).toBeUndefined()
		const held = present.requests.filter((request) => request.path === '/api/chat')
		const measured = removed.requests.filter((request) => request.path === '/api/chat')
		expect(held).toHaveLength(1)
		expect(measured.length - held.length).toBe(STUDY_MEMORY_CALIBRATION.length)
	}, 60000)

	it('refuses a replayed arrival when seeded', async () => {
		const uninterrupted = await runMemoryTrial({
			arm: 'full',
			responses: [],
			goals: STUDY_MEMORY_SEED_GOALS.slice(0, 1),
			settings: STUDY_MEMORY_SEED_SETTINGS,
		})
		const seed = readMemoryCheckpoint(uninterrupted.evidence, 'opening')
		const replayed = await runMemoryTrial({
			arm: 'full',
			responses: [],
			goals: STUDY_MEMORY_SEED_GOALS.slice(0, 1),
			settings: STUDY_MEMORY_SEED_SETTINGS,
			seed,
		})
		expect(replayed.failure).toBe('Source arrival was replayed within a trial')
		expect(replayed.requests.filter((request) => request.path === '/api/chat')).toEqual([])
		const later = await runMemoryTrial({
			arm: 'full',
			responses: [],
			goals: STUDY_MEMORY_SEED_GOALS.slice(1, 2),
			settings: STUDY_MEMORY_SEED_SETTINGS,
			seed,
		})
		expect(later.failure).toBeUndefined()
	})

	it('retains the snapshot of a selected goal whose model later fails', async () => {
		const result = await runMemoryTrial({
			arm: 'full',
			responses: [{ path: '/api/chat', body: buildMemoryReply({ completion: 513 }) }],
			goals,
			settings: { observe: true, checkpoints: ['opening'] },
		})
		expect(result.failure).toBeDefined()
		expect(readMemorySnapshot(result.evidence, 'opening').input).toEqual(goals[0]?.input)
		expect(
			result.evidence.filter((row) => isRecord(row.value) && 'snapshot' in row.value),
		).toHaveLength(1)
	})

	it('attaches logical classifier attempts and the calibrated gauge without leaking into requests or products', async () => {
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
		expect(readMemoryEvents(off.evidence, 'result').map((value) => 'attempts' in value)).toEqual([
			false,
			false,
		])
		const attempts = readMemoryEvents(on.evidence, 'result').map((value) => value.attempts)
		expect(attempts.every((entry) => Array.isArray(entry))).toBe(true)
		const entries = attempts.flatMap((entry) => (Array.isArray(entry) ? entry : []))
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
			shapes.map(() => [...STUDY_MEMORY_OPTION_KEYS]),
		)
		const judges = readMemoryEvents(on.evidence, 'wire').filter((value) => value.role === 'judge')
		expect(judges.length).toBeGreaterThan(0)
		const calibrated = readMemoryCheckpoint(on.evidence, 'opening')
		if (!isRecord(calibrated) || !isRecord(calibrated.ledger))
			throw new Error('Missing checkpoint ledger')
		expect(calibrated.ledger.gauge).toEqual({
			scale: expect.any(Number),
			overhead: expect.any(Number),
			digest: expect.any(String),
			model: 'model',
		})
	})

	it('retains one ordered estimate row per agent dispatch, with no projection, only while observing', async () => {
		const full = await runMemoryTrial({ ...base, settings: STUDY_MEMORY_PASSIVE_SETTINGS })
		const silent = await runMemoryTrial(base)
		expect(silent.evidence.some((row) => row.event === 'estimate')).toBe(false)
		expect(full.failure).toBeUndefined()
		const rows = readMemoryEvents(full.evidence, 'estimate')
		const dispatched = readMemoryEvents(full.evidence, 'dispatch').filter(
			(value) => value.role === 'agent',
		)
		expect(rows).toHaveLength(dispatched.length)
		expect(rows).toHaveLength(4)
		for (const goal of goals)
			expect(readMemoryEvents(full.evidence, 'estimate', goal.id)).toHaveLength(
				readMemoryEvents(full.evidence, 'dispatch', goal.id).filter(
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
		expect(rows.map((row) => row.projected)).toEqual([null, null, null, null])
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

	it.each([
		['unknown counts', { unknown: true }],
		['a zero prompt count', { prompt: 0 }],
	])('accepts %s on a request no gauge prices', async (_name, reply) => {
		const goal: ReadonlyArray<MemoryTrialFixture['goals'][number]> = [
			{ id: 'opening', input: { prompt: 'Respond', arrivals: [], records: [] } },
		]
		const responses = [{ path: '/api/chat', body: buildMemoryReply(reply) }]
		const ungauged = await runMemoryTrial({ arm: 'full', responses, goals: goal })
		expect(ungauged.failure).toBeUndefined()
	})
})

describe('repeated and denied tool calls', () => {
	const first = STUDY_MEMORY_OBSERVATION_GOALS.slice(0, 1)
	const lookup = buildMemoryCall('lookup', { id: 'order-1' })
	const answer = { path: '/api/chat', body: buildMemoryReply({ content: 'Answered' }) }

	it('files a ledger repeat as a denial row', async () => {
		const result = await runMemoryTrial({
			arm: 'records',
			responses: [...STUDY_MEMORY_CALIBRATION, lookup, lookup, answer],
			goals: first,
		})
		expect(result.failure).toBeUndefined()
		expect(readMemoryEvents(result.evidence, 'lookup')).toEqual([{ id: 'order-1', found: true }])
		expect(readMemoryEvents(result.evidence, 'denial', 'opening')).toEqual([
			{
				id: expect.any(String),
				name: 'lookup',
				reason: STUDY_MEMORY_MODULES.agent.LEDGER_NOTES.repeat,
			},
		])
	})

	it('appends a denial row per denied call', async () => {
		const absent = buildMemoryCall('absent', {})
		const denial = {
			id: expect.any(String),
			name: 'absent',
			reason: 'absent is not in the active scope',
		}
		const full = await runMemoryTrial({
			arm: 'full',
			responses: [absent, answer],
			goals: first,
		})
		const records = await runMemoryTrial({
			arm: 'records',
			responses: [...STUDY_MEMORY_CALIBRATION, absent, answer],
			goals: first,
		})
		expect(full.failure).toBeUndefined()
		expect(records.failure).toBeUndefined()
		expect(readMemoryEvents(full.evidence, 'denial', 'opening')).toEqual([denial])
		expect(readMemoryEvents(records.evidence, 'denial', 'opening')).toEqual([denial])
	})

	it('asks the pair questions of every earlier statement a correction shares its topic with', async () => {
		// Every message shares the topic, so the correction pairs with each earlier statement.
		const trial: MemoryTrialFixture = {
			arm: 'records',
			responses: ['A', 'A', 'A', 'C'].map(buildMemoryVerdict),
			goals: [
				{
					id: 'opening',
					input: {
						prompt: 'Report the order count',
						arrivals: [
							{ id: 'first', content: 'The order count is 12.' },
							{ id: 'second', content: 'The order count is two.' },
							{ id: 'third', content: 'The order count is three.' },
							{ id: 'fix', content: 'Correction: the order count is 12 and four.' },
						],
						records: [],
					},
				},
			],
		}
		const result = await runMemoryTrial(trial)
		expect(result.failure).toBeUndefined()
		expect(countMemoryPairs(result.requests)).toBe(6)
	})
})

describe('recording declarations of a memory session', () => {
	const { agent: admitted, provider: ollama } = STUDY_MEMORY_MODULES

	it('refuses recording without a sink', () => {
		if (!isStudyMemoryAgent(admitted) || !isStudyMemoryProvider(ollama))
			throw new Error('Missing admitted modules')
		expect(
			() =>
				new StudyMemorySession({
					agent: admitted,
					ledger: undefined,
					provider: ollama,
					classifier: undefined,
					profile: buildMemoryRecordProfile('http://127.0.0.1:1'),
					arm: 'full',
					signal: new AbortController().signal,
				}),
		).toThrow(
			expect.objectContaining({
				code: 'CONFIG',
				message: 'Memory recording requires declarations and an exchange sink',
			}),
		)
	})

	it('refuses a sink without recording', () => {
		if (!isStudyMemoryAgent(admitted) || !isStudyMemoryProvider(ollama))
			throw new Error('Missing admitted modules')
		expect(
			() =>
				new StudyMemorySession({
					agent: admitted,
					ledger: undefined,
					provider: ollama,
					classifier: undefined,
					profile: buildMemoryProfile({ url: 'http://127.0.0.1:1' }),
					arm: 'full',
					signal: new AbortController().signal,
					exchanges: STUDY_MEMORY_INERT_EXCHANGES,
				}),
		).toThrow(
			expect.objectContaining({
				code: 'CONFIG',
				message: 'Memory exchanges and replay require declared recording',
			}),
		)
	})

	it('sends a recording through its sink and its replay and not to the daemon', async () => {
		const server = await createMemoryFixture()
		const profile = buildMemoryRecordProfile(server.url)
		const fixture = createMemoryContext(profile)
		const trial = { id: 'captured', scenario: 'public', arm: 'full', repetition: 0 }
		const capture = buildMemoryCapture(profile, trial, STUDY_MEMORY_SHORT_GOAL)
		try {
			const session = await new StudyMemoryDriver({
				...STUDY_MEMORY_MODULES,
				profile,
				exchanges: capture.exchanges,
				replay: capture.replay,
			}).open(trial, fixture.context.signal)
			try {
				await expect(session.execute(STUDY_MEMORY_SHORT_GOAL, fixture.context)).rejects.toThrow(
					STUDY_MEMORY_REPLAY_REFUSAL,
				)
			} finally {
				await session.close()
			}
			// A declared preflight opens with the version, which a transport with no sink never fetches.
			expect(capture.sent.calls).toEqual([['metadata', '/api/version']])
			expect(capture.rows.calls).toMatchObject([
				[{ phase: 'attempt', ordinal: 1, role: 'metadata', path: '/api/version' }],
			])
			expect(server.requests).toEqual([])
		} finally {
			fixture.close()
			await server.destroy()
		}
	})
})

describe('the system of a memory session', () => {
	it('sends the study system on a records session', async () => {
		const run = await runMemoryTrial({
			arm: 'records',
			responses: buildMemorySeedResponses('records'),
			goals: STUDY_MEMORY_SEED_GOALS.slice(0, 2),
			settings: STUDY_MEMORY_SEED_SETTINGS,
		})
		expect(run.failure).toBeUndefined()
		expect(parseJSON(readMemoryFirstChat(run, 'opening') ?? '')).toEqual(
			expect.objectContaining({
				messages: expect.arrayContaining([
					expect.objectContaining({ role: 'system', content: STUDY_MEMORY_SYSTEM }),
				]),
			}),
		)
	}, 60000)
})
