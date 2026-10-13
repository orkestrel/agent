# Opus grades, Round A compaction (2026-10-09)

Rubric of v4/GRADES-3.md and v7/GRADES-none-6144.md: correct, complete, and faithful, each 0 to 2 per goal and 20 per axis, scored on the delivered `reply` text only, markdown neither credited nor penalized; "in prompt" reads the sections of the final agent call (`sectionsHeld`, matched by section id) and that call's recent messages.

The following row sums the 10 goals.

| file | C | P | F | sum | replies | replies with fabrications | scorer passes (strict / ok any) |
|---|---|---|---|---|---|---|---|
| v7 compaction (window 1600, keep 6, 3 sections, guard, num_ctx 3072, reply terminal) | 10 | 16 | 14 | 40/60 | 10 | 5 | 4 / 4 |

The following table grades each goal, with C/P/F as correct/complete/faithful.

| goal | C/P/F | reason | in prompt |
|---|---|---|---|
| g01 | 2/2/1 | "the refund amount would be **$289.00**" is right; "(no restocking fee since it's an opened return)" invents the reason. | Only in the model's own earlier turn "The rule was withdrawn, so there is no fee."; the fold of seeds 44-45 returned "No facts." |
| g02 | 2/2/2 | "**Mastercard ending in 7719**" from the LH-44870 lookup. | Yes, lookup result. |
| g03 | 1/2/1 | "Marcus Oyelaran", "Priya Raman", and "PW-5521-9930" are right; "**Escalation ID:** ESC-2291 (updated from previous)" gives Grace the superseded Halvorsen ticket, and "due to her Gold tier status" invents the sign-off reason. | Yes; section 1 holds "Created ESC-2291 for Halvorsen Interiors" beside "Updated: the Halvorsen escalation is ESC-2219." |
| g04 | 0/0/1 | "is **ESC-2291**. This matches the record in Escalation Ticket #2291 (updated from previous)"; the asked number is ESC-2219. | Yes, correction in section 1 beside two stale lines: "Created ESC-2291" and the restored "**Escalation ID:** ESC-2291 (updated from previous)". |
| g05 | 1/1/0 | "$289.00" is right; "The refund is under the $200 threshold, so it does not require manager approval code MX-4486" denies seed 2; "this is a replacement order" and "processed ... after the return window closes" are invented. | Rule yes: "Refunds over $200 require manager approval code MX-4486 from Marcus Oyelaran."; withdrawal no. |
| g06 | 0/2/2 | "PW-6013-2280" is right; "with an estimated delivery date of October 12th" in the customer reply breaks rule 6. | Yes: "No delivery dates may be promised in writing to customers." |
| g07 | 0/1/1 | "**Tomasz Brennan**" and "**FL-660412**" are right; "Since Tomasz is unavailable today, you need to reach out to him as soon as possible before he leaves for the weekend" gives no today deadline and invents his absence; it adds an unasked "**ESC-2291**". | Yes: "he is off tomorrow (Friday 2026-10-09)"; ESC-2291 from section 2 "Escalation Ticket #2291". |
| g08 | 2/2/2 | "**Available Credit:** $3,760.00", "sufficient available credit to cover the $3,000 reorder", and "Ines Albrecht" are right. | Yes, lookup result. |
| g09 | 1/2/2 | "Happy 40th, Aiko" is exact; "estimated to be delivered on October 12th" adds the carrier date the scenario forbids in g09. | Yes, the restored line "Noted gift note for order LH-81660 (Kettle) reading \"Happy 40th, Aiko\"" in section 1. |
| g10 | 1/2/2 | "After 2 pm on her direct line at extension 4127" is right, but "**Callback Number:** 555-0142 (main switchboard)" dials g08's decoy. | Partly: section 1 says "extension 4127 after 3 pm" and all 3 sections hold 555-0142; 2 pm sits in no section and came through search_history. |

What carries the point:
- Stale beside correction costs the most: from g01 to g07 section 1 held "Created ESC-2291 for Halvorsen Interiors ... Copied Priya Raman." beside "Updated: the Halvorsen escalation is ESC-2219."; the g01 merge restored that ESC-2219 sentence and dropped seed 27's "the ticket is ESC-2219, not ESC-2291". g03 invented "ESC-2291 (updated from previous)", g04 copied it from a restore, and the summary of g04's reply ("confirming the match with Escalation Ticket #2291") fed g07.
- The withdrawal reached no summary: the fold of seeds 44-45 returned "No facts." without a retry because that input holds no id, and section 1 states "Opened items incur a 15% restocking fee on refunds." from g01 through g10. g01 and g05 still gave $289.00, on invented reasons ("since it's an opened return", "a replacement order").
- Guard: 7 empties (1 seed fold, 6 in goals), 14 retries, 41 restored sentences, and 1 filter at g02 that dropped invented "CE-1122-4430" and "ESC-2345". Restores at the seed fold and the g01 merge carried MX-4486 to g05, which named it while denying the rule, and FL-660412 to g07; restores helped g09 (the gift-note line at the g08 and g09 merges). Restores hurt g04 ("**Escalation ID:** ESC-2291 (updated from previous)") and g10, where 555-0142 was restored 5 times between g07 and g10.
- Merges corrupt kept facts as well: from g08 section 1 says "extension 4127 after 3 pm", gives Sigrid Grace's "Gold tier ... 2 claims", and gives LH-79215 Grace's "Tracking PW-5521-9930". The g06 rule 6 break and the g07 deadline miss had the fact in prompt.
- Scorer: 2 false passes, g05 ("MX-4486" inside "does not require manager approval code MX-4486") and g03 (ESC-2291, absent from its forbidden list); 1 false fail, g08 ("sufficient ... to cover" is outside expectedAny). g07 fails on "off work tomorrow (Friday, October 9th)", a day-off statement, and matches "today" only in "unavailable today"; the rubric fails it on the deadline regardless. g09 and g10 fails stand.
- Against the full view of the same round (12/16/13, 41/60, max prompt 5,456 tokens), compaction scores 10/16/14, 40/60, at a max prompt of 2,866 tokens. It loses correct points to ESC-2291 in g03, g04, and g07, which the full view never revived, and gains on g07 (Tomasz, not Marcus), g08 ($3,760 headroom, not $2,000), and g10 (4127 after 2 pm, not 555-0142 alone); both break rule 6 in g06 and deny the approval rule in g05.
