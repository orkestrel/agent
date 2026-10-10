import type { AgentResult, Message } from '@src/core'
import type { TokenUsage } from '@orkestrel/budget'
import {
	createMessage,
	CountingAgentResult,
	createInvalidAgentResultCases,
	createTurnRegistry,
	AGENT_USAGE,
} from '../../../setup.js'
import {
	agentResultToJSON,
	assembleResult,
	chargeUsage,
	denyCall,
	estimateMessages,
	estimateTokens,
	IMAGE_TOKEN_ESTIMATE,
	isAgentJobError,
	MESSAGE_TOKEN_OVERHEAD,
	settleAgentJob,
	requireEntry,
	extractQueueOptions,
} from '@src/core'
import { createBudget } from '@orkestrel/budget'
import { describe, expect, it } from 'vitest'
import { createToolCall, createTokenUsage } from '../../../setup.js'

describe('requireEntry', () => {
	it('returns the registered value without copying it', () => {
		const value = { name: 'registered' }
		expect(requireEntry(new Map([['main', value]]), 'provider', 'main')).toBe(value)
	})

	it('reports the category and missing name with a registry code', () => {
		expect(() => requireEntry(new Map(), 'tool', 'missing')).toThrow(
			expect.objectContaining({ code: 'REGISTRY', message: 'unknown tool: missing' }),
		)
	})
})

describe('extractQueueOptions', () => {
	it('omits absent options and preserves explicit zero bounds', () => {
		expect(extractQueueOptions({})).toEqual({})
		expect(extractQueueOptions({ concurrency: 2, retries: 0, timeout: 0 })).toEqual({
			concurrency: 2,
			retries: 0,
			timeout: 0,
		})
	})
})

// Agent-owned pure helpers: estimateMessages is the default context-budget token estimator
// (the per-message sum of the estimateTokens char heuristic). Plus settleAgentJob —
// the shared job-handler step both createAgentQueue / createAgentRunner settle each
// rehydrated agent through: a natural finish resolves with its result, a PARTIAL throws
// an AgentJobError when partials are disallowed and resolves when allowed (driven over a
// scripted provider — no Ollama, real behavior).

// A minimal Message fixture — only the fields estimateMessages reads (content);
// id/role round out the shape so it is a real message, not a partial.

describe('agentResultToJSON', () => {
	it('keeps the projection field map exhaustive over AgentResult', () => {
		const fields = {
			content: true,
			thinking: true,
			usage: true,
			partial: true,
		} satisfies Readonly<Record<keyof AgentResult, true>>

		expect(Object.keys(fields)).toEqual(['content', 'thinking', 'usage', 'partial'])
	})

	it('projects a full result to a fresh exact JSON object', () => {
		const source = {
			content: 'done',
			thinking: 'reasoning',
			usage: { prompt: 2, completion: 1, total: 3, extra: 'drop' },
			partial: false,
			extra: 'drop',
		}

		const projected = agentResultToJSON(source)

		expect(projected).not.toBe(source)
		expect(projected).toEqual({
			content: 'done',
			thinking: 'reasoning',
			usage: { prompt: 2, completion: 1, total: 3 },
			partial: false,
		})
		source.usage.prompt = 99
		expect(projected).toEqual({
			content: 'done',
			thinking: 'reasoning',
			usage: { prompt: 2, completion: 1, total: 3 },
			partial: false,
		})
		if (typeof projected !== 'object' || projected === null || Array.isArray(projected)) {
			throw new Error('expected a projected record')
		}
		const projectedUsage = Reflect.get(projected, 'usage')
		if (typeof projectedUsage !== 'object' || projectedUsage === null) {
			throw new Error('expected projected usage')
		}
		expect(Object.getPrototypeOf(projected)).toBe(Object.prototype)
		expect(Object.getPrototypeOf(projectedUsage)).toBe(Object.prototype)
	})

	it('omits absent optional fields', () => {
		expect(agentResultToJSON({ content: '', partial: true })).toEqual({
			content: '',
			partial: true,
		})
		expect(
			agentResultToJSON({ content: 'done', thinking: undefined, usage: undefined, partial: false }),
		).toEqual({ content: 'done', partial: false })
	})

	it('captures conforming accessors, inherited fields, and every finite usage number', () => {
		const accessor = { partial: false }
		Object.defineProperty(accessor, 'content', {
			enumerable: true,
			get: () => 'done',
		})
		const inherited = { usage: { prompt: -1, completion: 1.5, total: 0 } }
		Object.setPrototypeOf(inherited, { content: 'inherited', partial: true })

		expect(agentResultToJSON(accessor)).toEqual({ content: 'done', partial: false })
		expect(agentResultToJSON(inherited)).toEqual({
			content: 'inherited',
			usage: { prompt: -1, completion: 1.5, total: 0 },
			partial: true,
		})
	})

	it('reads each result and usage field exactly once', () => {
		const source = new CountingAgentResult()

		expect(agentResultToJSON(source)).toEqual({
			content: 'done',
			thinking: 'reasoning',
			usage: { prompt: 2, completion: 1, total: 3 },
			partial: false,
		})
		expect(source.counter).toEqual({
			content: 1,
			thinking: 1,
			usage: 1,
			partial: 1,
			prompt: 1,
			completion: 1,
			total: 1,
		})
	})

	it.each(createInvalidAgentResultCases())(
		'returns undefined without throwing for %s',
		(_label, input) => {
			let projected: unknown = 'not called'
			expect(() => {
				projected = agentResultToJSON(input)
			}).not.toThrow()
			expect(projected).toBeUndefined()
		},
	)
})

describe('estimateMessages', () => {
	it('sums estimateTokens over each message content plus the per-message overhead', () => {
		const messages = [createMessage('hello'), createMessage('a'.repeat(40))]
		// (ceil(5/4)=2 + overhead) + (ceil(40/4)=10 + overhead) — content + fixed framing per message.
		expect(estimateMessages(messages)).toBe(
			estimateTokens('hello') +
				MESSAGE_TOKEN_OVERHEAD +
				(estimateTokens('a'.repeat(40)) + MESSAGE_TOKEN_OVERHEAD),
		)
		expect(estimateMessages(messages)).toBe(12 + 2 * MESSAGE_TOKEN_OVERHEAD)
	})

	it('is 0 for an empty batch', () => {
		expect(estimateMessages([])).toBe(0)
	})

	it('treats empty-content messages as the per-message overhead', () => {
		// An empty content contributes 0 content tokens, so each message is exactly its overhead.
		expect(estimateMessages([createMessage(''), createMessage('')])).toBe(
			2 * MESSAGE_TOKEN_OVERHEAD,
		)
		// And a mix is the non-empty member's content estimate plus both messages' overhead.
		expect(estimateMessages([createMessage(''), createMessage('hello')])).toBe(
			estimateTokens('hello') + 2 * MESSAGE_TOKEN_OVERHEAD,
		)
	})

	it('counts the per-message overhead for N messages (N * MESSAGE_TOKEN_OVERHEAD)', () => {
		const messages = [createMessage(''), createMessage(''), createMessage(''), createMessage('')]
		expect(estimateMessages(messages)).toBe(4 * MESSAGE_TOKEN_OVERHEAD)
	})

	it('grows by estimateTokens over thinking when a message carries it', () => {
		const plain: Message = { id: 'm', role: 'assistant', content: 'Booked' }
		const thinking = 'Compare the fares before booking'
		// Content: 6 characters => 2 tokens; thinking: 32 => 8; framing: 4.
		expect(estimateMessages([{ ...plain, thinking }])).toBe(14)
	})

	it('adds the JSON-stringified calls estimate when a message has calls', () => {
		const calls = [createToolCall({ id: 'c1', name: 'search', arguments: { q: 'acme' } })]
		const withCalls: Message = { id: 'm', role: 'assistant', content: '', calls }
		expect(estimateMessages([withCalls])).toBe(
			MESSAGE_TOKEN_OVERHEAD + estimateTokens(JSON.stringify(calls)),
		)
	})

	it('does not add a calls estimate for an empty calls array', () => {
		const withEmptyCalls: Message = { id: 'm', role: 'assistant', content: '', calls: [] }
		expect(estimateMessages([withEmptyCalls])).toBe(MESSAGE_TOKEN_OVERHEAD)
	})

	// A circular `ToolCall.arguments` makes `JSON.stringify` throw; estimateMessages'
	// TSDoc promises it "never throws", so the circular case must not reject/throw and instead
	// falls back to a conservative fixed contribution (MESSAGE_TOKEN_OVERHEAD-scale).
	it('never throws on a circular calls argument — falls back to the documented fixed contribution', () => {
		const circular: Record<string, unknown> = { q: 'acme' }
		circular.self = circular
		const calls = [createToolCall({ id: 'c1', name: 'search', arguments: circular })]
		const withCircularCalls: Message = { id: 'm', role: 'assistant', content: '', calls }

		let estimate = 0
		expect(() => {
			estimate = estimateMessages([withCircularCalls])
		}).not.toThrow()
		expect(Number.isFinite(estimate)).toBe(true)
		// The fallback contribution matches the documented constant exactly (no partial/garbage
		// serialization sneaks through) — the message's total is its overhead plus that fallback.
		expect(estimate).toBe(2 * MESSAGE_TOKEN_OVERHEAD)
	})

	it('adds images.length * IMAGE_TOKEN_ESTIMATE when a message has images', () => {
		const withImages: Message = {
			id: 'm',
			role: 'user',
			content: '',
			images: ['aaaa', 'bbbb', 'cccc'],
		}
		expect(estimateMessages([withImages])).toBe(MESSAGE_TOKEN_OVERHEAD + 3 * IMAGE_TOKEN_ESTIMATE)
	})

	it('is 0 for an empty array (no messages)', () => {
		expect(estimateMessages([])).toBe(0)
	})
})

describe('settleAgentJob', () => {
	// The shared partial-as-configurable-failure policy. Each case rehydrates a real agent
	// through a registry over a scripted provider (no Ollama) and settles it: a NATURAL
	// finish resolves with the run's result; a PARTIAL (forced through a pre-aborted signal,
	// which commits an empty partial before the provider runs) THROWS an AgentJobError when
	// partials are disallowed and RESOLVES the partial when allowed.

	it('resolves a naturally-finished run with its result (partial: false)', async () => {
		const agent = createTurnRegistry({ content: 'done', usage: AGENT_USAGE }).build({
			provider: 'main',
			messages: [{ role: 'user', content: 'go' }],
		})
		// partial is irrelevant for a natural finish — it resolves the full result either way.
		const result = await settleAgentJob(agent, false)
		expect(result.partial).toBe(false)
		expect(result.content).toBe('done')
		expect(result.usage).toEqual(AGENT_USAGE)
	})

	it('throws an AgentJobError carrying the partial when the run ends partial and partials are DISALLOWED', async () => {
		// A pre-aborted signal commits an empty partial before the provider ever runs.
		const controller = new AbortController()
		controller.abort()
		const agent = createTurnRegistry({ content: 'never' }).build(
			{ provider: 'main', messages: [{ role: 'user', content: 'go' }] },
			controller.signal,
		)
		// rejects ⇒ the policy threw; the caught value is an AgentJobError holding the partial.
		const error = await settleAgentJob(agent, false).then(
			() => undefined,
			(caught: unknown) => caught,
		)
		expect(isAgentJobError(error)).toBe(true)
		if (!isAgentJobError(error)) throw new Error('expected an AgentJobError')
		expect(error.message).toBe('agent job ended partial')
		expect(error.partial.partial).toBe(true)
		expect(error.partial.content).toBe('')
	})

	it('resolves the partial as success when the run ends partial and partials are ALLOWED', async () => {
		const controller = new AbortController()
		controller.abort()
		const agent = createTurnRegistry({ content: 'never' }).build(
			{ provider: 'main', messages: [{ role: 'user', content: 'go' }] },
			controller.signal,
		)
		// partial: true ⇒ no throw; the same partial result is returned instead.
		const result = await settleAgentJob(agent, true)
		expect(result.partial).toBe(true)
		expect(result.content).toBe('')
	})
})

describe('assembleResult — the settled result from a run outcome', () => {
	it('omits an absent thinking and usage rather than storing undefined', () => {
		const result = assembleResult({
			content: 'hi',
			thinking: undefined,
			usage: undefined,
			partial: false,
			exhausted: false,
		})
		expect(result).toEqual({ content: 'hi', partial: false })
		expect(Object.keys(result)).toEqual(['content', 'partial'])
	})

	it('carries a present thinking and usage', () => {
		expect(
			assembleResult({
				content: 'hi',
				thinking: 'plan',
				usage: createTokenUsage({ prompt: 2, completion: 1, total: 3 }),
				partial: true,
				exhausted: true,
			}),
		).toEqual({
			content: 'hi',
			thinking: 'plan',
			usage: { prompt: 2, completion: 1, total: 3 },
			partial: true,
		})
	})

	it('leaves the loop-internal exhausted flag out of the public result', () => {
		const result = assembleResult({
			content: '',
			thinking: undefined,
			usage: undefined,
			partial: true,
			exhausted: true,
		})
		expect('exhausted' in result).toBe(false)
	})
})

describe('denyCall — the synthesized denial result', () => {
	it('renders a rule reason into the denial error', () => {
		expect(denyCall(createToolCall({ id: '1', name: 'drop' }), 'read-only mode')).toEqual({
			success: false,
			id: '1',
			name: 'drop',
			error: 'denied: read-only mode',
		})
	})

	it('falls back to the generic denial when no reason was given', () => {
		expect(denyCall(createToolCall({ id: '2', name: 'drop' }), undefined)).toEqual({
			success: false,
			id: '2',
			name: 'drop',
			error: 'denied by authority',
		})
	})
})

describe('chargeUsage — the residual budget charge', () => {
	it('consumes the full prompt and only the residual over what was charged', () => {
		const seen: TokenUsage[] = []
		const budget = createBudget<TokenUsage>({
			max: 1000,
			consumer: (usage) => {
				seen.push(usage)
				return usage.total
			},
		})
		chargeUsage(budget, { prompt: 20, completion: 30, total: 50 }, 10)
		expect(seen).toEqual([{ prompt: 20, completion: 20, total: 40 }])
		expect(budget.consumed).toBe(40)
	})

	it('floors the residual at 0 when the estimate already exceeds the report', () => {
		const seen: TokenUsage[] = []
		const budget = createBudget<TokenUsage>({
			max: 1000,
			consumer: (usage) => {
				seen.push(usage)
				return usage.total
			},
		})
		chargeUsage(budget, { prompt: 5, completion: 3, total: 8 }, 12)
		expect(seen).toEqual([{ prompt: 5, completion: 0, total: 0 }])
		expect(budget.consumed).toBe(0)
	})

	it('consumes nothing without a budget', () => {
		expect(() => chargeUsage(undefined, { prompt: 1, completion: 4, total: 5 }, 2)).not.toThrow()
	})
})
