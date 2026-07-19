import {
	Conversation,
	ConversationManager,
	createMemoryConversationStore,
	isConversationError,
} from '@src/core'
import { describe, expect, it } from 'vitest'
import { createStubSummarizer } from '../../../setup.js'

// ConversationManager is the §9 registry over the conversation layer WITH an active pointer — an
// insertion-ordered store keyed by id (add / conversation / conversations / count / remove(id|ids[])
// / clear) PLUS active / switch. Event-free (each Conversation owns its own emitter). The first add
// auto-activates; a later add leaves active; switch re-points it; removing the active (or clear)
// clears it. The manager's default summarize / keep flow into every conversation it creates; a
// per-add override wins (AGENTS §16 — real behavior, a data-stub summarizer, NOT a behavior-mock).

describe('ConversationManager — add / accessors / count', () => {
	it('starts empty with no active conversation', () => {
		const manager = new ConversationManager()

		expect(manager.count).toBe(0)
		expect(manager.conversations()).toEqual([])
		expect(manager.active).toBeUndefined()
	})

	it('add() mints a Conversation, stores it, and returns it', () => {
		const manager = new ConversationManager()

		const conversation = manager.add()

		expect(conversation).toBeInstanceOf(Conversation)
		expect(manager.count).toBe(1)
		expect(manager.conversation(conversation.id)).toBe(conversation)
		expect(manager.conversations()).toEqual([conversation])
	})

	it('add({ id }) uses the supplied id', () => {
		const manager = new ConversationManager()

		const conversation = manager.add({ id: 'fixed' })

		expect(conversation.id).toBe('fixed')
		expect(manager.conversation('fixed')).toBe(conversation)
	})

	it('conversation(id) returns undefined for an unknown id', () => {
		const manager = new ConversationManager()

		expect(manager.conversation('nope')).toBeUndefined()
	})

	it('conversations() lists in insertion order', () => {
		const manager = new ConversationManager()
		const a = manager.add({ id: 'a' })
		const b = manager.add({ id: 'b' })
		const c = manager.add({ id: 'c' })

		expect(manager.conversations()).toEqual([a, b, c])
	})

	it('a re-add of the same id OVERWRITES (last write wins)', () => {
		const manager = new ConversationManager()
		const first = manager.add({ id: 'dup' })
		const second = manager.add({ id: 'dup' })

		expect(manager.count).toBe(1)
		expect(manager.conversation('dup')).toBe(second)
		expect(manager.conversation('dup')).not.toBe(first)
	})
})

describe('ConversationManager — active pointer + switch + auto-activate', () => {
	it('the FIRST add auto-activates; a later add leaves active unchanged', () => {
		const manager = new ConversationManager()

		const first = manager.add({ id: 'a' })
		expect(manager.active).toBe(first) // first add auto-activates

		const second = manager.add({ id: 'b' })
		expect(manager.active).toBe(first) // a later add does NOT steal active
		expect(second).not.toBe(first)
	})

	it('switch(id) re-points active and returns it', () => {
		const manager = new ConversationManager()
		manager.add({ id: 'a' })
		const b = manager.add({ id: 'b' })

		const switched = manager.switch('b')

		expect(switched).toBe(b)
		expect(manager.active).toBe(b)
	})

	it('switch(unknownId) returns undefined and leaves active unchanged', () => {
		const manager = new ConversationManager()
		const a = manager.add({ id: 'a' })

		expect(manager.switch('ghost')).toBeUndefined()
		expect(manager.active).toBe(a) // unchanged — lenient, no throw
	})

	it('the active pointer follows a re-add of the active id (live lookup, never stale)', () => {
		const manager = new ConversationManager()
		manager.add({ id: 'a' }) // active
		const replacement = manager.add({ id: 'a' }) // overwrite the active id

		expect(manager.active).toBe(replacement)
	})
})

describe('ConversationManager — remove (§9.2) / clear', () => {
	it('remove(id) drops one and reports whether any was removed', () => {
		const manager = new ConversationManager()
		manager.add({ id: 'a' })
		manager.add({ id: 'b' })

		expect(manager.remove('a')).toBe(true)
		expect(manager.remove('missing')).toBe(false)
		expect(manager.count).toBe(1)
		expect(manager.conversation('a')).toBeUndefined()
		expect(manager.conversation('b')).toBeDefined()
	})

	it('remove(ids[]) drops a batch — true when ANY was removed', () => {
		const manager = new ConversationManager()
		manager.add({ id: 'a' })
		manager.add({ id: 'b' })
		manager.add({ id: 'c' })

		expect(manager.remove(['a', 'c', 'ghost'])).toBe(true)
		expect(manager.count).toBe(1)
		expect(manager.conversations().map((one) => one.id)).toEqual(['b'])
	})

	it('remove(ids[]) of only-absent ids returns false', () => {
		const manager = new ConversationManager()
		manager.add({ id: 'a' })

		expect(manager.remove(['x', 'y'])).toBe(false)
		expect(manager.count).toBe(1)
	})

	it('removing the ACTIVE conversation clears active', () => {
		const manager = new ConversationManager()
		manager.add({ id: 'a' }) // auto-active
		manager.add({ id: 'b' })

		expect(manager.remove('a')).toBe(true)
		expect(manager.active).toBeUndefined() // the active one was removed
	})

	it('removing a NON-active conversation leaves active intact', () => {
		const manager = new ConversationManager()
		const a = manager.add({ id: 'a' }) // auto-active
		manager.add({ id: 'b' })

		expect(manager.remove('b')).toBe(true)
		expect(manager.active).toBe(a) // still pointing at a
	})

	it('removing the active in a BATCH clears active', () => {
		const manager = new ConversationManager()
		manager.add({ id: 'a' }) // auto-active
		manager.add({ id: 'b' })

		expect(manager.remove(['a', 'b'])).toBe(true)
		expect(manager.active).toBeUndefined()
	})

	it('clear empties the registry and clears active', () => {
		const manager = new ConversationManager()
		manager.add({ id: 'a' })
		manager.add({ id: 'b' })

		manager.clear()

		expect(manager.count).toBe(0)
		expect(manager.conversations()).toEqual([])
		expect(manager.active).toBeUndefined()
	})
})

describe('ConversationManager — the default summarize flows into created conversations', () => {
	it("created conversations inherit the manager's default summarizer (compact works)", async () => {
		const stub = createStubSummarizer()
		const manager = new ConversationManager({ summarize: stub.summarize })
		const conversation = manager.add()
		conversation.add([
			{ role: 'user', content: 'a' },
			{ role: 'user', content: 'b' },
		])

		const section = await conversation.compact()

		// The manager's summarizer drove the fold — proving it flowed into the conversation.
		expect(section?.summary).toBe('recap of 2')
		expect(stub.calls.length).toBeGreaterThan(0)
	})

	it('a manager with NO default summarizer creates a conversation that cannot compact', async () => {
		const manager = new ConversationManager()
		const conversation = manager.add()
		conversation.add({ role: 'user', content: 'a' })

		await expect(conversation.compact()).rejects.toSatisfy(
			(error: unknown) => isConversationError(error) && error.code === 'SUMMARIZER',
		)
	})
})

describe('ConversationManager — the default keep flows in, and per-add overrides win', () => {
	it("created conversations inherit the manager's default keep", async () => {
		const stub = createStubSummarizer()
		const manager = new ConversationManager({ summarize: stub.summarize, keep: 1 })
		const conversation = manager.add()
		conversation.add([
			{ role: 'user', content: 'x' },
			{ role: 'user', content: 'y' },
		])

		await conversation.compact()

		// keep: 1 flowed in ⇒ only the oldest folded, the most recent stays live.
		expect(conversation.messages().map((one) => one.content)).toEqual(['y'])
	})

	it('a per-add keep OVERRIDES the manager default', async () => {
		const stub = createStubSummarizer()
		const manager = new ConversationManager({ summarize: stub.summarize, keep: 5 })
		const conversation = manager.add({ keep: 0 })
		conversation.add([
			{ role: 'user', content: 'x' },
			{ role: 'user', content: 'y' },
		])

		await conversation.compact()

		// The per-add keep: 0 wins over the manager's keep: 5 ⇒ all folded.
		expect(conversation.count).toBe(0)
	})

	it('a per-add summarize OVERRIDES the manager default', async () => {
		const managerStub = createStubSummarizer()
		const overrideStub = createStubSummarizer()
		const manager = new ConversationManager({ summarize: managerStub.summarize })
		const conversation = manager.add({ summarize: overrideStub.summarize })
		conversation.add({ role: 'user', content: 'a' })

		await conversation.compact()

		// Only the per-add summarizer was called; the manager default was bypassed.
		expect(overrideStub.calls.length).toBeGreaterThan(0)
		expect(managerStub.calls).toHaveLength(0)
	})
})

describe('ConversationManager — the default sections cap flows in, and per-add overrides win', () => {
	it("created conversations inherit the manager's default sections cap", async () => {
		const stub = createStubSummarizer()
		const manager = new ConversationManager({ summarize: stub.summarize, sections: 1 })
		const conversation = manager.add()

		conversation.add({ role: 'user', content: 'a' })
		await conversation.compact()
		conversation.add({ role: 'user', content: 'b' })
		await conversation.compact()

		// sections: 1 flowed in ⇒ the second fold merges into the cap of 1.
		expect(conversation.sections).toHaveLength(1)
	})

	it('a per-add sections OVERRIDES the manager default', async () => {
		const stub = createStubSummarizer()
		const manager = new ConversationManager({ summarize: stub.summarize, sections: 5 })
		const conversation = manager.add({ sections: 1 })

		conversation.add({ role: 'user', content: 'a' })
		await conversation.compact()
		conversation.add({ role: 'user', content: 'b' })
		await conversation.compact()

		// The per-add sections: 1 wins over the manager's sections: 5 ⇒ capped at 1.
		expect(conversation.sections).toHaveLength(1)
	})

	it('with no manager default and no per-add override, sections stay unbounded', async () => {
		const stub = createStubSummarizer()
		const manager = new ConversationManager({ summarize: stub.summarize })
		const conversation = manager.add()

		conversation.add({ role: 'user', content: 'a' })
		await conversation.compact()
		conversation.add({ role: 'user', content: 'b' })
		await conversation.compact()

		expect(conversation.sections).toHaveLength(2)
	})
})

describe('ConversationManager — created conversations are independent', () => {
	it('each conversation has its own live tail + sections', async () => {
		const stub = createStubSummarizer()
		const manager = new ConversationManager({ summarize: stub.summarize })
		const a = manager.add({ id: 'a' })
		const b = manager.add({ id: 'b' })

		a.add({ role: 'user', content: 'only in a' })
		await a.compact()

		expect(a.sections).toHaveLength(1)
		expect(b.sections).toHaveLength(0)
		expect(b.count).toBe(0)
	})
})

describe('ConversationManager — durable open / save (the optional store seam)', () => {
	// Seed a registered conversation with a compacted section + a live tail + a rollup summary (a
	// genuine compaction over the stub summarizer), so a round-trip is NON-VACUOUS in every field.
	async function seedConversation(manager: ConversationManager, id: string): Promise<void> {
		const conversation = manager.add({ id })
		conversation.add([
			{ role: 'user', content: 'first' },
			{ role: 'assistant', content: 'second' },
			{ role: 'user', content: 'third' },
		])
		await conversation.compact() // keep defaults to 0 here unless overridden — fold all but...
	}

	it('open(id) activates an ALREADY-registered conversation WITHOUT a store hit', async () => {
		// A registry hit short-circuits — no store needed, the live conversation is returned + activated.
		const store = createMemoryConversationStore()
		const manager = new ConversationManager({ summarize: createStubSummarizer().summarize, store })
		manager.add({ id: 'a' }) // auto-active
		const b = manager.add({ id: 'b' })

		const opened = await manager.open('b')

		expect(opened).toBe(b) // the SAME live instance
		expect(manager.active).toBe(b) // activated
	})

	it('open(id) HYDRATES from the store on a registry miss (sections + tail + summary restored)', async () => {
		const store = createMemoryConversationStore()
		// Persist a conversation through one manager, with keep: 1 so BOTH a section and a live tail exist.
		const source = new ConversationManager({ summarize: createStubSummarizer().summarize, keep: 1 })
		const original = source.add({ id: 'persisted' })
		original.add([
			{ role: 'user', content: 'first' },
			{ role: 'assistant', content: 'second' },
			{ role: 'user', content: 'third' },
		])
		await original.compact()
		await store.set(original.snapshot())

		// A FRESH manager over the SAME store opens the persisted id back — a registry miss hydrates it.
		const manager = new ConversationManager({
			summarize: createStubSummarizer().summarize,
			keep: 1,
			store,
		})
		const opened = await manager.open('persisted')

		expect(opened).toBeDefined()
		if (opened === undefined) return
		// The rehydrated conversation equals the original's snapshot field-for-field.
		expect(opened.id).toBe('persisted')
		expect(opened.snapshot()).toEqual(original.snapshot())
		expect(opened.sections).toHaveLength(1)
		expect(opened.summary).toBe(original.summary)
		expect(opened.messages().map((one) => one.content)).toEqual(['third'])
		// It is registered AND activated, and a fresh-built conversation (not the original instance).
		expect(manager.conversation('persisted')).toBe(opened)
		expect(manager.active).toBe(opened)
		expect(opened).not.toBe(original)
	})

	it("a rehydrated conversation's view() and search() work over the restored state", async () => {
		const store = createMemoryConversationStore()
		const source = new ConversationManager({ summarize: createStubSummarizer().summarize, keep: 1 })
		const original = source.add({ id: 'live' })
		original.add([
			{ role: 'user', content: 'alpha fact' },
			{ role: 'assistant', content: 'beta reply' },
			{ role: 'user', content: 'gamma tail' },
		])
		await original.compact()
		await store.set(original.snapshot())

		const manager = new ConversationManager({
			summarize: createStubSummarizer().summarize,
			keep: 1,
			store,
		})
		const opened = await manager.open('live')
		expect(opened).toBeDefined()
		if (opened === undefined) return

		// view() = the section folded to ONE recap message, then the live tail verbatim.
		const view = opened.view()
		expect(view).toHaveLength(2) // 1 section recap + 1 live message
		expect(view[1]?.content).toBe('gamma tail')
		// search() scans the section's RETAINED originals AND the live tail.
		expect(opened.search('alpha').map((one) => one.content)).toEqual(['alpha fact']) // a folded original
		expect(opened.search('gamma').map((one) => one.content)).toEqual(['gamma tail']) // the live tail
	})

	it('the rehydrated conversation can CONTINUE (its summarizer was re-supplied, so compact works)', async () => {
		// The summarizer is live config re-supplied on hydrate (not serialized) — so a rehydrated
		// conversation can keep folding, proving the seam restored DATA + re-wired CONFIG.
		const store = createMemoryConversationStore()
		const source = new ConversationManager({ summarize: createStubSummarizer().summarize, keep: 1 })
		const original = source.add({ id: 'cont' })
		original.add([
			{ role: 'user', content: 'a' },
			{ role: 'user', content: 'b' },
		])
		await original.compact()
		await store.set(original.snapshot())

		const manager = new ConversationManager({ summarize: createStubSummarizer().summarize, store })
		const opened = await manager.open('cont')
		expect(opened).toBeDefined()
		if (opened === undefined) return

		// Add more + compact again — the re-supplied summarizer drives it (no SUMMARIZER throw).
		opened.add({ role: 'user', content: 'c' })
		const section = await opened.compact()
		expect(section).toBeDefined()
		expect(opened.sections).toHaveLength(2) // the restored one + the new fold
	})

	it('open into a NON-EMPTY registry activates the rehydrated conversation', async () => {
		const store = createMemoryConversationStore()
		const seed = new ConversationManager({ summarize: createStubSummarizer().summarize })
		const persisted = seed.add({ id: 'stored' })
		persisted.add({ role: 'user', content: 'x' })
		await store.set(persisted.snapshot())

		const manager = new ConversationManager({ summarize: createStubSummarizer().summarize, store })
		manager.add({ id: 'existing' }) // auto-active, so the registry is non-empty
		const opened = await manager.open('stored')

		// Even though `add` only auto-activates the FIRST, open explicitly re-points active.
		expect(opened?.id).toBe('stored')
		expect(manager.active?.id).toBe('stored')
	})

	it('open(unknownId) with a store MISS returns undefined (lenient)', async () => {
		const store = createMemoryConversationStore()
		const manager = new ConversationManager({ store })
		expect(await manager.open('never-stored')).toBeUndefined()
	})

	it('open(unknownId) with NO store returns undefined (lenient)', async () => {
		const manager = new ConversationManager()
		expect(await manager.open('ghost')).toBeUndefined()
	})

	it('save(id) persists a registered conversation, and a FRESH manager opens it back', async () => {
		const store = createMemoryConversationStore()
		const manager = new ConversationManager({
			summarize: createStubSummarizer().summarize,
			keep: 1,
			store,
		})
		await seedConversation(manager, 'doc')
		// seedConversation used the manager's keep:1, so a section + a live tail both exist.
		const conversation = manager.conversation('doc')
		expect(conversation).toBeDefined()

		expect(await manager.save('doc')).toBe(true)

		// A fresh manager over the SAME store opens the persisted snapshot back, equal field-for-field.
		const reopened = new ConversationManager({
			summarize: createStubSummarizer().summarize,
			keep: 1,
			store,
		})
		const opened = await reopened.open('doc')
		expect(opened?.snapshot()).toEqual(conversation?.snapshot())
	})

	it('save(id) re-save UPSERTS the latest snapshot', async () => {
		const store = createMemoryConversationStore()
		const manager = new ConversationManager({ summarize: createStubSummarizer().summarize, store })
		const conversation = manager.add({ id: 'evolving' })
		conversation.add({ role: 'user', content: 'one' })
		await manager.save('evolving')

		// Mutate then re-save — the store holds the LATEST.
		conversation.add({ role: 'user', content: 'two' })
		await manager.save('evolving')

		const snapshot = await store.get('evolving')
		expect(snapshot?.messages.map((one) => one.content)).toEqual(['one', 'two'])
	})

	it('save with NO store is a no-op false', async () => {
		const manager = new ConversationManager()
		manager.add({ id: 'a' })
		expect(await manager.save('a')).toBe(false)
	})

	it('save of an UNKNOWN id (with a store) is a no-op false', async () => {
		const store = createMemoryConversationStore()
		const manager = new ConversationManager({ store })
		expect(await manager.save('missing')).toBe(false)
	})
})
