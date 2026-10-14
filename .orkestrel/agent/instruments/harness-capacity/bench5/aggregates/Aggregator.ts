import type { JudgeQuestion, Message, Selection } from '../../vendor/agent-0.0.30-trimmed/index.js'
import type {
	AggregateAsked,
	AggregateAdmission,
	AggregateContext,
	AggregateDrop,
	AggregateEntry,
	AggregateFailure,
	AggregateMaintenance,
	AggregateRendering,
	AggregateRow,
	AggregateSource,
	AggregateTopic,
	AggregateTrigger,
	AggregateVersion,
	AggregatorOptions,
} from '../types.js'
import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
// The vendored build is the one import of the agent in bench5; repoint this path when a later build is vendored.
import { LEDGER_OWNER_PREFIX } from '../../vendor/agent-0.0.30-trimmed/index.js'
import { describeError, findDay } from '../helpers.js'
import { AGREE_HEAD, CHANGE_HEAD } from './constants.js'
import { Support } from './Support.js'
import { readDevelopment, readFrozen } from '../matrix/helpers.js'
import { readSustainedExploration } from '../sustained/helpers.js'
import {
	reduceSupport,
	buildChangeQuestion,
	buildChangeState,
	buildRefs,
	buildSummaryPrompt,
	checkProse,
	collectIds,
	collectStaleTokens,
	collectTopicMembers,
	collectTopicSources,
	collectTopics,
	compareSources,
	countSoleTokens,
	filterProse,
	priceText,
	renderBody,
	renderSource,
	renderSummaries,
	versionToState,
} from './helpers.js'

/**
 * Keeps one summary per desk topic and per owner, rebuilds it when its sources change, and renders the summaries that the control arm's text already carries.
 *
 * @remarks
 * `maintain` runs after the ledger files the request and before the agent reads the prompt. Desk topics and previously held owners are maintained at every read point; another owner is built when requested. Construction refuses a fit that does not separate its negatives. A maintenance error logs and withholds the topic for that read point.
 *
 * @example
 * ```ts
 * const aggregator = new Aggregator({ mirror, summarizer, judge, fit, settings, days, seeds, path, log })
 * await aggregator.maintain(request, 'g01', 47, signal)
 * const { text } = aggregator.render(selection, request, system, 'Today is Thursday 2026-10-08.', scale, admit)
 * ```
 */
export class Aggregator {
	readonly #options: AggregatorOptions
	readonly #versions = new Map<string, AggregateVersion>()
	readonly #counts = new Map<string, number>()
	readonly #gone = new Map<string, readonly string[]>()
	readonly #days = new Map<string, string>()
	readonly #withheld = new Set<string>()
	#pending: AggregateRow[] = []
	#prior = new Map<string, AggregateVersion>()
	#completed: AggregateMaintenance | undefined
	#request: string | undefined

	/**
	 * Refuses a failed fit and creates the rows directory.
	 * @param options - The mirror, summarizer, judge, cutoffs, settings, days, seed indices, rows file, and logger
	 */
	constructor(options: AggregatorOptions) {
		if (options.study?.policy !== undefined) {
			if (options.development !== undefined || options.study.arm !== 'aggregate')
				throw new Error('conflicting exploratory aggregate admission')
			const admission = readSustainedExploration(options.study, readFrozen(options.study.frozen))
			if (
				admission.fit === undefined ||
				admission.failures.length !== 0 ||
				options.fit.agree !== admission.fit.agree ||
				options.fit.change !== admission.fit.change ||
				options.fit.separated !== admission.fit.separated
			)
				throw new Error(
					'aggregate exploratory sustained admission differs from independent diagnosis',
				)
		} else if (options.development !== undefined) {
			if (options.development.arm !== 'aggregate')
				throw new Error('aggregate development arm required')
			const policy = readDevelopment(options.development, readFrozen(options.development.frozen))
			if (
				options.fit.separated ||
				options.fit.agree !== policy.agree ||
				options.fit.change !== policy.change
			)
				throw new Error('aggregate development admission differs from policy')
		} else if (!options.fit.separated)
			throw new Error('aggregate execution requires a separating fit')
		this.#options = options
		mkdirSync(dirname(options.path), { recursive: true })
	}

	/**
	 * Builds or rebuilds the summaries that the request reads.
	 *
	 * @param request - The request message, which the mirror has noted
	 * @param goal - The goal id that the rows record
	 * @param lastSeed - The index of the last seed message added
	 * @param signal - The caller's signal; an abort ends the pass without a throw
	 * @remarks
	 * A removed line rebuilds without asking CHANGE. Changed-source retention requires lexical checks and AGREE. Failed support enters the bounded rebuild path. An abort discards the pass's successful outcomes and invalidates its usable summaries.
	 */
	async maintain(
		request: Message,
		goal: string,
		lastSeed: number,
		signal: AbortSignal,
	): Promise<void> {
		this.#withheld.clear()
		this.#pending = []
		this.#prior = new Map(this.#versions)
		this.#completed = undefined
		this.#request = request.id
		try {
			signal.throwIfAborted()
			const { mirror, days, seeds } = this.#options
			const input = mirror.input()
			const projection = mirror.projection(input)
			for (const message of input.messages) {
				if (!this.#days.has(message.id)) {
					this.#days.set(message.id, findDay(days, seeds.get(message.id) ?? lastSeed)?.date ?? '')
				}
			}
			const context: AggregateContext = {
				input,
				projection,
				goal,
				lastSeed,
				asOf: findDay(days, lastSeed)?.date ?? '',
				signal,
			}
			const topics = new Map(
				collectTopics(projection, input, mirror.owners(request)).map((topic) => [topic.key, topic]),
			)
			for (const [key, version] of this.#prior) {
				if (!topics.has(key))
					topics.set(key, { key, title: version.title, owner: key.startsWith(LEDGER_OWNER_PREFIX) })
			}
			for (const topic of topics.values()) {
				signal.throwIfAborted()
				await this.#update(topic, context)
			}
			signal.throwIfAborted()
			this.#completed = { event: 'maintenance', goal, lastSeed, status: 'complete' }
			appendFileSync(
				this.#options.path,
				[...this.#pending, this.#completed].map((row) => `${JSON.stringify(row)}\n`).join(''),
			)
		} catch (error) {
			this.#options.log(`aggregate maintain ${goal}: ${describeError(error)}`)
			this.#completed = {
				event: 'maintenance',
				goal,
				lastSeed,
				status: signal.aborted ? 'aborted' : 'failed',
				error: describeError(error),
			}
			const failed = new Map([...this.#prior, ...this.#versions])
			this.#versions.clear()
			const rows: AggregateRow[] = this.#pending
				.filter((row) => row.event === 'agree' || row.event === 'change')
				.map((row) => ({ ...row, status: 'stale', result: undefined }))
			for (const [topic, version] of failed) {
				this.#withheld.add(topic)
				rows.push({
					projection: this.#pending.findLast((row) => row.topic === topic)?.projection,
					topic,
					title: version.title,
					goal,
					lastSeed,
					event: 'fail',
					version: version.version,
					status: 'failed',
					prior: versionToState(this.#prior.get(topic)),
					result: undefined,
					sources: buildRefs(version.sources, this.#options.seeds),
					ids: undefined,
					prose: undefined,
					raw: undefined,
					trigger: undefined,
					answers: {},
					failures: [],
					wall: 0,
					cached: false,
					error: describeError(error),
				})
			}
			appendFileSync(
				this.#options.path,
				[...rows, this.#completed].map((row) => `${JSON.stringify(row)}\n`).join(''),
			)
		}
	}

	/**
	 * Renders the summaries block for a prompt.
	 *
	 * @param selection - The ledger's selection; its briefing and messages are the text the control arm shows
	 * @param request - The request message
	 * @param systemText - The system text of the prompt
	 * @param dateText - The date line of the prompt
	 * @param scale - The tokens one estimate unit costs, from the ledger's gauge
	 * @param admit - Checks the complete built request without removing selected evidence
	 * @returns The block text, the topics rendered, the topics cut by the allowance, the topics withheld, the topics left without prose, the sentences filtered, the count of tokens that only the block carries, and the block price
	 * @remarks
	 * The request's owners come first, then the desk topics it names. A sentence renders only when every id, number, and name candidate occurs in the shown text, and an entry renders only when its title does. Whole entries are cut from the end until the block fits `settings.allowance`.
	 */
	render(
		selection: Selection,
		request: Message,
		systemText: string,
		dateText: string,
		scale: number,
		admit: AggregateAdmission,
	): AggregateRendering {
		const { mirror, settings } = this.#options
		const input = mirror.input()
		const projection = mirror.projection(input)
		const shown = [
			selection.briefing ?? '',
			...selection.messages.map((message) => message.content),
			systemText,
			dateText,
		].join('\n')
		const order = [
			...new Set([
				...mirror.owners(request).map((id) => `${LEDGER_OWNER_PREFIX}${id}`),
				...mirror.near(request),
			]),
		]
		const entries: AggregateEntry[] = []
		const emptied: string[] = []
		const filtered: AggregateDrop[] = []
		for (const key of order) {
			const version = this.#versions.get(key)
			if (
				version === undefined ||
				this.#completed?.status !== 'complete' ||
				this.#request !== request.id ||
				version.goal !== this.#completed.goal ||
				version.point !== this.#completed.lastSeed
			)
				continue
			const sources = collectTopicSources(
				projection,
				input,
				{ key, title: version.title, owner: key.startsWith(LEDGER_OWNER_PREFIX) },
				this.#days,
			)
			if (JSON.stringify(sources) !== JSON.stringify(version.sources)) continue
			if (countSoleTokens(version.title, shown) > 0) {
				emptied.push(key)
				continue
			}
			const kept = filterProse(version.prose, version.ids, shown)
			filtered.push(...kept.dropped.map((sentence): AggregateDrop => ({ topic: key, sentence })))
			if (kept.dropped.length > 0 || kept.prose === '') emptied.push(key)
			else
				entries.push({
					key,
					title: version.title,
					date: version.asOf,
					ids: [],
					prose: version.prose,
				})
		}
		const block = renderSummaries(
			selection.fault === undefined ? entries : [],
			settings.allowance,
			(text) => priceText(text, scale),
			admit,
		)
		return {
			states: block.kept.flatMap((entry) => {
				const state = versionToState(this.#versions.get(entry.key))
				return state === undefined ? [] : [{ topic: entry.key, state, prose: entry.prose }]
			}),
			text: block.text,
			topics: block.kept.map((entry) => entry.key),
			cut: block.cut.map((entry) => entry.key),
			withheld: order.filter((key) => this.#withheld.has(key)),
			emptied,
			filtered,
			sole: countSoleTokens(block.kept.map(renderBody).join('\n'), shown),
			tokens: block.tokens,
		}
	}

	// Decides whether the topic keeps its version, rebuilds it, or builds it first; an error withholds the topic.
	async #update(topic: AggregateTopic, context: AggregateContext): Promise<void> {
		const started = performance.now()
		let sources: readonly AggregateSource[] = []
		try {
			sources = collectTopicSources(context.projection, context.input, topic, this.#days)
			const current = this.#versions.get(topic.key)
			if (sources.length === 0) {
				if (current !== undefined) this.#retire(topic, current, context)
				return
			}
			if (current === undefined) {
				await this.#build(topic, sources, context, 'first')
				return
			}
			const { removed, arrived } = compareSources(current.sources, sources)
			if (removed.length > 0) {
				this.#forget(topic.key, removed)
				await this.#build(topic, sources, context, 'removed')
				return
			}
			if (JSON.stringify(current.sources) === JSON.stringify(sources)) {
				this.#keep(topic, current, sources, context, 'unchanged')
				return
			}
			for (const id of arrived) {
				const lines = sources.filter((source) => source.id === id)
				if (await this.#change(topic, current, lines, context)) {
					await this.#build(topic, sources, context, 'change')
					return
				}
			}
			if (this.#check(topic, current.prose, sources, context).length > 0) {
				await this.#build(topic, sources, context, 'check')
				return
			}
			if (!(await this.#support(topic, current, sources, context))) {
				await this.#build(topic, sources, context, 'check')
				return
			}
			this.#keep(topic, current, sources, context, 'retained')
		} catch (error) {
			context.signal.throwIfAborted()
			this.#options.log(`aggregate ${topic.key} at ${context.goal}: ${describeError(error)}`)
			this.#versions.delete(topic.key)
			this.#withheld.add(topic.key)
			this.#pending.push(
				this.#row(topic, context, {
					event: 'fail',
					version: this.#counts.get(topic.key) ?? 0,
					status: 'failed',
					sources: buildRefs(sources, this.#options.seeds),
					wall: performance.now() - started,
					error: describeError(error),
				}),
			)
		}
	}

	#keep(
		topic: AggregateTopic,
		current: AggregateVersion,
		sources: readonly AggregateSource[],
		context: AggregateContext,
		trigger: AggregateTrigger,
	): void {
		context.signal.throwIfAborted()
		const kept = {
			...current,
			asOf: context.asOf,
			sources,
			ids: collectIds(sources),
			goal: context.goal,
			point: context.lastSeed,
		}
		this.#versions.set(topic.key, kept)
		this.#pending.push(
			this.#row(topic, context, {
				event: 'keep',
				version: kept.version,
				status: 'current',
				result: versionToState(kept),
				sources: buildRefs(sources, this.#options.seeds),
				prose: kept.prose,
				ids: kept.ids.join(', '),
				trigger,
			}),
		)
	}

	async #support(
		topic: AggregateTopic,
		version: AggregateVersion,
		sources: readonly AggregateSource[],
		context: AggregateContext,
	): Promise<boolean> {
		const support = await new Support({ judge: this.#options.judge }).evaluate(
			version.prose,
			sources,
			context.signal,
		)
		const score = reduceSupport(support)
		const agreed = score !== undefined && score >= this.#options.fit.agree
		this.#pending.push(
			this.#row(topic, context, {
				event: 'agree',
				version: version.version,
				status: agreed ? 'current' : 'stale',
				sources: buildRefs(sources, this.#options.seeds),
				answers: score === undefined ? {} : { [AGREE_HEAD]: score },
				support,
				wall: support.wall,
				cached:
					support.components.length > 0 &&
					support.components.every((component) => component.cached),
				failures: agreed ? [] : [{ kind: 'agree', token: '' }],
				error: support.error,
			}),
		)
		context.signal.throwIfAborted()
		return agreed
	}

	// Builds the topic until a version passes the code check and AGREE, or the retries end and the topic is withheld.
	async #build(
		topic: AggregateTopic,
		sources: readonly AggregateSource[],
		context: AggregateContext,
		first: AggregateTrigger,
	): Promise<void> {
		const attempts = Math.max(0, this.#options.settings.retry) + 1
		let failures: readonly AggregateFailure[] = []
		let trigger = first
		for (let attempt = 0; attempt < attempts; attempt += 1) {
			context.signal.throwIfAborted()
			const next = (this.#counts.get(topic.key) ?? 0) + 1
			const started = performance.now()
			const prompt = buildSummaryPrompt(topic.key, topic.title, context.asOf, sources, failures)
			const result = await this.#options.summarizer.summarize(prompt, context.signal)
			const prior = this.#prior.get(topic.key)
			const version = prior?.prose === result.prose ? prior.version : next
			this.#counts.set(topic.key, Math.max(next, version))
			const draft: AggregateVersion = {
				version,
				goal: context.goal,
				point: context.lastSeed,
				title: topic.title,
				asOf: context.asOf,
				prose: result.prose,
				raw: result.raw,
				ids: collectIds(sources),
				sources,
			}
			failures = this.#check(topic, result.prose, sources, context)
			context.signal.throwIfAborted()
			let answers: Readonly<Record<string, number>> = {}
			if (failures.length === 0) {
				const agreed = await this.#support(topic, draft, sources, context)
				answers = this.#pending.at(-1)?.answers ?? {}
				failures = agreed ? [] : [{ kind: 'agree', token: '' }]
			}
			context.signal.throwIfAborted()
			this.#pending.push(
				this.#row(topic, context, {
					event: 'build',
					version,
					status: failures.length === 0 ? 'current' : 'stale',
					result: failures.length === 0 ? versionToState(draft) : undefined,
					sources: buildRefs(sources, this.#options.seeds),
					ids: draft.ids.join(', '),
					prose: draft.prose,
					raw: draft.raw,
					trigger,
					answers,
					failures,
					wall: performance.now() - started,
					cached: result.cached,
				}),
			)
			if (failures.length === 0) {
				this.#versions.set(topic.key, draft)
				return
			}
			trigger = 'retry'
		}
		this.#versions.delete(topic.key)
		this.#withheld.add(topic.key)
		this.#pending.push(
			this.#row(topic, context, {
				event: 'withhold',
				version: this.#counts.get(topic.key) ?? 0,
				status: 'withheld',
				sources: buildRefs(sources, this.#options.seeds),
				failures,
			}),
		)
	}

	// Asks CHANGE about one arriving message; a noul that reaches the cutoff reads as a change.
	async #change(
		topic: AggregateTopic,
		current: AggregateVersion,
		lines: readonly AggregateSource[],
		context: AggregateContext,
	): Promise<boolean> {
		const asked = await this.#ask(
			CHANGE_HEAD,
			[CHANGE_HEAD, lines[0]?.id ?? '', topic.key, current.version],
			buildChangeState(current, lines),
			buildChangeQuestion(topic.title),
			context.signal,
		)
		this.#pending.push(
			this.#row(topic, context, {
				event: 'change',
				version: current.version,
				status: 'current',
				sources: buildRefs(lines, this.#options.seeds),
				answers: { [CHANGE_HEAD]: asked.noul },
				wall: asked.wall,
				cached: asked.cached,
			}),
		)
		return asked.noul >= this.#options.fit.change
	}

	// Asks one noul question through the judge under the key JSON of the head, ids, and version.
	async #ask(
		head: string,
		key: ReadonlyArray<string | number>,
		state: string,
		question: JudgeQuestion,
		signal: AbortSignal,
	): Promise<AggregateAsked> {
		const { judge } = this.#options
		const id = JSON.stringify(key)
		const before = judge.stats().hits[head] ?? 0
		const started = performance.now()
		const result = await judge.ask({ state, questions: { [id]: question } }, signal)
		signal.throwIfAborted()
		const answer = result.answers[id]
		if (answer === undefined || answer.form !== 'noul')
			throw new Error(`the judge returned no noul answer for ${id}`)
		return {
			noul: answer.noul,
			cached: (judge.stats().hits[head] ?? 0) > before,
			wall: performance.now() - started,
		}
	}

	// Runs the code check against the topic's sources, the stale tokens of its messages, and the lines that left it.
	#check(
		topic: AggregateTopic,
		prose: string,
		sources: readonly AggregateSource[],
		context: AggregateContext,
	): readonly AggregateFailure[] {
		const { input, projection } = context
		const members = new Set(collectTopicMembers(projection, input, topic))
		const listed = projection.stale
			.filter((line) => members.has(line.source))
			.flatMap((line) => line.tokens)
		const stale = collectStaleTokens(
			this.#gone.get(topic.key) ?? [],
			listed,
			sources.map((source) => source.text),
		)
		return checkProse(
			prose,
			[...sources.map(renderSource), topic.title, context.asOf],
			[...input.owners.values()].flat(),
			stale,
		)
	}

	// Drops the version of a topic whose sources are all gone, and keeps the lines for the stale check.
	#retire(topic: AggregateTopic, current: AggregateVersion, context: AggregateContext): void {
		this.#forget(topic.key, current.sources)
		this.#versions.delete(topic.key)
		this.#pending.push(
			this.#row(topic, context, {
				event: 'retire',
				version: current.version,
				status: 'retired',
				trigger: 'removed',
			}),
		)
	}

	#forget(key: string, sources: readonly AggregateSource[]): void {
		this.#gone.set(key, [...(this.#gone.get(key) ?? []), ...sources.map((source) => source.text)])
	}

	// Fills the members that a question row or a withhold row leaves empty.
	#row(
		topic: AggregateTopic,
		context: AggregateContext,
		fields: Pick<AggregateRow, 'event' | 'version' | 'status'> & Partial<AggregateRow>,
	): AggregateRow {
		return {
			prior: versionToState(this.#prior.get(topic.key)),
			projection: collectTopicSources(context.projection, context.input, topic, this.#days),
			result: undefined,
			topic: topic.key,
			title: topic.title,
			goal: context.goal,
			lastSeed: context.lastSeed,
			sources: [],
			ids: undefined,
			prose: undefined,
			raw: undefined,
			trigger: undefined,
			answers: {},
			failures: [],
			wall: 0,
			cached: false,
			...fields,
		}
	}
}
