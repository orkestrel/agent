# Attack on RECORDS-PLAN.md: findings and verdicts (2026-10-09)

Each finding comes from the objective-lane attack; each verdict was checked against the cited evidence. bench.mjs line numbers cite its 6,312-line file; the file changed at 06:22:51Z to 6,411 lines.

| id | finding | severity | verdict |
|---|---|---|---|
| C1 | Fixtures hold, with three gaps: m24 sentence 1 opens with "Their" and has no earlier sentence; the person rule is not the `listNames` rule (bench.mjs:911-918); the join between records is unstated | minor | Applied: the no-antecedent case takes no prefix, the person rule is defined on its own, and records join with one blank line. The recount from the fixture text gives 1,309 at g03 with m44, not 1,305; under the C3 ruling the counts are 1,169, 1,140, and 1,382 |
| C2 | The claim that records take MX-4471 and ESC-2291 out of the prompts is false: the g05 tail carries g04's "ESC-2219 (not ESC-2291 as previously noted)" (body 00051, bench.mjs:1907-1909) | major | Applied: the claim is limited to the briefing, and the tail leak is a reported confound; A1 control g05 replies in v1, v2, v3, v5, and v8 hold ESC-2291 (none.jsonl line 5) |
| C3 | m44 joins `Rules` through m4 (cal-categories.jsonl:66-67, bench.mjs:1710), which adds it to g03 and g04, where refined shows it in no copy-2 body and g03 scores a revived restocking percentage | major | Applied: a member with an account joins only its account records, so m44 stays in Luis's record; the loss list adds m44 at g07 to g10 |
| C4 | The run 3 check "no member of another account" fails on the plan's own build (m44 in `Rules`, other accounts' requests in the tail) | blocking | Applied: the check covers account-record lines only, `Rules` holds no account member after C3, and tail entries are reported apart |
| C5 | Presence still depends on the filing: m29 reads correction 0.717 against the 0.7 fit (cal-categories.jsonl:27), and an unplaced correction has no render home | major | Applied: the ruling states the amends margin 0.024 and the category margin 0.017, plus the reverse-order reading 0.467 (cal-categories.jsonl:266); m29 joins `Rules` through its amends pair whatever its category, unplaced members go to `loose` and render as refined renders them, and a fixture covers m29 undecided |
| C6 | No check fails on name-word matching off, a wrong account, or a skipped stale step | major | Applied: two checks with injected faults recompute placement and `stale` apart from `buildRecords`; an `entities()` error is outside the module and the Halvorsen fixture catches it |
| C7 | The defect 3 table credits records against control or roundA evidence, not refined | major | Applied: the column reads against refined, using a2-refined-v1 (g03 and g10 answer Luis's request, g04 writes ESC-2291, g05 and g07 pass); g03, g07, and g10 claim none, and a g04 row is added |
| C8 | m24 joins Halvorsen only through the shared surname, and every copy names its customer | major | Applied: the plan states scoping is untested for an unnamed customer and a contact with another surname, and a fixture covers that contact; the variant files are outside this unit, so no copy is added |
| C9 | The trim bar >= -1 passes d = -1 on every copy (ATTACK-BRIEFING.md:179-183) | major | Applied: the trim bar is > -1 |
| C10 | A live refined run exists (run.log:33), so running refined 8 more times doubles the cost | major | Applied: run 4 runs the arm 8 times and takes refined's rows from A2 after run 2 shows `--records off` reproduces A2's request bodies; refined reruns only for a missing or unreproduced copy |
| C11 | Cost figures lack runs: minutes per run, run 5 minutes, swaps, and the seed-pass question | major | Applied: about 9 minutes per run (a2-refined-v1, 06:07:22 to 06:16:21), about 72 minutes for run 4 and for each run 5 ablation, 32 swaps over 88 model requests (a2-refined-v1-wire), and 1 seed-pass amends question (a2-refined-v1.log) |
| C12 | Inputs hold; three lines drift (2876, 2813, 2933), `arguments` comes from `call(message)`, and an account can carry several holder names | minor | Applied: lines corrected, the `results` row names `call(message)`, and `accounts` maps each account to its holder names in learn order, the title taking the first |
| C13 | A1 g05 counts hold | none | Held; the plan updates them to 10 failures with v8, 3 of them the comparison error |
| C14 | Defect 4 readings hold | none | Held; no change |
| C15 | Room figures and the m8 drop at g04 hold | none | Held; no change |
| C16 | Kenji registers only at g06's lookup | none | Held; no change |
| O1 | a1-control-v8 finished (run.log:32) and wrote ESC-2291 at g03 and g05 | minor | Applied: copies v1 to v8 are counted |
| O2 | The short scenario departs from BRIEFING.md:519's long scenario and is not listed | minor | Applied: listed under the rulings the user owns |
| O3 | `splitSentences` and `extractTokens` get two homes | minor | Applied: at integration bench.mjs imports both from records.mjs |
| O4 | The source sweep's "an amount from scenario.json" bans ordinary literals such as 2, 8, 12, 15, and 30 | minor | Applied: the sweep covers ids, person and holder names, and amounts with a currency sign or decimals |
| O5 | The run 3 old-token condition does not say whether it covers the tail | minor | Applied: it covers `## Pinned` and `## Rules`, and tail entries are reported apart |
| O6 | The noise design does not cite A0's repeat pass counts | minor | Applied: a0-ledger-1 and a0-ledger-2 pass 7 of 10, a0-control-1 and a0-control-2 pass 6 of 10 |
