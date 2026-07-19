import type { MessageInterface } from '@src/core'
import {
	clampPosition,
	clampRange,
	computeSize,
	countLines,
	createAgentRegistry,
	createBinaryContent,
	createFile,
	createTextContent,
	decodedSize,
	estimateMessages,
	estimateTokens,
	fencedFile,
	filterAllowList,
	IMAGE_TOKEN_ESTIMATE,
	inferLanguage,
	isAgentJobError,
	isBinary,
	isImage,
	isText,
	isValidRange,
	MESSAGE_TOKEN_OVERHEAD,
	offsetAt,
	rangeOf,
	sanitizeUsage,
	settleAgentJob,
	sliceRange,
	spliceRange,
} from '@src/core'
import { describe, expect, it } from 'vitest'
import { createScriptedProvider, createToolCall, createTokenUsage } from '../../setup.js'

// The pure derivation helper behind a file's inferred fenced-code language (AGENTS §16 —
// real behavior, no mocks). Total: a known extension maps to its value, an unknown
// extension or an extension-less input falls back to the documented default, and the
// extension match is case-insensitive. Plus filterAllowList — the three-way
// set-membership primitive a scope applies through (undefined ⇒ all, [] ⇒ none, list ⇒
// only-listed) — and estimateMessages, the default context-budget token estimator
// (the per-message sum of the estimateTokens char heuristic). Plus settleAgentJob —
// the shared job-handler step both createAgentQueue / createAgentRunner settle each
// rehydrated agent through: a natural finish resolves with its result, a PARTIAL throws
// an AgentJobError when partials are disallowed and resolves when allowed (driven over a
// scripted provider — no Ollama, AGENTS §16 real behavior).

// A minimal MessageInterface fixture — only the fields estimateMessages reads (content);
// id/role round out the shape so it is a real message, not a partial.
const message = (content: string): MessageInterface => ({ id: 'm', role: 'user', content })

describe('inferLanguage', () => {
	it('maps common source extensions to their language', () => {
		expect(inferLanguage('src/main.ts')).toBe('typescript')
		expect(inferLanguage('app.tsx')).toBe('typescript')
		expect(inferLanguage('script.js')).toBe('javascript')
		expect(inferLanguage('component.vue')).toBe('vue')
		expect(inferLanguage('module.py')).toBe('python')
		expect(inferLanguage('main.rs')).toBe('rust')
		expect(inferLanguage('README.md')).toBe('markdown')
		expect(inferLanguage('data.json')).toBe('json')
	})

	it('is case-insensitive on the extension', () => {
		expect(inferLanguage('MAIN.TS')).toBe('typescript')
		expect(inferLanguage('Doc.MD')).toBe('markdown')
	})

	it('reads the extension after the LAST dot', () => {
		expect(inferLanguage('archive.tar.ts')).toBe('typescript')
		expect(inferLanguage('my.component.vue')).toBe('vue')
	})

	it('falls back to "text" for an unknown extension', () => {
		expect(inferLanguage('mystery.xyz')).toBe('text')
	})

	it('falls back to "text" for a path with no extension', () => {
		expect(inferLanguage('LICENSE')).toBe('text')
		expect(inferLanguage('src/Makefile')).toBe('text')
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

// The workspace helpers (relocated from the dissolved files/ module): the FileContent narrowing
// guards (isText / isBinary / isImage), the pure, zero-Node derivation + range helpers a File
// computes its size/lines from, and the Workspace slices/splices text with (AGENTS §16 — real data,
// no mocks). `decodedSize` is cross-checked against REAL base64 produced by the runtime's `btoa`
// (test-only; the helper itself decodes arithmetically), so the `=`/`==` padding cases are exercised
// with genuinely-encoded payloads. All range helpers use 1-based line/column positions, with
// start-inclusive / end-exclusive spans clamped to the text's bounds.
//
// Plus fencedFile — the one fenced-reference-block renderer AgentContext.build() frames an active
// workspace's text files with (the SOLE document/image context). Real data, no mocks.

describe('isText / isBinary / isImage', () => {
	it('narrows the text arm', () => {
		const text = createTextContent('hi', 'text')
		expect(isText(text)).toBe(true)
		expect(isBinary(text)).toBe(false)
		expect(isImage(text)).toBe(false)
	})

	it('narrows the binary arm, and an image is a binary with an image/* mime', () => {
		const image = createBinaryContent('AAAA', 'image/png')
		expect(isBinary(image)).toBe(true)
		expect(isText(image)).toBe(false)
		expect(isImage(image)).toBe(true) // image/png starts with image/
	})
})

describe('computeSize', () => {
	it('sizes text as its UTF-8 byte length (multi-byte ≠ char count)', () => {
		expect(computeSize({ text: '', language: 'text' })).toBe(0)
		expect(computeSize({ text: 'abc', language: 'text' })).toBe(3)
		// 'é' → 2 bytes, '😀' → 4 bytes.
		expect(computeSize({ text: 'café', language: 'text' })).toBe(5)
		expect(computeSize({ text: '😀', language: 'text' })).toBe(4)
	})

	it('sizes a binary arm as its decoded base64 payload bytes', () => {
		expect(computeSize({ data: 'AAAA', mime: 'image/png' })).toBe(3)
		expect(computeSize({ data: '', mime: 'image/png' })).toBe(0)
	})
})

describe('countLines', () => {
	it('counts text lines (empty → 0, single, multi, trailing newline)', () => {
		expect(countLines({ text: '', language: 'text' })).toBe(0)
		expect(countLines({ text: 'a', language: 'text' })).toBe(1)
		expect(countLines({ text: 'a\nb\nc', language: 'text' })).toBe(3)
		// A trailing newline counts the empty final line.
		expect(countLines({ text: 'a\n', language: 'text' })).toBe(2)
	})

	it('returns 0 lines for a binary arm', () => {
		expect(countLines({ data: 'AAAA', mime: 'image/png' })).toBe(0)
	})
})

describe('decodedSize', () => {
	it('decodes a known base64 string to its byte length, no padding', () => {
		expect(decodedSize('')).toBe(0)
		// 'AAAA' is three zero bytes encoded.
		expect(decodedSize('AAAA')).toBe(3)
	})

	it('handles single (=) and double (==) padding', () => {
		// 'AAA=' → 2 bytes, 'AA==' → 1 byte (by the base64 padding rules).
		expect(decodedSize('AAA=')).toBe(2)
		expect(decodedSize('AA==')).toBe(1)
	})

	it('matches the byte length of REAL btoa-encoded payloads across each padding case', () => {
		// Encode known ASCII payloads (one byte per char) and confirm decodedSize recovers
		// the original byte length — covering no-padding (len%3===0), one '=' (len%3===2),
		// and two '==' (len%3===1).
		for (const payload of ['', 'a', 'ab', 'abc', 'abcd', 'abcde', 'abcdef']) {
			expect(decodedSize(btoa(payload))).toBe(payload.length)
		}
	})
})

describe('isValidRange', () => {
	const at = (line: number, column: number) => ({ line, column })

	it('accepts a forward range with every component >= 1', () => {
		expect(isValidRange({ start: at(1, 1), end: at(2, 1) })).toBe(true)
		expect(isValidRange({ start: at(1, 1), end: at(1, 1) })).toBe(true) // empty span (start === end)
		expect(isValidRange({ start: at(1, 3), end: at(1, 5) })).toBe(true)
	})

	it('rejects an inverted range (start after end)', () => {
		expect(isValidRange({ start: at(2, 1), end: at(1, 1) })).toBe(false)
		expect(isValidRange({ start: at(1, 5), end: at(1, 3) })).toBe(false)
	})

	it('rejects a sub-1 line or column', () => {
		expect(isValidRange({ start: at(0, 1), end: at(1, 1) })).toBe(false)
		expect(isValidRange({ start: at(1, 0), end: at(1, 1) })).toBe(false)
		expect(isValidRange({ start: at(1, 1), end: at(1, 0) })).toBe(false)
	})
})

describe('clampPosition', () => {
	it('pins a past-the-end position to the end of the text', () => {
		// 'ab\ncd' — two lines; the end caret is line 2, column 3 (just past 'cd').
		expect(clampPosition('ab\ncd', { line: 9, column: 9 })).toEqual({ line: 2, column: 3 })
	})

	it('pins a sub-1 position up to (1, 1)', () => {
		expect(clampPosition('ab\ncd', { line: 0, column: 0 })).toEqual({ line: 1, column: 1 })
	})

	it('clamps the column to its own line, not the whole text', () => {
		// Line 1 is 'ab' (length 2) → max column is 3, regardless of line 2 being longer.
		expect(clampPosition('ab\ncdef', { line: 1, column: 99 })).toEqual({ line: 1, column: 3 })
	})
})

describe('clampRange', () => {
	it('clamps both ends independently to the text bounds', () => {
		expect(
			clampRange('ab\ncd', { start: { line: 1, column: 1 }, end: { line: 9, column: 9 } }),
		).toEqual({ start: { line: 1, column: 1 }, end: { line: 2, column: 3 } })
	})
})

describe('offsetAt', () => {
	it('resolves a 1-based position to a 0-based offset across lines', () => {
		expect(offsetAt('ab\ncd', { line: 1, column: 1 })).toBe(0)
		expect(offsetAt('ab\ncd', { line: 1, column: 3 })).toBe(2) // just past 'ab'
		expect(offsetAt('ab\ncd', { line: 2, column: 1 })).toBe(3) // just past 'ab\n'
		expect(offsetAt('ab\ncd', { line: 2, column: 3 })).toBe(5) // end of 'cd'
	})

	it('caps an out-of-bounds position at the text length', () => {
		expect(offsetAt('ab\ncd', { line: 9, column: 9 })).toBe(5)
	})
})

describe('sliceRange', () => {
	it('extracts the spanned substring (start inclusive, end exclusive)', () => {
		expect(
			sliceRange('hello\nworld', { start: { line: 1, column: 1 }, end: { line: 1, column: 6 } }),
		).toBe('hello')
		// Cross-line span includes the newline between the lines.
		expect(
			sliceRange('hello\nworld', { start: { line: 1, column: 6 }, end: { line: 2, column: 1 } }),
		).toBe('\n')
	})

	it('clamps a past-the-end range to the content', () => {
		expect(sliceRange('hi', { start: { line: 1, column: 1 }, end: { line: 9, column: 9 } })).toBe(
			'hi',
		)
	})
})

describe('spliceRange', () => {
	it('replaces the spanned range with the replacement', () => {
		expect(
			spliceRange('hello', { start: { line: 1, column: 1 }, end: { line: 1, column: 6 } }, 'bye'),
		).toBe('bye')
		expect(
			spliceRange(
				'const x = 1',
				{ start: { line: 1, column: 11 }, end: { line: 1, column: 12 } },
				'2',
			),
		).toBe('const x = 2')
	})

	it('inserts at an empty span (start === end)', () => {
		expect(
			spliceRange('ac', { start: { line: 1, column: 2 }, end: { line: 1, column: 2 } }, 'b'),
		).toBe('abc')
	})
})

describe('rangeOf', () => {
	it('assembles the four flat 1-based ints into a nested Range', () => {
		expect(rangeOf(1, 11, 1, 12)).toEqual({
			start: { line: 1, column: 11 },
			end: { line: 1, column: 12 },
		})
		expect(rangeOf(2, 3, 5, 7)).toEqual({
			start: { line: 2, column: 3 },
			end: { line: 5, column: 7 },
		})
	})

	it('lifts the flat fields verbatim (a pure structural pairing, no validation)', () => {
		// An inverted / sub-1 set is lifted unchanged — validity is the ranged write's concern.
		expect(rangeOf(5, 1, 1, 1)).toEqual({
			start: { line: 5, column: 1 },
			end: { line: 1, column: 1 },
		})
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
