import type { StudyEvidence } from '@orkestrel/study'
import { createScratch } from '@orkestrel/test/server'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createStudyAdapter } from '../../../studies/tools/factories.js'
import {
	observeStudyToolsFile,
	readStudyToolsGrade,
	readStudyToolsPredicate,
	readStudyToolsRequest,
	resolveStudyToolsPath,
	validateStudyToolsRubric,
} from '../../../studies/tools/helpers.js'
import { loadStudyToolsFixture } from '../../setupStudy.js'

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

it('refuses unsupported assertions and a non-mechanism declaration without inventing grades', async () => {
	const fixture = await loadStudyToolsFixture()
	const manifest = fixture.manifest
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
	const adapter = createStudyAdapter()
	const input = { manifest, rubric: fixture.rubric, attempts: [], evidence: {} }
	expect(adapter.grade(input).every((judgment) => judgment.verdict === 'unknown')).toBe(true)
	expect(() =>
		adapter.grade({
			...input,
			manifest: { ...manifest, definition: { ...manifest.definition, purpose: 'quality' } },
		}),
	).toThrow('declaration')
})

it('cites the zero-based matched row as a one-based retained reference and keeps unmatched pairs unknown', () => {
	const rows: readonly StudyEvidence[] = [
		{ event: 'tool', goal: 'save', value: { name: 'write', success: true } },
		{ event: 'tool', goal: 'save', value: { name: 'read', success: true } },
	]
	const target = {
		trial: { id: 'r1-s1-a1', scenario: 'write', arm: 'agent', repetition: 0 },
		criterion: {
			id: 'read',
			scenario: 'write',
			goal: 'save',
			method: 'trace' as const,
			critical: false,
			assertion: { observation: 'tool', name: 'read', success: true },
		},
		attempt: undefined,
		evidence: rows,
	}
	expect(readStudyToolsGrade(target)).toEqual({
		verdict: 'achieved',
		method: 'trace',
		reason: 'Retained observation matches the independent predicate',
		references: [{ file: 'evidence', row: 1 }],
	})
	expect(
		readStudyToolsGrade({
			...target,
			criterion: { ...target.criterion, assertion: { observation: 'denial', name: 'read' } },
		}),
	).toEqual({
		verdict: 'unknown',
		method: 'trace',
		reason: 'No retained observation for the declared predicate',
		references: [],
	})
	expect(() =>
		readStudyToolsGrade({
			...target,
			criterion: { ...target.criterion, assertion: { unsupported: true } },
		}),
	).toThrow('Unsupported')
})

it('reads a request predicate by position', () => {
	const rows: readonly StudyEvidence[] = [
		{
			event: 'provider',
			goal: 'foreign',
			value: { request: [{ role: 'system', content: 'Keep notes.' }] },
		},
		{
			event: 'provider',
			goal: 'save',
			value: {
				request: [
					{ role: 'system', content: 'Keep notes.' },
					{ role: 'user', content: 'Save the note.' },
				],
			},
		},
		{ event: 'tool', goal: 'save', value: { name: 'write', success: true } },
		{ event: 'provider', goal: 'save', value: { request: [{ role: 'tool', content: 'stored' }] } },
	]
	const request = {
		observation: 'request' as const,
		at: 0,
		role: 'system' as const,
		text: 'Keep notes.',
		present: true,
	}
	expect(readStudyToolsRequest(request, 'save', rows)).toEqual({ verdict: 'achieved', row: 1 })
	expect(readStudyToolsRequest({ ...request, present: false }, 'save', rows)).toEqual({
		verdict: 'unsuccessful',
		row: 1,
	})
	expect(readStudyToolsRequest({ ...request, text: 'Absent.' }, 'save', rows)).toEqual({
		verdict: 'unsuccessful',
		row: 1,
	})
	expect(
		readStudyToolsRequest({ ...request, text: 'Absent.', present: false }, 'save', rows),
	).toEqual({ verdict: 'achieved', row: 1 })
	// A text held by another role reads as absent from the asserted role.
	expect(readStudyToolsRequest({ ...request, text: 'Save the note.' }, 'save', rows)).toEqual({
		verdict: 'unsuccessful',
		row: 1,
	})
	// The position counts the goal's requests, and the citation names the retained row.
	expect(
		readStudyToolsRequest({ ...request, at: 1, role: 'tool', text: 'stored' }, 'save', rows),
	).toEqual({ verdict: 'achieved', row: 3 })
	expect(readStudyToolsRequest({ ...request, at: 2 }, 'save', rows)).toEqual({
		verdict: 'unknown',
		row: undefined,
	})
	expect(readStudyToolsPredicate(request, 'save', rows)).toEqual({ verdict: 'achieved', row: 1 })
	expect(() =>
		readStudyToolsRequest(request, 'save', [
			{ event: 'provider', goal: 'save', value: { request: 'text' } },
		]),
	).toThrow(expect.objectContaining({ code: 'EVIDENCE' }))
	expect(() =>
		readStudyToolsRequest(request, 'save', [
			{ event: 'provider', goal: 'save', value: { request: [{ role: 'user' }] } },
		]),
	).toThrow(expect.objectContaining({ code: 'EVIDENCE' }))
})

it('reads a memo predicate', () => {
	const rows: readonly StudyEvidence[] = [
		{ event: 'memo', goal: 'revise', value: { name: 'reach', revisions: 1 } },
		{
			event: 'memo',
			goal: 'revise',
			value: { name: 'tone', revisions: 2, description: 'Prefers bullet lists.' },
		},
	]
	const memo = {
		observation: 'memo' as const,
		name: 'tone',
		revisions: 2,
		description: 'Prefers bullet lists.',
	}
	expect(readStudyToolsPredicate(memo, 'revise', rows)).toEqual({ verdict: 'achieved', row: 1 })
	expect(readStudyToolsPredicate({ ...memo, revisions: 1 }, 'revise', rows)).toEqual({
		verdict: 'unsuccessful',
		row: 1,
	})
	expect(readStudyToolsPredicate({ ...memo, description: 'Absent.' }, 'revise', rows)).toEqual({
		verdict: 'unsuccessful',
		row: 1,
	})
	expect(
		readStudyToolsPredicate({ observation: 'memo', name: 'gossip', revisions: 0 }, 'revise', rows),
	).toEqual({ verdict: 'unknown', row: undefined })
	expect(() =>
		readStudyToolsPredicate(memo, 'revise', [
			{ event: 'memo', goal: 'revise', value: { name: 'tone' } },
		]),
	).toThrow(expect.objectContaining({ code: 'EVIDENCE' }))
})

it('counts tool rows for a predicate', () => {
	const rows: readonly StudyEvidence[] = [
		{ event: 'tool', goal: 'load', value: { name: 'skill', success: false } },
		{ event: 'tool', goal: 'load', value: { name: 'skill', success: true } },
		{ event: 'tool', goal: 'load', value: { name: 'memo', success: true } },
		{ event: 'tool', goal: 'load', value: { name: 'skill', success: false } },
	]
	expect(
		readStudyToolsPredicate(
			{ observation: 'tool', name: 'skill', success: true, count: 1 },
			'load',
			rows,
		),
	).toEqual({ verdict: 'achieved', row: 1 })
	expect(
		readStudyToolsPredicate(
			{ observation: 'tool', name: 'skill', success: true, count: 2 },
			'load',
			rows,
		),
	).toEqual({ verdict: 'unsuccessful', row: 1 })
	expect(
		readStudyToolsPredicate(
			{ observation: 'tool', name: 'skill', success: false, count: 2 },
			'load',
			rows,
		),
	).toEqual({ verdict: 'achieved', row: 3 })
	expect(
		readStudyToolsPredicate(
			{ observation: 'tool', name: 'write', success: true, count: 1 },
			'load',
			rows,
		),
	).toEqual({ verdict: 'unknown', row: undefined })
})
