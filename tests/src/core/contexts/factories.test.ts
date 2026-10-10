import { createTool, createToolManager } from '@orkestrel/tool'
import { createAgentContext } from '@src/core'
import { describe, expect, it } from 'vitest'

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
