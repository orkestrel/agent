# L14 alias a sealed quality join

Validated 72 unique judgments against packet, authored scenario goals, private retained identities, and run rows. Verdicts and reasons are copied unchanged.

## Totals

```json
{
  "armCounts": {
    "full": {
      "semantic": {
        "pass": 14,
        "fail": 8,
        "ambiguous": 2,
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
    },
    "records": {
      "semantic": {
        "pass": 15,
        "fail": 8,
        "ambiguous": 1,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 6,
        "fail": 18,
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
        "fail": 10,
        "ambiguous": 1,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 6,
        "fail": 18,
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
        "pass": 2,
        "fail": 22,
        "ambiguous": 0,
        "unattempted": 0
      }
    }
  },
  "adjustedArmCounts": {
    "full": {
      "semantic": {
        "pass": 14,
        "fail": 7,
        "ambiguous": 2,
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
    },
    "records": {
      "semantic": {
        "pass": 15,
        "fail": 7,
        "ambiguous": 1,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 5,
        "fail": 18,
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
        "fail": 9,
        "ambiguous": 1,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 5,
        "fail": 18,
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
        "pass": 2,
        "fail": 21,
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
| full | g04-halvorsen-ticket | served | true | fail | fail | pass | fail | ESC-2219 is correct, but 'I have sent this to Priya' has no delivery evidence. The protocol delivers the final message to the shift lead only. No fresh Halvorsen lookup. |
| full | g01-luis-refund-amount | served | true | pass | fail | fail | fail | Correct full $289 refund and withdrawn fee. No fresh lookup; the explicit lookup_order action is absent. |
| records | g24-halvorsen-claim | served | false | fail | fail | pass | fail | Contradictorily says held at Riverside and delivered, and omits the reopened cracked-glass damage affecting 2 pendants. Pro number and claim deadline are correct. Recall is not a fresh lookup. |
| full | g11-grace-signoff-today | served | true | pass | fail | pass | fail | Correct Friday sign-off by Ruth Adeyemi within her cover period. No fresh Grace order or account lookup. |
| full | g16-walk-in-return | served | true | pass | pass | pass | pass | Correctly says the counter is closed today for floor work and returns wait until Monday. This generic counter-policy request requires no order/account lookup. |
| records | g21-copperline-buyer | served | true | pass | fail | pass | fail | Correct Hana Ikeda email contact after the buyer supersession; no obsolete telephone contact offered. Recall does not satisfy a fresh Copperline lookup. |
| records | g05-luis-approval-note | served | false | fail | fail | fail | fail | Gives the $289 amount and acknowledges approval-code requirement but omits the required active code MX-4486 from the draft. No fresh lookup_order. |
| full | g20-copperline-manager | served | true | pass | fail | pass | fail | Correct account manager Tobias Lindqvist. No fresh Copperline lookup. |
| records | g20-copperline-manager | served | true | pass | fail | pass | fail | Correct Tobias Lindqvist; Owen is still the eligible buyer through seed 137, so his mention is not stale at this boundary. No fresh Copperline lookup. |
| full | g18-chase-list | served | false | fail | fail | pass | fail | Omits Farah's active PW-7120-4466 chase, revives resolved Copperline and Halvorsen chases, and assigns Copperline's FL-661978 to Halvorsen. No fresh lookups. |
| records | g01-luis-refund-amount | served | true | pass | pass | fail | fail | Correct $289 full refund. Fresh lookup_customer for LH-44870 meets the system's lookup alternative, but the original explicit list requires lookup_order, which is absent. |
| full | g12-copperline-gesture | served | true | pass | fail | pass | fail | Correct free freight on the next order; $50 credit is mentioned only as replaced. No fresh Copperline order/account lookup. |
| aggregate | g15-luis-returns | served | true | fail | pass | pass | fail | Correct amount, card, and return date, with a fresh LH-44870 lookup. Adds an unsupported processing date and 3-5-day credit promise, and contradicts the return deadline by saying there is no specific deadline. |
| aggregate | g21-copperline-buyer | served | true | pass | fail | pass | fail | Correct Hana Ikeda and email address; no obsolete telephone contact offered. Recall is not a fresh Copperline lookup. |
| records | g19-farah-code | served | true | pass | fail | pass | fail | Correct WKND15, 15 percent, and October 10-11 validity for Saturday. No fresh Farah order/account lookup. |
| aggregate | g19-farah-code | served | true | pass | fail | pass | fail | Correct WKND15, 15 percent, and October 10-11 validity for Saturday. No fresh Farah order/account lookup. |
| aggregate | g18-chase-list | served | false | fail | fail | pass | fail | Omits Farah's active PW-7120-4466 chase and incorrectly revives Grace's closed trace, delivered Copperline chairs, and released Halvorsen shipment. Recall returned nothing and no fresh lookup followed. |
| aggregate | g04-halvorsen-ticket | served | true | fail | fail | pass | fail | Correct ticket ESC-2219, but falsely reports sending it to Priya without delivery evidence. Final messages reach the lead, not Priya. Recall is not a fresh lookup. |
| aggregate | g07-depot-release | served | true | pass | fail | fail | fail | Correct Tomasz Brennan, request today before Friday absence, and FL-660412. No fresh lookup_order; the stated future copying is not evidence of delivery. |
| full | g05-luis-approval-note | served | true | pass | fail | fail | fail | Draft correctly authorizes $289 with MX-4486 and the fee withdrawal. An extra manager-signature placeholder does not replace or omit the required code. No fresh lookup_order. |
| records | g16-walk-in-return | served | true | pass | pass | pass | pass | Correct closed counter and Monday return. Generic desk policy requires no order/account lookup. |
| records | g18-chase-list | served | false | fail | fail | pass | fail | Omits Farah's active PW-7120-4466 chase and revives Grace's closed trace, delivered Copperline chairs, and released Halvorsen shipment. Failed recall supplies no fresh lookup. |
| records | g13-farah-address | served | true | pass | fail | pass | fail | Correct street address 91 Quarry Lane; 19 is explicitly corrected rather than asserted. The request asks for the street address, and unchanged details are acknowledged. No fresh Farah lookup. |
| full | g13-farah-address | served | true | pass | fail | pass | fail | Correct complete address 91 Quarry Lane, Ashby. No fresh Farah lookup. |
| aggregate | g01-luis-refund-amount | served | true | pass | pass | fail | fail | Correct $289 full refund. Fresh LH-44870 customer lookup satisfies the system alternative, but the explicit lookup_order requirement is unmet. |
| aggregate | g03-grace-escalation | served | true | fail | fail | fail | fail | Requested sign-off, Priya, and tracking are correct, but the note adds refund code MX-4486 to a $148.50 replacement without authority and independently claims Priya was copied without delivery evidence. Recall is not lookup_order. |
| aggregate | g10-sigrid-callback | served | true | pass | fail | pass | fail | Correct direct extension 4127 and after-2-pm window. Recall satisfies the mapped explicit search_history requirement; no fresh lookup for the Halvorsen order/account. |
| records | g04-halvorsen-ticket | served | true | pass | fail | pass | fail | Correct ESC-2219 as a draftable message. No fresh lookup. Priya delivery is unproved: the protocol only delivers the final answer to the lead, so content success cannot certify the requested external send. |
| aggregate | g12-copperline-gesture | served | true | pass | fail | pass | fail | Correct free freight on the next order, explicitly replacing the $50 credit. Recall is not a fresh Copperline lookup. |
| records | g07-depot-release | served | true | pass | fail | fail | fail | Correct Tomasz Brennan, today deadline, and FL-660412. No fresh lookup_order. |
| full | g06-kenji-shipping | served | false | fail | pass | pass | fail | Fresh order lookup and correct shipment/tracking, but the customer draft states October 12 arrival despite the no-written-delivery-date rule. Missing gift-note text in the database is improperly asserted as failed physical inclusion. |
| full | g09-kenji-gift-note | served | true | pass | fail | fail | fail | Exact gift wording is correct. Both fresh lookup_order and explicitly listed recall are absent. |
| records | g03-grace-escalation | served | true | fail | fail | fail | fail | Requested Marcus, Priya, and tracking are present, but adds an inapplicable refund approval code, directs opening a trace already opened, and claims Priya was copied without delivery evidence. Recall does not satisfy fresh lookup_order. |
| aggregate | g14-beatriz-remedy | served | true | pass | fail | pass | fail | Correct sage exchange and PW-7042-1185; shipment is supported by seed 110. Recall is not a fresh Beatriz lookup. |
| aggregate | g23-grace-reopened | served | false | fail | fail | pass | fail | Correct twin-versus-queen reason and reopened trace, but asserts expired Ruth coverage on Saturday, omits PW-5521-9930, and says the replacement was dropped despite its revival. No fresh lookup. |
| full | g23-grace-reopened | served | false | fail | fail | pass | fail | Correct wrong twin duvet reason, but assigns expired Ruth coverage, calls TR-3307 resolved after reopening, and leaves tracking as a placeholder instead of PW-5521-9930. No fresh lookup. |
| records | g10-sigrid-callback | served | true | pass | fail | fail | fail | Correct extension 4127 and after-2-pm window. No fresh Halvorsen lookup or explicitly required recall. |
| aggregate | g22-kenji-returns | served | false | fail | fail | pass | fail | Correct gift text, but promises an October 12 estimate in the customer draft and transfers the earlier kettle's tracking to the second replacement without evidence. Recall is not a fresh lookup. |
| full | g14-beatriz-remedy | served | true | ambiguous | fail | pass | fail | Correct sage exchange and tracking. 'Ensure the replacement is sent out promptly' can mean verification or incorrectly treat the already shipped rug as awaiting dispatch; seed 110 says it was sent. No fresh Beatriz lookup either way. |
| full | g08-halvorsen-credit | served | true | ambiguous | pass | pass | ambiguous | Correct credit arithmetic, explicit fit, and Ines Albrecht with a fresh customer lookup. The extra assertion that Ines is reachable at 555-0142 is uncertain: the lookup labels it the account's main switchboard, not clearly the manager's contact. Core requested answer passes if that contact attribution is accepted; otherwise the unsupported addition fails. |
| records | g08-halvorsen-credit | served | false | pass | pass | pass | pass | Fresh LH-31055 lookup; correct $3,760 available for the $3,000 reorder and Ines Albrecht. The sufficient balance stated for the reorder communicates that it fits. Future passing-on language is not proof of any external action, but none was requested. |
| aggregate | g20-copperline-manager | served | true | pass | fail | pass | fail | Correct Tobias Lindqvist, and Owen remains eligible at seed 137 before the buyer supersession. Recall is not a fresh Copperline lookup. |
| aggregate | g09-kenji-gift-note | served | true | pass | fail | fail | fail | Exact gift text is correct and recall occurs, but recalled lookup text does not meet the explicit fresh lookup_order requirement. |
| full | g10-sigrid-callback | served | true | pass | fail | fail | fail | Correct direct extension 4127 and after-2-pm window today. No fresh lookup or explicitly required recall. |
| aggregate | g17-phone-list | served | false | fail | fail | pass | fail | Includes Dalia's correct callback but presents Sigrid's afternoon-only contact, Owen without an outstanding call task, and the closed Halvorsen Riverside chase as morning obligations. No fresh lookup. |
| full | g15-luis-returns | served | false | fail | fail | fail | fail | Correct $289, Mastercard 7719, and October 21 deadline, but the customer draft retains an unresolved processing-date placeholder and invents a 3-5-business-day credit timescale. No required fresh customer lookup. |
| full | g21-copperline-buyer | served | true | pass | fail | pass | fail | Correct Hana Ikeda and email address, with no obsolete phone contact. No fresh Copperline lookup. |
| full | g07-depot-release | served | true | pass | fail | fail | fail | Correct Tomasz Brennan, today deadline before Friday absence, and FL-660412. No fresh lookup_order. |
| records | g17-phone-list | served | false | fail | fail | pass | fail | Omits the outstanding Dalia callback and 555-0175; offers unrelated Sigrid/Owen contacts and a warehouse role instead. No fresh lookup. |
| aggregate | g11-grace-signoff-today | served | true | ambiguous | fail | pass | fail | Correct Ruth Adeyemi sign-off today. 'Since ... has not provided an update ... by the end of the day' at a noon request can be read as an unsupported elapsed deadline or an awkward restatement of the conditional dispatch rule. No fresh lookup under either reading. |
| full | g17-phone-list | served | true | pass | fail | pass | fail | Correct Dalia callback at 555-0175. Tomasz is explicitly conditional on a depot hold and is not asserted to have an active task; no unknown number is invented. No fresh lookup for Dalia's order/account. |
| aggregate | g02-luis-card | served | true | pass | pass | pass | pass | Fresh LH-44870 customer lookup and correct Mastercard ending 7719. |
| records | g06-kenji-shipping | served | false | fail | pass | pass | fail | Fresh order lookup and correct shipment/tracking, but the customer draft supplies October 12 arrival and claims the gift note has not been added. The lookup establishes only absent recorded wording, not physical omission or ongoing work to add it. |
| aggregate | g08-halvorsen-credit | served | false | fail | pass | pass | fail | Fresh account lookup and correct manager, but the $3,000 reorder fits $3,760 available credit; the asserted excess is arithmetically wrong. |
| aggregate | g06-kenji-shipping | served | false | fail | pass | pass | fail | Fresh order lookup and correct shipment/tracking. Customer draft still writes the October 12 delivery estimate against the desk's no-written-delivery-date instruction. The absence of recorded gift wording does not establish omitted packing. |
| records | g15-luis-returns | served | true | fail | pass | pass | fail | Correct amount, card, and date with fresh customer lookup, but invents refund completion today and a 3-5-day timescale, and contradicts the October 21 deadline by saying no specific deadline applies. |
| full | g24-halvorsen-claim | served | false | fail | pass | pass | fail | Fresh order lookup supports delivery, pro number, and October 16 deadline, but the answer omits the decisive reopened damage: 2 of 8 pendants have cracked glass. It therefore does not answer their state or establish why a claim is needed. |
| records | g22-kenji-returns | served | false | pass | fail | pass | fail | Correct gift text and second replacement dispatch today. The October 12 value is expressly an original estimate in internal commentary, while the customer draft gives no arrival date; it is not a fresh promise for the second kettle. Recall is not a fresh lookup. |
| aggregate | g13-farah-address | served | true | pass | fail | pass | fail | Correct 91 Quarry Lane; 19 appears only in an explicit correction. No fresh Farah lookup. |
| records | g23-grace-reopened | served | false | fail | fail | pass | fail | Correct wrong twin duvet and reopened trace, but asserts expired Ruth coverage, omits PW-5521-9930, and says replacement dropped after reopening revived it. No fresh lookup. |
| full | g02-luis-card | served | true | pass | pass | pass | pass | Fresh LH-44870 customer lookup and correct Mastercard ending 7719. |
| records | g14-beatriz-remedy | served | true | pass | fail | pass | fail | Correct sage exchange and PW-7042-1185; already shipped status is supported. Recall is not a fresh Beatriz lookup. |
| aggregate | g24-halvorsen-claim | served | false | fail | fail | pass | fail | Correct delivery, pro number, and claim deadline, but omits cracked glass in 2 of 8 pendants and the reopened damage claim. Recall returns only an old question and no fresh lookup occurs. |
| records | g11-grace-signoff-today | served | true | ambiguous | fail | pass | fail | Correct Ruth sign-off within Friday coverage. End-of-day nonresponse is presented at noon as if established, but might be awkward conditional dispatch wording. No fresh lookup under either reading. |
| aggregate | g16-walk-in-return | served | true | pass | pass | pass | pass | Correct counter closure and Monday return. Generic counter-policy request requires no account/order lookup. |
| aggregate | g05-luis-approval-note | served | true | pass | fail | fail | fail | Correct $289 full-refund draft with active MX-4486. Recall supplies policy but does not satisfy the required fresh lookup_order. |
| records | g02-luis-card | served | true | pass | pass | pass | pass | Fresh LH-44870 lookup and correct Mastercard 7719. Future refund wording matches the requested payment method and does not assert completed processing. |
| full | g22-kenji-returns | served | true | fail | fail | pass | fail | Correct exact gift text and dispatch today, but does not answer the arrival question or say an arrival date is unavailable. 'Included this time' implies an earlier missing gift note that the source does not establish. No fresh lookup. |
| records | g09-kenji-gift-note | served | true | pass | fail | fail | fail | Exact gift text is correct and recall occurs, but the separate fresh lookup_order requirement is absent. |
| records | g12-copperline-gesture | served | true | pass | fail | pass | fail | Correct free freight on the next order; $50 credit is explicitly replaced. Recall is not a fresh Copperline lookup. |
| full | g19-farah-code | served | false | fail | fail | pass | fail | Offers LATE10 after its October 9 expiry. On October 10 the applicable code is WKND15. No fresh Farah lookup. |
| full | g03-grace-escalation | served | true | pass | fail | fail | fail | Internal-note content correctly identifies Marcus sign-off, Priya as copied, and PW-5521-9930; the requested written note is present despite surrounding future wording. No fresh lookup_order. |
