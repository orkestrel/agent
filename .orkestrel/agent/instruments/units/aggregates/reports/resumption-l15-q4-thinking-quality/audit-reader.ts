import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

// The brief permits one self-contained temporary reader; the literal verdicts are human judgments, not a scorer.
const ROOT = 'C:/Users/mikes/WebstormProjects/scaffold/'
const PACKET = ROOT + 'tmp/units/aggregate-development-blind-packet-successor-b/packet.json'
const SCENARIO = ROOT + '.orkestrel/agent/instruments/harness/bench/variants/long/v1.json'
const OUTPUT = ROOT + 'tmp/units/aggregate-successor-quality-b-judgments.json'
const EXPECTED = 'a61415997d2810b90d07626d753eb48ec3ab12ea331bd19cc66b13ae1bdb6df4'

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readPointer(value: unknown, pointer: string): unknown {
	let current = value
	for (const segment of pointer.slice(1).split('/')) {
		const key = segment.replaceAll('~1', '/').replaceAll('~0', '~')
		if (Array.isArray(current)) {
			if (!/^\d+$/.test(key) || Number(key) >= current.length) throw new Error('Missing pointer: ' + pointer)
			current = current[Number(key)]
		} else if (isRecord(current) && Object.hasOwn(current, key)) {
			current = current[key]
		} else {
			throw new Error('Missing pointer: ' + pointer)
		}
	}
	return current
}

const BYTES = readFileSync(PACKET)
if (createHash('sha256').update(BYTES).digest('hex') !== EXPECTED) throw new Error('Packet hash differs')
const PACKET_VALUE: unknown = JSON.parse(BYTES.toString('utf8'))
const SCENARIO_VALUE: unknown = JSON.parse(readFileSync(SCENARIO, 'utf8'))
if (!isRecord(PACKET_VALUE) || !Array.isArray(PACKET_VALUE.goals)) throw new Error('Packet goals missing')
if (!isRecord(SCENARIO_VALUE) || !Array.isArray(SCENARIO_VALUE.goals)) throw new Error('Scenario goals missing')
const GOALS = PACKET_VALUE.goals
const ORIGINAL = SCENARIO_VALUE.goals

// Each row is index, semantic, system actions, listed actions, completion, reasoning, deciding seed rows, extra original pointers.
const DECISIONS = [
	[0, 'fail', 'pass', 'pass', 'fail', 'Fresh LH-81660 lookup and final draft satisfy both action scopes. The customer draft gives October 12 delivery despite the no-written-date rule, and infers missing gift-note fulfillment from absent order storage. Shipped status and PW-6013-2280 are correct; no package-edit action proves the proposed addition.', [6,7,11], ['/tools/lookup_order/LH-81660']],
	[1, 'pass', 'fail', 'fail', 'fail', 'Correct Tomasz Brennan, request today because he is off Friday, and FL-660412. No fresh LH-80941 lookup; the explicit lookup_order requirement also fails.', [8,22,36], []],
	[2, 'pass', 'fail', 'pass', 'fail', 'Correct 91 Quarry Lane, Ashby; 19 is mentioned only as corrected. Final answer satisfies the listed action, but no fresh lookup of Farah account LH-58841 or order LH-85123 satisfies the system.', [99,103], []],
	[3, 'fail', 'fail', 'pass', 'fail', 'ESC-2219 is correct, but the assertion that it has been sent to Priya is unproved: the final message reaches the shift lead and actions are empty. No fresh Halvorsen lookup. Under a draft-only interpretation the ticket content passes, but literal external delivery is not represented.', [6,22,27], []],
	[4, 'fail', 'fail', 'pass', 'fail', 'Exact gift text is correct. The second-kettle reply invents 1-2 business days, asserts the gift note has been added, and applies Parcelway to the second dispatch without confirmation. Recall is not a fresh lookup; no LH-81660 lookup occurred.', [6,7,11,142], ['/tools/lookup_order/LH-81660']],
	[5, 'pass', 'fail', 'pass', 'fail', 'Tobias Lindqvist is correct. Owen and extension 4310 are still eligible at boundary 137; the buyer replacement at 138 must not be used here. No fresh Copperline account lookup.', [68,92,136], []],
	[6, 'fail', 'fail', 'pass', 'fail', 'Omits the required Dalia call on 555-0175, revives the closed ESC-2219 morning chase, and adds a required Owen call from contact availability alone. No fresh lookup for the customer/order call list.', [58,68,84,92,124,126], []],
	[7, 'pass', 'fail', 'pass', 'fail', 'Correct amended address 91 Quarry Lane, Ashby; explicitly rejects 19. No fresh Farah order/account lookup, although the listed final-message requirement is met.', [99,103], []],
	[8, 'fail', 'fail', 'pass', 'fail', 'Farah PW-7120-4466 is the remaining chase. Beatriz already received the sage rug and Copperline chairs already arrived; the reply keeps Beatriz in transit and suggests checking Copperline again. No fresh relevant order/account lookup.', [96,101,105,130], []],
	[9, 'pass', 'pass', 'pass', 'pass', 'Correct Mastercard ending 7719; fresh lookup_customer of LH-44870 and final answer fulfill the request.', [40], ['/tools/lookup_customer/LH-44870']],
	[10, 'pass', 'fail', 'pass', 'fail', 'Correct free freight on the next order; the store credit is explicitly replaced. The named Copperline late order/account requires a fresh lookup under the system, absent here.', [62,94], []],
	[11, 'pass', 'pass', 'pass', 'pass', 'Reports delivery, 2 of 8 cracked pendants, FL-660412, and the 2026-10-16 claim deadline; fresh LH-80941 lookup and final answer satisfy the actual action requirement.', [82,120,148], ['/lookups/0']],
	[12, 'fail', 'pass', 'pass', 'fail', 'Fresh LH-81660 lookup satisfies system actions. Gift text is correct, but the reply writes October 12 to the customer and transfers the earlier kettle tracking/estimate to the second replacement without confirmation.', [6,7,11,142], ['/tools/lookup_order/LH-81660']],
	[13, 'pass', 'fail', 'pass', 'fail', 'Correct Tobias Lindqvist and assignment date. Owen remains the eligible buyer through 137. No fresh lookup_customer for LH-71592 or other relevant lookup.', [68,92,136], []],
	[14, 'pass', 'fail', 'pass', 'fail', 'Correct ESC-2219 content. Recall recovered the correction but is not a fresh Halvorsen lookup. The protocol supplies the final text to the shift lead, not proof of sending it to Priya; content passes as a draft, and literal delivery remains unproved.', [6,22,27], []],
	[15, 'pass', 'pass', 'pass', 'pass', 'Correct Mastercard ending 7719 and full $289 refund. Fresh LH-44870 account lookup and final answer meet both action scopes.', [40,42,44], ['/tools/lookup_customer/LH-44870']],
	[16, 'pass', 'fail', 'fail', 'fail', 'Draft includes $289 full refund, zero fee, current MX-4486 approval code, and the return deadline. Correct card detail is supported by the original customer source. No fresh lookup; the explicitly listed lookup_order is absent.', [2,29,40,42,44], ['/tools/lookup_customer/LH-44870']],
	[17, 'fail', 'fail', 'pass', 'fail', 'Delivery, FL-660412, and deadline are correct, but the answer omits the deciding current condition: 2 pendants have cracked glass and ESC-2219 reopened. No fresh Halvorsen lookup.', [82,148], []],
	[18, 'pass', 'pass', 'pass', 'pass', 'Fresh LH-31055 lookup supports $5,000 minus $1,240 = $3,760 and Ines Albrecht. The stated $3,760 available for a new order makes the $3,000 fit clear without requiring a literal yes.', [22], ['/tools/lookup_customer/LH-31055']],
	[19, 'pass', 'fail', 'pass', 'fail', 'Correct Ruth Adeyemi for Friday sign-off; no erroneous immediate dispatch claim. No fresh Grace order/account lookup despite this being her replacement request.', [13,18,54,78,88], []],
	[20, 'pass', 'fail', 'pass', 'fail', 'Correct ESC-2219 content; recall is not a fresh Halvorsen lookup. The final message provides text for the shift lead, not proof of external delivery to Priya. Draft-only content passes; literal sending remains unproved.', [6,22,27], []],
	[21, 'pass', 'pass', 'pass', 'pass', 'Correct free freight on the next order; excludes the displaced credit/code. Fresh LH-71592 lookup and final answer satisfy the system and listed scope.', [62,94], ['/tools/lookup_customer/LH-71592']],
	[22, 'pass', 'fail', 'fail', 'fail', 'Correct direct extension 4127 and after 2 pm. No fresh Halvorsen lookup under the system, and no recall to satisfy the explicit search_history requirement translated to the actual protocol.', [22,24], []],
	[23, 'pass', 'pass', 'pass', 'pass', 'Fresh LH-44870 lookup establishes Mastercard 7719. Full refund without a restocking fee matches the withdrawal and return window.', [40,42,44], ['/tools/lookup_customer/LH-44870']],
	[24, 'fail', 'fail', 'pass', 'fail', 'Uses expired Ruth authority on Saturday instead of Marcus, calls the replacement a full refund, and omits Priya from the escalation. The wrong-person parcel reason and references are useful, but the operational remedy/sign-off are wrong. No fresh Grace lookup.', [2,6,15,18,54,56,90,120,144], []],
	[25, 'pass', 'pass', 'pass', 'pass', 'Fresh LH-31055 account lookup supports the correct $3,760 available, explicit $3,000 fit, and Ines Albrecht.', [22], ['/tools/lookup_customer/LH-31055']],
	[26, 'pass', 'fail', 'fail', 'fail', 'Correct Tomasz Brennan, today deadline, and FL-660412. Both the controlling fresh-lookup requirement and explicit lookup_order requirement are unmet.', [8,22,36], []],
	[27, 'pass', 'fail', 'fail', 'fail', 'Exact gift wording Happy 40th, Aiko is correct. Neither fresh LH-81660 lookup nor explicitly required recall occurred.', [11], []],
	[28, 'pass', 'fail', 'fail', 'fail', 'Requested authorization draft correctly states $289, MX-4486, no fee, and the return deadline; card matches the source. Draft language is not evidence that a refund tool ran. No fresh or explicitly listed order lookup.', [2,29,40,42,44], ['/tools/lookup_customer/LH-44870']],
	[29, 'fail', 'fail', 'pass', 'fail', 'Lists only already-arrived Copperline and Beatriz shipments and omits Farah PW-7120-4466, whose afternoon chase remains active. No fresh order/account lookup.', [96,101,105,130], []],
	[30, 'pass', 'fail', 'pass', 'fail', 'Correct WKND15, 15 percent, and October 10-11 validity; LATE10 is not revived. No fresh lookup for Farah late-order/account request.', [99,114,120,133], []],
	[31, 'fail', 'pass', 'pass', 'fail', 'Fresh LH-81660 lookup occurred, but the customer reply calls October 7 shipment today on October 8, gives prohibited October 12 arrival, asserts the gift note was not applied, and invents later warehouse handling.', [0,6,7,11], ['/tools/lookup_order/LH-81660']],
	[32, 'fail', 'fail', 'fail', 'fail', 'Correct $289, Mastercard 7719, and October 21 return end; the 3-5 business-day credit timing is unsupported by the scenario. No fresh or explicitly required LH-44870 account lookup.', [40,42,44], ['/tools/lookup_customer/LH-44870']],
	[33, 'fail', 'fail', 'pass', 'fail', 'Omits Dalia 555-0175, revives the ended Freightline morning chase, and treats Owen availability as a mandatory call. No fresh relevant lookup.', [58,68,84,92,124,126], []],
	[34, 'ambiguous', 'fail', 'fail', 'fail', 'Marcus sign-off, Priya copy, and PW-5521-9930 are correct. Action: Open locker trace can summarize the standing trace requirement (content pass) or wrongly restart a trace already opened at seed 19 (content fail). No fresh lookup_order under either reading.', [6,13,15,16,18,19], []],
	[35, 'fail', 'pass', 'pass', 'fail', 'Incorrectly says the counter is open 9 am-1 pm; seed 122 closed it all Saturday and moved walk-in returns to Monday. This generic policy query requires no order/account lookup; final-message actions pass.', [112,120,122], []],
	[36, 'pass', 'fail', 'pass', 'fail', 'Tobias Lindqvist and October 9 assignment are correct; Owen is still eligible through 137. No fresh LH-71592 account or relevant order lookup.', [68,92,136], []],
	[37, 'pass', 'fail', 'pass', 'fail', 'Correct WKND15 and October 10-11 validity. No fresh lookup for Farah account/order despite correct policy content.', [99,114,120,133], []],
	[38, 'pass', 'fail', 'fail', 'fail', 'Exact Happy 40th, Aiko wording is correct. No fresh LH-81660 lookup and no explicitly required recall.', [11], []],
	[39, 'pass', 'fail', 'fail', 'fail', 'Correct extension 4127 and after 2 pm on the correct day. No fresh Halvorsen lookup and no explicitly required recall.', [0,22,24], []],
	[40, 'fail', 'pass', 'pass', 'fail', 'Fresh LH-44870 lookup and final draft satisfy actions; $289, Mastercard 7719, and October 21 are correct. Adds unsupported 3-5 business-day arrival of the credit and declares the return complete beyond the stated refunded premise.', [40,42,44], ['/tools/lookup_customer/LH-44870']],
	[41, 'ambiguous', 'fail', 'fail', 'fail', 'Correct Marcus, Priya, and tracking. Open locker trace can be read as a procedural summary, but literally duplicates the trace already opened in seed 19. Recall of old order text is not a fresh lookup_order, so work fails either way.', [6,13,15,18,19], []],
	[42, 'fail', 'fail', 'pass', 'fail', 'Correct sage exchange, PW-7042-1185, and dispatch day. Customer advised to monitor daily is an unsupported completed communication and shifts the carrier-chase action from the desk to the customer. No fresh Beatriz order/account lookup.', [71,73,78,108,110], []],
	[43, 'pass', 'fail', 'fail', 'fail', 'Correct full $289 with the restocking fee removed. No fresh LH-79215 lookup, also explicitly required as lookup_order.', [40,42,44], []],
	[44, 'fail', 'pass', 'pass', 'fail', 'Uses superseded 9 am-1 pm hours instead of the all-day closure and Monday return instruction. Generic desk policy needs no fresh customer/order lookup; final-message actions pass.', [112,120,122], []],
	[45, 'pass', 'fail', 'pass', 'fail', 'Correct Hana Ikeda, email-only channel, and hana.ikeda@copperline.example; Owen is explicitly historical. No fresh Copperline lookup for this account contact request.', [62,138], []],
	[46, 'pass', 'fail', 'pass', 'fail', 'Correct complete amended street address 91 Quarry Lane, Ashby. No fresh Farah account/order lookup.', [99,103], []],
	[47, 'pass', 'pass', 'pass', 'pass', 'Fresh LH-31055 lookup supports correct $3,760 available, $3,000 fit, and Ines Albrecht.', [22], ['/tools/lookup_customer/LH-31055']],
	[48, 'pass', 'fail', 'pass', 'fail', 'Correct Hana Ikeda and email-only address. No fresh Copperline account/order lookup.', [62,138], []],
	[49, 'pass', 'fail', 'fail', 'fail', 'Exact gift wording recovered by recall. Its embedded historical lookup result is not a fresh lookup_order, so both system and the explicit lookup_order list remain unmet.', [11], []],
	[50, 'pass', 'fail', 'pass', 'fail', 'Correct Hana Ikeda and email-only address; no phone route is supported by the replacement contact instruction. No fresh Copperline account/order lookup.', [62,138], []],
	[51, 'pass', 'fail', 'pass', 'fail', 'Correct free freight on the next order; $50 credit is clearly displaced. No fresh Copperline order/account lookup.', [62,78,94], []],
	[52, 'fail', 'fail', 'pass', 'fail', 'Lists delivered Copperline and Beatriz items as active chases, and omits the active Farah PW-7120-4466 chase. No fresh relevant lookup.', [96,101,105,130], []],
	[53, 'fail', 'pass', 'pass', 'fail', 'Fresh lookup and recall satisfy action scopes; exact card text is correct. The customer reply writes October 12 and treats the first replacement tracking/estimate as the second dispatch details, which seed 142 does not establish.', [6,7,11,142], ['/tools/lookup_order/LH-81660']],
	[54, 'pass', 'fail', 'pass', 'fail', 'Correct Ruth Adeyemi covering Marcus through Friday. No fresh Grace order/account lookup.', [13,18,54,78,88], []],
	[55, 'ambiguous', 'fail', 'fail', 'fail', 'Correct Marcus, Priya, and tracking. The MX-4486 sign-off annotation could be incidental accurate code context, or imply the refund-over-$200 code authorizes this $148.50 replacement; the latter is unsupported. Locker trace required can describe the ongoing requirement. No fresh lookup_order in either interpretation.', [2,6,13,15,18,19,29], []],
	[56, 'ambiguous', 'pass', 'pass', 'ambiguous', 'Correct Saturday closure and Monday deferral. Monday morning adds a reopening time absent from seed 122: if colloquial Monday reopening it passes the requested answer; as a promise of morning access it is unsupported. Generic policy requires no order/account lookup, and final message fulfills the listed action.', [120,122], []],
	[57, 'pass', 'fail', 'fail', 'fail', 'Correct extension 4127 after 2 pm; optional main switchboard matches the customer source. No fresh Halvorsen lookup and no explicitly required recall.', [22,24], ['/tools/lookup_customer/LH-31055']],
	[58, 'pass', 'fail', 'pass', 'fail', 'Correct sole morning call: Dalia 555-0175 to book the sofa slot; excludes the closed Freightline chase. This concerns LH-66208/LH-86610, so no fresh lookup means system actions fail.', [58,84,124,126], []],
	[59, 'pass', 'fail', 'fail', 'fail', 'Draft correctly states $289 full refund, MX-4486, no fee, correct card, and return end. No fresh order/account lookup, and explicit lookup_order missing.', [2,29,40,42,44], ['/tools/lookup_customer/LH-44870']],
	[60, 'pass', 'fail', 'fail', 'fail', 'Correct full $289 refund after the fee withdrawal. No fresh LH-79215 lookup required by both system and explicit list.', [40,42,44], []],
	[61, 'fail', 'fail', 'fail', 'fail', 'Required $289, Mastercard 7719, and October 21 are correct, but the customer draft adds unsupported 3-5 business-day posting timing. No fresh or explicitly required LH-44870 lookup.', [40,42,44], ['/tools/lookup_customer/LH-44870']],
	[62, 'fail', 'pass', 'pass', 'fail', 'Fresh LH-81660 lookup meets actions. Draft promises receipt by October 12 and claims the gift note has been added; neither the date promise nor completed package edit is allowed/supported. The internal shipped date and tracking are correct.', [6,7,11], ['/tools/lookup_order/LH-81660']],
	[63, 'pass', 'fail', 'pass', 'fail', 'Correct sage exchange instead of refund, PW-7042-1185, and October 9 dispatch. No fresh lookup of Beatriz account/order.', [71,73,78,108,110], []],
	[64, 'pass', 'fail', 'pass', 'fail', 'Correct WKND15, 15 percent, and October 10-11 validity for Farah. No fresh Farah account/order lookup.', [99,114,120,133], []],
	[65, 'fail', 'fail', 'pass', 'fail', 'Correct wrong twin parcel, Marcus sign-off, TR-3307, and PW-5521-9930. Mislabels escalations manager Marcus as account manager, omits required Priya copy, and asserts dispatch processing without evidence. No fresh Grace lookup.', [2,6,13,15,18,54,56,90,120,144], []],
	[66, 'pass', 'fail', 'pass', 'fail', 'Correct Ruth coverage through Friday and Grace claim basis. No fresh Grace order/account lookup.', [13,16,18,54,78,88], []],
	[67, 'pass', 'fail', 'fail', 'fail', 'Correct Tomasz Brennan, Thursday deadline before Friday absence, and FL-660412. No fresh LH-80941 lookup, which the explicit list also requires.', [8,22,36], []],
	[68, 'fail', 'fail', 'pass', 'fail', 'Correct sage exchange and PW-7042-1185, but customer notified of tracking number is an unsupported completed action in the internal note. No fresh Beatriz lookup or communication action proves it.', [71,73,108,110], []],
	[69, 'fail', 'fail', 'pass', 'fail', 'Correct delivery, pro, and claim deadline, but omits the reopened cracked-glass complaint that determines current condition and need for a claim. Recall is only historical retrieval, not a fresh LH-80941 lookup.', [82,120,148], []],
	[70, 'pass', 'fail', 'fail', 'fail', 'Correct $289 full refund and withdrawn fee. No fresh LH-79215 lookup required by system and explicit list.', [40,42,44], []],
	[71, 'fail', 'fail', 'pass', 'fail', 'Correct wrong twin parcel, Marcus, and references, but falsely dates collection/opening to October 3, calls the reopened trace resolved, and omits Priya. Collection was October 9 and reopen October 10. No fresh Grace lookup.', [6,15,18,54,56,78,90,120,144], []]
] as const

if (GOALS.length !== 72 || DECISIONS.length !== GOALS.length) throw new Error('Coverage mismatch')
const JUDGMENTS = []
const IDS = new Set<string>()
let citations = 0
for (const decision of DECISIONS) {
	const [index, semantic, systemTool, listedTool, completeWork, reason, seeds, extra] = decision
	const row: unknown = GOALS[index]
	if (!isRecord(row) || typeof row.id !== 'string' || typeof row.request !== 'string' || typeof row.status !== 'string' || typeof row.reply !== 'string' || !Array.isArray(row.actions) || !isRecord(row.eligibleSource) || typeof row.eligibleSource.seedPrefixThrough !== 'number') throw new Error('Malformed row ' + index)
	if (IDS.has(row.id)) throw new Error('Duplicate id')
	IDS.add(row.id)
	const original = ORIGINAL.findIndex((goal: unknown) => isRecord(goal) && goal.request === row.request)
	const goal: unknown = ORIGINAL[original]
	if (!isRecord(goal) || goal.after !== row.eligibleSource.seedPrefixThrough) throw new Error('Source boundary differs')
	const packet = [PACKET + '#/goals/' + index + '/request', PACKET + '#/goals/' + index + '/status', PACKET + '#/goals/' + index + '/reply', PACKET + '#/goals/' + index + '/actions']
	for (const [action] of row.actions.entries()) {
		packet.push(PACKET + '#/goals/' + index + '/actions/' + action + '/call', PACKET + '#/goals/' + index + '/actions/' + action + '/result')
	}
	const scenario = [SCENARIO + '#/ledger/system', SCENARIO + '#/goals/' + original, SCENARIO + '#/goals/' + original + '/tools']
	for (const seed of seeds) {
		if (seed > row.eligibleSource.seedPrefixThrough) throw new Error('Later evidence used')
		scenario.push(SCENARIO + '#/seed/' + seed + '/content')
	}
	for (const pointer of extra) scenario.push(SCENARIO + '#' + pointer)
	for (const reference of [...packet, ...scenario]) {
		const [file, pointer] = reference.split('#')
		if (typeof pointer !== 'string') throw new Error('No pointer')
		readPointer(file === PACKET ? PACKET_VALUE : SCENARIO_VALUE, pointer)
		citations++
	}
	JUDGMENTS.push({ id: row.id, status: row.status, semantic, systemTool, listedTool, completeWork, reason, eligibleSource: { through: row.eligibleSource.seedPrefixThrough, goal: SCENARIO + '#/goals/' + original }, references: { packet, scenario } })
}
let refused = false
try {
	readPointer({ control: true }, '/missing')
} catch {
	refused = true
}
if (!refused) throw new Error('Citation checker negative control did not fail')
if (process.argv.includes('--seal')) writeFileSync(OUTPUT, JSON.stringify(JUDGMENTS, null, 2) + '\n', 'utf8')
if (process.argv.includes('--check')) {
	const retained: unknown = JSON.parse(readFileSync(OUTPUT, 'utf8'))
	if (JSON.stringify(retained) !== JSON.stringify(JUDGMENTS)) throw new Error('Retained judgments differ')
}
console.log(JSON.stringify({ rows: JUDGMENTS.length, identities: IDS.size, citations, missing: 0, boundary: 'inclusive; all cited seed rows eligible', control: 'missing pointer refused', packet: EXPECTED, judgments: process.argv.includes('--seal') || process.argv.includes('--check') ? createHash('sha256').update(readFileSync(OUTPUT)).digest('hex') : undefined }))
