import { isRecord, isArray, parseJSON } from '@orkestrel/contract'
import { parseStudyProfile } from '@orkestrel/study'
import { isStudyCustodyManifest, readStudyDeclaration } from '@orkestrel/study/server'
import { createScratch, destroyScratch } from '@orkestrel/test/server'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { StudyMemoryDriver } from '../studies/memory/index.js'
import {
	assertMemoryReplay,
	buildMemoryReplayEvidence,
	mapMemoryReplayIds,
	readMemoryReplayMessages,
	MemoryScript,
	buildCustodyManifest,
	buildMemoryGradeFixture,
	buildMemoryRouteAnswer,
	buildStudyAssessment,
	buildStudyChatProfile,
	createStudyMeterFixture,
	buildMemoryCall,
	buildMemoryCapture,
	buildMemoryCriterion,
	buildMemoryRecordProfile,
	buildMemoryVerdict,
	countMemoryPairs,
	omitMemoryAuxiliaries,
	buildMemoryObservationGoals,
	buildMemoryObservationResponses,
	buildMemoryProfile,
	buildMemoryReply,
	createMemoryContext,
	createMemoryFixture,
	createStudyFixtureInstall,
	listMemoryKeys,
	matchesMemoryUnload,
	readMemoryAdmission,
	readMemoryControls,
	readMemoryEvents,
	readMemoryModel,
	readMemoryModels,
	readMemoryOrigins,
	readMemoryParts,
	readMemoryRequests,
	readMemorySealedCheckpoint,
	readMemoryShapes,
	readMemorySnapshot,
	readMemoryTimeline,
	executeMemoryGoals,
	executeStudyProcess,
	executeStudyTopology,
	readMemoryToolResults,
	runMemoryFailure,
	runMemoryTrial,
	totalMemoryUsage,
	writeMemoryLocalProfile,
	writeStudyInstallRecord,
	STUDY_MEMORY_CONTEXT_KEYS,
	STUDY_MEMORY_ESTIMATE_KEYS,
	STUDY_MEMORY_INERT_EXCHANGES,
	STUDY_MEMORY_INERT_REPLAY,
	STUDY_MEMORY_MODULES,
	STUDY_MEMORY_OBSERVED_EVENTS,
	STUDY_MEMORY_OBSERVED_KEYS,
	STUDY_MEMORY_OPTION_KEYS,
	STUDY_MEMORY_RECORD,
	STUDY_MEMORY_REFUSAL_KEYS,
	STUDY_MEMORY_REPLAY_REFUSAL,
	STUDY_MEMORY_SHORT_GOAL,
	STUDY_MEMORY_TIMING,
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
			'conversation.judgments.sources',
			'ledger.conversation.id',
			'ledger.conversation.messages.id',
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
	it('keeps an authored declaration schedule under a provider identity and grades each scheduled attempt', async () => {
		const { definition, scenarios } = await readStudyDeclaration(resolve('.'), 'chat')
		const { bounds } = buildStudyChatProfile('full', 'http://127.0.0.1:7')
		const manifest = buildCustodyManifest(definition, scenarios, bounds)
		expect(isStudyCustodyManifest(manifest)).toBe(true)
		expect(new Set(manifest.schedule.map((item) => item.scenario))).toEqual(
			new Set(definition.scenarios),
		)
		const rebuilt = buildCustodyManifest(definition, scenarios, bounds, 'e'.repeat(64))
		expect(isStudyCustodyManifest(rebuilt)).toBe(true)
		expect(rebuilt.identity.provider).toBe('e'.repeat(64))
		expect(rebuilt.schedule).toEqual(manifest.schedule)
		expect(buildStudyAssessment(manifest.schedule).attempts).toEqual(
			manifest.schedule.map((item) => item.id),
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
	it('installs a study under its profile rebound to a fixture that lists the profile pins, and fills the local memory profile there', async () => {
		const scratch = createScratch({ prefix: 'study-install-setup-' })
		await expect(createStudyFixtureInstall(scratch, [], 'recommended')).rejects.toThrow(
			'Missing study to install',
		)
		const { server, install } = await createStudyFixtureInstall(
			scratch,
			['capacity'],
			'recommended',
		)
		try {
			const authored = parseStudyProfile(
				parseJSON(readFileSync('studies/memory/profiles/recommended.json', 'utf8')),
			)
			const provider = authored.provider
			if (provider === undefined) throw new Error('Missing authored provider')
			expect(install.root).toBe(join(scratch.path, 'install'))
			const profiles = join(install.root, 'studies/memory/profiles')
			expect(parseJSON(readFileSync(join(profiles, 'recommended.json'), 'utf8'))).toMatchObject({
				provider: { url: server.url, digest: provider.digest },
			})
			const listed = parseJSON(await (await fetch(`${server.url}/api/tags`)).text())
			if (!isRecord(listed) || !isArray(listed.models)) throw new Error('Missing model list')
			expect(listed.models).toHaveLength(3)
			expect(listed.models).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ name: provider.model, digest: provider.digest.model }),
					expect.objectContaining({ name: provider.judge, digest: provider.digest.judge }),
					expect.objectContaining({ name: provider.triage, digest: provider.digest.triage }),
				]),
			)
			writeMemoryLocalProfile(install.root)
			const local = parseJSON(readFileSync(join(profiles, 'local.json'), 'utf8'))
			expect(local).toMatchObject({
				name: 'local',
				roots: authored.roots,
				qualification: 'tmp/studies/capacity',
				bounds: {
					request: { duration: 3000 },
					goal: { duration: 30000 },
					trial: { duration: 90000 },
					series: { duration: 240000 },
				},
				provider: {
					entry: provider.entry,
					url: server.url,
					model: provider.model,
					judge: provider.judge,
					digest: { model: provider.digest.model, judge: provider.digest.judge },
				},
			})
			expect(isRecord(local) && isRecord(local.provider) && 'triage' in local.provider).toBe(false)
			const help = await install.execute(['--help'])
			expect(help).toMatchObject({ code: 0 })
			expect(help.stdout).toContain('study execute')
			expect(readMemoryRequests(server)).toEqual([{ path: '/api/tags', body: '' }])
		} finally {
			await server.destroy()
			await destroyScratch(scratch)
		}
	}, 60000)

	it('serves queued protocol responses and owns real request accounting and cleanup', async () => {
		const server = await createMemoryFixture(
			new MemoryScript([{ path: '/api/chat', status: 503, body: 'unavailable' }]),
		)
		const profile = buildMemoryProfile({ url: server.url })
		const fixture = createMemoryContext(profile)
		try {
			const refused = await fetch(`${server.url}/api/chat`, { method: 'POST', body: '{}' })
			expect(refused.status).toBe(503)
			expect(await refused.text()).toBe('unavailable')
			expect(readMemoryRequests(server)[0]).toEqual({ path: '/api/chat', body: '{}' })
			const metadata = await fetch(`${server.url}/api/show`, {
				method: 'POST',
				body: '{"model":"model"}',
			})
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
			await server.destroy()
		}
	})

	it('serves scripted replies in order, leaves an unscripted path to its default and logs every request', async () => {
		const script = [
			{ path: '/api/chat', body: 'first' },
			{ path: '/api/chat', status: 503, body: 'second' },
			{ path: '/api/generate', body: 'third' },
		]
		const replies = new MemoryScript(script)
		const server = await createMemoryFixture(replies)
		const named = '{"model":"model"}'
		try {
			expect(replies.responses).toEqual(script)
			// The getter hands out a copy, so a caller cannot reorder what is still scripted.
			replies.responses.pop()
			expect(replies.responses).toHaveLength(3)
			const observed: Array<readonly [string, number, string, number]> = []
			for (const path of [
				'/api/generate',
				'/api/chat',
				'/api/show',
				'/api/chat',
				'/api/generate',
				'/api/chat',
			]) {
				const reply = await fetch(`${server.url}${path}`, { method: 'POST', body: named })
				observed.push([path, reply.status, await reply.text(), replies.responses.length])
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
			expect(readMemoryRequests(server)).toEqual(observed.map(([path]) => ({ path, body: named })))
			expect(script).toHaveLength(3)
		} finally {
			await server.destroy()
		}
	})

	it('answers a model list unless the script heads with one, and gives each script its own replies', async () => {
		const script = [{ path: '/api/tags', status: 500, body: 'down' }]
		const first = new MemoryScript(script)
		const second = new MemoryScript(script)
		const down = await createMemoryFixture(first)
		const other = await createMemoryFixture(second)
		try {
			const refused = await fetch(`${down.url}/api/tags`)
			expect([refused.status, await refused.text()]).toEqual([500, 'down'])
			const listed = await fetch(`${down.url}/api/tags`)
			expect(parseJSON(await listed.text())).toMatchObject({
				models: [{ name: 'model' }, { name: 'judge' }],
			})
			expect(first.responses).toEqual([])
			expect(second.responses).toEqual(script)
			expect((await fetch(`${other.url}/api/tags`)).status).toBe(500)
		} finally {
			await Promise.all([down.destroy(), other.destroy()])
		}
	})

	it('answers a version request unless the script heads with one', async () => {
		const replies = new MemoryScript([{ path: '/api/version', status: 500, body: 'down' }])
		const server = await createMemoryFixture(replies)
		try {
			const refused = await fetch(`${server.url}/api/version`)
			expect([refused.status, await refused.text()]).toEqual([500, 'down'])
			const answered = await fetch(`${server.url}/api/version`)
			expect(parseJSON(await answered.text())).toEqual({ version: 'fixture-1' })
			expect(replies.responses).toEqual([])
		} finally {
			await server.destroy()
		}
	})

	it('answers a path from its policy, declines an unload and an unknown path, and streams delayed and held bodies', async () => {
		const server = await createMemoryFixture(
			new MemoryScript(
				[
					{ path: '/api/chat', body: 'last', chunks: [{ delay: 20, body: 'first ' }] },
					{ path: '/api/tags', body: 'held', open: true },
				],
				{ '/v1/systemone': buildMemoryRouteAnswer },
			),
		)
		try {
			const streamed = await fetch(`${server.url}/api/chat`, { method: 'POST', body: '{}' })
			expect(await streamed.text()).toBe('first last')
			const held = (await fetch(`${server.url}/api/tags`)).body?.getReader()
			const chunk = await held?.read()
			expect(new TextDecoder().decode(chunk?.value)).toBe('held')
			await held?.cancel()
			const question = { type: 'choice', criteria: { fact: 'f', correction: 'c', other: 'o' } }
			const routed = await fetch(`${server.url}/v1/systemone`, {
				method: 'POST',
				body: JSON.stringify({ model: 'tev1:0.8b', questions: { q1: question } }),
			})
			expect(parseJSON(await routed.text())).toEqual({
				model: 'tev1:0.8b',
				answers: {
					q1: { type: 'choice', probabilities: { fact: 0.9, correction: 0.05, other: 0.05 } },
				},
			})
			expect(() =>
				buildMemoryRouteAnswer({ model: 'tev1:0.8b', questions: { q1: { type: 'noul' } } }),
			).toThrow('Expected a choice question')
			expect(() => buildMemoryRouteAnswer({ questions: { q1: question } })).toThrow(
				'Missing System One model',
			)
			const unloaded = await fetch(`${server.url}/api/generate`, {
				method: 'POST',
				body: JSON.stringify({ model: 'judge', keep_alive: 0, prompt: '' }),
			})
			expect(parseJSON(await unloaded.text())).toMatchObject({
				model: 'judge',
				done: true,
				done_reason: 'unload',
			})
			expect((await fetch(`${server.url}/api/absent`, { method: 'POST' })).status).toBe(404)
			for (const body of ['{"keep_alive":0}', '{"keep_alive":0,"prompt":""}'])
				expect(matchesMemoryUnload(body)).toBe(true)
			for (const body of ['{"keep_alive":0,"prompt":"Judge"}', '{"prompt":""}', 'not json'])
				expect(matchesMemoryUnload(body)).toBe(false)
		} finally {
			await server.destroy()
		}
	})

	it('repeats the model a request names in a default reply, as a daemon does', async () => {
		expect(readMemoryModel('{"model":"org/agent:q4"}', 'model')).toBe('org/agent:q4')
		expect(readMemoryModel('{"model":1}', 'model')).toBe('model')
		expect(readMemoryModel('', 'judge')).toBe('judge')
		const server = await createMemoryFixture()
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
			await server.destroy()
		}
	})

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

	it('executes goals in order and stops at the first refusal, keeping the earlier products and the error itself', async () => {
		// The second goal is refused before it reaches the wire, so the third would complete if it ran.
		const goals = [
			{ id: 'one', input: { prompt: 'Respond', arrivals: [], records: [] } },
			{ id: 'two', input: { prompt: '', arrivals: [], records: [] } },
			{ id: 'three', input: { prompt: 'Respond', arrivals: [], records: [] } },
		]
		const replies = new MemoryScript([
			{ path: '/api/chat', body: buildMemoryReply({ content: 'Retained one' }) },
			{ path: '/api/chat', body: buildMemoryReply({ content: 'Never reached' }) },
		])
		const server = await createMemoryFixture(replies)
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
				expect(replies.responses).toHaveLength(1)
			} finally {
				await session.close()
			}
		} finally {
			fixture.close()
			await server.destroy()
		}
	})

	it('executes every goal and reports no failure when none refuses', async () => {
		const goals = ['one', 'two'].map((id) => ({
			id,
			input: { prompt: 'Respond', arrivals: [], records: [] },
		}))
		const server = await createMemoryFixture()
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
			await server.destroy()
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

	it('declares recording and observation on the authored local profile, with its metadata allowance', () => {
		const local = parseJSON(readFileSync('studies/memory/profiles/local.json', 'utf8'))
		if (!isRecord(local)) throw new Error('Malformed local profile')
		expect([local.settings, local.record]).toEqual([
			{ observe: true, metadata: { calls: 8192, bytes: 67108864, duration: 600000 } },
			{ bytes: 536870912, calls: 4096, duration: 2400000 },
		])
	})

	it('emits supplied profile settings verbatim, including an explicit absence', () => {
		const url = 'http://127.0.0.1:7'
		const settings = { observe: true, checkpoints: ['a'] }
		expect(buildMemoryProfile({ url, settings }).settings).toEqual(settings)
		for (const profile of [
			buildMemoryProfile({ url }),
			buildMemoryProfile({ url, settings: undefined }),
		]) {
			expect(Object.keys(profile)).toContain('settings')
			expect(profile.settings).toBeUndefined()
		}
	})

	it('removes only the judge a workflow does not use and requires a declared provider', () => {
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		const bare = omitMemoryAuxiliaries(profile)
		expect(bare.provider).toEqual({
			...profile.provider,
			judge: undefined,
			digest: { model: 'a'.repeat(64), judge: undefined },
		})
		expect({ ...bare, provider: profile.provider }).toEqual(profile)
		expect(profile.provider?.judge).toBe('judge')
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
		expect(
			buildMemoryCriterion('late', 'trace', { observation: 'arrival', id: 'a1' }, 'later'),
		).toEqual({
			id: 'late',
			scenario: 'desk',
			goal: 'later',
			method: 'trace',
			critical: false,
			assertion: { observation: 'arrival', id: 'a1' },
		})
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

	it('declares recording on a built profile and on a profile written beside the local profile of an install, keeping its other members', () => {
		const profile = buildMemoryRecordProfile('http://127.0.0.1:7')
		expect(profile.record).toEqual({ bytes: 4194304, calls: 256, duration: 60000 })
		expect(profile.settings).toEqual({
			metadata: { calls: 64, bytes: 1048576, duration: 30000 },
		})
		const scratch = createScratch({ prefix: 'study-recording-setup-' })
		try {
			expect(() => writeStudyInstallRecord(scratch.path, 'recorded')).toThrow(
				'Missing authored memory profile',
			)
			const local = '{"name":"local","settings":{"a":1}}'
			scratch.write('studies/memory/profiles/local.json', local)
			writeStudyInstallRecord(scratch.path, 'recorded', ['opening'])
			expect(parseJSON(scratch.read('studies/memory/profiles/recorded.json') ?? '')).toEqual({
				name: 'recorded',
				record: STUDY_MEMORY_RECORD.record,
				settings: {
					...STUDY_MEMORY_RECORD.settings,
					observe: true,
					checkpoints: ['opening'],
				},
			})
			expect(scratch.read('studies/memory/profiles/local.json')).toBe(local)
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
			STUDY_MEMORY_SHORT_GOAL,
		)
		expect(capture.exchanges.declaration).toMatchObject({
			phase: 'declaration',
			trial: 'captured',
			goals: ['first'],
		})
		expect(capture.exchanges.declaration).not.toHaveProperty('version')
		await capture.exchanges.append({ phase: 'complete', count: 0 })
		expect(capture.rows.calls).toEqual([[{ phase: 'complete', count: 0 }]])
		await expect(
			capture.replay.fetch('metadata', 'http://127.0.0.1:7/api/tags', {}),
		).rejects.toThrow(STUDY_MEMORY_REPLAY_REFUSAL)
		expect(capture.sent.calls).toEqual([['metadata', '/api/tags']])
	})
})
