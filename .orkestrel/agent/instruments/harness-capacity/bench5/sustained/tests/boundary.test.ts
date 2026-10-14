import type { MatrixRequest } from '../../matrix/types.js'
import type { SustainedExecution } from '../types.js'
import { it } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isRecord } from '@orkestrel/contract'
import { Driver, parseFlags } from '../../Driver.js'
import { HARNESS } from '../../constants.js'
import { readJSON } from '../../helpers.js'
import { hashFile } from '../../refit/helpers.js'
import {
	listCapacityFailures,
	listResourceFailures,
	readRequestOutcome,
} from '../../matrix/helpers.js'
import { isMatrixRequest } from '../../matrix/validators.js'
import { MatrixPeer } from '../../tests/matrixFixture.js'
import { writeDeploymentFixture } from '../../matrix/tests/helpers.js'
import { readSustainedBoundary, readSustainedExecution } from '../helpers.js'
import { readSustainedRun } from '../parsers.js'
import { Peer } from './Peer.js'
import { runCommand, prepareExploratoryFixture } from './helpers.js'

it('retains the native sent study-wall abort without inventing a capacity observation', async () => {
	const parent = resolve('tmp/units/aggregate-boundary-repair-fixtures')
	mkdirSync(parent, { recursive: true })
	const directory = mkdtempSync(join(parent, 'sent-'))
	const peer = new Peer()
	const matrix = new MatrixPeer()
	const url = await peer.start()
	const matrixURL = await matrix.start()
	const prepared = Date.now()
	try {
		const seed = join(directory, 'seed.jsonl')
		writeFileSync(seed, '')
		const frozen = join(directory, 'freeze/manifest.json')
		const resource = join(directory, 'resource/manifest.json')
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
				seed,
				'--settings',
				join(HARNESS, 'bench5/settings.json'),
				'--out',
				join(directory, 'freeze'),
				'--live',
				'--url',
				matrixURL,
			]),
			0,
		)
		assert.equal(
			await runCommand('matrix', [
				'resource',
				'--frozen',
				frozen,
				'--out',
				join(directory, 'resource'),
				'--live',
				'--url',
				matrixURL,
			]),
			0,
		)
		assert.equal(
			await runCommand('sustained', [
				'filing',
				'--frozen',
				frozen,
				'--resource',
				resource,
				'--runtime',
				resolve('tmp/units/aggregate-runtime-workload-audit-2/runtime/development.json'),
				'--out',
				join(directory, 'filing'),
				'--live',
				'--url',
				url,
			]),
			0,
		)
		const baseline = readSustainedExecution(join(directory, 'filing/execution.json'))
		const setup = Date.now() - prepared
		const execution: SustainedExecution = {
			...baseline.execution,
			phase: 'development',
			classification: hashFile(join(directory, 'filing/classification.json')),
			limits: { ...baseline.execution.limits, wall: 15000 },
		}
		const manifest = join(directory, 'execution.json')
		writeFileSync(manifest, JSON.stringify(execution))
		peer.hold = true
		const arrived = once(peer.arrivals, 'hold', { signal: AbortSignal.timeout(30000) })
		const out = join(directory, 'wall')
		const config = parseFlags([
			'--run',
			'--live',
			'--study',
			manifest,
			'--cache',
			join(directory, 'wall-cache'),
			'--out',
			out,
			'--url',
			url,
		])
		assert.ok(config.success, config.success ? '' : config.error)
		const result = new Driver(config.value).execute().catch((error: unknown) => error)
		await arrived
		assert.ok((await result) instanceof Error)
		const run = readSustainedRun(out)
		const info = readJSON(join(out, 'run.json'))
		assert.ok(
			isRecord(info) && typeof info.started === 'number' && typeof info.finished === 'number',
		)
		const target = run.requests.find((request) => request.abort === 'wall')
		assert.ok(target && target.sent && target.role === 'agent' && target.goal !== undefined)
		assert.deepEqual(target.failures, ['transport'])
		assert.equal(target.response, undefined)
		assert.equal(target.buffered, undefined)
		assert.equal(target.capacity, undefined)
		assert.equal(target.prompt, undefined)
		assert.equal(target.completion, undefined)
		assert.equal(readRequestOutcome(target, execution.budget, baseline.frozen), 'fault')
		assert.deepEqual(run.errors, [])
		assert.ok(
			run.failures.some((failure) => failure.includes('whole-trajectory wall limit reached')),
		)
		assert.ok(
			run.requests.some(
				(request) =>
					request.sequence > target.sequence && !request.sent && request.request === null,
			),
		)
		assert.ok(
			run.requests
				.filter((request) => request.sequence > target.sequence)
				.every((request) => !request.sent),
		)
		assert.ok(run.costs.wire.some((cost) => cost.role === 'agent' && cost.missing > 0))
		const healthy = run.requests.find(
			(request) => request.role === 'agent' && request.sent && request.abort === undefined,
		)
		assert.ok(healthy)
		assert.equal(readRequestOutcome(healthy, execution.budget, baseline.frozen), 'complete')
		for (const abort of [undefined, 'caller'] as const) {
			const requests: readonly MatrixRequest[] = run.requests.map((request): MatrixRequest =>
				request === target ? { ...request, abort } : request,
			)
			assert.ok(
				readSustainedBoundary(info, requests, execution, baseline.frozen).errors.some((error) =>
					error.includes('operational transport'),
				),
			)
		}
		assert.ok(
			readSustainedBoundary(
				info,
				run.requests.map((request) => (request === target ? { ...request, status: 500 } : request)),
				execution,
				baseline.frozen,
			).errors.some((error) => error.includes('operational transport')),
		)
		assert.deepEqual(
			readSustainedBoundary(
				info,
				run.requests.map((request) => (request === target ? { ...request, status: 200 } : request)),
				execution,
				baseline.frozen,
			).errors,
			[],
		)
		for (const change of [
			{ abort: 'foreign' },
			{ sent: false },
			{ error: undefined },
			{ buffered: target.finished },
			{ response: '{}' },
			{ capacity: healthy.capacity },
		])
			assert.equal(isMatrixRequest({ ...target, ...change }), false)
		for (const change of [
			{ started: target.started },
			{ finished: target.finished - 1 },
			{ wall: Number(info.wall) + 1 },
		])
			assert.ok(
				readSustainedBoundary(
					{ ...info, ...change },
					run.requests,
					execution,
					baseline.frozen,
				).errors.some((error) => error.includes('operational transport')),
			)
		for (const change of [
			{ capacity: undefined },
			{
				capacity:
					healthy.capacity === undefined ? undefined : { ...healthy.capacity, window: undefined },
			},
			{ error: 'later error', capacity: undefined },
		]) {
			const request: MatrixRequest = { ...healthy, ...change }
			assert.equal(readRequestOutcome(request, execution.budget, baseline.frozen), 'fault')
			assert.ok(
				listCapacityFailures([request], baseline.frozen, execution.budget).some((failure) =>
					failure.includes('capacity'),
				),
			)
		}
		peer.hold = false
		for (const control of ['disconnect', 'missing', 'length']) {
			peer.disconnect = control === 'disconnect'
			peer.missingAt = control === 'missing' ? '' : undefined
			peer.lengthAt = control === 'length' ? '' : undefined
			const output = join(directory, control)
			const flags = parseFlags([
				'--run',
				'--live',
				'--study',
				manifest,
				'--cache',
				join(directory, `${control}-cache`),
				'--out',
				output,
				'--url',
				url,
			])
			assert.ok(flags.success, flags.success ? '' : flags.error)
			await assert.rejects(new Driver(flags.value).execute())
			const reading = readSustainedRun(output)
			const metadata = readJSON(join(output, 'run.json'))
			assert.ok(isRecord(metadata))
			const fault = reading.requests.find(
				(request) => request.sent && request.goal !== undefined && request.role === 'agent',
			)
			assert.ok(fault)
			assert.equal(fault.abort, undefined)
			assert.equal(
				readRequestOutcome(fault, execution.budget, baseline.frozen),
				control === 'length' ? 'refused' : 'fault',
			)
			assert.deepEqual(
				fault.failures,
				listResourceFailures(
					fault.role,
					fault.request,
					fault.response,
					execution.budget,
					fault.status,
					fault.error,
					fault.capacity,
					false,
				),
			)
			assert.equal(reading.errors.length === 0, control === 'length')
			if (control === 'disconnect')
				assert.ok(
					readSustainedBoundary(
						{ ...metadata, wall: execution.limits.wall + 1 },
						reading.requests,
						execution,
						baseline.frozen,
					).errors.some((error) => error.includes('operational transport')),
				)
		}
		console.log(
			JSON.stringify({
				fixture: directory,
				setup,
				started: info.started,
				finished: info.finished,
				wall: info.wall,
				startup:
					run.requests[0]?.started === undefined
						? undefined
						: run.requests[0].started - info.started,
				target: target.sequence,
				limit: execution.limits.wall,
			}),
		)
	} finally {
		await peer.destroy()
		await matrix.destroy()
	}
})

it('preserves an earlier capped summary when a later whole-run wall expires', async () => {
	const parent = resolve('tmp/units/aggregate-boundary-repair-fixtures')
	mkdirSync(parent, { recursive: true })
	const directory = mkdtempSync(join(parent, 'summary-'))
	const peer = new Peer()
	const matrix = new MatrixPeer()
	matrix.support = true
	const url = await peer.start()
	const matrixURL = await matrix.start()
	const started = Date.now()
	try {
		await prepareExploratoryFixture(directory, peer, url, matrixURL)
		const setup = Date.now() - started
		const path = join(directory, 'exploratory-development/aggregate/run')
		const run = readSustainedRun(path)
		const info = readJSON(join(path, 'run.json'))
		assert.ok(
			isRecord(info) &&
				typeof info.wall === 'number' &&
				typeof info.finished === 'number' &&
				typeof info.tokens === 'number',
		)
		const last = run.requests.at(-1)
		assert.ok(last)
		const stopped: MatrixRequest = {
			started: info.finished + 2,
			finished: info.finished + 2,
			sequence: run.requests.length + 1,
			role: last.role,
			goal: last.goal,
			turn: last.turn,
			sent: false,
			request: null,
			error: 'whole-trajectory limit reached',
			failures: ['transport'],
			wall: 0,
		}
		const execution = { ...run.execution, limits: { ...run.execution.limits, wall: info.wall + 1 } }
		const reading = readSustainedBoundary(
			{ ...info, finished: info.finished + 2, wall: info.wall + 2, status: 'failed' },
			[...run.requests, stopped],
			execution,
			run.frozen,
		)
		assert.deepEqual(reading.errors, [])
		assert.ok(
			reading.failures.length > 0 &&
				reading.failures.every((failure) => failure.includes('whole-trajectory')),
		)
		assert.ok(
			readSustainedBoundary(
				{ ...info, tokens: info.tokens + 1 },
				run.requests,
				run.execution,
				run.frozen,
			).errors.includes('actual request, token, or elapsed counts differ'),
		)
		const capped = run.requests.find(
			(request) => request.role === 'summarizer' && request.reason === 'length',
		)
		assert.ok(capped)
		assert.ok(
			readSustainedBoundary(
				info,
				run.requests,
				{ ...run.execution, limits: { ...run.execution.limits, tokens: 1 } },
				run.frozen,
			).failures.some((failure) =>
				failure.includes(`request ${capped.sequence}: completed response`),
			),
		)
		console.log(JSON.stringify({ fixture: directory, setup, capped: capped.sequence, reading }))
	} finally {
		await peer.destroy()
		await matrix.destroy()
	}
})
