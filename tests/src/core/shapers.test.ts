import type { Infer } from '@orkestrel/contract'
import type { ToolCall, ToolContext } from '@orkestrel/tool'
import type { Message } from '@src/core'
import { messageShape, toolCallShape } from '@src/core'
import { createContract } from '@orkestrel/contract'
import { describe, expect, expectTypeOf, it } from 'vitest'

describe('wire shapes', () => {
	it('infers a message wire projection assignable to its domain', () => {
		expectTypeOf<Infer<typeof messageShape>>().toExtend<Message>()
		expect(createContract(messageShape).is({ id: '1', role: 'user', content: '' })).toBe(true)
	})
	it('declares the optional string call on the message wire projection', () => {
		expectTypeOf<Infer<typeof messageShape>['call']>().toEqualTypeOf<string | undefined>()
		const contract = createContract(messageShape)
		const answer = { id: 't1', role: 'tool', content: 'sunny', call: 'call-weather' }
		expect(contract.is(answer)).toBe(true)
		expect(contract.parse(answer)).toEqual(answer)
		expect(contract.is({ id: 't1', role: 'tool', content: 'sunny' })).toBe(true)
		expect(contract.is({ id: 't1', role: 'tool', content: 'sunny', call: 7 })).toBe(false)
	})
	it('keeps execution context separate from the tool call and wire shape', () => {
		expectTypeOf<keyof ToolCall>().toEqualTypeOf<'id' | 'name' | 'arguments'>()
		expectTypeOf<ToolContext['signal']>().toEqualTypeOf<AbortSignal>()
		const contract = createContract(toolCallShape)
		const call = { id: '1', name: 'lookup', arguments: {}, context: { caller: 'private context' } }
		expect(contract.is(call)).toBe(false)
		expect(contract.parse(call)).toEqual({ id: '1', name: 'lookup', arguments: {} })
	})
})
