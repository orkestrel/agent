import type { Selection } from '../contexts/types.js'
import type { GaugeCall } from './types.js'
import type { TokenUsage } from '@orkestrel/budget'
import { sumUsage } from '../helpers.js'

/**
 * Holds what one pass of a ledger request keeps: the selection its run adopted last, the
 * conversation boundary its calls count additions from, its summed usage, and its gauge calls.
 *
 * @remarks
 * A `LedgerRequest` opens one pass per agent run and exposes only projections of it, so no public
 * signature names this class. The pass appends one final record to its log for each call observed,
 * each usage reported, and each thinking share, in emission order, and derives `calls`, `call`, and
 * `position` from it: a usage or thinking record joins the last call observed before it, and one
 * recorded before the first call joins none.
 */
export class LedgerPass {
	#log: ReadonlyArray<
		| { readonly call: GaugeCall; readonly position: number }
		| { readonly usage: { readonly prompt: number; readonly completion: number } }
		| { readonly thinking: number }
	> = []
	#selection: Selection | undefined
	#boundary: number
	#usage: TokenUsage | undefined

	/**
	 * Opens the pass at a conversation boundary.
	 *
	 * @param boundary - The conversation length when the pass's run starts
	 */
	constructor(boundary: number) {
		this.#boundary = boundary
	}

	/**
	 * Returns the selection the pass's run adopted last.
	 *
	 * @returns The selection, or undefined before one
	 */
	get selection(): Selection | undefined {
		return this.#selection
	}

	/**
	 * Returns the conversation length the pass's calls count additions from.
	 *
	 * @returns The length at the pass's start or at its last adopted selection
	 */
	get boundary(): number {
		return this.#boundary
	}

	/**
	 * Returns the summed usage of the pass's selections and calls.
	 *
	 * @returns The summed usage, or undefined while none reported usage
	 */
	get usage(): TokenUsage | undefined {
		return this.#usage
	}

	/**
	 * Returns the call in flight.
	 *
	 * @returns The latest call the pass observed, or undefined before one
	 */
	get call(): GaugeCall | undefined {
		return this.calls.at(-1)
	}

	/**
	 * Returns the conversation length when the call in flight started.
	 *
	 * @returns The position, or undefined before a call
	 */
	get position(): number | undefined {
		return this.#log.flatMap((entry) => ('position' in entry ? [entry.position] : [])).at(-1)
	}

	/**
	 * Returns the pass's gauge calls in order.
	 *
	 * @returns Each observed call with the last usage and thinking recorded after it, before the next call
	 */
	get calls(): readonly GaugeCall[] {
		return this.#log.flatMap((entry, index) => {
			if (!('call' in entry)) return []
			const after = this.#log.slice(index + 1)
			const next = after.findIndex((one) => 'call' in one)
			const joined = next === -1 ? after : after.slice(0, next)
			const usage = joined.flatMap((one) => ('usage' in one ? [one.usage] : [])).at(-1)
			const thinking = joined.flatMap((one) => ('thinking' in one ? [one.thinking] : [])).at(-1)
			const billed =
				usage === undefined
					? entry.call
					: { ...entry.call, prompt: usage.prompt, completion: usage.completion }
			return [thinking === undefined ? billed : { ...billed, thinking }]
		})
	}

	/**
	 * Records the selection the pass's run adopted and adds the usage it spent.
	 *
	 * @param selection - The selection the run built its prompt from
	 * @param boundary - The conversation length when the run adopted it
	 */
	adopt(selection: Selection, boundary: number): void {
		this.#selection = selection
		this.#boundary = boundary
		if (selection.usage !== undefined) this.#usage = sumUsage(this.#usage, selection.usage)
	}

	/**
	 * Starts a call, appending its record to the log.
	 *
	 * @param call - The call's estimate and advertised tool count
	 * @param position - The conversation length when the call starts
	 */
	observe(call: GaugeCall, position: number): void {
		this.#log = [...this.#log, { call, position }]
	}

	/**
	 * Adds one call's reported usage to the pass's summed usage.
	 *
	 * @param usage - The usage the provider reported
	 */
	spend(usage: TokenUsage): void {
		this.#usage = sumUsage(this.#usage, usage)
	}

	/**
	 * Appends a reported usage to the log, which joins the call observed last as its prompt and completion.
	 *
	 * @remarks
	 * The record keeps the prompt and completion values the usage held at this call, so a later change
	 * to the caller's object never reaches a reading.
	 *
	 * @param usage - The usage the provider reported for the call
	 */
	bill(usage: TokenUsage): void {
		this.#log = [...this.#log, { usage: { prompt: usage.prompt, completion: usage.completion } }]
	}

	/**
	 * Appends the thinking share to the log, which joins the call observed last.
	 *
	 * @param thinking - The completion tokens attributed to the call's thinking
	 */
	think(thinking: number): void {
		this.#log = [...this.#log, { thinking }]
	}
}
