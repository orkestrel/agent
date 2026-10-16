import { isRecord, parseJSON } from '@orkestrel/contract'
import { isStudyCustodyManifest } from '@orkestrel/study/server'
import { createScratch, destroyScratch } from '@orkestrel/test/server'
import { lstatSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	buildCustodyManifest,
	buildMemoryGradingFixture,
	buildStudyGrading,
	captureStudyPackages,
	createStudyMeterFixture,
	buildMemoryEdge,
	buildMemoryCriterion,
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
	readMemoryControls,
	readMemoryEvents,
	readMemoryModels,
	readMemoryOrigins,
	readMemoryParts,
	readMemoryShapes,
	readMemorySnapshot,
	readMemoryTimeline,
	createStudyInstallFixture,
	executeStudyInstall,
	executeStudyProcess,
	executeStudyTopology,
	loadStudyDeclaration,
	readMemoryToolResults,
	runMemoryFailure,
	runMemoryTrial,
	totalMemoryUsage,
	STUDY_MEMORY_CONTEXT_KEYS,
	STUDY_MEMORY_ESTIMATE_KEYS,
	STUDY_MEMORY_OBSERVED_EVENTS,
	STUDY_MEMORY_OBSERVED_KEYS,
	STUDY_MEMORY_REFUSAL_KEYS,
	STUDY_MEMORY_SETTINGS,
	STUDY_MEMORY_SUMMARY_ROOM,
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
		expect(buildStudyGrading(first.schedule).attempts).toEqual(
			first.schedule.map((item) => item.id),
		)
		const grading = buildMemoryGradingFixture()
		const scheduled = grading.manifest.schedule.map((item) => item.id)
		expect(isStudyCustodyManifest(grading.manifest)).toBe(true)
		expect(scheduled).toEqual([grading.complete.trial.id, grading.faulted.trial.id])
		expect(grading.attempts.map((item) => item.trial.id)).toEqual(scheduled)
		expect(Object.keys(grading.evidence)).toEqual(scheduled)
		expect(grading.evidence[grading.complete.trial.id]).toBe(grading.complete.evidence)
		expect(grading.rubric.criteria.map((item) => item.id)).toEqual([
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
			const entry = join(scratch.path, 'node_modules', '@orkestrel/agent/dist/src/core/index.js')
			expect(parseJSON(scratch.read('studies/memory/profiles/local.json') ?? '')).toMatchObject({
				agent: entry,
				subject: entry,
				qualification: 'tmp/studies/memory-capacity',
				settings: { gauge: { scale: 1, overhead: 0 } },
				provider: { url: 'http://127.0.0.1:7', model: 'model', judge: 'judge' },
				roots: fixture.packages.map((captured) => captured.target),
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

	it('loads an authored declaration, its rubric and the scenarios of its driver in declared order', async () => {
		const capacity = await loadStudyDeclaration('capacity', 'memory')
		expect(capacity.definition.name).toBe('capacity')
		expect(capacity.definition.arms).toEqual(['records', 'compaction', 'full'])
		expect(capacity.scenarios.map((scenario) => scenario.id)).toEqual(['handoff'])
		expect(capacity.rubric.criteria[0]?.id).toBe('opening-operational')
		const tools = await loadStudyDeclaration('tools', 'tools')
		expect(tools.definition.name).toBe('tools')
		expect(tools.scenarios.map((scenario) => scenario.id)).toEqual([
			'write',
			'refusal',
			'admission',
			'cancellation',
			'continuation',
		])
		await expect(loadStudyDeclaration('absent', 'memory')).rejects.toThrow(/ENOENT/)
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
		const [failure] = readMemoryEvents(result.evidence, 'wire-failure')
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
		expect(STUDY_MEMORY_OBSERVED_EVENTS).toEqual(['context', 'estimate', 'refusal'])
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
		for (const event of ['dispatch', 'wire', 'wire-failure'] as const) {
			expect(STUDY_MEMORY_OBSERVED_KEYS[event]).toEqual(
				expect.arrayContaining(['canonical', 'revision']),
			)
			expect([...STUDY_MEMORY_OBSERVED_KEYS[event]].sort()).toEqual([
				...STUDY_MEMORY_OBSERVED_KEYS[event],
			])
		}
		const message = { content: 2, framing: 4, calls: 0, thinking: 1, images: 512 }
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
		expect(shapes.map((shape) => shape.options)).toEqual([
			['num_ctx', 'num_predict', 'seed', 'temperature'],
		])
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

	it('loads actual tools declarations', async () => {
		const fixture = await loadStudyToolsFixture()
		expect(fixture.manifest.definition.driver).toBe('tools')
		expect(fixture.subject).toHaveProperty('Agent')
	})
})
