import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { isRecord } from '@orkestrel/contract'
import { StudyMemoryDriver } from '../../../../studies/memory/index.js'
import {
	buildMemoryProfile,
	buildMemoryReply,
	createMemoryContext,
	createMemoryModules,
	createMemoryServer,
} from '../../../setupService.js'
import type { MemoryModuleFixture } from './types.js'

describe('actual Agent/Ledger/Ollama memory consumer', () => {
	let modules: MemoryModuleFixture
	beforeAll(async () => {
		modules = await createMemoryModules()
	})
	afterAll(async () => {
		await modules.close()
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
		const driver = new StudyMemoryDriver({ ...modules, profile })
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
			expect(fixture.context.meter.usage).toHaveLength(server.requests.length)
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
		const session = await new StudyMemoryDriver({ ...modules, profile }).open(
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
		})
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...modules, profile }).open(
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
			const session = await new StudyMemoryDriver({ ...modules, profile }).open(
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
		const session = await new StudyMemoryDriver({ ...modules, profile }).open(
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
		const session = await new StudyMemoryDriver({ ...modules, profile }).open(
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
		const session = await new StudyMemoryDriver({ ...modules, profile }).open(
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
		const session = await new StudyMemoryDriver({ ...modules, profile }).open(
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
		const session = await new StudyMemoryDriver({ ...modules, profile }).open(
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
		const session = await new StudyMemoryDriver({ ...modules, profile }).open(
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
