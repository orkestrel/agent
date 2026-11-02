import { cpus } from 'node:os'
import { isLedgerSnapshot } from '@src/core'
import { isRecord, parseJSONAs } from '@orkestrel/contract'
import { createRecorder, requireValue, waitForCondition } from '@orkestrel/test'
import { createScratch } from '@orkestrel/test/server'
import { describe, expect, it } from 'vitest'
import { computeTextDigest, seedLedgerPrefix } from './setup.js'
import {
	addBusyWait,
	checkLedgerSample,
	createFixtureServer,
	isLedgerCell,
	LEDGER_CELL_DEFAULT,
	LEDGER_CELL_VARIABLE,
	LEDGER_WARMUP,
	loadLedgerSeed,
	logLedgerSample,
	measureOtherLoad,
	readHostTimes,
	readLedgerCell,
	runLedgerCell,
	stopTimed,
	takeLedgerSample,
	warmLedgerSamples,
	writeLedgerRecord,
} from './setupServer.js'

describe('createFixtureServer', () => {
	it('binds independent loopback listeners, customizes routes, and releases caller-owned resources', async () => {
		const requests = createRecorder<readonly [string]>()
		const first = createFixtureServer([
			{
				method: 'POST',
				path: '/answer',
				handler: async (request) => {
					requests.handler(await request.text())
					return Response.json({ answer: 7 })
				},
			},
		])
		const second = createFixtureServer([
			{ method: 'GET', path: '/other', handler: () => new Response('other') },
		])
		try {
			expect(first.status).toBe('idle')
			const port = await first.start()
			const other = await second.start()
			expect(port).toBeGreaterThan(0)
			expect(other).not.toBe(port)
			expect(first.address?.address).toBe('127.0.0.1')
			expect(second.address?.address).toBe('127.0.0.1')
			const response = await fetch('http://127.0.0.1:' + port + '/answer', {
				method: 'POST',
				body: 'question',
			})
			expect(await response.json()).toEqual({ answer: 7 })
			expect(requests.calls).toEqual([['question']])
			const refused = await fetch('http://127.0.0.1:' + port + '/answer')
			expect(refused.status).toBe(405)
			expect(refused.headers.get('allow')).toBe('POST')
			await refused.text()
			const missing = await fetch('http://127.0.0.1:' + port + '/absent')
			expect(missing.status).toBe(404)
			await missing.text()
			expect(await (await fetch('http://127.0.0.1:' + other + '/other')).text()).toBe('other')
		} finally {
			await Promise.all([first.stop(), second.stop()])
		}
		expect(first.status).toBe('stopped')
		expect(second.status).toBe('stopped')
		expect(first.address).toBeUndefined()
		expect(second.address).toBeUndefined()
	})
	it('lets a caller close the listener when its scenario rejects', async () => {
		const server = createFixtureServer([])
		const failure = new Error('scenario failed')
		await expect(async () => {
			try {
				await server.start()
				throw failure
			} finally {
				await server.stop()
			}
		}).rejects.toBe(failure)
		expect(server.status).toBe('stopped')
		expect(server.address).toBeUndefined()
	})
})

describe('stopTimed', () => {
	it('releases the parked request before it times the stop and reports the elapsed interval', async () => {
		const gate = Promise.withResolvers<void>()
		const entered = createRecorder<readonly []>()
		const released = createRecorder<readonly []>()
		const server = createFixtureServer([
			{
				method: 'GET',
				path: '/parked',
				handler: async () => {
					entered.handler()
					await gate.promise
					return new Response('parked')
				},
			},
		])
		const port = await server.start()
		const reply = fetch('http://127.0.0.1:' + port + '/parked').then((response) => response.text())
		await waitForCondition('the request parked on the gate', () => entered.calls.length === 1)
		expect(entered.calls).toEqual([[]])
		const opening = performance.now()
		const elapsed = await stopTimed(server, () => {
			released.handler()
			gate.resolve()
		})
		const outer = performance.now() - opening
		expect(released.calls).toEqual([[]])
		expect(await reply).toBe('parked')
		expect(server.status).toBe('stopped')
		expect(Number.isFinite(elapsed)).toBe(true)
		expect(elapsed).toBeGreaterThanOrEqual(0)
		expect(elapsed).toBeLessThanOrEqual(outer)
	})
	it('stops a server whose scenario failed and still reports the interval', async () => {
		const server = createFixtureServer([])
		await server.start()
		const failure = new Error('scenario failed')
		const released = createRecorder<readonly []>()
		const drain = await Promise.reject(failure).then(
			() => -1,
			async () => stopTimed(server, released.handler),
		)
		expect(drain).toBeGreaterThanOrEqual(0)
		expect(released.calls).toEqual([[]])
		expect(server.status).toBe('stopped')
	})
})

describe('addBusyWait', () => {
	it('registers nothing for an absent wait and one spinning start listener for a present one', () => {
		const registered = createRecorder<readonly [event: string, handler: () => void]>()
		addBusyWait({ on: (event, handler) => registered.handler(event, handler) }, undefined)
		expect(registered.calls).toEqual([])
		addBusyWait({ on: (event, handler) => registered.handler(event, handler) }, 20)
		expect(registered.calls.map(([event]) => event)).toEqual(['start'])
		const [, handler] = requireValue(registered.calls[0])
		const opening = performance.now()
		handler()
		expect(performance.now() - opening).toBeGreaterThanOrEqual(20)
	})
})

describe('takeLedgerSample', () => {
	it('never reaches the judge, files every reading from cache, and emits one start, one select, and no fault', async () => {
		const seed = await seedLedgerPrefix(18, 'correction')
		const sample = await takeLedgerSample(seed.snapshot)
		expect(sample.asked).toBe(0)
		expect(Object.keys(sample.outcomes)).toEqual(['cached'])
		expect(sample.outcomes.cached ?? 0).toBeGreaterThan(0)
		expect([sample.starts, sample.selects, sample.faults]).toEqual([1, 1, 0])
		expect(sample.wall).toBeGreaterThan(0)
		expect(sample.cpu).toBeGreaterThanOrEqual(0)
		expect(sample.digest).toMatch(/^[0-9a-f]{64}$/)
		expect((await takeLedgerSample(seed.snapshot)).digest).toBe(sample.digest)
	})

	it('reaches the judge when the snapshot holds no judgments', async () => {
		const seed = await seedLedgerPrefix(18, 'correction')
		const sample = await takeLedgerSample({
			...seed.snapshot,
			conversation: { ...seed.snapshot.conversation, judgments: [] },
		})
		expect(sample.asked).toBeGreaterThan(0)
	})

	it('raises the region wall by at least its busy wait', async () => {
		const seed = await seedLedgerPrefix(18, 'control')
		const sample = await takeLedgerSample(seed.snapshot, 30)
		expect(sample.wall).toBeGreaterThanOrEqual(30)
		expect(sample.asked).toBe(0)
	})
})

describe('readHostTimes', () => {
	it('reads the host core times beside this process CPU', () => {
		const times = readHostTimes()
		expect(times.total).toBeGreaterThan(times.idle)
		expect(times.idle).toBeGreaterThanOrEqual(0)
		expect(times.own.user).toBeGreaterThan(0)
	})
})

describe('measureOtherLoad', () => {
	it('returns the run value with the other load as a share of host capacity', async () => {
		const measured = await measureOtherLoad(async () => 'done')
		expect(measured.value).toBe('done')
		expect(measured.load).toBeGreaterThanOrEqual(0)
		expect(measured.load).toBeLessThanOrEqual(1)
	})

	it('leaves its own CPU spent inside the run out of the load', async () => {
		const registered = createRecorder<readonly [event: string, handler: () => void]>()
		addBusyWait({ on: (event, handler) => registered.handler(event, handler) }, 1000)
		const [, spin] = requireValue(registered.calls[0])
		const before = readHostTimes()
		const measured = await measureOtherLoad(async () => {
			spin()
			return 'spun'
		})
		const after = readHostTimes()
		const total = after.total - before.total
		const busy = (total - (after.idle - before.idle)) / total
		// The spin holds one core for the whole run, so a load that kept this process's CPU would
		// read about one core's share above the host's other load; half a core is the bound.
		expect(measured.value).toBe('spun')
		expect(measured.load).toBeLessThan(busy - 0.5 / cpus().length)
	})
})

describe('isLedgerCell', () => {
	it('accepts a full or a default cell and refuses an unknown arm or task, a zero size, a negative wait, or a non-string path', () => {
		const full = {
			arm: 'control',
			size: 800,
			count: 15,
			task: 'digest',
			wait: 2.5,
			warmups: 1,
			seed: 'a.json',
			record: 'b.json',
		}
		expect(isLedgerCell(full)).toBe(true)
		expect(isLedgerCell({ arm: 'correction', size: 100, ...LEDGER_CELL_DEFAULT })).toBe(true)
		for (const refused of [
			{ ...full, arm: 'other' },
			{ ...full, task: 'other' },
			{ ...full, size: 0 },
			{ ...full, count: 1.5 },
			{ ...full, wait: -1 },
			{ ...full, warmups: -1 },
			{ ...full, seed: 1 },
			{ ...full, record: null },
			undefined,
		])
			expect(isLedgerCell(refused)).toBe(false)
	})
})

describe('readLedgerCell', () => {
	it('returns the default cell with the variable unset and the named file cell with it set', () => {
		const scratch = createScratch({ prefix: 'ledger-cell-' })
		try {
			const cell = { arm: 'control', size: 1600, count: 15, task: 'time', wait: 20 }
			const path = scratch.write('cell.json', JSON.stringify(cell))
			const invalid = scratch.write('invalid.json', JSON.stringify({ ...cell, size: 0 }))
			expect(readLedgerCell('control', 1600, {})).toEqual({
				arm: 'control',
				size: 1600,
				count: 3,
				task: 'time',
			})
			expect(readLedgerCell('control', 1600, { [LEDGER_CELL_VARIABLE]: path })).toEqual(cell)
			expect(() => readLedgerCell('control', 800, { [LEDGER_CELL_VARIABLE]: path })).toThrow(
				`${path} names the control arm at 1600, not control at 800`,
			)
			expect(() => readLedgerCell('control', 1600, { [LEDGER_CELL_VARIABLE]: invalid })).toThrow(
				`${invalid} holds no ledger bench cell`,
			)
		} finally {
			scratch.destroy()
		}
	})
})

describe('loadLedgerSeed', () => {
	it('writes a seeded snapshot into its file and reads the same snapshot back', async () => {
		const scratch = createScratch({ prefix: 'ledger-seed-' })
		try {
			const path = `${scratch.path}/seeds/control-18.json`
			const written = await loadLedgerSeed(path, 'control', 18)
			const text = requireValue(scratch.read('seeds/control-18.json'))
			const read = await loadLedgerSeed(path, 'control', 18)
			expect(written.conversation.messages).toHaveLength(18)
			expect(parseJSONAs(text, isLedgerSnapshot)).toEqual(read)
			expect(await computeTextDigest(JSON.stringify(written))).toBe(await computeTextDigest(text))
			expect(await computeTextDigest(JSON.stringify(read))).toBe(await computeTextDigest(text))
			expect(scratch.read('seeds/control-18.json')).toBe(text)
			const invalid = scratch.write('invalid.json', '{}')
			await expect(loadLedgerSeed(invalid, 'control', 18)).rejects.toThrow(
				`${invalid} holds no ledger snapshot`,
			)
		} finally {
			scratch.destroy()
		}
	})

	it('seeds in memory and writes nothing when no file is named', async () => {
		const snapshot = await loadLedgerSeed(undefined, 'correction', 18)
		expect(snapshot.conversation.messages).toHaveLength(18)
		expect(snapshot.requests.length).toBeGreaterThan(0)
	})
})

describe('writeLedgerRecord', () => {
	it('writes a record as JSON under a directory it creates', () => {
		const scratch = createScratch({ prefix: 'ledger-record-' })
		try {
			const record = { pid: process.pid, samples: [1.5, 2] }
			writeLedgerRecord(`${scratch.path}/records/cell.json`, record)
			expect(parseJSONAs(requireValue(scratch.read('records/cell.json')), isRecord)).toEqual(record)
		} finally {
			scratch.destroy()
		}
	})
})

describe('checkLedgerSample', () => {
	it('returns a sample that kept the invariants and refuses a judge call, a second start, a fault, or a reading off cache', async () => {
		const seed = await seedLedgerPrefix(18, 'control')
		const sample = await takeLedgerSample(seed.snapshot)
		expect(checkLedgerSample(sample)).toBe(sample)
		for (const broken of [
			{ ...sample, asked: 1 },
			{ ...sample, starts: 2 },
			{ ...sample, selects: 0 },
			{ ...sample, faults: 1 },
			{ ...sample, outcomes: { ...sample.outcomes, judged: 1 } },
		])
			expect(() => checkLedgerSample(broken)).toThrow('the ledger bench sample broke an invariant')
	})
})

describe('logLedgerSample', () => {
	it('returns the sample it logs', async () => {
		const seed = await seedLedgerPrefix(18, 'control')
		const sample = await takeLedgerSample(seed.snapshot)
		expect(logLedgerSample('warmup', sample)).toBe(sample)
	})
})

describe('warmLedgerSamples', () => {
	it('takes a fixed count when given, and otherwise samples until the wall and count floors or the cap', async () => {
		const seed = await seedLedgerPrefix(18, 'control')
		expect(await warmLedgerSamples(seed.snapshot, undefined, 0)).toEqual([])
		expect(await warmLedgerSamples(seed.snapshot, undefined, 1)).toHaveLength(1)
		expect(await warmLedgerSamples(seed.snapshot, 600, undefined)).toHaveLength(2)
		const ruled = await warmLedgerSamples(seed.snapshot, undefined, undefined)
		const wall = ruled.reduce((sum, sample) => sum + sample.wall, 0)
		expect(ruled.length).toBeGreaterThanOrEqual(LEDGER_WARMUP.least)
		expect(ruled.length).toBeLessThanOrEqual(LEDGER_WARMUP.most)
		expect(ruled.length === LEDGER_WARMUP.most || wall >= LEDGER_WARMUP.wall).toBe(true)
		expect(new Set(ruled.map((sample) => sample.digest)).size).toBe(1)
	})
})

describe('runLedgerCell', () => {
	it('seeds, logs one digest, or warms and times a cell, and writes each record', async () => {
		const scratch = createScratch({ prefix: 'ledger-run-' })
		try {
			const runs = createRecorder<readonly [name: string, iterations: number]>()
			const seed = `${scratch.path}/seeds/control-18.json`
			const record = `${scratch.path}/records/time.json`
			const cell = { arm: 'control', size: 18, seed }
			const seeded = await runLedgerCell(
				() => {
					throw new Error('a seed cell never measures')
				},
				'control',
				18,
				{
					[LEDGER_CELL_VARIABLE]: scratch.write(
						'seed.json',
						JSON.stringify({ ...cell, count: 1, task: 'seed' }),
					),
				},
			)
			const text = requireValue(scratch.read('seeds/control-18.json'))
			expect(seeded.seed).toBe(await computeTextDigest(text))
			expect([seeded.warmups, seeded.samples, seeded.mean]).toEqual([[], [], undefined])
			const digested = await runLedgerCell(
				() => {
					throw new Error('a digest cell never measures')
				},
				'control',
				18,
				{
					[LEDGER_CELL_VARIABLE]: scratch.write(
						'digest.json',
						JSON.stringify({ ...cell, count: 1, task: 'digest' }),
					),
				},
			)
			expect([digested.warmups.length, digested.samples.length, digested.mean]).toEqual([
				0,
				1,
				undefined,
			])
			const timed = await runLedgerCell(
				(name, _options, fn) => ({
					run: async (options) => {
						runs.handler(name, options.iterations)
						await Array.from({ length: options.iterations }).reduce<Promise<void>>(
							(chain) => chain.then(fn),
							Promise.resolve(),
						)
						return { latency: { mean: 1.5, rme: 0.25 } }
					},
				}),
				'control',
				18,
				{
					[LEDGER_CELL_VARIABLE]: scratch.write(
						'time.json',
						JSON.stringify({ ...cell, count: 2, task: 'time', warmups: 1, record }),
					),
				},
			)
			expect(runs.calls).toEqual([['control 18', 2]])
			expect([timed.warmups.length, timed.samples.length, timed.mean, timed.rme]).toEqual([
				1, 2, 1.5, 0.25,
			])
			expect(timed.cell).toEqual({ ...cell, count: 2, task: 'time', warmups: 1, record })
			expect([timed.pid, timed.version, timed.seed]).toEqual([
				process.pid,
				process.version,
				seeded.seed,
			])
			expect(seeded.digests).toEqual([])
			expect(digested.digests).toEqual(digested.samples.map((sample) => sample.digest))
			expect(timed.digests).toEqual(digested.digests)
			expect(
				new Set([...timed.warmups, ...timed.samples].map((sample) => sample.digest)).size,
			).toBe(1)
			expect(parseJSONAs(requireValue(scratch.read('records/time.json')), isRecord)).toEqual(
				parseJSONAs(JSON.stringify(timed), isRecord),
			)
			expect(timed.load).toBeGreaterThanOrEqual(0)
		} finally {
			scratch.destroy()
		}
	})
})
