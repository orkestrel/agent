import type {
	AggregateBundle,
	AggregateObservation,
	AggregateSource,
	AggregateSupportOptions,
} from '../types.js'
import { buildCacheKey, describeError } from '../helpers.js'
import { buildSupportPlan } from './helpers.js'
import { SUPPORT_REVISION } from './constants.js'

/** Composes exhaustive contextual checks and retains every attempted outcome. */
export class Support {
	readonly #options: AggregateSupportOptions

	constructor(options: AggregateSupportOptions) {
		this.#options = options
	}

	/** Evaluates every focus and the guard unless the caller aborts.
	 * @param candidate - Exact checked prose
	 * @param sources - Complete ordered source objects
	 * @param signal - Operational cancellation
	 * @returns Input custody and attempted component evidence, including failures
	 */
	async evaluate(
		candidate: string,
		sources: readonly AggregateSource[],
		signal: AbortSignal,
	): Promise<AggregateBundle> {
		const started = performance.now()
		const { judge, sent } = this.#options
		const components: AggregateObservation[] = []
		try {
			const plan = buildSupportPlan(candidate, sources)
			for (const component of plan.components) {
				signal.throwIfAborted()
				const id = JSON.stringify(['agree', component.id])
				const before = judge.stats().hits.agree ?? 0
				const boundary = sent?.()
				const asked = performance.now()
				let observation: AggregateObservation = {
					...component,
					key: buildCacheKey(judge.model, component.state, component.question, plan.context),
					cached: false,
					wall: 0,
				}
				try {
					const result = await judge.ask(
						{ state: component.state, questions: { [id]: component.question } },
						signal,
						plan.context,
					)
					const answer = result.answers[id]
					const score = answer?.form === 'noul' ? answer.noul : undefined
					observation = { ...observation, usage: result.usage, refusal: result.refusals?.[id] }
					if (
						score === undefined ||
						!Number.isFinite(score) ||
						score < 0 ||
						score > 1 ||
						result.refusals?.[id] !== undefined
					)
						throw new Error('required contextual score missing, refused, or invalid')
					observation = { ...observation, score }
					signal.throwIfAborted()
				} catch (error) {
					observation = { ...observation, error: describeError(error) }
				}
				components.push({
					...observation,
					cached: (judge.stats().hits.agree ?? 0) > before,
					sent: boundary === undefined ? undefined : (sent?.() ?? boundary) > boundary,
					wall: performance.now() - asked,
				})
				signal.throwIfAborted()
			}
			return { ...plan, model: judge.model, components, wall: performance.now() - started }
		} catch (error) {
			return {
				revision: SUPPORT_REVISION,
				candidate,
				sources,
				context: JSON.stringify({ revision: SUPPORT_REVISION, candidate, sources }),
				model: judge.model,
				components,
				wall: performance.now() - started,
				error: describeError(error),
			}
		}
	}
}
