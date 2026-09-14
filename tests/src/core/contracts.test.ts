import type { Message, ProviderRequest, ProviderResult } from '@src/core'
import {
	isMessage,
	messageContract,
	providerRequestContract,
	providerResultContract,
	relayFrameContract,
} from '@src/core'
import { parseJSONAs } from '@orkestrel/contract'
import { describe, expect, it } from 'vitest'
import { domainArgument, MESSAGE_WIRE_ROLES, RELAY_WIRE_FRAMES } from '../../setup.js'

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
	it('accepts function-valued arguments in the domain and refuses them on the wire', () => {
		const value: Message = {
			id: '1',
			role: 'assistant',
			content: '',
			calls: [{ id: 'call', name: 'lookup', arguments: { invoke: domainArgument } }],
		}
		expect(isMessage(value)).toBe(true)
		expect(messageContract.is(value)).toBe(false)
		expect(messageContract.explain(value)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: ['calls', '0', 'arguments', 'invoke'] }),
			]),
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
})
