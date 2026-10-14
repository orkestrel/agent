# Direction for `@orkestrel/agent` after the c1 comparison

Written 2026-10-13 from the graded c1 runs in the root `RESULTS.md` § c1, the hardening accepted at `901c786` (no version bump yet), and the falsify verdicts. Each direction names the evidence behind it, the change it implies, the measurement that must move, and what it must not break.

## 1. Plan generation room above the reserve

**Evidence.** Every arm ran with `num_predict` equal to the 512-token reserve and the ledger's `predict` option at its default of `0`. At q4, 47 of 209 records replies and 39 of 129 compaction replies ended with `reason: length`; at q2, 74 of 459 records replies and 13 of 27 compaction replies; in the continue run, 70 of 176. The adjudicators judged the cut text, so every truncated reply paid for its missing tail in the facts, work, and obligations atoms. The ledger plans its selection against `capacity` minus the reply reserve and treats `predict` as the room thinking and the reply share; with `predict` at `0` the plan leaves no room for the reply to grow past the reserve, and the reserve itself is the only cap.

The thinking-enabled pass sharpens this. At q4 with thinking on, a 1024 reserve, a 3584 window, and `predict` 512, the records arm stopped with `overflow` at goal 48 of 96 (`ev-12-4`, a shift-handoff product; prompt 3444 tokens), where the thinking-off run at reserve 512 served all 96. Thinking spends the reply's room before the product starts, and the larger window the higher reserve buys does not cover the prompt growth of the handoff goals. The plan has to reserve room for thinking and for the product separately.

**Change.** Make the reply's planned room a first-class budget member rather than a side effect of the provider's `num_predict`: derive the ledger's `predict` from the reply reserve when the caller leaves it absent (the harness's `buildBudget` already maps a 1024 reserve to a 512 `predict`; the package's default can express the same relationship), size the reply reserve from a measurement of the product the workload asks for rather than a ladder rung, and report a truncated reply as a `LedgerResult` reading (`reason: length` on the last pass) so a caller can retry with more room or carry the cut forward on purpose.

**Measurement that must move.** The `length` share of agent replies in a c1 series at a reserve that fits the workload's products, and the facts and work pass rates on the goals that were cut before; `instruments/harness/tools/c1/c1-summary.ts` reads both per run. Under thinking, the goal at which the records arm overflows, if it does.

**Must not break.** The golden probes: a changed default `predict` changes the plan and therefore the request bytes, so the complete-capture probe re-baselines deliberately, with the change named, never silently.

## 2. Take the judge's filing out of the request path, or batch it

**Evidence.** The records arm filed its judgments inside each trajectory: 2626 one-token judge calls per 96-goal run (27 per goal), 767130 judge prompt tokens, and 63 of 109 wall minutes at q4 and 56 of 100 at q2. The compaction arm paid nothing comparable. The judge's work is classification of arrivals and pairings, which depends on the conversation and the judge model, not on the request being served; it only has to be complete before the selection that reads it.

**Change.** Separate filing from serving: file arrivals as they are added (an `add` hook on the conversation, or a `file()` method on the ledger a host calls when a message lands), so the request path finds the classification already done; batch the pair and category questions of one arrival into one judge request where the judge wire allows several questions per state (the `JudgeRequest` already carries a `questions` record keyed by id, so the batching is in the classifier's grouping, not in the wire); and keep the judge cache keyed on the question bytes so a re-run replays the filing. The ledger's `respond` then pays only the questions the new request raises.

**Measurement that must move.** Judge requests per served goal and the judge's share of the trajectory wall; both are in each run's `costs` member of the c1 report.

**Must not break.** The repeat stop and the answer pass, which read the classification at the moment of selection; a filing that runs late must block the selection, never let it read a partial classification.

## 3. Keep the lookup repeat stop and the answer-pass rethrow

**Evidence.** The q2 compaction arm, which has no repeat stop, re-issued one `lookup_order` call seven times at goal 15 under the stop policy and 51 times across 7 goals under the continue policy, each loop ending at the step cap with no product. The q2 records arm hit the repeat stop 6 times across 6 goals and served every goal (`instruments/harness/tools/c1/c1-repeats.ts` reads both arms' receipts). The answer-pass rethrow landed in the hardening (`src/core/ledgers/Ledger.ts`): a first pass that rejects is recovered into the answer pass, and when that pass rejects too the caller sees the error instead of an empty partial, so a transport fault reads as a fault and not as a served empty reply.

**Change.** None to the mechanisms. Two additions follow from the compaction arm's loop: give the plain agent loop a repeat stop of its own (the same tool-name-and-canonical-arguments identity the ledger uses, surfaced as a `ToolResult` failure with the `repeat` note) so a consumer who chooses compaction over records does not inherit the loop; and surface the count of repeat stops and answer-pass recoveries on `LedgerResult`, since both are the signals a host needs to decide whether to retry, widen the room, or stop.

**Measurement that must move.** Unserved goals and repeated lookups per run under the continue policy; the c1 report's `served` member and `c1-repeats.ts`.

**Must not break.** Lookups with distinct canonical arguments in one request (`bw-5512` and `BW-5512` both run); the repeat stop compares canonical arguments without the projection's string normalization, and the hardening pinned that with a test.

## 4. Smaller findings the runs surfaced

- The compaction summarizer cut 69 of 93 q4 recaps at 320 tokens. A consumer who uses the package's compaction on long work needs a recap budget derived from the section's size, not a flat cap; the `sections` cap and `keep` carry the shape, the recap length does not.
- The compaction arm's prompt carried a required source only through a recap in 95 of 96 q4 goals; the records arm omitted the verbatim source in 94 of 96 but carried it as a record or a recall. The `omitted` and `folded` readings are worth promoting to package-level observability (which sources a prompt carried verbatim, through a record, through a recap, or not at all), because they explain the quality gap better than token counts.
- Both arms' products leaked design phrasing (`[Summary of earlier messages]` from the recap prefix, "recall tool closed" from the ledger's closure note). Neither harms a consumer, but a blind audit needs the prefix and the notes configurable so an evaluation can neutralize them.

## 5. Preserving the harness for development use

The c1 harness (`instruments/harness/`: the bench5 driver, the continuous entry, the blind audit, the endurance readers, the vendored 0.0.30 build and the vendored Ollama provider, the workload under `instruments/units/aggregates/endurance/`, and the c1 tooling under `tools/c1/` and `golden/`) lives in this campaign folder, which moved from the scaffold checkout into the agent package on 2026-10-13 and which the law deletes at acceptance. Two homes keep it usable, in order of preference:

1. **A durable instruments tree in the scaffold repository, outside `.orkestrel/`.** Move `instruments/harness/` and `instruments/units/aggregates/endurance/` to `bench/agent/` at the scaffold root, keep the dedicated-daemon launcher and the dispatch launches as they are, and give the harness a `package.json` script set (`build`, `test`, `freeze`, `series`, `blind`, `report`) so it runs by name. The private oracle and the keys stay in this tree, which is the only tree that may hold held-out truth. The agent package gains one `bench` script that runs the sibling checkout's harness against the installed package through the vendored-build seam (the harness already binds the package by a hashed vendored build, so a new release is benched by re-vendoring and freezing). This keeps the public package free of the oracle and of the 500-file harness while making the bench one command away.
2. **The golden probes promoted into the package's own tests.** `golden/ledger-golden-full.test.ts` and its recording settle the claim that the records design is unchanged; promote them into `tests/src/core/ledgers/Ledger.test.ts` as a golden case with the recording as a fixture beside the test, plus the two negative controls, so every release re-proves the request bytes against a recorded baseline and a deliberate re-baseline is a visible diff of the fixture. The `baseline-materialize.ts` control (the unedited `ee734c3` suites against the tip) belongs to the campaign and retires with it.

The thinking-enabled pass reuses the harness as it stands; the move happens after it closes.
