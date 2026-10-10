import type { ThinkingReplay } from '../types.js'
import type { GaugeCall, GaugeInterface, GaugeOptions } from './types.js'
import { isFiniteNumber } from '@orkestrel/contract'
import { estimateMessages } from '../agents/helpers.js'
import { LedgerError } from './errors.js'
import { isPositiveSafeInteger } from './validators.js'
import { buildRecallMessage, fitSlope, resolvePredict } from './helpers.js'

/**
 * Prices prompts in tokens from a measured scale and overhead cost, and measures the room a request
 * has left.
 *
 * @remarks
 * `observe` rescales from the first call of each finished request with the overhead cost taken out,
 * and keeps that request's calls for the marginal rate and the longest final completion for the reply
 * reserve after subtracting its thinking. `overhead` never changes after construction.
 * {@link GaugeOptions} defines the measured use, reply reserve, and recall-room formulas.
 * {@link LedgerOptions} defines the ledger's plan budget and recall close rule.
 *
 * @example
 * ```ts
 * const gauge = new Gauge({ scale: 1.16, overhead: 498, capacity: 32768 })
 * gauge.room([{ estimate: 1719, prompt: 2498, tools: 3 }], '') // estimate units a recall result can take
 * ```
 */
export class Gauge implements GaugeInterface {
	readonly #capacity: number
	readonly #predict: number
	readonly #replay: ThinkingReplay
	#history: ReadonlyArray<readonly GaugeCall[]> = []
	#scale: number
	#overhead: number
	#reply = 0

	/**
	 * Holds the starting price and the capacity.
	 *
	 * @param options - The starting `scale` and `overhead` price and the context `capacity`
	 * @throws {LedgerError} Thrown when `scale` is not finite and above 0, or `overhead` is not finite and at least 0 (code `'GAUGE'`)
	 * @throws {LedgerError} Thrown when `capacity` is not a positive safe integer (code `'CAPACITY'`)
	 * @throws {LedgerError} Thrown when `predict` is not a nonnegative safe integer less than `capacity` (code `'CAPACITY'`)
	 */
	constructor(options: GaugeOptions) {
		if (!isFiniteNumber(options.scale) || options.scale <= 0) {
			throw new LedgerError('GAUGE', 'gauge scale must be finite and greater than 0')
		}
		if (!isFiniteNumber(options.overhead) || options.overhead < 0) {
			throw new LedgerError('GAUGE', 'gauge overhead must be finite and at least 0')
		}
		if (!isPositiveSafeInteger(options.capacity)) {
			throw new LedgerError('CAPACITY', 'gauge capacity must be a positive safe integer')
		}
		this.#scale = options.scale
		this.#overhead = options.overhead
		this.#capacity = options.capacity
		this.#predict = resolvePredict(options.predict, options.capacity)
		this.#replay = options.replay ?? 'none'
	}

	get scale(): number {
		return this.#scale
	}

	get overhead(): number {
		return this.#overhead
	}

	/**
	 * Reads the marginal rate of prompt tokens per estimate unit.
	 *
	 * @remarks
	 * Returns the scale when the fit is undefined, nonfinite, or not above 0, so a degenerate fit never prices recall room.
	 *
	 * @param calls - The calls of the request in progress
	 * @returns The fitted slope, or the scale when the slope is unusable
	 */
	rate(calls: readonly GaugeCall[]): number {
		const slope = fitSlope([...this.#history, calls])
		return slope !== undefined && isFiniteNumber(slope) && slope > 0 ? slope : this.#scale
	}

	remainder(calls: readonly GaugeCall[]): number {
		const call = calls.at(-1)
		const used = isFiniteNumber(call?.prompt)
			? call.prompt + (call.completion ?? 0) - (this.#replay === 'none' ? (call.thinking ?? 0) : 0)
			: this.#overhead + this.#scale * (call?.estimate ?? 0)
		return Math.max(0, this.#capacity - used)
	}

	reserve(calls: readonly GaugeCall[], longest: string): number {
		const rate = this.rate(calls)
		// Before any reply is observed, the longest assistant text stands in for the reply.
		const reply =
			this.#reply > 0
				? this.#reply
				: rate * estimateMessages([{ id: 'reply', role: 'assistant', content: longest }])
		const recall =
			rate * estimateMessages([buildRecallMessage(''), { id: 'result', role: 'tool', content: '' }])
		return reply + recall
	}

	room(calls: readonly GaugeCall[], longest: string): number {
		return Math.max(
			0,
			(this.remainder(calls) - this.#predict - this.reserve(calls, longest)) / 2 / this.rate(calls),
		)
	}

	observe(calls: readonly GaugeCall[], reply?: GaugeCall): void {
		const first = calls[0]
		if (first !== undefined && isFiniteNumber(first.prompt) && first.estimate > 0) {
			const priced = first.prompt - this.#overhead
			if (priced > 0) this.#scale = priced / first.estimate
		}
		this.#history = [...this.#history, [...calls]]
		if (isFiniteNumber(reply?.completion))
			this.#reply = Math.max(this.#reply, reply.completion - (reply.thinking ?? 0))
	}
}
