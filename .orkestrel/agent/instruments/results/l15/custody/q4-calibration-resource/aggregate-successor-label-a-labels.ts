import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isRecord, isString } from '@orkestrel/contract';
import { items, groups, sources, entries } from './aggregate-successor-label-a-reader.ts';

type Verdict = 'supported' | 'unsupported' | 'contradicted' | 'ambiguous';
interface Proposition { readonly text: string; readonly verdict: Verdict; readonly evidence: readonly string[]; }
function makeProposition(text: string, verdict: Verdict, indices: readonly number[]): Proposition {
  const citations = indices.map(index => {
    const entry = entries[index];
    if (!isRecord(entry) || !isString(entry.text)) throw Error('Missing source');
    return entry;
  });
  return { text: `${text} Sources: ${citations.map(entry=>`${entry.id}/${entry.sentence} (${entry.day}, ${entry.role})`).join('; ')}.`, verdict, evidence: citations.map(entry=>String(entry.text)) };
}
const p = makeProposition;
const release = p('Tomasz Brennan in the warehouse issues releases for anything stuck at a carrier depot; the 2026-10-08 user attribution is accurate.', 'supported', [0]);
const absence = p('On 2026-10-08, Tomasz is described as off tomorrow, Friday 2026-10-09; this is the stated reason release requests must reach him on 2026-10-08.', 'supported', [1]);
const check = p('The user asks to check the location of the Halvorsen shipment on 2026-10-08; the candidate does not claim the check was completed.', 'supported', [5]);
const released = p('The 2026-10-09 user reports Freightline emailed overnight that Tomasz released the Halvorsen lights from Riverside before leaving yesterday, 2026-10-08.', 'supported', [13]);
const graceEmail = p('Grace Okafor emailed again about her duvet, as reported by the user on 2026-10-09.', 'supported', [14]);
const noAnswer = p('As reported on 2026-10-09, Parcelway has no answer on TR-3307; if nothing turns up by that day’s end, the plan is to send her replacement. The adjacent supplied source identifies her as Grace; neither completed dispatch nor an unconditional dispatch is asserted.', 'supported', [14,15]);
const rugSent = p('The warehouse sent the sage rug for LH-83317 on the afternoon of 2026-10-09 through Parcelway, tracking PW-7042-1185; this is a dispatch claim, not a delivery claim.', 'supported', [21]);
const rugChase = p('The user instructs chasing Parcelway on that sage-rug shipment every afternoon until it lands; this preserves the stopping condition and does not assert that chasing occurred.', 'supported', [21,22]);
const kettle = p('Kenji Nakamura called, as reported on 2026-10-10, to report the replacement kettle for LH-81660 arrived with a dented lid.', 'supported', [27]);
const refundCode = p('The user’s 2026-10-08 instruction replaces approval code MX-4471 with MX-4486 and explicitly marks MX-4471 inactive.', 'supported', [45,46]);
const luis = p('On 2026-10-08 Luis Ferreira, account LH-44870, wants to return an opened stand mixer from order LH-79215; the return is requested, not claimed completed.', 'supported', [38]);
const fee = p('The director scrapped the 15 percent restocking fee on the morning of 2026-10-08.', 'supported', [39]);
const full = p('Opened-item returns qualify for a full refund again; this is a policy statement, not a claim that Luis received a refund.', 'supported', [40]);
const feeCause = p('The removal of the 15 percent restocking fee on the morning of 2026-10-08 restores full refunds for opened-item returns. The consecutive policy statements support the candidate’s explanatory “so”.', 'supported', [39,40]);
const beatrizRefund = p('Beatriz told the user by phone that she preferred her money back to waiting for another rug, as reported on 2026-10-08; this source set contains no subsequent change of that preference.', 'supported', [47]);
const beatrizExchange = p('On 2026-10-09 Beatriz Solano called back and changed her preference to having the sage rug sent as an exchange instead of a refund; this is a preference, not completed dispatch.', 'supported', [41,42]);
const copyPriya = p('The user’s rule is to copy Priya Raman of the refunds team on every escalation.', 'supported', [48]);
const noPromise = p('The user prohibits promising a customer a delivery date in writing.', 'supported', [49]);
const openTrace = p('The user agrees to and instructs opening the locker trace; the candidate does not assert that it has been opened.', 'supported', [56]);
const ruth = p('The 2026-10-08 user states that, until 2026-10-09, deputy manager Ruth Adeyemi gives sign-offs that would normally need Marcus. The candidate retains the source’s temporal boundary without deciding its inclusivity.', 'supported', [53]);
const extension = p('The 2026-10-09 user corrects Copperline buyer Owen’s extension to 4310 and rejects 4301; no departure update is supplied in this candidate’s source set.', 'supported', [31]);
const reorder = p('Copperline’s accounts team wants to put a $1,500 reorder on credit, as reported on 2026-10-10; no approval or completed reorder is claimed.', 'supported', [33]);
const credit = p('The 2026-10-10 customer lookup identifies LH-71592 as Copperline Cafes, wholesale, net 30, with a $6,000 credit limit and $2,880 outstanding.', 'supported', [34]);
const left = p('On 2026-10-10 the user withdraws earlier instructions for reaching Copperline’s buyer and states Owen Pritchard left the company yesterday, 2026-10-09.', 'supported', [36]);
const hana = p('The replacement Copperline buyer is Hana Ikeda, contactable only by email at hana.ikeda@copperline.example. “Owen Pritchard:” is preserved as the source’s label; the candidate does not assert Owen remains the buyer.', 'supported', [36,37]);
const halvOrder = p('Halvorsen Interiors, wholesale account LH-31055, is escalating late lighting order LH-80941 worth $1,240, as reported on 2026-10-08.', 'supported', [58]);
const held = p('The 2026-10-08 lookup for LH-80941 gives Freightline pro FL-660412, held at Riverside since 2026-10-02 awaiting release from the Larkspur Home warehouse; this source set supplies no later release or delivery.', 'supported', [64]);
const mixer = p('The 2026-10-08 lookup identifies LH-79215 for Luis Ferreira’s account LH-44870 as a 5-quart stand mixer totaling $289.', 'supported', [65]);
const returnWindow = p('The lookup for LH-79215 reports delivery on 2026-09-21 and a return window open until 2026-10-21.', 'supported', [66]);
const pendants = p('On 2026-10-09 Sigrid confirmed by email that all 8 pendants were in; this source set contains no later damage or reopening update.', 'supported', [61]);
const resolved = p('The 2026-10-09 user says ESC-2219 is resolved and instructs closing it. The candidate preserves the instruction and does not claim a completed administrative closure.', 'supported', [62]);
const manager = p('The stated baseline reason for requiring approval of any replacement for Grace is her two earlier claims, with Marcus as the normal approver.', 'supported', [57]);
const managerOverride = p('The candidate presents Marcus’s personal sign-off as the operative prerequisite for any Grace replacement without the supplied temporary substitution. The 2026-10-08 instruction assigns sign-offs normally requiring Marcus to Ruth until 2026-10-09; the source-date prefix alone does not mark the Marcus requirement inactive during that interval.', 'contradicted', [57,53]);
const dalia = p('On 2026-10-10 Dalia Moreno, account LH-66208, left voicemail requesting a callback at 555-0175 to book a delivery slot for her sofa, order LH-86610. The candidate does not claim the call or booking occurred.', 'supported', [23]);
const closedCounter = p('The 2026-10-10 user withdraws the prior Saturday counter note: facilities closed the walk-in returns counter all day for floor work, so walk-in returns must wait until Monday.', 'supported', [68]);
const wrongDuvet = p('The 2026-10-10 user instructs reopening TR-3307 because Grace opened the parcel from locker 14 and found a twin duvet addressed to someone else rather than her queen set; an instruction is not a claim of completed reopening.', 'supported', [69]);
const graceWants = p('Grace still wants her own replacement after discovering the wrong duvet, as reported on 2026-10-10.', 'supported', [69,70]);
const approval = p('The standing rule requires a manager approval code in the internal note for any refund over $200.', 'supported', [44]);
const chairs = p('The 2026-10-08 order lookup identifies LH-84056 for Copperline Cafes, account LH-71592, as 24 oak bistro chairs totaling $2,880.', 'supported', [29]);
const chairsTransit = p('That lookup reports shipment on 2026-10-01 by Freightline, pro FL-661978, in transit and delayed by a linehaul shortage at Dunmore; no later arrival is supplied in this source set.', 'supported', [30]);
const freeFreight = p('On 2026-10-09 Marcus changes his preferred remedy for late wholesale orders from a $50 store credit to free freight on their next order; the superseded remedy is expressly inactive.', 'supported', [16]);
const morningCall = p('The 2026-10-08 instruction is to phone Freightline’s Riverside desk at 555-0188 every morning for Halvorsen lights status while ESC-2219 remains open. The conditional instruction does not assert that the ticket remains open after delivery.', 'supported', [54]);
const delivered = p('The 2026-10-09 lookup for LH-80941 reports Freightline pro FL-660412, release from Riverside on 2026-10-08, and delivery to the Halvorsen Interiors loading dock on 2026-10-09 at 7:40 am, signed by S. The source itself ends this sentence at the initial; omission of the following surname does not invent a different signer.', 'supported', [82]);
const farahMoved = p('On 2026-10-09 Farah Haddad, account LH-58841, is reported to have moved house.', 'supported', [19]);
const redirect19 = p('Farah requests redirecting LH-85123 to 19 Quarry Lane, Ashby, on 2026-10-09. This candidate’s source set contains no house-number correction; facts from other source sets do not override it.', 'supported', [19,20]);
const redirect91 = p('Farah requests redirecting LH-85123 to 91 Quarry Lane, Ashby. The later correction replaces only 19 with 91 and says the rest stands; the candidate asserts a request, not a completed redirect.', 'supported', [19,20,87,88]);
const farahWait = p('On 2026-10-10 Farah reports her curtains still have not arrived and asks for something off her next order for the wait; no granted discount is claimed.', 'supported', [26]);
const farahChase = p('The 2026-10-09 instruction is to chase Parcelway every afternoon on Farah’s redirect until the curtains land; it preserves the stopping condition and does not claim completed chasing.', 'supported', [67]);
const curtains = p('The 2026-10-09 order lookup identifies LH-85123 for Farah Haddad, account LH-58841, as 2 blackout-curtain panels totaling $134.', 'supported', [85]);
const curtainsShip = p('The lookup reports shipment on 2026-10-08 by Parcelway to 7 Mill Road, Ashby, with redirects accepted until the delivery depot is reached. A requested Quarry Lane redirect does not contradict the original shipping address.', 'supported', [86]);
const curtainsTracking = p('The same LH-85123 shipment has Parcelway tracking PW-7120-4466.', 'supported', [86]);
const duvet = p('The 2026-10-08 lookup identifies LH-77302 for Grace Okafor, account LH-20418, as a queen linen duvet set totaling $148.50.', 'supported', [75]);
const duvetShip = p('The lookup reports shipment on 2026-09-30 by Parcelway, tracking PW-5521-9930, marked delivered on 2026-10-03 to a parcel locker at Elm Street station. The candidate preserves “marked delivered”, which can coexist with Grace’s nonreceipt report.', 'supported', [76]);
const graceMissing = p('On 2026-10-08 Grace Okafor, account LH-20418, reports order LH-77302 never arrived and wants a replacement; this is attributed to Grace and does not erase the carrier’s delivered marker.', 'supported', [4]);

// Each group assignment is an independent reading of that group's complete candidate and source set.
const analyses: readonly (readonly Proposition[])[] = [
  [noAnswer,rugSent,kettle],
  [release,released,noAnswer],
  [reorder,credit,left],
  [luis,fee,beatrizExchange],
  [release,absence,check],
  [release,absence,check],
  [refundCode,luis,beatrizRefund],
  [release,ruth,extension],
  [p('The candidate dates the user report that Grace emailed again to 2026-10-08. The only supplied report of this email is dated 2026-10-09; the source attribution is changed even though the undated email event itself is supported.', 'contradicted',[14]),noAnswer,left],
  [copyPriya,noPromise,openTrace],
  [reorder,credit,p('Tobias Lindqvist is Copperline’s account manager in the 2026-10-10 lookup.', 'supported',[35]),p('The candidate asserts that this management assignment has applied “since 2026-10-0”. This incomplete date does not establish a determinate start date; the source specifies 2026-10-09, but filling in the missing digit would repair the candidate rather than interpret a complete asserted value.', 'ambiguous',[35])],
  [copyPriya,release,absence],
  [halvOrder,held],
  [halvOrder,held,p('Halvorsen’s corrected escalation ticket is ESC-2219.', 'supported',[59]),p('The negated former ticket is written “not ESC-2”. The complete source rejects ESC-2291. The candidate’s truncated identifier does not resolve whether ESC-2 denotes that same former ticket or a different identifier; this uncertainty concerns the asserted correction, not mere formatting.', 'ambiguous',[59,60])],
  [mixer,returnWindow,full],
  [managerOverride,pendants,resolved],
  [graceEmail,noAnswer,dalia],
  [luis,feeCause,closedCounter],
  [luis,fee,full],
  [left,hana,wrongDuvet],
  [left,hana,wrongDuvet],
  [approval,refundCode,luis],
  [manager,ruth,graceEmail],
  [release,absence,rugSent],
  [chairs,chairsTransit],
  [wrongDuvet,graceWants,manager,p('The candidate attributes the Grace approval prerequisite to a user message on 2026-10-09. The supplied prerequisite message is dated 2026-10-08; the candidate changes its source date. No Ruth substitution is supplied in this group’s evidence.', 'contradicted',[57])],
  [release,released,freeFreight],
  [release,absence,rugSent],
  [morningCall,delivered],
  [released,rugSent,rugChase],
  [luis,feeCause,beatrizExchange],
  [noAnswer,farahMoved,redirect19,farahWait],
  [release,graceEmail,farahChase],
  [closedCounter,dalia,left],
  [release,rugSent,kettle],
  [farahMoved,redirect91,curtains,curtainsShip],
  [duvet,duvetShip],
  [release,absence,released,rugSent],
  [released,noAnswer,farahMoved,redirect19],
  [p('Beatriz Solano changed her preference on 2026-10-09 from a refund to a sage-rug exchange for LH-83317. The earlier wrong-rug order and subsequent same-order dispatch resolve the order reference.', 'supported',[12,41,42,21]),rugSent,rugChase],
  [luis,returnWindow,full],
  [farahMoved,curtainsShip,curtainsTracking,p('The 2026-10-09 user corrects Farah’s redirect house number to 91 Quarry Lane and expressly rejects 19.', 'supported',[87])],
  [graceMissing,duvetShip,p('The candidate’s replacement condition ends “Because of her two earlier claims, any replacement for Grace needs Marcus to”. The two prior claims and involvement of Marcus are supported, but the required act is unfinished. The source specifies prior sign-off; supplying that missing predicate would complete a materially unresolved prerequisite.', 'ambiguous',[57])],
  [luis,mixer,p('The lookup reports delivery of LH-79215 on 2026-09-21.', 'supported',[66]),p('The candidate states the return window is open “until 2”, an incomplete date. The source gives 2026-10-21; the candidate’s asserted deadline cannot be established without adding missing content.', 'ambiguous',[66])],
  [release,ruth,noAnswer],
  [redirect91,curtainsShip,curtainsTracking,farahWait],
  [graceEmail,noAnswer,closedCounter],
  [graceEmail,noAnswer],
  [graceEmail,noAnswer,farahMoved],
  [graceEmail,noAnswer,farahMoved,redirect19],
];
if (analyses.length !== groups.length) throw Error('Missing analyses');
const labels = groups.flatMap((group,index)=> {
  const propositions = analyses[index];
  if (!propositions || propositions.length === 0) throw Error('Missing propositions');
  const verdict: Verdict = propositions.some(p=>p.verdict==='contradicted') ? 'contradicted' : propositions.some(p=>p.verdict==='unsupported') ? 'unsupported' : propositions.some(p=>p.verdict==='ambiguous') ? 'ambiguous' : 'supported';
  return group.map(item=>({id:item.id,item:createHash('sha256').update(JSON.stringify(item)).digest('hex'),verdict,propositions}));
});
const ordered = items.map(item=> {
  const label=labels.find(label=>label.id===item.id);
  if (!label) throw Error('Unlabeled item');
  return label;
});
for (const [index,label] of ordered.entries()) {
  const item=items[index];
  if (!item || label.id !== item.id || label.item !== createHash('sha256').update(JSON.stringify(item)).digest('hex')) throw Error('ID/hash mismatch');
  for (const proposition of label.propositions) {
    if (proposition.evidence.length===0) throw Error('No evidence');
    for (const quote of proposition.evidence) if (!item.sources.some(source=>isRecord(source)&&isString(source.text)&&source.text.includes(quote))) throw Error(`Nonliteral quote for ${item.id}: ${quote}`);
  }
}
if (new Set(ordered.map(label=>label.id)).size!==items.length) throw Error('Bijection failed');
const output='tmp/units/aggregate-successor-label-a.json';
writeFileSync(output,JSON.stringify(ordered,null,2)+'\n');
const counts = Object.fromEntries(['supported','unsupported','contradicted','ambiguous'].map(verdict=>[verdict,ordered.filter(label=>label.verdict===verdict).length]));
const grouped = Object.fromEntries(['supported','unsupported','contradicted','ambiguous'].map(verdict=>[verdict,groups.filter(group=>ordered.find(label=>label.id===group[0]?.id)?.verdict===verdict).length]));
const digest=createHash('sha256').update(readFileSync(output)).digest('hex');
const report = [
  '# Independent factual-support audit',
  '',
  'The sealed packet has a complete independent proposition label for every occurrence. This report rules only on factual support from the supplied sources; it gives no task-quality, model, adoption, or numeric-judge conclusion.',
  '',
  `The completed reader and serialization run measured ${items.length} unique occurrence IDs, ${groups.length} exact semantic groups, ${sources.length} ordered source sets, ${entries.length} distinct full source records, and ${items.reduce((sum,item)=>sum+item.components.length,0)} components. Input size: 3,160,469 bytes. Input SHA-256: 0e3eaecbf38d7dad2450fb2748db860aeb8117679f06f8a7bf27ea93ad5f9541. Output SHA-256: ${digest}.`,
  '',
  `Occurrence verdict counts measured from the completed output: ${JSON.stringify(counts)}. Exact semantic-group verdict counts: ${JSON.stringify(grouped)}.`,
  '',
  'Grouping uses equality of JSON.stringify({candidate, question, state, sources}) with those fields in that fixed order, retaining original content and array order. It does not normalize wording, dates, whitespace inside state, or sources. Every source set was expanded through exact full-record equality, read in full, and mapped back in original message order. Shared proposition wording applies only where the independently inspected assertion and its required exact sources agree. Every occurrence retains its own item hash; the manifest preserves revision and component identities.',
  '',
  'The reader checked the supplied byte seal and census, unique occurrence IDs, state/candidate equality, exact ordered source-to-evidence equality, component evidence/candidate equality, and focus start/end/text agreement. Every candidate was read completely. The repeated question contracts were read completely. The label checker verified the ID/hash bijection, a nonempty proposition list for each item, and literal contiguous quotations within that item’s own sources. Item hashes are SHA256(JSON.stringify(parsedItem)) in original parsed property order.',
  '',
  'The mixed nonpositive groups are described at proposition level. Altered source dates in groups 8 and 25 conflict with the supplied message dates. Group 15 omits the operative Ruth substitution while presenting Marcus’s personal approval as a requirement; group 22 includes the substitution and is supported. No approval, return, redirect, closure, reopening, or other requested act was inferred completed merely from an instruction.',
  '',
  'Materially unresolved candidates occur in groups 10, 13, 42, and 43: an incomplete account-manager start date, incomplete negated escalation ID, unfinished approval predicate, and incomplete return deadline. Each retains its supported propositions and receives an ambiguous overall verdict. Root owns adjudication of these uncertainties and the temporary-approval interpretation. A dangling source header without a predicate in groups 24, 28, 35, and 36 adds no material assertion and is not itself a factual defect. The abbreviated signer in group 28 repeats the complete supplied sentence and does not claim an incompatible surname.',
  '',
  'Evidence stays local to each group. For example, a request for 19 Quarry Lane is supported when that group omits the later house-number correction; it is not judged using another group’s sources. Pronouns are resolved from the supplied conversation and complete candidate, without treating the candidate as evidence. Source-date prefixes retain source attribution and relative-day frames; a prefix alone does not declare a superseded rule inactive.',
  '',
  '## Occurrence identity manifest',
  '',
  'Each manifest row preserves the complete occurrence, revision, and ordered component identities. The JSON label array contains the same ID and item hash.',
  '',
  '| Group | Occurrence ID | Revision | Item SHA-256 | Ordered component IDs |',
  '| --- | --- | --- | --- | --- |',
  ...items.map(item=>`| ${groups.findIndex(group=>group.some(member=>member.id===item.id))} | ${item.id} | ${item.revision} | ${createHash('sha256').update(JSON.stringify(item)).digest('hex')} | ${item.components.map(component=>isRecord(component)?component.id:'INVALID').join(', ')} |`),
  '',
].join('\n');
writeFileSync('tmp/units/aggregate-successor-label-a-report.md',report);
console.log(JSON.stringify({output,sha256:digest,occurrences:ordered.length,counts,groups:grouped,quotations:ordered.reduce((sum,label)=>sum+label.propositions.reduce((count,prop)=>count+prop.evidence.length,0),0)}));
