# Opus grades, Round A briefing ledger (2026-10-09)

Rubric of v7/GRADES-none-6144.md, GRADES-compaction.md, and GRADES-both.md: correct, complete, and faithful, each 0 to 2 per goal and 20 per axis, scored on the delivered `reply` text only, markdown neither credited nor penalized; the rows keep no briefing text, so "cause" reads `briefing.seed`, `briefing.recall`, the `recall` and `pin` calls, and `holds`.

The following row sums the 10 goals.

| file | C | P | F | sum | replies | replies with fabrications | scorer passes (strict / ok any) | judge questions | median s per answer |
|---|---|---|---|---|---|---|---|---|---|
| v7 ledger (briefing ledger, budget 0.7, tail 0.35, horizon 3, gate deny, Mica judge, num_ctx 3072, reply terminal) | 14 | 19 | 16 | 49/60 | 10 (final 6, held 4) | 3 | 5 / 5 | 71 (70 in goals, 1 at seed) | 60.2 |

The following table grades each goal, with C/P/F as correct/complete/faithful; every row reads briefing recall 1 and stale 0.

| goal | C/P/F | cause | reason |
|---|---|---|---|
| g01 | 2/2/2 | none | "The refund amount is $289.00 ... with no restocking fee applied"; seeds 42, 44, and 45 rendered and seeds 4-5 in no row; the hold reworded the held "$289.00, which is the full price of the stand mixer". |
| g02 | 2/2/2 | none | "Mastercard ending in 7719" from the LH-44870 lookup r7; held and delivered answers are identical. |
| g03 | 2/2/2 | none | "Who has to sign off: Marcus Oyelaran", "Who gets copied: Priya Raman", and "PW-5521-9930"; seeds 6, 15, and 18 rendered; 6 recalls with 1 repeat closed the arm tools, and no lookup ran. |
| g04 | 2/2/2 | none | "is **ESC-2219**"; seed 22 rendered beside correction 27. |
| g05 | 1/2/1 | model | "MX-4486 (rotated early this week; previous code MX-4471 is no longer valid)" and "Refund amount ($289.00) exceeds the $200 threshold" are right; "Return window closed on order LH-79215" contradicts r5's "return window open until 2026-10-21", which covers seed 42 at entry, and "ready for sending to Luis Ferreira" misroutes an internal note. |
| g06 | 0/2/1 | model | "Status: Shipped" and "PW-6013-2280" are right; "Estimated Delivery: October 12, 2026" breaks rule 6 (seed 6 rendered) and "Please allow 5-7 business days for delivery" is invented; the delivered answer equals the held one. |
| g07 | 0/1/0 | model | "FL-660412" is right; "Who to ask: Marcus Oyelaran" replaces Tomasz (seed 8 rendered), "Today (Friday, October 9, 2026)" misdates today, 2026-10-08, and "to get the approval code for releasing the shipment" is invented; ESC-2291 appears only as the corrected value. |
| g08 | 2/2/2 | none | "Available Credit: $3,760.00", "sufficient for the $3,000 reorder", and "Ines Albrecht"; held and delivered answers are identical. |
| g09 | 2/2/2 | none | "**\"Happy 40th, Aiko\"**" is exact from seed 11, rendered by name; no date; the reply leaks the handle "m11". |
| g10 | 1/2/2 | model | "Extension: 4127" and "After 2 pm on her direct line" are right (seed 24 rendered), but "Phone Number: 555-0142 (main switchboard)" dials g08's decoy from r22. |

What carries the point:
- Cause tally over the 4 goals that lost points: model 4 (g05, g06, g07, g10), briefing 0, recall 0, gate 0. Every goal fact rendered at entry (`briefing.recall` 1 and `over` false in 10 of 10 rows), so each miss misread a prompt that held the fact: rule 6 and the carrier date in g06, seed 8's Tomasz in g07, seed 24 beside r22's switchboard in g10, and r5's open return window in g05.
- No reply revives a superseded or withdrawn value. Seeds 4-5 (the fee rule) and acks 3 and 23 render in no row; seed 2 renders in all 10 rows beside correction 29 and seed 22 in 5 rows beside correction 27, with stale 0 in every row; g05 and g07 name MX-4471 and ESC-2291 only as dead, and g01 and g05 give $289.00.
- The 4 gate holds (g01, g02, g06, g08) changed no answer: the delivered answer equals the held one in g02, g06, and g08, and g01 rewords the same $289.00. The hold passes cost 108 s of agent calls (15.4, 19.1, 44.6, and 28.9 s); in g06 the arm tools closed (call 27 advertised 2 tools) and the model's `pin` of r19 failed.
- Scorer: no false pass; 1 false fail, g08 ("sufficient for the $3,000 reorder" and "would be approved" miss expectedAny, which matches whole words). g05 fails on "previous code MX-4471 is no longer valid", a retirement the pattern's word list misses; the rubric docks it for the return window instead. The g06, g07, and g10 fails stand. `fabricated` flags 4 replies, 2 falsely ("5-QUART" from "5 quart", "3760" the computed headroom).
- Adoption bar: 6 of 10 replies grade 2/2/2 and 6 of 10 grade correct 2 (g01, g02, g03, g04, g08, g09), one goal short of 7 of 10; the scorer reads 5 of 10.
- Against this round's full view (41/60, max prompt 5,456), compaction (40/60, 2,866), and selection + compaction (35/60, 2,738, 225 judge questions, 50 minutes), the ledger scores 49/60 at a max prompt of 2,869 tokens with 71 judge questions in 11 minutes (run.log). It is the only arm with g03 and g09 at 2/2/2 and the only one that applies the approval rule with MX-4486 in g05; all 4 arms break rule 6 in g06, g07's Marcus repeats the full view's miss, and g10's 555-0142 repeats the full view's and compaction's.
