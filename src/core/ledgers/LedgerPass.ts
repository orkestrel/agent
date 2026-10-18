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
 * signature names this class. The call in flight takes its usage and thinking until the pass
 * observes the next call, which appends it to `calls` as a final record.
 */
export class LedgerPass {
	#calls: readonly GaugeCall[] = []
	#call: GaugeCall | undefined
	#position: number | undefined
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
		return this.#call
	}

	/**
	 * Returns the conversation length when the call in flight started.
	 *
	 * @returns The position, or undefined before a call
	 */
	get position(): number | undefined {
		return this.#position
	}

	/**
	 * Returns the pass's gauge calls in order.
	 *
	 * @returns The final calls followed by the call in flight
	 */
	get calls(): readonly GaugeCall[] {
		return this.#call === undefined ? this.#calls : [...this.#calls, this.#call]
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
	 * Starts a call, appending the call in flight to `calls` as final.
	 *
	 * @param call - The call's estimate and advertised tool count
	 * @param position - The conversation length when the call starts
	 */
	observe(call: GaugeCall, position: number): void {
		if (this.#call !== undefined) this.#calls = [...this.#calls, this.#call]
		this.#call = call
		this.#position = position
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
	 * Records a reported usage as the prompt and completion of the call in flight.
	 *
	 * @param usage - The usage the provider reported for the call
	 */
	bill(usage: TokenUsage): void {
		if (this.#call !== undefined)
			this.#call = { ...this.#call, prompt: usage.prompt, completion: usage.completion }
	}

	/**
	 * Records the thinking share of the call in flight.
	 *
	 * @param thinking - The completion tokens attributed to the call's thinking
	 */
	think(thinking: number): void {
		if (this.#call !== undefined) this.#call = { ...this.#call, thinking }
	}
}
