import type { Infer } from '@orkestrel/contract'
import type { ToolCall, ToolContext } from '@orkestrel/tool'
import type { TokenUsage } from '@orkestrel/budget'
import type { Message } from '@src/core'
import { messageShape, providerResultShape, tokenUsageShape, toolCallShape } from '@src/core'
import {
	arrayShape,
	booleanShape,
	createContract,
	numberShape,
	objectShape,
	optionalShape,
	stringShape,
} from '@orkestrel/contract'
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
	it('round-trips the optional string thinking on the message wire projection', () => {
		expectTypeOf<Infer<typeof messageShape>['thinking']>().toEqualTypeOf<string | undefined>()
		const contract = createContract(messageShape)
		const answer = { id: 'a1', role: 'assistant', content: 'Booked', thinking: 'Compare fares' }
		expect(contract.is(answer)).toBe(true)
		expect(contract.parse(answer)).toEqual(answer)
		expect(contract.is({ id: 'a1', role: 'assistant', content: 'Booked' })).toBe(true)
		expect(contract.is({ ...answer, thinking: 3 })).toBe(false)
	})
	it('keeps execution context separate from the tool call and wire shape', () => {
		expectTypeOf<keyof ToolCall>().toEqualTypeOf<'id' | 'name' | 'arguments'>()
		expectTypeOf<ToolContext['signal']>().toEqualTypeOf<AbortSignal>()
		const contract = createContract(toolCallShape)
		const call = { id: '1', name: 'lookup', arguments: {}, context: { caller: 'private context' } }
		expect(contract.is(call)).toBe(false)
		expect(contract.parse(call)).toEqual({ id: '1', name: 'lookup', arguments: {} })
	})
	it('infers a token usage wire projection and leaves the provider result schema unchanged', () => {
		expectTypeOf<Infer<typeof tokenUsageShape>>().toExtend<TokenUsage>()
		expectTypeOf<TokenUsage>().toExtend<Infer<typeof tokenUsageShape>>()
		const contract = createContract(tokenUsageShape)
		expect(contract.is({ prompt: 3, completion: 2, total: 5 })).toBe(true)
		expect(contract.is({ prompt: 3, completion: 2, total: 5, cached: 1 })).toBe(false)
		const inline = objectShape({
			content: stringShape(),
			thinking: optionalShape(stringShape()),
			tools: optionalShape(arrayShape(toolCallShape)),
			usage: optionalShape(
				objectShape({
					prompt: numberShape({ min: 0 }),
					completion: numberShape({ min: 0 }),
					total: numberShape({ min: 0 }),
				}),
			),
			truncated: optionalShape(booleanShape()),
		})
		expect(createContract(providerResultShape).schema).toEqual(createContract(inline).schema)
	})
})
