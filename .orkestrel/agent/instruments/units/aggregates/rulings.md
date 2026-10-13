# Rulings on the aggregate arm design (2026-10-10)

The authorized resumption protocol is [revision.md](revision.md). It replaces T4 and the dependent admission, calibration, exposure, cache, and evaluation rules. The rulings below remain the record of the archived pilot; its STOP is unchanged.

The design round's plan is in `design.md` and `aggregate.md`, its surveys in `readiness.md` and `cost.md`, and the three attacks (fairness, feasibility, cost) in `attacks.md`. These rulings amend the plan. Where a ruling and the plan disagree, the ruling holds. Every unit brief reads this file first.

## Tensions

- T1: restore the `scenario.json` values in g01 to g10, as the plan says.
- T2: the summarizer is the model under test, as the plan says. No third model loads beside Mica.
- T3: keep the never-only-carrier render filter, widened as F1 states.
- T4: the primary pairing is budget-neutral. In the aggregate arm, `share.prompt` is `0.7 - allowance / (capacity - fixed)`, read from the model's calibrated gauge, so the first-call prompt matches the control's within `LEDGER_SCALE_DRIFT`. The additive pairing does not run.
- T5: the judge reads aggregates only in the offline shadow, and CHANGE writes no supersession mark into the ledger's filing, as the plan says. The shadow reading decides whether an online judge arm follows.
- T6: owner aggregates rebuild lazily, only for owners in the request's near set. Desk-topic aggregates rebuild eagerly. AGREE runs only after a build, never on a kept aggregate whose CHANGE answers all read no.
- T7: the date is an instruction in both arms, as the plan says.
- T8: vendor the 0.0.30 build at c04eea4 (identical `src` to the measured port at 8f5098b) so every unit can start. After the agent trim lands, re-vendor the trimmed build on purpose, record both rows in the harness README, and rerun `bench5/seams.ts` and every offline proof against it before Stage 0.
- T9: the scorer gives the first Stage A read; the blind audit confirms it before any claim.
- T10: keep the shared caches, with F4.

## Fairness fixes (attacks.md, lens 0)

- F1: `filterProse` and `countSoleTokens` read any alphanumeric run that mixes letters and digits as an id, and every capitalized word in any sentence position as a name candidate. `report.ts` adds a scored-leak audit that reads goal fields in the report only: it runs each goal's expected phrases, forbidden phrases, and `forbiddenPatterns` over the rendered summaries text and over the shown text, and records `soleScored` and `soleStale`. A nonzero value of either is a stop invariant. The driver proof gains a fixture summary carrying `WKND15` and a sentence-initial name absent from the briefing, which must report `soleScored` 1.
- F2: the g01 invariant compares the first pass's first select only. Every goal records `ledger.gauge.scale` before `respond` in both arms; a per-goal `|Δscale| / scale` above `LEDGER_SCALE_DRIFT` is a stop invariant. Rows record briefing tokens and the tail digest per goal.
- F3: digest the tail as seed index, role, and content through `messages.jsonl`, never as message ids.
- F4: the judge cache retries a live miss whose error `DETERMINISTIC_JUDGE_ERROR` does not match, within the bound in `settings.json`; after the bound, the run aborts with a harness-fault status and the pair reruns. `calls.jsonl` counts transient judge errors, and `report.ts` refuses a pair with a nonzero count.
- F5: in both arms, after the aggregate stage and before the wrapper returns, send one identical prefix-flush request to the agent model (fixed short system text, an empty user message, the SAMPLER with `num_ctx` 3072, `num_predict` 1, role `flush` in `calls.jsonl`).
- F6: `Aggregator.render` returns the topics cut by the allowance; rows record them. The pilot sets the allowance per model from that model's own control headroom. `report.ts` reports the share of goals with zero rendered topics, split into withheld and cut, and refuses a null verdict when that share is the majority.
- F7: rows record the aggregate-stage wall apart from the agent wall. A goal that times out or ends partial in the aggregate arm while its paired control did not, with an aggregate-stage wall above the agent wall, is a stop invariant.

## Feasibility fixes (attacks.md, lens 1)

Apply every FIX line of lens 1 as written. In short:

- `audit/items.ts` takes the row count as `--count N` (default 10) and reads `rows.jsonl` when it exists; the 24-row fixture carries all six `.jsonl` files.
- The long-scenario proof's scratch copy includes `variants/ledger/v1.json`.
- Dry mode adds the copy's requests at each `goal.after` and registers them, as seed mode does; pair coverage is a lower bound.
- `report.ts` takes prompt counts from `calls.jsonl` rows with role `agent`.
- `plan.ts` writes the cache path absolute; `Driver.ts` resolves `--cache`, `--fit`, and `--settings` against the harness directory; `tools/run-one.ts` reads `rows.jsonl` for bench5.
- The Mirror proof compares owner-record lines raw, and compares the quiet set over messages the assign rule leaves undefined.
- `resolveLookup` gets its own unit test at indices 80, 81, 134, and 135.
- The fixture server replays a `stream: true` exchange whose final NDJSON record carries `prompt_eval_count`, with content type `application/x-ndjson`.
- The seams list and `seams.ts` add `createConversationManager`, `LEDGER_CATEGORIES`, and the instruction manager's default `## Instructions` header.
- The assign rule is a pure exported helper in `bench5/helpers.ts` that the Mirror and seed mode both call.
- `copies.ts` builds `KNOWN` from `scenario-long.json` and adds a self-test that refuses g20 with a sentence-initial added name.
- Stage C runs copies 5 to 8 unless the pair clears at the low end.

## Cost rulings (attacks.md, lens 2)

- The projection's aggregate-overhead, seed-pass, calibration, pilot, shadow, and q4 figures are void. The pilot measures them: fresh pair questions and Mica seconds per goal for g11 and g12, summarizer and Mica seconds by question head, and the per-copy owner miss rate.
- Calibration bounds CHANGE negatives to a matched, code-sampled set.
- The shadow runs on copies 1 and 2 per model.
- Order: Stage 0 (seed pass, calibration, pilot on q2), Stage A (q2 copies 1 to 4), Stage B (g2 copies 1 to 4, then g4, then q4), Stage C under the corrected rule. Each stage's budget comes from the measured walls before it starts.

## Sections 9 fidelity

The arm measures the model reading aggregates live. The judge reading them is measured offline (T5), and CHANGE marks no supersession (T5). Each departure from `../../harness/bench/BRIEFING.md` § 9 is reported in the series report.

## Scoring audit (GPT-6 Astra, analyst route, session 01a12623-6b15-7eb3-8dec-3c1c72fa829e, 555,110 ms)

`../../harness/bench/long-audit.json` holds the audit of g11 to g24. Under the current rules, all 50 of its `current` replies score as labelled (checked in this session with `compileRules`, `scoreText`, and `clean` from `bench/rescore.mjs`). Every `change` ruling is accepted: tightened `forbiddenPatterns` on g11 to g24, the g15 and g24 literal `forbidden` strings moved into contextual patterns, and `happy` added to g22's `expected`. Applied to a scratch copy, the changes score every `changed` reply as labelled, and every flip of a `current` label is a correction.

The long-scenario unit also makes these edits to `check-long.mjs`:

- The `system` comparison removes the short scenario's date sentence (`Today is Thursday 2026-10-08.`) before comparing, because the long scenario serves the date through `days`.
- The facts check (every forbidden substring and pattern is absent from a goal's current facts and sources) applies to g11 to g24. g01 to g10 follow `scenario.json` byte for byte, including the g03 and g06 patterns that match facts 6, 11, and 15 there; `notes` records the exemption beside the g15 exemption.
- The g11 hedged sample carries every expected value beside an affirmative Marcus approval clause, so the hedged check can fail on the guard the audit added.

## Tool rulings (2026-10-10)

- Arm token: each model's first aggregate copy fills the summary cache and the CHANGE and AGREE rows, so `plan.ts` names it `l5-SHORT-aggregatefill-v1`. `tools/series.ts` then prices later aggregate copies from their own finished runs. `report.ts --pair` reads `aggregatefill` as copy 1 of the aggregate arm.
- `shadow.ts` keeps its `--copies` flag; the shadow runs copies 1 and 2 per model.
- A helper that only one self-contained script uses (`shadow.ts`, `copies.ts`, `seams.ts`, `calibrate.ts`) stays in that script, as `.claude/rules/documentation.md` § Workflow skills allows for a self-contained script; a helper two files use lives in `bench5/helpers.ts`. Types stay in `bench5/types.ts`.
