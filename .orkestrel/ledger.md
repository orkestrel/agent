# Fleet routing ledger

The fleet routing ledger as it stood on 2026-10-21: one row per dispatch, ruling or bench substitution from 2026-10-19 onward; the earlier rows, from the 2026-10-17 bench probes through the start of the fleet repair onto Scaffold 0.0.102, are `692e551:.orkestrel/ledger.md` lines 7 to 171, and that commit holds every row's full text.

- Sol, Astra and Luna are GPT-6.1 Sol, GPT-6 Astra and GPT-6 Luna, reached through T3 `delegate_task` with provider `codex` where the transport reads T3. Opus, Sonnet and Haiku are Claude 5.5 models; Fable is Claude Fable 5.1.
- A user ruling is a row with the role `user`; `.orkestrel/plan.md` § Rulings in force holds the clauses that still bind, and `.orkestrel/agent/plan.md` holds the boost rulings.
- A path under `tmp/` is a gitignored working file; a sweep might have removed it, and git history and `tmp/units/sweep/archive/` keep the record. A bare commit names a commit in the package the row names, Agent by default.

## Release round and the fleet repair onto 0.0.103 (2026-10-19)

| Unit | Role | Engine | Transport | Id | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| fleet repair, Agent under the temporary floor | builder | Sonnet high | Workflow | `wf_1663e825-08b` | stopped on the `swap.ts` pack guard | `tmp/units/fleet-repair-brief.md` |
| fleet repair, Agent re-pin | Orchestrator | Opus | direct | — | Agent re-pinned through `local-pin.ts`, gated and committed at `e8cdcba` | `tmp/units/swap-agent-2026-10-19T13-55-05-266Z.json` |
| fleet repair, Ollama, Study, Agent refresh | builder | Sonnet high | Workflow | `wf_f2962025-c28` | Ollama `3ddedba` and Study `4d97e8d` repaired onto Scaffold 0.0.102 | `tmp/units/fleet-repair-brief.md` |
| realign | analyst, planner, reviewer | Opus, Sonnet, Haiku | Workflow | `wf_70cdc1b9-ec6` | seven read lanes, a planner and a critic wrote the realignment reports | `tmp/units/realign/` |
| mine-series-ideas | analyst | Opus, Sonnet | Workflow | `wf_7ba22958-cf3` | the series idea catalogue from the Claude sessions and the Codex threads | `tmp/units/realign/ideas.md` |
| boost-ladder-design | analyst, planner, reviewer | Sonnet high, Opus high | Workflow | `wf_c72480fe-dfa` | four evidence lanes wrote the first ladder for its critic | `tmp/units/ladder/` |
| audit chain: BR-1 budget brand, Study pin, SL-1 layer trace | opus, builder, gate | Opus high, Sonnet high, Haiku high | Workflow | `wf_4249e954-373` | dispatched under the user's "transparency, clarity, and chain of responsibility" | `tmp/units/budget-brand-brief.md`, `tmp/units/study-layer-trace-brief.md` |
| release W1 layer prep | builder | Sonnet high | Workflow | `wf_bfede446-695` | terminal 0.0.20 and mcp 0.0.39 prepared | `tmp/units/release/layer-prep-brief.md` |
| terminal second pass | builder | Sonnet high | Workflow | `wf_60c3f8f5-02c` | the form 0.0.12 `list` control added to `sanitizeSchema` before prep | `tmp/units/release/layer-prep-brief.md` |
| scaffold-lint-uniform | builder, gate | Sonnet high, Haiku high | Workflow, worktree `lint-uniform` | `wf_c777d7d8-a43` | one permissive lint rule everywhere, by the user's ruling | `tmp/units/scaffold-lint-uniform-brief.md` |
| routing change | user | — | conversation | — | units go to Codex through T3 from this row: Sol builds, Astra designs and reviews, Luna gates and drives, Claude keeps the Orchestrator | memory `feedback-model-limits` |
| AG-1 | builder | Sol high | T3 | `ag-1-sol-1` | Agent F1 meter-wiring case and F2 allowance-scope TSDoc and guide | `tmp/units/ag-1-brief.md` |
| OL-1 | builder | Sol high | T3 | `ol-1-sol-1` | Ollama F3 live layer-first cases and F4 truncation assertion | `tmp/units/ol-1-brief.md` |
| terminal list-control review | analyst | Astra high | T3 | `terminal-list-review-astra-1` | reviewed `802834a` before W1 | `tmp/units/release/terminal-review-astra.md` |
| terminal list EOF fix | builder | Sol high | T3 | `terminal-list-fix-sol-1` | fixed the buffered EOF that truncated lists, the unproven optional-empty branch and O1 | `tmp/units/release/terminal-review-astra.md` |
| terminal closure check | analyst | Astra medium | T3 | `terminal-closure-astra-1` | closure check on `afe1a87` under the exit rule | `tmp/units/release/terminal-closure-astra.md` |
| BR-1 review | analyst | Astra high | T3 | `budget-brand-review-astra-1` | reviewed the budget brand before 0.0.14 | `tmp/units/budget-brand-review-astra.md` |
| BR-1 fixes | builder | Sol high | T3 | `budget-brand-fix-sol-1` | fixed claim 5's guide wording and O1's fixtures in assertion files | `tmp/units/budget-brand-review-astra.md` |
| Claude session limit | Orchestrator | — | — | `wf_c72480fe-dfa`, `wf_4249e954-373`, `wf_c777d7d8-a43` | the limit cut three Claude agents mid-run, and each lane moved to Codex after an audit of its partial tree | — |
| BR-1 closure | analyst | Astra medium | T3 | `budget-brand-closure-astra-1` | closure check under the exit rule | `tmp/units/budget-brand-closure-astra.md` |
| SL-1 finish build | builder | Sol high | T3 | `study-layer-trace-sol-1` | audits the partial edits, then completes the design | `tmp/units/study-layer-trace-brief.md` |
| scaffold-lint-uniform finish build | builder | Sol high | T3 | `scaffold-lint-uniform-sol-1` | audits the partial edits, then completes the rule | `tmp/units/scaffold-lint-uniform-brief.md` |
| ladder critic | analyst | Astra xhigh | T3 | `ladder-critic-astra-1` | ruled the first ladder unsound | `tmp/units/ladder/ladder-critic.md` |
| BR-1 accepted | Orchestrator | — | direct | — | closure CLOSED; budget commit `53f3b46` | `tmp/units/budget-brand-closure-astra.md` |
| release prep budget 0.0.14 | builder | Sol high | T3 | `release-budget-sol-1` | budget prepared for W1 | `tmp/units/release/layer-prep-brief.md` |
| W1 prepared | Orchestrator | — | direct | — | budget `38c9a66`, terminal `afe1a87` and mcp `5b90ebc` pushed to wait for the user's one-time code | — |
| ladder revision 2 | planner | Astra xhigh | T3 | `ladder-revision-astra-1` | rewrites the ladder against the critic's LC-1 to LC-13 | `tmp/units/ladder/ladder-critic.md` |
| scaffold-lint-uniform review | analyst | Astra high | T3 | `scaffold-lint-uniform-review-astra-1` | reviewed the uniform lint rule | `tmp/units/scaffold-lint-uniform-review-astra.md` |
| W1 published | user, Orchestrator | — | `window.ts` | — | budget 0.0.14, terminal 0.0.20 and mcp 0.0.39 published with the user's one-time code and served | `tmp/units/publish--orkestrel-{budget,terminal,mcp}.log` |
| release prep W2 | builder | Sol high | T3 | `release-{workflow,middleware,browser,probe}-sol-1` | workflow 0.0.23, middleware 0.0.25, browser 0.0.29 and probe 0.0.24 prepared one per repository | `tmp/units/release/layer-prep-brief.md` |
| scaffold-lint-uniform accepted | Orchestrator | — | direct | — | Astra PASS; worktree commit `52c2f2f2d` on `lint-uniform` | `tmp/units/scaffold-lint-uniform-review-astra.md` |
| release prep scaffold 0.0.103 | builder | Sol high | T3 | `release-scaffold-0103-sol-1` | prepared in the standalone clone `scaffold-release-0103` | `tmp/units/release/scaffold-0103-report.md` |
| workflow first pass | builder, Orchestrator | Sol high | T3; direct | — | stopped at G1 `ERESOLVE` because Codex's policy refused the destructive remedy, which the Orchestrator applied | `tmp/units/release/workflow-report.md` |
| workflow resume | builder | Sol high | T3 | `release-workflow-sol-2` | resumes 0.0.23 from `commit` | `tmp/units/release/layer-prep-brief.md` |
| browser 0.0.29 prep | builder | Sol high | T3 | `release-browser-sol-1`, `release-browser-sol-2` | resumed from `commit` after G1 and the Orchestrator's lock remedy | `tmp/units/release/layer-prep-brief.md` |
| W2 middleware prepared | builder | Sol high | T3 | `release-middleware-sol-1` | middleware 0.0.25 pushed at `adba018` with `prepublishOnly` 914 passed | `tmp/units/release/middleware-report.md` |
| ladder-2 written | planner | Astra xhigh | T3 | `ladder-revision-astra-1` | `ladder-2.md` closes 13 of 13 LC claims | `tmp/units/ladder/ladder-2.md` |
| ladder-2 closure check | analyst | Astra high | T3 | `ladder-2-closure-astra-1` | closure check under the exit rule | `tmp/units/ladder/ladder-2-closure.md` |
| W2 workflow resume | builder | Sol high | T3 | `release-workflow-sol-2` | blocked at gates by one product test whose proxied signal trap never ran (876 of 877) | `tmp/units/release/workflow-report-2.md` |
| workflow signal diagnosis | analyst | Astra high | T3 | `workflow-signal-diagnosis-astra-1` | bisects budget 0.0.14, vitest 4.1.12 and the overwrite | `tmp/units/release/workflow-signal-diagnosis.md` |
| W2 browser resume | builder | Sol high | T3 | `release-browser-sol-2` | blocked at gates by one product test expecting the frame `Pool.#commit` | `tmp/units/release/browser-report-2.md` |
| browser frame diagnosis | analyst | Astra high | T3 | `browser-frame-diagnosis-astra-1` | diagnoses the frame name | `tmp/units/release/browser-frame-diagnosis.md` |
| ladder-2 closure | Orchestrator | — | direct | — | CLOSED with the user's U1b, U4, U5 and U15 and the rest adopted; W0 wrote the dispatch ledger | `tmp/units/ladder/dispatch-ledger.md` |
| boost first wave | builder | Sol high | T3 | `ladder-w{1,2,4,5}-sol-1` | W1, W2, W4 and W5 dispatched at L0 with no GPU | `tmp/units/ladder/ladder-2.md` § S7.1 |
| browser frame result | analyst | Astra high | T3 | `browser-frame-diagnosis-astra-1` | Vite 8.3.4 no longer clones unmapped call sites, so the assertion was brittle and takes a one-line fix | `tmp/units/release/browser-frame-diagnosis.md` |
| browser 0.0.29 fix | builder | Sol high | T3 | `release-browser-sol-3` | applies the test fix and finishes prep | `tmp/units/release/layer-prep-brief.md` |
| workflow signal result | analyst | Astra high | T3 | `workflow-signal-diagnosis-astra-1` | Node 24.22.0's `AbortSignal.any` validates its brand before the proxy trap, so the premise is stale and a replacement test is prescribed | `tmp/units/release/workflow-signal-diagnosis.md` |
| workflow 0.0.23 fix | builder | Sol high | T3 | `release-workflow-sol-3` | applies the replacement test with a synchronous-throw mutant | `tmp/units/release/layer-prep-brief.md` |
| probe first pass | builder, Orchestrator | Sol high | T3 | `release-probe-sol-1`, `release-probe-sol-2` | stopped at the guide gate on the receipt's tool versions, ruled a self-pin class | `tmp/units/release/probe-report.md` |
| SL-1 built | builder | Sol high | T3 | `study-layer-trace-sol-1` | 100 mutants each failed a test, and the full `npm test` timed out under machine load | `tmp/units/study-layer-trace-report.md` |
| SL-1 review | analyst | Astra high | T3 | `study-layer-trace-review-astra-1` | dispatched | `tmp/units/study-layer-trace-review-astra.md` |
| workflow replacement test | builder | Sol high | T3 | `release-workflow-sol-3`, `release-workflow-sol-4` | committed `b819672` with the measured `.toThrow(TypeError)` assertion | `tmp/units/release/workflow-report-3.md` |
| browser assertion fix | builder, Orchestrator | Sol high | T3 | `release-browser-sol-3`, `release-browser-sol-4` | `82abd60` held its negative control, and the Windows release chain was ruled from browser's `e887416` precedent | `tmp/units/release/browser-report-3.md` |
| W2 workflow prepared | builder | Sol high | T3 | `release-workflow-sol-4` | workflow 0.0.23 pushed at `d6a0cf1` with `prepublishOnly` green | `tmp/units/release/workflow-report-4.md` |
| SL-1 review result | analyst | Astra high | T3 | `study-layer-trace-review-astra-1` | FAIL 1, 2, 6 and 7, where 7 reproduces at baseline `4d97e8d` | `tmp/units/study-layer-trace-review-astra.md` |
| SL-1 fixes | builder | Sol high | T3 | `study-layer-trace-fix-sol-1` | fixes 1, 2 and 6 on the published budget 0.0.14 | `tmp/units/study-layer-trace-review-astra.md` |
| SL-1 fix passes 1 and 2 | builder | Sol high | T3 | `study-layer-trace-fix-sol-1`, `study-layer-trace-fix-sol-2` | pass 1 stopped at the single-copy guard, so pass 2 pins budget from `38c9a66` with its override | `tmp/units/study-layer-trace-fix-report.md` |
| browser Windows release chain | builder | Sol high | T3 | `release-browser-sol-4` | `test:setup` timed out under about nine concurrent Codex tasks and waits for a quiet serial rerun | `tmp/units/release/browser-report-4.md` |
| SL-1 fix pass 2 result | builder | Sol high | T3 | `study-layer-trace-fix-sol-2`, `study-layer-trace-fix-sol-3` | budget matched the registry tarball, and pass 3 re-pins Ollama and MCP after freshness drift | `tmp/units/study-layer-trace-fix-report-2.md` |
| probe self-pin | builder | Sol high | T3 | `release-probe-sol-2` | `prepublishOnly` stopped on a 3000 ms type-warm deadline under load | `tmp/units/release/probe-report-2.md` |
| SL-1 fix pass 3 | builder | Sol high | T3 | `study-layer-trace-fix-sol-3` | findings 1 and 6 fixed with mutation proof, and the single-worker suite passes 1130 | `tmp/units/study-layer-trace-fix-report-3.md` |
| SL-1 closure | analyst | Astra medium | T3 | `study-layer-trace-closure-astra-1` | closure check under the exit rule | `tmp/units/study-layer-trace-closure-astra.md` |
| SL-1 accepted | Orchestrator | — | direct | — | Study `ba5bf3b`, with finding 7 open for duration evidence only | `tmp/units/study-layer-trace-closure-astra.md` |
| scaffold 0.0.103 prepared | builder | Sol high | T3 | `release-scaffold-0103-sol-1` | `7ad00d294` on `lint-uniform`, with the clone's `npm test` left for the quiet serial run | `tmp/units/release/scaffold-0103-report.md` |
| quiet serial queue | Orchestrator | — | direct | — | browser, probe, scaffold 0.0.103, the W1 and W5 verifiers and the W4 re-verify run one at a time after the Codex batch drains | — |
| boost first wave state | Orchestrator | — | — | — | W1, W2 and W4 accepted while W5's fixes run | `tmp/units/ladder/dispatch-ledger.md` |
| quiet serial run | Orchestrator | — | `quiet-run.ps1` | `bx3ria7ya` | the W2 gates run one at a time in the background | `tmp/units/release/quiet-run/` |
| quiet run results | Orchestrator | — | `quiet-run.ps1` | `bx3ria7ya` | probe released at `569ae33`, while browser's codegen case flaked and scaffold failed 6 skills discovery cases | `tmp/units/release/quiet-run/` |
| W2 split | Orchestrator | — | — | — | W2a (middleware, workflow, probe) is ready and W2b (browser, scaffold) waits on diagnoses | — |
| codegen and discovery diagnoses | analyst | Astra high | T3 | `browser-codegen-diagnosis-astra-1`, `scaffold-discovery-diagnosis-astra-1` | dispatched | `tmp/units/release/{browser-codegen,scaffold-discovery}-diagnosis.md` |
| W2a published | user, Orchestrator | — | `window.ts` | — | middleware 0.0.25, workflow 0.0.23 and probe 0.0.24 published with the user's one-time code and served | `tmp/units/publish--orkestrel-{middleware,workflow,probe}.log` |
| release prep agent 0.0.31 (W3) | builder | Sol high | T3 | `release-agent-sol-1` | prepares Agent with a scratch release-proof tree for `check` and `test:studies` | `tmp/units/release/agent-w3-brief.md` |
| scaffold discovery result | analyst, Orchestrator | Astra high | T3; direct | `scaffold-discovery-diagnosis-astra-1` | the quiet runner lacked `PLAYWRIGHT_BROWSERS_PATH`, and scaffold `main` was fast-forwarded to `7ad00d294` and pushed | `tmp/units/release/scaffold-discovery-diagnosis.md` |
| publish readiness | analyst, `orkestrel`, planner | Sonnet high, Opus high | Workflow | `wf_a3600de5-195` | fleet and bump evidence reconciled into a readiness assessment | `tmp/units/publish-readiness/` |
| agent W3 attempt 1 | builder | Sol high | T3 | `release-agent-sol-1` | stopped at the clean-tree precondition on the Orchestrator's uncommitted ledger edit, committed as `e7d1802` | `tmp/units/release/agent-w3-brief.md` |
| codegen diagnosis result | analyst | Astra high | T3 | `browser-codegen-diagnosis-astra-1` | a test race that predates the round, which a barrier fixes 20 of 20 | `tmp/units/release/browser-codegen-diagnosis.md` |
| agent W3 attempt 2 | builder, Orchestrator | Sol high | T3 | `release-agent-sol-2` | stopped at step 5 on `tests/setupStudy.test.ts`, ruled into the scratch proof tree | `tmp/units/release/agent-w3-report-2.md` |
| browser 0.0.29 | builder | Sol high | T3 | `release-browser-sol-5` | the barrier fix and release commit `b10f0e4` pushed | `tmp/units/release/layer-prep-brief.md` |
| W2b published | user, Orchestrator | — | `window.ts` | — | scaffold 0.0.103 and browser 0.0.29 published with the user's one-time code and served | `tmp/units/publish--orkestrel-{scaffold,browser}.log` |
| agent W3 attempt 3 | builder | Sol high | T3 | `release-agent-sol-3` | stopped at scratch `check` because the grading fixture lacked SL-1's `stop` | `tmp/units/release/agent-w3-report-3.md` |
| agent W3 attempt 4 | builder | Sol high | T3 | `release-agent-sol-4` | Release 0.0.31 `df795dc` pushed with the tarball SHA-256 `e8a29f70…` unchanged | `tmp/units/release/agent-w3-report-4.md` |
| agent W3 pre-window | Orchestrator | — | direct | — | `npm pack` from the clean tree is byte-identical to the proved artifact | `tmp/units/release/agent-w3-prewindow-restore.json` |
| agent 0.0.31 pre-publish review | reviewers | Sonnet | Workflow | `wf_f54b4025-6e1` | 0 blocking across three lenses, with desk and taverna failing on 0.0.31 | `tmp/units/release/prewindow-review/` |
| W3 published | user, Orchestrator | — | `window.ts` | — | agent 0.0.31 published with the user's one-time code and served byte-identical to the proved artifact | `tmp/units/publish--orkestrel-agent.log` |
| W4 and W5 briefs | Orchestrator | — | — | — | Ollama 0.0.24 with the `ollama` 0.6.4 conformance client and toolbox 0.0.20, then Study 0.0.1's first publish | `tmp/units/release/w4-brief.md`, `tmp/units/release/w5-brief.md` |
| W4 daemon | Orchestrator | — | WMI detach | `tmp/units/release/w4-daemon/detach.json` | Ollama 0.40.6 started on 11435 as PID 78492 with a self-stop deadline, 11434 untouched | `tmp/units/release/w4-daemon.ts` |
| release prep W4 | builder | Sol high | T3 | `release-w4-sol-1` | prepares ollama 0.0.24 and toolbox 0.0.20 | `tmp/units/release/w4-brief.md` |
| W4 prepared | builder | Sol high | T3 | `release-w4-sol-1` | Ollama `7dfa020` and toolbox `8ef5ab7` released and pushed with gates green | `tmp/units/release/w4-report.md` |
| W4 daemon stopped | Orchestrator | — | `taskkill /T` on the recorded PID | — | the recorded tree stopped and 11435 freed, the user's 11434 untouched | `tmp/units/release/w4-daemon/` |
| W4 pre-window review | reviewers | Sonnet | Workflow | `wf_bd70d3b4-054` | 0 blocking, with the note that moving Ollama without Agent nests a second Agent copy | `tmp/units/release/prewindow-review-{ollama,toolbox}/` |
| W4 published | user, Orchestrator | — | `window.ts` | — | ollama 0.0.24 and toolbox 0.0.20 published with the user's one-time code and served byte-identical to the reviewed tarballs | `tmp/units/publish--orkestrel-{ollama,toolbox}.log` |
| release prep Study 0.0.1 (W5) | builder | Sol high | T3 | `release-w5-sol-1` | prepares Study's first publish | `tmp/units/release/w5-brief.md` |
| W5 attempt 1 | builder, Orchestrator | Sol high | T3; direct | `release-w5-sol-1` | stopped at the clean-tree check on a pinned budget manifest, which the Orchestrator restored to `ba5bf3b` | `tmp/units/release/w5-report.md` |
| W5 attempt 2 | builder | Sol high | T3 | `release-w5-sol-2` | runs from the visit | `tmp/units/release/w5-brief.md` |
| W5 prepared | builder | Sol high | T3 | `release-w5-sol-2` | Study 0.0.1 pushed at `eed15ac` with test 1131 passed and the CLI durations recorded | `tmp/units/release/w5-report-2.md` |
| W5 pre-window review | reviewers | Sonnet | Workflow | `wf_c8981ae7-0a9` | 0 blocking, with five items for Study 0.0.2 led by the private core copies | `tmp/units/release/prewindow-review-study/` |
| W5 published | user, Orchestrator | — | `window.ts` | — | the user ruled to publish with the core-copy defect queued for 0.0.2, and Study 0.0.1 read served under `--confirm --wait 540` | `tmp/units/publish--orkestrel-study.log` |
| agent dev-only step | builder | Sol high | T3 | `release-agent-dev-sol-1` | Agent takes Study `^0.0.1` and Ollama `^0.0.24` on Scaffold 0.0.103 with no bump | `tmp/units/release/agent-dev-brief.md` |
| clean up and place Study | user | — | conversation | — | clean up and put Study where it belongs while the 0.0.2 fixes proceed | `tmp/units/study-002-brief.md` |
| sweep inventory | analysts | Sonnet | Workflow | `wf_53634417-a82` | five read-only scopes, each delete list tested by a skeptic | the workflow prompts |
| Study 0.0.2 design | planners, critic | Opus, Sonnet | Workflow | `wf_39db9440-92f` | two blind designers, a critic and a synthesis | `tmp/units/study-002-brief.md` |
| release order step 3 | builder | Sol high | T3 | `release-agent-dev-sol-1` | `b47ce06` pushed with no pin and no bump, the registry proof green and the pin ledger empty | `tmp/units/release/agent-dev-report.md` |
| fleet repair onto 0.0.103 | builder | Sol high | T3 | `fleet-0103-repair-sol-1` | budget, terminal, workflow, mcp, middleware, probe and browser one at a time with no bump | `tmp/units/release/fleet-0103-repair-brief.md` |
| fleet on 0.0.103 | builder, Orchestrator | Sol high | T3; direct | `fleet-0103-repair-sol-1` | every repair wrote the same 4 hosted paths, passed every gate on its first run and pushed with its version unchanged | `tmp/units/release/fleet-0103-repair-report.md` |

## Study 0.0.2, the sweep and Scaffold 0.0.104 (2026-10-19 to 2026-10-20)

| Unit | Role | Engine | Transport | Id | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Study 0.0.2 design synthesis | planners, critic | Opus, Sonnet | Workflow | `wf_39db9440-92f` | 27 claims C1 to C27 and four serial units S1 to S4, with Q1 and Q2 open for the user | `tmp/units/study-002-design.md` |
| S1 | builder | Sol xhigh | T3 | `study-002-s1-sol-1` | one copy of core | `tmp/units/study-002-design.md` § 5.2 |
| realignment 2 | analysts | Sonnet | Workflow | `wf_15af4308-907` | three lanes and a completeness critic whose 24 spot checks held | `tmp/units/realign-2/` |
| decisions after the realignment | user | — | AskUserQuestion | — | Study 0.0.2 builds all four moves and publishes when green; the W5 closure covers the bridge; Playwright 1248 goes into the default cache; the `let` sweep finishes per visit with the lint rule after the last | — |
| sweep inventory done | analysts | Sonnet | Workflow | `wf_53634417-a82` | five manifests, with twelve junctions into live `node_modules` that are unlinked alone | `tmp/units/sweep/` |
| S1 committed | builder | Sol xhigh | T3 | `study-002-s1-sol-1` | `88acd00` with gates green | `tmp/units/study-002-s1-report.md` |
| Playwright install | Orchestrator | — | direct, user-approved | — | chromium-1248, headless-shell 1248 and ffmpeg-1013 installed in the default cache | — |
| S2 | builder | Sol xhigh | T3 | `study-002-s2-sol-1` | `--version` and the missing-file codes | `tmp/units/study-002-design.md` § 5.3 |
| W5 closure | reviewer | Astra xhigh | T3 | `ladder-w5-closure-astra-1` | closure widened to the native bridge | `tmp/units/ladder/dispatch-ledger.md` |
| sweep executor | builder | Sol xhigh | T3 | `sweep-executor-sol-1` | writes `execute.ts` and runs `--plan` only | `tmp/units/sweep/orchestrator-overrides.md` |
| S2 committed | builder | Sol xhigh | T3 | `study-002-s2-sol-1` | `f75e4ce` with C11 to C17 red first | `tmp/units/study-002-s2-report.md` |
| S3 | builder | Sol xhigh | T3 | `study-002-s3-sol-1` | the gauge guard, the quality rule and the tool projections | `tmp/units/study-002-design.md` § 5.4 |
| W5 closure result | reviewer | Astra xhigh | T3 | `ladder-w5-closure-astra-1` | CLOSURE OPEN, BRIDGE REPLACE, because the PowerShell bridge misreads UTF-8 and truncates at a NUL | `tmp/units/ladder/w5-closure-astra.md` |
| bridge replacement | user | — | AskUserQuestion | — | 2026-10-20: replace the bridge with a TypeScript native host on a pinned Node 26 through `node:ffi`, keeping Node 24 the default | — |
| pinned Node 26 | Orchestrator | — | direct, user-approved | — | Node v26.12.0 portable installed with its SHA-256 verified | `tmp/runtimes/node-v26.12.0-receipt.json` |
| W5 fix 2 | builder | Sol xhigh | T3 | `ladder-w5-fix-sol-2` | builds the TypeScript native host, spike first | `tmp/units/ladder/w5-closure-astra.md` |
| sweep records rewrite | opus, reviewer | Opus, Sonnet | Workflow | `wf_ce6937a6-0fe` | carried the standing readings into the plan and handoff and resolved the review's issues | `tmp/units/sweep/records-rewrite-{report,review}.md` |
| deviation recorded | Orchestrator | — | — | — | `quiet-run.ps1` was a PowerShell script against the script law, so the next serial runner is TypeScript | `tmp/units/realign-2/critic.md` § 5.4 |
| `local-pin.ts` clarification | Orchestrator | — | — | — | `local-pin.ts` is out of use and stays on disk for the boost campaign | — |
| sweep records commit | Orchestrator | — | direct | — | deleted eight closed verdicts, archived at `acff094`, and the `budget`, `ollama`, `scaffold` and `study` record directories | `tmp/units/sweep/agent-orkestrel.json` |
| S3 committed | builder | Sol xhigh | T3 | `study-002-s3-sol-1` | `f0c23da` with gates green | `tmp/units/study-002-s3-report.md` |
| sweep executor round 1 | builder | Sol xhigh | T3 | `sweep-executor-sol-1` | the real `--plan` refused 19 conflicts | `tmp/units/sweep/executor-report.md` |
| overrides 7 and 8 | Orchestrator | — | — | — | secret-named files go unread and unarchived, and internal links skip the target checks | `tmp/units/sweep/orchestrator-overrides.md` |
| sweep executor round 2 | builder | Sol high | T3 | `sweep-executor-sol-2` | adds the two classes and regenerates the plan with no apply | the task prompt |
| S4 | builder | Sol high | T3 | `study-002-s4-sol-1` | the package surface | `tmp/units/study-002-design.md` § 5.5 |
| records carry pass | writer, reviewer | Opus, Sonnet | Workflow | `wf_7ef1887a-348` | carries the manifests' promote rows | `tmp/units/sweep/orchestrator-overrides.md` |
| S4 committed | builder | Sol high | T3 | `study-002-s4-sol-1` | `c26c538`, completing S1 to S4 | `tmp/units/study-002-s4-report.md` |
| consumer proof V1, V2 | Orchestrator | — | direct | — | the built Study pinned into Agent's `study-002` worktree passes `check`, `test:setup` 175 and `test:studies` 100 | `tmp/units/study-002-v2-pin.json` |
| V3 tools-adopt | builder | Sol high | T3 | `study-002-v3-sol-1` | adopts C27 in the worktree | `tmp/units/study-002-design.md` § 5.6 |
| V3 mutation ruling | Orchestrator | — | T3 pending-request answer | `study-002-v3-sol-1` | C27's mutation runs in a disposable copy | — |
| sweep executor round 2 result | builder, Orchestrator | Sol high | T3; direct | `sweep-executor-sol-2` | plan `402219ce…` with 0 refusals, and override 9 keeps `replace-token.ts` | `tmp/units/sweep/executor-report.md` |
| V3 round 1 | builder, Orchestrator | Sol high | T3 | `study-002-v3-sol-1`, `study-002-v3-sol-2` | stopped at the importer safeguard, which exempts frozen consumer snapshots | `tmp/units/study-002-v3-report.md` |
| V3 round 2 | builder, Orchestrator | Sol high | T3; direct | `study-002-v3-sol-2` | `52af054` committed on `study-002-adopt` after the Orchestrator removed the scratch Codex refused | `tmp/units/study-002-v3-report.md` |
| Study 0.0.2 falsify round | reviewer, analyst | Astra xhigh, Opus | T3; Workflow | `study-002-falsify-astra-1`, `wf_9f3c432f-fad` | two lanes on claims C1 to C33 | `tmp/units/study-002-claims.md` |
| W5 fix 2 done | builder | Sol xhigh | T3 | `ladder-w5-fix-sol-2` | 61 fixtures pass and 45 source mutations each fail and restore | `tmp/units/ladder/w5-fix-2-report.md` |
| W5 closure round 2 | reviewer | Astra xhigh | T3 | `ladder-w5-closure-astra-2` | dispatched | the task prompt |
| falsify objective attempt 1 | reviewer, Orchestrator | Astra xhigh | T3 | `study-002-falsify-astra-1`, `study-002-falsify-astra-2` | the content filter stopped the lane before a verdict, so C29 was reworded neutrally and attempt 2 dispatched | `tmp/units/study-002-claims.md` |
| W5 closure round 2 result | reviewer | Astra xhigh | T3 | `ladder-w5-closure-astra-2` | PASS, CLOSED on the pinned Node v26.12.0 host | `tmp/units/ladder/w5-closure-astra-2.md` |
| W5 verifier, A and B design | verifier, designer | Luna medium, Astra high | T3 | `ladder-w5-verify-luna-3`, `ladder-ab-design-astra-1` | dispatched | `tmp/units/ladder/dispatch-ledger.md` |
| falsify subjective lane | analyst | Opus | Workflow | `wf_9f3c432f-fad` | FAIL C7, C27, C28, C29 and C31 with O1 and O2 | `tmp/units/study-002-falsify/subjective/verdict.md` |
| Node policy | user, Orchestrator | — | conversation | — | 2026-10-20: packages support Node 22 and 24 LTS only, and Node 26 stays a local tool runtime | memory `feedback-node-support` |
| Node 22.18.0 gate | user, Orchestrator | — | AskUserQuestion; direct | — | 2026-10-20: every release also gates on Node 22.18.0, whose portable runtime is installed | `tmp/runtimes/node-v22.18.0-receipt.json` |
| falsify objective attempt 2 | reviewer, Orchestrator | Astra xhigh | T3; direct | `study-002-falsify-astra-2` | FAIL C7, C28, C29 and C31, reconciled with the subjective lane into one verdict | `692e551:.orkestrel/study/study-002-audit-verdict.md` |
| S5 | builder | Sol xhigh | T3 | `study-002-s5-sol-1` | the falsify fixes | `692e551:.orkestrel/study/study-002-audit-verdict.md` |
| records carry pass done | writer, reviewer | Opus, Sonnet | Workflow | `wf_7ef1887a-348` | the promote rows carried and the apply blockers named | `tmp/units/sweep/records-carry-{report,review}.md` |
| sweep pre-apply preservation | Orchestrator | — | direct | — | backup branches and refs made, 113 worktree files copied, and plan `364b716d…` read 0 conflicts | `tmp/units/sweep/orchestrator-overrides.md` |
| sweep plan check | reviewers | Sonnet | Workflow | `wf_0bcc34f4-630` | four read-only lenses | `tmp/units/sweep/` |
| W5 accepted | verifier | Luna medium | T3 | `ladder-w5-verify-luna-3` | VERIFY: MATCH | `tmp/units/ladder/w5-verify-luna.md` |
| A and B design result | designer | Astra high | T3 | `ladder-ab-design-astra-1` | A builds first and gates G0, and B gates G2 | `tmp/units/ladder/design-ab/summary.md` |
| S5 committed | builder | Sol xhigh | T3 | `study-002-s5-sol-1` | `ffff531` with gates green on Node 24.22.0 and 22.18.0 | `tmp/units/study-002-s5-report.md` |
| sweep plan check result | reviewers | Sonnet | Workflow | `wf_0bcc34f4-630` | blocking findings in all four lenses, led by an apply that could not finish inside its cap | `tmp/units/sweep/` |
| override 11 | Orchestrator | — | direct | — | keeps the named files, defers every Study root and narrows the secret rule to credential files | `tmp/units/sweep/orchestrator-overrides.md` |
| sweep executor round 3 | builder | Sol xhigh | T3 | `sweep-executor-sol-3` | one archive per repository, batched scans and a resumable journal | `tmp/units/sweep/` |
| Study after S5 in Agent | Orchestrator | — | direct | — | `ffff531` re-pinned, with Agent `check` 0, `test:setup` 173 and `test:studies` 99 | `tmp/units/study-002-v2-repin-s5.json` |
| Study 0.0.2 closure | reviewer | Astra medium | T3 | `study-002-closure-astra-1` | closure-only check of the S5 fixes | — |
| boost unit A | builder | Sol xhigh | T3 | `ladder-unit-a-sol-1` | the driver adapter | `tmp/units/ladder/unit-a-adapter-brief.md` |
| Study 0.0.2 closure result | reviewer | Astra medium | T3 | `study-002-closure-astra-1` | CLOSED, every S5 fix within its bound | `tmp/units/study-002-falsify/closure/verdict.md` |
| `PARALLEL.md` read | Orchestrator | — | direct | — | the Veneer session prepares test 0.0.28 with no conflict with Study 0.0.2 | scaffold `PARALLEL.md` |
| release prep Study 0.0.2 | builder | Sol high | T3 | `release-study-002-sol-1` | visit, bump, gates on both Node lines and the release commit | `tmp/units/release/study-002-release-brief.md` |
| Study 0.0.2 prep blocked | builder | Sol high | T3 | `release-study-002-sol-1` | the policy gate refused "catalog package study has no hosted guide" under Scaffold 0.0.103 | `tmp/units/release/study-002-release-report.md` |
| scaffold 0.0.104 scope | user, Orchestrator | — | AskUserQuestion; direct | — | 2026-10-20: 0.0.104 takes the whole queue and the `>=22.18.0` template floor, the Bindings lint rule stays out, and G3 and G4 close as moot | scaffold `PARALLEL.md` |
| 0.0.104 design | planners, critic | Opus, Sonnet | Workflow | `wf_d20250f2-9fc` | four lane designers, a critic and a synthesis | `tmp/units/scaffold-0104/plan.md` |
| sweep executor round 3 result | builder | Sol xhigh | T3 | `sweep-executor-sol-3` | plan `97b1cdfb…` with no refusals and a projected 11.1-minute apply, not applied | `tmp/units/sweep/executor-report.md` |
| sweep round 3 check | reviewers | Sonnet | Workflow | `wf_9b54ea7e-a6d` | two read-only lenses | `tmp/units/sweep/check3-{apply,keep}.md` |
| sweep round 3 check result | reviewers | Sonnet | Workflow | `wf_9b54ea7e-a6d` | the apply path blocked twice, both failing closed, while the keep lens found 0 blocking | `tmp/units/sweep/check3-{apply,keep}.md` |
| sweep executor round 4 | builder | Sol high | T3 | `sweep-executor-sol-4` | same-path detach validation and added mutations | `tmp/units/sweep/check3-apply.md` |
| sweep executor round 4 result | builder | Sol high | T3 | `sweep-executor-sol-4` | plan `52ab5a4d…` with 0 refusals and an 11.8-minute projection against a 36-minute cap | `tmp/units/sweep/executor-report.md` |
| sweep preconditions | Orchestrator | — | direct | — | the kept diagnoses point their scratch at the sweep archive | `tmp/units/sweep/readiness-draft.mjs` |
| removed-journal pointer | Orchestrator | — | — | — | the publish journals and pin receipts that earlier rows cite are in the Agent sweep archive | `tmp/units/sweep/agent-units-files.json` |
| unit A built | builder | Sol xhigh | T3 | `ladder-unit-a-sol-1` | suite 18 passed with eight mutations each pass-fail-pass, review held for the sweep apply | `tmp/units/ladder/unit-a-report.md` |
| sweep applied | Orchestrator | — | `tmp/units/sweep/execute.ts --apply` | `tmp/units/sweep/apply-detach.json` | exit 0 in 317 s, removing 5,094 roots (7.77 GB) after nine archives were proven | `tmp/units/sweep/apply-receipt.json` |
| post-apply proof | Orchestrator | — | `tmp/units/sweep/post-apply-proof.ts` | — | 14 target manifests matched, 493 external targets existed, and no tracked file changed | `tmp/units/sweep/check-links.md` |
| sweep follow-ups | Orchestrator | — | — | — | a targeted ladder sweep, the deferred Study sweep and the `interim-ledger.md` removal stay owed | — |
| 0.0.104 design done | planners, critic | Opus, Sonnet | Workflow | `wf_d20250f2-9fc` | two worktrees, units A0 to A10 and B1 to B6, and one falsify round | `tmp/units/scaffold-0104/plan.md` |
| 0.0.104 decisions | user | — | AskUserQuestion | — | 2026-10-20: test 0.0.28 is published, `surface` reads only the staged catalog, BR-2 covers every public error class, and only the cut line to 0.0.105 is pre-authorized | — |
| `PARALLEL.md` R0a | Orchestrator | — | direct | — | took the Veneer session's sheet-template unit as A10 | scaffold `PARALLEL.md` |
| N0 naming | planner | Opus | Workflow | `wf_df0bb61e-232` | the read-only naming ruling | `tmp/units/scaffold-0104/naming.md` |
| unit A review | reviewer | Astra xhigh | T3 | `ladder-unit-a-review-astra-1` | dispatched | `tmp/units/ladder/unit-a-adapter-brief.md` |
| A10 acknowledged | Orchestrator | — | direct | — | the Veneer session acknowledged A10, and A0 pins test `^0.0.28` | `tmp/units/scaffold-0104/plan.md` § A0, § A10 |
| 0.0.104 authorization | user | — | conversation; AskUserQuestion | — | 2026-10-20: installs and local commits in the 0.0.104 worktrees and clones are authorized, worktrees only parallelize, and Codex is preferred with Claude only where needed | memory `feedback-worktrees`, `feedback-model-limits` |
| Phase 0 | Orchestrator | — | direct | — | Node 22.18.0 with npm 11 staged, worktree `0104-core` created and the old scaffold worktrees removed | scaffold `PARALLEL.md` |
| R0c Node 22 baseline | verifier | Luna medium | T3 | `scaffold-0104-r0c-luna-1` | dispatched | `tmp/units/scaffold-0104/plan.md` § 2.1 |
| N0 result | Orchestrator | — | direct | — | `naming.md` rules every open name, and its conflicts are plan ruling 13 | `tmp/units/scaffold-0104/plan.md` § 0 |
| R0c result | verifier | Luna medium | T3 | `scaffold-0104-r0c-luna-1` | NODE22: CLEAN | `tmp/units/scaffold-0104/r0c-node22-baseline.md` |
| rewording request | user, Orchestrator | — | conversation | — | 2026-10-20: reword the framing that stops a provider's content filter across scaffold's instruction set into quality-engineering language, as unit `0104-wording` | `tmp/units/scaffold-0104/wording-hits.txt` |
| `0104-wording` | writer, reviewer | Opus, Sonnet | Workflow | `wf_66f5bf1d-772` | writer, review and fix round in `0104-core` | `tmp/units/scaffold-0104/wording-rulings.md` |
| `0104-wording` result | Orchestrator | — | direct | — | 54 of 143 hits reworded and 89 kept as literal terms, committed `fa9381b94` | `tmp/units/scaffold-0104/wording-review.md` |
| A0 | builder | Sol high | T3 | `scaffold-0104-a0-sol-1` | development re-pin of browser, probe and test | `tmp/units/scaffold-0104/a0-brief.md` |
| `window.test.ts` diagnosis | builder | Sol high | T3 | `scaffold-0104-flake-sol-1` | diagnosis in a throwaway clone, patch only | `tmp/units/scaffold-0104/flake-brief.md` |
| unit A review attempt 2 | reviewer | Astra xhigh | T3 | `ladder-unit-a-review-astra-2` | FAIL A6 and A7 with O1 to O3, after neutral wording cleared the content filter | `tmp/units/ladder/unit-a-review-astra.md` |
| unit A fix round 1 | builder | Sol high | T3 | `ladder-unit-a-fix-sol-1` | five findings, each red first | `tmp/units/ladder/unit-a-fix-brief.md` |
| rewording rule | user, Orchestrator | — | AskUserQuestion | — | 2026-10-20, "Rule + sweep at visits": `writing.md` gains judged rows, and each package rewords its guide and comments at its next release visit | `tmp/units/scaffold-0104/plan.md` § 0 |
| A0 round 1 | builder | Sol high | T3 | `scaffold-0104-a0-sol-1` | stopped at `ERESOLVE` on the locked vitest 4.1.11 cluster | `tmp/units/scaffold-0104/a0-report.md` |
| A0 lock regeneration | Orchestrator | — | direct | — | the lock regenerated under the user's install authorization, with 60 entries moved inside unchanged ranges | `tmp/units/scaffold-0104/a0/lock-diff.txt` |
| A0 round 2 | builder | Sol high | T3 | `scaffold-0104-a0-sol-2` | the range sweep, build and gates | `tmp/units/scaffold-0104/a0-brief.md` |
| `window.test.ts` result | builder | Sol high | T3 | `scaffold-0104-flake-sol-1` | an inherited silent npm log level hid the refusal code, ruled as unit L9 | `tmp/units/scaffold-0104/flake-report.md` |
| A0 round 2 result | builder | Sol high | T3 | `scaffold-0104-a0-sol-2` | committed `526dd856a` | `tmp/units/scaffold-0104/a0-report.md` |
| L9 | Orchestrator | — | direct | — | the `window.ts` log-level patch committed `385bb5227` | `tmp/units/scaffold-0104/` |
| worktree `0104-skills` | Orchestrator | — | direct | — | created from `385bb5227` | scaffold `PARALLEL.md` |
| B1 | builder | Sol high | T3 | `scaffold-0104-b1-sol-1` | the title-diff port | `tmp/units/scaffold-0104/b1-brief.md` |
| `0104-wording-2` | writer, reviewer | Opus, Sonnet | Workflow | `wf_46dd6190-a9d` | writer, review and fix round | `tmp/units/scaffold-0104/wording-2-brief.md` |
| unit A fix round 1 result | builder | Sol high | T3 | `ladder-unit-a-fix-sol-1` | five findings fixed, each mutation 0/1/0 | `tmp/units/ladder/unit-a-fix-report.md` |
| unit A closure | reviewer | Astra xhigh | T3 | `ladder-unit-a-closure-astra-1` | dispatched on the five fixes | `tmp/units/ladder/unit-a-closure-brief.md` |
| B1 result | builder | Sol high | T3 | `scaffold-0104-b1-sol-1` | `titles.ts` with its proof at checkpoint `1e213028c` | `tmp/units/scaffold-0104/b1-report.md` |
| B1 review | reviewer | Astra high | T3 | `scaffold-0104-b1-review-astra-1` | on `1e213028c` | `tmp/units/scaffold-0104/b1-review-brief.md` |
| B2 | writer | Opus | Workflow | `wf_16c83ce0-573` | the skill references | `tmp/units/scaffold-0104/b2-brief.md` |
| unit A closure result | reviewer | Astra xhigh | T3 | `ladder-unit-a-closure-astra-1` | CLOSED | `tmp/units/ladder/unit-a-closure-astra.md` |
| unit A verifier | verifier | Luna medium | T3 | `ladder-unit-a-verify-luna-1` | dispatched | `tmp/units/ladder/unit-a-verify-brief.md` |
| B1 review result | reviewer | Astra high | T3 | `scaffold-0104-b1-review-astra-1` | FAIL B1.2, B1.5 and B1.6 | `tmp/units/scaffold-0104/b1-review-astra.md` |
| B1 fix round 1 | builder | Sol high | T3 | `scaffold-0104-b1-fix-sol-1` | a token scanner local to `titles.ts`, delivered as a patch | `tmp/units/scaffold-0104/b1-fix-brief.md` |
| `0104-wording-2` result | writer, reviewer | Opus, Sonnet | Workflow | `wf_46dd6190-a9d` | 8 judged rows added to `writing.md` § Substitutions and registered, committed `816df4c65` | `tmp/units/scaffold-0104/wording-2-rulings.md` |
| A1 | builder | Sol high | T3 | `scaffold-0104-a1-sol-1` | the template-claims case | `tmp/units/scaffold-0104/a1-brief.md` |
| A1 result | builder | Sol high | T3 | `scaffold-0104-a1-sol-1` | committed `604932c71` | `tmp/units/scaffold-0104/a1-report.md` |
| A2 | builder | Sol high | T3 | `scaffold-0104-a2-sol-1` | the catalog checkpoint | `tmp/units/scaffold-0104/a2-brief.md` |
| B1 fix round 1 result | builder | Sol high | T3 | `scaffold-0104-b1-fix-sol-1` | 7 regressions red first, delivered as `b1-fix.patch` | `tmp/units/scaffold-0104/b1-fix-report.md` |
| B1 closure check | reviewer | Astra high | T3 | `scaffold-0104-b1-closure-astra-1` | the patch in its own clone | `tmp/units/scaffold-0104/b1-closure-brief.md` |
| B2 result | writer | Opus | Workflow | `wf_16c83ce0-573` | `bindings.md` and `equivalence.md` added to the harden skill | `tmp/units/scaffold-0104/b2-report.md` |
| B2 checker | checker | Luna medium | T3 | `scaffold-0104-b2-check-luna-1` | B2.1, B2.2, B2.5 and B2.6 | `tmp/units/scaffold-0104/b2-check-brief.md` |
| B2 checker round 1 | checker, Orchestrator | Luna medium | T3 | `scaffold-0104-b2-check-luna-1` | FAIL by omission with three controls unrun, and B2.1's mutation restated | `tmp/units/scaffold-0104/b2-check-luna.md` |
| B2 checker round 2 | checker | Sol high | T3 | `scaffold-0104-b2-check-sol-2` | every control fresh, moved to Sol after Luna's omission | `tmp/units/scaffold-0104/b2-check-brief.md` |
| A2 result | builder, Orchestrator | Sol high | T3; direct | `scaffold-0104-a2-sol-1` | the catalog at 51 packages with Study at L7, committed `df0e6ff14` | `tmp/units/scaffold-0104/a2-report.md` |
| S-pre1 | Orchestrator | — | direct | — | the candidate at `df0e6ff14` passes Study's `test:policy` where 0.0.103 refused | `tmp/units/scaffold-0104/candidates/` |
| A3 | builder | Sol high | T3 | `scaffold-0104-a3-sol-1` | the guide whitespace fault, its guard and directive | `tmp/units/scaffold-0104/a3-brief.md` |
| B1 closure result | reviewer, Orchestrator | Astra high | T3 | `scaffold-0104-b1-closure-astra-1` | OPEN B1.5 and B1.1, ruled to one more fix round, a closure-only check and commit | `tmp/units/scaffold-0104/b1-closure-astra.md` |
| B1 fix round 2 | builder | Sol high | T3 | `scaffold-0104-b1-fix-sol-2` | a brace-kind stack and line-terminator continuations | `tmp/units/scaffold-0104/b1-fix-2-brief.md` |
| unit A verifier result | verifier, Orchestrator | Luna medium | T3 | `ladder-unit-a-verify-luna-1` | MATCH with one first-run failure from the credential-name substring guard, so acceptance waits for fix round 2 | `tmp/units/ladder/unit-a-verify-luna.md` |
| unit A fix round 2 | builder | Sol high | T3 | `ladder-unit-a-fix-sol-2` | one exact credential-name classifier | `tmp/units/ladder/unit-a-fix-2-brief.md` |
| B2 checker round 2 result | checker, Orchestrator | Sol high | T3 | `scaffold-0104-b2-check-sol-2` | PASS, and B2 committed `09a1cac9e` | `tmp/units/scaffold-0104/b2-check-luna.md` |
| B3 | writer | Opus | Workflow | `wf_94c67e6b-8aa` | the error-guard brand rule | `tmp/units/scaffold-0104/b3-brief.md` |
| A3 result | builder | Sol high | T3 | `scaffold-0104-a3-sol-1` | committed `002118928` | `tmp/units/scaffold-0104/a3-report.md` |
| A3.2 first visits | verifier | Sol medium | T3 | `scaffold-0104-a3-2-sol-1` | on the candidate `002118928` with 0.0.103 as control | `tmp/units/scaffold-0104/a3-2-brief.md` |
| A4 stage 1 | writer | Opus | Workflow | `wf_c5063786-d63` | the three surface-evidence sentences, read-only | `tmp/units/scaffold-0104/a4-brief.md` |
| A3.2 result | verifier, Orchestrator | Sol medium | T3 | `scaffold-0104-a3-2-sol-1` | not runnable before release, so the visit check moved to the first fleet visit after the push | `tmp/units/scaffold-0104/a3-2-report.md` |
| B3 writer result | writer | Opus | Workflow | `wf_94c67e6b-8aa` | the brand rule in `typescript.md` § Errors and outcomes | `tmp/units/scaffold-0104/b3-report.md` |
| B3 analyst | analyst | Astra high | T3 | `scaffold-0104-b3-analyst-astra-1` | the probe with three mutations and the fleet judgments | `tmp/units/scaffold-0104/b3-analyst-brief.md` |
| A4 stage 1 result | writer | Opus | Workflow | `wf_c5063786-d63` | three sentences settled | `tmp/units/scaffold-0104/a4-sentences.md` |
| A4 stage 2 | builder | Sol high | T3 | `scaffold-0104-a4-sol-1` | sentences, code and the flipped case | `tmp/units/scaffold-0104/a4-brief.md` |
| A4 stage 2 result | builder | Sol high | T3 | `scaffold-0104-a4-sol-1` | checkpoint `73883de58` | `tmp/units/scaffold-0104/a4-report.md` |
| A4 review | reviewer | Astra high | T3 | `scaffold-0104-a4-review-astra-1` | on `73883de58` | `tmp/units/scaffold-0104/a4-review-brief.md` |
| A5 | builder | Sol high | T3 | `scaffold-0104-a5-sol-1` | the `bin` value, the Node floor guard and the CI matrix | `tmp/units/scaffold-0104/a5-brief.md` |
| B1 fix round 2 result | builder | Sol high | T3 | `scaffold-0104-b1-fix-sol-2` | 12 regressions red first, and the stated limit refuses with exit 2 | `tmp/units/scaffold-0104/b1-fix-2-report.md` |
| B1 closure check 2 | reviewer | Astra high | T3 | `scaffold-0104-b1-closure-astra-2` | the final check under the exit rule | `tmp/units/scaffold-0104/b1-closure-2-brief.md` |
| B3 analyst result | analyst, Orchestrator | Astra high | T3 | `scaffold-0104-b3-analyst-astra-1` | FAIL B3.1, B3.2 and the text, which overclaimed refusal, with several fleet guards owing member validation | `tmp/units/scaffold-0104/b3-analyst-astra.md` |
| B3 fix round 1 | writer | Opus | Workflow | `wf_57548245-ad9` | the text correction and the judgments | `tmp/units/scaffold-0104/b3-report.md` |
| A4 review result | reviewer | Astra high | T3 | `scaffold-0104-a4-review-astra-1` | FAIL A4.4 only, a TSDoc wording | `tmp/units/scaffold-0104/a4-review-astra.md` |
| B3 fix round 1 result | writer | Opus | Workflow | `wf_57548245-ad9` | the brand reads as a recognition marker and refusal covers transparent proxies | `tmp/units/scaffold-0104/b3-report.md` |
| B3 closure | reviewer | Astra high | T3 | `scaffold-0104-b3-closure-astra-1` | dispatched | `tmp/units/scaffold-0104/b3-closure-brief.md` |
| B3 closure result | reviewer, Orchestrator | Astra high | T3 | `scaffold-0104-b3-closure-astra-1` | CLOSED and committed `3c851efb6` | `tmp/units/scaffold-0104/b3-closure-astra.md` |
| B4 | builder | Sol high | T3 | `scaffold-0104-b4-sol-1` | the shared spec helpers move | `tmp/units/scaffold-0104/b4-brief.md` |
| B1 closure 2 result | reviewer | Astra high | T3 | `scaffold-0104-b1-closure-astra-2` | CLOSED with the lexical scanner's limits stated | `tmp/units/scaffold-0104/b1-closure-2-astra.md` |
| A5 result | builder | Sol high | T3 | `scaffold-0104-a5-sol-1` | committed `5c372a868` | `tmp/units/scaffold-0104/a5-report.md` |
| A4.4 fix | Orchestrator | — | direct | — | committed `96416894a` | `tmp/units/scaffold-0104/` |
| A5 review | reviewer | Astra high | T3 | `scaffold-0104-a5-review-astra-1` | on `5c372a868` | `tmp/units/scaffold-0104/a5-review-brief.md` |
| A6 | builder | Sol high | T3 | `scaffold-0104-a6-sol-1` | the sibling-environment import refusal with a fleet scan | `tmp/units/scaffold-0104/a6-brief.md` |
| critical path | user, Orchestrator | — | conversation; AskUserQuestion | — | 2026-10-20: finish the full 0.0.104 plan on a critical path to the Study 0.0.2 publish, and pause the boost after unit A's open fix round | `tmp/units/scaffold-0104/plan.md` § Focus |
| A10 | builder | Sol high | T3 | `scaffold-0104-a10-sol-1` | the sheet template's imports from `@orkestrel/test/browser`, in a clone | `tmp/units/scaffold-0104/a10-brief.md` |
| B5 | builder | Sol high | T3 | `scaffold-0104-b5-sol-1` | the launcher's exit 127, as a patch | `tmp/units/scaffold-0104/b5-brief.md` |
| Study guard fix | builder | Sol high | T3 | `study-002-guard-sol-1` | `isStudyError` to the 0.0.104 brand rule | `tmp/units/study-002-guard-brief.md` |
| A10 question | Orchestrator | — | `t3_pending_request_respond` | `scaffold-0104-a10-sol-1` | `setup:browser` registers only when the target has a browser setup proof | `tmp/units/scaffold-0104/a10-report.md` |
| unit A accepted | builder, Orchestrator | Sol high | T3 | `ladder-unit-a-fix-sol-2` | `isCredentialName` at both sites with 24 of 24 on three runs, and the boost paused until Study 0.0.2 publishes | `tmp/units/ladder/unit-a-fix-2-report.md` |
| B4 result | builder, Orchestrator | Sol high | T3 | `scaffold-0104-b4-sol-1` | committed `adb3ac7b9`, with B1's patches applied as `0ebd87f57` and `69b74a855` | `tmp/units/scaffold-0104/b4-report.md` |
| A6 result | builder | Sol high | T3 | `scaffold-0104-a6-sol-1` | committed `980eec6be`, with the fleet scan naming guide, form, table and veneer | `tmp/units/scaffold-0104/a6-report.md` |
| A6 review | reviewer | Astra high | T3 | `scaffold-0104-a6-review-astra-1` | on `980eec6be` | `tmp/units/scaffold-0104/a6-review-brief.md` |
| A7 | builder | Sol xhigh | T3 | `scaffold-0104-a7-sol-1` | the distribution harness | `tmp/units/scaffold-0104/a7-brief.md` |
| `0104-skills` gates | Orchestrator | — | direct | — | gates green after B1's patches, `host.json` committed `8f2317b8e` | `tmp/units/scaffold-0104/` |
| B6 | builder | Sol xhigh | T3 | `scaffold-0104-b6-sol-1` | the wave visit | `tmp/units/scaffold-0104/b6-brief.md` |
| A5 review result | reviewer | Astra high | T3 | `scaffold-0104-a5-review-astra-1` | FAIL A5.3, because a decoy row keeps the Node-floor case green | `tmp/units/scaffold-0104/a5-review-astra.md` |
| A5 fix round 1 | builder | Sol high | T3 | `scaffold-0104-a5-fix-sol-1` | the matrix read scoped to the `ci` job, as a patch | `tmp/units/scaffold-0104/a5-fix-brief.md` |
| B5 result | builder | Sol high | T3 | `scaffold-0104-b5-sol-1` | a synchronous spawn refusal takes the exit-127 path, delivered as `b5.patch` | `tmp/units/scaffold-0104/b5-report.md` |
| A6 review result | reviewer | Astra high | T3 | `scaffold-0104-a6-review-astra-1` | PASS, and A6 accepted | `tmp/units/scaffold-0104/a6-review-astra.md` |
| A7 first builder | builder | Sol xhigh | T3 | `scaffold-0104-a7-sol-1` | stopped by the provider at capacity mid-build, with the partial diff saved | `tmp/units/scaffold-0104/a7-partial.patch` |
| A7 continuation | builder | Astra xhigh | T3 | `scaffold-0104-a7-astra-2` | engine substitution: Sol at capacity, so A7's review goes to a third engine | `tmp/units/scaffold-0104/a7-brief.md` |
| B6 round 1 | builder | Sol xhigh | T3 | `scaffold-0104-b6-sol-1` | stopped at P1, because the fixtures installed with no `ERESOLVE` to prove against | `tmp/units/scaffold-0104/b6-report.md` |
| B6 round 2 | builder | Sol xhigh | T3 | `scaffold-0104-b6-sol-2` | the P1 fixture mirrors A0's real `ERESOLVE` | `tmp/units/scaffold-0104/b6-brief.md` |
| B5 apply attempt | Orchestrator | — | direct | — | `git am --3way` conflicted in the dispatch `SKILL.md` and was aborted with the worktree clean | — |
| A5 fix round 1 result | builder, Orchestrator | Sol high | T3 | `scaffold-0104-a5-fix-sol-1` | decoy controls 0/1/0, with `a5-fix.patch` applied after A7 | `tmp/units/scaffold-0104/a5-fix-report.md` |
| Study guard fix result | builder | Sol high | T3 | `study-002-guard-sol-1` | `StudyError` stamps its brand and `isStudyError` checks every member, uncommitted | `tmp/units/study-002-guard-report.md` |
| Study guard review | reviewer | Astra high | T3 | `study-002-guard-review-astra-1` | by the analyst who found the defect | `tmp/units/study-002-guard-review-brief.md` |
| A10 result | builder | Sol high | T3 | `scaffold-0104-a10-sol-1` | committed `50f0809f7` in its clone, finding that `inspectSheetConfiguration` still requires `tests/setupStyles.ts` | `tmp/units/scaffold-0104/a10-report.md` |
| A10 round 2 | builder | Sol high | T3 | `scaffold-0104-a10-sol-2` | `inspectSheetConfiguration` made presence-based | `tmp/units/scaffold-0104/a10-report.md` |
| Study guard review result | reviewer | Astra high | T3 | `study-002-guard-review-astra-1` | FAIL 1 and 4, because a class-instance `stop` is refused | `tmp/units/study-002-guard-review-astra.md` |
| Study guard fix round 2 | builder | Sol high | T3 | `study-002-guard-sol-2` | recognizes every value the declared types admit | `tmp/units/study-002-guard-report.md` |
| A10 round 2 result | builder | Sol high | T3 | `scaffold-0104-a10-sol-2` | committed `f6589f874`, with a vendored `config.test.ts` expectation still listing `tests/setupStyles.ts` | `tmp/units/scaffold-0104/a10-report.md` |
| A10 round 3 | builder | Sol high | T3 | `scaffold-0104-a10-sol-3` | that expectation made presence-based | `tmp/units/scaffold-0104/a10-report.md` |
| Study guard fix round 2 result | builder | Sol high | T3 | `study-002-guard-sol-2` | structural `stop` validation, uncommitted | `tmp/units/study-002-guard-report.md` |
| Study guard closure | reviewer | Astra high | T3 | `study-002-guard-closure-astra-1` | on findings 1 and 4 | `tmp/units/study-002-guard-closure-astra.md` |
| Study guard closure result | reviewer, Orchestrator | Astra high | T3 | `study-002-guard-closure-astra-1` | CLOSED and committed `6c76c3e`, leaving Study 0.0.2 waiting on Scaffold 0.0.104 alone | `tmp/units/study-002-guard-closure-astra.md` |
| A10 round 3 result | builder | Sol high | T3 | `scaffold-0104-a10-sol-3` | committed `0a9f8e1b4` | `tmp/units/scaffold-0104/a10-report.md` |
| A10s | writer | Opus | Workflow | `wf_599bd422-3c0` | three rule passages in the A10 clone | `tmp/units/scaffold-0104/a10-report.md` |
| A10s result | writer, Orchestrator | Opus | Workflow | `wf_599bd422-3c0` | committed `d837fd1c1` and `fef1a1332`, with the five A10 commits exported as patches | `tmp/units/scaffold-0104/a10-patches/` |
| B6 round 2 result | builder | Sol xhigh | T3 | `scaffold-0104-b6-sol-2` | both fixtures refuse with `ERESOLVE` on npm 12.0.2 and 11.21.1, checkpoint `43ef5cc2e` | `tmp/units/scaffold-0104/b6-report.md` |
| B5 apply | Orchestrator | — | direct | — | the conflict resolved and committed `3bd07764d` | `tmp/units/scaffold-0104/` |
| `ANALYSIS.md` request | user, writer | Astra xhigh | T3 | `agent-analysis-astra-1` | 2026-10-20: Astra writes an evidence-only analysis of records and compaction at Agent's root | `tmp/units/analysis-brief.md` |
| `0104-skills` gates after B5 | Orchestrator | — | direct | — | gates green with `host.json` at `19060b557`, B1 to B6 built | `tmp/units/scaffold-0104/` |
| B6 review | reviewer | Astra high | T3 | `scaffold-0104-b6-review-astra-1` | on `43ef5cc2e` | `tmp/units/scaffold-0104/b6-review-brief.md` |
| A7 continuation result | builder | Astra xhigh | T3 | `scaffold-0104-a7-astra-2` | the harness and its proofs with mutations 0/1/0, uncommitted | `tmp/units/scaffold-0104/a7-report.md` |
| A7s | writer | Opus | Workflow | `wf_1352063d-fe2` | the rule and guide sentences at the handoff anchors | `tmp/units/scaffold-0104/a7-report.md` |
| A7s result | writer, Orchestrator | Opus | Workflow | `wf_1352063d-fe2` | A7 and A7s committed `f48ff84ac` | `tmp/units/scaffold-0104/a7-report.md` |
| `0104-core` integration | Orchestrator | — | direct | — | `a5-fix.patch` and the five A10 patches applied | `tmp/units/scaffold-0104/` |
| A7 review | reviewer | Opus | Workflow | `wf_9b212f9d-1f6` | on an engine other than both builders | `tmp/units/scaffold-0104/a7-review-brief.md` |
| B6 review result | reviewer, Orchestrator | Astra high | T3 | `scaffold-0104-b6-review-astra-1` | FAIL B6.3 and B6.14, because a cleanup failure might delete the restored tree | `tmp/units/scaffold-0104/b6-review-astra.md` |
| B6 fix round 1 | builder | Sol xhigh | T3 | `scaffold-0104-b6-fix-sol-1` | F1, F2, O1 and O2, each red first | `tmp/units/scaffold-0104/b6-report.md` |
| `ANALYSIS.md` result | writer | Astra xhigh | T3 | `agent-analysis-astra-1` | written at Agent's root in 493 lines and left untracked for the user | `.orkestrel/agent/evidence.md` |
| integration gates | Orchestrator | — | direct | — | `test:guides` failed 3 cases that expect A10's removed seed | `tmp/units/scaffold-0104/` |
| A10 guides follow-up | builder | Sol high | T3 | `scaffold-0104-a10-guides-sol-1` | the three cases to the presence-based contract | `tmp/units/scaffold-0104/a10-guides-report.md` |
| A10 guides result | builder, Orchestrator | Sol high | T3 | `scaffold-0104-a10-guides-sol-1` | committed `b0dc5c25a` | `tmp/units/scaffold-0104/a10-guides-report.md` |
| A8 | builder | Sol high | T3 | `scaffold-0104-a8-sol-1` | the distribution proofs as harness case rows | `tmp/units/scaffold-0104/a8-brief.md` |
| B6 fix round 1 result | builder, Orchestrator | Sol xhigh | T3 | `scaffold-0104-b6-fix-sol-1` | committed `a9300e131` | `tmp/units/scaffold-0104/b6-report.md` |
| B6 closure | reviewer | Astra high | T3 | `scaffold-0104-b6-closure-astra-1` | on `a9300e131` | `tmp/units/scaffold-0104/b6-closure-astra.md` |
| A7 review result | reviewer | Opus | Workflow | `wf_9b212f9d-1f6` | FAIL A7.9, because the frozen proof fixture held a draft and not the emitted proof | `tmp/units/scaffold-0104/a7-review.md` |
| A7 fix round 1 | builder | Sol high | T3 | `scaffold-0104-a7-fix-sol-1` | four findings red first, as a patch series | `tmp/units/scaffold-0104/a7-fix-brief.md` |
| B6 closure result | reviewer, Orchestrator | Astra high | T3 | `scaffold-0104-b6-closure-astra-1` | CLOSED, and B1 to B6 accepted | `tmp/units/scaffold-0104/b6-closure-astra.md` |
| `PROPOSAL.md` note | user | — | conversation | — | 2026-10-20: leave `PROPOSAL.md` and `ANALYSIS.md` unread while 0.0.104 and Study 0.0.2 close; superseded on 2026-10-21 | — |
| A8 result | builder | Sol high | T3 | `scaffold-0104-a8-sol-1` | `test:distribution` failed 2 cases, an A10 consequence and a bare starter the scans refused | `tmp/units/scaffold-0104/a8-report.md` |
| A8 round 2 | builder | Sol high | T3 | `scaffold-0104-a8-sol-2` | under the ruling that the bare-starter invariant stands and a scan with nothing to inspect passes | `tmp/units/scaffold-0104/a8-report.md` |
| A7 fix round 1 result | builder, Orchestrator | Sol high | T3 | `scaffold-0104-a7-fix-sol-1` | four patches, the frozen proof byte-equal to each emitted variant | `tmp/units/scaffold-0104/a7-fix-report.md` |
| A7 closure | reviewer | Opus | Workflow | `wf_92e5169b-3ac` | closure-only check | `tmp/units/scaffold-0104/a7-closure.md` |
| A8 round 2 result | builder, Orchestrator | Sol high | T3 | `scaffold-0104-a8-sol-2` | A8 committed `aee49ab72` and A7's patches applied | `tmp/units/scaffold-0104/a8-report.md` |
| A8 review | reviewer | Astra high | T3 | `scaffold-0104-a8-review-astra-1` | on `aee49ab72` | `tmp/units/scaffold-0104/a8-review-brief.md` |
| A7 closure result | reviewer | Opus | Workflow | `wf_92e5169b-3ac` | CLOSED, and A7 accepted | `tmp/units/scaffold-0104/a7-closure.md` |
| gates after A8 | Orchestrator | — | direct | — | 12 gates exit 0, `host.json` committed `f00a757d1` | `tmp/units/scaffold-0104/` |
| A9 | builder | Sol high | T3 | `scaffold-0104-a9-sol-1` | the optional `tree` project | `tmp/units/scaffold-0104/a9-brief.md` |
| falsify claims | Orchestrator | — | direct | — | F1 to F34 written | `tmp/units/scaffold-0104/0104-claims.md` |
| Veneer report | Orchestrator | — | direct | — | B, the full-browser resolver, goes in 0.0.104 as L11, and I goes to the probe queue | scaffold `PARALLEL.md` |
| L11 | builder | Sol high | T3 | `scaffold-0104-l11-sol-1` | the full-browser resolver in a clone | `tmp/units/scaffold-0104/l11-brief.md` |
| A8 review result | reviewer | Astra high | T3 | `scaffold-0104-a8-review-astra-1` | FAIL A8.1, because the source-map scan concealed a core copy | `tmp/units/scaffold-0104/a8-review-astra.md` |
| A8 fix round 1 | builder | Sol high | T3 | `scaffold-0104-a8-fix-sol-1` | per-output map matching, as a patch | `tmp/units/scaffold-0104/a8-report.md` |
| A9 round 1 | builder, Orchestrator | Sol high | T3 | `scaffold-0104-a9-sol-1` | stopped at the ownership boundary, then three files added to its scope | `tmp/units/scaffold-0104/a9-report.md` |
| A9 round 2 | builder | Sol high | T3 | `scaffold-0104-a9-sol-2` | with the expanded ownership | `tmp/units/scaffold-0104/a9-report.md` |
| L11 result | builder, Orchestrator | Sol high | T3 | `scaffold-0104-l11-sol-1` | `resolveBrowser` returns the managed executable, delivered as `l11.patch` | `tmp/units/scaffold-0104/l11-report.md` |
| A8 fix round 1 result | builder, Orchestrator | Sol high | T3 | `scaffold-0104-a8-fix-sol-1` | `a8-fix.patch` red first with mutations 0/1/0 | `tmp/units/scaffold-0104/a8-report.md` |
| A8 closure | reviewer | Astra high | T3 | `scaffold-0104-a8-closure-astra-1` | on the patch | `tmp/units/scaffold-0104/a8-closure-astra.md` |
| A9 round 2 result | builder | Sol high | T3 | `scaffold-0104-a9-sol-2` | the `tree` fact built, uncommitted | `tmp/units/scaffold-0104/a9-report.md` |
| A9s | writer | Opus | Workflow | `wf_036e83cf-14b` | rule rows and guide sentences for `tree` | `tmp/units/scaffold-0104/a9-report.md` |
| A9s result | writer, Orchestrator | Opus | Workflow | `wf_036e83cf-14b` | A9 and A9s committed `45e5ffc5c`, with the A8 and L11 patches applied | `tmp/units/scaffold-0104/a9-report.md` |
| A9 review | reviewer | Astra high | T3 | `scaffold-0104-a9-review-astra-1` | on `45e5ffc5c` | `tmp/units/scaffold-0104/a9-review-brief.md` |
| I1 | Orchestrator | — | direct | — | `0104-skills` merged into `0104-core` as `a37f6e525` | `tmp/units/scaffold-0104/i1-build.log` |
| A8 closure result | reviewer, Orchestrator | Astra high | T3 | `scaffold-0104-a8-closure-astra-1` | CLOSED, and A8 accepted | `tmp/units/scaffold-0104/a8-closure-astra.md` |
| A9 review result | reviewer, Orchestrator | Astra high | T3 | `scaffold-0104-a9-review-astra-1` | FAIL A9.3 on a case-folding check, fixed by the Orchestrator at `27ddd09aa` and A9 accepted | `tmp/units/scaffold-0104/a9-review-astra.md` |
| I1 gates | Orchestrator | — | direct | — | the quiet gate run on `27ddd09aa` | `tmp/units/scaffold-0104/` |
| falsify and R3 briefs | Orchestrator | — | direct | — | written | `tmp/units/scaffold-0104/0104-falsify-brief.md` |
| I1 gates result | Orchestrator | — | direct | — | release-mode distribution lacked three staged files, added and committed `af6046d03` | `tmp/units/scaffold-0104/` |
| falsify objective lane | analyst | Astra xhigh | T3 | `scaffold-0104-falsify-astra-1` | on `af6046d03` | `tmp/units/scaffold-0104/0104-falsify-objective.md` |
| falsify subjective lane | reviewer | Opus | Workflow | `wf_af695137-acc` | on `af6046d03` | `tmp/units/scaffold-0104/0104-falsify-subjective.md` |
| falsify checker | checker | Sol high | T3 | `scaffold-0104-falsify-checker-sol-1` | F2, F5, F22 and F24 | `tmp/units/scaffold-0104/0104-falsify-checker.md` |
| R3 | builder | Sol high | T3 | `scaffold-0104-r3-sol-1` | the release preparation | `tmp/units/scaffold-0104/r3-brief.md` |
| falsify checker result | checker | Sol high | T3 | `scaffold-0104-falsify-checker-sol-1` | PASS | `tmp/units/scaffold-0104/0104-falsify-checker.md` |
| R3 result | builder, Orchestrator | Sol high | T3 | `scaffold-0104-r3-sol-1` | version 0.0.104 committed as "Prepare Scaffold 0.0.104" | `tmp/units/scaffold-0104/r3-report.md` |
| S-pre2 | verifier | Sol medium | T3 | `scaffold-0104-s-pre2-sol-1` | Study's `prepublishOnly` against the candidate `7fdadc6ea` on both Node lines | `tmp/units/scaffold-0104/s-pre2-brief.md` |
| S-pre2 result | verifier, Orchestrator | Sol medium | T3 | `scaffold-0104-s-pre2-sol-1` | FAIL, a Study test defect that allocates scratch under a missing `tmp/` | `tmp/units/scaffold-0104/s-pre2-report.md` |
| Study scratch-parent fix | builder | Sol high | T3 | `study-002-scratch-sol-1` | one setup helper creates the parent first | `tmp/units/study-002-scratch-report.md` |
| Study scratch fix result | builder, Orchestrator | Sol high | T3 | `study-002-scratch-sol-1` | a fresh clone's `test:src` passes 735, committed on Study `main` | `tmp/units/study-002-scratch-report.md` |
| falsify objective result | analyst, Orchestrator | Astra xhigh | T3 | `scaffold-0104-falsify-astra-1` | FAIL F16, F20 and F31 with O1, where F16 is restated, F31 holds, and F20 and O1 go to one fix unit | `tmp/units/scaffold-0104/0104-falsify-objective.md` |
| wave fix unit | builder | Sol xhigh | T3 | `scaffold-0104-fix-wave-sol-1` | F20 exact containment and O1 the real built CLI | `tmp/units/scaffold-0104/0104-fix-wave-report.md` |
| falsify subjective result | reviewer, Orchestrator | Opus | Workflow | `wf_af695137-acc` | FAIL F16, F23, F29 and F34 with O1 to O3, where F23 goes to a fix unit and F34 with O1 to O3 to one text unit | `tmp/units/scaffold-0104/0104-falsify-subjective.md` |
| F23 fix | builder | Sol high | T3 | `scaffold-0104-fix-f23-sol-1` | `it.each` tables read through the token scanner | `tmp/units/scaffold-0104/f23-report.md` |
| F23 fix result | builder, Orchestrator | Sol high | T3 | `scaffold-0104-fix-f23-sol-1` | `f23.patch` with mutations 0/1/0 | `tmp/units/scaffold-0104/f23-report.md` |
| wave fix result | builder, Orchestrator | Sol xhigh | T3 | `scaffold-0104-fix-wave-sol-1` | committed `a4e0e4ed9`, with `f23.patch` applied as `0a2d0dfc0` | `tmp/units/scaffold-0104/0104-fix-wave-report.md` |
| text fix unit | builder | Sol high | T3 | `scaffold-0104-fix-text-sol-1` | F34, O2, O3 and the L10 budgets | `tmp/units/scaffold-0104/fix-text-brief.md` |
| closure F20 and O1 | reviewer | Astra high | T3 | `scaffold-0104-wave-closure-astra-1` | on `a4e0e4ed9` | `tmp/units/scaffold-0104/wave-closure-astra.md` |
| closure F23 | reviewer | Opus | Workflow | `wf_7771f448-95e` | on `0a2d0dfc0` | `tmp/units/scaffold-0104/f23-closure.md` |
| closure F20 and O1 result | reviewer | Astra high | T3 | `scaffold-0104-wave-closure-astra-1` | CLOSED | `tmp/units/scaffold-0104/wave-closure-astra.md` |
| closure F23 result | reviewer | Opus | Workflow | `wf_7771f448-95e` | CLOSED | `tmp/units/scaffold-0104/f23-closure.md` |
| text fix result | builder, Orchestrator | Sol high | T3 | `scaffold-0104-fix-text-sol-1` | committed, with every falsify finding closed or ruled | `tmp/units/scaffold-0104/fix-text-report.md` |
| falsify round closed | Orchestrator | — | direct | — | the reconciled verdict written and release candidate `408a9924d` named | `692e551:.orkestrel/scaffold/0104-audit-verdict.md` |
| R4 | verifier | Sol medium | T3 | `scaffold-0104-r4-sol-1` | standalone release clones on Node 24.22.0 and 22.18.0 at `408a9924d` | `tmp/units/scaffold-0104/r4-brief.md` |
| R4 result | verifier, Orchestrator | Sol medium | T3 | `scaffold-0104-r4-sol-1` | PASS on both Node lines, and the candidate packed | `tmp/units/scaffold-0104/r4-report.md` |
| S-pre2 rerun | verifier | Sol medium | T3 | `scaffold-0104-s-pre2-sol-2` | Study `8637f32` against `408a9924d` | `tmp/units/scaffold-0104/s-pre2-report.md` |
| push approval | user, Orchestrator | — | AskUserQuestion; direct | — | 2026-10-20: fast-forward scaffold `main` to `408a9924d` and push, done | scaffold `PARALLEL.md` |
| S-pre2 rerun result | verifier, Orchestrator | Sol medium | T3 | `scaffold-0104-s-pre2-sol-2` | PASS on both Node lines | `tmp/units/scaffold-0104/s-pre2-report.md` |
| Scaffold 0.0.104 published | user, Orchestrator | — | `window.ts` | — | published with the user's one-time code, the served integrity equal to the packed candidate | scaffold `PARALLEL.md` |

## Fleet repair onto 0.0.104, the boost resume and the consolidation (2026-10-20 to 2026-10-21)

| Unit | Role | Engine | Transport | Id | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Study 0.0.2 release round 2 | builder | Sol high | T3 | `study-002-release-sol-2` | the full visit, bump and gates, with the publish left for the one-time code | `tmp/units/release/study-002-release-brief.md` |
| Study 0.0.2 release result | builder, Orchestrator | Sol high | T3 | `study-002-release-sol-2` | "Release 0.0.2" `1f33206` pushed with `prepublishOnly` green on Node 24.22.0 and 22.18.0 | `tmp/units/release/study-002-release-report-2.md` |
| Study 0.0.2 published | user, Orchestrator | — | `window.ts` | — | published with the user's one-time code, meeting the goal of Study 0.0.2 on Scaffold 0.0.104 | — |
| Agent takes Study 0.0.2 | builder | Sol high | T3 | `agent-study-002-adopt-sol-1` | merge `study-002-adopt`, take `^0.0.2` and remove the worktree | `tmp/units/release/study-002-adopt-report.md` |
| Agent takes Study 0.0.2 result | builder | Sol high | T3 | `agent-study-002-adopt-sol-1` | `34fd553` merged and `1153752` "Take Study 0.0.2" committed, nothing pushed | `tmp/units/release/study-002-adopt-report.md` |
| Orchestrator error | Orchestrator | — | direct | — | ledger commit `04bb3ad` swept in the user's staged `PROPOSAL.md`, reported to the user | — |
| campaign cleanup R9 | Orchestrator | — | direct | — | the 0.0.104 worktrees and the three release clones removed | scaffold `PARALLEL.md` |
| `PROPOSAL.md` tracked | user | — | AskUserQuestion | — | 2026-10-20: keep `PROPOSAL.md` tracked as committed; superseded by the Cleanup ruling | — |
| visit split | user | — | AskUserQuestion | — | 2026-10-20: the Agent session repairs its packages to Scaffold 0.0.104, the Veneer session takes test, veneer, form, table, guide, html and workspace, and `ANALYSIS.md` is committed at `d925990` | scaffold `PARALLEL.md` |
| fleet repair onto 0.0.104 | builder | Sol high | T3 | `fleet-0104-repair-lane{1,2,3}-sol-1` | nine packages repaired, gated and pushed with no bump, each visit running `scaffold catalog` explicitly | `tmp/units/release/fleet-0104-repair-lane{1,2,3}.md` |
| Agent onto 0.0.104 | Orchestrator | — | direct | — | `2d2b964` formats the root notes under the user's ruling and `5104fef` repairs Agent, unpushed | `tmp/units/release/` |
| boost resumes | builder | Sol high | T3 | `ladder-unit-b-sol-1` | unit B dispatched on Agent `5104fef` | `tmp/units/ladder/dispatch-ledger.md` |
| unit B accepted | builder, reviewers | Sol high, Astra xhigh, Luna | T3 | `ladder-unit-b-*` | review FAIL, fix round, closure CLOSED and Luna MATCH, suite 38 of 38 | `tmp/units/ladder/dispatch-ledger.md` |
| next wave | user, Orchestrator | Astra high | T3 | `ladder-w3-design-astra-1`, `ladder-wave2-design-astra-1` | 2026-10-21: the next wave follows the ladder with `PROPOSAL.md` unread, and the W3 and wave-2 brief designs are dispatched | `tmp/units/ladder/` |
| wave 2 | builder | Sol high | T3 | `ladder-w{6,7,8}-sol-1` | W6, W7 and W8 dispatched from briefs frozen at checkpoint `42c9a0f` | `tmp/units/ladder/dispatch-ledger.md` |
| W6-COLD, U1c | user | — | AskUserQuestion | — | 2026-10-21: G0's cold state is model unload, and G0 screens Ollama 0.40.7 | `tmp/units/ladder/dispatch-ledger.md` |
| wave 2 state | builders, reviewers | Sol, Astra, Luna | T3 | `ladder-w7-*`, `ladder-w8-fix-sol-1`, `ladder-w6-review-astra-1`, `ladder-runner-0407-sol-1`, `study-st-sol-1` | W7 accepted at `8c62459` while W6, W8, the runner pin and S-T owe their next steps | `.orkestrel/agent/ledger.md` |
| session close | user | — | AskUserQuestion | — | 2026-10-21: close the Agent session on Claude and Cursor models, write the handoff and sweep scratch only | — |
| scratch sweep | Orchestrator, plan reviewer | Opus, Sonnet | Workflow | `wf_3d4335a6-cb7` | 41.16 GB (441,330 files) removed from accepted units with no added dangling reference | `tmp/units/sweep-1021/` |
| handoff | Orchestrator, critic, fact check | Opus, Sonnet | Workflow | `wf_7bc82738-046` | `.orkestrel/agent/handoff.md` rewritten and checked for completeness and fact | `36ab8be` |
| BOOSTS request | user | — | conversation | — | 2026-10-21: write `BOOSTS.md` and read `ANALYSIS.md`, `PROPOSAL.md` and `RESULTS.md`, superseding the rulings that left `PROPOSAL.md` unread | `tmp/units/review-1021-ledger.md` |
| boosts review dispatches | distiller, researcher, verifier | Sonnet, Haiku | T3, then Workflow | `review-1021-*-r1`, `wf_ca4871b0-b8d`, `wf_4db409b9-5a2`, `wf_e221aaab-e8f` | bench substitution: six T3 children and a Grok lane flooded the host, so Grok was recorded dark for tool-using lanes and every lane reran as an in-process node | `tmp/units/review-1021-ledger.md` |
| boosts review result | Orchestrator | Fable | direct | — | `BOOSTS.md` written with a ruling per boost and per root document | `.orkestrel/agent/boosts.md` |
| Cleanup | user | — | conversation | — | 2026-10-21: consolidate `.orkestrel`, absorb the four root documents and retire the legacy harness, then review, fix, commit and push | `tmp/units/orkestrel/design.md` |
| `.orkestrel` map | grok | Grok 4.7 | T3 `delegate_task`, provider `cursor` | `orkestrel-map-grok-1` | a file map with dispositions, the decision-bearing statements, a ledger census and 12 contradictions | `tmp/cursor/orkestrel-map-report.md` |
| `.orkestrel` writers | opus | Opus | Workflow | `wf_e21959fa-bbb` | four writer units one at a time: `.orkestrel/agent/evidence.md`, `.orkestrel/agent/boosts.md`, `.orkestrel/agent/plan.md` with `.orkestrel/agent/ledger.md`, then the fleet plan with the fleet ledger | `tmp/units/orkestrel/design.md` |
| W6 and W8 accepted | builders, reviewers, verifier | Sol, Astra, Luna | T3 | `ladder-w6-*`, `ladder-w8-*` | W6 closure CLOSED and verified with a ruled MISMATCH; W8 closure CLOSED on round 2, verifier MATCH on round 2, the regenerated readings promoted | `.orkestrel/agent/ledger.md` |
| S-T collaborator | builder, reviewers, verifier | Sol xhigh, Astra xhigh, Luna dark → Haiku | T3; Workflow | `study-st-*`, `wf_3b364667-5d5` | review FAIL C3 and C6, fix at Study `st-collaborator` `2ad4fb2`, closure CLOSED, verifier MATCH; the branch held for the release steps | `.orkestrel/agent/ledger.md` |
| Codex MCP start | user, Orchestrator | — | conversation | `codex-bench-probe-{1,2,3}` | 2026-10-21: every Codex session failed on a required MCP entry whose checkout was gone; bench substitution Astra → Opus for the fleet writer and Luna → Haiku for the S-T verifier; the user repointed `~/.codex/config.toml` and Codex came back on probe 3 | `tmp/units/review-1021-ledger.md` |
| fleet records | opus, verifier | Opus dark → Astra dark → Opus, Haiku | T3; Workflow | `orkestrel-fleet-astra-1`, `wf_3b364667-5d5` | the fleet plan and ledger rewritten on Opus after the Claude session limit reset | `.orkestrel/plan.md` |
| relocation and deletion sweep | Orchestrator | — | direct | — | the endurance sources moved to `studies/endurance/sources/` with hashes unchanged; the retired records, harness, tools, lifecycle, history and the four root documents removed from the tree, readable at `692e551`; `git ls-files .orkestrel` lists six records | `.orkestrel/agent/ledger.md` |
| `.orkestrel` review | analyst, reviewer | Astra xhigh, Opus xhigh | T3; Workflow | `orkestrel-review-astra-1`, `wf_f7660736-28d` | fourteen claims over the six records, the relocated sources and the gates, two blind lanes | `tmp/units/orkestrel/review-brief.md` |
| `.orkestrel` review result | analyst, reviewer, Orchestrator | Astra xhigh, Opus xhigh | T3; Workflow | `orkestrel-review-astra-1`, `wf_f7660736-28d` | Astra FAIL 1, 2, 4, 6, 8, 9, 10, 11, 12; Opus FAIL 1, 7, 8, 9, 11 with O1 to O6; one fix round with a Sonnet closure check (`wf_12535197-e9d`), then the commit and the push | `.orkestrel/agent/ledger.md` |
| Cleanup committed | Orchestrator | — | direct | — | `c179edd` "Consolidate .orkestrel into six records and retire the legacy harness": 17 kept or moved paths, 1,528 deletions, pushed to `origin/main` | `c179edd` |
| Decisions | user; Orchestrator | — | conversation; direct | — | the open decisions delegated to the Orchestrator on 2026-10-21: Study 0.0.3 carries S-T and Study's next-release units (F-dist, F-floor, F-wording, F-errors where owed) after the S-T hold lifts; the Study worktree sweep runs in Study's release visit | `.orkestrel/agent/plan.md` § Rulings in force (Decisions) |

## Mechanisms campaign (2026-10-23)

| Unit | Role | Engine | Transport | Id | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| U20 | user | — | conversation | — | "Proceed with building the four promotable mechanisms properly into Study, process and ollama"; the Mechanisms campaign opens | `.orkestrel/plan.md` § Mechanisms campaign |
| absorb maps | Orchestrator | — | direct | — | `map.ts` trees and export lines over process, Ollama and Study, and the witness tree (67 files, 18,244 lines); the registry read process 0.0.15, Ollama 0.0.24, Study 0.0.2, Agent 0.0.31, contract 0.0.19 and emitter 0.0.12 | `tmp/units/mech/` |
| `mech-absorb-witnesses` | grok | Grok 4.7 | T3 `delegate_task`, provider `cursor` | `mech-absorb-witnesses-1` | completed: M1 to M4 and E1 to E7 map to preserved sources; P1 to P5 and the executable lock survive only in the W5 records, because the native sources were deleted with the bench; witnesses that start the bench launcher cannot run until a host replaces it | `tmp/units/mech-absorb-witnesses-report.md` |
| `mech-absorb-process` | distiller | Sonnet | in-process Agent tool | — | completed: process reaches descendants only while the root lives, holds no birth-time identity and has no host-death route; P1 absent, P2 partial, P3 partial while the root lives and absent after, P4 partial, P5 NUL refusal present and host refusal absent; the narrowest seam is one optional grouped key read by `Supervisor`; lsp, mcp, scaffold and sea call none of the termination helpers | `tmp/units/mech-absorb-process-report.md` |
| `mech-absorb-study` | distiller | Sonnet | in-process Agent tool | — | completed: Study materializes nothing (M1 absent, M2 to M4 partial), keeps no raw exchange bytes or digests and has no replay (E1 and E6 absent, the rest partial), and charges metadata calls to the model quota; it launches workers through `node:child_process`; Agent's memory study sends every model request through Study's transport; `st-collaborator` edits the same four transport files | `tmp/units/mech-absorb-study-report.md` |
| `mech-absorb-ollama` | distiller | Sonnet | in-process Agent tool | — | completed: Ollama is core-only; D1 and D3 absent, D2 and D4 partial; adding process makes no cycle; Study is the only runtime dependent; the daemon session cannot name custody until process publishes; `Process`, `ProcessManager`, `Session` and `Supervisor` are taken names | `tmp/units/mech-absorb-ollama-report.md` |
| `mech-absorb-research` | researcher | Sonnet | in-process Agent tool | — | completed: `node:ffi` is absent from Node 22 and 24; libuv puts only direct non-detached children in its kill-on-close job, so grandchildren and detached children outlive the host; the viable Node 22 and 24 routes need a native component (a prebuilt helper, a Node-API addon or `koffi`, which needs the user's authorization) or PowerShell against `../scaffold/AGENTS.md:48`; Linux has process groups with cgroup v2, and macOS covers root exit and group kill only | `tmp/units/mech-absorb-research-report.md` |
| `mech-design` analyst | analyst | Astra xhigh | T3 `delegate_task`, provider `codex` | `mech-design-analyst-1` | dispatched, blind to the planner | `tmp/units/mech-design-brief.md` |
| `mech-design` planner | planner | Opus | Workflow | `wf_b2abb1df-e0a` | dispatched, blind to the analyst | `tmp/units/mech-design-brief.md` |
| U21 | user | — | conversation | — | "once all this is set up … we work on those promising ideas, make sure we don't forget": the boost campaign resumes on the unrun ideas when the Mechanisms campaign lands | `.orkestrel/agent/plan.md` § Rulings in force (U21) |
| U22 | user | — | conversation | — | rejected the native custody routes (`koffi`, a Node-API addon, a C# helper) as out of scope; P1 to P5 waived, process not released, native-only D clauses fall back to pure-Node detection; the planner design (`wf_b2abb1df-e0a`, 558 lines, `koffi` recommended) is reconciled under it | `.orkestrel/agent/plan.md` § Rulings in force (U22); `tmp/units/mech-design-planner.md` |
| `mech-design` planner result | planner | Opus | Workflow | `wf_b2abb1df-e0a` | 628 lines: `koffi` custody host, `OllamaDaemon`, `materialize` with `freeze` and `execute --closure`, per-trial exchange sidecars, 27 units in nine waves | `tmp/units/mech-design-planner.md` |
| `mech-design` analyst result | analyst | Astra xhigh | T3 `delegate_task`, provider `codex` | `mech-design-analyst-1` | 372 lines: a prebuilt C# custody helper, `OllamaDaemon` owned by Study's worker, per-execution materialization, exchange evidence rows, a declared replay prefix with live continuation | `tmp/units/mech-design-analyst.md` |
| reconciliation | Orchestrator | — | direct | — | MR-1 to MR-8 under U22; the unit table of seven waves | `.orkestrel/plan.md` § Mechanisms campaign |
| `mech-s-st` | Orchestrator | — | direct | — | Study `main` fast-forwarded `1f33206` to `2ad4fb2` (`st-collaborator`), 7 files, 627 insertions, the tree identical to the verified tip | Study `2ad4fb2` |
| `mech-o-env` merged | Orchestrator | — | direct | — | re-baseline: `mech-o-env` folds into `mech-o-types`, so the server entry never ships empty; the Orchestrator installed `@orkestrel/process` `^0.0.15` and `@orkestrel/emitter` `^0.0.12` into Ollama and committed `e05b445` | Ollama `e05b445` |
| `mech-o-types` | opus role | Astra xhigh | T3 `delegate_task`, provider `codex` | `mech-o-types-1` | dispatched: Ollama's server environment and the daemon session contract | `tmp/units/mech-o-types-brief.md` |
| `mech-s-types` | opus role | Astra xhigh | T3 `delegate_task`, provider `codex` | `mech-s-types-1` | dispatched: Study's closure, exchange, replay and daemon-declaration contracts with the ownership roster | `tmp/units/mech-s-types-brief.md` |
| `mech-o-types` round 1 | opus role | Astra xhigh | T3 `delegate_task`, provider `codex` | `mech-o-types-1` | stopped under its deviation contract: `scaffold repair` wrote the server environment (`tsconfig.json`, `vite.config.ts`, the two server configuration wrappers) and also re-pinned guide, test and vite, which the lane reverted; guide parity reads `guides/README.md`, outside its ownership; the contract draft typechecks (`check:src:server` exit 0) | `tmp/units/mech-o-types-report.md` |
| `mech-o-types` rulings | Orchestrator | — | direct | — | the re-pins accepted as Ollama's owed development re-pins (`@orkestrel/guide` `^0.0.25`, `@orkestrel/test` `^0.0.29`, `vite` `^8.3.5`): `scaffold repair` re-run, installed with `npm_config_prefer_online=true`, `scaffold audit` exit 0 with 0 of 63 paths drifted; server guide parity moves whole to `mech-o-guide`; the contract draft accepted as the basis; per the user, every Ollama server-environment file comes from scaffold (environments are read from the physical `src/<environment>` directories, `../scaffold/src/bin/helpers.ts:1200`) | `tmp/units/mech-o-types-brief-2.md` |
| `mech-o-types` round 2 | opus role | Astra xhigh | T3 `delegate_task`, provider `codex` | `mech-o-types-2` | dispatched: the `prove` claim, the errors test, the hermetic guard witness, every gate green with no guide edit | `tmp/units/mech-o-types-brief-2.md` |
| Supervisor prior art | Orchestrator | — | direct | — | read-only, per the user: `ProviderExecution` composes `Process` from `@orkestrel/process/server` with a stderr hook, `lines`, `exit`, `evidence`, `stop()` and `destroy()`, and its `.mjs` fixtures are self-contained fake executables with modes; Supervisor is unchanged and a candidate later consumer of `OllamaDaemon` | `tmp/units/mech/supervisor-prior-art.md` |
| `mech-s-types` | opus role | Astra xhigh | T3 `delegate_task`, provider `codex` | `mech-s-types-1` | the Study contracts and the ownership roster: `check`, lint and format clean, the `prove` receipt on the `admission` discriminant; `test:guides` 20 of 21, the one Methods row it named added by the Orchestrator, which leaves five parity findings owed by the implementation lanes (two closure, three seal); committed as Study `e79270c` | `tmp/units/mech-s-types-report.md` |
| `mech-sw` round | Orchestrator | — | direct | — | the Study writer wave under the Veneer parallel playbook: protocol and roster at `tmp/units/mech-sw/coord/`, one runner and three writers in disjoint regions | `tmp/units/mech-sw/coord/protocol.md` |
| `mech-sw-runner` | verifier | Luna medium | T3 `delegate_task`, provider `codex` | `mech-sw-runner-1` | launched first; owns every Study process this round | `tmp/units/mech-sw-runner-brief.md` |
| `mech-s-closure`, `mech-s-transport`, `mech-s-seal` | builder | Sol xhigh | T3 `delegate_task`, provider `codex` | `mech-s-closure-1`, `mech-s-transport-1`, `mech-s-seal-1` | launched as the writers `wclosure`, `wtransport` and `wseal` | the three briefs |
| `mech-o-types` round 2 | opus role | Astra xhigh | T3 `delegate_task`, provider `codex` | `mech-o-types-2` | complete: 23 server error tests, the `src:server` hermetic witness, the `prove` receipt on a required declaration field; `scaffold audit` 0 (re-read by the Orchestrator), `check`, lint, format, `test:src` 206, `test:setup` 597, `test:policy`, `test:config`, `test:guides` 47 and `build` all exit 0; no contract revision; committed as Ollama `2b268c2` | `tmp/units/mech-o-types-report-2.md` |
| `mech-sw` rulings | Orchestrator | — | direct | — | wtransport-R1 (the sink owns the HTTP ordinal through `next`; the worker writes the declaration; the transport writes attempts, terminals and the completion after a successful postflight), wseal-R1 (the record-omission hunk of `normalizeStudyProfile`), wseal-R2 | `tmp/units/mech-sw/coord/rulings.md` |
| `mech-o-daemon` | builder | Sol xhigh | T3 `delegate_task`, provider `codex` | `mech-o-daemon-1` | dispatched: `OllamaDaemon` over the published process API with a fake daemon fixture, D1 to D4 in their U22 forms | `tmp/units/mech-o-daemon-brief.md` |
| `mech-sw` runner-R1 | Orchestrator | — | direct | — | the Codex sandbox refused the runner's detached launch (`CreateProcess ... blocked by policy`); commands now run in the foreground with output redirected to the run file; the retried `wclosure-1` ran | `tmp/units/mech-sw/coord/rulings.md` |
| `mech-o-daemon` round 1 | builder | Sol xhigh | T3 `delegate_task`, provider `codex` | `mech-o-daemon-1` | stopped before implementation: `tests.md:172-178` and `workspace.md:235` send spawning proofs to an isolated project outside the default run, against the brief's `src:server` placement; Ollama unchanged | `tmp/units/mech-o-daemon-report.md` |
| mech-o-daemon-R1 | Orchestrator | — | direct | — | the matrix has no isolated slot for hermetic spawning proofs of a package's own server code; under `tests.md:183` the daemon's spawning lifecycle proofs stay in `src:server` with budgets sized from a contended run, every other behavior is proved without spawning, the live test lives in `service`; the gap joins the scaffold 0.0.105 queue | `tmp/units/mech-o-daemon-brief-2.md`; `.orkestrel/plan.md` § Scaffold 0.0.105 queue |
| `mech-o-daemon` round 2 | builder | Sol xhigh | T3 `delegate_task`, provider `codex` | `mech-o-daemon-2` | dispatched under mech-o-daemon-R1 | `tmp/units/mech-o-daemon-brief-2.md` |
| `mech-o-daemon` round 2 | builder | Sol xhigh | T3 `delegate_task`, provider `codex` | `mech-o-daemon-2` | complete: `OllamaDaemon` and `createOllamaDaemon` over process 0.0.15 (`createSession`, stderr hook, tree stop) with a self-contained fake daemon; `scaffold audit` 0 (re-read by the Orchestrator), `check`, lint, format, `test:src` 265 on Node 24, the server project 82 on the portable Node 22.18.0, setup 599, policy, config, guides, conformance, `build`; spawning budgets 15,000 ms against a slowest case of 3,578 ms with Study load unconfirmed; committed as Ollama `7867fd4` | `tmp/units/mech-o-daemon-report-2.md` |
| `mech-o-live` | Orchestrator (verifier substitution: a handful of guarded commands) | — | direct | — | a probe of the built `OllamaDaemon` against the pinned 0.40.8 runner (`scoop/apps/ollama-full/0.40.8/ollama.exe`, SHA-256 `034a26a7…`, receipt `tmp/runtimes/ollama-0.40.8-receipt.json`) on the dedicated port 11437, no generation, port 11434 idle and untouched: run 1 declared the manifest file's SHA-256 and was refused with `model` (inventory digest `78a738cc…`), stop confirmed in 6.8 s; run 2 with the inventory digest started in 4.1 s (the real listen line matched, version 0.40.8 and the model digest verified), unloaded `qwen3.5:2b-q4_K_M` with exactly `{"model":…,"keep_alive":0}` and HTTP 200 `done_reason: "unload"`, and stopped confirmed; no Ollama process or listener remained; finding for the guide: a declared model digest is the `/api/tags` digest, not the manifest file's SHA-256; the `service` test stays the release-gate proof | Ollama `tmp/units/mech-o-live-result.json`, `mech-o-live-result-refusal.json` |
| `mech-s-closure` | builder | Sol xhigh | T3 `delegate_task`, provider `codex` | `mech-s-closure-1` | FINAL: M1 to M4 proved; 59 runtime tests (2 existing skips) and 40 setup tests pass, scoped check and lint clean, closure guide rows and examples clear; discovery deferred to `mech-verify` (wclosure-R3) | `tmp/units/mech-s-closure-report.md` |
| `mech-s-seal` progress | builder | Sol xhigh | T3 | `mech-s-seal-1` | the end-to-end case is green: a trial recorded against the loopback fixture, sealed, and replayed offline in a fresh process (sidecar 5,101 bytes against 2,655 evidence bytes) | `tmp/units/mech-sw/coord/results/` |
| `mech-o-guide` | opus | Opus | Workflow | `wf_23b006f4-6d3` | dispatched: the server face in Ollama's guide, README and parity test | `tmp/units/mech-o-guide-brief.md` |
| `mech-s-transport` | builder | Sol xhigh | T3 `delegate_task`, provider `codex` | `mech-s-transport-1` | FINAL: E1 to E5 proved; the lane failed on model capacity between its red run (`wtransport-8`: 35 failed, 13 controls passed) and its restore, the Orchestrator restored the file from the byte-exact backup (SHA-256 `d4a3bbc8…`) and queued `wtransport-9` (120 of 120 transport tests, 235 of 235 across the Ollama-module files, the 35 now green), and the lane closed on its own thread (wtransport-R4) | `tmp/units/mech-s-transport-report.md` |
| `mech-o-guide` | opus | Opus | Workflow | `wf_23b006f4-6d3` | complete: the server face documented, `test:guides` 53 (from 47), check, lint and format clean, a mutation of a method row and a summary caught; `scaffold audit` 0 (re-read by the Orchestrator); committed as Ollama `38000f9`; the README usage example's `@orkestrel/abort` import moves to `mech-o-release`, which owns its assertion at `tests/setupServer.test.ts:2324` | `tmp/units/mech-o-guide-report.md` |
