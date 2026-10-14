import type { StudyToolsInput } from './types.js'
import { cloneJSONValue } from '@orkestrel/contract'
import { StudyError } from '../../../core/studies/errors.js'
import { isStudyToolsInput } from './validators.js'

/**
 * Parses a public tools workload into an owned validated JSON snapshot.
 * @param value - The unknown goal input
 * @returns The independently frozen workload
 * @throws StudyError - Thrown when the workload is malformed or unreadable
 * @example
 * ```ts
 * parseStudyToolsInput(goal.input)
 * ```
 */
export function parseStudyToolsInput(value: unknown): StudyToolsInput {
	try {
		if (!isStudyToolsInput(value)) throw new StudyError('CONFIG', 'Invalid tools workload')
		const owned = cloneJSONValue(value)
		if (isStudyToolsInput(owned)) return owned
	} catch {
		throw new StudyError('CONFIG', 'Invalid or unreadable tools workload')
	}
	throw new StudyError('CONFIG', 'Invalid tools workload snapshot')
}
