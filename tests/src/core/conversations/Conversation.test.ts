import type { MessageInterface } from '@src/core'
import {
	CONVERSATION_RECAP_PREFIX,
	Conversation,
	ConversationError,
	estimateMessages,
	isConversationError,
} from '@src/core'
import { describe, expect, it } from 'vitest'
import { createErrorRecorder, createStubSummarizer, recordEmitterEvents } from '../../../setup.js'

// The framed recap content a section's summary renders as in view() — the lean RECAP label
// prefix (CONVERSATION_RECAP_PREFIX) + the summary text. Centralizes the framing so these tests
// assert against the ONE source of truth (the exported constant), not a duplicated literal.
const recap = (summary: string): string => `${CONVERSATION_RECAP_PREFIX}${summary}`

// Conversation OWNS its live message tail DIRECTLY (the flat store verbs folded in, like a
// Workspace owns its files) — a live tail plus compacted, summarized sections + a regenerated
// rollup + the `summarizable` flag, with rehydrate / search over the retained originals, driven by
// a provider-agnostic summarizer seam (AGENTS §16 — real behavior, a data-stub summarizer, NOT a
// behavior-mock; the LIVE model is exercised in tests/src/ollama).
// `compact()` folds the older live messages into a section (its summary from the seam),
// regenerates the rollup (a second seam call), and emits `summary` then `compact`; view() =
// section summaries ++ the live tail; rehydrate/search read the retained originals.

describe('Conversation — construction & accessors', () => {
	it('mints an id when none is supplied, and accepts an explicit one', () => {
		const minted = new Conversation()
		const explicit = new Conversation({ id: 'fixed' })

		expect(minted.id.length).toBeGreaterThan(0)
		expect(explicit.id).toBe('fixed')
	})

	it('starts with no sections, an undefined rollup, and an empty live tail', () => {
		const conversation = new Conversation()

		expect(conversation.sections).toEqual([])
		expect(conversation.summary).toBeUndefined()
		expect(conversation.count).toBe(0)
		expect(conversation.view()).toEqual([])
	})

	it('owns its message store directly — add mints + stores, message/messages/count read it back', () => {
		const conversation = new Conversation()

		// `add` mints the id, stores immutably, and returns the created message.
		const turn = conversation.add({ role: 'user', content: 'hi' })
		expect(turn.id.length).toBeGreaterThan(0)
		expect(turn.role).toBe('user')
		expect(turn.content).toBe('hi')
		// The verbs read the same inlined store: count tallies it, message looks one up, messages
		// lists the live tail in insertion order.
		expect(conversation.count).toBe(1)
		expect(conversation.message(turn.id)).toBe(turn)
		expect(conversation.message('nope')).toBeUndefined()
		expect(conversation.messages()).toEqual([turn])
	})

	it('add(batch) mints each id + returns the array; remove + clear drop from the live tail (§9.2)', () => {
		const conversation = new Conversation()

		const [a, b, c] = conversation.add([
			{ role: 'user', content: 'a' },
			{ role: 'assistant', content: 'b' },
			{ role: 'user', content: 'c' },
		])
		expect(conversation.count).toBe(3)
		expect(new Set([a.id, b.id, c.id]).size).toBe(3) // each id distinct

		// remove(id) drops one; remove(ids[]) drops a batch (true when any was removed).
		expect(conversation.remove(a.id)).toBe(true)
		expect(conversation.remove('missing')).toBe(false)
		expect(conversation.remove([b.id, 'missing'])).toBe(true)
		expect(conversation.messages().map((message) => message.content)).toEqual(['c'])

		// clear empties the live tail.
		conversation.clear()
		expect(conversation.count).toBe(0)
		expect(conversation.messages()).toEqual([])
	})

	it('carries calls / images only when supplied (an absent optional is never stored)', () => {
		const conversation = new Conversation()

		const plain = conversation.add({ role: 'user', content: 'plain' })
		expect('calls' in plain).toBe(false)
		expect('images' in plain).toBe(false)

		const rich = conversation.add({ role: 'user', content: 'rich', images: ['B64'] })
		expect(rich.images).toEqual(['B64'])
		expect('calls' in rich).toBe(false)
	})
})

describe('Conversation — view() before any compaction', () => {
	it('is exactly the live tail, in insertion order', () => {
		const conversation = new Conversation()
		const turns = conversation.add([
			{ role: 'user', content: 'one' },
			{ role: 'assistant', content: 'two' },
		])

		const view = conversation.view()

		// No sections yet ⇒ view() is the live messages verbatim (same ids, order).
		expect(view.map((message) => message.content)).toEqual(['one', 'two'])
		expect(view.map((message) => message.id)).toEqual(turns.map((turn) => turn.id))
	})
})

describe('Conversation — compact() with the default keep (0) folds all', () => {
	it('folds the whole live tail into ONE section, empties the tail, sets the rollup, emits', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		const events = recordEmitterEvents(conversation.emitter, ['compact', 'summary', 'rehydrate'])
		conversation.add([
			{ role: 'user', content: 'a' },
			{ role: 'assistant', content: 'b' },
			{ role: 'user', content: 'c' },
		])

		const section = await conversation.compact()

		// A section was returned, summarizing all three folded messages.
		expect(section).toBeDefined()
		expect(section?.summary).toBe('recap of 3')
		expect(section?.messages.map((message) => message.content)).toEqual(['a', 'b', 'c'])
		// The live tail is emptied (keep 0 folds everything).
		expect(conversation.count).toBe(0)
		// view() is now just the single section's FRAMED recap message (the lean RECAP-label prefix
		// + the summary), keyed by the section id, role assistant. The raw `summary` / rollup above
		// stay UNframed — the label is a view()-only presentation concern.
		const view = conversation.view()
		expect(view).toHaveLength(1)
		expect(view[0]?.content).toBe(recap('recap of 3'))
		expect(view[0]?.role).toBe('assistant')
		expect(view[0]?.id).toBe(section?.id)
		// The rollup is the summary-of-summaries over the one section (one summary ⇒ 'recap of 1').
		expect(conversation.summary).toBe('recap of 1')
		expect(conversation.sections).toHaveLength(1)
		// Both events fired (summary + compact); the section is carried on `compact`.
		expect(events.summary.calls).toEqual([['recap of 1']])
		expect(events.compact.count).toBe(1)
		expect(events.compact.calls[0]?.[0]).toBe(section)
		expect(events.rehydrate.count).toBe(0)
	})

	it('makes TWO summarizer calls per compaction (the section digest + the rollup)', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		conversation.add([
			{ role: 'user', content: 'a' },
			{ role: 'user', content: 'b' },
		])

		await conversation.compact()

		// Call 1: the folded slice (2 messages). Call 2: the rollup over all section summaries (1).
		expect(stub.calls).toHaveLength(2)
		expect(stub.calls[0]).toHaveLength(2)
		expect(stub.calls[1]).toHaveLength(1)
	})
})

describe('Conversation — compact({ keep }) retains a recent tail', () => {
	it('folds only the oldest count - keep messages, leaving the rest live', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		conversation.add([
			{ role: 'user', content: 'old-1' },
			{ role: 'user', content: 'old-2' },
			{ role: 'user', content: 'recent-1' },
			{ role: 'user', content: 'recent-2' },
		])

		const section = await conversation.compact({ keep: 2 })

		// The two oldest folded into the section; the two most recent stay live.
		expect(section?.messages.map((message) => message.content)).toEqual(['old-1', 'old-2'])
		expect(conversation.messages().map((message) => message.content)).toEqual([
			'recent-1',
			'recent-2',
		])
		// view() = [framed section recap, ...the retained live tail verbatim (NOT framed)].
		expect(conversation.view().map((message) => message.content)).toEqual([
			recap('recap of 2'),
			'recent-1',
			'recent-2',
		])
	})

	it('honors a constructor-level keep when no per-compaction override is given', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize, keep: 1 })
		conversation.add([
			{ role: 'user', content: 'x' },
			{ role: 'user', content: 'y' },
			{ role: 'user', content: 'z' },
		])

		const section = await conversation.compact()

		expect(section?.messages.map((message) => message.content)).toEqual(['x', 'y'])
		expect(conversation.messages().map((message) => message.content)).toEqual(['z'])
	})

	it('a per-compaction keep OVERRIDES the constructor keep', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize, keep: 2 })
		conversation.add([
			{ role: 'user', content: 'x' },
			{ role: 'user', content: 'y' },
			{ role: 'user', content: 'z' },
		])

		// Override to keep 0 → fold all three despite the constructor's keep: 2.
		const section = await conversation.compact({ keep: 0 })

		expect(section?.messages).toHaveLength(3)
		expect(conversation.count).toBe(0)
	})
})

describe('Conversation — compact() with nothing to fold is a no-op', () => {
	it('returns undefined and emits nothing when count <= keep', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		const events = recordEmitterEvents(conversation.emitter, ['compact', 'summary'])
		conversation.add([
			{ role: 'user', content: 'a' },
			{ role: 'user', content: 'b' },
		])

		const section = await conversation.compact({ keep: 5 })

		expect(section).toBeUndefined()
		// No fold ⇒ no summarizer call, no events, the live tail intact, no rollup.
		expect(stub.calls).toHaveLength(0)
		expect(events.compact.count).toBe(0)
		expect(events.summary.count).toBe(0)
		expect(conversation.count).toBe(2)
		expect(conversation.summary).toBeUndefined()
	})

	it('returns undefined for an empty conversation (keep 0)', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })

		expect(await conversation.compact()).toBeUndefined()
		expect(stub.calls).toHaveLength(0)
	})

	it('a keep exactly equal to the live count folds nothing', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		conversation.add([
			{ role: 'user', content: 'a' },
			{ role: 'user', content: 'b' },
		])

		expect(await conversation.compact({ keep: 2 })).toBeUndefined()
		expect(conversation.count).toBe(2)
	})
})

describe('Conversation — compact() without a summarizer throws', () => {
	it('throws a ConversationError (code SUMMARIZER) when no summarize seam was supplied', async () => {
		const conversation = new Conversation()
		conversation.add({ role: 'user', content: 'a' })

		await expect(conversation.compact()).rejects.toSatisfy(
			(error: unknown) => isConversationError(error) && error.code === 'SUMMARIZER',
		)
		// The live tail is untouched by the failed compaction.
		expect(conversation.count).toBe(1)
	})

	it('still stores + views a live tail without a summarizer (only compact is gated)', () => {
		const conversation = new Conversation()
		conversation.add([
			{ role: 'user', content: 'a' },
			{ role: 'assistant', content: 'b' },
		])

		expect(conversation.view().map((message) => message.content)).toEqual(['a', 'b'])
	})
})

describe('Conversation — summarizable reflects whether a summarizer was supplied', () => {
	it('is true with a summarizer (compact can fold) and false without (manual compact throws)', () => {
		// `summarizable` is the clean signal the agent loop gates AUTO-compaction on: a conversation
		// with no summarizer is never auto-compacted (so the auto path never throws the SUMMARIZER
		// error). A manual compact() is still gated — proven by the throw test above.
		const withSeam = new Conversation({ summarize: createStubSummarizer().summarize })
		const without = new Conversation()

		expect(withSeam.summarizable).toBe(true)
		expect(without.summarizable).toBe(false)
	})
})

describe('Conversation — rehydrate(id) reads the retained originals', () => {
	it("returns a section's full original messages and emits rehydrate", async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		const events = recordEmitterEvents(conversation.emitter, ['rehydrate'])
		const originals = conversation.add([
			{ role: 'user', content: 'remember me' },
			{ role: 'assistant', content: 'and me' },
		])
		const section = await conversation.compact()
		const id = section?.id ?? ''

		const pulled = conversation.rehydrate(id)

		// The full originals come back (by id + content) — compaction retained them.
		expect(pulled.map((message) => message.content)).toEqual(['remember me', 'and me'])
		expect(pulled.map((message) => message.id)).toEqual(originals.map((one) => one.id))
		expect(events.rehydrate.calls).toEqual([[id]])
		// v1 is a pure read — it does NOT re-add the originals to the live tail.
		expect(conversation.count).toBe(0)
	})

	it('returns [] for an unknown section id (still emits rehydrate)', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		const events = recordEmitterEvents(conversation.emitter, ['rehydrate'])

		expect(conversation.rehydrate('nope')).toEqual([])
		expect(events.rehydrate.calls).toEqual([['nope']])
	})
})

describe('Conversation — search(query) over sections + live (case-insensitive)', () => {
	it('finds matches across compacted originals AND the live tail', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		conversation.add([
			{ role: 'user', content: 'The quick brown FOX' },
			{ role: 'assistant', content: 'a lazy dog' },
		])
		// Fold the two above into a section, then add a fresh live message.
		await conversation.compact()
		conversation.add({ role: 'user', content: 'another fox sighting' })

		const hits = conversation.search('fox')

		// Case-insensitive: matches the compacted 'FOX' AND the live 'fox' — sections first.
		expect(hits.map((message) => message.content)).toEqual([
			'The quick brown FOX',
			'another fox sighting',
		])
	})

	it('returns [] when nothing matches', () => {
		const conversation = new Conversation()
		conversation.add({ role: 'user', content: 'hello world' })

		expect(conversation.search('zzz')).toEqual([])
	})

	it('searches the live tail when there are no sections', () => {
		const conversation = new Conversation()
		conversation.add([
			{ role: 'user', content: 'find THIS' },
			{ role: 'user', content: 'not that' },
		])

		expect(conversation.search('this').map((message) => message.content)).toEqual(['find THIS'])
	})
})

describe('Conversation — multiple compactions accumulate sections + regenerate the rollup', () => {
	it('appends a new section each compaction and refreshes the rollup over ALL sections', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })

		// First fold: one message → section 1; rollup over 1 section.
		conversation.add({ role: 'user', content: 'first batch' })
		const first = await conversation.compact()
		expect(conversation.sections).toHaveLength(1)
		expect(conversation.summary).toBe('recap of 1')

		// Second fold: two messages → section 2; rollup over 2 sections.
		conversation.add([
			{ role: 'user', content: 'second' },
			{ role: 'assistant', content: 'batch' },
		])
		const second = await conversation.compact()

		expect(conversation.sections).toHaveLength(2)
		expect(conversation.sections.map((one) => one.id)).toEqual([first?.id, second?.id])
		expect(second?.summary).toBe('recap of 2')
		// The rollup is regenerated over BOTH section summaries (2) ⇒ 'recap of 2'.
		expect(conversation.summary).toBe('recap of 2')
		// view() now carries BOTH section recap messages (each framed), no live tail left.
		expect(conversation.view().map((message) => message.content)).toEqual([
			recap('recap of 1'),
			recap('recap of 2'),
		])
	})
})

describe('Conversation — observation is side-effect-free (§13)', () => {
	it('a throwing compact listener is isolated + routed to the error handler; the fold still completes', async () => {
		const stub = createStubSummarizer()
		const errors = createErrorRecorder()
		const conversation = new Conversation({
			summarize: stub.summarize,
			error: errors.handler,
			on: {
				compact() {
					throw new Error('observer boom')
				},
			},
		})
		conversation.add({ role: 'user', content: 'a' })

		const section = await conversation.compact()

		// The listener threw, but the compaction completed (the section + rollup landed) and the
		// throw was routed to the emitter's error handler, never escaping.
		expect(section).toBeDefined()
		expect(conversation.sections).toHaveLength(1)
		expect(conversation.summary).toBe('recap of 1')
		// (error, event) order.
		expect(errors.count).toBe(1)
		expect(errors.calls[0]?.[1]).toBe('compact')
	})
})

describe('Conversation — sections snapshot independence (§11)', () => {
	it('mutating the sections() array does not corrupt the conversation', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		conversation.add({ role: 'user', content: 'a' })
		await conversation.compact()

		const snapshot = conversation.sections
		Reflect.apply(Array.prototype.splice, snapshot, [0, snapshot.length])

		// A later read is unaffected by mutating the earlier snapshot.
		expect(conversation.sections).toHaveLength(1)
	})
})

describe('Conversation — view() frames each section summary as a RECAP (D2)', () => {
	it('prefixes every section summary with the RECAP label; the live tail stays verbatim', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize, keep: 1 })
		conversation.add([
			{ role: 'user', content: 'old' },
			{ role: 'user', content: 'live tail' },
		])

		await conversation.compact() // folds 'old' into a section; 'live tail' stays live

		const view = conversation.view()
		// The section folds to a FRAMED recap (prefix + summary), role assistant; the live tail
		// message is carried through UNTOUCHED (never gets the recap label).
		expect(view).toHaveLength(2)
		expect(view[0]?.content).toBe(recap('recap of 1'))
		expect(view[0]?.content.startsWith(CONVERSATION_RECAP_PREFIX)).toBe(true)
		expect(view[1]?.content).toBe('live tail')
		expect(view[1]?.content.includes(CONVERSATION_RECAP_PREFIX)).toBe(false)
	})

	it('NO-BLOAT GUARD: framing adds only the bounded prefix cost per section, never bloats', async () => {
		// Three sections so the per-section overhead is summed. Each section's RAW summary is
		// `recap of <n>` (the stub) — the framed view() prefixes each with CONVERSATION_RECAP_PREFIX.
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		for (let n = 0; n < 3; n += 1) {
			conversation.add({ role: 'user', content: `turn ${n}` })
			await conversation.compact()
		}
		const sections = conversation.sections
		expect(sections).toHaveLength(3)

		// The RAW baseline: what view() would estimate with UNFRAMED section summaries (just the
		// summary text), versus the ACTUAL framed view(). The delta is the framing's whole cost.
		const baseline = estimateMessages(
			sections.map((section) => ({ id: section.id, role: 'assistant', content: section.summary })),
		)
		const framed = estimateMessages(conversation.view())

		// The framing's token cost is bounded by estimateTokens(prefix) per section — a few tokens
		// times the section count, NEVER an open-ended blow-up. estimateTokens is ceil(len/4), so
		// per section ceil((prefix+summary)/4) - ceil(summary/4) <= ceil(prefix/4) holds exactly.
		const perSection = Math.ceil(CONVERSATION_RECAP_PREFIX.length / 4)
		expect(framed).toBeGreaterThanOrEqual(baseline) // the label only ever adds (never removes)
		expect(framed - baseline).toBeLessThanOrEqual(perSection * sections.length)
		// And concretely lean: the whole framing overhead is a SMALL handful of tokens total.
		expect(perSection).toBeLessThanOrEqual(8)
	})
})

describe('Conversation — reference() renders a provenance-labeled cross-conversation block (D1)', () => {
	it('includes the provenance label, the rollup summary, and ONLY the supplied excerpts', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ id: 'planning', summarize: stub.summarize })
		const all = conversation.add([
			{ role: 'user', content: 'the API endpoint is /v2/sync' },
			{ role: 'assistant', content: 'noted, /v2/sync it is' },
			{ role: 'user', content: 'also the weather is nice' },
		])
		await conversation.compact() // sets the rollup `summary` (= 'recap of 1' over one section)

		// Cherry-pick ONE relevant message (as search() would surface), NOT the whole history.
		const picked = conversation.search('endpoint')
		expect(picked).toHaveLength(1)
		const block = conversation.reference({ label: 'planning', messages: picked })

		// Provenance marker names the source + states it is NOT part of this conversation.
		expect(block).toContain('[Reference — conversation "planning" — NOT part of this conversation]')
		// The rollup summary line is present (summary defaults to true, and one exists).
		expect(block).toContain('Summary: recap of 1')
		// ONLY the cherry-picked excerpt appears — rendered `- role: content`.
		expect(block).toContain('Relevant messages:')
		expect(block).toContain('- user: the API endpoint is /v2/sync')
		// The OTHER messages are NOT dumped into the block (cherry-pick, never the whole history).
		expect(block).not.toContain('also the weather is nice')
		expect(block).not.toContain('noted, /v2/sync it is')
		// Sanity: the picked message really was one of the conversation's own messages.
		expect(all.map((message) => message.content)).toContain(picked[0]?.content)
	})

	it('defaults the label to the conversation id when none is supplied', () => {
		const conversation = new Conversation({ id: 'thread-7' })

		expect(conversation.reference()).toContain(
			'[Reference — conversation "thread-7" — NOT part of this conversation]',
		)
	})

	it('omits the Summary line when there is no rollup (no compaction yet)', () => {
		const conversation = new Conversation({ id: 'fresh' })
		conversation.add({ role: 'user', content: 'hi' })

		const block = conversation.reference()

		// No compaction ⇒ summary is undefined ⇒ no `Summary:` line; and no excerpts supplied ⇒ no
		// `Relevant messages:` block. The marker still renders cleanly on its own.
		expect(block).toBe('[Reference — conversation "fresh" — NOT part of this conversation]')
	})

	it('excludes the summary when summary:false even if a rollup exists', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ id: 'planning', summarize: stub.summarize })
		conversation.add({ role: 'user', content: 'decided on Postgres' })
		await conversation.compact()
		expect(conversation.summary).toBeDefined()

		const block = conversation.reference({ summary: false })

		expect(block).not.toContain('Summary:')
		expect(block).toBe('[Reference — conversation "planning" — NOT part of this conversation]')
	})

	it('renders excerpts with no summary line when summary-less but messages are supplied', () => {
		const conversation = new Conversation({ id: 'chat' })
		const messages = conversation.add([
			{ role: 'user', content: 'one' },
			{ role: 'assistant', content: 'two' },
		])

		const block = conversation.reference({ messages })

		expect(block).not.toContain('Summary:')
		expect(block).toContain('Relevant messages:')
		expect(block).toContain('- user: one')
		expect(block).toContain('- assistant: two')
	})
})

describe('Conversation — snapshot() serializes id + summary + sections + live tail (C-c)', () => {
	it('snapshot() captures id, sections, the live tail, and the rollup summary', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ id: 'snap', summarize: stub.summarize, keep: 1 })
		conversation.add([
			{ role: 'user', content: 'first' },
			{ role: 'assistant', content: 'second' },
			{ role: 'user', content: 'third' },
		])
		await conversation.compact() // folds first+second into a section; third stays live

		const snapshot = conversation.snapshot()
		expect(snapshot.id).toBe('snap')
		expect(snapshot.summary).toBe(conversation.summary) // the regenerated rollup
		expect(snapshot.sections).toEqual(conversation.sections)
		expect(snapshot.messages).toEqual(conversation.messages()) // the live tail
		expect(snapshot.messages.map((one) => one.content)).toEqual(['third'])
	})

	it('snapshot() OMITS summary before any compaction (undefined rollup, present-when-set)', () => {
		const conversation = new Conversation({ id: 'fresh' })
		conversation.add({ role: 'user', content: 'hi' })

		const snapshot = conversation.snapshot()
		// The rollup is undefined until the first compaction — the key is OMITTED (not present-but-undefined).
		expect('summary' in snapshot).toBe(false)
		expect(snapshot.sections).toEqual([])
		expect(snapshot.messages.map((one) => one.content)).toEqual(['hi'])
	})

	it('snapshot() is pure JSON DATA — it survives a JSON round-trip identically', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ id: 'json', summarize: stub.summarize, keep: 1 })
		conversation.add([
			{ role: 'user', content: 'a' },
			{ role: 'user', content: 'b' },
		])
		await conversation.compact()

		const snapshot = conversation.snapshot()
		expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot)
	})
})

describe('Conversation — sections cap (F2)', () => {
	it('throws ConversationError code SECTIONS for a zero or negative constructor cap', () => {
		const zero = (): Conversation => new Conversation({ sections: 0 })
		const negative = (): Conversation => new Conversation({ sections: -1 })

		expect(zero).toThrow(ConversationError)
		expect(negative).toThrow(ConversationError)
		expect(zero).toThrowError(expect.objectContaining({ code: 'SECTIONS' }))
	})

	it('accepts a fractional cap >= 1 (only the >= 1 bound is validated)', () => {
		expect(() => new Conversation({ sections: 1.5 })).not.toThrow()
	})

	it('throws ConversationError code SECTIONS for a zero or negative per-compact override', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		conversation.add({ role: 'user', content: 'a' })

		await expect(conversation.compact({ sections: 0 })).rejects.toSatisfy(
			(error: unknown) => isConversationError(error) && error.code === 'SECTIONS',
		)
	})

	it('with sections: 2, three compact() rounds leave exactly 2 sections; the oldest merge folds their originals in order', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize, sections: 2 })

		conversation.add({ role: 'user', content: 'round-1' })
		const first = await conversation.compact()
		conversation.add({ role: 'user', content: 'round-2' })
		const second = await conversation.compact()
		expect(conversation.sections).toHaveLength(2)
		expect(conversation.sections.map((one) => one.id)).toEqual([first?.id, second?.id])

		// Third round pushes a THIRD section, overflowing the cap of 2 — the two oldest
		// (round-1, round-2) fold into ONE merged section, leaving [merged, round-3].
		conversation.add({ role: 'user', content: 'round-3' })
		const third = await conversation.compact()

		expect(conversation.sections).toHaveLength(2)
		const [merged, kept] = conversation.sections
		expect(kept?.id).toBe(third?.id)
		expect(merged?.id).not.toBe(first?.id)
		expect(merged?.id).not.toBe(second?.id)
		// The merged section's messages are the folded originals, concatenated IN ORDER.
		expect(merged?.messages.map((one) => one.content)).toEqual(['round-1', 'round-2'])
	})

	it("fires a 'collapse' event carrying the merged section when the cap forces a fold", async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize, sections: 2 })
		const events = recordEmitterEvents(conversation.emitter, ['collapse'])

		conversation.add({ role: 'user', content: 'a' })
		await conversation.compact()
		conversation.add({ role: 'user', content: 'b' })
		await conversation.compact()
		expect(events.collapse.count).toBe(0) // no overflow yet (2 sections === cap)

		conversation.add({ role: 'user', content: 'c' })
		await conversation.compact()

		expect(events.collapse.count).toBe(1)
		const merged = conversation.sections[0]
		expect(events.collapse.calls[0]?.[0]).toBe(merged)
	})

	it('view() length stays bounded to the capped sections + the live tail', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize, sections: 2, keep: 1 })

		for (let n = 0; n < 5; n += 1) {
			conversation.add({ role: 'user', content: `msg-${n}` })
			await conversation.compact()
		}

		// Never more than 2 section recaps + the live tail (1, per keep:1).
		expect(conversation.sections).toHaveLength(2)
		expect(conversation.view()).toHaveLength(3)
	})

	it('search() still finds a message that was folded through a merge', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize, sections: 2 })

		conversation.add({ role: 'user', content: 'the needle is here' })
		await conversation.compact()
		conversation.add({ role: 'user', content: 'second batch' })
		await conversation.compact()
		conversation.add({ role: 'user', content: 'third batch triggers the merge' })
		await conversation.compact()

		// The first section (containing 'the needle is here') was merged into a new section —
		// its original message must still be found via search.
		const hits = conversation.search('needle')
		expect(hits.map((one) => one.content)).toEqual(['the needle is here'])
	})

	it('a per-compact CompactOptions.sections override wins over the constructor cap', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize, sections: 5 })

		conversation.add({ role: 'user', content: 'a' })
		await conversation.compact()
		conversation.add({ role: 'user', content: 'b' })
		// Override to a cap of 1 for this compaction — forces an immediate merge despite the
		// constructor's cap of 5.
		await conversation.compact({ sections: 1 })

		expect(conversation.sections).toHaveLength(1)
	})

	it('DEFAULT unset sections: repeated compacts grow the sections list unbounded (regression guard)', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })

		for (let n = 0; n < 4; n += 1) {
			conversation.add({ role: 'user', content: `turn-${n}` })
			await conversation.compact()
		}

		expect(conversation.sections).toHaveLength(4)
	})

	// F4 — cap-collapse resilience: when the OVERFLOW MERGE's `summarize` call throws, the merge
	// (and its splice) is skipped — sections transiently sit at `cap + 1`, no loss — but the
	// rollup regeneration still runs over the CURRENT (unmerged) sections so it is never left
	// stale, and the error propagates (a manual `compact()` always surfaces a summarizer
	// failure). The section fold + rollup calls both succeed; only the merge call (identified by
	// call count) throws.
	it('regenerates a fresh rollup over the unmerged sections when the overflow merge throws, then propagates the error', async () => {
		const boom = new Error('merge summarizer boom')
		let calls = 0
		// Calls per compact() round without overflow: 1 (fold) + 1 (rollup) = 2 — so rounds 1 and 2
		// consume calls 1-2 and 3-4. Round 3 overflows the cap of 2: its fold is call 5, its
		// overflow MERGE is call 6 (before the rollup) — make only that merge call throw.
		const summarize = async (messages: readonly MessageInterface[]): Promise<string> => {
			calls += 1
			if (calls === 6) throw boom
			return `recap of ${messages.length}`
		}
		const conversation = new Conversation({ summarize, sections: 2 })

		conversation.add({ role: 'user', content: 'round-1' })
		await conversation.compact()
		conversation.add({ role: 'user', content: 'round-2' })
		await conversation.compact()
		expect(conversation.sections).toHaveLength(2)

		// Round 3 overflows the cap — the merge call throws.
		conversation.add({ role: 'user', content: 'round-3' })
		const rollupBeforeAttempt = conversation.summary
		await expect(conversation.compact()).rejects.toBe(boom)

		// No splice, no loss: 3 sections remain (transiently over the cap of 2), unmerged.
		expect(conversation.sections).toHaveLength(3)
		// The rollup is FRESH — regenerated over the current (unmerged) 3 sections, so it
		// differs from whatever it was before this failed attempt (never left stale).
		expect(conversation.summary).not.toBe(rollupBeforeAttempt)
		expect(conversation.summary).toBe('recap of 3')

		// A subsequent successful compact() restores the cap.
		conversation.add({ role: 'user', content: 'round-4' })
		await conversation.compact()
		expect(conversation.sections).toHaveLength(2)
	})
})

describe('Conversation — hydrate seam (the constructor seed restores from a snapshot, C-c)', () => {
	it('a Conversation built FROM a snapshot restores id + summary + sections + live tail', async () => {
		const stub = createStubSummarizer()
		const source = new Conversation({ id: 'orig', summarize: stub.summarize, keep: 1 })
		source.add([
			{ role: 'user', content: 'first' },
			{ role: 'assistant', content: 'second' },
			{ role: 'user', content: 'third' },
		])
		await source.compact()
		const snapshot = source.snapshot()

		// Hydrate a NEW conversation FROM the snapshot (the second constructor arg — the `seed`), with
		// the live summarizer / keep re-supplied through options (a summarizer is config, not data).
		const restored = new Conversation(
			{ summarize: createStubSummarizer().summarize, keep: 1 },
			snapshot,
		)

		expect(restored.id).toBe('orig') // the snapshot's id is the identity
		expect(restored.summary).toBe(source.summary)
		expect(restored.sections).toEqual(source.sections)
		expect(restored.messages()).toEqual(source.messages())
		// A re-snapshot of the restored conversation equals the original snapshot (a faithful round-trip).
		expect(restored.snapshot()).toEqual(snapshot)
	})

	it('the snapshot id WINS over an options.id (the snapshot IS the identity)', () => {
		const snapshot = { id: 'from-snapshot', sections: [], messages: [] }
		const restored = new Conversation({ id: 'from-options' }, snapshot)
		expect(restored.id).toBe('from-snapshot')
	})

	it("a restored conversation's view() / search() / count work over the restored state", async () => {
		const stub = createStubSummarizer()
		const source = new Conversation({ id: 'r', summarize: stub.summarize, keep: 1 })
		source.add([
			{ role: 'user', content: 'alpha original' },
			{ role: 'assistant', content: 'beta reply' },
			{ role: 'user', content: 'gamma tail' },
		])
		await source.compact()

		const restored = new Conversation(
			{ summarize: createStubSummarizer().summarize, keep: 1 },
			source.snapshot(),
		)

		expect(restored.count).toBe(1) // the live tail
		// view(): the section recap + the live tail.
		expect(restored.view()).toHaveLength(2)
		expect(restored.view()[1]?.content).toBe('gamma tail')
		// search(): the section's RETAINED originals AND the live tail.
		expect(restored.search('alpha').map((one) => one.content)).toEqual(['alpha original'])
		expect(restored.search('gamma').map((one) => one.content)).toEqual(['gamma tail'])
	})

	it('a restored conversation can CONTINUE compacting (its summarizer was re-supplied)', async () => {
		const source = new Conversation({
			id: 'cont',
			summarize: createStubSummarizer().summarize,
			keep: 1,
		})
		source.add([
			{ role: 'user', content: 'a' },
			{ role: 'user', content: 'b' },
		])
		await source.compact()

		const restored = new Conversation(
			{ summarize: createStubSummarizer().summarize },
			source.snapshot(),
		)
		restored.add({ role: 'user', content: 'c' })
		const section = await restored.compact()

		expect(section).toBeDefined()
		expect(restored.sections).toHaveLength(2) // the restored section + the new fold
	})

	it('hydrating is SILENT — it emits no events (nothing was edited)', async () => {
		const source = new Conversation({
			id: 's',
			summarize: createStubSummarizer().summarize,
			keep: 1,
		})
		source.add([
			{ role: 'user', content: 'a' },
			{ role: 'user', content: 'b' },
		])
		await source.compact()

		const restored = new Conversation(
			{ summarize: createStubSummarizer().summarize },
			source.snapshot(),
		)
		const events = recordEmitterEvents(restored.emitter, ['compact', 'summary', 'rehydrate'])
		// No event fires merely from construction — the recorder saw nothing post-hydrate.
		expect(events.compact.count).toBe(0)
		expect(events.summary.count).toBe(0)
		expect(events.rehydrate.count).toBe(0)
	})
})
