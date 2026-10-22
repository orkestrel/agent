import type { Selection } from '../contexts/types.js'
import type { ConversationInterface } from '../conversations/types.js'
import type { Message } from '../types.js'
import type {
	ClassifierReading,
	GaugeCall,
	LedgerPlan,
	LedgerReceipt,
	LedgerRequestInterface,
	LedgerSelectionReceipt,
} from './types.js'
import type { TokenUsage } from '@orkestrel/budget'
import { canonicalStringify } from '@orkestrel/contract'
import { isNonNegativeSafeInteger } from '../validators.js'
import { DEFAULT_RECALL_LIMIT, LEDGER_NOTES } from './constants.js'
import { LedgerError } from './errors.js'
import { computeThinking } from './helpers.js'
import { LedgerPass } from './LedgerPass.js'

/**
 * Holds what one ledger request keeps while it is served: its message, its filing readings and
 * plan, the gauge calls of its passes, and its repeat and recall stops.
 *
 * @remarks
 * A ledger creates one request per `respond` call and drops it when the call settles. Each pass the
 * request opens holds its own selection, boundary, usage, and calls; the request reads the current
 * pass, the last one opened. {@link LedgerRequestInterface} describes each member.
 *
 * @example
 * ```ts
 * const request = new LedgerRequest('What approval is needed?', 1)
 * request.enter(conversation) // the appended user message
 * request.admit('lookup', { id: 'BW-20931' })
 * request.admit('lookup', { id: 'BW-20931' }) // throws Error(LEDGER_NOTES.repeat)
 * request.recall()
 * request.recall() // throws Error(LEDGER_NOTES.closure): the limit of 1 is spent
 * ```
 */
export class LedgerRequest implements LedgerRequestInterface {
	readonly #content: string
	readonly #limit: number
	#message: Message | undefined
	#plan: LedgerPlan | undefined
	#passes: readonly LedgerPass[] = []
	#readings: readonly ClassifierReading[] = []
	#admitted: ReadonlySet<string> = new Set()
	#listings: ReadonlyMap<string, ReadonlyMap<string, string>> = new Map()
	#recalls = 0
	#closed = false

	/**
	 * Holds the request's content and its recall limit.
	 *
	 * @param content - The request text `enter` appends
	 * @param limit - The `recall` calls the request can make. Default: the `DEFAULT_RECALL_LIMIT` constant
	 * @throws {LedgerError} Thrown when `limit` is not a nonnegative safe integer (code `'LIMIT'`)
	 */
	constructor(content: string, limit: number = DEFAULT_RECALL_LIMIT) {
		if (!isNonNegativeSafeInteger(limit))
			throw new LedgerError('LIMIT', 'limits must be nonnegative safe integers')
		this.#content = content
		this.#limit = limit
	}

	/**
	 * Returns the request message.
	 *
	 * @returns The message `enter` appended, or undefined before it
	 */
	get message(): Message | undefined {
		return this.#message
	}

	/**
	 * Returns the selection the request's last successful plan produced.
	 *
	 * @returns The planned selection, or undefined before one
	 */
	get plan(): LedgerPlan | undefined {
		return this.#plan
	}

	/**
	 * Returns the selection the current pass's run adopted last.
	 *
	 * @returns The selection, or undefined before one
	 */
	get selection(): Selection | undefined {
		return this.#passes.at(-1)?.selection
	}

	/**
	 * Returns the conversation length the current pass's calls count additions from.
	 *
	 * @returns The length, or undefined before a pass
	 */
	get boundary(): number | undefined {
		return this.#passes.at(-1)?.boundary
	}

	/**
	 * Returns the summed usage of the current pass.
	 *
	 * @returns The summed usage, or undefined while none reported usage
	 */
	get usage(): TokenUsage | undefined {
		return this.#passes.at(-1)?.usage
	}

	/**
	 * Returns the gauge calls of every pass.
	 *
	 * @returns The calls in order, the call in flight last
	 */
	get calls(): readonly GaugeCall[] {
		return this.#passes.flatMap((pass) => pass.calls)
	}

	/**
	 * Returns the filing readings of the request's planning selections.
	 *
	 * @returns The readings in asking order
	 */
	get readings(): readonly ClassifierReading[] {
		return this.#readings
	}

	/**
	 * Returns the evidence of every pass opened by this request.
	 * @returns The pass receipts in opening order
	 */
	get receipts(): readonly LedgerReceipt[] {
		return this.#passes.map((pass) => pass.receipt)
	}

	enter(conversation: ConversationInterface): Message {
		if (this.#message !== undefined) return this.#message
		this.#message = conversation.add({ role: 'user', content: this.#content })
		return this.#message
	}

	open(boundary: number): void {
		this.#passes = [...this.#passes, new LedgerPass(boundary)]
	}

	adopt(selection: Selection, boundary: number, receipt: LedgerSelectionReceipt): void {
		this.#passes.at(-1)?.adopt(selection, boundary, receipt)
	}

	observe(call: GaugeCall, position: number): void {
		this.#passes.at(-1)?.observe(call, position)
	}

	spend(usage: TokenUsage): void {
		this.#passes.at(-1)?.spend(usage)
		// The call in flight can belong to an earlier pass until the current pass observes its first call.
		this.#passes.findLast((pass) => pass.call !== undefined)?.bill(usage)
	}

	think(messages: readonly Message[]): void {
		const pass = this.#passes.findLast((one) => one.call !== undefined)
		const completion = pass?.call?.completion
		if (pass?.position === undefined || completion === undefined) return
		const message = messages.slice(pass.position).find((entry) => entry.role === 'assistant')
		if (message?.thinking === undefined) return
		pass.think(computeThinking(message, completion))
	}

	file(readings: readonly ClassifierReading[], plan?: LedgerPlan): void {
		this.#readings = [...this.#readings, ...readings]
		if (plan !== undefined) this.#plan = structuredClone(plan)
	}

	admit(name: string, args: Readonly<Record<string, unknown>>): void {
		const key = canonicalStringify([name, args])
		if (key === undefined) throw new Error('tool arguments have no canonical identity')
		if (this.#admitted.has(key)) throw new Error(LEDGER_NOTES.repeat)
		this.#admitted = new Set([...this.#admitted, key])
	}

	recall(): void {
		if (this.#recalls >= this.#limit) this.#closed = true
		if (this.#closed) throw new Error(LEDGER_NOTES.closure)
		this.#recalls += 1
	}

	close(): void {
		this.#closed = true
	}

	list(result: string, lines: ReadonlyMap<string, string>): void {
		this.#listings = new Map([...this.#listings, [result, lines]])
	}

	listing(result: string): ReadonlyMap<string, string> | undefined {
		return this.#listings.get(result)
	}
}
