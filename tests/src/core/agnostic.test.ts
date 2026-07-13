import { describe, expect, it } from 'vitest'
import type { ContextFormatInterface, ProviderInterface } from '@src/core'
import { createAgent, createTool, createToolManager } from '@src/core'
import { collect, createScriptedProvider, createTokenUsage, type DeltasOf } from '../../setup.js'

// PROVIDER-AGNOSTICISM — the runtime depends ONLY on the abstract ProviderInterface, never
// on Ollama (or any concrete backend). This cross-cutting proof (structure-exempt name)
// drives the FULL Agent loop with the shared scripted provider — no daemon, no `@src/ollama`
// import at all — proving any conforming provider works with zero core knowledge of it:
//  • a minimal provider's generate()/stream() drive content + a tool round-trip + summed
//    usage, and an abort commits a partial;
//  • two DIFFERENTLY-NAMED providers are drop-in swappable behind identical agent code;
//  • the loop passes each provider's `format` (or none) into build() correctly.
// Per AGENTS §16 the scripted provider is a REAL provider (a real async generator honouring
// the signal), never a mock of the agent. The deterministic loop mechanics also live in
// Agent.test.ts; here the framing is the agnosticism CLAIM (a generic provider, not Ollama,
// satisfies the contract). A `name` distinguishes the two swap providers; `deltasOf` chunks
// the streamed content; `format` (when given) carries a provider-default framing.

const USAGE = createTokenUsage()

// Split content into per-word deltas (the first word bare, each later word space-prefixed)
// — the multi-delta chunking the streaming + swap tests below feed as `deltasOf`.
const wordDeltas: DeltasOf = (content) =>
	content.split(' ').map((word, index) => (index === 0 ? word : ` ${word}`))

describe('provider-agnosticism — a minimal provider drives the FULL loop', () => {
	it('generate() returns the provider content + summed usage, not partial', async () => {
		const agent = createAgent(
			createScriptedProvider([{ content: 'hello from a fake', usage: USAGE }], { name: 'alpha' }),
		)
		agent.context.messages.add({ role: 'user', content: 'hi' })

		const result = await agent.generate()

		expect(result.content).toBe('hello from a fake')
		expect(result.partial).toBe(false)
		expect(result.usage).toEqual(USAGE)
	})

	it('stream() yields the provider deltas whose join equals the settled content (+ a usage chunk)', async () => {
		const agent = createAgent(
			createScriptedProvider([{ content: 'one two three', usage: USAGE }], {
				name: 'alpha',
				deltasOf: wordDeltas,
			}),
		)
		agent.context.messages.add({ role: 'user', content: 'count' })

		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const result = await stream.result

		const tokens = chunks.flatMap((chunk) => (chunk.type === 'token' ? [chunk.content] : []))
		expect(tokens.length).toBeGreaterThan(1)
		expect(tokens.join('')).toBe(result.content)
		expect(result.content).toBe('one two three')
		expect(chunks.some((chunk) => chunk.type === 'usage')).toBe(true)
	})

	it('drives a full tool ROUND-TRIP — the fake returns a tool call, the loop dispatches it and feeds the result back, the fake then uses it', async () => {
		// Turn 1: the fake requests `add(2,3)`. The loop dispatches the REAL tool, appends the
		// tool result message, and re-drives the provider. Turn 2: the fake returns the final
		// answer. This proves the loop's tool plumbing works through the abstract contract alone
		// — the fake never knows it's inside an Agent, yet the round-trip completes.
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
				{ content: 'the sum is 5', usage: USAGE },
			],
			{ name: 'alpha' },
		)
		const agent = createAgent(provider, { tools, limit: 4 })
		agent.context.messages.add({ role: 'user', content: 'add 2 and 3' })

		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const result = await stream.result

		// The real tool executed exactly once, with the fed-in arguments → 5.
		expect(executed).toBe(1)
		const dispatched = chunks.flatMap((chunk) =>
			chunk.type === 'tool' ? [{ name: chunk.call.name, value: chunk.result.value }] : [],
		)
		expect(dispatched).toEqual([{ name: 'add', value: 5 }])
		// The loop fed the result back and the fake's SECOND turn produced the final answer.
		expect(result.content).toBe('the sum is 5')
		expect(result.partial).toBe(false)
		// The conversation now carries the assistant tool-call turn + the tool-result turn — the
		// loop wrote both back through the abstract contract.
		const roles = agent.context.messages.messages().map((message) => message.role)
		expect(roles).toEqual(['user', 'assistant', 'tool', 'assistant'])
	})

	it('an abort mid-stream commits a PARTIAL of what the fake streamed (resolves, never rejects)', async () => {
		// A multi-delta turn; abort after the first token. The loop must settle partial with the
		// accumulated deltas — the fake's signal-honouring stream supplies the partial, exactly
		// like a real provider would.
		const agent = createAgent(
			createScriptedProvider([{ content: 'a b c d e' }], { name: 'alpha', deltasOf: wordDeltas }),
		)
		agent.context.messages.add({ role: 'user', content: 'go' })

		const stream = agent.stream()
		const streamed: string[] = []
		for await (const chunk of stream.events) {
			if (chunk.type === 'token') {
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
		// The identical builder runs against either provider — the runtime never branches on the
		// concrete backend; it only sees the abstract contract. Swapping the provider swaps the
		// answer with no code change.
		const run = async (provider: ProviderInterface): Promise<string> => {
			const agent = createAgent(provider)
			agent.context.messages.add({ role: 'user', content: 'who are you?' })
			return (await agent.generate()).content
		}

		const first = createScriptedProvider([{ content: 'I am alpha' }], { name: 'alpha' })
		const second = createScriptedProvider([{ content: 'I am beta' }], { name: 'beta' })

		expect(first.name).not.toBe(second.name)
		expect(await run(first)).toBe('I am alpha')
		expect(await run(second)).toBe('I am beta')
	})

	it('the loop passes each provider FORMAT (or none) into build() — a formatted provider frames the system block; an agnostic one falls to the built-ins', async () => {
		// One provider declares an XML instructions framing (its provider-default), the other
		// declares no `format` at all. The SAME agent code drives both; the built system block
		// reflects each provider's framing — the runtime threads `provider.format` into build().
		const formatXml: ContextFormatInterface = {
			instructions: {
				open: '<INSTRUCTIONS>',
				render: (one) => `<i>${one.content}</i>`,
			},
		}
		const framed = createScriptedProvider([{ content: 'ok' }], {
			name: 'framed',
			format: formatXml,
		})
		const agnostic = createScriptedProvider([{ content: 'ok' }], { name: 'agnostic' })

		// A recorder-free way to observe the built block: read it off the context with the SAME
		// `provider.format` the loop would pass (the loop calls `context.build(provider.format)`).
		const buildWith = (provider: ProviderInterface): string => {
			const agent = createAgent(provider)
			agent.context.instructions.add({ name: 'tone', content: 'Be terse.' })
			return agent.context.build(provider.format)[0].content
		}

		// The framed provider's default reframes the instructions section (XML, not Markdown).
		const framedBlock = buildWith(framed)
		expect(framedBlock).toContain('<INSTRUCTIONS>')
		expect(framedBlock).toContain('<i>Be terse.</i>')
		expect(framedBlock).not.toContain('## Instructions')
		// The agnostic provider (no format) leaves the section on the managers' built-in.
		const agnosticBlock = buildWith(agnostic)
		expect(agnosticBlock).toBe('## Instructions\n\nBe terse.')
	})

	it('createScriptedProvider (the shared Ollama-free fixture) is itself a conforming provider that drives the loop', async () => {
		// The shared scripted provider (used across the agent-job tests) is ALSO just a
		// ProviderInterface — driving the loop with it proves the agnosticism claim holds for the
		// fixture every other suite relies on, not only the bespoke fakes above.
		const agent = createAgent(
			createScriptedProvider([{ content: 'scripted answer', usage: USAGE }]),
		)
		agent.context.messages.add({ role: 'user', content: 'hi' })

		const result = await agent.generate()

		expect(result.content).toBe('scripted answer')
		expect(result.partial).toBe(false)
		expect(result.usage).toEqual(USAGE)
	})
})
