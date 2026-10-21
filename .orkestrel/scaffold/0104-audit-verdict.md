# Scaffold 0.0.104 audit verdict

One `orkestrel-falsify` round on the integrated result, 2026-10-20. Subject: branch `0104-core` at `af6046d03`
(the I1 merge of both chains), against `7ad00d294` (0.0.103). Claims: `tmp/units/scaffold-0104/0104-claims.md`
(F1 to F34).

## Lanes

| Lane | Engine | Verdict | Evidence |
| --- | --- | --- | --- |
| Objective | GPT-6 Astra, xhigh | FAIL F16 F20 F31; outside O1 | `tmp/units/scaffold-0104/0104-falsify-objective.md` |
| Subjective | Claude Opus 5.5 | FAIL F16 F23 F29 F34; outside O1 O2 O3 | `tmp/units/scaffold-0104/0104-falsify-subjective.md` |
| Checker (F2, F5, F22, F24) | GPT-6.1 Sol, high | PASS | `tmp/units/scaffold-0104/0104-falsify-checker.md` |

## Rulings

| Item | Ruling | Closed by |
| --- | --- | --- |
| F16 (both lanes) | Claim wording conflicted with A10's intended styles change; the A9 property holds. Restated to the pre-A9 emission at `f00a757d1` | Claim restatement |
| F20 (objective) | `record` admitted an unreported descendant of a reported path | Fix `a4e0e4ed9`; closure CLOSED (Astra) |
| O1 (objective) | Wave proofs replaced the scaffold CLI with an executable implementing overwrite (`tests.md:32-35`) | Fix `a4e0e4ed9`: the record proofs consume the real built CLI; closure CLOSED (Astra) |
| F31 (objective) | Unresolved only because the subject predated R3 | Holds on R3 `7fdadc6ea`: the self-pin sweep returns no hits, ranges equal the registry carets |
| F23 (subjective) | `titles.ts` reported green for an `it.each` table whose arguments contain `)` | Fix `0a2d0dfc0`; closure CLOSED (Opus) |
| F29 (subjective) | supervisor meets two red gates at its visit (148 lint diagnostics, 21 surface collisions) that predate 0.0.104 | Named in plan § 3.2 as F-supervisor |
| F34 (subjective) | `wave.ts` said "escapes" in the banned sense | Fix `408a9924d` with the reviewer's wording |
| O1 (subjective, L10) | Load-sensitive cases timed out under contention | Fix `408a9924d`: budgets measured alone and under contention |
| O2, O3 (subjective) | Guide and rule sentences overstated ownership and the alias-naming refusals | Fix `408a9924d` with the reviewer's exact wording |

Every other claim was confirmed by at least one lane with a mutation control. Fixes that adopted a reviewer's
prescription verbatim closed with their mutation probes; the two code fixes that needed design (F20 with O1, F23)
each passed an independent closure by the lane that found them.

## Result

The round is closed. Release candidate: `408a9924d` on `0104-core`. Next: S-pre2 against the candidate, the R4 clone
gates on Node 24.22.0 and Node 22.18.0 with npm 11, then the user's approval for the `main` fast-forward and push and
the user's one-time code.
