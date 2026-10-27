import { readStudyDeclaration, hashStudyBytes } from '@orkestrel/study/server'
import { waitForCondition } from '@orkestrel/test'
import { parseJSON } from '@orkestrel/contract'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'
import {
	matchesStudyMemoryCarriage,
	matchesStudyMemorySham,
	scanStudyMemorySelection,
} from '../../../studies/memory/helpers.js'
import {
	buildMemoryReply,
	buildMemoryScreenResponses,
	createMemoryScreenBoundary,
	createMemoryScreenSession,
	runMemoryTrial,
	readMemoryAdmission,
	normalizeMemoryEvidence,
} from '../../setupStudy.js'

it('keeps omitted and explicit false bytes, selections and evidence equal without screen receipts', async () => {
	const { scenarios } = await readStudyDeclaration(resolve('.'), 'r2-request-screen')
	const scenario = scenarios[0]
	if (scenario === undefined) throw new Error('Missing public scenario')
	const base = {
		arm: 'records' as const,
		goals: scenario.goals,
		responses: buildMemoryScreenResponses([scenario]),
		settings: { observe: true, ledger: { lexical: false, recent: false, work: false } },
	}
	const omitted = await runMemoryTrial(base)
	const disabled = await runMemoryTrial({ ...base, settings: { ...base.settings, screen: false } })
	expect(omitted.failure).toBeUndefined()
	expect(readMemoryAdmission(disabled)).toEqual(readMemoryAdmission(omitted))
	expect(scanStudyMemorySelection(omitted.evidence, disabled.evidence)).toBeUndefined()
	expect(normalizeMemoryEvidence(disabled.evidence)).toEqual(
		normalizeMemoryEvidence(omitted.evidence),
	)
	expect(disabled.evidence.some((row) => row.event === 'screen')).toBe(false)
})

it('preserves native provider identity, tools, options, content deltas and final results', async () => {
	const fixture = await createMemoryScreenBoundary([
		{ path: '/api/chat', body: buildMemoryReply({ content: 'Inert stream.' }) },
		{ path: '/api/chat', body: buildMemoryReply({ content: 'Inert stream.' }) },
	])
	try {
		expect([fixture.provider.id, fixture.provider.name, fixture.provider.replay]).toEqual([
			fixture.native.id,
			fixture.native.name,
			fixture.native.replay ?? 'none',
		])
		const messages = [{ id: 'input', role: 'user' as const, content: 'Return an inert statement.' }]
		const tools = [
			{
				name: 'lookup',
				description: 'Read a public record.',
				parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
			},
		]
		const iterator = fixture.provider.stream(messages, fixture.context.context.signal, tools, {
			think: false,
		})
		expect(await iterator.next()).toEqual({
			done: false,
			value: { channel: 'content', text: 'Inert stream.' },
		})
		const final = await iterator.next()
		expect(final.done).toBe(true)
		const generated = await fixture.provider.generate(
			messages,
			fixture.context.context.signal,
			tools,
			{ think: false },
		)
		expect(final.value).toEqual(generated)
		const bodies = fixture.server.requests
			.filter((request) => request.path === '/api/chat')
			.map((request) => parseJSON(request.body))
		expect(bodies[0]).toEqual(bodies[1])
		expect(bodies[0]).toMatchObject({
			messages: [{ role: 'user', content: 'Return an inert statement.' }],
			think: false,
			tools: [{ type: 'function', function: tools[0] }],
			options: { num_ctx: 20480, num_predict: 8192, temperature: 0, seed: 0 },
		})
		expect(messages).toEqual([{ id: 'input', role: 'user', content: 'Return an inert statement.' }])
	} finally {
		await fixture.close()
	}
})

it.each(['screen', 'native'] as const)(
	'closes an abandoned %s stream and refuses continuation after its retained transport failure',
	async (boundary) => {
		const fixture = await createMemoryScreenBoundary([
			{
				path: '/api/chat',
				body: '{"model":"model","done":false,"message":{"role":"assistant","content":"First"}}\n',
				open: true,
			},
		])
		try {
			const iterator = (boundary === 'screen' ? fixture.provider : fixture.native).stream(
				[],
				fixture.context.context.signal,
			)
			expect(await iterator.next()).toEqual({
				done: false,
				value: { channel: 'content', text: 'First' },
			})
			await iterator.return({ content: '' })
			await expect(fixture.provider.generate([], fixture.context.context.signal)).rejects.toThrow(
				Error,
			)
			expect(
				fixture.server.requests.filter((request) => request.path === '/api/chat'),
			).toHaveLength(1)
			expect(fixture.screen.account.tokens).toBe(8192)
		} finally {
			await fixture.close()
		}
	},
)

it('propagates caller cancellation through real HTTP and retains the whole failed reservation', async () => {
	const parked = new AbortController()
	const caller = new AbortController()
	const fixture = await createMemoryScreenBoundary([
		{ path: '/api/chat', body: buildMemoryReply(), signal: parked.signal },
	])
	try {
		const pending = fixture.provider.generate([], caller.signal)
		await waitForCondition(
			'screen agent dispatch',
			() => fixture.server.requests.some((request) => request.path === '/api/chat'),
			{ budget: 1000 },
		)
		caller.abort(new Error('Independent caller cancellation'))
		await expect(pending).rejects.toThrow(/aborted/)
		expect(fixture.screen.account).toMatchObject({ agent: 1, tokens: 8192 })
		await expect(fixture.provider.generate([], fixture.context.context.signal)).rejects.toThrow(
			Error,
		)
		expect(fixture.server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(
			1,
		)
	} finally {
		parked.abort()
		await fixture.close()
	}
})

it('refuses an actual judge reply with missing usage without sending an agent recovery', async () => {
	const fixture = await createMemoryScreenBoundary([
		{
			path: '/api/generate',
			body: JSON.stringify({
				model: 'judge',
				done: true,
				done_reason: 'length',
				response: 'A',
				logprobs: [
					{
						token: 'A',
						logprob: -0.01,
						top_logprobs: [
							{ token: 'A', logprob: -0.01 },
							{ token: 'B', logprob: -8 },
						],
					},
				],
			}),
		},
	])
	try {
		await expect(
			fixture.judge.ask(
				{ state: 'Released evidence.', questions: { present: { form: 'noul' } } },
				fixture.context.context.signal,
			),
		).rejects.toThrow(/prompt count/)
		expect(fixture.screen.account).toMatchObject({ agent: 0, judge: 1, tokens: 1 })
		await expect(fixture.provider.generate([], fixture.context.context.signal)).rejects.toThrow(
			Error,
		)
		expect(fixture.server.requests.some((request) => request.path === '/api/chat')).toBe(false)
	} finally {
		await fixture.close()
	}
})

it('reserves six agent policies and refuses the next actual provider send without refund', async () => {
	const fixture = await createMemoryScreenBoundary()
	try {
		for (const count of Array.from({ length: 6 }, (_, index) => index + 1)) {
			await fixture.provider.generate([], fixture.context.context.signal)
			expect(fixture.screen.account.agent).toBe(count)
		}
		expect(fixture.screen.account).toMatchObject({ agent: 6, judge: 0, tokens: 49152 })
		expect(fixture.server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(
			6,
		)
		await expect(fixture.provider.generate([], fixture.context.context.signal)).rejects.toThrow(
			/reservation exhausted/,
		)
		expect(fixture.server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(
			6,
		)
		expect(fixture.screen.signal.aborted).toBe(true)
		await expect(fixture.provider.generate([], fixture.context.context.signal)).rejects.toBe(
			fixture.screen.signal.reason,
		)
	} finally {
		await fixture.close()
	}
})

it('reserves 64 real judge calls and refuses a 65th send before dispatch', async () => {
	const fixture = await createMemoryScreenBoundary()
	try {
		for (const count of Array.from({ length: 64 }, (_, index) => index + 1)) {
			await fixture.judge.ask(
				{ state: 'Released evidence.', questions: { present: { form: 'noul' } } },
				fixture.context.context.signal,
			)
			expect(fixture.screen.account.judge).toBe(count)
		}
		expect(fixture.screen.account).toMatchObject({ agent: 0, judge: 64, tokens: 64 })
		expect(
			fixture.server.requests.filter((request) => request.path === '/api/generate'),
		).toHaveLength(64)
		await expect(
			fixture.judge.ask(
				{ state: 'Released evidence.', questions: { present: { form: 'noul' } } },
				fixture.context.context.signal,
			),
		).rejects.toThrow(Error)
		expect(
			fixture.server.requests.filter((request) => request.path === '/api/generate'),
		).toHaveLength(64)
		expect(() => fixture.screen.check()).toThrow(/reservation exhausted/)
	} finally {
		await fixture.close()
	}
})

it('binds the 70-call and 49216-token source ceiling to the unchanged positive policies', async () => {
	const fixture = await createMemoryScreenBoundary()
	try {
		for (const count of Array.from({ length: 64 }, (_, index) => index + 1)) {
			await fixture.judge.ask(
				{ state: 'Released evidence.', questions: { present: { form: 'noul' } } },
				fixture.context.context.signal,
			)
			expect(fixture.screen.account.judge).toBe(count)
		}
		for (const count of Array.from({ length: 6 }, (_, index) => index + 1)) {
			await fixture.provider.generate([], fixture.context.context.signal)
			expect(fixture.screen.account.agent).toBe(count)
		}
		expect(fixture.screen.account).toMatchObject({ agent: 6, judge: 64, tokens: 49216 })
		await expect(fixture.provider.generate([], fixture.context.context.signal)).rejects.toThrow(
			/reservation exhausted/,
		)
		expect(
			fixture.server.requests.filter(
				(request) => request.path === '/api/chat' || request.path === '/api/generate',
			),
		).toHaveLength(70)
	} finally {
		await fixture.close()
	}
})

it('refuses a whole over-limit returned tool batch before any real lookup executes', async () => {
	const declaration = await readStudyDeclaration(resolve('.'), 'r2-request-screen')
	const replies = buildMemoryScreenResponses(declaration.scenarios.slice(0, 1))
	const fixture = await createMemoryScreenSession([
		...replies.slice(0, 2),
		{
			path: '/api/chat',
			body: buildMemoryReply({
				content: '',
				calls: Array.from({ length: 5 }, (_, index) => ({
					function: { name: 'lookup', arguments: { id: `order:${index}` } },
				})),
			}),
		},
	])
	try {
		const seed = fixture.scenario.goals[0]
		const target = fixture.scenario.goals[1]
		if (seed === undefined || target === undefined) throw new Error('Missing public goals')
		await expect(fixture.session.execute(seed, fixture.context.context)).rejects.toThrow(
			/whole tool batch/,
		)
		expect(fixture.context.evidence.filter((row) => row.event === 'lookup')).toEqual([])
		expect(fixture.server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(
			3,
		)
		await expect(fixture.session.execute(target, fixture.context.context)).rejects.toThrow(
			/whole tool batch/,
		)
		expect(fixture.server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(
			3,
		)
	} finally {
		await fixture.close()
	}
})

it('counts duplicate and unknown tool names and refuses excess rounds and recalls', async () => {
	const fixture = await createMemoryScreenBoundary()
	try {
		const repeated = {
			content: '',
			usage: { prompt: 10, completion: 2, total: 12 },
			tools: [
				{ id: 'same', name: 'unknown', arguments: {} },
				{ id: 'same', name: 'unknown', arguments: {} },
			],
		}
		expect(fixture.screen.complete(repeated)).toBe(repeated)
		expect(fixture.screen.complete(repeated)).toBe(repeated)
		expect(fixture.screen.account).toMatchObject({ rounds: 2, tools: 4, recalls: 0 })
		expect(() =>
			fixture.screen.complete({
				...repeated,
				tools: [{ id: 'third', name: 'unknown', arguments: {} }],
			}),
		).toThrow(/whole tool batch/)
	} finally {
		await fixture.close()
	}
	const recalls = await createMemoryScreenBoundary()
	try {
		expect(() =>
			recalls.screen.complete({
				content: '',
				usage: { prompt: 10, completion: 2, total: 12 },
				tools: Array.from({ length: 3 }, (_, index) => ({
					id: String(index),
					name: 'recall',
					arguments: { topic: 'orders' },
				})),
			}),
		).toThrow(/whole tool batch/)
		expect(recalls.screen.account).toMatchObject({ tools: 0, rounds: 0, recalls: 0 })
	} finally {
		await recalls.close()
	}
})

it('requires successful seed receipts and refuses target tool dispatch even after real preparation', async () => {
	const declaration = await readStudyDeclaration(resolve('.'), 'r2-request-screen')
	const replies = buildMemoryScreenResponses(declaration.scenarios.slice(0, 1))
	const missing = await createMemoryScreenSession([
		...replies.slice(0, 2),
		{ path: '/api/chat', body: buildMemoryReply({ content: 'A draft with no lookup.' }) },
	])
	try {
		const seed = missing.scenario.goals[0]
		if (seed === undefined) throw new Error('Missing seed')
		await expect(missing.session.execute(seed, missing.context.context)).rejects.toThrow(
			/lookup denominator/,
		)
	} finally {
		await missing.close()
	}
	const fixture = await createMemoryScreenSession([
		...replies.slice(0, 4),
		{
			path: '/api/chat',
			body: buildMemoryReply({
				content: '',
				calls: [{ function: { name: 'lookup', arguments: { id: 'order:BC-7302' } } }],
			}),
		},
	])
	try {
		const [seed, target] = fixture.scenario.goals
		if (seed === undefined || target === undefined) throw new Error('Missing public goals')
		await fixture.session.execute(seed, fixture.context.context)
		await expect(fixture.session.execute(target, fixture.context.context)).rejects.toThrow(
			/cannot dispatch tools/,
		)
		expect(fixture.context.evidence.filter((row) => row.event === 'lookup')).toHaveLength(2)
		expect(
			fixture.context.evidence.filter((row) => row.event === 'lookup' && row.goal === target.id),
		).toEqual([])
		expect(
			fixture.context.evidence.filter((row) => row.event === 'result' && row.goal === target.id),
		).toEqual([])
	} finally {
		await fixture.close()
	}
})

it('keeps calibration, real continuation and empty-answer recovery in one case account', async () => {
	const declaration = await readStudyDeclaration(resolve('.'), 'r2-request-screen')
	const replies = buildMemoryScreenResponses(declaration.scenarios.slice(0, 1))
	const fixture = await createMemoryScreenSession([
		...replies.slice(0, 3),
		{ path: '/api/chat', body: buildMemoryReply({ content: '' }) },
		...replies.slice(3),
	])
	try {
		for (const goal of fixture.scenario.goals)
			await fixture.session.execute(goal, fixture.context.context)
		const accounts = fixture.context.evidence.filter((row) => row.event === 'screen')
		expect(accounts[0]?.value).toMatchObject({ agent: 5, tools: 2, rounds: 1 })
		expect(accounts[1]?.value).toMatchObject({ agent: 6, tools: 2, rounds: 1 })
		expect(fixture.server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(
			6,
		)
	} finally {
		await fixture.close()
	}
})

it('retains a failed usage attempt and aborts further provider work', async () => {
	const fixture = await createMemoryScreenBoundary([
		{ path: '/api/chat', body: buildMemoryReply({ unknown: true }) },
	])
	try {
		await expect(fixture.provider.generate([], fixture.context.context.signal)).rejects.toThrow(
			Error,
		)
		expect(fixture.screen.account).toMatchObject({ agent: 1, tokens: 8192 })
		await expect(fixture.provider.generate([], fixture.context.context.signal)).rejects.toThrow(
			Error,
		)
		expect(fixture.server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(
			1,
		)
	} finally {
		await fixture.close()
	}
})

it('detects independent missing, wrong-version and sham mutation controls', () => {
	const record = 'order:desk: Original\nReleased amount $12.00. Approval pending.'
	const actual = [
		{ content: 'Pinned\n- order:desk: Original\nReleased amount $12.00.\n- Approval pending.' },
	]
	expect(matchesStudyMemoryCarriage(actual, record)).toBe(true)
	expect(matchesStudyMemoryCarriage([], record)).toBe(false)
	expect(matchesStudyMemoryCarriage(actual, record.replace('$12.00', '$21.00'))).toBe(false)
	expect(matchesStudyMemoryCarriage(actual, '')).toBe(false)
	const original = {
		messages: [{ role: 'user', content: 'Target' }],
		options: { num_predict: 8192 },
	}
	const digest = hashStudyBytes(JSON.stringify(original))
	expect(
		matchesStudyMemorySham(
			JSON.stringify({ ...original, messages: [{ role: 'user', content: 'Target ' }] }),
			'Target',
			digest,
		),
	).toBe(true)
	expect(
		matchesStudyMemorySham(
			JSON.stringify({ ...original, messages: [{ role: 'user', content: 'Target  ' }] }),
			'Target',
			digest,
		),
	).toBe(false)
	expect(
		matchesStudyMemorySham(
			JSON.stringify({
				...original,
				messages: [{ role: 'user', content: 'Target ' }],
				options: { num_predict: 2048 },
			}),
			'Target',
			digest,
		),
	).toBe(false)
})
