# Briefing architecture: the design record of 2026-10-08

This record rules on the briefing architecture for the 2B Qwen support-desk agent, on every alternative the stores, loop, and judge planners raised, and on every defect the objective and design reviews named. It reconciles their vocabulary to one word per concept. Measurements cite their run; every other figure is a contract, a count taken from `scenario.json`, or a setting the case fixes.

## 1. Ruling

1. In the package design, the conversation keeps every message verbatim as the record, and three sibling stores sit beside it, one kind of thing each: a results store of tool results keyed by call id, the judgment store of judge records, and a ledger of pins. In the harness arm, `Agent.ts:546-553` still stores each result as tool-message content behind the harness's `[rN] ` prefix, so the arm separates results at the prompt only.
2. A tool message reaches a prompt only as a stub that names its call, and a result reaches a later prompt only through a pin that sources it or through the `recall` and `read` tools; a result is never a message body in a later prompt and never a workspace file. The select handler never throws and never returns a fault, so no fallback build puts results back, and the harness counts a fallback build as a separation failure.
3. The agent writes the briefing for its next run by calling the `pin` tool with a source handle and, for a distilled form, the exact value; the model's pin is advisory and adds a value line, and the loop renders every live pin into the system message at run entry, so the next run needs no tool call to recover it.
4. The loop pins every lookup result after asking the model one time: an authority denies the first `send_reply` while a lookup result of the run is unpinned, the deny listener pins that result whole, and a settle step after the run pins whatever is still owed.
5. Code refuses a pin whose source does not resolve, whose value carries an id or a number its source lacks, or whose value a decided correction replaced; a reference pin never collapses on a model-origin value, so a value line always renders beside its source.
6. The judge categorizes and never gatekeeps: it answers request-independent questions about each message one time (its category and its desk topics) and about each screened pair of an earlier message and a later correction (`amends`, `supersedes`), under keys that carry no request id and no model-written value, so each record is reused for the life of the conversation; code derives entity topics from the ids in call arguments and results.
7. Every pin has a lifetime whose end is derived and never stored: superseded when a judge record or a repeated lookup replaces its source, expired when an expiry that code or the application set passes the conversation clock, or retired when its thread closes or a gap of `HORIZON` runs without a touch occurs after its write; the model never sets a lifetime, and an ended pin leaves the prompt and stays reachable through `recall`.
8. The loop also pins, with origin `loop`, every user message the judge decides is a fact, a rule, or a correction and every lookup result, so inclusion never depends on the model, and it orders the rendered pins by the request's topics, then desk rules, then other topics, omitting from the end into the tally when the block passes its share of the budget and omitting request-topic pins last, oldest first, with `briefing.over` recorded.
9. The prompt is the system message (scenario system and duties, then the briefing: value lines, pinned items, and the tally), then the recent tail, each bounded by its share of the context; the tally holds one row per topic with a count, so the prompt stays within its shares as the conversation grows and the loop runs without compaction; compaction, where an application keeps it, folds only the unpinned, unsourced, non-tool remainder and never splits a call from its result.
10. The harness arm builds all of this in `bench.mjs` with the public API and changes nothing in the package; the package changes in section 6 wait for the `ledger-deny` run's reading on pass rate, graded fabrication, prompt tokens per goal, judge questions per goal, and briefing precision and recall.

## 2. The stores

### Words

The planners used several words for some concepts. This record uses the following word for each concept and nothing else:

| Word | Meaning | Replaces |
| --- | --- | --- |
| message | One conversation record, verbatim and immutable. | - |
| result | One dispatched `ToolResult`, stored in the results store. | "tool result content" in a message |
| stub | The frame a tool message shows in a prompt: its handle, call, and pin state. | "result frame" |
| pin | One ledger record. A value pin carries a distilled value; a reference pin carries its source whole. | "entry", "claim", "pinned reference" |
| ledger | The store of pins. Its code name is `pins`, beside `judgments`. | "pin store" |
| briefing | The code-rendered instruction named `briefing`: value lines, pinned items, and the tally. | "digest", "distillate", "rendered block" |
| value line | The rendered line of one live value pin, under `## Values`. | "briefing line" |
| pinned items | The rendered sources of live reference pins, under `## Pinned`. | "pinned block" |
| tally | The `## Not shown` part: one row per topic with the count of its omitted pins and remainder messages. | "recap", "summary", "subject index" |
| tail | The newest messages the prompt carries verbatim, ending on the request. | "recent window" |
| remainder | Messages outside the tail that are not tool messages, not call messages, not decisive chatter or distractors, and not the source of a live pin. | "undigested messages" |
| topic | What a message or pin concerns: an entity (customer, account, order, or ticket, keyed by an id a call argument or a result names) or a desk topic (refunds, returns, escalations, delivery, warehouse, contacts). | "subject", "label", "concerns" |
| category | The judge's reading of what a message states: fact, rule, correction, request, opinion, chatter, or distractor. | "kind" |
| end | The derived lifetime end of a pin, with discriminant `cause`: `superseded`, `expired`, or `retired`. | "ended flag", "endReason" |
| amended | A derived mark on a message whose source a later correction changes in part. | - |
| owed | A successful, non-empty lookup result of this run that no pin sources. | - |
| touch | A request or call message of a run that names one of a pin's topics. | - |
| handle | A short prompt reference derived from store order: `mN` for a message other than a tool message, `rN` for a successful result, `pN` for a pin. | UUIDs in the prompt |
| run | One `generate` call serving one request; the next run is the "next turn" of the design direction. | - |

The word `subject` stays with selection, where it names the judged message `[A]` (`src/core/contexts/helpers.ts`, `guides/agent.md` § The stock selection). The word `label` stays with `ConversationReferenceOptions.label`, where it names provenance. The word `digest` is not used, because a pin is the only distilled form.

The design review applied the collision test to five names, and this record rules on each as follows:

- `recap` is renamed `tally`, because the package owns `recap` for compaction's summary message (`buildRecapMessage`, `src/core/conversations/helpers.ts:121`); `recap` in this record means only that message.
- `briefing` stays, because the package owns no `briefing`, and the instruction, its rendered block, and the `briefing.*` metrics name one concept; the value-pin lines are value lines.
- `ledger` stays, because the package owns no `ledger` and the store, the mode that adds it, and the scenario object that configures that mode name one mechanism; `pins` is the store's code member in the pattern `judgments` follows.
- The handles keep their bases, because `mN` equals the seed index, so the ground truth reads directly, while `rN` counts successful results from 1; a tool message has only its `rN`, so no message carries two handles.
- `ResultManager` is renamed `ToolResultManager`, because the record type is `ToolResult` and the `Result` record name is ruled out in the following table.

### The four stores

The following table gives each store's ownership, key, record, writer, reader, and the things it never holds:

| Store | Owns | Key | Record | Writer | Reader | Never holds |
| --- | --- | --- | --- | --- | --- | --- |
| Conversation | Every message, verbatim | Message id (UUID minted on `add`) | `Message`, unchanged; a tool message keeps `call` | The application (seed, requests); the loop (assistant turns, tool messages) | Prompt projection, `recall`, `read`, pin source resolution, judge states | A pin, a judge answer, or a distilled text in place of an original; in the package design, a result's content |
| Results | Every dispatched tool result | Call id; `add` refuses a call id it holds | `ToolResult` (`success`, `value` or `error`), held before any prefix; the handle derives from the store's order of successful results, and the name, arguments, position, and run derive from the paired call and the tool message | The loop at dispatch in the package; the `tool` listener in the arm | Pinned items, `recall`, `read`, judge states, the pin token check, the gate's owed set | A message, a stub, a call's arguments, a handle, a run, a workspace file, or a pin |
| Judgments | Judge records | JSON tuple whose head is the question name, never `needed` (section 4) | `Judgment`, unchanged | The categorizer at the select site, through `judgments.resolve` | The categorizer (reuse), ends, auto-pinning, recall by category, the tally, metrics | A model-written value, a pin, or a request-keyed record |
| Ledger | Pins | Pin id (UUID) | `Pin` (following table) | The model through `pin`; the loop (auto-pin, deny listener, settle, touch) | Briefing render, `recall`, the gate, end derivation, metrics | A stored end, a stored topic, a value its source lacks, a copy of its source text, or a source that does not resolve |

In the arm, each tool message's stored content is the result behind the harness text `[rN] `, which the wrapper adds for the producing run's wire turn; every state and render reads the result from the results store instead, so no state or render carries the prefix.

A ruling on each store-level alternative the planners and reviews raised follows:

| Alternative | Ruling |
| --- | --- |
| Results stay tool-message content (`Agent.ts:546-553` on 2026-10-08) | Lost, by the user's direction: a fold splits a call from its result and a recap loses its values. |
| Results as workspace files | Lost, by the user's direction; `build()` also renders every scoped text file into every system block (`AgentContext.ts:205-225`), so a file cannot be included by reference. |
| Results keyed by the stub's message id | Lost to the call id, the key the user named; `add` refuses a duplicate and the arm counts `collisions`. |
| A `Result` record type | Lost: the `{Entity}Result` suffix means an outcome type (`names.md`), and `ToolResult` already is the record. |
| Pins stored as judgments | Lost: a judgment is a question, an answer, a model, and a state; a pin has none of these. |
| Mutable pins | Lost: an in-place update erases the superseded value that must stay reachable. |
| Purging ended pins | Lost: an ended pin stays reachable by reference. |
| Two pin record kinds | Lost to one `Pin` with an optional `value`: the lifetime rules are identical and the render splits on presence. |
| A digest per message, as a fifth store or under the conversation | Lost: value pins are the distilled form, and "undigested" reads as "not the source of a live pin". |
| A digest as a one-message section | Lost: a fold removes the message from the live tail and renders as an assistant recap. |
| Stores on `AgentContext` | Lost: per-thread state must follow `conversations.switch` and travel in the snapshot. |
| Pins shared across conversations | Lost: a pin belongs to its conversation, as a judgment does. |
| A stored position integer, a stored `ended` flag, a stored `category`, a stored `topic`, a stored handle or run in the results store | Lost to derivation (the "Derive state" law): a stored topic drifts as the registry links ids later and cannot hold message 6's two desk topics. |
| Supersede-on-write by topic | Lost: an entity topic is not a slot, so a refund-amount pin would end a card pin on the same customer. |
| An `unpin` tool, or a `replaces` argument on `pin` | Lost: each lets the 2B end a true pin, and every end needs a code or judge decider. |
| An `until` argument on `pin` | Lost: the 2B could end a true pin by naming a past date its source holds (`2026-10-03` in r1 against the clock `2026-10-08`), and choosing which date is the expiry is date reasoning that stays in code. |
| Codes and dates as topics | Lost: a code or a date is a value that rotates or passes (MX-4471, 2026-10-09), not an entity a request names; a correction pairs with its earlier message through entity and desk topics (section 4). |
| A `holder` field for opinions | Lost: attribution derives from the source's role and its `opinion` category. |

### The pin

A pin stores five fields and derives the rest. The following table gives each field, whether it is stored or derived, and its meaning:

| Field | Stored or derived | Meaning |
| --- | --- | --- |
| `id` | Stored | A minted UUID; the prompt shows the derived handle `pN`. |
| `source` | Stored | The message id the pin draws from; a tool message's id reaches its result through `call`. |
| `value` | Stored, optional | The distilled value; absent makes a reference pin, which renders its source whole. |
| `origin` | Stored | `model` or `loop`. |
| `until` | Stored, optional | A `YYYY-MM-DD` expiry that only code or the application sets, never the model; code compares it with the conversation clock. |
| `topics` | Derived | The source's entity topics under the registry as of the select site, plus its decided desk topics. |
| `category` | Derived | The source's category judgment; a result is a fact. |
| as-of position | Derived | The source's position in the conversation; for a result, its tool message's position. |
| `amended` | Derived | The later message ids whose `amends` record against the source reads yes. |
| `end` | Derived | `{ cause, by? }`, following table; absent while the pin is live. |

Every input of every end only accrues: a decided judgment is final, a repeated lookup stays stored, the clock moves forward, an application expiry predicate must stay true after it first returns true, and an untouched gap stays in the stored history of requests and call messages. A derived end therefore never reverts. The following table gives the three ends:

| Cause | Decider | Input | Checked |
| --- | --- | --- | --- |
| `superseded` | The judge for the source; code for a value pin and for a repeated lookup | A decisive yes on `supersedes` for the source against a later message (`by` names it); for a value pin, also a decided `amends` yes whose later message carries an id-shaped or numeric token of the value; a later result of the same tool with the same arguments (`by` names its tool message) | At each select site |
| `expired` | Code, by application rule | `until` precedes the conversation clock, or an application expiry predicate returns true; no pin in the arm carries an expiry, so the arm records `expired` as unexercised and the ledger fixture (section 5) exercises it | At each select site |
| `retired` | The judge for an explicit local close (a decisive `closes` record on a message whose own wording closes the thread), the application for a close that needs the wider conversation, and the application can reopen or close eagerly over either; code for the horizon | The thread closes (ruling 1, section 8), or a gap of `HORIZON` consecutive runs without a touch occurred after the pin's write; a `rule` pin never retires by horizon | At each select site |

A request touches a topic when its entity topics or its decided desk topics include it; a call message touches a topic when its arguments name the topic's id or a `recall` query matches it. Code reads each run's touches against the topics as of that run, so a topic the registry gains later never turns an old gap into a touch. When a request touches a retired pin's topic, the loop writes a fresh pin from the same source with origin `loop`; the old pin keeps its end, and the fresh pin reuses the source's judge records because their keys carry the source, not the pin id.

A pin's topics are its source's entity topics plus the source's decided desk topics, which take the place of a `desk` fallback topic, so a request can touch every pin whose source carries either. The calibration acceptance (section 5) requires every goal fact and every member of a ground-truth supersession pair to carry at least one topic; a pin whose source has none (message 0, the date line, is one) never retires by horizon, because no touch can reach it, and counts in `pins.untopiced`.

## 3. The loop

### The `pin` tool

The `pin` tool takes two arguments, and code checks each one:

- `source`: a handle, `mN` or `rN`. Required unless code infers it: when it is missing or invalid and the value's id and number tokens occur in exactly one candidate (this run's results, then the tail), code sets it.
- `value`: optional. Without it, the pin is a reference pin.

The tool takes no topic and no lifetime: a pin's topics derive from its source, and only code or the application sets an expiry.

Code refuses the call, with the reason as the tool result's error so the model can retry within the run, when any of the following holds:

- The handle does not resolve; the reason lists the valid handles of this run's results and the tail.
- The source is an assistant message the loop wrote in a run; seed assistant messages are application-supplied and can be pinned.
- The value carries an id-shaped or numeric token that the source (or the source's result) lacks. An id-shaped token is letters and digits joined by hyphens with at least one digit (`LH-79215`, `PW-5521-9930`, `2026-10-21`). A numeric token compares by value after code strips currency symbols and thousands separators, so `289 dollars` passes against `$289.00`. Words are not checked, which is why the source renders beside every value line.
- The source's end is `superseded`, or the value carries an id-shaped or numeric token that a later message with a decided `amends` record against the source also carries; the reason names the later message (`m4 was withdrawn by m44; pin from m44`, or `MX-4471 was changed by m29; pin from m29`).

The refusal reads decided records only. Every correction a run can see was screened at run entry, so the refusal covers every correction in view whose earlier side was screened; a value pin from a source that was never screened is checked at the next select site, where its end derives.

When the handle names a `recall` or `read` result, code rewrites it to the original source. A repeated `(source, value)` returns the existing pin. When a model value pin's source has no live reference pin, the loop writes one with origin `loop`, so the value never renders without its source. The tool returns `pinned pN from SOURCE: VALUE`, or `pinned pN from SOURCE (whole)` for a reference pin.

### Rendering and the consolidation property

The select handler renders the ledger into one instruction named `briefing` and returns the tail. The agent's instruction manager carries `format: { open: '' }`, so `InstructionManager.ts:76` drops the `## Instructions` header and `build()` places the instruction after the system string, separated by one empty paragraph, because `renderSection` joins `['', ITEM]` with two newlines (`contexts/helpers.ts:242-244`). When no pin is live, the handler removes the instruction instead of writing empty content. The system message then holds the following parts in order:

1. The system string: the scenario system text with the duties (section 5).
2. `## Values (as of mN)`: one line per live value pin, `pN (SOURCE) VALUE`, with an opinion line marked `(opinion, ROLE)`.
3. `## Pinned`: each live reference pin's source, `mN ROLE: CONTENT` or `rN NAME ARGUMENTS: TEXT`, with `[amended by mN]` after a source a later correction changes in part.
4. `## Not shown`: the tally, one row per topic, `TOPIC: N pins, M messages; use recall`, plus one `uncategorized: M messages` row.

Code renders every part; no model writes any of them. Within each part, pins sort into three groups: the request's topics first, then desk rules and corrections, then other topics by most recent touch. Within a topic, pins sort by source position ascending, so a correction reads after what it amends.

The rendered block holds the following consolidation property at every select site:

- It stays inside its share of the budget (`--budget`, section 5), measured by `estimateMessages` scaled by the ratio of a measured call's `prompt_eval_count` to its estimate: for the first run, the measured call the seed pass makes at startup; for each later run, the previous run's first call. The README records why the scale is needed: the estimate read 1,714 against 2,516 prompt tokens on 2026-10-08 (`README.md:163`).
- It never renders an ended pin.
- It omits from the end of the order: other topics first, then desk rules and corrections with rules last, then the request's topics, oldest source first. A value pin is omitted together with its source's reference pin, and never rendered without it. When it omits a request-topic pin, the run records `briefing.over`.
- It renders each source at most one time in pinned items, and it skips a pinned item only when the tail carries its source verbatim. A tool-message source always renders its result in pinned items, because the tail carries a tool message only as its stub.
- It never collapses a reference pin on a model-origin value: a value line renders beside its source, in pinned items or verbatim in the tail.
- It names omissions in the tally by topic and count only; `recall` reaches the handles, so the tally grows with the topic count and never with the handle count.

### The inclusion rule

Inclusion is code over stores; the judge never decides whether a message is needed for a request. The rule has four clauses:

- A live pin is included, as a value line or a pinned item, unless consolidation omits it into the tally.
- At each select site, the loop reference-pins with origin `loop` every user message whose category reads decisive fact, rule, or correction and that no pin sources. It never auto-pins an assistant message: acknowledgments restate their user messages, and `recall` reaches them.
- At seed load, the settle step reference-pins every seed lookup result, as it does for any owed result after a run.
- A remainder message appears only in the tally's count; `recall` and `read` reach it.

### Enforcement and its fallback

The gate is an `AgentOptions.authority` whose `evaluate` reads the run's owed set. A scope that hides `send_reply` until the pin was ruled out: an unadvertised tool cannot be called, so the 2B answers in content and the run ends, which amplifies its known failure of no `send_reply` after a lookup (`results/REPORT.md` § Grades). An authority denial is fed back as a tool message and can name the handle.

The gate works in five steps:

1. `evaluate` receives each call of a turn alone, in call order, before any call is dispatched (`Agent.ts:523`, `Agent.ts:727-768`, `agents/types.ts:536-538`). The authority records the `source` of each `pin` call it sees and clears that record on the `turn` event, which carries only the turn index (`agents/types.ts:144`).
2. For a `send_reply` call while results are owed, when no earlier `pin` call of the turn names an owed result and no denial was issued this run, the authority records the call id and returns `{ zone: 'ledger', allowed: false, reason }`; every other call returns `{ zone: 'ledger', allowed: true }`. A same-turn `pin` counts as a hint only: the token check runs at dispatch, after `evaluate`, so a refused `pin` can still admit `send_reply`, and the settle step pins the result.
3. The loop emits `deny` with the call and the reason (`Agent.ts:764`). The harness listener acts only on a call id the authority recorded, so a scope denial (`Agent.ts:519`, `Agent.ts:735`) or a thrown `evaluate` (`Agent.ts:757`) never triggers it. It reference-pins each owed result with origin `loop` before the model reads the denial, so the reason states what has happened: `send_reply was refused one time because r5 was unpinned; the loop pinned r5 whole. To add the exact value you will send, call pin with source r5 and that value, then call send_reply again.`
4. The model's next `send_reply` is admitted. A `pin` call with a value in between adds a value line beside the reference pin.
5. After `generate` settles, the settle step reference-pins every result still owed. This covers a run that answered in content, exhausted its limit, or was aborted.

The `--gate admit` flag skips the denial and the deny listener, keeps the settle step, and runs without the gate sentence in the system text (section 5), so the arm measures what the denial costs and buys.

The gate fixes none of the 2B's failures: it asks the model one time and then pins on its behalf. It adds one denial turn, which risks the known failure of no `send_reply` after a lookup (section 7), and it leaves id confusion and flipped rules to the source that renders beside every value line.

Each duty this design puts on the model is advisory, and inclusion rests on the loop's pins. The following table pairs each duty with what the loop does and its fallback:

| Model duty | What the loop does | Fallback |
| --- | --- | --- |
| Pin each lookup result it uses before `send_reply`; the model's pin adds a value line, and the loop's pins carry inclusion | The gate asks one time by denying the first `send_reply` while results are owed, and the deny listener pins them | The settle step pins every result still owed |
| Copy values exactly | The token check refuses with a reason | The source renders whole beside every value line |
| Name a valid handle | The refusal lists valid handles | Source inference from a unique token match |
| Recall a topic the briefing omits | None | The request-topic order renders the request's pins first; the tally counts what each topic omits |
| Respect corrections and withdrawals | Ended pins never render; amended sources carry their marker; `pin` refuses a replaced value | The `stale` metric reports any lapse |
| Finish with `send_reply` (a duty the scenario already sets) | Unchanged | The `ok any` column scores a content answer, unchanged |

### The `recall` tool

The `recall` tool takes `topic` (required) and `category` (optional: fact, rule, correction, opinion). The `topic` argument is a query only and is never stored. It matches the query against registry topics (ids and the holder names results state beside them) and desk topics, case-insensitively; a topic matches when it contains every query word, and an id-shaped query also matches exactly. It returns the following, newest first, cut to the room the run's budget leaves:

- live and ended pins on the topic, each ended pin with its cause and `by` (`p3 (m22) ended: superseded by m27`);
- messages with the topic, as `mN ROLE: CONTENT`, each with its `[amended by mN]` mark;
- results on the topic, as `rN NAME ARGUMENTS: TEXT`.

With no topic match, it falls back to the `words` search over user messages and results. A repeated call with the same arguments in one run returns `shown in rN`. `recall` replaces `search_history` in the arm; keeping both was ruled out because it adds a schema and `recall` keeps the word search.

### The stub and the accessor

At run entry every stored tool message predates the run, so the select handler projects each one to its stub. The stub derives its name and arguments from the paired call and its pin state from the ledger:

```text
[r5] lookup_customer {"account":"LH-44870"}: stored; pinned p12
[r6] lookup_order {"id":"LH-81660"}: stored; read r6
```

A failed result has no handle, and its stub reads `lookup_order {"id":"LH-45678"}: failed`. Within the producing run, the working array carries the result verbatim behind the harness text `[rN] `, because the provider wire needs the tool turn right after its call. The assistant call message and its tool messages are kept or omitted together.

The `read` tool takes one `handle`, `mN` or `rN`, and returns the stored message content or the result text from the results store. It writes no store record; its own stub names the original handle. A stub returned from the tool's own `execute` was ruled out, because the model would need a `read` call in the same run to see its own lookup.

### Step by step: one run

One run serves one request and proceeds in the following order:

1. The harness advances the conversation clock, adds the goal request to the conversation, and the view ends on a user message, so the loop calls the select handler at run entry.
2. Categorize: for each message added after the last select site, code sets entity topics from the registry and sets the category of call messages, tool messages, and loop-written assistant text (`chatter`, so no `topic` question follows a content answer); the judge answers `category` and the desk `topic` questions; for each user message whose correction gate is open, the judge answers `amends` against each earlier same-topic message and result, then `supersedes` where `amends` reads yes (section 4). Matching records answer without a call. The handler catches every judge error, logs it in the run's `faults`, and leaves the item uncategorized.
3. Auto-pin: the loop reference-pins decisive fact, rule, and correction user messages no pin sources, and writes fresh pins for retired pins whose topic the request touches.
4. Plan: derive every pin's topics, end, and `amended` marks, order the live pins, and apply the consolidation property.
5. Render: overwrite the `briefing` instruction, or remove it when no pin is live; build the tail (newest messages, call groups whole, back until the `--tail` share is spent, always ending on the request), each message copied with `[mN] ` prefixed, each tool message as its stub, and each earlier side of a decided `amends` or `supersedes` record marked.
6. Return the `Selection` with no `fault` member; the loop builds the system message and the tail and emits `select`.
7. Turns: the `tool` listener records each result under its call id; `pin` validates and writes; the gate denies an early `send_reply` one time and the deny listener pins; a successful `send_reply` triggers `abort('replied')` as in the other modes.
8. Settle: pin every result still owed, then record the run's metrics.

The following sample sketches the system block a later run might render for g05, the approval-note goal; the handles, counts, and topic order are illustrative:

```text
## Values (as of m61)
p20 (r4) refund 289.00 in full

## Pinned
r4 lookup_order {"id":"LH-79215"}: Order LH-79215 for account LH-44870 (Luis Ferreira): stand mixer, 5 quart, total $289.00. Delivered 2026-09-21; return window open until 2026-10-21.
m2 user: Standing rule: any refund over $200 needs a manager approval code in the internal note. This week's code from Marcus Oyelaran, our escalations manager, is MX-4471. [amended by m29]
m29 user: Marcus just messaged that the approval code rotated early. Use MX-4486 from now on; MX-4471 is dead.
m44 user: Before you work on Luis: the director scrapped the 15 percent restocking fee this morning. ...

## Not shown
LH-20418 Grace Okafor: 2 pins, 3 messages; use recall
LH-31055 Halvorsen Interiors: 3 pins, 2 messages; use recall
uncategorized: 1 message; use recall
```

Messages 3 and 30 are absent from the sample because auto-pinning skips assistant acknowledgments; `recall` returns message 3 with its `[amended by m29]` mark, and message 4 is absent because message 44 supersedes it.

A ruling on each loop-level alternative follows:

| Alternative | Ruling |
| --- | --- |
| One agent per goal with the briefing in a fixed system string | Lost: the instruction route with an empty `open` keeps the harness's one-agent shape, runs categorization at the select site where the package would, and charges judge usage to the run. |
| The briefing under the `## Instructions` header | Lost: `format: { open: '' }` drops the header. |
| A second system message, or an assistant message in `selection.messages` | Lost: Qwen chat templates take one leading system message, and an assistant-role block invites an echo. |
| The model summarizes the remainder | Lost: a recap that lost a value invited fabrication (`results/REPORT.md` § Grades), and each fold costs model calls. |
| A silent fallback with no denial | Kept as `--gate admit` for measurement; `deny` is the default because the user's direction asks the model to pin before it replies. |
| Loop pins only, with no `pin` tool and no gate | Lost: the user's direction keeps a model duty; the model's pin is advisory and adds only value lines, and `pins` by origin measures what it adds. |
| A value pin collapses its reference pin, or collapses it when the value is a contiguous span of the source | Lost: a value that carries every token of its source can still invert its rule (`no approval code needed under $200, MX-4471` against message 2), and the source renders whole at the cost of its tokens. |
| Auto-pinning assistant acknowledgments | Lost: acknowledgments 3, 5, 7, 23, 28, 30, and 45 restate their user messages and would double the block; `recall` reaches them, and the ground truth screens 3, 5, and 23 as earlier sides. |
| A topic argument on `pin` | Lost: a model topic outside the registry (`kettle`, `Marcus`) orphans the pin; the topic argument lives on `recall` as a query. |
| Budget pressure as an end | Lost: omission under budget is render-time and reversible; retirement is an end. |
| A reserved budget slice for rules | Lost to ordering: rules render after the request's topics and are omitted after other topics. |
| Separate harness modules (`results.mjs`, `ledger.mjs`, and others) | Lost: the arm edits the existing `bench.mjs`, and a fresh script must be TypeScript under `AGENTS.md`. |
| A lookup guard that refuses an account id passed as an order id | Lost for this arm: it changes a tool every mode shares and confounds the comparison. |

## 4. The judge

The judge is Mica (`hf.co/sky7350/Mica-v0.1-4B:Q4_K_M`) at judge `num_ctx` 4,096. tev1 is not used: its needed and noise probabilities overlap end to end (`results/JUDGE.md`). Every state is plain `ROLE: CONTENT` text without handles: a message state reads the message content, and a tool message's state reads `tool: TEXT` with the text from the results store, which holds the value before the wrapper prefixes `[rN] `. The bytes therefore never change and `matchesJudgment` reuses each record. No key's head is `needed`, so `parseConditionKey` returns `undefined` for it and the stock purge never removes it. A refusal or an undecided probability leaves the item uncategorized: it counts in the tally's `uncategorized` row and stays in `recall`, and nothing is pinned or ended on it. A question that a judge error left without a record is asked again at the next select site.

The following table gives each categorical question with its form, state, reuse key, scope, and cost:

| Question | Form | State | Reuse key and sources | Asked of | Cost on this host | Calibrate first |
| --- | --- | --- | --- | --- | --- | --- |
| `category` | Choice: fact, rule, correction, request, opinion, chatter, distractor; chatter is talk with the agent that states nothing the desk acts on, and a distractor is a statement about something outside the desk's work | The message alone | `["category", MESSAGE_ID]`, sources `[MESSAGE_ID]` | Every application message without calls: the 41 such seed messages in `scenario.json`, then each request | One question per message | Yes: the choice form is unmeasured on this host; run both option orders to check for a lean toward the first option |
| `topic` | One noul per desk topic | The message alone | `["topic", MESSAGE_ID, TOPIC]`, sources `[MESSAGE_ID]` | Each message without calls whose category does not read decisive chatter or distractor, and each request | Gated messages times 6 desk topics; the seed gates 27 messages (0, 2 to 8, 11 to 13, 17 to 19, 22 to 24, 27 to 30, 34, 37, 40, 43 to 45) when the categories match the truth categories, so 162 questions; each request adds 6 | Yes, for the threshold and for the acceptance that every ground-truth pair shares a decided topic; the noul form over a short plain state is the measured form |
| `amends` | Noul: "Does the later message replace or withdraw any value or rule the earlier message states?" | Two parts: `Earlier message: ROLE: CONTENT`, `Later message: ROLE: CONTENT` | `["amends", EARLIER_ID, LATER_ID]`, sources `[EARLIER_ID, LATER_ID]` | Each user message whose correction gate is open, against each earlier message or result that shares an entity or desk topic with it and whose category does not read decisive chatter or distractor | One per screened pair; the seed's corrections 27, 29, and 44 screen their same-topic earlier messages | Yes: a linking question is an indirection, and a false yes marks a true source |
| `supersedes` | Noul: "Does the later message replace or withdraw everything the earlier message states?" | The same two parts | `["supersedes", EARLIER_ID, LATER_ID]`, sources `[EARLIER_ID, LATER_ID]` | Each screened pair whose `amends` reads yes | One per amended pair | Yes: a false yes ends a true pin |

For a result source, `EARLIER_ID` is the tool message's id, so every source is a message id. No question carries a model-written value: a value pin's end derives in code from its source's records (section 2). The cost column rests on the measured per-question time: 4.3 s mean on 363-token bounded states at `num_ctx` 4,096 (`cal-mica-bounded`, `results/v2/cal-mica-bounded/calibration.md:3`, `results/JUDGE.md:38`), and 2,287.4 s for 480 questions at `num_ctx` 4,096 (`results/v2/cal-mica-b2-lookup/calibration.md:3`). Message-alone states are shorter, and their per-question time is unmeasured.

The one-time seed pass is 41 `category` questions, plus 162 `topic` questions, plus the screened pairs. Each goal then costs 1 `category` question, 6 `topic` questions, and its screened pairs, independent of the view's length; screened pairs grow with the earlier same-topic messages of a correction, a judge cost the `questions` field reports that adds nothing to the prompt. An unlimited stock selection asks one question per view message (48 to 66 here); the measured runs asked 12 or fewer per selection under `limit` 12 (`results/full/selection/selection.md:7-16`) and 6 to 17 per completed selection in `both` (`results/full/both/both.jsonl`), because the stock selection keys every judgment by the request and purges the rest (`results/JUDGE.md`).

Consumers read probabilities, never the argmax. The chatter gate closes only on a decisive chatter or distractor probability. The correction gate opens when the correction probability passes a low floor fitted so every ground-truth correction opens it, because a missed correction leaves a stale value live. Every decisive threshold is greater than 0.5 and fitted per question, as `createSelection` and `results/JUDGE.md` require. The thresholds and the floor are fitted on the seed the arm is scored on, so every judge-dependent reading of the arm is in-sample; `results/JUDGE.md:71` requires a held-out goal set before any threshold is fixed for the desk.

The judge never decides the following:

- whether a message is needed for a request, or inclusion in the prompt;
- what to pin or what the reply says;
- dates, expiry, and arithmetic (`guides/agent.md` § The stock selection);
- entity topics, which code derives from ids;
- thread close, in this arm;
- whether a result is still relevant: a repeated lookup supersedes it in code, and the horizon retires it.

If the choice form fails calibration, `category` falls back to one noul per option, keyed `["category", MESSAGE_ID, OPTION]`, at seven questions per message. The calibration run decides.

A ruling on each judge-level alternative follows:

| Alternative | Ruling |
| --- | --- |
| The request-keyed `needed` question | Lost: it costs one question per view message per request, and its misses were indirect needs (`results/JUDGE.md`). |
| A `concerns` choice over registered customers for messages without an id | Deferred: entity topics plus decided desk topics cover the seed; the choice form is unmeasured, and a candidate list frozen at arrival is the shape if a later arm adds it. |
| Topic as one noul per registered customer | Lost: every arriving customer adds a question for every earlier message. |
| Desk topic as one choice | Lost: message 6 carries two desk topics (escalations and delivery), and g03 and g06 each need one. |
| Desk-topic nouls only for messages without an entity topic | Lost: message 22 has entity topics and message 27 has none, so the pair would share no topic and the g04 correction would never be screened. |
| Topics from the model's own tags, or from the briefing's topics | Lost: the 2B drifts on names, and a topic never pinned could never be assigned. |
| Supersession over pins only | Lost to message pairs: the judge reads an earlier message against a later correction, so the mark reaches the tail and `recall` as well as pinned items; `amends` keeps message 2's rule live and marked, and a value pin ends in code. |
| A `supersedes` key that carries the pinned value | Lost: the value is model-written, and a note inside the state can move the answer. |
| Code ends a pin on a same-shape id | Lost: orders and accounts share the `LH-NNNNN` shape, so code only screens pairs in. |
| States with following neighbors, the whole view, or structured JSON | Lost: the bytes change as messages arrive, so no record is reused; JSON states are unmeasured on Mica. |
| Seven category nouls first | Lost to the choice form at one seventh of the questions, with the nouls as the calibrated fallback. |
| A `closes` noul per message | Adopted for an explicit local close (ruling 1): the judge reads one message and answers only where its wording closes or reopens the thread; a close that needs the wider conversation is the application's, and the application overrides either way; unexercised in this arm because the seed closes no thread. |

## 5. The harness arm

The arm changes `bench.mjs`, `scenario.json`, and `README.md`, and nothing in `/home/user/agent/src`.

### Changes to `scenario.json`

`scenario.json` gains one top-level `ledger` object and one `truth` member per seed message. The seed's message construction picks `role`, `content`, `calls`, and `call` by name (`bench.mjs:477`), so neither addition reaches a conversation. The additions are the following:

- `ledger.system`: the scenario system text with the `search_history` sentence naming `recall` with a topic, plus the duties: "After a lookup, you must call pin with the result handle and the exact value you will use, before send_reply. A message marked amended is changed by the message it names."
- `ledger.gate`: the sentence the harness appends to `ledger.system` under `--gate deny` only: "The first send_reply while a lookup result is unpinned is refused one time, and the refusal names the handle." Each JSON line records the gate, and with it the system text the run used.
- `ledger.clock`: `2026-10-08`, the scenario date message 0 states. The harness advances the clock one day before each goal after the first.
- `ledger.topics`: the desk topics with one criterion each: refunds, returns, escalations, delivery, warehouse, and contacts (who to reach, how, and when).
- `truth` on each seed message: `{ category, topics, amends?, supersedes? }`, the one home of the ground truth for the category, topic, and supersession calibration and the registry acceptance.

Every seed message carries a truth category, distractors included. The truth categories read the seed as the following table gives; withdrawals map to correction, and the call messages carry `chatter` because their text states nothing the desk acts on:

| Category | Seed indices |
| --- | --- |
| fact | 0, 11, 12, 13, 17, 19, 22, 23, 24, 37, 40, 43, and the results 15, 16, 36, and 42 |
| rule | 2, 3, 4, 5, 6, 7, 8, 18 |
| correction | 27, 28, 29, 30, 44, 45 |
| request | 34 |
| opinion | none |
| chatter | 1, 10, 21, 26, 32, 39, 47, and the call messages 14, 35, and 41 |
| distractor | 9, 20, 25, 31, 33, 38, 46 |

The `amends` and `supersedes` members list the earlier seed indices a correction replaces: message 27 amends 22 and 23, message 29 amends 2 and 3, and message 44 supersedes 4 and 5. Every other pair the calibration screens reads `none`.

### Changes to `bench.mjs`

The script gains the following flags; the arm's runs set each figure, and the smoke run settles the budget figures:

| Flag | Meaning |
| --- | --- |
| `--mode ledger` | Adds `ledger` to `MODES`. |
| `--gate deny\|admit` | `deny` runs the gate's five steps and appends `ledger.gate`; `admit` keeps the settle step only and omits `ledger.gate`. |
| `--budget SHARE` | The share of `--ctx` the system message and the tail can take, leaving room for the tool schemas, the run's appends, and the reply. |
| `--tail SHARE` | The share of the budget the tail can take; the rest goes to the briefing. |
| `--horizon RUNS` | The gap of consecutive untouched runs after which a non-rule pin retires. |
| `--categories choice\|noul` | The `category` form; the calibration run picks it. |
| `--calibrate-categories` | Runs no agent: asks every section 4 question over the seed (`category` in both option orders; the `topic` nouls for every seed message without calls, ungated, to measure the gate; `amends` and `supersedes` for every ground-truth pair and every pair that shares a truth topic) and writes `calibration-categories.jsonl` and `calibration-categories.md` with a separation table per question in the shape of `calibration.md`. |
| `--check-ledger` | Runs no model and no judge: replays the ledger fixture that the ledger piece of the following list describes and exits nonzero on a failed check. |

The `--mode ledger` path adds the following pieces:

1. Results store: a `Map` from call id to `ToolResult`, written by the `tool` listener, because the `tool` event carries the call and the result (`Agent.ts:542`); the result the event carries is the wrapper's return value, so the listener removes the leading `[rN] ` from a successful value before it stores the result, and every state, token check, and render reads the unprefixed value. At seed load it records seed tool messages 15, 16, 36, and 42 under `call_1` to `call_4`, which derive the handles `r1` to `r4`. A handle derives from the Map's order of successful results, and a run from the tool message's position. A duplicate call id is refused and counted. A `no record` answer is marked empty and never owed.
2. Tool wrapper: an object passed as `tools` whose `definitions()` delegates to the stock manager and whose `execute(calls, context)` delegates and prefixes each successful value with the harness text `[rN] `, numbering by the same rule as the results store, because the loop emits `tool` for each call in call order and a denial is never successful. The wrapper exists only for the prefix: the loop calls only these two members (`Agent.ts:433`, `Agent.ts:782`), and `ToolContext` carries no call id.
3. Topic registry: entity ids only, typed by kind: an order id from a `lookup_order` argument or named as an order in a result, an account id from a `lookup_customer` argument or named as an account in a result, a customer as the holder name a result states beside an account id (registered as that account's alias, matched in a message by the whole name), and a ticket id a call argument or result names as a ticket (the scenario has none). Codes and dates are never topics. A message's entity topics are the registered ids and aliases it contains. Accepted when it reproduces the entity topics in the seed's `truth` members.
4. Categorizer: the section 4 questions through `conversation.judgments.resolve`, with the gates and thresholds the calibration fitted. Accepted when a second pass over an unchanged conversation asks zero questions and every goal fact and every member of a ground-truth supersession pair carries at least one topic. The seed pass runs at startup, makes the measured agent call that seeds the token scale (the seed prompt, one predicted token), and reports on its own `seed` line.
5. Ledger: an array of pins, the `pin`, `recall`, and `read` tools, end derivation, auto-pinning, fresh pins on touch, and the render with the consolidation property. Accepted when every build asserts that no ended pin renders and every pin's source resolves (live tail or section originals), and when the ledger fixture passes. The fixture is handmade pins, requests, and call messages with no model and no judge; it checks that a pin retires after a gap of `HORIZON` untouched runs, stays retired after a later touch, and gets a fresh pin on that touch; that a rule pin never retires by horizon; and that a pin whose `until` the fixture sets expires when the advancing clock passes it.
6. Select handler: the step-by-step of section 3 as the agent's `select`, with the agent's instruction manager built with `format: { open: '' }` and the `briefing` instruction overwritten by name at each select site, or removed when no pin is live. The handler never throws and never returns a `fault`: it catches judge errors, logs them in the run's `faults`, and returns its own projected tail. It writes no messages, so the view check at `AgentContext.ts:261-276` passes. No `window` is set, so no rebuild can stub a result the run still needs.
7. Gate: the authority, the `deny` listener filtered to the authority's own `send_reply` denials, and the settle step.
8. Tools advertised: `lookup_order`, `lookup_customer`, `pin`, `recall`, `read`, and `send_reply`; `search_history` is not advertised in this mode.
9. Separation check: an assertion that no request body after run entry holds the text of any result produced before this run entry, the seed results included, outside pinned items or a `recall` or `read` result. A run entry with no `select` event, or with a `fault` event, is a fallback build (`Agent.ts:695-722`) and counts as a separation failure.
10. Memory capture: during the smoke and the arm, the harness records `ollama ps` and the resident memory of both runner processes after the seed pass and after each goal into `memory.log`. The agent model stays loaded throughout, because the agent runs with `keep_alive` `30m` (`bench.mjs:269`); the judge runs with the ollama package's default of 5 minutes (`/home/user/ollama/src/core/types.ts:108`), which a goal's questions renew.

Each ledger-mode JSON line gains the following fields:

| Field | Meaning |
| --- | --- |
| `briefing.recall` | The goal's `facts` seed indices covered at run entry, over the goal's facts. A fact is covered when its source renders in pinned items or verbatim in the tail. |
| `briefing.precision` | Rendered pins whose source is a goal fact or its governing correction (`GOVERNING`), over rendered pins. |
| `briefing.topical` | Rendered pins any of whose topics is one of the goal facts' truth topics, over rendered pins. |
| `briefing.stale` | Lines of the briefing and the tail at run entry that carry `MX-4471`, `ESC-2291`, or the restocking fee without an amended marker or the correction beside them, an acknowledgment (3, 5, or 23) that repeats a replaced value included and a line whose source is a correction in the truth table excluded; the arm targets zero. |
| `briefing.tokens` | The scaled estimate of the briefing, and `briefing.over` when request-topic pins were omitted. |
| `pins` | Pins written this run by origin (`model`, `loop`) and by route (tool, deny listener, settle, auto-pin, touch), and `untopiced`, the live pins whose source has no topic. |
| `ends` | Pins ended this run by cause. |
| `refusals` | `pin` refusals by reason. |
| `questions` | Fresh judge questions this run by question, reused records, and judge seconds. |
| `recalls`, `reads`, `collisions` | Tool call counts and duplicate call ids. |
| `separation` | Separation failures this run, fallback builds included. |
| `gate` | `deny` or `admit`, which also names the system text. |
| `fabricated` | Id-shaped and numeric tokens in the answer that occur in no message, result, or request of the conversation. |

In ledger mode, `inPrompt` reads true when every goal fact is covered as `briefing.recall` defines it, and `toolsExpected` reads `recall` where the goal lists `search_history`. In ledger mode only, the results table gains the columns briefing recall, briefing precision, stale, judge questions, pins model/loop, and denials, because the header is global (`bench.mjs:901-904`) and a changed header changes every mode's `.md` output. `README.md` gains the mode, the flags, and the fields.

### What stays byte-identical

The modes `none`, `compaction`, `selection`, and `both` and the `--calibrate` path run no changed line, because every addition, the added table columns included, sits behind `--mode ledger`, `--calibrate-categories`, or `--check-ledger`. The byte-identity run checks this for `none` only; for the other modes the claim rests on the code path, which the diff shows. `scenario.system`, the seed, the goals, and the canned lookups do not change.

### Runs to make

Make the following runs in order, one at a time, because every run shares the one daemon. `BUDGET` and `TAIL` are the shares the smoke run settles, and `HORIZON` is the retirement gap in runs:

1. Byte-identity check: compare each goal's per-call `estimate` and `prompt` with `results/v2/none-words/none.jsonl`.

   ```sh
   node /home/user/agent/tmp/bench/bench.mjs --mode none --ctx 3072 --search words --out /home/user/agent/tmp/bench/results/v3/none-words
   ```

2. Ledger fixture, which exercises retirement and expiry apart from the arm's bar.

   ```sh
   node /home/user/agent/tmp/bench/bench.mjs --check-ledger --horizon HORIZON
   ```

3. Category calibration, which fits the thresholds and the correction floor, picks `--categories`, and checks that every ground-truth pair shares a decided topic. It loads no agent model, so it records no memory reading.

   ```sh
   node /home/user/agent/tmp/bench/bench.mjs --calibrate-categories --judge mica --judge-ctx 4096 --out /home/user/agent/tmp/bench/results/v3/cal-categories
   ```

4. Smoke: g01 against the daemon, printing the per-call log and the rendered system message, with `memory.log` captured beside both loaded models. An out-of-memory kill in the smoke stops the arm.

   ```sh
   node /home/user/agent/tmp/bench/bench.mjs --mode ledger --smoke --gate deny --ctx 3072 --judge mica --judge-ctx 4096 --budget BUDGET --tail TAIL --horizon HORIZON --out /home/user/agent/tmp/bench/results/v3/ledger-smoke
   ```

5. The arm, all 10 goals, with the gate denying and `memory.log` captured.

   ```sh
   node /home/user/agent/tmp/bench/bench.mjs --mode ledger --gate deny --ctx 3072 --judge mica --judge-ctx 4096 --budget BUDGET --tail TAIL --horizon HORIZON --out /home/user/agent/tmp/bench/results/v3/ledger-deny
   ```

6. The contrast, with the gate admitting and `memory.log` captured.

   ```sh
   node /home/user/agent/tmp/bench/bench.mjs --mode ledger --gate admit --ctx 3072 --judge mica --judge-ctx 4096 --budget BUDGET --tail TAIL --horizon HORIZON --out /home/user/agent/tmp/bench/results/v3/ledger-admit
   ```

7. Grading: grade `results/v2/c-tuned-s3`, `ledger-deny`, and `ledger-admit` with the same three-axis Opus rubric as `results/REPORT.md` § Grades. `c-tuned-s3` was never graded (`results/REPORT.md:56-65` covers the v1 runs only), so this step makes its fabrication count.

The comparator is `results/v2/c-tuned-s3`: window 1,600, sections 3, tuned summary, `--ctx` 3,072, `--search words`, 6 of 10 passed, largest prompt per goal from 1,246 to 2,363 tokens (`results/v2/c-tuned-s3/compaction.md:3-16`). For judge questions per goal, the readings beside it are `selection` (12 or fewer per selection under `limit` 12, of 48 to 66 screened) and `both-s3` (6 to 16 per completed selection, `results/full/both-s3/both.jsonl`).

The arm holds when all of the following read true on `ledger-deny`; `ledger-admit` is the contrast, reported beside it and never counted toward the bar:

- no overflow on any goal at `--ctx` 3,072;
- the least-squares slope of the largest prompt per goal against goal position is less than the same slope for `c-tuned-s3`, computed from its `compaction.jsonl`;
- at least 7 of 10 passed (ruling 4: a tie with `c-tuned-s3` on fewer fabrications is not a win);
- `briefing.stale` is zero on every goal;
- `briefing.recall` is 1 on every goal;
- fresh `category` and `topic` questions per goal equal 1 plus the desk-topic count, so they do not grow with the conversation, with screened pairs reported beside them;
- `separation` is zero on every goal, fallback builds included.

The `stale`, `recall`, and question readings rest on thresholds fitted to the same seed, so they are in-sample (section 4). The pass condition decides on a one-goal margin, and `results/REPORT.md` § Grades reads a 1 to 2 point move as single-run noise, so a second run of `ledger-deny` with a different seed is the check on a bare pass.

## 6. What the package changes if the arm holds

Each of the following items names the module it touches, for the user to rule on:

1. Results store: `src/core/conversations/ToolResultManager.ts` (added) and `conversations/types.ts` (`ToolResultManagerInterface`, `ConversationInterface.results`, an optional `results` member on `ConversationSnapshot` in the pattern `judgments` follows), with the snapshot shape and validator in `conversations/`.
2. The loop writes the result, then a stub: `agents/Agent.ts` stores each `ToolResult` under its call id and adds the tool message with a stub frame and `call`; the producing run's working array carries the full result as a wire turn. The separation ruling (a result is never a message body) then holds in the store, not only in the prompt.
3. Ledger: `conversations/PinManager.ts` (added) and `conversations/types.ts` (`Pin`, `PinManagerInterface`, `ConversationInterface.pins`, an optional `pins` snapshot member), with the token check at `add`.
4. Ends: an `infer*` helper in `conversations/helpers.ts` that derives `superseded` from judgments and repeated calls and `expired` from an application-set `until` and a clock, plus a retirement handler option on the conversation manager in `conversations/types.ts`, because the horizon and thread close are product policy.
5. Removal cascade: `conversations/Conversation.ts` `remove` and `clear` cascade from a message to the result its stub names and to every pin it sources, so a pin's source always resolves. Refusing removal while a pin references the message is lost, because an application must be able to remove any message it added.
6. The briefing on the selection: `contexts/types.ts` gains an optional `Selection.briefing` string, and `contexts/AgentContext.ts` `build(selection)` renders it after the system string and instructions, so one agent serves every run without an instruction workaround.
7. Compaction folds only the remainder: `conversations/Conversation.ts` `compact()` skips tool messages, call messages, and pinned sources and folds whole call groups; `agents/Agent.ts` `#trim` checks the abort before folding, so no fold follows the `replied` abort (`results/REPORT.md` § Design implications).
8. Request-independent categorization: a `create*` factory in `contexts/factories.ts` that asks per-message and per-pair questions one time and never purges, and a general key builder in `contexts/helpers.ts`, because `buildConditionKey` accepts only `needed`.
9. The gate: a `create*` authority factory in `agents/factories.ts` over the owed set, or the gate stays application code.
10. The `pin`, `recall`, and `read` tools as package factories in `agents/factories.ts`, or they stay application code.
11. Guide: `guides/agent.md` gains sections on results, the ledger, and the briefing, and § Selecting the messages a turn carries gains the `briefing` member.
12. Fleet names: run the `surface` check for `Pin`, `PinManager`, `ToolResultManager`, and `ToolResultManagerInterface` before adding any of them.

## 7. Risks

The following table pairs each risk with its control:

| Risk | Control |
| --- | --- |
| The 2B never calls `pin`, or pins a wrong value | The loop pins every lookup result after asking one time (the gate, the deny listener, the settle step) and auto-pins decisive user messages; the token check; the source renders beside every value line; `pins` splits model from loop origin. |
| The 2B copies a wrong handle | The refusal lists valid handles; source inference from a unique token match. |
| The 2B pins an inverted value that passes the token check (both-s3 g05 flipped the $200 rule, `results/REPORT.md:72`) | A reference pin never collapses on a model-origin value, so message 2 renders whole beside the value line. |
| Auto-pinning makes the briefing the whole desk, so fact precision reads low and the block grows | Request-topic order; budget-share omission into the tally; auto-pinning skips assistant acknowledgments; `briefing.precision`, `briefing.topical`, and `briefing.tokens` measure it. |
| Omission under budget hides an indirect need (the approval rule for g05) | A pin's topics include its source's decided desk topics, so the request's desk topics put the refunds rule first; rules are omitted after other topics; `briefing.recall` measures it. |
| The judge reads a correction as a fact and a stale value stays live (the g04 and g05 traps) | The low correction floor opens supersession pairs; amended markers; `briefing.stale`; calibration first. |
| A correction pairs with its earlier message only through a shared topic, and codes are never topics, so a pair whose desk topics disagree is never screened | Desk-topic nouls on every non-chatter message; the calibration acceptance requires every ground-truth pair to share a decided topic; `briefing.stale`. |
| A false `supersedes` ends a true pin | `supersedes` follows `amends`; fitted thresholds; ended pins stay reachable through `recall`; calibration first. |
| The choice form refuses (an option letter outside the top 20 logprobs) or leans to the first option | Option-order swap in calibration; the noul fallback; a refusal leaves the item uncategorized. |
| Mica is killed for memory beside qwen (30 out-of-memory kills at `num_ctx` 8,192, `results/JUDGE.md:38`) | Judge `num_ctx` 4,096; memory captured during the smoke and the arm with both models loaded, and a smoke kill stops the arm; the select handler catches a judge error, so a killed judge leaves items uncategorized and never puts results back in the prompt; a fallback build counts as a separation failure. |
| The registry misses or merges a name (message 11 has no entity topic until the g06 lookup registers LH-81660; two customers sharing a name merge) | Topics derive at every select site, so message 11's pin gains LH-81660 at g06; aliases come only from results; `recall` falls back to word search; acceptance against the seed's `truth` topics. |
| A pin whose source has no topic can never be touched | It never retires by horizon and counts in `pins.untopiced`; the calibration acceptance requires a topic on every seed fact, rule, and correction. |
| A stub prompts the 2B to repeat a lookup | The stub names the tool, the arguments, and the pin; a repeated lookup supersedes the earlier result in code and is counted. |
| A longer system message weakens the 2B's attention | `--budget` and `--tail` are flags; read pass rate against `briefing.tokens`. |
| The denial spends a turn of `limit` 8 and pushes the 2B to answer in content | The `--gate admit` contrast with its own system text; `answerVia` and `denies` are recorded. |
| The arm separates results at the prompt only, because `Agent.ts` stores the content | The separation assertion; the package change that stores results before stubs (section 6). |
| Ollama call ids collide or are absent | The harness mints a UUID when none arrives; `add` refuses a duplicate; `collisions` counts it. The design review places the minting in the ollama package's provider, but the arm runs the harness's own `OllamaChatProvider` port (`bench.mjs:215`), which mints at `bench.mjs:209`. |
| A pinned correction quotes the withdrawn value (message 29 names `MX-4471`) and the 2B echoes it | The forbidden lists score it; the correction renders after the message it amends. |
| The horizon retires a fact a later goal needs (message 22 serves g04 and g08) | A touching request writes a fresh pin; rules never retire by horizon; the ledger fixture checks both. |
| An account number passed as an order id | Unchanged in this arm to keep the comparison clean; measured in `tools`. |
| The seed pass delays the first run | It runs at startup and reports on its own line, apart from per-goal figures. |

## 8. Rulings of 2026-10-08

The user ruled on the five decisions the first version of this record left open. Each ruling and what it binds follows:

1. **Thread close is decided at two scales.** The judge decides a close or a reopen from one message whose wording is explicit (`["closes", MESSAGE_ID]`, a noul read only at a decisive probability); a close that needs the wider conversation, many sections, or the whole thread is the application's, and the application can override the judge either way, eagerly closing or reopening. "Application" means the layer that runs the agent, the larger model included. A thread is a scale, not a record kind: the micro scale is one message or a small section, the macro scale is the conversation. Both deciders are measured on the long scenario (ruling 2); this arm retires by horizon only.
2. **"The conversation moves on" is a horizon, measured two ways.** A non-rule pin retires after a gap of `HORIZON` consecutive runs without a touch, and a touching request writes a fresh pin; `rule` pins are exempt. The judge's close and the application's close are run as separate arms, because the reading is lossy on a short conversation, and that needs a long, hand-built seed with closes, expiries, changed opinions, and customers who go quiet and return. The seed is written by a large model under a validator and never by the small model under test.
3. **Keep and mark.** A corrected message stays in the record and in the briefing marked as amended by the message that corrects it; nothing is rewritten in place and no history is dropped, in the manner of event sourcing: the record is append-only, every mark is an event, and every state is derived.
4. **The bar is 7 of 10.** The arm wins on `ledger-deny` alone with at least 7 of 10 passed and the other six conditions of section 5; a 6 of 10 with fewer fabrications than `c-tuned-s3` is not a win. One run is noisy, so a bare 7 gets a second run before it is believed.
5. **The package line.** The ends helper lands in the package with the retirement policy as an application option; `remove` and `clear` cascade from a message to its result and its pins; the gate is a package factory; the `pin`, `recall`, and `read` tools are package factories.

## 9. The next arm: aggregates as projections (ruling of 2026-10-08)

The user's direction after the tuned rerun: the record is a store of events (messages, results, pins, judgments; append-only, immutable, indexed by the judge's categories), selection chooses events, and compaction becomes a projection that builds one aggregate per topic from that topic's events. The aggregate serves three readers and this arm measures each:

- **The judge reads the aggregate as context.** A `needed`, `amends`, or `supersedes` state carries the request, the subject event, and the aggregates of the subject's and the request's topics, so an indirect need (the approval-code correction for a refund note, the no-written-date rule for a shipping reply) is in front of the judge; the state stays bounded because an aggregate is a paragraph.
- **The model reads the aggregates of the request's topics** beside the pinned and selected verbatim events and the tail; compaction no longer folds an arbitrary window.
- **The aggregate is judged.** Two message-keyed questions: does this event change the aggregate (which triggers the rebuild and the supersession marks), and does the aggregate still agree with its source events (a consistency check on the summarizer, read against the exact source).

Rules that bind the arm: an aggregate is rebuilt from its topic's events when a new event with that topic arrives, its previous version stays as an event of its own, identifiers are copied into it by code and only the prose is the summarizer's, an aggregate is never the only carrier of a value (the verbatim event stays pinned beside it), and a consistency failure marks the aggregate stale and rebuilds it. The arm runs on the long scenario (section 8, ruling 2), because per-topic aggregates show their value only where threads have history; it reports the same metrics as the ledger arm plus the consistency failures per rebuild and the judge's keep and drop rates with and without the aggregate in the state.
