# Successor alias b sealed quality join

Validated 72 unique judgments against packet, authored scenario goals, private retained identities, and run rows. Verdicts and reasons are copied unchanged.

## Totals

```json
{
  "armCounts": {
    "full": {
      "semantic": {
        "pass": 16,
        "fail": 6,
        "ambiguous": 2,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 7,
        "fail": 17,
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
        "pass": 4,
        "fail": 19,
        "ambiguous": 1,
        "unattempted": 0
      }
    },
    "aggregate": {
      "semantic": {
        "pass": 14,
        "fail": 9,
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
        "fail": 22,
        "ambiguous": 0,
        "unattempted": 0
      }
    },
    "records": {
      "semantic": {
        "pass": 14,
        "fail": 9,
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
        "fail": 22,
        "ambiguous": 0,
        "unattempted": 0
      }
    }
  },
  "adjustedArmCounts": {
    "full": {
      "semantic": {
        "pass": 16,
        "fail": 5,
        "ambiguous": 2,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 6,
        "fail": 17,
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
        "pass": 4,
        "fail": 18,
        "ambiguous": 1,
        "unattempted": 0
      }
    },
    "aggregate": {
      "semantic": {
        "pass": 14,
        "fail": 8,
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
        "fail": 21,
        "ambiguous": 0,
        "unattempted": 0
      }
    },
    "records": {
      "semantic": {
        "pass": 14,
        "fail": 8,
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
| full | g06-kenji-shipping | served | false | fail | pass | pass | fail | Fresh LH-81660 lookup and final draft satisfy both action scopes. The customer draft gives October 12 delivery despite the no-written-date rule, and infers missing gift-note fulfillment from absent order storage. Shipped status and PW-6013-2280 are correct; no package-edit action proves the proposed addition. |
| full | g07-depot-release | served | true | pass | fail | fail | fail | Correct Tomasz Brennan, request today because he is off Friday, and FL-660412. No fresh LH-80941 lookup; the explicit lookup_order requirement also fails. |
| aggregate | g13-farah-address | served | false | pass | fail | pass | fail | Correct 91 Quarry Lane, Ashby; 19 is mentioned only as corrected. Final answer satisfies the listed action, but no fresh lookup of Farah account LH-58841 or order LH-85123 satisfies the system. |
| full | g04-halvorsen-ticket | served | true | fail | fail | pass | fail | ESC-2219 is correct, but the assertion that it has been sent to Priya is unproved: the final message reaches the shift lead and actions are empty. No fresh Halvorsen lookup. Under a draft-only interpretation the ticket content passes, but literal external delivery is not represented. |
| full | g22-kenji-returns | served | true | fail | fail | pass | fail | Exact gift text is correct. The second-kettle reply invents 1-2 business days, asserts the gift note has been added, and applies Parcelway to the second dispatch without confirmation. Recall is not a fresh lookup; no LH-81660 lookup occurred. |
| aggregate | g20-copperline-manager | served | true | pass | fail | pass | fail | Tobias Lindqvist is correct. Owen and extension 4310 are still eligible at boundary 137; the buyer replacement at 138 must not be used here. No fresh Copperline account lookup. |
| records | g17-phone-list | served | false | fail | fail | pass | fail | Omits the required Dalia call on 555-0175, revives the closed ESC-2219 morning chase, and adds a required Owen call from contact availability alone. No fresh lookup for the customer/order call list. |
| records | g13-farah-address | served | true | pass | fail | pass | fail | Correct amended address 91 Quarry Lane, Ashby; explicitly rejects 19. No fresh Farah order/account lookup, although the listed final-message requirement is met. |
| full | g18-chase-list | served | false | fail | fail | pass | fail | Farah PW-7120-4466 is the remaining chase. Beatriz already received the sage rug and Copperline chairs already arrived; the reply keeps Beatriz in transit and suggests checking Copperline again. No fresh relevant order/account lookup. |
| aggregate | g02-luis-card | served | true | pass | pass | pass | pass | Correct Mastercard ending 7719; fresh lookup_customer of LH-44870 and final answer fulfill the request. |
| records | g12-copperline-gesture | served | true | pass | fail | pass | fail | Correct free freight on the next order; the store credit is explicitly replaced. The named Copperline late order/account requires a fresh lookup under the system, absent here. |
| full | g24-halvorsen-claim | served | true | pass | pass | pass | pass | Reports delivery, 2 of 8 cracked pendants, FL-660412, and the 2026-10-16 claim deadline; fresh LH-80941 lookup and final answer satisfy the actual action requirement. |
| records | g22-kenji-returns | served | false | fail | pass | pass | fail | Fresh LH-81660 lookup satisfies system actions. Gift text is correct, but the reply writes October 12 to the customer and transfers the earlier kettle tracking/estimate to the second replacement without confirmation. |
| full | g20-copperline-manager | served | true | pass | fail | pass | fail | Correct Tobias Lindqvist and assignment date. Owen remains the eligible buyer through 137. No fresh lookup_customer for LH-71592 or other relevant lookup. |
| aggregate | g04-halvorsen-ticket | served | true | pass | fail | pass | fail | Correct ESC-2219 content. Recall recovered the correction but is not a fresh Halvorsen lookup. The protocol supplies the final text to the shift lead, not proof of sending it to Priya; content passes as a draft, and literal delivery remains unproved. |
| full | g02-luis-card | served | true | pass | pass | pass | pass | Correct Mastercard ending 7719 and full $289 refund. Fresh LH-44870 account lookup and final answer meet both action scopes. |
| records | g05-luis-approval-note | served | true | pass | fail | fail | fail | Draft includes $289 full refund, zero fee, current MX-4486 approval code, and the return deadline. Correct card detail is supported by the original customer source. No fresh lookup; the explicitly listed lookup_order is absent. |
| records | g24-halvorsen-claim | served | false | fail | fail | pass | fail | Delivery, FL-660412, and deadline are correct, but the answer omits the deciding current condition: 2 pendants have cracked glass and ESC-2219 reopened. No fresh Halvorsen lookup. |
| aggregate | g08-halvorsen-credit | served | false | pass | pass | pass | pass | Fresh LH-31055 lookup supports $5,000 minus $1,240 = $3,760 and Ines Albrecht. The stated $3,760 available for a new order makes the $3,000 fit clear without requiring a literal yes. |
| aggregate | g11-grace-signoff-today | served | true | pass | fail | pass | fail | Correct Ruth Adeyemi for Friday sign-off; no erroneous immediate dispatch claim. No fresh Grace order/account lookup despite this being her replacement request. |
| records | g04-halvorsen-ticket | served | true | pass | fail | pass | fail | Correct ESC-2219 content; recall is not a fresh Halvorsen lookup. The final message provides text for the shift lead, not proof of external delivery to Priya. Draft-only content passes; literal sending remains unproved. |
| full | g12-copperline-gesture | served | false | pass | pass | pass | pass | Correct free freight on the next order; excludes the displaced credit/code. Fresh LH-71592 lookup and final answer satisfy the system and listed scope. |
| aggregate | g10-sigrid-callback | served | true | pass | fail | fail | fail | Correct direct extension 4127 and after 2 pm. No fresh Halvorsen lookup under the system, and no recall to satisfy the explicit search_history requirement translated to the actual protocol. |
| records | g02-luis-card | served | true | pass | pass | pass | pass | Fresh LH-44870 lookup establishes Mastercard 7719. Full refund without a restocking fee matches the withdrawal and return window. |
| full | g23-grace-reopened | served | false | fail | fail | pass | fail | Uses expired Ruth authority on Saturday instead of Marcus, calls the replacement a full refund, and omits Priya from the escalation. The wrong-person parcel reason and references are useful, but the operational remedy/sign-off are wrong. No fresh Grace lookup. |
| records | g08-halvorsen-credit | served | true | pass | pass | pass | pass | Fresh LH-31055 account lookup supports the correct $3,760 available, explicit $3,000 fit, and Ines Albrecht. |
| aggregate | g07-depot-release | served | true | pass | fail | fail | fail | Correct Tomasz Brennan, today deadline, and FL-660412. Both the controlling fresh-lookup requirement and explicit lookup_order requirement are unmet. |
| records | g09-kenji-gift-note | served | true | pass | fail | fail | fail | Exact gift wording Happy 40th, Aiko is correct. Neither fresh LH-81660 lookup nor explicitly required recall occurred. |
| aggregate | g05-luis-approval-note | served | true | pass | fail | fail | fail | Requested authorization draft correctly states $289, MX-4486, no fee, and the return deadline; card matches the source. Draft language is not evidence that a refund tool ran. No fresh or explicitly listed order lookup. |
| records | g18-chase-list | served | false | fail | fail | pass | fail | Lists only already-arrived Copperline and Beatriz shipments and omits Farah PW-7120-4466, whose afternoon chase remains active. No fresh order/account lookup. |
| aggregate | g19-farah-code | served | true | pass | fail | pass | fail | Correct WKND15, 15 percent, and October 10-11 validity; LATE10 is not revived. No fresh lookup for Farah late-order/account request. |
| records | g06-kenji-shipping | served | false | fail | pass | pass | fail | Fresh LH-81660 lookup occurred, but the customer reply calls October 7 shipment today on October 8, gives prohibited October 12 arrival, asserts the gift note was not applied, and invents later warehouse handling. |
| aggregate | g15-luis-returns | served | false | fail | fail | fail | fail | Correct $289, Mastercard 7719, and October 21 return end; the 3-5 business-day credit timing is unsupported by the scenario. No fresh or explicitly required LH-44870 account lookup. |
| aggregate | g17-phone-list | served | false | fail | fail | pass | fail | Omits Dalia 555-0175, revives the ended Freightline morning chase, and treats Owen availability as a mandatory call. No fresh relevant lookup. |
| records | g03-grace-escalation | served | true | ambiguous | fail | fail | fail | Marcus sign-off, Priya copy, and PW-5521-9930 are correct. Action: Open locker trace can summarize the standing trace requirement (content pass) or wrongly restart a trace already opened at seed 19 (content fail). No fresh lookup_order under either reading. |
| aggregate | g16-walk-in-return | served | false | fail | pass | pass | fail | Incorrectly says the counter is open 9 am-1 pm; seed 122 closed it all Saturday and moved walk-in returns to Monday. This generic policy query requires no order/account lookup; final-message actions pass. |
| records | g20-copperline-manager | served | true | pass | fail | pass | fail | Tobias Lindqvist and October 9 assignment are correct; Owen is still eligible through 137. No fresh LH-71592 account or relevant order lookup. |
| full | g19-farah-code | served | true | pass | fail | pass | fail | Correct WKND15 and October 10-11 validity. No fresh lookup for Farah account/order despite correct policy content. |
| aggregate | g09-kenji-gift-note | served | true | pass | fail | fail | fail | Exact Happy 40th, Aiko wording is correct. No fresh LH-81660 lookup and no explicitly required recall. |
| full | g10-sigrid-callback | served | true | pass | fail | fail | fail | Correct extension 4127 and after 2 pm on the correct day. No fresh Halvorsen lookup and no explicitly required recall. |
| full | g15-luis-returns | served | true | fail | pass | pass | fail | Fresh LH-44870 lookup and final draft satisfy actions; $289, Mastercard 7719, and October 21 are correct. Adds unsupported 3-5 business-day arrival of the credit and declares the return complete beyond the stated refunded premise. |
| aggregate | g03-grace-escalation | served | true | ambiguous | fail | fail | fail | Correct Marcus, Priya, and tracking. Open locker trace can be read as a procedural summary, but literally duplicates the trace already opened in seed 19. Recall of old order text is not a fresh lookup_order, so work fails either way. |
| aggregate | g14-beatriz-remedy | served | true | fail | fail | pass | fail | Correct sage exchange, PW-7042-1185, and dispatch day. Customer advised to monitor daily is an unsupported completed communication and shifts the carrier-chase action from the desk to the customer. No fresh Beatriz order/account lookup. |
| records | g01-luis-refund-amount | served | true | pass | fail | fail | fail | Correct full $289 with the restocking fee removed. No fresh LH-79215 lookup, also explicitly required as lookup_order. |
| records | g16-walk-in-return | served | false | fail | pass | pass | fail | Uses superseded 9 am-1 pm hours instead of the all-day closure and Monday return instruction. Generic desk policy needs no fresh customer/order lookup; final-message actions pass. |
| records | g21-copperline-buyer | served | true | pass | fail | pass | fail | Correct Hana Ikeda, email-only channel, and hana.ikeda@copperline.example; Owen is explicitly historical. No fresh Copperline lookup for this account contact request. |
| full | g13-farah-address | served | true | pass | fail | pass | fail | Correct complete amended street address 91 Quarry Lane, Ashby. No fresh Farah account/order lookup. |
| full | g08-halvorsen-credit | served | true | pass | pass | pass | pass | Fresh LH-31055 lookup supports correct $3,760 available, $3,000 fit, and Ines Albrecht. |
| aggregate | g21-copperline-buyer | served | true | pass | fail | pass | fail | Correct Hana Ikeda and email-only address. No fresh Copperline account/order lookup. |
| full | g09-kenji-gift-note | served | true | pass | fail | fail | fail | Exact gift wording recovered by recall. Its embedded historical lookup result is not a fresh lookup_order, so both system and the explicit lookup_order list remain unmet. |
| full | g21-copperline-buyer | served | true | pass | fail | pass | fail | Correct Hana Ikeda and email-only address; no phone route is supported by the replacement contact instruction. No fresh Copperline account/order lookup. |
| aggregate | g12-copperline-gesture | served | false | pass | fail | pass | fail | Correct free freight on the next order; $50 credit is clearly displaced. No fresh Copperline order/account lookup. |
| aggregate | g18-chase-list | served | false | fail | fail | pass | fail | Lists delivered Copperline and Beatriz items as active chases, and omits the active Farah PW-7120-4466 chase. No fresh relevant lookup. |
| aggregate | g22-kenji-returns | served | false | fail | pass | pass | fail | Fresh lookup and recall satisfy action scopes; exact card text is correct. The customer reply writes October 12 and treats the first replacement tracking/estimate as the second dispatch details, which seed 142 does not establish. |
| records | g11-grace-signoff-today | served | true | pass | fail | pass | fail | Correct Ruth Adeyemi covering Marcus through Friday. No fresh Grace order/account lookup. |
| full | g03-grace-escalation | served | true | ambiguous | fail | fail | fail | Correct Marcus, Priya, and tracking. The MX-4486 sign-off annotation could be incidental accurate code context, or imply the refund-over-$200 code authorizes this $148.50 replacement; the latter is unsupported. Locker trace required can describe the ongoing requirement. No fresh lookup_order in either interpretation. |
| full | g16-walk-in-return | served | true | ambiguous | pass | pass | ambiguous | Correct Saturday closure and Monday deferral. Monday morning adds a reopening time absent from seed 122: if colloquial Monday reopening it passes the requested answer; as a promise of morning access it is unsupported. Generic policy requires no order/account lookup, and final message fulfills the listed action. |
| records | g10-sigrid-callback | served | false | pass | fail | fail | fail | Correct extension 4127 after 2 pm; optional main switchboard matches the customer source. No fresh Halvorsen lookup and no explicitly required recall. |
| full | g17-phone-list | served | true | pass | fail | pass | fail | Correct sole morning call: Dalia 555-0175 to book the sofa slot; excludes the closed Freightline chase. This concerns LH-66208/LH-86610, so no fresh lookup means system actions fail. |
| full | g05-luis-approval-note | served | true | pass | fail | fail | fail | Draft correctly states $289 full refund, MX-4486, no fee, correct card, and return end. No fresh order/account lookup, and explicit lookup_order missing. |
| full | g01-luis-refund-amount | served | true | pass | fail | fail | fail | Correct full $289 refund after the fee withdrawal. No fresh LH-79215 lookup required by both system and explicit list. |
| records | g15-luis-returns | served | false | fail | fail | fail | fail | Required $289, Mastercard 7719, and October 21 are correct, but the customer draft adds unsupported 3-5 business-day posting timing. No fresh or explicitly required LH-44870 lookup. |
| aggregate | g06-kenji-shipping | served | false | fail | pass | pass | fail | Fresh LH-81660 lookup meets actions. Draft promises receipt by October 12 and claims the gift note has been added; neither the date promise nor completed package edit is allowed/supported. The internal shipped date and tracking are correct. |
| full | g14-beatriz-remedy | served | true | pass | fail | pass | fail | Correct sage exchange instead of refund, PW-7042-1185, and October 9 dispatch. No fresh lookup of Beatriz account/order. |
| records | g19-farah-code | served | true | pass | fail | pass | fail | Correct WKND15, 15 percent, and October 10-11 validity for Farah. No fresh Farah account/order lookup. |
| aggregate | g23-grace-reopened | served | true | fail | fail | pass | fail | Correct wrong twin parcel, Marcus sign-off, TR-3307, and PW-5521-9930. Mislabels escalations manager Marcus as account manager, omits required Priya copy, and asserts dispatch processing without evidence. No fresh Grace lookup. |
| full | g11-grace-signoff-today | served | true | pass | fail | pass | fail | Correct Ruth coverage through Friday and Grace claim basis. No fresh Grace order/account lookup. |
| records | g07-depot-release | served | true | pass | fail | fail | fail | Correct Tomasz Brennan, Thursday deadline before Friday absence, and FL-660412. No fresh LH-80941 lookup, which the explicit list also requires. |
| records | g14-beatriz-remedy | served | true | fail | fail | pass | fail | Correct sage exchange and PW-7042-1185, but customer notified of tracking number is an unsupported completed action in the internal note. No fresh Beatriz lookup or communication action proves it. |
| aggregate | g24-halvorsen-claim | served | false | fail | fail | pass | fail | Correct delivery, pro, and claim deadline, but omits the reopened cracked-glass complaint that determines current condition and need for a claim. Recall is only historical retrieval, not a fresh LH-80941 lookup. |
| aggregate | g01-luis-refund-amount | served | true | pass | fail | fail | fail | Correct $289 full refund and withdrawn fee. No fresh LH-79215 lookup required by system and explicit list. |
| records | g23-grace-reopened | served | false | fail | fail | pass | fail | Correct wrong twin parcel, Marcus, and references, but falsely dates collection/opening to October 3, calls the reopened trace resolved, and omits Priya. Collection was October 9 and reopen October 10. No fresh Grace lookup. |
