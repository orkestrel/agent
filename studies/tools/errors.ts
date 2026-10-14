import { isInstance } from '@orkestrel/contract'

/** Reports a refused domain operation without latching an operational study fault. */
export class StudyToolsRefusal extends Error {
	readonly code = 'REFUSED' as const
}

/**
 * Checks whether a caught error is a domain tool refusal.
 * @param value - The caught value
 * @returns True if it is a tool refusal; false otherwise
 * @example
 * ```ts
 * isStudyToolsRefusal(new StudyToolsRefusal('Path refused')) // true
 * ```
 */
export function isStudyToolsRefusal(value: unknown): value is StudyToolsRefusal {
	return isInstance(value, StudyToolsRefusal)
}
