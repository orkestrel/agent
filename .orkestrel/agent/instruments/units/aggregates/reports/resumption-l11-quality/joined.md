# L11 sealed quality join

Validated 48 unique judgments against packet, authored scenario goals, private retained identities, and run rows. Verdicts and reasons are copied unchanged.

## Totals

```json
{
  "armCounts": {
    "records": {
      "semantic": {
        "pass": 12,
        "fail": 12,
        "ambiguous": 0
      },
      "systemTool": {
        "pass": 4,
        "fail": 20,
        "ambiguous": 0
      },
      "listedTool": {
        "pass": 18,
        "fail": 6,
        "ambiguous": 0
      },
      "completeWork": {
        "pass": 3,
        "fail": 21,
        "ambiguous": 0
      }
    },
    "full": {
      "semantic": {
        "pass": 6,
        "fail": 17,
        "ambiguous": 1
      },
      "systemTool": {
        "pass": 7,
        "fail": 17,
        "ambiguous": 0
      },
      "listedTool": {
        "pass": 21,
        "fail": 3,
        "ambiguous": 0
      },
      "completeWork": {
        "pass": 4,
        "fail": 20,
        "ambiguous": 0
      }
    }
  },
  "adjustedArmCounts": {
    "records": {
      "semantic": {
        "pass": 12,
        "fail": 11,
        "ambiguous": 0
      },
      "systemTool": {
        "pass": 3,
        "fail": 20,
        "ambiguous": 0
      },
      "listedTool": {
        "pass": 17,
        "fail": 6,
        "ambiguous": 0
      },
      "completeWork": {
        "pass": 3,
        "fail": 20,
        "ambiguous": 0
      }
    },
    "full": {
      "semantic": {
        "pass": 6,
        "fail": 16,
        "ambiguous": 1
      },
      "systemTool": {
        "pass": 6,
        "fail": 17,
        "ambiguous": 0
      },
      "listedTool": {
        "pass": 20,
        "fail": 3,
        "ambiguous": 0
      },
      "completeWork": {
        "pass": 4,
        "fail": 19,
        "ambiguous": 0
      }
    }
  }
}
```

## Per-goal judgments

| Arm | Goal | Status | Automatic pattern match | Semantic | System-tool | Listed-tool | Complete-work | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| records | g24-halvorsen-claim | served | false | fail | fail | pass | fail | Asserts that the lights remain held awaiting release despite their delivery; omits cracked glass and the 2026-10-16 claim deadline. Only recall was called; no fresh order/account lookup. |
| full | g23-grace-reopened | served | false | fail | fail | pass | fail | Identifies the wrong twin parcel and Marcus, but omits PW-5521-9930 and invents a condition that the correct item must be located before replacement. No fresh lookup. |
| records | g02-luis-card | served | true | pass | pass | pass | pass | Correct Mastercard ending 7719, with a fresh lookup_customer for LH-44870 returning that card. |
| full | g12-copperline-gesture | served | false | fail | fail | pass | fail | Reverses the correction: recommends the withdrawn $50 credit instead of free freight on the next order. No fresh Copperline lookup. |
| full | g24-halvorsen-claim | served | false | fail | fail | pass | fail | Gives FL-660412 and the correct claim deadline, but asserts a depot hold, omits cracked glass, and invents a required $1,240 refund. No fresh lookup. |
| records | g04-halvorsen-ticket | served | true | pass | fail | pass | fail | Correct ticket ESC-2219. The copied-Priya statement can describe seed[23], but does not prove delivery of this requested message. No fresh Halvorsen lookup; only recall. |
| full | g15-luis-returns | served | false | fail | fail | fail | fail | Correct $289, card ending 7719, and return date, but says the refund appears on the card although the request says it has not appeared. No fresh lookup_customer. |
| records | g17-phone-list | served | true | fail | fail | pass | fail | Includes Dalia and 555-0175, but adds stale Grace replacement work, Owen's superseded extension 4301, and Sigrid despite her after-2-pm restriction to a morning list. No fresh lookup for the account/order work. |
| full | g14-beatriz-remedy | served | true | fail | fail | pass | fail | Correct sage exchange and PW-7042-1185, but changes the chase endpoint to arrival at the delivery depot rather than delivery of the rug. Also labels the tracking identifier an order. No fresh lookup. |
| records | g13-farah-address | served | true | pass | fail | pass | fail | Correct street address 91 Quarry Lane; mentions 19 only to correct it. Ashby is optional for the requested street-address change. No fresh Farah lookup. |
| full | g08-halvorsen-credit | served | true | pass | pass | pass | pass | Fresh LH-31055 account lookup supports $5,000 less $1,240, sufficient for $3,000, and Ines Albrecht. Explicit arithmetic of $3,760 available is optional. |
| full | g06-kenji-shipping | served | false | fail | pass | pass | fail | Fresh LH-81660 lookup and correct shipped status/tracking in the body, but the customer-facing subject asserts that the kettle has arrived. That contradicts the eligible shipping evidence. A draft is the requested deliverable; external sending is not required. |
| records | g05-luis-approval-note | served | true | pass | fail | fail | fail | Correct full $289 refund and MX-4486, explicitly retires MX-4471 and the fee. Card/email additions agree with the permitted account source. Only recalls; required fresh lookup_order is absent. |
| records | g15-luis-returns | served | false | fail | fail | fail | fail | Correct amount, card, and return date, but adds unsupported 3-5-business-day posting, immediate-processing policy, and a conflicting 3-day follow-up rule; leaves an initiation-date placeholder. Recalled customer result is not the required fresh lookup_customer. |
| full | g09-kenji-gift-note | served | false | fail | fail | pass | fail | Fails to supply 'Happy 40th, Aiko' and needlessly asks Kenji; gift wrapping does not establish a note was shipped. Fresh order lookup exists. A recall call satisfies the narrow tool-name list, but its refunds topic does not seek the admitted missing gift wording, contrary to the system's conditional recovery requirement. |
| full | g13-farah-address | served | true | pass | fail | pass | fail | Correct redirect to 91 Quarry Lane, Ashby. No fresh Farah order/account lookup. |
| records | g11-grace-signoff-today | served | true | pass | fail | pass | fail | Correctly assigns today's actual approval to Ruth as Marcus's cover; opening reference to Marcus's sign-off is resolved by that delegation, not a contradictory final assignment. No fresh lookup. |
| records | g07-depot-release | served | true | pass | fail | fail | fail | Answers all substantive parts: Tomasz Brennan, today before his Friday absence, and FL-660412. No required fresh lookup_order. |
| full | g02-luis-card | served | true | pass | pass | pass | pass | Correct Mastercard ending 7719, verified by fresh lookup_customer for LH-44870. |
| full | g07-depot-release | served | false | fail | pass | pass | fail | Fresh order lookup and correct FL-660412, but 'warehouse team' does not identify Tomasz and the reply omits the today deadline. The substantive who/by-when questions remain unanswered. |
| full | g16-walk-in-return | served | true | pass | pass | pass | pass | Clearly refuses today's walk-in return and says Monday because of floor work. This generic counter-policy question concerns no order/account and requires no fresh lookup. |
| records | g12-copperline-gesture | served | false | pass | fail | pass | fail | Correct free freight on the next order; old $50 credit appears only as the replaced preference. Only recall, no fresh Copperline lookup. |
| records | g08-halvorsen-credit | served | true | pass | pass | pass | pass | Fresh account lookup supports sufficient available credit for $3,000 and manager Ines Albrecht. No requirement to state the remaining-credit arithmetic explicitly. |
| full | g01-luis-refund-amount | served | true | pass | pass | pass | pass | Correct full $289 refund without the withdrawn fee, supported by fresh lookup_order for LH-79215. |
| full | g03-grace-escalation | served | false | fail | fail | fail | fail | Correct Marcus, Priya, and tracking, but assigns Grace the obsolete Halvorsen ticket ESC-2291 and asserts tracking proves a parcel is still held at the locker. No fresh required lookup_order. |
| records | g16-walk-in-return | served | false | pass | pass | pass | pass | The awkward opening repeats former hours, but the same sentence explicitly overrides them with all-day closure and Monday. Read as a correction, the actionable answer is clear. Generic desk policy needs no fresh lookup. |
| records | g03-grace-escalation | served | true | fail | fail | fail | fail | Correct signer, copy, and tracking, but falsely turns Grace's locker case into a depot hold awaiting warehouse release and imposes a refund approval code on the replacement. No fresh lookup_order. |
| full | g04-halvorsen-ticket | served | true | fail | fail | pass | fail | Correct ticket and historically supported Priya copy, but imposes an approval-code note on a late-delivery escalation without a refund authorization. Only recall; no fresh Halvorsen lookup and no proof that this message reached Priya. |
| full | g22-kenji-returns | served | true | fail | fail | pass | fail | Correct gift text, but reuses the first replacement's tracking as if it established the second kettle's shipment, tells Kenji to add the note himself, and does not answer his arrival question with the permitted uncertainty. No fresh lookup. |
| records | g10-sigrid-callback | served | false | fail | fail | pass | fail | Gives the main switchboard 555-0142 but omits Sigrid's required direct extension 4127, despite recall returning it. After 2 pm is correct. Recall satisfies the explicit list; fresh Halvorsen lookup is absent. |
| full | g05-luis-approval-note | failed | false | fail | fail | fail | fail | Retained status is failed and reply is empty. No refund note was delivered and no fresh lookup_order occurred. Recall retrieved useful rules, but tool results are not a completed answer. |
| full | g18-chase-list | served | false | fail | fail | pass | fail | Correct Farah tracking, but still chases Copperline FL-661978 after all chairs arrived. No fresh lookup for shipments on the list. |
| records | g20-copperline-manager | served | false | fail | fail | pass | fail | Names Ines instead of Tobias Lindqvist despite recall returning the revised account result. Owen remains the eligible buyer before seed[138], so that name is not itself penalized. No fresh account lookup. |
| full | g17-phone-list | served | false | fail | fail | pass | fail | Omits Dalia and 555-0175, revives the closed Halvorsen morning chase, misattributes Freightline's 555-0188 to Tomasz, and invents a Dana direct-line instruction. No fresh lookup. |
| full | g10-sigrid-callback | served | true | ambiguous | fail | pass | fail | Correct extension 4127 and explicitly says she takes calls after 2 pm. 'Voicemail is at 2 pm' can be malformed availability wording (semantic pass) or an invented voicemail timestamp (semantic fail). Preserve that wording ambiguity; fresh Halvorsen lookup is absent. |
| records | g22-kenji-returns | served | true | fail | fail | pass | fail | Correct gift wording and planned second replacement, but invents that the damaged kettle arrived yesterday and does not address when the second will arrive. The quoted third-person text is not a complete reply to Kenji. Only recall; no fresh lookup. |
| full | g20-copperline-manager | served | true | fail | fail | pass | fail | Correct Tobias Lindqvist, but assigns him 555-0142, which the allowed lookup source identifies as Halvorsen's switchboard, not Copperline's. No fresh lookup. |
| full | g21-copperline-buyer | served | true | pass | fail | pass | fail | Correct Hana Ikeda and hana.ikeda@copperline.example; supplying email meets the contact request without repeating 'email only'. No fresh Copperline lookup. |
| records | g18-chase-list | served | false | fail | fail | pass | fail | Omits Farah PW-7120-4466, revives delivered Halvorsen and Beatriz shipments, and shifts Tomasz's past Friday absence into tomorrow. Recalled historical warehouse text is not a fresh lookup. |
| full | g11-grace-signoff-today | served | false | fail | pass | pass | fail | Fresh Grace order lookup satisfies the system action requirement, but Marcus is wrong for today's actual signer: Ruth covers him through 2026-10-09. |
| records | g09-kenji-gift-note | served | true | pass | fail | fail | fail | Exact gift wording recovered by relevant recall. The original explicit list also requires lookup_order, and no fresh lookup was made. |
| full | g19-farah-code | served | false | fail | fail | pass | fail | Lists WKND15 and its dates but incorrectly denies that it applies to Farah's late curtains. No fresh Farah lookup. |
| records | g06-kenji-shipping | served | false | fail | pass | pass | fail | Fresh LH-81660 lookup and correct tracking, but puts the carrier's October 12 delivery estimate in the customer draft despite the no-written-delivery-date rule. This is a requested draft, not a request for external delivery. |
| records | g01-luis-refund-amount | served | true | pass | fail | fail | fail | Correct full $289 refund and withdrawn fee. Only recall of an old lookup result; the required fresh lookup_order is missing. |
| records | g23-grace-reopened | served | false | fail | fail | pass | fail | Correct signer, trace, and tracking, but says the trace is closed, omits the twin parcel addressed to someone else, and gives the wrong reason for today's replacement. Only recalls; no fresh lookup. |
| records | g19-farah-code | served | true | pass | fail | pass | fail | Correct WKND15, 15 percent, and October 10-11 validity. Only recalls, with no fresh lookup for Farah's order/account. |
| records | g14-beatriz-remedy | served | true | fail | fail | pass | fail | Correct exchange and tracking, but directs an immediate release of an already-shipped rug through Tomasz on his stated day off; turns the instruction to chase Parcelway into a carrier-status assertion. No fresh lookup. |
| records | g21-copperline-buyer | served | false | fail | fail | pass | fail | Names Hana and her email but still directs today's contact to departed Owen at superseded extension 4301. The correction is not applied. Only recall, no fresh lookup. |
