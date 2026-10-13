import type { JudgeQuestion } from '../../../.orkestrel/agent/instruments/harness/node_modules/@orkestrel/agent/dist/src/core/index.js'
import type { Binding, Reading } from '../aggregate-judge-counterfactual/types.ts'
import type { Span } from '../aggregate-focused-screen/types.ts'

/** Names settled support states. */
export type SupportLabel = 'supported' | 'unsupported' | 'contradicted' | 'ambiguous'
/** Names an independent request pass. */
export type RequestPass = 'forward' | 'reverse'
/** Carries an unchanged candidate with settled component labels. */
export interface Candidate {
	readonly id: string
	readonly sources: readonly unknown[]
	readonly candidate: string
	readonly whole: SupportLabel
	readonly spans: readonly (Span & { readonly label: SupportLabel })[]
}
/** Carries a fixed supported and unsafe boundary pair. */
export interface BoundaryPair {
	readonly boundary: string
	readonly supported: string
	readonly unsafe: string
}
/** Carries an exact original anchor focus. */
export interface AnchorFocus {
	readonly id: string
	readonly start: number
	readonly end: number
}
/** Carries the validated frozen population and screen composition. */
export interface Composition {
	readonly question: JudgeQuestion
	readonly rows: readonly Candidate[]
	readonly pairs: readonly BoundaryPair[]
	readonly anchor: { readonly supported: AnchorFocus; readonly unsupported: AnchorFocus }
}
/** Carries one complete atomic check without passing its labels into the request. */
export interface AtomicCheck {
	readonly name: string
	readonly row: string
	readonly category: 'focus' | 'guard'
	readonly label: SupportLabel
	readonly focus: Span | undefined
	readonly state: string
	readonly question: JudgeQuestion
}
/** Carries an ordinal and pass for one frozen atomic check. */
export interface RequestEntry {
	readonly ordinal: number
	readonly name: string
	readonly pass: RequestPass
}
/** Carries a complete request packet with exact input and runtime custody. */
export interface ScreenPacket extends Composition {
	readonly identity: string
	readonly digest: string
	readonly guard: JudgeQuestion
	readonly checks: readonly AtomicCheck[]
	readonly sequence: readonly RequestEntry[]
	readonly rendering: readonly { readonly name: string; readonly body: string }[]
	readonly bindings: readonly Binding[]
	readonly operator: string
}
/** Carries the score membership required by the added reducer. */
export interface ComponentReading extends Pick<Reading, 'ordinal' | 'name' | 'score'> {
	readonly pass: RequestPass
	readonly row: string
	readonly label: SupportLabel
}
/** Carries actual response custody and component membership. */
export interface BoundaryReading extends Reading, ComponentReading {}
/** Carries every member and the separately derived candidate minimum. */
export interface CandidateStatistic {
	readonly row: string
	readonly pass: RequestPass
	readonly label: SupportLabel
	readonly components: readonly ComponentReading[]
	readonly score: number | undefined
}
/** Carries one fixed comparison within one pass. */
export interface Comparison {
	readonly pass: RequestPass
	readonly boundary: string
	readonly supported: { readonly id: string; readonly score: number }
	readonly unsafe: { readonly id: string; readonly score: number }
	readonly exceeds: boolean
}
/** Carries incomplete measurement, complete refusal, or a complete local pass. */
export interface RankingResult {
	readonly status: 'passed' | 'refused' | 'incomplete'
	readonly statistics: readonly CandidateStatistic[]
	readonly comparisons: readonly Comparison[]
	readonly error: string | undefined
}
