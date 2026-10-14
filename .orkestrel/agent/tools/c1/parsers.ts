import type { Options } from './types.ts'
import { resolve } from 'node:path'

/** Parses and validates the bounded driver flags before any filesystem mutation.
 * @param args - The command-line flags
 * @returns The validated options
 * @example parseOptions(['--packet', 'packet.json', '--packet-hash', 'a'.repeat(64), '--keys-hash', 'b'.repeat(64), '--unit', 'audit', '--cap', '900', '--plan'])
 */
export function parseOptions(args: readonly string[]): Options {
	const values = new Map<string, string>()
	let plan = false
	for (let at = 0; at < args.length; at++) {
		const key = args[at]
		if (key === '--plan') { if (plan) throw new Error('duplicate --plan'); plan = true; continue }
		if (key === undefined || !['--packet', '--packet-hash', '--keys-hash', '--unit', '--concurrency', '--limit', '--cap'].includes(key) || values.has(key)) throw new Error('unknown or duplicate flag')
		const value = args[++at]
		if (value === undefined || value.startsWith('--')) throw new Error(`missing ${key}`)
		values.set(key, value)
	}
	const packet = values.get('--packet')
	const hash = values.get('--packet-hash')
	const keys = values.get('--keys-hash')
	const unit = values.get('--unit')
	if (packet === undefined || hash === undefined || keys === undefined || unit === undefined || !/^[a-f0-9]{64}$/.test(hash) || !/^[a-f0-9]{64}$/.test(keys) || !/^[a-z0-9][a-z0-9-]*$/.test(unit)) throw new Error('packet, hashes, and safe unit are required')
	for (const flag of ['--concurrency', '--limit', '--cap']) {
		const value = values.get(flag)
		if (value !== undefined && (!/^[1-9][0-9]*$/.test(value) || !Number.isSafeInteger(Number(value)))) throw new Error(`${flag} must be a positive integer`)
	}
	const cap = values.get('--cap')
	const limit = values.get('--limit')
	if (cap === undefined || (!plan && limit === undefined)) throw new Error('--cap and execution --limit are required')
	return { packet: resolve(packet), hashes: { packet: hash, keys }, unit, concurrency: Number(values.get('--concurrency') ?? 1), limit: limit === undefined ? undefined : Number(limit), cap: Number(cap), plan }
}
