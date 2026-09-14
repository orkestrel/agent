import type { ContractShape } from '@orkestrel/contract'
import {
	arrayShape,
	booleanShape,
	jsonShape,
	literalShape,
	numberShape,
	objectShape,
	optionalShape,
	recordShape,
	stringShape,
	unionShape,
} from '@orkestrel/contract'

/**
 * Describes a tool call's JSON wire projection.
 *
 * @remarks
 * The wire is strictly narrower than the domain: non-JSON arguments are refused.
 * ToolCall.caller is not in this shape and never crosses a wire. The guard refuses
 * that extra member; the contract parser drops it.
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
 * and caller context is refused by the guard or dropped by the parser.
 */
export const messageShape = objectShape({
	id: stringShape(),
	role: literalShape(['system', 'user', 'assistant', 'tool']),
	content: stringShape(),
	calls: optionalShape(arrayShape(toolCallShape)),
	images: optionalShape(arrayShape(stringShape())),
}) satisfies ContractShape

/**
 * Describes a provider request's JSON wire projection.
 *
 * @remarks
 * The wire is strictly narrower than ProviderRequest: non-JSON arguments, parameters,
 * or schema members are refused, and caller context is refused or dropped.
 */
export const providerRequestShape = objectShape({
	messages: arrayShape(messageShape),
	tools: optionalShape(
		arrayShape(
			objectShape({
				name: stringShape(),
				description: optionalShape(stringShape()),
				parameters: optionalShape(recordShape(jsonShape())),
			}),
		),
	),
	options: optionalShape(
		objectShape({
			think: optionalShape(booleanShape()),
			schema: optionalShape(recordShape(jsonShape())),
		}),
	),
}) satisfies ContractShape

/**
 * Describes a provider result's JSON wire projection.
 *
 * @remarks
 * The wire is strictly narrower than ProviderResult: non-JSON call arguments are
 * refused, and caller context is refused or dropped.
 */
export const providerResultShape = objectShape({
	content: stringShape(),
	thinking: optionalShape(stringShape()),
	tools: optionalShape(arrayShape(toolCallShape)),
	usage: optionalShape(
		objectShape({
			prompt: numberShape(),
			completion: numberShape(),
			total: numberShape(),
		}),
	),
}) satisfies ContractShape

/**
 * Describes the channel-discriminated JSON relay wire projection.
 *
 * @remarks
 * The wire is strictly narrower than RelayFrame through its result and partial
 * fields: non-JSON arguments are refused, and caller context is refused or dropped.
 */
export const relayFrameShape = unionShape(
	objectShape({ channel: literalShape(['content', 'thinking']), text: stringShape() }),
	objectShape({ channel: literalShape(['result']), result: providerResultShape }),
	objectShape({ channel: literalShape(['abort']), partial: providerResultShape }),
	objectShape({
		channel: literalShape(['error']),
		code: literalShape(['PROVIDER']),
		message: stringShape(),
	}),
) satisfies ContractShape
