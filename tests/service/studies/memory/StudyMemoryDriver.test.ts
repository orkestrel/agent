import { describe, expect, it, vi } from 'vitest'
import { isRecord, parseJSON } from '@orkestrel/contract'
import { readStudyFailure, StudyError, validateStudyInputs } from '@orkestrel/study'
import { StudyMemoryDriver } from '../../../../studies/memory/index.js'
import {
	buildMemoryEdge,
	buildMemoryProfile,
	buildMemoryReply,
	createMemoryContext,
	createMemoryServer,
	loadMemoryInputs,
	readMemoryToolResults,
	STUDY_MEMORY_MODULES,
	STUDY_MEMORY_RELEASE_GOALS,
	STUDY_MEMORY_SETTINGS,
	WINDOW_GOAL,
} from '../../../setupService.js'

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
			room: { context: 1024, output: 128, safety: 128, recap: 64 },
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
			expect(Object.keys(windowed).toSorted()).toEqual(Object.keys(plain).toSorted())
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
			expect(refused).toBeInstanceOf(StudyError)
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
			room: { context: 1024, output: 128, safety: 128, recap: 64 },
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
