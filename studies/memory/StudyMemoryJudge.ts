import type { JudgeInterface, JudgeRequest, JudgeResult } from '@orkestrel/agent'
import type { StudyMemoryJudgeOptions } from './types.js'
import {
	buildStudyMemoryJudgeModel,
	buildStudyMemoryTriage,
	filterStudyMemoryResult,
} from './helpers.js'
import { STUDY_MEMORY_POLICY } from './constants.js'

/** Runs a two-step judge: one fast pass, then a second judge for what the fast pass doesn't keep. */
export class StudyMemoryJudge implements JudgeInterface {
	readonly #options: StudyMemoryJudgeOptions
	readonly id = 'memory'
	readonly name = 'memory'
	readonly model: string

	/** Binds admitted runtime primitives, serial legs, and the Study evidence sink. */
	constructor(options: StudyMemoryJudgeOptions) {
		this.#options = options
		this.model = buildStudyMemoryJudgeModel(
			STUDY_MEMORY_POLICY,
			options.first.model,
			options.second.model,
		)
	}

	/** Asks eligible choices first, then refers remaining questions without exposing rejected distributions. */
	async ask(request: JudgeRequest, signal: AbortSignal): Promise<JudgeResult> {
		const empty: JudgeResult = { model: this.model, answers: {} }
		if (signal.aborted) throw new this.#options.runtime.JudgeAbortError(empty)
		const choices = Object.fromEntries(
			Object.entries(request.questions).filter(([, question]) => question.form === 'choice'),
		)
		const first =
			Object.keys(choices).length === 0
				? empty
				: await this.#triage({ ...request, questions: choices }, signal)
		if (signal.aborted) throw new this.#options.runtime.JudgeAbortError(first)
		const remaining = Object.fromEntries(
			Object.entries(request.questions).filter(([id]) => !Object.hasOwn(first.answers, id)),
		)
		if (Object.keys(remaining).length === 0) return first
		const result = await this.#resolve(first, { ...request, questions: remaining }, signal)
		if (signal.aborted) throw new this.#options.runtime.JudgeAbortError(result)
		return result
	}

	async #resolve(
		first: JudgeResult,
		request: JudgeRequest,
		signal: AbortSignal,
	): Promise<JudgeResult> {
		try {
			const second = await this.#options.second.ask(request, signal)
			return this.#merge(first, filterStudyMemoryResult(second, Object.keys(request.questions)))
		} catch (error) {
			if (!signal.aborted) throw error
			const partial = this.#options.runtime.isJudgeAbortError(error)
				? filterStudyMemoryResult(error.partial, Object.keys(request.questions))
				: { model: this.model, answers: {} }
			throw new this.#options.runtime.JudgeAbortError(this.#merge(first, partial), { cause: error })
		}
	}

	async #triage(request: JudgeRequest, signal: AbortSignal): Promise<JudgeResult> {
		const started = performance.now()
		const outcome = await this.#attempt(request, signal)
		const decisions = Object.entries(request.questions).map(([id, question]) =>
			buildStudyMemoryTriage(id, question, outcome.result, outcome.fault && !signal.aborted),
		)
		this.#options.evidence.append('triage', {
			model: this.#options.first.model,
			ms: performance.now() - started,
			questions: decisions.map((triage) => ({ ...triage })),
			usage: outcome.result?.usage === undefined ? null : { ...outcome.result.usage },
		})
		return {
			...filterStudyMemoryResult(
				outcome.result ?? { model: this.model, answers: {} },
				decisions.filter((triage) => triage.outcome === 'kept').map((triage) => triage.id),
			),
			model: this.model,
		}
	}

	async #attempt(request: JudgeRequest, signal: AbortSignal) {
		try {
			return { result: await this.#options.first.ask(request, signal), fault: false }
		} catch (error) {
			return {
				result: this.#options.runtime.isJudgeAbortError(error) ? error.partial : undefined,
				fault: true,
			}
		}
	}

	#merge(first: JudgeResult, second: JudgeResult): JudgeResult {
		return {
			...this.#options.runtime.buildJudgeResult(this.model, [first, second]),
			model: this.model,
		}
	}
}
