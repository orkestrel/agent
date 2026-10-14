import type { RefitFile } from '../../../refit/types.js'
import type { MatrixCosts, MatrixFreeze } from '../../../matrix/types.js'

/** Holds an inert identity that no shared runtime reader is asked to accept. */
export const AUDIT_REFERENCE: RefitFile = Object.freeze({
	path: 'inert-selection.json',
	hash: 'a'.repeat(64),
})

/** Holds cost records for pure calculations, without claiming measured provider usage. */
export const AUDIT_COSTS: MatrixCosts = Object.freeze({
	metadata: { requests: 0, wall: 0 },
	wire: [],
	judge: {},
	lineage: {},
	elapsed: 10,
	stage: 6,
	flush: 5,
})

/** Holds inert frozen role settings for pure packet assembly tests. */
export const AUDIT_FREEZE: MatrixFreeze = Object.freeze({
	deployment: AUDIT_REFERENCE,
	protocol: 'l6',
	key: 'q4',
	think: false,
	decision: { model: 'inert-decision', digest: '1'.repeat(64), think: false, sampler: {} },
	summarizer: { model: 'inert-summary', digest: '2'.repeat(64), think: false, sampler: {} },
	judge: { model: 'inert-judge', digest: '3'.repeat(64), think: false, sampler: {} },
	files: [],
	settings: AUDIT_REFERENCE,
	seed: AUDIT_REFERENCE,
	configuration: { allowance: 10, retry: 0, predict: 10 },
	census: AUDIT_REFERENCE,
	tags: AUDIT_REFERENCE,
})
