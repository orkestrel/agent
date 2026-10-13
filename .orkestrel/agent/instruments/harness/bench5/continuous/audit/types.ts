import type { EnduranceAtom, EnduranceOracle } from '../../endurance/types.js'
import type { RefitFile } from '../../refit/types.js'
import type {
	SustainedAdjudication,
	SustainedItem,
	SustainedKey,
	SustainedObligationLabel,
} from '../../sustained/audit/types.js'
import type {
	ContinuousArm,
	ContinuousCosts,
	ContinuousManifest,
	ContinuousRun,
	ContinuousStatus,
} from '../types.js'

/** Holds the private join of one blind item to its arm, run, goal, and optional prefrozen control. */
export interface ContinuousKey extends Omit<SustainedKey, 'arm'> {
	readonly arm: ContinuousArm
}

/** Binds the private randomized join to the exact manifest, workload, runtime, oracle, and packet bytes. */
export interface ContinuousKeys {
	readonly protocol: 'c1'
	readonly manifest: RefitFile
	readonly workload: RefitFile
	readonly runtime: RefitFile
	readonly oracle: RefitFile
	readonly packet: RefitFile
	readonly seed: number
	readonly keys: readonly ContinuousKey[]
}

/** Holds the public blind batch: every served product of every arm plus each control once. */
export interface ContinuousPacket {
	readonly protocol: 'c1'
	readonly items: readonly SustainedItem[]
}

/** Holds the public packet and its private joins before persistence. */
export interface ContinuousBlindResult {
	readonly packet: ContinuousPacket
	readonly keys: readonly ContinuousKey[]
}

/** Holds the validated runs of one manifest and the separately checked private truth. */
export interface ContinuousAuditInput {
	readonly manifest: ContinuousManifest
	readonly reference: RefitFile
	readonly runs: readonly ContinuousRun[]
	readonly oracle: EnduranceOracle
}

/** Holds report inputs after file custody and root adjudication have been checked. */
export interface ContinuousComparisonInput extends ContinuousAuditInput {
	readonly blind: ContinuousBlindResult
	readonly adjudication: SustainedAdjudication
	readonly packet: RefitFile
	readonly labels: RefitFile
}

/** Holds one arm's adjudicated outcomes over one interval. */
export interface ContinuousArmInterval {
	readonly arm: ContinuousArm
	/** Counts the interval's goals the arm served with a complete product. */
	readonly served: number
	/** Counts the served goals whose product and label both passed validity. */
	readonly judged: number
	readonly acceptable: { readonly low: number; readonly high: number }
	readonly critical: number
	readonly ambiguous: number
	readonly dimensions: Readonly<
		Record<
			EnduranceAtom['dimension'],
			{ readonly passed: number; readonly total: number; readonly ambiguous: number }
		>
	>
	/** Counts the served goals whose prompt carried a required source only through a recap. */
	readonly folded: number
	/** Counts the served goals whose prompt omitted a required source entirely. */
	readonly omitted: number
	readonly downstream: readonly string[]
}

/** Holds one arm's paired outcomes against the records arm over one interval. */
export interface ContinuousPair {
	readonly arm: ContinuousArm
	readonly goals: number
	readonly wins: number
	readonly losses: number
	readonly ties: number
	readonly ambiguous: number
	readonly gain: { readonly low: number; readonly high: number }
	/** Lists the goals where this arm violated a critical rule the records arm did not. */
	readonly regressions: readonly string[]
}

/** Holds the outcomes of every arm over one shift interval. */
export interface ContinuousInterval {
	readonly from: number
	readonly through: number
	readonly goals: readonly string[]
	readonly valid: boolean
	readonly failures: readonly string[]
	readonly arms: readonly ContinuousArmInterval[]
	readonly pairs: readonly ContinuousPair[]
}

/** Holds one arm's measured expenditure. */
export interface ContinuousArmCost {
	readonly arm: ContinuousArm
	readonly status: ContinuousStatus
	readonly served: number
	/** Counts the served goals whose product ended at the generation reserve. */
	readonly truncated: number
	readonly reading: ContinuousCosts
	readonly total: { readonly prompt: number; readonly completion: number; readonly missing: number }
	readonly judge: { readonly requests: number; readonly prompt: number; readonly completion: number }
	readonly summarizer: {
		readonly requests: number
		readonly prompt: number
		readonly completion: number
	}
}

/** Holds the evidence-backed comparison of every arm without an independence claim. */
/** Holds the adjudication readings c1 reports without voiding the batch. */
export interface ContinuousAuditReading {
	/** Counts, per arm, the items whose adjudicator recorded a leak in the product's own text. */
	readonly leaks: Readonly<Record<string, number>>
	/** Lists the leak citations that name anything but a product's own text; one voids the comparison. */
	readonly foreign: readonly string[]
	/** Lists the controls an adjudicator missed, each marking that adjudicator's labels. */
	readonly controls: readonly string[]
}

export interface ContinuousReport {
	readonly protocol: 'c1'
	readonly manifest: RefitFile
	readonly packet: RefitFile
	readonly labels: RefitFile
	readonly valid: boolean
	readonly failures: readonly string[]
	readonly batches: SustainedAdjudication['batches']
	readonly audit: ContinuousAuditReading
	readonly status: Readonly<Record<string, ContinuousStatus>>
	readonly served: Readonly<Record<string, number>>
	/** Holds the last fourth-shift checkpoint every arm completed. */
	readonly common: number
	readonly checkpoints: readonly ContinuousInterval[]
	readonly intervals: readonly ContinuousInterval[]
	readonly overall: ContinuousInterval
	readonly final: ContinuousInterval
	readonly costs: readonly ContinuousArmCost[]
	readonly verdict: 'records' | 'compaction' | 'inconclusive'
	readonly reasons: readonly string[]
	readonly limitation: string
}

/** Holds one adjudicated obligation outcome joined to its arm and goal. */
export interface ContinuousOutcome {
	readonly goal: string
	readonly arm: ContinuousArm
	readonly obligation: string
	readonly disposition: SustainedObligationLabel['disposition']
}
