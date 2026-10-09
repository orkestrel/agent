import type { AgentInterface, AgentResult } from '../agents/types.js'
import type { Selection } from '../contexts/types.js'
import type { ConversationInterface } from '../conversations/types.js'
import type { ProviderInterface } from '../providers/types.js'
import type { Message, ThinkingReplay } from '../types.js'
import type {
	ClassifierResult,
	GaugeCall,
	LedgerCategory,
	LedgerGauge,
	LedgerInterface,
	LedgerLine,
	LedgerLookupReading,
	LedgerNote,
	LedgerOptions,
	LedgerProjection,
	LedgerProjectionInput,
	LedgerRecord,
	LedgerResult,
	LedgerShare,
} from './types.js'
import type { TokenUsage } from '@orkestrel/budget'
import type { ToolCall, ToolContext, ToolResult } from '@orkestrel/tool'
import { createAbort } from '@orkestrel/abort'
import { attempt, canonicalStringify, isError, isFiniteNumber, isString } from '@orkestrel/contract'
import { createTool, createToolManager } from '@orkestrel/tool'
import { createAgent } from '../agents/factories.js'
import { AgentError } from '../agents/errors.js'
import { estimateMessages } from '../agents/helpers.js'
import { createScope } from '../contexts/factories.js'
import { createConversationManager } from '../conversations/factories.js'
import { collectExchanges, collectToolGroups } from '../conversations/helpers.js'
import { joinThinking, stripThinking, sumUsage } from '../helpers.js'
import { Classifier } from './Classifier.js'
import { Gauge } from './Gauge.js'
import {
	DEFAULT_LEDGER_LIMIT,
	DEFAULT_LEDGER_SHARE,
	DEFAULT_RECALL_LIMIT,
	LEDGER_NOTES,
	LEDGER_OWNER_PREFIX,
	LEDGER_RULES_KEY,
	LEDGER_SCALE_DRIFT,
} from './constants.js'
import { isLedgerError, LedgerError } from './errors.js'
import {
	buildLines,
	buildRecords,
	collectNames,
	collectRegistry,
	computeThinking,
	cutListing,
	extractTokens,
	linkOwners,
	matchEntities,
	rankLedgerCut,
	resolvePredict,
	resolveLedgerCall,
	matchesCutLine,
	renderLedgerPinned,
	renderLedgerRecord,
	renderStub,
	selectRecords,
	splitTopic,
	splitSentences,
} from './helpers.js'

/**
 * Serves one conversation through classified records, a bounded briefing, and a final answer pass.
 * @example
 * ```ts
 * const ledger = new Ledger(provider, options)
 * ledger.conversation.add({ role: 'user', content: 'The refund needs approval.' })
 * const reply = await ledger.respond('What approval is needed?')
 * ```
 */
export class Ledger implements LedgerInterface {
	readonly #provider: ProviderInterface
	readonly #options: LedgerOptions
	readonly #replay: ThinkingReplay
	readonly #predict: number
	readonly #notes: LedgerNote
	readonly #share: LedgerShare
	readonly #conversation: ConversationInterface
	readonly #agent: AgentInterface
	readonly #classifier: Classifier
	readonly #requests = new Set<string>()
	readonly #annotations = new Set<string>()
	readonly #results = new Map<string, ToolResult>()
	readonly #pending = new Map<number, ToolResult>()
	readonly #answered = new Set<string>()
	readonly #recalled = new Map<string, ReadonlyMap<string, string>>()
	#request: Message | undefined
	#entered: Selection | undefined
	#selected: Selection | undefined
	#boundary = 0
	#gauge: Gauge | undefined
	#calls: GaugeCall[] = []
	#position: number | undefined
	#active = false
	#recalls = 0
	#closed = false
	#usage: TokenUsage | undefined

	/**
	 * Composes the conversation, classifier, tools, and agent.
	 * @param provider - The provider that serves the conversation
	 * @param options - The filing policy, capacity, and request bounds
	 * @throws {LedgerError} Thrown when a threshold, share, capacity, limit, topic, lookup, or gauge is invalid
	 * @throws {LedgerError} Thrown when `predict` is not a nonnegative safe integer less than `capacity` (code `'CAPACITY'`)
	 */
	constructor(provider: ProviderInterface, options: LedgerOptions) {
		for (const key of ['category', 'topic', 'correction', 'amends', 'supersedes'] as const) {
			const value = options.thresholds[key]
			if (!isFiniteNumber(value) || value <= 0 || value > 1)
				throw new LedgerError('THRESHOLD', 'thresholds must be finite and in (0, 1]')
		}
		for (const value of Object.values(options.share ?? {})) {
			if (!isFiniteNumber(value) || value <= 0 || value > 1)
				throw new LedgerError('SHARE', 'shares must be finite and in (0, 1]')
		}
		if (!Number.isSafeInteger(options.capacity) || options.capacity <= 0)
			throw new LedgerError('CAPACITY', 'capacity must be a positive safe integer')
		this.#predict = resolvePredict(options.predict, options.capacity)
		for (const value of [options.recall?.limit, options.agent?.limit]) {
			if (value !== undefined && (!Number.isSafeInteger(value) || value < 0))
				throw new LedgerError('LIMIT', 'limits must be nonnegative safe integers')
		}
		const topics = new Set<string>()
		for (const topic of options.topics) {
			if (topic.name.trim() === '' || topics.has(topic.name))
				throw new LedgerError('TOPIC', 'topic names must be nonempty and unique')
			topics.add(topic.name)
		}
		const lookups = new Set(['recall'])
		for (const lookup of options.lookups ?? []) {
			if (lookups.has(lookup.tool.name))
				throw new LedgerError('LOOKUP', 'lookup names must be unique and cannot be recall')
			lookups.add(lookup.tool.name)
		}
		this.#provider = provider
		this.#replay = provider.replay ?? 'none'
		this.#options = options
		this.#notes = { ...LEDGER_NOTES, ...options.notes }
		this.#share = { ...DEFAULT_LEDGER_SHARE, ...options.share }
		if (options.gauge !== undefined)
			this.#gauge = new Gauge({
				...options.gauge,
				capacity: options.capacity,
				predict: this.#predict,
				replay: this.#replay,
			})
		const conversations = createConversationManager()
		this.#conversation = conversations.add()
		conversations.switch(this.#conversation.id)
		this.#classifier = new Classifier({
			conversation: this.#conversation,
			judge: options.judge,
			questions: options.questions,
			thresholds: options.thresholds,
			topics: options.topics,
			assign: this.#assign.bind(this),
			entities: (text, partial) =>
				matchEntities(collectRegistry(this.#readLookups()), text, partial),
		})
		const tools = createToolManager()
		for (const lookup of options.lookups ?? []) {
			tools.add(
				createTool({
					name: lookup.tool.name,
					...(lookup.tool.parameters === undefined ? {} : { parameters: lookup.tool.parameters }),
					...(lookup.tool.description === undefined
						? {}
						: { description: lookup.tool.description }),
					...(lookup.tool.summary === undefined ? {} : { summary: lookup.tool.summary }),
					...(lookup.tool.title === undefined ? {} : { title: lookup.tool.title }),
					...(lookup.tool.annotations === undefined
						? {}
						: { annotations: lookup.tool.annotations }),
					execute: (args, context) => this.#lookup(lookup.tool.name, args, context),
				}),
			)
		}
		tools.add(
			createTool({
				name: 'recall',
				description:
					options.recall?.description ??
					`Recall what the full conversation record holds on a topic: an owner name, an id, or one of the desk topics ${options.topics.map((topic) => topic.name).join(', ')}. Returns source lines, newest first.`,
				parameters: {
					type: 'object',
					properties: {
						topic: { type: 'string', description: 'An owner name, an id, or a desk topic' },
					},
					required: ['topic'],
				},
				execute: (args) => this.#recall(args),
			}),
		)
		this.#agent = createAgent(provider, {
			...options.agent,
			conversations,
			system: options.system,
			tools,
			limit: options.agent?.limit ?? DEFAULT_LEDGER_LIMIT,
			strict: false,
			select: (_conversation, request, signal) => this.#select(request, signal),
		})
		this.#agent.emitter.on('tool', (_call, result) => {
			this.#flush()
			this.#pending.set(this.#conversation.messages().length, result)
			if (!result.success && result.error === this.#notes.repeat) {
				this.#closed = true
				this.#agent.abort('repeat')
			}
		})
		this.#agent.emitter.on('select', (selection) => {
			if (isLedgerError(selection.fault) && selection.fault.code === 'REQUEST') return
			this.#selected = selection
			this.#boundary = this.#conversation.messages().length
			if (selection.usage !== undefined) this.#usage = sumUsage(this.#usage, selection.usage)
		})
		this.#agent.emitter.on('turn', () => this.#observeTurn())
		this.#agent.emitter.on('usage', (usage) => {
			this.#usage = sumUsage(this.#usage, usage)
			const last = this.#calls.at(-1)
			if (last !== undefined)
				this.#calls[this.#calls.length - 1] = {
					...last,
					prompt: usage.prompt,
					completion: usage.completion,
				}
		})
	}

	/**
	 * Returns the owned request engine.
	 * @returns The engine serving this conversation
	 */
	get agent(): AgentInterface {
		return this.#agent
	}
	/**
	 * Returns the owned message history.
	 * @returns The history filed and served by this ledger
	 */
	get conversation(): ConversationInterface {
		return this.#conversation
	}
	/**
	 * Returns the stored prompt price.
	 * @returns The scale and fixed cost, or undefined before calibration
	 */
	get gauge(): LedgerGauge | undefined {
		return this.#gauge === undefined
			? undefined
			: { scale: this.#gauge.scale, fixed: this.#gauge.fixed }
	}

	/**
	 * Measures message scale and tool overhead from provider prompt usage.
	 * @param signal - The signal bounding both calibration calls; an abort rejects with its reason
	 * @returns The stored scale and fixed cost
	 * @throws {LedgerError} Thrown when either call reports no prompt usage, or a prompt usage of 0 or less (code `'GAUGE'`)
	 * @throws {AgentError} Thrown when a request or calibration is active (code `'CONCURRENCY'`)
	 */
	async calibrate(signal: AbortSignal): Promise<LedgerGauge> {
		if (this.#active) throw new AgentError('CONCURRENCY', 'a ledger request is already active')
		this.#active = true
		try {
			return await this.#measureGauge(signal)
		} finally {
			this.#active = false
		}
	}

	async #measureGauge(signal: AbortSignal): Promise<LedgerGauge> {
		try {
			const messages = stripThinking(
				[
					{ id: 'system', role: 'system', content: this.#options.system },
					...this.#conversation.view(),
					{ id: 'calibration', role: 'user', content: '' },
				],
				this.#replay,
			).slice(0, -1)
			const priced = await this.#provider.generate(
				messages,
				signal,
				this.#agent.context.tools.definitions(),
				{ think: false },
			)
			const bare = await this.#provider.generate(messages, signal, undefined, { think: false })
			if (
				!isFiniteNumber(priced.usage?.prompt) ||
				priced.usage.prompt <= 0 ||
				!isFiniteNumber(bare.usage?.prompt) ||
				bare.usage.prompt <= 0
			)
				throw new LedgerError('GAUGE', 'calibration requires prompt usage from both calls')
			this.#gauge = new Gauge({
				capacity: this.#options.capacity,
				predict: this.#predict,
				replay: this.#replay,
				scale: bare.usage.prompt / estimateMessages(messages),
				fixed: Math.max(0, priced.usage.prompt - bare.usage.prompt),
			})
			return { scale: this.#gauge.scale, fixed: this.#gauge.fixed }
		} catch (error) {
			signal.throwIfAborted()
			throw error
		}
	}

	/**
	 * Appends a request and serves it, recovering an unfinished first pass with one answer pass.
	 * A failed calibration rejects with `LedgerError` code `'GAUGE'`.
	 * @param content - The request text
	 * @param signal - The caller's cancellation signal; an abort during calibration rejects with its reason
	 * @returns The final pass and the usage of every pass
	 * @throws {AgentError} Thrown when a request or calibration is active (code `'CONCURRENCY'`)
	 * @throws {LedgerError} Thrown when calibration fails (code `'GAUGE'`)
	 */
	async respond(content: string, signal?: AbortSignal): Promise<LedgerResult> {
		if (this.#active) throw new AgentError('CONCURRENCY', 'a ledger request is already active')
		this.#active = true
		const abort = createAbort({ ...(signal === undefined ? {} : { signal }) })
		const caller =
			this.#options.agent?.signal === undefined
				? abort.signal
				: AbortSignal.any([abort.signal, this.#options.agent.signal])
		try {
			if (this.#gauge === undefined) await this.#measureGauge(caller)
			this.#request = this.#conversation.add({ role: 'user', content })
			this.#requests.add(this.#request.id)
			this.#entered = undefined
			this.#selected = undefined
			this.#calls = []
			this.#position = undefined
			this.#recalls = 0
			this.#closed = false
			this.#answered.clear()
			this.#recalled.clear()
			const first = await this.#runPass(caller, this.#options.think)
			const passes = [first]
			if (!caller.aborted && (first.partial || first.content.trim() === '')) {
				const digest = this.#buildDigest()
				if (digest !== undefined)
					this.#annotations.add(this.#conversation.add({ role: 'user', content: digest }).id)
				this.#annotations.add(this.#conversation.add({ role: 'user', content: this.#notes.cue }).id)
				const previous = this.#agent.context.scope
				this.#agent.context.apply(
					createScope({
						name: 'answer',
						tools: [],
						select: async (_conversation, request, selecting) => {
							const selection = await this.#select(request, selecting)
							if (selection.fault !== undefined) return selection
							return {
								...selection,
								messages: selection.messages.filter(
									(message) => message.role !== 'tool' && (message.calls?.length ?? 0) === 0,
								),
							}
						},
					}),
				)
				try {
					passes.push(await this.#runPass(caller, false))
				} finally {
					this.#agent.context.apply(previous)
				}
			}
			const last = passes.at(-1) ?? first
			this.#recordThinking()
			this.#gauge?.observe(
				this.#calls,
				!last.partial && last.content.trim() !== '' ? this.#calls.at(-1) : undefined,
			)
			let usage: TokenUsage | undefined
			let thinking: string | undefined
			for (const pass of passes) {
				if (pass.usage !== undefined) usage = sumUsage(usage, pass.usage)
				if (pass.thinking !== undefined) thinking = joinThinking(thinking, pass.thinking)
			}
			return {
				content: last.content,
				partial: last.partial,
				passes,
				...(usage === undefined ? {} : { usage }),
				...(thinking === undefined ? {} : { thinking }),
			}
		} finally {
			this.#flush()
			this.#request = undefined
			this.#active = false
		}
	}

	async #runPass(signal: AbortSignal, think?: boolean): Promise<AgentResult> {
		this.#selected = undefined
		this.#boundary = this.#conversation.messages().length
		this.#usage = undefined
		try {
			return await this.#agent.generate({ signal, ...(think === undefined ? {} : { think }) })
		} catch {
			return {
				content: '',
				partial: true,
				...(this.#usage === undefined ? {} : { usage: this.#usage }),
			}
		}
	}

	#flush(): void {
		const messages = this.#conversation.messages()
		for (const [at, result] of this.#pending) {
			const message = messages[at]
			if (message?.role === 'tool') {
				this.#results.set(message.id, result)
				this.#pending.delete(at)
			}
		}
	}

	#assign(message: Message): LedgerCategory | undefined {
		this.#flush()
		if (this.#annotations.has(message.id)) return 'chatter'
		if (message.role === 'tool') {
			this.#readLookups()
			return this.#results.get(message.id)?.success === false ? 'chatter' : 'fact'
		}
		if (message.role !== 'assistant') return undefined
		if ((message.calls?.length ?? 0) > 0) return 'chatter'
		const messages = this.#conversation.messages()
		const first = messages.findIndex((one) => this.#requests.has(one.id))
		return first >= 0 && messages.findIndex((one) => one.id === message.id) > first
			? 'chatter'
			: undefined
	}

	#readLookups(): readonly LedgerLookupReading[] {
		this.#flush()
		const readings: LedgerLookupReading[] = []
		for (const group of collectToolGroups(this.#conversation.messages())) {
			for (const message of group.slice(1)) {
				const call = resolveLedgerCall(group, message)
				const lookup = this.#options.lookups?.find((one) => one.tool.name === call?.name)
				if (
					call === undefined ||
					lookup === undefined ||
					this.#results.get(message.id)?.success === false
				)
					continue
				const reading = attempt(() => lookup.read(call.arguments, message.content))
				if (!reading.success) {
					this.#results.set(message.id, {
						success: false,
						id: call.id,
						name: call.name,
						error: isError(reading.error) ? reading.error.message : String(reading.error),
					})
					continue
				}
				const result = reading.value
				readings.push({
					id: message.id,
					name: call.name,
					arguments: call.arguments,
					text: message.content,
					result:
						result === undefined
							? undefined
							: {
									...result,
									ids: [
										...new Set([
											...result.ids,
											...Object.values(call.arguments)
												.filter(isString)
												.flatMap((value) => [...extractTokens(value).ids]),
										]),
									],
								},
				})
			}
		}
		return readings
	}

	#project(): { readonly input: LedgerProjectionInput; readonly projection: LedgerProjection } {
		const readings = this.#readLookups()
		const registry = collectRegistry(readings)
		const messages = this.#conversation.messages()
		const input: LedgerProjectionInput = {
			system: this.#options.system,
			exclude: [...this.#requests, ...this.#annotations],
			owners: registry.owners,
			messages,
			readings,
			entities: new Map(
				messages.map((message) => [
					message.id,
					[...matchEntities(registry, message.content, true)],
				]),
			),
			classification: this.#classifier.classification(),
		}
		return { input, projection: buildRecords(input) }
	}

	#projectLines(input: LedgerProjectionInput, projection: LedgerProjection, id: string) {
		return buildLines(
			input,
			new Map(input.messages.map((message) => [message.id, message])),
			id,
			new Set(projection.stale.map((line) => `${line.source} ${line.sentence}`)),
			[...input.owners.values()].flat(),
			collectNames(this.#options.system),
		)
	}

	#renderSource(id: string, lines: readonly LedgerLine[]): string {
		const message = this.#conversation.message(id)
		if (message === undefined) return ''
		const sentences = splitSentences(message.content)
		const text =
			sentences.length === lines.length
				? message.content
				: lines.map((line) => sentences[line.sentence] ?? '').join(' ')
		if (text === '' || message.role !== 'tool') return text
		const reading = this.#readLookups().find((one) => one.id === id)
		return reading === undefined
			? text
			: `${reading.name} ${JSON.stringify(reading.arguments)}: ${text}`
	}

	#collectAfter(): readonly Message[] {
		const messages = this.#conversation.messages()
		const start = messages.findIndex((message) => message.id === this.#request?.id)
		return messages
			.slice(start + 1)
			.filter(
				(message) =>
					message.role !== 'assistant' ||
					(message.calls?.length ?? 0) > 0 ||
					message.content.trim() !== '',
			)
	}

	async #select(request: Message, signal: AbortSignal): Promise<Selection> {
		let filing: ClassifierResult = { judgments: [] }
		try {
			if (
				!this.#active ||
				this.#request === undefined ||
				(request.id !== this.#request.id && !this.#annotations.has(request.id))
			)
				throw new LedgerError(
					'REQUEST',
					'ledger selection requires a request owned by an active respond call',
				)
			if (this.#annotations.has(request.id) && this.#entered !== undefined)
				return {
					messages: [...this.#entered.messages, ...this.#collectAfter()],
					judgments: [],
					...(this.#entered.briefing === undefined ? {} : { briefing: this.#entered.briefing }),
				}
			const selected = this.#request
			filing = await this.#classifier.classify(this.#requests, signal)
			if (filing.fault !== undefined) throw filing.fault
			const plan = this.#plan(selected)
			this.#entered = { ...plan, ...filing }
			return this.#annotations.has(request.id)
				? { ...this.#entered, messages: [...this.#entered.messages, ...this.#collectAfter()] }
				: this.#entered
		} catch (error) {
			return {
				...filing,
				messages: this.#conversation.view(),
				fault: isError(error) ? error : new Error(String(error)),
			}
		}
	}

	#plan(request: Message): Pick<Selection, 'messages' | 'briefing'> {
		const { input, projection } = this.#project()
		const registry = collectRegistry(input.readings)
		const links = linkOwners(input.readings, registry.owners)
		const near = new Set([
			...matchEntities(registry, request.content, true),
			...this.#classifier.topics(request.id),
		])
		const owners = [...near].flatMap((id) => {
			const owner = registry.owners.has(id) ? id : links.get(id)
			return owner === undefined ? [] : [owner]
		})
		const records = selectRecords(projection, { owners, topics: [...near] })
		const total =
			Math.max(
				0,
				(this.#options.capacity - this.#predict) * this.#share.prompt - (this.#gauge?.fixed ?? 0),
			) /
			(1 + LEDGER_SCALE_DRIFT)
		const tail = this.#selectTail(request, total * this.#share.tail, input)
		const cap =
			total - (this.#gauge?.scale ?? 1) * estimateMessages(stripThinking(tail, this.#replay))
		const tailIds = new Set(tail.map((message) => message.id))
		const scoped = records.some((record) => record.key !== LEDGER_RULES_KEY)
		const held = new Set(
			projection.records
				.filter((record) => scoped || record.key === LEDGER_RULES_KEY)
				.flatMap((record) => record.members),
		)
		if (records.length > 0)
			for (const record of projection.records)
				for (const id of record.members)
					if (
						this.#conversation.message(id)?.role === 'user' &&
						this.#classifier.category(id) === 'rule' &&
						this.#classifier.decisive(id)
					)
						held.add(id)
		const texts = input.messages
			.filter((message) => (message.calls?.length ?? 0) === 0)
			.map((message) => ({
				message,
				words: new Set(message.content.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []),
				names: new Set(
					[...message.content.matchAll(/(?<![\p{L}\p{N}'-])\p{Lu}\p{Ll}+(?![\p{L}\p{N}-])/gu)]
						.filter((match) => {
							const before = message.content.slice(0, match.index).trimEnd()
							return before !== '' && !/[.!?:;]$/.test(before)
						})
						.map((match) => match[0].toLowerCase()),
				),
			}))
		const asked = texts.find(({ message }) => message.id === request.id)
		const counts = new Map<string, number>()
		for (const text of texts)
			for (const word of text.words) counts.set(word, (counts.get(word) ?? 0) + 1)
		const live = new Set([
			...projection.loose,
			...projection.records.flatMap((record) => record.members),
		])
		const units = texts.flatMap(({ message, words, names }, position) => {
			if (
				!live.has(message.id) ||
				held.has(message.id) ||
				(message.role !== 'tool' && tailIds.has(message.id))
			)
				return []
			const tokens = extractTokens(message.content)
			if (message.role === 'user' && tokens.ids.size + tokens.numbers.size + names.size === 0)
				return []
			const category = this.#classifier.category(message.id)
			const loose = message.role === 'user' && !this.#classifier.decisive(message.id)
			const topics = new Set([
				...(input.entities.get(message.id) ?? []),
				...this.#classifier.topics(message.id),
			])
			const ruled = !loose && (category === 'rule' || category === 'correction')
			const group = [...topics].some((topic) => near.has(topic))
				? 1
				: ruled
					? 2
					: [...names].some((name) => asked?.names.has(name))
						? 3
						: 4
			if (group === 4) return []
			const score = [...words]
				.filter((word) => asked?.words.has(word))
				.reduce((sum, word) => sum + Math.log(texts.length / (counts.get(word) ?? 1)), 0)
			return [
				{
					source: message.id,
					lines: this.#projectLines(input, projection, message.id),
					position,
					group,
					ruled,
					loose,
					score,
					category,
					cut: rankLedgerCut(group, loose, category),
				},
			]
		})
		const ordered = [...units].sort(
			(left, right) =>
				left.group - right.group ||
				(left.group === 1 ? Number(left.loose) - Number(right.loose) : 0) ||
				((left.group === 1 && left.loose) || left.group === 3 ? right.score - left.score : 0) ||
				left.position - right.position,
		)
		const cuts = [...ordered].sort(
			(left, right) =>
				left.cut - right.cut ||
				(left.cut === 0 || left.cut === 1 || left.cut === 4 ? left.score - right.score : 0) ||
				right.position - left.position,
		)
		const kept = records.map((record) => ({ ...record, lines: [...record.lines] }))
		const rules = kept.find((record) => record.key === LEDGER_RULES_KEY)
		const steps = [
			...(rules?.lines
				.filter((line) => !line.topics.some((topic) => near.has(topic)))
				.map(() => ({ record: rules, source: undefined })) ?? []),
			...cuts.map((unit) => ({ record: undefined, source: unit.source })),
			...(rules?.lines
				.filter((line) => line.topics.some((topic) => near.has(topic)))
				.map(() => ({ record: rules, source: undefined })) ?? []),
			...kept
				.filter((record) => record.key !== LEDGER_RULES_KEY)
				.flatMap((record) => record.lines.map(() => ({ record, source: undefined })))
				.reverse(),
		]
		const included = new Set(ordered.map((unit) => unit.source))
		const mapped = ordered.map((unit) => ({
			source: unit.source,
			record: this.#buildUnitRecord(unit.source, unit.category, input, projection, held),
		}))
		let briefing = this.#render(
			kept,
			mapped.filter((unit) => included.has(unit.source)).map((unit) => unit.record),
		)
		for (const step of steps) {
			const content = [this.#options.system, briefing].filter((part) => part !== '').join('\n\n')
			if (
				(this.#gauge?.scale ?? 1) * estimateMessages([{ id: 'system', role: 'system', content }]) <=
				cap
			)
				break
			if (step.record !== undefined) step.record.lines.pop()
			if (step.source !== undefined) included.delete(step.source)
			briefing = this.#render(
				kept,
				mapped.filter((unit) => included.has(unit.source)).map((unit) => unit.record),
			)
		}
		const shown = new Set<string>(included)
		for (const record of records)
			for (const source of record.members) {
				const full = record.lines.filter((line) => line.source === source)
				const visible =
					kept
						.find((one) => one.key === record.key)
						?.lines.filter((line) => line.source === source) ?? []
				if (full.length > 0 && full.length === visible.length) shown.add(source)
			}
		return {
			messages: tail.map((message) =>
				message.role === 'tool' ? this.#renderTailStub(message, shown) : message,
			),
			...(briefing === '' ? {} : { briefing }),
		}
	}

	#buildUnitRecord(
		source: string,
		category: LedgerCategory | undefined,
		input: LedgerProjectionInput,
		projection: LedgerProjection,
		held: ReadonlySet<string>,
	): LedgerRecord {
		return {
			key: category === 'rule' ? LEDGER_RULES_KEY : source,
			title: '',
			members: [source],
			lines: this.#collectAmended(
				input,
				projection,
				source,
				category === 'rule'
					? new Set(projection.records.flatMap((record) => record.members))
					: held,
			),
		}
	}

	#collectAmended(
		input: LedgerProjectionInput,
		projection: LedgerProjection,
		source: string,
		held: ReadonlySet<string>,
	): readonly LedgerLine[] {
		const live = new Set([
			...projection.loose,
			...projection.records.flatMap((record) => record.members),
		])
		const queue = [source]
		const done = new Set<string>()
		const lines: LedgerLine[] = []
		for (const id of queue) {
			if (done.has(id)) continue
			done.add(id)
			if (id !== source && (held.has(id) || !live.has(id))) continue
			lines.push(...this.#projectLines(input, projection, id))
			queue.push(...(input.classification.amended.get(id) ?? []))
		}
		return lines
	}

	#render(records: readonly LedgerRecord[], units: readonly LedgerRecord[]): string {
		const owners = records
			.filter((record) => record.key !== LEDGER_RULES_KEY && record.lines.length > 0)
			.map(renderLedgerPinned)
			.join('\n\n')
		const pinned: string[] = []
		const loose: string[] = []
		const done = new Set<string>()
		for (const unit of units) {
			const block = unit.key === LEDGER_RULES_KEY ? loose : pinned
			for (const [source, lines] of Map.groupBy(unit.lines, (line) => line.source)) {
				if (done.has(source)) continue
				done.add(source)
				if (unit.key === LEDGER_RULES_KEY && source === unit.members[0])
					block.push(...lines.map((line) => this.#renderSource(source, [line])))
				else block.push(this.#renderSource(source, lines))
			}
		}
		const body = [owners, pinned.join('\n')].filter((text) => text !== '').join('\n\n')
		const rules = records.find(
			(record) => record.key === LEDGER_RULES_KEY && record.lines.length > 0,
		)
		return [
			body === '' ? '' : `## Pinned\n${body}`,
			rules === undefined
				? loose.length === 0
					? ''
					: ['## Rules', ...loose].join('\n')
				: [renderLedgerRecord(rules), ...loose].join('\n'),
		]
			.filter((text) => text !== '')
			.join('\n\n')
	}

	#selectTail(request: Message, cap: number, input: LedgerProjectionInput): readonly Message[] {
		const first = input.messages.findIndex((message) => this.#requests.has(message.id))
		const seed = input.messages.slice(
			0,
			first < 0 ? input.messages.findIndex((message) => message.id === request.id) : first,
		)
		const calls = new Map<string, readonly ToolCall[]>()
		const results = new Set<string>()
		for (const group of collectToolGroups(seed)) {
			const leader = group[0]
			if (leader === undefined) continue
			const kept = (leader.calls ?? []).filter((call) => {
				const message = group.slice(1).find((result) => resolveLedgerCall(group, result) === call)
				const result = message === undefined ? undefined : this.#results.get(message.id)
				if (
					message === undefined ||
					!this.#options.lookups?.some((lookup) => lookup.tool.name === call.name) ||
					(result?.success === false && result.error === this.#notes.repeat)
				)
					return false
				results.add(message.id)
				return true
			})
			calls.set(leader.id, kept)
		}
		const history = seed
			.filter(
				(message) =>
					!this.#annotations.has(message.id) &&
					(message.role !== 'tool' || results.has(message.id)) &&
					!(
						message.role === 'assistant' &&
						(message.calls?.length ?? 0) > 0 &&
						(calls.get(message.id)?.length ?? 0) === 0 &&
						message.content === ''
					),
			)
			.map((message) =>
				message.role === 'tool'
					? this.#renderTailStub(message)
					: calls.has(message.id)
						? (calls.get(message.id)?.length ?? 0) > 0
							? { ...message, calls: calls.get(message.id) ?? [] }
							: { id: message.id, role: message.role, content: message.content }
						: message,
			)
		let tail = [request]
		for (const exchange of collectExchanges(history).toReversed()) {
			const next = [...exchange, ...tail]
			if ((this.#gauge?.scale ?? 1) * estimateMessages(stripThinking(next, this.#replay)) > cap)
				break
			tail = next
		}
		return tail
	}

	#renderTailStub(message: Message, shown?: ReadonlySet<string>): Message {
		const group = collectToolGroups(this.#conversation.messages()).find((entries) =>
			entries.some((one) => one.id === message.id),
		)
		const call = group === undefined ? undefined : resolveLedgerCall(group, message)
		const reading = this.#readLookups().find((one) => one.id === message.id)
		const hidden = renderStub(call?.name ?? 'tool', call?.arguments ?? {}, 'hidden')
		const visible = renderStub(call?.name ?? 'tool', call?.arguments ?? {}, 'shown')
		return {
			...message,
			content: renderStub(
				call?.name ?? 'tool',
				call?.arguments ?? {},
				this.#results.get(message.id)?.success === false
					? 'failed'
					: reading?.result === undefined
						? 'empty'
						: shown === undefined
							? hidden.length > visible.length
								? 'hidden'
								: 'shown'
							: shown.has(message.id)
								? 'shown'
								: 'hidden',
			),
		}
	}

	#observeTurn(): void {
		this.#flush()
		const selection = this.#selected
		const additions = this.#conversation.messages().slice(this.#boundary)
		const messages = this.#agent.context.build(selection)
		const names = this.#agent.context.scope?.tools
		this.#calls.push({
			estimate: estimateMessages(stripThinking([...messages, ...additions], this.#replay)),
			tools: this.#agent.context.tools
				.definitions()
				.filter((tool) => names === undefined || names.includes(tool.name)).length,
		})
		this.#position = this.#conversation.messages().length
	}

	#recordThinking(): void {
		const call = this.#calls.at(-1)
		if (this.#position === undefined || call?.completion === undefined) return
		const message = this.#conversation
			.messages()
			.slice(this.#position)
			.find((entry) => entry.role === 'assistant')
		if (message?.thinking === undefined) return
		this.#calls[this.#calls.length - 1] = {
			...call,
			thinking: computeThinking(message, call.completion),
		}
	}

	#findLongest(): string {
		return this.#conversation
			.messages()
			.filter((message) => message.role === 'assistant')
			.reduce(
				(longest, message) => (message.content.length > longest.length ? message.content : longest),
				'',
			)
	}

	#repeat(name: string, args: Readonly<Record<string, unknown>>): void {
		const key = canonicalStringify([name, args])
		if (key === undefined) throw new Error('tool arguments have no canonical identity')
		if (this.#answered.has(key)) throw new Error(this.#notes.repeat)
		this.#answered.add(key)
	}

	#lookup(name: string, args: Readonly<Record<string, unknown>>, context: ToolContext): unknown {
		this.#repeat(name, args)
		const lookup = this.#options.lookups?.find((one) => one.tool.name === name)
		if (lookup === undefined) throw new Error(`unknown lookup ${name}`)
		return lookup.tool.execute(args, context)
	}

	#recall(args: Readonly<Record<string, unknown>>): string {
		this.#recordThinking()
		const topic = isString(args.topic) ? args.topic.trim() : ''
		this.#repeat('recall', { topic })
		const gauge = this.#gauge
		if (
			this.#recalls >= (this.#options.recall?.limit ?? DEFAULT_RECALL_LIMIT) ||
			(gauge !== undefined &&
				this.#calls.length > 0 &&
				gauge.left(this.#calls) - this.#predict <
					2 * gauge.reserve(this.#calls, this.#findLongest()))
		)
			this.#closed = true
		if (this.#closed) throw new Error(this.#notes.closed)
		this.#recalls += 1
		const guidance = `an owner name, an id, or one of ${this.#options.topics.map((one) => one.name).join(', ')}`
		if (topic === '') throw new Error(`recall needs a topic: ${guidance}`)
		const room =
			(gauge?.room(this.#calls, this.#findLongest()) ?? 0) -
			estimateMessages([
				{
					id: 'call',
					role: 'assistant',
					content: '',
					calls: [{ id: 'call_00000000', name: 'recall', arguments: { topic } }],
				},
			])
		const { input, projection } = this.#project()
		const registry = collectRegistry(input.readings)
		const searches = splitTopic(topic).map((part) => {
			const words = part
				.split(/\s+/)
				.map((word) => word.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '').toLowerCase())
				.filter((word) => word !== '')
			const matched = new Set([
				...[...registry.ids].filter(
					(id) =>
						extractTokens(part).ids.has(id) ||
						words.every((word) =>
							`${id} ${(registry.owners.get(id) ?? []).join(' ')}`.toLowerCase().includes(word),
						),
				),
				...this.#options.topics
					.filter((one) => words.every((word) => one.name.toLowerCase().includes(word)))
					.map((one) => one.name),
			])
			return { words, matched }
		})
		const start = input.messages.findIndex((message) => message.id === this.#request?.id)
		const listable = new Map(
			input.messages
				.filter(
					(message, at) =>
						!this.#requests.has(message.id) && (at < start || message.role === 'tool'),
				)
				.map((message) => [message.id, message]),
		)
		const readings = new Map(input.readings.map((reading) => [reading.id, reading]))
		const matched = new Set(searches.flatMap((search) => [...search.matched]))
		const wordings = searches.filter(
			(search) => search.matched.size === 0 && search.words.length > 0,
		)
		const listed: string[] = []
		const done = new Set<string>()
		const recalled = new Map<string, string>()
		for (const message of [...listable.values()].reverse()) {
			const reading = readings.get(message.id)
			const topics = new Set([
				...(input.entities.get(message.id) ?? []),
				...this.#classifier.topics(message.id),
				...projection.records
					.filter(
						(record) =>
							record.key.startsWith(LEDGER_OWNER_PREFIX) && record.members.includes(message.id),
					)
					.map((record) => record.key.slice(LEDGER_OWNER_PREFIX.length)),
			])
			const onTopic =
				(message.role === 'tool'
					? reading?.result !== undefined
					: (message.calls?.length ?? 0) === 0 && !this.#classifier.quiet(message.id)) &&
				[...matched].some((match) => topics.has(match))
			const worded =
				(message.role === 'tool' ? reading !== undefined : message.role === 'user') &&
				wordings.some((search) =>
					search.words.every((word) => message.content.toLowerCase().includes(word)),
				)
			if (!onTopic && !worded) continue
			const queue = [message.id]
			const texts: string[] = []
			while (queue.length > 0) {
				const id = queue.shift()
				if (id === undefined || done.has(id)) continue
				const source = listable.get(id)
				if (source === undefined) continue
				done.add(id)
				const lookup = readings.get(id)
				const text =
					lookup === undefined
						? source.content
						: `${lookup.name} ${JSON.stringify(lookup.arguments)}: ${source.content}`
				texts.push(text)
				if (lookup !== undefined)
					recalled.set(text.split('\n')[0] ?? '', source.content.split('\n')[0] ?? '')
				queue.push(...(input.classification.amended.get(id) ?? []))
			}
			if (texts.length > 0) listed.push(texts.join('\n'))
		}
		const result =
			listed.length === 0 ? `nothing on "${topic}"; recall ${guidance}` : cutListing(listed, room)
		this.#recalled.set(result, recalled)
		return result
	}

	#buildDigest(): string | undefined {
		this.#flush()
		const lines: string[] = []
		for (const message of this.#collectAfter()) {
			const result = this.#results.get(message.id)
			if (message.role !== 'tool' || result?.success !== true) continue
			const listing = result.name === 'recall'
			if (listing && /^nothing on /.test(message.content)) continue
			const recalled = listing ? this.#recalled.get(message.content) : undefined
			for (const line of message.content.split('\n')) {
				if (listing && matchesCutLine(line)) continue
				const text = recalled?.get(line) ?? line
				if (!lines.includes(text)) lines.push(text)
			}
		}
		return lines.length === 0 ? undefined : `${this.#notes.results}\n${lines.join('\n')}`
	}
}
