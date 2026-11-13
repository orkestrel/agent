import type { AgentBuiltin } from './types.js'
import type { ContractInterface, ContractShape } from '@orkestrel/contract'
import { createContract } from '@orkestrel/contract'
import {
	agentAnswerShape,
	agentFrameShape,
	agentJobShape,
	agentPromptShape,
	loadToolShape,
	memoToolShape,
	rememberToolShape,
	switchToolShape,
} from './shapers.js'

/** Validates and projects agent frames at a JSON wire boundary. */
export const agentFrameContract = createContract(agentFrameShape)

/** Validates and projects agent prompts at the run's `prompt` option and a page's request body. */
export const agentPromptContract = createContract(agentPromptShape)

/** Checks a durable agent job exactly at `AgentRegistry.build`. */
export const agentJobContract = createContract(agentJobShape)

/** Validates and projects a page's answers to `ask` frames at a JSON wire boundary. */
export const agentAnswerContract = createContract(agentAnswerShape)

/** Checks the arguments of the `load` and `unload` built-ins; its schema is the parameters they advertise. */
export const loadToolContract = createContract(loadToolShape)

/** Checks the arguments of the `memo` built-in; its schema is the parameters it advertises. */
export const memoToolContract = createContract(memoToolShape)

/** Checks the arguments of the `remember` built-in; its schema is the parameters it advertises. */
export const rememberToolContract = createContract(rememberToolShape)

/** Checks the arguments of the `switch` built-in; its schema is the parameters it advertises. */
export const switchToolContract = createContract(switchToolShape)

/**
 * Pairs each built-in's argument shape, which its tool's door compiles, with its compiled contract,
 * keyed by its {@link AgentBuiltin} name, frozen.
 *
 * @remarks
 * The one map from a built-in to its arguments: `createBuiltinTool` builds the door from `shape`,
 * and `collectBuiltinDefinitions` and `collectDisclosure` read `contract`, so the advertised
 * parameters, the door, and the derivation admit by one rule. The record declares no shape: each
 * `shape` is a reference to the one `shapers.ts` declares, held beside the contract compiled from
 * it, because the tool door takes a shape and the derivation takes a compiled contract. The record
 * is data, as the rest of this file is.
 */
export const builtinToolContracts: Readonly<
	Record<
		AgentBuiltin,
		Readonly<{
			shape: ContractShape
			contract: ContractInterface<Readonly<Record<string, unknown>>>
		}>
	>
> = Object.freeze({
	load: Object.freeze({ shape: loadToolShape, contract: loadToolContract }),
	unload: Object.freeze({ shape: loadToolShape, contract: loadToolContract }),
	memo: Object.freeze({ shape: memoToolShape, contract: memoToolContract }),
	remember: Object.freeze({ shape: rememberToolShape, contract: rememberToolContract }),
	switch: Object.freeze({ shape: switchToolShape, contract: switchToolContract }),
})
