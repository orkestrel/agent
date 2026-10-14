import type { EnduranceAtom } from '../../endurance/types.js'
import type { MatrixRequest } from '../../matrix/types.js'
import type { SustainedLabel } from '../../sustained/audit/types.js'
import type { CallRole } from '../../types.js'
import type { ContinuousArmInterval, ContinuousAuditReading, ContinuousKey } from './types.js'

/**
 * Builds an empty tally for every rubric dimension.
 *
 * @returns One zeroed `passed`, `total`, and `ambiguous` triple per dimension
 */
export function buildDimensionTally(): Record<
	EnduranceAtom['dimension'],
	{ passed: number; total: number; ambiguous: number }
> {
	return {
		facts: { passed: 0, total: 0, ambiguous: 0 },
		work: { passed: 0, total: 0, ambiguous: 0 },
		obligations: { passed: 0, total: 0, ambiguous: 0 },
		revision: { passed: 0, total: 0, ambiguous: 0 },
		evidence: { passed: 0, total: 0, ambiguous: 0 },
	}
}

/**
 * Sums the sent requests of one role.
 *
 * @param requests - Every request record of a run
 * @param role - The role to sum
 * @returns The request count and the known prompt and completion tokens of that role
 */
export function sumRoleUsage(
	requests: readonly MatrixRequest[],
	role: CallRole,
): { readonly requests: number; readonly prompt: number; readonly completion: number } {
	const sent = requests.filter((request) => request.sent && request.role === role)
	return {
		requests: sent.length,
		prompt: sent.reduce((total, request) => total + (request.prompt ?? 0), 0),
		completion: sent.reduce((total, request) => total + (request.completion ?? 0), 0),
	}
}

/**
 * Reads the acceptable-product rate of one arm interval as a conservative and a possible fraction.
 *
 * @param interval - The arm's tally over one interval
 * @returns The low and high fractions of judged products that were fully acceptable, or 0 when none was judged
 */
export function computeAcceptableRate(interval: ContinuousArmInterval): {
	readonly low: number
	readonly high: number
} {
	if (interval.judged === 0) return { low: 0, high: 0 }
	return {
		low: interval.acceptable.low / interval.judged,
		high: interval.acceptable.high / interval.judged,
	}
}

/**
 * Reads the adjudicators' leak records per arm and separates the leaks that cite anything but a product's own text.
 *
 * @param keys - The private joins of the packet's items
 * @param labels - The root-adjudicated labels by item id
 * @param controls - The control failures the adjudication recorded
 * @returns The product-text leak count per arm, the foreign leak citations, and the missed controls
 * @remarks A c1 adjudicator judges one item without knowing the designs, so a product that names its own recap prefix or its recall tool is a property of that product, counted and reported; a leak that cites a source, a receipt, or a rubric names something the packet carried and voids the batch.
 */
export function readAuditLeaks(
	keys: readonly ContinuousKey[],
	labels: ReadonlyMap<string, SustainedLabel>,
	controls: readonly string[],
): ContinuousAuditReading {
	const leaks: Record<string, number> = {}
	const foreign: string[] = []
	for (const key of keys) {
		const label = labels.get(key.id)
		if (label === undefined || label.leaks.length === 0) continue
		leaks[key.arm] = (leaks[key.arm] ?? 0) + 1
		for (const citation of label.leaks)
			if (!/^product(:[^|]+)?\|/.test(citation)) foreign.push(`${key.id}: ${citation}`)
	}
	return { leaks, foreign, controls }
}

/**
 * Keeps the batch failures that void a c1 comparison.
 *
 * @param failures - One batch's adjudication failures
 * @returns The failures other than an identity leak or a missed ambiguous control
 * @remarks An identity leak is judged by `readAuditLeaks` on its citations, and the ambiguous control marks the one adjudicator who labeled it; a missed stale or fabricated control, or a control the packet never carried, still voids the batch because the verdict's critical rules rest on them.
 */
export function listBlockingBatchFailures(failures: readonly string[]): readonly string[] {
	return failures.filter(
		(failure) =>
			!failure.startsWith('identity leak ') && !failure.startsWith('missed ambiguous control '),
	)
}
