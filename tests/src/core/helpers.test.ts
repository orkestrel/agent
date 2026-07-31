import type { AgentResult, MessageInterface } from '@src/core'
import {
	agentResultToJSON,
	createAgentRegistry,
	estimateMessages,
	estimateTokens,
	fencedFile,
	filterAllowList,
	IMAGE_TOKEN_ESTIMATE,
	isAgentJobError,
	MESSAGE_TOKEN_OVERHEAD,
	sanitizeToken,
	sanitizeUsage,
	settleAgentJob,
} from '@src/core'
import { createFile, createTextContent, isText } from '@orkestrel/workspace'
import { describe, expect, it } from 'vitest'
import { createScriptedProvider, createToolCall, createTokenUsage } from '../../setup.js'

// Agent-owned pure helpers: filterAllowList applies the three-way set-membership primitive
// a scope uses (undefined ⇒ all, [] ⇒ none, list ⇒ only-listed), while estimateMessages is
// the default context-budget token estimator
// (the per-message sum of the estimateTokens char heuristic). Plus settleAgentJob —
// the shared job-handler step both createAgentQueue / createAgentRunner settle each
// rehydrated agent through: a natural finish resolves with its result, a PARTIAL throws
// an AgentJobError when partials are disallowed and resolves when allowed (driven over a
// scripted provider — no Ollama, AGENTS §16 real behavior).

// A minimal MessageInterface fixture — only the fields estimateMessages reads (content);
// id/role round out the shape so it is a real message, not a partial.
const message = (content: string): MessageInterface => ({ id: 'm', role: 'user', content })

function returnUndefined(): undefined {
	return undefined
}

class AgentResultAccessCounter {
	content = 0
	thinking = 0
	usage = 0
	partial = 0
	prompt = 0
	completion = 0
	total = 0
}

class CountingTokenUsage {
	#counter: AgentResultAccessCounter

	constructor(counter: AgentResultAccessCounter) {
		this.#counter = counter
	}

	get prompt(): number {
		this.#counter.prompt += 1
		return 2
	}

	get completion(): number {
		this.#counter.completion += 1
		return 1
	}

	get total(): number {
		this.#counter.total += 1
		return 3
	}
}

class CountingAgentResult {
	readonly counter = new AgentResultAccessCounter()
	#usage = new CountingTokenUsage(this.counter)

	get content(): string {
		this.counter.content += 1
		return 'done'
	}

	get thinking(): string {
		this.counter.thinking += 1
		return 'reasoning'
	}

	get usage(): CountingTokenUsage {
		this.counter.usage += 1
		return this.#usage
	}

	get partial(): boolean {
		this.counter.partial += 1
		return false
	}
}

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

	const throwingAccessor = { partial: false }
	const throwingGetter = Proxy.revocable(() => 'done', {})
	throwingGetter.revoke()
	Object.defineProperty(throwingAccessor, 'content', {
		enumerable: true,
		get: throwingGetter.proxy,
	})

	const usageAccessor = { content: 'done', partial: false, usage: { completion: 1, total: 2 } }
	const usageGetter = Proxy.revocable(() => 1, {})
	usageGetter.revoke()
	Object.defineProperty(usageAccessor.usage, 'prompt', {
		enumerable: true,
		get: usageGetter.proxy,
	})

	const revokedRoot = Proxy.revocable({ content: 'done', partial: false }, {})
	revokedRoot.revoke()
	const getTrap = Proxy.revocable(() => undefined, {})
	getTrap.revoke()
	const throwingGet = new Proxy({}, { get: getTrap.proxy })
	const revokedUsage = Proxy.revocable({ prompt: 1, completion: 1, total: 2 }, {})
	const nestedRevoked = { content: 'done', usage: revokedUsage.proxy, partial: false }
	revokedUsage.revoke()

	const invalid: readonly (readonly [string, unknown])[] = [
		['missing content', { partial: false }],
		['missing partial', { content: 'done' }],
		['wrong content type', { content: 1, partial: false }],
		['wrong partial type', { content: 'done', partial: 'false' }],
		['wrong thinking type', { content: 'done', thinking: 1, partial: false }],
		['null usage', { content: 'done', usage: null, partial: false }],
		['wrong usage type', { content: 'done', usage: 'tokens', partial: false }],
		[
			'NaN usage',
			{ content: 'done', usage: { prompt: NaN, completion: 1, total: 2 }, partial: false },
		],
		[
			'positive-infinite usage',
			{
				content: 'done',
				usage: { prompt: 1, completion: Infinity, total: 2 },
				partial: false,
			},
		],
		[
			'negative-infinite usage',
			{
				content: 'done',
				usage: { prompt: 1, completion: 1, total: -Infinity },
				partial: false,
			},
		],
		['missing usage field', { content: 'done', usage: { prompt: 1, total: 2 }, partial: false }],
		['throwing root accessor', throwingAccessor],
		['nested usage accessor', usageAccessor],
		['throwing get trap', throwingGet],
		['revoked root proxy', revokedRoot.proxy],
		['revoked nested usage proxy', nestedRevoked],
		['undefined input', undefined],
		['null input', null],
		['string input', 'done'],
		['number input', 1],
		['boolean input', false],
		['function input', returnUndefined],
		['symbol input', Symbol('result')],
		['bigint input', 1n],
	]

	it.each(invalid)('returns undefined without throwing for %s', (_label, input) => {
		let projected: unknown = 'not called'
		expect(() => {
			projected = agentResultToJSON(input)
		}).not.toThrow()
		expect(projected).toBeUndefined()
	})
})

describe('filterAllowList', () => {
	const items = [{ name: 'a' }, { name: 'b' }, { name: 'c' }] as const
	const byName = (item: { readonly name: string }): string => item.name

	it('returns every item (unchanged) for an undefined allow-list — no constraint', () => {
		const filtered = filterAllowList(undefined, items, byName)

		expect(filtered).toBe(items)
		expect(filtered.map(byName)).toEqual(['a', 'b', 'c'])
	})

	it('returns no items for an empty allow-list — [] ⇒ none pass', () => {
		expect(filterAllowList([], items, byName)).toEqual([])
	})

	it('returns only the listed items for a non-empty allow-list', () => {
		expect(filterAllowList(['a', 'c'], items, byName).map(byName)).toEqual(['a', 'c'])
	})

	it('preserves the items’ original order, not the allow-list order', () => {
		expect(filterAllowList(['c', 'a'], items, byName).map(byName)).toEqual(['a', 'c'])
	})

	it('ignores allow-list keys that match no item', () => {
		expect(filterAllowList(['a', 'ghost'], items, byName).map(byName)).toEqual(['a'])
	})

	it('uses the key extractor to match (not object identity)', () => {
		// A distinct object with a listed key still passes — membership is by extracted key.
		const others = [
			{ name: 'a', extra: 1 },
			{ name: 'z', extra: 2 },
		] as const
		expect(filterAllowList(['a'], others, (one) => one.name).map((one) => one.name)).toEqual(['a'])
	})

	it('returns an empty array (not throwing) when filtering an empty item list', () => {
		expect(filterAllowList(['a'], [], byName)).toEqual([])
		expect(filterAllowList(undefined, [], byName)).toEqual([])
	})
})

describe('estimateMessages', () => {
	it('sums estimateTokens over each message content plus the per-message overhead', () => {
		const messages = [message('hello'), message('a'.repeat(40))]
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

	it('treats empty-content messages as just the per-message overhead', () => {
		// An empty content contributes 0 content tokens, so each message is exactly its overhead.
		expect(estimateMessages([message(''), message('')])).toBe(2 * MESSAGE_TOKEN_OVERHEAD)
		// And a mix is the non-empty member's content estimate plus both messages' overhead.
		expect(estimateMessages([message(''), message('hello')])).toBe(
			estimateTokens('hello') + 2 * MESSAGE_TOKEN_OVERHEAD,
		)
	})

	it('counts the per-message overhead for N messages (N * MESSAGE_TOKEN_OVERHEAD)', () => {
		const messages = [message(''), message(''), message(''), message('')]
		expect(estimateMessages(messages)).toBe(4 * MESSAGE_TOKEN_OVERHEAD)
	})

	it('adds the JSON-stringified calls estimate when a message has calls', () => {
		const calls = [createToolCall({ id: 'c1', name: 'search', arguments: { q: 'acme' } })]
		const withCalls: MessageInterface = { id: 'm', role: 'assistant', content: '', calls }
		expect(estimateMessages([withCalls])).toBe(
			MESSAGE_TOKEN_OVERHEAD + estimateTokens(JSON.stringify(calls)),
		)
	})

	it('does not add a calls estimate for an empty calls array', () => {
		const withEmptyCalls: MessageInterface = { id: 'm', role: 'assistant', content: '', calls: [] }
		expect(estimateMessages([withEmptyCalls])).toBe(MESSAGE_TOKEN_OVERHEAD)
	})

	// F5 — a circular `ToolCall.arguments` makes `JSON.stringify` throw; estimateMessages'
	// TSDoc promises it "never throws", so the circular case must not reject/throw and instead
	// falls back to a conservative fixed contribution (MESSAGE_TOKEN_OVERHEAD-scale).
	it('never throws on a circular calls argument — falls back to the documented fixed contribution', () => {
		const circular: Record<string, unknown> = { q: 'acme' }
		circular.self = circular
		const calls = [createToolCall({ id: 'c1', name: 'search', arguments: circular })]
		const withCircularCalls: MessageInterface = { id: 'm', role: 'assistant', content: '', calls }

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
		const withImages: MessageInterface = {
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
	// finish resolves with the run's result; a PARTIAL (forced via a pre-aborted signal,
	// which commits an empty partial before the provider runs) THROWS an AgentJobError when
	// partials are disallowed and RESOLVES the partial when allowed.
	const USAGE = createTokenUsage()
	const registry = (turn: { content: string; usage?: typeof USAGE }) =>
		createAgentRegistry({ providers: { main: createScriptedProvider([turn]) } })

	it('resolves a naturally-finished run with its result (partial: false)', async () => {
		const agent = registry({ content: 'done', usage: USAGE }).build({
			provider: 'main',
			messages: [{ role: 'user', content: 'go' }],
		})
		// allowPartial is irrelevant for a natural finish — it resolves the full result either way.
		const result = await settleAgentJob(agent, false)
		expect(result.partial).toBe(false)
		expect(result.content).toBe('done')
		expect(result.usage).toEqual(USAGE)
	})

	it('throws an AgentJobError carrying the partial when the run ends partial and partials are DISALLOWED', async () => {
		// A pre-aborted signal commits an empty partial before the provider ever runs.
		const controller = new AbortController()
		controller.abort()
		const agent = registry({ content: 'never' }).build(
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
		const agent = registry({ content: 'never' }).build(
			{ provider: 'main', messages: [{ role: 'user', content: 'go' }] },
			controller.signal,
		)
		// allowPartial: true ⇒ no throw; the same partial result is returned instead.
		const result = await settleAgentJob(agent, true)
		expect(result.partial).toBe(true)
		expect(result.content).toBe('')
	})
})

describe('fencedFile', () => {
	it('assembles a `File:` label + a fenced code block tagged with the language', () => {
		expect(fencedFile('src/main.ts', 'typescript', 'const x = 1')).toBe(
			'File: src/main.ts\n```typescript\nconst x = 1\n```',
		)
	})

	it('renders the body verbatim inside the fence (multi-line preserved)', () => {
		expect(fencedFile('a.md', 'markdown', '# Title\n\nbody')).toBe(
			'File: a.md\n```markdown\n# Title\n\nbody\n```',
		)
	})

	it('frames a workspace text file from its OWN text arm (path + language + text)', () => {
		// AgentContext.build() renders an active workspace's text files with fencedFile, off each
		// file's text arm (`{ text, language }`) — the SOLE in-prompt document context now.
		const file = createFile({
			path: 'x.ts',
			content: createTextContent('const y = 2', 'typescript'),
		})
		if (!isText(file.content)) throw new Error('expected a text file')
		expect(fencedFile(file.path, file.content.language, file.content.text)).toBe(
			'File: x.ts\n```typescript\nconst y = 2\n```',
		)
	})
})

describe('sanitizeUsage', () => {
	it('sanitizes an individual token count through the shared primitive', () => {
		expect(sanitizeToken(5.9)).toBe(5)
		expect(sanitizeToken(-1)).toBe(0)
		expect(sanitizeToken(Infinity)).toBe(0)
	})

	it('is the identity on a well-formed non-negative integer usage', () => {
		expect(sanitizeUsage({ prompt: 5, completion: 7, total: 12 })).toEqual({
			prompt: 5,
			completion: 7,
			total: 12,
		})
		expect(sanitizeUsage({ prompt: 0, completion: 0, total: 0 })).toEqual({
			prompt: 0,
			completion: 0,
			total: 0,
		})
	})

	it('floors a NaN field to 0', () => {
		expect(sanitizeUsage({ prompt: NaN, completion: 7, total: 12 })).toEqual({
			prompt: 0,
			completion: 7,
			total: 12,
		})
	})

	it('floors a negative field to 0', () => {
		expect(sanitizeUsage({ prompt: -5, completion: 7, total: 12 })).toEqual({
			prompt: 0,
			completion: 7,
			total: 12,
		})
	})

	it('floors Infinity and -Infinity fields to 0', () => {
		expect(sanitizeUsage({ prompt: Infinity, completion: -Infinity, total: 12 })).toEqual({
			prompt: 0,
			completion: 0,
			total: 12,
		})
	})

	it('floors a fractional field to its integer part', () => {
		expect(sanitizeUsage({ prompt: 5.9, completion: 7.1, total: 12.7 })).toEqual({
			prompt: 5,
			completion: 7,
			total: 12,
		})
	})

	it('sanitizes a mix of non-finite, negative, and fractional fields independently', () => {
		expect(sanitizeUsage({ prompt: -5, completion: NaN, total: 12.7 })).toEqual({
			prompt: 0,
			completion: 0,
			total: 12,
		})
	})
})
