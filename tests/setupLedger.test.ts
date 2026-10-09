import type { LedgerLine, LedgerProjection } from '../src/core/ledgers/types.js'
import { describe, expect, it } from 'vitest'
import { buildRecords } from '../src/core/ledgers/helpers.js'
import {
	buildLedgerClassification,
	buildLedgerInput,
	buildLedgerMessage,
	buildLedgerReading,
	checkLedgerProjection,
	createLedgerDesk,
	createLedgerRequest,
	LEDGER_DESK_OWNERS,
	LEDGER_HANDLE,
	reverseLedgerInput,
} from './setupLedger.js'

// setupLedger.ts — the proof of the ledger test oracle and its builders. The oracle must pass the clean
// desk build and name each injected fault by its check, so a green oracle in a helper suite means something.

const input = createLedgerDesk()
const clean = buildRecords(input)

function buildLine(source: string, sentence: number, text: string): LedgerLine {
	return { text, source, sentence, topics: [], role: 'user' }
}

function replaceRecord(
	built: LedgerProjection,
	key: string,
	change: (record: LedgerProjection['records'][number]) => LedgerProjection['records'][number],
): LedgerProjection {
	return {
		...built,
		records: built.records.map((record) => (record.key === key ? change(record) : record)),
	}
}

function listFaults(built: LedgerProjection): readonly string[] {
	return checkLedgerProjection(built, input)
}

describe('checkLedgerProjection', () => {
	it('passes the clean desk build', () => {
		expect(clean.records.map((record) => record.key)).toEqual([
			'owner:OM-30418',
			'owner:BW-20931',
			'rules',
		])
		expect(clean.stale).toEqual([{ source: 'user-01', sentence: 1, tokens: ['MX-4471'] }])
		expect(listFaults(clean)).toEqual([])
	})

	it('names a stale line that a record kept', () => {
		const built = replaceRecord(clean, 'rules', (record) => ({
			...record,
			lines: [...record.lines, buildLine('user-01', 1, 'This week code is MX-4471.')],
		}))
		expect(listFaults(built).some((fault) => fault.startsWith('dead rules'))).toBe(true)
	})

	it('names a member that a record misplaced', () => {
		const built = replaceRecord(clean, 'rules', (record) => ({
			...record,
			members: [...record.members, 'user-02'],
		}))
		expect(listFaults(built)).toContain(
			'placement user-02: placed in [owner:OM-30418, rules], expected [owner:OM-30418]',
		)
	})

	it('names a replaced result that a record kept', () => {
		const built = replaceRecord(clean, 'owner:BW-20931', (record) => ({
			...record,
			lines: [
				...record.lines,
				buildLine(
					'tool-01',
					0,
					'Order BW-5512 for account BW-20931 (Brightwater Studio): linen set, total $140.00.',
				),
			],
		}))
		expect(
			listFaults(built).some((fault) => fault.includes('comes from a replaced source tool-01')),
		).toBe(true)
	})

	it('names a handle that a line holds and its source lacks', () => {
		const built = replaceRecord(clean, 'owner:BW-20931', (record) => ({
			...record,
			lines: record.lines.map((one, at) =>
				at === 0 ? { ...one, text: `${one.text} See r8.` } : one,
			),
		}))
		const faults = listFaults(built)
		expect(
			faults.some((fault) => fault.startsWith('handle owner:BW-20931') && fault.includes('r8')),
		).toBe(true)
		expect(faults.some((fault) => fault.startsWith('verbatim'))).toBe(true)
	})

	it('names a line that is no sentence of its source', () => {
		const built = replaceRecord(clean, 'rules', (record) => ({
			...record,
			lines: record.lines.map((one, at) =>
				at === 0 ? { ...one, text: 'Refunds need nothing.' } : one,
			),
		}))
		expect(listFaults(built).some((fault) => fault.startsWith('verbatim rules'))).toBe(true)
	})

	it('names a sentence that is neither a line nor stale', () => {
		const built = replaceRecord(clean, 'rules', (record) => ({
			...record,
			lines: record.lines.slice(1),
		}))
		expect(listFaults(built).some((fault) => fault.startsWith('coverage rules'))).toBe(true)
	})

	it('names a stale list that differs from the amended pairs', () => {
		expect(listFaults({ ...clean, stale: [] }).some((fault) => fault.startsWith('stale:'))).toBe(
			true,
		)
	})

	it('names a build that depends on the order of its collections', () => {
		const built = { ...clean, records: [...clean.records].reverse() }
		expect(listFaults(built).some((fault) => fault.startsWith('order:'))).toBe(true)
	})

	it('passes a superseded correction that keeps its stale effect, and names a build that revives the value', () => {
		const superseded = buildLedgerInput({
			...{ system: input.system, exclude: input.exclude },
			owners: LEDGER_DESK_OWNERS,
			messages: [
				...input.messages,
				buildLedgerMessage('user-07', 'user', 'The code rotates again on Friday.'),
			],
			readings: input.readings,
			entities: Object.fromEntries(input.entities),
			classification: {
				quiet: [...input.classification.quiet],
				categories: Object.fromEntries(input.classification.categories),
				amended: { 'user-01': ['user-04'] },
				superseded: { 'user-04': ['user-07'] },
			},
		})
		const built = buildRecords(superseded)
		expect(built.stale).toEqual([{ source: 'user-01', sentence: 1, tokens: ['MX-4471'] }])
		expect(checkLedgerProjection(built, superseded)).toEqual([])
		expect(
			checkLedgerProjection({ ...built, stale: [] }, superseded).some((fault) =>
				fault.startsWith('stale:'),
			),
		).toBe(true)
	})

	it('names a replaced result that an empty lookup left live', () => {
		const empty = buildLedgerInput({
			system: input.system,
			owners: LEDGER_DESK_OWNERS,
			messages: [
				buildLedgerMessage('tool-a', 'tool', 'Order BW-5512 for account BW-20931: total $10.00.'),
				buildLedgerMessage('tool-b', 'tool', 'No record of order BW-5512.'),
			],
			readings: [
				buildLedgerReading(
					'tool-a',
					'lookup_order',
					{ id: 'BW-5512' },
					'Order BW-5512 for account BW-20931: total $10.00.',
					{ ids: ['BW-5512'], owners: [] },
				),
				buildLedgerReading(
					'tool-b',
					'lookup_order',
					{ id: 'BW-5512' },
					'No record of order BW-5512.',
				),
			],
			entities: { 'tool-a': ['BW-20931'] },
		})
		const faithful = buildRecords(empty)
		expect(faithful.records).toEqual([])
		expect(faithful.loose).toEqual([])
		expect(checkLedgerProjection(faithful, empty)).toEqual([])
		const kept: LedgerProjection = {
			records: [
				{
					key: 'owner:BW-20931',
					title: 'Brightwater Studio (account BW-20931)',
					members: ['tool-a'],
					lines: [
						{
							...buildLine('tool-a', 0, 'Order BW-5512 for account BW-20931: total $10.00.'),
							role: 'tool',
						},
					],
				},
			],
			stale: [],
			loose: [],
		}
		const faults = checkLedgerProjection(kept, empty)
		expect(faults.some((fault) => fault.includes('comes from a replaced source tool-a'))).toBe(true)
		expect(faults.some((fault) => fault.startsWith('placement tool-a'))).toBe(true)
	})
})

describe('ledger builders', () => {
	it('builds empty collections from no parts', () => {
		const empty = buildLedgerInput()
		expect([empty.system, empty.exclude, empty.messages, empty.readings]).toEqual(['', [], [], []])
		expect(empty.owners.size + empty.entities.size).toBe(0)
		const classification = buildLedgerClassification()
		expect(
			classification.quiet.size + classification.categories.size + classification.topics.size,
		).toBe(0)
		expect(classification.amended.size + classification.superseded.size).toBe(0)
	})

	it('builds the desk request from the Brightwater Studio owner', () => {
		expect(createLedgerRequest()).toEqual({
			owners: ['BW-20931'],
			topics: ['refunds'],
		})
		expect(input.owners.get('BW-20931')).toEqual(['Brightwater Studio'])
		expect(input.owners.get('OM-30418')).toEqual(['Odile Marlow'])
	})

	it('reverses every collection of an input and leaves the input as it was', () => {
		const reversed = reverseLedgerInput(input)
		expect([...reversed.owners.keys()]).toEqual(['OM-30418', 'BW-20931'])
		expect([...input.owners.keys()]).toEqual(['BW-20931', 'OM-30418'])
		expect([...reversed.entities.keys()]).toEqual([...input.entities.keys()].reverse())
		expect([...reversed.classification.topics.keys()]).toEqual(['user-03', 'user-01'])
		expect(reversed.exclude).toEqual(input.exclude)
	})

	it('matches a handle and no other token', () => {
		expect('see m12, r8 and [r8]'.match(LEDGER_HANDLE)).toEqual(['m12', 'r8', 'r8'])
		expect('BW-5512 and user-01'.match(LEDGER_HANDLE)).toBeNull()
	})
})
