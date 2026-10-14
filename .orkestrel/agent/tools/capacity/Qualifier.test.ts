import { strict as assert } from 'node:assert'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import {
	buildCapacityFixture,
	inspectCapacityExecution,
	readCapacityJSON,
	readCapacityLines,
} from './helpers.ts'
import { Qualifier } from './Qualifier.ts'
import { CapacityDaemon } from './tests/CapacityDaemon.ts'
import { createCapacityProof, readCapacityExit } from './tests/helpers.ts'

test('real canonical unfinished eight-step goal preserves partial semantics and continues the complete population', async () => {
	const { directory, proof } = createCapacityProof()
	const daemon = new CapacityDaemon({ unfinished: true, empty: false, fault: false })
	await daemon.start()
	try {
		const out = join(directory, 'attempt')
		assert.equal(
			await new Qualifier({
				out,
				url: daemon.url,
				profile: 'initial',
				plan: false,
				proof,
			}).execute(),
			0,
			JSON.stringify(readCapacityJSON(join(out, 'qualification.json'))),
		)
		for (const cell of ['q4-records', 'q4-compaction', 'q2-records', 'q2-compaction']) {
			const run = join(out, cell, 'run')
			const rows = readCapacityLines(join(run, 'rows.jsonl'))
			assert.deepEqual(
				rows.map((row) => row.goal),
				buildCapacityFixture().runtime.goals.map((goal) => goal.id),
			)
			const unfinished = cell.endsWith('compaction')
			assert.equal(rows[0]?.success, !unfinished)
			assert.equal(rows[0]?.partial, unfinished)
			if (unfinished) assert.equal(rows[0]?.reply, '')
			assert.equal(rows[1]?.success, true)
			const observations = readCapacityLines(join(run, 'observations.jsonl'))
			assert.equal(observations[0]?.complete, !unfinished)
			assert.equal(observations[1]?.complete, true)
			const requests = readCapacityLines(join(run, 'requests.jsonl'))
			if (unfinished)
				assert.equal(
					requests.filter(
						(request) =>
							request.goal === rows[0]?.goal && request.role === 'agent' && request.sent === true,
					).length,
					8,
				)
			assert.equal(
				readCapacityJSON(join(out, cell, 'run-process', 'exit.json')).code,
				unfinished ? 3 : 0,
			)
			assert.equal(readCapacityJSON(join(run, 'run.json')).status, 'complete')
			const reading = readCapacityJSON(join(out, cell, 'reading.json'))
			assert.deepEqual(reading.outcome, {
				attempted: 4,
				successful: unfinished ? 3 : 4,
				unsuccessful: unfinished ? 1 : 0,
				partial: unfinished ? 1 : 0,
				empty: unfinished ? 1 : 0,
			})
			if (cell === 'q4-records') {
				const info = readCapacityJSON(join(run, 'run.json'))
				const expected = buildCapacityFixture().runtime.goals.map((goal) => goal.id)
				const exit = readCapacityExit(join(out, cell, 'run-process', 'exit.json'))
				assert.throws(
					() =>
						inspectCapacityExecution(info, rows, observations, requests, expected, {
							...exit,
							code: 3,
						}),
					/child exit/,
				)
			}
			if (cell === 'q4-compaction') {
				const info = readCapacityJSON(join(run, 'run.json'))
				const expected = buildCapacityFixture().runtime.goals.map((goal) => goal.id)
				const exit = readCapacityExit(join(out, cell, 'run-process', 'exit.json'))
				assert.deepEqual(
					inspectCapacityExecution(info, rows, observations, requests, expected, exit),
					reading.outcome,
				)
				assert.throws(
					() =>
						inspectCapacityExecution(info, rows.slice(1), observations, requests, expected, exit),
					/horizon/,
				)
				assert.throws(
					() =>
						inspectCapacityExecution(
							info,
							[...rows].reverse(),
							observations,
							requests,
							expected,
							exit,
						),
					/goal row/,
				)
				assert.throws(
					() =>
						inspectCapacityExecution(
							info,
							rows,
							observations.map((observation, index) =>
								index === 0 ? { ...observation, complete: true } : observation,
							),
							requests,
							expected,
							exit,
						),
					/observation/,
				)
				assert.throws(
					() =>
						inspectCapacityExecution(
							{ ...info, unserved: 0 },
							rows,
							observations,
							requests,
							expected,
							exit,
						),
					/unserved/,
				)
				assert.throws(
					() =>
						inspectCapacityExecution(
							info,
							rows.map((row, index) => (index === 0 ? { ...row, success: true } : row)),
							observations,
							requests,
							expected,
							exit,
						),
					/semantic outcome/,
				)
				assert.throws(
					() =>
						inspectCapacityExecution(
							info,
							rows.map((row, index) => (index === 0 ? { ...row, partial: 'true' } : row)),
							observations,
							requests,
							expected,
							exit,
						),
					/semantic outcome/,
				)
				assert.throws(
					() =>
						inspectCapacityExecution(
							info,
							rows.map((row, index) =>
								index === 0 ? { ...row, error: 'retained earlier failure' } : row,
							),
							observations,
							requests,
							expected,
							exit,
						),
					/goal row/,
				)
				assert.throws(
					() =>
						inspectCapacityExecution(
							info,
							rows,
							observations,
							requests.map((request, index) =>
								index === 0 ? { ...request, error: 'retained wire failure' } : request,
							),
							expected,
							exit,
						),
					/wire request failed/,
				)
				assert.throws(
					() =>
						inspectCapacityExecution(
							info,
							rows,
							observations,
							requests.filter((request) => request.goal !== expected[0]),
							expected,
							exit,
						),
					/per-goal request/,
				)
				assert.throws(
					() =>
						inspectCapacityExecution(info, rows, observations, requests, expected, {
							...exit,
							expired: true,
						}),
					/child exit/,
				)
				assert.throws(
					() =>
						inspectCapacityExecution(info, rows, observations, requests, expected, {
							...exit,
							signal: 'SIGTERM',
						}),
					/child exit/,
				)
				assert.throws(
					() =>
						inspectCapacityExecution(info, rows, observations, requests, expected, {
							...exit,
							error: 'recorded child error',
						}),
					/child exit/,
				)
				assert.throws(
					() =>
						inspectCapacityExecution(info, rows, observations, requests, expected, {
							...exit,
							code: 0,
						}),
					/child exit/,
				)
			}
		}
		assert.equal(readCapacityJSON(join(out, 'qualification.json')).passed, true)
	} finally {
		await daemon.close()
	}
})

test('real canonical operational exit3 stops the population and remains rejected', async () => {
	const { directory, proof } = createCapacityProof()
	const daemon = new CapacityDaemon({ unfinished: false, empty: false, fault: true })
	await daemon.start()
	try {
		const out = join(directory, 'attempt')
		assert.equal(
			await new Qualifier({
				out,
				url: daemon.url,
				profile: 'initial',
				plan: false,
				proof,
			}).execute(),
			3,
		)
		assert.equal(readCapacityJSON(join(out, 'q4-records', 'run-process', 'exit.json')).code, 3)
		assert.equal(readCapacityJSON(join(out, 'qualification.json')).passed, false)
		assert.equal(existsSync(join(out, 'q4-compaction')), false)
		assert.equal(existsSync(join(out, 'q2-records')), false)
		assert.equal(existsSync(join(out, 'q2-compaction')), false)
	} finally {
		await daemon.close()
	}
})

test('zero-success canonical horizon can qualify execution while every semantic failure remains visible', async () => {
	const { directory, proof } = createCapacityProof()
	const daemon = new CapacityDaemon({ unfinished: true, empty: true, fault: false })
	await daemon.start()
	try {
		const out = join(directory, 'attempt')
		assert.equal(
			await new Qualifier({
				out,
				url: daemon.url,
				profile: 'initial',
				plan: false,
				proof,
			}).execute(),
			0,
			JSON.stringify(readCapacityJSON(join(out, 'qualification.json'))),
		)
		for (const cell of ['q4-records', 'q4-compaction', 'q2-records', 'q2-compaction']) {
			const reading = readCapacityJSON(join(out, cell, 'reading.json'))
			assert.deepEqual(reading.outcome, {
				attempted: 4,
				successful: 0,
				unsuccessful: 4,
				partial: cell.endsWith('compaction') ? 4 : 0,
				empty: 4,
			})
			assert.equal(readCapacityJSON(join(out, cell, 'run-process', 'exit.json')).code, 3)
		}
		assert.equal(readCapacityJSON(join(out, 'qualification.json')).policy, 'execution-only')
	} finally {
		await daemon.close()
	}
})
