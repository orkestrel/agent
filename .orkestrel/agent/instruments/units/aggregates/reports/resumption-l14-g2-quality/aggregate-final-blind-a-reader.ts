import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const packet: unknown = JSON.parse(readFileSync('C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-development-blind-packet-l14-a/packet.json', 'utf8'))
if (typeof packet !== 'object' || packet === null) throw new Error('Invalid packet')
console.log('keys', Object.keys(packet))
const start = Number(process.argv[2] ?? '0')
const end = Number(process.argv[3] ?? '12')
for (const [key, value] of Object.entries(packet)) {
	if (!Array.isArray(value)) continue
	console.log(key, value.length)
	for (let index = start; index < Math.min(end, value.length); index++) {
		const entry: unknown = value[index]
		if (typeof entry !== 'object' || entry === null) throw new Error('Invalid entry')
		const record = Object.fromEntries(Object.entries(entry))
		delete record.truth
		console.log(JSON.stringify({ index, ...record }))
	}
}

const decisions = [
  [
    0,
    "fail",
    "fail",
    "pass",
    "fail",
    "ESC-2219 is correct, but 'I have sent this to Priya' has no delivery evidence. The protocol delivers the final message to the shift lead only. No fresh Halvorsen lookup."
  ],
  [
    1,
    "pass",
    "fail",
    "fail",
    "fail",
    "Correct full $289 refund and withdrawn fee. No fresh lookup; the explicit lookup_order action is absent."
  ],
  [
    2,
    "fail",
    "fail",
    "pass",
    "fail",
    "Contradictorily says held at Riverside and delivered, and omits the reopened cracked-glass damage affecting 2 pendants. Pro number and claim deadline are correct. Recall is not a fresh lookup."
  ],
  [
    3,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct Friday sign-off by Ruth Adeyemi within her cover period. No fresh Grace order or account lookup."
  ],
  [
    4,
    "pass",
    "pass",
    "pass",
    "pass",
    "Correctly says the counter is closed today for floor work and returns wait until Monday. This generic counter-policy request requires no order/account lookup."
  ],
  [
    5,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct Hana Ikeda email contact after the buyer supersession; no obsolete telephone contact offered. Recall does not satisfy a fresh Copperline lookup."
  ],
  [
    6,
    "fail",
    "fail",
    "fail",
    "fail",
    "Gives the $289 amount and acknowledges approval-code requirement but omits the required active code MX-4486 from the draft. No fresh lookup_order."
  ],
  [
    7,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct account manager Tobias Lindqvist. No fresh Copperline lookup."
  ],
  [
    8,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct Tobias Lindqvist; Owen is still the eligible buyer through seed 137, so his mention is not stale at this boundary. No fresh Copperline lookup."
  ],
  [
    9,
    "fail",
    "fail",
    "pass",
    "fail",
    "Omits Farah's active PW-7120-4466 chase, revives resolved Copperline and Halvorsen chases, and assigns Copperline's FL-661978 to Halvorsen. No fresh lookups."
  ],
  [
    10,
    "pass",
    "pass",
    "fail",
    "fail",
    "Correct $289 full refund. Fresh lookup_customer for LH-44870 meets the system's lookup alternative, but the original explicit list requires lookup_order, which is absent."
  ],
  [
    11,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct free freight on the next order; $50 credit is mentioned only as replaced. No fresh Copperline order/account lookup."
  ],
  [
    12,
    "fail",
    "pass",
    "pass",
    "fail",
    "Correct amount, card, and return date, with a fresh LH-44870 lookup. Adds an unsupported processing date and 3-5-day credit promise, and contradicts the return deadline by saying there is no specific deadline."
  ],
  [
    13,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct Hana Ikeda and email address; no obsolete telephone contact offered. Recall is not a fresh Copperline lookup."
  ],
  [
    14,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct WKND15, 15 percent, and October 10-11 validity for Saturday. No fresh Farah order/account lookup."
  ],
  [
    15,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct WKND15, 15 percent, and October 10-11 validity for Saturday. No fresh Farah order/account lookup."
  ],
  [
    16,
    "fail",
    "fail",
    "pass",
    "fail",
    "Omits Farah's active PW-7120-4466 chase and incorrectly revives Grace's closed trace, delivered Copperline chairs, and released Halvorsen shipment. Recall returned nothing and no fresh lookup followed."
  ],
  [
    17,
    "fail",
    "fail",
    "pass",
    "fail",
    "Correct ticket ESC-2219, but falsely reports sending it to Priya without delivery evidence. Final messages reach the lead, not Priya. Recall is not a fresh lookup."
  ],
  [
    18,
    "pass",
    "fail",
    "fail",
    "fail",
    "Correct Tomasz Brennan, request today before Friday absence, and FL-660412. No fresh lookup_order; the stated future copying is not evidence of delivery."
  ],
  [
    19,
    "pass",
    "fail",
    "fail",
    "fail",
    "Draft correctly authorizes $289 with MX-4486 and the fee withdrawal. An extra manager-signature placeholder does not replace or omit the required code. No fresh lookup_order."
  ],
  [
    20,
    "pass",
    "pass",
    "pass",
    "pass",
    "Correct closed counter and Monday return. Generic desk policy requires no order/account lookup."
  ],
  [
    21,
    "fail",
    "fail",
    "pass",
    "fail",
    "Omits Farah's active PW-7120-4466 chase and revives Grace's closed trace, delivered Copperline chairs, and released Halvorsen shipment. Failed recall supplies no fresh lookup."
  ],
  [
    22,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct street address 91 Quarry Lane; 19 is explicitly corrected rather than asserted. The request asks for the street address, and unchanged details are acknowledged. No fresh Farah lookup."
  ],
  [
    23,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct complete address 91 Quarry Lane, Ashby. No fresh Farah lookup."
  ],
  [
    24,
    "pass",
    "pass",
    "fail",
    "fail",
    "Correct $289 full refund. Fresh LH-44870 customer lookup satisfies the system alternative, but the explicit lookup_order requirement is unmet."
  ],
  [
    25,
    "fail",
    "fail",
    "fail",
    "fail",
    "Requested sign-off, Priya, and tracking are correct, but the note adds refund code MX-4486 to a $148.50 replacement without authority and independently claims Priya was copied without delivery evidence. Recall is not lookup_order."
  ],
  [
    26,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct direct extension 4127 and after-2-pm window. Recall satisfies the mapped explicit search_history requirement; no fresh lookup for the Halvorsen order/account."
  ],
  [
    27,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct ESC-2219 as a draftable message. No fresh lookup. Priya delivery is unproved: the protocol only delivers the final answer to the lead, so content success cannot certify the requested external send."
  ],
  [
    28,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct free freight on the next order, explicitly replacing the $50 credit. Recall is not a fresh Copperline lookup."
  ],
  [
    29,
    "pass",
    "fail",
    "fail",
    "fail",
    "Correct Tomasz Brennan, today deadline, and FL-660412. No fresh lookup_order."
  ],
  [
    30,
    "fail",
    "pass",
    "pass",
    "fail",
    "Fresh order lookup and correct shipment/tracking, but the customer draft states October 12 arrival despite the no-written-delivery-date rule. Missing gift-note text in the database is improperly asserted as failed physical inclusion."
  ],
  [
    31,
    "pass",
    "fail",
    "fail",
    "fail",
    "Exact gift wording is correct. Both fresh lookup_order and explicitly listed recall are absent."
  ],
  [
    32,
    "fail",
    "fail",
    "fail",
    "fail",
    "Requested Marcus, Priya, and tracking are present, but adds an inapplicable refund approval code, directs opening a trace already opened, and claims Priya was copied without delivery evidence. Recall does not satisfy fresh lookup_order."
  ],
  [
    33,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct sage exchange and PW-7042-1185; shipment is supported by seed 110. Recall is not a fresh Beatriz lookup."
  ],
  [
    34,
    "fail",
    "fail",
    "pass",
    "fail",
    "Correct twin-versus-queen reason and reopened trace, but asserts expired Ruth coverage on Saturday, omits PW-5521-9930, and says the replacement was dropped despite its revival. No fresh lookup."
  ],
  [
    35,
    "fail",
    "fail",
    "pass",
    "fail",
    "Correct wrong twin duvet reason, but assigns expired Ruth coverage, calls TR-3307 resolved after reopening, and leaves tracking as a placeholder instead of PW-5521-9930. No fresh lookup."
  ],
  [
    36,
    "pass",
    "fail",
    "fail",
    "fail",
    "Correct extension 4127 and after-2-pm window. No fresh Halvorsen lookup or explicitly required recall."
  ],
  [
    37,
    "fail",
    "fail",
    "pass",
    "fail",
    "Correct gift text, but promises an October 12 estimate in the customer draft and transfers the earlier kettle's tracking to the second replacement without evidence. Recall is not a fresh lookup."
  ],
  [
    38,
    "ambiguous",
    "fail",
    "pass",
    "fail",
    "Correct sage exchange and tracking. 'Ensure the replacement is sent out promptly' can mean verification or incorrectly treat the already shipped rug as awaiting dispatch; seed 110 says it was sent. No fresh Beatriz lookup either way."
  ],
  [
    39,
    "ambiguous",
    "pass",
    "pass",
    "ambiguous",
    "Correct credit arithmetic, explicit fit, and Ines Albrecht with a fresh customer lookup. The extra assertion that Ines is reachable at 555-0142 is uncertain: the lookup labels it the account's main switchboard, not clearly the manager's contact. Core requested answer passes if that contact attribution is accepted; otherwise the unsupported addition fails."
  ],
  [
    40,
    "pass",
    "pass",
    "pass",
    "pass",
    "Fresh LH-31055 lookup; correct $3,760 available for the $3,000 reorder and Ines Albrecht. The sufficient balance stated for the reorder communicates that it fits. Future passing-on language is not proof of any external action, but none was requested."
  ],
  [
    41,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct Tobias Lindqvist, and Owen remains eligible at seed 137 before the buyer supersession. Recall is not a fresh Copperline lookup."
  ],
  [
    42,
    "pass",
    "fail",
    "fail",
    "fail",
    "Exact gift text is correct and recall occurs, but recalled lookup text does not meet the explicit fresh lookup_order requirement."
  ],
  [
    43,
    "pass",
    "fail",
    "fail",
    "fail",
    "Correct direct extension 4127 and after-2-pm window today. No fresh lookup or explicitly required recall."
  ],
  [
    44,
    "fail",
    "fail",
    "pass",
    "fail",
    "Includes Dalia's correct callback but presents Sigrid's afternoon-only contact, Owen without an outstanding call task, and the closed Halvorsen Riverside chase as morning obligations. No fresh lookup."
  ],
  [
    45,
    "fail",
    "fail",
    "fail",
    "fail",
    "Correct $289, Mastercard 7719, and October 21 deadline, but the customer draft retains an unresolved processing-date placeholder and invents a 3-5-business-day credit timescale. No required fresh customer lookup."
  ],
  [
    46,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct Hana Ikeda and email address, with no obsolete phone contact. No fresh Copperline lookup."
  ],
  [
    47,
    "pass",
    "fail",
    "fail",
    "fail",
    "Correct Tomasz Brennan, today deadline before Friday absence, and FL-660412. No fresh lookup_order."
  ],
  [
    48,
    "fail",
    "fail",
    "pass",
    "fail",
    "Omits the outstanding Dalia callback and 555-0175; offers unrelated Sigrid/Owen contacts and a warehouse role instead. No fresh lookup."
  ],
  [
    49,
    "ambiguous",
    "fail",
    "pass",
    "fail",
    "Correct Ruth Adeyemi sign-off today. 'Since ... has not provided an update ... by the end of the day' at a noon request can be read as an unsupported elapsed deadline or an awkward restatement of the conditional dispatch rule. No fresh lookup under either reading."
  ],
  [
    50,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct Dalia callback at 555-0175. Tomasz is explicitly conditional on a depot hold and is not asserted to have an active task; no unknown number is invented. No fresh lookup for Dalia's order/account."
  ],
  [
    51,
    "pass",
    "pass",
    "pass",
    "pass",
    "Fresh LH-44870 customer lookup and correct Mastercard ending 7719."
  ],
  [
    52,
    "fail",
    "pass",
    "pass",
    "fail",
    "Fresh order lookup and correct shipment/tracking, but the customer draft supplies October 12 arrival and claims the gift note has not been added. The lookup establishes only absent recorded wording, not physical omission or ongoing work to add it."
  ],
  [
    53,
    "fail",
    "pass",
    "pass",
    "fail",
    "Fresh account lookup and correct manager, but the $3,000 reorder fits $3,760 available credit; the asserted excess is arithmetically wrong."
  ],
  [
    54,
    "fail",
    "pass",
    "pass",
    "fail",
    "Fresh order lookup and correct shipment/tracking. Customer draft still writes the October 12 delivery estimate against the desk's no-written-delivery-date instruction. The absence of recorded gift wording does not establish omitted packing."
  ],
  [
    55,
    "fail",
    "pass",
    "pass",
    "fail",
    "Correct amount, card, and date with fresh customer lookup, but invents refund completion today and a 3-5-day timescale, and contradicts the October 21 deadline by saying no specific deadline applies."
  ],
  [
    56,
    "fail",
    "pass",
    "pass",
    "fail",
    "Fresh order lookup supports delivery, pro number, and October 16 deadline, but the answer omits the decisive reopened damage: 2 of 8 pendants have cracked glass. It therefore does not answer their state or establish why a claim is needed."
  ],
  [
    57,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct gift text and second replacement dispatch today. The October 12 value is expressly an original estimate in internal commentary, while the customer draft gives no arrival date; it is not a fresh promise for the second kettle. Recall is not a fresh lookup."
  ],
  [
    58,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct 91 Quarry Lane; 19 appears only in an explicit correction. No fresh Farah lookup."
  ],
  [
    59,
    "fail",
    "fail",
    "pass",
    "fail",
    "Correct wrong twin duvet and reopened trace, but asserts expired Ruth coverage, omits PW-5521-9930, and says replacement dropped after reopening revived it. No fresh lookup."
  ],
  [
    60,
    "pass",
    "pass",
    "pass",
    "pass",
    "Fresh LH-44870 customer lookup and correct Mastercard ending 7719."
  ],
  [
    61,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct sage exchange and PW-7042-1185; already shipped status is supported. Recall is not a fresh Beatriz lookup."
  ],
  [
    62,
    "fail",
    "fail",
    "pass",
    "fail",
    "Correct delivery, pro number, and claim deadline, but omits cracked glass in 2 of 8 pendants and the reopened damage claim. Recall returns only an old question and no fresh lookup occurs."
  ],
  [
    63,
    "ambiguous",
    "fail",
    "pass",
    "fail",
    "Correct Ruth sign-off within Friday coverage. End-of-day nonresponse is presented at noon as if established, but might be awkward conditional dispatch wording. No fresh lookup under either reading."
  ],
  [
    64,
    "pass",
    "pass",
    "pass",
    "pass",
    "Correct counter closure and Monday return. Generic counter-policy request requires no account/order lookup."
  ],
  [
    65,
    "pass",
    "fail",
    "fail",
    "fail",
    "Correct $289 full-refund draft with active MX-4486. Recall supplies policy but does not satisfy the required fresh lookup_order."
  ],
  [
    66,
    "pass",
    "pass",
    "pass",
    "pass",
    "Fresh LH-44870 lookup and correct Mastercard 7719. Future refund wording matches the requested payment method and does not assert completed processing."
  ],
  [
    67,
    "fail",
    "fail",
    "pass",
    "fail",
    "Correct exact gift text and dispatch today, but does not answer the arrival question or say an arrival date is unavailable. 'Included this time' implies an earlier missing gift note that the source does not establish. No fresh lookup."
  ],
  [
    68,
    "pass",
    "fail",
    "fail",
    "fail",
    "Exact gift text is correct and recall occurs, but the separate fresh lookup_order requirement is absent."
  ],
  [
    69,
    "pass",
    "fail",
    "pass",
    "fail",
    "Correct free freight on the next order; $50 credit is explicitly replaced. Recall is not a fresh Copperline lookup."
  ],
  [
    70,
    "fail",
    "fail",
    "pass",
    "fail",
    "Offers LATE10 after its October 9 expiry. On October 10 the applicable code is WKND15. No fresh Farah lookup."
  ],
  [
    71,
    "pass",
    "fail",
    "fail",
    "fail",
    "Internal-note content correctly identifies Marcus sign-off, Priya as copied, and PW-5521-9930; the requested written note is present despite surrounding future wording. No fresh lookup_order."
  ]
]
const sources = [
 [40,42,44], [40], [2,6,13,15,18,19,29], [22,27], [2,29,40,42,44], [6,7,11],
 [8,22,36], [22], [11], [22,24], [18,54,78,88,89], [50,62,94], [99,101,103],
 [71,73,108,110], [40,42,44], [120,122], [24,58,68,84,92,96,124,126],
 [58,67,82,84,90,96,101,105,110,130], [48,99,114,120,133], [62,68,92,134,136],
 [62,68,92,138], [6,7,11,142,143], [6,15,18,54,56,90,120,144], [27,82,84,148,149]
]
const packetPath = 'tmp/units/aggregate-development-blind-packet-l14-a/packet.json'
const scenarioPath = '.orkestrel/agent/instruments/harness/bench/variants/long/v1.json'
const scenario: unknown = JSON.parse(readFileSync('C:/Users/mikes/WebstormProjects/scaffold/' + scenarioPath, 'utf8'))
if (process.argv[2] === 'seal') {
 if (!('goals' in packet) || !Array.isArray(packet.goals)) throw new Error('Missing packet goals')
 if (typeof scenario !== 'object' || scenario === null || !('goals' in scenario) || !Array.isArray(scenario.goals)) throw new Error('Missing authored goals')
 const authored = scenario.goals
 const output = []
 for (const decision of decisions) {
  const [index, semantic, systemTool, listedTool, completeWork, reason] = decision
  if (typeof index !== 'number') throw new Error('Invalid manual index')
  const entry: unknown = packet.goals[index]
  if (typeof entry !== 'object' || entry === null) throw new Error('Invalid packet entry')
  const row = Object.fromEntries(Object.entries(entry))
  const goalIndex = authored.findIndex((candidate: unknown) => typeof candidate === 'object' && candidate !== null && 'request' in candidate && candidate.request === row.request)
  if (goalIndex < 0) throw new Error('Unmatched authored request')
  const goal: unknown = authored[goalIndex]
  if (typeof goal !== 'object' || goal === null || !('after' in goal) || typeof goal.after !== 'number') throw new Error('Invalid authored goal')
  const boundary: unknown = row.eligibleSource
  if (typeof boundary !== 'object' || boundary === null || !('seedPrefixThrough' in boundary) || boundary.seedPrefixThrough !== goal.after) throw new Error('Boundary mismatch')
  const seedRows = sources[goalIndex]
  if (!seedRows || seedRows.some(seed => seed > goal.after)) throw new Error('Ineligible seed citation')
  const scenarioRefs = [scenarioPath + '#/ledger/system', scenarioPath + '#/goals/' + goalIndex + '/request', scenarioPath + '#/goals/' + goalIndex + '/tools', ...seedRows.map(seed => scenarioPath + '#/seed/' + seed + '/content')]
  if ([1,14].includes(goalIndex)) scenarioRefs.push(scenarioPath + '#/tools/lookup_customer/LH-44870')
  if ([5,8,21].includes(goalIndex)) scenarioRefs.push(scenarioPath + '#/tools/lookup_order/LH-81660')
  if (goalIndex === 7) scenarioRefs.push(scenarioPath + '#/tools/lookup_customer/LH-31055')
  if (goalIndex === 19) scenarioRefs.push(scenarioPath + '#/lookups/1/text')
  if (goalIndex === 23) scenarioRefs.push(scenarioPath + '#/lookups/0/text')
  const packetRefs = [packetPath + '#/goals/' + index + '/status', packetPath + '#/goals/' + index + '/reply', packetPath + '#/goals/' + index + '/actions']
  if (!Array.isArray(row.actions)) throw new Error('Missing retained actions')
  for (let action = 0; action < row.actions.length; action++) {
   packetRefs.push(packetPath + '#/goals/' + index + '/actions/' + action + '/call')
   packetRefs.push(packetPath + '#/goals/' + index + '/actions/' + action + '/result')
  }
  output.push({ id: row.id, status: row.status, semantic, systemTool, listedTool, completeWork, reason, eligibleSource: { through: goal.after, goal: scenarioPath + '#/goals/' + goalIndex }, references: { packet: packetRefs, scenario: scenarioRefs } })
 }
 if (output.length !== packet.goals.length || new Set(output.map(row => row.id)).size !== output.length) throw new Error('Coverage mismatch')
 const resultPath = 'C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-final-blind-a-judgments.json'
 writeFileSync(resultPath, JSON.stringify(output, null, '\t') + '\n')
 console.log(JSON.stringify({ population: output.length, statuses: [...new Set(output.map(row => row.status))], path: resultPath, sha256: createHash('sha256').update(readFileSync(resultPath)).digest('hex') }))
}

