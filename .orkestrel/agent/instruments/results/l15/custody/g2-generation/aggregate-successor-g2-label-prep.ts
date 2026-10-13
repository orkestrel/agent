// Prepare exact alias copies before the closed packet's hash is released.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'

const brief = readFileSync('tmp/units/aggregate-successor-label-c-brief.md', 'utf8')
assert.ok(brief.includes('aggregate-successor-label-c'))
writeFileSync('tmp/units/aggregate-successor-label-d-brief.md', brief.replaceAll('aggregate-successor-label-c', 'aggregate-successor-label-d'))
let source = readFileSync('tmp/units/aggregate-successor-q2-label-release.ts', 'utf8')
for (const [before, after] of [
	['calibration/q2', 'calibration/g2'],
	['aggregate-successor-label-c-packet', 'aggregate-successor-label-d-packet'],
	['aggregate-successor-q2-label-seal', 'aggregate-successor-g2-label-seal'],
]) {
	assert.ok(source.includes(before), before)
	source = source.replaceAll(before, after)
}
writeFileSync('tmp/units/aggregate-successor-g2-label-release.ts', source, { flag: 'wx' })
