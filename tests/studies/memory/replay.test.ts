import { isRecord } from '@orkestrel/contract'
import {
	collectStudyEvidence,
	readStudyExchanges,
	readStudyExchangeRows,
	readStudyResult,
} from '@orkestrel/study/server'
import { createScratch, destroyScratch } from '@orkestrel/test/server'
import { readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { expect, it } from 'vitest'
import {
	createMemoryReplayFixture,
	createMemoryServer,
	buildMemoryReplayResponses,
	executeStudyInstall,
	readMemoryEvents,
	readMemoryWorkers,
	STUDY_MEMORY_EVENT_KEYS,
} from '../../setupStudy.js'

it.each(['records', 'compaction'] as const)(
	'AO1 and AP1 seal open %s recording and replay lookup and correction offline in fresh workers under changed TZ and LANG',
	async (arm) => {
		const scratch = createScratch({ parent: resolve('tmp/units'), prefix: 'rec-consumer-replay-' })
		const server = await createMemoryServer(buildMemoryReplayResponses(arm))
		try {
			const fixture = createMemoryReplayFixture(scratch, server.url, arm)
			expect(server.requests).toEqual([])
			expect(fixture.profile.settings?.procedure).toBeUndefined()
			expect(fixture.profile.record).toEqual({ bytes: 4194304, calls: 256, duration: 60000 })
			const output = join(scratch.path, 'recorded')
			const recorded = await executeStudyInstall(
				fixture,
				['execute', 'memory', '--out', output],
				120000,
				{ environment: { TZ: 'UTC', LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' } },
			)
			if (recorded.code !== 0) throw new Error(JSON.stringify(recorded))
			const result = await readStudyResult(output)
			if (result.status !== 'sealed') throw new Error('Open recording did not seal')
			const [trial] = result.manifest.schedule
			if (trial === undefined) throw new Error('Missing recorded trial')
			expect(result.attempts[0]?.observations.map((row) => row.product)).toEqual([
				{ value: { content: 'Initial count is three.' }, partial: false },
				{ value: { content: 'Corrected count is two.' }, partial: false },
			])
			const history = await readStudyExchanges(result, trial.id)
			const sent = server.requests
			expect(history.declaration.procedure).toBeUndefined()
			expect(history.declaration.goals).toEqual(['opening', 'closure'])
			expect(
				history.exchanges.map(({ attempt }) => ({
					path: attempt.path,
					body: Buffer.from(attempt.body, 'base64').toString('utf8'),
				})),
			).toEqual(sent)
			expect(history.exchanges.map(({ attempt }) => attempt.ordinal)).toEqual(
				sent.map((_, index) => index + 1),
			)
			expect(history.exchanges.filter(({ attempt }) => attempt.role === 'metadata')).toHaveLength(8)
			expect(history.exchanges.some(({ attempt }) => attempt.role === 'judge')).toBe(
				arm === 'records',
			)
			expect(history.exchanges.some(({ attempt }) => attempt.role === 'summary')).toBe(
				arm === 'compaction',
			)
			expect(history.completion.count).toBe(sent.length)
			const rows = (await collectStudyEvidence(result))[trial.id]
			if (rows === undefined) throw new Error('Missing recorded evidence')
			expect(readMemoryEvents(rows, 'lookup')).toMatchObject([{ id: 'order-1' }])
			expect(readMemoryEvents(rows, 'arrival').some((row) => row.id === 'correction')).toBe(true)
			for (const event of ['dispatch', 'wire']) {
				expect(
					rows
						.filter((row) => row.event === event)
						.map((row) => (isRecord(row.value) ? row.value.ordinal : undefined)),
				).toEqual(sent.map((_, index) => index + 1))
			}
			expect(
				result.attempts
					.flatMap((attempt) => attempt.observations.flatMap((row) => row.usage))
					.some((usage) => usage.role === 'metadata'),
			).toBe(false)
			const original = readMemoryWorkers(scratch)
			const offline = join(scratch.path, 'offline')
			const prefix = JSON.stringify({ [trial.id]: sent.length })
			const replayed = await executeStudyInstall(
				fixture,
				[
					'execute',
					'memory',
					'--out',
					offline,
					'--replay',
					output,
					'--prefix',
					prefix,
					'--offline',
					'true',
				],
				120000,
				{ environment: { TZ: 'Pacific/Auckland', LANG: 'tr_TR.UTF-8', LC_ALL: 'tr_TR.UTF-8' } },
			)
			if (replayed.code !== 0) throw new Error(JSON.stringify(replayed))
			expect(server.requests).toEqual(sent)
			const replay = await readStudyResult(offline)
			if (replay.status !== 'sealed') throw new Error('Offline replay did not seal')
			expect(
				replay.attempts.map((attempt) => attempt.observations.map((row) => row.product)),
			).toEqual(result.attempts.map((attempt) => attempt.observations.map((row) => row.product)))
			const replayRows = (await collectStudyEvidence(replay))[trial.id]
			if (replayRows === undefined) throw new Error('Missing replay evidence')
			expect(readMemoryEvents(replayRows, 'result').map((row) => row.conversation)).not.toEqual(
				readMemoryEvents(rows, 'result').map((row) => row.conversation),
			)
			const workers = readMemoryWorkers(scratch)
			expect(original.length).toBeGreaterThan(0)
			expect(
				original.every(
					(row) => row.tz === 'UTC' && row.lang === 'en_US.UTF-8' && row.intl.timeZone === 'UTC',
				),
			).toBe(true)
			expect(workers.length).toBeGreaterThan(original.length)
			const pids = original.map((row) => row.pid)
			expect(
				workers
					.slice(original.length)
					.every(
						(row) =>
							!pids.includes(row.pid) &&
							row.tz === 'Pacific/Auckland' &&
							row.lang === 'tr_TR.UTF-8' &&
							row.intl.timeZone === 'Pacific/Auckland' &&
							original.every((before) => before.intl.timeZone !== row.intl.timeZone),
					),
			).toBe(true)
			const replayHistory = await readStudyExchanges(replay, trial.id)
			expect(replayHistory.declaration.procedure).toBeUndefined()
			expect(replayHistory.exchanges).toEqual(history.exchanges)
			const originalSession = scratch.read('studies/memory/StudyMemorySession.ts')
			if (originalSession === undefined) throw new Error('Missing captured memory consumer')
			const drift = originalSession
				.replace(
					'content: input.prompt',
					"content: goal === 'closure' ? input.prompt.replace('corrected', 'corrupted') : input.prompt",
				)
				.replace(
					'this.#ledger.respond(input.prompt, signal)',
					"this.#ledger.respond(goal === 'closure' ? input.prompt.replace('corrected', 'corrupted') : input.prompt, signal)",
				)
			expect(drift).not.toBe(originalSession)
			scratch.write('studies/memory/StudyMemorySession.ts', drift)
			const changedPath = join(scratch.path, 'changed')
			const differing = await executeStudyInstall(
				fixture,
				[
					'execute',
					'memory',
					'--out',
					changedPath,
					'--replay',
					output,
					'--prefix',
					prefix,
					'--offline',
					'true',
				],
				120000,
			)
			expect(differing.code).not.toBe(0)
			expect(differing.stderr).toMatch(/CUSTODY|recorded exchange/)
			const interrupted = await readStudyResult(changedPath)
			expect(interrupted.status).toBe('interrupted')
			const path = join(changedPath, 'execution', 'trials', trial.id, 'exchanges.jsonl')
			expect(server.requests).toEqual(sent)
			const refused = readStudyExchangeRows(await readFile(path), false)
			const failure = refused.find((row) => row.phase === 'failure')
			if (failure === undefined) throw new Error('Missing retained replay divergence')
			expect(failure).toMatchObject({
				goal: 'closure',
				stage: 'execution',
				reason: expect.stringContaining('member=body'),
			})
			const mismatch = refused.find(
				(row) => row.phase === 'attempt' && row.ordinal === failure.ordinal,
			)
			if (mismatch?.phase !== 'attempt') throw new Error('Missing changed request body')
			expect(mismatch.size).toBe(history.exchanges[failure.ordinal - 1]?.attempt.size)
			expect(refused.filter((row) => row.phase === 'attempt').map((row) => row.ordinal)).toEqual(
				Array.from({ length: failure.ordinal }, (_, index) => index + 1),
			)
			expect(refused.some((row) => row.phase === 'failure')).toBe(true)
			expect(refused.some((row) => row.phase === 'complete')).toBe(false)
			scratch.write('studies/memory/StudyMemorySession.ts', originalSession)
			const { record: _record, ...plain } = fixture.profile
			scratch.write(
				'studies/memory/profiles/local.json',
				JSON.stringify({
					...plain,
					settings: arm === 'compaction' ? { gauge: { scale: 1, overhead: 0 } } : {},
				}),
			)
			const unrecorded = join(scratch.path, 'unrecorded')
			const control = await executeStudyInstall(
				fixture,
				['execute', 'memory', '--out', unrecorded],
				120000,
			)
			if (control.code !== 0) throw new Error(JSON.stringify(control))
			const unrecordedResult = await readStudyResult(unrecorded)
			if (unrecordedResult.status !== 'sealed') throw new Error('Unrecorded control did not seal')
			await expect(readStudyExchanges(unrecordedResult, trial.id)).rejects.toThrow(
				/record|sidecar|exchange/i,
			)
			expect(scratch.has(`unrecorded/execution/trials/${trial.id}/exchanges.jsonl`)).toBe(false)
			const plainRows = (await collectStudyEvidence(unrecordedResult))[trial.id]
			if (plainRows === undefined) throw new Error('Missing unrecorded evidence')
			for (const event of ['dispatch', 'wire'] as const) {
				const values = readMemoryEvents(plainRows, event)
				expect(values.length).toBeGreaterThan(0)
				expect(values.map((row) => Object.keys(row).sort())).toEqual(
					values.map(() => STUDY_MEMORY_EVENT_KEYS[event]),
				)
			}
			const beforeRefusal = server.requests
			scratch.write('studies/memory/profiles/local.json', JSON.stringify(fixture.profile))
			const unavailable = await executeStudyInstall(
				fixture,
				[
					'execute',
					'memory',
					'--out',
					join(scratch.path, 'unavailable'),
					'--replay',
					unrecorded,
					'--prefix',
					prefix,
					'--offline',
					'true',
				],
				120000,
			)
			expect(unavailable.code).not.toBe(0)
			expect(unavailable.stderr).toMatch(/record|exchange|sidecar/i)
			expect(server.requests).toEqual(beforeRefusal)
			expect(scratch.has('unavailable')).toBe(false)
		} finally {
			await server.close()
			await destroyScratch(scratch)
		}
	},
	300000,
)

// ICU's win32 uprv_getDefaultLocaleID reads the Windows user locale instead of LANG:
// https://github.com/unicode-org/icu/blob/main/icu4c/source/common/putil.cpp#L1732
it.skipIf(process.platform === 'win32')(
	'AP1 replays under different resolved locales where ICU lets LANG select the default locale',
	async () => {
		const scratch = createScratch({ parent: resolve('tmp/units'), prefix: 'rec-fix-locale-' })
		const server = await createMemoryServer(buildMemoryReplayResponses('records'))
		try {
			const fixture = createMemoryReplayFixture(scratch, server.url, 'records')
			const output = join(scratch.path, 'recorded')
			const recorded = await executeStudyInstall(
				fixture,
				['execute', 'memory', '--out', output],
				120000,
				{ environment: { TZ: 'UTC', LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' } },
			)
			if (recorded.code !== 0) throw new Error(JSON.stringify(recorded))
			const baseline = await readStudyResult(output)
			if (baseline.status !== 'sealed') throw new Error('Locale baseline did not seal')
			const [trial] = baseline.manifest.schedule
			if (trial === undefined) throw new Error('Missing locale trial')
			const history = await readStudyExchanges(baseline, trial.id)
			const original = readMemoryWorkers(scratch)
			expect(original.length).toBeGreaterThan(0)
			const sent = server.requests
			const replayed = await executeStudyInstall(
				fixture,
				[
					'execute',
					'memory',
					'--out',
					join(scratch.path, 'offline'),
					'--replay',
					output,
					'--prefix',
					JSON.stringify({ [trial.id]: history.completion.count }),
					'--offline',
					'true',
				],
				120000,
				{ environment: { TZ: 'Pacific/Auckland', LANG: 'tr_TR.UTF-8', LC_ALL: 'tr_TR.UTF-8' } },
			)
			if (replayed.code !== 0) throw new Error(JSON.stringify(replayed))
			const replay = await readStudyResult(join(scratch.path, 'offline'))
			if (replay.status !== 'sealed') throw new Error('Locale replay did not seal')
			const workers = readMemoryWorkers(scratch).slice(original.length)
			expect(workers.length).toBeGreaterThan(0)
			expect(
				workers.every((row) => original.every((before) => before.intl.locale !== row.intl.locale)),
			).toBe(true)
			expect((await readStudyExchanges(replay, trial.id)).exchanges).toEqual(history.exchanges)
			expect(server.requests).toEqual(sent)
		} finally {
			await server.close()
			destroyScratch(scratch)
		}
	},
	240000,
)

it('AP1 validates every worker resolved locale and time zone observation', () => {
	const scratch = createScratch({ parent: resolve('tmp/units'), prefix: 'rec-fix-workers-' })
	try {
		expect(readMemoryWorkers(scratch)).toEqual([])
		const row = {
			pid: process.pid,
			tz: 'UTC',
			lang: 'en_US.UTF-8',
			intl: Intl.DateTimeFormat().resolvedOptions(),
		}
		scratch.write('workers.jsonl', JSON.stringify(row))
		expect(readMemoryWorkers(scratch)).toEqual([row])
		scratch.write('workers.jsonl', JSON.stringify({ ...row, intl: { timeZone: 'UTC' } }))
		expect(() => readMemoryWorkers(scratch)).toThrow('Malformed memory worker observation')
	} finally {
		destroyScratch(scratch)
	}
})
