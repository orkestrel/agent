# Routing ledger for the `@orkestrel/agent` context campaign

Every dispatch, its engine, and every substitution, newest first. The briefing benchmark lives in the agent checkout's `tmp/bench3/`; its results live under `tmp/bench/results/v9/`.

## Bench readings

| Date | Bench | Reading |
| --- | --- | --- |
| 2026-10-09 | Codex (GPT-6 Astra) | live: `bench.ts --codex`, `codex-cli 0.160.1`, sandbox `read-only`, 11.1 s round trip, session `01a11fb5-6bbe-7dd3-8c21-e56a76a3e2d8` |
| 2026-10-09 | Cursor (Grok) | not probed; no Grok lane ran |

## Dispatches of 2026-10-09

| Unit | Role and engine | Required by `.agents/orchestration.md` | Remedy |
| --- | --- | --- | --- |
| Issues record (`issues.md`) | workflow `wf_1388e405-cd1`: 10 `distiller` lanes on Haiku 5.5 over the session summaries, replies, commit logs, records, and reports (682 raw items); `planner` on Opus 5.5 merged them to 310 and checked every path; a `distiller` critic found 19 gaps, merged by the `planner`. Recheck `wf_6509d5bf-9b1`: two `reviewer` lanes on Opus 5.5 per chunk of the 57 open items, a third on splits; 13 statuses changed | as required | none |
| Blind audits of `v10`, batches 1 to 4 | workflow `tools/audit.js` (passes and failures, two `checker` lanes on Haiku 5.5 per chunk, a tiebreak): `wf_a5e9ffe9-170` (110 rows), `wf_7268bc73-e14` (50), `wf_3927e1ee-398` (20), `wf_03b5e4ce-856` (20) | as required | the Astra check of these batches is owed |
| Records harness, answer pass thinking off | workflow `wf_34fb3710-979` (`--answer-think` flag, sha `4d07e56a`) and `wf_2f661f2d-2be` (flag removed, fixed behavior, sha `5342e209`): `builder` on Sonnet 5.5, `verifier` and `checker` on Haiku 5.5; the Orchestrator ruled the `parseFlags` wrapper in scope and reworded its comment | as required | none |
| Port t6 `answer-think` and t5 `thinking-fix` | the lane on GPT-6 Astra through `launch.ts`, workspace-write; the Orchestrator re-ran `test:guides` outside the sandbox (`listen EPERM` inside); commits `4852d4c` and `f1f4c0a` | as required | none |
| Replay and raw probes | the Orchestrator's instruments `probes/replay-probe.ts` (47 rows, `--predict 1`) and `probes/raw-probe.ts` (2 calls) on the 2B through the daemon, in series gaps | as required | none |
| Thinking T4 guide and the thinking review | workflow `wf_ab75080b-a24`: `opus` on Opus 5.5 writes `guides/agent.md`, `verifier` and `checker` on Haiku 5.5; in parallel `reviewer` on Opus 5.5 (objective lane) and `checker` on Haiku 5.5 over `tmp/units/thinking-source.diff` | as required | none |
| Thinking T3 `thinking-budget` | the lane on GPT-6 Astra through `launch.ts`, workspace-write, cap 5,400 s; 1,215 tests; gates re-run by the Orchestrator, commit `85e3482` | as required, except the Orchestrator's gate re-run in place of `verifier` | the T4 workflow's objective review covers the change |
| Thinking T2 `thinking-replay` | the lane on GPT-6 Astra through `launch.ts`, workspace-write, 344.1 s; the Orchestrator moved one split comment and re-ran the gates, commit `ccdf574` | as required, except the Orchestrator's comment edit and gate re-run | the T4 workflow's objective review covers the change |
| Thinking T1 `thinking-record` | workflow `wf_b72b5e65-311`: `builder` on Sonnet 5.5, `verifier` and `checker` on Haiku 5.5; the checker found a local test function and three rewrites a few characters over length; the Orchestrator inlined the function and renamed one lambda parameter, commit `d738cfe` | as required, except the Orchestrator's test-line edits | none |
| `score-audit-3` check (the `v9` pass audit) | the lane on GPT-6 Astra through `launch.ts`, read-only, cap 3,000 s; the command form the `analyst` driver resolved for `records-port`, reused by the Orchestrator with the brief and journal names changed | `analyst` driver resolves the command | none: the form is the driver's, unchanged |
| Port U6 `ledger-entity` | the lane on GPT-6 Astra (workspace-write, 915.9 s), 20 tests; three-lens review `wf_fc287b2f-ccf` (`reviewer` on Opus 5.5 for measured parity, `reviewer` on Opus 5.5 for package contracts, `checker` on Haiku 5.5): parity `VERDICT: FAIL 1 3 4 5 6`, contract `VERDICT: FAIL 1 7`; 31 ruled fixes by Astra (644.7 s, 1,174 tests); second review `wf_64ef8f8e-779`: parity FAIL on 5 fix effects (one from the Orchestrator's own brief), contract `VERDICT: FAIL 6`; second fix round on Astra; commit `265a905` holds the first round | as required | none |
| Ideas and rejections harvests | workflows `wf_7824d8e7-559` and `wf_86cadce9-b29`: `distiller` lanes on Haiku 5.5, `planner` on Opus 5.5 to dedupe and verify, a `distiller` completeness critic; `rejected.md` from the second | as required | none |
| Port U4 fixes | workflow `wf_43829786-38b`: `builder` on Sonnet 5.5 fixed 3 type errors; `reviewer` on Opus 5.5 (objective lane, parity with the measured classifier) returned `VERDICT: FAIL 5 6`, a judge-deadline rethrow, a shallow deterministic-failure match, and gated topics; fix workflow `wf_331edc71-ad6` | Astra's sandbox refused Vite's temp write through the `node_modules` symlink, so the type fixes went to `builder` on Sonnet 5.5 | U6 runs with a real `node_modules` directory of links |
| `--think-predict` flag (staged `bench.mjs.next` in both harnesses) | workflow `wf_88def6d3-c4c`: `builder` on Sonnet 5.5, `verifier` and `checker` on Haiku 5.5; the verifier's gates could not load the `.next` extension, so the Orchestrator re-ran them through temporary `.mjs` copies: `node --check` exit 0 both, `--check-ledger` refined and roundA exit 0, both refuse `--think-predict 0` with exit 2 | as required | installed only with no run active |
| Port U5 `ledger-gauge` | workflow `wf_24b9f7b8-0df` in the second worktree `/home/user/agent-port-gauge`: `builder` on Sonnet 5.5, `verifier` and `checker` on Haiku 5.5 | as required | none |
| Port U4 `ledger-classifier` | `astra` driver on Haiku 5.5 resolved the writing command; the lane on GPT-6 Astra through `launch.ts`, workspace-write, cap 3,600 s | as required | none |
| Port U3 `ledger-helpers` | workflow `wf_d4b60067-46b`: `builder` on Sonnet 5.5, `verifier` and `checker` on Haiku 5.5; parity probe 29 of 29 against `records.mjs`; fix workflow `wf_92797c00-ac9` for 5 ruled findings; commit `07d0004` | as required | none |
| Port U2 `ledger-types` | workflow `wf_b1a13877-b7f`: `opus` on Opus 5.5 writes, `verifier` on Haiku 5.5 gates, `checker` on Haiku 5.5 reviews the diff file | as required | none |
| Port U1 `selection-briefing` | workflow `wf_1a34815e-920`: `builder` on Sonnet 5.5, `verifier` and `checker` on Haiku 5.5; the checker found an `as never[]` assertion, and a second `verifier` found two root-typecheck failures the unit's gates did not cover; the Orchestrator applied the three test-line fixes and the formatter, commit `99cdca6` | as required, except the Orchestrator's test-line edits | every later unit's gates add `tsc --project tsconfig.json`, `lint:check`, and `format:check` |
| Blind pass audit of `v9` (162 scorer passes, 9 chunks) | workflow nodes as `checker` on Haiku 5.5, effort high, run `wf_e1b4eff3-968` | as required | Astra checks its verdicts after it returns |
| `records-port` design round | `planner` on Opus 5.5 (native) and `analyst` driver on Haiku 5.5 with the lane on GPT-6 Astra, session `01a12049-5172-71e0-833d-81517acdb0a9`, 940.3 s; one brief, blind to each other | as required | none |
| Final check stage 1 (`f4-*`, `t2-*`, copies 1 to 4) | live runs through `launch.ts` under a 7,100 s cap, `series.ts` over `run-one.ts`, budget 5,400 s per launch | as required | none |
| Thinking probe | the Orchestrator's instrument `probes/think-probe.ts` on the 2B through `launch.ts`; 10 calls, completions 69 to 666 tokens | as required | none |
| Records port reconnaissance | `scout` on Haiku 5.5, read-only map of the bench3 ledger, `records.mjs`, `@orkestrel/agent` seams, and the desk | as required | none |
| `score-audit-2` check (batches 2 and 3) | `analyst` driver on Haiku 5.5; lane on GPT-6 Astra, session `01a12025-2e72-7552-9c5b-ee74c2930137`, 129.1 s, `VERDICT: PASS`; verdict `records-series-verdict.md` | as required | none |
| Blind scorer audit, batch 3 | workflow nodes as `checker` on Haiku 5.5, effort high, run `wf_ba6a53a7-759`; 18 items, 0 splits | as required | none |
| Records series `a5-records-v1`–`v8` | live runs through `launch.ts` under a 1,200 s cap, `run-one.ts`; 415.8 s to 472.5 s each | as required | none |
| Relevance probe | the Orchestrator's instrument `probes/judge-relevance.ts` on Mica through `launch.ts`, 86.7 s | as required | none |
| Records harness install gates | `verifier` on Haiku 5.5: `node --check` both files exit 0, `records-check.mjs` 253 of 253, `--check-ledger` refined and roundA exit 0; installed sha256 `59609d38417fd056…`, frozen files kept as `*.frozen-3d75138e` | as required | none |
| `records-candidate` audit | `analyst` driver on Haiku 5.5; lane on GPT-6 Astra, session `01a11fd9-ca6a-7020-b9ac-1c9b7f4c1b9d`, 1,027.5 s; verdict `records-candidate-audit-verdict.md` | as required | none |
| `records-final` | `builder` on Sonnet 5.5, brief `tmp/units/records-final-brief.md`; the report patch (`###` heading regex, byte tail comparison) applied by the Orchestrator | as required | none |
| Blind scorer audit, batch 2 | workflow nodes as `checker` on Haiku 5.5, effort high, run `wf_2feddc43-5a1`; 13 items, 0 splits | as required | Astra check queued with the records series audit |
| `scorer-revert` gates | `verifier` on Haiku 5.5; its field diff misread the backup with `require()`, so the Orchestrator reran the diff and the exit codes: `check.mjs` exit 0, `scorer-check.ts` exit 0 (26 of 26), fields equal `scenario.json.pre-negation` plus the `no … room` pattern | as required | none |
| `scorer-revert` | `builder` on Sonnet 5.5, brief `tmp/units/scorer-revert-brief.md`; accepted | as required | none |
| `score-audit` check | `analyst` driver on Haiku 5.5; lane on GPT-6 Astra, session `01a11fc0-2370-7072-93fe-96244da6da2c`, 233.8 s; verdict `score-audit-verdict.md` | as required | none |
| `frozen-harness` audit | `analyst` driver on Haiku 5.5; lane on GPT-6 Astra, journal `tmp/codex/frozen-harness.jsonl`, session `01a11fba-2f2f-7e63-940c-b0742935a992`, 668.5 s; verdict `frozen-harness-audit-verdict.md` | as required | none |
| Blind scorer audit (both designs' failures) | workflow nodes on Haiku 5.5 with no role and no effort, on the user's instruction to score with Haiku; resumed by run id `wf_704d43f9-b92` on the user's instruction to keep finished work | `checker` on Haiku 5.5 with an effort | Astra checks its verdicts after it returns |
| Records rulings (candidate) | `opus` on Opus 5.5 (apply), `verifier` on Opus 5.5, `reviewer` on Opus 5.5; resumed by run id `wf_e293b50f-c7b` on the user's instruction | `builder` on Sonnet 5.5, `verifier` on Haiku 5.5, `analyst` on Astra | Astra audits the records candidate before its series |
| Records wiring (candidate) | `opus`, `verifier`, `reviewer`, all on Opus 5.5 | objective implementation on `astra`; `verifier` on Haiku 5.5; correctness review on `analyst` (Astra live, unprobed) | Astra audits the records candidate |
| Records module (`tmp/bench3/records.mjs`) | `opus`, `verifier`, `reviewer`, all on Opus 5.5 | as for the wiring | covered by the records candidate audit |
| Records plan (`RECORDS-PLAN.md`) | `opus` writer, `reviewer` attack, `opus` repair, all on Opus 5.5 | design round of `planner` and `analyst`, blind to each other | Astra holds the missing objective design lane |
| Answer-run fixes and the credit-check scorer | `opus` writers, `verifier` and `reviewer` on Opus 5.5 | objective implementation on `astra`; `verifier` on Haiku 5.5; review on `analyst` | `frozen-harness` audit |
| Tail fix and scorer negation | as the preceding row | as the preceding row | `frozen-harness` audit |
| Answer-gap fix (answer cue, recall budget) | as the preceding row | as the preceding row | `frozen-harness` audit |

Substitution not recorded at the time: Opus 5.5 held the objective review and implementation lanes while the Astra bench was live and unprobed; no bench reading made Astra dark. Gates that ran on Opus 5.5 in place of Haiku 5.5 report exit codes and need no re-run.

## Long-running commands

Live runs through `a4-refined-v6` ran from `tmp/bench/results/v7/tools/run-one.sh`, a bash script outside `launch.ts`. From `a4-refined-v7` on, each live run launches through the dispatch skill's `launch.ts` under a cap, running `tmp/bench/results/v7/tools/run-one.ts`.
