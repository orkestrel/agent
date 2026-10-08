import type { Judgment, JudgmentInput, JudgmentManagerInterface } from './types.js'
import type { JudgeInterface, JudgeQuestion, JudgeRequest } from '../types.js'
import { isArray } from '@orkestrel/contract'
import { buildJudgments, matchesJudgment } from './helpers.js'
import { removeEntries } from '../helpers.js'
import { JudgeAbortError, isJudgeAbortError } from '../providers/errors.js'

/**
 * Stores judgments in insertion order and asks a judge only for unmatched question identities.
 *
 * @remarks
 * Adding an existing key replaces it without changing its insertion position. Construction
 * restores recorded times; adding stamps the current epoch milliseconds. Records are copied
 * on arrival and on reads, so callers cannot change the stored identity through nested values.
 *
 * @example
 * ```ts
 * const judgments = new JudgmentManager()
 * const records = await judgments.resolve(judge, request, ['message-a'], signal)
 * ```
 */
export class JudgmentManager implements JudgmentManagerInterface {
	readonly #judgments = new Map<string, Judgment>()

	/**
	 * Restores records without replacing their storage times.
	 * @param judgments - Previously stored judgments; defaults to an empty collection
	 */
	constructor(judgments: readonly Judgment[] = []) {
		for (const judgment of judgments) this.#judgments.set(judgment.id, structuredClone(judgment))
	}

	get count(): number {
		return this.#judgments.size
	}

	add(input: JudgmentInput): Judgment
	add(inputs: readonly JudgmentInput[]): readonly Judgment[]
	add(input: JudgmentInput | readonly JudgmentInput[]): Judgment | readonly Judgment[] {
		if (isArray(input)) return input.map((one) => this.#store(one))
		return this.#store(input)
	}

	judgment(id: string): Judgment | undefined {
		const judgment = this.#judgments.get(id)
		return judgment === undefined ? undefined : structuredClone(judgment)
	}

	judgments(): readonly Judgment[] {
		return structuredClone([...this.#judgments.values()])
	}

	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	remove(ids: string | readonly string[]): boolean {
		if (isArray(ids)) return removeEntries(ids, (id) => this.#judgments.delete(id))
		return this.#judgments.delete(ids)
	}

	clear(): void {
		this.#judgments.clear()
	}

	async resolve(
		judge: JudgeInterface,
		request: JudgeRequest,
		sources: readonly string[],
		signal: AbortSignal,
	): Promise<readonly Judgment[]> {
		const owned = structuredClone(request)
		const origins = [...sources]
		const state = typeof owned.state === 'string' ? owned.state : JSON.stringify(owned.state)
		const resolved = new Map<string, Judgment>()
		const pending: Array<readonly [string, JudgeQuestion]> = []
		for (const [id, question] of Object.entries(owned.questions)) {
			const judgment = this.#judgments.get(id)
			if (
				judgment !== undefined &&
				matchesJudgment(judgment, question, origins, state, judge.model)
			)
				resolved.set(id, judgment)
			else pending.push([id, question])
		}
		if (pending.length > 0) {
			if (signal.aborted) throw new JudgeAbortError({ model: judge.model, answers: {} })
			const sub: JudgeRequest = { state: owned.state, questions: Object.fromEntries(pending) }
			try {
				const result = await judge.ask(sub, signal)
				for (const judgment of this.add(buildJudgments(sub, result, origins, state)))
					resolved.set(judgment.id, judgment)
			} catch (error) {
				if (isJudgeAbortError(error)) this.add(buildJudgments(sub, error.partial, origins, state))
				throw error
			}
		}
		return Object.keys(owned.questions).flatMap((id) => {
			const judgment = resolved.get(id)
			return judgment === undefined ? [] : [structuredClone(judgment)]
		})
	}

	#store(input: JudgmentInput): Judgment {
		const judgment: Judgment = { ...structuredClone(input), time: Date.now() }
		this.#judgments.set(judgment.id, judgment)
		return structuredClone(judgment)
	}
}
