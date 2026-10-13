export type Verdict = 'supported' | 'unsupported' | 'contradicted' | 'ambiguous';
export interface Proposition {
  readonly text: string;
  readonly verdict: Verdict;
  readonly sources: readonly number[];
}
export interface Decision {
  readonly group: number;
  readonly verdict: Verdict;
  readonly propositions: readonly Proposition[];
}
export const decisions: readonly Decision[] = [
  { group: 0, verdict: 'supported', propositions: [
    { text: 'Refunds over $200 require a manager approval code in the internal note.', verdict: 'supported', sources: [0] },
    { text: 'MX-4486 replaces inactive MX-4471.', verdict: 'supported', sources: [1, 2] },
    { text: 'Opened-item returns again receive a full refund after the fee was scrapped.', verdict: 'supported', sources: [4, 5] },
  ] },
  { group: 1, verdict: 'ambiguous', propositions: [
    { text: 'Parcelway had not answered TR-3307 as of the October 9 source.', verdict: 'supported', sources: [11] },
    { text: 'The conditional replacement retains the end-of-day deadline, but "her" has no named antecedent in this candidate; the source identifies Grace, while the only named customer in the candidate is Dalia. The recipient is materially unresolved in the candidate.', verdict: 'ambiguous', sources: [10, 11, 16] },
    { text: 'Dalia Moreno, account LH-66208, requested a callback at 555-0175 to book delivery for sofa order LH-86610 in the October 10 source.', verdict: 'supported', sources: [16] },
  ] },
  { group: 2, verdict: 'supported', propositions: [
    { text: 'The Tomasz topic label and third-person pronoun preserve the source: he is off October 9 and release requests must reach him October 8.', verdict: 'supported', sources: [2, 3] },
    { text: 'The Sigrid topic label preserves her after-2-pm calling window and direct extension 4127.', verdict: 'supported', sources: [4, 5] },
  ] },
  { group: 3, verdict: 'unsupported', propositions: [
    { text: 'Tomasz Brennan in the warehouse issues releases for items stuck at carrier depots.', verdict: 'supported', sources: [0] },
    { text: 'Kenji Nakamura replacement kettle order LH-81660 needs the gift note Happy 40th, Aiko.', verdict: 'supported', sources: [3] },
    { text: 'Grace requests a replacement after reporting LH-77302 missing, but connecting her replacement to the Halvorsen shipment is an added relationship. The Halvorsen source only asks for a shipment check.', verdict: 'unsupported', sources: [4, 5] },
  ] },
  { group: 4, verdict: 'supported', propositions: [
    { text: 'Tomasz issues depot releases and his October 9 absence requires requests on October 8.', verdict: 'supported', sources: [2, 3] },
    { text: 'As of October 9 Parcelway has not answered TR-3307; replacement remains conditional on nothing turning up by that day end.', verdict: 'supported', sources: [10, 11] },
    { text: 'While ESC-2219 remains open, the instruction is to call Freightline Riverside at 555-0188 every morning about the Halvorsen lights.', verdict: 'supported', sources: [8] },
  ] },
  { group: 5, verdict: 'supported', propositions: [
    { text: 'Every escalation must copy Priya Raman from refunds.', verdict: 'supported', sources: [0] },
    { text: 'Grace Okafor emailed again about her duvet in the October 9 source.', verdict: 'supported', sources: [13] },
  ] },
  { group: 6, verdict: 'supported', propositions: [
    { text: 'Kenji reported a dented lid on replacement kettle LH-81660 in the October 10 call; the warehouse is sending another that day.', verdict: 'supported', sources: [27, 28] },
    { text: 'Dalia requested callback at 555-0175 to book delivery of sofa LH-86610.', verdict: 'supported', sources: [23] },
    { text: 'Farah Haddad reported curtains still missing and requested a concession on her next order; the full-name alias is supplied by the earlier Farah record.', verdict: 'supported', sources: [19, 20, 26] },
  ] },
  { group: 7, verdict: 'ambiguous', propositions: [
    { text: 'Luis Ferreira, LH-44870, wants to return the opened stand mixer on LH-79215.', verdict: 'supported', sources: [0] },
    { text: 'Beatriz called back and requested the sage rug as an exchange instead of a refund.', verdict: 'supported', sources: [3, 4] },
    { text: 'Facilities closed the Saturday counter for floor work and returns wait until Monday, replacing the earlier opening hours.', verdict: 'supported', sources: [5, 6] },
    { text: 'The trailing phrase "disregarding previous instructions" can attribute disregard to facilities, whereas the source instructs the reader to disregard the old note. It can also describe the note replacement; the actor meaning is materially ambiguous.', verdict: 'ambiguous', sources: [6] },
  ] },
  { group: 8, verdict: 'supported', propositions: [
    { text: 'Tomasz is the subject of the copied topic label, is off October 9, and must receive release requests October 8 because of that absence.', verdict: 'supported', sources: [0, 1] },
  ] },
  { group: 9, verdict: 'ambiguous', propositions: [
    { text: 'Every escalation must copy Priya Raman from refunds.', verdict: 'supported', sources: [0] },
    { text: 'Parcelway has not answered TR-3307 as of the October 9 source; the replacement deadline remains conditional.', verdict: 'supported', sources: [8] },
    { text: 'The replacement recipient "her" is unresolved in this candidate: Priya precedes it and Dalia follows it, while the source ties the replacement to Grace.', verdict: 'ambiguous', sources: [7, 8, 13] },
    { text: 'Dalia, account LH-66208, requested callback at 555-0175 to book delivery of sofa LH-86610 in the October 10 source.', verdict: 'supported', sources: [13] },
  ] },
  { group: 10, verdict: 'contradicted', propositions: [
    { text: 'The candidate assigns the Kenji report to an October 9 user source, but the supplied report is dated October 10. The event date itself is not independently supplied; the definite mismatch is the source date.', verdict: 'contradicted', sources: [5] },
    { text: 'The October 10 source says the warehouse is sending Kenji another kettle that day.', verdict: 'supported', sources: [5, 6] },
  ] },
  { group: 11, verdict: 'supported', propositions: [
    { text: 'Beatriz, account LH-60214, called back to choose a sage-rug exchange instead of a refund; read in the complete candidate, exchange of the sage rug describes the desired replacement, not return of a received sage rug.', verdict: 'supported', sources: [0, 4, 5] },
    { text: 'The warehouse sent the correct sage rug for LH-83317 on Parcelway PW-7042-1185 that October 9 afternoon.', verdict: 'supported', sources: [0, 1, 2, 6] },
  ] },
  { group: 12, verdict: 'supported', propositions: [
    { text: 'Marcus changed the late-wholesale concession from $50 credit to offering free freight on the next order.', verdict: 'supported', sources: [16] },
    { text: 'Dalia Moreno, LH-66208, requested callback at 555-0175 for a sofa LH-86610 delivery slot.', verdict: 'supported', sources: [23] },
    { text: 'Beatriz reported by email that the sage rug arrived that October 10 morning and was perfect.', verdict: 'supported', sources: [24] },
  ] },
  { group: 13, verdict: 'contradicted', propositions: [
    { text: 'The Tomasz absence and request deadline are put in an October 9 frame while retaining tomorrow/today. The source is October 8, with October 9 the absence and October 8 the request deadline.', verdict: 'contradicted', sources: [1] },
    { text: 'The warehouse sent the sage rug for LH-83317 on Parcelway PW-7042-1185 on the October 9 afternoon.', verdict: 'supported', sources: [3] },
  ] },
  { group: 14, verdict: 'supported', propositions: [
    { text: 'Every escalation must copy Priya Raman from refunds.', verdict: 'supported', sources: [0] },
    { text: 'Halvorsen Interiors, wholesale LH-31055, escalates late lighting order LH-80941 worth $1,240.', verdict: 'supported', sources: [4] },
  ] },
  { group: 15, verdict: 'supported', propositions: [
    { text: 'Grace Okafor, LH-20418, reports LH-77302 never arrived and requests a replacement.', verdict: 'supported', sources: [4] },
    { text: 'Parcelway has not answered TR-3307 as of October 9; her replacement means Grace and remains conditional on no result by that day end.', verdict: 'supported', sources: [6, 14, 15] },
    { text: 'Freightline FL-661978 must be chased every afternoon until Copperline chairs arrive; this evidence set contains no later arrival.', verdict: 'supported', sources: [8, 10] },
  ] },
  { group: 16, verdict: 'supported', propositions: [
    { text: 'Luis Ferreira, LH-44870, requests return of the opened stand mixer on LH-79215.', verdict: 'supported', sources: [0] },
    { text: 'The director scrapped the 15 percent restocking fee that morning, restoring full refunds for opened items and thus the requested mixer return.', verdict: 'supported', sources: [0, 1, 2] },
  ] },
  { group: 17, verdict: 'supported', propositions: [
    { text: 'Every escalation must copy Priya Raman from refunds.', verdict: 'supported', sources: [0] },
    { text: 'Grace emailed again about her duvet as of October 9.', verdict: 'supported', sources: [13] },
    { text: 'Parcelway has not answered TR-3307; Grace is the clear antecedent and the replacement remains a conditional plan at that day end, not completed work.', verdict: 'supported', sources: [13, 14] },
  ] },
  { group: 18, verdict: 'supported', propositions: [
    { text: 'Refunds over $200 require a manager approval code in the internal note.', verdict: 'supported', sources: [0] },
    { text: 'MX-4486 is the replacement code and MX-4471 is inactive.', verdict: 'supported', sources: [1, 2] },
  ] },
  { group: 19, verdict: 'supported', propositions: [
    { text: 'Luis Ferreira, LH-44870, wants to return the opened mixer on LH-79215.', verdict: 'supported', sources: [0] },
    { text: 'The tool identifies that order/account/customer as a 5-quart stand mixer totaling $289.', verdict: 'supported', sources: [1] },
    { text: 'Opened-item returns again receive full refunds.', verdict: 'supported', sources: [3, 4] },
  ] },
  { group: 20, verdict: 'supported', propositions: [
    { text: 'Luis Ferreira, LH-44870, wants to return an opened stand mixer on LH-79215.', verdict: 'supported', sources: [0] },
    { text: 'Opened-item returns again receive a full refund.', verdict: 'supported', sources: [1, 2] },
  ] },
  { group: 21, verdict: 'supported', propositions: [
    { text: 'The tool identifies Farah Haddad, LH-58841, order LH-85123, as two blackout curtain panels totaling $134.', verdict: 'supported', sources: [2] },
    { text: 'The instruction is to chase Parcelway each afternoon on Farah redirect until the curtains arrive; this does not assert a completed redirect.', verdict: 'supported', sources: [6] },
  ] },
  { group: 22, verdict: 'unsupported', propositions: [
    { text: 'Grace still wants her own replacement after opening a locker parcel containing a twin duvet addressed to someone else instead of her queen set.', verdict: 'supported', sources: [17, 18] },
    { text: 'Sigrid reports cracked glass in two of eight pendants.', verdict: 'supported', sources: [19] },
    { text: 'ESC-2219 remains open is not established by the instruction to reopen it; the prior source calls it resolved and asks for closure, and neither instruction proves the corresponding action completed.', verdict: 'unsupported', sources: [12, 19] },
    { text: 'An electrician repair required before replacement is invented: the electrician only discovered the cracked glass while unpacking.', verdict: 'unsupported', sources: [20] },
    { text: 'Owen left Copperline yesterday and Hana Ikeda is the replacement buyer with email-only contact.', verdict: 'supported', sources: [15, 16] },
    { text: 'Grace still lacks her own replacement, but attributing that to Copperline buyer turnover and Hana contact availability invents a causal connection between unrelated cases.', verdict: 'unsupported', sources: [15, 16, 17, 18] },
  ] },
  { group: 23, verdict: 'supported', propositions: [
    { text: 'Freightline FL-661978 must be chased every afternoon until Copperline chairs arrive; no later arrival is supplied in this item.', verdict: 'supported', sources: [4] },
    { text: 'The October 10 tool reports Copperline Cafes LH-71592 as wholesale, net 30, with a $6,000 credit limit and $2,880 outstanding.', verdict: 'supported', sources: [9] },
  ] },
  { group: 24, verdict: 'contradicted', propositions: [
    { text: 'Copperline LH-71592 order LH-84056 comprises 24 oak bistro chairs totaling $2,880.', verdict: 'supported', sources: [2] },
    { text: 'Owen extension 4310 is presented as a usable correction without its inactive status, although the later source withdraws all instructions for reaching him after his departure and names Hana as buyer.', verdict: 'contradicted', sources: [5, 10, 11] },
    { text: 'Copperline account LH-71592 is wholesale.', verdict: 'supported', sources: [8] },
    { text: 'The final literal term net 3 conflicts with the source net 30 terms. The candidate appears cut off, but omitted characters cannot be restored as evidence.', verdict: 'contradicted', sources: [8] },
  ] },
  { group: 25, verdict: 'ambiguous', propositions: [
    { text: 'Grace emailed again about her duvet; Parcelway has not answered TR-3307 and her replacement is conditional on nothing turning up by the October 9 day end.', verdict: 'supported', sources: [14, 15] },
    { text: 'Calling TR-3307 tracking is materially ambiguous: it can mean the tracing process, but can also present this locker-trace identifier as a parcel tracking identifier. Only the locker trace is supplied.', verdict: 'ambiguous', sources: [6, 15] },
    { text: 'Marcus replaces the $50 late-wholesale credit offer with free freight on the next order.', verdict: 'supported', sources: [16] },
    { text: 'Owen reported all 24 chairs arrived that October 9 morning looking great and thanked the team for chasing Freightline.', verdict: 'supported', sources: [17, 18] },
  ] },
  { group: 26, verdict: 'supported', propositions: [
    { text: 'The October 8 lookup identifies Halvorsen Interiors LH-31055 order LH-80941 as eight brass pendant lights totaling $1,240.', verdict: 'supported', sources: [6] },
  ] },
  { group: 27, verdict: 'supported', propositions: [
    { text: 'Grace, LH-20418, reports LH-77302 missing and requests replacement.', verdict: 'supported', sources: [4] },
    { text: 'Parcelway has no TR-3307 answer by the October 9 source and replacement for Grace remains conditional on no result by that day end.', verdict: 'supported', sources: [6, 14, 15] },
  ] },
  { group: 28, verdict: 'supported', propositions: [
    { text: 'Copperline LH-71592 order LH-84056 is 24 oak bistro chairs totaling $2,880.', verdict: 'supported', sources: [2] },
    { text: 'The supplied October 8 lookup names Ines Albrecht as account manager and the buyer as preferred contact; this item supplies no successor manager.', verdict: 'supported', sources: [5] },
    { text: 'The October 9 correction sets Owen extension to 4310 rather than 4301; this item supplies no later withdrawal.', verdict: 'supported', sources: [7, 8] },
  ] },
  { group: 29, verdict: 'contradicted', propositions: [
    { text: 'Freightline FL-660412 was released from Riverside October 8 and delivered October 9 at 7:40 am to the Halvorsen loading dock.', verdict: 'supported', sources: [7] },
    { text: 'The signer initial S is in the source; the next source sentence continues Halvorsen, so the candidate omits the surname without changing the initial.', verdict: 'supported', sources: [7, 8] },
    { text: 'The candidate labels these delivery details as an October 9 user source, but the supplied delivery details are a tool result. The user message supplies release only, not this claimed source attribution.', verdict: 'contradicted', sources: [5, 7] },
  ] },
  { group: 30, verdict: 'contradicted', propositions: [
    { text: 'Halvorsen Interiors wholesale LH-31055 escalates late lighting order LH-80941 worth $1,240.', verdict: 'supported', sources: [0] },
    { text: 'The lookup identifies eight brass pendant lights totaling $1,240.', verdict: 'supported', sources: [6] },
    { text: 'The literal Freightline pro number FL-66 differs from FL-660412. The ending appears truncated, but the missing digits are not present in the candidate.', verdict: 'contradicted', sources: [7] },
  ] },
  { group: 31, verdict: 'supported', propositions: [
    { text: 'Tomasz handles depot releases; his October 9 absence means requests must reach him on October 8.', verdict: 'supported', sources: [2, 3] },
    { text: 'Grace emailed again about her duvet; Parcelway has no TR-3307 answer as of October 9 and replacement remains conditional on no result by that day end.', verdict: 'supported', sources: [10, 11] },
    { text: 'Parcelway must be chased every afternoon on Farah redirect until curtains arrive.', verdict: 'supported', sources: [14] },
  ] },
  { group: 32, verdict: 'contradicted', propositions: [
    { text: 'The Freightline FL-661978 chase instruction is relabeled October 9 although its source is October 8. It also omits that the later chair-arrival report ends the until-arrival chase condition.', verdict: 'contradicted', sources: [10, 17, 18] },
    { text: 'Dalia, LH-66208, requested callback at 555-0175 to book delivery of sofa LH-86610.', verdict: 'supported', sources: [23] },
  ] },
  { group: 33, verdict: 'contradicted', propositions: [
    { text: 'Tomasz handles depot releases and is off October 9; until he is off reasonably describes the immediate availability limit rather than permanent loss of his role.', verdict: 'supported', sources: [2, 3] },
    { text: 'The candidate places Grace repeat email in an October 8 source, but the supplied email report is dated October 9.', verdict: 'contradicted', sources: [11] },
    { text: 'Linking Grace duvet email with ESC-2219 and checking Freightline Riverside about Halvorsen lights adds an unsupported relationship and purpose; these appear as separate instructions and cases in the sources.', verdict: 'unsupported', sources: [8, 11, 12] },
  ] },
  { group: 34, verdict: 'supported', propositions: [
    { text: 'Grace, LH-20418, reports order LH-77302 never arrived and requests replacement; retaining says distinguishes her report from the carrier marked-delivered status.', verdict: 'supported', sources: [0, 2] },
    { text: 'LH-77302 is Grace queen linen duvet set totaling $148.50.', verdict: 'supported', sources: [1] },
    { text: 'Because Grace has two earlier claims, any replacement requires Marcus sign-off first.', verdict: 'supported', sources: [4, 6] },
  ] },
  { group: 35, verdict: 'contradicted', propositions: [
    { text: 'Owen left Copperline yesterday in the October 10 frame and Hana Ikeda replaces him, reachable only at hana.ikeda@copperline.example by email.', verdict: 'supported', sources: [15, 16] },
    { text: 'Grace found a twin duvet addressed to someone else instead of her queen set and still wants her own replacement.', verdict: 'supported', sources: [17, 18] },
    { text: 'Grace opened locker 14 adds an action on a different object: the source says she opened the parcel from locker 14, not the locker itself.', verdict: 'unsupported', sources: [17] },
    { text: 'The Ruth deputy-manager delegation through the stated October 9 bound preserves the stated substitution, but attributing it to an October 10 source conflicts with its October 8 source date.', verdict: 'contradicted', sources: [8] },
  ] },
  { group: 36, verdict: 'ambiguous', propositions: [
    { text: 'Grace LH-20418 requested replacement of linen duvet order LH-77302, which was marked delivered October 3 to an Elm Street station locker.', verdict: 'supported', sources: [0, 1, 2] },
    { text: 'Parcelway has not answered TR-3307 as of October 9.', verdict: 'supported', sources: [10] },
    { text: 'Calling TR-3307 tracking can mean the trace process, but can also misidentify the parcel tracking number, which the source calls PW-5521-9930. The type of identifier remains materially ambiguous.', verdict: 'ambiguous', sources: [2, 7, 10] },
    { text: 'Will receive a replacement can paraphrase the conditional dispatch plan, but can also promise receipt rather than sending; the source only commits to sending if nothing turns up by day end, with earlier manager sign-off required. The stronger reading is not entailed.', verdict: 'ambiguous', sources: [6, 10] },
  ] },
  { group: 37, verdict: 'ambiguous', propositions: [
    { text: 'Farah Haddad LH-58841 moved house and the requested redirect address was corrected from 19 to 91 Quarry Lane.', verdict: 'supported', sources: [0, 1, 4, 5] },
    { text: 'The claim that Farah moved her residence to 91 Quarry Lane is a plausible connection between adjacent source sentences, but the supplied address is explicitly a redirect destination; whether it is her residence is not explicit and remains materially uncertain.', verdict: 'ambiguous', sources: [0, 1, 4] },
    { text: 'LH-85123 for Farah LH-58841 is two blackout curtain panels totaling $134.', verdict: 'supported', sources: [2] },
    { text: 'Farah reports curtains still missing and requests a concession on her next order as of October 10.', verdict: 'supported', sources: [7] },
  ] },
  { group: 38, verdict: 'contradicted', propositions: [
    { text: 'Grace LH-20418 reports LH-77302 missing and wants replacement, but the candidate labels the original October 8 statement as an October 10 source.', verdict: 'contradicted', sources: [0, 14] },
    { text: 'The Parcelway response about locker 14, wrong door code, and 3 pm collection is dated October 9 in the sources, not October 10 as in the candidate.', verdict: 'contradicted', sources: [11] },
    { text: 'The final October 10 instruction to reopen the trace reports that the collected parcel contains someone else twin duvet, not Grace queen set. In the complete candidate this corrects the preceding attribution of the parcel to Grace; reopening remains an instruction.', verdict: 'supported', sources: [13] },
  ] },
  { group: 39, verdict: 'supported', propositions: [
    { text: 'The October 8 tool identifies Grace LH-20418 order LH-77302 as a queen linen duvet set totaling $148.50.', verdict: 'supported', sources: [1] },
    { text: 'The same tool says it shipped September 30 by Parcelway PW-5521-9930 and was marked delivered October 3 to an Elm Street station parcel locker. The trailing incomplete date prefix expresses no additional factual proposition.', verdict: 'supported', sources: [2] },
  ] },
  { group: 40, verdict: 'supported', propositions: [
    { text: 'Every escalation must copy Priya Raman from refunds.', verdict: 'supported', sources: [0] },
    { text: 'Grace emailed again about her duvet in the October 9 source.', verdict: 'supported', sources: [13] },
    { text: 'The October 10 source withdraws earlier instructions for reaching Copperline buyer Owen because he left the company yesterday.', verdict: 'supported', sources: [15] },
  ] },
  { group: 41, verdict: 'supported', propositions: [
    { text: 'Luis Ferreira LH-44870 requests return of the opened mixer on LH-79215.', verdict: 'supported', sources: [0] },
    { text: 'The director scrapped the 15 percent restocking fee on the October 8 morning.', verdict: 'supported', sources: [1] },
    { text: 'Beatriz called back October 9 and requested a sage rug exchange instead of a refund.', verdict: 'supported', sources: [3, 4] },
  ] },
  { group: 42, verdict: 'supported', propositions: [
    { text: 'The October 10 source reports that Copperline accounts team wants a $1,500 reorder on credit; it does not claim credit approval or order placement.', verdict: 'supported', sources: [7] },
  ] },
  { group: 43, verdict: 'supported', propositions: [
    { text: 'Grace emailed again about her duvet on the October 9 source.', verdict: 'supported', sources: [14] },
    { text: 'Parcelway has no answer on TR-3307; her clearly refers to Grace, and replacement remains conditional on no result by that day end.', verdict: 'supported', sources: [14, 15] },
    { text: 'Dalia Moreno LH-66208 requested callback at 555-0175 to book a delivery slot for sofa order LH-86610 in the October 10 source.', verdict: 'supported', sources: [23] },
  ] },
  { group: 44, verdict: 'ambiguous', propositions: [
    { text: 'Every escalation must copy Priya Raman from refunds.', verdict: 'supported', sources: [0] },
    { text: 'Parcelway has no answer on TR-3307 and replacement is conditional on nothing turning up by the October 9 day end.', verdict: 'supported', sources: [11] },
    { text: 'The replacement recipient her is unresolved in the candidate, whose only named woman is Priya. The source establishes Grace as recipient, but the candidate omits that antecedent.', verdict: 'ambiguous', sources: [10, 11] },
    { text: 'The October 10 instruction withdraws yesterday Saturday opening note because facilities closed the counter for floor work; walk-in returns wait until Monday.', verdict: 'supported', sources: [15] },
  ] },
  { group: 45, verdict: 'supported', propositions: [
    { text: 'Tomasz Brennan released the Halvorsen lights from Riverside before leaving yesterday in the October 9 source frame. The earlier full name and warehouse-release role resolve Tomasz.', verdict: 'supported', sources: [0, 1, 13] },
    { text: 'Grace emailed again about her duvet, Parcelway has not answered TR-3307, and her replacement remains conditional on no result by the October 9 day end.', verdict: 'supported', sources: [14, 15] },
    { text: 'Marcus changed the late-wholesale concession from a $50 credit to offering free freight on the next order.', verdict: 'supported', sources: [16] },
  ] },
  { group: 46, verdict: 'supported', propositions: [
    { text: 'Luis Ferreira LH-44870 requests return of an opened mixer on LH-79215.', verdict: 'supported', sources: [0] },
    { text: 'Beatriz called back and requested the sage rug as exchange rather than refund.', verdict: 'supported', sources: [3, 4] },
    { text: 'The October 9 source says the walk-in counter opens 9 am to 1 pm tomorrow Saturday October 10. This item contains no later withdrawal, so no outside correction is imported.', verdict: 'supported', sources: [5] },
  ] },
];
