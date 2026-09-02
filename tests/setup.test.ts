import type {
	ConversationSnapshot,
	ConversationStoreInterface,
	ContextFormat,
	Message,
	ProviderDelta,
	ProviderResult,
} from '@src/core'
import type { ToolDefinition } from '@orkestrel/tool'
import { isProviderAbortError } from '@src/core'
import { describe, expect, it } from 'vitest'
import {
	addTool,
	buildConversationSnapshot,
	conversationStoreDeleteAbsent,
	conversationStoreDeleteThenAbsent,
	conversationStoreGetAbsent,
	conversationStoreRoundTrip,
	conversationStoreRoundTripExpectation,
	conversationStoreTwoIds,
	conversationStoreUpsert,
	createAgentJob,
	createRecordingScheduler,
	createScriptedProvider,
	createStubSummarizer,
	createToolCall,
	createTokenUsage,
	loopTool,
} from './setup.js'

// setup.test.ts — the proof of `tests/setup.ts`, the workspace's ONE shared test-infrastructure
// module. Its subject is the exported HELPERS' behaviour, the behaviour every suite in
// `tests/src/**` codes against: what the scripted provider streams and returns, what the data
// builders default to and how an override lands, what the recorders record, what shape
// `buildConversationSnapshot` settles into, and that the exported store battery registers a
// contract a conforming store passes. Production behaviour is NOT re-proven here — the agent
// loop, the conversation, and the two store twins each have their own mirrored suite, and this
// file asserts nothing about them.
//
// Every expectation is derived a SECOND way wherever the helper could otherwise be compared
// against itself: a chunked stream is checked by reassembling its deltas, a folded snapshot's
// summaries are recomputed from the originals the section retained, and a concurrency high-water
// mark is read against calls the test itself holds open.

// The messages every scripted call is handed. A provider is framing-agnostic, so one seed turn
// is enough for every case that does not assert on what was passed through.
const messages: readonly Message[] = [{ id: 'm1', role: 'user', content: 'go' }]

// Proof-local, and deliberately not promoted to `tests/setup.ts`: nothing but this proof drives a
// provider generator directly for BOTH halves at once (the yielded deltas AND the generator's
// return value). Every suite drives the provider through the agent, which surfaces the two halves
// separately.
async function drainProvider(
	generator: AsyncGenerator<ProviderDelta, ProviderResult>,
): Promise<{ readonly deltas: readonly ProviderDelta[]; readonly result: ProviderResult }> {
	const deltas: ProviderDelta[] = []
	let step = await generator.next()
	while (!step.done) {
		deltas.push(step.value)
		step = await generator.next()
	}
	return { deltas, result: step.value }
}

// Proof-local conforming `ConversationStoreInterface` — the minimal real boundary the exported
// battery is run against. The battery's subject is the CONTRACT it registers, so running it
// through `MemoryConversationStore` here would re-run that store's own suite inside the setup
// proof; persistence stays with the twins and this store exists only to let the battery execute.
function createFixtureStore(): ConversationStoreInterface {
	const held = new Map<string, ConversationSnapshot>()
	return {
		async get(id) {
			return held.get(id)
		},
		async set(snapshot) {
			held.set(snapshot.id, snapshot)
		},
		async delete(id) {
			held.delete(id)
		},
	}
}

describe('createScriptedProvider replay', () => {
	it('consumes one turn per call and returns that turn in script order', async () => {
		const provider = createScriptedProvider([{ content: 'one' }, { content: 'two' }])
		const first = await provider.generate(messages, AbortSignal.timeout(1_000))
		const second = await provider.generate(messages, AbortSignal.timeout(1_000))
		expect([first.content, second.content]).toEqual(['one', 'two'])
	})

	it('repeats the last turn once the script is exhausted', async () => {
		const provider = createScriptedProvider([{ content: 'one' }, { content: 'last' }])
		await provider.generate(messages, AbortSignal.timeout(1_000))
		await provider.generate(messages, AbortSignal.timeout(1_000))
		const past = await provider.generate(messages, AbortSignal.timeout(1_000))
		expect(past.content).toBe('last')
	})

	it('throws past the end of the script under exhaust throw', async () => {
		const provider = createScriptedProvider([{ content: 'only' }], { exhaust: 'throw' })
		await provider.generate(messages, AbortSignal.timeout(1_000))
		await expect(provider.generate(messages, AbortSignal.timeout(1_000))).rejects.toThrow(
			/exhausted at turn 1/,
		)
	})
})

describe('createScriptedProvider streaming', () => {
	it('streams a turn as one whole content delta and returns the assembled result', async () => {
		const result: ProviderResult = {
			content: 'whole answer',
			usage: { prompt: 1, completion: 2, total: 3 },
		}
		const provider = createScriptedProvider([result])
		const drained = await drainProvider(provider.stream(messages, AbortSignal.timeout(1_000)))
		expect(drained.deltas).toEqual([{ channel: 'content', text: 'whole answer' }])
		// The generator RETURNS the turn, so a consumer that only reads the return still gets
		// the usage and any tool calls the deltas never carried.
		expect(drained.result).toEqual(result)
	})

	it('chunks a turn through deltasOf, and the deltas reassemble into the content', async () => {
		const content = 'chunked'
		const provider = createScriptedProvider([{ content }], {
			deltasOf: (text) => [...text],
		})
		const drained = await drainProvider(provider.stream(messages, AbortSignal.timeout(1_000)))
		// Reassembly is the second route: the deltas are proven against the content by joining
		// them back, not by restating whatever `deltasOf` produced.
		expect(drained.deltas.map((delta) => delta.text).join('')).toBe(content)
		expect(drained.deltas).toHaveLength(content.length)
		expect(drained.deltas.every((delta) => delta.channel === 'content')).toBe(true)
	})

	it('lets a per-turn deltas list override deltasOf for that one turn', async () => {
		const provider = createScriptedProvider(
			[{ result: { content: 'whole' }, deltas: ['x', 'y'] }, { content: 'later' }],
			{ deltasOf: () => ['ignored'] },
		)
		const overridden = await drainProvider(provider.stream(messages, AbortSignal.timeout(1_000)))
		expect(overridden.deltas.map((delta) => delta.text)).toEqual(['x', 'y'])
		// The override governs the STREAM alone; the turn's own result still returns whole.
		expect(overridden.result.content).toBe('whole')
		// And it is per-turn: the next turn falls back to the provider-wide `deltasOf`.
		const next = await drainProvider(provider.stream(messages, AbortSignal.timeout(1_000)))
		expect(next.deltas.map((delta) => delta.text)).toEqual(['ignored'])
	})

	it('yields no delta for an empty list or an empty chunk, and still returns the turn', async () => {
		const silent = createScriptedProvider([{ result: { content: 'unstreamed' }, deltas: [] }])
		const drained = await drainProvider(silent.stream(messages, AbortSignal.timeout(1_000)))
		expect(drained.deltas).toEqual([])
		expect(drained.result.content).toBe('unstreamed')
		// A zero-length chunk is dropped the same way, so a consumer never sees a textless delta.
		const padded = createScriptedProvider([
			{ result: { content: 'ab' }, deltas: ['', 'a', '', 'b'] },
		])
		const spaced = await drainProvider(padded.stream(messages, AbortSignal.timeout(1_000)))
		expect(spaced.deltas.map((delta) => delta.text)).toEqual(['a', 'b'])
	})

	it('streams a turn thoughts as thinking deltas ahead of its content', async () => {
		const provider = createScriptedProvider([
			{
				result: { content: 'answer', thinking: 'weighed it' },
				deltas: ['ans', 'wer'],
				thoughts: ['wei', 'ghed'],
			},
		])
		const drained = await drainProvider(provider.stream(messages, AbortSignal.timeout(1_000)))
		// The two channels stay separate and ordered: every thinking delta precedes every content one.
		expect(drained.deltas.map((delta) => delta.channel)).toEqual([
			'thinking',
			'thinking',
			'content',
			'content',
		])
		const reasoned = drained.deltas.filter((delta) => delta.channel === 'thinking')
		expect(reasoned.map((delta) => delta.text).join('')).toBe('weighed')
		expect(drained.result.thinking).toBe('weighed it')
	})

	it('assembles the same result through generate as the stream returns', async () => {
		const turn: ProviderResult = {
			content: 'parity',
			tools: [{ id: 'c9', name: 'add', arguments: { left: 1 } }],
		}
		const streamed = createScriptedProvider([turn], { deltasOf: (text) => [...text] })
		const generated = createScriptedProvider([turn], { deltasOf: (text) => [...text] })
		const drained = await drainProvider(streamed.stream(messages, AbortSignal.timeout(1_000)))
		// `generate` drives the same generator to its return, so the two entry points agree
		// exactly — the parity every generate/stream test in `tests/src` leans on.
		expect(await generated.generate(messages, AbortSignal.timeout(1_000))).toEqual(drained.result)
	})
})

describe('createScriptedProvider abort', () => {
	it('throws a ProviderAbortError with an empty partial when the signal is already aborted', async () => {
		const provider = createScriptedProvider([{ content: 'never streamed' }])
		const generator = provider.stream(messages, AbortSignal.abort())
		let caught: unknown
		try {
			await generator.next()
		} catch (error) {
			caught = error
		}
		if (!isProviderAbortError(caught)) throw new Error('expected a ProviderAbortError')
		expect(caught.partial).toEqual({ content: '' })
	})

	it('throws a ProviderAbortError carrying the content streamed before a mid-stream abort', async () => {
		const controller = new AbortController()
		const provider = createScriptedProvider([{ result: { content: 'ab' }, deltas: ['a', 'b'] }])
		const generator = provider.stream(messages, controller.signal)
		const first = await generator.next()
		expect(first.value).toEqual({ channel: 'content', text: 'a' })
		controller.abort()
		let caught: unknown
		try {
			await generator.next()
		} catch (error) {
			caught = error
		}
		if (!isProviderAbortError(caught)) throw new Error('expected a ProviderAbortError')
		// The partial is a GENUINE partial: what streamed, never the turn's whole content.
		expect(caught.partial).toEqual({ content: 'a' })
	})

	it('carries the reasoning streamed so far on a partial aborted during the thoughts', async () => {
		const controller = new AbortController()
		const provider = createScriptedProvider([
			{ result: { content: 'ab' }, deltas: ['a', 'b'], thoughts: ['t1', 't2'] },
		])
		const generator = provider.stream(messages, controller.signal)
		await generator.next()
		controller.abort()
		let caught: unknown
		try {
			await generator.next()
		} catch (error) {
			caught = error
		}
		if (!isProviderAbortError(caught)) throw new Error('expected a ProviderAbortError')
		expect(caught.partial).toEqual({ content: '', thinking: 't1' })
	})
})

describe('createScriptedProvider identity and recorders', () => {
	it('names the provider through name, defaulting to scripted', async () => {
		const fallback = createScriptedProvider([{ content: 'x' }])
		expect([fallback.id, fallback.name]).toEqual(['scripted', 'scripted'])
		const named = createScriptedProvider([{ content: 'x' }], { name: 'alpha' })
		expect([named.id, named.name]).toEqual(['alpha', 'alpha'])
	})

	it('carries a format only when one is supplied', async () => {
		const agnostic = createScriptedProvider([{ content: 'x' }])
		expect(agnostic.format).toBeUndefined()
		const format: ContextFormat = {}
		const framed = createScriptedProvider([{ content: 'x' }], { format })
		expect(framed.format).toBe(format)
	})

	it('records each call messages, tools, options and signal only under record', async () => {
		const tools: readonly ToolDefinition[] = [{ name: 'add', description: 'adds' }]
		const signal = AbortSignal.timeout(1_000)
		const recording = createScriptedProvider([{ content: 'x' }], { record: true })
		await recording.generate(messages, signal, tools, { think: true })
		expect(recording.calls).toHaveLength(1)
		expect(recording.calls[0]?.messages).toEqual(messages)
		expect(recording.calls[0]?.tools).toEqual(tools)
		expect(recording.calls[0]?.options).toEqual({ think: true })
		// The LIVE signal is held, so a test can read which bound tripped after the call returned.
		expect(recording.calls[0]?.signal).toBe(signal)
	})

	it('records nothing unless record is set', async () => {
		const provider = createScriptedProvider([{ content: 'x' }])
		await provider.generate(messages, AbortSignal.timeout(1_000))
		expect(provider.calls).toEqual([])
	})

	it('reports the concurrent high-water mark and the calls started', async () => {
		const provider = createScriptedProvider([{ content: 'x' }], { delay: 20 })
		const serial = provider.generate(messages, AbortSignal.timeout(1_000))
		await serial
		// One at a time so far, and the test itself is the second route on the count.
		expect(provider.maxInFlight).toBe(1)
		expect(provider.started).toBe(1)
		await Promise.all([
			provider.generate(messages, AbortSignal.timeout(1_000)),
			provider.generate(messages, AbortSignal.timeout(1_000)),
			provider.generate(messages, AbortSignal.timeout(1_000)),
		])
		// The mark is a high-water mark, not a live gauge: it holds after the calls settled.
		expect(provider.maxInFlight).toBe(3)
		expect(provider.started).toBe(4)
	})
})

describe('agent data builders', () => {
	it('builds a tool call from the default add call plus named overrides', () => {
		expect(createToolCall()).toEqual({ id: 'c1', name: 'add', arguments: {} })
		// An override replaces only what it names; every unnamed field keeps its default.
		expect(createToolCall({ arguments: { left: 2 } })).toEqual({
			id: 'c1',
			name: 'add',
			arguments: { left: 2 },
		})
	})

	it('builds a token usage from the default counts plus named overrides', () => {
		expect(createTokenUsage()).toEqual({ prompt: 5, completion: 7, total: 12 })
		expect(createTokenUsage({ total: 99 })).toEqual({ prompt: 5, completion: 7, total: 99 })
	})

	it('builds an agent job from the default provider and seed turn plus named overrides', () => {
		expect(createAgentJob()).toEqual({
			provider: 'main',
			messages: [{ role: 'user', content: 'go' }],
		})
		const bounded = createAgentJob({ provider: 'spare', budget: 40 })
		expect(bounded.provider).toBe('spare')
		expect(bounded.budget).toBe(40)
		expect(bounded.messages).toEqual([{ role: 'user', content: 'go' }])
	})
})

describe('canonical tools', () => {
	it('returns a real callable add tool that resolves 5', async () => {
		const tool = addTool()
		expect(tool.name).toBe('add')
		// A real `ToolInterface`, not a stub: the loop calls `execute` and feeds the result back.
		expect(await tool.execute({})).toBe(5)
	})

	it('returns a real callable loop tool that resolves again', async () => {
		const tool = loopTool()
		expect(tool.name).toBe('loop')
		expect(await tool.execute({})).toBe('again')
	})

	it('mints an independent tool on every call', () => {
		expect(addTool()).not.toBe(addTool())
		expect(loopTool()).not.toBe(loopTool())
	})
})

describe('createStubSummarizer', () => {
	it('digests a slice into its folded count and records every slice digested', async () => {
		const stub = createStubSummarizer()
		const pair: readonly Message[] = [
			{ id: 'a', role: 'user', content: 'first' },
			{ id: 'b', role: 'assistant', content: 'second' },
		]
		const single: readonly Message[] = [{ id: 'c', role: 'user', content: 'third' }]
		const digests = [await stub.summarize(pair), await stub.summarize(single)]
		// The digest names the slice's OWN length, so two different slices digest differently —
		// the property a compaction test leans on when it reads a section summary back.
		expect(digests).toEqual([`recap of ${pair.length}`, `recap of ${single.length}`])
		expect(digests[0]).not.toBe(digests[1])
		// The recorder holds each digested slice in order, so a test can prove the TWO
		// summarizer calls one compaction makes.
		expect(stub.calls).toEqual([pair, single])
	})
})

describe('createRecordingScheduler', () => {
	it('counts each paced turn boundary and resolves its delay as a no-op', async () => {
		const scheduler = createRecordingScheduler()
		expect(scheduler.yields).toBe(0)
		await scheduler.yield()
		await scheduler.yield()
		expect(scheduler.yields).toBe(2)
		await expect(scheduler.delay(1_000)).resolves.toBeUndefined()
	})

	it('rejects with the signal reason on an aborted yield and paces nothing', async () => {
		const scheduler = createRecordingScheduler()
		const reason = new Error('cancelled')
		await expect(scheduler.yield({ signal: AbortSignal.abort(reason) })).rejects.toBe(reason)
		expect(scheduler.yields).toBe(0)
	})
})

describe('buildConversationSnapshot', () => {
	it('folds the oldest turns into one summarized section and keeps the last live', async () => {
		const snapshot = await buildConversationSnapshot()
		expect(snapshot.sections).toHaveLength(1)
		const section = snapshot.sections[0]
		if (section === undefined) throw new Error('expected one compacted section')
		// The fold is non-vacuous on BOTH halves: the section retained more than one original
		// and the live tail still carries the kept turn.
		expect(section.messages.length).toBeGreaterThan(1)
		expect(snapshot.messages).toHaveLength(1)
		// The section summary recomputed from the originals the section RETAINED — a second
		// route to the digest, rather than restating the literal the module folded.
		expect(section.summary).toBe(
			`recap(${section.messages.map((message) => message.content).join('|')})`,
		)
		// And the rollup is a summary-of-summaries over those sections, by the same route.
		expect(snapshot.summary).toBe(`recap(${snapshot.sections.map((one) => one.summary).join('|')})`)
		// The folded originals never linger in the live tail.
		const live = snapshot.messages.map((message) => message.id)
		expect(section.messages.some((message) => live.includes(message.id))).toBe(false)
	})

	it('takes the conversation id from its argument and defaults to chat', async () => {
		expect((await buildConversationSnapshot()).id).toBe('chat')
		expect((await buildConversationSnapshot('alpha')).id).toBe('alpha')
	})
})

// The exported store contract scenarios, driven once each against a conforming boundary. Running them
// here is the proof: the helper's whole behaviour IS what each scenario returns, so a scenario that
// stopped returning a real result, or returned one a conforming store cannot satisfy, reddens this
// file. The store twins keep their own registration and their own twin-specific blocks.
describe('conversation-store contract scenarios run against a conforming store', () => {
	describe('set → get round-trip (sections + live tail + rollup summary)', () => {
		it('set → get returns an equal snapshot (sections + tail + summary survive)', async () => {
			const { snapshot, got } = await conversationStoreRoundTrip(
				createFixtureStore,
				buildConversationSnapshot,
			)
			expect(got).toEqual(snapshot)
			expect(got?.sections).toHaveLength(1)
			expect(got?.sections[0]?.summary).toBe(conversationStoreRoundTripExpectation.sectionSummary)
			expect(got?.sections[0]?.messages.map((message) => message.content)).toEqual(
				conversationStoreRoundTripExpectation.sectionMessages,
			)
			expect(got?.messages.map((message) => message.content)).toEqual(
				conversationStoreRoundTripExpectation.liveTail,
			)
			expect(got?.summary).toBe(conversationStoreRoundTripExpectation.rollupSummary)
		})
	})

	describe('upsert (set replaces under the same id)', () => {
		it('set replaces an existing snapshot under the same id', async () => {
			const { second, got } = await conversationStoreUpsert(
				createFixtureStore,
				buildConversationSnapshot,
			)
			expect(got).toEqual(second)
		})
	})

	describe('delete & absent', () => {
		it('set → delete → get returns undefined', async () => {
			const { beforeDelete, afterDelete } = await conversationStoreDeleteThenAbsent(
				createFixtureStore,
				buildConversationSnapshot,
			)
			expect(beforeDelete).toBeDefined()
			expect(afterDelete).toBeUndefined()
		})

		it('deleting an absent id does not throw (a no-op)', async () => {
			await expect(conversationStoreDeleteAbsent(createFixtureStore)).resolves.toBeUndefined()
		})

		it('get of an absent id returns undefined', async () => {
			expect(await conversationStoreGetAbsent(createFixtureStore)).toBeUndefined()
		})
	})

	describe('two distinct conversation ids coexist', () => {
		it('two distinct conversation ids coexist without cross-contamination', async () => {
			const { alpha, beta, gotAlpha, gotBeta, gotAlphaAfterDelete, gotBetaAfterDelete } =
				await conversationStoreTwoIds(createFixtureStore, buildConversationSnapshot)
			expect(gotAlpha).toEqual(alpha)
			expect(gotBeta).toEqual(beta)
			expect(gotAlphaAfterDelete).toBeUndefined()
			expect(gotBetaAfterDelete).toEqual(beta)
		})
	})
})
