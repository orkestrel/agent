import { describe, expect, it } from 'vitest'
import {
	isFraction,
	isLedgerSnapshot,
	isPositiveSafeInteger,
} from '../../../../src/core/ledgers/validators.js'
import {
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

describe('isPositiveSafeInteger', () => {
	it('accepts positive safe boundaries and refuses other values without coercion', () => {
		for (const value of [1, Number.MAX_SAFE_INTEGER])
			expect(isPositiveSafeInteger(value)).toBe(true)
		for (const value of [
			0,
			-0,
			-1,
			0.5,
			Number.MAX_SAFE_INTEGER + 1,
			NaN,
			Infinity,
			'1',
			null,
			undefined,
			{},
			Symbol('capacity'),
		])
			expect(isPositiveSafeInteger(value)).toBe(false)
	})
})

describe('isLedgerSnapshot', () => {
	it('accepts the snapshot a served ledger returns and its JSON round trip', async () => {
		const replay = await serveLedgerHistory()
		const snapshot = replay.ledger.snapshot()
		expect(isLedgerSnapshot(snapshot)).toBe(true)
		expect(isLedgerSnapshot(JSON.parse(JSON.stringify(snapshot)))).toBe(true)
	})

	it('accepts the seed snapshot with and without its gauge and with unknown members', () => {
		const { conversation, requests, notes, failures } = LEDGER_SNAPSHOT_SEED
		expect(isLedgerSnapshot(LEDGER_SNAPSHOT_SEED)).toBe(true)
		expect(isLedgerSnapshot({ conversation, requests, notes, failures })).toBe(true)
		expect(isLedgerSnapshot({ ...LEDGER_SNAPSHOT_SEED, version: 2 })).toBe(true)
		const free = { ...LEDGER_SNAPSHOT_SEED, gauge: { scale: 2, overhead: 0 } }
		expect(isLedgerSnapshot(free)).toBe(true)
	})

	it('refuses each malformed, mis-marked, or hostile value without throwing', () => {
		const cases = createInvalidLedgerSnapshotCases()
		expect(cases.map(([title, value]) => [title, isLedgerSnapshot(value)])).toEqual(
			cases.map(([title]) => [title, false]),
		)
	})
})
