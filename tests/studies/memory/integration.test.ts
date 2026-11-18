import type { MemoryInstallFixture } from '../../setupStudy.js'
import { isArray, isRecord, parseJSON } from '@orkestrel/contract'
import {
	isStudyJudgment,
	parseStudyAssessment,
	parseStudyProfile,
	parseStudyRubric,
} from '@orkestrel/study'
import { collectStudyEvidence, readStudyExchanges, readStudyResult } from '@orkestrel/study/server'
import { createScratch, destroyScratch } from '@orkestrel/test/server'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
	assertMemoryReplay,
	createMemoryInstall,
	destroyMemoryInstall,
	executeStudyTopology,
	readMemoryControls,
	readMemoryEvents,
	readMemoryProgressRows,
	runMemoryTrial,
	STUDY_MEMORY_GOALS,
	STUDY_MEMORY_PASSIVE_SETTINGS,
	STUDY_MEMORY_SCHEDULE,
	STUDY_MEMORY_SHORT_GOAL,
} from '../../setupStudy.js'

it('loads the actual recommended native topology with two distinct captured Agent occurrences', async () => {
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
			parseJSON(readFileSync('studies/memory/profiles/recommended.json', 'utf8')),
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

it('refuses a repeated canonical root in a fresh recommended native topology worker', async () => {
	const scratch = createScratch({ prefix: 'study-memory-repeated-root-' })
	try {
		const profile = parseStudyProfile(
			parseJSON(readFileSync('studies/memory/profiles/recommended.json', 'utf8')),
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

it('refuses Ollama import when its installed Agent root is omitted in a fresh recommended native topology worker', async () => {
	const scratch = createScratch({ prefix: 'study-memory-omitted-root-' })
	try {
		const profile = parseStudyProfile(
			parseJSON(readFileSync('studies/memory/profiles/recommended.json', 'utf8')),
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

describe('the captured install', () => {
	// The file's one install and its shared recording, built once under their own budget: every installed case reads them, and none writes a file another reads.
	const ready = Promise.withResolvers<MemoryInstallFixture>()
	beforeAll(() => {
		ready.resolve(createMemoryInstall('study-memory-installed-'))
		return ready.promise
	}, 80000)
	afterAll(async () => destroyMemoryInstall(await ready.promise))

	it('drives captured installed Agent and Ollama through qualification, complete execution, grading and reports', async () => {
		const { install, server } = await ready.promise
		const start = server.requests.length
		const denied = await install.execute(
			['execute', 'memory', '--profile', 'local', '--out', join(install.root, 'unqualified')],
			260000,
		)
		expect(denied.code).not.toBe(0)
		expect(denied.stderr).toMatch(/qualification|capacity|seal|missing|ENOENT/i)
		expect(server.requests).toHaveLength(start)
		expect(existsSync(join(install.root, 'unqualified'))).toBe(false)
		// Every target's seal id, appended once that target seals; the quality target is qualified by the capacity one.
		const sealed: Array<{ readonly target: string; readonly seal: string }> = []
		// Only a whole capacity result qualifies, so capacity runs whole and quality runs its first trial.
		for (const { target, purpose, trials, goals } of [
			{ target: 'capacity', purpose: 'capacity', trials: 4, goals: 12 },
			{ target: 'memory', purpose: 'quality', trials: 1, goals: 3 },
		]) {
			const beforeCheck = server.requests.length
			const check = await install.execute(['check', target, '--profile', 'local'])
			expect(check).toMatchObject({ code: 0 })
			const plan = parseJSON(check.stdout)
			if (!isRecord(plan) || !isArray(plan.schedule)) throw new Error('Missing native check output')
			expect(plan).toMatchObject({ command: 'check', study: target, purpose })
			expect(plan.next).toEqual([
				'execute',
				target,
				'--profile',
				'local',
				'--expected',
				plan.fingerprint,
			])
			// The authored order, read from the check with no execution.
			expect(
				plan.schedule.map((trial) => (isRecord(trial) ? [trial.arm, trial.repetition] : undefined)),
			).toEqual(STUDY_MEMORY_SCHEDULE)
			const first = plan.schedule[0]
			if (!isRecord(first) || typeof first.id !== 'string') throw new Error('Missing first trial')
			const selected =
				purpose === 'capacity'
					? check
					: await install.execute(['check', target, '--profile', 'local', '--trial', first.id])
			expect(selected).toMatchObject({ code: 0 })
			expect(server.requests.length).toBe(beforeCheck)
			const selection = parseJSON(selected.stdout)
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
				...(purpose === 'capacity' ? [] : ['--trial', first.id]),
			])
			const calls = server.requests.length
			// The capacity result lands where `local` names its qualification.
			const output = join(install.root, 'tmp', 'studies', target)
			const executed = await install.execute([...selection.next, '--out', output], 260000)
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
				join(install.root, 'studies', target, 'rubric.json'),
			])
			expect(server.requests.length).toBeGreaterThan(calls)
			const result = await readStudyResult(execution.path)
			if (result.status !== 'sealed') throw new Error('Actual native execution did not seal')
			expect(result.seal.id).toBe(execution.seal)
			expect(result.manifest.schedule.map((trial) => [trial.arm, trial.repetition])).toEqual(
				STUDY_MEMORY_SCHEDULE.slice(0, trials),
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
			const graded = await install.execute(execution.next)
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
				parseJSON(await readFile(join(output, 'grades', grade.assessment, 'grading.json'), 'utf8')),
			)
			const rubric = parseStudyRubric(
				parseJSON(readFileSync(join(install.root, 'studies', target, 'rubric.json'), 'utf8')),
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
							? [`trials/${judgment.trial}/attempt.json`, `trials/${judgment.trial}/evidence.jsonl`]
							: [`trials/${judgment.trial}/evidence.jsonl`],
				)
				for (const reference of judgment.references) {
					const [file, row] = reference.split('#')
					if (file === undefined) throw new Error('Missing judgment evidence file')
					expect(existsSync(join(install.root, 'tmp', 'studies', target, 'execution', file))).toBe(
						true,
					)
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
			const reported = await install.execute(grade.next)
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
				trials: { scheduled: trials, terminal: trials },
				goals: { scheduled: goals, products: goals },
			})
			expect(
				report.report.scores.reduce<number>((total, score) => {
					if (!isRecord(score) || typeof score.total !== 'number')
						throw new Error('Missing scheduled score denominator')
					return total + score.total
				}, 0),
			).toBe(denominator.length)
			expect(semantic.length).toBeGreaterThanOrEqual(purpose === 'quality' ? 1 : 0)
			expect(server.requests.length).toBe(beforeGrade)
		}
		const sent = server.requests.slice(start)
		expect(sent.some((request) => request.path === '/api/chat')).toBe(true)
		expect(sent.some((request) => request.path === '/api/generate')).toBe(true)
	}, 281000)

	it('freezes and checks without a request', async () => {
		const { install, server } = await ready.promise
		const sent = server.requests.length
		const closures = join(install.root, 'tmp', 'studies', 'closures')
		mkdirSync(closures, { recursive: true })
		const closure = join(closures, 'capacity')
		for (const command of [
			['freeze', 'capacity', '--profile', 'local', '--to', closure],
			['check', 'capacity', '--profile', 'local', '--closure', closure],
		])
			expect(await install.execute(command)).toMatchObject({ code: 0 })
		expect(server.requests).toHaveLength(sent)
	}, 83000)

	it('seals a recorded segment and grades it', async () => {
		const { install, server, recording } = await ready.promise
		expect(recording.selected).toMatchObject({ code: 0 })
		const selection = parseJSON(recording.selected.stdout)
		if (!isRecord(selection)) throw new Error('Missing selected execution arguments')
		// The selection's check carries the selectors into the arguments the execution ran.
		expect(selection.next).toEqual([
			'execute',
			'capacity',
			'--profile',
			recording.profile.name,
			'--expected',
			selection.fingerprint,
			'--trial',
			recording.trial,
			'--goals',
			'opening..correction',
		])
		expect(recording.boundary).toBe(recording.start)
		expect(recording.executed).toMatchObject({ code: 0 })
		expect(parseJSON(recording.executed.stdout)).toMatchObject({
			command: 'execute',
			status: 'completed',
			path: recording.path,
		})
		const result = await readStudyResult(recording.path)
		if (result.status !== 'sealed') throw new Error('The recorded segment did not seal')
		expect(
			existsSync(
				join(
					install.root,
					'tmp',
					'studies',
					'recorded',
					'execution',
					'trials',
					recording.trial,
					'exchanges.jsonl',
				),
			),
		).toBe(true)
		// The preflight joins the first goal and the postflight the last, so no middle goal verifies.
		const paths = server.requests
			.slice(recording.boundary, recording.sent)
			.map((request) => request.path)
		const models = paths.flatMap((path, index) =>
			path === '/api/chat' || path === '/api/generate' ? [index] : [],
		)
		expect(paths.filter((path) => path === '/api/version')).toHaveLength(2)
		expect(paths.indexOf('/api/version')).toBeLessThan(models[0] ?? -1)
		expect(paths.lastIndexOf('/api/version')).toBeGreaterThan(models.at(-1) ?? paths.length)
		const sent = server.requests.length
		const graded = await install.execute([
			'grade',
			recording.path,
			'--rubric',
			join(install.root, 'studies', 'memory', 'rubric.json'),
		])
		expect(graded).toMatchObject({ code: 0 })
		expect(server.requests).toHaveLength(sent)
		const grade = parseJSON(graded.stdout)
		if (!isRecord(grade) || typeof grade.assessment !== 'string')
			throw new Error('Missing recorded assessment')
		const assessment = parseStudyAssessment(
			parseJSON(
				await readFile(join(recording.path, 'grades', grade.assessment, 'grading.json'), 'utf8'),
			),
		)
		const rubric = parseStudyRubric(
			parseJSON(readFileSync(join(install.root, 'studies', 'memory', 'rubric.json'), 'utf8')),
		)
		const semantic = assessment.judgments.filter(
			(judgment) =>
				rubric.criteria.find((entry) => entry.id === judgment.criterion)?.method === 'semantic',
		)
		expect(semantic.length).toBeGreaterThan(0)
		expect(semantic.map((judgment) => judgment.verdict)).toEqual(semantic.map(() => 'unknown'))
	})

	it('lists the adapter reading per goal', async () => {
		const { install, server, recording } = await ready.promise
		const chats = server.requests
			.slice(recording.boundary, recording.sent)
			.filter((request) => request.path === '/api/chat')
		const read = await install.execute(['progress', recording.path, '--from', 'opening'])
		expect(read).toMatchObject({ code: 0 })
		const progress = readMemoryProgressRows(read.stdout)
		expect([...progress.keys()]).toEqual(['opening', 'correction'])
		const result = await readStudyResult(recording.path)
		if (result.status !== 'sealed') throw new Error('The segment did not seal')
		const evidence = (await collectStudyEvidence(result))[recording.trial] ?? []
		// The goals' agent bodies as the fixture took them, a mechanism the rows cannot reach.
		const first = evidence.filter(
			(row) =>
				row.event === 'dispatch' &&
				row.goal === 'opening' &&
				isRecord(row.value) &&
				row.value.path === '/api/chat',
		).length
		for (const [goal, chat] of [
			['opening', chats[0]],
			['correction', chats[first]],
		] as const) {
			const body = parseJSON(chat?.body ?? '')
			if (!isRecord(body) || !isArray(body.messages)) throw new Error('Missing chat body')
			const system = body.messages.flatMap((message) =>
				isRecord(message) && message.role === 'system' && typeof message.content === 'string'
					? [message.content]
					: [],
			)
			expect(system).toHaveLength(1)
			expect(progress.get(goal)).toMatchObject({
				calls: { agent: expect.any(Number) },
				partial: false,
				system: { count: 1, bytes: new TextEncoder().encode(system[0]).byteLength },
			})
		}
	})

	it('replays the recorded segment offline and reproduces its memory evidence', async () => {
		const { install, server, recording } = await ready.promise
		const source = await readStudyResult(recording.path)
		if (source.status !== 'sealed') throw new Error('The recorded segment did not seal')
		const history = await readStudyExchanges(source, recording.trial)
		const output = join(install.root, 'tmp', 'studies', 'replayed')
		const sent = server.requests.length
		const replayed = await install.execute(
			[
				'execute',
				'capacity',
				'--profile',
				recording.profile.name,
				'--trial',
				recording.trial,
				'--goals',
				'opening..correction',
				'--replay',
				recording.path,
				'--prefix',
				JSON.stringify({ [recording.trial]: history.exchanges.length }),
				'--offline',
				'true',
				'--out',
				output,
			],
			260000,
		)
		expect(replayed).toMatchObject({ code: 0 })
		expect(server.requests).toHaveLength(sent)
		const result = await readStudyResult(output)
		if (result.status !== 'sealed') throw new Error('The replay did not seal')
		// The records session rebuilds its ledger state, windows and judgments from the served bytes alone.
		assertMemoryReplay(
			(await collectStudyEvidence(source))[recording.trial] ?? [],
			(await collectStudyEvidence(result))[recording.trial] ?? [],
		)
	})
})

it('sends a false truncate and no shift on every chat request, and marks no dispatch evidence strict', async () => {
	for (const arm of ['full', 'records'] as const) {
		const result = await runMemoryTrial({
			arm,
			responses: [],
			goals: [STUDY_MEMORY_SHORT_GOAL],
			settings: STUDY_MEMORY_PASSIVE_SETTINGS,
		})
		expect(result.failure).toBeUndefined()
		const controls = readMemoryControls(result.requests)
		expect(controls.length).toBeGreaterThan(0)
		expect(controls).toEqual(controls.map(() => ({ truncate: false, shift: undefined })))
		expect(readMemoryEvents(result.evidence, 'dispatch').some((value) => 'strict' in value)).toBe(
			false,
		)
	}
})
