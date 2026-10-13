import { it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isRecord } from '@orkestrel/contract'
import { HARNESS } from '../../constants.js'
import { MatrixPeer } from '../../tests/matrixFixture.js'
import { writeDeploymentFixture } from '../../matrix/tests/helpers.js'
import { readFrozen, readRequestOutcome } from '../../matrix/helpers.js'
import { isMatrixRequest } from '../../matrix/validators.js'
import { hashFile } from '../../refit/helpers.js'
import { readJSON, readRows, readWireReading } from '../../helpers.js'
import {
	readPreparationFailure,
	readSustainedBoundary,
	readSustainedExecution,
	readSustainedSelection,
} from '../helpers.js'
import { Peer } from './Peer.js'
import { runCommand } from './helpers.js'

it('ranks authentic measured filing refusals and rejects missing usage and a foreign resource', async () => {
	const parent = resolve('tmp/units/aggregate-sustained-refusal-fix-fixtures')
	mkdirSync(parent, { recursive: true })
	const directory = mkdtempSync(join(parent, 'proof-'))
	const workload = resolve('tmp/units/aggregate-runtime-workload-audit-2')
	const runtime = join(workload, 'runtime/development.json')
	const peer = new Peer()
	const matrixPeer = new MatrixPeer()
	const url = await peer.start()
	const matrixUrl = await matrixPeer.start()
	try {
		writeFileSync(join(directory, 'seed.jsonl'), '', { flag: 'wx' })
		const deployment = writeDeploymentFixture(directory)
		const refusedCandidates: string[] = []
		for (const key of ['q4', 'g4', 'q2', 'g2']) {
			const candidateRoot = join(directory, 'infeasible', key)
			const freeze = join(candidateRoot, 'freeze/manifest.json')
			const resource = join(candidateRoot, 'resource/manifest.json')
			assert.equal(
				await runCommand('matrix', [
					'freeze',
					'--deployment',
					deployment,
					'--key',
					key,
					'--think',
					'false',
					'--seed',
					join(directory, 'seed.jsonl'),
					'--settings',
					join(HARNESS, 'bench5/settings.json'),
					'--out',
					join(candidateRoot, 'freeze'),
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
					freeze,
					'--out',
					join(candidateRoot, 'resource'),
					'--live',
					'--url',
					matrixUrl,
				]),
				0,
			)
			if (key === 'q4') {
				peer.filingFailure = true
				const fault = join(directory, 'missing-usage')
				assert.equal(
					await runCommand(
						'sustained',
						[
							'filing',
							'--frozen',
							freeze,
							'--resource',
							resource,
							'--runtime',
							runtime,
							'--out',
							fault,
							'--live',
							'--url',
							url,
						],
						/operational filing fault/,
					),
					1,
				)
				assert.throws(
					() =>
						readPreparationFailure(
							hashFile(join(fault, 'classification.json')),
							hashFile(runtime),
							hashFile(freeze),
						),
					/operational filing fault/,
				)
				const execution = readSustainedExecution(join(fault, 'execution.json'))
				const info = readJSON(join(fault, 'run/run.json'))
				const requests = readRows(join(fault, 'run/requests.jsonl'))
				assert.ok(isRecord(info) && requests.every(isMatrixRequest))
				const sent = requests.filter((request) => request.sent)
				assert.equal(sent.length, 1)
				const first = sent[0]
				assert.ok(first && first.status === 200)
				assert.equal(
					readRequestOutcome(first, execution.execution.budget, execution.frozen),
					'fault',
				)
				const raw = readWireReading({ body: first.request }, { text: first.response })
				assert.equal(raw.complete, true)
				assert.equal(raw.prompt, undefined)
				assert.equal(raw.completion, undefined)
				assert.ok(requests.some((request) => !request.sent && request.request === null))
				const boundary = readSustainedBoundary(
					info,
					requests,
					execution.execution,
					execution.frozen,
				)
				assert.deepEqual(boundary.failures, [])
				assert.ok(
					boundary.errors.some((error) =>
						error.includes('operational transport or response fault'),
					),
				)
				assert.ok(boundary.errors.some((error) => error.includes('model role differs')))
				peer.filingFailure = false
			}
			peer.boundary = true
			const before = peer.calls.length
			assert.equal(
				await runCommand('sustained', [
					'filing',
					'--frozen',
					freeze,
					'--resource',
					resource,
					'--runtime',
					runtime,
					'--out',
					join(candidateRoot, 'filing'),
					'--live',
					'--url',
					url,
				]),
				3,
			)
			const execution = readSustainedExecution(join(candidateRoot, 'filing/execution.json'))
			const info = readJSON(join(candidateRoot, 'filing/run/run.json'))
			const requests = readRows(join(candidateRoot, 'filing/run/requests.jsonl'))
			assert.ok(isRecord(info) && requests.every(isMatrixRequest))
			const boundary = readSustainedBoundary(info, requests, execution.execution, execution.frozen)
			assert.deepEqual(boundary.errors, [])
			assert.ok(boundary.failures.length > 0)
			assert.ok(
				boundary.failures.some((failure) =>
					failure.includes('completed response violates resource or usage bounds'),
				),
			)
			const sent = requests.filter((request) => request.sent)
			assert.equal(sent.length, 1)
			assert.equal(peer.calls.length - before, 1)
			const first = sent[0]
			assert.ok(first && isRecord(first.request) && isRecord(first.request.options))
			assert.equal(first.request.model, readFrozen(hashFile(freeze)).judge.model)
			assert.equal(first.status, 200)
			const raw = readWireReading({ body: first.request }, { text: first.response })
			assert.equal(raw.complete, true)
			assert.equal(raw.reason, 'stop')
			assert.ok(typeof raw.prompt === 'number' && Number.isSafeInteger(raw.prompt))
			assert.ok(typeof raw.completion === 'number' && Number.isSafeInteger(raw.completion))
			assert.equal(raw.prompt + raw.completion, first.request.options.num_ctx)
			assert.equal(
				readRequestOutcome(first, execution.execution.budget, execution.frozen),
				'refused',
			)
			assert.ok(requests.length > 1)
			assert.ok(requests.slice(1).every((request) => !request.sent && request.request === null))
			readPreparationFailure(
				hashFile(join(candidateRoot, 'filing/classification.json')),
				hashFile(runtime),
				hashFile(freeze),
			)
			const candidatePath = join(candidateRoot, 'candidate.json')
			assert.equal(
				await runCommand('sustained', [
					'candidate',
					'--frozen',
					freeze,
					'--resource',
					resource,
					'--runtime',
					runtime,
					'--preparation',
					join(candidateRoot, 'filing/classification.json'),
					'--out',
					candidatePath,
				]),
				3,
			)
			refusedCandidates.push('--candidate', candidatePath)
		}
		const inconclusive = join(directory, 'infeasible/selection.json')
		const borrowedResource = join(directory, 'borrowed-resource-execution.json')
		const original = readSustainedExecution(
			join(directory, 'infeasible/q4/filing/execution.json'),
		).execution
		assert.equal(original.key, 'q4')
		assert.equal(original.phase, 'filing')
		writeFileSync(
			borrowedResource,
			JSON.stringify({
				...original,
				resource: hashFile(join(directory, 'infeasible/g4/resource/manifest.json')),
			}),
		)
		const beforeBorrow = peer.calls.length
		assert.throws(() => readSustainedExecution(borrowedResource), /resource|frozen|configuration/)
		assert.equal(peer.calls.length, beforeBorrow)
		assert.equal(
			await runCommand('sustained', [
				'select',
				'--development',
				runtime,
				'--evaluation',
				join(workload, 'runtime/evaluation.json'),
				...refusedCandidates,
				'--seed',
				'7',
				'--out',
				inconclusive,
			]),
			3,
		)
		const selection = readSustainedSelection(inconclusive)
		assert.deepEqual(
			selection.candidates.map((candidate) => candidate.key),
			['q4', 'g4', 'q2', 'g2'],
		)
		assert.equal(selection.accepted, false)
		assert.equal(selection.chosen, undefined)
		assert.deepEqual(selection.order, ['aggregate', 'records'])
		assert.equal(
			await runCommand('sustained-audit', [
				'report',
				'--selection',
				inconclusive,
				'--out',
				join(directory, 'infeasible/report.json'),
			]),
			0,
		)
		const infeasibleReport = readJSON(join(directory, 'infeasible/report.json'))
		assert.ok(
			isRecord(infeasibleReport) &&
				infeasibleReport.recommendation === 'inconclusive' &&
				Array.isArray(infeasibleReport.preparation) &&
				infeasibleReport.preparation.length >= 4,
		)
		console.log(`SUSTAINED_REFUSAL_FIXTURE ${directory}`)
	} finally {
		await peer.destroy()
		await matrixPeer.destroy()
	}
})
