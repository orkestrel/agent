import type { MatrixRequest } from '../matrix/types.js'
import {
	writeDeploymentFixture,
	buildCapacityFreeze,
	writeCapacityRequest,
} from '../matrix/tests/helpers.js'
import { BUILD } from '../constants.js'
import { INSTRUCTION_SUMMARIES } from '../aggregates/constants.js'
import { MATRIX_ADMISSION } from '../matrix/constants.js'
import { it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isRecord } from '@orkestrel/contract'
import { Matrix } from '../matrix/Matrix.js'
import { Comparison } from '../matrix/Comparison.js'
import {
	buildBudget,
	listResourceFailures,
	listMatrixPairFailures,
	listMatrixWireFailures,
	matchesMatrixExposure,
	readRequestOutcome,
	nameMatrix,
	readExecution,
	readFrozen,
	readResource,
	isStoppedRequest,
	permitsReserve,
	verifyMatrixFeasibility,
} from '../matrix/helpers.js'
import { parseMatrixRun } from '../matrix/parsers.js'
import { isMatrixIdentity, isMatrixResource, isMatrixRequest } from '../matrix/validators.js'
import { HARNESS, MODELS } from '../constants.js'
import { hashFile } from '../refit/helpers.js'
import { readJSON, readRows } from '../helpers.js'
import { MatrixPeer } from './matrixFixture.js'
import { Driver, parseFlags } from '../Driver.js'
import { Refit } from '../refit/Refit.js'
import { Shadow } from '../shadow.js'
import { buildOptions } from './refit/helpers.js'

it('rejects l6 run and series identities before any cold-start process can execute', () => {
	const directory = resolve('tmp/units/aggregate-matrix-tool-fixtures')
	mkdirSync(directory, { recursive: true })
	const plan = join(directory, 'invalid.json')
	writeFileSync(
		plan,
		JSON.stringify([
			{ name: 'l6-q2-think0-records-v2', harness: 'bench5', estimate: 1, args: ['--run'] },
		]),
	)
	const single = spawnSync(
		process.execPath,
		[
			join(BUILD, 'tools', 'run-one.js'),
			'l6-q2-think0-records-v2',
			'bench5',
			directory,
			'--',
			'--run',
		],
		{ encoding: 'utf8' },
	)
	assert.notEqual(single.status, 0)
	assert.match(single.stderr, /l6 run requires an explicit execution manifest/)
	const series = spawnSync(
		process.execPath,
		[join(BUILD, 'tools', 'series.js'), '--plan', plan, '--base', directory, '--budget', '1'],
		{ encoding: 'utf8' },
	)
	assert.notEqual(series.status, 0)
	assert.match(series.stderr, /series l6 identity differs/)
})

it('separates l5 from every explicit l6 model, thinking, arm, and copy identity', () => {
	const names = new Set<string>()
	for (const key of ['q2', 'q4', 'g2', 'g4'])
		for (const think of [false, true])
			for (const arm of ['records', 'aggregate', 'full'] as const)
				for (let copy = 1; copy <= 8; copy += 1) {
					const identity = { protocol: 'l6' as const, key, think, arm, copy }
					assert.ok(isMatrixIdentity(identity))
					assert.ok(!names.has(nameMatrix(identity)))
					names.add(nameMatrix(identity))
				}
	assert.equal(isMatrixIdentity({ protocol: 'l5', key: 'q2', arm: 'control', copy: 1 }), false)
	assert.equal(isMatrixIdentity({ protocol: 'l6', key: 'q2', arm: 'records', copy: 1 }), false)
	assert.deepEqual(buildBudget(8192), {
		reserve: 8192,
		window: 10752,
		ceiling: 10752,
		predict: 7680,
	})
	assert.throws(() => buildBudget(513), /ladder/)
})

it('plans all three arms in both thinking states, refuses exposure laundering, and reports actual valid denominators and blind ambiguity bounds', async () => {
	const parent = resolve('tmp/units/aggregate-matrix-fixtures')
	mkdirSync(parent, { recursive: true })
	const directory = mkdtempSync(join(parent, 'comparison-'))
	const peer = new MatrixPeer()
	peer.support = true
	const url = await peer.start()
	try {
		const seed = join(directory, 'seed.jsonl')
		writeFileSync(seed, '')
		const settings = join(HARNESS, 'bench5', 'settings.json')
		for (const think of [false, true]) {
			const base = join(directory, `q2-think${think ? '1' : '0'}`)
			const frozenPath = join(base, 'freeze', 'manifest.json')
			const resource = join(base, 'resource', 'manifest.json')
			assert.equal(
				await Matrix.execute([
					'freeze',
					'--deployment',
					writeDeploymentFixture(directory),
					'--key',
					'q2',
					'--think',
					String(think),
					'--seed',
					seed,
					'--settings',
					settings,
					'--out',
					join(base, 'freeze'),
					'--live',
					'--url',
					url,
				]),
				0,
			)
			assert.equal(
				await Matrix.execute([
					'resource',
					'--frozen',
					frozenPath,
					'--out',
					join(base, 'resource'),
					'--live',
					'--url',
					url,
				]),
				0,
			)
			assert.equal(
				await Matrix.execute([
					'full',
					'--frozen',
					frozenPath,
					'--resource',
					resource,
					'--out',
					join(base, 'full'),
					'--live',
					'--url',
					url,
				]),
				0,
			)
			const frozen = readFrozen(hashFile(frozenPath))
			// Synthetic fitted threshold only authorizes a protocol fixture. The real classifier,
			// summarizer, maintenance, planner, provider, and admission checks still execute.
			const fit = join(base, 'fixture-fit.json')
			writeFileSync(
				fit,
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
				await Matrix.execute([
					'pilot',
					'--frozen',
					frozenPath,
					'--resource',
					resource,
					'--fit',
					fit,
					'--out',
					join(base, 'pilot'),
					'--live',
					'--url',
					url,
				]),
				0,
				readFileSync(join(base, 'pilot', 'manifest.json'), 'utf8'),
			)
			if (!think) {
				peer.escalations = true
				assert.equal(
					await Matrix.execute([
						'pilot',
						'--frozen',
						frozenPath,
						'--resource',
						resource,
						'--fit',
						fit,
						'--out',
						join(base, 'stale-pilot'),
						'--live',
						'--url',
						url,
					]),
					0,
				)
				const pilot = readJSON(join(base, 'stale-pilot', 'manifest.json'))
				assert.ok(isRecord(pilot) && isRecord(pilot.attempt))
				assert.equal(pilot.accepted, true)
				assert.deepEqual(pilot.failures, [])
				assert.ok(typeof pilot.attempt.run === 'string')
				const aggregate = parseMatrixRun(pilot.attempt.run)
				const baseline = readResource(hashFile(resource), hashFile(frozenPath)).attempts.at(-1)
				assert.ok(baseline)
				const records = parseMatrixRun(baseline.run)
				assert.ok(records && aggregate)
				assert.deepEqual(listMatrixPairFailures(records, aggregate), [])
				const left = records.picks[0]
				const right = aggregate.picks[0]
				assert.ok(left && right && right.scale !== undefined && aggregate.gauge)
				for (const picks of [
					[],
					[{ ...right, digest: right.digest + '-different' }],
					[{ ...right, tail: [...right.tail, ...right.tail] }],
					[{ ...right, scale: right.scale + 1 }],
				]) {
					assert.ok(right.tail.length > 0)
					assert.ok(
						listMatrixPairFailures(records, { ...aggregate, picks }).includes(
							'initial paired selection or calibrated gauge differs',
						),
					)
				}
				assert.ok(
					listMatrixPairFailures({ ...records, picks: [] }, aggregate).includes(
						'initial paired selection or calibrated gauge differs',
					),
				)
				assert.ok(
					listMatrixPairFailures(records, {
						...aggregate,
						gauge: { ...aggregate.gauge, overhead: aggregate.gauge.overhead + 1 },
					}).includes('initial paired selection or calibrated gauge differs'),
				)
				const row = aggregate.rows[1]
				const prior = records.rows.find((entry) => entry.goal === row?.goal)
				assert.ok(row && prior)
				assert.deepEqual(
					listMatrixPairFailures(
						{ ...records, rows: [{ ...prior, scale: 1.0992978936810431 }] },
						{ ...aggregate, rows: [{ ...row, scale: 1.1873920552677029 }] },
					),
					[],
				)
				for (const scale of [
					0,
					-0,
					-1,
					Number.NaN,
					Number.POSITIVE_INFINITY,
					Number.NEGATIVE_INFINITY,
				]) {
					assert.deepEqual(
						listMatrixPairFailures(
							{ ...records, rows: [{ ...prior, scale }] },
							{ ...aggregate, rows: [row] },
						),
						[`${row.goal}: paired scale is not finite and positive`],
					)
					assert.deepEqual(
						listMatrixPairFailures(
							{ ...records, rows: [prior] },
							{ ...aggregate, rows: [{ ...row, scale }] },
						),
						[`${row.goal}: paired scale is not finite and positive`],
					)
				}
				const request = aggregate.requests.find(
					(entry) => entry.sent && entry.role === 'agent' && entry.goal === 'g03-grace-escalation',
				)
				assert.ok(request && isRecord(request.request) && Array.isArray(request.request.messages))
				const pick = aggregate.picks.findLast(
					(entry) => entry.goal === request.goal && entry.sequence < request.sequence,
				)
				assert.ok(pick && pick.scale !== undefined && (pick.aggregates?.length ?? 0) > 0)
				const body = pick.instructions[INSTRUCTION_SUMMARIES.name]
				assert.ok(body)
				assert.doesNotMatch(body, /^Ids:/m)
				assert.deepEqual(listMatrixWireFailures(aggregate), [])
				assert.equal(matchesMatrixExposure(aggregate, request.goal ?? ''), true)
				const absent = {
					...aggregate,
					requests: [
						{
							...request,
							request: {
								...request.request,
								messages: request.request.messages.map((message: unknown) =>
									isRecord(message) &&
									message.role === 'system' &&
									typeof message.content === 'string'
										? { ...message, content: message.content.replace(body, '') }
										: message,
								),
							},
						},
					],
				}
				assert.equal(matchesMatrixExposure(absent, request.goal ?? ''), false)
				assert.ok(
					listMatrixWireFailures(absent).some((failure) =>
						failure.includes('recorded body is absent'),
					),
				)
				const text = body + ' ESC-2291 remains active.'
				const control = {
					...aggregate,
					picks: [
						{ ...pick, instructions: { ...pick.instructions, [INSTRUCTION_SUMMARIES.name]: text } },
					],
					requests: [
						{
							...request,
							request: {
								...request.request,
								messages: request.request.messages.map((message: unknown) =>
									isRecord(message) &&
									message.role === 'system' &&
									typeof message.content === 'string'
										? { ...message, content: message.content.replace(body, text) }
										: message,
								),
							},
						},
					],
				}
				assert.ok(
					listMatrixWireFailures(control).some((failure) =>
						failure.includes('sole-carried stale phrase'),
					),
				)
				assert.ok(
					listMatrixWireFailures({ ...aggregate, picks: [], requests: [request] }).some((failure) =>
						failure.includes('unbound or stale summary block'),
					),
				)
				assert.ok(
					listMatrixWireFailures({
						...aggregate,
						picks: [{ ...pick, aggregates: [] }],
						requests: [request],
					}).some((failure) => failure.includes('lacks maintained binding')),
				)
				assert.ok(
					listMatrixWireFailures({
						...aggregate,
						picks: [pick],
						requests: [{ ...request, estimate: MATRIX_ADMISSION / pick.scale + 1 }],
					}).some((failure) => failure.includes('first-request admission ceiling exceeded')),
				)
				peer.escalations = false
			}
		}
		const planPath = join(directory, 'plans', 'A.json')
		assert.equal(
			await Matrix.execute(['plan', '--root', directory, '--stage', 'A', '--out', planPath]),
			0,
		)
		const plan = readJSON(planPath)
		assert.ok(Array.isArray(plan))
		assert.equal(plan.length, 24)
		assert.deepEqual(
			new Set(
				plan.map((entry: unknown) =>
					isRecord(entry) && typeof entry.name === 'string'
						? entry.name.split('-').slice(2, 4).join('-')
						: '',
				),
			),
			new Set([
				'think0-records',
				'think0-aggregate',
				'think0-full',
				'think1-records',
				'think1-aggregate',
				'think1-full',
			]),
		)
		const runs = join(directory, 'runs')
		mkdirSync(runs)
		for (const entry of plan) {
			assert.ok(
				isRecord(entry) &&
					typeof entry.name === 'string' &&
					Array.isArray(entry.args) &&
					entry.args.every((arg: unknown) => typeof arg === 'string'),
			)
			if (!entry.name.includes('think0') || !entry.name.endsWith('-v2')) continue
			const config = parseFlags([...entry.args, '--out', join(runs, entry.name), '--url', url])
			assert.ok(config.success)
			assert.equal(await new Driver(config.value).execute(), 0)
		}
		const aggregate = join(runs, 'l6-q2-think0-aggregate-v2')
		const shadow = join(directory, 'shadow.json')
		assert.equal(
			await new Shadow({
				run: aggregate,
				out: shadow,
				cache: join(directory, 'shadow-cache'),
				copies: join(HARNESS, 'bench', 'variants', 'long'),
				live: true,
				url,
			}).execute(),
			0,
		)
		const packet = join(directory, 'blind', 'packet.json')
		const keys = join(directory, 'private', 'keys.json')
		assert.equal(
			Comparison.execute([
				'blind',
				'--base',
				runs,
				'--plan',
				planPath,
				'--out',
				packet,
				'--keys',
				keys,
			]),
			0,
		)
		const items = readJSON(packet)
		assert.ok(Array.isArray(items))
		assert.equal(items.length, 72)
		assert.ok(
			items.every(
				(item: unknown) =>
					isRecord(item) && !('model' in item) && !('success' in item) && !('goal' in item),
			),
		)
		const labels = join(directory, 'labels.json')
		writeFileSync(
			labels,
			JSON.stringify({
				authority: 'root-adjudicated',
				packet: hashFile(packet).hash,
				labels: items.map((item: unknown) => ({
					id: isRecord(item) ? item.id : undefined,
					verdict: 'ambiguous',
					evidence: 'Fixture-only deliberate uncertainty.',
				})),
			}),
		)
		const reportPath = join(directory, 'report.json')
		assert.equal(
			Comparison.execute([
				'report',
				'--base',
				runs,
				'--plan',
				planPath,
				'--out',
				reportPath,
				'--packet',
				packet,
				'--keys',
				keys,
				'--labels',
				labels,
				'--shadow',
				shadow,
				'--preparation',
				join(directory, 'q2-think0', 'stale-pilot', 'manifest.json'),
			]),
			0,
		)
		const report = readJSON(reportPath)
		assert.ok(
			isRecord(report) &&
				Array.isArray(report.pairs) &&
				Array.isArray(report.shadows) &&
				Array.isArray(report.preparation),
		)
		assert.equal(report.shadows.length, 1)
		assert.ok(report.preparation.length >= 3)
		assert.ok(report.preparation.some((cost) => isRecord(cost) && cost.accepted === true))
		for (const pair of report.pairs) {
			assert.ok(isRecord(pair))
			assert.equal(pair.denominator, 23)
			assert.equal(pair.audited, 23)
			assert.equal(pair.low, -23)
			assert.equal(pair.high, 23)
		}
		const executionPath = join(directory, 'plans', 'executions', 'l6-q2-think0-aggregate-v2.json')
		const admitted = readExecution(executionPath)
		assert.ok(admitted.execution.pilot !== undefined)
		const pilot = readJSON(admitted.execution.pilot.path)
		assert.ok(isRecord(pilot))
		writeFileSync(admitted.execution.pilot.path, JSON.stringify({ ...pilot, exposed: 0 }))
		const stale = join(directory, 'stale-execution.json')
		writeFileSync(
			stale,
			JSON.stringify({ ...admitted.execution, pilot: hashFile(admitted.execution.pilot.path) }),
		)
		assert.throws(() => readExecution(stale), /majority body exposure/)
		writeFileSync(admitted.execution.pilot.path, `${JSON.stringify(pilot, null, 2)}\n`)
		const requestPath = join(aggregate, 'requests.jsonl')
		const requests = readRows(requestPath)
		const first = requests.find(
			(entry: unknown) => isRecord(entry) && entry.goal !== undefined && entry.role === 'agent',
		)
		assert.ok(isRecord(first) && typeof first.response === 'string')
		first.response = first.response.replace('"done_reason":"stop"', '"done_reason":"length"')
		writeFileSync(requestPath, requests.map((request) => JSON.stringify(request)).join('\n'))
		const invalidPath = join(directory, 'invalid-report.json')
		Comparison.execute(['report', '--base', runs, '--plan', planPath, '--out', invalidPath])
		const invalid = readJSON(invalidPath)
		assert.ok(isRecord(invalid) && Array.isArray(invalid.pairs))
		const refused = invalid.pairs.find(
			(entry: unknown) => isRecord(entry) && entry.arm === 'aggregate',
		)
		assert.ok(isRecord(refused))
		assert.equal(refused.denominator, 0)
		writeFileSync(join(directory, 'archive.json'), JSON.stringify([{ name: 'l5-q2-control-v2' }]))
		assert.throws(
			() =>
				Comparison.execute([
					'report',
					'--base',
					runs,
					'--plan',
					join(directory, 'archive.json'),
					'--out',
					join(directory, 'archive-report.json'),
				]),
			/archive/,
		)
	} finally {
		await peer.destroy()
		rmSync(directory, { recursive: true, force: true })
	}
})

it('refuses a real frozen corpus from another source/settings population before calibration calls', async () => {
	const parent = resolve('tmp/units/aggregate-matrix-fixtures')
	mkdirSync(parent, { recursive: true })
	const directory = mkdtempSync(join(parent, 'corpus-'))
	const peer = new MatrixPeer()
	const url = await peer.start()
	try {
		const corpus = join(directory, 'corpus')
		const options = buildOptions(corpus)
		assert.equal(await new Refit(options).execute(), 0)
		const frozen = join(directory, 'freeze', 'manifest.json')
		await Matrix.execute([
			'freeze',
			'--deployment',
			writeDeploymentFixture(directory),
			'--key',
			'q2',
			'--think',
			'false',
			'--seed',
			join(options.cache, 'judge.jsonl'),
			'--settings',
			options.settings,
			'--out',
			join(directory, 'freeze'),
			'--live',
			'--url',
			url,
		])
		const before = peer.calls.length
		const out = join(directory, 'generate')
		assert.equal(
			await Refit.run([
				'generate',
				'--frozen',
				frozen,
				'--corpus',
				corpus,
				'--cache',
				join(directory, 'fresh-cache'),
				'--model',
				MODELS.q2,
				'--out',
				out,
			]),
			3,
		)
		assert.match(
			readFileSync(join(out, 'diagnosis.json'), 'utf8'),
			/frozen corpus source\/settings\/seed population mismatch/,
		)
		assert.equal(peer.calls.length, before)
	} finally {
		await peer.destroy()
		rmSync(directory, { recursive: true, force: true })
	}
})

it('classifies raw usage and HTTP500 without consulting answer scores', () => {
	const directory = mkdtempSync(join(resolve('tmp'), 'capacity-outcome-'))
	try {
		const frozen = buildCapacityFreeze(directory)
		const request = writeCapacityRequest(directory)
		assert.equal(readRequestOutcome(request, buildBudget(512), frozen), 'complete')
		assert.deepEqual(
			listResourceFailures(
				'agent',
				request.request,
				request.response,
				buildBudget(512),
				200,
				undefined,
				request.capacity,
			),
			[],
		)
		assert.equal(
			readRequestOutcome(
				{
					...request,
					status: 500,
					response: '{"error":"context capacity exceeded"}',
					failures: ['capacity'],
				},
				buildBudget(512),
				frozen,
			),
			'fault',
		)
		assert.equal(
			readRequestOutcome(
				{ ...request, response: '{"done":true,"done_reason":"stop"}' },
				buildBudget(512),
				frozen,
			),
			'fault',
		)
		assert.equal(
			readRequestOutcome(
				{ ...request, response: request.response?.replace('stop', 'length') },
				buildBudget(512),
				frozen,
			),
			'refused',
		)
	} finally {
		rmSync(directory, { recursive: true, force: true })
	}
})

it('captures exactly one immediate snapshot after a completed inference and rejects metadata errors without another role call', async () => {
	const directory = mkdtempSync(join(resolve('tmp'), 'capacity-transport-'))
	const peer = new MatrixPeer()
	const url = await peer.start()
	try {
		writeFileSync(join(directory, 'seed.jsonl'), '')
		await Matrix.execute([
			'freeze',
			'--key',
			'q2',
			'--think',
			'false',
			'--seed',
			join(directory, 'seed.jsonl'),
			'--settings',
			join(HARNESS, 'bench5/settings.json'),
			'--deployment',
			writeDeploymentFixture(directory),
			'--out',
			join(directory, 'freeze'),
			'--live',
			'--url',
			url,
		])
		peer.metadata = 500
		await assert.rejects(
			() =>
				Matrix.execute([
					'resource',
					'--frozen',
					join(directory, 'freeze/manifest.json'),
					'--out',
					join(directory, 'resource'),
					'--live',
					'--url',
					url,
				]),
			/operational/,
		)
		const run = join(directory, 'resource/reserve-512/l6-q2-think0-records-v1')
		const requests = readRows(join(run, 'requests.jsonl'))
		assert.equal(requests.length, 1)
		const request = requests[0]
		assert.ok(isMatrixRequest(request))
		assert.equal(request.status, 200)
		assert.ok(request.response?.includes('prompt_eval_count'))
		assert.ok(request.capacity)
		const snapshot = readJSON(request.capacity.evidence.path)
		assert.ok(isRecord(snapshot))
		assert.equal(snapshot.status, 500)
		assert.deepEqual(peer.routes.slice(-2), ['/api/chat', '/api/ps'])
		assert.equal(peer.routes.filter((route) => route === '/api/ps').length, 1)
		const info = readJSON(join(run, 'run.json'))
		assert.ok(isRecord(info))
		assert.equal(info.sent, 1)
	} finally {
		await peer.destroy()
		rmSync(directory, { recursive: true, force: true })
	}
})

it('runs the complete real-component resource ladder, ignores wrong answers, freezes the first valid reserve, and refuses changed settings', async () => {
	const parent = resolve('tmp/units/aggregate-matrix-fixtures')
	mkdirSync(parent, { recursive: true })
	const directory = mkdtempSync(join(parent, 'resource-'))
	const peer = new MatrixPeer()
	const url = await peer.start()
	try {
		const seed = join(directory, 'seed.jsonl')
		writeFileSync(seed, '')
		const settings = join(directory, 'settings.json')
		writeFileSync(settings, readFileSync(join(HARNESS, 'bench5', 'settings.json')))
		const frozen = join(directory, 'freeze', 'manifest.json')
		assert.equal(
			await Matrix.execute([
				'freeze',
				'--deployment',
				writeDeploymentFixture(directory),
				'--key',
				'q2',
				'--think',
				'true',
				'--seed',
				seed,
				'--settings',
				settings,
				'--out',
				join(directory, 'freeze'),
				'--live',
				'--url',
				url,
			]),
			0,
		)
		peer.length = true
		assert.equal(
			await Matrix.execute([
				'resource',
				'--frozen',
				frozen,
				'--out',
				join(directory, 'resource'),
				'--live',
				'--url',
				url,
			]),
			0,
		)
		const resource = readResource(
			hashFile(join(directory, 'resource', 'manifest.json')),
			hashFile(frozen),
		)
		assert.equal(resource.budget?.reserve, 1024)
		assert.deepEqual(
			resource.attempts.map((attempt) => attempt.budget.reserve),
			[512, 1024],
		)
		const failed = resource.attempts[0]
		assert.ok(failed)
		assert.equal(failed.budget.reserve, 512)
		assert.equal(failed.accepted, false)
		assert.equal(failed.resource, true)
		const refused = parseMatrixRun(failed.run)
		assert.ok(refused)
		const empty = join(directory, 'empty-plan.json')
		writeFileSync(empty, JSON.stringify([]))
		const reportPath = join(directory, 'preparation-report.json')
		const calls = peer.calls.length
		const reference = hashFile(join(directory, 'resource', 'manifest.json'))
		assert.equal(
			Comparison.execute([
				'report',
				'--base',
				directory,
				'--plan',
				empty,
				'--preparation',
				reference.path,
				'--out',
				reportPath,
			]),
			0,
		)
		assert.equal(peer.calls.length, calls)
		const report = readJSON(reportPath)
		assert.ok(isRecord(report) && Array.isArray(report.preparation))
		const preparation: unknown = report.preparation.find(
			(entry: unknown) => isRecord(entry) && entry.run === failed.run,
		)
		assert.ok(
			isRecord(preparation) && isRecord(preparation.costs) && Array.isArray(preparation.costs.wire),
		)
		assert.equal(preparation.run, failed.run)
		assert.equal(preparation.accepted, false)
		assert.equal(preparation.phase, 'resource')
		assert.deepEqual(preparation.manifest, reference)
		const wire: unknown = preparation.costs.wire.find(
			(entry: unknown) => isRecord(entry) && entry.phase === 'trajectory' && entry.role === 'agent',
		)
		assert.ok(isRecord(wire))
		const refusedRequests = refused.requests.filter(
			(entry) => entry.sent && entry.role === 'agent' && entry.goal !== undefined,
		)
		assert.ok(refusedRequests.length > 0)
		assert.ok(
			refusedRequests.every(
				(entry) => entry.prompt !== undefined && entry.completion !== undefined,
			),
		)
		assert.equal(wire.requests, refusedRequests.length)
		assert.equal(
			wire.prompt,
			refusedRequests.reduce((total, entry) => total + (entry.prompt ?? 0), 0),
		)
		assert.equal(
			wire.completion,
			refusedRequests.reduce((total, entry) => total + (entry.completion ?? 0), 0),
		)
		assert.equal(
			wire.wall,
			refusedRequests.reduce((total, entry) => total + entry.wall, 0),
		)
		assert.equal(wire.missing, 0)
		writeFileSync(
			resolve('tmp/units/aggregate-mvp-gate-repairs-resource-sequence.json'),
			JSON.stringify({ budget: failed.budget, status: refused.status, requests: refused.requests }),
		)
		assert.notEqual(refused.status, 'complete')
		const prior = refused.requests.findLast(
			(request) => request.sent && request.role === 'agent' && request.failures.length > 0,
		)
		assert.ok(prior)
		assert.ok(prior.capacity)
		assert.equal(readRequestOutcome(prior, refused.execution.budget, refused.frozen), 'refused')
		const blocked = refused.requests.find((request) => !request.sent)
		assert.ok(blocked)
		assert.equal(blocked.request, null)
		assert.equal(
			blocked.error,
			`Error: decision qualification failed: ${prior.failures.join(', ')}`,
		)
		assert.ok(
			refused.requests
				.filter((request) => !request.sent)
				.every((request) => isStoppedRequest(request, refused.requests)),
		)
		assert.ok(
			!refused.requests.some((request) => request.sent && request.sequence > prior.sequence),
		)
		assert.equal(
			peer.calls.filter(
				(body) =>
					isRecord(body) &&
					body.shift === false &&
					isRecord(body.options) &&
					body.options.num_ctx === failed.budget.window,
			).length,
			refused.requests.filter((request) => request.sent && request.role === 'agent').length,
		)
		assert.doesNotThrow(() => verifyMatrixFeasibility(refused))
		assert.equal(permitsReserve(refused.requests), true)
		assert.equal(isStoppedRequest(blocked, [blocked]), false)
		assert.throws(() => verifyMatrixFeasibility({ ...refused, requests: [blocked] }), /operational/)
		const invalid: readonly MatrixRequest[] = [
			{ ...blocked, error: `decision qualification failed: ${prior.failures.join(', ')}` },
			{ ...blocked, error: 'different stop reason' },
			{ ...blocked, request: {} },
			{ ...blocked, status: 200 },
			{ ...blocked, response: '{}' },
			{ ...blocked, capacity: prior.capacity },
			{ ...blocked, prompt: 1 },
			{ ...blocked, completion: 1 },
			{ ...blocked, reason: 'stop' },
			{ ...blocked, role: 'flush' },
			{ ...blocked, failures: [] },
			{ ...blocked, failures: ['transport', 'length'] },
		]
		for (const request of invalid) {
			const requests: readonly MatrixRequest[] = [prior, request]
			assert.equal(isStoppedRequest(request, requests), false)
			assert.equal(permitsReserve(requests), false)
			assert.throws(() => verifyMatrixFeasibility({ ...refused, requests }), /operational/)
		}
		for (const failure of ['transport', 'usage', 'observation'] as const) {
			const requests: readonly MatrixRequest[] = [{ ...prior, failures: [failure] }, blocked]
			assert.equal(isStoppedRequest(blocked, requests), false)
			assert.equal(permitsReserve(requests), false)
			assert.throws(() => verifyMatrixFeasibility({ ...refused, requests }), /operational/)
		}
		const interrupted: readonly MatrixRequest[] = [
			{ ...prior, error: 'operational fault' },
			blocked,
		]
		assert.equal(isStoppedRequest(blocked, interrupted), false)
		assert.throws(
			() => verifyMatrixFeasibility({ ...refused, requests: interrupted }),
			/operational/,
		)
		assert.ok(isRecord(prior.request))
		const body = prior.request
		assert.equal(body.think, true)
		assert.throws(
			() =>
				verifyMatrixFeasibility({
					...refused,
					requests: refused.requests.map((request) =>
						request.sequence === prior.sequence
							? { ...request, request: { ...body, think: false } }
							: request,
					),
				}),
			/capacity custody/,
		)
		assert.throws(
			() =>
				verifyMatrixFeasibility({
					...refused,
					execution: { ...refused.execution, think: false },
				}),
			/thinking custody/,
		)
		const later: MatrixRequest = {
			...prior,
			sequence: blocked.sequence + 1,
			error: 'later sent transport fault',
			failures: ['transport'],
		}
		const subsequent = [...refused.requests, later]
		assert.equal(permitsReserve(subsequent), false)
		assert.throws(
			() => verifyMatrixFeasibility({ ...refused, requests: subsequent }),
			/operational/,
		)
		const last = resource.attempts.at(-1)
		assert.ok(last)
		assert.equal(last.accepted, true)
		const run = parseMatrixRun(last.run)
		assert.ok(run)
		assert.equal(run.rows.length, 24)
		assert.ok(run.rows.every((row) => row.success === false))
		assert.equal(run.failures.length, 0)
		for (const measured of [refused, run]) {
			for (const request of measured.requests.filter(
				(entry) => entry.sent && entry.role === 'agent',
			)) {
				const pick = measured.picks.findLast(
					(entry) => entry.goal === request.goal && entry.sequence < request.sequence,
				)
				assert.ok(isRecord(request.request))
				assert.equal(request.request.think, request.goal !== undefined && (pick?.pass ?? 1) <= 1)
			}
		}
		peer.length = false
		const before = peer.calls.length
		assert.equal(
			await Matrix.execute([
				'resource',
				'--frozen',
				frozen,
				'--out',
				join(directory, 'baseline'),
				'--live',
				'--url',
				url,
			]),
			0,
		)
		const baseline = readJSON(join(directory, 'baseline', 'manifest.json'))
		assert.ok(isMatrixResource(baseline))
		assert.equal(baseline.attempts.length, 1)
		assert.ok(peer.calls.length > before)
		assert.equal(
			await Matrix.execute([
				'full',
				'--frozen',
				frozen,
				'--resource',
				join(directory, 'baseline', 'manifest.json'),
				'--out',
				join(directory, 'full'),
				'--live',
				'--url',
				url,
			]),
			0,
		)
		const full = readJSON(join(directory, 'full', 'manifest.json'))
		assert.ok(isMatrixResource(full))
		assert.ok(full.budget !== undefined && full.budget.window > 3072)
		const fullAttempt = full.attempts[0]
		assert.ok(fullAttempt)
		const fullRun = parseMatrixRun(fullAttempt.run)
		assert.ok(fullRun)
		assert.equal(fullRun.failures.length, 0)
		assert.ok(
			fullRun.picks.every((pick) => pick.briefing === '' && (pick.aggregates?.length ?? 0) === 0),
		)
		peer.missing = true
		await assert.rejects(
			() =>
				Matrix.execute([
					'resource',
					'--frozen',
					frozen,
					'--out',
					join(directory, 'missing'),
					'--live',
					'--url',
					url,
				]),
			/operational/,
		)
		const missing = readJSON(join(directory, 'missing', 'manifest.json'))
		assert.ok(isMatrixResource(missing))
		assert.equal(missing.attempts.length, 1)
		assert.equal(missing.attempts[0]?.resource, false)
		writeFileSync(settings, '{}')
		assert.throws(() => readFrozen(hashFile(frozen)), /custody mismatch/)
	} finally {
		await peer.destroy()
		rmSync(directory, { recursive: true, force: true })
	}
})
