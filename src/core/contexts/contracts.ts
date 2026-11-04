import { createContract } from '@orkestrel/contract'
import { memoShape, memoSnapshotShape } from './shapers.js'

/** Reads the faults of a refused memo revision. */
export const memoContract = createContract(memoShape)

/** Reads the faults of a refused memo snapshot. */
export const memoSnapshotContract = createContract(memoSnapshotShape)
