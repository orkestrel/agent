import { isArray, isRecord, parseJSON } from '@orkestrel/contract'
import {
	isStudyJudgment,
	parseStudyAssessment,
	parseStudyProfile,
	parseStudyRubric,
	isStudyError,
	readStudyFailure,
} from '@orkestrel/study'
import { collectStudyEvidence, readStudyResult } from '@orkestrel/study/server'
import { createScratch, destroyScratch } from '@orkestrel/test/server'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { readFileSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'
import { StudyMemoryDriver } from '../../../studies/memory/index.js'
import {
	buildMemoryProfile,
	buildMemoryReply,
	compareMemorySeed,
	createMemoryContext,
	createMemoryServer,
	createStudyInstallFixture,
	executeMemorySeedChain,
	executeMemorySegment,
	executeStudyInstall,
	executeStudyTopology,
	readMemoryControls,
	readMemoryEvents,
	readMemoryJudgeStates,
	readMemoryProgressReadings,
	readStudyInstallTrial,
	runMemoryFailure,
	runMemorySummary,
	runMemoryTrial,
	writeStudyInstallRecording,
	STUDY_MEMORY_ACTUAL_REFUSALS,
	STUDY_MEMORY_GOALS,
	STUDY_MEMORY_MODULES,
	STUDY_MEMORY_NATIVE_MALFORMED,
	STUDY_MEMORY_PASSIVE_SETTINGS,
	STUDY_MEMORY_SCHEDULE,
	STUDY_MEMORY_SUMMARY_FOLDS,
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
		expect(profile.agent).toBe('dist/src/core/index.js')
		expect(profile.subject).toBe(profile.agent)
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
	try {
		const server = await createMemoryServer()
		try {
			const fixture = createStudyInstallFixture(scratch, server.url)
			const checked = await executeStudyInstall(fixture, ['check', 'capacity'])
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
			const denied = await executeStudyInstall(
				fixture,
				['execute', 'memory', '--out', join(scratch.path, 'unqualified')],
				260000,
			)
			expect(denied.code).not.toBe(0)
			expect(denied.stderr).toMatch(/qualification|memory-capacity|seal|missing|ENOENT/i)
			expect(server.requests).toEqual([])
			expect(scratch.has('unqualified')).toBe(false)
			// Every target's seal id, appended once that target seals; the memory target is qualified by the capacity one.
			const sealed: Array<{ readonly target: string; readonly seal: string }> = []
			for (const target of ['capacity', 'memory']) {
				const beforeCheck = server.requests.length
				const check = await executeStudyInstall(fixture, ['check', target])
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
				const executed = await executeStudyInstall(
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
				expect(result.manifest.qualification).toBe(
					sealed.find((one) => one.target === 'capacity')?.seal,
				)
				sealed.push({ target, seal: result.seal.id })
				const retained = await collectStudyEvidence(result)
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
					const evidence = retained[attempt.trial.id]
					if (evidence === undefined) throw new Error('Missing retained trial evidence')
					expect(evidence.some((row) => row.event === 'arrival')).toBe(true)
					expect(evidence.some((row) => row.event === 'dispatch')).toBe(true)
					expect(evidence.some((row) => row.event === 'wire')).toBe(true)
				}
				const beforeGrade = server.requests.length
				const graded = await executeStudyInstall(fixture, execution.next)
				expect(graded).toMatchObject({ code: 0 })
				const grade = parseJSON(graded.stdout)
				if (
					!isRecord(grade) ||
					typeof grade.assessment !== 'string' ||
					!isArray(grade.next) ||
					!grade.next.every((token): token is string => typeof token === 'string')
				)
					throw new Error('Missing immutable assessment and report arguments')
				expect(grade.next).toEqual(['report', output, '--assessment', grade.assessment])
				const assessment = parseStudyAssessment(
					parseJSON(
						await readFile(join(output, 'grades', grade.assessment, 'grading.json'), 'utf8'),
					),
				)
				const rubric = parseStudyRubric(
					parseJSON(scratch.read(`studies/${target}/rubric.json`) ?? ''),
				)
				const denominator = result.manifest.schedule.flatMap((trial) =>
					rubric.criteria
						.filter((criterion) => criterion.scenario === trial.scenario)
						.map((criterion) => `${trial.id}/${criterion.id}`),
				)
				expect(assessment.attempts).toEqual(result.manifest.schedule.map((trial) => trial.id))
				expect(
					assessment.judgments.map((judgment) => `${judgment.trial}/${judgment.criterion}`),
				).toEqual(denominator)
				expect(assessment.judgments.every(isStudyJudgment)).toBe(true)
				const semantic = assessment.judgments.filter(
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
				const mechanical = assessment.judgments.filter(
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
								? [
										`trials/${judgment.trial}/attempt.json`,
										`trials/${judgment.trial}/evidence.jsonl`,
									]
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
						const cited = retained[judgment.trial]?.[Number(row) - 1]
						expect(
							criterion?.method !== 'trace' || judgment.verdict !== 'achieved' || row !== undefined,
						).toBe(true)
						expect(
							row === undefined ||
								(Number.isSafeInteger(Number(row)) &&
									Number(row) > 0 &&
									cited?.goal === criterion?.goal &&
									isRecord(criterion?.assertion) &&
									cited?.event === criterion.assertion.observation),
						).toBe(true)
					}
				}
				const reported = await executeStudyInstall(fixture, grade.next)
				expect(reported).toMatchObject({ code: 0 })
				const report = parseJSON(reported.stdout)
				if (!isRecord(report) || !isRecord(report.report) || !isArray(report.report.scores))
					throw new Error('Missing whole-horizon report')
				expect(report).toMatchObject({
					command: 'report',
					assessment: grade.assessment,
					labels: { status: 'absent' },
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
			await server.close()
		}
	} finally {
		await destroyScratch(scratch)
	}
}, 540000)

it('freezes and checks without a request', async () => {
	const scratch = createScratch({ prefix: 'study-memory-freeze-' })
	try {
		const server = await createMemoryServer()
		try {
			const fixture = createStudyInstallFixture(scratch, server.url)
			const closure = join(scratch.ensure(join('tmp', 'studies', 'closures')), 'capacity')
			for (const command of [
				['check', 'capacity'],
				['freeze', 'capacity', '--profile', 'local', '--to', closure],
				['check', 'capacity', '--profile', 'local', '--closure', closure],
			])
				expect(await executeStudyInstall(fixture, command)).toMatchObject({ code: 0 })
			expect(server.requests).toEqual([])
		} finally {
			await server.close()
		}
	} finally {
		await destroyScratch(scratch)
	}
}, 240000)

it('seals a recorded segment and grades it', async () => {
	const scratch = createScratch({ prefix: 'study-memory-recorded-' })
	try {
		const server = await createMemoryServer()
		try {
			const fixture = createStudyInstallFixture(scratch, server.url)
			writeStudyInstallRecording(scratch)
			const planned = await executeStudyInstall(fixture, ['check', 'capacity'])
			expect(planned).toMatchObject({ code: 0 })
			const plan = parseJSON(planned.stdout)
			const trial = isRecord(plan) && isArray(plan.schedule) ? plan.schedule[0] : undefined
			if (!isRecord(trial) || typeof trial.id !== 'string') throw new Error('Missing first trial')
			const selected = await executeStudyInstall(fixture, [
				'check',
				'capacity',
				'--profile',
				'local',
				'--trial',
				trial.id,
				'--goals',
				'opening..closure',
			])
			expect(selected).toMatchObject({ code: 0 })
			const selection = parseJSON(selected.stdout)
			if (
				!isRecord(selection) ||
				!isArray(selection.next) ||
				!selection.next.every((token): token is string => typeof token === 'string')
			)
				throw new Error('Missing selected execution arguments')
			expect(server.requests).toEqual([])
			const output = join(scratch.path, 'tmp', 'studies', 'recorded')
			const executed = await executeStudyInstall(
				fixture,
				[...selection.next, '--out', output],
				260000,
			)
			expect(executed).toMatchObject({ code: 0 })
			expect(parseJSON(executed.stdout)).toMatchObject({
				command: 'execute',
				status: 'completed',
				path: output,
			})
			const result = await readStudyResult(output)
			if (result.status !== 'sealed') throw new Error('The recorded segment did not seal')
			expect(
				scratch.has(
					join('tmp', 'studies', 'recorded', 'execution', 'trials', trial.id, 'exchanges.jsonl'),
				),
			).toBe(true)
			// The preflight joins the first goal and the postflight the last, so no middle goal verifies.
			const paths = server.requests.map((request) => request.path)
			const models = paths.flatMap((path, index) =>
				path === '/api/chat' || path === '/api/generate' ? [index] : [],
			)
			expect(paths.filter((path) => path === '/api/version')).toHaveLength(2)
			expect(paths.indexOf('/api/version')).toBeLessThan(models[0] ?? -1)
			expect(paths.lastIndexOf('/api/version')).toBeGreaterThan(models.at(-1) ?? paths.length)
			const sent = server.requests.length
			const graded = await executeStudyInstall(fixture, [
				'grade',
				output,
				'--rubric',
				join(scratch.path, 'studies', 'memory', 'rubric.json'),
			])
			expect(graded).toMatchObject({ code: 0 })
			expect(server.requests).toHaveLength(sent)
			const grade = parseJSON(graded.stdout)
			if (!isRecord(grade) || typeof grade.assessment !== 'string')
				throw new Error('Missing recorded assessment')
			const assessment = parseStudyAssessment(
				parseJSON(await readFile(join(output, 'grades', grade.assessment, 'grading.json'), 'utf8')),
			)
			const rubric = parseStudyRubric(parseJSON(scratch.read('studies/memory/rubric.json') ?? ''))
			const semantic = assessment.judgments.filter(
				(judgment) =>
					rubric.criteria.find((entry) => entry.id === judgment.criterion)?.method === 'semantic',
			)
			expect(semantic.length).toBeGreaterThan(0)
			expect(semantic.map((judgment) => judgment.verdict)).toEqual(semantic.map(() => 'unknown'))
		} finally {
			await server.close()
		}
	} finally {
		await destroyScratch(scratch)
	}
}, 540000)

it('lists the adapter reading per goal', async () => {
	const scratch = createScratch({ prefix: 'study-memory-progress-' })
	try {
		const server = await createMemoryServer()
		try {
			const fixture = createStudyInstallFixture(scratch, server.url)
			writeStudyInstallRecording(scratch, STUDY_MEMORY_GOALS)
			const trial = await readStudyInstallTrial(fixture, 'records')
			const output = join(scratch.path, 'tmp', 'studies', 'progress')
			const executed = await executeMemorySegment(
				fixture,
				['--trial', trial, '--goals', 'opening..correction'],
				output,
			)
			expect(executed).toMatchObject({ code: 0 })
			const chats = server.requests.filter((request) => request.path === '/api/chat')
			const read = await executeStudyInstall(fixture, ['progress', output, '--from', 'opening'])
			expect(read).toMatchObject({ code: 0 })
			const readings = readMemoryProgressReadings(read.stdout)
			expect([...readings.keys()]).toEqual(['opening', 'correction'])
			const result = await readStudyResult(output)
			if (result.status !== 'sealed') throw new Error('The segment did not seal')
			const evidence = (await collectStudyEvidence(result))[trial] ?? []
			// The goals' agent bodies as the fixture took them, a mechanism the rows cannot reach.
			const opening = evidence.filter(
				(row) =>
					row.event === 'dispatch' &&
					row.goal === 'opening' &&
					isRecord(row.value) &&
					row.value.path === '/api/chat',
			).length
			for (const [goal, chat] of [
				['opening', chats[0]],
				['correction', chats[opening]],
			] as const) {
				const body = parseJSON(chat?.body ?? '')
				if (!isRecord(body) || !isArray(body.messages)) throw new Error('Missing chat body')
				const system = body.messages.flatMap((message) =>
					isRecord(message) && message.role === 'system' && typeof message.content === 'string'
						? [message.content]
						: [],
				)
				expect(system).toHaveLength(1)
				expect(readings.get(goal)).toMatchObject({
					calls: { agent: expect.any(Number) },
					partial: false,
					system: { count: 1, bytes: new TextEncoder().encode(system[0]).byteLength },
				})
			}
		} finally {
			await server.close()
		}
	} finally {
		await destroyScratch(scratch)
	}
}, 540000)

it.each(['records', 'compaction'] as const)(
	'chains a seeded %s segment',
	async (arm) => {
		const scratch = createScratch({ prefix: 'study-memory-chain-' })
		try {
			const server = await createMemoryServer()
			try {
				const fixture = createStudyInstallFixture(scratch, server.url)
				const chain = await executeMemorySeedChain(
					fixture,
					server,
					arm,
					join(scratch.path, 'tmp', 'studies', 'chain'),
				)
				expect(chain.opened).toMatchObject({ code: 0 })
				expect(chain.seeded).toMatchObject({ code: 0 })
				// The workers read the built entry, so a stale `dist` asks an earlier arrival again here.
				const states = readMemoryJudgeStates(server.requests.slice(chain.boundary, chain.sent))
				for (const id of ['mp-policy', 'mp-opening', 'mp-count', 'mp-scan', 'mp-handoff'])
					expect(states.filter((state) => state.startsWith(`user: [Source ${id}]`))).toEqual([])
				// The seed's own arrival is asked in the rendered form the negative read looks for, and only a records trial asks.
				expect(states.some((state) => state.startsWith('user: [Source mp-payment]'))).toBe(
					arm === 'records',
				)
				const source = await readStudyResult(chain.first)
				const result = await readStudyResult(chain.second)
				if (source.status !== 'sealed' || result.status !== 'sealed')
					throw new Error('A chain segment did not seal')
				expect(result.manifest.selection?.seed).toMatchObject({
					result: source.manifest.id,
					seal: source.seal.id,
					trial: chain.trial,
					goal: 'correction',
					digest: expect.stringMatching(/^[0-9a-f]{64}$/),
				})
				expect(
					await executeStudyInstall(fixture, [
						'grade',
						chain.first,
						'--rubric',
						join(scratch.path, 'studies', 'capacity', 'rubric.json'),
					]),
				).toMatchObject({ code: 0 })
				expect(await compareMemorySeed(chain.first, chain.profile)).toEqual({
					compared: 1,
					equal: 1,
					control: 1,
					whole: 1,
					differences: [],
				})
				const graded = await executeStudyInstall(fixture, [
					'grade',
					chain.second,
					'--rubric',
					join(scratch.path, 'studies', 'memory', 'rubric.json'),
				])
				expect(graded).toMatchObject({ code: 0 })
				const grade = parseJSON(graded.stdout)
				if (
					!isRecord(grade) ||
					typeof grade.assessment !== 'string' ||
					!isArray(grade.next) ||
					!grade.next.every((token): token is string => typeof token === 'string')
				)
					throw new Error('Missing seeded assessment')
				const assessment = parseStudyAssessment(
					parseJSON(
						await readFile(join(chain.second, 'grades', grade.assessment, 'grading.json'), 'utf8'),
					),
				)
				const rubric = parseStudyRubric(parseJSON(scratch.read('studies/memory/rubric.json') ?? ''))
				const semantic = assessment.judgments.filter(
					(judgment) =>
						rubric.criteria.find((entry) => entry.id === judgment.criterion)?.method === 'semantic',
				)
				expect(semantic.length).toBeGreaterThan(0)
				expect(semantic.map((judgment) => judgment.verdict)).toEqual(semantic.map(() => 'unknown'))
				expect(await executeStudyInstall(fixture, grade.next)).toMatchObject({ code: 0 })
				const read = await executeStudyInstall(fixture, [
					'progress',
					chain.second,
					'--from',
					'closure',
				])
				expect(read).toMatchObject({ code: 0 })
				expect(readMemoryProgressReadings(read.stdout).get('closure')).toMatchObject({
					system: { count: expect.any(Number), bytes: expect.any(Number) },
				})
				const refused = await executeStudyInstall(
					fixture,
					[
						'execute',
						'capacity',
						'--profile',
						'local',
						'--trial',
						chain.trial,
						'--goals',
						'closure..closure',
						'--seed',
						`${chain.first}:${chain.trial}:closure`,
						'--out',
						join(scratch.path, 'tmp', 'studies', 'refused'),
					],
					260000,
				)
				expect(refused.code).not.toBe(0)
				expect(refused.stderr).toContain('CUSTODY')
				expect(server.requests).toHaveLength(chain.sent)
			} finally {
				await server.close()
			}
		} finally {
			await destroyScratch(scratch)
		}
	},
	540000,
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
			expect(isStudyError(latched)).toBe(true)
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
		expect(isStudyError(result.latched)).toBe(true)
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
