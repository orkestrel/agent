import type { AgentJudgeInput, AgentJudgeInterface, ProviderOptions } from './types.js'
import type { JudgeQuestion, JudgeRequest, JudgeResult } from '../types.js'
import { isRecord, parseJSON } from '@orkestrel/contract'
import { Timeout } from '@orkestrel/timeout'
import { DEFAULT_PROVIDER_TIMEOUT } from './constants.js'
import { JudgeError } from './errors.js'
import { copyJSON } from '../cloners.js'
import { JudgeAbortError } from '../errors.js'
import { buildJudgeResult, buildProviderHeaders, readFailure, readText } from './helpers.js'
import { isJudgeEntry, isJudgeQuestion } from '../validators.js'

/**
 * Implements the bounded HTTP calls, validation, and result merging of a judge behind concrete
 * wire seams.
 *
 * @remarks
 * A subclass fills `name`, `encode`, and `read`; the constructor takes the `batch` switch that
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
 * 	encode(request: JudgeRequest): object {
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
	abstract encode(request: JudgeRequest): object
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
	 * @throws JudgeError Thrown when the question map is empty, a question or the state is malformed,
	 * or the wire refuses the request before any call (code `QUESTION`); when a response is non-OK
	 * (code `HTTP`); and when a response body is missing or unparsable (code `PROTOCOL`)
	 */
	async ask(request: JudgeRequest, signal: AbortSignal): Promise<JudgeResult> {
		if (signal.aborted) throw new JudgeAbortError(buildJudgeResult(this.#model, []))
		// The request is owned through JSON before validation, so a caller mutating it while a call
		// is pending cannot make `read` decode against criteria that were never sent, and a proxied
		// request (a reactive view) is owned where a structured clone would refuse it.
		const state = copyJSON(request.state)
		if (!isJudgeEntry(state)) {
			throw new JudgeError('QUESTION', 'judge error: state is not a judge entry')
		}
		const questions = isRecord(request.questions) ? Object.entries(request.questions) : []
		if (questions.length === 0) throw new JudgeError('QUESTION', 'judge error: no questions')
		const entries: Array<readonly [string, JudgeQuestion]> = []
		for (const [id, question] of questions) {
			const copy = copyJSON(question)
			if (!isJudgeQuestion(copy)) {
				throw new JudgeError('QUESTION', `judge error: question ${id} is malformed`)
			}
			entries.push([id, copy])
		}
		const owned: JudgeRequest = { state, questions: Object.fromEntries(entries) }
		const parts: readonly JudgeRequest[] = this.#batch
			? [owned]
			: entries.map(([id, question]) => ({ state, questions: { [id]: question } }))
		const calls = parts.map((part) => ({ request: part, body: JSON.stringify(this.encode(part)) }))
		const results: JudgeResult[] = []
		for (const call of calls) {
			results.push(await this.#call(call.request, call.body, signal, results))
		}
		return buildJudgeResult(this.#model, results)
	}

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
			const headers = await buildProviderHeaders(this.#headers, combined)
			combined.throwIfAborted()
			const response = await this.#transport(this.#url + this.#path, {
				method: 'POST',
				headers,
				body,
				signal: combined,
			})
			if (!response.ok) {
				const failure = await readFailure(response, 'judge error:', combined)
				// Preserve a body-read failure as the cause when it raced the abort.
				if (!Object.hasOwn(failure, 'cause')) combined.throwIfAborted()
				throw new JudgeError('HTTP', failure.message, {
					status: response.status,
					...(failure.cause === undefined ? {} : { cause: failure.cause }),
				})
			}
			if (response.body === null) {
				throw new JudgeError('PROTOCOL', 'judge error: no response body')
			}
			const text = await readText(response.body, undefined, combined)
			combined.throwIfAborted()
			const value = parseJSON(text.text)
			if (value === undefined) throw new JudgeError('PROTOCOL', 'judge error: invalid JSON body')
			const result = this.read(value, request)
			combined.throwIfAborted()
			return result
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
