import type { AgentJobInput, AgentResult } from '@src/core'
import type { QueueEventMap } from '@orkestrel/queue'
import { createRecorder, requireValue, waitForCondition, waitForEvent } from '@orkestrel/test'
import { JOB_USAGE, PARTIAL_TURNS, createObservedGatedProvider } from '../../../setup.js'
import { createContract, isRecord, numberShape, objectShape } from '@orkestrel/contract'
import { createTool, createToolManager } from '@orkestrel/tool'
import { createWorkspaceManager } from '@orkestrel/workspace'
import {
	createAgent,
	createAgentQueue,
	createAgentRegistry,
	createAgentRunner,
	createApprover,
	createChannel,
	createInstructionManager,
	createScope,
	AgentJobError,
	isAgentError,
	isAgentJobError,
	ProviderAbortError,
	BUILTIN_TOOLS,
	createBuiltinTool,
	loadToolShape,
	memoToolShape,
	rememberToolShape,
} from '@src/core'
import { createMemoryQueueStore, isQueueError } from '@orkestrel/queue'
import { describe, expect, it } from 'vitest'
import {
	AGENT_JOB_SHAPE,
	AGENT_AUTHORITY,
	AGENT_SCRIPT_OPTIONS,
	createAgentJob,
	createScriptedProvider,
	createLoopTool,
	BUILTIN_ARGUMENT_CASES,
	BUILTIN_NAMES,
	DURABLE_JOB,
	createDurableStoreShape,
	callToRequest,
	collectRenderedNames,
	createDurableFixture,
	createDurablePools,
	createToolCall,
	filterOutsideCeiling,
	readDurableRendered,
} from '../../../setup.js'
import { collect, roundTripJSON, waitForDelay } from '@orkestrel/test'

// Exercises agent factory wiring and durable job orchestration.

describe('createChannel', () => {
	it('hands back a working channel — pushed values drain in write order, then close ends it', async () => {
		const channel = createChannel<number>()
		channel.push(1)
		channel.push(2)
		channel.close()

		expect(await collect(channel.drain())).toEqual([1, 2])
	})

	it('delivers the buffered values before surfacing a failure', async () => {
		const channel = createChannel<string>()
		channel.push('first')
		channel.fail(new Error('broken'))

		const iterator = channel.drain()
		await expect(iterator.next()).resolves.toEqual({ done: false, value: 'first' })
		await expect(iterator.next()).rejects.toThrow('broken')
	})
})

describe('createAgent', () => {
	it('returns an agent that runs one turn to its result', async () => {
		const agent = createAgent(createScriptedProvider([{ content: 'pong' }]))
		expect(typeof agent.id).toBe('string')
		expect(agent.status).toBe('idle')

		agent.context.messages.add({ role: 'user', content: 'ping' })
		const result = await agent.generate()

		expect(result.content).toBe('pong')
		expect(result.partial).toBe(false)
		expect(agent.status).toBe('done')
	})

	it('a passed instructions manager surfaces through agent.context.instructions (visible in build())', () => {
		const instructions = createInstructionManager()
		instructions.add({ name: 'tone', content: 'Be terse.' })
		const agent = createAgent(createScriptedProvider([{ content: 'ok' }]), { instructions })

		expect(agent.context.instructions).toBe(instructions)
		const built = agent.context.build()
		expect(built[0]?.role).toBe('system')
		expect(built[0]?.content).toContain('Be terse.')
	})

	it('a passed workspaces manager surfaces through agent.context.workspaces (an added text file appears in build())', () => {
		const workspaces = createWorkspaceManager()
		workspaces.add()
		if (workspaces.active === undefined) throw new Error('expected an active workspace')
		workspaces.active.write('a.ts', 'const x = 1')
		const agent = createAgent(createScriptedProvider([{ content: 'ok' }]), { workspaces })

		expect(agent.context.workspaces).toBe(workspaces)
		const built = agent.context.build()
		expect(built.map((message) => message.role)).toEqual(['user'])
		expect(built[0]?.content).toContain('const x = 1')
	})

	it('a passed scope filters: no-tools scope empties advertised tool definitions + filters instructions from build()', async () => {
		const tools = createToolManager()
		tools.add(
			createTool({
				name: 'add',
				contract: objectShape({ a: numberShape(), b: numberShape() }),
				execute: (args) => Number(args.a) + Number(args.b),
			}),
		)
		const instructions = createInstructionManager()
		instructions.add({ name: 'tone', content: 'Be terse.' })
		const noTools = createScope({ name: 'reader', tools: [], instructions: [] })
		const provider = createScriptedProvider([{ content: 'ok' }], { recorded: true })
		const agent = createAgent(provider, {
			tools,
			authority: AGENT_AUTHORITY,
			instructions,
			scope: noTools,
		})

		expect(agent.context.scope).toBe(noTools)
		expect(agent.context.tools.definitions().map((definition) => definition.name)).toEqual(['add']) // manager itself unfiltered
		const built = agent.context.build()
		expect(built.find((message) => message.role === 'system')).toBeUndefined() // instruction scoped out

		agent.context.messages.add({ role: 'user', content: 'go' })
		await agent.generate()
		expect(provider.calls[0]?.tools).toBeUndefined() // no tools ADVERTISED to the provider
	})

	it('omitted instructions/workspaces/scope still yield working empty managers (regression guard)', () => {
		const agent = createAgent(createScriptedProvider([{ content: 'ok' }]))

		expect(agent.context.instructions.count).toBe(0)
		expect(agent.context.workspaces.count).toBe(0)
		expect(agent.context.workspaces.active).toBeUndefined()
		expect(agent.context.scope).toBeUndefined()
		expect(agent.context.build()).toEqual([])
	})
})

// Exercises serializable jobs through real queues and runners.

describe('createApprover', () => {
	it('creates an approver with no waiting ask', () => {
		const approver = createApprover()

		expect(approver.frame({ id: 'c1', name: 'write', arguments: {} })).toBeUndefined()
		expect(approver.answer({ id: 'a1', approved: true })).toBe(false)
	})
})

describe('createAgentRegistry', () => {
	it('round-trips: build an agent from a serializable job and run it to its result', async () => {
		const provider = createScriptedProvider([{ content: 'hello', usage: JOB_USAGE }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const agent = registry.build(createAgentJob({ messages: [{ role: 'user', content: 'hi' }] }))
		const result = await agent.generate()
		expect(result.content).toBe('hello')
		expect(result.partial).toBe(false)
	})
})

describe('createAgentQueue', () => {
	it('runs several enqueued jobs, each enqueue resolving its OWN job result', async () => {
		// Distinct content per turn; the queue consumes them in FIFO order, so each enqueue
		// correlates to its own settled result.
		const provider = createScriptedProvider([
			{ content: 'one' },
			{ content: 'two' },
			{ content: 'three' },
		])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const queue = createAgentQueue({ registry, concurrency: 1 })
		const results = await Promise.all([
			queue.enqueue(createAgentJob({ messages: [{ role: 'user', content: 'a' }] })),
			queue.enqueue(createAgentJob({ messages: [{ role: 'user', content: 'b' }] })),
			queue.enqueue(createAgentJob({ messages: [{ role: 'user', content: 'c' }] })),
		])
		expect(results.map((r) => r.content)).toEqual(['one', 'two', 'three'])
		expect(results.every((r) => r.partial === false)).toBe(true)
	})

	it('bounds in-flight agent jobs by `concurrency`', async () => {
		// A slow provider (a 15ms pause per call) + 4 jobs on a concurrency-2 queue: at most
		// 2 agents generate at once. The shared provider's high-water mark proves the bound.
		const provider = createScriptedProvider([{ content: 'ok' }], { delay: 15 })
		const registry = createAgentRegistry({ providers: { main: provider } })
		const queue = createAgentQueue({ registry, concurrency: 2 })
		await Promise.all([
			queue.enqueue(createAgentJob({ messages: [{ role: 'user', content: '1' }] })),
			queue.enqueue(createAgentJob({ messages: [{ role: 'user', content: '2' }] })),
			queue.enqueue(createAgentJob({ messages: [{ role: 'user', content: '3' }] })),
			queue.enqueue(createAgentJob({ messages: [{ role: 'user', content: '4' }] })),
		])
		expect(provider.peak).toBeLessThanOrEqual(2)
		expect(provider.peak).toBe(2)
		expect(provider.started).toBe(4)
	})

	it('a partial result THROWS by default (an AgentJobError carrying the partial)', async () => {
		const provider = createScriptedProvider(PARTIAL_TURNS)
		const registry = createAgentRegistry({
			authorities: { allow: AGENT_AUTHORITY },
			providers: { main: provider },
			tools: { loop: createLoopTool() },
		})
		const queue = createAgentQueue({ registry }) // partial defaults to false
		await expect(
			queue.enqueue(
				createAgentJob({ provider: 'main', tools: ['loop'], authority: 'allow', budget: 5 }),
			),
		).rejects.toThrow('agent job ended partial')
		// The rejection is an AgentJobError; extract its partial (or undefined) UNCONDITIONALLY
		// first, so every assertion is unconditional (no `expect` inside a narrowing branch).
		const caught = await queue
			.enqueue(createAgentJob({ provider: 'main', tools: ['loop'], authority: 'allow', budget: 5 }))
			.catch((error: unknown) => error)
		const partial = isAgentJobError(caught) ? caught.partial : undefined
		expect(isAgentJobError(caught)).toBe(true)
		expect(partial?.partial).toBe(true)
		expect(partial?.content).toBe('a') // turn-1 content accumulated before the cancel
	})

	it('a partial result RE-RUNS while retries remain (then rejects)', async () => {
		const provider = createScriptedProvider(PARTIAL_TURNS)
		const registry = createAgentRegistry({
			authorities: { allow: AGENT_AUTHORITY },
			providers: { main: provider },
			tools: { loop: createLoopTool() },
		})
		// retries: 1 → 2 attempts total; each attempt runs the provider once (turn 1) before
		// the budget fires → the provider starts TWICE, proving the partial re-ran.
		const queue = createAgentQueue({ registry, retries: 1 })
		await expect(
			queue.enqueue(
				createAgentJob({ provider: 'main', tools: ['loop'], authority: 'allow', budget: 5 }),
			),
		).rejects.toThrow('agent job ended partial')
		expect(provider.started).toBe(2)
	})

	it('`partial: true` RESOLVES a partial as success (never throws)', async () => {
		const provider = createScriptedProvider(PARTIAL_TURNS)
		const registry = createAgentRegistry({
			authorities: { allow: AGENT_AUTHORITY },
			providers: { main: provider },
			tools: { loop: createLoopTool() },
		})
		const queue = createAgentQueue({ registry, partial: true })
		const result = await queue.enqueue(
			createAgentJob({ provider: 'main', tools: ['loop'], authority: 'allow', budget: 5 }),
		)
		expect(result.partial).toBe(true)
		expect(result.content).toBe('a')
		// No retry — the partial resolved as success on the first attempt.
		expect(provider.started).toBe(1)
	})

	it("threads the queue cancel into the agent — abort() fires the agent's (provider's) signal", async () => {
		const gate = Promise.withResolvers<void>()
		const aborts = createRecorder<[boolean]>()
		// A provider that parks mid-call so the test can abort the queue while the agent is in
		// flight, then records whether ITS signal aborted — proving the queue's cancel reached
		// the agent through the threaded `context.signal` (build(input, context.signal)).
		const provider = createObservedGatedProvider(gate, aborts.handler)
		const registry = createAgentRegistry({ providers: { main: provider } })
		const queue = createAgentQueue({ registry })
		// A queue abort rejects the entry directly (a hard cancel, never retried) — capture it.
		const settled = queue.enqueue(createAgentJob()).catch((error: unknown) => error)
		await waitForDelay() // let the job start and the agent park mid-stream
		queue.abort() // fires the attempt signal, which IS the agent's threaded signal
		gate.resolve()
		const caught = await settled
		// The entry rejected (a queue abort), and — the load-bearing part — the agent's provider
		// saw the abort, so the cancel threaded all the way through build → agent → provider.
		expect(caught).toBeInstanceOf(Error)
		expect(aborts.calls).toEqual([[true]])
	})
})

describe('createAgentQueue — durability (serializable jobs survive a restart)', () => {
	// A ContractShape describing a (simple) AgentJobInput — enough to type the memory queue
	// store. The job tree's `children` / open tool-`arguments` are out of scope for the
	// stored-payload shape here (the queue ignores `children`); the round-tripped job uses
	// the plain serializable fields.

	it('an AgentJobInput is JSON-serializable (round-trips through JSON unchanged)', () => {
		const input: AgentJobInput = {
			provider: 'main',
			system: 'be brief',
			messages: [{ role: 'user', content: 'hi' }],
			limit: 4,
			budget: 50_000,
		}
		const roundTripped: AgentJobInput = roundTripJSON(input)
		expect(roundTripped).toEqual(input)
	})

	it('a memory queue store round-trips a stored agent job', async () => {
		const store = createMemoryQueueStore(AGENT_JOB_SHAPE)
		const input: AgentJobInput = { provider: 'main', messages: [{ role: 'user', content: 'hi' }] }
		await store.save({ id: 'job-1', input, attempts: 0 })
		const loaded = await store.load()
		expect(loaded).toHaveLength(1)
		expect(loaded[0]).toEqual({ id: 'job-1', input, attempts: 0 })
	})
})

describe('createAgentRunner', () => {
	it('execute([jobA, jobB]) runs both, ordered (declared order)', async () => {
		const provider = createScriptedProvider([{ content: 'first' }, { content: 'second' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const runner = createAgentRunner({ registry, concurrency: 2 })
		const results = await runner.execute([
			createAgentJob({ messages: [{ role: 'user', content: 'A' }] }),
			createAgentJob({ messages: [{ role: 'user', content: 'B' }] }),
		])
		// Declared order — the runner collects results declared-first.
		expect(results.map((r) => r.content)).toEqual(['first', 'second'])
		expect(results.every((r) => r.partial === false)).toBe(true)
	})

	it('fail-fast: a partial job (throwing by default) rejects the whole run', async () => {
		const provider = createScriptedProvider(PARTIAL_TURNS)
		const registry = createAgentRegistry({
			authorities: { allow: AGENT_AUTHORITY },
			providers: { main: provider },
			tools: { loop: createLoopTool() },
		})
		const runner = createAgentRunner({ registry })
		await expect(
			runner.execute([
				createAgentJob({ provider: 'main', tools: ['loop'], authority: 'allow', budget: 5 }),
			]),
		).rejects.toThrow('agent job ended partial')
	})

	it('a parent job fans out a CHILD sub-agent through controller.spawn — both run', async () => {
		// The runner handler spawns each `children` job through the same queue (fire-and-track)
		// before running the parent. A child's `content` proves the sub-agent genuinely ran.
		const provider = createScriptedProvider([{ content: 'parent' }, { content: 'child' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const runner = createAgentRunner({ registry, concurrency: 2 })
		const parent: AgentJobInput = {
			provider: 'main',
			messages: [{ role: 'user', content: 'parent' }],
			children: [{ provider: 'main', messages: [{ role: 'user', content: 'child' }] }],
		}
		const results = await runner.execute([parent])
		// Two agents ran (the declared parent + its spawned child); results ordered
		// declared-first, then the spawn.
		expect(provider.started).toBe(2)
		expect(results).toHaveLength(2)
		expect(results.map((r) => r.content)).toEqual(['parent', 'child'])
	})

	it("threads the runner cancel — abort() rejects the run and fires the agent's signal", async () => {
		const gate = Promise.withResolvers<void>()
		const aborts = createRecorder<[boolean]>()
		const provider = createObservedGatedProvider(gate, aborts.handler)
		const registry = createAgentRegistry({ providers: { main: provider } })
		const runner = createAgentRunner({ registry })
		// A runner abort rejects a running execute (records the abort as the run failure).
		const settled = runner.execute([createAgentJob()]).catch((error: unknown) => error)
		await waitForDelay()
		runner.abort() // fires every unit's signal — which IS the agent's threaded signal
		gate.resolve()
		const caught = await settled
		// The run rejected, and the agent's provider saw the abort — the cancel threaded
		// through controller.signal → build → agent → provider.
		expect(caught).toBeInstanceOf(Error)
		expect(aborts.calls).toEqual([[true]])
	})
})

// -- AgentJobError / isAgentJobError (the partial-carrying failure) ------------
//
// The real error type the shared `settle` throws on a default-partial job (a
// real Error, not a sentinel) — it CARRIES the partial AgentResult so a caller can
// still inspect what accumulated. Mirrors ProviderAbortError / isProviderAbortError.

describe('AgentJobError / isAgentJobError', () => {
	it('constructs with a message and carries the partial AgentResult', () => {
		const partial: AgentResult = { content: 'half', partial: true }
		const error = new AgentJobError('agent job ended partial', partial)
		expect(error).toBeInstanceOf(Error)
		expect(error.name).toBe('AgentJobError')
		expect(error.message).toBe('agent job ended partial')
		// The partial is the EXACT object handed in (carried by reference, not copied).
		expect(error.partial).toBe(partial)
		expect(error.partial.content).toBe('half')
		expect(error.partial.partial).toBe(true)
	})

	it('the guard narrows a real AgentJobError to true', () => {
		const error = new AgentJobError('x', { content: '', partial: true })
		expect(isAgentJobError(error)).toBe(true)
	})

	it('the guard is false for a plain Error, a non-error, null, and undefined', () => {
		expect(isAgentJobError(new Error('plain'))).toBe(false)
		expect(isAgentJobError(new ProviderAbortError({ content: '' }))).toBe(false)
		expect(isAgentJobError('agent job ended partial')).toBe(false)
		expect(isAgentJobError({ partial: { content: '', partial: true } })).toBe(false)
		expect(isAgentJobError(null)).toBe(false)
		expect(isAgentJobError(undefined)).toBe(false)
	})
})

// -- createAgentQueue — partial-as-failure policy (the shared `settle`), extended -
//
// Beyond the loop-tool budget route already covered above: a SECOND independent
// partial route (`budget: 0`, provider untouched) proves the policy keys off
// `AgentResult.partial` alone; a deeper retry budget proves the throw re-runs the
// configured number of times; and the policy is contrasted with the two HARD-cancel
// rejections (a per-attempt timeout, a pre-aborted entry signal, a queue abort) — which
// are NOT AgentJobErrors, so the partial policy and the substrate's cancellation never
// get conflated.

describe('createAgentQueue — partial policy (shared settle), extended', () => {
	it('a budget:0 partial (provider untouched) THROWS an AgentJobError carrying the empty partial', async () => {
		const provider = createScriptedProvider([{ content: 'unused' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const queue = createAgentQueue({ registry })
		const caught = await queue
			.enqueue(createAgentJob({ provider: 'main', budget: 0 }))
			.catch((error: unknown) => error)
		const partial = isAgentJobError(caught) ? caught.partial : undefined
		expect(isAgentJobError(caught)).toBe(true)
		expect(partial?.partial).toBe(true)
		// The budget was exhausted before the provider stream was entered, so the partial's
		// content is empty and the provider never ran — partiality alone drove the throw.
		expect(partial?.content).toBe('')
		expect(provider.started).toBe(0)
	})

	it('`partial: true` RESOLVES the budget:0 partial as success (empty content, no throw)', async () => {
		const provider = createScriptedProvider([{ content: 'unused' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const queue = createAgentQueue({ registry, partial: true })
		const result = await queue.enqueue(createAgentJob({ provider: 'main', budget: 0 }))
		expect(result.partial).toBe(true)
		expect(result.content).toBe('')
		expect(provider.started).toBe(0)
	})

	it('a partial re-runs for the full retry budget (retries: 2 → 3 attempts) then rejects', async () => {
		// `partialJob` enters the provider each attempt (turn 1 charges usage, the budget
		// then fires before turn 2), so `provider.started` is the honest attempt counter.
		const provider = createScriptedProvider(PARTIAL_TURNS)
		const registry = createAgentRegistry({
			authorities: { allow: AGENT_AUTHORITY },
			providers: { main: provider },
			tools: { loop: createLoopTool() },
		})
		const queue = createAgentQueue({ registry, retries: 2 })
		await expect(
			queue.enqueue(
				createAgentJob({ provider: 'main', tools: ['loop'], authority: 'allow', budget: 5 }),
			),
		).rejects.toThrow('agent job ended partial')
		expect(provider.started).toBe(3) // initial attempt + 2 retries
	})

	it('a non-partial job RESOLVES normally while a partial sibling THROWS — same queue, same policy', async () => {
		// Two jobs through ONE registry/queue: the budget:0 job is partial (throws), the
		// plain job finishes naturally (resolves) — the policy discriminates on partiality.
		const provider = createScriptedProvider([{ content: 'fine', usage: JOB_USAGE }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const queue = createAgentQueue({ registry })
		const good = await queue.enqueue(
			createAgentJob({ messages: [{ role: 'user', content: 'ok' }] }),
		)
		expect(good.partial).toBe(false)
		expect(good.content).toBe('fine')
		await expect(queue.enqueue(createAgentJob({ provider: 'main', budget: 0 }))).rejects.toThrow(
			'agent job ended partial',
		)
	})

	it('a per-attempt TIMEOUT cancel rejects with "attempt timed out" (the substrate fault, NOT an AgentJobError) and retries', async () => {
		// A slow provider + a tiny per-entry timeout: the deadline fires mid-stream → the
		// attempt loses the race with the Queue's own deadline fault, so the rejection is the
		// substrate's `attempt timed out`, not the partial-policy AgentJobError. It still
		// retries (the timeout is a retryable attempt failure), so the provider starts twice.
		const provider = createScriptedProvider([{ content: 'slow' }], { delay: 50 })
		const registry = createAgentRegistry({ providers: { main: provider } })
		const queue = createAgentQueue({ registry, retries: 1 })
		const caught = await queue
			.enqueue(createAgentJob(), { timeout: 5 })
			.catch((error: unknown) => error)
		expect(caught).toBeInstanceOf(Error)
		expect(isAgentJobError(caught)).toBe(false)
		// The fault belongs to the substrate, so it is asserted as the substrate's
		// own error rather than as a message this package could not change. The
		// wording is queue's to name; what agent promises is that its own job error
		// is not what surfaces here.
		expect(isQueueError(caught)).toBe(true)
		expect(caught instanceof Error ? caught.message : '').toBe('queue attempt timed out')
		expect(provider.started).toBe(2) // retried once
	})

	it('a construction TIMEOUT bounds every attempt of every job and retries it', async () => {
		const provider = createScriptedProvider([{ content: 'slow' }], { delay: 50 })
		const registry = createAgentRegistry({ providers: { main: provider } })
		const queue = createAgentQueue({ registry, timeout: 5, retries: 1 })
		const caught = await queue.enqueue(createAgentJob()).catch((error: unknown) => error)
		expect(isAgentJobError(caught)).toBe(false)
		expect(isQueueError(caught) ? caught.message : undefined).toBe('queue attempt timed out')
		expect(provider.started).toBe(2)
	})

	it('a pre-aborted entry signal HARD-cancels: rejects with the signal reason, never runs, never retries', async () => {
		const provider = createScriptedProvider([{ content: 'never' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const queue = createAgentQueue({ registry, retries: 2 })
		const reason = new Error('pre-aborted')
		const caught = await queue
			.enqueue(createAgentJob(), { signal: AbortSignal.abort(reason) })
			.catch((error: unknown) => error)
		// A queue/entry abort is the hard-cancel path: the handler never runs and it is
		// never retried. The substrate reports the cancellation as its own coded error
		// and carries what the caller aborted with on `cause`, so the reason is still
		// reachable without this package unwrapping or restating it.
		expect(isAgentJobError(caught)).toBe(false)
		expect(isQueueError(caught)).toBe(true)
		expect(isQueueError(caught) ? caught.code : undefined).toBe('aborted')
		expect(caught instanceof Error ? caught.cause : undefined).toBe(reason)
		expect(provider.started).toBe(0)
	})
})

// -- createAgentQueue — lifecycle + batch over agent jobs ----------------------
//
// The substrate's lifecycle + bounded concurrency carry through the agent-job handler
// unchanged: a paused queue parks jobs without starting their agents, `stop` rejects
// pending jobs, and a large batch all resolves correctly correlated.

describe('createAgentQueue — lifecycle + batch', () => {
	it('pause parks a job (its agent never starts) until resume', async () => {
		const provider = createScriptedProvider([{ content: 'done' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const queue = createAgentQueue({ registry })
		queue.pause()
		const pending = queue.enqueue(createAgentJob())
		await waitForDelay() // give a worker a chance to (not) pick it up
		// Paused: the job is counted but its agent has NOT started.
		expect(provider.started).toBe(0)
		expect(queue.count).toBe(1)
		expect(queue.paused).toBe(true)
		queue.resume()
		const result = await pending
		expect(result.content).toBe('done')
		expect(provider.started).toBe(1)
	})

	it('stop rejects a pending (not-yet-started) job with "queue is stopped"', async () => {
		// concurrency 1 + a slow first job: the second job is still pending when the runner stops.
		const provider = createScriptedProvider([{ content: 'ok' }], { delay: 100 })
		const registry = createAgentRegistry({ providers: { main: provider } })
		const queue = createAgentQueue({ registry, concurrency: 1 })
		const first = queue
			.enqueue(createAgentJob({ messages: [{ role: 'user', content: '1' }] }))
			.catch((error: unknown) => error)
		const second = queue
			.enqueue(createAgentJob({ messages: [{ role: 'user', content: '2' }] }))
			.catch((error: unknown) => error)
		await waitForDelay() // let job 1 occupy the single slot
		queue.stop()
		const secondResult = await second
		expect(secondResult).toBeInstanceOf(Error)
		expect(secondResult instanceof Error ? secondResult.message : '').toBe('queue is stopped')
		await first // drain the in-flight one so no dangling promise
	})

	it('runs a large batch (12 jobs) bounded at concurrency 3 — each correlates to its own result', async () => {
		// 12 distinct turns; a slow provider so the bound is observable. Each enqueue resolves
		// its OWN job's content (FIFO consumption), proving correlation holds across a batch.
		const turns = Array.from({ length: 12 }, (_unused, n) => ({ content: `r${n}` }))
		const provider = createScriptedProvider(turns, { delay: 5 })
		const registry = createAgentRegistry({ providers: { main: provider } })
		const queue = createAgentQueue({ registry, concurrency: 3 })
		const inputs = Array.from({ length: 12 }, (_unused, n) =>
			createAgentJob({ messages: [{ role: 'user', content: `q${n}` }] }),
		)
		const results = await Promise.all(inputs.map((input) => queue.enqueue(input)))
		expect(results).toHaveLength(12)
		expect(results.map((r) => r.content)).toEqual(turns.map((t) => t.content))
		expect(results.every((r) => r.partial === false)).toBe(true)
		expect(provider.started).toBe(12)
		expect(provider.peak).toBeLessThanOrEqual(3)
		expect(provider.peak).toBe(3)
	})
})

// -- createAgentQueue — durability, extended (restore correctness + loud misses) --
//
// The headline durability feature, hardened: a restored job actually produces the
// RIGHT result through the registry, and a job whose names are MISSING from the registry
// FAILS LOUDLY (never silently passing) — both on a direct enqueue (the catchable path)
// and on a crash-restore (where the terminal failure drains the row and the valid
// provider is never run).

describe('createAgentQueue — durability, extended', () => {
	it('restore() re-runs an outstanding job, settles its REAL result under the stored id, then removes the row', async () => {
		const provider = createScriptedProvider([{ content: 'rehydrated-answer', usage: JOB_USAGE }], {
			recorded: true,
		})
		const registry = createAgentRegistry({ providers: { main: provider } })
		const store = createMemoryQueueStore(AGENT_JOB_SHAPE)
		// Simulate a crash that left one outstanding row in the store.
		const outstanding: AgentJobInput = {
			provider: 'main',
			messages: [{ role: 'user', content: 'resume me' }],
		}
		await store.save({ id: 'job-1', input: outstanding, attempts: 0 })
		// A fresh queue over the same store re-runs the row on restore(); restore hands back no
		// result promise, so the queue's own `success` event carries the restored job's result.
		const queue = createAgentQueue({ registry, store })
		const succeeded = waitForEvent<QueueEventMap<AgentResult>['success']>(
			(listener) => queue.emitter.on('success', listener),
			'the restored job succeeds',
		)
		await queue.restore()
		const [id, result] = await succeeded
		expect(id).toBe('job-1')
		expect(result).toEqual({ content: 'rehydrated-answer', usage: JOB_USAGE, partial: false })
		// The registry rehydrated the stored seed: the provider saw the replayed user message.
		expect(provider.calls.map((call) => call.messages.map((message) => message.content))).toEqual([
			['resume me'],
		])
		await waitForCondition('job row drained', async () => (await store.load()).length === 0)
		expect(await store.load()).toEqual([])
	})

	it('a job naming a provider MISSING from the registry rejects loudly on enqueue', async () => {
		const provider = createScriptedProvider([{ content: 'x' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const queue = createAgentQueue({ registry })
		// The registry accessor throws `unknown provider: <name>` synchronously inside the
		// handler; the Queue surfaces it as the enqueue's rejection — a loud failure, never a
		// silent pass (and not an AgentJobError — it's the registry's rehydration throw).
		const caught = await queue
			.enqueue(createAgentJob({ provider: 'ghost' }))
			.catch((error: unknown) => error)
		expect(caught).toBeInstanceOf(Error)
		expect(caught instanceof Error ? caught.message : '').toBe('unknown provider: "ghost"')
		expect(isAgentJobError(caught)).toBe(false)
		expect(provider.started).toBe(0)
	})

	it('a job naming a missing TOOL rejects loudly on enqueue (rehydration assembles the manager)', async () => {
		const provider = createScriptedProvider([{ content: 'x' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const queue = createAgentQueue({ registry })
		const withMissingTool: AgentJobInput = {
			provider: 'main',
			messages: [{ role: 'user', content: 'go' }],
			tools: ['nonexistent'],
			authority: 'allow',
		}
		const caught = await queue.enqueue(withMissingTool).catch((error: unknown) => error)
		expect(caught instanceof Error ? caught.message : '').toBe('unknown tool: "nonexistent"')
		expect(provider.started).toBe(0)
	})

	it('a job naming an AUTHORITY missing from the registry rejects loudly on enqueue', async () => {
		const provider = createScriptedProvider([{ content: 'x' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const queue = createAgentQueue({ registry })
		const caught = await queue
			.enqueue(createAgentJob({ authority: 'ghost' }))
			.catch((error: unknown) => error)
		expect(caught).toBeInstanceOf(Error)
		expect(caught instanceof Error ? caught.message : '').toBe('unknown authority: "ghost"')
		expect(isAgentJobError(caught)).toBe(false)
		expect(provider.started).toBe(0)
	})

	it('a job naming a SCHEDULER missing from the registry rejects loudly on enqueue', async () => {
		const provider = createScriptedProvider([{ content: 'x' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const queue = createAgentQueue({ registry })
		const caught = await queue
			.enqueue(createAgentJob({ scheduler: 'ghost' }))
			.catch((error: unknown) => error)
		expect(caught).toBeInstanceOf(Error)
		expect(caught instanceof Error ? caught.message : '').toBe('unknown scheduler: "ghost"')
		expect(isAgentJobError(caught)).toBe(false)
		expect(provider.started).toBe(0)
	})

	it('a restored job whose provider is MISSING fails terminally — the row is drained, the valid provider never runs', async () => {
		// A crash left a row referencing `ghost`, absent from this registry. On restore the
		// rehydration throws; with the queue default (retries: 0) the entry fails TERMINALLY,
		// which drains the durable row (at-least-once) — it does NOT loop forever, and the
		// only registered provider is never invoked by the doomed job.
		const provider = createScriptedProvider([{ content: 'never' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const store = createMemoryQueueStore(AGENT_JOB_SHAPE)
		const doomed: AgentJobInput = { provider: 'ghost', messages: [{ role: 'user', content: 'x' }] }
		await store.save({ id: 'job-x', input: doomed, attempts: 0 })
		const queue = createAgentQueue({ registry, store })
		await queue.restore()
		// The terminal failure removes the row; wait for the store to drain.
		await waitForCondition('job row drained', async () => (await store.load()).length === 0)
		expect(await store.load()).toEqual([]) // row drained — no infinite re-run loop
		expect(provider.started).toBe(0) // the registered provider was never run by the doomed job
	})
})

// -- createAgentRunner — partial policy parity + sub-agent fan-out, extended ----
//
// The runner shares the SAME `settle`, so `partial` must behave identically to the
// queue; and the sub-agent fan-out is hardened for the contracts that matter: an empty
// run, a TRANSITIVE spawn (a child that itself fans out a grandchild), and the
// single-slot parent and child completion on a single-slot runner (which would hang if the handler
// inline-awaited its spawn).

describe('createAgentRunner — partial policy + fan-out, extended', () => {
	it('`partial: true` RESOLVES a partial (parity with createAgentQueue)', async () => {
		const provider = createScriptedProvider([{ content: 'unused' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const runner = createAgentRunner({ registry, partial: true })
		const results = await runner.execute([createAgentJob({ provider: 'main', budget: 0 })])
		expect(results).toHaveLength(1)
		expect(results[0]?.partial).toBe(true)
		expect(results[0]?.content).toBe('')
	})

	it('a budget-through-tool partial RESOLVES under partial — the run completes, not fail-fast', async () => {
		// Contrast with the existing fail-fast test: with partial the same partial job
		// resolves, so a one-job run completes with a partial result instead of rejecting.
		const provider = createScriptedProvider(PARTIAL_TURNS)
		const registry = createAgentRegistry({
			authorities: { allow: AGENT_AUTHORITY },
			providers: { main: provider },
			tools: { loop: createLoopTool() },
		})
		const runner = createAgentRunner({ registry, partial: true })
		const results = await runner.execute([
			createAgentJob({ provider: 'main', tools: ['loop'], authority: 'allow', budget: 5 }),
		])
		expect(results).toHaveLength(1)
		expect(results[0]?.partial).toBe(true)
		expect(results[0]?.content).toBe('a')
	})

	it('execute([]) resolves to [] without running anything', async () => {
		const provider = createScriptedProvider([{ content: 'x' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const runner = createAgentRunner({ registry })
		const results = await runner.execute([])
		expect(results).toEqual([])
		expect(provider.started).toBe(0)
	})

	it('a TRANSITIVE spawn runs: parent → child → grandchild, results ordered declared-then-spawns', async () => {
		// The handler reads `controller.input.children` for EVERY unit it runs (declared OR
		// spawned), so a child carrying its own `children` fans out a grandchild through the
		// same bounded queue — three agents genuinely run, ordered parent, child, grandchild.
		const provider = createScriptedProvider([
			{ content: 'parent' },
			{ content: 'child' },
			{ content: 'grand' },
		])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const runner = createAgentRunner({ registry, concurrency: 3 })
		const parent: AgentJobInput = {
			provider: 'main',
			messages: [{ role: 'user', content: 'parent' }],
			children: [
				{
					provider: 'main',
					messages: [{ role: 'user', content: 'child' }],
					children: [{ provider: 'main', messages: [{ role: 'user', content: 'grand' }] }],
				},
			],
		}
		const results = await runner.execute([parent])
		expect(provider.started).toBe(3)
		expect(results).toHaveLength(3)
		// Ordered: the declared parent first, then its spawn (child), then the child's spawn
		// (grandchild) — launch order across the transitive closure.
		expect(results.map((r) => r.content)).toEqual(['parent', 'child', 'grand'])
	})

	it('a parent spawning a child on a concurrency:1 runner does NOT deadlock', async () => {
		// The single slot is held by the parent's handler while it runs the parent agent; the
		// handler fans the child out through `void controller.spawn(...)` and RETURNS (never
		// inline-awaiting it), freeing the slot for the child. If the handler inline-awaited
		// the spawn this would deadlock — so a bounded completion is the proof it fans out.
		const provider = createScriptedProvider([{ content: 'parent' }, { content: 'child' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const runner = createAgentRunner({ registry, concurrency: 1 })
		const parent: AgentJobInput = {
			provider: 'main',
			messages: [{ role: 'user', content: 'parent' }],
			children: [{ provider: 'main', messages: [{ role: 'user', content: 'child' }] }],
		}
		expect(
			await runner.execute([parent]).then((results) => results.map((result) => result.content)),
		).toEqual(['parent', 'child'])
		expect(provider.started).toBe(2)
	})

	it("spawns a parent's declared children once when its failed first attempt retries", async () => {
		// Attempt 1 exhausts `limit: 1` on a tool turn (partial ⇒ AgentJobError ⇒ retry); attempt 2
		// answers. One slot runs both attempts before the child, so the turns answer in that order, and
		// the calls that carry the child's seed show how many times the child ran.
		const provider = createScriptedProvider(
			[
				{ content: '', tools: [{ id: 'c', name: 'loop', arguments: {} }] },
				{ content: 'parent' },
				{ content: 'child' },
			],
			{ repeat: false, recorded: true },
		)
		const registry = createAgentRegistry({
			authorities: { allow: AGENT_AUTHORITY },
			providers: { main: provider },
			tools: { loop: createLoopTool() },
		})
		const runner = createAgentRunner({ registry, retries: 1, concurrency: 1 })
		const results = await runner.execute([
			createAgentJob({
				tools: ['loop'],
				authority: 'allow',
				limit: 1,
				children: [createAgentJob({ messages: [{ role: 'user', content: 'child' }], limit: 1 })],
			}),
		])
		expect(provider.started).toBe(3)
		expect(provider.calls.filter((call) => call.messages.at(-1)?.content === 'child')).toHaveLength(
			1,
		)
		expect(results.map((result) => result.content)).toEqual(['parent', 'child'])
	})

	it('fails the run with the error of a child that cannot be rehydrated', async () => {
		// The child stays within its parent, which holds `loop` under `allow`, yet names a tool and no
		// authority, which only its own rehydration refuses.
		const registry = createAgentRegistry({
			authorities: { allow: AGENT_AUTHORITY },
			providers: { main: createScriptedProvider([{ content: 'parent' }]) },
			tools: { loop: createLoopTool() },
		})
		const caught = await createAgentRunner({ registry })
			.execute([
				createAgentJob({
					tools: ['loop'],
					authority: 'allow',
					children: [createAgentJob({ tools: ['loop'] })],
				}),
			])
			.catch((error: unknown) => error)
		expect(isAgentError(caught) ? caught.context : undefined).toEqual({ tools: ['loop'] })
	})

	it("bounds each unit with the runner's per-attempt timeout and cancels its agent", async () => {
		const provider = createScriptedProvider([{ content: 'slow' }], { delay: 50, recorded: true })
		const registry = createAgentRegistry({ providers: { main: provider } })
		const runner = createAgentRunner({ registry, timeout: 5 })
		const caught = await runner.execute([createAgentJob()]).catch((error: unknown) => error)
		expect(isQueueError(caught) ? caught.message : undefined).toBe('queue attempt timed out')
		expect(provider.calls.map((call) => call.signal.aborted)).toEqual([true])
	})
})

describe('createBuiltinTool', () => {
	it.each(BUILTIN_ARGUMENT_CASES)(
		'runs the handler only on arguments the shape admits: $name',
		async ({ shape, value, admitted }) => {
			const ran = createRecorder<[Readonly<Record<string, unknown>>]>()
			const name =
				shape === loadToolShape
					? 'load'
					: shape === memoToolShape
						? 'memo'
						: shape === rememberToolShape
							? 'remember'
							: 'switch'
			const tools = createToolManager()
			tools.add(
				createBuiltinTool(name, (args) => {
					ran.handler(args)
					return 'ran'
				}),
			)
			const result = await tools.execute({
				id: 'b1',
				name,
				arguments: isRecord(value) ? value : {},
			})

			// The door repairs a number where a string is declared, losslessly, and refuses every other
			// fault: a refused row runs only when that repair alone makes the shape admit it.
			const repaired = isRecord(value)
				? Object.fromEntries(
						Object.entries(value).map(([key, member]) => [
							key,
							typeof member === 'number' ? String(member) : member,
						]),
					)
				: value
			const repairable = !admitted && createContract(shape).is(repaired)
			expect(result.success).toBe(admitted || repairable)
			expect(ran.count).toBe(admitted || repairable ? 1 : 0)
			expect(ran.calls.every(([args]) => createContract(shape).is({ ...args }))).toBe(true)
		},
	)

	it('refuses a number beside a genuine fault, and runs nothing', async () => {
		const ran = createRecorder<[Readonly<Record<string, unknown>>]>()
		const tools = createToolManager()
		tools.add(
			createBuiltinTool('load', (args) => {
				ran.handler(args)
				return 'ran'
			}),
		)
		const result = await tools.execute({
			id: 'b2',
			name: 'load',
			arguments: { skill: 1, force: true },
		})

		expect(result.success).toBe(false)
		expect(ran.count).toBe(0)
	})

	it('takes its name, description, and annotations from BUILTIN_TOOLS', () => {
		for (const name of BUILTIN_NAMES) {
			const declared = BUILTIN_TOOLS[name]
			const tool = createBuiltinTool(name, () => 'ran')
			expect([tool.name, tool.description, tool.annotations]).toEqual([
				name,
				declared.description,
				declared.annotations,
			])
		}
	})
})

describe("createAgentQueue — jobs over one registry's shared pools", () => {
	it('dispatches for a job restored from its store the requests the enqueued job dispatches', async () => {
		const job: AgentJobInput = {
			...DURABLE_JOB,
			builtins: ['load', 'memo'],
			scope: { skills: ['billing'], memos: ['pref'], workspaces: ['south'] },
			disclosure: { skills: ['billing'], workspace: 'south' },
		}
		const turns = [
			{
				content: '',
				tools: [createToolCall({ id: 'm1', name: 'memo', arguments: { name: 'pref' } })],
			},
			{ content: 'done' },
		]
		const enqueued = createDurableFixture(turns)
		await createAgentQueue({ registry: enqueued.registry }).enqueue(job)
		const restored = createDurableFixture(turns)
		const store = createMemoryQueueStore(createDurableStoreShape())
		await store.save({ id: 'job-1', input: job, attempts: 0 })
		const queue = createAgentQueue({ registry: restored.registry, store })
		const succeeded = waitForEvent<QueueEventMap<AgentResult>['success']>(
			(listener) => queue.emitter.on('success', listener),
			'the restored job succeeds',
		)
		await queue.restore()
		await succeeded
		expect(enqueued.provider.calls).toHaveLength(2)
		expect(restored.provider.calls.map(callToRequest)).toEqual(
			enqueued.provider.calls.map(callToRequest),
		)
	})

	it('runs two overlapping jobs that each advertise and render their own scope', async () => {
		const pools = createDurablePools()
		const options = { ...AGENT_SCRIPT_OPTIONS, repeat: true, delay: 20 }
		const left = createScriptedProvider(
			[
				{
					content: '',
					tools: [
						createToolCall({ id: 'l1', name: 'load', arguments: { skill: 'billing' } }),
						createToolCall({ id: 'l2', name: 'switch', arguments: { workspace: 'north' } }),
					],
				},
				{ content: 'left' },
			],
			options,
		)
		const right = createScriptedProvider(
			[
				{
					content: '',
					tools: [
						createToolCall({ id: 'r1', name: 'load', arguments: { skill: 'claims' } }),
						createToolCall({ id: 'r2', name: 'switch', arguments: { workspace: 'south' } }),
					],
				},
				{ content: 'right' },
			],
			options,
		)
		const registry = createAgentRegistry({
			providers: { left, right },
			authorities: { gate: AGENT_AUTHORITY },
			...pools,
		})
		const queue = createAgentQueue({ registry, concurrency: 2 })
		const events = createRecorder<readonly [event: string]>()
		queue.emitter.on('start', () => events.handler('start'))
		queue.emitter.on('success', () => events.handler('success'))
		const leftJob: AgentJobInput = {
			...DURABLE_JOB,
			provider: 'left',
			builtins: ['load', 'switch'],
			scope: { skills: ['billing'], memos: ['pref'], workspaces: ['north'] },
		}
		const rightJob: AgentJobInput = {
			...DURABLE_JOB,
			provider: 'right',
			builtins: ['load', 'switch'],
			scope: { skills: ['claims'], memos: ['note'], workspaces: ['south'] },
			disclosure: { skills: [], workspace: 'south' },
		}
		await Promise.all([queue.enqueue(leftJob), queue.enqueue(rightJob)])
		expect(events.calls.map(([event]) => event).slice(0, 2)).toEqual(['start', 'start'])
		expect(
			left.calls.flatMap((call) =>
				collectRenderedNames(filterOutsideCeiling(readDurableRendered(call), leftJob)),
			),
		).toEqual([])
		expect(
			right.calls.flatMap((call) =>
				collectRenderedNames(filterOutsideCeiling(readDurableRendered(call), rightJob)),
			),
		).toEqual([])
		expect(readDurableRendered(requireValue(left.calls.at(-1)))).toMatchObject({
			bodies: ['billing'],
			workspaces: ['north'],
		})
		expect(readDurableRendered(requireValue(right.calls.at(-1)))).toMatchObject({
			bodies: ['claims'],
			workspaces: ['south'],
		})
		expect(pools.workspaces.active?.id).toBe('north')
	})

	it('shows a memo one job wrote in the index of a later job whose scope lists it, and in no request of one whose scope omits it', async () => {
		const { provider, registry } = createDurableFixture([
			{
				content: '',
				tools: [
					createToolCall({
						id: 'r1',
						name: 'remember',
						arguments: { name: 'draft', description: 'DRAFT-NOTE', content: 'DRAFT-ONE' },
					}),
				],
			},
			{ content: 'written' },
			{ content: 'listed' },
			{ content: 'omitted' },
		])
		const queue = createAgentQueue({ registry })
		await queue.enqueue({
			...DURABLE_JOB,
			builtins: ['remember'],
			scope: { skills: [], memos: ['draft'], workspaces: [] },
		})
		await queue.enqueue({ ...DURABLE_JOB, scope: { skills: [], memos: ['draft'], workspaces: [] } })
		await queue.enqueue({ ...DURABLE_JOB, scope: { skills: [], memos: ['pref'], workspaces: [] } })
		// The claim reads the later jobs' requests, so the writer's own two are left out.
		expect(
			provider.calls
				.slice(2)
				.map((call) => call.messages.some((message) => message.content.includes('DRAFT-NOTE'))),
		).toEqual([true, false])
	})

	it('refuses a retried attempt the revision of the memo an earlier attempt wrote', async () => {
		const { provider, registry, pools } = createDurableFixture([
			{
				content: '',
				tools: [
					createToolCall({
						id: 'a1',
						name: 'remember',
						arguments: { name: 'retry', description: 'Retry note', content: 'ATTEMPT-ONE' },
					}),
				],
			},
			{
				content: '',
				tools: [createToolCall({ id: 'a2', name: 'memo', arguments: { name: 'pref' } })],
			},
			{
				content: '',
				tools: [
					createToolCall({
						id: 'b1',
						name: 'remember',
						arguments: { name: 'retry', description: 'Retry note', content: 'ATTEMPT-TWO' },
					}),
				],
			},
			{ content: 'done' },
		])
		const queue = createAgentQueue({ registry, retries: 1 })
		const retries = createRecorder<readonly [id: string, attempt: number]>()
		queue.emitter.on('retry', retries.handler)
		const result = await queue.enqueue({
			...DURABLE_JOB,
			builtins: ['memo', 'remember'],
			scope: { skills: [], memos: ['pref', 'retry'], workspaces: [] },
			limit: 2,
		})
		expect(retries.count).toBe(1)
		expect(result.partial).toBe(false)
		expect(provider.calls[3]?.messages.at(-1)?.content).toBe(
			'A memo with that name exists and this conversation did not write it, so it stays as it is. Read it with memo, or write a name you created.',
		)
		expect(pools.memos.history('retry')).toHaveLength(1)
		expect(pools.memos.memo('retry')?.content).toBe('ATTEMPT-ONE')
	})
})
