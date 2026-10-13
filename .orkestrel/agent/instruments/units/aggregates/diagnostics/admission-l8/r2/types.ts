import type { Binding, Packet, Reading } from '../aggregate-judge-counterfactual/types.ts'

/** Carries the frozen screen and its preparation custody. */
export interface ScreenPacket extends Packet {
	readonly specification: Binding
	readonly predecessor: Binding
	readonly operator: string
}

/** Carries the score fields required by the fixed ranking screen. */
export type RankingReading = Pick<Reading, 'ordinal' | 'name' | 'score'>

/** Carries each supported-versus-unsupported comparison without averaging. */
export interface Comparison {
	readonly pass: 'forward' | 'reverse'
	readonly name: string
	readonly supported: number
	readonly unsupported: number
	readonly exceeds: boolean
}

/** Carries local discrimination, complete refusal, or incomplete measurement. */
export interface RankingResult {
	readonly status: 'passed' | 'refused' | 'incomplete'
	readonly comparisons: readonly Comparison[]
}
