// The consumer-side guides-parity entry runs `@orkestrel/guide` against this
// repository's own `guides/README.md` manifest. The constants that follow are this
// package's own, as is the executed section that closes the file.

import type {
	Message,
	ProviderIncrement,
	ProviderOptions,
	ProviderParserInterface,
	ProviderRequest,
} from '@src/core'
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
	const { isRecord, parseJSON } = await import('@orkestrel/contract')
	const { computeSymbolKey, findMissingSymbols } = await import('@orkestrel/guide')
	const { requireValue, waitForCondition } = await import('@orkestrel/test')
	const { createAbort } = await import('@orkestrel/abort')
	const { createTool, createToolManager } = await import('@orkestrel/tool')
	const { createMemoryDriver } = await import('@orkestrel/database')
	// The relay fence's server half: its router and its adapter are the server application's
	// dependencies, declared here for development so the transcription can run the real hop.
	const { createDispatcher } = await import('@orkestrel/router')
	const { createServer } = await import('@orkestrel/server')
	const barrel = await import('@src/core')
	const {
		AgentProvider,
		createAgent,
		createConversation,
		createConversationManager,
		createDatabaseConversationStore,
		createInstructionManager,
		createMemoryConversationStore,
		createRelay,
		createRelayProvider,
		ProviderAbortError,
		ProviderError,
		providerRequestContract,
		RELAY_CONTENT_TYPE,
		relayFrameContract,
		sanitizeToken,
	} = barrel
	const { createParser, createScriptedProvider, RecordedProvider } = await import('./setup.js')
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
			// conversation's snapshot carries `id` / `sections` / `messages` and omits it.
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
	})
})
