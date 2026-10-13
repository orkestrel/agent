# Claims under check: the blind pass audit of the v9 series

## Subject

Every reply the strict scorer passed in the 24 runs of the v9 records series (162 rows) was judged blind by two Claude Haiku 5.5 auditors on the `checker` role, with a third auditor ruling on each disagreement. The items are in `tmp/bench/results/v9/audit/items-pass.json`; the 9 chunk files `items-pass-1.json` to `items-pass-9.json` are its contiguous slices. The verdicts are in `tmp/bench/results/v9/audit/verdicts-pass.json` (`final[]`: `id`, `verdict` correct, false-pass, or ambiguous, the two auditors' readings `a` and `b`, the tiebreak `tie`, `points`, and `reason`). The rubric the auditors applied is quoted in `tmp/units/blind-pass-audit-v9.js`.

## What the round decides

Whether the pass verdicts can enter the adjudicated tally beside the failure verdicts (`verdicts.json`, `verdicts2.json`, `verdicts3.json`): a scorer pass ruled `false-pass` counts as a fail, and one ruled `ambiguous` counts as a fail at the low end and a pass at the high end.

## Already established

The failure audits (batches 1 to 3) passed an Astra check (`../scaffold/.orkestrel/agent/score-audit-verdict.md`, `../scaffold/.orkestrel/agent/records-series-verdict.md`). Their standard: a failed point is `misread` when the reply is correct and complete for what the request asks and the scorer fails it anyway, `real` when the reply is wrong, incomplete, contradicts a fact or rule, omits what the request asks for, or answers another request, and `ambiguous` when a careful grader could go either way.

## Review evidence

The items, the verdicts, the workflow script that holds the rubric, `tmp/bench/scenario.json` (today is Thursday 2026-10-08), and the failure-audit items and verdicts for the standard comparison.

## Claims

1. Every item ruled `false-pass` names at least one point where the reply is wrong in a way the shift lead could act on: a wrong or miscalculated value, a superseded value given as current, a delivery date promised to a customer in writing, a wrong person, number, extension, or recipient, a required element omitted, a rule denied or broken, or an answer to another request. The point holds against the seed.
2. No item ruled `correct` holds such a point: each answers its own request, gives every requested element correctly, and states nothing that contradicts a fact, a correction, or a rule.
3. Every item ruled `ambiguous` is a genuine close call that a careful grader could rule either way; none is plainly `correct` or plainly `false-pass`.
4. One standard applies across all 162 items and all 9 chunks: equal or equivalent reply text under the same request gets the same verdict.
5. The pass standard mirrors the failure standard: a point this audit rules `false-pass` would be ruled `real` under the failure rubric, and a point the failure audits ruled `misread` would be ruled `correct` here.

## Unknowns

- Whether a seed fact an item's `facts` list leaves out changes a verdict. Read `tmp/bench/scenario.json` for it.

## The threshold

A claim breaks on one item whose verdict the lane would change under the stated rubric. Report every such item for claims 1 to 3 with the verdict the lane would give and the reason.
