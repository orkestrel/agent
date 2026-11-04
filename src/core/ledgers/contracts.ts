import { createContract } from '@orkestrel/contract'
import { ledgerSnapshotShape } from './shapers.js'

/** Reads the faults of a refused ledger snapshot. */
export const ledgerSnapshotContract = createContract(ledgerSnapshotShape)
