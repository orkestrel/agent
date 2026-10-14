import type { RunArm } from '../types.js'
import type { LedgerGauge } from '../../vendor/agent-0.0.30-trimmed/index.js'

/** Holds archived-response replay observations without normalizing request bytes. */
export interface AdmissionReplay {
	readonly gauge: LedgerGauge
	readonly requests: readonly string[]
	readonly expected: readonly string[]
	readonly rows: readonly unknown[]
	readonly picks: readonly unknown[]
	readonly builds: readonly unknown[]
}

/** Holds one independent replay's treatment configuration. */
export interface AdmissionFixture {
	readonly arm: RunArm
	readonly prose: string
	readonly allowance: number
	readonly agree: boolean
	readonly complete?: boolean
}
