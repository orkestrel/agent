# Revised Qwen 2B calibration

The revised Qwen 2B fit refuses admission. Root adjudication supports 131 of 168 generated occurrences, but the unchanged separating cutoff admits only 1 of those 131. The source-clause prompt improves factual support over the original development run; this result does not establish work quality or qualify an aggregate pilot. See [the successor calibration record](resumption-l7-calibration.md).

## Support adjudication

Clean-context native analyst Astra reviewed the opaque packet with no model, score, generation, or prior-audit metadata. Packet SHA-256 is `64f575e39f5b1cae6237fedb67e3559103ee1bf535c2655fee610bda9094a67e`. The review covers 168 occurrences, 47 distinct question/state/source combinations, and 42 distinct ordered source contexts. Its manually judged analysis contains 642 proposition occurrences and 805 exact source quotations. Mechanical identity, grouping, quotation, and coverage checks passed; those checks do not establish semantic correctness.

The independent labels contain 132 supported, 11 unsupported, 14 contradicted, and 11 ambiguous occurrences. The retained `results/l7/calibration/q2/review-labels.json` has SHA-256 `561da7b582d94927f5c07fcc32bb0dc0b7b0c6d7299da1e0f0b5f0a605442c6b`. The analyst report at primary `tmp/units/support-audit-93d1-report.md` has SHA-256 `2990ff8ea958bfeb6eba01a50446009ace56fe559084115cc77b1a90e16d12d7`.

Root read the complete report, every distinct candidate and proposition analysis, and the source groups needed to resolve contested headings. Root asked the same analyst to reconcile inconsistent treatment of source-date and role headings. The analyst acknowledged that the opaque criterion does not establish whether a heading attributes the originating message or annotates a synthesized summary. That ambiguity must apply to both role and date. The production prompt still requires literal provenance; this support audit does not excuse prompt noncompliance or alter the prompt. Material uncertainty remains nonpositive for fitting.

Root applied these source-based rulings before opening scores:

- `bb615966-fcf0-49a1-9f23-93274df16e92` retains supported delivery facts but labels a tool-derived clause `user`. Add an ambiguous provenance proposition; its supported item verdict becomes ambiguous.
- `49926fdb-90df-4721-a1b6-05e56118ed91` and its exact duplicates change the date heading of Kenji's call report without establishing the call's event date. Change the header-dependent contradiction to ambiguity. Apply the same reading to the report-date propositions in `dce68568-16e0-4cc0-abd4-e1acffd1a8e4` and `f3e6b098-9af8-40bf-a1fc-952dc0e90605`. Their separate parcel-identity and causal-association errors remain nonpositive.
- Add ambiguous date-provenance propositions to `21b0748c-3f17-4f54-87e9-e72305473a60` and `8f195113-e7f6-49f9-b6f5-ed0dee4b3f7f`. Ruth's explicit delegation end date does not extend her authority; the chase retains its separate active-versus-historical ambiguity after arrival.
- Preserve contradictions where changed headings also move relative terms such as today or tomorrow. Preserve unresolved exchange direction, trace-versus-tracking wording, incomplete identifiers or terms, locker-versus-parcel opening, and dispatch-versus-receipt wording as nonpositive.

The final labels contain 131 supported, 12 unsupported, 10 contradicted, and 15 ambiguous occurrences. Every original proposition and occurrence remains in the retained independent artifact. Root's create-only container, `results/l7/calibration/q2/labels.json`, has SHA-256 `4965e298d9bd345bbd0f86a418648a6767ccfb776f5d46b232d3defba070cb78`. No nonpositive item became supported. The root transformation is recorded by primary `tmp/units/aggregate-l7-q2-labels.ts`.

Coverage remains separate from support. Supported drafts can omit the replacement approver, corrected escalation reference, replacement buyer contact, redirect address or cutoff, and credit balance. Those omissions are visible development limitations. They neither invent an assertion nor establish performance on an unseen goal. The incomplete trailing date in `a1aef41a-099a-4d74-a1fd-2af89737c6d7` supplies no meaningful extra proposition; its completed factual clauses are supported, while the unchanged lexical guard rejects that output before scoring.

## Fit observation

Native verifier Luna ran `node tmp/units/aggregate-live-feasibility-l7.ts --execute --phase fit --key q2 --manifest-hash 09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf` after checking the operator, build, and settled-label hashes. The canonical child exited 3 uncapped in 2079 ms under its 240-second watchdog; the operator exited 1 to reflect the authentic refusal. Root read the complete launcher output and report. The recorded PID 44460 exited. No model request ran during fitting.

The diagnosis proposes cutoff 0.85 and refuses for end-to-end admission below 0.5. Supported, scored, and admitted occurrence counts are 131, 130, and 1; distinct counts are 33, 32, and 1. These counts include the generation's repeated occurrences and must not be presented as independent samples. The judge and admission rule remain unchanged; no cutoff is lowered and no label is changed to obtain exposure.

The fit evidence under `results/l7/calibration/q2/fit` has these identities.

| Artifact | SHA-256 |
| --- | --- |
| `diagnosis.json` | `c34c6f9687cdc324c38c2099f5f5f96f0bfaa51c2af8e96193b6b58aaafc320b` |
| `controls.json` | `ef68d00bb430d3b6cd56a8ccf7076f862694fcbf2d08761a38090e0daeb9c499` |

The verifier report at primary `tmp/units/aggregate-l7-q2-fit-report.md` has SHA-256 `570a0106d2b7d74ba44813d8d3d5b8365f4593365efddb53b5daa8acc85f0edf`. The complete error record is `results/l7/logs/q2-fit.err`, SHA-256 `d4ee8be6b6de6e9eb836617ce0eb6e376fb0a535f42c0b5ea2ab8ac6342d2d95`; stdout is empty. Completed generation cache bindings match their retained files: judge SHA-256 `10f26e296350b09e855f4f0b983109e18feef22eb41dc033332197d4933ec486`, summary SHA-256 `d92a6f4f1d86b18a235fb2a1c7a341db438c244d9356720265c5ea6250223e44`.

The other successor models retain their separate blind reviews and fits. A later decision about the admission method must use the completed cohort, preserve this refusal, and freeze any justified revision before fresh evaluation. Records and full-view baselines remain available under their resource prerequisites; the aggregate's refusal is not a records-versus-aggregate quality verdict.
