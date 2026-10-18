import type { AgentJobInput, AgentResult } from '@src/core'
import { AgentFanout, createAgentRegistry, isAgentJobError } from '@src/core'
import { createRunner } from '@orkestrel/workflow'
import { describe, expect, it } from 'vitest'
import {
	createAgentJob,
	createLoopTool,
	createScriptedProvider,
	createTurnRegistry,
} from '../../../setup.js'

// Exercises the per-runner fan-out through a real runner, its retries included.

describe('AgentFanout', () => {
	it("spawns a unit's declared children once when its failed first attempt retries", async () => {
		// Attempt 1 exhausts `limit: 1` on a tool turn (partial ⇒ AgentJobError ⇒ retry); attempt 2
		// answers. The child provider's start count shows how many times the child ran.
		const parent = createScriptedProvider(
			[{ content: '', tools: [{ id: 'c', name: 'loop', arguments: {} }] }, { content: 'parent' }],
			{ repeat: false },
		)
		const child = createScriptedProvider([{ content: 'child' }])
		const registry = createAgentRegistry({
			providers: { main: parent, child },
			tools: { loop: createLoopTool() },
		})
		const fanout = new AgentFanout(registry, false)
		const runner = createRunner<AgentJobInput, AgentResult>({
			handler: fanout.execute.bind(fanout),
			retries: 1,
			concurrency: 2,
		})
		const results = await runner.execute([
			createAgentJob({
				tools: ['loop'],
				limit: 1,
				children: [createAgentJob({ provider: 'child' })],
			}),
		])
		expect(parent.started).toBe(2)
		expect(child.started).toBe(1)
		expect(results.map((result) => result.content)).toEqual(['parent', 'child'])
	})

	it('spawns the children of every distinct unit it executes', async () => {
		const child = createScriptedProvider([{ content: 'child' }])
		const registry = createAgentRegistry({
			providers: { main: createScriptedProvider([{ content: 'parent' }]), child },
		})
		const fanout = new AgentFanout(registry, false)
		const runner = createRunner<AgentJobInput, AgentResult>({
			handler: fanout.execute.bind(fanout),
			concurrency: 2,
		})
		const parent = createAgentJob({ children: [createAgentJob({ provider: 'child' })] })
		const results = await runner.execute([parent, parent])
		expect(child.started).toBe(2)
		expect(results.map((result) => result.content)).toEqual(['parent', 'parent', 'child', 'child'])
	})

	it('settles a partial unit under the policy it was created with', async () => {
		// A `budget: 0` job is born exhausted, so its agent commits an empty partial.
		const job = createAgentJob({ budget: 0 })
		const lenient = new AgentFanout(createTurnRegistry({ content: 'unused' }), true)
		const resolved = await createRunner<AgentJobInput, AgentResult>({
			handler: lenient.execute.bind(lenient),
		}).execute([job])
		expect(resolved.map((result) => [result.content, result.partial])).toEqual([['', true]])

		const strict = new AgentFanout(createTurnRegistry({ content: 'unused' }), false)
		const caught = await createRunner<AgentJobInput, AgentResult>({
			handler: strict.execute.bind(strict),
		})
			.execute([job])
			.then(
				() => undefined,
				(error: unknown) => error,
			)
		expect(isAgentJobError(caught) ? caught.partial.content : undefined).toBe('')
	})
})
