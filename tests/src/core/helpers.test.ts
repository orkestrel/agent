import { filterAllowList, joinThinking, sanitizeToken, sanitizeUsage, sumUsage } from '@src/core'
import { describe, expect, it } from 'vitest'
import { createToolCall, createTokenUsage } from '../../setup.js'

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
