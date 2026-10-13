# Score audit verdict, 2026-10-09

The audit asks whether the benchmark scorer misreads failed replies from either design, so pass counts can stand as the comparison between the refined briefing and the full view.

## Lanes

| Lane | Engine | Subject | Result |
| --- | --- | --- | --- |
| Blind double audit with a tiebreak | Claude Haiku 5.5, on the user's instruction, run `wf_704d43f9-b92` | the 56 failed rows of `a1-control-v1`–`v8`, `a3-refined-v1`–`v3`, and `a4-refined-v1`–`v5`, without design labels (`tmp/bench/results/v9/audit/items.json`, verdicts `verdicts.json`) | 55 real, 1 misread; the two auditors split on 1 item |
| Objective check of those verdicts | GPT-6 Astra through `analyst`, session `01a11fc0-2370-7072-93fe-96244da6da2c`, 233.8 s, blind | claims in `tmp/units/score-audit-claims.md` | `VERDICT: FAIL 1, 3, 4; outside the claims: O1, O2` |

## Rulings

The Orchestrator reproduced each Astra finding with `tmp/units/score-audit-repro.ts` before ruling.

1. Item `59f856bd` (`a4-refined-v4` g05, "MX-4486 (rotated early from MX-4471)") is a misread: the reply uses the current code and names the old one only as replaced. Counted as a pass in the adjudicated tally.
2. The proposed scorer exemption `rotated(?: early)? from` is refused: it also passes "The approval code has not rotated early from MX-4471 to MX-4486; use the former for this refund" (pattern hits 1 under the current rules, 0 with the exemption). The g05 pattern stays unchanged.
3. Item `64952363` (`a1-control-v7` g10, extension 4127 and "only answers calls after 2 pm", then "call her now (before 2 pm) to reach her voicemail") is ambiguous, not real: the scored phrase does not claim live pickup before 2 pm. Reported as a range in the adjudicated tally.
4. O1: the Haiku reason for item `411d93af` names a customer email the reply does not hold; the verdict `real` stands on the missing approval code.
5. O2: item `2305ce3a` carries a missing-phrase diagnostic recorded before the credit-check phrases grew; the verdict `real` stands, because the reply gives no fit decision.

## Consequence for the comparison

Every other full-view failure (31 of 32) and every other briefing failure (23 of 24) is a real error, so the scorer favors neither design. The adjudicated tally moves `a4-refined-v4` from 7 to 8 passes and `a1-control-v7` from 7 to a range of 7 to 8.
