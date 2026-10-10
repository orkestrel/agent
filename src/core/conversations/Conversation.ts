import type {
	CompactOptions,
	ConversationEventMap,
	ConversationInterface,
	ConversationOptions,
	ConversationReferenceOptions,
	ConversationSnapshot,
	ConversationSummaryHandler,
	JudgmentManagerInterface,
	Section,
} from './types.js'
import type { Message, MessageInput } from '../types.js'
import type { EmitterInterface } from '@orkestrel/emitter'
import { isArray } from '@orkestrel/contract'
import { Emitter } from '@orkestrel/emitter'
import { collectExchanges, removeEntries, stripThinking } from '../helpers.js'
import { DEFAULT_CONVERSATION_KEEP } from './constants.js'
import { ConversationError } from './errors.js'
import { buildRecapMessage, buildSummaryMessage, requireSectionsCap } from './helpers.js'
import { JudgmentManager } from './JudgmentManager.js'

/**
 * Represents a conversation — a live uncompacted tail of messages it owns directly above a flat
 * message store, plus compacted, summarized {@link Section} records and a `summarizable` flag,
 * with on-demand `rehydrate` and substring `search`, driven by a provider-agnostic
 * {@link ConversationSummaryHandler} seam so `core` never imports a provider. Observable through
 * its own `emitter`.
 *
 * @remarks
 * - **Live tail + sections.** The conversation owns its live tail directly — `#messages` is an
 *   insertion-ordered `Map` of immutable {@link Message} records keyed by their minted id
 *   (`add` / `message` / `messages` / `remove` / `clear` / `count`), exactly as a `Workspace`
 *   owns its files (no separate per-value manager). `#sections` are the compacted history
 *   (oldest → newest), each a summarized slice that retains its originals.
 * - **`view()`.** Each section folds to one synthetic summary message (role `'assistant'` — a
 *   prior-context recap — keyed by the stable `id` of the section), then the live messages
 *   verbatim. The per-section summaries are the compaction benefit.
 * - **`compact()`.** Folds the oldest `count - keep` live messages into a section (its
 *   `summary` from `#summarize`), removes them from the live tail by id, and emits `compact`.
 *   The fold stops before the newest user message, so the request a run serves and its turns
 *   stay live. An exchange is a user message and every message after it up to the next user
 *   message. Leading messages form a separate exchange, retained until the first user exchange
 *   can also fold. A cut inside an exchange moves back to its start, so a fold removes whole
 *   exchanges. A cut inside an assistant call group, which only a group spanning two exchanges
 *   allows, moves before the group, so a tool result never stays live without its call. Returns
 *   the section, or `undefined` when nothing folds. A {@link ConversationError} is thrown when no
 *   `#summarize` was supplied.
 * - **`rehydrate(id)` / `search(query)`.** `rehydrate` returns the full original messages of a
 *   known section and emits its `id` through `rehydrate`, even when the list is empty. An unknown
 *   id returns `undefined` without an event. The read never reinserts messages. `search` is a case-insensitive
 *   substring scan of `content` across all messages (the originals of every section + the live
 *   tail).
 * - **Observable.** The owned {@link emitter} ({@link ConversationEventMap}) carries
 *   `compact` / `collapse` / `rehydrate`, emitted directly, strictly after the state change;
 *   the emitter isolates a listener throw and routes it to its `error` handler (the `error`
 *   option), so a buggy observer can never corrupt a compaction.
 *
 * @example
 * ```ts
 * const conversation = new Conversation({ summarize: async (m) => `recap of ${m.length}` })
 * conversation.add([
 * 	{ role: 'user', content: 'Hello' },
 * 	{ role: 'assistant', content: 'Hi there' },
 * 	{ role: 'user', content: 'What did I say?' },
 * ])
 * const section = await conversation.compact() // folds the first two into one summarized section
 * conversation.view() // [<recap of 2>, { role: 'user', content: 'What did I say?' }]
 * ```
 */
export class Conversation implements ConversationInterface {
	readonly #id: string
	// The push observation surface — owned, never inherited. The emitter isolates a
	// listener throw (routing it to the `error` handler), so it can never escape into a compaction.
	readonly #emitter: Emitter<ConversationEventMap>
	// The provider-agnostic summarizer seam — `undefined` ⇒ `compact()` throws (a conversation
	// can still store + view a live tail; it cannot fold).
	readonly #summarize: ConversationSummaryHandler | undefined
	// How many recent live messages a `compact()` retains verbatim (older ones fold).
	readonly #keep: number
	// The optional cap on the compacted sections list — `undefined` ⇒ unlimited. Enforced
	// after appending a fresh `compact()` fold: an overflow folds the oldest sections into one.
	readonly #cap: number | undefined
	// The compacted history, oldest → newest — each summarized slice retains its originals.
	// Replaced on every change rather than mutated in place.
	#sections: readonly Section[]
	// The live uncompacted tail the conversation owns directly — an insertion-ordered Map of
	// immutable messages keyed by their minted id.
	readonly #messages = new Map<string, Message>()
	readonly #judgments: JudgmentManager

	constructor(options?: ConversationOptions) {
		// A summarizer is a function and is never serialized, so it comes from options beside the
		// snapshot. Restoring is silent: nothing was edited, so no event fires.
		const snapshot = options?.snapshot
		this.#judgments = new JudgmentManager(snapshot?.judgments)
		this.#id = snapshot?.id ?? options?.id ?? crypto.randomUUID()
		this.#emitter = new Emitter<ConversationEventMap>(options)
		this.#summarize = options?.summarize
		this.#keep = options?.keep ?? DEFAULT_CONVERSATION_KEEP
		this.#cap = requireSectionsCap(options?.sections)
		this.#sections = snapshot === undefined ? [] : [...snapshot.sections]
		if (snapshot !== undefined) {
			for (const message of snapshot.messages) this.#messages.set(message.id, message)
		}
	}

	get id(): string {
		return this.#id
	}

	get judgments(): JudgmentManagerInterface {
		return this.#judgments
	}

	get emitter(): EmitterInterface<ConversationEventMap> {
		return this.#emitter
	}

	get sections(): readonly Section[] {
		return [...this.#sections]
	}

	get summarizable(): boolean {
		// True exactly when a summarizer was supplied — the clean signal the automatic compaction of
		// the agent loop gates on (a non-summarizable conversation is never auto-compacted, so the
		// auto path never throws the `SUMMARIZER` ConversationError). A manual `compact()` still throws.
		return this.#summarize !== undefined
	}

	get count(): number {
		return this.#messages.size
	}

	add(input: MessageInput): Message
	add(inputs: readonly MessageInput[]): readonly Message[]
	add(input: MessageInput | readonly MessageInput[]): Message | readonly Message[] {
		if (isArray(input)) return input.map((one) => this.#create(one))
		return this.#create(input)
	}

	message(id: string): Message | undefined {
		return this.#messages.get(id)
	}

	messages(): readonly Message[] {
		return [...this.#messages.values()]
	}

	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	remove(ids: string | readonly string[]): boolean {
		if (isArray(ids)) {
			return removeEntries(ids, (id) => this.#messages.delete(id))
		}
		return this.#messages.delete(ids)
	}

	clear(): void {
		this.#messages.clear()
	}

	view(): readonly Message[] {
		// The recap is framed (a `[Summary of earlier messages]` label prefix) so a small model reads
		// it as a condensed recap of prior turns, not as a literal assistant turn it must echo / treat
		// as the latest answer — a lean label (a handful of tokens), proven no-bloat by a test guard.
		return [
			...this.#sections.map((section) => buildRecapMessage(section)),
			...this.#messages.values(),
		]
	}

	async compact(options?: CompactOptions): Promise<Section | undefined> {
		const summarize = this.#summarize
		if (summarize === undefined) {
			throw new ConversationError(
				'SUMMARIZER',
				'cannot compact a conversation without a summarizer',
			)
		}
		const cap = requireSectionsCap(options?.sections ?? this.#cap)
		const keep = options?.keep ?? this.#keep
		const live = [...this.#messages.values()]
		// The newest user message is the request a run serves, so it and its turns stay live.
		const newest = live.findLastIndex((message) => message.role === 'user')
		const first = live.findIndex((message) => message.role === 'user')
		let fold = Math.min(
			keep <= 0 ? live.length : live.length - keep,
			newest === -1 ? live.length : newest,
		)
		let start = 0
		for (const exchange of collectExchanges(live)) {
			const end = start + exchange.length
			if (start < fold && fold < end) fold = start
			start = end
		}
		// Retain the leading context until the first user exchange can fold with it.
		if (first >= 0 && fold <= first) fold = 0
		if (fold <= 0) return undefined
		const slice = live.slice(0, fold)
		const summary = await summarize(stripThinking(slice, 'none'))
		const section: Section = {
			id: crypto.randomUUID(),
			summary,
			messages: slice,
		}
		for (const message of slice) this.#messages.delete(message.id)
		this.#sections = [...this.#sections, section]
		// Preserve the original sections if the merge fails by replacing them only after summarizing.
		if (cap !== undefined && this.#sections.length > cap) {
			const overflow = this.#sections.length - cap + 1
			const folded = this.#sections.slice(0, overflow)
			const merged: Section = {
				id: crypto.randomUUID(),
				summary: await summarize(folded.map((one) => buildSummaryMessage(one))),
				messages: folded.flatMap((one) => one.messages),
			}
			this.#sections = [merged, ...this.#sections.slice(overflow)]
			this.#emitter.emit('collapse', merged)
		}
		// Observe the section last, so a swallowed listener throw can't perturb the fold.
		this.#emitter.emit('compact', section)
		return section
	}

	rehydrate(id: string): readonly Message[] | undefined {
		const section = this.#sections.find((one) => one.id === id)
		if (section === undefined) return undefined
		// Emitted after resolving, because a read has no mutation for a listener to perturb.
		this.#emitter.emit('rehydrate', id)
		return section.messages
	}

	search(query: string): readonly Message[] {
		// Section originals (oldest → newest) come before the live tail.
		const needle = query.toLowerCase()
		const all = [
			...this.#sections.flatMap((section) => section.messages),
			...this.#messages.values(),
		]
		return all.filter((message) => message.content.toLowerCase().includes(needle))
	}

	reference(options?: ConversationReferenceOptions): string {
		// The leading marker states the block is not part of the live conversation, so a small
		// model reads the cherry-picked excerpts as foreign material it attributes to that source,
		// never as its own latest turns.
		const label = options?.label ?? this.#id
		const lines = [`[Reference — conversation "${label}" — NOT part of this conversation]`]
		const messages = options?.messages ?? []
		if (messages.length > 0) {
			lines.push('Relevant messages:')
			for (const message of messages) lines.push(`- ${message.role}: ${message.content}`)
		}
		return lines.join('\n')
	}

	snapshot(): ConversationSnapshot {
		// The summarizer / keep are not serialized — they are live config re-supplied on hydrate
		// (a ConversationSummaryHandler is a function, not data).
		return {
			id: this.#id,
			sections: this.sections,
			messages: this.messages(),
			...(this.#judgments.count === 0 ? {} : { judgments: this.#judgments.judgments() }),
		}
	}

	// Spread each optional only when present, so an absent optional is never stored as `undefined`.
	#create(input: MessageInput): Message {
		const message: Message = {
			id: crypto.randomUUID(),
			role: input.role,
			content: input.content,
			...(input.calls === undefined ? {} : { calls: input.calls }),
			...(input.call === undefined ? {} : { call: input.call }),
			...(input.images === undefined ? {} : { images: input.images }),
			...(input.thinking === undefined ? {} : { thinking: input.thinking }),
		}
		this.#messages.set(message.id, message)
		return message
	}
}
