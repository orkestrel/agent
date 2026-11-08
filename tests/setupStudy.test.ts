import type {
	MemoryGateClause,
	MemoryLabelNode,
	MemoryLabelRun,
	MemoryLabelVerdict,
} from './setupStudy.js'
import { isRecord, isArray, parseJSON } from '@orkestrel/contract'
import type { StudyLabelAnswer, StudyLabelLane, StudyLabelMap } from '@orkestrel/study/server'
import { parseStudyLabels } from '@orkestrel/study'
import {
	STUDY_LABEL_DISPUTE,
	createStudyLabelPool,
	createStudyLabels,
	hashStudyBytes,
	isStudyCustodyManifest,
	studyLabelAnswersContract,
	translateStudyPacketLabels,
} from '@orkestrel/study/server'
import { createRecorder } from '@orkestrel/test'
import { createScratch, destroyScratch } from '@orkestrel/test/server'
import { lstatSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { StudyMemoryDriver } from '../studies/memory/index.js'
import {
	assertMemoryReplay,
	buildMemoryReplayEvidence,
	mapMemoryReplayIds,
	readMemoryReplayMessages,
	MEMORY_EVIDENCE,
	MEMORY_GATE_ROWS,
	MEMORY_LABEL_ABSENT,
	MEMORY_LABEL_CONTROLS,
	MEMORY_LABEL_EFFORT,
	MEMORY_LABEL_HARNESS,
	MemoryServer,
	buildCustodyManifest,
	buildMemoryGateJudgments,
	buildMemoryGatePopulation,
	buildMemoryGradeFixture,
	buildMemoryLabelFixture,
	buildMemoryLabelLanes,
	buildMemoryLabelMap,
	buildMemoryLabelSegments,
	buildMemoryLabelNodes,
	buildMemoryLabelRun,
	collectMemorySpotRows,
	collectMemoryThirdRows,
	computeMemoryGate,
	computeMemoryPilot,
	computeMemorySpread,
	extractMemoryHarness,
	filterMemoryReceipts,
	readMemoryLabelPartition,
	parseMemoryGateAssignment,
	parseMemoryGateClauses,
	parseMemoryLabelPlan,
	readMemoryJournal,
	readMemoryTranscript,
	renderMemoryJournalFixture,
	renderMemoryLabelScript,
	renderMemoryTranscriptFixture,
	buildStudyAssessment,
	captureStudyPackages,
	createStudyMeterFixture,
	buildMemoryEdge,
	buildMemoryCall,
	buildMemoryCapture,
	buildMemoryCriterion,
	buildMemoryRecordProfile,
	buildMemorySeedControl,
	buildMemorySeedResponses,
	buildMemoryVerdict,
	countMemoryPairs,
	omitMemoryAuxiliaries,
	buildMemoryFoldGoals,
	buildMemoryObservationGoals,
	buildMemoryObservationResponses,
	buildMemoryProfile,
	buildMemoryReply,
	createMemoryContext,
	createMemoryServer,
	listMemoryKeys,
	loadStudyToolsFixture,
	readMemoryAdmission,
	readMemoryCheckpoint,
	readMemoryControl,
	readMemoryControls,
	readMemoryEvents,
	readMemoryFirstChat,
	readMemoryJudgeStates,
	readMemoryModel,
	readMemoryModels,
	readMemoryOrigins,
	readMemoryParts,
	readMemorySealedCheckpoint,
	readMemoryShapes,
	readMemorySeedRequests,
	readMemorySnapshot,
	readMemoryTimeline,
	createStudyInstallFixture,
	executeMemoryGoals,
	executeStudyInstall,
	executeStudyProcess,
	executeStudyTopology,
	readMemoryToolResults,
	runMemoryFailure,
	runMemoryTrial,
	totalMemoryUsage,
	waitForMemoryListeners,
	writeStudyInstallRecord,
	STUDY_MEMORY_CONTEXT_KEYS,
	STUDY_MEMORY_ESTIMATE_KEYS,
	STUDY_MEMORY_INERT_EXCHANGES,
	STUDY_MEMORY_INERT_REPLAY,
	STUDY_MEMORY_MODULES,
	STUDY_MEMORY_OBSERVATION_GOALS,
	STUDY_MEMORY_OBSERVED_EVENTS,
	STUDY_MEMORY_OBSERVED_KEYS,
	STUDY_MEMORY_OPTION_KEYS,
	STUDY_MEMORY_RECORD,
	STUDY_MEMORY_REFUSAL_KEYS,
	STUDY_MEMORY_REPLAY_REFUSAL,
	STUDY_MEMORY_SEED_SENTINEL,
	STUDY_MEMORY_SEED_SETTINGS,
	STUDY_MEMORY_SETTINGS,
	STUDY_MEMORY_SUMMARY_ROOM,
	STUDY_MEMORY_TIMING,
	WINDOW_GOAL,
} from './setupStudy.js'

describe('study meter fixture lifecycle', () => {
	it('owns its primitive lifetimes and closes admission without cancelling completed work', () => {
		const fixture = createStudyMeterFixture()
		fixture.meter
			.admit({ role: 'tool', tokens: 0, bytes: 1 })
			.finish({ role: 'tool', calls: 1, tokens: 0, bytes: 1, duration: 0 })
		fixture.close()
		fixture.close()
		expect(fixture.control.failure).toBeUndefined()
		expect(fixture.meter.usage).toHaveLength(1)
		expect(() => fixture.meter.admit({ role: 'tool', tokens: 0, bytes: 1 })).toThrow(/closed/)
	})
})

describe('study replay content comparison', () => {
	it('compares run-local conversation ids and wall clocks across every checkpoint', () => {
		const recorded = buildMemoryReplayEvidence(['record-a', 'record-b'], 'record-conversation', 10)
		const replayed = buildMemoryReplayEvidence(['replay-a', 'replay-b'], 'replay-conversation', 999)
		expect(() =>
			assertMemoryReplay([...recorded, ...recorded], [...replayed, ...replayed]),
		).not.toThrow()
	})
	it('refuses a second conversation id that breaks the same bijection', () => {
		const recorded = buildMemoryReplayEvidence(['record-a', 'record-b'], 'record-conversation')
		expect(() =>
			assertMemoryReplay(
				[...recorded, ...recorded],
				[
					...buildMemoryReplayEvidence(['replay-a', 'replay-b'], 'first-conversation'),
					...buildMemoryReplayEvidence(['replay-a', 'replay-b'], 'second-conversation'),
				],
			),
		).toThrow(/changed position|bijective/)
	})
	it('refuses a changed held message through the recomputed window digest', () => {
		const recorded = buildMemoryReplayEvidence(['record-a', 'record-b'])
		// The changed replay has its own valid native checksum; only mapping and recomputing exposes it.
		const replayed = buildMemoryReplayEvidence(
			['replay-a', 'replay-b'],
			'records',
			0,
			'Changed held message',
		)
		expect(() => assertMemoryReplay(recorded, replayed)).toThrow(/Recomputed window digest differs/)
	})
	it('refuses changed held content that equals the corresponding message ids', () => {
		const recorded = buildMemoryReplayEvidence(['record-a', 'record-b'], 'records', 0, 'record-a')
		const replayed = buildMemoryReplayEvidence(['replay-a', 'replay-b'], 'records', 0, 'replay-a')
		expect(() => assertMemoryReplay(recorded, replayed)).toThrow(/Recomputed window digest differs/)
		expect(() =>
			assertMemoryReplay(
				recorded,
				buildMemoryReplayEvidence(['replay-a', 'replay-b'], 'records', 0, 'record-a'),
			),
		).not.toThrow()
	})
	it('refuses changed held content shaped like a Classifier tuple id', () => {
		const recorded = buildMemoryReplayEvidence(
			['record-a', 'record-b'],
			'records',
			0,
			JSON.stringify(['topic', 'record-a', 'fixture']),
		)
		const replayed = buildMemoryReplayEvidence(
			['replay-a', 'replay-b'],
			'records',
			0,
			JSON.stringify(['topic', 'replay-a', 'fixture']),
		)
		expect(() => assertMemoryReplay(recorded, replayed)).toThrow(/Recomputed window digest differs/)
	})
	it('preserves strings outside declared identity fields byte for byte', () => {
		const ids = new Map([['record-a', 'replay-a']])
		for (const member of [
			'content',
			'ledger.conversation.messages.content',
			'ledger.conversation.messages.calls.id',
			'ledger.conversation.sections.id',
			'ledger.conversation.sections.summary',
			'ledger.conversation.judgments.state',
			'ledger.conversation.judgments.model',
			'ledger.conversation.judgments.question.question',
			'ledger.conversation.judgments.answer.choice',
			'ledger.window.exchanges.copy',
			'ledger.window.exchanges.lines.key',
			'ledger.window.exchanges.lines.title',
			'questions.winner',
			'conversation.id\n',
		]) {
			for (const value of ['record-a', JSON.stringify(['category', 'record-a'])])
				expect(mapMemoryReplayIds(value, ids, member)).toBe(value)
		}
		expect(mapMemoryReplayIds({ 'conversation.id': 'record-a' }, ids)).toEqual({
			'conversation.id': 'record-a',
		})
	})
	it('translates declared references and only the message positions of Classifier ids', () => {
		const ids = new Map([
			['record-a', 'replay-a'],
			['record-b', 'replay-b'],
		])
		for (const member of [
			'conversation.id',
			'conversation.messages.id',
			'conversation.sections.messages.id',
			'conversation.judgments.sources',
			'ledger.conversation.id',
			'ledger.conversation.messages.id',
			'ledger.conversation.sections.messages.id',
			'ledger.conversation.judgments.sources',
			'ledger.requests',
			'ledger.notes',
			'ledger.failures',
			'ledger.window.exchanges.request',
			'ledger.window.exchanges.reply',
			'ledger.window.exchanges.lines.source',
			'ledger.window.amendments.earlier',
			'ledger.window.amendments.later',
		]) {
			expect(mapMemoryReplayIds('record-a', ids, member)).toBe('replay-a')
			expect(() => mapMemoryReplayIds('orphan', ids, member)).toThrow(/Unmapped/)
		}
		for (const member of [
			'questions.id',
			'conversation.judgments.id',
			'ledger.conversation.judgments.id',
		]) {
			expect(mapMemoryReplayIds('record-a', ids, member)).toBe('replay-a')
			for (const [recorded, replayed] of [
				[
					['category', 'record-a'],
					['category', 'replay-a'],
				],
				[
					['topic', 'record-a', 'record-b'],
					['topic', 'replay-a', 'record-b'],
				],
				[
					['amends', 'record-a', 'record-b'],
					['amends', 'replay-a', 'replay-b'],
				],
				[
					['supersedes', 'record-a', 'record-b'],
					['supersedes', 'replay-a', 'replay-b'],
				],
			])
				expect(mapMemoryReplayIds(JSON.stringify(recorded), ids, member)).toBe(
					JSON.stringify(replayed),
				)
		}
	})
	it('translates window unit-record keys while preserving named placements', () => {
		const ids = new Map([['record-a', 'replay-a']])
		for (const [key, title, expected] of [
			['record-a', '', 'replay-a'],
			['rules', '', 'rules'],
			['record-a', 'Named placement', 'record-a'],
			['owner:record-a', 'Owner', 'owner:record-a'],
		] as const) {
			const receipt = { key, title, source: 'record-a', sentence: 0 }
			expect(mapMemoryReplayIds(receipt, ids, 'ledger.window.exchanges.lines')).toEqual({
				...receipt,
				key: expected,
				source: 'replay-a',
			})
		}
		expect(() =>
			mapMemoryReplayIds(
				{ key: 'orphan', title: '', source: 'record-a', sentence: 0 },
				ids,
				'ledger.window.exchanges.lines',
			),
		).toThrow(/Unmapped/)
	})
	it('refuses two judgments out of order even when their clocks are valid', () => {
		const recorded = buildMemoryReplayEvidence(['record-a', 'record-b'])
		const replayed = buildMemoryReplayEvidence(['replay-a', 'replay-b']).map((row) => {
			if (
				row.event !== 'checkpoint' ||
				!isRecord(row.value) ||
				!isRecord(row.value.ledger) ||
				!isRecord(row.value.ledger.conversation) ||
				!isArray(row.value.ledger.conversation.judgments)
			)
				return row
			return {
				...row,
				value: {
					...row.value,
					ledger: {
						...row.value.ledger,
						conversation: {
							...row.value.ledger.conversation,
							judgments: [...row.value.ledger.conversation.judgments].reverse(),
						},
					},
				},
			}
		})
		expect(() => assertMemoryReplay(recorded, replayed)).toThrow(/Checkpoint members differ/)
	})
	it('requires every judgment clock to be present, finite, non-negative, and integral', () => {
		const recorded = buildMemoryReplayEvidence(['record-a', 'record-b'])
		for (const time of [null, '10', -1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
			const replayed = buildMemoryReplayEvidence(['replay-a', 'replay-b']).map((row) => {
				if (
					row.event !== 'checkpoint' ||
					!isRecord(row.value) ||
					!isRecord(row.value.ledger) ||
					!isRecord(row.value.ledger.conversation) ||
					!isArray(row.value.ledger.conversation.judgments)
				)
					return row
				return {
					...row,
					value: {
						...row.value,
						ledger: {
							...row.value.ledger,
							conversation: {
								...row.value.ledger.conversation,
								judgments: row.value.ledger.conversation.judgments.map((judgment) => {
									if (!isRecord(judgment)) throw new Error('Missing judgment')
									const { time: prior, ...rest } = judgment
									expect(prior).toBe(0)
									return time === null ? rest : { ...rest, time }
								}),
							},
						},
					},
				}
			})
			expect(() => assertMemoryReplay(recorded, replayed)).toThrow(/Judgment clock/)
			expect(() => assertMemoryReplay(replayed, recorded)).toThrow(/Judgment clock/)
		}
	})
	it('compares every decision and checkpoint field through a positional bijection', () => {
		const recorded = buildMemoryReplayEvidence(['record-a', 'record-b'])
		const replayed = buildMemoryReplayEvidence(['replay-a', 'replay-b'])
		expect(() => assertMemoryReplay(recorded, replayed)).not.toThrow()
		expect(readMemoryReplayMessages(recorded.at(-1)?.value ?? null)).toEqual([
			'record-a',
			'record-b',
		])
		expect(
			mapMemoryReplayIds(
				{ id: 'record-a' },
				new Map([['record-a', 'replay-a']]),
				'conversation.messages',
			),
		).toEqual({
			id: 'replay-a',
		})
	})
	it('refuses two decisions swapped while the conversation stays in order', () => {
		const recorded = buildMemoryReplayEvidence(['record-a', 'record-b'])
		const replayed = buildMemoryReplayEvidence(['replay-a', 'replay-b'])
		const [first, second, checkpoint] = replayed
		if (first === undefined || second === undefined || checkpoint === undefined)
			throw new Error('Missing evidence')
		expect(() =>
			assertMemoryReplay(recorded, [
				{ ...first, value: second.value },
				{ ...second, value: first.value },
				checkpoint,
			]),
		).toThrow(/Retained decisions differ/)
	})
	it('refuses duplicate ids, changing correspondence, and unaccounted message references', () => {
		const recorded = buildMemoryReplayEvidence(['record-a', 'record-b'])
		expect(() =>
			assertMemoryReplay(recorded, buildMemoryReplayEvidence(['replay-a', 'replay-a'])),
		).toThrow(/repeats a message id/)
		expect(() =>
			assertMemoryReplay(
				[...recorded, ...recorded],
				[
					...buildMemoryReplayEvidence(['replay-a', 'replay-b']),
					...buildMemoryReplayEvidence(['replay-b', 'replay-a']),
				],
			),
		).toThrow(/changed position/)
		expect(() =>
			mapMemoryReplayIds({ sources: ['orphan'] }, new Map(), 'conversation.judgments'),
		).toThrow(/Unmapped sources/)
		expect(() =>
			mapMemoryReplayIds(JSON.stringify(['category', 'orphan']), new Map(), 'questions.id'),
		).toThrow(/Unmapped decision/)
	})
	it('retains every checkpoint member, including timestamps and checksums', () => {
		const recorded = buildMemoryReplayEvidence(['record-a', 'record-b'])
		const replayed = buildMemoryReplayEvidence(['replay-a', 'replay-b'])
		for (const value of [{ time: 1 }, { digest: 'changed' }, { extra: true }]) {
			expect(() =>
				assertMemoryReplay(
					recorded,
					replayed.map((row) =>
						row.event === 'checkpoint' && isRecord(row.value)
							? { ...row, value: { ...row.value, ...value } }
							: row,
					),
				),
			).toThrow(/Checkpoint members differ/)
		}
	})
})

describe('study declaration fixtures', () => {
	it('builds independent declarations and a grading horizon from their actual schedule', async () => {
		const first = (await loadStudyToolsFixture()).manifest
		const second = (await loadStudyToolsFixture()).manifest
		expect(first).not.toBe(second)
		expect(first.bounds).not.toBe(second.bounds)
		expect(isStudyCustodyManifest(first)).toBe(true)
		expect(first.identity.agent).toMatch(/^[a-f0-9]{64}$/)
		const rebuilt = buildCustodyManifest(
			first.definition,
			first.scenarios,
			first.bounds,
			'e'.repeat(64),
		)
		expect(isStudyCustodyManifest(rebuilt)).toBe(true)
		expect(rebuilt.identity.provider).toBe('e'.repeat(64))
		expect(rebuilt.schedule).toEqual(first.schedule)
		expect(buildStudyAssessment(first.schedule).attempts).toEqual(
			first.schedule.map((item) => item.id),
		)
		const grade = buildMemoryGradeFixture()
		expect(grade.failure).toEqual({
			cause: 'capacity',
			message: 'Output cap',
			role: 'agent',
			stop: { layer: 'model', id: 'num_predict', max: 512, consumed: 512 },
		})
		const scheduled = grade.manifest.schedule.map((item) => item.id)
		expect(isStudyCustodyManifest(grade.manifest)).toBe(true)
		expect(scheduled).toEqual([grade.complete.trial.id, grade.faulted.trial.id])
		expect(grade.attempts.map((item) => item.trial.id)).toEqual(scheduled)
		expect(Object.keys(grade.evidence)).toEqual(scheduled)
		expect(grade.evidence[grade.complete.trial.id]).toBe(grade.complete.evidence)
		expect(grade.rubric.criteria.map((item) => item.id)).toEqual([
			'operational',
			'meaning',
			'source',
			'lookup',
			'result',
		])
	})

	it('loads the context declaration', async () => {
		const { manifest } = await loadStudyToolsFixture('context')
		expect(manifest.definition.driver).toBe('tools')
		expect(manifest.scenarios.map((scenario) => scenario.id)).toEqual(['libraries'])
	})
})

describe('study install fixtures', () => {
	it('preserves fresh topology worker diagnostics', async () => {
		const scratch = createScratch({ prefix: 'study-topology-setup-' })
		try {
			const refused = await executeStudyTopology(scratch, [])
			expect(refused.code).toBe(1)
			expect(refused.stdout).toContain('"roots":[]')
			expect(refused.stderr).toContain('Artifact entry must be admitted built ESM:')
		} finally {
			await destroyScratch(scratch)
		}
	})
	it('reads tool receipts from actual wire shapes and refuses malformed messages', () => {
		expect(
			readMemoryToolResults(
				JSON.stringify({
					messages: [
						{ role: 'user', content: 'Read' },
						{ role: 'tool', content: 'No record' },
						{ role: 'tool', content: 'order: Owner\nReleased' },
					],
				}),
			),
		).toEqual(['No record', 'order: Owner\nReleased'])
		expect(() => readMemoryToolResults('{}')).toThrow('Invalid chat request')
		expect(() => readMemoryToolResults('{"messages":[7]}')).toThrow('Invalid chat message')
		expect(() => readMemoryToolResults('{"messages":[{"role":"tool","content":7}]}')).toThrow(
			'Invalid tool receipt',
		)
	})
	it('copies actual package closure with one selected Agent and retains exact native command diagnostics', async () => {
		const scratch = createScratch()
		try {
			const fixture = createStudyInstallFixture(scratch, 'http://127.0.0.1:7')
			expect(fixture.packages.filter((entry) => entry.name === '@orkestrel/agent')).toEqual([
				{
					name: '@orkestrel/agent',
					source: resolve('.'),
					target: join(scratch.path, 'node_modules', '@orkestrel/agent'),
				},
			])
			for (const entry of fixture.packages) {
				expect(lstatSync(entry.target).isSymbolicLink()).toBe(false)
				expect(readFileSync(join(entry.target, 'package.json'))).toEqual(
					readFileSync(join(entry.source, 'package.json')),
				)
			}
			const entry = join(scratch.path, 'dist/src/core/index.js')
			expect(readFileSync(entry)).toEqual(readFileSync(resolve('dist/src/core/index.js')))
			expect(parseJSON(scratch.read('studies/memory/profiles/local.json') ?? '')).toMatchObject({
				agent: entry,
				subject: entry,
				qualification: 'tmp/studies/memory-capacity',
				settings: { gauge: { scale: 1, overhead: 0 } },
				bounds: {
					request: { duration: 3000 },
					goal: { duration: 30000 },
					trial: { duration: 90000 },
					series: { duration: 240000 },
				},
				provider: { url: 'http://127.0.0.1:7', model: 'model', judge: 'judge' },
				roots: [scratch.path, ...fixture.packages.map((captured) => captured.target)],
			})
			const help = await executeStudyInstall(fixture, ['--help'])
			expect(help).toMatchObject({ code: 0 })
			expect(help.stdout).toContain('study execute')
			const refused = await executeStudyInstall(fixture, ['unsupported'])
			expect(refused.code).toBe(64)
			expect(refused.stderr).not.toBe('')
			expect(() =>
				captureStudyPackages(scratch, new Map([['wrong-package', resolve('.')]])),
			).toThrow('Malformed selected package')
		} finally {
			await destroyScratch(scratch)
		}
	})

	it('serves queued protocol responses and owns real request accounting and cleanup', async () => {
		const server = await createMemoryServer([
			{ path: '/api/chat', status: 503, body: 'unavailable' },
		])
		const profile = buildMemoryProfile({ url: server.url })
		const fixture = createMemoryContext(profile)
		try {
			const refused = await fetch(`${server.url}/api/chat`, { method: 'POST', body: '{}' })
			expect(refused.status).toBe(503)
			expect(await refused.text()).toBe('unavailable')
			expect(server.requests[0]).toEqual({ path: '/api/chat', body: '{}' })
			const metadata = await fetch(`${server.url}/api/show`, { method: 'POST' })
			expect(parseJSON(await metadata.text())).toMatchObject({
				model_info: { 'fixture.context_length': 32768 },
			})
			expect(parseJSON(buildMemoryReply({ content: 'retained', completion: 3 }))).toMatchObject({
				message: { content: 'retained' },
				eval_count: 3,
			})
			const ticket = await fixture.context.meter.admit({ role: 'agent', tokens: 5, bytes: 32 })
			ticket.finish({ role: 'agent', calls: 1, tokens: 3, bytes: 8, duration: 0 })
			await fixture.context.evidence.append({ event: 'fixture', goal: 'first', value: 'saved' })
			expect(fixture.context.meter.usage).toHaveLength(1)
			expect(fixture.evidence).toEqual([{ event: 'fixture', goal: 'first', value: 'saved' }])
		} finally {
			fixture.close()
			await server.close()
		}
	})

	it('serves scripted replies in order, leaves an unscripted path to its default and logs every request', async () => {
		const script = [
			{ path: '/api/chat', body: 'first' },
			{ path: '/api/chat', status: 503, body: 'second' },
			{ path: '/api/generate', body: 'third' },
		]
		const server = new MemoryServer(script)
		await server.start()
		try {
			expect(server.responses).toEqual(script)
			// The getters hand out copies, so a caller cannot reorder what is still scripted.
			server.responses.pop()
			server.requests.pop()
			expect(server.responses).toHaveLength(3)
			const observed: Array<readonly [string, number, string, number]> = []
			for (const path of [
				'/api/generate',
				'/api/chat',
				'/api/show',
				'/api/chat',
				'/api/generate',
				'/api/chat',
			]) {
				const reply = await fetch(`${server.url}${path}`, { method: 'POST', body: path })
				observed.push([path, reply.status, await reply.text(), server.responses.length])
			}
			// Only a reply scripted for the path at the head is consumed; every other request is answered by default.
			expect(observed.map(([path, status, , remaining]) => [path, status, remaining])).toEqual([
				['/api/generate', 200, 3],
				['/api/chat', 200, 2],
				['/api/show', 200, 2],
				['/api/chat', 503, 1],
				['/api/generate', 200, 0],
				['/api/chat', 200, 0],
			])
			expect(
				observed
					.map(([, , body]) => body)
					.filter((body) => ['first', 'second', 'third'].includes(body)),
			).toEqual(['first', 'second', 'third'])
			expect(parseJSON(observed[0]?.[2] ?? '')).toMatchObject({ done: true, done_reason: 'length' })
			expect(parseJSON(observed[2]?.[2] ?? '')).toMatchObject({
				model_info: { 'fixture.context_length': 32768 },
			})
			expect(observed[5]?.[2]).toBe(buildMemoryReply())
			expect(server.requests).toEqual(observed.map(([path]) => ({ path, body: path })))
			expect(script).toHaveLength(3)
		} finally {
			await server.close()
		}
	})

	it('answers a model list unless the script heads with one, and gives each server its own script', async () => {
		const script = [{ path: '/api/tags', status: 500, body: 'down' }]
		const down = await createMemoryServer(script)
		const other = await createMemoryServer(script)
		try {
			const refused = await fetch(`${down.url}/api/tags`)
			expect([refused.status, await refused.text()]).toEqual([500, 'down'])
			const listed = await fetch(`${down.url}/api/tags`)
			expect(parseJSON(await listed.text())).toMatchObject({
				models: [{ name: 'model' }, { name: 'judge' }],
			})
			expect(down.responses).toEqual([])
			expect(other.responses).toEqual(script)
			expect((await fetch(`${other.url}/api/tags`)).status).toBe(500)
		} finally {
			await Promise.all([down.close(), other.close()])
		}
	})

	it('answers a version request unless the script heads with one', async () => {
		const server = await createMemoryServer([{ path: '/api/version', status: 500, body: 'down' }])
		try {
			const refused = await fetch(`${server.url}/api/version`)
			expect([refused.status, await refused.text()]).toEqual([500, 'down'])
			const answered = await fetch(`${server.url}/api/version`)
			expect(parseJSON(await answered.text())).toEqual({ version: 'fixture-1' })
			expect(server.responses).toEqual([])
		} finally {
			await server.close()
		}
	})

	it('answers a metadata path from its given body, and the default stays when absent', async () => {
		const server = await createMemoryServer([{ path: '/api/version', status: 500, body: 'down' }], {
			'/api/version': '{"version":"given"}',
			'/api/tags': '{"models":[]}',
		})
		const bare = await createMemoryServer()
		try {
			const scripted = await fetch(`${server.url}/api/version`)
			expect([scripted.status, await scripted.text()]).toEqual([500, 'down'])
			expect(await (await fetch(`${server.url}/api/version`)).text()).toBe('{"version":"given"}')
			expect(await (await fetch(`${server.url}/api/tags`)).text()).toBe('{"models":[]}')
			expect(parseJSON(await (await fetch(`${bare.url}/api/version`)).text())).toEqual({
				version: 'fixture-1',
			})
		} finally {
			await Promise.all([server.close(), bare.close()])
		}
	})

	it('repeats the model a request names in a default reply, as a daemon does', async () => {
		expect(readMemoryModel('{"model":"org/agent:q4"}', 'model')).toBe('org/agent:q4')
		expect(readMemoryModel('{"model":1}', 'model')).toBe('model')
		expect(readMemoryModel('', 'judge')).toBe('judge')
		const server = await createMemoryServer()
		try {
			for (const [path, fallback] of [
				['/api/chat', 'model'],
				['/api/generate', 'judge'],
			] as const) {
				const named = await fetch(`${server.url}${path}`, {
					method: 'POST',
					body: '{"model":"org/agent:q4"}',
				})
				expect(parseJSON(await named.text())).toMatchObject({ model: 'org/agent:q4' })
				const bare = await fetch(`${server.url}${path}`, { method: 'POST' })
				expect(parseJSON(await bare.text())).toMatchObject({ model: fallback })
			}
		} finally {
			await server.close()
		}
	})

	it('serves a seat past its recorded replies on two real model names', async () => {
		const [, second] = STUDY_MEMORY_OBSERVATION_GOALS
		if (second === undefined) throw new Error('Missing second goal')
		const run = await runMemoryTrial({
			arm: 'records',
			responses: buildMemorySeedResponses('records'),
			goals: STUDY_MEMORY_OBSERVATION_GOALS.slice(0, 2),
			settings: STUDY_MEMORY_SEED_SETTINGS,
		})
		expect(run.failure).toBeUndefined()
		const base = buildMemoryRecordProfile('http://127.0.0.1:1')
		if (base.provider === undefined) throw new Error('Missing recording provider')
		// A judgment matches on its judge's model, so this seat re-asks every seated question: only the chat is scripted.
		const requests = await readMemorySeedRequests({
			arm: 'records',
			profile: {
				...base,
				settings: STUDY_MEMORY_SEED_SETTINGS,
				provider: { ...base.provider, model: 'org/agent:q4', judge: 'org/judge:q4' },
			},
			seed: readMemoryCheckpoint(run.evidence, 'opening'),
			goal: second,
			replies: [
				{
					path: '/api/chat',
					body: buildMemoryReply({ model: 'org/agent:q4', content: 'Corrected handoff' }),
				},
			],
			metadata: {
				'/api/tags': JSON.stringify({
					models: [
						{ name: 'org/agent:q4', digest: 'a'.repeat(64) },
						{ name: 'org/judge:q4', digest: 'b'.repeat(64) },
					],
				}),
			},
		})
		const models = readMemoryModels(requests)
		expect(models.filter((model) => model === 'org/judge:q4').length).toBeGreaterThan(1)
		expect(models.at(-1)).toBe('org/agent:q4')
		await waitForMemoryListeners()
	}, 60000)

	it('reads the seeded requests', async () => {
		const [, second] = STUDY_MEMORY_OBSERVATION_GOALS
		if (second === undefined) throw new Error('Missing second goal')
		// A closed origin stands in for the declared one, because the helper replaces it.
		const profile = {
			...buildMemoryRecordProfile('http://127.0.0.1:1'),
			settings: STUDY_MEMORY_SEED_SETTINGS,
		}
		for (const arm of ['records', 'compaction'] as const) {
			const run = await runMemoryTrial({
				arm,
				responses: buildMemorySeedResponses(arm),
				goals: STUDY_MEMORY_OBSERVATION_GOALS.slice(0, 2),
				settings: STUDY_MEMORY_SEED_SETTINGS,
			})
			expect(run.failure).toBeUndefined()
			const expected = readMemoryFirstChat(run, second.id)
			expect(expected).toBeDefined()
			const requests = await readMemorySeedRequests({
				arm,
				profile,
				seed: readMemoryCheckpoint(run.evidence, 'opening'),
				goal: second,
				replies: [{ path: '/api/chat', body: buildMemoryReply({ content: 'Corrected handoff' }) }],
				metadata: {},
			})
			expect(requests.find((request) => request.path === '/api/chat')?.body).toBe(expected)
			await waitForMemoryListeners()
			await expect(
				readMemorySeedRequests({
					arm,
					profile,
					seed: { records: [], arrivals: [] },
					goal: second,
					replies: [],
					metadata: {},
				}),
			).rejects.toMatchObject({ code: 'CONFIG' })
			await waitForMemoryListeners()
		}
	}, 60000)

	it('sorts a checkpoint as a sealed row', () => {
		const evidence = [
			{ event: 'checkpoint', goal: 'opening', value: { zone: { later: 1, early: 2 }, area: 3 } },
			{ event: 'checkpoint', goal: 'closure', value: 'another goal' },
		]
		expect(JSON.stringify(readMemorySealedCheckpoint(evidence, 'opening'))).toBe(
			'{"area":3,"zone":{"early":2,"later":1}}',
		)
		expect(() => readMemorySealedCheckpoint(evidence, 'absent')).toThrow('Expected one absent')
	})

	it('seats a control the comparand renders', () => {
		const quoted = 'He said "go"\nnow'
		const messages = [
			{ role: 'user', content: 'Older text' },
			{ role: 'user', content: quoted },
			{ role: 'assistant', content: 'Never rendered' },
			{ role: 'assistant', content: '' },
		]
		const comparand = JSON.stringify({ messages: messages.slice(0, 2) })
		const seated = [
			{ role: 'user', content: 'Older text' },
			{ role: 'user', content: STUDY_MEMORY_SEED_SENTINEL },
			{ role: 'assistant', content: 'Never rendered' },
			{ role: 'assistant', content: '' },
		]
		const held = { records: [], arrivals: [] }
		const conversation = { id: 'c', messages }
		const replaced = { id: 'c', messages: seated }
		const direct = { ...held, conversation }
		const nested = { ...held, ledger: { conversation } }
		expect(buildMemorySeedControl(direct, comparand)).toEqual({ ...held, conversation: replaced })
		expect(buildMemorySeedControl(nested, comparand)).toEqual({
			...held,
			ledger: { conversation: replaced },
		})
		const none = '{"messages":[]}'
		const refused = /renders no checkpoint message/u
		expect(() => buildMemorySeedControl(direct, none)).toThrow(refused)
		expect(() => buildMemorySeedControl(nested, none)).toThrow(refused)
	})

	it('reads a control from a chat request', () => {
		const expected = Buffer.from('equal', 'utf8')
		const generate = { path: '/api/generate', body: 'equal' }
		const equal = { path: '/api/chat', body: 'equal' }
		const different = { path: '/api/chat', body: 'different' }
		const summary = { path: '/api/chat', body: 'summary' }
		expect(readMemoryControl(expected, [generate, different])).toBe(true)
		expect(readMemoryControl(expected, [])).toBe(false)
		expect(readMemoryControl(expected, [generate])).toBe(false)
		expect(readMemoryControl(expected, [equal])).toBe(false)
		expect(readMemoryControl(expected, [different])).toBe(true)
		expect(readMemoryControl(expected, [summary, equal])).toBe(false)
	})

	it('reads the judge states', () => {
		const prompt = '<|im_start|>user\n<state>\nuser: [Source a] Line\nnext\n</state>\nQuestion: Q'
		expect(
			readMemoryJudgeStates([
				{ path: '/api/show', body: 'not parsed' },
				{ path: '/api/generate', body: JSON.stringify({ prompt }) },
				{ path: '/api/chat', body: JSON.stringify({ prompt }) },
			]),
		).toEqual(['user: [Source a] Line\nnext'])
		expect(() =>
			readMemoryJudgeStates([
				{ path: '/api/generate', body: JSON.stringify({ prompt: 'No markers' }) },
			]),
		).toThrow('holds no state')
	})

	it('executes goals in order and stops at the first refusal, keeping the earlier products and the error itself', async () => {
		// The second goal is refused before it reaches the wire, so the third would complete if it ran.
		const goals = [
			{ id: 'one', input: { prompt: 'Respond', arrivals: [], records: [] } },
			{ id: 'two', input: { prompt: '', arrivals: [], records: [] } },
			{ id: 'three', input: { prompt: 'Respond', arrivals: [], records: [] } },
		]
		const server = await createMemoryServer([
			{ path: '/api/chat', body: buildMemoryReply({ content: 'Retained one' }) },
			{ path: '/api/chat', body: buildMemoryReply({ content: 'Never reached' }) },
		])
		const profile = buildMemoryProfile({ url: server.url })
		const fixture = createMemoryContext(profile)
		try {
			const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
				{ id: 'goals', scenario: 'public', arm: 'full', repetition: 0 },
				fixture.context.signal,
			)
			try {
				const stopped = await executeMemoryGoals(session, goals, fixture.context)
				expect(stopped.products).toEqual([{ value: { content: 'Retained one' }, partial: false }])
				expect(stopped.failure?.error).toBeInstanceOf(Error)
				expect(stopped.failure?.error).toMatchObject({
					code: 'CONFIG',
					message: 'Malformed public memory input',
				})
				expect(server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(1)
				expect(server.responses).toHaveLength(1)
			} finally {
				await session.close()
			}
		} finally {
			fixture.close()
			await server.close()
		}
	})

	it('executes every goal and reports no failure when none refuses', async () => {
		const goals = ['one', 'two'].map((id) => ({
			id,
			input: { prompt: 'Respond', arrivals: [], records: [] },
		}))
		const server = await createMemoryServer()
		const profile = buildMemoryProfile({ url: server.url })
		const fixture = createMemoryContext(profile)
		try {
			const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
				{ id: 'goals', scenario: 'public', arm: 'full', repetition: 0 },
				fixture.context.signal,
			)
			try {
				const completed = await executeMemoryGoals(session, goals, fixture.context)
				expect(completed.failure).toBeUndefined()
				expect(completed.products).toEqual([
					{ value: { content: 'Receipt retained.' }, partial: false },
					{ value: { content: 'Receipt retained.' }, partial: false },
				])
				expect(await executeMemoryGoals(session, [], fixture.context)).toEqual({
					products: [],
					failure: undefined,
				})
			} finally {
				await session.close()
			}
		} finally {
			fixture.close()
			await server.close()
		}
	})

	it('executes a real Node entry and reports its exit and separate output bytes', async () => {
		const scratch = createScratch({ prefix: 'study-process-setup-' })
		try {
			const quiet = scratch.write(
				'quiet.js',
				`process.stdout.write('out'); process.stderr.write('err')`,
			)
			const exits = scratch.write('exits.js', `process.exit(3)`)
			const throws = scratch.write('throws.js', `throw new Error('process refusal')`)
			const holds = scratch.write('holds.js', `setTimeout(() => {}, 30000)`)
			expect(await executeStudyProcess([quiet], scratch.path, 60000)).toEqual({
				code: 0,
				stdout: 'out',
				stderr: 'err',
			})
			expect(await executeStudyProcess([exits], scratch.path, 60000)).toEqual({
				code: 3,
				stdout: '',
				stderr: '',
			})
			const thrown = await executeStudyProcess([throws], scratch.path, 60000)
			expect(thrown.code).toBe(1)
			expect(thrown.stderr).toContain('process refusal')
			const started = performance.now()
			const deadline = await executeStudyProcess([holds], scratch.path, 1500)
			expect(deadline.code).toBe(1)
			expect(performance.now() - started).toBeLessThan(20000)
		} finally {
			await destroyScratch(scratch)
		}
	})

	it('leaves the authored local profile without settings', () => {
		const authored = parseJSON(readFileSync('studies/memory/profiles/local.json', 'utf8'))
		expect(authored).not.toHaveProperty('settings')
	})

	it('emits supplied profile settings verbatim, including an explicit absence', () => {
		const url = 'http://127.0.0.1:7'
		const settings = { gauge: { scale: 2, overhead: 3 }, observe: true, checkpoints: ['a'] }
		expect(buildMemoryProfile({ url, settings }).settings).toEqual(settings)
		expect(buildMemoryProfile({ url, settings: STUDY_MEMORY_SETTINGS }).settings).toEqual({
			gauge: { scale: 1, overhead: 0 },
		})
		for (const profile of [
			buildMemoryProfile({ url }),
			buildMemoryProfile({ url, settings: undefined }),
		]) {
			expect(Object.keys(profile)).toContain('settings')
			expect(profile.settings).toBeUndefined()
		}
	})

	it('removes only the judge and recap a workflow does not use and requires a declared provider', () => {
		const profile = buildMemoryProfile({
			url: 'http://127.0.0.1:7',
			settings: STUDY_MEMORY_SETTINGS,
		})
		const bare = omitMemoryAuxiliaries(profile)
		expect(bare.provider).toEqual({
			...profile.provider,
			judge: undefined,
			digest: { model: 'a'.repeat(64), judge: undefined },
		})
		expect(bare.room).toEqual({ ...profile.room, recap: undefined })
		expect({ ...bare, provider: profile.provider, room: profile.room }).toEqual(profile)
		expect(profile.provider?.judge).toBe('judge')
		expect(profile.room.recap).toBe(256)
		expect(() => omitMemoryAuxiliaries({ ...profile, provider: undefined })).toThrow(
			'Missing fixture provider',
		)
	})

	it('builds a desk criterion that is critical only when operational', () => {
		expect(buildMemoryCriterion('operational', 'state', { observation: 'operational' })).toEqual({
			id: 'operational',
			scenario: 'desk',
			goal: 'goal',
			method: 'state',
			critical: true,
			assertion: { observation: 'operational' },
		})
		expect(buildMemoryCriterion('late', 'trace', { observation: 'summary' }, 'later')).toEqual({
			id: 'late',
			scenario: 'desk',
			goal: 'later',
			method: 'trace',
			critical: false,
			assertion: { observation: 'summary' },
		})
	})

	it('places a gauge at a signed distance from the window max of the profile room', () => {
		const base = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		expect(buildMemoryEdge(base, -1)).toEqual({ gauge: { scale: 1e-9, overhead: 32127 } })
		expect(buildMemoryEdge(base, 0)).toEqual({ gauge: { scale: 1e-9, overhead: 32128 } })
		const narrow = buildMemoryProfile({
			url: 'http://127.0.0.1:7',
			room: { context: 1024, output: 128, safety: 128 },
		})
		expect(buildMemoryEdge(narrow, -2)).toEqual({ gauge: { scale: 1e-9, overhead: 766 } })
	})

	it('reads native controls from exact chat bytes', () => {
		const requests = [
			{ path: '/api/chat', body: JSON.stringify({ truncate: false, shift: false }) },
			{ path: '/api/chat', body: JSON.stringify({ truncate: true }) },
			{ path: '/api/chat', body: '{}' },
			{ path: '/api/generate', body: JSON.stringify({ truncate: false, shift: false }) },
			{ path: '/api/tags', body: '' },
		]
		expect(readMemoryControls(requests)).toEqual([
			{ truncate: false, shift: false },
			{ truncate: true, shift: undefined },
			{ truncate: undefined, shift: undefined },
		])
		expect(() => readMemoryControls([{ path: '/api/chat', body: '[]' }])).toThrow(
			'Invalid chat request',
		)
	})

	it('runs a real session to its first failure and then reads the latched fault', async () => {
		const result = await runMemoryFailure({
			arm: 'full',
			responses: [
				{ path: '/api/chat', body: 'Unavailable', status: 503 },
				{ path: '/api/chat', body: buildMemoryReply({ content: 'Never reached' }) },
			],
			goals: [{ id: 'opening', input: { prompt: 'Respond', arrivals: [], records: [] } }],
		})
		expect(result.first).toBeDefined()
		expect(result.latched).toMatchObject({ code: 'FAULT' })
		expect(result.products).toEqual([])
		expect(result.requests).toHaveLength(result.sent)
		expect(result.requests.filter((request) => request.path === '/api/chat')).toHaveLength(1)
		expect(result.queued).toBe(1)
		expect(result.usage.filter((row) => row.role === 'agent')).toEqual([
			{ role: 'agent', calls: 1, tokens: undefined, bytes: undefined },
		])
		const [failure] = readMemoryEvents(result.evidence, 'failure')
		expect(failure).toMatchObject({ role: 'agent', path: '/api/chat', status: 503 })
	})

	it('builds the observation trajectory and its queued replies with one-byte prompt control', () => {
		const goals = buildMemoryObservationGoals()
		expect(goals.map((goal) => goal.id)).toEqual(['opening', 'correction', 'closure'])
		expect(Object.isFrozen(goals)).toBe(true)
		const changed = buildMemoryObservationGoals('Look up order-2')
		expect(changed.map((goal) => goal.id)).toEqual(goals.map((goal) => goal.id))
		expect(changed[0]?.input).toMatchObject({ prompt: 'Look up order-2' })
		expect(goals[0]?.input).toMatchObject({ prompt: 'Look up order-1' })
		expect(changed.slice(1)).toEqual(goals.slice(1))
		const replies = buildMemoryObservationResponses()
		expect(replies.map((reply) => reply.path)).toEqual(Array(4).fill('/api/chat'))
		const rows = replies.map((reply) => parseJSON(reply.body))
		expect(rows[0]).toMatchObject({ message: { tool_calls: [{ function: { name: 'lookup' } }] } })
		expect(rows.slice(1).map((row) => (isRecord(row) ? row.message : undefined))).toEqual([
			{ role: 'assistant', content: 'Initial handoff' },
			{ role: 'assistant', content: 'Corrected handoff' },
			{ role: 'assistant', content: 'Closed handoff' },
		])
		expect(rows.every((row) => isRecord(row) && !('total_duration' in row))).toBe(true)
		const timed = buildMemoryObservationResponses(STUDY_MEMORY_TIMING).map((reply) =>
			parseJSON(reply.body),
		)
		expect(timed.every((row) => isRecord(row) && row.total_duration === 1234567890)).toBe(true)
		expect(listMemoryKeys(['b', 'a'], ['c', 'a'], [])).toEqual(['a', 'b', 'c'])
		expect(listMemoryKeys()).toEqual([])
	})

	it('pins the observed evidence vocabulary and reads context parts and origins strictly', () => {
		expect(STUDY_MEMORY_OBSERVED_EVENTS).toEqual(['context', 'estimate', 'refusal', 'checkpoint'])
		expect(STUDY_MEMORY_ESTIMATE_KEYS).toEqual(['dispatch', 'estimate', 'projected', 'revision'])
		expect(STUDY_MEMORY_REFUSAL_KEYS).toEqual([
			'cause',
			'consumed',
			'max',
			'ordinal',
			'revision',
			'role',
		])
		expect([...STUDY_MEMORY_CONTEXT_KEYS].sort()).toEqual([...STUDY_MEMORY_CONTEXT_KEYS])
		expect(STUDY_MEMORY_CONTEXT_KEYS).not.toContain('dispatch')
		for (const event of ['dispatch', 'wire', 'failure'] as const) {
			expect(STUDY_MEMORY_OBSERVED_KEYS[event]).toEqual(
				expect.arrayContaining(['canonical', 'revision']),
			)
			expect([...STUDY_MEMORY_OBSERVED_KEYS[event]].sort()).toEqual([
				...STUDY_MEMORY_OBSERVED_KEYS[event],
			])
		}
		const message = { content: 2, uniform: 4, calls: 0, thinking: 1, images: 512 }
		expect(readMemoryParts({ messages: [message, message], tools: 5, schema: 9 })).toEqual({
			count: 2,
			tools: 5,
			schema: 9,
			total: 2 * 519 + 14,
		})
		expect(readMemoryParts({ messages: [], tools: 0, schema: 0 })).toEqual({
			count: 0,
			tools: 0,
			schema: 0,
			total: 0,
		})
		for (const malformed of [
			undefined,
			[],
			{ messages: 'none', tools: 0, schema: 0 },
			{ messages: [], tools: '0', schema: 0 },
			{ messages: [], tools: 0 },
			{ messages: [7], tools: 0, schema: 0 },
			{ messages: [{ ...message, images: '512' }], tools: 0, schema: 0 },
		])
			expect(() => readMemoryParts(malformed)).toThrow('Invalid context')
		expect(
			readMemoryOrigins([{ origin: 'arrival', source: 'source-1' }, { origin: 'tool' }]),
		).toEqual([
			{ origin: 'arrival', source: 'source-1' },
			{ origin: 'tool', source: undefined },
		])
		expect(readMemoryOrigins([])).toEqual([])
		for (const malformed of [undefined, {}, [7], [{ origin: 1 }], [{ origin: 'tool', source: 3 }]])
			expect(() => readMemoryOrigins(malformed)).toThrow('Invalid')
	})

	it('builds the fold goal and lets a room reach a real trial', async () => {
		const goals = buildMemoryFoldGoals()
		expect(goals.map((goal) => goal.id)).toEqual(['opening'])
		const input = goals[0]?.input
		if (!isRecord(input) || !Array.isArray(input.arrivals)) throw new Error('Invalid fold goal')
		expect(input.arrivals).toHaveLength(8)
		expect(
			new Set(input.arrivals.map((arrival) => (isRecord(arrival) ? arrival.id : undefined))).size,
		).toBe(8)
		expect(JSON.stringify(buildMemoryFoldGoals('other. '))).not.toBe(JSON.stringify(goals))
		expect(JSON.stringify(buildMemoryFoldGoals('other. '))).toContain('other. ')
		const result = await runMemoryTrial({
			arm: 'full',
			responses: [],
			goals: [{ id: 'opening', input: { prompt: 'Respond', arrivals: [], records: [] } }],
			room: STUDY_MEMORY_SUMMARY_ROOM,
		})
		expect(result.failure).toBeUndefined()
		const body = parseJSON(
			result.requests.find((request) => request.path === '/api/chat')?.body ?? '',
		)
		expect(body).toMatchObject({
			options: {
				num_ctx: STUDY_MEMORY_SUMMARY_ROOM.context,
				num_predict: STUDY_MEMORY_SUMMARY_ROOM.output,
			},
		})
	})

	it('runs a real trial, reads its retained shapes and releases resources when the treatment is refused', async () => {
		const goal = { id: 'opening', input: { prompt: 'Respond', arrivals: [], records: [] } }
		const result = await runMemoryTrial({ arm: 'full', responses: [], goals: [goal] })
		expect(result.failure).toBeUndefined()
		expect(result.products).toEqual([{ value: { content: 'Receipt retained.' }, partial: false }])
		expect(result.requests.map((request) => request.path)).toContain('/api/chat')
		expect(readMemoryAdmission(result)).toEqual({
			requests: result.requests,
			products: result.products,
			failure: undefined,
			usage: result.usage,
		})
		expect(Object.keys(readMemoryAdmission(result)).sort()).toEqual([
			'failure',
			'products',
			'requests',
			'usage',
		])
		expect(totalMemoryUsage(result.usage).agent).toEqual({ calls: 1, tokens: 12 })
		expect(readMemoryModels(result.requests)).toEqual(['model'])
		const shapes = readMemoryShapes(result.requests)
		expect(shapes.map((shape) => shape.options)).toEqual([[...STUDY_MEMORY_OPTION_KEYS]])
		expect(shapes[0]?.body).toEqual(expect.arrayContaining(['messages', 'model', 'options']))
		expect(readMemoryEvents(result.evidence, 'result')).toEqual([
			expect.objectContaining({ content: 'Receipt retained.', partial: false }),
		])
		expect(readMemoryEvents(result.evidence, 'result', 'absent')).toEqual([])
		await expect(
			runMemoryTrial({ arm: 'compaction', responses: [], goals: [goal] }),
		).rejects.toThrow(expect.objectContaining({ code: 'CONFIG' }))
		await expect(
			runMemoryTrial({
				arm: 'full',
				responses: [],
				goals: [goal],
				settings: { observe: true, extra: 1 },
			}),
		).rejects.toThrow(expect.objectContaining({ code: 'CONFIG' }))
	})

	it('totals usage, selects retained rows and refuses malformed ones', () => {
		expect(
			totalMemoryUsage([
				{ role: 'agent', calls: 1, tokens: 12, bytes: 5 },
				{ role: 'agent', calls: 2, tokens: undefined, bytes: undefined },
				{ role: 'judge', calls: 1, tokens: 3, bytes: 1 },
			]),
		).toEqual({ agent: { calls: 3, tokens: 12 }, judge: { calls: 1, tokens: 3 } })
		expect(totalMemoryUsage([])).toEqual({})
		const evidence = [
			{ event: 'dispatch', goal: 'a', value: { id: 1, snapshot: { arrivals: ['x'] } } },
			{ event: 'wire', goal: 'a', value: { id: 1, started: 1, sent: 2, elapsed: 3 } },
			{ event: 'wire', goal: 'b', value: { id: 2, started: 4, sent: 5, elapsed: 6 } },
		]
		expect(readMemoryEvents(evidence, 'wire').map((value) => value.id)).toEqual([1, 2])
		expect(readMemoryEvents(evidence, 'wire', 'b').map((value) => value.id)).toEqual([2])
		expect(() => readMemoryEvents([{ event: 'wire', goal: 'a', value: 7 }], 'wire')).toThrow(
			'not an object',
		)
		expect(readMemorySnapshot(evidence, 'a')).toEqual({ arrivals: ['x'] })
		expect(() => readMemorySnapshot(evidence, 'b')).toThrow('Missing b checkpoint')
		expect(() => readMemorySnapshot(evidence, 'absent')).toThrow('Missing absent checkpoint')
		expect(readMemoryTimeline(readMemoryEvents(evidence, 'wire'))).toEqual([
			{ started: 1, sent: 2, elapsed: 3 },
			{ started: 4, sent: 5, elapsed: 6 },
		])
		expect(() => readMemoryTimeline([{ started: 1, sent: 2 }])).toThrow('Missing wire timeline')
		const requests = [
			{ path: '/api/tags', body: '' },
			{ path: '/api/chat', body: '{"model":"model","options":{"seed":0,"num_ctx":1}}' },
			{ path: '/api/generate', body: '{"model":"judge","options":{"temperature":1},"raw":true}' },
		]
		expect(readMemoryModels(requests)).toEqual(['model', 'judge'])
		expect(readMemoryShapes(requests)).toEqual([
			{ body: ['model', 'options'], options: ['num_ctx', 'seed'] },
			{ body: ['model', 'options', 'raw'], options: ['temperature'] },
		])
		expect(() => readMemoryModels([{ path: '/api/chat', body: '{}' }])).toThrow(
			'Invalid generation request',
		)
		expect(() => readMemoryShapes([{ path: '/api/chat', body: '{"model":"m"}' }])).toThrow(
			'Invalid generation request',
		)
	})

	it('scripts one tool call and one judge label on the wire shapes the provider reads', () => {
		const call = buildMemoryCall('lookup', { id: 'one', scope: 'desk' })
		expect(call.path).toBe('/api/chat')
		expect(parseJSON(call.body)).toMatchObject({
			message: {
				content: '',
				tool_calls: [{ function: { name: 'lookup', arguments: { id: 'one', scope: 'desk' } } }],
			},
		})
		const verdict = buildMemoryVerdict('C')
		expect(verdict.path).toBe('/api/generate')
		const body = parseJSON(verdict.body)
		if (!isRecord(body) || !Array.isArray(body.logprobs) || !isRecord(body.logprobs[0]))
			throw new Error('Invalid verdict fixture')
		expect(body.response).toBe('C')
		expect(body.logprobs[0].top_logprobs).toContainEqual({ token: 'C', logprob: -0.01 })
		expect(body.logprobs[0].top_logprobs).toContainEqual({ token: 'A', logprob: -8 })
	})

	it('declares recording on a built profile and on a scratch local profile, keeping its other members', () => {
		const profile = buildMemoryRecordProfile('http://127.0.0.1:7')
		expect(profile.record).toEqual({ bytes: 4194304, calls: 256, duration: 60000 })
		expect(profile.settings).toEqual({
			version: 'fixture-1',
			metadata: { calls: 64, bytes: 1048576, duration: 30000 },
		})
		const scratch = createScratch({ prefix: 'study-recording-setup-' })
		try {
			expect(() => writeStudyInstallRecord(scratch)).toThrow('Missing authored memory profile')
			scratch.write('studies/memory/profiles/local.json', '{"name":"local","settings":{"a":1}}')
			writeStudyInstallRecord(scratch)
			expect(parseJSON(scratch.read('studies/memory/profiles/local.json') ?? '')).toEqual({
				name: 'local',
				record: STUDY_MEMORY_RECORD.record,
				settings: {
					...STUDY_MEMORY_RECORD.settings,
					gauge: STUDY_MEMORY_SETTINGS.gauge,
					observe: true,
				},
			})
		} finally {
			destroyScratch(scratch)
		}
	})

	it('counts only the judge requests that carry a correction pair question', () => {
		const { amends, supersedes, topic } = STUDY_MEMORY_MODULES.agent.LEDGER_QUESTIONS
		expect(
			countMemoryPairs([
				{ path: '/api/generate', body: JSON.stringify({ prompt: amends.instructions }) },
				{ path: '/api/generate', body: JSON.stringify({ prompt: supersedes.instructions }) },
				{ path: '/api/generate', body: JSON.stringify({ prompt: topic }) },
				{ path: '/api/chat', body: JSON.stringify({ prompt: amends.instructions }) },
			]),
		).toBe(2)
	})

	it('holds an inert sink and replay that declare and answer nothing', async () => {
		expect(STUDY_MEMORY_INERT_EXCHANGES).toMatchObject({ declaration: undefined, next: 1 })
		await expect(STUDY_MEMORY_INERT_EXCHANGES.close()).resolves.toBeUndefined()
		expect(STUDY_MEMORY_INERT_REPLAY.check()).toBeUndefined()
		await expect(STUDY_MEMORY_INERT_REPLAY.close()).resolves.toBeUndefined()
	})

	it('builds a capture whose sink keeps each row and whose replay refuses each request', async () => {
		const capture = buildMemoryCapture(
			buildMemoryRecordProfile('http://127.0.0.1:7'),
			{ id: 'captured', scenario: 'public', arm: 'full', repetition: 0 },
			WINDOW_GOAL,
		)
		expect(capture.exchanges.declaration).toMatchObject({
			phase: 'declaration',
			trial: 'captured',
			version: 'fixture-1',
			goals: ['first'],
		})
		await capture.exchanges.append({ phase: 'complete', count: 0 })
		expect(capture.rows.calls).toEqual([[{ phase: 'complete', count: 0 }]])
		await expect(
			capture.replay.fetch('metadata', 'http://127.0.0.1:7/api/tags', {}),
		).rejects.toThrow(STUDY_MEMORY_REPLAY_REFUSAL)
		expect(capture.sent.calls).toEqual([['metadata', '/api/tags']])
	})

	it('loads actual tools declarations', async () => {
		const fixture = await loadStudyToolsFixture()
		expect(fixture.manifest.definition.driver).toBe('tools')
		expect(fixture.subject).toHaveProperty('Agent')
	})
})

describe('memory labels through Study', () => {
	const options = { created: '2026-11-02T00:00:00.000Z', version: 'fixture' }

	it('keeps the row order the memory pool numbered, on synthetic members', () => {
		const pool = createStudyLabelPool(buildMemoryLabelSegments(), {
			order: 'gate',
			controls: MEMORY_LABEL_CONTROLS,
			partition: readMemoryLabelPartition,
		})
		expect(pool.requests).toHaveLength(36)
		expect(pool.map.links).toHaveLength(144)
		expect(pool.map.checks).toHaveLength(MEMORY_LABEL_CONTROLS.length)
		// The digest of what the retired helpers built from these members, before they were deleted.
		expect(
			hashStudyBytes(
				JSON.stringify([
					pool.requests,
					pool.map.links.map((link) => [link.row, link.request, link.trial, link.criterion]),
					pool.map.checks,
				]),
			),
		).toBe('35f9380344e2b386faa0c5e74df8c0fb2e0b875e31631471475c5295f6c1eb2c')
	})

	it('reads a goal and class from a criterion, and a criterion with no class refuses the pool', () => {
		expect(readMemoryLabelPartition({ trial: 't', criterion: 'ev-12-work' })).toEqual({
			goal: 'ev-12',
			class: 'work',
		})
		expect(readMemoryLabelPartition({ trial: 't', criterion: 'goal-other' })).toBeUndefined()
		expect(() =>
			createStudyLabelPool([buildMemoryLabelFixture(['goal-other']).segment], {
				order: 'o',
				controls: [],
				partition: readMemoryLabelPartition,
			}),
		).toThrow(/goal-other/)
	})

	it('refuses a missing answer unless the gate passes partial', () => {
		const map = buildMemoryLabelMap(['work', 'work'])
		const lanes = [
			{
				labeler: 'sonnet',
				method: 'model',
				rows: [{ row: 1, verdict: 'achieved', reason: 'One' }],
			},
		] satisfies readonly StudyLabelLane[]
		expect(() => createStudyLabels(map, lanes, options)).toThrow(/partial/)
		expect(createStudyLabels(map, lanes, { ...options, partial: true }).omitted).toBe(1)
	})

	it('round trips each row to its own source pair through the packet translation', () => {
		const fixture = buildMemoryLabelFixture()
		const { requests, map } = createStudyLabelPool([fixture.segment], {
			order: 'round trip',
			controls: MEMORY_LABEL_CONTROLS,
			partition: readMemoryLabelPartition,
		})
		const expected = new Map<string, MemoryLabelVerdict>([
			['complete/Fictional assertion of goal-work', 'achieved'],
			['complete/Fictional assertion of goal-completion', 'unsuccessful'],
			['faulted/Fictional assertion of goal-work', 'unsuccessful'],
			['faulted/Fictional assertion of goal-completion', 'achieved'],
		])
		const answers = requests
			.flatMap((request) => request.rows)
			.map((row): StudyLabelAnswer => {
				const assertion = isRecord(row.assertion) ? String(row.assertion.criterion) : ''
				const trial = row.product === undefined ? 'faulted' : 'complete'
				return {
					row: row.row,
					verdict: expected.get(`${trial}/${assertion}`) ?? 'unknown',
					reason: `Quotes ${assertion}`,
				}
			})
		const disputed = map.links.find(
			(link) =>
				link.source.trial === fixture.result.manifest.schedule[0]?.id &&
				link.source.criterion === 'goal-completion',
		)
		const built = createStudyLabels(
			map,
			[
				{ labeler: 'sonnet', method: 'model', rows: answers },
				{
					labeler: 'opus',
					method: 'model',
					rows: answers.map((answer) =>
						answer.row === disputed?.row ? { ...answer, verdict: 'achieved' } : answer,
					),
				},
			],
			{ ...options, partial: true },
		)
		expect(built.labels).toHaveLength(1)
		expect(built.disputes).toEqual([disputed?.row])
		const [labels] = built.labels
		if (labels === undefined) throw new Error('The import wrote no labels')
		const translated = translateStudyPacketLabels(
			fixture.result,
			fixture.rubric,
			fixture.digest,
			parseStudyLabels(labels),
		)
		const [complete, faulted] = fixture.result.manifest.schedule
		expect(
			translated
				.map((entry) => [entry.trial, entry.criterion, entry.verdict, entry.reason.slice(0, 6)])
				.toSorted((left, right) => String(left).localeCompare(String(right))),
		).toEqual(
			[
				[complete?.id, 'goal-completion', 'unknown', STUDY_LABEL_DISPUTE.slice(0, 6)],
				[complete?.id, 'goal-work', 'achieved', 'Quotes'],
				[faulted?.id, 'goal-completion', 'achieved', 'Quotes'],
				[faulted?.id, 'goal-work', 'unsuccessful', 'Quotes'],
			].toSorted((left, right) => String(left).localeCompare(String(right))),
		)
		expect(labels.judgments).toHaveLength(4)
	})

	it('keeps a goal receipts to its own rows of the named events', () => {
		expect(filterMemoryReceipts(MEMORY_EVIDENCE, 'g2')).toEqual([
			{ event: 'arrival', value: { id: 'one' } },
			{ event: 'result', value: { partial: false } },
			{ event: 'summary', value: {} },
		])
		expect(filterMemoryReceipts(MEMORY_EVIDENCE, 'absent')).toEqual([])
	})
})

describe('memory gate reader', () => {
	it.each(MEMORY_GATE_ROWS)('reads the hand-computed row: $name', (row) => {
		expect(
			computeMemoryGate(
				{
					treatment: buildMemoryGateJudgments(row.counts.treatment, row.clause),
					base: buildMemoryGateJudgments(row.counts.base, row.clause),
					repeat: buildMemoryGateJudgments(row.counts.repeat, row.clause),
					sham: buildMemoryGateJudgments(row.counts.sham, row.clause),
				},
				row.clause,
			),
		).toEqual({
			verdict: row.verdict,
			counts: row.counts,
			noise: row.noise,
			reversal: row.reversal,
			deciders: row.deciders,
		})
	})

	it('refuses read arms of unequal class totals', () => {
		const clause = { class: 'work', relationship: 'noninferior' } satisfies MemoryGateClause
		const four = buildMemoryGateJudgments({ known: 2, unknown: 0, total: 4 }, clause)
		const three = buildMemoryGateJudgments({ known: 2, unknown: 0, total: 3 }, clause)
		expect(() =>
			computeMemoryGate({ treatment: four, base: three, repeat: four, sham: four }, clause),
		).toThrow(/total/)
	})

	it('assigns arms by role and reads an unlabeled row as unknown', () => {
		const map = {
			checks: [],
			links: [
				...buildMemoryLabelMap(['work', 'work'], 'on').links,
				...buildMemoryLabelMap(['work', 'work'], 'off', 3).links,
			],
		} satisfies StudyLabelMap
		const { labels } = createStudyLabels(
			map,
			[
				{
					labeler: 'sonnet',
					method: 'model',
					rows: [
						{ row: 1, verdict: 'achieved', reason: 'One' },
						{ row: 3, verdict: 'unsuccessful', reason: 'Three' },
						{ row: 4, verdict: 'unsuccessful', reason: 'Four' },
					],
				},
			],
			{ created: '2026-11-02T00:00:00.000Z', version: 'fixture', partial: true },
		)
		const population = buildMemoryGatePopulation(map, labels, {
			treatment: 'on',
			base: 'off',
			repeat: 'off',
			sham: 'off',
		})
		expect(
			population.treatment.map((entry) => [entry.trial, entry.criterion, entry.verdict]),
		).toEqual([
			['trial-on', 'ev-1-work', 'achieved'],
			['trial-on', 'ev-2-work', 'unknown'],
		])
		expect(population.treatment[1]?.reason).toBe(MEMORY_LABEL_ABSENT)
		expect(population.base.map((entry) => entry.verdict)).toEqual(['unsuccessful', 'unsuccessful'])
		expect(computeMemoryGate(population, { class: 'work', relationship: 'improves' }).verdict).toBe(
			'holds',
		)
	})

	it('sends a third lane only the disputes that can decide an open clause', () => {
		const assignment = { treatment: 'on', base: 'off', repeat: 'repeat', sham: 'sham' }
		const on = buildMemoryLabelMap(['work', 'work', 'completion'], 'on').links
		const off = buildMemoryLabelMap(['work'], 'off', 4).links
		const map = { checks: [], links: [...on, ...off] } satisfies StudyLabelMap
		const open = MEMORY_GATE_ROWS.find((row) => row.name === 'C, noninferior open on the treatment')
		const holds = MEMORY_GATE_ROWS.find((row) => row.name === 'A, noninferior holds')
		if (open === undefined || holds === undefined) throw new Error('Missing table rows')
		expect(
			collectMemoryThirdRows(
				map,
				[1, 2, 3, 4],
				[{ clause: open.clause, outcome: open }],
				assignment,
			),
		).toEqual([1, 2])
		expect(
			collectMemoryThirdRows(
				map,
				[1, 2, 3, 4],
				[{ clause: holds.clause, outcome: holds }],
				assignment,
			),
		).toEqual([])
		expect(
			collectMemoryThirdRows(map, [2], [{ clause: open.clause, outcome: open }], assignment),
		).toEqual([2])
	})

	it('draws the spot check from the rows that count toward a clause first', () => {
		const assignment = { treatment: 'on', base: 'off', repeat: 'repeat', sham: 'sham' }
		const on = buildMemoryLabelMap(['facts', 'work', 'work'], 'on').links
		const off = buildMemoryLabelMap(['work'], 'other', 4).links
		const map = { checks: [], links: [...on, ...off] } satisfies StudyLabelMap
		const { labels } = createStudyLabels(
			map,
			[
				{
					labeler: 'sonnet',
					method: 'model',
					rows: [
						{ row: 1, verdict: 'achieved', reason: 'One' },
						{ row: 2, verdict: 'unsuccessful', reason: 'Two' },
						{ row: 3, verdict: 'achieved', reason: 'Three' },
						{ row: 4, verdict: 'achieved', reason: 'Four' },
					],
				},
			],
			{ created: '2026-11-02T00:00:00.000Z', version: 'fixture', partial: true },
		)
		const clauses = [
			{ class: 'work', relationship: 'noninferior' },
		] satisfies readonly MemoryGateClause[]
		expect(collectMemorySpotRows(map, labels, clauses, assignment, 4)).toEqual([3, 2, 1, 4])
		expect(collectMemorySpotRows(map, labels, clauses, assignment, 2)).toEqual([3, 2])
		expect(collectMemorySpotRows(map, labels, [], assignment, 2)).toEqual([1, 2])
	})

	it('parses a clause list and a role assignment from their command text', () => {
		expect(parseMemoryGateClauses('work:noninferior,completion:unadded')).toEqual([
			{ class: 'work', relationship: 'noninferior' },
			{ class: 'completion', relationship: 'unadded' },
		])
		expect(parseMemoryGateClauses('facts:noninferior')).toBeUndefined()
		expect(parseMemoryGateClauses('work:above')).toBeUndefined()
		expect(parseMemoryGateAssignment('treatment=on,base=system,repeat=repeat,sham=sham')).toEqual({
			treatment: 'on',
			base: 'system',
			repeat: 'repeat',
			sham: 'sham',
		})
		expect(parseMemoryGateAssignment('treatment=on')).toBeUndefined()
	})
})

describe('memory labeling script', () => {
	const row = { row: 1, input: {}, assertion: { criterion: 'A "fictional" assertion' } }

	it('builds one neutral node per request per engine per condition', () => {
		const requests = [{ rows: [row] }, { rows: [{ ...row, row: 2 }] }]
		const plain = buildMemoryLabelNodes(requests, ['sonnet', 'opus'], 'Judge each row.')
		expect(plain.map((node) => [node.label, node.request, node.engine, node.condition])).toEqual([
			['node-1', 0, 'sonnet', 'plain'],
			['node-2', 1, 'sonnet', 'plain'],
			['node-3', 0, 'opus', 'plain'],
			['node-4', 1, 'opus', 'plain'],
		])
		expect(plain.every((node) => node.characters === node.prompt.length)).toBe(true)
		const evidence = [
			[{ event: 'arrival', value: 'first' }],
			[{ event: 'result', value: 'second' }],
		]
		const both = buildMemoryLabelNodes(requests, ['sonnet'], 'Judge each row.', evidence)
		expect(both.map((node) => [node.label, node.request, node.condition])).toEqual([
			['node-1', 0, 'plain'],
			['node-2', 1, 'plain'],
			['node-3', 0, 'receipts'],
			['node-4', 1, 'receipts'],
		])
		expect(both.map((node) => node.prompt.includes('first'))).toEqual([false, false, true, false])
		expect(both.map((node) => node.prompt.includes('second'))).toEqual([false, false, false, true])
	})

	it('reads a kept plan back and refuses a malformed one', () => {
		const pool = createStudyLabelPool([buildMemoryLabelFixture().segment], {
			order: 'plan',
			controls: MEMORY_LABEL_CONTROLS,
			partition: readMemoryLabelPartition,
		})
		const nodes = [
			{ label: 'node-1', request: 0, engine: 'sonnet', condition: 'plain', characters: 10 },
		]
		expect(parseMemoryLabelPlan(JSON.stringify({ pool, nodes }))).toEqual({ pool, nodes })
		expect(parseMemoryLabelPlan(JSON.stringify({ pool, nodes: [{ label: 'node-1' }] }))).toBe(
			undefined,
		)
		expect(parseMemoryLabelPlan(JSON.stringify({ nodes }))).toBeUndefined()
		expect(parseMemoryLabelPlan('{')).toBeUndefined()
	})

	it('generates a script that runs fresh nodes and returns counts alone', async () => {
		const nodes = buildMemoryLabelNodes(
			[{ rows: [row] }, { rows: [{ ...row, row: 2 }] }],
			['sonnet', 'opus'],
			'Judge each row.',
		)
		const script = renderMemoryLabelScript('fixture-gate', nodes)
		const [meta, ...body] = script.split('\n')
		expect(meta).toMatch(/^export const meta = \{ name: "rc-s3-fixture-gate", /)
		expect(script).not.toMatch(/Date\.now|Math\.random|new Date\(\)/)
		const started = createRecorder<
			readonly [
				prompt: string,
				options: {
					readonly label: string
					readonly model: string
					readonly effort: string
					readonly schema: unknown
				},
			]
		>()
		const phases = createRecorder<readonly [title: string]>()
		const returned: unknown = await runInNewContext(`(async () => {${body.join('\n')}\n})()`, {
			agent: async (...call: (typeof started.calls)[number]) => {
				const [prompt] = call
				started.handler(...call)
				return prompt.includes('"row":2') ? null : { rows: [] }
			},
			parallel: async (thunks: ReadonlyArray<() => Promise<unknown>>) =>
				Promise.all(thunks.map((thunk) => thunk())),
			phase: phases.handler,
		})
		expect(JSON.stringify(returned)).toBe('{"harness":1,"requests":4,"answers":2}')
		expect(phases.calls).toEqual([['Harness'], ['Label']])
		expect(started.calls[0]?.[0]).toBe(MEMORY_LABEL_HARNESS)
		expect(started.calls.slice(1).map(([prompt]) => prompt)).toEqual(
			nodes.map((node) => node.prompt),
		)
		const options = started.calls.slice(1).map(([, entry]) => entry)
		// A lane fills Study's published schema, whose `reason` refuses a blank one at the tool call.
		for (const entry of options)
			expect(JSON.stringify(entry.schema)).toBe(JSON.stringify(studyLabelAnswersContract.schema))
		expect(JSON.stringify(studyLabelAnswersContract.schema)).toContain('"pattern":"\\\\S"')
		expect(options.map((entry) => [entry.label, entry.model, entry.effort])).toEqual([
			['node-1', 'sonnet', MEMORY_LABEL_EFFORT],
			['node-2', 'sonnet', MEMORY_LABEL_EFFORT],
			['node-3', 'opus', MEMORY_LABEL_EFFORT],
			['node-4', 'opus', MEMORY_LABEL_EFFORT],
		])
		expect(
			options.every((entry) => JSON.stringify(entry.schema).includes('"pattern":"\\\\S"')),
		).toBe(true)
	})
})

describe('memory labeling journal', () => {
	const nodes = [
		{
			label: 'node-1',
			request: 0,
			engine: 'sonnet',
			condition: 'plain',
			characters: 2000,
		},
		{
			label: 'node-2',
			request: 1,
			engine: 'sonnet',
			condition: 'plain',
			characters: 1000,
		},
		{
			label: 'node-3',
			request: 0,
			engine: 'sonnet',
			condition: 'receipts',
			characters: 2500,
		},
		{ label: 'node-4', request: 1, engine: 'opus', condition: 'plain', characters: 1000 },
		{ label: 'node-5', request: 0, engine: 'opus', condition: 'plain', characters: 2000 },
		{ label: 'node-6', request: 1, engine: 'opus', condition: 'receipts', characters: 1500 },
	] as const satisfies ReadonlyArray<Omit<MemoryLabelNode, 'prompt'>>
	const answer = { row: 1, verdict: 'achieved', reason: 'A reason' } satisfies StudyLabelAnswer
	const shown = [
		{ rows: [{ row: 1, input: {}, assertion: {} }] },
		{ rows: [{ row: 2, input: {}, assertion: {} }] },
	]

	it('reads started and returned nodes, keeping the last of a replayed node', () => {
		const text = renderMemoryJournalFixture([
			{ agent: 'a1', label: 'node-1', result: { rows: [] } },
			{ agent: 'a1', label: 'node-1', result: { rows: [answer] } },
			{ agent: 'a2', label: 'node-2', result: undefined },
		])
		expect(readMemoryJournal(text)).toEqual({
			entries: 5,
			nodes: [
				{ agent: 'a1', label: 'node-1', result: { rows: [answer] } },
				{ agent: 'a2', label: 'node-2', result: undefined },
			],
		})
		expect(() => readMemoryJournal(`${text}{"type":`)).toThrow(/journal/)
	})

	it('reads tool calls from assistant lines and the wall from stamped lines', () => {
		expect(
			readMemoryTranscript(
				renderMemoryTranscriptFixture(
					['StructuredOutput'],
					'2026-11-02T13:40:25.000Z',
					'2026-11-02T13:40:55.500Z',
				),
			),
		).toEqual({ tools: ['StructuredOutput'], wall: 30500 })
		expect(readMemoryTranscript('')).toEqual({ tools: [], wall: undefined })
	})

	it('discards a node that used a tool, counts an unread one, and sets aside foreign nodes', () => {
		const clean = { tools: ['StructuredOutput'], wall: 1000 }
		const run = buildMemoryLabelRun(
			nodes,
			{
				entries: 8,
				nodes: [
					{ agent: 'a1', label: 'node-1', result: { rows: [answer] } },
					{
						agent: 'a2',
						label: 'node-2',
						result: { rows: [{ ...answer, row: 2 }, { row: 'two' }] },
					},
					{ agent: 'a3', label: 'node-3', result: { rows: [answer] } },
					{ agent: 'a4', label: 'node-4', result: { verdict: 'none' } },
					{ agent: 'a0', label: 'floor', result: { rows: [answer] } },
				],
			},
			new Map([
				['a1', clean],
				['a2', clean],
				['a3', { tools: ['Read', 'StructuredOutput'], wall: 1000 }],
				['a4', clean],
				['a0', clean],
			]),
			shown,
		)
		expect(run.reads.map((read) => [read.node.label, read.answers.length])).toEqual([
			['node-1', 1],
			['node-2', 1],
		])
		expect(run.discarded).toBe(1)
		expect(run.unread).toBe(3)
		expect(run.foreign).toBe(1)
		expect(
			buildMemoryLabelRun(
				nodes,
				{ entries: 2, nodes: [{ agent: 'a1', label: 'node-1', result: { rows: [answer] } }] },
				new Map(),
				shown,
			).discarded,
		).toBe(1)
	})

	it('drops and counts an answer for a row its node was not shown', () => {
		const clean = { tools: ['StructuredOutput'], wall: 1000 }
		const answers = { rows: [answer, { ...answer, row: 2, verdict: 'unsuccessful' }] }
		const kept = buildMemoryLabelRun(
			nodes.slice(0, 2),
			{
				entries: 4,
				nodes: [
					{ agent: 'a1', label: 'node-1', result: answers },
					{ agent: 'a2', label: 'node-2', result: { rows: [{ ...answer, row: 2 }] } },
				],
			},
			new Map([
				['a1', clean],
				['a2', clean],
			]),
			shown,
		)
		expect(kept.reads.map((read) => read.answers)).toEqual([[answer], [{ ...answer, row: 2 }]])
		expect(kept.strayed).toBe(1)
		// Row 2's own node used a tool, so the stray answer leaves row 2 unanswered, never labeled.
		const discarded = buildMemoryLabelRun(
			nodes.slice(0, 2),
			{
				entries: 4,
				nodes: [
					{ agent: 'a1', label: 'node-1', result: answers },
					{ agent: 'a2', label: 'node-2', result: { rows: [{ ...answer, row: 2 }] } },
				],
			},
			new Map([
				['a1', clean],
				['a2', { tools: ['Read'], wall: 1000 }],
			]),
			shown,
		)
		expect(buildMemoryLabelLanes(discarded, 'plain')).toEqual([
			{ labeler: 'sonnet', method: 'model', rows: [answer] },
		])
		expect(discarded.strayed).toBe(1)
	})

	it('extracts the harness node report and refuses any other shape', () => {
		const report = { tools: ['StructuredOutput'], context: ['A fictional file'] }
		expect(
			extractMemoryHarness({
				entries: 4,
				nodes: [
					{ agent: 'a0', label: 'harness', result: report },
					{ agent: 'a1', label: 'node-1', result: { rows: [answer] } },
				],
			}),
		).toEqual(report)
		expect(
			extractMemoryHarness({
				entries: 2,
				nodes: [{ agent: 'a0', label: 'harness', result: { rows: [answer] } }],
			}),
		).toBeUndefined()
		expect(
			extractMemoryHarness({
				entries: 2,
				nodes: [{ agent: 'a1', label: 'node-1', result: report }],
			}),
		).toBeUndefined()
	})

	it('builds a lane per engine with kept rows, per condition', () => {
		const run = {
			unread: 0,
			discarded: 0,
			foreign: 0,
			strayed: 0,
			reads: [
				{ node: nodes[0], answers: [answer], wall: 1 },
				{ node: nodes[1], answers: [{ ...answer, row: 2 }], wall: 1 },
				{ node: nodes[2], answers: [{ ...answer, verdict: 'unknown' }], wall: 1 },
			],
		} satisfies MemoryLabelRun
		expect(buildMemoryLabelLanes(run, 'plain')).toEqual([
			{ labeler: 'sonnet', method: 'model', rows: [answer, { ...answer, row: 2 }] },
		])
		expect(buildMemoryLabelLanes(run, 'receipts')).toEqual([
			{ labeler: 'sonnet', method: 'model', rows: [{ ...answer, verdict: 'unknown' }] },
		])
	})

	it('reads each spread with its median, leaving its input alone', () => {
		const values = [5, 1, 3, 2]
		expect(computeMemorySpread(values)).toEqual({ least: 1, median: 2.5, greatest: 5 })
		expect(values).toEqual([5, 1, 3, 2])
		expect(computeMemorySpread([4, 2, 9])).toEqual({ least: 2, median: 4, greatest: 9 })
		expect(computeMemorySpread([])).toBeUndefined()
	})

	it('reads the pilot rate beside the text size it was read on', () => {
		const map = buildMemoryLabelMap(['work', 'completion'])
		const requests = [
			// 35 characters of JSON: {"row":1,"input":{},"assertion":{}}.
			{ rows: [{ row: 1, input: {}, assertion: {} }] },
			// 40 characters of JSON: {"row":2,"input":"abcde","assertion":{}}.
			{ rows: [{ row: 2, input: 'abcde', assertion: {} }] },
		]
		const run = {
			unread: 0,
			discarded: 0,
			foreign: 0,
			strayed: 0,
			reads: [
				{ node: nodes[0], answers: [answer], wall: 30000 },
				{
					node: nodes[1],
					answers: [{ row: 2, verdict: 'unknown', reason: 'A reason' }],
					wall: 20000,
				},
				{
					node: nodes[2],
					answers: [
						{ row: 1, verdict: 'achieved', reason: 'A reason' },
						{ row: 2, verdict: 'unsuccessful', reason: 'A reason' },
					],
					wall: 90000,
				},
				{ node: nodes[3], answers: [answer], wall: 70000 },
			],
		} satisfies MemoryLabelRun
		// Plain sonnet nodes: 30000 ms on 2000 characters is 15000 ms per 1000, and 20000 ms on 1000 is 20000.
		expect(computeMemoryPilot(map, requests, run, 'sonnet')).toEqual({
			wall: { least: 20000, median: 25000, greatest: 30000 },
			characters: { least: 1000, median: 1500, greatest: 2000 },
			rate: { least: 15000, median: 17500, greatest: 20000 },
			classes: [
				{
					class: 'work',
					characters: { least: 35, median: 35, greatest: 35 },
					count: 1,
					achieved: 1,
					changed: 0,
				},
				{
					class: 'completion',
					characters: { least: 40, median: 40, greatest: 40 },
					count: 1,
					achieved: 0,
					changed: 1,
				},
				{ class: 'facts', characters: undefined, count: 0, achieved: 0, changed: 0 },
				{ class: 'obligations', characters: undefined, count: 0, achieved: 0, changed: 0 },
			],
		})
		expect(computeMemoryPilot(map, requests, { ...run, reads: [] }, 'sonnet').wall).toBeUndefined()
	})
})
