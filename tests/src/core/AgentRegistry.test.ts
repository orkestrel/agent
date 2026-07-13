import { describe, expect, it } from 'vitest'
import type { AgentJobInput } from '@src/core'
import { createScheduler } from '@orkestrel/workflow'
import { createAgentRegistry, createAuthority, createTool } from '@src/core'
import {
	addTool,
	createRecordingScheduler,
	createScriptedProvider,
	createTokenUsage,
	loopTool,
} from '../../setup.js'

// AgentRegistry.test.ts — the MIRROR of src/core/agents/AgentRegistry.ts. Pins the
// registry's own contract (Ollama-free, a scripted provider): the accessors resolve a
// registered name and THROW a clear error on an unknown one; `build` rehydrates a seeded,
// signal-wired agent from a serializable AgentJobInput — messages seeded, system / limit
// / timeout / budget / authority / scheduler wired (asserted behaviourally, since they're
// `#private` on Agent), the cancel threaded; a `budget` number becomes a token budget;
// `tools` names resolve into the agent's manager. The job descriptor IS serializable.

const USAGE = createTokenUsage()

describe('AgentRegistry — accessors', () => {
	it('resolves a registered provider / tool / authority / scheduler by name', () => {
		const provider = createScriptedProvider([{ content: 'ok' }])
		const tool = addTool()
		const authority = createAuthority()
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
		const registry = createAgentRegistry({
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
		})
		expect(() => registry.provider('ghost')).toThrow('unknown provider: ghost')
		expect(() => registry.tool('ghost')).toThrow('unknown tool: ghost')
		expect(() => registry.authority('ghost')).toThrow('unknown authority: ghost')
		expect(() => registry.scheduler('ghost')).toThrow('unknown scheduler: ghost')
	})
})

describe('AgentRegistry — build (rehydration)', () => {
	it('seeds the conversation + system prompt so they reach the agent and the provider', async () => {
		const provider = createScriptedProvider([{ content: 'done', usage: USAGE }])
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
		expect(result.usage).toEqual(USAGE)
	})

	it("resolves the `tools` names into the agent's tool manager", () => {
		const provider = createScriptedProvider([{ content: 'ok' }])
		const registry = createAgentRegistry({
			providers: { main: provider },
			tools: {
				add: addTool(),
				now: createTool({ name: 'now', execute: () => 1 }),
			},
		})
		const agent = registry.build({ provider: 'main', messages: [], tools: ['add', 'now'] })
		expect(agent.context.tools.count).toBe(2)
		expect(
			agent.context.tools
				.definitions()
				.map((d) => d.name)
				.sort(),
		).toEqual(['add', 'now'])
		// A fresh manager per build — never shared between two rehydrated agents.
		const other = registry.build({ provider: 'main', messages: [], tools: ['add'] })
		expect(other.context.tools).not.toBe(agent.context.tools)
	})

	it('throws when a job names an unknown tool (loud failure, not a silent skip)', () => {
		const registry = createAgentRegistry({
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
		})
		expect(() => registry.build({ provider: 'main', messages: [], tools: ['ghost'] })).toThrow(
			'unknown tool: ghost',
		)
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
			{ content: 'a', tools: [{ id: 'c', name: 'loop', arguments: {} }], usage: USAGE },
			{ content: 'b' },
		])
		const registry = createAgentRegistry({
			providers: { main: provider },
			tools: { loop: loopTool() },
		})
		const agent = registry.build({
			provider: 'main',
			messages: [{ role: 'user', content: 'go' }],
			tools: ['loop'],
			budget: 5,
		})
		const result = await agent.generate()
		expect(result.partial).toBe(true)
		// Only turn 1 ran before the rebuilt budget exhausted the bound.
		expect(provider.started).toBe(1)
	})

	it('wires `limit` so the rehydrated loop caps tool iteration', async () => {
		// Every turn requests the same tool — only the wired `limit` stops it.
		const provider = createScriptedProvider([
			{ content: '', tools: [{ id: 'c', name: 'loop', arguments: {} }] },
		])
		const registry = createAgentRegistry({
			providers: { main: provider },
			tools: { loop: loopTool() },
		})
		const agent = registry.build({
			provider: 'main',
			messages: [{ role: 'user', content: 'go' }],
			tools: ['loop'],
			limit: 3,
		})
		const result = await agent.generate()
		// The cap bounded the loop at 3 provider calls (no infinite loop).
		expect(provider.started).toBe(3)
		expect(result.partial).toBe(false)
	})

	it('resolves a `scheduler` name and the rehydrated loop paces through it', async () => {
		const scheduler = createRecordingScheduler()
		const provider = createScriptedProvider([
			{ content: '', tools: [{ id: 'c1', name: 'loop', arguments: {} }] },
			{ content: '', tools: [{ id: 'c2', name: 'loop', arguments: {} }] },
			{ content: 'done' },
		])
		const registry = createAgentRegistry({
			providers: { main: provider },
			tools: { loop: loopTool() },
			schedulers: { pacer: scheduler },
		})
		const agent = registry.build({
			provider: 'main',
			messages: [{ role: 'user', content: 'go' }],
			tools: ['loop'],
			scheduler: 'pacer',
			limit: 5,
		})
		await agent.generate()
		// 3 turns ran → the resolved scheduler yielded between turns (before 2 and 3).
		expect(provider.started).toBe(3)
		expect(scheduler.yields).toBe(2)
	})

	it('resolves an `authority` name and the rehydrated loop consults it (a denial is fed back)', async () => {
		let executed = 0
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
						executed += 1
						return 5
					},
				}),
			},
			authorities: {
				deny: createAuthority({
					rules: [{ match: (c) => c.call.name === 'add', zone: 'r', allowed: false, reason: 'no' }],
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
		expect(executed).toBe(0)
		expect(result.content).toBe('blocked')
		expect(result.partial).toBe(false)
	})

	it('throws when a job names an unknown authority (loud failure, never a silent skip)', () => {
		// The authority pool is present but the name is absent — a rehydrated job that
		// references a missing gate must fail LOUDLY at build, not run ungated.
		const registry = createAgentRegistry({
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
			authorities: { gate: createAuthority() },
		})
		expect(() => registry.build({ provider: 'main', messages: [], authority: 'ghost' })).toThrow(
			'unknown authority: ghost',
		)
	})

	it('throws when a job names an unknown scheduler (loud failure, never a silent skip)', () => {
		// Same loud-failure guarantee for the scheduler kind — a post-crash job naming a
		// pacer not in the registry must crash at build rather than run unpaced.
		const registry = createAgentRegistry({
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
			schedulers: { pacer: createScheduler() },
		})
		expect(() => registry.build({ provider: 'main', messages: [], scheduler: 'ghost' })).toThrow(
			'unknown scheduler: ghost',
		)
	})

	it('throws on an unknown provider name — the whole rehydration fails before any agent exists', () => {
		// `provider` is the one required field; an unknown one is the first thing `build`
		// resolves, so it throws before constructing anything.
		const registry = createAgentRegistry({
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
		})
		expect(() => registry.build({ provider: 'ghost', messages: [] })).toThrow(
			'unknown provider: ghost',
		)
	})
})

describe('AgentRegistry — build (field wiring completeness)', () => {
	it('seeds many messages IN ORDER and an empty array seeds nothing', () => {
		const registry = createAgentRegistry({
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
		})
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
		const registry = createAgentRegistry({
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
		})
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
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
			tools: { add: addTool() },
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
		const add = addTool()
		const registry = createAgentRegistry({
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
			tools: { add },
		})
		const agent = registry.build({ provider: 'main', messages: [], tools: ['add', 'add'] })
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
			providers: { main: provider },
			tools: { loop: loopTool() },
		})
		const agent = registry.build({
			provider: 'main',
			messages: [{ role: 'user', content: 'go' }],
			tools: ['loop'],
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
		const provider = createScriptedProvider([{ content: 'done', usage: USAGE }])
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
		// a partial — proving the threaded signal is the agent's actual cancel, not just a
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
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
			tools: { add: addTool() },
		})
		const input: AgentJobInput = {
			provider: 'main',
			messages: [{ role: 'user', content: 'shared' }],
			tools: ['add'],
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
		const input: AgentJobInput = { provider: 'main', messages, tools }
		const registry = createAgentRegistry({
			providers: { main: createScriptedProvider([{ content: 'ok' }]) },
			tools: { add: addTool() },
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
		const add = addTool()
		const providers: Record<string, typeof provider> = { main: provider }
		const tools: Record<string, typeof add> = { add }
		const registry = createAgentRegistry({ providers, tools })
		// A post-construction edit to the caller's record is ignored by the registry.
		const ghost = createScriptedProvider([{ content: 'ghost' }])
		providers.ghost = ghost
		delete tools.add
		expect(() => registry.provider('ghost')).toThrow('unknown provider: ghost')
		expect(registry.tool('add')).toBe(add)
		// The registry never wrote back into the caller's records either.
		expect(Object.keys(tools)).toEqual([])
	})

	it('is repeatable — building the same input twice yields equivalent, independently runnable agents', async () => {
		const registry = createAgentRegistry({
			providers: { main: createScriptedProvider([{ content: 'twice' }]) },
		})
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

describe('AgentRegistry — empty registry', () => {
	it('throws on any build when no providers are registered', () => {
		// An empty providers record → every build fails at the first resolution.
		const registry = createAgentRegistry({ providers: {} })
		expect(() => registry.build({ provider: 'main', messages: [] })).toThrow(
			'unknown provider: main',
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
		expect(() => registry.tool('x')).toThrow('unknown tool: x')
		expect(() => registry.authority('x')).toThrow('unknown authority: x')
		expect(() => registry.scheduler('x')).toThrow('unknown scheduler: x')
	})
})
