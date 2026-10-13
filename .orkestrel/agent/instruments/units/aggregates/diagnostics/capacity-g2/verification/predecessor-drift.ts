import { createHash } from 'node:crypto'
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const root = process.cwd()
const basePath = resolve(root, 'tmp/units/aggregate-capacity-g2-control/predecessor-before.json')
const baseline = JSON.parse(readFileSync(basePath, 'utf8')) as unknown
if (!Array.isArray(baseline)) throw new Error('Predecessor baseline is not an array')
const directory = resolve(root, 'tmp/units/aggregate-capacity-probe')
const records = ['daemon.err', 'daemon.log'].map((name) => {
	const expected = baseline.find((entry) => typeof entry === 'object' && entry !== null && 'path' in entry && entry.path === name)
	const path = resolve(directory, name)
	const before = statSync(path)
	const bytes = readFileSync(path)
	const after = statSync(path)
	const actual = { path: name, hash: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.byteLength }
	return { expected, actual, stableDuringRead: before.size === after.size && before.mtimeMs === after.mtimeMs, observedAt: after.mtime.toISOString() }
})
const output = resolve(root, 'tmp/units/aggregate-capacity-g2-verification/predecessor-drift.json')
writeFileSync(output, `${JSON.stringify({ expectedFiles: baseline.length, mismatches: records }, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ output, mismatches: records.map((entry) => ({ path: entry.actual.path, expectedHash: typeof entry.expected === 'object' && entry.expected !== null && 'hash' in entry.expected ? entry.expected.hash : undefined, actualHash: entry.actual.hash, expectedBytes: typeof entry.expected === 'object' && entry.expected !== null && 'bytes' in entry.expected ? entry.expected.bytes : undefined, actualBytes: entry.actual.bytes, stableDuringRead: entry.stableDuringRead })) }))
