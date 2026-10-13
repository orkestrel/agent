// Create the root-adjudicated wrapper once; preserve the independent label bytes.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isRefitItem, isRefitLabels } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/validators.js'
import { verifyLabels } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'

function readVerified(path: string, expected: string): Buffer {
	const bytes = readFileSync(path)
	if (createHash('sha256').update(bytes).digest('hex') !== expected) throw new Error(`Identity changed: ${path}`)
	return bytes
}

const root = resolve(import.meta.dirname, '../..')
const directory = join(root, '.orkestrel/agent/instruments/results/l15/calibration/q4')
const corpus = 'b5cff7c57af533b979c47330db0e43b04026773af198fe433f5c31b52599f121'
const attempts = '65bf5ad5cb0ac8082257e97c2682057a64e21b9f978748bb05b457d156eac3a0'
const packet = '0e3eaecbf38d7dad2450fb2748db860aeb8117679f06f8a7bf27ea93ad5f9541'
const manifest = '20831a3b2b99b6c95e3296d37b85dd5fc103fd9aaf2a6f92190d4cdc3ec1abc6'
readVerified(join(directory, 'corpus/corpus.json'), corpus)
readVerified(join(directory, 'generation/attempts.jsonl'), attempts)
const items = readVerified(join(directory, 'generation/packet.jsonl'), packet).toString('utf8').trim().split('\n').map(line => {
	const item: unknown = JSON.parse(line)
	if (!isRefitItem(item)) throw new Error('Invalid packet item')
	return item
})
readVerified(join(directory, 'generation/manifest.json'), manifest)
const original = readVerified(join(root, 'tmp/units/aggregate-successor-label-a.json'), '532865b974936adafddbba040b38a54224b08ba6060c5c4cad5ce652d488adae')
const labels: unknown = JSON.parse(original.toString('utf8'))
const result = { authority: 'root-adjudicated', corpus, attempts, packet, manifest, labels }
if (!isRefitLabels(result)) throw new Error('Invalid adjudicated wrapper')
verifyLabels(items, result)
const counts = new Map<string, number>()
for (const label of result.labels) counts.set(label.verdict, (counts.get(label.verdict) ?? 0) + 1)
if (result.labels.length !== 171 || counts.get('supported') !== 154 || counts.get('contradicted') !== 8 || counts.get('ambiguous') !== 9) throw new Error('Unexpected adjudication counts')
const output = join(directory, 'labels.json')
const retained = join(directory, 'review-labels.json')
if (existsSync(output) || existsSync(retained)) throw new Error('Label output already exists')
writeFileSync(retained, original, { flag: 'wx' })
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ output, hash: createHash('sha256').update(readFileSync(output)).digest('hex'), labels: result.labels.length, counts: Object.fromEntries(counts), changed: [] }))
