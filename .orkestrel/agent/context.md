# Refactor the agent, and stage the living context by consumer

Recommendation record for `@orkestrel/agent`, written 2026-10-07 against the agent checkout at commit `65c706a` (version 0.0.26 plus one unreleased commit) and the scaffold checkout at `e5f0403`. It answers one question the user put after a design conversation with ChatGPT (GPT-6 Pro), called "the proposal" in this record: does the agent package need a redesign or refactor, or would a `@orkestrel/context` package be the better move, given that `tool` and `workspace` left the package because they have uses outside it, and given that size and complexity are the felt problem.

Two kinds of sentence appear, as in the other records in this folder: a measured fact names the file, line, command, or run it came from; a design conclusion is a ruling for this codebase. Where a lane or a bench produced the reading, the record names it. Paths under `src/`, `tests/`, and `guides/` of the agent package resolve against the agent checkout; every other path resolves against the scaffold checkout. Amended 2026-10-07 after agent 0.0.28: § The plan points at [plan.md](plan.md), the decision-client rows record the landed judge, and a line citation resolves by symbol, because the judge and the scope-dispatch commits moved lines.

## Ruling

Refactor `@orkestrel/agent` in place. Do not create a `@orkestrel/context` package in this round. Adopt the living-context capability as a goal and build it by consumer, each step inside an existing package, and let a package boundary appear when a consumer outside the loop imports the record and selection layer. That boundary test is the user's own criterion for `tool` and `workspace`, not a sentence in `AGENTS.md`; the law that backs it is the first-consumer gate in `AGENTS.md` § Design laws. The provider engine and relay are the better-justified split by that criterion, and the split stays gated on the conditions named in § Alternatives.

Three readings decide the ruling:

- **Size is prose.** Of the 7,781 lines under `src/core`, 2,915 are code and 4,537 are comments. A package split moves this prose and deletes none of it.
- **The layer the proposal adds has no consumer.** The loop would call a `prepare` step and read a frame; nothing in the fleet calls the assertion, dependency, or reconciliation layer beneath it, and the desk, the one consumer outside the loop, is held for later by the user's instruction. The applicability classes the proposal names (irrelevant, expired, stale, superseded, disputed, incorrect) are derived conditions, which is the derive-state law; the criteria that derive four of them (a relevance verdict, a validity window, an age cutoff, a correctness ruling) are application decisions, which the mechanism law keeps out of framework code, while superseded and disputed follow from recorded revisions and conflicting assertions alone.
- **The structure is already separable without a split.** The record, assembly, scope, and instruction concerns import nothing from the loop, the provider engine, or the jobs layer. A module split inside the package makes the concerns visible in the tree, shrinks the 2,294-line `types.ts` into module-level contracts, and leaves every later extraction a mechanical move along a proven graph.

## How the question was worked

- The ChatGPT transcript was decoded from the share page and read in full; its final recommendation is ruled on proposal by proposal in § The proposal.
- Three Grok 4.7 Extra High lanes on the Cursor bench absorbed the agent source (311 citations, all resolving), every fleet guide's boundary and name claims (360 citations), and the agent tests and guide patterns (489 citations). The Orchestrator read the agent contract, the loop, the context, the conversation layer, the stores, the registry, the provider engine, and the guide's contract clauses first-hand.
- Two Opus planner lanes ran one design brief blind to each other, one subjective and one objective; the Codex bench was dark this session, so Opus held both. Both ruled for the in-place refactor and against the context package. The Orchestrator's pre-lane notes had leaned toward a staged split; the lanes' readings on prose and on the first-consumer gate override that lean.
- A falsification round of nineteen independent refuters attacked the fifteen numbered claims the ruling rests on; § Falsification records the outcome, and every amendment is folded into this record.

## Measurements

The line classifier was a Node TypeScript probe under `tmp/probes/` with a known-answer control: a fixture of 6 code, 5 comment, and 2 blank lines that exits 3 when the classifier disagrees, which passed before the readings were taken. A line is a comment when it opens with `//` or `/*` or sits inside a block comment. The probe counts the empty string after a file's final newline as one line, so its per-file totals run one line high; the figures in the table are corrected, and the code and comment counts are unaffected. An earlier Python reading of the same figures was discarded because `AGENTS.md` § Non-negotiable rules bars a Python probe. The probe was deleted at acceptance, per `.agents/orchestration.md` § Cleanup, after its readings were recorded in this file.

| File | Lines | Code | Comment | Comment share |
| --- | ---: | ---: | ---: | ---: |
| `src/core/types.ts` | 2294 | 476 | 1745 | 76% |
| `src/core/helpers.ts` | 933 | 350 | 552 | 59% |
| `src/core/Agent.ts` | 783 | 447 | 319 | 41% |
| `src/core/factories.ts` | 771 | 173 | 580 | 75% |
| `src/core/conversations/Conversation.ts` | 320 | 190 | 110 | 34% |
| `src/core/AgentProvider.ts` | 317 | 224 | 82 | 26% |
| `src/core/AgentContext.ts` | 263 | 116 | 133 | 50% |
| `src/core/errors.ts` | 261 | 66 | 176 | 67% |
| `src/core/constants.ts` | 153 | 18 | 118 | 77% |
| whole `src/core` (26 files) | 7781 | 2915 | 4537 | 58% |
| `tests/src/core` (23 files) | 13383 | 10834 | 1342 | 10% |

Other readings:

- `guides/agent.md` is 1,568 lines and 306,169 bytes with 37 contract clauses; the next largest fleet guides are `mcp.md` at 6,106 lines and `supervisor.md` at 4,890, while `tool.md` is 507 and `workspace.md` 595 (the scout `map.ts --tree`).
- `tests/src/core/Agent.test.ts` is 4,177 lines with 128 `it` cases in 35 `describe` groups.
- Fixed-string counts over `src/core`: `byte-for-byte` 11, `prior behavior` 5, `as before` 4. `.claude/rules/writing.md` § Code comments bars narrating history, which those phrases do. The prose verb `ensures` appears 5 times (`src/core/types.ts:672`, `src/core/AgentContext.ts:47`, `:107`, `:146`, `:234`), which § Claims and time bars; a fixed-string count of `ensure` reads 10 lines because the method `AgentContext.#ensure` is declared at `src/core/AgentContext.ts:259`, called at `:154` and `:236`, and named in comments at `:150` and `:235`, and a code identifier is exempt.
- Declaration lines by concern, summed from the cited ranges in the Grok source map: record 957, loop 709, assembly 695, provider engine 519, jobs 437, shared 290, scopes 201, relay 190, instructions 189, authority 116.

### The live comparison of 2026-10-08

The agent checkout's `tmp/bench/bench.mjs` ran the Larkspur support-desk scenario on `qwen3.5:2b-q4_K_M` (`think` false, `temperature` 0, `seed` 7, `truncate` false) with Mica as the selection judge; the full reading is `tmp/bench/results/REPORT.md` there and the binding facts are in plan.md § Measurement discipline. Each axis of the Opus grade is out of 20.

| run | context | passed | replied | overflow from | largest prompt | correct | faithful |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| `none` | 6,144 | 7 | 7 | never | 3,922 | 13 | 13 |
| `none` | 3,072 | 3 | 3 | g05 | 2,992 | 8 | 8 |
| compaction, `window` 1,200, no cap | 3,072 | 3 | 5 | g07 | 2,824 | 6 | 4 |
| compaction, no cap, with Mica selection | 3,072 | 3 | 5 | g06 | 2,813 | 9 | 7 |
| Mica selection, `limit` 12, no compaction | 3,072 | 3 | 3 | g05 | 2,901 | 6 | 5 |
| compaction, `sections` 3 | 3,072 | 5 | 8 | never | 2,054 | 11 | 10 |
| compaction, `sections` 3, with Mica selection | 3,072 | 5 | 9 | never | 2,114 | 13 | 9 |

### The tuned rerun of 2026-10-08

After the calibration (the bounded plain state, the lookup criterion, threshold 0.90), the tuned summary, word-wise search, and the judge runner isolated from the agent model, the same 10 goals at 3,072 tokens read as follows; grades are the Opus reader's, each axis out of 20, "strict" scoring a missing `send_reply` as 0 and "answer" counting a correct plain-text answer; substring passes are after the offline rescore with the adjacent-word patterns.

| arm | passed (strict / answer) | largest prompt | correct (strict / answer) | faithful (strict / answer) | judge questions per goal | minutes per goal |
| --- | --- | ---: | --- | --- | ---: | ---: |
| none | 3 / 4 (overflow from g05) | 3,004 | 6 / 8 | 6 / 8 | 0 | 0.1 |
| compaction, generic summary, window 1,600, cap 3 | 3 / 3 | 2,269 | 11 / 11 | 13 / 13 | 0 | 0.6 |
| compaction, tuned summary, window 1,600, cap 3 | 5 / 5 | 2,363 | 14 / 14 | 14 / 14 | 0 | 0.6 |
| selection, 0.90, first run | 3 / 6 | 1,935 | 9 / 15 | 7 / 13 | 48 to 78 | 6 to 12 |
| selection, 0.90, second run | 5 / 7 | 1,939 | 11 / 17 | 10 / 14 | 48 to 77 | 4 to 6 |
| selection, 0.95 | 4 / 7 | 2,769 | 9 / 16 | 7 / 13 | 48 to 81 | 4 to 20 |

Selection holds the prompt flat (1,166 to 1,939 tokens while the view grows from 49 to 79 messages) and reads the record best where it replies, at a judge cost of about 60 questions and 5 minutes per goal on this CPU; compaction answers in seconds and loses identifiers in its summaries; the two 0.90 runs differ by decisions within 0.01 of the cut and by the model's own generation at temperature 0. The reruns on the seam-fixed package (unit 16) and the v3 harness are recorded in the agent checkout under `tmp/bench/results/v4/` when they land.

## What the source says

The source passes the mechanical rule sweep. The Grok source map, read against `AGENTS.md`, `.claude/rules/names.md`, `.claude/rules/architecture.md`, `.claude/rules/patterns.md`, and `.claude/rules/typescript.md`, found no nested function outside an admitted position, no module-scope declaration beside one class in an implementation file, no non-exported declaration in a kind file, no public member of two or more words, no public method forwarding 1:1 to a helper (`RelayProvider.frame` and `finish` forward to an injected parser, not to a module helper), no helper duplicating an installed `@orkestrel/*` export, no `any`, non-null assertion, or `as` beyond two `as const`, no store departing from the Stores rule, no binary switch encoded as a literal union, and no stored flag a sibling field determines.

The defects are of three kinds.

- **Duplicated fragments**, six of them: the usage charge at `src/core/Agent.ts:494-499` and `:525-530`; the partial-result assembly at `src/core/AgentProvider.ts:202-207` and `:211-216`; the rollup regeneration at `src/core/conversations/Conversation.ts:236-237` and `:243-244`; the reader release in `readText` and `readChunks` (`src/core/helpers.ts:833-876`, `:895-932`); the batch `remove` loop at `src/core/conversations/Conversation.ts:160-167`, `src/core/conversations/ConversationManager.ts:152-159`, `src/core/instructions/InstructionManager.ts:115-122`, and `src/core/scopes/ScopeManager.ts:82-89`; and the role literal list in `src/core/validators.ts:27` and `src/core/shapers.ts:38`.
- **The comment load**, measured earlier in this record, which narrates history and alternatives the writing rule bars and repeats the guide.
- **Two seams.** `ProviderInterface.format?: ContextFormat` (`src/core/types.ts:152`) and `ProviderOptions.format` (`:2194`) are the only edges from the provider engine into the assembly concern, and `src/core/AgentProvider.ts:5` is the engine's one assembly import; `Agent.#run` passes the provider's value into `context.build`, and `OllamaOptions.format` exists only to be exposed for the agent to read and is never sent on the wire (`guides/ollama.md:122`, `:289`, `:307`). `ContextFormat` has one key, `instructions` (`src/core/types.ts:502-505`); every slot resolves as the manager option, then the provider default, then the built-in (`src/core/helpers.ts:786-796`), so a caller reproduces any provider-level framing by setting the same slot on `InstructionManagerOptions.format` (`:360-366`), and `InstructionInput.override` (`:312-324`) outranks both; `AgentOptions.instructions` (`:1095`) accepts a pre-built manager. The item override is applied only inside `resolveItem` (`src/core/helpers.ts:585-592`); `InstructionManager.render` (`src/core/instructions/InstructionManager.ts:107-110`) never reads it. A `tool` message carries no call id: `Message` keys a tool turn to its call "by the conversation order" (`src/core/types.ts:19-46`), the loop appends one tool message per call in call order (`src/core/Agent.ts:549-566`) and drops the `id` the `ToolResult` carries, the relay projection sends `{ id, role, content, calls?, images? }` and no call id (`src/core/providers/RelayProvider.ts:89-103`), and the tests pin the positional round trip (`tests/src/core/Agent.test.ts:641-698`), so two parallel calls to one tool are distinguishable by position alone, and any view that reorders, drops, or compacts a tool message loses the join.

The context concerns are already decoupled. The record, assembly, scopes, and instructions concerns import nothing from the loop, the provider engine, or the jobs concern; two TSDoc `{@link import('../AgentContext.js')}` links at `src/core/conversations/ConversationManager.ts:16` and `src/core/instructions/InstructionManager.ts:31` point back at assembly as documentation, not as imports. The reverse edges are `src/core/Agent.ts:3`, `:28`, `:35` (`AgentContextInterface`, `AgentContext`, `estimateTokens`), `src/core/AgentProvider.ts:5` (`ContextFormat`), and `src/core/AgentRegistry.ts:8`, `:17` (`ConversationStoreInterface`, `ConversationManager`).

## What the fleet says

- Runtime consumers of `@orkestrel/agent`, per the catalog in the agent checkout's `.claude/agents/orkestrel.md` (discovery data, stale at agent 0.0.25): `ollama` 0.0.20 and `toolbox` 0.0.16. No catalog row of `browser` or `supervisor` declares agent.
- What the guides show. `ollama`'s source extends `AgentProvider` and imports only the engine and contract types (`guides/ollama.md:12`); its guide fences the relay (`guides/ollama.md:222-253`) and its page proof drives an `Agent` tool loop (`guides/ollama.md:124`). `browser` fences `createAgent` over `createOllama` twice (`guides/browser.md:39`, `:3529`) and never names the relay. `supervisor`'s application code imports agent's `ProviderInterface` under an alias beside its own `ProcessProviderInterface`, and a `MessageInterface` that agent does not declare (`guides/supervisor.md:1940-1943`). `toolbox` imports `createAgentRegistry`, `createMemoryConversationStore`, and `AgentInterface` (`guides/toolbox.md:464`, `:487`, `:539`) and names `ConversationStoreInterface` and `AgentContextInterface` in prose (`:332-334`). Outside `agent.md`, one guide imports `ProviderInterface` from agent (supervisor). The context and conversation symbols outside `agent.md` are `ContextFormat` and `AgentContext` in `ollama.md` (`:91`, `:122`, `:289-307`), the store, manager, and context interfaces in `toolbox.md`, and `ConversationManager` in `workflow.md` as a shape to mirror (`:83`, `:206`, `:1184`), not an import. No fleet guide consumes the conversation or context layer except through an agent, a registry, or the `format` the agent reads.
- No fleet guide claims ranked or full-text search. The database offers `like`, `glob`, `starts`, `ends`, `any`, `none`, secondary indexes, cursors, and per-driver transactions (`guides/database.md:260`, `:278`, `:295`), refuses a raw-SQL escape hatch (`guides/database.md:18`), and admits a native override only as a faster path to a result the portable engine already defines (`guides/database.md:490-502`, `:2209-2219`). Content digests exist in `brief`, `mcp`, and `scaffold`. Token estimation exists only in agent.
- Names a context layer would collide with: `Evidence` is rater's; `SearchOptions` and `SearchMatch` are workspace's; `SelectionManagerInterface` is table's; `*Record` is a suffix across brief, interpret, console, scaffold, and browser; `Frame` names wire records in supervisor, browser, test, workflow, and agent's own `RelayFrame`; `{Entity}Context` is the fixed execution-context form across interpret, mcp, browser, supervisor, guide, contract, and lsp; `Memory*` is the fleet's in-memory store prefix. Bare `Context`, `Frame`, `Memory`, `Assertion`, `Episode`, `Selection`, and `Retrieval` are unclaimed.
- The collision record. `host.json` `surface` records seven agent names with a second owner: `ProviderInterface`, `ProviderOptions`, and `RelayOptions` (supervisor); `ScopeInterface` (mcp); `StreamInterface` (server); `createChannel` and `readText` (test). Every scaffold build (`build:host`, run by `npm run build`) reads the `## Surface` claims of the mirrored guides and throws when a staged name with two or more owners has an owner set the record does not contain (`src/server/helpers.ts:1729-1747`); the record is regenerated from the staged collisions, so it shrinks when a collision closes and never widens (`.claude/rules/names.md` § Fleet name ownership). A split that moves `ProviderInterface` into another guide is therefore refused until supervisor renames its own three declarations; `readText` closes on the moving side, renamed as it leaves agent, because nothing outside `agent.md` imports it.

## Alternatives ruled on

**(a) Refactor inside the package: adopted.** It cuts the prose where it stands, closes the duplication, cuts the one coupling, repairs the record, and makes the concerns visible as modules. Cost: one agent release (0.0.27), then `ollama` (its framing option goes) and `toolbox` (a re-pin), then the scaffold mirrors. No test file leaves the package.

**(b) Split along a boundary other packages already use: gated, not refused.** Two candidates exist. The provider engine and relay pass the user's criterion through one runtime consumer, `ollama`, which extends the engine without the loop, as `mcp` consumes `tool` without the loop; supervisor's application code and the browser fences add no runtime consumer. The split would move 58 exports (14 provider-engine, 5 relay, and 3 shared types; 11 constants; 4 errors and guards; 5 shapes, 4 contracts, 1 validator; 4 helpers, 3 factories, 4 classes), 6 whole test files and parts of 3 (`helpers`, `factories`, `validators`) plus the relay block of `tests/src/core/integration.test.ts:27-250` and the provider fixtures in `tests/setup.ts`; contract clauses 2, 4, 5, and 34-37 leave `agent.md` whole and clauses 3 and 6 split, because each carries a loop sentence. Its order is longer than three rounds: supervisor renames `ProviderInterface`, `ProviderOptions`, and `RelayOptions` and releases, which drags a re-pin of its stale ranges (`contract ^0.0.11`, `database ^0.0.9`, `emitter ^0.0.6`, `workflow ^0.0.12`); a scaffold release then stages the updated supervisor mirror, the provider guide, its catalog row, and a pre-publication `agent.md` that no longer claims the moved names, because the provider package's own policy sweep refuses every export the installed host's `agent.md` still claims (`tests/setupPolicy.ts:2556-2586` grandfathers only a target's own hosted guide), and that staging breaks the byte-identical mirror rule for one round; then provider, agent, `ollama`, `toolbox`, and supervisor's application import re-points. Its benefit, a lighter install for `ollama`, which pulls agent's 10 runtime dependencies today, is unmeasured. The conversation-and-assembly candidate is clean on dependencies but fails the criterion: no package imports it without running the loop. Gates for the provider split: the `framing` unit landed; the collisions closed as described; `ollama`'s install closure measured smaller with the provider package than with agent.

**(c) A `@orkestrel/context` package: refused in this round.** No consumer outside the loop; criteria the mechanism law keeps in the application; the proposal read guides and rules, not code, and checked no name against the fleet. The name is also qualified: `AgentContext` and the `{Entity}Context` form give the word two senses, and `memory` reads as the in-memory store tier.

**(d) An ordered combination: adopted as gates, not as this round's plan.** The admissible order is (a), then the measurements, then the provider split when its gates open, then the context package when a consumer outside the loop imports the record and selection layer.

## The proposal

Each proposal from the ChatGPT conversation, ruled on.

| Proposal | Ruling | Reason |
| --- | --- | --- |
| A `@orkestrel/context` package owning assertions, dependencies, applicability, reconciliation, and frames | Refuse in this round; adopt the goal | No consumer outside the loop; the criteria behind the applicability classes are application decisions; the principle that applicability is derived and never stored is the derive-state law already |
| Awaitable `Conversation.add` for an acknowledged write before inference | Refuse in this round | `.claude/rules/patterns.md` § Managers fixes the batch-verb overloads as synchronous (`void`, `boolean`); the first-consumer gate; `await conversations.save(id)` before `generate` is the acknowledged write, read through its boolean, because `save` returns `false` and never throws without a store or for an unknown id (`src/core/types.ts:2131-2138`); each append carries a minted id |
| `prepare(...)` then `build(frame)` | Refuse the names; adopt the seam | `build()` reads in-memory managers; the one asynchronous producer of context text is the summarizer, reached through `compact`; `frame` is qualified by `RelayFrame`; the seam becomes the `select` step later in this record |
| Database records instead of snapshot blobs | Defer to a consumer | The fleet persists one snapshot row per entity across workspace, workflow, terminal, and agent; `toolbox` persists through the store interface; message-level records are buildable on the portable database surface when a consumer queries messages across conversations; ranked search is not expressible on that surface and enters only as an engine operation designed with its first consumer, or stays out |
| Measure the whole provider request | Adapt | Correct contract clause 24 in the `guide` unit; widen the estimator's input when a measured overflow shows the gap |
| An explicit preparation failure on over-budget | Refuse | An over-window prompt already reaches the provider explicitly after the futile-compaction guard; nothing is dropped silently |
| Incremental, bounded repair | Refuse as written | No derived state exists to repair; the principle survives in `select` and `records` |
| Brief stays the pinned task contract | Adopt | `guides/brief.md` states the boundary |
| A vertical slice as the first deliverable | Refuse as written; keep the matrix | The slice needs the deferred desk; the capability-matrix procedure is `.claude/rules/quality.md` § Evidence before change |
| The decision client as a sibling of the provider | Adopt the boundary; built | Landed as the judge in agent 0.0.27 with the desk as consumer ([refine.md](refine.md) § The judge): `AgentJudge` and `SystemOneJudge` in agent, `OllamaJudge` in ollama; `carve` moves the engine and the wire into the `providers/` module so they travel with a later provider package |

## The plan

The order, acceptance, and status of these units live in [plan.md](plan.md) § Units, which supersedes the table this section carried. That table's rows 7 to 10 named `release 0.0.27` and the ollama, toolbox, and mirror visits against it; the registry serves 0.0.27 as the judge release and 0.0.28 as the scope-dispatch fix, so the release after this refactor is above 0.0.28 and lands after the selection round. Units in one checkout run one after another; units in different checkouts run side by side; `hygiene`, `framing`, `correlate`, `carve`, and `consolidate` keep the acceptance this record's measurements imply, restated in plan.md with the dispatch invariants added.

### The framing ruling and the carve layout

The `framing` deletion is the one design opinion the medium row of `AGENTS.md` § Work loop admits, not a law reading: the one-term law bars a second term for one concept, and `.claude/rules/names.md` requires the wire body to keep the external word `format`, so the homonym can close only on the framing side; the design reason is that a wire provider is the wrong owner of prompt framing, and the manager option and the item override express every rendering the provider level can. One thing is lost: a provider-level default selects framing per provider, while a manager option selects it per manager, so two agents sharing one `InstructionManager` with providers that prefer different framings need two managers after the deletion.

The module layout `carve` produces, with each module's imports:

| Module | Owns | Imports |
| --- | --- | --- |
| root `src/core/*.ts` | `MessageRole`, `Message`, `MessageInput`, the message shape and contract, `isMessage`, `filterAllowList`, `joinThinking` | `contract`, `tool` |
| `providers/` | `ProviderInterface` and its result, delta, and option types, `AgentProvider`, `ThinkSplitter`, the request and result shapes and contracts, the provider errors, `readText`, `readChunks`, `buildProviderResult`, the relay (`createRelay`, `RelayStream`, `RelayProvider`, the relay frame shape and constants) | root, `timeout`, `tool`, `contract` |
| `conversations/` | `MessageManagerInterface`, `Conversation`, `ConversationManager`, `Section`, compaction, snapshots, `ConversationError`, the `stores/` folder, the recap helpers and constants | root, `emitter`, `contract`, `database` |
| `contexts/` | `AgentContext`, `ContextSectionFormat`, the `instructions/` and `scopes/` folders, the workspace render helpers, `intersectKeys`, `WORKSPACE_SECTION_HEADER` | root, `conversations/`, `workspace`, `tool`, `emitter` |
| `agents/` | `Agent`, `Channel`, `Authority`, `AgentRegistry`, the job handlers and factories, `estimateTokens`, `estimateMessages`, the usage and result helpers, `AgentError`, `AgentJobError` | every module, `abort`, `budget`, `timeout`, `queue`, `workflow` |

The `providers/` and `conversations/` folders exist today as entity folders holding class files; `carve` turns each into a module with its own kind files and keeps `stores/`, `instructions/`, and `scopes/` as class-only entity folders inside their modules, per `.claude/rules/architecture.md` § Entity subfolders. The guide scope is a ruling `carve` records, not a default it inherits: `.claude/rules/documentation.md` § Parity scopes a guide to one module directory and admits one guide over several only for a layer concept, and the agent `guides/README.md` mapping of `src/core` and `src/core/providers` to `agent.md` is one module and its entity folder, not a precedent for four modules. The ruling is that the four modules are one layer concept, the conversation runtime, with the scaffold's own `guides/README.md` mapping `src/core`, `src/server`, and `src/bin` to one `scaffold.md` as the fleet precedent, and the barrel's export set does not change, so `npm run test:guides` passes on that layout.

## The living context, staged by consumer

The user's goal stands: a context that stays fresh, brings in what the next action needs, keeps a record to look back on, and marks what is stale, superseded, or wrong. The route to it runs through consumers, each step small enough to prove.

| Step | Where | First consumer | What it adds |
| --- | --- | --- | --- |
| `recall` | `toolbox` | the model | A conversation tool shaped like `createWorkspaceTool` over `ConversationManagerInterface`: `search`, `rehydrate`, `sections`, `summary`, and `reference` already exist on `ConversationInterface` (`src/core/types.ts:1753-1911`), so the model gains on-demand recall of earlier turns with no change to agent. Recall through it is bounded to the case-insensitive substring `search` and whole-section `rehydrate`; its design round says so |
| `select` | agent, `contexts/` | the loop | A selection the application supplies in place of the fixed `view()` inclusion, defaulting to `view()`. The seam is one read, `active.view()` inside `build()` (`src/core/AgentContext.ts:237`); the loop calls `build()` at run entry (`src/core/Agent.ts:362`) and after a compaction (`:665`), and already awaits before the first request when auto-compaction is on (`:395-403`). The design round ran on 2026-10-07: [refine.md](refine.md) § The selection seam keeps `build` synchronous and awaits `select` only when the active scope carries a handler, so the public return type of `build` does not change. Eager retrieval, applicability rules, and a receipt of what was selected plug in at this seam; `prepare` and `frame` are not the names |
| `records` | agent, `conversations/` | a consumer that queries messages across conversations | Message-level records over `@orkestrel/database` beside the snapshot store, with the call id from `correlate` as a column; search through portable conditions; ranked search only as an engine operation designed with its consumer |
| decision client | `providers/` | the desk | Landed as the judge in agent 0.0.27 ([refine.md](refine.md) § The judge); its answers, recorded as judgments with provenance, are the first assertions |
| package | fleet | a consumer outside the loop | When the desk or another consumer imports `conversations/` and `contexts/` without `agents/`, lift them; decide the name then against the fleet record |

What this stages differently from the proposal: the capability grows outward from the record the agent already owns, each step with a consumer; the message-agnostic assertion engine, the awaitable append, and the frame vocabulary are not built ahead of the consumer that would prove them.

## Guide readings to correct

- The scaffold mirror `guides/agent.md` lags the agent checkout by one line: clause 10 at line 988 still says a successful tool result's content is `JSON.stringify(result.value)`, while the checkout's clause and `src/core/Agent.ts:557-565` carry a string unchanged (commit `65c706a`, unreleased), and `tests/src/core/Agent.test.ts:392-406` pins it. The `mirrors` unit refreshes it from the published bytes at release.
- Clause 24 (`guides/agent.md:1002`) defines the measured prompt correctly in its own parenthesis and then says it is "what the next `provider.stream` will receive"; `#trim` consumes the working message array alone (`src/core/Agent.ts:644-645`), and tool definitions and a per-run schema reach the provider unmeasured. The `guide` unit cuts that phrase.
- The fence at `guides/agent.md:371` writes the item override as a `format` key on an `InstructionInput`, while `src/core/types.ts:312-324` declares the member `override` and no `format` key; parity proves the names exist, not that the fence compiles. The `framing` unit fixes the key.
- The tests lane found eleven documented behaviors with no pin, among them `clear` leaving compacted sections untouched (`guides/agent.md:922`), the `reference()` block written into the workspace and folded by `build()` (`:1311`), and a workspace switch moving the prompt and the edit tool together (`:1435`); the relay route answering 405 and 404 (`:1103`, `:1525`) is pinned by the executed round trip in `tests/guides.test.ts:540-548`, which the lane did not read, so the fence-behavior rows are checked against that file before the `guide` unit treats them as unpinned. It found eight pinned behaviors the guide does not document, among them a throwing `authority.evaluate` denying the call (`tests/src/core/Agent.test.ts:2217`, `:2833`), natural-finish usage sanitizing (`:4151`), and a tampered database row resolving `undefined` (`tests/src/core/conversations/stores/DatabaseConversationStore.test.ts:120`). `.claude/rules/documentation.md` § Parity requires an executed assertion behind a prose behavior claim.

## Falsification

Nineteen refuters attacked the fifteen claims the ruling rests on: a source lens on every claim, a law lens added on the four judgment claims (the framing deletion, the context-package refusal, the module split, and the deferrals), and a cost lens on the three fleet-cost claims. Four claims held as written (the concern decoupling, the two guide readings, the retrieval tool over existing members, the selection seam's call sites). One was refuted: the fleet-consumer claim had counted the 18 `ProviderInterface` imports inside `agent.md` as external, placed the relay in the browser guide, and missed the context names in `ollama.md`; § What the fleet says carries the corrected facts, and the ruling stands on one runtime consumer of the engine rather than three. Fourteen were amended, and every amendment is folded into this record: the per-file line counts and the control's kind; the `ensure` count; the override resolution site and the per-provider framing loss; the narrowed first-consumer and policy readings on the context package; the full ordering and the scaffold staging a provider split needs; the guide-scope ruling a module split owes; ranked search as an engine operation rather than a driver override and `save`'s boolean acknowledgement; the relay projection and the dropped result id behind the call-id defect; eleven unpinned behaviors rather than twelve; the split clauses and shared fixtures a provider split would carry; and `select` as a medium public contract change.

## Risks

- `hygiene` deletes a comment that carries an ordering or timing reason the code does not show, such as the pump timing notes at `src/core/Agent.ts:382-394`. The reviewer pass is the control.
- `carve` fails an instrument on a layout the fleet has never run; no checkout under this host carries a `src/core/<module>/types.ts` layout, and the other fleet packages were not read. The branch probe before acceptance is the control.
- Deleting the provider-default framing level loses a configuration a consumer outside the guides relies on. Probe: a fleet-wide search for a framing `format` passed to `createOllama`, `createRelayProvider`, or an `AgentProvider` subclass, and the desk when it returns to scope.
- Two copies of agent load in one application while `ollama` and `toolbox` 0.0.17 pin `^0.0.26` and the registry serves 0.0.28. Probe: `npm ls @orkestrel/agent` in a consuming application.
- The Ollama `/api/chat` tool-message shape was not read, because no ollama checkout sits on this host; the `correlate` unit reads it before deciding what the ollama provider forwards.
- The supervisor guide imports a `MessageInterface` that agent does not declare (`guides/supervisor.md:1941`); its owner settles it.

## Files to read with this record

- [plan.md](plan.md), the order, acceptance, and status of the units, and [refine.md](refine.md) § The judge, which landed the decision client's boundary as the judge
- `src/core/types.ts`, `src/core/Agent.ts`, `src/core/AgentContext.ts`, `src/core/conversations/Conversation.ts` in the agent checkout
- `guides/agent.md` § Contract, `guides/ollama.md` § Context framing, `guides/toolbox.md` in the scaffold checkout
- `host.json` `surface` and `src/server/helpers.ts:1729-1747` in the scaffold checkout
