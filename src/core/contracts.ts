import { createContract } from '@orkestrel/contract'
import { messageShape } from './shapers.js'

/** Validates and projects conversation messages at a JSON wire boundary. */
export const messageContract = createContract(messageShape)
