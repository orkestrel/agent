import type { AgentInterface, AgentResult } from '../agents/types.js'
import type { Selection } from '../contexts/types.js'
import type { ConversationInterface } from '../conversations/types.js'
import type { ProviderInterface } from '../providers/types.js'
import type { Message, ThinkingReplay } from '../types.js'
import type {
	ClassifierResult,
	LedgerAmendment,
	LedgerCategory,
	LedgerGauge,
	LedgerInterface,
	LedgerLine,
	LedgerLookupFinding,
	LedgerOptions,
	LedgerProjection,
	LedgerProjectionInput,
	LedgerRecord,
	LedgerRenderContext,
	LedgerResult,
	LedgerShare,
	LedgerSnapshot,
} from './types.js'
import type { TokenUsage } from '@orkestrel/budget'
import type { ToolCall, ToolContext, ToolResult } from '@orkestrel/tool'
import { createAbort } from '@orkestrel/abort'
import { attempt, isError, isFiniteNumber, isString } from '@orkestrel/contract'
import { createTool, createToolManager } from '@orkestrel/tool'
import { createAgent } from '../agents/factories.js'
import { AgentError } from '../agents/errors.js'
import { estimateMessages } from '../agents/helpers.js'
import { createScope } from '../contexts/factories.js'
import { createConversationManager } from '../conversations/factories.js'
import {
	collectExchanges,
	collectToolGroups,
	extractLiterals,
	hasCalls,
	stripThinking,
	sumUsage,
} from '../helpers.js'
import { isNonNegativeSafeInteger } from '../validators.js'
import { Classifier } from './Classifier.js'
import { Gauge } from './Gauge.js'
import { LedgerRequest } from './LedgerRequest.js'
import { LedgerScan } from './LedgerScan.js'
import {
	DEFAULT_LEDGER_LIMIT,
	DEFAULT_LEDGER_SHARE,
	LEDGER_NOTES,
	LEDGER_OWNER_PREFIX,
	LEDGER_RULES_KEY,
	LEDGER_SCALE_DRIFT,
} from './constants.js'
import { isLedgerError, LedgerError } from './errors.js'
import {
	buildLedgerCut,
	buildLedgerIndex,
	buildLines,
	buildLedgerRenderContext,
	buildRecallMessage,
	buildRequestMessage,
	collectProjectionIds,
	extractWords,
	findLedgerCut,
	renderTopicNames,
	scanAmendments,
	splitWords,
	buildRecords,
	collectNames,
	collectRegistry,
	cutListing,
	linkOwners,
	matchEntities,
	rankLedgerCut,
	resolvePredict,
	findLedgerCall,
	matchesCutLine,
	renderLedgerAnnotation,
	renderLedgerPinned,
	renderLedgerRecord,
	renderLookupCall,
	renderStub,
	selectRecords,
	splitResultLines,
	splitTopic,
	splitSentences,
} from './helpers.js'
import { isFraction, isLedgerSnapshot, isPositiveSafeInteger } from './validators.js'

/**
 * Serves one conversation through classified records, a bounded copy of each request turn that carries them, and a final answer pass.
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
	readonly #share: LedgerShare
	readonly #conversation: ConversationInterface
	readonly #agent: AgentInterface
	readonly #classifier: Classifier
	readonly #requests = new Set<string>()
	readonly #annotations = new Set<string>()
	readonly #results = new Map<string, ToolResult>()
	readonly #pending = new Map<number, ToolResult>()
	readonly #live = new Set<LedgerRequest>()
	readonly #scans = new Set<LedgerScan>()
	readonly #calibrations = new Set<AbortSignal>()
	#gauge: Gauge | undefined

	/**
	 * Composes the conversation, classifier, tools, and agent.
	 * @param provider - The provider that serves the conversation
	 * @param options - The filing policy, capacity, and request bounds
	 * @throws {LedgerError} Thrown when a threshold, share, capacity, limit, topic, lookup, or gauge is invalid
	 * @throws {LedgerError} Thrown when `predict` is not a nonnegative safe integer less than `capacity` (code `'CAPACITY'`)
	 * @throws {LedgerError} Thrown when `snapshot` is malformed or marks an id its conversation does not hold (code `'SNAPSHOT'`)
	 * @throws {ConversationError} Thrown when `isLedgerSnapshot` admits `snapshot` but its conversation holds a `system` message (code `'ROLE'`) or repeats an id (code `'SNAPSHOT'`)
	 */
	constructor(provider: ProviderInterface, options: LedgerOptions) {
		for (const key of ['category', 'topic', 'correction', 'amends', 'supersedes'] as const) {
			const value = options.thresholds[key]
			if (!isFraction(value))
				throw new LedgerError('THRESHOLD', 'thresholds must be finite and in (0, 1]')
		}
		for (const value of Object.values(options.share ?? {})) {
			if (!isFraction(value)) throw new LedgerError('SHARE', 'shares must be finite and in (0, 1]')
		}
		if (!isPositiveSafeInteger(options.capacity))
			throw new LedgerError('CAPACITY', 'capacity must be a positive safe integer')
		this.#predict = resolvePredict(options.predict, options.capacity)
		for (const value of [options.recall?.limit, options.agent?.limit]) {
			if (value !== undefined && !isNonNegativeSafeInteger(value))
				throw new LedgerError('LIMIT', 'limits must be nonnegative safe integers')
		}
		// `Array.from` visits a hole in either list as an undefined entry, as iteration does, so the
		// read of its `name` refuses it; `map` skips it.
		const topics = Array.from(options.topics, (topic) => topic.name)
		if (topics.some((name) => name.trim() === '') || new Set(topics).size !== topics.length)
			throw new LedgerError('TOPIC', 'topic names must be nonempty and unique')
		const lookups = ['recall', ...Array.from(options.lookups ?? [], (lookup) => lookup.tool.name)]
		if (new Set(lookups).size !== lookups.length)
			throw new LedgerError('LOOKUP', 'lookup names must be unique and cannot be recall')
		const snapshot = options.snapshot
		if (snapshot !== undefined && !isLedgerSnapshot(snapshot))
			throw new LedgerError(
				'SNAPSHOT',
				'snapshot must be well formed and mark only messages of its conversation; pass what snapshot() returned',
			)
		this.#provider = provider
		this.#replay = provider.replay ?? 'none'
		this.#options = options
		this.#share = { ...DEFAULT_LEDGER_SHARE, ...options.share }
		const gauge = options.gauge ?? snapshot?.gauge
		if (gauge !== undefined)
			this.#gauge = new Gauge({
				...gauge,
				capacity: options.capacity,
				predict: this.#predict,
				replay: this.#replay,
			})
		const conversations = createConversationManager()
		this.#conversation =
			snapshot === undefined
				? conversations.add()
				: conversations.add({ snapshot: snapshot.conversation })
		conversations.switch(this.#conversation.id)
		if (snapshot !== undefined) this.#seat(snapshot)
		this.#classifier = new Classifier({
			conversation: this.#conversation,
			judge: options.judge,
			questions: options.questions,
			thresholds: options.thresholds,
			topics: options.topics,
			assign: this.#assign.bind(this),
			entities: (text, partial) => {
				// The held scan's index serves its selection or recall; without one, this call reads the lookups.
				const [scan] = this.#scans
				return matchEntities(
					scan?.index ??
						buildLedgerIndex(collectRegistry(this.#readLookups(this.#conversation.messages()))),
					text,
					partial,
				)
			},
			...(options.correction === undefined ? {} : { correction: options.correction }),
			...(options.agent?.scheduler === undefined ? {} : { scheduler: options.agent.scheduler }),
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
				description: `Recall what the full conversation record holds on a topic: an owner name, an id, or one of the topics ${renderTopicNames(options.topics)}. Returns source lines, newest first.`,
				parameters: {
					type: 'object',
					properties: {
						topic: { type: 'string', description: 'An owner name, an id, or a topic' },
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
			select: (conversation, request, signal) => this.#select(conversation, request, signal),
		})
		this.#agent.emitter.on('tool', (_call, result) => {
			this.#flush()
			this.#pending.set(this.#conversation.messages().length, result)
			if (!result.success && result.error === LEDGER_NOTES.repeat) {
				this.#current()?.close()
				this.#agent.abort('repeat')
			}
		})
		this.#agent.emitter.on('select', (selection) => {
			if (isLedgerError(selection.fault) && selection.fault.code === 'REQUEST') return
			this.#current()?.adopt(selection, this.#conversation.messages().length)
		})
		this.#agent.emitter.on('turn', () => this.#observeTurn())
		this.#agent.emitter.on('usage', (usage) => this.#current()?.spend(usage))
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
	 * @returns The scale and overhead cost, or undefined before calibration
	 */
	get gauge(): LedgerGauge | undefined {
		return this.#gauge === undefined
			? undefined
			: { scale: this.#gauge.scale, overhead: this.#gauge.overhead }
	}

	/**
	 * Measures message scale and tool overhead from provider prompt usage.
	 * @param signal - The signal bounding both calibration calls; an abort rejects with its reason
	 * @returns The stored scale and overhead cost
	 * @throws {LedgerError} Thrown when either call reports no prompt usage, or a prompt usage of 0 or less (code `'GAUGE'`)
	 * @throws {AgentError} Thrown when a request or calibration is active (code `'CONCURRENCY'`)
	 */
	async calibrate(signal: AbortSignal): Promise<LedgerGauge> {
		if (this.#busy()) throw new AgentError('CONCURRENCY', 'a ledger request is already active')
		this.#calibrations.add(signal)
		try {
			return await this.#measureGauge(signal)
		} finally {
			this.#calibrations.delete(signal)
		}
	}

	/**
	 * Serializes the conversation, the marked ids, and the gauge into a snapshot a later ledger hydrates from.
	 * @returns The snapshot, each id list in conversation order and `gauge` present once the ledger holds one
	 * @throws {AgentError} Thrown when a request or calibration is active (code `'CONCURRENCY'`)
	 */
	snapshot(): LedgerSnapshot {
		if (this.#busy()) throw new AgentError('CONCURRENCY', 'a ledger request is already active')
		this.#flush()
		const conversation = this.#conversation.snapshot()
		const ids = conversation.messages.map((message) => message.id)
		const gauge = this.gauge
		return {
			conversation,
			requests: ids.filter((id) => this.#requests.has(id)),
			notes: ids.filter((id) => this.#annotations.has(id)),
			failures: ids.filter((id) => this.#results.get(id)?.success === false),
			...(gauge === undefined ? {} : { gauge }),
		}
	}

	/**
	 * Appends a request and serves it, recovering an unfinished or rejected first pass with one answer pass.
	 * A calibration call that reports no prompt usage, or a prompt usage of 0 or less, rejects with `LedgerError` code `'GAUGE'`; a provider error during calibration rejects with that error.
	 * When the answer pass rejects, `respond` rejects with that error. Every rejection leaves the ledger free for a later call.
	 * @param content - The request text
	 * @param signal - The caller's cancellation signal; an abort during calibration rejects with its reason
	 * @returns The final pass, the usage of every pass, and the filing attempts of this request alone
	 * @throws {AgentError} Thrown when a request or calibration is active (code `'CONCURRENCY'`)
	 * @throws {LedgerError} Thrown when a calibration call reports no prompt usage, or a prompt usage of 0 or less (code `'GAUGE'`)
	 * @throws {ContractError} Thrown when `signal` is defined and is not a native `AbortSignal`
	 */
	async respond(content: string, signal?: AbortSignal): Promise<LedgerResult> {
		if (this.#busy()) throw new AgentError('CONCURRENCY', 'a ledger request is already active')
		const abort = createAbort({ ...(signal === undefined ? {} : { signal }) })
		const caller = abort.signal
		const request = new LedgerRequest(content, this.#options.recall?.limit)
		this.#live.add(request)
		try {
			if (this.#gauge === undefined) await this.#measureGauge(caller)
			const entered = request.enter(this.#conversation)
			this.#requests.add(entered.id)
			// The answer pass recovers a rejected first pass; the agent's error event carries its cause.
			const first = await this.#generatePass(request, caller, this.#options.think).catch(
				(): AgentResult => ({
					content: '',
					partial: true,
					...(request.usage === undefined ? {} : { usage: request.usage }),
				}),
			)
			const passes = [first]
			if (!caller.aborted && (first.partial || first.content.trim() === '')) {
				const digest = this.#buildDigest(request, entered)
				if (digest !== undefined)
					this.#annotations.add(this.#conversation.add({ role: 'user', content: digest }).id)
				this.#annotations.add(
					this.#conversation.add({ role: 'user', content: LEDGER_NOTES.cue }).id,
				)
				const previous = this.#agent.context.scope
				this.#agent.context.apply(
					createScope({
						name: 'answer',
						tools: [],
						select: async (conversation, message, runSignal) => {
							const selection = await this.#select(conversation, message, runSignal)
							if (selection.fault !== undefined) return selection
							return {
								...selection,
								messages: selection.messages.filter((one) => one.role !== 'tool' && !hasCalls(one)),
							}
						},
					}),
				)
				try {
					passes.push(await this.#generatePass(request, caller, false))
				} finally {
					this.#agent.context.apply(previous)
				}
			}
			const last = passes.at(-1) ?? first
			request.think(this.#conversation.messages())
			const calls = request.calls
			this.#gauge?.observe(
				calls,
				!last.partial && last.content.trim() !== '' ? calls.at(-1) : undefined,
			)
			const usage = passes.reduce<TokenUsage | undefined>(
				(total, pass) => (pass.usage === undefined ? total : sumUsage(total, pass.usage)),
				undefined,
			)
			// Joined as a `joinThinking` fold would join them: an empty part adds no separator.
			const parts = passes.flatMap((pass) => (pass.thinking === undefined ? [] : [pass.thinking]))
			return {
				content: last.content,
				partial: last.partial,
				passes,
				attempts: request.attempts,
				...(usage === undefined ? {} : { usage }),
				...(parts.length === 0
					? {}
					: { thinking: parts.filter((part) => part.length > 0).join('\n\n') }),
				...(last.stop === undefined ? {} : { stop: last.stop }),
			}
		} finally {
			this.#flush()
			this.#live.delete(request)
		}
	}

	async #measureGauge(signal: AbortSignal): Promise<LedgerGauge> {
		try {
			const messages = stripThinking(
				[
					...this.#agent.context.build({ messages: [], judgments: [] }),
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
				overhead: Math.max(0, priced.usage.prompt - bare.usage.prompt),
			})
			return { scale: this.#gauge.scale, overhead: this.#gauge.overhead }
		} catch (error) {
			signal.throwIfAborted()
			throw error
		}
	}

	async #generatePass(
		request: LedgerRequest,
		signal: AbortSignal,
		think?: boolean,
	): Promise<AgentResult> {
		request.open(this.#conversation.messages().length)
		return await this.#agent.generate({
			signal,
			conversation: this.#conversation,
			...(think === undefined ? {} : { think }),
		})
	}

	// The live `respond` call's request once it has entered its message; a run during the call's
	// calibration reaches none. A refusal on every add caps the registry at one request.
	#current(): LedgerRequest | undefined {
		const [request] = this.#live
		return request?.message === undefined ? undefined : request
	}

	#busy(): boolean {
		return this.#live.size > 0 || this.#calibrations.size > 0
	}

	#flush(): void {
		// Filing calls this once per message, and reading the messages copies them all.
		if (this.#pending.size === 0) return
		const messages = this.#conversation.messages()
		for (const [at, result] of this.#pending) {
			const message = messages[at]
			if (message?.role === 'tool') {
				this.#results.set(message.id, result)
				this.#pending.delete(at)
			}
		}
	}

	// Seats the hydrated marks. A failure is rebuilt as the result the agent's `tool` event carried:
	// its error is the tool message's content, and its name is the call's, or `tool` when no call
	// pairs with it, as a tail stub names it.
	#seat(snapshot: LedgerSnapshot): void {
		for (const id of snapshot.requests) this.#requests.add(id)
		for (const id of snapshot.notes) this.#annotations.add(id)
		const messages = this.#conversation.messages()
		const groups = collectToolGroups(messages)
		for (const message of messages) {
			if (!snapshot.failures.includes(message.id)) continue
			const group = groups.find((entries) => entries.some((one) => one.id === message.id))
			const call = group === undefined ? undefined : findLedgerCall(group, message)
			this.#results.set(message.id, {
				success: false,
				id: call?.id ?? message.call ?? message.id,
				name: call?.name ?? 'tool',
				error: message.content,
			})
		}
	}

	// A held scan already read every lookup, caching each failed read, and holds the positions.
	#assign(message: Message): LedgerCategory | undefined {
		this.#flush()
		if (this.#annotations.has(message.id)) return 'chatter'
		const [scan] = this.#scans
		if (message.role === 'tool') {
			if (scan === undefined) this.#readLookups(this.#conversation.messages())
			return this.#results.get(message.id)?.success === false ? 'chatter' : 'fact'
		}
		if (message.role !== 'assistant') return undefined
		if (hasCalls(message)) return 'chatter'
		if (scan !== undefined) {
			const at = scan.position(message.id)
			return scan.first !== undefined && at !== undefined && at > scan.first ? 'chatter' : undefined
		}
		const messages = this.#conversation.messages()
		const first = messages.findIndex((one) => this.#requests.has(one.id))
		return first >= 0 && messages.findIndex((one) => one.id === message.id) > first
			? 'chatter'
			: undefined
	}

	#readLookups(messages: readonly Message[]): readonly LedgerLookupFinding[] {
		this.#flush()
		return collectToolGroups(messages).flatMap((group) =>
			group.slice(1).flatMap((message): LedgerLookupFinding[] => {
				const call = findLedgerCall(group, message)
				const lookup = this.#options.lookups?.find((one) => one.tool.name === call?.name)
				if (
					call === undefined ||
					lookup === undefined ||
					this.#results.get(message.id)?.success === false
				)
					return []
				const read = attempt(() => lookup.read(call.arguments, message.content))
				if (!read.success) {
					// Caches the failed read, so no later reading calls its handler again.
					this.#results.set(message.id, {
						success: false,
						id: call.id,
						name: call.name,
						error: isError(read.error) ? read.error.message : String(read.error),
					})
					return []
				}
				const result = read.value
				return [
					{
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
													.flatMap((value) => [...extractLiterals(value).ids]),
											]),
										],
									},
					},
				]
			}),
		)
	}

	#project(scan: LedgerScan): {
		readonly input: LedgerProjectionInput
		readonly projection: LedgerProjection
	} {
		const input: LedgerProjectionInput = {
			system: this.#options.system,
			exclusions: [...this.#requests, ...this.#annotations],
			owners: scan.registry.owners,
			messages: scan.messages,
			findings: scan.findings,
			entities: new Map(
				scan.messages.map((message) => [
					message.id,
					[...matchEntities(scan.index, message.content, true)],
				]),
			),
			classification: this.#classifier.classification(),
		}
		return { input, projection: buildRecords(input) }
	}

	#projectLines(input: LedgerProjectionInput, id: string) {
		return buildLines(
			input,
			new Map(input.messages.map((message) => [message.id, message])),
			id,
			[...input.owners.values()].flat(),
			collectNames(this.#options.system),
		)
	}

	#renderSource(
		id: string,
		sentences: readonly string[],
		lines: readonly LedgerLine[],
		context: LedgerRenderContext,
		scan: LedgerScan,
	): string {
		const message = this.#conversation.message(id)
		if (message === undefined) return ''
		const retained = new Set(lines.map((line) => line.sentence))
		const text = sentences.every((_, index) => retained.has(index))
			? message.content
			: lines.map((line) => sentences[line.sentence] ?? '').join(' ')
		if (text === '') return ''
		const finding = scan.finding(id)
		return [
			...lines.map((line) => renderLedgerAnnotation(line, context)),
			message.role !== 'tool' || finding === undefined
				? text
				: `${renderLookupCall(finding.name, finding.arguments)}: ${text}`,
		]
			.filter((part) => part !== '')
			.join('\n')
	}

	#collectAfter(request: Message): readonly Message[] {
		const messages = this.#conversation.messages()
		const start = messages.findIndex((message) => message.id === request.id)
		return messages
			.slice(start + 1)
			.filter(
				(message) =>
					message.role !== 'assistant' || hasCalls(message) || message.content.trim() !== '',
			)
	}

	// A run owns a selection only on the ledger's conversation, by identity, and only for the active
	// call's request or a ledger note; any other run is refused over its own conversation's view, so
	// the refusal never carries the ledger's history to another thread.
	async #select(
		conversation: ConversationInterface,
		message: Message,
		signal: AbortSignal,
	): Promise<Selection> {
		const request = this.#current()
		const selected = request?.message
		if (
			conversation !== this.#conversation ||
			request === undefined ||
			selected === undefined ||
			(message.id !== selected.id && !this.#annotations.has(message.id))
		)
			return this.#refuse(
				new LedgerError(
					'REQUEST',
					'ledger selection requires a request owned by an active respond call',
				),
				{ judgments: [] },
				conversation,
			)
		const plan = request.plan
		if (this.#annotations.has(message.id) && plan !== undefined)
			return { messages: [...plan.messages, ...this.#collectAfter(selected)], judgments: [] }
		// A scan that throws holds no entry, so the handlers and the plan read the conversation and
		// the lookups themselves and throw where the classification and the plan catch it.
		const scanned = attempt(() => this.#scan(this.#conversation.messages()))
		if (scanned.success) this.#hold(scanned.value)
		try {
			return await this.#classifier.classify(this.#requests, signal).then(
				(classified) => this.#file(classified, request, selected, message),
				(error: unknown) => this.#refuse(error, { judgments: [] }, this.#conversation),
			)
		} finally {
			const [scan] = this.#scans
			if (scan !== undefined) this.#scans.delete(scan)
		}
	}

	// Reads each lookup result of the messages once and holds the values a selection or a recall reads.
	#scan(messages: readonly Message[]): LedgerScan {
		return new LedgerScan(messages, this.#readLookups(messages), this.#requests)
	}

	// Adds a scan to the registry, which a refusal on every add caps at one entry.
	#hold(scan: LedgerScan): void {
		if (this.#scans.size > 0) throw new AgentError('CONCURRENCY', 'a ledger scan is already held')
		this.#scans.add(scan)
	}

	// Returns the held scan while the conversation keeps its message ids in order; otherwise holds,
	// in its place, a scan of the conversation as it reads now, so one plan never mixes the two.
	#rescan(): LedgerScan {
		const messages = this.#conversation.messages()
		const [held] = this.#scans
		if (
			held !== undefined &&
			held.messages.length === messages.length &&
			messages.every((one, at) => held.messages[at]?.id === one.id)
		)
			return held
		const scan = this.#scan(messages)
		if (held !== undefined) this.#scans.delete(held)
		this.#hold(scan)
		return scan
	}

	// Files a classification's attempts into the request and plans the selection, falling back to
	// the conversation view when the filing faulted or planning threw.
	#file(
		classified: ClassifierResult,
		request: LedgerRequest,
		selected: Message,
		message: Message,
	): Selection {
		const { attempts, ...filed } = classified
		const planned = attempt(() => {
			if (filed.fault !== undefined) throw filed.fault
			return { ...this.#plan(selected, this.#rescan()), ...filed }
		})
		request.file(attempts, planned.success ? planned.value : undefined)
		if (!planned.success) return this.#refuse(planned.error, filed, this.#conversation)
		return this.#annotations.has(message.id)
			? {
					...planned.value,
					messages: [...planned.value.messages, ...this.#collectAfter(selected)],
				}
			: planned.value
	}

	// Falls back to the given conversation's view with the failure as the selection's fault, keeping
	// the filing completed before it.
	#refuse(
		error: unknown,
		filed: Omit<ClassifierResult, 'attempts'>,
		conversation: ConversationInterface,
	): Selection {
		return {
			...filed,
			messages: conversation.view(),
			fault: isError(error) ? error : new Error(String(error)),
		}
	}

	#price(messages: readonly Message[]): number {
		return (this.#gauge?.scale ?? 1) * estimateMessages(messages)
	}

	#ruled(source: string, role: Message['role']): boolean {
		const category = this.#classifier.category(source)
		const unsettled = role === 'user' && !this.#classifier.decisive(source)
		return !unsettled && (category === 'rule' || category === 'correction')
	}

	#plan(request: Message, scan: LedgerScan): Pick<Selection, 'messages'> {
		const { input, projection } = this.#project(scan)
		const registry = scan.registry
		const links = linkOwners(input.findings, registry.owners)
		const near = new Set([
			...matchEntities(scan.index, request.content, true),
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
				(this.#options.capacity - this.#predict) * this.#share.prompt -
					(this.#gauge?.overhead ?? 0),
			) /
			(1 + LEDGER_SCALE_DRIFT)
		const tail = this.#selectTail(request, total * this.#share.tail, input, scan)
		const tailIds = new Set(tail.map((message) => message.id))
		const scoped = records.some((record) => record.key !== LEDGER_RULES_KEY)
		const held = new Set([
			...projection.records
				.filter((record) => scoped || record.key === LEDGER_RULES_KEY)
				.flatMap((record) => record.members),
			...(records.length > 0
				? projection.records.flatMap((record) =>
						record.members.filter(
							(id) =>
								this.#conversation.message(id)?.role === 'user' &&
								this.#classifier.category(id) === 'rule' &&
								this.#classifier.decisive(id),
						),
					)
				: []),
		])
		const texts = input.messages
			.filter((message) => !hasCalls(message))
			.map((message) => ({
				message,
				...extractWords(message),
			}))
		const asked = texts.find(({ message }) => message.id === request.id)
		const counts = new Map(
			[
				...Map.groupBy(
					texts.flatMap((text) => [...text.words]),
					(word) => word,
				),
			].map(([word, occurrences]) => [word, occurrences.length]),
		)
		const live = collectProjectionIds(projection)
		const units = texts.flatMap(({ message, words, names }, position) => {
			if (
				!live.has(message.id) ||
				held.has(message.id) ||
				(message.role !== 'tool' && tailIds.has(message.id))
			)
				return []
			const literals = extractLiterals(message.content)
			if (message.role === 'user' && literals.ids.size + literals.numbers.size + names.size === 0)
				return []
			const category = this.#classifier.category(message.id)
			const unsettled = message.role === 'user' && !this.#classifier.decisive(message.id)
			const topics = new Set([
				...(input.entities.get(message.id) ?? []),
				...this.#classifier.topics(message.id),
			])
			const ruled = this.#ruled(message.id, message.role)
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
					lines: this.#projectLines(input, message.id),
					position,
					group,
					ruled,
					unsettled: unsettled,
					score,
					category,
					cut: rankLedgerCut(group, unsettled, category),
				},
			]
		})
		const ordered = [...units].sort(
			(left, right) =>
				left.group - right.group ||
				(left.group === 1 ? Number(left.unsettled) - Number(right.unsettled) : 0) ||
				((left.group === 1 && left.unsettled) || left.group === 3 ? right.score - left.score : 0) ||
				left.position - right.position,
		)
		const cuts = [...ordered].sort(
			(left, right) =>
				left.cut - right.cut ||
				(left.cut === 0 || left.cut === 1 || left.cut === 4 ? left.score - right.score : 0) ||
				right.position - left.position,
		)
		const rules = records.find((record) => record.key === LEDGER_RULES_KEY)
		const owned = records.filter((record) => record.key !== LEDGER_RULES_KEY)
		const ruledSources = new Set(
			[...new Map(owned.flatMap((record) => record.lines).map((line) => [line.source, line.role]))]
				.filter(([source, role]) => this.#ruled(source, role))
				.map(([source]) => source),
		)
		const steps = [
			...(rules?.lines.filter((line) => !line.topics.some((topic) => near.has(topic))).reverse() ??
				[]),
			...cuts.map((unit) => unit.source),
			...(rules?.lines.filter((line) => line.topics.some((topic) => near.has(topic))).reverse() ??
				[]),
			...owned
				.toReversed()
				.flatMap((record) => [
					...record.lines.filter((line) => !ruledSources.has(line.source)),
					...record.lines.filter((line) => ruledSources.has(line.source)),
				]),
		]
		const mapped = ordered.map((unit) => ({
			source: unit.source,
			record: this.#buildUnitRecord(unit.source, unit.category, input, projection, held),
		}))
		const trimmed = this.#trim(
			steps,
			records,
			mapped,
			new Set(ordered.map((unit) => unit.source)),
			request,
			tail,
			total,
			projection.amendments,
			scan,
		)
		const shown = new Set([
			...trimmed.included,
			...records.flatMap((record) =>
				record.members.filter((source) => {
					const full = record.lines.filter((line) => line.source === source)
					const visible =
						trimmed.records
							.find((one) => one.key === record.key)
							?.lines.filter((line) => line.source === source) ?? []
					return full.length > 0 && full.length === visible.length
				}),
			),
		])
		return {
			messages: [
				...tail
					.slice(0, -1)
					.map((message) =>
						message.role === 'tool' ? this.#renderTailStub(message, scan, shown) : message,
					),
				buildRequestMessage(request, trimmed.rendered),
			],
		}
	}

	// Searches the cuts in step order (each step drops the line it is, or the source it names) for one
	// whose built head, tail, and request copy fit `total`, and returns the winning probe's render; the
	// cut after every step is returned unchecked. A cut past the first fit fits too while the price does
	// not rise along the steps, so the search lands on the first fitting cut.
	#trim(
		steps: ReadonlyArray<LedgerLine | string>,
		records: readonly LedgerRecord[],
		mapped: ReadonlyArray<{ readonly source: string; readonly record: LedgerRecord }>,
		included: ReadonlySet<string>,
		request: Message,
		tail: readonly Message[],
		total: number,
		amendments: readonly LedgerAmendment[],
		scan: LedgerScan,
	): {
		readonly rendered: string
		readonly records: readonly LedgerRecord[]
		readonly included: ReadonlySet<string>
	} {
		const built = this.#agent.context.build({ messages: [request], judgments: [] })
		const head = built.slice(0, -1)
		const priced = built.at(-1) ?? request
		const found = findLedgerCut(0, steps.length, (count) => {
			const cut = buildLedgerCut(steps.slice(0, count), records, included)
			const rendered = this.#render(cut.records, mapped, cut.included, amendments, scan)
			const copy = buildRequestMessage(priced, rendered)
			return this.#price([...head, ...stripThinking([...tail.slice(0, -1), copy], this.#replay)]) <=
				total
				? { ...cut, rendered }
				: undefined
		})
		if (found !== undefined) return found
		const last = buildLedgerCut(steps, records, included)
		return {
			...last,
			rendered: this.#render(last.records, mapped, last.included, amendments, scan),
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
		const live = collectProjectionIds(projection)
		return scanAmendments(
			input.classification.amendments,
			source,
			(id) => id === source || (!held.has(id) && live.has(id)),
		).flatMap((id) => this.#projectLines(input, id))
	}

	#render(
		records: readonly LedgerRecord[],
		mapped: ReadonlyArray<{ readonly source: string; readonly record: LedgerRecord }>,
		included: ReadonlySet<string>,
		amendments: readonly LedgerAmendment[],
		scan: LedgerScan,
	): string {
		const entries = mapped
			.filter((unit) => included.has(unit.source))
			.flatMap(({ record: unit }) =>
				[...Map.groupBy(unit.lines, (line) => line.source)].map(([source, lines]) => ({
					unit,
					source,
					lines,
				})),
			)
		// A source renders once, under the first unit that carries it.
		const first = new Map(entries.toReversed().map((entry) => [entry.source, entry]))
		const unique = entries.filter((entry) => first.get(entry.source) === entry)
		const record = records.find(
			(candidate) => candidate.key === LEDGER_RULES_KEY && candidate.lines.length > 0,
		)
		const ownerRecords = records.filter(
			(candidate) => candidate.key !== LEDGER_RULES_KEY && candidate.lines.length > 0,
		)
		// The context reads the lines in the order the records emit them, so each source's first
		// retained line carries its annotation and its reference.
		const context = buildLedgerRenderContext(
			this.#conversation.messages(),
			[
				...ownerRecords.flatMap((candidate) => candidate.lines),
				...unique
					.filter((entry) => entry.unit.key !== LEDGER_RULES_KEY)
					.flatMap((entry) => entry.lines),
				...(record?.lines ?? []),
				...unique
					.filter((entry) => entry.unit.key === LEDGER_RULES_KEY)
					.flatMap((entry) => entry.lines),
			],
			amendments,
		)
		const owners = ownerRecords.map((owner) => renderLedgerPinned(owner, context)).join('\n\n')
		const rendered = unique.map(({ unit, source, lines }) => {
			const sentences = splitSentences(this.#conversation.message(source)?.content ?? '')
			return {
				rules: unit.key === LEDGER_RULES_KEY,
				texts:
					unit.key === LEDGER_RULES_KEY && source === unit.members[0]
						? lines.map((line) => this.#renderSource(source, sentences, [line], context, scan))
						: [this.#renderSource(source, sentences, lines, context, scan)],
			}
		})
		const pinned = rendered.filter((one) => !one.rules).flatMap((one) => one.texts)
		const rules = rendered.filter((one) => one.rules).flatMap((one) => one.texts)
		const body = [owners, pinned.join('\n')].filter((text) => text !== '').join('\n\n')
		return [
			body === '' ? '' : `## Records\n${body}`,
			record === undefined
				? rules.length === 0
					? ''
					: ['## Rules', ...rules].join('\n')
				: [renderLedgerRecord(record, context), ...rules].join('\n'),
		]
			.filter((text) => text !== '')
			.join('\n\n')
	}

	#selectTail(
		request: Message,
		cap: number,
		input: LedgerProjectionInput,
		scan: LedgerScan,
	): readonly Message[] {
		const first = input.messages.findIndex((message) => this.#requests.has(message.id))
		const seed = input.messages.slice(
			0,
			first < 0 ? input.messages.findIndex((message) => message.id === request.id) : first,
		)
		const groups = collectToolGroups(seed).flatMap((group) => {
			const leader = group[0]
			if (leader === undefined) return []
			const kept = (leader.calls ?? []).flatMap((call) => {
				const message = group.slice(1).find((result) => findLedgerCall(group, result) === call)
				const result = message === undefined ? undefined : this.#results.get(message.id)
				return message === undefined ||
					!this.#options.lookups?.some((lookup) => lookup.tool.name === call.name) ||
					(result?.success === false && result.error === LEDGER_NOTES.repeat)
					? []
					: [{ call, message }]
			})
			return [{ leader, kept }]
		})
		const calls = new Map<string, readonly ToolCall[]>(
			groups.map(({ leader, kept }) => [leader.id, kept.map(({ call }) => call)]),
		)
		const results = new Set(groups.flatMap(({ kept }) => kept.map(({ message }) => message.id)))
		const history = seed
			.filter(
				(message) =>
					!this.#annotations.has(message.id) &&
					(message.role !== 'tool' || results.has(message.id)) &&
					!(
						message.role === 'assistant' &&
						hasCalls(message) &&
						(calls.get(message.id)?.length ?? 0) === 0 &&
						message.content === ''
					),
			)
			.map((message) =>
				message.role === 'tool'
					? this.#renderTailStub(message, scan)
					: calls.has(message.id)
						? (calls.get(message.id)?.length ?? 0) > 0
							? { ...message, calls: calls.get(message.id) ?? [] }
							: { id: message.id, role: message.role, content: message.content }
						: message,
			)
		// Newest exchange first: the tail keeps every exchange before the first whose addition passes
		// `cap`, and each candidate is the kept exchanges in conversation order, then the request.
		const exchanges = collectExchanges(history).toReversed()
		const stop = exchanges.findIndex(
			(_exchange, index) =>
				this.#price(
					stripThinking(
						[
							...exchanges
								.slice(0, index + 1)
								.toReversed()
								.flat(),
							request,
						],
						this.#replay,
					),
				) > cap,
		)
		return [
			...exchanges
				.slice(0, stop === -1 ? exchanges.length : stop)
				.toReversed()
				.flat(),
			request,
		]
	}

	#renderTailStub(message: Message, scan: LedgerScan, shown?: ReadonlySet<string>): Message {
		const group = scan.group(message.id)
		const call = group === undefined ? undefined : findLedgerCall(group, message)
		const finding = scan.finding(message.id)
		const hidden = renderStub(call?.name ?? 'tool', call?.arguments ?? {}, 'hidden')
		const visible = renderStub(call?.name ?? 'tool', call?.arguments ?? {}, 'shown')
		return {
			...message,
			content: renderStub(
				call?.name ?? 'tool',
				call?.arguments ?? {},
				this.#results.get(message.id)?.success === false
					? 'failed'
					: finding?.result === undefined
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
		const request = this.#current()
		const boundary = request?.boundary
		if (request === undefined || boundary === undefined) return
		const additions = this.#conversation.messages().slice(boundary)
		const messages = this.#agent.context.build(request.selection)
		const names = this.#agent.context.scope?.tools
		request.observe(
			{
				estimate: estimateMessages(stripThinking([...messages, ...additions], this.#replay)),
				tools: this.#agent.context.tools
					.definitions()
					.filter((tool) => names === undefined || names.includes(tool.name)).length,
			},
			this.#conversation.messages().length,
		)
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

	#lookup(name: string, args: Readonly<Record<string, unknown>>, context: ToolContext): unknown {
		this.#current()?.admit(name, args)
		const lookup = this.#options.lookups?.find((one) => one.tool.name === name)
		if (lookup === undefined) throw new Error(`unknown lookup ${name}`)
		return lookup.tool.execute(args, context)
	}

	#recall(args: Readonly<Record<string, unknown>>): string {
		const request = this.#current()
		request?.think(this.#conversation.messages())
		const topic = isString(args.topic) ? args.topic.trim() : ''
		request?.admit('recall', { topic })
		const gauge = this.#gauge
		const calls = request?.calls ?? []
		if (
			gauge !== undefined &&
			calls.length > 0 &&
			gauge.remainder(calls) - this.#predict < 2 * gauge.reserve(calls, this.#findLongest())
		)
			request?.close()
		request?.recall()
		const guidance = `an owner name, an id, or one of ${renderTopicNames(this.#options.topics)}`
		if (topic === '') throw new Error(`recall needs a topic: ${guidance}`)
		const room =
			(gauge?.room(calls, this.#findLongest()) ?? 0) - estimateMessages([buildRecallMessage(topic)])
		const scan = this.#scan(this.#conversation.messages())
		// A recall while a selection holds its scan, which only another conversation's run can make,
		// holds no scan of its own, so the classifier's handlers read the selection's.
		const added = this.#scans.size === 0
		if (added) this.#hold(scan)
		try {
			const { input, projection } = this.#project(scan)
			const registry = scan.registry
			const searches = splitTopic(topic).map((part) => {
				const words = splitWords(part)
				const matched = new Set([
					...[...registry.ids].filter(
						(id) =>
							extractLiterals(part).ids.has(id) ||
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
			const start = request?.message === undefined ? -1 : (scan.position(request.message.id) ?? -1)
			const listable = new Map(
				input.messages
					.filter(
						(message, at) =>
							!this.#requests.has(message.id) && (at < start || message.role === 'tool'),
					)
					.map((message) => [message.id, message]),
			)
			const matched = new Set(searches.flatMap((search) => [...search.matched]))
			const unmatched = searches.filter(
				(search) => search.matched.size === 0 && search.words.length > 0,
			)
			// Newest first; each item's amenders are claimed by it, so an older item never lists them again.
			const gathered = [...listable.values()].reverse().reduce<{
				readonly done: ReadonlySet<string>
				readonly listed: readonly string[]
				readonly recalled: ReadonlyMap<string, string>
			}>(
				(state, message) => {
					const finding = scan.finding(message.id)
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
							? finding?.result !== undefined
							: !hasCalls(message) && !this.#classifier.quiet(message.id)) &&
						[...matched].some((match) => topics.has(match))
					const worded =
						(message.role === 'tool' ? finding !== undefined : message.role === 'user') &&
						unmatched.some((search) =>
							search.words.every((word) => message.content.toLowerCase().includes(word)),
						)
					if (!onTopic && !worded) return state
					const items = scanAmendments(
						input.classification.amendments,
						message.id,
						(candidate) => listable.has(candidate) && !state.done.has(candidate),
					).flatMap((id) => {
						const source = listable.get(id)
						if (source === undefined) return []
						const lookup = scan.finding(id)
						const text =
							lookup === undefined
								? source.content
								: `${renderLookupCall(lookup.name, lookup.arguments)}: ${source.content}`
						return [
							{
								id,
								text,
								stored:
									lookup === undefined
										? []
										: [
												[
													splitResultLines(text)[0] ?? '',
													splitResultLines(source.content)[0] ?? '',
												] as const,
											],
							},
						]
					})
					return {
						done: new Set([...state.done, ...items.map((item) => item.id)]),
						listed:
							items.length === 0
								? state.listed
								: [...state.listed, items.map((item) => item.text).join('\n')],
						recalled: new Map([...state.recalled, ...items.flatMap((item) => item.stored)]),
					}
				},
				{ done: new Set(), listed: [], recalled: new Map() },
			)
			const result =
				gathered.listed.length === 0
					? `nothing on "${topic}"; recall ${guidance}`
					: cutListing(gathered.listed, room)
			request?.list(result, gathered.recalled)
			return result
		} finally {
			if (added) this.#scans.delete(scan)
		}
	}

	#buildDigest(request: LedgerRequest, entered: Message): string | undefined {
		this.#flush()
		// Each line once, at its first occurrence.
		const lines = [
			...new Set(
				this.#collectAfter(entered).flatMap((message) => {
					const result = this.#results.get(message.id)
					if (message.role !== 'tool' || result?.success !== true) return []
					const recalled = result.name === 'recall'
					if (recalled && /^nothing on /.test(message.content)) return []
					const stored = recalled ? request.lines(message.content) : undefined
					return splitResultLines(message.content)
						.filter((line) => !recalled || !matchesCutLine(line))
						.map((line) => stored?.get(line) ?? line)
				}),
			),
		]
		return lines.length === 0 ? undefined : `${LEDGER_NOTES.results}\n${lines.join('\n')}`
	}
}
