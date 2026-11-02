import { buildMemoSnapshot, computeTextDigest } from '../../../setup.js'
import { LEDGER_WARMUP, measureOtherLoad } from '../../../setupServer.js'
import { isMemo, isMemoSnapshot } from '@src/core'
import { expect, it } from 'vitest'
import { createRecorder, requireValue } from '@orkestrel/test'

// Each case runs one cell, chosen with `-t` by its title, over the shared builder's memo set. A cell
// builds its input once, takes the warmup readings of LEDGER_WARMUP and discards them, then takes
// its measured readings through one `bench(...).run(...)` call, each returning its own wall as the
// duration, and logs one JSON line: the worker's identity, the input's digest, the readings in run
// order with their CPU, the repetition count each reading times, and the host's other load around
// them. The slot runner reads the line and divides by the repetition count; tinybench's mean and
// relative margin of error are reported and never gate.

it('checks a memo set of 1000', { timeout: 300_000 }, async ({ bench, task }) => {
	const snapshot = buildMemoSnapshot(1000)
	const digest = await computeTextDigest(JSON.stringify(snapshot))
	// K = 40: 26 ms per call on the trial, so a reading holds 100 ms on a build 10 times cheaper (MM-3).
	const rounds = Array.from({ length: 40 }, (_unused, round) => round)
	const warmups = createRecorder<readonly [wall: number]>()
	while (
		warmups.count < LEDGER_WARMUP.most &&
		(warmups.count < LEDGER_WARMUP.least ||
			warmups.calls.reduce((sum, [wall]) => sum + wall, 0) < LEDGER_WARMUP.wall)
	) {
		const start = performance.now()
		for (const round of rounds)
			if (!isMemoSnapshot(snapshot))
				throw new Error(`the guard refused the memo set in round ${round}`)
		warmups.handler(performance.now() - start)
	}
	const readings = createRecorder<readonly [wall: number, cpu: number]>()
	const measured = await measureOtherLoad(() =>
		bench(task.name, { async: false, retainSamples: true }, () => {
			const usage = process.cpuUsage()
			const start = performance.now()
			for (const round of rounds)
				if (!isMemoSnapshot(snapshot))
					throw new Error(`the guard refused the memo set in round ${round}`)
			const wall = performance.now() - start
			const spent = process.cpuUsage(usage)
			readings.handler(wall, (spent.user + spent.system) / 1000)
			return { overriddenDuration: wall }
		}).run({ iterations: 7, time: 0, warmup: false, throws: true }),
	)
	console.log(
		JSON.stringify({
			title: task.name,
			pid: process.pid,
			version: process.version,
			v8: process.versions.v8,
			flags: process.execArgv,
			seed: digest,
			repeat: 40,
			warmups: warmups.calls.map(([wall]) => wall),
			walls: readings.calls.map(([wall]) => wall),
			cpus: readings.calls.map(([, cpu]) => cpu),
			load: measured.load,
			mean: measured.value.latency.mean,
			rme: measured.value.latency.rme,
		}),
	)
	expect(readings.calls).toHaveLength(7)
})

it('checks one memo per call', { timeout: 300_000 }, async ({ bench, task }) => {
	const snapshot = buildMemoSnapshot(1000)
	const digest = await computeTextDigest(JSON.stringify(snapshot))
	// K = 40000: 26 µs per call on the trial, so a reading holds 100 ms on a build 10 times cheaper (MM-3).
	const calls = Array.from({ length: 40_000 }, (_unused, call) =>
		requireValue(snapshot.memos[call % snapshot.memos.length]),
	)
	const warmups = createRecorder<readonly [wall: number]>()
	while (
		warmups.count < LEDGER_WARMUP.most &&
		(warmups.count < LEDGER_WARMUP.least ||
			warmups.calls.reduce((sum, [wall]) => sum + wall, 0) < LEDGER_WARMUP.wall)
	) {
		const start = performance.now()
		for (const memo of calls) if (!isMemo(memo)) throw new Error('the guard refused a memo')
		warmups.handler(performance.now() - start)
	}
	const readings = createRecorder<readonly [wall: number, cpu: number]>()
	const measured = await measureOtherLoad(() =>
		bench(task.name, { async: false, retainSamples: true }, () => {
			const usage = process.cpuUsage()
			const start = performance.now()
			for (const memo of calls) if (!isMemo(memo)) throw new Error('the guard refused a memo')
			const wall = performance.now() - start
			const spent = process.cpuUsage(usage)
			readings.handler(wall, (spent.user + spent.system) / 1000)
			return { overriddenDuration: wall }
		}).run({ iterations: 7, time: 0, warmup: false, throws: true }),
	)
	console.log(
		JSON.stringify({
			title: task.name,
			pid: process.pid,
			version: process.version,
			v8: process.versions.v8,
			flags: process.execArgv,
			seed: digest,
			repeat: 40_000,
			warmups: warmups.calls.map(([wall]) => wall),
			walls: readings.calls.map(([wall]) => wall),
			cpus: readings.calls.map(([, cpu]) => cpu),
			load: measured.load,
			mean: measured.value.latency.mean,
			rme: measured.value.latency.rme,
		}),
	)
	expect(readings.calls).toHaveLength(7)
})
