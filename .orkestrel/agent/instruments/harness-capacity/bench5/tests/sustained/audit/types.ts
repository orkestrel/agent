import type {
	SustainedAuditInput,
	SustainedBlindResult,
	SustainedJudgmentInput,
} from '../../../sustained/audit/types.js'

/** Holds inert typed outcomes for pure audit-domain boundary tests. */
export interface AuditFixture {
	readonly input: SustainedAuditInput
	readonly blind: SustainedBlindResult
	readonly judgment: SustainedJudgmentInput
}

/** Names a test body that owns one recorded scratch directory until it returns. */
export type AuditFilesHandler = (directory: string) => void
