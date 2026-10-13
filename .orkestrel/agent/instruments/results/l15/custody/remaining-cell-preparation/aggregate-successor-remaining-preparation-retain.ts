// Retain accepted preparation artifacts without copying any active measurement or bench journal.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
assert.equal(resolve(process.cwd()), root)
const archive = '.orkestrel/agent/instruments/results/l15/custody/remaining-cell-preparation'
assert.equal(existsSync(archive), false)
for (const name of ['aggregate-successor-remaining-cells-report.md']) assert.ok(existsSync(join('tmp/units', name)), name)
for (const name of ['aggregate-successor-cell-q4-think1-live.jsonl', 'aggregate-successor-model-g4-execution-root.jsonl']) assert.equal(existsSync(join('tmp/units', name)), false, name)
const prefixes = ['aggregate-successor-remaining-cell']
const paths = readdirSync('tmp/units', { withFileTypes: true })
	.filter(entry => entry.isFile() && prefixes.some(prefix => entry.name.startsWith(prefix)))
	.map(entry => join('tmp/units', entry.name))
paths.push('tmp/units/aggregate-successor-remaining-preparation-retain.ts')
assert.equal(new Set(paths.map(path => basename(path))).size, paths.length)
mkdirSync(archive, { recursive: true })
const files = []
for (const path of paths) {
	const bytes = readFileSync(path)
	const destination = basename(path)
	copyFileSync(path, join(archive, destination), constants.COPYFILE_EXCL)
	assert.ok(bytes.equals(readFileSync(join(archive, destination))))
	files.push({ original: path, archive: destination, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
}
writeFileSync(join(archive, 'restoration.json'), `${JSON.stringify({ files }, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ archive, originals: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0), copies: 'byte-identical' }))
