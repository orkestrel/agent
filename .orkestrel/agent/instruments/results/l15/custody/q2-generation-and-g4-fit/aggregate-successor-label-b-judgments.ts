/** Records the independently authored group judgments and source quotation indexes. */
export const judgments = [
	[0, 'supported', [
		['Warehouse employee Tomasz Brennan issues releases for items stuck at carrier depots.', 'supported', [0]],
		['In the October 8 source frame, Tomasz is off Friday October 9, so requests must reach him October 8.', 'supported', [1]],
		['The warehouse sent the sage rug for LH-83317 on October 9 afternoon through Parcelway, tracking PW-7042-1185.', 'supported', [3]],
	]],
	[1, 'supported', [
		['Refunds over $200 require a manager approval code in the internal note.', 'supported', [0]],
		['MX-4486 replaces the invalid MX-4471 approval code.', 'supported', [1, 2]],
		['Opened-item returns again receive full refunds.', 'supported', [4, 5]],
	]],
	[2, 'supported', [
		['Warehouse employee Tomasz Brennan issues releases for items stuck at carrier depots.', 'supported', [0]],
		['In the October 8 source frame, Tomasz is off Friday October 9, so requests must reach him October 8.', 'supported', [1]],
		['The user asks for a check of the Halvorsen shipment location; no completed check is claimed.', 'supported', [2]],
	]],
	[3, 'supported', [
		['The director scrapped the 15 percent restocking fee on October 8 morning.', 'supported', [1]],
		['Opened-item returns again receive full refunds.', 'supported', [2]],
		['Luis Ferreira, account LH-44870, wants to return the opened stand mixer from LH-79215.', 'supported', [0]],
	]],
	[4, 'supported', [
		['Refunds over $200 require a manager approval code in the internal note.', 'supported', [0]],
		['MX-4486 replaces the invalid MX-4471 approval code.', 'supported', [1, 2]],
		['Opened-item returns again receive full refunds.', 'supported', [4, 5]],
	]],
	[5, 'supported', [
		['The third rule requires copying refunds-team member Priya Raman on every escalation.', 'supported', [0]],
		['Warehouse employee Tomasz Brennan issues releases for items stuck at carrier depots.', 'supported', [2]],
		['Hana Ikeda is the replacement Copperline buyer, reachable only by email at hana.ikeda@copperline.example. The Owen Pritchard heading is preserved from the source, without claiming Owen remains buyer.', 'supported', [14, 15]],
	]],
	[6, 'ambiguous', [
		['Halvorsen Interiors, wholesale account LH-31055, is escalating late lighting order LH-80941 for $1,240.', 'supported', [0]],
		['The October 8 lookup identifies LH-80941 as 8 brass pendant lights for Halvorsen account LH-31055, totaling $1,240.', 'supported', [6]],
		['The candidate ends the Freightline pro number at FL-66. The source gives FL-660412; it is unresolved whether the candidate asserts a different complete identifier or leaves the identifier unfinished. Exact identity cannot be established from the candidate.', 'ambiguous', [7]],
	]],
	[7, 'contradicted', [
		['The third rule requires copying refunds-team member Priya Raman on every escalation.', 'supported', [0]],
		['Grace has two earlier claims, which are the reason a replacement requires prior sign-off.', 'supported', [3]],
		['The candidate leaves Marcus as the required signer without the later temporary delegation. The sources assign normally-Marcus sign-offs to deputy manager Ruth Adeyemi until October 9 and say Marcus attends the summit on October 9.', 'contradicted', [3, 7, 8]],
		['On October 9, Parcelway has no answer on TR-3307; sending Grace a replacement is conditional on nothing turning up by that day end, not completed dispatch.', 'supported', [13, 14]],
	]],
	[8, 'supported', [
		['Opened-item returns again receive full refunds.', 'supported', [2]],
		['The October 9 exchange request refers to Beatriz Solano in the supplied source: she wants the sage rug instead of a refund, without a claim of shipment.', 'supported', [3, 4]],
		['The October 10 correction cancels the Saturday counter opening: facilities closed it all day for floor work, and walk-in returns wait until Monday.', 'supported', [5, 6]],
	]],
	[9, 'supported', [
		['The third rule requires copying refunds-team member Priya Raman on every escalation.', 'supported', [0]],
		['Warehouse employee Tomasz Brennan issues releases for items stuck at carrier depots.', 'supported', [2]],
		['Deputy manager Ruth Adeyemi gives normally-Marcus sign-offs only until the stated October 9 limit.', 'supported', [6, 7]],
	]],
	[10, 'supported', [
		['On October 10, Dalia Moreno, account LH-66208, left a voicemail requesting a callback at 555-0175 to book a delivery slot for sofa order LH-86610; booking is not claimed completed.', 'supported', [16]],
		['The third rule requires copying refunds-team member Priya Raman on every escalation.', 'supported', [0]],
		['Warehouse employee Tomasz Brennan issues releases for items stuck at carrier depots.', 'supported', [2]],
	]],
	[11, 'ambiguous', [
		['Luis Ferreira, account LH-44870, wants to return the opened stand mixer from LH-79215.', 'supported', [0]],
		['The October 8 lookup gives Luis order LH-79215 as a 5-quart stand mixer totaling $289.', 'supported', [1]],
		['The order was delivered September 21, 2026.', 'supported', [2]],
		['The candidate ends the return deadline at 202. The source supplies October 21, 2026, but the candidate leaves its material deadline incomplete and cannot establish that date.', 'ambiguous', [2]],
	]],
	[12, 'supported', [
		['Copperline Cafes, wholesale account LH-71592, reports late bistro-chair order LH-84056.', 'supported', [0]],
		['The October 8 lookup identifies LH-84056 as 24 oak bistro chairs for Copperline account LH-71592, totaling $2,880.', 'supported', [2]],
		['On October 10, the Copperline accounts team requests a $1,500 reorder on credit; approval or placement is not claimed.', 'supported', [8]],
	]],
	[13, 'supported', [
		['The third rule requires copying refunds-team member Priya Raman on every escalation.', 'supported', [0]],
		['Warehouse employee Tomasz Brennan issues releases for items stuck at carrier depots.', 'supported', [2]],
		['Sigrid Halvorsen only takes calls after 2 pm on her direct extension 4127.', 'supported', [5]],
	]],
	[14, 'ambiguous', [
		['Warehouse employee Tomasz Brennan issues releases for items stuck at carrier depots.', 'supported', [0]],
		['Tomasz is off Friday October 9 and therefore release requests must reach him October 8. The explicit Friday date anchors the associated tomorrow and today language.', 'supported', [1]],
		['Grace Okafor, account LH-20418, reports nonreceipt of LH-77302 and wants a replacement.', 'supported', [4]],
		['Parcelway has not answered Grace trace TR-3307, and replacement is conditional on no result by day end. Combining this with the October 8 today/tomorrow frame without its October 9 source date leaves the replacement deadline materially unresolved.', 'ambiguous', [1, 6, 14, 15]],
		['Dalia Moreno, account LH-66208, left a voicemail requesting a callback at 555-0175 to book a slot for sofa order LH-86610; booking is not claimed completed.', 'supported', [23]],
	]],
	[15, 'supported', [
		['Beatriz Solano, account LH-60214, received a rust-colored rug instead of the sage rug ordered on LH-83317.', 'supported', [0, 2]],
		['On October 9, Beatriz changed her preference from a refund to a sage-rug exchange.', 'supported', [3, 4, 5]],
		['The warehouse sent the sage rug for LH-83317 on October 9 afternoon through Parcelway, tracking PW-7042-1185.', 'supported', [6]],
	]],
	[16, 'supported', [
		['Warehouse employee Tomasz Brennan issues releases for items stuck at carrier depots.', 'supported', [0]],
		['Grace Okafor, account LH-20418, reports nonreceipt of LH-77302 and wants a replacement; the supplied later messages do not report her receiving it.', 'supported', [4, 14, 15]],
		['Dalia Moreno, account LH-66208, left a voicemail requesting a callback at 555-0175 to book a delivery slot for sofa order LH-86610; booking is not claimed completed.', 'supported', [23]],
	]],
	[17, 'supported', [
		['The third rule requires copying refunds-team member Priya Raman on every escalation.', 'supported', [0]],
		['Warehouse employee Tomasz Brennan issues releases for items stuck at carrier depots.', 'supported', [2]],
		['Deputy manager Ruth Adeyemi gives normally-Marcus sign-offs only until the stated October 9 limit.', 'supported', [6, 7]],
	]],
	[18, 'contradicted', [
		['Warehouse employee Tomasz Brennan issues releases for items stuck at carrier depots.', 'supported', [0]],
		['Grace Okafor, account LH-20418, reports nonreceipt of LH-77302 and wants a replacement.', 'supported', [4, 14, 15]],
		['Copperline is wholesale account LH-71592 and the bistro-chair order is LH-84056.', 'supported', [8]],
		['The candidate retains the late-order status without marking it inactive, although the later message reports all 24 chairs arrived October 9 morning. The October 8 source prefix alone does not state that the delay ended.', 'contradicted', [8, 17, 18]],
	]],
	[19, 'ambiguous', [
		['The instruction is to phone Freightline Riverside at 555-0188 every morning for Halvorsen lights status while ESC-2219 remains open; the condition is preserved.', 'supported', [4]],
		['The October 9 lookup identifies LH-80941 as 8 brass pendant lights for Halvorsen account LH-31055, totaling $1,240.', 'supported', [6]],
		['The carrier damage-claim deadline is truncated to 2. The source states October 16, 2026, but the candidate does not establish that material deadline.', 'ambiguous', [9]],
	]],
	[20, 'contradicted', [
		['The third rule requires copying refunds-team member Priya Raman on every escalation.', 'supported', [0]],
		['Grace has two earlier claims, which are the reason a replacement requires prior sign-off.', 'supported', [3]],
		['The candidate leaves Marcus as the required signer without the later temporary delegation. The sources assign normally-Marcus sign-offs to deputy manager Ruth Adeyemi until October 9 and say Marcus attends the summit on October 9.', 'contradicted', [3, 7, 8]],
		['On October 9, Parcelway has no answer on TR-3307; sending Grace a replacement is conditional on nothing turning up by that day end, not completed dispatch.', 'supported', [13, 14]],
	]],
	[21, 'supported', [
		['Warehouse employee Tomasz Brennan issues releases for items stuck at carrier depots.', 'supported', [0]],
		['Grace Okafor, account LH-20418, reports nonreceipt of LH-77302 and wants a replacement.', 'supported', [4]],
		['Kenji Nakamura replacement kettle order LH-81660 needs a gift note reading Happy 40th, Aiko; adding it is not claimed completed.', 'supported', [3]],
	]],
	[22, 'supported', [
		['The third rule requires copying refunds-team member Priya Raman on every escalation.', 'supported', [0]],
		['Grace replacement requires prior Marcus sign-off because of two earlier claims. Ruth temporary substitution expires by October 9, preceding the October 10 evidence; the ordinary rule is available again.', 'supported', [3, 7, 8, 17]],
		['On October 10, Grace still wants her own replacement after opening the wrong duvet parcel.', 'supported', [17, 18]],
	]],
	[23, 'supported', [
		['Warehouse employee Tomasz Brennan issues releases for items stuck at carrier depots.', 'supported', [0]],
		['Grace Okafor, account LH-20418, reports nonreceipt of LH-77302 and wants a replacement; the supplied later messages do not report her receiving it.', 'supported', [4, 14, 15]],
		['Dalia Moreno, account LH-66208, left a voicemail requesting a callback at 555-0175 to book a delivery slot for sofa order LH-86610; booking is not claimed completed.', 'supported', [23]],
	]],
	[24, 'supported', [
		['Warehouse employee Tomasz Brennan issues releases for items stuck at carrier depots.', 'supported', [0]],
		['On October 9, Parcelway has no answer on Grace trace TR-3307; sending her a replacement is conditional on nothing turning up by that day end.', 'supported', [6, 14, 15]],
		['Copperline Cafes, wholesale account LH-71592, reports late bistro-chair order LH-84056; no completion is present in this supplied evidence.', 'supported', [8]],
	]],
	[25, 'supported', [
		['The third rule requires copying refunds-team member Priya Raman on every escalation.', 'supported', [0]],
		['Grace replacement requires prior Marcus sign-off because of two earlier claims.', 'supported', [3]],
		['Halvorsen Interiors, wholesale account LH-31055, is escalating late lighting order LH-80941 for $1,240.', 'supported', [4]],
		['Halvorsen ticket is ESC-2219, using the corrected identifier.', 'supported', [5, 6]],
	]],
	[26, 'supported', [
		['Grace Okafor, account LH-20418, reports nonreceipt of LH-77302 and wants a replacement. A carrier delivered marker does not contradict the attributed customer report.', 'supported', [0, 2]],
		['Grace replacement requires prior Marcus sign-off because of two earlier claims; this evidence contains no delegation.', 'supported', [4, 6]],
		['On October 9, Parcelway has no answer on Grace trace TR-3307; sending her a replacement is conditional on nothing turning up by that day end.', 'supported', [7, 9, 10]],
	]],
	[27, 'supported', [
		['The third rule requires copying refunds-team member Priya Raman on every escalation.', 'supported', [0]],
		['Grace replacement requires prior Marcus sign-off because of two earlier claims. Ruth temporary substitution expires by October 9, preceding the October 10 evidence; the ordinary rule is available again.', 'supported', [3, 7, 8, 17]],
		['The October 10 instruction is to reopen TR-3307, not a claim that reopening has been executed.', 'supported', [17]],
		['Grace opened the parcel from locker 14 and found a twin duvet addressed to someone else, rather than her queen set.', 'supported', [17]],
	]],
	[28, 'supported', [
		['The third rule requires copying refunds-team member Priya Raman on every escalation.', 'supported', [0]],
		['Warehouse employee Tomasz Brennan issues releases for items stuck at carrier depots.', 'supported', [2]],
		['Deputy manager Ruth Adeyemi gives normally-Marcus sign-offs only until the stated October 9 limit.', 'supported', [6, 7]],
	]],
	[29, 'supported', [
		['Warehouse employee Tomasz Brennan issues releases for items stuck at carrier depots.', 'supported', [0]],
		['The warehouse sent the sage rug for LH-83317 on October 9 afternoon through Parcelway, tracking PW-7042-1185.', 'supported', [3]],
		['The replacement kettle for Kenji Nakamura on LH-81660 arrived with a dented lid, resolving the bracketed identity from the adjacent source.', 'supported', [5]],
		['The warehouse is sending Kenji another kettle on October 10; the candidate preserves the ongoing/planned status rather than asserting completed dispatch.', 'supported', [5, 6]],
	]],
	[30, 'supported', [
		['Opened-item returns again receive full refunds.', 'supported', [2]],
		['The October 9 exchange request refers to Beatriz Solano in the supplied source: she wants the sage rug instead of a refund.', 'supported', [3, 4]],
		['The October 9 source announces the counter open Saturday October 10 from 9 am to 1 pm; this evidence contains no later cancellation.', 'supported', [5]],
	]],
	[31, 'supported', [
		['The third rule requires copying refunds-team member Priya Raman on every escalation.', 'supported', [0]],
		['Grace replacement requires prior Marcus sign-off because of two earlier claims. Ruth temporary substitution expires by October 9, preceding the October 10 evidence; the ordinary rule is available again.', 'supported', [3, 7, 8, 15]],
		['Hana Ikeda is the replacement Copperline buyer, reachable only by email at hana.ikeda@copperline.example. The Owen Pritchard heading is preserved from the source, without claiming Owen remains buyer.', 'supported', [15, 16]],
	]],
	[32, 'supported', [
		['Opened-item returns again receive full refunds.', 'supported', [2]],
		['The director scrapped the 15 percent restocking fee on October 8 morning.', 'supported', [1]],
		['Luis Ferreira, account LH-44870, wants to return the opened stand mixer from LH-79215.', 'supported', [0]],
	]],
	[33, 'contradicted', [
		['Halvorsen Interiors is wholesale account LH-31055 and its lighting order LH-80941 totals $1,240.', 'supported', [0, 6]],
		['The candidate retains the late-order escalation without marking the delay ended, although the later lookup reports delivery on October 9 at 7:40 am. Its October 8 source prefix alone does not mark the late status inactive.', 'contradicted', [0, 7]],
		['The corrected Halvorsen escalation identifier is ESC-2219, not ESC-2291.', 'supported', [1, 2]],
		['The instruction is to phone Freightline Riverside at 555-0188 every morning for Halvorsen lights status while ESC-2219 remains open; the condition is preserved.', 'supported', [4]],
	]],
	[34, 'supported', [
		['Warehouse employee Tomasz Brennan issues releases for items stuck at carrier depots.', 'supported', [0]],
		['On October 9, Parcelway has no answer on Grace trace TR-3307; sending her a replacement is conditional on nothing turning up by that day end.', 'supported', [6, 14, 15]],
		['Marcus changed the late-wholesale-order offer from $50 store credit to free freight on the next order; the old offer is explicitly superseded.', 'supported', [16]],
	]],
	[35, 'supported', [
		['The October 8 lookup identifies LH-84056 as 24 oak bistro chairs for Copperline account LH-71592, totaling $2,880.', 'supported', [2]],
		['The order shipped October 1 by Freightline under pro number FL-661978.', 'supported', [3]],
		['The order is in transit, delayed by a linehaul shortage at the Dunmore hub. This supplied evidence contains no delivery completion; the final Copperline fragment adds no predicate or material value.', 'supported', [3]],
	]],
	[36, 'supported', [
		['Grace Okafor, account LH-20418, reports nonreceipt of LH-77302 and wants a replacement. The October 10 wrong-parcel discovery displaces the intervening report that she collected her own duvet.', 'supported', [0, 11, 12, 13, 14]],
		['Grace replacement requires prior Marcus sign-off because of two earlier claims.', 'supported', [4, 6]],
		['On October 10, Grace still wants her own replacement after opening the wrong duvet parcel.', 'supported', [13, 14]],
	]],
	[37, 'supported', [
		['Farah wants LH-85123 redirected to Quarry Lane, Ashby; the candidate explicitly corrects the earlier house number 19 to 91, making 19 inactive.', 'supported', [0, 1, 4, 5]],
		['The instruction is to chase Parcelway each afternoon until Farah curtains arrive, without claiming a completed redirect or completed chase.', 'supported', [6, 7]],
	]],
	[38, 'supported', [
		['On October 10, Dalia Moreno, account LH-66208, left a voicemail requesting a callback at 555-0175 to book a delivery slot for sofa order LH-86610; booking is not claimed completed.', 'supported', [23]],
	]],
	[39, 'supported', [
		['The third rule requires copying refunds-team member Priya Raman on every escalation.', 'supported', [0]],
		['Warehouse employee Tomasz Brennan issues releases for items stuck at carrier depots.', 'supported', [2]],
		['Deputy manager Ruth Adeyemi gives normally-Marcus sign-offs only until the stated October 9 limit. The candidate preserves this expiration rather than extending the delegation into October 10.', 'supported', [6, 7]],
	]],
	[40, 'contradicted', [
		['Grace Okafor, account LH-20418, reports nonreceipt of LH-77302 and wants a replacement.', 'supported', [4, 14, 15]],
		['On October 9, Parcelway has no answer on Grace trace TR-3307; sending her a replacement is conditional on nothing turning up by that day end.', 'supported', [6, 14, 15]],
		['Copperline is wholesale account LH-71592 and the bistro-chair order is LH-84056.', 'supported', [8]],
		['The candidate retains the late-order status without marking it inactive, although the later message reports all 24 chairs arrived October 9 morning. The October 8 source prefix alone does not state that the delay ended.', 'contradicted', [8, 17, 18]],
	]],
	[41, 'supported', [
		['Grace Okafor, account LH-20418, reports nonreceipt of LH-77302 and wants a replacement. A carrier delivered marker does not contradict the attributed customer report.', 'supported', [0, 2]],
		['The October 8 lookup identifies Grace order LH-77302 as a queen linen duvet set totaling $148.50.', 'supported', [1]],
		['Grace replacement requires prior Marcus sign-off because of two earlier claims.', 'supported', [4, 6]],
	]],
	[42, 'supported', [
		['The October 8 lookup identifies LH-84056 as 24 oak bistro chairs for Copperline account LH-71592, totaling $2,880.', 'supported', [2]],
		['The order shipped October 1 by Freightline under pro number FL-661978.', 'supported', [3]],
		['The order is in transit, delayed by a linehaul shortage at the Dunmore hub. This supplied evidence contains no delivery completion; the final lookup_ fragment adds no factual result.', 'supported', [3]],
	]],
	[43, 'supported', [
		['Farah Haddad, account LH-58841, has moved house.', 'supported', [0]],
		['The October 9 lookup identifies Farah order LH-85123 as 2 blackout-curtain panels totaling $134.', 'supported', [2]],
		['Farah corrected redirect house number is 91 Quarry Lane, explicitly replacing 19.', 'supported', [4, 5]],
	]],
	[44, 'supported', [
		['Opened-item returns again receive full refunds.', 'supported', [2]],
		['Luis Ferreira, account LH-44870, wants to return the opened stand mixer from LH-79215.', 'supported', [0]],
		['The October 9 exchange request refers to Beatriz Solano in the supplied source: she wants the sage rug instead of a refund. The candidate does not expressly assign this rug request to Luis.', 'supported', [3, 4]],
	]],
] as const
