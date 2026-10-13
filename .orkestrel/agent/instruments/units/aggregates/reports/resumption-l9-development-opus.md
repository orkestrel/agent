I couldn't save a plan file because this session has only Read, Grep and Glob, so the report follows here. I read all the evidence the brief named, and no evidence read was blocked.

# Measurement direction after the l9 failures

## Decision

Keep the refused fit and every adoption gate as they are. Add one bounded correction with two parts:

1. **A shared rule for failed goals.** One rule, frozen before any run and applied to records, aggregate and full view alike, so a malformed tool call from the model fails that goal instead of stopping the whole run.
2. **A separately named exploratory aggregate condition.** It admits every summary that passes the lexical check. It still records the support judge's score but doesn't use it as a gate. It can never feed the run plan or adoption.

Then run records, full view and the exploratory aggregate on one rebuilt build and grade them blind against the same 24 development goals.

## What the failed fit establishes

These are observations from the files:

- **The judge doesn't separate the classes at any cutoff that admits anything.** The highest-scored nonpositive is a contradicted occurrence at 0.9285 (`.orkestrel/agent/instruments/results/l9/calibration/q2/fit-v3/diagnosis.json:1353-1358`). Every generated supported occurrence scores lower, from 0.3543 (`:190-195`) to 0.8778 (`:255-258`).
- **Why the cutoff is 0.93.** The fit rule picks the lowest grid cutoff that rejects every scored nonpositive (`.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:253-269`). That gives 0.93, which admits 0 of 122 scored supported occurrences. The admission floor then refuses the fit (`:295`).
- **Many nonpositives sit inside the supported range.** Examples are an ambiguous occurrence at 0.7902 (`:1159-1167` region, identity `8ea5c1…`), another ambiguous at 0.7552, and a contradicted one at 0.7264 (`:1241-1246`).
- **The decisive 0.9285 item has every fact right but changes who said it.** It attributes a tool lookup to a user message (`.orkestrel/agent/instruments/results/l9/calibration/q2/labels-v3.json:1750-1769`).
- **Scores repeat per identity.** Each candidate identity gets one fixed score, so the 168 occurrences carry only 47 exact semantic groups of independent information (`.orkestrel/agent/instruments/units/aggregates/reports/resumption-l9-q2-adjudication.md:3`).

From that I infer two things:

- **The judge is the bottleneck, not the summarizer.** The summarizer produced labeled-supported text in 123 of 168 occurrences. The judge scores factual support and is blind to attribution defects.
- **A summarizer change has no evidence behind it.** Swapping the summarizer would not repair this gate. A judge change is the lever the evidence supports.

## Does the gate block observing the behavior under test?

Yes. The aggregator refuses to run without a separating fit (`.orkestrel/agent/instruments/harness/bench5/aggregates/Aggregator.ts:77`). The pilot needs a fit file (`.orkestrel/agent/instruments/harness/bench5/matrix/Matrix.ts:397`), and the plan only reads an accepted pilot (`.orkestrel/agent/instruments/harness/bench5/matrix/Matrix.ts:479-496`).

So for this judge, perfect separation plus the admission floor makes qualifying the judge a precondition for seeing any work quality from the aggregate at all. That is right for adoption and wrong for development observation.

## Ruling on the exploratory condition

A separately named exploratory condition can give valid and useful evidence under these conditions:

- Its admission policy is frozen before any work-quality output exists.
- `fit-v3` and its refusal stay untouched.
- No fit file is written for it.
- Its manifest says `exploration` and lives outside `pilot/`, so the plan step never reads it.
- Its result answers only this question: at the summarizer's measured support rate, does a maintained aggregate help or hurt same-goal work compared with records and full view?

**Policy: admit every summary that passes the lexical check, and record the support score without using it as a gate.** Keep the CHANGE threshold of 0.56, the rebuild-and-retry path, and maintenance at every read point.

I reject a cutoff in between. The predecessor fit used an agreement threshold of 0.82 (`.orkestrel/agent/instruments/harness/bench5/fit.json:3`). By my count from the diagnosis readings, 0.82 admits 18 of 123 supported occurrences (4 of 31 identities). It still lets through the 0.9285 contradicted item, so it combines low exposure with nonzero contamination. The fallback cutoff by best balanced accuracy (`.orkestrel/agent/instruments/harness/bench5/calibrate.ts:494-513`) is just as arbitrary given this overlap.

The labels already measure contamination for the ungated condition: 21 contradicted, 12 unsupported and 12 ambiguous out of 168.

## Full view: what failed and why

| Category | Ruling | Evidence |
|---|---|---|
| Resource inadequacy | Not the cause | Request 19 used 4,782 prompt tokens. Request 20 was estimated at 3,946 against a ceiling of 262,144 (`.orkestrel/agent/instruments/results/l9/q2-think0/full/preflight/l6-q2-think0-full-v1/requests.jsonl:19-20`, `.orkestrel/agent/instruments/results/l9/q2-think0/full/manifest.json:323-328`) |
| Model tool-format failure | The cause (observed) | Request 20 returned HTTP 500 with the server's error `XML syntax error on line 6: element <function> closed by </parameter>` (`.orkestrel/agent/instruments/results/l9/q2-think0/full/preflight/l6-q2-think0-full-v1/requests.jsonl:20`). The same failure occurred in the earlier full view |
| Harness stop classification | Wrong label (inferred from code) | See the steps after this table |

How the harness mislabeled the stop:

1. Any non-2xx response is classed as transport (`.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:555-558`).
2. The driver stops the whole run on any failure of a decision request (`.orkestrel/agent/instruments/harness/bench5/Driver.ts:1010-1015`).
3. The unsent request 21 doesn't match the stopped-request check, which only recognizes stops after resource refusals (`.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:716-743`).
4. Request 21 has a null body, so it reaches the thinking check and throws `invalid thinking custody` (`:756-766`).
5. The manifest entries for request 21 saying the model role and thinking policy differ are artifacts of that null body. The accurate result is the operational-fault error at `:780`.

## Fair way to get the remaining same-goal observations

**One goal-fault rule, frozen in the execution record and identical for all three arms:**

- **Which faults it covers.** A decision request that returns non-2xx with a server tool-call parse error in the body is a model-format fault.
- **What happens on such a fault.** Keep the request with its wall time and its prompt estimate marked as an estimate. Mark the goal failed and score it as failed work. Leave the history exactly as it happened, and continue with the next goal.
- **No in-goal recovery.** Re-sending under the frozen seed is the retry the brief rejects. A repair turn would change the agent's behavior.
- **Everything else still stops.** Any other fault stops the run and is classified correctly.

Continuing after a failed goal does change the experiment: the unit of failure moves from the run to the goal. That is acceptable only because the rule is declared before the runs and applies symmetrically.

The earlier records run had no faults, so the rule would not have changed its outcome. The stop-at-first-fault full-view result (4 completed goals, with g05 failed) is kept as its own observation.

## Next executable unit

**Implementation (medium size):**

1. **Goal-fault rule.** Add a frozen field for the rule to `MatrixExecution`. Classify the narrow model-format fault in the driver and continue past it. Count those goals as failed in the per-goal output.
2. **Classification fix.** Make the stopped-request check recognize an unsent request after any recorded fault, so a stop like this one reports the operational-fault error.
3. **Exploration command.** Add a `matrix.js explore` command that reuses the pilot's attempt, its pairing check (`listMatrixPairFailures`) and its exposure check (`matchesMatrixExposure`). It writes `explore/manifest.json` with phase `exploration` and no `accepted: true`. The aggregator accepts a non-separating policy only in that phase.
4. **Tests.** Extend the stopped-request and transport cases in `tests/matrix.test.ts` (around `:651-737`) to cover a transport fault followed by an unsent request, and a model-format fault followed by continuing. Add an aggregator case that refuses the exploratory policy outside the exploration phase.
5. **Review and gates.** One review by someone who didn't write the change, the scoped gates, then a canonical rebuild.

**Runs, in series, each through `.agents/skills/orkestrel-dispatch/scripts/launch.ts`:**

1. **Freeze.** Re-freeze with unchanged corpus, deployment, seed and model (Qwen 2B, thinking off, copy 1) so all three arms bind one build.
2. **Records.** Run `matrix.js resource`. Compare its requests with the earlier records run as a reproducibility check.
3. **Full view.** Run `matrix.js full` with the goal-fault rule.
4. **Exploratory aggregate.** Run `matrix.js explore`.
5. **Grading.** Blind semantic grading of the work products from all three arms through the existing development grading. Report per-goal quality, tool compliance, failed goals, exposure, and costs for preparation, maintenance, decision and judge.

**Stop criteria:**

- **Other operational faults.** Any fault outside the model-format class stops the run without a retry.
- **Initial plans differ.** If the pairing check finds different initial plans, stop.
- **Format faults dominate.** If they fail most goals in any arm, stop and report the format route as the subject.
- **Low exposure.** If fewer than a majority of served goals receive an aggregate wire body, report the run as insufficiently exposed and make no quality claim.

**Deferred:**

- **Judge swap.** Re-score the same frozen packet and labels with a larger judge to aim for a qualifying gate. Neither the labels nor the cutoff rule change.
- **Client-side parsing.** Parsing tool calls in the client instead of the server would change transport for every arm.
- **Remaining campaign.** Larger Qwen and Gemma models, the thinking variants, the full matrix, held-out evaluation, and the continuous records-versus-aggregate head-to-head.

## Objections and tradeoffs

- **The ungated aggregate can inject contradicted summaries.** That harm is part of what the treatment does, and blind grading measures it. The condition can't be adopted.
- **The format-fault match depends on error text.** Anything that doesn't match stops the run, which errs on the conservative side.
- **The rebuild voids the custody of the existing records run.** Rerunning records costs one more run and puts all three arms on the same build.
- **The plan says to keep the admission qualification (`.orkestrel/agent/plan.md:9`).** That gate stays for adoption. Only development observation gets the exploratory condition.

## Acceptance criteria

- **Refusals preserved.** `fit-v3`, the earlier `fit/` and `fit-v2/`, and the failed full-view attempt stay unchanged.
- **No held-out data.** No held-out data is read.
- **Exposure measured.** Report goals that received an aggregate wire body and the summary versions above 1 that were actually served.
- **Faults and costs kept.** Every format fault is retained with its wall time and estimate.
- **Clean separation.** The exploration manifest can't be read as a pilot.
- **Complete comparison.** All three arms finish all 24 development goals with failed goals counted as failures, or stop on a named criterion.

Root decides after reconciling this with the Astra lane.
