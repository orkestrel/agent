import { it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { BUILD } from '../../constants.js'
import { MatrixPeer } from '../../tests/matrixFixture.js'
import { hashFile } from '../../refit/helpers.js'
import { readJSON } from '../../helpers.js'
import { readSustainedRun } from '../parsers.js'
import { readSustainedExecution, readSustainedSelection, readSustainedPolicy } from '../helpers.js'
import { readWorkload } from '../../build/helpers.js'
import { inspectOracle, readOracle } from '../../endurance/helpers.js'
import { Peer } from './Peer.js'
import {
	runCommand,
	writeFixtureLabels,
	prepareRuntimeFixture,
	prepareExploratoryFixture,
} from './helpers.js'
import { isRecord } from '@orkestrel/contract'

it('executes exploratory sustained custody after qualified paired refusal and withholds capped rebuilt summaries', async () => {
	const parent = resolve('tmp/units/aggregate-exploration-admission-fixtures')
	mkdirSync(parent, { recursive: true })
	const directory = mkdtempSync(join(parent, 'sustained-'))
	const peer = new Peer(500)
	const matrix = new MatrixPeer()
	matrix.support = true
	const url = await peer.start()
	const matrixURL = await matrix.start()
	try {
		const { policy, runtime, evaluation } = await prepareExploratoryFixture(
			directory,
			peer,
			url,
			matrixURL,
		)
		const selection = join(directory, 'exploratory-selection.json')
		assert.equal(
			await runCommand('sustained', [
				'select',
				'--policy',
				policy,
				'--development',
				runtime,
				'--evaluation',
				evaluation,
				'--seed',
				'17',
				'--candidate',
				join(directory, 'exploratory-development/candidate.json'),
				'--out',
				selection,
			]),
			0,
		)
		const selected = readSustainedSelection(selection)
		assert.equal(selected.chosen, 'q4')
		const incompatible = join(directory, 'accepted-policy.json')
		writeFileSync(incompatible, JSON.stringify({ qualified: hashFile(selection), withhold: true }))
		assert.throws(() => readSustainedPolicy(hashFile(incompatible)), /refused qualified/)
		const changed = join(directory, 'changed-selection.json')
		writeFileSync(
			changed,
			JSON.stringify({
				...selected,
				candidates: selected.candidates.map((candidate) => ({ ...candidate, key: 'g4' })),
			}),
		)
		assert.throws(() => readSustainedSelection(changed), /ranking skipped/)
		assert.equal(
			await runCommand('sustained', [
				'filing',
				'--selection',
				selection,
				'--out',
				join(directory, 'evaluation-filing'),
				'--live',
				'--url',
				url,
			]),
			0,
		)
		peer.summary.enabled = false
		assert.equal(
			await runCommand('sustained', [
				'evaluate',
				'--selection',
				selection,
				'--classification',
				join(directory, 'evaluation-filing/classification.json'),
				'--out',
				join(directory, 'exploratory-evaluation'),
				'--live',
				'--url',
				url,
			]),
			0,
		)
		const held = readSustainedRun(join(directory, 'exploratory-evaluation/aggregate/run'))
		assert.equal(held.rows.length, held.runtime.goals.length)
		assert.deepEqual(held.errors, [])
		assert.deepEqual(held.execution.policy, hashFile(policy))
		console.log(`EXPLORATORY_SUSTAINED_FIXTURE ${directory}`)
	} finally {
		await peer.destroy()
		await matrix.destroy()
	}
})

it('runs real bounded continuous ledgers, seals runtime-only filing, transfers a fresh refit, and retains late invalidity', async () => {
	const parent = resolve('tmp/units/aggregate-runtime-fixtures')
	mkdirSync(parent, { recursive: true })
	const directory = mkdtempSync(join(parent, 'proof-'))
	const peer = new Peer(100)
	const matrixPeer = new MatrixPeer()
	matrixPeer.support = true
	const url = await peer.start()
	const matrixUrl = await matrixPeer.start()
	try {
		const {
			workload,
			runtime,
			frozen: frozenPath,
			resource: resourcePath,
			classification: classificationPath,
			classified,
			fit,
		} = await prepareRuntimeFixture(directory, url, matrixUrl)
		assert.equal(
			await runCommand('sustained', [
				'development',
				'--frozen',
				frozenPath,
				'--resource',
				resourcePath,
				'--pilot',
				join(directory, 'pilot/manifest.json'),
				'--runtime',
				runtime,
				'--classification',
				classificationPath,
				'--fit',
				fit,
				'--out',
				join(directory, 'development'),
				'--live',
				'--url',
				url,
			]),
			0,
		)
		const records = readSustainedRun(join(directory, 'development/records/run'))
		const aggregate = readSustainedRun(join(directory, 'development/aggregate/run'))
		assert.equal(records.rows.length, 32)
		assert.deepEqual(records.failures, [])
		assert.deepEqual(aggregate.failures, [])
		assert.equal(records.observations.filter((one) => one.checkpoint).length, 2)
		assert.ok(records.observations.at(-1)?.products.includes('product:development-shift-1-work-1'))
		assert.ok(records.receipts.some((receipt) => receipt.version === 7 && receipt.success))
		assert.ok((records.observations.at(-1)?.history.total ?? 0) > 3072)
		assert.ok(
			records.observations.some((one) => one.omitted.some((id) => id.startsWith('product:'))),
		)
		assert.equal(hashFile(classified.path).hash, classified.hash)
		const developmentExecution = readSustainedExecution(
			join(directory, 'development/records/execution.json'),
		).execution
		const wallExecution = join(directory, 'wall-execution.json')
		writeFileSync(
			wallExecution,
			JSON.stringify({
				...developmentExecution,
				limits: { ...developmentExecution.limits, wall: 1 },
			}),
			{ flag: 'wx' },
		)
		const wallPath = join(directory, 'wall-refusal')
		const wallBefore = peer.calls.length
		const wallStatus = await runCommand('bench', [
			'--run',
			'--live',
			'--study',
			wallExecution,
			'--cache',
			join(directory, 'wall-cache'),
			'--out',
			wallPath,
			'--url',
			url,
		])
		const wallAfter = peer.calls.length
		const wallRun = readSustainedRun(wallPath)
		const wallMetadata = readJSON(join(wallPath, 'run.json'))
		assert.ok(isRecord(wallMetadata) && typeof wallMetadata.wall === 'number')
		writeFileSync(
			join(directory, 'wall-proof.json'),
			JSON.stringify({
				wall: 1,
				elapsed: wallMetadata.wall,
				status: wallStatus,
				before: wallBefore,
				after: wallAfter,
				calls: peer.calls.slice(wallBefore),
				requests: hashFile(join(wallPath, 'requests.jsonl')),
				run: hashFile(join(wallPath, 'run.json')),
				failures: wallRun.failures,
				errors: wallRun.errors,
			}),
			{ flag: 'wx' },
		)
		assert.notEqual(wallStatus, 0, 'expired wall must refuse the real driver')
		assert.deepEqual(wallRun.errors, [])
		assert.equal(wallRun.execution.limits.wall, 1)
		assert.ok(wallMetadata.wall >= wallRun.execution.limits.wall)
		assert.ok(
			wallRun.failures.some((failure) => /whole-trajectory (wall )?limit reached/.test(failure)),
		)
		assert.ok(wallRun.requests.length > 0)
		assert.ok(wallRun.requests.every((request) => !request.sent))
		assert.equal(wallAfter, wallBefore)
		const selection = join(directory, 'selection.json')
		assert.equal(
			await runCommand('sustained', [
				'select',
				'--development',
				runtime,
				'--evaluation',
				join(workload, 'runtime/evaluation.json'),
				'--candidate',
				join(directory, 'development/candidate.json'),
				'--seed',
				'7',
				'--out',
				selection,
			]),
			0,
		)
		assert.equal(
			await runCommand('sustained', [
				'filing',
				'--selection',
				selection,
				'--out',
				join(directory, 'evaluation-filing'),
				'--live',
				'--url',
				url,
			]),
			0,
		)
		assert.equal(
			await runCommand('sustained', [
				'evaluate',
				'--selection',
				selection,
				'--classification',
				join(directory, 'evaluation-filing/classification.json'),
				'--out',
				join(directory, 'evaluation'),
				'--live',
				'--url',
				url,
			]),
			0,
		)
		const evaluation = readSustainedRun(join(directory, 'evaluation/aggregate/run'))
		const evaluationRecords = readSustainedRun(join(directory, 'evaluation/records/run'))
		assert.equal(evaluation.runtime.id, 'fixture-evaluation-e1')
		for (const run of [evaluationRecords, evaluation]) {
			assert.equal(run.rows.length, 32)
			assert.equal(run.status, 'complete')
			assert.deepEqual(run.errors, [])
			assert.deepEqual(run.failures, [])
			assert.deepEqual(
				run.observations.filter((one) => one.checkpoint).map((one) => one.shift),
				[4, 8],
			)
		}
		const development = [records, aggregate]
		const scale =
			evaluation.runtime.goals.length /
			Math.max(...development.map((run) => run.runtime.goals.length))
		const elapsed = development.map((run) => {
			const metadata = readJSON(join(run.path, 'run.json'))
			assert.ok(isRecord(metadata) && typeof metadata.wall === 'number')
			return metadata.wall
		})
		const ceilings = {
			calls: Math.max(
				1,
				Math.ceil(
					Math.max(
						...development.map((run) => run.requests.filter((request) => request.sent).length),
					) *
						scale *
						2,
				),
			),
			tokens: Math.max(
				1,
				Math.ceil(
					Math.max(
						...development.map((run) =>
							run.requests.reduce(
								(total, request) => total + (request.prompt ?? 0) + (request.completion ?? 0),
								0,
							),
						),
					) *
						scale *
						2,
				),
			),
			wall: Math.max(1, Math.ceil(Math.max(...elapsed) * scale * 2)),
			retries: records.frozen.configuration.retry,
			goals: evaluation.runtime.goals.length,
			derivation: `Twice the maximum complete same-configuration development expenditure, scaled by evaluation/development goals (${scale}); all roles included; no reserve/window/retry change. Wall is whole-run elapsed, never the sum of overlapping timers.`,
			evidence: development.flatMap((run) => run.files),
		}
		assert.deepEqual(readSustainedSelection(selection).limits, ceilings)
		const completion = [evaluationRecords, evaluation].map((run) => {
			assert.deepEqual(
				readSustainedExecution(join(directory, 'evaluation', run.execution.arm, 'execution.json'))
					.execution.limits,
				ceilings,
			)
			assert.equal(typeof run.costs.elapsed, 'number')
			const wall = run.costs.elapsed
			assert.ok(typeof wall === 'number' && wall < ceilings.wall)
			return { arm: run.execution.arm, wall, ceiling: ceilings.wall, margin: ceilings.wall - wall }
		})
		const blind = join(directory, 'blind/packet.json')
		const keys = join(directory, 'private/keys.json')
		const auditArgs = [
			'--selection',
			selection,
			'--records',
			join(directory, 'evaluation/records/run'),
			'--aggregate',
			join(directory, 'evaluation/aggregate/run'),
			'--oracle',
			join(workload, 'private/evaluation.json'),
		]
		assert.equal(
			await runCommand('sustained-audit', [
				'blind',
				...auditArgs,
				'--seed',
				'17',
				'--out',
				blind,
				'--keys',
				keys,
			]),
			0,
		)
		const answerLabels = join(directory, 'private/inert-fixture-labels.json')
		writeFixtureLabels(blind, keys, answerLabels)
		const reportPath = join(directory, 'fixture-report.json')
		assert.equal(
			await runCommand('sustained-audit', [
				'report',
				...auditArgs,
				'--packet',
				blind,
				'--keys',
				keys,
				'--labels',
				answerLabels,
				'--out',
				reportPath,
			]),
			0,
		)
		const report = readJSON(reportPath)
		assert.ok(isRecord(report) && report.valid === true)
		const missed = join(directory, 'private/missed-control-labels.json')
		writeFixtureLabels(blind, keys, missed, true)
		assert.equal(
			await runCommand('sustained-audit', [
				'report',
				...auditArgs,
				'--packet',
				blind,
				'--keys',
				keys,
				'--labels',
				missed,
				'--out',
				join(directory, 'missed-control-report.json'),
			]),
			0,
		)
		const invalidReport = readJSON(join(directory, 'missed-control-report.json'))
		assert.ok(isRecord(invalidReport) && invalidReport.valid === false)
		const alteredOracle = join(directory, 'private/altered-oracle.json')
		writeFileSync(
			alteredOracle,
			JSON.stringify({
				...readOracle(join(workload, 'private/evaluation.json')),
				id: 'foreign-oracle',
			}),
		)
		assert.notEqual(
			await runCommand('sustained-audit', [
				'blind',
				...auditArgs,
				'--oracle',
				alteredOracle,
				'--seed',
				'17',
				'--out',
				join(directory, 'blind/foreign.json'),
				'--keys',
				join(directory, 'private/foreign-keys.json'),
			]),
			0,
		)
		const original = readSustainedExecution(
			join(directory, 'evaluation/records/execution.json'),
		).execution
		const sameOracle = readOracle(join(workload, 'private/evaluation.json'))
		const changedOracle = join(directory, 'private/same-id-changed-oracle.json')
		writeFileSync(
			changedOracle,
			JSON.stringify({
				...sameOracle,
				facts: sameOracle.facts.map((fact, at) =>
					at === 0 ? { ...fact, value: `${fact.value} Changed fixture text.` } : fact,
				),
			}),
		)
		const parsedOracle = readOracle(changedOracle)
		assert.equal(parsedOracle.runtime, sameOracle.runtime)
		assert.deepEqual(inspectOracle(evaluation.runtime, parsedOracle), [])
		assert.notEqual(
			await runCommand(
				'sustained-audit',
				[
					'blind',
					...auditArgs,
					'--oracle',
					changedOracle,
					'--seed',
					'17',
					'--out',
					join(directory, 'blind/same-id.json'),
					'--keys',
					join(directory, 'private/same-id-keys.json'),
				],
				/oracle bytes differ from frozen workload resource/,
			),
			0,
		)
		const selected = readSustainedSelection(selection)
		const alteredSelection = join(directory, 'altered-selection.json')
		assert.ok(selected.limits !== undefined)
		writeFileSync(
			alteredSelection,
			JSON.stringify({
				...selected,
				limits: { ...selected.limits, calls: selected.limits.calls + 1 },
			}),
		)
		assert.throws(() => readSustainedSelection(alteredSelection), /limits differ/)
		writeFileSync(
			alteredSelection,
			JSON.stringify({
				...selected,
				candidates: selected.candidates.map((candidate) => ({
					...candidate,
					accepted: false,
					failures: ['invented exposure refusal'],
				})),
			}),
		)
		assert.throws(() => readSustainedSelection(alteredSelection), /lacks retained failed evidence/)
		const altered = join(directory, 'altered.json')
		writeFileSync(
			altered,
			JSON.stringify({
				...original,
				budget: { reserve: 1024, window: 3584, ceiling: 3584, predict: 512 },
			}),
		)
		const before = peer.calls.length
		assert.throws(() => readSustainedExecution(altered), /resource budget/)
		assert.equal(peer.calls.length, before)
		peer.missingAt = 'shift-7-work-1'
		const partialPath = join(directory, 'partial')
		assert.notEqual(
			await runCommand('bench', [
				'--run',
				'--live',
				'--study',
				join(directory, 'evaluation/records/execution.json'),
				'--cache',
				join(directory, 'partial-cache'),
				'--out',
				partialPath,
				'--url',
				url,
			]),
			0,
		)
		const partial = readSustainedRun(partialPath)
		assert.ok(partial.errors.some((error) => error.includes('operational')))
		assert.ok(partial.observations.some((one) => one.checkpoint && one.shift === 4))
		assert.ok(partial.rows.length < 32 && partial.rows.length > 16)
		peer.missingAt = undefined
		peer.lengthAt = 'shift-7-work-1'
		const truncatedPath = join(directory, 'truncated')
		assert.notEqual(
			await runCommand('bench', [
				'--run',
				'--live',
				'--study',
				join(directory, 'evaluation/records/execution.json'),
				'--cache',
				join(directory, 'truncated-cache'),
				'--out',
				truncatedPath,
				'--url',
				url,
			]),
			0,
		)
		const truncated = readSustainedRun(truncatedPath)
		assert.deepEqual(truncated.errors, [])
		assert.ok(truncated.failures.some((failure) => failure.includes('length')))
		assert.ok(truncated.observations.some((one) => one.checkpoint && one.shift === 4))
		peer.lengthAt = undefined
		const limited = join(directory, 'limited-execution.json')
		writeFileSync(
			limited,
			JSON.stringify({
				...developmentExecution,
				limits: { ...developmentExecution.limits, calls: 1 },
			}),
		)
		const limitedPath = join(directory, 'limited')
		assert.notEqual(
			await runCommand('bench', [
				'--run',
				'--live',
				'--study',
				limited,
				'--cache',
				join(directory, 'limited-cache'),
				'--out',
				limitedPath,
				'--url',
				url,
			]),
			0,
		)
		const limitedRun = readSustainedRun(limitedPath)
		assert.ok(limitedRun.failures.length > 0)
		assert.deepEqual(limitedRun.errors, [])
		assert.equal(limitedRun.requests.filter((request) => request.sent).length, 1)
		const priorCalls = peer.calls.length
		assert.notEqual(
			await runCommand('bench', [
				'--run',
				'--live',
				'--study',
				join(directory, 'development/records/execution.json'),
				'--cache',
				join(directory, 'development/records/cache'),
				'--out',
				join(directory, 'foreign-cache'),
				'--url',
				url,
			]),
			0,
		)
		assert.equal(peer.calls.length, priorCalls)
		const refusal = spawnSync(
			process.execPath,
			[
				join(BUILD, 'bench5/sustained.js'),
				'evaluate',
				'--selection',
				selection,
				'--classification',
				join(directory, 'evaluation-filing/classification.json'),
				'--out',
				join(directory, 'no-live'),
			],
			{ encoding: 'utf8' },
		)
		assert.notEqual(refusal.status, 0)
		assert.match(refusal.stderr, /requires --live/)
		writeFileSync(
			join(directory, 'proof.json'),
			JSON.stringify(
				{
					fixture: true,
					directory,
					selection,
					records: records.path,
					aggregate: aggregate.path,
					evaluation: join(directory, 'evaluation'),
					completion,
					ceilings,
					wall: join(directory, 'wall-proof.json'),
					partial: partialPath,
					workload: readWorkload(hashFile(runtime)),
					packet: blind,
					keys,
					report: reportPath,
					labels: answerLabels,
					limitation:
						'Synthetic private truth and hand-authored inert labels prove protocol behavior only; these are not model-quality evidence.',
				},
				null,
				2,
			),
		)
		console.log(`SUSTAINED_FIXTURE ${directory}`)
	} finally {
		await peer.destroy()
		await matrixPeer.destroy()
	}
})
