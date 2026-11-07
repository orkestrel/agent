import { createContract } from '@orkestrel/contract'
import { ledgerSnapshotShape, ledgerWindowShape } from './shapers.js'

/** Reads structural faults of a serialized exchange window. */
export const ledgerWindowContract = createContract(ledgerWindowShape)

/** Reads structural faults of a ledger snapshot, including its optional held exchange window. */
export const ledgerSnapshotContract = createContract(ledgerSnapshotShape)
