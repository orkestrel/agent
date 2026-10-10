import type { ConversationEventMap } from '@src/core'
import {
	CONVERSATION_RECAP_PREFIX,
	Conversation,
	ConversationError,
	createConversation,
	estimateMessages,
	isConversationError,
} from '@src/core'
import { describe, expect, it } from 'vitest'
import {
	createStubSummarizer,
	createToolCall,
	renderRecap,
	SUMMARIZED_CONVERSATION_SNAPSHOT,
} from '../../../setup.js'
import { createRecorder, createRecorders, requireValue, roundTripJSON } from '@orkestrel/test'

// Conversation OWNS its live message tail DIRECTLY (like a Workspace owns its files) — a live tail
// plus compacted, summarized sections + the `summarizable` flag, with rehydrate / search over the
// retained originals, driven by a provider-agnostic summarizer seam — real behavior, a data-stub
// summarizer, NOT a behavior-mock.
// `compact()` folds the older live messages into a section (its summary from the seam) and emits
// `compact`; view() = section summaries ++ the live tail; rehydrate/search read the retained
// originals.

describe('Conversation — construction & accessors', () => {
	it('mints an id when none is supplied, and accepts an explicit one', () => {
		const minted = new Conversation()
		const explicit = new Conversation({ id: 'fixed' })

		expect(minted.id.length).toBeGreaterThan(0)
		expect(explicit.id).toBe('fixed')
	})

	it('starts with no sections and an empty live tail', () => {
		const conversation = new Conversation()

		expect(conversation.sections).toEqual([])
		expect(conversation.count).toBe(0)
		expect(conversation.view()).toEqual([])
	})

	it('owns its message store directly — add mints + stores, message/messages/count read it back', () => {
		const conversation = new Conversation()

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

	it('add(batch) mints each id + returns the array; remove + clear drop from the live tail', () => {
		const conversation = new Conversation()

		const messages = conversation.add([
			{ role: 'user', content: 'a' },
			{ role: 'assistant', content: 'b' },
			{ role: 'user', content: 'c' },
		])
		const a = requireValue(messages[0])
		const b = requireValue(messages[1])
		const c = requireValue(messages[2])
		expect(conversation.count).toBe(3)
		expect(new Set([a.id, b.id, c.id]).size).toBe(3) // each id distinct

		// remove(id) drops one; remove(ids[]) drops a batch, true only when EVERY id was removed.
		expect(conversation.remove(a.id)).toBe(true)
		expect(conversation.remove('missing')).toBe(false)
		expect(conversation.remove([b.id, 'missing'])).toBe(false)
		expect(conversation.messages().map((message) => message.content)).toEqual(['c'])
		expect(conversation.remove([c.id])).toBe(true)
		expect(conversation.messages()).toEqual([])
		conversation.add([{ role: 'user', content: 'c' }])

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

	it('stores thinking from the input and leaves the member absent without it', () => {
		const conversation = new Conversation()

		const plain = conversation.add({ role: 'assistant', content: 'Booked' })
		expect('thinking' in plain).toBe(false)

		const reasoned = conversation.add({
			role: 'assistant',
			content: 'Booked',
			thinking: 'Compare fares first',
		})
		expect(reasoned.thinking).toBe('Compare fares first')
		expect(conversation.messages().at(-1)?.thinking).toBe('Compare fares first')
	})

	it('stores the call a tool message answers, and omits call when absent', () => {
		const conversation = new Conversation()

		const answer = conversation.add({ role: 'tool', content: 'sunny', call: 'call-weather' })
		expect(answer.call).toBe('call-weather')
		expect(conversation.message(answer.id)).toEqual({
			id: answer.id,
			role: 'tool',
			content: 'sunny',
			call: 'call-weather',
		})

		const unnamed = conversation.add({ role: 'tool', content: 'cloudy' })
		expect('call' in unnamed).toBe(false)
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

describe('Conversation — compact() with the default keep (0) folds up to the newest user message', () => {
	it('omits thinking from the summarizer input and retains it in the stored section', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		conversation.add([
			{ role: 'user', content: 'First request.' },
			{ role: 'assistant', content: 'First reply.', thinking: 'private plan' },
			{ role: 'user', content: 'Next request.' },
		])
		const section = await conversation.compact()
		expect(stub.calls).toHaveLength(1)
		expect(stub.calls[0]?.map((message) => message.content)).toEqual([
			'First request.',
			'First reply.',
		])
		expect(stub.calls[0]?.some((message) => 'thinking' in message)).toBe(false)
		expect(section?.messages[1]?.thinking).toBe('private plan')
	})

	it('folds every message before the newest user message into ONE section and emits compact', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		const events = createRecorders<ConversationEventMap, 'compact' | 'collapse' | 'rehydrate'>(
			conversation.emitter,
			['compact', 'collapse', 'rehydrate'],
		)
		conversation.add([
			{ role: 'user', content: 'a' },
			{ role: 'assistant', content: 'b' },
			{ role: 'user', content: 'c' },
		])

		const section = await conversation.compact()

		// A section was returned, summarizing the two messages before the newest user message.
		expect(section).toBeDefined()
		expect(section?.summary).toBe('recap of 2')
		expect(section?.messages.map((message) => message.content)).toEqual(['a', 'b'])
		// The newest user message stays live.
		expect(conversation.messages().map((message) => message.content)).toEqual(['c'])
		// view() is the section's FRAMED recap message (the lean RECAP-label prefix + the summary),
		// keyed by the section id, role assistant, then the live tail. The raw `summary` stays
		// UNframed — the label is a view()-only presentation concern.
		const view = conversation.view()
		expect(view).toHaveLength(2)
		expect(view[0]?.content).toBe(renderRecap('recap of 2'))
		expect(view[0]?.role).toBe('assistant')
		expect(view[0]?.id).toBe(section?.id)
		expect(view[1]?.content).toBe('c')
		expect(conversation.sections).toHaveLength(1)
		// Only `compact` fired, carrying the section.
		expect(events.compact.calls).toEqual([[section]])
		expect(events.collapse.count).toBe(0)
		expect(events.rehydrate.count).toBe(0)
	})

	it('makes ONE summarizer call per compaction, over the folded slice', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		conversation.add([
			{ role: 'user', content: 'Is the depot open on Friday?' },
			{ role: 'assistant', content: 'The depot is open on Friday.' },
			{ role: 'user', content: 'Which order is late?' },
		])

		const section = await conversation.compact()

		expect(stub.calls).toEqual([section?.messages])
		expect('summary' in conversation).toBe(false)
		expect('summary' in conversation.snapshot()).toBe(false)
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
			renderRecap('recap of 2'),
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

		// Override to keep 0 → fold both messages before the newest user message despite the
		// constructor's keep: 2, which folds only one.
		const section = await conversation.compact({ keep: 0 })

		expect(section?.messages).toHaveLength(2)
		expect(conversation.count).toBe(1)
	})
})

describe('Conversation — compact() with nothing to fold is a no-op', () => {
	it('returns undefined and emits nothing when count <= keep', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		const events = createRecorders<ConversationEventMap, 'compact' | 'collapse'>(
			conversation.emitter,
			['compact', 'collapse'],
		)
		conversation.add([
			{ role: 'user', content: 'a' },
			{ role: 'user', content: 'b' },
		])

		const section = await conversation.compact({ keep: 5 })

		expect(section).toBeUndefined()
		// No fold ⇒ no summarizer call, no events, the live tail intact.
		expect(stub.calls).toHaveLength(0)
		expect(events.compact.count).toBe(0)
		expect(events.collapse.count).toBe(0)
		expect(conversation.count).toBe(2)
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

describe('Conversation — compact() moves its boundary to whole exchanges', () => {
	it('moves a cut inside an exchange back to the user message that opens it', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		conversation.add([
			{ role: 'user', content: 'Is the depot open on Friday?' },
			{ role: 'assistant', content: 'The depot is open on Friday.' },
			{ role: 'user', content: 'Which order is late?' },
			{ role: 'assistant', content: '', calls: [createToolCall({ id: 'order' })] },
			{ role: 'tool', content: 'LH-81660 is late', call: 'order' },
			{ role: 'assistant', content: 'Order LH-81660 is late.' },
			{ role: 'user', content: 'Who carries it?' },
		])

		const section = await conversation.compact({ keep: 3 })

		expect(section?.messages.map((message) => message.content)).toEqual([
			'Is the depot open on Friday?',
			'The depot is open on Friday.',
		])
		expect(conversation.messages().map((message) => message.role)).toEqual([
			'user',
			'assistant',
			'tool',
			'assistant',
			'user',
		])
	})

	it('folds a leading assistant greeting with the first exchange and never without it', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		conversation.add([
			{ role: 'assistant', content: 'Enjoy the break.' },
			{ role: 'user', content: 'Work out the refund for order LH-79215.' },
			{ role: 'assistant', content: '', calls: [createToolCall({ id: 'order' })] },
			{ role: 'tool', content: 'Order LH-79215 totals $289.00', call: 'order' },
			{ role: 'assistant', content: '', calls: [createToolCall({ id: 'reply' })] },
			{ role: 'tool', content: 'sent', call: 'reply' },
			{ role: 'user', content: 'Which card is on file?' },
		])

		// A cut after the greeting and the request falls inside the first exchange, so nothing folds.
		expect(await conversation.compact({ keep: 5 })).toBeUndefined()
		expect(stub.calls).toHaveLength(0)

		const section = await conversation.compact({ keep: 0 })

		expect(section?.messages.map((message) => message.role)).toEqual([
			'assistant',
			'user',
			'assistant',
			'tool',
			'assistant',
			'tool',
		])
		expect(conversation.messages().map((message) => message.content)).toEqual([
			'Which card is on file?',
		])
	})

	it('moves a cut inside an exchange holding a tool result with no call member', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		conversation.add([
			{ role: 'user', content: 'Is the depot open on Friday?' },
			{ role: 'assistant', content: 'The depot is open on Friday.' },
			{ role: 'user', content: 'Which order is late?' },
			{ role: 'assistant', content: '', calls: [createToolCall({ id: 'order' })] },
			{ role: 'tool', content: 'LH-81660 is late' },
			{ role: 'user', content: 'Who carries it?' },
		])

		const section = await conversation.compact({ keep: 2 })

		expect(section?.messages.map((message) => message.content)).toEqual([
			'Is the depot open on Friday?',
			'The depot is open on Friday.',
		])
	})

	it('keeps a call group that spans two exchanges on one side of the cut', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		conversation.add([
			{ role: 'user', content: 'Is the depot open on Friday?' },
			{ role: 'assistant', content: 'The depot is open on Friday.' },
			{ role: 'user', content: 'Which order is late?' },
			{ role: 'assistant', content: '', calls: [createToolCall({ id: 'order' })] },
			{ role: 'user', content: 'The printer needs paper.' },
			{ role: 'tool', content: 'LH-81660 is late', call: 'order' },
			{ role: 'user', content: 'Who carries it?' },
		])

		const section = await conversation.compact({ keep: 2 })

		expect(section?.messages.map((message) => message.content)).toEqual([
			'Is the depot open on Friday?',
			'The depot is open on Friday.',
		])
	})

	it('keeps the newest user message and every message after it live', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		conversation.add([
			{ role: 'user', content: 'My name is Ada.' },
			{ role: 'assistant', content: 'Nice to meet you, Ada.' },
			{ role: 'user', content: 'Look up order LH-81660.' },
			{ role: 'assistant', content: '', calls: [createToolCall({ id: 'order' })] },
			{ role: 'tool', content: 'LH-81660 is late', call: 'order' },
		])

		const section = await conversation.compact({ keep: 0 })

		expect(section?.messages.map((message) => message.content)).toEqual([
			'My name is Ada.',
			'Nice to meet you, Ada.',
		])
		expect(conversation.messages().map((message) => message.content)).toEqual([
			'Look up order LH-81660.',
			'',
			'LH-81660 is late',
		])
	})

	it('returns undefined without a summarizer call when the boundary leaves nothing to fold', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		conversation.add([
			{ role: 'user', content: 'Look up order LH-81660.' },
			{ role: 'assistant', content: '', calls: [createToolCall({ id: 'order' })] },
			{ role: 'tool', content: 'LH-81660 is late', call: 'order' },
		])

		expect(await conversation.compact({ keep: 0 })).toBeUndefined()
		expect(stub.calls).toHaveLength(0)
		expect(conversation.count).toBe(3)
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
		// error). A manual compact() is still gated — proven by the preceding throw test.
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
		const events = createRecorders<ConversationEventMap, 'rehydrate'>(conversation.emitter, [
			'rehydrate',
		])
		const originals = conversation.add([
			{ role: 'user', content: 'remember me' },
			{ role: 'assistant', content: 'and me' },
		])
		conversation.add({ role: 'user', content: 'What did I say?' })
		const section = await conversation.compact()
		const id = section?.id ?? ''

		const pulled = requireValue(conversation.rehydrate(id))

		// The full originals come back (by id + content) — compaction retained them.
		expect(pulled.map((message) => message.content)).toEqual(['remember me', 'and me'])
		expect(pulled.map((message) => message.id)).toEqual(originals.map((one) => one.id))
		expect(events.rehydrate.calls).toEqual([[id]])
		// `rehydrate` is a pure read — it does NOT re-add the originals to the live tail.
		expect(conversation.count).toBe(1)
	})

	it('returns undefined for an unknown section id without an event or a state change', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		const events = createRecorders<ConversationEventMap, 'rehydrate'>(conversation.emitter, [
			'rehydrate',
		])
		conversation.add([
			{ role: 'user', content: 'Remember the depot hours.' },
			{ role: 'assistant', content: 'The depot opens at dawn.' },
			{ role: 'user', content: 'Which order is late?' },
		])
		await conversation.compact()
		const snapshot = conversation.snapshot()
		expect(snapshot.sections).toHaveLength(1)
		expect(snapshot.messages).toHaveLength(1)

		expect(conversation.rehydrate('nope')).toBeUndefined()
		expect(conversation.snapshot()).toEqual(snapshot)
		expect(events.rehydrate.count).toBe(0)
	})

	it('returns an empty retained list and emits the known section id', () => {
		const conversation = new Conversation({
			snapshot: {
				id: 'restored',
				sections: [{ id: 'empty', summary: 'No retained messages.', messages: [] }],
				messages: [],
			},
		})
		const events = createRecorders<ConversationEventMap, 'rehydrate'>(conversation.emitter, [
			'rehydrate',
		])
		const snapshot = conversation.snapshot()

		expect(conversation.rehydrate('empty')).toEqual([])
		expect(events.rehydrate.calls).toEqual([['empty']])
		expect(conversation.snapshot()).toEqual(snapshot)
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
		// Fold the two preceding messages into a section, then add a fresh live message.
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

describe('Conversation — multiple compactions accumulate sections', () => {
	it('appends a section each compaction, oldest first', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })

		// First fold: one message → section 1.
		conversation.add({ role: 'assistant', content: 'first batch' })
		const first = await conversation.compact()
		expect(conversation.sections).toHaveLength(1)

		// Second fold: two messages → section 2.
		conversation.add([
			{ role: 'assistant', content: 'second' },
			{ role: 'assistant', content: 'batch' },
		])
		const second = await conversation.compact()

		expect(conversation.sections).toHaveLength(2)
		expect(conversation.sections.map((one) => one.id)).toEqual([first?.id, second?.id])
		expect(second?.summary).toBe('recap of 2')
		expect(stub.calls.map((call) => call.length)).toEqual([1, 2])
		// view() now carries BOTH section recap messages (each framed), no live tail left.
		expect(conversation.view().map((message) => message.content)).toEqual([
			renderRecap('recap of 1'),
			renderRecap('recap of 2'),
		])
	})
})

describe('Conversation — a 0.0.29 snapshot hydrates without its conversation summary', () => {
	it('restores the sections and the tail, and neither a compaction nor a snapshot carries the summary', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({
			summarize: stub.summarize,
			snapshot: SUMMARIZED_CONVERSATION_SNAPSHOT,
		})

		expect(conversation.snapshot()).toEqual({
			id: SUMMARIZED_CONVERSATION_SNAPSHOT.id,
			sections: SUMMARIZED_CONVERSATION_SNAPSHOT.sections,
			messages: SUMMARIZED_CONVERSATION_SNAPSHOT.messages,
		})
		conversation.add([
			{ role: 'assistant', content: 'Order LH-81660 is late.' },
			{ role: 'user', content: 'Who carries it?' },
		])
		await conversation.compact()

		expect(stub.calls.map((call) => call.length)).toEqual([2])
		expect('summary' in conversation.snapshot()).toBe(false)
	})
})

describe('Conversation — observation is side-effect-free', () => {
	it('a throwing compact listener is isolated + routed to the error handler; the fold still completes', async () => {
		const stub = createStubSummarizer()
		const errors = createRecorder<readonly [error: unknown, event: string]>()
		const conversation = new Conversation({
			summarize: stub.summarize,
			error: errors.handler,
			on: {
				compact() {
					throw new Error('observer boom')
				},
			},
		})
		conversation.add({ role: 'assistant', content: 'a' })

		const section = await conversation.compact()

		// The listener threw, but the compaction completed (the section landed) and the throw was
		// routed to the error handler of the emitter, never escaping.
		expect(section).toBeDefined()
		expect(conversation.sections).toHaveLength(1)
		// (error, event) order.
		expect(errors.count).toBe(1)
		expect(errors.calls[0]?.[1]).toBe('compact')
	})
})

describe('Conversation — sections snapshot independence', () => {
	it('mutating the sections() array does not corrupt the conversation', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		conversation.add({ role: 'assistant', content: 'a' })
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
		expect(view[0]?.content).toBe(renderRecap('recap of 1'))
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
			conversation.add({ role: 'assistant', content: `turn ${n}` })
			await conversation.compact()
		}
		const sections = conversation.sections
		expect(sections).toHaveLength(3)

		// The RAW baseline: what view() would estimate with UNFRAMED section summaries (the
		// summary text alone), versus the ACTUAL framed view(). The delta is the framing's whole cost.
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
	it('includes the provenance label and ONLY the supplied excerpts, with no summary line', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ id: 'planning', summarize: stub.summarize })
		const all = conversation.add([
			{ role: 'user', content: 'the API endpoint is /v2/sync' },
			{ role: 'assistant', content: 'noted, /v2/sync it is' },
			{ role: 'user', content: 'also the weather is nice' },
		])
		await conversation.compact()

		// Cherry-pick ONE relevant message (as search() would surface), NOT the whole history.
		const picked = conversation.search('endpoint')
		expect(picked).toHaveLength(1)
		const block = conversation.reference({ label: 'planning', messages: picked })

		// Provenance marker names the source + states it is NOT part of this conversation.
		expect(block).toContain('[Reference — conversation "planning" — NOT part of this conversation]')
		// A compacted conversation renders no summary line.
		expect(block).not.toContain('Summary:')
		// ONLY the cherry-picked excerpt appears — rendered `- role: content`.
		expect(block).toContain('Relevant messages:')
		expect(block).toContain('- user: the API endpoint is /v2/sync')
		// The OTHER messages are NOT dumped into the block (cherry-pick, never the whole history).
		expect(block).not.toContain('also the weather is nice')
		expect(block).not.toContain('noted, /v2/sync it is')
		// The picked message really was one of the conversation's own messages.
		expect(all.map((message) => message.content)).toContain(picked[0]?.content)
	})

	it('defaults the label to the conversation id when none is supplied', () => {
		const conversation = new Conversation({ id: 'thread-7' })

		expect(conversation.reference()).toContain(
			'[Reference — conversation "thread-7" — NOT part of this conversation]',
		)
	})

	it('renders the marker alone when no excerpts are supplied', () => {
		const conversation = new Conversation({ id: 'fresh' })
		conversation.add({ role: 'user', content: 'hi' })

		expect(conversation.reference()).toBe(
			'[Reference — conversation "fresh" — NOT part of this conversation]',
		)
	})

	it('renders each supplied excerpt as role: content under the marker', () => {
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

describe('Conversation — snapshot() serializes id + sections + live tail (C-c)', () => {
	it('snapshot() captures id, sections, and the live tail, and carries no summary member', async () => {
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
		expect('summary' in snapshot).toBe(false)
		expect(snapshot.sections).toEqual(conversation.sections)
		expect(snapshot.messages).toEqual(conversation.messages()) // the live tail
		expect(snapshot.messages.map((one) => one.content)).toEqual(['third'])
	})

	it('snapshot() before any compaction holds no sections and the live tail', () => {
		const conversation = new Conversation({ id: 'fresh' })
		conversation.add({ role: 'user', content: 'hi' })

		const snapshot = conversation.snapshot()
		expect(snapshot.sections).toEqual([])
		expect(snapshot.messages.map((one) => one.content)).toEqual(['hi'])
	})

	it('hydrates from the ConversationOptions snapshot seam, restoring id, sections, and tail', async () => {
		const stub = createStubSummarizer()
		const source = new Conversation({ id: 'stored', summarize: stub.summarize, keep: 1 })
		source.add([
			{ role: 'user', content: 'first' },
			{ role: 'assistant', content: 'second' },
			{ role: 'user', content: 'third' },
		])
		await source.compact()
		const snapshot = source.snapshot()

		// The declared option is the ONE seam every caller reaches — there is no positional form.
		const restored = createConversation({ snapshot, summarize: stub.summarize, keep: 1 })
		expect(restored.id).toBe('stored') // the snapshot IS the identity
		expect(restored.sections).toEqual(source.sections)
		expect(restored.messages()).toEqual(source.messages())
		// A re-snapshot of the restored conversation equals the original (a faithful round-trip).
		expect(restored.snapshot()).toEqual(snapshot)
		// The live config rides alongside it: the restored conversation can still fold.
		expect(restored.summarizable).toBe(true)
	})

	it('lets a snapshot id win over an options id, and stays silent while restoring', () => {
		const compacted = createRecorder<ConversationEventMap['compact']>()
		const restored = createConversation({
			id: 'ignored',
			snapshot: {
				id: 'stored',
				sections: [],
				messages: [{ id: 'm', role: 'user', content: 'hi' }],
			},
			on: { compact: compacted.handler },
		})

		expect(restored.id).toBe('stored')
		expect(restored.messages().map((one) => one.content)).toEqual(['hi'])
		expect(compacted.count).toBe(0) // hydration edits nothing, so it emits nothing
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
		// `JSONSafe` maps the all-optional `NoulCriteria` under a judgment to `never`, so the round trip
		// is typed `unknown` here.
		expect(roundTripJSON<unknown>(snapshot)).toEqual(snapshot)
	})
})

describe('Conversation — sections cap', () => {
	it('throws ConversationError code SECTIONS for a NaN constructor cap', () => {
		expect(() => new Conversation({ sections: Number.NaN })).toThrow(
			expect.objectContaining({ code: 'SECTIONS' }),
		)
	})

	it('rejects a NaN per-compact cap before summarizing, changing state, or emitting events', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })
		const events = createRecorders<ConversationEventMap, 'compact' | 'collapse'>(
			conversation.emitter,
			['compact', 'collapse'],
		)
		conversation.add([
			{ role: 'user', content: 'Remember the depot hours.' },
			{ role: 'assistant', content: 'The depot opens at dawn.' },
			{ role: 'user', content: 'Which order is late?' },
		])
		const snapshot = conversation.snapshot()

		await expect(conversation.compact({ sections: Number.NaN })).rejects.toSatisfy(
			(error: unknown) => isConversationError(error) && error.code === 'SECTIONS',
		)
		expect(conversation.snapshot()).toEqual(snapshot)
		expect(stub.calls).toHaveLength(0)
		expect(events.compact.count).toBe(0)
		expect(events.collapse.count).toBe(0)
	})

	it('throws ConversationError code SECTIONS for a zero or negative constructor cap', () => {
		expect(() => new Conversation({ sections: 0 })).toThrow(ConversationError)
		expect(() => new Conversation({ sections: -1 })).toThrow(ConversationError)
		expect(() => new Conversation({ sections: 0 })).toThrow(
			expect.objectContaining({ code: 'SECTIONS' }),
		)
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

		conversation.add({ role: 'assistant', content: 'round-1' })
		const first = await conversation.compact()
		conversation.add({ role: 'assistant', content: 'round-2' })
		const second = await conversation.compact()
		expect(conversation.sections).toHaveLength(2)
		expect(conversation.sections.map((one) => one.id)).toEqual([first?.id, second?.id])

		// Third round pushes a THIRD section, overflowing the cap of 2 — the two oldest
		// (round-1, round-2) fold into ONE merged section, leaving [merged, round-3].
		conversation.add({ role: 'assistant', content: 'round-3' })
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
		const events = createRecorders<ConversationEventMap, 'collapse'>(conversation.emitter, [
			'collapse',
		])

		conversation.add({ role: 'assistant', content: 'a' })
		await conversation.compact()
		conversation.add({ role: 'assistant', content: 'b' })
		await conversation.compact()
		expect(events.collapse.count).toBe(0) // no overflow yet (2 sections === cap)

		conversation.add({ role: 'assistant', content: 'c' })
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

		conversation.add({ role: 'assistant', content: 'the needle is here' })
		await conversation.compact()
		conversation.add({ role: 'assistant', content: 'second batch' })
		await conversation.compact()
		conversation.add({ role: 'assistant', content: 'third batch triggers the merge' })
		await conversation.compact()

		// The first section (containing 'the needle is here') was merged into a new section —
		// its original message must still be found through search.
		const hits = conversation.search('needle')
		expect(hits.map((one) => one.content)).toEqual(['the needle is here'])
	})

	it('a per-compact CompactOptions.sections override wins over the constructor cap', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize, sections: 5 })

		conversation.add({ role: 'assistant', content: 'a' })
		await conversation.compact()
		conversation.add({ role: 'assistant', content: 'b' })
		// Override to a cap of 1 for this compaction — forces an immediate merge despite the
		// constructor's cap of 5.
		await conversation.compact({ sections: 1 })

		expect(conversation.sections).toHaveLength(1)
	})

	it('merges an overflow with one further summarizer call over the folded section summaries', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize, sections: 1 })
		conversation.add({ role: 'assistant', content: 'The depot is open on Friday.' })
		await conversation.compact()
		conversation.add({ role: 'assistant', content: 'Order LH-81660 is late.' })

		await conversation.compact()

		// The first fold, the second fold, then the merge over the two section summaries.
		expect(stub.calls.map((call) => call.length)).toEqual([1, 1, 2])
		expect(conversation.sections).toHaveLength(1)
	})

	it('DEFAULT unset sections: repeated compacts grow the sections list unbounded (regression guard)', async () => {
		const stub = createStubSummarizer()
		const conversation = new Conversation({ summarize: stub.summarize })

		for (let n = 0; n < 4; n += 1) {
			conversation.add({ role: 'assistant', content: `turn-${n}` })
			await conversation.compact()
		}

		expect(conversation.sections).toHaveLength(4)
	})

	// Cap-collapse resilience: when the `summarize` call of the OVERFLOW MERGE throws, the merge
	// is skipped — sections transiently sit at `cap + 1`, no loss — and the error propagates (a
	// manual `compact()` always surfaces a summarizer failure) before `compact` is emitted. One
	// summarizer call per round without overflow, so rounds 1 and 2 are calls 1 and 2; round 3
	// folds at call 3 and merges at call 4, the only call that throws.
	it('keeps the unmerged sections and propagates the error when the overflow merge throws', async () => {
		const boom = new Error('merge summarizer boom')
		let calls = 0
		const conversation = new Conversation({
			summarize: async (messages) => {
				calls += 1
				if (calls === 4) throw boom
				return `recap of ${messages.length}`
			},
			sections: 2,
		})
		const events = createRecorders<ConversationEventMap, 'compact' | 'collapse'>(
			conversation.emitter,
			['compact', 'collapse'],
		)

		conversation.add({ role: 'assistant', content: 'round-1' })
		await conversation.compact()
		conversation.add({ role: 'assistant', content: 'round-2' })
		await conversation.compact()
		expect(conversation.sections).toHaveLength(2)

		// Round 3 overflows the cap — the merge call throws.
		conversation.add({ role: 'assistant', content: 'round-3' })
		await expect(conversation.compact()).rejects.toBe(boom)

		// No merge, no loss: 3 sections remain (transiently over the cap of 2), unmerged, and the
		// failed round emitted neither `collapse` nor `compact`.
		expect(
			conversation.sections.map((one) => one.messages.map((message) => message.content)),
		).toEqual([['round-1'], ['round-2'], ['round-3']])
		expect(events.compact.count).toBe(2)
		expect(events.collapse.count).toBe(0)

		// A subsequent successful compact() restores the cap.
		conversation.add({ role: 'assistant', content: 'round-4' })
		await conversation.compact()
		expect(conversation.sections).toHaveLength(2)
	})
})

describe('Conversation — hydrating through the snapshot option (C-c)', () => {
	it("a restored conversation's view() / search() / count work over the restored state", async () => {
		const stub = createStubSummarizer()
		const source = new Conversation({ id: 'r', summarize: stub.summarize, keep: 1 })
		source.add([
			{ role: 'user', content: 'alpha original' },
			{ role: 'assistant', content: 'beta reply' },
			{ role: 'user', content: 'gamma tail' },
		])
		await source.compact()

		const restored = new Conversation({
			summarize: createStubSummarizer().summarize,
			keep: 1,
			snapshot: source.snapshot(),
		})

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

		const restored = new Conversation({
			summarize: createStubSummarizer().summarize,
			snapshot: source.snapshot(),
		})
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

		const restored = new Conversation({
			summarize: createStubSummarizer().summarize,
			snapshot: source.snapshot(),
		})
		const events = createRecorders<ConversationEventMap, 'compact' | 'collapse' | 'rehydrate'>(
			restored.emitter,
			['compact', 'collapse', 'rehydrate'],
		)
		// No event fires merely from construction — the recorder saw nothing post-hydrate.
		expect(events.compact.count).toBe(0)
		expect(events.collapse.count).toBe(0)
		expect(events.rehydrate.count).toBe(0)
	})
})
