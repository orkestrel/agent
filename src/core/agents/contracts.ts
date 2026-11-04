import { createContract } from '@orkestrel/contract'
import { agentAnswerShape, agentFrameShape, agentJobShape, agentPromptShape } from './shapers.js'

/** Validates and projects agent frames at a JSON wire boundary. */
export const agentFrameContract = createContract(agentFrameShape)

/** Validates and projects agent prompts at the run's `prompt` option and a page's request body. */
export const agentPromptContract = createContract(agentPromptShape)

/** Checks a durable agent job exactly at `AgentRegistry.build`. */
export const agentJobContract = createContract(agentJobShape)

/** Validates and projects a page's answers to `ask` frames at a JSON wire boundary. */
export const agentAnswerContract = createContract(agentAnswerShape)
