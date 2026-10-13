/** Reports an offline audit schema, join, custody, or adjudication refusal. */
export class SustainedAuditError extends Error {
	readonly code = 'SUSTAINED_AUDIT' as const

	/** Creates a refusal with its violated invariant.
	 * @param message - The refusal detail
	 */
	constructor(message: string) {
		super(message)
		this.name = 'SustainedAuditError'
	}
}

/** Checks whether a thrown value is an offline audit refusal.
 * @param value - The thrown value
 * @returns True if the value is an audit refusal; false otherwise
 */
export function isSustainedAuditError(value: unknown): value is SustainedAuditError {
	return value instanceof SustainedAuditError
}
