import type { Infer } from '@orkestrel/contract'
import type { AgentAnswer, AgentFrame, AgentPrompt } from '@src/core'
import { agentAnswerShape, agentFrameShape, agentPromptShape } from '@src/core'
import { createContract } from '@orkestrel/contract'
import { describe, expect, expectTypeOf, it } from 'vitest'

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
})
