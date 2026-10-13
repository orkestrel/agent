// Splits a blind c1 packet into one public file per item plus an index of ids and sizes, so each independent
// adjudicator reads only its own items. Usage: node tmp/units/c1-split.ts PACKET OUT_DIR
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

interface Rubric {
	readonly atoms: readonly unknown[]
	readonly critical: readonly unknown[]
	readonly obligations: readonly unknown[]
}

interface Item {
	readonly id: string
	readonly rubric: Rubric
}

function isItem(value: unknown): value is Item {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof Reflect.get(value, 'id') === 'string' &&
		typeof Reflect.get(value, 'rubric') === 'object'
	)
}

const [packetPath, outDir] = process.argv.slice(2)
if (packetPath === undefined || outDir === undefined)
	throw new Error('usage: node c1-split.ts PACKET OUT_DIR')
const packet: unknown = JSON.parse(readFileSync(packetPath, 'utf8'))
const items: unknown = typeof packet === 'object' && packet !== null ? Reflect.get(packet, 'items') : undefined
if (!Array.isArray(items)) throw new Error('the packet carries no items')
mkdirSync(outDir, { recursive: true })
const index: { id: string; bytes: number; atoms: number; critical: number; obligations: number }[] = []
for (const item of items) {
	if (!isItem(item)) throw new Error('an item is malformed')
	const text = `${JSON.stringify(item, null, 2)}\n`
	writeFileSync(join(outDir, `${item.id}.json`), text, { flag: 'wx' })
	index.push({
		id: item.id,
		bytes: Buffer.byteLength(text),
		atoms: item.rubric.atoms.length,
		critical: item.rubric.critical.length,
		obligations: item.rubric.obligations.length,
	})
}
writeFileSync(join(outDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`, { flag: 'wx' })
console.log(
	`${index.length} items under ${outDir}; bytes ${index.reduce((sum, entry) => sum + entry.bytes, 0)}`,
)
