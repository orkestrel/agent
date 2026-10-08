import type {
	JudgeAnswer,
	JudgeInterface,
	JudgeQuestion,
	JudgeRequest,
	Message,
	MessageInput,
	Refusal,
} from '../types.js'
import type { TokenUsage } from '@orkestrel/budget'
import type { EmitterErrorHandler, EmitterHooks, EmitterInterface } from '@orkestrel/emitter'

/** Records an answered or refused question with its sources, state, model, and storage time. */
export interface Judgment {
	readonly id: string
	readonly question: JudgeQuestion
	/** Carries the answer when the question was answered; mutually exclusive with refusal. */
	readonly answer?: JudgeAnswer
	/** Carries the refusal when the question was refused; mutually exclusive with answer. */
	readonly refusal?: Refusal
	readonly model: string
	readonly sources: readonly string[]
	readonly state: string
	readonly time: number
	/** Carries usage only when the answering request held this question alone. */
	readonly usage?: TokenUsage
}

/** Supplies an answered or refused question for storage before its time is stamped. */
export interface JudgmentInput {
	readonly id: string
	readonly question: JudgeQuestion
	readonly answer?: JudgeAnswer
	readonly refusal?: Refusal
	readonly model: string
	readonly sources: readonly string[]
	readonly state: string
	readonly usage?: TokenUsage
}

/** Stores judgments by caller key and resolves requests by reusing matching records. */
export interface JudgmentManagerInterface {
	readonly count: number
	/** Stores inputs with the current epoch milliseconds; an existing key is replaced. */
	add(input: JudgmentInput): Judgment
	add(inputs: readonly JudgmentInput[]): readonly Judgment[]
	/** Returns the record for a key, or `undefined` when absent. */
	judgment(id: string): Judgment | undefined
	/** Returns stored records in insertion order. */
	judgments(): readonly Judgment[]
	/** Removes every supplied key; returns `true` only when all were present. */
	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	/** Removes all records. */
	clear(): void
	/**
	 * Reuses matching records and asks for the unmatched questions in one request.
	 *
	 * @param judge - The judge whose model identity participates in reuse
	 * @param request - The state and keyed questions to resolve
	 * @param sources - The ordered message ids the questions concern
	 * @param signal - The cancellation signal checked before asking
	 * @returns The resolved records in request key order
	 * @throws JudgeAbortError Thrown when asking aborts, after completed partial records are stored
	 */
	resolve(
		judge: JudgeInterface,
		request: JudgeRequest,
		sources: readonly string[],
		signal: AbortSignal,
	): Promise<readonly Judgment[]>
}

/**
 * Stores immutable {@link Message}s in insertion order and mints each `id` on `add` — the
 * message-store contract {@link AgentContextInterface.messages} is typed to, which the active
 * {@link ConversationInterface} satisfies structurally.
 *
 * @remarks
 * - **Store.** Messages live in insertion order; `count` is how many are stored.
 *   `add` takes one {@link MessageInput} or a batch and mints each message's
 *   `id` (a random UUID), returning the created message(s). A stored message is
 *   immutable — created once from its input, never mutated.
 * - **Lookup.** `message(id)` resolves one by id (`undefined` when absent);
 *   `messages()` lists every message in insertion order.
 * - **Removal.** `remove` drops one by id, or a batch — `true` only when every supplied id
 *   was removed; `clear` empties the store.
 * - **Event-free.** A purely data store — no Emitter, no events.
 */
export interface MessageManagerInterface {
	readonly count: number
	/**
	 * Stores one {@link MessageInput}, or a batch — mints each message's `id` and returns the
	 * created message or messages; a stored message is immutable.
	 */
	add(input: MessageInput): Message
	add(inputs: readonly MessageInput[]): readonly Message[]
	/** Looks up one stored message by id (`undefined` when absent). */
	message(id: string): Message | undefined
	/** Lists every stored message, in insertion order. */
	messages(): readonly Message[]
	/**
	 * Removes one message by id, or a batch — `true` only when every supplied id was removed.
	 */
	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	/** Removes every stored message. */
	clear(): void
}

/**
 * Summarizes a conversation, provider-agnostically — the seam the agent runtime supplies so core
 * never imports a provider. Given the folded messages, it resolves their digest, the model-written
 * summary used to summarize a compacted {@link Section} and to regenerate a {@link
 * ConversationInterface}'s rollup `summary`.
 *
 * @remarks
 * The agent runtime builds one from its `ProviderInterface` (for example
 * `async (messages) => (await provider.generate([systemPrompt, ...messages], signal)).content`)
 * and hands it to a {@link ConversationInterface} / {@link ConversationManagerInterface}.
 * The core conversation layer treats it as an opaque async function — it never reads which
 * backend produced the digest, keeping `core` free of any provider coupling.
 *
 * @param messages - The folded messages to digest into a summary
 * @returns The summary text (the model-written digest of those messages)
 */
export type ConversationSummaryHandler = (messages: readonly Message[]) => Promise<string>

/**
 * Holds a slice of folded messages digested into a summary — the unit of compaction a
 * {@link ConversationInterface} produces when it `compact`s its live tail.
 *
 * @remarks
 * `summary` is the model-written digest of this slice (through the
 * {@link ConversationSummaryHandler}); `messages` are the folded originals, retained in full so
 * `rehydrate` can pull them back and `search` can scan them (compaction shrinks the model
 * input, never discards history).
 */
export interface Section {
	readonly id: string
	/** Holds the model-written digest of this slice (its {@link ConversationSummaryHandler} output). */
	readonly summary: string
	/** Retains the folded original messages in full for `rehydrate` / `search`. */
	readonly messages: readonly Message[]
}

/**
 * Maps the push observation surface of a {@link ConversationInterface} — the compaction
 * moments a fire-and-forget observer subscribes to through `conversation.emitter.on`.
 *
 * @remarks
 * `compact` carries the newly-folded {@link Section}; `collapse` carries a section
 * created by folding multiple older sections together (a bounded-`sections` cap enforcement,
 * distinct from `compact`'s fresh live-tail fold); `summary` carries the regenerated
 * conversation rollup (refreshed on each compaction); `rehydrate` carries the `id` of a
 * section whose originals were pulled back. Listener isolation is the emitter's:
 * every event is emitted directly and a listener throw is routed to the emitter's
 * `error` handler (the `error` option), never onto this map, so a buggy observer can never
 * corrupt a compaction. A `type` alias (not `interface extends EventMap`) so the
 * type-literal satisfies `EventMap` structurally.
 */
export type ConversationEventMap = {
	/** Reports a new section folded from the live tail — the created section. */
	readonly compact: readonly [section: Section]
	/** Reports the conversation rollup regenerated — the new summary text. */
	readonly summary: readonly [summary: string]
	/** Reports a section's original messages pulled back — the section's `id`. */
	readonly rehydrate: readonly [id: string]
	/**
	 * Reports the bounded-`sections` cap folding the oldest sections into one merged section — the
	 * merged {@link Section} that replaced them.
	 */
	readonly collapse: readonly [section: Section]
}

/**
 * Configures `createConversation` — the optional `id`, the reserved `on` hooks, the
 * provider-agnostic `summarize` seam, the retained-tail size, an optional cap on the compacted
 * `sections` list, and a {@link ConversationSnapshot} to hydrate from.
 *
 * @remarks
 * `id` is the conversation's identity (a random UUID when omitted). `on` is the reserved
 * listener key (initial {@link ConversationEventMap} listeners). `summarize` is the
 * {@link ConversationSummaryHandler} compaction needs — absent ⇒ `compact()` throws a
 * {@link import('./errors.js').ConversationError} (a conversation can still store + view a
 * live tail; it cannot fold). `keep` is how many recent live messages a `compact()`
 * retains verbatim (folding only the older ones); it defaults to
 * {@link import('./constants.js').DEFAULT_CONVERSATION_KEEP} (`0` — a manual `compact()`
 * folds the whole current live tail into one section). `sections` is an optional cap on the
 * compacted `sections` list — when set (`>= 1`), a `compact()` that would leave more than
 * `sections` sections folds the oldest overflow into one merged section so the list never
 * exceeds `sections`, emitting `collapse`; omitted ⇒ unlimited.
 * `snapshot` is the hydration seam — a {@link ConversationSnapshot} whose `id`, rollup
 * `summary`, compacted `sections`, and live tail are restored into the new conversation, with
 * the live `summarize` / `keep` / `on` supplied alongside it (a summarizer is a function, not
 * serialized data). Restoring is silent (no events — nothing was edited), and a `snapshot.id`
 * wins over `id` (the snapshot is the conversation's identity). It is what lets
 * `createConversation` hydrate, and what a {@link ConversationManagerInterface.open} reads a
 * stored snapshot back through.
 */
export interface ConversationOptions {
	readonly id?: string
	readonly on?: EmitterHooks<ConversationEventMap>
	/** Holds the emitter's listener-error handler — a listener throw routes here, not to a domain event. */
	readonly error?: EmitterErrorHandler
	/** Supplies the summarizer compaction needs; absent ⇒ `compact()` throws a `ConversationError`. */
	readonly summarize?: ConversationSummaryHandler
	/** Keeps this many recent live messages verbatim on `compact`; defaults to `DEFAULT_CONVERSATION_KEEP` (`0`). */
	readonly keep?: number
	/** Caps the compacted `sections` list (`>= 1`); overflow folds into one merged section. Omitted ⇒ unlimited. */
	readonly sections?: number
	/** Hydrates from a {@link ConversationSnapshot} — its `id` wins over `id`; restoring is silent. */
	readonly snapshot?: ConversationSnapshot
}

/**
 * Configures one {@link ConversationInterface.compact} call — the retained-tail size, the
 * `sections` cap, or both, overridden for one fold.
 *
 * @remarks
 * `keep` overrides the conversation's configured retained-tail size for this compaction only
 * (the older `count - keep` live messages fold; when `count <= keep` nothing folds and
 * `compact()` is a no-op returning `undefined`). Omitted ⇒ the conversation's own `keep`
 * (its option, or `DEFAULT_CONVERSATION_KEEP`) applies. `sections` overrides the conversation's
 * configured `sections` cap for this compaction only — after the new section is pushed, an
 * overflow past `sections` folds the oldest sections into one merged section. Omitted ⇒ the
 * conversation's own `sections` cap (or unlimited) applies.
 */
export interface CompactOptions {
	/** Overrides the retained-tail size for this compaction; omitted ⇒ the conversation's own `keep`. */
	readonly keep?: number
	/** Overrides the `sections` cap for this compaction; omitted ⇒ the conversation's own cap (or unlimited). */
	readonly sections?: number
}

/**
 * Configures {@link ConversationInterface.reference} — how to render one conversation as a
 * self-labeled, fenced provenance block to pull into another conversation by writing it to the
 * active context's active workspace: `label` defaults to the `id`, `summary` defaults to `true`,
 * and `messages` are cherry-picked excerpts defaulting to none.
 *
 * @remarks
 * The rendered block is a cross-conversation reference a small model must read as foreign
 * material, not as part of the live thread — so every member keeps it concise and unmistakably
 * attributed:
 * - `label` — the human provenance name shown in the block's leading marker (for example `'planning'`);
 *   defaults to the conversation's own `id`. It is what the model attributes the content to.
 * - `summary` — whether to include the conversation's rollup `summary` (its summary-of-summaries)
 *   in the block; defaults to `true` (the rollup is included when one exists — `undefined` until
 *   the first compaction omits the `Summary:` line). Pass `false` to exclude it.
 * - `messages` — the cherry-picked excerpts to include (each rendered `role: content`), default
 *   none. The intended source is the conversation's own `search(query)` / `rehydrate(id)` output
 *   (select the few relevant turns), not its whole history — dumping every message defeats the
 *   point (it re-bloats the destination context a small model then has to wade through).
 */
export interface ConversationReferenceOptions {
	/** Names the human provenance label in the block's marker; defaults to the conversation's `id`. */
	readonly label?: string
	/** Includes the conversation's rollup `summary` (when one exists); defaults to `true`. */
	readonly summary?: boolean
	/** Lists the cherry-picked excerpts to include (`role: content`); defaults to none. */
	readonly messages?: readonly Message[]
}

/**
 * Groups messages above the flat {@link MessageManagerInterface} — a live uncompacted tail plus
 * compacted, summarized {@link Section}s and a conversation rollup `summary`, with on-demand
 * `rehydrate`, substring `search`, a cross-conversation `reference`, and a JSON `snapshot`, driven
 * by a provider-agnostic {@link ConversationSummaryHandler} seam; `summarizable` reports whether
 * that seam was supplied, and the agent loop gates automatic compaction on it.
 *
 * @remarks
 * - **Live tail + sections.** The conversation owns its live uncompacted tail directly — a
 *   caller appends turns through its own message verbs (`add` mints each `id`, `message` /
 *   `messages` look up, `remove` / `clear` drop, `count` tallies), exactly as a `Workspace`
 *   owns its files (no separate per-value manager). `sections` are the compacted history
 *   (oldest → newest), each a summarized slice that retains its originals. `summary` is the
 *   conversation rollup (a summary-of-summaries over all sections), regenerated on each
 *   compaction (`undefined` until the first compaction).
 * - **Message verbs (the inlined store).** `add` takes one {@link MessageInput} or a batch,
 *   mints each message's `id` (a random UUID), stores it, and returns the created
 *   message(s); a stored message is immutable. `message(id)` resolves one (`undefined` when
 *   absent); `messages()` lists the live tail in insertion order; `remove` drops one by id or
 *   a batch (`true` only when every supplied id was removed); `clear` empties the tail;
 *   `count` is how many live messages are stored.
 * - **`view()` — the model input.** Each section folds to one synthetic summary message,
 *   followed by the live messages verbatim: `[...sections-as-summary-messages, ...live]`. The
 *   rollup `summary` is not injected (it is a separately pull-able digest for a
 *   cross-conversation case); `view()` carries the per-section summaries, which are the
 *   compaction benefit.
 * - **`compact()` — fold older live → a section.** Folds the oldest `count - keep` live
 *   messages into a new {@link Section} (its `summary` from `summarize`), removes
 *   them from the live tail, regenerates the rollup (a second `summarize` over all section
 *   summaries), and emits `summary` then `compact` — returning the new section (or
 *   `undefined` when nothing folds). A compaction calls the summarizer for the section
 *   digest and again for the rollup. Throws a
 *   {@link import('./errors.js').ConversationError} when no `summarize` was supplied.
 * - **`summarizable` — whether a `compact()` can fold.** `true` when a
 *   {@link ConversationSummaryHandler} was supplied, `false` otherwise. The agent loop's automatic
 *   compaction (`AgentOptions.window`) gates on it so a conversation that has no summarizer is
 *   never auto-compacted (and the loop never throws the `compact()` `SUMMARIZER` error from the
 *   auto path). A manual `compact()` still throws without a summarizer — only the auto path is
 *   guarded.
 * - **`rehydrate(id)` / `search(query)` — read the retained originals.** `rehydrate` returns
 *   a section's full original messages (`[]` for an unknown id) and emits `rehydrate` — a
 *   pure read (the caller decides whether to re-add them; `rehydrate` never reinserts).
 *   `search` is a case-insensitive substring scan of `content` across all messages (every
 *   section's originals + the live tail).
 * - **`reference(options?)` — pull this conversation into another with provenance.** A pure
 *   string render (no model call) of a self-labeled, fenced cross-conversation block — the
 *   rollup `summary` (when included + present) plus cherry-picked excerpts — framed so a small
 *   model reads it as foreign material. Written into the active conversation's context through
 *   the active workspace (`context.workspaces.active?.write(path, block)`); the cherry-pick
 *   comes from this conversation's own `search` / `rehydrate`, never its whole history.
 * - **Observable.** The owned `emitter` ({@link ConversationEventMap}) carries
 *   `compact` / `summary` / `rehydrate`; the emitter isolates a listener throw and routes it
 *   to its `error` handler (the `error` option).
 */
export interface ConversationInterface {
	readonly id: string
	/** Holds the judgments recorded beside this conversation's messages. */
	readonly judgments: JudgmentManagerInterface
	readonly emitter: EmitterInterface<ConversationEventMap>
	/** Holds the conversation rollup (a summary-of-summaries), regenerated on each compaction; `undefined` until the first. */
	readonly summary: string | undefined
	/** Lists the compacted history, oldest → newest. */
	readonly sections: readonly Section[]
	/**
	 * Reports whether a `compact()` can fold — `true` when a {@link ConversationSummaryHandler} was supplied.
	 * The agent loop's automatic compaction (`AgentOptions.window`) gates on it (a non-summarizable
	 * conversation is never auto-compacted, so the auto path never throws the `SUMMARIZER` error);
	 * a manual `compact()` still throws without a summarizer.
	 */
	readonly summarizable: boolean
	/** Counts the live (uncompacted) messages stored in the tail. */
	readonly count: number
	/**
	 * Appends one {@link MessageInput} to the live tail, or a batch — mints each message's `id`
	 * (a random UUID) and returns the created message or messages; a stored message is
	 * immutable.
	 *
	 * @param input - One {@link MessageInput}, or a batch
	 * @returns The created {@link Message}(s), with their minted `id`s
	 */
	add(input: MessageInput): Message
	add(inputs: readonly MessageInput[]): readonly Message[]
	/**
	 * Looks up one live message by id (`undefined` when absent).
	 *
	 * @param id - The message id to resolve
	 * @returns The {@link Message}, or `undefined` when absent
	 */
	message(id: string): Message | undefined
	/**
	 * Lists every live, uncompacted message in the tail, in insertion order.
	 *
	 * @returns The live tail, in insertion order
	 */
	messages(): readonly Message[]
	/**
	 * Removes one live message by id, or a batch, from the tail — `true` only when every
	 * supplied id was removed.
	 *
	 * @param id - One message id, or a batch
	 * @returns True when every supplied id was present and removed; false otherwise
	 */
	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	/** Empties the live tail, leaving the compacted `sections` untouched. */
	clear(): void
	/**
	 * Builds the model input for the next turn — each section as one synthetic recap message,
	 * its summary prefixed with `CONVERSATION_RECAP_PREFIX` so a small model reads it as a
	 * recap rather than a literal turn, then the live tail verbatim; the rollup `summary` is
	 * not injected.
	 *
	 * @returns `[...sections-as-summary-messages, ...live messages]`
	 */
	view(): readonly Message[]
	/**
	 * Folds the oldest `count - keep` live messages into a summarized {@link Section} through
	 * the {@link ConversationSummaryHandler}, removes them from the live tail, regenerates the
	 * rollup, and emits `summary` then `compact` — resolving `undefined` when nothing folds
	 * (`count <= keep`). Throws a {@link import('./errors.js').ConversationError} when no
	 * summarizer was supplied.
	 *
	 * @remarks
	 * The effective `keep` comes from `options`, else the conversation's own. Regenerating the
	 * rollup runs `summarize` again, over all sections.
	 *
	 * @remarks
	 * When a `sections` cap is set and the fold pushes the section count over it, an overflow
	 * merge step folds the oldest sections into one — if that merge's `summarize` call throws,
	 * the merge is skipped (sections transiently sit at `cap + 1`, no loss) but the rollup still
	 * regenerates over the current unmerged sections (never left stale) before the error
	 * propagates; the next successful `compact()` self-heals the section count back to `cap`.
	 *
	 * @param options - Optional {@link CompactOptions} (`keep` overrides the retained-tail size)
	 * @returns The new {@link Section}, or `undefined` when nothing folded
	 */
	compact(options?: CompactOptions): Promise<Section | undefined>
	/**
	 * Returns a section's full original messages — a pure read that emits `rehydrate`, empty for
	 * an unknown id and never reinserting.
	 *
	 * @param id - The {@link Section} `id` to pull back
	 * @returns The section's retained original messages (empty when no such section)
	 */
	rehydrate(id: string): readonly Message[]
	/**
	 * Searches `content` for a case-insensitive substring across every message — each section's
	 * retained originals, then the live tail.
	 *
	 * @param query - The substring to match (case-insensitive)
	 * @returns The matching messages, sections' originals first then the live tail
	 */
	search(query: string): readonly Message[]
	/**
	 * Renders this conversation as a self-labeled, fenced provenance block to pull into another
	 * conversation — a pure string with no model call: a leading
	 * `[Reference — conversation "<label>" — NOT part of this conversation]` marker, the rollup
	 * `Summary:` when `summary` is not `false` and a rollup exists, and the cherry-picked
	 * excerpts (`- role: content`) when `messages` is supplied. `label` defaults to the `id`.
	 *
	 * @remarks
	 * The block leads with an unmistakable provenance marker
	 * (`[Reference — conversation "<label>" — NOT part of this conversation]`), then optionally
	 * the rollup `Summary:` (when `options.summary !== false` and a rollup exists), then the
	 * cherry-picked `Relevant messages:` (each `- role: content`) when `options.messages` is
	 * supplied. The intended flow is to pull another conversation B into the active conversation
	 * A's active workspace: decide relevance from `B.summary`, select the few right turns with
	 * `B.search(query)` / `B.rehydrate(id)`, frame them here, then
	 * `A.context.workspaces.active?.write(\`conversation:${B.id}.md\`, B.reference({ label, messages }))`.
	 * Keep the excerpts cherry-picked, never B's whole history — this content enters another
	 * context a small model must read.
	 *
	 * @param options - The {@link ConversationReferenceOptions} (label / summary / cherry-picked messages)
	 * @returns The rendered provenance block (a concise, fenced, self-attributed string)
	 */
	reference(options?: ConversationReferenceOptions): string
	/**
	 * Serializes this conversation to a plain, JSON-serializable {@link ConversationSnapshot} —
	 * its `id`, the rollup `summary`, the compacted `sections`, and the live tail; the live
	 * `summarize` / `keep` are configuration re-supplied on hydrate rather than serialized.
	 *
	 * @remarks
	 * The container serializes itself (`{ id, summary?, sections, messages, judgments? }`) — the
	 * {@link ConversationStoreInterface} persistence seam's payload, the exact analogue of
	 * {@link import('@orkestrel/workspace').WorkspaceInterface}'s `snapshot`. The summarizer /
	 * `keep` are not serialized — they are live
	 * config re-supplied on hydrate (a `ConversationSummaryHandler` is a function, not data). The snapshot
	 * is the durable analogue of the `snapshot` option: a {@link ConversationManagerInterface}
	 * hydrates a conversation from it through that seam (see {@link ConversationManagerInterface.open}).
	 * Pure — the sections + messages are already plain immutable records (so the snapshot
	 * `structuredClone`s / JSON-round-trips losslessly), and snapshotting mutates nothing.
	 *
	 * @returns The {@link ConversationSnapshot} (`{ id, summary?, sections, messages, judgments? }`), the
	 * judgments present only when the store holds one
	 */
	snapshot(): ConversationSnapshot
}

/**
 * Holds a JSON-serializable snapshot of a conversation's state — its `id`, the rollup `summary`, the
 * compacted `sections`, and the live tail `messages` — the durable payload the
 * {@link ConversationStoreInterface} persists. The exact analogue of
 * {@link import('@orkestrel/workspace').WorkspaceSnapshot}.
 *
 * @remarks
 * Pure JSON data (no class instances, no functions): each {@link Section} and
 * {@link Message} is already a plain record that `structuredClone`s / JSON-round-trips
 * losslessly. The snapshot carries the rollup `summary` (a summary-of-summaries; `undefined` until
 * the first compaction), the compacted `sections` (each retaining its folded originals), and the
 * live uncompacted tail `messages` — but not the `summarize` / `keep`, which are live config
 * re-supplied on hydrate (a summarizer is a function, not serializable data). The snapshot the
 * container produces from itself ({@link ConversationInterface.snapshot}); the durable analogue of
 * the {@link ConversationOptions.snapshot} hydration seam. A {@link ConversationManagerInterface}
 * hydrates a conversation from it through that seam (see {@link ConversationManagerInterface.open}). It is narrowed back from an
 * untrusted storage read by {@link import('./validators.js').isConversationSnapshot} (the total
 * boundary guard).
 */
export interface ConversationSnapshot {
	readonly id: string
	/** Carries recorded judgments; absent in snapshots saved before judgment storage. */
	readonly judgments?: readonly Judgment[]
	/** Holds the rollup (a summary-of-summaries); `undefined` until the first compaction. */
	readonly summary?: string
	/** Lists the compacted history, oldest → newest (each section retains its folded originals). */
	readonly sections: readonly Section[]
	/** Lists the live uncompacted tail, in insertion order. */
	readonly messages: readonly Message[]
}

/**
 * Persists a {@link ConversationSnapshot} durably — the async `get` / `set` / `delete` primitives,
 * keyed by a conversation id and holding no expiry, the exact analogue of {@link
 * import('@orkestrel/workspace').WorkspaceStoreInterface}.
 *
 * @remarks
 * The store persists the {@link ConversationSnapshot} — the self-contained, pure-JSON conversation
 * state — so a JSON / SQLite / IndexedDB backend swaps in without touching the manager or the
 * conversation: the in-memory default
 * {@link import('./stores/MemoryConversationStore.js').MemoryConversationStore} and its
 * driver-pluggable twin
 * {@link import('./stores/DatabaseConversationStore.js').DatabaseConversationStore} (the
 * snapshot as one opaque JSON column) share this one interface. Hydration is not a store concern
 * — a {@link ConversationManagerInterface} reads a snapshot back and rebuilds the live conversation
 * through the {@link ConversationOptions.snapshot} seam (re-supplying the live `summarize` / `keep`; see
 * {@link ConversationManagerInterface.open} / {@link ConversationManagerInterface.save}).
 *
 * Every primitive is async (a `Promise`), so a durable backend (a database round-trip) fits the
 * same shape as the memory one. The snapshot carries its own id, so `set` takes no separate id
 * param (mirroring
 * {@link import('@orkestrel/workspace').WorkspaceStoreInterface}'s `set`). Unlike a session store
 * there is no idle-TTL
 * / eviction — a persisted conversation lives until an explicit `delete`. It is concrete over
 * {@link ConversationSnapshot} — no generic parameter, because the
 * snapshot is the one payload a conversation store persists.
 */
export interface ConversationStoreInterface {
	/**
	 * Resolves the persisted snapshot for `id`, or `undefined` if none is stored.
	 *
	 * @param id - The conversation id to resolve (a {@link ConversationSnapshot.id})
	 * @returns The persisted snapshot, or `undefined` if absent
	 */
	get(id: string): Promise<ConversationSnapshot | undefined>
	/**
	 * Inserts or replaces a snapshot under its own `snapshot.id` (no separate id param —
	 * mirroring {@link import('@orkestrel/workspace').WorkspaceStoreInterface}'s `set`).
	 *
	 * @param snapshot - The snapshot to store (keyed by its `id`)
	 */
	set(snapshot: ConversationSnapshot): Promise<void>
	/**
	 * Drops a snapshot by id; an absent id is a no-op (no throw).
	 *
	 * @param id - The conversation id to drop
	 */
	delete(id: string): Promise<void>
}

/**
 * Represents one row of the table a {@link
 * import('./stores/DatabaseConversationStore.js').DatabaseConversationStore} persists
 * — a conversation `id` plus its {@link ConversationSnapshot} held as one opaque JSON column, read
 * back as `unknown` and narrowed on `get`. The exact analogue of {@link
 * import('@orkestrel/workspace').WorkspaceSnapshotRow}.
 *
 * @remarks
 * The Database twin of {@link ConversationStoreInterface} stores the snapshot whole (the `snapshot`
 * column is a `rawShape`, an opaque JSON blob — exactly as
 * {@link import('@orkestrel/workspace').WorkspaceSnapshotRow} stores a workspace snapshot), so the
 * row type stays flat and the sections/messages snapshot shape never
 * forces the contract to `Infer` it. The column therefore reads back as the broad `unknown`; the
 * store narrows it to a {@link ConversationSnapshot} on `get`
 * ({@link import('./validators.js').isConversationSnapshot}, the total boundary guard). `id`
 * mirrors {@link ConversationSnapshot.id} (the primary key), so a `set` writes
 * `{ id: snapshot.id, snapshot }`.
 */
export interface ConversationSnapshotRow {
	readonly id: string
	/** Holds the whole {@link ConversationSnapshot} as one opaque JSON blob — read back as `unknown`, narrowed on `get`. */
	readonly snapshot: unknown
}

/**
 * Carries the data to author a {@link ConversationInterface} through a {@link
 * ConversationManagerInterface} — the optional `id`, a `summarize` override, a `keep` override, a
 * `sections` cap override, the reserved `on` hooks, and a {@link ConversationSnapshot} to hydrate
 * from.
 *
 * @remarks
 * `id` is the conversation's identity (minted when omitted). `summarize` overrides the
 * manager's default {@link ConversationSummaryHandler} for this conversation (omitted ⇒ the
 * manager's default flows in). `keep` overrides the manager's default retained-tail size.
 * `sections` overrides the manager's default `sections` cap. `on` is the reserved listener key
 * (initial {@link ConversationEventMap} listeners). `snapshot` is
 * the construction-time hydration seam — a {@link ConversationSnapshot} whose `id` / `summary` /
 * `sections` / live tail are restored into the new conversation (the live `summarize` / `keep` /
 * `on` re-supplied alongside it), the conversation analogue of
 * {@link import('@orkestrel/workspace').WorkspaceOptions}'s `seed`, carried onto
 * {@link ConversationOptions.snapshot}, that a
 * {@link ConversationManagerInterface.open} reads a stored snapshot back through; hydration is
 * silent (no events). When both `snapshot.id` and `id` are given, `snapshot.id` wins (the snapshot
 * is the conversation's identity).
 */
export interface ConversationInput {
	readonly id?: string
	/** Overrides the manager's default summarizer for this conversation. */
	readonly summarize?: ConversationSummaryHandler
	/** Overrides the manager's default retained-tail size for this conversation. */
	readonly keep?: number
	/** Overrides the manager's default `sections` cap for this conversation. */
	readonly sections?: number
	readonly on?: EmitterHooks<ConversationEventMap>
	/** Hydrates from a {@link ConversationSnapshot}, passed on as {@link ConversationOptions.snapshot}. */
	readonly snapshot?: ConversationSnapshot
}

/**
 * Configures `createConversationManager` — the default `ConversationSummaryHandler`, retained-tail
 * size, and `sections` cap the conversations it creates inherit, plus the optional durable `store`
 * backing `open` / `save`.
 *
 * @remarks
 * `summarize` is the default summarizer flowed into every conversation the manager creates
 * (a per-`add` {@link ConversationInput.summarize} overrides it); a conversation created
 * with neither cannot `compact` (it throws a `ConversationError`). `keep` is the default
 * retained-tail size (a per-`add` {@link ConversationInput.keep} overrides it), defaulting
 * to {@link import('./constants.js').DEFAULT_CONVERSATION_KEEP}. `sections` is the default cap
 * on a created conversation's compacted `sections` list (a per-`add` {@link ConversationInput.sections}
 * overrides it); omitted ⇒ unlimited.
 */
export interface ConversationManagerOptions {
	/** Supplies the default summarizer for conversations this manager creates (a per-`add` override wins). */
	readonly summarize?: ConversationSummaryHandler
	/** Sets the default retained-tail size (a per-`add` override wins); defaults to `DEFAULT_CONVERSATION_KEEP`. */
	readonly keep?: number
	/** Sets the default `sections` cap for conversations this manager creates (a per-`add` override wins); omitted ⇒ unlimited. */
	readonly sections?: number
	/**
	 * Holds the optional durable {@link ConversationStoreInterface} backing
	 * {@link ConversationManagerInterface.open} / {@link ConversationManagerInterface.save} — a memory
	 * / JSON / SQLite / IndexedDB store a conversation is hydrated from (`open` a registry-miss) and
	 * persisted to (`save`). Omitted ⇒ the manager is registry-only: `open` resolves only what is
	 * already registered, and `save` is a no-op (`false`). The exact analogue of
	 * {@link import('@orkestrel/workspace').WorkspaceManagerOptions}'s `store`.
	 */
	readonly store?: ConversationStoreInterface
}

/**
 * Registers {@link ConversationInterface}s keyed by their `id`, in insertion order, with an active
 * pointer — the id-keyed store over the conversation layer, the `active` / `switch` seam the {@link
 * AgentContextInterface} renders, and the durable `open` / `save` store seam. Event-free (a
 * registry, like {@link import('@orkestrel/workspace').WorkspaceManagerInterface}); the
 * observability lives on each {@link ConversationInterface}.
 *
 * @remarks
 * - **Registry.** `count` is how many are stored. `add(input?)` mints a
 *   {@link ConversationInterface} (its `id` from `input` or a random UUID), flowing the
 *   manager's default `summarize` / `keep` in unless the `input` overrides them; `add` of an
 *   already-present `id` overwrites it (last write wins). `conversation(id)` looks one up
 *   (`undefined` when absent); `conversations()` lists them in insertion order.
 * - **Active pointer.** `active` is the active conversation (the agent's message source the
 *   context renders), `undefined` until the first `add` (which auto-activates it — a registry
 *   with conversations always has one active). A subsequent `add` leaves `active` unchanged.
 *   `switch(id)` re-points `active` to the conversation with `id` and returns it; an unknown
 *   `id` returns `undefined` and leaves `active` unchanged (the lenient lookup style — never
 *   throws, no new error code).
 * - **Removal.** `remove` drops one by id, or a batch (the array overload declared first) — `true`
 *   only when every supplied id was removed; removing the active conversation sets `active` to `undefined`. `clear`
 *   empties the registry and sets `active` to `undefined`.
 * - **Durable open / save (the optional `store` seam).** When a {@link ConversationStoreInterface}
 *   is supplied (the `store` option), `open(id)` hydrates a conversation from the store on a registry
 *   miss (rebuilding it through the `snapshot` option, flowing the manager's
 *   default `summarize` / `keep` in) and `save(id)` persists a registered conversation's
 *   {@link ConversationInterface.snapshot}. Both are lenient without a store — `open` resolves only
 *   registered ids, `save` is a no-op (`false`) — consistent with the lenient `switch`. It mirrors
 *   the workspace package manager's `open` / `save` seam.
 * - **Event-free.** A purely registry store — no Emitter, no events (each conversation owns
 *   its own).
 */
export interface ConversationManagerInterface {
	readonly count: number
	/** Holds the active conversation — the agent's message source the context renders; `undefined` until the first `add`. */
	readonly active: ConversationInterface | undefined
	/** Looks up one conversation by id (`undefined` when absent). */
	conversation(id: string): ConversationInterface | undefined
	/** Lists every conversation, in insertion order. */
	conversations(): readonly ConversationInterface[]
	/**
	 * Mints a conversation, taking its `id` from the input or a fresh UUID and flowing the
	 * manager's default `summarize` / `keep` in unless the input overrides them — auto-activates
	 * the first, and an already-present `id` overwrites, last write wins.
	 */
	add(input?: ConversationInput): ConversationInterface
	/**
	 * Re-points `active` at the conversation with `id` and returns it; an unknown `id` returns
	 * `undefined` and leaves `active` unchanged, never throwing.
	 */
	switch(id: string): ConversationInterface | undefined
	/**
	 * Resolves a conversation by id and activates it — from the registry when present, else
	 * hydrated from the optional {@link ConversationStoreInterface} (`store`); `undefined` when
	 * it is neither registered nor stored.
	 *
	 * @remarks
	 * - If `id` is already registered, it is activated through `switch` and returned — no store hit.
	 * - Else if a `store` is set, `store.get(id)` is awaited; on a hit the snapshot is rehydrated
	 *   into a fresh {@link ConversationInterface} through the `snapshot` option
	 *   (`add({ snapshot, ... })`, flowing the manager's default `summarize` / `keep` in), which
	 *   registers and activates it, and it is returned.
	 * - Else (no store, or a store miss) ⇒ `undefined` (lenient — no throw).
	 *
	 * @param id - The conversation id to open
	 * @returns The activated {@link ConversationInterface}, or `undefined` when neither registered nor stored
	 */
	open(id: string): Promise<ConversationInterface | undefined>
	/**
	 * Persists a registered conversation's {@link ConversationInterface.snapshot} to the optional
	 * {@link ConversationStoreInterface} (`store`) — `true` when persisted, `false` when there is
	 * no store or the id is unknown, and never throwing.
	 *
	 * @remarks
	 * Lenient: when a `store` is set and `id` is registered, `store.set(conversation.snapshot())` is
	 * awaited and `true` is returned; otherwise (no store, or an unknown id) it is a no-op returning
	 * `false` — never a throw, consistent with the lenient `switch`.
	 *
	 * @param id - The id of the registered conversation to persist
	 * @returns True if the snapshot was persisted; false otherwise (no store, or an unknown id)
	 */
	save(id: string): Promise<boolean>
	/**
	 * Removes one conversation by id, or a batch — `true` only when every supplied id was
	 * removed; clears `active` when a removed conversation was the active one.
	 */
	remove(ids: readonly string[]): boolean
	remove(id: string): boolean
	/** Removes every conversation and clears `active`. */
	clear(): void
}
