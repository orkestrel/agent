import type { LedgerGauge } from '../../vendor/agent-0.0.30-trimmed/index.js'
import type { EnduranceRuntime } from '../endurance/types.js'
import type {
	MatrixBudget,
	MatrixCosts,
	MatrixFreeze,
	MatrixRequest,
	MatrixRow,
} from '../matrix/types.js'
import type { RefitFile } from '../refit/types.js'
import type { Fit, SelectionRecord } from '../types.js'

/** Names one arm of the continuous held-out comparison. */
export type SustainedArm = 'records' | 'aggregate'

/** Binds exploratory continuation to a refused qualified sustained selection. */
export interface SustainedPolicy {
	readonly qualified: RefitFile
	readonly withhold: boolean
}

/** Binds matrix exposure and independent endurance support calibration. */
export interface SustainedExploration {
	readonly matrix:
		| { readonly pilot: RefitFile }
		| {
				readonly records: RefitFile
				readonly aggregate: RefitFile
		  }
	readonly diagnosis?: RefitFile
}

/** Holds the independently validated qualified prerequisite of an exploratory route. */
export interface SustainedPrerequisite {
	readonly policy: SustainedPolicy
	readonly selection: SustainedSelection
}

/** Holds independent scenario admission and measured candidate failures. */
export interface SustainedAdmission {
	readonly fit?: Fit
	readonly classification?: RefitFile
	readonly failures: readonly string[]
}

/** Holds finite whole-trajectory limits frozen before its first request. */
export interface SustainedLimits {
	readonly calls: number
	readonly tokens: number
	readonly retries: number
	readonly wall: number
	readonly goals: number
	readonly derivation: string
	readonly evidence: readonly RefitFile[]
}

/** Binds reviewed operator changes to retained pre-edit resource and matrix calibration proof. */
export interface SustainedTransfer {
	readonly receipt: RefitFile
	readonly archive: string
	readonly historical: RefitFile
	readonly resource: RefitFile
	readonly fit: RefitFile
	readonly diagnosis: RefitFile
	readonly review: RefitFile
	readonly changes: readonly RefitFile[]
}

/** Pairs an original frozen identity with its preserved bytes. */
export interface SustainedArchive {
	readonly original: RefitFile
	readonly retained: RefitFile
}

/** Freezes a user-directed comparison without claiming ranked feasibility or sustained calibration. */
export interface SustainedDirected {
	readonly protocol: 'e1'
	readonly authority: 'user-directed'
	readonly key: 'q4'
	readonly think: boolean
	readonly frozen: RefitFile
	readonly runtime: RefitFile
	readonly budget: MatrixBudget
	readonly limits: SustainedLimits
	readonly seed: number
	readonly order: readonly SustainedArm[]
	readonly blind: number
	readonly transfer: SustainedTransfer
}

/** Binds runtime-only classification evidence to its exact scenario and judge ancestry. */
export interface SustainedClassification {
	readonly protocol: 'e1'
	readonly runtime: RefitFile
	readonly frozen: RefitFile
	readonly cache: RefitFile
	readonly files: readonly RefitFile[]
	readonly accepted: boolean
	readonly failures: readonly string[]
}

/** Binds the shared Driver to one complete continuous workload without private evaluation input. */
export interface SustainedExecution {
	readonly protocol: 'e1'
	readonly key: string
	readonly think: boolean
	readonly arm: SustainedArm
	readonly phase: 'filing' | 'development' | 'evaluation'
	readonly frozen: RefitFile
	readonly resource: RefitFile
	readonly runtime: RefitFile
	readonly budget: MatrixBudget
	readonly limits: SustainedLimits
	readonly classification?: RefitFile
	readonly fit?: RefitFile
	readonly selection?: RefitFile
	readonly policy?: RefitFile
	readonly exploration?: SustainedExploration
	readonly directed?: RefitFile
}

/** Holds a complete or explicitly refused development trajectory. */
export interface SustainedAttempt {
	readonly execution: RefitFile
	readonly run: string
	readonly files: readonly RefitFile[]
	readonly accepted: boolean
	readonly failures: readonly string[]
	readonly served: number
	readonly exposed: number
}

/** Holds one ranked candidate's feasibility evidence without answer-quality results. */
export interface SustainedCandidate {
	readonly policy?: RefitFile
	readonly exploration?: SustainedExploration
	readonly refusal?: RefitFile
	readonly key: string
	readonly frozen: RefitFile
	readonly resource: RefitFile
	readonly pilot?: RefitFile
	readonly classification?: RefitFile
	readonly fit?: RefitFile
	readonly preparation?: RefitFile
	readonly attempts: readonly SustainedAttempt[]
	readonly accepted: boolean
	readonly failures: readonly string[]
}

/** Freezes the feasibility-only choice, held-out runtime, arm order, and execution limits. */
export interface SustainedSelection {
	readonly policy?: RefitFile
	readonly protocol: 'e1'
	readonly development: RefitFile
	readonly evaluation: RefitFile
	readonly candidates: readonly SustainedCandidate[]
	readonly chosen?: string
	readonly seed: number
	readonly order: readonly SustainedArm[]
	readonly limits?: SustainedLimits
	readonly accepted: boolean
	readonly failures: readonly string[]
}

/** Holds an actual tool outcome with its live request and external source boundary. */
export interface SustainedReceipt {
	readonly goal: string
	readonly call: string
	readonly tool: string
	readonly arguments: Readonly<Record<string, unknown>>
	readonly success: boolean
	readonly content: string
	readonly after: number
	readonly version?: number
}

/** Holds the actual prior-work and external-source membership at one served read point. */
export interface SustainedObservation {
	readonly goal: string
	readonly shift: number
	readonly after: number
	readonly checkpoint: boolean
	readonly conversation: readonly string[]
	readonly sources: readonly string[]
	readonly products: readonly string[]
	readonly selected: readonly string[]
	readonly omitted: readonly string[]
	readonly history: {
		readonly arrivals: number
		readonly requests: number
		readonly products: number
		readonly tools: number
		readonly total: number
	}
	readonly exposed: boolean
	readonly complete: boolean
}

/** Holds one actual conversation message without adding expected assistant history. */
export interface SustainedMessage {
	readonly id: string
	readonly role: string
	readonly content: string
	readonly seed?: number
	readonly goal?: string
	readonly request: boolean
}

/** Holds validated raw evidence for offline auditing and phase admission. */
export interface SustainedRun {
	readonly path: string
	readonly execution: SustainedExecution
	readonly frozen: MatrixFreeze
	readonly runtime: EnduranceRuntime
	readonly status: string
	readonly rows: readonly MatrixRow[]
	readonly picks: readonly SelectionRecord[]
	readonly requests: readonly MatrixRequest[]
	readonly receipts: readonly SustainedReceipt[]
	readonly observations: readonly SustainedObservation[]
	readonly messages: readonly SustainedMessage[]
	readonly gauge: LedgerGauge | undefined
	readonly journal: readonly unknown[]
	readonly files: readonly RefitFile[]
	readonly failures: readonly string[]
	readonly costs: MatrixCosts
}

/** Holds the raw reader's operational findings alongside retained run measurements. */
export interface SustainedReading extends SustainedRun {
	readonly errors: readonly string[]
}

/** Holds derived operational errors and measured refusals from one raw request population. */
export interface SustainedBoundary {
	readonly errors: readonly string[]
	readonly failures: readonly string[]
}

/** Holds one unique preparation measurement; overlapping artifacts share its identity. */
export interface SustainedPreparation {
	readonly identity: string
	readonly phase: 'filing' | 'generation' | 'development' | 'matrix'
	readonly files: readonly RefitFile[]
	readonly costs: MatrixCosts
	readonly failures: readonly string[]
}
