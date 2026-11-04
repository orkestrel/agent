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
import { messageInputShape, tokenUsageShape } from '../shapers.js'

/**
 * Describes a durable agent job — the record `AgentRegistry.build` checks exactly, so a misspelled key
 * refuses instead of running an agent without it.
 *
 * @remarks
 * `children` holds JSON records, because each child crosses this shape at its own `build`. `limit`
 * reads as a number here and as a positive safe integer at the agent's construction, which owns that
 * refusal.
 */
export const agentJobShape = objectShape({
	provider: stringShape(),
	messages: optionalShape(arrayShape(messageInputShape)),
	system: optionalShape(stringShape()),
	tools: optionalShape(arrayShape(stringShape())),
	authority: optionalShape(stringShape()),
	scheduler: optionalShape(stringShape()),
	limit: optionalShape(numberShape()),
	timeout: optionalShape(numberShape()),
	budget: optionalShape(numberShape()),
	children: optionalShape(arrayShape(recordShape(jsonShape()))),
}) satisfies ContractShape

/**
 * Describes the agent frame wire — one exact object per `AgentFrame` arm, discriminated by
 * `category`.
 *
 * @remarks
 * A `tool` frame carries the tool `name` on success and nothing on failure; an `ask` frame carries
 * the minted `id`, the tool `name`, the decision's `zone`, and the `arguments` text; a `finish` frame
 * carries the result's `content`, `partial`, `usage`, and stop `layer`; an `error` frame carries
 * nothing. The guard refuses every extra member; the contract parser drops extra members.
 */
export const agentFrameShape = unionShape(
	objectShape({ category: literalShape(['token']), content: stringShape() }),
	objectShape({ category: literalShape(['think']), content: stringShape() }),
	objectShape({
		category: literalShape(['tool']),
		success: literalShape([true]),
		name: stringShape(),
	}),
	objectShape({ category: literalShape(['tool']), success: literalShape([false]) }),
	objectShape({
		category: literalShape(['usage']),
		usage: tokenUsageShape,
		estimate: numberShape(),
	}),
	objectShape({
		category: literalShape(['ask']),
		id: stringShape(),
		name: stringShape(),
		zone: stringShape(),
		arguments: stringShape(),
	}),
	objectShape({
		category: literalShape(['finish']),
		content: stringShape(),
		partial: booleanShape(),
		usage: optionalShape(tokenUsageShape),
		layer: optionalShape(literalShape(['meter', 'budget', 'model'])),
	}),
	objectShape({ category: literalShape(['error']) }),
) satisfies ContractShape

/**
 * Describes the agent prompt wire — the `content` and optional `images` of one user turn, read by
 * the run's `prompt` option and by a page's request body.
 *
 * @remarks
 * The guard refuses every other member, a `role`, an `id`, and a message history included; the
 * contract parser drops extra members.
 */
export const agentPromptShape = objectShape({
	content: stringShape(),
	images: optionalShape(arrayShape(stringShape())),
}) satisfies ContractShape

/**
 * Describes the agent answer wire — the `id` of one `ask` frame and a boolean `approved`.
 *
 * @remarks
 * The guard refuses every extra member and an `approved` that is not a boolean; the contract parser
 * drops extra members.
 */
export const agentAnswerShape = objectShape({
	id: stringShape(),
	approved: booleanShape(),
}) satisfies ContractShape
