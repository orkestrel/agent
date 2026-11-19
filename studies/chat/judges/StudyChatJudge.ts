import type { JudgeInterface, JudgeResult } from '@orkestrel/agent'
import { StudyError } from '@orkestrel/study'

/** Stands in for the judge the ledger requires and the chat treatment never asks.
 * @remarks
 * Both topics set `requested: false`, submitted requests are excluded from category judging, and
 * replies and tool results take mechanical categories, so no question reaches a judge. One that does is
 * a treatment defect: this judge refuses it, and the session's `StudyAgentJudge` keeps the refusal as
 * the trial's failure.
 * @example await new StudyChatJudge().ask(request, signal) // rejects with StudyError FAULT
 */
export class StudyChatJudge implements JudgeInterface {
	readonly id = 'chat'
	readonly name = 'chat'
	readonly model = 'none'

	/**
	 * Refuses every question, because the chat treatment composes no judge model.
	 * @returns A rejection with code `FAULT`
	 */
	ask(): Promise<JudgeResult> {
		return Promise.reject(new StudyError('FAULT', 'Chat composes no judge model'))
	}
}
