import type { Infer } from '@orkestrel/contract'
import type {
	AgentAnswer,
	AgentDisclosure,
	AgentFrame,
	AgentPrompt,
	MemoInput,
	loadToolShape,
	memoToolShape,
	rememberToolShape,
	switchToolShape,
} from '@src/core'
import {
	agentAnswerShape,
	agentDisclosureShape,
	agentFrameShape,
	agentPromptShape,
} from '@src/core'
import { createContract } from '@orkestrel/contract'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { BUILTIN_ARGUMENT_CASES } from '../../../setup.js'

describe('agent wire shapes', () => {
	it('infers a frame wire projection equal to its domain', () => {
		expectTypeOf<Infer<typeof agentFrameShape>>().toExtend<AgentFrame>()
		expectTypeOf<AgentFrame>().toExtend<Infer<typeof agentFrameShape>>()
		expect(createContract(agentFrameShape).is({ category: 'error' })).toBe(true)
	})
	it('infers a prompt wire projection equal to its domain', () => {
		expectTypeOf<Infer<typeof agentPromptShape>>().toExtend<AgentPrompt>()
		expectTypeOf<AgentPrompt>().toExtend<Infer<typeof agentPromptShape>>()
		expect(createContract(agentPromptShape).is({ content: '' })).toBe(true)
	})
	it('infers an answer wire projection equal to its domain', () => {
		expectTypeOf<Infer<typeof agentAnswerShape>>().toExtend<AgentAnswer>()
		expectTypeOf<AgentAnswer>().toExtend<Infer<typeof agentAnswerShape>>()
		expect(createContract(agentAnswerShape).is({ id: 'a1', approved: true })).toBe(true)
	})
	it('infers a disclosure projection equal to its domain', () => {
		expectTypeOf<Infer<typeof agentDisclosureShape>>().toExtend<AgentDisclosure>()
		expectTypeOf<AgentDisclosure>().toExtend<Infer<typeof agentDisclosureShape>>()
		expect(createContract(agentDisclosureShape).is({ skills: [] })).toBe(true)
	})
})

describe('built-in argument shapes', () => {
	it('infers each argument record a built-in reads', () => {
		expectTypeOf<Infer<typeof loadToolShape>>().toExtend<{ readonly skill: string }>()
		expectTypeOf<{ readonly skill: string }>().toExtend<Infer<typeof loadToolShape>>()
		expectTypeOf<Infer<typeof memoToolShape>>().toExtend<{ readonly name: string }>()
		expectTypeOf<{ readonly name: string }>().toExtend<Infer<typeof memoToolShape>>()
		expectTypeOf<Infer<typeof rememberToolShape>>().toExtend<Omit<MemoInput, 'origin'>>()
		expectTypeOf<Omit<MemoInput, 'origin'>>().toExtend<Infer<typeof rememberToolShape>>()
		expectTypeOf<Infer<typeof switchToolShape>>().toExtend<{ readonly workspace: string }>()
		expectTypeOf<{ readonly workspace: string }>().toExtend<Infer<typeof switchToolShape>>()
	})

	it.each(BUILTIN_ARGUMENT_CASES)('$name', ({ shape, value, admitted }) => {
		expect(createContract(shape).is(value)).toBe(admitted)
	})
})
