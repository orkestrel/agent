# Admission repair decision

The added admission implementation is unaccepted. L13 quality evidence remains valid and sealed; no l14 model run or continuous pair has started.

Independent static checks passed in 3717 ms. The sustained fixture failed uncapped in 1148016 ms after development and selection succeeded. Held-out request 118 was sent, timed out without a buffered response, and retained transport plus observation while the reader recomputed transport. Elapsed wall time of 129994 ms exceeded its 129960 ms limit. Legacy evidence lacks abort origin, so this failure cannot retrospectively prove a study-wall abort.

The development stage exited 1 uncapped in 373544 ms: 5 tests passed and 2 failed. The generation hostile vector provided JSONL where JSON was required, reaching syntax failure before its semantic assertion. The exploratory pair completed 24 rows per arm but aggregate request 39 correctly failed the stale-carrier invariant: an obsolete ID was rendered bare in its copied header, while other context qualified the same token. The cap/recovery test incorrectly assumed this pair was valid admission evidence. Remaining proof substages did not run.

Root independently reproduced these failures against sealed emitted readers:

| Claim | Measurement | Decision |
| --- | --- | --- |
| Earlier local cap remains valid after final wall expiry | Exit 1, 27719 ms; unchanged prefix passed; altered-token control rejected; appended unsent stop incorrectly invalidated requests 20–130 | Remove only final-expiry predicate from local withholding; preserve sequential limits and terminal refusal |
| Required full preflight is charged | Exit 1, 11934 ms; full identity absent despite nonzero measured usage; diagnosis, deduplication and conflict controls held | Traverse the required full reference; keep identity deduplication and measured refused costs |
| Producer and reader agree on pre-response transport failure | Exit 1, 6031 ms in a combined probe with 2 tests; healthy response and completed-missing-capacity controls held | Align post-response observation requirement and retain native abort origin with deadline evidence |
| Closed exploratory pair has valid raw evidence | Same combined probe: records valid; aggregate sole stale-header failure | Keep as refusal control; build a distinct clean real-engine positive and swapped-arm control |

The reviewer confirmed ranked qualified refusal and explicit exploratory provenance blocking adoption. Other unresolved claims need their interrupted test controls completed; no additional calibration source defect was established.

The successor owns only these source and fixture repairs. It must preserve whole-run finite limits, sent-call charge, unknown usage, genuine transport faults, and no sends after refusal. A new sent-abort fixture drives the real Driver against a protocol peer; caller cancellation and ordinary errors followed by later expiry remain faults. Prescribed F1/F2 fixes close with line-removal mutation controls. The added abort contract receives an independent review limited to that seam.

The full-horizon protocol fixture may use a real 500 ms peer delay in both development and evaluation. Its budget remains twice measured development expenditure, with the existing horizon scaling. This makes the protocol calls material relative to custody setup without relaxing experiment limits. Fresh start/elapsed evidence and a complete run remain required; no quality result follows from fixture output.

After scoped verification, commit/push the source and execute the already checked fixed generation sequence, feasible model matrix, blind audit, judge shadow, and continuous pair. Do not tune a live condition repeatedly until it passes. The root-owned daemon is idle, metadata-verified, and held for that sequence.

Native reports and exact failed probes remain under scaffold tmp/units/aggregate-exploration-admission-, aggregate-exploration-proof, aggregate-admission-, and aggregate-expiry-boundary-. The failed source checkpoint is retained under aggregate-boundary-repair-before.patch. They are working evidence, not an accepted build or model result.
