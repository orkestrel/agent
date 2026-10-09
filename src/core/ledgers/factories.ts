import type { ProviderInterface } from '../providers/types.js'
import type { LedgerInterface, LedgerOptions } from './types.js'
import { Ledger } from './Ledger.js'

/**
 * Creates a conversation ledger after checking its thresholds, allocation, and tool names.
 * @param provider - The provider that answers requests
 * @param options - The judge, projection policy, capacity, and agent bounds
 * @returns The ledger and its owned conversation and agent
 * @throws {LedgerError} Thrown when an option lies outside its documented bounds
 * @example
 * ```ts
 * const ledger = createLedger(provider, options)
 * const reply = await ledger.respond('Check the order.')
 * ```
 */
export function createLedger(provider: ProviderInterface, options: LedgerOptions): LedgerInterface {
	return new Ledger(provider, options)
}
