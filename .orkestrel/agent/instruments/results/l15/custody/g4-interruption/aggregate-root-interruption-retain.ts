// Preserve the closed interruption evidence and separate recovery receipt; original artifacts remain unchanged.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
assert.equal(resolve(process.cwd()), root)
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim()
assert.equal(head, 'b33dc98e13f589b0196b9f1aad9bd100306926f5')
const destination = '.orkestrel/agent/instruments/results/l15/custody/g4-interruption'
assert.equal(existsSync(destination), false)
const originals = [
	'tmp/units/aggregate-successor-g4-interruption-brief.md',
	'tmp/units/aggregate-successor-g4-interruption-report.md',
	'tmp/units/aggregate-successor-g4-interruption-evidence.json',
	'tmp/units/aggregate-successor-g4-interruption-reader.stdout.txt',
	'tmp/units/aggregate-successor-g4-interruption-reader.stderr.txt',
	'tmp/units/aggregate-successor-g4-interruption-launch.jsonl',
	'tmp/units/aggregate-successor-g4-interruption-launch.err',
	'tmp/units/aggregate-successor-g4-interruption-launch.pid',
	'tmp/units/aggregate-successor-g4-interruption-status-before.txt',
	'tmp/units/aggregate-successor-g4-think0-aggregate-brief.md',
	'tmp/units/aggregate-successor-g4-think0-aggregate-read-2.ts',
	'tmp/units/aggregate-successor-daemon-start.json',
	'tmp/units/aggregate-successor-daemon-deployment.json',
	'tmp/units/aggregate-successor-daemon-recovery-start.json',
	'tmp/units/aggregate-successor-daemon-recovery-launch.ts',
	'tmp/units/aggregate-root-interruption-retain.ts',
]
assert.equal(new Set(originals.map(basename)).size, originals.length)
const observations = originals.map(original => {
	assert.ok(lstatSync(original).isFile(), original)
	const bytes = readFileSync(original)
	return { original, archive: basename(original), bytes, hash: createHash('sha256').update(bytes).digest('hex') }
})
const started = Date.now()
mkdirSync(destination)
writeFileSync(join(destination, '.gitattributes'), '* -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\n', { flag: 'wx' })
for (const entry of observations) {
	assert.ok(readFileSync(entry.original).equals(entry.bytes), entry.original)
	writeFileSync(join(destination, entry.archive), entry.bytes, { flag: 'wx' })
	assert.ok(readFileSync(join(destination, entry.archive)).equals(entry.bytes), entry.archive)
}
const records = observations.map(entry => ({ original: entry.original, archive: entry.archive, bytes: entry.bytes.length, hash: entry.hash }))
const manifest = { head, records, durationMs: Date.now() - started }
writeFileSync(join(destination, 'restoration.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ destination, files: records.length, bytes: records.reduce((sum, entry) => sum + entry.bytes, 0), durationMs: manifest.durationMs, equality: 'all originals and retained bytes match' }))
