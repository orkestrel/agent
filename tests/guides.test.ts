// The consumer-side guides-parity entry runs `@orkestrel/guide` against this
// repository's own `guides/README.md` manifest. The constants that follow are this
// package's own, as is the executed section that closes the file.

import type {
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
	const { requireValue } = await import('@orkestrel/test')
	const { createTool, createToolManager } = await import('@orkestrel/tool')
	const { createMemoryDriver } = await import('@orkestrel/database')
	const barrel = await import('@src/core')
	const {
		AgentProvider,
		createConversation,
		createConversationManager,
		createDatabaseConversationStore,
		createInstructionManager,
		createMemoryConversationStore,
		createRelay,
		createRelayProvider,
		ProviderError,
		providerRequestContract,
		RELAY_CONTENT_TYPE,
		relayFrameContract,
		sanitizeToken,
	} = barrel
	const { createParser, createScriptedProvider } = await import('./setup.js')
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

		it('round trips both relay fence halves and carries the route the server half declares', async () => {
			const upstream = createScriptedProvider([
				{ result: { content: 'relayed answer' }, deltas: ['relayed', ' answer'] },
			])
			const bearer = 'fixture'
			const handler = createRelay({
				provider: upstream,
				authorize: (request) => request.headers.get('authorization') === `Bearer ${bearer}`,
			})
			const received: Request[] = []
			const browser = createRelayProvider({
				url: 'https://app.example/relay',
				parser: createParser,
				headers: () => ({ authorization: `Bearer ${bearer}` }),
				fetch: (input, init) => {
					const request = new Request(input, init)
					received.push(request)
					return handler(request)
				},
			})

			// The browser end drives `ProviderInterface` exactly like a local provider, and the
			// credential never leaves the handler's side of the hop.
			expect(await browser.generate([], new AbortController().signal)).toEqual({
				content: 'relayed answer',
			})
			expect(browser.name).toBe('relay')

			// The server half declares `{ method: 'POST', path: '/relay', handler }`. Neither the
			// dispatcher nor the `createServer` start-up that follows it is executed here, so the
			// route is asserted against what the browser half actually sends: the request the
			// handler receives carries that method and that path.
			const request = requireValue(received[0], 'Missing relay request')
			expect(request.method).toBe('POST')
			expect(new URL(request.url).pathname).toBe('/relay')
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

		it('refuses the relay fence’s hop when the bearer does not match', async () => {
			const upstream = createScriptedProvider([{ content: 'never reached' }], { record: true })
			const handler = createRelay({
				provider: upstream,
				authorize: (request) => request.headers.get('authorization') === 'Bearer fixture',
			})
			const browser = createRelayProvider({
				url: 'https://app.example/relay',
				parser: createParser,
				headers: () => ({ authorization: 'Bearer wrong' }),
				fetch: (input, init) => handler(new Request(input, init)),
			})
			const refused = browser.generate([], new AbortController().signal)

			// An authorization refusal reaches the browser as a ProviderError with the HTTP code and
			// that status, and it leaves the upstream provider unentered.
			await expect(refused).rejects.toBeInstanceOf(ProviderError)
			await expect(refused).rejects.toMatchObject({
				code: 'HTTP',
				status: 401,
				message: 'provider error: 401',
			})
			expect(upstream.started).toBe(0)
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
			expect(guideText).toContain("routes: [{ method: 'POST', path: '/relay', handler }],")
			expect(guideText).toContain('return dispatcher.handle(request, undefined)')
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
