# Records design

The ledger is the records strategy. This design covers its source of truth, its durability, its write cost, its render path, and its two fixes. Source locations name a symbol and its file as of `1e82d145`. Measurements point at `research/evidence.md`; gates point at `designs/measurement.md` § Gates; deferrals point at `plan.md` § Deferred.

## Source of truth

Store nothing that can be derived. The source of truth is three logs:

| Log | Holds | Home |
| --- | --- | --- |
| messages | the conversation's identified, append-only messages | `Conversation` in `src/core/conversations/Conversation.ts` |
| judgments | keyed answers, reused only for the same model, state, ordered sources, and question | `JudgmentManager` in `src/core/conversations/JudgmentManager.ts`; keys in `Classifier` in `src/core/ledgers/Classifier.ts` |
| marks | which user messages are requests, which carry ledger-note text, which tool messages failed | private fields of `Ledger` in `src/core/ledgers/Ledger.ts` |

- Records, lines, amendments, supersessions, and validity are projections of those logs (`buildRecords` in `src/core/ledgers/helpers.ts`).
- Build no second event log and no delta graph; a snapshot is a cache of the logs, never their replacement (C19).
- The marks live only in private fields, so a conversation snapshot alone mis-files on restore: a failed lookup with no recorded result files as `fact` (`Ledger#assign`), later assistant replies stop filing as `chatter` and reach the judge, and requests receive a category question they never get as of `1e82d145` (`Classifier` category pass).

## Ledger snapshot

`rc-u4` adds a snapshot and a hydrate path. The first consumer is the Study's checkpoint seeding (rc-s1, rc-a9).

```ts
/** Holds the JSON-serializable state a ledger resumes from: its conversation and the message ids it marked. */
export interface LedgerSnapshot {
	readonly conversation: ConversationSnapshot // messages, sections, judgments
	readonly requests: readonly string[] // user messages `respond` appended, conversation order
	readonly notes: readonly string[] // user messages carrying `LEDGER_NOTES` text
	readonly failures: readonly string[] // tool messages whose call or reading failed
	readonly gauge?: LedgerGauge
}

export interface LedgerOptions {
	// existing members unchanged
	/** Hydrates from a snapshot: its conversation, its marked ids, and its gauge when these options supply none. */
	readonly snapshot?: LedgerSnapshot
}

export interface LedgerInterface {
	// agent, conversation, gauge, respond, calibrate unchanged
	/** Serializes the ledger's state; refuses with `AgentError` code `'CONCURRENCY'` while a request or calibration runs. */
	snapshot(): LedgerSnapshot
}
```

### Hydrate semantics

- Hydrate the conversation through the conversation manager's `add({ snapshot })`, then seat `requests`, `notes`, and `failures`.
- A `gauge` option wins over `snapshot.gauge`; one TSDoc line states the precedence. With a gauge present from either source, hydration makes no calibration call.
- Hydration is silent, as conversation hydration is.
- `isLedgerSnapshot` in `src/core/ledgers/validators.ts` refuses each malformed member.
- The snapshot carries no version field until a second schema exists.
- A deterministic judge failure the classifier memoized is not persisted, so a hydrated ledger asks that question again; the guide states this limit.
- Hydrating a second ledger from `snapshot()` forks it at the parent's frontier. A subagent or a what-if branch needs no graph; merging back is the child's bounded answer arriving as one message in the parent (D16).

### Adverse orderings

| Ordering | Required behavior |
| --- | --- |
| `snapshot()` during `respond` or `calibrate` | refuse with `AgentError` code `'CONCURRENCY'`, as `respond` refuses overlap; an entered, unanswered request would restore as a dangling request |
| tool results pending a flush | flush them before capture |
| an abort during a judge call | the partial answers are ordinary judgments and round-trip |
| an id in `requests`, `notes`, or `failures` absent from the conversation | refuse on hydrate with a coded `LedgerError`; rc-u4's brief names the code |
| `options.gauge` and `snapshot.gauge` both present | the option wins |

### Replay keys

Judgment keys hold message ids (`JSON.stringify(['category', id])` and its siblings in `Classifier`), and message verbs mint a UUID per append. A replay seeded from a snapshot keeps the ids, so its judgments match. A fresh replay mints different ids, so it needs request-body recording, where the state text is the key.

## Validity and provenance

- Keep the 0.0.32 preservation semantics: nothing is withdrawn, and an accepted edge renders as a numbered amendment.
- Derive validity in time: a line is live from its source position until the first later message holding an accepted `supersedes` edge on it. Transaction time is message order. Store no validity flag and add no `Message` time field (C17).
- Provenance already exists: `LedgerLine.source` and `sentence`, and each edge's judgment key naming both message ids. An instrument walks exported helpers; a public `trace` or `why` waits for its consumer (D11).

## Write path

### Cost model

- Each message `Ledger#assign` leaves undecided costs one category call, plus one topic call per desk topic when the message is not quiet (`Classifier` in `src/core/ledgers/Classifier.ts`).
- Each correction-weighted user message then costs one `amends` call per earlier non-quiet message that shares an entity or a topic, plus a `supersedes` call when `amends` passes.
- Over a conversation of n messages, T topics, and c corrections, judge calls are O(n·T + c·E). E, the eligible earlier messages per correction, grows with n because a shared topic alone admits a pair. The Study declares one desk topic, so nearly every message qualifies, and the worst case is O(n²). The judge-bursts reading fits that shape (`research/evidence.md` § Prior-campaign readings).

### Correction cap

`rc-u6` bounds E with a resource boundary that mirrors `recall: { limit }`.

```ts
export interface LedgerCorrectionOptions {
	/** Caps the earlier messages one correction is compared against, most recent first; a nonnegative safe integer. Default: no cap. */
	readonly limit?: number
}

export interface LedgerOptions {
	// existing members unchanged
	readonly correction?: LedgerCorrectionOptions
}
```

- Order the candidates most recent first and truncate them before the `amends` asks.
- With no cap, behavior is unchanged; with `limit` at or over the eligible count, classification is identical to the unset case.
- A `limit` that is not a nonnegative safe integer throws `LedgerError('LIMIT')`.
- The cap is a resource boundary, never a quality verdict. A cap can hide a true supersession older than the cap; the guide states that limit.
- When rc-p1 (b) shows the pair count at its longest length far beyond its shortest, rc-u6's review proposes a default.

### Pair narrowing

`rc-a11` narrows eligibility on top of the cap: an earlier message is eligible only when it shares a registry id with the correction (a topic alone no longer admits it), and only the most recent K live members of that id's frontier are asked. Per-correction cost becomes O(K). It is an experiment because it changes classification; its gate is the prior campaign's R5b reopen condition (`designs/measurement.md` § Gates, row rc-a11). A default-off switch on `LedgerCorrectionOptions` gates the narrowing while the experiment runs, so an off arm runs on the same build; rc-a11's brief names it, and either verdict deletes it.

### Grouped asks

Refused (F1): the Ollama judge sends one request per question, so grouping a message's asks saves zero wire calls, and a grouped answer would be reused under the same key as an ungrouped one.

## CPU cost and memoization

- `Classifier` calls `assign` for every message. For each tool message, `Ledger#assign` calls `Ledger#readLookups`, which walks every tool group and runs the application's `read` handler on each lookup result again.
- The `entities` callback rebuilds the registry from `Ledger#readLookups` on every call, and the pair loop calls it per earlier non-quiet message per correction. The loop walks every correction on every `respond`, even when every answer is cached.
- Per request that is O(c·n·(n + t)) for t tool messages. `Ledger#plan` then renders the briefing again per trim step, O(L·B) for L lines and briefing size B.
- `rc-a3` benches `select` CPU against conversation length before anything changes. `rc-a3b` memoizes `Ledger#readLookups`, the registry, and the projection, keyed by message count plus failure count, only when the rc-a3 gate passes (D12).
- Refused: memoizing the instruction sort, a micro-optimization with no measurement.

## Render path

### Layout

The built system message holds, in order, the system text, the instructions, the workspace text, and the briefing as its last part (`AgentContext#build` in `src/core/contexts/AgentContext.ts`). The tail follows: the seed exchanges before the first request, then the current request (`Ledger#selectTail` in `src/core/ledgers/Ledger.ts`). The briefing changes on every request, so the reusable prefix across requests ends at the system text.

The target layout, ordered from stable to volatile:

```text
tools | system text, instructions, skills index, memos index, workspace text   (changes only on edit)
      | recent exchanges: requests, final replies, stubbed tool turns          (append-only; drained in batches)
      | briefing                                                               (per request)
      | request
      | this run's turns                                                       (append-only within a run)
```

### Briefing placement

`rc-a6` moves the briefing out of the head into `Selection.messages` as a trailing `system` message. `Selection` is free-form and the roles include `system`, so the ledger can do this without a context change.

- Arithmetic on the Study profile (`research/evidence.md` § Prior-campaign readings, Study pair): the plan budget is ((20480 − 512) − 8192) × 1 − 926 ≈ 10850, divided by 1.06 ≈ 10236 tokens, and the tail cap is 0.35 × 10236 ≈ 3583 tokens. Moving the briefing saves at most the seed tail per request, up to about 35% of first-turn prefill.
- At an unmeasured local prefill rate of 2000 tokens per second, that is about 3% of the Study pair's records wall. On a hosted API with a tenfold cached-read discount it is material (C28; Q5).
- Every local saving assumes the agent model's cache slot survives the judge calls between requests. rc-a9 opens with a co-residency probe and a late-`system` template probe before rc-a6 builds.
- Template fallback: when the chat template refuses a late `system` message, prefix the briefing to the final user turn as built, leaving the stored request unchanged and accepting user-level authority for the briefing text (C25).
- On promotion, delete `Selection.briefing` and its consumers in the same change, with no shim. On failure, delete the switch and its tests.
- The briefing heading rename waits for this experiment (D18).

### Moving tail

`rc-a7` replaces the frozen seed tail with the most recent completed request exchanges, after rc-a6.

- An exchange is a request and its final reply, never notes, calls, or tool messages. Before the first request completes, the seed serves.
- The tail fills to the tail share; when the next exchange would pass that share, the tail drains to half. Draining in batches keeps the tail's leading bytes identical between drains, so a prefix cache survives between drains. A tail that slides by one exchange would invalidate the prefix on every request.
- The cache claim depends on rc-a6: while the briefing precedes the tail, draining buys no prefix reuse.
- A default-off switch on `LedgerOptions` gates the tail while the experiment runs; rc-a7's brief names it, and either verdict deletes it.
- The frozen-tail census motivates the change (`research/evidence.md` § Prior-campaign readings). The prior campaign's R1 moving tail could act but was stripped with no quality grade (`7ada8b77:.orkestrel/agent/plan.md` § Removed experiments).
- Recall listing assistant replies is the fallback (D15).

## Fixes

### Trim order

`rc-u5` fixes F2. Owner-record trim steps drop the oldest lines whose source is not decisive first, then the decisive lines (rule or correction) oldest first. The test comes first and fails on 0.0.34: an owner record over its line cap keeps its most recent lines, and a correction line outlives an older fact.

### Head pricing

`Ledger#trim` prices `[options.system, briefing]` alone. After `LedgerAgentOptions` forwards instructions, skills, memos, and workspaces, the head grows by text the plan does not count. `rc-u9` prices the system message that `this.#agent.context.build({ messages: [], judgments: [], briefing })` returns, in the same unit as the widening, so no release misprices (`designs/context.md` § Ledger wiring). Until rc-u9 is accepted, nothing outside tests wires libraries into a ledger.

## Persistence

- `snapshot()` and hydrate are the persistence path.
- A snapshot per request costs O(n²) bytes over a run; incremental persistence waits for its trigger (D13).
- `AgentContext#build` mints a system-message id per call; the id never reaches the Ollama wire, so it leaves prefix reuse intact (F3, D17).

## DeltaDB transfer

The DeltaDB article (see [fine-grained version control for agents](https://delta.dev/blog/fine-grained-version-control-for-agents)) describes a graph of deltas, frontiers, subagent timelines, and reify-at-version (C18; `research/evidence.md` § DeltaDB).

| Idea | Holds or ships in this campaign | Later, with its trigger | Never |
| --- | --- | --- | --- |
| delta log as truth, state as projection | holds: messages, judgments, and marks are the log; records are a projection | | |
| compensating correction; invalidate, never delete | holds: the 0.0.32 preservation semantics | | |
| timeline for a subagent at the parent's frontier | ships with rc-u4: hydrate a second ledger | a public fork helper (D16) | graph merge |
| reify at a version | holds: a pure projection over a message prefix | a memoized projection keyed by messages and judgments (D12) | |
| frontier | vocabulary only: one writer, one tip | a per-entity frontier, rc-a11 | version vectors |
| blame and why | exported helpers walk line, source, and edge | a public `trace` for an instrument that needs omission attribution (D11) | per-character blame |
| CRDT buffers, last-writer-wins and add-wins registers, sync, writer threads | | | refused: one writer per conversation |

## Refused

- A second event log or a delta graph store.
- CRDTs, version vectors, and sync.
- A living aggregate as a records variant; the user dropped it on 2026-10-12 (`152ac3c3:.orkestrel/agent/evidence.md`).
- Embeddings, vector recall, and rerankers (`152ac3c3:.orkestrel/agent/boosts.md`).
- A stored validity, stale, or anchors field.
- A `Strategy` interface wrapping the ledger and compaction; both plug in through `Selection` and `window`.
