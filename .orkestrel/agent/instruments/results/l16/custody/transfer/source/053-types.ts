import type {
	EnduranceAtom,
	EnduranceFact,
	EnduranceObligation,
	EnduranceOracle,
	EnduranceRubric,
} from '../../endurance/types.js'
import type { MatrixCosts, MatrixRequest } from '../../matrix/types.js'
import type { RefitFile } from '../../refit/types.js'
import type { SustainedArm, SustainedReceipt, SustainedRun, SustainedSelection } from '../types.js'

/** Names an independently adjudicated atomic outcome without lexical acceptance. */
export type SustainedVerdict = 'pass' | 'fail' | 'ambiguous'

/** Holds the external evidence available before one actual work product. */
export interface SustainedEvidence {
	readonly id: string
	readonly content: string
	readonly shift: number
}

/** Holds one blind work item without arm, model, selection, summary, or control metadata. */
export interface SustainedItem {
	readonly id: string
	readonly point: { readonly shift: number; readonly after: number }
	readonly request: string
	readonly product: string
	readonly earlier: ReadonlyArray<{
		readonly id: string
		readonly request: string
		readonly product: string
	}>
	readonly evidence: readonly SustainedEvidence[]
	readonly receipts: readonly SustainedReceipt[]
	readonly facts: readonly EnduranceFact[]
	readonly obligations: readonly EnduranceObligation[]
	readonly rubric: EnduranceRubric
}

/** Holds a reproducibly randomized blind batch and its immutable content. */
export interface SustainedPacket {
	readonly protocol: 'e1'
	readonly items: readonly SustainedItem[]
}

/** Holds the private join and prefrozen expected control ruling. */
export interface SustainedKey {
	readonly id: string
	/** Identifies the single private audit batch covering the public packet, independent of reporting intervals. */
	readonly batch: string
	readonly run: string
	readonly arm: SustainedArm
	readonly goal: string
	readonly files: readonly RefitFile[]
	readonly control?: {
		readonly id: string
		readonly verdict: 'stale' | 'fabricated' | 'ambiguous'
		readonly reason: string
	}
}

/** Binds the private randomized join to exact runtime, oracle, selection, and packet bytes. */
export interface SustainedKeys {
	readonly protocol: 'e1'
	readonly manifest: RefitFile
	readonly packet: RefitFile
	readonly oracle: RefitFile
	readonly runtime: RefitFile
	readonly selection: RefitFile
	readonly seed: number
	readonly keys: readonly SustainedKey[]
}

/** Holds an independently judged atom and its specific evidence. */
export interface SustainedAtomLabel {
	readonly id: string
	readonly verdict: SustainedVerdict
	readonly evidence: readonly string[]
}

/** Holds the adjudicated disposition of an obligation in actual downstream work. */
export interface SustainedObligationLabel {
	readonly id: string
	/** Requires an arrived obligation closure for completion; repair requires external correction and earlier work. */
	readonly disposition: 'carried' | 'completed' | 'repaired' | 'missed' | 'ambiguous'
	readonly evidence: readonly string[]
}

/** Holds all atomic and critical outcomes for a blinded product, including audit limitations. */
export interface SustainedLabel {
	readonly id: string
	readonly atoms: readonly SustainedAtomLabel[]
	readonly critical: ReadonlyArray<{
		readonly rule: string
		readonly violated: boolean
		readonly evidence: readonly string[]
	}>
	readonly obligations: readonly SustainedObligationLabel[]
	readonly ambiguous: readonly string[]
	readonly leaks: readonly string[]
}

/** Binds complete root adjudication to the exact public packet and private join. */
export interface SustainedLabels {
	readonly authority: 'root-adjudicated'
	readonly packet: string
	readonly keys: string
	readonly labels: readonly SustainedLabel[]
}

/** Holds paired dependent-trajectory outcomes at one common checkpoint or interval. */
export interface SustainedInterval {
	readonly from: number
	readonly through: number
	readonly goals: readonly string[]
	readonly valid: boolean
	readonly failures: readonly string[]
	readonly acceptable: Readonly<
		Record<SustainedArm, { readonly low: number; readonly high: number }>
	>
	readonly wins: number
	readonly losses: number
	readonly ties: number
	readonly ambiguous: number
	readonly gain: { readonly low: number; readonly high: number }
	readonly critical: Readonly<Record<SustainedArm, number>>
	readonly regressions: readonly string[]
	readonly exposure: {
		readonly served: number
		readonly exposed: number
		readonly majority: boolean
	}
	readonly downstream: readonly string[]
	readonly dimensions: Readonly<
		Record<
			EnduranceAtom['dimension'],
			Readonly<
				Record<
					SustainedArm,
					{ readonly passed: number; readonly total: number; readonly ambiguous: number }
				>
			>
		>
	>
}

/** Holds the private evidence-backed sustained-work comparison without an independence claim. */
export interface SustainedReport {
	readonly policy?: RefitFile
	readonly protocol: 'e1'
	readonly selection: RefitFile
	readonly packet?: RefitFile
	readonly labels?: RefitFile
	readonly valid: boolean
	readonly failures: readonly string[]
	readonly batches: ReadonlyArray<{
		readonly id: string
		readonly valid: boolean
		readonly failures: readonly string[]
	}>
	readonly served: Readonly<Record<SustainedArm, number>>
	readonly common: number
	readonly suffix: Readonly<Record<SustainedArm, readonly string[]>>
	readonly checkpoints: readonly SustainedInterval[]
	readonly intervals: readonly SustainedInterval[]
	readonly overall?: SustainedInterval
	readonly final?: SustainedInterval
	readonly observations: readonly unknown[]
	readonly maintenance: readonly unknown[]
	readonly costs: ReadonlyArray<{
		readonly arm: SustainedArm
		readonly reading: MatrixCosts
		readonly detail: SustainedCostDetail
	}>
	readonly incremental?: SustainedUsage
	readonly preparation: readonly unknown[]
	readonly recommendation: 'conditional' | 'negative' | 'inconclusive'
	readonly reasons: readonly string[]
	readonly limitation: string
}

/** Holds known fresh token totals and the number of incompletely measured requests. */
export interface SustainedUsage {
	readonly prompt: number
	readonly completion: number
	readonly missing: number
}

/** Retains measured support operations and failed requests without inventing retry or wire-purpose joins. */
export interface SustainedCostDetail {
	readonly total: SustainedUsage
	readonly failed: readonly MatrixRequest[]
	readonly support: ReadonlyArray<{
		readonly goal: string
		readonly event: string
		readonly wall: number | undefined
		readonly cached: boolean | undefined
	}>
	readonly limitations: readonly string[]
}

/** Holds the validated pair and the separately checked private truth. */
export interface SustainedAuditInput {
	readonly manifest: RefitFile
	readonly selection: SustainedSelection
	readonly reference: RefitFile
	readonly records: SustainedRun
	readonly aggregate: SustainedRun
	readonly oracle: EnduranceOracle
}

/** Holds concrete paths required only for an accepted selection's audit. */
export interface SustainedAuditPaths {
	readonly records: string
	readonly aggregate: string
	readonly oracle: string
}

/** Holds deterministic public content and its private joins before persistence. */
export interface SustainedBlindResult {
	readonly packet: SustainedPacket
	readonly keys: readonly SustainedKey[]
}

/** Holds conservative and possible fully acceptable outcomes for one product. */
export interface SustainedBounds {
	readonly low: number
	readonly high: number
}

/** Holds complete adjudication and batch validity independently of runtime validity. */
export interface SustainedAdjudication {
	readonly labels: ReadonlyMap<string, SustainedLabel>
	readonly batches: SustainedReport['batches']
}

/** Holds exact blinded artifacts and independently supplied root labels. */
export interface SustainedJudgmentInput {
	readonly packet: SustainedPacket
	readonly keys: SustainedKeys
	readonly labels: SustainedLabels
	readonly hashes: { readonly packet: string; readonly keys: string }
}

/** Holds report inputs after file custody and root adjudication have been checked. */
export interface SustainedComparisonInput extends SustainedAuditInput {
	readonly blind: SustainedBlindResult
	readonly adjudication: SustainedAdjudication
	readonly packet: RefitFile
	readonly labels: RefitFile
	readonly preparation: readonly unknown[]
}

/** Holds exact source or earlier-product age and selection status at one read point. */
export interface SustainedCoverage {
	readonly id: string
	readonly category: 'source' | 'lookup' | 'product'
	readonly shift: number
	readonly age: number
	readonly selected: boolean
	readonly required: boolean
}

/** Holds one completed downstream obligation and its adjudicated disposition. */
export interface SustainedOutcome {
	readonly goal: string
	readonly arm: SustainedArm
	readonly obligation: string
	readonly disposition: SustainedObligationLabel['disposition']
	readonly evidence: readonly string[]
}

/** Holds a supported source-state transition between actual exposed summary bindings. */
export interface SustainedChain {
	readonly topic: string
	readonly before: string
	readonly after: string
	readonly prior: number
	readonly version: number
	readonly retained: boolean
	readonly sources: readonly string[]
	readonly transitions: ReadonlyArray<EnduranceFact['transition']>
}
