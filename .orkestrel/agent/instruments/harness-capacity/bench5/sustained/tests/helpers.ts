import type { SustainedFixture, SustainedExploratoryFixture } from './types.js'
import type { Peer } from './Peer.js'
import { writeDeploymentFixture } from '../../matrix/tests/helpers.js'
import { writeDevelopmentFixture, writeDevelopmentSeed } from '../../tests/refit/helpers.js'
import { HARNESS } from '../../constants.js'
import { readFrozen } from '../../matrix/helpers.js'
import {
	isRefitAttempt,
	isRefitCorpus,
	isRefitGeneration,
	isRefitItem,
} from '../../refit/validators.js'
import { computeDigest, readRows } from '../../helpers.js'
import { readSustainedPreparation, readSustainedRun } from '../parsers.js'
import { readWorkload } from '../../build/helpers.js'
import { inspectOracle, readOracle, readRuntime } from '../../endurance/helpers.js'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { isRecord } from '@orkestrel/contract'
import { BUILD } from '../../constants.js'
import { readJSON } from '../../helpers.js'
import { hashFile, readRefitAssessment } from '../../refit/helpers.js'
import { SUSTAINED_CONTROLS } from '../audit/constants.js'
import { isSustainedKeys } from '../audit/validators.js'
import {
	readClassification,
	readSustainedSelection,
	readSustainedPolicy,
	readSustainedExploration,
} from '../helpers.js'
import {
	isSustainedClassification,
	isSustainedSelection,
	isSustainedCandidate,
} from '../validators.js'
import { isMatrixRequest } from '../../matrix/validators.js'

/** Proves successful filing admission against authentic and altered retained evidence.
 * @param directory - Parent for distinct retained negative controls
 * @param path - Authentic completed filing classification
 */
export function verifyClassificationFixture(directory: string, path: string): void {
	const reference = hashFile(path)
	const classification = readJSON(path)
	assert.ok(isSustainedClassification(classification))
	assert.deepEqual(
		readClassification(reference, classification.runtime, classification.frozen),
		classification,
	)
	const run = classification.files.find((file) => file.path.endsWith('run.json'))
	assert.ok(run)
	const metadata = readJSON(run.path)
	assert.ok(isRecord(metadata) && typeof metadata.tokens === 'number')
	const requestPath = join(dirname(run.path), 'requests.jsonl')
	const requests = readRows(requestPath)
	assert.ok(requests.every(isMatrixRequest))
	const first = requests[0]
	assert.ok(first && isRecord(first.request) && first.response !== undefined)
	mkdirSync(directory, { recursive: true })
	for (const fault of ['length', 'truncated', 'model', 'counts']) {
		const output = mkdtempSync(join(directory, fault + '-'))
		const response = first.response
			.split(/\r\n|\n/)
			.filter((line) => line.trim() !== '')
			.map((line) => {
				const value: unknown = JSON.parse(line)
				assert.ok(isRecord(value))
				return JSON.stringify(
					value.done === true && (fault === 'length' || fault === 'truncated')
						? {
								...value,
								done_reason: 'length',
								...(fault === 'truncated' ? { truncated: true } : {}),
							}
						: value,
				)
			})
			.join('\n')
		const altered = {
			...first,
			request: fault === 'model' ? { ...first.request, model: 'foreign-model' } : first.request,
			response,
			reason: fault === 'length' || fault === 'truncated' ? 'length' : first.reason,
			failures: [],
		}
		const retained = join(output, 'requests.jsonl')
		writeFileSync(
			retained,
			[altered, ...requests.slice(1)].map((request) => JSON.stringify(request)).join('\n') + '\n',
		)
		const info = join(output, 'run.json')
		writeFileSync(
			info,
			JSON.stringify({ ...metadata, tokens: metadata.tokens + (fault === 'counts' ? 1 : 0) }),
		)
		const manifest = join(output, 'classification.json')
		writeFileSync(
			manifest,
			JSON.stringify({
				...classification,
				files: classification.files.map((file) =>
					file.path === run.path
						? hashFile(info)
						: file.path === requestPath
							? hashFile(retained)
							: file,
				),
			}),
		)
		if (fault === 'length') {
			assert.deepEqual(
				readClassification(hashFile(manifest), classification.runtime, classification.frozen),
				readJSON(manifest),
			)
		} else {
			assert.throws(
				() => readClassification(hashFile(manifest), classification.runtime, classification.frozen),
				/classification raw usage or completion is invalid/,
				fault,
			)
		}
	}
}

/** Runs the actual emitted command while the loopback fixture continues serving.
 * @param entry - Built bench5 entrypoint
 * @param args - Exact command arguments
 * @param refusal - Required error evidence for a negative control
 * @returns The actual child exit status
 */
export async function runCommand(
	entry: string,
	args: readonly string[],
	refusal?: RegExp,
): Promise<number> {
	const child = spawn(process.execPath, [join(BUILD, 'bench5', `${entry}.js`), ...args], {
		stdio: ['ignore', 'inherit', 'pipe'],
	})
	let errors = ''
	child.stderr.on('data', (chunk: Buffer) => {
		errors += chunk.toString('utf8')
	})
	child.stderr.pipe(process.stderr)
	const code = await new Promise<number>((resolveCode, reject) => {
		child.once('error', reject)
		child.once('exit', (status) => resolveCode(status ?? 1))
	})
	if (refusal !== undefined) assert.match(errors, refusal)
	return code
}

/** Writes deliberately inert synthetic-fixture labels; these have no model-quality meaning.
 * @param packetPath - The real emitted packet
 * @param keysPath - The fixture-only private joins
 * @param out - A new fixture adjudication file
 * @param miss - Whether to deliberately miss the prefrozen controls
 */
export function writeFixtureLabels(
	packetPath: string,
	keysPath: string,
	out: string,
	miss = false,
): void {
	const packet = readJSON(packetPath)
	const keys = readJSON(keysPath)
	if (!isRecord(packet) || !Array.isArray(packet.items) || !isSustainedKeys(keys))
		throw new Error('invalid fixture packet')
	const labels = packet.items.map((item: unknown) => {
		if (
			!isRecord(item) ||
			typeof item.id !== 'string' ||
			typeof item.product !== 'string' ||
			!isRecord(item.rubric) ||
			!Array.isArray(item.rubric.atoms) ||
			!Array.isArray(item.rubric.critical) ||
			!Array.isArray(item.rubric.obligations)
		)
			throw new Error('invalid fixture item')
		const control = keys.keys.find((key) => key.id === item.id)?.control
		const ambiguous = !miss && control?.verdict === 'ambiguous'
		const evidence = [`product|${item.product.slice(0, 80)}`]
		return {
			id: item.id,
			atoms: item.rubric.atoms.map((atom: unknown) => {
				if (!isRecord(atom) || typeof atom.id !== 'string') throw new Error('invalid atom')
				return { id: atom.id, verdict: ambiguous ? 'ambiguous' : 'fail', evidence }
			}),
			critical: item.rubric.critical.map((rule: unknown) => ({
				rule,
				violated:
					!miss &&
					control !== undefined &&
					control.verdict !== 'ambiguous' &&
					rule === SUSTAINED_CONTROLS[control.verdict],
				evidence,
			})),
			obligations: item.rubric.obligations.map((id: unknown) => ({
				id,
				disposition: 'missed',
				evidence,
			})),
			ambiguous: ambiguous ? evidence : [],
			leaks: [],
		}
	})
	writeFileSync(
		out,
		JSON.stringify({
			authority: 'root-adjudicated',
			packet: hashFile(packetPath).hash,
			keys: hashFile(keysPath).hash,
			labels,
		}),
		{ flag: 'wx' },
	)
}

/** Produces fresh protocol prerequisites shared by continuous-run and fault proofs.
 * @param directory - Owned create-only fixture root
 * @param url - Real sustained protocol peer
 * @param matrixUrl - Real matrix protocol peer
 * @returns Exact prerequisite paths and the retained classification identity
 */
export async function prepareRuntimeFixture(
	directory: string,
	url: string,
	matrixUrl: string,
): Promise<SustainedFixture> {
	const workload = resolve('tmp/units/aggregate-runtime-workload-audit-2')
	const runtime = join(workload, 'runtime/development.json')
	const frozenPath = join(directory, 'freeze/manifest.json')
	const resourcePath = join(directory, 'resource/manifest.json')
	const classificationPath = join(directory, 'filing/classification.json')
	for (const name of ['development', 'evaluation'])
		assert.deepEqual(
			inspectOracle(
				readRuntime(join(workload, 'runtime', `${name}.json`)),
				readOracle(join(workload, 'private', `${name}.json`)),
			),
			[],
		)
	writeFileSync(join(directory, 'seed.jsonl'), '')
	assert.equal(
		await runCommand('matrix', [
			'freeze',
			'--deployment',
			writeDeploymentFixture(directory),
			'--key',
			'q4',
			'--think',
			'false',
			'--seed',
			join(directory, 'seed.jsonl'),
			'--settings',
			join(HARNESS, 'bench5/settings.json'),
			'--out',
			join(directory, 'freeze'),
			'--live',
			'--url',
			matrixUrl,
		]),
		0,
	)
	assert.equal(
		await runCommand('matrix', [
			'resource',
			'--frozen',
			frozenPath,
			'--out',
			join(directory, 'resource'),
			'--live',
			'--url',
			matrixUrl,
		]),
		0,
	)
	assert.equal(
		await runCommand('sustained', [
			'filing',
			'--frozen',
			frozenPath,
			'--resource',
			resourcePath,
			'--runtime',
			runtime,
			'--out',
			join(directory, 'filing'),
			'--live',
			'--url',
			url,
		]),
		0,
	)
	const classified = hashFile(join(directory, 'filing/cache/judge.jsonl'))
	assert.equal(readSustainedPreparation(classificationPath)[0]?.phase, 'filing')
	assert.equal(
		readWorkload(hashFile(runtime)).manifest.hash,
		hashFile(join(workload, 'manifest.json')).hash,
	)
	const common = [
		'--frozen',
		frozenPath,
		'--runtime',
		runtime,
		'--classification',
		classificationPath,
		'--model',
		'qwen3.5:4b-q4_K_M',
	]
	const corpusPath = join(directory, 'corpus')
	assert.equal(
		await runCommand('refit', [
			'freeze',
			...common,
			'--cache',
			join(directory, 'filing/cache'),
			'--out',
			corpusPath,
		]),
		0,
	)
	const generated = join(directory, 'generated')
	assert.equal(
		await runCommand('refit', [
			'generate',
			...common,
			'--corpus',
			corpusPath,
			'--cache',
			join(directory, 'generation-cache'),
			'--out',
			generated,
			'--live',
			'--url',
			url,
		]),
		0,
	)
	assert.equal(hashFile(classified.path).hash, classified.hash)
	const corpus = readJSON(join(corpusPath, 'corpus.json'))
	const generation = readJSON(join(generated, 'manifest.json'))
	const attempts = readRows(join(generated, 'attempts.jsonl'))
	const packet = readRows(join(generated, 'packet.jsonl'))
	assert.ok(
		isRefitCorpus(corpus) &&
			isRefitGeneration(generation) &&
			attempts.every(isRefitAttempt) &&
			packet.every(isRefitItem),
	)
	const labels = join(directory, 'fixture-refit-labels.json')
	writeFileSync(
		labels,
		JSON.stringify({
			authority: 'root-adjudicated',
			corpus: generation.corpus,
			attempts: generation.attempts,
			packet: generation.packet,
			manifest: hashFile(join(generated, 'manifest.json')).hash,
			labels: packet.map((item) => ({
				id: item.id,
				item: computeDigest(item),
				verdict: 'supported',
				propositions: [
					{
						text: attempts.find((attempt) => attempt.id === item.id)?.prose ?? '',
						verdict: 'supported',
						evidence: [item.sources[0]?.text ?? ''],
					},
				],
			})),
		}),
	)
	assert.equal(
		await runCommand('refit', [
			'fit',
			...common,
			'--corpus',
			corpusPath,
			'--attempts',
			generated,
			'--labels',
			labels,
			'--out',
			join(directory, 'fitted'),
		]),
		0,
	)
	const fit = join(directory, 'fitted/fit.json')
	const frozen = readFrozen(hashFile(frozenPath))
	const matrixFit = join(directory, 'matrix-fixture-fit.json')
	writeFileSync(
		matrixFit,
		JSON.stringify({
			agree: 0.8,
			change: 0.56,
			separated: true,
			matrix: {
				summarizer: frozen.summarizer,
				judge: frozen.judge,
				files: frozen.files,
				settings: frozen.settings.hash,
				seed: frozen.seed.hash,
			},
		}),
	)
	assert.equal(
		await runCommand('matrix', [
			'pilot',
			'--frozen',
			frozenPath,
			'--resource',
			resourcePath,
			'--fit',
			matrixFit,
			'--out',
			join(directory, 'pilot'),
			'--live',
			'--url',
			matrixUrl,
		]),
		0,
	)
	return {
		workload,
		runtime,
		frozen: frozenPath,
		resource: resourcePath,
		classification: classificationPath,
		classified,
		fit,
	}
}

/** Produces a source-bound exploratory development pair without held-out execution.
 * @param directory - Owned fixture root
 * @param peer - Real sustained protocol boundary
 * @param url - Sustained protocol address
 * @param matrixURL - Matrix protocol address
 * @returns The prepared paths and exploratory policy
 */
export async function prepareExploratoryFixture(
	directory: string,
	peer: Peer,
	url: string,
	matrixURL: string,
): Promise<SustainedExploratoryFixture> {
	const fixture = await prepareRuntimeFixture(directory, url, matrixURL)
	const diagnosis = hashFile(join(directory, 'fitted/diagnosis.json'))
	assert.equal(readRefitAssessment(diagnosis).accepted, true)
	peer.summary.enabled = true
	const prerequisites = [
		'--frozen',
		fixture.frozen,
		'--resource',
		fixture.resource,
		'--runtime',
		fixture.runtime,
		'--classification',
		fixture.classification,
	]
	assert.equal(
		await runCommand('sustained', [
			'development',
			...prerequisites,
			'--pilot',
			join(directory, 'pilot/manifest.json'),
			'--fit',
			fixture.fit,
			'--out',
			join(directory, 'qualified-development'),
			'--live',
			'--url',
			url,
		]),
		3,
	)
	const refused = readSustainedRun(join(directory, 'qualified-development/aggregate/run'))
	assert.ok(
		refused.requests.some(
			(request) => request.role === 'summarizer' && request.reason === 'length',
		),
	)
	assert.ok(refused.failures.length > 0)
	const candidates = [join(directory, 'qualified-development/candidate.json')]
	const matrixSeed = join(directory, 'matrix-seed.jsonl')
	await writeDevelopmentSeed(directory, matrixSeed)
	for (const key of ['g4', 'q2', 'g2']) {
		const base = join(directory, key)
		const frozen = join(base, 'freeze/manifest.json')
		const resource = join(base, 'admission-resource/manifest.json')
		assert.equal(
			await runCommand('matrix', [
				'freeze',
				'--deployment',
				writeDeploymentFixture(directory),
				'--key',
				key,
				'--think',
				'false',
				'--seed',
				matrixSeed,
				'--settings',
				join(HARNESS, 'bench5/settings.json'),
				'--out',
				join(base, 'freeze'),
				'--live',
				'--url',
				matrixURL,
			]),
			0,
		)
		const refusal = await writeDevelopmentFixture(base, frozen)
		assert.equal(readRefitAssessment(refusal.diagnosis).accepted, false)
		const candidate = join(base, 'candidate.json')
		assert.equal(
			await runCommand('sustained', [
				'candidate',
				'--frozen',
				frozen,
				'--resource',
				resource,
				'--refusal',
				refusal.diagnosis.path,
				'--out',
				candidate,
			]),
			3,
		)
		candidates.push(candidate)
	}
	const evaluation = join(fixture.workload, 'runtime/evaluation.json')
	const qualified = join(directory, 'qualified-selection.json')
	assert.equal(
		await runCommand('sustained', [
			'select',
			'--development',
			fixture.runtime,
			'--evaluation',
			evaluation,
			'--seed',
			'17',
			...candidates.flatMap((path) => ['--candidate', path]),
			'--out',
			qualified,
		]),
		3,
	)
	assert.equal(readSustainedSelection(qualified).accepted, false)
	const qualifiedValue = readJSON(qualified)
	assert.ok(isSustainedSelection(qualifiedValue))
	for (const [name, changed] of [
		['accepted', { accepted: true }],
		['incomplete', { candidates: [] }],
		['cyclic', { policy: hashFile(qualified) }],
		['foreign', { development: qualifiedValue.evaluation }],
	] as const) {
		const altered = join(directory, `${name}-prerequisite.json`)
		writeFileSync(altered, JSON.stringify({ ...qualifiedValue, ...changed }))
		const route = join(directory, `${name}-route.json`)
		writeFileSync(route, JSON.stringify({ qualified: hashFile(altered), withhold: true }))
		assert.throws(
			() => readSustainedPolicy(hashFile(route)),
			/refused qualified|ranked feasibility|identities must differ/,
			name,
		)
	}
	const policy = join(directory, 'exploratory-policy.json')
	assert.equal(
		await runCommand('sustained', [
			'policy',
			'--selection',
			qualified,
			'--withhold',
			'--out',
			policy,
		]),
		0,
	)
	assert.equal(readSustainedPolicy(hashFile(policy)).selection.accepted, false)
	const exploration = join(directory, 'exploration.json')
	writeFileSync(
		exploration,
		JSON.stringify({
			matrix: { pilot: hashFile(join(directory, 'pilot/manifest.json')) },
			diagnosis,
		}),
	)
	const lower = readJSON(join(directory, 'g4/candidate.json'))
	assert.ok(isSustainedCandidate(lower) && lower.refusal !== undefined)
	const matrixEvidence = { pilot: hashFile(join(directory, 'pilot/manifest.json')) }
	const admission = {
		policy: hashFile(policy),
		frozen: hashFile(fixture.frozen),
		resource: hashFile(fixture.resource),
	}
	assert.throws(
		() =>
			readSustainedExploration(
				{ ...admission, exploration: { matrix: matrixEvidence } },
				readFrozen(admission.frozen),
			),
		/endurance diagnosis absent/,
	)
	assert.throws(
		() =>
			readSustainedExploration(
				{ ...admission, exploration: { matrix: matrixEvidence, diagnosis: lower.refusal } },
				readFrozen(admission.frozen),
			),
		/endurance generation has foreign/,
	)
	peer.summary = { enabled: true, capped: false, topic: '', counts: new Map() }
	const start = peer.calls.length
	assert.equal(
		await runCommand('sustained', [
			'development',
			...prerequisites,
			'--policy',
			policy,
			'--exploration',
			exploration,
			'--out',
			join(directory, 'exploratory-development'),
			'--live',
			'--url',
			url,
		]),
		0,
	)
	const aggregate = readSustainedRun(join(directory, 'exploratory-development/aggregate/run'))
	assert.deepEqual(aggregate.errors, [])
	assert.deepEqual(aggregate.failures, [])
	const cap = aggregate.requests.find(
		(request) => request.role === 'summarizer' && request.reason === 'length',
	)
	assert.ok(cap && cap.completion === 160 && cap.prompt !== undefined && cap.prompt > 0)
	assert.ok(
		aggregate.requests.some(
			(request) =>
				request.role === 'agent' &&
				request.sent &&
				request.sequence > cap.sequence &&
				request.goal !== cap.goal,
		),
	)
	const leaked = 'Incomplete withheld fixture summary'
	assert.ok(
		!readFileSync(
			join(directory, 'exploratory-development/aggregate/cache/summary.jsonl'),
			'utf8',
		).includes(leaked),
	)
	assert.ok(!JSON.stringify(peer.calls.slice(start)).includes(leaked))
	assert.ok(!JSON.stringify(aggregate.picks).includes(leaked))
	const journal = readRows(
		join(directory, 'exploratory-development/aggregate/run/aggregates.jsonl'),
	)
	const failed = journal.find(
		(row) =>
			isRecord(row) &&
			row.event === 'fail' &&
			String(row.error).includes('local capped summary unavailable'),
	)
	assert.ok(isRecord(failed) && isRecord(failed.prior) && typeof failed.prior.version === 'number')
	const prior = failed.prior.version
	const recovered = journal.find(
		(row) =>
			isRecord(row) &&
			row.topic === failed.topic &&
			row.event === 'build' &&
			typeof row.version === 'number' &&
			row.version > prior,
	)
	assert.ok(isRecord(recovered) && recovered.prior === undefined)
	assert.equal(failed.result, undefined)
	const failedAt = aggregate.rows.findIndex((row) => row.goal === failed.goal)
	const recoveredAt = aggregate.rows.findIndex((row) => row.goal === recovered.goal)
	assert.ok(recoveredAt > failedAt)
	const unavailable = new Set(aggregate.rows.slice(failedAt, recoveredAt).map((row) => row.goal))
	assert.ok(
		aggregate.picks
			.filter((pick) => unavailable.has(pick.goal))
			.every((pick) => !pick.aggregates?.some((binding) => binding.topic === failed.topic)),
	)
	return { ...fixture, policy, evaluation }
}
