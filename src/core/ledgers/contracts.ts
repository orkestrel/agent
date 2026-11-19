import { createContract } from '@orkestrel/contract'
import { ledgerSnapshotShape } from './shapers.js'

/** Reads structural faults of a ledger snapshot. */
export const ledgerSnapshotContract = createContract(ledgerSnapshotShape)
