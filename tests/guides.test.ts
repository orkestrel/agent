// The consumer-side guides-parity entry runs `@orkestrel/guide` against this
// repository's own `guides/README.md` manifest. The constants that follow are this
// package's own, as is the executed section that closes the file.

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
		createConversation,
		createConversationManager,
		createDatabaseConversationStore,
		createInstructionManager,
		createMemoryConversationStore,
		sanitizeToken,
	} = barrel
	const { describe, expect, it } = await import('vitest')
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
	})
})
