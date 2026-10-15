import { isArray, isRecord, parseJSON } from '@orkestrel/contract'
import {
	isStudyJudgment,
	parseStudyGrading,
	parseStudyProfile,
	parseStudyRubric,
	readStudyFailure,
	StudyError,
} from '@orkestrel/study'
import { readStudyResult } from '@orkestrel/study/server'
import { createScratch, destroyScratch } from '@orkestrel/test/server'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { readFileSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'
import { StudyMemoryDriver } from '../../../studies/memory/index.js'
import {
	buildMemoryCall,
	buildMemoryProfile,
	buildMemoryReply,
	createMemoryContext,
	createMemoryServer,
	createStudyServiceFixture,
	executeStudyService,
	executeStudyTopology,
	readMemoryControls,
	readMemoryEvents,
	readStudyToolsEvidence,
	runMemoryFailure,
	runMemorySummary,
	runMemoryTrial,
	STUDY_MEMORY_ACTUAL_REFUSALS,
	STUDY_MEMORY_CONTINUATION_MISSES,
	STUDY_MEMORY_FIXED_PROJECTION,
	STUDY_MEMORY_FIXED_SETTINGS,
	STUDY_MEMORY_GOALS,
	STUDY_MEMORY_MODULES,
	STUDY_MEMORY_NATIVE_CAPACITY,
	STUDY_MEMORY_NATIVE_GENERIC,
	STUDY_MEMORY_NATIVE_MALFORMED,
	STUDY_MEMORY_NATIVE_TRIALS,
	STUDY_MEMORY_PASSIVE_SETTINGS,
	STUDY_MEMORY_SCHEDULE,
	STUDY_MEMORY_SUMMARY_FOLDS,
	STUDY_MEMORY_SUMMARY_MISSES,
	WINDOW_GOAL,
} from '../../setupStudy.js'

it('loads the actual q4 native topology with two distinct captured Agent occurrences', async () => {
	const scratch = createScratch({ prefix: 'study-memory-topology-' })
	try {
		const result = await executeStudyTopology(scratch)
		const rows = result.stdout
			.split(/\r\n|\n/)
			.filter((line) => line !== '')
			.map(parseJSON)
		const selection = rows.find((row) => isRecord(row) && row.event === 'selection')
		if (!isRecord(selection) || !isArray(selection.identities))
			throw new Error('Missing actual native selection evidence')
		const profile = parseStudyProfile(
			parseJSON(readFileSync('studies/memory/profiles/q4.json', 'utf8')),
		)
		const subject = realpathSync('dist/src/core/index.js')
		const dependency = realpathSync('node_modules/@orkestrel/agent/dist/src/core/index.js')
		const provider = realpathSync('node_modules/@orkestrel/ollama/dist/src/core/index.js')
		expect(profile.subject).toBe('dist/src/core/index.js')
		expect(selection).toMatchObject({
			roots: profile.roots.map((root) => realpathSync(root)),
			entries: [subject, provider, dependency],
			subject,
			provider,
			dependency,
			identities: [subject, dependency, provider].map((path) => ({
				path,
				digest: createHash('sha256').update(readFileSync(path)).digest('hex'),
			})),
		})
		expect(dependency).not.toBe(subject)
		expect(result).toMatchObject({ code: 0, stderr: '' })
		const inventory = rows.find((row) => isRecord(row) && row.event === 'inventory')
		if (!isRecord(inventory) || !isArray(inventory.packages) || !isArray(inventory.files))
			throw new Error('Missing captured native inventory')
		expect(inventory.entries).toEqual([subject, provider, dependency].sort())
		expect(
			inventory.packages.filter((entry) => isRecord(entry) && entry.name === '@orkestrel/agent'),
		).toEqual(
			[resolve('.'), resolve('node_modules/@orkestrel/agent')]
				.map((root) => realpathSync(root))
				.sort()
				.map((root) => {
					const manifest = parseJSON(readFileSync(join(root, 'package.json'), 'utf8'))
					if (!isRecord(manifest)) throw new Error('Invalid actual Agent manifest')
					return { root: realpathSync(root), name: '@orkestrel/agent', version: manifest.version }
				}),
		)
		for (const identity of selection.identities) {
			if (!isRecord(identity) || typeof identity.path !== 'string')
				throw new Error('Invalid entry identity')
			expect(inventory.files).toContainEqual({
				path: identity.path,
				digest: identity.digest,
				size: readFileSync(identity.path).length,
			})
		}
		expect(rows.find((row) => isRecord(row) && row.event === 'loaded')).toEqual({
			event: 'loaded',
			subject: { agent: true, ledger: true },
			provider: { installed: true, selected: false },
			judge: { installed: true, selected: false },
		})
	} finally {
		await destroyScratch(scratch)
	}
})

it('refuses a repeated canonical root in a fresh q4 native topology worker', async () => {
	const scratch = createScratch({ prefix: 'study-memory-repeated-root-' })
	try {
		const profile = parseStudyProfile(
			parseJSON(readFileSync('studies/memory/profiles/q4.json', 'utf8')),
		)
		const roots = profile.roots.filter((root) => root !== 'node_modules/@orkestrel/agent')
		const result = await executeStudyTopology(scratch, [...roots, realpathSync('.')])
		expect(result.code).toBe(1)
		expect(result.stderr).toContain('Artifact package identity is duplicated: @orkestrel/agent')
		expect(result.stdout).toContain('"event":"selection"')
		expect(result.stdout).not.toContain('"event":"inventory"')
	} finally {
		await destroyScratch(scratch)
	}
})

it('refuses Ollama import when its installed Agent root is omitted in a fresh q4 native topology worker', async () => {
	const scratch = createScratch({ prefix: 'study-memory-omitted-root-' })
	try {
		const profile = parseStudyProfile(
			parseJSON(readFileSync('studies/memory/profiles/q4.json', 'utf8')),
		)
		const result = await executeStudyTopology(
			scratch,
			profile.roots.filter((root) => root !== 'node_modules/@orkestrel/agent'),
		)
		expect(result.code).toBe(1)
		expect(result.stderr).toContain('Artifact dependency is not admitted ESM:')
		expect(result.stderr).toContain('node_modules/@orkestrel/agent/dist/src/core/index.js')
		const rows = result.stdout
			.split(/\r\n|\n/)
			.filter((line) => line !== '')
			.map(parseJSON)
		const inventory = rows.find((row) => isRecord(row) && row.event === 'inventory')
		if (!isRecord(inventory) || !isArray(inventory.files))
			throw new Error('Missing omitted-root inventory')
		expect(
			inventory.files.some(
				(entry) =>
					isRecord(entry) &&
					entry.path === realpathSync('node_modules/@orkestrel/agent/dist/src/core/index.js'),
			),
		).toBe(false)
		expect(rows).toContainEqual({ event: 'subject', loaded: true })
		expect(rows.some((row) => isRecord(row) && row.event === 'loaded')).toBe(false)
	} finally {
		await destroyScratch(scratch)
	}
})

it('drives captured installed Agent and Ollama through qualification, complete execution, grading and reports', async () => {
	const scratch = createScratch({ prefix: 'study-memory-installed-' })
	let server: Awaited<ReturnType<typeof createMemoryServer>> | undefined
	try {
		server = await createMemoryServer()
		const fixture = createStudyServiceFixture(scratch, server.url)
		const checked = await executeStudyService(fixture, ['check', 'capacity'])
		expect(checked).toMatchObject({ code: 0 })
		const capacity = parseJSON(checked.stdout)
		if (!isRecord(capacity)) throw new Error('Missing native check output')
		expect(capacity).toMatchObject({ command: 'check', study: 'capacity', purpose: 'capacity' })
		expect(capacity.next).toEqual([
			'execute',
			'capacity',
			'--profile',
			'local',
			'--expected',
			capacity.fingerprint,
		])
		expect(server.requests).toEqual([])
		const denied = await executeStudyService(
			fixture,
			['execute', 'memory', '--out', join(scratch.path, 'unqualified')],
			260000,
		)
		expect(denied.code).not.toBe(0)
		expect(denied.stderr).toMatch(/qualification|memory-capacity|seal|missing|ENOENT/i)
		expect(server.requests).toEqual([])
		expect(scratch.has('unqualified')).toBe(false)
		let qualification: string | undefined
		for (const target of ['capacity', 'memory']) {
			const beforeCheck = server.requests.length
			const check = await executeStudyService(fixture, ['check', target])
			expect(check).toMatchObject({ code: 0 })
			expect(server.requests.length).toBe(beforeCheck)
			const selection = parseJSON(check.stdout)
			if (
				!isRecord(selection) ||
				!isArray(selection.next) ||
				!selection.next.every((token): token is string => typeof token === 'string')
			)
				throw new Error('Missing exact execution next arguments')
			expect(selection.next).toEqual([
				'execute',
				target,
				'--profile',
				'local',
				'--expected',
				selection.fingerprint,
			])
			const calls = server.requests.length
			const output = join(
				scratch.path,
				'tmp',
				'studies',
				target === 'capacity' ? 'memory-capacity' : 'memory-quality',
			)
			const executed = await executeStudyService(
				fixture,
				[...selection.next, '--out', output],
				260000,
			)
			expect(executed).toMatchObject({ code: 0 })
			const execution = parseJSON(executed.stdout)
			if (
				!isRecord(execution) ||
				typeof execution.path !== 'string' ||
				!isArray(execution.next) ||
				!execution.next.every((token): token is string => typeof token === 'string')
			)
				throw new Error('Missing native execution and independent grade arguments')
			expect(execution).toMatchObject({
				command: 'execute',
				status: 'completed',
				path: output,
				fingerprint: selection.fingerprint,
			})
			expect(execution.next).toEqual([
				'grade',
				output,
				'--rubric',
				join(scratch.path, 'studies', target, 'rubric.json'),
			])
			expect(server.requests.length).toBeGreaterThan(calls)
			const result = await readStudyResult(execution.path)
			if (result.status !== 'sealed') throw new Error('Actual native execution did not seal')
			expect(result.seal.id).toBe(execution.seal)
			expect(result.manifest.schedule.map((trial) => [trial.arm, trial.repetition])).toEqual(
				STUDY_MEMORY_SCHEDULE,
			)
			expect(result.attempts.map((attempt) => attempt.trial)).toEqual(result.manifest.schedule)
			expect(result.manifest.qualification).toBe(qualification)
			if (target === 'capacity') qualification = result.seal.id
			for (const attempt of result.attempts) {
				expect(attempt.failure).toBeUndefined()
				expect(attempt.observations.map((observation) => observation.goal)).toEqual(
					STUDY_MEMORY_GOALS,
				)
				for (const observation of attempt.observations) {
					expect(observation.failure).toBeUndefined()
					expect(observation.product).toBeDefined()
					expect(observation.product?.value).toMatchObject({ content: 'Receipt retained.' })
					expect(observation.usage.some((charge) => charge.role === 'agent')).toBe(true)
				}
				const evidence = await readStudyToolsEvidence(output, attempt.trial.id)
				expect(evidence.some((row) => row.event === 'arrival')).toBe(true)
				expect(evidence.some((row) => row.event === 'dispatch')).toBe(true)
				expect(evidence.some((row) => row.event === 'wire')).toBe(true)
			}
			const beforeGrade = server.requests.length
			const graded = await executeStudyService(fixture, execution.next)
			expect(graded).toMatchObject({ code: 0 })
			const grade = parseJSON(graded.stdout)
			if (
				!isRecord(grade) ||
				typeof grade.grading !== 'string' ||
				!isArray(grade.next) ||
				!grade.next.every((token): token is string => typeof token === 'string')
			)
				throw new Error('Missing immutable grading and report arguments')
			expect(grade.next).toEqual(['report', output, '--grading', grade.grading])
			const grading = parseStudyGrading(
				parseJSON(await readFile(join(output, 'grades', grade.grading, 'grading.json'), 'utf8')),
			)
			const rubric = parseStudyRubric(
				parseJSON(scratch.read(`studies/${target}/rubric.json`) ?? ''),
			)
			const denominator = result.manifest.schedule.flatMap((trial) =>
				rubric.criteria
					.filter((criterion) => criterion.scenario === trial.scenario)
					.map((criterion) => `${trial.id}/${criterion.id}`),
			)
			expect(grading.attempts).toEqual(result.manifest.schedule.map((trial) => trial.id))
			expect(
				grading.judgments.map((judgment) => `${judgment.trial}/${judgment.criterion}`),
			).toEqual(denominator)
			expect(grading.judgments.every(isStudyJudgment)).toBe(true)
			const semantic = grading.judgments.filter(
				(judgment) =>
					rubric.criteria.find((entry) => entry.id === judgment.criterion)?.method === 'semantic',
			)
			expect(
				semantic.map((judgment) => ({
					verdict: judgment.verdict,
					method: judgment.method,
					references: judgment.references,
				})),
			).toEqual(semantic.map(() => ({ verdict: 'unknown', method: 'human', references: [] })))
			const mechanical = grading.judgments.filter(
				(judgment) =>
					rubric.criteria.find((entry) => entry.id === judgment.criterion)?.method !== 'semantic',
			)
			expect(mechanical.length).toBeGreaterThan(0)
			for (const judgment of mechanical) {
				const criterion = rubric.criteria.find((entry) => entry.id === judgment.criterion)
				expect(judgment.verdict).not.toBe('unknown')
				expect(judgment.references.length).toBeGreaterThan(0)
				expect(judgment.references.map((reference) => reference.split('#')[0])).toEqual(
					criterion?.method === 'state'
						? [`trials/${judgment.trial}/attempt.json`]
						: judgment.verdict === 'unsuccessful'
							? [`trials/${judgment.trial}/attempt.json`, `trials/${judgment.trial}/evidence.jsonl`]
							: [`trials/${judgment.trial}/evidence.jsonl`],
				)
				for (const reference of judgment.references) {
					const [file, row] = reference.split('#')
					if (file === undefined) throw new Error('Missing judgment evidence file')
					expect(
						scratch.has(
							join(
								'tmp',
								'studies',
								target === 'capacity' ? 'memory-capacity' : 'memory-quality',
								'execution',
								file,
							),
						),
					).toBe(true)
					const evidence = await readStudyToolsEvidence(output, judgment.trial)
					const retained = evidence[Number(row) - 1]
					expect(
						criterion?.method !== 'trace' || judgment.verdict !== 'achieved' || row !== undefined,
					).toBe(true)
					expect(
						row === undefined ||
							(Number.isSafeInteger(Number(row)) &&
								Number(row) > 0 &&
								retained?.goal === criterion?.goal &&
								isRecord(criterion?.assertion) &&
								retained?.event === criterion.assertion.observation),
					).toBe(true)
				}
			}
			const reported = await executeStudyService(fixture, grade.next)
			expect(reported).toMatchObject({ code: 0 })
			const report = parseJSON(reported.stdout)
			if (!isRecord(report) || !isRecord(report.report) || !isArray(report.report.scores))
				throw new Error('Missing whole-horizon report')
			expect(report).toMatchObject({
				command: 'report',
				grading: grade.grading,
				labeling: { status: 'absent' },
			})
			expect(report.report.operations).toMatchObject({
				trials: { scheduled: 6, terminal: 6 },
				goals: { scheduled: 18, products: 18 },
			})
			expect(
				report.report.scores.reduce<number>((total, score) => {
					if (!isRecord(score) || typeof score.total !== 'number')
						throw new Error('Missing scheduled score denominator')
					return total + score.total
				}, 0),
			).toBe(denominator.length)
			expect(semantic.length).toBeGreaterThanOrEqual(target === 'memory' ? 1 : 0)
			expect(server.requests.length).toBe(beforeGrade)
		}
		expect(server.requests.some((request) => request.path === '/api/chat')).toBe(true)
		expect(server.requests.some((request) => request.path === '/api/generate')).toBe(true)
	} finally {
		try {
			await server?.close()
		} finally {
			await destroyScratch(scratch)
		}
	}
}, 540000)

it.each(STUDY_MEMORY_SUMMARY_MISSES)(
	'completes a summary whose actual prompt is $name and feeds the recap to the next agent request',
	async ({ folded, prompt }) => {
		const result = await runMemorySummary(
			folded,
			400,
			[{ path: '/api/chat', body: buildMemoryReply({ content: 'Recap kept', prompt }) }],
			true,
		)
		expect(result.failure).toBeUndefined()
		expect(result.products).toHaveLength(1)
		const chats = result.requests.filter((request) => request.path === '/api/chat')
		expect(chats).toHaveLength(2)
		expect(chats[0]?.body).not.toContain('Recap kept')
		expect(chats[1]?.body).toContain('Recap kept')
		const forecast = readMemoryEvents(result.evidence, 'context').find(
			(value) => value.role === 'summary',
		)
		// The actual count is above the forecast it is retained beside, and the goal still completes.
		expect(Number(forecast?.projected)).toBeLessThan(prompt)
		expect(
			readMemoryEvents(result.evidence, 'wire').find((value) => value.role === 'summary'),
		).toMatchObject({ prompt })
		expect(readMemoryEvents(result.evidence, 'refusal')).toEqual([])
	},
)

it.each(STUDY_MEMORY_CONTINUATION_MISSES)(
	'continues the tool turn for $name and retains the forecast beside the actual count',
	async ({ prompt }) => {
		const result = await runMemoryTrial({
			arm: 'compaction',
			responses: [
				{ path: '/api/chat', body: buildMemoryCall({ prompt }) },
				{ path: '/api/chat', body: buildMemoryReply({ content: 'Follow-up received' }) },
			],
			goals: [WINDOW_GOAL],
			settings: { ...STUDY_MEMORY_FIXED_SETTINGS, observe: true },
		})
		expect(result.failure).toBeUndefined()
		expect(result.products).toEqual([{ value: { content: 'Follow-up received' }, partial: false }])
		expect(result.requests.filter((request) => request.path === '/api/chat')).toHaveLength(2)
		expect(readMemoryEvents(result.evidence, 'lookup')).toHaveLength(1)
		expect(readMemoryEvents(result.evidence, 'estimate').map((value) => value.projected)).toEqual([
			STUDY_MEMORY_FIXED_PROJECTION,
			STUDY_MEMORY_FIXED_PROJECTION,
		])
		expect(
			readMemoryEvents(result.evidence, 'wire')
				.filter((value) => value.role === 'agent')
				.map((value) => value.prompt),
		).toEqual([prompt, 10])
	},
)

it.each(STUDY_MEMORY_ACTUAL_REFUSALS)(
	'stops before the next request, tool and goal on $name',
	async ({ settings, room, goal, body, message, role }) => {
		const server = await createMemoryServer([
			{ path: '/api/chat', body },
			{ path: '/api/chat', body: buildMemoryReply({ content: 'Never reached' }) },
		])
		const profile = buildMemoryProfile({ url: server.url, room, settings })
		const fixture = createMemoryContext(profile)
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'stop', scenario: 'public', arm: 'compaction', repetition: 0 },
			fixture.context.signal,
		)
		try {
			if (goal === undefined) throw new Error('Missing goal fixture')
			await expect(session.execute(goal, fixture.context)).rejects.toBeDefined()
			const sent = server.requests.length
			// The first failure is latched, so the next goal rethrows the very error the wire raised.
			const latched = await session
				.execute(
					{ id: 'next', input: { prompt: 'Continue', arrivals: [], records: [] } },
					fixture.context,
				)
				.then(
					() => undefined,
					(error: unknown) => error,
				)
			expect(latched).toMatchObject({ code: 'CAPACITY', message: expect.stringContaining(message) })
			// A returned actual-capacity failure stays attributable to the role that sent the request.
			expect(readStudyFailure(latched)).toMatchObject({ cause: 'capacity', role })
			expect(server.requests).toHaveLength(sent)
			expect(server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(1)
			expect(server.responses).toHaveLength(1)
			expect(readMemoryEvents(fixture.evidence, 'lookup')).toEqual([])
			expect(
				readMemoryEvents(fixture.evidence, 'wire').filter(
					(value) => value.role === 'agent' || value.role === 'summary',
				),
			).toHaveLength(1)
		} finally {
			await session.close()
			fixture.close()
			await server.close()
		}
	},
)

it('sends false truncate and shift controls only for Compaction chat requests and marks only their dispatch evidence', async () => {
	const compaction = await runMemorySummary(STUDY_MEMORY_SUMMARY_FOLDS.below, 400, [], true)
	expect(compaction.failure).toBeUndefined()
	expect(readMemoryControls(compaction.requests)).toEqual([
		{ truncate: false, shift: false },
		{ truncate: false, shift: false },
	])
	const dispatches = readMemoryEvents(compaction.evidence, 'dispatch')
	const models = dispatches.filter((value) => value.role === 'agent' || value.role === 'summary')
	expect(models.map((value) => value.role)).toEqual(['summary', 'agent'])
	expect(models.map((value) => value.strict)).toEqual([true, true])
	const metadata = dispatches.filter((value) => value.role === 'metadata')
	expect(metadata.length).toBeGreaterThan(0)
	expect(metadata.some((value) => 'strict' in value)).toBe(false)
	for (const arm of ['full', 'records'] as const) {
		const result = await runMemoryTrial({
			arm,
			responses: [],
			goals: [WINDOW_GOAL],
			settings: STUDY_MEMORY_PASSIVE_SETTINGS,
		})
		expect(result.failure).toBeUndefined()
		const controls = readMemoryControls(result.requests)
		expect(controls.length).toBeGreaterThan(0)
		expect(controls).toEqual(controls.map(() => ({ truncate: undefined, shift: undefined })))
		expect(readMemoryEvents(result.evidence, 'dispatch').some((value) => 'strict' in value)).toBe(
			false,
		)
	}
})

it.each([...STUDY_MEMORY_NATIVE_CAPACITY, ...STUDY_MEMORY_NATIVE_GENERIC])(
	'fails $name once as $code with the role, status and bytes retained and sends no later request',
	async ({ role, trial, status, body, code, message }) => {
		const result = await runMemoryFailure({
			...trial,
			responses: [
				{ path: '/api/chat', status, body },
				{ path: '/api/chat', body: buildMemoryReply({ content: 'Never reached' }) },
			],
		})
		// The failure surfaces: no goal completes, and the latched fault carries the daemon's own words.
		expect(result.first).toBeDefined()
		expect(result.products).toEqual([])
		expect(result.latched).toBeInstanceOf(StudyError)
		expect(result.latched).toMatchObject({ code, message: expect.stringContaining(message) })
		expect(readStudyFailure(result.latched)).toMatchObject({
			cause: code === 'CAPACITY' ? 'capacity' : 'infrastructure',
			role,
		})
		// Exactly one chat request was sent, none after the failure, and the second queued reply was never served.
		expect(result.requests.filter((request) => request.path === '/api/chat')).toHaveLength(1)
		expect(result.requests).toHaveLength(result.sent)
		expect(result.queued).toBe(1)
		// One failed ticket with unknown usage, never a successful wire row.
		expect(result.usage.filter((row) => row.role === role)).toEqual([
			{ role, calls: 1, tokens: undefined, bytes: undefined },
		])
		expect(
			readMemoryEvents(result.evidence, 'wire').filter((value) => value.role === role),
		).toEqual([])
		// One failure row keeps the status, a bounded reason and every byte read, request included.
		const failures = readMemoryEvents(result.evidence, 'wire-failure')
		expect(failures).toHaveLength(1)
		const dispatch = readMemoryEvents(result.evidence, 'dispatch').find(
			(value) => value.role === role,
		)
		expect(failures[0]).toMatchObject({ role, path: '/api/chat', status })
		expect(String(failures[0]?.reason)).toContain(message)
		expect(String(failures[0]?.reason).length).toBeLessThanOrEqual(256)
		expect(failures[0]?.bytes).toBe(
			Number(dispatch?.bytes) + new TextEncoder().encode(body).byteLength,
		)
	},
)

it.each(STUDY_MEMORY_NATIVE_MALFORMED)(
	'fails $name once as $code with the role retained, usage unknown and no later request',
	async ({ role, trial, status, body, code, message }) => {
		const result = await runMemoryFailure({
			...trial,
			responses: [
				{ path: '/api/chat', status, body },
				{ path: '/api/chat', body: buildMemoryReply({ content: 'Never reached' }) },
			],
		})
		expect(result.first).toBeDefined()
		expect(result.products).toEqual([])
		expect(result.latched).toBeInstanceOf(StudyError)
		expect(result.latched).toMatchObject({ code, message: expect.stringContaining(message) })
		expect(readStudyFailure(result.latched)).toMatchObject({ cause: 'infrastructure', role })
		expect(result.requests.filter((request) => request.path === '/api/chat')).toHaveLength(1)
		expect(result.requests).toHaveLength(result.sent)
		expect(result.queued).toBe(1)
		expect(result.usage.filter((row) => row.role === role)).toMatchObject([
			{ role, calls: 1, tokens: undefined },
		])
	},
)

it('stops buffering a non-2xx body at the response byte allowance and fails capacity without a later request', async () => {
	const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
	const allowance = profile.bounds.request.bytes
	const result = await runMemoryFailure({
		...STUDY_MEMORY_NATIVE_TRIALS.agent,
		responses: [
			{ path: '/api/chat', status: 500, body: 'x'.repeat(allowance + 1) },
			{ path: '/api/chat', body: buildMemoryReply({ content: 'Never reached' }) },
		],
	})
	expect(result.latched).toMatchObject({
		code: 'CAPACITY',
		message: expect.stringContaining('byte allowance'),
	})
	expect(readStudyFailure(result.latched)).toMatchObject({ cause: 'capacity', role: 'agent' })
	expect(result.requests.filter((request) => request.path === '/api/chat')).toHaveLength(1)
	expect(result.queued).toBe(1)
	const [failure] = readMemoryEvents(result.evidence, 'wire-failure')
	expect(failure).toMatchObject({ role: 'agent', status: 500 })
	expect(Number(failure?.bytes)).toBeGreaterThan(allowance)
})
