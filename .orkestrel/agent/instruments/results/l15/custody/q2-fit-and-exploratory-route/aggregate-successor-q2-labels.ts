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
const directory = join(root, '.orkestrel/agent/instruments/results/l15/calibration/q2')
const corpus = '5c18e8b99cf2bc156b8ac274798eff60b70e1f7873f7b35b87c866ef9d589b67'
const attempts = 'f4c2077126abaf6cfff9d442c951becfd266598926e2773f5c8e19b28b207cb9'
const packet = 'a67c510650eaa2ffae29fe5c461fcf56d4cd91e9e3376a3ac4b5fba2b3c14999'
const manifest = '10e654ee24fe25b7a32af7e8f6610467154a8c1c5cc65dcbeeb2c6335e722d23'
readVerified(join(directory, 'corpus/corpus.json'), corpus)
readVerified(join(directory, 'generation/attempts.jsonl'), attempts)
const items = readVerified(join(directory, 'generation/packet.jsonl'), packet).toString('utf8').trim().split('\n').map(line => {
	const item: unknown = JSON.parse(line)
	if (!isRefitItem(item)) throw new Error('Invalid packet item')
	return item
})
readVerified(join(directory, 'generation/manifest.json'), manifest)
const original = readVerified(join(root, 'tmp/units/aggregate-successor-label-c.json'), '0fd4b82e90bf22f7abf661c6c13465481c68c8df7a2bf9c6666614196c82e394')
const labels: unknown = JSON.parse(original.toString('utf8'))
const result = { authority: 'root-adjudicated', corpus, attempts, packet, manifest, labels }
if (!isRefitLabels(result)) throw new Error('Invalid adjudicated wrapper')
verifyLabels(items, result)
const counts = new Map<string, number>()
for (const label of result.labels) counts.set(label.verdict, (counts.get(label.verdict) ?? 0) + 1)
if (result.labels.length !== 168 || counts.get('supported') !== 113 || counts.get('unsupported') !== 11 || counts.get('contradicted') !== 21 || counts.get('ambiguous') !== 23) throw new Error('Unexpected adjudication counts')
const output = join(directory, 'labels.json')
const retained = join(directory, 'review-labels.json')
if (existsSync(output) || existsSync(retained)) throw new Error('Label output already exists')
writeFileSync(retained, original, { flag: 'wx' })
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ output, hash: createHash('sha256').update(readFileSync(output)).digest('hex'), labels: result.labels.length, counts: Object.fromEntries(counts), changed: [] }))
