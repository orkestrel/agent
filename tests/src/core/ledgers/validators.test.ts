import { describe, expect, it } from 'vitest'
import {
	isFraction,
	isLedgerQuestion,
	isLedgerSnapshot,
} from '../../../../src/core/ledgers/validators.js'
import { createLedger, isLedgerError, LEDGER_QUESTIONS, ledgerSnapshotContract } from '@src/core'
import { captureError } from '@orkestrel/test'
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
		const free = {
			...LEDGER_SNAPSHOT_SEED,
			gauge: { scale: 2, overhead: 0 },
		}
		expect(isLedgerSnapshot(free)).toBe(true)
	})

	it('refuses each malformed, mis-marked, or hostile value without throwing', () => {
		const cases = createInvalidLedgerSnapshotCases()
		expect(cases.map(([title, value]) => [title, isLedgerSnapshot(value)])).toEqual(
			cases.map(([title]) => [title, false]),
		)
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
