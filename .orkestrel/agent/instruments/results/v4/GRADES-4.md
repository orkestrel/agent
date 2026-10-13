# Opus grades, combined arm at window 1,000 (2026-10-08): both

Same rubric as v2/GRADES-1.md, v2/GRADES-2.md, and v4/GRADES-3.md. Each axis out of 20; reply-only scores a missing send_reply as 0; answer counts the final content.

| file | C reply | P reply | F reply | C answer | P answer | F answer | replies | fabrications | overflows | substring passes (strict / ok any) | sum max prompt | kept msgs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| both (selection 0.9 + compaction window 1,000, progressive folds) | 6 | 9 | 8 | 11 | 15 | 13 | 7 | 5 | 0 | 2 / 5 | 13,403 | 192 |
| none-6144 (full view) | 10 | 10 | 11 | 16 | 18 | 18 | 6 | 1 | 0 | 5 / 8 | 34,453 | - |
| c-tuned (progressive folds, guard) | 11 | 15 | 12 | 11 | 15 | 12 | 10 | 4 | 0 | 6 / 6 | 17,382 | - |
| selection (exchange-whole, 0.9) | 5 | 10 | 12 | 10 | 16 | 18 | 7 | 0 | 0 | 2 / 4 | 18,372 | 226 |
| v2 selection-tuned (per-message) | 9 | 11 | 7 | 15 | 17 | 13 | 7 | 3 | 0 | 3 / 6 | 14,845 | 163 |
| v2 both-tuned (per-message, second run) | 11 | 11 | 10 | 17 | 18 | 14 | 6 | 2 | 0 | 5 / 7 | 14,620 | 165 |

Per goal, with C/P/F as correct/complete/faithful:

| goal | replied | C/P/F reply | C/P/F answer | reason |
|---|---|---|---|---|
| g01 | yes | 2/2/2 | 2/2/2 | "full refund of $289.00" with "the restocking fee has been removed"; seeds 42 and 44 kept (p 0.933, 0.914). "contact us at luis.ferreira@example.net" puts Luis's own address where the desk's belongs; it invents no value. |
| g02 | no | 0/0/0 | 2/2/2 | Content "Mastercard ending in 7719" from its LH-44870 lookup; send_reply skipped. |
| g03 | no | 0/0/0 | 1/2/1 | Content has "PW-5521-9930", "Marcus Oyelaran", and "Priya Raman", plus the invented "Secondary Sign-off: Dana Whitcombe (Support Desk Lead)"; send_reply skipped. Seed 18 (Marcus signs off) was never in view; Marcus came from section 1's "Marcus Oyelaran (escalations manager)". |
| g04 | yes | 0/1/2 | 0/1/2 | "Escalation Ticket Number: ESC-2291", the superseded value; seed 27 (ESC-2219) was lost to compaction and the "Halvorsen Interiors" search missed it. |
| g05 | yes | 0/1/0 | 0/1/0 | "refund of $1,240.00", "approval code MX-4471", "a 15% restocking fee applies"; MX-4486, $289.00, and the withdrawal were lost to compaction, and section 1 supplied the stale code and fee. |
| g06 | yes | 1/1/1 | 1/1/1 | "has shipped" with no tracking number and no date; the model looked up "LH-12345", never LH-81660, with "order LH-81660" in view; "send the gift note ... to confirm receipt" is invented. |
| g07 | yes | 1/1/1 | 1/1/1 | "pro number FL-660412" and "by 2026-10-08 (today)" are right, but "You should ask Marcus Oyelaran" replaces Tomasz; seed 8 was lost to compaction. |
| g08 | yes | 2/2/2 | 2/2/2 | "available credit is $3,760.00", "would fit within", "Ines Albrecht". |
| g09 | no | 0/0/0 | 2/2/2 | Content "Happy 40th, Aiko" recovered by search_history "Kenji Nakamura" (seed 11); send_reply skipped. |
| g10 | yes | 0/1/0 | 0/1/0 | "dial 555-0142 to reach the main switchboard" (the decoy) and the invented "She will pick up the shipment on October 13th."; seed 24 (extension 4127) was lost to compaction and the search limit. |

What carries the point:
- Compaction erased every seed fact after seed 7. Section 1, the fold of seeds 0-7, reads "refunds over $200 require approval code MX-4471 from Marcus; opened items incur a 15% restocking fee on refunds; and Priya Raman must be copied on all escalations" in all 10 rows. All 9 goal-time merges (g01 2, g02, g03, g05, g07, g09, g10 2) returned it verbatim and discarded the other input. Real facts folded to "No facts.": seeds 40-43 (8dc7147c), seeds 44-47 with the withdrawal (dbaa4649), g03's exchange holding PW-5521-9930 (8fb3d83e, after the first g05 fold call hit the length limit at 2,064 completion tokens), and g07's 10 messages folded to an empty summary (7bfda2dd). From g02 on, no seed message sat in any agent call.
- g05 is the summary's error, not the judge's. Selection kept section 1 at p 0.866 and 0.858, the only text in view that stated a code or a fee rule. The model wrote "approval code MX-4471 ... a 15% restocking fee applies". It took "$1,240.00" from g04's Halvorsen search hit, which was in view, and invented "The order was opened on 2026-10-08".
- search_history was called 9 times in 6 goals (g03, g04, g06, g07, g09, g10), against none in the 30 goals GRADES-3 graded. Replayed on the rebuilt record, it recovered PW-5521-9930 (g03 "Grace Okafor", seeds 16, 15, 13), "Happy 40th, Aiko" (g06, g09, seed 11), and FL-660412 (g07, seed 36). Every multiword first query (g03, g04, g10) returned no hit, because the all-words match also needs the words the model adds.
- search_history missed the 3 corrected or far facts that cost points. In g04, "Halvorsen Interiors" returned seed 22 "Escalations opened ticket ESC-2291" but not seed 27 "Correction on Halvorsen: the ticket is ESC-2219", which lacks "Interiors". In g07, "Halvorsen pendant lights" cannot reach seed 8, which names Tomasz without Halvorsen. In g10, "Halvorsen" filled the 6-hit limit newest first with goal-time messages, led by g08's "phone is the main switchboard 555-0142", before reaching seed 24.
- The judge dropped no needed fact that was in view. g04 and g05 kept every candidate (16/16, 11/11). In g06 the judge dropped section 1 with rule 6 (p 0.005), and the reply still wrote no date. In g09 the second pass kept only the request (1/9), and search recovered seed 11.
- The fabrications, quoted: g03 "Secondary Sign-off: Dana Whitcombe (Support Desk Lead)"; g05 "$1,240.00" and "The order was opened on 2026-10-08"; g06 "Please send the gift note with the message \"Happy 40th, Aiko\" to confirm receipt"; g07 "You should ask Marcus Oyelaran"; g10 "She will pick up the shipment on October 13th." In g07, "by 2026-10-08 (today)" is right without seed 8 in view; only the system line "Today is Thursday 2026-10-08" supports it.
- The model failed 3 times with the facts in view. It looked up "LH-12345", the example id in both lookup tool descriptions, 6 times (g03 2, g06, g07, g09 2); in g06 this replaced the LH-81660 lookup, which cost PW-6013-2280. It skipped send_reply with correct content in g02, g03, and g09.
- Scorer: one false pass, g03 answer (ok any), which carries the invented secondary sign-off. There are no false fails; g04, g05, g06, g07, and g10 fail on missing or forbidden strings the rubric also marks down. Sum of max prompts is 13,403, the lowest of the 6 rows. Kept messages total 192 over 19 selection passes, because the arm reselects after each fold; counting only each goal's last pass gives 83, so neither figure compares directly with the single-pass rows. The run loaded the harness before its 21:01 edit: the row guard has no `lost` field, and 7bfda2dd holds an empty summary that the edited code would turn into "No facts.".
