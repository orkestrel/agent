import type {
	AgentJudgeInput,
	AgentJudgeInterface,
	JudgeRequest,
	JudgeResult,
	ProviderOptions,
} from './types.js'
import { isRecord, parseJSON } from '@orkestrel/contract'
import { Timeout } from '@orkestrel/timeout'
import { DEFAULT_PROVIDER_TIMEOUT, MAX_ERROR_BODY_LENGTH } from './constants.js'
import { JudgeAbortError, JudgeError } from './errors.js'
import { buildJudgeResult, readHeaders, readText } from './helpers.js'
import { isJudgeEntry, isJudgeQuestion } from './validators.js'

/**
 * Implements the bounded HTTP calls, validation, and result merging of a judge behind concrete
 * wire seams.
 *
 * @remarks
 * A subclass fills `name`, `body`, and `read`; the constructor takes the `batch` switch that
 * decides whether one call carries every question or each question gets its own call in key
 * order. `ask` validates the request before any call, builds every body before the first call so
 * a wire limit refuses the request before inference, and runs the calls one after another, each
 * under its own deadline folded with the caller's signal. A cancel throws a `JudgeAbortError`
 * whose `partial` merges the calls that completed. A transport error reaches the caller unchanged.
 *
 * @example Writing a judge wire
 * ```ts
 * import type { JudgeRequest, JudgeResult } from '@orkestrel/agent'
 * import { AgentJudge, JudgeError } from '@orkestrel/agent'
 * import { isFiniteNumber, isRecord } from '@orkestrel/contract'
 *
 * // A wire whose server answers one yes/no question per call as { "yes": 0.93 }.
 * class YesJudge extends AgentJudge {
 * 	readonly name = 'yes'
 * 	body(request: JudgeRequest): object {
 * 		return { model: this.model, state: request.state, questions: request.questions }
 * 	}
 * 	read(value: unknown, request: JudgeRequest): JudgeResult {
 * 		const [id] = Object.keys(request.questions)
 * 		if (id === undefined || !isRecord(value) || !isFiniteNumber(value.yes)) {
 * 			throw new JudgeError('PROTOCOL', 'judge error: unreadable answer')
 * 		}
 * 		return { model: this.model, answers: { [id]: { form: 'noul', noul: value.yes } } }
 * 	}
 * }
 *
 * const judge = new YesJudge({
 * 	url: 'http://localhost:8010',
 * 	path: '/v1/yes',
 * 	model: 'yes-1',
 * 	batch: false,
 * })
 * ```
 */
export abstract class AgentJudge implements AgentJudgeInterface {
	readonly #id: string
	readonly #url: string
	readonly #path: string
	readonly #model: string
	readonly #timeout: number
	readonly #transport: typeof globalThis.fetch
	readonly #headers: ProviderOptions['headers']
	readonly #batch: boolean

	constructor(input: AgentJudgeInput) {
		this.#id = crypto.randomUUID()
		this.#url = input.url
		this.#path = input.path ?? ''
		this.#model = input.model
		this.#timeout = input.timeout ?? DEFAULT_PROVIDER_TIMEOUT
		this.#transport = input.fetch ?? globalThis.fetch.bind(globalThis)
		this.#headers = input.headers
		this.#batch = input.batch ?? true
	}

	/** Identifies the concrete wire. */
	abstract readonly name: string

	/** Exposes the instance's minted UUID. */
	get id(): string {
		return this.#id
	}

	/** Exposes the configured model identity. */
	get model(): string {
		return this.#model
	}

	/** Projects one call's request onto the concrete protocol's wire body. */
	abstract body(request: JudgeRequest): object
	/** Decodes one call's parsed response body into the answers for that call's questions. */
	abstract read(value: unknown, request: JudgeRequest): JudgeResult

	/**
	 * Asks every question of the request about its state and merges the answers of every call.
	 *
	 * @param request - The state and the questions keyed by caller id
	 * @param signal - The caller's cancellation bound
	 * @returns The merged answers, refusals, and usage of every call
	 * @throws JudgeAbortError Thrown when the caller's signal or a call's deadline fires, carrying
	 * the merged result of the completed calls
	 * @throws JudgeError Thrown with code `QUESTION` for an empty question map, a malformed question
	 * or state, or a wire refusal before any call; with code `HTTP` for a non-OK response; and with
	 * code `PROTOCOL` for a missing or unparsable response body
	 */
	async ask(request: JudgeRequest, signal: AbortSignal): Promise<JudgeResult> {
		if (signal.aborted) throw new JudgeAbortError(buildJudgeResult(this.#model, []))
		if (!isJudgeEntry(request.state)) {
			throw new JudgeError('QUESTION', 'judge error: state is not a judge entry')
		}
		const questions = isRecord(request.questions) ? Object.entries(request.questions) : []
		if (questions.length === 0) throw new JudgeError('QUESTION', 'judge error: no questions')
		for (const [id, question] of questions) {
			if (!isJudgeQuestion(question)) {
				throw new JudgeError('QUESTION', `judge error: question ${id} is malformed`)
			}
		}
		const parts: readonly JudgeRequest[] = this.#batch
			? [request]
			: questions.map(([id, question]) => ({ state: request.state, questions: { [id]: question } }))
		const calls = parts.map((part) => ({ request: part, body: JSON.stringify(this.body(part)) }))
		const results: JudgeResult[] = []
		for (const call of calls) {
			results.push(await this.#call(call.request, call.body, signal, results))
		}
		return buildJudgeResult(this.#model, results)
	}

	// Run one call under its own deadline; a cancel carries the calls completed before it.
	async #call(
		request: JudgeRequest,
		body: string,
		signal: AbortSignal,
		completed: readonly JudgeResult[],
	): Promise<JudgeResult> {
		const timeout = new Timeout({ ms: this.#timeout })
		timeout.start()
		const combined = AbortSignal.any([timeout.signal, signal])
		try {
			const headers = await readHeaders(this.#headers, combined)
			combined.throwIfAborted()
			const response = await this.#transport(this.#url + this.#path, {
				method: 'POST',
				headers,
				body,
				signal: combined,
			})
			if (!response.ok) {
				let detail: string
				try {
					detail =
						response.body === null
							? ''
							: (await readText(response.body, MAX_ERROR_BODY_LENGTH, combined)).text
				} catch (cause) {
					throw new JudgeError(
						'HTTP',
						`judge error: ${response.status} - (error body unavailable)`,
						{ status: response.status, cause },
					)
				}
				combined.throwIfAborted()
				throw new JudgeError(
					'HTTP',
					`judge error: ${response.status}${detail === '' ? '' : ` - ${detail}`}`,
					{ status: response.status },
				)
			}
			if (response.body === null) {
				throw new JudgeError('PROTOCOL', 'judge error: no response body')
			}
			const text = await readText(response.body, undefined, combined)
			combined.throwIfAborted()
			const value = parseJSON(text.text)
			if (value === undefined) throw new JudgeError('PROTOCOL', 'judge error: invalid JSON body')
			return this.read(value, request)
		} catch (error) {
			if (combined.aborted) {
				// A throw that raced the cancel is the call's real failure, so it rides as the cause.
				throw new JudgeAbortError(
					buildJudgeResult(this.#model, completed),
					error === combined.reason ? undefined : { cause: error },
				)
			}
			throw error
		} finally {
			timeout.clear()
		}
	}
}
