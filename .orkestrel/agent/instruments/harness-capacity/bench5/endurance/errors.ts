/** Reports a refused workload contract or custody check. */
export class EnduranceError extends Error {
	readonly code = 'ENDURANCE' as const

	/** Creates an error naming the refused invariant.
	 * @param message - Refusal detail
	 */
	constructor(message: string) {
		super(message)
		this.name = 'EnduranceError'
	}
}

/** Checks whether a thrown value is a workload refusal.
 * @param value - Thrown value
 * @returns True if the value is a workload refusal; false otherwise
 */
export function isEnduranceError(value: unknown): value is EnduranceError {
	return value instanceof EnduranceError
}
