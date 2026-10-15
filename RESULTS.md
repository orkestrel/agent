# Results

**Compaction gauge qualification, 2026-10-15.** The repaired Compaction-only execution completed
21 of 96 goals, failed on attempted goal 22, and left 74 unexecuted. It stopped because the
actual prompt was 10425 tokens against a frozen projection of 10423; the reserved prompt limit
was 11776. This falsifies that gauge on the observed request, not the model's context capacity.
All 27 gauged requests joined to their provider receipts. The run produced an empty summary
and a nonempty summary; the latter relieved measured context pressure. The execution exited 1,
uncapped, after 732962 ms. Candidate-3 Records remains sealed at 96 completed goals and is not
rerun. Semantic grading is pending; no strategy-quality or speed conclusion follows from this
cross-build diagnostic. See [the retained qualification record](.orkestrel/agent/compaction.md).

**Study admission, 2026-10-14.** After the loader repair, the thinking-disabled capacity successor completed 48 records products with no partials, then exhausted the goal request allowance while filing judgments at goal 49. Compaction never executed. The CLI exited 1, uncapped, in 2545154 ms; public grading and reporting succeeded. The sealed result retains 48 of 192 scheduled products and 144 unexecuted outcomes. Records lookup coverage was observed; compaction-summary coverage was not. This is an admission failure, not a context or output overflow, and it supports no quality comparison. Quality execution did not start. See [the sealed execution record](.orkestrel/agent/handoff.md).

**Study execution, 2026-10-14.** The prospective thinking-disabled capacity attempt stopped before model requests because the captured loader rejected the provider's installed Agent dependency. Both trials are sealed infrastructure failures: 192 unexecuted goals, no products, and zero calls across every measured role. The CLI exited 1, uncapped, in 4520 ms; independent grading and reporting succeeded. This measures a workspace-loading failure, not model capacity or task quality. Quality execution did not start. See [the execution record](.orkestrel/agent/handoff.md).

**Capacity successor, 2026-10-14.** The extended comparison stopped after q4 records completed 48 of 96 goals and exhausted its 8,192-token output allowance on attempt 49. The remaining arms never started. This is a retained capacity failure, not a completed quality comparison. See [the capacity record](.orkestrel/agent/capacity.md).

**Graded baseline, 2026-10-14.** The comparison is the records design against the package's own window compaction, with the whole history as the overflow control, on the 96-goal continuous workload with Qwen 3.5 4B and 2B. Both original thinking settings are graded. With thinking enabled, the valid q4 report is inconclusive because records overflowed; the valid q2 report favors records, which served every goal while compaction served 38 of 96. The campaign and result custody live in this Agent checkout. See [the handoff](.orkestrel/agent/handoff.md) and [the package direction](.orkestrel/agent/direction.md).

## c1: records against the package's own compaction, graded 2026-10-13

Protocol `c1`: one serial trajectory per arm and model on the published `@orkestrel/agent` 0.0.30 build, Qwen 3.5 4B (`q4`) and 2B (`q2`), thinking disabled, window 3072 and reserve 512 for every arm. Every served product was adjudicated blind by its own independent adjudicator (Claude Opus 5.5 for q4, Claude Sonnet 5.5 for q2, Sonnet and GPT-6.1 Sol for the q2 continue run) against the frozen oracle, with three controls frozen before labeling. In the agent checkout, raw runs are under `.orkestrel/agent/instruments/harness/tmp/c1/<key>/<arm>/` and `harness/tmp/c1-continue/q2/compaction/`; packets, labels, and reports are under `.orkestrel/agent/instruments/results/c1/<key>/audit/`; keys are under `.orkestrel/agent/instruments/results/c1/<key>/private/`.

### Verdicts

| Key                 | Records                                                 | Compaction                                                                                                                          | Full view                        | Report verdict                                                                                                                             |
| ------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| q4                  | complete, 96 of 96 served                               | complete, 96 of 96 served                                                                                                           | context-length refusal at goal 3 | `records`: no conservative acceptable-product gain for compaction (overall -1 to 0, final 0 to 0); 40 critical regressions against records |
| q2                  | complete, 96 of 96 served                               | `failed` at goal 15 under the pre-registered stop policy: the model repeated one `lookup_order` call seven times until the step cap | context-length refusal at goal 3 | `records`: no gain on the 14 goals compaction served; 8 critical regressions                                                               |
| q2, continue policy | the same records trajectory, bound to the stop manifest | complete, 89 of 96 served; 7 goals unserved on identical-lookup loops (51 repeated lookups)                                         | not run                          | the report pairs nothing because the continue run binds its own manifest; the cross-report reading follows                                 |

The `full` arm is the overflow control: both models refused the third goal's prompt at the daemon's context length, as the design expected.

### q4 quality: atom pass rates and critical-rule violations

Overall, 96 goals, every arm served and judged:

| Arm        | Facts         | Work          | Obligations   | Revision     | Evidence      | Critical | Folded | Omitted |
| ---------- | ------------- | ------------- | ------------- | ------------ | ------------- | -------- | ------ | ------- |
| records    | 53% (213/402) | 36% (109/304) | 31% (109/350) | 26% (60/228) | 66% (126/192) | 10       | 0      | 94      |
| compaction | 11% (43/402)  | 10% (29/304)  | 10% (34/350)  | 10% (23/228) | 35% (68/192)  | 42       | 95     | 23      |

By four-shift interval, the facts pass rate and the critical violations, records then compaction:

| Shifts   | Facts     | Critical |
| -------- | --------- | -------- |
| 1 to 4   | 62% / 26% | 0 / 3    |
| 5 to 8   | 62% / 18% | 2 / 3    |
| 9 to 12  | 60% / 8%  | 1 / 7    |
| 13 to 16 | 49% / 10% | 2 / 10   |
| 17 to 20 | 46% / 4%  | 4 / 13   |
| 21 to 24 | 43% / 0%  | 1 / 6    |

Compaction's 42 violations are 15 fabricated external completions or receipts, 2 actions through withdrawn or superseded destinations, and 25 closures without the required source evidence. No product of either arm passed every atom of its rubric, so the report's acceptable-product pairing reads 95 ties and a gain of -1 to 0; the verdict `records` follows from the absence of a conservative gain and the 40 critical regressions.

### q2 quality

Overall, records over 96 goals, the failed compaction run over the 14 goals it served, and the continue-policy compaction run over the 89 goals it served:

| Arm                                    | Facts         | Work         | Obligations  | Revision     | Evidence      | Critical |
| -------------------------------------- | ------------- | ------------ | ------------ | ------------ | ------------- | -------- |
| records                                | 39% (158/402) | 21% (63/304) | 18% (63/350) | 19% (44/228) | 63% (121/192) | 16       |
| compaction, stop policy (14 goals)     | 24% (14/59)   | 0% (0/44)    | 23% (14/60)  | 4% (1/24)    | 18% (5/28)    | 8        |
| compaction, continue policy (89 goals) | 31% (113/369) | 13% (37/282) | 19% (63/326) | 15% (30/206) | 34% (61/178)  | 67       |

Records on the 2B model decays with the horizon: facts 53% in shifts 1 to 4 and 22% in shifts 21 to 24, critical violations 0 and 8. The continue-policy compaction run reads 47% of facts in shifts 17 to 20 and 26% in the final interval, with 17 and 12 critical violations there, and left 7 goals unserved.

### Costs

| Run                     | Agent requests | Agent tokens, prompt and completion | Summarizer tokens | Judge calls | Wall                          |
| ----------------------- | -------------- | ----------------------------------- | ----------------- | ----------- | ----------------------------- |
| q4 records              | 209            | 438376 and 48790                    | 0                 | 2626        | 109 min, 63 of them the judge |
| q4 compaction           | 129            | 230104 and 37552                    | 99609 and 26991   | 0           | 53 min                        |
| q2 records              | 461            | 976815 and 61403                    | 0                 | 2627        | 100 min, 56 of them the judge |
| q2 compaction, stop     | 29             | 51780 and 7896                      | 16105 and 3530    | 0           | 5 min                         |
| q2 compaction, continue | 176            | 324761 and 48634                    | 112825 and 25054  | 0           | 36 min                        |

Per served goal the records arm spent about 1.3 times the agent tokens of compaction at q4 and asked the judge 27 one-token questions; the judge's prompt tokens (767130 per run) are a filing cost the compaction arm has no counterpart for.

### What the runs say about the records design

- On both models the records design held the work together over 96 goals where compaction did not: at q4 it carried five times the facts, work, and obligations and a quarter of the critical violations; at q2 it served every goal while compaction looped on identical lookups, and under the continue policy it still led on facts, work, and evidence with a quarter of the critical violations.
- The gap widens with the horizon. Compaction's facts pass rate fell from 26% to 0% across the q4 intervals while records fell from 62% to 43%; compaction's critical violations climbed through shifts 13 to 20.
- Compaction's failure mode is specific: a 2B model with a recap-only history re-issues the same lookup until the step cap, and a 4B model fabricates completions and closes cases without the evidence its recap no longer carries. The records design's recall and repeat stop kept both from happening.
- The records design is not production-ready on these models by the oracle's bar: no product passed every atom, half of the replies hit the reserve, and the 2B run decays late. The costs are the judge filing (27 one-token calls per goal) and about 1.3 times the agent tokens.
- Direction for the package: plan generation room above the reserve (`predict` defaults to 0, and 47 of 209 q4 records replies were cut), carry the judge's filing cost out of the request path or batch it, and keep the lookup repeat stop and the answer-pass rethrow that the hardening added.

### Confounds and limits

- Reserve truncation: 47 of 209 records agent replies and 39 of 129 compaction agent replies at q4 ended at the 512-token reserve, 74 of 459 and 13 of 27 at q2, and 70 of 176 in the continue run; the adjudicators judged the cut text.
- Summarizer truncation: 69 of 93 q4 compaction recaps ended at the 320-token summarizer cap, so the compaction arm folded through cut recaps; this is the arm's frozen configuration.
- Judge cost: the records arm paid its judge calls inside the trajectory; wall time is not comparable across arms, tokens by role are.
- Product-text leaks: 19 q4 adjudicators recorded arm-revealing phrasing in a product (`[Summary of earlier messages]` in 14 compaction products, recall phrasing in 5 records products); they were blind to the designs, and the report counts the leaks per arm without voiding the batch. One q4, one q2, and one continue-run adjudicator missed the ambiguous control at the atom level; the reports record it.
- The `omitted` column for the records arm (94 of 96 goals) counts required sources the prompt did not carry verbatim; the ledger carries sources as records and recalls, so the column reads the ledger's selection rather than a loss.
- One trajectory per arm and model, a serial order, a shared GPU, and a labeling instrument whose adjudicators changed engine between packets: no independence and no model-superiority claim.

## c1 with thinking, graded 2026-10-14

The q4 report is valid and its verdict is `inconclusive`: records overflowed before completing the horizon. The thinking pass uses the same vendored 0.0.30 package and workload, with thinking enabled, reserve 1024, window 3584, `predict` 512, and the continue policy. GPT-6.1 Sol high adjudicated the blind products in disjoint batches, with at most 6 labelers running together. See [the q4 thinking report](../agent/.orkestrel/agent/instruments/results/c1/q4-think/audit/report.md).

The q4 run coverage is:

| Arm        | Terminal outcome                          | Products graded | Acceptable products | Critical violations |
| ---------- | ----------------------------------------- | --------------- | ------------------- | ------------------- |
| records    | overflow at goal 48; 47 complete goals    | 48              | 1                   | 11                  |
| compaction | complete; 4 of 96 goals unserved          | 92              | 0                   | 26                  |
| full       | overflow at goal 5; 2 successful products | 2               | 0                   | 0                   |

The records overflow row retains a reply and is graded, but its observation is incomplete. The report's top-level `served` field counts attempted rows; the table uses successful products from its arm tallies. This distinction also explains why the full arm has 5 attempted rows and 2 graded products.

The atom scores cover each arm's own served products, so these overall columns do not compare identical horizons:

| Arm        | Facts         | Work         | Obligations  | Revision     | Evidence      |
| ---------- | ------------- | ------------ | ------------ | ------------ | ------------- |
| records    | 55% (105/190) | 37% (53/144) | 33% (58/176) | 30% (35/116) | 81% (78/96)   |
| compaction | 51% (201/391) | 28% (82/292) | 26% (87/332) | 32% (68/213) | 62% (114/184) |

On the 44 paired goals, compaction has no acceptable-product win, 1 loss, 43 ties, and 9 critical regressions against records. Compaction's final-interval facts score is 51% (37/72), compared with 0% in the thinking-off run. That observed difference does not isolate thinking: the reserve, window, `predict`, and adjudicator also differ. Records has no final-interval reading because it stopped during shift 12.

The report records no design leaks and one missed ambiguous control. That batch's summary carries an invalid flag, while the frozen per-adjudicator control rule retains its labels and the overall report remains valid. Every packet item has an accepted label: 145 labels, including the controls, with 0 refused and 0 unlabeled. The raw integrity reader reports 0 failures for each q4 arm. The earlier daemon-interrupted compaction attempt remains excluded.

### q2 quality and coverage

The q2 report is valid and its verdict is `records`. Records completed all 96 goals; compaction completed the trajectory under the continue policy but served only 38. Neither arm produced an acceptable product under the complete rubric. See [the q2 thinking report](../agent/.orkestrel/agent/instruments/results/c1/q2-think/audit/report.md).

The q2 coverage and critical violations are:

| Arm        | Terminal outcome                             | Products graded | Acceptable products | Critical violations |
| ---------- | -------------------------------------------- | --------------- | ------------------- | ------------------- |
| records    | complete; no unserved or partial rows        | 96              | 0                   | 52                  |
| compaction | complete; 58 of 96 goals unserved            | 38              | 0                   | 17                  |
| full       | overflow at attempt 5; 3 successful products | 3               | 0                   | 0                   |

The full control completed only its first goal consecutively; later successful products do not repair the earlier unserved goal. Of compaction's 58 unserved rows, 36 carry a length failure and 22 are partial rows. Its receipts contain 150 repeated lookups across 40 goals, compared with none in records. Repeated lookups and unserved goals measure different events.

The q2 atom scores cover each arm's own served products:

| Arm        | Facts         | Work         | Obligations  | Revision     | Evidence      |
| ---------- | ------------- | ------------ | ------------ | ------------ | ------------- |
| records    | 47% (187/402) | 26% (78/304) | 22% (77/350) | 25% (57/228) | 68% (130/192) |
| compaction | 41% (61/149)  | 17% (20/115) | 16% (22/141) | 24% (21/88)  | 57% (43/76)   |

On 38 paired goals, compaction has 38 acceptable-product ties, no gain, and 12 critical regressions against records. The records verdict is a relative comparison: records still has 52 critical violations across its full horizon. Its facts score falls from 68% in shifts 1 to 4 to 36% in shifts 21 to 24, while its critical violations rise from 5 to 13. Compaction serves only 2 of the final interval's 16 goals, so its 86% facts score there describes 6 of 7 atoms on those products.

Every q2 packet item has an accepted label: 140 labels including controls, with 0 refused and 0 unlabeled. The report records no design leaks and one missed ambiguous control. As at q4, that batch summary carries an invalid flag, while the frozen per-adjudicator rule retains its labels and the overall report remains valid.

### Thinking costs and limits

The trajectory costs are:

| Key | Arm        | Agent requests | Agent prompt / completion tokens | Judge calls | Summarizer prompt / completion tokens | Elapsed |
| --- | ---------- | -------------- | -------------------------------- | ----------- | ------------------------------------- | ------- |
| q4  | records    | 136            | 288337 / 100058                  | 1291        | 0 / 0                                 | 77 min  |
| q4  | compaction | 152            | 278308 / 113474                  | 0           | 114917 / 31275                        | 83 min  |
| q2  | records    | 329            | 666705 / 224381                  | 2620        | 0 / 0                                 | 131 min |
| q2  | compaction | 383            | 729433 / 144533                  | 0           | 91759 / 20007                         | 52 min  |

Agent figures exclude calibration. The q4 records overflow request has missing usage, so its token totals are incomplete. The records judge accounts for about 30 elapsed minutes at q4 and 57 at q2. At q4 the report flags length truncation in 36 records goal rows and 53 compaction goal rows; at q2 those counts are 80 and 61. These are goal counts, not reply counts. Repeated q4 lookups total 1 across 1 records goal and 9 across 3 compaction goals.

Excluding the calibration requests, agent replies ended at length in 40 of 136 q4 records requests, 53 of 152 q4 compaction requests, 91 of 329 q2 records requests, and 61 of 383 q2 compaction requests. Summarizer replies hit their cap in 72 of 107 q4 requests and 40 of 91 q2 requests. See [the generation summary](../agent/.orkestrel/agent/instruments/results/c1/thinking-summary.jsonl); its role totals include calibration, and its `failed` request counts include failure notes such as length cuts rather than only operational faults.

Thinking-off used reserve 512, window 3072, and `predict` 0; thinking-on used 1024, 3584, and 512. The adjudicator also changed between settings. The observed q2 records facts score rises from 39% to 47%, while critical violations rise from 16 to 52; these readings do not isolate thinking as the cause. One trajectory per arm, a shared GPU, and cloud labeling overlapping local generation further limit the conclusions. Wall times describe these runs, not an isolated speed comparison. Neither thinking report establishes production readiness on these small models.

## Bounded capacity successors, 2026-10-14

Both profiles passed their short execution qualification before the original 96-goal workload. Neither completed the first full trajectory. Their observed failures remain separate from the graded baselines.

| Context | Output allowance | Q4 records completed | Terminal request                                         | Remaining population |
| ------- | ---------------- | -------------------- | -------------------------------------------------------- | -------------------- |
| 16,384  | 4,096            | 35 of 96             | Prompt 3,836; completion 4,096; length stop at `ev-09-4` | Not started          |
| 20,480  | 8,192            | 48 of 96             | Prompt 5,861; completion 8,192; length stop at `ev-13-1` | Not started          |

The extended request returned no answer text and 34,665 thinking characters after 173,719ms, within its 360,000ms request allowance. Character counts do not measure thinking tokens. No request followed either terminal failure. The fail-fast behavior worked; short qualification did not establish full-horizon output capacity. No further allowance increase or restart was selected. See [the frozen profiles, qualification readings and terminal custody](.orkestrel/agent/capacity.md).

## Earlier campaign notes (superseded)

**Resumed on 2026-10-12.** The remaining experiment is continuous long-work records versus living aggregate with Qwen4B, thinking disabled and enabled: four measured trajectories. These runs have not started. The existing continuous entry enforces the canceled ranked-selection campaign and forbids thinking mode; a bounded operator change is being scoped to execute the requested comparison honestly. The canceled pilots and other model variations remain canceled.

The dedicated Ollama endpoint was restored at18:00UTC on port11435 with the accepted executable, runner, and environment. The other session's service remains running. Opus's availability probe hit a session limit; separate native Astra planner and analyst lanes hold the bounded direction pass. See [the active plan](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/plan.md) and [progress record](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/progress.md).

Qwen 2B, Qwen 4B, and Gemma 2B records-versus-aggregate-versus-full-view development comparisons have received blind quality audits. None establishes an aggregate advantage. Aggregate adoption for possible 0.0.31 remains undecided; the mandatory continuous long-work comparison has not run. Agent 0.0.30 and its downstream package updates are published.

Gemma4 thinking-disabled aggregate stopped after 16/24 goal rows. At 2026-10-12 12:33 UTC, its recorded worker and the dedicated Ollama daemon were absent, with no terminal exit record. The partial run is preserved; its cause and exit status remain unknown. Saved requests account for 249119 tokens, with final or in-flight usage unknown. Summaries reached 8/16 completed goals. This is not a completed quality comparison. The dedicated service was restored on port 11435 at 12:36 UTC with matching executable, runner, version, model digests, and explicit settings. Your separate Ollama service remains running. See [the interruption evidence and recovery](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/results/l15/custody/g4-interruption/README.md).

Checkpoint `06d6f6578` is pushed on the scaffold session branch. The Qwen 4B thinking-disabled pilot-2 launched on that fixed HEAD at12:50UTC and was stopped at the user's request at13:03UTC. It recorded 10 completed goals and119393known tokens before cancellation. Its dispatcher recorded exit1, uncapped, after781517ms. This is a cancellation, not a model failure or configuration refusal. Its partial evidence and the original pilot's grades remain preserved; see [the cancellation record](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/results/l15/q4-think0/pilot-2/cancellation/README.md).

Gemma4 records and full view completed on checkpoint `4acb51125`. Records used 85364 tokens in 762618 ms; full view used 167761 tokens in 1563743 ms. Both completed 24 goals with complete usage and no execution failure; blind quality grading remains pending. Gemma2 passed strict calibration at cutoff 0.59, admitting 112/132 supported occurrences and 21/30 distinct supported summaries. Qwen2 and Gemma4 retain their strict calibration refusals and separate exploratory cutoffs of 0.68 and 0.61. Shared GPU use limits timing comparisons.

## Qwen 3.5 4B, thinking enabled

All l15 arms answered all 24 goals on frozen source. Clean Astra graded 72 anonymous entries before identities were joined. Independent checks passed, and root reviewed every reason against the original scenario without changing a judgment.

| Arm              | Correct content | Ambiguous content | Required system actions | Complete work | Run tokens |                              Duration |
| ---------------- | --------------: | ----------------: | ----------------------: | ------------: | ---------: | ------------------------------------: |
| Records          |           14/24 |              1/24 |                    5/24 |          2/24 |      66490 | Selected-attempt duration unavailable |
| Living aggregate |           14/24 |              1/24 |                    5/24 |          2/24 |     345653 |                            2086555 ms |
| Full view        |           16/24 |              2/24 |                    7/24 |          4/24 |     205408 |                            3979016 ms |

Full view also has one ambiguous complete-work result. Records and aggregate received identical verdicts on every goal across all reported axes. Both missed closed work, revived superseded counter hours, added unsupported refund timing, and omitted mandatory fresh lookups. Full view recovered the required Dalia callback and reopened damage claim, but also falsely claimed an external ticket delivery and invented replacement-shipment details. Excluding the predeclared protocol-sensitive g06 leaves correct content at 14/23, 14/23, and 16/23, and complete work at 2/23, 2/23, and 4/23. Narrower per-goal action compliance is 16/23, 16/23, and 17/23; it does not waive the system requirements.

Aggregate passed operational qualification with maintained-summary exposure on 18/24 goals and complete token usage. It used 5.20 times the records tokens and 1.68 times full view, counting every role. Rejected records preparation adds 11748 tokens; combined resource preparation took 706009 ms. Records and aggregate shared window 3584, reserve 1024, and output limit 512. Full view used its larger disclosed input bound. The separate Ollama service remains running at your direction; shared-GPU overlap limits elapsed-time comparisons. This development run establishes no aggregate quality advantage. Thinking-disabled results use different resource settings, so comparing modes does not isolate thinking. See [the sealed thinking-enabled comparison and per-goal reasons](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/units/aggregates/reports/resumption-l15-q4-thinking-quality/README.md).

## Qwen 3.5 4B, thinking disabled

All three l15 arms answered all 24 planned goals after the bounded qualification correction. A clean Astra auditor graded 72 anonymous entries before arm identities were joined. The grades and their source boundaries passed independent mechanical validation; root reviewed every joined reason without changing a grade.

| Arm              | Correct content | Ambiguous content | Required system actions | Complete work |   Run tokens |   Duration |
| ---------------- | --------------: | ----------------: | ----------------------: | ------------: | -----------: | ---------: |
| Records          |           18/24 |              1/24 |                    4/24 |          3/24 |        82123 |  559417 ms |
| Living aggregate |           17/24 |              1/24 |                    4/24 |          3/24 | 350266 known | 3030068 ms |
| Full view        |           16/24 |              1/24 |                    5/24 |          2/24 |       157589 | 1674884 ms |

Full view also has one ambiguous complete-work result. Aggregate matched records on 23 semantic verdicts and lost on one: it turned the buyer's contact details into the account manager's contact route. The exact request trace found no maintained summary exposed at that goal. Both arms received identical pinned account wording; records then recalled source records. The loss remains, but summary wording is not its established cause. Both arms missed the closed callback, completed shipment chases, expired sign-off cover, and reopened damage claim. Most incomplete work across all arms comes from missing mandatory fresh lookups; correct wording does not fulfill those actions. Excluding the predeclared protocol-sensitive g06 leaves correct content at 18/23, 17/23, and 16/23, and complete work at 3/23, 3/23, and 2/23. The narrower per-goal action lists pass 17/23, 17/23, and 16/23 and do not waive system requirements.

Summaries reached 18/24 aggregate goals. Aggregate used at least 4.26 times the records tokens, counting all run roles; separate calibration costs remain recorded. Its judge and flush requests each timed out once, leaving two unknown usage readings and an operationally unaccepted pilot. Another Ollama service shared the GPU, so its duration is confounded. This single development comparison establishes no aggregate benefit or causal improvement over earlier runs. Earlier independent audits and grades remain unchanged. See [the sealed latest comparison and every per-goal reason](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/units/aggregates/reports/resumption-l15-q4-quality/README.md).

## Historical Qwen 3.5 4B, thinking disabled

Records and aggregate served all 24 planned goals on frozen l14 source `5b9935430`. Full view served 22, failed at g23, and left g24 unattempted. Independent Astra graded the anonymous combined packet before identities were joined; failed and unattempted goals remain in the denominator.

| Arm              | Correct content | Ambiguous content | Required system actions | Complete work | Run tokens |   Duration |
| ---------------- | --------------: | ----------------: | ----------------------: | ------------: | ---------: | ---------: |
| Records          |           17/24 |              1/24 |                    4/24 |          3/24 |      82123 |  524338 ms |
| Living aggregate |           13/24 |              2/24 |                    4/24 |          3/24 |     349528 | 1835032 ms |
| Full view        |           16/24 |              1/24 |                    5/24 |          3/24 |     148479 | 1490075 ms |

Aggregate preserved the current refund approval and buyer corrections but added unsupported escalation recipients and delivery timing, misattributed a contact field, and made a callback route ambiguous. All arms frequently omitted mandatory fresh lookups; all missed active shipment-chase changes. Correct content alone does not count as completed work. Excluding the predeclared protocol-sensitive g06 leaves correct content at 17/23, 13/23, and 16/23, and complete work at 3/23 in every arm. Under the narrower per-goal tool lists, compliance is 17/23, 17/23, and 14/23; those lists do not waive system requirements.

Summaries reached 18/24 aggregate goals. Aggregate used 4.26 times the records tokens and 3.50 times the duration, counting all recorded roles with no unknown usage. Separate calibration costs remain in the campaign record. Full view used its disclosed larger input budget and remains operationally unresolved after an empty loaded-model response; the result does not establish a capacity limit. These are single development runs. The historical qualification refusal and all blind grades remain unchanged by the prospective harness correction. See [the sealed Qwen4 comparison and per-goal reasons](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/units/aggregates/reports/resumption-l14-q4-quality/README.md).

## Gemma 4 E2B, thinking disabled

Each arm completed all 24 planned goals on frozen l14 source `5b9935430`. An independent Astra auditor graded the anonymous combined packet before arm identities were joined. The sealed judgments and mechanical checks passed; no verdict changed after identity disclosure.

| Arm              | Correct content | Ambiguous content | Required system actions | Complete work | Run tokens |   Duration |
| ---------------- | --------------: | ----------------: | ----------------------: | ------------: | ---------: | ---------: |
| Records          |           15/24 |              1/24 |                    6/24 |          3/24 |      72328 |  518644 ms |
| Living aggregate |           13/24 |              1/24 |                    6/24 |          2/24 |     397608 | 1944308 ms |
| Full view        |           14/24 |              2/24 |                    5/24 |          2/24 |     164065 |  797218 ms |

Full view also has one ambiguous complete-work judgment. The aggregate used 5.50 times the records tokens and 3.75 times the duration, counting every recorded role with no unknown usage. Separate calibration costs remain in the campaign record. Full view used its disclosed larger input budget. These are single development runs, not repeated estimates of a general quality difference.

The aggregate recovered the active refund approval code and the required callback recall. It lost correctness on the credit arithmetic, claimed an unproved ticket delivery, and reused an earlier shipment estimate for a replacement. All arms frequently omitted required fresh lookups and missed reopened work. Correct facts alone do not count as completed work. Excluding the predeclared protocol-sensitive g06 leaves correct content at 15/23, 13/23, and 14/23, and complete work at 3/23, 2/23, and 2/23. Under the narrower per-goal tool lists, compliance is 17/23, 18/23, and 16/23; those lists do not waive system requirements.

Maintained summaries reached the agent on 14/24 aggregate goals, and the initial records/aggregate selection and gauge matched. The recorded strict refusal includes obsolete-identifier pattern checks and later per-goal scale deviations. Independent examination found the flagged identifiers in summary ID lists: the ticket list is ambiguous, while the approval-code prose explicitly retires the old value. Those flags do not establish harmful obsolete assertions. A separate source-contract check found that the later cross-arm scale gate conflicts with the plan, which permits later adaptive gauge differences. These findings change neither the historical refusal nor the blind answer grades; the qualification criterion needs a bounded correction before an adoption claim. See [the sealed Gemma comparison and retained diagnostic](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/units/aggregates/reports/resumption-l14-g2-quality/README.md).

## Qwen 3.5 2B, thinking disabled

Each arm emitted all 24 planned goal rows on source `0913a0966`. An independent Astra auditor graded the combined anonymous packet before arm identities were joined. Complete work requires correct content and the required actions; useful wording alone does not pass.

| Arm              | Correct content | Ambiguous content | Required system actions | Complete work |   Run tokens |   Duration |
| ---------------- | --------------: | ----------------: | ----------------------: | ------------: | -----------: | ---------: |
| Records          |           12/24 |              1/24 |                    4/24 |          3/24 |       105231 |  387868 ms |
| Living aggregate |           10/24 |              1/24 |                    5/24 |          4/24 |       360086 | 1117586 ms |
| Full view        |            7/24 |              0/24 |                    7/24 |          4/24 | 271750 known |  936483 ms |

Full view retained a failed goal with no final answer after an HTTP 500; that request's usage is unknown. Records and aggregate each also have one ambiguous complete-work judgment. Excluding the predeclared protocol-sensitive g06 gives correct content of 12/23, 10/23, and 7/23, and complete work of 3/23, 4/23, and 4/23. Under the narrower per-goal tool lists, compliance is 17/23, 18/23, and 19/23; those lists do not waive the system's fresh-lookup requirement.

Aggregate completed one more task than records but had fewer correct answers and used 3.42 times the run tokens. It improved the Grace escalation answer and performed the required depot-release lookup, but lost correctness on the ticket note, temporary sign-off cover, and discount eligibility. All arms struggled with fresh lookups, superseded facts, closed work, and unsupported additions. This development observation does not establish a general winner.

Maintained summaries reached the actual agent request on 15 of 24 aggregate goals. Six capped summary updates were withheld while the task continued. Run tokens include every recorded role; separate calibration and preparation costs remain in their campaign records. Full view used its disclosed larger input budget. See [the sealed audit and every per-goal reason](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/units/aggregates/reports/resumption-l13-quality/README.md), [aggregate costs](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/units/aggregates/reports/resumption-l13-aggregate-run.md), [records and exposure](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/units/aggregates/reports/resumption-l13-records-run.md), and [full-view costs](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/units/aggregates/reports/resumption-l13-full-run.md).

## Superseded matrix status

The unrun entries in this section were canceled by the user's narrower scope. They are historical status, not a remaining work list.

The l15 Qwen4 thinking-disabled records and full-view runs each served all 24 goals. Records used 82123 tokens in 559417 ms; full view used 157589 tokens in 1674884 ms, with complete usage and no operational failure. Aggregate emitted 24 goal rows, with summaries exposed on 18, but exited 1 after 3030068 ms because a judge request and a flush request had headers timeouts. Its 343 sent requests used 350266 known tokens, plus unknown usage on those failed requests. Another Ollama service shared the GPU, so elapsed time is confounded. The pilot remains operationally unresolved; it was not retried.

The l15 Qwen4 quality audits, Gemma4 generation and strict refusal, and Qwen2 generation are pushed through `1491e6b2b`. Gemma4's accepted labels contain 136 supported, 15 contradicted, and 28 ambiguous occurrences. Strict cutoff 0.79 admits only 36/136 supported occurrences and 6/36 distinct supported summaries. Qwen2's accepted labels contain 113 supported, 11 unsupported, 21 contradicted, and 23 ambiguous occurrences; corrected fit-2 preserves the strict refusal. Root's earlier wrong-model caller attempt is retained separately. See [the Qwen2 fit and exploratory execution ruling](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/results/l15/custody/q2-fit-and-exploratory-route/README.md).

Gemma2 generation closed without a cap in 1126851 ms; its generation stage took 1114591 ms. Saved-evidence validation accepted 174 items over all 162 contexts with complete usage totaling 246376 calibration tokens. Support adjudication and strict calibration are accepted; see [the retained fit and Gemma4 records result](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/results/l15/custody/g2-fit-and-g4-resource/README.md). The existing development route can run Gemma4 and Qwen2 exploratory comparisons after their preparation checks; it changes no harness code or qualification rule. Accepted records/full preparation can supply the baseline answers after custody and pairing checks, preserving all goals and any continuation-policy difference. No broad harness audit precedes measurement.

The current l15 goal-run status is:

| Decision model | Thinking | Records                          | Full view                        | Aggregate                                                     |
| -------------- | -------- | -------------------------------- | -------------------------------- | ------------------------------------------------------------- |
| Qwen 4B        | false    | Complete; graded                 | Complete; graded                 | All answers graded; operational failure                       |
| Qwen 4B        | true     | Complete; graded                 | Complete; graded                 | Complete; graded                                              |
| Gemma 4B       | false    | Complete; awaiting blind grading | Complete; awaiting blind grading | Interrupted after 16/24 goal rows; partial evidence preserved |
| Gemma 4B       | true     | Pending                          | Pending                          | Pending                                                       |
| Qwen 2B        | false    | Pending                          | Pending                          | Pending                                                       |
| Qwen 2B        | true     | Pending                          | Pending                          | Pending                                                       |
| Gemma 2B       | false    | Pending                          | Pending                          | Pending                                                       |
| Gemma 2B       | true     | Pending                          | Pending                          | Pending                                                       |

Qwen4 thinking-enabled resource preparation selected window 3584/reserve 1024/output limit 512. Its accepted records run used 66490 tokens; the rejected first budget adds 11748 preparation tokens, all with known usage. Whole resource preparation took 706009 ms; a separate selected-attempt duration is unavailable. Records and aggregate share that accepted budget. Comparing thinking modes must also disclose their different resource settings.

Thinking-enabled full view answered all 24 goals and exited 0 uncapped in 3979016 ms. Its 58 requests used 205408 tokens with complete usage and no recorded operational failure. Aggregate used 5.20 times the accepted records tokens and 1.68 times the full-view tokens, counting every run role. Operational acceptance does not establish answer quality. See [the completed execution and costs](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/results/l15/README.md).

The bounded qualification correction is accepted and pushed at `9273347a1` after independent Astra review, static checks, a canonical build, and 423 passing tests. It preserves identical starting context, permits valid later adaptive scale differences, and removes the collected ID index from decision-side summaries while retaining maintained prose and its checks. Fresh l15 Qwen4 generation completed in 1373580 ms and is retained at `318a81fa7`. Root accepted the blind support labels, and the fixed fit passed at AGREE 0.61: 136/154 supported occurrences and 35/43 distinct supported identities admitted. Historical results remain unchanged. See [the correction acceptance](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/units/aggregates/reports/resumption-qualification-correction/README.md) and [the l15 evidence](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/results/l15/README.md).

The repaired measurement code is pushed at `5b9935430`. Independent review and scoped checks passed, including the complete exploratory runtime fixture in 2137628 ms; the canonical live build preserves all 624 tested output hashes. Actual Claude Opus 5.5 and independent Astra analysis informed [the accepted direction](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/units/aggregates/reports/resumption-comparison-completion-direction.md). Strict qualification and adoption requirements remain unchanged. See [the repair decision and failed-gate measurements](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/units/aggregates/reports/resumption-admission-repair.md).

L14 has frozen all eight decision-mode configurations and completed its fixed calibration generations and independent labels. The actual goal-run status is:

| Decision model | Thinking | Records run | Full-view run              | Aggregate run                   |
| -------------- | -------- | ----------- | -------------------------- | ------------------------------- |
| Qwen 2B        | false    | Complete    | Operational failure at g05 | Admission blocked               |
| Qwen 2B        | true     | Pending     | Pending                    | Pending                         |
| Gemma 2B       | false    | Complete    | Complete                   | Complete; qualification refused |
| Gemma 2B       | true     | Pending     | Pending                    | Pending                         |
| Gemma 4B       | false    | Pending     | Pending                    | Pending                         |
| Gemma 4B       | true     | Pending     | Pending                    | Pending                         |
| Qwen 4B        | false    | Complete    | Operational failure at g23 | Complete; qualification refused |
| Qwen 4B        | true     | Pending     | Pending                    | Pending                         |

Root adjudication and fixed fits are complete and pushed at `708553ef9`. Gemma 2B passed strict calibration at AGREE 0.59, admitting 112/131 supported occurrences and 21/29 distinct supported identities. Qwen 4B passed at 0.61, admitting 136/154 and 35/43. Qwen 2B and Gemma 4B were refused because their strict cutoffs admitted too few supported summaries; their predeclared exploratory cutoffs are 0.67 and 0.57. These are calibration outcomes, not task-quality wins. See [the calibration evidence and costs](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/results/l14/README.md).

Qwen 2B's resource preparation passed at reserve 512 with a 3072-token window: 381774 ms, 78 requests, 105231 tokens, no unknown usage or model errors. Its full-view preflight stopped at g05 after 182687 ms: Ollama reported an XML parser HTTP 500. The failed preflight retains 20 sent requests, 45980 known tokens, and one request with unknown usage. This is an operational failure, not a measured capacity refusal. Independent analysis and root's emitted-reader check confirm that the frozen continuation rule does not admit this preflight. Qwen's l14 cell remains unresolved. No retry, source amendment, or recalibration follows from this failure.

Gemma's l14 blind comparison is complete; its results are reported earlier in this file. See [preparation](https://github.com/orkestrel/scaffold/blob/6124f4c240043ed4749257f97beee86001d8d51f/.orkestrel/agent/instruments/results/l14/custody/files/tmp/units/aggregate-final-g2-preparation-report.md) and [the aggregate run, costs and refusal evidence](https://github.com/orkestrel/scaffold/blob/6124f4c240043ed4749257f97beee86001d8d51f/.orkestrel/agent/instruments/results/l14/custody/files/tmp/units/aggregate-final-g2-pilot-report-2.md).

Qwen 4B's blind quality comparison is complete and reported earlier in this file. The daemon records eviction during full-view generation followed by another Qwen2B request; client ownership remains unproved. The historical run remains operationally unresolved, and its aggregate qualification remains refused. See [the retained pilot](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/units/aggregates/reports/resumption-l14-q4-pilot/README.md) and [the closed Qwen report](https://github.com/orkestrel/scaffold/blob/6124f4c240043ed4749257f97beee86001d8d51f/.orkestrel/agent/instruments/results/l14/custody/files/tmp/units/aggregate-final-q4-cell-report.md). No historical full-view retry is authorized.

The bounded successor correction removes the unsupported later gauge-difference gate and the code-generated identifier index in the decision summary. Earlier runs and grades remain unchanged. The closed pilot retains its frozen source and qualification. See [the correction and execution ruling](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/units/aggregates/reports/resumption-qualification-correction-direction.md) and [the retained Qwen4 daemon diagnosis](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/units/aggregates/reports/resumption-l14-q4-diagnostic/README.md).

The remaining comparison, after the user resumes, is:

- Qwen4B thinking disabled: records versus aggregate on the same continuous long-work scenario.
- Qwen4B thinking enabled: records versus aggregate on the same continuous long-work scenario.
- Blind analysis of correctness, required actions, completed work, late-conversation quality, stale claims, summary exposure, all-role tokens, and elapsed time; then a focused adoption verdict.

The earlier Gemma/Qwen2 variations, short pilots, full-view runs, longer matrix stages, and separate judge shadow have no remaining execution requirement. See [the revised plan and hold](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/plan.md).

No continuous pair has run. The development results do not authorize aggregate integration.

## Release and workspace

Published agent 0.0.30 matches the verified archive. Agent main is at `ee734c3`; release checks passed 1857 tests with 2 applicability skips, replay 108/108, and a raw comparison with no differences across 618 requests per build. See [publication](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/instruments/units/agent-0030/publication.md).

Toolbox 0.0.19 (`979d725`) and Ollama 0.0.23 (`93ea1cb`) are published and registry-confirmed, matching their verified archives. Their full release chains passed 860 tests with 2 skips and 899 tests with 3 skips respectively; Ollama includes 76/76 live service tests. Earlier fixture failures remain recorded; the previously hidden failed predicate was not reconstructed. Desk's registry re-pin is pushed at `af774cd` after format, lint, type checks, 532 tests with 4 conditional skips, six browser journeys, and production build passed. Supervisor and Tactica are excluded by user instruction. See [downstream status](../scaffold/.orkestrel/release.md#agent-0030-downstream-re-pins).

Aggregate work is in the normal scaffold checkout on `claude/confident-maxwell-6nd0f3`; compare that branch with main for committed changes. Scaffold main remains release-only at `a64a80b`, with downstream closure recorded and pushed as a fast-forward. The completed Agent release and Ollama compatibility worktrees are removed; the previously rejected dependency-junction cleanup remains untouched. See [the plan](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/plan.md), [progress](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/progress.md), and [routing ledger](https://github.com/orkestrel/agent/blob/e85f5eea2e0f3150213d767cd414a3385fa429c7/.orkestrel/agent/ledger.md).
