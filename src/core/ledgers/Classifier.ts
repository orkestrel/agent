import type { ChoiceAnswer, Judgment, JudgmentInput, LiteralSet, Message } from '../types.js'
import type {
	ClassifierInterface,
	ClassifierOptions,
	ClassifierPhase,
	ClassifierAttempt,
	ClassifierResult,
	LedgerCategory,
	LedgerClassification,
	LedgerTopic,
} from './types.js'
import type { TokenUsage } from '@orkestrel/budget'
import {
	errorToMessage,
	isArray,
	isError,
	isString,
	parseJSONAs,
	refuseOptionKeys,
} from '@orkestrel/contract'
import { isJudgeAbortError } from '../errors.js'
import { extractLiterals, matchesJudgment, raceSignal, renderJSON, sumUsage } from '../helpers.js'
import { isJudgeError } from '../providers/errors.js'
import {
	CLASSIFIER_OPTION_KEYS,
	DECISIVE_CATEGORIES,
	LEDGER_CATEGORIES,
	LEDGER_SLICE,
	QUIET_CATEGORIES,
} from './constants.js'
import { LedgerError } from './errors.js'
import { collectQuestionKeys } from './helpers.js'

/**
 * Files messages through the conversation's judgment manager and reads their categories and corrections.
 *
 * @example
 * ```ts
 * const classifier = new Classifier(options)
 * await classifier.classify(new Set(), signal)
 * const classification = classifier.classification()
 * ```
 */
export class Classifier implements ClassifierInterface {
	readonly #options: ClassifierOptions
	#slice = 0

	/**
	 * Creates the filing engine with the ledger's handlers and calibrated questions.
	 * @param options - The conversation, judge, questions, cutoffs, and handlers
	 */
	constructor(options: ClassifierOptions) {
		refuseOptionKeys(options, CLASSIFIER_OPTION_KEYS, 'Classifier', 'ClassifierOptions')
		this.#options = options
	}

	/**
	 * Asks the judge every question the filing still lacks, in the measured order.
	 * @param requests - The request ids, which skip category questions and receive only enabled request-topic questions
	 * @param signal - The caller's signal; an abort returns a fault with completed judgments and usage
	 * @returns The judgment keys, summed usage, one attempt per logical question in asking order, and the holds this call recorded; a throw from the assign or entities handler, a scheduler rejection, or a caller abort returns the partial result with `fault`; a transient judge rejection under a live signal leaves that question undecided and sets `failure`
	 */
	async classify(requests: ReadonlySet<string>, signal: AbortSignal): Promise<ClassifierResult> {
		const results: ClassifierResult[] = []
		const fault = await this.#gather(requests, signal, results).then(
			(): Error | undefined => undefined,
			(error: unknown) => (isError(error) ? error : new Error(errorToMessage(error))),
		)
		const usage = results.reduce<TokenUsage | undefined>(
			(total, result) => (result.usage === undefined ? total : sumUsage(total, result.usage)),
			undefined,
		)
		const failure = results.find((result) => result.failure !== undefined)?.failure
		return {
			judgments: results.flatMap((result) => result.judgments),
			attempts: results.flatMap((result) => result.attempts),
			holds: results.flatMap((result) => result.holds),
			...(fault === undefined ? {} : { fault }),
			...(failure === undefined ? {} : { failure }),
			...(usage === undefined ? {} : { usage }),
		}
	}

	/**
	 * Reads the category a message is filed under.
	 * @param id - The message id
	 * @returns The assigned category, the recorded category at the cutoff, or `undefined`; a quiet winner suppressed by the user literal floor remains undecided
	 */
	category(id: string): LedgerCategory | undefined {
		const message = this.#options.conversation.message(id)
		if (message === undefined) return undefined
		const assigned = this.#options.assign(message)
		if (assigned !== undefined) return assigned
		const answer = this.#readCategories(id)
		const cutoff = this.#options.thresholds.category
		const candidates = LEDGER_CATEGORIES.flatMap((category) => {
			const probability = answer?.probabilities[category]
			return probability !== undefined && probability >= cutoff ? [{ category, probability }] : []
		})
		// The first category in `LEDGER_CATEGORIES` order with the highest probability wins a tie.
		const winner = candidates.reduce<{ category: LedgerCategory; probability: number } | undefined>(
			(best, candidate) =>
				best === undefined || candidate.probability > best.probability ? candidate : best,
			undefined,
		)?.category
		return winner !== undefined && QUIET_CATEGORIES.includes(winner) && !this.quiet(id)
			? undefined
			: winner
	}

	/**
	 * Reports whether a message files under a quiet category.
	 * @param id - The message id
	 * @returns True if the assigned category is quiet or the recorded quiet weight reaches the cutoff, except for a user message carrying an id or number; false otherwise
	 */
	quiet(id: string): boolean {
		const message = this.#options.conversation.message(id)
		if (message === undefined) return false
		const assigned = this.#options.assign(message)
		if (assigned !== undefined) return QUIET_CATEGORIES.includes(assigned)
		if (this.#weigh(id, QUIET_CATEGORIES) < this.#options.thresholds.category) return false
		if (message.role !== 'user') return true
		const literals = extractLiterals(message.content)
		return literals.ids.size + literals.numbers.size === 0
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
		// The spread visits a hole in the topic list as an undefined topic, as iteration does; `filter` skips it.
		return new Set(
			message === undefined
				? []
				: [...this.#options.topics]
						.filter(
							(topic) =>
								(this.#readNoul(this.#buildTopic(id, topic)) ?? 0) >=
								this.#options.thresholds.topic,
						)
						.map((topic) => topic.name),
		)
	}

	/**
	 * Reads the whole filing from the recorded judgments.
	 * @returns The quiet ids, categories, topics, and the amendment and supersession marks; an `amends` answer marks a pair amended when the two messages share an id or a number, and a `supersedes` answer marks it superseded and amended when they share an id that holds a letter, read from the text or named by the entities handler
	 */
	classification(): LedgerClassification {
		const messages = this.#options.conversation.messages()
		const positions = new Map(messages.map((message, at) => [message.id, at]))
		// Each message files in HEAD's call order: quiet, then category, then topics.
		const filed = messages.map((message) => ({
			id: message.id,
			quiet: this.quiet(message.id),
			category: this.category(message.id),
			topics: [...this.topics(message.id)],
		}))
		const entities = new Map<string, ReadonlySet<string>>()
		const pairs = this.#options.conversation.judgments.judgments().flatMap((judgment) => {
			const key = parseJSONAs(judgment.id, isArray)
			if (key === undefined) return []
			const [head, earlier, later] = key
			if ((head !== 'amends' && head !== 'supersedes') || !isString(earlier) || !isString(later))
				return []
			const before = this.#options.conversation.message(earlier)
			const after = this.#options.conversation.message(later)
			if (
				before === undefined ||
				after === undefined ||
				(this.#readNoul(this.#buildPair(head, earlier, later)) ?? 0) <
					this.#options.thresholds[head] ||
				this.quiet(later)
			)
				return []
			const shared =
				head === 'amends'
					? this.#sharesLiteral(extractLiterals(before.content), extractLiterals(after.content))
					: this.#sharesId(before, after, entities)
			return shared ? [{ head, earlier, later }] : []
		})
		return {
			quiet: new Set(filed.filter((one) => one.quiet).map((one) => one.id)),
			categories: new Map(
				filed.flatMap((one) =>
					one.category === undefined ? [] : [[one.id, one.category] as const],
				),
			),
			topics: new Map(filed.map((one) => [one.id, one.topics])),
			amendments: this.#sortLaters(pairs, positions),
			supersessions: this.#sortLaters(
				pairs.filter((pair) => pair.head === 'supersedes'),
				positions,
			),
		}
	}

	// Groups the later ids under each earlier id in first-seen order, each without repeats and in
	// conversation order; a stable sort keeps the first-seen order of ids at one position.
	#sortLaters(
		pairs: ReadonlyArray<{ readonly earlier: string; readonly later: string }>,
		positions: ReadonlyMap<string, number>,
	): ReadonlyMap<string, readonly string[]> {
		return new Map(
			[...Map.groupBy(pairs, (pair) => pair.earlier)].map(([earlier, grouped]) => [
				earlier,
				[...new Set(grouped.map((pair) => pair.later))].sort(
					(left, right) => (positions.get(left) ?? 0) - (positions.get(right) ?? 0),
				),
			]),
		)
	}

	// Asks every question in order, appending each answer to `results` so a throw still leaves the
	// answers completed before it.
	async #gather(
		requests: ReadonlySet<string>,
		signal: AbortSignal,
		results: ClassifierResult[],
	): Promise<void> {
		const messages = this.#options.conversation.messages()
		const asked = messages.filter((message) => this.#options.assign(message) === undefined)
		for (const message of asked) {
			if (requests.has(message.id)) continue
			if (this.#spent()) await this.#turn(signal)
			results.push(await this.#ask(this.#buildCategory(message.id), 'category', signal, results))
		}
		const quiets = new Map<string, boolean>()
		for (const message of asked) {
			if (!requests.has(message.id) && this.#readQuiet(message.id, quiets)) continue
			for (const topic of this.#options.topics) {
				if (requests.has(message.id) && topic.requested === false) continue
				if (this.#spent()) await this.#turn(signal)
				results.push(await this.#ask(this.#buildTopic(message.id, topic), 'topic', signal, results))
			}
		}
		const nears = new Map<string, ReadonlySet<string>>()
		const entities = new Map<string, ReadonlySet<string>>()
		for (const later of asked) {
			if (
				later.role !== 'user' ||
				(this.#readCategories(later.id)?.probabilities.correction ?? 0) <
					this.#options.thresholds.correction
			)
				continue
			const near = this.#readNear(later, nears, entities)
			if (near.size === 0) continue
			for (const earlier of messages) {
				if (earlier.id === later.id) break
				if (this.#spent()) await this.#turn(signal)
				if (!this.#eligible(earlier, near, quiets, nears, entities)) continue
				const spec = this.#buildPair('amends', earlier.id, later.id)
				results.push(await this.#ask(spec, 'amends', signal, results))
				if ((this.#readNoul(spec) ?? 0) >= this.#options.thresholds.amends)
					results.push(
						await this.#ask(
							this.#buildPair('supersedes', earlier.id, later.id),
							'supersedes',
							signal,
							results,
						),
					)
			}
		}
	}

	// Reports whether the slice since the last host turn has run its length; with no scheduler no clock is read.
	#spent(): boolean {
		return this.#options.scheduler !== undefined && performance.now() - this.#slice >= LEDGER_SLICE
	}

	// Hands the host a turn, raced against the signal so an abort ends it, and opens the next slice.
	async #turn(signal: AbortSignal): Promise<void> {
		const scheduler = this.#options.scheduler
		if (scheduler === undefined) return
		await raceSignal(scheduler.yield({ signal }), signal)
		this.#slice = performance.now()
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

	#collectEntities(message: Message): ReadonlySet<string> {
		const argumentsText =
			message.calls === undefined
				? undefined
				: renderJSON(message.calls.map((call) => call.arguments))
		return this.#options.entities(
			argumentsText === undefined ? message.content : `${message.content} ${argumentsText}`,
			false,
		)
	}

	// Reads a message's registry entities from this call's memo, collecting them on the first read.
	#readEntities(message: Message, entities: Map<string, ReadonlySet<string>>): ReadonlySet<string> {
		const known = entities.get(message.id)
		if (known !== undefined) return known
		const found = this.#collectEntities(message)
		entities.set(message.id, found)
		return found
	}

	#collectNear(message: Message, entities: Map<string, ReadonlySet<string>>): ReadonlySet<string> {
		return new Set([
			...this.#readEntities(message, entities),
			...(this.#options.assign(message) === undefined ? this.topics(message.id) : []),
		])
	}

	// Reads a message's near set from this call's memo, collecting it on the first read.
	#readNear(
		message: Message,
		nears: Map<string, ReadonlySet<string>>,
		entities: Map<string, ReadonlySet<string>>,
	): ReadonlySet<string> {
		const known = nears.get(message.id)
		if (known !== undefined) return known
		const near = this.#collectNear(message, entities)
		nears.set(message.id, near)
		return near
	}

	// Reads a message's quiet flag from this call's memo, reading it on the first request.
	#readQuiet(id: string, quiets: Map<string, boolean>): boolean {
		const known = quiets.get(id)
		if (known !== undefined) return known
		const quiet = this.quiet(id)
		quiets.set(id, quiet)
		return quiet
	}

	// Reports whether two texts' literals share an id or a number.
	#sharesLiteral(own: LiteralSet, other: LiteralSet): boolean {
		return (
			[...own.ids].some((id) => other.ids.has(id)) ||
			[...own.numbers].some((number) => other.numbers.has(number))
		)
	}

	// Reports whether two messages share an id that holds a letter, whether `extractLiterals` reads it
	// from the text or the entities handler names it from the registry. A number, a date, or a range
	// shares nothing on either path, so two sources that carry one clock time or one day never pair.
	#sharesId(before: Message, after: Message, entities: Map<string, ReadonlySet<string>>): boolean {
		const own = this.#collectIds(before, entities)
		return [...this.#collectIds(after, entities)].some((id) => own.has(id))
	}

	#collectIds(message: Message, entities: Map<string, ReadonlySet<string>>): ReadonlySet<string> {
		return new Set(
			[...extractLiterals(message.content).ids, ...this.#readEntities(message, entities)].filter(
				(id) => /\p{L}/u.test(id),
			),
		)
	}

	// Reports whether a correction is compared against an earlier message: the message is not quiet
	// and its near set shares a member with the correction's. The quiet flag is read first, so a
	// quiet message's near set is never read.
	#eligible(
		earlier: Message,
		near: ReadonlySet<string>,
		quiets: Map<string, boolean>,
		nears: Map<string, ReadonlySet<string>>,
		entities: Map<string, ReadonlySet<string>>,
	): boolean {
		return (
			!this.#readQuiet(earlier.id, quiets) &&
			[...this.#readNear(earlier, nears, entities)].some((topic) => near.has(topic))
		)
	}

	async #ask(
		spec: JudgmentInput,
		phase: ClassifierPhase,
		signal: AbortSignal,
		results: ClassifierResult[],
	): Promise<ClassifierResult> {
		// A recorded refusal is a held question or one a wire refused: it has no reading to cache.
		const recorded = this.#read(spec)
		if (recorded !== undefined)
			return {
				judgments: [spec.id],
				attempts: [
					{ key: spec.id, phase, outcome: recorded.refusal === undefined ? 'cached' : 'skipped' },
				],
				holds: [],
			}
		signal.throwIfAborted()
		if (spec.sources.some((id) => this.#options.conversation.message(id) === undefined))
			return { judgments: [], attempts: [{ key: spec.id, phase, outcome: 'skipped' }], holds: [] }
		const started = performance.now()
		try {
			const [judgment] = await this.#options.conversation.judgments.resolve(
				this.#options.judge,
				{ state: spec.state, questions: { [spec.id]: spec.question } },
				spec.sources,
				signal,
			)
			const attempts: readonly ClassifierAttempt[] = [
				{ key: spec.id, phase, outcome: 'resolved', duration: performance.now() - started },
			]
			return judgment === undefined
				? { judgments: [], attempts, holds: [] }
				: {
						judgments: [spec.id],
						...(judgment.usage === undefined ? {} : { usage: judgment.usage }),
						attempts,
						holds: [],
					}
		} catch (error) {
			// A rejection records its attempt in the pushed result alone, so the empty result returned under a live signal repeats none.
			const attempts: readonly ClassifierAttempt[] = [
				{
					key: spec.id,
					phase,
					outcome: isJudgeAbortError(error) || signal.aborted ? 'aborted' : 'failed',
					duration: performance.now() - started,
				},
			]
			if (isJudgeAbortError(error))
				results.push({
					judgments:
						Object.hasOwn(error.partial.answers, spec.id) ||
						(error.partial.refusals !== undefined && Object.hasOwn(error.partial.refusals, spec.id))
							? [spec.id]
							: [],
					...(error.partial.usage === undefined ? {} : { usage: error.partial.usage }),
					attempts,
					holds: [],
				})
			else results.push({ judgments: [], attempts, holds: [] })
			if (signal.aborted) throw error
			// The judge refused the question before inference, so the same question refuses again: it is
			// held as a refused judgment, which every later call and every hydrate reads as held.
			if (isJudgeError(error) && error.code === 'QUESTION') {
				this.#options.conversation.judgments.add({
					id: spec.id,
					question: spec.question,
					refusal: { missing: collectQuestionKeys(spec.question) },
					model: spec.model,
					sources: spec.sources,
					state: spec.state,
				})
				return {
					judgments: [spec.id],
					attempts: [],
					holds: [
						new LedgerError(
							'HOLD',
							`the judge refused the ${phase} question ${spec.id}, so the ledger holds it undecided until its wording, its messages, or the judge's model changes; remove the judgment to ask it again`,
							{ cause: error, context: { key: spec.id, phase, sources: spec.sources } },
						),
					],
				}
			}
			const failure = isError(error) ? error : new Error(errorToMessage(error))
			return { judgments: [], attempts: [], failure, holds: [] }
		}
	}
}
