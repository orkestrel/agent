import { isRecord, parseJSON } from '@orkestrel/contract'
import { collectStudyEvidence, readStudyExchanges, readStudyResult } from '@orkestrel/study/server'
import { createScratch, destroyScratch, isRunning } from '@orkestrel/test/server'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'
import {
	buildMemoryReplayGoals,
	buildMemoryReplayResponses,
	createMemoryDaemonFixture,
	createMemoryReplayFixture,
	createMemoryServer,
	executeStudyInstall,
	readMemoryEvents,
	readMemoryDaemonPids,
	readMemoryDaemonRequests,
	writeMemoryReplayHorizon,
} from '../../setupStudy.js'

it('reads empty daemon journals and refuses malformed process ids and request positions', () => {
	expect(readMemoryDaemonPids('')).toEqual([])
	expect(readMemoryDaemonRequests('')).toEqual([])
	expect(() => readMemoryDaemonPids('0\n')).toThrow('Malformed daemon process receipt')
	expect(() => readMemoryDaemonPids('"process"\n')).toThrow('Malformed daemon process receipt')
	expect(() =>
		readMemoryDaemonRequests('{"method":"GET","path":"/api/version","body":"","positions":[{}]}\n'),
	).toThrow('Malformed daemon request journal')
})

it.each(['records', 'compaction'] as const)(
	'AC1 extends a sealed %s trial by one goal from recorded responses with equal ancestor products and no prefix model traffic',
	async (arm) => {
		const scratch = createScratch({ parent: resolve('tmp/units'), prefix: 'rec-consumer-extend-' })
		const server = await createMemoryServer(buildMemoryReplayResponses(arm))
		try {
			const daemon = await createMemoryDaemonFixture(scratch, server.url)
			try {
				const goals = buildMemoryReplayGoals(arm)
				const fixture = createMemoryReplayFixture(scratch, daemon.url, arm, {
					goals: goals.slice(0, 1),
					daemon: daemon.declaration,
				})
				const output = join(scratch.path, 'ancestor')
				const recorded = await executeStudyInstall(
					fixture,
					['execute', 'memory', '--out', output],
					120000,
				)
				if (recorded.code !== 0) throw new Error(JSON.stringify(recorded))
				const ancestor = await readStudyResult(output)
				if (ancestor.status !== 'sealed') throw new Error('Continuation ancestor did not seal')
				const [trial] = ancestor.manifest.schedule
				if (trial === undefined) throw new Error('Missing continuation trial')
				const history = await readStudyExchanges(ancestor, trial.id)
				expect(history.declaration.procedure).toBeUndefined()
				expect(history.declaration.goals).toEqual(['opening'])
				expect(history.exchanges.some(({ attempt }) => attempt.role === 'summary')).toBe(
					arm === 'compaction',
				)
				expect(ancestor.attempts[0]?.observations.map((row) => row.product)).toEqual([
					{ value: { content: 'Initial count is three.' }, partial: false },
				])
				expect(daemon.pids).toHaveLength(1)
				expect(daemon.pids.map(isRunning)).toEqual([false])
				const received = daemon.requests
				const served = server.requests
				const offline = join(scratch.path, 'ancestor-offline')
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
						JSON.stringify({ [trial.id]: history.completion.count }),
						'--offline',
						'true',
					],
					120000,
				)
				if (replayed.code !== 0) throw new Error(JSON.stringify(replayed))
				expect(daemon.requests).toEqual(received)
				expect(server.requests).toEqual(served)
				expect(daemon.pids).toHaveLength(1)
				const offlineAncestor = await readStudyResult(offline)
				if (offlineAncestor.status !== 'sealed')
					throw new Error('Ancestor offline replay did not seal')
				expect(
					offlineAncestor.attempts.map((attempt) => attempt.observations.map((row) => row.product)),
				).toEqual(
					ancestor.attempts.map((attempt) => attempt.observations.map((row) => row.product)),
				)
				writeMemoryReplayHorizon(scratch, goals)
				const extendedPath = join(scratch.path, 'extended')
				const extended = await executeStudyInstall(
					fixture,
					['execute', 'memory', '--out', extendedPath, '--extend', output],
					120000,
				)
				const traffic = daemon.requests.slice(received.length)
				const models = traffic.filter((request) => {
					const body = parseJSON(request.body)
					return (
						request.path === '/api/chat' ||
						(request.path === '/api/generate' && isRecord(body) && body.keep_alive !== 0)
					)
				})
				expect(models.length).toBeGreaterThan(0)
				expect(
					models.every(
						(request) =>
							request.positions.length === 1 &&
							request.positions.every(
								(position) => position.goal === 'closure' && position.stage === 'execution',
							),
					),
				).toBe(true)
				if (extended.code !== 0) throw new Error(JSON.stringify(extended))
				const result = await readStudyResult(extendedPath)
				if (result.status !== 'sealed') throw new Error('Continuation did not seal')
				expect(result.attempts[0]?.observations.map((row) => row.goal)).toEqual([
					'opening',
					'closure',
				])
				expect(result.attempts[0]?.observations.map((row) => row.product)).toEqual([
					ancestor.attempts[0]?.observations[0]?.product,
					{ value: { content: 'Corrected count is two.' }, partial: false },
				])
				expect(result.manifest.identity.runtime).toBe(ancestor.manifest.identity.runtime)
				expect(result.manifest.identity.content).toBe(ancestor.manifest.identity.content)
				expect(result.manifest.ancestor?.seal).toBe(ancestor.seal.id)
				const continued = await readStudyExchanges(result, trial.id)
				const prefix = history.exchanges.find(({ attempt }) => attempt.stage === 'postflight')
					?.attempt.ordinal
				if (prefix === undefined) throw new Error('Missing ancestor postflight')
				expect(continued.declaration.goals).toEqual(['opening', 'closure'])
				expect(continued.declaration.ancestor?.prefix).toBe(prefix - 1)
				expect(continued.declaration.ancestor?.seal).toBe(ancestor.seal.id)
				expect(
					continued.exchanges.filter(
						({ attempt }) => attempt.ordinal < prefix && attempt.stage !== 'maintenance',
					),
				).toEqual(
					history.exchanges.filter(
						({ attempt }) => attempt.ordinal < prefix && attempt.stage !== 'maintenance',
					),
				)
				expect(
					traffic.slice(0, 4).map((request) => ({ method: request.method, path: request.path })),
				).toEqual([
					{ method: 'GET', path: '/api/version' },
					{ method: 'GET', path: '/api/tags' },
					{ method: 'POST', path: '/api/generate' },
					{ method: 'POST', path: '/api/generate' },
				])
				expect(traffic.slice(2, 4).map((request) => parseJSON(request.body))).toEqual([
					{ model: 'model', keep_alive: 0 },
					{ model: 'judge', keep_alive: 0 },
				])
				expect(models.map((request) => request.positions)).toEqual(
					continued.exchanges
						.filter(({ attempt }) => attempt.stage === 'execution' && attempt.goal === 'closure')
						.map(({ attempt }) => [
							{ ordinal: attempt.ordinal, goal: 'closure', stage: 'execution' },
						]),
				)
				expect(models.map((request) => ({ path: request.path, body: request.body }))).toEqual(
					continued.exchanges
						.filter(({ attempt }) => attempt.stage === 'execution' && attempt.goal === 'closure')
						.map(({ attempt }) => ({
							path: attempt.path,
							body: Buffer.from(attempt.body, 'base64').toString('utf8'),
						})),
				)
				expect(traffic.slice(-4).map((request) => request.path)).toEqual([
					'/api/version',
					'/api/tags',
					'/api/show',
					'/api/show',
				])
				const ancestorRows = (await collectStudyEvidence(ancestor))[trial.id]
				const continuedRows = (await collectStudyEvidence(result))[trial.id]
				if (ancestorRows === undefined || continuedRows === undefined)
					throw new Error('Missing lineage evidence')
				expect(readMemoryEvents(continuedRows, 'result')[0]?.conversation).not.toBe(
					readMemoryEvents(ancestorRows, 'result')[0]?.conversation,
				)
				expect(readMemoryEvents(continuedRows, 'lookup')).toMatchObject([{ id: 'order-1' }])
				expect(daemon.pids).toHaveLength(2)
				expect(daemon.pids.map(isRunning)).toEqual([false, false])
				const finalTraffic = daemon.requests
				const finalServed = server.requests
				const replayedExtension = await executeStudyInstall(
					fixture,
					[
						'execute',
						'memory',
						'--out',
						join(scratch.path, 'extended-offline'),
						'--replay',
						extendedPath,
						'--prefix',
						JSON.stringify({ [trial.id]: continued.completion.count }),
						'--offline',
						'true',
					],
					120000,
				)
				if (replayedExtension.code !== 0) throw new Error(JSON.stringify(replayedExtension))
				const extensionReplay = await readStudyResult(join(scratch.path, 'extended-offline'))
				if (extensionReplay.status !== 'sealed')
					throw new Error('Extended recording offline replay did not seal')
				expect(
					extensionReplay.attempts.map((attempt) => attempt.observations.map((row) => row.product)),
				).toEqual(result.attempts.map((attempt) => attempt.observations.map((row) => row.product)))
				expect(daemon.requests).toEqual(finalTraffic)
				expect(server.requests).toEqual(finalServed)
				expect(daemon.pids).toHaveLength(2)
			} finally {
				await daemon.close()
			}
		} finally {
			await server.close()
			await destroyScratch(scratch)
		}
	},
	300000,
)
