# Design: the desk serves its agent through the ledger, with per-thread strategy, model, and thinking (planner, subjective lane)

**Lane:** subjective (shape, naming, ergonomics, design fit). Brief: `/home/user/agent-port/tmp/units/desk-design-brief.md`. Desk: `/home/user/desk` on branch `claude/confident-maxwell-6nd0f3`.

## Design

A turn runs Mica and the policy once. It then sends the same brief to every thread in the page's conversation, one thread at a time. Each thread keeps its strategy, model, and thinking setting for its whole life, and each one streams a reply receipt. Because the decision and the brief are shared, two threads differ only in strategy, model, and thinking. That is what puts the measured methods side by side within a single turn.

### Server

**Per-thread state.** `Desk` (`/home/user/desk/app/server/Desk.ts:39`) gains three things:
- `#threads`: a `Map<string, ThreadInterface>` in least-recently-served order. A thread is refreshed on each use and evicted only while idle, once the map reaches its bound.
- `#gauges`: a `Map<string, LedgerGauge>` keyed by model tag. The first records thread of a model calibrates; later records threads of that model receive its gauge. A gauge prices the system message and tool definitions, so thinking does not change it (`/home/user/agent-port/src/core/ledgers/types.ts:321-337`).
- The existing Mica judge (`Desk.ts:55-64`), shared by the decisions and every ledger. It already matches the judge the records series used: same model, same system text, temperature 1.1244734010661372, `num_ctx` 8192 (`/home/user/agent/tmp/bench3/bench.mjs:40-42`, `:539-547`; desk `/home/user/desk/app/core/constants.ts:8`, `:13`, `:19`; `/home/user/desk/app/server/constants.ts:14`).

The page mints each thread id and sends the settings with every turn. The server creates a thread the first time it sees an id. Before any Mica call, `admit(threads)` refuses the turn with `DeskError('THREAD')`, mapped to HTTP 409, in two cases: a known id arrives with different settings, or a named thread is still answering another turn. Each thread counts its own turns. The reply's `turn` member lets the page detect a thread the server evicted or lost on restart.

**One class per family.** The strategy is a discriminant at the boundary. `Desk.#open` switches on it to call one of three factories, and no method branches on it inside the turn.
- `RecordsThread` (`/home/user/desk/app/server/RecordsThread.ts`) owns one ledger from `createLedger(provider, options)`. It translates ledger events and results into receipts.
- `AgentThread` (`/home/user/desk/app/server/AgentThread.ts`) owns one agent and its conversation. It serves both the full view and compaction. The only difference is construction data: compaction adds a `ConversationManager` with `summarize`, `keep`, and `sections`, plus a `window` budget, which is the package's own optional seam (`/home/user/agent-port/guides/agent.md:259`).
- The factories live in `/home/user/desk/app/server/factories.ts`: `createRecordsThread`, `createViewThread`, `createCompactionThread`.

**What each strategy sends, which settles T8's "requests or statements".**
- **Records.** The customer message goes in as a statement (`ledger.conversation.add({ role: 'user', content: message })`). Then `ledger.respond(renderAgent(message, summary, policy), signal)` serves the existing brief text (`/home/user/desk/app/core/helpers.ts:292-298`) as the request.
  - Requests never become records (`/home/user/agent-port/src/core/ledgers/Ledger.ts:493`), `recall` never lists them (`Ledger.ts:1033-1036`), and the tail holds only messages before the first request (`Ledger.ts:846-850`).
  - So a thread made only of requests would never carry an earlier turn. The statement is what the ledger files.
  - The request keeps its `Customer:` line, because a statement added after the first request reaches the model only through the briefing or `recall`.
- **Full view and compaction.** Each turn adds the same brief text as one user message and calls `agent.generate({ think, signal })`.
  - When the caller did not abort and the first pass came back partial or empty, the thread adds `LEDGER_NOTES.cue` as a user message and runs one more pass with `think: false`.
  - This mirrors the ledger (`Ledger.ts:342`, `:401-407`) and the measured harness (`/home/user/agent/tmp/bench/bench.mjs:2465-2485`), whose cue text is identical (`bench.mjs:77`; `/home/user/agent-port/src/core/ledgers/constants.ts:86`).

**Model and thinking map to options as follows.** Every agent call sends `temperature` `DRAFT_SAMPLING` (0) and `keepAlive` `KEEP_ALIVE`, and leaves the sampler to the model blob, as the harness records the daemon does (`bench.mjs:152-154`). The provider's per-call `timeout` is `CALL_TIMEOUT`, and the turn's signal ends the thread.

| Strategy | Thinking | 2B (`qwen3.5:2b-q4_K_M`, cap 2,048) | 4B (`qwen3.5:4b-q4_K_M`, cap 1,024) |
| --- | --- | --- | --- |
| Records | off | `capacity` 3,072, `predict` 0, `think: false`; `num_ctx` 3,072, no `num_predict` | same |
| Records | on | `capacity` 5,120, `predict` 2,048, `think: true`; `num_ctx` 5,120, `num_predict` 2,048 | 4,096, 1,024, 4,096, 1,024 |
| Full view | off | `num_ctx` 6,144, no `num_predict` | same |
| Full view | on | `num_ctx` 8,192, `num_predict` 2,048 | 7,168, 1,024 |
| Compaction | off | `num_ctx` 3,072; window budget 1,600 over `estimateMessages`; `keep` 6; `sections` 3 | same |
| Compaction | on | `num_ctx` 5,120, `num_predict` 2,048; the same window, `keep`, and `sections` | 4,096, 1,024 |

- **Records share.** The share stays at `DEFAULT_LEDGER_SHARE` (0.7), because the ledger takes `predict` out before the share: (5,120 − 2,048) × 0.7 = 2,150.4, which equals the harness's 5,120 × 0.42 (`/home/user/agent-port/src/core/ledgers/types.ts:245-249`; `/home/user/agent-port/guides/agent.md:524`; `/home/user/agent/tmp/bench/results/v10/FINAL-CHECK.md:22-23`).
- **No cap with thinking off.** The harness sent `num_predict` only under thinking (`bench.mjs:544`).
- **Compaction summarizer.** It uses the thread's model with `think: false` and the thread's `num_ctx` (`bench.mjs:603`). It sends a desk summary system text, the conversation, and then the `tuned` instruction verbatim as the last user turn (`bench.mjs:171`, `:3183-3194`).
- **One helper owns the map.** The pure helper `resolveCall(options): ModelCall` in `/home/user/desk/app/server/helpers.ts` covers all twelve combinations. The ledger's `capacity` and `predict` read from its result.

**Where the ledger's inputs come from (rule T8).**
- **Questions.** `LEDGER_QUESTIONS`, passed unchanged.
- **Thresholds.** A desk constant `LEDGER_THRESHOLDS` holding the measured `LEDGER_FIT` (`{ category: 0.7, topic: 0.6, amends: 0.75, supersedes: 0.95, correction: 0.3 }`, `/home/user/agent/tmp/bench3/bench.mjs:831`). These cutoffs were fitted on that wording and that judge, which the desk reuses. They were fitted in-sample on another load (`FINAL-CHECK.md:44`), and its TSDoc must say so.
- **Topics.** `DESK_TOPICS` covers the four subject domains of `ACTION_DOMAINS` (`/home/user/desk/app/core/constants.ts:206-212`): billing, access, technical, and sales. Their criteria are written from the fixtures' team criteria (`/home/user/desk/app/core/templates.ts:31-36`, `:71-72`). `guard` is left out because it names an attack, not a subject.
- **Fixed by the desk.** No lookups, so no owner record ever forms. `system` is `AGENT_SYSTEM` unchanged. `agent: { timeout: CALL_TIMEOUT }`.

**How receipts reach the page.** Each thread collects its receipts during `respond`:
- the first `select` event: `briefing`, the carried message count, judgment keys, and judge usage (`/home/user/agent-port/src/core/contexts/types.ts:239-250`; `/home/user/agent-port/src/core/agents/types.ts:195`);
- each `tool` event named `recall` (`agents/types.ts:152`);
- each conversation `compact` and `collapse` event (`/home/user/agent-port/src/core/conversations/types.ts:163-174`);
- the passes (`LedgerResult.passes`, or the `AgentThread`'s own passes) with their thinking and usage;
- the gauge.

`Desk` writes one `reply` arrival per thread on the existing SSE stream (`/home/user/desk/app/server/handlers.ts:89-92`). A failed thread writes a `fault` whose `slot` is the thread id. Threads run one after another, chained in the same `Promise.all` as the two unchanged contrasts (`Desk.ts:89-120`).

### Page

**Controls.** A `Threads` fieldset opens the Ticket card (`/home/user/desk/app/vue/App.vue:167-168`), ahead of the example buttons, because it sets up the conversation.
- Each row is one thread, with three controls:
  - a strategy radio group built from `btn-check` and `btn-outline-secondary btn-sm`: Records, Full view, Compaction;
  - a model radio group: 2B, 4B;
  - a `form-check form-switch` labeled Thinking.
- Each row also has a `btn-link` remove button whose accessible name carries the row's label. It is disabled while only one thread is left.
- An "Add a thread" `btn-outline-secondary btn-sm` adds the first combination not already used. The page refuses duplicate settings.
- The default conversation is the measured headline pair: Records · 2B · thinking off and Full view · 2B · thinking off.
- After the first turn, each row becomes read-only Badges. A note linked by `aria-describedby` says that settings are fixed for a thread's life. A secondary "Start another conversation" action mints fresh ids and clears the page history.
- At narrow widths each row stacks its control groups (`d-flex flex-wrap gap-2`).

**End-to-end view.** Section 3, Replies (`/home/user/desk/app/vue/Replies.vue:11-25`), replaces the single agent card with one `Lane` card per thread, side by side in `row row-cols-1 row-cols-lg-2 g-3`. Each card is a `Step` (`/home/user/desk/app/vue/Step.vue:8-40`):
- **Heading:** the settings label, with the model tag as detail and the status Badge derived from the board.
- **Takes:** what the strategy sends.
- **Rule:** the system text.
- **Gives:** the reply, a partial Badge, an "Answered on the answer pass" Badge when a second pass ran, and a warning Badge when the server's `turn` differs from the page's count.
- **Footer figures:** wall time, prompt tokens, completion tokens, passes.
- **Footer disclosures,** using the existing `btn-link` collapse pattern (`/home/user/desk/app/vue/Reply.vue:64-102`):
  - Briefing (records): a `pre`, or an empty-state sentence saying the desk has no lookups and that a message carrying no id, number, or name stays out of the briefing (`Ledger.ts:641-642`).
  - Recall: each topic and the result text.
  - Filing (records): judge calls, judge tokens, and the gauge's scale and fixed cost.
  - Folds (compaction): each summary with its message count.
  - Passes: a table of thinking requested, prompt and completion tokens, and partial, with each pass's thinking in a nested `pre`.
  - Request: system, user turn, and the Ollama fields.
  - Earlier turns.
- **Measured line:** one line citing the measured reading for that combination, or "No audited reading".

The Route row lead becomes "each thread answers", and its status names the running thread ("Writing 1 of 2"). The run status line names the thread being written.

**What stays the same.** The header, Judgment, Policy, calibration, fixtures, textarea, the two contrasts under "Without the policy", the Bench reference, and the visual language: `card border-0 shadow-sm`, `Step` with icon, word, and tone Badges, collapse disclosures, `desk-figure`, `desk-pre`.
- The header's Reply model line lists both tags.
- Bench gains a "Measured methods" tab with the readings in § Measurements.

## Alternatives

Each alternative names the constraint that favors it and why the design wins:
- **One active thread per turn,** compared by switching threads. Favored by the brief's "per thread" wording, by a smaller protocol, and by wall times free of other threads. The design wins because one Mica reading and one policy feed every strategy, so the difference between replies is the strategy alone, and one run shows every strategy end to end.
- **Customer turns as requests only** (`/home/user/agent-port/tmp/units/records-port-planner.md:390-392`). Favored by one message per turn and the smallest change. The design wins because requests reach neither the records nor `recall` and the tail holds only the seed (`Ledger.ts:493`, `:1033-1036`, `:846-850`), so a records thread would never carry an earlier turn.
- **Server-minted ids through a `POST /threads` route.** Favored by server-owned identity. The design wins because the page is the only consumer, and the settings check in `admit` covers the mismatch case without another route or round trip.
- **Porting the compaction identifier guard** (`bench.mjs:1097-1151`). Favored by fidelity to the measured arm. The design wins because compaction left the series after copy 1 (`FINAL-CHECK.md:15`), so no audited reading exists for the guard to preserve.
- **Live per-event arrivals** (select, recall, fold, pass). Favored by thinking passes that run for minutes. The design wins on protocol size: the running thread is derived from the board and the status line names it.

## Constraints

- `LedgerOptions` requires `questions` and `thresholds` with no default; `predict` must be less than `capacity`: `/home/user/agent-port/src/core/ledgers/types.ts:241-249`, `:251-273`.
- The answer pass always runs with thinking off: `types.ts:259-266`, `Ledger.ts:365`.
- `respond` rejects a second call in flight with `CONCURRENCY`, and calibrates first while `gauge` is undefined: `types.ts:309-321`, `Ledger.ts:321`, `:329-331`.
- An assistant reply after the first request files as chatter: `Ledger.ts:428-434`.
- The installed agent 0.0.29 has no `createLedger`, no `briefing`, and no replay policy, and the desk pins `^0.0.29`: `/home/user/desk/package.json:47`. `@orkestrel/ollama` 0.0.22 depends on `@orkestrel/agent` `^0.0.29`, which admits 0.0.29 alone: `/home/user/desk/node_modules/@orkestrel/ollama/package.json:75`.
- The desk builds one agent per speech: `Desk.ts:256-306`, `:277`.
- The turn body carries only `fixture` and `message`: `/home/user/desk/app/server/parsers.ts:112-138`, `/home/user/desk/app/vue/helpers.ts:114-130`.
- `DeskErrorCode` and the 400/502 mapping: `/home/user/desk/app/server/types.ts:10`, `handlers.ts:161-168`.
- `ModelCall.predict` is a required number: `/home/user/desk/app/core/types.ts:61-68`, `/home/user/desk/app/core/parsers.ts:405-420`.
- The board and its derived states: `/home/user/desk/app/core/types.ts:300-324`.
- One agent switching conversations must not run threads concurrently: `/home/user/agent-port/guides/agent.md:305`. The design gives each thread its own agent.
- Code laws:
  - `/home/user/scaffold/AGENTS.md:45` (reuse `LEDGER_NOTES.cue`)
  - `/home/user/scaffold/AGENTS.md:58` (derive state)
  - `/home/user/scaffold/AGENTS.md:63-64` (no forwarding wrapper)
  - `/home/user/scaffold/AGENTS.md:66` (no compatibility shims)
  - `/home/user/scaffold/.claude/rules/names.md:75` (magic modes)
  - `/home/user/scaffold/.claude/rules/architecture.md:40`, `:47` (one class per file)

## Refusals

Each refused option is followed by the rule that forecloses it:
- **One `Thread` class whose `respond` branches on a strategy string.** "A literal that selects a different action is a magic mode and requires separate functions/methods." (`/home/user/scaffold/.claude/rules/names.md:75`)
- **A stored `running` flag per thread on the board, or reply `content`, `partial`, or `usage` stored beside its passes.** "Compute facts from existing fields; never store a second flag or label that can drift." (`/home/user/scaffold/AGENTS.md:58`)
- **A desk copy of the answer cue text.** "Reuse a primitive whose semantics match; never wrap one to rename it." (`/home/user/scaffold/AGENTS.md:45`)
- **A UUID package for thread ids.** "NEVER add an npm package unless the user explicitly requests it; prefer native APIs." (`/home/user/scaffold/AGENTS.md:38`)
- **Module mocks of Ollama in the thread tests.** "NEVER use mocks, behavioral fakes, module replacement, framework spies, or fake clocks for project-owned behavior." (`/home/user/scaffold/AGENTS.md:42`). Tests use a recording `fetch` that answers in the Ollama wire format, as `/home/user/desk/tests/app/server/Desk.test.ts:18-52` does.
- **Keeping the agent speech slot beside the threads.** "No compatibility shims. Update every consumer in the same change." (`/home/user/scaffold/AGENTS.md:66`)

## Measurements

Readings supplied, which the page cites and which are passes per 10 requests over the reworded Larkspur shift, audited 2026-10-09:
- **2B, thinking off.** Records 6.50–6.75 against full view 4.38–5.13, over 8 copies (`/home/user/agent-port/guides/agent.md:544`).
- **2B, thinking on, answer pass with thinking off (`t2a`).** Records 6.75–7.00 against full view 4.50–5.25, over 4 copies. The pair clears at every end (`FINAL-CHECK.md:52-72`).
- **4B, thinking off (`f4`).** Records 7.63–8.00 against full view 6.13–7.63, over 8 copies. The strict end clears at 0.19; the lenient end does not, at −0.37 (`FINAL-CHECK.md:76-94`).
- **Caps.** 2B 2,048 (`FINAL-CHECK.md:23-24`); 4B 1,024 from a 32-call probe (`/home/user/agent/tmp/bench/results/v10/cap.md:3-9`).
- **Compaction.** Pilots only: `t2-compaction-v1`, `t2w-compaction-v1`, `f4-compaction-v1` (`FINAL-CHECK.md:15`).

Readings missing:
- 4B with thinking on, for every strategy (`t4` has a cap but no series);
- an audited compaction reading;
- a desk-shaped series;
- the topic cutoff on the desk topics;
- the desk thread's briefing yield;
- live wall times for thinking threads against `CALL_TIMEOUT` and `TURN_LIMIT`.

## Units

Every unit runs serially in `/home/user/desk`, one writer at a time. Each writing unit stops at its project gates and reports the commands it ran. Every unit after R2 waits on the release; U1 included, because the core contract imports the ledger types.

| Unit | Engine | Owns | Depends on |
| --- | --- | --- | --- |
| R1 | the `orkestrel-publish` skill in `/home/user/agent-port`, the user's decision | the `@orkestrel/agent` release carrying `createLedger`, `LEDGER_QUESTIONS`, `LEDGER_NOTES`, `Selection.briefing`, and the replay policy | the port's U9 and Sweep |
| R2 | the `orkestrel-publish` skill in the ollama checkout | an `@orkestrel/ollama` release whose `@orkestrel/agent` range admits R1 | R1 |
| U0 `desk-deps` | `builder` on Sonnet 5.5 | `/home/user/desk/package.json`, `/home/user/desk/package-lock.json` | R2 |
| U1 `desk-contract` | `builder` on Sonnet 5.5 | `/home/user/desk/app/core/types.ts`, `constants.ts`, `parsers.ts`, `helpers.ts`, `/home/user/desk/tests/app/core/*` | U0 |
| U2 `desk-threads` | `astra` on GPT-6 Astra | `/home/user/desk/app/server/AgentThread.ts`, `RecordsThread.ts`, `factories.ts`, `helpers.ts`, `constants.ts`, `types.ts`, and their tests | U1 |
| U3 `desk-turn` | `builder` on Sonnet 5.5 | `/home/user/desk/app/server/Desk.ts`, `handlers.ts`, `parsers.ts`, `errors.ts`, `/home/user/desk/tests/app/server/Desk.test.ts`, `parsers.test.ts`, `index.test.ts` | U2 |
| U4 `desk-page` | `builder` on Sonnet 5.5 under the `enterprise-bootstrap` skill | `/home/user/desk/app/vue/*`, `/home/user/desk/tests/app/vue/*`, `/home/user/desk/tests/app/fixtures.ts` | U3 |
| U5 `desk-verify` | `verifier` on Haiku 5.5 | none | U4 |

**U0 `desk-deps`.**
- Install the R1 and R2 versions.
- Acceptance: `npm ls @orkestrel/agent` lists one version; `npm run check` and `npm run test:app` pass unchanged.

**U1 `desk-contract`.**
- **Types** in `/home/user/desk/app/core/types.ts`, each with TSDoc:
  - `ContextStrategy = 'records' | 'view' | 'compaction'`;
  - `ThreadOptions { strategy, model, think }`;
  - `DeskThread extends ThreadOptions { id }`;
  - `AgentModel { tag, name, cap }`;
  - `ThreadRecall { topic, text, failed }`;
  - `ThreadFold { summary, messages, merged }`;
  - `ThreadFiling { judgments, usage, gauge: LedgerGauge | undefined }`;
  - `ThreadPass { content, thinking, usage, partial }`;
  - `ThreadReply { thread, turn, system, prompt, call, briefing, carried, recalls, folds, filing, passes, elapsed }`;
  - `ReplyArrival { channel: 'reply', reply }`, added to `Arrival`;
  - `TurnRequest { fixture, message, threads }`.
- **Type changes:** widen `ModelCall.predict` to `number | undefined`; add `threads` and `replies` to `TurnBoard`.
- **Constants:**
  - `CONTEXT_STRATEGIES`;
  - `AGENT_MODELS`, the two tags with caps 2,048 and 1,024;
  - `SUMMARY_SYSTEM`, a desk sentence with no scenario date;
  - `SUMMARY_INSTRUCTION`, the `tuned` text verbatim.
- **Parsers:** `parseReply`, `parseThread`, the `reply` branch of `parseArrival`, and `parseCall` with an absent `predict`.
- **Helpers:**
  - `openBoard(questions, threads)`;
  - `foldArrival`, which accepts one reply per board thread and ignores the rest;
  - `readLane(board, id)`, derived. It reads `running` for the first unsettled thread only after the policy reported and before the board ends, and `stopped` after an end.
  - `readOutcome`, which counts threads;
  - `findModel(tag)`.
- **Acceptance:** a `ThreadReply` survives a JSON round trip through `parseArrival`; a duplicate reply and a reply for an unknown thread leave the board unchanged; `readLane` derives each state.
- **Gates:** `npm run test:app:core` and `npm run check`.

**U2 `desk-threads`.**
- **Server types:**
  - `ThreadInterface { id, options, active, respond(turn, signal): Promise<ThreadReply> }`;
  - `ThreadTurn { message, prompt }`;
  - `ThreadContext { daemon, fetch, timeout, judge, gauge }`.
- **Server constants:** the measured windows from the design table, each citing `FINAL-CHECK.md:9-13` or `:19-25`; `COMPACTION_SETTINGS` (`window`, `keep`, `sections`); `DESK_TOPICS`; `LEDGER_THRESHOLDS`, citing `bench.mjs:831` and the in-sample fit; and a resident-thread bound. The bound's TSDoc states the property it serves: idle threads cannot grow the process without limit. Leave the figure to the case.
- **`resolveCall`** reproduces every row of the design table.
- **`RecordsThread`** adds the statement before `respond`, collects receipts through `agent: { on }`, and exposes `gauge`.
- **`AgentThread`** runs the answer pass on the condition stated in the design.
- **Acceptance**, using a recording `fetch` fixture in the Ollama wire format:
  - the first records request carries `options.num_ctx` from `resolveCall`;
  - a thinking thread's first pass sends `think: true` and its answer pass `think: false`;
  - a second full-view turn's request carries no `thinking` member;
  - an empty first pass yields two passes and the cue message;
  - a compaction thread past its window reports a fold with its summary;
  - a records reply reports the briefing from its `select` event and each `recall` result.
- **Gates:** `npm run test:app:server` and `npm run check`.

**U3 `desk-turn`.**
- **`Desk`:** `publish(message, questions, threads, signal, write)`, `admit(threads)`, `#open` with least-recently-served eviction of idle threads, and the gauge map.
- **Remove** the agent speech and the `'agent'` speech slot from the server path.
- **`parseTurnRequest`** returns a `TurnRequest`. It reads one or more threads, each:
  - an id of 32 lowercase hex characters, the form the page builds from `crypto.getRandomValues`;
  - a `strategy` from `CONTEXT_STRATEGIES`;
  - a `model` from `AGENT_MODELS`;
  - a boolean `think`.
- **Refusals in `parseTurnRequest`:** duplicate ids, duplicate settings, and more threads than there are distinct settings.
- **Errors:** add `'THREAD'` to `DeskErrorCode`; `renderFailure` maps it to 409.
- **Acceptance:**
  - a turn writes one `reply` per thread in request order, after the policy;
  - a reused id with other settings receives 409 before any `/api/generate` call;
  - an abort during a thread writes no fault;
  - a failed thread writes a fault whose slot is its id, and the next thread still runs;
  - the second records thread of one model makes no calibration calls.
- **Gates:** `npm run test:app:server`, `npm run test:app:core`, and `npm run check`.

**U4 `desk-page`.**
- **Files:**
  - `Threads.vue` (the controls) and `Lane.vue` (the thread card), per § Page;
  - `Replies.vue`, `Reply.vue` (contrasts only), `Route.vue`, `Bench.vue` (the "Measured methods" tab);
  - `App.vue`, whose state holds the conversation's threads and the finished boards; each thread's history derives from those boards;
  - `helpers.ts` (`readTurn` sends `threads`), `constants.ts` (`MEASURED_READINGS` with each run's source and date), `types.ts`.
- **Remove** `AGENT_TITLE` from `/home/user/desk/app/core/constants.ts:45` and `findSlot` handling with its last consumer.
- **Acceptance:**
  - the controls refuse duplicate settings and lock after the first turn;
  - a two-thread fixture turn renders two cards with their briefing, recall, passes, and thinking disclosures;
  - a turn mismatch shows its warning;
  - the status line names the running thread;
  - the layout holds at 320 and 390 CSS px and wide, in both themes.
- **Gates:** `npm run test:app:vue`, `npm run test:journey:vue`, and `npm run check`.

**U5 `desk-verify`.**
- Run `npm run format:check`, `npm run lint:check`, `npm run check`, `npm run build`, and `npm test`, each read bare.
- Report rendered proof at the declared widths and themes as open where no browser runs.

## Tensions

The following judgment calls are open for the objective lane or the Orchestrator:
- **Fan-out against one active thread.** One run sends the brief to every thread (this design), or each turn targets one thread.
- **Statement plus request for records.** The first turn's statement precedes the first request, so it is seed and stays in every tail; later statements reach the model only through the briefing or `recall` (`Ledger.ts:846-850`). This is the open T10 boundary on an interleaved thread.
- **No reply cap with thinking off** (fidelity, `bench.mjs:544`), or `PREDICT_AGENT` 128 to hold the desk's one-or-two-sentence brief (`/home/user/desk/app/server/constants.ts:24`).
- **No date sentence in `AGENT_SYSTEM`,** although `LedgerOptions.system` expects one (`/home/user/agent-port/src/core/ledgers/types.ts:239-240`).
- **Unguarded compaction,** or the harness guard ported into the desk.
- **Threads chained beside the contrasts** in one `Promise.all` (`Desk.ts:89`), so the first thread can queue behind a contrast, or the contrasts held until the threads finish.
- **Thresholds.** The measured cutoffs from another load, or a desk fit before the records thread ships.
- **The literal `'view'`** for the full view, against `'full'`.
- **The default conversation** of two threads, which doubles a turn's agent time.
- **One `TURN_LIMIT`** (`/home/user/desk/app/vue/constants.ts:15`) for every thread of a turn.

## Risks

Each risk names the reading that settles it:
- **The desk's load is outside the measured load, so the measured gains might not transfer.** A desk-shaped series of multi-turn threads, audited blind; missing.
- **A topic cutoff of 0.6 misfiles the desk topics.** A probe that files the fixture texts against `DESK_TOPICS` through Mica and compares each topic answer with hand labels; missing.
- **The records briefing stays empty for desk messages with no id, number, or name** (`Ledger.ts:641-642`). A count of non-empty briefings over a scripted multi-turn desk thread in the U2 fixture.
- **A second agent copy through ollama defeats `isJudgeAbortError`.** `npm ls @orkestrel/agent` in U0, and the U3 abort test.
- **Calibration on a conversation that holds only the system message misprices the first request.** The gauge after `calibrate` against the gauge after the first `observe` on a live 2B thread; missing.
- **A thinking pass meets `CALL_TIMEOUT` (`/home/user/desk/app/server/constants.ts:4`).** At the measured rates, the 4B spends about 151 s and the 2B about 159 s generating to the cap (`cap.md:7`, `FINAL-CHECK.md:29`). Live wall times of a 4B and a 2B thinking pass; missing.
- **Several thinking threads pass the 20-minute turn limit.** The wall time of a live three-thread 4B thinking turn; missing.
- **Switching models between threads reloads them in the daemon.** The first-call elapsed time of each thread in a mixed 2B and 4B turn; missing.
- **An evicted or restarted thread answers without its history.** The U4 test of the `turn` mismatch warning.
- **Recorded thinking reaches a later request.** The U2 assertion on the second turn's body.

The design rests on these source files:
- `/home/user/desk/app/server/Desk.ts`
- `/home/user/desk/app/core/types.ts`
- `/home/user/agent-port/src/core/ledgers/types.ts`
- `/home/user/agent-port/src/core/ledgers/Ledger.ts`
- `/home/user/agent/tmp/bench/results/v10/FINAL-CHECK.md`
- `/home/user/agent/tmp/bench/bench.mjs`
- `/home/user/agent/tmp/bench3/bench.mjs`
