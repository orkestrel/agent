import type { ContractShape } from '@orkestrel/contract'
import {
	arrayShape,
	numberShape,
	objectShape,
	optionalShape,
	stringShape,
} from '@orkestrel/contract'

/** Describes a stored memo revision exactly. */
export const memoShape = objectShape({
	id: stringShape(),
	name: stringShape(),
	description: stringShape(),
	content: stringShape(),
	time: numberShape(),
	origin: optionalShape(
		objectShape({
			conversation: stringShape(),
			message: optionalShape(stringShape()),
		}),
	),
}) satisfies ContractShape

/**
 * Describes a stored memo set exactly: an unknown key refuses.
 *
 * @remarks
 * `isMemoSnapshot` is the door a hydrate and a store read, and this shape fills a refusal's faults. A
 * lockstep test holds that `is` implies the guard, and on the snapshot fixtures the converse.
 */
export const memoSnapshotShape = objectShape({
	id: stringShape(),
	memos: arrayShape(memoShape),
}) satisfies ContractShape
