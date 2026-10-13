import type {
	JudgeAnswer,
	JudgeInterface,
	JudgeQuestion,
	JudgeRequest,
	JudgeResult,
	Refusal,
} from '@orkestrel/agent'
import type { CacheRow, JudgeCacheOptions, JudgeStats } from './types.js'
import { appendFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { JUDGE_MISS } from './constants.js'
import {
	buildCacheKey,
	describeError,
	extractHead,
	isCacheRow,
	matchesDeterministic,
	readRows,
} from './helpers.js'

/**
 * Answers one-question judge requests from a rows file keyed by model, state, and question, and forwards a miss to the inner judge when live.
 *
 * @example
 * ```ts
 * const cache = new JudgeCache({ judge, path: 'tmp/cache/judge.jsonl', live: false, retry: 2 })
 * const result = await cache.ask(request, signal)
 * ```
 */
export class JudgeCache implements JudgeInterface {
	readonly #options: JudgeCacheOptions
	readonly #rows = new Map<string, CacheRow>()
	readonly #hits = new Map<string, number>()
	readonly #misses = new Map<string, number>()
	#transient = 0
	#fault: Error | undefined

	/**
	 * Loads the rows file when it exists.
	 * @param options - The inner judge, the rows file, the live flag, and the retry bound
	 */
	constructor(options: JudgeCacheOptions) {
		this.#options = options
		if (existsSync(options.path)) {
			for (const row of readRows(options.path)) {
				if (isCacheRow(row)) {
					if (
						row.context !== undefined &&
						row.key !== buildCacheKey(row.model, row.state, row.question, row.context)
					)
						throw new Error('support cache custody mismatch')
					this.#rows.set(row.key, row)
				}
			}
		}
		if (options.live) mkdirSync(dirname(options.path), { recursive: true })
	}

	get id(): string {
		return this.#options.judge.id
	}

	get name(): string {
		return this.#options.judge.name
	}

	get model(): string {
		return this.#options.judge.model
	}

	/** Holds the error that ended the retries of a live miss; `undefined` while no miss has failed for good. */
	get fault(): Error | undefined {
		return this.#fault
	}

	/**
	 * Counts the questions seen so far by head.
	 * @returns The hits and misses per head, and the transient judge errors
	 */
	stats(): JudgeStats {
		return {
			hits: Object.fromEntries(this.#hits),
			misses: Object.fromEntries(this.#misses),
			transient: this.#transient,
		}
	}

	/**
	 * Answers a one-question request from the cache, or from the inner judge on a live miss.
	 * @param request - The state and its single question
	 * @param signal - The caller's signal
	 * @returns The recorded or fresh result
	 * @remarks Thrown when the request holds more than one question, when a recorded error row matches, when an offline miss occurs, or when a live miss fails every attempt; the last case also sets `fault` and calls `abort`.
	 */
	async ask(request: JudgeRequest, signal: AbortSignal, context?: string): Promise<JudgeResult> {
		const entries = Object.entries(request.questions)
		if (entries.length > 1)
			throw new Error(`judge cache: expected one question, received ${entries.length}`)
		const entry = entries[0]
		if (entry === undefined) return { model: this.model, answers: {} }
		const [id, question] = entry
		const head = extractHead(id)
		const row = this.#rows.get(buildCacheKey(this.model, request.state, question, context))
		if (row !== undefined) {
			this.#count(this.#hits, head)
			return this.#replay(row, id)
		}
		this.#count(this.#misses, head)
		if (!this.#options.live) throw new Error(JUDGE_MISS)
		if (this.#fault !== undefined) throw this.#fault
		return await this.#forward(request, id, question, signal, context)
	}

	#count(counts: Map<string, number>, head: string): void {
		counts.set(head, (counts.get(head) ?? 0) + 1)
	}

	#replay(row: CacheRow, id: string): JudgeResult {
		if (row.error !== undefined) throw new Error(row.error)
		return {
			model: this.model,
			answers: row.answer === undefined ? {} : { [id]: row.answer },
			...(row.refusal === undefined ? {} : { refusals: { [id]: row.refusal } }),
			...(row.usage === undefined ? {} : { usage: row.usage }),
		}
	}

	async #forward(
		request: JudgeRequest,
		id: string,
		question: JudgeQuestion,
		signal: AbortSignal,
		context?: string,
	): Promise<JudgeResult> {
		const attempts = Math.max(0, this.#options.retry) + 1
		let last: unknown
		for (let attempt = 1; attempt <= attempts; attempt += 1) {
			const started = performance.now()
			let result: JudgeResult
			try {
				result = await this.#options.judge.ask(request, signal)
			} catch (error) {
				// An abort ends the question without a verdict, so it is neither cached nor counted.
				if (signal.aborted) throw error
				if (matchesDeterministic(error)) {
					const text = describeError(error)
					this.#append(request, question, started, { error: text }, context)
					throw new Error(text, { cause: error })
				}
				this.#transient += 1
				last = error
				continue
			}
			const answer: JudgeAnswer | undefined = result.answers[id]
			const refusal: Refusal | undefined = result.refusals?.[id]
			if (answer === undefined && refusal === undefined) {
				this.#transient += 1
				last = new Error('judge result lacks the question')
				continue
			}
			this.#append(
				request,
				question,
				started,
				{
					...(answer === undefined ? {} : { answer }),
					...(refusal === undefined ? {} : { refusal }),
					...(result.usage === undefined ? {} : { usage: result.usage }),
				},
				context,
			)
			return result
		}
		const fault = new Error(
			`harness fault: the judge failed ${attempts} times: ${describeError(last)}`,
			{
				cause: last,
			},
		)
		this.#fault = fault
		this.#options.abort?.(fault)
		throw fault
	}

	#append(
		request: JudgeRequest,
		question: JudgeQuestion,
		started: number,
		outcome: Pick<CacheRow, 'answer' | 'refusal' | 'error' | 'usage'>,
		context?: string,
	): void {
		const row: CacheRow = {
			key: buildCacheKey(this.model, request.state, question, context),
			...(context === undefined ? {} : { context }),
			model: this.model,
			state: request.state,
			question,
			...outcome,
			wall: performance.now() - started,
			origin: 'live',
			at: Date.now(),
		}
		appendFileSync(this.#options.path, `${JSON.stringify(row)}\n`)
		this.#rows.set(row.key, row)
	}
}
