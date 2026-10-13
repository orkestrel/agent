// Merges the independent adjudicators' batch label files of one packet into the single root-adjudicated
// labels file the report reads, refusing a duplicate label or a foreign envelope.
// Usage: node tmp/units/c1-merge-labels.ts LABELS_DIR OUT PACKET_HASH KEYS_HASH
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

interface Envelope {
	readonly authority: string
	readonly packet: string
	readonly keys: string
	readonly labels: readonly { readonly id: string }[]
}

function isEnvelope(value: unknown): value is Envelope {
	if (typeof value !== 'object' || value === null) return false
	const labels: unknown = Reflect.get(value, 'labels')
	return (
		typeof Reflect.get(value, 'authority') === 'string' &&
		typeof Reflect.get(value, 'packet') === 'string' &&
		typeof Reflect.get(value, 'keys') === 'string' &&
		Array.isArray(labels) &&
		labels.every(
			(label: unknown) =>
				typeof label === 'object' && label !== null && typeof Reflect.get(label, 'id') === 'string',
		)
	)
}

const [labelsDir, out, packetHash, keysHash] = process.argv.slice(2)
if (labelsDir === undefined || out === undefined || packetHash === undefined || keysHash === undefined)
	throw new Error('usage: node c1-merge-labels.ts LABELS_DIR OUT PACKET_HASH KEYS_HASH')
const labels: { readonly id: string }[] = []
const seen = new Map<string, string>()
const files = readdirSync(labelsDir)
	.filter((name) => name.endsWith('.json'))
	.sort()
for (const name of files) {
	const envelope: unknown = JSON.parse(readFileSync(join(labelsDir, name), 'utf8'))
	if (!isEnvelope(envelope)) throw new Error(`${name}: malformed envelope`)
	if (envelope.authority !== 'root-adjudicated') throw new Error(`${name}: authority differs`)
	if (envelope.packet !== packetHash) throw new Error(`${name}: packet hash differs`)
	if (envelope.keys !== keysHash) throw new Error(`${name}: keys hash differs`)
	for (const label of envelope.labels) {
		const earlier = seen.get(label.id)
		if (earlier !== undefined) throw new Error(`${label.id} labeled twice: ${earlier} and ${name}`)
		seen.set(label.id, name)
		labels.push(label)
	}
}
labels.sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
writeFileSync(
	out,
	`${JSON.stringify({ authority: 'root-adjudicated', packet: packetHash, keys: keysHash, labels }, null, 2)}\n`,
)
console.log(`${labels.length} labels from ${files.length} files written to ${out}`)
