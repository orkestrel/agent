import { CHANNEL_BENCH_CELLS, measureChannelCell } from '../../../setup.js'
import { measureOtherLoad } from '../../../setupServer.js'
import { expect, it } from 'vitest'
import { createRecorder } from '@orkestrel/test'

// Each case runs one channel bench cell, chosen with `-t` by its title. The cell's warmups run
// first and are discarded; its samples then run through one `bench(...).run(...)` call with the
// host's other load read around them, and the case logs one JSON line, the sample record the slot
// runner keeps. The bench reads its samples from the measures' own marks, so tinybench's mean and
// relative margin of error are reported and never gate. The line also names the worker's process,
// Node, V8, and flags, so the slot runner can read that each cell ran in a forked worker on one
// Node with one flag set, and the cell's busy wait, so it can read that only the sensitivity rows
// spin. The timeout is three times the slowest cell of the after slot, the generation at 20000
// values on the before build: 30 warmups and 7 samples of about 1.07 s each, about 40 s.

it.for(CHANNEL_BENCH_CELLS)('$title', { timeout: 120_000 }, async (cell, { bench }) => {
	for (const warmup of Array.from({ length: cell.warmups }, () => cell))
		await measureChannelCell(warmup)
	const readings = createRecorder<readonly [wall: number, cpu: number]>()
	const measured = await measureOtherLoad(async () =>
		bench(cell.title, {}, async () => {
			const before = process.cpuUsage()
			const wall = await measureChannelCell(cell)
			const used = process.cpuUsage(before)
			readings.handler(wall, (used.user + used.system) / 1000)
		}).run({ time: 0, iterations: cell.samples, warmup: false, throws: true }),
	)
	console.log(
		JSON.stringify({
			title: cell.title,
			pid: process.pid,
			version: process.version,
			v8: process.versions.v8,
			flags: process.execArgv,
			rounds: cell.rounds,
			warmups: cell.warmups,
			spin: cell.spin ?? 0,
			readings: readings.calls.map(([wall, cpu]) => ({ wall, cpu })),
			load: measured.load,
			mean: measured.value.latency.mean,
			rme: measured.value.latency.rme,
		}),
	)
	expect(readings.calls).toHaveLength(cell.samples)
})
