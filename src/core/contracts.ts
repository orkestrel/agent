import { createContract } from '@orkestrel/contract'
import {
	messageShape,
	providerRequestShape,
	providerResultShape,
	relayFrameShape,
} from './shapers.js'

/** Validates and projects conversation messages at a JSON wire boundary. */
export const messageContract = createContract(messageShape)

/** Validates and projects provider requests at a JSON wire boundary. */
export const providerRequestContract = createContract(providerRequestShape)

/** Validates and projects provider results at a JSON wire boundary. */
export const providerResultContract = createContract(providerResultShape)

/** Validates and projects channel-discriminated relay frames at a JSON wire boundary. */
export const relayFrameContract = createContract(relayFrameShape)
