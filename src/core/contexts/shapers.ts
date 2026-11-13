import type { ContractShape } from '@orkestrel/contract'
import {
	arrayShape,
	numberShape,
	objectShape,
	optionalShape,
	rawShape,
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

/**
 * Describes a memo input exactly: the members of a stored revision less the `id` and `time` the
 * manager mints, each taken from {@link memoShape}.
 *
 * @remarks
 * An unknown member, a missing required member, and a declared member holding `undefined` refuse, so
 * a revision `add` stores is one its own snapshot hydrates.
 */
export const memoInputShape = objectShape({
	name: memoShape.properties.name,
	description: memoShape.properties.description,
	content: memoShape.properties.content,
	origin: memoShape.properties.origin,
}) satisfies ContractShape

/**
 * Describes an instruction input exactly: a string `name` and `content`, and an optional finite
 * `priority` and string `override`.
 *
 * @remarks
 * An unknown member, a missing required member, and a declared member holding `undefined` refuse.
 */
export const instructionInputShape = objectShape({
	name: stringShape(),
	content: stringShape(),
	priority: optionalShape(numberShape()),
	override: optionalShape(stringShape()),
}) satisfies ContractShape

/**
 * Describes a skill input exactly: a string `name`, `description`, and `content`, optional `tools`
 * names, and optional `files`.
 *
 * @remarks
 * An unknown member, a missing required member, and a declared member holding `undefined` refuse.
 * Each file is the `FileInput` interface of `@orkestrel/workspace`, which publishes no guard for it,
 * so the shape admits any defined element and `createFile`, that package's own door, reads it.
 */
export const skillInputShape = objectShape({
	name: stringShape(),
	description: stringShape(),
	content: stringShape(),
	tools: optionalShape(arrayShape(stringShape())),
	files: optionalShape(arrayShape(rawShape({}))),
}) satisfies ContractShape
