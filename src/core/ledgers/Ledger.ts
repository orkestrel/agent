import type { AgentInterface, AgentResult } from '../agents/types.js'
import type { ScopeFilter, ScopeInterface, Selection } from '../contexts/types.js'
import type { ConversationInterface } from '../conversations/types.js'
import type { ProviderInterface, ProviderRequest } from '../providers/types.js'
import type { Message, ThinkingReplay } from '../types.js'
import type {
	ClassifierResult,
	LedgerDraft,
	LedgerExchange,
	LedgerEvidence,
	LedgerOccurrence,
	LedgerRenderResult,
	LedgerAmendment,
	LedgerCategory,
	LedgerAgentInterface,
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
	LedgerRecovery,
	LedgerShare,
	LedgerSnapshot,
} from './types.js'
import type { TokenUsage } from '@orkestrel/budget'
import type { ToolCall, ToolContext, ToolDefinition, ToolResult } from '@orkestrel/tool'
import { createAbort } from '@orkestrel/abort'
import {
	describeFaults,
	attempt,
	isError,
	isFiniteNumber,
	isPromiseLike,
	isString,
	objectShape,
	stringShape,
} from '@orkestrel/contract'
import { createTool, createToolManager, isToolError } from '@orkestrel/tool'
import { Authority } from '../agents/Authority.js'
import { createAgent } from '../agents/factories.js'
import { AgentError } from '../agents/errors.js'
import { denyCall, estimateMessages, settleToolResult } from '../agents/helpers.js'
import { createScope } from '../contexts/factories.js'
import { intersectFilters, intersectKeys } from '../contexts/helpers.js'
import { createConversationManager } from '../conversations/factories.js'
import {
	collectExchanges,
	collectToolGroups,
	extractLiterals,
	estimateTokens,
	hasCalls,
	stripThinking,
	sumUsage,
} from '../helpers.js'
import { isNonNegativeSafeInteger, isPositiveSafeInteger } from '../validators.js'
import { Classifier } from './Classifier.js'
import { Gauge } from './Gauge.js'
import { LedgerRequest } from './LedgerRequest.js'
import { LedgerScan } from './LedgerScan.js'
import {
	DEFAULT_LEDGER_LIMIT,
	DEFAULT_LEDGER_SHARE,
	LEDGER_NOTES,
	LEDGER_OWNER_PREFIX,
	LEDGER_RECALL_LABELS,
	LEDGER_RULES_KEY,
	LEDGER_SCALE_DRIFT,
} from './constants.js'
import { isLedgerError, LedgerError } from './errors.js'
import {
	hasHiddenRecall,
	matchesLookup,
	collectRetiredFindings,
	collectWriteSupersessions,
	mergeSupersessions,
	digestLedgerTools,
	digestLedgerWindow,
	buildLedgerCut,
	buildLedgerLineKey,
	collectLedgerLines,
	collectLedgerReplies,
	collectLedgerEvidence,
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
import { ledgerSnapshotContract } from './contracts.js'
import { isFraction, isLedgerQuestion, isLedgerSnapshot } from './validators.js'

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
	readonly #record: LedgerAgentInterface
	readonly #classifier: Classifier
	readonly #requests = new Set<string>()
	readonly #annotations = new Set<string>()
	readonly #results = new Map<string, ToolResult>()
	readonly #pending = new Map<number, ToolResult>()
	// Each live request beside the scope it entered with, which bounds what its first pass can advertise.
	readonly #live = new Map<LedgerRequest, ScopeInterface | undefined>()
	readonly #scans = new Set<LedgerScan>()
	readonly #calibrations = new Set<AbortSignal>()
	#gauge: Gauge | undefined
	// The digest of the tool definitions `#gauge` priced, set with it.
	#digest: string | undefined
	#window: readonly LedgerExchange[] = []
	#evidence: LedgerEvidence = collectLedgerEvidence([], new Set(), [])

	/**
	 * Composes the conversation, classifier, tools, and agent.
	 * @param provider - The provider that serves the conversation
	 * @param options - The filing policy, capacity, and request bounds
	 * @throws {LedgerError} Thrown when a threshold, share, capacity, limit, topic, lookup, or gauge is invalid
	 * @throws {LedgerError} Thrown when a write lacks the `consequential` annotation, writes come without `agent.authority`, or a write is named `recall` or shares a lookup's or another write's name (code `'WRITE'`)
	 * @throws {LedgerError} Thrown when `predict` is not a nonnegative safe integer less than `capacity` (code `'CAPACITY'`)
	 * @throws {LedgerError} Thrown when `questions` fails `isLedgerQuestion` (code `'QUESTION'`)
	 * @throws {LedgerError} Thrown when `snapshot` is malformed or marks an id its conversation does not hold (code `'SNAPSHOT'`, its faults under `context.faults`)
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
		if (options.recall?.limit !== undefined && !isNonNegativeSafeInteger(options.recall.limit))
			throw new LedgerError('LIMIT', 'a recall limit must be a nonnegative safe integer')
		if (options.agent?.limit !== undefined && !isPositiveSafeInteger(options.agent.limit))
			throw new LedgerError('LIMIT', 'an agent limit must be a positive safe integer')
		// `Array.from` visits a hole in either list as an undefined entry, as iteration does, so the
		// read of its `name` refuses it; `map` skips it.
		const topics = Array.from(options.topics, (topic) => topic.name)
		if (topics.some((name) => name.trim() === '') || new Set(topics).size !== topics.length)
			throw new LedgerError('TOPIC', 'topic names must be nonempty and unique')
		const lookups = ['recall', ...Array.from(options.lookups ?? [], (lookup) => lookup.tool.name)]
		if (new Set(lookups).size !== lookups.length)
			throw new LedgerError('LOOKUP', 'lookup names must be unique and cannot be recall')
		const writes = Array.from(options.writes ?? [], (write) => write.tool)
		const names = [...lookups, ...writes.map((tool) => tool.name)]
		if (new Set(names).size !== names.length)
			throw new LedgerError(
				'WRITE',
				'write names must be unique and cannot be recall or the name of a lookup',
			)
		if (writes.some((tool) => tool.annotations?.consequential !== true))
			throw new LedgerError(
				'WRITE',
				'a write tool must carry annotations.consequential: true, so the host approves each call',
			)
		const host = options.agent?.authority
		if (writes.length > 0 && host === undefined)
			throw new LedgerError('WRITE', 'writes need an agent.authority that gates each call')
		if (!isLedgerQuestion(options.questions))
			throw new LedgerError(
				'QUESTION',
				'questions must hold a choice category question whose criteria describe every category, a non-empty topic string, and noul amends and supersedes questions; pass the LEDGER_QUESTIONS constant for the measured wording',
			)
		const snapshot = options.snapshot
		if (snapshot !== undefined && !isLedgerSnapshot(snapshot)) {
			const candidate: unknown = options.snapshot
			const faults = ledgerSnapshotContract.audit(candidate)
			throw new LedgerError(
				'SNAPSHOT',
				`snapshot must be well formed and mark only messages of its conversation; pass what snapshot() returned${faults.length === 0 ? '' : `\n${describeFaults(faults, ledgerSnapshotContract.schema)}`}`,
				{ context: { faults } },
			)
		}
		this.#provider = provider
		this.#replay = provider.replay ?? 'none'
		this.#options = options
		this.#share = { ...DEFAULT_LEDGER_SHARE, ...options.share }
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
			...(options.agent?.strict === undefined ? {} : { strict: options.agent.strict }),
		})
		const tools = createToolManager()
		for (const { tool } of [...(options.lookups ?? []), ...(options.writes ?? [])]) {
			tools.add(
				createTool({
					name: tool.name,
					...(tool.parameters === undefined ? {} : { parameters: tool.parameters }),
					...(tool.description === undefined ? {} : { description: tool.description }),
					...(tool.summary === undefined ? {} : { summary: tool.summary }),
					...(tool.title === undefined ? {} : { title: tool.title }),
					...(tool.annotations === undefined ? {} : { annotations: tool.annotations }),
					execute: (args, context) => this.#lookup(tool.name, args, context),
				}),
			)
		}
		tools.add(
			createTool({
				name: 'recall',
				description: `Find something said earlier that isn't in the messages you can see, by an owner name, an id, or one of the topics ${renderTopicNames(options.topics)}. Returns statements and lookup findings first, then earlier requests and replies labeled by origin; newest first within each group.`,
				contract: objectShape({
					topic: stringShape({ min: 1, description: 'An owner name, an id, or a topic' }),
				}),
				execute: (args) => this.#recall(args),
			}),
		)
		// The ledger allows exactly the names it advertises, so a tool a host adds to the agent's manager
		// later is denied instead of inheriting those names' trust. With a host authority, the ledger keeps
		// that deny and its own allow for recall, and every lookup and write answers to the host.
		const advertised = new Authority({
			rules: [
				{
					match: (context) => names.includes(context.call.name),
					zone: 'ledger',
					verdict: 'allow',
				},
			],
			fallback: { zone: 'ledger', verdict: 'deny', reason: 'the ledger advertises no such tool' },
		})
		this.#agent = createAgent(provider, {
			...options.agent,
			conversations,
			system: options.system,
			tools,
			authority: {
				// In one request, the identical retry of a call the authority denied stops as a repeat, unevaluated.
				evaluate: (context) =>
					this.#current()?.denied(context.call.name, context.call.arguments) === true
						? { zone: 'ledger', verdict: 'deny', reason: LEDGER_NOTES.repeat }
						: host === undefined ||
							  context.call.name === 'recall' ||
							  !names.includes(context.call.name)
							? advertised.evaluate(context)
							: host.evaluate(context),
				// A host without an approver leaves each asked call unanswered, as the ledger's own does. A
				// batch twin of a call whose ask was declined or left unanswered is refused unasked.
				ask: (context, decision, signal) =>
					this.#current()?.denied(context.call.name, context.call.arguments) === true
						? Promise.resolve(false)
						: host?.ask === undefined
							? advertised.ask(context, decision, signal)
							: host.ask(context, decision, signal),
			},
			limit: options.agent?.limit ?? DEFAULT_LEDGER_LIMIT,
			select: (conversation, request, signal) => this.#select(conversation, request, signal),
		})
		// A stored gauge holds only for the definitions its digest names, so a hydrate with others
		// calibrates before its first pass. A supplied gauge prices the definitions held now.
		const digest = digestLedgerTools(this.#agent.context.tools.definitions())
		const gauge =
			options.gauge ?? (snapshot?.gauge?.digest === digest ? snapshot?.gauge : undefined)
		if (gauge !== undefined) {
			this.#gauge = new Gauge({
				scale: gauge.scale,
				overhead: gauge.overhead,
				capacity: options.capacity,
				predict: this.#predict,
				replay: this.#replay,
			})
			this.#digest = digest
		}
		// A lookup or write call the authority denies, or whose ask is declined or left unanswered, stays
		// denied for the rest of the request.
		this.#agent.emitter.on('deny', (call, _reason, decision) => {
			if (decision !== undefined && call.name !== 'recall' && names.includes(call.name))
				this.#current()?.deny(call.name, call.arguments)
		})
		this.#agent.emitter.on('tool', (call, result) => {
			this.#flush()
			this.#pending.set(this.#conversation.messages().length, result)
			// A repeated call, and the identical retry of a denied one, end the pass.
			const stopped = denyCall(call, LEDGER_NOTES.repeat)
			if (
				!result.success &&
				(result.error === LEDGER_NOTES.repeat ||
					(!stopped.success && result.error === stopped.error))
			) {
				this.#current()?.close()
				this.#agent.abort('repeat')
			}
			// A call in a turn that advertised no tools ends its pass, so the pass makes one generation.
			const request = this.#current()
			if (request?.calls.at(-1)?.tools === 0) request.abort()
			this.#release(call, result)
		})
		this.#agent.emitter.on('select', (selection) => {
			if (isLedgerError(selection.fault) && selection.fault.code === 'REQUEST') return
			this.#current()?.adopt(selection, this.#conversation.messages().length)
		})
		this.#agent.emitter.on('fault', (error) => this.#current()?.fault(error))
		// The ledger prices the request each turn dispatches, so a scope a later listener changed
		// counts as the provider receives it. Every run on the agent is a pass of the active call.
		this.#agent.emitter.on('request', (_index, sent) => this.#observeRequest(sent))
		this.#agent.emitter.on('usage', (usage) => this.#current()?.spend(usage))
		// The host reads the agent through a record with no run member, so the `respond` method starts
		// every run.
		const agent = this.#agent
		this.#record = Object.freeze({
			emitter: agent.emitter,
			id: agent.id,
			get status() {
				return agent.status
			},
			context: agent.context,
			abort: (reason?: unknown) => agent.abort(reason),
		})
	}

	/**
	 * Returns the record of the owned request engine, which starts no run.
	 * @returns The frozen record of the agent serving this conversation
	 */
	get agent(): LedgerAgentInterface {
		return this.#record
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
	 * Serializes the conversation, marked ids, gauge, and completed exchange window for a later ledger.
	 * @returns The snapshot, each id list in conversation order, with a gauge and window only when held
	 * @throws {AgentError} Thrown when a request or calibration is active (code `'CONCURRENCY'`)
	 */
	snapshot(): LedgerSnapshot {
		if (this.#busy()) throw new AgentError('CONCURRENCY', 'a ledger request is already active')
		this.#flush()
		const conversation = this.#conversation.snapshot()
		const ids = conversation.messages.map((message) => message.id)
		const gauge = this.gauge
		const priced = this.#digest
		const window = {
			exchanges: this.#window.map((entry) => ({
				request: entry.request.id,
				...(entry.request.content === this.#conversation.message(entry.request.id)?.content
					? {}
					: { copy: entry.request.content }),
				reply: entry.reply.id,
				lines: entry.lines.map(({ key, title, source, sentence }) => ({
					key,
					title,
					source,
					sentence,
				})),
			})),
			amendments: [...this.#evidence.amendments.values()].map((edge) => ({ ...edge })),
		}
		const digest =
			window.exchanges.length === 0
				? undefined
				: digestLedgerWindow(window.exchanges, conversation.messages)
		return {
			conversation,
			requests: ids.filter((id) => this.#requests.has(id)),
			notes: ids.filter((id) => this.#annotations.has(id)),
			failures: ids.filter((id) => this.#results.get(id)?.success === false),
			...(gauge === undefined || priced === undefined
				? {}
				: { gauge: { ...gauge, digest: priced } }),
			...(window.exchanges.length === 0 || digest === undefined
				? {}
				: { window: { ...window, digest } }),
		}
	}

	/**
	 * Appends a request and serves it, recovering an unfinished or rejected first pass with one answer pass.
	 * In either pass, a call the model makes in a turn that advertises no tools runs nothing and ends the pass after that generation, whatever the agent's `limit`, and when every call of that turn failed, the ledger stores the reply without its calls: a reply with text ends the pass complete, and one without text ends it partial with empty content.
	 * A calibration call that reports no prompt usage, or a prompt usage of 0 or less, rejects with `LedgerError` code `'GAUGE'`; a provider error during calibration rejects with that error.
	 * When the answer pass rejects, `respond` rejects with that error, and under the default `strict` a judge failure or another selection failure rejects it too. A rejection belongs to its own call: the ledger stays free, and the next call asks the judge again about whatever is still unanswered.
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
		// Each pass binds the scope the request entered with, so a scope widened during the request
		// adds nothing before the next one, and a narrowing still reaches the next turn.
		const scope = this.#agent.context.scope
		this.#live.set(request, scope)
		try {
			// A definition added or removed since the gauge was stored changes its digest, and the
			// stored price no longer holds.
			if (
				this.#gauge === undefined ||
				digestLedgerTools(this.#agent.context.tools.definitions()) !== this.#digest
			) {
				this.#gauge = undefined
				await this.#measureGauge(caller)
			}
			const entered = request.enter(this.#conversation)
			this.#requests.add(entered.id)
			// The answer pass recovers a provider failure in the first pass; the agent's error event carries
			// its cause. A selection failure that reached here rejected under `strict`, and it stands.
			const first = this.#dropStrayCalls(
				request,
				await this.#generatePass(request, caller, this.#options.think, scope).catch(
					(error: unknown): AgentResult => {
						if (request.faulted(error)) throw error
						return {
							content: '',
							partial: true,
							...(request.usage === undefined ? {} : { usage: request.usage }),
						}
					},
				),
			)
			const passes = [first]
			if (!caller.aborted && (first.partial || first.content.trim() === '')) {
				const recovery = this.#buildDigest(request, entered)
				if (recovery.digest !== undefined)
					this.#annotations.add(
						this.#conversation.add({ role: 'user', content: recovery.digest }).id,
					)
				this.#annotations.add(
					this.#conversation.add({ role: 'user', content: LEDGER_NOTES.cue }).id,
				)
				// The answer pass's run scope advertises nothing and never touches the context scope.
				const filter = intersectFilters(scope, { tools: [] })
				const answer = createScope({
					...filter,
					name: 'answer',
					select: async (conversation, message, runSignal) => {
						const selection = await this.#select(conversation, message, runSignal, filter)
						if (selection.fault !== undefined) return selection
						return {
							...selection,
							messages: selection.messages.filter(
								(one) => one.role !== 'tool' && !hasCalls(one) && !recovery.omitted.has(one.id),
							),
						}
					},
				})
				passes.push(
					this.#dropStrayCalls(request, await this.#generatePass(request, caller, false, answer)),
				)
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
			if (request.scope !== undefined && this.#agent.context.scope === request.scope)
				this.#agent.context.apply(scope)
			this.#flush()
			this.#commitExchange(request)
			this.#live.delete(request)
		}
	}

	async #measureGauge(signal: AbortSignal): Promise<LedgerGauge> {
		try {
			// The empty turn stands where the request will, so a workspace's images have a user turn to
			// read, and it leaves with them: calibration prices text.
			const messages = stripThinking(
				this.#agent.context.build({
					selection: {
						messages: [
							...this.#conversation.view(),
							{ id: 'calibration', role: 'user', content: '' },
						],
						judgments: [],
					},
				}),
				this.#replay,
			).slice(0, -1)
			const definitions = this.#agent.context.tools.definitions()
			const priced = await this.#provider.generate(messages, signal, definitions, {
				think: false,
			})
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
			this.#digest = digestLedgerTools(definitions)
			return { scale: this.#gauge.scale, overhead: this.#gauge.overhead }
		} catch (error) {
			signal.throwIfAborted()
			throw error
		}
	}

	async #generatePass(
		request: LedgerRequest,
		signal: AbortSignal,
		think: boolean | undefined,
		scope: ScopeInterface | undefined,
	): Promise<AgentResult> {
		request.open(this.#conversation.messages().length)
		const stop = request.signal
		return await this.#agent.generate({
			signal: stop === undefined ? signal : AbortSignal.any([signal, stop]),
			conversation: this.#conversation,
			...(think === undefined ? {} : { think }),
			...(scope === undefined ? {} : { scope }),
		})
	}

	// An aborted pass's last turn advertised no tools and still made a call, which the agent stored with
	// the reply and refused. When every call of that turn failed, so none filed a finding, the reply is
	// stored again alone, as a call-free turn stores it, and it ends the pass: complete with its text, or
	// partial with empty content.
	#dropStrayCalls(request: LedgerRequest, pass: AgentResult): AgentResult {
		const boundary = request.boundary
		if (!request.aborted || boundary === undefined) return pass
		this.#flush()
		const messages = this.#conversation.messages().slice(boundary)
		const at = messages.findLastIndex((message) => message.role === 'assistant')
		const reply = messages[at]
		const replies = messages.slice(at + 1)
		if (
			reply === undefined ||
			!hasCalls(reply) ||
			!replies.every(
				(message) => message.role === 'tool' && this.#results.get(message.id)?.success === false,
			)
		)
			return pass
		this.#conversation.remove([reply.id, ...replies.map((message) => message.id)])
		for (const message of replies) this.#results.delete(message.id)
		this.#conversation.add({
			role: 'assistant',
			content: reply.content,
			...(reply.thinking === undefined ? {} : { thinking: reply.thinking }),
		})
		return { ...pass, content: reply.content, partial: reply.content.trim() === '' }
	}

	// The live `respond` call's request after it has entered its message; a run during the call's
	// calibration reaches none. A refusal on every add caps the registry at one request.
	#current(): LedgerRequest | undefined {
		const [request] = this.#live.keys()
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
		if (
			snapshot.window !== undefined &&
			digestLedgerWindow(snapshot.window.exchanges, messages) === snapshot.window.digest
		) {
			const window = snapshot.window.exchanges.map((entry) => {
				const request = this.#conversation.message(entry.request)
				const reply = this.#conversation.message(entry.reply)
				if (request === undefined || reply === undefined)
					throw new LedgerError('SNAPSHOT', 'window pair must belong to its conversation')
				const lines = entry.lines.map((line) => {
					const source = this.#conversation.message(line.source)
					if (source === undefined)
						throw new LedgerError('SNAPSHOT', 'window source must belong to its conversation')
					return {
						...line,
						text: splitSentences(source.content)[line.sentence] ?? '',
						topics: [],
						role: source.role,
					}
				})
				return {
					request: { ...request, content: entry.copy ?? request.content },
					reply,
					lines,
				}
			})
			this.#window = window
			this.#evidence = collectLedgerEvidence(
				messages,
				new Set(
					this.#window.flatMap((entry) => [
						entry.request.id,
						entry.reply.id,
						...entry.lines.map((line) => line.source),
					]),
				),
				snapshot.window.amendments,
			)
		}
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
				const write = this.#options.writes?.find((one) => one.tool.name === call?.name)
				if (
					call === undefined ||
					(lookup === undefined && write === undefined) ||
					this.#results.get(message.id)?.success === false
				)
					return []
				// Construction keeps lookup and write names apart, so one of these handlers runs.
				const read = attempt(() => lookup?.read(call.arguments, message.content))
				const written = attempt(() => write?.read(call.arguments, message.content))
				if (!read.success || !written.success) {
					const error = read.success ? (written.success ? undefined : written.error) : read.error
					// Caches the failed read, so no later reading calls its handler again.
					this.#results.set(message.id, {
						success: false,
						id: call.id,
						name: call.name,
						error: isError(error) ? error.message : String(error),
					})
					return []
				}
				const literals = Object.values(call.arguments)
					.filter(isString)
					.flatMap((value) => [...extractLiterals(value).ids])
				const result = read.value
				const change = written.value
				return [
					{
						id: message.id,
						name: call.name,
						arguments: call.arguments,
						text: message.content,
						result:
							result !== undefined
								? { ...result, ids: [...new Set([...result.ids, ...literals])] }
								: change !== undefined
									? { ids: [...new Set([...change.ids, ...literals])], owners: change.owners }
									: undefined,
						...(change === undefined ? {} : { targets: [...change.targets] }),
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
			classification: mergeSupersessions(
				this.#classifier.classification(),
				collectWriteSupersessions(scan.messages, scan.findings),
				scan.messages,
			),
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

	// A selection is owned only on the ledger's conversation, by identity, and only for the active
	// call's request or a ledger note; any other, which only a host's direct `context.select` call can
	// ask for, is refused over its own conversation's view, so the refusal never carries the ledger's
	// history to another thread. The `filter` parameter is the run scope of a pass the ledger built;
	// without one, the pass runs under the scope its request entered with.
	async #select(
		conversation: ConversationInterface,
		message: Message,
		signal: AbortSignal,
		filter?: ScopeFilter,
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
				(classified) =>
					this.#file(classified, request, selected, message, filter ?? this.#live.get(request)),
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
	// in its place, a scan of the conversation as it reads at this call, so one plan never mixes the two.
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
		filter: ScopeFilter | undefined,
	): Selection {
		const { attempts, failure, ...filed } = classified
		const planned = attempt(() => {
			if (filed.fault !== undefined) throw filed.fault
			const { draft, ...plan } = this.#plan(selected, this.#rescan(), filter)
			return {
				draft,
				selection: {
					...plan,
					...filed,
					// A lenient run keeps the plan beside the filing failure.
					...(failure === undefined ? {} : { fault: failure }),
				},
			}
		})
		request.file(
			attempts,
			planned.success ? planned.value.selection : undefined,
			planned.success ? planned.value.draft : undefined,
		)
		if (!planned.success) return this.#refuse(planned.error, filed, this.#conversation)
		const selection = planned.value.selection
		return this.#annotations.has(message.id)
			? {
					...selection,
					messages: [...selection.messages, ...this.#collectAfter(selected)],
				}
			: selection
	}

	// Falls back to the given conversation's view with the failure as the selection's fault, keeping
	// the filing completed before it.
	#refuse(
		error: unknown,
		filed: Omit<ClassifierResult, 'attempts'>,
		conversation: ConversationInterface,
	): Selection {
		if (conversation === this.#conversation && !(isLedgerError(error) && error.code === 'REQUEST'))
			this.#current()?.file([])
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

	#plan(
		request: Message,
		scan: LedgerScan,
		filter: ScopeFilter | undefined,
	): Pick<Selection, 'messages'> & { readonly draft: LedgerDraft } {
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
		// The plan prices every definition the pass's run scope lets a turn advertise, with `recall`
		// offered: the context scope can move inside that bound after the plan, so it never lowers the price.
		const bound = filter?.tools
		const definitions = this.#agent.context.tools.definitions()
		const advertised = definitions.filter(
			(tool) => bound === undefined || bound.includes(tool.name),
		)
		const total =
			Math.max(
				0,
				(this.#options.capacity - this.#predict) * this.#share.prompt -
					((this.#gauge?.overhead ?? 0) - this.#spared(advertised)),
			) /
			(1 + LEDGER_SCALE_DRIFT)
		const built = this.#agent.context.build({ selection: { messages: [request], judgments: [] } })
		const tail = this.#selectTail(request, total, input, scan)
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
			built,
			tail,
			total,
			projection.amendments,
			scan,
		)
		const replies = collectLedgerReplies(scan.messages, this.#requests, this.#annotations)
		const sources = new Set(
			this.#window.flatMap((entry) => [
				entry.request.id,
				entry.reply.id,
				...entry.lines.map((line) => line.source),
			]),
		)
		const evidence = collectLedgerEvidence(scan.messages, sources, projection.amendments)
		const prefix = this.#window.flatMap((entry) => entry.lines)
		const prior = buildLedgerRenderContext(scan.messages, prefix, projection.amendments)
		const combined = buildLedgerRenderContext(
			scan.messages,
			[...prefix, ...trimmed.rendered.lines],
			projection.amendments,
		)
		const stale =
			evidence.messages.size !== this.#evidence.messages.size ||
			[...evidence.messages].some((receipt) => !this.#evidence.messages.has(receipt)) ||
			evidence.amendments.size !== this.#evidence.amendments.size ||
			[...evidence.amendments.keys()].some((receipt) => !this.#evidence.amendments.has(receipt)) ||
			this.#window.some(
				(entry) =>
					replies.get(entry.request.id)?.id !== entry.reply.id ||
					entry.lines.some((line) => !live.has(line.source)),
			) ||
			projection.amendments.some(
				(edge) =>
					(prior.first.has(edge.earlier) &&
						prior.complete.has(edge.later) !== combined.complete.has(edge.later)) ||
					(prior.first.has(edge.later) &&
						combined.complete.has(edge.later) &&
						!prior.first.has(edge.earlier) &&
						combined.first.has(edge.earlier)),
			)
		const last = stale ? this.#window.at(-1) : undefined
		const retained =
			last === undefined || replies.get(last.request.id)?.id !== last.reply.id
				? undefined
				: this.#conversation.message(last.request.id)
		if (stale) this.#window = []
		const [previous, reply] = this.#window.length === 0 ? this.#selectExchange(request, input) : []
		const window: readonly LedgerExchange[] =
			this.#window.length > 0
				? this.#window
				: previous !== undefined && reply !== undefined
					? [{ request: previous, reply, lines: [] }]
					: retained !== undefined && last !== undefined
						? [{ request: retained, reply: last.reply, lines: [] }]
						: []
		if (this.#window.length === 0) {
			const derived = collectLedgerEvidence(
				scan.messages,
				new Set(window.flatMap((entry) => [entry.request.id, entry.reply.id])),
				projection.amendments,
			)
			this.#window = window
			this.#evidence = derived
		}
		const carried = window.flatMap((entry) => entry.lines)
		const delta = this.#render(
			trimmed.records,
			mapped,
			trimmed.included,
			projection.amendments,
			scan,
			new Set(carried.map(buildLedgerLineKey)),
			carried,
		)
		const newest = window.at(-1)
		const plain = newest === undefined ? undefined : this.#conversation.message(newest.request.id)
		const fallback: readonly LedgerExchange[] =
			newest === undefined || plain === undefined
				? []
				: [{ request: plain, reply: newest.reply, lines: [] }]
		const empty = { window: [], rendered: trimmed.rendered }
		const rungs = [
			{ window, rendered: delta },
			{ window: fallback, rendered: trimmed.rendered },
			empty,
		]
		const probes = rungs.map((rung) => [
			...built.slice(0, -1),
			...stripThinking(
				[
					...tail.slice(0, -1),
					...rung.window.flatMap((entry) => [entry.request, entry.reply]),
					buildRequestMessage(built.at(-1) ?? request, rung.rendered.text),
				],
				this.#replay,
			),
		])
		const offered = rungs.map((rung) =>
			hasHiddenRecall(
				input,
				request.id,
				this.#requests,
				this.#annotations,
				[...tail.slice(0, -1), ...rung.window.flatMap((entry) => [entry.request, entry.reply])],
				[...rung.window.flatMap((entry) => entry.lines), ...rung.rendered.lines],
			),
		)
		const longest = this.#findLongest()
		const closed = probes.map((messages, at) => {
			const tools = advertised.filter((tool) => tool.name !== 'recall' || offered[at])
			const calls = [
				{ estimate: estimateMessages(messages), tools: tools.length, spared: this.#spared(tools) },
			]
			return (
				offered[at] === true &&
				this.#gauge !== undefined &&
				this.#gauge.remainder(calls) - this.#predict < 2 * this.#gauge.reserve(calls, longest)
			)
		})
		// Admission follows trimming: the exchange can spend spare room, never a record or a seed message.
		const prices = probes.map((messages) => this.#price(messages))
		const admitted =
			rungs.find(
				(_rung, at) =>
					(prices[at] ?? Infinity) <= total && (closed[2] === true || closed[at] === false),
			) ?? empty
		const recall = offered[rungs.indexOf(admitted)] === true
		const ceiling = intersectKeys(this.#agent.context.scope?.tools, bound)
		const admits = ceiling === undefined || ceiling.includes('recall')
		if (!recall && admits) {
			const tools = definitions.filter((tool) => tool.name !== 'recall').map((tool) => tool.name)
			const host = this.#agent.context.scope
			const narrowed = host?.narrow({ tools }) ?? createScope({ name: 'ledger', tools })
			this.#current()?.apply(narrowed)
			this.#agent.context.apply(narrowed)
		}
		const copy = buildRequestMessage(request, admitted.rendered.text)
		const kept = admitted.window.flatMap((entry) => entry.lines)
		const origins = new Set([
			request.id,
			...admitted.window.flatMap((entry) => [entry.request.id, entry.reply.id]),
			...kept.map((line) => line.source),
			...admitted.rendered.lines.map((line) => line.source),
		])
		const draft: LedgerDraft = {
			copy,
			lines: admitted.rendered.lines,
			evidence: collectLedgerEvidence(scan.messages, origins, projection.amendments),
			window: admitted.window,
		}
		const shown = buildLedgerRenderContext(
			scan.messages,
			[...kept, ...admitted.rendered.lines],
			[],
		).complete
		// The tail priced each stub naming `recall`; rendered again after admission, a hidden stub names
		// it only when the admitted rung advertises it, which can only shorten the stub.
		const route = recall && admits
		return {
			draft,
			messages: [
				...tail
					.slice(0, -1)
					.map((message) =>
						message.role === 'tool' ? this.#renderTailStub(message, scan, shown, route) : message,
					),
				...admitted.window.flatMap((entry) => [entry.request, entry.reply]),
				copy,
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
		built: readonly Message[],
		tail: readonly Message[],
		total: number,
		amendments: readonly LedgerAmendment[],
		scan: LedgerScan,
	): {
		readonly rendered: LedgerRenderResult
		readonly records: readonly LedgerRecord[]
		readonly included: ReadonlySet<string>
	} {
		const head = built.slice(0, -1)
		const priced = built.at(-1)
		if (priced === undefined) throw new Error('a built plan holds its request')
		const found = findLedgerCut(0, steps.length, (count) => {
			const cut = buildLedgerCut(steps.slice(0, count), records, included)
			const rendered = this.#render(cut.records, mapped, cut.included, amendments, scan)
			const copy = buildRequestMessage(priced, rendered.text)
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
		held: ReadonlySet<string> = new Set(),
		prefix: readonly LedgerOccurrence[] = [],
	): LedgerRenderResult {
		const population = records.map((record) => ({
			...record,
			lines: collectLedgerLines(record, held),
		}))
		const entries = mapped
			.filter((unit) => included.has(unit.source))
			.flatMap(({ record: unit }) =>
				[...Map.groupBy(collectLedgerLines(unit, new Set()), (line) => line.source)].map(
					([source, lines]) => ({
						unit,
						source,
						lines,
					}),
				),
			)
		// A source renders once, under the first unit that carries it.
		const first = new Map(entries.toReversed().map((entry) => [entry.source, entry]))
		const unique = entries
			.filter((entry) => first.get(entry.source) === entry)
			.map((entry) => ({
				...entry,
				lines: entry.lines.filter(
					(line) =>
						!prefix.some(
							(prior) => prior.source === line.source && prior.sentence === line.sentence,
						),
				),
			}))
			.filter((entry) => entry.lines.length > 0)
		const record = population.find(
			(candidate) => candidate.key === LEDGER_RULES_KEY && candidate.lines.length > 0,
		)
		const ownerRecords = population.filter(
			(candidate) => candidate.key !== LEDGER_RULES_KEY && candidate.lines.length > 0,
		)
		// The context reads the lines in the order the records emit them, so each source's first
		// retained line carries its annotation and its reference.
		const lines = [
			...ownerRecords.flatMap((candidate) => candidate.lines),
			...unique
				.filter((entry) => entry.unit.key !== LEDGER_RULES_KEY)
				.flatMap((entry) => entry.lines),
			...(record?.lines ?? []),
			...unique
				.filter((entry) => entry.unit.key === LEDGER_RULES_KEY)
				.flatMap((entry) => entry.lines),
		]
		const context = buildLedgerRenderContext(scan.messages, [...prefix, ...lines], amendments)
		const owners = ownerRecords.map((owner) => renderLedgerPinned(owner, context)).join('\n\n')
		const rendered = unique.map(({ unit, source, lines: retained }) => {
			const sentences = splitSentences(this.#conversation.message(source)?.content ?? '')
			return {
				rules: unit.key === LEDGER_RULES_KEY,
				texts:
					unit.key === LEDGER_RULES_KEY && source === unit.members[0]
						? retained.map((line) => this.#renderSource(source, sentences, [line], context, scan))
						: [this.#renderSource(source, sentences, retained, context, scan)],
			}
		})
		const pinned = rendered.filter((one) => !one.rules).flatMap((one) => one.texts)
		const rules = rendered.filter((one) => one.rules).flatMap((one) => one.texts)
		const body = [owners, pinned.join('\n')].filter((text) => text !== '').join('\n\n')
		const text = [
			body === '' ? '' : `## Records\n${body}`,
			record === undefined
				? rules.length === 0
					? ''
					: ['## Rules', ...rules].join('\n')
				: [renderLedgerRecord(record, context), ...rules].join('\n'),
		]
			.filter((part) => part !== '')
			.join('\n\n')
		return { text, lines }
	}

	#selectTail(
		request: Message,
		total: number,
		input: LedgerProjectionInput,
		scan: LedgerScan,
	): readonly Message[] {
		const cap = total * this.#share.tail
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
					![...(this.#options.lookups ?? []), ...(this.#options.writes ?? [])].some(
						(entry) => entry.tool.name === call.name,
					) ||
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

	#selectExchange(request: Message, input: LedgerProjectionInput): readonly Message[] {
		const before = input.messages.slice(
			0,
			input.messages.findIndex((message) => message.id === request.id),
		)
		const previous = before.findLast((message) => this.#requests.has(message.id))
		const reply =
			previous === undefined
				? undefined
				: collectLedgerReplies(before, this.#requests, this.#annotations).get(previous.id)
		return previous !== undefined && reply !== undefined ? [previous, reply] : []
	}

	#commitExchange(request: LedgerRequest): void {
		const draft = request.sent
		const message = request.message
		if (message === undefined) return
		const reply = collectLedgerReplies(
			this.#conversation.messages(),
			this.#requests,
			this.#annotations,
		).get(message.id)
		if (reply === undefined) return
		this.#window = [
			...(draft?.window ?? this.#window),
			{ request: draft?.copy ?? message, reply, lines: draft?.lines ?? [] },
		]
		const evidence = draft?.evidence ?? this.#evidence
		this.#evidence = {
			messages: new Set([
				...evidence.messages,
				...collectLedgerEvidence([message, reply], new Set([message.id, reply.id]), []).messages,
			]),
			amendments: evidence.amendments,
		}
	}

	#renderTailStub(
		message: Message,
		scan: LedgerScan,
		shown?: ReadonlySet<string>,
		offered = true,
	): Message {
		const group = scan.group(message.id)
		const call = group === undefined ? undefined : findLedgerCall(group, message)
		const write = this.#options.writes?.some((one) => one.tool.name === call?.name) === true
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
							: scan.findings.some((other) => shown.has(other.id) && matchesLookup(finding, other))
								? 'shown'
								: 'hidden',
				write,
				offered,
			),
		}
	}

	// A write that ran retires the findings its targets name, so the request admits again each lookup
	// call whose finding it retired: a later read that checks the write reads changed state. The write's
	// message isn't stored yet, so the scan reads its result as the message the loop stores next.
	#release(call: ToolCall, result: ToolResult): void {
		const request = this.#current()
		const write = this.#options.writes?.find((one) => one.tool.name === call.name)
		if (request === undefined || write === undefined || !result.success) return
		const text = settleToolResult(result).content
		const read = attempt(() => {
			const change = write.read(call.arguments, text)
			return change === undefined ? [] : [...change.targets]
		})
		if (!read.success || read.value.length === 0) return
		const messages = this.#conversation.messages()
		const findings = this.#readLookups(messages)
		const id = crypto.randomUUID()
		const edges = collectWriteSupersessions(
			[...messages, { id, role: 'tool', content: text, call: call.id }],
			[
				...findings,
				{
					id,
					name: call.name,
					arguments: call.arguments,
					text,
					result: undefined,
					targets: read.value,
				},
			],
		)
		for (const finding of findings)
			if (
				(edges.get(finding.id) ?? []).includes(id) &&
				this.#options.lookups?.some((lookup) => lookup.tool.name === finding.name) === true
			)
				request.release(finding.name, finding.arguments)
	}

	#observeRequest(sent: ProviderRequest): void {
		this.#flush()
		const request = this.#current()
		if (request?.boundary === undefined) return
		const tools = sent.tools ?? []
		request.observe(
			{
				estimate: estimateMessages(sent.messages),
				tools: tools.length,
				spared: this.#spared(tools),
			},
			this.#conversation.messages().length,
		)
	}

	#spared(tools: readonly ToolDefinition[]): number {
		const overhead = this.#gauge?.overhead ?? 0
		if (tools.length === 0) return overhead
		const missing = this.#agent.context.tools
			.definitions()
			.filter((tool) => !tools.some((one) => one.name === tool.name))
		return missing.length === 0
			? 0
			: Math.min(overhead, estimateTokens(JSON.stringify(missing)) * (this.#gauge?.scale ?? 1))
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
		const request = this.#current()
		request?.admit(name, args)
		const entry =
			this.#options.lookups?.find((one) => one.tool.name === name) ??
			this.#options.writes?.find((one) => one.tool.name === name)
		if (entry === undefined) throw new Error(`unknown lookup or write ${name}`)
		const ran = attempt(() => entry.tool.execute(args, context))
		if (!ran.success) return this.#reject(request, name, args, ran.error)
		return isPromiseLike(ran.value)
			? Promise.resolve(ran.value).catch((error: unknown) =>
					this.#reject(request, name, args, error),
				)
			: ran.value
	}

	// A call its tool refuses for its arguments, from the tool's door or its handler, leaves the repeat
	// stop, so the identical call runs again and the model can repair it. Every other failure stays a run.
	#reject(
		request: LedgerRequest | undefined,
		name: string,
		args: Readonly<Record<string, unknown>>,
		error: unknown,
	): never {
		if (isToolError(error) && error.code === 'ARGUMENTS') request?.release(name, args)
		throw error
	}

	#recall(args: Readonly<Record<string, unknown>>): string {
		const request = this.#current()
		request?.think(this.#conversation.messages())
		const topic = isString(args.topic) ? args.topic.trim() : ''
		request?.admit('recall', { topic })
		const gauge = this.#gauge
		const calls = request?.calls ?? []
		request?.recall()
		const guidance = `an owner name, an id, or one of ${renderTopicNames(this.#options.topics)}`
		if (topic === '') throw new Error(`recall needs a topic: ${guidance}`)
		const rate = this.#recallRate(request) * (1 + LEDGER_SCALE_DRIFT)
		const call = calls.at(-1)
		const carried =
			request === undefined
				? 0
				: estimateMessages(
						stripThinking(
							[
								...this.#agent.context.build(
									request.selection === undefined ? {} : { selection: request.selection },
								),
								...this.#conversation.messages().slice(request.boundary),
							],
							this.#replay,
						),
					)
		const completion = isFiniteNumber(call?.prompt)
			? (call.completion ?? 0) - (this.#replay === 'none' ? (call.thinking ?? 0) : 0)
			: 0
		const extra = Math.max(0, (carried - (call?.estimate ?? carried)) * rate - completion)
		const drift = isFiniteNumber(call?.prompt)
			? 0
			: Math.max(0, (call?.estimate ?? 0) * (rate - (gauge?.scale ?? rate)))
		const siblings = estimateMessages(
			(request?.listings ?? [])
				.filter((listing) => listing.turn === calls.length)
				.map((listing) => ({ id: 'result', role: 'tool', content: listing.result })),
		)
		const room =
			gauge === undefined
				? -estimateMessages([buildRecallMessage(topic)])
				: (gauge.remainder(calls) - this.#predict - extra - drift) / rate - siblings
		const scan = this.#scan(this.#conversation.messages())
		// A recall while a selection holds its scan, which only a recall a host calls by hand during a
		// selection can make, holds no scan of its own, so the classifier's handlers read the selection's.
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
			const retired = collectRetiredFindings(scan.messages, scan.findings)
			const listable = new Map(
				input.messages
					.filter(
						(message, at) =>
							!this.#requests.has(message.id) &&
							!retired.has(message.id) &&
							(at < start || message.role === 'tool'),
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
						const content = source.content.replace(
							/(^|[\n\v\f\r\u0085\u2028\u2029])(?=Earlier (?:request|reply):)/g,
							'$1  ',
						)
						const text =
							lookup === undefined
								? content
								: `${renderLookupCall(lookup.name, lookup.arguments)}: ${content}`
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
													splitResultLines(content)[0] ?? '',
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
			const earlier = input.messages
				.slice(0, Math.max(0, start))
				.reverse()
				.flatMap((message) => {
					if (gathered.done.has(message.id) || this.#annotations.has(message.id)) return []
					const label = this.#requests.has(message.id)
						? LEDGER_RECALL_LABELS.request
						: message.role === 'assistant' && !hasCalls(message) && message.content.trim() !== ''
							? LEDGER_RECALL_LABELS.reply
							: undefined
					if (
						label === undefined ||
						!searches.some(
							(search) =>
								search.words.length > 0 &&
								search.words.every((word) => message.content.toLowerCase().includes(word)),
						)
					)
						return []
					// Only a label opens a line here, so a stored line can't read as a reply it isn't.
					return [`${label} ${message.content.replace(/[\n\v\f\r\u0085\u2028\u2029]+/g, '\n  ')}`]
				})
			const listed = [...gathered.listed, ...earlier]
			// Statements list ahead of conversation messages, so an omitted message can be newer than a kept one.
			const result =
				listed.length === 0
					? `nothing earlier on "${topic}"; answer from the messages you can see`
					: cutListing(listed, room, earlier.length > 0 ? 'more' : 'older', gauge === undefined)
			request?.list(result, gathered.recalled, listed)
			return result
		} finally {
			if (added) this.#scans.delete(scan)
		}
	}

	#buildDigest(request: LedgerRequest, entered: Message): LedgerRecovery {
		this.#flush()
		const groups = [
			...new Set(
				this.#collectAfter(entered).flatMap((message) => {
					const result = this.#results.get(message.id)
					if (message.role !== 'tool' || result?.success !== true) return []
					const recalled = result.name === 'recall'
					if (recalled && /^nothing earlier on /.test(message.content)) return []
					const listing = recalled
						? request.listings.findLast((one) => one.result === message.content)
						: undefined
					return (listing?.groups ?? [message.content])
						.map((group) =>
							splitResultLines(group)
								.map((line) => listing?.lines.get(line) ?? line)
								.join('\n'),
						)
						.filter((group) => group !== '')
				}),
			),
		]
		const unique = groups.filter(
			(group, at) =>
				!splitResultLines(group).every((line) =>
					groups.slice(0, at).some((earlier) => splitResultLines(earlier).includes(line)),
				),
		)
		const digest = unique.length === 0 ? undefined : `${LEDGER_NOTES.results}\n${unique.join('\n')}`
		const omitted: ReadonlySet<string> = new Set()
		const rate = this.#recallRate(request) * (1 + LEDGER_SCALE_DRIFT)
		const allowance = (this.#options.capacity - this.#predict) / rate
		const after = this.#collectAfter(entered)
		const recovery: readonly Message[] = [
			...(request.plan?.messages ?? request.selection?.messages ?? []),
			...after,
			{ id: 'cue', role: 'user', content: LEDGER_NOTES.cue },
		]
		const messages = recovery.filter((message) => message.role !== 'tool' && !hasCalls(message))
		const note: readonly Message[] =
			digest === undefined ? [] : [{ id: 'results', role: 'user', content: digest }]
		if (
			this.#gauge === undefined ||
			estimateMessages(
				stripThinking(
					this.#agent.context.build({
						selection: { messages: [...messages, ...note], judgments: [] },
					}),
					this.#replay,
				),
			) <= allowance
		)
			return { digest, omitted }
		const partials = new Set(
			after
				.filter((message) => message.role === 'assistant' && !hasCalls(message))
				.map((message) => message.id),
		)
		const base = estimateMessages(
			stripThinking(
				this.#agent.context.build({
					selection: {
						messages: messages.filter((message) => !partials.has(message.id)),
						judgments: [],
					},
				}),
				this.#replay,
			),
		)
		const fitted = cutListing(
			unique,
			allowance - base - estimateTokens(`${LEDGER_NOTES.results}\n`),
			'more',
			false,
		)
		return {
			digest: fitted === '' ? undefined : `${LEDGER_NOTES.results}\n${fitted}`,
			omitted: partials,
		}
	}

	#recallRate(request: LedgerRequest | undefined): number {
		const gauge = this.#gauge
		if (gauge === undefined) return 1
		const calls = request?.calls ?? []
		const last = calls.findLast((call) => isFiniteNumber(call.prompt))
		const measured =
			last !== undefined &&
			isFiniteNumber(last.prompt) &&
			last.estimate > 0 &&
			((last.spared ?? 0) === 0 || (last.spared ?? 0) >= gauge.overhead)
				? (last.prompt - Math.max(0, gauge.overhead - (last.spared ?? 0))) / last.estimate
				: 0
		return Math.max(gauge.rate(calls), measured)
	}
}
