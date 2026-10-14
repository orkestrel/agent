import type { StudyFailure, StudyProfile } from '../../../core/studies/types.js'
import type { JSONValue } from '@orkestrel/contract'
import { canonicalStringify, isJSONValue } from '@orkestrel/contract'
import { createHash } from 'node:crypto'
import { StudyError } from '../../../core/studies/errors.js'

/** Projects optional domain fields into the JSON wire representation.
 * @param value - An owned domain value with optional undefined fields.
 * @returns A JSON-compatible snapshot.
 */
export function toStudyWire(value: unknown): JSONValue {
	const parsed: unknown = JSON.parse(JSON.stringify(value))
	if (!isJSONValue(parsed)) throw new StudyError('FAULT', 'Invalid study wire value')
	return parsed
}

/** Creates attributable protocol infrastructure failure.
 * @param message - The refused operation or broken boundary.
 * @returns A domain failure that never awards task credit.
 */
export function createStudyProcessFailure(message: string): StudyFailure {
	return { cause: 'infrastructure', message, role: undefined }
}

/** Binds the canonical fully resolved execution profile carried over IPC.
 * @param profile - The resolved execution settings, with optional absent leaves.
 * @returns The SHA256 digest of the canonical JSON wire representation.
 */
export function computeStudyProfileDigest(profile: StudyProfile): string {
	const encoded = canonicalStringify(toStudyWire(profile))
	if (encoded === undefined) throw new StudyError('CONFIG', 'Study profile is not JSON-compatible')
	return createHash('sha256').update(encoded).digest('hex')
}
