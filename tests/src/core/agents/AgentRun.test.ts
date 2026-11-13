import type { ToolResult } from '@orkestrel/tool'
import { describe, expect, it } from 'vitest'
import { createRecorder } from '@orkestrel/test'
import { createToolManager } from '@orkestrel/tool'
import {
	BUILTIN_LIMITS,
	BUILTIN_NOTES,
	collectBuiltinDefinitions,
	createAgentContext,
	createConversation,
	createScope,
} from '@src/core'
import { AgentRun } from '../../../../src/core/agents/AgentRun.js'
import {
	BUILTIN_NAMES,
	createRecordedTool,
	createStoredConversation,
	createToolCall,
	DISCLOSURE_LOAD_BILLING,
	DISCLOSURE_RELOADED,
} from '../../../setup.js'

describe('AgentRun — the run reads its own tool for a built-in name', () => {
	it('answers a built-in name from the run and every other name from the host, after a later host add too', async () => {
		const executed = createRecorder<[Readonly<Record<string, unknown>>]>()
		const context = createAgentContext({ tools: createToolManager() })
		const echo = createRecordedTool('echo', executed)
		context.tools.add(echo)
		const run = new AgentRun(context, createConversation(), undefined, undefined, ['load'])
		const own = run.tool('load')
		context.tools.add(createRecordedTool('load', executed))

		expect(own?.name).toBe('load')
		expect(run.tool('load')).toBe(own)
		expect(context.tools.tool('load')).not.toBe(own)
		expect(run.tool('echo')).toBe(echo)
		expect(run.tool('unload')).toBeUndefined()
		const result = await run.execute(
			createToolCall({ id: 'l1', name: 'load', arguments: { skill: 'ghost' } }),
			{ signal: new AbortController().signal },
		)
		expect(result.success).toBe(false)
		expect(executed.calls).toEqual([])
		expect(
			await run.execute(createToolCall({ id: 'e1', name: 'echo' }), {
				signal: new AbortController().signal,
			}),
		).toEqual({ success: true, id: 'e1', name: 'echo', value: 'ok' })
		expect(executed.calls).toEqual([[{}]])
	})
})

describe('AgentRun — observe', () => {
	it('advertises the host tools without a built-in name, then the run tools, remember and switch only under a list that names a key', () => {
		const executed = createRecorder<[Readonly<Record<string, unknown>>]>()
		const context = createAgentContext()
		context.tools.add([createRecordedTool('echo', executed)])
		const run = new AgentRun(context, createConversation(), undefined, undefined, BUILTIN_NAMES)
		context.tools.add(createRecordedTool('memo', executed))

		run.observe()
		expect(run.advertised.map((definition) => definition.name)).toEqual([
			'echo',
			'load',
			'unload',
			'memo',
		])
		expect(run.switchable).toBe(false)

		context.apply(createScope({ name: 'empty', memos: ['tone'], workspaces: [] }))
		run.observe()
		expect(run.advertised.map((definition) => definition.name)).toEqual([
			'echo',
			'load',
			'unload',
			'memo',
			'remember',
		])
		expect(run.switchable).toBe(false)

		context.apply(createScope({ name: 'lists', memos: ['tone'], workspaces: ['north'] }))
		run.observe()
		expect(run.advertised).toEqual([
			...context.tools.definitions().filter((definition) => definition.name === 'echo'),
			...collectBuiltinDefinitions({ builtins: BUILTIN_NAMES }),
		])
		expect(run.switchable).toBe(true)
	})

	it('reports a head built with another view as stale, and the same view as current', () => {
		const context = createAgentContext()
		context.skills.add({ name: 'billing', description: 'Billing', content: 'B', tools: ['refund'] })
		// The conversation records a load of billing, so the head shows it.
		const run = new AgentRun(
			context,
			createStoredConversation(DISCLOSURE_LOAD_BILLING),
			undefined,
			undefined,
			['load', 'unload'],
		)
		const selection = { messages: [], judgments: [] }

		expect(run.observe()).toBe(true)
		run.record(selection, 2)
		expect(run.observe()).toBe(false)
		expect(run.selection).toBe(selection)
		expect(run.length).toBe(2)

		context.apply(createScope({ name: 'tools', tools: ['load'] }))
		expect(run.observe()).toBe(false)

		context.apply(createScope({ name: 'memos', memos: [] }))
		expect(run.observe()).toBe(true)
		run.record(selection, 2)
		expect(run.observe()).toBe(false)

		context.skills.add({
			name: 'billing',
			description: 'Billing',
			content: 'B2',
			tools: ['refund'],
		})
		expect(run.observe()).toBe(true)
		run.record(selection, 2)

		context.apply(createScope({ name: 'skills', memos: [], skills: [] }))
		expect(run.observe()).toBe(true)
		expect(run.disclosure).toBeUndefined()
	})

	it('reports the head stale after a rendered file changed, and current after an edit no build renders (claim A.8)', () => {
		const context = createAgentContext()
		const north = context.workspaces.add({ id: 'north' })
		north.write('notes.md', 'Order 42 is paid.')
		north.write('secret.md', 'The vault code is 7731.')
		const south = context.workspaces.add({ id: 'south' })
		context.apply(createScope({ name: 'desk', files: ['notes.md', 'draft.md'] }))
		const run = new AgentRun(context, createConversation(), undefined, undefined, [])
		const selection = { messages: [], judgments: [] }

		expect(run.observe()).toBe(true)
		run.record(selection, 2)
		expect(run.observe()).toBe(false)

		north.write('secret.md', 'The vault code is 7732.')
		south.write('south.md', 'Return 7 is open.')
		expect(run.observe()).toBe(false)

		north.write('notes.md', 'Refund approved.')
		expect(run.observe()).toBe(true)
		run.record(selection, 2)
		expect(run.observe()).toBe(false)

		north.write('draft.md', 'Draft.')
		expect(run.observe()).toBe(true)
		run.record(selection, 2)

		north.move('draft.md', 'moved.md')
		expect(run.observe()).toBe(true)
		run.record(selection, 2)

		north.remove('notes.md')
		expect(run.observe()).toBe(true)
	})
})

describe('AgentRun — the built-in handlers', () => {
	const signal = new AbortController().signal

	it('refuses an absent, blank, and excluded skill with the same text, listing the admitted names', async () => {
		const context = createAgentContext({ scope: createScope({ name: 'host', skills: ['claims'] }) })
		context.skills.add([
			{ name: 'billing', description: 'Billing', content: 'B' },
			{ name: 'claims', description: 'Claims', content: 'C' },
		])
		const run = new AgentRun(context, createConversation(), undefined, undefined, ['load'])
		const results = await Promise.all(
			['ghost', 'billing', ' ', 'claims'].map((skill) =>
				run.execute(createToolCall({ id: skill, name: 'load', arguments: { skill } }), { signal }),
			),
		)
		const errors = results.map((result) => (result.success ? undefined : result.error))

		expect(errors.slice(0, 3)).toEqual([
			'No skill you can load has that name. Use one of: "claims".',
			'No skill you can load has that name. Use one of: "claims".',
			'No skill you can load has that name. Use one of: "claims".',
		])
		expect(results[3]).toMatchObject({ success: true, value: BUILTIN_NOTES.loaded })
	})

	it('lists at most BUILTIN_LIMITS.candidates skills in registry order', async () => {
		const context = createAgentContext()
		const names = Array.from(
			{ length: BUILTIN_LIMITS.candidates + 3 },
			(_, index) => `skill${index}`,
		)
		context.skills.add(names.map((name) => ({ name, description: name, content: name })))
		const run = new AgentRun(context, createConversation(), undefined, undefined, ['load'])
		const result = await run.execute(
			createToolCall({ name: 'load', arguments: { skill: 'ghost' } }),
			{ signal },
		)
		// Twenty names, the first twenty in registry order, then the pointer to the index.
		expect(result).toMatchObject({
			success: false,
			error:
				'No skill you can load has that name. Use one of: "skill0", "skill1", "skill2", "skill3", "skill4", "skill5", "skill6", "skill7", "skill8", "skill9", "skill10", "skill11", "skill12", "skill13", "skill14", "skill15", "skill16", "skill17", "skill18", "skill19". The index in your prompt lists the others.',
		})
	})

	it('unloads only a skill the conversation records as loaded, listing the loaded ones otherwise', async () => {
		const context = createAgentContext()
		context.skills.add([
			{ name: 'billing', description: 'Billing', content: 'B' },
			{ name: 'claims', description: 'Claims', content: 'C' },
			{ name: 'audit', description: 'Audit', content: 'A' },
		])
		const run = new AgentRun(
			context,
			createStoredConversation(DISCLOSURE_RELOADED.messages),
			undefined,
			undefined,
			['load', 'unload'],
		)
		const [audit, claims] = await Promise.all(
			['audit', 'claims'].map((skill) =>
				run.execute(createToolCall({ name: 'unload', arguments: { skill } }), { signal }),
			),
		)
		expect(audit).toMatchObject({
			success: false,
			error: 'No skill you loaded has that name. Use one of: "claims", "billing".',
		})
		expect(claims).toMatchObject({ success: true, value: BUILTIN_NOTES.unloaded })
	})

	it('reads a memo the ceiling admits and refuses an absent, blank, or excluded one alike', async () => {
		const context = createAgentContext({ scope: createScope({ name: 'host', memos: ['pref'] }) })
		context.memos.add([
			{ name: 'pref', description: 'Contact preference', content: 'Email.' },
			{ name: 'secret', description: 'Hidden', content: 'Hidden.' },
		])
		const run = new AgentRun(context, createConversation(), undefined, undefined, ['memo'])
		const results = await Promise.all(
			['pref', 'secret', 'ghost', ' '].map((name) =>
				run.execute(createToolCall({ name: 'memo', arguments: { name } }), { signal }),
			),
		)
		expect(results[0]).toMatchObject({ success: true, value: 'Email.' })
		expect(results.slice(1).map((result) => (result.success ? undefined : result.error))).toEqual(
			[1, 2, 3].map(() => 'No memo you can read has that name. Use one of: "pref".'),
		)
	})

	it('writes only a listed name, creates or revises its own, and refuses a blank or multi-line member', async () => {
		const context = createAgentContext({
			scope: createScope({ name: 'host', memos: ['tone', 'pref', 'other', ' '] }),
		})
		context.memos.add({ name: 'pref', description: 'Host memo', content: 'Host.' })
		context.memos.add({
			name: 'other',
			description: 'Another thread',
			content: 'Other.',
			origin: { conversation: 'another' },
		})
		const conversation = createConversation({ id: 'thread' })
		const run = new AgentRun(context, conversation, undefined, undefined, ['remember'])
		// Each write's result, in the order the writes ran.
		const results: ToolResult[] = []
		for (const [name, description] of [
			['tone', 'Reply tone'],
			['tone', 'Reply tone, revised'],
			['ghost', 'Not listed'],
			['pref', 'Overwrite the host'],
			['other', 'Overwrite another thread'],
			[' ', 'Blank name'],
			['tone', '   '],
			['tone', 'Two\nlines'],
			['tone', 'Planted separator'],
			['tone', '\u3164'],
			['tone', ' \u034f '],
		]) {
			results.push(
				await run.execute(
					createToolCall({ name: 'remember', arguments: { name, description, content: 'Brief.' } }),
					{ signal },
				),
			)
		}
		const [created, revised, ...refused] = results

		expect([created, revised]).toMatchObject([
			{ success: true, value: BUILTIN_NOTES.remembered },
			{ success: true, value: BUILTIN_NOTES.remembered },
		])
		expect(refused.every((result) => !result.success)).toBe(true)
		expect(refused[0]).toMatchObject({
			error: 'No memo you may write has that name. Use one of: "tone", "pref", "other", " ".',
		})
		expect(context.memos.history('tone').map((memo) => [memo.description, memo.origin])).toEqual([
			['Reply tone', { conversation: 'thread' }],
			['Reply tone, revised', { conversation: 'thread' }],
		])
		expect(context.memos.history('pref')).toHaveLength(1)
		expect(context.memos.history('other')).toHaveLength(1)
		expect(context.memos.memo(' ')).toBeUndefined()
		expect(context.memos.memos().map((memo) => memo.name)).toEqual(['pref', 'other', 'tone'])
	})

	it('refuses remember and switch while the ceiling defines no list for them', async () => {
		const context = createAgentContext()
		context.workspaces.add({ id: 'north' })
		const run = new AgentRun(context, createConversation(), undefined, undefined, [
			'remember',
			'switch',
		])
		const [remembered, switched] = await Promise.all([
			run.execute(
				createToolCall({
					name: 'remember',
					arguments: { name: 'tone', description: 'Tone', content: 'Brief.' },
				}),
				{ signal },
			),
			run.execute(createToolCall({ name: 'switch', arguments: { workspace: 'north' } }), {
				signal,
			}),
		])
		expect(remembered.success || switched.success).toBe(false)
		expect(context.memos.count).toBe(0)
	})

	it('selects a listed, registered workspace without moving the active one', async () => {
		const context = createAgentContext({
			scope: createScope({ name: 'host', workspaces: ['north', 'south', 'east'] }),
		})
		context.workspaces.add({ id: 'north' })
		context.workspaces.add({ id: 'south' })
		context.workspaces.add({ id: 'west' })
		const run = new AgentRun(context, createConversation(), undefined, undefined, ['switch'])
		const results = await Promise.all(
			['south', 'west', 'east', ' '].map((workspace) =>
				run.execute(createToolCall({ name: 'switch', arguments: { workspace } }), { signal }),
			),
		)
		expect(results[0]).toMatchObject({ success: true, value: BUILTIN_NOTES.switched })
		expect(results.slice(1).map((result) => (result.success ? undefined : result.error))).toEqual(
			[1, 2, 3].map(
				() => 'No workspace you can select has that name. Use one of: "north", "south".',
			),
		)
		expect(context.workspaces.active?.id).toBe('north')
	})

	it('reads the ceiling when it runs, so a narrowing after observe refuses the call', async () => {
		const context = createAgentContext()
		context.skills.add({ name: 'billing', description: 'Billing', content: 'B' })
		context.memos.add({ name: 'pref', description: 'Pref', content: 'Email.' })
		const run = new AgentRun(
			context,
			createConversation(),
			createScope({ name: 'run', memos: ['pref'], workspaces: [] }),
			undefined,
			BUILTIN_NAMES,
		)
		run.observe()
		context.apply(createScope({ name: 'narrow', skills: [], memos: [] }))
		const [load, memo] = await Promise.all([
			run.execute(createToolCall({ name: 'load', arguments: { skill: 'billing' } }), { signal }),
			run.execute(createToolCall({ name: 'memo', arguments: { name: 'pref' } }), { signal }),
		])
		expect(load).toMatchObject({
			success: false,
			error: 'No skill you can load has that name, and none is available now.',
		})
		expect(memo).toMatchObject({
			success: false,
			error: 'No memo you can read has that name, and none is available now.',
		})
	})
})

describe('AgentRun — unload of a loaded skill (claim C.5)', () => {
	it('admits the unload of every skill the conversation records as loaded, on a run given a workspace', async () => {
		const context = createAgentContext()
		context.skills.add([
			{ name: 'billing', description: 'Billing', content: 'B' },
			{ name: 'claims', description: 'Claims', content: 'C' },
		])
		context.workspaces.add({ id: 'north' })
		const run = new AgentRun(
			context,
			createStoredConversation(DISCLOSURE_RELOADED.messages),
			undefined,
			'north',
			['load', 'unload'],
		)
		const signal = new AbortController().signal
		const results = await Promise.all(
			['billing', 'claims'].map((skill) =>
				run.execute(createToolCall({ name: 'unload', arguments: { skill } }), { signal }),
			),
		)

		expect(results).toMatchObject([
			{ success: true, value: BUILTIN_NOTES.unloaded },
			{ success: true, value: BUILTIN_NOTES.unloaded },
		])
	})
})
