import type { JudgmentManagerInterface } from './types.js'
import type {
	JudgeInterface,
	JudgeQuestion,
	JudgeRequest,
	Judgment,
	JudgmentInput,
} from '../types.js'
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
	readonly #judgments = new Map<string, Judgment>()

	/**
	 * Restores records without replacing their storage times.
	 * @param judgments - The previously stored judgments to restore. Default: an empty list
	 */
	constructor(judgments: readonly Judgment[] = []) {
		for (const judgment of judgments) {
			const owned = requireJudgment(copyJSON(judgment))
			this.#judgments.set(owned.id, owned)
		}
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
		const resolved = new Map<string, Judgment>()
		const pending: Array<readonly [string, JudgeQuestion]> = []
		for (const [id, raw] of entries) {
			const question = copyJSON(raw)
			if (!isJudgeQuestion(question)) {
				throw new ConversationError('JUDGMENT', `conversation error: question ${id} is malformed`)
			}
			const judgment = this.#judgments.get(id)
			if (
				judgment !== undefined &&
				matchesJudgment(judgment, question, origins, rendered, judge.model)
			)
				resolved.set(id, judgment)
			else pending.push([id, question])
		}
		if (pending.length > 0) {
			if (signal.aborted) throw new JudgeAbortError({ model: judge.model, answers: {} })
			const unmatched: JudgeRequest = { state, questions: Object.fromEntries(pending) }
			try {
				const result = await judge.ask(unmatched, signal)
				for (const judgment of this.add(
					buildJudgments(unmatched, result, origins, rendered, judge.model),
				))
					resolved.set(judgment.id, judgment)
			} catch (error) {
				if (isJudgeAbortError(error))
					this.add(buildJudgments(unmatched, error.partial, origins, rendered, judge.model))
				throw error
			}
		}
		return entries.flatMap(([id]) => {
			const judgment = resolved.get(id)
			return judgment === undefined ? [] : [structuredClone(judgment)]
		})
	}

	#store(input: JudgmentInput): Judgment {
		const copy = copyJSON(input)
		const judgment = requireJudgment(isRecord(copy) ? { ...copy, time: Date.now() } : copy)
		this.#judgments.set(judgment.id, judgment)
		return structuredClone(judgment)
	}
}
