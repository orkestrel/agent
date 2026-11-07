import { describe, expect, it } from 'vitest'
import {
	isFraction,
	isLedgerQuestion,
	isLedgerSnapshot,
	isLedgerWindowSnapshot,
} from '../../../../src/core/ledgers/validators.js'
import {
	createLedger,
	isLedgerError,
	LEDGER_QUESTIONS,
	ledgerSnapshotContract,
	ledgerWindowContract,
} from '@src/core'
import { captureError, requireValue } from '@orkestrel/test'
import {
	buildLedgerOptions,
	createScriptedProvider,
	LEDGER_SNAPSHOT_SEED,
	createInvalidLedgerSnapshotCases,
	serveLedgerHistory,
} from '../../../setup.js'

describe('isFraction', () => {
	it('accepts its finite positive interval and refuses off-shape values', () => {
		for (const value of [Number.MIN_VALUE, 0.5, 1]) expect(isFraction(value)).toBe(true)
		for (const value of [
			0,
			-0,
			-1,
			1.01,
			NaN,
			Infinity,
			-Infinity,
			'1',
			null,
			undefined,
			{},
			Symbol('fraction'),
		])
			expect(isFraction(value)).toBe(false)
	})
})

describe('isLedgerSnapshot', () => {
	it('refuses malformed window entries with audit faults', async () => {
		const replay = await serveLedgerHistory()
		const snapshot = replay.ledger.snapshot()
		const window = requireValue(snapshot.window)
		const exchange = requireValue(window.exchanges[0])
		for (const [field, replacement] of [
			[
				'lines',
				{
					...exchange,
					lines: [{ key: 'rules', title: 'Rules', source: exchange.request, sentence: -1 }],
				},
			],
			['copy', { ...exchange, copy: 5 }],
			['extra', { ...exchange, extra: true }],
		] as const) {
			const value = { ...snapshot, window: { ...window, exchanges: [replacement] } }
			expect(isLedgerSnapshot(value)).toBe(false)
			const error = captureError(() =>
				createLedger(createScriptedProvider([]), {
					...buildLedgerOptions(),
					snapshot: Reflect.apply(Object, undefined, [value]),
				}),
			)
			expect(isLedgerError(error) && error.code).toBe('SNAPSHOT')
			expect(isLedgerError(error) && error.context?.faults).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						path: expect.arrayContaining(['window', 'exchanges', '0', field]),
					}),
				]),
			)
		}
	})
	it('admits shaped dangling references and changed receipts but discards their window', async () => {
		const replay = await serveLedgerHistory()
		const snapshot = replay.ledger.snapshot()
		const window = requireValue(snapshot.window)
		const exchange = requireValue(window.exchanges[0])
		const line = requireValue(exchange.lines[0])
		for (const replacement of [
			{ ...exchange, request: 'absent' },
			{ ...exchange, reply: 'absent' },
			{ ...exchange, lines: [{ ...line, source: 'absent' }] },
			{ ...exchange, lines: [{ ...line, sentence: 99999 }] },
			{ ...exchange, lines: [{ ...line, title: 'Changed title' }] },
		]) {
			const changed = { ...snapshot, window: { ...window, exchanges: [replacement] } }
			expect(isLedgerSnapshot(changed)).toBe(true)
			const ledger = createLedger(
				createScriptedProvider([]),
				buildLedgerOptions({ snapshot: changed }),
			)
			expect(ledger.snapshot().window).toBeUndefined()
		}
	})

	it('accepts the snapshot a served ledger returns and its JSON round trip', async () => {
		const replay = await serveLedgerHistory()
		const snapshot = replay.ledger.snapshot()
		expect(isLedgerSnapshot(snapshot)).toBe(true)
		expect(isLedgerSnapshot(JSON.parse(JSON.stringify(snapshot)))).toBe(true)
	})

	it('accepts the seed snapshot with and without its gauge, and refuses an unknown member', () => {
		const { conversation, requests, notes, failures } = LEDGER_SNAPSHOT_SEED
		expect(isLedgerSnapshot(LEDGER_SNAPSHOT_SEED)).toBe(true)
		expect(isLedgerSnapshot({ conversation, requests, notes, failures })).toBe(true)
		expect(isLedgerSnapshot({ ...LEDGER_SNAPSHOT_SEED, version: 2 })).toBe(false)
		const free = { ...LEDGER_SNAPSHOT_SEED, gauge: { scale: 2, overhead: 0 } }
		expect(isLedgerSnapshot(free)).toBe(true)
	})

	it('reads a dangling request as the guard refusing what its shape cannot state', () => {
		const dangling = { ...LEDGER_SNAPSHOT_SEED, requests: ['absent'] }
		expect(ledgerSnapshotContract.is(dangling)).toBe(true)
		expect(isLedgerSnapshot(dangling)).toBe(false)
	})

	it('refuses each malformed, mis-marked, or hostile value without throwing', () => {
		const cases = createInvalidLedgerSnapshotCases()
		expect(cases.map(([title, value]) => [title, isLedgerSnapshot(value)])).toEqual(
			cases.map(([title]) => [title, false]),
		)
	})
})

describe('isLedgerWindowSnapshot', () => {
	it('admits the exact window shape and agrees with its compiled contract on adjacent refusals', () => {
		const entry = {
			request: 'request',
			reply: 'reply',
			lines: [
				{ key: 'owner:BW-20931', title: 'Brightwater Studio', source: 'source', sentence: 0 },
			],
		}
		const window = {
			digest: 'fixture',
			exchanges: [entry],
			amendments: [{ earlier: 'source', later: 'correction' }],
		}
		for (const value of [
			window,
			{ ...window, exchanges: [{ ...entry, copy: 'Records and request.' }] },
		]) {
			expect(isLedgerWindowSnapshot(value)).toBe(true)
			expect(ledgerWindowContract.is(value)).toBe(true)
		}
		for (const value of [
			null,
			undefined,
			{},
			[],
			{ ...window, extra: true },
			{ ...window, exchanges: [] },
			{ ...window, exchanges: Array(1) },
			{ ...window, exchanges: [undefined] },
			{ ...window, exchanges: [{ ...entry, request: 1 }] },
			{ ...window, exchanges: [{ ...entry, reply: null }] },
			{ ...window, exchanges: [{ ...entry, copy: undefined }] },
			{ ...window, exchanges: [{ ...entry, copy: 1 }] },
			{ ...window, exchanges: [{ ...entry, extra: true }] },
			{ ...window, exchanges: [{ ...entry, lines: Array(1) }] },
			{
				...window,
				exchanges: [{ ...entry, lines: [{ key: '', title: '', source: 'source', sentence: -1 }] }],
			},
			{
				...window,
				exchanges: [{ ...entry, lines: [{ key: '', title: '', source: 'source', sentence: 0.5 }] }],
			},
			{
				...window,
				exchanges: [
					{
						...entry,
						lines: [
							{ key: '', title: '', source: 'source', sentence: Number.MAX_SAFE_INTEGER + 1 },
						],
					},
				],
			},
			{
				...window,
				exchanges: [
					{ ...entry, lines: [{ key: '', title: '', source: 'source', sentence: 0, extra: true }] },
				],
			},
			{ ...window, amendments: Array(1) },
			{ ...window, amendments: [{ earlier: 'source', later: 1 }] },
			{ ...window, amendments: [{ earlier: 'source', later: 'correction', extra: true }] },
		]) {
			expect(isLedgerWindowSnapshot(value)).toBe(false)
			expect(ledgerWindowContract.is(value)).toBe(false)
		}
	})

	it('refuses unreadable window members without throwing', () => {
		const proxy = Proxy.revocable({}, {})
		proxy.revoke()
		expect(isLedgerWindowSnapshot(proxy.proxy)).toBe(false)
		expect(
			isLedgerWindowSnapshot({
				get exchanges() {
					throw new Error('unreadable')
				},
				amendments: [],
			}),
		).toBe(false)
	})
})

describe('isLedgerQuestion', () => {
	it('accepts the measured wording', () => {
		expect(isLedgerQuestion(LEDGER_QUESTIONS)).toBe(true)
	})

	it.each([
		[{}],
		[{ ...LEDGER_QUESTIONS, topic: '  ' }],
		[{ ...LEDGER_QUESTIONS, category: { form: 'noul' } }],
		[
			{
				...LEDGER_QUESTIONS,
				amends: { form: 'choice', criteria: { a: null, b: null } },
			},
		],
		[
			{
				...LEDGER_QUESTIONS,
				category: {
					form: 'choice',
					criteria: { fact: 'A fact', rule: 'A rule' },
				},
			},
		],
	])('refuses %j', (value) => {
		expect(isLedgerQuestion(value)).toBe(false)
	})
})

describe('isLedgerSnapshot is exact, in lockstep with its shape', () => {
	const conversation = { id: 'c1', sections: [], messages: [] }

	it('holds both ways on an owned snapshot', () => {
		const snapshot = {
			conversation,
			requests: [],
			notes: [],
			failures: [],
			gauge: { scale: 1, overhead: 0 },
		}
		expect(isLedgerSnapshot(snapshot)).toBe(true)
		expect(ledgerSnapshotContract.is(snapshot)).toBe(true)
	})

	it.each([
		['an unknown key', { conversation, requests: [], notes: [], failures: [], extra: 1 }],
		[
			'an own undefined gauge',
			{
				conversation,
				requests: [],
				notes: [],
				failures: [],
				gauge: undefined,
			},
		],
		[
			'an unknown gauge key',
			{
				conversation,
				requests: [],
				notes: [],
				failures: [],
				gauge: { scale: 1, overhead: 0, at: 1 },
			},
		],
	])('refuses %s', (_title, snapshot) => {
		expect(isLedgerSnapshot(snapshot)).toBe(false)
		expect(ledgerSnapshotContract.is(snapshot)).toBe(false)
	})

	it('names the extra key in the faults of a refused hydrate', () => {
		const error = captureError(() =>
			createLedger(createScriptedProvider([]), {
				...buildLedgerOptions(),
				snapshot: Reflect.apply(Object, undefined, [
					{
						conversation,
						requests: [],
						notes: [],
						failures: [],
						extra: 1,
					},
				]),
			}),
		)
		expect(isLedgerError(error) && error.context?.faults).toEqual([
			{ reason: 'extra', path: ['extra'] },
		])
	})
})
