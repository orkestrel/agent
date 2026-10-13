# L14 alias b sealed quality join

Validated 72 unique judgments against packet, authored scenario goals, private retained identities, and run rows. Verdicts and reasons are copied unchanged.

## Totals

```json
{
  "armCounts": {
    "records": {
      "semantic": {
        "pass": 17,
        "fail": 6,
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
        "fail": 21,
        "ambiguous": 0,
        "unattempted": 0
      }
    },
    "aggregate": {
      "semantic": {
        "pass": 13,
        "fail": 9,
        "ambiguous": 2,
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
        "fail": 21,
        "ambiguous": 0,
        "unattempted": 0
      }
    },
    "full": {
      "semantic": {
        "pass": 16,
        "fail": 5,
        "ambiguous": 1,
        "unattempted": 2
      },
      "systemTool": {
        "pass": 5,
        "fail": 18,
        "ambiguous": 0,
        "unattempted": 1
      },
      "listedTool": {
        "pass": 15,
        "fail": 8,
        "ambiguous": 0,
        "unattempted": 1
      },
      "completeWork": {
        "pass": 3,
        "fail": 21,
        "ambiguous": 0,
        "unattempted": 0
      }
    }
  },
  "adjustedArmCounts": {
    "records": {
      "semantic": {
        "pass": 17,
        "fail": 5,
        "ambiguous": 1,
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
    },
    "aggregate": {
      "semantic": {
        "pass": 13,
        "fail": 8,
        "ambiguous": 2,
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
    },
    "full": {
      "semantic": {
        "pass": 16,
        "fail": 4,
        "ambiguous": 1,
        "unattempted": 2
      },
      "systemTool": {
        "pass": 4,
        "fail": 18,
        "ambiguous": 0,
        "unattempted": 1
      },
      "listedTool": {
        "pass": 14,
        "fail": 8,
        "ambiguous": 0,
        "unattempted": 1
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
| records | g10-sigrid-callback | served | true | pass | fail | pass | fail | Correct direct extension 4127 and after-2-pm window. Recall satisfies the listed history tool, but no fresh LH-80941/LH-31055 lookup occurred. |
| aggregate | g01-luis-refund-amount | served | true | pass | fail | fail | fail | Correct full $289 refund under the withdrawn fee. Recall of an old lookup is not a fresh lookup_order, so both lookup obligations fail. |
| records | g06-kenji-shipping | served | false | fail | pass | pass | fail | Fresh LH-81660 lookup occurred, but the customer reply gives the prohibited October 12 delivery estimate, calls October 7 'today' on October 8, and promises to add a gift note without an available write action. |
| records | g16-walk-in-return | served | true | pass | pass | pass | pass | Correctly refuses Saturday walk-in returns because of floor work and directs them to Monday. This generic counter-policy question carries no order/account lookup obligation. |
| records | g23-grace-reopened | served | false | fail | fail | pass | fail | Twin parcel, TR-3307, and original tracking are correct, but Ruth's Friday cover expired; Marcus signs on Saturday. Only recall occurred, with no fresh Grace lookup. |
| aggregate | g18-chase-list | served | false | fail | fail | pass | fail | Lists completed Copperline and Beatriz shipments as active, omits Farah PW-7120-4466, and speculates that Dalia is in transit despite the warehouse result. No fresh order/account lookup occurred. |
| records | g01-luis-refund-amount | served | true | pass | fail | fail | fail | Correct $289 full refund and expressly withdraws the old fee. Only recall occurred; a recalled order result does not satisfy fresh lookup_order. |
| full | g10-sigrid-callback | served | true | pass | fail | fail | fail | Correct direct extension 4127 and after-2-pm window. No actions occurred: missing both system fresh lookup and listed recall. |
| full | g01-luis-refund-amount | served | true | pass | pass | fail | fail | Correct full $289 refund and card. Fresh lookup_customer LH-44870 satisfies the system's order-or-account alternative, but the explicit lookup_order requirement is missing. |
| aggregate | g05-luis-approval-note | served | true | pass | fail | fail | fail | Draft correctly states $289, no fee, the over-$200 rule, and current MX-4486 while rejecting MX-4471. Only recall occurred; required fresh lookup_order is absent. |
| aggregate | g06-kenji-shipping | served | false | fail | pass | pass | fail | Fresh order check and shipping/tracking facts are correct, but this is an internal summary rather than the requested sendable customer reply. It includes October 12 and infers missing gift-note inclusion from an absent record. |
| full | g18-chase-list | served | false | fail | fail | pass | fail | Incorrectly lists Beatriz and Copperline as still in transit after their deliveries and omits Farah's active PW-7120-4466 chase. No fresh lookup occurred. |
| aggregate | g21-copperline-buyer | served | true | pass | fail | pass | fail | Correct Hana Ikeda, email-only contact, and exact email; Owen is named only as departed. No fresh Copperline account/order lookup occurred. |
| aggregate | g04-halvorsen-ticket | served | true | pass | fail | pass | fail | Correct ticket ESC-2219. Only recall occurred, so the system fresh lookup is missing. Final text reaches the shift lead; it does not prove delivery to Priya. Content passes as a draft-only bound. |
| records | g08-halvorsen-credit | served | false | pass | pass | pass | pass | Fresh account lookup supports $5,000 minus $1,240 = $3,760 available and Ines Albrecht. Stating that amount is available for the requested $3,000 order adequately conveys that it fits. |
| aggregate | g08-halvorsen-credit | served | false | pass | pass | pass | pass | Fresh account lookup supports $3,760 available and Ines Albrecht; availability for the requested $3,000 order conveys that the reorder fits. |
| aggregate | g19-farah-code | served | true | pass | fail | pass | fail | Correct WKND15, 15 percent, and October 10-11 validity. Only recall occurred; the request concerns Farah's known order/account and still requires a fresh lookup. |
| aggregate | g23-grace-reopened | served | false | fail | fail | pass | fail | Correct replacement cause, trace, and tracking, but incorrectly assigns Ruth's expired cover and calls Saturday October 10 Friday. No fresh Grace lookup occurred. |
| records | g13-farah-address | served | false | pass | fail | pass | fail | Correct 91 Quarry Lane, Ashby; the awkward sentence about 19 still explicitly rejects 19 rather than asserting it as current. No fresh Farah lookup occurred. |
| full | g11-grace-signoff-today | served | true | pass | fail | pass | fail | Correctly assigns Ruth Adeyemi during Friday cover. No fresh Grace order/account lookup occurred despite the system obligation. |
| full | g23-grace-reopened | failed | false | unattempted | fail | fail | fail | Operational status is failed; the retained reply is empty and actions are empty. There is no semantic answer to assess and no completed final reply or fresh lookup. |
| full | g20-copperline-manager | served | true | pass | fail | pass | fail | Correct Tobias Lindqvist. No fresh lookup_customer or lookup_order occurred; the seeded account lookup does not discharge this goal's system obligation. |
| full | g24-halvorsen-claim | unattempted | unattempted | unattempted | unattempted | unattempted | fail | Planned work is unattempted, with no reply and no actions. Cracked pendants, pro number, and claim deadline remain unanswered; it cannot count as completed. |
| records | g12-copperline-gesture | served | false | pass | fail | pass | fail | Correct free freight on the next order, explicitly replacing the $50 credit. Only recall occurred; this Copperline-specific request still requires a fresh account/order lookup. |
| aggregate | g16-walk-in-return | served | true | pass | pass | pass | pass | Correct Saturday closure and Monday alternative. Generic counter policy has no order/account lookup obligation; the final message satisfies the listed reply requirement. |
| full | g02-luis-card | served | true | pass | pass | pass | pass | Fresh LH-44870 account lookup and correct Mastercard ending 7719 answer the requested card-on-file question. |
| aggregate | g17-phone-list | served | false | fail | fail | pass | fail | Wrong day and active calls: ESC-2219 was closed, so 555-0188 is no longer required; Dalia 555-0175 is omitted. Owen's availability alone creates no callback task. No fresh lookup occurred. |
| full | g19-farah-code | served | true | pass | fail | pass | fail | Correct WKND15, 15 percent, and expiry October 11. No fresh Farah order/account lookup occurred. |
| records | g24-halvorsen-claim | served | false | fail | fail | pass | fail | Pro number and deadline are right, but omits the known cracked glass and treats superseded depot history as an unresolved discrepancy. Only recall occurred, not a fresh lookup. |
| aggregate | g24-halvorsen-claim | served | false | fail | fail | pass | fail | Omits the known cracked glass and says no claim is needed unless damage exists, even though that damage is already reported. Pro and deadline are correct. Only recall occurred. |
| aggregate | g15-luis-returns | served | true | ambiguous | fail | fail | fail | Requested $289, Mastercard 7719, and October 21 date are correct. Required-content reading passes; 'should appear ... shortly' adds an unsupported near-term posting assurance to a missing-refund reply. No fresh lookup_customer occurred. |
| aggregate | g22-kenji-returns | served | false | fail | fail | pass | fail | Exact gift text is correct, but no customer-facing reply is supplied and the response reuses the first kettle's October 12 estimate for the second replacement despite the no-written-date rule. Only recall occurred. |
| aggregate | g14-beatriz-remedy | served | true | fail | fail | pass | fail | Exchange, sage rug, and PW-7042-1185 are correct, but 'expected delivery every afternoon until it lands' turns a daily chase instruction into invented delivery timing. Only recall occurred, not a fresh lookup. |
| full | g12-copperline-gesture | served | false | pass | fail | pass | fail | Correct free freight on the next order; old credit and discount are rejected. No fresh Copperline order/account lookup occurred. |
| aggregate | g13-farah-address | served | false | pass | fail | pass | fail | Correct 91 Quarry Lane, Ashby; 19 is explicitly rejected. No fresh Farah order/account lookup occurred. |
| aggregate | g10-sigrid-callback | served | false | ambiguous | fail | pass | fail | Correct extension 4127 and after-2-pm window, but directs a switchboard transfer rather than the supplied direct line. A working switchboard route is plausible; transfer routing is not established. Recall occurred but fresh lookup did not. |
| full | g15-luis-returns | served | true | ambiguous | fail | fail | fail | Correct $289, Mastercard 7719, and October 21 deadline. Literal 'closed on' says a future window has already closed on October 9; a retrospective hypothetical-window reading answers the user's wording. No fresh lookup_customer occurred. |
| aggregate | g09-kenji-gift-note | served | true | pass | fail | fail | fail | Exact 'Happy 40th, Aiko' is correct. Recall fulfills history retrieval, but neither the system fresh lookup nor explicit lookup_order occurred. |
| full | g21-copperline-buyer | served | true | pass | fail | pass | fail | Correct Hana Ikeda and exact email-only contact. No fresh Copperline order/account lookup occurred. |
| full | g03-grace-escalation | served | true | fail | fail | fail | fail | Marcus, Priya, and tracking are correct, but the note instructs initiation of an already-open trace and attaches the refund approval code as an escalation sign-off requirement without support. No fresh lookup_order occurred. |
| full | g07-depot-release | served | true | pass | fail | fail | fail | Correct Tomasz Brennan, today's deadline because he is off Friday, and FL-660412. No fresh lookup_order occurred. |
| records | g14-beatriz-remedy | served | true | pass | fail | pass | fail | Correct sage exchange, dispatched state, and PW-7042-1185; daily monitoring paraphrases the chase instruction. Only recall occurred, with no fresh order/account lookup. |
| records | g15-luis-returns | served | true | ambiguous | fail | fail | fail | Correct requested refund amount, card, and October 21 date. Required-content reading passes; 'should appear ... shortly' is an unsupported near-term posting assurance. No fresh lookup_customer occurred. |
| aggregate | g11-grace-signoff-today | served | true | pass | fail | pass | fail | Correct Friday substitution: Marcus normally signs and Ruth gives it today. Only recall occurred; no fresh Grace order/account lookup. |
| records | g04-halvorsen-ticket | served | true | pass | fail | pass | fail | Correct ticket ESC-2219, but no fresh Halvorsen lookup. Final text is delivered only to the shift lead, so Priya delivery is unproved; content passes under a draft-only reading. |
| records | g22-kenji-returns | served | false | fail | fail | pass | fail | Gift text is right, but no sendable customer reply is supplied and October 12 is reproduced from the earlier shipment despite the written-date rule. Only recall occurred. |
| full | g17-phone-list | served | true | pass | fail | pass | fail | Correct remaining morning call: Dalia 555-0175 for the sofa slot. No fresh Dalia order/account lookup occurred. |
| records | g05-luis-approval-note | served | true | pass | fail | fail | fail | Correct $289 full refund and MX-4486 for the over-$200 note; old code and fee are clearly withdrawn. Only recall occurred; fresh lookup_order is missing. |
| aggregate | g02-luis-card | served | true | pass | pass | pass | pass | Fresh account lookup returns Mastercard ending 7719 and the reply identifies it correctly. |
| full | g09-kenji-gift-note | served | true | pass | fail | fail | fail | Correct exact gift wording. No actions occurred: both the fresh lookup_order and explicitly listed recall are absent. |
| aggregate | g20-copperline-manager | served | true | fail | fail | pass | fail | Tobias is correct and Owen remains the buyer at boundary 137, but the reply misattributes the account's preferred-contact field to Tobias and presents the buyer as his contact method. No fresh account/order lookup occurred. |
| full | g08-halvorsen-credit | served | false | pass | pass | pass | pass | Fresh account lookup supports $3,760 available and Ines Albrecht. The available amount stated for the requested $3,000 order conveys that it fits. |
| records | g18-chase-list | served | false | fail | fail | pass | fail | Wrong active chases: Copperline and Beatriz are delivered; Farah PW-7120-4466 is missing. Dalia's speculative transit/depot location also contradicts the warehouse result. No fresh lookup occurred. |
| aggregate | g07-depot-release | served | true | pass | fail | fail | fail | Correct Tomasz Brennan, today rather than his Friday absence, and FL-660412. No fresh lookup_order occurred. |
| records | g11-grace-signoff-today | served | true | pass | fail | pass | fail | Correct Ruth Adeyemi for Friday cover. Recall of old Grace records does not satisfy the separate fresh lookup requirement. |
| records | g03-grace-escalation | served | true | pass | fail | fail | fail | Correct Marcus sign-off, Priya copy, tracking, and already-open trace. Actual actions are recall only; no fresh lookup_order occurred. |
| records | g17-phone-list | served | false | fail | fail | pass | fail | Mistakes Saturday for Friday, revives the closed Halvorsen morning call, adds an unsupported Owen call, and omits Dalia 555-0175. No fresh lookup occurred. |
| aggregate | g03-grace-escalation | served | true | fail | fail | fail | fail | Marcus, Priya, and tracking are correct, but adds the warehouse team as copied recipients with no instruction or evidence. Both actions are recall, including one for an unrelated order; no fresh lookup_order occurred. |
| full | g06-kenji-shipping | served | false | fail | pass | pass | fail | Fresh LH-81660 lookup occurred, but the draft promises October 12, invents that the gift note was added/included, and calls October 7 today on October 8. |
| full | g13-farah-address | served | true | pass | fail | pass | fail | Correct complete redirect address 91 Quarry Lane, Ashby. No fresh Farah order/account lookup occurred. |
| full | g04-halvorsen-ticket | served | true | pass | fail | pass | fail | Correct ESC-2219, but no fresh lookup and no proof of sending Priya the number. Final text goes to the shift lead; draft-only content passes. |
| records | g02-luis-card | served | true | pass | pass | pass | pass | Fresh LH-44870 lookup and correct Mastercard ending 7719. |
| aggregate | g12-copperline-gesture | served | true | pass | fail | pass | fail | Correct free freight replacing the $50 credit. No fresh Copperline order/account lookup occurred. |
| records | g21-copperline-buyer | served | true | pass | fail | pass | fail | Correct Hana Ikeda, exact email, email-only contact, and Owen's departure. Recall is not a fresh Copperline account/order lookup. |
| full | g16-walk-in-return | served | true | pass | pass | pass | pass | Correct all-day Saturday closure and Monday resumption. No precise opening hour is asserted; the morning wording does not change the required no-today answer. Generic counter policy needs no lookup. |
| records | g07-depot-release | served | true | pass | fail | fail | fail | Correct Tomasz Brennan, today's release deadline, and FL-660412. No fresh lookup_order occurred. |
| full | g05-luis-approval-note | served | false | fail | fail | fail | fail | Correct $289 full refund, but the internal authorization note omits mandatory current manager approval code MX-4486 for a refund above $200. No fresh lookup_order occurred. |
| full | g22-kenji-returns | served | false | fail | fail | pass | fail | Exact gift text is right, but invents tracking PW-6013-2281 and confirmed inclusion, and gives the forbidden October 12 arrival expectation for the second kettle. No fresh lookup occurred. |
| records | g09-kenji-gift-note | served | true | pass | fail | fail | fail | Exact gift wording is correct. Recall occurred, but no fresh lookup_order; both system and explicit lookup obligations fail. |
| full | g14-beatriz-remedy | served | true | pass | fail | pass | fail | Correct sage exchange instead of refund and PW-7042-1185, explicitly marked shipped on October 9. 'Initiate' is draft setup wording alongside the supplied shipped state, not evidence of a second dispatch. No fresh lookup occurred. |
| records | g19-farah-code | served | true | pass | fail | pass | fail | Correct WKND15, 15 percent, and October 10-11 validity. Only recall occurred; no fresh Farah order/account lookup. |
| records | g20-copperline-manager | served | false | pass | fail | pass | fail | Correctly selects Tobias and labels Ines as earlier. Owen and extension 4310 are still eligible at boundary 137; Hana's later correction must not be imported. Only recall occurred, not a fresh lookup. |
