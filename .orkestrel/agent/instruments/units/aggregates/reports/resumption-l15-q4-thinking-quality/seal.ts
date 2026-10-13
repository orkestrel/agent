// Bind the accepted audit readers to the sealed packet and judgments without altering their predicates.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

assert.equal(resolve(process.cwd()), resolve(import.meta.dirname, '../..'))
const packet = 'a61415997d2810b90d07626d753eb48ec3ab12ea331bd19cc66b13ae1bdb6df4'
const judgments = '9405d9bd6ae081c59d69e8de8936456004e10372bf93d0563faf090723b15fcd'
assert.equal(createHash('sha256').update(readFileSync('tmp/units/aggregate-development-blind-packet-successor-b/packet.json')).digest('hex'), packet)
assert.equal(createHash('sha256').update(readFileSync('tmp/units/aggregate-successor-quality-b-judgments.json')).digest('hex'), judgments)
for (const item of [
	{ name: 'join', hash: 'bd5b8103c7af57475e4dfbe8531bc99e9edfbb3edfa3fbb9a89e0c8faebca19f' },
	{ name: 'boundary', hash: '98ef967bada3beab4c2376cd32fb2ef31818750df4317160cc140cea613b4c54' },
]) {
	const source = `tmp/units/aggregate-successor-quality-b-${item.name}.ts`
	const target = `tmp/units/aggregate-successor-quality-b-${item.name}-sealed.ts`
	const bytes = readFileSync(source)
	assert.equal(createHash('sha256').update(bytes).digest('hex'), item.hash)
	const text = bytes.toString('utf8')
	assert.equal(text.split('UNRELEASED_PACKET_SHA256').length, 2)
	assert.equal(text.split('UNRELEASED_JUDGMENTS_SHA256').length, 2)
	const sealed = text.replace('UNRELEASED_PACKET_SHA256', packet).replace('UNRELEASED_JUDGMENTS_SHA256', judgments)
	writeFileSync(target, sealed, { flag: 'wx' })
	console.log(JSON.stringify({ source, target, packet, judgments, sha256: createHash('sha256').update(readFileSync(target)).digest('hex') }))
}
