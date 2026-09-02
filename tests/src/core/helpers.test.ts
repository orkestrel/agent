import type { AgentResult, ContextSectionSourceInterface, Message } from '@src/core'
import {
	agentResultToJSON,
	assembleResult,
	attachImages,
	attachUserImages,
	buildRecapMessage,
	buildSummaryMessage,
	collectImageData,
	CONVERSATION_RECAP_PREFIX,
	createAgentRegistry,
	denyCall,
	estimateMessages,
	estimateTokens,
	renderFencedFile,
	filterAllowList,
	IMAGE_TOKEN_ESTIMATE,
	intersectKeys,
	isAgentJobError,
	joinThinking,
	MESSAGE_TOKEN_OVERHEAD,
	renderSection,
	resolveClose,
	resolveItem,
	resolveOpen,
	sanitizeToken,
	sanitizeUsage,
	settleAgentJob,
	sumUsage,
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

// A minimal Message fixture — only the fields estimateMessages reads (content);
// id/role round out the shape so it is a real message, not a partial.
const message = (content: string): Message => ({ id: 'm', role: 'user', content })

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

	const invalid: ReadonlyArray<readonly [string, unknown]> = [
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
		const withCalls: Message = { id: 'm', role: 'assistant', content: '', calls }
		expect(estimateMessages([withCalls])).toBe(
			MESSAGE_TOKEN_OVERHEAD + estimateTokens(JSON.stringify(calls)),
		)
	})

	it('does not add a calls estimate for an empty calls array', () => {
		const withEmptyCalls: Message = { id: 'm', role: 'assistant', content: '', calls: [] }
		expect(estimateMessages([withEmptyCalls])).toBe(MESSAGE_TOKEN_OVERHEAD)
	})

	// F5 — a circular `ToolCall.arguments` makes `JSON.stringify` throw; estimateMessages'
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
		// partial is irrelevant for a natural finish — it resolves the full result either way.
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
		// partial: true ⇒ no throw; the same partial result is returned instead.
		const result = await settleAgentJob(agent, true)
		expect(result.partial).toBe(true)
		expect(result.content).toBe('')
	})
})

describe('renderFencedFile', () => {
	it('assembles a `File:` label + a fenced code block tagged with the language', () => {
		expect(renderFencedFile('src/main.ts', 'typescript', 'const x = 1')).toBe(
			'File: src/main.ts\n```typescript\nconst x = 1\n```',
		)
	})

	it('renders the body verbatim inside the fence (multi-line preserved)', () => {
		expect(renderFencedFile('a.md', 'markdown', '# Title\n\nbody')).toBe(
			'File: a.md\n```markdown\n# Title\n\nbody\n```',
		)
	})

	it('frames a workspace text file from its OWN text arm (path + language + text)', () => {
		// AgentContext.build() renders an active workspace's text files with renderFencedFile, off each
		// file's text arm (`{ text, language }`) — the SOLE in-prompt document context now.
		const file = createFile({
			path: 'x.ts',
			content: createTextContent('const y = 2', 'typescript'),
		})
		if (!isText(file.content)) throw new Error('expected a text file')
		expect(renderFencedFile(file.path, file.content.language, file.content.text)).toBe(
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

// The pure leaves the agent loop, the context cascade, the conversation view, and a scope's
// narrow compose from — each extracted from a private method so it can be exercised directly
// on real values rather than only through the entity that calls it.

describe('joinThinking — the separated reasoning across a run', () => {
	it('seeds the accumulation with the first reasoning verbatim', () => {
		expect(joinThinking(undefined, 'first')).toBe('first')
	})

	it('appends a later call blank-line separated', () => {
		expect(joinThinking('first', 'second')).toBe('first\n\nsecond')
	})

	it('keeps an empty accumulated string as the running value', () => {
		expect(joinThinking('', 'next')).toBe('\n\nnext')
	})
})

describe('sumUsage — the running token total across a turn', () => {
	it('returns the first usage unchanged', () => {
		const first = createTokenUsage({ prompt: 2, completion: 1, total: 3 })
		expect(sumUsage(undefined, first)).toEqual(first)
	})

	it('adds each field of a later usage', () => {
		expect(
			sumUsage(
				createTokenUsage({ prompt: 2, completion: 1, total: 3 }),
				createTokenUsage({ prompt: 1, completion: 4, total: 5 }),
			),
		).toEqual({ prompt: 3, completion: 5, total: 8 })
	})

	it('never mutates either input', () => {
		const running = createTokenUsage({ prompt: 2, completion: 1, total: 3 })
		const next = createTokenUsage({ prompt: 1, completion: 1, total: 2 })
		sumUsage(running, next)
		expect(running).toEqual({ prompt: 2, completion: 1, total: 3 })
		expect(next).toEqual({ prompt: 1, completion: 1, total: 2 })
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

describe('renderSection — one assembled context section', () => {
	it('joins the open and each item with blank lines', () => {
		expect(
			renderSection('## Instructions', ['Be terse.', 'Cite sources.'], (one) => one, undefined),
		).toBe('## Instructions\n\nBe terse.\n\nCite sources.')
	})

	it('appends a resolved close as the trailing line', () => {
		expect(renderSection('<rules>', ['Be terse.'], (one) => one, '</rules>')).toBe(
			'<rules>\n\nBe terse.\n\n</rules>',
		)
	})

	it('renders nothing for an empty item list, so open and close never appear alone', () => {
		expect(renderSection('<rules>', [], (one: string) => one, '</rules>')).toBeUndefined()
	})
})

describe('resolveOpen / resolveClose / resolveItem — the format cascade', () => {
	// A section item is anything carrying the per-item `format` override — an instruction here,
	// declared locally so the cascade is exercised on its own contract, not an entity's.
	interface CascadeItem {
		readonly content: string
		readonly format?: string
	}
	const manager: ContextSectionSourceInterface<CascadeItem> = {
		open: '## Instructions',
		format: undefined,
		render: (one) => one.content,
	}
	const overridden: ContextSectionSourceInterface<CascadeItem> = {
		open: '<rules>',
		format: {
			open: '<rules>',
			render: (one) => `<rule>${one.content}</rule>`,
			close: '</rules>',
		},
		render: (one) => one.content,
	}
	const item: CascadeItem = { content: 'Be terse.' }

	it('falls through to the built-in header with no override and no provider default', () => {
		expect(resolveOpen(manager, undefined)).toBe('## Instructions')
	})

	it('prefers the provider default over the built-in header', () => {
		expect(resolveOpen(manager, { open: '<docs>' })).toBe('<docs>')
	})

	it('prefers the manager-options override over the provider default', () => {
		expect(resolveOpen(overridden, { open: '<docs>' })).toBe('<rules>')
	})

	it('resolves no close when neither level sets one', () => {
		expect(resolveClose(manager, undefined)).toBeUndefined()
	})

	it('takes the provider close, then the manager-options close', () => {
		expect(resolveClose(manager, { close: '</docs>' })).toBe('</docs>')
		expect(resolveClose(overridden, { close: '</docs>' })).toBe('</rules>')
	})

	it('renders an item through the built-in when no level applies', () => {
		expect(resolveItem(manager, undefined, item)).toBe('Be terse.')
	})

	it('prefers the provider render, then the manager-options render', () => {
		expect(resolveItem(manager, { render: (one) => `- ${one.content}` }, item)).toBe('- Be terse.')
		expect(resolveItem(overridden, { render: (one) => `- ${one.content}` }, item)).toBe(
			'<rule>Be terse.</rule>',
		)
	})

	it("prefers the item's own format over every other level", () => {
		expect(
			resolveItem(
				overridden,
				{ render: (one) => `- ${one.content}` },
				{
					content: 'ignored',
					format: '<rule priority="high">Escalate.</rule>',
				},
			),
		).toBe('<rule priority="high">Escalate.</rule>')
	})
})

describe('attachImages — the image payload on a copied message', () => {
	it('merges the attached data after the message own images', () => {
		expect(
			attachImages({ id: 'm', role: 'user', content: 'Describe', images: ['own'] }, ['attached']),
		).toEqual({ id: 'm', role: 'user', content: 'Describe', images: ['own', 'attached'] })
	})

	it('never mutates the source message', () => {
		const source: Message = { id: 'm', role: 'user', content: 'Describe' }
		attachImages(source, ['attached'])
		expect(source.images).toBeUndefined()
	})

	it('carries calls only when the source message has them', () => {
		const call = createToolCall({ id: 'c1' })
		expect(
			attachImages({ id: 'm', role: 'assistant', content: '', calls: [call] }, ['a']).calls,
		).toEqual([call])
		expect('calls' in attachImages({ id: 'm', role: 'user', content: 'x' }, ['a'])).toBe(false)
	})
})

describe('attachUserImages — the image payload on a conversation last user turn', () => {
	const conversation: readonly Message[] = [
		{ id: 'u1', role: 'user', content: 'first' },
		{ id: 'a1', role: 'assistant', content: 'reply' },
		{ id: 'u2', role: 'user', content: 'second' },
		{ id: 'a2', role: 'assistant', content: 'later' },
	]

	it('replaces the LAST user message with a copy carrying the data', () => {
		const attached = attachUserImages(conversation, ['payload'])

		expect(attached.map((one) => one.images)).toEqual([
			undefined,
			undefined,
			['payload'],
			undefined,
		])
		// Every other message is the SAME reference — only the target was replaced.
		expect(attached[0]).toBe(conversation[0])
		expect(attached[3]).toBe(conversation[3])
		expect(attached[2]).not.toBe(conversation[2])
	})

	it('never mutates the source conversation', () => {
		attachUserImages(conversation, ['payload'])

		expect(conversation[2]?.images).toBeUndefined()
	})

	it('returns the conversation unchanged for no data', () => {
		expect(attachUserImages(conversation, [])).toBe(conversation)
	})

	it('returns the conversation unchanged when it holds no user message', () => {
		const assistantOnly: readonly Message[] = [{ id: 'a', role: 'assistant', content: 'hi' }]

		expect(attachUserImages(assistantOnly, ['payload'])).toBe(assistantOnly)
	})

	it('merges after a user turn own images, through attachImages', () => {
		const own: readonly Message[] = [{ id: 'u', role: 'user', content: 'x', images: ['own'] }]

		expect(attachUserImages(own, ['payload'])[0]?.images).toEqual(['own', 'payload'])
	})
})

describe('collectImageData — the image carrier split', () => {
	it('collects each image file base64 payload in file order', () => {
		const files = [
			createFile({ path: 'a.png', content: { base64: 'first', mime: 'image/png' } }),
			createFile({ path: 'b.jpg', content: { base64: 'second', mime: 'image/jpeg' } }),
		]
		expect(collectImageData(files)).toEqual(['first', 'second'])
	})

	it('skips a text file — only the binary image arm carries a base64 payload', () => {
		const files = [createFile({ path: 'note.md', content: createTextContent('hello', 'markdown') })]
		expect(collectImageData(files)).toEqual([])
	})

	it('returns an empty list for no files at all', () => {
		expect(collectImageData([])).toEqual([])
	})
})

describe('buildSummaryMessage / buildRecapMessage — a section as a message', () => {
	const section = { id: 's1', summary: 'recap of 2', messages: [] }

	it('carries the section summary verbatim, keyed by the section id', () => {
		expect(buildSummaryMessage(section)).toEqual({
			id: 's1',
			role: 'assistant',
			content: 'recap of 2',
		})
	})

	it('frames the recap with the prefix a small model reads it by', () => {
		expect(buildRecapMessage(section)).toEqual({
			id: 's1',
			role: 'assistant',
			content: `${CONVERSATION_RECAP_PREFIX}recap of 2`,
		})
	})
})

describe('intersectKeys — the scope narrow primitive', () => {
	it('keeps only the child keys the parent also allows', () => {
		expect(intersectKeys(['read', 'write'], ['write', 'admin'])).toEqual(['write'])
	})

	it('treats an undefined side as the universal set', () => {
		expect(intersectKeys(undefined, ['read'])).toEqual(['read'])
		expect(intersectKeys(['read'], undefined)).toEqual(['read'])
		expect(intersectKeys(undefined, undefined)).toBeUndefined()
	})

	it('returns a copy, so a later mutation of an input cannot leak in', () => {
		const parent = ['read', 'write']
		const result = intersectKeys(parent, undefined)
		parent.push('admin')
		expect(result).toEqual(['read', 'write'])
	})

	it('yields an empty list when nothing is shared', () => {
		expect(intersectKeys(['read'], ['write'])).toEqual([])
	})
})
