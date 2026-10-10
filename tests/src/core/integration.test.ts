import type { ProviderRequest } from '@src/core'
import { describe, expect, it } from 'vitest'
import {
	createAgent,
	createInstructionManager,
	createRelay,
	createRelayProvider,
	ProviderAbortError,
	ProviderError,
	providerRequestContract,
	RELAY_PROVIDER_MESSAGE,
	relayFrameContract,
} from '@src/core'
import { parseJSONAs } from '@orkestrel/contract'
import { createTool, createToolManager } from '@orkestrel/tool'
import {
	createParser,
	createScriptedProvider,
	createTokenUsage,
	createToolCall,
	drainProvider,
	FailingProvider,
	RecordedProvider,
	generateReply,
	INTEGRATION_USAGE,
	splitWordDeltas,
} from '../../setup.js'
import { collect, requireValue } from '@orkestrel/test'

describe('in-process relay hop', () => {
	it('carries a 401 refusal through the browser without entering stream', async () => {
		const provider = new RecordedProvider()
		const handler = createRelay({
			provider,
			authorize: (request) => request.headers.get('authorization') === 'Bearer accepted',
		})
		const browser = createRelayProvider({
			url: 'http://relay.test/',
			parser: createParser,
			headers: () => ({ authorization: 'Bearer refused' }),
			fetch: (input, init) => handler(new Request(input, init)),
		})
		const result = browser.generate([], new AbortController().signal)
		await expect(result).rejects.toBeInstanceOf(ProviderError)
		await expect(result).rejects.toMatchObject({
			code: 'HTTP',
			status: 401,
			message: 'provider error: 401',
		})
		expect(provider.entries).toBe(0)
	})
	it('carries a 413 refusal through the browser without entering stream', async () => {
		const provider = new RecordedProvider()
		const handler = createRelay({ provider, authorize: () => true, limit: 1 })
		const browser = createRelayProvider({
			url: 'http://relay.test/',
			parser: createParser,
			fetch: (input, init) => handler(new Request(input, init)),
		})
		const result = browser.generate([], new AbortController().signal)
		await expect(result).rejects.toBeInstanceOf(ProviderError)
		await expect(result).rejects.toMatchObject({
			code: 'HTTP',
			status: 413,
			message: 'provider error: 413',
		})
		expect(provider.entries).toBe(0)
	})
	it('carries a 400 refusal through the browser without entering stream', async () => {
		const provider = new RecordedProvider()
		const handler = createRelay({ provider, authorize: () => true })
		const browser = createRelayProvider({
			url: 'http://relay.test/',
			parser: createParser,
			fetch: (input, init) => handler(new Request(input, { ...init, body: '{"messages":null}' })),
		})
		const result = browser.generate([], new AbortController().signal)
		await expect(result).rejects.toBeInstanceOf(ProviderError)
		await expect(result).rejects.toMatchObject({
			code: 'HTTP',
			status: 400,
			message: 'provider error: 400',
		})
		expect(provider.entries).toBe(0)
	})
	it('round trips identified messages tools options deltas and the authoritative result', async () => {
		const result = {
			content: '<think>literal</think> answer',
			thinking: 'reason',
			tools: [createToolCall()],
			usage: createTokenUsage(),
		}
		const provider = createScriptedProvider(
			[{ result, deltas: ['<think>literal</think>', ' answer'], thoughts: ['rea', 'son'] }],
			{ recorded: true },
		)
		const handler = createRelay({
			provider,
			authorize: (request) => request.headers.get('authorization') === 'Bearer fixture',
		})
		const requests: Request[] = []
		const bodies: unknown[] = []
		const frames: unknown[] = []
		const browser = createRelayProvider({
			url: 'http://relay.test/exact?route=turn',
			parser: createParser,
			headers: () => ({ authorization: 'Bearer fixture' }),
			fetch: async (input, init) => {
				const request = new Request(input, init)
				requests.push(request)
				bodies.push(parseJSONAs(await request.clone().text(), providerRequestContract.is))
				const response = await handler(request)
				frames.push(
					...(await response.clone().text())
						.split(/\r\n|\n/)
						.filter((line) => line.length > 0)
						.map((line) => parseJSONAs(line, relayFrameContract.is)),
				)
				return response
			},
		})
		const request: ProviderRequest = {
			messages: [
				{
					id: 'identified',
					role: 'assistant',
					content: 'before',
					calls: [createToolCall()],
					images: ['image'],
				},
			],
			tools: [{ name: 'add', description: 'Adds numbers', parameters: { type: 'object' } }],
			options: { think: true, schema: { type: 'object' } },
		}
		const signal = new AbortController().signal
		const direct = await drainProvider(
			provider.stream(request.messages, signal, request.tools, request.options),
		)
		const hop = await drainProvider(
			browser.stream(request.messages, signal, request.tools, request.options),
		)
		expect(hop).toEqual(direct)
		expect(hop.result).toEqual(result)
		expect(
			await browser.generate(request.messages, signal, request.tools, request.options),
		).toEqual(hop.result)
		expect(requests.map((entry) => entry.url)).toEqual([
			'http://relay.test/exact?route=turn',
			'http://relay.test/exact?route=turn',
		])
		expect(requests.map((entry) => entry.method)).toEqual(['POST', 'POST'])
		const expected: ProviderRequest = {
			messages: [
				{
					id: 'identified',
					role: 'assistant',
					content: 'before',
					calls: [{ id: 'c1', name: 'add', arguments: {} }],
					images: ['image'],
				},
			],
			tools: [{ name: 'add', description: 'Adds numbers', parameters: { type: 'object' } }],
			options: { think: true, schema: { type: 'object' } },
		}
		expect(bodies).toEqual([expected, expected])
		expect(frames).toEqual([
			...direct.deltas,
			{ channel: 'result', result },
			...direct.deltas,
			{ channel: 'result', result },
		])
		const relayed = requireValue(provider.calls[1])
		expect({ messages: relayed.messages, tools: relayed.tools, options: relayed.options }).toEqual(
			expected,
		)
		expect(relayed.messages[0]?.id).toBe('identified')
	})
	it('propagates browser abort through the request and upstream signals', async () => {
		const provider = createScriptedProvider(
			[{ result: { content: 'first second third' }, deltas: ['first', ' second', ' third'] }],
			{ recorded: true },
		)
		const handler = createRelay({ provider, authorize: () => true })
		const requests: Request[] = []
		const browser = createRelayProvider({
			url: 'http://relay.test/',
			parser: createParser,
			fetch: (input, init) => {
				const request = new Request(input, init)
				requests.push(request)
				return handler(request)
			},
		})
		const abort = new AbortController()
		const stream = browser.stream([], abort.signal)
		const first = await stream.next()
		expect(first).toEqual({ done: false, value: { channel: 'content', text: 'first' } })
		abort.abort()
		await expect(stream.next()).rejects.toMatchObject({
			code: 'ABORT',
			partial: { content: 'first' },
		})
		expect(requireValue(requests[0]).signal.aborted).toBe(true)
		expect(requireValue(provider.calls[0]).signal.aborted).toBe(true)
	})
	it('reconstructs a server abort while the browser signal remains unaborted', async () => {
		const partial = {
			content: 'partial',
			thinking: 'reason',
			tools: [createToolCall()],
			usage: createTokenUsage(),
		}
		const provider = new FailingProvider({ content: 'partial' }, new ProviderAbortError(partial))
		const handler = createRelay({ provider, authorize: () => true })
		const browser = createRelayProvider({
			url: 'http://relay.test/',
			parser: createParser,
			fetch: (input, init) => handler(new Request(input, init)),
		})
		const signal = new AbortController().signal
		const stream = browser.stream([], signal)
		expect(await stream.next()).toEqual({
			done: false,
			value: { channel: 'content', text: 'partial' },
		})
		await expect(stream.next()).rejects.toEqual(new ProviderAbortError(partial))
		expect(signal.aborted).toBe(false)
	})
	it('translates a secret upstream failure to the fixed public provider error', async () => {
		const provider = new FailingProvider({ content: '' }, new Error('sk-secret'))
		const handler = createRelay({ provider, authorize: () => true })
		const browser = createRelayProvider({
			url: 'http://relay.test/',
			parser: createParser,
			fetch: (input, init) => handler(new Request(input, init)),
		})
		await expect(browser.generate([], new AbortController().signal)).rejects.toMatchObject({
			name: 'ProviderError',
			code: 'PROVIDER',
			message: RELAY_PROVIDER_MESSAGE,
		})
	})
})

// The agent runtime must compose any conforming provider through the abstract contract.

describe('provider-agnosticism — a minimal provider drives the FULL loop', () => {
	it('generate() returns the provider content + summed usage, not partial', async () => {
		const agent = createAgent(
			createScriptedProvider([{ content: 'hello from a fake', usage: INTEGRATION_USAGE }], {
				name: 'alpha',
			}),
		)
		agent.context.messages.add({ role: 'user', content: 'hi' })

		const result = await agent.generate()

		expect(result.content).toBe('hello from a fake')
		expect(result.partial).toBe(false)
		expect(result.usage).toEqual(INTEGRATION_USAGE)
	})

	it('stream() yields the provider deltas whose join equals the settled content (+ a usage chunk)', async () => {
		const agent = createAgent(
			createScriptedProvider([{ content: 'one two three', usage: INTEGRATION_USAGE }], {
				name: 'alpha',
				chunk: splitWordDeltas,
			}),
		)
		agent.context.messages.add({ role: 'user', content: 'count' })

		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const result = await stream.result

		const tokens = chunks.flatMap((chunk) => (chunk.category === 'token' ? [chunk.content] : []))
		expect(tokens.length).toBeGreaterThan(1)
		expect(tokens.join('')).toBe(result.content)
		expect(result.content).toBe('one two three')
		expect(chunks.some((chunk) => chunk.category === 'usage')).toBe(true)
	})

	it('runs the agent tool loop in Node and feeds the result into the next provider turn', async () => {
		// The provider boundary requests a tool and returns the next turn through the same contract.
		const tools = createToolManager()
		let executed = 0
		tools.add(
			createTool({
				name: 'add',
				execute: (args) => {
					executed += 1
					return Number(args.a) + Number(args.b)
				},
			}),
		)
		const provider = createScriptedProvider(
			[
				{ content: '', tools: [{ id: 'c1', name: 'add', arguments: { a: 2, b: 3 } }] },
				{ content: 'the sum is 5', usage: INTEGRATION_USAGE },
			],
			{ name: 'alpha', recorded: true },
		)
		const agent = createAgent(provider, { tools, limit: 4 })
		agent.context.messages.add({ role: 'user', content: 'add 2 and 3' })

		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const result = await stream.result

		expect(executed).toBe(1)
		const dispatched = chunks.flatMap((chunk) =>
			chunk.category === 'tool' && chunk.result.success
				? [{ name: chunk.call.name, value: chunk.result.value }]
				: [],
		)
		expect(dispatched).toEqual([{ name: 'add', value: 5 }])
		expect(provider.calls).toHaveLength(2)
		expect(provider.calls[1]?.messages).toContainEqual(
			expect.objectContaining({ role: 'tool', content: '5' }),
		)
		expect(result.content).toBe('the sum is 5')
		expect(result.partial).toBe(false)
		const roles = agent.context.messages.messages().map((message) => message.role)
		expect(roles).toEqual(['user', 'assistant', 'tool', 'assistant'])
	})

	it('an abort mid-stream commits a PARTIAL of what the fake streamed (resolves, never rejects)', async () => {
		// A multi-delta turn; abort after the first token. The loop must settle partial with the
		// accumulated deltas — the fake's signal-honouring stream supplies the partial, exactly
		// like a real provider would.
		const agent = createAgent(
			createScriptedProvider([{ content: 'a b c d e' }], {
				name: 'alpha',
				chunk: splitWordDeltas,
			}),
		)
		agent.context.messages.add({ role: 'user', content: 'go' })

		const stream = agent.stream()
		const streamed: string[] = []
		for await (const chunk of stream.events) {
			if (chunk.category === 'token') {
				streamed.push(chunk.content)
				agent.abort()
				break
			}
		}
		const result = await stream.result

		expect(result.partial).toBe(true)
		expect(agent.status).toBe('done')
		// The partial content begins with what streamed before the abort (the loop accumulates
		// each yielded delta; the ProviderAbortError's partial is those same deltas).
		expect(result.content.startsWith(streamed.join(''))).toBe(true)
	})
})

describe('provider-agnosticism — drop-in swap (the runtime is indifferent to WHICH provider)', () => {
	it('two DIFFERENTLY-NAMED providers run the SAME agent code with zero changes — each returns its own answer', async () => {
		// The runtime depends on the abstract contract when the provider implementation changes.
		const first = createScriptedProvider([{ content: 'I am alpha' }], { name: 'alpha' })
		const second = createScriptedProvider([{ content: 'I am beta' }], { name: 'beta' })

		expect(first.name).not.toBe(second.name)
		expect(await generateReply(first)).toBe('I am alpha')
		expect(await generateReply(second)).toBe('I am beta')
	})

	it('a manager-options format frames the system block the provider receives; an unframed manager sends the built-ins', async () => {
		// A model's framing preference reaches the request through the instructions manager the
		// agent receives, so one provider type sends XML framing from one agent and the built-in
		// Markdown header from the other, through the real loop.
		const framed = createScriptedProvider([{ content: 'ok' }], { name: 'framed', recorded: true })
		const framedAgent = createAgent(framed, {
			instructions: createInstructionManager({
				format: {
					open: '<INSTRUCTIONS>',
					render: (one) => `<i>${one.content}</i>`,
					close: '</INSTRUCTIONS>',
				},
			}),
		})
		framedAgent.context.instructions.add({ name: 'tone', content: 'Be terse.' })
		framedAgent.context.messages.add({ role: 'user', content: 'hi' })
		await framedAgent.generate()

		const plain = createScriptedProvider([{ content: 'ok' }], { name: 'plain', recorded: true })
		const plainAgent = createAgent(plain)
		plainAgent.context.instructions.add({ name: 'tone', content: 'Be terse.' })
		plainAgent.context.messages.add({ role: 'user', content: 'hi' })
		await plainAgent.generate()

		expect(requireValue(requireValue(framed.calls[0]).messages[0]).content).toBe(
			'<INSTRUCTIONS>\n\n<i>Be terse.</i>\n\n</INSTRUCTIONS>',
		)
		expect(requireValue(requireValue(plain.calls[0]).messages[0]).content).toBe(
			'## Instructions\n\nBe terse.',
		)
	})

	it('createScriptedProvider (the shared Ollama-free fixture) is itself a conforming provider that drives the loop', async () => {
		// This fixture also drives other suites through the same provider contract.
		const agent = createAgent(
			createScriptedProvider([{ content: 'scripted answer', usage: INTEGRATION_USAGE }]),
		)
		agent.context.messages.add({ role: 'user', content: 'hi' })

		const result = await agent.generate()

		expect(result.content).toBe('scripted answer')
		expect(result.partial).toBe(false)
		expect(result.usage).toEqual(INTEGRATION_USAGE)
	})
})
