import type { AgentJobInput, AgentResult } from '@src/core'
import { AgentFanout, createAgentRegistry, isAgentError, isAgentJobError } from '@src/core'
import { createRecorder } from '@orkestrel/test'
import { createRunner } from '@orkestrel/workflow'
import { describe, expect, it } from 'vitest'
import {
	FANOUT_EXCESS_CASES,
	FANOUT_JOB,
	FANOUT_WITHIN_CASES,
	createAgentJob,
	createEchoProvider,
	createFanoutFixture,
	createTurnRegistry,
} from '../../../setup.js'

// Exercises the per-runner fan-out through a real runner, its retries included.

describe('AgentFanout', () => {
	it("spawns a unit's declared children once when its failed first attempt retries", async () => {
		// Attempt 1 exhausts `limit: 1` on a tool turn (partial ⇒ AgentJobError ⇒ retry); attempt 2
		// answers. One slot runs both attempts before the child, so the turns answer in that order, and
		// the calls that carry the child's seed show how many times the child ran.
		const { main, registry } = createFanoutFixture([
			{ content: '', tools: [{ id: 'c', name: 'loop', arguments: {} }] },
			{ content: 'parent' },
			{ content: 'child' },
		])
		const fanout = new AgentFanout(registry, false)
		const runner = createRunner<AgentJobInput, AgentResult>({
			handler: fanout.execute.bind(fanout),
			retries: 1,
			concurrency: 1,
		})
		const results = await runner.execute([
			{
				...FANOUT_JOB,
				limit: 1,
				children: [createAgentJob({ messages: [{ role: 'user', content: 'child' }], limit: 1 })],
			},
		])
		expect(main.started).toBe(3)
		expect(main.calls.filter((call) => call.messages.at(-1)?.content === 'child')).toHaveLength(1)
		expect(results.map((result) => result.content)).toEqual(['parent', 'child'])
	})

	it('spawns the children of every distinct unit it executes', async () => {
		const registry = createAgentRegistry({ providers: { main: createEchoProvider() } })
		const fanout = new AgentFanout(registry, false)
		const runner = createRunner<AgentJobInput, AgentResult>({
			handler: fanout.execute.bind(fanout),
			concurrency: 2,
		})
		const parent = createAgentJob({
			messages: [{ role: 'user', content: 'parent' }],
			children: [createAgentJob({ messages: [{ role: 'user', content: 'child' }] })],
		})
		const results = await runner.execute([parent, parent])
		expect(results.map((result) => result.content)).toEqual([
			'ok:parent',
			'ok:parent',
			'ok:child',
			'ok:child',
		])
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

	it.each(FANOUT_WITHIN_CASES)('spawns a child $name', async ({ parent, child }) => {
		const { main, registry } = createFanoutFixture([{ content: 'parent' }, { content: 'child' }])
		const fanout = new AgentFanout(registry, false)
		const results = await createRunner<AgentJobInput, AgentResult>({
			handler: fanout.execute.bind(fanout),
		}).execute([{ ...parent, children: [child] }])
		expect(results.map((result) => result.content)).toEqual(['parent', 'child'])
		expect(main.started).toBe(2)
	})

	it.each(FANOUT_EXCESS_CASES)(
		'refuses a child with $name before any unit spawns or runs',
		async ({ member, parent, child }) => {
			const { main, other, registry } = createFanoutFixture()
			const fanout = new AgentFanout(registry, false)
			const spawns = createRecorder<readonly [id: string, parent: string | undefined]>()
			const caught = await createRunner<AgentJobInput, AgentResult>({
				handler: fanout.execute.bind(fanout),
				on: { spawn: spawns.handler },
			})
				.execute([{ ...parent, children: [child] }])
				.catch((error: unknown) => error)
			expect(isAgentError(caught) ? caught.code : caught).toBe('REGISTRY')
			expect(isAgentError(caught) ? caught.context?.['findings'] : undefined).toEqual([
				expect.stringMatching(new RegExp(`^job\\.children\\[0\\]\\.${member}: `)),
			])
			expect(spawns.count).toBe(0)
			expect(main.started + other.started).toBe(0)
		},
	)

	it('refuses a violation at depth 2 before the root or any child spawns or runs', async () => {
		const { main, other, registry } = createFanoutFixture()
		const fanout = new AgentFanout(registry, false)
		const spawns = createRecorder<readonly [id: string, parent: string | undefined]>()
		const grandchild: AgentJobInput = { ...FANOUT_JOB, tools: ['loop', 'add'] }
		const caught = await createRunner<AgentJobInput, AgentResult>({
			handler: fanout.execute.bind(fanout),
			on: { spawn: spawns.handler },
		})
			.execute([{ ...FANOUT_JOB, children: [{ ...FANOUT_JOB, children: [grandchild] }] }])
			.catch((error: unknown) => error)
		expect(isAgentError(caught) ? caught.code : caught).toBe('REGISTRY')
		expect(isAgentError(caught) ? caught.message : '').toContain(
			'job.children[0].children[0].tools',
		)
		expect(spawns.count).toBe(0)
		expect(main.started + other.started).toBe(0)
	})

	it('opens an excess refusal with the within-parent rule alone', async () => {
		const { registry } = createFanoutFixture()
		const fanout = new AgentFanout(registry, false)
		const caught = await createRunner<AgentJobInput, AgentResult>({
			handler: fanout.execute.bind(fanout),
		})
			.execute([{ ...FANOUT_JOB, children: [{ ...FANOUT_JOB, provider: 'other' }] }])
			.catch((error: unknown) => error)
		expect(isAgentError(caught) ? caught.message.split('\n') : []).toEqual([
			'a child job must stay within its parent on tools, authority, provider, scheduler, limit, timeout, and budget; enqueue a job that needs more as a root job',
			'job.children[0].provider: "other" differs from its parent\'s, which is "main"',
		])
	})

	it('refuses a malformed grandchild with its faults before the root or any child spawns or runs', async () => {
		const { main, other, registry } = createFanoutFixture()
		const fanout = new AgentFanout(registry, false)
		const spawns = createRecorder<readonly [id: string, parent: string | undefined]>()
		// A grandchild crosses its parent's `children` as a JSON record, so a misspelled key reaches the check.
		const grandchild = { provider: 'main', tool: ['loop'] }
		const caught = await createRunner<AgentJobInput, AgentResult>({
			handler: fanout.execute.bind(fanout),
			on: { spawn: spawns.handler },
		})
			.execute([{ ...FANOUT_JOB, children: [{ ...FANOUT_JOB, children: [grandchild] }] }])
			.catch((error: unknown) => error)
		const message = isAgentError(caught) ? caught.message : ''
		expect(isAgentError(caught) ? caught.code : caught).toBe('REGISTRY')
		expect(message.split('\n')[0]).toBe(
			'every job in a tree must be readable and hold only the declared members of AgentJobInput; correct each job a following finding names',
		)
		expect(message).not.toContain('a child job must stay within its parent')
		expect(message).toContain('job.children[0].children[0]: ')
		expect(message).toContain('tool: extra')
		expect(spawns.count).toBe(0)
		expect(main.started + other.started).toBe(0)
	})

	it('refuses a malformed root with the refused-job opening before anything spawns or runs', async () => {
		const { main, other, registry } = createFanoutFixture()
		const fanout = new AgentFanout(registry, false)
		const spawns = createRecorder<readonly [id: string, parent: string | undefined]>()
		const root = { provider: 'main', tool: ['loop'], children: [FANOUT_JOB] }
		const caught = await createRunner<AgentJobInput, AgentResult>({
			handler: fanout.execute.bind(fanout),
			on: { spawn: spawns.handler },
		})
			.execute([root])
			.catch((error: unknown) => error)
		const lines = isAgentError(caught) ? caught.message.split('\n') : []
		expect(isAgentError(caught) ? caught.code : caught).toBe('REGISTRY')
		expect(lines[0]).toBe(
			'every job in a tree must be readable and hold only the declared members of AgentJobInput; correct each job a following finding names',
		)
		expect(lines[1]).toMatch(/^refused job: /)
		expect(lines).not.toContain(
			'a child job must stay within its parent on tools, authority, provider, scheduler, limit, timeout, and budget; enqueue a job that needs more as a root job',
		)
		expect(spawns.count).toBe(0)
		expect(main.started + other.started).toBe(0)
	})

	it('opens a refusal with both rules when the tree holds both kinds of finding', async () => {
		const { registry } = createFanoutFixture()
		const fanout = new AgentFanout(registry, false)
		const malformed = { provider: 'main', tool: ['loop'] }
		const caught = await createRunner<AgentJobInput, AgentResult>({
			handler: fanout.execute.bind(fanout),
		})
			.execute([
				{
					...FANOUT_JOB,
					children: [
						{ ...FANOUT_JOB, provider: 'other' },
						{ ...FANOUT_JOB, children: [malformed] },
					],
				},
			])
			.catch((error: unknown) => error)
		expect(isAgentError(caught) ? caught.message.split('\n').slice(0, 2) : []).toEqual([
			'every job in a tree must be readable and hold only the declared members of AgentJobInput; correct each job a following finding names',
			'a child job must stay within its parent on tools, authority, provider, scheduler, limit, timeout, and budget; enqueue a job that needs more as a root job',
		])
	})

	it('checks a retried root again and refuses a child widened after its first attempt', async () => {
		// Attempt 1 exhausts `limit: 1` on a tool turn and retries. The root's children read the
		// provider's start count, so attempt 2 reads a child on another provider.
		const { main, registry } = createFanoutFixture([
			{ content: '', tools: [{ id: 'c', name: 'loop', arguments: {} }] },
			{ content: 'unused' },
		])
		const fanout = new AgentFanout(registry, false)
		const within: AgentJobInput = { ...FANOUT_JOB, limit: 1 }
		const widened: AgentJobInput = { ...within, provider: 'other' }
		const caught = await createRunner<AgentJobInput, AgentResult>({
			handler: fanout.execute.bind(fanout),
			retries: 1,
		})
			.execute([
				{
					...FANOUT_JOB,
					limit: 1,
					get children() {
						return main.started === 0 ? [within] : [widened]
					},
				},
			])
			.catch((error: unknown) => error)
		expect(isAgentError(caught) ? caught.code : caught).toBe('REGISTRY')
		expect(isAgentError(caught) ? caught.context?.['findings'] : undefined).toEqual([
			'job.children[0].provider: "other" differs from its parent\'s, which is "main"',
		])
		expect(main.started).toBe(1)
	})

	it('spawns and runs every unit of a clean tree three levels below its root', async () => {
		const { main, registry } = createFanoutFixture([
			{ content: 'root' },
			{ content: 'child' },
			{ content: 'grandchild' },
			{ content: 'sibling' },
			{ content: 'leaf' },
		])
		const fanout = new AgentFanout(registry, false)
		const spawns = createRecorder<readonly [id: string, parent: string | undefined]>()
		const results = await createRunner<AgentJobInput, AgentResult>({
			handler: fanout.execute.bind(fanout),
			on: { spawn: spawns.handler },
		}).execute([
			{
				...FANOUT_JOB,
				messages: [{ role: 'user', content: 'root' }],
				children: [
					{
						...FANOUT_JOB,
						messages: [{ role: 'user', content: 'child' }],
						children: [
							{
								...FANOUT_JOB,
								messages: [{ role: 'user', content: 'grandchild' }],
								children: [{ ...FANOUT_JOB, messages: [{ role: 'user', content: 'leaf' }] }],
							},
							{ ...FANOUT_JOB, messages: [{ role: 'user', content: 'sibling' }] },
						],
					},
				],
			},
		])
		expect(spawns.count).toBe(4)
		expect(main.calls.map((call) => call.messages.at(-1)?.content)).toEqual([
			'root',
			'child',
			'grandchild',
			'sibling',
			'leaf',
		])
		expect(results.map((result) => result.content)).toEqual([
			'root',
			'child',
			'grandchild',
			'sibling',
			'leaf',
		])
	})
})
