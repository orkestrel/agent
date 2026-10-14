/** Holds a protocol peer's inert reply data. */
export interface PeerOptions {
	readonly initial: string
	readonly retry: string
	readonly yes: number
	readonly no: number
	readonly usage: boolean
	readonly judge?: boolean
	readonly abort?: AbortController
}
import type { RefitEvidence, RefitGeneration, RefitFile } from '../../refit/types.js'

/** Holds a cache evidence mutation and whether its digest is rebound. */
export type EvidenceCase = readonly [string, RefitEvidence, boolean]

/** Holds a required custody membership mutation. */
export type MembershipCase = readonly [string, readonly RefitFile[], RefitGeneration['lineage']]

/** Holds a recorded duration boundary. */
export type DurationCase = readonly [string, number | undefined]
