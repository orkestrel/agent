# Fleet campaign plan

The fleet's plan as it stood on 2026-10-21: state, rulings in force, packages and layer order, the units each package owes, the scaffold 0.0.105 queue, the standing readings, routing, and the closed campaigns.

- `.orkestrel/ledger.md` holds one row per fleet dispatch or ruling from 2026-10-19 onward. `.orkestrel/agent/plan.md` holds Agent's boost campaign: its rulings, gates, units, sweep guard, runner and engine rules; `.orkestrel/agent/evidence.md` holds the series figures.
- A record named with a commit reads through `git show COMMIT:PATH`; the fleet plan before the 2026-10-21 rewrite is `692e551:.orkestrel/plan.md`. A path under `tmp/` is a gitignored working file; a `tmp/` path that a dated ledger row cites and a sweep removed is a record, which git history and the 2026-10-20 sweep archive `tmp/units/sweep/archive/` keep until the user rules that archive disposable.

## State

| Item | Statement | Record |
| --- | --- | --- |
| Campaign | the fleet campaign of 2026-10-17 is accepted (U12a) and its successors are closed; no fleet campaign with an exit criterion is open | `6510cbe`; § History |
| Live work | the `.orkestrel` consolidation, the scaffold 0.0.105 queue, and the units each package owes at its next visit | Cleanup, user, 2026-10-21 |
| Releases | Scaffold 0.0.104 and Study 0.0.2 are published (2026-10-20); every package of the Agent session takes Scaffold 0.0.104 with no bump | ledger rows "Scaffold 0.0.104 published", "Study 0.0.2 published", "fleet repair onto 0.0.104" |
| Scaffold window | no scaffold window is open on 2026-10-21; each queue item goes into `../scaffold/PARALLEL.md` before its unit runs | `.orkestrel/agent/plan.md` § Standing rules, Scaffold |

## Rulings in force

| Id | Date | By | Clause |
| --- | --- | --- | --- |
| Node | 2026-10-20 | user | packages support the Node 22 and 24 LTS lines only; 22 is the floor because Claude Code cloud defaults to it; Node 26 is an isolated local tool runtime (the W5 host), never a package dependency |
| Node floor gate | 2026-10-20 | user | every release also gates on Node 22.18.0, the declared floor, from the portable runtime under `tmp/runtimes/`; each package raises `engines.node` to `>=22.18.0` at its next release (F-floor) |
| Let sweep | 2026-10-19 | user | finish the `let` sweep per package visit, each with a census and a review; the Bindings lint rule lands in scaffold after the last visit |
| Rewording | 2026-10-20 | user | "Rule + sweep at visits": each package rewords its guide and source comments against `writing.md` § Substitutions at its next release visit (F-wording); identifiers stay |
| BR-2 | 2026-10-20 | user | the brand guard covers every public error class; a policy check follows after the fleet conforms |
| Visit split | 2026-10-20 | user | the Agent session repairs its own packages to each scaffold release and regenerates a lock on `ERESOLVE` within unchanged ranges; the Veneer session takes test, veneer, form, table, guide, html and workspace |
| Worktrees | 2026-10-20 | user | use a worktree only to parallelize writers; merge it back to `main`, remove and prune it, and delete its branch |
| Dependencies | by 2026-10-16 | user | needed `@orkestrel/*` dependencies are authorized without another request, each at its highest published version; a non-Orkestrel addition still needs explicit authorization |
| Engines | by 2026-10-16 | user | the final Fable allowance is consumed, so never invoke it without further permission; Opus 5.5 stays authorized for subjective and skeptical work; no parallel GPU work |
| Cleanup | 2026-10-21 | user | consolidate `.orkestrel`, absorb the root `ANALYSIS.md`, `BOOSTS.md`, `PROPOSAL.md` and `RESULTS.md`, and retire the legacy harness under `.orkestrel/agent`; the full clause is in `.orkestrel/agent/plan.md` § Rulings in force |
| Harness | 2026-10-21 | user, Cleanup | the retirement order of 2026-10-20 is void; the legacy harness, its tools and its records left the tree in the Cleanup change, readable at `692e551`; the endurance sources live at `studies/endurance/sources/`; the Ledger golden promotion is an Agent unit (`.orkestrel/agent/plan.md` § Units) |

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
| F-floor | every package whose `engines.node` is under 22.18.0 | `engines.node` `>=22.18.0` and the CI floor row 22.18.0; sea keeps `>=24.8.0` for its build API | next release |
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
| Performance gates | study | a performance-reader test from `tmp/units/compaction-output-2-perf-gates.ts` whose control triples the summary prefill and is refused with "phase sum 1919193 ms exceeds provider total 898587 ms" | only while the ladder uses the script; otherwise delete it with the campaign tooling at the boost's acceptance |
| Study sweep | study | the sweep deferred on 2026-10-20: 228 roots, three dirty worktrees to snapshot, eight worktrees' ignored `tmp/` files to copy, and the old worktrees under `../study/tmp/worktrees/` (14 on 2026-10-21), where `compaction-output` at `422d549` is the Study build the sealed `compaction-output-2` series captured | at Study's release visit (`.orkestrel/agent/plan.md` § Rulings in force, Decisions); remove a worktree only when no series reads it, it is clean and its HEAD is merged |
| Browser scratch path | browser | `../browser/tests/service/document.test.ts:101-104` writes `tmp/codex/reading-joining-source.json` with no `mkdirSync`, so the service run fails with `ENOENT` in a fresh clone; create the directory recursively or write into a scratch path | next visit; browser's `tmp/codex/` directory stays until it lands |
| Review kit | scaffold | carry one generalized pre-publish review kit into `orkestrel-publish` through `PARALLEL.md`, or discard the 28 kit files under `tmp/units/release/`; their keep condition ended when Study 0.0.2 published | the Orchestrator's ruling |

## Scaffold 0.0.105 queue

| Item | Source | Clause |
| --- | --- | --- |
| L1, L2, L5, L7 | `tmp/units/scaffold-0104/plan.md` § 1.2 | the window refusals, the `--digest` comparison, the resume ranges and the swap fresh baseline |
| `@types/node` | same | against the 22.18.0 floor, after its own fleet scan |
| BR-2 instrument | same; BR-2 ruling | a policy check after the fleet conforms to the brand rule |
| Alias lint | same | the alias lint over `app/*` |
| Bindings lint rule | Let sweep ruling | lands after the last `let` visit |
| Sass 1.106.0 | Veneer session, 2026-10-20 | 1.106.0 refuses empty attribute-selector values and unquotes identifier-like ones, and a visit's `pin` step and `STYLES_DEV_DEPENDENCIES` `^1.105.1` admit it; hold or exclude 1.106.x for styles targets until Sass fixes it |
| Vendored test wording | Veneer session, 2026-10-20 | two cross-reference hits and one temporal hit of `writing.md` § Substitutions in vendored tests surface in every target's release pass: `tests/policy.test.ts:799`, `tests/policy.test.ts:852` and `tests/setupPolicy.ts:351` |
| Discovery census | W7 build, 2026-10-21 | the dispatch skill's discovery census lists every Vitest project even with `--projects`, so in Agent it imported `tests/distribution.test.ts`, which packs and installs at module load; restrict the census to the named projects (`tmp/units/ladder/build-w7/report.md`) |
| Dispatch pointer | Agent `.agents/skills/`, 2026-10-21 | Agent's `.agents/skills/` and `.claude/skills/` carry pointers for seven skills and none for `orkestrel-dispatch`; the next `scaffold repair` or 0.0.105 adds that pointer |
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