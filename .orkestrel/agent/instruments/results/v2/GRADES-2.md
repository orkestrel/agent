# Opus grades, tuned rerun part 2 (2026-10-08): both-tuned (second 0.9 selection run; compaction never fired) and selection-keep (0.95)

Same rubric as GRADES-1.md. Each axis out of 20; reply-only scores a missing send_reply as 0; answer counts the final content.

| file | C reply | P reply | F reply | C answer | P answer | F answer | replies | fabrications | overflows | substring passes | sum max prompt | kept msgs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| selection-tuned, 0.9 (GRADES-1) | 9 | 11 | 7 | 15 | 17 | 13 | 7 | 3 | 0 | 4 | 14,845 | 163 |
| both-tuned, 0.9 (second run) | 11 | 11 | 10 | 17 | 18 | 14 | 6 | 2 | 0 | 5 | 14,620 | 165 |
| selection-keep, 0.95 | 9 | 10 | 7 | 16 | 17 | 13 | 6 | 2 | 0 | 4 | 20,861 | 299 |

Per-goal notes that carry the point:
- The two 0.9 runs match on g01-g03 and on the kept seeds for g04, g06, g08, g10; g04 flipped to pass because g02's content was kept at p 0.102 (0.094 in the first run), the only difference between 16 and 17 kept messages; both runs dropped g03's request (p 0.081, 0.099) and kept its send_reply.
- g06 fails in both runs because the delivery-date rule (seed 6) is dropped at p 0.016-0.017, far below any cut; g07 fails in both with seed 8 kept (p 0.93), a misreading with the facts in view; the second run's g07 garbled a Luis refund note because g05's request was kept at p 0.10012 with its reply dropped.
- g08 and g10 flipped in opposite directions with the same kept seeds (g08's lookup was made that turn; the first run's g10 copied its own wrong g07 reply, kept at p 0.37-0.39): generation variance at temperature 0, not a drop.
- 0.95 raised prompts (sum of max prompts 20,861 against 14,620; kept messages 299 against 165) with no quality gain; the extra kept history carried the decoy switchboard number and "today, Oct 7th" from earlier replies into g10.
- Judge determinism: identical bounded states give identical p across files (seed 30 at g01: 0.0712 in both-tuned and selection-keep); differences between files are the threshold and earlier agent text.
- Scorer artifacts from the rule set at run time (before change 6 to scenario.json): both-tuned g08 answer-reading false pass ("exceeds", $6,240), both-tuned g07 pattern miss ("today, Friday"); rescore both files with rescore.mjs before comparing substring passes.
