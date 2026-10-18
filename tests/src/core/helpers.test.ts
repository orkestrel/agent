import type { Message } from '@src/core'
import type { ToolCall } from '@orkestrel/tool'
import {
	collectExchanges,
	collectToolGroups,
	filterAllowList,
	hasCalls,
	joinThinking,
	matchesJudgment,
	stripThinking,
	MESSAGE_ROLES,
	removeEntries,
	renderJSON,
	sanitizeToken,
	sanitizeUsage,
	sumUsage,
} from '@src/core'
import { canonicalStringify } from '@orkestrel/contract'
import { createRecorder } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import {
	buildExchangeMessages,
	buildToolGroupMessages,
	createToolCall,
	ALLOW_LIST_MEMBERS,
	ALLOW_LIST_MATCH_MEMBERS,
	THINKING_MESSAGES,
	createTokenUsage,
	JUDGMENT_INPUT,
	JUDGMENT_MISMATCHES,
	JUDGMENT_QUESTION,
	JUDGMENT_RECORD,
} from '../../setup.js'

describe('stripThinking', () => {
	it("drops all thinking under 'none' without writing an undefined member", () => {
		const stripped = stripThinking(THINKING_MESSAGES, 'none')
		expect(stripped.map((one) => one.thinking)).toEqual([
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
		])
		expect('thinking' in (stripped[1] ?? {})).toBe(false)
		expect(stripped[1]).toEqual({ id: 'a1', role: 'assistant', content: 'Fares found' })
		expect(THINKING_MESSAGES[1]?.thinking).toBe('first reasoning')
	})

	it("keeps only the thinking after the last user message under 'turn'", () => {
		const stripped = stripThinking(THINKING_MESSAGES, 'turn')
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
		const open = THINKING_MESSAGES.filter((one) => one.role === 'assistant')
		const stripped = stripThinking(open, 'turn')
		expect(stripped.map((one) => one.thinking)).toEqual([
			'first reasoning',
			'second reasoning',
			undefined,
		])
	})

	it("returns the same array under 'all'", () => {
		expect(stripThinking(THINKING_MESSAGES, 'all')).toBe(THINKING_MESSAGES)
	})

	it('keeps the identity of a message without thinking', () => {
		const stripped = stripThinking(THINKING_MESSAGES, 'none')
		expect(stripped[0]).toBe(THINKING_MESSAGES[0])
		expect(stripped[4]).toBe(THINKING_MESSAGES[4])
		expect(stripped[1]).not.toBe(THINKING_MESSAGES[1])
		expect(stripThinking(THINKING_MESSAGES, 'turn')[3]).toBe(THINKING_MESSAGES[3])
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

	it('returns every item (unchanged) for an undefined allow-list — no constraint', () => {
		const filtered = filterAllowList(undefined, ALLOW_LIST_MEMBERS, (member) => member.name)

		expect(filtered).toBe(ALLOW_LIST_MEMBERS)
		expect(filtered.map((member) => member.name)).toEqual(['a', 'b', 'c'])
	})

	it('returns no items for an empty allow-list — [] ⇒ none pass', () => {
		expect(filterAllowList([], ALLOW_LIST_MEMBERS, (member) => member.name)).toEqual([])
	})

	it('returns only the listed items for a non-empty allow-list', () => {
		expect(
			filterAllowList(['a', 'c'], ALLOW_LIST_MEMBERS, (member) => member.name).map(
				(member) => member.name,
			),
		).toEqual(['a', 'c'])
	})

	it('preserves the items’ original order, not the allow-list order', () => {
		expect(
			filterAllowList(['c', 'a'], ALLOW_LIST_MEMBERS, (member) => member.name).map(
				(member) => member.name,
			),
		).toEqual(['a', 'c'])
	})

	it('ignores allow-list keys that match no item', () => {
		expect(
			filterAllowList(['a', 'ghost'], ALLOW_LIST_MEMBERS, (member) => member.name).map(
				(member) => member.name,
			),
		).toEqual(['a'])
	})

	it('uses the key extractor to match (not object identity)', () => {
		// A distinct object with a listed key still passes — membership is by extracted key.
		expect(
			filterAllowList(['a'], ALLOW_LIST_MATCH_MEMBERS, (member) => member.name).map(
				(one) => one.name,
			),
		).toEqual(['a'])
	})

	it('returns an empty array (not throwing) when filtering an empty item list', () => {
		expect(filterAllowList(['a'], [], () => 'unreachable')).toEqual([])
		expect(filterAllowList(undefined, [], () => 'unreachable')).toEqual([])
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

// Direct proofs isolate the pure computations composed by the runtime entities.

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
		expect(
			removeEntries(['a', 'missing', 'b'], (key) => {
				visited.push(key)
				return stored.delete(key)
			}),
		).toBe(false)
		expect(visited).toEqual(['a', 'missing', 'b'])
		expect(stored.size).toBe(0)
	})

	it('returns true for a fully applied batch and for an empty batch', () => {
		const stored = new Set(['a', 'b'])
		expect(removeEntries(['a', 'b'], (key) => stored.delete(key))).toBe(true)
		expect(removeEntries([], () => false)).toBe(true)
	})

	it('passes a hole in the key list to remove as undefined, as a for…of visits it', () => {
		const keys: string[] = []
		keys[0] = 'a'
		keys[2] = 'c'
		const stored = new Set<string | undefined>(['a', 'c'])
		const removals = createRecorder<readonly [string | undefined]>()
		const removed = removeEntries<string | undefined>(keys, (key) => {
			removals.handler(key)
			return stored.delete(key)
		})
		expect(removals.calls).toEqual([['a'], [undefined], ['c']])
		expect(removed).toBe(false)
		expect(stored.size).toBe(0)
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
		const messages = buildExchangeMessages()
		expect(
			collectExchanges(messages).map((exchange) => exchange.map((message) => message.id)),
		).toEqual([['lead'], ['u1', 'a1', 'u2', 'a2', 'r1', 'u3', 'r2'], ['u4']])
		expect(collectExchanges([])).toEqual([])
		expect(collectExchanges(messages.slice(0, 1))).toEqual([messages.slice(0, 1)])
		expect(messages).toHaveLength(9)
	})

	it('joins one call and 150000 results into a single exchange without an argument spread', () => {
		const lookup: Message = {
			id: 'lookup',
			role: 'assistant',
			content: '',
			calls: [createToolCall()],
		}
		const request: Message = { id: 'request', role: 'user', content: 'Read the order.' }
		const results = Array.from({ length: 150_000 }, (): Message => ({
			id: 'result',
			role: 'tool',
			content: 'LH-81660 is late',
			call: 'c1',
		}))
		const exchanges = collectExchanges([lookup, request, ...results])
		expect(exchanges).toHaveLength(1)
		expect(exchanges[0]).toHaveLength(150_002)
		expect(exchanges[0]?.[0]).toBe(lookup)
		expect(exchanges[0]?.[1]).toBe(request)
	})
})

describe('collectToolGroups', () => {
	it('groups a result with its unique owner, a positional result with its leader, and an orphan run', () => {
		const messages = buildToolGroupMessages()

		expect(collectToolGroups(messages).map((group) => group.map(({ id }) => id))).toEqual([
			['A1', 'R1', 'L1'],
			['A2', 'R2'],
			['O1', 'O2'],
		])
	})

	it('seeds a repeated leader once, so its group holds every result that follows either occurrence', () => {
		const lookup: Message = { id: 'A', role: 'assistant', content: '', calls: [createToolCall()] }
		const messages: readonly Message[] = [
			lookup,
			{ id: 'T1', role: 'tool', content: 'first', call: 'c1' },
			lookup,
			{ id: 'T2', role: 'tool', content: 'second', call: 'c1' },
		]

		expect(collectToolGroups(messages).map((group) => group.map(({ id }) => id))).toEqual([
			['A', 'T1', 'T2'],
		])
	})

	it('gathers tool messages before any other message into one orphan run', () => {
		const messages: readonly Message[] = [
			{ id: 'T1', role: 'tool', content: 'first', call: 'missing' },
			{ id: 'T2', role: 'tool', content: 'second' },
			{ id: 'U', role: 'user', content: 'Which order is late?' },
		]

		expect(collectToolGroups(messages).map((group) => group.map(({ id }) => id))).toEqual([
			['T1', 'T2'],
		])
	})

	it('returns no group for messages without calls or tool results', () => {
		expect(collectToolGroups([{ id: 'U', role: 'user', content: 'Which order is late?' }])).toEqual(
			[],
		)
	})

	it('reads a hole in a call list as undefined, as a for…of does, so the id read throws', () => {
		const calls: ToolCall[] = []
		calls[1] = createToolCall()
		const messages: readonly Message[] = [
			{ id: 'A', role: 'assistant', content: '', calls },
			{ id: 'T', role: 'tool', content: 'late', call: 'c1' },
		]

		expect(() => collectToolGroups(messages)).toThrow(TypeError)
	})
})

describe('hasCalls', () => {
	it('reports a message with at least one call', () => {
		const lookup: Message = {
			id: 'lookup',
			role: 'assistant',
			content: '',
			calls: [createToolCall()],
		}
		expect(hasCalls({ calls: [createToolCall()] })).toBe(true)
		expect(hasCalls(lookup)).toBe(true)
	})

	it('refuses an absent and an empty call list', () => {
		const question: Message = { id: 'U', role: 'user', content: 'Which order is late?' }
		expect(hasCalls({})).toBe(false)
		expect(hasCalls({ calls: [] })).toBe(false)
		expect(hasCalls(question)).toBe(false)
	})
})

describe('renderJSON', () => {
	it('returns the bytes JSON.stringify returns, property order included', () => {
		const value = { order: 'LH-81660', items: [{ sku: 'B-2', count: 2 }, null], late: true }
		expect(renderJSON(value)).toBe(
			'{"order":"LH-81660","items":[{"sku":"B-2","count":2},null],"late":true}',
		)
		expect(renderJSON(value)).toBe(JSON.stringify(value))
		expect(renderJSON({ zone: 'east', account: 4182 })).toBe('{"zone":"east","account":4182}')
		expect(renderJSON('refund')).toBe('"refund"')
		expect(renderJSON(Number.NaN)).toBe('null')
	})

	it('differs from the canonical encoding on unsorted keys', () => {
		const value = { zone: 'east', account: 4182 }
		expect(canonicalStringify(value)).toBe('{"account":4182,"zone":"east"}')
		expect(renderJSON(value)).not.toBe(canonicalStringify(value))
	})

	it('returns undefined for a BigInt, a cycle, and a value with no JSON text', () => {
		const cyclic: Record<string, unknown> = { order: 'LH-81660' }
		cyclic.self = cyclic
		expect(() => JSON.stringify(10n)).toThrow(TypeError)
		expect(() => JSON.stringify(cyclic)).toThrow(TypeError)
		expect(renderJSON(10n)).toBeUndefined()
		expect(renderJSON({ total: 10n })).toBeUndefined()
		expect(renderJSON(cyclic)).toBeUndefined()
		expect(renderJSON(undefined)).toBeUndefined()
		expect(renderJSON(() => 'refund')).toBeUndefined()
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
