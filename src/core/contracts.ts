import { createContract } from '@orkestrel/contract'
import { judgeAnswerShape, judgeQuestionShape, messageInputShape, messageShape } from './shapers.js'

/** Validates and projects conversation messages at a JSON wire boundary. */
export const messageContract = createContract(messageShape)

/** Reads the faults of a refused judge question. */
export const judgeQuestionContract = createContract(judgeQuestionShape)

/** Reads the faults of a refused judge answer. */
export const judgeAnswerContract = createContract(judgeAnswerShape)

/** Reads the faults of a refused message input and validates a job's seed messages. */
export const messageInputContract = createContract(messageInputShape)
