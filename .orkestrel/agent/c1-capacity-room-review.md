# Observed prompt-room review

**ACCEPT as a bounded next capacity candidate:** window 16384, decision output/planning reserve 4096, safety 512, auxiliary deadline 90000 ms, decision/summary request deadline 180000 ms, goal deadline 900000 ms, and whole-attempt deadline 1800000 ms. Apply the same frozen candidate to both models and both main arms. This addresses the measured message growth without weakening the guard. It does not establish that 16384 will finish qualification, or that the refused request physically required more than 12288 tokens.

## Measured boundary

The retained q4 records run in `tmp/units/c1-capacity-initial-prefill-live` completed calibration with prompt usages 9668 and 9204, each with one completion token, taking 47499 ms and 41558 ms. It then reached `synthetic-goal-4` after serving the earlier goals. The last sent agent request had estimate 3312, actual prompt 4466, completion 523, and normal stop. The next request had estimate 5964 and `sent: false`; its sticky terminal was `calibrated prompt admission` at sequence 78. Thus the measured failure is local conservative admission, not a server context refusal, output cap, or allocation failure.

The growth was a batch of tool results. Safe structural inspection shows two successful lookup results of 131 and 87 characters, two successful recall results of 4911 characters each, and a denied recall result of 88 characters. The assistant carried five tool calls. The result text totals 10128 characters; the recall responses dominate it. Request system/user text and tool-schema size were unchanged across these two turns. No content or tool arguments were displayed. The size-only instrument is `tmp/units/c1-capacity-review/room.ts`.

With the retained initial gauge scale 1.2303168025665019 and overhead 464, the guard prices the refused input as:

`5964 × 1.2303168025665019 × 1.06 + 464 = 8241.866`

At window 12288, adding output 4096 and safety 512 requires 12849.866, exceeding admission by 561.866 tokens. At window 16384, that identical input leaves 3534.134 tokens of admission room. Raw estimate capacity rises from 5533 to 8673 units with the same gauge. These calculations explain the exact refusal and why the proposed candidate would admit the retained input without changing classification or accounting.

## Mechanism boundary

There is no demonstrated double-drift mistake in the initial planner. `Trial` supplies ledger logical capacity `window - safety` and aligned `predict = reserve`. The pinned ledger's initial `#plan` subtracts prediction and overhead, uses prompt share 0.7, and divides by `1 + LEDGER_SCALE_DRIFT` at `.orkestrel/agent/instruments/harness-capacity/vendor/agent-0.0.30-trimmed/index.js:7170`. The guard's corresponding 1.06 multiplier is a check on the resulting message price, not a second subtraction from a previously priced request.

The within-generation recall mechanism has a different boundary. `Gauge.room` uses observed remaining context, prediction reserve, a reply reserve, and an adaptive marginal rate, then divides remaining recall room by two. It does not apply the guard's fixed initial-gauge 1.06 envelope; see `.orkestrel/agent/instruments/harness-capacity/vendor/agent-0.0.30-trimmed/index.js:6701`. `#recall` uses that room at `.orkestrel/agent/instruments/harness-capacity/vendor/agent-0.0.30-trimmed/index.js:7383`. The Agent appends generated tool calls/results to the selected messages within the turn loop; it does not rerun initial selection after each ordinary tool batch. Consequently initial selection fitting does not imply every later tool-expanded request fits the harness's stricter admission envelope.

That is the exact planner/admission difference relevant here. It is not evidence of mismatched wire output versus planner reserve, incorrect application of safety, or a guard arithmetic defect. Nor does this run prove a physical context overflow: the refused request has no server usage. Treat it as insufficient *admitted* room for this observed tool batch. The guard correctly makes that operational limit durable. Changing recall sizing to guarantee agreement with the harness envelope would be a separate algorithm/contract change, not a justified mechanical correction established by this single run; the proposed capacity measurement need not silently make that change.

## Limits of the candidate

A larger ledger capacity can also enlarge its initial selection and subsequent recalls, so admission of the identical retained input does not guarantee admission of the next live run's different input. Calibration scale, adaptive marginal pricing, future tool batches, model output, and the other cells remain unmeasured at 16384. Cold-prefill time and VRAM use can rise; the existing 90/180-second and 30-minute bounds remain binding. The observed fully resident 12288 allocation proves neither a 16384 allocation nor throughput there. Preserve explicit loaded-context/model checks and stop on any operational failure.

Keep both 12288 attempts, their manifests, and their receipts unchanged. Freeze this context-only candidate in a new create-only attempt while keeping harness source/build immutable. A later successful attempt must remain distinguishable from the earlier failure; do not relabel, resume, or erase it.

For the separately stated output-only contingency, window 20480 with output 8192 and safety 512 preserves the 16384/4096 candidate's prompt allowance: both leave 11776 tokens before the calibrated overhead/drift calculation. This arithmetic is correct but does not authorize or establish that contingency; it is not an automatic response to this prompt-admission failure. No output exhaustion was measured here. A larger output cap without its compensating context would reduce prompt room.

No model calls, source/build changes, oracle reads, or product-body displays were performed. The conclusion is limited to the inspected safe metadata, public synthetic tool-result sizes, and the pinned planner/admission mechanisms.
