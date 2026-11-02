import { expect, it } from 'vitest'
import {
	isStudyToolsAgent,
	isStudyToolsAssertion,
	isStudyToolsFile,
	isStudyToolsFileName,
	isStudyToolsInput,
	isStudyToolsName,
	isStudyToolsNames,
	isStudyToolsRead,
	isStudyToolsRemember,
	isStudyToolsResponse,
	isStudyToolsRuntime,
	isStudyToolsWrite,
} from '../../../studies/tools/validators.js'
import { parseStudyToolsInput } from '../../../studies/tools/parsers.js'
import { isStudyToolsRefusal, StudyToolsRefusal } from '../../../studies/tools/errors.js'
import { ScriptedReads } from '../../setup.js'
import {
	STUDY_TOOLS_LIBRARY_ASSERTIONS,
	STUDY_TOOLS_LIBRARY_INPUT,
	STUDY_TOOLS_MALFORMED_ASSERTIONS,
	STUDY_TOOLS_MALFORMED_LIBRARIES,
	loadStudyToolsFixture,
} from '../../setupStudy.js'

it('validates actual admitted constructors and bounds every declared workload without coercion', async () => {
	const fixture = await loadStudyToolsFixture()
	expect(isStudyToolsRuntime(fixture.agent)).toBe(true)
	expect(isStudyToolsRuntime({})).toBe(false)
	expect(isStudyToolsRuntime({ Agent: () => undefined })).toBe(false)
	expect(
		isStudyToolsRuntime(
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
	expect(isStudyToolsRuntime({ Agent: function Agent() {} })).toBe(false)
	expect(isStudyToolsRuntime({ Agent: function Agent() {}, createScope: () => undefined })).toBe(
		true,
	)
	expect(
		isStudyToolsRuntime({
			get Agent() {
				throw new Error('getter')
			},
		}),
	).toBe(false)
	expect(isStudyToolsAgent({})).toBe(false)
	expect(
		isStudyToolsAgent({
			generate: async () => undefined,
			abort: () => undefined,
			get context() {
				throw new Error('getter')
			},
		}),
	).toBe(false)
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
	// The optional approval admits only the three declared answers.
	for (const approval of ['approve', 'refuse', 'pending'])
		expect(
			isStudyToolsInput({
				prompt: 'x',
				admitted: true,
				approval,
				files: [],
				responses: [{ content: 'x', calls: [] }],
			}),
		).toBe(true)
	for (const approval of ['allow', '', true, null, undefined])
		expect(
			isStudyToolsInput({
				prompt: 'x',
				admitted: true,
				approval,
				files: [],
				responses: [{ content: 'x', calls: [] }],
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
	const call = { id: 'c1', name: 'read', arguments: { path: 'note.txt' } }
	expect(isStudyToolsResponse({ content: 'a'.repeat(1024), calls: [call, call, call, call] })).toBe(
		true,
	)
	expect(isStudyToolsResponse({ content: 'a'.repeat(1025), calls: [] })).toBe(false)
	expect(isStudyToolsResponse({ content: 'x', calls: [call, call, call, call, call] })).toBe(false)
	expect(isStudyToolsResponse({ content: 'x', calls: [], consume: 'a'.repeat(128) })).toBe(true)
	expect(isStudyToolsResponse({ content: 'x', calls: [], consume: 'a'.repeat(129) })).toBe(false)
	expect(isStudyToolsResponse({ content: 'x', calls: [], consume: '' })).toBe(false)
	// A foreign proxy that passes the shared guard and then throws on a later read stays total.
	const refusals = new ScriptedReads<boolean>([false], true)
	const hostile = new Proxy(
		{ content: '', calls: [] },
		{
			get(target, key, receiver) {
				if (key === 'content' && refusals.read()) throw new Error('Later read refused')
				return Reflect.get(target, key, receiver)
			},
		},
	)
	expect(isStudyToolsResponse(hostile)).toBe(false)
	expect(refusals.reported).toEqual([false, true])
	expect(() => parseStudyToolsInput({})).toThrow('Invalid')
})

it('validates independent state/trace schemas and exact operation arguments', () => {
	expect(isStudyToolsFileName('note.txt')).toBe(true)
	expect(isStudyToolsFileName('con.txt')).toBe(false)
	expect(isStudyToolsFileName('note.txt/other')).toBe(false)
	expect(isStudyToolsFileName('note\\other.txt')).toBe(false)
	expect(isStudyToolsWrite({ path: '../escape.txt', content: 'x' })).toBe(true)
	expect(isStudyToolsWrite({ path: 'note.txt', content: 'x', extra: true })).toBe(false)
	// A declared call whose arguments carry no `path` is refused by the write guard that owns them.
	expect(isStudyToolsWrite({ name: '../escape', content: 'x' })).toBe(false)
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

it('admits the library goal members', () => {
	expect(isStudyToolsInput(STUDY_TOOLS_LIBRARY_INPUT)).toBe(true)
	expect(isStudyToolsNames(['tone', 'reach'])).toBe(true)
	expect(isStudyToolsNames(['con'])).toBe(false)
	expect(isStudyToolsNames('tone')).toBe(false)
	const memo = { name: 'tone', description: 'Prefers short replies.', content: 'Answer briefly.' }
	expect(isStudyToolsRemember(memo)).toBe(true)
	expect(isStudyToolsRemember({ ...memo, extra: true })).toBe(false)
	expect(isStudyToolsRemember({ ...memo, content: 'a'.repeat(1025) })).toBe(false)
	expect(isStudyToolsName({ name: 'review' })).toBe(true)
	expect(isStudyToolsName({ name: 'review', content: 'Injected body.' })).toBe(false)
	expect(isStudyToolsName({ name: 'a'.repeat(1025) })).toBe(false)
})

it('refuses malformed library members', () => {
	expect(isStudyToolsInput(STUDY_TOOLS_LIBRARY_INPUT)).toBe(true)
	expect(STUDY_TOOLS_MALFORMED_LIBRARIES).toHaveLength(9)
	expect(STUDY_TOOLS_MALFORMED_LIBRARIES.filter((row) => isStudyToolsInput(row))).toEqual([])
})

it('admits the request and memo assertions', () => {
	expect(isStudyToolsAssertion(STUDY_TOOLS_LIBRARY_ASSERTIONS.request)).toBe(true)
	expect(isStudyToolsAssertion(STUDY_TOOLS_LIBRARY_ASSERTIONS.memo)).toBe(true)
	expect(isStudyToolsAssertion(STUDY_TOOLS_LIBRARY_ASSERTIONS.tool)).toBe(true)
})

it('refuses malformed new assertions', () => {
	expect(isStudyToolsAssertion(STUDY_TOOLS_LIBRARY_ASSERTIONS.request)).toBe(true)
	expect(isStudyToolsAssertion(STUDY_TOOLS_LIBRARY_ASSERTIONS.memo)).toBe(true)
	expect(isStudyToolsAssertion(STUDY_TOOLS_LIBRARY_ASSERTIONS.tool)).toBe(true)
	expect(STUDY_TOOLS_MALFORMED_ASSERTIONS).toHaveLength(11)
	expect(STUDY_TOOLS_MALFORMED_ASSERTIONS.filter((row) => isStudyToolsAssertion(row))).toEqual([])
})
