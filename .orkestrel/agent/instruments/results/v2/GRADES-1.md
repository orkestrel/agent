# Opus grades, tuned rerun part 1 (2026-10-08): none-words, c-generic-s3, c-tuned-s3, selection-tuned

Each axis out of 20 per file; "reply-only" scores a missing send_reply as 0, "answer" counts the final content.

| file | C reply | P reply | F reply | C answer | P answer | F answer | replies | fabrications | overflows | substring passes |
|---|---|---|---|---|---|---|---|---|---|---|
| none-words | 6 | 6 | 6 | 8 | 8 | 8 | 3 | 0 | 6 | 3 |
| c-generic-s3 | 11 | 12 | 13 | 11 | 12 | 13 | 10 | 3 | 0 | 4 |
| c-tuned-s3 | 14 | 15 | 14 | 14 | 15 | 14 | 10 | 3 | 0 | 6 |
| selection-tuned | 9 | 11 | 7 | 15 | 17 | 13 | 7 | 3 | 0 | 4 |

Per-goal notes that carry the point:
- Tuned summary kept "Sigrid ... after 2 pm ext 4127" (generic never did) but dropped PW-5521-9930 and FL-660412 (generic kept a truncated "PW-5521" and "FL-660412"); both summaries turned "off tomorrow, Friday" into a Friday deadline (g07 wrong in both).
- Selection g04 failed by resending the g03 Grace note: the judge kept g03's send_reply call and result (p 0.19) but dropped g03's request, leaving an orphan reply before g04's request.
- Selection dropped seed 0 (today's date, p 0.005-0.039) and seed 6 (delivery-date rule, p 0.016): g06 wrote a date, g07 and g10 said "Friday".
- Selection g03 is the only correct Grace note outside none; g10 the only reply with 4127.
- Model failures across all arms: send_reply skipped 4 times with correct content (none g02; selection g01, g02, g08); search_history never called in 40 goals; generic g08 looked up LH-52307 instead of LH-31055; invented "945621834567", "555-0192", a gift wording; tuned g08 arithmetic wrong.
- Scorer false passes: generic g07 (Friday deadline), tuned g08 (wrong credit verdict, invented $1,760), selection g10 ("today, Friday"). No false fails.
