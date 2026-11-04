import type { ContractShape } from '@orkestrel/contract'
import {
	arrayShape,
	numberShape,
	objectShape,
	optionalShape,
	stringShape,
	unionShape,
} from '@orkestrel/contract'
import { judgeAnswerShape, judgeQuestionShape, messageShape, tokenUsageShape } from '../shapers.js'

/**
 * Describes a stored judgment: exactly one of an answer or a refusal, with its question, sources,
 * state, model, and storage time.
 *
 * @remarks
 * `isJudgment` is the door a hydrate reads and this shape fills a refusal's faults, because hydrate is
 * a per-element path. A lockstep test holds that `is` implies the guard.
 */
export const judgmentShape = unionShape(
	objectShape({
		id: stringShape(),
		question: judgeQuestionShape,
		model: stringShape(),
		sources: arrayShape(stringShape()),
		state: stringShape(),
		time: numberShape(),
		usage: optionalShape(tokenUsageShape),
		answer: judgeAnswerShape,
	}),
	objectShape({
		id: stringShape(),
		question: judgeQuestionShape,
		model: stringShape(),
		sources: arrayShape(stringShape()),
		state: stringShape(),
		time: numberShape(),
		usage: optionalShape(tokenUsageShape),
		refusal: objectShape({ missing: arrayShape(stringShape()) }),
	}),
) satisfies ContractShape

/** Describes a compacted section: its id, its summary, and the originals it folded. */
export const sectionShape = objectShape({
	id: stringShape(),
	summary: stringShape(),
	messages: arrayShape(messageShape),
}) satisfies ContractShape

/**
 * Describes a conversation snapshot exactly: an unknown key refuses, so a key a later version adds never
 * reads as absent.
 *
 * @remarks
 * `isConversationSnapshot` is the door a hydrate and a store read, and this shape fills a refusal's
 * faults. A lockstep test holds that `is` implies the guard, and on the snapshot fixtures the converse.
 */
export const conversationSnapshotShape = objectShape({
	id: stringShape(),
	sections: arrayShape(sectionShape),
	messages: arrayShape(messageShape),
	judgments: optionalShape(arrayShape(judgmentShape)),
}) satisfies ContractShape
