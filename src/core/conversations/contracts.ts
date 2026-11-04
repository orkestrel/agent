import { createContract } from '@orkestrel/contract'
import { conversationSnapshotShape, judgmentShape, sectionShape } from './shapers.js'

/** Reads the faults of a refused judgment. */
export const judgmentContract = createContract(judgmentShape)

/** Reads the faults of a refused section. */
export const sectionContract = createContract(sectionShape)

/** Reads the faults of a refused conversation snapshot. */
export const conversationSnapshotContract = createContract(conversationSnapshotShape)
