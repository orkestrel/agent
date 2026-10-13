# Frozen harness audit verdict, 2026-10-09

The audit asks whether the frozen briefing harness (`tmp/bench3/bench.mjs` in the agent checkout, sha256 `3d75138e241ae8a9…`) measures the refined briefing faithfully and whether any scorer change favors one design.

## Lane

GPT-6 Astra through `analyst`, objective lane, session `01a11fba-2f2f-7e63-940c-b0742935a992`, 668.5 s, claims `tmp/units/frozen-harness-claims.md`, report `tmp/units/frozen-harness-report.md`. Its 37 citations are absolute links; every target resolves inside its file. Verdict: `FAIL 3, 4, 5, 6, 8, 9; outside the claims: O1`. Claims 1, 2, 7, 10, and 11 confirmed.

## Rulings

| Claim | Finding | Live footprint in `a4-refined-v1`–`v7` (`tmp/units/frozen-impact.ts`) | Ruling |
| --- | --- | --- | --- |
| 3 | a repeated call id hides the repeat stop | 0 repeated call ids | harness successor unit |
| 4 | the collapsed answer run keeps the seed's assistant tool calls; nested recall leads survive the digest | seed tool calls in view in all 8 answer runs; every answer run replied | harness successor unit |
| 5 | a first-run timeout or transport error skips the answer run | 0 goals without a reply | harness successor unit |
| 6 | joined handles are not split | 0 recalls on joined handles | harness successor unit |
| 8 | a sent `category` still prices the recall result | 0 recalls sent a category | harness successor unit |
| O1 | the empty-reply assertion cannot see its guard removed | none; a check fixture | harness successor unit |
| 9 | the negation words and the credit phrases pass replies that use a stale value or deny the fit | the three rows they flipped (`a2-refined-v1` g04, `a3-refined-v1` g08, `a4-refined-v2` g08) read correctly | revert to the strict scorer, keep the `no … room` pattern, and adjudicate every failure of both designs by the blind audit |

No defect of claims 3 to 8 left a goal without a reply in the frozen series, so its pass counts stand as a measurement of this harness. The records series runs on the same frozen file for comparability; the successor unit lands after both series.
