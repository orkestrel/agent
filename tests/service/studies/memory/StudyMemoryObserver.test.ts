import type { ProviderRequest } from '@orkestrel/agent'
import { describe, expect, it } from 'vitest'
import { createBudget } from '@orkestrel/budget'
import { parseJSON, isRecord } from '@orkestrel/contract'
import { readStudyFailure, StudyError } from '@orkestrel/study'
import { createTool, createToolManager } from '@orkestrel/tool'
import {
	buildMemoryReply,
	buildMemoryStream,
	createMemoryObserver,
	createMemoryServer,
	readMemoryStream,
	STUDY_MEMORY_FIXED_PROJECTION,
	STUDY_MEMORY_FIXED_SETTINGS,
	STUDY_MEMORY_HUNG_STREAM,
	STUDY_MEMORY_MODULES,
	STUDY_MEMORY_OBSERVER_REQUEST,
	STUDY_MEMORY_PROJECTION_PASS,
	STUDY_MEMORY_PROJECTION_REFUSALS,
} from '../../../setupService.js'

const { messages, tools, options } = STUDY_MEMORY_OBSERVER_REQUEST
const gauge = STUDY_MEMORY_FIXED_SETTINGS.gauge

describe('exact-request observation over the real provider', () => {
	it.each(['generate', 'stream'] as const)(
		'%s delegates once, records at entry and retains the exact wire request and result',
		async (mode) => {
			const reply =
				mode === 'generate'
					? buildMemoryReply({ content: 'Receipt', prompt: 7 })
					: buildMemoryStream(['Re', 'ceipt'], { prompt: 7 })
			const plainServer = await createMemoryServer([{ path: '/api/chat', body: reply }])
			const watchedServer = await createMemoryServer([{ path: '/api/chat', body: reply }])
			try {
				const plain = createMemoryObserver(plainServer.url, undefined)
				const watched = createMemoryObserver(watchedServer.url, undefined)
				const signal = new AbortController().signal
				const expected =
					mode === 'generate'
						? await plain.inner.generate(messages, signal, tools, options)
						: await readMemoryStream(plain.inner.stream(messages, signal, tools, options))
				const pending =
					mode === 'generate'
						? watched.observer.generate(messages, signal, tools, options)
						: readMemoryStream(watched.observer.stream(messages, signal, tools, options))
				// The reading exists before the delegated request can have reached the wire.
				expect(watched.readings).toHaveLength(1)
				expect(watchedServer.requests.filter((entry) => entry.path === '/api/chat')).toEqual([])
				expect(await pending).toEqual(expected)
				const chats = watchedServer.requests.filter((entry) => entry.path === '/api/chat')
				expect(chats).toHaveLength(1)
				expect(chats).toEqual(plainServer.requests.filter((entry) => entry.path === '/api/chat'))
				const body = parseJSON(chats[0]?.body ?? '')
				if (!isRecord(body) || !Array.isArray(body.tools) || !Array.isArray(body.messages))
					throw new Error('Invalid chat request')
				expect(body).toMatchObject({
					model: 'model',
					think: false,
					options: { num_ctx: 32768, num_predict: 512, temperature: 0, seed: 0 },
				})
				expect(body.messages).toHaveLength(1)
				expect(JSON.stringify(body.tools)).toContain('lookup')
				expect(watched.readings).toEqual([
					{
						estimate: STUDY_MEMORY_MODULES.subject.estimateRequest({ messages, tools, options }),
						projected: undefined,
					},
				])
				expect(watched.readings[0]?.estimate).toBeGreaterThan(0)
			} finally {
				await plainServer.close()
				await watchedServer.close()
			}
		},
	)

	it('yields streamed deltas in wire order and returns the assembled result', async () => {
		const server = await createMemoryServer([
			{ path: '/api/chat', body: buildMemoryStream(['Re', 'ce', 'ipt'], { prompt: 7 }) },
		])
		try {
			const { observer } = createMemoryObserver(server.url, undefined)
			const { deltas, result } = await readMemoryStream(
				observer.stream(messages, new AbortController().signal, tools, options),
			)
			expect(deltas).toEqual([
				{ channel: 'content', text: 'Re' },
				{ channel: 'content', text: 'ce' },
				{ channel: 'content', text: 'ipt' },
			])
			expect(result.content).toBe('Receipt')
			expect(result.usage?.prompt).toBe(7)
		} finally {
			await server.close()
		}
	})

	it('measures the request without a tools or options member exactly as it was received', async () => {
		const server = await createMemoryServer()
		try {
			const { observer, readings } = createMemoryObserver(server.url, undefined)
			const signal = new AbortController().signal
			await observer.generate(messages, signal)
			await observer.generate(messages, signal, [], undefined)
			await observer.generate(messages, signal, tools, options)
			const { estimateRequest } = STUDY_MEMORY_MODULES.subject
			expect(readings.map((reading) => reading.estimate)).toEqual([
				estimateRequest({ messages }),
				estimateRequest({ messages, tools: [] }),
				estimateRequest({ messages, tools, options }),
			])
			expect(readings[2]?.estimate ?? 0).toBeGreaterThan(readings[0]?.estimate ?? 0)
		} finally {
			await server.close()
		}
	})

	it('hands the recorder the exact pre-encoding request, keeping omitted members omitted', async () => {
		const server = await createMemoryServer()
		try {
			const { observer, readings, requests } = createMemoryObserver(server.url, undefined)
			const signal = new AbortController().signal
			const schema = { type: 'object', properties: { count: { type: 'number' } } }
			await observer.generate(messages, signal)
			await observer.generate(messages, signal, tools, { think: false, schema })
			await observer.generate(messages, signal, [], undefined)
			expect(requests).toHaveLength(3)
			expect(readings).toHaveLength(3)
			const [bare, full, empty] = requests
			expect(bare).toEqual({ messages })
			expect(Object.keys(bare ?? {})).toEqual(['messages'])
			expect(bare?.messages).toBe(messages)
			expect(full).toEqual({ messages, tools, options: { think: false, schema } })
			expect(Object.keys(empty ?? {})).toEqual(['messages', 'tools'])
			// Every reading is the estimate of the request handed over beside it, tools and schema included.
			const { estimateRequest, measureRequest } = STUDY_MEMORY_MODULES.subject
			expect(readings.map((reading) => reading.estimate)).toEqual(
				requests.map((request) => estimateRequest(request)),
			)
			const parts = measureRequest(full ?? { messages })
			expect(parts.tools).toBeGreaterThan(0)
			expect(parts.schema).toBeGreaterThan(0)
			expect(measureRequest(bare ?? { messages })).toMatchObject({ tools: 0, schema: 0 })
		} finally {
			await server.close()
		}
	})

	it('prices the estimate by the explicit gauge', async () => {
		const server = await createMemoryServer()
		try {
			const { observer, readings } = createMemoryObserver(server.url, { scale: 2, overhead: 5 })
			await observer.generate(messages, new AbortController().signal, tools, options)
			const [reading] = readings
			if (reading === undefined) throw new Error('Missing reading')
			expect(reading.projected).toBe(Math.ceil(2 * reading.estimate + 5))
			expect(reading.projected).toBeGreaterThan(reading.estimate)
		} finally {
			await server.close()
		}
	})

	it.each(['generate', 'stream'] as const)(
		'%s passes a prompt equal to the projection after a successful return',
		async (mode) => {
			const { name, reply } = STUDY_MEMORY_PROJECTION_PASS
			const body =
				mode === 'generate' ? buildMemoryReply(reply) : buildMemoryStream(['Re', 'ceipt'], reply)
			const server = await createMemoryServer([{ path: '/api/chat', body }])
			try {
				const { observer, readings } = createMemoryObserver(server.url, gauge)
				const signal = new AbortController().signal
				const returned = await (mode === 'generate'
					? observer.generate(messages, signal, tools, options)
					: readMemoryStream(observer.stream(messages, signal, tools, options)))
				expect([name, returned]).toEqual([name, expect.anything()])
				expect(server.requests.filter((entry) => entry.path === '/api/chat')).toHaveLength(1)
				expect(readings.map((reading) => reading.projected)).toEqual([
					STUDY_MEMORY_FIXED_PROJECTION,
				])
			} finally {
				await server.close()
			}
		},
	)

	it.each(['generate', 'stream'] as const)(
		'%s refuses every unusable or over-projection return with the exact attributable error',
		async (mode) => {
			for (const entry of STUDY_MEMORY_PROJECTION_REFUSALS) {
				const body =
					mode === 'generate'
						? buildMemoryReply(entry.reply)
						: buildMemoryStream(['Re', 'ceipt'], entry.reply)
				const server = await createMemoryServer([{ path: '/api/chat', body }])
				try {
					const { observer, readings } = createMemoryObserver(server.url, gauge)
					const signal = new AbortController().signal
					let outcome: unknown
					try {
						await (mode === 'generate'
							? observer.generate(messages, signal, tools, options)
							: readMemoryStream(observer.stream(messages, signal, tools, options)))
					} catch (error) {
						outcome = error
					}
					expect([entry.name, outcome]).toEqual([entry.name, expect.any(StudyError)])
					expect([entry.name, outcome]).toMatchObject([entry.name, { code: entry.code }])
					expect([entry.name, readStudyFailure(outcome)]).toEqual([entry.name, entry.failure])
					expect(server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(1)
					expect(readings.map((reading) => reading.projected)).toEqual([
						STUDY_MEMORY_FIXED_PROJECTION,
					])
				} finally {
					await server.close()
				}
			}
		},
	)

	it.each(['generate', 'stream'] as const)(
		'%s applies no projection without a gauge',
		async (mode) => {
			for (const reply of [{ prompt: 5000 }, { unknown: true }, { prompt: 0 }]) {
				const body =
					mode === 'generate' ? buildMemoryReply(reply) : buildMemoryStream(['Re', 'ceipt'], reply)
				const server = await createMemoryServer([{ path: '/api/chat', body }])
				try {
					const { observer, readings } = createMemoryObserver(server.url, undefined)
					const signal = new AbortController().signal
					await (mode === 'generate'
						? observer.generate(messages, signal, tools, options)
						: readMemoryStream(observer.stream(messages, signal, tools, options)))
					expect(readings.map((reading) => reading.projected)).toEqual([undefined])
				} finally {
					await server.close()
				}
			}
		},
	)

	it.each([
		['an ungauged', undefined],
		['a gauged', gauge],
	])(
		'preserves the real provider abort through %s observer and takes no projection decision',
		async (_name, limit) => {
			const server = await createMemoryServer([STUDY_MEMORY_HUNG_STREAM, STUDY_MEMORY_HUNG_STREAM])
			try {
				const outcomes: unknown[] = []
				const watched = createMemoryObserver(server.url, limit)
				const targets = [watched.inner, watched.observer]
				for (const target of targets) {
					const controller = new AbortController()
					const stream = target.stream(messages, controller.signal, tools, options)
					const first = await stream.next()
					expect(first).toEqual({ done: false, value: { channel: 'content', text: 'par' } })
					controller.abort()
					outcomes.push(
						await stream.next().then(
							() => undefined,
							(error: unknown) => error,
						),
					)
				}
				// Only the observer's call produces a reading: it was taken at entry, once, before any delta.
				expect(watched.readings).toHaveLength(1)
				expect(outcomes).toHaveLength(2)
				for (const outcome of outcomes) {
					expect(outcome).toMatchObject({ code: 'ABORT', partial: { content: 'par' } })
					expect(outcome).not.toBeInstanceOf(StudyError)
				}
			} finally {
				await server.close()
			}
		},
	)

	it('records the single reading when the observed stream is created, before any delta is read', async () => {
		const server = await createMemoryServer([STUDY_MEMORY_HUNG_STREAM])
		try {
			const { observer, readings } = createMemoryObserver(server.url, gauge)
			const controller = new AbortController()
			const stream = observer.stream(messages, controller.signal, tools, options)
			expect(readings).toHaveLength(1)
			await stream.next()
			controller.abort()
			await stream.next().then(
				() => undefined,
				() => undefined,
			)
			expect(readings).toHaveLength(1)
		} finally {
			await server.close()
		}
	})

	it('forwards identity and the declared replay policy, reporting none when the real provider reports none', async () => {
		const server = await createMemoryServer()
		try {
			const fallback = createMemoryObserver(server.url, undefined)
			expect(fallback.observer.id).toBe(fallback.inner.id)
			expect(fallback.observer.name).toBe(fallback.inner.name)
			expect(fallback.observer.name).toBe('ollama')
			expect(fallback.observer.replay).toBe(fallback.inner.replay ?? 'none')
			expect(fallback.observer.replay).toBe('none')
			expect(createMemoryObserver(server.url, undefined, 'all').observer.replay).toBe('all')
			expect(createMemoryObserver(server.url, undefined, 'turn').observer.replay).toBe('turn')
		} finally {
			await server.close()
		}
	})

	it('measures the same complete request the Agent window measures', async () => {
		const server = await createMemoryServer([
			{ path: '/api/chat', body: buildMemoryStream(['Receipt retained.'], { prompt: 7 }) },
		])
		const { subject } = STUDY_MEMORY_MODULES
		const manager = subject.createConversationManager()
		const conversation = manager.add({})
		try {
			const { observer, readings } = createMemoryObserver(server.url, undefined)
			const measured: number[] = []
			const agent = new subject.Agent(observer, {
				conversations: manager,
				strict: true,
				limit: 8,
				window: createBudget<ProviderRequest>({
					max: 30000,
					consumer: (request) => {
						const value = subject.estimateRequest(request)
						measured.push(value)
						return value
					},
				}),
			})
			agent.context.instructions.add({ name: 'desk', content: 'You operate a support desk.' })
			conversation.add({ role: 'user', content: 'Count the orders' })
			try {
				const result = await agent.generate({ signal: new AbortController().signal })
				expect(result.content).toBe('Receipt retained.')
				expect(readings).toHaveLength(1)
				expect(measured.length).toBeGreaterThan(0)
				expect(new Set(measured)).toEqual(new Set([readings[0]?.estimate]))
				expect(server.requests.filter((entry) => entry.path === '/api/chat')).toHaveLength(1)
			} finally {
				agent.emitter.destroy()
			}
		} finally {
			conversation.emitter.destroy()
			await server.close()
		}
	})

	it('stops the Agent before another request when a tool turn exceeds the projection', async () => {
		const server = await createMemoryServer([
			{
				path: '/api/chat',
				body: buildMemoryReply({
					content: '',
					calls: [{ function: { name: 'lookup', arguments: { id: 'order-1' } } }],
					prompt: STUDY_MEMORY_FIXED_PROJECTION + 1,
				}),
			},
			{ path: '/api/chat', body: buildMemoryReply({ content: 'Never reached' }) },
		])
		const { subject } = STUDY_MEMORY_MODULES
		const manager = subject.createConversationManager()
		const conversation = manager.add({})
		const toolbox = createToolManager()
		toolbox.add(
			createTool({
				name: 'lookup',
				description: 'Reads a record',
				parameters: {
					type: 'object',
					properties: { id: { type: 'string' } },
					required: ['id'],
					additionalProperties: false,
				},
				execute: () => 'No record',
			}),
		)
		try {
			const { observer, readings } = createMemoryObserver(server.url, gauge)
			const agent = new subject.Agent(observer, {
				conversations: manager,
				tools: toolbox,
				strict: true,
				limit: 8,
			})
			conversation.add({ role: 'user', content: 'Look up order-1' })
			try {
				await expect(
					agent.generate({ signal: new AbortController().signal }),
				).rejects.toMatchObject({
					code: 'CAPACITY',
					failure: { cause: 'capacity', role: 'agent' },
				})
				expect(server.requests.filter((entry) => entry.path === '/api/chat')).toHaveLength(1)
				expect(server.responses).toHaveLength(1)
				expect(readings).toHaveLength(1)
			} finally {
				agent.emitter.destroy()
			}
		} finally {
			toolbox.destroy()
			conversation.emitter.destroy()
			await server.close()
		}
	})
})
