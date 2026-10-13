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
const directory = join(root, '.orkestrel/agent/instruments/results/l15/calibration/g4')
const corpus = '918b239b97d41d98e7c18d9ab2d0ef4060011eb50c1fc8ccb34d391ed34d3aa6'
const attempts = 'a47701990322dce8ea572b41be2454feed000e691bf79b60c2e8947c27191591'
const packet = '64b0f89566458745c8099e9351db3b44686102145721ef9395bbd8e06e9d57f5'
const manifest = 'b9c622ed08613260e489f87a8539b8d7c177ece7a20e5fe0ea8108799fc74d26'
readVerified(join(directory, 'corpus/corpus.json'), corpus)
readVerified(join(directory, 'generation/attempts.jsonl'), attempts)
const items = readVerified(join(directory, 'generation/packet.jsonl'), packet).toString('utf8').trim().split('\n').map(line => {
	const item: unknown = JSON.parse(line)
	if (!isRefitItem(item)) throw new Error('Invalid packet item')
	return item
})
readVerified(join(directory, 'generation/manifest.json'), manifest)
const original = readVerified(join(root, 'tmp/units/aggregate-successor-label-b.json'), '51e53477083dad07e229b951a796b857017f58627310a3e595d844dabfbb53cf')
const labels: unknown = JSON.parse(original.toString('utf8'))
const result = { authority: 'root-adjudicated', corpus, attempts, packet, manifest, labels }
if (!isRefitLabels(result)) throw new Error('Invalid adjudicated wrapper')
verifyLabels(items, result)
const counts = new Map<string, number>()
for (const label of result.labels) counts.set(label.verdict, (counts.get(label.verdict) ?? 0) + 1)
if (result.labels.length !== 179 || counts.get('supported') !== 136 || counts.get('contradicted') !== 15 || counts.get('ambiguous') !== 28) throw new Error('Unexpected adjudication counts')
const output = join(directory, 'labels.json')
const retained = join(directory, 'review-labels.json')
if (existsSync(output) || existsSync(retained)) throw new Error('Label output already exists')
writeFileSync(retained, original, { flag: 'wx' })
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ output, hash: createHash('sha256').update(readFileSync(output)).digest('hex'), labels: result.labels.length, counts: Object.fromEntries(counts), changed: [] }))
