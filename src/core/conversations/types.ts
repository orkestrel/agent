import type {
	JudgeInterface,
	JudgeRequest,
	Judgment,
	JudgmentInput,
	Message,
	MessageInput,
} from '../types.js'
import type { EmitterErrorHandler, EmitterHooks, EmitterInterface } from '@orkestrel/emitter'

/** Stores judgments by caller key and resolves requests by reusing matching records. */
export interface JudgmentManagerInterface {
	readonly count: number
	/**
	 * Stores inputs with the current epoch milliseconds; an existing key is replaced.
	 *
	 * @param input - One {@link JudgmentInput}, or a batch
	 * @returns The stored {@link Judgment} record or records, each stamped with its storage time
	 */
	add(input: JudgmentInput): Judgment
	add(inputs: readonly JudgmentInput[]): readonly Judgment[]
	/**
	 * Returns the record for a key, or `undefined` when absent.
	 *
	 * @param id - The judgment key to resolve
	 * @returns The {@link Judgment}, or `undefined` when absent
	 */
	judgment(id: string): Judgment | undefined
	/**
	 * Returns stored records in insertion order.
	 *
	 * @returns Every stored {@link Judgment}, in insertion order
	 */
	judgments(): readonly Judgment[]
	/**
	 * Removes every supplied key; returns `true` only when all were present.
	 *
	 * @param id - One judgment key, or a batch
	 * @returns True if every supplied key was present and removed; false otherwise
	 */
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
 * Stores immutable {@link Message} records in insertion order and mints each `id` on `add` — the
 * message-store contract {@link AgentContextInterface.messages} is typed to, which the active
 * {@link ConversationInterface} satisfies structurally.
 *
 * @remarks
 * - **Store.** Messages live in insertion order; `count` is how many are stored.
 *   `add` takes one {@link MessageInput} or a batch and mints the `id` of each message
 *   (a random UUID), returning the created message or messages. A stored message is
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
	 *
	 * @param input - One {@link MessageInput}, or a batch
	 * @returns The created {@link Message} record or records, each with its minted `id` value
	 */
	add(input: MessageInput): Message
	add(inputs: readonly MessageInput[]): readonly Message[]
	/**
	 * Looks up one stored message by id (`undefined` when absent).
	 *
	 * @param id - The message id to resolve
	 * @returns The {@link Message}, or `undefined` when absent
	 */
	message(id: string): Message | undefined
	/**
	 * Lists every stored message, in insertion order.
	 *
	 * @returns Every stored {@link Message}, in insertion order
	 */
	messages(): readonly Message[]
	/**
	 * Removes one message by id, or a batch — `true` only when every supplied id was removed.
	 *
	 * @param id - One message id, or a batch
	 * @returns True if every supplied id was present and removed; false otherwise
	 */
	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	/** Removes every stored message. */
	clear(): void
}

/**
 * Summarizes a conversation, provider-agnostically — the seam the agent runtime supplies so core
 * never imports a provider. Given the folded messages, it resolves their digest, the model-written
 * summary of a compacted {@link Section} or of the oldest sections a `sections` cap merges.
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
 * {@link ConversationInterface} produces when its `compact()` call folds the live tail.
 *
 * @remarks
 * `summary` is the model-written digest of this slice (through the
 * {@link ConversationSummaryHandler}); `messages` are the folded originals, retained in full so
 * `rehydrate` can pull them back and `search` can scan them (compaction shrinks the model
 * input, never discards history).
 */
export interface Section {
	readonly id: string
	/** Holds the model-written digest of this slice (the output of its {@link ConversationSummaryHandler}). */
	readonly summary: string
	/** Retains the folded original messages in full for `rehydrate` / `search`. */
	readonly messages: readonly Message[]
}

/**
 * Maps the push observation surface of a {@link ConversationInterface} — the compaction
 * moments a fire-and-forget observer subscribes to through `conversation.emitter.on`.
 *
 * @remarks
 * `compact` carries the newly folded {@link Section}; `collapse` carries a section
 * created by folding multiple older sections together (a bounded-`sections` cap enforcement,
 * distinct from the fresh live-tail fold that `compact` reports); `rehydrate` carries the `id`
 * of a section whose originals were pulled back. Listener isolation is the emitter's:
 * every event is emitted directly and a listener throw is routed to the `error` handler of the
 * emitter (the `error` option), never onto this map, so a buggy observer can never
 * corrupt a compaction. A `type` alias (not `interface extends EventMap`) so the
 * type-literal satisfies `EventMap` structurally.
 */
export type ConversationEventMap = {
	/** Reports a section folded from the live tail — the created section. */
	readonly compact: readonly [section: Section]
	/** Reports the original messages of a section pulled back — the `id` of the section. */
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
 * `id` is the identity of the conversation. Default: a random UUID. `on` is the reserved
 * listener key (initial {@link ConversationEventMap} listeners). `summarize` is the
 * {@link ConversationSummaryHandler} compaction needs — without it `compact()` throws a
 * {@link import('./errors.js').ConversationError} (a conversation can still store + view a
 * live tail; it cannot fold). `keep` is how many recent live messages a `compact()`
 * retains verbatim (folding only the older ones). Default:
 * {@link import('./constants.js').DEFAULT_CONVERSATION_KEEP} (`0` — a manual `compact()`
 * folds every exchange before the newest user message into one section). `sections` is an
 * optional cap on the compacted `sections` list — when set (`>= 1`), a `compact()` that would
 * leave more than `sections` entries folds the oldest overflow into one merged section,
 * emitting `collapse`. A successful capped merge retains at most `Math.ceil(sections)` entries;
 * fractions and positive infinity are accepted. Default: no cap.
 * `snapshot` is the hydration seam — a {@link ConversationSnapshot} whose `id`, compacted
 * `sections`, and live tail are restored into the conversation, with the live `summarize` /
 * `keep` / `on` supplied alongside it (a summarizer is a function, not serialized data).
 * Restoring is silent (no events — nothing was edited), and a `snapshot.id` wins over `id` (the
 * snapshot is the identity of the conversation). It is what lets `createConversation` hydrate,
 * and what a {@link ConversationManagerInterface.open} reads a stored snapshot back through.
 */
export interface ConversationOptions {
	readonly id?: string
	readonly on?: EmitterHooks<ConversationEventMap>
	/** Holds the listener-error handler of the emitter — a listener throw routes here, not to a domain event. */
	readonly error?: EmitterErrorHandler
	/** Supplies the summarizer compaction needs; without it `compact()` throws a `ConversationError`. */
	readonly summarize?: ConversationSummaryHandler
	/** Keeps this many recent live messages verbatim on `compact`. Default: `DEFAULT_CONVERSATION_KEEP` (`0`). */
	readonly keep?: number
	/** Caps the compacted `sections` list (`>= 1`); overflow folds into one merged section. Default: no cap. */
	readonly sections?: number
	/** Hydrates from a {@link ConversationSnapshot} — its `id` wins over `id`; restoring is silent. */
	readonly snapshot?: ConversationSnapshot
}

/**
 * Configures one {@link ConversationInterface.compact} call — the retained-tail size, the
 * `sections` cap, or both, overridden for one fold.
 *
 * @remarks
 * `keep` overrides the configured retained-tail size of the conversation for this compaction
 * only (at most the older `count - keep` live messages fold, cut back to whole exchanges, never
 * the newest user message or a message after it; when nothing is left to fold, `compact()` is a
 * no-op returning `undefined`). Default: the `keep` of the conversation (its option, or
 * `DEFAULT_CONVERSATION_KEEP`). `sections` overrides the configured `sections` cap of the
 * conversation for this compaction only — after the folded section is appended, an overflow past
 * `sections` folds the oldest sections into one merged section. Default: the cap of the
 * conversation (or no cap).
 */
export interface CompactOptions {
	/** Overrides the retained-tail size for this compaction. Default: the `keep` of the conversation. */
	readonly keep?: number
	/** Overrides the `sections` cap for this compaction. Default: the cap of the conversation (or no cap). */
	readonly sections?: number
}

/**
 * Configures {@link ConversationInterface.reference} — how to render one conversation as a
 * self-labeled, fenced provenance block to pull into another conversation by writing it to the
 * active workspace of the active context: `label` names the source and `messages` lists the
 * cherry-picked excerpts.
 *
 * @remarks
 * The rendered block is a cross-conversation reference a small model must read as foreign
 * material, not as part of the live thread — so every member keeps it concise and unmistakably
 * attributed:
 * - `label` — the human provenance name shown in the leading marker of the block (for example
 *   `'planning'`). It is what the model attributes the content to. Default: the `id` of the
 *   conversation.
 * - `messages` — the cherry-picked excerpts to include (each rendered `role: content`). The
 *   intended source is the `search(query)` / `rehydrate(id)` output of the conversation (select
 *   the few relevant turns), not its whole history — dumping every message defeats the point (it
 *   re-bloats the destination context a small model then has to wade through). Default: none.
 */
export interface ConversationReferenceOptions {
	/** Names the human provenance label in the marker of the block. Default: the `id` of the conversation. */
	readonly label?: string
	/** Lists the cherry-picked excerpts to include (`role: content`). Default: none. */
	readonly messages?: readonly Message[]
}

/**
 * Groups messages above the flat {@link MessageManagerInterface} — a live uncompacted tail plus
 * compacted, summarized {@link Section} records, with on-demand `rehydrate`, substring `search`, a
 * cross-conversation `reference`, and a JSON `snapshot`, driven by a provider-agnostic
 * {@link ConversationSummaryHandler} seam; `summarizable` reports whether that seam was supplied,
 * and the agent loop gates automatic compaction on it.
 *
 * @remarks
 * - **Live tail + sections.** The conversation owns its live uncompacted tail directly — a
 *   caller appends turns through its own message verbs (`add` mints each `id`, `message` /
 *   `messages` look up, `remove` / `clear` drop, `count` tallies), exactly as a `Workspace`
 *   owns its files (no separate per-value manager). `sections` are the compacted history
 *   (oldest → newest), each a summarized slice that retains its originals.
 * - **Message verbs.** `add` takes one {@link MessageInput} or a batch, mints the `id` of each
 *   message (a random UUID), stores it, and returns the created message or messages; a stored
 *   message is immutable. `message(id)` resolves one (`undefined` when absent); `messages()`
 *   lists the live tail in insertion order; `remove` drops one by id or a batch (`true` only when
 *   every supplied id was removed); `clear` empties the tail; `count` is how many live messages
 *   are stored.
 * - **`view()` — the model input.** Each section folds to one synthetic summary message,
 *   followed by the live messages verbatim: `[...sections-as-summary-messages, ...live]`. The
 *   per-section summaries are the compaction benefit.
 * - **`compact()` — fold older live → a section.** Folds the oldest `count - keep` live
 *   messages, cut short at the newest user message and moved back to whole exchanges and
 *   before any call group the cut would split, into a {@link Section} (its `summary` from
 *   `summarize`), removes them from the live tail, and emits `compact` — returning the section
 *   (or `undefined` when nothing folds). A {@link import('./errors.js').ConversationError} is
 *   thrown when no `summarize` was supplied.
 * - **`summarizable` — whether a `compact()` can fold.** `true` when a
 *   {@link ConversationSummaryHandler} was supplied, `false` otherwise. The automatic compaction
 *   of the agent loop (`AgentOptions.window`) gates on it so a conversation that has no
 *   summarizer is never auto-compacted (and the loop never throws the `compact()` `SUMMARIZER`
 *   error from the auto path). A manual `compact()` still throws without a summarizer — only the
 *   auto path is guarded.
 * - **`rehydrate(id)` / `search(query)` — read the retained originals.** `rehydrate` returns
 *   the full original messages of a known section and emits its `id` through `rehydrate`, even
 *   when the list is empty. An unknown id returns `undefined` without an event. The read never
 *   reinserts messages. `search` is a case-insensitive substring scan of `content` across all messages
 *   (the originals of every section + the live tail).
 * - **`reference(options?)` — pull this conversation into another with provenance.** A pure
 *   string render (no model call) of a self-labeled, fenced cross-conversation block of
 *   cherry-picked excerpts, framed so a small model reads it as foreign material. Written into
 *   the context of the active conversation through the active workspace
 *   (`context.workspaces.active?.write(path, block)`); the cherry-pick comes from the `search` /
 *   `rehydrate` of this conversation, never its whole history.
 * - **Observable.** The owned `emitter` ({@link ConversationEventMap}) carries
 *   `compact` / `collapse` / `rehydrate`; the emitter isolates a listener throw and routes it
 *   to its `error` handler (the `error` option).
 */
export interface ConversationInterface {
	readonly id: string
	/** Holds the judgments recorded beside the messages of this conversation. */
	readonly judgments: JudgmentManagerInterface
	readonly emitter: EmitterInterface<ConversationEventMap>
	/** Lists the compacted history, oldest → newest. */
	readonly sections: readonly Section[]
	/**
	 * Reports whether a `compact()` can fold — `true` when a {@link ConversationSummaryHandler} was supplied.
	 * The automatic compaction of the agent loop (`AgentOptions.window`) gates on it (a
	 * non-summarizable conversation is never auto-compacted, so the auto path never throws the
	 * `SUMMARIZER` error); a manual `compact()` still throws without a summarizer.
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
	 * @returns The created {@link Message} record or records, each with its minted `id` value
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
	 * @returns True if every supplied id was present and removed; false otherwise
	 */
	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	/** Empties the live tail, leaving the compacted `sections` untouched. */
	clear(): void
	/**
	 * Builds the model input for the next turn — each section as one synthetic recap message,
	 * its summary prefixed with `CONVERSATION_RECAP_PREFIX` so a small model reads it as a
	 * recap rather than a literal turn, then the live tail verbatim.
	 *
	 * @returns `[...sections-as-summary-messages, ...live messages]`
	 */
	view(): readonly Message[]
	/**
	 * Folds whole exchanges from the oldest `count - keep` live messages, cut short at the newest
	 * user message, into a summarized {@link Section} through the
	 * {@link ConversationSummaryHandler}, removes them from the live tail, and emits `compact` —
	 * resolving `undefined` when nothing folds.
	 *
	 * @remarks
	 * The effective `keep` comes from `options`, else the `keep` of the conversation. The newest
	 * user message is the request a run serves, so it and every message after it stay live. An
	 * exchange is a user message and every message after it up to the next user message. Leading
	 * messages form their own exchange, retained until the first user exchange can also fold. A cut
	 * inside an exchange moves back to its start, so a fold removes whole exchanges. An assistant
	 * message with calls and the tool messages that answer it, grouped as
	 * {@link import('../helpers.js').collectToolGroups} groups them, stay on one side: a cut inside
	 * a group moves before its assistant message, then back to whole exchanges again. Only a group
	 * that spans two exchanges reaches that rule.
	 *
	 * When a `sections` cap is set and the fold pushes the section count over it, an overflow
	 * merge step folds the oldest sections into one. If the `summarize` call of that merge throws,
	 * the merge is skipped (sections transiently sit at `cap + 1`, no loss), no `compact` is
	 * emitted, and the error propagates; the next successful `compact()` merges the section count
	 * back to `cap`.
	 *
	 * @param options - Optional {@link CompactOptions} (`keep` overrides the retained-tail size)
	 * @returns The folded {@link Section}, or `undefined` when nothing folded
	 * @throws ConversationError Thrown when no summarizer was supplied, or when the effective
	 * sections cap does not satisfy `>= 1` (code `'SECTIONS'`, including `NaN`)
	 */
	compact(options?: CompactOptions): Promise<Section | undefined>
	/**
	 * Returns the full original messages of a known section and emits its `id` through `rehydrate`,
	 * including an empty list; returns `undefined` without an event for an unknown `id`.
	 * Never reinserts messages.
	 *
	 * @param id - The {@link Section} `id` to pull back
	 * @returns The retained original messages of the section, or `undefined` when no section has `id`
	 */
	rehydrate(id: string): readonly Message[] | undefined
	/**
	 * Searches `content` for a case-insensitive substring across every message — the retained
	 * originals of each section, then the live tail.
	 *
	 * @param query - The substring to match (case-insensitive)
	 * @returns The matching messages, section originals first then the live tail
	 */
	search(query: string): readonly Message[]
	/**
	 * Renders this conversation as a self-labeled, fenced provenance block to pull into another
	 * conversation — a pure string with no model call: a leading
	 * `[Reference — conversation "<label>" — NOT part of this conversation]` marker, then the
	 * cherry-picked excerpts (`- role: content`) when `messages` is supplied. The `label` option
	 * names the source. Default: the `id`.
	 *
	 * @remarks
	 * The block leads with an unmistakable provenance marker
	 * (`[Reference — conversation "<label>" — NOT part of this conversation]`), then the
	 * cherry-picked `Relevant messages:` (each `- role: content`) when `options.messages` is
	 * supplied. The intended flow is to pull another conversation B into the active workspace of the
	 * active conversation A: select the few right turns with `B.search(query)` / `B.rehydrate(id)`,
	 * frame them here, then
	 * `A.context.workspaces.active?.write(\`conversation:${B.id}.md\`, B.reference({ label, messages }))`.
	 * Keep the excerpts cherry-picked, never the whole history of B — this content enters another
	 * context a small model must read.
	 *
	 * @param options - The {@link ConversationReferenceOptions} (label / cherry-picked messages)
	 * @returns The rendered provenance block (a concise, fenced, self-attributed string)
	 */
	reference(options?: ConversationReferenceOptions): string
	/**
	 * Serializes this conversation to a plain, JSON-serializable {@link ConversationSnapshot} —
	 * its `id`, the compacted `sections`, and the live tail; the live `summarize` / `keep` are
	 * configuration re-supplied on hydrate rather than serialized.
	 *
	 * @remarks
	 * The container serializes itself (`{ id, sections, messages, judgments? }`) — the payload of
	 * the {@link ConversationStoreInterface} persistence seam, the exact analogue of the `snapshot`
	 * method of {@link import('@orkestrel/workspace').WorkspaceInterface}. The summarizer /
	 * `keep` are not serialized — they are live config re-supplied on hydrate (a
	 * `ConversationSummaryHandler` is a function, not data). The snapshot is the durable analogue
	 * of the `snapshot` option: a {@link ConversationManagerInterface} hydrates a conversation from
	 * it through that seam (see {@link ConversationManagerInterface.open}). Pure — the sections +
	 * messages are already plain immutable records (so a `structuredClone` call or a JSON round
	 * trip keeps the snapshot lossless), and snapshotting mutates nothing.
	 *
	 * @returns The {@link ConversationSnapshot} (`{ id, sections, messages, judgments? }`), the
	 * judgments present only when the store holds one
	 */
	snapshot(): ConversationSnapshot
}

/**
 * Holds a JSON-serializable snapshot of the state of a conversation — its `id`, the compacted
 * `sections`, and the live tail `messages` — the durable payload the
 * {@link ConversationStoreInterface} persists. The exact analogue of
 * {@link import('@orkestrel/workspace').WorkspaceSnapshot}.
 *
 * @remarks
 * Pure JSON data (no class instances, no functions): each {@link Section} and
 * {@link Message} is already a plain record that a `structuredClone` call or a JSON round trip
 * keeps lossless. The snapshot carries the compacted `sections` (each retaining its folded
 * originals) and the live uncompacted tail `messages` — but not the `summarize` / `keep`, which
 * are live config re-supplied on hydrate (a summarizer is a function, not serializable data). The
 * container produces the snapshot from itself ({@link ConversationInterface.snapshot}); it is the
 * durable analogue of the {@link ConversationOptions.snapshot} hydration seam. A
 * {@link ConversationManagerInterface} hydrates a conversation from it through that seam (see
 * {@link ConversationManagerInterface.open}). It is narrowed back from an untrusted storage read by
 * {@link import('./validators.js').isConversationSnapshot} (the total boundary guard), which
 * admits unknown members: a 0.0.29 snapshot that carries a conversation `summary` passes and
 * hydrates without it.
 */
export interface ConversationSnapshot {
	readonly id: string
	/** Carries recorded judgments; absent in snapshots saved before judgment storage. */
	readonly judgments?: readonly Judgment[]
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
 * param (mirroring the `set` method of
 * {@link import('@orkestrel/workspace').WorkspaceStoreInterface}). Unlike a session store
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
	 * mirroring the `set` method of {@link import('@orkestrel/workspace').WorkspaceStoreInterface}).
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
 * `id` is the identity of the conversation. Default: a minted id. `summarize` overrides the
 * default {@link ConversationSummaryHandler} of the manager for this conversation. Default: the
 * manager default. `keep` overrides the default retained-tail size of the manager. `sections`
 * overrides the default `sections` cap of the manager. `on` is the reserved listener key
 * (initial {@link ConversationEventMap} listeners). `snapshot` is the construction-time hydration
 * seam — a {@link ConversationSnapshot} whose `id` / `sections` / live tail are restored into the
 * conversation (the live `summarize` / `keep` / `on` re-supplied alongside it), the conversation
 * analogue of the `seed` option of {@link import('@orkestrel/workspace').WorkspaceOptions},
 * carried onto {@link ConversationOptions.snapshot}, that a
 * {@link ConversationManagerInterface.open} reads a stored snapshot back through; hydration is
 * silent (no events). When both `snapshot.id` and `id` are given, `snapshot.id` wins (the snapshot
 * is the identity of the conversation).
 */
export interface ConversationInput {
	readonly id?: string
	/** Overrides the default summarizer of the manager for this conversation. */
	readonly summarize?: ConversationSummaryHandler
	/** Overrides the default retained-tail size of the manager for this conversation. */
	readonly keep?: number
	/** Overrides the default `sections` cap of the manager for this conversation. */
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
 * retained-tail size (a per-`add` {@link ConversationInput.keep} overrides it). Default:
 * {@link import('./constants.js').DEFAULT_CONVERSATION_KEEP}. `sections` is the default cap
 * on the compacted `sections` list of a created conversation (a per-`add`
 * {@link ConversationInput.sections} overrides it). Default: no cap.
 */
export interface ConversationManagerOptions {
	/** Supplies the default summarizer for conversations this manager creates (a per-`add` override wins). */
	readonly summarize?: ConversationSummaryHandler
	/** Sets the default retained-tail size (a per-`add` override wins). Default: `DEFAULT_CONVERSATION_KEEP`. */
	readonly keep?: number
	/** Sets the default `sections` cap for conversations this manager creates (a per-`add` override wins). Default: no cap. */
	readonly sections?: number
	/**
	 * Holds the optional durable {@link ConversationStoreInterface} backing
	 * {@link ConversationManagerInterface.open} / {@link ConversationManagerInterface.save} — a memory
	 * / JSON / SQLite / IndexedDB store a conversation is hydrated from (`open` a registry-miss) and
	 * persisted to (`save`). Default: none, so the manager is registry-only: `open` resolves only
	 * what is already registered, and `save` is a no-op (`false`). The exact analogue of the `store`
	 * option of {@link import('@orkestrel/workspace').WorkspaceManagerOptions}.
	 */
	readonly store?: ConversationStoreInterface
}

/**
 * Registers {@link ConversationInterface} instances keyed by their `id`, in insertion order, with an
 * active pointer — the id-keyed store over the conversation layer, the `active` / `switch` seam the
 * {@link AgentContextInterface} renders, and the durable `open` / `save` store seam. Event-free (a
 * registry, like {@link import('@orkestrel/workspace').WorkspaceManagerInterface}); the
 * observability lives on each {@link ConversationInterface}.
 *
 * @remarks
 * - **Registry.** `count` is how many are stored. `add(input?)` mints a
 *   {@link ConversationInterface} (its `id` from `input` or a random UUID), flowing the
 *   default `summarize` / `keep` of the manager in unless the `input` overrides them; `add` of an
 *   already-present `id` overwrites it (last write wins). `conversation(id)` looks one up
 *   (`undefined` when absent); `conversations()` lists them in insertion order.
 * - **Active pointer.** `active` is the active conversation (the message source of the agent
 *   that the context renders), `undefined` until the first `add` (which auto-activates it — a
 *   registry with conversations always has one active). A subsequent `add` leaves `active`
 *   unchanged. `switch(id)` re-points `active` to the conversation with `id` and returns it; an
 *   unknown `id` returns `undefined` and leaves `active` unchanged (the lenient lookup style —
 *   never throws, no added error code).
 * - **Removal.** `remove` drops one by id, or a batch — `true` only when every supplied id was
 *   removed; removing the active conversation sets `active` to `undefined`. `clear` empties the
 *   registry and sets `active` to `undefined`.
 * - **Durable open / save (the optional `store` seam).** When a {@link ConversationStoreInterface}
 *   is supplied (the `store` option), `open(id)` hydrates a conversation from the store on a registry
 *   miss (rebuilding it through the `snapshot` option, flowing the default `summarize` / `keep`
 *   of the manager in) and `save(id)` persists the {@link ConversationInterface.snapshot} of a
 *   registered conversation. Both are lenient without a store — `open` resolves only registered
 *   ids, `save` is a no-op (`false`) — consistent with the lenient `switch`. It mirrors the
 *   `open` / `save` seam of the workspace package manager.
 * - **Event-free.** A purely registry store — no Emitter, no events (each conversation owns
 *   its own).
 */
export interface ConversationManagerInterface {
	readonly count: number
	/** Holds the active conversation — the message source of the agent that the context renders; `undefined` until the first `add`. */
	readonly active: ConversationInterface | undefined
	/**
	 * Looks up one conversation by id (`undefined` when absent).
	 *
	 * @param id - The conversation id to resolve
	 * @returns The conversation, or `undefined` when absent
	 */
	conversation(id: string): ConversationInterface | undefined
	/**
	 * Lists every conversation, in insertion order.
	 *
	 * @returns Every registered conversation, in insertion order
	 */
	conversations(): readonly ConversationInterface[]
	/**
	 * Mints a conversation, taking its `id` from the input or a fresh UUID and flowing the
	 * default `summarize` / `keep` of the manager in unless the input overrides them —
	 * auto-activates the first, and an already-present `id` overwrites, last write wins.
	 *
	 * @param input - Optional {@link ConversationInput} overrides
	 * @returns The created conversation
	 */
	add(input?: ConversationInput): ConversationInterface
	/**
	 * Re-points `active` at the conversation with `id` and returns it; an unknown `id` returns
	 * `undefined` and leaves `active` unchanged, never throwing.
	 *
	 * @param id - The conversation id to activate
	 * @returns The activated conversation, or `undefined` for an unknown id
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
	 *   (`add({ snapshot, ... })`, flowing the default `summarize` / `keep` of the manager in),
	 *   which registers and activates it, and it is returned.
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
	 *
	 * @param id - One conversation id, or a batch
	 * @returns True if every supplied id was present and removed; false otherwise
	 */
	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	/** Removes every conversation and clears `active`. */
	clear(): void
}
