import { buildJudgmentRecords } from '../../../setup.js'
import { LEDGER_WARMUP, measureOtherLoad } from '../../../setupServer.js'
import { JudgmentManager } from '@src/core'
import { expect, it } from 'vitest'
import { createRecorder, requireValue } from '@orkestrel/test'

// Each case runs one judgment store cell, chosen with `-t` by its title, over amends-shaped records
// the shared builder makes: the correction seed's judgment count for the read and the large
// hydrate, the control seed's for the small hydrate. A cell builds its records once, takes the
// warmup readings of LEDGER_WARMUP and discards them, then takes its measured readings through one
// `bench(...).run(...)` call, each returning its own wall as the duration, and logs one JSON line:
// the worker's identity, the record count, the mean serialized record length, the repetition count
// each reading times, the readings in run order, and the host's other load around them. Each
// repetition count is fixed from the warmup median after the first warmup, before any measured
// reading: a read repeats every id until a reading holds at least 100 ms, the small hydrate repeats
// its construction that way only when one construction takes under 10 ms, and the large hydrate
// constructs once. The slot runner reads the line; tinybench's mean and relative margin of error
// are reported and never gate.

// The measured readings of every cell.
const SAMPLE_COUNT = 15

// The correction seed's judgment count, and the control seed's.
const CORRECTION_COUNT = 51_106
const CONTROL_COUNT = 1_804

// The least wall in milliseconds a repeated reading holds, and the warmup median in milliseconds
// below which a hydrate repeats.
const REPEAT = Object.freeze({ floor: 100, below: 10 })

// The case timeout, under the slot runner's 600 s process cap.
const CELL_TIMEOUT = 120_000

it('reads 51106 judgments by id', { timeout: CELL_TIMEOUT }, async ({ bench, task }) => {
	const records = buildJudgmentRecords(CORRECTION_COUNT)
	const ids = records.map((record) => record.id)
	const manager = new JudgmentManager(records)
	const warmups = createRecorder<readonly [wall: number]>()
	while (
		warmups.count < LEDGER_WARMUP.most &&
		(warmups.count < LEDGER_WARMUP.least ||
			warmups.calls.reduce((sum, [wall]) => sum + wall, 0) < LEDGER_WARMUP.wall)
	) {
		const start = performance.now()
		for (const id of ids)
			if (manager.judgment(id) === undefined) throw new Error(`the store lost ${id}`)
		warmups.handler(performance.now() - start)
	}
	const steady = warmups.calls.slice(1).map(([wall]) => wall)
	steady.sort((left, right) => left - right)
	const median =
		(requireValue(steady[Math.floor((steady.length - 1) / 2)]) +
			requireValue(steady[Math.ceil((steady.length - 1) / 2)])) /
		2
	const repeat = Math.max(1, Math.ceil(REPEAT.floor / median))
	const rounds = Array.from({ length: repeat }, (_unused, round) => round)
	const samples = createRecorder<readonly [wall: number]>()
	const measured = await measureOtherLoad(() =>
		bench(task.name, { async: false, retainSamples: true }, () => {
			const start = performance.now()
			for (const round of rounds)
				for (const id of ids)
					if (manager.judgment(id) === undefined)
						throw new Error(`the store lost ${id} in round ${round}`)
			const wall = performance.now() - start
			samples.handler(wall)
			return { overriddenDuration: wall }
		}).run({ iterations: SAMPLE_COUNT, time: 0, warmup: false, throws: true }),
	)
	console.log(
		JSON.stringify({
			title: task.name,
			pid: process.pid,
			version: process.version,
			v8: process.versions.v8,
			flags: process.execArgv,
			records: records.length,
			length:
				records.reduce((sum, record) => sum + JSON.stringify(record).length, 0) / records.length,
			repeat,
			operations: repeat * records.length,
			warmups: warmups.calls.map(([wall]) => wall),
			readings: samples.calls.map(([wall]) => wall),
			load: measured.load,
			mean: measured.value.latency.mean,
			rme: measured.value.latency.rme,
		}),
	)
	expect(samples.calls).toHaveLength(SAMPLE_COUNT)
})

it('hydrates 51106 judgments', { timeout: CELL_TIMEOUT }, async ({ bench, task }) => {
	const records = buildJudgmentRecords(CORRECTION_COUNT)
	const warmups = createRecorder<readonly [wall: number]>()
	while (
		warmups.count < LEDGER_WARMUP.most &&
		(warmups.count < LEDGER_WARMUP.least ||
			warmups.calls.reduce((sum, [wall]) => sum + wall, 0) < LEDGER_WARMUP.wall)
	) {
		const start = performance.now()
		if (new JudgmentManager(records).count !== records.length)
			throw new Error('the store lost a record')
		warmups.handler(performance.now() - start)
	}
	const samples = createRecorder<readonly [wall: number]>()
	const measured = await measureOtherLoad(() =>
		bench(task.name, { async: false, retainSamples: true }, () => {
			const start = performance.now()
			if (new JudgmentManager(records).count !== records.length)
				throw new Error('the store lost a record')
			const wall = performance.now() - start
			samples.handler(wall)
			return { overriddenDuration: wall }
		}).run({ iterations: SAMPLE_COUNT, time: 0, warmup: false, throws: true }),
	)
	console.log(
		JSON.stringify({
			title: task.name,
			pid: process.pid,
			version: process.version,
			v8: process.versions.v8,
			flags: process.execArgv,
			records: records.length,
			length:
				records.reduce((sum, record) => sum + JSON.stringify(record).length, 0) / records.length,
			repeat: 1,
			operations: 1,
			warmups: warmups.calls.map(([wall]) => wall),
			readings: samples.calls.map(([wall]) => wall),
			load: measured.load,
			mean: measured.value.latency.mean,
			rme: measured.value.latency.rme,
		}),
	)
	expect(samples.calls).toHaveLength(SAMPLE_COUNT)
})

it('hydrates 1804 judgments', { timeout: CELL_TIMEOUT }, async ({ bench, task }) => {
	const records = buildJudgmentRecords(CONTROL_COUNT)
	const warmups = createRecorder<readonly [wall: number]>()
	while (
		warmups.count < LEDGER_WARMUP.most &&
		(warmups.count < LEDGER_WARMUP.least ||
			warmups.calls.reduce((sum, [wall]) => sum + wall, 0) < LEDGER_WARMUP.wall)
	) {
		const start = performance.now()
		if (new JudgmentManager(records).count !== records.length)
			throw new Error('the store lost a record')
		warmups.handler(performance.now() - start)
	}
	const steady = warmups.calls.slice(1).map(([wall]) => wall)
	steady.sort((left, right) => left - right)
	const median =
		(requireValue(steady[Math.floor((steady.length - 1) / 2)]) +
			requireValue(steady[Math.ceil((steady.length - 1) / 2)])) /
		2
	const repeat = median < REPEAT.below ? Math.ceil(REPEAT.floor / median) : 1
	const rounds = Array.from({ length: repeat }, (_unused, round) => round)
	const samples = createRecorder<readonly [wall: number]>()
	const measured = await measureOtherLoad(() =>
		bench(task.name, { async: false, retainSamples: true }, () => {
			const start = performance.now()
			for (const round of rounds)
				if (new JudgmentManager(records).count !== records.length)
					throw new Error(`the store lost a record in round ${round}`)
			const wall = performance.now() - start
			samples.handler(wall)
			return { overriddenDuration: wall }
		}).run({ iterations: SAMPLE_COUNT, time: 0, warmup: false, throws: true }),
	)
	console.log(
		JSON.stringify({
			title: task.name,
			pid: process.pid,
			version: process.version,
			v8: process.versions.v8,
			flags: process.execArgv,
			records: records.length,
			length:
				records.reduce((sum, record) => sum + JSON.stringify(record).length, 0) / records.length,
			repeat,
			operations: repeat,
			warmups: warmups.calls.map(([wall]) => wall),
			readings: samples.calls.map(([wall]) => wall),
			load: measured.load,
			mean: measured.value.latency.mean,
			rme: measured.value.latency.rme,
		}),
	)
	expect(samples.calls).toHaveLength(SAMPLE_COUNT)
})
