import { MEMO_SNAPSHOT_FIXTURES, MEMO_SNAPSHOT_REFUSALS } from '../../../setup.js'
import { memoSnapshotContract } from '@src/core'
import {
	createMemoManager,
	createScope,
	isMemo,
	isMemoOrigin,
	isMemoSnapshot,
	isScope,
} from '@src/core'
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
		expect(isMemo({ ...memo, extra: 'refused' })).toBe(false)
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

describe('isMemoOrigin', () => {
	it('accepts a conversation with and without its message', () => {
		expect(isMemoOrigin({ conversation: 'c1' })).toBe(true)
		expect(isMemoOrigin({ conversation: 'c1', message: 'm1' })).toBe(true)
	})

	it.each([
		[null],
		[{}],
		[{ conversation: 1 }],
		[{ conversation: 'c1', message: 1 }],
		[{ conversation: 'c1', message: undefined }],
		[{ conversation: 'c1', extra: true }],
	])('refuses origin %#', (value) => {
		expect(isMemoOrigin(value)).toBe(false)
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

describe('the memo guards, in lockstep with their shapes', () => {
	it.each(MEMO_SNAPSHOT_FIXTURES)('holds both ways on the owned snapshot %#', (snapshot) => {
		expect(isMemoSnapshot(snapshot)).toBe(true)
		expect(memoSnapshotContract.is(snapshot)).toBe(true)
	})

	it.each(MEMO_SNAPSHOT_REFUSALS)('holds is ⟹ guard on the value %#', (value) => {
		expect(isMemoSnapshot(value)).toBe(false)
		expect(memoSnapshotContract.is(value)).toBe(false)
	})
})

describe('isScope', () => {
	it('admits a minted scope, a narrowed one, and a host implementation with unknown members', () => {
		const scope = createScope({
			name: 'reader',
			tools: ['search'],
			select: async (conversation) => ({ messages: conversation.view(), judgments: [] }),
		})
		expect(isScope(scope)).toBe(true)
		expect(isScope(scope.narrow({ files: [] }))).toBe(true)
		expect(
			isScope({
				id: 's1',
				name: 'host',
				instructions: ['tone'],
				skills: [],
				memos: undefined,
				files: ['a.md'],
				label: 'unknown members pass',
				narrow: () => scope,
			}),
		).toBe(true)
		expect(isScope(new Proxy(scope, {}))).toBe(true)
	})

	it('refuses a value missing a required member or holding one of another type', () => {
		const narrow: unknown = Reflect.get(createScope({ name: 'host' }), 'narrow')
		const base = { id: 's1', name: 'host', narrow }
		const sparse: string[] = []
		sparse[1] = 'a.md'
		expect(isScope(base)).toBe(true)
		for (const value of [
			{ ...base, id: 1 },
			{ name: 'host', narrow },
			{ ...base, name: undefined },
			{ ...base, narrow: undefined },
			{ ...base, narrow: 'narrow' },
			{ ...base, tools: 'read' },
			{ ...base, tools: ['read', 1] },
			{ ...base, files: sparse },
			{ ...base, instructions: null },
			{ ...base, skills: {} },
			{ ...base, memos: [true] },
			{ ...base, select: 'select' },
			undefined,
			null,
			'scope',
			7,
		]) {
			expect(isScope(value)).toBe(false)
		}
	})

	it('returns false for a throwing getter and a revoked proxy without throwing', () => {
		const revoked = Proxy.revocable({}, {})
		revoked.revoke()
		expect(
			isScope({
				id: 's1',
				name: 'host',
				get tools(): never {
					throw new Error('unreadable')
				},
				narrow: () => createScope({ name: 'host' }),
			}),
		).toBe(false)
		expect(isScope(revoked.proxy)).toBe(false)
	})

	it('reads each member one time', () => {
		const reads = createRecorder<readonly [member: string | symbol]>()
		const scope = createScope({ name: 'reader', instructions: [], tools: ['search'] })
		const counted = new Proxy(scope, {
			get(target, key, receiver) {
				reads.handler(key)
				return Reflect.get(target, key, receiver)
			},
		})
		expect(isScope(counted)).toBe(true)
		const keys = reads.calls.map(([key]) => key)
		expect(new Set(keys).size).toBe(keys.length)
		expect(keys).toEqual(
			expect.arrayContaining([
				'id',
				'name',
				'instructions',
				'skills',
				'memos',
				'tools',
				'files',
				'select',
				'narrow',
			]),
		)
	})
})
