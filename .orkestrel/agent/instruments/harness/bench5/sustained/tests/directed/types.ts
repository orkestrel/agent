import type { MatrixFreeze } from '../../../matrix/types.js'
import type { SustainedDirected, SustainedExecution } from '../../types.js'

/** Holds isolated offline directed custody constructed from retained public evidence. */
export interface DirectedFixture {
	readonly directory: string
	readonly path: string
	readonly directed: SustainedDirected
	readonly frozen: MatrixFreeze
	readonly execution: SustainedExecution
}
