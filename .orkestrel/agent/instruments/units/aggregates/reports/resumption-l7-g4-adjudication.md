# Revised Gemma 4B calibration

The revised Gemma 4B fit refuses admission. Root supports 137 of 179 generated occurrences; cutoff 0.78 admits 5 supported occurrences, short of the unchanged 0.5 admission floor. These findings describe development calibration, not downstream work quality. See [the successor calibration record](resumption-l7-calibration.md).

Clean-context native analyst Astra reviewed the opaque packet with no model identity, scores, or other audits. Packet SHA-256 is `4e21debd02597175d3ce6e269ac91a64f3595d81c73308ba68aef676af479e6a`. The review covers 179 occurrences and 46 distinct exact question/state/source combinations, with 1059 proposition occurrences and 1566 verified source quotations. The identifier/digest bijection and quotation checks passed; the quotation negative control failed as intended. Those checks establish serialization and quotation membership, not semantic correctness.

The independent labels contain 133 supported, 43 ambiguous, and 3 unsupported occurrences. The preserved `results/l7/calibration/g4/review-labels.json` has SHA-256 `a66d6495c5043993377a72e3082d638be27ad572af26fb318ff13544a66f9bac`; the independent report at primary `tmp/units/support-audit-c82f-report.md` has SHA-256 `d04238cce1cc4a5913f3af67738609770620354f345fde20af45bfa3953c25e2`.

Root read the complete report, every distinct candidate and proposition analysis, and the full ordered sources for the disputed delegation contexts. The same analyst agreed that Ruth's temporary authority through 2026-10-09 does not permanently replace Marcus's normal authority. Candidates explicitly reaching 2026-10-10 can state the resumed normal rule. Omitting the intervening exception is a coverage omission; the sources contain no later permanent approver change. Candidates ending during the temporary delegation retain their separate ambiguity.

Root changed that proposition and the resulting item verdict from ambiguous to supported for `12c58c73-376d-4abf-ad7f-1e4de6265183`, `27b5a6d6-0eed-40fa-940d-3cc7d96a8628`, its exact duplicate `86df85da-0920-4456-8e22-1607a728d363`, and `80b2adec-2f09-4ea5-8f14-07b333621d52`. The settled labels contain 137 supported, 39 ambiguous, and 3 unsupported occurrences. The create-only root container `results/l7/calibration/g4/labels.json` has SHA-256 `ad908dc8093671dfa81684b510799405d92c8b06b03a03b4f6fb2528573b5e3f`; primary `tmp/units/aggregate-l7-g4-labels.ts` records the exact transformation. Root froze these labels before inspecting scores.

Nonpositive findings retain their meanings: truncated asserted dates or identifiers, standalone stale lateness without a later transition, and assigning Grace's replacement dispatch to Parcelway where the source assigns it to the reporting business. Bare unfinished headings or lookup names add no factual assertion. Missing callback windows, changed contacts, completed arrivals, trace reopenings, and complete deadlines remain coverage limitations, not invented facts by omission alone.

Native verifier Luna ran `node tmp/units/aggregate-live-feasibility-l7.ts --execute --phase fit --key g4 --manifest-hash 09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf` after identity checks. The child exited 3 uncapped in 2045 ms under its 240-second watchdog; the operator exited 1 to reflect refusal. PID 73260 exited. Root read the full report and raw logs. No model request ran during fitting.

The diagnosis proposes cutoff 0.78 and refuses for end-to-end admission below 0.5. Supported, scored, and admitted occurrence counts are 137, 137, and 5; distinct counts are 37, 37, and 3. Repeated occurrences are not independent samples. The unchanged rule and labels remain fixed.

The retained artifacts under `results/l7/calibration/g4` have these identities.

| Artifact | SHA-256 |
| --- | --- |
| `fit/diagnosis.json` | `de5b67749d35d3cb58e5cdb61d9801d5ebebd7f7792b9ae3ac4b64403c500274` |
| `fit/controls.json` | `ef68d00bb430d3b6cd56a8ccf7076f862694fcbf2d08761a38090e0daeb9c499` |
| `cache/judge.jsonl` | `f6d30f1228db5bce548717c5f4b74aef0b6a773d1a9a9852eee0ae1542978741` |
| `cache/summary.jsonl` | `c999a10a5832ef6740d5156ddd1f1abd225f34f4049c96848c9cf5abebf61df8` |

Both cache hashes match generation manifest `f575ab2cd01fb618ce72bbdc334f129822d4d32cb1f4f1af61153789f82885f0`. The verifier report at primary `tmp/units/aggregate-l7-g4-fit-report.md` has SHA-256 `3e4d3e92eb8932132f2d7b838c6914a9c2c45afe45755cfd796246d82d396af9`. The full error artifact, `results/l7/logs/g4-fit.err`, has SHA-256 `869ab18c10ab2c8eaa22e023d6317978064c2edca7ea88288c219f72e1238e7a`; stdout is empty.
