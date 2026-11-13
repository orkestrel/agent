import type { LedgerErrorCode } from './types.js'
import type { CodedErrorOptions } from '../types.js'
import { INTRINSICS, holds, isFunction, isObject } from '@orkestrel/contract'

/**
 * Reports an invalid ledger configuration, failed calibration, or unowned request selection,
 * carrying the machine-readable `code`.
 *
 * @remarks
 * A threshold, share, capacity, limit, topic, lookup, write, question, or gauge outside its bounds is a
 * programmer error and throws this with the matching {@link LedgerErrorCode}. A calibration call that reports
 * no prompt usage, or a calibration call, with the tool definitions, without them, or with the workspace text, that reports a prompt
 * over `capacity`, the head included, throws this with `'GAUGE'`; the second holds `capacity` and
 * `prompt` in its `context`. A snapshot option that `isLedgerSnapshot` refuses
 * throws this with `'SNAPSHOT'`, its `context` holding the `faults`. Narrow a caught value with {@link isLedgerError} and
 * branch on `error.code`. A selection without an active `respond` call, for a conversation other
 * than the ledger's, or for a request other than that call's request or a ledger note, reports
 * `'REQUEST'` through the selection's fault.
 */
export class LedgerError extends Error {
	/** Names the machine-readable condition; the {@link LedgerErrorCode} union describes each code. */
	readonly code: LedgerErrorCode
	/** Holds the values that locate the failure, such as the `faults` of a refused snapshot, or `undefined` when none were supplied. */
	readonly context: Readonly<Record<string, unknown>> | undefined

	/**
	 * Records the failure condition and its description.
	 *
	 * @param code - The machine-readable condition, exposed as `error.code`
	 * @param message - The human-readable description of the failure
	 * @param options - The optional {@link CodedErrorOptions}; `cause` reaches `Error.cause` only when present
	 */
	constructor(code: LedgerErrorCode, message: string, options?: CodedErrorOptions) {
		super(message, options?.cause === undefined ? undefined : { cause: options.cause })
		this.name = 'LedgerError'
		INTRINSICS.define(this, Symbol.for('@orkestrel/agent.LedgerError'), { value: this })
		this.code = code
		this.context = options?.context
	}
}

/**
 * Narrows an unknown caught value to a {@link LedgerError} through its identity brand and declared members, so a `catch` can
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
	return holds(() => {
		if (
			!(
				value instanceof Error &&
				INTRINSICS.prototype(value) !== Error.prototype &&
				INTRINSICS.describe(value, Symbol.for('@orkestrel/agent.LedgerError'))?.value === value
			)
		)
			return false
		const code = INTRINSICS.reflect.read(value, 'code')
		if (
			!(
				code === 'REQUEST' ||
				code === 'THRESHOLD' ||
				code === 'SHARE' ||
				code === 'CAPACITY' ||
				code === 'LIMIT' ||
				code === 'TOPIC' ||
				code === 'LOOKUP' ||
				code === 'GAUGE' ||
				code === 'REFERENCE' ||
				code === 'SNAPSHOT' ||
				code === 'QUESTION' ||
				code === 'WRITE' ||
				code === 'OVERFLOW'
			)
		)
			return false
		const context = INTRINSICS.reflect.read(value, 'context')
		return context === undefined || isObject(context) || isFunction(context)
	})
}
