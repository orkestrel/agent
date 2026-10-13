# Opus grades, Round A full view at 6,144 tokens (2026-10-09)

Rubric of v4/GRADES-3.md and GRADES-4.md: correct, complete, and faithful, each 0 to 2 per goal and 20 per axis, scored on the delivered `reply` text only; every seed fact sat in the prompt (full view, max prompt 5,456 tokens, no overflow or truncation).

The following row sums the 10 goals.

| file | C | P | F | sum | replies | replies with fabrications | scorer passes (strict / ok any) |
|---|---|---|---|---|---|---|---|
| v7 none-6144 (full view, reply terminal) | 12 | 16 | 13 | 41/60 | 10 | 5 | 5 / 5 |

The following table grades each goal, with C/P/F as correct/complete/faithful.

| goal | C/P/F | reason |
|---|---|---|
| g01 | 2/2/2 | "The refund for the opened stand mixer is **$289.00**."; the withdrawal held. |
| g02 | 2/2/2 | "Mastercard ending in 7719" from the LH-44870 lookup. |
| g03 | 2/2/1 | "Sign-off: Marcus Oyelaran", "Priya Raman", and "PW-5521-9930" are right; "Copy: Priya Raman (Refunds Team), Warehouse Ops, Logistics" invents 2 recipients. |
| g04 | 2/2/2 | "ESC-2219", the corrected value; an unneeded LH-80941 lookup preceded it. |
| g05 | 1/1/1 | "$289.00 (Full refund for opened item)" and "Restocking fee is waived (rule withdrawn)" are right; "No manager approval code required for this amount" denies seed 2 and omits MX-4486 (seed 29), both in the prompt; no lookup call. |
| g06 | 0/2/2 | "Shipped" and "PW-6013-2280" are right, but "Estimated Delivery \| 2026-10-12" and "let him know the tracking number and estimated delivery date" break rule 6 (seed 6, in the prompt). |
| g07 | 1/1/0 | "FL-660412" and "before 2026-10-09, as he is off tomorrow" are right, but "Who to Ask: Marcus Oyelaran" replaces Tomasz (seed 8, in the prompt), hands Marcus Tomasz's day off, and invents "the sign-off required by Freightline"; answered after a repeated LH-80941 lookup. |
| g08 | 1/2/1 | "fits within their limits" and "Ines Albrecht" are right; "would leave them at $2,000 in their available credit" is wrong ($3,760 available, $760 left). |
| g09 | 1/2/2 | "Happy 40th, Aiko" is exact; the reply then repeats g06's customer table with "Estimated Delivery \| 2026-10-12", a second rule 6 break. |
| g10 | 0/0/0 | "Sigrid Halvorsen's voicemail number is **555-0142**" (g08's switchboard decoy) and "I don't have a specific callback time"; seed 24 (extension 4127, after 2 pm) was in the prompt; "connect with ... Marcus Oyelaran" is invented. |

What carries the point:
- Delivery holds and accuracy limits the score: 10 of 10 replies arrived (9 final, 1 answered) against 6 sends in v4 none-6144 (reply 10/10/11), so the reply reading rises to 12/16/13 and stays under that run's answer reading of 16/18/18.
- Every miss had its fact in the prompt: g05 MX-4486 (seeds 2, 29), g06 and g09 rule 6 (seed 6), g07 Tomasz (seed 8), and g10 extension 4127 (seed 24). g05, g06, and g08 repeat misses GRADES-3 lists for v4 none-6144; GRADES-3 does not list g07's Tomasz swap or g10's decoy for that arm.
- Corrections and the withdrawal held: no reply revives MX-4471, ESC-2291, or the 15 percent fee, and g01, g04, and g05 carry ESC-2219 and $289.00. The losses sit on far rules (seeds 6, 8) and on seed 24 against the nearer 555-0142.
- The model's own earlier replies carry errors forward: g09 copies g06's dated table verbatim, and g07 names Marcus, whom g03 and g05 list as sign-off. g05 made no lookup call (tools not ok), and g09's search_history query already held "Happy 40th Aiko".
- Scorer: one false pass, g08 ("$2,000", as in GRADES-3); g03 passes with invented copy recipients that the rubric marks on faithful only. No false fail: g09's date pattern matches a real rule 6 break; g07 lacks "today" although "before 2026-10-09" states the deadline, and the missing Tomasz fails it regardless.
