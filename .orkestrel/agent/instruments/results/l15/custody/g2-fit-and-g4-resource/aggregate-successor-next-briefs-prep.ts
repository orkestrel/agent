import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const labels = createHash('sha256').update(readFileSync('tmp/units/aggregate-successor-label-d.json')).digest('hex')
const report = createHash('sha256').update(readFileSync('tmp/units/aggregate-successor-label-d-report.md')).digest('hex')
assert.equal(labels, '5f2c0c2a781a9e3888b07e17ee9a3fd484984be9a0916c37d6514fcb7ce7a923')
let checker = readFileSync('tmp/units/aggregate-successor-label-c-verifier-brief.md', 'utf8')
for (const [before, after] of [
	['alias-c', 'alias-d'], ['label-c', 'label-d'],
	['a67c510650eaa2ffae29fe5c461fcf56d4cd91e9e3376a3ac4b5fba2b3c14999', '9ae5f8622b50bfd09672c243499fccf01b775451cba03671a33c46755025cb2d'],
	['2719417', '3208183'], ['168', '174'],
	['0fd4b82e90bf22f7abf661c6c13465481c68c8df7a2bf9c6666614196c82e394', labels],
	['67195a66780cf92488fc2159efa141aecee59932263ed900e2769243c9732168', report],
	['Gemma2 generation is live', 'Gemma4 records resource is live'],
	['Expected reported proposition census is 423; independently measure it.', 'Independently measure the proposition census; the analyst reports 870 literal evidence quotations.'],
]) {
	assert.ok(checker.includes(before), before)
	checker = checker.replaceAll(before, after)
}
writeFileSync('tmp/units/aggregate-successor-label-d-verifier-brief.md', checker)
let preparation = readFileSync('tmp/units/aggregate-successor-g4-exploratory-preparation-brief.md', 'utf8')
for (const [before, after] of [
	['g4-exploratory', 'q2-exploratory'], ['Gemma4', 'Qwen2'], ['G4', 'Q2'], ['g4-think', 'q2-think'], ['0.61', '0.68'],
	['Gemma2 generation is live', 'Gemma4 records resource is live'],
	['active Qwen2 fit', 'closed Qwen2 fit-2 evidence'],
	['Only aggregate-successor-q2-exploratory-prepare.ts and -preparation-report.md', 'Only aggregate-successor-q2-exploratory-prepare.ts, -prepare.diff, and -preparation-report.md'],
]) {
	assert.ok(preparation.includes(before), before)
	preparation = preparation.replaceAll(before, after)
}
preparation += '\nCopy the root-accepted tmp/units/aggregate-successor-g4-exploratory-prepare.ts. Change only literal model/cell paths, output identities, cutoff0.68, and exact Qwen2 input seals. Use calibration/q2/fit-2/diagnosis.json; the unsuffixed fit directory is the preserved caller failure and cannot supply a policy. Bind q2-think0 as calibration freeze and each selected q2 decision freeze separately. Obtain the exact accepted Qwen2 seals from tmp/units/aggregate-successor-q2-fit-2-report.md, its compact validation JSON, and closed model-q2-generation-report.md; read/hash named artifacts without raw semantic analysis. Return a literal data-only diff proving every predicate unchanged. Preserve withhold:true, CHANGE0.56, create-only writes, existing helpers, and no runtime execution.\n'
writeFileSync('tmp/units/aggregate-successor-q2-exploratory-preparation-brief.md', preparation)
console.log(JSON.stringify({ labels, report, briefs: ['aggregate-successor-label-d-verifier', 'aggregate-successor-q2-exploratory-preparation'] }))
