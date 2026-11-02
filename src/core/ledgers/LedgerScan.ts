import type { Message } from '../types.js'
import type { LedgerIndex, LedgerLookupReading, LedgerRegistry } from './types.js'
import { collectToolGroups } from '../helpers.js'
import { buildLedgerIndex, collectRegistry } from './helpers.js'

/**
 * Holds what one read of a ledger's conversation yields: the messages, the lookup readings, the
 * tool groups, the registry with its index, and each message's position.
 *
 * @remarks
 * A `Ledger` builds one scan for a selection or a `recall` call from the conversation's messages and
 * the lookup readings it read for them, and reads these values from the scan in place of reading the
 * conversation and the lookups again, so no public signature names this class. The scan computes
 * every value when it is built, never changes one, and reads no lookup itself.
 */
export class LedgerScan {
	readonly #messages: readonly Message[]
	readonly #readings: readonly LedgerLookupReading[]
	readonly #lookups: ReadonlyMap<string, LedgerLookupReading>
	readonly #groups: ReadonlyMap<string, readonly Message[]>
	readonly #positions: ReadonlyMap<string, number>
	readonly #first: number | undefined
	readonly #registry: LedgerRegistry
	readonly #index: LedgerIndex

	/**
	 * Computes the scan's values from one read of the conversation.
	 *
	 * @param messages - The conversation's messages as the read returned them
	 * @param readings - The lookup readings of those messages, in conversation order
	 * @param requests - The ids of the ledger's request messages
	 * @throws {TypeError} Thrown when a reading's owner list or an owner's name list holds a hole
	 */
	constructor(
		messages: readonly Message[],
		readings: readonly LedgerLookupReading[],
		requests: ReadonlySet<string>,
	) {
		this.#messages = messages
		this.#readings = readings
		this.#lookups = new Map(readings.map((reading) => [reading.id, reading]))
		// Reversed, so a message that two groups held would map to the first, as a search finds it.
		this.#groups = new Map(
			collectToolGroups(messages)
				.toReversed()
				.flatMap((group) => group.map((message) => [message.id, group] as const)),
		)
		this.#positions = new Map(messages.map((message, at) => [message.id, at]))
		const first = messages.findIndex((message) => requests.has(message.id))
		this.#first = first < 0 ? undefined : first
		this.#registry = collectRegistry(readings)
		this.#index = buildLedgerIndex(this.#registry)
	}

	/**
	 * Returns the messages the scan read.
	 *
	 * @returns The conversation's messages in order
	 */
	get messages(): readonly Message[] {
		return this.#messages
	}

	/**
	 * Returns the lookup readings of the scanned messages.
	 *
	 * @returns One reading per successful lookup result, in conversation order
	 */
	get readings(): readonly LedgerLookupReading[] {
		return this.#readings
	}

	/**
	 * Returns the registry the readings name.
	 *
	 * @returns The ids and owner names the readings named
	 */
	get registry(): LedgerRegistry {
		return this.#registry
	}

	/**
	 * Returns the registry's matching index.
	 *
	 * @returns The index built from the scan's registry
	 */
	get index(): LedgerIndex {
		return this.#index
	}

	/**
	 * Returns the position of the first request message.
	 *
	 * @returns The position, or undefined when no scanned message is a request
	 */
	get first(): number | undefined {
		return this.#first
	}

	/**
	 * Reads the lookup reading of a tool message.
	 *
	 * @param id - The tool message's id
	 * @returns The reading, or undefined when the message has no successful lookup reading
	 */
	reading(id: string): LedgerLookupReading | undefined {
		return this.#lookups.get(id)
	}

	/**
	 * Reads the tool group that holds a message.
	 *
	 * @param id - The message's id
	 * @returns The group, or undefined when no tool group holds the message
	 */
	group(id: string): readonly Message[] | undefined {
		return this.#groups.get(id)
	}

	/**
	 * Reads a message's position among the scanned messages.
	 *
	 * @param id - The message's id
	 * @returns The position, or undefined when the scan holds no message with that id
	 */
	position(id: string): number | undefined {
		return this.#positions.get(id)
	}
}
