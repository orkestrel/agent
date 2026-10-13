// Usage: node tmp/units/aggregate-successor-model-plan.ts --key g4|q2|g2; prepares only that key's create-only command plan.
// Adapts the Q4 preparer; no generated command or runner is executed.
import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { isRecord } from '@orkestrel/contract'
import { readBuild } from '../../.orkestrel/agent/instruments/harness/.build/bench5/build/helpers.js'
import { hashFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'
import { readMatrixFiles } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'

const root = 'C:/Users/mikes/WebstormProjects/scaffold'
assert.equal(resolve(process.cwd()), resolve(root), 'prepare from the scaffold root')
const { values } = parseArgs({ options: { key: { type: 'string' } }, allowPositionals: false })
const key = values.key
assert(key === 'g4' || key === 'q2' || key === 'g2', 'supply --key g4|q2|g2')
const before = {
	manifest: readBuild(),
	matrix: readMatrixFiles(),
	build: hashFile(join(root, '.orkestrel/agent/instruments/harness/.build/build-manifest.json')),
	deployment: hashFile(join(root, 'tmp/units/aggregate-successor-daemon-deployment.json')),
}
assert.equal(before.build.hash, '0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc', 'accepted build changed')
assert.equal(before.deployment.hash, '40442197423b574b61548feb702b55c948d77f61dd719d9d6b26e24ad3016e19', 'validated deployment changed')
const prior: unknown = JSON.parse(readFileSync('tmp/units/aggregate-final-calibration-command-plan-2.json', 'utf8'))
assert(isRecord(prior) && Array.isArray(prior.commands) && Array.isArray(prior.labels))
const path = `tmp/units/aggregate-successor-model-${key}-plan.json`
const diff = `tmp/units/aggregate-successor-model-${key}-operators.diff`
const keys = [`${key}-think0-freeze`, `${key}-think1-freeze`, `${key}-calibration-corpus`, `${key}-calibration-generate`, `${key}-calibration-fit`]
const commands = []
const comparisons = []
const destinations = [
	path,
	diff,
	join(root, `.orkestrel/agent/instruments/results/l15/${key}-think0`),
	join(root, `.orkestrel/agent/instruments/results/l15/${key}-think1`),
	join(root, `.orkestrel/agent/instruments/results/l15/calibration/${key}`),
]
if (key === 'g4') destinations.push('tmp/units/aggregate-successor-model-plan.diff', 'tmp/units/aggregate-successor-model-run.diff')
for (const [index, id] of keys.entries()) {
	const candidates = prior.commands.filter((value) => isRecord(value) && value.id === id)
	assert.equal(candidates.length, 1)
	const command = candidates[0]
	assert(isRecord(command) && Array.isArray(command.argv) && Array.isArray(command.expected))
	assert(typeof command.capSeconds === 'number')
	assert.equal(command.capSeconds, id === `${key}-calibration-generate` ? 1800 : 240)
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
	const adapted = { ...command, sequence: index + 1, argv: [...argv, '--url', 'http://127.0.0.1:11435'], expected }
	commands.push(adapted)
	const output = adapted.argv[adapted.argv.indexOf('--out') + 1]
	const journal = adapted.argv[adapted.argv.indexOf('--journal') + 1]
	const errors = adapted.argv[adapted.argv.indexOf('--errors') + 1]
	assert(typeof output === 'string' && typeof journal === 'string' && typeof errors === 'string')
	destinations.push(output, ...expected, journal, errors, `${journal}.pid`, `${journal}.status-before.txt`, `${journal}.status-after.txt`)
	if (id === `${key}-calibration-generate`) {
		const cache = adapted.argv[adapted.argv.indexOf('--cache') + 1]
		assert(typeof cache === 'string')
		destinations.push(cache)
	}
	comparisons.push({ id, prior: command, adapted })
}
const labels = prior.labels.filter((entry) => isRecord(entry) && entry.key === key).map((entry) => {
	assert(isRecord(entry))
	return Object.fromEntries(Object.entries(entry).map(([name, value]) => {
		assert(typeof value === 'string')
		return [name, value.replaceAll('\\l14\\', '\\l15\\')]
	}))
})
assert.equal(labels.length, 1)
for (const destination of destinations) assert(!existsSync(destination), `occupied destination: ${destination}`)
const plan = {
	root,
	results: `${root}/.orkestrel/agent/instruments/results/l15`,
	deployment: `${root}/tmp/units/aggregate-successor-daemon-deployment.json`,
	seed: prior.seed,
	settings: prior.settings,
	sequence: `After root accepts source/build and the dedicated service, run ${key} freezes and corpus/generation. Stop after generation for independent blind labels and root adjudication. Fit only after explicit root release; never retry generation for a refused fit.`,
	commands,
	labels,
}
assert.deepEqual({ manifest: readBuild(), matrix: readMatrixFiles(), build: hashFile(join(root, '.orkestrel/agent/instruments/harness/.build/build-manifest.json')), deployment: hashFile(resolve(plan.deployment)) }, before, 'preparation custody moved')
writeFileSync(path, `${JSON.stringify(plan, null, 2)}\n`, { flag: 'wx' })
const materialized: unknown = JSON.parse(readFileSync(path, 'utf8'))
assert.deepEqual(materialized, plan, 'materialized plan differs')
assert(isRecord(materialized) && Array.isArray(materialized.commands))
for (const [index, adapted] of materialized.commands.entries()) {
	assert(isRecord(adapted) && Array.isArray(adapted.argv) && Array.isArray(adapted.expected))
	const comparison = comparisons[index]
	assert(comparison !== undefined)
	assert.deepEqual(adapted.argv.slice(-2), ['--url', 'http://127.0.0.1:11435'])
	assert.equal(adapted.sequence, index + 1)
	const restored = {
		...adapted,
		sequence: comparison.prior.sequence,
		argv: adapted.argv.slice(0, -2).map((value: unknown) => {
			assert(typeof value === 'string')
			return value.replaceAll('\\l15\\', '\\l14\\').replaceAll('aggregate-successor-daemon-deployment.json', 'aggregate-final-daemon-deployment.json')
		}),
		expected: adapted.expected.map((value: unknown) => {
			assert(typeof value === 'string')
			return value.replaceAll('\\l15\\', '\\l14\\')
		}),
	}
	assert.deepEqual(restored, comparison.prior, `operator changed beyond allowed substitutions: ${adapted.id}`)
	assert.throws(() => assert.deepEqual({ ...restored, capSeconds: comparison.prior.capSeconds + 1 }, comparison.prior), 'changed-cap negative control must fail')
}
const original = `${JSON.stringify(comparisons.map((comparison) => comparison.prior), null, 2)}\n`.split(/\r\n|\n/).slice(0, -1)
const adapted = `${JSON.stringify(comparisons.map((comparison) => comparison.adapted), null, 2)}\n`.split(/\r\n|\n/).slice(0, -1)
writeFileSync(diff, `--- aggregate-final-calibration-command-plan-2.json (${key} operators)\n+++ aggregate-successor-model-${key}-plan.json (operators)\n@@ -1,${original.length} +1,${adapted.length} @@\n${original.map((line) => `-${line}`).join('\n')}\n${adapted.map((line) => `+${line}`).join('\n')}\n`, { flag: 'wx' })
// Materialize shared script deltas with the first prepared key; later keys create only their own plans and operator deltas.
if (key === 'g4') {
	for (const [source, target, delta] of [
		['tmp/units/aggregate-successor-q4-plan.ts', 'tmp/units/aggregate-successor-model-plan.ts', 'tmp/units/aggregate-successor-model-plan.diff'],
		['tmp/units/aggregate-successor-q4-execution-run.ts', 'tmp/units/aggregate-successor-model-run.ts', 'tmp/units/aggregate-successor-model-run.diff'],
	]) {
		assert(typeof source === 'string' && typeof target === 'string' && typeof delta === 'string')
		const previous = readFileSync(source, 'utf8').split(/\r\n|\n/).slice(0, -1)
		const successor = readFileSync(target, 'utf8').split(/\r\n|\n/).slice(0, -1)
		writeFileSync(delta, `--- ${source}\n+++ ${target}\n@@ -1,${previous.length} +1,${successor.length} @@\n${previous.map((line) => `-${line}`).join('\n')}\n${successor.map((line) => `+${line}`).join('\n')}\n`, { flag: 'wx' })
	}
}
console.log(JSON.stringify({ key, plan: hashFile(path), diff: hashFile(diff), prepared: commands.map((entry) => ({ id: entry.id, cap: entry.capSeconds })), destinations, comparison: 'equal after allowed substitutions and sequence renumbering', control: 'changed cap refused', endpoint: 'http://127.0.0.1:11435', executed: false }))
