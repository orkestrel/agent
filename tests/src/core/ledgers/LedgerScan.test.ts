import type { LedgerOwner, Message } from '@src/core'
import { captureError } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import { LedgerScan } from '../../../../src/core/ledgers/LedgerScan.js'
import { buildLedgerMessage, buildLedgerReading } from '../../../setup.js'

describe('LedgerScan', () => {
	const messages: readonly Message[] = [
		buildLedgerMessage('statement', 'user', 'Order LH-81660 is late.'),
		{
			id: 'call',
			role: 'assistant',
			content: '',
			calls: [{ id: 'lookup-1', name: 'lookup_customer', arguments: { account: 'BW-20931' } }],
		},
		{
			id: 'result',
			role: 'tool',
			call: 'lookup-1',
			content: 'Account BW-20931: Brightwater Studio',
		},
		buildLedgerMessage('request', 'user', 'What is late for Brightwater?'),
		buildLedgerMessage('reply', 'assistant', 'Order LH-81660.'),
	]
	const reading = buildLedgerReading(
		'result',
		'lookup_customer',
		{ account: 'BW-20931' },
		'Account BW-20931: Brightwater Studio',
		{ ids: ['BW-20931'], owners: [{ id: 'BW-20931', names: ['Brightwater Studio'] }] },
	)

	it('holds the messages and readings it was built from', () => {
		const readings = [reading]
		const scan = new LedgerScan(messages, readings, new Set(['request']))
		expect(scan.messages).toBe(messages)
		expect(scan.readings).toBe(readings)
		expect(scan.reading('result')).toBe(reading)
		expect(scan.reading('statement')).toBeUndefined()
	})

	it('reads each message position and the first request position', () => {
		const scan = new LedgerScan(messages, [reading], new Set(['request', 'reply']))
		expect(messages.map((message) => scan.position(message.id))).toEqual([0, 1, 2, 3, 4])
		expect(scan.position('missing')).toBeUndefined()
		expect(scan.first).toBe(3)
		expect(new LedgerScan(messages, [reading], new Set()).first).toBeUndefined()
	})

	it('reads the tool group that holds a call or its result', () => {
		const scan = new LedgerScan(messages, [reading], new Set())
		expect(scan.group('call')?.map((message) => message.id)).toEqual(['call', 'result'])
		expect(scan.group('result')).toBe(scan.group('call'))
		expect(scan.group('statement')).toBeUndefined()
	})

	it('builds the registry and its index from the readings', () => {
		const scan = new LedgerScan(messages, [reading], new Set())
		expect([...scan.registry.ids]).toEqual(['BW-20931'])
		expect(Object.fromEntries(scan.registry.owners)).toEqual({
			'BW-20931': ['Brightwater Studio'],
		})
		expect(scan.index.ids).toBe(scan.registry.ids)
		expect(Object.fromEntries(scan.index.aliases)).toEqual({ 'Brightwater Studio': ['BW-20931'] })
	})

	it('refuses a reading whose owner list holds a hole', () => {
		const owners: LedgerOwner[] = []
		owners[1] = { id: 'BW-20931', names: ['Brightwater Studio'] }
		const sparse = buildLedgerReading('result', 'lookup_customer', {}, 'text', {
			ids: ['BW-20931'],
			owners,
		})
		expect(captureError(() => new LedgerScan(messages, [sparse], new Set()))).toBeInstanceOf(
			TypeError,
		)
	})
})
