# Compaction qualification custody

## Retain the strict gauge failure

The Compaction-only provisional gauge execution is rejected under its frozen criteria.
The canonical launcher exited 1, uncapped, after 732962 ms; attempt duration was 729899 ms.
Result `cd30972c-4008-4172-be6a-a371dd84973c`, seal
`480bec547ab8bd98519946530dea5cac44b80a81db7a1d8f53d37eec01fc77bb`, lives in
`tmp/studies/compaction-provisional`. Its project, policy, launch declaration, and absolute
deadline remain in `tmp/studies/compaction-provisional-project`.

The attempt completed 21 goals, with no partial products. Goal 22, `ev-06-2`, failed with
capacity attribution to the agent; 74 later goals have cascade records without execution.
Canonical request 27, ordinal 54, measured estimate 10229 and projection 10423, then received
actual prompt usage 10425. The residual is +2. Reserved prompt room was 11776, leaving 1351
tokens of that allowance. This is predictive underestimation, not observed context overflow.
Evidence lines 579, 580, and 582 hold transport dispatch, wire reading, and canonical context;
their shared revision is `14871cd7dcb036ef9ec00517fd1ec64a558f189c966ff0907cf85bc07e0a7a7f`.

The reader joined 25 agent and 2 summary requests. Summary 13 at `ev-03-3` returned an empty
string; it cannot establish positive summary-content coverage. Summary 21 at `ev-05-2` returned
5053 UTF-16 code units. An agent admission projected 13188, that summary completed, and the
next agent request projected 3546 with known summary content. Five subsequent summary-bearing
agent responses passed; the following response supplied the +2 failure. The empty summary
remains an observed quality issue, not a retrospectively invented operational stop.

The final independent reader is `tmp/units/compaction-reading.ts`; its 28 controls, syntax,
and strict TypeScript checks passed. Complete output is `tmp/units/compaction-reading-3.json`.
Earlier outputs remain intact: they exposed reader assumptions about empty summaries and
section framing, which the successor corrected without changing execution or criteria.

The public operational grading is
`a262834c3ff455e7f38eb3baa4f77c0eddd51ef60cca811445865eaa17e365cc`.
Its 96 unsuccessful criteria reflect the memory grader's whole-attempt failure condition,
not 96 attempted failures. Its 75 product-absent goals contain the real failed goal and the
74 unexecuted goals; the report labels that combined set unexecuted. Use the evidence counts
in this record when distinguishing execution from cascade.

The separate semantic grading is
`63fef86f584cd37e4236b39605e6c380cfc1283eba5bf65e4906d4dd5bd0d082`, with 384 unknown
criteria pending labels. Its public packet content SHA-256 is
`ee282250cf54182096f4c5f0e08e02e666a18f6902712e4479926df170748135`.
The semantic rubric remains the retained candidate-3 rubric; grading generated no model work.

Records remains candidate 3, result `fe9bd623-258a-44fa-91dd-cb6cd5a564ff`, seal
`3fbafc2bbcc7c551438adba20ee90654209bff0720bb18a2499210e8f6e35b6f`, with 96 completed
products. Preserve its original runtime identity. No Records execution or replay is selected.

## Bound a separate candidate

Root accepts actual Opus session `9e296610-1580-407e-a999-8e3f9defe3c2` as one bounded design
opinion, returned in 49798 ms, exit 0, uncapped. The rejected gauge stays rejected. The successor
adds a fixed 512-token predictive cushion to the original projection. This is an engineering
margin selected after failure, not a calibrated error guarantee or a coefficient refit.

Keep base scale 0.9784397854197346 and base overhead 414.49493933313806. The effective existing
gauge uses overhead 926.49493933313806. Prove equivalence to base projection plus 512 on the
retained requests and check it again for each successor reading. Keep context 20480, output
8192, physical safety 512, recap 2048, and thinking off. The cushion consumes usable context:
the uncushioned agent projection must be below 11264 for dispatch. Actual near-room reporting
still uses [10598.4,11776]; this corrects the opinion's suggestion to move the actual band.

Before launch, replay the retained Full and Compaction measurements as development controls.
The zero-cushion control must reject the +2 request; the 512 cushion must cover every retained
reading. Count requests that would require earlier compaction. Update and freeze the independent
reader with +2 acceptance under the cushion and +513 refusal. No replay is held-out validation.

Permit one Compaction-only successor, with no retries or rescue, before the existing absolute
deadline `2026-10-15T07:15:45.568Z`. Do not extend that deadline. At launch, require at least
6396760 ms plus 60000 ms cleanup remaining: twice the observed 732962 ms / 22 goals projected
to 96 goals, rounded up. This factor is planning slack for earlier compaction, not a forecast.
Retain request 6-minute and goal 15-minute limits and all call/token/byte ceilings. Keep the
original strict stops and complete-horizon/pressure requirements. If a launch gate fails or
this candidate fails, stop GPU generation; no further rerun is admitted by this decision.
