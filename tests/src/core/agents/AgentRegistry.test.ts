import type { AgentJobInput, AgentRegistryOptions, REGISTRY_OPTION_KEYS } from '@src/core'
import { isContractError } from '@orkestrel/contract'
import { describe, expect, it, expectTypeOf } from 'vitest'
import { captureError, createRecorder, invokeUnchecked, requireValue } from '@orkestrel/test'
import { createScheduler } from '@orkestrel/workflow'
import { createTool } from '@orkestrel/tool'
import {
	AUTHORITY_NOTES,
	BUILTIN_NOTES,
	createAgentRegistry,
	createAuthority,
	createMemoryConversationStore,
	isAgentError,
	isConversationError,
} from '@src/core'
import {
	AGENT_AUTHORITY,
	AGENT_USAGE,
	BUILTIN_NAMES,
	DURABLE_EMPTY_SCOPE,
	DURABLE_JOB,
	DURABLE_REFUSAL_CASES,
	DURABLE_SENTINELS,
	JOB_REFUSAL_CASES,
	buildRefusalTree,
	createFanoutFixture,
	UNDISCLOSED_DRAWS,
	UNDISCLOSED_SEED,
	drawUndisclosedCases,
	executeUndisclosedCase,
	callToRequest,
	collectRenderedNames,
	createAddTool,
	createDurableFixture,
	createDurablePools,
	createRecordedScheduler,
	createScriptedProvider,
	createToolCall,
	createTurnRegistry,
	createLoopTool,
	drawDurableHeld,
	readDurableRendered,
	buildOptionDoors,
	readDoorRefusal,
} from '../../../setup.js'

// AgentRegistry.test.ts — the MIRROR of src/core/agents/AgentRegistry.ts. Pins the
// registry's own contract (Ollama-free, a scripted provider): the accessors resolve a
// registered name and THROW a clear error on an unknown one; `build` rehydrates a seeded,
// signal-wired agent from a serializable AgentJobInput — messages seeded, system / limit
// / timeout / budget / authority / scheduler wired (asserted behaviourally, because they're
// `#private` on Agent), the cancel threaded; a `budget` number becomes a token budget;
// `tools` names resolve into the agent's manager. The job descriptor IS serializable.

describe('AgentRegistry — accessors', () => {
	it('resolves a registered provider / tool / authority / scheduler by name', () => {
		const provider = createScriptedProvider([{ content: 'ok' }])
		const tool = createAddTool()
		const authority = createAuthority({ fallback: { zone: 'default', verdict: 'allow' } })
		const scheduler = createScheduler()
		const registry = createAgentRegistry({
			providers: { main: provider },
			tools: { add: tool },
			authorities: { gate: authority },
			schedulers: { pacer: scheduler },
		})
		expect(registry.provider('main')).toBe(provider)
		expect(registry.tool('add')).toBe(tool)
		expect(registry.authority('gate')).toBe(authority)
		expect(registry.scheduler('pacer')).toBe(scheduler)
	})

	it('throws a clear, kind-specific error on an unknown name', () => {
		const registry = createTurnRegistry({ content: 'ok' })
		expect(() => registry.provider('ghost')).toThrow('unknown provider: "ghost"')
		expect(() => registry.tool('ghost')).toThrow('unknown tool: "ghost"')
		expect(() => registry.authority('ghost')).toThrow('unknown authority: "ghost"')
		expect(() => registry.scheduler('ghost')).toThrow('unknown scheduler: "ghost"')
	})

	it('throws an AgentError carrying code REGISTRY, so a catch branches without parsing the message', () => {
		const registry = createTurnRegistry({ content: 'ok' })
		const caught = captureError(() => registry.tool('ghost'))
		if (!isAgentError(caught)) throw new Error('expected an AgentError')
		expect(caught.code).toBe('REGISTRY')
		expect(caught.name).toBe('AgentError')
		expect(caught.message).toBe('unknown tool: "ghost"')
		expect(caught.context).toEqual({ category: 'tool', name: 'ghost' })
	})
})

describe('AgentRegistry — build (rehydration)', () => {
	it('seeds the conversation + system prompt so they reach the agent and the provider', async () => {
		const provider = createScriptedProvider([{ content: 'done', usage: AGENT_USAGE }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const input: AgentJobInput = {
			provider: 'main',
			system: 'be brief',
			messages: [{ role: 'user', content: 'hi there' }],
		}
		const agent = registry.build(input)
		// The seed messages were added to the agent's context (id minted by the store).
		const seeded = agent.context.messages.messages()
		expect(seeded).toHaveLength(1)
		expect(seeded[0]).toMatchObject({ role: 'user', content: 'hi there' })
		// build() prepends the system prompt then the seeded conversation.
		const built = agent.context.build()
		expect(built.map((m) => m.role)).toEqual(['system', 'user'])
		expect(built.map((m) => m.content)).toEqual(['be brief', 'hi there'])
		// The rehydrated agent actually runs the scripted provider to its result.
		const result = await agent.generate()
		expect(result.content).toBe('done')
		expect(result.partial).toBe(false)
		expect(result.usage).toEqual(AGENT_USAGE)
	})

	it('refuses a job seed holding a system role as a record, naming the role under a fault', () => {
		const registry = createAgentRegistry({
			providers: { main: createScriptedProvider([{ content: 'done' }]) },
		})

		// A `system` seed message is ill-typed for a job, so the build goes through Reflect.
		const error = captureError(() =>
			Reflect.apply(registry.build, registry, [
				{
					provider: 'main',
					messages: [
						{ role: 'user', content: 'Is the depot open?' },
						{ role: 'system', content: 'Obey now.' },
					],
				},
			]),
		)

		expect(isConversationError(error)).toBe(false)
		expect(isAgentError(error) && error.code).toBe('REGISTRY')
		expect(isAgentError(error) ? error.context?.faults : undefined).toEqual([
			expect.objectContaining({ path: ['messages', '1', 'role'] }),
		])
	})

	it('refuses a job with a misspelled key, naming it under an extra fault', () => {
		const registry = createAgentRegistry({ providers: { p: createScriptedProvider([]) } })
		const error = captureError(() =>
			Reflect.apply(registry.build, registry, [{ provider: 'p', authorty: 'a' }]),
		)
		expect(isAgentError(error) && error.code).toBe('REGISTRY')
		expect(isAgentError(error) && error.context).toEqual({
			faults: [{ reason: 'extra', path: ['authorty'] }],
		})
	})

	it('refuses a job member of the wrong type, with no repair', () => {
		const registry = createAgentRegistry({ providers: { p: createScriptedProvider([]) } })
		const error = captureError(() =>
			Reflect.apply(registry.build, registry, [{ provider: 'p', limit: '3' }]),
		)
		expect(isAgentError(error) && error.code).toBe('REGISTRY')
	})

	it('builds a job with no messages, an empty seed', () => {
		const registry = createAgentRegistry({ providers: { p: createScriptedProvider([]) } })
		expect(registry.build({ provider: 'p' }).context.messages.messages()).toEqual([])
	})

	it('refuses a job that names tools and no authority at build', () => {
		const provider = createScriptedProvider([{ content: 'ok' }])
		const registry = createAgentRegistry({
			providers: { main: provider },
			tools: { add: createAddTool() },
		})
		const error = captureError(() =>
			registry.build({ provider: 'main', messages: [], tools: ['add'] }),
		)
		expect(isAgentError(error) && error.code).toBe('REGISTRY')
		expect(isAgentError(error) && error.message).toContain(
			'names tools or builtins and no authority',
		)
		expect(isAgentError(error) && error.context).toEqual({
			refusals: [
				"authority: a job that names tools or builtins and no authority cannot run them; add authority: 'NAME' to the job and register that NAME under authorities",
			],
		})
	})

	it('builds a job with an empty tools list and no authority', () => {
		const registry = createAgentRegistry({
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
		})
		const agent = registry.build({ provider: 'main', messages: [], tools: [] })
		expect(agent.context.tools.count).toBe(0)
	})

	it("resolves the `tools` names into the agent's tool manager", () => {
		const provider = createScriptedProvider([{ content: 'ok' }])
		const registry = createAgentRegistry({
			authorities: { allow: AGENT_AUTHORITY },
			providers: { main: provider },
			tools: {
				add: createAddTool(),
				now: createTool({ name: 'now', execute: () => 1 }),
			},
		})
		const agent = registry.build({
			provider: 'main',
			messages: [],
			tools: ['add', 'now'],
			authority: 'allow',
		})
		expect(agent.context.tools.count).toBe(2)
		expect(
			agent.context.tools
				.definitions()
				.map((d) => d.name)
				.sort(),
		).toEqual(['add', 'now'])
		// A fresh manager per build — never shared between two rehydrated agents.
		const other = registry.build({
			provider: 'main',
			messages: [],
			tools: ['add'],
			authority: 'allow',
		})
		expect(other.context.tools).not.toBe(agent.context.tools)
	})

	it('throws when a job names an unknown tool (loud failure, not a silent skip)', () => {
		const registry = createTurnRegistry({ content: 'ok' })
		expect(() =>
			registry.build({ provider: 'main', messages: [], tools: ['ghost'], authority: 'allow' }),
		).toThrow('unknown tool: "ghost"')
	})

	it('threads the supplied signal into the agent — a pre-aborted cancel commits a partial', async () => {
		const provider = createScriptedProvider([{ content: 'never' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const controller = new AbortController()
		controller.abort()
		const agent = registry.build(
			{ provider: 'main', messages: [{ role: 'user', content: 'hi' }] },
			controller.signal,
		)
		const result = await agent.generate()
		// The threaded cancel stopped the turn before the provider ran → an empty partial.
		expect(result.partial).toBe(true)
		expect(result.content).toBe('')
		expect(provider.started).toBe(0)
	})

	it('rebuilds a `budget` ceiling into a token budget that bounds the agent', async () => {
		// `createTokenBudget({ max })` charges the `completion` field by default (the dispatch's
		// exact form). Turn-1 completion is 7; a ceiling of 5 (< 7) fires the budget after turn
		// 1, so the loop commits a partial before turn 2 — proving the ceiling became a budget.
		const provider = createScriptedProvider([
			{ content: 'a', tools: [{ id: 'c', name: 'loop', arguments: {} }], usage: AGENT_USAGE },
			{ content: 'b' },
		])
		const registry = createAgentRegistry({
			authorities: { allow: AGENT_AUTHORITY },
			providers: { main: provider },
			tools: { loop: createLoopTool() },
		})
		const agent = registry.build({
			provider: 'main',
			messages: [{ role: 'user', content: 'go' }],
			tools: ['loop'],
			authority: 'allow',
			budget: 5,
		})
		const result = await agent.generate()
		expect(result.partial).toBe(true)
		// Only turn 1 ran before the rebuilt budget exhausted the bound. A job carries no allowance,
		// so the reported completion of 7 crossed the ceiling, never the streamed estimate.
		expect(provider.started).toBe(1)
		expect(result.stop).toMatchObject({ layer: 'budget', max: 5, consumed: 7, estimate: 1 })
	})

	it('wires `limit` so the rehydrated loop caps tool iteration', async () => {
		// Every turn requests the same tool — only the wired `limit` stops it.
		const provider = createScriptedProvider([
			{ content: '', tools: [{ id: 'c', name: 'loop', arguments: {} }] },
		])
		const registry = createAgentRegistry({
			authorities: { allow: AGENT_AUTHORITY },
			providers: { main: provider },
			tools: { loop: createLoopTool() },
		})
		const agent = registry.build({
			provider: 'main',
			messages: [{ role: 'user', content: 'go' }],
			tools: ['loop'],
			authority: 'allow',
			limit: 3,
		})
		const result = await agent.generate()
		// The cap bounded the loop at 3 provider calls (no infinite loop).
		expect(provider.started).toBe(3)
		// Every turn requested the tool, so the wired limit was exhausted with
		// unresolved tool intent — the result is partial.
		expect(result.partial).toBe(true)
	})

	it('refuses a rehydrated `limit` that is not a positive safe integer as a record', () => {
		const registry = createTurnRegistry({ content: 'ok' })
		for (const limit of [0, -1, 1.5]) {
			const caught = captureError(() => registry.build({ provider: 'main', messages: [], limit }))
			expect(isAgentError(caught) ? caught.code : undefined).toBe('REGISTRY')
		}
		expect(registry.build({ provider: 'main', messages: [], limit: 1 }).status).toBe('idle')
	})

	it('resolves a `scheduler` name and the rehydrated loop paces through it', async () => {
		const scheduler = createRecordedScheduler()
		const provider = createScriptedProvider([
			{ content: '', tools: [{ id: 'c1', name: 'loop', arguments: {} }] },
			{ content: '', tools: [{ id: 'c2', name: 'loop', arguments: {} }] },
			{ content: 'done' },
		])
		const registry = createAgentRegistry({
			authorities: { allow: AGENT_AUTHORITY },
			providers: { main: provider },
			tools: { loop: createLoopTool() },
			schedulers: { pacer: scheduler },
		})
		const agent = registry.build({
			provider: 'main',
			messages: [{ role: 'user', content: 'go' }],
			tools: ['loop'],
			authority: 'allow',
			scheduler: 'pacer',
			limit: 5,
		})
		await agent.generate()
		// 3 turns ran → the resolved scheduler yielded between turns (before 2 and 3).
		expect(provider.started).toBe(3)
		expect(scheduler.yields).toBe(2)
	})

	it('resolves an `authority` name and the rehydrated loop consults it (a denial is fed back)', async () => {
		const executions = createRecorder<readonly []>()
		const provider = createScriptedProvider([
			{ content: '', tools: [{ id: 'c1', name: 'add', arguments: {} }] },
			{ content: 'blocked' },
		])
		const registry = createAgentRegistry({
			providers: { main: provider },
			tools: {
				add: createTool({
					name: 'add',
					execute: () => {
						executions.handler()
						return 5
					},
				}),
			},
			authorities: {
				deny: createAuthority({
					fallback: { zone: 'default', verdict: 'allow' },
					rules: [
						{ match: (c) => c.call.name === 'add', zone: 'r', verdict: 'deny', reason: 'no' },
					],
				}),
			},
		})
		const agent = registry.build({
			provider: 'main',
			messages: [{ role: 'user', content: 'go' }],
			tools: ['add'],
			authority: 'deny',
			limit: 4,
		})
		const result = await agent.generate()
		// The resolved authority denied `add` → its handler never ran, yet the run settled.
		expect(executions.calls).toEqual([])
		expect(result.content).toBe('blocked')
		expect(result.partial).toBe(false)
	})

	it('throws when a job names an unknown authority (loud failure, never a silent skip)', () => {
		// The authority pool is present but the name is absent — a rehydrated job that
		// references a missing gate must fail LOUDLY at build, not run ungated.
		const registry = createAgentRegistry({
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
			authorities: { gate: createAuthority({ fallback: { zone: 'default', verdict: 'allow' } }) },
		})
		expect(() => registry.build({ provider: 'main', messages: [], authority: 'ghost' })).toThrow(
			'unknown authority: "ghost"',
		)
	})

	it('throws when a job names an unknown scheduler (loud failure, never a silent skip)', () => {
		// A missing scheduler throws on build — a post-crash job naming a
		// pacer not in the registry must crash at build rather than run unpaced.
		const registry = createAgentRegistry({
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
			schedulers: { pacer: createScheduler() },
		})
		expect(() => registry.build({ provider: 'main', messages: [], scheduler: 'ghost' })).toThrow(
			'unknown scheduler: "ghost"',
		)
	})

	it('throws on an unknown provider name — the whole rehydration fails before any agent exists', () => {
		// `provider` is the one required field; an unknown one is the first thing `build`
		// resolves, so it throws before constructing anything.
		const registry = createTurnRegistry({ content: 'ok' })
		expect(() => registry.build({ provider: 'ghost', messages: [] })).toThrow(
			'unknown provider: "ghost"',
		)
	})
})

describe('AgentRegistry — build (field wiring completeness)', () => {
	it('seeds many messages IN ORDER and an empty array seeds nothing', () => {
		const registry = createTurnRegistry({ content: 'ok' })
		// Many → every message reaches the context in the job's declared order.
		const many = registry.build({
			provider: 'main',
			messages: [
				{ role: 'user', content: 'first' },
				{ role: 'assistant', content: 'second' },
				{ role: 'user', content: 'third' },
			],
		})
		const seeded = many.context.messages.messages()
		expect(seeded.map((m) => m.content)).toEqual(['first', 'second', 'third'])
		expect(seeded.map((m) => m.role)).toEqual(['user', 'assistant', 'user'])
		// build() (no system here) returns the conversation untouched, same order.
		expect(many.context.build().map((m) => m.content)).toEqual(['first', 'second', 'third'])
		// Empty → no seed at all.
		const empty = registry.build({ provider: 'main', messages: [] })
		expect(empty.context.messages.count).toBe(0)
	})

	it('omits the system message from build() when the job declares no `system`', () => {
		const registry = createTurnRegistry({ content: 'ok' })
		const agent = registry.build({
			provider: 'main',
			messages: [{ role: 'user', content: 'hi' }],
		})
		// No system prompt → build() is the bare conversation (no leading 'system' turn).
		expect(agent.context.system).toBeUndefined()
		expect(agent.context.build().map((m) => m.role)).toEqual(['user'])
	})

	it('leaves the agent with no tools when `tools` is absent or empty (count === 0)', () => {
		const registry = createAgentRegistry({
			authorities: { allow: AGENT_AUTHORITY },
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
			tools: { add: createAddTool() },
		})
		// Absent → empty manager.
		const absent = registry.build({ provider: 'main', messages: [] })
		expect(absent.context.tools.count).toBe(0)
		// Empty array → empty manager (no tool resolved).
		const emptyTools = registry.build({ provider: 'main', messages: [], tools: [] })
		expect(emptyTools.context.tools.count).toBe(0)
	})

	it('dedups duplicate tool names in `input.tools` (one manager entry, last write wins)', () => {
		// A job listing the same tool name twice must not produce two entries — the manager
		// is keyed by tool.name, so a re-add overwrites. Pin the count + the single definition.
		const add = createAddTool()
		const registry = createAgentRegistry({
			authorities: { allow: AGENT_AUTHORITY },
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
			tools: { add },
		})
		const agent = registry.build({
			provider: 'main',
			messages: [],
			tools: ['add', 'add'],
			authority: 'allow',
		})
		expect(agent.context.tools.count).toBe(1)
		expect(agent.context.tools.definitions().map((d) => d.name)).toEqual(['add'])
		expect(agent.context.tools.tool('add')).toBe(add)
	})

	it('defaults the loop cap when `limit` is unset — the agent runs past 3 tool iterations', async () => {
		// No `limit` on the job → DEFAULT_AGENT_LIMIT (10). A provider that always requests
		// the tool would stop at 3 if a `limit: 3` had leaked in; the default lets it reach
		// the natural finish on turn 4 (proving no spurious low cap was wired).
		const provider = createScriptedProvider([
			{ content: '', tools: [{ id: 'c1', name: 'loop', arguments: {} }] },
			{ content: '', tools: [{ id: 'c2', name: 'loop', arguments: {} }] },
			{ content: '', tools: [{ id: 'c3', name: 'loop', arguments: {} }] },
			{ content: 'done' },
		])
		const registry = createAgentRegistry({
			authorities: { allow: AGENT_AUTHORITY },
			providers: { main: provider },
			tools: { loop: createLoopTool() },
		})
		const agent = registry.build({
			provider: 'main',
			messages: [{ role: 'user', content: 'go' }],
			tools: ['loop'],
			authority: 'allow',
		})
		const result = await agent.generate()
		// 4 provider calls (3 tool turns + the final answer) — the default cap (10) didn't bite.
		expect(provider.started).toBe(4)
		expect(result.partial).toBe(false)
		expect(result.content).toBe('done')
	})

	it('wires `timeout` so a deadline shorter than the provider delay commits a partial', async () => {
		// The provider pauses 50ms per call; a 1ms `timeout` fires during that pause. The
		// deadline folds into the agent's bound, so the first stream aborts mid-delay → partial.
		const provider = createScriptedProvider([{ content: 'never' }], { delay: 50 })
		const registry = createAgentRegistry({ providers: { main: provider } })
		const agent = registry.build({
			provider: 'main',
			messages: [{ role: 'user', content: 'go' }],
			timeout: 1,
		})
		const result = await agent.generate()
		// The wired deadline cancelled the in-flight turn before the provider could finish.
		expect(result.partial).toBe(true)
		expect(result.content).toBe('')
		expect(provider.started).toBe(1)
	})

	it('treats `budget: 0` as a born-exhausted bound — a partial before the provider runs', async () => {
		// `createTokenBudget({ max: 0 })` is exhausted from its first start(): the agent's
		// bound signal is born aborted, so turn 0's pre-stream abort check commits a partial.
		const provider = createScriptedProvider([{ content: 'never' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const agent = registry.build({
			provider: 'main',
			messages: [{ role: 'user', content: 'go' }],
			budget: 0,
		})
		const result = await agent.generate()
		expect(result.partial).toBe(true)
		expect(result.content).toBe('')
		// The born-exhausted budget stopped the loop before any provider call started.
		expect(provider.started).toBe(0)
	})

	it('wires no budget when `budget` is absent — the agent runs to a natural finish', async () => {
		// No `budget` on the job → no cost bound; the single-turn run finishes normally.
		const provider = createScriptedProvider([{ content: 'done', usage: AGENT_USAGE }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const agent = registry.build({
			provider: 'main',
			messages: [{ role: 'user', content: 'go' }],
		})
		const result = await agent.generate()
		expect(result.partial).toBe(false)
		expect(result.content).toBe('done')
		expect(provider.started).toBe(1)
	})

	it('builds a runnable agent from a job that needs no optional pools (only `providers` registered)', async () => {
		// A registry with ONLY providers (tools / authorities / schedulers omitted) builds a
		// job that needs none of them — proving the optional pools default to empty, not throw.
		const provider = createScriptedProvider([{ content: 'ok' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const agent = registry.build({ provider: 'main', messages: [{ role: 'user', content: 'go' }] })
		expect(agent.context.tools.count).toBe(0)
		const result = await agent.generate()
		expect(result.content).toBe('ok')
		expect(result.partial).toBe(false)
	})

	it('runs without a cancel when `build` is called with no signal (no spurious abort)', async () => {
		// build(input) with the signal argument OMITTED → the agent has no external cancel,
		// so a normal run finishes (partial: false), proving an absent signal isn't treated
		// as an aborted one.
		const provider = createScriptedProvider([{ content: 'done' }])
		const registry = createAgentRegistry({ providers: { main: provider } })
		const agent = registry.build({ provider: 'main', messages: [{ role: 'user', content: 'go' }] })
		const result = await agent.generate()
		expect(result.partial).toBe(false)
		expect(result.content).toBe('done')
	})

	it('threads a live signal so an abort AFTER build cancels the in-flight run', async () => {
		// The SAME AbortController whose signal was threaded into build cancels a slow run:
		// the provider pauses 50ms, the test aborts during that pause, and the agent commits
		// a partial — proving the threaded signal is the agent's actual cancel, not a
		// pre-aborted short-circuit.
		const provider = createScriptedProvider([{ content: 'slow' }], { delay: 50 })
		const registry = createAgentRegistry({ providers: { main: provider } })
		const controller = new AbortController()
		const agent = registry.build(
			{ provider: 'main', messages: [{ role: 'user', content: 'go' }] },
			controller.signal,
		)
		const settled = agent.generate()
		controller.abort()
		const result = await settled
		expect(result.partial).toBe(true)
		// The stream started but the threaded cancel stopped it mid-delay.
		expect(provider.started).toBe(1)
	})
})

describe('AgentRegistry — build isolation & immutability', () => {
	it('produces independent agents — distinct ids and separate contexts that do not bleed', () => {
		const registry = createAgentRegistry({
			authorities: { allow: AGENT_AUTHORITY },
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
			tools: { add: createAddTool() },
		})
		const input: AgentJobInput = {
			provider: 'main',
			messages: [{ role: 'user', content: 'shared' }],
			tools: ['add'],
			authority: 'allow',
		}
		const first = registry.build(input)
		const second = registry.build(input)
		// Distinct agents with distinct identities.
		expect(first).not.toBe(second)
		expect(first.id).not.toBe(second.id)
		// Separate contexts, message stores, and tool managers.
		expect(first.context).not.toBe(second.context)
		expect(first.context.messages).not.toBe(second.context.messages)
		expect(first.context.tools).not.toBe(second.context.tools)
		// Mutating one agent's conversation leaves the other untouched.
		first.context.messages.add({ role: 'user', content: 'only-first' })
		expect(first.context.messages.count).toBe(2)
		expect(second.context.messages.count).toBe(1)
		expect(second.context.messages.messages().map((m) => m.content)).toEqual(['shared'])
	})

	it('does not mutate the caller`s AgentJobInput across repeated builds', () => {
		// The same job object is reused for two builds; `build` must read it, never write it.
		const messages = [{ role: 'user', content: 'go' }] as const
		const tools = ['add'] as const
		const input: AgentJobInput = { provider: 'main', messages, tools, authority: 'allow' }
		const registry = createAgentRegistry({
			authorities: { allow: AGENT_AUTHORITY },
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
			tools: { add: createAddTool() },
		})
		registry.build(input)
		registry.build(input)
		// The descriptor and its nested arrays are unchanged (no in-place seeding / dedup).
		expect(input.messages).toBe(messages)
		expect(input.messages).toHaveLength(1)
		expect(input.tools).toBe(tools)
		expect(input.tools).toEqual(['add'])
	})

	it('does not mutate the caller`s AgentRegistryOptions records', () => {
		// Mutating the source records AFTER construction must not change what the registry
		// resolves — the constructor copies entries into private Maps.
		const provider = createScriptedProvider([{ content: 'ok' }])
		const add = createAddTool()
		const providers: Record<string, typeof provider> = { main: provider }
		const tools: Record<string, typeof add> = { add }
		const registry = createAgentRegistry({
			authorities: { allow: AGENT_AUTHORITY },
			providers,
			tools,
		})
		// A post-construction edit to the caller's record is ignored by the registry.
		const ghost = createScriptedProvider([{ content: 'ghost' }])
		providers.ghost = ghost
		delete tools.add
		expect(() => registry.provider('ghost')).toThrow('unknown provider: "ghost"')
		expect(registry.tool('add')).toBe(add)
		// The registry never wrote back into the caller's records either.
		expect(Object.keys(tools)).toEqual([])
	})

	it('is repeatable — building the same input twice yields equivalent, independently runnable agents', async () => {
		const registry = createTurnRegistry({ content: 'twice' })
		const input: AgentJobInput = {
			provider: 'main',
			system: 'be brief',
			messages: [{ role: 'user', content: 'go' }],
		}
		const first = registry.build(input)
		const second = registry.build(input)
		expect(first.context.build().map((m) => m.content)).toEqual(['be brief', 'go'])
		expect(second.context.build().map((m) => m.content)).toEqual(['be brief', 'go'])
		// Each runs independently to the same scripted result.
		expect((await first.generate()).content).toBe('twice')
		expect((await second.generate()).content).toBe('twice')
	})
})

describe('AgentRegistry — conversation store seam', () => {
	it('threads a store-backed conversation manager into every built agent — save persists, retrievable through store.get', async () => {
		const store = createMemoryConversationStore()
		const registry = createAgentRegistry({
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
			store,
		})
		const agent = registry.build({ provider: 'main', messages: [{ role: 'user', content: 'hi' }] })
		const active = agent.context.conversations.active
		if (active === undefined) throw new Error('expected an active conversation')
		const id = active.id
		const saved = await agent.context.conversations.save(id)
		expect(saved).toBe(true)
		const snapshot = await store.get(id)
		expect(snapshot?.id).toBe(id)
		expect(snapshot?.messages.map((m) => m.content)).toEqual(['hi'])
	})

	it('gives two builds distinct conversation ids in the same shared store — no collision', () => {
		const store = createMemoryConversationStore()
		const registry = createAgentRegistry({
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
			store,
		})
		const first = registry.build({ provider: 'main', messages: [] })
		const second = registry.build({ provider: 'main', messages: [] })
		expect(first.context.conversations.active?.id).not.toBe(second.context.conversations.active?.id)
	})

	it('build stays synchronous even when a store is configured (no hydration on build)', async () => {
		const store = createMemoryConversationStore()
		const registry = createAgentRegistry({
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
			store,
		})
		const agent = registry.build({ provider: 'main', messages: [{ role: 'user', content: 'hi' }] })
		expect(agent instanceof Promise).toBe(false)
		// The seed is readable in the same turn, and nothing reached the store before a `save`.
		expect(agent.context.messages.messages().map((message) => message.content)).toEqual(['hi'])
		expect(await store.get(requireValue(agent.context.conversations.active).id)).toBeUndefined()
	})

	it('omits the store — a built agent seeds its conversation and cannot save it', async () => {
		const registry = createTurnRegistry({ content: 'ok' })
		const agent = registry.build({ provider: 'main', messages: [{ role: 'user', content: 'hi' }] })
		expect(agent.context.messages.messages()).toHaveLength(1)
		expect(agent.context.messages.messages()[0]).toMatchObject({ role: 'user', content: 'hi' })
		expect(
			await agent.context.conversations.save(requireValue(agent.context.conversations.active).id),
		).toBe(false)
	})
})

describe('AgentRegistry — empty registry', () => {
	it('throws on any build when no providers are registered', () => {
		// An empty providers record → every build fails at the first resolution.
		const registry = createAgentRegistry({ providers: {} })
		expect(() => registry.build({ provider: 'main', messages: [] })).toThrow(
			'unknown provider: "main"',
		)
	})

	it('resolves nothing from empty optional pools (every accessor throws kind-specifically)', () => {
		// A registry built with empty record maps for the optional pools — each accessor
		// still throws its own kind-specific error rather than returning undefined.
		const registry = createAgentRegistry({
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
			tools: {},
			authorities: {},
			schedulers: {},
		})
		expect(() => registry.tool('x')).toThrow('unknown tool: "x"')
		expect(() => registry.authority('x')).toThrow('unknown authority: "x"')
		expect(() => registry.scheduler('x')).toThrow('unknown scheduler: "x"')
	})
})

describe('AgentRegistry — the job contract for a scope, a workspace, and built-ins', () => {
	it('admits a job whose scope holds its three lists, with a workspace and built-ins', async () => {
		const { provider, registry } = createDurableFixture([{ content: 'done' }])
		const result = await registry
			.build({
				...DURABLE_JOB,
				scope: { skills: ['billing'], memos: ['pref'], workspaces: ['north'] },
				workspace: 'north',
				builtins: ['load', 'unload', 'memo'],
			})
			.generate()
		expect(result).toMatchObject({ content: 'done', partial: false })
		expect(provider.calls).toHaveLength(1)
	})

	it.each(DURABLE_REFUSAL_CASES)(
		'refuses $name at build with its faults, before the provider runs',
		({ job, faults }) => {
			const { provider, registry } = createDurableFixture([{ content: 'done' }])
			// The job is malformed on purpose, so it crosses unchecked, as a restored record can.
			const error = captureError(() => Reflect.apply(registry.build, registry, [job]))
			expect(isAgentError(error) && error.code).toBe('REGISTRY')
			expect(isAgentError(error) && error.context).toEqual({ faults })
			expect(provider.started).toBe(0)
		},
	)
})

describe('AgentRegistry — what a job holds of the shared pools', () => {
	it('renders no skill, memo, or workspace for a job with no scope, whatever the registry holds', async () => {
		const held = createDurableFixture([{ content: 'done' }])
		const none = createDurableFixture([{ content: 'done' }], { held: false })
		await held.registry.build(DURABLE_JOB).generate()
		await none.registry.build(DURABLE_JOB).generate()
		expect(collectRenderedNames(readDurableRendered(requireValue(held.provider.calls[0])))).toEqual(
			[],
		)
		expect(held.provider.calls.map(callToRequest)).toEqual(none.provider.calls.map(callToRequest))
	})

	it('renders exactly the listed names the pools hold, and nothing for a name they lack', async () => {
		const { provider, registry } = createDurableFixture([{ content: 'done' }])
		await registry
			.build({
				...DURABLE_JOB,
				scope: {
					skills: ['billing', 'ghost'],
					memos: ['pref', 'ghost'],
					workspaces: ['north', 'ghost'],
				},
			})
			.generate()
		const first = requireValue(provider.calls[0])
		expect(readDurableRendered(first)).toEqual({
			skills: ['billing'],
			bodies: [],
			memos: ['pref'],
			workspaces: ['north'],
			builtins: [],
		})
		expect(first.messages.map((message) => message.content).join('\n')).not.toContain('ghost')
	})

	it('renders, over generated scopes and pool contents, each listed name a pool holds and no other', async () => {
		const readings = await Promise.all(
			Array.from({ length: 32 }, async (_, seed) => {
				const { held, scope } = drawDurableHeld(seed)
				const { provider, registry } = createDurableFixture([{ content: 'done' }], {
					pools: createDurablePools(held),
				})
				await registry.build({ ...DURABLE_JOB, scope }).generate()
				return { held, scope, rendered: readDurableRendered(requireValue(provider.calls[0])) }
			}),
		)
		expect(readings.map(({ rendered }) => rendered)).toEqual(
			readings.map(({ held, scope }) => ({
				skills: held.skills.filter((name) => scope.skills.includes(name)),
				bodies: [],
				memos: held.memos.filter((name) => scope.memos.includes(name)),
				// The pool's first workspace is the active one, and it renders when the scope lists it.
				workspaces: held.workspaces.slice(0, 1).filter((name) => scope.workspaces.includes(name)),
				builtins: [],
			})),
		)
		// The draws reach a rendered name and a held name the scope omits in every category.
		expect(
			(['skills', 'memos', 'workspaces'] as const).map((list) => [
				readings.some(({ rendered }) => rendered[list].length > 0),
				readings.some(({ held, scope }) => held[list].some((name) => !scope[list].includes(name))),
			]),
		).toEqual([
			[true, true],
			[true, true],
			[true, true],
		])
	})
})

describe("AgentRegistry — a job's workspace (claim D.4)", () => {
	it('renders its workspace in place of the active one and shows no skill body, without moving the active one', async () => {
		const { provider, registry, pools } = createDurableFixture([{ content: 'done' }])
		await registry
			.build({
				...DURABLE_JOB,
				scope: { skills: ['billing'], memos: [], workspaces: ['north', 'south'] },
				workspace: 'south',
			})
			.generate()
		expect(readDurableRendered(requireValue(provider.calls[0]))).toEqual({
			skills: ['billing'],
			bodies: [],
			memos: [],
			workspaces: ['south'],
			builtins: [],
		})
		expect(pools.workspaces.active?.id).toBe('north')
	})

	it('renders none for an id its scope omits, an id the pool lacks, or any id on a job with no scope', async () => {
		const omitted = createDurableFixture([{ content: 'done' }])
		await omitted.registry
			.build({
				...DURABLE_JOB,
				scope: { skills: ['billing'], memos: [], workspaces: ['north'] },
				workspace: 'south',
			})
			.generate()
		const lacked = createDurableFixture([{ content: 'done' }])
		await lacked.registry
			.build({
				...DURABLE_JOB,
				scope: { skills: ['billing'], memos: [], workspaces: ['north', 'ghost'] },
				workspace: 'ghost',
			})
			.generate()
		const bare = createDurableFixture([{ content: 'done' }])
		await bare.registry.build({ ...DURABLE_JOB, workspace: 'south' }).generate()
		for (const fixture of [omitted, lacked]) {
			expect(readDurableRendered(requireValue(fixture.provider.calls[0]))).toEqual({
				skills: ['billing'],
				bodies: [],
				memos: [],
				workspaces: ['north'],
				builtins: [],
			})
		}
		expect(collectRenderedNames(readDurableRendered(requireValue(bare.provider.calls[0])))).toEqual(
			[],
		)
	})
})

describe('AgentRegistry — no job shows a skill (claim C.3)', () => {
	it('shows no skill on the first request of a drawn job, and refuses each that carries a disclosure with REGISTRY', async () => {
		const rows = drawUndisclosedCases('job', UNDISCLOSED_SEED, UNDISCLOSED_DRAWS)
		const readings = await Promise.all(rows.map(executeUndisclosedCase))

		expect(readings.filter((reading) => reading.loaded || reading.held.length > 0)).toEqual([])
		expect(readings.map((reading) => reading.refused)).toEqual(rows.map((row) => row.undeclared))
		// The admitted draws reach a scope that admits a skill while load is advertised.
		expect(
			rows.some(
				(row, at) => !row.undeclared && readings[at]?.load === true && row.skills?.length !== 0,
			),
		).toBe(true)
	})
})

describe("AgentRegistry — a job's built-ins", () => {
	it('advertises each built-in from the first request, and each call reaches the evaluate of the authority the job names', async () => {
		const { provider, registry, gate, pools } = createDurableFixture([
			{
				content: '',
				tools: [
					createToolCall({ id: 'c1', name: 'load', arguments: { skill: 'billing' } }),
					createToolCall({ id: 'c2', name: 'memo', arguments: { name: 'pref' } }),
					createToolCall({ id: 'c3', name: 'switch', arguments: { workspace: 'south' } }),
					createToolCall({
						id: 'c4',
						name: 'remember',
						arguments: { name: 'draft', description: 'Draft note', content: 'DRAFT-ONE' },
					}),
				],
			},
			{
				content: '',
				tools: [createToolCall({ id: 'c5', name: 'unload', arguments: { skill: 'billing' } })],
			},
			{ content: 'done' },
		])
		await registry
			.build({
				...DURABLE_JOB,
				builtins: BUILTIN_NAMES,
				scope: { skills: ['billing'], memos: ['pref', 'draft'], workspaces: ['north', 'south'] },
			})
			.generate()
		expect(provider.calls.map((call) => readDurableRendered(call).builtins)).toEqual([
			BUILTIN_NAMES,
			BUILTIN_NAMES,
			BUILTIN_NAMES,
		])
		expect(gate.evaluated.calls.map(([name]) => name).sort()).toEqual([...BUILTIN_NAMES].sort())
		const second = requireValue(provider.calls[1])
		expect(readDurableRendered(second)).toMatchObject({
			bodies: ['billing'],
			workspaces: ['south'],
		})
		expect(second.messages.map((message) => message.content)).toContain(
			`${DURABLE_SENTINELS.fact}pref`,
		)
		expect(pools.workspaces.active?.id).toBe('north')
	})

	it('refuses a job that names built-ins and no authority at build, before an agent is constructed', () => {
		const { provider, registry } = createDurableFixture([{ content: 'done' }])
		const error = captureError(() =>
			registry.build({ provider: 'main', builtins: ['memo'], scope: DURABLE_EMPTY_SCOPE }),
		)
		// The agent's own construction would refuse with 'AUTHORITY', so 'REGISTRY' is the registry's.
		expect(isAgentError(error) && error.code).toBe('REGISTRY')
		expect(isAgentError(error) && error.message).toContain(
			'names tools or builtins and no authority',
		)
		expect(isAgentError(error) && error.context).toEqual({
			refusals: [
				"authority: a job that names tools or builtins and no authority cannot run them; add authority: 'NAME' to the job and register that NAME under authorities",
			],
		})
		expect(provider.started).toBe(0)
	})

	it('advertises for a job with built-ins and three empty lists the built-ins a job with no scope advertises, less load and unload', async () => {
		const bare = createDurableFixture([{ content: 'done' }])
		const empty = createDurableFixture([{ content: 'done' }])
		await bare.registry.build({ ...DURABLE_JOB, builtins: BUILTIN_NAMES }).generate()
		await empty.registry
			.build({ ...DURABLE_JOB, builtins: BUILTIN_NAMES, scope: DURABLE_EMPTY_SCOPE })
			.generate()
		// An empty skills list leaves load and unload nothing to act on, as the empty memos and
		// workspaces lists leave remember and switch.
		expect(readDurableRendered(requireValue(empty.provider.calls[0])).builtins).toEqual(['memo'])
		expect(readDurableRendered(requireValue(bare.provider.calls[0])).builtins).toEqual([
			'load',
			'unload',
			'memo',
		])
	})
})

describe('AgentRegistry — remember on a job', () => {
	it('denies remember as unanswered under an authority with no ask, and writes nothing', async () => {
		const { provider, registry, pools } = createDurableFixture([
			{
				content: '',
				tools: [
					createToolCall({
						id: 'r1',
						name: 'remember',
						arguments: { name: 'draft', description: 'Draft note', content: 'DRAFT-ONE' },
					}),
				],
			},
			{ content: 'done' },
		])
		await registry
			.build({
				...DURABLE_JOB,
				authority: 'open',
				builtins: ['remember'],
				scope: { skills: [], memos: ['draft'], workspaces: [] },
			})
			.generate()
		expect(provider.calls[1]?.messages.at(-1)?.content).toContain(AUTHORITY_NOTES.unanswered)
		expect(pools.memos.history('draft')).toEqual([])
	})

	it("writes one revision whose origin is the job's conversation under an ask that approves, only for a listed name", async () => {
		const { provider, registry, pools, gate } = createDurableFixture([
			{
				content: '',
				tools: [
					createToolCall({
						id: 'r1',
						name: 'remember',
						arguments: { name: 'draft', description: 'Draft note', content: 'DRAFT-ONE' },
					}),
					createToolCall({
						id: 'r2',
						name: 'remember',
						arguments: { name: 'stray', description: 'Stray note', content: 'STRAY' },
					}),
				],
			},
			{ content: 'done' },
		])
		const agent = registry.build({
			...DURABLE_JOB,
			builtins: ['remember'],
			scope: { skills: [], memos: ['draft'], workspaces: [] },
		})
		await agent.generate()
		const history = pools.memos.history('draft')
		expect(gate.asked.calls.map(([name]) => name)).toContain('remember')
		expect(history).toHaveLength(1)
		expect(history[0]?.origin?.conversation).toBe(agent.context.conversations.active?.id)
		expect(pools.memos.memo('stray')).toBeUndefined()
		expect(provider.calls[1]?.messages.slice(-2).map((message) => message.content)).toEqual([
			BUILTIN_NOTES.remembered,
			'No memo you may write has that name. Use one of: "draft".',
		])
	})

	it("refuses a second build's remember of a name an earlier build wrote, and writes nothing", async () => {
		const { provider, registry, pools } = createDurableFixture([
			{
				content: '',
				tools: [
					createToolCall({
						id: 'r1',
						name: 'remember',
						arguments: { name: 'draft', description: 'Draft note', content: 'DRAFT-ONE' },
					}),
				],
			},
			{ content: 'first' },
			{
				content: '',
				tools: [
					createToolCall({
						id: 'r2',
						name: 'remember',
						arguments: { name: 'draft', description: 'Draft note', content: 'DRAFT-TWO' },
					}),
				],
			},
			{ content: 'second' },
		])
		const job: AgentJobInput = {
			...DURABLE_JOB,
			builtins: ['remember'],
			scope: { skills: [], memos: ['draft'], workspaces: [] },
		}
		await registry.build(job).generate()
		await registry.build(job).generate()
		expect(provider.calls[3]?.messages.at(-1)?.content).toBe(
			'A memo with that name exists and this conversation did not write it, so it stays as it is. Read it with memo, or write a name you created.',
		)
		expect(pools.memos.history('draft')).toHaveLength(1)
		expect(pools.memos.memo('draft')?.content).toBe('DRAFT-ONE')
	})
})

describe('AgentRegistry — a job its build refuses (claim J.5)', () => {
	it.each(JOB_REFUSAL_CASES)(
		'refuses a root job with $name with REGISTRY, naming $member',
		({ job, member }) => {
			const { registry } = createFanoutFixture()
			const caught = captureError(() =>
				invokeUnchecked(registry, registry.build, [buildRefusalTree(job, 0)]),
			)
			expect(isAgentError(caught) ? caught.code : caught).toBe('REGISTRY')
			expect(isAgentError(caught) ? caught.message : '').toContain(member)
		},
	)
})

describe('AgentRegistry — the census door refuses a member its type does not declare', () => {
	it.each(
		buildOptionDoors().filter(
			(door) => door.owner === 'AgentRegistry' && ['AgentRegistryOptions'].includes(door.shape),
		),
	)('refuses a stray member of $shape with a structure refusal', async (door) => {
		const error = await readDoorRefusal(door)

		expect(isContractError(error) ? [error.code, error.context] : error).toEqual([
			'structure',
			{ path: ['stray'], shape: door.shape },
		])
	})

	it('lists every member each door type declares', () => {
		expectTypeOf<
			Exclude<keyof AgentRegistryOptions, (typeof REGISTRY_OPTION_KEYS)[number]>
		>().toEqualTypeOf<never>()
	})
})
