import { isRecord, parseJSON } from '@orkestrel/contract'
import { parseStudyProfile } from '@orkestrel/study'
import { readStudyDeclaration } from '@orkestrel/study/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'
import { StudyChatDriver } from '../../../studies/chat/drivers/StudyChatDriver.js'
import {
	buildMemoryCall,
	buildMemoryReply,
	createMemoryContext,
	createMemoryServer,
	STUDY_MEMORY_CALIBRATION,
	STUDY_MEMORY_MODULES,
} from '../../setupStudy.js'

it('retains the previous reply and lookup, measures first text across calls, and isolates the next conversation', async () => {
	const server = await createMemoryServer([
		...STUDY_MEMORY_CALIBRATION,
		{
			path: '/api/chat',
			body: buildMemoryReply({
				content: 'Original customer update with refund $12.50, Friday shipping and Tacoma depot.',
			}),
		},
		{ ...buildMemoryCall('lookup', { id: 'OR-7' }), chunks: [{ delay: 120, body: '' }] },
		{
			path: '/api/chat',
			body: '',
			chunks: [
				{
					delay: 40,
					body: `${JSON.stringify({ model: 'model', done: false, message: { role: 'assistant', content: 'Refund $12.50.' } })}\n`,
				},
				{ delay: 200, body: buildMemoryReply({ content: '' }) },
			],
		},
		{
			...buildMemoryCall('lookup', { id: 'OR-7' }),
			chunks: [
				{
					delay: 30,
					body: `${JSON.stringify({ model: 'model', done: false, message: { role: 'assistant', content: 'Checking OR-7.' } })}\n`,
				},
			],
		},
		{
			path: '/api/chat',
			body: buildMemoryReply({ content: '' }),
			chunks: [
				{
					delay: 250,
					body: `${JSON.stringify({ model: 'model', done: false, message: { role: 'assistant', content: 'Friendly: refund $12.50 ships Friday.' } })}\n`,
				},
			],
		},
	])
	try {
		const declared = parseStudyProfile(
			parseJSON(readFileSync('studies/chat/profiles/full.json', 'utf8')),
		)
		const profile = {
			...declared,
			record: undefined,
			provider: {
				entry: '@orkestrel/ollama',
				url: server.url,
				model: 'model',
				judge: 'judge',
				digest: { model: 'a'.repeat(64), judge: 'b'.repeat(64) },
			},
		}
		const driver = new StudyChatDriver({
			...STUDY_MEMORY_MODULES,
			directory: resolve('.'),
			profile,
		})
		const { scenarios } = await readStudyDeclaration(resolve('.'), 'chat')
		const scenario = scenarios.find((entry) => entry.id === 'script-or-7')
		const first = scenario?.goals[0]
		const second = scenario?.goals[1]
		const third = scenario?.goals[2]
		if (first === undefined || second === undefined || third === undefined)
			throw new Error('Missing script')
		const session = await driver.open(
			{ id: 'r1-s1-a1', scenario: 'script-or-7', arm: 'records', repetition: 1 },
			new AbortController().signal,
		)
		const context = createMemoryContext(profile)
		try {
			await session.execute(first, context.context)
			const started = performance.now()
			const shortened = await session.execute(second, context.context)
			const duration = (performance.now() - started) / 1000
			expect(shortened).toMatchObject({ partial: false, value: { content: 'Refund $12.50.' } })
			const timing = context.evidence.find(
				(row) => row.event === 'result' && row.goal === second.id,
			)?.value
			if (!isRecord(timing) || typeof timing.first !== 'number')
				throw new Error('Missing first content receipt')
			expect(timing.first).toBeGreaterThanOrEqual(0.15)
			expect(duration - timing.first).toBeGreaterThanOrEqual(0.15)
			await session.execute(third, context.context)
			const kept = context.evidence.find(
				(row) => row.event === 'result' && row.goal === third.id,
			)?.value
			if (!isRecord(kept) || typeof kept.first !== 'number')
				throw new Error('Missing earlier content receipt')
			expect(kept.first).toBeGreaterThanOrEqual(0.02)
			expect(kept.first).toBeLessThan(0.2)
			const requests = server.requests.filter((request) => request.path === '/api/chat')
			expect(requests.at(-1)?.body).toContain('Refund $12.50.')
			expect(
				requests.some((request) =>
					request.body.includes(
						'Order OR-7: Dana Reyes. Refund $12.50. Ships Friday from the Tacoma depot.',
					),
				),
			).toBe(true)
		} finally {
			await session.close()
			context.close()
		}
		const before = server.requests.length
		const fresh = await driver.open(
			{ id: 'r2-s1-a1', scenario: 'script-or-7', arm: 'records', repetition: 2 },
			new AbortController().signal,
		)
		const next = createMemoryContext(profile)
		try {
			await fresh.execute(first, next.context)
			expect(
				server.requests
					.slice(before)
					.every(
						(request) =>
							!request.body.includes('Original customer update') &&
							!request.body.includes('Order OR-7: Dana Reyes.'),
					),
			).toBe(true)
		} finally {
			await fresh.close()
			next.close()
		}
	} finally {
		await server.close()
	}
})

it('refuses malformed input, absent runtime and an already aborted trial', async () => {
	const profile = parseStudyProfile(
		parseJSON(readFileSync('studies/chat/profiles/full.json', 'utf8')),
	)
	expect(
		() =>
			new StudyChatDriver({ ...STUDY_MEMORY_MODULES, agent: {}, directory: resolve('.'), profile }),
	).toThrow(/admitted/)
	const driver = new StudyChatDriver({ ...STUDY_MEMORY_MODULES, directory: resolve('.'), profile })
	const controller = new AbortController()
	controller.abort(new Error('cancelled'))
	await expect(
		driver.open(
			{ id: 'r1-s1-a1', scenario: 'script-or-7', arm: 'records', repetition: 1 },
			controller.signal,
		),
	).rejects.toThrow('cancelled')
	const session = await driver.open(
		{ id: 'r1-s1-a1', scenario: 'script-or-7', arm: 'records', repetition: 1 },
		new AbortController().signal,
	)
	const context = createMemoryContext(profile)
	try {
		await expect(
			session.execute({ id: 'invalid', input: { prompt: 'bad' } }, context.context),
		).rejects.toThrow(/Malformed/)
	} finally {
		await session.close()
		context.close()
	}
})

it('keeps absent first content unknown and refuses a transport fault', async () => {
	for (const status of [200, 503]) {
		const server = await createMemoryServer([
			...STUDY_MEMORY_CALIBRATION.map((reply) => ({
				...reply,
				body: buildMemoryReply({ content: '' }),
			})),
			...[status, status].map((code) => ({
				path: '/api/chat',
				status: code,
				body: code === 200 ? buildMemoryReply({ content: '' }) : 'unavailable',
			})),
		])
		try {
			const declared = parseStudyProfile(
				parseJSON(readFileSync('studies/chat/profiles/full.json', 'utf8')),
			)
			const profile = {
				...declared,
				record: undefined,
				provider: {
					entry: '@orkestrel/ollama',
					url: server.url,
					model: 'model',
					judge: 'judge',
					digest: { model: 'a'.repeat(64), judge: 'b'.repeat(64) },
				},
			}
			const driver = new StudyChatDriver({
				...STUDY_MEMORY_MODULES,
				directory: resolve('.'),
				profile,
			})
			const context = createMemoryContext(profile)
			const session = await driver.open(
				{ id: 'r1-s1-a1', scenario: 'empty', arm: 'records', repetition: 1 },
				new AbortController().signal,
			)
			try {
				const goal = {
					id: 'turn-1',
					input: { prompt: 'Hello', system: 'Be brief.', topic: 'bookings' },
				}
				const outcome = await session.execute(goal, context.context).then(
					(product) => ({ product, fault: undefined }),
					(error: unknown) => ({ product: undefined, fault: String(error) }),
				)
				expect(outcome.fault === undefined).toBe(status === 200)
				expect(outcome.fault ?? '').toMatch(
					status === 200 ? /^$/u : /503|unavailable|provider|transport/iu,
				)
				const result = context.evidence.find((row) => row.event === 'result')?.value
				expect(result).toEqual(status === 200 ? { content: '', partial: false } : undefined)
			} finally {
				await session.close()
				context.close()
			}
		} finally {
			await server.close()
		}
	}
})
