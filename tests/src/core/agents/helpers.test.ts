import type { AgentResult, Message, ProviderRequest } from '@src/core'
import type { TokenUsage } from '@orkestrel/budget'
import {
	createMessage,
	CountingAgentResult,
	createInvalidAgentResultCases,
	createRecordedBudget,
	createTurnRegistry,
	AGENT_USAGE,
	MESSAGE_MEASURE_CASES,
	REQUEST_ESTIMATE_CASES,
	REQUEST_MEASURE_CASES,
} from '../../../setup.js'
import {
	agentResultToJSON,
	assembleResult,
	chargeUsage,
	denyCall,
	estimateMessages,
	estimateRequest,
	estimateTokens,
	IMAGE_TOKEN_ESTIMATE,
	isAgentJobError,
	measureMessage,
	measureRequest,
	MESSAGE_TOKEN_OVERHEAD,
	renderToolValue,
	settleAgentJob,
	requireEntry,
	requireLimit,
	extractQueueOptions,
} from '@src/core'
import { attempt, isRecord } from '@orkestrel/contract'
import { createRecorder } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import { createToolCall, createTokenUsage } from '../../../setup.js'

describe('requireEntry', () => {
	it('returns the registered value without copying it', () => {
		const value = { name: 'registered' }
		expect(requireEntry(new Map([['main', value]]), 'provider', 'main')).toBe(value)
	})

	it('reports the category and missing name with a registry code', () => {
		expect(() => requireEntry(new Map(), 'tool', 'missing')).toThrow(
			expect.objectContaining({
				code: 'REGISTRY',
				message: 'unknown tool: missing',
				context: { category: 'tool', name: 'missing' },
			}),
		)
	})
})

describe('requireLimit', () => {
	it('returns a nonnegative safe integer unchanged, including 0', () => {
		expect(requireLimit(0)).toBe(0)
		expect(requireLimit(3)).toBe(3)
		expect(requireLimit(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
	})

	it('refuses every other number with a LIMIT code naming the value', () => {
		for (const limit of [
			Number.NaN,
			-1,
			1.5,
			Number.POSITIVE_INFINITY,
			Number.NEGATIVE_INFINITY,
			2 ** 53,
		]) {
			expect(() => requireLimit(limit)).toThrow(
				expect.objectContaining({ code: 'LIMIT', context: { limit } }),
			)
		}
	})
})

describe('renderToolValue', () => {
	it('passes a string through unchanged', () => {
		expect(renderToolValue('sunny in Lisbon')).toBe('sunny in Lisbon')
		expect(renderToolValue('')).toBe('')
	})

	it('renders a value JSON carries as its JSON text', () => {
		expect(renderToolValue({ text: 'first\n"second"', count: 2 })).toBe(
			'{"text":"first\\n\\"second\\"","count":2}',
		)
		expect(renderToolValue(5)).toBe('5')
		expect(renderToolValue(null)).toBe('null')
		expect(renderToolValue([1, 'two'])).toBe('[1,"two"]')
	})

	it('renders undefined as empty content', () => {
		expect(renderToolValue(undefined)).toBe('')
	})

	it('falls back to the string form for a value JSON cannot carry', () => {
		const graph: Record<string, unknown> = { name: 'route' }
		graph.next = graph
		expect(renderToolValue(10n)).toBe('10')
		expect(renderToolValue(graph)).toBe('[object Object]')
		expect(renderToolValue(Symbol('route'))).toBe('Symbol(route)')
		expect(
			renderToolValue({
				toJSON: () => {
					throw new Error('unserializable')
				},
			}),
		).toBe('[object Object]')
	})

	it('renders empty content when neither JSON nor the string form can carry the value', () => {
		const bare: Record<string, unknown> = Object.create(null)
		bare.self = bare
		expect(renderToolValue(bare)).toBe('')
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

describe('agentResultToJSON', () => {
	it('projects exactly the declared AgentResult fields and drops an extra member', () => {
		const fields = {
			content: true,
			thinking: true,
			usage: true,
			partial: true,
		} satisfies Readonly<Record<keyof AgentResult, true>>

		const projected = agentResultToJSON({
			content: 'done',
			thinking: 'reasoning',
			usage: { prompt: 2, completion: 1, total: 3 },
			partial: false,
			model: 'drop',
		})

		if (!isRecord(projected)) throw new Error('expected a projected record')
		expect(Object.keys(projected).sort()).toEqual(Object.keys(fields).sort())
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
			const projected = attempt(() => agentResultToJSON(input))
			expect(projected.success).toBe(true)
			expect(projected.success && projected.value).toBeUndefined()
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

		const estimate = attempt(() => estimateMessages([withCircularCalls]))
		expect(estimate.success).toBe(true)
		expect(estimate.success && Number.isFinite(estimate.value)).toBe(true)
		// The fallback contribution matches the documented constant exactly (no partial/garbage
		// serialization sneaks through) — the message's total is its overhead plus that fallback.
		expect(estimate.success && estimate.value).toBe(2 * MESSAGE_TOKEN_OVERHEAD)
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

describe('estimateRequest', () => {
	it.each(REQUEST_ESTIMATE_CASES)('counts $label as $expected tokens', ({ request, expected }) => {
		expect(estimateRequest(request)).toBe(expected)
	})

	it('equals estimateMessages when no tool list or schema is carried', () => {
		const messages = [createMessage('hello'), createMessage('a'.repeat(40))]
		expect(estimateRequest({ messages })).toBe(estimateMessages(messages))
		expect(estimateRequest({ messages, tools: [], options: { think: true } })).toBe(20)
	})

	it('is 0 for an empty request', () => {
		expect(estimateRequest({ messages: [] })).toBe(0)
	})

	it('charges a fixed overhead for a schema or tool list JSON cannot carry, and never throws', () => {
		const circular: Record<string, unknown> = { type: 'object' }
		circular.self = circular
		const messages = [createMessage('hello')]
		// 6 for the message plus the documented fixed MESSAGE_TOKEN_OVERHEAD for the unrenderable part.
		expect(estimateRequest({ messages, options: { schema: circular } })).toBe(
			6 + MESSAGE_TOKEN_OVERHEAD,
		)
		expect(estimateRequest({ messages, tools: [{ name: 'lookup', parameters: circular }] })).toBe(
			6 + MESSAGE_TOKEN_OVERHEAD,
		)
	})
})

describe('measureMessage', () => {
	it.each(MESSAGE_MEASURE_CASES)(
		'measures $label into its hand-counted components',
		({ message, expected, total }) => {
			const measure = measureMessage(message)
			expect(measure).toEqual(expected)
			// The components sum to the legacy estimator's known reading, never to a mirrored call.
			expect(
				measure.content + measure.framing + measure.calls + measure.thinking + measure.images,
			).toBe(total)
			expect(estimateMessages([message])).toBe(total)
		},
	)

	it('keeps exactly the identity joins and the five components, with no stored total', () => {
		const [first] = MESSAGE_MEASURE_CASES
		if (first === undefined) throw new Error('Missing message measure case')
		expect(Object.keys(measureMessage(first.message)).sort()).toEqual([
			'calls',
			'content',
			'framing',
			'id',
			'images',
			'role',
			'thinking',
		])
	})

	it('sums across a batch to the known legacy reading', () => {
		expect(estimateMessages(MESSAGE_MEASURE_CASES.map((entry) => entry.message))).toBe(2673)
	})

	it('neither mutates nor retains the measured message', () => {
		const message: Message = Object.freeze({
			id: 'm',
			role: 'assistant',
			content: 'hello',
			thinking: 'plan',
			images: Object.freeze(['a']),
			calls: Object.freeze([createToolCall({ id: 'c1', name: 'search', arguments: { q: 'x' } })]),
		})
		const before = JSON.stringify(message)
		const first = measureMessage(message)
		const second = measureMessage(message)
		expect(JSON.stringify(message)).toBe(before)
		expect(second).toEqual(first)
		expect(second).not.toBe(first)
	})
})

describe('measureRequest', () => {
	it.each(REQUEST_MEASURE_CASES)(
		'measures $label into its hand-counted components',
		({ request, expected, total }) => {
			const measure = measureRequest(request)
			expect(measure).toEqual(expected)
			expect(
				measure.messages.reduce(
					(sum, message) =>
						sum +
						message.content +
						message.framing +
						message.calls +
						message.thinking +
						message.images,
					measure.tools + measure.schema,
				),
			).toBe(total)
			expect(estimateRequest(request)).toBe(total)
		},
	)

	it('keeps exactly the messages, tools and schema members, with no stored total', () => {
		expect(Object.keys(measureRequest({ messages: [] })).sort()).toEqual([
			'messages',
			'schema',
			'tools',
		])
	})

	it('keeps message order and duplicate ids as separate occurrences', () => {
		const duplicates = REQUEST_MEASURE_CASES.find((entry) => entry.label.startsWith('duplicate'))
		if (duplicates === undefined) throw new Error('Missing duplicate-id case')
		const measure = measureRequest(duplicates.request)
		expect(measure.messages.map((message) => [message.id, message.role])).toEqual([
			['d', 'user'],
			['x', 'assistant'],
			['d', 'tool'],
		])
	})

	it('neither mutates nor retains the measured request', () => {
		const request: ProviderRequest = Object.freeze({
			messages: Object.freeze([createMessage('hello')]),
			tools: Object.freeze([Object.freeze({ name: 'lookup' })]),
			options: Object.freeze({ think: true, schema: Object.freeze({ type: 'object' }) }),
		})
		const before = JSON.stringify(request)
		const first = measureRequest(request)
		const second = measureRequest(request)
		expect(JSON.stringify(request)).toBe(before)
		expect(second).toEqual(first)
		expect(second).not.toBe(first)
		expect(second.messages).not.toBe(first.messages)
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
		const seen = createRecorder<[TokenUsage]>()
		const budget = createRecordedBudget(seen, 1000)
		chargeUsage(budget, { prompt: 20, completion: 30, total: 50 }, 10)
		expect(seen.calls).toEqual([[{ prompt: 20, completion: 20, total: 40 }]])
		expect(budget.consumed).toBe(40)
	})

	it('floors the residual at 0 when the estimate already exceeds the report', () => {
		const seen = createRecorder<[TokenUsage]>()
		const budget = createRecordedBudget(seen, 1000)
		chargeUsage(budget, { prompt: 5, completion: 3, total: 8 }, 12)
		expect(seen.calls).toEqual([[{ prompt: 5, completion: 0, total: 0 }]])
		expect(budget.consumed).toBe(0)
	})

	it('consumes nothing without a budget', () => {
		expect(() => chargeUsage(undefined, { prompt: 1, completion: 4, total: 5 }, 2)).not.toThrow()
	})
})
