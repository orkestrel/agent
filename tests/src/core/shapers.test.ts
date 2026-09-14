import type { Infer } from '@orkestrel/contract'
import type { Message, ProviderRequest, ProviderResult, RelayFrame } from '@src/core'
import {
	messageShape,
	providerRequestShape,
	providerResultShape,
	relayFrameShape,
	toolCallShape,
} from '@src/core'
import { createContract } from '@orkestrel/contract'
import { describe, expect, expectTypeOf, it } from 'vitest'

describe('wire shapes', () => {
	it('infers a message wire projection assignable to its domain', () => {
		expectTypeOf<Infer<typeof messageShape>>().toExtend<Message>()
		expect(createContract(messageShape).is({ id: '1', role: 'user', content: '' })).toBe(true)
	})
	it('infers a request wire projection assignable to its domain', () => {
		expectTypeOf<Infer<typeof providerRequestShape>>().toExtend<ProviderRequest>()
		expect(createContract(providerRequestShape).is({ messages: [] })).toBe(true)
	})
	it('infers a result wire projection assignable to its domain', () => {
		expectTypeOf<Infer<typeof providerResultShape>>().toExtend<ProviderResult>()
		expect(createContract(providerResultShape).is({ content: '' })).toBe(true)
	})
	it('infers a relay wire projection assignable to its domain', () => {
		expectTypeOf<Infer<typeof relayFrameShape>>().toExtend<RelayFrame>()
		expect(createContract(relayFrameShape).is({ channel: 'content', text: '' })).toBe(true)
	})
	it('excludes opaque caller context from the tool wire shape', () => {
		const contract = createContract(toolCallShape)
		const call = { id: '1', name: 'lookup', arguments: {}, caller: 'private context' }
		expect(contract.is(call)).toBe(false)
		expect(contract.parse(call)).toEqual({ id: '1', name: 'lookup', arguments: {} })
	})
})
