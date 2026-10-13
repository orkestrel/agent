import type { LedgerGauge } from '../../vendor/agent-0.0.30-trimmed/index.js'
import type { RefitFile } from '../refit/types.js'
import type {
	CallRole,
	Row,
	RunArm,
	SelectionRecord,
	Settings,
	TransitionCategory,
} from '../types.js'

/** Names the raw request's completion, measured refusal, or operational fault. */
export type MatrixOutcome = 'complete' | 'refused' | 'fault'

/** Names an explicit l6 decision configuration. */
export interface MatrixIdentity {
	readonly protocol: 'l6'
	readonly key: string
	readonly think: boolean
	readonly arm: RunArm
	readonly copy: number
}

/** Holds one immutable model role, including its actual daemon digest. */
export interface MatrixRole {
	readonly model: string
	readonly digest: string
	readonly think: boolean
	readonly sampler: Readonly<Record<string, number>>
}

/** Freezes the independent roles and every input before development calls. */
export interface MatrixFreeze {
	readonly deployment: RefitFile
	readonly protocol: 'l6'
	readonly key: string
	readonly think: boolean
	readonly decision: MatrixRole
	readonly summarizer: MatrixRole
	readonly judge: MatrixRole
	readonly files: readonly RefitFile[]
	readonly settings: RefitFile
	readonly seed: RefitFile
	readonly configuration: Settings
	readonly census: RefitFile
	readonly tags: RefitFile
}

/** Holds the physical and planner reservations independently. */
export interface MatrixBudget {
	readonly ceiling: number
	readonly reserve: number
	readonly window: number
	readonly predict: number
}

/** Names an invalid resource observation independently of answer quality. */
export type MatrixFailure =
	| 'usage'
	| 'length'
	| 'truncation'
	| 'capacity'
	| 'completion'
	| 'request'
	| 'transport'
	| 'configuration'
	| 'observation'

/** Holds the evidence for one actual sent request or an explicitly unsent observation. */
export interface MatrixRequest {
	/** Names the native signal that interrupted a sent transport before response buffering. */
	readonly abort?: 'wall' | 'caller'
	readonly started: number
	readonly buffered?: number
	readonly finished: number
	readonly capacity?: MatrixCapacity
	readonly sequence: number
	readonly role: CallRole
	readonly goal?: string
	readonly turn?: number
	readonly sent: boolean
	readonly request: unknown
	readonly response?: string
	readonly status?: number
	readonly error?: string
	readonly estimate?: number
	readonly prompt?: number
	readonly completion?: number
	readonly reason?: string
	readonly failures: readonly MatrixFailure[]
	readonly wall: number
}

/** Holds the whole-run interval against which a study deadline is validated. */
export interface MatrixInterval {
	readonly started: number
	readonly finished: number
}

/** Binds a driver invocation to frozen input and accepted phase evidence. */
export interface MatrixExecution extends MatrixIdentity {
	readonly phase: 'resource' | 'full' | 'pilot' | 'evaluation' | 'development'
	readonly development?: RefitFile
	readonly frozen: RefitFile
	readonly budget: MatrixBudget
	readonly resource?: RefitFile
	readonly full?: RefitFile
	readonly fit?: RefitFile
	readonly pilot?: RefitFile
}

/** Binds exploratory admission to retained evidence without claiming qualification. */
export interface MatrixDevelopment {
	readonly phase: 'development'
	readonly frozen: RefitFile
	readonly calibration: RefitFile
	readonly diagnosis: RefitFile
	readonly labels: RefitFile
	readonly packet: RefitFile
	readonly generation: RefitFile
	readonly resource: RefitFile
	readonly full: RefitFile
	readonly agree: number
	readonly change: 0.56
	readonly selection: 'highest-grid-majority-occurrences-and-identities'
	readonly continuation: 'failed-goal-after-xml-function-parameter-error'
	/** Permits a measured summary output cap to withhold its topic in development. Default: false. */
	readonly withhold?: boolean
	readonly limitation: 'seed-candidates-do-not-certify-diverged-history'
	readonly paired: MatrixBudget
	readonly expanded: MatrixBudget
}

/** Holds an unscored complete-trajectory attempt. */
export interface MatrixAttempt {
	readonly execution: RefitFile
	readonly run: string
	readonly budget: MatrixBudget
	readonly accepted: boolean
	readonly failures: readonly string[]
	readonly resource: boolean
	readonly files: readonly RefitFile[]
}

/** Holds a frozen reserve decision without reading answer scores. */
export interface MatrixResource {
	readonly protocol: 'l6'
	readonly frozen: RefitFile
	readonly accepted: boolean
	readonly attempts: readonly MatrixAttempt[]
	readonly budget?: MatrixBudget
}

/** Records a finite empirical full-view bound calculated before its requests. */
export interface MatrixBound {
	readonly scenario: RefitFile
	readonly copies: readonly RefitFile[]
	readonly development: readonly RefitFile[]
	readonly gauge: LedgerGauge
	readonly goals: number
	readonly turns: number
	readonly reserve: number
	readonly seed: number
	readonly requests: number
	readonly payload: number
	readonly growth: number
	readonly observed: number
	readonly window: number
	readonly limitation: string
}

/** Holds full-view preflight and the calculation that preceded it. */
export interface MatrixFull extends MatrixResource {
	readonly bound: MatrixBound
}

/** Holds accepted aggregate development custody and measured body exposure. */
export interface MatrixPilot {
	readonly protocol: 'l6'
	readonly frozen: RefitFile
	readonly resource: RefitFile
	readonly fit: RefitFile
	readonly attempt: MatrixAttempt
	readonly served: number
	readonly exposed: number
	readonly accepted: boolean
	readonly failures: readonly string[]
}

/** Holds a decoded l6 run for independent comparison and pilot checks. */
export interface MatrixRun {
	readonly path: string
	readonly execution: MatrixExecution
	readonly frozen: MatrixFreeze
	readonly status: string
	readonly rows: readonly MatrixRow[]
	readonly picks: readonly SelectionRecord[]
	readonly requests: readonly MatrixRequest[]
	readonly gauge: LedgerGauge | undefined
	readonly journal: readonly unknown[]
	readonly files: readonly RefitFile[]
	readonly failures: readonly string[]
}

/** Separates actual wire expenditure from cache reuse and elapsed maintenance. */
export interface MatrixCosts {
	readonly metadata: { readonly requests: number; readonly wall: number }
	readonly wire: ReadonlyArray<{
		readonly phase: 'calibration' | 'trajectory'
		readonly role: string
		readonly requests: number
		readonly wall: number
		readonly prompt: number
		readonly completion: number
		readonly missing: number
	}>
	readonly judge: unknown
	readonly lineage: unknown
	readonly elapsed: unknown
	readonly stage: number
	readonly flush: number
}

/** Binds the root's accepted deployment and declared model metadata, not process attestation. */
export interface MatrixDeployment {
	readonly receipt: RefitFile
	readonly executable: RefitFile
	readonly runner: RefitFile
	readonly version: string
	readonly environment: Readonly<Record<string, string>>
	readonly exclusive: true
	readonly controls: readonly RefitFile[]
	readonly models: readonly MatrixModel[]
}

/** Names an explicitly observed tag/manifest/backend mapping and its metadata ceiling. */
export interface MatrixModel {
	readonly model: string
	readonly digest: string
	readonly backend: 'llamacpp'
	readonly context: number
	readonly field: string
	readonly metadata: RefitFile
}

/** Points to the exact immediate observation; window is rederived from its raw bytes. */
export interface MatrixCapacity {
	readonly evidence: RefitFile
	readonly window?: number
	readonly wall: number
}

/** Retains even failed or partial metadata responses and the exact decision association. */
export interface MatrixSnapshot {
	readonly sequence: number
	readonly role: 'agent'
	readonly model: string
	readonly request: string
	readonly buffered: number
	readonly started: number
	readonly finished: number
	readonly status?: number
	readonly error?: string
	readonly raw: string
	readonly hash: string
}

/** Holds the goal evidence the matrix comparison consumes. */
export type MatrixRow = Pick<
	Row,
	| 'goal'
	| 'success'
	| 'reply'
	| 'partial'
	| 'error'
	| 'sole'
	| 'wall'
	| 'stage'
	| 'flush'
	| 'resource'
	| 'rendered'
	| 'summary'
	| 'scale'
	| 'tail'
	| 'briefing'
>

/** Holds one maintained, actually exposed source transition. */
export interface MatrixChain {
	readonly topic: string
	readonly before: string
	readonly after: string
	readonly prior: number
	readonly version: number
	readonly transitions: readonly TransitionCategory[]
	readonly retained: boolean
}

/** Holds one blinded answer judgment with exact packet custody. */
export interface MatrixLabel {
	readonly id: string
	readonly verdict: 'pass' | 'fail' | 'ambiguous'
	readonly evidence: string
}

/** Binds blind answer adjudication to the immutable packet. */
export interface MatrixLabels {
	readonly authority: 'root-adjudicated'
	readonly packet: string
	readonly labels: readonly MatrixLabel[]
}

/** Holds the private join from a blind answer to its exact run and goal. */
export interface MatrixKey {
	readonly id: string
	readonly run: string
	readonly goal: string
	readonly files: readonly RefitFile[]
}
