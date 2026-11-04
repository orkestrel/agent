import type { ContractShape } from '@orkestrel/contract'
import {
	arrayShape,
	numberShape,
	objectShape,
	optionalShape,
	stringShape,
} from '@orkestrel/contract'
import { conversationSnapshotShape } from '../conversations/shapers.js'

/**
 * Describes a ledger snapshot exactly: an unknown key refuses, so a key a later version adds never reads
 * as absent.
 *
 * @remarks
 * `isLedgerSnapshot` is the door a hydrate reads, and this shape fills a refusal's faults. What the shape
 * cannot state, that each marked id names a message of the snapshot's own conversation, is the guard's
 * alone.
 */
export const ledgerSnapshotShape = objectShape({
	conversation: conversationSnapshotShape,
	requests: arrayShape(stringShape()),
	notes: arrayShape(stringShape()),
	failures: arrayShape(stringShape()),
	gauge: optionalShape(objectShape({ scale: numberShape(), overhead: numberShape() })),
}) satisfies ContractShape
