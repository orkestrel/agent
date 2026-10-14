import type { EnduranceMutation } from './types.js'
import { attempt, isString } from '@orkestrel/contract'
import { isExact, isPosition } from '../validators.js'

/** Checks a frozen JSON mutation used only for offline negative controls.
 * @param value - Parsed control
 * @returns True if the mutation has a usable path and refusal; false otherwise
 */
export function isEnduranceMutation(value: unknown): value is EnduranceMutation {
	const result = attempt(
		() =>
			isExact(value, ['id', 'target', 'path', 'value', 'reason']) &&
			isString(value.id) &&
			(value.target === 'runtime' || value.target === 'oracle') &&
			Array.isArray(value.path) &&
			value.path.length > 0 &&
			value.path.every((part: unknown) => isString(part) || isPosition(part)) &&
			isString(value.reason),
	)
	return result.success && result.value
}
