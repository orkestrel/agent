import { createTool, createToolManager } from '@orkestrel/tool'
import { createAgentContext } from '@src/core'
import { describe, expect, it } from 'vitest'

// The Ollama-free agent factories — plain registry / store / context builders plus
// createAgent, all needing no daemon. `createOllama` (the live-Ollama
// factory) is split out to the dedicated `src:ollama` project. createAgent's loop
// logic is pinned in Agent.test.ts; here we only assert the factory wires a provider
// into a working AgentInterface that runs one turn to its result.

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

	it('exposes a pre-built tool registry via context.tools', () => {
		const tools = createToolManager()
		tools.add(createTool({ name: 'now', execute: () => Date.now() }))
		const context = createAgentContext({ tools })

		expect(context.tools).toBe(tools)
		expect(context.tools.count).toBe(1)
		// Tools are structural — the prompt never carries them.
		expect(context.build()).toEqual([])
	})
})
