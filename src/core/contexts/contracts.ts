import { createContract } from '@orkestrel/contract'
import {
	instructionInputShape,
	memoInputShape,
	memoShape,
	memoSnapshotShape,
	skillInputShape,
} from './shapers.js'

/** Reads the faults of a refused memo revision. */
export const memoContract = createContract(memoShape)

/** Reads the faults of a refused memo snapshot. */
export const memoSnapshotContract = createContract(memoSnapshotShape)

/** Admits a memo input exactly, and reads the faults of a refused one. */
export const memoInputContract = createContract(memoInputShape)

/** Admits an instruction input exactly, and reads the faults of a refused one. */
export const instructionInputContract = createContract(instructionInputShape)

/** Admits a skill input exactly, and reads the faults of a refused one. */
export const skillInputContract = createContract(skillInputShape)
