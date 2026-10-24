import { parseJSON, isRecord } from '@orkestrel/contract'
import { expect, it } from 'vitest'
import {
	runMemoryRecording,
	buildMemoryRecentGoals,
	buildMemoryPinTrial,
	runMemoryTrial,
	readMemoryEvents,
} from '../../setupStudy.js'

it('R1 changes closure agent messages at ordinal 14 and replays omitted, false, and empty groups fully', async () => {
	const result = await runMemoryRecording({
		arm: 'records',
		goals: buildMemoryRecentGoals(),
		treatments: {
			omitted: {},
			disabled: { ledger: { recent: false } },
			empty: { ledger: {} },
			enabled: { ledger: { recent: true } },
		},
	})
	expect(result.replayed).toBe(0)
	for (const reading of result.readings.filter(({ name }) => name !== 'enabled')) {
		expect(reading.command.code).toBe(0)
		expect(reading.status).toBe('sealed')
		expect(reading.differential).toEqual({
			complete: true,
			divergence: undefined,
			change: undefined,
			selection: undefined,
		})
	}
	const enabled = result.readings.find(({ name }) => name === 'enabled')
	expect(enabled?.command.code).not.toBe(0)
	expect(enabled?.differential.divergence).toMatchObject({
		ordinal: 14,
		expected: { goal: 'closure', role: 'agent' },
	})
	expect(enabled?.differential.change).toMatchObject({ member: 'messages' })
	const actual = parseJSON(
		Buffer.from(enabled?.differential.divergence?.actual?.body ?? '', 'base64').toString('utf8'),
	)
	expect(isRecord(actual) ? actual.messages : undefined).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ role: 'user', content: 'Acknowledge the desk.' }),
			expect.objectContaining({ role: 'assistant', content: 'Receipt retained.' }),
		]),
	)
}, 480000)

it('R1 replays the first goal fully when there is no completed earlier exchange', async () => {
	const result = await runMemoryRecording({
		arm: 'records',
		goals: buildMemoryRecentGoals().slice(0, 1),
		treatments: { enabled: { ledger: { recent: true } } },
	})
	expect(result.readings[0]?.command.code).toBe(0)
	expect(result.readings[0]?.differential).toEqual({
		complete: true,
		divergence: undefined,
		change: undefined,
		selection: undefined,
	})
	expect(result.replayed).toBe(0)
}, 180000)

it('R1 holds only the declared standing arrivals after whole recent replies exceed the tail allowance', async () => {
	const result = await runMemoryTrial(buildMemoryPinTrial())
	expect(result.failure).toBeUndefined()
	const request = result.requests.filter(({ path }) => path === '/api/chat').at(-1)
	const body = parseJSON(request?.body ?? '')
	if (!isRecord(body) || !Array.isArray(body.messages)) throw new Error('Missing agent messages')
	const users = body.messages.filter((message) => isRecord(message) && message.role === 'user')
	for (const source of ['endurance-desk', 'ev-opening', 'ev-register']) {
		expect(users).toContainEqual(
			expect.objectContaining({ content: `[Source ${source}] Keep policy ${source}.` }),
		)
	}
	expect(users).not.toContainEqual(
		expect.objectContaining({ content: '[Source day] The opening day is Monday.' }),
	)
	expect(users).not.toContainEqual(
		expect.objectContaining({ content: '[Source ev-source-1-1] The opening case is dormant.' }),
	)
	expect(readMemoryEvents(result.evidence, 'selection').length).toBeGreaterThan(0)
})
