import type { ComponentReading, SupportLabel } from './types.ts'
import { isRecord } from '@orkestrel/contract'

/** Checks whether a value names a settled support state.
 * @param value - The unknown label
 * @returns True if the label belongs to the settled map; false otherwise
 * @example isSupportLabel('supported')
 */
export function isSupportLabel(value: unknown): value is SupportLabel {
	return value === 'supported' || value === 'unsupported' || value === 'contradicted' || value === 'ambiguous'
}

/** Checks whether a reading has complete finite component membership.
 * @param value - The unknown reading
 * @returns True if all score and membership fields are valid; false otherwise
 * @example isComponentReading(undefined) // false
 */
export function isComponentReading(value: unknown): value is ComponentReading {
	return isRecord(value) && typeof value.ordinal === 'number' && Number.isSafeInteger(value.ordinal) && value.ordinal > 0 && typeof value.name === 'string' && typeof value.row === 'string' && (value.pass === 'forward' || value.pass === 'reverse') && isSupportLabel(value.label) && typeof value.score === 'number' && Number.isFinite(value.score) && value.score >= 0 && value.score <= 1
}
