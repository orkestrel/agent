// The consumer-side guides-parity entry runs `@orkestrel/guide` against this
// repository's own `guides/README.md` manifest. The constants that follow are this
// package's own, as is the executed section that closes the file.

import type {
	JudgeRequest,
	JudgeResult,
	Message,
	ProviderIncrement,
	ProviderOptions,
	ProviderParserInterface,
	ProviderRequest,
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
	const { isFiniteNumber, isRecord, parseJSON } = await import('@orkestrel/contract')
	const { computeSymbolKey, findMissingSymbols } = await import('@orkestrel/guide')
	const { captureError, requireValue, waitForCondition } = await import('@orkestrel/test')
	const { createAbort } = await import('@orkestrel/abort')
	const { createTool, createToolManager } = await import('@orkestrel/tool')
	const { createMemoryDriver } = await import('@orkestrel/database')
	// The relay fence's server half: its router and its adapter are the server application's
	// dependencies, declared here for development so the transcription can run the real hop.
	const { createDispatcher } = await import('@orkestrel/router')
	const { createServer } = await import('@orkestrel/server')
	const barrel = await import('@src/core')
	const {
		AgentJudge,
		AgentProvider,
		computeReading,
		createAgent,
		createConversation,
		createConversationManager,
		createDatabaseConversationStore,
		createInstructionManager,
		createMemoryConversationStore,
		createRelay,
		createRelayProvider,
		createScope,
		createSystemOneJudge,
		isJudgeAbortError,
		isJudgeEntry,
		isJudgeQuestion,
		JudgeAbortError,
		JudgeError,
		MAX_ERROR_BODY_LENGTH,
		ProviderAbortError,
		ProviderError,
		providerRequestContract,
		RELAY_CONTENT_TYPE,
		relayFrameContract,
		sanitizeToken,
		SYSTEM_ONE_PATH,
		SystemOneJudge,
	} = barrel
	const {
		createParser,
		createScriptedProvider,
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
	const { describe, expect, it } = await import('vitest')

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
				'A scope change through the `context.apply` method takes effect on the next turn.',
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

			// `summary?` is optional and absent until the first compaction, so an uncompacted
			// conversation's snapshot carries its messages and judgments and omits the summary.
			expect(Object.keys(thread.snapshot())).toEqual(['id', 'sections', 'messages', 'judgments'])
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
				'thread.snapshot() // { id, summary?, sections, messages } — the durable payload',
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
