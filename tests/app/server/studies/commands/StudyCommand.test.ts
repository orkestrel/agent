import { isRecord } from '@orkestrel/contract'
import { createScratch } from '@orkestrel/test/server'
import { appendFile, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	buildCompactCustodyManifest,
	buildCustodyManifest,
	buildStudyRubric,
} from '../../../../setupStudy.js'
import {
	buildCustodyGrading,
	buildCustodyPacketLabels,
	createStudyCommandFixture,
	retainStudyFixture,
} from '../../../../setupServer.js'
import { StudyCommand } from '../../../../../app/server/studies/commands/StudyCommand.js'
import {
	buildStudyPacket,
	computeStudyPacketDigest,
	encodeStudyJSON,
} from '../../../../../app/server/studies/stores/helpers.js'
import { StudyGradings } from '../../../../../app/server/studies/stores/StudyGradings.js'

describe('StudyCommand', () => {
	it('imports only bound neutral semantic labels and regrades without changing execution', async () => {
		const scratch = createScratch()
		try {
			const result = await retainStudyFixture(
				join(scratch.path, 'result'),
				buildCompactCustodyManifest(),
			)
			const rubric = buildStudyRubric()
			const base = buildCustodyGrading(result, rubric)
			const packet = buildStudyPacket(result, rubric, base.rubric)
			if (packet === undefined) throw new Error('Missing packet fixture')
			const previous = await new StudyGradings({
				result,
				rubric: encodeStudyJSON(rubric),
				packet,
			}).write({ ...base, packet: computeStudyPacketDigest(packet) })
			const labels = buildCustodyPacketLabels(result, rubric)
			scratch.write('labels.json', new TextDecoder().decode(encodeStudyJSON(labels)))
			scratch.write('entry.cjs', 'module.exports = {}\n')
			const command = new StudyCommand({
				root: scratch.path,
				entry: join(scratch.path, 'entry.cjs'),
			})
			const original = await readFile(join(result.directory, 'execution', 'manifest.json'))
			const labeled = await command.execute(
				['label', result.directory, '--grading', previous, '--labels', 'labels.json'],
				new AbortController().signal,
			)
			if (!isRecord(labeled) || typeof labeled.grading !== 'string')
				throw new Error('Missing grading identity')
			expect(labeled.grading).not.toBe(previous)
			expect(
				await command.execute(
					['label', result.directory, '--grading', labeled.grading, '--labels', 'labels.json'],
					new AbortController().signal,
				),
			).toMatchObject({ grading: labeled.grading })
			const reported = await command.execute(
				['report', result.directory, '--grading', labeled.grading],
				new AbortController().signal,
			)
			expect(reported).toMatchObject({ labeling: { labeler: 'human-v1', version: '1' } })
			scratch.write(
				'wrong-packet.json',
				new TextDecoder().decode(encodeStudyJSON({ ...labels, packet: 'f'.repeat(64) })),
			)
			await expect(
				command.execute(
					['label', result.directory, '--grading', previous, '--labels', 'wrong-packet.json'],
					new AbortController().signal,
				),
			).rejects.toMatchObject({ code: 'EVIDENCE' })
			scratch.write(
				'foreign-label.json',
				new TextDecoder().decode(
					encodeStudyJSON({
						...labels,
						judgments: labels.judgments.map((judgment) => ({ ...judgment, trial: 't-foreign' })),
					}),
				),
			)
			await expect(
				command.execute(
					['label', result.directory, '--grading', previous, '--labels', 'foreign-label.json'],
					new AbortController().signal,
				),
			).rejects.toMatchObject({ code: 'EVIDENCE' })
			expect(await readFile(join(result.directory, 'execution', 'manifest.json'))).toEqual(original)
		} finally {
			scratch.destroy()
		}
	})
	it('checks actual artifact inventories without selected-code imports or filesystem writes', async () => {
		const scratch = createStudyCommandFixture()
		try {
			const command = new StudyCommand({
				root: scratch.path,
				entry: join(scratch.path, 'dist', 'app', 'server', 'main.cjs'),
			})
			const before = scratch.names()
			const reading = await command.execute(
				['check', 'tools', '--profile', 'local'],
				new AbortController().signal,
			)
			expect(reading).toMatchObject({
				command: 'check',
				study: 'tools',
				purpose: 'mechanism',
				bounds: { series: { duration: expect.any(Number) } },
				fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
			})
			expect(scratch.names()).toEqual(before)
			expect(scratch.has('subject/imported.txt')).toBe(false)
			expect(scratch.has('studies/results')).toBe(false)
			const second = await command.execute(['check', 'tools'], new AbortController().signal)
			expect(second).toEqual(reading)
		} finally {
			scratch.destroy()
		}
	})

	it('refuses stale supervisor fingerprints, invalid workloads and linked inputs before creating results', async () => {
		const scratch = createStudyCommandFixture()
		try {
			const command = new StudyCommand({
				root: scratch.path,
				entry: join(scratch.path, 'dist', 'app', 'server', 'main.cjs'),
			})
			await expect(
				command.execute(
					['execute', 'tools', '--expected', 'f'.repeat(64)],
					new AbortController().signal,
				),
			).rejects.toMatchObject({ code: 'CONFIG' })
			expect(scratch.has('studies/results')).toBe(false)
			expect(scratch.has('subject/imported.txt')).toBe(false)
			scratch.write(
				'studies/tools/scenarios/write.json',
				'{"id":"write","goals":[{"id":"work","input":{}}]}',
			)
			await expect(
				command.execute(['check', 'tools'], new AbortController().signal),
			).rejects.toMatchObject({ code: 'CONFIG' })
			scratch.link('linked-study', join(scratch.path, 'studies', 'tools'))
			await expect(
				new StudyCommand({ root: join(scratch.path, 'linked-study'), entry: 'unused.cjs' }).execute(
					['check', 'tools'],
					new AbortController().signal,
				),
			).rejects.toThrow('custody')
			expect(scratch.has('studies/results')).toBe(false)
		} finally {
			scratch.destroy()
		}
	})

	it('grades and reports only sealed bytes, keeps regrading immutable and exposes unresolved whole-horizon outcomes', async () => {
		const scratch = createScratch()
		try {
			const base = buildCompactCustodyManifest()
			const manifest = buildCustodyManifest({
				definition: { ...base.definition, driver: 'tools', purpose: 'mechanism' },
				schedule: base.schedule,
			})
			const result = await retainStudyFixture(join(scratch.path, 'result'), manifest)
			const rubric = buildStudyRubric()
			const predicates = {
				...rubric,
				criteria: rubric.criteria.map((criterion) => ({
					...criterion,
					method: 'state',
					assertion: { observation: 'file', path: 'note.txt', exists: false },
				})),
			}
			scratch.write('rubric.json', new TextDecoder().decode(encodeStudyJSON(predicates)))
			scratch.write('entry.cjs', 'module.exports = {}\n')
			const command = new StudyCommand({
				root: scratch.path,
				entry: join(scratch.path, 'entry.cjs'),
			})
			const original = await readFile(join(result.directory, 'execution', 'manifest.json'))
			const first = await command.execute(
				['grade', result.directory, '--rubric', 'rubric.json'],
				new AbortController().signal,
			)
			if (!isRecord(first) || typeof first.grading !== 'string')
				throw new Error('Missing grading identity')
			expect(
				await command.execute(
					['grade', result.directory, '--rubric', 'rubric.json'],
					new AbortController().signal,
				),
			).toEqual(first)
			const report = await command.execute(
				['report', result.directory, '--grading', first.grading],
				new AbortController().signal,
			)
			expect(report).toMatchObject({
				command: 'report',
				report: {
					scores: [
						{
							arm: 'small',
							total: 4,
							achieved: 0,
							unsuccessful: 0,
							unknown: 4,
							lower: 0,
							upper: 1,
							coverage: 0,
						},
					],
					operations: { trials: { scheduled: 2, terminal: 2 } },
					uncertainty: expect.stringContaining('One repetition'),
				},
			})
			scratch.write(
				'rubric-v2.json',
				new TextDecoder().decode(encodeStudyJSON({ ...predicates, version: '2' })),
			)
			const later = await command.execute(
				['grade', result.directory, '--rubric', 'rubric-v2.json'],
				new AbortController().signal,
			)
			expect(later).not.toEqual(first)
			expect(await readFile(join(result.directory, 'execution', 'manifest.json'))).toEqual(original)
			await expect(
				command.execute(
					['label', result.directory, '--grading', first.grading, '--labels', 'rubric.json'],
					new AbortController().signal,
				),
			).rejects.toMatchObject({ code: 'EVIDENCE' })
			await appendFile(join(result.directory, 'grades', first.grading, 'grading.json'), ' ')
			await expect(
				command.execute(
					['report', result.directory, '--grading', first.grading],
					new AbortController().signal,
				),
			).rejects.toMatchObject({ code: 'CUSTODY' })
			await rm(join(result.directory, 'seal.json'))
			await expect(
				command.execute(
					['grade', result.directory, '--rubric', 'rubric.json'],
					new AbortController().signal,
				),
			).rejects.toMatchObject({ code: 'CUSTODY' })
		} finally {
			scratch.destroy()
		}
	})
})
