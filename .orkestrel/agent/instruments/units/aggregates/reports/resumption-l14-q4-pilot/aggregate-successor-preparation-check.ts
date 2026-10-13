import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const started = process.hrtime.bigint()
const files = [
	'tmp/units/aggregate-successor-daemon-launch.ts',
	'tmp/units/aggregate-successor-daemon-materialize.ts',
	'tmp/units/aggregate-successor-q4-command-plan.json',
	'tmp/units/aggregate-successor-q4-plan.ts',
	'tmp/units/aggregate-final-daemon-launch.ts',
	'tmp/units/aggregate-final-daemon-materialize.ts',
	'tmp/units/aggregate-final-daemon-deployment.json',
	'tmp/units/aggregate-final-calibration-command-plan-2.json',
]
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const hashes = Object.fromEntries(files.map((file) => [file, hash(readFileSync(file))]))
const read = (file) => readFileSync(file, 'utf8')
const successorLaunch = read(files[0])
const priorLaunch = read(files[4])
const normalizeLaunch = (value) => value.split(/\r?\n/).slice(1).join('\n')
	.replace('http://127.0.0.1:11434', 'http://127.0.0.1:11435')
	.replaceAll('aggregate-final-daemon-start.json', 'aggregate-successor-daemon-start.json')
assert.equal(normalizeLaunch(priorLaunch), normalizeLaunch(successorLaunch), 'launcher body has undeclared differences')
assert.match(successorLaunch.split(/\r?\n/, 1)[0], /259200-second cap; changes the receipt path and loopback port after l14 custody closes\./)
assert.match(successorLaunch, /OLLAMA_HOST: 'http:\/\/127\.0\.0\.1:11435'/)
assert.match(successorLaunch, /OLLAMA_NUM_PARALLEL: '1'/)
assert.match(successorLaunch, /OLLAMA_MAX_LOADED_MODELS: '0'/)
assert.match(successorLaunch, /LLAMA_ARG_CONTEXT_SHIFT: '0'/)
assert.match(successorLaunch, /LLAMA_ARG_N_PARALLEL: '1'/)

const historicalDeployment = JSON.parse(read(files[6]))
const materializer = read(files[1])
assert.match(materializer, /aggregate-final-daemon-deployment\.json/)
assert.match(materializer, /aggregate-successor-daemon-start\.json/)
assert.match(materializer, /aggregate-successor-daemon-deployment\.json/)
assert.match(materializer, /historical\.environment\.OLLAMA_HOST !== 'http:\/\/127\.0\.0\.1:11434'/)
assert.match(materializer, /\.\.\.historical\.environment, OLLAMA_HOST: 'http:\/\/127\.0\.0\.1:11435'/)
assert.match(materializer, /environment\[key\] !== receipt\.values\[key\]/)
assert.match(materializer, /receipt\.executable !== historical\.executable\.path/)
assert.match(materializer, /receipt\.args\[0\] !== 'serve'/)
assert.match(materializer, /\.\.\.historical,/)
assert.match(materializer, /environment,/)
assert.match(materializer, /\.\.\.historical\.receipt,/)
assert.match(materializer, /flag: 'wx'/)
assert.deepEqual(historicalDeployment.environment, {
	OLLAMA_HOST: 'http://127.0.0.1:11434',
	OLLAMA_NUM_PARALLEL: '1',
	OLLAMA_MAX_LOADED_MODELS: '0',
	LLAMA_ARG_CONTEXT_SHIFT: '0',
	LLAMA_ARG_N_PARALLEL: '1',
})
assert.equal(existsSync('tmp/units/aggregate-successor-daemon-start.json'), false)
assert.equal(existsSync('tmp/units/aggregate-successor-daemon-deployment.json'), false)

const prior = JSON.parse(read(files[7]))
const successor = JSON.parse(read(files[2]))
const selected = [
	'q4-think0-freeze',
	'q4-think1-freeze',
	'q4-calibration-corpus',
	'q4-calibration-generate',
	'q4-calibration-fit',
]
const endpoint = 'http://127.0.0.1:11435'
const deploymentName = 'aggregate-successor-daemon-deployment.json'
const priorDeploymentName = 'aggregate-final-daemon-deployment.json'
const transformArg = (value) => value
	.replaceAll('\\l14\\', '\\l15\\')
	.replaceAll(priorDeploymentName, deploymentName)
const transformPlan = () => {
	assert.equal(prior.commands.filter((command) => selected.includes(command.id)).length, selected.length)
	assert.deepEqual(successor.commands.map((command) => command.id), selected)
	return selected.map((id, index) => {
		const before = prior.commands.find((command) => command.id === id)
		assert(before)
		assert.equal(before.argv.includes('--url'), false)
		return {
			...before,
			sequence: index + 1,
			argv: [...before.argv.map(transformArg), '--url', endpoint],
			expected: before.expected.map(transformArg),
		}
	})
}
const expectedCommands = transformPlan()
const matchesCommands = (commands) => {
	try {
		assert.deepEqual(commands, expectedCommands)
		return true
	} catch {
		return false
	}
}
assert(matchesCommands(successor.commands), 'successor commands differ beyond declared substitutions')
assert.equal(successor.root, 'C:/Users/mikes/WebstormProjects/scaffold')
assert.equal(successor.results, 'C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l15')
assert.equal(successor.deployment, 'C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-successor-daemon-deployment.json')
assert.equal(successor.seed, prior.seed)
assert.equal(successor.settings, prior.settings)
assert.deepEqual(successor.labels, prior.labels.filter((entry) => entry.key === 'q4').map((entry) =>
	Object.fromEntries(Object.entries(entry).map(([key, value]) => [key, transformArg(value)])),
))
assert.equal(successor.labels.length, 1)
assert.equal(successor.commands.every((command) => /q4/.test(command.id) && /qwen3\.5:4b-q4_K_M/.test(command.argv.join(' ')) || command.id.includes('freeze') && /q4/.test(command.id)), true)

const negative = {
	changedModel: structuredClone(successor.commands),
	changedCap: structuredClone(successor.commands),
	missingUrl: structuredClone(successor.commands),
	wrongUrl: structuredClone(successor.commands),
}
negative.changedModel[3].argv[negative.changedModel[3].argv.indexOf('qwen3.5:4b-q4_K_M')] = 'qwen3.5:2b-q4_K_M'
negative.changedCap[3].capSeconds += 1
negative.missingUrl[3].argv.splice(-2)
negative.wrongUrl[3].argv[negative.wrongUrl[3].argv.length - 1] = 'http://127.0.0.1:11434'
assert.deepEqual(Object.fromEntries(Object.entries(negative).map(([key, value]) => [key, matchesCommands(value)])), {
	changedModel: false,
	changedCap: false,
	missingUrl: false,
	wrongUrl: false,
})

const expectedOutputs = successor.commands.flatMap((command) => command.expected)
const missingOutputs = expectedOutputs.filter((path) => !existsSync(path))
assert.equal(missingOutputs.length, expectedOutputs.length, 'a planned output already exists')
assert.equal(existsSync('.orkestrel/agent/instruments/results/l15'), false)
const postHashes = Object.fromEntries(files.map((file) => [file, hash(readFileSync(file))]))
assert.deepEqual(postHashes, hashes, 'an input changed during this static check')
const result = {
	check: 'static successor preparation comparison',
	started: new Date().toISOString(),
	files: hashes,
	launcher: 'body identical after declared host and receipt-path substitutions',
	materializer: 'host-only environment change, receipt identity, retained envelope, create-only output verified statically',
	commands: successor.commands.map(({ sequence, id, capSeconds, expected }) => ({ sequence, id, capSeconds, expected })),
	selected: selected,
	negativeComparisons: { changedModel: false, changedCap: false, missingUrl: false, wrongUrl: false },
	outputsAbsent: missingOutputs,
	historicalInputsUnchanged: true,
	serviceExecuted: false,
	durationMs: Number(process.hrtime.bigint() - started) / 1e6,
}
writeFileSync(resolve('tmp/units/aggregate-successor-preparation-check-result.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify(result, null, 2))
