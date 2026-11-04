import type { ContractShape } from '@orkestrel/contract'
import { MESSAGE_ROLES } from './constants.js'
import {
	arrayShape,
	jsonShape,
	literalShape,
	nullableShape,
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
 * Calls carry only id, name, and arguments; execution context stays local.
 * The guard refuses every extra member; the contract parser drops extra members.
 */
export const toolCallShape = objectShape({
	id: stringShape(),
	name: stringShape(),
	arguments: recordShape(jsonShape()),
}) satisfies ContractShape

/**
 * Describes a message input's JSON projection: a {@link messageShape} with no `id`, which the
 * storing conversation mints.
 *
 * @remarks
 * A conversation's `add` checks a hoisted hand guard on every message and reads this shape's `audit`
 * only to fill a refusal's faults. A job's seed messages cross it at `build`. The role literal admits
 * `system`, so the conversation's `ROLE` refusal explains that case.
 */
export const messageInputShape = objectShape({
	role: literalShape(MESSAGE_ROLES),
	content: stringShape(),
	calls: optionalShape(arrayShape(toolCallShape)),
	call: optionalShape(stringShape()),
	images: optionalShape(arrayShape(stringShape())),
	thinking: optionalShape(stringShape()),
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
 * Describes the text or JSON a judge reads: a non-empty string, a non-empty JSON array, or a JSON record.
 *
 * @remarks
 * A shape has no `minProperties`, so this one admits the empty record that `isJudgeEntry` refuses;
 * the guard is the door, and this shape only fills a refusal's faults.
 */
export const judgeEntryShape = unionShape(
	stringShape({ min: 1 }),
	arrayShape(jsonShape(), { min: 1 }),
	recordShape(jsonShape()),
) satisfies ContractShape

/**
 * Describes a judge question: one exact object per form, the schema an LLM-facing wire can publish.
 *
 * @remarks
 * `isJudgeQuestion` is the door; this shape fills a refusal's faults. A choice needing at least 2
 * options is the guard's alone, because a shape has no `minProperties`.
 */
export const judgeQuestionShape = unionShape(
	objectShape({
		form: literalShape(['choice']),
		instructions: optionalShape(judgeEntryShape),
		criteria: recordShape(nullableShape(judgeEntryShape)),
	}),
	objectShape({
		form: literalShape(['score']),
		instructions: optionalShape(judgeEntryShape),
		criteria: arrayShape(nullableShape(judgeEntryShape), { min: 2 }),
	}),
	objectShape({
		form: literalShape(['noul']),
		instructions: optionalShape(judgeEntryShape),
		criteria: optionalShape(
			objectShape({
				true: optionalShape(judgeEntryShape),
				false: optionalShape(judgeEntryShape),
			}),
		),
	}),
) satisfies ContractShape

/**
 * Describes a judge answer: one exact object per form, each probability in `[0, 1]`.
 *
 * @remarks
 * The ties an answer holds to its question run at the write doors through `scanJudgmentTies`, which a
 * shape over the answer alone cannot state.
 */
export const judgeAnswerShape = unionShape(
	objectShape({
		form: literalShape(['choice']),
		probabilities: recordShape(numberShape({ min: 0, max: 1 })),
	}),
	objectShape({
		form: literalShape(['score']),
		probabilities: arrayShape(numberShape({ min: 0, max: 1 })),
	}),
	objectShape({
		form: literalShape(['noul']),
		noul: numberShape({ min: 0, max: 1 }),
	}),
) satisfies ContractShape

/**
 * Describes a token usage record's JSON wire projection — its `prompt`, `completion`, and `total`
 * counts, shared by the provider result and the agent frame wires.
 *
 * @remarks
 * Each count is a nonnegative number. The guard refuses extra members; the contract parser drops them.
 */
export const tokenUsageShape = objectShape({
	prompt: numberShape({ min: 0 }),
	completion: numberShape({ min: 0 }),
	total: numberShape({ min: 0 }),
}) satisfies ContractShape
