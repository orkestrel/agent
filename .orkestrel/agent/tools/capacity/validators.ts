/** Checks whether a JSON value is an object.
 * @param value - Candidate value
 * @returns True if the value is a record; false otherwise.
 */
export function isCapacityRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Checks whether retained trajectory faults form a valid empty collection.
 * @param value - The external run faults field
 * @returns True if the field is an empty string array; false otherwise.
 */
export function isCapacityFaultless(value: unknown): value is readonly string[] {
	return (
		Array.isArray(value) &&
		value.every((fault: unknown) => typeof fault === 'string') &&
		value.length === 0
	)
}
