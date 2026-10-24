# Fleet campaign plan

The fleet's plan as it stood on 2026-10-21: state, rulings in force, packages and layer order, the units each package owes, the scaffold 0.0.105 queue, the standing readings, routing, and the closed campaigns.

- `.orkestrel/ledger.md` holds one row per fleet dispatch or ruling from 2026-10-19 onward. `.orkestrel/agent/plan.md` holds Agent's boost campaign: its rulings, gates, units, sweep guard, runner and engine rules; `.orkestrel/agent/evidence.md` holds the series figures.
- A record named with a commit reads through `git show COMMIT:PATH`; the fleet plan before the 2026-10-21 rewrite is `692e551:.orkestrel/plan.md`. A path under `tmp/` is a gitignored working file; a `tmp/` path that a dated ledger row cites and a sweep removed is a record, which git history and the 2026-10-20 sweep archive `tmp/units/sweep/archive/` keep until the user rules that archive disposable.

## State

| Item | Statement | Record |
| --- | --- | --- |
| Campaign | the fleet campaign of 2026-10-17 is accepted (U12a) and its successors are closed; the Mechanisms campaign (U20) opened and was accepted on 2026-10-23; the Recording campaign (U23, U24) opened on 2026-10-23 and is the instrument U21's resumption needs | `6510cbe`; § History; § Mechanisms campaign; § Recording campaign |
| Live work | the `.orkestrel` consolidation, the scaffold 0.0.105 queue, and the units each package owes at its next visit | Cleanup, user, 2026-10-21 |
| Releases | Scaffold 0.0.104 and Study 0.0.2 are published (2026-10-20); every package of the Agent session takes Scaffold 0.0.104 with no bump | ledger rows "Scaffold 0.0.104 published", "Study 0.0.2 published", "fleet repair onto 0.0.104" |
| Scaffold window | no scaffold window is open on 2026-10-21; each queue item goes into `../scaffold/PARALLEL.md` before its unit runs | `.orkestrel/agent/plan.md` § Standing rules, Scaffold |

## Rulings in force

| Id | Date | By | Clause |
| --- | --- | --- | --- |
| Node | 2026-10-20, 2026-10-23 | user | packages support the Node 22 and 24 LTS lines only; 22 is the floor because Claude Code cloud defaults to it. 2026-10-23: "Do not use any other node versions, 22.18.* is the lowest and node 24.*.* is the highest" — no Node below 22.18 or above the 24 line anywhere: CI matrices, local runs and tools (Node 26 is retired as a local tool runtime, and `tmp/runtimes/node-v26.12.0-win-x64` is not used); `@types/node` belongs within the 24 line. The user, the same day: "I really don't care for GitHub CI, I actually want to rip that out" — GitHub CI is not maintained or gated on; the versions bind `engines`, `@types/node` and every local run. Sweep ruled: every package of this session moves `engines.node` to `>=22.18.0` and `@types/node` to the 24 line now, no bumps (Study after its Recording campaign units; scaffold stays with its own session) |
| Node floor gate | 2026-10-20 | user | every release also gates on Node 22.18.0, the declared floor, from the portable runtime under `tmp/runtimes/`; each package raises `engines.node` to `>=22.18.0` at its next release (F-floor) |
| Let sweep | 2026-10-19 | user | finish the `let` sweep per package visit, each with a census and a review; the Bindings lint rule lands in scaffold after the last visit |
| Rewording | 2026-10-20 | user | "Rule + sweep at visits": each package rewords its guide and source comments against `writing.md` § Substitutions at its next release visit (F-wording); identifiers stay |
| BR-2 | 2026-10-20 | user | the brand guard covers every public error class; a policy check follows after the fleet conforms |
| Visit split | 2026-10-20 | user | the Agent session repairs its own packages to each scaffold release and regenerates a lock on `ERESOLVE` within unchanged ranges; the Veneer session takes test, veneer, form, table, guide, html and workspace |
| Worktrees | 2026-10-20 | user | use a worktree only to parallelize writers; merge it back to `main`, remove and prune it, and delete its branch |
| Dependencies | by 2026-10-16 | user | needed `@orkestrel/*` dependencies are authorized without another request, each at its highest published version; a non-Orkestrel addition still needs explicit authorization |
| Engines | by 2026-10-16 | user | the final Fable allowance is consumed, so never invoke it without further permission; Opus 5.5 stays authorized for subjective and skeptical work; no parallel GPU work |
| Cleanup | 2026-10-21 | user | consolidate `.orkestrel`, absorb the root `ANALYSIS.md`, `BOOSTS.md`, `PROPOSAL.md` and `RESULTS.md`, and retire the legacy harness under `.orkestrel/agent`; the full clause is in `.orkestrel/agent/plan.md` § Rulings in force |
| Mechanisms | 2026-10-23 | user | build the four promotable mechanisms of `.orkestrel/agent/boosts.md` § Promotion requirements into Study, process and Ollama (U20 in `.orkestrel/agent/plan.md`); § Mechanisms campaign holds the goal and the exit criterion |
| No native | 2026-10-23 | user | U22 in `.orkestrel/agent/plan.md`: no native component in the Mechanisms campaign; process custody (P1 to P5) is waived and process is not released; native-only D clauses fall back to pure-Node detection |
| Harness | 2026-10-21 | user, Cleanup | the retirement order of 2026-10-20 is void; the legacy harness, its tools and its records left the tree in the Cleanup change, readable at `692e551`; the endurance sources live at `studies/endurance/sources/`; the Ledger golden promotion is an Agent unit (`.orkestrel/agent/plan.md` § Units) |

## Mechanisms campaign

Opened on 2026-10-23 under U20. It is a large change under `../scaffold/AGENTS.md` § Work loop (work across packages), run once through each phase of `../scaffold/.agents/orchestration.md` § Campaign.

| Item | Statement |
| --- | --- |
| Goal | build the four mechanisms the retired ladder bench proved as package capabilities, each with a first real consumer: retained process-tree custody in `@orkestrel/process`, a dedicated daemon session in a server environment of `@orkestrel/ollama`, and the materialized artifact closure and the bounded exchange recording and replay in `@orkestrel/study` |
| Exit criterion | each mechanism meets its numbered requirements in `.orkestrel/agent/boosts.md` § Promotion requirements (M1 to M4, E1 to E7, P1 to P5, D1 to D4) on its owner package's `main`, or the user waives a named requirement; each requirement is proved by a witness test in the owner package, ported or rewritten from `.orkestrel/agent/instruments/ladder-witnesses/`; every test passes on Node 22.18.0 and Node 24 on Windows, and a host the design does not support refuses the capability rather than weakening it (P5); each capability ships with its first real consumer in the same campaign; one falsify round confirms the integrated result; the tree-wide gates of every changed package are green; and each changed package is release-ready, with publication the user's decision |
| Packages and order | process (custody) first, then Ollama (the daemon session, composing custody), then Study (the closure, and the exchange recording and replay, consuming the daemon session); Agent's studies change only as a consumer the design names |
| Phases | absorb (2026-10-23: the Grok lane `mech-absorb-witnesses`, and the Sonnet lanes `mech-absorb-process`, `mech-absorb-study`, `mech-absorb-ollama` and `mech-absorb-research`), then one blind design round (planner and analyst), implement, integrate, audit, verify, re-baseline and accept |
| Waivers | U22 (user, 2026-10-23): no native component; P1 to P5 are waived, process stays at 0.0.15 and the daemon session composes its published tree stop; named at the reconciliation (MR-2): D1's refusal of executable replacement through use becomes detection by the executable digest before start and after stop, and D3's refusal to adopt an unrelated owner becomes detection by the owned child's own listen announcement, its liveness at each readiness reply and the refusal of an occupied port; an abrupt host death can leave the daemon's runner processes alive |
| Known gaps | the bench met P1 to P5 only on Windows x64 under Node 26.12.0 through `node:ffi`, which the Node ruling keeps out of packages, and U22 rules out every native route, so custody is not built; the native kernel sources were deleted with the bench, and their design survives in the W5 records under `.orkestrel/agent/instruments/ladder-records/` |
| Successor | U21 (user, 2026-10-23): when this campaign is accepted, Agent's boost campaign resumes on its unrun ideas with these mechanisms as the instrument: the Records probes R1 (moving tail with opening pins), R2 (earlier replies as work items), R4a and R4b (obligation rendering and the obligation question), R5a, R5b and R5c (superseded rendering, scoped correction pairs and the correction question), the R-Q5 excerpt diagnosis and the R-Q7 fresh-lookup diagnosis, and the Compaction screen G3 (S5 at `ev-05-1` with Q3a, the self-describing lookup, then Q1, pinned standing context); `.orkestrel/agent/plan.md` § Rulings in force holds the clause; the design gives Agent's memory study the replay and daemon session it needs as a first consumer where the law allows |
| State (2026-10-23) | accepted: every exit clause met; `@orkestrel/ollama@0.0.25` and `@orkestrel/study@0.0.3` published and registry-confirmed (the user's windows), Agent re-pinned to them with no bump; P1 to P5 waived under U22; the successor U21 is due |
| Records | briefs and reports under `tmp/units/` with the `mech-` prefix and the maps under `tmp/units/mech/`; one row per dispatch in `.orkestrel/ledger.md` § Mechanisms campaign |

### Reconciled design

The Orchestrator reconciled the planner design (Opus, `tmp/units/mech-design-planner.md`) and the analyst design (Astra, `tmp/units/mech-design-analyst.md`) on 2026-10-23 under U22. Both recommended a native custody route (`koffi`, and a prebuilt C# helper), which U22 removes.

| Id | Ruling |
| --- | --- |
| MR-1 | no custody mechanism: `@orkestrel/process` stays at 0.0.15 with no change and no release, and the daemon session composes its published `createSession` and tree stop |
| MR-2 | `OllamaDaemon` at a new `@orkestrel/ollama/server` entry (`src/server/OllamaDaemon.ts`, kind files beside it), with `OllamaError` in the brand form from its first release; lifecycle: validate the declaration (absolute executable path, SHA-256 digest, expected version, a dedicated loopback URL that is never port 11434, the declared models with digests), refuse an occupied port, spawn `serve` through a process session with `OLLAMA_HOST` (and an optional `OLLAMA_MODELS`) set by case-folded name, wake readiness on the child's own stderr and require the child's listen announcement and a version reply while it lives, verify the version and every declared model digest, then use; `unload()` sends `keep_alive: 0` for the declared models only and keeps the request and response bytes; `stop()` tree-stops and joins, then re-hashes the executable; the U22 detection forms replace the native lock and the socket-owner check |
| MR-3 | the Study closure takes the planner's shape (`ArtifactLoader.materialize(destination)` with an `assets` option, a `study freeze` verb that publishes `closure.json` only after a captured check in a fresh child, and `execute --closure`) and the analyst's layout rules (duplicate package copies and nested `node_modules` keep their physical forest, a cross-volume closure refuses, the aggregate stays inside the artifact limits) |
| MR-4 | the exchange mechanism declares steps with a named discriminant `admission` (`exact` or `capture`), retains raw request and response bytes with digests and ordered identities whenever recording is declared, meters metadata apart from the model quota, adds the version route, and seals each trial's exchanges in a per-trial sidecar file joined to the evidence by ordinal (the planner's ruling; evidence rows would spend the bounds grading reads); `StudyOllamaReplay` implements the S-T collaborator, answers an explicitly declared prefix from the recorded bytes, refuses the first changed request inside it, and continues live after it (the analyst's ruling, the instrument U21 needs); an offline replay never starts a daemon |
| MR-5 | the daemon's first consumer is Study's execution: it starts the daemon a profile declares (`StudyProvider.daemon`), unloads the declared models before each trial, records maintenance bytes as evidence, and stops and joins after the series or on failure |
| MR-6 | the exchange recording and replay's first consumer is Agent's memory study: capture on the records arm, offline replay in a fresh process, and an added `studies/memory/profiles/q4-daemon.json`; `q4.json` stays unchanged |
| MR-7 | S-T merged: Study `main` fast-forwarded from `1f33206` to `st-collaborator` `2ad4fb2` on 2026-10-23, an identical tree to the reviewed and verified tip; RV-7's release condition (behind the Records L1 work U19 cancelled) is replaced by this campaign's acceptance |
| MR-8 | package commits stay on each package's local `main` until acceptance, where the user sees them; Agent's records push at milestones |

### Units

Codex engines per the user's routing: Astra writes contracts and audits, Sol builds closed shapes, Luna runs gates and live windows; Opus writes guide voice. A medium unit's review is folded into the one falsify round; the Orchestrator reads each contract diff before its implementation units start.

| Wave | Unit | Package | Objective | Role, engine | Depends |
| --- | --- | --- | --- | --- | --- |
| 1 | `mech-o-env` | Ollama | the server environment: the `scaffold audit` reading, the configuration `scaffold repair` plans, the `./server` export, the process and emitter dependencies, the guide module lists | builder, Sol | — |
| 1 | `mech-s-types` | Study | the closure, exchange, replay, record and daemon-declaration contracts with TSDoc | opus role, Astra | MR-7 |
| 2 | `mech-o-types` | Ollama | the daemon contracts, `OllamaError`, constants | opus role, Astra | `mech-o-env` |
| 3 | `mech-o-daemon` | Ollama | `OllamaDaemon`, helpers, validators, factory, a CPU fake daemon, hermetic tests, the written live test | builder, Sol | `mech-o-types` |
| 3 | `mech-s-closure` | Study | materialize, assets, the credential table, `freeze`, `execute --closure`, tests | builder, Sol | `mech-s-types` |
| 3 | `mech-s-transport` | Study | step admission, recording, the metadata budget, the version route, malformed-terminal controls | builder, Sol | `mech-s-types` |
| 3 | `mech-s-seal` | Study | the sidecar sink, the strict reader, the seal join, `StudyOllamaReplay` with the declared prefix, `execute --replay` | builder, Sol | `mech-s-types` |
| 4 | `mech-o-live` | Ollama | one live window: real `ollama serve` 0.40.8 on a dedicated port, start, verify, unload, stop; port 11434 untouched; no other GPU work | verifier, Luna | `mech-o-daemon` |
| 4 | `mech-s-staging` | Study | the daemon consumer under a local Ollama pin | builder, Sol | `mech-o-daemon`, `mech-s-closure`, `mech-s-seal` |
| 5 | `mech-a-consumer` | Agent | the memory study capture and replay consumer and `q4-daemon.json` under local Study and Ollama pins | builder, Sol | `mech-s-staging`, `mech-s-transport` |
| 5 | `mech-o-guide`, `mech-s-guide` | Ollama, Study | the guide sections, README, parity | opus, Opus | their code units |
| 6 | `mech-o-release`, `mech-s-release` | Ollama, Study | the owed release units (F-floor, F-dist, F-wording, F-census, F-errors where owed, Study's residue and sweep report), bumps to Ollama 0.0.25 and Study 0.0.3 | builder, Sol; verifier, Luna | wave 5 |
| 7 | `mech-falsify` | all | one falsify round on the integrated result, two blind lanes | analyst, Astra; reviewer, Opus; checker, Luna | wave 6 |
| 7 | `mech-verify` | all | the tree-wide gates once per changed package on Node 24 and the portable 22.18.0 | verifier, Luna | `mech-falsify` |

Writers: at most three in one checkout under the parallel protocol (Study in wave 3), with one runner lane for every process once more than two lanes run at once. Publication order after acceptance, the user's decision: Ollama 0.0.25 (its process range stays `^0.0.15`), then Study 0.0.3, then Agent's development re-pins with no bump.

## Recording campaign

Opened on 2026-10-23 under U23 and U24 (`.orkestrel/agent/plan.md` § Rulings in force). It is a large change under `../scaffold/AGENTS.md` § Work loop (Study and Agent's consumer), run through each phase of `../scaffold/.agents/orchestration.md` § Campaign.

| Item | Statement |
| --- | --- |
| Goal | give Study open recording, attributable replay and continuation, and give Agent's memory study the consumer wiring and the default-off treatment switches, so the boost campaign can record bounded live runs on the dedicated daemon, extend a sealed recording by its next eight-goal segment without regenerating it, and replay a recording with one treatment on to find where it first changes a request |
| Exit criterion | Study 0.0.4 registry-confirmed with open recording, attributable open replay, continuation and the `runtime` and `content` identities; Agent on `@orkestrel/study` `^0.0.4` with the witnesses AO1, AC1, AP1, AD1, AD2 and AS1 green in `test:studies`; one falsify round confirmed; tree-wide gates green in both checkouts; no Agent release (U23) |
| Phases | absorb (the u21 plan `tmp/units/u21-design.md` and the static census, `.orkestrel/agent/boosts.md` § U21 static census), one blind design round (planner Opus, `tmp/units/rec-design-planner.md`; analyst Astra, `tmp/units/rec-design-analyst.md`; the Sonnet comparison `tmp/units/rec-design-diff.json`), implement, integrate, falsify, verify, release, accept |
| State (2026-10-23) | design reconciled; S1 accepted (Study `9260c5a`, local); S2 built (Study `267da00`, local); S3 built (Study `f559ac4`, local); Study's Node types `fa29162`; V1 green on Node 24 and the 22.18.0 floor; Study pinned into Agent (uncommitted); A1 built (Agent `0d6b3a92`) and A2 built (Agent `8a926460`), both held from push until Study 0.0.4 is on the registry; F1 ruled (claims 1 to 22 confirmed; 23, 24, 25 and F1 to F3 to fix); fix units in their pre-dispatch check |
| Records | briefs and reports under `tmp/units/` with the `rec-` prefix; one row per dispatch in `.orkestrel/agent/ledger.md` |

### Reconciled design

The Orchestrator took the planner design as the base, because it closes each gap with fewer public surfaces, and grafted the analyst's points that close a hole the planner left open.

| Id | Ruling |
| --- | --- |
| RC-1 | rejected from the analyst design: the `record.open` flag, segment and goal rows, the handoff IPC operation, the `StudyRecording` engine class, the `StudyReplayDifference` failure type, the `--seal`, `--prefix` and `--limit` continuation flags, and the Agent service test project; each adds a public surface the planner's shape does without |
| RC-2 | open form: `StudyRecord` becomes `{ bytes, calls, duration }`, and a profile without `settings.procedure` records open; the declared form stays, because `../scaffold/AGENTS.md` § Minimal public API removes a symbol only when its capability must not exist |
| RC-3 | one declaration: the parent composes it once (`buildStudyExchangeDeclaration`), the sink exposes it, and the transport drops `version` and `procedure`; the row carries `goals` and a `configuration` digest; no roles map, since role policy stays the consumer's `roles` option and the body keeps model and options byte for byte |
| RC-4 | exactness at the replay boundary: the attempt row is written before the replay compares, so a diverging body is kept with its failure row and a reason naming ordinal, step, goal, role, member and offset; `StudyOllamaReplay` serves the recorded cursor and drops `procedure`; `scanStudyDivergence` (Study) and `readStudyMemoryDifferential` (Agent) read the first divergence, and the differential's `selection` comparison reports a changed Ledger plan even when requests are equal. Analyst graft: RP2 adds a same-length substitution that stops at its exact ordinal and offset with zero sends |
| RC-5 | identity: `StudyIdentity` gains location-independent `runtime` and `content` digests, because 0.0.3's path-bound digests make a second closure unreplayable (`../study/src/server/processes/StudyArtifactLoader.ts:74-80`). Replay requires an equal `runtime`, admits a different `content` and retains both; continuation requires both equal. This was the planner's one user decision; the Orchestrator ruled it, because the cheap check U23 asks for replays one baseline with a default-off prototype on, and an equal-`content` rule would cost a fresh GPU recording per prototype |
| RC-6 | continuation: `study execute --extend <result>`; the parent derives an `offline: false` prefix that stops before the ancestor's postflight; the daemon starts and unloads before the replayed prefix, with no handoff operation; the descendant's sidecar is a complete flat history linked to its immediate ancestor. Analyst grafts: the ancestor's seal enters the checked execution fingerprint, `--extend` passes through `check` and the launcher as `--replay` does, an interrupted ancestor is ineligible, trial order and driver must match, and the `configuration` digest leaves out the resource ceilings (`record`, `bounds`) so a later segment may raise them |
| RC-7 | bounds: `record.calls` counts every execution exchange the sidecar keeps, replayed ones included; `record.duration` sums send-to-settlement milliseconds, so a replayed prefix costs almost nothing and the live suffix is the charge; the transport enforces both. U24's 30 model minutes map to `record.duration` and its 40 elapsed minutes to `bounds.series.duration`, per recording from what is left; no cap rises automatically |
| RC-8 | treatments: `StudyMemoryOptions.ledger` typed `Pick<LedgerOptions, 'link' \| 'lexical'>`, refused on an arm that builds no Ledger (only the records arm does, `studies/memory/StudyMemorySession.ts:188`); each later prototype adds its key with a positive control |
| RC-9 | proofs: the planner's witnesses O1 to O6, RP1 to RP4 and CT1 to CT3 in Study, and AO1, AC1, AP1, AD1, AD2 and AS1 in Agent. Analyst graft: AC1 also asserts the replayed goals' products equal the ancestor's. Every real recording is replayed offline right after its seal (CPU) |
| RC-10 | release: Study 0.0.4 does not read 0.0.3 recordings or closures, and none is an ancestor; Agent re-pins `^0.0.4` with no Agent release; Ollama and process do not change |

### Units

Codex engines per the user's routing. Study's units run serially, because they share files.

| Unit | Package | Objective | Role, engine | Depends |
| --- | --- | --- | --- | --- |
| `rec-open` (S1) | Study | open recording: the declaration, admission, bounds, rows, reader and seal join; O1 to O6; the append-time reading at the planner's 3 MB load | builder, Sol | — |
| `rec-replay` (S2) | Study | replay of an open recording, exactness at the boundary, `scanStudyDivergence`, the identities; RP1 to RP4 | builder, Sol | S1 |
| `rec-extend` (S3) | Study | `--extend`, its checks and the handover; CT1 to CT3 | builder, Sol | S2 |
| `rec-verify-study` (V1) | Study | tree gates | verifier, Luna | S3 |
| `rec-consumer` (A1) | Agent | the memory study's recording and continuation wiring under a local Study pin; AO1, AC1, AP1, each on the records arm and on the compaction arm with a fold, because the Compaction lineage records and extends on that arm | builder, Sol | V1 |
| `rec-differential` (A2) | Agent | the treatment switches and the differential reader; AD1, AD2, AS1 | builder, Sol | A1 |
| `rec-falsify` (F1) | both | one falsify round: E1 to E7 as the planner's § 1.4 marks them, each witness, RC-5 | analyst, Astra; reviewer, Opus | A2 |
| `rec-verify` (V2) | both | tree gates, Agent's `test:studies` included | verifier, Luna | F1 and its fixes |
| `rec-release` | both | Study 0.0.4 in the user's window; Agent's pin restored and `^0.0.4` installed | Orchestrator, user | V2 |
| `rec-declarations` (A3) | Agent | the R packet (`.orkestrel/agent/boosts.md` § U21 prototypes, PR-1: `ev-01-1` and shift 2, then shift 14 by continuation) and the Compaction lineage (u21 § 2) declarations and scenarios; machine-specific profiles untracked under `tmp/units/rec-profiles/` | builder, Sol | `rec-release` |

GPU work starts after A3, Orchestrator-owned and serial, under U24's reservation.

## Packages and layer order

Layers are the catalog's (`.claude/agents/orkestrel.md:49-98`). Each repair row is a Scaffold 0.0.104 repair, pushed with no bump, on 2026-10-20.

| Package | Layer | Version | Head on 2026-10-21 | State |
| --- | --- | --- | --- | --- |
| `@orkestrel/budget` | L1 | 0.0.14 | `b247889` | repair |
| `@orkestrel/terminal` | L3 | 0.0.20 | `2ba9eda` | repair |
| `@orkestrel/scaffold` | L3 | 0.0.104 | `408a9924d` | every package's development dependency; stages on its own; `PARALLEL.md` stays untracked and shared |
| `@orkestrel/workflow` | L4 | 0.0.23 | `8d97346` | repair |
| `@orkestrel/mcp` | L4 | 0.0.39 | `ac11c79` | repair |
| `@orkestrel/middleware` | L4 | 0.0.25 | `5d40c0c` | repair |
| `@orkestrel/agent` | L5 | 0.0.31 | `692e551` | Study `^0.0.2` (`1153752`) and Scaffold `^0.0.104` (`5104fef`) as development dependencies |
| `@orkestrel/browser` | L5 | 0.0.29 | `78ad754` | repair |
| `@orkestrel/probe` | L5 | 0.0.24 | `4c5658f` | repair |
| `@orkestrel/ollama` | L6 | 0.0.24 | `3582325` | repair; O1 reuses the harness's `DistributionResolution` (`bdbc036`) |
| `@orkestrel/toolbox` | L6 | 0.0.20 | `c7e5e56` | repair |
| `@orkestrel/study` | L7 | 0.0.2 | `1f33206` | consumes Agent, Ollama and budget; S-T waits on branch `st-collaborator` (`.orkestrel/agent/plan.md` § Units) |
| test, veneer, form, table, guide, html, workspace | — | — | — | the Veneer session's (visit split); guide 0.0.25 and test 0.0.29 are published (2026-10-21) |
| supervisor | L5 | — | — | its unpublished 0.0.2 has stale ranges and no `dist/` (2026-10-19); `catalog --all` reads its registry 404; F-supervisor |
| tactica | — | — | — | on `rewrite/orkestrel`, 149 commits ahead of `origin/main` (2026-10-19) |
| desk, taverna | — | — | — | fail on agent 0.0.31 and pin `^0.0.30`; BR-5 |
| agent-phase | — | — | — | a retained proof tree that waits on the user's budget ruling D6 (`.orkestrel/agent/plan.md` § Open questions) |

## Units each package owes

| Unit | Package | Scope | Condition |
| --- | --- | --- | --- |
| F-dist | every package | delete an unmodified template copy of the distribution proof so `repair` restores the thin proof; a customized copy keeps its cases, moves its helpers to `tests/setupServer.ts` and imports the harness case table; Agent's `tests/distribution.test.ts` still stages at module load; Study keeps its C1 driver and folds C3 and C23 into the harness rows | next release; check the `tmp/probes` importers before moving an export |
| F-floor | every package whose `engines.node` is under 22.18.0 or whose CI runs another line | `engines.node` `>=22.18.0` and `@types/node` within the 24 line (Node ruling of 2026-10-23; CI is not maintained); sea keeps `>=24.8.0` for its build API; Agent's engines done in `f2a67063`; the fleet scan of 2026-10-23 found engines below 22.18.0 in budget, terminal, workflow, mcp, middleware, browser, probe, toolbox, process, contract, tool, abort and emitter, and `@types/node` ^26 everywhere | the `node-sweep` unit (2026-10-23) |
| F-errors | every package with a public error guard | the brand form under `../scaffold/.claude/rules/typescript.md` § Errors and outcomes, which `BudgetError` holds as a `Symbol.for` brand from budget 0.0.14 (`53f3b46`): Agent's six classes; budget and contract drop `name`; contract validates `context`; lsp, probe and process validate `context` and `result` and take the identity stamp; server's `isHTTPError` and middleware's `MultipartError` guard owe a full rewrite | next release |
| F-wording | every package | reword the guide and source comments against the judged rows of `writing.md` § Substitutions; the hosted guides held 220 hits in 44 guides on 2026-10-20 | next release visit |
| F-census | each `let` visit | run the census on `bindings.md` and judge with `equivalence.md`; expect count-only recorder candidates in packages already swept | each visit |
| Development re-pins | every package of the Agent session | guide `^0.0.25` and test `^0.0.29` with no bump: install with `npm_config_prefer_online=true`, sweep the self-pins, rebuild, and bump only where `compare.ts` exits 3; test 0.0.29 adds `SEGMENTED_INPUT_TYPES`, `FOCUS_SEGMENT_LIMIT` and `supportsSegmentedFocus` to its claimed names | next visit |
| F-supervisor | supervisor | fix 146 `policy/no-malformed-summary` and 2 banned-term lint diagnostics, and 21 `test:policy` surface collisions where setup exports carry names test claims; reuse `@orkestrel/test` where it owns the name | supervisor's visit |
| BR-5 | desk, taverna | migrate to agent 0.0.31 (`AgentOptions.window` is `BudgetInterface<ProviderRequest>`), moving Agent and Ollama together, because a consumer that moves Ollama alone nests a second Agent copy and an `instanceof` guard such as `ProviderAbortError` misses across the copies | outside the Agent session's round |
| Package documents | agent, ollama, toolbox | agent 0.0.31's README `guides/` links are dead in the tarball and its `prepublishOnly` runs `test:studies`, inert under `--ignore-scripts`; Ollama's README and TSDoc import the development dependency `@orkestrel/abort`; toolbox's TSDoc examples import `@src/core` and `@src/server` | next release |
| Endurance preflight test | agent | promote `tmp/units/endurance-preflight.ts` and `tmp/units/endurance-preflight-test.ts` into a test under `tests/` that regenerates the six negative controls, the former-profile refusal and the room-profile admission in a scratch directory, never over the custody-pinned `tmp/units/endurance-preflight-*.json` files | before either source is deleted; the sweep archive keeps the per-case outputs |
| Residue tests | agent, study | settle malformed-summary-usage and actual-refusal-row by rule R (the summary-role case in Study, a mutation, the Agent row dropped), and drop the self-pinning assertions (`tmp/units/realign/studies.md:175`) | when no series process is live |
| Seams bind | agent | tests that bind the post-generate `transport.check()` and the request-timeout wiring of `studies/memory/StudyMemorySession.ts`, each proved red by a transient mutation | after residue tests; no staging beside it |
| Performance gates | study | closed 2026-10-23: the keep condition was the ladder, retired under U19; no test written and the script `tmp/units/compaction-output-2-perf-gates.ts` deleted (`mech-s-release`) | — |
| Study sweep | study | the sweep deferred on 2026-10-20: 228 roots, three dirty worktrees to snapshot, eight worktrees' ignored `tmp/` files to copy, and the old worktrees under `../study/tmp/worktrees/` (14 on 2026-10-21), where `compaction-output` at `422d549` is the Study build the sealed `compaction-output-2` series captured | at Study's release visit (`.orkestrel/agent/plan.md` § Rulings in force, Decisions); remove a worktree only when no series reads it, it is clean and its HEAD is merged |
| Tool call identity | tool | `ToolContext` carries only `signal` and an unverified `caller` (`node_modules/@orkestrel/tool/dist/src/core/index.d.ts:164-170`), so a tool's `execute` cannot learn its `ToolCall.id`; Agent's memory study joins a lookup's evidence to its tool-result message through the arguments object's identity across the agent's `tool` event (W12-3, 2026-10-22), an observed behavior rather than a contract; add the call id to `ToolContext` so a consumer joins by contract | tool's next visit; Agent's study then reads the id and drops the identity join |
| Browser scratch path | browser | `../browser/tests/service/document.test.ts:101-104` writes `tmp/codex/reading-joining-source.json` with no `mkdirSync`, so the service run fails with `ENOENT` in a fresh clone; create the directory recursively or write into a scratch path | next visit; browser's `tmp/codex/` directory stays until it lands |
| Review kit | scaffold | carry one generalized pre-publish review kit into `orkestrel-publish` through `PARALLEL.md`, or discard the 28 kit files under `tmp/units/release/`; their keep condition ended when Study 0.0.2 published | the Orchestrator's ruling |

## Scaffold 0.0.105 queue

| Item | Source | Clause |
| --- | --- | --- |
| L1, L2, L5, L7 | `tmp/units/scaffold-0104/plan.md` § 1.2 | the window refusals, the `--digest` comparison, the resume ranges and the swap fresh baseline |
| `@types/node` | the Node ruling of 2026-10-23 | done on scaffold `main` (`ce5393a26`, 2026-10-23, after 0.0.105): ^24.19.2; ships with scaffold's next release |
| BR-2 instrument | same; BR-2 ruling | a policy check after the fleet conforms to the brand rule |
| Alias lint | same | the alias lint over `app/*` |
| Bindings lint rule | Let sweep ruling | lands after the last `let` visit |
| Sass 1.106.0 | Veneer session, 2026-10-20 | 1.106.0 refuses empty attribute-selector values and unquotes identifier-like ones, and a visit's `pin` step and `STYLES_DEV_DEPENDENCIES` `^1.105.1` admit it; hold or exclude 1.106.x for styles targets until Sass fixes it |
| Vendored test wording | Veneer session, 2026-10-20 | two cross-reference hits and one temporal hit of `writing.md` § Substitutions in vendored tests surface in every target's release pass: `tests/policy.test.ts:799`, `tests/policy.test.ts:852` and `tests/setupPolicy.ts:351` |
| Discovery census | W7 build, 2026-10-21 | the dispatch skill's discovery census lists every Vitest project even with `--projects`, so in Agent it imported `tests/distribution.test.ts`, which packs and installs at module load; restrict the census to the named projects (`tmp/units/ladder/build-w7/report.md`) |
| Dispatch pointer | Agent `.agents/skills/`, 2026-10-21 | Agent's `.agents/skills/` and `.claude/skills/` carry pointers for seven skills and none for `orkestrel-dispatch`; the next `scaffold repair` or 0.0.105 adds that pointer |
| Spawning-proof project | Mechanisms campaign, 2026-10-23 | the project matrix (`../scaffold/.claude/rules/workspace.md` lines 170 to 218) has no isolated project for hermetic proofs that spawn a package's own server code: `service` needs a live service at module load, `studies` drives installed consumers, `distribution` packs; `@orkestrel/process`, Supervisor and now Ollama's daemon session retain such suites in `src:server` under `../scaffold/.claude/rules/tests.md` line 183 with contended budgets (ruling mech-o-daemon-R1); give the matrix a slot, or state the shared-project allowance where `workspace.md` line 235 sends every spawning project out of the default run |
| Probe item I | Veneer session | the type-proof instrument resolves the wrong root; it sits in the probe package's queue, not scaffold's |

## Standing readings

| Topic | Reading | Source |
| --- | --- | --- |
| Browser on Windows | browser's release-mode distribution fails host-bound cases on Windows (no `/proc`, no FIFO; WSL and Docker absent); ship browser through default-mode distribution plus `test:service`, with the skips recorded | browser `e887416`, `82abd60` |
| Playwright cache | `@orkestrel/test` 0.0.27 locks Playwright 1.64.1, which needs Chromium headless-shell revision 1248; the default cache holds `chromium-1248`, `chromium_headless_shell-1248` and `ffmpeg-1013` (2026-10-19), so gates run without `PLAYWRIGHT_BROWSERS_PATH` | ledger row "Playwright install" |
| Node 24.22.0 signals | `AbortSignal.any` validates its private brand before a proxy trap, so a test premised on a proxied signal's trap is stale (Node 24.11.0 passes it); budget's D1 note and mutant M3 are Node 24.21.0 observations | workflow `b819672` |
| Vite 8.3.4 frames | a private-method frame reads `#commit`, not `Pool.#commit`; assert the frame without its class prefix and keep the negative control | browser `82abd60` |
| Load-sensitive gates | under concurrent Codex load the `npm test` chains of scaffold, probe, browser and Study timed out and passed on a quiet serial run; run release gates serially on a quiet host, rerun a timed-out gate one time before treating it as a failure; the serial runner's form is `../scaffold/AGENTS.md:48` | ledger rows "quiet run results", "deviation recorded" |
| Study CLI durations | in the W5 gates of 2026-10-19 `../study/tests/src/bin/main.test.ts` took 63 s, `StudyLauncher.test.ts` 62 s (its default-deadline case waits 60 s by design) and the adapter integration 42 s; run Study's gates quiet and serial | ledger row "W5 prepared" |
| Proved bytes | `window.ts --publish` uploads the working tree with `--ignore-scripts`; before the upload restore the pins, `npm pack` the clean tree and compare its SHA-256 with the proved artifact | ledger row "agent W3 pre-window" |
| Fresh worktree pin | a first `swap.js --pin` into a fresh worktree exited 1 after 24410 ms, reporting the other Orkestrel packages as added by the install (W3 proof, 2026-10-19); read its problems and rerun one time when they name only packages the install added | sweep archive, `agent-w3-report-3.md` |
| First publish lag | a first publish can read pending on `--confirm` for minutes; Study 0.0.1 read served under `--confirm --wait 540` | ledger row "W5 published" |
| Linked worktree gates | a linked MCP worktree with a junctioned `node_modules` failed MCP's `src:browser` and `setup:browser` projects on "package root", cause unestablished; run browser-project gates in a linked worktree on a physical `node_modules` | MCP `f9fffad` |
| Probe receipt | the `verdict.receipt` sample in probe's `guides/probe.md` and the `Probe` TSDoc embed the installed TypeScript, oxlint and vitest versions; each move of one fails probe's guides test until both samples are re-pinned | probe `fccd508` |
| `PARALLEL.md` gates | scaffold's `format:check` runs `oxfmt --check .`, its prose sweep reads every Markdown file outside `.git`, `.orkestrel`, `dist`, `node_modules` and `tmp`, and `PARALLEL.md` is not ignored; write each section in oxfmt form without the banned terms | 2026-10-19 reading |
| Study write sets | `Promise.allSettled` over a pending set stays advisory, because real callers await each append; Study builds it in `StudyEvidenceSink.ts` and `StudyGradingStore.ts`, and which site the Study fix 4 verdict meant is unverified | verdict at `acff094` |
| Junctions | unlink each junction alone, record and verify its target, and delete with Node `fs.rmSync`; never run a recursive `Remove-Item` through a junction | `tmp/units/sweep/orchestrator-overrides.md` |
| Codex MCP start | a Codex child through T3 fails at session start when a configured MCP server (`tactica-probe`) cannot initialize; the Orchestrator reports the failure to the user | the Orchestrator, 2026-10-21 |
| Grok on stdin | Cursor Grok 4.7 took a 40,312-character prompt on stdin as one `user` event and closed `success` in 14310 ms (2026-10-15), a transport result only; the label runner `tmp/units/study-label-grok/` sends its prompt on stdin and passes no `--force` | `tmp/cursor/grok-stdin-probe.jsonl` |
| Ollama guard | run every non-service Ollama command with `OLLAMA_HOST=http://127.0.0.1:1`: `npm test`, `setup`, the gates, the probes and `ollama --version`, which asks the default server for its version; release checks and the 0.40.7 runner are in `.orkestrel/agent/plan.md` § Standing rules | U4 verdict at `acff094` |
| Ollama collection | `vitest list` evaluates the `service` project's `setupFiles`, so discovery in Ollama reaches `OLLAMA_HOST` in a clean checkout and `--projects` does not avoid it; run Ollama discovery only in a live window with `OLLAMA_HOST=http://127.0.0.1:11435` on the dedicated daemon; queued for the user's ruling: move the readiness gate and warm-up of `../ollama/tests/setupService.ts` from module load into a `beforeAll` its setup file registers, so collection needs no daemon and a failed gate fails each test instead of the import | same |
| Ollama service model | on the Ollama 0.40.8 runner `qwen3.5:2b-q4_K_M` writes its tool call as text in three tool-loop service tests; the service axis defaults to `qwen3.5:4b-q4_K_M` from Ollama `b1aaa8c` (user ruling, 2026-10-23), with CI provisioning it | Mechanisms campaign, live windows of 2026-10-23 |
| Agent unreleased source | Agent's `src/` has moved since 0.0.31 (the boost campaign's default-off `lexical` and `link` options, the selection receipt, and since 2026-10-23 the R1 `recent`/`pins` and R2 `work`/`names` prototypes); its visit of 2026-10-23 ruled the dist moved, so publishing Agent is a bump with a downstream cascade (Ollama and Study depend on it), held for the user | `tmp/units/mech/wave-agent-visit-1.log` |
| Agent CI | not maintained: the user intends to remove GitHub CI (2026-10-23); its red runs (the Node 26 leg's TS2307 on `tests/setupStudy.ts`'s static `dist/` import, the 22.12.0 leg's oxlint plugin load) are not tracked; Agent's matrix was set to `['22.18.0', '24']` in `f2a67063` before that clarification | user, 2026-10-23 |
| Ollama probes | `../ollama/tmp/probes/store-live.test.ts` and `wire-dump.test.ts` import `tests/setupServer.ts`, `setupStore.ts` and `setupService.ts`; matrix rows V5 and V6 closed as moot with the harness, so the probes are no longer series-read; a unit that moves those exports still checks the `tmp/probes` importers first; never merge the `probe` project into a probe config, because `tmp/probes/**` holds live probes | Cleanup; U4 verdict |
| `computeAnswer` | Ollama's duplicate check is quadratic, 1855 ms against the baseline's 3.4 ms at 20 000 tokens after OS-F-src; advisory, because the daemon asks for 20 and an O(n) check needs an added `src` class | Ollama `c7c611a` |
| Scaffold homes | scaffold 0.0.104 holds the equivalence contract with the forms that change what a rewrite reads (`equivalence.md`, B2), the Bindings census key with its fixtures and pinned provenance (`bindings.md`, B2) and the title check (`titles.ts`, B1) under `../scaffold/.agents/skills/orkestrel-harden/`, and the cross-copy guard form under `../scaffold/.claude/rules/typescript.md` § Errors and outcomes (B3) | scaffold `09a1cac9e`, `3c851efb6`, `408a9924d` |
| Worklist | keep a traversal's O(V+E) worklist; never trade it for O(V²) persistent-set recursion (ruling R4, absent from the rule text) | `tmp/units/let-sweep-rulings-2.md` |
| Meter | never add a re-entry flag, slot or refusal to the meter, because a flag is a call slot under § Bindings; never advance `charged` after a failed charge | budget U1 verdict at `acff094` |
| `createBudget` | a pass-through factory (`../budget/src/core/factories.ts:52`), which `../scaffold/.claude/rules/architecture.md:165` deletes, and a published API; a recorded fleet finding, not repaired | same |
| Budget abort text | a budget's abort reason is a `BudgetError` with the message "budget reached its ceiling"; the `ToolManager` tool result, the `Queue` entry-abort `QueueError` message and Study's recorded agent failure record it where they recorded "This operation was aborted" | `tmp/units/budget-meter-design-2.md` § 1.4 |
| Budget deferrals | deferred and unscheduled under the user's "Accept all": metering reasoning deltas on calibration data (Q8), validating `ProviderDelta.text` on runs with no meter (Q7), and an `allowance` member on `AgentJobInput` (Q10); `@orkestrel/timeout`'s untyped deadline reason is a finding outside the design (Q2) | `tmp/units/let-sweep-rulings-2.md` |
| Remaining rulings | keep `tmp/units/let-sweep-rulings-2.md` and `tmp/units/budget-meter-design-2.md` until their rulings reach the owners' guides: the Agent surface, `LedgerRequest`, the Study surface, "Close all, middleware too", `StudyProcessGoal` in Study's server barrel, Study `#goals` to `#goal`, the `DistributionSuite.start` ban, the `Conversation#pending` form and the Study fix 3 answers | the Orchestrator |

## Evaluation canon

Judge a study design, a report or a boost reading by these rows. Sources: the evaluation research of 2026-10-14 under `tmp/units/` (`agent-eval-*-report.md`, `agent-eval-article-supplied.md`, `agent-study-proposal.md`).

| Rule | Clause |
| --- | --- |
| Pair the arms | give every arm the same initial world, task, tools, model, prompt and user behaviour from a reset state (see [the τ-bench tool-agent-user benchmark](https://arxiv.org/abs/2406.12045)) |
| Failure classes | freeze them before execution: capacity, charged to the arm and never re-executed to improve it; infrastructure, which voids the trial pair, with each re-execution listed as another attempt; grader, re-gradable without a rollout; outcome |
| Denominators | headline denominators cover every declared goal; an unserved or capacity-failed goal counts as unachieved with its cause; a served-only score is secondary and compares only goals every arm served; a grader's unscored item stays in the coverage count (see [Inspect scoring policy](https://inspect.aisi.org.uk/scoring-policy.html)) |
| Columns | report facts, downstream work, obligations, critical violations, coverage, blind semantic score, feasibility, and cost per role (agent, memory filing, summarization, simulated user, grader) apart |
| Repeats | one trajectory per arm is a point observation and its paired differences are descriptive; size a repeated subset from pilot dispersion and the paid budget before execution and report its interval or dispersion (see [quantifying uncertainty in LLM benchmark scores](https://arxiv.org/html/2410.03492v2)); report pass^k apart from pass@k; counterbalance arm order and record host load per trial (`tmp/units/agent-eval-review-report.md` O1) |
| Grading | grade checkable facts with deterministic predicates, each with a negative control; a `null` arm's pass on a goal that needs an action fails the check, and on a refusal or abstention goal is a coverage finding (see [the ABC benchmark audit](https://arxiv.org/abs/2507.02825)); a model judge scores only what predicates cannot settle, blind to arm, in randomized order, with outputs retained (see [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685)) |
| Truth | a held-out oracle lives outside the checkout and only its digest enters the study declaration; a report carries verdicts and coverage, never oracle values |
| Envelope | an equal context and output envelope is a controlled resource envelope, not equal compute; a cost-matched comparison is a separate study |

## Routing

| Lane | Rule | Ruling |
| --- | --- | --- |
| Codex | units go to Codex through T3 `delegate_task`: Sol builds, Astra designs and reviews, Luna gates and drives; Claude keeps the Orchestrator | user, 2026-10-19; "Claude only where needed", 2026-10-20 |
| Claude | Opus writes documentation voice and holds a lane the Codex content filter stops; Claude units run as in-process Workflow nodes | 2026-10-20 |
| Grok | labeling and mapping only, one controlled lane through T3 (`../scaffold/.agents/orchestration.md:152`); the T3 concurrency limit, the content-filter fallback, the proved route and the unit cycle are in `.orkestrel/agent/plan.md` § Engines and routing | Cleanup, 2026-10-21 |

## History

| Closed | Date | Record |
| --- | --- | --- |
| The Mechanisms campaign (U20): Ollama's dedicated daemon session (`@orkestrel/ollama/server`), Study's materialized closure, exchange recording, sealing and offline replay with a declared prefix, and daemon staging, Agent's memory study as the recording and replay consumer; process custody waived (U22); one falsify round (FAIL, fixed, closure PASS) and the verify's two repairs; published Ollama 0.0.25 and Study 0.0.3; exit met | 2026-10-23 | Ollama `067864c`, `b1aaa8c`; Study `89c58bf`; Agent visit; `.orkestrel/ledger.md` § Mechanisms campaign |
| Bindings sweep of scaffold, Study, budget, Agent and Ollama (the fleet campaign of 2026-10-17), closed under the user's exit rule of 2026-10-18 (one closure check, then commit); exit met | 2026-10-19 | scaffold `4d67f0f32`, Study `a8e9443`, Agent `53bfe20`, Ollama `c7c611a`; acceptance `6510cbe` |
| Budget design 2 (U1 to U4) | 2026-10-19 | budget `4d74195`; `692e551:.orkestrel/plan.md` § Budget design 2 |
| Records Grok labels imported and compared judge for judge | 2026-10-19 | `692e551:.orkestrel/plan.md`, the row records-grok-label-import |
| Scaffold 0.0.102 and the fleet repair onto it under local pins | 2026-10-19 | `19671436e`; budget `ca99510`, Agent `e8cdcba`, Ollama `3ddedba`, Study `4d97e8d` |
| Release round W1 to W5, which retired the local pins, and the fleet repair onto Scaffold 0.0.103 | 2026-10-19 | W1 budget `38c9a66`, terminal `afe1a87`, mcp `5b90ebc`; W2a middleware `adba018`, workflow `d6a0cf1`, probe `569ae33`; W2b scaffold `7ad00d294`, browser `b10f0e4`; W3 agent `df795dc`; W4 ollama `7dfa020`, toolbox `8ef5ab7`; W5 study `eed15ac`; Agent on the registry `b47ce06`; repairs budget `5eea66c`, terminal `34a0b9b`, workflow `64f7362`, mcp `8efb220`, middleware `49a0dd3`, probe `7b51198`, browser `be09c02` |
| State on 2026-10-19 (evening), the realignment and the units table of the 2026-10-17 campaign | 2026-10-19 | `692e551:.orkestrel/plan.md` |
| Sweep and clean (user, 2026-10-19): inventory, executor rounds 1 to 4 and the apply of 5,094 roots (7.77 GB) | 2026-10-20 | `b56eb69`; `tmp/units/sweep/apply-receipt.json`; the Study sweep stays owed |
| Studies cleanup: falsify round, fix U6, the user's reversal of S4, the naming correction; the owed edits to `study.md`, `relocation.md` and cleanup ledger row S4 are moot because those files leave the tree | 2026-10-16 to 2026-10-21 | Agent `c3402bc`, Study `ca81174`, Agent `f52daa4`; S4 ruling in `.orkestrel/agent/plan.md` |
| Study 0.0.2 and Agent's adoption | 2026-10-20 | Study `1f33206`; Agent `1153752` |
| Scaffold 0.0.104 with the whole queue before it (G1, G2, the catalog refresh, the template and lint items, guide whitespace, the census key, the equivalence contract's home, the title diff port, the BR-2 brand rule), G3 and G4 closed as moot, and the fleet repair onto it | 2026-10-20 | `408a9924d`; verdict at `692e551:.orkestrel/scaffold/0104-audit-verdict.md`; repairs in § Packages and layer order |