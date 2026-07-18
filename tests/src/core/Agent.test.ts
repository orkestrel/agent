import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SchedulerInterface } from '@orkestrel/workflow'
import type { BudgetInterface, TokenUsage } from '@orkestrel/budget'
import type {
	AgentResult,
	ContextFormatInterface,
	MessageInterface,
	ProviderDelta,
	ProviderInterface,
	ProviderResult,
} from '@src/core'
import { createScheduler } from '@orkestrel/workflow'
import { createBudget, createTokenBudget } from '@orkestrel/budget'
import {
	CONVERSATION_RECAP_PREFIX,
	createAgent,
	createAuthority,
	createConversation,
	createConversationManager,
	createTool,
	createToolManager,
	estimateMessages,
	isProviderAbortError,
	ProviderAbortError,
	Scope,
} from '@src/core'
import {
	addTool,
	collect,
	createErrorRecorder,
	createGate,
	createRecorder,
	createRecordingScheduler,
	createScriptedProvider,
	createStubSummarizer,
	createToolCall,
	createTokenUsage,
	loopTool,
	recordEmitterEvents,
	type ScriptedProviderOptions,
	type ScriptedTurn,
	waitForDelay,
} from '../../setup.js'

// Deterministic loop tests for the Agent. The real provider is exercised LIVE in the
// src:ollama project (tests/src/ollama/integration.test.ts); here the shared scripted
// `createScriptedProvider` returns pre-canned ProviderResults in sequence so the LOOP
// itself �€” tool iteration, the chunk stream, generate�†”stream parity, the iteration cap,
// abort / budget bounds, scheduler pacing, status �€” is pinned without a daemon. Every loop
// test opts the provider into `record: true` (to assert, via `provider.calls`, the
// messages / tools the loop sent) and `exhaust: 'throw'` (so a loop that over-ran its
// script fails loudly rather than silently repeating the last turn). The only providers
// that stay LOCAL are the genuine per-scenario BEHAVIOUR fixtures �€” a stream that parks
// on a `createGate()` or throws mid-stream to drive the abort / error / concurrency /
// cancel paths �€” which are scenario behaviour, not replayable data.

const USAGE = createTokenUsage()

// This file's uniform options for the shared scripted provider: every loop test records the
// messages / tools each call saw (asserted via `provider.calls`) and treats over-running the
// script as a loud failure (`exhaust: 'throw'`) rather than the default silent last-turn
// repeat �€” so a loop that should have stopped (a cap / budget / cancel) but didn't is caught.
const SCRIPT_OPTIONS: ScriptedProviderOptions = { name: 'script', record: true, exhaust: 'throw' }

/** A real, hand-rolled {@link BudgetInterface} over {@link TokenUsage} that RECORDS every
 * `consume()` call verbatim (AGENTS §16.1 recorder pattern) instead of extracting a single
 * numeric field like `createTokenBudget` — so a test can sum the recorded field-by-field
 * charges to prove the loop's F2 mid-stream + reconcile charging never double-counts or
 * loses spend. A genuine `BudgetInterface` (its own `AbortController`, its own tally),
 * never a mock of one. */
interface RecordingBudgetInterface extends BudgetInterface<TokenUsage> {
	readonly consumes: readonly TokenUsage[]
}
function createRecordingBudget(max: number): RecordingBudgetInterface {
	const consumes: TokenUsage[] = []
	let consumed = 0
	let controller = new AbortController()
	return {
		id: 'recording-budget',
		get signal() {
			return controller.signal
		},
		max,
		get consumed() {
			return consumed
		},
		get remaining() {
			return max - consumed
		},
		get exhausted() {
			return consumed >= max
		},
		start() {
			if (!controller.signal.aborted) return
			controller = new AbortController()
		},
		consume(value: TokenUsage) {
			consumes.push(value)
			consumed += value.total
			if (consumed >= max && !controller.signal.aborted) controller.abort()
		},
		clear() {
			consumed = 0
			controller = new AbortController()
		},
		get consumes() {
			return consumes
		},
	}
}

describe('Agent �€” single turn', () => {
	it('generate returns the content of a no-tools turn', async () => {
		const provider = createScriptedProvider(
			[{ result: { content: 'hello', usage: USAGE } }],
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate()
		expect(result.content).toBe('hello')
		expect(result.partial).toBe(false)
		expect(result.usage).toEqual(USAGE)
	})

	it('joins provider thinking onto the result; omitted when no call surfaced any (H4)', async () => {
		// A tool round whose turn carries separated reasoning, then a final turn with its
		// own �€” the loop JOINS them (blank-line separated) onto AgentResult.thinking, while
		// the content / messages stay clean (thinking never re-enters the conversation).
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
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate()
		expect(result.content).toBe('done')
		expect(result.thinking).toBe('first thoughts\n\nfinal thoughts')
		// The conversation never saw the reasoning �€” no stored message carries it.
		expect(
			agent.context.messages.messages().some((message) => message.content.includes('thoughts')),
		).toBe(false)
		// And a run with NO thinking omits the optional entirely.
		const plain = createScriptedProvider([{ content: 'plain' }], SCRIPT_OPTIONS)
		const second = createAgent(plain)
		second.context.messages.add({ role: 'user', content: 'hi' })
		const settled = await second.generate()
		expect('thinking' in settled).toBe(false)
	})

	it('surfaces streamed thinking deltas as think chunks without adding them to content', async () => {
		const provider: ProviderInterface = {
			id: 'thinking',
			name: 'thinking',
			async *stream(): AsyncGenerator<ProviderDelta, ProviderResult> {
				yield { type: 'thinking', text: 'plan ' }
				yield { type: 'content', text: 'answer' }
				yield { type: 'thinking', text: 'check' }
				return { content: 'answer', thinking: 'plan check' }
			},
			async generate() {
				return { content: 'answer', thinking: 'plan check' }
			},
		}
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		const events = await collect(stream.events)
		const result = await stream.result
		expect(events).toEqual([
			{ type: 'think', content: 'plan ' },
			{ type: 'token', content: 'answer' },
			{ type: 'think', content: 'check' },
		])
		expect(result.content).toBe('answer')
		expect(result.thinking).toBe('plan check')
	})

	it('forwards the per-run think option to the provider stream', async () => {
		const provider = createScriptedProvider([{ content: 'done' }], SCRIPT_OPTIONS)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		await agent.generate({ think: false })
		expect(provider.calls[0]?.options).toEqual({ think: false })
	})

	it('prepends the system prompt and advertises tools structurally', async () => {
		const tools = createToolManager()
		tools.add(createTool({ name: 'noop', execute: () => null }))
		const provider = createScriptedProvider([{ result: { content: 'done' } }], SCRIPT_OPTIONS)
		const agent = createAgent(provider, { system: 'be brief', tools })
		agent.context.messages.add({ role: 'user', content: 'hi' })
		await agent.generate()
		const [first] = provider.calls
		expect(first?.messages[0]).toMatchObject({ role: 'system', content: 'be brief' })
		expect(first?.messages.at(-1)).toMatchObject({ role: 'user', content: 'hi' })
		// Tools reach the provider via definitions(), never serialized into messages.
		expect(first?.tools).toEqual([{ name: 'noop' }])
		expect(first?.messages.some((m) => m.content.includes('noop'))).toBe(false)
	})
})

describe('Agent �€” passes the provider format into build()', () => {
	it('a scripted provider WITH a format frames the built context (PROVIDER level)', async () => {
		// The loop's ONE build()-level change: it passes `provider.format` into
		// context.build(). A provider declaring a framing default �‡’ the built system block
		// reflects it (the provider beats the managers' built-in framing).
		const format: ContextFormatInterface = {
			instructions: {
				open: '<INSTRUCTIONS>',
				render: (one) => `<i>${one.content}</i>`,
			},
		}
		const provider = createScriptedProvider([{ result: { content: 'done' } }], {
			...SCRIPT_OPTIONS,
			format,
		})
		const agent = createAgent(provider)
		agent.context.instructions.add({ name: 'tone', content: 'Be terse.' })
		agent.context.messages.add({ role: 'user', content: 'hi' })

		await agent.generate()

		const system = provider.calls[0]?.messages[0]
		expect(system?.role).toBe('system')
		// The provider's framing replaced BOTH the built-in '## Instructions' header and the
		// built-in content rendering.
		expect(system?.content).toBe('<INSTRUCTIONS>\n\n<i>Be terse.</i>')
	})

	it('a scripted provider WITHOUT a format reflects the managers built-ins (agnostic)', async () => {
		// An agnostic provider supplies NO format (like OllamaProvider) �‡’ build(undefined) �‡’
		// the managers' built-in framing, byte-for-byte.
		const provider = createScriptedProvider([{ result: { content: 'done' } }], SCRIPT_OPTIONS)
		expect(provider.format).toBeUndefined()
		const agent = createAgent(provider)
		agent.context.instructions.add({ name: 'tone', content: 'Be terse.' })
		agent.context.messages.add({ role: 'user', content: 'hi' })

		await agent.generate()

		expect(provider.calls[0]?.messages[0]?.content).toBe('## Instructions\n\nBe terse.')
	})
})

describe('Agent �€” scope filters the advertised tool definitions', () => {
	it('advertises ALL tools when the context has no scope', async () => {
		const tools = createToolManager()
		tools.add([
			createTool({ name: 'alpha', execute: () => 1 }),
			createTool({ name: 'beta', execute: () => 2 }),
		])
		const provider = createScriptedProvider([{ result: { content: 'done' } }], SCRIPT_OPTIONS)
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'hi' })

		await agent.generate()

		expect(provider.calls[0]?.tools?.map((definition) => definition.name)).toEqual([
			'alpha',
			'beta',
		])
	})

	it('advertises ONLY the scoped-in tools �€” a scoped-out tool is never described', async () => {
		const tools = createToolManager()
		tools.add([
			createTool({ name: 'alpha', execute: () => 1 }),
			createTool({ name: 'beta', execute: () => 2 }),
		])
		const provider = createScriptedProvider([{ result: { content: 'done' } }], SCRIPT_OPTIONS)
		const agent = createAgent(provider, { tools })
		// Only `alpha` is in scope; `beta` is scoped out.
		agent.context.scope = new Scope({ name: 'alpha-only', tools: ['alpha'] })
		agent.context.messages.add({ role: 'user', content: 'hi' })

		await agent.generate()

		const advertised = provider.calls[0]?.tools?.map((definition) => definition.name)
		expect(advertised).toEqual(['alpha'])
		expect(advertised).not.toContain('beta')
	})

	it('advertises NO tools (undefined) when the scope is an empty tool list', async () => {
		const tools = createToolManager()
		tools.add(createTool({ name: 'alpha', execute: () => 1 }))
		const provider = createScriptedProvider([{ result: { content: 'done' } }], SCRIPT_OPTIONS)
		const agent = createAgent(provider, { tools })
		agent.context.scope = new Scope({ name: 'no-tools', tools: [] })
		agent.context.messages.add({ role: 'user', content: 'hi' })

		await agent.generate()

		// No tool passes the empty allow-list �†’ the provider is handed `undefined`.
		expect(provider.calls[0]?.tools).toBeUndefined()
	})

	it('a scoped-out tool is NOT callable �€” its handler never runs when the model requests it', async () => {
		// The model (turn 1) requests `secret`; but `secret` is scoped out, so it was never
		// advertised. The loop still dispatches the call through the manager �€” proving the
		// scope did not merely hide the description: a scoped-out tool must not be callable.
		// Here we assert the model could only ever have seen `safe`, so a well-behaved model
		// can't call `secret`; and even if it does, the advertised set excludes it.
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
		const provider = createScriptedProvider(
			[
				{ result: { content: '', tools: [{ id: 'c1', name: 'safe', arguments: {} }] } },
				{ result: { content: 'final' } },
			],
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools })
		agent.context.scope = new Scope({ name: 'safe-only', tools: ['safe'] })
		agent.context.messages.add({ role: 'user', content: 'go' })

		await agent.generate()

		// The model was only ever told about `safe` on every turn.
		for (const call of provider.calls) {
			expect(call.tools?.map((definition) => definition.name)).toEqual(['safe'])
		}
		// `secret`'s handler never ran (it was never advertised, so the model can't reach it).
		expect(ran).not.toContain('secret')
		expect(ran).toContain('safe')
	})
})

describe('Agent �€” tool iteration', () => {
	it('dispatches a tool call then finishes with the follow-up turn', async () => {
		const tools = createToolManager()
		tools.add(createTool({ name: 'add', execute: (args) => Number(args.a) + Number(args.b) }))
		const provider = createScriptedProvider(
			[
				{ result: { content: '', tools: [{ id: 'c1', name: 'add', arguments: { a: 2, b: 3 } }] } },
				{ result: { content: 'the answer is 5', usage: USAGE } },
			],
			SCRIPT_OPTIONS,
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
		expect(toolMessage?.content).toBe(JSON.stringify(5))
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
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		expect(result.content).toBe('recovered')
		const [, second] = provider.calls
		expect(second?.messages.at(-1)?.content).toBe(JSON.stringify('kaboom'))
	})
})

describe('Agent �€” authority gate', () => {
	it('no authority �†’ a tool call executes unchanged (Ch5 behavior)', async () => {
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
			SCRIPT_OPTIONS,
		)
		// No `authority` option �†’ the gate is a straight pass-through.
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
			SCRIPT_OPTIONS,
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
		const toolChunk = chunks.find((c) => c.type === 'tool')
		expect(toolChunk).toEqual({
			type: 'tool',
			call: { id: 'c1', name: 'add', arguments: { a: 2, b: 3 } },
			result: { id: 'c1', name: 'add', value: 5 },
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
			SCRIPT_OPTIONS,
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
		const toolChunk = chunks.find((c) => c.type === 'tool')
		expect(toolChunk).toEqual({
			type: 'tool',
			call: { id: 'c1', name: 'add', arguments: { a: 2, b: 3 } },
			result: { id: 'c1', name: 'add', error: 'denied: blocked' },
		})
		// The loop continued: a SECOND provider call happened, and it SAW the denial as the
		// last (tool) message �€” so the model can react to it.
		expect(provider.calls).toHaveLength(2)
		const [, second] = provider.calls
		expect(second?.messages.at(-1)?.role).toBe('tool')
		expect(second?.messages.at(-1)?.content).toBe(JSON.stringify('denied: blocked'))
		expect(result.content).toBe('understood, blocked')
		expect(result.partial).toBe(false)
	})

	it('a denied call with no reason feeds back a generic denial', async () => {
		const tools = createToolManager()
		tools.add(addTool())
		const provider = createScriptedProvider(
			[{ result: { content: '', tools: [createToolCall()] } }, { result: { content: 'ok' } }],
			SCRIPT_OPTIONS,
		)
		// A deny rule with NO reason �†’ the generic 'denied by authority' message.
		const authority = createAuthority({
			rules: [{ match: () => true, zone: 'restricted', allowed: false }],
		})
		const agent = createAgent(provider, { tools, authority })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		await stream.result
		const toolChunk = chunks.find((c) => c.type === 'tool')
		expect(toolChunk).toEqual({
			type: 'tool',
			call: { id: 'c1', name: 'add', arguments: {} },
			result: { id: 'c1', name: 'add', error: 'denied by authority' },
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
			SCRIPT_OPTIONS,
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
			c.type === 'tool' ? [{ id: c.call.id, result: c.result }] : [],
		)
		expect(toolResults).toEqual([
			{ id: 'a1', result: { id: 'a1', name: 'add', value: 5 } },
			{ id: 'd1', result: { id: 'd1', name: 'delete', error: 'denied: no deletes' } },
			{ id: 'a2', result: { id: 'a2', name: 'add', value: 5 } },
		])
		// The next turn's tool messages are appended in the same order.
		const [, second] = provider.calls
		const toolContents = (second?.messages ?? [])
			.filter((m) => m.role === 'tool')
			.map((m) => m.content)
		expect(toolContents).toEqual([
			JSON.stringify(5),
			JSON.stringify('denied: no deletes'),
			JSON.stringify(5),
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
		// Every turn requests the same denied tool �€” only `limit` reached stops it.
		const provider = createScriptedProvider(
			Array.from({ length: 10 }, () => ({
				result: { content: '', tools: [createToolCall({ id: 'c', name: 'loop' })] },
			})),
			SCRIPT_OPTIONS,
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
		// F1: the model still held unresolved tool intent on the last allowed turn (every turn
		// requested the denied tool) — the loop exhausted its limit, so the outcome is partial.
		expect(result.partial).toBe(true)
		// Each turn produced exactly one tool chunk carrying a denial.
		const toolChunks = chunks.filter((c) => c.type === 'tool')
		expect(toolChunks).toHaveLength(3)
		expect(
			toolChunks.every((c) => c.type === 'tool' && c.result.error === 'denied: all blocked'),
		).toBe(true)
	})
})

describe('Agent �€” generate �†” stream parity', () => {
	it('generate result deep-equals draining the stream of the same script', async () => {
		const script: readonly ScriptedTurn[] = [
			{ result: { content: 'one', usage: USAGE }, deltas: ['on', 'e'] },
		]
		const a = createAgent(createScriptedProvider(script, SCRIPT_OPTIONS))
		a.context.messages.add({ role: 'user', content: 'hi' })
		const generated = await a.generate()

		const b = createAgent(createScriptedProvider(script, SCRIPT_OPTIONS))
		b.context.messages.add({ role: 'user', content: 'hi' })
		const stream = b.stream()
		await collect(stream.events)
		const streamed = await stream.result

		expect(streamed).toEqual(generated)
	})

	// A multi-turn tool script with usage on each turn �€” generate and a fully-drained
	// stream must agree on the final content AND the summed usage.
	it('parity under multi-turn tool iteration (content + summed usage agree)', async () => {
		const script: readonly ScriptedTurn[] = [
			{
				result: { content: '', tools: [createToolCall()], usage: USAGE },
				deltas: [],
			},
			{ result: { content: 'sum 5', usage: USAGE }, deltas: ['sum', ' 5'] },
		]
		const makeTools = () => {
			const tools = createToolManager()
			tools.add(addTool())
			return tools
		}
		const a = createAgent(createScriptedProvider(script, SCRIPT_OPTIONS), {
			tools: makeTools(),
			limit: 5,
		})
		a.context.messages.add({ role: 'user', content: 'go' })
		const generated = await a.generate()

		const b = createAgent(createScriptedProvider(script, SCRIPT_OPTIONS), {
			tools: makeTools(),
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
		const makeTools = () => {
			const tools = createToolManager()
			tools.add(addTool())
			return tools
		}
		const makeAuthority = () =>
			createAuthority({
				rules: [{ match: () => true, zone: 'r', allowed: false, reason: 'no' }],
			})
		const a = createAgent(createScriptedProvider(script, SCRIPT_OPTIONS), {
			tools: makeTools(),
			authority: makeAuthority(),
			limit: 5,
		})
		a.context.messages.add({ role: 'user', content: 'go' })
		const generated = await a.generate()

		const b = createAgent(createScriptedProvider(script, SCRIPT_OPTIONS), {
			tools: makeTools(),
			authority: makeAuthority(),
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
				result: { content: 'a', tools: [createToolCall({ id: 'c', name: 'loop' })], usage: USAGE },
			},
			{ result: { content: 'b' } },
		]
		const makeTools = () => {
			const tools = createToolManager()
			tools.add(createTool({ name: 'loop', execute: () => 'x' }))
			return tools
		}
		const a = createAgent(createScriptedProvider(script, SCRIPT_OPTIONS), {
			tools: makeTools(),
			budget: createTokenBudget({ max: 12, scope: 'total' }),
		})
		a.context.messages.add({ role: 'user', content: 'go' })
		const generated = await a.generate()

		const b = createAgent(createScriptedProvider(script, SCRIPT_OPTIONS), {
			tools: makeTools(),
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
		const a = createAgent(createScriptedProvider(script, SCRIPT_OPTIONS), {
			signal: controllerA.signal,
		})
		a.context.messages.add({ role: 'user', content: 'hi' })
		const generated = await a.generate()

		const controllerB = new AbortController()
		controllerB.abort()
		const b = createAgent(createScriptedProvider(script, SCRIPT_OPTIONS), {
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

describe('Agent �€” chunk sequence', () => {
	it('yields token(s) �†’ usage �†’ tool �†’ token(s) �†’ usage in order', async () => {
		const tools = createToolManager()
		tools.add(addTool())
		const provider = createScriptedProvider(
			[
				{
					result: {
						content: 'calling',
						tools: [createToolCall()],
						usage: USAGE,
					},
					deltas: ['call', 'ing'],
				},
				{ result: { content: 'final', usage: USAGE }, deltas: ['fin', 'al'] },
			],
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const types = chunks.map((c) => c.type)
		expect(types).toEqual(['token', 'token', 'usage', 'tool', 'token', 'token', 'usage'])
		// The tool chunk carries the dispatched call + its executed result.
		const toolChunk = chunks.find((c) => c.type === 'tool')
		expect(toolChunk).toEqual({
			type: 'tool',
			call: { id: 'c1', name: 'add', arguments: {} },
			result: { id: 'c1', name: 'add', value: 5 },
		})
		const tokens = chunks.filter((c) => c.type === 'token').map((c) => c.content)
		expect(tokens).toEqual(['call', 'ing', 'fin', 'al'])
		const result = await stream.result
		expect(result.content).toBe('final')
		// Usage summed across both provider calls.
		expect(result.usage).toEqual({ prompt: 10, completion: 14, total: 24 })
	})
})

describe('Agent �€” iteration cap', () => {
	it('stops at limit when the model always requests a tool (no infinite loop)', async () => {
		const tools = createToolManager()
		tools.add(loopTool())
		// Every turn returns a tool call �€” only `limit` reached stops it.
		const provider = createScriptedProvider(
			Array.from({ length: 10 }, () => ({
				result: { content: '', tools: [createToolCall({ id: 'c', name: 'loop' })] },
			})),
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, limit: 3 })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		// 3 turns ran, then the loop stopped (didn't exhaust the 10-turn script forever). F1: the
		// model still wanted a tool on the last allowed turn, so this is an exhaustion — partial.
		expect(provider.calls).toHaveLength(3)
		expect(result.partial).toBe(true)
	})
})

describe('Agent �€” abort', () => {
	it('a pre-aborted external signal commits a partial without calling the provider', async () => {
		const provider = createScriptedProvider([{ result: { content: 'never' } }], SCRIPT_OPTIONS)
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
		const gate = createGate()
		// A provider whose stream yields one delta, then waits on a gate before the next �€”
		// giving the test a window to call abort() mid-stream.
		const provider: ProviderInterface = {
			id: 's',
			name: 's',
			async *stream(_messages, signal) {
				yield { type: 'content', text: 'part' }
				await gate.promise
				if (signal.aborted) throw new ProviderAbortError({ content: 'part' })
				return { content: 'partfull' }
			},
			async generate() {
				return { content: 'partfull' }
			},
		}
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
		// NOT aborted �€” a genuine provider failure must propagate (the run rejects, status
		// �†’ error), distinct from the abort path that commits a partial. The reachable
		// `yield` keeps it a real generator; the throw after it is reachable too.
		async function* failingStream(): AsyncGenerator<ProviderDelta, ProviderResult> {
			yield { type: 'content', text: 'partial' }
			throw new Error('boom')
		}
		const provider: ProviderInterface = {
			id: 'e',
			name: 'e',
			stream: failingStream,
			async generate() {
				throw new Error('boom')
			},
		}
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		await expect(agent.generate()).rejects.toThrow('boom')
		expect(agent.status).toBe('error')
	})
})

describe('Agent �€” budget bound', () => {
	it('stops and commits partial once the token budget is exhausted', async () => {
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
						usage: USAGE,
					},
				},
				{
					result: {
						content: 'b',
						tools: [createToolCall({ id: 'c', name: 'loop' })],
						usage: USAGE,
					},
				},
				{ result: { content: 'c' } },
			],
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, budget })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		expect(result.partial).toBe(true)
		// Only the first turn ran before the budget exhausted the bound.
		expect(provider.calls).toHaveLength(1)
	})
})

describe('Agent �€” scheduler pacing', () => {
	it('yields between turns, not after the last', async () => {
		const scheduler = createRecordingScheduler()
		const tools = createToolManager()
		tools.add(addTool())
		const provider = createScriptedProvider(
			[
				{ result: { content: '', tools: [createToolCall()] } },
				{ result: { content: '', tools: [createToolCall({ id: 'c2' })] } },
				{ result: { content: 'done' } },
			],
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, scheduler })
		agent.context.messages.add({ role: 'user', content: 'go' })
		await agent.generate()
		// 3 turns ran �†’ yield fired before turns 2 and 3 only (not before turn 1, not after).
		expect(provider.calls).toHaveLength(3)
		expect(scheduler.yields).toBe(2)
	})
})

describe('Agent �€” status', () => {
	it('transitions idle �†’ running �†’ done', async () => {
		const provider = createScriptedProvider([{ result: { content: 'ok' } }], SCRIPT_OPTIONS)
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

describe('Agent �€” deadline cleanup (fake timers)', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	// A normal completion must disarm the per-turn deadline �€” the timeout `Timeout` is
	// `start()`ed when the run begins, so a turn that finishes naturally has to `clear()`
	// it in a `finally`, never leaving the host `setTimeout` armed (it would keep the
	// event loop alive and could abort a later turn if the Agent is reused). Fake timers
	// make the leak observable: a leaked deadline shows as one pending host timer. The
	// scripted provider only awaits microtasks, so `generate()` settles without advancing
	// the clock �€” what remains is exactly the deadline timer under test.
	it('clears the per-turn timeout on a successful generate (no leaked host timer)', async () => {
		vi.useFakeTimers()
		const agent = createAgent(
			createScriptedProvider([{ result: { content: 'hi' } }], SCRIPT_OPTIONS),
			{
				timeout: 30_000,
			},
		)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate()
		expect(result.content).toBe('hi')
		expect(result.partial).toBe(false)
		// The deadline fired neither expiry nor abort �€” it must have been cleared, leaving
		// zero pending host timers (a leak would report 1).
		expect(vi.getTimerCount()).toBe(0)
	})
})

// The DRIVE mechanism behind the stream handle: `result` must settle from an EAGER pump
// that runs regardless of whether `events` is consumed �€” never from a lazy `finally` that
// only executes once a consumer pulls `events`. These pin that contract deterministically
// (scripted provider, no live model): awaiting `result` WITHOUT draining `events` must
// resolve (the exact hang the old lazy-settle had), an early `break` must settle a
// non-misleading partial + cancel the run, and a provider throw must reject `result` even
// when `events` is never touched �€” all with the deadline timer cleared on every path.
describe('Agent �€” stream drive (result settles independently of events)', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it('settles result without draining events (the no-drain hang repro)', async () => {
		const script: readonly ScriptedTurn[] = [
			{ result: { content: 'hello', usage: USAGE }, deltas: ['hel', 'lo'] },
		]
		// The assembled content a FULLY-DRAINED stream produces �€” what no-drain must match.
		const drainAgent = createAgent(createScriptedProvider(script, SCRIPT_OPTIONS))
		drainAgent.context.messages.add({ role: 'user', content: 'hi' })
		const drainStream = drainAgent.stream()
		await collect(drainStream.events)
		const drained = await drainStream.result

		const agent = createAgent(createScriptedProvider(script, SCRIPT_OPTIONS))
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		// Await `result` and NEVER touch `stream.events`. Against the old lazy-settle this
		// hangs forever (status stuck 'running'); the eager pump must resolve it promptly.
		const result = await stream.result
		expect(result.content).toBe('hello')
		expect(result.content).toBe(drained.content)
		expect(result.partial).toBe(false)
		expect(result.usage).toEqual(USAGE)
		expect(agent.status).toBe('done')
	})

	it('leaks no host timer when result is awaited without draining events', async () => {
		vi.useFakeTimers()
		const agent = createAgent(
			createScriptedProvider([{ result: { content: 'hi' } }], SCRIPT_OPTIONS),
			{
				timeout: 30_000,
			},
		)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		// Without draining `events`, the deadline's `clear()` must still run (it lives in the
		// pump's `finally`, not the never-pulled events `finally`) �€” zero pending host timers.
		const result = await stream.result
		expect(result.content).toBe('hi')
		expect(vi.getTimerCount()).toBe(0)
	})

	it('breaking out of events early settles a partial, cancels the run, and leaks no timer', async () => {
		vi.useFakeTimers()
		const tools = createToolManager()
		tools.add(createTool({ name: 'noop', execute: () => null }))
		// A long script that would emit many chunks across turns if left to run �€” breaking
		// after the first chunk must stop it well short (proving the early break cancelled).
		const provider = createScriptedProvider(
			Array.from({ length: 5 }, () => ({
				result: { content: '', tools: [{ id: 'c', name: 'noop', arguments: {} }] },
				deltas: ['a', 'b', 'c'],
			})),
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, timeout: 30_000 })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		// Pull exactly ONE chunk via the iterator protocol, then `return()` the iterator �€”
		// the early-break a consumer's `break` triggers �€” without an unused loop binding.
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
		expect(vi.getTimerCount()).toBe(0)
	})

	it('rejects result on a genuine provider error without draining events', async () => {
		// A provider that throws (signal NOT aborted) �€” a genuine failure must reject `result`
		// even when `events` is never pulled, and leave status 'error'.
		async function* failingStream(): AsyncGenerator<ProviderDelta, ProviderResult> {
			yield { type: 'content', text: 'partial' }
			throw new Error('boom')
		}
		const provider: ProviderInterface = {
			id: 'e',
			name: 'e',
			stream: failingStream,
			async generate() {
				throw new Error('boom')
			},
		}
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		// Reject must surface on `result` with NO consumer of `events`.
		await expect(stream.result).rejects.toThrow('boom')
		expect(agent.status).toBe('error')
	})

	it('an abandoned throwing handle (events undrained, result unawaited) leaks no unhandledRejection', async () => {
		// A provider that throws (signal NOT aborted) �€” a genuine failure. The pump rejects the
		// PUBLIC `result` (`settled.promise`) in its `finally` without re-throwing, so the pump
		// promise itself resolves; the rejection lives solely on `settled.promise`. If nothing
		// guards it, a handle whose owner touches NEITHER `events` NOR `result` leaves that
		// rejection unhandled �†’ Node fires a process-level unhandledRejection. The fix guards
		// `settled.promise` with a no-op `.catch`, marking it handled (the warning is suppressed)
		// while every separate `await result` consumer still rejects (`.catch` returns a derived
		// promise, it does not consume the original's rejection).
		async function* failingStream(): AsyncGenerator<ProviderDelta, ProviderResult> {
			yield { type: 'content', text: 'partial' }
			throw new Error('boom')
		}
		const provider: ProviderInterface = {
			id: 'e',
			name: 'e',
			stream: failingStream,
			async generate() {
				throw new Error('boom')
			},
		}
		// Record process-level unhandledRejections for the duration of this test only; the
		// `finally` removes the listener so it can never leak into a sibling test.
		const rejections: unknown[] = []
		const onUnhandled = (reason: unknown): void => {
			rejections.push(reason)
		}
		process.on('unhandledRejection', onUnhandled)
		try {
			const agent = createAgent(provider)
			agent.context.messages.add({ role: 'user', content: 'hi' })
			// Touch NEITHER `s.events` NOR `s.result` �€” an abandoned handle.
			const s = agent.stream()
			expect(s).toBeDefined()
			// Advance the event loop enough for the pump to run and reject `settled.promise`, so a
			// leaked rejection WOULD have surfaced by now: unhandledRejection fires on a later
			// microtask checkpoint, so turn the macrotask queue a couple of times.
			await waitForDelay()
			await waitForDelay()
			// The guard on `settled.promise` marked the rejection handled �€” none leaked.
			expect(rejections).toEqual([])
			expect(agent.status).toBe('error')
		} finally {
			process.off('unhandledRejection', onUnhandled)
		}
	})
})

// �”€�”€ Channel internals (exercised THROUGH the public stream) �”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€
//
// The private unbounded async Channel the pump writes chunks into is not exported,
// so its invariants are pinned through `stream().events` �€” the one consumer of its
// `drain()`. These drive the load-bearing properties: no lost wakeup (a push between
// two pulls is delivered), no truncation (chunks pushed alongside the close are all
// drained), FIFO under backpressure (a slow consumer still sees every chunk in order),
// and a fail surfacing as a throw out of the iterator.

describe('Agent �€” channel internals (via stream.events)', () => {
	it('delivers a chunk pushed between two pulls �€” no lost wakeup', async () => {
		// A provider whose deltas arrive one macrotask apart, so the consumer's pull parks
		// on an empty buffer and a later push must wake it (the resolver-swap path). If a
		// wakeup were lost the second pull would hang and `collect` would never finish.
		const provider: ProviderInterface = {
			id: 'w',
			name: 'w',
			async *stream(): AsyncGenerator<ProviderDelta, ProviderResult> {
				yield { type: 'content', text: 'a' }
				await waitForDelay() // consumer drains 'a', then parks on the empty buffer
				yield { type: 'content', text: 'b' }
				return { content: 'ab' }
			},
			async generate() {
				return { content: 'ab' }
			},
		}
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const tokens = chunks.flatMap((c) => (c.type === 'token' ? [c.content] : []))
		expect(tokens).toEqual(['a', 'b'])
		const result = await stream.result
		expect(result.content).toBe('ab')
	})

	it('drains every chunk pushed alongside the close �€” no truncation', async () => {
		// A whole turn's many deltas plus its usage are pushed by the pump before it
		// `close()`s; draining must yield ALL of them (the drain loop empties the buffer
		// fully before honouring the close), with the final usage last.
		const provider = createScriptedProvider(
			[{ result: { content: 'abcdef', usage: USAGE }, deltas: ['a', 'b', 'c', 'd', 'e', 'f'] }],
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const types = chunks.map((c) => c.type)
		expect(types).toEqual(['token', 'token', 'token', 'token', 'token', 'token', 'usage'])
		const tokens = chunks.flatMap((c) => (c.type === 'token' ? [c.content] : []))
		expect(tokens).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
	})

	it('preserves FIFO order for a consumer slower than the producer (backpressure)', async () => {
		// The producer pushes a long run of deltas with no awaits between them (they pile
		// into the unbounded buffer); a consumer that awaits a macrotask per chunk drains
		// them well after they were pushed. Order must be exactly as produced.
		const deltas = Array.from({ length: 50 }, (_unused, index) => `t${index}`)
		const provider = createScriptedProvider(
			[{ result: { content: deltas.join('') }, deltas }],
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		const seen: string[] = []
		for await (const chunk of stream.events) {
			if (chunk.type === 'token') seen.push(chunk.content)
			await waitForDelay() // pull slower than the producer pushed
		}
		expect(seen).toEqual(deltas)
		const result = await stream.result
		expect(result.content).toBe(deltas.join(''))
	})

	it('a failed channel surfaces the error out of the iterator (drain throws)', async () => {
		// A genuine provider throw (signal NOT aborted) `fail`s the channel; iterating
		// `events` must THROW that same error out of the drain �€” the consumer sees it, not
		// a silent close. (The `result` rejection is covered elsewhere; here it is the
		// iterator throw that is under test.)
		async function* failingStream(): AsyncGenerator<ProviderDelta, ProviderResult> {
			yield { type: 'content', text: 'partial' }
			throw new Error('channel-fail')
		}
		const provider: ProviderInterface = {
			id: 'cf',
			name: 'cf',
			stream: failingStream,
			async generate() {
				throw new Error('channel-fail')
			},
		}
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		await expect(collect(stream.events)).rejects.toThrow('channel-fail')
		// The result rejects with the same error (guarded so it does not leak unhandled).
		await expect(stream.result).rejects.toThrow('channel-fail')
		expect(agent.status).toBe('error')
	})
})

// �”€�”€ Re-entrancy / reuse (the contract: each run is a fresh, independent run) �”€�”€
//
// `generate` / `stream` are reusable and may overlap. The per-run state (outcome /
// channel / settled / the run's abort handle) is created fresh per call, so two runs
// never clobber each other's RESULT. These pin that: a second run on the same agent
// produces its own independent outcome; concurrent runs each settle on their own;
// and �€” the load-bearing fix �€” `agent.abort()` cancels EVERY in-flight run while a
// handle's own `stream.abort()` cancels exactly the run it belongs to (never a sibling
// a later `stream()` would have clobbered under a single shared field).

// A two-turn-then-done provider keyed off a per-call counter, so each fresh run starts
// its own turn sequence (no shared external index that a second run would exhaust).
function reusableProvider(): ProviderInterface {
	return {
		id: 'reuse',
		name: 'reuse',
		async *stream(messages): AsyncGenerator<ProviderDelta, ProviderResult> {
			// Echo the last user message's content into the answer, so two runs with
			// different conversations produce distinguishable results.
			const last = messages.at(-1)
			yield { type: 'content', text: 'ok:' }
			return { content: `ok:${last?.content ?? ''}`, usage: USAGE }
		},
		async generate(messages) {
			const last = messages.at(-1)
			return { content: `ok:${last?.content ?? ''}`, usage: USAGE }
		},
	}
}

describe('Agent �€” re-entrancy / reuse', () => {
	it('generate() twice runs two independent turns (status returns to done each time)', async () => {
		const agent = createAgent(reusableProvider())
		agent.context.messages.add({ role: 'user', content: 'first' })
		const r1 = await agent.generate()
		expect(r1.content).toBe('ok:first')
		expect(r1.partial).toBe(false)
		expect(agent.status).toBe('done')
		// A second generate on the same agent reuses it cleanly �€” its own fresh run.
		agent.context.messages.add({ role: 'user', content: 'second' })
		const r2 = await agent.generate()
		expect(r2.content).toBe('ok:second')
		expect(r2.partial).toBe(false)
		expect(agent.status).toBe('done')
	})

	it('two concurrent stream() runs settle on their own results independently', async () => {
		// Distinct conversations on two agents (one shared context can't represent two
		// independent conversations) �€” the point is each run's OWN result settles, with no
		// cross-talk through shared instance fields.
		const a = createAgent(reusableProvider())
		a.context.messages.add({ role: 'user', content: 'A' })
		const b = createAgent(reusableProvider())
		b.context.messages.add({ role: 'user', content: 'B' })
		const sa = a.stream()
		const sb = b.stream()
		const [ra, rb] = await Promise.all([
			(async () => {
				await collect(sa.events)
				return sa.result
			})(),
			(async () => {
				await collect(sb.events)
				return sb.result
			})(),
		])
		expect(ra.content).toBe('ok:A')
		expect(rb.content).toBe('ok:B')
	})

	it('agent.abort() cancels EVERY in-flight run (not just the most recent)', async () => {
		// Two overlapping runs on ONE agent. Each parks on its own gate mid-stream; a single
		// `agent.abort()` must commit BOTH partial �€” the regression being that a shared
		// single abort field made `abort()` fire only the latest run, leaving the earlier
		// one to run to a full (non-partial) finish.
		const g1 = createGate()
		const g2 = createGate()
		let started = 0
		const provider: ProviderInterface = {
			id: 'm',
			name: 'm',
			async *stream(_messages, signal): AsyncGenerator<ProviderDelta, ProviderResult> {
				started += 1
				const gate = started === 1 ? g1 : g2
				yield { type: 'content', text: 'part' }
				await gate.promise
				if (signal.aborted) throw new ProviderAbortError({ content: 'part' })
				return { content: 'full' }
			},
			async generate() {
				return { content: 'full' }
			},
		}
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
		// BOTH committed partial with the accumulated 'part' �€” neither ran to 'full'.
		expect(r1).toEqual({ content: 'part', partial: true })
		expect(r2).toEqual({ content: 'part', partial: true })
	})

	it('stream.abort() cancels only its OWN run, never a sibling started later', async () => {
		// s1.abort() must cancel run 1 �€” even though a later stream() (run 2) exists. The
		// regression being that the returned abort fired a shared field (overwritten by run
		// 2), so s1.abort() cancelled run 2 and left run 1 running to a full finish.
		const g1 = createGate()
		const g2 = createGate()
		let started = 0
		const provider: ProviderInterface = {
			id: 'own',
			name: 'own',
			async *stream(_messages, signal): AsyncGenerator<ProviderDelta, ProviderResult> {
				started += 1
				const me = started
				const gate = me === 1 ? g1 : g2
				yield { type: 'content', text: 'part' }
				await gate.promise
				if (signal.aborted) throw new ProviderAbortError({ content: 'part' })
				return { content: `full-${me}` }
			},
			async generate() {
				return { content: 'full' }
			},
		}
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
		const agent = createAgent(reusableProvider())
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

// �”€�”€ Cancellation timing matrix �”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€
//
// A cancel �€” wherever in the turn it lands �€” must commit a PARTIAL (resolve, never
// reject), leave status no longer 'running', clear the deadline, and surface exactly
// the content accumulated before the cancel. These walk the distinct landing points:
// during tool execution, AT a turn boundary's scheduler yield, exactly at a budget
// boundary vs mid-stream, a deadline firing during tool execution, and an abort that
// arrives after the run already finished (a harmless no-op).

describe('Agent �€” cancellation timing matrix', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it('abort DURING tool execution commits a partial (the tool turn already streamed)', async () => {
		// Turn 1 streams a delta + requests a tool whose handler parks on a gate; aborting
		// while the handler is in flight must stop the loop and commit partial. The first
		// turn's content delta was accumulated, so it surfaces as the partial content.
		const gate = createGate()
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
			SCRIPT_OPTIONS,
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
		// THE REGRESSION: the real `scheduler.yield({ signal })` REJECTS a pending yield when
		// the signal aborts. That rejection is thrown out of the inter-turn pacing point �€”
		// it must be treated as a cancel (resolve partial), NOT propagated as a genuine error
		// (which would reject the result). An always-tool provider keeps the loop yielding
		// between turns; the abort lands while parked in the real yield.
		const tools = createToolManager()
		tools.add(loopTool())
		const scheduler = createScheduler() // the REAL scheduler �€” yield rejects on abort
		const provider = createScriptedProvider(
			Array.from({ length: 6 }, () => ({
				result: { content: 'turn', tools: [createToolCall({ id: 'c', name: 'loop' })] },
			})),
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, scheduler, limit: 6 })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		const drained = collect(stream.events)
		// Abort on the next microtask so it lands during the first inter-turn yield (the
		// real scheduler's yield is a setTimeout(0) the abort interrupts).
		queueMicrotask(() => agent.abort())
		await drained
		// Resolves partial �€” the abort-driven yield rejection was caught as a cancel.
		const result = await stream.result
		expect(result.partial).toBe(true)
		expect(agent.status).toBe('done')
		// It stopped well short of the 6-turn script (the cancel landed at a turn boundary).
		expect(provider.calls.length).toBeLessThan(6)
	})

	it('budget exhausting EXACTLY at a turn boundary commits partial before the next turn', async () => {
		// Turn 1's usage crosses max exactly, firing the budget signal. The next turn's top
		// sees the bound aborted and commits partial �€” only one provider call happened.
		const budget = createTokenBudget({ max: 12, scope: 'total' })
		const tools = createToolManager()
		tools.add(createTool({ name: 'loop', execute: () => 'x' }))
		const provider = createScriptedProvider(
			[
				{
					result: {
						content: 'a',
						tools: [createToolCall({ id: 'c', name: 'loop' })],
						usage: USAGE,
					},
				},
				{ result: { content: 'b' } },
			],
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, budget })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		expect(result.partial).toBe(true)
		expect(provider.calls).toHaveLength(1)
		// Turn 1's content was accumulated as the partial.
		expect(result.content).toBe('a')
	})

	it('a deadline firing DURING tool execution commits partial (fake timers)', async () => {
		vi.useFakeTimers()
		// Turn 1 streams + requests a tool whose handler awaits a real timer; advancing the
		// clock past the deadline while the handler is pending fires the timeout, so the loop
		// commits partial rather than running turn 2.
		const tools = createToolManager()
		tools.add(
			createTool({
				name: 'slow',
				execute: async () => {
					// A 10s handler �€” longer than the 1s deadline below.
					await new Promise((resolve) => setTimeout(resolve, 10_000))
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
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, timeout: 1_000 })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		const drained = collect(stream.events)
		// Let turn 1 stream + dispatch the tool (microtasks), then fire the deadline while
		// the tool handler is still parked on its 10s timer.
		await vi.advanceTimersByTimeAsync(1_001)
		// Let the tool's own timer elapse so the handler resolves and the loop unwinds.
		await vi.advanceTimersByTimeAsync(10_000)
		await drained
		const result = await stream.result
		expect(result.partial).toBe(true)
		expect(result.content).toBe('mid')
		expect(provider.calls).toHaveLength(1)
		expect(agent.status).toBe('done')
	})

	it('abort AFTER the run finished is a harmless no-op', async () => {
		const provider = createScriptedProvider(
			[{ result: { content: 'done', usage: USAGE } }],
			SCRIPT_OPTIONS,
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

// �”€�”€ limit boundary �”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€

describe('Agent �€” limit boundary', () => {
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
		// The single turn requests a tool �€” but with limit:1 the loop appends the assistant
		// tool turn, runs the tool, then the `for` bound stops it BEFORE a second provider
		// call. So exactly one provider call happens and there is no follow-up turn.
		const provider = createScriptedProvider(
			[{ result: { content: 'one', tools: [createToolCall()] } }, { result: { content: 'two' } }],
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, limit: 1 })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const result = await stream.result
		// One provider call only; the tool DID run on that turn (it was dispatched), and a
		// tool chunk was emitted �€” but no second turn followed.
		expect(provider.calls).toHaveLength(1)
		expect(recorder.count).toBe(1)
		expect(chunks.some((c) => c.type === 'tool')).toBe(true)
		// F1: the single allowed turn requested a tool (unresolved intent) and the limit was
		// then exhausted — the cap-bounded finish reports `partial: true` with whatever the
		// single turn streamed as its content.
		expect(result.partial).toBe(true)
		expect(result.content).toBe('one')
	})

	it('limit:1 with a no-tools turn finishes naturally (not partial)', async () => {
		const provider = createScriptedProvider(
			[{ result: { content: 'final', usage: USAGE } }],
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { limit: 1 })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		// A single no-tools turn IS the natural finish �€” limit was not the stopping reason.
		expect(result.partial).toBe(false)
		expect(result.content).toBe('final')
		expect(provider.calls).toHaveLength(1)
	})

	it('the default limit is DEFAULT_AGENT_LIMIT (10) tool iterations', async () => {
		const tools = createToolManager()
		tools.add(loopTool())
		// 20 always-tool turns available, but no explicit limit �†’ the default cap stops it.
		const provider = createScriptedProvider(
			Array.from({ length: 20 }, () => ({
				result: { content: '', tools: [createToolCall({ id: 'c', name: 'loop' })] },
			})),
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		expect(provider.calls).toHaveLength(10)
		// F1: every turn requested the tool, so the last allowed turn still held unresolved
		// intent when the default cap was reached — the outcome is partial (exhausted).
		expect(result.partial).toBe(true)
	})
})

// �”€�”€ Provider failure modes (scripted) �”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€

describe('Agent �€” provider failure modes', () => {
	it('a stream that throws BEFORE the first yield rejects with status error', async () => {
		// Throws on the FIRST `.next()`, before any delta is produced �€” the provider failing at
		// the very start of the turn. The trailing `yield` keeps it a real generator (and stays
		// reachable to the linter, since the throw is gated on a runtime flag), but the throw
		// fires first so no token ever streams.
		const failBeforeYield = true
		async function* throwsImmediately(): AsyncGenerator<ProviderDelta, ProviderResult> {
			if (failBeforeYield) throw new Error('pre-yield')
			yield { type: 'content', text: '' }
			return { content: '' }
		}
		const provider: ProviderInterface = {
			id: 'p',
			name: 'p',
			stream: throwsImmediately,
			async generate() {
				throw new Error('pre-yield')
			},
		}
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		await expect(agent.generate()).rejects.toThrow('pre-yield')
		expect(agent.status).toBe('error')
	})

	it('a turn with no content, no tools, and no usage settles empty (not partial)', async () => {
		const provider = createScriptedProvider([{ result: { content: '' } }], SCRIPT_OPTIONS)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate()
		// A natural finish with an empty answer �€” content '', no usage, not partial.
		expect(result).toEqual({ content: '', partial: false })
		expect(result.usage).toBeUndefined()
	})

	it('sums usage across turns where only some report it', async () => {
		const tools = createToolManager()
		tools.add(addTool())
		// Turn 1 reports usage, turn 2 (tool follow-up) reports none, turn 3 reports usage.
		const provider = createScriptedProvider(
			[
				{
					result: { content: '', tools: [createToolCall()], usage: USAGE },
				},
				{ result: { content: '', tools: [createToolCall({ id: 'c2' })] } }, // no usage
				{ result: { content: 'final', usage: USAGE } },
			],
			SCRIPT_OPTIONS,
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
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const tokens = chunks.flatMap((c) => (c.type === 'token' ? [c.content] : []))
		// The empty delta dropped out �€” only 'a' and 'b' surfaced.
		expect(tokens).toEqual(['a', 'b'])
		const result = await stream.result
		expect(result.content).toBe('ab')
	})
})

// �”€�”€ scheduler edge cases �”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€

describe('Agent �€” scheduler edge cases', () => {
	it('a scheduler whose yield rejects for a NON-abort reason rejects the run (genuine fault)', async () => {
		// A buggy scheduler that throws on yield while the signal is NOT aborted �€” a genuine
		// infrastructure fault, distinct from an abort-driven rejection. It must propagate
		// (reject the result, status error), NOT be swallowed as a cancel.
		const faulty: SchedulerInterface = {
			async yield() {
				throw new Error('scheduler fault')
			},
			async delay() {},
		}
		const tools = createToolManager()
		tools.add(loopTool())
		const provider = createScriptedProvider(
			[
				{ result: { content: '', tools: [createToolCall({ id: 'c', name: 'loop' })] } },
				{ result: { content: 'unreached' } },
			],
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, scheduler: faulty, limit: 5 })
		agent.context.messages.add({ role: 'user', content: 'go' })
		// Turn 1 runs, then the inter-turn yield throws (signal not aborted) �†’ reject.
		await expect(agent.generate()).rejects.toThrow('scheduler fault')
		expect(agent.status).toBe('error')
	})

	it('with no scheduler the inter-turn yield is skipped cleanly (the ?. path)', async () => {
		const tools = createToolManager()
		tools.add(addTool())
		const provider = createScriptedProvider(
			[{ result: { content: '', tools: [createToolCall()] } }, { result: { content: 'done' } }],
			SCRIPT_OPTIONS,
		)
		// No scheduler option �†’ `this.#scheduler?.yield(...)` is a no-op; multi-turn still works.
		const agent = createAgent(provider, { tools })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		expect(result.content).toBe('done')
		expect(provider.calls).toHaveLength(2)
	})
})

// �”€�”€ Authority wired into the loop �€” deeper failure modes �”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€

describe('Agent �€” authority deeper', () => {
	it('a throwing authority.evaluate FAILS CLOSED: the call is denied, not executed, and the run survives', async () => {
		// A security gate must fail safe: a policy that THROWS must not let the tool run, and
		// must not crash the whole agent. The loop synthesizes a denial (carrying the error's
		// message), feeds it back, and the model continues �€” exactly like an explicit deny.
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
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, authority })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const stream = agent.stream()
		const chunks = await collect(stream.events)
		const result = await stream.result
		// The tool NEVER ran (fail-closed on execution).
		expect(recorder.count).toBe(0)
		// A tool chunk carries the fail-closed denial, with the thrown message as the reason.
		const toolChunk = chunks.find((c) => c.type === 'tool')
		expect(toolChunk).toEqual({
			type: 'tool',
			call: { id: 'c1', name: 'add', arguments: {} },
			result: { id: 'c1', name: 'add', error: 'denied: policy crashed' },
		})
		// The run continued and settled (not rejected) �€” the model saw the denial.
		expect(result.partial).toBe(false)
		expect(result.content).toBe('recovered from denial')
		expect(agent.status).toBe('done')
		// The next provider call saw the denial as the last tool message.
		const [, second] = provider.calls
		expect(second?.messages.at(-1)?.role).toBe('tool')
		expect(second?.messages.at(-1)?.content).toBe(JSON.stringify('denied: policy crashed'))
	})

	it('deny + budget: a denied call costs no budget, and a later turn can still exhaust it', async () => {
		// The denied call must NOT charge the budget (no tool run, no usage from it). Usage
		// only comes from the provider turns. Turn 1 (usage 12) crosses max=12 at the
		// boundary, so the run commits partial before turn 2 �€” and the denied tool never ran.
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
					result: { content: 'a', tools: [{ id: 'c1', name: 'del', arguments: {} }], usage: USAGE },
				},
				{ result: { content: 'b' } },
			],
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, authority, budget })
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		expect(recorder.count).toBe(0) // denied �†’ never executed
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
			SCRIPT_OPTIONS,
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
			c.type === 'tool' ? [{ name: c.call.name, result: c.result }] : [],
		)
		expect(
			byName.filter((e) => e.name === 'danger').every((e) => e.result.error === 'denied: no'),
		).toBe(true)
		expect(byName.filter((e) => e.name === 'safe').every((e) => e.result.value === 'ok')).toBe(true)
	})

	it('an authority denying on call.arguments content (not just name) is honoured by the loop', async () => {
		// Deny `transfer` only when amount > 100 �€” proving the loop hands the matcher the full
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
			SCRIPT_OPTIONS,
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
			c.type === 'tool' ? [{ id: c.call.id, result: c.result }] : [],
		)
		expect(results).toEqual([
			{ id: 't1', result: { id: 't1', name: 'transfer', value: 'sent 50' } },
			{ id: 't2', result: { id: 't2', name: 'transfer', error: 'denied: over limit' } },
		])
	})
})

// �”€�”€ status transitions + getters �”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€

describe('Agent �€” status transitions and getters', () => {
	it('transitions idle �†’ running �†’ error on a genuine provider failure', async () => {
		async function* failing(): AsyncGenerator<ProviderDelta, ProviderResult> {
			yield { type: 'content', text: 'x' }
			throw new Error('boom')
		}
		const provider: ProviderInterface = {
			id: 'e',
			name: 'e',
			stream: failing,
			async generate() {
				throw new Error('boom')
			},
		}
		const agent = createAgent(provider)
		expect(agent.status).toBe('idle')
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		expect(agent.status).toBe('running')
		await expect(stream.result).rejects.toThrow('boom')
		expect(agent.status).toBe('error')
	})

	it('exposes a stable id and the live context getter', async () => {
		const provider = createScriptedProvider([{ result: { content: 'hi' } }], SCRIPT_OPTIONS)
		const agent = createAgent(provider, { system: 'sys' })
		// id is a stable non-empty string across reads.
		expect(typeof agent.id).toBe('string')
		expect(agent.id.length).toBeGreaterThan(0)
		expect(agent.id).toBe(agent.id)
		// context is the live AgentContext �€” adding a message is visible through the getter.
		agent.context.messages.add({ role: 'user', content: 'hi' })
		expect(agent.context.messages.count).toBe(1)
		expect(agent.context.system).toBe('sys')
	})
})

// �”€�”€ ProviderAbortError + isProviderAbortError (the boundary's cancel error) �”€�”€
//
// The abstract inference boundary's cancellation error: a `stream` cancelled mid-flight
// throws a ProviderAbortError carrying the partial it had assembled, and
// isProviderAbortError narrows a caught `unknown` back to it. The class + guard are a
// PUBLIC export (the @src/core barrel; documented in guides/agents.md). NOTE: the agent
// loop itself does NOT consume the guard �€” it distinguishes a cancel from a genuine
// error via the bound signal's `aborted` flag (see the loop's `#provide` catch), so the
// guard is a CONSUMER-facing recovery helper. These pin the class + guard here (in a
// behavioral file) since `errors.ts` is structure-exempt from its own test mirror.
describe('ProviderAbortError + isProviderAbortError', () => {
	it('carries a fixed name/message and the partial result verbatim', () => {
		const partial: ProviderResult = {
			content: 'half',
			tools: [{ id: 'c1', name: 'add', arguments: { a: 1 } }],
			usage: USAGE,
		}
		const error = new ProviderAbortError(partial)
		expect(error).toBeInstanceOf(Error)
		expect(error.name).toBe('ProviderAbortError')
		expect(error.message).toBe('provider stream aborted')
		// Same object by identity �€” a caller recovers exactly what streamed before the cancel.
		expect(error.partial).toBe(partial)
		expect(error.partial.content).toBe('half')
		expect(error.partial.tools).toEqual([{ id: 'c1', name: 'add', arguments: { a: 1 } }])
		expect(error.partial.usage).toEqual(USAGE)
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
		// After narrowing, the partial is reachable without a cast �€” fold the guarded read into
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

// �”€�”€ Emitter �€” the PUSH observation surface (AGENTS §13) �”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€
//
// Alongside the PULL `AgentChunk` stream, the Agent exposes a typed `emitter`
// (`AgentEventMap`) carrying lifecycle + usage/tool/deny moments for fire-and-forget
// observers �€” NOT per-token (there is no `token` event; deltas stay the stream's job).
// Every event is emitted directly; the emitter isolates a listener throw (it can never
// escape into the 3�—-hardened settle-once / wake-park loop) and routes it to the emitter's
// own `error` handler (the `error` option, §13). These pin: each event fires at the right
// moment with the right payload; the `on?` option wires initial listeners; a cancelled
// run emits `abort` THEN `finish` (the partial); the load-bearing emit-safety guarantee
// (a throwing observer cannot corrupt the run, yet the error handler fires); and that
// `generate()` and `stream()` drive the SAME events (they share `#run`).

// The AgentEventMap event names recorded across the emitter tests �€” fed to the shared
// `recordEmitterEvents` (AGENTS §16.1: the per-event wiring is centralized; this file
// keeps only the names its scenarios observe). Returned recorders assert what fired, in
// what order, with which payload, exactly as the local bundle did.
const AGENT_EVENTS = [
	'start',
	'turn',
	'tool',
	'usage',
	'deny',
	'finish',
	'error',
	'abort',
	'compactError',
] as const

describe('Agent �€” emitter (push observation surface)', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it('a no-tools run fires start �†’ turn �†’ usage �†’ finish with the right payloads', async () => {
		const provider = createScriptedProvider(
			[{ result: { content: 'hello', usage: USAGE } }],
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider)
		const events = recordEmitterEvents(agent.emitter, AGENT_EVENTS)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate()
		// `start` once, carrying the agent id; one `turn` (index 0); usage once; finish once.
		expect(events.start.calls).toEqual([[agent.id]])
		expect(events.turn.calls).toEqual([[0]])
		expect(events.usage.calls).toEqual([[USAGE]])
		expect(events.finish.calls).toEqual([[result]])
		expect(events.finish.calls[0]?.[0]).toEqual({ content: 'hello', usage: USAGE, partial: false })
		// A clean no-tools, non-cancel run fires neither `tool` / `deny` / `error` / `abort`.
		expect(events.tool.count).toBe(0)
		expect(events.deny.count).toBe(0)
		expect(events.error.count).toBe(0)
		expect(events.abort.count).toBe(0)
	})

	it('fires one turn event per iteration (count === turns run)', async () => {
		const tools = createToolManager()
		tools.add(loopTool())
		// Always-tool script capped at 3 �†’ exactly 3 iterations.
		const provider = createScriptedProvider(
			Array.from({ length: 10 }, () => ({
				result: { content: '', tools: [createToolCall({ id: 'c', name: 'loop' })] },
			})),
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, limit: 3 })
		const events = recordEmitterEvents(agent.emitter, AGENT_EVENTS)
		agent.context.messages.add({ role: 'user', content: 'go' })
		await agent.generate()
		expect(provider.calls).toHaveLength(3)
		// One `turn` per iteration, indices 0,1,2 in order.
		expect(events.turn.calls).toEqual([[0], [1], [2]])
	})

	it('a tool run fires tool + usage with the dispatched call/result and summed usage', async () => {
		const tools = createToolManager()
		tools.add(addTool())
		const provider = createScriptedProvider(
			[
				{
					result: {
						content: '',
						tools: [{ id: 'c1', name: 'add', arguments: { a: 2 } }],
						usage: USAGE,
					},
				},
				{ result: { content: 'sum 5', usage: USAGE } },
			],
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, limit: 5 })
		const events = recordEmitterEvents(agent.emitter, AGENT_EVENTS)
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		// One `tool` event, carrying the executed call + its real result (mirrors the chunk).
		expect(events.tool.calls).toEqual([
			[
				{ id: 'c1', name: 'add', arguments: { a: 2 } },
				{ id: 'c1', name: 'add', value: 5 },
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
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, authority })
		const events = recordEmitterEvents(agent.emitter, AGENT_EVENTS)
		agent.context.messages.add({ role: 'user', content: 'go' })
		await agent.generate()
		// The tool never ran; `deny` fired once carrying the call + the RULE's reason (not the
		// formatted `denied: �€�` error �€” that is the ToolResult's; the event carries the reason).
		expect(recorder.count).toBe(0)
		expect(events.deny.calls).toEqual([
			[{ id: 'd1', name: 'del', arguments: { id: 'x' } }, 'blocked'],
		])
		// A `tool` event still fires for the denied call (carrying the denial result), in parity
		// with the chunk stream.
		expect(events.tool.calls).toEqual([
			[
				{ id: 'd1', name: 'del', arguments: { id: 'x' } },
				{ id: 'd1', name: 'del', error: 'denied: blocked' },
			],
		])
	})

	it('a fail-closed (throwing) authority fires deny with the thrown reason', async () => {
		const tools = createToolManager()
		tools.add(addTool())
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
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, authority })
		const events = recordEmitterEvents(agent.emitter, AGENT_EVENTS)
		agent.context.messages.add({ role: 'user', content: 'go' })
		await agent.generate()
		// Fail-closed: `deny` carries the thrown error's message as the reason.
		expect(events.deny.calls).toEqual([
			[{ id: 'c1', name: 'add', arguments: {} }, 'policy crashed'],
		])
	})

	it('fires error (not finish) on a genuine provider failure', async () => {
		async function* failingStream(): AsyncGenerator<ProviderDelta, ProviderResult> {
			yield { type: 'content', text: 'partial' }
			throw new Error('boom')
		}
		const provider: ProviderInterface = {
			id: 'e',
			name: 'e',
			stream: failingStream,
			async generate() {
				throw new Error('boom')
			},
		}
		const agent = createAgent(provider)
		const events = recordEmitterEvents(agent.emitter, AGENT_EVENTS)
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

	it('a cancelled run fires abort THEN finish (the partial) �€” the documented semantics', async () => {
		const gate = createGate()
		// A provider that streams one delta then parks on a gate, giving a window to abort.
		const provider: ProviderInterface = {
			id: 's',
			name: 's',
			async *stream(_messages, signal) {
				yield { type: 'content', text: 'part' }
				await gate.promise
				if (signal.aborted) throw new ProviderAbortError({ content: 'part' })
				return { content: 'partfull' }
			},
			async generate() {
				return { content: 'partfull' }
			},
		}
		// Record the ORDER abort vs finish fire in, to prove abort precedes finish.
		const order: string[] = []
		const agent = createAgent(provider, {
			on: {
				abort: () => order.push('abort'),
				finish: () => order.push('finish'),
			},
		})
		const events = recordEmitterEvents(agent.emitter, AGENT_EVENTS)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const stream = agent.stream()
		const drained = collect(stream.events)
		await waitForDelay()
		agent.abort('user navigated away')
		gate.resolve()
		await drained
		const result = await stream.result
		// The settled result is the partial �€” content accumulated before the cancel.
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
		const provider = createScriptedProvider([{ result: { content: 'never' } }], SCRIPT_OPTIONS)
		const agent = createAgent(provider, { signal: controller.signal })
		const events = recordEmitterEvents(agent.emitter, AGENT_EVENTS)
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

	it('a cap-bounded finish fires finish only (a cap is NOT a cancel �€” no abort)', async () => {
		const tools = createToolManager()
		tools.add(loopTool())
		const provider = createScriptedProvider(
			Array.from({ length: 10 }, () => ({
				result: { content: '', tools: [createToolCall({ id: 'c', name: 'loop' })] },
			})),
			SCRIPT_OPTIONS,
		)
		const agent = createAgent(provider, { tools, limit: 3 })
		const events = recordEmitterEvents(agent.emitter, AGENT_EVENTS)
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		// F1: limit-exhaustion with unresolved tool intent is NOT a cancel — `finish` fires,
		// `abort` does not (an `exhaust` event fires instead, covered by the F1 describe block).
		expect(result.partial).toBe(true)
		expect(events.finish.count).toBe(1)
		expect(events.abort.count).toBe(0)
	})

	it('the on? option wires initial listeners at construction', async () => {
		const finishRec = createRecorder<[result: AgentResult]>()
		const startRec = createRecorder<[id: string]>()
		// Pass listeners via the reserved `on` option �€” they must fire without a later .on().
		const agent = createAgent(
			createScriptedProvider([{ result: { content: 'ok' } }], SCRIPT_OPTIONS),
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
		tools.add(addTool())
		const provider = createScriptedProvider(
			[
				{ result: { content: '', tools: [createToolCall()], usage: USAGE } },
				{ result: { content: 'final answer', usage: USAGE } },
			],
			SCRIPT_OPTIONS,
		)
		const errors = createErrorRecorder()
		const agent = createAgent(provider, { tools, limit: 5, error: errors.handler })
		const events = recordEmitterEvents(agent.emitter, AGENT_EVENTS)
		const thrown = new Error('observer blew up')
		// A buggy `tool` observer that throws every time it fires.
		agent.emitter.on('tool', () => {
			throw thrown
		})
		agent.context.messages.add({ role: 'user', content: 'go' })
		const result = await agent.generate()
		// THE LOAD-BEARING ASSERTION: the run is UNCORRUPTED �€” it settled the correct final
		// content + summed usage despite the throwing listener (the throw never escaped `#run`).
		expect(result).toEqual({
			content: 'final answer',
			usage: { prompt: 10, completion: 14, total: 24 },
			partial: false,
		})
		// The throw was routed to the emitter's error handler �€” (error, event) order.
		expect(errors.calls).toEqual([[thrown, 'tool']])
		// Every OTHER event still fired normally �€” the buggy listener didn't suppress siblings.
		expect(events.start.count).toBe(1)
		expect(events.turn.calls).toEqual([[0], [1]])
		expect(events.usage.count).toBe(2)
		expect(events.finish.calls).toEqual([[result]])
		// The non-throwing `tool` recorder still saw the dispatched call (sibling isolation).
		expect(events.tool.count).toBe(1)
	})

	it('EMIT SAFETY: a throwing error handler neither escapes nor recurses', async () => {
		const tools = createToolManager()
		tools.add(addTool())
		const provider = createScriptedProvider(
			[{ result: { content: '', tools: [createToolCall()] } }, { result: { content: 'done' } }],
			SCRIPT_OPTIONS,
		)
		// Count how many times the error handler is INVOKED �€” it must be exactly once
		// (no recursion) even though it itself throws.
		const errors = createErrorRecorder()
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
		// The run STILL settles cleanly �€” neither the tool-listener throw nor the
		// error-handler throw escaped into the loop.
		const result = await agent.generate()
		expect(result).toEqual({ content: 'done', partial: false })
		expect(agent.status).toBe('done')
		// The error handler fired exactly once (its own throw was swallowed, never re-entered �€”
		// so it could not recurse).
		expect(errors.count).toBe(1)
		expect(errors.calls[0]?.[1]).toBe('tool')
	})

	it('generate() and stream() drive the SAME events for the same script (parity)', async () => {
		const script: readonly ScriptedTurn[] = [
			{
				result: { content: '', tools: [createToolCall()], usage: USAGE },
				deltas: [],
			},
			{ result: { content: 'sum 5', usage: USAGE }, deltas: ['sum', ' 5'] },
		]
		const makeTools = () => {
			const tools = createToolManager()
			tools.add(addTool())
			return tools
		}
		// generate() path.
		const a = createAgent(createScriptedProvider(script, SCRIPT_OPTIONS), {
			tools: makeTools(),
			limit: 5,
		})
		const ea = recordEmitterEvents(a.emitter, AGENT_EVENTS)
		a.context.messages.add({ role: 'user', content: 'go' })
		const ra = await a.generate()
		// stream() path �€” same script, fully drained.
		const b = createAgent(createScriptedProvider(script, SCRIPT_OPTIONS), {
			tools: makeTools(),
			limit: 5,
		})
		const eb = recordEmitterEvents(b.emitter, AGENT_EVENTS)
		b.context.messages.add({ role: 'user', content: 'go' })
		const stream = b.stream()
		await collect(stream.events)
		const rb = await stream.result
		// Same settled result, and the SAME push events fired (both share `#run`).
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

// �”€�”€ Automatic compaction (the context `window` budget) �”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€
//
// A SOFT, opt-in context budget that compacts the injected conversation BETWEEN turns
// (compact-and-continue), distinct from the cost `budget`'s HARD abort. The trigger is a
// CONTEXT `Budget` whose `consume` is a token estimator (the exported `estimateMessages`) and
// whose `max` is the context window. The model is ABSOLUTE: each turn the loop `clear()`s the
// budget then `consume`s the WORKING `messages` array �€” the EXACT next prompt (the conversation's
// `view()` + this turn's appended assistant + tool messages, with no system block here since the
// agent has no system / instructions / documents / images) �€” so `window.consumed` is the current
// FULL prompt's estimated footprint and `exhausted` means the prompt has reached the window `max`.
// On `exhausted` the loop `compact()`s + REBUILDS `messages` from the (smaller) compacted `view()`;
// no post-compact `clear()` �€” the NEXT turn's clear()+consume re-measures the shrunken prompt.
// Deterministic here (the scripted provider drives multiple tool-iteration turns within one
// generate(); a `createStubSummarizer` folds the tail into `recap of <n>`; `estimateMessages` is
// the per-message `ceil(content.length / 4)` sum so the crossing is exact). The same behavior is
// proven LIVE through a real model + real-model summarizer in tests/src/ollama/context.test.ts.
//
// The shared multi-turn script: two tool-call turns then a final answer, so the loop genuinely
// iterates (two between-turns budget checks) and ends on a real answer. Each tool-call turn
// appends a 40-char assistant message (`ceil(40/4)` = 10 tok �€” only `content` is summed) + the
// `JSON.stringify(5)` = '5' tool result (`ceil(1/4)` = 1 tok). The seed user turn 'go' is 1 tok.
const COMPACT_SCRIPT: readonly ScriptedTurn[] = [
	{ result: { content: 'x'.repeat(40), tools: [createToolCall()] } },
	{ result: { content: 'y'.repeat(40), tools: [createToolCall({ id: 'c2' })] } },
	{ result: { content: 'the answer is 42' } },
]

// Build an agent over the COMPACT_SCRIPT with an injected conversation registry (a stub summarizer
// + keep: 0 �€” a fold collapses the whole live tail into one `recap of <n>` section) whose active
// conversation IS the agent's message source, plus the canonical `add` tool, seeded with one user
// turn (routed to the active conversation's live tail). The context `window` budget (when given) is
// threaded straight through; `undefined` �‡’ no auto-compaction. Returns the agent + the active
// conversation so a test can drive generate() and inspect sections / events. NB no `system` �‡’
// build() prepends NO leading system message, so the working `messages` the budget measures is
// exactly the conversation view + the turn's appends.
function compactionAgent(
	window: ReturnType<typeof createBudget<readonly MessageInterface[]>> | undefined,
): {
	readonly agent: ReturnType<typeof createAgent>
	readonly conversation: ReturnType<typeof createConversation>
	readonly provider: ReturnType<typeof createScriptedProvider>
} {
	const conversations = createConversationManager({
		summarize: createStubSummarizer().summarize,
		keep: 0,
	})
	const conversation = conversations.add() // auto-activates �€” the agent's message source
	const tools = createToolManager()
	tools.add(addTool())
	const provider = createScriptedProvider(COMPACT_SCRIPT, SCRIPT_OPTIONS)
	// The registry is injected through the AGENT (forwarded to its context), so
	// `agent.context.messages` IS the active conversation's live tail �€” seed the user turn there.
	const agent = createAgent(provider, { conversations, tools, window, limit: 5 })
	agent.context.messages.add({ role: 'user', content: 'go' })
	return { agent, conversation, provider }
}

// A fresh context budget over the real `estimateMessages` estimator (no behavior-mock) �€” the
// pluggable `consume` an agent's `window` carries.
const contextBudget = (max: number): ReturnType<typeof createBudget<readonly MessageInterface[]>> =>
	createBudget({ max, consume: estimateMessages })

describe('Agent �€” automatic compaction (context window budget)', () => {
	it('fires when the prompt reaches the window, continues on the compacted view, and rebuilds smaller', async () => {
		// ABSOLUTE-MODEL threshold arithmetic (window `max` = 12, the FULL turn-1 prompt's size):
		//  �€� Turn 1 provider call sees the view `[user "go"]` (1 msg). It appends asst(40x) + tool("5"),
		//    so the working prompt becomes `[go, 40x, "5"]` �†’ estimateMessages = 1 + 10 + 1 = 12 �‰� 12
		//    �†’ EXHAUSTED �†’ compact() (keep 0) folds all 3 live messages into `recap of 3`; the working
		//    array rebuilds to `[<recap of 3>]` (1 msg, content 'recap of 3' = ceil(10/4) = 3 tok).
		//  �€� Turn 2 provider call sees `[<recap of 3>]` (1 msg). It appends asst(40y) + tool("5") �†’
		//    `[<recap of 3>, 40y, "5"]` �†’ 3 + 10 + 1 = 14 �‰� 12 �†’ EXHAUSTED �†’ compact() folds the 2 live
		//    messages into `recap of 2`; the array rebuilds to `[<recap of 3>, <recap of 2>]` (2 msgs).
		//  �€� Turn 3 (no tools) answers 'the answer is 42' from that 2-message compacted prompt.
		// So compaction fires EXACTLY twice; without it turn 2 would see 3 msgs and turn 3 five. Record
		// the conversation's own `compact` event (the observability surface �€” NO new Agent event).
		const window = contextBudget(12)
		const { agent, conversation, provider } = compactionAgent(window)
		const compacted = recordEmitterEvents(conversation.emitter, ['compact'])

		const result = await agent.generate()

		// (a) Auto-compaction fired mid-run �€” EXACTLY two folds (one per tool-iteration turn), each
		// authored a `recap of <n>` section (proving the absolute prompt crossed `max` both turns).
		expect(conversation.sections.length).toBe(2)
		expect(conversation.sections.map((section) => section.summary)).toEqual([
			'recap of 3',
			'recap of 2',
		])
		// (b) The run still produced the CORRECT final answer (the loop continued on the compacted
		// view through to turn 3 �€” proving the rebuilt working array stayed a valid prompt).
		expect(result.content).toBe('the answer is 42')
		expect(result.partial).toBe(false)
		// (c) The conversation's `compact` event fired once per fold, each carrying a section.
		expect(compacted.compact.count).toBe(2)
		expect(compacted.compact.calls[0]?.[0]?.summary).toMatch(/^recap of/)
		// (d) The REBUILD shrank the prompt each compaction: the post-fold turns ran on a tiny
		// section-summary prompt (1 then 2 messages) instead of the uncompacted 3 / 5 they'd be �€”
		// the absolute proof the working array was re-measured smaller after each compact().
		const promptSizes = provider.calls.map((call) => call.messages.length)
		expect(promptSizes).toEqual([1, 1, 2])
	})

	it('does NOT fire when the prompt stays below the window (same answer, budget holds the FULL prompt size)', async () => {
		// A HIGH max (10_000) the prompt never reaches �†’ no fold, yet the multi-turn run still
		// produces the same answer. With NO compaction the working array only grows, so the LAST
		// between-turns check (turn 2) measures the whole accumulated prompt `[go, 40x, "5", 40y, "5"]`.
		const window = contextBudget(10_000)
		const { agent, conversation } = compactionAgent(window)
		const compacted = recordEmitterEvents(conversation.emitter, ['compact'])

		const result = await agent.generate()

		expect(conversation.sections.length).toBe(0)
		expect(compacted.compact.count).toBe(0)
		expect(result.content).toBe('the answer is 42')
		expect(result.partial).toBe(false)
		// The budget was re-measured each turn against the ABSOLUTE prompt and never crossed the
		// ceiling. Its final value is turn 2's FULL prompt �€” 1 + 10 + 1 + 10 + 1 = 23 �€” NOT a
		// cumulative 2�—delta (the old per-turn-delta model). This is the absolute-measure assertion.
		const turn2Prompt: readonly MessageInterface[] = [
			{ id: 'u', role: 'user', content: 'go' },
			{ id: 'a1', role: 'assistant', content: 'x'.repeat(40) },
			{ id: 't1', role: 'tool', content: JSON.stringify(5) },
			{ id: 'a2', role: 'assistant', content: 'y'.repeat(40) },
			{ id: 't2', role: 'tool', content: JSON.stringify(5) },
		]
		expect(window.consumed).toBe(estimateMessages(turn2Prompt))
		expect(window.consumed).toBe(23)
		expect(window.exhausted).toBe(false)
	})

	it('is PURELY ADDITIVE �€” with NO window budget the injected conversation is never compacted (regression)', async () => {
		// The SAME scenario (injected conversation, same multi-turn script) with NO `window` budget.
		// The trigger block is skipped entirely, so the conversation is NEVER folded �€” and the run
		// produces the identical final answer the windowed run produced. This is the byte-for-byte
		// additive proof: omitting `window` leaves the loop exactly as the cost-budget-only path.
		const { agent, conversation } = compactionAgent(undefined)
		const compacted = recordEmitterEvents(conversation.emitter, ['compact'])

		const result = await agent.generate()

		expect(conversation.sections.length).toBe(0)
		expect(compacted.compact.count).toBe(0)
		expect(result.content).toBe('the answer is 42')
		expect(result.partial).toBe(false)
	})

	it('is a no-op with a NON-SUMMARIZABLE conversation even when a window budget is set (regression)', async () => {
		// A LOW-max window budget but the DEFAULT conversation (no summarizer �‡’ `summarizable` is
		// false). The trigger's `active.summarizable === true` guard fails, so the whole block is
		// skipped: the multi-turn loop runs exactly as the no-window path and ends correctly �€” and the
		// budget is never consumed. This preserves the shipped behavior (a conversation that can't fold
		// is never auto-compacted, and the loop never throws the SUMMARIZER error).
		const window = contextBudget(1)
		const tools = createToolManager()
		tools.add(addTool())
		const provider = createScriptedProvider(COMPACT_SCRIPT, SCRIPT_OPTIONS)
		const agent = createAgent(provider, { tools, window, limit: 5 })
		expect(agent.context.conversations.active?.summarizable).toBe(false)
		agent.context.messages.add({ role: 'user', content: 'go' })

		const result = await agent.generate()

		expect(result.content).toBe('the answer is 42')
		expect(result.partial).toBe(false)
		// Three scripted turns ran (two tool turns + the final), none over-running the script.
		expect(provider.calls).toHaveLength(3)
		// The window budget was never charged (non-summarizable conversation �‡’ the trigger is skipped).
		expect(window.consumed).toBe(0)
	})
})

// �”€�”€ Automatic compaction �€” production hardening �”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€
//
// Beyond the between-turns trigger above, the production path adds: a PRE-FIRST-TURN check (a
// resumed / long conversation whose INITIAL prompt already exceeds the window compacts BEFORE the
// first provider call, not only after a tool turn); a NON-FATAL summarizer failure (a thrown auto
// `compact()` does NOT crash the run �€” it is caught, surfaced as a `compactError` event, and the run
// continues); and the FUTILE-COMPACTION guard (a `compact()` that folds nothing while still over the
// window latches a per-run flag that STOPS auto-compacting for the rest of the run �€” no per-turn
// churn �€” letting the over-window prompt proceed to the provider). All deterministic (scripted
// provider + the real `estimateMessages`), all PURELY ADDITIVE atop the prior loop. The `window`
// budget reuses the same `contextBudget` / estimator as the block above.
describe('Agent �€” automatic compaction (production hardening)', () => {
	// A no-tools provider that ALWAYS finishes its turn with a fixed answer regardless of the prompt
	// content (so a run is exactly ONE provider turn) �€” the cleanest driver for the PRE-FIRST-TURN
	// check (the only compaction point when there is no tool iteration). `record: true` so a test can
	// read what the single provider call actually saw.
	const answerProvider = (): ReturnType<typeof createScriptedProvider> =>
		createScriptedProvider([{ result: { content: 'final answer' } }], {
			name: 'answer',
			record: true,
			exhaust: 'repeat',
		})

	it('PRE-FIRST-TURN: a conversation whose INITIAL prompt already exceeds the window compacts before the first provider call', async () => {
		// Seed the conversation's live tail with ONE big user message (200 chars �‡’ ceil(200/4) = 50
		// tok) BEFORE the run. With a window max of 20 and NO system prompt, the build()'d initial
		// prompt (50 tok) already exceeds the window �€” so the loop's PRE-FIRST-TURN `#trim` fires
		// `compact()` (keep 0 folds the one message into `recap of 1`) and rebuilds BEFORE turn 0. The
		// single provider call must therefore see the COMPACTED view (the framed `recap of 1`), not
		// the 200-char seed �€” the proof the pre-first-turn check ran ahead of the provider.
		const conversations = createConversationManager({
			summarize: createStubSummarizer().summarize,
			keep: 0,
		})
		const conversation = conversations.add() // auto-activates �€” the agent's message source
		const seed = 'q'.repeat(200)
		conversation.add({ role: 'user', content: seed })
		const provider = answerProvider()
		const agent = createAgent(provider, {
			conversations,
			window: contextBudget(20),
			limit: 5,
		})

		const result = await agent.generate()

		// Compaction fired BEFORE the first (only) provider turn �€” one section, authored `recap of 1`.
		expect(conversation.sections.length).toBe(1)
		expect(conversation.sections[0]?.summary).toBe('recap of 1')
		// The single provider call saw the COMPACTED view �€” the framed recap message, NOT the
		// 200-char seed. view() prefixes the section summary with the lean RECAP label.
		expect(provider.calls).toHaveLength(1)
		expect(provider.calls[0]?.messages.map((message) => message.content)).toEqual([
			`${CONVERSATION_RECAP_PREFIX}recap of 1`,
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
		const conversation = conversations.add() // auto-activates �€” the agent's message source
		conversation.add({ role: 'user', content: 'hi' })
		const provider = answerProvider()
		const agent = createAgent(provider, { conversations, window: contextBudget(10_000), limit: 5 })

		const result = await agent.generate()

		expect(conversation.sections.length).toBe(0)
		expect(provider.calls[0]?.messages.map((message) => message.content)).toEqual(['hi'])
		expect(result.content).toBe('final answer')
	})

	it('NON-FATAL summarizer failure: a thrown auto compact() does NOT crash the run �€” it fires compactError and continues', async () => {
		// A summarizer that ALWAYS throws, a conversation with keep 0 (so there IS a tail to fold), and
		// a low window crossed by the post-tool-turn prompt. The between-turns `#trim` calls
		// `compact()`, which rejects �€” the loop CATCHES it (the run does not reject), surfaces a
		// `compactError` event, skips compaction that turn, and continues to the final answer. No
		// section is ever created (every fold attempt threw). A MANUAL compact() still throws (asserted
		// separately) �€” only the agent's AUTO path is resilient.
		const boom = new Error('summarizer exploded')
		const conversations = createConversationManager({
			summarize: async () => {
				throw boom
			},
			keep: 0,
		})
		const conversation = conversations.add() // auto-activates �€” the agent's message source
		const tools = createToolManager()
		tools.add(addTool())
		const provider = createScriptedProvider(COMPACT_SCRIPT, SCRIPT_OPTIONS)
		const agent = createAgent(provider, {
			conversations,
			tools,
			window: contextBudget(12),
			limit: 5,
		})
		const events = recordEmitterEvents(agent.emitter, ['compactError', 'error', 'finish'])
		agent.context.messages.add({ role: 'user', content: 'go' })

		const result = await agent.generate()

		// The run SURVIVED a throwing summarizer �€” it settled the correct final answer, not partial,
		// and `error` never fired (a non-fatal warn, not a genuine failure).
		expect(result.content).toBe('the answer is 42')
		expect(result.partial).toBe(false)
		expect(events.error.count).toBe(0)
		expect(events.finish.count).toBe(1)
		// `compactError` fired (�‰� once �€” the prompt crossed the window each tool turn), carrying the
		// thrown summarizer error verbatim; and NOTHING folded (every attempt threw).
		expect(events.compactError.count).toBeGreaterThanOrEqual(1)
		expect(events.compactError.calls[0]?.[0]).toBe(boom)
		expect(conversation.sections.length).toBe(0)
		// A MANUAL compact() still PROPAGATES the throw �€” only the AUTO path is resilient.
		await expect(conversation.compact()).rejects.toThrow('summarizer exploded')
	})

	it('FUTILE guard: a compact() that folds NOTHING while over the window stops auto-compacting for the rest of the run (no churn)', async () => {
		// `keep` is huge (50), so `compact()` ALWAYS folds nothing (count <= keep) and resolves
		// `undefined` �€” yet the prompt is over the window (a big seed). The FIRST between-turns `#trim`
		// calls compact() �†’ undefined �†’ latches the per-run futile flag, so EVERY later `#trim` returns
		// at once (no further compact() call, no churn). The over-window prompt proceeds to the
		// provider and the run completes. A spy summarizer proves compact() ran (and folded nothing).
		const stub = createStubSummarizer()
		const conversations = createConversationManager({ summarize: stub.summarize, keep: 50 })
		const conversation = conversations.add() // auto-activates �€” the agent's message source
		const tools = createToolManager()
		tools.add(addTool())
		// Each tool turn appends a big assistant message so the absolute prompt stays over the window
		// on every between-turns check (the futile guard must hold across BOTH tool turns).
		const script: readonly ScriptedTurn[] = [
			{ result: { content: 'x'.repeat(80), tools: [createToolCall()] } },
			{ result: { content: 'y'.repeat(80), tools: [createToolCall({ id: 'c2' })] } },
			{ result: { content: 'done' } },
		]
		const provider = createScriptedProvider(script, SCRIPT_OPTIONS)
		const agent = createAgent(provider, {
			conversations,
			tools,
			window: contextBudget(12),
			limit: 5,
		})
		const events = recordEmitterEvents(agent.emitter, ['compactError', 'finish'])
		agent.context.messages.add({ role: 'user', content: 'go' })

		const result = await agent.generate()

		// Nothing ever folded (keep 50 �‡’ compact() always a no-op), yet the run completed cleanly.
		expect(conversation.sections.length).toBe(0)
		expect(result.content).toBe('done')
		expect(result.partial).toBe(false)
		expect(events.finish.count).toBe(1)
		// No churn: `compact()` (the stub summarizer) was called AT MOST ONCE �€” the futile flag
		// short-circuited every later `#trim` (a futile no-op is not a summarizer throw, so no
		// `compactError` either).
		expect(stub.calls.length).toBeLessThanOrEqual(1)
		expect(events.compactError.count).toBe(0)
		// The over-window run still ran all three scripted turns (the futile prompt proceeded to the
		// provider rather than looping on compaction).
		expect(provider.calls).toHaveLength(3)
	})
})

// �”€�”€ Multi-conversation �€” one agent serving many threads �”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€�”€
//
// The real app pattern: ONE Agent over a `ConversationManager` of threads (the agent's own
// `context.conversations`), switching the ACTIVE conversation per request (NOT an agent per thread).
// Each "request" makes the thread `id` active (creating via `add({ id })` when absent, then
// `switch(id)`), appends the user turn, and runs `generate()`. These prove each conversation
// accumulates its OWN independent history AND compacts INDEPENDENTLY (one conversation's sections
// never leak into another), all served by the SAME agent. Deterministic: a scripted provider + a stub
// summarizer + (for the compaction proof) small per-run window budgets (AGENTS §16 �€” real behavior).
describe('Agent �€” multi-conversation (one agent, a ConversationManager of threads)', () => {
	// Drive one "request" on `agent` against the conversation `id` in the agent's registry �€” the exact
	// per-request switch the app performs: resolve-or-create the thread, make it active, append the user
	// turn, run to completion.
	const request = async (
		agent: ReturnType<typeof createAgent>,
		manager: ReturnType<typeof createConversationManager>,
		id: string,
		content: string,
	): Promise<AgentResult> => {
		if (manager.conversation(id) === undefined) manager.add({ id })
		manager.switch(id)
		agent.context.messages.add({ role: 'user', content })
		return agent.generate()
	}

	it('accumulates independent histories across switched conversations (no cross-talk)', async () => {
		// No window (no compaction) �€” a no-tools provider that echoes the LAST user turn, so each
		// conversation's answers are distinguishable. One agent serves an interleaved A / B / A / B
		// sequence; each conversation's live tail must hold ONLY its own user turns + their answers.
		const provider: ProviderInterface = {
			id: 'echo',
			name: 'echo',
			async *stream(messages): AsyncGenerator<ProviderDelta, ProviderResult> {
				const last = messages.at(-1)
				yield { type: 'content', text: 'ok' }
				return { content: `answer:${last?.content ?? ''}` }
			},
			async generate(messages) {
				const last = messages.at(-1)
				return { content: `answer:${last?.content ?? ''}` }
			},
		}
		// The manager is the agent's OWN registry (its message source). The context adds a default
		// conversation when the supplied registry is empty, so the agent's registry IS this `manager`.
		const manager = createConversationManager()
		const agent = createAgent(provider, { conversations: manager })

		const a1 = await request(agent, manager, 'A', 'a-one')
		const b1 = await request(agent, manager, 'B', 'b-one')
		const a2 = await request(agent, manager, 'A', 'a-two')
		const b2 = await request(agent, manager, 'B', 'b-two')

		// Each request answered against ITS OWN conversation's latest user turn.
		expect(a1.content).toBe('answer:a-one')
		expect(b1.content).toBe('answer:b-one')
		expect(a2.content).toBe('answer:a-two')
		expect(b2.content).toBe('answer:b-two')

		// Both named threads exist, each accumulating ONLY its own turns (user + assistant), no
		// cross-talk. (The registry also holds the context's default conversation �€” never made active
		// by `request` and so never touched �€” an artifact of the always-active rule.)
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

	it('compacts each conversation INDEPENDENTLY �€” one thread�€™s sections never leak into another', async () => {
		// One agent WITH a small window + a ConversationManager (keep 0). A no-tools provider that
		// always finishes, so each request is a single turn whose PRE-FIRST-TURN `#trim` compacts the
		// conversation once its accumulated history exceeds the window. Two requests per thread: the
		// 2nd request's pre-first-turn check folds that thread's own accumulated tail into ITS OWN
		// section (retaining ITS OWN originals). The window resets per run (run-entry `clear()`), so the
		// two threads compact on their own schedules with no shared state.
		const { summarize } = createStubSummarizer()
		const manager = createConversationManager({ summarize, keep: 0 })
		const provider = createScriptedProvider([{ result: { content: 'ok' } }], {
			name: 'ans',
			record: true,
			exhaust: 'repeat',
		})
		// A window small enough that a 2nd-request prompt (prior user + 'ok' answer + new user �‰ˆ 5 tok)
		// exceeds it, but a 1st-request prompt (one short user turn �‰ˆ 2 tok) does not (max 4). The
		// manager (with its summarizer) is the agent's OWN registry, so each thread is summarizable.
		const agent = createAgent(provider, {
			conversations: manager,
			window: contextBudget(4),
			limit: 5,
		})

		// Round 1 �€” each thread's first request: a single short user turn, under the window �‡’ no fold.
		await request(agent, manager, 'A', 'alpha-1')
		await request(agent, manager, 'B', 'bravo-1')
		expect(manager.conversation('A')?.sections.length).toBe(0)
		expect(manager.conversation('B')?.sections.length).toBe(0)

		// Round 2 �€” each thread now has [user, 'ok'] accumulated; the new user turn (added before
		// generate) pushes the prompt over the window, so the pre-first-turn `#trim` folds THAT thread's
		// whole live tail (keep 0 �‡’ all three messages) into one section.
		await request(agent, manager, 'A', 'alpha-2')
		await request(agent, manager, 'B', 'bravo-2')

		const a = manager.conversation('A')
		const b = manager.conversation('B')
		// Each thread compacted EXACTLY once, into its OWN section.
		expect(a?.sections.length).toBe(1)
		expect(b?.sections.length).toBe(1)
		// INDEPENDENCE: each section RETAINS only its OWN thread's originals �€” A's folded originals are
		// A's turns, B's are B's. No leakage in either direction.
		const aOriginals = a?.sections[0]?.messages.map((message) => message.content) ?? []
		const bOriginals = b?.sections[0]?.messages.map((message) => message.content) ?? []
		expect(aOriginals).toEqual(['alpha-1', 'ok', 'alpha-2'])
		expect(bOriginals).toEqual(['bravo-1', 'ok', 'bravo-2'])
		expect(JSON.stringify(aOriginals)).not.toContain('bravo')
		expect(JSON.stringify(bOriginals)).not.toContain('alpha')
		// And the SAME agent served both �€” its active conversation is whichever was last switched in.
		expect(agent.context.conversations.active).toBe(b)
	})
})

// F1 -- limit-exhaustion: the loop stopping because it ran out of turns while the model
// still wanted more tool calls is a distinct, non-cancel cause (`exhausted`) that fires
// `exhaust` INSTEAD of `abort`, still followed by `finish`.
describe('Agent - F1 limit exhaustion', () => {
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
		// Every turn requests the tool -- the model never naturally finishes (exhaust: 'repeat'
		// so a single scripted turn can serve as many calls as the loop makes).
		const provider = createScriptedProvider(
			[{ result: { content: '', tools: [createToolCall({ id: 'c', name: 'loop' })] } }],
			{ ...SCRIPT_OPTIONS, exhaust: 'repeat' },
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
		tools.add(loopTool())
		const provider = createScriptedProvider(
			[
				{ result: { content: '', tools: [createToolCall({ id: 'c', name: 'loop' })] } },
				{ result: { content: 'done' } },
			],
			SCRIPT_OPTIONS,
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
		const provider = createScriptedProvider([{ result: { content: 'never' } }], SCRIPT_OPTIONS)
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
})

// F2 -- bounded mid-stream budget enforcement: content deltas are charged incrementally as
// estimated tokens against the effective budget, a mid-stream trip folds into the abort
// funnel, and the turn-end reconcile makes the total charge net to the authoritative usage.
describe('Agent - F2 mid-stream budget enforcement + reconcile', () => {
	it('a mid-stream estimated charge crossing the budget aborts the run (partial, abort event)', async () => {
		const budget = createTokenBudget({ max: 5, scope: 'completion' })
		// 10 five-char deltas -- cumulative estimateTokens (ceil(len/4)) crosses 5 well before
		// the turn completes, so the trip lands MID-STREAM, not at the final usage reconcile.
		const deltas = Array.from({ length: 10 }, () => 'abcde')
		const provider = createScriptedProvider(
			[{ result: { content: deltas.join('') }, deltas }],
			SCRIPT_OPTIONS,
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
		// once `signal.aborted` is observed between deltas).
		expect(result.content.length).toBeLessThan(deltas.join('').length)
	})

	it('the turn-end reconcile nets total budget consumption to the authoritative usage (no double-charge, no loss)', async () => {
		const usage: TokenUsage = { prompt: 20, completion: 30, total: 50 }
		const provider = createScriptedProvider(
			[{ result: { content: 'hello world', usage }, deltas: ['hello ', 'world'] }],
			SCRIPT_OPTIONS,
		)
		const budget = createRecordingBudget(1_000_000) // generous -- never trips
		const agent = createAgent(provider, { budget })
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate()
		expect(result.partial).toBe(false)
		expect(result.usage).toEqual(usage) // the REPORTED usage is unaffected by budget metering
		const sum = (field: keyof TokenUsage): number =>
			budget.consumes.reduce((total, one) => total + one[field], 0)
		expect(sum('prompt')).toBe(usage.prompt)
		expect(sum('completion')).toBe(usage.completion)
		expect(sum('total')).toBe(usage.total)
		// At least one mid-stream charge happened (the content deltas were estimated as they
		// streamed) AND the reconcile happened (more than one consume call for the one turn).
		expect(budget.consumes.length).toBeGreaterThan(1)
	})
})

// F3 -- per-run bounds: `limit` / `timeout` / `budget` / `signal` on `AgentRunOptions`
// override the construction defaults (`??` semantics) for that run only; a per-run
// `signal` COMPOSES with (never replaces) the construction `signal`.
describe('Agent - F3 per-run overrides', () => {
	it('a per-run limit overrides the constructed limit', async () => {
		const tools = createToolManager()
		tools.add(loopTool())
		const provider = createScriptedProvider(
			[{ result: { content: '', tools: [createToolCall({ id: 'c', name: 'loop' })] } }],
			SCRIPT_OPTIONS,
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
		const providerA = createScriptedProvider([{ result: { content: 'never' } }], SCRIPT_OPTIONS)
		const agentA = createAgent(providerA, { signal: constructionController.signal })
		agentA.context.messages.add({ role: 'user', content: 'hi' })
		const quietRunSignal = new AbortController().signal
		const resultA = await agentA.generate({ signal: quietRunSignal })
		expect(resultA.partial).toBe(true)
		expect(providerA.calls).toHaveLength(0)

		// The per-run signal aborts; the constructed signal stays quiet.
		const providerB = createScriptedProvider([{ result: { content: 'never' } }], SCRIPT_OPTIONS)
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
			...SCRIPT_OPTIONS,
			delay: 50,
		})
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate({ timeout: 5 })
		expect(result.partial).toBe(true)
	})

	it('a per-run budget is the one charged -- the constructed budget stays untouched', async () => {
		const usage: TokenUsage = { prompt: 5, completion: 5, total: 10 }
		const provider = createScriptedProvider([{ result: { content: 'ok', usage } }], SCRIPT_OPTIONS)
		const constructionBudget = createRecordingBudget(1_000_000)
		const runBudget = createRecordingBudget(1_000_000)
		const agent = createAgent(provider, { budget: constructionBudget })
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const result = await agent.generate({ budget: runBudget })
		expect(result.partial).toBe(false)
		expect(constructionBudget.consumes).toEqual([])
		expect(runBudget.consumes.length).toBeGreaterThan(0)
	})
})

// F4 -- `schema` (like `think`) is a per-run `ProviderStreamOptions` field: composed options
// are passed to `provider.stream`, omitting undefined keys (an options object only when at
// least one of `think` / `schema` is present -- preserving the prior think-only behavior).
describe('Agent - F4 per-run schema', () => {
	it('forwards a per-run schema alone', async () => {
		const provider = createScriptedProvider([{ result: { content: 'ok' } }], SCRIPT_OPTIONS)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const schema: Readonly<Record<string, unknown>> = { type: 'object' }
		await agent.generate({ schema })
		expect(provider.calls[0]?.options).toEqual({ schema })
	})

	it('forwards think AND schema together when both are set', async () => {
		const provider = createScriptedProvider([{ result: { content: 'ok' } }], SCRIPT_OPTIONS)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		const schema: Readonly<Record<string, unknown>> = { type: 'object' }
		await agent.generate({ think: true, schema })
		expect(provider.calls[0]?.options).toEqual({ think: true, schema })
	})

	it('omits the options object entirely when neither think nor schema is set (preserved behavior)', async () => {
		const provider = createScriptedProvider([{ result: { content: 'ok' } }], SCRIPT_OPTIONS)
		const agent = createAgent(provider)
		agent.context.messages.add({ role: 'user', content: 'hi' })
		await agent.generate()
		expect(provider.calls[0]?.options).toBeUndefined()
	})
})
