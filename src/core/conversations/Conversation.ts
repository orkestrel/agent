import type { EmitterInterface } from '@orkestrel/emitter'
import type {
	CompactOptions,
	ConversationEventMap,
	ConversationInterface,
	ConversationOptions,
	ConversationReferenceOptions,
	ConversationSnapshot,
	ConversationSummaryHandler,
	MessageInput,
	Message,
	Section,
} from '../types.js'
import { isArray } from '@orkestrel/contract'
import { DEFAULT_CONVERSATION_KEEP } from '../constants.js'
import { Emitter } from '@orkestrel/emitter'
import { ConversationError } from '../errors.js'
import { buildRecapMessage, buildSummaryMessage } from '../helpers.js'

/**
 * Represents a conversation — a live uncompacted tail of messages it OWNS DIRECTLY ABOVE a
 * flat message store, plus compacted, summarized {@link Section}s and a regenerated rollup
 * `summary`, with on-demand `rehydrate` and substring `search`, driven by a provider-agnostic
 * {@link ConversationSummaryHandler} seam (so `core` never imports a provider).
 *
 * @remarks
 * - **Live tail + sections.** The conversation OWNS its live tail DIRECTLY — `#messages` is an
 *   insertion-ordered `Map` of immutable {@link Message}s keyed by their minted id
 *   (the SAME store mechanics a flat manager had, folded in: `add` / `message` / `messages` /
 *   `remove` / `clear` / `count`), exactly as a `Workspace` owns its files (no separate
 *   per-value manager). `#sections` are the compacted history (oldest → newest), each a
 *   summarized slice that RETAINS its originals. `#summary` is the rollup (a
 *   summary-of-summaries over all sections), regenerated on each compaction (`undefined`
 *   until the first).
 * - **`view()`.** Each section folds to ONE synthetic summary message (role `'assistant'` — a
 *   prior-context recap — keyed by the section's stable `id`), then the live messages
 *   verbatim. The rollup `summary` is NOT injected (it is separately pull-able); `view()`
 *   carries the per-section summaries, which ARE the compaction benefit.
 * - **`compact()`.** Folds the oldest `count - keep` live messages into a new section
 *   (its `summary` from `#summarize`), removes them from the live tail by id, regenerates the
 *   rollup (a SECOND `#summarize` over all section summaries), and emits `summary` then
 *   `compact`. Returns the section, or `undefined` when nothing folds (`count <= keep`).
 *   THROWS a {@link ConversationError} when no `#summarize` was supplied. Two summarizer calls
 *   per compaction.
 * - **`rehydrate(id)` / `search(query)`.** `rehydrate` returns a section's full original
 *   messages (`[]` for an unknown id) and emits `rehydrate` — a pure read (the caller decides
 *   whether to re-add them; `rehydrate` never reinserts). `search` is a case-insensitive
 *   substring scan of `content` across ALL messages (every section's originals + the live tail).
 * - **Observable.** The owned {@link emitter} ({@link ConversationEventMap}) carries
 *   `compact` / `summary` / `rehydrate`, emitted directly, strictly AFTER the state change;
 *   the emitter isolates a listener throw and routes it to its `error` handler (the `error`
 *   option), so a buggy observer can never corrupt a compaction.
 *
 * @example
 * ```ts
 * const conversation = new Conversation({ summarize: async (m) => `recap of ${m.length}` })
 * conversation.add([
 * 	{ role: 'user', content: 'Hello' },
 * 	{ role: 'assistant', content: 'Hi there' },
 * ])
 * const section = await conversation.compact() // folds both into one summarized section
 * conversation.view() // [{ role: 'assistant', content: 'recap of 2' }] — the live tail is empty
 * conversation.summary // 'recap of 1' — the rollup over the one section
 * ```
 */
export class Conversation implements ConversationInterface {
	readonly #id: string
	// The PUSH observation surface — owned, never inherited. The emitter isolates a
	// listener throw (routing it to the `error` handler), so it can never escape into a compaction.
	readonly #emitter: Emitter<ConversationEventMap>
	// The provider-agnostic summarizer seam — `undefined` ⇒ `compact()` throws (a conversation
	// can still store + view a live tail; it cannot fold).
	readonly #summarize: ConversationSummaryHandler | undefined
	// How many recent live messages a `compact()` retains verbatim (older ones fold).
	readonly #keep: number
	// The optional cap on the compacted sections list — `undefined` ⇒ unlimited. Enforced
	// AFTER pushing a fresh `compact()` fold: an overflow folds the oldest sections into one.
	readonly #cap: number | undefined
	// The compacted history, oldest → newest — each summarized slice RETAINS its originals.
	readonly #sections: Section[] = []
	// The rollup (a summary-of-summaries over all sections), regenerated on each compaction.
	#summary: string | undefined
	// The LIVE uncompacted tail the conversation OWNS DIRECTLY — an insertion-ordered Map of
	// immutable messages keyed by their minted id (the flat store mechanics folded in).
	readonly #messages = new Map<string, Message>()

	constructor(options?: ConversationOptions) {
		// An optional snapshot to HYDRATE FROM — its `id` is the conversation's identity (so it
		// WINS over `options.id`), and its rollup `summary` / compacted `sections` / live tail are
		// restored, with the live `summarize` / `keep` / `on` supplied through `options` alongside it
		// (a summarizer is a function, not serialized — re-supplied as config). Restoring is SILENT
		// (no events — nothing was edited). `ConversationOptions.snapshot` is the ONE declared seam
		// every caller reaches it through — `createConversation(options)` hydrates through it, and
		// `ConversationManager.add` passes a stored snapshot in the same options object.
		const snapshot = options?.snapshot
		this.#id = snapshot?.id ?? options?.id ?? crypto.randomUUID()
		this.#emitter = new Emitter<ConversationEventMap>({
			...(options?.on === undefined ? {} : { on: options.on }),
			...(options?.error === undefined ? {} : { error: options.error }),
		})
		this.#summarize = options?.summarize
		this.#keep = options?.keep ?? DEFAULT_CONVERSATION_KEEP
		if (options?.sections !== undefined && options.sections < 1) {
			throw new ConversationError('SECTIONS', 'a sections cap must be >= 1')
		}
		this.#cap = options?.sections
		if (snapshot !== undefined) {
			this.#summary = snapshot.summary
			for (const section of snapshot.sections) this.#sections.push(section)
			for (const message of snapshot.messages) this.#messages.set(message.id, message)
		}
	}

	get id(): string {
		return this.#id
	}

	get emitter(): EmitterInterface<ConversationEventMap> {
		return this.#emitter
	}

	get summary(): string | undefined {
		return this.#summary
	}

	get sections(): readonly Section[] {
		return [...this.#sections]
	}

	get summarizable(): boolean {
		// True exactly when a summarizer was supplied — the clean signal the agent loop's AUTOMATIC
		// compaction gates on (a non-summarizable conversation is never auto-compacted, so the auto
		// path never throws the `SUMMARIZER` ConversationError). A manual `compact()` still throws.
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
			// True only when EVERY supplied id was present and removed, so a caller can tell a
			// fully applied batch from a partly applied one.
			let removed = true
			for (const id of ids) {
				if (!this.#messages.delete(id)) removed = false
			}
			return removed
		}
		return this.#messages.delete(ids)
	}

	clear(): void {
		this.#messages.clear()
	}

	view(): readonly Message[] {
		// Each section → ONE synthetic RECAP message (the compaction benefit), then the live
		// tail verbatim. The rollup `summary` is deliberately NOT injected here. The recap is
		// framed (a `[Summary of earlier messages]` label prefix) so a small model reads it as a
		// CONDENSED RECAP of prior turns, not as a literal assistant turn it must echo / treat as
		// the latest answer — a lean label (a handful of tokens), proven no-bloat by a test guard.
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
		const cap = options?.sections ?? this.#cap
		if (cap !== undefined && cap < 1) {
			throw new ConversationError('SECTIONS', 'a sections cap must be >= 1')
		}
		const keep = options?.keep ?? this.#keep
		const live = [...this.#messages.values()]
		// Fold the OLDEST `count - keep` live messages; nothing to fold ⇒ a no-op.
		const fold = keep <= 0 ? live.length : live.length - keep
		if (fold <= 0) return undefined
		const slice = live.slice(0, fold)
		// 1. Digest the folded slice into the section summary (the FIRST summarizer call).
		const summary = await summarize(slice)
		const section: Section = {
			id: crypto.randomUUID(),
			summary,
			messages: slice,
		}
		// 2. Remove the folded messages from the live tail (by their ids) and push the section.
		for (const message of slice) this.#messages.delete(message.id)
		this.#sections.push(section)
		// 3. Enforce the bounded-`sections` cap: an overflow past `cap` folds the OLDEST
		// overflow sections into ONE merged section (a THIRD summarizer call over the folded
		// section summaries), so `#sections.length === cap` afterward.
		if (cap !== undefined && this.#sections.length > cap) {
			const overflow = this.#sections.length - cap + 1
			const folded = this.#sections.slice(0, overflow)
			try {
				const merged: Section = {
					id: crypto.randomUUID(),
					summary: await summarize(folded.map((one) => buildSummaryMessage(one))),
					messages: folded.flatMap((one) => one.messages),
				}
				this.#sections.splice(0, overflow, merged)
				this.#emitter.emit('collapse', merged)
			} catch (error) {
				// The merge summarizer call threw — the sections stay transiently at `cap + 1`
				// (no splice, no loss), but the rollup below still regenerates over the CURRENT
				// (unmerged) sections so it is never left stale, then the error propagates
				// (manual `compact()` always surfaces a summarizer failure to its caller; the
				// next successful `compact()` self-heals the over-cap count).
				this.#summary = await summarize(this.#sections.map((one) => buildSummaryMessage(one)))
				this.#emitter.emit('summary', this.#summary)
				throw error
			}
		}
		// 4. Regenerate the rollup — a summary-of-summaries over ALL (now-capped) sections
		// — then observe it, AFTER the mutation, through the guarded path.
		this.#summary = await summarize(this.#sections.map((one) => buildSummaryMessage(one)))
		this.#emitter.emit('summary', this.#summary)
		// 5. Observe the new section last, so a swallowed listener throw can't perturb the fold.
		this.#emitter.emit('compact', section)
		return section
	}

	rehydrate(id: string): readonly Message[] {
		const section = this.#sections.find((one) => one.id === id)
		// A pure read — emit `rehydrate` AFTER resolving (no mutation to perturb); `rehydrate`
		// never reinserts the originals (the caller decides). Unknown id ⇒ an empty list.
		this.#emitter.emit('rehydrate', id)
		return section === undefined ? [] : section.messages
	}

	search(query: string): readonly Message[] {
		// Case-insensitive substring over `content` across ALL messages — every section's
		// retained originals (oldest → newest) first, then the live tail.
		const needle = query.toLowerCase()
		const all = [
			...this.#sections.flatMap((section) => section.messages),
			...this.#messages.values(),
		]
		return all.filter((message) => message.content.toLowerCase().includes(needle))
	}

	reference(options?: ConversationReferenceOptions): string {
		// Render THIS conversation as a self-labeled, fenced PROVENANCE block to pull into ANOTHER
		// conversation (as a `document`). PURE string — never a model call. The leading marker
		// names the source (`label`, default the `id`) and states it is NOT part of the live
		// conversation, so a small model reads the rollup + cherry-picked excerpts as FOREIGN
		// material it attributes to that source, never as its own latest turns.
		const label = options?.label ?? this.#id
		const lines = [`[Reference — conversation "${label}" — NOT part of this conversation]`]
		// The rollup `summary` (a summary-of-summaries) — included WHEN opted in (default true) AND
		// one exists (`undefined` until the first compaction drops the line).
		if (options?.summary !== false && this.#summary !== undefined) {
			lines.push(`Summary: ${this.#summary}`)
		}
		// The CHERRY-PICKED excerpts (each `- role: content`) — the few relevant turns the caller
		// selected (through this conversation's own `search` / `rehydrate`), NOT the whole history.
		const messages = options?.messages ?? []
		if (messages.length > 0) {
			lines.push('Relevant messages:')
			for (const message of messages) lines.push(`- ${message.role}: ${message.content}`)
		}
		return lines.join('\n')
	}

	snapshot(): ConversationSnapshot {
		// The container serializes ITSELF: its id + the rollup summary + the compacted sections +
		// the live tail. The summarizer / keep are NOT serialized — they are live CONFIG re-supplied
		// on hydrate (a ConversationSummaryHandler is a function, not data). The sections + messages are
		// already plain immutable records, so the snapshot JSON-round-trips losslessly; mutates nothing.
		return {
			id: this.#id,
			...(this.#summary === undefined ? {} : { summary: this.#summary }),
			sections: this.sections,
			messages: this.messages(),
		}
	}

	// Mint an immutable live-tail message from one input — a fresh UUID id plus the input's
	// role / content, carrying `calls` / `images` only when the input supplied them (each
	// spread in conditionally, so an absent optional is never stored as `undefined`). Stored
	// by id and returned; never mutated after creation.
	#create(input: MessageInput): Message {
		const message: Message = {
			id: crypto.randomUUID(),
			role: input.role,
			content: input.content,
			...(input.calls === undefined ? {} : { calls: input.calls }),
			...(input.images === undefined ? {} : { images: input.images }),
		}
		this.#messages.set(message.id, message)
		return message
	}
}
