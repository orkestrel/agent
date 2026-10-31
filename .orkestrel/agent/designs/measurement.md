# Measurement design

This file is the home of every unit's gate, every instrument, and every GPU step. `tenets.md` § Evaluation owns the evaluation canon; `research/evidence.md` owns the readings.

## Cheap-first order

Every unit runs its acceptance in this order and stops at the first failure:

1. Format, lint, and typecheck on the changed scope.
2. The touched test file.
3. The project tests.
4. One mutation probe on the load-bearing line: disable it, watch the test fail, restore it.

Every medium unit then gets one independent review, per the size gate of `.agents/orchestration.md` § Size gate.

## Probes

`rc-p1` writes throwaway TypeScript probes run by `node`, never committed. Each prints its control result and its coverage, and the report quotes the numbers.

| Probe | Reads | Control | Decides |
| --- | --- | --- | --- |
| (a) literal census | the public `studies/endurance/sources/runtime/evaluation.json`, never `private/`; simulate folds at the Study `keep: 2` cut and report per fold the distinct ids and numbers in the slice, how many recur within the next 3 to 8 goals, and `estimateTokens` of the anchor line | a slice of known content with known recurrences reports its counts exactly | whether numbers join ids in rc-e1; rc-e1's L0 gate |
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

## Recording

`rc-a9` is a GPU run by the Orchestrator under `tenets.md` § Host, after the user rules Q4.

1. Three single-request probes run first: co-residency (one agent request, one judge call, a second agent request; read whether the agent's cache survives), the late-`system` template (one request with a mid-conversation `system` message; read the rendered prompt length), and skill load (two requests around one `skill:<name>` instruction add; read `cached` on each). F3 removed the system-id probe.
2. Records and compaction arms of the endurance workload record goals 1 to 24, with request-body recording on and a ledger snapshot after each goal.
3. The recording extends to goals 49 and 77 only for rc-a7 and rc-a11, and only under Q4.

Acceptance: the recording seals; the snapshots validate; replay of goal k+1 from snapshot k matches live bytes on non-maintenance requests; both probes answered.

## Screens

`rc-a10` screens each unit under test on the rc-a9 recording.

- Seed at strata 17, 49, and 77, chosen at onset and burst points.
- Run arms off, repeat, sham, and on.
- Offer no tools on the final step, the repair the prior R2 screen needed (`152ac3c3:.orkestrel/agent/r2-u43-u44-ruling.md`).
- Replay judge exchanges from the recording: live judging does not reproduce across runner versions (`research/evidence.md` § Prior-campaign readings, live judge reproducibility).
- Noise N = 2·max(r, s), with r = |off-repeat − off| and s = |sham − off| (`152ac3c3:.orkestrel/agent/plan.md` § Levels and gates, row Noise `N`). r and s come from the repeat and sham arms of the first screen; nothing promotes before they exist.
- No experiment promotes on mechanical metrics alone: mechanical scores do not track semantic labels (`research/evidence.md` § Prior-campaign readings, mechanical against semantic). Cache share or retention never promotes by itself.
- Each experiment's off arm runs on 0.0.34 and doubles as the endurance baseline for the 0.0.32 ledger fixes in its segment (D19).

## Gates

| Unit | Cheapest discriminating check | GPU | Promotion gate | Removal |
| --- | --- | --- | --- | --- |
| rc-u1 | a summarizer returning `'  \n'` rejects with `'SUMMARY'` and the slice stays live with sections unchanged; a blank merge leaves the appended section and rejects; under `strict: false` the automatic path emits `fault` and dispatches over the window, under `strict: true` it settles as an error; mutation on the blank check | none | fix | none |
| rc-u2 | briefing bytes identical on a fixture before and after; a search for the old names returns nothing | none | fix | none |
| rc-u5 | an owner record over its line cap fails on 0.0.34, then keeps its most recent lines, and a correction line outlives an older fact | none | fix | none |
| rc-u4 | a ledger hydrated at request k produces a byte-identical selection (messages and briefing) for request k+1 against the uninterrupted ledger, with a scripted provider and preloaded judgments; control: the same with `failures` emptied differs | none | capability | none |
| rc-u6 | pair questions at most `2 × limit` on the rc-p1 (b) fixture; `limit` at or over the eligible count gives identical classification | none | capability | none |
| rc-u7, rc-u8, rc-u9 | manager tests (revision, unchanged no-op, `remove` forgets, snapshot round trip, events with a throwing listener routed to `error`, format cascade); total guards with malformed-input tests; one store contract test over both stores; head order test; head pricing with an instruction long enough to push the head past the cap when only `system` and the briefing are priced stays under the cap, and a reverted-pricing control exceeds it | none | capability | none |
| rc-a3 | `select` CPU at 100 to 1600 messages; control: no corrections scales near-linearly | none | rc-a3b starts only at 1000 ms or 5% of model wall at 1600 messages | delete the bench |
| rc-a3b | the rc-a3 bench | none | at least a 50% CPU cut at 1600 messages; rc-u4 replay stays byte-identical | revert |
| rc-e1 | L0: rc-p1 (a) shows at least one recurring id per fold on average, and the anchor line costs at most 5% of the 4096-token recap allowance; L1: off and on are byte-identical until the first fold, and on adds exactly the anchors | L2 micro: 8 goals seeded from a compaction checkpoint before the goal-17 lookup window, arms off, repeat, and on | a predicate scores a product that carries the correct folded account id; on minus off reaches N, and on adds no critical violation | delete the option, the render branch, its constant, and its tests |
| rc-a6 | on the rc-a9 replay, consecutive requests share a byte-stable prefix through the seed; control: switch off shares only through the system text | micro, 24 goals, after the co-residency and template probes of rc-a9 pass | cached share rises by 0.25 and prompt-eval duration falls by 25%, and the rc-a10 screen is non-inferior | delete the switch and its tests; on promotion delete `Selection.briefing` |
| rc-a7 | carriage reaches 0.8 for products inside the window on the rc-a9 replay; control: the seed-only tail | 16 goals seeded at goal 38 | work criteria improve beyond N, no critical violation added, cached share within 0.1 of rc-a6's | strip the switch, the branch, and its tests |
| rc-a11 | a recording stub judge sees fewer pair asks with identical correction state | rc-a9 extended to goal 77 | at least 50% fewer burst calls and time beyond noise, zero false retirement at burst 49 and then 77 | delete the switch, the id-share eligibility branch in `Classifier`, and their tests |
| rc-a5 | none | late strata after rc-e1's reading | closures without evidence plus fabricated completions fall beyond N; re-acquisition stays at or under 2 times off | revert the study wiring |

The rc-a6 target restates the prior campaign's S1 target (`152ac3c3:.orkestrel/agent/plan.md` § Levels and gates, row Speed, timing). The rc-a11 gate is the prior campaign's R5b reopen condition (`research/evidence.md` § Prior-campaign readings, R5b packet).

## GPU order

All GPU work runs as the Orchestrator, after the stop line (O5) and the user's Q4 ruling:

1. rc-a9: the three single-request probes, then the micro recording.
2. rc-a10 screens for rc-e1 and rc-a6.
3. The extension to goals 49 and 77, only for rc-a7 and rc-a11.

## Uncertainty

| Recommendation | Weakness | Next check |
| --- | --- | --- |
| skill load as an instruction | the cache cost is an inference, and load frequency on this workload is unmeasured | count loads per run in `studies/context`, and read `cached` around a load in rc-a9's skill-load probe |
| rc-a6 worth building locally | the wall arithmetic uses an unmeasured prefill rate; co-residency and template support are unmeasured | the co-residency and template probes of rc-a9 |
| `correction.limit` with no default | rc-p1 (b)'s growth curve may argue for a default | read the pair count at the longest length against the shortest; when growth is far beyond linear, propose a default in rc-u6's review |
| whole-set memo store | the per-revision store has a real write-cost argument | time `set` over growing memo sets in rc-u8 (D14) |
| memos before workspace in the head | workload-dependent, no reading | pin by test; read invalidation counts on the mechanism study |
| four instruments suffice | rule retention and stage attribution may be needed sooner if rc-e1 promotes | rule retention joins when rc-e1 promotes; stage attribution only when a unit's gate names it |
| objective bench availability | every `astra` unit runs on the subjective lane's engine until the objective bench returns (O3) | a liveness probe of the objective bench before dispatching the first `astra` unit |

The consultation's trim-order and grouped-asks uncertainties are closed by F2 and F1 (`plan.md` § Rulings).
