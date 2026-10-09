import type { LedgerErrorCode } from './types.js'
import { isInstance } from '@orkestrel/contract'

/**
 * Reports an invalid ledger configuration, failed calibration, or unowned request selection,
 * carrying the machine-readable `code`.
 *
 * @remarks
 * A threshold, share, capacity, limit, topic, lookup, or gauge outside its bounds is a programmer
 * error and throws this with the matching {@link LedgerErrorCode}. A calibration call that reports
 * no prompt usage throws this with `'GAUGE'`. Narrow a caught value with {@link isLedgerError} and
 * branch on `error.code`. A selection without an active `respond` call, or for a request other than
 * that call's request or a ledger note, reports `'REQUEST'` through the selection's fault.
 */
export class LedgerError extends Error {
	/** Names the machine-readable condition; the {@link LedgerErrorCode} union describes each code. */
	readonly code: LedgerErrorCode

	constructor(code: LedgerErrorCode, message: string) {
		super(message)
		this.name = 'LedgerError'
		this.code = code
	}
}

/**
 * Narrows an unknown caught value to a {@link LedgerError} through `instanceof`, so a `catch` can
 * branch on its `code`.
 *
 * @param value - The value to test (typically a `catch` binding)
 * @returns True if `value` is a {@link LedgerError}; false otherwise
 *
 * @example
 * ```ts
 * isLedgerError(new LedgerError('GAUGE', 'calibration reported no prompt usage')) // true
 * ```
 */
export function isLedgerError(value: unknown): value is LedgerError {
	return isInstance(value, LedgerError)
}
