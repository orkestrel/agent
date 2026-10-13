# Pilot stopping evidence

The independent analyst returned `VERDICT: FAIL 1; outside the claims: none`. The report's stale-carrier interpretation needs repair. The pilot still fails its plan invariant after that repair, and its complete withholding prevents a null-effect conclusion. This record captures the analyst's returned evidence; the analyst edited no file.

## Stale-carrier report defect

The final g03 row has rendered [], summary 0, and sole 0. Its selection contains only the date instruction, so collectSummaries returns an empty string. bench5/report.ts:604 projects every scoreText patterns entry into stale evidence; line 653 subtracts patterns found in shown text. The actual g03 forbiddenPatterns[5] is a zero-width negative lookahead testing absence of Marcus sign-off. It matches empty or innocuous summary text, while the shown briefing contains the required sign-off and does not match. This yields soleStale 1 without carried stale text.

Repair only leakage interpretation: count forbidden literals and text-bearing forbidden-pattern matches. Preserve the answer scorer and the leakage stop. An empty-summary guard alone fails for the innocuous nonempty summary `The carrier trace is open.` Regression cases must use the actual g03 rules and shown sign-off: empty and innocuous summaries produce soleStale 0; `Use ESC-2291.` absent from shown text still stops for leakage. Restoring the unqualified pattern projection must fail the former cases; disabling pattern leakage entirely must fail the latter.

## Plan mismatch

Control and aggregate first selections have the same briefing digest d0d7d1cc...ffb6c and scale 1.1633254716981132. Control carries seed indices 33 through 47 plus the request; aggregate carries 40 through 47 plus the request. Raw 00004_api_chat-request.json bodies corroborate the different tails, with the same system message. Driver.ts:476 records indices, roles, and content without message identifiers.

Driver.ts:430 implements T4: 0.7 - 555 / (3072 - 467) = 0.4869481765834932 versus control share 0.7. The baseline vendored planner applies the share before selecting its tail, producing tail caps about 339.73 and 555.84. Reservation remains even when every summary is withheld. F2 therefore fails on real input. Changing the budget or exempting this mismatch requires an explicit measurement ruling. The driver test checking briefing equality and identifier-free tail shape never asserts cross-arm tail equality.

## Withholding

The final aggregates.jsonl records 249 builds: 156 fail code checks and 93 fail AGREE. Each of 83 goal/topic groups attempts 3 builds then withholds. Drafts are nonempty; provisional and final prose, failures, and answers match. One recorded draft reformats 2026-10-08 as October 8, 2026; exact-copy checks reject the newly tokenized numbers and name. The corresponding raw response completed normally after 72 tokens.

Code-passing drafts score AGREE between 0.26491172223619 and 0.7753600931549042, below the fitted 0.82. Calibration has 19 positive and 23 negative AGREE items; only 3 positives clear the cutoff, and the highest negative is 0.8196303033529546. The fit deliberately rejects every negative. Aggregator.ts:239 enforces that fit, retries twice, then deletes the failed version. No retained version reaches CHANGE. This establishes the rejection path, not the semantic wrongness of every draft.

## Measurement limits

The analyst checked the inspected raw artifacts against their archive bytes and manifest hashes, including calibration items. Provisional fresh work costs 85.422 seconds for 56 summary calls and 48.353 seconds for 19 AGREE calls. Cached final costs cannot replace those measurements. Both arms pass 9 of 12 goals, but all aggregate goals render zero topics. Repairing the report leaves plan STOP; majority-zero refusal also remains. No threshold, checker, allocation, or stopping-rule change is authorized by the diagnosis.
