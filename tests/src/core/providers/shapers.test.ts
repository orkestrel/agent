import type { Infer } from '@orkestrel/contract'
import type { ProviderRequest, ProviderResult, RelayFrame } from '@src/core'
import { providerRequestShape, providerResultShape, relayFrameShape } from '@src/core'
import { createContract } from '@orkestrel/contract'
import { describe, expect, expectTypeOf, it } from 'vitest'

describe('wire shapes', () => {
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
})
