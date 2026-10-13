// Run only after root accepts the closed labels, offline fit, and resource reports.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
assert.equal(resolve(process.cwd()), root)
const archive = '.orkestrel/agent/instruments/results/l15/custody/q4-calibration-resource'
assert.equal(existsSync(archive), false)
for (const name of ['aggregate-successor-q4-fit-report.md', 'aggregate-successor-q4-resource-report.md', 'aggregate-successor-label-a-verifier-report.md']) assert.ok(existsSync(join('tmp/units', name)), name)
const prefixes = ['aggregate-successor-label-a-', 'aggregate-successor-q4-fit-', 'aggregate-successor-q4-resource-']
const paths = readdirSync('tmp/units', { withFileTypes: true })
	.filter(entry => entry.isFile() && prefixes.some(prefix => entry.name.startsWith(prefix)))
	.map(entry => join('tmp/units', entry.name))
paths.push('tmp/units/aggregate-successor-label-a.json', 'tmp/units/aggregate-successor-q4-labels.ts', 'tmp/units/aggregate-successor-q4-adjudication.md', 'tmp/units/aggregate-successor-q4-calibration-retain.ts')
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
