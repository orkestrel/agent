import type { RefitFile } from '../../refit/types.js'

/** Holds exact fresh prerequisites for continuous-run protocol proofs. */
export interface SustainedFixture {
	readonly workload: string
	readonly runtime: string
	readonly frozen: string
	readonly resource: string
	readonly classification: string
	readonly classified: RefitFile
	readonly fit: string
}

/** Holds a reached exploratory development pair and its source-bound policy. */
export interface SustainedExploratoryFixture extends SustainedFixture {
	readonly policy: string
	readonly evaluation: string
}
