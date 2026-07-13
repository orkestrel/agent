import type { ContextFormatInterface, MessageInput, MessageInterface } from '@src/core'
import {
	AgentContext,
	CONVERSATION_RECAP_PREFIX,
	ConversationManager,
	InstructionManager,
	Scope,
	Tool,
	ToolManager,
	WORKSPACE_SECTION_HEADER,
	WorkspaceManager,
	createBinaryContent,
	createFile,
	createTextContent,
	createWorkspaceManager,
} from '@src/core'
import { describe, expect, it } from 'vitest'
import { createStubSummarizer } from '../../../setup.js'

// AgentContext assembles a turn's provider input — the leading system block (the prompt
// + the scoped instructions, each under its manager's description, then the ACTIVE
// workspace's text files) then the scoped conversation (with the active workspace's image
// files' data attached to the last user message). The active workspace is the SOLE
// document/image context. Tools are advertised STRUCTURALLY (via definitions()), never
// serialized into the prompt, so build() must never carry tool content (AGENTS §16 — real
// behavior, no mocks). The system-only behavior of the original lean context is preserved.

describe('AgentContext — build with a system prompt', () => {
	it('prepends a system message, then the conversation in order', () => {
		const context = new AgentContext({ system: 'You are concise.' })
		context.messages.add({ role: 'user', content: 'one' })
		context.messages.add({ role: 'assistant', content: 'two' })

		const built = context.build()

		expect(built).toHaveLength(3)
		expect(built[0].role).toBe('system')
		expect(built[0].content).toBe('You are concise.')
		expect(built[0].id.length).toBeGreaterThan(0)
		expect(built.slice(1).map((message) => message.content)).toEqual(['one', 'two'])
	})

	it('exposes the configured system prompt', () => {
		const context = new AgentContext({ system: 'sys' })

		expect(context.system).toBe('sys')
	})
})

describe('AgentContext — build without a system prompt', () => {
	it('returns just the conversation in order', () => {
		const context = new AgentContext()
		context.messages.add([
			{ role: 'user', content: 'first' },
			{ role: 'assistant', content: 'second' },
		])

		const built = context.build()

		expect(built.map((message) => message.role)).toEqual(['user', 'assistant'])
		expect(built.map((message) => message.content)).toEqual(['first', 'second'])
		expect(built.some((message) => message.role === 'system')).toBe(false)
	})

	it('reports system as undefined', () => {
		const context = new AgentContext()

		expect(context.system).toBeUndefined()
	})

	it('returns an empty array for an empty conversation', () => {
		const context = new AgentContext()

		expect(context.build()).toEqual([])
	})
})

describe('AgentContext — tools are structural, not in the prompt', () => {
	it('exposes the passed registry', () => {
		const tools = new ToolManager()
		const context = new AgentContext({ tools })

		expect(context.tools).toBe(tools)
	})

	it('creates a fresh empty registry when none is passed', () => {
		const context = new AgentContext()

		expect(context.tools).toBeInstanceOf(ToolManager)
		expect(context.tools.count).toBe(0)
	})

	it('never includes tools in the built message array', () => {
		const tools = new ToolManager()
		tools.add(new Tool({ name: 'search', description: 'Search the web', execute: () => 'ok' }))
		const context = new AgentContext({ system: 'sys', tools })
		context.messages.add({ role: 'user', content: 'find cats' })

		const built = context.build()

		// Only the system message + the user turn — no message carries the tool name,
		// description, or definition; tools reach the provider via definitions(), not here.
		expect(built).toHaveLength(2)
		const serialized = JSON.stringify(built)
		expect(serialized).not.toContain('search')
		expect(serialized).not.toContain('Search the web')
	})
})

describe('AgentContext — build is fresh each call', () => {
	it('reflects messages added between builds', () => {
		const context = new AgentContext()

		expect(context.build()).toEqual([])

		context.messages.add({ role: 'user', content: 'later' })
		const built = context.build()

		expect(built).toHaveLength(1)
		expect(built[0].content).toBe('later')
	})

	it('mints a new system message each build (no caching)', () => {
		const context = new AgentContext({ system: 'sys' })

		const first = context.build()[0]
		const second = context.build()[0]

		expect(first.content).toBe(second.content)
		expect(first.id).not.toBe(second.id)
	})
})

describe('AgentContext — system boundary', () => {
	it('prepends exactly one system message, never duplicated', () => {
		const context = new AgentContext({ system: 'sys' })
		context.messages.add({ role: 'user', content: 'hi' })

		const built = context.build()

		expect(built.filter((message) => message.role === 'system')).toHaveLength(1)
		expect(built[0].role).toBe('system')
		expect(built.slice(1).every((message) => message.role !== 'system')).toBe(true)
	})

	it('returns [system] for a system prompt with no conversation', () => {
		const context = new AgentContext({ system: 'only-system' })

		const built = context.build()

		expect(built).toHaveLength(1)
		expect(built[0]).toMatchObject({ role: 'system', content: 'only-system' })
		expect(built[0].id.length).toBeGreaterThan(0)
	})

	it('treats an explicit empty-string system as a real (empty) system message', () => {
		// `system` is configured by `=== undefined`, not falsiness — an explicitly
		// supplied '' is opted in, so it is prepended as an empty system message. A
		// refactor to a truthiness check would wrongly drop it; this pins the contract.
		const context = new AgentContext({ system: '' })
		context.messages.add({ role: 'user', content: 'hi' })

		expect(context.system).toBe('')
		const built = context.build()
		expect(built).toHaveLength(2)
		expect(built[0].role).toBe('system')
		expect(built[0].content).toBe('')
	})

	it('treats a whitespace-only system as a real system message (preserved verbatim)', () => {
		const context = new AgentContext({ system: '   ' })

		const built = context.build()

		expect(built).toHaveLength(1)
		expect(built[0].role).toBe('system')
		expect(built[0].content).toBe('   ')
	})

	it('omits the system message entirely when no system is configured', () => {
		const context = new AgentContext()
		context.messages.add({ role: 'user', content: 'hi' })

		const built = context.build()

		expect(built).toHaveLength(1)
		expect(built[0].role).toBe('user')
		expect(built[0].content).not.toBeUndefined()
	})
})

describe('AgentContext — build snapshot independence (§11)', () => {
	it('returns a fresh array each call — mutating one build does not affect a later one', () => {
		const context = new AgentContext({ system: 'sys' })
		context.messages.add({ role: 'user', content: 'a' })

		const first = context.build()
		expect(first).toHaveLength(2)
		// Corrupt the returned array at runtime — push + splice (the array is typed
		// `readonly`, so reach the mutators through Reflect, never an assertion §1/§14).
		Reflect.apply(Array.prototype.push, first, [{ id: 'rogue', role: 'user', content: 'injected' }])
		Reflect.apply(Array.prototype.splice, first, [0, 2])

		const second = context.build()

		// A later build is unaffected by the mutation of the earlier one.
		expect(second).toHaveLength(2)
		expect(second[0].role).toBe('system')
		expect(second[1].content).toBe('a')
		expect(second.some((message) => message.id === 'rogue')).toBe(false)
	})

	it('mutating build() output does not corrupt the underlying message store', () => {
		const context = new AgentContext()
		context.messages.add({ role: 'user', content: 'kept' })

		const built = context.build()
		Reflect.apply(Array.prototype.push, built, [
			{ id: 'rogue', role: 'assistant', content: 'injected' },
		])
		Reflect.apply(Array.prototype.splice, built, [0, built.length])

		expect(context.messages.count).toBe(1)
		expect(context.messages.messages().map((message) => message.content)).toEqual(['kept'])
		expect(context.build().map((message) => message.content)).toEqual(['kept'])
	})

	it('build() with no system shares no array with messages() snapshot', () => {
		const context = new AgentContext()
		context.messages.add({ role: 'user', content: 'a' })

		const built = context.build()
		const snapshot = context.messages.messages()

		// Both are snapshots, distinct arrays; corrupting build() leaves messages() intact.
		expect(built).not.toBe(snapshot)
		Reflect.apply(Array.prototype.push, built, [{ id: 'rogue', role: 'user', content: 'x' }])
		expect(context.messages.messages()).toHaveLength(1)
	})
})

describe('AgentContext — accessors & construction', () => {
	it('constructs with no options — undefined system, empty messages + tools', () => {
		const context = new AgentContext()

		expect(context.system).toBeUndefined()
		expect(context.messages.count).toBe(0)
		expect(context.tools.count).toBe(0)
		expect(context.build()).toEqual([])
	})

	it('constructs system-only — system set, fresh empty registry', () => {
		const context = new AgentContext({ system: 'sys' })

		expect(context.system).toBe('sys')
		expect(context.tools).toBeInstanceOf(ToolManager)
		expect(context.tools.count).toBe(0)
		expect(context.messages.count).toBe(0)
	})

	it('constructs tools-only — undefined system, the passed registry reused by identity', () => {
		const tools = new ToolManager()
		const context = new AgentContext({ tools })

		expect(context.system).toBeUndefined()
		expect(context.tools).toBe(tools)
	})

	it('constructs with all options — system + the passed registry', () => {
		const tools = new ToolManager()
		const context = new AgentContext({ system: 'sys', tools })

		expect(context.system).toBe('sys')
		expect(context.tools).toBe(tools)
	})

	it('exposes a stable messages store across reads (same instance)', () => {
		const context = new AgentContext()

		expect(context.messages).toBe(context.messages)
	})

	it('surfaces tools structurally via definitions(), reflected in build() never', () => {
		const tools = new ToolManager()
		tools.add(new Tool({ name: 'lookup', parameters: { type: 'object' }, execute: () => 1 }))
		const context = new AgentContext({ tools })
		context.messages.add({ role: 'user', content: 'go' })

		expect(context.tools.count).toBe(1)
		expect(context.tools.definitions().map((definition) => definition.name)).toEqual(['lookup'])
		// The tool is advertised structurally — it never appears in build()'s message array.
		expect(JSON.stringify(context.build())).not.toContain('lookup')
	})
})

describe('AgentContext — long conversation', () => {
	it('prepends a single system message ahead of a long conversation in order', () => {
		const context = new AgentContext({ system: 'sys' })
		const turns: readonly MessageInterface[] = context.messages.add(
			Array.from(
				{ length: 200 },
				(_, index): MessageInput => ({
					role: index % 2 === 0 ? 'user' : 'assistant',
					content: `turn-${index}`,
				}),
			),
		)

		const built = context.build()

		expect(built).toHaveLength(201)
		expect(built[0].role).toBe('system')
		expect(built.slice(1).map((message) => message.content)).toEqual(
			turns.map((turn) => turn.content),
		)
		expect(built.filter((message) => message.role === 'system')).toHaveLength(1)
	})
})

describe('AgentContext — context managers', () => {
	it('constructs a fresh empty instruction registry when none passed', () => {
		const context = new AgentContext()

		expect(context.instructions).toBeInstanceOf(InstructionManager)
		expect(context.instructions.count).toBe(0)
	})

	it('reuses a pre-built instruction manager by identity', () => {
		const instructions = new InstructionManager()
		const context = new AgentContext({ instructions })

		expect(context.instructions).toBe(instructions)
	})

	it('contributes nothing to build() when the instruction manager is empty (system-only preserved)', () => {
		const context = new AgentContext({ system: 'sys' })
		context.messages.add({ role: 'user', content: 'hi' })

		const built = context.build()

		// Identical to the original lean behavior: just [system, user].
		expect(built).toHaveLength(2)
		expect(built[0]).toMatchObject({ role: 'system', content: 'sys' })
		expect(built[1]).toMatchObject({ role: 'user', content: 'hi' })
	})

	it('folds the instructions into the system block under the prompt', () => {
		const context = new AgentContext({ system: 'You are concise.' })
		const tone = context.instructions.add({ name: 'tone', content: 'Be terse.' })
		context.messages.add({ role: 'user', content: 'hi' })

		const built = context.build()

		// One system message, then the user turn.
		expect(built.filter((message) => message.role === 'system')).toHaveLength(1)
		const system = built[0]
		expect(system.role).toBe('system')
		expect(system.content).toBe(
			[
				'You are concise.',
				`${context.instructions.description}\n\n${context.instructions.format(tone)}`,
			].join('\n\n'),
		)
		// Order: prompt → instructions.
		expect(system.content.indexOf('You are concise.')).toBeLessThan(
			system.content.indexOf('## Instructions'),
		)
	})

	it('builds a system block from the instruction manager alone (no system prompt configured)', () => {
		const context = new AgentContext()
		context.instructions.add({ name: 'a', content: 'do this' })
		context.messages.add({ role: 'user', content: 'hi' })

		const built = context.build()

		expect(built).toHaveLength(2)
		expect(built[0].role).toBe('system')
		expect(built[0].content).toBe('## Instructions\n\ndo this')
	})

	it('orders multiple instructions by descending priority inside the block', () => {
		const context = new AgentContext()
		context.instructions.add([
			{ name: 'low', content: 'low', priority: 1 },
			{ name: 'high', content: 'high', priority: 10 },
		])

		const block = context.build()[0].content

		expect(block.indexOf('high')).toBeLessThan(block.indexOf('low'))
	})
})

// The ACTIVE workspace is the SOLE document/image context, rendered BY CARRIER:
// `workspaces.active`'s TEXT files fold into a `## Workspace` system section (fenced), its
// IMAGE files' base64 data attaches to the last user message. It is ACTIVE-ONLY (never the
// other workspaces), scope-filtered by `scope.files`, and renders NOTHING when no workspace is
// active. `context.workspaces` is ALWAYS present + SETTABLE (AGENTS §16 — real behavior, no
// mocks; a real Workspace + WorkspaceManager, no provider needed).
describe('AgentContext — workspaces accessor & construction', () => {
	it('constructs a fresh empty WorkspaceManager when none is passed (always present)', () => {
		const context = new AgentContext()

		expect(context.workspaces).toBeInstanceOf(WorkspaceManager)
		expect(context.workspaces.count).toBe(0)
		expect(context.workspaces.active).toBeUndefined()
	})

	it('reuses a pre-built WorkspaceManager by identity', () => {
		const workspaces = new WorkspaceManager()
		const context = new AgentContext({ workspaces })

		expect(context.workspaces).toBe(workspaces)
	})

	it('is settable — swapping the registry redirects the active-workspace render', () => {
		const context = new AgentContext()
		const a = createWorkspaceManager()
		a.add().write('a.txt', 'in-a')
		const b = createWorkspaceManager()
		b.add().write('b.txt', 'in-b')

		context.workspaces = a
		expect(context.workspaces).toBe(a)
		expect(context.build()[0].content).toContain('in-a')

		// Swap to b — the NEXT build reflects b's active workspace (recomputed fresh, no stale a).
		context.workspaces = b
		const block = context.build()[0].content
		expect(block).toContain('in-b')
		expect(block).not.toContain('in-a')
	})

	it('contributes nothing to build() when there is no active workspace', () => {
		const context = new AgentContext({ system: 'sys' })
		// A registry with workspaces but NONE active is impossible (the first add auto-activates),
		// so the no-active case is the empty registry: nothing renders for workspaces.
		context.messages.add({ role: 'user', content: 'hi' })

		const built = context.build()

		expect(built).toHaveLength(2)
		expect(built[0].content).toBe('sys')
		expect(built[0].content).not.toContain(WORKSPACE_SECTION_HEADER)
	})
})

describe('AgentContext — workspaces render by carrier', () => {
	it('folds the ACTIVE workspace’s TEXT files into a `## Workspace` system section (fenced)', () => {
		const context = new AgentContext({ system: 'sys' })
		const workspace = context.workspaces.add()
		workspace.write('src/config.ts', 'export const PORT = 8123')
		context.messages.add({ role: 'user', content: 'hi' })

		const built = context.build()
		const block = built[0].content

		// The dedicated workspace section header + the fenced reference block: `File: <path>` then a
		// ```<language> fence (inferred typescript), verbatim.
		expect(block).toContain(WORKSPACE_SECTION_HEADER)
		expect(block).toContain('File: src/config.ts\n```typescript\nexport const PORT = 8123\n```')
		// Rendered into the system block, not a separate message.
		expect(built.filter((message) => message.role === 'system')).toHaveLength(1)
	})

	it('renders the workspace section just AFTER the instructions section', () => {
		const context = new AgentContext()
		context.instructions.add({ name: 'tone', content: 'Be terse.' })
		const workspace = context.workspaces.add()
		workspace.write('notes.txt', 'WORKSPACE TEXT')

		const block = context.build()[0].content

		// instructions → workspace (the in-prompt text content grouped after the instructions).
		expect(block.indexOf('## Instructions')).toBeLessThan(block.indexOf(WORKSPACE_SECTION_HEADER))
	})

	it('attaches the ACTIVE workspace’s IMAGE files’ base64 data to the LAST user message', () => {
		const context = new AgentContext()
		// A genuine binary (image) file can only be seated through the constructor seed — write()
		// only mints text files. Use the WorkspaceManager add({ seed }) hydration seam.
		const icon = createFile({
			path: 'icon.png',
			content: createBinaryContent('ICONB64', 'image/png'),
		})
		const seeded = context.workspaces.add({ seed: [['icon.png', icon]] })
		context.workspaces.switch(seeded.id)
		context.messages.add([
			{ role: 'user', content: 'first' },
			{ role: 'assistant', content: 'reply' },
			{ role: 'user', content: 'last' },
		])

		const built = context.build()

		// The image file's base64 rides the LAST user message (a vision provider reads images off a user turn).
		const lastUser = built.filter((message) => message.role === 'user').at(-1)
		expect(lastUser?.content).toBe('last')
		expect(lastUser?.images).toEqual(['ICONB64'])
		// The base64 never appears in the system block (an image file emits NO text marker — it is
		// not rendered into the `## Workspace` text section, only attached).
		expect(built[0].images ?? []).not.toContain('ICONB64')
	})

	it('attaches MULTIPLE workspace image files’ data to the last user turn, in order', () => {
		const context = new AgentContext()
		const a = createFile({ path: 'a.png', content: createBinaryContent('AIMG', 'image/png') })
		const b = createFile({ path: 'b.png', content: createBinaryContent('BIMG', 'image/png') })
		context.workspaces.add({
			seed: [
				['a.png', a],
				['b.png', b],
			],
		})
		context.messages.add({ role: 'user', content: 'see' })

		const built = context.build()

		// Both workspace image files attach, in insertion order.
		expect(built.at(-1)?.images).toEqual(['AIMG', 'BIMG'])
	})

	it('renders a TEXT file in the system block AND attaches an IMAGE file from the same active workspace', () => {
		const context = new AgentContext({ system: 'sys' })
		// One active workspace holding BOTH a text file (added via write) and an image file (seeded,
		// since write() only ever mints text files).
		const image = createFile({ path: 'b.png', content: createBinaryContent('IMGB', 'image/png') })
		const workspace = context.workspaces.add({ seed: [['b.png', image]] })
		workspace.write('a.ts', 'const z = 9')
		context.messages.add({ role: 'user', content: 'hi' })

		const built = context.build()

		// Text file → fenced system section; image file → last user message.
		expect(built[0].content).toContain('File: a.ts\n```typescript\nconst z = 9\n```')
		expect(built.at(-1)?.images).toEqual(['IMGB'])
	})

	it('is ACTIVE-ONLY — only the active workspace’s files render, never the others', () => {
		const context = new AgentContext()
		const first = context.workspaces.add() // auto-activates
		first.write('active.txt', 'ACTIVE CONTENT')
		const second = context.workspaces.add() // NOT active
		second.write('other.txt', 'OTHER CONTENT')

		const block = context.build()[0].content

		expect(context.workspaces.active).toBe(first)
		expect(block).toContain('ACTIVE CONTENT')
		expect(block).not.toContain('OTHER CONTENT')

		// Switch active to the second — the next build renders ITS file, not the first's.
		context.workspaces.switch(second.id)
		const after = context.build()[0].content
		expect(after).toContain('OTHER CONTENT')
		expect(after).not.toContain('ACTIVE CONTENT')
	})

	it('renders a system block from the active workspace ALONE (no prompt, no instructions)', () => {
		const context = new AgentContext()
		context.workspaces.add().write('only.txt', 'lonely')

		const built = context.build()

		expect(built).toHaveLength(1)
		expect(built[0].role).toBe('system')
		expect(built[0].content).toBe(
			`${WORKSPACE_SECTION_HEADER}\n\nFile: only.txt\n\`\`\`text\nlonely\n\`\`\``,
		)
	})

	it('renders MULTIPLE workspace text files in insertion order under one header', () => {
		const context = new AgentContext()
		const workspace = context.workspaces.add()
		workspace.write('one.txt', 'FIRST')
		workspace.write('two.txt', 'SECOND')

		const block = context.build()[0].content

		expect(block).toBe(
			`${WORKSPACE_SECTION_HEADER}\n\nFile: one.txt\n\`\`\`text\nFIRST\n\`\`\`\n\nFile: two.txt\n\`\`\`text\nSECOND\n\`\`\``,
		)
	})
})

describe('AgentContext — workspaces scope.files filtering', () => {
	// An active workspace holding two TEXT files + two IMAGE files (seeded in one go — write() only
	// mints text, so an image file is seated through the constructor seed seam), so scope.files can
	// be shown filtering BOTH the text section and the image attach.
	function seed(): AgentContext {
		const context = new AgentContext({ system: 'sys' })
		context.workspaces.add({
			seed: [
				[
					'keep.txt',
					createFile({ path: 'keep.txt', content: createTextContent('KEPT FILE', 'text') }),
				],
				[
					'drop.txt',
					createFile({ path: 'drop.txt', content: createTextContent('DROPPED FILE', 'text') }),
				],
				[
					'keep.png',
					createFile({ path: 'keep.png', content: createBinaryContent('KEEPIMG', 'image/png') }),
				],
				[
					'drop.png',
					createFile({ path: 'drop.png', content: createBinaryContent('DROPIMG', 'image/png') }),
				],
			],
		})
		context.messages.add({ role: 'user', content: 'hi' })
		return context
	}

	it('an undefined scope.files passes EVERY active file (text + image)', () => {
		const context = seed()

		const built = context.build()
		const block = built[0].content

		expect(block).toContain('KEPT FILE')
		expect(block).toContain('DROPPED FILE')
		// Both image files attach.
		expect(built.at(-1)?.images).toEqual(['KEEPIMG', 'DROPIMG'])
	})

	it('a named allow-list keeps only the listed files (filters BOTH the text section and the image attach)', () => {
		const context = seed()
		context.scope = new Scope({ name: 'narrowed', files: ['keep.txt', 'keep.png'] })

		const built = context.build()
		const block = built[0].content

		expect(block).toContain('KEPT FILE')
		expect(block).not.toContain('DROPPED FILE')
		// Only the scoped-in image file attaches.
		expect(built.at(-1)?.images).toEqual(['KEEPIMG'])
	})

	it('an empty allow-list ([]) drops EVERY workspace file (the whole `## Workspace` section vanishes)', () => {
		const context = seed()
		context.scope = new Scope({ name: 'no-files', files: [] })

		const built = context.build()
		const block = built[0].content

		expect(block).not.toContain(WORKSPACE_SECTION_HEADER)
		expect(block).not.toContain('KEPT FILE')
		expect(block).not.toContain('DROPPED FILE')
		// No image file attaches either.
		expect(built.at(-1)?.images).toBeUndefined()
	})

	it('narrow() intersects the files allow-list (a parent-excluded file never returns)', () => {
		const parent = new Scope({ name: 'p', files: ['keep.txt', 'drop.txt'] })
		const child = parent.narrow({ files: ['drop.txt', 'other.txt'] })

		// Intersection: only 'drop.txt' is in BOTH (other.txt was never in the parent).
		expect(child.files).toEqual(['drop.txt'])
	})
})

describe('AgentContext — image data attachment (active workspace)', () => {
	function seedImages(): AgentContext {
		const context = new AgentContext()
		context.workspaces.add({
			seed: [
				['a.png', createFile({ path: 'a.png', content: createBinaryContent('IMGA', 'image/png') })],
				['b.png', createFile({ path: 'b.png', content: createBinaryContent('IMGB', 'image/png') })],
			],
		})
		return context
	}

	it('attaches the active workspace’s image data to the LAST user message (not the system block)', () => {
		const context = seedImages()
		context.messages.add([
			{ role: 'user', content: 'first user' },
			{ role: 'assistant', content: 'reply' },
			{ role: 'user', content: 'last user' },
		])

		const built = context.build()

		const users = built.filter((message) => message.role === 'user')
		const lastUser = users.at(-1)
		expect(lastUser?.content).toBe('last user')
		expect(lastUser?.images).toEqual(['IMGA', 'IMGB'])
		// The earlier user message carries no images.
		expect(users[0]?.images).toBeUndefined()
	})

	it("merges a message's own images then the workspace image data on the last user message", () => {
		// build() merges a message's OWN images first, then the attached workspace data
		// (`[...message.images ?? [], ...data]`). The active conversation round-trips a MessageInput's
		// `images`, so a user message added with `images: ['OWN']` keeps them, and build()
		// appends the workspace image data after — own-first, then workspace.
		const context = new AgentContext()
		context.workspaces.add({
			seed: [
				[
					'ctx.png',
					createFile({ path: 'ctx.png', content: createBinaryContent('CTX', 'image/png') }),
				],
			],
		})
		context.messages.add({ role: 'user', content: 'see this', images: ['OWN'] })

		const built = context.build()

		expect(built.at(-1)?.images).toEqual(['OWN', 'CTX'])
	})

	it('does not mutate the stored message when attaching (immutability)', () => {
		const context = new AgentContext()
		context.workspaces.add({
			seed: [
				['x.png', createFile({ path: 'x.png', content: createBinaryContent('X', 'image/png') })],
			],
		})
		const stored = context.messages.add({ role: 'user', content: 'hi' })

		const built = context.build()

		expect(built.at(-1)?.images).toEqual(['X'])
		// The stored message is untouched — no images leaked onto it.
		expect(context.messages.message(stored.id)?.images).toBeUndefined()
		expect(stored.images).toBeUndefined()
	})

	it('skips attachment (no throw) when there is no user message', () => {
		const context = new AgentContext()
		context.workspaces.add({
			seed: [
				['x.png', createFile({ path: 'x.png', content: createBinaryContent('X', 'image/png') })],
			],
		})
		context.messages.add({ role: 'assistant', content: 'no user here' })

		const built = context.build()

		// No message carries the data (the only turn is an assistant turn).
		expect(built.some((message) => message.images !== undefined)).toBe(false)
	})

	it('does not touch messages when there are no images at all', () => {
		const context = new AgentContext()
		context.messages.add({ role: 'user', content: 'hi' })

		const built = context.build()

		expect(built).toHaveLength(1)
		expect(built[0].images).toBeUndefined()
	})
})

describe('AgentContext — scope getter/setter', () => {
	it('defaults to no scope (undefined)', () => {
		const context = new AgentContext()

		expect(context.scope).toBeUndefined()
	})

	it('accepts an initial scope via options', () => {
		const scope = new Scope({ name: 's' })
		const context = new AgentContext({ scope })

		expect(context.scope).toBe(scope)
	})

	it('is mutable through the setter', () => {
		const context = new AgentContext()
		const scope = new Scope({ name: 's' })

		context.scope = scope
		expect(context.scope).toBe(scope)

		context.scope = undefined
		expect(context.scope).toBeUndefined()
	})
})

describe('AgentContext — scope filtering in build()', () => {
	function seed(): AgentContext {
		const context = new AgentContext({ system: 'sys' })
		context.instructions.add([
			{ name: 'keep-i', content: 'KEPT INSTRUCTION' },
			{ name: 'drop-i', content: 'DROPPED INSTRUCTION' },
		])
		context.messages.add([
			{ role: 'user', content: 'first' },
			{ role: 'user', content: 'second' },
		])
		return context
	}

	it('an undefined scope passes EVERYTHING (no filtering)', () => {
		const context = seed()

		const built = context.build()
		const block = built[0].content

		expect(block).toContain('KEPT INSTRUCTION')
		expect(block).toContain('DROPPED INSTRUCTION')
		expect(built.filter((message) => message.role === 'user')).toHaveLength(2)
	})

	it('a named allow-list keeps only the listed instructions', () => {
		const context = seed()
		context.scope = new Scope({ name: 'narrowed', instructions: ['keep-i'] })

		const built = context.build()
		const block = built[0].content

		expect(block).toContain('KEPT INSTRUCTION')
		expect(block).not.toContain('DROPPED INSTRUCTION')
	})

	it('an empty allow-list ([]) drops EVERY item of that category', () => {
		const context = seed()
		context.scope = new Scope({ name: 'no-instructions', instructions: [] })

		const block = context.build()[0].content

		// The whole Instructions section vanishes.
		expect(block).not.toContain('## Instructions')
		expect(block).not.toContain('KEPT INSTRUCTION')
	})

	it('reflects a scope swapped between builds (recomputed fresh, no shared state)', () => {
		const context = seed()

		context.scope = new Scope({ name: 'only-keep', instructions: ['keep-i'] })
		expect(context.build()[0].content).not.toContain('DROPPED INSTRUCTION')

		// Swap to no scope — the dropped instruction reappears on the next build.
		context.scope = undefined
		expect(context.build()[0].content).toContain('DROPPED INSTRUCTION')
	})
})

// The FORMAT CASCADE — build(format?) frames each section as [open, ...render, close] and
// resolves each slot MOST-SPECIFIC-FIRST: open = manager-options override > provider default
// > built-in; render = item override > manager-options > provider > built-in; close =
// manager-options > provider (NO built-in ⇒ no closing line). These pin the precedence at
// EACH slot/level over the instructions section + the no-arg regression guard + the per-item
// round-trip reaching build + the close coverage (AGENTS §16 — real behavior, no mocks).
describe('AgentContext — format cascade: the instructions open (header)', () => {
	// Resolve just the instructions `open` at each level. A single instruction so the block is
	// `<open>\n\n<render>`; we read the open (the part before the render).
	function openFor(
		format: ContextFormatInterface | undefined,
		options?: { managerOpen?: string },
	): string {
		const managerOpen = options?.managerOpen
		const instructions =
			managerOpen === undefined
				? new InstructionManager()
				: new InstructionManager({ format: { open: managerOpen } })
		const context = new AgentContext({ instructions })
		context.instructions.add({ name: 'a', content: 'X' })
		const block = context.build(format)[0].content
		return block.split('\n\n')[0]
	}

	it('(a) built-in floor — no provider format, no manager override', () => {
		expect(openFor(undefined)).toBe('## Instructions')
	})

	it('(b) provider default BEATS the built-in', () => {
		expect(openFor({ instructions: { open: 'P-HEADER' } })).toBe('P-HEADER')
	})

	it('(c) manager-options override BEATS the provider default', () => {
		const header = openFor({ instructions: { open: 'P-HEADER' } }, { managerOpen: 'M-HEADER' })
		expect(header).toBe('M-HEADER')
	})
})

describe('AgentContext — format cascade: an instruction item (render)', () => {
	// Resolve just the per-item render at each level (the part after the header).
	function renderFor(
		format: ContextFormatInterface | undefined,
		options?: { managerRender?: string; itemFormat?: string },
	): string {
		const managerRender = options?.managerRender
		const instructions =
			managerRender === undefined
				? new InstructionManager()
				: new InstructionManager({ format: { render: () => managerRender } })
		const context = new AgentContext({ instructions })
		context.instructions.add({
			name: 'a',
			content: 'BUILTIN',
			...(options?.itemFormat === undefined ? {} : { format: options.itemFormat }),
		})
		const block = context.build(format)[0].content
		return block.split('\n\n')[1]
	}

	it('(a) built-in floor — the instruction content', () => {
		expect(renderFor(undefined)).toBe('BUILTIN')
	})

	it('(b) provider default BEATS the built-in', () => {
		expect(renderFor({ instructions: { render: () => 'P-RENDER' } })).toBe('P-RENDER')
	})

	it('(c) manager-options override BEATS the provider default', () => {
		const render = renderFor(
			{ instructions: { render: () => 'P-RENDER' } },
			{ managerRender: 'M-RENDER' },
		)
		expect(render).toBe('M-RENDER')
	})

	it('(d) item override BEATS the manager-options override (and everything below)', () => {
		const render = renderFor(
			{ instructions: { render: () => 'P-RENDER' } },
			{ managerRender: 'M-RENDER', itemFormat: 'ITEM' },
		)
		expect(render).toBe('ITEM')
	})

	it('an item override alone beats the built-in (no provider, no manager override)', () => {
		expect(renderFor(undefined, { itemFormat: 'ITEM' })).toBe('ITEM')
	})
})

// The CLOSE slot — the bottom line a section renders ONCE after its items, so `open` + `close`
// WRAP the whole group (`<instructions>` … `</instructions>`). It has NO built-in floor (unlike
// open / render), so an unset close yields no closing line; it cascades manager-options > provider.
// These pin the group-wrap assembly, close-without-open, the items-empty guard winning over a
// set close, and the close cascade (AGENTS §16 — real behavior, no mocks).
describe('AgentContext — format cascade: the close slot (group wrap)', () => {
	it('open + close WRAP the group — [open, ...items, close] in order, blank-line joined', () => {
		// A two-instruction section framed by a manager-options open/render/close. The whole section
		// block is exactly the opening tag, each rendered item, then the closing tag — in order.
		const instructions = new InstructionManager({
			format: {
				open: '<instructions>',
				render: (i) => `<i>${i.name}</i>`,
				close: '</instructions>',
			},
		})
		const context = new AgentContext({ instructions })
		context.instructions.add([
			{ name: 'a', content: 'X' },
			{ name: 'b', content: 'Y' },
		])

		// The system block is the single instructions section — byte-for-byte the wrapped group.
		expect(context.build()[0].content).toBe(
			'<instructions>\n\n<i>a</i>\n\n<i>b</i>\n\n</instructions>',
		)
	})

	it('a close with NO open still appends — the open falls to the built-in header', () => {
		// Only `close` is set (no `open`): the open resolves to the built-in header, and the close
		// is still appended after the items. So a section can close without customizing its open.
		const instructions = new InstructionManager({ format: { close: '</instructions>' } })
		const context = new AgentContext({ instructions })
		context.instructions.add({ name: 'a', content: 'X' })

		expect(context.build()[0].content).toBe('## Instructions\n\nX\n\n</instructions>')
	})

	it('a close with ZERO items omits the section entirely — no stray open/close', () => {
		// The items-empty guard wins: an empty (or fully scoped-out) section contributes NOTHING,
		// so neither the open nor the close leaks a dangling wrapper around no content.
		const instructions = new InstructionManager({
			format: { open: '<instructions>', close: '</instructions>' },
		})
		const context = new AgentContext({ system: 'sys', instructions })
		// No instructions added ⇒ the section is silent; only the system prompt remains.
		expect(context.build()[0].content).toBe('sys')
		// And with a scope that fully excludes the (now-present) instruction, still silent.
		context.instructions.add({ name: 'a', content: 'X' })
		context.scope = new Scope({ name: 'none', instructions: [] })
		expect(context.build()[0].content).toBe('sys')
	})

	it('the close cascade — manager-options close BEATS the provider close', () => {
		// close = manager-options > provider (no built-in). A manager-options close overrides the
		// provider's close for that section; a section with neither has no closing line.
		const instructions = new InstructionManager({ format: { close: '</M>' } })
		const context = new AgentContext({ instructions })
		context.instructions.add({ name: 'a', content: 'X' })

		const block = context.build({ instructions: { close: '</P>' } })[0].content
		expect(block.endsWith('</M>')).toBe(true)
		expect(block).not.toContain('</P>')
	})

	it('a provider close alone applies when the manager sets none', () => {
		// With no manager-options close, the provider's close is used (the next cascade level).
		const context = new AgentContext()
		context.instructions.add({ name: 'a', content: 'X' })

		const block = context.build({ instructions: { close: '</P>' } })[0].content
		expect(block.endsWith('</P>')).toBe(true)
	})

	it('no close anywhere ⇒ NO closing line (the built-in floor has no close)', () => {
		// The regression invariant for the slot: absent at every level ⇒ the section ends at its
		// last item, exactly as before this slot existed (byte-for-byte the prior output).
		const context = new AgentContext()
		context.instructions.add({ name: 'a', content: 'X' })

		expect(context.build()[0].content).toBe('## Instructions\n\nX')
	})
})

describe('AgentContext — format cascade: the no-arg regression guard', () => {
	it('build() with NO format arg reproduces the built-in framing byte-for-byte', () => {
		// The load-bearing regression: no provider format + no manager overrides + no
		// per-item format ⇒ today's exact output. Compare build(undefined) to the assembled
		// built-in strings (the snapshot the prior tests pin).
		const context = new AgentContext({ system: 'You are concise.' })
		const tone = context.instructions.add({ name: 'tone', content: 'Be terse.' })
		context.messages.add({ role: 'user', content: 'hi' })

		const expected = [
			'You are concise.',
			`${context.instructions.description}\n\n${context.instructions.format(tone)}`,
		].join('\n\n')

		expect(context.build()[0].content).toBe(expected)
		// And explicitly: it equals the hardcoded built-in strings (no override anywhere).
		expect(context.build()[0].content).toBe('You are concise.\n\n## Instructions\n\nBe terse.')
	})

	it('passing an EMPTY provider format ({}) is identical to passing none', () => {
		const context = new AgentContext({ system: 'sys' })
		context.instructions.add({ name: 'a', content: 'do this' })

		expect(context.build({})[0].content).toBe(context.build()[0].content)
	})

	it('a per-item format reaches build() and overrides for that item only', () => {
		const context = new AgentContext()
		context.instructions.add([
			{ name: 'a', content: 'plain-a', format: 'OVERRIDE-A' },
			{ name: 'b', content: 'plain-b' },
		])

		const block = context.build()[0].content

		// 'a' renders via its per-item override; 'b' via the built-in content — same section.
		expect(block).toContain('OVERRIDE-A')
		expect(block).toContain('plain-b')
		expect(block).not.toContain('plain-a')
	})
})

// The CANONICAL build() shape — the exact top-level MessageInterface[] is `[system-block,
// ...conversation]` and NOTHING else: one assembled system message (the prompt + the
// instructions section + the active workspace's text section, `\n\n`-separated), then the
// scope-filtered conversation in insertion order. The cascade tests above pin per-section
// formatting; this pins the WHOLE array's structure verbatim so the canonical order +
// concatenation can't silently drift (AGENTS §16 — real behavior).
describe('AgentContext — the canonical built array (order + exact concatenation)', () => {
	it('builds EXACTLY [system-block, ...conversation] — the system content is prompt + instructions + workspace', () => {
		const context = new AgentContext({ system: 'You are concise.' })
		const tone = context.instructions.add({ name: 'tone', content: 'Be terse.' })
		context.workspaces.add().write('notes.md', '# Notes')
		const turns = context.messages.add([
			{ role: 'user', content: 'one' },
			{ role: 'assistant', content: 'two' },
			{ role: 'user', content: 'three' },
		])

		const built = context.build()

		// The array is the assembled system block followed by the conversation, in order —
		// exactly one leading system message, then each turn's id/role/content verbatim.
		expect(built).toHaveLength(4)
		expect(built[0].role).toBe('system')
		expect(built.map((message) => message.role)).toEqual(['system', 'user', 'assistant', 'user'])
		expect(
			built
				.slice(1)
				.map((message) => ({ id: message.id, role: message.role, content: message.content })),
		).toEqual(turns.map((turn) => ({ id: turn.id, role: turn.role, content: turn.content })))
		// The system block content is the prompt + the instructions section + the workspace section,
		// in the canonical order, blank-line separated — the precise concatenation, byte-for-byte.
		expect(built[0].content).toBe(
			[
				'You are concise.',
				`${context.instructions.description}\n\n${context.instructions.format(tone)}`,
				`${WORKSPACE_SECTION_HEADER}\n\nFile: notes.md\n\`\`\`markdown\n# Notes\n\`\`\``,
			].join('\n\n'),
		)
	})

	it('with no system prompt the array is EXACTLY [managers-block, ...conversation]', () => {
		// The block exists from the instruction manager alone (no system prompt) — still ONE leading
		// system message, then the conversation, in that fixed order.
		const context = new AgentContext()
		context.instructions.add({ name: 'a', content: 'do this' })
		context.messages.add([
			{ role: 'user', content: 'q' },
			{ role: 'assistant', content: 'a' },
		])

		const built = context.build()

		expect(built.map((message) => message.role)).toEqual(['system', 'user', 'assistant'])
		expect(built[0].content).toBe('## Instructions\n\ndo this')
		expect(built.slice(1).map((message) => message.content)).toEqual(['q', 'a'])
	})
})

// The DEFAULT FORMAT snapshot guard — pins the built-in instructions section's header AND
// per-item rendering VERBATIM, in isolation, so a silent drift in any default framing fails
// loudly. (The no-arg regression guard above pins the assembled whole; this pins the piece on
// its own.) AGENTS §16 — real behavior, no mocks.
describe('AgentContext — default format snapshot guard (built-ins verbatim)', () => {
	it('instructions: `## Instructions` header + bare content, no decoration', () => {
		const context = new AgentContext()
		context.instructions.add({ name: 'tone', content: 'Be terse.' })

		expect(context.build()[0].content).toBe('## Instructions\n\nBe terse.')
	})

	it('workspace text: `## Workspace` header + a fenced `File: <path>` block in the inferred language', () => {
		const context = new AgentContext()
		context.workspaces.add().write('README.md', '# Title')

		// The fenced block: `File: <path>` then a ```<language> … ``` fence (language inferred from
		// the extension — `.md` ⇒ markdown), the content verbatim inside.
		expect(context.build()[0].content).toBe(
			`${WORKSPACE_SECTION_HEADER}\n\nFile: README.md\n\`\`\`markdown\n# Title\n\`\`\``,
		)
	})

	it('workspace text: a `.ts` path infers the `typescript` fence language', () => {
		const context = new AgentContext()
		context.workspaces.add().write('src/main.ts', 'const x = 1')

		expect(context.build()[0].content).toBe(
			`${WORKSPACE_SECTION_HEADER}\n\nFile: src/main.ts\n\`\`\`typescript\nconst x = 1\n\`\`\``,
		)
	})
})

// The MESSAGE SOURCE is the `conversations` registry's ACTIVE conversation: `context.messages` IS
// that conversation's live tail, and build() folds its view() (the per-section summaries + the live
// tail). The context ALWAYS has an active conversation (a default is added at construction when the
// supplied manager has none), so `messages` is always defined. The scope's instructions still filter
// the system block; the scope's MESSAGES allow-list is NOT applied (the conversation is
// authoritative). A manager is supplied via AgentContextOptions.conversations; `manager.add()` mints
// + auto-activates a conversation we can hold a reference to. AGENTS §16 — real behavior, a data-stub
// summarizer (not a behavior-mock).
describe('AgentContext — the active conversation as the message source', () => {
	it('context.messages IS the active conversation itself (same instance — it owns its messages directly)', () => {
		const conversations = new ConversationManager()
		const conversation = conversations.add() // auto-activates
		const context = new AgentContext({ conversations })

		// The active Conversation owns its live tail + the message verbs directly, so the dynamic
		// `messages` getter returns the conversation ITSELF (no separate per-value manager).
		expect(context.messages).toBe(conversation)
		expect(context.conversations).toBe(conversations)
		expect(context.conversations.active).toBe(conversation)
	})

	it('adds a default active conversation when none is supplied (messages always defined)', () => {
		const context = new AgentContext()

		// A fresh registry holding one auto-activated default conversation — messages is its live tail.
		expect(context.conversations).toBeInstanceOf(ConversationManager)
		expect(context.conversations.count).toBe(1)
		expect(context.conversations.active).toBeDefined()
		expect(context.messages).toBe(context.conversations.active)
		expect(context.messages.count).toBe(0)
	})

	it('adds a default active conversation when the SUPPLIED registry is empty', () => {
		const conversations = new ConversationManager() // empty — no active yet
		const context = new AgentContext({ conversations })

		// The context ensured an active conversation on the supplied (empty) registry.
		expect(context.conversations).toBe(conversations)
		expect(conversations.count).toBe(1)
		expect(context.messages).toBe(conversations.active)
	})

	it('build() folds the active conversation view() — the live tail before any compaction', () => {
		const context = new AgentContext({ system: 'sys' })
		// Appending through context.messages writes to the active conversation's live tail.
		context.messages.add([
			{ role: 'user', content: 'one' },
			{ role: 'assistant', content: 'two' },
		])

		const built = context.build()

		// [system, ...conversation.view()] — and view() before compaction is the live tail.
		expect(built.map((message) => message.role)).toEqual(['system', 'user', 'assistant'])
		expect(built.slice(1).map((message) => message.content)).toEqual(['one', 'two'])
	})

	it('after a compact(), build() reflects the COMPACTED view (section summary + live tail)', async () => {
		const stub = createStubSummarizer()
		const conversations = new ConversationManager({ summarize: stub.summarize })
		const conversation = conversations.add()
		const context = new AgentContext({ conversations })
		conversation.add([
			{ role: 'user', content: 'old-1' },
			{ role: 'user', content: 'old-2' },
			{ role: 'user', content: 'recent' },
		])

		// Fold the two oldest into a summarized section, keeping the most recent live.
		await conversation.compact({ keep: 1 })
		const built = context.build()

		// build() now carries the section's FRAMED recap message THEN the retained live message —
		// exactly the conversation's view(), proving compaction reaches build().
		expect(built.map((message) => message.content)).toEqual([
			`${CONVERSATION_RECAP_PREFIX}recap of 2`,
			'recent',
		])
		expect(built).toEqual(conversation.view())
		// The compacted originals are gone from the folded-in view (only the summary remains).
		expect(JSON.stringify(built)).not.toContain('old-1')
		expect(JSON.stringify(built)).not.toContain('old-2')
	})

	it('the scope still filters instructions on the conversation path', () => {
		const context = new AgentContext()
		context.instructions.add([
			{ name: 'keep', content: 'KEPT' },
			{ name: 'drop', content: 'DROPPED' },
		])
		context.messages.add({ role: 'user', content: 'hi' })
		context.scope = new Scope({ name: 'instr', instructions: ['keep'] })

		const block = context.build()[0].content

		// Instructions are still scope-filtered (the conversation only governs MESSAGES).
		expect(block).toContain('KEPT')
		expect(block).not.toContain('DROPPED')
	})

	it('attaches the active workspace’s image data to the LAST user message of the conversation view', () => {
		const context = new AgentContext()
		context.workspaces.add({
			seed: [
				[
					'pic.png',
					createFile({ path: 'pic.png', content: createBinaryContent('IMG', 'image/png') }),
				],
			],
		})
		context.messages.add([
			{ role: 'user', content: 'first' },
			{ role: 'assistant', content: 'reply' },
			{ role: 'user', content: 'last' },
		])

		const built = context.build()

		// The image attachment applies to the conversation's view output too.
		expect(built.at(-1)?.content).toBe('last')
		expect(built.at(-1)?.images).toEqual(['IMG'])
	})
})

describe('AgentContext — the default-conversation message path is byte-for-byte the prior output', () => {
	it('the default active conversation backs context.messages (identity-stable, empty)', () => {
		const context = new AgentContext()

		// The auto-added default conversation IS the message source — identity-stable across reads.
		expect(context.conversations.active).toBeDefined()
		expect(context.messages.count).toBe(0)
		expect(context.messages).toBe(context.messages)
	})

	it('build() through the default conversation is byte-for-byte the prior plain output', () => {
		const context = new AgentContext({ system: 'You are concise.' })
		const tone = context.instructions.add({ name: 'tone', content: 'Be terse.' })
		context.messages.add([
			{ role: 'user', content: 'one' },
			{ role: 'assistant', content: 'two' },
		])

		const built = context.build()

		// Identical to the established shape: [system-block, ...conversation].
		expect(built.map((message) => message.role)).toEqual(['system', 'user', 'assistant'])
		expect(built[0].content).toBe(
			[
				'You are concise.',
				`${context.instructions.description}\n\n${context.instructions.format(tone)}`,
			].join('\n\n'),
		)
		expect(built.slice(1).map((message) => message.content)).toEqual(['one', 'two'])
	})
})

// The MESSAGE SOURCE switches by re-pointing the registry's ACTIVE conversation
// (`conversations.switch(id)`) OR swapping the whole registry (`context.conversations = ...`, a
// settable mutable property like `scope` / `workspaces`). The DYNAMIC `messages` getter then points
// at the new active conversation's live tail (the SAME reference, no duplication) and `build()` folds
// its `view()`. This is the multi-conversation mechanism: ONE agent serving many threads by switching
// the active conversation between runs (AGENTS §16 — real behavior, a data-stub summarizer).
describe('AgentContext — switching the active conversation (multi-conversation)', () => {
	it('conversations.switch(id) swaps messages to the NEW active conversation (same reference)', () => {
		const conversations = new ConversationManager()
		const a = conversations.add({ id: 'a' }) // auto-activates
		const b = conversations.add({ id: 'b' })
		const context = new AgentContext({ conversations })

		// Initially `messages` IS conversation a itself (the first add auto-activated it).
		expect(context.messages).toBe(a)

		// Switch the active conversation to b — `messages` now points at b, by identity.
		conversations.switch('b')
		expect(context.conversations.active).toBe(b)
		expect(context.messages).toBe(b)
		// And it is the SAME reference b exposes (no copy): a write through context.messages lands on b.
		context.messages.add({ role: 'user', content: 'for-b' })
		expect(b.messages().map((message) => message.content)).toEqual(['for-b'])
		expect(a.count).toBe(0)
	})

	it('setting context.conversations swaps the whole registry (and ensures an active conversation)', () => {
		const context = new AgentContext()
		// Author some history on the original default conversation.
		context.messages.add({ role: 'user', content: 'original' })
		const original = context.messages

		// Swap to a fresh registry — `messages` redirects to its active conversation; the original
		// conversation is untouched (a different registry).
		const next = new ConversationManager()
		const conv = next.add()
		conv.add({ role: 'user', content: 'next-1' })
		context.conversations = next
		expect(context.conversations).toBe(next)
		expect(context.messages).toBe(conv)
		expect(context.build().map((message) => message.content)).toEqual(['next-1'])
		// The original conversation (no longer the message source) kept its own history intact.
		expect(original.messages().map((message) => message.content)).toEqual(['original'])
	})

	it('setting an EMPTY registry adds a default active conversation (messages stays defined)', () => {
		const context = new AgentContext()
		context.messages.add({ role: 'user', content: 'x' })

		const empty = new ConversationManager() // no active
		context.conversations = empty

		// The setter ensured an active conversation, so messages is still defined + empty.
		expect(empty.count).toBe(1)
		expect(context.messages).toBe(empty.active)
		expect(context.messages.count).toBe(0)
	})

	it('build() reflects whichever conversation is active when it runs (recomputed fresh)', () => {
		const conversations = new ConversationManager()
		const a = conversations.add({ id: 'a' })
		a.add({ role: 'user', content: 'in-a' })
		const b = conversations.add({ id: 'b' })
		b.add({ role: 'user', content: 'in-b' })
		const context = new AgentContext({ system: 'sys', conversations })

		// a is active (the first add) → build folds a's view().
		expect(context.build().map((message) => message.content)).toEqual(['sys', 'in-a'])
		// Switch to b → the NEXT build reflects b (recomputed fresh, no stale a content).
		conversations.switch('b')
		const built = context.build()
		expect(built.map((message) => message.content)).toEqual(['sys', 'in-b'])
		expect(JSON.stringify(built)).not.toContain('in-a')
	})

	it('after a compact() on a conversation, build() reflects the compacted view through the switch', async () => {
		const stub = createStubSummarizer()
		const conversations = new ConversationManager({ summarize: stub.summarize })
		const a = conversations.add({ id: 'a' })
		const b = conversations.add({ id: 'b' })
		const context = new AgentContext({ conversations })
		a.add([
			{ role: 'user', content: 'a-old-1' },
			{ role: 'user', content: 'a-old-2' },
			{ role: 'user', content: 'a-recent' },
		])
		b.add({ role: 'user', content: 'b-live' })

		// Compact a (fold the two oldest, keep the most recent), then confirm build reflects a's
		// compacted view; switch to b and build reflects b's (uncompacted) live tail — independent.
		await a.compact({ keep: 1 })
		conversations.switch('a')
		// a's view() frames the folded section as a recap (the lean RECAP label), then the live tail.
		expect(context.build().map((message) => message.content)).toEqual([
			`${CONVERSATION_RECAP_PREFIX}recap of 2`,
			'a-recent',
		])
		conversations.switch('b')
		expect(context.build().map((message) => message.content)).toEqual(['b-live'])
		// a's compaction did not leak into b.
		expect(b.sections.length).toBe(0)
	})
})
