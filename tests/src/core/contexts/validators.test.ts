import { createMemoManager, isMemo, isMemoSnapshot } from '@src/core'
import { createRecorder, roundTripJSON } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'

// The memo guards are total: a malformed member, a non-record, a sparse list, a throwing getter,
// and a revoked proxy each return false, and nothing throws.

describe('isMemo', () => {
	it('accepts a revision with and without an origin', () => {
		const memo = { id: 'r1', name: 'tone', description: 'Short replies.', content: 'v1', time: 0 }

		expect(isMemo(memo)).toBe(true)
		expect(isMemo({ ...memo, origin: { conversation: 'c1' } })).toBe(true)
		expect(isMemo({ ...memo, origin: { conversation: 'c1', message: 'm4' } })).toBe(true)
		expect(isMemo({ ...memo, extra: 'kept open' })).toBe(true)
	})

	it('accepts every revision a manager mints, through a JSON round trip', () => {
		const memos = createMemoManager()
		const memo = memos.add({
			name: 'tone',
			description: 'Short replies.',
			content: 'v1',
			origin: { conversation: 'c1', message: 'm4' },
		})

		expect(isMemo(memo)).toBe(true)
		expect(isMemo(roundTripJSON(memo))).toBe(true)
	})

	it('rejects each malformed member', () => {
		const memo = { id: 'r1', name: 'tone', description: 'Short replies.', content: 'v1', time: 0 }

		expect(isMemo({ ...memo, id: 1 })).toBe(false)
		expect(isMemo({ ...memo, name: undefined })).toBe(false)
		expect(isMemo({ ...memo, description: null })).toBe(false)
		expect(isMemo({ ...memo, content: ['v1'] })).toBe(false)
		expect(isMemo({ ...memo, time: '0' })).toBe(false)
		expect(isMemo({ id: 'r1', name: 'tone', description: 'Short replies.', content: 'v1' })).toBe(
			false,
		)
	})

	it('rejects a non-finite time', () => {
		const memo = { id: 'r1', name: 'tone', description: 'Short replies.', content: 'v1' }

		expect(isMemo({ ...memo, time: Number.NaN })).toBe(false)
		expect(isMemo({ ...memo, time: Number.POSITIVE_INFINITY })).toBe(false)
		expect(isMemo({ ...memo, time: Number.NEGATIVE_INFINITY })).toBe(false)
		expect(isMemo({ ...memo, time: -0 })).toBe(true)
	})

	it('rejects a malformed origin', () => {
		const memo = { id: 'r1', name: 'tone', description: 'Short replies.', content: 'v1', time: 0 }

		expect(isMemo({ ...memo, origin: 'c1' })).toBe(false)
		expect(isMemo({ ...memo, origin: null })).toBe(false)
		expect(isMemo({ ...memo, origin: ['c1'] })).toBe(false)
		expect(isMemo({ ...memo, origin: {} })).toBe(false)
		expect(isMemo({ ...memo, origin: { conversation: 1 } })).toBe(false)
		expect(isMemo({ ...memo, origin: { conversation: 'c1', message: 4 } })).toBe(false)
	})

	it('rejects a non-record', () => {
		expect(isMemo(undefined)).toBe(false)
		expect(isMemo(null)).toBe(false)
		expect(isMemo('tone')).toBe(false)
		expect(isMemo(0)).toBe(false)
		expect(isMemo([])).toBe(false)
	})

	it('returns false for a throwing getter and a revoked proxy without throwing', () => {
		const reads = createRecorder<readonly [string]>()
		const revoked = Proxy.revocable({}, {})
		revoked.revoke()

		expect(
			isMemo({
				id: 'r1',
				name: 'tone',
				description: 'Short replies.',
				get content(): never {
					reads.handler('content')
					throw new Error('unreadable')
				},
				time: 0,
			}),
		).toBe(false)
		expect(reads.calls).toEqual([['content']])
		expect(isMemo(revoked.proxy)).toBe(false)
	})

	it('refuses a function with memo members', () => {
		// A function's own `name` is read-only, so it is defined rather than assigned.
		const named = Object.defineProperty(() => undefined, 'name', { value: 'tone' })
		const revision = Object.assign(named, {
			id: 'r1',
			description: 'Short replies.',
			content: 'v1',
			time: 0,
		})

		expect(isMemo(revision)).toBe(false)
	})
})

describe('isMemoSnapshot', () => {
	it('accepts an empty set and every snapshot a manager returns, through a JSON round trip', () => {
		const memos = createMemoManager({ id: 'ada' })
		memos.add([
			{ name: 'tone', description: 'Short replies.', content: 'v1' },
			{ name: 'tone', description: 'Short replies.', content: 'v2' },
		])

		expect(isMemoSnapshot({ id: 'ada', memos: [] })).toBe(true)
		expect(isMemoSnapshot(memos.snapshot())).toBe(true)
		expect(isMemoSnapshot(roundTripJSON(memos.snapshot()))).toBe(true)
	})

	it('rejects a missing or malformed id or memos list', () => {
		const memo = { id: 'r1', name: 'tone', description: 'Short replies.', content: 'v1', time: 0 }

		expect(isMemoSnapshot({ memos: [] })).toBe(false)
		expect(isMemoSnapshot({ id: 1, memos: [] })).toBe(false)
		expect(isMemoSnapshot({ id: 'ada' })).toBe(false)
		expect(isMemoSnapshot({ id: 'ada', memos: memo })).toBe(false)
		expect(isMemoSnapshot({ id: 'ada', memos: [memo, { ...memo, time: Number.NaN }] })).toBe(false)
	})

	it('rejects a sparse memos array', () => {
		const sparse: unknown[] = []
		sparse.length = 1

		expect(isMemoSnapshot({ id: 'ada', memos: sparse })).toBe(false)
	})

	it('rejects a non-record', () => {
		expect(isMemoSnapshot(undefined)).toBe(false)
		expect(isMemoSnapshot(null)).toBe(false)
		expect(isMemoSnapshot('ada')).toBe(false)
		expect(isMemoSnapshot([])).toBe(false)
	})

	it('returns false for a throwing getter and a revoked proxy without throwing', () => {
		const reads = createRecorder<readonly [string]>()
		const revoked = Proxy.revocable({}, {})
		revoked.revoke()

		expect(
			isMemoSnapshot({
				id: 'ada',
				get memos(): never {
					reads.handler('memos')
					throw new Error('unreadable')
				},
			}),
		).toBe(false)
		expect(reads.calls).toEqual([['memos']])
		expect(isMemoSnapshot(revoked.proxy)).toBe(false)
	})
})
