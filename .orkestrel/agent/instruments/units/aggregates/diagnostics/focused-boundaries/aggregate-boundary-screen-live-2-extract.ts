import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { computeReplay } from './aggregate-judge-counterfactual/helpers.ts'
import { computeOperator } from './aggregate-boundary-screen/helpers.ts'

const root = process.cwd()
const unit = resolve(root, 'tmp/units/aggregate-boundary-screen')
const output = resolve(unit, 'live-forward-reverse')
const evidencePath = resolve(root, 'tmp/units/aggregate-boundary-screen-live-2-independent-final.json')
const packetPath = resolve(unit, 'prepared-final/packet-final.json')
const planPath = resolve(unit, 'prepared-final/plan-final.json')
const outcomePath = resolve(output, 'outcome.json')

function record(value: unknown, label: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`)
	return value
}
function list(value: unknown, label: string): unknown[] {
	if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
	return value
}
function string(value: unknown, label: string): string {
	if (typeof value !== 'string') throw new Error(`${label} must be a string`)
	return value
}
function number(value: unknown, label: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be finite`)
	return value
}
function json(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'))
}
function hash(bytes: Buffer): string {
	return createHash('sha256').update(bytes).digest('hex')
}
function readHash(path: string): string {
	return hash(readFileSync(path))
}
function key(base: string, suffix: string): string {
	return resolve(output, `${base}.${suffix}`)
}
function nameKey(value: unknown): string {
	return string(record(value, 'sequence item').name, 'sequence.name')
}
function expectedScore(raw: Record<string, unknown>, temperature: number): number {
	const first = record(list(raw.logprobs, 'logprobs')[0], 'first logprobs entry')
	const tokens = new Map<string, number>()
	for (const item of list(first.top_logprobs, 'top_logprobs')) {
		const entry = record(item, 'top logprob')
		tokens.set(string(entry.token, 'token'), number(entry.logprob, 'logprob'))
	}
	const yes = tokens.get('Yes')
	const no = tokens.get('No')
	if (yes === undefined || no === undefined) throw new Error('Exact Yes/No tokens missing')
	const gap = (no - yes) / temperature
	return gap >= 0 ? Math.exp(-gap) / (1 + Math.exp(-gap)) : 1 / (1 + Math.exp(gap))
}
function equal(left: unknown, right: unknown, message: string): void {
	if (JSON.stringify(left) !== JSON.stringify(right)) throw new Error(message)
}

const packet = record(json(packetPath), 'packet')
const plan = record(json(planPath), 'plan')
const outcome = record(json(outcomePath), 'outcome')
const ranking = record(outcome.ranking, 'outcome.ranking')
const custody = record(json(resolve(output, 'custody.json')), 'custody')
const sequence = list(packet.sequence, 'packet.sequence').map((entry) => record(entry, 'sequence entry'))
const checks = list(packet.checks, 'packet.checks').map((entry) => record(entry, 'check'))
const rows = list(packet.rows, 'packet.rows').map((entry) => record(entry, 'row'))
const readings = list(outcome.readings, 'outcome.readings').map((entry) => record(entry, 'reading'))
const renderings = list(packet.rendering, 'packet.rendering').map((entry) => record(entry, 'rendering'))
const renderByName = new Map(renderings.map((entry) => [string(entry.name, 'rendering.name'), string(entry.body, 'rendering.body')]))
const checkByName = new Map(checks.map((entry) => [string(entry.name, 'check.name'), entry]))
const identity = list(JSON.parse(string(packet.identity, 'packet.identity')), 'identity')
const options = record(identity[3], 'identity.options')
const temperature = number(identity[2], 'identity.temperature')
const context = number(options.num_ctx, 'identity.num_ctx')
const prediction = number(options.num_predict, 'identity.num_predict')
const packetHash = readHash(packetPath)
const buildPath = resolve(root, '.orkestrel/agent/instruments/harness/.build/build-manifest.json')
const buildHash = readHash(buildPath)
const operatorHash = computeOperator()
const packetBindings = list(packet.bindings, 'packet.bindings').map((entry) => record(entry, 'binding'))
const bindingResults = packetBindings.map((binding) => {
	const relative = string(binding.path, 'binding.path')
	const path = resolve(root, relative)
	const expected = string(binding.hash, 'binding.hash')
	if (!existsSync(path)) return { path: relative, expected, actual: undefined, matches: false }
	const actual = readHash(path)
	return { path: relative, expected, actual, matches: actual === expected }
})
if (bindingResults.some((entry) => !entry.matches)) throw new Error('At least one frozen packet binding changed')
if (packetHash !== string(record(plan.packet, 'plan.packet').hash, 'plan.packet.hash')) throw new Error('Packet hash differs from plan')
if (buildHash !== string(plan.build, 'plan.build') || operatorHash !== string(packet.operator, 'packet.operator')) throw new Error('Build or operator identity changed')
if (sequence.length !== 88 || readings.length !== sequence.length) throw new Error('Reading sequence length mismatch')
if (number(outcome.modelRequests, 'modelRequests') !== sequence.length || number(outcome.completed, 'completed') !== sequence.length) throw new Error('Declared inference count mismatch')
if (number(outcome.daemonChecks, 'daemonChecks') !== 2) throw new Error('Declared daemon check count mismatch')

const perRequest = []
for (const [index, entry] of sequence.entries()) {
	const ordinal = number(entry.ordinal, 'sequence.ordinal')
	const pass = string(entry.pass, 'sequence.pass')
	const name = nameKey(entry)
	const label = `${String(ordinal).padStart(2, '0')}-${pass}-${name}`
	const expectedBody = renderByName.get(name)
	if (expectedBody === undefined) throw new Error(`Frozen rendering missing: ${name}`)
	const requestPath = key(label, 'request.bin')
	const requestBytes = readFileSync(requestPath)
	if (!requestBytes.equals(Buffer.from(expectedBody, 'utf8'))) throw new Error(`Actual request body differs from frozen body: ${label}`)
	const rawBytes = readFileSync(key(label, 'response.bin'))
	const raw = record(JSON.parse(rawBytes.toString('utf8')), 'raw response')
	const nativeCapture = record(json(key(label, 'response.json')), 'response custody')
	const nativeBody = string(nativeCapture.body, 'response custody body')
	const requestCapture = record(json(key(label, 'request.json')), 'request custody')
	const responseHead = record(json(key(label, 'response-head.json')), 'response head')
	if (number(nativeCapture.status, 'response status') !== 200 || string(nativeCapture.hash, 'response hash') !== hash(rawBytes) || number(nativeCapture.bytes, 'response bytes') !== rawBytes.byteLength || number(responseHead.status, 'head status') !== 200) throw new Error(`Invalid response custody: ${label}`)
	if (string(requestCapture.hash, 'request hash') !== hash(requestBytes) || number(requestCapture.bytes, 'request bytes') !== requestBytes.byteLength || string(requestCapture.body, 'request body') !== expectedBody) throw new Error(`Invalid request custody: ${label}`)
	if (!Buffer.from(nativeBody, 'utf8').equals(rawBytes)) throw new Error(`Raw response custody mismatch: ${label}`)
	const native = record(json(key(label, 'normalized.json')), 'normalized result')
	const result = record(native.result, 'normalized result.result')
	if (native.availability !== 'present' || result.model !== packet.identity) throw new Error(`Native completion/model mismatch: ${label}`)
	const answers = record(result.answers, 'answers')
	const agree = record(answers.agree, 'answers.agree')
	const library = number(agree.noul, 'native score')
	const replayEvidence = record(json(key(label, 'replay.json')), 'replay evidence')
	const replay = number(replayEvidence.replay, 'stored replay')
	const independent = expectedScore(raw, temperature)
	const helperReplay = computeReplay(raw, temperature)
	const reading = readings[index]
	if (number(reading.ordinal, 'reading.ordinal') !== ordinal || reading.pass !== pass || reading.name !== name) throw new Error(`Reading order mismatch: ${label}`)
	const score = number(reading.score, 'reading.score')
	const rawScore = number(replayEvidence.library, 'stored native score')
	if (Math.abs(independent - helperReplay) > 1e-12 || Math.abs(independent - replay) > 1e-12 || Math.abs(independent - library) > 1e-12 || Math.abs(independent - rawScore) > 1e-12 || Math.abs(independent - score) > 1e-12) throw new Error(`Native/raw/replay score disagreement: ${label}`)
	if (number(raw.eval_count, 'raw eval_count') !== prediction || raw.done !== true) throw new Error(`Completion count/finish mismatch: ${label}`)
	const usage = record(result.usage, 'normalized usage')
	const prompt = number(usage.prompt, 'usage.prompt')
	const completion = number(usage.completion, 'usage.completion')
	const total = number(usage.total, 'usage.total')
	if (number(raw.prompt_eval_count, 'raw prompt_eval_count') !== prompt || number(raw.eval_count, 'raw eval_count') !== completion || total !== prompt + completion || total >= context) throw new Error(`Usage mismatch or context ceiling: ${label}`)
	const responseModel = typeof raw.model === 'string' ? raw.model : undefined
	if (responseModel !== identity[0]) throw new Error(`Raw model identity mismatch: ${label}`)
	const cacheKeys = ['prompt_eval_cached_count', 'cache_read_input_tokens', 'cache_creation_input_tokens', 'cached_tokens', 'prompt_cache_hit_tokens']
	const cacheUsage = Object.fromEntries(cacheKeys.map((field) => [field, typeof raw[field] === 'number' ? raw[field] : undefined]))
	const promptCached = cacheUsage.prompt_eval_cached_count
	if (typeof promptCached === 'number' && (promptCached < 0 || promptCached > prompt)) throw new Error(`Invalid cached prompt usage: ${label}`)
	perRequest.push({ ordinal, pass, name, label, bodyBytes: requestBytes.byteLength, bodyHash: hash(requestBytes), responseBytes: rawBytes.byteLength, responseHash: hash(rawBytes), model: responseModel, token: raw.response, finish: raw.done_reason, score, replay: independent, library: library, difference: independent - library, prompt, completion, total, context, cacheUsage, wallMs: number(reading.wall, 'reading.wall') })
}

const computedStatistics = []
for (const pass of ['forward', 'reverse']) for (const row of rows) {
	const rowId = string(row.id, 'row.id')
	const components = readings.filter((reading) => reading.pass === pass && reading.row === rowId)
	const scores = components.map((reading) => ({ name: string(reading.name, 'reading.name'), score: number(reading.score, 'reading.score') }))
	const minimum = Math.min(...scores.map((entry) => entry.score))
	const controls = scores.filter((entry) => entry.score === minimum).map((entry) => entry.name)
	const label = components.length === 0 ? undefined : components[0].label
	computedStatistics.push({ row: rowId, pass, label, score: minimum, controls, components: scores })
}
const frozenStatistics = list(ranking.statistics, 'ranking.statistics').map((entry) => record(entry, 'ranking statistic'))
if (frozenStatistics.length !== computedStatistics.length) throw new Error('Statistic membership count mismatch')
for (const [index, computed] of computedStatistics.entries()) {
	const stored = frozenStatistics[index]
	if (stored.row !== computed.row || stored.pass !== computed.pass || number(stored.score, 'stored statistic score') !== computed.score) throw new Error('Stored statistic differs from independent minimum')
}
const pairs = list(packet.pairs, 'packet.pairs').map((entry) => record(entry, 'pair'))
const pairResults = pairs.map((pair) => {
	const boundary = string(pair.boundary, 'pair.boundary')
	const supported = string(pair.supported, 'pair.supported')
	const unsafe = string(pair.unsafe, 'pair.unsafe')
	return { boundary, supported, unsafe, passes: ['forward', 'reverse'].map((pass) => {
		const positive = computedStatistics.find((stat) => stat.pass === pass && stat.row === supported)
		const negative = computedStatistics.find((stat) => stat.pass === pass && stat.row === unsafe)
		if (positive === undefined || negative === undefined) throw new Error('Pair statistic missing')
		return { pass, supportedMinimum: positive.score, supportedControls: positive.controls, unsafeMinimum: negative.score, unsafeControls: negative.controls, exceeds: positive.score > negative.score }
	}) }
})
const anchor = record(packet.anchor, 'anchor')
const supportedAnchor = record(anchor.supported, 'supported anchor')
const unsafeAnchor = record(anchor.unsupported, 'unsupported anchor')
const anchorResults = ['forward', 'reverse'].map((pass) => {
	const findFocus = (row: string, start: number, end: number) => checks.find((check) => {
		if (check.row !== row || typeof check.focus !== 'object' || check.focus === null || Array.isArray(check.focus)) return false
		const focus = record(check.focus, 'focus')
		return focus.start === start && focus.end === end
	})
	const positiveCheck = findFocus(string(supportedAnchor.id, 'anchor supported id'), number(supportedAnchor.start, 'anchor start'), number(supportedAnchor.end, 'anchor end'))
	const negativeCheck = findFocus(string(unsafeAnchor.id, 'anchor unsupported id'), number(unsafeAnchor.start, 'anchor start'), number(unsafeAnchor.end, 'anchor end'))
	if (positiveCheck === undefined || negativeCheck === undefined) throw new Error('Original focus check absent')
	const positive = readings.find((reading) => reading.pass === pass && reading.name === positiveCheck.name)
	const negative = readings.find((reading) => reading.pass === pass && reading.name === negativeCheck.name)
	if (positive === undefined || negative === undefined) throw new Error('Original focus reading absent')
	return { pass, supportedName: positive.name, supportedScore: number(positive.score, 'anchor supported score'), unsupportedName: negative.name, unsupportedScore: number(negative.score, 'anchor unsupported score'), exceeds: number(positive.score, 'anchor supported score') > number(negative.score, 'anchor unsupported score') }
})
const daemon = record(json(resolve(output, 'daemon-comparison.json')), 'daemon comparison')
const daemonStart = record(daemon.start, 'daemon start')
const daemonEnd = record(daemon.end, 'daemon end')
const daemonStartRecord = record(json(resolve(output, 'daemon-start.json')), 'daemon start record')
const daemonEndRecord = record(json(resolve(output, 'daemon-end.json')), 'daemon end record')
if (string(daemonStartRecord.hash, 'daemon start hash') !== string(daemonEndRecord.hash, 'daemon end hash')) throw new Error('Daemon identity changed during run')
const artifactCounts = Object.fromEntries(['request.bin', 'response.bin', 'replay.json', 'normalized.json'].map((suffix) => [suffix, readdirSync(output).filter((entry) => entry.endsWith(`.${suffix}`)).length]))
if (Object.values(artifactCounts).some((count) => count !== sequence.length)) throw new Error('Artifact membership count differs from fixed sequence')
const expectedStatus = pairResults.every((pair) => pair.passes.every((pass) => pass.exceeds)) && anchorResults.every((entry) => entry.exceeds) ? 'passed' : 'refused'
if (outcome.complete !== true || outcome.status !== expectedStatus || ranking.status !== expectedStatus) throw new Error('Outcome classification differs from independent reduction')
if (existsSync(evidencePath)) throw new Error('Independent evidence output already exists')
const evidence = {
	classification: { complete: outcome.complete, status: outcome.status, independentStatus: expectedStatus, interpretation: string(outcome.interpretation, 'interpretation') },
	identities: { packet: { path: 'tmp/units/aggregate-boundary-screen/prepared-final/packet-final.json', sha256: packetHash }, operator: operatorHash, build: buildHash, modelIdentity: packet.identity, model: identity[0], modelDigest: packet.digest, bindingCount: bindingResults.length, bindings: bindingResults, host: custody.host },
	requests: { expected: sequence.length, actual: perRequest.length, exactBodyMatches: perRequest.length, records: perRequest },
	usage: { context, prediction, promptTotal: perRequest.reduce((sum, item) => sum + item.prompt, 0), completionTotal: perRequest.reduce((sum, item) => sum + item.completion, 0), cacheFieldsReported: perRequest.some((item) => Object.values(item.cacheUsage).some((value) => value !== undefined)), promptCachedTotal: perRequest.reduce((sum, item) => sum + (typeof item.cacheUsage.prompt_eval_cached_count === 'number' ? item.cacheUsage.prompt_eval_cached_count : 0), 0), promptCachedReported: perRequest.filter((item) => typeof item.cacheUsage.prompt_eval_cached_count === 'number').length, promptNonCachedTotal: perRequest.reduce((sum, item) => sum + item.prompt - (typeof item.cacheUsage.prompt_eval_cached_count === 'number' ? item.cacheUsage.prompt_eval_cached_count : 0), 0), note: 'prompt_eval_cached_count is reported separately as a subset of prompt_eval_count; it is not added a second time.' },
	daemon: { checks: number(outcome.daemonChecks, 'daemonChecks'), start: daemonStart, end: daemonEnd, startRecord: daemonStartRecord, endRecord: daemonEndRecord },
	statistics: computedStatistics,	pairs: pairResults, originalFocus: anchorResults,
	status: { modelRequests: outcome.modelRequests, completed: outcome.completed, daemonChecks: outcome.daemonChecks, outputFiles: readdirSync(output).length, artifactCounts }
}
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ evidence: evidencePath, status: expectedStatus, complete: outcome.complete, requests: perRequest.length, exactBodyMatches: perRequest.length, bindings: bindingResults.length, pairs: pairResults.length, statistics: computedStatistics.length, operator: operatorHash, packet: packetHash, build: buildHash, promptTotal: evidence.usage.promptTotal, completionTotal: evidence.usage.completionTotal, cacheReported: evidence.usage.cacheFieldsReported }))

