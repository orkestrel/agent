import type { MatrixDevelopment, MatrixExecution, MatrixRun } from '../matrix/types.js'
import type { Config, RunArm } from '../types.js'
import { it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isRecord } from '@orkestrel/contract'
import { Driver, parseFlags, readCopy } from '../Driver.js'
import { HARNESS, COPIES_DIR, MICA_MODEL, MICA_SYSTEM } from '../constants.js'
import { readJSON, readRows } from '../helpers.js'
import { hashFile, readRefitAssessment, selectMajorityCutoff } from '../refit/helpers.js'
import { readSustainedMatrix, verifyMatrixRefusal } from '../sustained/helpers.js'
import { Matrix } from '../matrix/Matrix.js'
import { Comparison } from '../matrix/Comparison.js'
import { writeDeploymentFixture } from '../matrix/tests/helpers.js'
import { parseMatrixRun } from '../matrix/parsers.js'
import {
	isMatrixDevelopment,
	isMatrixExecution,
	isMatrixRequest,
	isMatrixResource,
} from '../matrix/validators.js'
import {
	readExecution,
	readResource,
	readDevelopment,
	readFrozen,
	readAttempt,
	isParserRequest,
	isStoppedRequest,
	permitsReserve,
	permitsContinuation,
	verifyMatrixFeasibility,
	listMatrixPairFailures,
	measureMatrixCosts,
	matchesMatrixExposure,
	readRequestOutcome,
} from '../matrix/helpers.js'
import { MatrixPeer } from './matrixFixture.js'
import { JudgeCache } from '../JudgeCache.js'
import { createOllamaJudge } from '../../vendor/ollama/index.js'
import { writeDevelopmentFixture, writeDevelopmentSeed } from './refit/helpers.js'
import { readSustainedPreparation } from '../sustained/parsers.js'
import { collectPreparations } from '../sustained/audit/helpers.js'

it('admits shared thinking calibration and own-model generation while refusing forged fresh custody', async () => {
	const parent = resolve('tmp/units/aggregate-exploration-admission-fixtures')
	mkdirSync(parent, { recursive: true })
	const directory = mkdtempSync(join(parent, 'custody-'))
	const peer = new MatrixPeer()
	peer.support = true
	peer.agreement = 0.75
	const url = await peer.start()
	try {
		const seed = join(directory, 'seed.jsonl')
		await writeDevelopmentSeed(directory, seed)
		let shared: MatrixDevelopment | undefined
		for (const [key, think] of [
			['q2', false],
			['q2', true],
			['q4', false],
		] as const) {
			const cell = join(directory, `${key}-${think}`)
			mkdirSync(cell)
			const path = join(cell, 'freeze/manifest.json')
			assert.equal(
				await Matrix.execute([
					'freeze',
					'--deployment',
					writeDeploymentFixture(cell),
					'--key',
					key,
					'--think',
					String(think),
					'--seed',
					seed,
					'--settings',
					join(HARNESS, 'bench5/settings.json'),
					'--out',
					join(cell, 'freeze'),
					'--live',
					'--url',
					url,
				]),
				0,
			)
			const frozen = readFrozen(hashFile(path))
			let policy: MatrixDevelopment
			if (think) {
				assert.ok(shared)
				const resource = join(cell, 'resource/manifest.json')
				assert.equal(
					await Matrix.execute([
						'resource',
						'--frozen',
						path,
						'--out',
						join(cell, 'resource'),
						'--live',
						'--url',
						url,
					]),
					0,
				)
				await Matrix.execute([
					'full',
					'--frozen',
					path,
					'--resource',
					resource,
					'--out',
					join(cell, 'full'),
					'--live',
					'--url',
					url,
				])
				const measured = readResource(hashFile(resource), hashFile(path))
				const full = readJSON(join(cell, 'full/manifest.json'))
				assert.ok(measured.budget && isMatrixResource(full) && full.attempts[0])
				policy = {
					...shared,
					frozen: hashFile(path),
					resource: hashFile(resource),
					full: hashFile(join(cell, 'full/manifest.json')),
					paired: measured.budget,
					expanded: full.attempts[0].budget,
				}
			} else policy = await writeDevelopmentFixture(cell, path)
			const policyPath = join(cell, 'policy.json')
			writeFileSync(policyPath, JSON.stringify(policy))
			const execution: MatrixExecution = {
				protocol: 'l6',
				phase: 'development',
				key,
				think,
				arm: 'aggregate',
				copy: 1,
				frozen: hashFile(path),
				budget: policy.paired,
				development: hashFile(policyPath),
			}
			assert.deepEqual(readDevelopment(execution, frozen), policy)
			verifyMatrixRefusal(policy.diagnosis, frozen)
			if (shared !== undefined) {
				const foreign = join(cell, 'foreign-policy.json')
				writeFileSync(
					foreign,
					JSON.stringify(
						think
							? { ...policy, resource: shared.resource }
							: {
									...policy,
									calibration: shared.calibration,
									diagnosis: shared.diagnosis,
									generation: shared.generation,
									labels: shared.labels,
									packet: shared.packet,
								},
					),
				)
				assert.throws(
					() => readDevelopment({ ...execution, development: hashFile(foreign) }, frozen),
					think ? /resource|cell|frozen/ : /calibration summarizer/,
				)
			}
			if (key === 'q2' && !think) {
				shared = policy
				for (const [name, changed] of [
					['cutoff', { agree: 0.51 }],
					['labels', { labels: policy.packet }],
					['generation', { generation: policy.labels }],
					['packet', { packet: policy.labels }],
					['budget', { paired: { ...policy.paired, reserve: policy.paired.reserve + 1 } }],
					['full', { full: policy.resource }],
				] as const) {
					const changedPath = join(cell, `${name}.json`)
					writeFileSync(changedPath, JSON.stringify({ ...policy, ...changed }))
					assert.throws(
						() => readDevelopment({ ...execution, development: hashFile(changedPath) }, frozen),
						/calibration|policy|budget|bound/,
						name,
					)
				}
				const malformed = join(cell, 'malformed-generation.json')
				writeFileSync(malformed, '{')
				const malformedPolicy = join(cell, 'malformed-policy.json')
				writeFileSync(
					malformedPolicy,
					JSON.stringify({ ...policy, generation: hashFile(malformed) }),
				)
				assert.throws(
					() => readDevelopment({ ...execution, development: hashFile(malformedPolicy) }, frozen),
					SyntaxError,
				)
				for (const [name, changed] of [
					['model', { summarizer: { ...frozen.summarizer, model: 'foreign' } }],
					['digest', { summarizer: { ...frozen.summarizer, digest: '0'.repeat(64) } }],
					['seed', { seed: frozen.settings }],
					['source', { files: frozen.files.slice(1) }],
					[
						'settings',
						{
							configuration: { ...frozen.configuration, predict: frozen.configuration.predict + 1 },
						},
					],
				] as const) {
					const changedFreeze = join(cell, `${name}-freeze.json`)
					writeFileSync(changedFreeze, JSON.stringify({ ...frozen, ...changed }))
					const changedPath = join(cell, `${name}-policy.json`)
					writeFileSync(
						changedPath,
						JSON.stringify({ ...policy, calibration: hashFile(changedFreeze) }),
					)
					assert.throws(
						() => readDevelopment({ ...execution, development: hashFile(changedPath) }, frozen),
						/role|digest|seed|source|settings|configuration/,
						name,
					)
				}
				const assessment = readRefitAssessment(policy.diagnosis)
				assert.equal(selectMajorityCutoff(assessment), policy.agree)
				assert.throws(
					() => selectMajorityCutoff({ ...assessment, errors: ['missing usage'] }),
					/operational/,
				)
				assert.throws(
					() =>
						selectMajorityCutoff({
							...assessment,
							readings: assessment.readings.map((reading) => ({
								...reading,
								lexical: true,
								score: undefined,
							})),
						}),
					/missing/,
				)
				const first = assessment.readings[0]
				assert.ok(first)
				assert.throws(
					() =>
						selectMajorityCutoff({
							...assessment,
							readings: [...assessment.readings, { ...first, score: first.score === 0 ? 1 : 0 }],
						}),
					/duplicate identity/,
				)
			}
		}
	} finally {
		await peer.destroy()
	}
})

it('withholds a capped rebuilt summary while real development decisions and later recovery continue', async () => {
	const parent = resolve('tmp/units/aggregate-exploration-admission-fixtures')
	mkdirSync(parent, { recursive: true })
	const directory = mkdtempSync(join(parent, 'development-'))
	const peer = new MatrixPeer()
	peer.support = true
	peer.agreement = 0.75
	const url = await peer.start()
	try {
		const seed = join(directory, 'seed.jsonl')
		await writeDevelopmentSeed(directory, seed)
		const frozenPath = join(directory, 'freeze/manifest.json')
		assert.equal(
			await Matrix.execute([
				'freeze',
				'--deployment',
				writeDeploymentFixture(directory),
				'--key',
				'q2',
				'--think',
				'false',
				'--seed',
				seed,
				'--settings',
				join(HARNESS, 'bench5/settings.json'),
				'--out',
				join(directory, 'freeze'),
				'--live',
				'--url',
				url,
			]),
			0,
		)
		const frozen = readFrozen(hashFile(frozenPath))
		const policy = await writeDevelopmentFixture(directory, frozenPath, true)
		for (const withhold of [undefined, false, true])
			assert.equal(isMatrixDevelopment({ ...policy, withhold }), true)
		for (const withhold of [null, 1, 'true', {}, []])
			assert.equal(isMatrixDevelopment({ ...policy, withhold }), false)
		const policyPath = join(directory, 'development.json')
		writeFileSync(policyPath, JSON.stringify(policy))
		const runs = new Map<RunArm, MatrixRun>()
		for (const arm of ['records', 'aggregate'] as const) {
			peer.summary.rebuild = arm === 'aggregate'
			const execution: MatrixExecution = {
				protocol: 'l6',
				phase: 'development',
				key: 'q2',
				think: false,
				arm,
				copy: 1,
				frozen: hashFile(frozenPath),
				budget: policy.paired,
				development: hashFile(policyPath),
			}
			const manifest = join(directory, `${arm}-execution.json`)
			writeFileSync(manifest, JSON.stringify(execution))
			const cache = join(directory, `${arm}-cache`)
			const out = join(directory, arm)
			const config = parseFlags([
				'--run',
				'--live',
				'--copy',
				'1',
				'--manifest',
				manifest,
				'--cache',
				cache,
				'--out',
				out,
				'--url',
				url,
			])
			assert.ok(config.success, config.success ? '' : config.error)
			const result: unknown = await new Driver(config.value)
				.execute()
				.catch((error: unknown) => error)
			const requests = readRows(join(out, 'requests.jsonl'))
			assert.ok(requests.every(isMatrixRequest))
			if (arm === 'aggregate') {
				const refused = requests.find(
					(entry) => entry.role === 'summarizer' && entry.reason === 'length',
				)
				assert.ok(refused, 'the real provider must reach a capped rebuild')
				assert.equal(refused.sent, true)
				assert.equal(refused.status, 200)
				assert.equal(refused.completion, 160)
				assert.ok(refused.prompt !== undefined && refused.prompt > 0)
				assert.equal(readRequestOutcome(refused, policy.paired, frozen), 'refused')
				assert.ok(refused.response?.includes('The standing rule applies through 2026-'))
				assert.equal(result, 0, 'a capped summary must leave later development decisions reachable')
				assert.ok(
					requests.some(
						(entry) =>
							entry.sent &&
							entry.role === 'agent' &&
							entry.goal === refused.goal &&
							entry.sequence > refused.sequence,
					),
					'same-goal decision must be sent',
				)
				assert.ok(
					requests.some(
						(entry) =>
							entry.sent &&
							entry.role === 'agent' &&
							entry.goal !== refused.goal &&
							entry.goal !== undefined &&
							entry.sequence > refused.sequence,
					),
					'later-goal decision must be sent',
				)
				assert.ok(
					!readFileSync(join(cache, 'summary.jsonl'), 'utf8').includes(
						'The standing rule applies through 2026-',
					),
					'refused candidate must never enter the summary cache',
				)
				assert.ok(
					!requests.some(
						(entry) =>
							entry.role === 'judge' &&
							JSON.stringify(entry.request).includes('The standing rule applies through 2026-'),
					),
					'refused candidate must never reach support',
				)
				assert.ok(
					!readFileSync(join(out, 'selections.jsonl'), 'utf8').includes(
						'The standing rule applies through 2026-',
					),
					'truncated prose must never be rendered',
				)
			}
			const run = parseMatrixRun(out)
			assert.ok(run)
			runs.set(arm, run)
		}
		const records = runs.get('records')
		const aggregate = runs.get('aggregate')
		assert.ok(records && aggregate)
		assert.deepEqual(listMatrixPairFailures(records, aggregate), [])
		assert.deepEqual(aggregate.failures, [])
		assert.deepEqual(
			readSustainedMatrix(
				{
					matrix: {
						records: hashFile(join(directory, 'records/run.json')),
						aggregate: hashFile(join(directory, 'aggregate/run.json')),
					},
				},
				hashFile(frozenPath),
				policy.resource,
			),
			[],
		)
		const refused = aggregate.requests.find(
			(entry) => entry.role === 'summarizer' && entry.reason === 'length',
		)
		assert.ok(refused)
		const failed = aggregate.journal.find(
			(entry) =>
				isRecord(entry) &&
				entry.event === 'fail' &&
				entry.goal === refused.goal &&
				entry.title === peer.summary.topic,
		)
		assert.ok(isRecord(failed) && isRecord(failed.prior))
		const prior = failed.prior
		assert.equal(failed.status, 'failed')
		assert.equal(failed.result, undefined)
		assert.match(String(failed.error), /local capped summary unavailable/)
		assert.notDeepEqual(
			failed.projection,
			failed.prior.sources,
			'rebuild must change the previously valid sources',
		)
		assert.ok(
			aggregate.journal.some(
				(entry) =>
					isRecord(entry) &&
					entry.topic === failed.topic &&
					entry.status === 'current' &&
					entry.goal !== refused.goal &&
					entry.version === prior.version,
			),
			'the capped rebuild must have a valid predecessor',
		)
		const picks = aggregate.picks.filter((entry) => entry.goal === refused.goal)
		assert.ok(picks.length > 0)
		assert.ok(
			picks.every((entry) => !entry.aggregates?.some((binding) => binding.topic === failed.topic)),
			'the affected prior version must never render at the failed read point',
		)
		assert.ok(
			picks.some((entry) => entry.aggregates?.some((binding) => binding.topic !== failed.topic)),
			'another valid topic must remain admitted',
		)
		const recovery = aggregate.journal.find(
			(entry) =>
				isRecord(entry) &&
				entry.event === 'build' &&
				entry.topic === failed.topic &&
				entry.status === 'current' &&
				entry.goal !== refused.goal &&
				typeof entry.version === 'number' &&
				typeof failed.version === 'number' &&
				entry.version > failed.version,
		)
		assert.ok(isRecord(recovery) && isRecord(recovery.result))
		const failedAt = aggregate.rows.findIndex((entry) => entry.goal === refused.goal)
		const recoveredAt = aggregate.rows.findIndex((entry) => entry.goal === recovery.goal)
		assert.ok(failedAt >= 0 && recoveredAt > failedAt)
		const unavailable = new Set(
			aggregate.rows.slice(failedAt, recoveredAt).map((entry) => entry.goal),
		)
		assert.ok(
			aggregate.picks
				.filter((entry) => unavailable.has(entry.goal))
				.every((entry) => !entry.aggregates?.some((binding) => binding.topic === failed.topic)),
			'failed topic must remain unavailable until ordinary recovery',
		)
		assert.equal(
			aggregate.requests.filter(
				(entry) =>
					entry.role === 'summarizer' &&
					entry.goal === refused.goal &&
					JSON.stringify(entry.request) === JSON.stringify(refused.request),
			).length,
			1,
			'local cap must not retry at the same read point',
		)
		assert.equal(
			recovery.prior,
			undefined,
			'ordinary later recovery must not reuse the invalidated version',
		)
		assert.deepEqual(recovery.result.sources, recovery.projection)
		assert.notDeepEqual(recovery.result.sources, failed.prior.sources)
		assert.ok(
			aggregate.requests.some(
				(entry) =>
					entry.role === 'summarizer' &&
					entry.sent &&
					entry.goal === recovery.goal &&
					entry.reason === 'stop' &&
					entry.sequence > refused.sequence,
			),
			'recovery must use a later ordinary source build',
		)
		assert.ok(
			aggregate.picks.some(
				(entry) =>
					entry.goal === recovery.goal &&
					entry.aggregates?.some(
						(binding) =>
							binding.topic === failed.topic && binding.state.version === recovery.version,
					),
			),
			'recovered current version must become available to a consumer',
		)
		const cost = measureMatrixCosts(aggregate).wire.find(
			(entry) => entry.role === 'summarizer' && entry.phase === 'trajectory',
		)
		assert.ok(
			cost && cost.completion >= 160 && cost.requests >= 1,
			'all-role accounting must charge the refused completion',
		)
		console.log(`DEVELOPMENT_CAPPED_SUMMARY_FIXTURE ${directory} topic=${peer.summary.topic}`)
		peer.summary.rebuild = false
		peer.refused = 'refunds'
		const clean = new Map<RunArm, MatrixRun>()
		for (const arm of ['records', 'aggregate'] as const) {
			const out = join(directory, `clean-${arm}`)
			const config = parseFlags([
				'--run',
				'--live',
				'--copy',
				'1',
				'--manifest',
				join(directory, `${arm}-execution.json`),
				'--cache',
				join(directory, `clean-${arm}-cache`),
				'--out',
				out,
				'--url',
				url,
			])
			assert.ok(config.success, config.success ? '' : config.error)
			assert.equal(await new Driver(config.value).execute(), 0)
			const run = parseMatrixRun(out)
			assert.ok(run)
			assert.deepEqual(run.failures, [], `${arm} raw evidence must be clean before admission`)
			clean.set(arm, run)
		}
		const cleanRecords = clean.get('records')
		const cleanAggregate = clean.get('aggregate')
		assert.ok(cleanRecords && cleanAggregate)
		assert.ok(
			cleanAggregate.rows.filter((row) => matchesMatrixExposure(cleanAggregate, row.goal)).length >
				cleanAggregate.rows.length / 2,
		)
		assert.ok(
			cleanAggregate.requests.some(
				(request) =>
					request.role === 'judge' &&
					request.sent &&
					JSON.stringify(request.request).includes('refunds') &&
					request.status === 200,
			),
		)
		assert.deepEqual(listMatrixPairFailures(cleanRecords, cleanAggregate), [])
		assert.deepEqual(
			readSustainedMatrix(
				{
					matrix: {
						records: hashFile(join(cleanRecords.path, 'run.json')),
						aggregate: hashFile(join(cleanAggregate.path, 'run.json')),
					},
				},
				hashFile(frozenPath),
				policy.resource,
			),
			[],
		)
		assert.throws(
			() =>
				readSustainedMatrix(
					{
						matrix: {
							records: hashFile(join(cleanAggregate.path, 'run.json')),
							aggregate: hashFile(join(cleanRecords.path, 'run.json')),
						},
					},
					hashFile(frozenPath),
					policy.resource,
				),
			/records and aggregate/,
		)
		const full = readSustainedPreparation(policy.full.path)
		assert.ok(
			full.length > 0 &&
				full.some((entry) => entry.costs.wire.some((wire) => wire.prompt + wire.completion > 0)),
		)
		const preparation = ['records', 'aggregate'].flatMap((arm) =>
			readSustainedPreparation(join(directory, `clean-${arm}`, 'run.json')),
		)
		const unique = collectPreparations(preparation)
		assert.ok(
			full.every((entry) => unique.some((one) => one.identity === entry.identity)),
			'paired preparation must include required measured full preflight',
		)
		assert.deepEqual(
			collectPreparations([...preparation, ...full]),
			unique,
			'an explicit full-preflight alias must add no charge',
		)
		const first = full[0]
		assert.ok(first)
		assert.throws(
			() =>
				collectPreparations([
					...preparation,
					{
						...first,
						costs: {
							...first.costs,
							metadata: { ...first.costs.metadata, requests: first.costs.metadata.requests + 1 },
						},
					},
				]),
			/conflicting preparation identity/,
		)
		console.log(`DEVELOPMENT_CLEAN_PAIR_FIXTURE ${directory}`)
	} finally {
		await peer.destroy()
	}
})

it('continues real aggregate development after a fresh single-token length-terminated judge answer', async () => {
	const parent = resolve('tmp/units/aggregate-exploration-admission-fixtures')
	mkdirSync(parent, { recursive: true })
	const directory = mkdtempSync(join(parent, 'development-'))
	const peer = new MatrixPeer()
	peer.support = true
	peer.agreement = 0.75
	peer.judge.length = true
	peer.judge.response = 'No'
	const url = await peer.start()
	try {
		const seed = join(directory, 'seed.jsonl')
		await writeDevelopmentSeed(directory, seed)
		const frozenPath = join(directory, 'freeze/manifest.json')
		assert.equal(
			await Matrix.execute([
				'freeze',
				'--deployment',
				writeDeploymentFixture(directory),
				'--key',
				'q2',
				'--think',
				'false',
				'--seed',
				seed,
				'--settings',
				join(HARNESS, 'bench5/settings.json'),
				'--out',
				join(directory, 'freeze'),
				'--live',
				'--url',
				url,
			]),
			0,
		)
		const frozen = readFrozen(hashFile(frozenPath))
		const policy = await writeDevelopmentFixture(directory, frozenPath)
		const policyPath = join(directory, 'development.json')
		writeFileSync(policyPath, JSON.stringify(policy), { flag: 'wx' })
		const execution: MatrixExecution = {
			protocol: 'l6',
			phase: 'development',
			key: 'q2',
			think: false,
			arm: 'aggregate',
			copy: 1,
			frozen: hashFile(frozenPath),
			budget: policy.paired,
			development: hashFile(policyPath),
		}
		const manifest = join(directory, 'execution.json')
		writeFileSync(manifest, JSON.stringify(execution), { flag: 'wx' })
		const cache = join(directory, 'cache')
		const out = join(directory, 'run')
		const config = parseFlags([
			'--run',
			'--live',
			'--copy',
			'1',
			'--manifest',
			manifest,
			'--cache',
			cache,
			'--out',
			out,
			'--url',
			url,
		])
		assert.ok(config.success, config.success ? '' : config.error)
		const result: unknown = await new Driver(config.value)
			.execute()
			.catch((error: unknown) => error)
		const requests = readRows(join(out, 'requests.jsonl'))
		assert.ok(requests.every(isMatrixRequest))
		const judge = requests.find((entry) => entry.role === 'judge' && entry.sent)
		assert.ok(judge && isRecord(judge.request) && isRecord(judge.request.options))
		assert.equal(judge.status, 200)
		assert.equal(judge.reason, 'length')
		assert.equal(judge.completion, 1)
		assert.equal(judge.request.raw, true)
		assert.equal(judge.request.stream, false)
		assert.equal(judge.request.logprobs, true)
		assert.equal(judge.request.top_logprobs, 20)
		assert.equal(judge.request.options.num_predict, 1)
		assert.equal(judge.request.options.temperature, 1)
		const wire: unknown = JSON.parse(judge.response ?? '')
		assert.ok(isRecord(wire))
		assert.equal(wire.done, true)
		assert.equal(wire.done_reason, 'length')
		assert.equal(wire.eval_count, 1)
		assert.equal(wire.response, peer.judge.response)
		assert.equal(result, 0, 'length-terminated fresh judge must complete and work must continue')
		assert.equal(readRequestOutcome(judge, policy.paired, frozen), 'complete')
		assert.ok(
			requests.some((entry) => entry.sent && entry.sequence > judge.sequence),
			'work must send a request after the completed fresh judge',
		)
		const rows = readRows(join(cache, 'judge.jsonl'))
		assert.ok(
			rows.some(
				(entry) =>
					isRecord(entry) &&
					isRecord(entry.answer) &&
					entry.error === undefined &&
					entry.refusal === undefined &&
					entry.origin === 'live',
			),
			'the real judge must persist a successful fresh answer',
		)
		const run = parseMatrixRun(out)
		assert.ok(run)
		assert.equal(run.status, 'development-failed-goals')
		assert.ok(run.requests.every((entry) => entry.error === undefined && !isParserRequest(entry)))
		assert.ok(run.rows.every((entry) => entry.error === undefined && entry.partial === false))
		const outcomes = readRows(join(out, 'rows.jsonl'))
		assert.ok(outcomes.every(isRecord))
		assert.ok(outcomes.every((entry) => entry.error === undefined && entry.faults === 0))
		assert.ok(
			outcomes.some(
				(entry) =>
					entry.success === false &&
					entry.reply === 'Fixture answer.' &&
					Array.isArray(entry.missing) &&
					entry.missing.length > 0,
			),
			'ordinary fixture answer mismatches must explain the failed-goal status',
		)
		console.log(`SINGLE_TOKEN_JUDGE_DEVELOPMENT_FIXTURE ${directory}`)
	} finally {
		await peer.destroy()
	}
})

it('retains real single-token judge protocol errors and missing-label refusals', async () => {
	const parent = resolve('tmp/units/aggregate-exploration-admission-fixtures')
	mkdirSync(parent, { recursive: true })
	const directory = mkdtempSync(join(parent, 'reader-'))
	const peer = new MatrixPeer()
	peer.judge.length = true
	const url = await peer.start()
	try {
		for (const control of ['malformed', 'duplicate', 'missing']) {
			peer.judge.malformed = control === 'malformed'
			peer.judge.duplicate = control === 'duplicate'
			peer.judge.missing = control === 'missing'
			const path = join(directory, `${control}.jsonl`)
			const judge = new JudgeCache({
				judge: createOllamaJudge({
					model: MICA_MODEL,
					system: MICA_SYSTEM,
					url,
					options: { num_ctx: 4096 },
				}),
				path,
				live: true,
				retry: 0,
			})
			const request = {
				state: 'The recorded fixture state.',
				questions: {
					question: { form: 'noul', instructions: 'Check the recorded fixture state.' },
				},
			} as const
			if (control === 'missing') {
				const result = await judge.ask(request, new AbortController().signal)
				assert.deepEqual(result.answers, {})
				assert.deepEqual(result.refusals?.question?.missing, ['true'])
			} else {
				await assert.rejects(
					judge.ask(request, new AbortController().signal),
					/invalid or duplicate top logprob token/,
				)
			}
			const rows = readRows(path)
			assert.equal(rows.length, 1)
			const row = rows[0]
			assert.ok(isRecord(row))
			assert.equal(row.answer, undefined)
			if (control === 'missing') {
				assert.equal(row.error, undefined)
				assert.deepEqual(row.refusal, { missing: ['true'] })
			} else {
				assert.match(String(row.error), /invalid or duplicate top logprob token/)
				assert.equal(row.refusal, undefined)
			}
		}
	} finally {
		await peer.destroy()
	}
})

it('retries sent judge transport in real matrix development without admitting missing usage', async () => {
	const parent = resolve('tmp/units/aggregate-exploration-admission-fixtures')
	mkdirSync(parent, { recursive: true })
	const directory = mkdtempSync(join(parent, 'development-'))
	const peer = new MatrixPeer()
	peer.support = true
	peer.agreement = 0.75
	const url = await peer.start()
	try {
		const seed = join(directory, 'seed.jsonl')
		await writeDevelopmentSeed(directory, seed)
		const frozenPath = join(directory, 'freeze/manifest.json')
		assert.equal(
			await Matrix.execute([
				'freeze',
				'--deployment',
				writeDeploymentFixture(directory),
				'--key',
				'q2',
				'--think',
				'false',
				'--seed',
				seed,
				'--settings',
				join(HARNESS, 'bench5/settings.json'),
				'--out',
				join(directory, 'freeze'),
				'--live',
				'--url',
				url,
			]),
			0,
		)
		const frozen = readFrozen(hashFile(frozenPath))
		const policy = await writeDevelopmentFixture(directory, frozenPath)
		const policyPath = join(directory, 'development.json')
		writeFileSync(policyPath, JSON.stringify(policy), { flag: 'wx' })
		const retries = frozen.configuration.retry
		assert.ok(retries > 0)
		for (const faults of [1, retries + 1]) {
			peer.faults = faults
			const execution: MatrixExecution = {
				protocol: 'l6',
				phase: 'development',
				key: 'q2',
				think: false,
				arm: 'aggregate',
				copy: 1,
				frozen: hashFile(frozenPath),
				budget: policy.paired,
				development: hashFile(policyPath),
			}
			const manifest = join(directory, `retry-${faults}-execution.json`)
			writeFileSync(manifest, JSON.stringify(execution), { flag: 'wx' })
			const out = join(directory, `retry-${faults}`)
			const config = parseFlags([
				'--run',
				'--live',
				'--copy',
				'1',
				'--manifest',
				manifest,
				'--cache',
				join(directory, `retry-${faults}-cache`),
				'--out',
				out,
				'--url',
				url,
			])
			assert.ok(config.success, config.success ? '' : config.error)
			const result: unknown = await new Driver(config.value)
				.execute()
				.catch((error: unknown) => error)
			const requests = readRows(join(out, 'requests.jsonl'))
			assert.ok(requests.every(isMatrixRequest))
			const judges = requests.filter((request) => request.role === 'judge')
			const fault = judges.find((request) => request.status === 500)
			assert.ok(fault && isRecord(fault.request))
			const same = judges.filter(
				(request) =>
					isRecord(request.request) &&
					isRecord(fault.request) &&
					request.request.prompt === fault.request.prompt,
			)
			assert.equal(
				same.filter((request) => request.sent).length,
				faults === 1 ? 2 : retries + 1,
				'matrix development must send every budget-permitted judge retry',
			)
			assert.equal(same.length, faults === 1 ? 2 : retries + 1)
			assert.ok(same.every((request) => request.sent))
			assert.equal(judges.filter((request) => request.status === 500).length, faults)
			assert.equal(peer.faults, 0)
			for (const failed of same.filter((request) => request.status === 500)) {
				assert.equal(failed.prompt, undefined)
				assert.equal(failed.completion, undefined)
				assert.equal(
					readRequestOutcome({ ...failed, failures: ['capacity'] }, policy.paired, frozen),
					'fault',
				)
			}
			if (faults === 1) {
				assert.equal(same.at(-1)?.status, 200)
				assert.equal(result, 0)
			} else {
				assert.ok(result instanceof Error)
				assert.match(result.message, /harness fault: the judge failed/)
				assert.equal(judges.length, retries + 1)
			}
			const run = parseMatrixRun(out)
			assert.ok(run)
			assert.throws(
				() => verifyMatrixFeasibility(run),
				/operational matrix fault is not configuration infeasibility/,
			)
			const costs = measureMatrixCosts(run).wire.filter((cost) => cost.role === 'judge')
			assert.equal(
				costs.reduce((total, cost) => total + cost.requests, 0),
				judges.filter((request) => request.sent).length,
			)
			assert.equal(
				costs.reduce((total, cost) => total + cost.missing, 0),
				faults,
			)
		}
		console.log(`DEVELOPMENT_JUDGE_TRANSPORT_FIXTURE ${directory}`)
	} finally {
		await peer.destroy()
	}
})

it('runs length-terminated production flushes in every real development arm and refuses invalid flushes', async () => {
	const parent = resolve('tmp/units/aggregate-exploration-admission-fixtures')
	mkdirSync(parent, { recursive: true })
	const directory = mkdtempSync(join(parent, 'development-'))
	const peer = new MatrixPeer()
	peer.support = true
	peer.agreement = 0.75
	peer.flush.length = true
	const url = await peer.start()
	try {
		const seed = join(directory, 'seed.jsonl')
		await writeDevelopmentSeed(directory, seed)
		const frozenPath = join(directory, 'freeze', 'manifest.json')
		await Matrix.execute([
			'freeze',
			'--deployment',
			writeDeploymentFixture(directory),
			'--key',
			'q2',
			'--think',
			'false',
			'--seed',
			seed,
			'--settings',
			join(HARNESS, 'bench5', 'settings.json'),
			'--out',
			join(directory, 'freeze'),
			'--live',
			'--url',
			url,
		])
		const frozen = readFrozen(hashFile(frozenPath))
		const policy = await writeDevelopmentFixture(directory, frozenPath)
		const policyPath = join(directory, 'development.json')
		writeFileSync(policyPath, JSON.stringify(policy))
		assert.ok(isMatrixDevelopment(policy))
		for (const change of [
			{ agree: Number.NaN },
			{ change: 0.57 },
			{ separated: true },
			{ accepted: true },
			{ continuation: 'retry' },
			{ limitation: '' },
		])
			assert.equal(isMatrixDevelopment({ ...policy, ...change }), false)
		const base: MatrixExecution = {
			protocol: 'l6',
			phase: 'development',
			key: 'q2',
			think: false,
			arm: 'records',
			copy: 1,
			frozen: hashFile(frozenPath),
			budget: policy.paired,
			development: hashFile(policyPath),
		}
		assert.ok(isMatrixExecution(base))
		for (const change of [
			{ copy: 2 },
			{ phase: 'evaluation' },
			{ phase: 'pilot' },
			{ fit: policy.diagnosis },
			{ development: undefined },
		])
			assert.equal(isMatrixExecution({ ...base, ...change }), false)
		assert.throws(() => readDevelopment({ ...base, budget: policy.expanded }, frozen), /budget/)
		assert.throws(
			() => readDevelopment({ ...base, key: 'g2' }, frozen),
			/exact copy-1 development execution required/,
		)
		assert.throws(
			() => readDevelopment({ ...base, think: true }, frozen),
			/exact copy-1 development execution required/,
		)
		assert.throws(
			() =>
				readDevelopment(base, {
					...frozen,
					decision: { ...frozen.decision, digest: '0'.repeat(64) },
				}),
			/frozen identity differs/,
		)
		assert.throws(
			() => readDevelopment(base, { ...frozen, seed: frozen.settings }),
			/frozen identity differs/,
		)
		assert.throws(
			() =>
				readDevelopment(base, {
					...frozen,
					files: frozen.files.map((file) =>
						file.path.endsWith('Support.ts') ? { ...file, hash: '0'.repeat(64) } : file,
					),
				}),
			/frozen identity differs/,
		)
		const stale = readFileSync(policyPath, 'utf8')
		writeFileSync(policyPath, `${stale}\n`)
		assert.throws(() => readDevelopment(base, frozen), /custody mismatch/)
		writeFileSync(policyPath, stale)
		const runs = new Map<RunArm, MatrixRun>()
		const arms: readonly RunArm[] = ['records', 'aggregate', 'full']
		for (const arm of arms) {
			peer.decisions = 0
			peer.parser = 2
			const execution: MatrixExecution = {
				...base,
				arm,
				budget: arm === 'full' ? policy.expanded : policy.paired,
			}
			const manifest = join(directory, `${arm}-development.json`)
			writeFileSync(manifest, JSON.stringify(execution))
			assert.deepEqual(readExecution(manifest).execution, execution)
			assert.throws(
				() =>
					readAttempt({
						execution: hashFile(manifest),
						run: directory,
						budget: execution.budget,
						accepted: true,
						failures: [],
						resource: false,
						files: [],
					}),
				/attempt execution differs/,
			)
			const cache = join(directory, `${arm}-cache`)
			mkdirSync(cache)
			writeFileSync(join(cache, 'judge.jsonl'), readFileSync(seed))
			const out = join(directory, arm)
			const flags = [
				'--run',
				'--live',
				'--copy',
				'1',
				'--manifest',
				manifest,
				'--cache',
				cache,
				'--out',
				out,
				'--url',
				url,
			]
			assert.equal(parseFlags([...flags, '--fit', policyPath]).success, false)
			assert.equal(parseFlags([...flags, '--goals', 'g01']).success, false)
			const config = parseFlags(flags)
			assert.ok(config.success, config.success ? '' : config.error)
			if (arm === 'records') {
				const changes: ReadonlyArray<Partial<Config>> = [
					{ copy: 2 },
					{ goals: ['g01'] },
					{ key: 'g2' },
					{ model: 'unbound-model' },
					{ arm: 'full' },
					{ think: true },
					{ reserve: 1024 },
					{ frozen: undefined },
					{ frozen: { ...frozen, seed: frozen.settings } },
					{ allowance: frozen.configuration.allowance },
					{ retry: frozen.configuration.retry },
					{ predict: frozen.configuration.predict },
					{ settings: policyPath },
					{ fit: policyPath },
					{ studyPath: policyPath },
					{
						runtime: {
							id: 'substitution',
							system: '',
							topics: [],
							days: [],
							seed: [],
							tools: {},
							lookups: [],
							goals: [],
						},
					},
					{
						study: {
							protocol: 'e1',
							key: 'q2',
							think: false,
							arm: 'records',
							phase: 'development',
							frozen: execution.frozen,
							resource: policy.resource,
							runtime: policy.packet,
							budget: policy.paired,
							limits: {
								calls: 1,
								tokens: 1,
								retries: 0,
								wall: 1,
								goals: 1,
								derivation: 'substitution',
								evidence: [],
							},
						},
					},
				]
				for (const [at, change] of changes.entries()) {
					const output = join(directory, `construction-${at}`)
					const routes = peer.routes.length
					const calls = peer.calls.length
					await assert.rejects(
						new Driver({ ...config.value, ...change, out: output }).execute(),
						/effective development configuration differs/,
					)
					assert.equal(peer.routes.length, routes)
					assert.equal(peer.calls.length, calls)
					assert.equal(peer.decisions, 0)
					assert.equal(existsSync(output), false)
				}
			}
			const result: unknown = await new Driver(config.value)
				.execute()
				.catch((error: unknown) => error)
			const requests = readRows(join(out, 'requests.jsonl')).filter(isMatrixRequest)
			const flushes = requests.filter((entry) => entry.role === 'flush' && entry.sent)
			assert.ok(flushes.length > 0, `${arm} must retain a sent production flush`)
			for (const flush of flushes) {
				assert.equal(flush.status, 200)
				assert.equal(flush.reason, 'length')
				assert.equal(flush.completion, 1)
				assert.ok(isRecord(flush.request) && isRecord(flush.request.options))
				assert.equal(flush.request.think, false)
				assert.equal(flush.request.options.num_predict, 1)
				assert.equal(flush.request.tools, undefined)
			}
			assert.equal(result, 0)
			for (const flush of flushes)
				assert.ok(
					requests.some(
						(entry) =>
							entry.role === 'agent' &&
							entry.sent &&
							entry.goal === flush.goal &&
							entry.sequence > flush.sequence,
					),
					`${arm} must send a later decision for flush goal ${flush.goal}`,
				)
			const run = parseMatrixRun(out)
			assert.ok(run)
			runs.set(arm, run)
			const goals = readCopy(join(COPIES_DIR, 'v1.json')).goals
			assert.deepEqual(
				run.rows.map((row) => row.goal),
				goals.map((goal) => goal.id),
			)
			assert.equal(run.status, 'development-failed-goals')
			const failed = run.requests.filter(isParserRequest)
			assert.equal(failed.length, 1)
			const fault = failed[0]
			assert.ok(fault)
			assert.equal(fault.goal, goals[1]?.id)
			assert.equal(fault.status, 500)
			assert.equal(fault.prompt, undefined)
			assert.equal(fault.completion, undefined)
			assert.ok(fault.capacity)
			const row = run.rows.find((entry) => entry.goal === fault.goal)
			assert.ok(row)
			assert.equal(row.success, false)
			assert.match(row.error ?? '', /qualification failed: transport/)
			const follower = run.requests.find((entry) => entry.sequence === fault.sequence + 1)
			assert.ok(follower)
			assert.equal(follower.sent, false)
			assert.ok(isStoppedRequest(follower, run.requests))
			assert.equal(permitsReserve(run.requests), false)
			assert.throws(
				() => verifyMatrixFeasibility(run),
				/operational matrix fault is not configuration infeasibility/,
			)
			assert.ok(run.requests.some((entry) => entry.sent && entry.goal === goals[2]?.id))
			assert.ok(
				!run.failures.some(
					(entry) => entry === `request ${follower.sequence}: thinking policy differs`,
				),
			)
			const messages = readRows(join(out, 'messages.jsonl'))
			assert.ok(
				messages.some(
					(entry) =>
						isRecord(entry) && entry.role === 'user' && entry.content === goals[1]?.request,
				),
			)
			assert.ok(
				messages.some(
					(entry) =>
						isRecord(entry) &&
						entry.role === 'assistant' &&
						entry.goal === goals[0]?.id &&
						entry.content === 'Fixture answer.',
				),
			)
			const last = goals.at(-1)
			assert.ok(
				messages.some(
					(entry) => isRecord(entry) && entry.role === 'assistant' && entry.goal === last?.id,
				),
			)
			const costs = measureMatrixCosts(run).wire.find(
				(entry) => entry.role === 'agent' && entry.phase === 'trajectory',
			)
			assert.ok(costs)
			assert.equal(costs.missing, 1)
			assert.equal(
				costs.requests,
				run.requests.filter(
					(entry) => entry.role === 'agent' && entry.sent && entry.goal !== undefined,
				).length,
			)
			assert.ok(costs.wall >= fault.wall)
			for (const change of [
				{ goal: 'wrong' },
				{ turn: 999 },
				{ sequence: follower.sequence + 1 },
				{ error: 'other' },
				{ request: {} },
			])
				assert.equal(isStoppedRequest({ ...follower, ...change }, run.requests), false)
			for (const response of [
				'{"error":"unrelated failure"}',
				'{"error":"XML syntax error"}',
				fault.response + '\n{}',
			])
				assert.equal(isParserRequest({ ...fault, response }), false)
			assert.equal(
				permitsContinuation(
					run.requests,
					frozen,
					{ ...execution, phase: 'full' },
					fault.goal ?? '',
				),
				false,
			)
			assert.equal(
				permitsContinuation(
					[...run.requests, { ...follower, sequence: run.requests.length + 1, error: 'unrelated' }],
					frozen,
					execution,
					fault.goal ?? '',
				),
				false,
			)
			const report = readJSON(join(out, 'run.json'))
			assert.ok(isRecord(report) && isRecord(report.fit))
			assert.deepEqual(report.fit, { agree: policy.agree, change: 0.56, separated: false })
		}
		const records = runs.get('records')
		const aggregate = runs.get('aggregate')
		assert.ok(records && aggregate)
		assert.deepEqual(listMatrixPairFailures(records, aggregate), [])
		assert.ok(
			aggregate.journal.some(
				(entry) => isRecord(entry) && entry.event === 'build' && entry.status === 'current',
			),
		)
		assert.ok(aggregate.picks.some((entry) => (entry.aggregates?.length ?? 0) > 0))
		const plan = join(directory, 'development-plan.json')
		writeFileSync(plan, JSON.stringify([{ name: 'l6-q2-think0-aggregate-v1' }]))
		assert.throws(
			() =>
				Comparison.execute([
					'blind',
					'--base',
					directory,
					'--plan',
					plan,
					'--out',
					join(directory, 'answers.jsonl'),
					'--keys',
					join(directory, 'keys.json'),
				]),
			/malformed identity/,
		)
		for (const control of ['transport', 'length', 'usage', 'capacity']) {
			peer.parser = undefined
			peer.decisions = 0
			peer.fault = control === 'transport'
			peer.length = control === 'length'
			peer.missing = control === 'usage'
			peer.metadata = control === 'capacity' ? 500 : 200
			const manifest = join(directory, 'records-development.json')
			const out = join(directory, control)
			const config = parseFlags([
				'--run',
				'--live',
				'--copy',
				'1',
				'--manifest',
				manifest,
				'--cache',
				join(directory, `${control}-cache`),
				'--out',
				out,
				'--url',
				url,
			])
			assert.ok(config.success, config.success ? '' : config.error)
			await assert.rejects(new Driver(config.value).execute(), /qualification|calibration/)
			assert.ok(
				readRows(join(out, 'rows.jsonl')).length <
					readCopy(join(COPIES_DIR, 'v1.json')).goals.length,
			)
		}
		peer.fault = false
		peer.length = false
		peer.missing = false
		peer.metadata = 200
		for (const control of ['http', 'terminal', 'usage', 'truncation', 'completion', 'boundary']) {
			peer.decisions = 0
			peer.flush = {
				length: true,
				fault: control === 'http',
				incomplete: control === 'terminal',
				missing: control === 'usage',
				truncated: control === 'truncation',
				completion: control === 'completion' ? 2 : 1,
				boundary: control === 'boundary',
			}
			const out = join(directory, `flush-${control}`)
			const config = parseFlags([
				'--run',
				'--live',
				'--copy',
				'1',
				'--manifest',
				join(directory, 'records-development.json'),
				'--cache',
				join(directory, `flush-${control}-cache`),
				'--out',
				out,
				'--url',
				url,
			])
			assert.ok(config.success, config.success ? '' : config.error)
			const rejection =
				control === 'http'
					? /decision qualification failed: transport/
					: /development integrity failure/
			await assert.rejects(new Driver(config.value).execute(), rejection)
			const requests = readRows(join(out, 'requests.jsonl')).filter(isMatrixRequest)
			const flush = requests.find((entry) => entry.role === 'flush' && entry.sent)
			assert.ok(flush, `${control} must reach the production flush`)
			const calibration = requests.find(
				(entry) => entry.role === 'agent' && entry.sent && entry.goal === undefined,
			)
			assert.ok(calibration && calibration.sequence < flush.sequence)
			assert.equal(readRequestOutcome(calibration, policy.paired, frozen), 'complete')
			assert.ok(isRecord(flush.request) && isRecord(flush.request.options))
			assert.equal(flush.request.think, false)
			assert.equal(flush.request.options.num_predict, 1)
			assert.equal(flush.request.tools, undefined)
			assert.equal(flush.status, control === 'http' ? 500 : 200)
			assert.equal(
				readRequestOutcome(flush, policy.paired, frozen),
				['http', 'terminal', 'usage'].includes(control) ? 'fault' : 'refused',
			)
			assert.ok(flush.response)
			const response: unknown = JSON.parse(flush.response)
			assert.ok(isRecord(response))
			if (control === 'http') assert.equal(response.error, 'fixture flush HTTP failure')
			else {
				assert.equal(response.done, control !== 'terminal')
				assert.equal(response.done_reason, 'length')
				assert.equal(response.truncated, control === 'truncation' ? true : undefined)
				assert.equal(
					response.eval_count,
					control === 'usage' ? undefined : control === 'completion' ? 2 : 1,
				)
				if (control === 'boundary')
					assert.equal(
						Number(response.prompt_eval_count) + Number(response.eval_count),
						flush.request.options.num_ctx,
					)
			}
			const rows = readRows(join(out, 'rows.jsonl'))
			const row = rows.find((entry) => isRecord(entry) && entry.goal === flush.goal)
			assert.ok(isRecord(row))
			assert.equal(row.success, false)
			assert.equal(row.partial, true)
			assert.match(String(row.error), rejection)
			assert.ok(rows.length < readCopy(join(COPIES_DIR, 'v1.json')).goals.length)
			assert.equal(
				requests.some(
					(entry) =>
						entry.role === 'agent' &&
						entry.sent &&
						entry.goal === flush.goal &&
						entry.sequence > flush.sequence,
				),
				false,
			)
		}
	} finally {
		await peer.destroy()
	}
})

it('recognizes the actual retained parser stop without granting reserve advancement', () => {
	const path = resolve(
		'.orkestrel/agent/instruments/results/l9/q2-think0/full/preflight/l6-q2-think0-full-v1/requests.jsonl',
	)
	const requests = readRows(path)
	const parser = requests[19]
	const follower = requests[20]
	assert.ok(isRecord(parser) && isRecord(follower))
	// Full request guards keep the regression tied to the actual wire recording.
	assert.ok(isMatrixRequest(parser) && isMatrixRequest(follower))
	assert.ok(isParserRequest(parser))
	assert.ok(isStoppedRequest(follower, [parser, follower]))
	assert.equal(permitsReserve([parser, follower]), false)
})
