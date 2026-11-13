import {
	answerLedgerKey,
	buildCategoryAnswer,
	createFailingJudge,
	createOnceFailingJudge,
	LEDGER_ONCE_FAILURES,
	createSettledJudge,
	REWRITTEN_CONVERSATION_SNAPSHOT,
	SUMMARIZED_CONVERSATION_SNAPSHOT,
	buildJudgmentRecords,
	buildLedgerBenchOptions,
	buildLedgerBlock,
	buildLedgerPrefix,
	createCorrectionJudge,
	extractLedgerOrder,
	LEDGER_BENCH_DESK,
	renderLedgerPositions,
	seedLedgerPrefix,
	buildLedgerText,
	measureLedgerText,
} from './setup.js'
import { checkLedgerSample, isLedgerCell, takeLedgerSample } from './setupServer.js'
import {
	admitsRelayCredential,
	buildLedgerTailScenario,
	MEASURE_CALLS,
	MEASURE_CIRCULAR,
	MESSAGE_MEASURE_CASES,
	REQUEST_ADD,
	REQUEST_HELLO,
	REQUEST_LONG,
	REQUEST_MEASURE_CASES,
	RELAY_SYSTEM_CASES,
	RELAY_TOOL_CASES,
} from './setup.js'
import {
	createPhraseJudge,
	LEDGER_REFUNDS_TOPIC,
	LEDGER_ORDER_LOOKUP,
	fileLedgerCorrection,
	planLedgerDelivery,
	LEDGER_RECORD_MARKERS,
	collectLedgerMarkers,
	serveAmendedDesk,
	classifyLedgerCorrection,
	exerciseThinkingReplay,
	collectMessageThinking,
	createBoundedRelay,
	buildGuideLedgerOptions,
	measureMessages,
	readCallRequest,
} from './setup.js'
import {
	LEDGER_REPLAY_FIXTURE,
	LEDGER_SNAPSHOT_SEED,
	buildLedgerReplayOptions,
	buildLedgerSnapshotRefusals,
	createInvalidLedgerSnapshotCases,
	createLedgerReplay,
	createMalformedConversationCases,
	RecoveryProvider,
	serveLedgerHistory,
	serveLedgerReplay,
	translateLedgerIds,
} from './setup.js'
import type { LedgerProjection, Message, ProviderResult } from '@src/core'
import type { ToolDefinition } from '@orkestrel/tool'
import {
	Channel,
	createAgent,
	createAuthority,
	createScope,
	estimateRequest,
	ProviderAbortError,
	providerRequestContract,
	REFUSED_RELAY_STATUS,
	requireJudgment,
} from '@src/core'
import { collect, createRecorder } from '@orkestrel/test'
import {
	createScriptedApprover,
	createAuthorityContext,
	createMessage,
	computeUsageTotal,
	returnUndefined,
	collectPaced,
	AccessedAgentResult,
	createInvalidAgentResultCases,
	seedCompactionAgent,
	seedLookupAgent,
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
	AGENT_WIRE_CASES,
	AGENT_WIRE_FRAMES,
	AGENT_WIRE_RULES,
	authenticateWire,
	CANARY_BUILD_SOURCES,
	CANARY_FRAME_SOURCES,
	CANARY_INGRESS_SOURCES,
	CANARY_LEDGER_SOURCES,
	CANARY_SENTINELS,
	DUPLICATE_ID_SNAPSHOTS,
	MALFORMED_CONVERSATION_SNAPSHOTS,
	MESSAGE_GUARD_CASES,
	RECORDED_ANSWER_REQUEST,
	RECORDED_COMPACTION_REQUEST,
	RECORDED_FIRST_REQUEST,
	RECORDED_LATE_REQUEST,
	REFUSED_WIRE_ANSWERS,
	REFUSED_WIRE_FRAMES,
	REFUSED_WIRE_PROMPTS,
	RENDERED_ARGUMENTS,
	createAskAgent,
	createCanaryJudge,
	createCanaryMemos,
	createCanarySkills,
	createGuardAgent,
	createWireDecision,
	createWireHeaders,
	extractLedgerRecords,
	readWireFrames,
	seedCanaryContext,
	seedCompactionArm,
	serveCanaryDesk,
	serveIngressCanary,
	serveRecordsDesk,
	verifyWire,
} from './setup.js'
import {
	measureChannelCell,
	measureChannelPushes,
	measureGeneration,
	measureLargestPush,
	measureLateDrain,
	measurePacedDrain,
} from './setup.js'
import {
	Classifier,
	isLedgerError,
	LedgerError,
	LEDGER_QUESTIONS,
	buildRecords,
	CONVERSATION_RECAP_PREFIX,
	createSystemOneJudge,
	ConversationManager,
	createConversation,
	createLedger,
	createMemoManager,
	createMemoryConversationStore,
	isConversationError,
	isConversationSnapshot,
	isMemoSnapshot,
	isProviderAbortError,
	MESSAGE_ROLES,
	ThinkSplitter,
	LEDGER_CATEGORIES,
} from '@src/core'
import { requireValue, waitForDelay } from '@orkestrel/test'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	buildRefusalPath,
	buildRefusalTree,
	collectTreeJobs,
	drawJobBounds,
	drawJobTrees,
	JOB_REFUSAL_CASES,
	JOB_REFUSAL_PARENT,
	omitMember,
	readStructureRefusal,
	UNDECLARED_FORMS,
} from './setup.js'
import {
	blankSourceText,
	extractDeclaredNames,
	extractNameWord,
	extractParameters,
	PARTICIPLE_ALLOWED,
	scanParticipleNames,
} from './setup.js'
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
	createDeafScheduler,
	createGatedScheduler,
	createPacedLedger,
	createRecordedScheduler,
	createRecordedJudge,
	SilentJudge,
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
	buildMemoSnapshot,
	plantSnapshotRow,
	RecordedBody,
	RecordedProvider,
	RecordedTransport,
	buildSystemOnePositions,
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
	buildLedgerFinding,
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
	buildAttemptSummaries,
	CLASSIFIER_PINNED_ASKS,
	summarizeAttempts,
	LEDGER_DESK_THRESHOLDS,
	buildLedgerJudgment,
	buildLedgerExchange,
	seedLedgerTrimOrder,
	LEDGER_TRIM_ORDER_FIXTURE,
	buildLedgerResponse,
	createLedgerJudge,
	SwitchableJudge,
	buildDeliverySeed,
	buildCorrectionSeed,
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
import {
	buildLedgerWorkspaceShape,
	buildNonPlainMessages,
	buildRecordInputRefusals,
	chargeDensityPrompt,
	LEDGER_DENSE_RATES,
	LEDGER_DENSITY_RATES,
	drawRecordInput,
	MessageInstance,
	RECORD_INPUT_FIXTURES,
	buildAgentCallerCases,
	collectCallers,
	createInspectTool,
	createNoteTool,
	NOTE_TEXT,
	readRenderedWorkspaces,
	renderWorkspaceMarker,
} from './setup.js'
import type { ToolContext } from '@orkestrel/tool'
import type { TokenUsage } from '@orkestrel/budget'
import { createDatabase, createMemoryDriver } from '@orkestrel/database'
import { createWorkspaceManager } from '@orkestrel/workspace'
import { isRecord, rawShape, seededRandom, stringShape } from '@orkestrel/contract'

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
	it('builds authority and message fixtures and totals recorded usage', () => {
		expect(createAuthorityContext('read', { path: 'note' })).toEqual({
			call: { id: 'c1', name: 'read', arguments: { path: 'note' } },
		})
		const deferred = Promise.resolve(true)
		const approver = createScriptedApprover([true, deferred])
		const context = createAuthorityContext('write')
		const decision = { zone: 'sensitive', verdict: 'ask' } as const
		const signal = new AbortController().signal
		expect(approver.ask(context, decision, signal)).toBe(true)
		expect(approver.ask(context, decision, signal)).toBe(deferred)
		expect(approver.ask(context, decision, signal)).toBe(false)
		expect(approver.calls).toEqual([
			[context, decision, signal],
			[context, decision, signal],
			[context, decision, signal],
		])
		expect(approver.calls[0]?.[2]).toBe(signal)
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
		const counted = new AccessedAgentResult()
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
		const thrown = createThrowingProvider('broken', 'prefix')
		const stream = thrown.stream([], signal.signal)
		expect((await stream.next()).value).toEqual({ channel: 'content', text: 'prefix' })
		await expect(stream.next()).rejects.toThrow('broken')
		await expect(thrown.generate([], signal.signal)).rejects.toThrow('broken')
		const failure = new ProviderAbortError({ content: 'x' })
		const aborted = createAbortingResultProvider(signal, failure).stream([], signal.signal)
		await aborted.next()
		await expect(aborted.next()).rejects.toBe(failure)
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
				expected.content + expected.uniform + expected.calls + expected.thinking + expected.images,
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
						measure.uniform +
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
		// `hello` is 5 characters, so content 2 with uniform 4; 40 characters is content 10 with uniform 4.
		expect(estimateRequest({ messages: [REQUEST_HELLO] })).toBe(6)
		expect(estimateRequest({ messages: [REQUEST_LONG] })).toBe(14)
		// The advertised `add` definition costs 18 beside no messages.
		expect(estimateRequest({ messages: [], tools: [REQUEST_ADD] })).toBe(18)
		expect([REQUEST_HELLO.id, REQUEST_LONG.id, REQUEST_ADD.name]).toEqual(['m', 'n', 'add'])
		// One `add` call renders to 41 characters, so 11, beside uniform 4.
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
		const recorded = createScriptedProvider([{ content: 'x' }], { recorded: true })
		await recorded.generate(messages, signal, tools, { think: true })
		expect(recorded.calls).toHaveLength(1)
		expect(recorded.calls[0]?.messages).toEqual(messages)
		expect(recorded.calls[0]?.tools).toEqual(tools)
		expect(recorded.calls[0]?.options).toEqual({ think: true })
		// The LIVE signal is held, so a test can read which bound tripped after the call returned.
		expect(recorded.calls[0]?.signal).toBe(signal)
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
			outcome: 'answer',
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
		expect(truncated.outcome).toBe('answer')
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

describe('createRecordedScheduler', () => {
	it('counts each paced turn boundary and resolves its delay as a no-op', async () => {
		for (const scheduler of [createRecordedScheduler(), new RecordedScheduler()]) {
			expect(scheduler.yields).toBe(0)
			await scheduler.yield()
			await scheduler.yield()
			expect(scheduler.yields).toBe(2)
			await expect(scheduler.delay(1_000)).resolves.toBeUndefined()
		}
	})

	it('rejects with the signal reason on an aborted yield and paces nothing', async () => {
		for (const scheduler of [createRecordedScheduler(), new RecordedScheduler()]) {
			const reason = new Error('cancelled')
			await expect(scheduler.yield({ signal: AbortSignal.abort(reason) })).rejects.toBe(reason)
			expect(scheduler.yields).toBe(0)
		}
	})

	it('keeps one scheduler’s count apart from another’s', async () => {
		const first = createRecordedScheduler()
		const second = createRecordedScheduler()
		await first.yield()
		expect([first.yields, second.yields]).toEqual([1, 0])
	})
})

describe('createGatedScheduler', () => {
	it('holds each yield until the gate resolves, then passes every later one', async () => {
		const gate = Promise.withResolvers<void>()
		const scheduler = createGatedScheduler(gate)
		const passed = createRecorder<readonly []>()
		const first = scheduler.yield().then(() => passed.handler())
		await scheduler.reached
		await scheduler.delay(1_000)
		expect([scheduler.yields, passed.count]).toEqual([1, 0])
		gate.resolve()
		await first
		await scheduler.yield()
		expect([scheduler.yields, passed.count]).toEqual([2, 1])
	})

	it('rejects a pending yield with the signal reason and an aborted one at once', async () => {
		const scheduler = createGatedScheduler(Promise.withResolvers<void>())
		const reason = new Error('cancelled')
		const abort = new AbortController()
		const pending = scheduler.yield({ signal: abort.signal })
		await scheduler.reached
		abort.abort(reason)
		await expect(pending).rejects.toBe(reason)
		await expect(scheduler.yield({ signal: abort.signal })).rejects.toBe(reason)
		expect(scheduler.yields).toBe(1)
	})

	it('resolves a signalled yield through its gate', async () => {
		const gate = Promise.withResolvers<void>()
		const pending = createGatedScheduler(gate).yield({ signal: new AbortController().signal })
		gate.resolve()
		await expect(pending).resolves.toBeUndefined()
	})
})

describe('createDeafScheduler', () => {
	it('leaves a yield pending through an abort, and the resolved gate releases it', async () => {
		const gate = Promise.withResolvers<void>()
		const scheduler = createDeafScheduler(gate)
		const passed = createRecorder<readonly []>()
		const abort = new AbortController()
		const pending = scheduler.yield({ signal: abort.signal }).then(() => passed.handler())
		await scheduler.reached
		abort.abort(new Error('cancelled'))
		await waitForDelay(0)
		expect([scheduler.yields, passed.count]).toEqual([1, 0])
		gate.resolve()
		await pending
		expect([scheduler.yields, passed.count]).toEqual([1, 1])
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
		// The text files render into the user context message after the system message; the image
		// data attaches to the last user turn.
		expect(built.map((message) => message.role)).toEqual(['system', 'user', 'user'])
		expect(requireValue(built[0]).content).toBe('sys')
		expect(requireValue(built[1]).content).toContain('KEPT FILE')
		expect(requireValue(built[1]).content).toContain('DROPPED FILE')
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
			'user',
			'assistant',
			'user',
		])
	})
})

describe('system boundary canary fixtures', () => {
	it('supplies one distinct sentinel per source, none inside another, and source lists drawn from it', () => {
		const sentinels = Object.values(CANARY_SENTINELS)

		expect(new Set(sentinels).size).toBe(sentinels.length)
		expect(
			sentinels.every((one) => sentinels.every((other) => one === other || !one.includes(other))),
		).toBe(true)
		expect(Object.keys(CANARY_SENTINELS)).toEqual(expect.arrayContaining([...CANARY_BUILD_SOURCES]))
		expect(Object.keys(CANARY_SENTINELS)).toEqual(
			expect.arrayContaining([...CANARY_LEDGER_SOURCES]),
		)
		expect(Object.keys(CANARY_SENTINELS)).toEqual(
			expect.arrayContaining([...CANARY_INGRESS_SOURCES]),
		)
		expect(Object.keys(CANARY_SENTINELS)).toEqual(expect.arrayContaining([...CANARY_FRAME_SOURCES]))
		expect(new Set(CANARY_FRAME_SOURCES).size).toBe(CANARY_FRAME_SOURCES.length)
		expect(CANARY_FRAME_SOURCES).not.toContain('body')
		expect(CANARY_BUILD_SOURCES).not.toContain('system')
		expect(CANARY_LEDGER_SOURCES).not.toContain('system')
		expect(CANARY_INGRESS_SOURCES).not.toContain('system')
		expect(CANARY_BUILD_SOURCES).not.toContain('skill')
		expect(CANARY_LEDGER_SOURCES).not.toContain('skill')
	})

	it('builds the canary skill and memo', () => {
		const skills = createCanarySkills().skills()
		const memos = createCanaryMemos().memos()

		expect(skills).toHaveLength(1)
		expect(skills[0]?.description).toContain(CANARY_SENTINELS.skill)
		expect(memos).toHaveLength(1)
		expect(memos[0]?.name).toBe(CANARY_SENTINELS.memo)
		expect(memos[0]?.description).toContain(CANARY_SENTINELS.gist)
		expect(memos[0]?.content).toContain(CANARY_SENTINELS.fact)
	})

	it.each(CANARY_INGRESS_SOURCES.filter((source) => source !== 'select'))(
		'serves the %s ingress canary with the system text first',
		async (source) => {
			const canary = await serveIngressCanary(source)
			const first = requireValue(canary.sent[0])

			expect(canary.sent.length).toBeGreaterThan(0)
			expect(first[0]?.role).toBe('system')
			expect(first[0]?.content).toContain(CANARY_SENTINELS.system)
		},
	)
	it('sends nothing on a selected system message, because the strict run settles error', async () => {
		const canary = await serveIngressCanary('select')

		expect(canary.sent).toEqual([])
		expect(isConversationError(canary.error) && canary.error.code).toBe('ROLE')
	})

	it('names malformed snapshots the conversation guard refuses, each title distinct', () => {
		const titles = MALFORMED_CONVERSATION_SNAPSHOTS.map(([title]) => title)

		expect(new Set(titles).size).toBe(titles.length)
		for (const [, snapshot] of MALFORMED_CONVERSATION_SNAPSHOTS) {
			expect(isConversationSnapshot(snapshot)).toBe(false)
		}
	})

	it('names snapshots repeating an id that the conversation guard admits, each title distinct', () => {
		const titles = DUPLICATE_ID_SNAPSHOTS.map(([title]) => title)

		expect(new Set(titles).size).toBe(titles.length)
		for (const [, snapshot] of DUPLICATE_ID_SNAPSHOTS) {
			expect(isConversationSnapshot(snapshot)).toBe(true)
		}
	})

	it('creates a judge that answers as the phrase judge and carries the sentinel in model and refusals', async () => {
		const result = await createCanaryJudge(['Keep the loading']).ask(
			{
				state: 'Keep the loading dock clear.',
				questions: { category: LEDGER_QUESTIONS.category, '["amends"]': LEDGER_QUESTIONS.amends },
			},
			new AbortController().signal,
		)

		expect(result).toEqual({
			model: CANARY_SENTINELS.judge,
			answers: { category: buildCategoryAnswer({ rule: 1 }) },
			refusals: { '["amends"]': { missing: [CANARY_SENTINELS.judge] } },
		})
	})

	it('seeds a compacted context carrying the build-path sentinels', async () => {
		const context = await seedCanaryContext()
		const conversation = requireValue(context.conversations.active)

		expect(context.system).toContain(CANARY_SENTINELS.system)
		expect(context.instructions.instruction('desk')?.content).toContain(
			CANARY_SENTINELS.instruction,
		)
		expect(context.workspaces.active?.files().map((file) => file.path)).toEqual([
			'scan.png',
			'notes.txt',
		])
		expect(conversation.sections.map((section) => section.summary)).toEqual([
			CANARY_SENTINELS.summary,
		])
		expect(conversation.messages().map((message) => message.content)).toEqual([
			`Ask ${CANARY_SENTINELS.user} now.`,
			`Check ${CANARY_SENTINELS.assistant} first.`,
			`Found ${CANARY_SENTINELS.tool} only.`,
			'Reply now.',
		])
	})

	it('serves the canary desk on its first pass, answer pass, late request, and direct selection', async () => {
		const desk = await serveCanaryDesk()
		const fault = desk.selections.at(-1)?.fault

		expect(desk.calls).toHaveLength(4)
		expect(isLedgerError(fault) && fault.code === 'REQUEST').toBe(true)
		expect(desk.judgments.length).toBeGreaterThan(0)
	})

	it('serves the records desk on two requests and keeps both stored requests', async () => {
		const desk = await serveRecordsDesk()

		expect(desk.calls).toHaveLength(3)
		expect(desk.selections).toHaveLength(3)
		expect(
			desk.messages
				.filter((message) => message.content.startsWith('Check Brightwater Studio'))
				.map((message) => message.content),
		).toEqual(['Check Brightwater Studio.', 'Check Brightwater Studio again.'])
	})

	it('seeds the compaction arm with a desk instruction and one compacted section', async () => {
		const agent = await seedCompactionArm(createScriptedProvider([{ content: 'x' }]))
		const conversation = requireValue(agent.context.conversations.active)

		expect(agent.context.system).toBeUndefined()
		expect(agent.context.instructions.instructions().map((one) => one.name)).toEqual(['desk'])
		expect(conversation.sections.map((section) => section.summary)).toEqual(['recap of 2'])
		expect(conversation.messages().map((message) => message.content)).toEqual([
			'Order 2 shipped.',
			'Noted.',
			'Which orders shipped?',
		])
	})

	it('pins each recorded arm with one system message first and a user message last', () => {
		for (const recorded of [
			RECORDED_FIRST_REQUEST,
			RECORDED_ANSWER_REQUEST,
			RECORDED_LATE_REQUEST,
			RECORDED_COMPACTION_REQUEST,
		]) {
			expect(recorded.filter((message) => message.role === 'system')).toHaveLength(1)
			expect(recorded[0]?.role).toBe('system')
			expect(recorded.at(-1)?.role).toBe('user')
		}
		expect(RECORDED_ANSWER_REQUEST[1]).toEqual(RECORDED_FIRST_REQUEST.at(-1))
		// A late request keeps the first request's head and seed whole, then adds the previous exchange.
		expect(RECORDED_LATE_REQUEST.slice(0, -3)).toEqual(RECORDED_FIRST_REQUEST.slice(0, -1))
		expect(RECORDED_LATE_REQUEST.slice(-3, -1).map((message) => message.role)).toEqual([
			'user',
			'assistant',
		])
	})

	it('reads the records of the last request copy and empty text when no copy carries any', () => {
		const copy: Message = {
			id: 'copy',
			role: 'user',
			content: '## Records\n- Refund issued.\n\n## Request\nCheck BW-5512.',
		}
		const cue: Message = { id: 'cue', role: 'user', content: 'Answer now.' }
		const system: Message = { id: 'system', role: 'system', content: 'a\n\n## Request\nb' }

		expect(extractLedgerRecords([system, copy, cue])).toBe('## Records\n- Refund issued.')
		expect(extractLedgerRecords([system, cue])).toBe('')
		expect(extractLedgerRecords([])).toBe('')
		expect(
			extractLedgerRecords([
				copy,
				{ ...copy, id: 'late', content: 'Later.\n\n## Request\nAgain.' },
			]),
		).toBe('Later.')
	})
})

describe('agent wire fixtures', () => {
	it('names refused prompts, each title distinct, each one member beside a content text or alone', () => {
		const titles = REFUSED_WIRE_PROMPTS.map(([title]) => title)
		const textless = REFUSED_WIRE_PROMPTS.filter(
			([, prompt]) =>
				typeof prompt !== 'object' ||
				prompt === null ||
				!('content' in prompt) ||
				typeof prompt.content !== 'string',
		).map(([title]) => title)

		expect(new Set(titles).size).toBe(titles.length)
		expect(textless).toEqual(['images without content'])
		for (const [, prompt] of REFUSED_WIRE_PROMPTS) {
			const keys = typeof prompt === 'object' && prompt !== null ? Object.keys(prompt) : []
			expect(keys.filter((key) => key !== 'content')).toHaveLength(1)
		}
	})

	it('creates a guard agent that advertises read and scripts a call no registered tool carries', () => {
		const guard = createGuardAgent('ask', 'erase')

		expect(guard.call).toEqual({ id: 'g1', name: 'erase', arguments: {} })
		expect(guard.agent.context.tools.definitions().map((definition) => definition.name)).toEqual([
			'read',
		])
		expect(guard.agent.context.messages.messages().map((message) => message.content)).toEqual([
			'Tidy the folder.',
		])
		expect([guard.evaluated.calls, guard.entered.calls, guard.executed.calls]).toEqual([[], [], []])
		expect(guard.provider.calls).toEqual([])
	})

	it('keeps a given guard handler unentered for the unadvertised call', async () => {
		const handler = createScriptedApprover([false])
		const guard = createGuardAgent('ask', 'erase', handler.ask)

		await guard.agent.generate()

		expect([guard.evaluated.calls, guard.entered.calls, handler.calls]).toEqual([[], [], []])
	})

	it('names one exact frame per arm and finish layer, each title distinct', () => {
		const titles = AGENT_WIRE_FRAMES.map(([title]) => title)

		expect(new Set(titles).size).toBe(titles.length)
		expect(new Set(AGENT_WIRE_FRAMES.map(([, frame]) => frame.category))).toEqual(
			new Set(['token', 'think', 'tool', 'usage', 'ask', 'finish', 'error']),
		)
		expect(
			AGENT_WIRE_FRAMES.filter(([, frame]) => frame.category === 'tool').map(
				([, frame]) => frame.category === 'tool' && frame.success,
			),
		).toEqual([true, false])
		expect(
			AGENT_WIRE_FRAMES.filter(([, frame]) => frame.category === 'finish').map(
				([, frame]) => frame.category === 'finish' && frame.layer,
			),
		).toEqual([undefined, 'budget', 'meter', 'model'])
	})

	it('names refused frames and answers, each title distinct', () => {
		for (const table of [REFUSED_WIRE_FRAMES, REFUSED_WIRE_ANSWERS]) {
			const titles = table.map(([title]) => title)

			expect(new Set(titles).size).toBe(titles.length)
		}
	})

	it('names rendered arguments whose text parses back to them, each title distinct', () => {
		const titles = RENDERED_ARGUMENTS.map(([title]) => title)

		expect(new Set(titles).size).toBe(titles.length)
		for (const [, value, text] of RENDERED_ARGUMENTS) {
			expect(JSON.parse(text)).toEqual(value)
		}
	})

	it('creates an ask agent whose write call reaches the handler', async () => {
		const handler = createScriptedApprover([true])
		const asked = createAskAgent(handler.ask, { arguments: { path: 'b.txt' }, id: 'w2' })

		expect(asked.call).toEqual({ id: 'w2', name: 'write', arguments: { path: 'b.txt' } })
		expect(await asked.agent.generate()).toEqual({ content: 'done', partial: false })
		expect(handler.calls.map(([context, decision]) => [context.call, decision])).toEqual([
			[asked.call, { zone: 'files', verdict: 'ask' }],
		])
		expect(asked.executed.calls).toEqual([[{ path: 'b.txt' }]])
		expect(asked.tools.tool('write')).toBeDefined()
		expect(asked.provider.calls).toHaveLength(2)
	})

	it('names the page-wire cases, each title distinct and at most 40 characters', () => {
		const titles = AGENT_WIRE_CASES.map(([title]) => title)

		expect(new Set(titles).size).toBe(titles.length)
		expect(titles.filter((title) => title.length > 40)).toEqual([])
		expect(AGENT_WIRE_CASES.map(([, scenario]) => scenario)).toEqual([
			'wire',
			'principals',
			'overlap',
		])
	})

	it('holds one rule that asks for every call in the files zone', () => {
		const call = { id: 'w1', name: 'write', arguments: { path: 'notes/a.md' } }
		const authority = createAuthority({
			rules: AGENT_WIRE_RULES,
			fallback: { zone: 'files', verdict: 'deny' },
		})

		expect(AGENT_WIRE_RULES).toHaveLength(1)
		expect(authority.evaluate({ call })).toEqual({ zone: 'files', verdict: 'ask' })
	})

	it('authenticates and verifies only the headers createWireHeaders writes', () => {
		const trusted = new Request('http://wire.test/answers', {
			method: 'POST',
			headers: createWireHeaders('ada'),
		})
		const foreign = new Request('http://wire.test/answers', {
			method: 'POST',
			headers: { ...createWireHeaders('ada'), origin: 'https://other.example' },
		})
		const forged = new Request('http://wire.test/answers', {
			method: 'POST',
			headers: { ...createWireHeaders('ada'), 'x-csrf-token': 'csrf-other' },
		})
		const anonymous = new Request('http://wire.test/answers', { method: 'POST' })

		expect([trusted, foreign, forged, anonymous].map(authenticateWire)).toEqual([
			'ada',
			'ada',
			'ada',
			undefined,
		])
		expect([trusted, foreign, forged, anonymous].map(verifyWire)).toEqual([
			true,
			false,
			false,
			false,
		])
	})

	it('creates a decision that reports each asked id and answers with the approval', async () => {
		const asked = Promise.withResolvers<string>()
		const decide = createWireDecision(asked, Promise.resolve(false))

		expect(await decide('a1')).toBe(false)
		expect(await asked.promise).toBe('a1')
	})

	it('reads frames up to the first frame of a category or the end of the body', async () => {
		const frames = [
			{ category: 'token', content: 'Archived.' },
			{ category: 'finish', content: 'Archived.', partial: false },
			{ category: 'error' },
		]
		const reader = new ReadableStream<unknown>({
			start: (controller) => {
				for (const frame of frames) controller.enqueue(frame)
				controller.close()
			},
		}).getReader()

		expect(await readWireFrames(reader, 'finish')).toEqual([
			{ category: 'token', content: 'Archived.' },
			{ category: 'finish', content: 'Archived.', partial: false },
		])
		expect(await readWireFrames(reader, 'finish')).toEqual([{ category: 'error' }])
		expect(await readWireFrames(reader, 'finish')).toEqual([])
	})

	it('refuses a frame line the frame contract refuses', async () => {
		const records = new ReadableStream<unknown>({
			start: (controller) => {
				controller.enqueue({ category: 'deny' })
				controller.close()
			},
		}).getReader()

		await expect(readWireFrames(records, 'finish')).rejects.toThrow(
			'refused frame line: {"category":"deny"}',
		)
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
	it('supplies message guard cases with distinct labels and every role passing both guards', () => {
		const labels = MESSAGE_GUARD_CASES.map((row) => row.label)

		expect(new Set(labels).size).toBe(labels.length)
		expect(
			MESSAGE_ROLES.every((role) =>
				MESSAGE_GUARD_CASES.some((row) => row.value.role === role && row.domain && row.wire),
			),
		).toBe(true)
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
		expect(await response.json()).toEqual({
			...SYSTEM_ONE_TEV1,
			answers: buildSystemOnePositions(SYSTEM_ONE_TEV1.answers),
		})
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

describe('plantSnapshotRow', () => {
	it('stores a row in each named table', async () => {
		const driver = createMemoryDriver()
		const conversationRow = {
			id: 'unreadable',
			snapshot: { id: 'unreadable', messages: 'malformed' },
		}
		const memoRow = { id: 'unreadable', snapshot: { id: 'unreadable', memos: 'malformed' } }
		await plantSnapshotRow(driver, 'conversations', conversationRow)
		await plantSnapshotRow(driver, 'memos', memoRow)
		const columns = { id: stringShape(), snapshot: rawShape({}) }
		const database = createDatabase({
			driver,
			tables: { conversations: columns, memos: columns },
		})
		try {
			expect(await database.table('conversations').get('unreadable')).toEqual(conversationRow)
			expect(await database.table('memos').get('unreadable')).toEqual(memoRow)
		} finally {
			await database.close()
		}
	})
})

describe('buildMemoSnapshot', () => {
	it('builds a memo set of the given size', () => {
		const snapshot = buildMemoSnapshot(5, 'ada')

		expect(snapshot.id).toBe('ada')
		expect(snapshot.memos).toHaveLength(5)
		expect(new Set(snapshot.memos.map((memo) => memo.id)).size).toBe(5)
		expect(snapshot.memos.every((memo) => memo.origin !== undefined)).toBe(true)
		expect(isMemoSnapshot(snapshot)).toBe(true)
		expect(
			createMemoManager({ snapshot })
				.history('topic-0')
				.map((memo) => memo.content),
		).toEqual([
			'Revision 0: keep replies to customer CU-1000 under 120 words. It holds because they read on a phone. Apply it to every reply in their threads.',
			'Revision 1: keep replies to customer CU-1000 under 120 words. It holds because they read on a phone. Apply it to every reply in their threads.',
		])
		expect(buildMemoSnapshot(3).id).toBe('ada')
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

describe('judge fixtures', () => {
	it('completes a category answer with a zero for every ledger category', () => {
		const answer = buildCategoryAnswer({ rule: 0.9, fact: 0.1 })
		expect(Object.keys(answer.probabilities).toSorted()).toEqual(LEDGER_CATEGORIES.toSorted())
		expect(answer.probabilities).toMatchObject({ rule: 0.9, fact: 0.1, chatter: 0 })
	})

	it('creates a judge that rejects its first ask and reaches another judge after that', async () => {
		const failure = new Error('unreachable')
		const result = { model: 'settled', answers: {} }
		const signal = new AbortController().signal
		const request = { state: 'text', questions: {} }
		const judge = createOnceFailingJudge(failure, createSettledJudge(result))
		await expect(judge.ask(request, signal)).rejects.toBe(failure)
		expect(await judge.ask(request, signal)).toBe(result)
		expect(LEDGER_ONCE_FAILURES.map(([label]) => label)).toHaveLength(3)
	})

	it('creates a judge that resolves or rejects every ask with one value', async () => {
		const failure = new Error('unreachable')
		const result = { model: 'settled', answers: {} }
		const signal = new AbortController().signal
		const request = { state: 'text', questions: {} }
		expect(await createSettledJudge(result).ask(request, signal)).toBe(result)
		await expect(createFailingJudge(failure).ask(request, signal)).rejects.toBe(failure)
	})

	it('rewrites the summarized snapshot without its summary, keeping the rest', () => {
		const { summary: _summary, ...rewritten } = SUMMARIZED_CONVERSATION_SNAPSHOT
		expect(REWRITTEN_CONVERSATION_SNAPSHOT).toEqual(rewritten)
	})
})

describe('SilentJudge', () => {
	it('records requests in order while refusing every question it is asked', async () => {
		const judge = new SilentJudge()
		const first = { state: 'first', questions: { q: { form: 'noul' } } } as const
		const second = { state: 'second', questions: {} }
		expect(judge.requests).toEqual([])
		expect(await judge.ask(first)).toEqual({
			model: 'recording-model',
			answers: {},
			refusals: { q: { missing: [] } },
		})
		await judge.ask(second)
		expect(judge.requests).toEqual([first, second])
		expect(new SilentJudge().requests).toEqual([])
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
			findings: input.findings,
			entities: Object.fromEntries(input.entities),
			classification: {
				quiet: [...input.classification.quiet],
				categories: Object.fromEntries(input.classification.categories),
				amendments: { 'user-01': ['user-04'] },
				supersessions: { 'user-04': ['user-07'] },
			},
		})
		const built = buildRecords(supersessions)
		expect(built.amendments).toEqual([{ earlier: 'user-01', later: 'user-07' }])
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
			findings: [
				buildLedgerFinding(
					'tool-a',
					'lookup_order',
					{ id: 'BW-5512' },
					'Order BW-5512 for account BW-20931: total $10.00.',
					{ ids: ['BW-5512'], owners: [] },
				),
				buildLedgerFinding(
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
					title: 'Brightwater Studio (BW-20931)',
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
		expect([empty.system, empty.exclusions, empty.messages, empty.findings]).toEqual([
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
	it('seeds the trim order with its judgments', () => {
		const fixture = LEDGER_TRIM_ORDER_FIXTURE
		const ledger = createLedger(createScriptedProvider([]), buildLedgerOptions())
		seedLedgerTrimOrder(ledger)
		expect(ledger.conversation.view().map((message) => message.content)).toEqual([
			'',
			fixture.seed,
			fixture.older,
			fixture.correction,
			fixture.newer,
		])
		expect(ledger.conversation.judgments.judgments().map((one) => one.answer)).toMatchObject([
			{ probabilities: { fact: 1, correction: 0 } },
			{ probabilities: { fact: 0, correction: 1 } },
			{ probabilities: { fact: 1, correction: 0 } },
		])
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
		const switched = new SwitchableJudge(inner, 'A')
		const request = { state: 'Refund.', questions: { first: JUDGMENT_QUESTION } }
		expect([switched.id, switched.name, switched.model]).toEqual(['wrapped', 'wrapped', 'A'])
		switched.use('B')
		expect(switched.model).toBe('B')
		await expect(switched.ask(request, new AbortController().signal)).resolves.toEqual({
			model: 'inner',
			answers: {},
		})
		expect(switched.model).toBe('B')
		switched.use('A')
		expect(switched.model).toBe('A')
		expect(inner.model).toBe('wrapped')
		expect(asked.calls).toEqual([['first']])
		expect(new SwitchableJudge(inner).model).toBe('wrapped')
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
			category: buildCategoryAnswer({ rule: 1 }),
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
		).toEqual(buildCategoryAnswer({ correction: 1 }))
		expect(
			(await judge.ask({ ...request, state: 'Delivery date.' }, new AbortController().signal))
				.answers.category,
		).toEqual(buildCategoryAnswer({ fact: 1 }))
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
		expect(await collectLedgerMarkers(200)).toEqual(LEDGER_RECORD_MARKERS)
		expect(await collectLedgerMarkers(59)).toEqual(LEDGER_RECORD_MARKERS.slice(4))
	})
	it('returns an amended desk result and its actual recorded prompts', async () => {
		const served = await serveAmendedDesk()
		expect(served.result.passes).toHaveLength(2)
		expect(served.result.content).toBe('Use code AA-12.')
		expect(served.prompts).toHaveLength(4)
		expect(extractLedgerRecords(served.prompts[0] ?? [])).toContain(
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
		const withThinking = [
			{ id: 'a', role: 'assistant', content: '', thinking: 'first' },
			{ id: 'b', role: 'user', content: 'next' },
			{ id: 'c', role: 'assistant', content: '', thinking: '' },
		] as const
		expect(collectMessageThinking(withThinking)).toEqual(['first', ''])
		expect(collectMessageThinking([])).toEqual([])
		expect(withThinking[0].thinking).toBe('first')
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
				content: 'lookup_order {"id":"BW-5512"}: result shown under Records below',
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

	it('seedLookupAgent records the scope each turn reads, each request, and each denial', async () => {
		const seeded = seedLookupAgent(
			[
				{ content: '', tools: [createToolCall({ id: 'c1', name: 'lookup' })] },
				{ content: '', tools: [createToolCall({ id: 'c2', name: 'missing' })] },
				{ content: 'Done.' },
			],
			{ scope: createScope({ name: 'desk', tools: ['lookup'] }) },
		)

		const result = await seeded.agent.generate({ prompt: { content: 'Check the desk.' } })

		expect(result.content).toBe('Done.')
		expect(seeded.reads.calls).toEqual([[['lookup']], [['lookup']], [['lookup']]])
		expect(seeded.requests.calls.map(([index]) => index)).toEqual([0, 1, 2])
		expect(seeded.provider.calls).toHaveLength(3)
		expect(seeded.executed.calls).toEqual([[{}]])
		expect(seeded.denied.calls.map(([call]) => call.id)).toEqual(['c2'])
	})

	it('createForeignSignal is signal-shaped, inert, and refused by AbortSignal.any', () => {
		const foreign = createForeignSignal()
		expect(foreign.aborted).toBe(false)
		expect(foreign.reason).toBeUndefined()
		expect(foreign instanceof AbortSignal).toBe(false)
		expect('aborted' in foreign).toBe(false)
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

	it('summarizes attempt durations as absent, valid, or invalid and builds matching expectations', () => {
		const key = '["category","m1"]'
		expect(
			summarizeAttempts([
				{ key, phase: 'category', outcome: 'cached' },
				{ key, phase: 'category', outcome: 'resolved', duration: 0 },
				{ key, phase: 'category', outcome: 'failed', duration: 2.5 },
				{ key, phase: 'category', outcome: 'aborted', duration: -1 },
				{ key, phase: 'category', outcome: 'aborted', duration: Number.NaN },
				{ key, phase: 'category', outcome: 'aborted', duration: Number.POSITIVE_INFINITY },
			]).map((summary) => summary.duration),
		).toEqual(['absent', 'valid', 'valid', 'invalid', 'invalid', 'invalid'])
		expect(buildAttemptSummaries([['topic', key]], 'skipped')).toEqual([
			{ key, phase: 'topic', outcome: 'skipped', duration: 'absent' },
		])
		const resolved = buildAttemptSummaries(CLASSIFIER_PINNED_ASKS, 'resolved')
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

	it('buildCorrectionSeed ends in a correction', () => {
		const seed = buildCorrectionSeed(3)
		expect(seed).toHaveLength(4)
		expect(new Set(seed.map((message) => message.content)).size).toBe(4)
		expect(seed.every((message) => message.role === 'user')).toBe(true)
		expect(
			seed.every(
				(message) => message.content.includes('BW-20931') && message.content.includes('refund'),
			),
		).toBe(true)
		expect(seed.slice(0, -1).some((message) => message.content.includes('Correction'))).toBe(false)
		expect(seed.at(-1)?.content.startsWith('Correction:')).toBe(true)
		expect(buildCorrectionSeed(0)).toEqual([requireValue(seed.at(-1))])
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
		const authorize = admitsRelayCredential
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

	it('passes system and tools to the handler', async () => {
		const upstream = createScriptedProvider([{ content: 'admitted' }], { recorded: true })
		const lookup = {
			name: 'lookup',
			description: 'Finds a parcel by its tracking id',
			parameters: { type: 'object', required: ['id'] },
		}
		const turns: readonly Message[] = [{ id: 'u1', role: 'user', content: 'Where is BW-5512?' }]
		const hop = createRelayHop({
			provider: upstream,
			system: { text: 'Answer for the shipping desk.' },
			tools: { definitions: [{ ...lookup, title: 'Parcel lookup' }] },
		})
		expect(await hop.generate(turns, new AbortController().signal, [lookup])).toEqual({
			content: 'admitted',
		})
		const call = requireValue(upstream.calls[0])
		expect(call.messages[0]).toMatchObject({
			role: 'system',
			content: 'Answer for the shipping desk.',
		})
		expect(call.messages.slice(1)).toEqual(turns)
		expect(call.tools).toEqual([lookup])
		const refusal = createRelayHop({ provider: upstream })
		await expect(
			refusal.generate(
				[{ id: 's1', role: 'system', content: 'Answer in French.' }, ...turns],
				new AbortController().signal,
			),
		).rejects.toMatchObject({ code: 'HTTP', status: REFUSED_RELAY_STATUS })
		expect(upstream.started).toBe(1)
	})
})

describe('relay policy cases', () => {
	it('labels each relay policy case once', () => {
		const labels = [...RELAY_SYSTEM_CASES, ...RELAY_TOOL_CASES].map((row) => row.label)
		expect(new Set(labels).size).toBe(labels.length)
		const system = RELAY_SYSTEM_CASES.map((row) => {
			const heads = row.request.messages.flatMap((message, index) =>
				message.role === 'system' ? [index] : [],
			)
			const first = row.request.messages[0]
			const bare =
				first?.thinking === undefined &&
				first?.calls === undefined &&
				first?.call === undefined &&
				first?.images === undefined
			const column =
				heads.length === 0
					? 'none'
					: heads.length === 1 && heads[0] === 0 && bare
						? 'head'
						: 'other'
			const text = row.system?.text === undefined ? 'no text' : 'text'
			return `${text}, ${row.system?.accept === true ? 'accept' : 'no accept'}, ${column}`
		})
		expect(new Set(system)).toEqual(
			new Set([
				'no text, no accept, none',
				'no text, no accept, head',
				'no text, no accept, other',
				'text, no accept, none',
				'text, no accept, head',
				'text, no accept, other',
				'no text, accept, none',
				'no text, accept, head',
				'no text, accept, other',
				'text, accept, none',
				'text, accept, head',
				'text, accept, other',
			]),
		)
		const tools = RELAY_TOOL_CASES.map((row) => {
			const page = row.request.tools
			const first = page?.[0]
			const declared = row.tools?.definitions?.find((definition) => definition.name === first?.name)
			const column =
				page === undefined
					? 'absent'
					: first === undefined
						? 'empty'
						: page.length > 1
							? page.every((tool) => tool.name === first.name)
								? 'repeat'
								: 'mixed'
							: declared === undefined
								? 'unlisted'
								: declared.description === first.description
									? 'equal'
									: 'differing'
			const listed = row.tools?.definitions === undefined ? 'no definitions' : 'definitions'
			return `${listed}, ${row.tools?.accept === true ? 'accept' : 'no accept'}, ${column}`
		})
		expect(new Set(tools)).toEqual(
			new Set([
				'no definitions, no accept, unlisted',
				'no definitions, no accept, repeat',
				'no definitions, no accept, absent',
				'no definitions, no accept, empty',
				'definitions, no accept, equal',
				'definitions, no accept, differing',
				'definitions, no accept, unlisted',
				'definitions, no accept, repeat',
				'definitions, no accept, absent',
				'definitions, no accept, empty',
				'no definitions, accept, unlisted',
				'no definitions, accept, repeat',
				'no definitions, accept, absent',
				'no definitions, accept, empty',
				'definitions, accept, equal',
				'definitions, accept, differing',
				'definitions, accept, unlisted',
				'definitions, accept, repeat',
				'definitions, accept, absent',
				'definitions, accept, empty',
			]),
		)
		expect(
			[...RELAY_SYSTEM_CASES, ...RELAY_TOOL_CASES].flatMap((row) =>
				providerRequestContract.is(row.request) ? [] : [row.label],
			),
		).toEqual([])
	})
})

describe('ledger snapshot fixtures', () => {
	it('scripts a failing history lookup and lookup-only calls after the snapshot', () => {
		expect(
			LEDGER_REPLAY_FIXTURE.after.flatMap((turn) =>
				(splitTurn(turn).result.tools ?? []).map((call) => call.name),
			),
		).toEqual(['lookup'])
		expect(
			LEDGER_REPLAY_FIXTURE.before.flatMap((turn) =>
				(splitTurn(turn).result.tools ?? []).map((call) => [call.name, call.arguments.id]),
			),
		).toEqual([
			['lookup', 'BW-20931'],
			['lookup', 'FX-111'],
		])
		expect(LEDGER_REPLAY_FIXTURE.history).toHaveLength(2)
	})

	it('builds replay options whose reader files any text under the owner and whose judge records each key', async () => {
		const asked = createRecorder<readonly [key: string]>()
		const options = buildLedgerReplayOptions(asked)
		const lookup = requireValue(options.lookups?.[0])
		expect(LEDGER_REPLAY_FIXTURE.failure).toContain('BW-20931')
		expect(lookup.read({ id: 'FX-111' }, LEDGER_REPLAY_FIXTURE.failure)).toEqual({
			ids: ['BW-20931'],
			owners: [{ id: 'BW-20931', names: ['Brightwater Studio'] }],
		})
		const result = await options.judge.ask(
			{
				state: 'user: Refunds above $100 need a manager.',
				questions: { rule: LEDGER_QUESTIONS.category },
			},
			new AbortController().signal,
		)
		expect(result.answers.rule).toEqual(buildCategoryAnswer({ rule: 1 }))
		expect(asked.calls).toEqual([['rule']])
		expect(options.gauge).toEqual({ scale: 1, overhead: 0 })
	})

	it('serves the seeded history, reports one request alone, and hydrates a replay ledger', async () => {
		const replay = await serveLedgerHistory()
		const served = replay.ledger.conversation.messages()
		expect(
			served.slice(0, LEDGER_REPLAY_FIXTURE.seed.length).map((message) => message.content),
		).toEqual(LEDGER_REPLAY_FIXTURE.seed.map((message) => message.content))
		const snapshot = replay.ledger.snapshot()
		const selected = replay.selections.count
		const asked = replay.asked.count
		const result = await serveLedgerReplay(replay, LEDGER_REPLAY_FIXTURE.request)
		expect(result.selections).toHaveLength(replay.selections.count - selected)
		expect(result.selections.at(-1)).toBe(replay.selections.calls.at(-1)?.[0])
		expect(result.keys).toHaveLength(replay.asked.count - asked)
		const hydrated = createLedgerReplay(snapshot)
		expect(hydrated.ledger.conversation.messages()).toEqual(served)
		expect(hydrated.ledger.snapshot().gauge).toEqual(snapshot.gauge)
		expect(hydrated.selections.count).toBe(0)
	})

	it('translates message ids by conversation position and leaves unmatched ids alone', () => {
		const from: readonly Message[] = [
			{ id: 'one', role: 'user', content: 'x' },
			{ id: 'two', role: 'user', content: 'x' },
			{ id: 'three', role: 'user', content: 'x' },
		]
		const to: readonly Message[] = [
			{ id: 'one', role: 'user', content: 'x' },
			{ id: 'nine', role: 'user', content: 'x' },
		]
		expect(translateLedgerIds({ ids: ['one', 'two', 'three'] }, from, to)).toBe(
			JSON.stringify({ ids: ['one', 'nine', 'three'] }),
		)
	})

	it('holds a seed snapshot whose marks name its messages by role', () => {
		const roles = new Map(
			LEDGER_SNAPSHOT_SEED.conversation.messages.map((message) => [message.id, message.role]),
		)
		expect(isConversationSnapshot(LEDGER_SNAPSHOT_SEED.conversation)).toBe(true)
		expect(LEDGER_SNAPSHOT_SEED.requests.map((id) => roles.get(id))).toEqual(['user'])
		expect(LEDGER_SNAPSHOT_SEED.notes.map((id) => roles.get(id))).toEqual(['user'])
		expect(LEDGER_SNAPSHOT_SEED.failures.map((id) => roles.get(id))).toEqual(['tool'])
	})

	it('builds typed refusals and hostile cases under unique titles', () => {
		const refusals = buildLedgerSnapshotRefusals()
		const cases = createInvalidLedgerSnapshotCases()
		expect(new Set(cases.map(([title]) => title)).size).toBe(cases.length)
		expect(cases.slice(0, refusals.length).map(([title]) => title)).toEqual(
			refusals.map(([title]) => title),
		)
		expect(refusals.map(([, snapshot]) => snapshot)).not.toContainEqual(LEDGER_SNAPSHOT_SEED)
		const hostile = new Map(cases)
		expect(() => JSON.stringify(hostile.get('a throwing getter'))).toThrow(TypeError)
		expect(() => JSON.stringify(hostile.get('a revoked proxy'))).toThrow(TypeError)
	})
})

describe('malformed conversation cases', () => {
	it('builds cases a structural read refuses', () => {
		const cases = createMalformedConversationCases()
		const control: readonly [string, unknown] = ['a created conversation', createConversation()]
		const readings = [...cases, control].map(([title, value]) => {
			try {
				return [
					title,
					typeof value === 'object' &&
						value !== null &&
						typeof Reflect.get(value, 'id') === 'string' &&
						typeof Reflect.get(value, 'summarizable') === 'boolean' &&
						['view', 'add', 'compact', 'messages'].every(
							(key) => typeof Reflect.get(value, key) === 'function',
						),
				]
			} catch {
				return [title, false]
			}
		})
		expect(new Set(cases.map(([title]) => title)).size).toBe(cases.length)
		expect(readings).toEqual([...cases.map(([title]) => [title, false]), [control[0], true]])
	})
})

describe('RecoveryProvider', () => {
	it('fails its first call, then replies and records it', async () => {
		const failure = new Error('upstream unavailable')
		const provider = new RecoveryProvider([{ content: 'Booked.' }], failure)
		const request: readonly Message[] = [{ id: 'm1', role: 'user', content: 'Book it.' }]
		const signal = new AbortController().signal
		await expect(provider.generate(request, signal)).rejects.toBe(failure)
		expect(await provider.generate(request, signal)).toEqual({ content: 'Booked.' })
		expect(provider.calls.map((call) => call.messages)).toEqual([request])
	})
})

describe('channel and generation measures', () => {
	it('times pushes and keeps each value', async () => {
		const created = createRecorder<[Channel<number>]>()
		const reading = measureChannelPushes(
			() => {
				const channel = new Channel<number>()
				created.handler(channel)
				return channel
			},
			{ size: 3, rounds: 2 },
		)
		expect(Number.isFinite(reading)).toBe(true)
		expect(reading).toBeGreaterThanOrEqual(0)
		expect(created.count).toBe(2)
		const drained = await Promise.all(created.calls.map(([channel]) => collect(channel.drain())))
		expect(drained).toEqual([
			[0, 1, 2],
			[0, 1, 2],
		])
	})

	it('times the largest push', async () => {
		const created = createRecorder<[Channel<number>]>()
		const reading = measureLargestPush(() => {
			const channel = new Channel<number>()
			created.handler(channel)
			return channel
		}, 3)
		expect(Number.isFinite(reading)).toBe(true)
		expect(reading).toBeGreaterThanOrEqual(0)
		const [channel] = requireValue(created.calls[0])
		expect(created.count).toBe(1)
		expect(await collect(channel.drain())).toEqual([0, 1, 2])
	})

	it('times a paced drain to the end', async () => {
		const created = createRecorder<[Channel<number>]>()
		const reading = await measurePacedDrain(
			() => {
				const channel = new Channel<number>()
				created.handler(channel)
				return channel
			},
			{ size: 3, rounds: 1 },
		)
		expect(Number.isFinite(reading)).toBe(true)
		expect(reading).toBeGreaterThanOrEqual(0)
		const [channel] = requireValue(created.calls[0])
		expect(await collect(channel.drain())).toEqual([])
	})

	it('times a late drain to the end', async () => {
		const created = createRecorder<[Channel<number>]>()
		const reading = await measureLateDrain(
			() => {
				const channel = new Channel<number>()
				created.handler(channel)
				return channel
			},
			{ size: 3, rounds: 1 },
		)
		expect(Number.isFinite(reading)).toBe(true)
		expect(reading).toBeGreaterThanOrEqual(0)
		const [channel] = requireValue(created.calls[0])
		expect(await collect(channel.drain())).toEqual([])
	})

	it('times one generation', async () => {
		const provider = createScriptedProvider(
			[{ result: { content: 'abc' }, deltas: ['a', 'b', 'c'] }],
			{ repeat: false },
		)
		const reading = await measureGeneration(provider)
		expect(Number.isFinite(reading)).toBe(true)
		expect(reading).toBeGreaterThanOrEqual(0)
		expect(provider.started).toBe(1)
	})

	it('times a cell of each workload', async () => {
		const readings = await Promise.all([
			measureChannelCell({
				title: 'pushes',
				workload: 'pushes',
				size: 3,
				rounds: 1,
				warmups: 0,
				samples: 1,
			}),
			measureChannelCell({
				title: 'paces',
				workload: 'paces',
				size: 3,
				rounds: 1,
				warmups: 0,
				samples: 1,
			}),
			measureChannelCell({
				title: 'drains',
				workload: 'drains',
				size: 3,
				rounds: 1,
				warmups: 0,
				samples: 1,
			}),
			measureChannelCell({
				title: 'largest',
				workload: 'largest',
				size: 3,
				rounds: 1,
				warmups: 0,
				samples: 1,
			}),
			measureChannelCell({
				title: 'generates',
				workload: 'generates',
				size: 3,
				rounds: 1,
				warmups: 0,
				samples: 1,
			}),
		])
		expect(readings).toHaveLength(5)
		expect(readings.every((reading) => Number.isFinite(reading) && reading >= 0)).toBe(true)
	})
})

describe('ledger bench builders', () => {
	it('builds a block of eight messages whose odd correction-arm block corrects the previous refund', () => {
		const corrected = buildLedgerBlock(1, 'correction')
		expect(corrected.map((message) => message.role)).toEqual([
			'user',
			'user',
			'user',
			'user',
			'assistant',
			'tool',
			'assistant',
			'user',
		])
		expect(corrected[2]?.content).toBe(
			'[Source 1-c] Correction: the refund for OR-1000 is $1.75, not $0.50.',
		)
		expect(buildLedgerBlock(1, 'control')[2]?.content).toBe('[Source 1-c] Order OR-1001 is packed.')
		expect(buildLedgerBlock(0, 'correction')[2]?.content).toBe(
			'[Source 0-c] Order OR-1000 is packed.',
		)
		expect(corrected[4]?.calls).toEqual([
			{ id: 'call-1', name: 'lookup', arguments: { id: 'OR-1001' } },
		])
	})

	it('builds a prefix two messages short of its length, marking each block request and weighting only the correction arm', () => {
		const prefix = buildLedgerPrefix(21, 'correction')
		const history = prefix.snapshot.conversation.messages
		const contents = new Map(history.map((message) => [message.id, message.content]))
		expect(history).toHaveLength(19)
		expect(prefix.snapshot.requests.map((id) => contents.get(id))).toEqual([
			'What is the status of OR-1000?',
			'What is the status of OR-1001?',
		])
		expect([...prefix.corrections].map((id) => contents.get(id))).toEqual([
			'[Source 1-c] Correction: the refund for OR-1000 is $1.75, not $0.50.',
		])
		expect(history.at(-1)?.content).toBe('[Source F-2] Order OR-1002 note 2.')
		expect(prefix.snapshot.notes).toEqual([])
		expect(prefix.snapshot.failures).toEqual([])
		expect(buildLedgerPrefix(21, 'control').corrections).toEqual(new Set())
	})

	it('answers each filing key from the correction ids and the pair answers', () => {
		const corrections = new Set(['a'])
		const pairs = { amends: 0.25, supersedes: 0.75 }
		expect(answerLedgerKey('["category","a"]', corrections, pairs)).toEqual(
			buildCategoryAnswer({ correction: 1 }),
		)
		expect(answerLedgerKey('["category","b"]', corrections, pairs)).toEqual(
			buildCategoryAnswer({ fact: 1 }),
		)
		expect(answerLedgerKey('["topic","b","orders"]', corrections, pairs)).toEqual({
			form: 'noul',
			noul: 1,
		})
		expect(answerLedgerKey('["amends","a","b"]', corrections, pairs)).toEqual({
			form: 'noul',
			noul: 0.25,
		})
		expect(answerLedgerKey('["supersedes","a","b"]', corrections, pairs)).toEqual({
			form: 'noul',
			noul: 0.75,
		})
		expect(() => answerLedgerKey('["other"]', corrections, pairs)).toThrow(
			'no ledger phase answers ["other"]',
		)
	})

	it('creates a correction judge that records each key it is asked and reports the bench model', async () => {
		const asked = createRecorder<readonly [key: string]>()
		const judge = createCorrectionJudge(asked, new Set(['a']), { amends: 0, supersedes: 1 })
		const result = await judge.ask(
			{
				state: 'user: Correction.',
				questions: {
					'["category","a"]': LEDGER_QUESTIONS.category,
					'["supersedes","b","a"]': LEDGER_QUESTIONS.supersedes,
				},
			},
			new AbortController().signal,
		)
		expect(judge.model).toBe('bench')
		expect(result).toEqual({
			model: 'bench',
			answers: {
				'["category","a"]': buildCategoryAnswer({ correction: 1 }),
				'["supersedes","b","a"]': { form: 'noul', noul: 1 },
			},
		})
		expect(asked.calls).toEqual([['["category","a"]'], ['["supersedes","b","a"]']])
	})

	it('extracts the order a lookup named, owned by its customer', () => {
		expect(extractLedgerOrder({ id: 'OR-1' })).toEqual({
			ids: ['OR-1'],
			owners: [{ id: 'OR-1', names: ['Customer OR-1'] }],
		})
		expect(extractLedgerOrder({ id: 1 })).toBeUndefined()
		expect(extractLedgerOrder({})).toBeUndefined()
	})

	it('builds bench options whose topics skip requests unless requested', () => {
		const judge = createCorrectionJudge(createRecorder(), new Set(), { amends: 0, supersedes: 0 })
		const requested = buildLedgerBenchOptions(judge, true)
		const timed = buildLedgerBenchOptions(judge, false, buildLedgerPrefix(10, 'control').snapshot)
		expect(requested.topics).toBe(LEDGER_BENCH_DESK.topics)
		expect(timed.topics).toEqual([
			{
				name: 'orders',
				criterion: 'Orders, delivery, refunds, ownership and follow-up obligations',
				requested: false,
			},
		])
		expect(requested.thresholds).toEqual({
			category: 0.7,
			topic: 0.7,
			correction: 0.5,
			amends: 0.7,
			supersedes: 0.7,
		})
		expect('snapshot' in requested).toBe(false)
		expect(timed.snapshot?.conversation.messages).toHaveLength(8)
		const scheduler = createRecordedScheduler()
		expect(requested.agent).toEqual({ limit: 8 })
		expect(buildLedgerBenchOptions(judge, false, undefined, scheduler).agent).toEqual({
			limit: 8,
			scheduler,
		})
		expect(requested.lookups?.[0]?.read({ id: 'OR-1' }, 'No record')).toEqual(
			extractLedgerOrder({ id: 'OR-1' }),
		)
	})

	it('seeds a prefix whose correction arm asks amends and whose control arm asks none', async () => {
		const weighted = await seedLedgerPrefix(18, 'correction')
		const plain = await seedLedgerPrefix(18, 'control')
		for (const seed of [weighted, plain]) {
			expect(seed.snapshot.conversation.messages).toHaveLength(18)
			expect(seed.snapshot.conversation.judgments?.length ?? 0).toBeGreaterThan(0)
			expect(seed.attempts.map((attempt) => attempt.outcome)).toContain('resolved')
			expect(
				seed.attempts.filter(
					(attempt) => attempt.outcome !== 'resolved' && attempt.outcome !== 'cached',
				),
			).toEqual([])
		}
		expect(weighted.corrections).toBe(1)
		expect(plain.corrections).toBe(0)
		expect(weighted.attempts.some((attempt) => attempt.phase === 'amends')).toBe(true)
		expect(plain.attempts.some((attempt) => attempt.phase === 'amends')).toBe(false)
	})

	it('creates a paced ledger whose cached request asks nothing', async () => {
		const seed = await seedLedgerPrefix(18, 'correction')
		const scheduler = createRecordedScheduler()
		const { ledger, asked, selections } = createPacedLedger(
			seed.snapshot,
			[{ content: 'Noted.' }],
			scheduler,
		)
		expect((await ledger.respond('What is the status of OR-1000?')).content).toBe('Noted.')
		expect(asked.count).toBe(0)
		expect(selections.count).toBe(1)
		expect(selections.calls[0]?.[0].fault).toBeUndefined()
	})

	it('renders a value with each message id written as its position', () => {
		const conversation = createConversation()
		const [first, second] = conversation.add([
			{ role: 'user', content: 'One.' },
			{ role: 'user', content: 'Two.' },
		])
		expect(
			renderLedgerPositions(
				{ ids: [requireValue(second).id, requireValue(first).id], other: 'x' },
				conversation.messages(),
			),
		).toBe('{"ids":["#1","#0"],"other":"x"}')
		expect(renderLedgerPositions({ other: 'x' }, [])).toBe('{"other":"x"}')
	})
})

describe('ledger text shapes', () => {
	it('keeps uniform blocks and generates the declared long tail and concentrated paste', () => {
		for (const arm of ['control', 'correction'] as const) {
			const uniform = buildLedgerPrefix(290, arm).snapshot.conversation.messages
			const real = buildLedgerPrefix(290, arm, 'real').snapshot.conversation.messages
			const paste = buildLedgerPrefix(290, arm, 'paste').snapshot.conversation.messages
			const text = measureLedgerText(real)
			expect(text.count).toBe(288)
			expect(text.median).toBeGreaterThanOrEqual(513)
			expect(text.median).toBeLessThanOrEqual(627)
			expect(text.p95).toBeGreaterThanOrEqual(4500)
			expect(text.p95).toBeLessThanOrEqual(5500)
			expect(text.maximum).toBeGreaterThanOrEqual(9000)
			expect(text.maximum).toBeLessThanOrEqual(11000)
			expect(measureLedgerText(paste).maximum).toBe(200_000)
			expect(paste[0]?.role).toBe('user')
			expect(paste.slice(1).map((message) => message.content)).toEqual(
				uniform.slice(1).map((message) => message.content),
			)
			expect(real.map((message) => message.role)).toEqual(uniform.map((message) => message.role))
		}
		expect(measureLedgerText([])).toEqual({ count: 0, bytes: 0, median: 0, p95: 0, maximum: 0 })
		expect(measureLedgerText([{ role: 'user', content: 'é' }])).toEqual({
			count: 1,
			bytes: 2,
			median: 1,
			p95: 1,
			maximum: 1,
		})
		const message = { role: 'user', content: 'Order OR-1000 is packed.' } as const
		expect(buildLedgerText(message, 0, 288, 'uniform')).toBe(message)
		expect(buildLedgerText(message, 0, 288, 'real').content).toHaveLength(120)
	})

	it('reads the complete seeded population including the short request and answer', async () => {
		const seed = await seedLedgerPrefix(290, 'control', 'real')
		expect(measureLedgerText(seed.snapshot.conversation.messages)).toEqual({
			count: 290,
			bytes: 489714,
			median: 565,
			p95: 5000,
			maximum: 10000,
		})
	})

	it('refuses unknown shapes and admits recall while keeping legacy cells valid', () => {
		const cell = { arm: 'control', size: 290, count: 3, task: 'time' }
		expect(isLedgerCell(cell)).toBe(true)
		for (const shape of ['uniform', 'real', 'paste'])
			expect(isLedgerCell({ ...cell, shape, task: 'recall' })).toBe(true)
		expect(isLedgerCell({ ...cell, shape: 'unknown' })).toBe(false)
		expect(isLedgerCell({ ...cell, task: 'unknown' })).toBe(false)
	})

	it('rejects a real seed sample when one stored answer is removed', async () => {
		const seed = await seedLedgerPrefix(18, 'control', 'real')
		const sample = await takeLedgerSample(seed.snapshot)
		expect(checkLedgerSample(sample)).toBe(sample)
		const judgments = requireValue(seed.snapshot.conversation.judgments)
		expect(judgments.length).toBeGreaterThan(0)
		const broken = await takeLedgerSample(
			{
				...seed.snapshot,
				conversation: { ...seed.snapshot.conversation, judgments: judgments.slice(1) },
			},
			undefined,
			undefined,
			'time',
			createCorrectionJudge(createRecorder(), new Set(), { amends: 0, supersedes: 0 }),
		)
		expect(broken.asked).toBeGreaterThan(0)
		expect(() => checkLedgerSample(broken)).toThrow('the ledger bench sample broke an invariant')
	})
})

describe('buildJudgmentRecords', () => {
	it('builds distinct unfrozen amends records over adjacent messages that a store accepts', () => {
		const records = buildJudgmentRecords(3)
		expect(records).toHaveLength(3)
		expect(records.map((record) => record.id)).toEqual([
			'["amends","m0","m1"]',
			'["amends","m1","m2"]',
			'["amends","m2","m3"]',
		])
		expect(new Set(buildJudgmentRecords(500).map((record) => record.id)).size).toBe(500)
		expect(records[2]).toEqual({
			id: '["amends","m2","m3"]',
			question: LEDGER_QUESTIONS.amends,
			sources: ['m2', 'm3'],
			state:
				'Earlier message: user: [Source 2] Order OR-1002 for Customer OR-1002 ships on day 2.\nLater message: user: [Source 3] Order OR-1003 for Customer OR-1003 ships on day 3.',
			model: 'recording-model',
			answer: { form: 'noul', noul: 0 },
			time: 2,
		})
		expect(records.every((record) => requireJudgment(record) === record)).toBe(true)
		expect(records.some((record) => Object.isFrozen(record))).toBe(false)
		expect(records.some((record) => Object.isFrozen(record.sources))).toBe(false)
		expect(buildJudgmentRecords(0)).toEqual([])
	})
})

describe('blankSourceText', () => {
	it('blanks a line comment and a string and keeps the length', () => {
		expect(blankSourceText("const a = 'x' // y")).toBe('const a = '.padEnd(18))
		expect(blankSourceText("'it\\'s' + 1")).toBe(' '.repeat(7) + ' + 1')
	})

	it('blanks a block comment and keeps every line break', () => {
		const text = 'a /* x\ny */ b'
		const blank = blankSourceText(text)
		expect(blank).toHaveLength(text.length)
		expect(blank.indexOf('\n')).toBe(text.indexOf('\n'))
		expect(blank.replace(/\s/g, '')).toBe('ab')
	})

	it('blanks a template with its placeholders, nested template included', () => {
		expect(blankSourceText('`a ${x} b`')).toBe(' '.repeat(10))
		expect(blankSourceText('`${`inner`} x`; y')).toBe(' '.repeat(14) + '; y')
		expect(blankSourceText('`${ {a: 1}.a } tail`; y')).toBe(' '.repeat(20) + '; y')
	})

	it('blanks a regular expression literal that holds a quote or a backtick', () => {
		expect(blankSourceText("x = /['`]/g; y")).toBe('x = ' + ' '.repeat(7) + '; y')
		expect(blankSourceText('a / b / c')).toBe('a / b / c')
	})
})

describe('extractNameWord', () => {
	it('takes the last word of a camel-case, upper-case or prefixed name in lower case', () => {
		expect(
			[
				'ClassifierReading',
				'STUDY_MEMORY_SAMPLING',
				'#closing',
				'_unused',
				'readings',
				'isString',
				'CAPTURE_STAGE_LIMIT',
				'a',
			].map((name) => extractNameWord(name)),
		).toEqual(['reading', 'sampling', 'closing', 'unused', 'readings', 'string', 'limit', 'a'])
	})
})

describe('extractParameters', () => {
	it('lists each named parameter and skips a destructured one and the types inside', () => {
		const text =
			'(a: number, ...rest: string[], { b, c }: Options, cb: (x: number, y: Map<string, number>) => void, d = 1) {}'
		const parameters = extractParameters(text, 0)
		expect(parameters.map((parameter) => parameter.name)).toEqual(['a', 'rest', 'cb', 'd'])
		expect(parameters.every((parameter) => text.startsWith(parameter.name, parameter.index))).toBe(
			true,
		)
	})
})

describe('extractDeclaredNames', () => {
	it('lists the names at each declaration head and none from a local or a call', () => {
		const text = [
			'export interface FrameResult {',
			'\treadonly framing?: boolean',
			'\tstream(options?: Streamer): void',
			'}',
			'export function readFrame(source: string, framing = 1): void {',
			'\tconst local = this.#hidden',
			'}',
			'export class Box {',
			'\treadonly #hidden = 1',
			'\tstatic async fetchOne(path: string): Promise<void> {',
			'\t\tcalling(path)',
			'\t}',
			'}',
		].join('\n')
		expect(extractDeclaredNames(text).map((declared) => declared.name)).toEqual([
			'FrameResult',
			'framing',
			'stream',
			'options',
			'readFrame',
			'source',
			'framing',
			'Box',
			'#hidden',
			'fetchOne',
			'path',
		])
	})
})

describe('scanParticipleNames', () => {
	it('reports an exported interface, type, class, function and const head with its line', () => {
		const text = [
			'export interface FrameReading {}',
			'export type FoldMerging = string',
			'export class Pacing {}',
			'export function readPacing(): void {}',
			'export const SAMPLING = 1',
		].join('\n')
		const found = scanParticipleNames([{ path: 'a.ts', text }], new Set())
		expect(found.map((violation) => [violation.line, violation.name, violation.word])).toEqual([
			[1, 'FrameReading', 'reading'],
			[2, 'FoldMerging', 'merging'],
			[3, 'Pacing', 'pacing'],
			[4, 'readPacing', 'pacing'],
			[5, 'SAMPLING', 'sampling'],
		])
		expect(found.every((violation) => violation.path === 'a.ts')).toBe(true)
	})

	it('reports a readonly member and a plural of an -ing word', () => {
		const text = [
			'export interface Frame {',
			'\treadonly rolling: boolean',
			'\treadonly closing?: string',
			'\treadonly readings: readonly string[]',
			'}',
		].join('\n')
		expect(
			scanParticipleNames([{ path: 'b.ts', text }], new Set()).map((violation) => [
				violation.line,
				violation.name,
			]),
		).toEqual([
			[2, 'rolling'],
			[3, 'closing'],
			[4, 'readings'],
		])
	})

	it('reports a # field and a # method', () => {
		const text = [
			'export class Box {',
			'\t#closing = false',
			'\treadonly #firing: number',
			'\tasync #pacing(): Promise<void> {',
			'\t}',
			'}',
		].join('\n')
		expect(
			scanParticipleNames([{ path: 'c.ts', text }], new Set()).map((violation) => [
				violation.line,
				violation.name,
			]),
		).toEqual([
			[2, '#closing'],
			[3, '#firing'],
			[4, '#pacing'],
		])
	})

	it('reports a method head and an interface method signature', () => {
		const text = [
			'export class Box {',
			'\tfiring(): void {',
			'\t}',
			'\tstatic async *sampling(input: string) {',
			'\t}',
			'}',
			'export interface Frame {',
			'\tmerging(input: string): string',
			'}',
		].join('\n')
		expect(
			scanParticipleNames([{ path: 'd.ts', text }], new Set()).map((violation) => [
				violation.line,
				violation.name,
			]),
		).toEqual([
			[2, 'firing'],
			[4, 'sampling'],
			[8, 'merging'],
		])
	})

	it('reports a function, a generic function and a method parameter', () => {
		const text = [
			'export function sumUsage(prior: number, running: number): number {',
			'\treturn prior + running',
			'}',
			'function pick<T extends Record<string, unknown>>(value: T, sampling: number): T {',
			'\treturn value',
			'}',
			'export class Box {',
			'\tfold(',
			'\t\tprior: number,',
			'\t\tleading: number,',
			'\t): number {',
			'\t}',
			'}',
		].join('\n')
		expect(
			scanParticipleNames([{ path: 'e.ts', text }], new Set()).map((violation) => [
				violation.line,
				violation.name,
			]),
		).toEqual([
			[1, 'running'],
			[4, 'sampling'],
			[10, 'leading'],
		])
	})

	it('reports no local, call, comment or string and no word the allowed set holds', () => {
		const text = [
			'/** An example: export interface FrameReading {} */',
			"const label = 'readonly rolling: boolean'",
			'export function readFrame(): void {',
			'\tconst closing = 1',
			'\tcalling(closing)',
			'\tthis.#closing = 2',
			'\tif (running) {',
			'\t}',
			'}',
			'export interface Frame {',
			'\treadonly settings: string',
			'\treadonly findings: readonly string[]',
			'\treadonly pending: boolean',
			'}',
		].join('\n')
		const sources = [{ path: 'f.ts', text }]
		expect(scanParticipleNames(sources, new Set(['setting', 'finding', 'pending']))).toEqual([])
		expect(
			scanParticipleNames(sources, new Set(['finding'])).map((violation) => violation.name),
		).toEqual(['settings', 'pending'])
	})

	it('finds no -ing name in src/core or studies outside the kept set', () => {
		const root = resolve('.')
		const sources = ['src/core', 'studies'].flatMap((folder) =>
			readdirSync(join(root, folder), { recursive: true, encoding: 'utf8' })
				.filter((entry) => entry.endsWith('.ts'))
				.map((entry) => ({
					path: join(folder, entry).split(sep).join('/'),
					text: readFileSync(join(root, folder, entry), 'utf8'),
				})),
		)
		expect(sources.length).toBeGreaterThan(0)
		expect(scanParticipleNames(sources, new Set()).length).toBeGreaterThan(0)
		expect(scanParticipleNames(sources, PARTICIPLE_ALLOWED)).toEqual([])
	})
})

describe('refusal fixtures (claims J and O)', () => {
	it('places a case at the depth it names, under the refusal parent, and reads its path', () => {
		const tree = buildRefusalTree({ limit: 0 }, 2)
		const jobs = collectTreeJobs(tree)

		expect(jobs).toHaveLength(3)
		expect(jobs.at(-1)).toEqual({
			provider: 'main',
			messages: JOB_REFUSAL_PARENT.messages,
			limit: 0,
		})
		expect(buildRefusalPath(2)).toBe('job.children[0].children[0]')
		expect(buildRefusalTree({ limit: 0 }, 0)).toEqual(jobs.at(-1))
	})

	it('draws the same trees and bounds from the same seed, reaching every case', () => {
		expect(drawJobTrees(7, 40)).toEqual(drawJobTrees(7, 40))
		expect(drawJobBounds(7, 40)).toEqual(drawJobBounds(7, 40))
		const cases = new Set(drawJobTrees(2411, 300).map((draw) => draw.case))
		expect(JOB_REFUSAL_CASES.filter((row) => !cases.has(row.name))).toEqual([])
	})

	it('builds each undeclared form, own and enumerable exactly where it refuses', () => {
		const readings = UNDECLARED_FORMS.map((form) => {
			const record = form.build({ system: 'Desk.' }, 'shown', 1)
			return [form.name, Object.keys(record).includes('shown'), form.refused]
		})

		expect(readings.filter(([, own, refused]) => own !== refused)).toEqual([])
		expect(readings.some(([, own]) => own)).toBe(true)
	})

	it('omits one member and keeps the rest', () => {
		expect(omitMember({ system: 'Desk.', limit: 4 }, 'limit')).toEqual({ system: 'Desk.' })
	})

	it('reads a structure refusal as refused and any other error as not', () => {
		expect(readStructureRefusal(new Error('boom')).refused).toBe(false)
	})
})

describe('record input fixtures (claims F-R1, F-R5, and F-R6)', () => {
	it('refuses each declared member spelled undefined, each required member omitted, and one stray, naming each path', () => {
		const rows = buildRecordInputRefusals(RECORD_INPUT_FIXTURES.instruction)

		expect(rows.map((row) => [row.name, row.path])).toEqual([
			['name spelled undefined', ['name']],
			['content spelled undefined', ['content']],
			['priority spelled undefined', ['priority']],
			['override spelled undefined', ['override']],
			['name omitted', ['name']],
			['content omitted', ['content']],
			['an undeclared member', ['stray']],
		])
		expect(Object.hasOwn(rows[2]?.input ?? {}, 'priority')).toBe(true)
		expect(Object.hasOwn(rows[4]?.input ?? {}, 'name')).toBe(false)
	})

	it('draws the same inputs from the same seed, reaching each member form and a stray', () => {
		const first = seededRandom(20261112)
		const second = seededRandom(20261112)
		const drawn = Array.from({ length: 240 }, () =>
			drawRecordInput(RECORD_INPUT_FIXTURES.memo, first),
		)
		const again = Array.from({ length: 240 }, () =>
			drawRecordInput(RECORD_INPUT_FIXTURES.memo, second),
		)
		const forms = drawn.map((input) =>
			!Object.hasOwn(input, 'name')
				? 'absent'
				: input.name === undefined
					? 'undefined'
					: input.name === 7
						? 'other'
						: 'declared',
		)

		expect(again).toStrictEqual(drawn)
		expect(new Set(forms)).toEqual(new Set(['declared', 'absent', 'undefined', 'other']))
		expect(drawn.some((input) => Object.hasOwn(input, 'stray'))).toBe(true)
	})

	it('builds message inputs that hold a role and content but are no plain record', () => {
		const inputs = buildNonPlainMessages()

		expect(
			inputs.map(({ name, input }) => [name, isRecord(input), Reflect.get(input, 'role')]),
		).toEqual([
			['a class instance', false, 'user'],
			['an object that inherits its role', false, 'user'],
		])
		expect(inputs[0]?.input).toBeInstanceOf(MessageInstance)
	})
})

describe('workspace sample fixtures (claims W.1 to W.4)', () => {
	it('charges workspace text at its own rate and every other message at the scale', () => {
		const head = { id: 's', role: 'system', content: 'Serve the desk.' } as const
		const shown = {
			id: 'c',
			role: 'user',
			content: `## Workspace

${'r'.repeat(400)}`,
		} as const

		expect(chargeDensityPrompt([head], undefined, LEDGER_DENSE_RATES)).toBe(
			chargeDensityPrompt([head], undefined, LEDGER_DENSITY_RATES),
		)
		expect(chargeDensityPrompt([head, shown], undefined, LEDGER_DENSE_RATES)).toBeGreaterThan(
			2 * chargeDensityPrompt([head, shown], undefined, LEDGER_DENSITY_RATES),
		)
	})

	it('builds a fresh ledger whose active workspace holds the records it is given', () => {
		const none = buildLedgerWorkspaceShape(0, LEDGER_DENSE_RATES)
		const two = buildLedgerWorkspaceShape(2, LEDGER_DENSE_RATES)

		expect(none.ledger.agent.context.workspaces.active).toBeUndefined()
		expect(two.ledger.agent.context.workspaces.active?.files().map((file) => file.path)).toEqual([
			'record-0.md',
			'record-1.md',
		])
		expect(two.ledger.gauge).toBeUndefined()
	})
})

describe('tool caller fixtures', () => {
	it('createInspectTool records the very context it is handed and returns ok', async () => {
		const recorder = createRecorder<[ToolContext]>()
		const tool = createInspectTool(recorder)
		const context = { signal: new AbortController().signal, caller: { subject: 'reader' } }

		expect(tool.name).toBe('inspect')
		expect(await tool.execute({}, context)).toBe('ok')
		expect(recorder.calls).toHaveLength(1)
		expect(recorder.calls[0]?.[0]).toBe(context)
	})

	it('createNoteTool writes the note to the given workspace alone and returns noted', async () => {
		const manager = createWorkspaceManager()
		const north = manager.add({ id: 'north' })
		const south = manager.add({ id: 'south' })
		const tool = createNoteTool(south)

		expect(tool.name).toBe('note')
		expect(await tool.execute({}, { signal: new AbortController().signal })).toBe('noted')
		expect(south.read('note.txt')).toBe(NOTE_TEXT)
		expect(north.has('note.txt')).toBe(false)
	})

	it('collectCallers reads each recorded caller and refuses one the guard refuses', () => {
		const recorder = createRecorder<[ToolContext]>()
		const workspace = createWorkspaceManager().add({ id: 'north' })
		const signal = new AbortController().signal
		const caller = { workspace, files: ['notes.md'] }
		recorder.handler({ signal, caller })
		recorder.handler({ signal })
		recorder.handler({ signal, caller: { subject: 'reader' } })

		const callers = collectCallers(recorder)
		expect(callers).toHaveLength(3)
		expect(callers[0]).toBe(caller)
		expect(callers.slice(1)).toEqual([undefined, undefined])
	})

	it('readRenderedWorkspaces finds each workspace whose marker a message carries, in the given order', () => {
		const rendered = [
			{ id: 'c', role: 'user', content: `## Workspace\n\n${renderWorkspaceMarker('south')}` },
			{ id: 'p', role: 'user', content: 'Where is my order?' },
		] as const

		expect(renderWorkspaceMarker('north')).not.toBe(renderWorkspaceMarker('south'))
		expect(readRenderedWorkspaces(rendered, ['north', 'south'])).toEqual(['south'])
		expect(readRenderedWorkspaces([], ['north', 'south'])).toEqual([])
	})

	it('buildAgentCallerCases names each value once, admits three, and carries values that throw on read', () => {
		const workspace = createWorkspaceManager().add({ id: 'returns' })
		const cases = buildAgentCallerCases(workspace)
		const named = new Map(cases.map((one) => [one.name, Object(one.value)]))

		expect(named.size).toBe(cases.length)
		expect(cases.filter((one) => one.admitted).map((one) => one.name)).toEqual([
			'no workspace and no list',
			'a workspace and an empty list',
			'a workspace and a list',
		])
		expect(() => Reflect.ownKeys(named.get('a revoked proxy'))).toThrow(TypeError)
		expect(() => Reflect.get(named.get('a throwing workspace accessor'), 'workspace')).toThrow(
			'The workspace cannot be read.',
		)
		expect(() => Reflect.get(named.get('a throwing files accessor'), 'files')).toThrow(
			'The files cannot be read.',
		)
	})
})
