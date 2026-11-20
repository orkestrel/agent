import type {
	AgentBuiltin,
	AgentChunk,
	AgentInterface,
	AgentResult,
	AgentRunOptions,
	AuthorityContext,
	AuthorityDecision,
	AuthorityInterface,
	ChannelInterface,
	StreamInterface,
} from '../agents/types.js'
import type {
	AgentDisclosure,
	ScopeFilter,
	ScopeInterface,
	Selection,
	Skill,
} from '../contexts/types.js'
import type { ConversationInterface } from '../conversations/types.js'
import type { ProviderInterface, ProviderRequest } from '../providers/types.js'
import type { Message, ThinkingReplay } from '../types.js'
import type {
	ClassifierResult,
	LedgerCategory,
	LedgerAgentInterface,
	GaugeCall,
	LedgerCommit,
	LedgerExchange,
	LedgerGauge,
	LedgerInterface,
	LedgerKey,
	LedgerLookupFinding,
	LedgerOptions,
	LedgerProjection,
	LedgerProjectionInput,
	LedgerResult,
	LedgerRecovery,
	LedgerShare,
	LedgerSnapshot,
} from './types.js'
import type { AbortInterface } from '@orkestrel/abort'
import type { TokenUsage } from '@orkestrel/budget'
import type { ToolCall, ToolContext, ToolDefinition, ToolResult } from '@orkestrel/tool'
import { createAbort, linkSignal } from '@orkestrel/abort'
import {
	describeFaults,
	repairValue,
	refuseOptionKeys,
	attempt,
	canonicalStringify,
	isError,
	isFiniteNumber,
	isPromiseLike,
	isString,
	objectShape,
	stringShape,
} from '@orkestrel/contract'
import { createTool, createToolManager, isToolError } from '@orkestrel/tool'
import { isTextContent } from '@orkestrel/workspace'
import { Authority } from '../agents/Authority.js'
import { builtinToolContracts } from '../agents/contracts.js'
import { createAgent, createChannel } from '../agents/factories.js'
import { AgentError } from '../agents/errors.js'
import {
	collectBuiltinDefinitions,
	denyCall,
	estimateMessages,
	filterAdvertisedTools,
	filterBuiltinCandidates,
	requireBuiltins,
	requireWorkspace,
	resolveDisclosure,
	settleToolResult,
} from '../agents/helpers.js'
import { createScope } from '../contexts/factories.js'
import {
	intersectFilters,
	intersectKeys,
	renderIndexEntry,
	resolveWorkspace,
} from '../contexts/helpers.js'
import { createConversationManager } from '../conversations/factories.js'
import { requireProviderModel } from '../providers/helpers.js'
import {
	collectToolGroups,
	extractLiterals,
	filterAllowList,
	findToolCall,
	estimateTokens,
	hasCalls,
	stripThinking,
	sumUsage,
} from '../helpers.js'
import { isPositiveSafeInteger } from '../validators.js'
import { Classifier } from './Classifier.js'
import { Gauge } from './Gauge.js'
import { LedgerRequest } from './LedgerRequest.js'
import { LedgerScan } from './LedgerScan.js'
import {
	DEFAULT_LEDGER_LIMIT,
	DEFAULT_LEDGER_SHARE,
	LEDGER_AGENT_KEYS,
	LEDGER_MISS_LIMIT,
	LEDGER_NOTES,
	LEDGER_OPTION_KEYS,
	LEDGER_OWNER_PREFIX,
	LEDGER_PREVIOUS_KEY,
	LEDGER_RECALL_LABELS,
	LEDGER_RECENT_LIMIT,
	LEDGER_RECENT_SHARE,
	LEDGER_RELEVANT_LIMIT,
	LEDGER_RELEVANT_SHARE,
	LEDGER_RULES_KEY,
	LEDGER_SAMPLE_BYTES,
	LEDGER_SCALE_DRIFT,
	LEDGER_SHARE_KEYS,
} from './constants.js'
import { isLedgerError, LedgerError } from './errors.js'
import {
	collectRetiredFindings,
	collectWriteSupersessions,
	mergeSupersessions,
	digestLedgerTools,
	collectLedgerAmenders,
	collectLedgerExchanges,
	collectLedgerRecurrences,
	collectLedgerStatements,
	filterLedgerShown,
	collectRecallMessages,
	buildLedgerIndex,
	buildRecallMessage,
	buildRequestMessage,
	collectLedgerKeys,
	collectLedgerMatches,
	findLedgerCut,
	renderLedgerKeys,
	renderTopicNames,
	scanAmendments,
	splitWords,
	buildRecords,
	collectRegistry,
	computeSkillPrice,
	computeToolDensity,
	computeToolPrice,
	cutListing,
	cutWorkspaceSample,
	matchEntities,
	matchesShownSuccessor,
	nameLedgerExchange,
	parseLedgerExchange,
	requirePredict,
	renderLookupCall,
	splitKey,
	splitResultLines,
} from './helpers.js'
import { ledgerSnapshotContract } from './contracts.js'
import { isFraction, isLedgerQuestion, isLedgerSnapshot } from './validators.js'

/**
 * Serves one conversation through classified records: each request sends the recent window of its newest exchanges, the current statements whole, a copy of the request turn carrying the Earlier index `recall` reads, and a final answer pass.
 * @example
 * ```ts
 * const ledger = new Ledger(provider, options)
 * ledger.conversation.add({ role: 'user', content: 'The refund needs approval.' })
 * const reply = await ledger.respond('What approval is needed?')
 * ```
 */
export class Ledger implements LedgerInterface {
	readonly #provider: ProviderInterface
	// The provider's model, read once at construction; a stored gauge holds only under it.
	readonly #model: string
	readonly #options: LedgerOptions
	readonly #replay: ThinkingReplay
	readonly #predict: number
	readonly #share: LedgerShare
	readonly #conversation: ConversationInterface
	readonly #agent: AgentInterface
	readonly #record: LedgerAgentInterface
	// The built-ins the agent enables, and the workspace every run renders, checked at construction.
	readonly #builtins: readonly AgentBuiltin[]
	readonly #given: string | undefined
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
	// The calibrated definitions `#gauge` priced, set with it. Every price reads this set, so a
	// definition a host act frees, adds, or replaces inside a request prices as added.
	#measured: readonly ToolDefinition[] | undefined
	// The refusal the gate kept when it last stopped a request, cleared when a pass opens.
	#refusal: LedgerError | undefined

	/**
	 * Composes the conversation, classifier, tools, and agent.
	 * @param provider - The provider that serves the conversation
	 * @param options - The filing policy, capacity, and request bounds
	 * @throws {LedgerError} Thrown when a threshold, share, capacity, limit, topic, lookup, or gauge is invalid
	 * @throws {LedgerError} Thrown when a write lacks the `consequential` annotation, writes come without `agent.authority`, or a write is named `recall` or shares a lookup's or another write's name (code `'WRITE'`)
	 * @throws {LedgerError} Thrown when `predict` is not a positive safe integer less than `capacity` (code `'CAPACITY'`)
	 * @throws {LedgerError} Thrown when `questions` fails `isLedgerQuestion` (code `'QUESTION'`)
	 * @throws {LedgerError} Thrown when `snapshot` is malformed or marks an id its conversation does not hold (code `'SNAPSHOT'`, its faults under `context.faults`)
	 * @throws {ConversationError} Thrown when `isLedgerSnapshot` admits `snapshot` but its conversation holds a `system` message (code `'ROLE'`) or repeats an id (code `'SNAPSHOT'`)
	 * @throws {ContractError} Thrown when the provider's `model` is missing, not a string, or empty (code `'placement'`)
	 */
	constructor(provider: ProviderInterface, options: LedgerOptions) {
		refuseOptionKeys(options, LEDGER_OPTION_KEYS, 'Ledger', 'LedgerOptions')
		refuseOptionKeys(options.agent, LEDGER_AGENT_KEYS, 'Ledger agent', 'LedgerAgentOptions')
		refuseOptionKeys(options.share, LEDGER_SHARE_KEYS, 'Ledger share', 'LedgerShare')
		this.#model = requireProviderModel(provider, 'Ledger')
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
		this.#predict = requirePredict(options.predict, options.capacity)
		if (options.agent?.limit !== undefined && !isPositiveSafeInteger(options.agent.limit))
			throw new LedgerError('LIMIT', 'an agent limit must be a positive safe integer')
		// `Array.from` visits a hole in either list as an undefined entry, as iteration does, so the
		// read of its `name` refuses it; `map` skips it.
		const topics = Array.from(options.topics, (topic) => topic.name)
		if (
			topics.some(
				(name) =>
					name.trim() === '' ||
					name.trim().toLowerCase() === LEDGER_RULES_KEY ||
					parseLedgerExchange(name) !== undefined,
			) ||
			new Set(topics).size !== topics.length
		)
			throw new LedgerError(
				'TOPIC',
				`topic names must be nonempty, unique, and neither ${LEDGER_RULES_KEY} nor an exchange key such as ${LEDGER_PREVIOUS_KEY} or ${LEDGER_PREVIOUS_KEY}-2, which recall reads as the rules record and an earlier exchange`,
			)
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
			...(options.agent?.scheduler === undefined ? {} : { scheduler: options.agent.scheduler }),
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
				description: `Read earlier items that are stored, not shown. The newest exchanges are often in the messages you see; the Earlier list names each one you can't see as ${LEDGER_PREVIOUS_KEY} or ${LEDGER_PREVIOUS_KEY}-N. Use it only when the request depends on something said earlier that the messages you see don't hold; if they are enough, answer without it. Pass one key from the Earlier list. Example: {"key":"BW-5512"} or {"key":"Odile Marlow"}; join keys with commas, like {"key":"BW-5512, Odile Marlow"}. Keys: ${LEDGER_PREVIOUS_KEY}-N (your request and reply N exchanges ago, counting your last answered one as 1), ${LEDGER_RULES_KEY} (the standing rules and corrections), ${options.topics.length === 0 ? 'an id, or an owner name' : `an id, an owner name, or a topic (${renderTopicNames(options.topics)})`}. Words from the message you need also match. A number given as the key reads as its digits. Returns exchange keys and rules in the order given, and other keys together, newest first. A key for something already in the messages you see says so. It finds nothing this conversation never held and does not read a record a lookup tool serves. A miss names keys you can use.`,
				contract: objectShape({
					key: stringShape({
						min: 1,
						description:
							'One key from the Earlier list, keys joined with commas, or words to match',
					}),
				}),
				execute: (args) => this.#recall(args),
			}),
		)
		this.#builtins = requireBuiltins(options.agent?.builtins, tools)
		if (this.#builtins.length > 0 && host === undefined)
			throw new AgentError(
				'AUTHORITY',
				"agent.builtins are set and no agent.authority is; pass authority: createAuthority({ fallback: { zone: 'default', verdict: 'allow' } }) to allow every call, or rules with a deny fallback",
			)
		this.#given = requireWorkspace(options.agent?.workspace)
		// The ledger allows exactly the names it advertises, so a tool a host adds to the agent's manager
		// later is denied instead of inheriting those names' trust. With a host authority, the ledger keeps
		// that deny and its own allow for recall, and every lookup, write, and built-in answers to the host.
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
			// A selection fault rejects the request it belongs to; a held question is a recovery, never a fault.
			strict: true,
			conversations,
			system: options.system,
			tools,
			authority: {
				evaluate: (context) => this.#evaluate(context, host, advertised, names),
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
		// A stored gauge holds only for the calibrated definitions its digest names and the model it was
		// measured on, so a hydrate with other definitions or under another provider model calibrates
		// before its first pass. A supplied gauge prices the definitions it holds.
		const calibrated = this.#calibrated()
		const digest = digestLedgerTools(calibrated)
		const stored = snapshot?.gauge
		const gauge =
			options.gauge ??
			(stored?.digest === digest && stored?.model === this.#model ? stored : undefined)
		if (gauge !== undefined) {
			this.#gauge = new Gauge({
				scale: gauge.scale,
				overhead: gauge.overhead,
				capacity: options.capacity,
				predict: this.#predict,
				replay: this.#replay,
			})
			this.#measured = calibrated
		}
		// A lookup, write, or built-in call the authority denies, or whose ask is declined or left
		// unanswered, stays denied for the rest of the request; a call denied for room does not.
		this.#agent.emitter.on('deny', (call, _reason, decision) => {
			if (
				decision !== undefined &&
				decision.reason !== LEDGER_NOTES.overflow &&
				call.name !== 'recall' &&
				(names.includes(call.name) || this.#enables(call.name))
			)
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
			this.#reopen(call, result)
		})
		this.#agent.emitter.on('select', (selection) => {
			if (isLedgerError(selection.fault) && selection.fault.code === 'REQUEST') return
			this.#current()?.adopt(selection, this.#conversation.messages().length)
		})
		this.#agent.emitter.on('fault', (error) => this.#current()?.fault(error))
		// The ledger prices each request as the loop composed it, before the provider receives it: one
		// it prices over `capacity - predict` is not sent, and its pass ends. A request it sends is
		// recorded as dispatched, so a scope a later listener changed counts as the provider receives
		// it. Every run on the agent is a pass of the active call.
		this.#agent.emitter.on('request', (index, sent) => {
			if (this.#gate(index, sent)) this.#observeRequest(sent)
		})
		this.#agent.emitter.on('usage', (usage) => this.#current()?.spend(usage))
		// A removed message takes its marks at the removal.
		this.#conversation.emitter.on('remove', (id) => this.#dropMarks(id))
		this.#conversation.emitter.on('clear', () => this.#clearMarks())
		// The host reads the agent through a record with no run member, so the `respond` and `stream`
		// methods start every run.
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
	 * @param signal - The signal bounding every calibration call; an abort rejects with its reason
	 * @returns The stored scale and overhead cost
	 * @throws {LedgerError} Thrown when a calibration call reports no prompt usage, or a prompt usage of 0 or less (code `'GAUGE'`)
	 * @throws {LedgerError} Thrown when a calibration call, with the tool definitions, without them, or with the workspace text, reports a prompt over `capacity`, the head included (code `'GAUGE'`)
	 * @throws {AgentError} Thrown when a request or calibration is active (code `'CONCURRENCY'`)
	 * @throws {LedgerError} Thrown after `destroy`, or after the host destroyed the emitter of the agent or the conversation (code `'DESTROYED'`)
	 */
	async calibrate(signal: AbortSignal): Promise<LedgerGauge> {
		this.#refuseDestroyed()
		this.#refuseBusy()
		this.#calibrations.add(signal)
		try {
			return await this.#measureGauge(signal)
		} finally {
			this.#calibrations.delete(signal)
		}
	}

	/**
	 * Serializes the conversation, marked ids, and gauge for a later ledger.
	 * @returns The snapshot, each id list in conversation order, with a gauge only when held
	 * @throws {AgentError} Thrown when a request or calibration is active (code `'CONCURRENCY'`)
	 * @throws {LedgerError} Thrown after `destroy`, or after the host destroyed the emitter of the agent or the conversation (code `'DESTROYED'`)
	 */
	snapshot(): LedgerSnapshot {
		this.#refuseDestroyed()
		this.#refuseBusy()
		this.#flush()
		const conversation = this.#conversation.snapshot()
		const ids = conversation.messages.map((message) => message.id)
		const gauge = this.gauge
		const priced = this.#digest()
		return {
			conversation,
			requests: ids.filter((id) => this.#requests.has(id)),
			notes: ids.filter((id) => this.#annotations.has(id)),
			failures: ids.filter((id) => this.#results.get(id)?.success === false),
			...(gauge === undefined || priced === undefined
				? {}
				: { gauge: { ...gauge, digest: priced, model: this.#model } }),
		}
	}

	/**
	 * Appends a request and serves it, recovering an unfinished or rejected first pass with one answer pass.
	 * In either pass, a call the model makes in a turn that advertises no tools runs nothing and ends the pass after that generation, whatever the agent's `limit`, and when every call of that turn failed, the ledger stores the reply without its calls: a reply with text ends the pass complete, and one without text ends it partial with empty content.
	 * A calibration call that reports no prompt usage, or a prompt usage of 0 or less, rejects with `LedgerError` code `'GAUGE'`; a provider error during calibration rejects with that error. A calibration call, with the tool definitions, without them, or with the workspace text, that reports a prompt over `capacity`, the head included, rejects with the same code and stores no request.
	 * When the answer pass rejects, `respond` rejects with that error, and a transient judge failure or another selection failure rejects it too, after the agent's `fault` event. A question the judge refuses is held, reported through `fault` once, and the request goes on. A rejection belongs to its own call: the ledger stays free, and the next call asks the judge again about whatever is still unanswered.
	 * @param content - The request text
	 * @param signal - The caller's cancellation signal; an abort during calibration rejects with its reason
	 * @returns The final pass, the usage of every pass, and the filing attempts of this request alone
	 * @throws {AgentError} Thrown when a request or calibration is active (code `'CONCURRENCY'`)
	 * @throws {LedgerError} Thrown when a calibration call reports no prompt usage, or a prompt usage of 0 or less (code `'GAUGE'`)
	 * @throws {LedgerError} Thrown when a calibration call, with the tool definitions, without them, or with the workspace text, reports a prompt over `capacity`, the head included (code `'GAUGE'`)
	 * @throws {LedgerError} Thrown when the answer pass prices over `capacity - predict` with its note left out, or a host act after the note grows its request past that limit (code `'OVERFLOW'`)
	 * @throws {LedgerError} Thrown after `destroy`, or after the host destroyed the emitter of the agent or the conversation (code `'DESTROYED'`)
	 * @throws {ContractError} Thrown when `signal` is defined and is not a native `AbortSignal`
	 */
	respond(content: string, signal?: AbortSignal): Promise<LedgerResult> {
		return this.#serve(content, signal, undefined)
	}

	/**
	 * Appends a request and serves it as `respond` does, yielding each pass's chunks in pass order.
	 * Tokens of a first pass the answer pass replaces still reach the consumer, while the result's `content` is the last pass's alone. Breaking out of the events early, or the handle's `abort`, ends the request as a caller abort does. Every refusal `respond` rejects with rejects the result and throws from the events instead of throwing from this call.
	 * @param content - The request text
	 * @param signal - The caller's cancellation signal, read as `respond` reads it
	 * @returns The live handle: every pass's chunks, the settled result, and the abort that ends the request
	 */
	stream(content: string, signal?: AbortSignal): StreamInterface<AgentChunk, LedgerResult> {
		const handle = createAbort()
		const channel = createChannel<AgentChunk>()
		const result = this.#serve(content, signal, { channel, signal: handle.signal }).then(
			(settled) => {
				channel.close()
				return settled
			},
			(error: unknown) => {
				channel.fail(error)
				throw error
			},
		)
		// A handle whose result nobody awaits raises no unhandled rejection; an awaited one still rejects.
		result.catch(() => {})
		return {
			events: this.#drainEvents(channel, handle),
			result,
			abort: (reason?: unknown) => handle.abort(reason),
		}
	}

	/**
	 * Destroys the conversation's emitter and the agent's emitter, ending every subscription on them, and refuses each later call with `LedgerError` code `'DESTROYED'`; a second call changes nothing.
	 * @throws {AgentError} Thrown when a request or calibration is active (code `'CONCURRENCY'`)
	 */
	destroy(): void {
		this.#refuseBusy()
		this.#conversation.destroy()
		this.#agent.emitter.destroy()
	}

	// Serves one request through its passes. `respond` runs it with no sink; `stream` runs it with the
	// channel each pass's chunks reach and the signal its handle aborts, which joins the caller's.
	async #serve(
		content: string,
		signal: AbortSignal | undefined,
		sink:
			| { readonly channel: ChannelInterface<AgentChunk>; readonly signal: AbortSignal }
			| undefined,
	): Promise<LedgerResult> {
		this.#refuseDestroyed()
		this.#refuseBusy()
		const abort = createAbort({ ...(signal === undefined ? {} : { signal }) })
		const caller = sink === undefined ? abort.signal : linkSignal(abort.signal, sink.signal)
		const request = new LedgerRequest(content)
		// Each pass binds the scope the request entered with, so a scope widened during the request
		// adds nothing before the next one, and a narrowing still reaches the next turn.
		const scope = this.#agent.context.scope
		this.#live.set(request, scope)
		try {
			// A calibrated definition added or removed since the gauge was stored changes its digest,
			// and the stored price no longer holds.
			if (this.#gauge === undefined || digestLedgerTools(this.#calibrated()) !== this.#digest()) {
				this.#gauge = undefined
				await this.#measureGauge(caller)
			}
			const entered = request.enter(this.#conversation)
			this.#requests.add(entered.id)
			// The answer pass recovers a provider failure in the first pass; the agent's error event carries
			// its cause. A selection failure that reached here rejected the strict run, and it stands.
			const first = this.#dropStrayCalls(
				request,
				await this.#generatePass(request, caller, this.#options.think, scope, sink?.channel).catch(
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
							// The pass advertises no tools, so the stored request stands in for the copy whose
							// Earlier index asks for `recall`.
							messages: selection.messages
								.filter(
									(one) => one.role !== 'tool' && !hasCalls(one) && !recovery.omitted.has(one.id),
								)
								.map((one) => (one.id === entered.id ? entered : one)),
						}
					},
				})
				passes.push(
					this.#dropStrayCalls(
						request,
						await this.#generatePass(request, caller, false, answer, sink?.channel),
					),
				)
				// An answer pass the gate stopped at its request rejects, unless the caller aborted.
				const refusal = this.#refusal
				if (refusal !== undefined && !caller.aborted) throw refusal
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
			this.#live.delete(request)
		}
	}

	// The live events of a `stream` call. Its `return()`, which a consumer's early `break` fires, aborts
	// the request as its caller would; a natural end comes after the request settled, where the abort
	// changes nothing.
	async *#drainEvents(
		channel: ChannelInterface<AgentChunk>,
		handle: AbortInterface,
	): AsyncGenerator<AgentChunk, void> {
		try {
			yield* channel.drain()
		} finally {
			handle.abort()
		}
	}

	async #measureGauge(signal: AbortSignal): Promise<LedgerGauge> {
		try {
			// The sample is the head alone under the ceiling with no workspace: no conversation message
			// and no workspace text, so a thread's length or a workspace's size moves neither of these two calls.
			const messages = this.#agent.context.build({
				selection: { messages: [], judgments: [] },
				scope: createScope({ name: 'calibration', workspaces: [] }),
			})
			const definitions = this.#calibrated()
			const priced = await this.#provider.generate(messages, signal, definitions, {
				think: false,
			})
			this.#refuseOverCapacity('with', priced.usage?.prompt)
			const bare = await this.#provider.generate(messages, signal, undefined, { think: false })
			this.#refuseOverCapacity('without', bare.usage?.prompt)
			if (
				!isFiniteNumber(priced.usage?.prompt) ||
				priced.usage.prompt <= 0 ||
				!isFiniteNumber(bare.usage?.prompt) ||
				bare.usage.prompt <= 0
			)
				throw new LedgerError('GAUGE', 'calibration requires prompt usage from each call')
			const scale = await this.#measureScale(messages, bare.usage.prompt, signal)
			this.#gauge = new Gauge({
				capacity: this.#options.capacity,
				predict: this.#predict,
				replay: this.#replay,
				scale,
				overhead: Math.max(0, priced.usage.prompt - bare.usage.prompt),
			})
			this.#measured = definitions
			return { scale: this.#gauge.scale, overhead: this.#gauge.overhead }
		} catch (error) {
			signal.throwIfAborted()
			throw error
		}
	}

	// The head's rate, or, when the workspace the next request renders adds text, the higher of that rate
	// and the rate a third call reads on the head with that text cut to what the window left, its tokens
	// scaled from the cut text's estimate to the whole text's.
	async #measureScale(
		head: readonly Message[],
		bare: number,
		signal: AbortSignal,
	): Promise<number> {
		const rate = bare / estimateMessages(head)
		const workspace = this.#show(intersectFilters(this.#agent.context.scope, undefined)).workspace
		// The listing passes no `workspaces` list: the build that follows applies the context scope's.
		const files = (
			resolveWorkspace(this.#agent.context.workspaces, workspace, undefined)?.files() ?? []
		).flatMap((file) => (isTextContent(file.content) ? [file.path] : []))
		// The sample carries the workspace's text alone: an image needs a user turn, which it holds none of.
		const shown = this.#agent.context.build({
			selection: { messages: [], judgments: [] },
			scope: createScope({ name: 'calibration', files }),
			disclosure: { skills: [], ...(workspace === undefined ? {} : { workspace }) },
		})
		const whole = estimateMessages(shown) - estimateMessages(head)
		const cut = cutWorkspaceSample(
			head,
			shown,
			Math.floor((this.#options.capacity - bare) / LEDGER_SAMPLE_BYTES),
		)
		const part = cut === undefined ? 0 : estimateMessages(cut) - estimateMessages(head)
		// No workspace text, or none the window left room for, keeps the head's rate.
		if (cut === undefined || whole <= 0 || part <= 0) return rate
		const third = await this.#provider.generate(cut, signal, undefined, { think: false })
		this.#refuseOverCapacity('workspace', third.usage?.prompt)
		if (!isFiniteNumber(third.usage?.prompt) || third.usage.prompt <= 0)
			throw new LedgerError('GAUGE', 'calibration requires prompt usage from each call')
		const tokens = bare + ((third.usage.prompt - bare) * whole) / part
		return Math.max(rate, tokens / estimateMessages(shown))
	}

	// A calibration call the window cannot carry whole measures nothing the gauge can hold, so a finite
	// reported prompt over the capacity refuses before a gauge is stored, naming the call and its remedy.
	#refuseOverCapacity(call: 'with' | 'without' | 'workspace', prompt: number | undefined): void {
		const capacity = this.#options.capacity
		const subject =
			call === 'workspace' ? 'with the workspace text' : `${call} the tool definitions`
		const remedy =
			call === 'workspace'
				? 'narrow what the scope shows of the workspace, or raise capacity'
				: 'hold tools behind a skill with the `load` built-in, register fewer tools, or raise capacity'
		if (isFiniteNumber(prompt) && prompt > capacity)
			throw new LedgerError(
				'GAUGE',
				`the calibration call ${subject} prices ${prompt} tokens, the head included, over the capacity ${capacity}; ${remedy}`,
				{ context: { capacity, prompt } },
			)
	}

	async #generatePass(
		request: LedgerRequest,
		signal: AbortSignal,
		think: boolean | undefined,
		scope: ScopeInterface | undefined,
		sink: ChannelInterface<AgentChunk> | undefined,
	): Promise<AgentResult> {
		this.#refusal = undefined
		request.open(this.#conversation.messages().length)
		const stop = request.signal
		const options: AgentRunOptions = {
			signal: stop === undefined ? signal : linkSignal(signal, stop),
			conversation: this.#conversation,
			...(think === undefined ? {} : { think }),
			...(scope === undefined ? {} : { scope }),
		}
		if (sink === undefined) return await this.#agent.generate(options)
		// A pass with a sink reads the run's chunks as they arrive; the run settles the same result.
		const run = this.#agent.stream(options)
		for await (const chunk of run.events) sink.push(chunk)
		return await run.result
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
		// The removal drops the replies' failure marks through the conversation's `remove` event.
		this.#conversation.remove([reply.id, ...replies.map((message) => message.id)])
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

	// Refuses a call while a request or calibration is active.
	#refuseBusy(): void {
		if (this.#live.size > 0 || this.#calibrations.size > 0)
			throw new AgentError('CONCURRENCY', 'a ledger request is already active')
	}

	// Refuses a call once the emitter of the agent or of the conversation is destroyed, because the
	// capacity gate, the filing, and the marks run on their listeners.
	#refuseDestroyed(): void {
		if (this.#agent.emitter.destroyed || this.#conversation.emitter.destroyed)
			throw new LedgerError(
				'DESTROYED',
				'the ledger is destroyed, or its host destroyed the emitter of its agent or its conversation; build another ledger, hydrated from a snapshot taken before, to serve this conversation',
			)
	}

	// A removed message takes its marks, as a snapshot omits it.
	#dropMarks(id: string): void {
		this.#requests.delete(id)
		this.#annotations.delete(id)
		this.#results.delete(id)
	}

	// A cleared conversation holds no message a mark can name.
	#clearMarks(): void {
		this.#requests.clear()
		this.#annotations.clear()
		this.#results.clear()
	}

	// Decides one call before the host's authority reads it. In one request, the identical retry of a
	// denied call and the identical second call of a built-in stop as repeats, and a load, a remember,
	// or a switch the room cannot hold is denied for room. An admitted built-in commits what its room
	// test priced, and a lookup or a write cleared here commits one result.
	#evaluate(
		context: AuthorityContext,
		host: AuthorityInterface | undefined,
		advertised: Authority,
		names: readonly string[],
	): AuthorityDecision {
		const request = this.#current()
		const { name, arguments: args } = context.call
		if (request?.denied(name, args) === true)
			return { zone: 'ledger', verdict: 'deny', reason: LEDGER_NOTES.repeat }
		if (this.#enables(name)) {
			const admitted = attempt(() => request?.admit(name, args))
			if (!admitted.success) {
				if (isError(admitted.error) && admitted.error.message === LEDGER_NOTES.repeat)
					return { zone: 'ledger', verdict: 'deny', reason: LEDGER_NOTES.repeat }
				throw admitted.error
			}
			if (request !== undefined) {
				const commitment = this.#room(request, name, args)
				if (commitment === undefined)
					return { zone: 'ledger', verdict: 'deny', reason: LEDGER_NOTES.overflow }
				request.commit(commitment.price, commitment.skill)
			}
			// Construction refuses built-ins without a host authority.
			return host === undefined ? advertised.evaluate(context) : host.evaluate(context)
		}
		const decision =
			host === undefined || name === 'recall' || !names.includes(name)
				? advertised.evaluate(context)
				: host.evaluate(context)
		if (
			request !== undefined &&
			decision.verdict !== 'deny' &&
			name !== 'recall' &&
			names.includes(name)
		)
			request.commit(this.#priceResult(request.calls))
		return decision
	}

	// Returns what an admitted built-in call commits, or undefined when the room refuses it. A load is
	// tested against the measured remainder less the generation cap, with the turn's commitments and
	// one result, and against the thread's share, counting the loads the batch already admitted; a
	// remember by its index line; and a switch by the tokens its workspace adds over the shown one.
	// With no gauge, those three are refused. A skill the ceiling or the registry refuses, or one
	// already shown, prices at 0, and its handler decides it; every other built-in prices at 0.
	#room(
		request: LedgerRequest,
		name: string,
		args: Readonly<Record<string, unknown>>,
	): Pick<LedgerCommit, 'price' | 'skill'> | undefined {
		if (name !== 'load' && name !== 'remember' && name !== 'switch') return { price: 0 }
		const gauge = this.#gauge
		if (gauge === undefined) return undefined
		const room = gauge.remainder(request.calls) - this.#predict
		// The door repairs a lossless leaf, so the repaired arguments decide what the call named.
		const repaired = repairValue(builtinToolContracts[name].contract, { ...args })
		const values: Readonly<Record<string, unknown>> = repaired.success ? repaired.value.value : {}
		if (name === 'remember') {
			const line =
				isString(values['name']) && isString(values['description'])
					? renderIndexEntry({ name: values['name'], description: values['description'] })
					: ''
			const price = gauge.scale * estimateTokens(line)
			return (request.committed + price) * (1 + LEDGER_SCALE_DRIFT) > room ? undefined : { price }
		}
		const ceiling = this.#ceiling(request)
		const shown = this.#show(ceiling)
		if (name === 'switch') {
			const workspace = values['workspace']
			const price = isString(workspace)
				? gauge.scale *
					Math.max(
						0,
						this.#estimateHead(request, ceiling, {
							skills: shown.skills,
							workspace,
						}) - this.#estimateHead(request, ceiling, shown),
					)
				: 0
			return (request.committed + price) * (1 + LEDGER_SCALE_DRIFT) > room ? undefined : { price }
		}
		// The thread's shown skills, then the loads this batch already admitted.
		const thread = [...new Set([...shown.skills, ...request.loads])]
		const skill = filterAllowList(
			ceiling.skills,
			this.#agent.context.skills.skills(),
			(one) => one.name,
		).find((one) => one.name === values['skill'])
		if (skill === undefined || thread.includes(skill.name)) return { price: 0 }
		const price = this.#priceSkill(skill, ceiling, this.#advertise(ceiling, thread))
		const budget = (this.#options.capacity - this.#predict) * this.#share.prompt
		return (request.committed + price + this.#priceResult(request.calls)) *
			(1 + LEDGER_SCALE_DRIFT) >
			room || this.#priceShown({ skills: thread }, ceiling) + price > this.#share.skills * budget
			? undefined
			: { price, skill: skill.name }
	}

	// The estimate of the head a pass's next build renders with these skills and workspace shown,
	// over the selection the pass adopted.
	#estimateHead(request: LedgerRequest, ceiling: ScopeFilter, shown: AgentDisclosure): number {
		return estimateMessages(
			stripThinking(
				this.#agent.context.build({
					...(request.selection === undefined ? {} : { selection: request.selection }),
					disclosure: shown,
					switchable: this.#advertise(ceiling, shown.skills).some((tool) => tool.name === 'switch'),
				}),
				this.#replay,
			),
		)
	}

	// A successful built-in call reopens the calls of this request whose answer it changed, read from
	// the request's stored messages: an unload reopens the load of its skill and each call the room
	// denied, a load the unload of its skill, a switch every other switch, and a remember the memo of
	// its name. Only messages stored before it are read, so a later call of its batch stays shut.
	#reopen(call: ToolCall, result: ToolResult): void {
		const request = this.#current()
		const entered = request?.message
		if (
			request === undefined ||
			entered === undefined ||
			!result.success ||
			!this.#enables(call.name)
		)
			return
		const messages = this.#conversation.messages()
		const stored = messages.slice(messages.findIndex((message) => message.id === entered.id) + 1)
		const pairs = collectToolGroups(stored).flatMap((group) =>
			group.slice(1).flatMap((message) => {
				const owner = findToolCall(group, message)
				return owner === undefined ? [] : [{ call: owner, content: message.content }]
			}),
		)
		const key = canonicalStringify(call.arguments)
		const reopened = pairs.filter(({ call: earlier, content }) =>
			call.name === 'unload'
				? (earlier.name === 'load' && earlier.arguments.skill === call.arguments.skill) ||
					content === settleToolResult(denyCall(earlier, LEDGER_NOTES.overflow)).content
				: call.name === 'load'
					? earlier.name === 'unload' && earlier.arguments.skill === call.arguments.skill
					: call.name === 'switch'
						? earlier.name === 'switch' && canonicalStringify(earlier.arguments) !== key
						: call.name === 'remember' &&
							earlier.name === 'memo' &&
							earlier.arguments.name === call.arguments.name,
		)
		for (const { call: earlier } of reopened) request.release(earlier.name, earlier.arguments)
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
				// A result waits only at the end of the conversation, where its tool message lands next. One
				// elsewhere lost its message to a removal or a shift, so it files onto no other message.
			} else if (at !== messages.length) this.#pending.delete(at)
		}
	}

	// Seats the hydrated marks. A failure is rebuilt as the result the agent's `tool` event carried:
	// its error is the tool message's content, and its name is the call's, or `tool` when no call
	// pairs with it.
	#seat(snapshot: LedgerSnapshot): void {
		for (const id of snapshot.requests) this.#requests.add(id)
		for (const id of snapshot.notes) this.#annotations.add(id)
		const messages = this.#conversation.messages()
		const groups = collectToolGroups(messages)
		for (const message of messages) {
			if (!snapshot.failures.includes(message.id)) continue
			const group = groups.find((entries) => entries.some((one) => one.id === message.id))
			const call = group === undefined ? undefined : findToolCall(group, message)
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
			// A recall result copies messages already filed at their source, so it files as chatter.
			return this.#results.get(message.id)?.success === false ||
				this.#readCallName(message, scan) === 'recall'
				? 'chatter'
				: 'fact'
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

	// The name of the call a tool message answers: its stored result's, then its group's in the held
	// scan, then its group's in the conversation, so a hydrated ledger reads what the live one stored.
	#readCallName(message: Message, scan: LedgerScan | undefined): string | undefined {
		const stored = this.#results.get(message.id)
		if (stored !== undefined) return stored.name
		const group =
			scan?.group(message.id) ??
			collectToolGroups(this.#conversation.messages()).find((entries) =>
				entries.some((one) => one.id === message.id),
			)
		return group === undefined ? undefined : findToolCall(group, message)?.name
	}

	#readLookups(messages: readonly Message[]): readonly LedgerLookupFinding[] {
		this.#flush()
		return collectToolGroups(messages).flatMap((group) =>
			group.slice(1).flatMap((message): LedgerLookupFinding[] => {
				const call = findToolCall(group, message)
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

	// Files a classification's attempts into the request and plans the selection, which lists the
	// questions the filing held as recoveries. A filing fault, a transient judge failure, or a plan
	// that throws falls back to the conversation view with that error as the fault.
	#file(
		classified: ClassifierResult,
		request: LedgerRequest,
		selected: Message,
		message: Message,
		filter: ScopeFilter | undefined,
	): Selection {
		const { attempts, failure, holds, fault, ...filed } = classified
		const recovered = holds.length === 0 ? filed : { ...filed, recoveries: holds }
		const planned = attempt(() => {
			if (fault !== undefined) throw fault
			if (failure !== undefined) throw failure
			return { ...this.#plan(selected, this.#rescan(), filter), ...recovered }
		})
		request.file(attempts, planned.success ? planned.value : undefined)
		if (!planned.success) return this.#refuse(planned.error, recovered, this.#conversation)
		const selection = planned.value
		return this.#annotations.has(message.id)
			? {
					...selection,
					messages: [...selection.messages, ...this.#collectAfter(selected)],
				}
			: selection
	}

	// Falls back to the given conversation's view with the failure as the selection's fault, keeping
	// the filing completed before it and the questions it held.
	#refuse(
		error: unknown,
		filed: Pick<Selection, 'judgments' | 'usage' | 'recoveries'>,
		conversation: ConversationInterface,
	): Selection {
		if (conversation === this.#conversation && !(isLedgerError(error) && error.code === 'REQUEST'))
			this.#current()?.file([])
		return {
			...filed,
			messages: conversation.messages(),
			fault: isError(error) ? error : new Error(String(error)),
		}
	}

	#price(messages: readonly Message[]): number {
		return (this.#gauge?.scale ?? 1) * estimateMessages(messages)
	}

	// Plans a request's opening: the recent window, the newest exchanges that have a reply, each with
	// its call turns and results but a group every result of which is retired, and the amenders inside
	// its span, the earlier user messages retrieval ranks best, the newest member of each recurrence,
	// and the current statements whole, in conversation order and without a statement a shown successor
	// supersedes, then the request copy, which carries the Earlier index of what the opening leaves
	// behind while `recall` is advertised. Past the budget the steps cut the window's exchanges oldest
	// first down to the newest one, then the retrieved messages lowest rank first, then the newest
	// exchange, then the exchange rows from the deepest down to `previous-2`, then the id rows
	// last-ranked first, then the recurrence, then the statements oldest first, then the topic rows last
	// first, `rules`, `previous`, and the rest of the index. Each step reads its own shown messages, its
	// index, and whether it leaves anything behind; a statement it leaves out for a shown successor
	// counts as shown. The first window or retrieval step that fits stays, so it never shrinks as the
	// budget grows; then the first cut of its rows that leaves `recall` its room wins, else that step as
	// it fits. With no such step that fits, the first bare row cut that leaves the room wins, else the
	// first that fits, else the recurrence and statement cuts.
	#plan(
		request: Message,
		scan: LedgerScan,
		filter: ScopeFilter | undefined,
	): Pick<Selection, 'messages'> {
		const { input, projection } = this.#project(scan)
		const at = scan.position(request.id) ?? scan.messages.length
		const before = scan.messages.slice(0, at)
		const current = collectLedgerStatements(before, this.#requests, this.#annotations)
		// The plan prices what the first turn advertises under the pass's run scope, with `recall`
		// offered, and the skills the thread shows: the context scope can move inside that bound after
		// the plan, so it never lowers the price. While that turn advertises `load`, it holds back the
		// largest skill a later load can show and one result.
		const lists = intersectFilters(undefined, filter)
		const disclosure = this.#show(lists)
		const advertised = this.#advertise(lists, disclosure.skills)
		const price = computeToolPrice(this.#measuredSet(), advertised, this.#priced())
		const total =
			Math.max(
				0,
				(this.#options.capacity - this.#predict) * this.#share.prompt -
					(this.#priced().overhead - price.spared + price.added) -
					this.#holdback(lists, disclosure, advertised, []),
			) /
			(1 + LEDGER_SCALE_DRIFT)
		const built = this.#agent.context.build({
			selection: { messages: [request], judgments: [] },
			disclosure,
			switchable: advertised.some((tool) => tool.name === 'switch'),
		})
		const ceiling = intersectKeys(this.#agent.context.scope?.tools, lists.tools)
		const admits = ceiling === undefined || ceiling.includes('recall')
		// What `recall` can list from before the request; a step leaves behind each one it doesn't show.
		const recallable = collectRecallMessages(input, this.#requests, this.#annotations).filter(
			(message) => (scan.position(message.id) ?? at) < at,
		)
		// The window: the newest exchanges that have a reply, within the count bound, up to the first
		// whose messages, the amenders inside its span included, would price past the window's share of
		// the budget.
		const exchanges = collectLedgerExchanges(before, this.#requests, this.#annotations).slice(
			0,
			LEDGER_RECENT_LIMIT,
		)
		// The findings a later shown finding that holds a result replaced or a write superseded. A finding
		// is replaced only by a newer one, which every window that shows it shows too, so one reading
		// over the largest window serves every step; a lookup that found nothing replaces nothing here.
		const retired = collectRetiredFindings(
			this.#collectWindow(scan, exchanges, exchanges.length, new Set()),
			scan.findings.filter((finding) => finding.result !== undefined),
		)
		const over = exchanges.findIndex(
			(_exchange, index) =>
				this.#price(
					stripThinking(
						[...this.#collectRecent(scan, input, before, exchanges, index + 1, retired), request],
						this.#replay,
					).slice(0, -1),
				) >
				total * LEDGER_RECENT_SHARE,
		)
		const size = over < 0 ? exchanges.length : over
		const supersessions = input.classification.supersessions
		const stated = new Set(current.map((message) => message.id))
		// The recurrence: the newest member of each recurrence that is no current statement and that
		// nothing supersedes, newest first, as many as fit the retrieval's share of the budget; the
		// retrieved matches fit in what they leave. A superseded member never stands alone: its successor
		// reaches the opening on its own paths.
		const recurring = collectLedgerRecurrences(
			before,
			this.#requests,
			this.#annotations,
			input.classification.quiet,
		).filter(
			(message) => !stated.has(message.id) && (supersessions.get(message.id) ?? []).length === 0,
		)
		const recurrence = recurring.filter(
			(_message, index) =>
				this.#price(recurring.slice(0, index + 1)) <= total * LEDGER_RELEVANT_SHARE,
		)
		const statements = [...current, ...recurrence]
		// The statements each bare stage keeps: every current statement with the recurrence, then the
		// recurrence cut, then the current statements cut oldest first; with no recurrence, the cuts alone.
		const stages = [
			...(recurrence.length === 0 ? [] : [statements]),
			...Array.from({ length: current.length + 1 }, (_unused, count) => current.slice(count)),
		]
		// Cutting a statement only lowers the price of an opening with no window and no index, and both
		// only add to it, so no step before the first stage that fits bare can fit, and nothing is cut
		// while a window stays.
		const floor = findLedgerCut(0, stages.length, (stage) =>
			this.#price(
				this.#buildOpening(
					request,
					built,
					filterLedgerShown(
						this.#collectShown(scan, [], stages[stage] ?? []),
						supersessions,
						this.#requests,
					),
					[],
				).probe,
			) <= total
				? stage
				: undefined,
		)
		const newest = Math.min(size, 1)
		// The retrieved messages, each match's in rank order, from none the whole window, the amenders
		// of the newest exchange's span, which every layout with a match shows, the current statements,
		// a statement a shown successor supersedes included, or the recurrence show.
		const retrieved =
			floor === 0
				? this.#collectRetrieved(
						input,
						scan,
						request,
						new Set([
							request.id,
							...this.#collectWindow(scan, exchanges, size, retired).map((message) => message.id),
							...this.#collectRecent(scan, input, before, exchanges, newest, retired).map(
								(message) => message.id,
							),
							...statements.map((message) => message.id),
						]),
						total * LEDGER_RELEVANT_SHARE - this.#price(recurrence),
					)
				: []
		// Every statement kept: the window from the largest down to the newest exchange with every
		// retrieved match, then the retrieved matches cut lowest rank first, then no window.
		const layouts = [
			...Array.from({ length: size - newest + 1 }, (_unused, index) => ({
				window: size - index,
				matches: retrieved.length,
			})),
			...Array.from({ length: retrieved.length }, (_unused, index) => ({
				window: newest,
				matches: retrieved.length - 1 - index,
			})),
			...(newest === 0 ? [] : [{ window: 0, matches: 0 }]),
		]
		const windows =
			floor === 0
				? layouts.map((layout) =>
						this.#collectStep(
							input,
							projection,
							request,
							recallable,
							admits,
							this.#collectShown(
								scan,
								[
									...this.#collectRecent(scan, input, before, exchanges, layout.window, retired),
									...retrieved.slice(0, layout.matches).flat(),
								],
								statements,
							),
						),
					)
				: []
		const bare = windows.at(-1)
		const fixed = this.#readFixedKeys()
		// The window and retrieval first: the first of their steps that fits, so a larger budget never
		// shows fewer exchanges.
		const fitted = windows.find(
			(step) =>
				this.#price(this.#buildOpening(request, built, step.shown, step.keys).probe) <= total,
		)
		// Then the rows: that window with its rows cut from the end, never its exchanges. With no window
		// that fits, not even none, the bare step's row cuts.
		const base = fitted ?? bare
		const steps =
			base === undefined
				? []
				: [...(fitted === undefined ? [] : [fitted]), ...this.#trimRows(base, fixed)]
		const longest = this.#findLongest()
		const roomy = steps.find((step) => {
			const probe = this.#buildOpening(request, built, step.shown, step.keys).probe
			return (
				this.#price(probe) <= total &&
				(!admits || !step.others || this.#leavesRecallRoom(probe, advertised, longest))
			)
		})
		// The first step that also leaves `recall` its room, else the window as it fits, else the first
		// row cut that fits.
		const chosen =
			roomy ??
			fitted ??
			steps.find(
				(step) =>
					this.#price(this.#buildOpening(request, built, step.shown, step.keys).probe) <= total,
			)
		// The recurrence cut, then the statements cut oldest first, each with the rows its cut leaves.
		const cut =
			chosen !== undefined || floor === undefined
				? undefined
				: [...stages.keys()]
						.filter((stage) => stage >= Math.max(floor, 1))
						.find(
							(stage) =>
								this.#price(
									this.#buildOpening(
										request,
										built,
										filterLedgerShown(stages[stage] ?? [], supersessions, this.#requests),
										admits
											? this.#collectCutKeys(
													input,
													projection,
													request,
													stages[stage] ?? [],
													statements,
												)
											: [],
									).probe,
								) <= total,
						)
		const last =
			admits && chosen === undefined && cut === undefined
				? this.#collectCutKeys(input, projection, request, [], statements)
				: []
		const topics = last.filter(
			(row) =>
				row.name !== LEDGER_PREVIOUS_KEY && row.name !== LEDGER_RULES_KEY && fixed.has(row.name),
		)
		// Every statement cut: the topic rows cut from the last, then `rules`, `previous`, and the rest.
		const emptied = [
			...[...topics.keys()].map((index) =>
				last.filter((row) => !topics.slice(topics.length - 1 - index).includes(row)),
			),
			last.filter((row) => !topics.includes(row) && row.name !== LEDGER_RULES_KEY),
			last.filter(
				(row) =>
					!topics.includes(row) &&
					row.name !== LEDGER_RULES_KEY &&
					row.name !== LEDGER_PREVIOUS_KEY,
			),
			[],
		]
		// The statements a cut keeps, a superseded one included, count as shown, so one a shown successor
		// supersedes leaves nothing behind.
		const kept = cut === undefined ? [] : (stages[cut] ?? [])
		const shown = chosen?.shown ?? filterLedgerShown(kept, supersessions, this.#requests)
		const keys =
			chosen?.keys ??
			(cut !== undefined
				? admits
					? this.#collectCutKeys(input, projection, request, kept, statements)
					: []
				: (emptied.find(
						(rows) => this.#price(this.#buildOpening(request, built, [], rows).probe) <= total,
					) ?? []))
		const ids = new Set(kept.map((message) => message.id))
		// Nothing left behind at the chosen step: `recall` leaves the scope for this request.
		if (admits && !(chosen?.others ?? recallable.some((message) => !ids.has(message.id)))) {
			const tools = this.#definitions()
				.filter((tool) => tool.name !== 'recall')
				.map((tool) => tool.name)
			const host = this.#agent.context.scope
			const narrowed = host?.narrow({ tools }) ?? createScope({ name: 'ledger', tools })
			this.#current()?.apply(narrowed)
			this.#agent.context.apply(narrowed)
		}
		return { messages: this.#buildOpening(request, built, shown, keys).messages }
	}

	// The retrieved messages: each match's members as the opening sends them, a request turn as a copy
	// under its label, in rank order within the count bound, up to the first match that would price
	// the retrieval past `room`, the share of the budget the recurrence leaves it.
	#collectRetrieved(
		input: LedgerProjectionInput,
		scan: LedgerScan,
		request: Message,
		shown: ReadonlySet<string>,
		room: number,
	): ReadonlyArray<readonly Message[]> {
		const matches = collectLedgerMatches(
			input,
			request.id,
			this.#requests,
			this.#annotations,
			shown,
		)
			.slice(0, LEDGER_RELEVANT_LIMIT)
			.map((match) =>
				match.members.flatMap((id) => {
					const message = scan.messages[scan.position(id) ?? -1]
					if (message === undefined) return []
					return this.#requests.has(id)
						? [{ ...message, content: this.#labelEarlier(message) ?? message.content }]
						: [message]
				}),
			)
		const over = matches.findIndex(
			(_match, index) => this.#price(matches.slice(0, index + 1).flat()) > room,
		)
		return over < 0 ? matches : matches.slice(0, over)
	}

	// The cuts of a step's rows, one more row each, from the end: the exchange rows past `previous`
	// deepest first, then the id rows last-ranked first. The step's shown messages stay.
	#trimRows(
		step: {
			readonly shown: readonly Message[]
			readonly keys: readonly LedgerKey[]
			readonly others: boolean
		},
		fixed: ReadonlySet<string>,
	): ReadonlyArray<{
		readonly shown: readonly Message[]
		readonly keys: readonly LedgerKey[]
		readonly others: boolean
	}> {
		const deeper = step.keys
			.filter((row) => !fixed.has(row.name) && parseLedgerExchange(row.name) !== undefined)
			.toSorted(
				(left, right) =>
					(parseLedgerExchange(left.name) ?? 0) - (parseLedgerExchange(right.name) ?? 0),
			)
		const cuttable = [
			...step.keys.filter((row) => !fixed.has(row.name) && !deeper.includes(row)),
			...deeper,
		]
		return [...cuttable.keys()].map((index) => ({
			...step,
			keys: step.keys.filter((row) => !cuttable.slice(cuttable.length - index - 1).includes(row)),
		}))
	}

	// The window's messages for its newest `count` exchanges, oldest first: each request, the call turns
	// between it and its reply whose every call has its result, with those results, in stored order,
	// then the reply. A call turn missing a result stays out, so the window never breaks a pairing, and
	// so does a call group whose every result `retired` holds; a group with one live result stays whole.
	#collectWindow(
		scan: LedgerScan,
		exchanges: readonly LedgerExchange[],
		count: number,
		retired: ReadonlySet<string>,
	): readonly Message[] {
		return exchanges
			.slice(0, count)
			.toReversed()
			.flatMap((exchange) => {
				const from = scan.position(exchange.request.id) ?? 0
				const traffic = collectToolGroups(
					scan.messages.slice(from + 1, scan.position(exchange.reply.id) ?? from + 1),
				)
					.filter(
						([leader, ...results]) =>
							leader !== undefined &&
							leader.role === 'assistant' &&
							hasCalls(leader) &&
							(leader.calls ?? []).every((call) =>
								results.some((result) => result.role === 'tool' && result.call === call.id),
							) &&
							!(results.length > 0 && results.every((result) => retired.has(result.id))),
					)
					.flat()
					.toSorted((left, right) => (scan.position(left.id) ?? 0) - (scan.position(right.id) ?? 0))
				return [exchange.request, ...traffic, exchange.reply]
			})
	}

	// The recent messages of the newest `count` exchanges, in conversation order, as the share prices
	// them: the window's, and the amenders inside its span, each after the reply it follows.
	#collectRecent(
		scan: LedgerScan,
		input: LedgerProjectionInput,
		before: readonly Message[],
		exchanges: readonly LedgerExchange[],
		count: number,
		retired: ReadonlySet<string>,
	): readonly Message[] {
		return [
			...this.#collectWindow(scan, exchanges, count, retired),
			...collectLedgerAmenders(
				before,
				input.classification.amendments,
				this.#requests,
				this.#annotations,
				exchanges.slice(0, count),
			),
		].toSorted((left, right) => (scan.position(left.id) ?? 0) - (scan.position(right.id) ?? 0))
	}

	// The messages a step shows, in conversation order and each once: the recent and retrieved ones and
	// the kept statements. A message given twice keeps its first copy.
	#collectShown(
		scan: LedgerScan,
		window: readonly Message[],
		kept: readonly Message[],
	): readonly Message[] {
		return [
			...new Map(
				[...window, ...kept].toReversed().map((message) => [message.id, message]),
			).values(),
		].toSorted((left, right) => (scan.position(left.id) ?? 0) - (scan.position(right.id) ?? 0))
	}

	// A step's own bookkeeping from the messages it shows: the messages it sends, every one but a
	// statement a chain of supersessions links to another it shows, its index while `recall` is
	// admitted, which excludes every message it shows, the superseded ones included, and whether it
	// leaves anything `recall` can list behind, which a superseded one it shows never is.
	#collectStep(
		input: LedgerProjectionInput,
		projection: LedgerProjection,
		request: Message,
		recallable: readonly Message[],
		admits: boolean,
		shown: readonly Message[],
	): {
		readonly shown: readonly Message[]
		readonly keys: readonly LedgerKey[]
		readonly others: boolean
	} {
		const ids = new Set(shown.map((message) => message.id))
		return {
			shown: filterLedgerShown(shown, input.classification.supersessions, this.#requests),
			keys: admits
				? collectLedgerKeys(
						input,
						projection,
						this.#options.topics,
						request.id,
						this.#requests,
						this.#annotations,
						new Set([request.id, ...ids]),
					)
				: [],
			others: recallable.some((message) => !ids.has(message.id)),
		}
	}

	// The names of the index rows that are no id: `previous`, `rules`, and the desk topics, which
	// construction keeps apart.
	#readFixedKeys(): ReadonlySet<string> {
		return new Set([
			LEDGER_PREVIOUS_KEY,
			LEDGER_RULES_KEY,
			...this.#options.topics.map((topic) => topic.name),
		])
	}

	// The index rows once a cut keeps only `kept` of the `statements` a bare opening shows, the current
	// statements and the recurrence: `previous`, `rules`, the topic rows, and the ids the cut statements
	// carry, the earlier steps having cut every other id row.
	#collectCutKeys(
		input: LedgerProjectionInput,
		projection: LedgerProjection,
		request: Message,
		kept: readonly Message[],
		statements: readonly Message[],
	): readonly LedgerKey[] {
		const fixed = this.#readFixedKeys()
		const ids = new Set(kept.map((message) => message.id))
		const carried = new Set(
			statements
				.filter((message) => !ids.has(message.id))
				.flatMap((message) => [...extractLiterals(message.content).ids]),
		)
		return collectLedgerKeys(
			input,
			projection,
			this.#options.topics,
			request.id,
			this.#requests,
			this.#annotations,
			new Set([request.id, ...ids]),
		).filter((row) => fixed.has(row.name) || carried.has(row.name))
	}

	// The opening a step sends, its shown messages then the request copy with the index of these keys,
	// and the probe the plan prices: the built head with the same messages as the first turn renders them.
	#buildOpening(
		request: Message,
		built: readonly Message[],
		shown: readonly Message[],
		keys: readonly LedgerKey[],
	): { readonly messages: readonly Message[]; readonly probe: readonly Message[] } {
		const text = renderLedgerKeys(keys)
		return {
			messages: [...shown, buildRequestMessage(request, text)],
			probe: [
				...built.slice(0, -1),
				...stripThinking(
					[...shown, buildRequestMessage(built.at(-1) ?? request, text)],
					this.#replay,
				),
			],
		}
	}

	// Whether a first turn on this probe, advertising these tools, leaves `recall` the close rule's
	// room: twice the reply reserve beyond the generation cap. Without a gauge it does.
	#leavesRecallRoom(
		probe: readonly Message[],
		advertised: readonly ToolDefinition[],
		longest: string,
	): boolean {
		const gauge = this.#gauge
		if (gauge === undefined) return true
		const calls = [
			{
				estimate: estimateMessages(probe),
				tools: advertised.length,
				...computeToolPrice(this.#measuredSet(), advertised, this.#priced()),
			},
		]
		return gauge.remainder(calls) - this.#predict >= 2 * gauge.reserve(calls, longest)
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
				...computeToolPrice(this.#measuredSet(), tools, this.#priced()),
			},
			this.#conversation.messages().length,
		)
	}

	// The gauge's price, or a unit scale and no overhead before calibration.
	#priced(): LedgerGauge {
		return this.#gauge ?? { scale: 1, overhead: 0 }
	}

	// The definitions the gauge's overhead measured, or the live calibrated set before calibration.
	#measuredSet(): readonly ToolDefinition[] {
		return this.#measured ?? this.#calibrated()
	}

	// The digest of the measured set, derived where it is read.
	#digest(): string | undefined {
		return this.#measured === undefined ? undefined : digestLedgerTools(this.#measured)
	}

	// Whether the agent enables a built-in of this name.
	#enables(name: string): boolean {
		return this.#builtins.some((one) => one === name)
	}

	// Every definition a turn can advertise: the manager's, without an enabled built-in's name, then
	// the built-ins', as the agent's run lists its candidates.
	#definitions(): readonly ToolDefinition[] {
		return [
			...this.#agent.context.tools.definitions().filter((tool) => !this.#enables(tool.name)),
			...collectBuiltinDefinitions({ builtins: this.#builtins }),
		]
	}

	// The calibrated set: every definition but those a registered skill holds back, which only an
	// enabled `load` does. It reads no scope, so a ceiling change or a load never changes it.
	#calibrated(): readonly ToolDefinition[] {
		const definitions = this.#definitions()
		if (!this.#enables('load')) return definitions
		const held = new Set(this.#agent.context.skills.skills().flatMap((skill) => skill.tools))
		return definitions.filter((tool) => !held.has(tool.name))
	}

	// What the thread shows within a ceiling, with the given workspace, as a run resolves it.
	#show(ceiling: ScopeFilter): AgentDisclosure {
		return resolveDisclosure(
			this.#agent.context,
			this.#conversation,
			this.#given,
			ceiling,
			this.#builtins,
		)
	}

	// What a turn under a ceiling advertises with these skills shown, as a run computes it: the
	// candidates the ceiling leaves a built-in to act on, filtered by the allow-list and the skills' hold.
	#advertise(ceiling: ScopeFilter, shown: readonly string[]): readonly ToolDefinition[] {
		return filterAdvertisedTools(
			filterBuiltinCandidates(this.#definitions(), ceiling),
			ceiling.tools,
			this.#enables('load') ? this.#agent.context.skills.skills() : [],
			shown,
		)
	}

	// The ceiling of a request's first pass: the context scope intersected with the scope it entered with.
	#ceiling(request: LedgerRequest): ScopeFilter {
		return intersectFilters(this.#agent.context.scope, this.#live.get(request))
	}

	// The tokens loading a skill adds over an advertised set: its body, and the definitions it names
	// within the ceiling that the set leaves out.
	#priceSkill(skill: Skill, ceiling: ScopeFilter, advertised: readonly ToolDefinition[]): number {
		const sent = new Set(advertised.map((tool) => tool.name))
		const named = filterAllowList(
			ceiling.tools,
			this.#definitions().filter((tool) => skill.tools.includes(tool.name) && !sent.has(tool.name)),
			(tool) => tool.name,
		)
		return computeSkillPrice(skill, named, this.#measuredSet(), this.#priced())
	}

	// The tokens the shown skills take: each body, and the definitions they name within the ceiling.
	#priceShown(shown: AgentDisclosure, ceiling: ScopeFilter): number {
		const skills = shown.skills.flatMap((name) => this.#agent.context.skills.skill(name) ?? [])
		const named = new Set(skills.flatMap((skill) => skill.tools))
		const definitions = filterAllowList(
			ceiling.tools,
			this.#definitions().filter((tool) => named.has(tool.name)),
			(tool) => tool.name,
		)
		const calibrated = this.#measuredSet()
		const gauge = this.#priced()
		return (
			skills.reduce((sum, skill) => sum + computeSkillPrice(skill, [], calibrated, gauge), 0) +
			computeToolPrice(calibrated, [...calibrated, ...definitions], gauge).added
		)
	}

	// The price of one tool result: the longer of the longest tool result the thread stores and the
	// gauge's reply reserve, which stand in for a result no fact sizes.
	#priceResult(calls: readonly GaugeCall[]): number {
		const longest = this.#conversation
			.messages()
			.filter((message) => message.role === 'tool')
			.reduce<Message | undefined>(
				(found, message) =>
					found === undefined || message.content.length > found.content.length ? message : found,
				undefined,
			)
		const gauge = this.#gauge
		return Math.max(
			this.#priced().scale * (longest === undefined ? 0 : estimateMessages([longest])),
			gauge === undefined ? 0 : gauge.reserve(calls, this.#findLongest()),
		)
	}

	// The room the plan keeps for a later load: the largest price of a skill the ceiling admits and
	// the turn does not show, and one result, while the turn advertises `load`.
	#holdback(
		ceiling: ScopeFilter,
		shown: AgentDisclosure,
		advertised: readonly ToolDefinition[],
		calls: readonly GaugeCall[],
	): number {
		if (!advertised.some((tool) => tool.name === 'load')) return 0
		const loadable = filterAllowList(
			ceiling.skills,
			this.#agent.context.skills.skills(),
			(skill) => skill.name,
		).filter((skill) => !shown.skills.includes(skill.name))
		return loadable.length === 0
			? 0
			: Math.max(...loadable.map((skill) => this.#priceSkill(skill, ceiling, advertised))) +
					this.#priceResult(calls)
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
		const key = isString(args.key) ? args.key.trim() : ''
		request?.admit('recall', { key })
		const gauge = this.#gauge
		const calls = request?.calls ?? []
		request?.recall()
		const guidance = `${LEDGER_PREVIOUS_KEY}-2, ${LEDGER_PREVIOUS_KEY}-3, …, ${LEDGER_RULES_KEY}, ${this.#options.topics.length === 0 ? 'an owner name, or an id' : `an owner name, an id, or one of ${renderTopicNames(this.#options.topics)}`}`
		if (key === '') throw new Error(`recall needs a key: ${guidance}`)
		const { rate, extra, slack: drift } = this.#carry(request, calls)
		const siblings = estimateMessages(
			(request?.listings ?? [])
				.filter((listing) => listing.turn === calls.length)
				.map((listing) => ({ id: 'result', role: 'tool', content: listing.result })),
		)
		const room =
			gauge === undefined
				? -estimateMessages([buildRecallMessage(key)])
				: (gauge.remainder(calls) - this.#predict - extra - drift) / rate - siblings
		const scan = this.#scan(this.#conversation.messages())
		// A recall while a selection holds its scan, which only a recall a host calls by hand during a
		// selection can make, holds no scan of its own, so the classifier's handlers read the selection's.
		const added = this.#scans.size === 0
		if (added) this.#hold(scan)
		try {
			const { input, projection } = this.#project(scan)
			// A recall with no request reads every stored message as earlier.
			const start =
				request?.message === undefined
					? scan.messages.length
					: (scan.position(request.message.id) ?? scan.messages.length)
			// What the plan sent is in the prompt, so recall lists none of it; the messages the request's
			// passes stored come after it, and recall lists only their lookups.
			const excluded = new Set((request?.plan?.messages ?? []).map((message) => message.id))
			const before = scan.messages.slice(0, start)
			const behind = new Set(
				before.filter((message) => !excluded.has(message.id)).map((message) => message.id),
			)
			// Each part of the key resolves by its family: an exchange key to that exchange, `rules` to the
			// rules record, and every other part to the search, which reads them together and lists newest
			// first at the first searched part. Each exchange, `rules`, and each searched part resolve
			// once, at their first part, and the listings join in that order. Each part also reads its own
			// state: it lists, the prompt shows every match it has, or it misses.
			const parts = splitKey(key)
			const searched = parts.filter(
				(part) =>
					parseLedgerExchange(part) === undefined && part.toLowerCase() !== LEDGER_RULES_KEY,
			)
			// What the request could see: every message before it, the shown ones included.
			const visible = new Set(before.map((message) => message.id))
			const found =
				searched.length === 0
					? undefined
					: this.#search(searched, scan, input, projection, behind, start)
			const exchanges = collectLedgerExchanges(before, this.#requests, this.#annotations)
			const first = parts.findIndex((part) => searched.includes(part))
			const resolved = parts.flatMap((part, at) => {
				const depth = parseLedgerExchange(part)
				const earlier = parts.slice(0, at)
				if (depth !== undefined) {
					if (earlier.some((one) => parseLedgerExchange(one) === depth)) return []
					const exchange = exchanges[depth - 1]
					// An exchange is shown only when the prompt holds both its request and its reply.
					const shown =
						exchange !== undefined &&
						excluded.has(exchange.request.id) &&
						excluded.has(exchange.reply.id)
					const listed = shown ? [] : this.#listExchange(exchange, depth)
					return [
						{
							part,
							listed,
							recalled: new Map<string, string>(),
							kind: 'more' as const,
							state:
								listed.length > 0
									? ('listed' as const)
									: shown
										? ('shown' as const)
										: ('missed' as const),
						},
					]
				}
				if (part.toLowerCase() === LEDGER_RULES_KEY) {
					if (earlier.some((one) => one.toLowerCase() === LEDGER_RULES_KEY)) return []
					const rules = this.#listRules(projection, behind)
					return [
						{
							part,
							listed: rules,
							recalled: new Map<string, string>(),
							kind: 'older' as const,
							state:
								rules.length > 0
									? ('listed' as const)
									: this.#listRules(projection, visible).length > 0
										? ('shown' as const)
										: ('missed' as const),
						},
					]
				}
				if (earlier.some((one) => one.toLowerCase() === part.toLowerCase())) return []
				const own =
					searched.length === 1
						? found
						: this.#search([part], scan, input, projection, behind, start)
				return [
					{
						part,
						listed: at === first ? (found?.listed ?? []) : [],
						recalled:
							at === first
								? (found?.recalled ?? new Map<string, string>())
								: new Map<string, string>(),
						kind: found?.kind ?? ('older' as const),
						state:
							(own?.listed.length ?? 0) > 0
								? ('listed' as const)
								: own?.shown === true
									? ('shown' as const)
									: ('missed' as const),
					},
				]
			})
			const listed = resolved.flatMap((one) => one.listed)
			const recalled = new Map(resolved.flatMap((one) => [...one.recalled]))
			const kind = resolved.some((one) => one.listed.length > 0 && one.kind === 'more')
				? 'more'
				: 'older'
			// A part whose every match is in the prompt is no miss: the model reads it there. Each part
			// says so for itself, so a shown part never hides another part's listing or miss.
			const shownParts = resolved.filter((one) => one.state === 'shown').map((one) => one.part)
			const missedParts = resolved.filter((one) => one.state === 'missed').map((one) => one.part)
			const requestId = request?.message?.id ?? ''
			const notes = [
				...(shownParts.length === 0
					? []
					: [
							`${shownParts.map((part) => JSON.stringify(part.slice(0, 64))).join(', ')} ${shownParts.length === 1 ? 'is' : 'are'} in the messages you can see; answer from them`,
						]),
				...(missedParts.length === 0
					? []
					: [
							this.#miss(
								missedParts.map((part) => JSON.stringify(part.slice(0, 64))).join(', '),
								input,
								projection,
								requestId,
								excluded,
							),
						]),
			].join('\n')
			const result =
				listed.length > 0
					? [
							cutListing(
								listed,
								room - (notes === '' ? 0 : estimateTokens(`\n${notes}`)),
								kind,
								gauge === undefined,
							),
							...(notes === '' ? [] : [notes]),
						].join('\n')
					: shownParts.length > 0 && missedParts.length === 0
						? `${JSON.stringify(key.slice(0, 64))} is in the messages you can see; answer from them`
						: shownParts.length === 0
							? this.#miss(JSON.stringify(key.slice(0, 64)), input, projection, requestId, excluded)
							: notes
			request?.list(result, recalled, listed)
			return result
		} finally {
			if (added) this.#scans.delete(scan)
		}
	}

	// An exchange's request and its reply, each under its origin label, the request opening with the
	// exchange key so a cut or joined listing still names it, or nothing for no exchange.
	#listExchange(exchange: LedgerExchange | undefined, depth: number): readonly string[] {
		return exchange === undefined
			? []
			: [exchange.request, exchange.reply]
					.flatMap((message) => this.#labelEarlier(message) ?? [])
					.map((line, index) => (index === 0 ? `${nameLedgerExchange(depth)}: ${line}` : line))
	}

	// The rules record's lines from the messages a request left behind, one entry per message, newest first.
	#listRules(projection: LedgerProjection, behind: ReadonlySet<string>): readonly string[] {
		const lines = (
			projection.records.find((record) => record.key === LEDGER_RULES_KEY)?.lines ?? []
		).filter((line) => behind.has(line.source))
		return [...Map.groupBy(lines, (line) => line.source).values()]
			.map((group) => group.map((line) => line.text).join(' '))
			.reverse()
	}

	// What a missed recall returns: the quoted key or parts, each JSON-encoded and length-capped, and
	// the first stored keys the request left behind, which the model can recall instead.
	#miss(
		quoted: string,
		input: LedgerProjectionInput,
		projection: LedgerProjection,
		request: string,
		excluded: ReadonlySet<string>,
	): string {
		const collected = collectLedgerKeys(
			input,
			projection,
			this.#options.topics,
			request,
			this.#requests,
			this.#annotations,
			excluded,
		)
		// The nearest exchange key the prompt doesn't show comes first, in the place `previous` holds
		// when it isn't shown, then `rules`, the ids, and the topics, then the deeper exchange keys.
		const exchanged = collected
			.filter((one) => parseLedgerExchange(one.name) !== undefined)
			.toSorted(
				(left, right) =>
					(parseLedgerExchange(left.name) ?? 0) - (parseLedgerExchange(right.name) ?? 0),
			)
		const keys = [
			...exchanged.slice(0, 1),
			...collected.filter((one) => !exchanged.includes(one)),
			...exchanged.slice(1),
		]
			.slice(0, LEDGER_MISS_LIMIT)
			.map((one) => one.name)
		return keys.length === 0
			? `nothing earlier matches ${quoted}; answer from the messages you can see`
			: `nothing earlier matches ${quoted}; stored keys: ${keys.join(', ')}; or answer from the messages you can see`
	}

	// A stored request or reply under its origin label, every later line indented, so only a label
	// opens a line and a stored line can't read as a reply it isn't; undefined for any other message.
	#labelEarlier(message: Message): string | undefined {
		const label = this.#requests.has(message.id)
			? LEDGER_RECALL_LABELS.request
			: message.role === 'assistant' && !hasCalls(message) && message.content.trim() !== ''
				? LEDGER_RECALL_LABELS.reply
				: undefined
		return label === undefined
			? undefined
			: `${label} ${message.content.replace(/[\n\v\f\r\u0085\u2028\u2029]+/g, '\n  ')}`
	}

	// Lists what a key names: the statements and findings on its ids, owners, and topics, or carrying
	// its words, newest first with their amenders, then the labeled requests and replies carrying its
	// words. It matches every message before the request and the lookups of the request's own passes,
	// and lists only those the request left behind: a match the prompt shows lists nothing itself but
	// still brings the amenders it left behind, none whose supersessions reach a shown message, and the
	// search is shown when nothing lists and such a match was found.
	#search(
		parts: readonly string[],
		scan: LedgerScan,
		input: LedgerProjectionInput,
		projection: LedgerProjection,
		behind: ReadonlySet<string>,
		start: number,
	): {
		readonly listed: readonly string[]
		readonly recalled: ReadonlyMap<string, string>
		readonly kind: 'older' | 'more'
		readonly shown: boolean
	} {
		const registry = scan.registry
		const searches = parts.map((part) => {
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
		const retired = collectRetiredFindings(scan.messages, scan.findings)
		// The messages a search matches: every one before the request but the requests, which list under
		// their labels, and the lookups the request's own passes made.
		const matchable = new Map(
			input.messages
				.filter(
					(message, at) =>
						!this.#requests.has(message.id) &&
						!retired.has(message.id) &&
						(at < start || (message.role === 'tool' && at > start)),
				)
				.map((message) => [message.id, message]),
		)
		// The ones it lists: those the request left behind, and the lookups of its own passes.
		const listable = new Set(
			[...matchable.keys()].filter((id) => behind.has(id) || (scan.position(id) ?? 0) > start),
		)
		// What the opening shows. An amendment chain skips a message whose supersessions reach one of
		// these, so a key never lists a superseded amender alone beside a shown successor.
		const sent = new Set(
			input.messages
				.slice(0, Math.max(0, start))
				.filter((message) => !behind.has(message.id))
				.map((message) => message.id),
		)
		const matched = new Set(searches.flatMap((search) => [...search.matched]))
		const unmatched = searches.filter(
			(search) => search.matched.size === 0 && search.words.length > 0,
		)
		// Newest first; each item's amenders are claimed by it, so an older item never lists them again.
		const gathered = [...matchable.values()].reverse().reduce<{
			readonly done: ReadonlySet<string>
			readonly listed: readonly string[]
			readonly recalled: ReadonlyMap<string, string>
			readonly seen: boolean
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
				// A shown member is visited, so the amenders after it are reached, but only the members the
				// request left behind list.
				const visited = scanAmendments(
					input.classification.amendments,
					message.id,
					(candidate) =>
						matchable.has(candidate) &&
						!state.done.has(candidate) &&
						(candidate === message.id ||
							!matchesShownSuccessor(input.classification.supersessions, candidate, sent)),
				)
				const items = this.#listItems(
					visited.filter((id) => listable.has(id)),
					matchable,
					scan,
				)
				return {
					done: new Set([...state.done, ...visited]),
					listed:
						items.length === 0
							? state.listed
							: [...state.listed, items.map((item) => item.text).join('\n')],
					recalled: new Map([...state.recalled, ...items.flatMap((item) => item.stored)]),
					seen: state.seen || (visited.length > 0 && !listable.has(message.id)),
				}
			},
			{ done: new Set(), listed: [], recalled: new Map(), seen: false },
		)
		// The labeled requests and replies carrying a part's words, newest first.
		const conversation = input.messages
			.slice(0, Math.max(0, start))
			.reverse()
			.filter(
				(message) =>
					!gathered.done.has(message.id) &&
					this.#labelEarlier(message) !== undefined &&
					searches.some(
						(search) =>
							search.words.length > 0 &&
							search.words.every((word) => message.content.toLowerCase().includes(word)),
					),
			)
		// Each one's amenders the request left behind list after the statements, a shown one's included.
		const followed = conversation.reduce<{
			readonly done: ReadonlySet<string>
			readonly listed: readonly string[]
			readonly recalled: ReadonlyMap<string, string>
		}>(
			(state, message) => {
				const visited = scanAmendments(
					input.classification.amendments,
					message.id,
					(candidate) =>
						candidate === message.id ||
						(matchable.has(candidate) &&
							!state.done.has(candidate) &&
							!matchesShownSuccessor(input.classification.supersessions, candidate, sent)),
				).filter((id) => id !== message.id)
				const items = this.#listItems(
					visited.filter((id) => listable.has(id)),
					matchable,
					scan,
				)
				return {
					done: new Set([...state.done, ...visited]),
					listed:
						items.length === 0
							? state.listed
							: [...state.listed, items.map((item) => item.text).join('\n')],
					recalled: new Map([...state.recalled, ...items.flatMap((item) => item.stored)]),
				}
			},
			{ done: gathered.done, listed: [], recalled: new Map() },
		)
		const earlier = conversation.flatMap((message) =>
			behind.has(message.id) ? [this.#labelEarlier(message) ?? ''] : [],
		)
		const listed = [...gathered.listed, ...followed.listed, ...earlier]
		// Statements list ahead of conversation messages, so an omitted message can be newer than a kept one.
		return {
			listed,
			recalled: new Map([...gathered.recalled, ...followed.recalled]),
			kind: earlier.length > 0 ? 'more' : 'older',
			shown:
				listed.length === 0 &&
				(gathered.seen || conversation.some((message) => !behind.has(message.id))),
		}
	}

	// The listing items of stored messages, in the order given: each one's text, a lookup's after its
	// call, with every stored line that opens like a label indented, and the first line a listed lookup
	// stores.
	#listItems(
		ids: readonly string[],
		messages: ReadonlyMap<string, Message>,
		scan: LedgerScan,
	): ReadonlyArray<{
		readonly id: string
		readonly text: string
		readonly stored: ReadonlyArray<readonly [string, string]>
	}> {
		return ids.flatMap((id) => {
			const source = messages.get(id)
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
							: [[splitResultLines(text)[0] ?? '', splitResultLines(content)[0] ?? ''] as const],
				},
			]
		})
	}

	#buildDigest(request: LedgerRequest, entered: Message): LedgerRecovery {
		this.#flush()
		const groups = [
			...new Set(
				this.#collectAfter(entered).flatMap((message) => {
					const result = this.#results.get(message.id)
					// A built-in's acknowledgement carries nothing the answer reads; a memo's body does.
					if (
						message.role !== 'tool' ||
						result?.success !== true ||
						(result.name !== 'memo' && this.#enables(result.name))
					)
						return []
					const recalled = result.name === 'recall'
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
		const rate = this.#capacityRate(request) * (1 + LEDGER_SCALE_DRIFT)
		const allowance = (this.#options.capacity - this.#predict) / rate
		const after = this.#collectAfter(entered)
		// The answer pass carries the stored request in place of the copy, as its selection does.
		const recovery: readonly Message[] = [
			...(request.plan?.messages ?? request.selection?.messages ?? []).map((message) =>
				message.id === entered.id ? entered : message,
			),
			...after,
			{ id: 'cue', role: 'user', content: LEDGER_NOTES.cue },
		]
		const messages = recovery.filter((message) => message.role !== 'tool' && !hasCalls(message))
		const note: readonly Message[] =
			digest === undefined ? [] : [{ id: 'results', role: 'user', content: digest }]
		// The answer pass advertises nothing and carries every shown body, so the note fits beside them.
		const shown = this.#show(this.#ceiling(request))
		if (
			this.#gauge === undefined ||
			estimateMessages(
				stripThinking(
					this.#agent.context.build({
						selection: { messages: [...messages, ...note], judgments: [] },
						disclosure: shown,
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
					disclosure: shown,
				}),
				this.#replay,
			),
		)
		// No answer pass opens that does not fit with its note left out.
		if (base > allowance)
			throw new LedgerError(
				'OVERFLOW',
				`the answer pass prices ${Math.ceil(base * rate)} tokens with every cut made, over the capacity ${this.#options.capacity} less predict ${this.#predict}; shorten the request, narrow what the scope shows, or raise capacity`,
				{
					context: {
						capacity: this.#options.capacity,
						predict: this.#predict,
						price: base * rate,
					},
				},
			)
		const fitted = cutListing(
			unique,
			allowance - base - estimateTokens(`${LEDGER_NOTES.results}\n`),
			'more',
			false,
		)
		const cut = fitted === '' ? undefined : `${LEDGER_NOTES.results}\n${fitted}`
		// A note that does not fit beside the base is left out.
		const kept =
			cut !== undefined &&
			base + estimateMessages([{ id: 'results', role: 'user', content: cut }]) > allowance
				? undefined
				: cut
		return { digest: kept, omitted: partials }
	}

	// The tokens the next turn's prompt adds to the last measured call: the head with the shown set and
	// every message the pass stored after its boundary, at the recall rate with drift, less that call's
	// reply; and the slack of a call that reported no prompt. `#recall` reads these before the next turn
	// exists.
	#carry(
		request: LedgerRequest | undefined,
		calls: readonly GaugeCall[],
	): { readonly rate: number; readonly extra: number; readonly slack: number } {
		const rate = this.#recallRate(request) * (1 + LEDGER_SCALE_DRIFT)
		// The next turn carries the skills the thread shows, so the carried estimate holds their bodies.
		const ceiling = request === undefined ? {} : this.#ceiling(request)
		const shown = this.#show(ceiling)
		const carried =
			request === undefined
				? 0
				: estimateMessages(
						stripThinking(
							[
								...this.#agent.context.build({
									...(request.selection === undefined ? {} : { selection: request.selection }),
									disclosure: shown,
									switchable: this.#advertise(ceiling, shown.skills).some(
										(tool) => tool.name === 'switch',
									),
								}),
								...this.#conversation.messages().slice(request.boundary),
							],
							this.#replay,
						),
					)
		return { rate, ...this.#terms(calls.at(-1), carried, rate) }
	}

	// What a turn adds to a call: the growth of its estimate over the call's at the rate, less the
	// call's reply, which the next prompt carries; and, where the call reported no prompt, its
	// estimate at the rate over the scale.
	#terms(
		call: GaugeCall | undefined,
		carried: number,
		rate: number,
	): { readonly extra: number; readonly slack: number } {
		const reply = isFiniteNumber(call?.prompt)
			? (call.completion ?? 0) - (this.#replay === 'none' ? (call.thinking ?? 0) : 0)
			: 0
		return {
			extra: Math.max(0, (carried - (call?.estimate ?? carried)) * rate - reply),
			slack: isFiniteNumber(call?.prompt)
				? 0
				: Math.max(0, (call?.estimate ?? 0) * (rate - (this.#gauge?.scale ?? rate))),
		}
	}

	// Prices the request the loop composed before the provider receives it. A request priced over
	// `capacity - predict`, or whose terms cannot be priced, is not sent: the ledger keeps the refusal,
	// and the agent's abort ends the pass with the reason `overflow`. The run reads the abort after
	// the `request` event, so the provider receives no call for it.
	#gate(index: number, sent: ProviderRequest): boolean {
		const request = this.#current()
		if (request?.boundary === undefined) return true
		const left = attempt(() =>
			index === 0 ? this.#first(request, sent) : this.#next(request, sent),
		)
		if (left.success && left.value >= 0) return true
		const limit = this.#options.capacity - this.#predict
		this.#refusal = new LedgerError(
			'OVERFLOW',
			left.success
				? `the request prices ${Math.ceil(limit - left.value)} tokens, over the capacity ${this.#options.capacity} less predict ${this.#predict}; shorten the request, narrow what the scope shows, or raise capacity`
				: `the request could not be priced against the capacity ${this.#options.capacity} less predict ${this.#predict}`,
			{
				context: {
					capacity: this.#options.capacity,
					predict: this.#predict,
					price: left.success ? limit - left.value : Number.POSITIVE_INFINITY,
				},
			},
		)
		this.#agent.abort('overflow')
		return false
	}

	// The room the first request of a pass leaves under `capacity - predict`: the definitions it
	// advertises against the measured set, and its messages at the plan's rate, or, after a call of
	// the request, at the capacity rate.
	#first(request: LedgerRequest, sent: ProviderRequest): number {
		const gauge = this.#gauge
		if (gauge === undefined) throw new LedgerError('GAUGE', 'the gate needs a gauge')
		const tools = computeToolPrice(this.#measuredSet(), sent.tools ?? [], gauge)
		const rate = request.calls.length === 0 ? gauge.scale : this.#capacityRate(request)
		return (
			this.#options.capacity -
			this.#predict -
			(Math.max(0, gauge.overhead - tools.spared) +
				tools.added +
				rate * (1 + LEDGER_SCALE_DRIFT) * estimateMessages(sent.messages))
		)
	}

	// The room a later request of a pass leaves: the remainder the last measured call left, less
	// `predict`, what the request adds to that call at the capacity rate, and the definitions it
	// advertises beyond that call's: a calibrated one returned at the higher of the density and what
	// its hiding was credited, and the added ones by the difference of their price.
	#next(request: LedgerRequest, sent: ProviderRequest): number {
		request.think(this.#conversation.messages())
		const gauge = this.#gauge
		if (gauge === undefined) throw new LedgerError('GAUGE', 'the gate needs a gauge')
		const calls = request.calls
		const last = calls.at(-1)
		if (last === undefined) throw new Error('a later request has no recorded call before it')
		const measured = this.#measuredSet()
		const rate = this.#capacityRate(request) * (1 + LEDGER_SCALE_DRIFT)
		const { extra, slack } = this.#terms(last, estimateMessages(sent.messages), rate)
		const tools = computeToolPrice(measured, sent.tools ?? [], gauge)
		const back = Math.min(
			gauge.overhead,
			(Math.max(0, (last.spared ?? 0) - tools.spared) * computeToolDensity(measured, gauge)) /
				gauge.scale,
		)
		const more = Math.max(0, tools.added - (last.added ?? 0))
		const grown = (back + more) * (1 + LEDGER_SCALE_DRIFT)
		return gauge.remainder(calls) - this.#predict - extra - slack - grown
	}

	// The rate the capacity tests read: the recall rate, floored at the gauge's scale.
	#capacityRate(request: LedgerRequest): number {
		return Math.max(this.#recallRate(request), this.#gauge?.scale ?? 1)
	}

	#recallRate(request: LedgerRequest | undefined): number {
		const gauge = this.#gauge
		if (gauge === undefined) return 1
		const calls = request?.calls ?? []
		// A call that advertised definitions beyond the calibrated set measures their tokens too.
		const last = calls.findLast((call) => isFiniteNumber(call.prompt) && (call.added ?? 0) === 0)
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
