import { expect, it } from 'vitest'
import {
	isStudyToolsAgent,
	isStudyToolsAssertion,
	isStudyToolsFile,
	isStudyToolsFileName,
	isStudyToolsInput,
	isStudyToolsRead,
	isStudyToolsResponse,
	isStudyToolsSubject,
	isStudyToolsWrite,
} from '../../../../studies/tools/validators.js'
import { parseStudyToolsInput } from '../../../../studies/tools/parsers.js'
import { isStudyToolsRefusal, StudyToolsRefusal } from '../../../../studies/tools/errors.js'
import { loadStudyToolsFixture } from '../../../setupService.js'

it('validates actual admitted constructors and bounds every declared workload without coercion', async () => {
	const fixture = await loadStudyToolsFixture()
	expect(isStudyToolsSubject(fixture.subject)).toBe(true)
	expect(isStudyToolsSubject({})).toBe(false)
	expect(isStudyToolsSubject({ Agent: () => undefined })).toBe(false)
	expect(
		isStudyToolsSubject(
			new Proxy(
				{},
				{
					has: () => {
						throw new Error('has')
					},
				},
			),
		),
	).toBe(false)
	expect(isStudyToolsAgent({})).toBe(false)
	for (const scenario of fixture.manifest.scenarios) {
		for (const goal of scenario.goals) {
			expect(isStudyToolsInput(goal.input)).toBe(true)
			const input = parseStudyToolsInput(goal.input)
			expect(isStudyToolsInput(input)).toBe(true)
			expect(Object.isFrozen(input.responses)).toBe(true)
			expect(input.responses.every(isStudyToolsResponse)).toBe(true)
		}
	}
	expect(
		isStudyToolsInput({
			prompt: 'x',
			admitted: true,
			files: [],
			responses: [{ content: 'x', calls: [] }],
			extra: true,
		}),
	).toBe(false)
	expect(
		isStudyToolsInput({
			prompt: 'x',
			admitted: true,
			files: ['../note.txt'],
			responses: [{ content: 'x', calls: [] }],
		}),
	).toBe(false)
	expect(isStudyToolsInput({ prompt: 'x', admitted: true, files: [], responses: Array(1) })).toBe(
		false,
	)
	expect(
		isStudyToolsInput({
			prompt: 'a'.repeat(1025),
			admitted: true,
			files: [],
			responses: [{ content: 'x', calls: [] }],
		}),
	).toBe(false)
	expect(isStudyToolsResponse({ content: 'x', calls: [], tokens: NaN })).toBe(false)
	expect(
		isStudyToolsResponse({ content: 'x', calls: [], bytes: Number.MAX_SAFE_INTEGER + 1 }),
	).toBe(false)
	expect(isStudyToolsResponse({ content: 'x', calls: [], cancel: 'true' })).toBe(false)
	expect(() => parseStudyToolsInput({})).toThrow('Invalid')
})

it('validates independent state/trace schemas and exact operation arguments', () => {
	expect(isStudyToolsFileName('note.txt')).toBe(true)
	expect(isStudyToolsFileName('con.txt')).toBe(false)
	expect(isStudyToolsFileName('note.txt/other')).toBe(false)
	expect(isStudyToolsFileName('note\\other.txt')).toBe(false)
	expect(isStudyToolsWrite({ path: '../escape.txt', content: 'x' })).toBe(true)
	expect(isStudyToolsWrite({ path: 'note.txt', content: 'x', extra: true })).toBe(false)
	expect(isStudyToolsWrite({ path: 'note.txt', content: 'x'.repeat(1025) })).toBe(false)
	expect(isStudyToolsRead({ path: 'note.txt' })).toBe(true)
	expect(isStudyToolsRead({ path: 'note.txt', extra: true })).toBe(false)
	expect(
		isStudyToolsAssertion({ observation: 'file', path: 'note.txt', exists: true, content: 'x' }),
	).toBe(true)
	expect(
		isStudyToolsAssertion({ observation: 'file', path: 'note.txt', exists: false, content: 'x' }),
	).toBe(false)
	expect(isStudyToolsAssertion({ observation: 'result', partial: true })).toBe(true)
	expect(isStudyToolsAssertion({ observation: 'tool', name: 'write', success: false })).toBe(true)
	expect(isStudyToolsAssertion({ observation: 'denial', name: 'write' })).toBe(true)
	expect(isStudyToolsAssertion({ observation: 'semantic', expected: true })).toBe(false)
	expect(isStudyToolsFile({ path: 'note.txt', exists: false })).toBe(true)
	expect(isStudyToolsFile({ path: 'note.txt', exists: true, content: 'x', bytes: 1 })).toBe(true)
	expect(isStudyToolsFile({ path: 'note.txt', exists: true, content: 'x', bytes: -1 })).toBe(false)
	expect(isStudyToolsRefusal(new StudyToolsRefusal('Path refused'))).toBe(true)
	expect(isStudyToolsRefusal(new Error('ordinary'))).toBe(false)
})
