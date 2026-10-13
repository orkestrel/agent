import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { isRefitGeneration } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/validators.js'
import { hashFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'
import { readBuild } from '../../.orkestrel/agent/instruments/harness/.build/bench5/build/helpers.js'
import { readFrozen } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'

const root = resolve(import.meta.dirname, '../..')
assert.equal(resolve(process.cwd()), root)
const results = '.orkestrel/agent/instruments/results/l15'
const archive = `${results}/custody/q4-generation`
assert.equal(existsSync(archive), false)
readBuild()
for (const [cell, hash] of [
	['q4-think0', '95da49bbb6f4811f2bcad63e87ace42c380ba15ceb5ee42c0bd113b509ac72a9'],
	['q4-think1', '8c9f816203eb24a8ab3c9d87e94e3da5d841200d1737691fbb91c3596bac0b07'],
]) {
	const file = hashFile(`${results}/${cell}/freeze/manifest.json`)
	assert.equal(file.hash, hash)
	readFrozen(file)
}
const manifest = hashFile(`${results}/calibration/q4/generation/manifest.json`)
assert.equal(manifest.hash, '20831a3b2b99b6c95e3296d37b85dd5fc103fd9aaf2a6f92190d4cdc3ec1abc6')
const generation: unknown = JSON.parse(readFileSync(manifest.path, 'utf8'))
assert.ok(isRefitGeneration(generation))
assert.equal(generation.complete, true)
assert.deepEqual(generation.errors, [])
const before = readFileSync('tmp/units/aggregate-successor-q4-execution-custody-before.json')
assert.ok(before.equals(readFileSync('tmp/units/aggregate-successor-q4-execution-custody-after.json')))
const paths = readdirSync('tmp/units', { withFileTypes: true })
	.filter((entry) => entry.isFile() && (entry.name.startsWith('aggregate-successor-q4-execution-') || entry.name.startsWith('aggregate-successor-q4-driver-')))
	.map((entry) => join('tmp/units', entry.name))
paths.push(
	'tmp/units/aggregate-successor-q4-command-plan.json',
	'tmp/units/aggregate-successor-q4-continuation-report.md',
	'tmp/units/aggregate-successor-q4-label-release.ts',
	'tmp/units/aggregate-successor-q4-label-seal.json',
	'tmp/units/aggregate-successor-q4-generation-retain.ts',
)
assert.equal(new Set(paths.map((path) => basename(path))).size, paths.length)
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
writeFileSync(`${results}/.gitattributes`, '* -text\n', { flag: 'wx' })
console.log(JSON.stringify({ archive, originals: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0), generation: 'complete, no errors', custody: 'equal', frozen: 'both validated through emitted reader' }))
