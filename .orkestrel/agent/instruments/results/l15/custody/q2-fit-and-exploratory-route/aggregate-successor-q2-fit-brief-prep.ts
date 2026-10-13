// Reuse the closed offline fit brief with released Qwen2 identities.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'

let brief = readFileSync('tmp/units/aggregate-successor-g4-fit-brief.md', 'utf8')
for (const [before, after] of [
	['Gemma4', 'Qwen2'], ['g4', 'q2'], ['gemma4:e4b-it-q4_K_M', 'qwen3.5:2b'],
	['09d8e5171e2d65dd1a65fd85cc571a13984d03705b4370fc7e63c8c4ae95d819', 'ae937346c5e0abdc1b4543511b171e93ec117f795b90b9fd93af87e67b53f661'],
	['179 labels: 136 supported, 15 contradicted, 28 ambiguous', '168 labels: 113 supported, 11 unsupported, 21 contradicted, 23 ambiguous'],
	['51e53477083dad07e229b951a796b857017f58627310a3e595d844dabfbb53cf', '0fd4b82e90bf22f7abf661c6c13465481c68c8df7a2bf9c6666614196c82e394'],
	['34cacc767afd55db97b611645c3e5e7e5c4ab3a2', '1491e6b2b8913f814d308c3d45ff002e1506abe4'],
	['9fecc71430f9c6af8580bdc7eb43e6ec2b034fa12c45690581af4197ac818f36', '442dfeb697d843e28ab3c8985aabb720d768d9f9646b33a128124a74560b53fd'],
	['Qwen2 generation owns', 'Gemma2 generation owns'],
]) {
	assert.ok(brief.includes(before), before)
	brief = brief.replaceAll(before, after)
}
brief += '\nReuse the completed aggregate-successor-g4-fit-read.ts validator with only model-key/path and identity literals adapted for Qwen2. Preserve its conditional fit-presence check, readRefitAssessment, selectMajorityCutoff, and readRefitCosts. Return the full direct diff. Read no full raw diagnosis into the tool display; emit the existing compact validated summary.\n'
writeFileSync('tmp/units/aggregate-successor-q2-fit-brief.md', brief)
