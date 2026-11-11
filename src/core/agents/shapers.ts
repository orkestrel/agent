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
import { BUILTIN_LIMITS } from './constants.js'

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

/**
 * Describes what a host shows a run — the loaded `skills` in load order and an optional selected
 * `workspace`, the record the `disclosure` option of an agent and a run is admitted against.
 *
 * @remarks
 * The guard refuses every extra member and a `workspace` given as `undefined`; the contract parser
 * drops extra members.
 */
export const agentDisclosureShape = objectShape({
	skills: arrayShape(stringShape()),
	workspace: optionalShape(stringShape()),
}) satisfies ContractShape

/**
 * Describes the arguments of the `load` and `unload` built-ins — one `skill` name, non-empty and
 * at most `BUILTIN_LIMITS.name` code points.
 *
 * @remarks
 * The tool's door refuses a missing, empty, over-long, or extra member before the handler runs,
 * and repairs a value that converts to a string without loss, such as a number. A value of white
 * space alone passes the door; the handler refuses it as it refuses any name it cannot use.
 */
export const loadToolShape = objectShape({
	skill: stringShape({
		min: 1,
		max: BUILTIN_LIMITS.name,
		description: 'A skill name from the skills index',
	}),
}) satisfies ContractShape

/**
 * Describes the arguments of the `memo` built-in — one memo `name`, non-empty and at most
 * `BUILTIN_LIMITS.name` code points.
 *
 * @remarks
 * The tool's door refuses a missing, empty, over-long, or extra member before the handler runs,
 * and repairs a value that converts to a string without loss, such as a number. A value of white
 * space alone passes the door; the handler refuses it as it refuses any name it cannot use.
 */
export const memoToolShape = objectShape({
	name: stringShape({
		min: 1,
		max: BUILTIN_LIMITS.name,
		description: 'A memo name from the memos index',
	}),
}) satisfies ContractShape

/**
 * Describes the arguments of the `remember` built-in — a memo `name`, the one-line `description`
 * the memos index shows, and the `content`, each non-empty and within its `BUILTIN_LIMITS` cap.
 *
 * @remarks
 * The tool's door refuses a missing, empty, over-long, or extra member before the handler runs,
 * and repairs a value that converts to a string without loss, such as a number. A value of white
 * space alone passes the door; the handler refuses it as it refuses any name it cannot use.
 */
export const rememberToolShape = objectShape({
	name: stringShape({
		min: 1,
		max: BUILTIN_LIMITS.name,
		description: 'A memo name the host lists for you to write',
	}),
	description: stringShape({
		min: 1,
		max: BUILTIN_LIMITS.description,
		description: 'One line the memos index shows',
	}),
	content: stringShape({
		min: 1,
		max: BUILTIN_LIMITS.content,
		description: 'The fact, why it holds, and how to apply it',
	}),
}) satisfies ContractShape

/**
 * Describes the arguments of the `switch` built-in — one `workspace` id, non-empty and at most
 * `BUILTIN_LIMITS.name` code points.
 *
 * @remarks
 * The tool's door refuses a missing, empty, over-long, or extra member before the handler runs,
 * and repairs a value that converts to a string without loss, such as a number. A value of white
 * space alone passes the door; the handler refuses it as it refuses any name it cannot use.
 */
export const switchToolShape = objectShape({
	workspace: stringShape({
		min: 1,
		max: BUILTIN_LIMITS.name,
		description: 'A workspace id from the workspaces index',
	}),
}) satisfies ContractShape
