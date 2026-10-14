# Direction for `@orkestrel/agent` after the c1 comparison

Updated 2026-10-14 from the graded thinking-off and thinking-on c1 runs in Agent's [RESULTS.md](../../RESULTS.md), the hardening accepted at `901c786` (no version bump yet), and the falsify verdicts. Each direction names the evidence behind it, the change it implies, the measurement that must move, and what it must not break.

## 1. Plan generation room above the reserve

**Evidence.** Every arm ran with `num_predict` equal to the 512-token reserve and the ledger's `predict` option at its default of `0`. At q4, 47 of 209 records replies and 39 of 129 compaction replies ended with `reason: length`; at q2, 74 of 459 records replies and 13 of 27 compaction replies; in the continue run, 70 of 176. The adjudicators judged the cut text, so every truncated reply paid for its missing tail in the facts, work, and obligations atoms. The ledger plans its selection against `capacity` minus the reply reserve and treats `predict` as the room thinking and the reply share; with `predict` at `0` the plan leaves no room for the reply to grow past the reserve, and the reserve itself is the only cap.

The thinking-enabled pass adds a capacity failure. At q4 with thinking on, a 1024 reserve, a 3584 window, and `predict` 512, the records arm stopped with `overflow` at goal 48 of 96 (`ev-12-4`, a shift-handoff product; prompt 3444 tokens), where the thinking-off run at reserve 512 served all 96. The overflow row retains a graded reply, but its observation is incomplete: the report counts 47 complete goals and gives an `inconclusive` verdict. It flags length truncation in 36 records goal rows. This supports measuring separate thinking and product room; it does not isolate thinking as the cause because the window, reserve, and `predict` also changed. The q2 thinking records run completed all 96 goals without an unserved or partial row, so the q4 stopping point is not a general threshold. The q2 compaction run served 38 of 96: 36 unserved rows carry a length failure and 22 are partial rows.

The q4 thinking report also narrows the quality claim. Records has 1 acceptable product among 48 graded, and compaction has none among 92; on 44 paired goals, compaction has 1 loss and 9 critical regressions against records. Compaction completes the horizon and reaches 51% facts in the final interval, where its thinking-off run scored 0%. The differing budgets and adjudicators prevent attributing that difference to thinking alone. See [the q4 thinking report](instruments/results/c1/q4-think/audit/report.md).

The valid q2 thinking report favors records, with facts/work scores of 47%/26% against compaction's 41%/17% over their respective served products. Neither arm has an acceptable product under the full rubric. Records has 52 critical violations across 96 products, and its facts score falls from 68% to 36% across the horizon. Compaction has 17 critical violations across 38 products and serves only 2 goals in the final interval. The coverage advantage does not establish production readiness. See [the q2 thinking report](instruments/results/c1/q2-think/audit/report.md).

**Change.** Make the reply's planned room a first-class budget member rather than a side effect of the provider's `num_predict`: derive the ledger's `predict` from the reply reserve when the caller leaves it absent (the harness's `buildBudget` already maps a 1024 reserve to a 512 `predict`; the package's default can express the same relationship), size the reply reserve from a measurement of the product the workload asks for rather than a ladder rung, and report a truncated reply as a `LedgerResult` reading (`reason: length` on the last pass) so a caller can retry with more room or carry the cut forward on purpose.

**Measurement that must move.** The `length` share of agent replies in a c1 series at a reserve that fits the workload's products, and the facts and work pass rates on the goals that were cut before; `instruments/harness/tools/c1/c1-summary.ts` reads both per run. Under thinking, the goal at which the records arm overflows, if it does.

**Must not break.** The golden probes: a changed default `predict` changes the plan and therefore the request bytes, so the complete-capture probe re-baselines deliberately, with the change named, never silently.

## 2. Take the judge's filing out of the request path, or batch it

**Evidence.** The records arm filed its judgments inside each trajectory: 2626 one-token judge calls per 96-goal run (27 per goal), 767130 judge prompt tokens, and 63 of 109 wall minutes at q4 and 56 of 100 at q2. The compaction arm paid nothing comparable. The judge's work is classification of arrivals and pairings, which depends on the conversation and the judge model, not on the request being served; it only has to be complete before the selection that reads it.

With thinking enabled, q4 records pays 1291 judge calls and about 30 of 77 elapsed minutes before its overflow; q2 records pays 2620 calls and about 57 of 131 minutes over the full horizon. The shared host and differing coverage limit wall-time comparisons, but filing remains a measured request-path cost.

**Change.** Separate filing from serving: file arrivals as they are added (an `add` hook on the conversation, or a `file()` method on the ledger a host calls when a message lands), so the request path finds the classification already done; batch the pair and category questions of one arrival into one judge request where the judge wire allows several questions per state (the `JudgeRequest` already carries a `questions` record keyed by id, so the batching is in the classifier's grouping, not in the wire); and keep the judge cache keyed on the question bytes so a re-run replays the filing. The ledger's `respond` then pays only the questions the new request raises.

**Measurement that must move.** Judge requests per served goal and the judge's share of the trajectory wall; both are in each run's `costs` member of the c1 report.

**Must not break.** The repeat stop and the answer pass, which read the classification at the moment of selection; a filing that runs late must block the selection, never let it read a partial classification.

## 3. Keep the lookup repeat stop and the answer-pass rethrow

**Evidence.** The q2 compaction arm, which has no repeat stop, re-issued one `lookup_order` call seven times at goal 15 under the stop policy and 51 times across 7 goals under the continue policy, each loop ending at the step cap with no product. The q2 records arm hit the repeat stop 6 times across 6 goals and served every goal (`instruments/harness/tools/c1/c1-repeats.ts` reads both arms' receipts). The answer-pass rethrow landed in the hardening (`src/core/ledgers/Ledger.ts`): a first pass that rejects is recovered into the answer pass, and when that pass rejects too the caller sees the error instead of an empty partial, so a transport fault reads as a fault and not as a served empty reply.

The q2 thinking receipts contain 150 repeated lookups across 40 compaction goals, with 329 lookup calls overall. Records has 117 lookup calls and no repeats. The whole compaction trajectory has 58 unserved goals; repeat and unserved counts measure different events and must not be substituted for each other. At q4 thinking, records has 1 repeated lookup and compaction has 9 across 3 goals.

**Change.** None to the mechanisms. Two additions follow from the compaction arm's loop: give the plain agent loop a repeat stop of its own (the same tool-name-and-canonical-arguments identity the ledger uses, surfaced as a `ToolResult` failure with the `repeat` note) so a consumer who chooses compaction over records does not inherit the loop; and surface the count of repeat stops and answer-pass recoveries on `LedgerResult`, since both are the signals a host needs to decide whether to retry, widen the room, or stop.

**Measurement that must move.** Unserved goals and repeated lookups per run under the continue policy; the c1 report's `served` member and `c1-repeats.ts`.

**Must not break.** Lookups with distinct canonical arguments in one request (`bw-5512` and `BW-5512` both run); the repeat stop compares canonical arguments without the projection's string normalization, and the hardening pinned that with a test.

## 4. Smaller findings the runs surfaced

- The compaction summarizer cut 69 of 93 q4 recaps at 320 tokens. A consumer who uses the package's compaction on long work needs a recap budget derived from the section's size, not a flat cap; the `sections` cap and `keep` carry the shape, the recap length does not.
- The compaction arm's prompt carried a required source only through a recap in 95 of 96 q4 goals; the records arm omitted the verbatim source in 94 of 96 but carried it as a record or a recall. The `omitted` and `folded` readings are worth promoting to package-level observability (which sources a prompt carried verbatim, through a record, through a recap, or not at all), because they explain the quality gap better than token counts.
- Both arms' products leaked design phrasing (`[Summary of earlier messages]` from the recap prefix, "recall tool closed" from the ledger's closure note). Neither harms a consumer, but a blind audit needs the prefix and the notes configurable so an evaluation can neutralize them.

## 5. Preserving the harness for development use

The portable package and command are implemented; see [Study's guide](../../../study/guides/study.md). Agent owns its unpublished `studies/` adapters and inputs, with results under `tmp/studies/`. Study's git history through `3b7d6f3` retains the user-requested Opus review and Fable synthesis that superseded the scaffold `bench/agent/` sketch. Keep local checks, capacity execution, memory comparison, versioned grading and report rendering separate. Historical harness preservation remains distinct from this completed extraction.

Before retiring the campaign, preserve the ignored raw runs and emitted builds with their digests. Keep historical manifests unchanged as provenance; their absolute paths must not be rewritten to imply replayability. Future studies must identify the artifact actually loaded as vendor, workspace, or installed tarball. Keep held-out truth outside agent-visible input and published artifacts. The tracked development oracle is not secret merely because its folder is named private.

Promote the complete-capture golden probe and its negative controls into the package's ledger tests as a separate implementation unit. The recording then makes any deliberate request-byte re-baseline reviewable. The baseline materializer remains campaign evidence.

The original thinking pass is graded. The extended bounded comparison stopped after48completed q4records goals when attempt49 exhausted8192output tokens without an answer. See [capacity.md](capacity.md). Preserve both frozen harnesses and their evidence while custody closes. The user requires Agent and Study campaign cleanup in scaffold before any series restart.
