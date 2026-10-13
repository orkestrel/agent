import type { Message } from '../vendor/agent-0.0.30-trimmed/index.js'
import type {
	AssignCategory,
	AssignResult,
	LookupReading,
	MirrorFiler,
	MirrorInput,
	MirrorInterface,
	MirrorLedger,
	MirrorLine,
	MirrorOptions,
	MirrorProjection,
	MirrorReading,
} from './types.js'
// The vendored build is the one import of the agent in bench5; repoint this path when a later build is vendored.
import {
	Classifier,
	LEDGER_NOTES,
	buildLines,
	buildRecords,
	collectNames,
	collectRegistry,
	collectToolGroups,
	extractTokens,
	linkOwners,
	matchEntities,
	findLedgerCall,
} from '../vendor/agent-0.0.30-trimmed/index.js'
import { assignCategory } from './helpers.js'

/**
 * Rebuilds the projection input and the filing that the ledger's private projection and plan read, without asking the judge.
 *
 * @example
 * ```ts
 * const mirror = new Mirror(ledger, { judge, questions, topics, thresholds, system, reads })
 * mirror.note(request)
 * const titles = mirror.owners(request).map((id) => mirror.projection().records.find((record) => record.key === `owner:${id}`)?.title)
 * ```
 */
export class Mirror implements MirrorInterface {
	readonly #ledger: MirrorLedger
	readonly #options: MirrorOptions
	readonly #filer: MirrorFiler
	readonly #requests = new Set<string>()
	readonly #results = new Map<string, AssignResult>()
	readonly #pending = new Map<number, AssignResult>()

	/**
	 * Subscribes to the ledger's tool events and builds the classifier that reads the ledger's recorded judgments.
	 * @param ledger - The ledger whose conversation and agent the mirror reads
	 * @param options - The judge, questions, topics, thresholds, system text, and lookup readers that the ledger runs with
	 */
	constructor(ledger: MirrorLedger, options: MirrorOptions) {
		this.#ledger = ledger
		this.#options = options
		this.#filer = new Classifier({
			conversation: ledger.conversation,
			judge: options.judge,
			questions: options.questions,
			topics: options.topics,
			thresholds: options.thresholds,
			assign: (message: Message) => this.assign(message),
			entities: (text: string, partial: boolean) =>
				matchEntities(collectRegistry(this.readings()), text, partial),
		})
		// The ledger keys a result by the conversation length at the event, because the tool message is added after it.
		ledger.agent.emitter.on('tool', (_call, result) => {
			this.#flush()
			this.#pending.set(ledger.conversation.messages().length, result)
		})
	}

	/**
	 * Records a message as a request, so the assign rule files the assistant messages after it as chatter.
	 * @param request - The user message that the ledger serves as a request
	 */
	note(request: Message): void {
		this.#requests.add(request.id)
	}

	/**
	 * Files a message the way the ledger assigns it without a question.
	 * @param message - The message to file
	 * @returns `chatter` for an annotation, a failed tool result, an assistant call, and an assistant message after the first request; `fact` for another tool result; `undefined` when the judge decides
	 */
	assign(message: Message): AssignCategory | undefined {
		this.#flush()
		if (message.role === 'tool') this.readings()
		const messages = this.#ledger.conversation.messages()
		return assignCategory(
			message,
			messages,
			this.#requests,
			this.#annotate(messages),
			this.#results,
		)
	}

	/**
	 * Reads every successful lookup result in the conversation.
	 * @returns The readings in conversation order; a result that failed or whose reader threw is skipped, and a throwing reader marks its result failed
	 */
	readings(): readonly MirrorReading[] {
		this.#flush()
		const readings: MirrorReading[] = []
		for (const group of collectToolGroups(this.#ledger.conversation.messages())) {
			for (const message of group.slice(1)) {
				const call = findLedgerCall(group, message)
				const read = call === undefined ? undefined : this.#options.reads.get(call.name)
				if (
					call === undefined ||
					read === undefined ||
					this.#results.get(message.id)?.success === false
				)
					continue
				let result: LookupReading | undefined
				try {
					result = read(call.arguments, message.content)
				} catch {
					this.#results.set(message.id, { success: false })
					continue
				}
				const named = Object.values(call.arguments)
					.filter((value): value is string => typeof value === 'string')
					.flatMap((value) => [...extractTokens(value).ids])
				readings.push({
					id: message.id,
					name: call.name,
					arguments: call.arguments,
					text: message.content,
					result:
						result === undefined
							? undefined
							: { ...result, ids: [...new Set([...result.ids, ...named])] },
				})
			}
		}
		return readings
	}

	/**
	 * Builds the input that the ledger projects its records from.
	 * @returns The system text, the excluded ids (requests and annotations), the owners, the messages, the readings, the entities of each message, and the classification read from the recorded judgments
	 */
	input(): MirrorInput {
		const readings = this.readings()
		const registry = collectRegistry(readings)
		const messages = this.#ledger.conversation.messages()
		return {
			system: this.#options.system,
			exclusions: [...this.#requests, ...this.#annotate(messages)],
			owners: registry.owners,
			messages,
			readings,
			entities: new Map(
				messages.map((message) => [
					message.id,
					[...matchEntities(registry, message.content, true)],
				]),
			),
			classification: this.#filer.classification(),
		}
	}

	/**
	 * Projects the records, the stale sentences, and the loose messages from the input.
	 * @param input - The input to project; default: the input read now
	 * @returns The projection that the ledger's plan would read
	 */
	projection(input: MirrorInput = this.input()): MirrorProjection {
		return buildRecords(input)
	}

	/**
	 * Builds the live lines of one message as the ledger's records carry them.
	 * @param id - The message id
	 * @param input - The input to read; default: the input read now
	 * @param projection - The projection whose stale sentences drop out; default: the projection of the input
	 * @returns The lines in sentence order; empty when the message is absent
	 */
	lines(
		id: string,
		input: MirrorInput = this.input(),
		projection: MirrorProjection = this.projection(input),
	): readonly MirrorLine[] {
		return buildLines(
			input,
			new Map(input.messages.map((message) => [message.id, message])),
			id,
			new Set(projection.stale.map((line) => `${line.source} ${line.sentence}`)),
			[...input.owners.values()].flat(),
			collectNames(input.system),
		)
	}

	/**
	 * Lists the registry ids and desk topics that a request names.
	 * @param request - The request message
	 * @returns The ids and owner ids that its text names, then the desk topics recorded for it
	 */
	near(request: Message): ReadonlySet<string> {
		const registry = collectRegistry(this.readings())
		return new Set([
			...matchEntities(registry, request.content, true),
			...this.#filer.topics(request.id),
		])
	}

	/**
	 * Lists the owner ids whose records a request selects.
	 * @param request - The request message
	 * @returns The owner ids in the order the request names them; an id that a lookup linked to its owner stands for that owner
	 */
	owners(request: Message): readonly string[] {
		const readings = this.readings()
		const registry = collectRegistry(readings)
		const links = linkOwners(readings, registry.owners)
		const owners = new Set<string>()
		for (const id of this.near(request)) {
			const owner = registry.owners.has(id) ? id : links.get(id)
			if (owner !== undefined) owners.add(owner)
		}
		return [...owners]
	}

	// Moves each pending result to the id of the tool message that now sits at its index.
	#flush(): void {
		const messages = this.#ledger.conversation.messages()
		for (const [at, result] of this.#pending) {
			const message = messages[at]
			if (message?.role === 'tool') {
				this.#results.set(message.id, result)
				this.#pending.delete(at)
			}
		}
	}

	// Finds the ledger's own cue and digest messages: user messages after the first request that carry its note text.
	#annotate(messages: readonly Message[]): ReadonlySet<string> {
		const first = messages.findIndex((message) => this.#requests.has(message.id))
		if (first < 0) return new Set()
		return new Set(
			messages
				.slice(first + 1)
				.filter(
					(message) =>
						message.role === 'user' &&
						(message.content === LEDGER_NOTES.cue ||
							message.content.startsWith(LEDGER_NOTES.results)),
				)
				.map((message) => message.id),
		)
	}
}
