import type { ChoiceAnswer, Judgment, JudgmentInput, Message } from '../types.js'
import type {
	ClassifierInterface,
	ClassifierOptions,
	ClassifierResult,
	LedgerCategory,
	LedgerClassification,
	LedgerTopic,
} from './types.js'
import type { TokenUsage } from '@orkestrel/budget'
import { isArray, isError, isString, parseJSONAs } from '@orkestrel/contract'
import { isJudgeAbortError } from '../errors.js'
import { matchesJudgment, sumUsage } from '../helpers.js'
import { isJudgeError } from '../providers/errors.js'
import {
	DECISIVE_CATEGORIES,
	DETERMINISTIC_JUDGE_ERROR,
	LEDGER_CATEGORIES,
	QUIET_CATEGORIES,
} from './constants.js'
import { extractTokens, renderCauseChain } from './helpers.js'

/**
 * Files messages through the conversation's judgment manager and reads their categories and corrections.
 *
 * @example
 * ```ts
 * const classifier = new Classifier(options)
 * await classifier.classify(new Set(), signal)
 * const filing = classifier.classification()
 * ```
 */
export class Classifier implements ClassifierInterface {
	readonly #options: ClassifierOptions
	readonly #failed = new Set<string>()

	/**
	 * Creates the filing engine with the ledger's handlers and calibrated questions.
	 * @param options - The conversation, judge, questions, cutoffs, and handlers
	 */
	constructor(options: ClassifierOptions) {
		this.#options = options
	}

	/**
	 * Asks the judge every question the filing still lacks, in the measured order.
	 * @param requests - The request ids, which skip category questions and receive only enabled request-topic questions
	 * @param signal - The caller's signal; an abort returns a fault with completed judgments and usage
	 * @returns The judgment keys and summed usage; a throw from the assign or entities handler, or a caller abort, returns the partial result with `fault`; a judge rejection under a live signal leaves that question undecided and sets no `fault`
	 */
	async classify(requests: ReadonlySet<string>, signal: AbortSignal): Promise<ClassifierResult> {
		const results: ClassifierResult[] = []
		let fault: Error | undefined
		try {
			const messages = this.#options.conversation.messages()
			const asked = messages.filter((message) => this.#options.assign(message) === undefined)
			for (const message of asked) {
				if (!requests.has(message.id))
					results.push(await this.#ask(this.#buildCategory(message.id), signal, results))
			}
			for (const message of asked) {
				if (!requests.has(message.id) && this.quiet(message.id)) continue
				for (const topic of this.#options.topics) {
					if (requests.has(message.id) && topic.requested === false) continue
					results.push(await this.#ask(this.#buildTopic(message.id, topic), signal, results))
				}
			}
			for (const later of asked) {
				if (
					later.role !== 'user' ||
					(this.#readCategories(later.id)?.probabilities.correction ?? 0) <
						this.#options.thresholds.correction
				)
					continue
				const near = this.#collectNear(later)
				if (near.size === 0) continue
				for (const earlier of messages) {
					if (earlier.id === later.id) break
					if (
						this.quiet(earlier.id) ||
						![...this.#collectNear(earlier)].some((topic) => near.has(topic))
					)
						continue
					const spec = this.#buildPair('amends', earlier.id, later.id)
					results.push(await this.#ask(spec, signal, results))
					if ((this.#readNoul(spec) ?? 0) >= this.#options.thresholds.amends)
						results.push(
							await this.#ask(this.#buildPair('supersedes', earlier.id, later.id), signal, results),
						)
				}
			}
		} catch (error) {
			fault = isError(error) ? error : new Error(String(error))
		}
		let usage: TokenUsage | undefined
		for (const result of results)
			if (result.usage !== undefined) usage = sumUsage(usage, result.usage)
		return {
			judgments: results.flatMap((result) => result.judgments),
			...(fault === undefined ? {} : { fault }),
			...(usage === undefined ? {} : { usage }),
		}
	}

	/**
	 * Reads the category a message is filed under.
	 * @param id - The message id
	 * @returns The assigned category, the recorded category at the cutoff, or `undefined`
	 */
	category(id: string): LedgerCategory | undefined {
		const message = this.#options.conversation.message(id)
		if (message === undefined) return undefined
		const assigned = this.#options.assign(message)
		if (assigned !== undefined) return assigned
		const answer = this.#readCategories(id)
		let best: LedgerCategory | undefined
		let highest = this.#options.thresholds.category
		for (const [option, probability] of Object.entries(answer?.probabilities ?? {})) {
			const category = LEDGER_CATEGORIES.find((candidate) => candidate === option)
			if (
				category !== undefined &&
				probability >= highest &&
				(best === undefined || probability > highest)
			) {
				best = category
				highest = probability
			}
		}
		return best
	}

	/**
	 * Reports whether a message files under a quiet category.
	 * @param id - The message id
	 * @returns True if the assigned or recorded category is quiet; false otherwise.
	 */
	quiet(id: string): boolean {
		const message = this.#options.conversation.message(id)
		if (message === undefined) return false
		const assigned = this.#options.assign(message)
		if (assigned !== undefined) return QUIET_CATEGORIES.includes(assigned)
		return this.#weigh(id, QUIET_CATEGORIES) >= this.#options.thresholds.category
	}

	/**
	 * Reports whether a message files under a decisive category.
	 * @param id - The message id
	 * @returns True if the recorded decisive weight reaches the category cutoff; false otherwise.
	 */
	decisive(id: string): boolean {
		return this.#weigh(id, DECISIVE_CATEGORIES) >= this.#options.thresholds.category
	}

	/**
	 * Reads the topics a message concerns.
	 * @param id - The message id
	 * @returns The names of the topics whose recorded weight reaches the topic cutoff
	 */
	topics(id: string): ReadonlySet<string> {
		const message = this.#options.conversation.message(id)
		const found = new Set<string>()
		if (message === undefined) return found
		for (const topic of this.#options.topics) {
			if ((this.#readNoul(this.#buildTopic(id, topic)) ?? 0) >= this.#options.thresholds.topic)
				found.add(topic.name)
		}
		return found
	}

	/**
	 * Reads the whole filing from the recorded judgments.
	 * @returns The quiet ids, categories, topics, and the amendment and supersession marks
	 */
	classification(): LedgerClassification {
		const messages = this.#options.conversation.messages()
		const positions = new Map(messages.map((message, at) => [message.id, at]))
		const quiet = new Set<string>()
		const categories = new Map<string, LedgerCategory>()
		const topics = new Map<string, readonly string[]>()
		const amendments = new Map<string, string[]>()
		const supersessions = new Map<string, string[]>()
		for (const message of messages) {
			if (this.quiet(message.id)) quiet.add(message.id)
			const category = this.category(message.id)
			if (category !== undefined) categories.set(message.id, category)
			topics.set(message.id, [...this.topics(message.id)])
		}
		for (const judgment of this.#options.conversation.judgments.judgments()) {
			const key = parseJSONAs(judgment.id, isArray)
			if (key === undefined) continue
			const [head, earlier, later] = key
			if ((head !== 'amends' && head !== 'supersedes') || !isString(earlier) || !isString(later))
				continue
			const before = this.#options.conversation.message(earlier)
			const after = this.#options.conversation.message(later)
			if (
				before === undefined ||
				after === undefined ||
				(this.#readNoul(this.#buildPair(head, earlier, later)) ?? 0) <
					this.#options.thresholds[head]
			)
				continue
			if (head === 'amends') {
				const own = extractTokens(before.content)
				const other = extractTokens(after.content)
				if (
					![...own.ids].some((id) => other.ids.has(id)) &&
					![...own.numbers].some((number) => other.numbers.has(number))
				)
					continue
			}
			for (const map of head === 'supersedes' ? [supersessions, amendments] : [amendments]) {
				const ids = map.get(earlier) ?? []
				if (!ids.includes(later)) map.set(earlier, [...ids, later])
			}
		}
		for (const map of [amendments, supersessions])
			for (const [id, ids] of map)
				map.set(
					id,
					[...ids].sort((left, right) => (positions.get(left) ?? 0) - (positions.get(right) ?? 0)),
				)
		return { quiet, categories, topics, amendments, supersessions }
	}

	#renderState(id: string): string {
		const message = this.#options.conversation.message(id)
		return `${message?.role ?? 'unknown'}: ${message?.content ?? ''}`
	}

	#buildCategory(id: string): JudgmentInput {
		return {
			id: JSON.stringify(['category', id]),
			question: {
				form: 'choice',
				...(this.#options.questions.category.instructions === undefined
					? {}
					: { instructions: this.#options.questions.category.instructions }),
				criteria: Object.fromEntries(
					LEDGER_CATEGORIES.map((category) => [
						category,
						this.#options.questions.category.criteria[category],
					]),
				),
			},
			sources: [id],
			state: this.#renderState(id),
			model: this.#options.judge.model,
		}
	}

	#buildTopic(id: string, topic: LedgerTopic): JudgmentInput {
		return {
			id: JSON.stringify(['topic', id, topic.name]),
			question: {
				form: 'noul',
				instructions: this.#options.questions.topic,
				criteria: {
					true: `The message concerns ${topic.name}: ${topic.criterion}`,
					false: `The message does not concern ${topic.name}`,
				},
			},
			sources: [id],
			state: this.#renderState(id),
			model: this.#options.judge.model,
		}
	}

	#buildPair(head: 'amends' | 'supersedes', earlier: string, later: string): JudgmentInput {
		return {
			id: JSON.stringify([head, earlier, later]),
			question: this.#options.questions[head],
			sources: [earlier, later],
			state: `Earlier message: ${this.#renderState(earlier)}\nLater message: ${this.#renderState(later)}`,
			model: this.#options.judge.model,
		}
	}

	#read(spec: JudgmentInput): Judgment | undefined {
		const recorded = this.#options.conversation.judgments.judgment(spec.id)
		return recorded !== undefined &&
			matchesJudgment(recorded, spec.question, spec.sources, spec.state, this.#options.judge.model)
			? recorded
			: undefined
	}

	#readNoul(spec: JudgmentInput): number | undefined {
		const answer = this.#read(spec)?.answer
		return answer?.form === 'noul' ? answer.noul : undefined
	}

	#readCategories(id: string): ChoiceAnswer | undefined {
		const answer = this.#read(this.#buildCategory(id))?.answer
		return answer?.form === 'choice' ? answer : undefined
	}

	#weigh(id: string, categories: readonly LedgerCategory[]): number {
		const answer = this.#readCategories(id)
		return categories.reduce((sum, category) => sum + (answer?.probabilities[category] ?? 0), 0)
	}

	#collectNear(message: Message): ReadonlySet<string> {
		const text =
			message.calls === undefined
				? message.content
				: `${message.content} ${JSON.stringify(message.calls.map((call) => call.arguments))}`
		return new Set([
			...this.#options.entities(text, false),
			...(this.#options.assign(message) === undefined ? this.topics(message.id) : []),
		])
	}

	async #ask(
		spec: JudgmentInput,
		signal: AbortSignal,
		results: ClassifierResult[],
	): Promise<ClassifierResult> {
		if (this.#read(spec) !== undefined) return { judgments: [spec.id] }
		const fingerprint = JSON.stringify(spec)
		if (this.#failed.has(fingerprint)) return { judgments: [] }
		signal.throwIfAborted()
		try {
			const [judgment] = await this.#options.conversation.judgments.resolve(
				this.#options.judge,
				{ state: spec.state, questions: { [spec.id]: spec.question } },
				spec.sources,
				signal,
			)
			return judgment === undefined
				? { judgments: [] }
				: {
						judgments: [spec.id],
						...(judgment.usage === undefined ? {} : { usage: judgment.usage }),
					}
		} catch (error) {
			if (isJudgeAbortError(error))
				results.push({
					judgments:
						Object.hasOwn(error.partial.answers, spec.id) ||
						(error.partial.refusals !== undefined && Object.hasOwn(error.partial.refusals, spec.id))
							? [spec.id]
							: [],
					...(error.partial.usage === undefined ? {} : { usage: error.partial.usage }),
				})
			if (
				(isJudgeError(error) && error.code === 'QUESTION') ||
				DETERMINISTIC_JUDGE_ERROR.test(renderCauseChain(error))
			)
				this.#failed.add(fingerprint)
			if (signal.aborted) throw error
			return { judgments: [] }
		}
	}
}
