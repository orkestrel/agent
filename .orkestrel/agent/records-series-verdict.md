# Records series verdict, 2026-10-09

## Correction, 2026-10-09: two-sided audit

The Result and Ruling sections that follow adjudicated scorer failures alone, and a scorer pass can be false: `f4-control-v1` g08 passed with "$3,860" available, where $5,000 less $1,240 is $3,760. Every one of the 162 scorer passes of the three designs was then judged blind by two Claude Haiku 5.5 auditors on the `checker` role with a tiebreak (run `wf_e1b4eff3-968`, `tmp/bench/results/v9/audit/verdicts-pass.json`). GPT-6 Astra checked that batch (`score-audit-3`, `tmp/codex/score-audit-3-last.md`, 439.8 s): `VERDICT: FAIL 1, 3, 4, 5`. Its patch replaced 22 verdicts:

- hedged language ruled false;
- complete answers ruled ambiguous for their form;
- an invented prerequisite ruled ambiguous;
- unequal rulings on equivalent replies.

The patched verdicts are `tmp/bench/results/v9/audit/verdicts-pass-checked.json`, with 128 correct, 25 false passes, and 9 ambiguous. A row passes when the scorer passes it and the checked pass audit does not rule it false, or when the scorer fails it and the failure audit rules it a misread. An ambiguous row counts as a fail at the low end and a pass at the high end (`tmp/bench/results/v9/tools/adjudicated.ts --override 64952363=ambiguous`).

| Design | Passes per copy, low to high |
| --- | --- |
| Records | 6.50–6.75 |
| Refined briefing | 5.63–6.13 |
| Full view | 4.38–5.13 |

| Pair | Mean d | Lower bound | Fix bar |
| --- | --- | --- | --- |
| Records against the full view | 1.63 to 2.13 | 0.12 to 0.90 | clears |
| Refined against the full view | 1.00 to 1.25 | 0.07 to 0.43 | clears |
| Records against refined | 0.63 to 0.88 | −0.57 to −0.08 | does not clear |

Passes per request over the 8 copies, records / refined / full view:

| Request | Records | Refined | Full view |
| --- | --- | --- | --- |
| Refund amount | 8 | 8 | 6 |
| Card | 8 | 8 | 8 |
| Grace escalation | 1 | 4–5 | 0–1 |
| Halvorsen ticket | 7 | 7–8 | 6 |
| Approval note | 4 | 4 | 0 |
| Kenji shipping | 1–2 | 1 | 1 |
| Depot release | 5 | 3–4 | 3 |
| Credit check | 2–3 | 1–2 | 6 |
| Gift note | 8 | 8 | 4–6 |
| Sigrid callback | 8 | 1 | 1–4 |

Both briefing designs clear the fix bar against the full view, and the records hold the highest mean. The records' lead over the refined briefing is inside the noise. The full view lost the most to false passes: 8 of its 48 passes. Its replies stated wrong credit headroom, wrong gift-note placement, and the superseded approval code.

The records lose the Grace escalation to their copy lists. Five of the 8 records replies copy a wrong recipient on the internal note: the customer, Kenji, or the carrier. The ruling to keep the per-topic records stands. They are the design with the highest adjudicated mean, and they win the requests they were built for: the Sigrid callback, 8 against 1. The superseded rows follow for the record.

The comparison asks which context design lets the 2B Qwen (`qwen3.5:2b-q4_K_M`, thinking off, temperature 0) answer the Larkspur support shift best: the full view (control), the event-sourced briefing with the refined profile, or that briefing with per-topic records. Each design ran the same 8 reworded copies of the 10 requests, one run per copy from a cold daemon with its wire recorded (agent checkout, `tmp/bench/results/v9/`).

## Runs

| Design | Runs | Harness |
| --- | --- | --- |
| Full view | `a1-control-v1`–`v8` | `tmp/bench/bench.mjs --mode none --ctx 6144` |
| Refined briefing | `a4-refined-v1`–`v8` | `tmp/bench3/bench.mjs` sha256 `3d75138e…`, `--profile refined`, `--ctx 3072` |
| Records | `a5-records-v1`–`v8` | `tmp/bench3/bench.mjs` sha256 `59609d38…` (`--records off` byte-identical to `3d75138e…` on every recorded wire), `--records on` |

## Scoring

The strict scorer (`tmp/bench/rescore.mjs` over `tmp/bench/scenario.json`, permissive edits reverted per `frozen-harness-audit-verdict.md`) scores every row. Every failed row of every series was judged blind by two Claude Haiku 5.5 auditors with a tiebreak (batches 1 to 3, `tmp/bench/results/v9/audit/verdicts*.json`), and GPT-6 Astra checked each batch blind (`score-audit-verdict.md`; batches 2 and 3, session `01a12025-2e72-7552-9c5b-ee74c2930137`, 129.1 s, `VERDICT: PASS`). A row passes when the scorer passes it or the audit rules its failure a misread; an ambiguous failure counts as a fail at the low end and a pass at the high end (`tmp/bench/results/v9/tools/adjudicated.ts --override 64952363=ambiguous`).

## Result

| Design | Passes per copy, low to high | Mean |
| --- | --- | --- |
| Full view | 5, 6, 5, 8, 5, 5, 7–8, 7 | 6.00–6.13 |
| Refined briefing | 7, 8, 6, 8, 7, 5, 6, 7–8 | 6.75–6.88 |
| Records | 9, 8, 8, 8, 9, 8, 7, 7–8 | 8.00–8.13 |

| Pair | Mean d | Lower bound (mean − 2·sd/√8) | Fix bar |
| --- | --- | --- | --- |
| Records against refined | 1.25 | 0.43 | clears |
| Records against the full view | 2.00 | 0.69 to 0.75 | clears |
| Refined against the full view | 0.75 | −0.23 to −0.07 | does not clear |

Adjudicated passes per request over the 8 copies, records / refined / full view: refund amount 8/8/8, card 8/8/8, Grace escalation 8/7/1, Halvorsen ticket 8/8/8, approval note 6/8/1, Kenji shipping 2/1/1, depot release 6/4/3, credit check 2/1/8, gift note 8/8/7, Sigrid callback 8/1/3.

## Ruling

Keep the per-topic records: they are the only layer that clears the fix bar, against the refined briefing and against the full view, in a 3,072-token window where the full view needs 6,144. The refined briefing alone ties the full view within the noise.

## Open, in order

1. The credit check: records pass it on 2 of 8 copies against the full view's 8 of 8. A cold probe traced the refined loss to the pinned account story burying the question (`FINDINGS-A1.md`), and the judge reads that story as not needed (`probes/relevance.jsonl`). Next arm: a relevance filter on record and pinned lines, one judge question per line per request.
2. Recall results carry handles (`r8`), and a reply cited one instead of writing the note (`a5-records-v2` g05). Recall output drops its handles in the successor unit.
3. The successor harness unit: the defects in `frozen-harness-audit-verdict.md` and `records-candidate-audit-verdict.md`, and the two design limits of account scope (a desk-wide correction stated in one account's message; the capitalization-based person prefix).
4. Kenji's delivery date stays a model limit: 0 of 27 probe replies and 0 of 9 rewrites drop it.
