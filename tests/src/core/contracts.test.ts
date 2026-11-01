import type { Message } from '@src/core'
import { isMessage, messageContract } from '@src/core'
import { parseJSONAs, seededRandom } from '@orkestrel/contract'
import { describe, expect, it } from 'vitest'
import { returnDomain, MESSAGE_GUARD_CASES, MESSAGE_WIRE_ROLES } from '../../setup.js'

describe('wire contracts', () => {
	it('round-trips a message and reports the malformed image path', () => {
		const value: Message = {
			id: '1',
			role: 'assistant',
			content: '',
			images: ['encoded'],
			calls: [{ id: 'call', name: 'lookup', arguments: { query: ['text', 3, null, true] } }],
		}
		expect(messageContract.is(value)).toBe(true)
		expect(isMessage(value)).toBe(true)
		expect(parseJSONAs(JSON.stringify(value), messageContract.is)).toEqual(value)
		expect(messageContract.explain({ ...value, images: [{}] })).toEqual(
			expect.arrayContaining([expect.objectContaining({ path: ['images', '0'] })]),
		)
	})
	it('accepts function-valued arguments in the domain and refuses them on the wire', () => {
		const value: Message = {
			id: '1',
			role: 'assistant',
			content: '',
			calls: [{ id: 'call', name: 'lookup', arguments: { invoke: returnDomain } }],
		}
		expect(isMessage(value)).toBe(true)
		expect(messageContract.is(value)).toBe(false)
		expect(messageContract.explain(value)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: ['calls', '0', 'arguments', 'invoke'] }),
			]),
		)
	})
	it('keeps every accepted message fixture inside the domain guard', () => {
		for (const role of MESSAGE_WIRE_ROLES) {
			const value = { id: '1', role, content: '', images: [], calls: [] }
			expect(messageContract.is(value)).toBe(true)
			expect(isMessage(value)).toBe(true)
		}
		const value = messageContract.generate()
		expect(messageContract.is(value)).toBe(true)
		expect(isMessage(value)).toBe(true)
	})
	it('agrees with messageContract on each case', () => {
		const verdicts = MESSAGE_GUARD_CASES.map((row) => [
			row.label,
			isMessage(row.value),
			messageContract.is(row.value),
		])
		expect(verdicts).toEqual(MESSAGE_GUARD_CASES.map((row) => [row.label, row.domain, row.wire]))
		for (const { value } of MESSAGE_GUARD_CASES.filter((row) => row.wire)) {
			const parsed = messageContract.parse(value)
			expect(parsed).toEqual(value)
			expect(isMessage(parsed)).toBe(true)
		}
	})
	it('keeps seeded wire messages in the domain', () => {
		const seeds = Array.from({ length: 32 }, (_, index) => index + 1)
		for (const seed of seeds) {
			const value = messageContract.generate(seededRandom(seed))
			expect(messageContract.is(value)).toBe(true)
			expect(isMessage(value)).toBe(true)
		}
	})
})
