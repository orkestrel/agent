# Opus grades, post-fix reruns (2026-10-08): none-6144, c-tuned (progressive, guard), selection (exchange-whole)

Same rubric as v2/GRADES-1.md and GRADES-2.md. Each axis out of 20; reply-only scores a missing send_reply as 0; answer counts the final content.

| file | C reply | P reply | F reply | C answer | P answer | F answer | replies | fabrications | overflows | substring passes (strict / ok any) | sum max prompt | kept msgs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| none-6144 (full view) | 10 | 10 | 11 | 16 | 18 | 18 | 6 | 1 | 0 | 5 / 8 | 34,453 | - |
| c-tuned (progressive folds, guard) | 11 | 15 | 12 | 11 | 15 | 12 | 10 | 4 | 0 | 6 / 6 | 17,382 | - |
| selection (exchange-whole, 0.9) | 5 | 10 | 12 | 10 | 16 | 18 | 7 | 0 | 0 | 2 / 4 | 18,372 | 226 |
| v2 selection-tuned (per-message) | 9 | 11 | 7 | 15 | 17 | 13 | 7 | 3 | 0 | 3 / 6 | 14,845 | 163 |
| v2 both-tuned (per-message, second run) | 11 | 11 | 10 | 17 | 18 | 14 | 6 | 2 | 0 | 5 / 7 | 14,620 | 165 |

What carries the point:
- The full view is the model's ceiling: 16/18/18 on the answer reading; its misses are 4 skipped send_reply calls with correct content, MX-4486 left out of g05 with the fact in view, a written delivery date with rule 6 in view, no g07 deadline, and a wrong headroom ($2,000 for $760).
- Tuned compaction kept ESC-2219, MX-4486 (section 2: "Approval code MX-4486 replaced MX-4471"), FL-660412, and "Sigrid ... after 2 pm on direct line extension 4127" through g04, g08, g10; it never recorded Tomasz, cut the gift note to "logs gift note LH-81660 for Aiko", and both section merges returned the first section verbatim, erasing sections 2 and 3 with no fault, after which the model invented "pro number 777777777" and a gift wording.
- The summarizer guard fired 3 times and caught no invented identifier: it rejected the scenario date the summarizer system message requires and LH-79215, which sat only in a tool call's arguments; its allowed set must include tool-call arguments and the system text and exempt date-shaped tokens.
- Exchange-whole selection fixed the orphan reply (g04 passes) and produced four misses absent from the per-message runs: g01 applied the withdrawn fee with the rule and the withdrawal both kept (each on its own p); g03 kept the fee rule (p 0.70, pulling seed 5 in by grouping) and dropped the withdrawal (p 0.008, 0.013); g05 kept the model's own wrong g01 reply (p 0.89); g10 kept g08's exchange whole and with it the model's own "switchboard 555-0142" sentence (p 0.031) beside seed 24 (p 0.92).
- The model never called search_history in 30 goals; every lookup used the right id.
- Scorer false passes: none g08 (answer, $2,000) and g07 (no deadline); c-tuned g01 ("window expired"), g03 (invented account numbers from the tool description's example), g10 ("between 2:00 PM and 4:00 PM"). No false fails.
- Referred: the merge loss needs an identifier-loss check (every id in the merge inputs appears in the output, else retry, else append the identifiers); the guard counters are cumulative and must be differenced per goal.
