import type { Message } from '../types.js'
import type { GaugeCall, GaugeInterface, GaugeOptions } from './types.js'
import { isFiniteNumber } from '@orkestrel/contract'
import { estimateMessages } from '../agents/helpers.js'
import { LedgerError } from './errors.js'
import { fitSlope } from './helpers.js'

/**
 * Prices prompts in tokens from a measured scale and fixed cost, and measures the room a request
 * has left.
 *
 * @remarks
 * `observe` rescales from the first call of each finished request with the fixed cost taken out,
 * and keeps that request's calls for the marginal rate and the longest completion for the reply
 * reserve. `fixed` never changes after construction.
 *
 * @example
 * ```ts
 * const gauge = new Gauge({ scale: 1.16, fixed: 498, capacity: 32768 })
 * gauge.room([{ estimate: 1719, prompt: 2498, tools: 3 }], '') // estimate units a recall result can take
 * ```
 */
export class Gauge implements GaugeInterface {
	readonly #capacity: number
	readonly #history: Array<readonly GaugeCall[]> = []
	#scale: number
	#fixed: number
	#reply = 0

	/**
	 * Holds the starting price and the capacity.
	 *
	 * @param options - The starting `scale` and `fixed` price and the context `capacity`
	 * @throws {LedgerError} Thrown when `scale` is not finite and above 0, or `fixed` is not finite and at least 0 (code `'GAUGE'`)
	 * @throws {LedgerError} Thrown when `capacity` is not a positive safe integer (code `'CAPACITY'`)
	 */
	constructor(options: GaugeOptions) {
		if (!isFiniteNumber(options.scale) || options.scale <= 0) {
			throw new LedgerError('GAUGE', 'gauge scale must be finite and greater than 0')
		}
		if (!isFiniteNumber(options.fixed) || options.fixed < 0) {
			throw new LedgerError('GAUGE', 'gauge fixed must be finite and at least 0')
		}
		if (!Number.isSafeInteger(options.capacity) || options.capacity <= 0) {
			throw new LedgerError('CAPACITY', 'gauge capacity must be a positive safe integer')
		}
		this.#scale = options.scale
		this.#fixed = options.fixed
		this.#capacity = options.capacity
	}

	get scale(): number {
		return this.#scale
	}

	get fixed(): number {
		return this.#fixed
	}

	measure(messages: readonly Message[]): number {
		return this.#fixed + this.#scale * estimateMessages(messages)
	}

	/**
	 * Reads the marginal rate of prompt tokens per estimate unit.
	 *
	 * @remarks
	 * Returns the scale when the fit is undefined, nonfinite, or not above 0, a guard the measured
	 * harness lacked, so a degenerate fit never prices recall room.
	 *
	 * @param calls - The calls of the request in progress
	 * @returns The fitted slope, or the scale when the slope is unusable
	 */
	rate(calls: readonly GaugeCall[]): number {
		const slope = fitSlope([...this.#history, calls])
		return slope !== undefined && isFiniteNumber(slope) && slope > 0 ? slope : this.#scale
	}

	left(calls: readonly GaugeCall[]): number {
		const call = calls.at(-1)
		const used = isFiniteNumber(call?.prompt)
			? call.prompt + (call.completion ?? 0)
			: this.#fixed + this.#scale * (call?.estimate ?? 0)
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
			rate *
			estimateMessages([
				{
					id: 'call',
					role: 'assistant',
					content: '',
					calls: [{ id: 'call_00000000', name: 'recall', arguments: { topic: '' } }],
				},
				{ id: 'result', role: 'tool', content: '' },
			])
		return reply + recall
	}

	room(calls: readonly GaugeCall[], longest: string): number {
		return Math.max(0, (this.left(calls) - this.reserve(calls, longest)) / 2 / this.rate(calls))
	}

	observe(calls: readonly GaugeCall[]): void {
		const first = calls[0]
		if (first !== undefined && isFiniteNumber(first.prompt) && first.estimate > 0) {
			const priced = first.prompt - this.#fixed
			if (priced > 0) this.#scale = priced / first.estimate
		}
		this.#history.push([...calls])
		for (const call of calls) {
			if (isFiniteNumber(call.completion)) this.#reply = Math.max(this.#reply, call.completion)
		}
	}
}
