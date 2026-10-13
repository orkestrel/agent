import type { InstructionInterface, ScopeInterface } from '@src/core'
import { createTool, createToolManager } from '@orkestrel/tool'
import {
	createAgentContext,
	createInstruction,
	createInstructionManager,
	createScope,
	createScopeManager,
	Instruction,
	InstructionManager,
	Scope,
	ScopeManager,
} from '@src/core'
import { describe, expect, it } from 'vitest'
import { createRecorder } from '@orkestrel/test'

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
