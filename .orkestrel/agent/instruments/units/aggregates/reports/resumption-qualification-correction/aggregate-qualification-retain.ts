// Run after the verifier returns; retain closed evidence before the accepted source commit.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { constants, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { readBuild } from '../../.orkestrel/agent/instruments/harness/.build/bench5/build/helpers.js'

const root = resolve(import.meta.dirname, '../..')
assert.equal(resolve(process.cwd()), root)
const report = process.argv[2]
assert.ok(report?.startsWith('tmp/units/aggregate-qualification-verifier-') && report.endsWith('-report.md'))
assert.ok(existsSync(report))
const archive = '.orkestrel/agent/instruments/units/aggregates/reports/resumption-qualification-correction'
assert.equal(existsSync(archive), false, 'create-only evidence archive')
const build = readBuild()
const names = readdirSync('tmp/units', { withFileTypes: true })
	.filter((entry) => entry.isFile() && (entry.name.startsWith('aggregate-qualification-verifier-') || entry.name.startsWith('aggregate-qualification-review-') || entry.name === 'aggregate-qualification-review.diff'))
	.map((entry) => join('tmp/units', entry.name))
const fixed = [
	'tmp/units/aggregate-final-qualification-repair-2.patch',
	'tmp/units/aggregate-final-qualification-repair-report-2.md',
	'tmp/units/aggregate-final-qualification-repair-4.patch',
	'tmp/units/aggregate-final-qualification-repair-4-report.md',
	'tmp/units/aggregate-final-qualification-repair-4-hashes.json',
	'tmp/units/aggregate-successor-service-validate.ts',
	'tmp/units/aggregate-successor-service-validation.json',
	'tmp/units/aggregate-successor-service-version.json',
	'tmp/units/aggregate-successor-service-tags.json',
	'tmp/units/aggregate-successor-service-ps.json',
	'tmp/units/aggregate-successor-daemon-start.json',
	'tmp/units/aggregate-successor-daemon-deployment.json',
	'tmp/units/aggregate-successor-q4-command-plan.json',
	'tmp/units/aggregate-qualification-retain.ts',
	'.orkestrel/agent/instruments/harness/.build/build-manifest.json',
]
const paths = [...names, ...fixed]
assert.equal(new Set(paths.map((path) => basename(path))).size, paths.length)
const mappings = paths.map((path) => {
	assert.ok(lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(), path)
	const bytes = readFileSync(path)
	return { original: path, archive: basename(path), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
})
mkdirSync(archive)
for (const mapping of mappings) {
	const target = join(archive, mapping.archive)
	copyFileSync(mapping.original, target, constants.COPYFILE_EXCL)
	const original = readFileSync(mapping.original)
	const copied = readFileSync(target)
	assert.ok(original.equals(copied), mapping.original)
	assert.equal(createHash('sha256').update(copied).digest('hex'), mapping.sha256)
}
const custody = { files: mappings, build: { sources: build.sources.length, resources: build.resources.length, compiler: build.compiler.inputs.length, outputs: build.outputs.length } }
writeFileSync(join(archive, 'restoration.json'), `${JSON.stringify(custody, null, 2)}\n`, { flag: 'wx' })
writeFileSync(join(archive, '.gitattributes'), '* -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\n', { flag: 'wx' })
console.log(JSON.stringify({ archive, originals: mappings.length, bytes: mappings.reduce((sum, entry) => sum + entry.bytes, 0), build: custody.build }))
