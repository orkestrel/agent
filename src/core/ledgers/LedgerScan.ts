import type { Message } from '../types.js'
import type { LedgerIndex, LedgerLookupFinding, LedgerRegistry } from './types.js'
import { collectToolGroups } from '../helpers.js'
import { buildLedgerIndex, collectRegistry } from './helpers.js'

/**
 * Holds what one read of a ledger's conversation yields: the messages, the lookup findings, the
 * tool groups, the registry with its index, and each message's position.
 *
 * @remarks
 * A `Ledger` builds one scan for a selection or a `recall` call from the conversation's messages and
 * the lookup findings it read for them, and reads these values from the scan in place of reading the
 * conversation and the lookups again, so no public signature names this class. The scan computes
 * every value when it is built, never changes one, and reads no lookup itself.
 */
export class LedgerScan {
	readonly #messages: readonly Message[]
	readonly #findings: readonly LedgerLookupFinding[]
	readonly #lookups: ReadonlyMap<string, LedgerLookupFinding>
	readonly #groups: ReadonlyMap<string, readonly Message[]>
	readonly #positions: ReadonlyMap<string, number>
	readonly #first: number | undefined
	readonly #registry: LedgerRegistry
	readonly #index: LedgerIndex

	/**
	 * Computes the scan's values from one read of the conversation.
	 *
	 * @param messages - The conversation's messages as the read returned them
	 * @param findings - The lookup findings of those messages, in conversation order
	 * @param requests - The ids of the ledger's request messages
	 * @throws {TypeError} Thrown when a finding's owner list or an owner's name list holds a hole
	 */
	constructor(
		messages: readonly Message[],
		findings: readonly LedgerLookupFinding[],
		requests: ReadonlySet<string>,
	) {
		this.#messages = messages
		this.#findings = findings
		this.#lookups = new Map(findings.map((finding) => [finding.id, finding]))
		// Reversed, so a message that two groups held would map to the first, as a search finds it.
		this.#groups = new Map(
			collectToolGroups(messages)
				.toReversed()
				.flatMap((group) => group.map((message) => [message.id, group] as const)),
		)
		this.#positions = new Map(messages.map((message, at) => [message.id, at]))
		const first = messages.findIndex((message) => requests.has(message.id))
		this.#first = first < 0 ? undefined : first
		this.#registry = collectRegistry(findings)
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
	 * Returns the lookup findings of the scanned messages.
	 *
	 * @returns One finding per successful lookup result, in conversation order
	 */
	get findings(): readonly LedgerLookupFinding[] {
		return this.#findings
	}

	/**
	 * Returns the registry the findings name.
	 *
	 * @returns The ids and owner names the findings named
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
	 * Reads the lookup finding of a tool message.
	 *
	 * @param id - The tool message's id
	 * @returns The finding, or undefined when the message has no successful lookup finding
	 */
	finding(id: string): LedgerLookupFinding | undefined {
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
