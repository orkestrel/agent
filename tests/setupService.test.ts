import { isRecord, parseJSON } from '@orkestrel/contract'
import { createScratch, destroyScratch } from '@orkestrel/test/server'
import { lstatSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isStudyMemorySettings } from '../studies/memory/index.js'
import {
	buildMemoryEdge,
	buildMemoryObservationGoals,
	buildMemoryObservationResponses,
	buildMemoryProfile,
	buildMemoryReply,
	buildMemoryStream,
	createMemoryContext,
	createMemoryObserver,
	createMemoryServer,
	listMemoryKeys,
	loadStudyToolsFixture,
	readMemoryAdmission,
	readMemoryEvents,
	readMemoryModels,
	readMemoryShapes,
	readMemorySnapshot,
	readMemoryStream,
	readMemoryTimeline,
	readStudyToolsEvidence,
	captureServicePackages,
	createStudyServiceFixture,
	executeStudyService,
	executeStudyProcess,
	executeStudyTopology,
	readMemoryToolResults,
	runMemoryTrial,
	totalMemoryUsage,
	STUDY_MEMORY_DISABLED_SETTINGS,
	STUDY_MEMORY_FIXED_PROJECTION,
	STUDY_MEMORY_FIXED_SETTINGS,
	STUDY_MEMORY_MALFORMED_SETTINGS,
	STUDY_MEMORY_OBSERVER_REQUEST,
	STUDY_MEMORY_PROJECTION_CASES,
	STUDY_MEMORY_SETTINGS,
	STUDY_MEMORY_TIMING,
} from './setupService.js'

describe('study service fixtures', () => {
	it('preserves fresh topology worker diagnostics and runs bounded native entries', async () => {
		const scratch = createScratch({ prefix: 'study-topology-setup-' })
		try {
			const entry = scratch.write(
				'receipt.mjs',
				"console.log(process.argv[2])\nconsole.error('retained diagnostic')\nprocess.exitCode = 7\n",
			)
			expect(await executeStudyProcess([entry, 'retained output'], scratch.path, 60000)).toEqual({
				code: 7,
				stdout: 'retained output\n',
				stderr: 'retained diagnostic\n',
			})
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
			const fixture = createStudyServiceFixture(scratch, 'http://127.0.0.1:7')
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
			expect(parseJSON(scratch.read('studies/memory/profiles/local.json') ?? '')).toMatchObject({
				qualification: 'tmp/studies/memory-capacity',
				settings: { gauge: { scale: 1, overhead: 0 } },
				provider: { url: 'http://127.0.0.1:7', model: 'model', judge: 'judge' },
				roots: fixture.packages.map((entry) => entry.target),
			})
			const help = await executeStudyService(fixture, ['--help'])
			expect(help).toMatchObject({ code: 0 })
			expect(help.stdout).toContain('study execute')
			const refused = await executeStudyService(fixture, ['unsupported'])
			expect(refused.code).toBe(64)
			expect(refused.stderr).not.toBe('')
			expect(() =>
				captureServicePackages(scratch, new Map([['wrong-package', resolve('.')]])),
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

	it('pins observation fixtures that are consistent with the settings guard and the fixed projection', () => {
		for (const entry of STUDY_MEMORY_DISABLED_SETTINGS)
			expect([entry.name, isStudyMemorySettings(entry.settings ?? {})]).toEqual([entry.name, true])
		expect(STUDY_MEMORY_DISABLED_SETTINGS.map((entry) => entry.name)).toEqual(['absent', 'false'])
		for (const entry of STUDY_MEMORY_MALFORMED_SETTINGS)
			expect([entry.name, isStudyMemorySettings(entry.settings)]).toEqual([entry.name, false])
		expect(STUDY_MEMORY_MALFORMED_SETTINGS).toHaveLength(4)
		for (const estimate of [1, 1000, 1e6])
			expect(
				Math.ceil(
					STUDY_MEMORY_FIXED_SETTINGS.gauge.overhead +
						STUDY_MEMORY_FIXED_SETTINGS.gauge.scale * estimate,
				),
			).toBe(STUDY_MEMORY_FIXED_PROJECTION)
		const [equal, over, unknown, zero] = STUDY_MEMORY_PROJECTION_CASES
		expect(equal?.reply).toEqual({ prompt: STUDY_MEMORY_FIXED_PROJECTION })
		expect(over?.reply).toEqual({ prompt: STUDY_MEMORY_FIXED_PROJECTION + 1 })
		expect([equal?.code, over?.code, unknown?.code, zero?.code]).toEqual([
			undefined,
			'CAPACITY',
			'FAULT',
			'FAULT',
		])
		const { messages, tools, options } = STUDY_MEMORY_OBSERVER_REQUEST
		expect(messages.map((message) => message.role)).toEqual(['user'])
		expect(tools.map((tool) => tool.name)).toEqual(['lookup'])
		expect(options).toEqual({ think: false })
		expect(Object.isFrozen(messages) && Object.isFrozen(tools) && Object.isFrozen(options)).toBe(true)
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

	it('builds streamed rows and drains a real stream keeping deltas and result', async () => {
		const body = buildMemoryStream(['A', 'B'], { prompt: 9, completion: 4 })
		const lines = body.split('\n').filter((line) => line !== '')
		expect(lines).toHaveLength(3)
		expect(lines.map((line) => (isRecord(parseJSON(line)) ? parseJSON(line) : undefined))).toMatchObject([
			{ done: false, message: { content: 'A' } },
			{ done: false, message: { content: 'B' } },
			{ done: true, prompt_eval_count: 9, eval_count: 4 },
		])
		const server = await createMemoryServer([{ path: '/api/chat', body }])
		try {
			const { inner } = createMemoryObserver(server.url, undefined)
			const { messages } = STUDY_MEMORY_OBSERVER_REQUEST
			const { deltas, result } = await readMemoryStream(
				inner.stream(messages, new AbortController().signal),
			)
			expect(deltas).toEqual([
				{ channel: 'content', text: 'A' },
				{ channel: 'content', text: 'B' },
			])
			expect(result).toMatchObject({ content: 'AB', usage: { prompt: 9, completion: 4 } })
		} finally {
			await server.close()
		}
	})

	it('creates an observer over the real provider that records readings and carries the gauge', async () => {
		const server = await createMemoryServer()
		try {
			const plain = createMemoryObserver(server.url, undefined)
			const gauged = createMemoryObserver(server.url, { scale: 1, overhead: 100 })
			const { messages } = STUDY_MEMORY_OBSERVER_REQUEST
			expect(plain.readings).toEqual([])
			await plain.observer.generate(messages, new AbortController().signal)
			await gauged.observer.generate(messages, new AbortController().signal)
			expect(plain.readings).toHaveLength(1)
			expect(plain.readings[0]?.projected).toBeUndefined()
			expect(gauged.readings[0]?.estimate).toBe(plain.readings[0]?.estimate)
			expect(gauged.readings[0]?.projected).toBe(Math.ceil((gauged.readings[0]?.estimate ?? 0) + 100))
			expect(plain.observer.id).toBe(plain.inner.id)
		} finally {
			await server.close()
		}
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

	it('loads actual tools declarations and refuses malformed retained evidence', async () => {
		const fixture = await loadStudyToolsFixture()
		expect(fixture.manifest.definition.driver).toBe('tools')
		expect(fixture.subject).toHaveProperty('Agent')
		const scratch = createScratch()
		try {
			scratch.write(
				'execution/trials/first/evidence.jsonl',
				'{"event":"saved","goal":"write","value":7}\n',
			)
			expect(await readStudyToolsEvidence(scratch.path, 'first')).toEqual([
				{ event: 'saved', goal: 'write', value: 7 },
			])
			scratch.write('execution/trials/first/evidence.jsonl', '{"event":1}\n')
			await expect(readStudyToolsEvidence(scratch.path, 'first')).rejects.toThrow(
				'invalid evidence',
			)
		} finally {
			scratch.destroy()
		}
	})
})
