// Preserve the independent audit while applying the pre-score fragment adjudication.
import type { RefitLabel } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/types.js'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isRefitItem, isRefitLabels } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/validators.js'
import { verifyLabels } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'

function readVerified(path: string, expected: string): Buffer {
	const bytes = readFileSync(path)
	assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, path)
	return bytes
}

const root = resolve(import.meta.dirname, '../..')
assert.equal(resolve(process.cwd()), root)
const directory = join(root, '.orkestrel/agent/instruments/results/l15/calibration/g2')
const corpus = 'e930cdf16315d8bafc3503d1e4a3532ef09aeba0d863fd3f0e0d76914cca3c8c'
const attempts = 'ab7dae4f7a614a412945268f3f5d5f6d8891672b868724d782e0d16090b9bb97'
const packet = '9ae5f8622b50bfd09672c243499fccf01b775451cba03671a33c46755025cb2d'
const manifest = '916567ee5a07a9db92ba7fed2007809801ab03d0c67d0b0369c46fb479d13c66'
readVerified(join(directory, 'corpus/corpus.json'), corpus)
readVerified(join(directory, 'generation/attempts.jsonl'), attempts)
const items = readVerified(join(directory, 'generation/packet.jsonl'), packet).toString('utf8').trim().split(/\r\n|\n/u).map(line => {
	const item: unknown = JSON.parse(line)
	assert.ok(isRefitItem(item))
	return item
})
readVerified(join(directory, 'generation/manifest.json'), manifest)
readVerified(join(root, 'tmp/units/aggregate-successor-label-d-report.md'), '6507a0d6d7399e38fe94d6c8dd79f280188c279cc11a7e7dc62f6bc3078b4029')
readVerified(join(root, 'tmp/units/aggregate-successor-label-d-fragments-report.md'), '775cbcea54d659018bc7867698774b632fb70a43269321c870a192dd226c7862')
const original = readVerified(join(root, 'tmp/units/aggregate-successor-label-d.json'), '5f2c0c2a781a9e3888b07e17ee9a3fd484984be9a0916c37d6514fcb7ce7a923')
const labels: unknown = JSON.parse(original.toString('utf8'))
const initial = { authority: 'root-adjudicated', corpus, attempts, packet, manifest, labels }
assert.ok(isRefitLabels(initial))
verifyLabels(items, initial)
const groups = [...Map.groupBy(items, item => JSON.stringify({ candidate: item.candidate, question: item.question, state: item.state, sources: item.sources })).values()]
assert.equal(groups.length, 45)
const corrections = new Map<string, number>()
for (const index of [4, 9, 14, 20, 27, 29, 37]) {
	const group = groups[index]
	assert.ok(group)
	for (const item of group) corrections.set(item.id, index)
}
assert.equal(corrections.size, 10)
const adjusted: readonly RefitLabel[] = initial.labels.map(label => {
	const group = corrections.get(label.id)
	if (group === undefined) return label
	assert.equal(label.verdict, group === 20 ? 'contradicted' : 'ambiguous')
	assert.equal(label.propositions.at(-1)?.verdict, 'ambiguous')
	const propositions = label.propositions.slice(0, -1)
	assert.ok(propositions.length > 0)
	assert.equal(propositions.every(proposition => proposition.verdict === 'supported'), group !== 20)
	return { ...label, verdict: group === 20 ? 'contradicted' : 'supported', propositions }
})
const result = { ...initial, labels: adjusted }
assert.ok(isRefitLabels(result))
verifyLabels(items, result)
const counts = new Map<string, number>()
for (const label of result.labels) counts.set(label.verdict, (counts.get(label.verdict) ?? 0) + 1)
assert.equal(result.labels.length, 174)
assert.equal(counts.get('supported'), 132)
assert.equal(counts.get('contradicted'), 20)
assert.equal(counts.get('ambiguous'), 22)
assert.equal(counts.get('unsupported') ?? 0, 0)
const output = join(directory, 'labels.json')
const retained = join(directory, 'review-labels.json')
assert.equal(existsSync(output) || existsSync(retained), false)
writeFileSync(retained, original, { flag: 'wx' })
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ output, hash: createHash('sha256').update(readFileSync(output)).digest('hex'), labels: result.labels.length, counts: Object.fromEntries(counts), changed: [...corrections].map(([id, group]) => ({ id, group, verdictChanged: group !== 20 })), propositions: result.labels.reduce((sum, label) => sum + label.propositions.length, 0) }))
