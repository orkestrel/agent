import type { AgentEventName } from '../../../setup.js'
import type { TokenUsage } from '@orkestrel/budget'
import type { ProviderResult } from '@src/core'
import type { ToolCall } from '@orkestrel/tool'
import type {
	AgentEventMap,
	AgentResult,
	AgentStreamInterface,
	ConversationEventMap,
	Message,
	ProviderIncrement,
	Selection,
} from '@src/core'
import {
	createInterleavedThinkingProvider,
	createPacedProvider,
	AGENT_USAGE,
	AGENT_SCRIPT_OPTIONS,
	AGENT_DEADLINE,
	AGENT_EVENTS,
	computeUsageTotal,
	createEchoProvider,
	COMPACT_SCRIPT,
	seedCompactionAgent,
	createAnswerProvider,
	requestConversation,
	createGatedProvider,
	createAbortingGatedProvider,
	createThrowingProvider,
	createConversationEchoProvider,
	createAbortingResultProvider,
	createIndependentGatedProvider,
	createSharedGatedProvider,
	createSecondTurnFailureProvider,
	createFailingScheduler,
} from '../../../setup.js'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createScheduler } from '@orkestrel/workflow'
import { parseJSONAs } from '@orkestrel/contract'
import { createBudget, createTokenBudget } from '@orkestrel/budget'
import { createTool, createToolManager } from '@orkestrel/tool'
import {
	CONVERSATION_RECAP_PREFIX,
	createAgent,
	createAuthority,
	createConversationManager,
	createScope,
	estimateMessages,
	isAgentError,
	isProviderAbortError,
	ProviderAbortError,
	providerRequestContract,
	Scope,
} from '@src/core'
import {
	abandonSelection,
	createAddTool,
	AUTHORITY_STATES,
	createRecordingScheduler,
	createRecordingSelection,
	createScriptedProvider,
	createSeededToolManager,
	createStubSummarizer,
	createToolCall,
	createLoopTool,
	RECORDED_REQUEST,
	rejectSelection,
	type ScriptedTurn,
	seedFramedAgent,
	SELECTION_FAULT_CASES,
	SELECTION_USAGE,
	RecordedTransport,
	ScriptedWire,
} from '../../../setup.js'
import {
	collect,
	createRecorder,
	createRecorders,
	requireValue,
	waitForAbort,
	waitForCondition,
	waitForDelay,
} from '@orkestrel/test'

// Exercises agent orchestration through scripted provider responses and real managers.

it('commits a partial agent result when final usage aborts the caller', async () => {
	const provider = createScriptedProvider(
		[{ content: 'Done.', usage: { prompt: 10, completion: 2, total: 12 } }],
		{ recorded: true, repeat: false },
	)
	const controller = new AbortController()
	const agent = createAgent(provider, { signal: controller.signal })
	agent.context.messages.add({ role: 'user', content: 'Finish the request.' })
	agent.emitter.on('usage', () => controller.abort())
	const result = await agent.generate()
	expect(result.partial).toBe(true)
	expect(result.content).toBe('Done.')
	expect(result.usage).toEqual({ prompt: 10, completion: 2, total: 12 })
	expect(provider.calls).toHaveLength(1)
})

// This file's uniform options for the shared scripted provider: every loop test records the
// messages / tools each call saw (asserted through `provider.calls`) and treats over-running the
// script as a loud failure (`repeat: false`) rather than the default silent last-turn
// repeat — so a loop that had to stop (a cap / budget / cancel) but didn't is caught.

// The real per-turn deadline every timeout test arms, in milliseconds. Real host timers
// throughout — no test here replaces the clock — so the period is short enough that a test can
// wait several of them out and the timeout tests together still cost a fraction of a second.

describe('Agent — thinking replay', () => {
	it('resolves replay at construction for every call and context estimate', async () => {
		let reads = 0
		const provider = createScriptedProvider(
			[
				{ content: '', thinking: 'first', tools: [createToolCall()] },
				{ content: 'done', thinking: 'last' },
			],
			{ recorded: true },
		)
		const conversations = createConversationManager({ summarize: createStubSummarizer().summarize })
		conversations.add()
		const tools = createToolManager()
		tools.add(createAddTool())
		const agent = createAgent(
			{
				id: provider.id,
				name: provider.name,
				get replay(): 'none' {
					reads += 1
					return 'none'
				},
				generate: provider.generate.bind(provider),
				stream: provider.stream.bind(provider),
			},
			{
				tools,
				conversations,
				window: createBudget<readonly Message[]>({ max: 10000, consumer: estimateMessages }),
			},
		)
		expect(reads).toBe(1)
		agent.context.messages.add({ role: 'user', content: 'go' })
		await agent.generate()
		expect(provider.calls).toHaveLength(2)
		expect(reads).toBe(1)
	})

	it('defaults an absent provider policy to none and omits empty thinking on both assistant paths', async () => {
		const provider = createScriptedProvider(
			[
				{ content: '', thinking: 'first thoughts', tools: [createToolCall()] },
				{ content: '', thinking: '', tools: [createToolCall({ id: 'second' })] },
				{ content: 'done', thinking: '' },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const tools = createToolManager()
		tools.add(createAddTool())
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'go' })
		expect(provider.replay).toBeUndefined()
		await agent.generate()
		expect(provider.calls).toHaveLength(3)
		expect(
			provider.calls
				.flatMap((call) => call.messages)
				.some((message) => Object.hasOwn(message, 'thinking')),
		).toBe(false)
		const assistants = agent.context.messages
			.messages()
			.filter((message) => message.role === 'assistant')
		expect(assistants.map((message) => Object.hasOwn(message, 'thinking'))).toEqual([
			true,
			false,
			false,
		])
	})

	it('stores each call thinking and applies every replay policy within and across user turns', async () => {
		for (const replay of [undefined, 'none', 'turn', 'all'] as const) {
			const responses = ['tool', 'answer', 'empty']
			const transport = new RecordedTransport(() => new Response(requireValue(responses.shift())))
			const provider = new ScriptedWire({
				url: 'https://provider.test',
				fetch: transport.fetch,
				...(replay === undefined ? {} : { replay }),
				records: new Map<string, ProviderIncrement>([
					['tool', { content: '', thinking: 'first thoughts', tools: [createToolCall()] }],
					['answer', { content: 'done', thinking: 'final thoughts', tools: [] }],
					[
						'empty',
						{ content: '', thinking: '', tools: [], result: { content: 'later', thinking: '' } },
					],
				]),
			})
			const tools = createToolManager()
			tools.add(createAddTool())
			const agent = createAgent(provider, { tools })
			agent.context.messages.add({ role: 'user', content: 'go' })
			expect(await agent.generate()).toMatchObject({ content: 'done', partial: false })
			agent.context.messages.add({ role: 'user', content: 'again' })
			expect(await agent.generate()).toMatchObject({ content: 'later', partial: false })
			const assistants = agent.context.messages
				.messages()
				.filter((message) => message.role === 'assistant')
			expect(assistants.map((message) => message.thinking)).toEqual([
				'first thoughts',
				'final thoughts',
				undefined,
			])
			expect(requireValue(assistants[0]).calls).toEqual([createToolCall()])
			expect(Object.hasOwn(requireValue(assistants[2]), 'thinking')).toBe(false)
			expect(transport.requests).toHaveLength(3)
			const opening = requireValue(
				parseJSONAs(await requireValue(transport.requests[0]).text(), providerRequestContract.is),
			)
			const followup = requireValue(
				parseJSONAs(await requireValue(transport.requests[1]).text(), providerRequestContract.is),
			)
			const later = requireValue(
				parseJSONAs(await requireValue(transport.requests[2]).text(), providerRequestContract.is),
			)
			expect(opening.messages.some((message) => Object.hasOwn(message, 'thinking'))).toBe(false)
			expect(
				followup.messages
					.filter((message) => Object.hasOwn(message, 'thinking'))
					.map((message) => message.thinking),
			).toEqual(replay === 'turn' || replay === 'all' ? ['first thoughts'] : [])
			expect(
				later.messages
					.filter((message) => Object.hasOwn(message, 'thinking'))
					.map((message) => message.thinking),
			).toEqual(replay === 'all' ? ['first thoughts', 'final thoughts'] : [])
		}
	})

	it('keeps request bytes equal with and without result thinking for none and absent replay', async () => {
		for (const replay of [undefined, 'none'] as const) {
			const bodies: string[][] = []
			for (const thinking of [undefined, 'private reasoning']) {
				const responses = ['tool', 'answer']
				const transport = new RecordedTransport(() => new Response(requireValue(responses.shift())))
				const provider = new ScriptedWire({
					url: 'https://provider.test',
					fetch: transport.fetch,
					...(replay === undefined ? {} : { replay }),
					records: new Map<string, ProviderIncrement>([
						[
							'tool',
							{
								content: '',
								thinking: '',
								tools: [],
								result: {
									content: '',
									tools: [createToolCall()],
									...(thinking === undefined ? {} : { thinking }),
								},
							},
						],
						[
							'answer',
							{
								content: '',
								thinking: '',
								tools: [],
								result: { content: 'done', ...(thinking === undefined ? {} : { thinking }) },
							},
						],
					]),
				})
				const tools = createToolManager()
				tools.add(createAddTool())
				const agent = createAgent(provider, { tools })
				agent.context.messages.add({ role: 'user', content: 'go' })
				await agent.generate()
				expect(transport.requests).toHaveLength(2)
				const sent: string[] = []
				for (const request of transport.requests) {
					const body = await request.text()
					expect(body).not.toContain('"thinking"')
					const parsed = requireValue(parseJSONAs(body, providerRequestContract.is))
					// Independent conversations mint UUIDs; align only those identities before comparing bytes.
					let aligned = body
					for (const [index, message] of parsed.messages.entries()) {
						aligned = aligned.replaceAll(message.id, `message-${index}`)
					}
					sent.push(aligned)
				}
				bodies.push(sent)
			}
			expect(bodies[1]).toEqual(bodies[0])
		}
	})

	it('estimates replayed thinking at run entry and between tool calls before compacting', async () => {
		for (const replay of ['none', 'all'] as const) {
			const conversations = createConversationManager({
				summarize: createStubSummarizer().summarize,
				keep: 0,
			})
			const conversation = conversations.add()
			conversation.add([
				{ role: 'user', content: 'earlier' },
				{ role: 'assistant', content: 'reply', thinking: 'h'.repeat(8000) },
				{ role: 'user', content: 'go' },
			])
			const window = createBudget<readonly Message[]>({ max: 100, consumer: estimateMessages })
			expect(estimateMessages(conversation.view())).toBeGreaterThan(window.max)
			const responses = ['tool', 'answer']
			const transport = new RecordedTransport(() => new Response(requireValue(responses.shift())))
			const provider = new ScriptedWire({
				url: 'https://provider.test',
				fetch: transport.fetch,
				replay,
				records: new Map<string, ProviderIncrement>([
					['tool', { content: '', thinking: 't'.repeat(8000), tools: [createToolCall()] }],
					['answer', { content: 'done', thinking: '', tools: [] }],
				]),
			})
			const tools = createToolManager()
			tools.add(createAddTool())
			const agent = createAgent(provider, { tools, conversations, window })
			expect(await agent.generate()).toMatchObject({ content: 'done', partial: false })
			expect(conversation.sections).toHaveLength(replay === 'none' ? 0 : 1)
			// These charges independently include framing, tool-call JSON, and permitted thinking.
			expect(window.consumed).toBe(replay === 'none' ? 37 : 2039)
			expect(window.exhausted).toBe(replay === 'all')
		}
	})
})

describe('Agent — single turn', () => {
	it('generate returns the content of a no-tools turn', async () => {
		const provider = createScriptedProvider(
			[{ result: { content: 'hello', usage: AGENT_USAGE } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate()
		expect(result.content).toBe('hello')
		expect(result.partial).toBe(false)
		expect(result.usage).toEqual(AGENT_USAGE)
	})

	it('joins provider thinking onto the result; omitted when no call surfaced any (H4)', async () => {
		// A tool round whose turn carries separated reasoning, then a final turn with its
		// own — the loop JOINS them (blank-line separated) onto AgentResult.thinking, while
		// message content stays separate from the stored thinking.
		const tools = createToolManager()
		tools.add(createTool({ name: 'noop', execute: () => 'ok' }))
		const provider = createScriptedProvider(
			[
				{
					content: '',
					thinking: 'first thoughts',
					tools: [{ id: 'c1', name: 'noop', arguments: {} }],
				},
				{ content: 'done', thinking: 'final thoughts' },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate()
		expect(result.content).toBe('done')
		expect(result.thinking).toBe('first thoughts\n\nfinal thoughts')
		// Reasoning stays out of message content.
		expect(
			agent.context.messages.messages().some((message) => message.content.includes('thoughts')),
		).toBe(false)
		// And a run with NO thinking omits the optional entirely.
		const plain = createScriptedProvider([{ content: 'plain' }], AGENT_SCRIPT_OPTIONS)
		const second = createAgent(plain)
		second.context.messages.add({ role: 'user', content: 'hi' })
		const settled = await second.generate()
		expect('thinking' in settled).toBe(false)
	})

	it('surfaces streamed thinking deltas as think chunks without adding them to content', async () => {
		const provider = createInterleavedThinkingProvider()
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		const events = await collect(stream.events)
		const result = await stream.result
		expect(events).toEqual([
			{ category: 'think', content: 'plan ' },
			{ category: 'token', content: 'answer' },
			{ category: 'think', content: 'check' },
		])
		expect(result.content).toBe('answer')
		expect(result.thinking).toBe('plan check')
	})

	it('forwards the per-run think option to the provider stream', async () => {
		const provider = createScriptedProvider([{ content: 'done' }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		await agent.generate({ think: false })
		expect(provider.calls[0]?.options).toEqual({ think: false })
	})

	it('prepends the system prompt and advertises tools structurally', async () => {
		const tools = createToolManager()
		tools.add(createTool({ name: 'noop', execute: () => null }))
		const provider = createScriptedProvider([{ result: { content: 'done' } }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, { system: 'be brief', tools })
		agent.context.messages.add({ role: 'user', content: 'hi' })
		await agent.generate()
		const [first] = provider.calls
		expect(first?.messages[0]).toMatchObject({ role: 'system', content: 'be brief' })
		expect(first?.messages.at(-1)).toMatchObject({ role: 'user', content: 'hi' })
		// Tools reach the provider through definitions(), never serialized into messages.
		expect(first?.tools).toEqual([{ name: 'noop' }])
		expect(first?.messages.some((m) => m.content.includes('noop'))).toBe(false)
	})
})

describe('Agent — the provider request matches the recorded request', () => {
	it('sends the recorded messages for a framed, scoped, workspace-backed conversation', async () => {
		// RECORDED_REQUEST is a recorded value, never derived from the source under test, so a change
		// to context assembly that moves one prompt byte fails here. The minted message ids differ on
		// every run, so they are checked for presence and compared no further.
		const provider = createScriptedProvider([{ result: { content: 'done' } }], AGENT_SCRIPT_OPTIONS)
		await seedFramedAgent(provider).generate()

		const sent = requireValue(provider.calls[0]).messages
		expect(sent.every((message) => message.id.length > 0)).toBe(true)
		const bodies = sent.map(({ id, ...body }) => body)
		expect(bodies).toStrictEqual(RECORDED_REQUEST)
		expect(JSON.stringify(bodies)).toBe(JSON.stringify(RECORDED_REQUEST))
	})
})

describe('Agent — scope filters the advertised tool definitions', () => {
	it('advertises ALL tools when the context has no scope', async () => {
		const tools = createToolManager()
		tools.add([
			createTool({ name: 'alpha', execute: () => 1 }),
			createTool({ name: 'beta', execute: () => 2 }),
		])
		const provider = createScriptedProvider([{ result: { content: 'done' } }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'hi' })

		await agent.generate()

		expect(provider.calls[0]?.tools?.map((definition) => definition.name)).toEqual([
			'alpha',
			'beta',
		])
	})

	it('advertises ONLY the scoped-in tools — a scoped-out tool is never described', async () => {
		const tools = createToolManager()
		tools.add([
			createTool({ name: 'alpha', execute: () => 1 }),
			createTool({ name: 'beta', execute: () => 2 }),
		])
		const provider = createScriptedProvider([{ result: { content: 'done' } }], AGENT_SCRIPT_OPTIONS)
		// Only `alpha` is in scope; `beta` is scoped out.
		const agent = createAgent(provider, {
			tools,
			scope: new Scope({ name: 'alpha-only', tools: ['alpha'] }),
		})
		agent.context.messages.add({ role: 'user', content: 'hi' })

		await agent.generate()

		const advertised = provider.calls[0]?.tools?.map((definition) => definition.name)
		expect(advertised).toEqual(['alpha'])
		expect(advertised).not.toContain('beta')
	})

	it('advertises NO tools (undefined) when the scope is an empty tool list', async () => {
		const tools = createToolManager()
		tools.add(createTool({ name: 'alpha', execute: () => 1 }))
		const provider = createScriptedProvider([{ result: { content: 'done' } }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, {
			tools,
			scope: new Scope({ name: 'no-tools', tools: [] }),
		})
		agent.context.messages.add({ role: 'user', content: 'hi' })

		await agent.generate()

		// No tool passes the empty allow-list → the provider is handed `undefined`.
		expect(provider.calls[0]?.tools).toBeUndefined()
	})

	it('dispatches the admitted call and denies a scoped-out call in the same reply', async () => {
		const ran: string[] = []
		const tools = createToolManager()
		tools.add([
			createTool({
				name: 'safe',
				execute: () => {
					ran.push('safe')
					return 'ok'
				},
			}),
			createTool({
				name: 'secret',
				execute: () => {
					ran.push('secret')
					return 'leaked'
				},
			}),
		])
		const denied = createRecorder<AgentEventMap['deny']>()
		const calls = [createToolCall({ name: 'secret' }), createToolCall({ name: 'safe' })]
		const provider = createScriptedProvider(
			[{ result: { content: '', tools: calls } }, { result: { content: 'final' } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, {
			tools,
			scope: new Scope({ name: 'safe-only', tools: ['safe'] }),
			on: { deny: denied.handler },
		})
		agent.context.messages.add({ role: 'user', content: 'go' })

		const run = agent.stream()
		const chunks = await collect(run.events)
		expect(await run.result).toEqual({ content: 'final', partial: false })

		// The model was only ever told about `safe` on every turn.
		for (const call of provider.calls) {
			expect(call.tools?.map((definition) => definition.name)).toEqual(['safe'])
		}
		expect(ran).toEqual(['safe'])
		expect(denied.calls).toEqual([[calls[0], 'secret is not in the active scope']])
		expect(chunks.filter((chunk) => chunk.category === 'tool')).toEqual([
			{
				category: 'tool',
				call: calls[0],
				result: {
					success: false,
					id: 'c1',
					name: 'secret',
					error: 'denied: secret is not in the active scope',
				},
			},
			{
				category: 'tool',
				call: calls[1],
				result: { success: true, id: 'c1', name: 'safe', value: 'ok' },
			},
		])
		expect(
			provider.calls[1]?.messages
				.filter((message) => message.role === 'tool')
				.map((message) => message.content),
		).toEqual(['denied: secret is not in the active scope', 'ok'])
		expect(
			provider.calls[1]?.messages
				.filter((message) => message.role === 'tool')
				.map((message) => message.call),
		).toEqual(calls.map((call) => call.id))
	})

	it.each([
		new Scope({ name: 'empty', tools: [] }),
		new Scope({ name: 'missing', tools: ['missing'] }),
		undefined,
	])('ends a reply without calls when no tool is advertised (%j)', async (scope) => {
		const executed = createRecorder<[]>()
		const evaluated = createRecorder<[call: ToolCall]>()
		const denied = createRecorder<AgentEventMap['deny']>()
		const exhausted = createRecorder<AgentEventMap['exhaust']>()
		const tools = createToolManager()
		if (scope !== undefined) tools.add(createTool({ name: 'save', execute: executed.handler }))
		const calls = [
			createToolCall({ id: 'save-1', name: 'save' }),
			createToolCall({ id: 'save-2', name: 'save' }),
		]
		const provider = createScriptedProvider(
			[{ content: 'answer', tools: calls }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, {
			tools,
			limit: 1,
			...(scope === undefined ? {} : { scope }),
			authority: {
				evaluate: ({ call }) => {
					evaluated.handler(call)
					return { allowed: true, zone: 'test' }
				},
			},
			on: { deny: denied.handler, exhaust: exhausted.handler },
		})
		const run = agent.stream()
		const chunks = await collect(run.events)
		expect(await run.result).toEqual({ content: 'answer', partial: false })
		expect(provider.calls).toHaveLength(1)
		expect(provider.calls[0]?.tools).toBeUndefined()
		expect(executed.count).toBe(0)
		expect(evaluated.count).toBe(0)
		expect(exhausted.count).toBe(0)
		expect(denied.calls).toEqual(
			calls.map((call) => [call, 'no tool is advertised in the active scope']),
		)
		expect(chunks.filter((chunk) => chunk.category === 'tool')).toEqual([])
		expect(agent.context.messages.messages()).toEqual([
			expect.objectContaining({ role: 'assistant', content: 'answer' }),
		])
		expect(agent.context.messages.messages()[0]).not.toHaveProperty('calls')
	})

	it('dispatches every registered requested tool with an undefined scope', async () => {
		const executed = createRecorder<[name: string]>()
		const denied = createRecorder<AgentEventMap['deny']>()
		const tools = createToolManager()
		tools.add(
			['alpha', 'beta'].map((name) =>
				createTool({
					name,
					execute: () => {
						executed.handler(name)
						return name
					},
				}),
			),
		)
		const provider = createScriptedProvider(
			[
				{
					content: '',
					tools: [
						createToolCall({ name: 'alpha', id: 'a' }),
						createToolCall({ name: 'beta', id: 'b' }),
					],
				},
				{ content: 'done' },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, on: { deny: denied.handler } })
		expect(await agent.generate()).toEqual({ content: 'done', partial: false })
		expect(executed.calls).toEqual([['alpha'], ['beta']])
		expect(denied.count).toBe(0)
	})

	it('keeps duplicate-id results, tool events, and tool messages in call order without scope or authority', async () => {
		const tools = createToolManager()
		tools.add([
			createTool({ name: 'alpha', execute: () => 'alpha result' }),
			createTool({ name: 'beta', execute: () => 'beta result' }),
		])
		const calls = [createToolCall({ name: 'alpha' }), createToolCall({ name: 'beta' })]
		const provider = createScriptedProvider(
			[{ content: '', tools: calls }, { content: 'done' }],
			AGENT_SCRIPT_OPTIONS,
		)
		const events = createRecorder<AgentEventMap['tool']>()
		const agent = createAgent(provider, { tools, on: { tool: events.handler } })
		const run = agent.stream()
		const chunks = await collect(run.events)
		expect(await run.result).toEqual({ content: 'done', partial: false })
		expect(calls[0]?.id).toBe(calls[1]?.id)
		const results = [
			{ success: true, id: 'c1', name: 'alpha', value: 'alpha result' },
			{ success: true, id: 'c1', name: 'beta', value: 'beta result' },
		]
		expect(
			chunks.filter((chunk) => chunk.category === 'tool').map((chunk) => chunk.result),
		).toEqual(results)
		expect(events.calls).toEqual([
			[calls[0], results[0]],
			[calls[1], results[1]],
		])
		expect(
			provider.calls[1]?.messages
				.filter((message) => message.role === 'tool')
				.map((message) => message.content),
		).toEqual(['alpha result', 'beta result'])
		expect(
			provider.calls[1]?.messages
				.filter((message) => message.role === 'tool')
				.map((message) => message.call),
		).toEqual(['c1', 'c1'])
	})

	it.each([
		undefined,
		new Scope({ name: 'unrestricted' }),
		new Scope({ name: 'listed', tools: ['alpha', 'missing'] }),
	])('sends an admitted unknown name through authority to the registry (%#)', async (scope) => {
		const tools = createToolManager()
		tools.add(createTool({ name: 'alpha', execute: () => 'alpha' }))
		const call = createToolCall({ name: 'missing' })
		const evaluated = createRecorder<[call: ToolCall]>()
		const denied = createRecorder<AgentEventMap['deny']>()
		const provider = createScriptedProvider(
			[{ content: '', tools: [call] }, { content: 'done' }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, {
			tools,
			...(scope === undefined ? {} : { scope }),
			authority: createAuthority({
				rules: [
					{
						zone: 'test',
						match: ({ call: requested }) => {
							evaluated.handler(requested)
							return true
						},
					},
				],
			}),
			on: { deny: denied.handler },
		})
		expect(await agent.generate()).toEqual({ content: 'done', partial: false })
		expect(evaluated.calls).toEqual([[call]])
		expect(denied.count).toBe(0)
		expect(provider.calls[0]?.tools?.map((tool) => tool.name)).toEqual(['alpha'])
		expect(
			provider.calls[1]?.messages
				.filter((message) => message.role === 'tool')
				.map((message) => message.content),
		).toEqual(['tool not found: missing'])
	})

	it('snapshots the scope before a usage listener narrows it for the next turn', async () => {
		const executed = createRecorder<[]>()
		const denied = createRecorder<AgentEventMap['deny']>()
		const tools = createToolManager()
		const calls = [createToolCall({ id: 'save', name: 'save' })]
		const provider = createScriptedProvider(
			[
				{ content: '', tools: calls, usage: AGENT_USAGE },
				{ content: 'answer', tools: [createToolCall({ id: 'dropped', name: 'save' })] },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, {
			tools,
			limit: 2,
			scope: new Scope({ name: 'save', tools: ['save'] }),
			on: { deny: denied.handler },
		})
		agent.emitter.on('usage', () => agent.context.apply(new Scope({ name: 'answer', tools: [] })))
		tools.add([
			createTool({
				name: 'save',
				execute: () => {
					expect(agent.context.scope?.tools).toEqual([])
					executed.handler()
					return 'saved'
				},
			}),
		])
		expect(await agent.generate()).toEqual({
			content: 'answer',
			partial: false,
			usage: AGENT_USAGE,
		})
		expect(executed.count).toBe(1)
		expect(provider.calls[0]?.tools?.map((tool) => tool.name)).toEqual(['save'])
		expect(provider.calls[1]?.tools).toBeUndefined()
		expect(denied.calls).toEqual([
			[expect.objectContaining({ id: 'dropped' }), 'no tool is advertised in the active scope'],
		])
		expect(agent.context.messages.messages().at(-1)).not.toHaveProperty('calls')
	})

	it('checks scope before authority and keeps authority denials for admitted calls', async () => {
		const evaluated = createRecorder<[name: string]>()
		const executed = createRecorder<[]>()
		const denied = createRecorder<AgentEventMap['deny']>()
		const tools = createToolManager()
		tools.add(['safe', 'secret'].map((name) => createTool({ name, execute: executed.handler })))
		const calls = [
			createToolCall({ id: 'secret', name: 'secret' }),
			createToolCall({ id: 'safe', name: 'safe' }),
		]
		const provider = createScriptedProvider(
			[{ content: '', tools: calls }, { content: 'done' }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, {
			tools,
			scope: new Scope({ name: 'safe-only', tools: ['safe'] }),
			authority: {
				evaluate: ({ call }) => {
					evaluated.handler(call.name)
					return { allowed: false, zone: 'test', reason: 'policy refusal' }
				},
			},
			on: { deny: denied.handler },
		})
		expect(await agent.generate()).toEqual({ content: 'done', partial: false })
		expect(evaluated.calls).toEqual([['safe']])
		expect(executed.count).toBe(0)
		expect(denied.calls).toEqual([
			[calls[0], 'secret is not in the active scope'],
			[calls[1], 'policy refusal'],
		])
		expect(
			provider.calls[1]?.messages
				.filter((message) => message.role === 'tool')
				.map((message) => message.content),
		).toEqual(['denied: secret is not in the active scope', 'denied: policy refusal'])
		expect(
			provider.calls[1]?.messages
				.filter((message) => message.role === 'tool')
				.map((message) => message.call),
		).toEqual(['secret', 'safe'])
	})
})

describe('Agent — tool iteration', () => {
	it('names each answered call on its tool message when one reply calls one tool twice', async () => {
		const tools = createToolManager()
		tools.add(createTool({ name: 'weather', execute: (args) => `sunny in ${String(args.city)}` }))
		const calls = [
			createToolCall({ id: 'call-paris', name: 'weather', arguments: { city: 'Paris' } }),
			createToolCall({ id: 'call-oslo', name: 'weather', arguments: { city: 'Oslo' } }),
		]
		const provider = createScriptedProvider(
			[{ content: '', tools: calls }, { content: 'done' }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'weather in Paris and Oslo' })
		await agent.generate()
		const answers = requireValue(provider.calls[1]).messages.filter(
			(message) => message.role === 'tool',
		)
		expect(answers.map(({ call, content }) => ({ call, content }))).toEqual([
			{ call: 'call-paris', content: 'sunny in Paris' },
			{ call: 'call-oslo', content: 'sunny in Oslo' },
		])
		expect(
			agent.context.messages
				.messages()
				.filter((message) => message.role === 'tool')
				.map((message) => message.call),
		).toEqual(['call-paris', 'call-oslo'])
	})

	it('passes multiline string tool content with quotes, backslashes, and Unicode unchanged', async () => {
		const content = 'First line\n"quoted" C:\\workspace\\notes\r\nCafé 日本語 🌿\n'
		const tools = createToolManager()
		tools.add(createTool({ name: 'read', execute: () => content }))
		const provider = createScriptedProvider(
			[{ content: '', tools: [{ id: 'c1', name: 'read', arguments: {} }] }, { content: 'done' }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'read the notes' })
		await agent.generate()
		expect(provider.calls).toHaveLength(2)
		const message = provider.calls[1]?.messages.at(-1)
		expect(message?.role).toBe('tool')
		expect(message?.content).toBe(content)
	})

	it('passes empty string tool content unchanged', async () => {
		const tools = createToolManager()
		tools.add(createTool({ name: 'read', execute: () => '' }))
		const provider = createScriptedProvider(
			[{ content: '', tools: [{ id: 'c1', name: 'read', arguments: {} }] }, { content: 'done' }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'read the empty file' })
		await agent.generate()
		expect(provider.calls).toHaveLength(2)
		const message = provider.calls[1]?.messages.at(-1)
		expect(message?.role).toBe('tool')
		expect(message?.content).toBe('')
	})

	it('JSON-encodes object tool content', async () => {
		const tools = createToolManager()
		tools.add(createTool({ name: 'read', execute: () => ({ text: 'first\n"second"', count: 2 }) }))
		const provider = createScriptedProvider(
			[{ content: '', tools: [{ id: 'c1', name: 'read', arguments: {} }] }, { content: 'done' }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'read the record' })
		await agent.generate()
		expect(provider.calls).toHaveLength(2)
		const message = provider.calls[1]?.messages.at(-1)
		expect(message?.role).toBe('tool')
		expect(message?.content).toBe('{"text":"first\\n\\"second\\"","count":2}')
	})

	it('dispatches a tool call then finishes with the follow-up turn', async () => {
		const tools = createToolManager()
		tools.add(createTool({ name: 'add', execute: (args) => Number(args.a) + Number(args.b) }))
		const provider = createScriptedProvider(
			[
				{ result: { content: '', tools: [{ id: 'c1', name: 'add', arguments: { a: 2, b: 3 } }] } },
				{ result: { content: 'the answer is 5', usage: AGENT_USAGE } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'add 2 and 3' })
		const result = await agent.generate()
		expect(result.content).toBe('the answer is 5')
		expect(result.partial).toBe(false)
		// The second provider call saw the assistant tool-call turn + the tool result turn.
		const [, second] = provider.calls
		const roles = second?.messages.map((m) => m.role)
		expect(roles).toContain('assistant')
		expect(roles?.at(-1)).toBe('tool')
		const toolMessage = second?.messages.at(-1)
		expect(toolMessage?.content).toBe('5')
	})

	it('feeds a tool error back as the tool message (loop never throws)', async () => {
		const tools = createToolManager()
		tools.add(
			createTool({
				name: 'boom',
				execute: () => {
					throw new Error('kaboom')
				},
			}),
		)
		const provider = createScriptedProvider(
			[
				{ result: { content: '', tools: [{ id: 'c1', name: 'boom', arguments: {} }] } },
				{ result: { content: 'recovered' } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		expect(result.content).toBe('recovered')
		const [, second] = provider.calls
		expect(second?.messages.at(-1)?.content).toBe('kaboom')
	})
})

describe('Agent — authority gate', () => {
	it('no authority → a tool call executes unchanged (the no-authority path)', async () => {
		const recorder = createRecorder<[Readonly<Record<string, unknown>>]>()
		const tools = createToolManager()
		tools.add(
			createTool({
				name: 'add',
				execute: (args) => {
					recorder.handler(args)
					return Number(args.a) + Number(args.b)
				},
			}),
		)
		const provider = createScriptedProvider(
			[
				{ result: { content: '', tools: [{ id: 'c1', name: 'add', arguments: { a: 2, b: 3 } }] } },
				{ result: { content: 'done' } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		// No `authority` option → the gate is a straight pass-through.
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'add 2 and 3' })
		const result = await agent.generate()
		expect(result.content).toBe('done')
		expect(recorder.count).toBe(1)
		// The tool's value was fed back as the tool message.
		const [, second] = provider.calls
		expect(second?.messages.at(-1)?.content).toBe(JSON.stringify(5))
	})

	it('an allowed call executes and its value is fed back', async () => {
		const recorder = createRecorder<[Readonly<Record<string, unknown>>]>()
		const tools = createToolManager()
		tools.add(
			createTool({
				name: 'add',
				execute: (args) => {
					recorder.handler(args)
					return Number(args.a) + Number(args.b)
				},
			}),
		)
		const provider = createScriptedProvider(
			[
				{ result: { content: '', tools: [{ id: 'c1', name: 'add', arguments: { a: 2, b: 3 } }] } },
				{ result: { content: 'sum is 5' } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		// A rule that matches `add` and allows it (allowed defaults to true).
		const authority = createAuthority({
			rules: [{ match: (c) => c.call.name === 'add', zone: 'safe' }],
		})
		const agent = createAgent(provider, { tools, authority })
		agent.context.messages.add({ role: 'user', content: 'add 2 and 3' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const result = await stream.result
		expect(result.content).toBe('sum is 5')
		expect(recorder.count).toBe(1)
		// The tool chunk carries the executed (real) result, not a denial.
		const toolChunk = chunks.find((c) => c.category === 'tool')
		expect(toolChunk).toEqual({
			category: 'tool',
			call: { id: 'c1', name: 'add', arguments: { a: 2, b: 3 } },
			result: { success: true, id: 'c1', name: 'add', value: 5 },
		})
	})

	it('a denied call is NOT executed but is fed back, and the next turn sees the denial', async () => {
		const recorder = createRecorder<[Readonly<Record<string, unknown>>]>()
		const tools = createToolManager()
		tools.add(
			createTool({
				name: 'add',
				execute: (args) => {
					recorder.handler(args)
					return 5
				},
			}),
		)
		const provider = createScriptedProvider(
			[
				{ result: { content: '', tools: [{ id: 'c1', name: 'add', arguments: { a: 2, b: 3 } }] } },
				{ result: { content: 'understood, blocked' } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const authority = createAuthority({
			rules: [
				{
					match: (c) => c.call.name === 'add',
					zone: 'restricted',
					allowed: false,
					reason: 'blocked',
				},
			],
		})
		const agent = createAgent(provider, { tools, authority })
		agent.context.messages.add({ role: 'user', content: 'add 2 and 3' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const result = await stream.result
		// The tool's handler NEVER ran (no execute, no budget cost).
		expect(recorder.count).toBe(0)
		// A `tool` chunk still appeared, carrying the denial error result.
		const toolChunk = chunks.find((c) => c.category === 'tool')
		expect(toolChunk).toEqual({
			category: 'tool',
			call: { id: 'c1', name: 'add', arguments: { a: 2, b: 3 } },
			result: { success: false, id: 'c1', name: 'add', error: 'denied: blocked' },
		})
		// The loop continued: a SECOND provider call happened, and it SAW the denial as the
		// last (tool) message — so the model can react to it.
		expect(provider.calls).toHaveLength(2)
		const [, second] = provider.calls
		expect(second?.messages.at(-1)?.role).toBe('tool')
		expect(second?.messages.at(-1)?.content).toBe('denied: blocked')
		expect(result.content).toBe('understood, blocked')
		expect(result.partial).toBe(false)
	})

	it('a denied call with no reason feeds back a generic denial', async () => {
		const tools = createToolManager()
		tools.add(createAddTool())
		const provider = createScriptedProvider(
			[{ result: { content: '', tools: [createToolCall()] } }, { result: { content: 'ok' } }],
			AGENT_SCRIPT_OPTIONS,
		)
		// A deny rule with NO reason → the generic 'denied by authority' message.
		const authority = createAuthority({
			rules: [{ match: () => true, zone: 'restricted', allowed: false }],
		})
		const agent = createAgent(provider, { tools, authority })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		await stream.result
		const toolChunk = chunks.find((c) => c.category === 'tool')
		expect(toolChunk).toEqual({
			category: 'tool',
			call: { id: 'c1', name: 'add', arguments: {} },
			result: { success: false, id: 'c1', name: 'add', error: 'denied by authority' },
		})
	})

	it('a mixed batch preserves call order: allowed run, denied do not', async () => {
		const addRecorder = createRecorder<[Readonly<Record<string, unknown>>]>()
		const delRecorder = createRecorder<[Readonly<Record<string, unknown>>]>()
		const tools = createToolManager()
		tools.add([
			createTool({
				name: 'add',
				execute: (args) => {
					addRecorder.handler(args)
					return 5
				},
			}),
			createTool({
				name: 'delete',
				execute: (args) => {
					delRecorder.handler(args)
					return 'gone'
				},
			}),
		])
		// One turn with THREE calls in order: add (allowed), delete (denied), add (allowed).
		const provider = createScriptedProvider(
			[
				{
					result: {
						content: '',
						tools: [
							{ id: 'a1', name: 'add', arguments: { n: 1 } },
							{ id: 'd1', name: 'delete', arguments: { id: 'x' } },
							{ id: 'a2', name: 'add', arguments: { n: 2 } },
						],
					},
				},
				{ result: { content: 'final' } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const authority = createAuthority({
			rules: [
				{
					match: (c) => c.call.name === 'delete',
					zone: 'restricted',
					allowed: false,
					reason: 'no deletes',
				},
			],
		})
		const agent = createAgent(provider, { tools, authority })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		await stream.result
		// `delete` never executed; `add` executed twice.
		expect(delRecorder.count).toBe(0)
		expect(addRecorder.count).toBe(2)
		// The tool chunks are in ORIGINAL call order, with the denied one carrying the error.
		const toolResults = chunks.flatMap((c) =>
			c.category === 'tool' ? [{ id: c.call.id, result: c.result }] : [],
		)
		expect(toolResults).toEqual([
			{ id: 'a1', result: { success: true, id: 'a1', name: 'add', value: 5 } },
			{
				id: 'd1',
				result: {
					success: false,
					id: 'd1',
					name: 'delete',
					error: 'denied: no deletes',
				},
			},
			{ id: 'a2', result: { success: true, id: 'a2', name: 'add', value: 5 } },
		])
		// The next turn's tool messages are appended in the same order.
		const [, second] = provider.calls
		const toolContents = (second?.messages ?? [])
			.filter((m) => m.role === 'tool')
			.map((m) => m.content)
		expect(toolContents).toEqual([JSON.stringify(5), 'denied: no deletes', JSON.stringify(5)])
		expect((second?.messages ?? []).filter((m) => m.role === 'tool').map((m) => m.call)).toEqual([
			'a1',
			'd1',
			'a2',
		])
	})

	it('an all-denied turn feeds every call back as a denial and the loop stays bounded', async () => {
		const recorder = createRecorder<[Readonly<Record<string, unknown>>]>()
		const tools = createToolManager()
		tools.add(
			createTool({
				name: 'loop',
				execute: (args) => {
					recorder.handler(args)
					return 'again'
				},
			}),
		)
		// Every turn requests the same denied tool — only `limit` reached stops it.
		const provider = createScriptedProvider(
			Array.from({ length: 10 }, () => ({
				result: { content: '', tools: [createToolCall({ id: 'c', name: 'loop' })] },
			})),
			AGENT_SCRIPT_OPTIONS,
		)
		const authority = createAuthority({
			rules: [{ match: () => true, zone: 'restricted', allowed: false, reason: 'all blocked' }],
		})
		const agent = createAgent(provider, { tools, authority, limit: 3 })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const result = await stream.result
		// No tool ever ran; the cap still bounded the loop at 3 turns.
		expect(recorder.count).toBe(0)
		expect(provider.calls).toHaveLength(3)
		// Limit exhaustion: the model still held unresolved tool intent on the last allowed turn (every turn
		// requested the denied tool) — the loop exhausted its limit, so the outcome is partial.
		expect(result.partial).toBe(true)
		// Each turn produced exactly one tool chunk carrying a denial.
		const toolChunks = chunks.filter((c) => c.category === 'tool')
		expect(toolChunks).toHaveLength(3)
		expect(
			toolChunks.every(
				(c) =>
					c.category === 'tool' && !c.result.success && c.result.error === 'denied: all blocked',
			),
		).toBe(true)
	})
})

describe('Agent — generate ↔ stream parity', () => {
	it('generate result deep-equals draining the stream of the same script', async () => {
		const script: readonly ScriptedTurn[] = [
			{ result: { content: 'one', usage: AGENT_USAGE }, deltas: ['on', 'e'] },
		]
		const a = createAgent(createScriptedProvider(script, AGENT_SCRIPT_OPTIONS))
		a.context.messages.add({ role: 'user', content: 'hi' })
		const generated = await a.generate()

		const b = createAgent(createScriptedProvider(script, AGENT_SCRIPT_OPTIONS))
		b.context.messages.add({ role: 'user', content: 'hi' })
		const stream = b.stream()
		await collect(stream.events)
		const streamed = await stream.result

		expect(streamed).toEqual(generated)
	})

	// A multi-turn tool script with usage on each turn — generate and a fully-drained
	// stream must agree on the final content AND the summed usage.
	it('parity under multi-turn tool iteration (content + summed usage agree)', async () => {
		const script: readonly ScriptedTurn[] = [
			{
				result: { content: '', tools: [createToolCall()], usage: AGENT_USAGE },
				deltas: [],
			},
			{ result: { content: 'sum 5', usage: AGENT_USAGE }, deltas: ['sum', ' 5'] },
		]
		const a = createAgent(createScriptedProvider(script, AGENT_SCRIPT_OPTIONS), {
			tools: createSeededToolManager(),
			limit: 5,
		})
		a.context.messages.add({ role: 'user', content: 'go' })
		const generated = await a.generate()

		const b = createAgent(createScriptedProvider(script, AGENT_SCRIPT_OPTIONS), {
			tools: createSeededToolManager(),
			limit: 5,
		})
		b.context.messages.add({ role: 'user', content: 'go' })
		const stream = b.stream()
		await collect(stream.events)
		const streamed = await stream.result
		expect(streamed).toEqual(generated)
		expect(streamed.usage).toEqual({ prompt: 10, completion: 14, total: 24 })
	})

	// Authority-denial parity: a denied call produces the same settled result on both faces.
	it('parity under an authority denial', async () => {
		const script: readonly ScriptedTurn[] = [
			{ result: { content: '', tools: [createToolCall()] }, deltas: [] },
			{ result: { content: 'blocked' } },
		]
		const a = createAgent(createScriptedProvider(script, AGENT_SCRIPT_OPTIONS), {
			tools: createSeededToolManager(),
			authority: createAuthority({ rules: [{ match: () => true, zone: 'deny', allowed: false }] }),
			limit: 5,
		})
		a.context.messages.add({ role: 'user', content: 'go' })
		const generated = await a.generate()

		const b = createAgent(createScriptedProvider(script, AGENT_SCRIPT_OPTIONS), {
			tools: createSeededToolManager(),
			authority: createAuthority({ rules: [{ match: () => true, zone: 'deny', allowed: false }] }),
			limit: 5,
		})
		b.context.messages.add({ role: 'user', content: 'go' })
		const stream = b.stream()
		await collect(stream.events)
		const streamed = await stream.result
		expect(streamed).toEqual(generated)
	})

	// Budget-bound parity: both faces commit the same partial when the budget exhausts.
	it('parity under a budget bound (both commit the same partial)', async () => {
		const script: readonly ScriptedTurn[] = [
			{
				result: {
					content: 'a',
					tools: [createToolCall({ id: 'c', name: 'loop' })],
					usage: AGENT_USAGE,
				},
			},
			{ result: { content: 'b' } },
		]
		const a = createAgent(createScriptedProvider(script, AGENT_SCRIPT_OPTIONS), {
			tools: createSeededToolManager([createLoopTool()]),
			budget: createTokenBudget({ max: 12, scope: 'total' }),
		})
		a.context.messages.add({ role: 'user', content: 'go' })
		const generated = await a.generate()

		const b = createAgent(createScriptedProvider(script, AGENT_SCRIPT_OPTIONS), {
			tools: createSeededToolManager([createLoopTool()]),
			budget: createTokenBudget({ max: 12, scope: 'total' }),
		})
		b.context.messages.add({ role: 'user', content: 'go' })
		const stream = b.stream()
		await collect(stream.events)
		const streamed = await stream.result
		expect(streamed).toEqual(generated)
		expect(streamed.partial).toBe(true)
	})

	// Pre-aborted parity: a pre-aborted external signal yields the same empty partial.
	it('parity under a pre-aborted external signal', async () => {
		const script: readonly ScriptedTurn[] = [{ result: { content: 'never' } }]
		const controllerA = new AbortController()
		controllerA.abort()
		const a = createAgent(createScriptedProvider(script, AGENT_SCRIPT_OPTIONS), {
			signal: controllerA.signal,
		})
		a.context.messages.add({ role: 'user', content: 'hi' })
		const generated = await a.generate()

		const controllerB = new AbortController()
		controllerB.abort()
		const b = createAgent(createScriptedProvider(script, AGENT_SCRIPT_OPTIONS), {
			signal: controllerB.signal,
		})
		b.context.messages.add({ role: 'user', content: 'hi' })
		const stream = b.stream()
		await collect(stream.events)
		const streamed = await stream.result
		expect(streamed).toEqual(generated)
		expect(streamed).toEqual({ content: '', partial: true })
	})
})

describe('Agent — chunk sequence', () => {
	it('yields token(s) → usage → tool → token(s) → usage in order', async () => {
		const tools = createToolManager()
		tools.add(createAddTool())
		const provider = createScriptedProvider(
			[
				{
					result: {
						content: 'calling',
						tools: [createToolCall()],
						usage: AGENT_USAGE,
					},
					deltas: ['call', 'ing'],
				},
				{ result: { content: 'final', usage: AGENT_USAGE }, deltas: ['fin', 'al'] },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const types = chunks.map((c) => c.category)
		expect(types).toEqual(['token', 'token', 'usage', 'tool', 'token', 'token', 'usage'])
		// The tool chunk carries the dispatched call + its executed result.
		const toolChunk = chunks.find((c) => c.category === 'tool')
		expect(toolChunk).toEqual({
			category: 'tool',
			call: { id: 'c1', name: 'add', arguments: {} },
			result: { success: true, id: 'c1', name: 'add', value: 5 },
		})
		const tokens = chunks.filter((c) => c.category === 'token').map((c) => c.content)
		expect(tokens).toEqual(['call', 'ing', 'fin', 'al'])
		const result = await stream.result
		expect(result.content).toBe('final')
		// Usage summed across both provider calls.
		expect(result.usage).toEqual({ prompt: 10, completion: 14, total: 24 })
	})
})

describe('Agent — iteration cap', () => {
	it('stops at limit when the model always requests a tool (no infinite loop)', async () => {
		const tools = createToolManager()
		tools.add(createLoopTool())
		// Every turn returns a tool call — only `limit` reached stops it.
		const provider = createScriptedProvider(
			Array.from({ length: 10 }, () => ({
				result: { content: '', tools: [createToolCall({ id: 'c', name: 'loop' })] },
			})),
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, limit: 3 })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		// 3 turns ran, then the loop stopped (didn't exhaust the 10-turn script forever). The
		// model still wanted a tool on the last allowed turn, so this is an exhaustion — partial.
		expect(provider.calls).toHaveLength(3)
		expect(result.partial).toBe(true)
	})
})

describe('Agent — abort', () => {
	it('joins nonempty abort thinking without recording a message and omits empty thinking', async () => {
		for (const thinking of ['', 'unfinished plan']) {
			const abort = new AbortController()
			const failure = new ProviderAbortError({ content: 'x', thinking })
			const provider = createAbortingResultProvider(abort, failure)
			const agent = createAgent(provider, { signal: abort.signal })
			agent.context.messages.add({ role: 'user', content: 'hi' })
			const result = await agent.generate()
			expect(result).toEqual({
				content: 'x',
				partial: true,
				...(thinking === '' ? {} : { thinking }),
			})
			expect(agent.context.messages.messages().map((message) => message.role)).toEqual(['user'])
		}
	})

	it('a pre-aborted external signal commits a partial without calling the provider', async () => {
		const provider = createScriptedProvider(
			[{ result: { content: 'never' } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const controller = new AbortController()
		controller.abort()
		const agent = createAgent(provider, { signal: controller.signal })
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate()
		expect(result.partial).toBe(true)
		expect(result.content).toBe('')
		expect(provider.calls).toHaveLength(0)
	})

	it('abort() mid-stream resolves partial with the accumulated content', async () => {
		const gate = Promise.withResolvers<void>()
		// A provider whose stream yields one delta, then waits on a gate before the next —
		// giving the test a window to call abort() mid-stream.
		const provider = createAbortingGatedProvider(gate)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		const drained = collect(stream.events)
		await waitForDelay()
		agent.abort()
		gate.resolve()
		await drained
		const result = await stream.result
		expect(result.partial).toBe(true)
		expect(result.content).toBe('part')
		expect(agent.status).toBe('done')
	})

	it('a genuine provider error (not a cancel) rejects the result', async () => {
		// The stream yields one delta, then throws on the next pull while the signal is
		// NOT aborted — a genuine provider failure must propagate (the run rejects, status
		// → error), distinct from the abort path that commits a partial. The reachable
		// `yield` keeps it a real generator; the throw after it is reachable too.
		const provider = createThrowingProvider('boom', 'partial')
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		await expect(agent.generate()).rejects.toThrow('boom')
		expect(agent.status).toBe('error')
	})
})

describe('Agent — budget bound', () => {
	it('stops and commits partial after the token budget is exhausted', async () => {
		const budget = createTokenBudget({ max: 10, scope: 'total' })
		const tools = createToolManager()
		tools.add(createTool({ name: 'loop', execute: () => 'x' }))
		// Each turn reports usage that the budget charges; turn 1's usage (total 12)
		// crosses max=10, firing the budget signal before turn 2 runs.
		const provider = createScriptedProvider(
			[
				{
					result: {
						content: 'a',
						tools: [createToolCall({ id: 'c', name: 'loop' })],
						usage: AGENT_USAGE,
					},
				},
				{
					result: {
						content: 'b',
						tools: [createToolCall({ id: 'c', name: 'loop' })],
						usage: AGENT_USAGE,
					},
				},
				{ result: { content: 'c' } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, budget })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		expect(result.partial).toBe(true)
		// Only the first turn ran before the budget exhausted the bound.
		expect(provider.calls).toHaveLength(1)
	})
})

describe('Agent — scheduler pacing', () => {
	it('yields between turns, not after the last', async () => {
		const scheduler = createRecordingScheduler()
		const tools = createToolManager()
		tools.add(createAddTool())
		const provider = createScriptedProvider(
			[
				{ result: { content: '', tools: [createToolCall()] } },
				{ result: { content: '', tools: [createToolCall({ id: 'c2' })] } },
				{ result: { content: 'done' } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, scheduler })
		agent.context.messages.add({ role: 'user', content: 'go' })
		await agent.generate()
		// 3 turns ran → yield fired before turns 2 and 3 only (not before turn 1, not after).
		expect(provider.calls).toHaveLength(3)
		expect(scheduler.yields).toBe(2)
	})
})

describe('Agent — status', () => {
	it('transitions idle → running → done', async () => {
		const provider = createScriptedProvider([{ result: { content: 'ok' } }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider)
		expect(agent.status).toBe('idle')
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		expect(agent.status).toBe('running')
		await collect(stream.events)
		await stream.result
		expect(agent.status).toBe('done')
	})
})

describe('Agent — deadline cleanup', () => {
	// A normal completion must disarm the per-turn deadline in a finally block.
	// What makes a leaked deadline
	// OBSERVABLE is what an armed deadline does when it expires: it aborts the composed run
	// signal — the very signal the provider was handed and recorded on its call. So arm a
	// real short deadline, let the run finish naturally, then wait several periods of real
	// time. A cleared deadline never fires and that recorded signal stays unaborted; a
	// leaked one fires during the wait and aborts it.
	it('clears the per-turn deadline on a successful generate (it never fires afterwards)', async () => {
		const provider = createScriptedProvider([{ result: { content: 'hi' } }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, { timeout: AGENT_DEADLINE })
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate()
		expect(result.content).toBe('hi')
		expect(result.partial).toBe(false)
		// Well past the deadline — an uncleared one has long since expired by now.
		await waitForDelay(AGENT_DEADLINE * 3)
		expect(provider.calls).toHaveLength(1)
		expect(provider.calls[0]?.signal.aborted).toBe(false)
		// And the settled result is untouched by the elapsed period.
		expect(agent.status).toBe('done')
	})
})

// The result settles without requiring the caller to drain events.
describe('Agent — stream drive (result settles independently of events)', () => {
	it('settles result without draining events (the no-drain hang repro)', async () => {
		const script: readonly ScriptedTurn[] = [
			{ result: { content: 'hello', usage: AGENT_USAGE }, deltas: ['hel', 'lo'] },
		]
		// The assembled content a FULLY-DRAINED stream produces — what no-drain must match.
		const drainAgent = createAgent(createScriptedProvider(script, AGENT_SCRIPT_OPTIONS))
		drainAgent.context.messages.add({ role: 'user', content: 'hi' })
		const drainStream = drainAgent.stream()
		await collect(drainStream.events)
		const drained = await drainStream.result

		const agent = createAgent(createScriptedProvider(script, AGENT_SCRIPT_OPTIONS))
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		// The result must settle while events remain undrained.
		const result = await stream.result
		expect(result.content).toBe('hello')
		expect(result.content).toBe(drained.content)
		expect(result.partial).toBe(false)
		expect(result.usage).toEqual(AGENT_USAGE)
		expect(agent.status).toBe('done')
	})

	it('clears the deadline when result is awaited without draining events', async () => {
		const provider = createScriptedProvider([{ result: { content: 'hi' } }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, { timeout: AGENT_DEADLINE })
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		// Without draining `events`, the deadline's `clear()` must still run — it lives in the
		// pump's `finally`, not the never-pulled events `finally`.
		const result = await stream.result
		expect(result.content).toBe('hi')
		// Same observable as the successful-generate case: wait several real periods, and a
		// deadline that was never cleared expires and aborts the recorded run signal.
		await waitForDelay(AGENT_DEADLINE * 3)
		expect(provider.calls).toHaveLength(1)
		expect(provider.calls[0]?.signal.aborted).toBe(false)
	})

	it('breaking out of events early settles a partial, cancels the run, and leaks no timer', async () => {
		// The early break aborts the run signal deliberately, so — unlike the two cases preceding —
		// "did the deadline fire?" is invisible on that signal. The remaining observable is the
		// host's own live resource list: a deadline left armed IS a pending `Timeout` on the
		// event loop, which is the leak this test names. Read the host's count before and after
		// and require no net gain. The deadline following is far longer than the run, so a leaked
		// one is intended to remain pending at the second reading.
		const before = process.getActiveResourcesInfo().filter((one) => one === 'Timeout').length
		const tools = createToolManager()
		tools.add(createTool({ name: 'noop', execute: () => null }))
		// A long script that would emit many chunks across turns if left to run — breaking
		// after the first chunk must stop it well short (proving the early break cancelled).
		const provider = createScriptedProvider(
			Array.from({ length: 5 }, () => ({
				result: { content: '', tools: [{ id: 'c', name: 'noop', arguments: {} }] },
				deltas: ['a', 'b', 'c'],
			})),
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, timeout: 5_000 })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		// Pull exactly ONE chunk through the iterator protocol, then `return()` the iterator —
		// the early-break a consumer's `break` triggers — without an unused loop binding.
		const iterator = stream.events[Symbol.asyncIterator]()
		const first = await iterator.next()
		expect(first.done).toBe(false)
		await iterator.return?.()
		const result = await stream.result
		// Early break must settle a NON-misleading partial (never `{ content:'', partial:false }`).
		expect(result.partial).toBe(true)
		// The run was cancelled, so it did NOT march through the whole 5-turn script.
		expect(provider.calls.length).toBeLessThan(5)
		// status left 'running' (a cancel finishes the turn as 'done'), and no leaked deadline.
		expect(agent.status).not.toBe('running')
		expect(agent.status).toBe('done')
		expect(process.getActiveResourcesInfo().filter((one) => one === 'Timeout').length).toBe(before)
	})

	it('rejects result on a genuine provider error without draining events', async () => {
		// A provider that throws (signal NOT aborted) — a genuine failure must reject `result`
		// even when `events` is never pulled, and leave status 'error'.
		const provider = createThrowingProvider('boom', 'partial')
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		// Reject must surface on `result` with NO consumer of `events`.
		await expect(stream.result).rejects.toThrow('boom')
		expect(agent.status).toBe('error')
	})

	it('an abandoned throwing handle (events undrained, result unawaited) leaks no unhandledRejection', async () => {
		// Abandoned handles must mark their result rejection handled without changing what await observes.
		const provider = createThrowingProvider('boom', 'partial')
		// Record process-level unhandledRejections for the duration of this test only; the
		// `finally` removes the listener so it can never leak into a sibling test.
		const rejections = createRecorder<[unknown, Promise<unknown>]>()
		process.on('unhandledRejection', rejections.handler)
		try {
			const agent = createAgent(provider)
			agent.context.messages.add({ role: 'user', content: 'hi' })
			// Leave both the events and result untouched to exercise an abandoned handle.
			const s = agent.stream()
			expect(s).toBeDefined()
			// Advance the event loop enough for the pump to run and reject `settled.promise`, so a
			// leaked rejection WOULD have surfaced by now: unhandledRejection fires on a later
			// microtask checkpoint, so turn the macrotask queue a couple of times.
			await waitForDelay()
			await waitForDelay()
			// The guard on `settled.promise` marked the rejection handled — none leaked.
			expect(rejections.calls).toEqual([])
			expect(agent.status).toBe('error')
		} finally {
			process.off('unhandledRejection', rejections.handler)
		}
	})
})

// ── Channel internals (exercised THROUGH the public stream) ──────────────────
//
// The private unbounded async Channel the pump writes chunks into is not exported,
// so its invariants are pinned through `stream().events` — the one consumer of its
// `drain()`. These drive the load-bearing properties: no lost wakeup (a push between
// two pulls is delivered), no truncation (chunks pushed alongside the close are all
// drained), FIFO under backpressure (a slow consumer still sees every chunk in order),
// and a fail surfacing as a throw out of the iterator.

describe('Agent — channel internals (through stream.events)', () => {
	it('delivers a chunk pushed between two pulls — no lost wakeup', async () => {
		// A provider whose deltas arrive one macrotask apart, so the consumer's pull parks
		// on an empty buffer and a later push must wake it (the resolver-swap path). If a
		// wakeup were lost the second pull would hang and `collect` would never finish.
		const provider = createPacedProvider()
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const tokens = chunks.flatMap((c) => (c.category === 'token' ? [c.content] : []))
		expect(tokens).toEqual(['a', 'b'])
		const result = await stream.result
		expect(result.content).toBe('ab')
	})

	it('drains every chunk pushed alongside the close — no truncation', async () => {
		// A whole turn's many deltas plus its usage are pushed by the pump before it
		// calls the `close()` method; draining must yield ALL of them (the drain loop empties the buffer
		// fully before honouring the close), with the final usage last.
		const provider = createScriptedProvider(
			[
				{
					result: { content: 'abcdef', usage: AGENT_USAGE },
					deltas: ['a', 'b', 'c', 'd', 'e', 'f'],
				},
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const types = chunks.map((c) => c.category)
		expect(types).toEqual(['token', 'token', 'token', 'token', 'token', 'token', 'usage'])
		const tokens = chunks.flatMap((c) => (c.category === 'token' ? [c.content] : []))
		expect(tokens).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
	})

	it('preserves FIFO order for a consumer slower than the producer (backpressure)', async () => {
		// The producer pushes a long run of deltas with no awaits between them (they pile
		// into the unbounded buffer); a consumer that awaits a macrotask per chunk drains
		// them well after they were pushed. Order must be exactly as produced.
		const deltas = Array.from({ length: 50 }, (_unused, index) => `t${index}`)
		const provider = createScriptedProvider(
			[{ result: { content: deltas.join('') }, deltas }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		const seen: string[] = []
		for await (const chunk of stream.events) {
			if (chunk.category === 'token') seen.push(chunk.content)
			await waitForDelay() // pull slower than the producer pushed
		}
		expect(seen).toEqual(deltas)
		const result = await stream.result
		expect(result.content).toBe(deltas.join(''))
	})

	it('a failed channel surfaces the error out of the iterator (drain throws)', async () => {
		// A genuine provider throw calls the channel's `fail` method; iterating
		// `events` must THROW that same error out of the drain — the consumer sees it, not
		// a silent close. (The `result` rejection is covered elsewhere; here it is the
		// iterator throw that is under test.)
		const provider = createThrowingProvider('channel-fail', 'partial')
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		await expect(collect(stream.events)).rejects.toThrow('channel-fail')
		// The result rejects with the same error (guarded so it does not leak unhandled).
		await expect(stream.result).rejects.toThrow('channel-fail')
		expect(agent.status).toBe('error')
	})
})

// ── Re-entrancy / reuse (the contract: each run is a fresh, independent run) ──
//
// Each overlapping run owns its result and abort signal.
describe('Agent — re-entrancy / reuse', () => {
	it('generate() twice runs two independent turns (status returns to done each time)', async () => {
		const agent = createAgent(createEchoProvider())
		agent.context.messages.add({ role: 'user', content: 'first' })
		const r1 = await agent.generate()
		expect(r1.content).toBe('ok:first')
		expect(r1.partial).toBe(false)
		expect(agent.status).toBe('done')
		// A second generate on the same agent reuses it cleanly — its own fresh run.
		agent.context.messages.add({ role: 'user', content: 'second' })
		const r2 = await agent.generate()
		expect(r2.content).toBe('ok:second')
		expect(r2.partial).toBe(false)
		expect(agent.status).toBe('done')
	})

	it('two concurrent stream() runs settle on their own results independently', async () => {
		// Distinct conversations on two agents (one shared context can't represent two
		// independent conversations) — the point is each run's OWN result settles, with no
		// cross-talk through shared instance fields.
		const a = createAgent(createEchoProvider())
		a.context.messages.add({ role: 'user', content: 'A' })
		const b = createAgent(createEchoProvider())
		b.context.messages.add({ role: 'user', content: 'B' })
		const sa = a.stream()
		const sb = b.stream()
		const [ra, rb] = await Promise.all([sa.result, sb.result])
		expect(ra.content).toBe('ok:A')
		expect(rb.content).toBe('ok:B')
	})

	it('agent.abort() cancels EVERY in-flight run (not only the most recent)', async () => {
		// Two overlapping runs on ONE agent. Each parks on its own gate mid-stream; a single
		// Calling `agent.abort()` must commit both runs partial.
		const g1 = Promise.withResolvers<void>()
		const g2 = Promise.withResolvers<void>()
		const provider = createSharedGatedProvider(g1, g2)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const s1 = agent.stream()
		const s2 = agent.stream()
		const d1 = collect(s1.events)
		const d2 = collect(s2.events)
		await waitForDelay() // let both runs reach their gate
		agent.abort() // must fire BOTH handles
		g1.resolve()
		g2.resolve()
		await Promise.allSettled([d1, d2])
		const r1 = await s1.result
		const r2 = await s2.result
		// BOTH committed partial with the accumulated 'part' — neither ran to 'full'.
		expect(r1).toEqual({ content: 'part', partial: true })
		expect(r2).toEqual({ content: 'part', partial: true })
	})

	it('stream.abort() cancels only its OWN run, never a sibling started later', async () => {
		// Calling `s1.abort()` must abort the first run while the second remains independent.
		const g1 = Promise.withResolvers<void>()
		const g2 = Promise.withResolvers<void>()
		const provider = createIndependentGatedProvider(g1, g2)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const s1 = agent.stream()
		const s2 = agent.stream()
		const d1 = collect(s1.events)
		const d2 = collect(s2.events)
		await waitForDelay()
		s1.abort() // cancels run 1 ONLY
		g1.resolve()
		g2.resolve()
		await Promise.allSettled([d1, d2])
		const r1 = await s1.result
		const r2 = await s2.result
		// Run 1 committed partial; run 2 ran to its OWN full finish (untouched by s1.abort()).
		expect(r1).toEqual({ content: 'part', partial: true })
		expect(r2).toEqual({ content: 'full-2', partial: false })
	})

	it('generate() then stream() reuse the agent cleanly back to back', async () => {
		const agent = createAgent(createEchoProvider())
		agent.context.messages.add({ role: 'user', content: 'gen' })
		const generated = await agent.generate()
		expect(generated.content).toBe('ok:gen')
		const stream = agent.stream()
		await collect(stream.events)
		const streamed = await stream.result
		// The second run saw the assistant turn the first appended, but still settles cleanly.
		expect(streamed.partial).toBe(false)
		expect(streamed.content.startsWith('ok:')).toBe(true)
		expect(agent.status).toBe('done')
	})
})

// ── Cancellation timing matrix ───────────────────────────────────────────────
//
// A cancel — wherever in the turn it lands — must commit a PARTIAL (resolve, never
// reject), leave status no longer 'running', clear the deadline, and surface exactly
// the content accumulated before the cancel. These walk the distinct landing points:
// during tool execution, AT a turn boundary's scheduler yield, exactly at a budget
// boundary vs mid-stream, a deadline firing during tool execution, and an abort that
// arrives after the run already finished (a harmless no-op).

describe('Agent — cancellation timing matrix', () => {
	it.each(AUTHORITY_STATES)(
		'supplies no caller identity to a tool handler (authority: %s)',
		async (authorized) => {
			const tools = createToolManager()
			tools.add(
				createTool({
					name: 'identity',
					execute: (_args, context) => {
						expect(context.caller).toBeUndefined()
						return 'entered'
					},
				}),
			)
			const call = createToolCall({ name: 'identity' })
			const provider = createScriptedProvider(
				[{ result: { content: '', tools: [call] } }, { result: { content: 'done' } }],
				AGENT_SCRIPT_OPTIONS,
			)
			const agent = createAgent(provider, {
				tools,
				...(authorized ? { authority: createAuthority() } : {}),
			})
			const stream = agent.stream()
			expect(await collect(stream.events)).toContainEqual({
				category: 'tool',
				call,
				result: { id: call.id, name: call.name, success: true, value: 'entered' },
			})
			expect(await stream.result).toMatchObject({ content: 'done', partial: false })
		},
	)

	it.each(AUTHORITY_STATES)(
		'budget exhaustion before dispatch preserves only the prior conversation (authority: %s)',
		async (authorized) => {
			const executed = createRecorder<[]>()
			const tools = createToolManager()
			tools.add(createTool({ name: 'wait', execute: executed.handler }))
			const budget = createTokenBudget({ max: AGENT_USAGE.total, scope: 'total' })
			const provider = createScriptedProvider(
				[
					{
						result: {
							content: 'working',
							tools: [createToolCall({ name: 'wait' })],
							usage: AGENT_USAGE,
						},
					},
				],
				AGENT_SCRIPT_OPTIONS,
			)
			const agent = createAgent(provider, {
				tools,
				budget,
				...(authorized ? { authority: createAuthority() } : {}),
			})
			const seed = agent.context.messages.add({ role: 'user', content: 'go' })
			const stream = agent.stream()
			const chunks = await collect(stream.events)
			expect(await stream.result).toMatchObject({ content: 'working', partial: true })
			expect(budget.signal.aborted).toBe(true)
			expect(provider.calls).toHaveLength(1)
			expect(executed.count).toBe(0)
			expect(chunks.filter((chunk) => chunk.category === 'tool')).toEqual([])
			expect(agent.context.messages.messages()).toEqual([seed])
		},
	)

	it.each(AUTHORITY_STATES)(
		'external abort in a usage listener preserves only the prior conversation (authority: %s)',
		async (authorized) => {
			const external = new AbortController()
			const executed = createRecorder<[]>()
			const tools = createToolManager()
			tools.add(createTool({ name: 'wait', execute: executed.handler }))
			const provider = createScriptedProvider(
				[
					{
						result: {
							content: 'working',
							tools: [createToolCall({ name: 'wait' })],
							usage: AGENT_USAGE,
						},
					},
				],
				AGENT_SCRIPT_OPTIONS,
			)
			const agent = createAgent(provider, {
				tools,
				signal: external.signal,
				on: { usage: () => external.abort('usage listener ended the run') },
				...(authorized ? { authority: createAuthority() } : {}),
			})
			const seed = agent.context.messages.add({ role: 'user', content: 'go' })
			const stream = agent.stream()
			const chunks = await collect(stream.events)
			expect(await stream.result).toMatchObject({ content: 'working', partial: true })
			expect(external.signal.aborted).toBe(true)
			expect(provider.calls).toHaveLength(1)
			expect(executed.count).toBe(0)
			expect(chunks.filter((chunk) => chunk.category === 'tool')).toEqual([])
			expect(agent.context.messages.messages()).toEqual([seed])
		},
	)

	it('abort in a deny listener preserves only the prior conversation', async () => {
		const executed = createRecorder<[]>()
		const denied = createRecorder<AgentEventMap['deny']>()
		const tools = createToolManager()
		tools.add([
			createTool({ name: 'blocked', execute: executed.handler }),
			createTool({ name: 'allowed', execute: executed.handler }),
		])
		const denial = createToolCall({ id: 'denied', name: 'blocked' })
		const allowed = createToolCall({ id: 'allowed', name: 'allowed' })
		const provider = createScriptedProvider(
			[{ result: { content: 'working', tools: [denial, allowed] } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const authority = createAuthority({
			rules: [
				{
					match: (context) => context.call.name === 'blocked',
					zone: 'r',
					allowed: false,
					reason: 'blocked',
				},
			],
		})
		const agent = createAgent(provider, { tools, authority })
		agent.emitter.on('deny', (call, reason) => {
			denied.handler(call, reason)
			agent.abort('deny listener ended the run')
		})
		const seed = agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		expect(await stream.result).toMatchObject({ content: 'working', partial: true })
		expect(denied.calls).toEqual([[denial, 'blocked']])
		expect(provider.calls).toHaveLength(1)
		expect(executed.count).toBe(0)
		expect(chunks.filter((chunk) => chunk.category === 'tool')).toEqual([])
		expect(agent.context.messages.messages()).toEqual([seed])
	})

	it('delivers agent abort inside the tool handler without authority', async () => {
		const entered = Promise.withResolvers<void>()
		const observed = createRecorder<[unknown]>()
		const tools = createToolManager()
		tools.add(
			createTool({
				name: 'wait',
				execute: async (_args, context) => {
					entered.resolve()
					await waitForAbort(context.signal)
					observed.handler(context.signal.reason)
					return 'stopped'
				},
			}),
		)
		const provider = createScriptedProvider(
			[{ result: { content: 'working', tools: [createToolCall({ name: 'wait' })] } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools })
		const stream = agent.stream()
		try {
			await entered.promise
			agent.abort('request ended')
			expect(await stream.result).toMatchObject({ content: 'working', partial: true })
			expect(observed.calls).toEqual([['request ended']])
			expect(provider.calls).toHaveLength(1)
			expect(agent.status).toBe('done')
		} finally {
			await stream.result
		}
	})

	it('delivers the run deadline inside an authorized tool handler', async () => {
		const observed = createRecorder<[boolean]>()
		const signals = createRecorder<[AbortSignal]>()
		const tools = createToolManager()
		tools.add(
			createTool({
				name: 'wait',
				execute: async (_args, context) => {
					signals.handler(context.signal)
					await waitForAbort(context.signal)
					observed.handler(context.signal.aborted)
					return 'deadline observed'
				},
			}),
		)
		const provider = createScriptedProvider(
			[{ result: { content: 'working', tools: [createToolCall({ name: 'wait' })] } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, {
			tools,
			authority: createAuthority(),
			timeout: AGENT_DEADLINE,
		})
		const stream = agent.stream()
		try {
			await waitForCondition(
				'the deadline observer records the aborted tool handler',
				() => observed.count === 1,
				{
					budget: AGENT_DEADLINE * 6,
				},
			)
			expect(observed.calls).toEqual([[true]])
			expect(signals.count).toBe(1)
			expect(signals.calls[0]?.[0]).toBe(provider.calls[0]?.signal)
			expect(await stream.result).toMatchObject({ content: 'working', partial: true })
			expect(provider.calls).toHaveLength(1)
			expect(agent.status).toBe('done')
		} finally {
			await stream.result
		}
	})

	it('waits for a tool that ignores its signal before settling a cancelled run', async () => {
		const entered = Promise.withResolvers<AbortSignal>()
		const completion = Promise.withResolvers<string>()
		const finished = createRecorder<[AgentResult]>()
		const tools = createToolManager()
		tools.add(
			createTool({
				name: 'wait',
				execute: (_args, context) => {
					entered.resolve(context.signal)
					return completion.promise
				},
			}),
		)
		const provider = createScriptedProvider(
			[{ result: { content: 'working', tools: [createToolCall({ name: 'wait' })] } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, on: { finish: finished.handler } })
		const stream = agent.stream()
		try {
			const signal = await entered.promise
			stream.abort('request ended')
			await waitForDelay()
			expect(signal.aborted).toBe(true)
			expect(agent.status).toBe('running')
			expect(finished.count).toBe(0)
			completion.resolve('finished work')
			expect(await stream.result).toMatchObject({ content: 'working', partial: true })
			const chunks = await collect(stream.events)
			expect(chunks).toContainEqual({
				category: 'tool',
				call: createToolCall({ name: 'wait' }),
				result: { id: 'c1', name: 'wait', success: true, value: 'finished work' },
			})
			expect(provider.calls).toHaveLength(1)
			expect(finished.count).toBe(1)
			expect(agent.status).toBe('done')
		} finally {
			completion.resolve('cleanup')
			await stream.result
		}
	})

	it('abort DURING tool execution commits a partial (the tool turn already streamed)', async () => {
		// Turn 1 streams a delta + requests a tool whose handler parks on a gate; aborting
		// while the handler is in flight must stop the loop and commit partial. The first
		// turn's content delta was accumulated, so it surfaces as the partial content.
		const gate = Promise.withResolvers<void>()
		const tools = createToolManager()
		tools.add(
			createTool({
				name: 'slow',
				execute: async () => {
					await gate.promise
					return 'done'
				},
			}),
		)
		const provider = createScriptedProvider(
			[
				{
					result: { content: 'thinking', tools: [{ id: 'c1', name: 'slow', arguments: {} }] },
					deltas: ['think', 'ing'],
				},
				{ result: { content: 'never reached' } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		const drained = collect(stream.events)
		await waitForDelay() // let turn 1 stream + dispatch the tool, parking in execute
		agent.abort()
		gate.resolve() // the tool finishes, but the loop already saw the abort
		await drained
		const result = await stream.result
		expect(result.partial).toBe(true)
		expect(result.content).toBe('thinking')
		expect(agent.status).toBe('done')
		// The loop did NOT advance to turn 2 after the cancel.
		expect(provider.calls).toHaveLength(1)
	})

	it('abort during the between-turns scheduler.yield resolves partial (real scheduler rejects on abort)', async () => {
		// The failure condition: the real `scheduler.yield({ signal })` REJECTS a pending yield when
		// the signal aborts. That rejection is thrown out of the inter-turn pacing point —
		// it must be treated as a cancel (resolve partial), NOT propagated as a genuine error
		// (which would reject the result). An always-tool provider keeps the loop yielding
		// between turns; the abort lands while parked in the real yield.
		const tools = createToolManager()
		tools.add(createLoopTool())
		const scheduler = createScheduler() // the REAL scheduler — yield rejects on abort
		const provider = createScriptedProvider(
			Array.from({ length: 6 }, () => ({
				result: { content: 'turn', tools: [createToolCall({ id: 'c', name: 'loop' })] },
			})),
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, scheduler, limit: 6 })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		const drained = collect(stream.events)
		// Abort on the next microtask so it lands during the first inter-turn yield (the
		// real scheduler's yield is a setTimeout(0) the abort interrupts).
		queueMicrotask(() => agent.abort())
		await drained
		// Resolves partial — the abort-driven yield rejection was caught as a cancel.
		const result = await stream.result
		expect(result.partial).toBe(true)
		expect(agent.status).toBe('done')
		// It stopped well short of the 6-turn script (the cancel landed at a turn boundary).
		expect(provider.calls.length).toBeLessThan(6)
	})

	it('budget exhausting EXACTLY at a turn boundary commits partial before the next turn', async () => {
		// Turn 1's usage crosses max exactly, firing the budget signal. The next turn's top
		// sees the bound aborted and commits partial — only one provider call happened.
		const budget = createTokenBudget({ max: 12, scope: 'total' })
		const tools = createToolManager()
		tools.add(createTool({ name: 'loop', execute: () => 'x' }))
		const provider = createScriptedProvider(
			[
				{
					result: {
						content: 'a',
						tools: [createToolCall({ id: 'c', name: 'loop' })],
						usage: AGENT_USAGE,
					},
				},
				{ result: { content: 'b' } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, budget })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		expect(result.partial).toBe(true)
		expect(provider.calls).toHaveLength(1)
		// Turn 1's content was accumulated as the partial.
		expect(result.content).toBe('a')
	})

	it('a deadline firing DURING tool execution commits partial', async () => {
		// Turn 1 streams + requests a tool whose handler outlives the deadline on real host
		// timers: the deadline expires while the handler is still pending, so the loop commits
		// partial rather than running turn 2. Both periods are real and short — the handler
		// waits several deadlines, which is the only ordering the test depends on.
		const tools = createToolManager()
		tools.add(
			createTool({
				name: 'slow',
				execute: async () => {
					// A handler far longer than the deadline armed following.
					await waitForDelay(AGENT_DEADLINE * 6)
					return 'done'
				},
			}),
		)
		const provider = createScriptedProvider(
			[
				{
					result: { content: 'mid', tools: [{ id: 'c1', name: 'slow', arguments: {} }] },
					deltas: ['mi', 'd'],
				},
				{ result: { content: 'never' } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, timeout: AGENT_DEADLINE })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		const drained = collect(stream.events)
		// Turn 1 streams + dispatches the tool on microtasks, the deadline expires while the
		// handler is still parked, then the handler's own wait elapses and the loop unwinds.
		await drained
		const result = await stream.result
		expect(result.partial).toBe(true)
		expect(result.content).toBe('mid')
		expect(provider.calls).toHaveLength(1)
		expect(agent.status).toBe('done')
	})

	it('abort AFTER the run finished is a harmless no-op', async () => {
		const provider = createScriptedProvider(
			[{ result: { content: 'done', usage: AGENT_USAGE } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate()
		expect(result.partial).toBe(false)
		expect(agent.status).toBe('done')
		// The run already settled; a late abort touches no live handle and does not change
		// the settled result or status.
		agent.abort('too late')
		expect(agent.status).toBe('done')
		expect(result.content).toBe('done')
	})
})

// ── limit boundary ───────────────────────────────────────────────────────────

describe('Agent — limit boundary', () => {
	it('limit:1 runs exactly one turn and never iterates tools', async () => {
		const recorder = createRecorder<[Readonly<Record<string, unknown>>]>()
		const tools = createToolManager()
		tools.add(
			createTool({
				name: 'add',
				execute: (args) => {
					recorder.handler(args)
					return 5
				},
			}),
		)
		// The single turn requests a tool — but with limit:1 the loop appends the assistant
		// tool turn, runs the tool, then the `for` bound stops it BEFORE a second provider
		// call. So exactly one provider call happens and there is no follow-up turn.
		const provider = createScriptedProvider(
			[{ result: { content: 'one', tools: [createToolCall()] } }, { result: { content: 'two' } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, limit: 1 })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const result = await stream.result
		// One provider call only; the tool DID run on that turn (it was dispatched), and a
		// tool chunk was emitted — but no second turn followed.
		expect(provider.calls).toHaveLength(1)
		expect(recorder.count).toBe(1)
		expect(chunks.some((c) => c.category === 'tool')).toBe(true)
		// Limit exhaustion: the single allowed turn requested a tool (unresolved intent) and the limit was
		// then exhausted — the cap-bounded finish reports `partial: true` with whatever the
		// single turn streamed as its content.
		expect(result.partial).toBe(true)
		expect(result.content).toBe('one')
	})

	it('limit:1 with a no-tools turn finishes naturally (not partial)', async () => {
		const provider = createScriptedProvider(
			[{ result: { content: 'final', usage: AGENT_USAGE } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { limit: 1 })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		// A single no-tools turn IS the natural finish — limit was not the stopping reason.
		expect(result.partial).toBe(false)
		expect(result.content).toBe('final')
		expect(provider.calls).toHaveLength(1)
	})

	it('the default limit is DEFAULT_AGENT_LIMIT (10) tool iterations', async () => {
		const tools = createToolManager()
		tools.add(createLoopTool())
		// 20 always-tool turns available, but no explicit limit → the default cap stops it.
		const provider = createScriptedProvider(
			Array.from({ length: 20 }, () => ({
				result: { content: '', tools: [createToolCall({ id: 'c', name: 'loop' })] },
			})),
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		expect(provider.calls).toHaveLength(10)
		// Limit exhaustion: every turn requested the tool, so the last allowed turn still held unresolved
		// intent when the default cap was reached — the outcome is partial (exhausted).
		expect(result.partial).toBe(true)
	})
})

// ── Provider failure modes (scripted) ────────────────────────────────────────

describe('Agent — provider failure modes', () => {
	it('a stream that throws BEFORE the first yield rejects with status error', async () => {
		// Throws on the FIRST `.next()`, before any delta is produced — the provider failing at
		// the very start of the turn. The trailing `yield` keeps it a real generator (and stays
		// reachable to the linter, because the throw is gated on a runtime flag), but the throw
		// fires first so no token ever streams.
		const provider = createThrowingProvider('pre-yield', undefined)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		await expect(agent.generate()).rejects.toThrow('pre-yield')
		expect(agent.status).toBe('error')
	})

	it('a turn with no content, no tools, and no usage settles empty (not partial)', async () => {
		const provider = createScriptedProvider([{ result: { content: '' } }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate()
		// A natural finish with an empty answer — content '', no usage, not partial.
		expect(result).toEqual({ content: '', partial: false })
		expect(result.usage).toBeUndefined()
	})

	it('sums usage across turns where only some report it', async () => {
		const tools = createToolManager()
		tools.add(createAddTool())
		// Turn 1 reports usage, turn 2 (tool follow-up) reports none, turn 3 reports usage.
		const provider = createScriptedProvider(
			[
				{
					result: { content: '', tools: [createToolCall()], usage: AGENT_USAGE },
				},
				{ result: { content: '', tools: [createToolCall({ id: 'c2' })] } }, // no usage
				{ result: { content: 'final', usage: AGENT_USAGE } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, limit: 5 })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		expect(result.content).toBe('final')
		// Only the two reporting turns are summed (5+7+12 doubled), the no-usage turn adds nothing.
		expect(result.usage).toEqual({ prompt: 10, completion: 14, total: 24 })
	})

	it('an empty-string delta is not surfaced as a token chunk but still completes', async () => {
		// The `#provide` step skips zero-length deltas (no empty token chunk), yet the turn
		// still returns its assembled content.
		const provider = createScriptedProvider(
			[{ result: { content: 'ab' }, deltas: ['a', '', 'b'] }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const tokens = chunks.flatMap((c) => (c.category === 'token' ? [c.content] : []))
		// The empty delta dropped out — only 'a' and 'b' surfaced.
		expect(tokens).toEqual(['a', 'b'])
		const result = await stream.result
		expect(result.content).toBe('ab')
	})

	it('T2 -- a genuine (non-abort) provider fault on a LATER turn rejects the run, keeping turn 1s tool results in the conversation', async () => {
		// Turn 1 completes WITH a tool call (so the loop continues, appending the assistant call +
		// the tool result to the conversation); turn 2 throws a PLAIN Error (not a cancel, not a
		// ProviderAbortError) -- a genuine infrastructure fault mid-loop. The run must reject (status
		// error, an `error` event), and the turn-1 tool results already landed in the conversation
		// must survive the rejection (the loop never unwinds them).
		const tools = createToolManager()
		tools.add(createAddTool())
		const provider = createSecondTurnFailureProvider()
		const agent = createAgent(provider, { tools, limit: 5 })
		const events = createRecorders<AgentEventMap, 'error' | 'finish'>(agent.emitter, [
			'error',
			'finish',
		])
		agent.context.messages.add({ role: 'user', content: 'go' })

		await expect(agent.generate()).rejects.toThrow('turn 2 boom')

		expect(agent.status).toBe('error')
		expect(events.error.count).toBe(1)
		expect(events.error.calls[0]?.[0]).toBeInstanceOf(Error)
		expect(events.finish.count).toBe(0)
		// Turn 1's tool call + tool result are still present in the conversation, untouched by the
		// turn-2 rejection.
		const contents = agent.context.messages.messages().map((message) => message.content)
		expect(contents).toContain(JSON.stringify(5))
	})
})

// ── scheduler edge cases ─────────────────────────────────────────────────────

describe('Agent — scheduler edge cases', () => {
	it('a scheduler whose yield rejects for a NON-abort reason rejects the run (genuine fault)', async () => {
		// A buggy scheduler that throws on yield while the signal is NOT aborted — a genuine
		// infrastructure fault, distinct from an abort-driven rejection. It must propagate
		// (reject the result, status error), NOT be swallowed as a cancel.
		const faulty = createFailingScheduler()
		const tools = createToolManager()
		tools.add(createLoopTool())
		const provider = createScriptedProvider(
			[
				{ result: { content: '', tools: [createToolCall({ id: 'c', name: 'loop' })] } },
				{ result: { content: 'unreached' } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, scheduler: faulty, limit: 5 })
		agent.context.messages.add({ role: 'user', content: 'go' })
		// Turn 1 runs, then the inter-turn yield throws (signal not aborted) → reject.
		await expect(agent.generate()).rejects.toThrow('scheduler fault')
		expect(agent.status).toBe('error')
	})

	it('with no scheduler the inter-turn yield is skipped cleanly (the ?. path)', async () => {
		const tools = createToolManager()
		tools.add(createAddTool())
		const provider = createScriptedProvider(
			[{ result: { content: '', tools: [createToolCall()] } }, { result: { content: 'done' } }],
			AGENT_SCRIPT_OPTIONS,
		)
		// No scheduler option → `this.#scheduler?.yield(...)` is a no-op; multi-turn still works.
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		expect(result.content).toBe('done')
		expect(provider.calls).toHaveLength(2)
	})
})

// ── Authority wired into the loop — deeper failure modes ─────────────────────

describe('Agent — authority deeper', () => {
	it('a throwing authority.evaluate FAILS CLOSED: the call is denied, not executed, and the run survives', async () => {
		// A security gate must fail safe: a policy that THROWS must not let the tool run, and
		// must not crash the whole agent. The loop synthesizes a denial (carrying the error's
		// message), feeds it back, and the model continues — exactly like an explicit deny.
		const recorder = createRecorder<[Readonly<Record<string, unknown>>]>()
		const tools = createToolManager()
		tools.add(
			createTool({
				name: 'add',
				execute: (args) => {
					recorder.handler(args)
					return 5
				},
			}),
		)
		const authority = createAuthority({
			rules: [
				{
					match: () => {
						throw new Error('policy crashed')
					},
					zone: 'z',
				},
			],
		})
		const provider = createScriptedProvider(
			[
				{ result: { content: '', tools: [createToolCall()] } },
				{ result: { content: 'recovered from denial' } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, authority })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const result = await stream.result
		// The tool NEVER ran (fail-closed on execution).
		expect(recorder.count).toBe(0)
		// A tool chunk carries the fail-closed denial, with the thrown message as the reason.
		const toolChunk = chunks.find((c) => c.category === 'tool')
		expect(toolChunk).toEqual({
			category: 'tool',
			call: { id: 'c1', name: 'add', arguments: {} },
			result: {
				success: false,
				id: 'c1',
				name: 'add',
				error: 'denied: policy crashed',
			},
		})
		// The run continued and settled (not rejected) — the model saw the denial.
		expect(result.partial).toBe(false)
		expect(result.content).toBe('recovered from denial')
		expect(agent.status).toBe('done')
		// The next provider call saw the denial as the last tool message.
		const [, second] = provider.calls
		expect(second?.messages.at(-1)?.role).toBe('tool')
		expect(second?.messages.at(-1)?.content).toBe('denied: policy crashed')
	})

	// The error normalizer must provide a nonempty denial reason for an empty error message
	// and contain a throw whose stringification fails.
	it('an empty Error message still yields a readable fail-closed denial', async () => {
		const authority = createAuthority({
			rules: [
				{
					match() {
						throw new Error('')
					},
					zone: 'z',
				},
			],
		})
		const provider = createScriptedProvider(
			[{ result: { content: '', tools: [createToolCall()] } }, { result: { content: 'after' } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const denials = createRecorder<readonly [call: ToolCall, reason: string | undefined]>()
		const agent = createAgent(provider, {
			tools: createSeededToolManager(),
			authority,
			on: { deny: denials.handler },
		})
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		await stream.result

		// The reason is the normalizer's non-empty fallback, not the empty string the raw
		// `error.message` read would have produced.
		expect(denials.calls[0]?.[1]).toBe('unknown failure')
		const toolChunk = chunks.find((chunk) => chunk.category === 'tool')
		expect(toolChunk).toEqual({
			category: 'tool',
			call: { id: 'c1', name: 'add', arguments: {} },
			result: {
				success: false,
				id: 'c1',
				name: 'add',
				error: 'denied: unknown failure',
			},
		})
	})

	it('a hostile throw whose stringification fails still yields a readable fail-closed denial', async () => {
		// `String(value)` throws for a null-prototype object with no `toString`, so the RAW
		// extraction would escape the gate and reject the whole run. The normalizer catches it.
		const hostile: object = Object.create(null)
		const authority = createAuthority({
			rules: [
				{
					match() {
						throw hostile
					},
					zone: 'z',
				},
			],
		})
		const provider = createScriptedProvider(
			[{ result: { content: '', tools: [createToolCall()] } }, { result: { content: 'after' } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const denials = createRecorder<readonly [call: ToolCall, reason: string | undefined]>()
		const agent = createAgent(provider, {
			tools: createSeededToolManager(),
			authority,
			on: { deny: denials.handler },
		})
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()

		// The run SURVIVED the hostile throw and the denial carries readable text.
		expect(result.partial).toBe(false)
		expect(result.content).toBe('after')
		expect(denials.calls[0]?.[1]).toBe('unknown failure')
		const [, second] = provider.calls
		expect(second?.messages.at(-1)?.content).toBe('denied: unknown failure')
	})

	it('deny + budget: a denied call costs no budget, and a later turn can still exhaust it', async () => {
		// The denied call must NOT charge the budget (no tool run, no usage from it). Usage
		// only comes from the provider turns. Turn 1 (usage 12) crosses max=12 at the
		// boundary, so the run commits partial before turn 2 — and the denied tool never ran.
		const recorder = createRecorder<[Readonly<Record<string, unknown>>]>()
		const budget = createTokenBudget({ max: 12, scope: 'total' })
		const tools = createToolManager()
		tools.add(
			createTool({
				name: 'del',
				execute: (args) => {
					recorder.handler(args)
					return 'gone'
				},
			}),
		)
		const authority = createAuthority({
			rules: [{ match: (c) => c.call.name === 'del', zone: 'r', allowed: false, reason: 'no' }],
		})
		const provider = createScriptedProvider(
			[
				{
					result: {
						content: 'a',
						tools: [{ id: 'c1', name: 'del', arguments: {} }],
						usage: AGENT_USAGE,
					},
				},
				{ result: { content: 'b' } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, authority, budget })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		expect(recorder.count).toBe(0) // denied → never executed
		expect(result.partial).toBe(true) // budget crossed at the boundary
		expect(provider.calls).toHaveLength(1)
	})

	it('deny-some / allow-some persists correctly across multiple turns', async () => {
		const allowRec = createRecorder<[Readonly<Record<string, unknown>>]>()
		const denyRec = createRecorder<[Readonly<Record<string, unknown>>]>()
		const tools = createToolManager()
		tools.add([
			createTool({
				name: 'safe',
				execute: (args) => {
					allowRec.handler(args)
					return 'ok'
				},
			}),
			createTool({
				name: 'danger',
				execute: (args) => {
					denyRec.handler(args)
					return 'boom'
				},
			}),
		])
		const authority = createAuthority({
			rules: [{ match: (c) => c.call.name === 'danger', zone: 'r', allowed: false, reason: 'no' }],
		})
		// Two tool turns, each mixing one allowed + one denied call, then a final turn.
		const provider = createScriptedProvider(
			[
				{
					result: {
						content: '',
						tools: [
							{ id: 's1', name: 'safe', arguments: { n: 1 } },
							{ id: 'd1', name: 'danger', arguments: { n: 1 } },
						],
					},
				},
				{
					result: {
						content: '',
						tools: [
							{ id: 'd2', name: 'danger', arguments: { n: 2 } },
							{ id: 's2', name: 'safe', arguments: { n: 2 } },
						],
					},
				},
				{ result: { content: 'final' } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, authority, limit: 5 })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const result = await stream.result
		expect(result.content).toBe('final')
		// `safe` ran on both turns; `danger` never ran.
		expect(allowRec.count).toBe(2)
		expect(denyRec.count).toBe(0)
		// Every danger tool chunk is a denial; every safe one a value.
		const byName = chunks.flatMap((c) =>
			c.category === 'tool' ? [{ name: c.call.name, result: c.result }] : [],
		)
		expect(
			byName
				.filter((e) => e.name === 'danger')
				.every((e) => !e.result.success && e.result.error === 'denied: no'),
		).toBe(true)
		expect(
			byName
				.filter((e) => e.name === 'safe')
				.every((e) => e.result.success && e.result.value === 'ok'),
		).toBe(true)
	})

	it('an authority denying on call.arguments content (not only name) is honoured by the loop', async () => {
		// Deny `transfer` only when amount > 100 — proving the loop hands the matcher the full
		// call (name AND arguments), and the small transfer executes while the large is denied.
		const recorder = createRecorder<[Readonly<Record<string, unknown>>]>()
		const tools = createToolManager()
		tools.add(
			createTool({
				name: 'transfer',
				execute: (args) => {
					recorder.handler(args)
					return `sent ${String(args.amount)}`
				},
			}),
		)
		const authority = createAuthority({
			rules: [
				{
					match: (c) => c.call.name === 'transfer' && Number(c.call.arguments.amount) > 100,
					zone: 'r',
					allowed: false,
					reason: 'over limit',
				},
			],
		})
		const provider = createScriptedProvider(
			[
				{
					result: {
						content: '',
						tools: [
							{ id: 't1', name: 'transfer', arguments: { amount: 50 } }, // allowed
							{ id: 't2', name: 'transfer', arguments: { amount: 500 } }, // denied
						],
					},
				},
				{ result: { content: 'done' } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, authority, limit: 5 })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		await stream.result
		// Only the small transfer executed.
		expect(recorder.count).toBe(1)
		expect(recorder.calls[0]?.[0]).toEqual({ amount: 50 })
		const results = chunks.flatMap((c) =>
			c.category === 'tool' ? [{ id: c.call.id, result: c.result }] : [],
		)
		expect(results).toEqual([
			{
				id: 't1',
				result: { success: true, id: 't1', name: 'transfer', value: 'sent 50' },
			},
			{
				id: 't2',
				result: {
					success: false,
					id: 't2',
					name: 'transfer',
					error: 'denied: over limit',
				},
			},
		])
	})
})

// ── status transitions + getters ─────────────────────────────────────────────

describe('Agent — status transitions and getters', () => {
	it('transitions idle → running → error on a genuine provider failure', async () => {
		const provider = createThrowingProvider('boom', 'x')
		const agent = createAgent(provider)
		expect(agent.status).toBe('idle')
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		expect(agent.status).toBe('running')
		await expect(stream.result).rejects.toThrow('boom')
		expect(agent.status).toBe('error')
	})

	it('exposes a stable id and the live context getter', async () => {
		const provider = createScriptedProvider([{ result: { content: 'hi' } }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, { system: 'sys' })
		// id is a stable non-empty string across reads.
		expect(typeof agent.id).toBe('string')
		expect(agent.id.length).toBeGreaterThan(0)
		expect(agent.id).toBe(agent.id)
		// context is the live AgentContext — adding a message is visible through the getter.
		agent.context.messages.add({ role: 'user', content: 'hi' })
		expect(agent.context.messages.count).toBe(1)
		expect(agent.context.system).toBe('sys')
	})

	// `status` is DERIVED from the live run set, never a stored label a settle can stale. With
	// neither a `window` nor a construction `budget` the concurrency guard admits overlapping
	// runs (guides/agent.md's concurrency clause), so a first run settling `done` while a second
	// is still in flight must NOT be observable as `done`.
	it('reports running while a SECOND overlapping run is still in flight', async () => {
		// `repeat: true` (the default) so the second overlapping run has a turn to replay.
		const provider = createScriptedProvider([{ result: { content: 'a' } }], { delay: 20 })
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'go' })

		const first = agent.stream()
		const second = agent.stream()
		expect(agent.status).toBe('running')

		await first.result
		// The first run settled; the second is still pumping, so the derived answer stays `running`.
		expect(agent.status).toBe('running')

		await second.result
		expect(agent.status).toBe('done')
	})

	// A settled label never outranks a LIVE run: after a run settles `error`, the next `stream()`
	// reads `running` while it is in flight rather than the stale `error`, and settles its own.
	it('a live run outranks the previous run’s settled label', async () => {
		// `repeat: false` makes every call past the first turn throw a genuine (non-abort)
		// error, so the agent settles `error` twice with a live window between them.
		const provider = createScriptedProvider([{ result: { content: 'ok' } }], {
			repeat: false,
			delay: 5,
		})
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'go' })

		await agent.stream().result
		expect(agent.status).toBe('done')

		const second = agent.stream()
		expect(agent.status).toBe('running')
		await expect(second.result).rejects.toThrow('exhausted')
		expect(agent.status).toBe('error')

		// The stale `error` does not survive into the next live run.
		const third = agent.stream()
		expect(agent.status).toBe('running')
		await expect(third.result).rejects.toThrow('exhausted')
		expect(agent.status).toBe('error')
	})
})

// ── ProviderAbortError + isProviderAbortError (the boundary's cancel error) ──
//
// The abstract inference boundary's cancellation error: a `stream` cancelled mid-flight
// throws a ProviderAbortError carrying the partial it had assembled, and
// isProviderAbortError narrows a caught `unknown` back to it. The class + guard are a
// PUBLIC export (the @src/core barrel; documented in guides/agents.md). NOTE: the agent
// loop itself does NOT consume the guard — it distinguishes a cancel from a genuine
// error through the bound signal's `aborted` flag (see the loop's `#provide` catch), so the
// guard is a CONSUMER-facing recovery helper. These pin the class + guard here (in a
// behavioral file) because `errors.ts` is structure-exempt from its own test mirror.
describe('ProviderAbortError + isProviderAbortError', () => {
	it('carries a fixed name/message and the partial result verbatim', () => {
		const partial: ProviderResult = {
			content: 'half',
			tools: [{ id: 'c1', name: 'add', arguments: { a: 1 } }],
			usage: AGENT_USAGE,
		}
		const error = new ProviderAbortError(partial)
		expect(error).toBeInstanceOf(Error)
		expect(error.name).toBe('ProviderAbortError')
		expect(error.message).toBe('provider stream aborted')
		// Same object by identity — a caller recovers exactly what streamed before the cancel.
		expect(error.partial).toBe(partial)
		expect(error.partial.content).toBe('half')
		expect(error.partial.tools).toEqual([{ id: 'c1', name: 'add', arguments: { a: 1 } }])
		expect(error.partial.usage).toEqual(AGENT_USAGE)
	})

	it('accepts a minimal partial (empty content, no tools/usage)', () => {
		const error = new ProviderAbortError({ content: '' })
		expect(error.partial.content).toBe('')
		expect(error.partial.tools).toBeUndefined()
		expect(error.partial.usage).toBeUndefined()
	})

	it('the guard is true for a real one (and narrows) and false for everything else', () => {
		const real: unknown = new ProviderAbortError({ content: 'recoverable' })
		expect(isProviderAbortError(real)).toBe(true)
		// After narrowing, the partial is reachable without a cast — fold the guarded read into
		// a plain value (an empty string when it somehow failed to narrow) so the assertion is
		// unconditional, never an `expect` inside an `if`.
		const narrowed = isProviderAbortError(real) ? real.partial.content : ''
		expect(narrowed).toBe('recoverable')
		// A plain Error, a shape-imposter, and non-error values are all rejected (it is an
		// `instanceof` check, not duck typing).
		expect(isProviderAbortError(new Error('provider stream aborted'))).toBe(false)
		expect(isProviderAbortError({ name: 'ProviderAbortError', partial: { content: '' } })).toBe(
			false,
		)
		expect(isProviderAbortError(null)).toBe(false)
		expect(isProviderAbortError(undefined)).toBe(false)
		expect(isProviderAbortError('aborted')).toBe(false)
		expect(isProviderAbortError(0)).toBe(false)
		expect(isProviderAbortError(false)).toBe(false)
	})
})

// ── Emitter — the PUSH observation surface ──────────────────────────────────
//
// Alongside the PULL `AgentChunk` stream, the Agent exposes a typed `emitter`
// (`AgentEventMap`) carrying lifecycle + usage/tool/deny moments for fire-and-forget
// observers — NOT per-token (there is no `token` event; deltas stay the stream's job).
// Every event is emitted directly; the emitter isolates a listener throw (it can never
// escape into the settle and wakeup settle-once / wake-park loop) and routes it to the emitter's
// own `error` handler (the `error` option). These pin: each event fires at the right
// moment with the right payload; the `on?` option wires initial listeners; a cancelled
// run emits `abort` THEN `finish` (the partial); the load-bearing listener-error isolation
// (a throwing observer cannot corrupt the run, yet the error handler fires); and that
// `generate()` and `stream()` drive the SAME events (they share `#execute`).

// The AgentEventMap event names recorded across the emitter tests — fed to `createRecorders`
// from @orkestrel/test (the per-event wiring lives in the package; this file
// keeps only the names its scenarios observe). Returned recorders assert what fired, in
// what order, with which payload, exactly as the local bundle did. `createRecorders` takes its
// event map from an explicit type argument: `TMap` appears only inside the generic `on` method
// of its source parameter, which yields no inference candidate, so both arguments are named at
// every call site.

describe('Agent — emitter (push observation surface)', () => {
	it('a no-tools run fires start → turn → usage → finish with the right payloads', async () => {
		const provider = createScriptedProvider(
			[{ result: { content: 'hello', usage: AGENT_USAGE } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider)
		const events = createRecorders<AgentEventMap, AgentEventName>(agent.emitter, AGENT_EVENTS)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate()
		// `start` once, carrying the agent id; one `turn` (index 0); usage once; finish once.
		expect(events.start.calls).toEqual([[agent.id]])
		expect(events.turn.calls).toEqual([[0]])
		expect(events.usage.calls).toEqual([[AGENT_USAGE]])
		expect(events.finish.calls).toEqual([[result]])
		expect(events.finish.calls[0]?.[0]).toEqual({
			content: 'hello',
			usage: AGENT_USAGE,
			partial: false,
		})
		// A clean no-tools, non-cancel run fires neither `tool` / `deny` / `error` / `abort`.
		expect(events.tool.count).toBe(0)
		expect(events.deny.count).toBe(0)
		expect(events.error.count).toBe(0)
		expect(events.abort.count).toBe(0)
	})

	it('fires one turn event per iteration (count === turns run)', async () => {
		const tools = createToolManager()
		tools.add(createLoopTool())
		// Always-tool script capped at 3 → exactly 3 iterations.
		const provider = createScriptedProvider(
			Array.from({ length: 10 }, () => ({
				result: { content: '', tools: [createToolCall({ id: 'c', name: 'loop' })] },
			})),
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, limit: 3 })
		const events = createRecorders<AgentEventMap, AgentEventName>(agent.emitter, AGENT_EVENTS)
		agent.context.messages.add({ role: 'user', content: 'go' })
		await agent.generate()
		expect(provider.calls).toHaveLength(3)
		// One `turn` per iteration, indices 0,1,2 in order.
		expect(events.turn.calls).toEqual([[0], [1], [2]])
	})

	it('a tool run fires tool + usage with the dispatched call/result and summed usage', async () => {
		const tools = createToolManager()
		tools.add(createAddTool())
		const provider = createScriptedProvider(
			[
				{
					result: {
						content: '',
						tools: [{ id: 'c1', name: 'add', arguments: { a: 2 } }],
						usage: AGENT_USAGE,
					},
				},
				{ result: { content: 'sum 5', usage: AGENT_USAGE } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, limit: 5 })
		const events = createRecorders<AgentEventMap, AgentEventName>(agent.emitter, AGENT_EVENTS)
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		// One `tool` event, carrying the executed call + its real result (mirrors the chunk).
		expect(events.tool.calls).toEqual([
			[
				{ id: 'c1', name: 'add', arguments: { a: 2 } },
				{ success: true, id: 'c1', name: 'add', value: 5 },
			],
		])
		// Two usage events (one per reporting turn); finish carries the summed usage.
		expect(events.usage.count).toBe(2)
		expect(result.usage).toEqual({ prompt: 10, completion: 14, total: 24 })
		expect(events.finish.calls).toEqual([[result]])
	})

	it('fires deny (call + reason) when an authority denies a call', async () => {
		const recorder = createRecorder<[Readonly<Record<string, unknown>>]>()
		const tools = createToolManager()
		tools.add(
			createTool({
				name: 'del',
				execute: (args) => {
					recorder.handler(args)
					return 'gone'
				},
			}),
		)
		const authority = createAuthority({
			rules: [
				{ match: (c) => c.call.name === 'del', zone: 'r', allowed: false, reason: 'blocked' },
			],
		})
		const provider = createScriptedProvider(
			[
				{ result: { content: '', tools: [{ id: 'd1', name: 'del', arguments: { id: 'x' } }] } },
				{ result: { content: 'understood' } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, authority })
		const events = createRecorders<AgentEventMap, AgentEventName>(agent.emitter, AGENT_EVENTS)
		agent.context.messages.add({ role: 'user', content: 'go' })
		await agent.generate()
		// The tool never ran; `deny` fired once carrying the call + the RULE's reason (not the
		// formatted `denied: …` error — that is the ToolResult's; the event carries the reason).
		expect(recorder.count).toBe(0)
		expect(events.deny.calls).toEqual([
			[{ id: 'd1', name: 'del', arguments: { id: 'x' } }, 'blocked'],
		])
		// A `tool` event still fires for the denied call (carrying the denial result), in parity
		// with the chunk stream.
		expect(events.tool.calls).toEqual([
			[
				{ id: 'd1', name: 'del', arguments: { id: 'x' } },
				{ success: false, id: 'd1', name: 'del', error: 'denied: blocked' },
			],
		])
	})

	it('a fail-closed (throwing) authority fires deny with the thrown reason', async () => {
		const tools = createToolManager()
		tools.add(createAddTool())
		const authority = createAuthority({
			rules: [
				{
					match: () => {
						throw new Error('policy crashed')
					},
					zone: 'z',
				},
			],
		})
		const provider = createScriptedProvider(
			[
				{ result: { content: '', tools: [createToolCall()] } },
				{ result: { content: 'recovered' } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, authority })
		const events = createRecorders<AgentEventMap, AgentEventName>(agent.emitter, AGENT_EVENTS)
		agent.context.messages.add({ role: 'user', content: 'go' })
		await agent.generate()
		// Fail-closed: `deny` carries the thrown error's message as the reason.
		expect(events.deny.calls).toEqual([
			[{ id: 'c1', name: 'add', arguments: {} }, 'policy crashed'],
		])
	})

	it('fires error (not finish) on a genuine provider failure', async () => {
		const provider = createThrowingProvider('boom', 'partial')
		const agent = createAgent(provider)
		const events = createRecorders<AgentEventMap, AgentEventName>(agent.emitter, AGENT_EVENTS)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		await expect(agent.generate()).rejects.toThrow('boom')
		// `error` fired once carrying the thrown value; `finish` / `abort` did NOT fire.
		expect(events.error.count).toBe(1)
		const reported = events.error.calls[0]?.[0]
		expect(reported).toBeInstanceOf(Error)
		// Narrow with `instanceof` (never `as`) to read the message off the reported error.
		expect(reported instanceof Error ? reported.message : undefined).toBe('boom')
		expect(events.finish.count).toBe(0)
		expect(events.abort.count).toBe(0)
	})

	it('a cancelled run fires abort THEN finish (the partial) — the documented semantics', async () => {
		const gate = Promise.withResolvers<void>()
		// A provider that streams one delta then parks on a gate, giving a window to abort.
		const provider = createAbortingGatedProvider(gate)
		// Record the ORDER abort vs finish fire in, to prove abort precedes finish.
		const order: string[] = []
		const agent = createAgent(provider, {
			on: {
				abort: () => order.push('abort'),
				finish: () => order.push('finish'),
			},
		})
		const events = createRecorders<AgentEventMap, AgentEventName>(agent.emitter, AGENT_EVENTS)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		const drained = collect(stream.events)
		await waitForDelay()
		agent.abort('user navigated away')
		gate.resolve()
		await drained
		const result = await stream.result
		// The settled result is the partial — content accumulated before the cancel.
		expect(result).toEqual({ content: 'part', partial: true })
		// `abort` fired once carrying the cancel reason; `finish` fired once with the partial.
		expect(events.abort.calls).toEqual([['user navigated away']])
		expect(events.finish.calls).toEqual([[result]])
		expect(events.error.count).toBe(0)
		// And in that ORDER: abort before finish (so observers see "cancelled" then the outcome).
		expect(order).toEqual(['abort', 'finish'])
	})

	it('a pre-aborted external signal fires abort + finish (empty partial), never error', async () => {
		const controller = new AbortController()
		controller.abort('preempted')
		const provider = createScriptedProvider(
			[{ result: { content: 'never' } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { signal: controller.signal })
		const events = createRecorders<AgentEventMap, AgentEventName>(agent.emitter, AGENT_EVENTS)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate()
		expect(result).toEqual({ content: '', partial: true })
		// The provider was never called, but the lifecycle still observes start + a turn +
		// abort + finish (the empty partial).
		expect(events.start.count).toBe(1)
		expect(events.turn.calls).toEqual([[0]])
		expect(events.abort.calls).toEqual([['preempted']])
		expect(events.finish.calls).toEqual([[result]])
		expect(events.error.count).toBe(0)
	})

	it('a cap-bounded finish fires finish only (a cap is NOT a cancel — no abort)', async () => {
		const tools = createToolManager()
		tools.add(createLoopTool())
		const provider = createScriptedProvider(
			Array.from({ length: 10 }, () => ({
				result: { content: '', tools: [createToolCall({ id: 'c', name: 'loop' })] },
			})),
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, limit: 3 })
		const events = createRecorders<AgentEventMap, AgentEventName>(agent.emitter, AGENT_EVENTS)
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		// Limit-exhaustion with unresolved tool intent is NOT a cancel — `finish` fires,
		// `abort` does not (an `exhaust` event fires instead, covered by the limit-exhaustion block).
		expect(result.partial).toBe(true)
		expect(events.finish.count).toBe(1)
		expect(events.abort.count).toBe(0)
	})

	it('the on? option wires initial listeners at construction', async () => {
		const finishRec = createRecorder<[result: AgentResult]>()
		const startRec = createRecorder<[id: string]>()
		// Pass listeners through the reserved `on` option — they must fire without a later .on().
		const agent = createAgent(
			createScriptedProvider([{ result: { content: 'ok' } }], AGENT_SCRIPT_OPTIONS),
			{
				on: { start: startRec.handler, finish: finishRec.handler },
			},
		)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate()
		expect(startRec.calls).toEqual([[agent.id]])
		expect(finishRec.calls).toEqual([[result]])
	})

	it('EMIT SAFETY: a throwing tool listener cannot corrupt the run, and routes to the error handler', async () => {
		const tools = createToolManager()
		tools.add(createAddTool())
		const provider = createScriptedProvider(
			[
				{ result: { content: '', tools: [createToolCall()], usage: AGENT_USAGE } },
				{ result: { content: 'final answer', usage: AGENT_USAGE } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const errors = createRecorder<readonly [error: unknown, event: string]>()
		const agent = createAgent(provider, { tools, limit: 5, error: errors.handler })
		const events = createRecorders<AgentEventMap, AgentEventName>(agent.emitter, AGENT_EVENTS)
		const thrown = new Error('observer blew up')
		// A buggy `tool` observer that throws every time it fires.
		agent.emitter.on('tool', () => {
			throw thrown
		})
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		// THE LOAD-BEARING ASSERTION: the run is UNCORRUPTED — it settled the correct final
		// content + summed usage despite the throwing listener (the throw never escaped `#execute`).
		expect(result).toEqual({
			content: 'final answer',
			usage: { prompt: 10, completion: 14, total: 24 },
			partial: false,
		})
		// The throw was routed to the emitter's error handler — (error, event) order.
		expect(errors.calls).toEqual([[thrown, 'tool']])
		// Every OTHER event still fired normally — the buggy listener didn't suppress siblings.
		expect(events.start.count).toBe(1)
		expect(events.turn.calls).toEqual([[0], [1]])
		expect(events.usage.count).toBe(2)
		expect(events.finish.calls).toEqual([[result]])
		// The non-throwing `tool` recorder still saw the dispatched call (sibling isolation).
		expect(events.tool.count).toBe(1)
	})

	it('EMIT SAFETY: a throwing error handler neither escapes nor recurses', async () => {
		const tools = createToolManager()
		tools.add(createAddTool())
		const provider = createScriptedProvider(
			[{ result: { content: '', tools: [createToolCall()] } }, { result: { content: 'done' } }],
			AGENT_SCRIPT_OPTIONS,
		)
		// Count how many times the error handler is INVOKED — it must be exactly once
		// (no recursion) even though it itself throws.
		const errors = createRecorder<readonly [error: unknown, event: string]>()
		const agent = createAgent(provider, {
			tools,
			limit: 5,
			error: (error, event) => {
				errors.handler(error, event)
				throw new Error('error handler blew up too')
			},
		})
		agent.emitter.on('tool', () => {
			throw new Error('tool listener blew up')
		})
		agent.context.messages.add({ role: 'user', content: 'go' })
		// The run STILL settles cleanly — neither the tool-listener throw nor the
		// error-handler throw escaped into the loop.
		const result = await agent.generate()
		expect(result).toEqual({ content: 'done', partial: false })
		expect(agent.status).toBe('done')
		// The error handler fired exactly once (its own throw was swallowed, never re-entered —
		// so it could not recurse).
		expect(errors.count).toBe(1)
		expect(errors.calls[0]?.[1]).toBe('tool')
	})

	it('generate() and stream() drive the SAME events for the same script (parity)', async () => {
		const script: readonly ScriptedTurn[] = [
			{
				result: { content: '', tools: [createToolCall()], usage: AGENT_USAGE },
				deltas: [],
			},
			{ result: { content: 'sum 5', usage: AGENT_USAGE }, deltas: ['sum', ' 5'] },
		]
		// generate() path.
		const a = createAgent(createScriptedProvider(script, AGENT_SCRIPT_OPTIONS), {
			tools: createSeededToolManager(),
			limit: 5,
		})
		const ea = createRecorders<AgentEventMap, AgentEventName>(a.emitter, AGENT_EVENTS)
		a.context.messages.add({ role: 'user', content: 'go' })
		const ra = await a.generate()
		// stream() path — same script, fully drained.
		const b = createAgent(createScriptedProvider(script, AGENT_SCRIPT_OPTIONS), {
			tools: createSeededToolManager(),
			limit: 5,
		})
		const eb = createRecorders<AgentEventMap, AgentEventName>(b.emitter, AGENT_EVENTS)
		b.context.messages.add({ role: 'user', content: 'go' })
		const stream = b.stream()
		await collect(stream.events)
		const rb = await stream.result
		// Same settled result, and the SAME push events fired (both share `#execute`).
		expect(rb).toEqual(ra)
		expect(eb.turn.calls).toEqual(ea.turn.calls)
		expect(eb.usage.count).toBe(ea.usage.count)
		expect(eb.tool.calls).toEqual(ea.tool.calls)
		expect(eb.finish.calls).toEqual(ea.finish.calls)
		// Both fired `tool` once, `usage` twice, two turns, one finish, no abort/error.
		expect(ea.tool.count).toBe(1)
		expect(ea.usage.count).toBe(2)
		expect(ea.turn.calls).toEqual([[0], [1]])
		expect(ea.finish.count).toBe(1)
		expect(ea.abort.count).toBe(0)
		expect(ea.error.count).toBe(0)
	})
})

// ── Automatic compaction (the context `window` budget) ───────────────────────
//
// The context budget measures the working prompt and triggers compaction at its ceiling.
describe('Agent — automatic compaction (context window budget)', () => {
	it('fires when the prompt reaches the window, continues on the compacted view, and rebuilds smaller', async () => {
		// An earlier exchange sits before the run's request 'go', and the window sits one token preceding
		// the opening prompt, so the pre-first-turn check holds and turn 1's appends cross it:
		//  • Turn 1 sees `[earlier, reply, go]` (3 messages) and appends asst(40x) + tool("5") → EXHAUSTED
		//    → compact() (keep 0) folds the 2 messages before the request into `recap of 2`; the
		//    working array rebuilds to `[<recap of 2>, go, 40x, "5"]` (4 messages).
		//  • Turn 2 appends asst(40y) + tool("5") → still over the window → compact() has nothing
		//    before the request to fold, so it returns `undefined` and the run latches futile.
		//  • Turn 3 (no tools) answers 'the answer is 42'.
		// So compaction fires EXACTLY once; without it turn 2 would see 5 messages. Record the
		// conversation's own `compact` event (the observability surface — NO added Agent event).
		const conversations = createConversationManager({
			summarize: createStubSummarizer().summarize,
			keep: 0,
		})
		const conversation = conversations.add()
		conversation.add([
			{ role: 'user', content: 'h'.repeat(40) },
			{ role: 'assistant', content: 'k'.repeat(40) },
			{ role: 'user', content: 'go' },
		])
		const tools = createToolManager()
		tools.add(createAddTool())
		const provider = createScriptedProvider(COMPACT_SCRIPT, AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, {
			conversations,
			tools,
			window: createBudget({
				max: estimateMessages(conversation.view()) + 1,
				consumer: estimateMessages,
			}),
			limit: 5,
		})
		const compacted = createRecorders<ConversationEventMap, 'compact'>(conversation.emitter, [
			'compact',
		])

		const result = await agent.generate()

		// (a) Auto-compaction fired mid-run — EXACTLY one fold, of the earlier exchange alone.
		expect(conversation.sections.length).toBe(1)
		expect(conversation.sections[0]?.messages.map((message) => message.content)).toEqual([
			'h'.repeat(40),
			'k'.repeat(40),
		])
		// (b) The run still produced the CORRECT final answer (the loop continued on the compacted
		// view through to turn 3 — proving the rebuilt working array stayed a valid prompt).
		expect(result.content).toBe('the answer is 42')
		expect(result.partial).toBe(false)
		// (c) The conversation's `compact` event fired once, carrying the section.
		expect(compacted.compact.count).toBe(1)
		expect(compacted.compact.calls[0]?.[0]?.summary).toBe('recap of 2')
		// (d) The REBUILD shrank the prompt: turn 2 ran on 4 messages instead of the uncompacted 5,
		// and the request stayed live in every prompt.
		const promptSizes = provider.calls.map((call) => call.messages.length)
		expect(promptSizes).toEqual([3, 4, 6])
		expect(provider.calls.map((call) => call.messages.some((one) => one.content === 'go'))).toEqual(
			[true, true, true],
		)
	})

	it('does NOT fire when the prompt stays below the window (same answer, budget holds the FULL prompt size)', async () => {
		// A HIGH max (10_000) the prompt never reaches → no fold, yet the multi-turn run still
		// produces the same answer. With NO compaction the working array only grows, so the LAST
		// between-turns check (turn 2) measures the whole accumulated prompt `[go, 40x(+calls), "5",
		// 40y(+calls), "5"]` -- 10_000 leaves ample headroom over that genuine estimate either way.
		const window = createBudget({ max: 10_000, consumer: estimateMessages })
		const { agent, conversation } = seedCompactionAgent(window)
		const compacted = createRecorders<ConversationEventMap, 'compact'>(conversation.emitter, [
			'compact',
		])

		const result = await agent.generate()

		expect(conversation.sections.length).toBe(0)
		expect(compacted.compact.count).toBe(0)
		expect(result.content).toBe('the answer is 42')
		expect(result.partial).toBe(false)
		// The budget was re-measured each turn against the ABSOLUTE prompt and never crossed the
		// ceiling. Its final value is turn 2's full prompt, including message overhead and tool calls.
		const turn2Prompt: readonly Message[] = [
			{ id: 'u', role: 'user', content: 'go' },
			{ id: 'a1', role: 'assistant', content: 'x'.repeat(40), calls: [createToolCall()] },
			{ id: 't1', role: 'tool', content: JSON.stringify(5) },
			{
				id: 'a2',
				role: 'assistant',
				content: 'y'.repeat(40),
				calls: [createToolCall({ id: 'c2' })],
			},
			{ id: 't2', role: 'tool', content: JSON.stringify(5) },
		]
		expect(window.consumed).toBe(estimateMessages(turn2Prompt))
		expect(window.consumed).toBe(65)
		expect(window.exhausted).toBe(false)
	})

	it('is PURELY ADDITIVE — with NO window budget the injected conversation is never compacted (regression)', async () => {
		// The SAME scenario (injected conversation, same multi-turn script) with NO `window` budget.
		// The trigger block is skipped entirely, so the conversation is NEVER folded — and the run
		// produces the identical final answer the windowed run produced. This is the byte-for-byte
		// additive proof: omitting `window` leaves the loop exactly as the cost-budget-only path.
		const { agent, conversation } = seedCompactionAgent(undefined)
		const compacted = createRecorders<ConversationEventMap, 'compact'>(conversation.emitter, [
			'compact',
		])

		const result = await agent.generate()

		expect(conversation.sections.length).toBe(0)
		expect(compacted.compact.count).toBe(0)
		expect(result.content).toBe('the answer is 42')
		expect(result.partial).toBe(false)
	})

	it('is a no-op with a NON-SUMMARIZABLE conversation even when a window budget is set (regression)', async () => {
		// A LOW-max window budget but the DEFAULT conversation (no summarizer ⇒ `summarizable` is
		// false). The trigger's `active.summarizable === true` guard fails, so the whole block is
		// skipped: the multi-turn loop runs exactly as the no-window path and ends correctly — and the
		// budget is never consumed. This preserves the shipped behavior (a conversation that can't fold
		// is never auto-compacted, and the loop never throws the SUMMARIZER error).
		const window = createBudget({ max: 1, consumer: estimateMessages })
		const tools = createToolManager()
		tools.add(createAddTool())
		const provider = createScriptedProvider(COMPACT_SCRIPT, AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, { tools, window, limit: 5 })
		expect(agent.context.conversations.active?.summarizable).toBe(false)
		agent.context.messages.add({ role: 'user', content: 'go' })

		const result = await agent.generate()

		expect(result.content).toBe('the answer is 42')
		expect(result.partial).toBe(false)
		// Three scripted turns ran (two tool turns + the final), none over-running the script.
		expect(provider.calls).toHaveLength(3)
		// The window budget was never charged (non-summarizable conversation ⇒ the trigger is skipped).
		expect(window.consumed).toBe(0)
	})
})

// ── Automatic compaction — production hardening ──────────────────────────────
//
// Beyond the between-turns preceding trigger, the production path adds: a PRE-FIRST-TURN check (a
// resumed / long conversation whose INITIAL prompt already exceeds the window compacts BEFORE the
// first provider call, not only after a tool turn); a NON-FATAL summarizer failure (a thrown auto
// `compact()` does NOT crash the run — it is caught, surfaced as a `fault` event, and the run
// continues); and the FUTILE-COMPACTION guard (a `compact()` that folds nothing while still over the
// window latches a per-run flag that STOPS auto-compacting for the rest of the run — no per-turn
// churn — letting the over-window prompt proceed to the provider). All deterministic (scripted
// provider + the real `estimateMessages`), all PURELY ADDITIVE atop the prior loop. The `window`
// budget reuses the same `contextBudget` / estimator as the block preceding.
describe('Agent — automatic compaction (production hardening)', () => {
	// A no-tools provider that ALWAYS finishes its turn with a fixed answer regardless of the prompt
	// content (so a run is exactly ONE provider turn) — the cleanest driver for the PRE-FIRST-TURN
	// check (the only compaction point when there is no tool iteration). `recorded: true` so a test can
	// read what the single provider call actually saw.

	it('PRE-FIRST-TURN: a conversation whose INITIAL prompt already exceeds the window compacts before the first provider call', async () => {
		// Seed the conversation's live tail with ONE big earlier user message (200 chars ⇒
		// ceil(200/4) = 50 tokens) and the short request BEFORE the run. With a window max of 20 and NO
		// system prompt, the build()'d initial prompt already exceeds the window — so the loop's
		// PRE-FIRST-TURN `#trim` fires `compact()` (keep 0 folds the message before the request into
		// `recap of 1`) and rebuilds BEFORE turn 0. The single provider call must therefore see the
		// COMPACTED view (the framed `recap of 1`, then the request), not the 200-char seed — the
		// proof the pre-first-turn check ran ahead of the provider.
		const conversations = createConversationManager({
			summarize: createStubSummarizer().summarize,
			keep: 0,
		})
		const conversation = conversations.add() // auto-activates — the agent's message source
		const seed = 'q'.repeat(200)
		conversation.add({ role: 'user', content: seed })
		conversation.add({ role: 'user', content: 'hi' })
		const provider = createAnswerProvider()
		const agent = createAgent(provider, {
			conversations,
			window: createBudget({ max: 20, consumer: estimateMessages }),
			limit: 5,
		})

		const result = await agent.generate()

		// Compaction fired BEFORE the first (only) provider turn — one section, authored `recap of 1`.
		expect(conversation.sections.length).toBe(1)
		expect(conversation.sections[0]?.summary).toBe('recap of 1')
		// The single provider call saw the COMPACTED view — the framed recap message, NOT the
		// 200-char seed. view() prefixes the section summary with the lean RECAP label.
		expect(provider.calls).toHaveLength(1)
		expect(provider.calls[0]?.messages.map((message) => message.content)).toEqual([
			`${CONVERSATION_RECAP_PREFIX}recap of 1`,
			'hi',
		])
		expect(JSON.stringify(provider.calls[0]?.messages)).not.toContain(seed)
		// The run still produced the correct final answer through the compacted context.
		expect(result.content).toBe('final answer')
		expect(result.partial).toBe(false)
	})

	it('PRE-FIRST-TURN: an UNDER-window initial prompt is left untouched (no spurious fold)', async () => {
		// The mirror guard: a small initial prompt does NOT trigger the pre-first-turn fold, so the
		// provider sees the live message verbatim and no section is created.
		const conversations = createConversationManager({
			summarize: createStubSummarizer().summarize,
			keep: 0,
		})
		const conversation = conversations.add() // auto-activates — the agent's message source
		conversation.add({ role: 'user', content: 'hi' })
		const provider = createAnswerProvider()
		const agent = createAgent(provider, {
			conversations,
			window: createBudget({ max: 10_000, consumer: estimateMessages }),
			limit: 5,
		})

		const result = await agent.generate()

		expect(conversation.sections.length).toBe(0)
		expect(provider.calls[0]?.messages.map((message) => message.content)).toEqual(['hi'])
		expect(result.content).toBe('final answer')
	})

	it('NON-FATAL summarizer failure: a thrown auto compact() does NOT crash the run — it fires fault and continues', async () => {
		// A summarizer that ALWAYS throws, a conversation with keep 0 (so there IS a tail to fold), and
		// a low window crossed by the post-tool-turn prompt. The between-turns `#trim` calls
		// `compact()`, which rejects — the loop CATCHES it (the run does not reject), surfaces a
		// `fault` event, skips compaction that turn, and continues to the final answer. No
		// section is ever created (every fold attempt threw). A MANUAL compact() still throws (asserted
		// separately) — only the agent's AUTO path is resilient.
		const boom = new Error('summarizer exploded')
		const conversations = createConversationManager({
			summarize: async () => {
				throw boom
			},
			keep: 0,
		})
		const conversation = conversations.add() // auto-activates — the agent's message source
		// An earlier exchange gives each fold a slice before the run's request.
		conversation.add([
			{ role: 'user', content: 'Earlier question.' },
			{ role: 'assistant', content: 'Earlier answer.' },
		])
		const tools = createToolManager()
		tools.add(createAddTool())
		const provider = createScriptedProvider(COMPACT_SCRIPT, AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, {
			conversations,
			tools,
			window: createBudget({ max: 12, consumer: estimateMessages }),
			limit: 5,
		})
		const events = createRecorders<AgentEventMap, 'fault' | 'error' | 'finish'>(agent.emitter, [
			'fault',
			'error',
			'finish',
		])
		agent.context.messages.add({ role: 'user', content: 'go' })

		const result = await agent.generate()

		// The run SURVIVED a throwing summarizer — it settled the correct final answer, not partial,
		// and `error` never fired (a non-fatal warn, not a genuine failure).
		expect(result.content).toBe('the answer is 42')
		expect(result.partial).toBe(false)
		expect(events.error.count).toBe(0)
		expect(events.finish.count).toBe(1)
		// `fault` fired (≥ once — the prompt crossed the window each tool turn), carrying the
		// thrown summarizer error verbatim; and NOTHING folded (every attempt threw).
		expect(events.fault.count).toBeGreaterThanOrEqual(1)
		expect(events.fault.calls[0]?.[0]).toBe(boom)
		expect(conversation.sections.length).toBe(0)
		// A MANUAL compact() still PROPAGATES the throw — only the AUTO path is resilient.
		await expect(conversation.compact()).rejects.toThrow('summarizer exploded')
	})

	it('FUTILE guard: a compact() that folds NOTHING while over the window stops auto-compacting for the rest of the run (no churn)', async () => {
		// `keep` is huge (50), so `compact()` ALWAYS folds nothing (count <= keep) and resolves
		// `undefined` — yet the prompt is over the window (a big seed). The FIRST between-turns `#trim`
		// calls compact() → undefined → latches the per-run futile flag, so EVERY later `#trim` returns
		// at once (no further compact() call, no churn). The over-window prompt proceeds to the
		// provider and the run completes. A spy summarizer proves compact() ran (and folded nothing).
		const stub = createStubSummarizer()
		const conversations = createConversationManager({ summarize: stub.summarize, keep: 50 })
		const conversation = conversations.add() // auto-activates — the agent's message source
		const tools = createToolManager()
		tools.add(createAddTool())
		// Each tool turn appends a big assistant message so the absolute prompt stays over the window
		// on every between-turns check (the futile guard must hold across BOTH tool turns).
		const script: readonly ScriptedTurn[] = [
			{ result: { content: 'x'.repeat(80), tools: [createToolCall()] } },
			{ result: { content: 'y'.repeat(80), tools: [createToolCall({ id: 'c2' })] } },
			{ result: { content: 'done' } },
		]
		const provider = createScriptedProvider(script, AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, {
			conversations,
			tools,
			window: createBudget({ max: 12, consumer: estimateMessages }),
			limit: 5,
		})
		const events = createRecorders<AgentEventMap, 'fault' | 'finish'>(agent.emitter, [
			'fault',
			'finish',
		])
		agent.context.messages.add({ role: 'user', content: 'go' })

		const result = await agent.generate()

		// Nothing ever folded (keep 50 ⇒ compact() always a no-op), yet the run completed cleanly.
		expect(conversation.sections.length).toBe(0)
		expect(result.content).toBe('done')
		expect(result.partial).toBe(false)
		expect(events.finish.count).toBe(1)
		// No churn: `compact()` (the stub summarizer) was called AT MOST ONCE — the futile flag
		// short-circuited every later `#trim` (a futile no-op is not a summarizer throw, so no
		// `fault` either).
		expect(stub.calls.length).toBeLessThanOrEqual(1)
		expect(events.fault.count).toBe(0)
		// The over-window run still ran all three scripted turns (the futile prompt proceeded to the
		// provider rather than looping on compaction).
		expect(provider.calls).toHaveLength(3)
	})

	it('folds nothing after a tool aborts the run, and the next run folds the whole exchange first', async () => {
		const stub = createStubSummarizer()
		const conversations = createConversationManager({ summarize: stub.summarize, keep: 0 })
		const conversation = conversations.add()
		conversation.add([
			{ role: 'user', content: 'q'.repeat(40) },
			{ role: 'assistant', content: 'Nice.' },
			{ role: 'user', content: 'go' },
		])
		// The opening prompt fits the window, so only the post-dispatch check can reach it.
		const window = createBudget({
			max: estimateMessages(conversation.view()) + 1,
			consumer: estimateMessages,
		})
		const provider = createScriptedProvider(
			[
				{ result: { content: 'x'.repeat(40), tools: [createToolCall({ name: 'reply' })] } },
				{ result: { content: 'Done.' } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const tools = createToolManager()
		const agent = createAgent(provider, { conversations, tools, window, limit: 5 })
		tools.add(
			createTool({
				name: 'reply',
				execute: () => {
					agent.abort('replied')
					return 'sent'
				},
			}),
		)

		const aborted = await agent.generate()

		expect(aborted.partial).toBe(true)
		expect(stub.calls).toHaveLength(0)
		expect(conversation.sections).toHaveLength(0)
		expect(conversation.messages().map((message) => message.role)).toEqual([
			'user',
			'assistant',
			'user',
			'assistant',
			'tool',
		])

		agent.context.messages.add({ role: 'user', content: 'next' })
		const resumed = await agent.generate()

		expect(resumed.content).toBe('Done.')
		expect(conversation.sections).toHaveLength(1)
		expect(conversation.sections[0]?.messages.map((message) => message.content)).toEqual([
			'q'.repeat(40),
			'Nice.',
			'go',
			'x'.repeat(40),
			'sent',
		])
		expect(provider.calls.at(-1)?.messages.map((message) => message.content)).toEqual([
			`${CONVERSATION_RECAP_PREFIX}recap of 5`,
			'next',
		])
	})
})

// ── Multi-conversation — one agent serving many threads ──────────────────────
//
// The real app pattern: ONE Agent over a `ConversationManager` of threads (the agent's own
// `context.conversations`), switching the ACTIVE conversation per request (NOT an agent per thread).
// Each "request" makes the thread `id` active (creating through `add({ id })` when absent, then
// `switch(id)`), appends the user turn, and runs `generate()`. These prove each conversation
// accumulates its OWN independent history AND compacts INDEPENDENTLY (one conversation's sections
// never leak into another), all served by the SAME agent. Deterministic: a scripted provider + a stub
// summarizer + (for the compaction proof) small per-run window budgets — real behavior.
describe('Agent — multi-conversation (one agent, a ConversationManager of threads)', () => {
	// Drive one "request" on `agent` against the conversation `id` in the agent's registry — the exact
	// per-request switch the app performs: resolve-or-create the thread, make it active, append the user
	// turn, run to completion.

	it('accumulates independent histories across switched conversations (no cross-talk)', async () => {
		// No window (no compaction) — a no-tools provider that echoes the LAST user turn, so each
		// conversation's answers are distinguishable. One agent serves an interleaved A / B / A / B
		// sequence; each conversation's live tail must hold ONLY its own user turns + their answers.
		const provider = createConversationEchoProvider()
		// The manager is the agent's OWN registry (its message source). The context adds a default
		// conversation when the supplied registry is empty, so the agent's registry IS this `manager`.
		const manager = createConversationManager()
		const agent = createAgent(provider, { conversations: manager })

		const a1 = await requestConversation(agent, manager, 'A', 'a-one')
		const b1 = await requestConversation(agent, manager, 'B', 'b-one')
		const a2 = await requestConversation(agent, manager, 'A', 'a-two')
		const b2 = await requestConversation(agent, manager, 'B', 'b-two')

		// Each request answered against ITS OWN conversation's latest user turn.
		expect(a1.content).toBe('answer:a-one')
		expect(b1.content).toBe('answer:b-one')
		expect(a2.content).toBe('answer:a-two')
		expect(b2.content).toBe('answer:b-two')

		// Both named threads exist, each accumulating ONLY its own turns (user + assistant), no
		// cross-talk. (The registry also holds the context's default conversation — never made active
		// by `request` and so never touched — an artifact of the always-active rule.)
		const aContents = manager
			.conversation('A')
			?.messages()
			.map((message) => message.content)
		const bContents = manager
			.conversation('B')
			?.messages()
			.map((message) => message.content)
		expect(aContents).toEqual(['a-one', 'answer:a-one', 'a-two', 'answer:a-two'])
		expect(bContents).toEqual(['b-one', 'answer:b-one', 'b-two', 'answer:b-two'])
		// Neither thread carries a trace of the other's content.
		expect(JSON.stringify(aContents)).not.toContain('b-')
		expect(JSON.stringify(bContents)).not.toContain('a-')
	})

	it('compacts each conversation INDEPENDENTLY — one thread’s sections never leak into another', async () => {
		// One agent WITH a small window + a ConversationManager (keep 0). A no-tools provider that
		// always finishes, so each request is a single turn whose PRE-FIRST-TURN `#trim` compacts the
		// conversation after its accumulated history exceeds the window. Two requests per thread: the
		// 2nd request's pre-first-turn check folds that thread's own accumulated tail into ITS OWN
		// section (retaining ITS OWN originals). The window resets per run (run-entry `clear()`), so the
		// two threads compact on their own schedules with no shared state.
		const { summarize } = createStubSummarizer()
		const manager = createConversationManager({ summarize, keep: 0 })
		const provider = createScriptedProvider([{ result: { content: 'ok' } }], {
			name: 'ans',
			recorded: true,
			repeat: true,
		})
		// A window small enough that a 2nd-request prompt (prior user "alpha-1"/"bravo-1" + 'ok' answer
		// + new user turn — three messages, each MESSAGE_TOKEN_OVERHEAD (4) alone already at/near the
		// 10-token ceiling) exceeds it, but a 1st-request prompt (one short user
		// turn: content ~2 tokens + 4 overhead = ~6) does not (max 10). The manager (with its summarizer)
		// is the agent's OWN registry, so each thread is summarizable.
		const agent = createAgent(provider, {
			conversations: manager,
			window: createBudget({ max: 10, consumer: estimateMessages }),
			limit: 5,
		})

		// Round 1 — each thread's first request: a single short user turn, under the window ⇒ no fold.
		await requestConversation(agent, manager, 'A', 'alpha-1')
		await requestConversation(agent, manager, 'B', 'bravo-1')
		expect(manager.conversation('A')?.sections.length).toBe(0)
		expect(manager.conversation('B')?.sections.length).toBe(0)

		// Round 2 — each thread now has [user, 'ok'] accumulated; the new user turn (added before
		// generate) pushes the prompt over the window, so the pre-first-turn `#trim` folds THAT thread's
		// earlier exchange into one section and keeps the second request live.
		await requestConversation(agent, manager, 'A', 'alpha-2')
		await requestConversation(agent, manager, 'B', 'bravo-2')

		const a = manager.conversation('A')
		const b = manager.conversation('B')
		// Each thread compacted EXACTLY once, into its OWN section.
		expect(a?.sections.length).toBe(1)
		expect(b?.sections.length).toBe(1)
		// INDEPENDENCE: each section RETAINS only its OWN thread's originals — A's folded originals are
		// A's turns, B's are B's. No leakage in either direction.
		const aOriginals = a?.sections[0]?.messages.map((message) => message.content) ?? []
		const bOriginals = b?.sections[0]?.messages.map((message) => message.content) ?? []
		expect(aOriginals).toEqual(['alpha-1', 'ok'])
		expect(bOriginals).toEqual(['bravo-1', 'ok'])
		expect(JSON.stringify(aOriginals)).not.toContain('bravo')
		expect(JSON.stringify(bOriginals)).not.toContain('alpha')
		// And the SAME agent served both — its active conversation is whichever was last switched in.
		expect(agent.context.conversations.active).toBe(b)
	})
})

// Limit exhaustion: the loop stopping because it ran out of turns while the model
// still wanted more tool calls is a distinct, non-cancel cause (`exhausted`) that fires
// `exhaust` INSTEAD of `abort`, still followed by `finish`.
describe('Agent — limit exhaustion', () => {
	it('exhausts the limit with unresolved tool intent: partial, exhaust(limit), no abort, tool ran limit times', async () => {
		const recorder = createRecorder<[Readonly<Record<string, unknown>>]>()
		const tools = createToolManager()
		tools.add(
			createTool({
				name: 'loop',
				execute: (args) => {
					recorder.handler(args)
					return 'again'
				},
			}),
		)
		// Every turn requests the tool -- the model never naturally finishes (repeat: true
		// so a single scripted turn can serve as many calls as the loop makes).
		const provider = createScriptedProvider(
			[{ result: { content: '', tools: [createToolCall({ id: 'c', name: 'loop' })] } }],
			{ ...AGENT_SCRIPT_OPTIONS, repeat: true },
		)
		const order: string[] = []
		const agent = createAgent(provider, {
			tools,
			limit: 2,
			on: {
				exhaust: () => order.push('exhaust'),
				abort: () => order.push('abort'),
				finish: () => order.push('finish'),
			},
		})
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		expect(result.partial).toBe(true)
		expect(provider.calls).toHaveLength(2)
		expect(recorder.count).toBe(2)
		// exhaust fired (carrying the effective limit) INSTEAD of abort, then finish -- in that order.
		expect(order).toEqual(['exhaust', 'finish'])
	})

	it('a natural final answer on the very last allowed turn stays non-partial (no exhaust)', async () => {
		const tools = createToolManager()
		tools.add(createLoopTool())
		const provider = createScriptedProvider(
			[
				{ result: { content: '', tools: [createToolCall({ id: 'c', name: 'loop' })] } },
				{ result: { content: 'done' } },
			],
			AGENT_SCRIPT_OPTIONS,
		)
		const order: string[] = []
		const agent = createAgent(provider, {
			tools,
			limit: 2,
			on: { exhaust: () => order.push('exhaust'), finish: () => order.push('finish') },
		})
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		expect(result.partial).toBe(false)
		expect(result.content).toBe('done')
		expect(order).toEqual(['finish'])
	})

	it('limit: 0 resolves immediately, non-partial, no exhaust, no provider call', async () => {
		const provider = createScriptedProvider(
			[{ result: { content: 'never' } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const order: string[] = []
		const agent = createAgent(provider, {
			limit: 0,
			on: { exhaust: () => order.push('exhaust'), finish: () => order.push('finish') },
		})
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate()
		expect(result).toEqual({ content: '', partial: false })
		expect(provider.calls).toHaveLength(0)
		expect(order).toEqual(['finish'])
	})

	it("a cancel firing during the last turn's post-provider work (tool execute) reports abort, not exhaust", async () => {
		// The tool's own execute() fires the bound external signal mid-authorize/execute, on the
		// run's ONLY allowed turn (limit: 1). The loop still takes the `pending = true; continue`
		// path and exits through the `for` condition (never a `break`) -- the same shape as a genuine
		// exhaustion -- but the signal IS aborted, so this must classify as a cancel: `abort` fires
		// (carrying the reason), `exhaust` must NOT fire.
		const controller = new AbortController()
		const tools = createToolManager()
		tools.add(
			createTool({
				name: 'loop',
				execute: () => {
					controller.abort()
					return 'x'
				},
			}),
		)
		const provider = createScriptedProvider(
			[{ result: { content: '', tools: [createToolCall({ id: 'c', name: 'loop' })] } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const order: string[] = []
		const agent = createAgent(provider, {
			tools,
			limit: 1,
			signal: controller.signal,
			on: {
				exhaust: () => order.push('exhaust'),
				abort: () => order.push('abort'),
				finish: () => order.push('finish'),
			},
		})
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		expect(result.partial).toBe(true)
		expect(order).toEqual(['abort', 'finish'])
	})
})

// Bounded mid-stream budget enforcement: content deltas are charged incrementally as
// estimated tokens against the effective budget, a mid-stream trip folds into the abort
// funnel, and the turn-end reconcile makes the total charge net to the authoritative usage.
describe('Agent — mid-stream budget enforcement + reconcile', () => {
	it('a mid-stream estimated charge crossing the budget aborts the run (partial, abort event)', async () => {
		const budget = createTokenBudget({ max: 5, scope: 'completion' })
		// 10 five-char deltas -- cumulative estimateTokens (ceil(len/4)) crosses 5 well before
		// the turn completes, so the trip lands MID-STREAM, not at the final usage reconcile.
		const deltas = Array.from({ length: 10 }, () => 'abcde')
		const provider = createScriptedProvider(
			[{ result: { content: deltas.join('') }, deltas }],
			AGENT_SCRIPT_OPTIONS,
		)
		const order: string[] = []
		const agent = createAgent(provider, {
			budget,
			on: { abort: () => order.push('abort'), finish: () => order.push('finish') },
		})
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		expect(result.partial).toBe(true)
		expect(order).toEqual(['abort', 'finish'])
		// The cancel landed before all 10 deltas streamed -- the provider genuinely saw its
		// bound signal aborted mid-stream (a scripted provider throws ProviderAbortError only
		// after `signal.aborted` is observed between deltas).
		expect(result.content.length).toBeLessThan(deltas.join('').length)
	})

	it('the turn-end reconcile nets total budget consumption to the authoritative usage (no double-charge, no loss)', async () => {
		const usage: TokenUsage = { prompt: 20, completion: 30, total: 50 }
		const provider = createScriptedProvider(
			[{ result: { content: 'hello world', usage }, deltas: ['hello ', 'world'] }],
			AGENT_SCRIPT_OPTIONS,
		)
		const budgetRecorder = createRecorder<[TokenUsage]>()
		const budget = createBudget<TokenUsage>({
			max: 1_000_000,
			consumer: (value) => {
				budgetRecorder.handler(value)
				return value.total
			},
		}) // generous -- never trips
		const agent = createAgent(provider, { budget })
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate()
		expect(result.partial).toBe(false)
		expect(result.usage).toEqual(usage) // the REPORTED usage is unaffected by budget metering
		expect(computeUsageTotal(budgetRecorder.calls, 'prompt')).toBe(usage.prompt)
		expect(computeUsageTotal(budgetRecorder.calls, 'completion')).toBe(usage.completion)
		expect(computeUsageTotal(budgetRecorder.calls, 'total')).toBe(usage.total)
		// At least one mid-stream charge happened (the content deltas were estimated as they
		// streamed) AND the reconcile happened (more than one consume call for the one turn).
		expect(budgetRecorder.calls.map(([value]) => value).length).toBeGreaterThan(1)
	})

	// A cancel mid-stream is not the only place usage can surface: a provider that OBSERVED
	// usage before the cancel landed carries it on the `ProviderAbortError.partial` too. The
	// abort path must fold it into `result.usage` (mirroring the normal post-turn path) rather
	// than silently dropping the aborted turn's tokens.
	it('a cancel mid-stream carrying partial usage folds it into the settled result.usage', async () => {
		const gate = Promise.withResolvers<void>()
		const abortUsage: TokenUsage = { prompt: 5, completion: 3, total: 8 }
		const provider = createAbortingGatedProvider(gate, abortUsage)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		const drained = collect(stream.events)
		await waitForDelay()
		agent.abort()
		gate.resolve()
		await drained
		const result = await stream.result
		expect(result.partial).toBe(true)
		expect(result.content).toBe('part')
		expect(result.usage).toEqual(abortUsage)
	})

	it('a cancel mid-stream reconciles the budget to the reported partial usage (no double-charge, no loss)', async () => {
		const gate = Promise.withResolvers<void>()
		const abortUsage: TokenUsage = { prompt: 5, completion: 3, total: 8 }
		const provider = createAbortingGatedProvider(gate, abortUsage)
		const budgetRecorder = createRecorder<[TokenUsage]>()
		const budget = createBudget<TokenUsage>({
			max: 1_000_000,
			consumer: (value) => {
				budgetRecorder.handler(value)
				return value.total
			},
		}) // generous -- never trips
		const agent = createAgent(provider, { budget })
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		const drained = collect(stream.events)
		await waitForDelay()
		agent.abort()
		gate.resolve()
		await drained
		const result = await stream.result
		expect(result.partial).toBe(true)
		expect(result.usage).toEqual(abortUsage)
		// Mid-stream estimate(s) + the abort-path residual reconcile net to EXACTLY the reported
		// partial usage -- the same invariant the normal-path reconcile test proves preceding.
		expect(computeUsageTotal(budgetRecorder.calls, 'prompt')).toBe(abortUsage.prompt)
		expect(computeUsageTotal(budgetRecorder.calls, 'completion')).toBe(abortUsage.completion)
		expect(computeUsageTotal(budgetRecorder.calls, 'total')).toBe(abortUsage.total)
	})
})

// Per-run bounds: `limit` / `timeout` / `budget` / `signal` on `AgentRunOptions`
// override the construction defaults (`??` semantics) for that run only; a per-run
// `signal` COMPOSES with (never replaces) the construction `signal`.
describe('Agent — per-run overrides', () => {
	it('a per-run limit overrides the constructed limit', async () => {
		const tools = createToolManager()
		tools.add(createLoopTool())
		const provider = createScriptedProvider(
			[{ result: { content: '', tools: [createToolCall({ id: 'c', name: 'loop' })] } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const order: string[] = []
		const agent = createAgent(provider, {
			tools,
			limit: 10,
			on: { exhaust: () => order.push('exhaust') },
		})
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate({ limit: 1 })
		expect(result.partial).toBe(true)
		expect(provider.calls).toHaveLength(1)
		expect(order).toEqual(['exhaust'])
	})

	it('a per-run signal COMPOSES with the constructed signal -- either aborting cancels the run', async () => {
		// The constructed signal is already aborted; the per-run signal stays quiet.
		const constructionController = new AbortController()
		constructionController.abort()
		const providerA = createScriptedProvider(
			[{ result: { content: 'never' } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agentA = createAgent(providerA, { signal: constructionController.signal })
		agentA.context.messages.add({ role: 'user', content: 'hi' })
		const quietRunSignal = new AbortController().signal
		const resultA = await agentA.generate({ signal: quietRunSignal })
		expect(resultA.partial).toBe(true)
		expect(providerA.calls).toHaveLength(0)

		// The per-run signal aborts; the constructed signal stays quiet.
		const providerB = createScriptedProvider(
			[{ result: { content: 'never' } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agentB = createAgent(providerB) // no constructed signal
		agentB.context.messages.add({ role: 'user', content: 'hi' })
		const runController = new AbortController()
		runController.abort()
		const resultB = await agentB.generate({ signal: runController.signal })
		expect(resultB.partial).toBe(true)
		expect(providerB.calls).toHaveLength(0)
	})

	it('a per-run timeout commits a partial when it elapses', async () => {
		const provider = createScriptedProvider([{ result: { content: 'done' } }], {
			...AGENT_SCRIPT_OPTIONS,
			delay: 50,
		})
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate({ timeout: 5 })
		expect(result.partial).toBe(true)
	})

	it('a per-run budget is the one charged -- the constructed budget stays untouched', async () => {
		const usage: TokenUsage = { prompt: 5, completion: 5, total: 10 }
		const provider = createScriptedProvider(
			[{ result: { content: 'ok', usage } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const constructionBudgetRecorder = createRecorder<[TokenUsage]>()
		const constructionBudget = createBudget<TokenUsage>({
			max: 1_000_000,
			consumer: (value) => {
				constructionBudgetRecorder.handler(value)
				return value.total
			},
		})
		const runBudgetRecorder = createRecorder<[TokenUsage]>()
		const runBudget = createBudget<TokenUsage>({
			max: 1_000_000,
			consumer: (value) => {
				runBudgetRecorder.handler(value)
				return value.total
			},
		})
		const agent = createAgent(provider, { budget: constructionBudget })
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate({ budget: runBudget })
		expect(result.partial).toBe(false)
		expect(constructionBudgetRecorder.calls.map(([value]) => value)).toEqual([])
		expect(runBudgetRecorder.calls.map(([value]) => value).length).toBeGreaterThan(0)
	})
})

// `schema` (like `think`) is a per-run `ProviderStreamOptions` field: composed options
// are passed to `provider.stream`, omitting undefined keys (an options object only when at
// least one of `think` / `schema` is present -- preserving the prior think-only behavior).
describe('Agent — per-run schema', () => {
	it('forwards a per-run schema alone', async () => {
		const provider = createScriptedProvider([{ result: { content: 'ok' } }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const schema: Readonly<Record<string, unknown>> = { type: 'object' }
		await agent.generate({ schema })
		expect(provider.calls[0]?.options).toEqual({ schema })
	})

	it('forwards think AND schema together when both are set', async () => {
		const provider = createScriptedProvider([{ result: { content: 'ok' } }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const schema: Readonly<Record<string, unknown>> = { type: 'object' }
		await agent.generate({ think: true, schema })
		expect(provider.calls[0]?.options).toEqual({ think: true, schema })
	})

	it('omits the options object entirely when neither think nor schema is set (preserved behavior)', async () => {
		const provider = createScriptedProvider([{ result: { content: 'ok' } }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		await agent.generate()
		expect(provider.calls[0]?.options).toBeUndefined()
	})
})

// ── Concurrency guard — a shared construction-level accounting instance (a `window` context
// budget, or a construction `budget` with no per-run override) would race a second concurrent run's
// charges against the same instance; `stream()` (and thus `generate()`) THROWS an `AgentError`
// ('CONCURRENCY') SYNCHRONOUSLY when a run is already in flight AND that hazard applies. A run with
// no window and a per-run `budget` override is exempt (nothing shared to race), and sequential
// (awaited) runs on a construction-budget agent are unaffected (never concurrent).
describe('Agent — concurrency guard (construction window/budget)', () => {
	// A provider whose stream yields one delta then parks on a shared gate, so a test can hold a run
	// "in flight" (its `#runs` handle already added) across a synchronous second `stream()` call.

	it('a construction `window` -- starting a 2nd run while the 1st is in flight throws AgentError(CONCURRENCY); the 1st still completes', async () => {
		const gate = Promise.withResolvers<void>()
		const agent = createAgent(createGatedProvider(gate), {
			window: createBudget({ max: 1_000_000, consumer: estimateMessages }),
		})
		agent.context.messages.add({ role: 'user', content: 'hi' })

		const run1 = agent.stream()
		let caught: unknown
		try {
			agent.stream()
		} catch (error) {
			caught = error
		}
		if (!isAgentError(caught)) throw new Error('expected an AgentError')
		expect(caught.code).toBe('CONCURRENCY')

		const drained = collect(run1.events)
		gate.resolve()
		await drained
		const result1 = await run1.result
		expect(result1).toEqual({ content: 'full', partial: false })
	})

	it('a construction `budget` with NO per-run override on the 2nd call throws AgentError(CONCURRENCY)', async () => {
		const gate = Promise.withResolvers<void>()
		const budget = createTokenBudget({ max: 1_000_000, scope: 'total' })
		const agent = createAgent(createGatedProvider(gate), { budget })
		agent.context.messages.add({ role: 'user', content: 'hi' })

		const run1 = agent.stream()
		let caught: unknown
		try {
			agent.stream()
		} catch (error) {
			caught = error
		}
		if (!isAgentError(caught)) throw new Error('expected an AgentError')
		expect(caught.code).toBe('CONCURRENCY')

		const drained = collect(run1.events)
		gate.resolve()
		await drained
		await run1.result
	})

	it('a construction `budget` with a per-run `budget` override and NO window -- both concurrent runs settle', async () => {
		const gate = Promise.withResolvers<void>()
		const agent = createAgent(createGatedProvider(gate), {
			budget: createTokenBudget({ max: 1_000_000, scope: 'total' }),
		})
		agent.context.messages.add({ role: 'user', content: 'hi' })

		const run1 = agent.stream()
		let run2: AgentStreamInterface | undefined
		expect(() => {
			run2 = agent.stream({ budget: createTokenBudget({ max: 1_000_000, scope: 'total' }) })
		}).not.toThrow()
		if (run2 === undefined) throw new Error('run2 was not started')
		const started2 = run2

		const drain1 = collect(run1.events)
		const drain2 = collect(started2.events)
		gate.resolve()
		await Promise.all([drain1, drain2])
		const [result1, result2] = await Promise.all([run1.result, started2.result])
		expect(result1).toEqual({ content: 'full', partial: false })
		expect(result2).toEqual({ content: 'full', partial: false })
	})

	it('a construction `budget` -- sequential (awaited) runs never overlap, so both settle and the budget accumulates', async () => {
		const budgetRecorder = createRecorder<[TokenUsage]>()
		const budget = createBudget<TokenUsage>({
			max: 1_000_000,
			consumer: (value) => {
				budgetRecorder.handler(value)
				return value.total
			},
		})
		const usage: TokenUsage = { prompt: 1, completion: 1, total: 2 }
		const provider = createScriptedProvider(
			[{ result: { content: 'first', usage } }, { result: { content: 'second', usage } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { budget })
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result1 = await agent.generate()
		agent.context.messages.add({ role: 'user', content: 'again' })
		const result2 = await agent.generate()

		expect(result1.content).toBe('first')
		expect(result2.content).toBe('second')
		// Sequential (awaited, never overlapping) runs never trip the concurrency guard, and the
		// SAME construction budget accumulates charges across both.
		expect(budget.consumed).toBeGreaterThanOrEqual(usage.total * 2)
	})
})

// ── Strict compaction — a summarizer failure during AUTOMATIC window compaction; strict:
// true emits `fault` THEN rethrows (the run rejects, status error, an `error` event). The
// lenient default (`strict` omitted) emits `fault` and continues -- already covered by
// 'NON-FATAL summarizer failure' in the earlier 'automatic compaction (production hardening)' block.
describe('Agent — strict compaction', () => {
	it('strict: true -- a throwing auto-compact summarizer emits fault THEN rethrows, rejecting the run', async () => {
		const boom = new Error('strict summarizer exploded')
		const conversations = createConversationManager({
			summarize: async () => {
				throw boom
			},
			keep: 0,
		})
		// An earlier exchange gives the fold a slice before the run's request.
		conversations.add().add([
			{ role: 'user', content: 'Earlier question.' },
			{ role: 'assistant', content: 'Earlier answer.' },
		])
		const tools = createToolManager()
		tools.add(createAddTool())
		const provider = createScriptedProvider(COMPACT_SCRIPT, AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, {
			conversations,
			tools,
			window: createBudget({ max: 12, consumer: estimateMessages }),
			limit: 5,
			strict: true,
		})
		const events = createRecorders<AgentEventMap, 'fault' | 'error' | 'finish'>(agent.emitter, [
			'fault',
			'error',
			'finish',
		])
		agent.context.messages.add({ role: 'user', content: 'go' })

		await expect(agent.generate()).rejects.toThrow('strict summarizer exploded')

		expect(agent.status).toBe('error')
		// `fault` fired BEFORE the rejection (the loop surfaces it observably, then rethrows).
		expect(events.fault.count).toBe(1)
		expect(events.fault.calls[0]?.[0]).toBe(boom)
		expect(events.error.count).toBe(1)
		expect(events.error.calls[0]?.[0]).toBe(boom)
		expect(events.finish.count).toBe(0)
	})
})

// ── Abort-usage sanitize — a provider's ProviderAbortError partial `usage` is sanitized
// (`sanitizeUsage`) BEFORE it is charged against the budget / folded into the run's reported usage:
// a non-finite or negative field floors to 0, a fractional field floors to its integer part.
describe('Agent — abort usage sanitize', () => {
	it('sanitizes a provider abort partial usage (negative/NaN/fractional) before charging the budget and reporting it', async () => {
		const gate = Promise.withResolvers<void>()
		const budgetRecorder = createRecorder<[TokenUsage]>()
		const budget = createBudget<TokenUsage>({
			max: 1_000_000,
			consumer: (value) => {
				budgetRecorder.handler(value)
				return value.total
			},
		})
		const provider = createAbortingGatedProvider(gate, {
			prompt: -5,
			completion: Number.NaN,
			total: 12.7,
		})
		const agent = createAgent(provider, { budget })
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		const drained = collect(stream.events)
		await waitForDelay()
		agent.abort()
		gate.resolve()
		await drained
		const result = await stream.result

		expect(result.partial).toBe(true)
		expect(result.content).toBe('part')
		// The reported usage is SANITIZED: negative prompt -> 0, NaN completion -> 0, fractional total
		// floored to its integer part.
		expect(result.usage).toEqual({ prompt: 0, completion: 0, total: 12 })
		// The budget was charged the SANITIZED residual, never the raw negative/NaN/fractional values
		// (`toEqual` on each `consume()` call rules out any NaN / negative field ever reaching it).
		expect(budgetRecorder.calls.map(([value]) => value)).toEqual([
			{ prompt: 0, completion: 1, total: 1 },
			{ prompt: 0, completion: 0, total: 11 },
		])
		expect(budget.consumed).toBe(12)
	})
})

// ── Normal usage sanitize — a provider's NORMAL post-turn `result.usage` is sanitized
// (`sanitizeUsage`) BEFORE it is charged against the budget / folded into the run's reported
// usage: a non-finite or negative field floors to 0, a fractional field floors to its integer
// part — mirroring the preceding abort-path sanitize so a buggy provider's dirty usage on a
// natural finish can never poison `budget.consumed` (or silently produce a NaN charge that
// never trips exhaustion).
describe('Agent — normal usage sanitize', () => {
	it('sanitizes a provider normal-turn usage (negative/NaN/fractional) before charging the budget and reporting it', async () => {
		const budgetRecorder = createRecorder<[TokenUsage]>()
		const budget = createBudget<TokenUsage>({
			max: 1_000_000,
			consumer: (value) => {
				budgetRecorder.handler(value)
				return value.total
			},
		})
		const provider = createScriptedProvider(
			[{ content: 'full', usage: { prompt: -5, completion: Number.NaN, total: 12.7 } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { budget })
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate()

		expect(result.partial).toBe(false)
		// The reported usage is SANITIZED: negative prompt -> 0, NaN completion -> 0, fractional
		// total floored to its integer part.
		expect(result.usage).toEqual({ prompt: 0, completion: 0, total: 12 })
		// The budget was charged the SANITIZED residual, never the raw negative/NaN/fractional
		// values (`toEqual` on each `consume()` call rules out any NaN / negative field ever
		// reaching it), and the consumes sum to the sanitized total (never NaN/negative).
		expect(budgetRecorder.calls.map(([value]) => value)).toEqual([
			{ prompt: 0, completion: 1, total: 1 },
			{ prompt: 0, completion: 0, total: 11 },
		])
		expect(budget.consumed).toBe(12)
	})
})

describe('Agent — a selection handler shapes the prompt and never the tools', () => {
	it('sends the system block plus the selected subset and hands the handler the request and the run signal', async () => {
		const selection = createRecordingSelection({ keep: (message) => message.role === 'user' })
		const provider = createScriptedProvider([{ content: 'done' }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, {
			system: 'You triage billing tickets.',
			select: selection.handler,
		})
		agent.context.messages.add([
			{ role: 'user', content: 'The invoice total is wrong.' },
			{ role: 'assistant', content: 'Which invoice?' },
		])
		const request = agent.context.messages.add({ role: 'user', content: 'Invoice 42.' })

		await agent.generate()

		const sent = requireValue(provider.calls[0])
		expect(sent.messages.map(({ id, ...body }) => body)).toEqual([
			{ role: 'system', content: 'You triage billing tickets.' },
			{ role: 'user', content: 'The invoice total is wrong.' },
			{ role: 'user', content: 'Invoice 42.' },
		])
		expect(sent.messages.slice(1)).toEqual(selection.selections[0]?.messages)
		expect(selection.calls).toHaveLength(1)
		const [conversation, received, signal] = requireValue(selection.calls[0])
		expect(conversation).toBe(agent.context.conversations.active)
		expect(received).toBe(request)
		expect(signal).toBeInstanceOf(AbortSignal)
		expect(signal).toBe(sent.signal)
	})

	it('advertises the same definitions on every turn with a subset selection as without a handler', async () => {
		expectTypeOf<keyof Selection>().toEqualTypeOf<
			'messages' | 'judgments' | 'usage' | 'fault' | 'briefing'
		>()
		const subset = createRecordingSelection({ keep: (message) => message.role === 'user' })
		const advertised = await Promise.all(
			[undefined, subset.handler].map(async (select) => {
				const tools = createToolManager()
				tools.add([
					createTool({ name: 'lookup', execute: () => 'invoice 42: 120 EUR' }),
					createTool({ name: 'refund', execute: () => 'refunded' }),
				])
				const provider = createScriptedProvider(
					[{ content: '', tools: [createToolCall({ name: 'lookup' })] }, { content: 'done' }],
					AGENT_SCRIPT_OPTIONS,
				)
				const agent = createAgent(provider, {
					tools,
					scope: createScope({ name: 'lookup-only', tools: ['lookup'] }),
					...(select === undefined ? {} : { select }),
				})
				agent.context.messages.add([
					{ role: 'user', content: 'The invoice total is wrong.' },
					{ role: 'assistant', content: 'Which invoice?' },
					{ role: 'user', content: 'Invoice 42.' },
				])
				await agent.generate()
				return provider.calls.map((call) => call.tools)
			}),
		)

		expect(subset.selections[0]?.messages).toHaveLength(2)
		expect(advertised[1]).toEqual(advertised[0])
		expect(advertised[0]).toEqual([[{ name: 'lookup' }], [{ name: 'lookup' }]])
	})

	it('keeps the scope-dispatch record when the handler drops every message but the request', async () => {
		const drop = createRecordingSelection({ keep: (message, request) => message.id === request.id })
		const records = await Promise.all(
			[undefined, drop.handler].map(async (select) => {
				const ran: string[] = []
				const tools = createToolManager()
				tools.add([
					createTool({
						name: 'safe',
						execute: () => {
							ran.push('safe')
							return 'ok'
						},
					}),
					createTool({
						name: 'secret',
						execute: () => {
							ran.push('secret')
							return 'leaked'
						},
					}),
				])
				const denied = createRecorder<AgentEventMap['deny']>()
				const dispatched = createRecorder<AgentEventMap['tool']>()
				const calls = [createToolCall({ name: 'secret' }), createToolCall({ name: 'safe' })]
				const provider = createScriptedProvider(
					[{ result: { content: '', tools: calls } }, { result: { content: 'final' } }],
					AGENT_SCRIPT_OPTIONS,
				)
				const agent = createAgent(provider, {
					tools,
					scope: new Scope({ name: 'safe-only', tools: ['safe'] }),
					on: { deny: denied.handler, tool: dispatched.handler },
					...(select === undefined ? {} : { select }),
				})
				agent.context.messages.add([
					{ role: 'user', content: 'Rotate the key.' },
					{ role: 'assistant', content: 'Which key?' },
					{ role: 'user', content: 'go' },
				])
				const result = await agent.generate()
				return {
					result,
					ran,
					advertised: provider.calls.map((call) => call.tools),
					denied: denied.calls,
					dispatched: dispatched.calls,
				}
			}),
		)

		expect(drop.selections[0]?.messages.map((message) => message.content)).toEqual(['go'])
		expect(records[1]).toEqual(records[0])
		expect(records[0]?.ran).toEqual(['safe'])
		expect(records[0]?.denied).toEqual([
			[createToolCall({ name: 'secret' }), 'secret is not in the active scope'],
		])
	})

	it('ends turn 0 answer-only when the handler applies a scope with no tools', async () => {
		const denied = createRecorder<AgentEventMap['deny']>()
		const tools = createToolManager()
		tools.add(createTool({ name: 'refund', execute: () => 'refunded' }))
		const calls = [createToolCall({ id: 'refund-1', name: 'refund' })]
		const provider = createScriptedProvider(
			[{ content: 'Refunds need a manager.', tools: calls }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, {
			tools,
			select: async (conversation) => {
				agent.context.apply(createScope({ name: 'answer', tools: [] }))
				return { messages: conversation.view(), judgments: [] }
			},
			on: { deny: denied.handler },
		})
		agent.context.messages.add({ role: 'user', content: 'Refund invoice 42.' })

		const result = await agent.generate()

		expect(result).toEqual({ content: 'Refunds need a manager.', partial: false })
		expect(provider.calls).toHaveLength(1)
		expect(provider.calls[0]?.tools).toBeUndefined()
		expect(denied.calls).toEqual([[calls[0], 'no tool is advertised in the active scope']])
	})

	it('runs the agent default under an answer-only scope and ends the run as the answer', async () => {
		const selection = createRecordingSelection()
		const denied = createRecorder<AgentEventMap['deny']>()
		const tools = createToolManager()
		tools.add(createTool({ name: 'refund', execute: () => 'refunded' }))
		const calls = [createToolCall({ id: 'refund-1', name: 'refund' })]
		const provider = createScriptedProvider(
			[{ content: 'Refunds need a manager.', tools: calls }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, {
			tools,
			scope: createScope({ name: 'answer', tools: [] }),
			select: selection.handler,
			on: { deny: denied.handler },
		})
		agent.context.messages.add({ role: 'user', content: 'Refund invoice 42.' })

		const result = await agent.generate()

		expect(selection.calls).toHaveLength(1)
		expect(result).toEqual({ content: 'Refunds need a manager.', partial: false })
		expect(provider.calls[0]?.tools).toBeUndefined()
		expect(denied.calls).toEqual([[calls[0], 'no tool is advertised in the active scope']])
	})

	it('selects nothing when the conversation ends without a user message', async () => {
		const selection = createRecordingSelection({ keep: () => false })
		const selected = createRecorder<AgentEventMap['select']>()
		const provider = createScriptedProvider([{ content: 'done' }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, {
			select: selection.handler,
			on: { select: selected.handler },
		})
		agent.context.messages.add([
			{ role: 'user', content: 'Invoice 42.' },
			{ role: 'assistant', content: 'It totals 120 EUR.' },
		])

		await agent.generate()

		expect(selection.calls).toHaveLength(0)
		expect(selected.count).toBe(0)
		expect(provider.calls[0]?.messages.map((message) => message.content)).toEqual([
			'Invoice 42.',
			'It totals 120 EUR.',
		])
	})
})

describe('Agent — the select event follows each select-site build', () => {
	it('fires once at entry, before turn 0, with the handler selection', async () => {
		const selection = createRecordingSelection()
		const order: string[] = []
		const selected = createRecorder<AgentEventMap['select']>()
		const provider = createScriptedProvider([{ content: 'done' }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, {
			select: selection.handler,
			on: {
				select: (picked) => {
					order.push('select')
					selected.handler(picked)
				},
				turn: (index) => order.push(`turn ${index}`),
			},
		})
		agent.context.messages.add({ role: 'user', content: 'Invoice 42.' })

		await agent.generate()

		expect(order).toEqual(['select', 'turn 0'])
		expect(selected.calls[0]?.[0]).toBe(selection.selections[0])
	})

	it('sends a system message ending in the briefing and emits the selection unchanged', async () => {
		const selected = createRecorder<AgentEventMap['select']>()
		const briefing = 'Plan: refund invoice 42.'
		const provider = createScriptedProvider([{ content: 'done' }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, {
			system: 'Be brief.',
			select: async (conversation) => ({ messages: conversation.view(), judgments: [], briefing }),
			on: { select: selected.handler },
		})
		agent.context.messages.add({ role: 'user', content: 'Invoice 42.' })

		await agent.generate()

		const sent = provider.calls[0]?.messages
		expect(sent?.[0]?.role).toBe('system')
		expect(sent?.[0]?.content).toBe('Be brief.\n\nPlan: refund invoice 42.')
		expect(selected.calls[0]?.[0].briefing).toBe(briefing)
	})

	it('fires again after each compaction rebuild with the request captured at entry', async () => {
		const selection = createRecordingSelection()
		const selected = createRecorder<AgentEventMap['select']>()
		const conversations = createConversationManager({
			summarize: createStubSummarizer().summarize,
			keep: 0,
		})
		const conversation = conversations.add()
		conversation.add([
			{ role: 'user', content: 'h'.repeat(40) },
			{ role: 'assistant', content: 'k'.repeat(40) },
		])
		const request = conversation.add({ role: 'user', content: 'go' })
		const tools = createToolManager()
		tools.add(createAddTool())
		const provider = createScriptedProvider(COMPACT_SCRIPT, AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, {
			conversations,
			tools,
			window: createBudget({
				max: estimateMessages(conversation.view()) + 1,
				consumer: estimateMessages,
			}),
			limit: 5,
			select: selection.handler,
			on: { select: selected.handler },
		})

		const result = await agent.generate()

		expect(result.content).toBe('the answer is 42')
		expect(provider.calls.map((call) => call.messages.length)).toEqual([3, 4, 6])
		expect(selected.count).toBe(2)
		expect(selected.calls.map(([picked]) => picked)).toEqual(selection.selections)
		expect(selection.calls.map(([, received]) => received)).toEqual([request, request])
		expect(selection.calls.every(([, received]) => received === request)).toBe(true)
		expect(selection.selections[1]?.messages.some((message) => message.id === request.id)).toBe(
			true,
		)
	})

	it('fires twice before turn 0 when the pre-first-turn compaction folds', async () => {
		const selection = createRecordingSelection()
		const order: string[] = []
		const conversations = createConversationManager({
			summarize: createStubSummarizer().summarize,
			keep: 0,
		})
		conversations.add().add([
			{ role: 'user', content: 'q'.repeat(200) },
			{ role: 'user', content: 'hi' },
		])
		const provider = createScriptedProvider([{ content: 'final answer' }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, {
			conversations,
			window: createBudget({ max: 20, consumer: estimateMessages }),
			limit: 5,
			select: selection.handler,
			on: {
				select: () => order.push('select'),
				turn: (index) => order.push(`turn ${index}`),
			},
		})

		await agent.generate()

		expect(order).toEqual(['select', 'select', 'turn 0'])
		expect(provider.calls[0]?.messages.map((message) => message.content)).toEqual([
			`${CONVERSATION_RECAP_PREFIX}recap of 1`,
			'hi',
		])
	})

	it('fires none and calls no provider when the run aborts during selection', async () => {
		const selected = createRecorder<AgentEventMap['select']>()
		const faults = createRecorder<AgentEventMap['fault']>()
		const provider = createScriptedProvider([{ content: 'never sent' }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, {
			select: async (conversation, _request, signal) => {
				await waitForAbort(signal)
				return { messages: conversation.view(), judgments: [], usage: SELECTION_USAGE }
			},
			strict: true,
			on: { select: selected.handler, fault: faults.handler },
		})
		agent.context.messages.add({ role: 'user', content: 'Invoice 42.' })

		const run = agent.stream()
		run.abort('the operator closed the ticket')
		const result = await run.result

		expect(result).toEqual({ content: '', usage: SELECTION_USAGE, partial: true })
		expect(provider.calls).toHaveLength(0)
		expect(selected.count).toBe(0)
		expect(faults.count).toBe(0)
		expect(agent.status).toBe('done')
	})

	it('commits partial when selection is cancelled on a run with a zero iteration limit', async () => {
		const provider = createScriptedProvider([{ content: 'never sent' }], AGENT_SCRIPT_OPTIONS)
		const selected = createRecorder<AgentEventMap['select']>()
		const agent = createAgent(provider, {
			limit: 0,
			select: async (conversation, _request, signal) => {
				await waitForAbort(signal)
				return { messages: conversation.view(), judgments: [], usage: SELECTION_USAGE }
			},
			on: { select: selected.handler },
		})
		agent.context.messages.add({ role: 'user', content: 'Invoice 42.' })

		const run = agent.stream()
		run.abort('the operator closed the ticket')

		expect(await run.result).toEqual({ content: '', usage: SELECTION_USAGE, partial: true })
		expect(provider.calls).toHaveLength(0)
		expect(selected.count).toBe(0)
	})
})

describe('Agent — a selection fault follows the compaction fault rules', () => {
	it('commits partial with no fault when the handler throws after the run aborts', async () => {
		const faults = createRecorder<AgentEventMap['fault']>()
		const provider = createScriptedProvider([{ content: 'never sent' }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, {
			select: async (_conversation, _request, signal) => {
				await waitForAbort(signal)
				throw new Error('the judge call was cancelled')
			},
			strict: true,
			on: { fault: faults.handler },
		})
		agent.context.messages.add({ role: 'user', content: 'Invoice 42.' })

		const run = agent.stream()
		run.abort('the operator closed the ticket')

		expect(await run.result).toEqual({ content: '', partial: true })
		expect(faults.count).toBe(0)
		expect(provider.calls).toHaveLength(0)
	})

	it('emits fault for a thrown handler and sends view() without a select event', async () => {
		const faults = createRecorder<AgentEventMap['fault']>()
		const selected = createRecorder<AgentEventMap['select']>()
		const provider = createScriptedProvider([{ content: 'done' }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, {
			system: 'You triage billing tickets.',
			select: rejectSelection,
			on: { fault: faults.handler, select: selected.handler },
		})
		agent.context.messages.add([
			{ role: 'user', content: 'The invoice total is wrong.' },
			{ role: 'assistant', content: 'Which invoice?' },
			{ role: 'user', content: 'Invoice 42.' },
		])

		const result = await agent.generate()

		expect(result).toEqual({ content: 'done', partial: false })
		expect(faults.calls).toEqual([[new Error('the judge is unreachable')]])
		expect(selected.count).toBe(0)
		expect(provider.calls[0]?.messages.map(({ id, ...body }) => body)).toEqual([
			{ role: 'system', content: 'You triage billing tickets.' },
			{ role: 'user', content: 'The invoice total is wrong.' },
			{ role: 'assistant', content: 'Which invoice?' },
			{ role: 'user', content: 'Invoice 42.' },
		])
	})

	it('builds from a returned fault, emits fault then select, and folds its usage into the result', async () => {
		const order: string[] = []
		const selected = createRecorder<AgentEventMap['select']>()
		const provider = createScriptedProvider([{ content: 'done' }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, {
			select: abandonSelection,
			on: {
				fault: (error) => order.push(`fault ${String(error)}`),
				select: (picked) => {
					order.push('select')
					selected.handler(picked)
				},
			},
		})
		agent.context.messages.add([
			{ role: 'user', content: 'The invoice total is wrong.' },
			{ role: 'user', content: 'Invoice 42.' },
		])

		const result = await agent.generate()

		expect(order).toEqual(['fault Error: the judge refused the needed question', 'select'])
		expect(selected.calls[0]?.[0].fault).toEqual(new Error('the judge refused the needed question'))
		expect(result).toEqual({ content: 'done', usage: SELECTION_USAGE, partial: false })
		expect(provider.calls[0]?.messages.map((message) => message.content)).toEqual([
			'The invoice total is wrong.',
			'Invoice 42.',
		])
	})

	it('charges a returned fault usage before fault fires', async () => {
		const budgetRecorder = createRecorder<[TokenUsage]>()
		const budget = createBudget<TokenUsage>({
			max: 10_000,
			consumer: (value) => {
				budgetRecorder.handler(value)
				return value.total
			},
		})
		const consumed = createRecorder<[consumed: number]>()
		const provider = createScriptedProvider([{ content: 'done' }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, {
			budget,
			select: abandonSelection,
			on: { fault: () => consumed.handler(budget.consumed) },
		})
		agent.context.messages.add({ role: 'user', content: 'Invoice 42.' })

		await agent.generate()

		expect(consumed.calls).toEqual([[SELECTION_USAGE.total]])
		expect(budgetRecorder.calls.map(([value]) => value)[0]).toEqual(SELECTION_USAGE)
	})

	it.each(SELECTION_FAULT_CASES)(
		'settles error under strict for $label',
		async ({ select, message }) => {
			const faults = createRecorder<AgentEventMap['fault']>()
			const errors = createRecorder<AgentEventMap['error']>()
			const finished = createRecorder<AgentEventMap['finish']>()
			const selected = createRecorder<AgentEventMap['select']>()
			const provider = createScriptedProvider([{ content: 'never sent' }], AGENT_SCRIPT_OPTIONS)
			const agent = createAgent(provider, {
				select,
				strict: true,
				on: {
					fault: faults.handler,
					error: errors.handler,
					finish: finished.handler,
					select: selected.handler,
				},
			})
			agent.context.messages.add({ role: 'user', content: 'Invoice 42.' })

			await expect(agent.generate()).rejects.toThrow(message)

			expect(agent.status).toBe('error')
			expect(faults.count).toBe(1)
			expect(errors.calls).toEqual([[faults.calls[0]?.[0]]])
			expect(finished.count).toBe(0)
			expect(selected.count).toBe(0)
			expect(provider.calls).toHaveLength(0)
		},
	)

	// A `fault` listener runs synchronously inside the emit, so a cancel it issues lands between the
	// emit and the strict throw or the `select` emit that would otherwise follow.
	it.each(SELECTION_FAULT_CASES)(
		'commits partial when a strict fault listener aborts $label',
		async ({ select, usage }) => {
			const controller = new AbortController()
			const selected = createRecorder<AgentEventMap['select']>()
			const errors = createRecorder<AgentEventMap['error']>()
			const faults = createRecorder<AgentEventMap['fault']>()
			const provider = createScriptedProvider([{ content: 'never sent' }], AGENT_SCRIPT_OPTIONS)
			const agent = createAgent(provider, {
				select,
				strict: true,
				signal: controller.signal,
				on: {
					fault: (error) => {
						faults.handler(error)
						controller.abort('the operator closed the ticket')
					},
					select: selected.handler,
					error: errors.handler,
				},
			})
			agent.context.messages.add({ role: 'user', content: 'Invoice 42.' })

			expect(await agent.generate()).toEqual({
				content: '',
				partial: true,
				...(usage === undefined ? {} : { usage }),
			})
			expect(faults.count).toBe(1)
			expect(selected.count).toBe(0)
			expect(errors.count).toBe(0)
			expect(provider.calls).toHaveLength(0)
			expect(agent.status).toBe('done')
		},
	)

	it.each(SELECTION_FAULT_CASES)(
		'commits partial when a lenient fault listener aborts $label',
		async ({ select, usage }) => {
			const controller = new AbortController()
			const selected = createRecorder<AgentEventMap['select']>()
			const errors = createRecorder<AgentEventMap['error']>()
			const faults = createRecorder<AgentEventMap['fault']>()
			const provider = createScriptedProvider([{ content: 'never sent' }], AGENT_SCRIPT_OPTIONS)
			const agent = createAgent(provider, {
				select,
				strict: false,
				signal: controller.signal,
				on: {
					fault: (error) => {
						faults.handler(error)
						controller.abort('the operator closed the ticket')
					},
					select: selected.handler,
					error: errors.handler,
				},
			})
			agent.context.messages.add({ role: 'user', content: 'Invoice 42.' })

			expect(await agent.generate()).toEqual({
				content: '',
				partial: true,
				...(usage === undefined ? {} : { usage }),
			})
			expect(faults.count).toBe(1)
			expect(selected.count).toBe(0)
			expect(errors.count).toBe(0)
			expect(provider.calls).toHaveLength(0)
			expect(agent.status).toBe('done')
		},
	)
})

describe('Agent — selection usage reaches the budget and the result, never a usage chunk', () => {
	it('charges the judge usage in full and sums it with the provider usage', async () => {
		const budgetRecorder = createRecorder<[TokenUsage]>()
		const budget = createBudget<TokenUsage>({
			max: 10_000,
			consumer: (value) => {
				budgetRecorder.handler(value)
				return value.total
			},
		})
		const usages = createRecorder<AgentEventMap['usage']>()
		const provider = createScriptedProvider(
			[{ result: { content: 'done', usage: AGENT_USAGE } }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, {
			budget,
			select: createRecordingSelection({ usage: SELECTION_USAGE }).handler,
			on: { usage: usages.handler },
		})
		agent.context.messages.add({ role: 'user', content: 'Invoice 42.' })

		const run = agent.stream()
		const chunks = await collect(run.events)
		const result = await run.result

		expect(chunks.filter((chunk) => chunk.category === 'usage')).toEqual([
			{ category: 'usage', usage: AGENT_USAGE },
		])
		expect(chunks.filter((chunk) => chunk.category === 'usage')).toHaveLength(provider.calls.length)
		expect(usages.calls).toEqual([[AGENT_USAGE]])
		expect(result.usage).toEqual({ prompt: 35, completion: 9, total: 44 })
		expect(budgetRecorder.calls.map(([value]) => value)[0]).toEqual(SELECTION_USAGE)
		expect(budget.consumed).toBe(44)
	})
})

describe('Agent — the handler resolves once per select site, scope first', () => {
	it('applies a scope changed during the handler at the next select site only', async () => {
		const gate = Promise.withResolvers<void>()
		const first = createRecordingSelection()
		const second = createRecordingSelection()
		const selected = createRecorder<AgentEventMap['select']>()
		const conversations = createConversationManager({
			summarize: createStubSummarizer().summarize,
			keep: 0,
		})
		const history = conversations.add()
		history.add([
			{ role: 'user', content: 'h'.repeat(40) },
			{ role: 'assistant', content: 'k'.repeat(40) },
			{ role: 'user', content: 'go' },
		])
		const tools = createToolManager()
		tools.add(createAddTool())
		const provider = createScriptedProvider(COMPACT_SCRIPT, AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(provider, {
			conversations,
			tools,
			window: createBudget({
				max: estimateMessages(history.view()) + 1,
				consumer: estimateMessages,
			}),
			limit: 5,
			select: async (conversation, request, signal) => {
				await gate.promise
				return first.handler(conversation, request, signal)
			},
			on: { select: selected.handler },
		})

		const run = agent.stream()
		agent.context.apply(createScope({ name: 'second', select: second.handler }))
		gate.resolve()
		await run.result

		expect(first.calls).toHaveLength(1)
		expect(second.calls).toHaveLength(1)
		expect(selected.calls.map(([picked]) => picked)).toEqual([
			first.selections[0],
			second.selections[0],
		])
	})

	it('runs the default under a scope without a handler, the scope handler while active, and the default after apply(undefined)', async () => {
		const fallback = createRecordingSelection()
		const mode = createRecordingSelection()
		const provider = createScriptedProvider(
			[{ content: 'first' }, { content: 'second' }, { content: 'third' }],
			AGENT_SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, {
			select: fallback.handler,
			scope: createScope({ name: 'review', instructions: [] }),
		})
		agent.context.messages.add({ role: 'user', content: 'Review invoice 42.' })
		await agent.generate()
		agent.context.apply(createScope({ name: 'triage', select: mode.handler }))
		agent.context.messages.add({ role: 'user', content: 'Triage ticket 7.' })
		await agent.generate()
		agent.context.apply(undefined)
		agent.context.messages.add({ role: 'user', content: 'Close ticket 7.' })
		await agent.generate()

		expect(fallback.calls.map(([, request]) => request.content)).toEqual([
			'Review invoice 42.',
			'Close ticket 7.',
		])
		expect(mode.calls.map(([, request]) => request.content)).toEqual(['Triage ticket 7.'])
	})

	it('sends the no-handler request under a judging default when the mode carries a pass-through', async () => {
		const judge = createRecordingSelection({
			keep: (message, request) => message.id === request.id,
		})
		const passThrough = createRecordingSelection()
		const bodies = await Promise.all(
			[false, true].map(async (selecting) => {
				const provider = createScriptedProvider([{ content: 'done' }], AGENT_SCRIPT_OPTIONS)
				const agent = createAgent(provider, {
					system: 'You triage billing tickets.',
					scope: createScope({
						name: 'verbatim',
						...(selecting ? { select: passThrough.handler } : {}),
					}),
					...(selecting ? { select: judge.handler } : {}),
				})
				agent.context.messages.add([
					{ role: 'user', content: 'The invoice total is wrong.' },
					{ role: 'assistant', content: 'Which invoice?' },
					{ role: 'user', content: 'Invoice 42.' },
				])
				await agent.generate()
				return requireValue(provider.calls[0]).messages.map(({ id, ...body }) => body)
			}),
		)

		expect(judge.calls).toHaveLength(0)
		expect(passThrough.calls).toHaveLength(1)
		expect(bodies[1]).toEqual(bodies[0])
		expect(bodies[0]).toHaveLength(4)
	})

	it('sends the recorded request through a pass-through mode handler', async () => {
		const passThrough = createRecordingSelection()
		const provider = createScriptedProvider([{ result: { content: 'done' } }], AGENT_SCRIPT_OPTIONS)
		const agent = seedFramedAgent(provider)
		agent.context.apply(
			createScope({
				name: 'review',
				instructions: ['tone', 'secrets'],
				select: passThrough.handler,
			}),
		)

		await agent.generate()

		expect(passThrough.calls).toHaveLength(1)
		const sent = requireValue(provider.calls[0]).messages
		expect(sent.map(({ id, ...body }) => body)).toStrictEqual(RECORDED_REQUEST)
	})
})

describe('Agent — with no handler in either home the loop adds no await', () => {
	it('reaches the provider before stream() returns, and waits for a handler when one is set', async () => {
		const plain = createScriptedProvider([{ content: 'done' }], AGENT_SCRIPT_OPTIONS)
		const agent = createAgent(plain, { scope: createScope({ name: 'review', tools: [] }) })
		agent.context.messages.add({ role: 'user', content: 'Invoice 42.' })
		const selecting = createScriptedProvider([{ content: 'done' }], AGENT_SCRIPT_OPTIONS)
		const selected = createAgent(selecting, { select: createRecordingSelection().handler })
		selected.context.messages.add({ role: 'user', content: 'Invoice 42.' })

		const runs = [agent.stream(), selected.stream()]

		expect(plain.calls).toHaveLength(1)
		expect(selecting.calls).toHaveLength(0)
		await Promise.all(runs.map((run) => run.result))
		expect(selecting.calls).toHaveLength(1)
	})
})
