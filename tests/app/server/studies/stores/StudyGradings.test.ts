import { createScratch } from '@orkestrel/test/server'
import { appendFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildStudyRubric } from '../../../../setupStudy.js'
import {
	buildCustodyGrading,
	buildCustodyLabels,
	retainStudyFixture,
} from '../../../../setupServer.js'
import { StudyGradings } from '../../../../../app/server/studies/stores/StudyGradings.js'
import { encodeStudyJSON } from '../../../../../app/server/studies/stores/helpers.js'

describe('StudyGradings', () => {
	it('reproduces the same exact predicate grading identity and preserves execution bytes', async () => {
		const scratch = createScratch()
		try {
			const result = await retainStudyFixture(join(scratch.path, 'result'))
			const rubric = buildStudyRubric()
			const grades = new StudyGradings({ result, rubric: encodeStudyJSON(rubric) })
			const original = await Promise.all(
				result.seal.files.map((file) =>
					readFile(join(result.directory, 'execution', ...file.path.split('/'))),
				),
			)
			const grading = buildCustodyGrading(result, rubric)
			const [id, duplicate] = await Promise.all([grades.write(grading), grades.write(grading)])
			expect(duplicate).toBe(id)
			expect(
				await new StudyGradings({ result, rubric: encodeStudyJSON(rubric) }).write(grading),
			).toBe(id)
			expect(await grades.read(id)).toEqual({ ...grading, labels: undefined })
			expect(await grades.read('f'.repeat(64))).toBeUndefined()
			const changed = await grades.write({ ...grading, grader: 'predicate-v2' })
			expect(changed).not.toBe(id)
			expect(scratch.names('result/grades')).toEqual(expect.arrayContaining([id, changed]))
			expect(
				await Promise.all(
					result.seal.files.map((file) =>
						readFile(join(result.directory, 'execution', ...file.path.split('/'))),
					),
				),
			).toEqual(original)
		} finally {
			scratch.destroy()
		}
	})

	it('imports exact labels bytes and assigns distinct identities to changed label provenance', async () => {
		const scratch = createScratch()
		try {
			const result = await retainStudyFixture(join(scratch.path, 'result'))
			const rubric = buildStudyRubric()
			const labels = buildCustodyLabels(result)
			const grading = buildCustodyGrading(result, rubric, labels)
			const first = new StudyGradings({
				result,
				rubric: encodeStudyJSON(rubric),
				labels: encodeStudyJSON(labels),
			})
			const id = await first.write(grading)
			const changed = buildCustodyLabels(result, 'human-v2')
			const second = new StudyGradings({
				result,
				rubric: encodeStudyJSON(rubric),
				labels: encodeStudyJSON(changed),
			})
			const later = await second.write(buildCustodyGrading(result, rubric, changed))
			expect(later).not.toBe(id)
			expect(
				await readFile(join(result.directory, 'grades', id, `${grading.labels}.labels.json`)),
			).toEqual(Buffer.from(encodeStudyJSON(labels)))
			expect((await first.read(id))?.judgments).toEqual(grading.judgments)
			expect((await first.read(later))?.labels).not.toBe(grading.labels)
		} finally {
			scratch.destroy()
		}
	})

	it('refuses omitted coverage, foreign attempt identities, artifact bindings, and unbound semantic success', async () => {
		const scratch = createScratch()
		try {
			const result = await retainStudyFixture(join(scratch.path, 'result'))
			const rubric = buildStudyRubric()
			const grades = new StudyGradings({ result, rubric: encodeStudyJSON(rubric) })
			const grading = buildCustodyGrading(result, rubric)
			await expect(grades.write({ ...grading, judgments: [] })).rejects.toMatchObject({
				code: 'EVIDENCE',
			})
			await expect(grades.write({ ...grading, attempts: ['unexecuted'] })).rejects.toMatchObject({
				code: 'EVIDENCE',
			})
			await expect(grades.write({ ...grading, result: result.manifest.id })).rejects.toMatchObject({
				code: 'EVIDENCE',
			})
			await expect(grades.write({ ...grading, rubric: 'f'.repeat(64) })).rejects.toMatchObject({
				code: 'EVIDENCE',
			})
			await expect(grades.write({ ...grading, labels: 'f'.repeat(64) })).rejects.toMatchObject({
				code: 'EVIDENCE',
			})
			await expect(
				grades.write({
					...grading,
					judgments: grading.judgments.map((judgment) =>
						judgment.method === 'human'
							? { ...judgment, verdict: 'achieved', references: ['unbound'] }
							: judgment,
					),
				}),
			).rejects.toMatchObject({ code: 'EVIDENCE' })
			expect(scratch.has('result/grades')).toBe(false)
		} finally {
			scratch.destroy()
		}
	})

	it('detects tampered grading, artifact, and execution bytes and never overwrites them', async () => {
		const scratch = createScratch()
		try {
			const result = await retainStudyFixture(join(scratch.path, 'result'))
			const rubric = buildStudyRubric()
			const grades = new StudyGradings({ result, rubric: encodeStudyJSON(rubric) })
			const grading = buildCustodyGrading(result, rubric)
			const id = await grades.write(grading)
			const artifact = join(result.directory, 'grades', id, `${grading.rubric}.rubric.json`)
			await appendFile(artifact, ' ')
			await expect(grades.read(id)).rejects.toMatchObject({ code: 'CUSTODY' })
			await expect(grades.write(grading)).rejects.toMatchObject({ code: 'CUSTODY' })
			expect((await readFile(artifact, 'utf8')).endsWith(' ')).toBe(true)
			const later = await grades.write({ ...grading, grader: 'later' })
			await appendFile(join(result.directory, 'grades', later, 'grading.json'), ' ')
			await expect(grades.read(later)).rejects.toMatchObject({ code: 'CUSTODY' })
			await appendFile(join(result.directory, 'execution', 'manifest.json'), ' ')
			await expect(grades.write({ ...grading, grader: 'after-tamper' })).rejects.toMatchObject({
				code: 'CUSTODY',
			})
		} finally {
			scratch.destroy()
		}
	})
})
