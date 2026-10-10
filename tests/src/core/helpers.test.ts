import type { Message } from '@src/core'
import {
	collectExchanges,
	collectToolGroups,
	filterAllowList,
	joinThinking,
	matchesJudgment,
	stripThinking,
	MESSAGE_ROLES,
	removeEntries,
	sanitizeToken,
	sanitizeUsage,
	sumUsage,
} from '@src/core'
import { describe, expect, it } from 'vitest'
import {
	createToolCall,
	createTokenUsage,
	JUDGMENT_INPUT,
	JUDGMENT_MISMATCHES,
	JUDGMENT_QUESTION,
	JUDGMENT_RECORD,
} from '../../setup.js'

describe('stripThinking', () => {
	const messages: readonly Message[] = [
		{ id: 'u1', role: 'user', content: 'Plan the trip' },
		{ id: 'a1', role: 'assistant', content: 'Fares found', thinking: 'first reasoning' },
		{ id: 'u2', role: 'user', content: 'Book it' },
		{ id: 'a2', role: 'assistant', content: 'Booked', thinking: 'second reasoning' },
		{ id: 'a3', role: 'assistant', content: 'Receipt sent' },
	]

	it("drops all thinking under 'none' without writing an undefined member", () => {
		const stripped = stripThinking(messages, 'none')
		expect(stripped.map((one) => one.thinking)).toEqual([
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
		])
		expect('thinking' in (stripped[1] ?? {})).toBe(false)
		expect(stripped[1]).toEqual({ id: 'a1', role: 'assistant', content: 'Fares found' })
		expect(messages[1]?.thinking).toBe('first reasoning')
	})

	it("keeps only the thinking after the last user message under 'turn'", () => {
		const stripped = stripThinking(messages, 'turn')
		expect(stripped.map((one) => one.thinking)).toEqual([
			undefined,
			undefined,
			undefined,
			'second reasoning',
			undefined,
		])
		expect('thinking' in (stripped[1] ?? {})).toBe(false)
	})

	it("keeps all thinking under 'turn' when no user message exists", () => {
		const open = messages.filter((one) => one.role === 'assistant')
		const stripped = stripThinking(open, 'turn')
		expect(stripped.map((one) => one.thinking)).toEqual([
			'first reasoning',
			'second reasoning',
			undefined,
		])
	})

	it("returns the same array under 'all'", () => {
		expect(stripThinking(messages, 'all')).toBe(messages)
	})

	it('keeps the identity of a message without thinking', () => {
		const stripped = stripThinking(messages, 'none')
		expect(stripped[0]).toBe(messages[0])
		expect(stripped[4]).toBe(messages[4])
		expect(stripped[1]).not.toBe(messages[1])
		expect(stripThinking(messages, 'turn')[3]).toBe(messages[3])
	})
})

describe('filterAllowList', () => {
	it('keeps admitted tool calls by name with their identity and reply order', () => {
		const hidden = createToolCall({ id: 'hidden', name: 'secret' })
		const first = createToolCall({ id: 'first', name: 'safe' })
		const second = createToolCall({ id: 'second', name: 'safe' })
		const calls = [hidden, first, second]
		const admitted = filterAllowList(['safe'], calls, (call) => call.name)
		expect(admitted).toEqual([first, second])
		expect(admitted[0]).toBe(first)
		expect(admitted[1]).toBe(second)
		expect(calls).toEqual([hidden, first, second])
	})

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

	it('treats an empty accumulated string as absent', () => {
		expect(joinThinking('', 'next')).toBe('next')
	})

	it('omits the separator when the next carrier is empty', () => {
		expect(joinThinking('x', '')).toBe('x')
		expect(joinThinking('', '')).toBe('')
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

describe('removeEntries — the folded batch removal', () => {
	it('returns true only when every key was present, and visits every key regardless', () => {
		const stored = new Set(['a', 'b'])
		const visited: string[] = []
		const remove = (key: string): boolean => {
			visited.push(key)
			return stored.delete(key)
		}
		expect(removeEntries(['a', 'missing', 'b'], remove)).toBe(false)
		expect(visited).toEqual(['a', 'missing', 'b'])
		expect(stored.size).toBe(0)
	})

	it('returns true for a fully applied batch and for an empty batch', () => {
		const stored = new Set(['a', 'b'])
		expect(removeEntries(['a', 'b'], (key) => stored.delete(key))).toBe(true)
		expect(removeEntries([], () => false)).toBe(true)
	})
})

describe('MESSAGE_ROLES — the one role list', () => {
	it('lists the four roles in wire order', () => {
		expect(MESSAGE_ROLES).toEqual(['system', 'user', 'assistant', 'tool'])
	})

	it('is frozen, so the guard and the shape read one list', () => {
		expect(Object.isFrozen(MESSAGE_ROLES)).toBe(true)
	})
})

describe('collectExchanges', () => {
	it('keeps leading messages separate and joins exchanges spanned by tool groups', () => {
		const messages: readonly Message[] = [
			{ id: 'lead', role: 'assistant', content: 'Welcome.' },
			{ id: 'u1', role: 'user', content: 'Read the order.' },
			{ id: 'a1', role: 'assistant', content: '', calls: [createToolCall({ id: 'c1' })] },
			{ id: 'u2', role: 'user', content: 'Read the account.' },
			{ id: 'a2', role: 'assistant', content: '', calls: [createToolCall({ id: 'c2' })] },
			{ id: 'r1', role: 'tool', content: 'Order.', call: 'c1' },
			{ id: 'u3', role: 'user', content: 'Continue.' },
			{ id: 'r2', role: 'tool', content: 'Account.', call: 'c2' },
			{ id: 'u4', role: 'user', content: 'Finish.' },
		]
		expect(
			collectExchanges(messages).map((exchange) => exchange.map((message) => message.id)),
		).toEqual([['lead'], ['u1', 'a1', 'u2', 'a2', 'r1', 'u3', 'r2'], ['u4']])
		expect(collectExchanges([])).toEqual([])
		expect(collectExchanges(messages.slice(0, 1))).toEqual([messages.slice(0, 1)])
		expect(messages).toHaveLength(9)
	})
})

describe('collectToolGroups', () => {
	it('groups a result with its unique owner, a positional result with its leader, and an orphan run', () => {
		const messages: readonly Message[] = [
			{ id: 'U', role: 'user', content: 'Which order is late?' },
			{ id: 'A1', role: 'assistant', content: '', calls: [createToolCall({ id: 'one' })] },
			{ id: 'R1', role: 'tool', content: 'positional result' },
			{ id: 'A2', role: 'assistant', content: '', calls: [createToolCall({ id: 'two' })] },
			{ id: 'R2', role: 'tool', content: 'second result', call: 'two' },
			{ id: 'L1', role: 'tool', content: 'late first result', call: 'one' },
			{ id: 'N', role: 'assistant', content: 'Order LH-81660 is late.' },
			{ id: 'O1', role: 'tool', content: 'lost result', call: 'missing' },
			{ id: 'O2', role: 'tool', content: 'other lost result' },
		]

		expect(collectToolGroups(messages).map((group) => group.map(({ id }) => id))).toEqual([
			['A1', 'R1', 'L1'],
			['A2', 'R2'],
			['O1', 'O2'],
		])
	})

	it('returns no group for messages without calls or tool results', () => {
		expect(collectToolGroups([{ id: 'U', role: 'user', content: 'Which order is late?' }])).toEqual(
			[],
		)
	})
})

describe('matchesJudgment', () => {
	it('matches the shared record and ignores its time', () => {
		expect(
			matchesJudgment(
				JUDGMENT_RECORD,
				JUDGMENT_QUESTION,
				JUDGMENT_INPUT.sources,
				JUDGMENT_INPUT.state,
				JUDGMENT_INPUT.model,
			),
		).toBe(true)
	})
	it.each(JUDGMENT_MISMATCHES)('rejects a changed %s alone', (_name, record) => {
		expect(
			matchesJudgment(
				record,
				JUDGMENT_QUESTION,
				JUDGMENT_INPUT.sources,
				JUDGMENT_INPUT.state,
				JUDGMENT_INPUT.model,
			),
		).toBe(false)
	})
})
