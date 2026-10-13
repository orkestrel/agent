// Adapt the accepted create-only wrapper to the closed Qwen2 generation and unchanged labels.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'

let source = readFileSync('tmp/units/aggregate-successor-g4-labels.ts', 'utf8')
for (const [before, after] of [
	['calibration/g4', 'calibration/q2'],
	['918b239b97d41d98e7c18d9ab2d0ef4060011eb50c1fc8ccb34d391ed34d3aa6', '5c18e8b99cf2bc156b8ac274798eff60b70e1f7873f7b35b87c866ef9d589b67'],
	['a47701990322dce8ea572b41be2454feed000e691bf79b60c2e8947c27191591', 'f4c2077126abaf6cfff9d442c951becfd266598926e2773f5c8e19b28b207cb9'],
	['64b0f89566458745c8099e9351db3b44686102145721ef9395bbd8e06e9d57f5', 'a67c510650eaa2ffae29fe5c461fcf56d4cd91e9e3376a3ac4b5fba2b3c14999'],
	['b9c622ed08613260e489f87a8539b8d7c177ece7a20e5fe0ea8108799fc74d26', '10e654ee24fe25b7a32af7e8f6610467154a8c1c5cc65dcbeeb2c6335e722d23'],
	['aggregate-successor-label-b.json', 'aggregate-successor-label-c.json'],
	['51e53477083dad07e229b951a796b857017f58627310a3e595d844dabfbb53cf', '0fd4b82e90bf22f7abf661c6c13465481c68c8df7a2bf9c6666614196c82e394'],
	["result.labels.length !== 179 || counts.get('supported') !== 136 || counts.get('contradicted') !== 15 || counts.get('ambiguous') !== 28", "result.labels.length !== 168 || counts.get('supported') !== 113 || counts.get('unsupported') !== 11 || counts.get('contradicted') !== 21 || counts.get('ambiguous') !== 23"],
]) {
	assert.ok(source.includes(before), before)
	source = source.replaceAll(before, after)
}
writeFileSync('tmp/units/aggregate-successor-q2-labels.ts', source, { flag: 'wx' })
