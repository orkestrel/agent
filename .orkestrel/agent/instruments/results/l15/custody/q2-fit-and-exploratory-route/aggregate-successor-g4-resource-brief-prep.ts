// Adapt the existing resource-only unit while keeping its release dependent on closed generation custody.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'

let brief = readFileSync('tmp/units/aggregate-successor-q4-resource-brief.md', 'utf8')
for (const [before, after] of [
	['Qwen4', 'Gemma4'], ['q4-think0', 'g4-think0'], ['aggregate-successor-q4-resource', 'aggregate-successor-g4-think0-resource'],
	['accepted execution HEAD is the pushed evidence checkpoint `318a81fa75eab21bec17dedad7da8a0e61ce3c14`', 'execution HEAD is supplied by root in the explicit launch release after Gemma2 generation closes'],
]) {
	assert.ok(brief.includes(before), before)
	brief = brief.replaceAll(before, after)
}
const original = '95da49bbb6f4811f2bcad63e87ace42c380ba15ceb5ee42c0bd113b509ac72a9'
assert.ok(brief.includes(original))
brief = brief.replaceAll(original, '9fecc71430f9c6af8580bdc7eb43e6ec2b034fa12c45690581af4197ac818f36')
brief = brief.replace('with no other model workload', 'as the sole campaign workload on port 11435')
brief = brief.replace('Prior Gemma4 resource took', 'Prior Qwen4 resource took')
brief += '\nPreserve user-owned service PID32104 and all its models/workers. Shared GPU use is authorized and must remain disclosed; it is not a reason to stop either service. Do not launch until root provides the explicit HEAD after Gemma2 closes. Preparation can inspect the existing aggregate-successor-q4-resource reader and copy it with only literal identity/path changes. Do not add a validation mechanism.\n'
writeFileSync('tmp/units/aggregate-successor-g4-think0-resource-brief.md', brief)
