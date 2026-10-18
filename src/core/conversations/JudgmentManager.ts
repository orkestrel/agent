import type { JudgmentManagerInterface } from './types.js'
import type { JudgeInterface, JudgeRequest, Judgment, JudgmentInput } from '../types.js'
import { isArray, isRecord } from '@orkestrel/contract'
import { ConversationError } from './errors.js'
import { buildJudgments, requireJudgment } from './helpers.js'
import { copyJSON } from '../cloners.js'
import { JudgeAbortError, isJudgeAbortError } from '../errors.js'
import { matchesJudgment, removeEntries } from '../helpers.js'
import { isJudgeEntry, isJudgeQuestion } from '../validators.js'

/**
 * Stores judgments in insertion order and asks a judge only for unmatched question identities.
 *
 * @remarks
 * Adding an existing key replaces it without changing its insertion position. Construction
 * restores recorded times; adding stamps the current epoch milliseconds. Caller input is owned
 * through JSON on arrival, so a proxied record or request is accepted where a structured clone
 * refuses it, and records are copied on reads, so callers cannot change the stored identity
 * through nested values.
 *
 * @example
 * ```ts
 * const judgments = new JudgmentManager()
 * const records = await judgments.resolve(judge, request, ['message-a'], signal)
 * ```
 */
export class JudgmentManager implements JudgmentManagerInterface {
	readonly #judgments: Map<string, Judgment>

	/**
	 * Restores records without replacing their storage times.
	 * @param judgments - The previously stored judgments to restore. Default: an empty list
	 */
	constructor(judgments: readonly Judgment[] = []) {
		// `Array.from` visits a hole in `judgments` as an undefined record, which `requireJudgment` refuses; `map` skips it.
		this.#judgments = new Map(
			Array.from(judgments, (judgment) => requireJudgment(copyJSON(judgment))).map((owned) => [
				owned.id,
				owned,
			]),
		)
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
		// The request is owned through JSON before it is compared or sent, as the judge engine owns
		// it, so a proxied request is accepted and a caller mutating it mid-flight changes nothing.
		const state = copyJSON(request.state)
		if (!isJudgeEntry(state)) {
			throw new ConversationError(
				'JUDGMENT',
				'conversation error: the judge state is not a judge entry',
			)
		}
		const rendered = typeof state === 'string' ? state : JSON.stringify(state)
		const origins = [...sources]
		const entries = isRecord(request.questions) ? Object.entries(request.questions) : []
		const checked = entries.map(([id, raw]) => {
			const question = copyJSON(raw)
			if (!isJudgeQuestion(question)) {
				throw new ConversationError('JUDGMENT', `conversation error: question ${id} is malformed`, {
					context: { question: id },
				})
			}
			return [id, question] as const
		})
		const matched = new Map(
			checked.flatMap(([id, question]) => {
				const judgment = this.#judgments.get(id)
				return judgment !== undefined &&
					matchesJudgment(judgment, question, origins, rendered, judge.model)
					? [[id, judgment] as const]
					: []
			}),
		)
		const pending = checked.filter(([id]) => !matched.has(id))
		const added =
			pending.length === 0
				? []
				: await this.#ask(
						judge,
						{ state, questions: Object.fromEntries(pending) },
						origins,
						rendered,
						signal,
					)
		const resolved = new Map([
			...matched,
			...added.map((judgment) => [judgment.id, judgment] as const),
		])
		return entries.flatMap(([id]) => {
			const judgment = resolved.get(id)
			return judgment === undefined ? [] : [structuredClone(judgment)]
		})
	}

	// Asks the judge for the unmatched questions and stores what it answered. An aborted ask stores
	// its partial answers before it rethrows, so finished work survives the cancellation.
	async #ask(
		judge: JudgeInterface,
		unmatched: JudgeRequest,
		origins: readonly string[],
		rendered: string,
		signal: AbortSignal,
	): Promise<readonly Judgment[]> {
		if (signal.aborted) throw new JudgeAbortError({ model: judge.model, answers: {} })
		try {
			const result = await judge.ask(unmatched, signal)
			return this.add(buildJudgments(unmatched, result, origins, rendered, judge.model))
		} catch (error) {
			if (isJudgeAbortError(error))
				this.add(buildJudgments(unmatched, error.partial, origins, rendered, judge.model))
			throw error
		}
	}

	#store(input: JudgmentInput): Judgment {
		const copy = copyJSON(input)
		const judgment = requireJudgment(isRecord(copy) ? { ...copy, time: Date.now() } : copy)
		this.#judgments.set(judgment.id, judgment)
		return structuredClone(judgment)
	}
}
