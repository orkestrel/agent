import type { StudyProfile, StudyScenario } from '../../../../../app/core/studies/types.js'
import { createScratch } from '@orkestrel/test/server'
import { realpathSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'
import { appServer } from '../../../../../vite.config.js'
import { outputBoundary } from '../../../../../configs/helpers.js'
import { StudySeries } from '../../../../../app/core/studies/engines/StudySeries.js'
import { buildStudySchedule } from '../../../../../app/core/studies/helpers.js'
import { StudyArtifacts } from '../../../../../app/server/studies/processes/StudyArtifacts.js'
import { StudyProcessDriver } from '../../../../../app/server/studies/processes/StudyProcessDriver.js'
import { computeStudyProfileDigest } from '../../../../../app/server/studies/processes/helpers.js'
import { isStudyEvidence } from '../../../../../app/server/studies/processes/validators.js'
import { StudyResults } from '../../../../../app/server/studies/stores/StudyResults.js'
import { readStudyResult } from '../../../../../app/server/studies/stores/helpers.js'
import {
	buildCustodyManifest,
	buildStudyDefinition,
	buildStudyProfile,
} from '../../../../setupStudy.js'

describe('fresh process study composition', () => {
	it('runs the actual built Agent in distinct children with parent budgets and real sealed custody', async () => {
		const root = realpathSync(resolve('.'))
		const scratch = createScratch({ parent: join(root, 'tmp', 'units'), prefix: 'study-process-' })
		try {
			const pids = join(scratch.path, 'pids.txt')
			const input = scratch.write(
				'worker.ts',
				`import { appendFileSync } from 'node:fs'\nimport { StudyWorker } from ${JSON.stringify(join(root, 'app/server/studies/processes/StudyWorker.ts').replaceAll('\\', '/'))}\nappendFileSync(${JSON.stringify(pids)}, String(process.pid)+'\\n')\nvoid new StudyWorker().execute().catch(error => { console.error(error); process.exitCode=1 })\n`,
			)
			const output = join(scratch.path, 'built')
			await build({
				...appServer({
					plugins: [outputBoundary(relative(root, output).replaceAll('\\', '/'))],
					build: {
						outDir: output,
						emptyOutDir: false,
						lib: { entry: input, formats: ['cjs'], fileName: 'worker' },
					},
				}),
				configFile: false,
				logLevel: 'warn',
			})
			const entry = join(output, 'worker.cjs')
			const defaults = buildStudyProfile()
			const profile: StudyProfile = {
				...defaults,
				subject: join(root, 'dist/src/core/index.js'),
				roots: [
					root,
					...[
						'abort',
						'budget',
						'contract',
						'database',
						'emitter',
						'queue',
						'timeout',
						'tool',
						'workflow',
						'workspace',
					].map((name) => join(root, 'node_modules/@orkestrel', name)),
				],
				bounds: {
					request: { duration: 5000, calls: 1, tokens: 10000, bytes: 65536 },
					goal: { duration: 10000, calls: 10, tokens: 100000, bytes: 262144 },
					trial: { duration: 20000, calls: 30, tokens: 300000, bytes: 1048576 },
					series: { duration: 60000, calls: 60, tokens: 600000, bytes: 4194304 },
				},
			}
			const artifacts = new StudyArtifacts({ entry, root, profile })
			const identity = {
				...(await artifacts.inspect()),
				fixtures: 'c'.repeat(64),
				profile: computeStudyProfileDigest(profile),
			}
			const scenario: StudyScenario = {
				id: 'files',
				goals: [
					{
						id: 'partial',
						input: {
							prompt: 'Stop this workload',
							responses: [{ content: 'partial', calls: [], cancel: true }],
							files: [],
							admitted: true,
						},
					},
					{
						id: 'before',
						input: {
							prompt: 'Inspect empty state',
							responses: [{ content: 'before', calls: [] }],
							files: ['note.txt'],
							admitted: true,
						},
					},
					{
						id: 'write',
						input: {
							prompt: 'Write a note',
							responses: [
								{
									content: '',
									calls: [
										{
											id: 'write1',
											name: 'write',
											arguments: { path: 'note.txt', content: 'retained' },
										},
									],
								},
								{ content: 'done', calls: [], consume: 'write1' },
							],
							files: ['note.txt'],
							admitted: true,
						},
					},
					{
						id: 'after',
						input: {
							prompt: 'Read the note',
							responses: [
								{
									content: '',
									calls: [{ id: 'read1', name: 'read', arguments: { path: 'note.txt' } }],
								},
								{ content: 'done', calls: [], consume: 'read1' },
							],
							files: ['note.txt'],
							admitted: true,
						},
					},
				],
			}
			const definition = buildStudyDefinition({
				driver: 'tools',
				purpose: 'mechanism',
				arms: ['agent'],
				scenarios: ['files'],
				order: [['agent'], ['agent']],
			})
			const manifest = buildCustodyManifest({
				definition,
				scenarios: [scenario],
				identity,
				bounds: profile.bounds,
				schedule: buildStudySchedule(definition, [scenario]),
			})
			const directory = join(scratch.path, 'result')
			const store = new StudyResults({ directory, manifest })
			await store.create()
			const driver = new StudyProcessDriver({
				entry,
				root,
				profile,
				identity,
				driver: 'tools',
				directory: scratch.ensure('trials'),
			})
			const attempts = await new StudySeries({
				manifest,
				driver,
				store,
				signal: new AbortController().signal,
			}).execute()
			expect(attempts.map((attempt) => attempt.failure)).toEqual([undefined, undefined])
			expect(
				attempts.map((attempt) =>
					attempt.observations.map((observation) => observation.usage.length),
				),
			).toEqual([
				[1, 2, 4, 4],
				[1, 2, 4, 4],
			])
			expect(
				attempts.map((attempt) =>
					attempt.observations.map((observation) => observation.product?.partial),
				),
			).toEqual([
				[true, false, false, false],
				[true, false, false, false],
			])
			for (const trial of manifest.schedule) {
				const lines = (
					await readFile(join(directory, 'execution', 'trials', trial.id, 'evidence.jsonl'), 'utf8')
				)
					.trim()
					.split(/\r\n|\n/)
				const rows = lines.map((line): unknown => JSON.parse(line)).filter(isStudyEvidence)
				expect(rows).toHaveLength(lines.length)
				expect(rows.filter((row) => row.event === 'file')).toMatchObject([
					{ goal: 'before', value: { exists: false } },
					{ goal: 'write', value: { exists: true, content: 'retained' } },
					{ goal: 'after', value: { exists: true, content: 'retained' } },
				])
			}
			await store.seal()
			expect((await readStudyResult(directory)).status).toBe('sealed')
			const children = (await readFile(pids, 'utf8'))
				.trim()
				.split(/\r\n|\n/)
				.map(Number)
			expect(children).toHaveLength(2)
			expect(new Set(children).size).toBe(2)
			for (const pid of children) expect(() => process.kill(pid, 0)).toThrow(/ESRCH/)
			const first = manifest.schedule[0]
			if (first === undefined) throw new Error('Fixture trial missing')
			const mismatched = new StudyProcessDriver({
				entry,
				root,
				profile,
				identity: { ...identity, profile: '0'.repeat(64) },
				driver: 'tools',
				directory: scratch.ensure('mismatch'),
			})
			await expect(mismatched.open(first, new AbortController().signal)).rejects.toThrow(
				/identity differs/,
			)
			const refused: StudyScenario = {
				...scenario,
				goals: [
					{
						id: 'refused',
						input: {
							prompt: 'Exceed request ceiling',
							responses: [{ content: 'blocked', calls: [], tokens: 10001 }],
							files: [],
							admitted: true,
						},
					},
					...scenario.goals,
				],
			}
			const refusedManifest = { ...manifest, scenarios: [refused] }
			const refusedDirectory = join(scratch.path, 'refused')
			const refusedStore = new StudyResults({
				directory: refusedDirectory,
				manifest: refusedManifest,
			})
			await refusedStore.create()
			const stopped = await new StudySeries({
				manifest: refusedManifest,
				driver,
				store: refusedStore,
				signal: new AbortController().signal,
			}).execute()
			expect(stopped.map((attempt) => attempt.failure?.cause)).toEqual(['capacity', 'capacity'])
			expect(
				stopped
					.flatMap((attempt) => attempt.observations)
					.every(
						(observation) => observation.product === undefined && observation.usage.length === 0,
					),
			).toBe(true)
			expect(
				stopped[1]?.observations.every((observation) =>
					observation.failure?.message.startsWith('Goal unexecuted:'),
				),
			).toBe(true)
			await refusedStore.seal()
			const brokenDirectory = join(scratch.path, 'broken')
			const broken = new StudyResults({ directory: brokenDirectory, manifest })
			await broken.create()
			await mkdir(join(brokenDirectory, 'execution', 'trials', first.id))
			await expect(
				new StudySeries({
					manifest,
					driver,
					store: broken,
					signal: new AbortController().signal,
				}).execute(),
			).rejects.toMatchObject({ code: 'CUSTODY' })
			expect(scratch.has('broken/seal.json')).toBe(false)
			const all = (await readFile(pids, 'utf8'))
				.trim()
				.split(/\r\n|\n/)
				.map(Number)
			expect(all).toHaveLength(4)
			for (const pid of all) expect(() => process.kill(pid, 0)).toThrow(/ESRCH/)
			artifacts.verify()
		} finally {
			scratch.destroy()
		}
	}, 60000)
})
