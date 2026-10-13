// Bind the accepted audit readers to the sealed packet and judgments without altering their predicates.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

assert.equal(resolve(process.cwd()), resolve(import.meta.dirname, '../..'))
const packet = '6d10d40bc303dc09c4db2d643fbc913cafe647899e070703a7856db9a7641745'
const judgments = '83c4dea97eaffd9a9dac1a5b9377f516f543f03f7b1abef54453270ddc79eeb2'
assert.equal(createHash('sha256').update(readFileSync('tmp/units/aggregate-development-blind-packet-successor-a/packet.json')).digest('hex'), packet)
assert.equal(createHash('sha256').update(readFileSync('tmp/units/aggregate-successor-quality-a-judgments.json')).digest('hex'), judgments)
for (const item of [
	{ name: 'join', hash: '303c71ff33dbc3f86331ff70800adfc2e4e52147dd03f3170e8ffac9d52ff452' },
	{ name: 'boundary', hash: '54583cc92d39b58903ad576557b088fd9a5c1ecd5c8172216aeb00aa4dcd4f60' },
]) {
	const source = `tmp/units/aggregate-successor-quality-a-${item.name}.ts`
	const target = `tmp/units/aggregate-successor-quality-a-${item.name}-sealed.ts`
	const bytes = readFileSync(source)
	assert.equal(createHash('sha256').update(bytes).digest('hex'), item.hash)
	const text = bytes.toString('utf8')
	assert.equal(text.split('UNRELEASED_PACKET_SHA256').length, 2)
	assert.equal(text.split('UNRELEASED_JUDGMENTS_SHA256').length, 2)
	const sealed = text.replace('UNRELEASED_PACKET_SHA256', packet).replace('UNRELEASED_JUDGMENTS_SHA256', judgments)
	writeFileSync(target, sealed, { flag: 'wx' })
	console.log(JSON.stringify({ source, target, packet, judgments, sha256: createHash('sha256').update(readFileSync(target)).digest('hex') }))
}
