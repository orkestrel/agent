# L13 sealed quality join

Validated 72 unique judgments against packet, authored scenario goals, private retained identities, and run rows. Verdicts and reasons are copied unchanged.

## Totals

```json
{
  "armCounts": {
    "aggregate": {
      "semantic": {
        "pass": 10,
        "fail": 13,
        "ambiguous": 1,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 5,
        "fail": 19,
        "ambiguous": 0,
        "unattempted": 0
      },
      "listedTool": {
        "pass": 19,
        "fail": 5,
        "ambiguous": 0,
        "unattempted": 0
      },
      "completeWork": {
        "pass": 4,
        "fail": 19,
        "ambiguous": 1,
        "unattempted": 0
      }
    },
    "full": {
      "semantic": {
        "pass": 7,
        "fail": 16,
        "ambiguous": 0,
        "unattempted": 1
      },
      "systemTool": {
        "pass": 7,
        "fail": 17,
        "ambiguous": 0,
        "unattempted": 0
      },
      "listedTool": {
        "pass": 20,
        "fail": 4,
        "ambiguous": 0,
        "unattempted": 0
      },
      "completeWork": {
        "pass": 4,
        "fail": 20,
        "ambiguous": 0,
        "unattempted": 0
      }
    },
    "records": {
      "semantic": {
        "pass": 12,
        "fail": 11,
        "ambiguous": 1,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 4,
        "fail": 20,
        "ambiguous": 0,
        "unattempted": 0
      },
      "listedTool": {
        "pass": 18,
        "fail": 6,
        "ambiguous": 0,
        "unattempted": 0
      },
      "completeWork": {
        "pass": 3,
        "fail": 20,
        "ambiguous": 1,
        "unattempted": 0
      }
    }
  },
  "adjustedArmCounts": {
    "aggregate": {
      "semantic": {
        "pass": 10,
        "fail": 13,
        "ambiguous": 0,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 4,
        "fail": 19,
        "ambiguous": 0,
        "unattempted": 0
      },
      "listedTool": {
        "pass": 18,
        "fail": 5,
        "ambiguous": 0,
        "unattempted": 0
      },
      "completeWork": {
        "pass": 4,
        "fail": 19,
        "ambiguous": 0,
        "unattempted": 0
      }
    },
    "full": {
      "semantic": {
        "pass": 7,
        "fail": 15,
        "ambiguous": 0,
        "unattempted": 1
      },
      "systemTool": {
        "pass": 6,
        "fail": 17,
        "ambiguous": 0,
        "unattempted": 0
      },
      "listedTool": {
        "pass": 19,
        "fail": 4,
        "ambiguous": 0,
        "unattempted": 0
      },
      "completeWork": {
        "pass": 4,
        "fail": 19,
        "ambiguous": 0,
        "unattempted": 0
      }
    },
    "records": {
      "semantic": {
        "pass": 12,
        "fail": 11,
        "ambiguous": 0,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 3,
        "fail": 20,
        "ambiguous": 0,
        "unattempted": 0
      },
      "listedTool": {
        "pass": 17,
        "fail": 6,
        "ambiguous": 0,
        "unattempted": 0
      },
      "completeWork": {
        "pass": 3,
        "fail": 20,
        "ambiguous": 0,
        "unattempted": 0
      }
    }
  }
}
```

## Per-goal judgments

| Arm | Goal | Status | Automatic pattern match | Semantic | System-tool | Listed-tool | Complete-work | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aggregate | g05-luis-approval-note | served | true | pass | fail | fail | fail | The note authorizes the full $289 refund with MX-4486 and withdraws the fee. Its extra Priya-copy wording is draft content, not proof of delivery. Only recall ran; neither recalled order nor card data is a fresh lookup. |
| full | g16-walk-in-return | served | true | pass | pass | pass | pass | The answer refuses Saturday walk-in returns and directs the caller to Monday. This general counter-policy question requires no order or account lookup. |
| records | g15-luis-returns | served | false | fail | fail | fail | fail | The amount, Mastercard 7719, and October 21 return deadline are correct, but the draft invents a 3–5-business-day refund timeline and immediate-on-receipt processing policy and leaves an initiation-date placeholder. Recall does not satisfy the required fresh customer lookup. |
| aggregate | g18-chase-list | served | false | fail | fail | pass | fail | Lists the already delivered Halvorsen lights and Beatriz rug for chasing and omits the active Farah redirect, PW-7120-4466. The Thursday release deadline is also stale on Saturday. Only warehouse recall ran; no relevant fresh lookup. |
| records | g20-copperline-manager | served | false | fail | fail | pass | fail | Names Ines Albrecht as current manager although the eligible account update and its own recall result name Tobias Lindqvist. Owen remains eligible at this boundary; the later buyer change is not used. No fresh account lookup. |
| full | g24-halvorsen-claim | served | false | fail | fail | pass | fail | Claims a depot hold and an obligatory $1,240 lateness refund. The lights were delivered and two have cracked glass; no refund decision was authorized. The pro number and claim deadline alone are correct. No fresh lookup. |
| full | g01-luis-refund-amount | served | true | pass | pass | pass | pass | Correctly gives the full $289 refund after fee withdrawal, backed by a goal-local LH-79215 order lookup. |
| aggregate | g02-luis-card | served | true | pass | pass | pass | pass | Identifies Mastercard ending 7719 from a goal-local LH-44870 customer lookup; does not claim an executed refund. |
| records | g06-kenji-shipping | served | false | ambiguous | pass | pass | ambiguous | Correct shipped status and PW-6013-2280 with a fresh order lookup. The customer draft gives October 12 as an estimate: a literal reading of 'never promise' permits a clearly qualified estimate, whereas the conversational acknowledgment says no delivery dates in customer replies. Under that stricter reading this fails; under the literal promise-only reading its core draft passes. |
| aggregate | g23-grace-reopened | served | false | fail | fail | pass | fail | Says TR-3307 is closed and omits the reopened reason: the collected parcel was someone else's twin set. Marcus, trace ID, and carrier tracking are correct. Recall is not a fresh lookup. |
| full | g21-copperline-buyer | served | true | pass | fail | pass | fail | Correctly identifies Hana Ikeda and her email. Giving only that email route fulfills reachability without inventing a phone option. No fresh Copperline account/order lookup. |
| aggregate | g08-halvorsen-credit | served | true | pass | pass | pass | pass | Correctly approves the $3,000 reorder against $3,760 available credit and identifies Ines Albrecht, using a fresh LH-31055 account lookup. An explicit subtraction is optional. |
| records | g05-luis-approval-note | served | true | pass | fail | fail | fail | The draft gives $289 in full, no restocking deduction, and MX-4486; mentioning retired MX-4471 only to reject it is correct. It performs recall calls but no required fresh LH-79215 order lookup. |
| full | g09-kenji-gift-note | served | false | fail | fail | fail | fail | Does not provide 'Happy 40th, Aiko' and unnecessarily defers to asking Kenji. The fresh order lookup cannot supply the wording; the only recall is about unrelated refunds, so the required relevant history retrieval is not fulfilled. |
| aggregate | g24-halvorsen-claim | served | false | fail | fail | pass | fail | Correctly reports delivery, pro number, and claim deadline but falsely says the pendants are in good condition; two have cracked glass. Recalling the old order result is not a fresh lookup. |
| full | g02-luis-card | served | true | pass | pass | pass | pass | Correct Mastercard ending 7719 from a fresh LH-44870 account lookup. |
| aggregate | g15-luis-returns | served | false | fail | fail | fail | fail | Correct refund amount, card, and return deadline are undermined by an invented 3–5-business-day timeline, unsupported immediate-on-receipt processing policy, and an unresolved initiation-date placeholder. Only recall ran, not the listed customer lookup. |
| records | g01-luis-refund-amount | served | true | pass | fail | fail | fail | Correctly gives $289 with no restocking fee. The LH-79215 result appears inside recall only; no fresh lookup_order action occurred. |
| records | g12-copperline-gesture | served | false | pass | fail | pass | fail | Correctly gives free freight on the next order and explains the replaced $50-credit preference. Only recall ran; the account-specific request still requires a fresh lookup. |
| full | g17-phone-list | served | false | fail | fail | pass | fail | Omits the required Dalia callback, revives the closed Halvorsen daily call, misassigns Freightline's 555-0188 to Tomasz, and invents other call obligations. No fresh lookup. |
| records | g18-chase-list | served | false | fail | fail | pass | fail | Revives the closed Halvorsen depot hold and completed Beatriz chase while omitting Farah's active PW-7120-4466 chase. The release-today/off-tomorrow instruction is obsolete by Saturday. Recall is not a fresh lookup. |
| records | g17-phone-list | served | true | fail | fail | pass | fail | Includes Dalia's correct 555-0175 but adds stale Grace replacement work after closure, superseded Owen extension 4301, expired Ruth cover, and an after-2-pm Sigrid call to a morning list. No fresh customer/order lookup. |
| aggregate | g11-grace-signoff-today | served | false | fail | fail | pass | fail | Requires waiting for Marcus instead of naming Ruth Adeyemi, who covers his sign-offs on Friday October 9. The trace is already open. Only recall ran. |
| records | g11-grace-signoff-today | served | true | pass | fail | pass | fail | Names Ruth Adeyemi as the person giving Marcus's sign-off during his Friday absence. The opening Marcus reference is qualified by that delegation, not a demand to wait for him. Only recall ran; no fresh lookup. |
| full | g23-grace-reopened | served | false | fail | fail | pass | fail | Recognizes the twin parcel and Marcus sign-off but omits requested PW-5521-9930 and adds an unsupported condition that the correct item must first be found before sending a replacement. TR-3307 has already been reopened. No fresh lookup. |
| aggregate | g09-kenji-gift-note | served | true | pass | fail | fail | fail | Gives the exact gift wording and retrieves it through relevant recall. The explicitly listed fresh LH-81660 order lookup is absent. |
| full | g15-luis-returns | served | false | fail | fail | fail | fail | The amount, card, and October 21 deadline are correct, but says the refund 'appears' on the card, contradicting the user's report that it has not appeared. No fresh customer lookup. |
| full | g14-beatriz-remedy | served | true | fail | fail | pass | fail | Correctly sets a sage exchange and PW-7042-1185, but tells the desk to stop chasing at the delivery depot instead of when the rug reaches the customer. It also calls the tracking identifier an order. No fresh lookup. |
| aggregate | g16-walk-in-return | served | false | pass | pass | pass | pass | Despite the awkward present-tense opening about 9–1 hours, the explicit 'but ... closed it all day' clause corrects that schedule and unambiguously directs returns to Monday. No account/order is involved. |
| aggregate | g17-phone-list | served | true | fail | fail | pass | fail | Dalia's number is correct, but the list adds closed Grace replacement work, obsolete Owen extension 4301, expired Ruth cover, and Sigrid's afternoon-only callback to a morning list. Only recall ran. |
| records | g09-kenji-gift-note | served | true | pass | fail | fail | fail | Gives 'Happy 40th, Aiko' from a relevant recall, but omits the explicitly required fresh order lookup. |
| records | g02-luis-card | served | true | pass | pass | pass | pass | Correctly identifies Mastercard 7719 with a fresh customer lookup. |
| aggregate | g21-copperline-buyer | served | false | fail | fail | pass | fail | Acknowledges Hana but still directs today's call to departed Owen on the obsolete 4301 extension, contradicting both corrections and the email-only replacement. Only recall ran. |
| records | g03-grace-escalation | served | true | fail | fail | fail | fail | Gets Marcus, Priya, and the tracking number but falsely puts Grace's delivered-to-locker parcel at a carrier depot awaiting warehouse release and applies a refund approval code to this replacement. No fresh order lookup. |
| full | g18-chase-list | served | false | fail | fail | pass | fail | Correctly retains Farah's PW-7120-4466 chase but wrongly keeps Copperline FL-661978 active after all chairs arrived. No fresh lookup for the shipment list. |
| aggregate | g19-farah-code | served | true | fail | fail | pass | fail | Names WKND15 but denies Farah eligibility because the curtains have not arrived and conditions the discount on her next order itself running late. The current delay qualifies her for 15% off the next order. Only recall ran. |
| aggregate | g14-beatriz-remedy | served | true | fail | fail | pass | fail | Gives the correct sage exchange and tracking number but labels the correct rug already delivered although it has only been sent and still needs chasing at this boundary. Recall does not satisfy the fresh lookup. |
| records | g14-beatriz-remedy | served | true | fail | fail | pass | fail | Correct exchange and tracking details are followed by an unsupported instruction to have Tomasz release the already-dispatched rug immediately; Tomasz is off that Friday. The carrier-chasing duty is also recast as carrier action. No fresh lookup. |
| full | g20-copperline-manager | served | true | fail | fail | pass | fail | Tobias Lindqvist is correct, but 555-0142 belongs to the Halvorsen account, not Copperline; the asserted contact route is unsupported. No fresh account lookup. |
| full | g04-halvorsen-ticket | served | true | fail | fail | pass | fail | Correct ESC-2219 is accompanied by an unsupported requirement for refund approval code MX-4486 on this late-delivery ticket. Priya's historical copy does not prove this requested message was delivered. Only recall ran; no fresh lookup. |
| aggregate | g13-farah-address | served | true | pass | fail | pass | fail | Corrects the street to 91 Quarry Lane and explicitly retains the unchanged remainder, which includes Ashby. That resolves the requested street-address correction without asserting the old 19. No fresh lookup. |
| records | g21-copperline-buyer | served | false | fail | fail | pass | fail | Despite naming Hana and her email, still instructs a call to departed Owen at obsolete extension 4301. Only recall ran; no fresh lookup. |
| aggregate | g06-kenji-shipping | served | false | ambiguous | pass | pass | ambiguous | Provides shipped status and PW-6013-2280 after a fresh lookup, but includes an October 12 customer-facing estimate. Literal 'never promise' versus the acknowledgment's blanket no-dates wording supports pass versus fail readings. It does not claim the gift wording was actually added. |
| full | g19-farah-code | served | false | fail | fail | pass | fail | Denies either code applies to Farah, although WKND15 explicitly covers late orders on October 10–11 and her curtains remain late. Listing the valid code does not cure the denial. No fresh lookup. |
| records | g08-halvorsen-credit | served | true | pass | pass | pass | pass | Correctly concludes the $3,000 reorder fits the $3,760 available credit, identifies Ines Albrecht, and uses the fresh account result's Halvorsen switchboard. |
| aggregate | g01-luis-refund-amount | served | true | pass | fail | fail | fail | Correct $289 full refund and withdrawn fee, but only a recalled order result, not a goal-local lookup_order call. |
| records | g19-farah-code | served | true | pass | fail | pass | fail | Correctly offers WKND15, 15% off the next order, during October 10–11. Relevant recalls provide context but no fresh Farah account/order lookup occurs. |
| records | g07-depot-release | served | true | pass | fail | fail | fail | Correct Tomasz Brennan, today/Thursday deadline before Friday absence, and FL-660412. No action occurred, so the required fresh order lookup is missing. |
| records | g10-sigrid-callback | served | false | fail | fail | pass | fail | Gives the Halvorsen main switchboard rather than Sigrid's direct extension 4127, despite receiving the extension in recall. The after-2-pm window is correct. No fresh account/order lookup. |
| aggregate | g22-kenji-returns | served | true | fail | fail | pass | fail | Correct gift wording and replacement-dispatch information, but the purported reply repeats an internal third-person note and never answers Kenji's arrival question or explains that no delivery date can be promised. No fresh lookup. |
| full | g07-depot-release | served | false | fail | pass | pass | fail | Fresh order lookup and FL-660412 are correct, but the answer omits the requested named owner Tomasz and the required today deadline. Generic 'warehouse team' does not answer who and by when. |
| aggregate | g20-copperline-manager | served | false | fail | fail | pass | fail | Names Ines as current account manager despite the eligible update and own recall naming Tobias Lindqvist. Owen's later departure is outside this boundary and is not a reason for failure. No fresh lookup. |
| records | g16-walk-in-return | served | false | pass | pass | pass | pass | The 'but ... closed it all day' clause explicitly overrides the mentioned 9–1 schedule and correctly instructs waiting until Monday. No account/order lookup is required. |
| full | g03-grace-escalation | served | false | fail | fail | fail | fail | Assigns Grace the obsolete Halvorsen ticket ESC-2291 and asserts her parcel is still held, while the evidence only marks it delivered to the locker. Marcus, Priya, and tracking are right, but no fresh order lookup occurred. |
| full | g06-kenji-shipping | served | false | fail | pass | pass | fail | The customer draft's subject says the kettle has arrived while its body and fresh lookup say shipped/in transit. That unsupported arrival claim is material even though no arrival estimate is written. |
| full | g05-luis-approval-note | failed | false | unattempted | fail | fail | fail | Operational status is failed with an empty final reply: there is no semantic answer to assess and no completed note. A refunds recall recovered the approval code and fee withdrawal, but no fresh order lookup or final answer followed. |
| records | g24-halvorsen-claim | served | false | fail | fail | pass | fail | Contradictorily says delivered and still depot-held, omits the cracked-glass reason and requested October 16 claim deadline, and supplies only the pro number correctly. Recalled order data is not a fresh lookup. |
| full | g12-copperline-gesture | served | false | fail | fail | pass | fail | Reverses the manager's correction: $50 credit was replaced by free freight on the next order, not the reverse. No fresh lookup. |
| records | g23-grace-reopened | served | false | fail | fail | pass | fail | Wrongly calls TR-3307 closed and omits the twin-set/addressed-to-someone-else reason for reopening. Marcus, trace reference, and tracking are correct. Only recall ran. |
| aggregate | g07-depot-release | served | true | pass | pass | pass | pass | Correct Tomasz, today before Friday absence, and FL-660412. After a failed spelling recall, relevant contacts recall and a fresh LH-80941 order lookup provide the required evidence. |
| records | g04-halvorsen-ticket | served | true | pass | fail | pass | fail | Correct ESC-2219. 'I've copied Priya' can restate the seeded historical copy, but does not prove fresh delivery of this request; a ticket-only draft interpretation is satisfied. A literal send-to-Priya action is not represented by this final-to-shift-lead protocol. No fresh lookup, so complete work fails under either interpretation. |
| aggregate | g12-copperline-gesture | served | false | pass | fail | pass | fail | Correctly states free freight on the next order and explains that it replaces $50 credit. Only recall ran; no fresh customer/order lookup. |
| full | g10-sigrid-callback | served | true | pass | fail | pass | fail | Gives direct extension 4127 and explicitly says Sigrid only takes calls after 2 pm. The odd 'voicemail is at 2 pm' phrasing does not alter that usable callback instruction. Relevant recall fulfills the listed retrieval; no fresh lookup fulfills the system rule. |
| records | g22-kenji-returns | served | true | fail | fail | pass | fail | Correct card wording, but gives a third-person internal note instead of a reply answering arrival timing, and invents that the dented kettle arrived yesterday. No fresh lookup. |
| aggregate | g03-grace-escalation | served | true | pass | fail | fail | fail | The draft correctly states the delivered-to-locker dispute, opened trace, Marcus sign-off, Priya copy, and PW-5521-9930. Conditional warehouse context and the withdrawn-fee aside do not change that answer. Only recall ran; the explicit fresh order lookup is absent. |
| records | g13-farah-address | served | true | pass | fail | pass | fail | Correct 91 Quarry Lane with the unchanged remainder retained; mentioning 19 only to correct it is valid. No fresh Farah lookup. |
| full | g11-grace-signoff-today | served | false | fail | pass | pass | fail | Fresh lookup fulfills the action rule, but Marcus is the wrong approver on Friday October 9; Ruth Adeyemi covers his sign-offs that day. |
| aggregate | g10-sigrid-callback | served | false | fail | fail | pass | fail | Omits direct extension 4127 and substitutes main switchboard 555-0142. Also misdates this Thursday-boundary request as Friday October 9. Relevant recall does not replace a fresh lookup. |
| aggregate | g04-halvorsen-ticket | served | true | fail | fail | pass | fail | Correct ESC-2219, but invents an added 'required note from the refunds team' and offers future copying without proof of delivery. The protocol reaches only the shift lead; even a draft-only reading retains the unsupported added-note claim. No fresh lookup. |
| full | g13-farah-address | served | true | pass | fail | pass | fail | Gives the corrected full destination 91 Quarry Lane, Ashby. No fresh Farah account/order lookup. |
| full | g08-halvorsen-credit | served | true | pass | pass | pass | pass | Correctly determines $3,000 fits $3,760 available credit, names Ines, and uses Halvorsen's switchboard from a fresh account lookup. |
| full | g22-kenji-returns | served | true | fail | fail | pass | fail | Correct gift wording, but presents the first replacement's PW-6013-2280 as the second kettle's tracking and says it has shipped when the eligible update only says the warehouse is sending another today. It leaves the arrival question unanswered. No fresh lookup. |
