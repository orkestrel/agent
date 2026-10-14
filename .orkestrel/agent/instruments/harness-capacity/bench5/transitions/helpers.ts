import type { TransitionOpportunity } from '../types.js'
import { isArray, isNumber, isRecord, isString } from '@orkestrel/contract'
import { TRANSITION_ANNOTATIONS } from './constants.js'

/**
 * Enumerates copy-1 source opportunities before any scoring or live coverage claim.
 * @param scenario - The copy-1 scenario with seed truth, read points, and lookup versions
 * @returns Ordered opportunities with surrounding read points and preserved truth-pair multiplicity
 * @remarks Semantic repetition and withdrawal annotations are bounded examples, not an exhaustive semantic classifier. A repeated assistant fact can be excluded by runtime filing. Thrown when the scenario or an annotation does not match.
 */
export function collectTransitions(scenario: unknown): readonly TransitionOpportunity[] {
	if (
		!isRecord(scenario) ||
		!isArray(scenario.seed) ||
		!isArray(scenario.goals) ||
		!isArray(scenario.lookups)
	)
		throw new Error('transition census requires copy-1 seed, goals, and lookups')
	const seed = scenario.seed
	const points = [
		...new Set(
			scenario.goals.map((goal) => {
				if (!isRecord(goal) || !isNumber(goal.after))
					throw new Error('transition goal requires an after index')
				return goal.after
			}),
		),
	].sort((left, right) => left - right)
	const opportunities: TransitionOpportunity[] = []
	for (const [index, entry] of seed.entries()) {
		if (
			!isRecord(entry) ||
			!isString(entry.content) ||
			!isRecord(entry.truth) ||
			!isArray(entry.truth.topics)
		)
			throw new Error(`transition seed ${index} lacks text or truth`)
		const base = {
			index,
			text: entry.content,
			topics: entry.truth.topics.filter(isString),
			before: points.findLast((point) => point < index),
			after: points.find((point) => point >= index),
		}
		if (entry.truth.category === 'fact' || entry.truth.category === 'rule')
			opportunities.push({ ...base, transition: 'arrival', prior: [] })
		if (entry.truth.category === 'correction')
			opportunities.push({
				...base,
				transition: 'correction',
				prior: isArray(entry.truth.amends) ? entry.truth.amends.filter(isNumber) : [],
			})
		if (isArray(entry.truth.supersedes))
			opportunities.push({
				...base,
				transition: 'supersession',
				prior: entry.truth.supersedes.filter(isNumber),
			})
		for (const annotation of TRANSITION_ANNOTATIONS.filter((one) => one.index === index)) {
			if (
				entry.content !== annotation.text ||
				annotation.prior.some((prior) => prior >= index || seed[prior] === undefined)
			)
				throw new Error(`transition annotation ${index} does not match copy 1`)
			opportunities.push({
				...base,
				transition: annotation.transition,
				prior: [...annotation.prior],
			})
		}
	}
	for (const annotation of TRANSITION_ANNOTATIONS)
		if (seed[annotation.index] === undefined)
			throw new Error(`transition annotation ${annotation.index} is missing`)
	for (const lookup of scenario.lookups) {
		if (
			!isRecord(lookup) ||
			!isNumber(lookup.from) ||
			!isString(lookup.tool) ||
			!isString(lookup.id) ||
			!isString(lookup.text)
		)
			throw new Error('transition lookup lacks version custody')
		const id = lookup.id
		const from = lookup.from
		const tools = isRecord(scenario.tools) ? scenario.tools[lookup.tool] : undefined
		const original = isRecord(tools) ? tools[id] : undefined
		if (!isString(original)) throw new Error('transition lookup lacks its original tool value')
		opportunities.push({
			transition: 'tool',
			index: from,
			prior: seed.flatMap((entry, index) =>
				isRecord(entry) && entry.role === 'tool' && entry.content === original && index < from
					? [index]
					: [],
			),
			text: lookup.text,
			topics: [id],
			before: points.findLast((point) => point < from),
			after: points.find((point) => point >= from),
			tool: lookup.tool,
			id,
		})
	}
	return opportunities.sort(
		(left, right) =>
			left.index - right.index || left.transition.localeCompare(right.transition, 'en'),
	)
}
