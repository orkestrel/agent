import type { ContractShape } from '@orkestrel/contract'
import { MESSAGE_ROLES } from './constants.js'
import {
	arrayShape,
	jsonShape,
	literalShape,
	numberShape,
	objectShape,
	optionalShape,
	recordShape,
	stringShape,
} from '@orkestrel/contract'

/**
 * Describes a tool call's JSON wire projection.
 *
 * @remarks
 * The wire is strictly narrower than the domain: non-JSON arguments are refused.
 * Calls carry only id, name, and arguments; execution context stays local.
 * The guard refuses every extra member; the contract parser drops extra members.
 */
export const toolCallShape = objectShape({
	id: stringShape(),
	name: stringShape(),
	arguments: recordShape(jsonShape()),
}) satisfies ContractShape

/**
 * Describes a conversation message's JSON wire projection.
 *
 * @remarks
 * The wire is strictly narrower than Message: non-JSON call arguments are refused,
 * and execution context stays local. The guard refuses extra members; the parser drops them.
 */
export const messageShape = objectShape({
	id: stringShape(),
	role: literalShape(MESSAGE_ROLES),
	content: stringShape(),
	calls: optionalShape(arrayShape(toolCallShape)),
	call: optionalShape(stringShape()),
	images: optionalShape(arrayShape(stringShape())),
	thinking: optionalShape(stringShape()),
}) satisfies ContractShape

/**
 * Describes a token usage record's JSON wire projection — its `prompt`, `completion`, and `total`
 * counts, shared by the provider result and the agent frame wires.
 *
 * @remarks
 * The guard refuses extra members; the contract parser drops them.
 */
export const tokenUsageShape = objectShape({
	prompt: numberShape(),
	completion: numberShape(),
	total: numberShape(),
}) satisfies ContractShape
