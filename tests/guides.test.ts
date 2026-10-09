// The consumer-side guides-parity entry runs `@orkestrel/guide` against this
// repository's own `guides/README.md` manifest. The constants that follow are this
// package's own, as is the executed section that closes the file.

import type {
	AgentEventMap,
	JudgeAnswer,
	JudgeInterface,
	JudgeRequest,
	JudgeResult,
	LedgerLookup,
	LedgerThreshold,
	LedgerTopic,
	Message,
	MessageInput,
	ProviderIncrement,
	ProviderInterface,
	ProviderOptions,
	ProviderParserInterface,
	ProviderRequest,
	ProviderResult,
	ScopeInterface,
	ScreenHandler,
	Selection,
	SelectionHandler,
	ThinkingReplay,
} from '@src/core'
import type { JSONValue } from '@orkestrel/contract'
import { GuideCommand } from '@orkestrel/guide/server'
import { readInventory } from '@orkestrel/test/server'
import { createVitest } from 'vitest/node'

/** Every fence language this package's guides are allowed to use. */
const FENCE_LANGUAGES = Object.freeze(['ts'])
/** The fence language whose blocks count as worked examples. */
const EXAMPLE_LANGUAGE = 'ts'
/** The one guide this package sources, whose tagline the README pitch equals. */
const GUIDE_SPEC = 'guides/agent.md'
/** The package identity that binds its manifest, module map, and README pitch. */
const PACKAGE_NAME = '@orkestrel/agent'
/** Each import specifier this package's own guides may resolve against. */
const MODULES = Object.freeze({ [PACKAGE_NAME]: 'src/core', '@src/core': 'src/core' })
/**
 * Declarations deliberately kept out of the barrel, as `computeSymbolKey` strings.
 *
 * A class that one-class-per-file evicted from its single consumer cannot become a
 * local, so it stays exported without being public. Naming it here is what makes that
 * intentional rather than forgotten, and the assertion that follows it fails when a name
 * here stops being stranded, so the list cannot rot.
 */
const INTERNAL: readonly string[] = Object.freeze([])

await new GuideCommand({
	root: new URL('../', import.meta.url),
	patterns: ['src/**/*.ts', 'tests/**/*.ts', 'guides/*.md', '*.md', 'package.json'],
	modules: MODULES,
	languages: FENCE_LANGUAGES,
	language: EXAMPLE_LANGUAGE,
	reader: readInventory,
	runner: createVitest,
}).execute(async ({ files, report, rows }) => {
	const { isFiniteNumber, isRecord, isString, parseJSON } = await import('@orkestrel/contract')
	const { computeSymbolKey, findMissingSymbols } = await import('@orkestrel/guide')
	const { captureError, requireValue, waitForCondition } = await import('@orkestrel/test')
	const { createAbort } = await import('@orkestrel/abort')
	const { createTool, createToolManager } = await import('@orkestrel/tool')
	const { createMemoryDriver } = await import('@orkestrel/database')
	const { createBudget } = await import('@orkestrel/budget')
	// The relay fence's server half: its router and its adapter are the server application's
	// dependencies, declared here for development so the transcription can run the real hop.
	const { createDispatcher } = await import('@orkestrel/router')
	const { createServer } = await import('@orkestrel/server')
	const barrel = await import('@src/core')
	const {
		AgentJudge,
		AgentProvider,
		Classifier,
		computeReading,
		createAgent,
		createConversation,
		createConversationManager,
		createDatabaseConversationStore,
		createInstructionManager,
		createLedger,
		createMemoryConversationStore,
		createRelay,
		createRelayProvider,
		createScope,
		createSelection,
		createSystemOneJudge,
		DEFAULT_LEDGER_SHARE,
		estimateMessages,
		Gauge,
		isJudgeAbortError,
		isJudgeEntry,
		isJudgeQuestion,
		JudgeAbortError,
		JudgeError,
		LEDGER_NOTES,
		LEDGER_QUESTIONS,
		LEDGER_SCALE_DRIFT,
		MAX_ERROR_BODY_LENGTH,
		NEEDED_CRITERION,
		ProviderAbortError,
		ProviderError,
		providerRequestContract,
		RELAY_CONTENT_TYPE,
		relayFrameContract,
		RelayStream,
		sanitizeToken,
		stripThinking,
		SYSTEM_ONE_PATH,
		SystemOneJudge,
	} = barrel
	const {
		answerNeededRequest,
		createParser,
		createRecordingSelection,
		createScriptedProvider,
		createStockSelectionFixture,
		createStubSummarizer,
		createToolCall,
		JUDGE_ENVELOPE,
		RecordedHeaders,
		RecordedProvider,
		RecordedTransport,
		rejectTransportOnAbort,
		ScriptedJudge,
		SYSTEM_ONE_ERRORS,
		SYSTEM_ONE_JUDGE_REQUEST,
		SYSTEM_ONE_LLAMA,
		SYSTEM_ONE_MICA,
		SYSTEM_ONE_TEV1,
		SYSTEM_ONE_TEV1_REQUEST,
		SYSTEM_ONE_UNREADABLE_ANSWERS,
		TEV1_ANSWERS,
		TEV1_CHOICE,
		TEV1_REQUEST,
		TEV1_SCORE,
	} = await import('./setup.js')
	const { describe, expect, expectTypeOf, it } = await import('vitest')

	// The provider-subclass fence, transcribed. Its classes are declared here rather than in
	// an `it` body because `AgentProvider` is only in scope after the dynamic barrel import.
	class TextFrame implements ProviderParserInterface<string> {
		parse(chunk: string): readonly string[] {
			return [chunk]
		}
		clear(): void {} // Raw text retains no framing state.
	}

	interface TextOptions extends ProviderOptions {
		readonly url: string
	}

	class TextProvider extends AgentProvider<string> {
		readonly name = 'text'
		constructor(options: TextOptions) {
			super({ ...options, path: '/generate' })
		}
		frame(): ProviderParserInterface<string> {
			return new TextFrame()
		}
		body(request: ProviderRequest): object {
			return { messages: request.messages }
		}
		read(record: string): ProviderIncrement {
			return { content: record, thinking: '', tools: [] }
		}
		finish(_parser: ProviderParserInterface<string>): readonly string[] {
			return [] // Raw text retains no records at end of input.
		}
	}
	// The engine-configuration fence declares `createTextProvider` rather than defining it, so the
	// transcription supplies the concrete subclass that factory would return and hands it the
	// fence's option object unchanged. Its wire is raw text, so it reuses the subclass fence's frame.
	class ConfiguredProvider extends AgentProvider<string> {
		readonly name = 'configured'
		frame(): ProviderParserInterface<string> {
			return new TextFrame()
		}
		body(request: ProviderRequest): object {
			return { messages: request.messages }
		}
		read(record: string): ProviderIncrement {
			return { content: record, thinking: '', tools: [] }
		}
		finish(_parser: ProviderParserInterface<string>): readonly string[] {
			return []
		}
	}
	// The judge-wire fence, transcribed and declared here for the same reason: `AgentJudge` is only
	// in scope after the dynamic barrel import.
	// A wire whose server answers one yes/no question per call as { "yes": 0.93 }.
	class YesJudge extends AgentJudge {
		readonly name = 'yes'
		body(request: JudgeRequest): object {
			return { model: this.model, state: request.state, questions: request.questions }
		}
		read(value: unknown, request: JudgeRequest): JudgeResult {
			const [id] = Object.keys(request.questions)
			if (id === undefined || !isRecord(value) || !isFiniteNumber(value.yes)) {
				throw new JudgeError('PROTOCOL', 'judge error: unreadable answer')
			}
			return { model: this.model, answers: { [id]: { form: 'noul', noul: value.yes } } }
		}
	}

	const manifest = parseJSON(requireValue(files['package.json'], 'Missing inventory: package.json'))
	if (!isRecord(manifest)) throw new Error('Invalid package manifest: package.json')

	it('manifest lists at least one guide', () => {
		expect(report.input).toEqual([])
		expect(rows.length).toBeGreaterThan(0)
		expect(rows.map((row) => row.entry.spec)).toContain(GUIDE_SPEC)
	})

	// The example half of the equality case is silent over an empty population: with no
	// title on either side, the comparison has no pair. This pins the population this
	// repository's own guide contributes.
	it('pairs at least one example title across the guide and the source', () => {
		expect(report.examples.titles.filter((finding) => finding.spec === GUIDE_SPEC)).toEqual([])
	})

	it('opens the README with the guide tagline', () => {
		expect(manifest.name).toBe(PACKAGE_NAME)
		expect(report.pitch).toEqual([])
	})

	for (const { entry, guide, source } of rows) {
		describe(`${entry.concept}`, () => {
			it('uses only listed fence languages', () => {
				expect(report.fences.filter((finding) => finding.spec === entry.spec)).toEqual([])
			})

			it('extracts a non-empty documented surface', () => {
				expect(guide.surface().length).toBeGreaterThan(0)
			})

			it('carries a summary for every documented and declared symbol', () => {
				expect(guide.surface().filter((symbol) => symbol.summary === undefined)).toEqual([])
				expect(source.surface().filter((symbol) => symbol.summary === undefined)).toEqual([])
			})

			it('re-exports every direct declaration that is not named internal', () => {
				const stranded = findMissingSymbols(source.exports(), source.surface())
				expect(stranded.filter((key) => !INTERNAL.includes(key))).toEqual([])
			})

			it('names no symbol internal that the barrel already exports', () => {
				const stranded = findMissingSymbols(source.exports(), source.surface())
				expect(INTERNAL.filter((key) => !stranded.includes(key))).toEqual([])
			})

			it('re-exports only direct declarations', () => {
				expect(findMissingSymbols(source.surface(), source.exports())).toEqual([])
			})

			it('documents every barrel export', () => {
				expect(findMissingSymbols(source.surface(), guide.surface())).toEqual([])
			})

			it('documents only barrel exports', () => {
				expect(findMissingSymbols(guide.surface(), source.surface())).toEqual([])
			})

			it('exposes no hidden module-scope declarations', () => {
				expect(source.hidden().map(computeSymbolKey)).toEqual([])
			})

			it('documents a populated method group', () => {
				expect(report.sections.filter((finding) => finding.spec === entry.spec)).toEqual([])
			})

			it('keeps behavioral interfaces and implementing classes in parity', () => {
				expect(report.methods.filter((finding) => finding.spec === entry.spec)).toEqual([])
				expect(report.declarations.filter((finding) => finding.spec === entry.spec)).toEqual([])
			})

			it('keeps every compared summary and example equal to its source', () => {
				expect(report.drift.filter((finding) => finding.spec === entry.spec)).toEqual([])
			})

			it('documents an example for every Surface function', () => {
				expect(report.examples.fences.filter((finding) => finding.spec === entry.spec)).toEqual([])
				expect(report.examples.functions.filter((finding) => finding.spec === entry.spec)).toEqual(
					[],
				)
			})

			it('documents an example for every method', () => {
				expect(report.examples.methods.filter((finding) => finding.spec === entry.spec)).toEqual([])
			})

			it('imports only real exports in every ```ts fence', () => {
				expect(report.imports.filter((finding) => finding.spec === entry.spec)).toEqual([])
			})

			it('resolves every relative link', () => {
				expect(report.links.filter((finding) => finding.spec === entry.spec)).toEqual([])
			})

			it('links only to test files that exist', () => {
				expect(report.tests.filter((finding) => finding.spec === entry.spec)).toEqual([])
			})
		})
	}

	// The EXECUTED half. Every preceding check reads a name — from the guide text or
	// from the barrel — and a name that resolves proves nothing about the sentence
	// beside it, so a fence whose comment claims a value the code contradicts passes
	// all of them. The cases here run the flagship fences and assert the values their
	// comments claim. Change a fence, change the transcription beside it.
	describe('flagship fences', () => {
		const guideText = requireValue(files[GUIDE_SPEC], `Missing file: ${GUIDE_SPEC}`)

		it('enforces the scope dispatch and answer-only behavior the guide states', async () => {
			expect(guideText).toContain('A scoped-out tool is neither described nor callable.')
			expect(guideText).toContain('no tool is advertised in the active scope')
			expect(guideText).toContain('denied: TOOL is not in the active scope')
			expect(guideText).toContain(
				'A scope change through the `context.apply` method applies at each later site that reads the scope.',
			)
			const executed: string[] = []
			const denials: Array<string | undefined> = []
			const tools = createToolManager()
			tools.add(
				['search', 'delete'].map((name) =>
					createTool({
						name,
						execute: () => {
							executed.push(name)
							return name
						},
					}),
				),
			)
			const provider = createScriptedProvider(
				[
					{
						content: '',
						tools: [
							{ id: 'delete', name: 'delete', arguments: {} },
							{ id: 'search', name: 'search', arguments: {} },
						],
					},
					{ content: 'answer', tools: [{ id: 'dropped', name: 'search', arguments: {} }] },
				],
				{ record: true, exhaust: 'throw' },
			)
			const agent = createAgent(provider, {
				tools,
				limit: 2,
				scope: createScope({ name: 'read', tools: ['search'] }),
			})
			agent.emitter.on('deny', (_call, reason) => denials.push(reason))
			agent.emitter.on('tool', () =>
				agent.context.apply(createScope({ name: 'answer', tools: [] })),
			)
			expect(await agent.generate()).toEqual({ content: 'answer', partial: false })
			expect(executed).toEqual(['search'])
			expect(denials).toEqual([
				'delete is not in the active scope',
				'no tool is advertised in the active scope',
			])
			expect(
				provider.calls[1]?.messages
					.filter((message) => message.role === 'tool')
					.map((message) => message.content),
			).toEqual(['denied: delete is not in the active scope', 'search'])
			expect(agent.context.messages.messages().at(-1)).not.toHaveProperty('calls')
		})

		it('applies a scope change to the next turn’s tools and the next run’s prompt (the scope-timing rule)', async () => {
			const tools = createToolManager()
			tools.add(['search', 'delete'].map((name) => createTool({ name, execute: () => name })))
			const provider = createScriptedProvider(
				[
					{ content: '', tools: [{ id: 'search-1', name: 'search', arguments: {} }] },
					{ content: 'Three records are stale.' },
					{ content: 'Deleted.' },
				],
				{ record: true, exhaust: 'throw' },
			)
			const agent = createAgent(provider, {
				tools,
				scope: createScope({ name: 'research', instructions: ['safety'], tools: ['search'] }),
			})
			agent.context.instructions.add([
				{ name: 'safety', content: 'Refuse unsafe requests.' },
				{ name: 'verbose', content: 'Explain every step.' },
			])
			agent.emitter.on('tool', () =>
				agent.context.apply(
					createScope({ name: 'cleanup', instructions: ['verbose'], tools: ['delete'] }),
				),
			)
			agent.context.messages.add({ role: 'user', content: 'Find the stale records.' })
			await agent.generate()
			agent.context.messages.add({ role: 'user', content: 'Delete them.' })
			await agent.generate()

			const systems = provider.calls.map((call) => call.messages[0]?.content)
			const advertised = provider.calls.map((call) => call.tools?.map(({ name }) => name))
			// Turn 1 keeps the system block run entry built and advertises the applied scope's tools;
			// the next run's entry build carries the applied scope's instructions.
			expect(systems).toEqual([
				'## Instructions\n\nRefuse unsafe requests.',
				'## Instructions\n\nRefuse unsafe requests.',
				'## Instructions\n\nExplain every step.',
			])
			expect(advertised).toEqual([['search'], ['delete'], ['delete']])
		})

		it('reaches the same turn’s tools from a turn listener and not its prompt (the scope-timing rule)', async () => {
			const tools = createToolManager()
			tools.add(['search', 'delete'].map((name) => createTool({ name, execute: () => name })))
			const provider = createScriptedProvider([{ content: 'Nothing is stale.' }], {
				record: true,
				exhaust: 'throw',
			})
			const agent = createAgent(provider, { tools })
			agent.context.instructions.add({ name: 'safety', content: 'Refuse unsafe requests.' })
			agent.emitter.on('turn', () =>
				agent.context.apply(createScope({ name: 'research', instructions: [], tools: ['search'] })),
			)
			agent.context.messages.add({ role: 'user', content: 'Find the stale records.' })
			await agent.generate()

			expect(provider.calls[0]?.tools?.map(({ name }) => name)).toEqual(['search'])
			expect(provider.calls[0]?.messages[0]?.content).toBe(
				'## Instructions\n\nRefuse unsafe requests.',
			)
		})

		it('carries the applied scope’s prompt from a compaction rebuild (the scope-timing rule)', async () => {
			const tools = createToolManager()
			tools.add(['search', 'delete'].map((name) => createTool({ name, execute: () => name })))
			const conversations = createConversationManager({
				summarize: createStubSummarizer().summarize,
				keep: 0,
			})
			// An earlier exchange gives the between-turns fold a slice before the run's request.
			conversations.add().add([
				{ role: 'user', content: 'Earlier question.' },
				{ role: 'assistant', content: 'Earlier answer.' },
			])
			const provider = createScriptedProvider(
				[
					{ content: 'x'.repeat(400), tools: [{ id: 'search-1', name: 'search', arguments: {} }] },
					{ content: 'Three records are stale.' },
				],
				{ record: true, exhaust: 'throw' },
			)
			const agent = createAgent(provider, {
				tools,
				conversations,
				window: createBudget({ max: 60, consumer: estimateMessages }),
				scope: createScope({ name: 'research', instructions: ['safety'], tools: ['search'] }),
			})
			agent.context.instructions.add([
				{ name: 'safety', content: 'Refuse unsafe requests.' },
				{ name: 'verbose', content: 'Explain every step.' },
			])
			agent.emitter.on('tool', () =>
				agent.context.apply(
					createScope({ name: 'cleanup', instructions: ['verbose'], tools: ['delete'] }),
				),
			)
			agent.context.messages.add({ role: 'user', content: 'Find the stale records.' })
			await agent.generate()

			// The between-turns fold rebuilds the prompt, so turn 1 already reads the applied scope.
			expect(conversations.active?.sections).toHaveLength(1)
			expect(provider.calls.map((call) => call.messages[0]?.content)).toEqual([
				'## Instructions\n\nRefuse unsafe requests.',
				'## Instructions\n\nExplain every step.',
			])
		})

		it('keeps every message under a scope that filters every category (the inclusion sentence)', () => {
			const context = barrel.createAgentContext({
				scope: createScope({ name: 'none', instructions: [], tools: [], files: [] }),
			})
			context.instructions.add({ name: 'safety', content: 'Refuse unsafe requests.' })
			context.messages.add([
				{ role: 'user', content: 'The invoice total is wrong.' },
				{ role: 'assistant', content: 'Which invoice?' },
			])

			expect(context.build().map(({ content }) => content)).toEqual([
				'The invoice total is wrong.',
				'Which invoice?',
			])
			expect(guideText).toContain(
				"The scope's filters never touch messages; message inclusion is the conversation's through compaction and, when a handler is set, the selection's.",
			)
		})

		it('selects through the agent default and a mode’s override as the selection fence claims', async () => {
			const provider = createScriptedProvider(
				[{ content: 'Which line is wrong?' }, { content: 'Refunded.' }],
				{ record: true, exhaust: 'throw' },
			)
			// The agent default keeps the user turns; the focus mode keeps the request alone.
			const userTurns: SelectionHandler = async (conversation) => ({
				messages: conversation.view().filter((message) => message.role === 'user'),
				judgments: [],
			})
			const requestOnly: SelectionHandler = async (_conversation, request) => ({
				messages: [request],
				judgments: [],
			})

			const agent = createAgent(provider, {
				system: 'You triage billing tickets.',
				select: userTurns,
			})
			const receipts: Selection[] = []
			agent.emitter.on('select', (selection) => receipts.push(selection))
			agent.context.messages.add([
				{ role: 'user', content: 'The invoice total is wrong.' },
				{ role: 'assistant', content: 'Which invoice?' },
				{ role: 'user', content: 'Invoice 42.' },
			])
			await agent.generate()

			agent.context.apply(createScope({ name: 'focus', select: requestOnly }))
			agent.context.messages.add({ role: 'user', content: 'Refund it.' })
			await agent.generate()

			expect(provider.calls.map((call) => call.messages.map(({ content }) => content))).toEqual([
				['You triage billing tickets.', 'The invoice total is wrong.', 'Invoice 42.'],
				['You triage billing tickets.', 'Refund it.'],
			])
			expect(receipts.map((selection) => selection.messages.length)).toEqual([2, 1])

			const plain = createAgent(provider)
			const request = plain.context.messages.add({ role: 'user', content: 'Invoice 42.' })
			expect(plain.context.select(request, new AbortController().signal)).toBeUndefined()
		})

		it('carries the selection fence lines the transcription copies', () => {
			expect(guideText).toContain(
				"const agent = createAgent(provider, { system: 'You triage billing tickets.', select: userTurns })",
			)
			expect(guideText).toContain(
				"agent.context.apply(createScope({ name: 'focus', select: requestOnly }))",
			)
			expect(guideText).toContain(
				'receipts.map((selection) => selection.messages.length) // [2, 1]',
			)
			expect(guideText).toContain(
				'plain.context.select(request, new AbortController().signal) // undefined — no handler in either home',
			)
		})

		it('resolves the judgments fence’s question once over a started listener and reuses the record', async () => {
			const posted: unknown[] = []
			const dispatcher = createDispatcher({
				routes: [
					{
						method: 'POST',
						path: SYSTEM_ONE_PATH,
						handler: async (request) => {
							posted.push(JSON.parse(await request.text()))
							return Response.json(SYSTEM_ONE_TEV1)
						},
					},
				],
			})
			const server = createServer({ dispatcher, state: () => undefined, host: '127.0.0.1' })
			const port = await server.start()
			try {
				// The fence declares the signal and names a local Ollama origin; the transcription supplies
				// a live signal and the fixture listener that replays the recorded response.
				const signal = new AbortController().signal
				const judge = createSystemOneJudge({ url: `http://127.0.0.1:${port}`, model: 'tev1:0.8b' })
				const conversation = createConversation()
				const ticket = conversation.add({
					role: 'user',
					content: 'Our checkout has returned 500 errors since 9am. I want a refund for today.',
				})
				const request: JudgeRequest = {
					state: ticket.content,
					questions: {
						refund: {
							form: 'noul',
							instructions: 'Does the customer ask for money back?',
							criteria: {
								true: 'The customer asks for a refund or for money back.',
								false: 'The customer does not ask for money back.',
							},
						},
					},
				}

				const [asked] = await conversation.judgments.resolve(judge, request, [ticket.id], signal)
				expect(asked?.model).toBe('tev1:0.8b')
				expect(asked?.usage).toEqual({ prompt: 975, completion: 4, total: 979 })
				const [reused] = await conversation.judgments.resolve(judge, request, [ticket.id], signal)
				expect(reused?.time).toBe(asked?.time)
				expect(posted).toHaveLength(1)
				expect(conversation.snapshot().judgments).toHaveLength(1)
			} finally {
				await server.stop()
			}
		})

		it('carries the judgments fence lines the transcription copies', () => {
			expect(guideText).toContain(
				'const [asked] = await conversation.judgments.resolve(judge, request, [ticket.id], signal)',
			)
			expect(guideText).toContain("asked?.model // 'tev1:0.8b' — the configured judge")
			expect(guideText).toContain(
				'asked?.usage // { prompt: 975, completion: 4, total: 979 } — the request asked this one question',
			)
			expect(guideText).toContain(
				'reused?.time === asked?.time // true — the matching record answers without a call',
			)
			expect(guideText).toContain('conversation.snapshot().judgments?.length // 1')
		})

		it('drops only the decisive no through the stock selection fence over a started listener', async () => {
			const conversation = createConversation()
			const [standing, , printer, header, last] = conversation.add([
				{ role: 'user', content: 'Use only local files; do not access the internet.' },
				{ role: 'assistant', content: 'The export will read the local SQLite database.' },
				{ role: 'user', content: 'The office printer needs paper.' },
				{ role: 'user', content: 'Include a header row in exports.' },
				{ role: 'user', content: 'Export the active accounts from the local database.' },
			])
			const request = requireValue(last, 'Missing message: request')
			// Each subject's yes probability is a value of the recorded envelope: the refund noul, the
			// billing option, and the middle severity level, read at the transcription's cutoff.
			const probabilities = {
				[requireValue(standing, 'Missing message: standing').id]:
					SYSTEM_ONE_TEV1.answers.refund.noul,
				[requireValue(printer, 'Missing message: printer').id]:
					SYSTEM_ONE_TEV1.answers.label.probabilities.billing,
				[requireValue(header, 'Missing message: header').id]:
					SYSTEM_ONE_TEV1.answers.severity.probabilities['1'],
			}
			const posted: unknown[] = []
			const dispatcher = createDispatcher({
				routes: [
					{
						method: 'POST',
						path: SYSTEM_ONE_PATH,
						handler: async (incoming) => {
							const body: unknown = JSON.parse(await incoming.text())
							posted.push(body)
							return Response.json(answerNeededRequest(body, probabilities))
						},
					},
				],
			})
			const server = createServer({ dispatcher, state: () => undefined, host: '127.0.0.1' })
			const port = await server.start()
			try {
				// The fence declares the cutoff, the limit, and the signal; the transcription supplies them.
				const threshold = 0.95
				const limit = 8
				const signal = new AbortController().signal
				const judge = createSystemOneJudge({ url: `http://127.0.0.1:${port}`, model: 'tev1:0.8b' })
				// The application's cheap pass: only user turns are candidates.
				const screen: ScreenHandler = (source) =>
					source
						.view()
						.filter((message) => message.role === 'user')
						.map((message) => message.id)
				const select = createSelection({
					judge,
					screen,
					needed: { ...NEEDED_CRITERION, threshold },
					limit,
				})

				const selection = await select(conversation, request, signal)
				expect(selection.messages.map((message) => message.content)).toEqual([
					'Use only local files; do not access the internet.',
					'The export will read the local SQLite database.',
					'Include a header row in exports.',
					'Export the active accounts from the local database.',
				])
				expect(selection.judgments).toHaveLength(3)
				expect(selection).not.toHaveProperty('fault')
				expect(posted).toHaveLength(3)
			} finally {
				await server.stop()
			}
		})

		it('keeps the push surface on the Agent, the managers, and each conversation (the observation clause)', () => {
			const conversations = createConversationManager()
			const context = barrel.createAgentContext({ conversations })
			const provider = new TextProvider({ url: 'https://text.test' })

			expect(['emitter' in context, 'emitter' in conversations, 'emitter' in provider]).toEqual([
				false,
				false,
				false,
			])
			expect([
				'emitter' in context.instructions,
				'emitter' in barrel.createScopeManager(),
				'emitter' in requireValue(conversations.active, 'Missing conversation'),
				'emitter' in createAgent(provider),
			]).toEqual([true, true, true, true])
			expectTypeOf<keyof AgentEventMap>().toEqualTypeOf<
				| 'start'
				| 'turn'
				| 'tool'
				| 'usage'
				| 'deny'
				| 'finish'
				| 'error'
				| 'abort'
				| 'exhaust'
				| 'fault'
				| 'select'
			>()
		})

		it('records and reads a judgment as the judgment-recording fence shows', () => {
			const conversation = createConversation()
			const complaint = conversation.add({
				role: 'user',
				content: 'I was charged twice for one order.',
			})

			conversation.judgments.add({
				id: 'refund',
				question: { form: 'noul', instructions: 'Is a refund owed?' },
				answer: { form: 'noul', noul: 0.9 },
				model: 'tev1:0.8b',
				sources: [complaint.id],
				state: complaint.content,
			})

			const refund = requireValue(conversation.judgments.judgment('refund'), 'Missing judgment')
			const recorded = conversation.judgments.judgments()
			const snapshot = conversation.snapshot()
			expect(refund).toMatchObject({ id: 'refund', sources: [complaint.id], model: 'tev1:0.8b' })
			expect(Number.isSafeInteger(refund.time)).toBe(true)
			expect(recorded).toEqual([refund])
			expect(snapshot.judgments).toEqual([refund])
			expect(createConversation({ snapshot }).judgments.judgments()).toEqual([refund])
		})

		it('carries the stock selection fence lines the transcription copies', () => {
			expect(guideText).toContain(
				"declare const threshold: number // the application's cutoff: above 0.5 and at most 1",
			)
			expect(guideText).toContain(
				'const select = createSelection({ judge, screen, needed: { ...NEEDED_CRITERION, threshold }, limit })',
			)
			expect(guideText).toContain('const selection = await select(conversation, request, signal)')
			expect(guideText).toContain(
				'selection.judgments.length // 3 — one recorded judgment per screened subject',
			)
			expect(guideText).toContain(
				'// ] — the judge answered no for the printer note alone; the header row stays uncertain and is kept',
			)
		})

		it('keeps an exchange whole when any member is kept (the stock selection exchange rule)', () => {
			const request: Message = { id: 'request', role: 'user', content: 'Escalate ESC-2219.' }
			const messages: readonly Message[] = [
				{ id: 'earlier', role: 'user', content: 'Tell the depot the pallet ships Friday.' },
				{ id: 'send', role: 'assistant', content: '', calls: [createToolCall({ id: 'reply' })] },
				{ id: 'sent', role: 'tool', content: 'sent', call: 'reply' },
				{ id: 'aside', role: 'user', content: 'The office printer needs paper.' },
				request,
			]
			const kept = barrel.filterSelectionMessages(
				messages,
				[
					{ id: 'earlier', needed: false },
					{ id: 'aside', needed: false },
				],
				request,
			)

			expect(kept.map(({ id }) => id)).toEqual(['earlier', 'send', 'sent', 'request'])
			expect(guideText).toContain(
				'A user message and every message after it up to the next user message form one exchange, which is kept whole when any member is kept and dropped only when every member is dropped',
			)
		})

		it('leaves a failed subject undecided and faults only when every subject fails (the judge error rule)', async () => {
			const signal = new AbortController().signal
			const partial = createStockSelectionFixture(0.9, {
				failure: { at: 2, cause: new Error('judge unavailable') },
			})
			const kept = await partial.select(partial.conversation, partial.request, signal)
			const cause = new Error('judge unavailable')
			const failing = createStockSelectionFixture(0.9, {
				respond: () => {
					throw cause
				},
			})
			const failed = await failing.select(failing.conversation, failing.request, signal)

			expect(kept).not.toHaveProperty('fault')
			expect(kept.messages.map(({ id }) => id)).toContain('acceptance')
			expect(failed.fault?.cause).toBe(cause)
			expect(failed.messages).toEqual(failing.conversation.view())
			expect(failed.judgments).toEqual([])
			expect(guideText).toContain(
				'A judge error for one subject leaves that subject undecided, so it is kept, and the handler asks about the next subject.',
			)
		})

		it('folds neither the newest user message nor half a call group (the compaction boundary rule)', async () => {
			// The interjected user message puts the call and its result in two exchanges.
			const conversation = createConversation({ summarize: createStubSummarizer().summarize })
			conversation.add([
				{ role: 'user', content: 'Is the depot open on Friday?' },
				{ role: 'assistant', content: 'The depot is open on Friday.' },
				{ role: 'user', content: 'Which order is late?' },
				{ role: 'assistant', content: '', calls: [createToolCall({ id: 'order' })] },
				{ role: 'user', content: 'The printer needs paper.' },
				{ role: 'tool', content: 'LH-81660 is late', call: 'order' },
				{ role: 'user', content: 'Who carries it?' },
			])
			const split = await conversation.compact({ keep: 2 })
			const request = createConversation({ summarize: createStubSummarizer().summarize })
			request.add({ role: 'user', content: 'Look up order LH-81660.' })

			expect(split?.messages.map(({ content }) => content)).toEqual([
				'Is the depot open on Friday?',
				'The depot is open on Friday.',
			])
			expect(await request.compact()).toBeUndefined()
			expect(guideText).toContain(
				'A fold never takes the newest user message or any message after it, because that message is the request a run serves.',
			)
		})

		it('folds whole exchanges and a leading greeting only with the first (the compaction exchange rule)', async () => {
			const stub = createStubSummarizer()
			const conversation = createConversation({ summarize: stub.summarize })
			conversation.add([
				{ role: 'assistant', content: 'Enjoy the break.' },
				{ role: 'user', content: 'Work out the refund for order LH-79215.' },
				{ role: 'assistant', content: '', calls: [createToolCall({ id: 'order' })] },
				{ role: 'tool', content: 'Order LH-79215 totals $289.00', call: 'order' },
				{ role: 'assistant', content: 'The refund is $289.00.' },
				{ role: 'user', content: 'Which card is on file?' },
				{ role: 'assistant', content: 'Mastercard ending 7719.' },
				{ role: 'user', content: 'Send the refund to that card.' },
			])
			const inside = await conversation.compact({ keep: 6 })
			const section = await conversation.compact({ keep: 2 })

			expect(inside).toBeUndefined()
			expect(stub.calls).toHaveLength(1)
			expect(section?.messages.map(({ content }) => content)).toEqual([
				'Enjoy the break.',
				'Work out the refund for order LH-79215.',
				'',
				'Order LH-79215 totals $289.00',
				'The refund is $289.00.',
			])
			expect(guideText).toContain(
				'An exchange is a user message and every message after it up to the next user message, and a message before the first user message belongs to the first exchange. A fold removes whole exchanges: a cut inside an exchange moves back to the user message that opens it.',
			)
		})

		it('regenerates the rollup only when the rollup option is true (the compaction fence)', async () => {
			// The fence's summarizer calls a provider; the transcription digests through the stub.
			const silent = createStubSummarizer()
			const plain = createConversation({ summarize: silent.summarize, keep: 2 })
			const counted = createStubSummarizer()
			const rolled = createConversation({ summarize: counted.summarize, keep: 2, rollup: true })
			for (const conversation of [plain, rolled]) {
				conversation.add([
					{ role: 'user', content: 'My name is Ada.' },
					{ role: 'assistant', content: 'Nice to meet you, Ada.' },
					{ role: 'user', content: 'Book a table for two at 19:00.' },
					{ role: 'assistant', content: 'Booked for two at 19:00.' },
					{ role: 'user', content: 'What did I say my name was?' },
				])
			}
			const sections = [await plain.compact(), await rolled.compact()]

			expect(sections.map((section) => section?.messages.length)).toEqual([2, 2])
			expect(rolled.view().map(({ content }) => content)).toEqual([
				`${barrel.CONVERSATION_RECAP_PREFIX}recap of 2`,
				'Book a table for two at 19:00.',
				'Booked for two at 19:00.',
				'What did I say my name was?',
			])
			expect(silent.calls).toHaveLength(1)
			expect(plain.summary).toBeUndefined()
			expect(counted.calls).toHaveLength(2)
			expect(rolled.summary).toBe('recap of 1')
			expect(guideText).toContain(
				'const section = await conversation.compact() // folds the first exchange → a summarized section',
			)
			expect(guideText).toContain(
				'With `rollup: true`, each compaction also regenerates the conversation rollup `summary`, a summary of every section summary, through a further summarizer call. Without it, no summarizer call is spent on a rollup and `summary` keeps its value: `undefined`, or the summary a restored snapshot carried.',
			)
		})

		it('folds nothing after a cancel and folds on the next run (the no-fold-after-cancel bullet)', async () => {
			const stub = createStubSummarizer()
			const conversations = createConversationManager({ summarize: stub.summarize })
			const conversation = conversations.add()
			conversation.add([
				{ role: 'user', content: 'q'.repeat(40) },
				{ role: 'assistant', content: 'Noted.' },
				{ role: 'user', content: 'Send the note.' },
			])
			const tools = createToolManager()
			const agent = createAgent(
				createScriptedProvider(
					[
						{ content: 'x'.repeat(40), tools: [createToolCall({ name: 'reply' })] },
						{ content: 'Done.' },
					],
					{ record: true, exhaust: 'throw' },
				),
				{
					conversations,
					tools,
					window: createBudget({
						max: estimateMessages(conversation.view()) + 1,
						consumer: estimateMessages,
					}),
				},
			)
			tools.add(
				createTool({
					name: 'reply',
					execute: () => {
						agent.abort('replied')
						return 'sent'
					},
				}),
			)
			await agent.generate()
			const folds = stub.calls.length
			agent.context.messages.add({ role: 'user', content: 'Next.' })
			await agent.generate()

			expect(folds).toBe(0)
			expect(conversation.sections[0]?.messages.map(({ role }) => role)).toEqual([
				'user',
				'assistant',
				'user',
				'assistant',
				'tool',
			])
			expect(guideText).toContain(
				"When the run's signal has aborted by the time tool dispatch ends, the loop records the tool messages and folds nothing",
			)
		})

		it('switches modes loaded from plain data as the modes fence claims', async () => {
			const provider = createScriptedProvider(
				[
					{ content: 'Sorted.' },
					{ content: 'Answered.' },
					{ content: 'Brief.' },
					{ content: 'Closed.' },
					{ content: 'Quoted.' },
				],
				{ record: true, exhaust: 'throw' },
			)
			const tools = createToolManager()
			tools.add(createTool({ name: 'lookup', execute: () => 'ticket 7' }))
			const judged = createRecordingSelection()
			const recent = createRecordingSelection()
			// Plain data, as a JSON file holds it; the data names a policy because a file carries no function.
			const MODES: ReadonlyArray<{
				readonly name: string
				readonly description: string
				readonly tools: readonly string[]
				readonly policy: string
			}> = [
				{ name: 'triage', description: 'Sort the ticket.', tools: ['lookup'], policy: 'recent' },
				{ name: 'verbatim', description: 'Quote the thread unchanged.', tools: [], policy: 'none' },
			]
			const POLICIES: Readonly<Record<string, SelectionHandler>> = {
				recent: recent.handler,
				// No selection under the judging default: a pass-through handler returns view().
				none: async (conversation) => ({ messages: conversation.view(), judgments: [] }),
			}
			const modes = new Map<string, ScopeInterface>()
			for (const { policy, ...data } of MODES) {
				const select = POLICIES[policy]
				modes.set(data.name, createScope(select === undefined ? data : { ...data, select }))
			}

			const agent = createAgent(provider, { tools, select: judged.handler })
			// The fence's `ask` helper appends the user turn and runs; the transcription inlines it.
			const triage = modes.get('triage')
			agent.context.apply(triage)
			agent.context.messages.add({ role: 'user', content: 'Sort ticket 7.' })
			await agent.generate()
			expect([recent.calls.length, judged.calls.length]).toEqual([1, 0])
			agent.context.apply(triage?.narrow({ tools: [] }))
			agent.context.messages.add({ role: 'user', content: 'Answer from what you have.' })
			await agent.generate()
			expect([recent.calls.length, judged.calls.length]).toEqual([2, 0])
			agent.context.apply(createScope({ name: 'answer', tools: [] }))
			agent.context.messages.add({ role: 'user', content: 'Answer briefly.' })
			await agent.generate()
			expect([recent.calls.length, judged.calls.length]).toEqual([2, 1])
			agent.context.apply(undefined)
			agent.context.messages.add({ role: 'user', content: 'Close ticket 7.' })
			await agent.generate()
			expect([recent.calls.length, judged.calls.length]).toEqual([2, 2])

			const previous = agent.context.scope
			agent.context.apply(modes.get('verbatim'))
			try {
				agent.context.messages.add({ role: 'user', content: 'Quote the thread.' })
				await agent.generate()
			} finally {
				agent.context.apply(previous)
			}
			expect([recent.calls.length, judged.calls.length]).toEqual([2, 2])
			expect(agent.context.scope).toBeUndefined()
			expect(provider.calls.map((call) => call.tools?.map(({ name }) => name))).toEqual([
				['lookup'],
				undefined,
				undefined,
				['lookup'],
				undefined,
			])
			// The verbatim run's pass-through sends the whole view.
			expect(provider.calls[4]?.messages).toEqual(
				agent.context.conversations.active?.view().slice(0, -1),
			)
		})

		it('carries the modes fence lines the transcription copies', () => {
			expect(guideText).toContain(
				"{ name: 'triage', description: 'Sort the ticket.', tools: ['lookup'], policy: 'recent' },",
			)
			expect(guideText).toContain(
				'none: async (conversation) => ({ messages: conversation.view(), judgments: [] }),',
			)
			expect(guideText).toContain(
				'modes.set(data.name, createScope(select === undefined ? data : { ...data, select }))',
			)
			expect(guideText).toContain(
				"await ask('Sort ticket 7.') // `recent` selects; `lookup` is advertised",
			)
			expect(guideText).toContain(
				"await ask('Answer from what you have.') // `recent` selects; no tool is advertised",
			)
			expect(guideText).toContain("await ask('Answer briefly.') // `judged` selects")
			expect(guideText).toContain("await ask('Close ticket 7.') // `judged` selects")
			expect(guideText).toContain(
				"await ask('Quote the thread.') // the pass-through selects; `judged` is not called",
			)
		})

		it('shares one scope across overlapping runs (the overlapping-runs sentence)', async () => {
			const entered = Promise.withResolvers<void>()
			const release = Promise.withResolvers<void>()
			const tools = createToolManager()
			tools.add(
				createTool({
					name: 'lookup',
					execute: async () => {
						entered.resolve()
						await release.promise
						return 'ticket 7'
					},
				}),
			)
			const provider = createScriptedProvider(
				[
					{ content: '', tools: [{ id: 'lookup-1', name: 'lookup', arguments: {} }] },
					{ content: 'Second run answered.' },
					{ content: 'First run answered.' },
				],
				{ record: true, exhaust: 'throw' },
			)
			const agent = createAgent(provider, { tools })
			agent.context.messages.add({ role: 'user', content: 'Look up ticket 7.' })
			const first = agent.stream()
			await entered.promise
			// The answer mode applied for the second run reaches the first run's next turn as well.
			agent.context.apply(createScope({ name: 'answer', tools: [] }))
			agent.context.messages.add({ role: 'user', content: 'Answer now.' })
			const second = await agent.generate()
			release.resolve()
			const settled = await first.result

			expect(second.content).toBe('Second run answered.')
			expect(settled.content).toBe('First run answered.')
			expect(provider.calls.map((call) => call.tools?.map(({ name }) => name))).toEqual([
				['lookup'],
				undefined,
				undefined,
			])
			expect(guideText).toContain(
				'Overlapping runs on one agent share its scope and its default handler, so an `apply` made for one run reaches every run in flight at its next site.',
			)
		})

		it('answers without tools as the answer-only fence claims', async () => {
			const denials: Array<readonly [string, string | undefined]> = []
			const provider = createScriptedProvider(
				[
					{
						content: 'Refunds need a manager.',
						tools: [{ id: 'refund-1', name: 'refund', arguments: {} }],
					},
				],
				{ record: true, exhaust: 'throw' },
			)
			const tools = createToolManager()
			tools.add(createTool({ name: 'refund', execute: () => 'refunded' }))
			const agent = createAgent(provider, { tools })
			agent.emitter.on('deny', (call, reason) => denials.push([call.name, reason]))
			agent.context.apply(createScope({ name: 'answer', tools: [] }))
			agent.context.messages.add({ role: 'user', content: 'Refund invoice 42.' })
			const result = await agent.generate()

			expect(result).toEqual({ content: 'Refunds need a manager.', partial: false })
			expect(denials).toEqual([['refund', 'no tool is advertised in the active scope']])
			expect(provider.calls[0]?.tools).toBeUndefined()
			expect(guideText).toContain(
				"agent.emitter.on('deny', (call, reason) => log(call.name, reason)) // 'refund', 'no tool is advertised in the active scope'",
			)
			expect(guideText).toContain(
				"const result = await agent.generate() // { content: 'Refunds need a manager.', partial: false }",
			)
		})

		it('reads the select receipt beside the active mode’s description as the judge pattern fence claims', async () => {
			const posted: unknown[] = []
			const probabilities: Record<string, number> = {}
			const dispatcher = createDispatcher({
				routes: [
					{
						method: 'POST',
						path: SYSTEM_ONE_PATH,
						handler: async (incoming) => {
							const body: unknown = JSON.parse(await incoming.text())
							posted.push(body)
							return Response.json(answerNeededRequest(body, probabilities))
						},
					},
				],
			})
			const server = createServer({ dispatcher, state: () => undefined, host: '127.0.0.1' })
			const port = await server.start()
			try {
				const provider = createScriptedProvider([{ content: 'Exported.' }], {
					record: true,
					exhaust: 'throw',
				})
				// The fence declares the cutoff and the limit; the transcription supplies them.
				const threshold = 0.95
				const limit = 8
				const shown: Array<readonly [string | undefined, number, number]> = []
				const judge = createSystemOneJudge({ url: `http://127.0.0.1:${port}`, model: 'tev1:0.8b' })
				const screen: ScreenHandler = (conversation) =>
					conversation
						.view()
						.filter((message) => message.role === 'user')
						.map((message) => message.id)
				const agent = createAgent(provider, {
					select: createSelection({
						judge,
						screen,
						needed: { ...NEEDED_CRITERION, threshold },
						limit,
					}),
				})
				agent.context.apply(
					createScope({ name: 'reply', description: 'Answer from the ticket thread.' }),
				)
				agent.emitter.on('select', (selection) =>
					shown.push([
						agent.context.scope?.description,
						selection.messages.length,
						selection.judgments.length,
					]),
				)
				const receipts: Selection[] = []
				agent.emitter.on('select', (selection) => receipts.push(selection))
				const [standing, printer] = agent.context.messages.add([
					{ role: 'user', content: 'Use only local files; do not access the internet.' },
					{ role: 'user', content: 'The office printer needs paper.' },
					{ role: 'user', content: 'Export the active accounts from the local database.' },
				])
				probabilities[requireValue(standing, 'Missing message: standing').id] =
					SYSTEM_ONE_TEV1.answers.refund.noul
				probabilities[requireValue(printer, 'Missing message: printer').id] =
					SYSTEM_ONE_TEV1.answers.label.probabilities.billing
				const result = await agent.generate()

				expect(shown).toEqual([['Answer from the ticket thread.', 2, 2]])
				// The receipt's keys name records in the active conversation's store, and its usage, the
				// recorded usage once per question, is folded into the run's result beside the provider's.
				const receipt = requireValue(receipts[0], 'Missing receipt')
				const store = requireValue(agent.context.conversations.active, 'Missing conversation')
				expect(receipt.judgments.map((key) => store.judgments.judgment(key)?.id)).toEqual(
					receipt.judgments,
				)
				expect(receipt.usage).toEqual({ prompt: 1950, completion: 8, total: 1958 })
				expect(result.usage).toEqual(receipt.usage)
				expect(provider.calls[0]?.messages.map(({ content }) => content)).toEqual([
					'Use only local files; do not access the internet.',
					'Export the active accounts from the local database.',
				])
				expect(posted).toHaveLength(2)
			} finally {
				await server.stop()
			}
			expect(guideText).toContain(
				"await agent.generate() // show('Answer from the ticket thread.', 2, 2) — the printer note is dropped",
			)
		})

		it('serves two requests and pins the looked-up owner as the ledger pattern fence claims', async () => {
			// The fence declares the cutoffs; the transcription supplies them.
			const thresholds: LedgerThreshold = {
				category: 0.7,
				topic: 0.8,
				amends: 0.8,
				supersedes: 0.8,
				correction: 0.3,
			}
			// The fence claims what the second prompt leaves out, so the provider keeps each prompt it receives.
			const prompts: Array<readonly Message[]> = []
			const replies: ProviderResult[] = [
				{ content: '', usage: { prompt: 160, completion: 0, total: 160 } },
				{ content: '', usage: { prompt: 40, completion: 0, total: 40 } },
				{
					content: '',
					tools: [{ id: 'call-1', name: 'lookup_order', arguments: { id: 'BW-5512' } }],
				},
				{ content: 'Order BW-5512 qualifies for a $148.50 refund.' },
				{ content: 'Yes. Refunds over $100 need a manager.' },
			]
			const provider: ProviderInterface = {
				id: 'scripted',
				name: 'scripted',
				generate: async () => replies.shift() ?? { content: '' },
				async *stream(messages) {
					prompts.push([...messages])
					const reply = replies.shift() ?? { content: '' }
					if (reply.content !== '') yield { channel: 'content', text: reply.content }
					return reply
				},
			}
			const judge: JudgeInterface = {
				id: 'scripted',
				name: 'scripted',
				model: 'scripted',
				ask: async (request) => {
					const answers: Record<string, JudgeAnswer> = {}
					for (const [id, question] of Object.entries(request.questions)) {
						answers[id] =
							question.form === 'choice'
								? { form: 'choice', probabilities: { rule: 0.9, fact: 0.1 } }
								: { form: 'noul', noul: 0.1 }
					}
					return { model: 'scripted', answers }
				},
			}
			const lookup: LedgerLookup = {
				tool: {
					name: 'lookup_order',
					description: 'Read an order by its id.',
					parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
					execute: (args) =>
						`Order ${String(args.id)} for account BW-20931: Brightwater Studio. Refund due $148.50.`,
				},
				read: (args, text) =>
					text.startsWith('No order')
						? undefined
						: {
								ids: [String(args.id)],
								owners: [{ id: 'BW-20931', names: ['Brightwater Studio'] }],
							},
			}
			const system = 'You staff the Larkspur support desk. Today is 2026-10-09.'
			const ledger = createLedger(provider, {
				judge,
				system,
				topics: [{ name: 'refunds', criterion: 'refund amounts and approvals' }],
				questions: LEDGER_QUESTIONS,
				thresholds,
				capacity: 32_768,
				lookups: [lookup],
			})
			const briefings: Array<string | undefined> = []
			ledger.agent.emitter.on('select', (selection) => briefings.push(selection.briefing))
			ledger.conversation.add({ role: 'user', content: 'Refunds over $100 need a manager.' })

			const gauge = await ledger.calibrate(AbortSignal.timeout(30_000))
			const first = await ledger.respond('Can Brightwater Studio get a refund on order BW-5512?')
			const second = await ledger.respond('Does the Brightwater Studio refund need a manager?')

			expect(gauge.fixed).toBe(120)
			expect(first.content).toBe('Order BW-5512 qualifies for a $148.50 refund.')
			expect(first.passes).toHaveLength(1)
			expect(second.content).toBe('Yes. Refunds over $100 need a manager.')
			expect(briefings).toEqual([
				'## Rules\n- Refunds over $100 need a manager.',
				'## Pinned\n### Brightwater Studio (account BW-20931)\n- Order BW-5512 for account BW-20931: Brightwater Studio.\n- Refund due $148.50.\n\n## Rules\n- Refunds over $100 need a manager.',
			])
			expect(replies).toEqual([])
			// The second prompt is the system text and its briefing, the seed tail, and the request: the
			// first request and its reply never reach it.
			expect(prompts).toHaveLength(3)
			expect(
				requireValue(prompts[2], 'Missing prompt').map(({ role, content }) => [role, content]),
			).toEqual([
				['system', `${system}\n\n${briefings[1]}`],
				['user', 'Refunds over $100 need a manager.'],
				['user', 'Does the Brightwater Studio refund need a manager?'],
			])
			expect(guideText).toContain(
				'gauge.fixed // 120 — what advertising the tools adds to a prompt',
			)
			expect(guideText).toContain(
				"first.content // 'Order BW-5512 qualifies for a $148.50 refund.'",
			)
			expect(guideText).toContain("second.content // 'Yes. Refunds over $100 need a manager.'")
			expect(guideText).toContain(
				"briefings[0] // '## Rules\\n- Refunds over $100 need a manager.' — no lookup has named an owner yet",
			)
			expect(guideText).toContain(
				"// '## Pinned\\n### Brightwater Studio (account BW-20931)\\n- Order BW-5512 for account BW-20931: Brightwater Studio.\\n- Refund due $148.50.\\n\\n## Rules\\n- Refunds over $100 need a manager.'",
			)
		})

		// No unit test under `tests/src/core/ledgers` isolates these claims of the ledger section, so
		// each scenario files by phrase: the claim, not a model, decides what the judge answers.
		function createPhraseJudge(
			rules: readonly string[],
			amenders: readonly string[] = [],
		): JudgeInterface {
			return {
				id: 'scripted',
				name: 'scripted',
				model: 'scripted',
				ask: async (request) => {
					const state = isString(request.state) ? request.state : ''
					const answers: Record<string, JudgeAnswer> = {}
					for (const [id, question] of Object.entries(request.questions)) {
						answers[id] =
							question.form === 'choice'
								? {
										form: 'choice',
										probabilities: rules.some((rule) => state.includes(rule))
											? { rule: 1 }
											: state.includes('Correction')
												? { correction: 1 }
												: { fact: 1 },
									}
								: {
										form: 'noul',
										noul:
											(id.startsWith('["topic"') && state.toLowerCase().includes('refund')) ||
											(id.startsWith('["amends"') &&
												amenders.some((amender) => state.includes(amender)))
												? 0.9
												: 0.1,
									}
					}
					return { model: 'scripted', answers }
				},
			}
		}
		const deskThresholds: LedgerThreshold = {
			category: 0.7,
			topic: 0.8,
			amends: 0.8,
			supersedes: 0.8,
			correction: 0.3,
		}
		const refundsTopic: LedgerTopic = { name: 'refunds', criterion: 'refund amounts and approvals' }
		const orderLookup: LedgerLookup = {
			tool: {
				name: 'lookup_order',
				description: 'Read an order by its id.',
				parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
				execute: (args) =>
					`Order ${String(args.id)} for account BW-20931: Brightwater Studio. Refund due $148.50.`,
			},
			read: (args) => ({
				ids: [String(args.id)],
				owners: [{ id: 'BW-20931', names: ['Brightwater Studio'] }],
			}),
		}

		it('asks the amends question about an earlier message that shares only a desk topic, as the filing claims', async () => {
			const fileCorrection = async (topics: readonly LedgerTopic[]) => {
				const conversation = createConversation()
				const earlier = conversation.add({
					role: 'user',
					content: 'Refunds over $100 need a manager.',
				})
				const later = conversation.add({
					role: 'user',
					content: 'Correction: refunds need a manager over $250.',
				})
				const classifier = new Classifier({
					conversation,
					judge: createPhraseJudge(['Refunds over']),
					questions: LEDGER_QUESTIONS,
					topics,
					thresholds: deskThresholds,
					assign: () => undefined,
					entities: () => new Set(),
				})
				const filed = await classifier.classify(new Set(), AbortSignal.timeout(30_000))
				return {
					pairs: filed.judgments.filter(
						(key) => key.startsWith('["amends"') || key.startsWith('["supersedes"'),
					),
					amends: JSON.stringify(['amends', earlier.id, later.id]),
				}
			}

			const shared = await fileCorrection([refundsTopic])
			const unshared = await fileCorrection([])

			// The amends answer of 0.1 stays under its cutoff, so no supersedes question follows.
			expect(shared.pairs).toEqual([shared.amends])
			expect(unshared.pairs).toEqual([])
			expect(guideText).toContain(
				'shares an id, an owner, or a desk topic with it, followed by the `supersedes` question about the same pair when the `amends` answer reaches its cutoff',
			)
		})

		it('fits the tail inside the tail share of the prompt budget less the fixed cost, as the plan claims', async () => {
			const capacity = 600
			const tails = new Map<number, number>()
			for (const fixed of [0, 200]) {
				const provider = createScriptedProvider([{ content: 'Done.' }], { record: true })
				const ledger = createLedger(provider, {
					judge: createPhraseJudge([]),
					system: 'Serve the desk.',
					topics: [refundsTopic],
					questions: LEDGER_QUESTIONS,
					thresholds: deskThresholds,
					capacity,
					gauge: { scale: 1, fixed },
				})
				ledger.conversation.add(
					Array.from({ length: 40 }, (_unused, at): MessageInput => ({
						role: 'user',
						content: `Delivery ${at} arrived Tuesday with a completed receipt.`,
					})),
				)
				await ledger.respond('Review the desk.')
				tails.set(fixed, estimateMessages(requireValue(provider.calls[0]).messages.slice(1)))
			}
			const room = (fixed: number) =>
				(DEFAULT_LEDGER_SHARE.tail * (capacity * DEFAULT_LEDGER_SHARE.prompt - fixed)) /
				(1 + LEDGER_SCALE_DRIFT)
			const exchange = estimateMessages([
				{
					id: 'delivery',
					role: 'user',
					content: 'Delivery 39 arrived Tuesday with a completed receipt.',
				},
			])

			// A tail within one seed exchange of its room shows the room, not the history, ends it.
			for (const [fixed, tail] of tails) {
				expect(tail).toBeLessThanOrEqual(room(fixed))
				expect(tail).toBeGreaterThan(room(fixed) - exchange)
			}
			expect(requireValue(tails.get(0))).toBeGreaterThan(room(200))
			expect(guideText).toContain(
				'the `capacity` option less the `predict` option, times the `prompt` share, less the fixed cost of the gauge and held back by the `LEDGER_SCALE_DRIFT` constant, of which the tail takes at most the `tail` share',
			)
		})

		it('budgets a ledger at W + P with predict P like one at W without thinking (the thinking budget)', async () => {
			const window = 600
			const cap = 400
			const plan = async (capacity: number, predict?: number) => {
				const provider = createScriptedProvider([{ content: 'Done.' }], { record: true })
				const ledger = createLedger(provider, {
					judge: createPhraseJudge([]),
					system: 'Serve the desk.',
					topics: [refundsTopic],
					questions: LEDGER_QUESTIONS,
					thresholds: deskThresholds,
					capacity,
					...(predict === undefined ? {} : { predict }),
					gauge: { scale: 1, fixed: 0 },
				})
				ledger.conversation.add(
					Array.from({ length: 40 }, (_unused, at): MessageInput => ({
						role: 'user',
						content: `Delivery ${at} arrived Tuesday with a completed receipt.`,
					})),
				)
				await ledger.respond('Review the desk.')
				return requireValue(provider.calls[0], 'Missing first call').messages.map(
					({ role, content }) => [role, content],
				)
			}

			// The plan half: the reserved cap leaves the prompt exactly the window's budget, while the
			// same capacity without the cap plans a longer prompt.
			const reserved = await plan(window + cap, cap)
			expect(reserved).toEqual(await plan(window))
			expect((await plan(window + cap)).length).toBeGreaterThan(reserved.length)

			// The gauge half: under replay 'none', a call's thinking leaves the measured use, so the room
			// and the close rule read what a call without thinking leaves at the window.
			const thinking = new Gauge({
				scale: 1.25,
				fixed: 120,
				capacity: 32_768 + 4_096,
				predict: 4_096,
			})
			const plain = new Gauge({ scale: 1.25, fixed: 120, capacity: 32_768 })
			const carried = new Gauge({
				scale: 1.25,
				fixed: 120,
				capacity: 32_768 + 4_096,
				predict: 4_096,
				replay: 'turn',
			})
			const thought = [{ estimate: 400, prompt: 640, completion: 330, thinking: 300, tools: 2 }]
			const bare = [{ estimate: 400, prompt: 640, completion: 30, tools: 2 }]
			expect(thinking.left(thought) - 4_096).toBe(plain.left(bare))
			expect(thinking.room(thought, '')).toBe(plain.room(bare, ''))
			thinking.observe(thought, thought[0])
			plain.observe(bare, bare[0])
			expect(thinking.reserve(thought, '')).toBe(plain.reserve(bare, ''))
			// Under replay 'turn' the next request carries the thinking, so the gauge counts it.
			expect(carried.left(thought) - 4_096).toBe(plain.left(bare) - 300)
			expect(guideText).toContain(
				"With replay `'none'`, a ledger at a `capacity` of `W + P` with a `predict` of `P`, where `W` is a context window and `P` a generation cap, budgets like a ledger at `W` without thinking.",
			)
		})

		it('selects first-pass thinking and always disables answer-pass thinking (the thinking budget)', async () => {
			for (const think of [true, false, undefined]) {
				const provider = createScriptedProvider(
					[{ content: '' }, { content: 'Refunds over $100 need a manager.' }],
					{ record: true },
				)
				const ledger = createLedger(provider, {
					judge: createPhraseJudge([]),
					system: 'Serve the desk.',
					topics: [refundsTopic],
					questions: LEDGER_QUESTIONS,
					thresholds: deskThresholds,
					capacity: 32_768,
					gauge: { scale: 1, fixed: 0 },
					...(think === undefined ? {} : { think }),
				})
				const result = await ledger.respond('Does a $148.50 refund need a manager?')
				expect(result.passes).toHaveLength(2)
				expect(provider.calls.map(({ options }) => options)).toEqual([
					think === undefined ? undefined : { think },
					{ think: false },
				])
			}

			expect(guideText).toContain(
				"The `think` option requests or suppresses thinking for the first pass, and omission leaves the provider's default; the answer pass always runs with thinking off.",
			)
		})

		it('drops off-topic rules, then outside sources, then on-topic rules, then owner lines, as the plan claims', async () => {
			const markers = [
				'Keep the loading dock at warehouse 42 clear.',
				'The Northgate courier brings refund forms on 2026-10-12.',
				'Refunds over $100 need a manager.',
				'Refund due $148.50.',
				'Order BW-5512 for account BW-20931: Brightwater Studio.',
			]
			const brief = async (capacity: number) => {
				const provider = createScriptedProvider([{ content: 'Done.' }], { record: true })
				const ledger = createLedger(provider, {
					judge: createPhraseJudge(['Keep the loading', 'Refunds over']),
					system: 'Serve the desk.',
					topics: [refundsTopic],
					questions: LEDGER_QUESTIONS,
					thresholds: deskThresholds,
					capacity,
					gauge: { scale: 1, fixed: 0 },
					share: { prompt: 1, tail: 0.05 },
					lookups: [orderLookup],
				})
				ledger.conversation.add([
					{ role: 'user', content: 'Keep the loading dock at warehouse 42 clear.' },
					{ role: 'user', content: 'Refunds over $100 need a manager.' },
					{ role: 'user', content: 'The Northgate courier brings refund forms on 2026-10-12.' },
					{
						role: 'assistant',
						content: '',
						calls: [{ id: 'seed', name: 'lookup_order', arguments: { id: 'BW-5512' } }],
					},
					{
						role: 'tool',
						call: 'seed',
						content: 'Order BW-5512 for account BW-20931: Brightwater Studio. Refund due $148.50.',
					},
				])
				await ledger.respond('Does the Brightwater Studio refund need a manager?')
				const system = requireValue(
					provider.calls[0]?.messages[0],
					'Missing system message',
				).content
				return markers.filter((marker) => system.includes(marker))
			}

			// Each capacity sits inside the band where exactly one more step of the order has run.
			expect(await brief(200)).toEqual(markers)
			expect(await brief(95)).toEqual(markers.slice(1))
			expect(await brief(82)).toEqual(markers.slice(2))
			expect(await brief(68)).toEqual(markers.slice(3))
			expect(await brief(59)).toEqual(markers.slice(4))
			expect(guideText).toContain(
				"the ledger drops the rules off the request's topics, then the sources outside the selected records, then the rules on its topics, then the owner lines",
			)
		})

		it("serves an earlier request's lookup result to a later request through recall, as the ledger section claims", async () => {
			const provider = createScriptedProvider(
				[
					{
						content: '',
						tools: [{ id: 'call-1', name: 'lookup_order', arguments: { id: 'BW-5512' } }],
					},
					{ content: 'Done.' },
					{
						content: '',
						tools: [{ id: 'call-2', name: 'recall', arguments: { topic: 'BW-5512' } }],
					},
					{ content: 'Done.' },
				],
				{ record: true },
			)
			const ledger = createLedger(provider, {
				judge: createPhraseJudge([]),
				system: 'Serve the desk.',
				topics: [refundsTopic],
				questions: LEDGER_QUESTIONS,
				thresholds: deskThresholds,
				capacity: 32_768,
				gauge: { scale: 1, fixed: 0 },
				lookups: [orderLookup],
			})
			const result = 'Order BW-5512 for account BW-20931: Brightwater Studio. Refund due $148.50.'

			await ledger.respond('Look up order BW-5512.')
			await ledger.respond('What do you hold on that order?')

			const contents = requireValue(provider.calls[3], 'Missing recall turn').messages.map(
				({ content }) => content,
			)
			expect(contents).not.toContain('Look up order BW-5512.')
			expect(contents).not.toContain(result)
			expect(contents.at(-1)).toBe(`lookup_order {"id":"BW-5512"}: ${result}`)
			expect(guideText).toContain(
				'what its lookups returned reaches a later request through the records and the `recall` tool',
			)
		})

		// A seed rule whose code sentence a later correction amends through the owner they share, a seed
		// assistant statement, and a seed lookup, served to one request that recalls a desk topic and an
		// owner and then ends without text.
		const amendedRule = 'Refunds for Brightwater Studio need a manager. Use code AA-10.'
		const amendedStatement = 'Refund forms go to the Northgate desk.'
		const amendedCorrection = 'Correction: Brightwater Studio uses code AA-12 in place of AA-10.'
		const amendedReading =
			'Order BW-5512 for account BW-20931: Brightwater Studio. Refund due $148.50.'
		async function serveAmendedDesk(): Promise<ReadonlyArray<readonly Message[]>> {
			const provider = createScriptedProvider(
				[
					{ content: '', tools: [{ id: 'desk', name: 'recall', arguments: { topic: 'refunds' } }] },
					{
						content: '',
						tools: [{ id: 'owner', name: 'recall', arguments: { topic: 'Brightwater' } }],
					},
					{ content: '' },
					{ content: 'Use code AA-12.' },
				],
				{ record: true },
			)
			const ledger = createLedger(provider, {
				judge: createPhraseJudge(['Refunds for'], ['uses code AA-12']),
				system: 'Serve the desk.',
				topics: [refundsTopic],
				questions: LEDGER_QUESTIONS,
				thresholds: deskThresholds,
				capacity: 32_768,
				gauge: { scale: 1, fixed: 0 },
				lookups: [orderLookup],
			})
			ledger.conversation.add([
				{
					role: 'assistant',
					content: '',
					calls: [{ id: 'seed', name: 'lookup_order', arguments: { id: 'BW-5512' } }],
				},
				{ role: 'tool', call: 'seed', content: amendedReading },
				{ role: 'user', content: amendedRule },
				{ role: 'assistant', content: amendedStatement },
				{ role: 'user', content: amendedCorrection },
			])
			const result = await ledger.respond('Review the Brightwater Studio refund.')
			expect(result.passes).toHaveLength(2)
			return provider.calls.map(({ messages }) => messages)
		}

		it('drops a stale sentence from the briefing alone and keeps it in recall, the answer note, and the seed tail, as the records claim', async () => {
			const prompts = await serveAmendedDesk()
			const first = requireValue(prompts[0], 'Missing first prompt')

			expect(requireValue(first[0], 'Missing system message').content).toContain(
				'- Refunds for Brightwater Studio need a manager.\n',
			)
			for (const prompt of prompts)
				expect(requireValue(prompt[0], 'Missing system message').content).not.toContain(
					'Use code AA-10.',
				)
			expect(first.map(({ content }) => content)).toContain(amendedRule)
			expect(
				requireValue(prompts[1], 'Missing desk recall').findLast(({ role }) => role === 'tool')
					?.content,
			).toContain(amendedRule)
			expect(
				requireValue(prompts[3], 'Missing answer pass').find(({ content }) =>
					content.startsWith(LEDGER_NOTES.results),
				)?.content,
			).toContain(amendedRule)
			expect(guideText).toContain(
				'the projection lists it in its `stale` member and leaves it out of every record and the briefing. The `recall` tool, the answer note, and the seed tail keep the stored content of each message they carry, stale sentences included.',
			)
		})

		it('lists recall matches newest first with stored content and each amender after its source, as the `recall` tool claims', async () => {
			const prompts = await serveAmendedDesk()

			// The correction is newer than the statement but names no refund, so it follows its source.
			expect(
				requireValue(prompts[1], 'Missing desk recall').findLast(({ role }) => role === 'tool')
					?.content,
			).toBe([amendedStatement, amendedRule, amendedCorrection].join('\n'))
			expect(
				requireValue(prompts[2], 'Missing owner recall').findLast(({ role }) => role === 'tool')
					?.content,
			).toBe(
				[amendedCorrection, amendedRule, `lookup_order {"id":"BW-5512"}: ${amendedReading}`].join(
					'\n',
				),
			)
			expect(guideText).toContain(
				'It lists the earlier messages and lookup readings that match a topic (an owner name, an id, or a desk topic) with their stored content, newest first, each followed by the messages that amend it,',
			)
		})

		it('writes what the pass returned into the answer note without call text, as the answer pass claims', async () => {
			const prompts = await serveAmendedDesk()

			expect(
				requireValue(prompts[3], 'Missing answer pass').find(({ content }) =>
					content.startsWith(LEDGER_NOTES.results),
				)?.content,
			).toBe(
				[
					LEDGER_NOTES.results,
					amendedStatement,
					amendedRule,
					amendedCorrection,
					amendedReading,
				].join('\n'),
			)
			expect(guideText).toContain(
				"the ledger adds an answer note that carries what the pass's lookups and recalls returned, without their call text, then the `cue` note",
			)
		})

		it('cuts a recall listing by whole items, newest first, to the room the gauge leaves, as the `recall` tool claims', async () => {
			const provider = createScriptedProvider(
				[
					{
						content: '',
						tools: [{ id: 'recall', name: 'recall', arguments: { topic: 'refunds' } }],
					},
					{ content: 'Done.' },
				],
				{ record: true },
			)
			const ledger = createLedger(provider, {
				judge: createPhraseJudge([]),
				system: 'Serve the desk.',
				topics: [refundsTopic],
				questions: LEDGER_QUESTIONS,
				thresholds: deskThresholds,
				capacity: 350,
				gauge: { scale: 1, fixed: 0 },
				share: { prompt: 0.2, tail: 0.1 },
			})
			const seeds = Array.from(
				{ length: 20 },
				(_unused, at) => `Refund ${at} reached the Northgate desk with a completed receipt.`,
			)
			ledger.conversation.add(seeds.map((content): MessageInput => ({ role: 'user', content })))
			await ledger.respond('Review the desk.')

			const lines = requireValue(
				requireValue(provider.calls[1], 'Missing recall turn').messages.findLast(
					({ role }) => role === 'tool',
				)?.content,
				'Missing recall result',
			).split('\n')
			const kept = lines.slice(0, -1)
			expect(kept.length).toBeGreaterThan(0)
			expect(kept).toEqual(seeds.slice(-kept.length).reverse())
			expect(lines.at(-1)).toBe(
				`${seeds.length - kept.length} older items not shown; name a narrower topic to narrow the recall`,
			)
			expect(guideText).toContain(
				'and cuts the list by whole items to the room the gauge leaves for the reply, naming how many older items it left out.',
			)
		})

		it('files one rule and prices one request as the classifier and gauge fence claims', async () => {
			// The fence declares the judge, the cutoffs, and the signal; the transcription supplies them.
			const judge: JudgeInterface = {
				id: 'scripted',
				name: 'scripted',
				model: 'scripted',
				ask: async (request) => {
					const answers: Record<string, JudgeAnswer> = {}
					for (const [id, question] of Object.entries(request.questions)) {
						answers[id] =
							question.form === 'choice'
								? { form: 'choice', probabilities: { rule: 0.9, fact: 0.1 } }
								: { form: 'noul', noul: 0.9 }
					}
					return { model: 'scripted', answers }
				},
			}
			const thresholds: LedgerThreshold = {
				category: 0.7,
				topic: 0.8,
				amends: 0.8,
				supersedes: 0.8,
				correction: 0.3,
			}
			const signal = AbortSignal.timeout(30_000)

			const conversation = createConversation()
			const rule = conversation.add({ role: 'user', content: 'Refunds over $100 need a manager.' })
			const classifier = new Classifier({
				conversation,
				judge,
				questions: LEDGER_QUESTIONS,
				topics: [{ name: 'refunds', criterion: 'refund amounts and approvals' }],
				thresholds,
				assign: () => undefined,
				entities: () => new Set(),
			})
			const filed = await classifier.classify(new Set(), signal)

			expect(filed.judgments).toHaveLength(2)
			expect(classifier.category(rule.id)).toBe('rule')
			expect(classifier.decisive(rule.id)).toBe(true)
			expect(classifier.quiet(rule.id)).toBe(false)
			expect(classifier.topics(rule.id)).toEqual(new Set(['refunds']))
			expect(classifier.classification().categories.get(rule.id)).toBe('rule')

			const gauge = new Gauge({ scale: 1.25, fixed: 120, capacity: 32_768 })
			const calls = [{ estimate: 400, prompt: 640, completion: 30, tools: 2 }]
			expect(estimateMessages([rule])).toBe(13)
			expect(gauge.measure([rule])).toBe(136.25)
			expect(gauge.rate(calls)).toBe(1.25)
			expect(gauge.left(calls)).toBe(32_098)
			expect(gauge.reserve(calls, '')).toBe(36.25)
			expect(gauge.room(calls, '')).toBeCloseTo(12_824.7, 9)
			gauge.observe(calls)
			expect(gauge.scale).toBe(1.3)
			// A fence comment that drifts from the value asserted earlier fails here, because each line must appear verbatim.
			for (const line of [
				'filed.judgments.length // 2 — the category question and the refunds topic question',
				"classifier.category(rule.id) // 'rule'",
				'classifier.decisive(rule.id) // true',
				'classifier.quiet(rule.id) // false',
				"classifier.topics(rule.id) // Set { 'refunds' }",
				"classifier.classification().categories.get(rule.id) // 'rule'",
				'gauge.measure([rule]) // 136.25 — the fixed 120 plus 1.25 for each of 13 estimate units',
				'gauge.rate(calls) // 1.25 — the scale, because no two calls with one tool count are observed',
				"gauge.left(calls) // 32098 — the capacity less the last call's prompt and completion",
				"gauge.reserve(calls, '') // 36.25 — an empty reply and one recall call, priced at the rate",
				"gauge.room(calls, '') // 12824.7 — half of what is left beyond the reserve, in estimate units",
				"gauge.scale // 1.3 — the first call's prompt less the fixed cost, over its estimate",
			])
				expect(guideText).toContain(line)
		})

		it('empties the live tail and leaves the compacted sections (the conversation `clear` row)', async () => {
			const conversation = createConversation({ summarize: createStubSummarizer().summarize })
			conversation.add([
				{ role: 'user', content: 'My name is Ada.' },
				{ role: 'assistant', content: 'Nice to meet you, Ada.' },
				{ role: 'user', content: 'What did I say my name was?' },
			])
			await conversation.compact()
			conversation.clear()

			expect(conversation.messages()).toEqual([])
			expect(conversation.sections).toHaveLength(1)
			expect(conversation.view().map(({ content }) => content)).toEqual([
				`${barrel.CONVERSATION_RECAP_PREFIX}recap of 2`,
			])
			expect(guideText).toContain(
				'Empties the live tail, leaving the compacted `sections` untouched.',
			)
		})

		it('folds a reference block written to the active workspace into the next build (the provenance pattern)', () => {
			// The fence passes `summarize: undefined` as a placeholder; the transcription omits the key.
			const conversations = createConversationManager({ rollup: true })
			conversations.add({ id: 'auth' })
			const b = conversations.add({ id: 'planning' })
			// The fence starts from a thread that already holds turns; the transcription seeds them.
			b.add([
				{ role: 'user', content: 'Which database fits the export?' },
				{ role: 'assistant', content: 'We chose Postgres as the database.' },
				{ role: 'user', content: 'Book the venue.' },
			])
			const agent = createAgent(createScriptedProvider([]), { conversations })

			const picked = b.search('database')
			const block = b.reference({ label: 'planning', messages: picked })
			agent.context.workspaces.add().write(`conversation:${b.id}.md`, block)
			const system = requireValue(agent.context.build()[0], 'Missing system message').content

			expect(picked.map(({ content }) => content)).toEqual([
				'Which database fits the export?',
				'We chose Postgres as the database.',
			])
			expect(system).toContain(
				'[Reference — conversation "planning" — NOT part of this conversation]',
			)
			expect(system).toContain('- assistant: We chose Postgres as the database.')
			expect(system).not.toContain('Book the venue.')
		})

		it('renders the switched workspace in the next build as the workspace-switch fence claims', async () => {
			const provider = createScriptedProvider([{ content: 'Port 8123.' }], {
				record: true,
				exhaust: 'throw',
			})
			const agent = createAgent(provider)
			const project = agent.context.workspaces.add()
			project.write('src/config.ts', 'export const PORT = 8123')
			agent.context.messages.add({ role: 'user', content: 'What port is configured?' })
			await agent.generate()
			const other = agent.context.workspaces.add()
			other.write('notes.txt', 'different context')
			agent.context.workspaces.switch(other.id)
			const switched = requireValue(agent.context.build()[0], 'Missing system message').content
			agent.context.apply(createScope({ name: 'cfg', files: ['src/config.ts'] }))

			expect(provider.calls[0]?.messages[0]?.content).toContain('File: src/config.ts')
			expect(switched).toContain('File: notes.txt')
			expect(switched).not.toContain('src/config.ts')
			expect(agent.context.build().map(({ role }) => role)).toEqual(['user', 'assistant'])
			expect(guideText).toContain(
				"A switch between runs changes the files the next run's prompt carries, and `scope.files` then filters the switched workspace's files by path.",
			)
		})

		it('measures the working message array alone against the window (the automatic-compaction clause)', async () => {
			const measured: Array<readonly Message[]> = []
			const tools = createToolManager()
			tools.add(createTool({ name: 'lookup', execute: () => 'ticket 7' }))
			const conversations = createConversationManager({
				summarize: createStubSummarizer().summarize,
			})
			conversations.add()
			const provider = createScriptedProvider(
				[
					{ content: '', tools: [{ id: 'lookup-1', name: 'lookup', arguments: {} }] },
					{ content: 'Ticket 7 is open.' },
				],
				{ record: true, exhaust: 'throw' },
			)
			const agent = createAgent(provider, {
				system: 'You triage tickets.',
				tools,
				conversations,
				window: createBudget({
					max: 1_000_000,
					consumer: (messages: readonly Message[]) => {
						measured.push([...messages])
						return estimateMessages(messages)
					},
				}),
			})
			agent.context.messages.add({ role: 'user', content: 'Look up ticket 7.' })
			await agent.generate({ schema: { type: 'object' } })

			// Each check reads the exact message array the next provider request carries, while the
			// advertised definitions and the schema travel beside it, unmeasured.
			expect(measured).toEqual(provider.calls.map((call) => call.messages))
			expect(provider.calls[0]?.tools?.map(({ name }) => name)).toEqual(['lookup'])
			expect(provider.calls[0]?.options).toEqual({ schema: { type: 'object' } })
		})

		// The replay fence's conversation: an answered request, then a request in a tool turn.
		const replayMessages: readonly Message[] = [
			{ id: '1', role: 'user', content: 'Is order BW-5512 refundable?' },
			{
				id: '2',
				role: 'assistant',
				content: 'Yes, within 30 days.',
				thinking: 'The window is 30 days.',
			},
			{ id: '3', role: 'user', content: 'Refund it.' },
			{
				id: '4',
				role: 'assistant',
				content: '',
				calls: [{ id: 'call-1', name: 'refund_order', arguments: { id: 'BW-5512' } }],
				thinking: 'Refund through the order tool.',
			},
			{ id: '5', role: 'tool', call: 'call-1', content: 'Refunded $148.50.' },
		]
		const keptThinking = (messages: readonly Message[]) =>
			messages.filter((message) => 'thinking' in message).map(({ id }) => id)

		it('keeps only the thinking each policy allows, as the replay fence claims', () => {
			const none = stripThinking(replayMessages, 'none')
			const turn = stripThinking(replayMessages, 'turn')

			expect(none.filter((message) => 'thinking' in message).length).toBe(0)
			expect(keptThinking(turn)).toEqual(['4'])
			expect(keptThinking(replayMessages)).toEqual(['2', '4'])
			for (const line of [
				"content: 'Yes, within 30 days.',",
				"thinking: 'The window is 30 days.',",
				"calls: [{ id: 'call-1', name: 'refund_order', arguments: { id: 'BW-5512' } }],",
				"thinking: 'Refund through the order tool.',",
				"none.filter((message) => 'thinking' in message).length // 0 — no thinking goes back",
				"turn.filter((message) => 'thinking' in message).map(({ id }) => id) // ['4'] — the turn in progress",
			])
				expect(guideText).toContain(line)
		})

		it('records each call’s thinking and sends back what the replay policy keeps at every call and estimate (the replay section)', async () => {
			const run = async (replay: ThinkingReplay | undefined) => {
				const sent: Array<readonly Message[]> = []
				const measured: Array<readonly Message[]> = []
				const replies: ProviderResult[] = [
					{
						content: '',
						thinking: 'Refund through the order tool.',
						tools: [{ id: 'call-1', name: 'refund_order', arguments: { id: 'BW-5512' } }],
					},
					{ content: 'Refunded $148.50.', thinking: 'Report the amount.' },
				]
				const provider: ProviderInterface = {
					id: 'scripted',
					name: 'scripted',
					...(replay === undefined ? {} : { replay }),
					generate: async () => replies.shift() ?? { content: '' },
					async *stream(messages) {
						sent.push([...messages])
						const reply = replies.shift() ?? { content: '' }
						if (reply.content !== '') yield { channel: 'content', text: reply.content }
						return reply
					},
				}
				const tools = createToolManager()
				tools.add(createTool({ name: 'refund_order', execute: () => 'Refunded $148.50.' }))
				const conversations = createConversationManager({
					summarize: createStubSummarizer().summarize,
				})
				conversations.add()
				const agent = createAgent(provider, {
					tools,
					conversations,
					window: createBudget({
						max: 1_000_000,
						consumer: (messages: readonly Message[]) => {
							measured.push([...messages])
							return estimateMessages(messages)
						},
					}),
				})
				agent.context.messages.add([
					{ role: 'user', content: 'Is order BW-5512 refundable?' },
					{
						role: 'assistant',
						content: 'Yes, within 30 days.',
						thinking: 'The window is 30 days.',
					},
					{ role: 'user', content: 'Refund it.' },
				])
				const result = await agent.generate()
				const thinking = (messages: readonly Message[]) =>
					messages.flatMap((message) => (message.thinking === undefined ? [] : [message.thinking]))
				return {
					result,
					recorded: thinking(agent.context.messages.messages()),
					sent: sent.map(thinking),
					measured,
					wire: sent,
				}
			}

			for (const replay of [undefined, 'none', 'turn', 'all'] satisfies ReadonlyArray<
				ThinkingReplay | undefined
			>) {
				const outcome = await run(replay)
				// Every policy records both calls' thinking and joins it into the result.
				expect(outcome.recorded).toEqual([
					'The window is 30 days.',
					'Refund through the order tool.',
					'Report the amount.',
				])
				expect(outcome.result.thinking).toBe('Refund through the order tool.\n\nReport the amount.')
				// The window estimate reads the exact messages each provider call carries.
				expect(outcome.measured).toEqual(outcome.wire)
				// A stripped message drops the member rather than holding it as undefined.
				expect(outcome.wire.flat().filter((message) => 'thinking' in message).length).toBe(
					outcome.sent.flat().length,
				)
				expect(outcome.sent).toEqual(
					replay === 'turn'
						? [[], ['Refund through the order tool.']]
						: replay === 'all'
							? [
									['The window is 30 days.'],
									['The window is 30 days.', 'Refund through the order tool.'],
								]
							: [[], []],
				)
			}
			for (const sentence of [
				"The agent loop records each call's non-empty thinking as the `thinking` member of the assistant message that call appends, on a tool-call turn and on the final answer alike.",
				"`estimateMessages` counts a message's `thinking`, so the `window` budget counts the thinking the request carries and no other.",
				'It is the default. Under it, the agent loop and a relay send the same messages they would send if no thinking were recorded; a ledger still reads recorded thinking to measure what a call left.',
			])
				expect(guideText).toContain(sentence)
		})

		it('reads recorded thinking under none replay to measure what a ledger call left (the replay section)', async () => {
			const recalled: string[] = []
			for (const thinking of [undefined, 'a'.repeat(800)]) {
				const provider = createScriptedProvider(
					[
						{
							content: '',
							...(thinking === undefined ? {} : { thinking }),
							tools: [{ id: 'recall', name: 'recall', arguments: { topic: 'absent' } }],
							usage: { prompt: 2700, completion: 865, total: 3565 },
						},
						{ content: 'Done.' },
					],
					{ record: true, replay: 'none' },
				)
				const ledger = createLedger(provider, {
					judge: createPhraseJudge([]),
					system: 'Serve the desk.',
					topics: [refundsTopic],
					questions: LEDGER_QUESTIONS,
					thresholds: deskThresholds,
					capacity: 4096,
					predict: 1024,
					gauge: { scale: 1, fixed: 0 },
				})
				await ledger.respond('Review.')
				expect(provider.calls).toHaveLength(2)
				expect(
					provider.calls.flatMap((call) => call.messages).some((message) => 'thinking' in message),
				).toBe(false)
				recalled.push(
					requireValue(
						provider.calls[1]?.messages.findLast((message) => message.role === 'tool')?.content,
					),
				)
			}
			expect(recalled).toEqual([
				barrel.LEDGER_NOTES.closed,
				'nothing on "absent"; recall an owner name, an id, or one of refunds',
			])
			expect(guideText).toContain(
				'a ledger still reads recorded thinking to measure what a call left.',
			)
		})

		it('strips a relayed request again by the upstream policy, keeping what both policies keep (the replay section)', async () => {
			const received: Array<readonly Message[]> = []
			// The browser agent has already applied its relay provider's 'turn' policy.
			const request = { messages: stripThinking(replayMessages, 'turn') }
			const upstreams: readonly ThinkingReplay[] = ['all', 'turn', 'none']
			for (const replay of upstreams) {
				const upstream: ProviderInterface = {
					id: 'upstream',
					name: 'upstream',
					replay,
					generate: async () => ({ content: 'Done.' }),
					async *stream(messages) {
						received.push([...messages])
						yield { channel: 'content', text: 'Done.' }
						return { content: 'Done.' }
					},
				}
				const stream = new RelayStream({
					provider: upstream,
					request,
					signal: AbortSignal.timeout(30_000),
				})
				await stream.response.text()
			}

			expect(received.map(keptThinking)).toEqual([['4'], ['4'], []])
			expect(guideText).toContain(
				'so the upstream call carries only the thinking that both policies keep',
			)
		})

		it('answers the instructions fence’s open and per-item rendering', () => {
			const instructions = createInstructionManager()
			const safety = instructions.add({
				name: 'safety',
				content: 'Refuse unsafe requests.',
				priority: 10,
			})

			expect(instructions.open).toBe('## Instructions')
			expect(instructions.render(safety)).toBe('Refuse unsafe requests.')
		})

		it('answers the custom framing fence', () => {
			const instructions = createInstructionManager({
				format: {
					open: '<rules>',
					render: (one) => `<rule>${one.content}</rule>`,
					close: '</rules>',
				},
			})
			const context = barrel.createAgentContext({ instructions })
			context.instructions.add({ name: 'tone', content: 'Be terse.' })
			context.instructions.add({
				name: 'raw',
				content: 'ignored',
				override: '<rule priority="high">Escalate.</rule>',
			})

			expect(context.build().map(({ role, content }) => ({ role, content }))).toStrictEqual([
				{
					role: 'system',
					content:
						'<rules>\n\n<rule>Be terse.</rule>\n\n<rule priority="high">Escalate.</rule>\n\n</rules>',
				},
			])
		})

		it('carries the instructions fence lines the transcription copies', () => {
			expect(guideText).toContain("instructions.open // '## Instructions'")
			expect(guideText).toContain("instructions.render(safety) // 'Refuse unsafe requests.'")
		})

		it('answers the tool-dispatch fence’s two ToolResults', async () => {
			const tools = createToolManager()
			tools.add(
				createTool({
					name: 'add',
					description: 'Add two numbers',
					parameters: {
						type: 'object',
						properties: { a: { type: 'number' }, b: { type: 'number' } },
					},
					execute: (args) => Number(args.a) + Number(args.b),
				}),
			)
			const results = await tools.execute([
				{ id: '1', name: 'add', arguments: { a: 2, b: 3 } },
				{ id: '2', name: 'ghost', arguments: {} },
			])

			expect(results[0]).toEqual({ success: true, id: '1', name: 'add', value: 5 })
			expect(results[1]).toEqual({
				success: false,
				id: '2',
				name: 'ghost',
				error: 'tool not found: ghost',
			})
		})

		it('carries the tool-dispatch fence lines the transcription copies', () => {
			expect(guideText).toContain(
				"{ id: '1', name: 'add', arguments: { a: 2, b: 3 } }, // → { success: true, id: '1', name: 'add', value: 5 }",
			)
			expect(guideText).toContain(
				"{ id: '2', name: 'ghost', arguments: {} }, // → { success: false, id: '2', name: 'ghost', error: 'tool not found: ghost' }",
			)
		})

		it('observes cancellation inside the handler as the tool cancellation fence claims', async () => {
			const provider = createScriptedProvider(
				[{ content: 'working', tools: [{ id: 'wait-1', name: 'wait', arguments: {} }] }],
				{ record: true, exhaust: 'throw' },
			)
			const entered = Promise.withResolvers<void>()
			const cancelled = Promise.withResolvers<boolean>()
			const tools = createToolManager()
			tools.add(
				createTool({
					name: 'wait',
					execute: (_args, context) => {
						context.signal.addEventListener(
							'abort',
							() => {
								cancelled.resolve(context.signal.aborted)
							},
							{ once: true },
						)
						entered.resolve()
						return cancelled.promise
					},
				}),
			)
			const agent = createAgent(provider, { tools })
			const stream = agent.stream()
			try {
				await entered.promise
				agent.abort('request ended')
				expect(await cancelled.promise).toBe(true)
				const result = await stream.result
				expect(result.partial).toBe(true)
				expect(provider.calls).toHaveLength(1)
			} finally {
				cancelled.resolve(false)
				await stream.result
			}
		})

		it('names placement proof locations and carries the cancellation fence lines', () => {
			const integration = requireValue(
				files['tests/src/core/integration.test.ts'],
				'Missing file: tests/src/core/integration.test.ts',
			)
			expect(integration).toContain(
				"it('runs the agent tool loop in Node and feeds the result into the next provider turn',",
			)
			expect(guideText).toContain(
				'runs the agent tool loop in Node and feeds the result into the next provider turn',
			)
			expect(guideText).toContain('`src:core` project')
			expect(guideText).toContain("`@orkestrel/mcp` checkout's `tests/distribution.test.ts`")
			expect(guideText).toContain(
				'planned proof “executes a page tool through an agent without network requests”',
			)
			expect(guideText).toContain(
				'planned proof “executes a page tool through an agent over a Node relay”',
			)
			expect(guideText).toContain('await cancelled.promise // true — observed inside the handler')
			expect(guideText).toContain('result.partial // true')
		})

		it('answers the helper fence’s sanitized token count', () => {
			expect(sanitizeToken(12.7)).toBe(12)
		})

		it('carries the helper fence line the transcription copies', () => {
			expect(guideText).toContain('const tokens = sanitizeToken(12.7) // 12')
		})

		it('answers the snapshot fence’s durable payload keys', () => {
			const conversations = createConversationManager()
			const thread = conversations.add({ id: 'thread-1' })
			const message = thread.add({ role: 'user', content: 'hi' })
			thread.remove(message.id)
			thread.clear()

			// `summary?` and `judgments?` are absent until the first compaction and the first judgment, so
			// an uncompacted, unjudged conversation's snapshot carries `id` / `sections` / `messages` alone.
			expect(Object.keys(thread.snapshot())).toEqual(['id', 'sections', 'messages'])
		})

		it('answers the conversation-store fence with real memory and database stores', async () => {
			const conversation = createConversation()
			conversation.add({ role: 'user', content: 'hello' })
			const snapshot = conversation.snapshot()
			const stores = [
				createMemoryConversationStore(),
				createDatabaseConversationStore(createMemoryDriver()),
			]

			for (const store of stores) {
				await store.set(snapshot)
				expect(await store.get(conversation.id)).toEqual(snapshot)
				await store.delete(conversation.id)
				expect(await store.get(conversation.id)).toBeUndefined()
			}
		})

		it('carries the conversation-store fence lines the transcription copies', () => {
			expect(guideText).toContain('const conversation = createConversation()')
			expect(guideText).toContain('createMemoryConversationStore(),')
			expect(guideText).toContain('createDatabaseConversationStore(createMemoryDriver()),')
			expect(guideText).toContain('await store.set(snapshot)')
			expect(guideText).toContain('const stored = await store.get(conversation.id)')
			expect(guideText).toContain('JSON.stringify(stored) === JSON.stringify(snapshot) // true')
			expect(guideText).toContain('await store.delete(conversation.id)')
			expect(guideText).toContain('await store.get(conversation.id) // undefined')
		})

		it('carries the snapshot fence line the transcription copies', () => {
			expect(guideText).toContain(
				'thread.snapshot() // { id, summary?, sections, messages, judgments? } — the durable payload',
			)
		})

		it('streams and settles a turn through the provider-subclass fence', async () => {
			const bodies: unknown[] = []
			const provider = new TextProvider({
				url: 'https://text.test',
				fetch: async (input, init) => {
					const request = new Request(input, init)
					bodies.push(JSON.parse(await request.text()))
					return new Response('one two')
				},
			})
			const deltas: string[] = []
			const stream = provider.stream(
				[{ id: '1', role: 'user', content: 'Say something.' }],
				new AbortController().signal,
			)
			let step = await stream.next()
			while (!step.done) {
				deltas.push(step.value.text)
				step = await stream.next()
			}

			// The fence's `read` hands every chunk back as content, so the assembled answer is the
			// body verbatim and `finish` contributes nothing.
			expect(deltas).toEqual(['one two'])
			expect(step.value).toEqual({ content: 'one two' })
			expect(bodies).toEqual([{ messages: [{ id: '1', role: 'user', content: 'Say something.' }] }])
			expect(provider.name).toBe('text')
		})

		it('posts the subclass fence’s path onto its url', async () => {
			const urls: string[] = []
			const provider = new TextProvider({
				url: 'https://text.test',
				fetch: (input, init) => {
					urls.push(new Request(input, init).url)
					return Promise.resolve(new Response('ok'))
				},
			})
			await provider.generate([], new AbortController().signal)

			// `super({ ...options, path: '/generate' })` — the fence's path appends to its url.
			expect(urls).toEqual(['https://text.test/generate'])
		})

		it('carries the provider-subclass fence lines the transcription copies', () => {
			expect(guideText).toContain('class TextProvider extends AgentProvider<string> {')
			expect(guideText).toContain("readonly name = 'text'")
			expect(guideText).toContain("super({ ...options, path: '/generate' })")
			expect(guideText).toContain('read(record: string): ProviderIncrement {')
			expect(guideText).toContain("return { content: record, thinking: '', tools: [] }")
		})

		it('answers the engine-configuration fence’s declared switches', async () => {
			const urls: string[] = []
			const sent: Array<string | null> = []
			const hooks: AbortSignal[] = []
			const bounds: Array<AbortSignal | null | undefined> = []
			const caller = new AbortController()
			const provider = new ConfiguredProvider({
				url: 'https://api.example',
				path: '/generate',
				timeout: 30_000,
				headers: async (signal) => {
					hooks.push(signal)
					return { authorization: await Promise.resolve('Bearer fixture') }
				},
				split: true,
				strict: false,
				// The fence omits `fetch` and takes the global transport; the transcription supplies
				// one so the call stays in process.
				fetch: (input, init) => {
					const request = new Request(input, init)
					urls.push(request.url)
					sent.push(request.headers.get('authorization'))
					bounds.push(init?.signal)
					return Promise.resolve(new Response('<think>considering</think>the answer'))
				},
			})
			const result = await provider.generate([], caller.signal)

			// `path: '/generate'` appends to `url` on every call.
			expect(urls).toEqual(['https://api.example/generate'])
			// The `headers` hook is awaited and its value reaches the request.
			expect(sent).toEqual(['Bearer fixture'])
			// "awaited inside that deadline": the hook receives the same bound the transport does,
			// and that bound is the call's own fold rather than the caller's signal.
			expect(hooks[0]).toBe(bounds[0])
			expect(hooks[0]).not.toBe(caller.signal)
			expect(requireValue(bounds[0], 'Missing bound').aborted).toBe(false)
			// `split: true` routes the <think> span to `thinking` and yields the clean answer, and
			// `strict: false` assembles that result from a wire that carried no settled record.
			expect(result).toEqual({ content: 'the answer', thinking: 'considering' })
			expect(result.content).toBe('the answer')
		})

		it('carries the engine-configuration fence lines the transcription copies', () => {
			expect(guideText).toContain("path: '/generate', // appended to `url` on every call")
			expect(guideText).toContain(
				"timeout: 30_000, // the base's own deadline; DEFAULT_PROVIDER_TIMEOUT when omitted",
			)
			expect(guideText).toContain(
				'headers: async (signal) => ({ authorization: await token(signal) }), // awaited inside that deadline',
			)
			expect(guideText).toContain(
				'split: true, // route <think> spans to `thinking`, yield the clean answer',
			)
			expect(guideText).toContain(
				'strict: false, // assemble at end of input instead of requiring a settled record',
			)
			expect(guideText).toContain('declare function token(signal: AbortSignal): Promise<string>')
		})

		it('round trips both relay fence halves over a started listener and refuses what the route declines', async () => {
			const turns = [{ result: { content: 'relayed answer' }, deltas: ['relayed', ' answer'] }]
			const upstream = createScriptedProvider(turns)
			const bearer = 'fixture'
			const messages: readonly Message[] = [{ id: '1', role: 'user', content: 'Say hello.' }]
			const handler = createRelay({
				provider: upstream,
				authorize: (request) => request.headers.get('authorization') === `Bearer ${bearer}`,
			})
			const dispatcher = createDispatcher({
				routes: [{ method: 'POST', path: '/relay', handler }],
			})
			// The server half's composition runs as written apart from the `host` option a test
			// listener needs. The fence's `serve` export is the alternative entry this listener stands
			// in for, and the `await server.stop()` call in the case's `finally` block replaces the
			// `SIGTERM` listener a test process outlives.
			const server = createServer({ dispatcher, state: () => undefined, host: '127.0.0.1' })
			const port = await server.start()
			try {
				// The route the server half declares is the dispatcher's own contract: the dispatcher itself
				// answers every call that misses the declared method or the declared path, so neither the
				// relay nor the upstream provider is entered.
				const declined = await fetch(`http://127.0.0.1:${port}/relay`, {
					headers: { authorization: `Bearer ${bearer}` },
				})
				expect(declined.status).toBe(405)
				expect(declined.headers.get('allow')).toBe('POST')
				await declined.text()
				const unrouted = await fetch(`http://127.0.0.1:${port}/other`, {
					method: 'POST',
					headers: { authorization: `Bearer ${bearer}` },
					body: '{"messages":[]}',
				})
				expect(unrouted.status).toBe(404)
				await unrouted.text()
				expect(upstream.started).toBe(0)

				// An authorization refusal crosses the hop as a `ProviderError` instance carrying the HTTP code
				// and that status, and it leaves the upstream provider unentered.
				const refused = createRelayProvider({
					url: `http://127.0.0.1:${port}/relay`,
					parser: createParser,
					headers: () => ({ authorization: 'Bearer wrong' }),
				}).generate(messages, createAbort().signal)
				await expect(refused).rejects.toBeInstanceOf(ProviderError)
				await expect(refused).rejects.toMatchObject({
					code: 'HTTP',
					status: 401,
					message: 'provider error: 401',
				})
				expect(upstream.started).toBe(0)

				// The browser end drives the `ProviderInterface` contract exactly like a local provider:
				// the same script driven directly in this process answers what the relayed call answers.
				const browser = createRelayProvider({
					url: `http://127.0.0.1:${port}/relay`,
					parser: createParser,
					headers: () => ({ authorization: `Bearer ${bearer}` }),
				})
				const relayed = await browser.generate(messages, createAbort().signal)
				expect(relayed).toEqual({ content: 'relayed answer' })
				expect(relayed).toEqual(
					await createScriptedProvider(turns).generate(messages, createAbort().signal),
				)
				expect(browser.name).toBe('relay')
				expect(upstream.started).toBe(1)
			} finally {
				await server.stop()
			}
			expect(server.status).toBe('stopped')
			expect(server.address).toBeUndefined()
		})

		it('cancels the upstream turn when the relay reader goes away with the first pull pending', async () => {
			// The gate parks the upstream pull, so the turn cannot finish on its own and the only
			// thing that ends it is the cancel travelling back over the hop.
			const gate = Promise.withResolvers<void>()
			const upstream = new RecordedProvider([{ content: 'relayed answer' }], gate.promise)
			const bearer = 'fixture'
			const messages: readonly Message[] = [{ id: '1', role: 'user', content: 'Say hello.' }]
			const handler = createRelay({
				provider: upstream,
				authorize: (request) => request.headers.get('authorization') === `Bearer ${bearer}`,
			})
			const dispatcher = createDispatcher({
				routes: [{ method: 'POST', path: '/relay', handler }],
			})
			const server = createServer({ dispatcher, state: () => undefined, host: '127.0.0.1' })
			const port = await server.start()
			let drained: number | undefined
			try {
				const abort = createAbort()
				const browser = createRelayProvider({
					url: `http://127.0.0.1:${port}/relay`,
					parser: createParser,
					headers: () => ({ authorization: `Bearer ${bearer}` }),
				})
				const stream = browser.stream(messages, abort.signal)
				const step = stream.next()
				await waitForCondition('the relay entered the upstream turn', () => upstream.steps === 1)
				abort.abort()

				// This is the obligation the guide puts on the adapter: aborting the request's signal
				// when the client disconnects, so a reader that goes away cancels the upstream turn
				// instead of leaving it running. `@orkestrel/server` is the adapter that meets it.
				await expect(step).rejects.toBeInstanceOf(ProviderAbortError)
				await expect(step).rejects.toMatchObject({ code: 'ABORT' })
				await waitForCondition(
					'the relay returned the upstream iterator',
					() => upstream.returns === 1,
				)
				expect(upstream.cancelled).toBe(true)
			} finally {
				gate.resolve()
				const closing = performance.now()
				await server.stop()
				drained = performance.now() - closing
			}

			// A cancel leaves the client's socket aborted rather than idle, so the
			// `closeIdleConnections` step does not reach it and the `server.close()` call waits on the
			// socket itself — seconds, on a server that also served a completed call over that reused
			// keep-alive socket. One server per case keeps the stop immediate.
			expect(drained).toBeLessThan(1000)
			expect(server.status).toBe('stopped')
		})

		it('decodes a scripted relay body through the fence’s browser half alone', async () => {
			const body = [
				JSON.stringify({ channel: 'thinking', text: 'considering ' }),
				JSON.stringify({ channel: 'content', text: 'relayed answer' }),
				JSON.stringify({
					channel: 'result',
					result: { content: 'relayed answer', thinking: 'considering ' },
				}),
				'',
			].join('\n')
			const bearer = 'fixture'
			const sent: Array<string | null> = []
			const browser = createRelayProvider({
				url: 'https://app.example/relay',
				parser: createParser,
				headers: () => ({ authorization: `Bearer ${bearer}` }),
				fetch: (input, init) => {
					sent.push(new Request(input, init).headers.get('authorization'))
					return Promise.resolve(
						new Response(body, { headers: { 'content-type': RELAY_CONTENT_TYPE } }),
					)
				},
			})
			const deltas: string[] = []
			const stream = browser.stream([], new AbortController().signal)
			let step = await stream.next()
			while (!step.done) {
				deltas.push(`${step.value.channel}:${step.value.text}`)
				step = await stream.next()
			}

			// The browser half constructs on `split: false` and `strict: true`, so each frame's text
			// survives verbatim and the settled result is the one the `result` frame carried.
			expect(sent).toEqual(['Bearer fixture'])
			expect(deltas).toEqual(['thinking:considering ', 'content:relayed answer'])
			expect(step.value).toEqual({ content: 'relayed answer', thinking: 'considering ' })
		})

		it('refuses a relay body at its byte limit and admits one below it', async () => {
			const upstream = createScriptedProvider([{ content: 'admitted' }], { record: true })
			const browserOf = (limit: number) =>
				createRelayProvider({
					url: 'https://app.example/relay',
					parser: createParser,
					fetch: (input, init) =>
						createRelay({ provider: upstream, authorize: () => true, limit })(
							new Request(input, init),
						),
				})
			const exact = new TextEncoder().encode(
				JSON.stringify(browserOf(1).body({ messages: [] })),
			).byteLength
			const refused = browserOf(exact).generate([], new AbortController().signal)

			// `limit` refuses a body AT the limit, not merely above it: a body that fills the budget
			// without reporting end of input is indistinguishable from one that exceeds it.
			await expect(refused).rejects.toMatchObject({ code: 'HTTP', status: 413 })
			expect(upstream.started).toBe(0)
			expect(await browserOf(exact + 1).generate([], new AbortController().signal)).toEqual({
				content: 'admitted',
			})
			expect(upstream.started).toBe(1)
		})

		it('carries the relay fence lines the transcription copies', () => {
			expect(guideText).toContain('limit: 65_536, // a body at or above this answers 413')
			expect(guideText).toContain('const handler = createRelay({')
			expect(guideText).toContain(
				"authorize: (request) => request.headers.get('authorization') === `Bearer ${bearer}`,",
			)
			expect(guideText).toContain('const dispatcher = createDispatcher({')
			expect(guideText).toContain("routes: [{ method: 'POST', path: '/relay', handler }],")
			expect(guideText).toContain('return dispatcher.handle(request, undefined)')
			expect(guideText).toContain(
				'const server = createServer({ dispatcher, state: () => undefined })',
			)
			expect(guideText).toContain('await server.start()')
			expect(guideText).toContain(
				"process.on('SIGTERM', () => server.stop()) // signal cancellation, drain, then close the listener",
			)
			expect(guideText).toContain('const browser: ProviderInterface = createRelayProvider({')
			expect(guideText).toContain("url: 'https://app.example/relay',")
			expect(guideText).toContain('parser: createNDJSONParser,')
		})

		it('answers the wire-contract fence’s guard and projection readings', () => {
			expect(relayFrameContract.is({ channel: 'error', message: 'relay provider failed' })).toBe(
				true,
			)
			expect(relayFrameContract.is({ channel: 'error', message: 'oops', code: 'X' })).toBe(false)
			// `parse` answers the same record stripped to the wire shape: the extra member is
			// projected away rather than carried through.
			expect(relayFrameContract.parse({ channel: 'error', message: 'oops', code: 'X' })).toEqual({
				channel: 'error',
				message: 'oops',
			})
		})

		it('projects a settled turn into the frame the wire-contract fence writes back', async () => {
			const upstream = createScriptedProvider([{ content: 'projected answer' }])
			const written: string[] = []
			const body: unknown = { messages: [{ id: '1', role: 'user', content: 'ping' }] }
			const signal = new AbortController().signal

			// The fence guards the inbound body with `is`, runs the turn, and projects the settled
			// result into one newline-delimited frame.
			expect(providerRequestContract.is(body)).toBe(true)
			if (providerRequestContract.is(body)) {
				const result = await upstream.generate(body.messages, signal, body.tools, body.options)
				const frame = relayFrameContract.parse({ channel: 'result', result })
				written.push(`${JSON.stringify(frame)}\n`)
			}

			expect(written).toEqual([
				`${JSON.stringify({
					channel: 'result',
					result: { content: 'projected answer' },
				})}\n`,
			])
		})

		it('carries the wire-contract fence lines the transcription copies', () => {
			expect(guideText).toContain(
				"relayFrameContract.is({ channel: 'error', message: 'relay provider failed' }) // true",
			)
			expect(guideText).toContain(
				"relayFrameContract.is({ channel: 'error', message: 'oops', code: 'X' }) // false — an extra member is refused",
			)
			expect(guideText).toContain(
				"relayFrameContract.parse({ channel: 'error', message: 'oops', code: 'X' }) // { channel: 'error', message: 'oops' } — parse projects the extra member away",
			)
			expect(guideText).toContain(
				"const frame = relayFrameContract.parse({ channel: 'result', result })",
			)
		})

		it('asks the System One fence’s three questions over a started listener and reads the published measures', async () => {
			const posted: unknown[] = []
			const dispatcher = createDispatcher({
				routes: [
					{
						method: 'POST',
						path: SYSTEM_ONE_PATH,
						handler: async (request) => {
							posted.push(JSON.parse(await request.text()))
							return Response.json(SYSTEM_ONE_TEV1)
						},
					},
				],
			})
			const server = createServer({ dispatcher, state: () => undefined, host: '127.0.0.1' })
			const port = await server.start()
			try {
				// The fence names a local Ollama origin; the transcription names the fixture listener
				// that replays the response Ollama 0.40.0 returned for this request on 2026-10-07.
				const judge = createSystemOneJudge({ url: `http://127.0.0.1:${port}`, model: 'tev1:0.8b' })
				const result = await judge.ask(
					{
						state: 'Our checkout has returned 500 errors since 9am. I want a refund for today.',
						questions: {
							label: {
								form: 'choice',
								instructions: 'Which label fits this ticket?',
								criteria: {
									billing: 'Payments and refunds',
									bug: 'Software errors',
									account: null,
								},
							},
							refund: {
								form: 'noul',
								instructions: 'Does the customer ask for money back?',
								criteria: {
									true: 'The customer asks for a refund or for money back.',
									false: 'The customer does not ask for money back.',
								},
							},
							severity: {
								form: 'score',
								instructions: 'How severe is the reported issue?',
								criteria: [
									'Cosmetic; no impact',
									'Degraded, workaround exists',
									'Blocking; no workaround',
								],
							},
						},
					},
					AbortSignal.timeout(30_000),
				)
				const readings = Object.fromEntries(
					Object.entries(result.answers).map(([id, answer]) => [id, computeReading(answer)]),
				)

				// One POST to the origin plus SYSTEM_ONE_PATH carried every question, and its body is the
				// exact request Ollama accepted: `form` written as `type`, the undescribed option kept null.
				expect(posted).toEqual([SYSTEM_ONE_TEV1_REQUEST])
				expect(result.model).toBe('tev1:0.8b')
				expect(result.usage).toEqual({ prompt: 975, completion: 4, total: 979 })
				expect(result).not.toHaveProperty('refusals')
				const label = requireValue(readings.label, 'Missing reading: label')
				expect(label.winner).toBe('bug')
				expect(label.probability).toBeCloseTo(0.9691, 4)
				expect(label.confidence).toBeCloseTo(0.9536, 4)
				expect(label).not.toHaveProperty('score')
				const refund = requireValue(readings.refund, 'Missing reading: refund')
				expect(refund.winner).toBe('true')
				expect(refund.probability).toBeCloseTo(0.9979, 4)
				expect(refund.confidence).toBeCloseTo(0.9958, 4)
				expect(refund).not.toHaveProperty('score')
				const severity = requireValue(readings.severity, 'Missing reading: severity')
				expect(severity.winner).toBe('1')
				expect(severity.probability).toBeCloseTo(0.9494, 4)
				expect(severity.confidence).toBeCloseTo(0.9241, 4)
				expect(severity.score).toBeCloseTo(0.9919, 4)

				// The same response carried the server's own confidence, which the published formulas
				// contradict; the decoded answers hold the distribution and nothing else.
				expect(SYSTEM_ONE_TEV1.answers.label.confidence).toBeCloseTo(0.8718, 4)
				expect(SYSTEM_ONE_TEV1.answers.severity.confidence).toBeCloseTo(0.7864, 4)
				expect(result.answers).toStrictEqual({
					label: { form: 'choice', probabilities: SYSTEM_ONE_TEV1.answers.label.probabilities },
					refund: { form: 'noul', noul: SYSTEM_ONE_TEV1.answers.refund.noul },
					severity: {
						form: 'score',
						probabilities: [0.029332143644132135, 0.9494108750977565, 0.021256981258111343],
					},
				})
			} finally {
				await server.stop()
			}
			expect(server.status).toBe('stopped')
		})

		it('carries the System One fence lines the transcription copies', () => {
			expect(guideText).toContain(
				"const judge = createSystemOneJudge({ url: 'http://localhost:11434', model: 'tev1:0.8b' })",
			)
			expect(guideText).toContain(
				"criteria: { billing: 'Payments and refunds', bug: 'Software errors', account: null },",
			)
			expect(guideText).toContain(
				'Object.entries(result.answers).map(([id, answer]) => [id, computeReading(answer)]),',
			)
			expect(guideText).toContain("result.model // 'tev1:0.8b' — the model the server named")
			expect(guideText).toContain('result.usage // { prompt: 975, completion: 4, total: 979 }')
			expect(guideText).toContain(
				"readings.label // { winner: 'bug', probability: 0.9691, confidence: 0.9536 } to four decimals",
			)
			expect(guideText).toContain(
				"readings.refund // { winner: 'true', probability: 0.9979, confidence: 0.9958 } to four decimals",
			)
			expect(guideText).toContain(
				"readings.severity // { winner: '1', probability: 0.9494, confidence: 0.9241, score: 0.9919 } to four decimals",
			)
		})

		it('authenticates the Jev fence through its header hook on the System One path', async () => {
			const key = 'fixture-key'
			const transport = new RecordedTransport(() => Response.json(SYSTEM_ONE_TEV1))
			const jev = createSystemOneJudge({
				url: 'https://api.typesafe.ai',
				model: 'jev-latest',
				headers: () => ({ authorization: `Bearer ${key}` }),
				// The fence omits `fetch` and takes the global transport; the transcription records the
				// call in process.
				fetch: transport.fetch,
			})
			const result = await jev.ask(SYSTEM_ONE_JUDGE_REQUEST, new AbortController().signal)
			const sent = requireValue(transport.requests[0], 'Missing request')

			expect(transport.requests).toHaveLength(1)
			expect(sent.method).toBe('POST')
			expect(sent.url).toBe('https://api.typesafe.ai/v1/systemone')
			expect(sent.headers.get('authorization')).toBe('Bearer fixture-key')
			expect(sent.headers.get('content-type')).toBe('application/json')
			expect(await sent.json()).toMatchObject({ model: 'jev-latest' })
			// The response named its own model, so the configured alias does not mask it.
			expect(result.model).toBe('tev1:0.8b')
		})

		it('carries the Jev fence lines the transcription copies', () => {
			expect(guideText).toContain("url: 'https://api.typesafe.ai',")
			expect(guideText).toContain("model: 'jev-latest',")
			expect(guideText).toContain(
				"headers: () => ({ authorization: `Bearer ${key}` }), // awaited inside each call's deadline",
			)
		})

		it('answers each question in its own call through the judge-wire fence', async () => {
			const transport = new RecordedTransport(() => Response.json({ yes: 0.93 }))
			const judge = new YesJudge({
				url: 'http://localhost:8010',
				path: '/v1/yes',
				model: 'yes-1',
				batch: false,
				// The fence omits `fetch`; the transcription answers in process.
				fetch: transport.fetch,
			})
			const request: JudgeRequest = {
				state: 'Ticket 4182: the customer paid twice for one plan.',
				questions: {
					refund: { form: 'noul', instructions: 'Is a refund owed?' },
					urgent: { form: 'noul', instructions: 'Is the ticket urgent?' },
				},
			}
			const result = await judge.ask(request, new AbortController().signal)

			expect(judge.name).toBe('yes')
			expect(transport.requests.map((sent) => sent.url)).toEqual([
				'http://localhost:8010/v1/yes',
				'http://localhost:8010/v1/yes',
			])
			expect(await Promise.all(transport.requests.map((sent) => sent.json()))).toEqual([
				{ model: 'yes-1', state: request.state, questions: { refund: request.questions.refund } },
				{ model: 'yes-1', state: request.state, questions: { urgent: request.questions.urgent } },
			])
			expect(result).toStrictEqual({
				model: 'yes-1',
				answers: {
					refund: { form: 'noul', noul: 0.93 },
					urgent: { form: 'noul', noul: 0.93 },
				},
			})

			// A response the wire cannot read reaches the caller as the wire's own PROTOCOL failure.
			const unreadable = new YesJudge({
				url: 'http://localhost:8010',
				path: '/v1/yes',
				model: 'yes-1',
				batch: false,
				fetch: new RecordedTransport(() => Response.json({ no: 1 })).fetch,
			})
			const failure = unreadable.ask(request, new AbortController().signal)
			await expect(failure).rejects.toBeInstanceOf(JudgeError)
			await expect(failure).rejects.toMatchObject({
				code: 'PROTOCOL',
				message: 'judge error: unreadable answer',
			})
		})

		it('carries the judge-wire fence lines the transcription copies', () => {
			expect(guideText).toContain('class YesJudge extends AgentJudge {')
			expect(guideText).toContain("readonly name = 'yes'")
			expect(guideText).toContain(
				"throw new JudgeError('PROTOCOL', 'judge error: unreadable answer')",
			)
			expect(guideText).toContain(
				"return { model: this.model, answers: { [id]: { form: 'noul', noul: value.yes } } }",
			)
			expect(guideText).toContain("path: '/v1/yes',")
			expect(guideText).toContain('batch: false,')
		})

		it('answers through a judge boundary that is never a provider (the judge-boundary clause)', () => {
			const judge = createSystemOneJudge({ url: 'http://localhost:11434', model: 'tev1:0.8b' })
			const other = createSystemOneJudge({ url: 'http://localhost:11434', model: 'tev1:0.8b' })

			expect(judge.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
			expect(judge.id).not.toBe(other.id)
			expect(judge.name).toBe('systemone')
			expect(judge.model).toBe('tev1:0.8b')
			expect('generate' in judge).toBe(false)
			expect('stream' in judge).toBe(false)
		})

		it('derives each reading from the stored distribution alone (the derived-reading clause)', () => {
			// A tie names the first candidate in enumeration order, and a noul of exactly 0.5 names false.
			expect(computeReading({ form: 'choice', probabilities: { billing: 0.5, bug: 0.5 } })).toEqual(
				{
					winner: 'billing',
					probability: 0.5,
					confidence: 0,
				},
			)
			expect(computeReading({ form: 'noul', noul: 0.5 })).toEqual({
				winner: 'false',
				probability: 0.5,
				confidence: 0,
			})
			expect(computeReading({ form: 'noul', noul: 0.25 })).toEqual({
				winner: 'false',
				probability: 0.75,
				confidence: 0.5,
			})
			// (0.7 - 1/3) / (1 - 1/3) = 0.55 for a choice over three options.
			const choice = computeReading({
				form: 'choice',
				probabilities: { billing: 0.7, bug: 0.2, account: 0.1 },
			})
			expect(choice.winner).toBe('billing')
			expect(choice.confidence).toBeCloseTo(0.55, 10)
			expect(choice).not.toHaveProperty('score')
			// A score whose mass sits far from its winner clamps its confidence at 0; its expected level
			// is 0 * 0.25 + 1 * 0.25 + 2 * 0.5.
			expect(computeReading({ form: 'score', probabilities: [0.25, 0.25, 0.5] })).toEqual({
				winner: '2',
				probability: 0.5,
				confidence: 0,
				score: 1.25,
			})
			// Both formulas divide by the candidate count, so a single candidate is a protocol failure.
			const single = captureError(() =>
				computeReading({ form: 'choice', probabilities: { bug: 1 } }),
			)
			expect(single).toBeInstanceOf(JudgeError)
			expect(single).toMatchObject({
				code: 'PROTOCOL',
				message: 'judge error: an answer needs at least 2 candidates',
			})
		})

		it('keeps the protocol’s null for an undescribed candidate and omits it elsewhere (the null clause)', () => {
			expect(
				isJudgeQuestion({ form: 'choice', criteria: { billing: null, bug: 'Software errors' } }),
			).toBe(true)
			expect(isJudgeQuestion({ form: 'score', criteria: ['Cosmetic; no impact', null] })).toBe(true)
			expect(isJudgeQuestion({ form: 'noul', instructions: null })).toBe(false)
			expect(isJudgeQuestion({ form: 'noul', criteria: null })).toBe(false)
			expect(isJudgeQuestion({ form: 'noul', criteria: { true: null } })).toBe(false)
			expect(isJudgeEntry(null)).toBe(false)

			const judge = new SystemOneJudge({ url: 'http://localhost:11434', model: 'tev1:0.8b' })
			expect(judge.body(SYSTEM_ONE_JUDGE_REQUEST)).toEqual(SYSTEM_ONE_TEV1_REQUEST)
			expect(
				judge.body({ state: 'Ticket 4182', questions: { refund: { form: 'noul' } } }),
			).toStrictEqual({
				state: 'Ticket 4182',
				model: 'tev1:0.8b',
				questions: { refund: { type: 'noul' } },
			})
		})

		it('refuses a malformed request before any call and reports a server refusal as HTTP (the validation clause)', async () => {
			const transport = new RecordedTransport(() => Response.json(SYSTEM_ONE_TEV1))
			const judge = new SystemOneJudge({
				url: 'http://localhost:11434',
				model: 'tev1:0.8b',
				fetch: transport.fetch,
			})
			const signal = new AbortController().signal
			const state: Record<string, JSONValue> = {}
			state.self = state

			await expect(
				judge.ask({ state: 'Ticket 4182', questions: {} }, signal),
			).rejects.toMatchObject({ code: 'QUESTION', message: 'judge error: no questions' })
			await expect(
				judge.ask(
					{
						state: 'Ticket 4182',
						questions: { label: { form: 'choice', criteria: { bug: null } } },
					},
					signal,
				),
			).rejects.toMatchObject({
				code: 'QUESTION',
				message: 'judge error: question label is malformed',
			})
			await expect(
				judge.ask({ state, questions: SYSTEM_ONE_JUDGE_REQUEST.questions }, signal),
			).rejects.toMatchObject({
				code: 'QUESTION',
				message: 'judge error: state is not a judge entry',
			})
			expect(transport.requests).toHaveLength(0)

			// The server's own limit: the HTTP 400 Ollama returned on 2026-10-07 for a request with no
			// model, carried with its status and body excerpt.
			const refusal = requireValue(SYSTEM_ONE_ERRORS[2], 'Missing recorded refusal')
			const refused = new SystemOneJudge({
				url: 'http://localhost:11434',
				model: 'tev1:0.8b',
				fetch: new RecordedTransport(() => Response.json(refusal.body, { status: refusal.status }))
					.fetch,
			}).ask(SYSTEM_ONE_JUDGE_REQUEST, signal)
			await expect(refused).rejects.toBeInstanceOf(JudgeError)
			await expect(refused).rejects.toMatchObject({
				code: 'HTTP',
				status: 400,
				message: 'judge error: 400 - {"error":"model is required"}',
			})
			const flooded = new SystemOneJudge({
				url: 'http://localhost:11434',
				model: 'tev1:0.8b',
				fetch: new RecordedTransport(
					() => new Response('x'.repeat(MAX_ERROR_BODY_LENGTH * 2), { status: 529 }),
				).fetch,
			}).ask(SYSTEM_ONE_JUDGE_REQUEST, signal)
			await expect(flooded).rejects.toMatchObject({
				code: 'HTTP',
				status: 529,
				message: `judge error: 529 - ${'x'.repeat(MAX_ERROR_BODY_LENGTH)}`,
			})
			const silent = new SystemOneJudge({
				url: 'http://localhost:11434',
				model: 'tev1:0.8b',
				fetch: new RecordedTransport(() => new Response(null, { status: 400 })).fetch,
			}).ask(SYSTEM_ONE_JUDGE_REQUEST, signal)
			await expect(silent).rejects.toMatchObject({
				code: 'HTTP',
				status: 400,
				message: 'judge error: 400',
			})

			// A successful response with no body, or with a body that is not JSON, is a protocol failure.
			const empty = new SystemOneJudge({
				url: 'http://localhost:11434',
				model: 'tev1:0.8b',
				fetch: new RecordedTransport(() => new Response(null)).fetch,
			}).ask(SYSTEM_ONE_JUDGE_REQUEST, signal)
			await expect(empty).rejects.toMatchObject({
				code: 'PROTOCOL',
				status: undefined,
				message: 'judge error: no response body',
			})
			const garbled = new SystemOneJudge({
				url: 'http://localhost:11434',
				model: 'tev1:0.8b',
				fetch: new RecordedTransport(() => new Response('not json')).fetch,
			}).ask(SYSTEM_ONE_JUDGE_REQUEST, signal)
			await expect(garbled).rejects.toMatchObject({
				code: 'PROTOCOL',
				message: 'judge error: invalid JSON body',
			})
		})

		it('bounds each call by its own deadline and keeps the completed calls in the abort partial (the abort-partial clause)', async () => {
			// An already-aborted signal: an empty partial, and no call.
			const idle = new RecordedTransport(() => Response.json(SYSTEM_ONE_TEV1))
			const early: unknown = await new SystemOneJudge({
				url: 'http://localhost:11434',
				model: 'tev1:0.8b',
				fetch: idle.fetch,
			})
				.ask(SYSTEM_ONE_JUDGE_REQUEST, AbortSignal.abort())
				.catch((failure: unknown) => failure)
			expect(isJudgeAbortError(early)).toBe(true)
			expect(early).toMatchObject({ code: 'ABORT', partial: { model: 'tev1:0.8b', answers: {} } })
			expect(idle.requests).toHaveLength(0)

			// A stalled call: its own deadline fires while the caller's signal stays live.
			const caller = new AbortController()
			const stalled: unknown = await new SystemOneJudge({
				url: 'http://localhost:11434',
				model: 'tev1:0.8b',
				timeout: 10,
				fetch: rejectTransportOnAbort,
			})
				.ask(SYSTEM_ONE_JUDGE_REQUEST, caller.signal)
				.catch((failure: unknown) => failure)
			expect(stalled).toBeInstanceOf(JudgeAbortError)
			expect(stalled).toMatchObject({ code: 'ABORT', partial: { model: 'tev1:0.8b', answers: {} } })
			expect(caller.signal.aborted).toBe(false)

			// A cancel in the second of three calls: the first call's answer and usage survive, and the
			// third call is never made.
			const abort = new AbortController()
			const transport = new RecordedTransport(() => {
				if (transport.requests.length === 2) abort.abort()
				return new Response(JUDGE_ENVELOPE)
			})
			const split: unknown = await new ScriptedJudge({
				url: 'http://judge.test',
				model: 'jev-latest',
				fetch: transport.fetch,
				batch: false,
				answers: TEV1_ANSWERS,
			})
				.ask(TEV1_REQUEST, abort.signal)
				.catch((failure: unknown) => failure)
			if (!isJudgeAbortError(split)) throw new Error('Expected a JudgeAbortError')
			expect(split.code).toBe('ABORT')
			expect(split.partial).toStrictEqual({
				model: 'tev1:0.8b',
				answers: { label: TEV1_CHOICE },
				usage: { prompt: 975, completion: 4, total: 979 },
			})
			expect(transport.requests).toHaveLength(2)

			// A cancel that lands while `read` decodes: no cause, and the decoded answer is left out.
			const reading = new AbortController()
			const decoding = new ScriptedJudge({
				url: 'http://judge.test',
				model: 'tev1:0.8b',
				fetch: new RecordedTransport(() => new Response(JUDGE_ENVELOPE)).fetch,
				answers: TEV1_ANSWERS,
				readAbort: reading,
			})
			const late: unknown = await decoding
				.ask(TEV1_REQUEST, reading.signal)
				.catch((failure: unknown) => failure)
			if (!isJudgeAbortError(late)) throw new Error('Expected a JudgeAbortError')
			expect(late).not.toHaveProperty('cause')
			expect(late.partial).toStrictEqual({ model: 'tev1:0.8b', answers: {} })
			expect(decoding.values).toHaveLength(1)

			// A transport failure with neither bound fired reaches the caller unchanged.
			const offline = new TypeError('fetch failed')
			const broken = new SystemOneJudge({
				url: 'http://localhost:11434',
				model: 'tev1:0.8b',
				fetch: () => Promise.reject(offline),
			}).ask(SYSTEM_ONE_JUDGE_REQUEST, new AbortController().signal)
			await expect(broken).rejects.toBe(offline)
		}, 1000)

		it('splits a request by the batch switch and merges the calls (the batch-switch clause)', async () => {
			const signal = new AbortController().signal
			const whole = new RecordedTransport(() => new Response(JUDGE_ENVELOPE))
			const batched = new ScriptedJudge({
				url: 'http://judge.test',
				model: 'configured',
				fetch: whole.fetch,
				answers: TEV1_ANSWERS,
			})
			await batched.ask(TEV1_REQUEST, signal)
			expect(whole.requests).toHaveLength(1)
			expect(batched.bodies.map((part) => Object.keys(part.questions))).toEqual([
				['label', 'refund', 'severity'],
			])

			const each = new RecordedTransport(() => new Response(JUDGE_ENVELOPE))
			const split = new ScriptedJudge({
				url: 'http://judge.test',
				model: 'configured',
				fetch: each.fetch,
				batch: false,
				answers: { label: TEV1_CHOICE, severity: TEV1_SCORE },
				refusals: { refund: { missing: ['true'] } },
			})
			const result = await split.ask(TEV1_REQUEST, signal)
			expect(each.requests).toHaveLength(3)
			expect(split.bodies.map((part) => Object.keys(part.questions))).toEqual([
				['label'],
				['refund'],
				['severity'],
			])
			expect(split.bodies.every((part) => part.state === TEV1_REQUEST.state)).toBe(true)
			// The model comes from the first call's response, and the three calls' usage is summed.
			expect(result).toStrictEqual({
				model: 'tev1:0.8b',
				answers: { label: TEV1_CHOICE, severity: TEV1_SCORE },
				refusals: { refund: { missing: ['true'] } },
				usage: { prompt: 2925, completion: 12, total: 2937 },
			})

			// A response naming no model and no usage: the configured model, and no usage or refusals.
			const bare = await new ScriptedJudge({
				url: 'http://judge.test',
				model: 'configured',
				fetch: new RecordedTransport(() => new Response('{}')).fetch,
				answers: TEV1_ANSWERS,
			}).ask(TEV1_REQUEST, signal)
			expect(bare).toStrictEqual({ model: 'configured', answers: TEV1_ANSWERS })

			// Every body is built before the first call, so a refusal from `body` sends nothing.
			const untouched = new RecordedTransport(() => new Response(JUDGE_ENVELOPE))
			const refusing = new ScriptedJudge({
				url: 'http://judge.test',
				model: 'configured',
				fetch: untouched.fetch,
				batch: false,
				answers: TEV1_ANSWERS,
				refuse: 'severity',
			})
			await expect(refusing.ask(TEV1_REQUEST, signal)).rejects.toMatchObject({
				code: 'QUESTION',
				message: 'judge error: question severity is refused',
			})
			expect(refusing.bodies).toHaveLength(3)
			expect(untouched.requests).toHaveLength(0)
		})

		it('decodes every server form to one distribution and refuses an unreadable answer (the System One wire clause)', async () => {
			// The forms carry server measures that disagree with one another.
			expect(SYSTEM_ONE_MICA.answers.label.confidence).not.toBe(
				SYSTEM_ONE_TEV1.answers.label.confidence,
			)
			expect(SYSTEM_ONE_MICA.answers.severity.score).not.toBe(
				SYSTEM_ONE_TEV1.answers.severity.score,
			)
			const results = await Promise.all(
				[SYSTEM_ONE_TEV1, SYSTEM_ONE_LLAMA, SYSTEM_ONE_MICA].map((body) =>
					new SystemOneJudge({
						url: 'http://localhost:11434',
						model: 'tev1:0.8b',
						fetch: () => Promise.resolve(Response.json(body)),
					}).ask(SYSTEM_ONE_JUDGE_REQUEST, new AbortController().signal),
				),
			)
			expect(results).toHaveLength(3)
			for (const result of results) {
				expect(result.answers).toStrictEqual({
					label: { form: 'choice', probabilities: SYSTEM_ONE_TEV1.answers.label.probabilities },
					refund: { form: 'noul', noul: SYSTEM_ONE_TEV1.answers.refund.noul },
					severity: {
						form: 'score',
						probabilities: [0.029332143644132135, 0.9494108750977565, 0.021256981258111343],
					},
				})
				expect(result).not.toHaveProperty('refusals')
				expect(computeReading(requireValue(result.answers.severity)).score).toBeCloseTo(0.9919, 4)
			}

			// A System One server answers from the supplied options alone, so an answer it cannot have
			// given is a protocol failure naming the question, never a refusal.
			for (const { answers, message } of SYSTEM_ONE_UNREADABLE_ANSWERS) {
				const failure = new SystemOneJudge({
					url: 'http://localhost:11434',
					model: 'tev1:0.8b',
					fetch: () => Promise.resolve(Response.json({ ...SYSTEM_ONE_TEV1, answers })),
				}).ask(SYSTEM_ONE_JUDGE_REQUEST, new AbortController().signal)
				await expect(failure).rejects.toBeInstanceOf(JudgeError)
				await expect(failure).rejects.toMatchObject({ code: 'PROTOCOL', message })
			}
		})

		it('reports the model a System One response named and complete usage alone (the response-model clause)', async () => {
			const bodies = [
				{ ...SYSTEM_ONE_TEV1, model: 'gateway/tev1:0.8b' },
				{ answers: SYSTEM_ONE_TEV1.answers, usage: SYSTEM_ONE_TEV1.usage },
				{ ...SYSTEM_ONE_TEV1, usage: { input_tokens: 975, output_tokens: null } },
				{ ...SYSTEM_ONE_TEV1, usage: { input_tokens: -1, output_tokens: 4 } },
				{ model: 'tev1:0.8b', answers: SYSTEM_ONE_TEV1.answers },
			]
			const results = await Promise.all(
				bodies.map((body) =>
					new SystemOneJudge({
						url: 'http://localhost:11434',
						model: 'jev-latest',
						fetch: () => Promise.resolve(Response.json(body)),
					}).ask(SYSTEM_ONE_JUDGE_REQUEST, new AbortController().signal),
				),
			)

			expect(results.map((result) => result.model)).toEqual([
				'gateway/tev1:0.8b',
				'jev-latest',
				'tev1:0.8b',
				'tev1:0.8b',
				'tev1:0.8b',
			])
			expect(results.slice(0, 2).map((result) => result.usage)).toEqual([
				{ prompt: 975, completion: 4, total: 979 },
				{ prompt: 975, completion: 4, total: 979 },
			])
			for (const result of results.slice(2)) expect(result).not.toHaveProperty('usage')
		})

		it('cancels a header hook that never settles at the call’s deadline (the header-hook authentication clause)', async () => {
			const caller = new AbortController()
			const hook = new RecordedHeaders({ authorization: 'Bearer fixture-key' })
			const transport = new RecordedTransport(() => Response.json(SYSTEM_ONE_TEV1))
			await new SystemOneJudge({
				url: 'https://api.typesafe.ai',
				model: 'jev-latest',
				headers: hook.headers.bind(hook),
				fetch: transport.fetch,
			}).ask(SYSTEM_ONE_JUDGE_REQUEST, caller.signal)
			// The hook receives the call's own bound, the one the transport receives, never the caller's.
			expect(hook.signals).toHaveLength(1)
			expect(hook.signals[0]).toBe(transport.signals[0])
			expect(hook.signals[0]).not.toBe(caller.signal)

			const stalled = new RecordedHeaders(new Promise(() => {}))
			const untouched = new RecordedTransport(() => Response.json(SYSTEM_ONE_TEV1))
			const failure: unknown = await new SystemOneJudge({
				url: 'https://api.typesafe.ai',
				model: 'jev-latest',
				timeout: 10,
				headers: stalled.headers.bind(stalled),
				fetch: untouched.fetch,
			})
				.ask(SYSTEM_ONE_JUDGE_REQUEST, caller.signal)
				.catch((error: unknown) => error)
			expect(failure).toBeInstanceOf(JudgeAbortError)
			expect(failure).toMatchObject({ partial: { model: 'jev-latest', answers: {} } })
			expect(untouched.requests).toHaveLength(0)
			expect(caller.signal.aborted).toBe(false)
		}, 1000)

		it('carries the judge clause sentences the executed cases back', () => {
			expect(guideText).toContain("a noul of exactly 0.5 names `'false'`")
			expect(guideText).toContain('so the wire never reports a refusal')
			expect(guideText).toContain('a response that names no model reports the configured `model`')
			expect(guideText).toContain(
				'A cancel that lands while `read` decodes the answer is reported with no `cause`',
			)
		})
	})
})
