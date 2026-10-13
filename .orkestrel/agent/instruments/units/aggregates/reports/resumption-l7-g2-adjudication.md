# Revised Gemma 2B calibration

The revised Gemma 2B fit refuses admission. Root supports 132 of 174 generated occurrences, but no supported draft reaches the unchanged separating cutoff of 0.78. These are development calibration results, not work-quality scores. See [the successor calibration record](resumption-l7-calibration.md).

## Support adjudication

Clean-context native analyst Astra reviewed only the opaque packet, SHA-256 `962fdb27b0043304631d65eca1620e5e69db8c908bfb43aca0f39273f40ca23c`. The review covers 174 occurrences and 45 distinct question/state/source combinations, with 765 proposition occurrences and 936 exact source quotations. Mechanical identifier, digest, grouping, and quotation checks passed. Root read the complete report and every distinct candidate and proposition analysis before inspecting scores.

The independent artifact contains 122 supported, 2 unsupported, 2 contradicted, and 48 ambiguous occurrences. Its retained `results/l7/calibration/g2/review-labels.json` has SHA-256 `74c8f20e619798874bb2e331486d4028f61f4a2a992185d210de32b03ee0aa19`. The analyst report at primary `tmp/units/support-audit-b47e-report.md` has SHA-256 `5d4c30663dba9aa853a7ab9ea506e114858098c5f2a9146482dfcce161dca442`.

Root asked the same analyst to reconcile its treatment of incomplete trailing fragments and explicit chronology. The analyst agreed that an absent assertion is a completeness defect rather than an ambiguous factual claim. Root removed propositions inferred only from a bare lookup name, heading, conjunction, unfinished condition without a consequent, or field name without a value. Partial asserted identifiers, dates, and numbers retain material ambiguity. An explicitly dated earlier late order followed by the candidate's own later delivery states a chronology rather than continued nonarrival. Root directly read that ordered source group before ruling.

Those rulings change 10 occurrence verdicts from ambiguous to supported and preserve other nonpositive propositions. The settled counts are 132 supported, 2 unsupported, 2 contradicted, and 38 ambiguous. The root container `results/l7/calibration/g2/labels.json` has SHA-256 `a6776f9b4caf4f0a62895e5b2881663a5632bc073ba3848f1751fd9fe67decc8`. The create-only transformation is primary `tmp/units/aggregate-l7-g2-labels.ts`; the independent artifact remains intact. The same absence-versus-assertion distinction applies to subsequent blind briefs before their reviews begin.

Material failures remain nonpositive: changed actor attribution for a depot release, a superseded address, an unanchored relative date, stale lateness without the later transition, omitted temporary-delegation qualifications, and truncated asserted values. Coverage is separate: a supported draft can select older rules while omitting open requests, completions, or changed contacts. No missing-information observation becomes a factual-support error merely because a useful fact is absent.

## Fit observation

Native verifier Luna ran `node tmp/units/aggregate-live-feasibility-l7.ts --execute --phase fit --key g2 --manifest-hash 09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf` after verifying the operator, build, and settled-label identities. The child exited 3 uncapped in 2214 ms under its 240-second watchdog; the operator exited 1 to reflect the authentic refusal. PID 6348 exited. Root read the full report and raw launcher outputs. No model request ran during fitting.

The diagnosis refuses for end-to-end admission below 0.5 at candidate cutoff 0.78. Supported, scored, and admitted occurrence counts are 132, 131, and 0; distinct counts are 30, 29, and 0. Repeated occurrences are not independent model observations. No cutoff or label changes to obtain exposure.

The retained fit and cache artifacts have these identities.

| Artifact under `results/l7/calibration/g2` | SHA-256 |
| --- | --- |
| `fit/diagnosis.json` | `4f48405804ebd53b6ad435159e953afb448cb5bff1f50c5b73384d0a6f54c97a` |
| `fit/controls.json` | `ef68d00bb430d3b6cd56a8ccf7076f862694fcbf2d08761a38090e0daeb9c499` |
| `cache/judge.jsonl` | `49825e6e371a05a023f5c2bdace23ffb50133fc8cc03e29bc759e8289d22eba2` |
| `cache/summary.jsonl` | `71b585fe4114583512b6f3bf56d889a841a48e1ddf4f78d8748810ec7572afc5` |

Both cache hashes match the completed generation manifest `c9451e0a2b405b23a553bb90a3e3e2a09cdfe9265e3d8918f02573df122d4a0e`. The verifier report at primary `tmp/units/aggregate-l7-g2-fit-report.md` has SHA-256 `4d38b421283c29bb4c189eb1939bddf8da3563d31c4e55a9ee739646f2661fbf`. The full error artifact, `results/l7/logs/g2-fit.err`, has SHA-256 `8143240c3ffd65db33240784e6a642cf524452cf27ffad2a6a91c26a572c844e`; stdout is empty.
