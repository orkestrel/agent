import type { Message, ProviderResult } from '@orkestrel/agent'
import type { StudyProduct } from '@orkestrel/study'
import type { StudyOllamaTransport } from '@orkestrel/study/server'
import type { ToolCall } from '@orkestrel/tool'
import type {
	StudyMemorySessionOptions,
	StudyMemoryScreenOptions,
	StudyMemoryScreenTarget,
	StudyMemoryScreenTrial,
	StudyMemoryScreenActivity,
	StudyMemoryScreenAccount,
	StudyMemoryScreenLookup,
} from './types.js'
import { canonicalStringify, isRecord, parseJSON } from '@orkestrel/contract'
import { StudyError, validateStudyAgentUsage } from '@orkestrel/study'
import { hashStudyBytes } from '@orkestrel/study/server'
import { isStudyMemoryOptions } from './validators.js'
import {
	matchesStudyMemoryCarriage,
	computeStudyMemoryDigest,
	matchesStudyMemorySham,
} from './helpers.js'

/** Enforces the U34 case account and binds matched requests to their admitted source prefix. */
export class StudyMemoryScreen {
	readonly #settings: StudyMemoryScreenOptions
	readonly #target: StudyMemoryScreenTarget
	readonly #reading: StudyMemoryScreenTrial | undefined
	readonly #transport: StudyOllamaTransport
	readonly #abort = new AbortController()
	readonly #work: boolean
	#active: StudyMemoryScreenActivity | undefined
	#completed: readonly string[] = []
	#requests: ReadonlyArray<{
		readonly role: 'agent' | 'judge'
		readonly tokens: number
		readonly historical: boolean
	}> = []
	#batches: ReadonlyArray<readonly ToolCall[]> = []
	#lookups: readonly StudyMemoryScreenLookup[] = []
	#draft: string | undefined

	/** Binds the actual exchange declaration and scheduled case before any request. @param options - Session dependencies. @param transport - Existing first-failure owner. */
	constructor(
		options: Pick<StudyMemorySessionOptions, 'profile' | 'exchanges' | 'trial' | 'replay'>,
		transport: StudyOllamaTransport,
	) {
		const settings = isStudyMemoryOptions(options.profile.settings)
			? options.profile.settings
			: undefined
		const screen = settings?.screen
		const declaration = options.exchanges?.declaration
		const trial = options.trial
		if (
			screen === undefined ||
			screen === false ||
			declaration === undefined ||
			trial === undefined
		)
			throw new StudyError('CONFIG', 'Screen requires an actual trial and recording declaration')
		const index = screen.targets.findIndex((entry) => entry.scenario === trial.scenario)
		const target = screen.targets[index]
		if (
			target === undefined ||
			trial.id !== `r1-s${index + 1}-a1` ||
			trial.arm !== 'records' ||
			canonicalStringify(declaration.goals) !==
				canonicalStringify([target.seed.id, target.target.id])
		)
			throw new StudyError('CONFIG', 'Screen trial or ordered goal declaration differs')
		const admission = screen.admission
		const reading = admission?.trials.find((entry) => entry.id === trial.id)
		const ancestor = declaration.ancestor
		if (
			screen.preparation
				? ancestor !== undefined || options.replay !== undefined
				: admission === undefined ||
					reading === undefined ||
					options.replay === undefined ||
					ancestor === undefined ||
					ancestor.result !== admission.result ||
					ancestor.seal !== admission.seal ||
					computeStudyMemoryDigest(ancestor.identity) !== admission.identity ||
					ancestor.prefix !== reading.prefix ||
					canonicalStringify(ancestor.file) !== canonicalStringify(reading.file)
		)
			throw new StudyError(
				'CONFIG',
				'Screen replay ancestor does not bind the admitted source and prefix',
			)
		this.#settings = screen
		this.#target = target
		this.#reading = reading
		this.#transport = transport
		this.#work = settings?.ledger?.work === true
	}

	/** Returns the case-wide cancellation signal, including a retained refusal. */
	get signal(): AbortSignal {
		return this.#abort.signal
	}
	/** Returns all actual model attempts, including historical replay. */
	get requests(): number {
		return this.#requests.length
	}
	/** Inventories historical attempts separately from future live reservations. */
	get historical(): Pick<StudyMemoryScreenAccount, 'agent' | 'judge' | 'tokens'> {
		const entries = this.#requests.filter((request) => request.historical)
		return {
			agent: entries.filter((request) => request.role === 'agent').length,
			judge: entries.filter((request) => request.role === 'judge').length,
			tokens: entries.reduce((sum, request) => sum + request.tokens, 0),
		}
	}
	/** Returns reserved policy totals; historical replay is accounted separately. */
	get account(): StudyMemoryScreenAccount {
		const live = this.#requests.filter((request) => !request.historical)
		return {
			agent: live.filter((request) => request.role === 'agent').length,
			judge: live.filter((request) => request.role === 'judge').length,
			tokens: live.reduce((sum, request) => sum + request.tokens, 0),
			rounds: this.#batches.length,
			tools: this.#batches.reduce((sum, batch) => sum + batch.length, 0),
			recalls: this.#batches.flat().filter((call) => call.name === 'recall').length,
		}
	}

	/** Binds a goal's original input and conversation identities. @param activity - Immutable pre-request snapshot. */
	start(activity: StudyMemoryScreenActivity): void {
		this.check()
		const expected = this.#completed.length === 0 ? this.#target.seed : this.#target.target
		if (
			this.#active !== undefined ||
			this.#completed.length >= 2 ||
			activity.goal !== expected.id ||
			computeStudyMemoryDigest({ id: activity.goal, input: activity.input }) !== expected.digest
		)
			this.fail(new StudyError('CONFIG', 'Screen goal order or public bytes differ'))
		this.#active = activity
	}

	/** Reserves a whole positive policy allowance before the actual transport dispatch. @param role - Provider responsibility. @param init - Exact encoded request. */
	reserve(role: 'agent' | 'judge', init: RequestInit | undefined): void {
		this.check()
		const active = this.#active
		const body = typeof init?.body === 'string' ? init.body : undefined
		const parsed = body === undefined ? undefined : parseJSON(body)
		const tokens =
			isRecord(parsed) && isRecord(parsed.options) ? parsed.options.num_predict : undefined
		if (
			active === undefined ||
			body === undefined ||
			typeof tokens !== 'number' ||
			!Number.isSafeInteger(tokens) ||
			tokens !== (role === 'agent' ? 8192 : 1)
		)
			this.fail(
				new StudyError('CONFIG', 'Screen requires the exact positive role prediction policy'),
			)
		const step = this.#reading?.steps[this.#requests.length]
		if (step !== undefined) {
			if (step.role !== role || step.goal !== active.goal || step.digest !== hashStudyBytes(body))
				this.fail(new StudyError('CUSTODY', 'Screen historical request differs before forwarding'))
		} else if (!this.#settings.preparation) {
			if (
				active.goal !== this.#target.target.id ||
				role !== 'agent' ||
				this.account.agent !== 0 ||
				this.#reading === undefined ||
				this.#requests.length !== this.#reading.steps.length
			)
				this.fail(
					new StudyError(
						'CAPACITY',
						'Screen admits exactly one final agent request and no live judge',
					),
				)
			if (
				!this.#work &&
				this.#settings.sham !== true &&
				hashStudyBytes(body) !== this.#reading.final.digest
			)
				this.fail(new StudyError('CUSTODY', 'Screen off request differs from its source identity'))
			if (
				this.#settings.sham === true &&
				!matchesStudyMemorySham(body, active.input.prompt, this.#reading.final.digest)
			)
				this.fail(new StudyError('CUSTODY', 'Screen sham differs beyond one final input space'))
		}
		const count = this.account
		if (
			step === undefined &&
			this.#settings.preparation &&
			(count.agent + (role === 'agent' ? 1 : 0) > 6 ||
				count.judge + (role === 'judge' ? 1 : 0) > 64 ||
				count.agent + count.judge + 1 > 70 ||
				count.tokens + tokens > 49216)
		)
			this.fail(new StudyError('CAPACITY', 'Screen source model reservation exhausted'))
		this.#requests = [...this.#requests, { role, tokens, historical: step !== undefined }]
	}

	/** Validates target evidence and transforms only its identified provider input. @param messages - Actual supplied provider messages. @returns Original messages or the single-space sham copy. */
	prepare(messages: readonly Message[]): readonly Message[] {
		this.check()
		const active = this.#active
		if (active === undefined) this.fail(new StudyError('FAULT', 'Screen provider outside a goal'))
		if (active.goal !== this.#target.target.id) return messages
		const candidates = active
			.messages()
			.filter(
				(message) =>
					!active.prior.has(message.id) &&
					message.role === 'user' &&
					message.content === active.input.prompt,
			)
		const [input] = candidates
		if (
			candidates.length !== 1 ||
			input === undefined ||
			messages.filter(
				(message) =>
					message.id === input.id &&
					message.role === 'user' &&
					message.content === active.input.prompt,
			).length !== 1
		)
			this.fail(new StudyError('CUSTODY', 'Screen target input identity is missing or ambiguous'))
		const expected = this.#reading?.lookups ?? this.#lookups
		if (
			expected.length !== 2 ||
			expected.some(
				(lookup) =>
					!this.#lookups.some(
						(actual) => actual.id === lookup.id && actual.content === lookup.content,
					) || !matchesStudyMemoryCarriage(messages, lookup.content),
			)
		)
			this.fail(new StudyError('CUSTODY', 'Screen target lacks an exact released lookup version'))
		const draft = this.#reading?.draft ?? this.#draft
		if (
			draft === undefined ||
			this.#draft !== draft ||
			(this.#work && !matchesStudyMemoryCarriage(messages, draft))
		)
			this.fail(new StudyError('CUSTODY', 'Screen target lacks its actual generated draft custody'))
		return this.#settings.sham === true
			? messages.map((message) =>
					message.id === input.id ? { ...message, content: `${message.content} ` } : message,
				)
			: messages
	}

	/** Reserves every returned tool call before the Agent can dispatch any member. @param result - Completed provider result. @returns The unchanged result after admission. */
	complete(result: ProviderResult): ProviderResult {
		this.check()
		try {
			validateStudyAgentUsage(result.usage, 'agent')
		} catch (error) {
			this.fail(error)
		}
		const batch = result.tools ?? []
		if (batch.length === 0) return result
		if (this.#active?.goal === this.#target.target.id)
			this.fail(new StudyError('CAPACITY', 'Screen final response cannot dispatch tools'))
		const count = this.account
		if (
			count.rounds + 1 > 2 ||
			count.tools + batch.length > 4 ||
			count.recalls + batch.filter((call) => call.name === 'recall').length > 2
		)
			this.fail(new StudyError('CAPACITY', 'Screen whole tool batch exceeds its source allowance'))
		this.#batches = [...this.#batches, [...batch]]
		return result
	}

	/** Records a real lookup result without treating a requested id as success. @param id - Actual lookup id. @param content - Actual returned snapshot; absence means not found. */
	lookup(id: string, content: string | undefined): void {
		this.check()
		if (this.#active?.goal !== this.#target.seed.id || content === undefined)
			this.fail(new StudyError('CUSTODY', 'Screen requires successful seed lookups'))
		this.#lookups = [...this.#lookups, { id, content }]
	}

	/** Closes a complete goal while preserving case counters across recovery and goals. @param product - Actual retained goal product. */
	finish(product: StudyProduct): void {
		this.check()
		const active = this.#active
		if (
			active === undefined ||
			product.partial ||
			!isRecord(product.value) ||
			typeof product.value.content !== 'string' ||
			product.value.content.trim() === ''
		)
			this.fail(new StudyError('FAULT', 'Screen requires a complete nonempty goal product'))
		if (active.goal === this.#target.seed.id) {
			const expected = active.input.records.map((record) => ({
				id: record.id,
				content: `${record.id}: ${record.name}\n${record.content}`,
			}))
			if (
				expected.length !== 2 ||
				expected.some(
					(record) =>
						!this.#lookups.some(
							(lookup) => lookup.id === record.id && lookup.content === record.content,
						),
				)
			)
				this.fail(
					new StudyError('CUSTODY', 'Screen seed lacks the required real lookup denominator'),
				)
			this.#draft = product.value.content
		}
		this.#completed = [...this.#completed, active.goal]
	}
	/** Releases the settled goal without clearing reservations or a refusal. */
	clear(): void {
		this.#active = undefined
	}
	/** Throws the retained first refusal before dependent work. */
	check(): void {
		this.#abort.signal.throwIfAborted()
		this.#transport.check()
	}
	/** Latches and aborts the whole case so Ledger recovery cannot convert refusal into success. @param error - First boundary failure. @returns Never returns. */
	fail(error: unknown): never {
		if (!this.#abort.signal.aborted) this.#abort.abort(error)
		this.#transport.fail(this.#abort.signal.reason)
		throw this.#abort.signal.reason
	}
}
