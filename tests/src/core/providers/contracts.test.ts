import type { ProviderRequest, ProviderResult } from '@src/core'
import {
	isMessage,
	providerRequestContract,
	providerResultContract,
	relayFrameContract,
} from '@src/core'
import { parseJSONAs } from '@orkestrel/contract'
import { describe, expect, it } from 'vitest'
import { domainArgument, RELAY_WIRE_FRAMES } from '../../../setup.js'

describe('wire contracts', () => {
	it('round-trips a request and reports the malformed message path', () => {
		const value: ProviderRequest = {
			messages: [{ id: '1', role: 'user', content: 'hi' }],
			tools: [{ name: 'lookup', description: 'Find a value', parameters: { properties: {} } }],
			options: { think: true, schema: { type: 'object' } },
		}
		expect(providerRequestContract.is(value)).toBe(true)
		expect(value.messages.every(isMessage)).toBe(true)
		expect(parseJSONAs(JSON.stringify(value), providerRequestContract.is)).toEqual(value)
		expect(
			providerRequestContract.explain({ messages: [{ id: '1', role: 'other', content: '' }] }),
		).toEqual(
			expect.arrayContaining([expect.objectContaining({ path: ['messages', '0', 'role'] })]),
		)
	})
	it('round-trips a result and reports the malformed usage path', () => {
		const value: ProviderResult = {
			content: 'answer',
			thinking: 'reason',
			tools: [{ id: '1', name: 'lookup', arguments: {} }],
			usage: { prompt: 3, completion: 2, total: 5 },
		}
		expect(providerResultContract.is(value)).toBe(true)
		expect(parseJSONAs(JSON.stringify(value), providerResultContract.is)).toEqual(value)
		expect(
			providerResultContract.explain({
				content: '',
				usage: { prompt: {}, completion: 2, total: 5 },
			}),
		).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['usage', 'prompt'] })]))
	})
	it('round-trips every relay channel and reports a malformed terminal field', () => {
		for (const frame of RELAY_WIRE_FRAMES) {
			expect(relayFrameContract.is(frame)).toBe(true)
			expect(parseJSONAs(JSON.stringify(frame), relayFrameContract.is)).toEqual(frame)
		}
		expect(relayFrameContract.explain({ channel: 'result', result: { content: {} } })).toEqual(
			expect.arrayContaining([expect.objectContaining({ path: ['result', 'content'] })]),
		)
	})
	it('refuses non-JSON parameters and schemas before serialization can drop them', () => {
		expect(
			providerRequestContract.is({
				messages: [],
				tools: [{ name: 'lookup', parameters: { invoke: domainArgument } }],
			}),
		).toBe(false)
		expect(
			providerRequestContract.is({ messages: [], options: { schema: { invoke: domainArgument } } }),
		).toBe(false)
	})
})
