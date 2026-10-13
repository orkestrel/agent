import type { AggregateSource, CacheRow } from '../../types.js'
import { buildSupportPlan } from '../../aggregates/helpers.js'
import { buildCacheKey } from '../../helpers.js'

/** Builds inert complete cache observations for exercising the real support composition. */
export function buildSupportRows(
	model: string,
	candidate: string,
	sources: readonly AggregateSource[],
	score: number,
): readonly CacheRow[] {
	const plan = buildSupportPlan(candidate, sources)
	return plan.components.map((component) => ({
		key: buildCacheKey(model, component.state, component.question, plan.context),
		model,
		context: plan.context,
		state: component.state,
		question: component.question,
		answer: { form: 'noul', noul: score },
		usage: { prompt: 30, completion: 1, total: 31 },
		wall: 20,
		origin: 'corpus',
		at: 1,
	}))
}
