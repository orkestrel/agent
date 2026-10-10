import { isFiniteNumber } from '@orkestrel/contract'

/**
 * Checks whether a value is finite and lies in the interval (0, 1].
 * @param value - The value to inspect
 * @returns True if the value is a valid ledger fraction; false otherwise
 * @example
 * ```ts
 * isFraction(0.8) // true
 * ```
 */
export function isFraction(value: unknown): value is number {
	return isFiniteNumber(value) && value > 0 && value <= 1
}

/**
 * Checks whether a value is a positive safe integer.
 * @param value - The value to inspect
 * @returns True if the value is a positive safe integer; false otherwise
 * @example
 * ```ts
 * isPositiveSafeInteger(4096) // true
 * ```
 */
export function isPositiveSafeInteger(value: unknown): value is number {
	return isFiniteNumber(value) && Number.isSafeInteger(value) && value > 0
}
