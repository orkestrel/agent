import type { StudyEvidence } from '@orkestrel/study'
import { createScratch } from '@orkestrel/test/server'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import {
	gradeStudyTools,
	observeStudyToolsFile,
	readStudyToolsMessages,
	readStudyToolsPredicate,
	resolveStudyToolsPath,
	validateStudyToolsRubric,
} from '../../../studies/tools/helpers.js'
import { loadStudyToolsFixture } from '../../setupStudy.js'
import { buildCustodyAttempt } from '../../setupStudy.js'

it('refuses traversal, reserved names, symlinks and oversized files before observing or writing outside scratch', async () => {
	const scratch = createScratch()
	const outside = createScratch({ files: { 'original.txt': 'untouched' } })
	try {
		const path = await resolveStudyToolsPath(scratch.path, 'note.txt')
		expect(path).toBe(join(scratch.path, 'note.txt'))
		expect(await observeStudyToolsFile(scratch.path, 'note.txt')).toEqual({
			path: 'note.txt',
			exists: false,
		})
		scratch.write('note.txt', 'alpha')
		expect(await observeStudyToolsFile(scratch.path, 'note.txt')).toEqual({
			path: 'note.txt',
			exists: true,
			content: 'alpha',
			bytes: 5,
		})
		await expect(resolveStudyToolsPath(scratch.path, '../escape.txt')).rejects.toThrow('refused')
		await expect(resolveStudyToolsPath(scratch.path, 'con.txt')).rejects.toThrow('refused')
		scratch.write('large.txt', 'a'.repeat(1025))
		await expect(observeStudyToolsFile(scratch.path, 'large.txt')).rejects.toThrow('Oversized')
		scratch.link('linked.txt', outside.path)
		await expect(resolveStudyToolsPath(scratch.path, 'linked.txt')).rejects.toThrow('symlink')
		expect(outside.read('original.txt')).toBe('untouched')
		expect(outside.names()).toEqual(['original.txt'])
	} finally {
		scratch.destroy()
		outside.destroy()
	}
})

it('projects only dereferenced foreign message fields and refuses malformed provider reads', () => {
	const reads = { role: 0, content: 0, call: 0 }
	expect(
		readStudyToolsMessages([
			{
				get role() {
					reads.role++
					return 'tool'
				},
				get content() {
					reads.content++
					return 'alpha'
				},
				get call() {
					reads.call++
					return 'recalled'
				},
			},
		]),
	).toEqual([{ role: 'tool', content: 'alpha', call: 'recalled' }])
	expect(reads).toEqual({ role: 1, content: 1, call: 1 })
	expect(
		readStudyToolsMessages([{ role: 'tool', content: 'alpha', call: 'recalled', extra: true }]),
	).toEqual([{ role: 'tool', content: 'alpha', call: 'recalled' }])
	expect(() => readStudyToolsMessages([{ role: 'tool', content: 1 }])).toThrow('invalid')
	expect(() => readStudyToolsMessages({})).toThrow('array')
})

it('grades the latest actual file and trace, retaining unknown when no matching evidence exists', () => {
	const rows: readonly StudyEvidence[] = [
		{
			event: 'file',
			goal: 'save',
			value: { path: 'note.txt', exists: true, content: 'alpha', bytes: 5 },
		},
		{
			event: 'file',
			goal: 'save',
			value: { path: 'note.txt', exists: true, content: 'wrong', bytes: 5 },
		},
		{ event: 'tool', goal: 'save', value: { name: 'write', success: false } },
		{ event: 'denial', goal: 'save', value: { name: 'write' } },
		{ event: 'result', goal: 'save', value: { content: 'before-cancel', partial: true } },
	]
	expect(
		readStudyToolsPredicate(
			{ observation: 'file', path: 'note.txt', exists: true, content: 'alpha' },
			'save',
			rows,
		),
	).toEqual({ verdict: 'unsuccessful', row: 1 })
	expect(
		readStudyToolsPredicate({ observation: 'tool', name: 'write', success: false }, 'save', rows),
	).toEqual({ verdict: 'achieved', row: 2 })
	expect(readStudyToolsPredicate({ observation: 'denial', name: 'write' }, 'save', rows)).toEqual({
		verdict: 'achieved',
		row: 3,
	})
	expect(
		readStudyToolsPredicate(
			{ observation: 'result', partial: true, content: 'before-cancel' },
			'save',
			rows,
		),
	).toEqual({ verdict: 'achieved', row: 4 })
	expect(
		readStudyToolsPredicate(
			{ observation: 'file', path: 'note.txt', exists: false },
			'foreign',
			rows,
		),
	).toEqual({ verdict: 'unknown', row: undefined })
	expect(() =>
		readStudyToolsPredicate({ observation: 'file', path: 'note.txt', exists: false }, 'save', [
			{ event: 'file', goal: 'save', value: { path: 'note.txt', exists: true } },
		]),
	).toThrow('Malformed')
})

it('refuses unsupported assertions, foreign attempts/evidence and duplicate attempts without inventing grades', async () => {
	const fixture = await loadStudyToolsFixture()
	const manifest = fixture.manifest
	const trial = manifest.schedule[0]
	if (trial === undefined) throw new Error('No declared tools trial')
	const attempt = buildCustodyAttempt(manifest, trial)
	expect(() => validateStudyToolsRubric(fixture.rubric)).not.toThrow()
	expect(() =>
		validateStudyToolsRubric({
			...fixture.rubric,
			criteria: fixture.rubric.criteria.map((criterion) => ({
				...criterion,
				assertion: { unsupported: true },
			})),
		}),
	).toThrow('Unsupported')
	expect(() =>
		validateStudyToolsRubric({
			...fixture.rubric,
			criteria: fixture.rubric.criteria.map((criterion) => ({ ...criterion, method: 'semantic' })),
		}),
	).toThrow('Unsupported')
	expect(
		gradeStudyTools(manifest, fixture.rubric, [], {}).every(
			(judgment) => judgment.verdict === 'unknown',
		),
	).toBe(true)
	expect(() => gradeStudyTools(manifest, fixture.rubric, [attempt, attempt], {})).toThrow(
		'duplicate',
	)
	expect(() =>
		gradeStudyTools(
			manifest,
			fixture.rubric,
			[{ ...attempt, trial: { ...trial, id: 'foreign' } }],
			{},
		),
	).toThrow('Invalid')
	expect(() => gradeStudyTools(manifest, fixture.rubric, [], { foreign: [] })).toThrow('foreign')
})
