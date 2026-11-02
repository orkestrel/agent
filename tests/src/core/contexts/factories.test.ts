import type { InstructionInterface, Memo, ScopeInterface, Skill } from '@src/core'
import { createTool, createToolManager } from '@orkestrel/tool'
import {
	createAgentContext,
	createDatabaseMemoStore,
	createInstruction,
	createInstructionManager,
	createMemoManager,
	createMemoryMemoStore,
	createScope,
	createScopeManager,
	createSkillManager,
	Instruction,
	InstructionManager,
	MemoManager,
	Scope,
	ScopeManager,
	SkillManager,
} from '@src/core'
import { createMemoryDriver } from '@orkestrel/database'
import { describe, expect, it } from 'vitest'
import { createRecorder } from '@orkestrel/test'
import { buildMemoSnapshot, MEMO_STORE_FACTORIES } from '../../../setup.js'

describe('createInstruction', () => {
	it('returns an Instruction carrying the input, with the priority defaulted to 0', () => {
		const instruction = createInstruction({ name: 'tone', content: 'Be concise.' })

		expect(instruction).toBeInstanceOf(Instruction)
		expect(instruction.name).toBe('tone')
		expect(instruction.content).toBe('Be concise.')
		expect(instruction.priority).toBe(0)
	})

	it('carries an explicit priority and override, and mints a distinct id per call', () => {
		const first = createInstruction({
			name: 'tone',
			content: 'Be concise.',
			priority: 5,
			override: 'Answer in one sentence.',
		})
		const second = createInstruction({ name: 'tone', content: 'Be concise.' })

		expect(first.priority).toBe(5)
		expect(first.override).toBe('Answer in one sentence.')
		expect(first.id).not.toBe(second.id)
	})
})

describe('createInstructionManager', () => {
	it('returns an empty InstructionManager on the built-in framing', () => {
		const manager = createInstructionManager()

		expect(manager).toBeInstanceOf(InstructionManager)
		expect(manager.count).toBe(0)
		expect(manager.open).toBe('## Instructions')
		expect(manager.close).toBeUndefined()
	})

	it('returns an independent manager per call', () => {
		const first = createInstructionManager()
		const second = createInstructionManager()
		first.add({ name: 'tone', content: 'Be concise.' })

		expect(first).not.toBe(second)
		expect(second.count).toBe(0)
	})

	it('forwards the on hooks to the manager emitter', () => {
		const added = createRecorder<[instruction: InstructionInterface]>()
		const manager = createInstructionManager({ on: { add: added.handler } })

		const instruction = manager.add({ name: 'tone', content: 'Be concise.' })

		expect(added.calls).toEqual([[instruction]])
	})

	it('forwards the error handler that receives a listener throw', () => {
		const errors = createRecorder<readonly [error: unknown, event: string]>()
		const manager = createInstructionManager({ error: errors.handler })
		manager.emitter.on('add', () => {
			throw new Error('the add observer failed')
		})

		manager.add({ name: 'tone', content: 'Be concise.' })

		expect(errors.calls).toEqual([[expect.any(Error), 'add']])
	})

	it('forwards the format override to open, render, and close', () => {
		const manager = createInstructionManager({
			format: {
				open: '<rules>',
				render: (instruction) => `- ${instruction.content}`,
				close: '</rules>',
			},
		})
		const instruction = manager.add({ name: 'tone', content: 'Be concise.' })

		expect(manager.open).toBe('<rules>')
		expect(manager.render(instruction)).toBe('- Be concise.')
		expect(manager.close).toBe('</rules>')
	})
})

describe('createScope', () => {
	it('returns a Scope carrying the name and the allow-lists', () => {
		const scope = createScope({ name: 'reader', tools: ['search', 'read'], files: [] })

		expect(scope).toBeInstanceOf(Scope)
		expect(scope.name).toBe('reader')
		expect(scope.tools).toEqual(['search', 'read'])
		expect(scope.files).toEqual([])
		expect(scope.instructions).toBeUndefined()
	})

	it('returns a scope whose narrow intersects its lists', () => {
		const reader = createScope({ name: 'reader', tools: ['search', 'read'] })

		expect(reader.narrow({ tools: ['read', 'write'] }).tools).toEqual(['read'])
	})
})

describe('createScopeManager', () => {
	it('returns an empty ScopeManager', () => {
		const manager = createScopeManager()

		expect(manager).toBeInstanceOf(ScopeManager)
		expect(manager.count).toBe(0)
		expect(manager.scopes()).toEqual([])
	})

	it('returns an independent manager per call', () => {
		const first = createScopeManager()
		const second = createScopeManager()
		first.add({ name: 'reader' })

		expect(first).not.toBe(second)
		expect(second.count).toBe(0)
	})

	it('forwards the on hooks to the manager emitter', () => {
		const added = createRecorder<[scope: ScopeInterface]>()
		const manager = createScopeManager({ on: { add: added.handler } })

		const scope = manager.add({ name: 'reader', tools: ['search'] })

		expect(added.calls).toEqual([[scope]])
	})

	it('forwards the error handler that receives a listener throw', () => {
		const errors = createRecorder<readonly [error: unknown, event: string]>()
		const manager = createScopeManager({ error: errors.handler })
		manager.emitter.on('add', () => {
			throw new Error('the add observer failed')
		})

		const scope = manager.add({ name: 'reader' })

		expect(manager.scope(scope.id)).toBe(scope)
		expect(errors.calls).toEqual([[expect.any(Error), 'add']])
	})
})

describe('createMemoManager', () => {
	it('returns an empty MemoManager on the built-in framing', () => {
		const manager = createMemoManager()

		expect(manager).toBeInstanceOf(MemoManager)
		expect(manager.count).toBe(0)
		expect(manager.open).toBe('## Memos')
		expect(manager.close).toBeUndefined()
	})

	it('returns an independent manager per call', () => {
		const first = createMemoManager()
		const second = createMemoManager()
		first.add({ name: 'tone', description: 'Short replies.', content: 'Answer briefly.' })

		expect(first).not.toBe(second)
		expect(first.id).not.toBe(second.id)
		expect(second.count).toBe(0)
	})

	it('forwards the id, the on hooks, and the format override', () => {
		const added = createRecorder<[memo: Memo]>()
		const manager = createMemoManager({
			id: 'ada',
			on: { add: added.handler },
			format: { open: '<memos>', close: '</memos>' },
		})

		const memo = manager.add({ name: 'tone', description: 'Short replies.', content: 'v1' })

		expect(manager.id).toBe('ada')
		expect(added.calls).toEqual([[memo]])
		expect([manager.open, manager.close]).toEqual(['<memos>', '</memos>'])
	})

	it('forwards the error handler that receives a listener throw', () => {
		const errors = createRecorder<readonly [error: unknown, event: string]>()
		const manager = createMemoManager({ error: errors.handler })
		manager.emitter.on('add', () => {
			throw new Error('the add observer failed')
		})

		manager.add({ name: 'tone', description: 'Short replies.', content: 'v1' })

		expect(errors.calls).toEqual([[expect.any(Error), 'add']])
	})

	it('restores a snapshot', () => {
		const source = createMemoManager({ id: 'ada' })
		source.add({ name: 'tone', description: 'Short replies.', content: 'v1' })

		const restored = createMemoManager({ snapshot: source.snapshot() })

		expect(restored.snapshot()).toEqual(source.snapshot())
	})
})

describe.each(MEMO_STORE_FACTORIES)('%s memo store', (_label, create) => {
	it('round trips every revision', async () => {
		const store = create()
		const snapshot = buildMemoSnapshot(4, 'ada')

		await store.set(snapshot)

		expect(await store.get('ada')).toEqual(snapshot)
	})

	it('replaces a set stored under its id', async () => {
		const store = create()
		const second = buildMemoSnapshot(2, 'ada')

		await store.set(buildMemoSnapshot(4, 'ada'))
		await store.set(second)

		expect(await store.get('ada')).toEqual(second)
	})

	it('drops a set on delete', async () => {
		const store = create()

		await store.set(buildMemoSnapshot(4, 'ada'))
		expect(await store.get('ada')).toBeDefined()
		await store.delete('ada')

		expect(await store.get('ada')).toBeUndefined()
	})

	it('ignores a delete of an absent id', async () => {
		await expect(create().delete('never-stored')).resolves.toBeUndefined()
	})

	it('reads an absent id as undefined', async () => {
		expect(await create().get('never-stored')).toBeUndefined()
	})

	it('keeps two ids apart', async () => {
		const store = create()
		const beta = buildMemoSnapshot(2, 'beta')

		await store.set(buildMemoSnapshot(4, 'alpha'))
		await store.set(beta)
		await store.delete('alpha')

		expect(await store.get('alpha')).toBeUndefined()
		expect(await store.get('beta')).toEqual(beta)
	})
})

describe('createMemoryMemoStore', () => {
	it('returns an independent store per call', async () => {
		const first = createMemoryMemoStore()
		const second = createMemoryMemoStore()

		await first.set(buildMemoSnapshot(4, 'ada'))

		expect(await second.get('ada')).toBeUndefined()
	})
})

describe('createDatabaseMemoStore', () => {
	it('stores through the supplied driver', async () => {
		const driver = createMemoryDriver()
		const snapshot = buildMemoSnapshot(4, 'ada')

		await createDatabaseMemoStore(driver).set(snapshot)

		expect(await createDatabaseMemoStore(driver).get('ada')).toEqual(snapshot)
	})

	it('defaults to a fresh memory driver', async () => {
		const first = createDatabaseMemoStore()
		const second = createDatabaseMemoStore()

		await first.set(buildMemoSnapshot(4, 'ada'))

		expect(await second.get('ada')).toBeUndefined()
	})
})

describe('createSkillManager', () => {
	it('returns an empty SkillManager on the built-in framing', () => {
		const manager = createSkillManager()

		expect(manager).toBeInstanceOf(SkillManager)
		expect(manager.count).toBe(0)
		expect(manager.open).toBe('## Skills')
		expect(manager.close).toBeUndefined()
	})

	it('returns an independent manager per call', () => {
		const first = createSkillManager()
		const second = createSkillManager()
		first.add({ name: 'review', description: 'Reviews a change.', content: 'Read the diff.' })

		expect(first).not.toBe(second)
		expect(second.count).toBe(0)
	})

	it('forwards the on hooks and the format override', () => {
		const added = createRecorder<[skill: Skill]>()
		const manager = createSkillManager({
			on: { add: added.handler },
			format: { render: (skill) => `* ${skill.name}` },
		})

		const skill = manager.add({ name: 'review', description: 'Reviews.', content: 'Read.' })

		expect(added.calls).toEqual([[skill]])
		expect(manager.render(skill)).toBe('* review')
	})

	it('forwards the error handler that receives a listener throw', () => {
		const errors = createRecorder<readonly [error: unknown, event: string]>()
		const manager = createSkillManager({ error: errors.handler })
		manager.emitter.on('add', () => {
			throw new Error('the add observer failed')
		})

		manager.add({ name: 'review', description: 'Reviews.', content: 'Read.' })

		expect(errors.calls).toEqual([[expect.any(Error), 'add']])
	})
})

describe('createAgentContext', () => {
	it('builds [system?, ...messages] from a system prompt + a couple messages', () => {
		const context = createAgentContext({ system: 'You are concise.' })
		context.messages.add([
			{ role: 'user', content: 'one' },
			{ role: 'assistant', content: 'two' },
		])

		const built = context.build()

		expect(built.map((message) => message.role)).toEqual(['system', 'user', 'assistant'])
		expect(built.map((message) => message.content)).toEqual(['You are concise.', 'one', 'two'])
	})

	it('exposes a pre-built tool registry through context.tools', () => {
		const tools = createToolManager()
		tools.add(createTool({ name: 'now', execute: () => Date.now() }))
		const context = createAgentContext({ tools })

		expect(context.tools).toBe(tools)
		expect(context.tools.count).toBe(1)
		// Tools are structural — the prompt never carries them.
		expect(context.build()).toEqual([])
	})
})
