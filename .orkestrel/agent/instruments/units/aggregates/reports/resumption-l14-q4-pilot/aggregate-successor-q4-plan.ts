// Usage: node tmp/units/aggregate-successor-q4-plan.ts; exits 0 after preparing an unexecuted create-only command plan.
import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { isRecord } from '@orkestrel/contract'

const root = 'C:/Users/mikes/WebstormProjects/scaffold'
const prior: unknown = JSON.parse(readFileSync('tmp/units/aggregate-final-calibration-command-plan-2.json', 'utf8'))
assert(isRecord(prior) && Array.isArray(prior.commands) && Array.isArray(prior.labels))
assert(!existsSync('.orkestrel/agent/instruments/results/l15'))
const keys = ['q4-think0-freeze', 'q4-think1-freeze', 'q4-calibration-corpus', 'q4-calibration-generate', 'q4-calibration-fit']
const commands = []
for (const [index, id] of keys.entries()) {
	const candidates = prior.commands.filter((value) => isRecord(value) && value.id === id)
	assert.equal(candidates.length, 1)
	const command = candidates[0]
	assert(isRecord(command) && Array.isArray(command.argv) && Array.isArray(command.expected))
	assert(!command.argv.includes('--url'))
	const argv = command.argv.map((value) => {
		assert.equal(typeof value, 'string')
		assert(typeof value === 'string')
		return value.replaceAll('\\l14\\', '\\l15\\').replaceAll('aggregate-final-daemon-deployment.json', 'aggregate-successor-daemon-deployment.json')
	})
	const expected = command.expected.map((value) => {
		assert(typeof value === 'string')
		return value.replaceAll('\\l14\\', '\\l15\\')
	})
	commands.push({ ...command, sequence: index + 1, argv: [...argv, '--url', 'http://127.0.0.1:11435'], expected })
}
const labels = prior.labels.filter((entry) => isRecord(entry) && entry.key === 'q4').map((entry) => {
	assert(isRecord(entry))
	return Object.fromEntries(Object.entries(entry).map(([key, value]) => {
		assert(typeof value === 'string')
		return [key, value.replaceAll('\\l14\\', '\\l15\\')]
	}))
})
assert.equal(labels.length, 1)
const plan = {
	root,
	results: `${root}/.orkestrel/agent/instruments/results/l15`,
	deployment: `${root}/tmp/units/aggregate-successor-daemon-deployment.json`,
	seed: prior.seed,
	settings: prior.settings,
	sequence: 'After root accepts source/build and the dedicated service, run Qwen4 freezes and corpus/generation. Stop after generation for independent blind labels and root adjudication. Fit only after explicit root release; never retry generation for a refused fit.',
	commands,
	labels,
}
writeFileSync('tmp/units/aggregate-successor-q4-command-plan.json', `${JSON.stringify(plan, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ prepared: commands.map((entry) => entry.id), endpoint: 'http://127.0.0.1:11435', executed: false }))
