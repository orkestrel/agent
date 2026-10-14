import { isArray, isRecord, parseJSON } from '@orkestrel/contract'
import {
	isStudyJudgment,
	parseStudyGrading,
	parseStudyProfile,
	parseStudyRubric,
} from '@orkestrel/study'
import { readStudyResult } from '@orkestrel/study/server'
import { createScratch, destroyScratch } from '@orkestrel/test/server'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { readFileSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'
import {
	createMemoryServer,
	createStudyServiceFixture,
	executeStudyService,
	executeStudyTopology,
	readStudyToolsEvidence,
	STUDY_MEMORY_GOALS,
	STUDY_MEMORY_SCHEDULE,
} from '../../../setupService.js'

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
			[resolve('.'), resolve('node_modules/@orkestrel/agent')].map((root) => {
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
