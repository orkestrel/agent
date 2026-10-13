import type { Message } from '../vendor/agent-0.0.30-trimmed/index.js'
import type { SummarizerInterface, SummarizerOptions, SummaryResult, SummaryRow } from './types.js'
import { appendFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { SUMMARY_MISS } from './constants.js'
import { buildSummaryKey, isSummaryRow, readRows } from './helpers.js'

/**
 * Generates aggregate prose from a message list through its own provider, and answers a repeated list from a rows file.
 *
 * @remarks
 * The provider must be built with the sampler and `num_predict` that the options carry, because the key records them and the provider sends them. The class never touches a ledger, so the ledger's emitter, gauge, and conversation never see a summarizer call.
 *
 * @example
 * ```ts
 * const summarizer = new Summarizer({ provider, model, sampler: SAMPLER, predict: 160, cache: 'tmp/cache/summary.jsonl', live: true })
 * const { prose } = await summarizer.summarize(messages, signal)
 * ```
 */
export class Summarizer implements SummarizerInterface {
	readonly #options: SummarizerOptions
	readonly #rows = new Map<string, SummaryRow>()

	/**
	 * Loads the rows file when it exists.
	 * @param options - The provider, model identity, sampler, generation cap, rows file, and live flag
	 */
	constructor(options: SummarizerOptions) {
		this.#options = options
		if (existsSync(options.cache)) {
			for (const row of readRows(options.cache)) {
				if (isSummaryRow(row)) this.#rows.set(row.key, row)
			}
		}
		if (options.live) mkdirSync(dirname(options.cache), { recursive: true })
	}

	/**
	 * Summarizes a message list from the cache, or from the provider on a live miss.
	 * @param messages - The system and user messages of the summary prompt
	 * @param signal - The caller's signal
	 * @returns The trimmed prose, the untrimmed output, the usage and wall time of the recorded call, and whether the cache answered
	 * @remarks Thrown on an offline miss, and when the provider fails; a failed or aborted call appends no row.
	 */
	async summarize(messages: readonly Message[], signal: AbortSignal): Promise<SummaryResult> {
		const key = buildSummaryKey(this.#options, messages)
		const row = this.#rows.get(key)
		if (row !== undefined)
			return { prose: row.prose, raw: row.raw, usage: row.usage, wall: row.wall, cached: true }
		if (!this.#options.live) throw new Error(SUMMARY_MISS)
		const started = performance.now()
		const result = await this.#options.provider.generate(messages, signal, undefined, {
			think: false,
		})
		const wall = performance.now() - started
		const fresh: SummaryRow = {
			key,
			model: this.#options.model,
			sampler: this.#options.sampler,
			predict: this.#options.predict,
			prose: result.content.trim(),
			raw: result.content,
			...(result.usage === undefined ? {} : { usage: result.usage }),
			wall,
			origin: 'live',
			at: Date.now(),
		}
		appendFileSync(this.#options.cache, `${JSON.stringify(fresh)}\n`)
		this.#rows.set(key, fresh)
		return { prose: fresh.prose, raw: fresh.raw, usage: fresh.usage, wall, cached: false }
	}
}
