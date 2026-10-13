// Usage: node tmp/units/aggregate-final-q4-diagnostic-retain.ts; exits 0 after exact create-only retention.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const root = 'C:/Users/mikes/WebstormProjects/scaffold'
assert.equal(resolve(process.cwd()).toLowerCase(), resolve(root).toLowerCase())
const archive = '.orkestrel/agent/instruments/units/aggregates/reports/resumption-l14-q4-diagnostic'
const names = readdirSync('tmp/units').filter((name) =>
	name.startsWith('aggregate-final-q4-capacity-diagnostic-') ||
	name.startsWith('aggregate-final-q4-blind-lookup-') ||
	name === basename(import.meta.filename),
)
assert(names.length > 0)
mkdirSync(archive)
const entries = []
for (const name of names) {
	const original = join('tmp/units', name).replaceAll('\\', '/')
	assert(statSync(original).isFile())
	const bytes = readFileSync(original)
	const retained = `${archive}/${name}`
	writeFileSync(retained, bytes, { flag: 'wx' })
	assert.deepEqual(readFileSync(retained), bytes)
	entries.push({ original, retained, bytes: bytes.length, hash: createHash('sha256').update(bytes).digest('hex') })
}
writeFileSync(`${archive}/.gitattributes`, '* -text\n', { flag: 'wx' })
writeFileSync(`${archive}/restoration.json`, `${JSON.stringify({ entries }, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ archive, files: entries.length, bytes: entries.reduce((total, entry) => total + entry.bytes, 0), equal: true }))
