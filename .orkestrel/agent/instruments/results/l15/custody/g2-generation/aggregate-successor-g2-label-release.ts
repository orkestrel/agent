import assert from 'node:assert/strict'
import { constants, copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { isRefitItem } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/validators.js'

const root = resolve(import.meta.dirname, '../..')
assert.equal(resolve(process.cwd()), root)
const expected = process.argv[2]
assert.ok(typeof expected === 'string' && /^[a-f0-9]{64}$/.test(expected))
const source = '.orkestrel/agent/instruments/results/l15/calibration/g2/generation/packet.jsonl'
const target = 'tmp/units/aggregate-successor-label-d-packet.jsonl'
const receipt = 'tmp/units/aggregate-successor-g2-label-seal.json'
assert.equal(existsSync(target), false)
assert.equal(existsSync(receipt), false)
const original = readFileSync(source)
const hash = createHash('sha256').update(original).digest('hex')
assert.equal(hash, expected, 'packet differs from the closed generation report')
const ids = new Set<string>()
for (const line of original.toString('utf8').trim().split(/\r?\n/u)) {
	const item: unknown = JSON.parse(line)
	assert.ok(isRefitItem(item), 'packet structure must satisfy the emitted validator')
	assert.equal(ids.has(item.id), false)
	ids.add(item.id)
}
assert.ok(ids.size > 0)
copyFileSync(source, target, constants.COPYFILE_EXCL)
assert.ok(readFileSync(target).equals(original))
writeFileSync(receipt, `${JSON.stringify({ source, target, sha256: hash, bytes: original.length, items: ids.size }, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ target, sha256: hash, bytes: original.length, items: ids.size }))
