import { isInstance } from '@orkestrel/contract'

/**
 * Reports a selection configuration that `createSelection` refuses, carrying the
 * machine-readable `code` `'THRESHOLD' | 'LIMIT'`.
 *
 * @remarks
 * A `needed` threshold outside the interval above 0.5 up to and including 1, a non-finite one
 * included, is a programmer error and throws this with `'THRESHOLD'`. A `limit` that is not a
 * nonnegative safe integer is a programmer error and throws this with `'LIMIT'`. Narrow a caught
 * value with {@link isSelectionError} and branch on `error.code`.
 */
export class SelectionError extends Error {
	/** Names the machine-readable condition — `'THRESHOLD'`: a cutoff outside the accepted interval; `'LIMIT'`: a limit that is not a nonnegative safe integer. */
	readonly code: 'THRESHOLD' | 'LIMIT'

	constructor(code: 'THRESHOLD' | 'LIMIT', message: string) {
		super(message)
		this.name = 'SelectionError'
		this.code = code
	}
}

/**
 * Narrows an unknown caught value to a {@link SelectionError} through `instanceof`, so a
 * `catch` can branch on its `code`.
 *
 * @param value - The value to test (typically a `catch` binding)
 * @returns True if `value` is a {@link SelectionError}; false otherwise
 *
 * @example
 * ```ts
 * try {
 * 	createSelection({ judge, screen, needed: { ...NEEDED_CRITERION, threshold: 0.5 }, limit: 12 })
 * } catch (error) {
 * 	if (isSelectionError(error) && error.code === 'THRESHOLD') reportCutoff()
 * }
 * ```
 */
export function isSelectionError(value: unknown): value is SelectionError {
	return isInstance(value, SelectionError)
}
