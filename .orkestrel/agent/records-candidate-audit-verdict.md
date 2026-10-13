# Records candidate audit verdict, 2026-10-09

The audit asks whether the per-topic records candidate (`tmp/bench/results/v9/recordsrender/` in the agent checkout) can be installed for a live series against the frozen refined series on the same 8 copies. It also holds the objective design lane the records plan never had.

## Lane

GPT-6 Astra through `analyst`, objective lane, session `01a11fd9-ca6a-7020-b9ac-1c9b7f4c1b9d`, 1,027.5 s, claims `tmp/units/records-candidate-claims.md`, report `tmp/units/records-candidate-report.md`, 43 citations, 0 unresolved. Verdict: `FAIL 1, 2, 5, 6, 8, 9, 10; outside the claims: none`. Claims 3, 4, and 7 confirmed.

## Rulings

Footprint is read from the candidate's run 3 over the 14 recorded wires (140 goals): 0 old tokens in any briefing or tail, full fact recall at entry, 0 cut record lines, every records-on tail equal to refined's, every judge body equal to the frozen harness's.

| Claim | Finding | Footprint on the scenario | Ruling |
| --- | --- | --- | --- |
| 1 | a fault string carries a random message id; off runs share the parse helpers through an import | the id differs between two frozen renders too; request bodies identical on every wire | inherited nondeterminism, not a records defect |
| 2 | an unscoped request with desk topic `escalations` renders m22's ESC-2291 raw; a correction of a correction revives m2's MX-4471 | neither path occurs: g06 is the only unscoped goal, and no correction is corrected | successor unit: filter stale sentences on every system route; keep a correction's effect after its correcting source is superseded |
| 5 | an empty successor lookup leaves the earlier result; the person prefix trusts capitalization | no empty successor; the two seed prefixes (Tomasz Brennan, Sigrid Halvorsen) are correct | successor unit; the prefix rule is a heuristic and is recorded as a design limit |
| 6 | a tight budget cuts a lookup refined keeps, so the tail stub differs; the report's tail comparison dropped stub text | 0 cuts; tails equal | the report now compares tail bytes (`records-report.mjs`); the consolidation repair is a successor unit |
| 8 | replaced-lookup detection depends on argument key order | every lookup takes one argument | successor unit: sort argument keys |
| 9 | account scope strands a desk-wide correction stated inside one account's message (m44, the scrapped restocking fee, stays in Luis's record) | no measured goal asks another account about the fee | design limit of account scope, recorded; the next design round weighs scope against relevance filtering |
| 10 | the Rules order follows the request's desk topics | as the plan specifies | the claim was worded too strongly; no defect |

The candidate is installed for the records series unchanged, so the series measures the audited design; the successor unit lands after the series.
