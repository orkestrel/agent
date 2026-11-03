import {
	buildLedgerBenchOptions,
	computeTextDigest,
	createLedgerJudge,
	createScriptedProvider,
	LEDGER_BENCH_MODEL,
} from '../../../setup.js'
import { LEDGER_WARMUP, loadLedgerSeed, measureOtherLoad } from '../../../setupServer.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseJSONAs } from '@orkestrel/contract'
import { createLedger, isConversationSnapshot, isLedgerSnapshot } from '@src/core'
import { expect, it } from 'vitest'
import { createRecorder } from '@orkestrel/test'

// Each case runs one cell, chosen with `-t` by its title, over a frozen seed of rc-a3, read through
// a path relative to this file so a build copy reads its own seeds.
// A cell loads its input once, takes the warmup readings of LEDGER_WARMUP and discards them, then
// takes its measured readings through one `bench(...).run(...)` call, each returning its own wall as
// the duration, and logs one JSON line: the worker's identity, the input's digest, the readings in
// run order with their CPU, the repetition count each reading times, and the host's other load
// around them. A hydrate cell's region is one `createLedger` call, and the digest of the ledger's
// snapshot, taken outside the region, is one value across its samples. An arm spins inside the
// region, its factor times the wall the hydrate took in the same sample. The slot runner reads the
// line and divides by the repetition count; tinybench's mean and relative margin of error are
// reported and never gate.

it('hydrates the correction seed', { timeout: 300_000 }, async ({ bench, task }) => {
	const seed = await loadLedgerSeed(
		fileURLToPath(
			new URL('../../../../tmp/probes/rc-a3b/seeds/correction-1600.json', import.meta.url),
		),
		'correction',
		1600,
	)
	const digest = await computeTextDigest(JSON.stringify(seed))
	const asked = createRecorder<readonly [key: string]>()
	const provider = createScriptedProvider([{ content: 'Noted.' }])
	const options = buildLedgerBenchOptions(
		createLedgerJudge(
			asked,
			() => Promise.reject(new Error('the hydrate judge was reached')),
			LEDGER_BENCH_MODEL,
		),
		false,
		seed,
	)
	const warmups = createRecorder<readonly [wall: number]>()
	while (
		warmups.count < LEDGER_WARMUP.most &&
		(warmups.count < LEDGER_WARMUP.least ||
			warmups.calls.reduce((sum, [wall]) => sum + wall, 0) < LEDGER_WARMUP.wall)
	) {
		const start = performance.now()
		createLedger(provider, options)
		warmups.handler(performance.now() - start)
	}
	const readings = createRecorder<readonly [wall: number, cpu: number]>()
	const texts = new Set<string>()
	const measured = await measureOtherLoad(() =>
		bench(task.name, { async: false, retainSamples: true }, () => {
			const usage = process.cpuUsage()
			const start = performance.now()
			const ledger = createLedger(provider, options)
			const wall = performance.now() - start
			const spent = process.cpuUsage(usage)
			readings.handler(wall, (spent.user + spent.system) / 1000)
			texts.add(JSON.stringify(ledger.snapshot()))
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
			digests: await Promise.all(Array.from(texts, (text) => computeTextDigest(text))),
			repeat: 1,
			warmups: warmups.calls.map(([wall]) => wall),
			walls: readings.calls.map(([wall]) => wall),
			cpus: readings.calls.map(([, cpu]) => cpu),
			load: measured.load,
			mean: measured.value.latency.mean,
			rme: measured.value.latency.rme,
		}),
	)
	expect(readings.calls).toHaveLength(7)
	expect(texts.size).toBe(1)
	expect(asked.count).toBe(0)
})

it('spins the correction hydrate to the gate', { timeout: 300_000 }, async ({ bench, task }) => {
	// D0 = 0.25, the factor D0 / (1 - D0).
	const factor = 0.3333
	const seed = await loadLedgerSeed(
		fileURLToPath(
			new URL('../../../../tmp/probes/rc-a3b/seeds/correction-1600.json', import.meta.url),
		),
		'correction',
		1600,
	)
	const digest = await computeTextDigest(JSON.stringify(seed))
	const asked = createRecorder<readonly [key: string]>()
	const provider = createScriptedProvider([{ content: 'Noted.' }])
	const options = buildLedgerBenchOptions(
		createLedgerJudge(
			asked,
			() => Promise.reject(new Error('the hydrate judge was reached')),
			LEDGER_BENCH_MODEL,
		),
		false,
		seed,
	)
	const warmups = createRecorder<readonly [wall: number]>()
	while (
		warmups.count < LEDGER_WARMUP.most &&
		(warmups.count < LEDGER_WARMUP.least ||
			warmups.calls.reduce((sum, [wall]) => sum + wall, 0) < LEDGER_WARMUP.wall)
	) {
		const start = performance.now()
		createLedger(provider, options)
		const deadline = start + (performance.now() - start) * (1 + factor)
		while (performance.now() < deadline) {
			// Spins on the clock until the deadline passes.
		}
		warmups.handler(performance.now() - start)
	}
	const readings = createRecorder<readonly [wall: number, cpu: number, region: number]>()
	const texts = new Set<string>()
	const measured = await measureOtherLoad(() =>
		bench(task.name, { async: false, retainSamples: true }, () => {
			const usage = process.cpuUsage()
			const start = performance.now()
			const ledger = createLedger(provider, options)
			const region = performance.now() - start
			const deadline = start + region * (1 + factor)
			while (performance.now() < deadline) {
				// Spins on the clock until the deadline passes.
			}
			const wall = performance.now() - start
			const spent = process.cpuUsage(usage)
			readings.handler(wall, (spent.user + spent.system) / 1000, region)
			texts.add(JSON.stringify(ledger.snapshot()))
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
			digests: await Promise.all(Array.from(texts, (text) => computeTextDigest(text))),
			repeat: 1,
			factor,
			regions: readings.calls.map(([, , region]) => region),
			warmups: warmups.calls.map(([wall]) => wall),
			walls: readings.calls.map(([wall]) => wall),
			cpus: readings.calls.map(([, cpu]) => cpu),
			load: measured.load,
			mean: measured.value.latency.mean,
			rme: measured.value.latency.rme,
		}),
	)
	expect(readings.calls).toHaveLength(7)
	expect(texts.size).toBe(1)
	expect(asked.count).toBe(0)
})

it('spins the correction hydrate past it', { timeout: 300_000 }, async ({ bench, task }) => {
	// D1 = 0.25 + 4.3 × 0.912% = 0.2892 on the hydrate pilot, the factor D1 / (1 - D1).
	const factor = 0.4069
	const seed = await loadLedgerSeed(
		fileURLToPath(
			new URL('../../../../tmp/probes/rc-a3b/seeds/correction-1600.json', import.meta.url),
		),
		'correction',
		1600,
	)
	const digest = await computeTextDigest(JSON.stringify(seed))
	const asked = createRecorder<readonly [key: string]>()
	const provider = createScriptedProvider([{ content: 'Noted.' }])
	const options = buildLedgerBenchOptions(
		createLedgerJudge(
			asked,
			() => Promise.reject(new Error('the hydrate judge was reached')),
			LEDGER_BENCH_MODEL,
		),
		false,
		seed,
	)
	const warmups = createRecorder<readonly [wall: number]>()
	while (
		warmups.count < LEDGER_WARMUP.most &&
		(warmups.count < LEDGER_WARMUP.least ||
			warmups.calls.reduce((sum, [wall]) => sum + wall, 0) < LEDGER_WARMUP.wall)
	) {
		const start = performance.now()
		createLedger(provider, options)
		const deadline = start + (performance.now() - start) * (1 + factor)
		while (performance.now() < deadline) {
			// Spins on the clock until the deadline passes.
		}
		warmups.handler(performance.now() - start)
	}
	const readings = createRecorder<readonly [wall: number, cpu: number, region: number]>()
	const texts = new Set<string>()
	const measured = await measureOtherLoad(() =>
		bench(task.name, { async: false, retainSamples: true }, () => {
			const usage = process.cpuUsage()
			const start = performance.now()
			const ledger = createLedger(provider, options)
			const region = performance.now() - start
			const deadline = start + region * (1 + factor)
			while (performance.now() < deadline) {
				// Spins on the clock until the deadline passes.
			}
			const wall = performance.now() - start
			const spent = process.cpuUsage(usage)
			readings.handler(wall, (spent.user + spent.system) / 1000, region)
			texts.add(JSON.stringify(ledger.snapshot()))
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
			digests: await Promise.all(Array.from(texts, (text) => computeTextDigest(text))),
			repeat: 1,
			factor,
			regions: readings.calls.map(([, , region]) => region),
			warmups: warmups.calls.map(([wall]) => wall),
			walls: readings.calls.map(([wall]) => wall),
			cpus: readings.calls.map(([, cpu]) => cpu),
			load: measured.load,
			mean: measured.value.latency.mean,
			rme: measured.value.latency.rme,
		}),
	)
	expect(readings.calls).toHaveLength(7)
	expect(texts.size).toBe(1)
	expect(asked.count).toBe(0)
})

it('hydrates the control seed', { timeout: 300_000 }, async ({ bench, task }) => {
	const seed = await loadLedgerSeed(
		fileURLToPath(
			new URL('../../../../tmp/probes/rc-a3b/seeds/control-1600.json', import.meta.url),
		),
		'control',
		1600,
	)
	const digest = await computeTextDigest(JSON.stringify(seed))
	const asked = createRecorder<readonly [key: string]>()
	const provider = createScriptedProvider([{ content: 'Noted.' }])
	const options = buildLedgerBenchOptions(
		createLedgerJudge(
			asked,
			() => Promise.reject(new Error('the hydrate judge was reached')),
			LEDGER_BENCH_MODEL,
		),
		false,
		seed,
	)
	const warmups = createRecorder<readonly [wall: number]>()
	while (
		warmups.count < LEDGER_WARMUP.most &&
		(warmups.count < LEDGER_WARMUP.least ||
			warmups.calls.reduce((sum, [wall]) => sum + wall, 0) < LEDGER_WARMUP.wall)
	) {
		const start = performance.now()
		createLedger(provider, options)
		warmups.handler(performance.now() - start)
	}
	const readings = createRecorder<readonly [wall: number, cpu: number]>()
	const texts = new Set<string>()
	const measured = await measureOtherLoad(() =>
		bench(task.name, { async: false, retainSamples: true }, () => {
			const usage = process.cpuUsage()
			const start = performance.now()
			const ledger = createLedger(provider, options)
			const wall = performance.now() - start
			const spent = process.cpuUsage(usage)
			readings.handler(wall, (spent.user + spent.system) / 1000)
			texts.add(JSON.stringify(ledger.snapshot()))
			return { overriddenDuration: wall }
		}).run({ iterations: 15, time: 0, warmup: false, throws: true }),
	)
	console.log(
		JSON.stringify({
			title: task.name,
			pid: process.pid,
			version: process.version,
			v8: process.versions.v8,
			flags: process.execArgv,
			seed: digest,
			digests: await Promise.all(Array.from(texts, (text) => computeTextDigest(text))),
			repeat: 1,
			warmups: warmups.calls.map(([wall]) => wall),
			walls: readings.calls.map(([wall]) => wall),
			cpus: readings.calls.map(([, cpu]) => cpu),
			load: measured.load,
			mean: measured.value.latency.mean,
			rme: measured.value.latency.rme,
		}),
	)
	expect(readings.calls).toHaveLength(15)
	expect(texts.size).toBe(1)
	expect(asked.count).toBe(0)
})

it('spins the control hydrate to 1.05', { timeout: 300_000 }, async ({ bench, task }) => {
	// E0 = 0.05, the factor the arm size.
	const factor = 0.05
	const seed = await loadLedgerSeed(
		fileURLToPath(
			new URL('../../../../tmp/probes/rc-a3b/seeds/control-1600.json', import.meta.url),
		),
		'control',
		1600,
	)
	const digest = await computeTextDigest(JSON.stringify(seed))
	const asked = createRecorder<readonly [key: string]>()
	const provider = createScriptedProvider([{ content: 'Noted.' }])
	const options = buildLedgerBenchOptions(
		createLedgerJudge(
			asked,
			() => Promise.reject(new Error('the hydrate judge was reached')),
			LEDGER_BENCH_MODEL,
		),
		false,
		seed,
	)
	const warmups = createRecorder<readonly [wall: number]>()
	while (
		warmups.count < LEDGER_WARMUP.most &&
		(warmups.count < LEDGER_WARMUP.least ||
			warmups.calls.reduce((sum, [wall]) => sum + wall, 0) < LEDGER_WARMUP.wall)
	) {
		const start = performance.now()
		createLedger(provider, options)
		const deadline = start + (performance.now() - start) * (1 + factor)
		while (performance.now() < deadline) {
			// Spins on the clock until the deadline passes.
		}
		warmups.handler(performance.now() - start)
	}
	const readings = createRecorder<readonly [wall: number, cpu: number, region: number]>()
	const texts = new Set<string>()
	const measured = await measureOtherLoad(() =>
		bench(task.name, { async: false, retainSamples: true }, () => {
			const usage = process.cpuUsage()
			const start = performance.now()
			const ledger = createLedger(provider, options)
			const region = performance.now() - start
			const deadline = start + region * (1 + factor)
			while (performance.now() < deadline) {
				// Spins on the clock until the deadline passes.
			}
			const wall = performance.now() - start
			const spent = process.cpuUsage(usage)
			readings.handler(wall, (spent.user + spent.system) / 1000, region)
			texts.add(JSON.stringify(ledger.snapshot()))
			return { overriddenDuration: wall }
		}).run({ iterations: 15, time: 0, warmup: false, throws: true }),
	)
	console.log(
		JSON.stringify({
			title: task.name,
			pid: process.pid,
			version: process.version,
			v8: process.versions.v8,
			flags: process.execArgv,
			seed: digest,
			digests: await Promise.all(Array.from(texts, (text) => computeTextDigest(text))),
			repeat: 1,
			factor,
			regions: readings.calls.map(([, , region]) => region),
			warmups: warmups.calls.map(([wall]) => wall),
			walls: readings.calls.map(([wall]) => wall),
			cpus: readings.calls.map(([, cpu]) => cpu),
			load: measured.load,
			mean: measured.value.latency.mean,
			rme: measured.value.latency.rme,
		}),
	)
	expect(readings.calls).toHaveLength(15)
	expect(texts.size).toBe(1)
	expect(asked.count).toBe(0)
})

it('spins the control hydrate past 1.05', { timeout: 300_000 }, async ({ bench, task }) => {
	// E1 = 0.05 + (2.776 + 1.3) × 0.2847% = 0.0616 at m = 3 on the hydrate pilot, the factor the arm size.
	const factor = 0.0616
	const seed = await loadLedgerSeed(
		fileURLToPath(
			new URL('../../../../tmp/probes/rc-a3b/seeds/control-1600.json', import.meta.url),
		),
		'control',
		1600,
	)
	const digest = await computeTextDigest(JSON.stringify(seed))
	const asked = createRecorder<readonly [key: string]>()
	const provider = createScriptedProvider([{ content: 'Noted.' }])
	const options = buildLedgerBenchOptions(
		createLedgerJudge(
			asked,
			() => Promise.reject(new Error('the hydrate judge was reached')),
			LEDGER_BENCH_MODEL,
		),
		false,
		seed,
	)
	const warmups = createRecorder<readonly [wall: number]>()
	while (
		warmups.count < LEDGER_WARMUP.most &&
		(warmups.count < LEDGER_WARMUP.least ||
			warmups.calls.reduce((sum, [wall]) => sum + wall, 0) < LEDGER_WARMUP.wall)
	) {
		const start = performance.now()
		createLedger(provider, options)
		const deadline = start + (performance.now() - start) * (1 + factor)
		while (performance.now() < deadline) {
			// Spins on the clock until the deadline passes.
		}
		warmups.handler(performance.now() - start)
	}
	const readings = createRecorder<readonly [wall: number, cpu: number, region: number]>()
	const texts = new Set<string>()
	const measured = await measureOtherLoad(() =>
		bench(task.name, { async: false, retainSamples: true }, () => {
			const usage = process.cpuUsage()
			const start = performance.now()
			const ledger = createLedger(provider, options)
			const region = performance.now() - start
			const deadline = start + region * (1 + factor)
			while (performance.now() < deadline) {
				// Spins on the clock until the deadline passes.
			}
			const wall = performance.now() - start
			const spent = process.cpuUsage(usage)
			readings.handler(wall, (spent.user + spent.system) / 1000, region)
			texts.add(JSON.stringify(ledger.snapshot()))
			return { overriddenDuration: wall }
		}).run({ iterations: 15, time: 0, warmup: false, throws: true }),
	)
	console.log(
		JSON.stringify({
			title: task.name,
			pid: process.pid,
			version: process.version,
			v8: process.versions.v8,
			flags: process.execArgv,
			seed: digest,
			digests: await Promise.all(Array.from(texts, (text) => computeTextDigest(text))),
			repeat: 1,
			factor,
			regions: readings.calls.map(([, , region]) => region),
			warmups: warmups.calls.map(([wall]) => wall),
			walls: readings.calls.map(([wall]) => wall),
			cpus: readings.calls.map(([, cpu]) => cpu),
			load: measured.load,
			mean: measured.value.latency.mean,
			rme: measured.value.latency.rme,
		}),
	)
	expect(readings.calls).toHaveLength(15)
	expect(texts.size).toBe(1)
	expect(asked.count).toBe(0)
})

it('checks the correction ledger snapshot', { timeout: 300_000 }, async ({ bench, task }) => {
	const seed = await loadLedgerSeed(
		fileURLToPath(
			new URL('../../../../tmp/probes/rc-a3b/seeds/correction-1600.json', import.meta.url),
		),
		'correction',
		1600,
	)
	const digest = await computeTextDigest(JSON.stringify(seed))
	// One call stays over 10 ms on either build, so a reading times one call (MM-3).
	const warmups = createRecorder<readonly [wall: number]>()
	while (
		warmups.count < LEDGER_WARMUP.most &&
		(warmups.count < LEDGER_WARMUP.least ||
			warmups.calls.reduce((sum, [wall]) => sum + wall, 0) < LEDGER_WARMUP.wall)
	) {
		const start = performance.now()
		if (!isLedgerSnapshot(seed)) throw new Error('the guard refused the seed')
		warmups.handler(performance.now() - start)
	}
	const readings = createRecorder<readonly [wall: number, cpu: number]>()
	const measured = await measureOtherLoad(() =>
		bench(task.name, { async: false, retainSamples: true }, () => {
			const usage = process.cpuUsage()
			const start = performance.now()
			if (!isLedgerSnapshot(seed)) throw new Error('the guard refused the seed')
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
			repeat: 1,
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

it('checks the control ledger snapshot', { timeout: 300_000 }, async ({ bench, task }) => {
	const seed = await loadLedgerSeed(
		fileURLToPath(
			new URL('../../../../tmp/probes/rc-a3b/seeds/control-1600.json', import.meta.url),
		),
		'control',
		1600,
	)
	const digest = await computeTextDigest(JSON.stringify(seed))
	// K = 40: 41 ms per call on the trial, so a reading holds 100 ms on a build 16 times cheaper (MM-3).
	const rounds = Array.from({ length: 40 }, (_unused, round) => round)
	const warmups = createRecorder<readonly [wall: number]>()
	while (
		warmups.count < LEDGER_WARMUP.most &&
		(warmups.count < LEDGER_WARMUP.least ||
			warmups.calls.reduce((sum, [wall]) => sum + wall, 0) < LEDGER_WARMUP.wall)
	) {
		const start = performance.now()
		for (const round of rounds)
			if (!isLedgerSnapshot(seed)) throw new Error(`the guard refused the seed in round ${round}`)
		warmups.handler(performance.now() - start)
	}
	const readings = createRecorder<readonly [wall: number, cpu: number]>()
	const measured = await measureOtherLoad(() =>
		bench(task.name, { async: false, retainSamples: true }, () => {
			const usage = process.cpuUsage()
			const start = performance.now()
			for (const round of rounds)
				if (!isLedgerSnapshot(seed)) throw new Error(`the guard refused the seed in round ${round}`)
			const wall = performance.now() - start
			const spent = process.cpuUsage(usage)
			readings.handler(wall, (spent.user + spent.system) / 1000)
			return { overriddenDuration: wall }
		}).run({ iterations: 15, time: 0, warmup: false, throws: true }),
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
	expect(readings.calls).toHaveLength(15)
})

it('checks the realistic conversation', { timeout: 300_000 }, async ({ bench, task }) => {
	// The text of a sealed segment of the records trial, read by rc-a10-u10's seed instrument (D76).
	const seed = parseJSONAs(
		readFileSync(
			fileURLToPath(
				new URL('../../../../tmp/probes/rc-a10-u10/conversation.json', import.meta.url),
			),
			'utf8',
		),
		isConversationSnapshot,
	)
	if (seed === undefined)
		throw new Error('the realistic conversation holds no conversation snapshot')
	const digest = await computeTextDigest(JSON.stringify(seed))
	// One call is timed alone in the warmups; the reading then times K back-to-back calls, with K times the warmup median at least 100 ms (MM-3).
	const warmups = createRecorder<readonly [wall: number]>()
	while (
		warmups.count < LEDGER_WARMUP.most &&
		(warmups.count < LEDGER_WARMUP.least ||
			warmups.calls.reduce((sum, [wall]) => sum + wall, 0) < LEDGER_WARMUP.wall)
	) {
		const start = performance.now()
		if (!isConversationSnapshot(seed)) throw new Error('the guard refused the seed')
		warmups.handler(performance.now() - start)
	}
	const sorted = warmups.calls.map(([wall]) => wall).sort((left, right) => left - right)
	const median = sorted[Math.floor(sorted.length / 2)] ?? 0
	const repeat = Math.max(1, Math.ceil(100 / Math.max(median, Number.EPSILON)))
	const rounds = Array.from({ length: repeat }, (_unused, round) => round)
	const readings = createRecorder<readonly [wall: number, cpu: number]>()
	const measured = await measureOtherLoad(() =>
		bench(task.name, { async: false, retainSamples: true }, () => {
			const usage = process.cpuUsage()
			const start = performance.now()
			for (const round of rounds)
				if (!isConversationSnapshot(seed))
					throw new Error(`the guard refused the seed in round ${round}`)
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
			messages: seed.messages.length,
			repeat,
			warmups: warmups.calls.map(([wall]) => wall),
			walls: readings.calls.map(([wall]) => wall),
			perCall: readings.calls.map(([wall]) => wall / repeat),
			cpus: readings.calls.map(([, cpu]) => cpu),
			load: measured.load,
			mean: measured.value.latency.mean,
			rme: measured.value.latency.rme,
		}),
	)
	expect(readings.calls).toHaveLength(7)
})
