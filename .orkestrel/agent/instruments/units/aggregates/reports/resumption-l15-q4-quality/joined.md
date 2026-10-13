# Successor alias a sealed quality join

Validated 72 unique judgments against packet, authored scenario goals, private retained identities, and run rows. Verdicts and reasons are copied unchanged.

## Totals

```json
{
  "armCounts": {
    "records": {
      "semantic": {
        "pass": 18,
        "fail": 5,
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
    "full": {
      "semantic": {
        "pass": 16,
        "fail": 7,
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
        "pass": 17,
        "fail": 7,
        "ambiguous": 0,
        "unattempted": 0
      },
      "completeWork": {
        "pass": 2,
        "fail": 21,
        "ambiguous": 1,
        "unattempted": 0
      }
    }
  },
  "adjustedArmCounts": {
    "records": {
      "semantic": {
        "pass": 18,
        "fail": 4,
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
    "full": {
      "semantic": {
        "pass": 16,
        "fail": 6,
        "ambiguous": 1,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 4,
        "fail": 19,
        "ambiguous": 0,
        "unattempted": 0
      },
      "listedTool": {
        "pass": 16,
        "fail": 7,
        "ambiguous": 0,
        "unattempted": 0
      },
      "completeWork": {
        "pass": 2,
        "fail": 20,
        "ambiguous": 1,
        "unattempted": 0
      }
    }
  }
}
```

## Per-goal judgments

| Arm | Goal | Status | Automatic pattern match | Semantic | System-tool | Listed-tool | Complete-work | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| records | g08-halvorsen-credit | served | false | pass | pass | pass | pass | The account lookup establishes $3,760 available credit against the $3,000 request and Ines Albrecht; the answer conveys that the reorder fits. |
| aggregate | g24-halvorsen-claim | served | false | fail | fail | pass | fail | The reply denies a claim unless damage was noted at delivery and omits the two cracked pendants reported on reopening. Seed 148 makes damage known; signed delivery does not remove that fact. Only recall ran, with no fresh LH-80941 lookup. |
| records | g01-luis-refund-amount | served | true | pass | fail | fail | fail | The $289 full refund and withdrawn fee are correct. Recalling an old LH-79215 result does not fulfill either the fresh-lookup system rule or the explicit lookup_order requirement. |
| full | g02-luis-card | served | true | pass | pass | pass | pass | A fresh LH-44870 account lookup returns Mastercard ending 7719, and the reply identifies that refund card. |
| aggregate | g03-grace-escalation | served | true | pass | fail | fail | fail | The note supplies Marcus, Priya Raman, and PW-5521-9930 correctly. Both actions are recalls; neither is the required fresh order lookup. |
| aggregate | g06-kenji-shipping | served | false | fail | pass | pass | fail | The fresh kettle lookup is valid, but the customer reply writes an October 12 arrival estimate despite the writing restriction, calls October 7 today although the conversation date is October 8, and claims the gift note was added without action evidence. |
| records | g03-grace-escalation | served | true | pass | fail | fail | fail | Marcus, Priya Raman, PW-5521-9930, and the already-open trace are correct. Two recalls reproduce history but do not fulfill the required fresh order lookup. |
| aggregate | g01-luis-refund-amount | served | true | pass | fail | fail | fail | The answer correctly refunds $289 without the withdrawn fee. The sole recall does not satisfy the fresh-lookup rule or the listed lookup_order action. |
| aggregate | g13-farah-address | served | true | pass | fail | pass | fail | 91 Quarry Lane, Ashby is the correct redirect. Calling 7 Mill Road incorrect is read as incorrect for the redirect, not as the prior house-number correction. No fresh lookup for Farah's known order/account occurred. |
| full | g06-kenji-shipping | served | false | fail | pass | pass | fail | The fresh LH-81660 lookup passes both action axes. The customer draft nevertheless expects delivery by October 12, contradicting the no-written-date rule; the internal text also mislabels October 7 as today and invents completion of the gift-note addition. |
| records | g05-luis-approval-note | served | true | pass | fail | fail | fail | The note correctly authorizes $289 with MX-4486 and rejects the withdrawn fee and old code. Only refund history was recalled; the listed order lookup and system fresh lookup are absent. |
| full | g12-copperline-gesture | served | false | pass | fail | pass | fail | Free freight on the next order is the corrected goodwill gesture. This request concerns Copperline's known wholesale order/account, so the system still requires a fresh lookup despite the narrower final-message-only list. |
| aggregate | g14-beatriz-remedy | served | true | pass | fail | pass | fail | The note correctly records the sage exchange, dispatched status, Parcelway, and PW-7042-1185. Recall is present, but no fresh lookup for LH-83317 or LH-60214 occurred. |
| full | g07-depot-release | served | true | pass | fail | fail | fail | Tomasz Brennan, today before his Friday absence, and FL-660412 answer every substantive question. No action fulfills the system or listed lookup_order requirement. |
| aggregate | g19-farah-code | served | true | pass | fail | pass | fail | WKND15, 15 percent, and validity today/tomorrow match October 10–11. Recalling Farah's history is not a fresh order/account lookup. |
| full | g19-farah-code | served | true | pass | fail | pass | fail | WKND15 and validity through October 11 are correct. No fresh lookup for Farah's known order/account occurred. |
| records | g11-grace-signoff-today | served | true | pass | fail | pass | fail | Ruth Adeyemi is the October 9 substitute signatory. Recall alone does not satisfy the system's fresh lookup for Grace's known account/order. |
| aggregate | g11-grace-signoff-today | served | true | pass | fail | pass | fail | Read together, the sentences identify the ordinary Marcus requirement and Ruth's substitution through October 9; they do not require both signatures. The sole recall is not a fresh lookup. |
| aggregate | g23-grace-reopened | served | false | fail | fail | pass | fail | The note correctly identifies the wrong twin set and trace/tracking, but assigns Ruth today's sign-off after her October 9 cover expired. October 10 requires Marcus. No fresh lookup occurred. |
| records | g18-chase-list | served | false | fail | fail | pass | fail | The answer chases Copperline and Beatriz after their arrivals, omits Farah's active PW-7120-4466 chase, and speculates that Dalia is in transit/depot despite the warehouse result. No fresh order/account lookup occurred. |
| full | g18-chase-list | served | false | fail | fail | pass | fail | Both listed shipments had arrived by this boundary; Farah's PW-7120-4466 is the remaining chase and is missing. No fresh lookup occurred. |
| aggregate | g09-kenji-gift-note | served | true | pass | fail | fail | fail | The exact gift wording is correct and recall fulfills the history action. The explicit lookup_order and the system fresh-lookup requirement are still unmet. |
| full | g15-luis-returns | served | true | fail | fail | fail | fail | The amount, card, and deadline values are correct, but the reply says the return window closed on October 21 although the eligible conversation date is October 9 and the window remains open. No fresh customer lookup occurred. |
| records | g23-grace-reopened | served | false | fail | fail | pass | fail | The wrong twin parcel, TR-3307, and PW-5521-9930 are correct. Ruth's cover ended October 9; assigning her sign-off on October 10 is wrong. Recall is not the required fresh lookup. |
| aggregate | g18-chase-list | served | false | fail | fail | pass | fail | The answer revives the completed Copperline and Beatriz carrier chases, omits Farah's PW-7120-4466, and speculates incorrectly about Dalia's warehouse-held sofa. No fresh lookup occurred. |
| aggregate | g04-halvorsen-ticket | served | true | pass | fail | pass | fail | ESC-2219 is correct, and Priya being copied is supported as historical state by seed 23. The recall does not satisfy fresh lookup. A final answer reaches the shift lead only: it does not prove this requested number was sent to Priya; draft-only content is acceptable, external delivery is unproved. |
| full | g04-halvorsen-ticket | served | true | pass | fail | pass | fail | ESC-2219 is correct. No fresh order/account lookup occurred. The final reply provides the number to the shift lead, but the protocol has no demonstrated action delivering it to Priya; the draft-only content bound passes. |
| records | g04-halvorsen-ticket | served | true | pass | fail | pass | fail | ESC-2219 is correct. No fresh order/account lookup occurred. Delivery to Priya is unproved by a final message to the shift lead; only the informational/draft-only bound is satisfied. |
| records | g22-kenji-returns | served | false | ambiguous | fail | pass | fail | The exact gift text and refusal to promise a date are correct. As internal advice, explicitly calling October 12 the original estimate can be historical context; as the requested customer reply, this is not a sendable addressed draft and associates an old kettle estimate with the second shipment without evidence. Recall is not a fresh lookup. |
| aggregate | g20-copperline-manager | served | true | fail | fail | pass | fail | Tobias Lindqvist is correct, and Owen/4310 have not yet been superseded at boundary 137. However, the reply turns Copperline's preferred buyer contact into Tobias's own contact method, an unsupported route for reaching the account manager. No fresh account lookup occurred. |
| full | g13-farah-address | served | true | pass | fail | pass | fail | 91 Quarry Lane, Ashby preserves the corrected number and unchanged locality. No fresh lookup for Farah's known order/account occurred. |
| full | g24-halvorsen-claim | served | true | pass | fail | pass | fail | The answer identifies two cracked pendants, delivered status, FL-660412, and the October 16 claim deadline. No fresh order/account lookup occurred. |
| aggregate | g16-walk-in-return | served | true | pass | pass | pass | pass | The answer refuses a Saturday afternoon walk-in and defers it to Monday or later. This generic counter-policy request names no customer order/account and needs no fresh lookup. |
| records | g06-kenji-shipping | served | false | fail | pass | pass | fail | The fresh order lookup fulfills both action axes, but the customer reply supplies October 12 as the expected arrival and falsely calls October 7 today. The added promise to attach the note is not evidence that it was attached. |
| aggregate | g22-kenji-returns | served | false | ambiguous | fail | pass | fail | The gift wording and refusal to promise a date are correct. The historical-original-estimate reading is defensible internal advice; the requested customer-draft reading is incomplete and risks applying the prior kettle's October 12 estimate to the second shipment. No fresh lookup occurred. |
| records | g15-luis-returns | served | true | pass | fail | fail | fail | The reply gives $289, Mastercard 7719, and October 21 correctly and says the window ends rather than has closed. 'Shortly' is non-specific reassurance, not a verified processing deadline. No fresh lookup_customer occurred. |
| full | g16-walk-in-return | served | true | ambiguous | pass | pass | ambiguous | The Saturday closure and Monday reopening day follow the correction, and no lookup is required for this generic policy question. 'Monday morning' adds an opening period that the source does not specify: the day-level answer passes, while an exact reopening-time reading is unsupported. |
| aggregate | g07-depot-release | served | true | pass | fail | fail | fail | Tomasz Brennan, the today deadline, and FL-660412 are correct. The required fresh and explicitly listed order lookup is missing. |
| records | g02-luis-card | served | true | pass | pass | pass | pass | The fresh account lookup and reply identify Luis's Mastercard ending 7719. |
| aggregate | g02-luis-card | served | true | pass | pass | pass | pass | The fresh account lookup and reply identify Luis's Mastercard ending 7719. |
| full | g01-luis-refund-amount | served | true | pass | pass | fail | fail | The $289 full refund and withdrawn fee are correct. A fresh lookup_customer for LH-44870 satisfies the system's order-or-account disjunction, but it does not satisfy this goal's explicit lookup_order requirement. |
| records | g13-farah-address | served | false | pass | fail | pass | fail | The reply repeatedly selects 91 Quarry Lane, Ashby. Its awkward description of the earlier 19 does not assert 19 as the destination. No fresh order/account lookup occurred. |
| full | g21-copperline-buyer | served | true | pass | fail | pass | fail | Hana Ikeda and email-only hana.ikeda@copperline.example honor the complete buyer-contact supersession. No fresh account/order lookup occurred. |
| records | g24-halvorsen-claim | served | false | fail | fail | pass | fail | The reply omits the known cracked-glass report and treats the old depot hold as an unresolved discrepancy instead of superseded history. FL-660412 and October 16 are correct but do not answer the actual damage state. Only recall occurred. |
| aggregate | g17-phone-list | served | false | fail | fail | pass | fail | The morning is Saturday October 10, not Friday. ESC-2219 was closed, so the Riverside 555-0188 call has ended; Dalia's required 555-0175 callback is absent. Owen's contact availability does not itself require a call. No fresh lookup occurred. |
| records | g21-copperline-buyer | served | true | pass | fail | pass | fail | Hana Ikeda, email only, and the complete email address are correct; Owen is mentioned only as having left. Recall does not satisfy the fresh account/order lookup rule. |
| aggregate | g05-luis-approval-note | served | true | pass | fail | fail | fail | The note has the full $289 refund, valid MX-4486 approval code, and withdrawn fee. Its card/email details agree with the authorized account source. Recall alone fails the system and listed order lookup. |
| aggregate | g08-halvorsen-credit | served | false | pass | pass | pass | pass | The fresh account result supports $3,760 available against the $3,000 reorder and Ines Albrecht. The answer conveys that the credit fits. |
| records | g07-depot-release | served | true | pass | fail | fail | fail | Tomasz Brennan, today before his Friday absence, and FL-660412 are correct. No required order lookup occurred. |
| aggregate | g21-copperline-buyer | served | true | pass | fail | pass | fail | Hana Ikeda's email-only contact is correct. Recalling historical account results does not count as a fresh lookup. |
| records | g14-beatriz-remedy | served | true | pass | fail | pass | fail | The note correctly identifies the sage exchange, dispatched status, and PW-7042-1185. Only recall ran; the known order/account still requires a fresh lookup. |
| full | g10-sigrid-callback | served | true | pass | fail | fail | fail | Extension 4127 and after 2 pm answer both questions. No recall fulfills the listed history action, and no fresh lookup fulfills the system requirement for the known shipment/account. |
| full | g22-kenji-returns | served | false | fail | fail | pass | fail | The gift text is correct, but PW-6013-2281 is invented, the customer reply promises an October 12 arrival, and completed shipping/gift-note inclusion goes beyond the warehouse-is-sending statement. No fresh lookup occurred. |
| aggregate | g12-copperline-gesture | served | false | pass | fail | pass | fail | Free freight on the next order correctly replaces the $50 credit; mentioning the withdrawn preference is not a stale assertion. No fresh lookup for Copperline's known account/order occurred. |
| full | g20-copperline-manager | served | true | pass | fail | pass | fail | Tobias Lindqvist is the correct account manager. The system still requires a fresh account/order lookup; none occurred. |
| records | g20-copperline-manager | served | false | pass | fail | pass | fail | The reply clearly selects Tobias and labels Ines as earlier information. Owen and extension 4310 remain valid through seed 137; the later Hana correction is ineligible. Recall is not a fresh lookup. |
| records | g10-sigrid-callback | served | true | pass | fail | pass | fail | Extension 4127 and after 2 pm are correct, and recall satisfies the listed history action. The system's additional fresh order/account lookup is absent. |
| full | g05-luis-approval-note | served | false | fail | fail | fail | fail | The $289 amount and waived fee are correct, but the required manager approval code MX-4486 is missing from the authorization note. Neither the explicit order lookup nor the system fresh lookup occurred. |
| aggregate | g10-sigrid-callback | served | false | pass | fail | pass | fail | The switchboard 555-0142, direct extension 4127, and after-2-pm availability agree with the account source and seed 24. Recall satisfies the listed history action, but no fresh order/account lookup occurred. |
| full | g03-grace-escalation | served | true | fail | fail | fail | fail | Marcus, Priya, and PW-5521-9930 are correct, but the note adds MX-4486 as replacement authorization even though that code governs refunds over $200, and orders initiation of a trace already opened. No fresh or listed order lookup occurred. |
| aggregate | g15-luis-returns | served | true | pass | fail | fail | fail | The reply correctly gives $289, Mastercard 7719, and an October 21 window end. 'Shortly' is non-specific reassurance, not a verified deadline. The fresh customer lookup required by both axes is absent. |
| records | g12-copperline-gesture | served | false | pass | fail | pass | fail | Free freight correctly replaces the $50 credit; the older credit is named only to reject it. Recalling escalation history is not a fresh lookup for Copperline's known order/account. |
| full | g23-grace-reopened | served | false | fail | fail | pass | fail | The wrong twin-set reason and TR-3307 are correct, but Ruth's cover expired, PW-5521-9930 is missing, and the note invents dispatch pending tracking and replacement approval code MX-4486. No fresh lookup occurred. |
| records | g17-phone-list | served | false | fail | fail | pass | fail | The reply uses Friday instead of Saturday, revives the closed Riverside callback, and omits Dalia's required 555-0175 call. Owen's before-noon availability alone does not create a required call. No fresh lookup occurred. |
| records | g09-kenji-gift-note | served | true | pass | fail | fail | fail | The exact gift wording is correct and recall satisfies the history action. The listed order lookup and system fresh lookup are absent. |
| full | g17-phone-list | served | true | pass | fail | pass | fail | Dalia Moreno at 555-0175 for the sofa slot is the active morning callback; omitting the closed Riverside chase is correct. Because this concerns LH-86610/LH-66208, the system requires a fresh lookup, which is absent. |
| full | g09-kenji-gift-note | served | true | pass | fail | fail | fail | The exact gift wording is correct. Neither listed recall nor listed lookup_order occurred, and the system fresh-lookup rule is also unmet. |
| records | g16-walk-in-return | served | true | pass | pass | pass | pass | The answer correctly refuses today's walk-in return and defers it to Monday or later. This generic counter-policy request requires no order/account lookup. |
| full | g08-halvorsen-credit | served | false | pass | pass | pass | pass | A fresh account lookup establishes $3,760 available credit and Ines Albrecht; the reply conveys that the $3,000 reorder fits. |
| full | g14-beatriz-remedy | served | true | pass | fail | pass | fail | The draft identifies the correct sage exchange and PW-7042-1185, explicitly recording it as shipped October 9. 'Initiate exchange' is read as the draft's authorization heading, not proof of a second dispatch. No fresh lookup occurred. |
| full | g11-grace-signoff-today | served | true | pass | fail | pass | fail | Ruth Adeyemi is the correct October 9 signatory. No fresh order/account lookup fulfills the system rule. |
| records | g19-farah-code | served | true | pass | fail | pass | fail | WKND15, 15 percent, and today/tomorrow validity are correct. Recall alone does not fulfill the system's fresh lookup for Farah's known order/account. |
