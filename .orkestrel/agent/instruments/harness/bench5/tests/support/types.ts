import type { JudgeQuestion } from '../../../vendor/agent-0.0.30-trimmed/index.js'
import type { AggregateFocus } from '../../types.js'
import type { RefitSource } from '../../refit/types.js'

/** Holds independently transcribed native boundary request expectations. */
export interface SupportSpecimen {
	readonly candidate: string
	readonly sources: readonly RefitSource[]
	readonly components: ReadonlyArray<{
		readonly state: string
		readonly question: JudgeQuestion
		readonly focus?: AggregateFocus
		readonly body: string
	}>
}
