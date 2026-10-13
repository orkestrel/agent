import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isRecord } from '@orkestrel/contract'

type Evidence = Readonly<{ path: string; hash: string }>
type DeploymentModel = Readonly<{
	model: string
	digest: string
	backend: string
	context: number
	field: string
	metadata: Evidence
}>
type Deployment = Readonly<{
	receipt: Evidence
	executable: Evidence
	runner: Evidence
	version: string
	environment: Readonly<Record<string, unknown>>
	exclusive: boolean
	controls: readonly Evidence[]
	models: readonly DeploymentModel[]
}>
type Command = Readonly<{
	sequence: number
	id: string
	capSeconds: number
	argv: readonly string[]
	expected: readonly string[]
}>
type LabelEntry = Readonly<{ key: string; packet: string; labels: string; fit: string }>
type Plan = Readonly<{
	root: string
	results: string
	deployment: string
	seed: string
	settings: string
	sequence: string
	commands: readonly Command[]
	labels: readonly LabelEntry[]
}>

const startedAt = new Date().toISOString()
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
] as const
const endpoint = 'http://127.0.0.1:11435'
const selected = [
	'q4-think0-freeze',
	'q4-think1-freeze',
	'q4-calibration-corpus',
	'q4-calibration-generate',
	'q4-calibration-fit',
] as const
const allowedCommandKeys = ['argv', 'capSeconds', 'expected', 'id', 'sequence'] as const
const allowedPlanKeys = ['commands', 'deployment', 'labels', 'results', 'root', 'seed', 'sequence', 'settings'] as const

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
	return Object.keys(value).sort().join('\n') === [...keys].sort().join('\n')
}

function isStringArray(value: unknown): value is readonly string[] {
	return Array.isArray(value) && value.every((item: unknown): item is string => typeof item === 'string')
}

function isEvidence(value: unknown): value is Evidence {
	return isRecord(value) && typeof value.path === 'string' && typeof value.hash === 'string'
}

function isDeploymentModel(value: unknown): value is DeploymentModel {
	return isRecord(value) &&
		typeof value.model === 'string' &&
		typeof value.digest === 'string' &&
		typeof value.backend === 'string' &&
		typeof value.context === 'number' &&
		typeof value.field === 'string' &&
		isEvidence(value.metadata)
}

function isDeployment(value: unknown): value is Deployment {
	return isRecord(value) &&
		isEvidence(value.receipt) &&
		isEvidence(value.executable) &&
		isEvidence(value.runner) &&
		typeof value.version === 'string' &&
		isRecord(value.environment) &&
		typeof value.exclusive === 'boolean' &&
		Array.isArray(value.controls) && value.controls.every(isEvidence) &&
		Array.isArray(value.models) && value.models.every(isDeploymentModel)
}

function isCommand(value: unknown): value is Command {
	return isRecord(value) &&
		hasOnlyKeys(value, allowedCommandKeys) &&
		typeof value.sequence === 'number' &&
		typeof value.id === 'string' &&
		typeof value.capSeconds === 'number' &&
		isStringArray(value.argv) &&
		isStringArray(value.expected)
}

function isLabelEntry(value: unknown): value is LabelEntry {
	return isRecord(value) &&
		typeof value.key === 'string' &&
		typeof value.packet === 'string' &&
		typeof value.labels === 'string' &&
		typeof value.fit === 'string'
}

function isPlan(value: unknown): value is Plan {
	return isRecord(value) &&
		hasOnlyKeys(value, allowedPlanKeys) &&
		typeof value.root === 'string' &&
		typeof value.results === 'string' &&
		typeof value.deployment === 'string' &&
		typeof value.seed === 'string' &&
		typeof value.settings === 'string' &&
		typeof value.sequence === 'string' &&
		Array.isArray(value.commands) && value.commands.every(isCommand) &&
		Array.isArray(value.labels) && value.labels.every(isLabelEntry)
}

function readText(file: string): string {
	return readFileSync(file, 'utf8')
}

function readPlan(file: string): Plan {
	const parsed: unknown = JSON.parse(readText(file))
	assert(isPlan(parsed), `${file} does not match the checked plan shape`)
	return parsed
}

function sha256(bytes: Uint8Array): string {
	return createHash('sha256').update(bytes).digest('hex')
}

function inputHashes(): Readonly<Record<string, string>> {
	return Object.fromEntries(files.map((file) => [file, sha256(readFileSync(file))]))
}

const hashes = inputHashes()
const successorLaunch = readText(files[0])
const successorMaterializer = readText(files[1])
const planCreator = readText(files[3])
const priorLaunch = readText(files[4])
const priorMaterializer = readText(files[5])
const historicalParsed: unknown = JSON.parse(readText(files[6]))
assert(isDeployment(historicalParsed), 'historical deployment has an unexpected envelope')
const historicalDeployment = historicalParsed
const prior: Plan = readPlan(files[7])
const successor: Plan = readPlan(files[2])

function normalizeLaunch(value: string): string {
	return value.split(/\r?\n/).slice(1).join('\n')
		.replace('http://127.0.0.1:11434', endpoint)
		.replaceAll('aggregate-final-daemon-start.json', 'aggregate-successor-daemon-start.json')
}

assert.equal(normalizeLaunch(priorLaunch), normalizeLaunch(successorLaunch), 'launcher body has undeclared differences')
assert.match(successorLaunch.split(/\r?\n/, 1)[0] ?? '', /259200-second cap; changes the receipt path and loopback port after l14 custody closes\./)
assert.match(successorLaunch, /OLLAMA_HOST: 'http:\/\/127\.0\.0\.1:11435'/)
assert.match(successorLaunch, /OLLAMA_NUM_PARALLEL: '1'/)
assert.match(successorLaunch, /OLLAMA_MAX_LOADED_MODELS: '0'/)
assert.match(successorLaunch, /LLAMA_ARG_CONTEXT_SHIFT: '0'/)
assert.match(successorLaunch, /LLAMA_ARG_N_PARALLEL: '1'/)

assert.match(successorMaterializer, /aggregate-final-daemon-deployment\.json/)
assert.match(successorMaterializer, /aggregate-successor-daemon-start\.json/)
assert.match(successorMaterializer, /aggregate-successor-daemon-deployment\.json/)
assert.match(successorMaterializer, /historical\.environment\.OLLAMA_HOST !== 'http:\/\/127\.0\.0\.1:11434'/)
assert.match(successorMaterializer, /\.\.\.historical\.environment, OLLAMA_HOST: 'http:\/\/127\.0\.0\.1:11435'/)
assert.match(successorMaterializer, /environment\[key\] !== receipt\.values\[key\]/)
assert.match(successorMaterializer, /receipt\.executable !== historical\.executable\.path/)
assert.match(successorMaterializer, /receipt\.args\[0\] !== 'serve'/)
assert.match(successorMaterializer, /\.\.\.historical,/)
assert.match(successorMaterializer, /\.\.\.historical\.receipt,/)
assert.match(successorMaterializer, /flag: 'wx'/)
assert.equal(historicalDeployment.environment.OLLAMA_HOST, 'http://127.0.0.1:11434')
assert.equal(historicalDeployment.environment.OLLAMA_NUM_PARALLEL, '1')
assert.equal(historicalDeployment.environment.OLLAMA_MAX_LOADED_MODELS, '0')
assert.equal(historicalDeployment.environment.LLAMA_ARG_CONTEXT_SHIFT, '0')
assert.equal(historicalDeployment.environment.LLAMA_ARG_N_PARALLEL, '1')
assert.equal(existsSync('tmp/units/aggregate-successor-daemon-start.json'), false)
assert.equal(existsSync('tmp/units/aggregate-successor-daemon-deployment.json'), false)

assert.match(planCreator, /const keys = \['q4-think0-freeze', 'q4-think1-freeze', 'q4-calibration-corpus', 'q4-calibration-generate', 'q4-calibration-fit'\]/)
assert.match(planCreator, /assert\(!command\.argv\.includes\('--url'\)\)/)
assert.match(planCreator, /argv: \[\.\.\.argv, '--url', 'http:\/\/127\.0\.0\.1:11435'\]/)
assert.match(planCreator, /writeFileSync\('tmp\/units\/aggregate-successor-q4-command-plan\.json'.*flag: 'wx'/)
assert.equal(prior.commands.filter((command) => (selected as readonly string[]).includes(command.id)).length, selected.length)
assert.deepEqual(successor.commands.map((command) => command.id), selected)

function transformArg(value: string): string {
	return value
		.replaceAll('\\l14\\', '\\l15\\')
		.replaceAll('aggregate-final-daemon-deployment.json', 'aggregate-successor-daemon-deployment.json')
}

function expectedCommands(): Command[] {
	return selected.map((id, index) => {
		const before = prior.commands.find((command) => command.id === id)
		assert(before, `missing Q4 predecessor ${id}`)
		assert.equal(before.argv.includes('--url'), false, `${id} already had a URL`)
		return {
			...before,
			sequence: index + 1,
			argv: [...before.argv.map(transformArg), '--url', endpoint],
			expected: before.expected.map(transformArg),
		}
	})
}

const expected = expectedCommands()

function matchesCommands(commands: readonly Command[]): boolean {
	try {
		assert.deepEqual(commands, expected)
		return true
	} catch {
		return false
	}
}

assert(matchesCommands(successor.commands), 'successor plan differs beyond declared substitutions')
assert.equal(successor.root, 'C:/Users/mikes/WebstormProjects/scaffold')
assert.equal(successor.results, 'C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l15')
assert.equal(successor.deployment, 'C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-successor-daemon-deployment.json')
assert.equal(successor.seed, prior.seed)
assert.equal(successor.settings, prior.settings)
assert.deepEqual(successor.labels, prior.labels.filter((entry) => entry.key === 'q4').map((entry) => ({
	...entry,
	packet: transformArg(entry.packet),
	labels: transformArg(entry.labels),
	fit: transformArg(entry.fit),
})))
assert.equal(successor.labels.length, 1)
assert(successor.commands.every((command) => /q4/.test(command.id)))
assert.deepEqual(successor.commands.map((command) => command.capSeconds), [240, 240, 240, 1800, 240])
assert.match(successor.sequence, /Stop after generation for independent blind labels and root adjudication/)
assert.match(successor.sequence, /Fit only after explicit root release/)

const changedModel = structuredClone([...successor.commands])
const generation = changedModel[3]
assert(generation)
const modelIndex = generation.argv.indexOf('qwen3.5:4b-q4_K_M')
assert.notEqual(modelIndex, -1)
const changedGenerationArgv = [...generation.argv]
changedGenerationArgv[modelIndex] = 'qwen3.5:2b-q4_K_M'
changedModel[3] = { ...generation, argv: changedGenerationArgv }
const changedCap = structuredClone([...successor.commands])
const capCommand = changedCap[3]
assert(capCommand)
changedCap[3] = { ...capCommand, capSeconds: capCommand.capSeconds + 1 }
const missingUrl = structuredClone([...successor.commands])
const missingUrlCommand = missingUrl[3]
assert(missingUrlCommand)
missingUrl[3] = { ...missingUrlCommand, argv: missingUrlCommand.argv.slice(0, -2) }
const wrongUrl = structuredClone([...successor.commands])
const wrongUrlCommand = wrongUrl[3]
assert(wrongUrlCommand)
const wrongUrlArgv = [...wrongUrlCommand.argv]
wrongUrlArgv[wrongUrlArgv.length - 1] = 'http://127.0.0.1:11434'
wrongUrl[3] = { ...wrongUrlCommand, argv: wrongUrlArgv }
const negatives = {
	changedModel: matchesCommands(changedModel),
	changedCap: matchesCommands(changedCap),
	missingUrl: matchesCommands(missingUrl),
	wrongUrl: matchesCommands(wrongUrl),
}
assert.deepEqual(negatives, {
	changedModel: false,
	changedCap: false,
	missingUrl: false,
	wrongUrl: false,
})

const expectedOutputs = successor.commands.flatMap((command) => [...command.expected])
const absentOutputs = expectedOutputs.filter((path) => !existsSync(path))
assert.equal(absentOutputs.length, expectedOutputs.length, 'a planned output already exists')
assert.equal(existsSync('.orkestrel/agent/instruments/results/l15'), false)
const finalHashes = inputHashes()
assert.deepEqual(finalHashes, hashes, 'a compared input changed during this check')

const result = {
	check: 'typed static successor preparation comparison',
	startedAt,
	inputHashes: hashes,
	launcher: 'body matched after only declared host and receipt-path substitutions',
	materializer: 'successor host, original-endpoint check, receipt binding, retained envelope and create-only output checked statically',
	commands: successor.commands.map(({ sequence, id, capSeconds, expected: outputs }) => ({ sequence, id, capSeconds, expected: outputs })),
	negativeComparisons: negatives,
	absentOutputs,
	historicalInputsUnchanged: true,
	serviceExecuted: false,
	durationMs: Number(process.hrtime.bigint() - started) / 1e6,
}
writeFileSync(resolve('tmp/units/aggregate-successor-preparation-check-result-2.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify(result, null, 2))
