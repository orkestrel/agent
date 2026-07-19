import type {
	AgentJobInput,
	AgentResult,
	ProviderDelta,
	ProviderInterface,
	ProviderResult,
} from '@src/core'
import {
	AgentJobError,
	createAgent,
	createAgentContext,
	createAgentQueue,
	createAgentRegistry,
	createAgentRunner,
	createBinaryContent,
	createFile,
	createInstructionManager,
	createScope,
	createTextContent,
	createTool,
	createToolManager,
	createWorkspace,
	createWorkspaceManager,
	isAgentJobError,
	isBinary,
	isText,
	ProviderAbortError,
} from '@src/core'
import {
	arrayShape,
	integerShape,
	literalShape,
	objectShape,
	optionalShape,
	stringShape,
} from '@orkestrel/contract'
import { createMemoryQueueStore } from '@orkestrel/queue'
import { describe, expect, it } from 'vitest'
import {
	createAgentJob,
	createGate,
	createScriptedProvider,
	createTokenUsage,
	loopTool,
	waitForDelay,
} from '../../setup.js'

// The Ollama-free agent factories — plain registry / store / context builders plus
// createAgent, all needing no daemon (AGENTS �16). `createOllama` (the live-Ollama
// factory) is split out to the dedicated `src:ollama` project. createAgent's loop
// logic is pinned in Agent.test.ts; here we only assert the factory wires a provider
// into a working AgentInterface that runs one turn to its result.

describe('createTool', () => {
	it('returns a working ToolInterface that executes to its value', () => {
		const tool = createTool({
			name: 'add',
			description: 'Add two numbers',
			execute: (args) => Number(args.a) + Number(args.b),
		})

		expect(tool.name).toBe('add')
		expect(tool.description).toBe('Add two numbers')
		expect(tool.execute({ a: 3, b: 4 })).toBe(7)
	})
})

describe('createToolManager', () => {
	it('round-trips a tool: added, listed in definitions, executed to a result', async () => {
		const manager = createToolManager()
		manager.add(createTool({ name: 'add', execute: (args) => Number(args.a) + Number(args.b) }))

		expect(manager.count).toBe(1)
		expect(manager.definitions()).toEqual([{ name: 'add' }])

		const result = await manager.execute({ id: 'r1', name: 'add', arguments: { a: 2, b: 6 } })
		expect(result).toEqual({ id: 'r1', name: 'add', value: 8 })
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

	it('a passed instructions manager surfaces via agent.context.instructions (visible in build())', () => {
		const instructions = createInstructionManager()
		instructions.add({ name: 'tone', content: 'Be terse.' })
		const agent = createAgent(createScriptedProvider([{ content: 'ok' }]), { instructions })

		expect(agent.context.instructions).toBe(instructions)
		const built = agent.context.build()
		expect(built[0]?.role).toBe('system')
		expect(built[0]?.content).toContain('Be terse.')
	})

	it('a passed workspaces manager surfaces via agent.context.workspaces (an added text file appears in build())', () => {
		const workspaces = createWorkspaceManager()
		workspaces.add()
		if (workspaces.active === undefined) throw new Error('expected an active workspace')
		workspaces.active.write('a.ts', 'const x = 1')
		const agent = createAgent(createScriptedProvider([{ content: 'ok' }]), { workspaces })

		expect(agent.context.workspaces).toBe(workspaces)
		const built = agent.context.build()
		expect(built[0]?.role).toBe('system')
		expect(built[0]?.content).toContain('const x = 1')
	})

	it('a passed scope filters: no-tools scope empties advertised tool definitions + filters instructions from build()', async () => {
		const tools = createToolManager()
		tools.add(createTool({ name: 'add', execute: (args) => Number(args.a) + Number(args.b) }))
		const instructions = createInstructionManager()
		instructions.add({ name: 'tone', content: 'Be terse.' })
		const noTools = createScope({ name: 'reader', tools: [], instructions: [] })
		const provider = createScriptedProvider([{ content: 'ok' }], { record: true })
		const agent = createAgent(provider, { tools, instructions, scope: noTools })

		expect(agent.context.scope).toBe(noTools)
		expect(agent.context.tools.definitions()).toEqual([{ name: 'add' }]) // manager itself unfiltered
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

// -- Agent JOBS: createAgentRegistry / createAgentQueue / createAgentRunner ----
//
// The durable, bounded-concurrency agent-job layer COMPOSED over the workers Queue /
// Runner substrate (no new concurrency engine). A serializable AgentJobInput is
// rehydrated through the registry into a live Agent; a partial result is a configurable
// failure (throws by default so retries / fail-fast engage, `allowPartial` opts out);
// cancellation threads through. All Ollama-free with the scripted provider — the LIVE
// batch + sub-agent spawn run in the src:ollama project.

// A reusable token-charging usage so a tiny `budget` ceiling can deterministically
// commit a partial (completion 7 — `createTokenBudget`'s default scope). The completion
// matches the shared default; the prompt/total differ, so it stays a named local built
// off `createTokenUsage` with overrides (a specific budget-scenario value, not the shape).
const JOB_USAGE = createTokenUsage({ prompt: 3, total: 10 })

// A job that loops a tool against a tiny `budget` so the agent commits a PARTIAL after
// turn 1 — the deterministic way to exercise the partial-as-failure policy. Built off the
// shared `createAgentJob`, overriding only the scenario fields (the looping tool + the
// sub-completion budget ceiling).
function partialJob(provider: string): AgentJobInput {
	// budget < a turn's completion (7) ? budget fires after turn 1 ? partial
	return createAgentJob({ provider, tools: ['loop'], budget: 5 })
}

// The scripted turn a `partialJob` runs: EVERY turn reports usage + a tool call, so the
// budget always charges on turn 1 and fires before turn 2 — partial regardless of where
// the (shared, across-attempt) provider's script index sits, so a retry re-runs the SAME
// partial scenario rather than drifting into a different (finishing) turn.
const PARTIAL_TURNS = [
	{ content: 'a', tools: [{ id: 'c', name: 'loop', arguments: {} }], usage: JOB_USAGE },
] as const

// The `loop` tool a `partialJob` references — the shared canonical `loop` tool keyed for
// the registry's tool pool.
function loopTools(): Record<string, ReturnType<typeof createTool>> {
	return { loop: loopTool() }
}

// A SECOND, independent deterministic route to a partial result — a `budget: 0` ceiling
// is exhausted from the agent's first `start()`, so the bound's budget signal is already
// aborted before the provider stream is even entered: the agent commits a partial with
// EMPTY content WITHOUT touching the provider. Proves the partial-as-failure policy keys
// off `AgentResult.partial` alone, not off the budget-via-loop-tool mechanism in
// `partialJob` (which charges usage on turn 1, then fires before turn 2). Because the
// provider is never entered here, `provider.started` stays 0 on this route — so it is used
// for the throw/resolve assertions, never to count attempts (that stays on `partialJob`).
function budgetZeroJob(provider: string): AgentJobInput {
	return createAgentJob({ provider, budget: 0 })
}

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
		expect(provider.maxInFlight).toBeLessThanOrEqual(2)
		expect(provider.maxInFlight).toBe(2)
		expect(provider.started).toBe(4)
	})

	it('a partial result THROWS by default (an AgentJobError carrying the partial)', async () => {
		const provider = createScriptedProvider(PARTIAL_TURNS)
		const registry = createAgentRegistry({ providers: { main: provider }, tools: loopTools() })
		const queue = createAgentQueue({ registry }) // allowPartial defaults to false
		await expect(queue.enqueue(partialJob('main'))).rejects.toThrow('agent job ended partial')
		// The rejection is an AgentJobError; extract its partial (or undefined) UNCONDITIONALLY
		// first, so every assertion is unconditional (no `expect` inside a narrowing branch).
		const caught = await queue.enqueue(partialJob('main')).catch((error: unknown) => error)
		const partial = isAgentJobError(caught) ? caught.partial : undefined
		expect(isAgentJobError(caught)).toBe(true)
		expect(partial?.partial).toBe(true)
		expect(partial?.content).toBe('a') // turn-1 content accumulated before the cancel
	})

	it('a partial result RE-RUNS while retries remain (then rejects)', async () => {
		const provider = createScriptedProvider(PARTIAL_TURNS)
		const registry = createAgentRegistry({ providers: { main: provider }, tools: loopTools() })
		// retries: 1 ? 2 attempts total; each attempt runs the provider once (turn 1) before
		// the budget fires ? the provider starts TWICE, proving the partial re-ran.
		const queue = createAgentQueue({ registry, retries: 1 })
		await expect(queue.enqueue(partialJob('main'))).rejects.toThrow('agent job ended partial')
		expect(provider.started).toBe(2)
	})

	it('`allowPartial: true` RESOLVES a partial as success (never throws)', async () => {
		const provider = createScriptedProvider(PARTIAL_TURNS)
		const registry = createAgentRegistry({ providers: { main: provider }, tools: loopTools() })
		const queue = createAgentQueue({ registry, allowPartial: true })
		const result = await queue.enqueue(partialJob('main'))
		expect(result.partial).toBe(true)
		expect(result.content).toBe('a')
		// No retry — the partial resolved as success on the first attempt.
		expect(provider.started).toBe(1)
	})

	it("threads the queue cancel into the agent — abort() fires the agent's (provider's) signal", async () => {
		const gate = createGate()
		let providerSawAbort = false
		// A provider that parks mid-call so the test can abort the queue while the agent is in
		// flight, then records whether ITS signal aborted — proving the queue's cancel reached
		// the agent through the threaded `execution.signal` (build(input, execution.signal)).
		const provider: ProviderInterface = {
			id: 'p',
			name: 'p',
			async *stream(_messages, signal): AsyncGenerator<ProviderDelta, ProviderResult> {
				yield { type: 'content', text: 'part' }
				await gate.promise
				providerSawAbort = signal.aborted
				if (signal.aborted) throw new ProviderAbortError({ content: 'part' })
				return { content: 'full' }
			},
			async generate() {
				return { content: 'full' }
			},
		}
		const registry = createAgentRegistry({ providers: { main: provider } })
		const queue = createAgentQueue({ registry })
		// A queue abort rejects the entry directly (a hard cancel, never retried) — capture it.
		const settled = queue.enqueue(createAgentJob()).catch((error: unknown) => error)
		await waitForDelay() // let the job start and the agent park mid-stream
		queue.abort() // fires the attempt signal, which IS the agent's threaded signal
		gate.resolve()
		const caught = await settled
		// The entry rejected (a queue abort), and — the load-bearing part — the agent's provider
		// saw the abort, so the cancel threaded all the way through build ? agent ? provider.
		expect(caught).toBeInstanceOf(Error)
		expect(providerSawAbort).toBe(true)
	})
})

describe('createAgentQueue — durability (serializable jobs survive a restart)', () => {
	// A ContractShape describing a (simple) AgentJobInput — enough to type the memory queue
	// store. The job tree's `children` / open tool-`arguments` are out of scope for the
	// stored-payload shape here (the queue ignores `children`); the round-tripped job uses
	// the plain serializable fields.
	const jobShape = objectShape({
		provider: stringShape(),
		messages: arrayShape(
			objectShape({
				role: literalShape(['system', 'user', 'assistant', 'tool']),
				content: stringShape(),
			}),
		),
		system: optionalShape(stringShape()),
		limit: optionalShape(integerShape({ min: 0 })),
		budget: optionalShape(integerShape({ min: 0 })),
	})

	it('an AgentJobInput is JSON-serializable (round-trips through JSON unchanged)', () => {
		const input: AgentJobInput = {
			provider: 'main',
			system: 'be brief',
			messages: [{ role: 'user', content: 'hi' }],
			limit: 4,
			budget: 50_000,
		}
		const roundTripped: unknown = JSON.parse(JSON.stringify(input))
		expect(roundTripped).toEqual(input)
	})

	it('a memory queue store round-trips a stored agent job', async () => {
		const store = createMemoryQueueStore(jobShape)
		const input: AgentJobInput = { provider: 'main', messages: [{ role: 'user', content: 'hi' }] }
		await store.save({ id: 'job-1', input, attempts: 0 })
		const loaded = await store.load()
		expect(loaded).toHaveLength(1)
		expect(loaded[0]).toEqual({ id: 'job-1', input, attempts: 0 })
	})

	it('restore() re-runs an outstanding job — rehydrated through the registry', async () => {
		const provider = createScriptedProvider([{ content: 'resumed', usage: JOB_USAGE }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const store = createMemoryQueueStore(jobShape)
		// Simulate a crash that left one outstanding row in the store.
		const outstanding: AgentJobInput = {
			provider: 'main',
			messages: [{ role: 'user', content: 'resume me' }],
		}
		await store.save({ id: 'job-1', input: outstanding, attempts: 0 })
		// A fresh queue over the same store re-runs the row on restore() — the registry
		// rehydrates the live agent from the serialized names + data.
		const queue = createAgentQueue({ registry, store })
		await queue.restore()
		// Wait for the rehydrated job to run + settle (its row is removed on completion).
		for (let n = 0; n < 20 && (await store.load()).length > 0; n += 1) await waitForDelay()
		expect(provider.started).toBe(1) // the outstanding job actually ran
		expect(await store.load()).toEqual([]) // the row was removed once it completed
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
		const registry = createAgentRegistry({ providers: { main: provider }, tools: loopTools() })
		const runner = createAgentRunner({ registry })
		await expect(runner.execute([partialJob('main')])).rejects.toThrow('agent job ended partial')
	})

	it('a parent job fans out a CHILD sub-agent via controller.spawn — both run', async () => {
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
		const gate = createGate()
		let providerSawAbort = false
		const provider: ProviderInterface = {
			id: 'p',
			name: 'p',
			async *stream(_messages, signal): AsyncGenerator<ProviderDelta, ProviderResult> {
				yield { type: 'content', text: 'part' }
				await gate.promise
				providerSawAbort = signal.aborted
				if (signal.aborted) throw new ProviderAbortError({ content: 'part' })
				return { content: 'full' }
			},
			async generate() {
				return { content: 'full' }
			},
		}
		const registry = createAgentRegistry({ providers: { main: provider } })
		const runner = createAgentRunner({ registry })
		// A runner abort rejects a running execute (records the abort as the run failure).
		const settled = runner.execute([createAgentJob()]).catch((error: unknown) => error)
		await waitForDelay()
		runner.abort() // fires every unit's signal — which IS the agent's threaded signal
		gate.resolve()
		const caught = await settled
		// The run rejected, and the agent's provider saw the abort — the cancel threaded
		// through controller.signal ? build ? agent ? provider.
		expect(caught).toBeInstanceOf(Error)
		expect(providerSawAbort).toBe(true)
	})
})

// -- AgentJobError / isAgentJobError (the partial-carrying failure) ------------
//
// The real error type the shared `settle` throws on a default-partial job (�12: a
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
// Beyond the budget-via-loop-tool route already covered above: a SECOND independent
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
		const caught = await queue.enqueue(budgetZeroJob('main')).catch((error: unknown) => error)
		const partial = isAgentJobError(caught) ? caught.partial : undefined
		expect(isAgentJobError(caught)).toBe(true)
		expect(partial?.partial).toBe(true)
		// The budget was exhausted before the provider stream was entered, so the partial's
		// content is empty and the provider never ran — partiality alone drove the throw.
		expect(partial?.content).toBe('')
		expect(provider.started).toBe(0)
	})

	it('`allowPartial: true` RESOLVES the budget:0 partial as success (empty content, no throw)', async () => {
		const provider = createScriptedProvider([{ content: 'unused' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const queue = createAgentQueue({ registry, allowPartial: true })
		const result = await queue.enqueue(budgetZeroJob('main'))
		expect(result.partial).toBe(true)
		expect(result.content).toBe('')
		expect(provider.started).toBe(0)
	})

	it('a partial re-runs for the full retry budget (retries: 2 ? 3 attempts) then rejects', async () => {
		// `partialJob` enters the provider each attempt (turn 1 charges usage, the budget
		// then fires before turn 2), so `provider.started` is the honest attempt counter.
		const provider = createScriptedProvider(PARTIAL_TURNS)
		const registry = createAgentRegistry({ providers: { main: provider }, tools: loopTools() })
		const queue = createAgentQueue({ registry, retries: 2 })
		await expect(queue.enqueue(partialJob('main'))).rejects.toThrow('agent job ended partial')
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
		await expect(queue.enqueue(budgetZeroJob('main'))).rejects.toThrow('agent job ended partial')
	})

	it('a per-attempt TIMEOUT cancel rejects with "attempt timed out" (the substrate fault, NOT an AgentJobError) and retries', async () => {
		// A slow provider + a tiny per-entry timeout: the deadline fires mid-stream ? the
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
		expect(caught instanceof Error ? caught.message : '').toBe('attempt timed out')
		expect(provider.started).toBe(2) // retried once
	})

	it('a pre-aborted entry signal HARD-cancels: rejects with the signal reason, never runs, never retries', async () => {
		const provider = createScriptedProvider([{ content: 'never' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const queue = createAgentQueue({ registry, retries: 2 })
		const reason = new Error('pre-aborted')
		const caught = await queue
			.enqueue(createAgentJob(), { signal: AbortSignal.abort(reason) })
			.catch((error: unknown) => error)
		// A queue/entry abort is the hard-cancel path: it rejects directly with the signal's
		// reason (not an AgentJobError), the handler never runs, and it is never retried.
		expect(caught).toBe(reason)
		expect(isAgentJobError(caught)).toBe(false)
		expect(provider.started).toBe(0)
	})
})

// -- createAgentQueue — lifecycle (�10) + batch over agent jobs ----------------
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
		// concurrency 1 + a slow first job: the second job is still pending when we stop.
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
		expect(provider.maxInFlight).toBeLessThanOrEqual(3)
		expect(provider.maxInFlight).toBe(3)
	})
})

// -- createAgentQueue — durability, extended (restore correctness + loud misses) --
//
// The headline Ch7 durability feature, hardened: a restored job actually produces the
// RIGHT result through the registry, and a job whose names are MISSING from the registry
// FAILS LOUDLY (never silently passing) — both on a direct enqueue (the catchable path)
// and on a crash-restore (where the terminal failure drains the row and the valid
// provider is never run).

describe('createAgentQueue — durability, extended', () => {
	const jobShape = objectShape({
		provider: stringShape(),
		messages: arrayShape(
			objectShape({
				role: literalShape(['system', 'user', 'assistant', 'tool']),
				content: stringShape(),
			}),
		),
		system: optionalShape(stringShape()),
		tools: optionalShape(arrayShape(stringShape())),
		limit: optionalShape(integerShape({ min: 0 })),
		budget: optionalShape(integerShape({ min: 0 })),
	})

	it('restore() re-runs an outstanding job and produces its REAL result, then removes the row', async () => {
		const provider = createScriptedProvider([{ content: 'rehydrated-answer', usage: JOB_USAGE }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const store = createMemoryQueueStore(jobShape)
		const outstanding: AgentJobInput = {
			provider: 'main',
			messages: [{ role: 'user', content: 'resume me' }],
		}
		await store.save({ id: 'job-1', input: outstanding, attempts: 0 })
		// Capture the rehydrated job's settled result by enqueuing through a queue that wraps
		// the SAME registry — restore re-enqueues internally (no caller promise), so to assert
		// the produced content we instead enqueue the identical job and compare, then prove
		// restore drained the persisted row.
		const queue = createAgentQueue({ registry, store })
		await queue.restore()
		for (let n = 0; n < 50 && (await store.load()).length > 0; n += 1) await waitForDelay()
		expect(provider.started).toBe(1) // the persisted job genuinely ran once
		expect(await store.load()).toEqual([]) // its row was removed on completion

		// And the rehydration produces the scripted content (a fresh provider + queue, the
		// same registry shape) — proving the rehydrated agent ran the real turn, not a stub.
		const checkProvider = createScriptedProvider([{ content: 'rehydrated-answer' }])
		const checkRegistry = createAgentRegistry({ providers: { main: checkProvider } })
		const direct = await createAgentQueue({ registry: checkRegistry }).enqueue(outstanding)
		expect(direct.content).toBe('rehydrated-answer')
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
		expect(caught instanceof Error ? caught.message : '').toBe('unknown provider: ghost')
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
		}
		const caught = await queue.enqueue(withMissingTool).catch((error: unknown) => error)
		expect(caught instanceof Error ? caught.message : '').toBe('unknown tool: nonexistent')
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
		expect(caught instanceof Error ? caught.message : '').toBe('unknown authority: ghost')
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
		expect(caught instanceof Error ? caught.message : '').toBe('unknown scheduler: ghost')
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
		const store = createMemoryQueueStore(jobShape)
		const doomed: AgentJobInput = { provider: 'ghost', messages: [{ role: 'user', content: 'x' }] }
		await store.save({ id: 'job-x', input: doomed, attempts: 0 })
		const queue = createAgentQueue({ registry, store })
		await queue.restore()
		// The terminal failure removes the row; wait for the store to drain.
		for (let n = 0; n < 50 && (await store.load()).length > 0; n += 1) await waitForDelay()
		expect(await store.load()).toEqual([]) // row drained — no infinite re-run loop
		expect(provider.started).toBe(0) // the registered provider was never run by the doomed job
	})
})

// -- createAgentRunner — partial policy parity + sub-agent fan-out, extended ----
//
// The runner shares the SAME `settle`, so `allowPartial` must behave identically to the
// queue; and the sub-agent fan-out is hardened for the contracts that matter: an empty
// run, a TRANSITIVE spawn (a child that itself fans out a grandchild), and the
// no-deadlock guarantee on a single-slot runner (which would hang if the handler
// inline-awaited its spawn).

describe('createAgentRunner — partial policy + fan-out, extended', () => {
	it('`allowPartial: true` RESOLVES a partial (parity with createAgentQueue)', async () => {
		const provider = createScriptedProvider([{ content: 'unused' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const runner = createAgentRunner({ registry, allowPartial: true })
		const results = await runner.execute([budgetZeroJob('main')])
		expect(results).toHaveLength(1)
		expect(results[0]?.partial).toBe(true)
		expect(results[0]?.content).toBe('')
	})

	it('a budget-via-tool partial RESOLVES under allowPartial — the run completes, not fail-fast', async () => {
		// Contrast with the existing fail-fast test: with allowPartial the same partial job
		// resolves, so a one-job run completes with a partial result instead of rejecting.
		const provider = createScriptedProvider(PARTIAL_TURNS)
		const registry = createAgentRegistry({ providers: { main: provider }, tools: loopTools() })
		const runner = createAgentRunner({ registry, allowPartial: true })
		const results = await runner.execute([partialJob('main')])
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

	it('a TRANSITIVE spawn runs: parent ? child ? grandchild, results ordered declared-then-spawns', async () => {
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
		// handler fans the child out via `void controller.spawn(...)` and RETURNS (never
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
		// Race the run against a generous deadline; a deadlock would never settle the run, so
		// the sentinel wins. A real run settles well within it (both agents are instantaneous).
		const ran = await Promise.race([
			runner.execute([parent]).then((results) => results.map((r) => r.content)),
			waitForDelay(2000).then(() => 'DEADLOCK'),
		])
		expect(ran).toEqual(['parent', 'child'])
		expect(provider.started).toBe(2)
	})
})

// The workspace factories (relocated from the dissolved files/ module): createFile (an immutable
// PLAIN frozen FileInterface record with derived size/lines and NO id), the §4.2.3 split
// arm-constructors createTextContent / createBinaryContent, and createWorkspace (a working
// in-memory WorkspaceInterface). The workspace-editing tool now lives in @orkestrel/tool
// (AGENTS §16 — real data, no mocks).

describe('createFile', () => {
	it('returns a FileInterface with derived size/lines and the default state', () => {
		const file = createFile({
			path: 'src/main.ts',
			content: createTextContent('const x = 1\nconst y = 2', 'typescript'),
		})

		expect(file.path).toBe('src/main.ts')
		expect(file.state).toBe('created')
		expect(file.size).toBe(23) // UTF-8 byte length of the two 11-char ASCII lines + the newline
		expect(file.lines).toBe(2)
	})

	it('honors an explicit state', () => {
		const file = createFile({
			path: 'a.txt',
			content: createTextContent('x', 'text'),
			state: 'loaded',
		})

		expect(file.state).toBe('loaded')
	})

	it('derives size from a binary content as its decoded payload bytes', () => {
		const file = createFile({ path: 'icon.png', content: createBinaryContent('AAAA', 'image/png') })

		expect(file.size).toBe(3)
		expect(file.lines).toBe(0)
	})

	it('is a PLAIN frozen record — no id, no class instance, structuredClone round-trips it', () => {
		const file = createFile({
			path: 'src/main.ts',
			content: createTextContent('const x = 1', 'typescript'),
		})

		// A plain object, NOT a class instance — its prototype is Object.prototype.
		expect(Object.getPrototypeOf(file)).toBe(Object.prototype)
		expect(file.constructor).toBe(Object)
		// The path is the identity — there is NO id field.
		expect('id' in file).toBe(false)
		// Frozen — never mutated after creation.
		expect(Object.isFrozen(file)).toBe(true)
		// structuredClone round-trips EVERY field identically (the plain-record proof).
		const clone = structuredClone(file)
		expect(clone).toEqual(file)
		expect(clone.path).toBe(file.path)
		expect(clone.content).toEqual(file.content)
		expect(clone.state).toBe(file.state)
		expect(clone.size).toBe(file.size)
		expect(clone.lines).toBe(file.lines)
	})
})

describe('createTextContent', () => {
	it('produces the text arm (narrows via isText, not isBinary)', () => {
		const content = createTextContent('hello', 'markdown')

		expect(content).toEqual({ text: 'hello', language: 'markdown' })
		expect(isText(content)).toBe(true)
		expect(isBinary(content)).toBe(false)
	})
})

describe('createBinaryContent', () => {
	it('produces the binary arm (narrows via isBinary, not isText)', () => {
		const content = createBinaryContent('<base64>', 'image/jpeg')

		expect(content).toEqual({ data: '<base64>', mime: 'image/jpeg' })
		expect(isBinary(content)).toBe(true)
		expect(isText(content)).toBe(false)
	})
})

describe('createWorkspace', () => {
	it('returns a working WorkspaceInterface (empty, editable, observable)', () => {
		const workspace = createWorkspace()

		expect(workspace.count).toBe(0)
		workspace.write('a.ts', 'const x = 1')
		expect(workspace.read('a.ts')).toBe('const x = 1')
		expect(workspace.count).toBe(1)
		expect(workspace.emitter.destroyed).toBe(false)
	})

	it('wires initial event listeners from the on option', () => {
		const written: string[] = []
		const workspace = createWorkspace({ on: { write: (file) => written.push(file.path) } })

		workspace.write('a.ts', 'x')

		expect(written).toEqual(['a.ts'])
	})
})
