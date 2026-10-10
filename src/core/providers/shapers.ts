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
import { messageShape, toolCallShape } from '../shapers.js'

/**
 * Describes a provider request's JSON wire projection.
 *
 * @remarks
 * The wire is strictly narrower than `ProviderRequest`: non-JSON arguments, parameters,
 * or schema members are refused. Execution context stays local; the guard refuses
 * extra members, and the parser drops them.
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
 * The wire is strictly narrower than `ProviderResult`: non-JSON call arguments are
 * refused. Execution context stays local; the guard refuses extra members, and the parser drops them.
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
 * The wire is strictly narrower than `RelayFrame` through its `result` and `partial`
 * fields: non-JSON arguments are refused. Execution context stays local; the guard
 * refuses extra members, and the parser drops them.
 */
export const relayFrameShape = unionShape(
	objectShape({ channel: literalShape(['content', 'thinking']), text: stringShape() }),
	objectShape({ channel: literalShape(['result']), result: providerResultShape }),
	objectShape({ channel: literalShape(['abort']), partial: providerResultShape }),
	objectShape({ channel: literalShape(['error']), message: stringShape() }),
) satisfies ContractShape
