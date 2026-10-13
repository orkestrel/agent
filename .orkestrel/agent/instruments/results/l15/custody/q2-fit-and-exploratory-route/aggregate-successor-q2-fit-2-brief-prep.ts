// Preserve the failed caller attempt; correct only its model and fresh output identities.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'

let brief = readFileSync('tmp/units/aggregate-successor-q2-fit-brief.md', 'utf8')
for (const [before, after] of [
	['qwen3.5:2b', 'qwen3.5:2b-q4_K_M'],
	['q2-calibration-fit', 'q2-calibration-fit-2'],
	['calibration/q2/fit', 'calibration/q2/fit-2'],
	['aggregate-successor-q2-fit evidence', 'aggregate-successor-q2-fit-2 evidence'],
	['aggregate-successor-q2-fit-report.md', 'aggregate-successor-q2-fit-2-report.md'],
]) {
	assert.ok(brief.includes(before), before)
	brief = brief.replaceAll(before, after)
}
brief = brief.replace('l15 calibration q2 fit destination', 'l15 calibration q2 fit-2 destination')
brief += '\nRoot correction: the predecessor brief used the wrong model alias. The accepted model-q2-plan.json stage5 and frozen manifest require qwen3.5:2b-q4_K_M. Predecessor fit exited3 in1573ms with only a357-byte caller diagnostic, not a recomputable calibration assessment. Preserve that directory and its failed reader. Execute the same fixed fit inputs under the corrected literal and fresh fit-2/log/report paths. This corrects caller preparation; do not change generation, labels, source, cutoff criteria, or any service. Own only aggregate-successor-q2-fit-2-prefixed temporary evidence/helper/report. Copy the original accepted G4 reader, adapting q2/fit-2 diagnosis path; return exact diff.\n'
writeFileSync('tmp/units/aggregate-successor-q2-fit-brief-2.md', brief)
