// Captures exact successor diffs and file seals without invoking any operator runtime.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const PREFIX = 'tmp/units/aggregate-successor-exploratory-paths'
const DIRECTORY = 'C:/Users/mikes/WebstormProjects/scaffold'
if (resolve(process.cwd()) !== resolve(DIRECTORY)) throw new Error('Explicit scaffold cwd required')
const pairs = [
	{ original: 'tmp/units/aggregate-successor-g4-exploratory-prepare.ts', successor: 'tmp/units/aggregate-successor-g4-exploratory-prepare-2.ts', suffix: 'g4', expected: 'a5ee0d1e2e382f7002919cc10a268432b50d887023c27175fdd9c2fdc9a75e73' },
	{ original: 'tmp/units/aggregate-successor-q2-exploratory-prepare.ts', successor: 'tmp/units/aggregate-successor-q2-exploratory-prepare-2.ts', suffix: 'q2', expected: 'b33662c6020f67feb528b8e73269435a88474ae8e20456e296ef4a04d69999c9' },
	{ original: 'tmp/units/aggregate-successor-g4-think0-aggregate-read.ts', successor: 'tmp/units/aggregate-successor-g4-think0-aggregate-read-2.ts', suffix: 'aggregate-reader', expected: 'b95842b89a48c520b1c0240cced86712f776879f7265d5a5509e2477120ba358' },
]
const diffs = []
for (const pair of pairs) {
	const original = readFileSync(pair.original)
	if (createHash('sha256').update(original).digest('hex') !== pair.expected) throw new Error(`Original changed: ${pair.original}`)
	const arguments_ = ['diff', '--no-index', '--no-ext-diff', '--', pair.original, pair.successor]
	const result = spawnSync('git', arguments_, { cwd: DIRECTORY, encoding: 'utf8', shell: false, windowsHide: true, maxBuffer: 1024 * 1024 })
	if (result.error !== undefined || result.status !== 1) throw new Error(`No-index diff failed: ${result.error?.message ?? result.stderr}`)
	const path = `${PREFIX}-${pair.suffix}.diff`
	writeFileSync(path, result.stdout, { flag: 'wx' })
	diffs.push({ path, command: `git ${arguments_.join(' ')}`, exit: result.status, stderr: result.stderr, bytes: Buffer.byteLength(result.stdout), sha256: createHash('sha256').update(result.stdout).digest('hex') })
	if (!readFileSync(pair.original).equals(original)) throw new Error(`Original changed during diff: ${pair.original}`)
}
const paths = [...pairs.flatMap(pair => [pair.original, pair.successor]), `${PREFIX}-read.ts`, `${PREFIX}-read.stdout.jsonl`, `${PREFIX}-read.stderr.txt`, '.orkestrel/agent/instruments/results/l15/g4-think0/exploration/policy.json']
const files = paths.map(path => {
	const bytes = readFileSync(path)
	return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
})
const policy = files.at(-1)
if (policy?.sha256 !== 'b1a8bcfcee87dcb1dbf1ffcaed5ac6bd5a5ced95a30cc0b39ad6799633cae511') throw new Error('Original failed policy changed')
const absent = ['.orkestrel/agent/instruments/results/l15/g4-think0/exploration-2', '.orkestrel/agent/instruments/results/l15/g4-think1/exploration-2', '.orkestrel/agent/instruments/results/l15/q2-think0/exploration', '.orkestrel/agent/instruments/results/l15/q2-think1/exploration']
for (const path of absent) if (existsSync(path)) throw new Error(`Prospective directory occupied: ${path}`)
const result = { diffs, files, absent }
writeFileSync(`${PREFIX}-capture.json`, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
