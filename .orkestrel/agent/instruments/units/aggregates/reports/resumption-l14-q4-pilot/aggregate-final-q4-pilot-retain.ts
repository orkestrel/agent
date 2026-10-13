// Retains closed pilot custody and prepared successors before canonical source changes.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { isRecord } from '@orkestrel/contract'

function verifyReferences(value: unknown): number {
	if (Array.isArray(value)) return value.reduce((total: number, entry: unknown) => total + verifyReferences(entry), 0)
	if (!isRecord(value)) return 0
	if (typeof value.path === 'string' && typeof value.hash === 'string') {
		assert.equal(createHash('sha256').update(readFileSync(value.path)).digest('hex'), value.hash, value.path)
		return 1
	}
	return Object.values(value).reduce((total: number, entry: unknown) => total + verifyReferences(entry), 0)
}

const root = 'C:/Users/mikes/WebstormProjects/scaffold'
assert.equal(resolve(process.cwd()).toLowerCase(), resolve(root).toLowerCase())
const custody: unknown = JSON.parse(readFileSync('tmp/units/aggregate-final-q4-pilot-custody.json', 'utf8'))
const manifest: unknown = JSON.parse(readFileSync('.orkestrel/agent/instruments/results/l14/q4-think0/pilot/manifest.json', 'utf8'))
const verified = verifyReferences(custody) + verifyReferences(manifest)
assert(verified > 0)
assert.throws(() => verifyReferences({ path: 'tmp/units/aggregate-final-q4-pilot-custody.json', hash: '0'.repeat(64) }))
const archive = '.orkestrel/agent/instruments/units/aggregates/reports/resumption-l14-q4-pilot'
const names = readdirSync('tmp/units').filter((name) =>
	name.startsWith('aggregate-final-q4-pilot') ||
	name.startsWith('aggregate-successor-preparation-check') ||
	name.startsWith('aggregate-successor-daemon-') ||
	name.startsWith('aggregate-successor-q4-') ||
	name === 'aggregate-final-qualification-repair-2.patch' ||
	name === 'aggregate-final-qualification-repair-report-2.md' ||
	name === 'aggregate-development-blind-packet-export.ts',
).filter((name) => statSync(join('tmp/units', name)).isFile())
const paths = [
	...names.map((name) => `tmp/units/${name}`),
	...readdirSync('.orkestrel/agent/instruments/results/l14/logs')
		.filter((name) => name.startsWith('q4-think0-pilot.'))
		.map((name) => `.orkestrel/agent/instruments/results/l14/logs/${name}`),
	'tmp/units/aggregate-development-blind-packet-l14-b/packet.json',
	'tmp/units/aggregate-development-blind-packet-l14-b/private/joins.json',
]
assert.equal(new Set(paths.map((path) => basename(path))).size, paths.length)
mkdirSync(archive)
const entries = paths.map((original) => {
	const bytes = readFileSync(original)
	const retained = `${archive}/${basename(original)}`
	writeFileSync(retained, bytes, { flag: 'wx' })
	assert.deepEqual(readFileSync(retained), bytes)
	return { original, retained, bytes: bytes.length, hash: createHash('sha256').update(bytes).digest('hex') }
})
writeFileSync(`${archive}/.gitattributes`, '* -text\n', { flag: 'wx' })
writeFileSync(`${archive}/restoration.json`, `${JSON.stringify({ verified, entries }, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ archive, verified, files: entries.length, bytes: entries.reduce((total, entry) => total + entry.bytes, 0), unchanged: true }))
