# Measurement design

This file is the home of every unit's gate, every instrument, and every GPU step's cap and order. `designs/runs.md` owns how a GPU step runs; `tenets.md` § Evaluation owns the evaluation canon; `research/evidence.md` owns the readings.

## Cheap-first order

Every unit runs its acceptance in this order and stops at the first failure:

1. Format, lint, and typecheck on the changed scope.
2. The touched test file.
3. The project tests.
4. One mutation probe on the load-bearing line: disable it, watch the test fail, restore it.

Every medium unit then gets one independent review, per the size gate of `@orkestrel/scaffold` `.agents/orchestration.md` § Size gate.

## Probes

`rc-p1` writes throwaway TypeScript probes run by `node`, never committed. Each prints its control result and its coverage, and the report quotes the numbers.

| Probe | Reads | Control | Decides |
| --- | --- | --- | --- |
| (a) literal census | the public `studies/memory/sources/evaluation.json`, never the answer key (`tenets.md` § Evaluation); simulate folds at the Study `keep: 2` cut and report per fold the distinct ids and numbers in the slice, how many recur within the next 3 to 8 goals, and `estimateTokens` of the anchor line | a slice of known content with known recurrences reports its counts exactly | whether numbers join ids in rc-e1; rc-e1's L0 gate |
| (b) pair growth | a scripted conversation from the same arrivals with an inert data-stub judge; pair questions per correction at growing conversation lengths | a conversation with no correction counts 0 | rc-u6's default question and its test fixture |

Probe (c), the `encode` read for `Message.id`, is dropped: F3 settles it.

## Bench

`rc-a3` benches per-request `select` CPU at 100, 200, 400, 800, and 1600 messages, with a scripted provider and a judge that is never reached, seeding long conversations through rc-u4's hydrate path.

- Control: a conversation with no correction-weighted message scales near-linearly.
- State the thresholds before the run and report host load beside the result.
- Gate for rc-a3b: at 1600 messages, `select` CPU reaches 1000 ms, or 5% of that request's recorded model wall. Under the gate, delete the bench and change nothing.

## Instruments

`rc-a8` builds four instruments in `studies/memory`, each serving a unit the campaign builds. An instrument that serves a stripped experiment leaves with it.

| Instrument | Measures | Negative control | Limit |
| --- | --- | --- | --- |
| literal retention | ids from pre-boundary history that recur in the next 3 to 8 requests and are present in the post-fold view | the same transcripts with the extractor removed score lower | speaks to retention, not continuation (C02) |
| carriage | the referenced prior product's literals present in the built prompt | a seed-only tail scores lower | retention, not use (C16) |
| cache share | `cached / prompt` per request from the Ollama counts | a random string at the start of the system text drives the share toward 0 | cannot say why a prefix changed; wall time is never a cache reading |
| re-acquisition | recall and lookup calls per goal, apart from other calls | rc-a8's brief names a control that must fail before the instrument is accepted | environment-dependent (C06) |

- Before building, rc-a8 maps each instrument to `@orkestrel/study` and builds in `studies/memory` only what Study does not own.
- The rule-retention instrument joins rc-a8 when rc-e1 promotes or a unit's gate names it (D3); stage attribution joins only when a unit's gate names it.

## Models

The user builds Agent for the smallest local models, because they are the most sensitive to these changes: a larger model works around a flaw that a small model exposes (Q5). A change that only a larger model tolerates fails its gate.

- Subject: Qwen 3.5 2B `q4_K_M`, the smallest model with prior readings, and the model whose plain loop repeated one lookup to the step cap (`research/evidence.md` § Prior-campaign readings, repeat loops). rc-s1 adds a `q2` profile beside `studies/memory/profiles/q4.json` that pins its digest.
- Records judge: Mica v0.1 4B, as in the `q4` profile. The judge is the records strategy's classifier, not the subject; changing it opens a separate axis.
- Larger-model check: an experiment that promotes on the subject runs one off and on pair at its deciding stratum on Qwen 3.5 4B, the `q4` profile, and is non-inferior there.
- Sampling: every role sends the pinned effective values; a value change is D38 (O13; `designs/layout.md` § Sampling).
- No hosted provider runs in this campaign (Q5).

## GPU allowance

The allowance is 600 model minutes: the summed Ollama `total_duration` of every agent and judge call (O9). The basis is the c1 cost at 4B, 109 records minutes and 53 compaction minutes over 96 goals (`research/evidence.md` § Prior-campaign readings, c1 costs), with the judge live on one daemon pin within a screen until rc-st2 serves judge requests by key (`designs/runs.md` § Replay and pins). The split follows O17: rc-a6's 90 minutes fund rc-a16, rc-a10 for rc-u10, and its contingency; rc-a15's 10 come from the larger-model checks.

| Step | Cap in model minutes | Work |
| --- | --- | --- |
| rc-a9 probes | 10 | co-residency, skill load, render M3, sampling M1 and M2; rc-p4 at 3 only when the user grants Q10 |
| rc-a9 recording | 60 | goals 1 to 24, both arms, one arm per segment |
| rc-a15 | 10 | denial-note arms and the marker probe |
| rc-a16 | 15 | single-request layout arms |
| rc-a10 for rc-e1 | 30 | 8 goals, arms off, repeat, and on |
| rc-a10 for rc-u10 | 45 | 24 goals, arms `system`, `repeat`, `sham`, and `on`, judge live on one pin until rc-st2 |
| rc-a10 contingency `separate` | 30 | only on a failed rc-u10 gate |
| recording extension | 100 | goals 25 to 49 on both arms, 50 to 77 on the records arm, seeded after goal 24 |
| rc-a10 for rc-a7 | 60 | 16 goals from goal 38, seeded after goal 37, four arms, judge live on one pin until rc-st2 |
| rc-a10 for rc-a11 | 100 | four arms at bursts 49 and 77, live judge |
| rc-a5 | 40 | late strata, compaction arm |
| larger-model checks | 100 | one off and on pair per promoted experiment |

- Each step writes its cap into its run record before it starts, enforces it by projection before each segment launches, and reports its spend beside its result (O19; `designs/runs.md` § Segment plan holds each step's segments and seeds).
- A screen whose projection exceeds its cap with a live judge follows O25 (`designs/runs.md` § Segment plan); the contingency and larger-model rows top up no screen.
- An unspent cap carries to no other step, the contingency's included.
- A request or micro rung of a fix draws on the cap of the step whose segment surfaced the failure. It is projected before launch like a segment and runs one arm per execution. Its reading is written before launch (micro: the failing class's per-goal count on `on` against `off`). It generates no input: it selects its trial, goals, and seed by flags from a closure frozen with the fix (O30). When that step's remaining cap cannot fund the rung, the rung waits for the step's screen (`designs/runs.md` § Fixes while a step runs).
- A cap stop is a budget stop, never a quality verdict (`tenets.md` § Scope).
- When the total reaches 600 model minutes, GPU work stops and the campaign reports (O5).

## Recording

`rc-a9` is a GPU run by the Orchestrator under `tenets.md` § Host, inside § GPU allowance. `designs/runs.md` owns how it runs: one arm per sealed segment from a frozen closure (§ Run shape there), its segments (§ Segment plan), what its first segments measure (§ First readings), its progress readings, and its stops.

1. rc-a15 runs first under its own cap; then the single-request probes run inside the rc-a9 probe cap:
   - Co-residency: one agent request, one judge call, a second agent request; read whether the agent's cache survives.
   - Skill load: two requests around one `skill:<name>` instruction add; read `cached` on each.
   - Render M3: `[system, A, B]` against `[system, A + '\n\n' + B]` at `num_predict` 1, each behind a unique random system prefix; read the `prompt_eval_count` delta. A delta at or under 0 stops the recording and opens D34.
   - Sampling M1 and M2: three desk requests under arms `omitted`, `pinned`, and `zero`. M1 reads `omitted` against `pinned`; a difference stops the recording until the Orchestrator rules the value. M2 reads `pinned` against `zero` and reports whether the penalty acts at `temperature` 0 (D38).
   - F3 removed the system-id probe; the late-`system` template probe is retired with rc-a6.
2. Records and compaction arms of the endurance workload record goals 1 to 24, one arm per segment, with request-body recording on and an end-of-goal checkpoint after every goal (rc-a17).
3. For rc-a7 and rc-a11, the recording extends to goal 49 on both arms and to goal 77 on the records arm, seeded after goal 24 with no goal re-run.

Every GPU step writes a run record before it starts, under `tmp/studies/runs/<step>/` (`designs/runs.md` § Progress), holding the daemon version, `/api/show` `parameters` and `details` per digest, each role's `options` as sent, `think`, the Node runtime, the closure fingerprint, the seed's result and seal, each segment's projection and `record` allowances, the step's cap, and the probe verdicts (`designs/layout.md` § Sampling).

Acceptance: every segment seals; the checkpoints validate; rc-a17's seed test runs over each sealed segment, and a session seeded after goal k builds goal k+1's first request byte-identical to the recorded request on non-maintenance requests; every probe answered; the run record holds its fields; the report names the furthest goal each arm reached.

Inputs: rc-a9 and the extension generate no input; each segment selects its trial, goals, and seed by `--trial`, `--goals`, and `--seed` from the closure its lineage froze for its arm's profile, and its results, closures, and run records stay under `tmp/studies/`, never committed (O26, O30; `designs/runs.md` § Run shape).

## Screens

`rc-a10` screens each unit under test on the rc-a9 recording. `designs/runs.md` owns how a screen runs: its segments and arm order (§ Segment plan), its stops and curtailment (§ Stops), the fixes checked while it runs, and its judge and pins (§ Replay and pins).

- Seed each screen from end-of-goal checkpoints where `designs/runs.md` § Segment plan names: rc-u10 from goal 1, rc-e1 after the goal before the first fold, rc-a7 after goal 37, rc-a11 after goals 48 and 76, rc-a5 after goal 48; the readings fall at the onset and burst strata 17, 49, and 77.
- Run arms off, repeat, sham, and on, one execution per arm per segment, in the order `designs/runs.md` § Segment plan names.
- Offer no tools on the final step, the repair the prior R2 screen needed (`152ac3c3:.orkestrel/agent/r2-u43-u44-ruling.md`).
- Run the judge live on one daemon pin within a screen until rc-st2 serves judge requests by key (`designs/runs.md` § Replay and pins).
- Noise N = 2·max(r, s), with r = |off-repeat − off| and s = |sham − off| (`152ac3c3:.orkestrel/agent/plan.md` § Levels and gates, row Noise `N`). r and s come from the repeat and sham arms of the first screen; nothing promotes before they exist.
- No experiment promotes on mechanical metrics alone: mechanical scores do not track semantic labels (`research/evidence.md` § Prior-campaign readings, mechanical against semantic). Cache share or retention never promotes by itself.
- Each experiment's off arm runs on 0.0.34 and doubles as the endurance baseline for the 0.0.32 ledger fixes over the goals it runs (D19).
- The screen of rc-u10 reads a fix, not an experiment: its comparison arm is `system`, a Study transport rewrite deleted after the screen, and no switch exists to revert (O12; `designs/layout.md` § Layout readings).

## Gates

| Unit | Cheapest discriminating check | GPU | Promotion gate | Removal |
| --- | --- | --- | --- | --- |
| rc-u1 | a summarizer returning `'  \n'` rejects with `'SUMMARY'` and the slice stays live with sections unchanged; a blank merge leaves the appended section and rejects; under `strict: false` the automatic path emits `fault` and dispatches over the window, under `strict: true` it settles as an error; mutation on the blank check | none | fix | none |
| rc-a14 | Stage A (`ask`): a `prove` breaking edit, where a rule literal carrying `allowed` fails typecheck; `Authority` tests (a matched rule with no `verdict` allows, first match wins, the default fallback is `{ zone: 'default', verdict: 'allow' }`, `ask` returns the handler's boolean for sync and async handlers and rejects with the coded error when no handler is set); `isAuthorityDecision` total over `{ allowed }`, an unknown verdict, a throwing getter, and a `Proxy`; orderings 1 to 9 of `designs/authority.md` § Orderings with a scripted provider, recorders, real `AbortController` instances, and `Promise.withResolvers`, no fake clock; byte assertions per note, the `deny` event carrying `errorToMessage` while the message carries the note, and a name with a quote and an over-long name encoded and capped; one `allow` or `deny` per admitted call in call order, `ask` first for an asked call, and a throwing `ask` listener routed to the emitter's `error` handler while the run continues; a denial-loop fixture where a scripted provider repeats a denied call, the turn count equals `limit`, and `exhausted` is true; five mutations, each failing its own test: drop the race (ordering 1), drop the failure arm (2), move the ask pass after the guard (3), drop the order rebuild (5), test `!== 'deny'` instead of `=== 'allow'` (6). Stage B (floor): a `resolveDecision` table (allow to ask, deny stays, ask stays, an unannotated tool untouched); a CPU injection fixture where an `untrusted` `read` returns text instructing `write` and the script calls `write` annotated `consequential`: the write recorder counts 0 with no handler (the model reads the `unanswered` note), 1 approving, and 0 refusing; control: with the annotation removed, `write` runs one time; with no `authority`, an unannotated tool runs and `allow` carries zone `default`; a mutation on the raise line fails the fixture. Then `test:studies` green (the admission scenario still records `Declared workload tool admission refused`; scenarios for approve, refuse, abort while pending, and a `consequential` `write` with no handler); `test:guides` green; `scaffold surface` reports `AuthorityVerdict`, `AuthorityHandler`, `AuthorityNote`, `AUTHORITY_NOTES`, and `isAuthorityDecision` free. A Stage A failure stops the unit, and Stage B dispatches apart | rc-a15 reads the notes | fix and capability | none |
| rc-u2 | briefing bytes identical on a fixture before and after; a search for the old names returns nothing | none | fix | none |
| rc-u5 | an owner record over its line cap fails on 0.0.34, then keeps its most recent lines, and a correction line outlives an older fact | none | fix | none |
| rc-u10 | the canary of `designs/layout.md` § Canary fails first on the unchanged tree, then passes; a `prove` breaking edit, where a `Selection` literal with `briefing` fails typecheck; `build` returns `[system, context (user), …tail]`, no text file gives no context message, images land on the last tail `user` message, a tail with no `user` message leaves the context message without images, and empty inputs return the tail alone; the request copy is `${records}\n\n## Request\n${content}`, the prompt verbatim when nothing renders, the stored request unchanged after `respond`, the answer pass carries the same copy and drops `tool` and call messages, the shown stub reads `: result shown under Records below`, and every other selection byte equals 0.0.34's on a fixture; trim prices the system text, the tail, and the request copy, and a mutation that prices the stored request lets a fixture over the cap pass; hand-written recorded bytes per arm (plain, records first, late request, answer pass), with compaction bytes equal to 0.0.34's; a mutation that pushes the records back into the `system` parts fails the canary; `test:guides` and `test:studies` green; no `Pinned` and no `briefing` member in `src`, `tests`, or `guides` | rc-a16; rc-a10 for rc-u10 | fix; its cost is read, never a veto (O12) | none |
| rc-u4 | a ledger hydrated at request k produces byte-identical selection messages for request k+1 against the uninterrupted ledger, with a scripted provider and preloaded judgments; control: the same with `failures` emptied differs | none | capability | none |
| rc-u6 | pair questions at most `2 × limit` on the rc-p1 (b) fixture; `limit` at or over the eligible count gives identical classification | none | capability | none |
| rc-u7, rc-u8, rc-u9 | manager tests (revision, unchanged no-op, `remove` forgets, snapshot round trip, events with a throwing listener routed to `error`, format cascade); total guards with malformed-input tests; one store contract test over both stores; head order test: the skills index in `system`, the memos index then the workspace text in the context message; head pricing with an instruction long enough to push the head past the cap when only `system` and the records are priced stays under the cap, and a reverted-pricing control exceeds it; the calibration pass sends the same head; the canary's memo and skill sentinels land as `designs/layout.md` § Canary states | none | capability | none |
| rc-a3 | `select` CPU at 100 to 1600 messages; control: no corrections scales near-linearly | none | rc-a3b starts only at 1000 ms or 5% of model wall at 1600 messages | delete the bench |
| rc-a3b | the rc-a3 bench | none | at least a 50% CPU cut at 1600 messages; rc-u4 replay stays byte-identical | revert |
| rc-a15 | rc-a14's byte assertions freeze the notes | single requests over paired seeds, arms `off`, `repeat`, `bare`, `denied`, `refused`, and `unanswered` (`designs/authority.md` § Denial-text reading) | each note's re-call and completion-claim counts reach at most `off` plus N, with N = 2·\|repeat − off\|; a lower `prompt_eval_count` on the marker arm reopens D22 | a failing note's constant reverts to the 0.0.34 wording; when `bare` passes where the three notes fail, the notes drop their next-step clause; delete the probe either way |
| rc-a16 | rc-u10's hand-written recorded bytes per arm | every recorded first-pass request under arms A0, S, A1, A2, A3, and R (`designs/layout.md` § Layout readings) | rc-u10 holds when A1 ≥ A0 − N on use and A1 ≤ A0 + N on re-acquisition, with N = 2·\|S − A0\|; otherwise R is read and D34 opens; A2's strings ship in rc-u11 when A2 reads within N of A1 on both readings; A3's lead lines ship only when A3 beats A2 by more than N on one reading | delete the probe after its reading |
| rc-u11 | a byte fixture per string rc-a16 kept; annotation cases included, not included, mixed, and endpoint; when A2's strings ship, no `[Desk]` or `Ledger source` in `src`, `tests`, or `guides`; a mutation on the annotation join; `test:guides` green | none; rc-a16 decides its strings | fix (vocabulary) | none |
| rc-a10 for rc-u10 | the transport rewrite's test: the `system` arm appends the records block to `system` after `\n\n` and strips it from the request copy | 24 goals, arms `system`, `repeat`, `sham`, and `on`, the judge live on one daemon pin until rc-st2 serves judge requests by key (`designs/runs.md` § Replay and pins); contingency arm `separate` only on a failed gate | `on` passes at work criteria ≥ `system` − N with no critical class added, with N = 2·max(\|repeat − system\|, \|sham − system\|); cached share is reported and never gates; on a failed gate the `separate` arm runs, and D34 opens when it passes where `on` failed; both failing is reported as the measured cost of the ruling | delete the transport rewrite and its test; no switch exists to revert |
| rc-e1 | L0: rc-p1 (a) shows at least one recurring id per fold on average, and the anchor line costs at most 5% of the 4096-token recap allowance; L1: off and on are byte-identical until the first fold, and on adds exactly the anchors | L2 micro: 8 goals seeded from a compaction checkpoint before the goal-17 lookup window, arms off, repeat, and on | a predicate scores a product that carries the correct folded account id; on minus off reaches N, and on adds no critical violation | delete the option, the render branch, its constant, and its tests |
| rc-a7 | carriage reaches 0.8 for products inside the window on the hydrate rung over rc-a9's end-of-goal checkpoints (seat checkpoint k under rc-a7, build request k+1); control: the seed-only tail | 16 goals from goal 38, seeded after goal 37 | work criteria improve beyond N, no critical violation added, cached share within 0.1 of the `on` arm of rc-a10 for rc-u10 | strip the switch, the branch, and its tests |
| rc-a11 | a recording stub judge sees fewer pair asks with identical correction state | rc-a9 extended to goal 77 | at least 50% fewer burst calls and time beyond noise, zero false retirement at burst 49 and then 77 | delete the switch, the id-share eligibility branch in `Classifier`, and their tests |
| rc-a5 | none | late strata after rc-e1's reading | closures without evidence plus fabricated completions fall beyond N; re-acquisition stays at or under 2 times off | revert the study wiring |

rc-a6 is retired (`plan.md` § Sequence, Retired ids); its gate row and its GPU row are struck. The rc-a11 gate is the prior campaign's R5b reopen condition (`research/evidence.md` § Prior-campaign readings, R5b packet).

## GPU order

All GPU work runs as the Orchestrator, after the CPU units it depends on, inside § GPU allowance:

1. rc-a15, then the rc-a9 single-request probes.
2. The rc-a9 records segments for goals 1–2 and 3–8, with rc-p4 after the first segment only when the user grants Q10, whose reading projects every later segment (`designs/runs.md` § First readings), then the remaining rc-a9 segments.
3. rc-a16 on the recorded first-pass requests.
4. The extension to goals 49 and 77, for rc-a7 and rc-a11, after the seeds validate, beside the S7 writers.
5. The screens in the order of `plan.md` § Sequence: rc-a10 for rc-e1, and rc-a10 for rc-u10 after rc-u11 is accepted, with its contingency only on a failed gate; then the screens that read the extension.
6. The larger-model check of each experiment that promotes.

Fixes found while a step runs queue their request and micro rungs into this order (`designs/runs.md` § Fixes while a step runs).

## Uncertainty

| Recommendation | Weakness | Next check |
| --- | --- | --- |
| skill load as an instruction | the cache cost is an inference, and load frequency on this workload is unmeasured | count loads per run in `studies/context`, and read `cached` around a load in rc-a9's skill-load probe |
| the cache saving of rc-u10 | the wall arithmetic uses an unmeasured prefill rate, and the saving needs the agent's slot to survive judge calls | rc-a9's co-residency probe |
| the merged request turn | no reading compares it with a separate message at any size; the stored-copy precedent is a tool stub, not a user turn | rc-a16's R arm; the screen's `separate` contingency |
| adjacent user turns at the head (the context message, then a `user` tail) | one summarized read of the renderer, no test | rc-a9's render probe M3 gates the recording |
| deferring the stored-`system` refusal (D33) | the boundary is complete for Agent's own paths only; a host that stores user text as `system` is unguarded | before the 0.0.35 notes, search the user's applications for `role: 'system'` adds; a hit reopens D33 |
| dropping `[Desk]` and the "Sentence scope is unresolved" sentence | no reading; the Study's system text introduces a desk, so the tag has meaning there | rc-a16 A2 against A1 |
| refusing the lead lines by default | an instruction in the user turn is the one slot a 3B followed (C46) | rc-a16 A3 against A2 |
| the sampling pin as a no-op | rests on C45, read from Ollama's `main` through a summarizing fetch | rc-a9's M1 probe on the pinned daemon version |
| `presence_penalty` 1.5 against id copying | unmeasured at `temperature` 0 | rc-a9's M2 probe plus the carriage instrument (D38) |
| deferring `untrusted` taint (D23) | the floor covers only annotated tools, and a rule that separates untrusted input from consequential action needs the flag | land D23 in the same wave as rc-t1's `memo` tool; before that, count how often the floor asks on `studies/tools` |
| three denial notes in the "did not run" form with "Do not call it again" | rests on one 0.5B rollout set over 24 tasks (C39), one fabrication study (C40), and practitioner reports; the form also changes the scope text, which rc-a15 reads only when its cap allows a `scope` arm | rc-a15 |
| one merged security unit | a larger diff for one review | staged acceptance: a Stage A failure stops rc-a14, and Stage B dispatches apart |
| rc-a15 funded from the larger-model checks | that row spends only per promoted experiment; three promotions leave 100 minutes | the Orchestrator re-reads the row after the first screens; O25 keeps it a reserve that tops up no screen |
| the approval binding check (a tool replaced during an ask) | no consumer replaces tools mid-run | drop it in review when `tools.tool(name)` identity is unstable across `remove` and `add` |
| `AUTHORITY_NAME_LIMIT` and its encoding leaf | a fleet helper might already encode and cap an identifier | resolved 2026-10-31: `preview` in `@orkestrel/contract` encodes and caps the name, so neither is declared (`designs/authority.md` § Shapes) |
| `correction.limit` with no default | rc-p1 (b)'s growth curve may argue for a default | read the pair count at the longest length against the shortest; when growth is far beyond linear, propose a default in rc-u6's review |
| whole-set memo store | the per-revision store has a real write-cost argument | time `set` over growing memo sets in rc-u8 (D14) |
| memos before workspace in the head | workload-dependent, no reading | pin by test; read invalidation counts on the mechanism study |
| four instruments suffice | rule retention and stage attribution may join when rc-e1 promotes | rule retention joins when rc-e1 promotes; stage attribution only when a unit's gate names it |
| the smallest model as the subject | without the repeat rule, the compaction arm at 2B stopped at goal 15, so an arm may never reach a late stratum | rc-a9 reports the furthest goal each arm reaches; a stratum the off arm never reaches is reported unreached, and the gate reads at the strata the arms reached |
| objective bench routing | each `astra` unit runs on the subjective lane's engine when the roster lists no objective bench (O3) | a liveness probe of the objective bench before dispatching the first `astra` unit |
| segments of 15 model minutes finish in about 20 minutes of wall | the wall-to-model ratio and the cold start are 4B readings of the prior campaign; a burst segment can stretch | rc-a9's first two segments; size by measured wall, not model time, when the ratio moves |
| the step cap by projection, with no in-process guard | fail-fast acts at segment granularity, so a loop inside a segment wastes up to one segment | the D39 trigger on the boundary reads |
| rc-st2 decided by the judge-state share | the share counts judge states without tool-result text, not actual body matches across arms | the first records screen's `on` segment counts body-hash matches against `off`'s seal |
| no seal lost on a between-request stop | the Study guide states it (`@orkestrel/study` `guides/study.md` § Execution and evidence); a scope refusal before dispatch and a kill are unread | rc-p2 |
| checkpoints after every goal | custody bytes grow with the square of the goal count, and the read cost is unmeasured | rc-a9 reports checkpoint bytes per goal; rc-st1's acceptance reads a 77-goal result |
| evidence rows visible to a second process before the sink syncs | unknown; without it the reader lags to trial end for evidence while `exchanges.jsonl` still shows progress | rc-p2 |
| the empty-streak alert at a streak of 3 | assumes a baseline rate at or under 0.1 and independent goals, which C48 argues against | rc-a9's records and compaction arms supply the baseline rates before any screen |
| cutting goals per arm when a screen exceeds its cap | a shorter slice might not reach a stratum | the report names the stratum reached, as the row on the smallest model as the subject allows |

The consultations' trim-order and grouped-asks uncertainties are closed by F2 and F1, and the optional-`ask` uncertainty by O16 (`plan.md` § Rulings).
