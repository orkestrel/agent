import { strict as assert } from 'node:assert'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const replacements = new Map([
	['aggregate-development-blind-packet-l13-combined', 'aggregate-development-blind-packet-l14-a'],
	['aggregate-l13-blind-quality-judgments', 'aggregate-final-blind-a-judgments'],
	['01f28cdafe52cb531a7fa9aa063e7dded9f2155c8756bfe40ef7de5384fb6b2e', 'c07aa6696eba4d7ff551c0c66f27057e8491704a85095e244ee7be9c0d7ba190'],
	['92313a8faf324e4b263bce2fcef7d0bfedda00848e3628e4edc7242dfe570fef', 'df1a3315a1ff8bf5fae6a793b0ca63427cef494528fd1f2604297953ce5cdf32'],
	['l13', 'l14-a'],
	['L13', 'L14 alias a'],
])
for (const suffix of ['boundary-check', 'join']) {
	const original = `tmp/units/aggregate-l13-quality-${suffix}.ts`
	const target = `tmp/units/aggregate-l14-a-quality-${suffix}.ts`
	assert(!existsSync(target))
	let content = readFileSync(original, 'utf8')
	for (const [before, after] of replacements) {
		assert(content.includes(before), `Missing expected binding ${before} in ${original}`)
		content = content.replaceAll(before, after)
	}
	writeFileSync(target, content, { flag: 'wx' })
	console.log(JSON.stringify({ original, target, hash: createHash('sha256').update(content).digest('hex') }))
}
