import {
	buildLedgerTailScenario,
	observeLedgerTail,
	observeLedgerWork,
	serializeLedgerRequests,
	buildLedgerTranscriptFixture,
	LEDGER_TRANSCRIPT_EXPECTED,
	LEDGER_WORK_FIXTURE,
	MEASURE_CALLS,
	MEASURE_CIRCULAR,
	MESSAGE_MEASURE_CASES,
	REQUEST_ADD,
	REQUEST_HELLO,
	REQUEST_LONG,
	REQUEST_MEASURE_CASES,
} from './setup.js'
import {
	createPhraseJudge,
	LEDGER_REFUNDS_TOPIC,
	LEDGER_ORDER_LOOKUP,
	fileLedgerCorrection,
	planLedgerDelivery,
	LEDGER_BRIEFING_MARKERS,
	briefLedgerDesk,
	serveAmendedDesk,
	classifyLedgerCorrection,
	exerciseThinkingReplay,
	collectMessageThinking,
	createBoundedRelay,
	buildGuideLedgerOptions,
	measureMessages,
	readCallRequest,
} from './setup.js'
import type { LedgerProjection, Message, ProviderResult } from '@src/core'
import type { ToolDefinition } from '@orkestrel/tool'
import { Channel, createAgent, estimateRequest, ProviderAbortError } from '@src/core'
import { createRecorder } from '@orkestrel/test'
import {
	createAuthorityContext,
	createMessage,
	computeUsageTotal,
	returnUndefined,
	collectPaced,
	CountingAgentResult,
	createInvalidAgentResultCases,
	seedCompactionAgent,
	requestConversation,
	createConversationEchoProvider,
	createEchoProvider,
	createAnswerProvider,
	createTurnRegistry,
	createInterleavedThinkingProvider,
	createPacedProvider,
	createGatedProvider,
	createAbortingGatedProvider,
	createObservedGatedProvider,
	createIndependentGatedProvider,
	createSharedGatedProvider,
	createThrowingProvider,
	createAbortingResultProvider,
	createSecondTurnFailureProvider,
	createFailingScheduler,
} from './setup.js'
import {
	Classifier,
	LedgerError,
	LEDGER_QUESTIONS,
	buildRecords,
	CONVERSATION_RECAP_PREFIX,
	createSystemOneJudge,
	ConversationManager,
	createConversation,
	createMemoryConversationStore,
	isConversationSnapshot,
	isProviderAbortError,
	ThinkSplitter,
} from '@src/core'
import { requireValue, waitForDelay } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import {
	JUDGMENT_QUESTION,
	buildCallsSnapshot,
	buildSystemOneProbabilityCases,
	driveThinkSplitter,
	JUDGE_PROTOCOL_CASES,
	buildConversationSnapshot,
	chunkWholeDelta,
	compactSeedTurns,
	CONVERSATION_STORE_ROUND_TRIP_EXPECTATION,
	createAddTool,
	createAgentJob,
	createAgentTurn,
	createLoopTool,
	createRecordingScheduler,
	createRecordedJudge,
	RecordingJudge,
	buildProviderPartial,
	createRefusingTransport,
	createRelayRequest,
	createScriptedProvider,
	createSeededToolManager,
	createStreamingTransport,
	createStubSummarizer,
	createTokenUsage,
	createToolCall,
	drainProvider,
	exerciseConversationStoreDeleteAbsent,
	exerciseConversationStoreDeleteThenAbsent,
	exerciseConversationStoreGetAbsent,
	exerciseConversationStoreRoundTrip,
	exerciseConversationStoreTwoIds,
	exerciseConversationStoreUpsert,
	plantConversationRow,
	RecordedBody,
	RecordedProvider,
	RecordedTransport,
	SYSTEM_ONE_TEV1,
	recordGlobalTransport,
	rejectTransportOnAbort,
	renderRecap,
	resolveSectionOpen,
	resolveSectionRender,
	returnDomain,
	ScriptedFrame,
	ScriptedWire,
	seedConversation,
	seedFramedAgent,
	buildExchangeMessages,
	buildToolGroupMessages,
	generateReply,
	splitWordDeltas,
	seedInstructionContext,
	seedWorkspaceContext,
	splitTurn,
	buildLedgerClassification,
	buildLedgerInput,
	buildLedgerMessage,
	buildLedgerReading,
	checkLedgerProjection,
	createLedgerDesk,
	createLedgerRequest,
	LEDGER_DESK_OWNERS,
	LEDGER_HANDLE,
	reverseLedgerInput,
	buildLedgerLine,
	replaceLedgerRecord,
	computeLedgerIdentity,
	listPlacementKeys,
	hasEffect,
	reverseLedgerMembers,
	reverseLedgerMap,
	sortLedgerKeys,
	computeLedgerErrorCode,
	buildGaugeCall,
	measureRoom,
	buildLedgerOptions,
	buildClassifierOptions,
	buildReadingSummaries,
	CLASSIFIER_PINNED_ASKS,
	summarizeReadings,
	LEDGER_DESK_THRESHOLDS,
	buildLedgerJudgment,
	buildLedgerExchange,
	buildLedgerResponse,
	createLedgerJudge,
	SwitchingJudge,
	buildDeliverySeed,
	buildLedgerPairJudgment,
	buildLedgerTopicJudgment,
	buildUncalibratedOptions,
	createForeignSignal,
	createRecordedBudget,
	createRecordedTool,
	createRelayHop,
	RecordedScheduler,
	ScriptedReads,
} from './setup.js'
import type { TokenUsage } from '@orkestrel/budget'
import { createDatabase, createMemoryDriver } from '@orkestrel/database'
import { rawShape, stringShape } from '@orkestrel/contract'

// setup.test.ts — the proof of `tests/setup.ts`, the host-independent shared test-infrastructure
// module. Its subject is the exported HELPERS' behaviour, the behaviour every suite in
// `tests/src/**` codes against: what the scripted provider streams and returns, what the data
// builders default to and how an override lands, what the recorders record, what shape
// `buildConversationSnapshot` settles into, and that the exported store battery registers a
// contract a conforming store passes. Production behaviour is NOT re-proven here — the agent
// loop, the conversation, and the two store twins each have their own mirrored suite, and this
// file asserts nothing about them.
//
// Each expectation compares the helper with a declaration or a second mechanism that could
// disagree with it: a chunked stream is reassembled from its deltas, a folded snapshot is compared
// with the declared round-trip literals, and a concurrency high-water mark is read against calls
// the test itself holds open.

// The messages every scripted call is handed. A provider is framing-agnostic, so one seed turn
// is enough for every case that does not assert on what was passed through.
const messages: readonly Message[] = [{ id: 'm1', role: 'user', content: 'go' }]

describe('agent scenario infrastructure', () => {
	it('normalizes declared transcript identities against fixed expected request bytes', () => {
		const fixture = buildLedgerTranscriptFixture()
		expect(serializeLedgerRequests(fixture.ledger, fixture.calls, fixture.judges)).toBe(
			JSON.stringify(LEDGER_TRANSCRIPT_EXPECTED),
		)
		expect(fixture.ledger.conversation.judgments.judgments()).toEqual([])
	})
	it('preserves changed provider content that equals a message identity', () => {
		const baseline = buildLedgerTranscriptFixture()
		const changed = buildLedgerTranscriptFixture({ content: '@message:2' })
		expect(serializeLedgerRequests(changed.ledger, changed.calls, changed.judges)).not.toBe(
			serializeLedgerRequests(baseline.ledger, baseline.calls, baseline.judges),
		)
	})
	it('preserves changed judge state that equals a message identity', () => {
		const baseline = buildLedgerTranscriptFixture()
		const changed = buildLedgerTranscriptFixture({ state: '@message:2' })
		expect(serializeLedgerRequests(changed.ledger, changed.calls, changed.judges)).not.toBe(
			serializeLedgerRequests(baseline.ledger, baseline.calls, baseline.judges),
		)
	})
	it('preserves changed judge question text that equals a message identity', () => {
		const baseline = buildLedgerTranscriptFixture()
		const changed = buildLedgerTranscriptFixture({ instructions: '@message:2' })
		expect(serializeLedgerRequests(changed.ledger, changed.calls, changed.judges)).not.toBe(
			serializeLedgerRequests(baseline.ledger, baseline.calls, baseline.judges),
		)
	})
	it('distinguishes literal normalization tokens from fixed system text', () => {
		const baseline = buildLedgerTranscriptFixture()
		const collision = buildLedgerTranscriptFixture({ system: '@message:1' })
		expect(serializeLedgerRequests(collision.ledger, collision.calls, collision.judges)).not.toBe(
			serializeLedgerRequests(baseline.ledger, baseline.calls, baseline.judges),
		)
	})
	it('records the named-work fixture and preserves every non-identity request byte', async () => {
		const observed = await observeLedgerWork()
		expect(observed.results).toHaveLength(2)
		expect(observed.calls).toHaveLength(2)
		expect(observed.judges.length).toBeGreaterThan(0)
		expect(observed.results[0]?.content).toBe(LEDGER_WORK_FIXTURE.reply)
		expect(observed.transcript).toBe((await observeLedgerWork()).transcript)
		expect(serializeLedgerRequests(observed.ledger, observed.calls, observed.judges)).toBe(
			observed.transcript,
		)
		expect(serializeLedgerRequests(observed.ledger, [], observed.judges)).not.toBe(
			observed.transcript,
		)
	})
	it('records the tail fixture request prefix and stable request identities', async () => {
		const observed = await observeLedgerTail({}, 1)
		expect(observed.results).toHaveLength(1)
		expect(observed.calls).toHaveLength(2)
		expect(observed.seed).toHaveLength(3)
		expect(observed.transcript).toContain('@message:0')
		expect(observed.transcript).not.toContain(observed.seed[0]?.id)
		expect(observed.transcript).toBe((await observeLedgerTail({}, 1)).transcript)
	})
	it('builds authority and message fixtures and totals recorded usage', () => {
		expect(createAuthorityContext('read', { path: 'note' })).toEqual({
			call: { id: 'c1', name: 'read', arguments: { path: 'note' } },
		})
		expect(createMessage('hello')).toEqual({ id: 'm', role: 'user', content: 'hello' })
		expect(
			computeUsageTotal(
				[[{ prompt: 2, completion: 3, total: 5 }], [{ prompt: 1, completion: 1, total: 2 }]],
				'total',
			),
		).toBe(7)
		expect(returnUndefined()).toBeUndefined()
	})

	it('collects paced values and preserves a channel failure', async () => {
		const channel = new Channel<number>()
		const collection = collectPaced(channel, 0)
		channel.push(1)
		channel.push(2)
		channel.close()
		expect(await collection).toEqual([1, 2])
		const failed = new Channel<number>()
		failed.fail(new Error('paced failure'))
		await expect(collectPaced(failed, 0)).rejects.toThrow('paced failure')
	})

	it('records each result getter and supplies hostile projection cases', () => {
		const counted = new CountingAgentResult()
		expect(counted.content).toBe('done')
		expect(counted.thinking).toBe('reasoning')
		expect(counted.partial).toBe(false)
		const usage = counted.usage
		expect([usage.prompt, usage.completion, usage.total]).toEqual([2, 1, 3])
		expect(counted.accesses.calls).toEqual([
			['content'],
			['thinking'],
			['partial'],
			['usage'],
			['prompt'],
			['completion'],
			['total'],
		])
		const cases = createInvalidAgentResultCases()
		expect(cases.length).toBeGreaterThan(0)
		expect(cases.map(([name]) => name)).toContain('revoked root proxy')
	})

	it('seeds the compaction scenario and drives a named conversation request', async () => {
		const seeded = seedCompactionAgent(undefined)
		expect(seeded.conversation.messages().map((message) => message.content)).toEqual(['go'])
		expect(seeded.agent.context.tools.definitions().map((tool) => tool.name)).toEqual(['add'])
		expect((await seeded.agent.generate()).content).toBe('the answer is 42')
		const agent = createAgent(createConversationEchoProvider())
		const result = await requestConversation(
			agent,
			agent.context.conversations,
			'thread',
			'question',
		)
		expect(result.content).toBe('answer:question')
		expect(agent.context.conversations.active?.id).toBe('thread')
		expect(
			(await createEchoProvider().generate([createMessage('input')], new AbortController().signal))
				.content,
		).toBe('ok:input')
		expect((await createAnswerProvider().generate([], new AbortController().signal)).content).toBe(
			'final answer',
		)
		expect(
			(await createTurnRegistry({ content: 'registered' }).build(createAgentJob()).generate())
				.content,
		).toBe('registered')
	})

	it('preserves interleaved thinking and paced content deltas', async () => {
		const signal = new AbortController().signal
		const thinking = await drainProvider(createInterleavedThinkingProvider().stream([], signal))
		expect(thinking.deltas).toEqual([
			{ channel: 'thinking', text: 'plan ' },
			{ channel: 'content', text: 'answer' },
			{ channel: 'thinking', text: 'check' },
		])
		expect(thinking.result).toEqual({ content: 'answer', thinking: 'plan check' })
		expect((await drainProvider(createPacedProvider().stream([], signal))).deltas).toEqual([
			{ channel: 'content', text: 'a' },
			{ channel: 'content', text: 'b' },
		])
	})

	it('holds a gated result and reports observed cancellation with partial usage', async () => {
		const gate = Promise.withResolvers<void>()
		const signal = new AbortController()
		const held = createGatedProvider(gate).stream([], signal.signal)
		expect(await held.next()).toEqual({ done: false, value: { channel: 'content', text: 'part' } })
		gate.resolve()
		expect(await held.next()).toEqual({ done: true, value: { content: 'full' } })
		const abortGate = Promise.withResolvers<void>()
		const partial = createAbortingGatedProvider(abortGate, {
			prompt: 2,
			completion: 1,
			total: 3,
		}).stream([], signal.signal)
		await partial.next()
		signal.abort()
		abortGate.resolve()
		await expect(partial.next()).rejects.toMatchObject({
			partial: { content: 'part', usage: { prompt: 2, completion: 1, total: 3 } },
		})
		const observed = createRecorder<[boolean]>()
		const stream = createObservedGatedProvider(abortGate, observed.handler).stream(
			[],
			signal.signal,
		)
		await stream.next()
		await expect(stream.next()).rejects.toMatchObject({ partial: { content: 'part' } })
		expect(observed.calls).toEqual([[true]])
	})

	it('keeps concurrent provider gates and results distinct', async () => {
		const first = Promise.withResolvers<void>()
		const second = Promise.withResolvers<void>()
		const controller = new AbortController()
		const provider = createIndependentGatedProvider(first, second)
		const left = provider.stream([], controller.signal)
		const right = provider.stream([], controller.signal)
		await left.next()
		await right.next()
		first.resolve()
		second.resolve()
		expect(await left.next()).toEqual({ done: true, value: { content: 'full-1' } })
		expect(await right.next()).toEqual({ done: true, value: { content: 'full-2' } })
		const shared = createSharedGatedProvider(first, second)
		expect((await drainProvider(shared.stream([], controller.signal))).result.content).toBe('full')
	})

	it('parks the first shared call on the first gate and every later call on the second', async () => {
		const first = Promise.withResolvers<void>()
		const second = Promise.withResolvers<void>()
		const controller = new AbortController()
		const provider = createSharedGatedProvider(first, second)
		const left = provider.stream([], controller.signal)
		const middle = provider.stream([], controller.signal)
		const right = provider.stream([], controller.signal)
		for (const stream of [left, middle, right]) await stream.next()
		const one = left.next()
		const two = middle.next()
		const three = right.next()
		second.resolve()
		expect(await two).toEqual({ done: true, value: { content: 'full' } })
		expect(await three).toEqual({ done: true, value: { content: 'full' } })
		expect(
			await Promise.race([one.then(() => 'settled'), waitForDelay(20).then(() => 'parked')]),
		).toBe('parked')
		first.resolve()
		expect(await one).toEqual({ done: true, value: { content: 'full' } })
	})

	it('numbers independent calls by arrival and parks each on its own gate', async () => {
		const first = Promise.withResolvers<void>()
		const second = Promise.withResolvers<void>()
		const controller = new AbortController()
		const provider = createIndependentGatedProvider(first, second)
		const left = provider.stream([], controller.signal)
		const right = provider.stream([], controller.signal)
		for (const stream of [left, right]) await stream.next()
		const one = left.next()
		const two = right.next()
		second.resolve()
		expect(await two).toEqual({ done: true, value: { content: 'full-2' } })
		expect(
			await Promise.race([one.then(() => 'settled'), waitForDelay(20).then(() => 'parked')]),
		).toBe('parked')
		first.resolve()
		expect(await one).toEqual({ done: true, value: { content: 'full-1' } })
	})

	it('supplies provider and scheduler failure boundaries', async () => {
		const signal = new AbortController()
		const throwing = createThrowingProvider('broken', 'prefix')
		const stream = throwing.stream([], signal.signal)
		expect((await stream.next()).value).toEqual({ channel: 'content', text: 'prefix' })
		await expect(stream.next()).rejects.toThrow('broken')
		await expect(throwing.generate([], signal.signal)).rejects.toThrow('broken')
		const failure = new ProviderAbortError({ content: 'x' })
		const aborting = createAbortingResultProvider(signal, failure).stream([], signal.signal)
		await aborting.next()
		await expect(aborting.next()).rejects.toBe(failure)
		expect(signal.signal.aborted).toBe(true)
		const secondTurn = createSecondTurnFailureProvider()
		expect(
			(await drainProvider(secondTurn.stream([], new AbortController().signal))).result.tools,
		).toEqual([createToolCall()])
		await expect(secondTurn.stream([], new AbortController().signal).next()).rejects.toThrow(
			'turn 2 boom',
		)
		await expect(createFailingScheduler().yield()).rejects.toThrow('scheduler fault')
	})
})

describe('hand-counted measure fixtures', () => {
	it('keep each expected measure joined to its message with components that sum to the stated total', () => {
		expect(new Set(MESSAGE_MEASURE_CASES.map((entry) => entry.label)).size).toBe(
			MESSAGE_MEASURE_CASES.length,
		)
		for (const entry of MESSAGE_MEASURE_CASES) {
			const { expected, message, total } = entry
			expect([entry.label, expected.id, expected.role]).toEqual([
				entry.label,
				message.id,
				message.role,
			])
			expect([
				entry.label,
				expected.content + expected.framing + expected.calls + expected.thinking + expected.images,
			]).toEqual([entry.label, total])
		}
		// Every component the estimator prices appears in at least one fixture, so no weight goes unpinned.
		for (const key of ['content', 'calls', 'thinking', 'images'] as const)
			expect(MESSAGE_MEASURE_CASES.some((entry) => entry.expected[key] > 0)).toBe(true)
	})

	it('keep each expected request measure joined to its messages in order with the stated total', () => {
		expect(new Set(REQUEST_MEASURE_CASES.map((entry) => entry.label)).size).toBe(
			REQUEST_MEASURE_CASES.length,
		)
		for (const entry of REQUEST_MEASURE_CASES) {
			const { expected, request, total } = entry
			expect([entry.label, expected.messages.map((measure) => [measure.id, measure.role])]).toEqual(
				[entry.label, request.messages.map((message) => [message.id, message.role])],
			)
			expect([
				entry.label,
				expected.messages.reduce(
					(sum, measure) =>
						sum +
						measure.content +
						measure.framing +
						measure.calls +
						measure.thinking +
						measure.images,
					expected.tools + expected.schema,
				),
			]).toEqual([entry.label, total])
		}
		expect(REQUEST_MEASURE_CASES.some((entry) => entry.expected.tools > 0)).toBe(true)
		expect(REQUEST_MEASURE_CASES.some((entry) => entry.expected.schema > 0)).toBe(true)
	})
})

describe('shared request and measure fixtures', () => {
	it('price at the hand counts their tables rest on', () => {
		// `hello` is 5 characters, so content 2 with framing 4; 40 characters is content 10 with framing 4.
		expect(estimateRequest({ messages: [REQUEST_HELLO] })).toBe(6)
		expect(estimateRequest({ messages: [REQUEST_LONG] })).toBe(14)
		// The advertised `add` definition costs 18 beside no messages.
		expect(estimateRequest({ messages: [], tools: [REQUEST_ADD] })).toBe(18)
		expect([REQUEST_HELLO.id, REQUEST_LONG.id, REQUEST_ADD.name]).toEqual(['m', 'n', 'add'])
		// One `add` call renders to 41 characters, so 11, beside framing 4.
		expect(
			estimateRequest({
				messages: [{ id: 'x', role: 'assistant', content: '', calls: MEASURE_CALLS }],
			}),
		).toBe(15)
		expect(MEASURE_CALLS.map((call) => call.name)).toEqual(['add'])
	})

	it('hold an object JSON cannot render, which costs the framing alone', () => {
		expect(MEASURE_CIRCULAR.self).toBe(MEASURE_CIRCULAR)
		expect(() => JSON.stringify(MEASURE_CIRCULAR)).toThrow(TypeError)
		expect(estimateRequest({ messages: [], options: { schema: MEASURE_CIRCULAR } })).toBe(4)
		expect(
			estimateRequest({ messages: [], tools: [{ name: 'lookup', parameters: MEASURE_CIRCULAR }] }),
		).toBe(4)
	})
})

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
		const provider = createScriptedProvider([{ content: 'only' }], { repeat: false })
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

	it('chunks a turn through chunk, and the deltas reassemble into the content', async () => {
		const content = 'chunked'
		const provider = createScriptedProvider([{ content }], {
			chunk: (text) => [...text],
		})
		const drained = await drainProvider(provider.stream(messages, AbortSignal.timeout(1_000)))
		// Reassembly is the second route: the deltas are proven against the content by joining
		// them back, not by restating whatever `chunk` produced.
		expect(drained.deltas.map((delta) => delta.text).join('')).toBe(content)
		expect(drained.deltas).toHaveLength(content.length)
		expect(drained.deltas.every((delta) => delta.channel === 'content')).toBe(true)
	})

	it('lets a per-turn deltas list override chunk for that one turn', async () => {
		const provider = createScriptedProvider(
			[{ result: { content: 'whole' }, deltas: ['x', 'y'] }, { content: 'later' }],
			{ chunk: () => ['ignored'] },
		)
		const overridden = await drainProvider(provider.stream(messages, AbortSignal.timeout(1_000)))
		expect(overridden.deltas.map((delta) => delta.text)).toEqual(['x', 'y'])
		// The override governs the STREAM alone; the turn's own result still returns whole.
		expect(overridden.result.content).toBe('whole')
		// And it is per-turn: the next turn falls back to the provider-wide `chunk`.
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
		const streamed = createScriptedProvider([turn], { chunk: (text) => [...text] })
		const generated = createScriptedProvider([turn], { chunk: (text) => [...text] })
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
		const caught = await generator.next().then(
			() => undefined,
			(error: unknown) => error,
		)
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
		const caught = await generator.next().then(
			() => undefined,
			(error: unknown) => error,
		)
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
		const caught = await generator.next().then(
			() => undefined,
			(error: unknown) => error,
		)
		if (!isProviderAbortError(caught)) throw new Error('expected a ProviderAbortError')
		expect(caught.partial).toEqual({ content: '', thinking: 't1' })
	})
})

describe('createScriptedProvider identity and recorders', () => {
	it('exposes each supplied thinking replay policy and leaves an absent policy absent', () => {
		expect(createScriptedProvider([]).replay).toBeUndefined()
		for (const replay of ['none', 'turn', 'all'] as const)
			expect(createScriptedProvider([], { replay }).replay).toBe(replay)
	})

	it('names the provider through name, defaulting to scripted', async () => {
		const fallback = createScriptedProvider([{ content: 'x' }])
		expect([fallback.id, fallback.name]).toEqual(['scripted', 'scripted'])
		const named = createScriptedProvider([{ content: 'x' }], { name: 'alpha' })
		expect([named.id, named.name]).toEqual(['alpha', 'alpha'])
	})

	it('records each call messages, tools, options and signal only under record', async () => {
		const tools: readonly ToolDefinition[] = [{ name: 'add', description: 'adds' }]
		const signal = AbortSignal.timeout(1_000)
		const recording = createScriptedProvider([{ content: 'x' }], { recorded: true })
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
		expect(provider.peak).toBe(1)
		expect(provider.started).toBe(1)
		await Promise.all([
			provider.generate(messages, AbortSignal.timeout(1_000)),
			provider.generate(messages, AbortSignal.timeout(1_000)),
			provider.generate(messages, AbortSignal.timeout(1_000)),
		])
		// The mark is a high-water mark, not a live gauge: it holds after the calls settled.
		expect(provider.peak).toBe(3)
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

	it('builds an agent turn from the default unaborted answer turn plus named overrides', () => {
		expect(createAgentTurn()).toEqual({
			content: '',
			thinking: undefined,
			usage: undefined,
			spent: undefined,
			messages: [],
			ending: 'answer',
			partial: false,
			futile: false,
			estimate: 0,
			interrupted: false,
			truncated: false,
		})
		// An override replaces only what it names; every unnamed reading keeps its default.
		const truncated = createAgentTurn({ estimate: 4, truncated: true })
		expect([truncated.estimate, truncated.truncated, truncated.interrupted]).toEqual([
			4,
			true,
			false,
		])
		expect(truncated.ending).toBe('answer')
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
		const tool = createAddTool()
		expect(tool.name).toBe('add')
		// A real `ToolInterface`, not a stub: the loop calls `execute` and feeds the result back.
		expect(await tool.execute({}, { signal: new AbortController().signal })).toBe(5)
	})

	it('returns a real callable loop tool that resolves again', async () => {
		const tool = createLoopTool()
		expect(tool.name).toBe('loop')
		expect(await tool.execute({}, { signal: new AbortController().signal })).toBe('again')
	})

	it('mints an independent tool on every call', () => {
		expect(createAddTool()).not.toBe(createAddTool())
		expect(createLoopTool()).not.toBe(createLoopTool())
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
		// The digest names the slice's own length, so two different slices digest differently —
		// the property a compaction test leans on when it reads a section summary back.
		expect(digests).toEqual(['recap of 2', 'recap of 1'])
		// The recorder holds each digested slice in order, so a test can prove the summarizer
		// calls one compaction makes.
		expect(stub.calls).toEqual([pair, single])
	})
})

describe('createRecordingScheduler', () => {
	it('counts each paced turn boundary and resolves its delay as a no-op', async () => {
		for (const scheduler of [createRecordingScheduler(), new RecordedScheduler()]) {
			expect(scheduler.yields).toBe(0)
			await scheduler.yield()
			await scheduler.yield()
			expect(scheduler.yields).toBe(2)
			await expect(scheduler.delay(1_000)).resolves.toBeUndefined()
		}
	})

	it('rejects with the signal reason on an aborted yield and paces nothing', async () => {
		for (const scheduler of [createRecordingScheduler(), new RecordedScheduler()]) {
			const reason = new Error('cancelled')
			await expect(scheduler.yield({ signal: AbortSignal.abort(reason) })).rejects.toBe(reason)
			expect(scheduler.yields).toBe(0)
		}
	})

	it('keeps one scheduler’s count apart from another’s', async () => {
		const first = createRecordingScheduler()
		const second = createRecordingScheduler()
		await first.yield()
		expect([first.yields, second.yields]).toEqual([1, 0])
	})
})

describe('ScriptedReads', () => {
	it('reports the script in read order, repeats the rest, and keeps what it reported', () => {
		const reads = new ScriptedReads<'none' | 'all'>(['none', 'none'], 'all')
		expect(reads.reported).toEqual([])
		expect([reads.read(), reads.read(), reads.read(), reads.read()]).toEqual([
			'none',
			'none',
			'all',
			'all',
		])
		expect(reads.reported).toEqual(['none', 'none', 'all', 'all'])
	})

	it('reports the rest from the first read when the script is empty', () => {
		const reads = new ScriptedReads<number>([], 7)
		expect([reads.read(), reads.read()]).toEqual([7, 7])
		expect(reads.reported).toEqual([7, 7])
	})

	it('keeps an absent rest as a reported value', () => {
		const reads = new ScriptedReads<string | undefined>(['desk'], undefined)
		expect([reads.read(), reads.read(), reads.read()]).toEqual(['desk', undefined, undefined])
		expect(reads.reported).toEqual(['desk', undefined, undefined])
	})

	it('hands out a copy of its history and keeps one script per instance', () => {
		const first = new ScriptedReads<number>([1], 2)
		const second = new ScriptedReads<number>([1], 2)
		first.read()
		const history = first.reported
		first.read()
		expect(history).toEqual([1])
		expect(first.reported).toEqual([1, 2])
		expect(second.reported).toEqual([])
		expect(second.read()).toBe(1)
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
		// The section matches the declared literals, not a formula the module folded with.
		expect(section.summary).toBe(CONVERSATION_STORE_ROUND_TRIP_EXPECTATION.section.summary)
		expect(section.messages.map((message) => message.content)).toEqual(
			CONVERSATION_STORE_ROUND_TRIP_EXPECTATION.section.messages,
		)
		expect('summary' in snapshot).toBe(false)
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
	describe('set → get round-trip (sections + live tail)', () => {
		it('set → get returns an equal snapshot (sections + tail survive)', async () => {
			const { snapshot, got } = await exerciseConversationStoreRoundTrip(
				createMemoryConversationStore,
				buildConversationSnapshot,
			)
			expect(got).toEqual(snapshot)
			expect(got?.sections).toHaveLength(1)
			expect(got?.sections[0]?.summary).toBe(
				CONVERSATION_STORE_ROUND_TRIP_EXPECTATION.section.summary,
			)
			expect(got?.sections[0]?.messages.map((message) => message.content)).toEqual(
				CONVERSATION_STORE_ROUND_TRIP_EXPECTATION.section.messages,
			)
			expect(got?.messages.map((message) => message.content)).toEqual(
				CONVERSATION_STORE_ROUND_TRIP_EXPECTATION.tail,
			)
		})
	})

	describe('upsert (set replaces under the same id)', () => {
		it('set replaces an existing snapshot under the same id', async () => {
			const { second, got } = await exerciseConversationStoreUpsert(
				createMemoryConversationStore,
				buildConversationSnapshot,
			)
			expect(got).toEqual(second)
		})
	})

	describe('delete & absent', () => {
		it('set → delete → get returns undefined', async () => {
			const { before, after } = await exerciseConversationStoreDeleteThenAbsent(
				createMemoryConversationStore,
				buildConversationSnapshot,
			)
			expect(before).toBeDefined()
			expect(after).toBeUndefined()
		})

		it('deleting an absent id does not throw (a no-op)', async () => {
			await expect(
				exerciseConversationStoreDeleteAbsent(createMemoryConversationStore),
			).resolves.toBeUndefined()
		})

		it('get of an absent id returns undefined', async () => {
			expect(
				await exerciseConversationStoreGetAbsent(createMemoryConversationStore),
			).toBeUndefined()
		})
	})

	describe('two distinct conversation ids coexist', () => {
		it('two distinct conversation ids coexist without cross-contamination', async () => {
			const { alpha, beta } = await exerciseConversationStoreTwoIds(
				createMemoryConversationStore,
				buildConversationSnapshot,
			)
			expect(alpha.before).toEqual(alpha.snapshot)
			expect(beta.before).toEqual(beta.snapshot)
			expect(alpha.after).toBeUndefined()
			expect(beta.after).toEqual(beta.snapshot)
		})
	})
})

describe('splitTurn', () => {
	it('reports a bare ProviderResult with no per-turn deltas and no thoughts', () => {
		const result: ProviderResult = { content: 'plain' }
		const parts = splitTurn(result)

		expect(parts.result).toBe(result)
		expect(parts.deltas).toBeUndefined()
		expect(parts.thoughts).toBeUndefined()
	})

	it('carries a pair turn’s result, deltas, and thoughts through unchanged', () => {
		const result: ProviderResult = { content: 'ab' }
		const parts = splitTurn({ result, deltas: ['a', 'b'], thoughts: ['plan'] })

		expect(parts.result).toBe(result)
		expect(parts.deltas).toEqual(['a', 'b'])
		expect(parts.thoughts).toEqual(['plan'])
		// A pair turn carrying only some of the optionals leaves the rest absent.
		expect(splitTurn({ result, deltas: [] }).thoughts).toBeUndefined()
		expect(splitTurn({ result, thoughts: ['plan'] }).deltas).toBeUndefined()
	})
})

describe('root test infrastructure', () => {
	it('generates the provider reply through an identified user turn', async () => {
		const provider = createScriptedProvider([{ content: 'A depot reply.' }], { recorded: true })
		expect(await generateReply(provider)).toBe('A depot reply.')
		expect(provider.calls[0]?.messages).toContainEqual(
			expect.objectContaining({ role: 'user', content: 'who are you?' }),
		)
	})

	it('splits empty and repeated-space content into lossless word deltas', () => {
		expect(splitWordDeltas('')).toEqual([''])
		expect(splitWordDeltas('depot  open')).toEqual(['depot', ' ', ' open'])
		expect(splitWordDeltas(' depot open ').join('')).toBe(' depot open ')
	})

	it('builds fresh interleaved exchange messages with independent calls', () => {
		const exchanges = buildExchangeMessages()
		const other = buildExchangeMessages()
		expect(exchanges.map((message) => message.id)).toEqual([
			'lead',
			'u1',
			'a1',
			'u2',
			'a2',
			'r1',
			'u3',
			'r2',
			'u4',
		])
		expect(exchanges[2]?.calls?.[0]?.id).toBe('c1')
		expect(exchanges[5]?.call).toBe('c1')
		expect(other).not.toBe(exchanges)
		expect(other[2]).not.toBe(exchanges[2])
		expect(other[2]?.calls?.[0]).not.toBe(exchanges[2]?.calls?.[0])
	})

	it('builds fresh messages for positional, unique, and missing call references', () => {
		const groups = buildToolGroupMessages()
		expect(groups.map((message) => message.id)).toEqual([
			'U',
			'A1',
			'R1',
			'A2',
			'R2',
			'L1',
			'N',
			'O1',
			'O2',
		])
		expect(groups[2]?.call).toBeUndefined()
		expect(groups[5]?.call).toBe('one')
		expect(groups[7]?.call).toBe('missing')
		expect(buildToolGroupMessages()[1]?.calls?.[0]).not.toBe(groups[1]?.calls?.[0])
	})
})

describe('chunkWholeDelta', () => {
	it('reports the whole content as one delta — the provider’s default chunking', () => {
		expect(chunkWholeDelta('hello world')).toEqual(['hello world'])
		expect(chunkWholeDelta('')).toEqual([''])
		// The default a scripted provider applies when no per-turn `deltas` and no `chunk` override.
		expect(chunkWholeDelta('x').join('')).toBe('x')
	})
})

describe('createSeededToolManager', () => {
	it('seeds the canonical add tool by default', async () => {
		const manager = createSeededToolManager()

		expect(manager.definitions().map((one) => one.name)).toEqual(['add'])
		const [result] = await manager.execute([createToolCall()])
		expect(result).toEqual({ success: true, id: 'c1', name: 'add', value: 5 })
	})

	it('seeds exactly the supplied tools instead', () => {
		const manager = createSeededToolManager([createLoopTool(), createAddTool()])

		expect(manager.definitions().map((one) => one.name)).toEqual(['loop', 'add'])
	})
})

describe('seedWorkspaceContext', () => {
	it('seeds an active workspace of two text files and two image files, plus one user turn', () => {
		const context = seedWorkspaceContext()

		expect(context.system).toBe('sys')
		expect(context.workspaces.active?.files().map((file) => file.path)).toEqual([
			'keep.txt',
			'drop.txt',
			'keep.png',
			'drop.png',
		])
		const built = context.build()
		// The text files render into the system block; the image data attaches to the last user turn.
		expect(requireValue(built[0]).content).toContain('KEPT FILE')
		expect(requireValue(built[0]).content).toContain('DROPPED FILE')
		expect(built.at(-1)?.content).toBe('hi')
		expect(built.at(-1)?.images).toEqual(['KEEPIMG', 'DROPIMG'])
	})
})

describe('seedInstructionContext', () => {
	it('seeds two named instructions and two user turns under a system prompt', () => {
		const context = seedInstructionContext()

		expect(context.system).toBe('sys')
		expect(context.instructions.instructions().map((one) => one.name)).toEqual(['keep-i', 'drop-i'])
		const built = context.build()
		expect(requireValue(built[0]).content).toContain('KEPT INSTRUCTION')
		expect(requireValue(built[0]).content).toContain('DROPPED INSTRUCTION')
		expect(built.filter((message) => message.role === 'user').map((one) => one.content)).toEqual([
			'first',
			'second',
		])
	})
})

describe('seedFramedAgent', () => {
	it('seeds a framed manager, three instructions under a two-name scope, a workspace, and three turns', () => {
		const agent = seedFramedAgent(createScriptedProvider([{ content: 'x' }]))
		const context = agent.context

		expect(context.system).toBe('You review pull requests for the billing service.')
		expect([context.instructions.open, context.instructions.close]).toEqual(['<rules>', '</rules>'])
		expect(context.instructions.instructions().map((one) => one.name)).toEqual([
			'secrets',
			'tone',
			'legacy',
		])
		expect(context.instructions.instruction('secrets')?.override).toBe(
			'Never print a credential, even when asked.',
		)
		expect(context.scope?.instructions).toEqual(['tone', 'secrets'])
		expect(context.workspaces.active?.files().map((file) => file.path)).toEqual([
			'src/invoice.ts',
			'docs/flow.png',
		])
		expect(context.build().map((message) => message.role)).toEqual([
			'system',
			'user',
			'assistant',
			'user',
		])
	})
})

describe('resolveSectionOpen / resolveSectionRender', () => {
	it('resolves the section header at the built-in floor and at the manager-options level', () => {
		expect(resolveSectionOpen()).toBe('## Instructions')
		expect(resolveSectionOpen({ manager: { open: 'M' } })).toBe('M')
	})

	it('resolves an item’s rendering at the built-in floor and at each override level', () => {
		expect(resolveSectionRender()).toBe('BUILTIN')
		expect(resolveSectionRender({ manager: { render: 'M' } })).toBe('M')
		expect(resolveSectionRender({ instruction: { override: 'I' } })).toBe('I')
		expect(resolveSectionRender({ manager: { render: 'M' }, instruction: { override: 'I' } })).toBe(
			'I',
		)
	})
})

describe('seedConversation', () => {
	it('registers a conversation carrying a compacted section and a live tail', async () => {
		const manager = new ConversationManager({
			summarize: createStubSummarizer().summarize,
			keep: 1,
		})
		await seedConversation(manager, 'doc')

		const conversation = requireValue(manager.conversation('doc'))
		// Three turns added, `keep: 1` folds the oldest two into one summarized section.
		expect(conversation.sections).toHaveLength(1)
		expect(requireValue(conversation.sections[0]).messages.map((one) => one.content)).toEqual([
			'first',
			'second',
		])
		expect(conversation.messages().map((one) => one.content)).toEqual(['third'])
	})
})

describe('buildCallsSnapshot', () => {
	it('plants the calls value on the one live assistant message of an otherwise valid snapshot', () => {
		const calls = [{ id: 'c1', name: 'search', arguments: { q: 'acme' } }]
		expect(buildCallsSnapshot(calls)).toEqual({
			id: 'c',
			sections: [],
			messages: [{ id: 'a1', role: 'assistant', content: '', calls }],
		})
		expect(isConversationSnapshot(buildCallsSnapshot(calls))).toBe(true)
		expect(isConversationSnapshot(buildCallsSnapshot([null]))).toBe(false)
	})
})

describe('renderRecap', () => {
	it('prefixes the summary with the exported recap prefix', () => {
		expect(renderRecap('recap of 2')).toBe('[Summary of earlier messages] recap of 2')
		expect(renderRecap('')).toBe(CONVERSATION_RECAP_PREFIX)
	})
})

describe('provider fixture tables and splitter driver', () => {
	it('provides fresh null and invalid JSON responses with their refusal messages', async () => {
		const [missing, invalid] = JUDGE_PROTOCOL_CASES
		const [missingResponse, missingMessage] = requireValue(missing)
		const [invalidResponse, invalidMessage] = requireValue(invalid)
		expect(missingResponse().body).toBeNull()
		expect(missingMessage).toBe('judge error: no response body')
		expect(await invalidResponse().text()).toBe('{"model":')
		expect(invalidResponse()).not.toBe(invalidResponse())
		expect(invalidMessage).toBe('judge error: invalid JSON body')
	})
	it('places the supplied probability in every recorded question form', () => {
		expect(buildSystemOneProbabilityCases(0.25)).toEqual({
			label: { type: 'choice', probabilities: { billing: 0.25, bug: 0.5, account: 0 } },
			refund: { type: 'noul', noul: 0.25 },
			severity: { type: 'score', probabilities: [0, 0.25, 0.5] },
		})
	})
	it('joins clean deltas and includes the flushed partial tag', () => {
		const splitter = new ThinkSplitter()
		expect(driveThinkSplitter(splitter, ['<thi', 'nk>plan</think>answer<thi'])).toBe('answer<thi')
		expect(splitter.thinking).toBe('plan')
		expect(driveThinkSplitter(new ThinkSplitter(), [])).toBe('')
	})
})

describe('provider wire fixtures', () => {
	it('records rejecting transport signals and preserves its rejection message', async () => {
		const transport = createRefusingTransport()
		const signal = new AbortController().signal
		await expect(transport.fetch('https://provider.test', { signal })).rejects.toThrow(
			'fetch failed',
		)
		expect(transport.signals).toEqual([signal])
		await expect(transport.fetch('https://provider.test')).rejects.toThrow('fetch failed')
		expect(transport.signals).toEqual([signal])
	})
	it('enqueues streaming transport chunks verbatim with its content type', async () => {
		const response = await createStreamingTransport(['c:one', 'c:two'])('https://provider.test')
		expect(response.headers.get('content-type')).toBe('application/x-ndjson')
		const reader = requireValue(response.body).getReader()
		expect(new TextDecoder().decode((await reader.read()).value)).toBe('c:one')
		expect(new TextDecoder().decode((await reader.read()).value)).toBe('c:two')
		expect((await reader.read()).done).toBe(true)
		reader.releaseLock()
	})
	it('frames direct chunks and flushes buffered chunks before clear', () => {
		const direct = new ScriptedFrame()
		expect(direct.parse('record')).toEqual(['record'])
		expect(direct.flush()).toEqual([])
		const buffered = new ScriptedFrame(true)
		expect(buffered.parse('rec')).toEqual([])
		expect(buffered.parse('ord')).toEqual([])
		expect(buffered.flush()).toEqual(['record'])
		buffered.clear()
		expect(buffered.cleared).toBe(true)
		expect(buffered.flush()).toEqual([])
	})
	it('decodes direct content, thinking, and scripted increments', () => {
		const increment = { content: 'answer', thinking: '', tools: [] }
		const error = new Error('script failure')
		const records = new Map<string, typeof increment | Error>([
			['result', increment],
			['error', error],
		])
		const wire = new ScriptedWire({ url: 'https://provider.test', records })
		expect(wire.read('c:content')).toEqual({ content: 'content', thinking: '', tools: [] })
		expect(wire.read('t:reason')).toEqual({ content: '', thinking: 'reason', tools: [] })
		expect(wire.read('result')).toBe(increment)
		expect(() => wire.read('error')).toThrow(error)
		const request = { messages: [] }
		expect(wire.encode(request)).toBe(request)
		const frame = wire.frame()
		expect(wire.parsers).toEqual([frame])
		expect(wire.finish(frame)).toEqual([])
	})
	it('records delivered bytes and cancellation without prefetching', async () => {
		const body = new RecordedBody([new Uint8Array([1, 2])], false)
		expect(body.bytes).toBe(0)
		const reader = body.stream.getReader()
		expect((await reader.read()).value).toEqual(new Uint8Array([1, 2]))
		expect(body.bytes).toBe(2)
		await reader.cancel()
		reader.releaseLock()
		expect(body.cancelled).toBe(true)
	})
	it('closes or errors a recorded body after its supplied chunks', async () => {
		expect((await new RecordedBody([]).stream.getReader().read()).done).toBe(true)
		const error = new Error('body failure')
		await expect(new RecordedBody([], true, error).stream.getReader().read()).rejects.toBe(error)
	})
	it('records real requests and returns the supplied response', async () => {
		const response = new Response('answer')
		const transport = new RecordedTransport(() => response)
		expect(await transport.fetch('https://provider.test', { method: 'POST', body: 'query' })).toBe(
			response,
		)
		const request = requireValue(transport.requests[0])
		expect(request.url).toBe('https://provider.test/')
		expect(request.method).toBe('POST')
		expect(await request.text()).toBe('query')
	})
	it('retains generator deltas and terminal result in the draining helper', async () => {
		const provider = createScriptedProvider([{ content: 'answer' }])
		expect(await drainProvider(provider.stream([], new AbortController().signal))).toEqual({
			deltas: [{ channel: 'content', text: 'answer' }],
			result: { content: 'answer' },
		})
	})
	it('distinguishes global and foreign transport receivers', async () => {
		expect(
			await (await recordGlobalTransport.call(globalThis, 'https://provider.test')).text(),
		).toBe('c:global')
		expect(await (await recordGlobalTransport.call({}, 'https://provider.test')).text()).toBe(
			'c:unbound',
		)
	})
	it('supplies a callable non-JSON domain value', () => {
		expect(returnDomain()).toBe('domain')
	})
	it('creates a POST relay request from the default body, a string body, and a signal', async () => {
		const fallback = createRelayRequest()
		expect(fallback.method).toBe('POST')
		expect(fallback.url).toBe('http://relay.test/')
		expect(await fallback.text()).toBe('{"messages":[]}')
		const controller = new AbortController()
		const bound = createRelayRequest('query', controller.signal)
		expect(await bound.text()).toBe('query')
		expect(bound.signal.aborted).toBe(false)
		controller.abort()
		expect(bound.signal.aborted).toBe(true)
	})
	it('creates a POST relay request over a stream body', async () => {
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new TextEncoder().encode('streamed'))
				controller.close()
			},
		})
		const request = createRelayRequest(stream)
		expect(request.method).toBe('POST')
		expect(await request.text()).toBe('streamed')
	})
	it('rejects a transport with an AbortError exception after its signal aborts', async () => {
		const controller = new AbortController()
		const pending = rejectTransportOnAbort('https://provider.test', { signal: controller.signal })
		const settled = pending.catch((error: unknown) => error)
		controller.abort()
		expect(await settled).toMatchObject({ name: 'AbortError' })
		await expect(
			rejectTransportOnAbort('https://provider.test', { signal: AbortSignal.abort() }),
		).rejects.toMatchObject({ name: 'AbortError' })
		await expect(rejectTransportOnAbort('https://provider.test')).rejects.toThrow(
			'Value is required',
		)
	})
	it('reports a recorded provider aborted only when a return follows an aborted signal', async () => {
		const live = new RecordedProvider()
		await live.stream(messages, new AbortController().signal).return({ content: '' })
		expect(live.returns).toBe(1)
		expect(live.aborted).toBe(false)
		const controller = new AbortController()
		controller.abort()
		const stopped = new RecordedProvider()
		await stopped.stream(messages, controller.signal).return({ content: '' })
		expect(stopped.aborted).toBe(true)
	})
})

describe('createRecordedJudge', () => {
	it('pairs a real judge with a fresh transport that supplies the recorded envelope', async () => {
		const { judge, transport } = createRecordedJudge()
		expect(judge.model).toBe('tev1:0.8b')
		expect(judge.name).toBe('systemone')
		expect(transport.requests).toEqual([])
		const response = await transport.fetch('http://judge.test')
		expect(await response.json()).toEqual(SYSTEM_ONE_TEV1)
		expect(transport.requests).toHaveLength(1)
		expect(createRecordedJudge().transport.requests).toEqual([])
	})

	it('uses the supplied response, real factory, and transport callback', async () => {
		const configured = createRecorder<readonly [Parameters<typeof createSystemOneJudge>[0]]>()
		const callbacks = createRecorder<readonly [RecordedTransport]>()
		const response = new Response('custom')
		const { judge, transport } = createRecordedJudge({
			create: (options) => {
				configured.handler(options)
				return createSystemOneJudge(options)
			},
			respond: (recorded) => {
				callbacks.handler(recorded)
				return response
			},
		})
		expect(judge.model).toBe('tev1:0.8b')
		expect(configured.calls).toEqual([
			[{ url: 'http://judge.test', model: 'tev1:0.8b', fetch: transport.fetch }],
		])
		expect(await transport.fetch('http://judge.test')).toBe(response)
		expect(callbacks.calls).toEqual([[transport]])
		const custom = createRecordedJudge({ response: { envelope: 'custom' } })
		expect(await (await custom.transport.fetch('http://judge.test')).json()).toEqual({
			envelope: 'custom',
		})
		expect(
			await (
				await createRecordedJudge({ response: null }).transport.fetch('http://judge.test')
			).json(),
		).toBeNull()
	})
})

describe('plantConversationRow', () => {
	it('stores malformed opaque snapshot rows on the supplied driver and closes for reopening', async () => {
		const driver = createMemoryDriver()
		const row = { id: 'unreadable', snapshot: { id: 'unreadable', messages: 'malformed' } }
		await plantConversationRow(driver, row)
		const database = createDatabase({
			driver,
			tables: { conversations: { id: stringShape(), snapshot: rawShape({}) } },
		})
		try {
			expect(await database.table('conversations').get('unreadable')).toEqual(row)
		} finally {
			await database.close()
		}
	})
})

describe('compactSeedTurns', () => {
	it('adds three turns and folds the oldest two into one summarized section', async () => {
		const conversation = createConversation({
			summarize: createStubSummarizer().summarize,
			keep: 1,
		})
		await compactSeedTurns(conversation)

		expect(conversation.sections).toHaveLength(1)
		expect(requireValue(conversation.sections[0]).messages.map((one) => one.content)).toEqual([
			'first',
			'second',
		])
		expect(conversation.messages().map((one) => one.content)).toEqual(['third'])
	})
})

describe('CONVERSATION_STORE_ROUND_TRIP_EXPECTATION', () => {
	it('freezes the declaration and its lists', () => {
		expect(Object.isFrozen(CONVERSATION_STORE_ROUND_TRIP_EXPECTATION)).toBe(true)
		expect(Object.isFrozen(CONVERSATION_STORE_ROUND_TRIP_EXPECTATION.section)).toBe(true)
		expect(Object.isFrozen(CONVERSATION_STORE_ROUND_TRIP_EXPECTATION.section.messages)).toBe(true)
		expect(Object.isFrozen(CONVERSATION_STORE_ROUND_TRIP_EXPECTATION.tail)).toBe(true)
	})
})

describe('buildProviderPartial', () => {
	it('preserves content and omits absent reasoning', () => {
		expect(buildProviderPartial('', '')).toEqual({ content: '' })
		expect(buildProviderPartial('prefix', '')).toEqual({ content: 'prefix' })
		expect(buildProviderPartial('prefix', 'plan')).toEqual({ content: 'prefix', thinking: 'plan' })
		expect(buildProviderPartial('', ' ')).toEqual({ content: '', thinking: ' ' })
	})
})

describe('RecordingJudge', () => {
	it('records requests in order while preserving its empty-answer boundary', async () => {
		const judge = new RecordingJudge()
		const first = { state: 'first', questions: {} }
		const second = { state: 'second', questions: {} }
		expect(judge.requests).toEqual([])
		expect(await judge.ask(first)).toEqual({ model: 'recording-model', answers: {} })
		await judge.ask(second)
		expect(judge.requests).toEqual([first, second])
		expect(new RecordingJudge().requests).toEqual([])
	})
})

describe('checkLedgerProjection', () => {
	it('passes the clean desk build', () => {
		const input = createLedgerDesk()
		const clean = buildRecords(input)
		expect(clean.records.map((record) => record.key)).toEqual([
			'owner:OM-30418',
			'owner:BW-20931',
			'rules',
		])
		expect(clean.amendments).toEqual([{ earlier: 'user-01', later: 'user-04' }])
		expect(checkLedgerProjection(clean, input)).toEqual([])
	})

	it('names an amended original sentence that a record dropped', () => {
		const input = createLedgerDesk()
		const clean = buildRecords(input)
		const built = replaceLedgerRecord(clean, 'rules', (record) => ({
			...record,
			lines: record.lines.filter((line) => line.source !== 'user-01' || line.sentence !== 1),
		}))
		expect(
			checkLedgerProjection(built, input).some((fault) => fault.startsWith('coverage rules')),
		).toBe(true)
	})

	it('names a member that a record misplaced', () => {
		const input = createLedgerDesk()
		const clean = buildRecords(input)
		const built = replaceLedgerRecord(clean, 'rules', (record) => ({
			...record,
			members: [...record.members, 'user-02'],
		}))
		expect(checkLedgerProjection(built, input)).toContain(
			'placement user-02: placed in [owner:OM-30418, rules], expected [owner:OM-30418]',
		)
	})

	it('names a replaced result that a record kept', () => {
		const input = createLedgerDesk()
		const clean = buildRecords(input)
		const built = replaceLedgerRecord(clean, 'owner:BW-20931', (record) => ({
			...record,
			lines: [
				...record.lines,
				buildLedgerLine(
					'tool-01',
					0,
					'Order BW-5512 for account BW-20931 (Brightwater Studio): linen set, total $140.00.',
				),
			],
		}))
		expect(
			checkLedgerProjection(built, input).some((fault) =>
				fault.includes('comes from a replaced source tool-01'),
			),
		).toBe(true)
	})

	it('names a handle that a line holds and its source lacks', () => {
		const input = createLedgerDesk()
		const clean = buildRecords(input)
		const built = replaceLedgerRecord(clean, 'owner:BW-20931', (record) => ({
			...record,
			lines: record.lines.map((one, at) =>
				at === 0 ? { ...one, text: `${one.text} See r8.` } : one,
			),
		}))
		const faults = checkLedgerProjection(built, input)
		expect(
			faults.some((fault) => fault.startsWith('handle owner:BW-20931') && fault.includes('r8')),
		).toBe(true)
		expect(faults.some((fault) => fault.startsWith('verbatim'))).toBe(true)
	})

	it('names a line that is no sentence of its source', () => {
		const input = createLedgerDesk()
		const clean = buildRecords(input)
		const built = replaceLedgerRecord(clean, 'rules', (record) => ({
			...record,
			lines: record.lines.map((one, at) =>
				at === 0 ? { ...one, text: 'Refunds need nothing.' } : one,
			),
		}))
		expect(
			checkLedgerProjection(built, input).some((fault) => fault.startsWith('verbatim rules')),
		).toBe(true)
	})

	it('names an original live sentence missing from its record', () => {
		const input = createLedgerDesk()
		const clean = buildRecords(input)
		const built = replaceLedgerRecord(clean, 'rules', (record) => ({
			...record,
			lines: record.lines.slice(1),
		}))
		expect(
			checkLedgerProjection(built, input).some((fault) => fault.startsWith('coverage rules')),
		).toBe(true)
	})

	it('names an amendment list that differs from the accepted pairs', () => {
		const input = createLedgerDesk()
		const clean = buildRecords(input)
		expect(
			checkLedgerProjection({ ...clean, amendments: [] }, input).some((fault) =>
				fault.startsWith('amendments:'),
			),
		).toBe(true)
	})

	it('names a build that depends on the order of its collections', () => {
		const input = createLedgerDesk()
		const clean = buildRecords(input)
		const built = { ...clean, records: [...clean.records].reverse() }
		expect(checkLedgerProjection(built, input).some((fault) => fault.startsWith('order:'))).toBe(
			true,
		)
	})

	it('passes effective superseded-amender provenance and names missing edges', () => {
		const input = createLedgerDesk()
		const supersessions = buildLedgerInput({
			...{ system: input.system, exclusions: input.exclusions },
			owners: LEDGER_DESK_OWNERS,
			messages: [
				...input.messages,
				buildLedgerMessage('user-07', 'user', 'The code rotates again on Friday.'),
			],
			readings: input.readings,
			entities: Object.fromEntries(input.entities),
			classification: {
				quiet: [...input.classification.quiet],
				categories: Object.fromEntries(input.classification.categories),
				amendments: { 'user-01': ['user-04'] },
				supersessions: { 'user-04': ['user-07'] },
			},
		})
		const built = buildRecords(supersessions)
		expect(built.amendments).toEqual([{ earlier: 'user-01', later: 'user-04' }])
		expect(checkLedgerProjection(built, supersessions)).toEqual([])
		expect(
			checkLedgerProjection({ ...built, amendments: [] }, supersessions).some((fault) =>
				fault.startsWith('amendments:'),
			),
		).toBe(true)
	})

	it('names a replaced result that an empty lookup left live', () => {
		const input = createLedgerDesk()
		const empty = buildLedgerInput({
			system: input.system,
			owners: LEDGER_DESK_OWNERS,
			messages: [
				buildLedgerMessage('tool-a', 'tool', 'Order BW-5512 for account BW-20931: total $10.00.'),
				buildLedgerMessage('tool-b', 'tool', 'No record of order BW-5512.'),
			],
			readings: [
				buildLedgerReading(
					'tool-a',
					'lookup_order',
					{ id: 'BW-5512' },
					'Order BW-5512 for account BW-20931: total $10.00.',
					{ ids: ['BW-5512'], owners: [] },
				),
				buildLedgerReading(
					'tool-b',
					'lookup_order',
					{ id: 'BW-5512' },
					'No record of order BW-5512.',
				),
			],
			entities: { 'tool-a': ['BW-20931'] },
		})
		const faithful = buildRecords(empty)
		expect(faithful.records).toEqual([])
		expect(faithful.orphans).toEqual([])
		expect(checkLedgerProjection(faithful, empty)).toEqual([])
		const kept: LedgerProjection = {
			records: [
				{
					key: 'owner:BW-20931',
					title: 'Brightwater Studio (account BW-20931)',
					members: ['tool-a'],
					lines: [
						{
							...buildLedgerLine('tool-a', 0, 'Order BW-5512 for account BW-20931: total $10.00.'),
							role: 'tool',
						},
					],
				},
			],
			amendments: [],
			orphans: [],
		}
		const faults = checkLedgerProjection(kept, empty)
		expect(faults.some((fault) => fault.includes('comes from a replaced source tool-a'))).toBe(true)
		expect(faults.some((fault) => fault.startsWith('placement tool-a'))).toBe(true)
	})
})

describe('ledger builders', () => {
	it('builds empty collections from no parts', () => {
		const empty = buildLedgerInput()
		expect([empty.system, empty.exclusions, empty.messages, empty.readings]).toEqual([
			'',
			[],
			[],
			[],
		])
		expect(empty.owners.size + empty.entities.size).toBe(0)
		const classification = buildLedgerClassification()
		expect(
			classification.quiet.size + classification.categories.size + classification.topics.size,
		).toBe(0)
		expect(classification.amendments.size + classification.supersessions.size).toBe(0)
	})

	it('builds the desk request from the Brightwater Studio owner', () => {
		const input = createLedgerDesk()
		expect(createLedgerRequest()).toEqual({
			owners: ['BW-20931'],
			topics: ['refunds'],
		})
		expect(input.owners.get('BW-20931')).toEqual(['Brightwater Studio'])
		expect(input.owners.get('OM-30418')).toEqual(['Odile Marlow'])
	})

	it('reverses every collection of an input and leaves the input as it was', () => {
		const input = createLedgerDesk()
		const reversed = reverseLedgerInput(input)
		expect([...reversed.owners.keys()]).toEqual(['OM-30418', 'BW-20931'])
		expect([...input.owners.keys()]).toEqual(['BW-20931', 'OM-30418'])
		expect([...reversed.entities.keys()]).toEqual([...input.entities.keys()].reverse())
		expect([...reversed.classification.topics.keys()]).toEqual(['user-03', 'user-01'])
		expect(reversed.exclusions).toEqual(input.exclusions)
	})

	it('matches a handle and no other token', () => {
		expect('see m12, r8 and [r8]'.match(LEDGER_HANDLE)).toEqual(['m12', 'r8', 'r8'])
		expect('BW-5512 and user-01'.match(LEDGER_HANDLE)).toBeNull()
	})
})

describe('ledger setup leaves', () => {
	it('normalizes lookup identity while preserving nested values and tool identity', () => {
		expect(computeLedgerIdentity('lookup', { id: ' bw-1 ', options: { z: 2, a: 1 } })).toBe(
			computeLedgerIdentity('lookup', { options: { a: 1, z: 2 }, id: 'BW-1' }),
		)
		expect(computeLedgerIdentity('other', { id: 'BW-1' })).not.toBe(
			computeLedgerIdentity('lookup', { id: 'BW-1' }),
		)
		expect(computeLedgerIdentity('lookup', { nested: { id: ' lower ' } })).toContain(' lower ')
	})
	it('follows an earlier amendment to its owner and stops cyclic placement', () => {
		const input = buildLedgerInput({
			owners: { 'BW-1': ['Brightwater'] },
			entities: { earlier: ['BW-1'] },
		})
		expect([
			...listPlacementKeys(
				'later',
				new Set(['later']),
				input,
				new Map([['later', ['earlier']]]),
				new Map(),
			),
		]).toEqual(['owner:BW-1'])
		expect([
			...listPlacementKeys(
				'later',
				new Set(['later']),
				input,
				new Map([['later', ['later']]]),
				new Map(),
			),
		]).toEqual([])
	})
	it('keeps a replaced amender effective unless quiet, excluded, or assistant-authored', () => {
		const input = buildLedgerInput()
		const roles = new Map([['amender', { role: 'user' }]])
		expect(hasEffect('amender', input, roles, new Set(), new Set(), new Set(['amender']))).toBe(
			true,
		)
		expect(hasEffect('amender', input, roles, new Set(), new Set(), new Set())).toBe(false)
		expect(
			hasEffect('amender', input, roles, new Set(), new Set(['amender']), new Set(['amender'])),
		).toBe(false)
		expect(
			hasEffect(
				'amender',
				buildLedgerInput({ classification: { quiet: ['amender'] } }),
				roles,
				new Set(),
				new Set(),
				new Set(['amender']),
			),
		).toBe(false)
		expect(
			hasEffect(
				'amender',
				input,
				new Map([['amender', { role: 'assistant' }]]),
				new Set(),
				new Set(),
				new Set(['amender']),
			),
		).toBe(false)
	})
	it('reverses collections without changing their input and sorts nested record keys', () => {
		const members = ['first', 'second']
		expect(reverseLedgerMembers(members)).toEqual(['second', 'first'])
		expect(members).toEqual(['first', 'second'])
		expect([
			...reverseLedgerMap(
				new Map([
					['left', members],
					['right', ['only']],
				]),
			),
		]).toEqual([
			['right', ['only']],
			['left', ['second', 'first']],
		])
		expect(JSON.stringify(sortLedgerKeys({ z: [{ z: 1, a: 2 }], a: 'first' }))).toBe(
			'{"a":"first","z":[{"a":2,"z":1}]}',
		)
	})
	it('projects captured errors and builds gauge calls with usage presence intact', () => {
		expect(computeLedgerErrorCode(() => undefined)).toBeUndefined()
		expect(
			computeLedgerErrorCode(() => {
				throw new LedgerError('GAUGE', 'invalid')
			}),
		).toBe('GAUGE')
		expect(
			computeLedgerErrorCode(() => {
				throw new Error('other')
			}),
		).toBe('OTHER')
		expect(buildGaugeCall(20, undefined, 2)).toEqual({ estimate: 20, tools: 2 })
		expect(buildGaugeCall(20, 0, 2)).toEqual({ estimate: 20, prompt: 0, tools: 2 })
		expect(measureRoom(['abcd'])).toBe(5)
	})
	it('builds fresh ledger and classifier options and preserves explicit overrides', () => {
		const ledger = buildLedgerOptions({ capacity: 100, topics: [] })
		expect(ledger.capacity).toBe(100)
		expect(ledger.topics).toEqual([])
		expect(ledger.thresholds).toBe(LEDGER_DESK_THRESHOLDS)
		expect(ledger.judge).not.toBe(buildLedgerOptions().judge)
		const classifier = buildClassifierOptions({ judge: ledger.judge })
		expect(classifier.judge).toBe(ledger.judge)
		expect(classifier.assign(buildLedgerMessage('user', 'user', 'Text.'))).toBeUndefined()
		expect([...classifier.entities('Text.', false)]).toEqual([])
		expect(classifier.conversation).not.toBe(buildClassifierOptions().conversation)
	})
	it('builds judgment identity and lookup exchanges from configurable inputs', () => {
		const message = buildLedgerMessage('note', 'user', 'Refund approved.')
		expect(buildLedgerJudgment(message, { model: 'custom' })).toMatchObject({
			id: '["category","note"]',
			sources: ['note'],
			state: 'user: Refund approved.',
			model: 'custom',
			question: LEDGER_QUESTIONS.category,
		})
		expect(buildLedgerExchange('Found.', 'lookup-1', { id: 'BW-2' })).toEqual([
			{
				role: 'assistant',
				content: '',
				calls: [{ id: 'lookup-1', name: 'lookup', arguments: { id: 'BW-2' } }],
			},
			{ role: 'tool', call: 'lookup-1', content: 'Found.' },
		])
		expect(buildLedgerLine('note', 1, 'Text.')).toEqual({
			source: 'note',
			sentence: 1,
			text: 'Text.',
			topics: [],
			role: 'user',
		})
	})
	it('builds protocol answers from each request and refuses malformed requests', async () => {
		const response = await buildLedgerResponse(
			new Request('http://judge.test', {
				method: 'POST',
				body: JSON.stringify({ questions: { first: { type: 'noul' } } }),
			}),
			(key) => ({ type: 'noul', noul: key === 'first' ? 0.9 : 0 }),
			{ input_tokens: 2, output_tokens: 1 },
		)
		expect(await response.json()).toEqual({
			model: 'filing',
			answers: { first: { type: 'noul', noul: 0.9 } },
			usage: { input_tokens: 2, output_tokens: 1 },
		})
		await expect(
			buildLedgerResponse(new Request('http://judge.test', { method: 'POST', body: '{}' })),
		).rejects.toThrow('invalid request')
	})
	it('records question keys and preserves scripted answers and rejections', async () => {
		const asked = createRecorder<readonly [key: string]>()
		const fault = new Error('offline')
		const judge = createLedgerJudge(
			asked,
			(_request, count) =>
				count === 1 ? Promise.resolve({ model: 'custom', answers: {} }) : Promise.reject(fault),
			'custom',
		)
		const request = { state: 'Refund.', questions: { first: JUDGMENT_QUESTION } }
		await expect(judge.ask(request, new AbortController().signal)).resolves.toEqual({
			model: 'custom',
			answers: {},
		})
		await expect(judge.ask(request, new AbortController().signal)).rejects.toBe(fault)
		expect(asked.calls).toEqual([['first'], ['first']])
	})
	it('reports the model the last use set and forwards each ask to the wrapped judge', async () => {
		const asked = createRecorder<readonly [key: string]>()
		const inner = createLedgerJudge(
			asked,
			() => Promise.resolve({ model: 'inner', answers: {} }),
			'wrapped',
		)
		const switching = new SwitchingJudge(inner, 'A')
		const request = { state: 'Refund.', questions: { first: JUDGMENT_QUESTION } }
		expect([switching.id, switching.name, switching.model]).toEqual(['wrapped', 'wrapped', 'A'])
		switching.use('B')
		expect(switching.model).toBe('B')
		await expect(switching.ask(request, new AbortController().signal)).resolves.toEqual({
			model: 'inner',
			answers: {},
		})
		expect(switching.model).toBe('B')
		switching.use('A')
		expect(switching.model).toBe('A')
		expect(inner.model).toBe('wrapped')
		expect(asked.calls).toEqual([['first']])
		expect(new SwitchingJudge(inner).model).toBe('wrapped')
	})
})

describe('guide scenario fixtures', () => {
	it('files phrase categories and retains distinct topic and amendment probabilities', async () => {
		const judge = createPhraseJudge(['Standing rule'], ['Updated code'])
		const request = {
			state: 'Standing rule: refunds. Updated code.',
			questions: {
				category: {
					form: 'choice',
					criteria: { rule: 'rule', fact: 'fact', correction: 'correction' },
				},
				'["topic"]': { form: 'noul' },
				'["amends"]': { form: 'noul' },
				'["supersedes"]': { form: 'noul' },
			},
		} as const
		const result = await judge.ask(request, new AbortController().signal)
		expect(result.answers).toEqual({
			category: { form: 'choice', probabilities: { rule: 1 } },
			'["topic"]': { form: 'noul', noul: 0.9 },
			'["amends"]': { form: 'noul', noul: 0.9 },
			'["supersedes"]': { form: 'noul', noul: 0.1 },
		})
		expect(
			(
				await judge.ask(
					{ ...request, state: 'Correction: delivery date.' },
					new AbortController().signal,
				)
			).answers.category,
		).toEqual({ form: 'choice', probabilities: { correction: 1 } })
		expect(
			(await judge.ask({ ...request, state: 'Delivery date.' }, new AbortController().signal))
				.answers.category,
		).toEqual({ form: 'choice', probabilities: { fact: 1 } })
	})
	it('builds independent configurable desk options without adding a lookup', () => {
		const first = buildGuideLedgerOptions()
		const second = buildGuideLedgerOptions()
		expect(first.judge).not.toBe(second.judge)
		expect(first).toMatchObject({
			capacity: 32768,
			system: 'Serve the desk.',
			topics: [LEDGER_REFUNDS_TOPIC],
			lookups: [],
			gauge: { scale: 1, overhead: 0 },
		})
		expect(
			buildGuideLedgerOptions({ capacity: 700, lookups: [LEDGER_ORDER_LOOKUP], topics: [] }),
		).toMatchObject({ capacity: 700, lookups: [LEDGER_ORDER_LOOKUP], topics: [] })
	})
	it('returns asked pair identities for the supplied topic inventory', async () => {
		const shared = await fileLedgerCorrection([LEDGER_REFUNDS_TOPIC])
		expect(shared.pairs).toEqual([shared.amends])
		expect((await fileLedgerCorrection([])).pairs).toEqual([])
	})
	it('returns prompt snapshots with a reserved generation cap', async () => {
		expect(await planLedgerDelivery(1000, 400)).toEqual(await planLedgerDelivery(600))
		expect((await planLedgerDelivery(1000)).length).toBeGreaterThan(
			(await planLedgerDelivery(600)).length,
		)
	})
	it('returns the retained desk fragments at the supplied capacity', async () => {
		expect(await briefLedgerDesk(200)).toEqual(LEDGER_BRIEFING_MARKERS)
		expect(await briefLedgerDesk(59)).toEqual(LEDGER_BRIEFING_MARKERS.slice(4))
	})
	it('returns an amended desk result and its actual recorded prompts', async () => {
		const served = await serveAmendedDesk()
		expect(served.result.passes).toHaveLength(2)
		expect(served.result.content).toBe('Use code AA-12.')
		expect(served.prompts).toHaveLength(4)
		expect(served.prompts[0]?.[0]?.content).toContain(
			'Refunds for Brightwater Studio need a manager.',
		)
	})
	it('preserves distinct amendment and supersession inputs', async () => {
		expect(
			await classifyLedgerCorrection('Correction: refunds need a manager over $250.', 0.1),
		).toEqual({ amendments: false, supersessions: false })
		expect(
			await classifyLedgerCorrection('Correction: refunds over $100 need two managers.', 0.1),
		).toEqual({ amendments: true, supersessions: false })
		expect(
			await classifyLedgerCorrection('Correction: refunds need a manager over $250.', 0.9),
		).toEqual({ amendments: true, supersessions: true })
	})
	it('returns independently recorded thinking and budget-consumer prompts', async () => {
		const outcome = await exerciseThinkingReplay('turn')
		expect(outcome.sent).toEqual([[], ['Refund through the order tool.']])
		expect(outcome.recorded).toEqual([
			'The window is 30 days.',
			'Refund through the order tool.',
			'Report the amount.',
		])
		expect(outcome.measured).toEqual(outcome.wire)
		expect(outcome.result.content).toBe('Refunded $148.50.')
		expect((await exerciseThinkingReplay(undefined)).sent).toEqual([[], []])
	})
	it('measures only request messages and reads a recorded call as its request', () => {
		const hello = [createMessage('hello')]
		// 'hello' is 2 tokens plus 4 of framing; the tool list and schema are not counted.
		expect(
			measureMessages({
				messages: hello,
				tools: [{ name: 'lookup', description: 'Finds a ticket.', parameters: { type: 'object' } }],
				options: { schema: { type: 'object' } },
			}),
		).toBe(6)
		const signal = new AbortController().signal
		expect(
			readCallRequest({ messages: hello, tools: undefined, options: undefined, signal }),
		).toEqual({ messages: hello })
		expect(
			readCallRequest({ messages: hello, tools: [], options: { think: true }, signal }),
		).toStrictEqual({ messages: hello, tools: [], options: { think: true } })
	})
	it('collects present reasoning strings in order without altering messages', () => {
		const reasoning = [
			{ id: 'a', role: 'assistant', content: '', thinking: 'first' },
			{ id: 'b', role: 'user', content: 'next' },
			{ id: 'c', role: 'assistant', content: '', thinking: '' },
		] as const
		expect(collectMessageThinking(reasoning)).toEqual(['first', ''])
		expect(collectMessageThinking([])).toEqual([])
		expect(reasoning[0].thinking).toBe('first')
	})
	it('passes the configured body boundary through the real relay handler', async () => {
		const upstream = createScriptedProvider([{ content: 'admitted' }])
		await expect(
			createBoundedRelay(upstream, 1).generate([], new AbortController().signal),
		).rejects.toMatchObject({ code: 'HTTP', status: 413 })
		expect(upstream.started).toBe(0)
		await expect(
			createBoundedRelay(upstream, 65536).generate([], new AbortController().signal),
		).resolves.toEqual({ content: 'admitted' })
		expect(upstream.started).toBe(1)
	})
})

describe('buildLedgerTailScenario', () => {
	it('builds fresh paired stubs with the same tool-call identity and distinct contents', () => {
		const first = buildLedgerTailScenario()
		const second = buildLedgerTailScenario()
		expect(first.request).toEqual({ id: 'request', role: 'user', content: 'Check BW-5512.' })
		expect(first.seed[1]?.calls).toEqual([
			{ id: 'c1', name: 'lookup_order', arguments: { id: 'BW-5512' } },
		])
		expect(first.boundaries).toEqual([
			{
				id: 'result',
				role: 'tool',
				call: 'c1',
				content: 'lookup_order {"id":"BW-5512"}: result not shown; call recall with BW-5512',
			},
			{
				id: 'result',
				role: 'tool',
				call: 'c1',
				content: 'lookup_order {"id":"BW-5512"}: result shown under Pinned in the system message',
			},
		])
		expect(second).toEqual(first)
		expect(second.seed).not.toBe(first.seed)
		expect(second.boundaries[0]).not.toBe(first.boundaries[0])
	})
})

describe('shared agent builders', () => {
	it('createRecordedBudget records each consumed usage and charges its total', () => {
		const recorder = createRecorder<[TokenUsage]>()
		const budget = createRecordedBudget(recorder)
		expect(budget.max).toBe(1_000_000)
		const first = createTokenUsage()
		const second = createTokenUsage({ prompt: 1, completion: 1, total: 2 })
		budget.consume(first)
		budget.consume(second)
		expect(recorder.calls).toEqual([[first], [second]])
		expect(budget.consumed).toBe(first.total + second.total)
		expect(budget.exhausted).toBe(false)
		const bounded = createRecordedBudget(createRecorder<[TokenUsage]>(), 10)
		expect(bounded.max).toBe(10)
		bounded.consume(first)
		expect(bounded.exhausted).toBe(true)
	})

	it('createRecordedTool records its arguments and returns the supplied output', async () => {
		const recorder = createRecorder<[Readonly<Record<string, unknown>>]>()
		const context = { signal: new AbortController().signal }
		const plain = createRecordedTool('save', recorder)
		expect(plain.name).toBe('save')
		expect(await plain.execute({ id: 1 }, context)).toBe('ok')
		const counted = createRecordedTool('add', recorder, 5)
		expect(counted.name).toBe('add')
		expect(await counted.execute({ id: 2 }, context)).toBe(5)
		expect(recorder.calls).toEqual([[{ id: 1 }], [{ id: 2 }]])
	})

	it('createForeignSignal is signal-shaped, inert, and refused by AbortSignal.any', () => {
		const foreign = createForeignSignal()
		expect(foreign.aborted).toBe(false)
		expect(foreign.reason).toBeUndefined()
		expect(foreign instanceof AbortSignal).toBe(false)
		expect(() => foreign.throwIfAborted()).not.toThrow()
		expect(() => AbortSignal.any([foreign])).toThrow(TypeError)
		expect(AbortSignal.any([new AbortController().signal]).aborted).toBe(false)
	})
})

describe('shared ledger builders', () => {
	const earlier: Message = { id: 'e1', role: 'user', content: 'Refunds over $100 need a manager.' }
	const later: Message = {
		id: 'l1',
		role: 'user',
		content: 'Correction: refunds need a manager over $250.',
	}
	const topic = { name: 'refunds', criterion: 'Refund amounts' }

	it('buildLedgerPairJudgment equals the pair literal the ledger tests hold', () => {
		for (const head of ['amends', 'supersedes'] as const) {
			const literal = {
				id: JSON.stringify([head, earlier.id, later.id]),
				question: LEDGER_QUESTIONS[head],
				sources: [earlier.id, later.id],
				state: `Earlier message: ${earlier.role}: ${earlier.content}\nLater message: user: ${later.content}`,
				model: 'recording-model',
				answer: { form: 'noul', noul: head === 'amends' ? 1 : 0 },
			}
			const built = buildLedgerPairJudgment(head, earlier, later, head === 'amends' ? 1 : 0)
			expect(JSON.stringify(built)).toBe(JSON.stringify(literal))
		}
	})

	it('buildLedgerTopicJudgment equals the topic literal the ledger tests hold', () => {
		for (const message of [earlier, { ...later, role: 'assistant' } satisfies Message]) {
			const literal = {
				id: JSON.stringify(['topic', message.id, 'refunds']),
				question: {
					form: 'noul',
					instructions: LEDGER_QUESTIONS.topic,
					criteria: {
						true: 'The message concerns refunds: Refund amounts',
						false: 'The message does not concern refunds',
					},
				},
				sources: [message.id],
				state: `${message.role}: ${message.content}`,
				model: 'recording-model',
				answer: { form: 'noul', noul: 1 },
			}
			expect(JSON.stringify(buildLedgerTopicJudgment(message, topic, 1))).toBe(
				JSON.stringify(literal),
			)
		}
	})

	it('files pair and topic judgments the real classifier accepts without asking again', async () => {
		const asks: string[][] = []
		for (const preloaded of [false, true]) {
			const conversation = createConversation()
			const first = conversation.add({ role: 'user', content: earlier.content })
			const second = conversation.add({ role: 'user', content: later.content })
			if (preloaded) {
				conversation.judgments.add(buildLedgerTopicJudgment(first, topic, 1))
				conversation.judgments.add(buildLedgerTopicJudgment(second, topic, 1))
				conversation.judgments.add(buildLedgerPairJudgment('amends', first, second, 0.9))
			}
			const asked = createRecorder<readonly [key: string]>()
			const inner = createPhraseJudge(['Refunds over'], ['Correction'])
			const classifier = new Classifier(
				buildClassifierOptions({
					conversation,
					judge: createLedgerJudge(
						asked,
						(request) => inner.ask(request, new AbortController().signal),
						'recording-model',
					),
					topics: [topic],
				}),
			)
			await classifier.classify(new Set(), AbortSignal.timeout(30_000))
			asks.push(
				asked.calls.map(([key]) => key.replace(first.id, 'first').replace(second.id, 'second')),
			)
		}
		const [fresh, filed] = asks
		expect(fresh).toEqual(
			expect.arrayContaining([
				JSON.stringify(['topic', 'first', 'refunds']),
				JSON.stringify(['topic', 'second', 'refunds']),
				JSON.stringify(['amends', 'first', 'second']),
				JSON.stringify(['supersedes', 'first', 'second']),
			]),
		)
		expect(filed).not.toContain(JSON.stringify(['topic', 'first', 'refunds']))
		expect(filed).not.toContain(JSON.stringify(['topic', 'second', 'refunds']))
		expect(filed).not.toContain(JSON.stringify(['amends', 'first', 'second']))
		expect(filed).toContain(JSON.stringify(['supersedes', 'first', 'second']))
	})

	it('summarizes reading durations as absent, valid, or invalid and builds matching expectations', () => {
		const key = '["category","m1"]'
		expect(
			summarizeReadings([
				{ key, phase: 'category', outcome: 'cached' },
				{ key, phase: 'category', outcome: 'resolved', duration: 0 },
				{ key, phase: 'category', outcome: 'failed', duration: 2.5 },
				{ key, phase: 'category', outcome: 'aborted', duration: -1 },
				{ key, phase: 'category', outcome: 'aborted', duration: Number.NaN },
				{ key, phase: 'category', outcome: 'aborted', duration: Number.POSITIVE_INFINITY },
			]).map((summary) => summary.duration),
		).toEqual(['absent', 'valid', 'valid', 'invalid', 'invalid', 'invalid'])
		expect(buildReadingSummaries([['topic', key]], 'skipped')).toEqual([
			{ key, phase: 'topic', outcome: 'skipped', duration: 'absent' },
		])
		const resolved = buildReadingSummaries(CLASSIFIER_PINNED_ASKS, 'resolved')
		expect(resolved).toHaveLength(CLASSIFIER_PINNED_ASKS.length)
		expect(resolved.every((summary) => summary.duration === 'valid')).toBe(true)
	})

	it('buildUncalibratedOptions drops only the gauge and leaves its input whole', () => {
		const options = buildLedgerOptions()
		const uncalibrated = buildUncalibratedOptions(options)
		expect('gauge' in uncalibrated).toBe(false)
		expect(options.gauge).toEqual({ scale: 1, overhead: 0 })
		expect(Object.keys(uncalibrated).sort()).toEqual(
			Object.keys(options)
				.filter((key) => key !== 'gauge')
				.sort(),
		)
		expect(uncalibrated.judge).toBe(options.judge)
		expect(uncalibrated.capacity).toBe(options.capacity)
	})

	it('buildDeliverySeed names each delivery by its index', () => {
		expect(buildDeliverySeed(2)).toEqual([
			{ role: 'user', content: 'Delivery 0 arrived Tuesday with a completed receipt.' },
			{ role: 'user', content: 'Delivery 1 arrived Tuesday with a completed receipt.' },
		])
		expect(buildDeliverySeed(0)).toEqual([])
		expect(buildDeliverySeed(20)).toHaveLength(20)
		expect(buildDeliverySeed(20).at(-1)?.content).toBe(
			'Delivery 19 arrived Tuesday with a completed receipt.',
		)
	})
})

describe('createRelayHop', () => {
	it('drives the real relay handler through Fetch objects by default', async () => {
		const upstream = createScriptedProvider([{ content: 'admitted' }])
		const hop = createRelayHop({ provider: upstream })
		expect(await hop.generate([], new AbortController().signal)).toEqual({ content: 'admitted' })
		expect(upstream.started).toBe(1)
	})

	it('refuses a body over the limit before the upstream provider starts', async () => {
		const upstream = createScriptedProvider([{ content: 'admitted' }])
		await expect(
			createRelayHop({ provider: upstream, limit: 1 }).generate([], new AbortController().signal),
		).rejects.toMatchObject({ code: 'HTTP', status: 413 })
		expect(upstream.started).toBe(0)
	})

	it('carries the supplied headers to the authorization hook', async () => {
		const upstream = createScriptedProvider([{ content: 'admitted' }])
		const authorize = (request: Request): boolean =>
			request.headers.get('authorization') === 'Bearer accepted'
		const refused = createRelayHop({
			provider: upstream,
			authorize,
			headers: () => ({ authorization: 'Bearer refused' }),
		})
		await expect(refused.generate([], new AbortController().signal)).rejects.toMatchObject({
			code: 'HTTP',
			status: 401,
		})
		expect(upstream.started).toBe(0)
		const accepted = createRelayHop({
			provider: upstream,
			authorize,
			headers: () => ({ authorization: 'Bearer accepted' }),
		})
		expect(await accepted.generate([], new AbortController().signal)).toEqual({
			content: 'admitted',
		})
	})

	it('hands the handler the request its builder returns and the observer the response', async () => {
		const upstream = createScriptedProvider([{ content: 'admitted' }])
		const urls = createRecorder<[string]>()
		const replies = createRecorder<readonly [status: number, body: string]>()
		const hop = createRelayHop({
			provider: upstream,
			url: 'http://relay.test/exact?route=turn',
			request: (input, init) => {
				const request = new Request(input, init)
				urls.handler(request.url)
				return new Request(request, { body: '{"messages":null}' })
			},
			response: async (response) => {
				replies.handler(response.status, await response.clone().text())
			},
		})
		await expect(hop.generate([], new AbortController().signal)).rejects.toMatchObject({
			code: 'HTTP',
			status: 400,
		})
		expect(urls.calls).toEqual([['http://relay.test/exact?route=turn']])
		expect(replies.calls).toEqual([[400, '']])
		expect(upstream.started).toBe(0)
	})
})
