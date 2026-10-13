# Records development reply audit

The completed records run has 11 semantic passes, 12 semantic failures, and 1 ambiguous reply across 24 goals. Excluding g06 as the brief requires leaves 11 passes, 11 failures, and 1 ambiguous reply across 23 goals. Availability does not establish quality. Material failures include incorrect shipment state, obsolete contacts, missed reopened work, invented refund policy, and an unanswered arrival question.

This is an unblinded development audit by the dispatched analyst on GPT-6 Astra through native Codex. Arm and model metadata were visible. No historical grade, calibration label, unfinished arm, model rerun, implementation change, or network research supplied a judgment. Stored row success and pattern fields are not used as semantic evidence. This report does not substitute for a blind held-out audit.

## Evidence and protocol

All paths in this report resolve from `C:/Users/mikes/WebstormProjects/scaffold`. Source labels in the tables link to exact file lines. `V` is the frozen v1 scenario, `R` is the completed reply row, `Q` is the recorded model request/response, and `M` is the chronological message trace. Full replies remain in the raw artifacts.

The resource manifest has `accepted: true`, one accepted attempt, no attempt failures, reserve 512, and window 3072. Its SHA256 matches the supplied identity, `81f29fd3494dc6d635abcac79e287e8403b2492fecbaf1dde53a0a5bb6a95338`. The run records identity `l6-q2-think0-records-v1`, model `qwen3.5:2b-q4_K_M`, arm `records`, copy 1, and status `complete`; see [manifest](C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/manifest.json:7) and [run identity](C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/run.json:3), [run completion](C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/run.json:423).

The evidence census is 24 unique rows for 24 scenario goals, in matching order, each `partial: false`. All 24 original request strings match their goal-tagged user messages exactly. There are 78 request rows, 78 call records, 53 turn records, and 256 chronological messages. Request `sequence` joins the call record; call `turn` joins the turn record; every goal reply joins its row and chronological final message. Each actual tool call joins its result by the call ID and goal, with the result preceding the reply. Every requested evidence filename exists. The additional `messages.jsonl` file supplies the call-ID/result joins; it is not a substitute for an absent named file.

The base `scenario-long.json` and v1 differ only in the 24 goal request phrasings. Their seed, days, rules, tool data, replacements, and goal obligations match. The actual run uses v1 wording. Its recorded requests use the scenario's `ledger.system`: `recall` replaces `search_history`, and a final message replaces `send_reply`; see [V:5][V5] and [Q:4][Q4]. Therefore an absent `send_reply` or `search_history` invocation is not itself a violation in this arm. The actual tools exposed in Q:4 are `lookup_order`, `lookup_customer`, and `recall`. There is no tool for sending a separate message to Priya or issuing a refund.

Tool compliance has a real specification ambiguity. The system requires a lookup whenever a request concerns an order ID or account number from the conversation. The per-goal `tools` lists expressly require fresh lookups on g01, g02, g03, g05, g06, g07, g08, g09, and g15, but omit them on other customer/order questions. This report treats the system as controlling and applies it to those other questions as well. A recalled old lookup result is not a fresh invocation. The `Tools` column gives the stricter system outcome, followed by the narrower explicit-list outcome after a slash where they differ. These alternate totals expose the interpretation rather than silently treating the omitted lists as exemptions. A generic walk-in-counter question, g16, has no order/account lookup requirement.

Semantic pass means the full answer satisfies the request without material false, stale, or unsupported additions. Tool pass measures required invocations and ordering separately from answer truth. Complete work requires both and completion of the requested action. A requested draft needs a draft, not a real-world send or refund. g04 explicitly requests sending to Priya; a final answer to the shift lead is not evidence that Priya received it. Its prior copied-on-escalation state is in the conversation, but the requested transmission has no result.

## Per-goal judgment

`P` means pass, `F` means fail, and `A` means ambiguous. Complete-work results use the system lookup interpretation. `F/P` means the system interpretation fails while the explicit per-goal tool list passes. The trace column lists model sequence numbers, actual calls, result lines, and the final reply sequence; no seeded or recalled invocation is counted as an action in the goal.

| Goal and request evidence | Semantic | Tools | Complete | Content evidence and material qualification | Invocation/result evidence |
| --- | --- | --- | --- | --- | --- |
| g01 refund amount [V:1967][V1967], [R:1][R1] | P | F | F | Correct full $289, with withdrawn restocking fee. No approval code is required merely to state the amount; this request is not an internal authorization note. Ground truth: [V:549][V549], [V:574][V574]. | Recall Luis at Q4, result M51, answer Q5. No `lookup_order` for LH-79215. [Q:4][Q4], [Q:5][Q5], [M:51][M51]. |
| g02 card [V:1994][V1994], [R:2][R2] | P | P | P | Correct Mastercard ending 7719. [V:1942][V1942]. | `lookup_customer(LH-44870)` Q7, result M55, answer Q8. Correct order. [Q:7][Q7], [M:55][M55], [Q:8][Q8]. |
| g03 escalation note [V:2019][V2019], [R:3][R3] | F | F | F | Correct Marcus, Priya, and PW-5521-9930, but falsely labels Grace's parcel stuck at a carrier depot awaiting warehouse release. Grace's parcel was marked delivered to a locker, with trace already opened. It also imports refund code MX-4486 as a requirement for this $148.50 replacement without a supporting rule. [V:217][V217], [V:255][V255], [V:267][V267], [V:51][V51]. | Recall refunds Q10 and Grace Q11; results M59/M61; answer Q12. No order lookup. [Q:10][Q10], [Q:11][Q11], [M:61][M61], [Q:12][Q12]. |
| g04 ticket to Priya [V:2050][V2050], [R:4][R4] | P | F/P | F | ESC-2219 is correct. Prior acknowledgment supports Priya having been copied, so that state is not invented; it does not prove sending her the corrected number in this goal. [V:312][V312], [V:355][V355]. | Recall escalations Q14; result M65; final to shift lead Q15. No fresh lookup and no transmission to Priya. [Q:14][Q14], [M:65][M65], [Q:15][Q15]. |
| g05 authorization note [V:2070][V2070], [R:5][R5] | P | F | F | Correct $289 full refund and operative code MX-4486; old code and fee are explicitly retired. Card and email are grounded in the earlier account result. Drafting the authorization is the requested work; no refund execution is required. [V:51][V51], [V:384][V384], [V:574][V574], [M:55][M55]. | Recalls refunds/customer/order Q17–19; M73 closes recall; final Q20. No fresh order lookup. [Q:17][Q17], [Q:19][Q19], [M:73][M73], [Q:20][Q20]. |
| g06 shipping [V:2098][V2098], [R:6][R6] | F | P | F | Correct shipped status and tracking, but customer draft includes estimated arrival October 12th against the no-written-delivery-date rubric. Home-address assertion is also absent from the order result. Raw result retained; excluded from adjusted totals solely by the brief's protocol instruction. [V:97][V97], [V:1934][V1934]. | `lookup_order(LH-81660)` Q22, result M77, final Q23. [Q:22][Q22], [M:77][M77], [Q:23][Q23]. |
| g07 depot release [V:2137][V2137], [R:7][R7] | P | F | F | Correct Tomasz, request today (2026-10-08), and FL-660412. Awkward phrase “currently off tomorrow” does not change the correct deadline. [V:121][V121], [V:470][V470]. | Q25 answers directly; no goal-local lookup. [Q:25][Q25], [M:79][M79]. |
| g08 credit [V:2165][V2165], [R:8][R8] | P | P | P | $5,000 limit less $1,240 outstanding leaves $3,760, sufficient for $3,000. Ines Albrecht and switchboard match the returned account. [V:1941][V1941]. | `lookup_customer(LH-31055)` Q27, result M83, final Q28. [Q:27][Q27], [M:83][M83], [Q:28][Q28]. |
| g09 gift note [V:2224][V2224], [R:9][R9] | P | F | F | Exact wording “Happy 40th, Aiko” recovered. [V:152][V152]. | Recall Kenji Q30, result M87, answer Q31; history requirement satisfied through recall, but the explicitly required order lookup is absent. [Q:30][Q30], [M:87][M87], [Q:31][Q31]. |
| g10 callback [V:2247][V2247], [R:10][R10] | F | F/P | F | Correct after 2 pm, but supplies the main switchboard 555-0142 and omits required direct extension 4127, despite recall returning it. [V:325][V325], [V:1941][V1941]. | Recall contacts Q33, result M91, answer Q34. Explicit history requirement met; broader lookup rule not met. [Q:33][Q33], [M:91][M91], [Q:34][Q34]. |
| g11 Friday sign-off [V:2278][V2278], [R:11][R11] | P | F/P | F | The complete reply explicitly says Ruth Adeyemi gives approval on Marcus's behalf, correct on 2026-10-09. Opening “needs Marcus's sign-off today” is imprecise, but the next sentence specifies the authorized substitute rather than demanding Marcus separately. No dispatch is requested; end-of-day condition need not be repeated. [V:255][V255], [V:689][V689], [V:1006][V1006], [V:1135][V1135]. | Recall Grace Q36, result M137, final Q37. Ruth's cover/date are also in Q37's system prompt. No fresh lookup. [Q:36][Q36], [M:137][M137], [Q:37][Q37]. |
| g12 goodwill [V:2301][V2301], [R:12][R12] | P | F/P | F | Free freight on next order is correct. $50 store credit is explicitly described as replaced, not offered. [V:1222][V1222]. | Recall Copperline Q39, result M147, final Q40. No lookup. [Q:39][Q39], [M:147][M147], [Q:40][Q40]. |
| g13 redirect address [V:2324][V2324], [R:13][R13] | P | F/P | F | Gives corrected street address 91 Quarry Lane and keeps other terms. The request asks for street address; omitting town Ashby is not a material rubric failure. No redirect execution was requested. [V:1280][V1280], [V:1339][V1339]. | Direct answer Q42; corrected address is in its prompt. No lookup. [Q:42][Q42]. |
| g14 remedy note [V:2347][V2347], [R:14][R14] | F | F/P | F | Correct exchange, sage rug, and PW-7042-1185. Nevertheless it instructs another immediate warehouse release after saying the rug already shipped, and assigns it to Tomasz on his day off. It turns an instruction to chase Parcelway into the unsupported assertion “Chase Parcelway is tracking the item daily.” These additions materially damage the internal work note. [V:121][V121], [V:1397][V1397], [V:1425][V1425]. | Recall refunds Q44 then repeat Q45, M171 says give final; Q46 produces the complete note. No lookup. No missing reply is inferred from the row's `via: answered`. [Q:44][Q44], [Q:45][Q45], [M:171][M171], [Q:46][Q46]. |
| g15 refund follow-up [V:2374][V2374], [R:15][R15] | F | F | F | Correct $289, card 7719, and October 21, 2026; ordinary date wording is accepted. User request itself supplies the premise that the refund was made, so that premise is not an invented action. The draft adds unsupported 3–5 business days, immediate-on-receipt refund policy, a competing 3-day escalation interval, and unfinished “[insert date]”. [V:549][V549], [V:574][V574], [V:2376][V2376], [M:55][M55]. | Recall Luis Q48, result M181, final Q49. Recalled account text is not required `lookup_customer`. [Q:48][Q48], [M:181][M181], [Q:49][Q49]. |
| g16 walk-in return [V:2409][V2409], [R:16][R16] | A | P | A | Correct all-day closure and Monday instruction, but starts with incompatible present-tense “is open 9 am to 1 pm.” A reader may understand those as usual hours overridden by closure; another may take them as a conflicting current claim. Preserve ambiguity instead of granting an unconditional pass. [V:1450][V1450], [V:1552][V1552]. | Direct answer Q51; both old hours and closure in prompt. No lookup or recall needed for this generic desk question with facts visible. [Q:51][Q51]. |
| g17 morning phone list [V:2432][V2432], [R:17][R17] | F | F/P | F | Includes correct Dalia/555-0175, but adds obsolete Grace replacement work after cancellation, Owen's superseded 4301, expired Ruth cover, an after-2-pm Sigrid call in a morning list, and Tomasz “not today” based on the previous day's absence. It correctly omits the closed Halvorsen depot chase; that does not cure the other material stale work. Owen has not yet been replaced at this goal, so his later departure is not used here. [V:1161][V1161], [V:1195][V1195], [V:689][V689], [V:325][V325], [V:1534][V1534], [V:1578][V1578]. | Recall contacts Q53, result M199, final Q54. No lookup. [Q:53][Q53], [M:199][M199], [Q:54][Q54]. |
| g18 afternoon chase list [V:2455][V2455], [R:18][R18] | F | F/P | F | Omits the active Farah/Parcelway PW-7120-4466 chase. Reinstates delivered Halvorsen depot hold and delivered sage-rug chase. Tomasz “off tomorrow” is also stale on Saturday. Copperline's delivered chairs are correctly omitted. [V:1058][V1058], [V:1083][V1083], [V:1250][V1250], [V:1314][V1314], [V:1367][V1367], [V:1658][V1658]. | Recall warehouse Q56, result M208, final Q57; pinned prompt itself includes Beatriz's completed delivery. No lookup. [Q:56][Q56], [M:208][M208], [Q:57][Q57]. |
| g19 discount code [V:2484][V2484], [R:19][R19] | P | F/P | F | Correct WKND15, 15%, October 10–11; does not use expired LATE10. No discount issuance is requested. [V:621][V621], [V:1472][V1472], [V:1534][V1534]. | Recalls Farah Q59 and WKND15 Q60; results M213/M215; answer Q61. No lookup. [Q:59][Q59], [Q:60][Q60], [M:215][M215], [Q:61][Q61]. |
| g20 account manager [V:2509][V2509], [R:20][R20] | F | F/P | F | Gives obsolete Ines Albrecht and transfers Tobias's effective date to her. Correct manager is Tobias Lindqvist. Owen is still the stated buyer at this point; his name is not penalized using a later correction. [V:1732][V1732], [V:1755][V1755]. | Recall Copperline Q63 returns Tobias as well as obsolete Ines; final Q64 chooses Ines. No fresh account lookup. [Q:63][Q63], [M:223][M223], [Q:64][Q64]. |
| g21 buyer [V:2531][V2531], [R:21][R21] | F | F/P | F | Mentions Hana and correct email, but still names departed Owen as buyer and preferred for today's call, using twice-superseded 4301. Omits email-only constraint. [V:1195][V1195], [V:1755][V1755]. | Recall Copperline Q66, result M229 explicitly includes whole supersession; final Q67 contradicts it. No lookup. [Q:66][Q66], [M:229][M229], [Q:67][Q67]. |
| g22 second kettle [V:2557][V2557], [R:22][R22] | F | F/P | F | Correct exact gift wording and no promised arrival date. But the customer reply never answers the arrival question with the applicable limitation/unknown date, uses third-person “him,” and invents “arrived yesterday” for the damaged replacement. Sending today does not establish arrival timing. [V:97][V97], [V:152][V152], [V:1802][V1802]. | Recall Kenji Q69, result M237, final Q70. No lookup. [Q:69][Q69], [M:237][M237], [Q:70][Q70]. |
| g23 reopened duvet [V:2589][V2589], [R:23][R23] | F | F/P | F | Marcus, TR-3307, and PW-5521-9930 correct. Replacement reason omits someone else's twin set and falsely says trace is closed after explicit reopen. Does not penalize absence of Priya here: request asks for a replacement note, not expressly an escalation note. [V:217][V217], [V:255][V255], [V:715][V715], [V:1828][V1828]. | Recall Grace Q72 gives reopen; recall order Q73; recall Marcus Q74 closes; answer Q75. No live lookup. [Q:72][Q72], [M:243][M243], [Q:73][Q73], [M:247][M247], [Q:75][Q75]. |
| g24 pendant claim [V:2621][V2621], [R:24][R24] | F | F/P | F | Pro number correct, but claims depot hold while also saying delivered, omits cracked glass and October 16 claim deadline, and therefore fails the state/claim request. Prior copied-Priya acknowledgment exists; no fresh copy action is proven. [V:1058][V1058], [V:1880][V1880], [V:1897][V1897]. | Recall LH-80941 Q77 returns delivered state and deadline with obsolete hold text; final Q78 chooses obsolete hold. Reopen was not in returned recall; necessary damage fact was not recovered. No fresh lookup. [Q:77][Q77], [M:255][M255], [Q:78][Q78]. |

## Totals and ambiguity bounds

These totals cover this run only. g06 remains in the raw denominator and is removed in the adjusted denominator without imputing a corrected answer.

| Measure | Raw, 24 goals | Adjusted, 23 goals without g06 |
| --- | --- | --- |
| Semantic | 11 P / 12 F / 1 A | 11 P / 11 F / 1 A |
| Semantic pass bound from g16 | 11–12 / 24 | 11–12 / 23 |
| Tool compliance, system-wide lookup reading | 4 P / 20 F | 3 P / 20 F |
| Tool compliance, explicit per-goal list only | 18 P / 6 F | 17 P / 6 F |
| Complete work, system-wide lookup reading | 2 P / 21 F / 1 A | 2 P / 20 F / 1 A |
| Complete-work pass bound, system-wide reading | 2–3 / 24 | 2–3 / 23 |
| Complete work, narrower listed-tool reading | 6 P / 17 F / 1 A | 6 P / 16 F / 1 A |
| Complete-work pass bound, narrower reading | 6–7 / 24 | 6–7 / 23 |

The explicit fresh-lookup subset has 3 passes out of 9 raw obligations, or 2 out of 8 after removing g06. The only goal-local lookup calls are g02, g06, and g08. Calls seen in seed history or embedded in recall content do not increase those totals. All goals produce the protocol's final answer; g14's fallback still produces a final answer, rather than a missing or incomplete arm.

The complete-work difference between tool interpretations is confined to semantically passing g11, g12, g13, and g19. g04 stays incomplete because sending the number to Priya is unproven. If the campaign defines g04's “send Priya” as merely composing content for the shift lead under the final-answer protocol, its narrower complete-work total increases by 1, to 7 P / 16 F / 1 A raw and 7 P / 15 F / 1 A adjusted. Its system-wide complete result still fails the lookup requirement. No external delivery is claimed under either convention.

The g16 ambiguity changes semantic and complete-work totals by at most 1; it never changes tool compliance. g11 is not counted ambiguous because its second sentence states who actually gives the approval. g13 is not failed for omitting the town from a request for a street address. g15 is not failed for writing October 21 rather than an ISO date, nor for adopting the user's stated refund premise. These distinctions prevent optional details and mechanical substring behavior from replacing semantic judgment.

## Recurrent failures and trace limits

Stale facts remain operative in replies even when correct replacements are in the returned evidence. The decisive examples are g20's manager, g21's buyer, g23's reopened trace, and g24's delivered order and claim deadline. g18 also has the rug's successful delivery in its pinned prompt yet requests another chase. Those are observed answer failures; this audit does not infer an internal model or memory cause from them.

Correct core facts coexist with material unsupported work in g14 and g15. A semantic audit that checks only exchange/tracking or amount/card/date misses the duplicated warehouse-release instruction and invented customer-facing refund policy. g22 preserves the gift phrase and avoids a forbidden date while leaving the user's arrival question unanswered. g17 avoids the specifically forbidden depot call but adds unrelated or stale morning tasks.

The request/turn census has one recorded estimate without a sent model call: g14 turn 30, followed by turn 31 with `scope: answer`. Q46 and M172–174 show the desk fallback and the full delivered answer; this is not a missing goal. See [turn 30](C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/turns.jsonl:30), [call sequence 46](C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/calls.jsonl:46), [M:172][M172], [M:174][M174]. No model rerun or source repair was needed for judgment.

## Artifact hashes

SHA256 values were read directly from bytes in this audit, not copied from stored quality scores.

| Artifact | SHA256 |
| --- | --- |
| `harness/bench/variants/long/v1.json` | `24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b` |
| `harness/bench/scenario-long.json` | `927d341819bd69923ab3f755ec24ff9483f1ae01fb939e9a83610eb6a1b855a7` |
| `results/l9/q2-think0/resource/manifest.json` | `81f29fd3494dc6d635abcac79e287e8403b2492fecbaf1dde53a0a5bb6a95338` |
| Accepted run `rows.jsonl` | `429420e964a6f6712a7946b988c490df5e62a019d935b8692fde1e77d8b49412` |
| Accepted run `turns.jsonl` | `9c3686a1621194683c4d0ef06a67b6d25aad37c1b0f604bbac08d13ff521b8dd` |
| Accepted run `requests.jsonl` | `ac538e4f74b220f611b1ebb61b042b9e8819e80885e787634ed71a8616860b8e` |
| Accepted run `calls.jsonl` | `5f99439753c09acf6c76c481b2dd2e22a2dc74b881c16bd06010a0a8ee3dd066` |
| Accepted run `run.json` | `5486223c89ec7e273048b50bf5a6955d23ca61489189a6fbb700096eb7743179` |
| Accepted run `selections.jsonl` | `923694ef253728599b28e5b238920a037175d10a33b7ad375382d8edc5db651f` |
| Accepted run `messages.jsonl` | `02b76bb52329c1a36ce073ddbd07f62750bbfdc81741b42fbb157c19e842d608` |

Artifact prefixes in the hash table are under `.orkestrel/agent/instruments/`. The accepted-run directory is `results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/` under that prefix.

[V5]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:5
[Q4]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:4
[V1967]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1967
[R1]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:1
[V549]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:549
[V574]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:574
[Q5]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:5
[M51]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:51
[V1994]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1994
[R2]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:2
[V1942]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1942
[Q7]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:7
[M55]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:55
[Q8]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:8
[V2019]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2019
[R3]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:3
[V217]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:217
[V255]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:255
[V267]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:267
[V51]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:51
[Q10]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:10
[Q11]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:11
[M61]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:61
[Q12]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:12
[V2050]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2050
[R4]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:4
[V312]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:312
[V355]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:355
[Q14]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:14
[M65]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:65
[Q15]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:15
[V2070]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2070
[R5]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:5
[V384]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:384
[Q17]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:17
[Q19]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:19
[M73]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:73
[Q20]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:20
[V2098]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2098
[R6]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:6
[V97]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:97
[V1934]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1934
[Q22]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:22
[M77]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:77
[Q23]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:23
[V2137]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2137
[R7]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:7
[V121]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:121
[V470]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:470
[Q25]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:25
[M79]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:79
[V2165]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2165
[R8]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:8
[V1941]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1941
[Q27]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:27
[M83]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:83
[Q28]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:28
[V2224]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2224
[R9]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:9
[V152]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:152
[Q30]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:30
[M87]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:87
[Q31]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:31
[V2247]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2247
[R10]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:10
[V325]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:325
[Q33]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:33
[M91]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:91
[Q34]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:34
[V2278]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2278
[R11]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:11
[V689]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:689
[V1006]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1006
[V1135]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1135
[Q36]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:36
[M137]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:137
[Q37]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:37
[V2301]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2301
[R12]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:12
[V1222]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1222
[Q39]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:39
[M147]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:147
[Q40]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:40
[V2324]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2324
[R13]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:13
[V1280]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1280
[V1339]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1339
[Q42]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:42
[V2347]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2347
[R14]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:14
[V1397]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1397
[V1425]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1425
[Q44]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:44
[Q45]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:45
[M171]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:171
[Q46]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:46
[V2374]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2374
[R15]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:15
[V2376]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2376
[Q48]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:48
[M181]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:181
[Q49]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:49
[V2409]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2409
[R16]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:16
[V1450]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1450
[V1552]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1552
[Q51]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:51
[V2432]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2432
[R17]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:17
[V1161]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1161
[V1195]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1195
[V1534]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1534
[V1578]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1578
[Q53]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:53
[M199]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:199
[Q54]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:54
[V2455]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2455
[R18]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:18
[V1058]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1058
[V1083]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1083
[V1250]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1250
[V1314]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1314
[V1367]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1367
[V1658]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1658
[Q56]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:56
[M208]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:208
[Q57]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:57
[V2484]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2484
[R19]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:19
[V621]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:621
[V1472]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1472
[Q59]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:59
[Q60]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:60
[M215]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:215
[Q61]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:61
[V2509]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2509
[R20]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:20
[V1732]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1732
[V1755]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1755
[Q63]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:63
[M223]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:223
[Q64]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:64
[V2531]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2531
[R21]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:21
[Q66]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:66
[M229]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:229
[Q67]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:67
[V2557]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2557
[R22]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:22
[V1802]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1802
[Q69]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:69
[M237]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:237
[Q70]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:70
[V2589]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2589
[R23]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:23
[V715]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:715
[V1828]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1828
[Q72]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:72
[M243]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:243
[Q73]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:73
[M247]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:247
[Q75]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:75
[V2621]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2621
[R24]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/rows.jsonl:24
[V1880]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1880
[V1897]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1897
[Q77]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:77
[M255]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:255
[Q78]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/requests.jsonl:78
[M172]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:172
[M174]: C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1/messages.jsonl:174
