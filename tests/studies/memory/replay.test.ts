import { isRecord, parseJSON } from '@orkestrel/contract'
import {
	collectStudyEvidence,
	readStudyExchanges,
	readStudyExchangeRows,
	readStudyResult,
	StudyArtifactLoader,
	StudyProcessDriver,
} from '@orkestrel/study/server'
import { createScratch, destroyScratch } from '@orkestrel/test/server'
import { readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { expect, it } from 'vitest'
import {
	createMemoryReplayFixture,
	createMemoryContext,
	createMemoryServer,
	executeStudyInstall,
	readMemoryEvents,
	runMemoryTrial,
	STUDY_MEMORY_EVENT_KEYS,
	STUDY_MEMORY_REPLAY_GOALS,
} from '../../setupStudy.js'

it('seals Records exchanges and replays their complete prefix in fresh workers without fixture requests', async () => {
	const baseline = await runMemoryTrial({
		arm: 'records',
		responses: [],
		goals: STUDY_MEMORY_REPLAY_GOALS,
	})
	expect(baseline.failure).toBeUndefined()
	expect(baseline.requests.some((request) => request.path === '/api/generate')).toBe(true)
	const scratch = createScratch({ parent: resolve('tmp/units'), prefix: 'mech-a-replay-' })
	try {
		const server = await createMemoryServer(
			Array.from({ length: 8 }, () => ({
				path: '/api/version',
				body: JSON.stringify({ version: 'fixture-1' }),
			})),
		)
		try {
			const fixture = createMemoryReplayFixture(scratch, server.url, baseline)
			const output = join(scratch.path, 'recorded')
			const recorded = await executeStudyInstall(
				fixture,
				['execute', 'memory', '--out', output],
				120000,
			)
			if (recorded.code !== 0)
				throw new Error(
					JSON.stringify({
						recorded,
						attempts: (scratch.has('recorded/execution/trials')
							? scratch.names('recorded/execution/trials')
							: []
						).map((id) => ({
							id,
							attempt: scratch.read(`recorded/execution/trials/${id}/attempt.json`),
						})),
					}),
				)
			expect(recorded).toMatchObject({ code: 0 })
			const result = await readStudyResult(output)
			if (result.status !== 'sealed') throw new Error('Records recording did not seal')
			const [trial] = result.manifest.schedule
			if (trial === undefined) throw new Error('Missing Records trial')
			expect(result.attempts).toMatchObject([
				{
					observations: [
						{
							goal: 'opening',
							product: { value: { content: 'Receipt retained.' }, partial: false },
						},
						{
							goal: 'closure',
							product: { value: { content: 'Receipt retained.' }, partial: false },
						},
					],
				},
			])
			const history = await readStudyExchanges(result, trial.id)
			const sent = server.requests
			expect(history.declaration.procedure.every((step) => step.admission === 'capture')).toBe(true)
			expect(
				history.exchanges.map(({ attempt: request }) => ({
					path: request.path,
					body: Buffer.from(request.body, 'base64').toString('utf8'),
				})),
			).toEqual(sent)
			expect(history.exchanges.map(({ attempt }) => attempt.ordinal)).toEqual(
				sent.map((_, index) => index + 1),
			)
			expect(history.exchanges.filter(({ attempt }) => attempt.role === 'metadata')).toHaveLength(8)
			expect(history.exchanges.some(({ attempt }) => attempt.role === 'judge')).toBe(true)
			expect(history.completion.count).toBe(sent.length)
			const rows = (await collectStudyEvidence(result))[trial.id]
			if (rows === undefined) throw new Error('Missing recorded evidence')
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
			const firstWorkers = scratch.read('workers.jsonl')
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
			)
			expect(replayed).toMatchObject({ code: 0 })
			expect(server.requests).toEqual(sent)
			const replayRequests = server.requests.length - sent.length
			const replay = await readStudyResult(offline)
			if (replay.status !== 'sealed') throw new Error('Offline Records replay did not seal')
			expect(
				replay.attempts.map((attempt) => attempt.observations.map((row) => row.product)),
			).toEqual(result.attempts.map((attempt) => attempt.observations.map((row) => row.product)))
			const replayRows = (await collectStudyEvidence(replay))[trial.id]
			if (replayRows === undefined) throw new Error('Missing replay evidence')
			expect(readMemoryEvents(replayRows, 'result').map((row) => row.conversation)).not.toEqual(
				readMemoryEvents(rows, 'result').map((row) => row.conversation),
			)
			const workers = (scratch.read('workers.jsonl') ?? '')
				.split(/\r\n|\n/)
				.filter(Boolean)
				.map(parseJSON)
			const original = (firstWorkers ?? '')
				.split(/\r\n|\n/)
				.filter(Boolean)
				.map(parseJSON)
			expect(original.length).toBeGreaterThan(0)
			expect(workers.length).toBeGreaterThan(original.length)
			const pids = original.filter(isRecord).map((row) => row.pid)
			expect(
				workers
					.slice(original.length)
					.filter(isRecord)
					.every((row) => !pids.includes(row.pid)),
			).toBe(true)
			const replayHistory = await readStudyExchanges(replay, trial.id)
			expect(replayHistory.declaration.procedure.every((step) => step.admission === 'exact')).toBe(
				true,
			)
			const changed = STUDY_MEMORY_REPLAY_GOALS.map((goal) =>
				goal.id === 'closure'
					? {
							...goal,
							input: { prompt: 'State the repaired order count', arrivals: [], records: [] },
						}
					: goal,
			)
			const directory = scratch.ensure(`changed/execution/trials/${trial.id}`)
			const path = join(directory, 'exchanges.jsonl')
			const context = createMemoryContext(fixture.profile)
			const selection = {
				root: scratch.path,
				entry: fixture.entry,
				profile: fixture.profile,
				adapter: join(scratch.path, 'studies/memory/index.ts'),
			}
			const identity = await new StudyArtifactLoader(selection).inspect()
			const driver = new StudyProcessDriver({
				...selection,
				identity: { ...result.manifest.identity, ...identity },
				driver: 'memory',
				directory,
				exchanges: { [trial.id]: { path, record: { bytes: 1048576 } } },
				replay: { result: output, prefix: { [trial.id]: sent.length }, offline: false },
			})
			try {
				const session = await driver.open(trial, context.context.signal)
				try {
					const [opening, closure] = changed
					if (opening === undefined || closure === undefined)
						throw new Error('Missing changed Records goals')
					expect(JSON.stringify(closure.input).length).toBe(
						JSON.stringify(STUDY_MEMORY_REPLAY_GOALS[1]?.input).length,
					)
					await expect(session.execute(opening, context.context)).resolves.toEqual(
						result.attempts[0]?.observations[0]?.product,
					)
					await expect(session.execute(closure, context.context)).rejects.toMatchObject({
						code: 'FAULT',
						message: expect.stringMatching(/declared model step|recorded exchange/),
					})
				} finally {
					await session.close().then(
						() => undefined,
						() => undefined,
					)
				}
			} finally {
				context.close()
			}
			expect(server.requests).toEqual(sent)
			const refused = readStudyExchangeRows(await readFile(path), false)
			const mismatch = history.exchanges.find(
				({ attempt }) => attempt.goal === 'closure' && attempt.stage === 'execution',
			)
			if (mismatch === undefined) throw new Error('Missing declared closure exchange')
			expect(refused.filter((row) => row.phase === 'attempt').map((row) => row.ordinal)).toEqual(
				Array.from({ length: mismatch.attempt.ordinal - 1 }, (_, index) => index + 1),
			)
			expect(refused.some((row) => row.phase === 'complete')).toBe(false)
			const { record: _record, ...plain } = fixture.profile
			scratch.write(
				'studies/memory/profiles/local.json',
				JSON.stringify({ ...plain, settings: {} }),
			)
			const unrecorded = join(scratch.path, 'unrecorded')
			const control = await executeStudyInstall(
				fixture,
				['execute', 'memory', '--out', unrecorded],
				120000,
			)
			expect(control).toMatchObject({ code: 0 })
			const unrecordedResult = await readStudyResult(unrecorded)
			if (unrecordedResult.status !== 'sealed')
				throw new Error('Unrecorded Records control did not seal')
			await expect(readStudyExchanges(unrecordedResult, trial.id)).rejects.toThrow(
				/record|sidecar|exchange/i,
			)
			expect(scratch.has(`unrecorded/execution/trials/${trial.id}/exchanges.jsonl`)).toBe(false)
			const plainRows = (await collectStudyEvidence(unrecordedResult))[trial.id]
			if (plainRows === undefined) throw new Error('Missing unrecorded control evidence')
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
			const evidence = result.seal.files.find(
				(file) => file.path === `trials/${trial.id}/evidence.jsonl`,
			)
			if (evidence === undefined) throw new Error('Missing sealed evidence member')
			expect((await readFile(join(output, 'execution', history.file.path))).length).toBe(
				history.file.bytes,
			)
			process.stdout.write(
				`Records replay measurement ${JSON.stringify({
					sidecar: history.file.bytes,
					evidence: evidence.bytes,
					exchanges: sent.length,
					replayRequests,
					mismatchOrdinal: mismatch.attempt.ordinal,
					workerPids: workers,
				})}\n`,
			)
		} finally {
			await server.close()
		}
	} finally {
		await destroyScratch(scratch)
	}
}, 300000)
