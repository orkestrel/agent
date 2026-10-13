// Reuse closed support-check and adjudication readers with released input identities.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'

let brief = readFileSync('tmp/units/aggregate-successor-label-b-verifier-brief.md', 'utf8')
for (const [before, after] of [
	['aggregate-successor-label-b', 'aggregate-successor-label-c'], ['alias-b', 'alias-c'],
	['64b0f89566458745c8099e9351db3b44686102145721ef9395bbd8e06e9d57f5', 'a67c510650eaa2ffae29fe5c461fcf56d4cd91e9e3376a3ac4b5fba2b3c14999'],
	['3263411', '2719417'], ['179', '168'],
	['51e53477083dad07e229b951a796b857017f58627310a3e595d844dabfbb53cf', '0fd4b82e90bf22f7abf661c6c13465481c68c8df7a2bf9c6666614196c82e394'],
	['59736ce8a0d487377b8b3f0fdb86a56403d608a4ee3a1a7cf2db5183644f5635', '67195a66780cf92488fc2159efa141aecee59932263ed900e2769243c9732168'],
	['581', '423'], ['Qwen2 generation', 'Gemma2 generation'],
]) {
	assert.ok(brief.includes(before), before)
	brief = brief.replaceAll(before, after)
}
brief += '\nUse the dispatch TypeScript launcher for capture, with a 60-second cap. Never use inline PowerShell ProcessStartInfo or another shell-program wrapper. Keep every source, build, HEAD, and service fixed.\n'
writeFileSync('tmp/units/aggregate-successor-label-c-verifier-brief.md', brief)
let reader = readFileSync('tmp/units/aggregate-successor-g4-adjudication-read.ts', 'utf8')
for (const [before, after] of [
	['aggregate-successor-label-b', 'aggregate-successor-label-c'],
	['64b0f89566458745c8099e9351db3b44686102145721ef9395bbd8e06e9d57f5', 'a67c510650eaa2ffae29fe5c461fcf56d4cd91e9e3376a3ac4b5fba2b3c14999'],
	['51e53477083dad07e229b951a796b857017f58627310a3e595d844dabfbb53cf', '0fd4b82e90bf22f7abf661c6c13465481c68c8df7a2bf9c6666614196c82e394'],
]) {
	assert.ok(reader.includes(before), before)
	reader = reader.replaceAll(before, after)
}
writeFileSync('tmp/units/aggregate-successor-q2-adjudication-read.ts', reader, { flag: 'wx' })
