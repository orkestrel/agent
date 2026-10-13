import type { ExecutionOptions } from '../aggregate-capacity-g2-control/types.ts'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { computeHash } from '../aggregate-judge-counterfactual/helpers.ts'
import { NetworkWitness } from '../aggregate-judge-counterfactual/NetworkWitness.ts'
import { HOST, OPERATOR_FILES, PACKET, ROOT, UNIT } from '../aggregate-capacity-g2-control/constants.ts'
import { buildPacket, computeOperator, readFileBinding, validateExecution } from '../aggregate-capacity-g2-control/helpers.ts'

const owned = resolve(ROOT, 'tmp/units/aggregate-capacity-g2-verification')
const outputRoot = resolve(owned, 'run-5')
const proofDirectory = resolve(outputRoot, 'proof')
const proofFile = resolve(outputRoot, 'Offline.ts')
const proofEntry = resolve(outputRoot, 'population.ts')
const diffFile = resolve(outputRoot, 'proof-only.diff')
const records: Array<Record<string, unknown>> = []

type JsonRecord = Record<string, unknown>
function object(value: unknown, label: string): JsonRecord {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`)
	return value
}
function array(value: unknown, label: string): unknown[] {
	if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
	return value
}
function string(value: unknown, label: string): string {
	if (typeof value !== 'string') throw new Error(`${label} must be a string`)
	return value
}
function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'))
}
function digest(bytes: Buffer): string {
	return createHash('sha256').update(bytes).digest('hex')
}
function binding(value: unknown): JsonRecord {
	const entry = object(value, 'binding')
	const path = string(entry.path, 'binding.path')
	const actualPath = resolve(ROOT, path)
	const bytes = readFileSync(actualPath)
	return { path, hash: digest(bytes), bytes: bytes.byteLength }
}
function verifyList(expectedValue: unknown, label: string): JsonRecord[] {
	const expected = array(expectedValue, label).map((entry) => object(entry, label))
	const actual = expected.map((entry) => binding(entry))
	if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} binding mismatch`)
	return actual
}
function equal(left: unknown, right: unknown, label: string): void {
	if (JSON.stringify(left) !== JSON.stringify(right)) throw new Error(`${label} mismatch`)
}
function scan(directory: string): JsonRecord[] {
	return readdirSync(directory, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => {
			const path = resolve(entry.parentPath, entry.name)
			return readFileBinding(path)
		})
		.sort((left, right) => left.path.localeCompare(right.path))
}
function run(name: string, file: string, args: readonly string[], expected: number, validate?: (stdout: string, stderr: string) => void): void {
	const reusePrior = process.argv.includes('--reuse-passed-run-4') && (name === 'strict-types' || (name.startsWith('syntax-') && name !== 'proof-copy-syntax' && name !== 'proof-entry-syntax') || name === 'witness-negative' || name.startsWith('default-'))
	if (reusePrior) {
		const priorRoot = resolve(owned, 'run-4')
		const prior = object(readJson(resolve(priorRoot, `${name}.command.json`)), `${name} prior command`)
		if (prior.expected !== expected || prior.exit !== expected || prior.signal !== null || JSON.stringify(prior.command) !== JSON.stringify([file, ...args])) throw new Error(`${name} prior passing evidence does not match this command`)
		const stdout = readFileSync(resolve(priorRoot, `${name}.stdout.txt`), 'utf8')
		const stderr = readFileSync(resolve(priorRoot, `${name}.stderr.txt`), 'utf8')
		validate?.(stdout, stderr)
		const record = { ...prior, reusedFrom: `run-4/${name}.command.json` }
		records.push(record)
		console.log(JSON.stringify({ name, exit: expected, expected, durationMs: prior.durationMs, reusedFrom: record.reusedFrom }))
		return
	}
	const started = performance.now()
	const result = spawnSync(file, [...args], { cwd: ROOT, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30000 })
	const stdout = result.stdout ?? ''
	const stderr = result.stderr ?? ''
	writeFileSync(resolve(outputRoot, `${name}.stdout.txt`), stdout, { flag: 'wx' })
	writeFileSync(resolve(outputRoot, `${name}.stderr.txt`), stderr, { flag: 'wx' })
	const record = { name, command: [file, ...args], expected, exit: result.status, signal: result.signal, error: result.error?.message, durationMs: performance.now() - started }
	writeFileSync(resolve(outputRoot, `${name}.command.json`), `${JSON.stringify({ ...record, stdoutPath: `${name}.stdout.txt`, stderrPath: `${name}.stderr.txt` }, null, 2)}\n`, { flag: 'wx' })
	if (result.error !== undefined || result.status !== expected) throw new Error(`${name} exited ${String(result.status)}; expected ${expected}: ${stderr}`)
	validate?.(stdout, stderr)
	records.push(record)
	console.log(JSON.stringify({ name, exit: result.status, expected, durationMs: record.durationMs }))
}
function restoreProof(adapted: string): string {
	return adapted
		.replace("import type { ExecutionOptions } from '../../aggregate-capacity-g2-control/types.ts'", "import type { ExecutionOptions } from './types.ts'")
		.replace("import { HOST, INPUT_FILES, LIMITS, OPERATOR_FILES, ORIGINAL_REQUEST, PACKET, PREPARED, ROOT, SAMPLER, UNIT, WORKLOADS } from '../../aggregate-capacity-g2-control/constants.ts'", "import { HOST, INPUT_FILES, LIMITS, OPERATOR_FILES, ORIGINAL_REQUEST, PACKET, PREPARED, ROOT, SAMPLER, UNIT, WORKLOADS } from './constants.ts'")
		.replace("import { Driver } from '../../aggregate-capacity-g2-control/Driver.ts'", "import { Driver } from './Driver.ts'")
		.replace("import { Daemon } from '../../aggregate-capacity-g2-control/Daemon.ts'", "import { Daemon } from './Daemon.ts'")
		.replace("import { buildPacket, computeOperator, readFileBinding } from '../../aggregate-capacity-g2-control/helpers.ts'", "import { buildPacket, computeOperator, readFileBinding } from './helpers.ts'")
		.replaceAll("from '../../aggregate-judge-counterfactual/", "from '../aggregate-judge-counterfactual/")
		.replace("const VERIFY_OUTPUT = resolve(UNIT, '../aggregate-capacity-g2-verification/run-5')\n", '')
		.replaceAll("resolve(VERIFY_OUTPUT, 'proof/preparation.json')", "resolve(UNIT, 'evidence/preparation.json')")
		.replaceAll("resolve(VERIFY_OUTPUT, 'proof/population.json')", "resolve(UNIT, 'evidence/population.json')")
		.replaceAll("resolve(UNIT, 'evidence/independent-verifier-missing-receipt.json')", "resolve(UNIT, 'evidence/missing-receipt.json')")
		.replaceAll("resolve(UNIT, 'evidence/independent-verifier-never-created')", "resolve(UNIT, 'evidence/never-created')")
}

if (!existsSync(proofDirectory)) mkdirSync(proofDirectory)
const originalProof = readFileSync(resolve(UNIT, 'Offline.ts'), 'utf8')
let adaptedProof = originalProof
	.replace("import type { ExecutionOptions } from './types.ts'", "import type { ExecutionOptions } from '../../aggregate-capacity-g2-control/types.ts'")
	.replace("import { HOST, INPUT_FILES, LIMITS, OPERATOR_FILES, ORIGINAL_REQUEST, PACKET, PREPARED, ROOT, SAMPLER, UNIT, WORKLOADS } from './constants.ts'", "import { HOST, INPUT_FILES, LIMITS, OPERATOR_FILES, ORIGINAL_REQUEST, PACKET, PREPARED, ROOT, SAMPLER, UNIT, WORKLOADS } from '../../aggregate-capacity-g2-control/constants.ts'")
	.replace("import { Driver } from './Driver.ts'", "import { Driver } from '../../aggregate-capacity-g2-control/Driver.ts'")
	.replace("import { Daemon } from './Daemon.ts'", "import { Daemon } from '../../aggregate-capacity-g2-control/Daemon.ts'")
	.replace("import { buildPacket, computeOperator, readFileBinding } from './helpers.ts'", "import { buildPacket, computeOperator, readFileBinding } from '../../aggregate-capacity-g2-control/helpers.ts'")
const lastImport = "import { buildPacket, computeOperator, readFileBinding } from '../../aggregate-capacity-g2-control/helpers.ts'\n"
if (!adaptedProof.includes(lastImport)) throw new Error('Could not locate the final adapted runtime import')
adaptedProof = adaptedProof.replace(lastImport, `${lastImport}const VERIFY_OUTPUT = resolve(UNIT, '../aggregate-capacity-g2-verification/run-5')\n`)
adaptedProof = adaptedProof
	.replace("resolve(UNIT, 'evidence/preparation.json')", "resolve(VERIFY_OUTPUT, 'proof/preparation.json')")
	.replaceAll("resolve(UNIT, 'evidence/population.json')", "resolve(VERIFY_OUTPUT, 'proof/population.json')")
	.replace("resolve(UNIT, 'evidence/missing-receipt.json')", "resolve(UNIT, 'evidence/independent-verifier-missing-receipt.json')")
	.replace("resolve(UNIT, 'evidence/never-created')", "resolve(UNIT, 'evidence/independent-verifier-never-created')")
adaptedProof = adaptedProof.replaceAll("from '../aggregate-judge-counterfactual/", "from '../../aggregate-judge-counterfactual/")
const restoredProof = restoreProof(adaptedProof)
if (restoredProof !== originalProof) {
	let offset = 0
	while (offset < originalProof.length && originalProof[offset] === restoredProof[offset]) offset += 1
	throw new Error('Proof adaptation differs at ' + offset + ': expected ' + JSON.stringify(originalProof.slice(offset, offset + 80)) + ', found ' + JSON.stringify(restoredProof.slice(offset, offset + 80)))
}
const entrySource = "import { Offline } from './Offline.ts'\n\nawait new Offline().execute()\n"
if (existsSync(proofFile)) equal(readFileSync(proofFile, 'utf8'), adaptedProof, 'existing proof copy')
else writeFileSync(proofFile, adaptedProof, { flag: 'wx' })
if (existsSync(proofEntry)) equal(readFileSync(proofEntry, 'utf8'), entrySource, 'existing proof entry')
else writeFileSync(proofEntry, entrySource, { flag: 'wx' })
const diff = spawnSync('git', ['diff', '--no-index', '--no-ext-diff', '--', resolve(UNIT, 'Offline.ts'), proofFile], { cwd: ROOT, encoding: 'utf8', shell: false, windowsHide: true })
if (diff.status !== 1 || diff.stderr !== '') throw new Error(`Proof diff failed: ${diff.stderr}`)
if (existsSync(diffFile)) equal(readFileSync(diffFile, 'utf8'), diff.stdout, 'existing proof diff')
else writeFileSync(diffFile, diff.stdout, { flag: 'wx' })
const diffErrors = resolve(outputRoot, 'proof-only.diff.stderr.txt')
if (existsSync(diffErrors)) equal(readFileSync(diffErrors, 'utf8'), diff.stderr, 'proof diff stderr')
else writeFileSync(diffErrors, diff.stderr, { flag: 'wx' })

const inventoryPath = resolve(UNIT, 'final-source-inventory.json')
const inventory = object(readJson(inventoryPath), 'final source inventory')
const sourceRecords = verifyList(inventory.sources, 'sources')
const inputRecords = verifyList(inventory.inputs, 'inputs')
const packetBindingRecords = verifyList(inventory.bindings, 'packet bindings')
const preparedRecords = array(inventory.prepared, 'prepared inventory').map((entry) => object(entry, 'prepared binding'))
const preparedActual = scan(resolve(UNIT, 'prepared'))
equal(preparedActual, preparedRecords, 'prepared inventory')
const evidenceRecords = array(inventory.evidence, 'evidence inventory').map((entry) => object(entry, 'evidence binding'))
const evidenceActual = scan(resolve(UNIT, 'evidence'))
const evidenceSorted = [...evidenceRecords].sort((left, right) => string(left.path, 'evidence path').localeCompare(string(right.path, 'evidence path')))
equal(evidenceActual, evidenceSorted, 'evidence inventory')
const packetRecord = object(inventory.packet, 'packet record')
const predecessor = object(inventory.predecessor, 'predecessor record')
const predecessorBefore = object(predecessor.before, 'predecessor before')
const predecessorAfter = object(predecessor.after, 'predecessor after')
const diffRecord = object(inventory.diff, 'predecessor diff')
const additionsRecord = object(inventory.additions, 'additions diff')
const inventoryRecord = { path: 'tmp/units/aggregate-capacity-g2-control/final-source-inventory.json', hash: '15f01005e2911617ef95f150f79f4fdca5c0eb32a1b280019e3cb7562f2ac26d', bytes: 21777 }
const inventoryBindings = [packetRecord, ...sourceRecords, ...inputRecords, ...packetBindingRecords, ...preparedRecords, ...evidenceRecords, predecessorBefore, predecessorAfter, diffRecord, additionsRecord, inventoryRecord]
const uniqueBindings = new Map<string, JsonRecord>()
for (const entryValue of inventoryBindings) {
	const entry = object(entryValue, 'inventory binding')
	const path = string(entry.path, 'inventory binding.path')
	const previous = uniqueBindings.get(path)
	if (previous !== undefined) equal(entry, previous, `duplicate inventory binding ${path}`)
	else uniqueBindings.set(path, entry)
}
const snapshots = Array.from(uniqueBindings.values()).map((entry) => binding(entry))
const packet = object(readJson(PACKET), 'packet')
const packetBytes = readFileSync(PACKET)
const canonicalPacket = Buffer.from(`${JSON.stringify(buildPacket(), null, 2)}\n`, 'utf8')
if (!packetBytes.equals(canonicalPacket)) throw new Error('Exact packet byte rebuild mismatch')
equal(packet.bindings, inventory.bindings, 'packet/inventory bindings')
const packetHash = digest(packetBytes)
if (packetHash !== string(packetRecord.hash, 'inventory packet hash') || packetBytes.byteLength !== packetRecord.bytes) throw new Error('Packet identity mismatch')
const operatorBindings = OPERATOR_FILES.map((name) => readFileBinding(resolve(UNIT, name)))
const operatorJSON = JSON.stringify(operatorBindings)
const operatorHash = computeHash(operatorJSON)
if (operatorHash !== string(object(inventory.operator, 'operator inventory').hash, 'operator hash') || operatorHash !== string(packet.operator, 'packet operator')) throw new Error('Operator identity mismatch')
if (Buffer.byteLength(operatorJSON, 'utf8') !== object(inventory.operator, 'operator inventory').bytes) throw new Error('Operator byte count mismatch')
const vectors = array(packet.vectors, 'packet vectors').map((entry) => object(entry, 'vector'))
for (const vector of vectors) {
	const id = string(vector.id, 'vector id')
	const bytes = readFileSync(resolve(UNIT, 'prepared', `${id}.request.bin`))
	if (bytes.toString('utf8') !== string(vector.body, 'vector body') || digest(bytes) !== vector.hash || bytes.byteLength !== vector.bytes) throw new Error(`Prepared body mismatch: ${id}`)
}
const predecessorDirectory = resolve(ROOT, 'tmp/units/aggregate-capacity-probe')
const actualPredecessor = readdirSync(predecessorDirectory, { recursive: true, withFileTypes: true })
	.filter((entry) => entry.isFile())
	.map((entry) => {
		const path = resolve(entry.parentPath, entry.name)
		const bytes = readFileSync(path)
		return { path: relative(predecessorDirectory, path).split(sep).join('/'), hash: digest(bytes), bytes: bytes.byteLength }
	})
	.sort((left, right) => left.path.localeCompare(right.path))
const beforeInventory = array(readJson(resolve(UNIT, 'predecessor-before.json')), 'predecessor baseline')
const afterInventory = array(readJson(resolve(UNIT, 'predecessor-after.json')), 'predecessor final')
equal(beforeInventory, afterInventory, 'predecessor before/after')
const prefixCustody = object(readJson(resolve(outputRoot, 'log-prefix-custody.json')), 'live-log prefix custody')
if (prefixCustody.files !== beforeInventory.length || prefixCustody.nonLogFiles !== beforeInventory.length - 2 || prefixCustody.nonLogUnchanged !== true) throw new Error('Predecessor non-log custody mismatch')
const logNames = ['daemon.err', 'daemon.log']
const expectedLogs = beforeInventory.filter((entry) => logNames.includes(string(object(entry, 'predecessor row').path, 'predecessor path'))).map((entry) => object(entry, 'expected log row'))
const actualLogs = actualPredecessor.filter((entry) => logNames.includes(string(entry.path, 'actual predecessor path')))
const reportedLogs = array(prefixCustody.logs, 'log prefix rows').map((entry) => object(entry, 'log prefix row'))
if (expectedLogs.length !== 2 || actualLogs.length !== 2 || reportedLogs.length !== 2) throw new Error('Expected exactly two active-log custody rows')
for (const expected of expectedLogs) {
	const path = string(expected.path, 'expected log path')
	const actual = actualLogs.find((entry) => entry.path === path)
	const reported = reportedLogs.find((entry) => entry.path === path)
	if (actual === undefined || reported === undefined) throw new Error('Missing active-log custody: ' + path)
	if (actual.bytes !== reported.actualBytes || actual.hash !== reported.actualHash || expected.bytes !== reported.baselineBytes || expected.hash !== reported.baselineHash || reported.prefixHash !== expected.hash || reported.actualBytes < expected.bytes || reported.appendedBytes !== reported.actualBytes - expected.bytes) throw new Error('Active-log prefix custody mismatch: ' + path)
}
const nonLogs = actualPredecessor.filter((entry) => !logNames.includes(string(entry.path, 'actual path')))
const expectedNonLogs = beforeInventory.filter((entry) => !logNames.includes(string(object(entry, 'predecessor row').path, 'predecessor path')))
equal(nonLogs, expectedNonLogs, 'non-log predecessor custody')
const preSnapshot = snapshots

const node = process.execPath
run('strict-types', node, [resolve(rootPath(), 'node_modules/typescript/bin/tsc'), '-p', resolve(UNIT, 'tsconfig.json')], 0)
const inventoriedSources = array(inventory.sources, 'source inventory').map((entry) => object(entry, 'source binding')).map((entry) => string(entry.path, 'source path')).filter((path) => path.endsWith('.ts'))
for (const source of inventoriedSources) run(`syntax-${source.split('/').at(-1)}`, node, ['--check', resolve(ROOT, source)], 0)
run('proof-copy-syntax', node, ['--check', proofFile], 0)
run('proof-entry-syntax', node, ['--check', proofEntry], 0)
const witnessNegative = resolve(UNIT, 'witness-negative.ts')
run('witness-negative', node, [witnessNegative], 3, (stdout, stderr) => {
	if (!stdout.includes('"global":1,"native":0') || !stderr.includes('Offline witness refuses fetch before native dispatch')) throw new Error('Witness-negative assertion mismatch')
})
const witnessUrl = pathToFileURL(resolve(UNIT, 'witness.ts')).href
for (const entry of ['main.ts', 'prepare.ts', 'execute.ts', 'start.ts']) {
	run(`default-${entry}`, node, ['--import', witnessUrl, resolve(UNIT, entry)], 0, (stdout) => {
		const lines = stdout.trim().split(/\r?\n/)
		const first = object(JSON.parse(lines[0] ?? ''), 'default status')
		const second = object(JSON.parse(lines[1] ?? ''), 'witness status')
		if (first.offline !== true || second.global !== 0 || second.native !== 0 || second.witness !== true) throw new Error(`Default witness mismatch: ${entry}`)
	})
}
run('population-proof', node, [proofEntry], 0, (stdout) => {
	if (!stdout.includes('"pass":true') || !stdout.includes('"global":0,"native":0')) throw new Error('Population proof summary mismatch')
})

const receiptPath = resolve(ROOT, 'tmp/units/aggregate-capacity-probe/daemon-start.json')
const receiptHash = digest(readFileSync(receiptPath))
const positiveOutput = resolve(UNIT, 'evidence/independent-admission-never-created')
if (existsSync(positiveOutput)) throw new Error('Positive admission output is occupied')
const witness = new NetworkWitness()
const originalFetch = globalThis.fetch
let globalDispatches = 0
globalThis.fetch = async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
	globalDispatches += 1
	throw new Error('Verifier refuses HTTP during admission proof')
}
let admitted: ReturnType<typeof validateExecution>
try {
	const options: ExecutionOptions = { packet: packetHash, operator: operatorHash, receipt: receiptPath, custody: receiptHash, output: positiveOutput, host: HOST }
	admitted = validateExecution(options)
} finally {
	globalThis.fetch = originalFetch
	witness.close()
}
if (existsSync(positiveOutput) || globalDispatches !== 0 || witness.count !== 0) throw new Error('Positive admission created output or dispatched')
const positiveEvidence = { admitted: true, packet: packetHash, operator: operatorHash, receipt: { path: relative(ROOT, receiptPath).split(sep).join('/'), hash: receiptHash, bytes: readFileSync(receiptPath).byteLength, pid: admitted.receipt.pid }, host: HOST, output: relative(ROOT, positiveOutput).split(sep).join('/'), outputExists: existsSync(positiveOutput), dispatches: { global: globalDispatches, native: witness.count } }
writeFileSync(resolve(outputRoot, 'positive-admission.json'), `${JSON.stringify(positiveEvidence, null, 2)}\n`, { flag: 'wx' })

const afterBindings = Array.from(uniqueBindings.values()).map((entry) => binding(entry))
equal(afterBindings, preSnapshot, 'bound-file mutation during verifier work')
const finalEvidence = {
	packet: { path: packetRecord.path, hash: packetHash, bytes: packetBytes.byteLength, rebuilt: true },
	operator: { hash: operatorHash, bytes: Buffer.byteLength(operatorJSON, 'utf8'), files: operatorBindings },
	sources: sourceRecords,
	inputs: inputRecords,
	packetBindings: packetBindingRecords,
	prepared: preparedActual,
	evidence: evidenceActual,
	inventory: inventoryRecord,
	predecessor: { files: beforeInventory.length, unchanged: true, before: predecessorBefore, after: predecessorAfter },
	boundPaths: { count: snapshots.length, before: snapshots, after: afterBindings, unchanged: true },
	proof: { original: relative(ROOT, resolve(UNIT, 'Offline.ts')).split(sep).join('/'), adapted: relative(ROOT, proofFile).split(sep).join('/'), diff: relative(ROOT, diffFile).split(sep).join('/'), entry: relative(ROOT, proofEntry).split(sep).join('/'), dispatches: { global: 0, native: 0 } },
	positiveAdmission: positiveEvidence,
	gates: records,
	host: { node: process.version, platform: process.platform }
}
writeFileSync(resolve(outputRoot, 'verification.json'), `${JSON.stringify(finalEvidence, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ verification: relative(ROOT, resolve(outputRoot, 'verification.json')).split(sep).join('/'), packet: packetHash, operator: operatorHash, boundPaths: snapshots.length, sources: sourceRecords.length, inputs: inputRecords.length, packetBindings: packetBindingRecords.length, prepared: preparedActual.length, sourceInventory: evidenceActual.length, gates: records.length, proof: 'pass', positiveAdmission: true, global: 0, native: 0 }))

function rootPath(): string {
	return process.cwd()
}
