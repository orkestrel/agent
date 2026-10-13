# Revised Qwen 4B calibration

The revised Qwen 4B fit refuses admission. Root supports 154 of 171 generated occurrences; cutoff 0.78 admits 1 supported occurrence, short of the unchanged 0.5 admission floor. These are development calibration findings, not downstream work-quality results. See [the successor calibration record](resumption-l7-calibration.md).

Clean-context native analyst Astra reviewed opaque packet `support-audit-d51a`, without model identity, scores, or other audits. Packet SHA-256 is `1854460e68f022fe8bc3ad85780481540c2c354bdae5effce32062ef4076903b`. The audit covers 171 occurrences, 50 exact-distinct question/state/source combinations, 809 proposition occurrences, and 927 verified source quotations. Identifier/hash bijection, schema, verdict, and quotation checks passed. Missing, duplicate, hash, verdict, empty, and quote corruption controls failed as intended. Those checks establish artifact integrity, not semantic correctness.

Root read the complete report and every distinct candidate/proposition analysis, then accepted the independent labels unchanged before inspecting scores: 154 supported and 17 ambiguous. The preserved `results/l7/calibration/q4/review-labels.json` has SHA-256 `8440425789487f62b0b2cc86561535c1ea3d7ff05d29c9a84f8b0e13ef117761`. The root container `results/l7/calibration/q4/labels.json` has SHA-256 `ddc227854b2b7810c26668bdbba2418d1f781c6164465942eaf92fe8250fd46d`. Primary `tmp/units/aggregate-l7-q4-labels.ts` records the create-only identity-bound promotion. The independent report at primary `tmp/units/support-audit-d51a-report.md` has SHA-256 `1d087ad9e744f2701a321cb28a93638b5c824d8e591777e2c472e9d18b9b0739`.

The ambiguity rulings retain heading provenance discrepancies, a standalone Marcus prerequisite beside events during Ruth's temporary delegation, and partial asserted signer, ticket, start-date, or return-deadline operands. Candidates carrying both the normal rule and the temporary transition remain supported. Empty headings and unattached date prefixes assert no event. Conditional plans and reopening instructions do not claim completed action. Missing later arrivals, further replacements, changed contacts, reopening instructions, or callback details remain coverage limitations; omission alone does not create a false proposition.

Native verifier Luna ran `node tmp/units/aggregate-live-feasibility-l7.ts --execute --phase fit --key q4 --manifest-hash 09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf`. The child exited 3 uncapped in 3164 ms under its 240-second watchdog; the operator exited 1 for refusal. PID 64628 and its descendants exited. Root read the full verifier report and raw logs. No model request ran during fitting.

The diagnosis refuses for end-to-end admission below 0.5. Supported, scored, and admitted occurrence counts are 154, 152, and 1; distinct counts are 43, 41, and 1. Repeated occurrences are not independent samples. Root retains the unchanged labels, scorer, and fit rule.

The retained artifacts under `results/l7/calibration/q4` have these identities.

| Artifact | SHA-256 |
| --- | --- |
| `fit/diagnosis.json` | `fffa21a9748e750a40034e41a14639ab5490d1ae57527cc986630dacf1f9d684` |
| `fit/controls.json` | `ef68d00bb430d3b6cd56a8ccf7076f862694fcbf2d08761a38090e0daeb9c499` |
| `cache/judge.jsonl` | `ab7298e908ae73dd5a9178feb87b6862ec15e0d49d7fb597e0e852b0da0d65af` |
| `cache/summary.jsonl` | `9d201f8ac9328130296608bca18124290dac202ec87db7ee3c8ab2e032cb26ba` |

Both cache hashes match generation manifest `1b21e7998f49d8c8c9107170346555d220e5afb9d0125460d4a3f28807fb600a`. The verifier report at primary `tmp/units/aggregate-l7-q4-fit-report.md` has SHA-256 `6aa4f45ebc35ae534e62aaa73c4976710973282826fb789f6273108b7c047345`. The full error artifact `results/l7/logs/q4-fit.err` has SHA-256 `6b231e20cbc3b11c5073f728fb58fd3b5dff601afe5a3f371f030cd255ab325a`; stdout is empty.
