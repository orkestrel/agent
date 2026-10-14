import type {
	EnduranceOracle,
	EnduranceRuntime,
} from '../../instruments/harness/bench5/endurance/types.js'

/** Holds immutable file custody. */
export interface CapacityFile {
	readonly path: string
	readonly hash: string
}

/** Holds the fixed capacity candidate. */
export interface CapacityProfile {
	readonly window: number
	readonly reserve: number
	readonly safety: number
	readonly timeout: number
}

/** Holds CLI input before any work begins. */
export interface CapacityOptions {
	readonly out: string
	readonly url: string
	readonly profile: 'initial' | 'extended'
	readonly plan: boolean
	readonly proof: string | undefined
}

/** Holds the external gate receipt, separate from live evidence. */
export interface CapacityProof {
	readonly passed: true
	readonly build: CapacityFile
	readonly report: CapacityFile
}

/** Holds one serial qualification cell. */
export interface CapacityCell {
	readonly key: 'q4' | 'q2'
	readonly arm: 'records' | 'compaction'
}

/** Holds the synthetic input and its public derived schema companion. */
export interface CapacityFixture {
	readonly runtime: EnduranceRuntime
	readonly oracle: EnduranceOracle
}

/** Holds child execution and exact retained exit evidence. */
export interface CapacityProcess {
	readonly args: readonly string[]
	readonly out: string
	readonly deadline: number
}

/** Holds terminal child state without erasing the signal or error. */
export interface CapacityExit {
	readonly pid: number | undefined
	readonly code: number | null
	readonly signal: string | null
	readonly expired: boolean
	readonly error: string | undefined
}

/** Holds safe aggregate evidence without product bodies. */
export interface CapacityReading {
	readonly calls: number
	readonly tokens: number
	readonly prompt: number
	readonly completion: number
	readonly roles: Readonly<Record<string, number>>
	readonly reasons: Readonly<Record<string, number>>
	readonly thinking: boolean
	readonly options: ReadonlyArray<Readonly<Record<string, unknown>>>
	readonly lookups: number
	readonly folds: number
}
