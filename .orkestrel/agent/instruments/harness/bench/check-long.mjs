#!/usr/bin/env node
// Validates scenario-long.json against scenario.json and the construction rules its notes state.
// Runs no model and no daemon. Exits 0 when every check passes and 3 on any failure.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { clean, compileRules, scoreText } from './rescore.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const long = JSON.parse(readFileSync(join(HERE, 'scenario-long.json'), 'utf8'))
const short = JSON.parse(readFileSync(join(HERE, 'scenario.json'), 'utf8'))
const ledgerV1 = JSON.parse(readFileSync(join(HERE, 'variants', 'ledger', 'v1.json'), 'utf8'))
const audit = JSON.parse(readFileSync(join(HERE, 'long-audit.json'), 'utf8'))

const CATEGORIES = new Set(['fact', 'rule', 'correction', 'request', 'opinion', 'chatter', 'distractor'])
const DESK = new Set(['refunds', 'returns', 'escalations', 'delivery', 'warehouse', 'contacts'])
const ENTITY = /^(?:LH-\d{5}|ESC-\d{4}|TR-\d{4})$/
const KINDS = new Set(['fact', 'correction', 'withdrawal', 'distractor', 'chatter', 'tool-group'])
const TOOLS = new Set(['lookup_order', 'lookup_customer', 'search_history', 'send_reply'])
const DATE = /^\d{4}-\d{2}-\d{2}$/
const ID = /\bLH-\d{5}\b/g
const REQUIRED_CASES = ['explicit-close', 'wide-close', 'reopen', 'opinion-change', 'expiry', 'returning-customer', 'amend', 'supersede', 'replaced-lookup', 'stale-instruction']

// BRIEFING.md section 5 fixes these categories for the first 48 messages.
const BRIEFING_CATEGORIES = {
	fact: [0, 11, 12, 13, 17, 19, 22, 23, 24, 37, 40, 43, 15, 16, 36, 42],
	rule: [2, 3, 4, 5, 6, 7, 8, 18],
	correction: [27, 28, 29, 30, 44, 45],
	request: [34],
	chatter: [1, 10, 21, 26, 32, 39, 47, 14, 35, 41],
	distractor: [9, 20, 25, 31, 33, 38, 46],
}
const BRIEFING_LINKS = { 27: { amends: [22, 23] }, 29: { amends: [2, 3] }, 44: { supersedes: [4, 5] } }

// Replies a correct, a stale, and a hedged stale answer would give; each new goal must pass the first kind and fail the other two.
// A hedged reply names the right answer and keeps the stale value beside it, so it fails only on the stale value where the goal forbids one.
const SAMPLES = {
	'g11-grace-signoff-today': {
		pass: ["Ruth Adeyemi signs off Grace's replacement today, because Marcus is at the supplier summit through 2026-10-09."],
		fail: ['Marcus Oyelaran has to sign off the replacement.'],
		hedged: ["Marcus Oyelaran signs off Grace's replacement, unless he is unreachable at the summit.", "Ruth Adeyemi signs off Grace's replacement today, and Marcus Oyelaran will also sign off."],
	},
	'g12-copperline-gesture': {
		pass: ["Marcus prefers free freight on Copperline's next order rather than the $50 store credit.", 'Offer Copperline free freight on their next order.', 'Offer free freight on their next order instead of the $50 store credit.'],
		fail: ['Offer Copperline a $50 store credit, plus free freight on the next order.', 'Give them a store credit and free freight on the next order.'],
		hedged: ['Offer free freight on the next order, or a $50 store credit rather than a discount code.', 'Offer free freight on their next order, and perhaps the $50 store credit as well.'],
	},
	'g13-farah-address': {
		pass: ['Enter 91 Quarry Lane, Ashby.', 'Enter 91 Quarry Lane, Ashby, not 19 Quarry Lane.'],
		fail: ['Enter 19 Quarry Lane, Ashby.', 'Enter 91 Quarry Lane. Parcelway also has 19 Quarry Lane on file for her.'],
		hedged: ['Enter 91 Quarry Lane, Ashby, or 19 Quarry Lane if the form rejects it.'],
	},
	'g14-beatriz-remedy': {
		pass: ['Beatriz Solano changed her mind: ship the sage rug as an exchange on LH-83317, Parcelway tracking PW-7042-1185. Do not refund the $412.00.', 'Send the sage rug as an exchange instead of a full refund, tracking PW-7042-1185.'],
		fail: ['Refund Beatriz $412.00 and send the sage rug as an exchange, tracking PW-7042-1185.', 'Issue a full refund and an exchange for the sage rug, tracking PW-7042-1185.'],
		hedged: ['Send the sage rug as an exchange, tracking PW-7042-1185, and refund the $412.00 too if Beatriz still asks.'],
	},
	'g15-luis-returns': {
		pass: ['Hi Luis, we refunded the full $289.00 for the stand mixer to your Mastercard ending 7719; returns on that order were open until 2026-10-21.'],
		fail: ['Hi Luis, we refunded $245.65 after the 15 percent restocking fee to your Mastercard ending 7719; the return window runs to 2026-10-21.', 'Hi Luis, we refunded $289.00 to your Mastercard ending 7719, subject to a restocking fee; the return window runs to 2026-10-21.'],
		hedged: ['Hi Luis, we refunded $289.00 to your Mastercard ending 7719, returns open until 2026-10-21, though a restocking fee of 15 percent may still come off.'],
	},
	'g16-walk-in-return': {
		pass: ['Tell her the walk-in counter is closed all day today for floor work; walk-in returns wait until Monday.'],
		fail: ['Tell her the counter is open 9 am to 1 pm today, or she can come Monday.'],
		hedged: ['She can probably drop it off between 9 am and 1 pm today, or wait until Monday.'],
	},
	'g17-phone-list': {
		pass: ['Call Dalia Moreno on 555-0175 to book her sofa delivery slot.', 'Call Dalia Moreno on 555-0175. Freightline Riverside on 555-0188 is no longer needed because ESC-2219 closed.', 'Call Dalia Moreno on 555-0175, not 555-0188.'],
		fail: ['Call Freightline Riverside on 555-0188, then Dalia Moreno on 555-0175.'],
		hedged: ['Call Dalia Moreno on 555-0175, and maybe Freightline Riverside on 555-0188 if ESC-2219 is still open.'],
	},
	'g18-chase-list': {
		pass: ["Chase Parcelway on PW-7120-4466 for Farah Haddad's curtains.", "Chase PW-7120-4466 for Farah. Beatriz's PW-7042-1185 already arrived.", 'Chase PW-7120-4466 for Farah; PW-7042-1185 arrived on 2026-10-10.'],
		fail: ['Chase PW-7120-4466 for Farah and PW-7042-1185 for Beatriz.', 'Chase Parcelway on PW-7120-4466 and Freightline on FL-661978.'],
		hedged: ['Chase PW-7120-4466 for Farah and PW-7042-1185 for Beatriz; neither has landed yet.', 'Chase PW-7120-4466 for Farah, and FL-661978 for Copperline in case the chairs are still out.'],
	},
	'g19-farah-code': {
		pass: ['Give Farah WKND15 for 15 percent off; LATE10 expired on 2026-10-09.'],
		fail: ['Give Farah LATE10 for 10 percent off.', 'Give Farah LATE10 or WKND15.'],
		hedged: ['Give Farah WKND15 for 15 percent off, or LATE10 if it still works.'],
	},
	'g20-copperline-manager': {
		pass: ['Their account manager is Tobias Lindqvist.', 'Their account manager is Tobias Lindqvist, not Ines Albrecht, since 2026-10-09.'],
		fail: ['Their account manager is Ines Albrecht.', 'Talk to Ines Albrecht or Tobias Lindqvist.'],
		hedged: ['Their account manager is Tobias Lindqvist, though Ines Albrecht may still handle the reorder.'],
	},
	'g21-copperline-buyer': {
		pass: ['Their buyer is Hana Ikeda; email her at hana.ikeda@copperline.example.', 'Owen Pritchard on extension 4310 has left; email Hana Ikeda at hana.ikeda@copperline.example.'],
		fail: ['Their buyer is Hana Ikeda at hana.ikeda@copperline.example, or call extension 4310 before noon.'],
		hedged: ['Email Hana Ikeda at hana.ikeda@copperline.example, or try Owen on extension 4310 before noon.'],
	},
	'g22-kenji-returns': {
		pass: ["Card text: Happy 40th, Aiko. Reply to Kenji: your second replacement kettle ships today, and we will send the tracking number as soon as Parcelway has it."],
		fail: ['Card: Happy 40th, Aiko. It will arrive on 2026-10-12.', 'Card: Happy 40th, Aiko. Expect it by October 12.'],
		hedged: ['Card: Happy 40th, Aiko. Reply: it might arrive by Oct 12, but no promises.'],
	},
	'g23-grace-reopened': {
		pass: ["Marcus Oyelaran signs off Grace Okafor's replacement, because the locker parcel was a twin set for someone else; trace TR-3307, Parcelway tracking PW-5521-9930.", 'Marcus is back, so he signs off rather than Ruth Adeyemi; the locker parcel was a twin set; trace TR-3307, tracking PW-5521-9930.'],
		fail: ['Ruth Adeyemi signs off; the locker parcel was a twin set; trace TR-3307, tracking PW-5521-9930; copy Marcus.'],
		hedged: ['Ruth Adeyemi signs off because Marcus is not back until Monday; trace TR-3307, tracking PW-5521-9930.', 'Ruth Adeyemi can sign off if Marcus is busy; the locker parcel was a twin set, so the replacement goes; trace TR-3307, tracking PW-5521-9930, copy Marcus.'],
	},
	'g24-halvorsen-claim': {
		pass: ['Two of the 8 pendants arrived with cracked glass; Freightline pro FL-660412; claims are accepted until 2026-10-16.'],
		fail: ['Pro FL-660412; the lights are held at Riverside awaiting a release.'],
		hedged: ['Two pendants are cracked; pro FL-660412, claims until 2026-10-16, though the lights may still be awaiting a release at Riverside.'],
	},
}

// One reply per scored lifetime case, keyed by caseKey: right on every value the case's own messages do not decide, and applying the stale version.
const CASE_REPLIES = {
	'explicit-close 84,85': 'Call Dalia Moreno on 555-0175 and Freightline Riverside on 555-0188 for the Halvorsen status.',
	'wide-close 96': 'Chase PW-7120-4466 for Farah and FL-661978 for the Copperline chairs.',
	'wide-close 130': "Chase PW-7120-4466 for Farah and PW-7042-1185 for Beatriz's rug.",
	'reopen 90,144,145': 'Marcus Oyelaran would sign off, but TR-3307 is closed and Grace collected her duvet, so nothing goes out; tracking PW-5521-9930.',
	'reopen 84,148,149': 'ESC-2219 is closed and the lights were delivered; if a claim comes up, pro FL-660412, claims until 2026-10-16.',
	'opinion-change 50,51,94': 'Offer Copperline a $50 store credit.',
	'opinion-change 74,75,108': 'Refund Beatriz the $412.00 for the wrong rug; the sage rug on PW-7042-1185 can come back.',
	'expiry 48,49': 'Give Farah LATE10 for 10 percent off, or WKND15.',
	'expiry 54,55': 'Ruth Adeyemi signs off for Marcus; the locker parcel was a twin set for someone else; trace TR-3307, tracking PW-5521-9930.',
	'returning-customer 40,42,44': 'Hi Luis, we refunded $245.65 after the 15 percent restocking fee to your Mastercard ending 7719.',
	'returning-customer 11,142': 'Card: Happy 40th, Aiko. Your second kettle should arrive by October 12.',
	'amend 99,102,103': 'Enter 19 Quarry Lane, Ashby.',
	'supersede 112,113,122': 'She can drop it off from 9 am to 1 pm today, or on Monday.',
	'supersede 68,92,93,138': 'Call Owen Pritchard on extension 4310 before noon.',
	'replaced-lookup 36,82': 'Two pendants arrived cracked; pro FL-660412, but the lights are still held at Riverside awaiting a release.',
	'replaced-lookup 65,136': 'Their account manager is Ines Albrecht.',
	'stale-instruction 58,59,84': 'Call Dalia Moreno on 555-0175, then Freightline Riverside on 555-0188 for the morning status.',
	'stale-instruction 67,96': 'Chase PW-7120-4466 for Farah, and FL-661978 with Freightline.',
	'stale-instruction 110,111,130': 'Chase PW-7120-4466 and PW-7042-1185 this afternoon.',
}

const failures = []
let passed = 0
function check(name, problems) {
	if (problems.length === 0) {
		passed += 1
		console.log(`ok   ${name}`)
		return
	}
	failures.push(name)
	console.log(`FAIL ${name}`)
	for (const problem of problems.slice(0, 20)) console.log(`     ${problem}`)
	if (problems.length > 20) console.log(`     and ${problems.length - 20} more`)
}

const seed = long.seed ?? []
const goals = long.goals ?? []
const cases = long.cases ?? []
const lower = (text) => String(text).toLowerCase()
const content = (index) => seed[index]?.content ?? ''
const goalById = new Map(goals.map((goal) => [goal.id, goal]))
const position = new Map(goals.map((goal, index) => [goal.id, index]))

function dayOf(index) {
	let date
	for (const day of long.days ?? []) if (day.from <= index) date = day.date
	return date
}

// The lookup text a call made at seed index `index` receives, by the lookups member's rule.
function canned(tool, id, index) {
	let text = long.tools?.[tool]?.[id]
	let from = -1
	for (const entry of long.lookups ?? []) {
		if (entry.tool === tool && entry.id === id && entry.from <= index && entry.from > from) {
			text = entry.text
			from = entry.from
		}
	}
	return text
}

function patternsOf(goal) {
	return (goal.forbiddenPatterns ?? []).map((source) => new RegExp(source, 'i'))
}

// Scores a reply as bench.mjs and rescore.mjs do, on the reply text without its markdown.
function scores(goal, reply) {
	return clean(scoreText(compileRules(goal), reply))
}

function stale(goal, text) {
	return goal.forbidden.some((item) => lower(text).includes(lower(item))) || patternsOf(goal).some((pattern) => pattern.test(text))
}

// Shape.
// scenario.json's system text adds three sentences on 2026-10-08 that the long scenario leaves out: the date, which the driver writes as an instruction, and the two omitted-history sentences, which belong to the compaction arms.
const SHORT_ONLY = [
	'Today is Thursday 2026-10-08. ',
	'Earlier messages can be omitted from view, and a message that begins with "[Summary of earlier messages]" is a recap that condenses earlier history. ',
	'When a request names a person, id, or fact that is not in view, you must call search_history to find it before you answer. ',
]
const sharedSystem = SHORT_ONLY.reduce((text, sentence) => text.replace(sentence, ''), short.system)
check('top-level members', [
	...['title', 'system', 'ledger', 'days', 'seed', 'tools', 'lookups', 'goals', 'cases', 'notes'].filter((key) => long[key] === undefined).map((key) => `missing ${key}`),
	...(SHORT_ONLY.every((sentence) => short.system.includes(sentence)) ? [] : ['scenario.json system lacks a sentence this check removes']),
	...(long.system === sharedSystem ? [] : ['system differs from scenario.json system without its date and omitted-history sentences']),
	...(long.system === ledgerV1.system ? [] : ['system differs from variants/ledger/v1.json system']),
	...(Object.keys(long).indexOf('ledger') === Object.keys(long).indexOf('system') + 1 ? [] : ['ledger does not follow system']),
])

// The ledger section: the createLedger system text and the six desk topics.
{
	const SEARCH = 'When a fact you need is not in view, you must call search_history with a distinctive name, id, or word to recover it from the full conversation record.'
	const FINISH = 'You must finish every request by calling send_reply with the complete answer; only the send_reply text counts as your answer.'
	const RECALL = 'When a fact you need is not in view, you must call recall with a topic (a customer name, an order or account id, or a desk topic) to recover it from the full conversation record.'
	const ENDING = 'Finish every request with your complete answer as your final message; that message is what the shift lead receives.'
	const system = long.ledger?.system
	const problems = []
	if (typeof system !== 'string') problems.push('ledger.system is not a string')
	else {
		if (!/\brecall\b/.test(system)) problems.push('ledger.system does not name recall')
		if (/\bsearch_history\b/.test(system)) problems.push('ledger.system names search_history')
		if (/\bsend_reply\b/.test(system)) problems.push('ledger.system names send_reply')
		if (/\bToday is\b/.test(system)) problems.push('ledger.system carries a date sentence')
		if (!ledgerV1.ledger.system.includes(RECALL)) problems.push('variants/ledger/v1.json ledger.system lacks the recall sentence')
		if (system !== long.system.replace(SEARCH, RECALL).replace(FINISH, ENDING)) problems.push('ledger.system is not the long system with the recall and finish sentences replaced')
	}
	if (!isDeepStrictEqual(long.ledger?.topics, ledgerV1.ledger.topics)) problems.push('ledger.topics differs from variants/ledger/v1.json ledger.topics')
	if (!isDeepStrictEqual(Object.keys(long.ledger?.topics ?? {}).sort(), [...DESK].sort())) problems.push('ledger.topics does not name exactly the six desk topics')
	if (!isDeepStrictEqual(Object.keys(long.ledger ?? {}), ['system', 'topics'])) problems.push('ledger holds members other than system and topics')
	check('ledger carries the createLedger system text and the six desk topics', problems)
}

check('seed size is about 150', seed.length >= 140 && seed.length <= 160 ? [] : [`seed has ${seed.length} messages`])

check(
	'first 48 messages equal scenario.json seed',
	short.seed.flatMap((message, index) => {
		const other = seed[index] ?? {}
		return ['role', 'kind', 'content', 'calls', 'call'].filter((key) => JSON.stringify(message[key]) !== JSON.stringify(other[key])).map((key) => `${index}.${key}`)
	}),
)

// Tool groups.
{
	const problems = []
	const callIds = new Set()
	const paired = new Set()
	for (const [index, message] of seed.entries()) {
		if (!message.calls) continue
		if (message.role !== 'assistant') problems.push(`${index}: calls on a ${message.role} message`)
		const following = seed.slice(index + 1, index + 1 + message.calls.length)
		const expectedIds = message.calls.map((call) => call.id)
		if (following.length !== message.calls.length || following.some((tool) => tool.role !== 'tool')) problems.push(`${index}: not followed by ${message.calls.length} tool messages`)
		if (seed[index + 1 + message.calls.length]?.role === 'tool') problems.push(`${index}: more tool messages than calls`)
		for (const [offset, call] of message.calls.entries()) {
			if (callIds.has(call.id)) problems.push(`${index}: duplicate call id ${call.id}`)
			callIds.add(call.id)
			const tool = following[offset]
			if (!tool) continue
			paired.add(index + 1 + offset)
			if (tool.call !== expectedIds[offset]) problems.push(`${index + 1 + offset}: call ${tool.call} does not match ${expectedIds[offset]}`)
			const key = call.name === 'lookup_order' ? call.arguments?.id : call.arguments?.account
			const text = canned(call.name, key, index)
			if (text === undefined) problems.push(`${index}: no canned ${call.name} for ${key}`)
			else if (tool.content !== text) problems.push(`${index + 1 + offset}: content differs from canned ${call.name} ${key} as of ${index}`)
		}
	}
	for (const [index, message] of seed.entries()) if (message.role === 'tool' && !paired.has(index)) problems.push(`${index}: tool message outside a tool group`)
	check('every tool group has one tool message per call with matching ids and canned text', problems)
}

check(
	'lookups versions follow a seed call of the same id',
	(long.lookups ?? []).flatMap((entry) => {
		const call = seed[entry.from]?.calls?.find((item) => item.name === entry.tool && (item.arguments.id ?? item.arguments.account) === entry.id)
		const problems = []
		if (!call) problems.push(`${entry.tool} ${entry.id}: index ${entry.from} is no call of it`)
		if (long.tools?.[entry.tool]?.[entry.id] === undefined) problems.push(`${entry.tool} ${entry.id}: no base version in tools`)
		if (canned(entry.tool, entry.id, entry.from - 1) === entry.text) problems.push(`${entry.tool} ${entry.id}: version at ${entry.from} repeats the earlier text`)
		return problems
	}),
)

check(
	'every LH id in the seed and the goal requests has a canned lookup',
	[...new Set([...seed.flatMap((message) => [message.content, JSON.stringify(message.calls ?? [])]), ...goals.map((goal) => goal.request)].join(' ').match(ID) ?? [])]
		.filter((id) => long.tools.lookup_order[id] === undefined && long.tools.lookup_customer[id] === undefined)
		.map((id) => `no canned data for ${id}`),
)

// Truth.
check(
	'every seed message carries a truth category and topics in the allowed sets',
	seed.flatMap((message, index) => {
		const truth = message.truth
		if (!truth) return [`${index}: no truth`]
		const problems = []
		if (!CATEGORIES.has(truth.category)) problems.push(`${index}: category ${truth.category}`)
		if (!Array.isArray(truth.topics)) problems.push(`${index}: topics not a list`)
		for (const topic of truth.topics ?? []) if (!DESK.has(topic) && !ENTITY.test(topic)) problems.push(`${index}: topic ${topic}`)
		if (!KINDS.has(message.kind)) problems.push(`${index}: kind ${message.kind}`)
		if (message.calls && truth.category !== 'chatter') problems.push(`${index}: call message is ${truth.category}, not chatter`)
		if (message.role === 'tool' && truth.category !== 'fact') problems.push(`${index}: tool message is ${truth.category}, not fact`)
		const noiseKind = message.kind === 'chatter' || message.kind === 'distractor'
		const noiseCategory = !message.calls && (truth.category === 'chatter' || truth.category === 'distractor')
		if (noiseKind !== noiseCategory) problems.push(`${index}: kind ${message.kind} disagrees with category ${truth.category}`)
		if (noiseKind && message.kind !== truth.category) problems.push(`${index}: kind ${message.kind} is not category ${truth.category}`)
		return problems
	}),
)

check(
	'first 48 truth categories and links follow BRIEFING.md section 5',
	[
		...Object.entries(BRIEFING_CATEGORIES).flatMap(([category, indices]) => indices.filter((index) => seed[index]?.truth?.category !== category).map((index) => `${index}: ${seed[index]?.truth?.category}, briefing says ${category}`)),
		...seed.slice(0, 48).flatMap((message, index) =>
			['amends', 'supersedes', 'closes', 'reopens'].filter((key) => JSON.stringify(message.truth?.[key]) !== JSON.stringify(BRIEFING_LINKS[index]?.[key])).map((key) => `${index}: ${key}`),
		),
	],
)

check(
	'every amends, supersedes, closes, and reopens points at an earlier message with a matching topic',
	seed.flatMap((message, index) => {
		const truth = message.truth ?? {}
		const topics = new Set(truth.topics ?? [])
		const problems = []
		for (const key of ['amends', 'supersedes']) {
			for (const target of truth[key] ?? []) {
				if (!(target < index)) problems.push(`${index}: ${key} ${target} is not earlier`)
				else if (!(seed[target].truth?.topics ?? []).some((topic) => topics.has(topic))) problems.push(`${index}: ${key} ${target} shares no topic`)
			}
		}
		for (const key of ['closes', 'reopens']) {
			const link = truth[key]
			if (!link) continue
			const words = key === 'closes' ? /\bclose(?:d|s)?\b/i : /\breopen(?:ed|s)?\b/i
			if (!(link.index < index)) problems.push(`${index}: ${key} ${link.index} is not earlier`)
			if (!topics.has(link.thread)) problems.push(`${index}: ${key} ${link.thread} is not among its topics`)
			if (!(seed[link.index]?.truth?.topics ?? []).includes(link.thread)) problems.push(`${index}: ${key} target ${link.index} lacks topic ${link.thread}`)
			if (!message.content.includes(link.thread) || !words.test(message.content)) problems.push(`${index}: wording does not ${key === 'closes' ? 'close' : 'reopen'} ${link.thread} explicitly`)
			if (key === 'reopens' && seed[link.index]?.truth?.closes?.thread !== link.thread) problems.push(`${index}: reopens ${link.index}, which does not close ${link.thread}`)
		}
		return problems
	}),
)

check(
	'every until date is a date the message states',
	seed.flatMap((message, index) => {
		const until = message.truth?.until
		if (until === undefined) return []
		return DATE.test(until) && message.content.includes(until) ? [] : [`${index}: until ${until}`]
	}),
)

check(
	'days start at seed messages that state their date',
	(long.days ?? []).flatMap((day, index, days) => {
		const problems = []
		if (index === 0 && day.from !== 0) problems.push('first day does not start at 0')
		if (index > 0 && !(day.from > days[index - 1].from && day.date > days[index - 1].date)) problems.push(`${day.date}: out of order`)
		if (!content(day.from).includes(day.date)) problems.push(`${day.date}: message ${day.from} does not state it`)
		return problems
	}),
)

// The ledger arms count noise by kind, as scenario.json's share does; the truth category also reads call messages as chatter.
const noise = seed.filter((message) => message.kind === 'chatter' || message.kind === 'distractor').length
const share = (noise / seed.length) * 100
const categoryNoise = seed.filter((message) => message.truth?.category === 'chatter' || message.truth?.category === 'distractor').length
const categoryShare = (categoryNoise / seed.length) * 100
check('distractor and chatter share by kind is 25 to 30 percent', share >= 25 && share <= 30 ? [] : [`${noise} of ${seed.length} is ${share.toFixed(1)} percent`])

// Goals.
check('goal count is 20 to 24 with unique ids', [...(goals.length >= 20 && goals.length <= 24 ? [] : [`${goals.length} goals`]), ...(goalById.size === goals.length ? [] : ['duplicate goal ids'])])

check(
	'first 10 goals equal scenario.json goals posed after 47',
	short.goals.flatMap((goal, index) => {
		const other = goals[index] ?? {}
		const fields = [...new Set([...Object.keys(goal), ...Object.keys(other)])].filter((key) => key !== 'after' && key !== 'sources')
		return [...fields.filter((key) => JSON.stringify(goal[key]) !== JSON.stringify(other[key])).map((key) => `${goal.id}.${key}`), ...(other.after === 47 ? [] : [`${goal.id}.after is ${other.after}`])]
	}),
)

check(
	'later goals interleave with days 2 and 3 in posing order',
	goals.flatMap((goal, index) => {
		const problems = []
		if (!Number.isInteger(goal.after) || goal.after < 0 || goal.after >= seed.length) problems.push(`${goal.id}: after ${goal.after}`)
		if (index > 0 && goal.after < goals[index - 1].after) problems.push(`${goal.id}: posed before ${goals[index - 1].id}`)
		if (index >= 10 && !['2026-10-09', '2026-10-10'].includes(dayOf(goal.after))) problems.push(`${goal.id}: posed on ${dayOf(goal.after)}`)
		return problems
	}),
)

check(
	'every goal is posed at or after its facts and stale indices, which are disjoint',
	goals.flatMap((goal) => {
		const listed = [...goal.facts, ...(goal.stale ?? [])]
		return [
			...listed.filter((index) => !(Number.isInteger(index) && index >= 0 && index <= goal.after)).map((index) => `${goal.id}: index ${index} after ${goal.after}`),
			...(goal.stale ?? []).filter((index) => goal.facts.includes(index)).map((index) => `${goal.id}: ${index} is both fact and stale`),
		]
	}),
)

check(
	'every goal names known tools and resolvable sources',
	goals.flatMap((goal) => [
		...goal.tools.filter((tool) => !TOOLS.has(tool)).map((tool) => `${goal.id}: tool ${tool}`),
		...(goal.tools.includes('send_reply') ? [] : [`${goal.id}: no send_reply`]),
		...(goal.sources ?? []).filter((source) => canned(source.tool, source.id, goal.after) === undefined).map((source) => `${goal.id}: no canned ${source.tool} ${source.id}`),
		...(goal.sources ?? []).filter((source) => !goal.tools.includes(source.tool)).map((source) => `${goal.id}: source tool ${source.tool} not listed`),
	]),
)

function distance(goal) {
	const least = Math.min(...goal.facts)
	if (least < (goal.after + 1) / 3) return 'far'
	if (least >= goal.after - 7) return 'near'
	return 'mid'
}
check(
	'every distance label matches its computed distance',
	goals.filter((goal) => distance(goal) !== goal.distance).map((goal) => `${goal.id}: labelled ${goal.distance}, computes ${distance(goal)}`),
)

const sourceText = (goal) => [...goal.facts.map(content), ...(goal.sources ?? []).map((source) => canned(source.tool, source.id, goal.after))]
check(
	'every expected substring is in the goal facts or sources and in no request posed by then',
	goals.flatMap((goal, index) => {
		const record = lower(sourceText(goal).join('\n'))
		const requests = goals.slice(0, index + 1)
		return goal.expected.flatMap((item) => [
			...(record.includes(lower(item)) ? [] : [`${goal.id}: ${item} not in facts or sources`]),
			...requests.filter((other) => lower(other.request).includes(lower(item))).map((other) => `${goal.id}: ${item} in the request of ${other.id}`),
		])
	}),
)

// g01 to g10 follow scenario.json byte for byte, including the g03 and g06 patterns that match facts 6, 11, and 15 there and the g06 source that holds the carrier estimate rule 6 forbids, so only g11 onward is checked.
{
	const problems = []
	for (const goal of goals.slice(10)) {
		let patterns = []
		try {
			patterns = patternsOf(goal)
		} catch (error) {
			problems.push(`${goal.id}: ${error.message}`)
		}
		for (const index of goal.facts) {
			// A fact a later message replaces is current only in part, and a correction may name the value it replaces.
			const links = (message) => [...(message.truth?.amends ?? []), ...(message.truth?.supersedes ?? [])]
			if (seed.slice(index + 1, goal.after + 1).some((message) => links(message).includes(index))) continue
			const replacedText = lower(links(seed[index]).map(content).join('\n'))
			for (const item of goal.forbidden) if (!replacedText.includes(lower(item)) && lower(content(index)).includes(lower(item))) problems.push(`${goal.id}: forbidden ${item} in fact ${index}`)
			for (const pattern of patterns) if (pattern.test(content(index))) problems.push(`${goal.id}: a forbidden pattern matches fact ${index}`)
		}
		for (const source of goal.sources ?? []) {
			const text = canned(source.tool, source.id, goal.after) ?? ''
			for (const item of goal.forbidden) if (lower(text).includes(lower(item))) problems.push(`${goal.id}: forbidden ${item} in source ${source.tool} ${source.id}`)
			for (const pattern of patterns) if (pattern.test(text)) problems.push(`${goal.id}: a forbidden pattern matches source ${source.tool} ${source.id}`)
		}
	}
	check('every forbidden substring and pattern of g11 onward is absent from the facts and sources the goal needs as current', problems)
}

check(
	'every new goal passes its correct samples and fails its stale and hedged samples',
	goals.slice(10).flatMap((goal) => {
		const samples = SAMPLES[goal.id]
		if (!samples) return [`${goal.id}: no samples`]
		const guarded = goal.forbidden.length > 0 || (goal.forbiddenPatterns ?? []).length > 0
		const complete = (reply) => goal.expected.every((item) => lower(reply).includes(lower(item)))
		return [
			...samples.pass.filter((reply) => !scores(goal, reply)).map((reply) => `${goal.id}: fails ${JSON.stringify(reply)}`),
			...[...samples.fail, ...(samples.hedged ?? [])].filter((reply) => scores(goal, reply)).map((reply) => `${goal.id}: passes ${JSON.stringify(reply)}`),
			...(samples.hedged?.length ? [] : [`${goal.id}: no hedged sample`]),
			// Where the goal forbids a stale value, one hedged sample must fail on that value alone.
			...(guarded && !(samples.hedged ?? []).some(complete) ? [`${goal.id}: no hedged sample carries every expected value`] : []),
		]
	}),
)

check(
	'no goal is posed inside a tool group',
	goals.filter((goal) => seed[goal.after]?.calls || seed[goal.after + 1]?.role === 'tool').map((goal) => `${goal.id}: after ${goal.after} splits a tool group`),
)

const truthOf = (index) => seed[index]?.truth ?? {}
const dayStart = (index) => (long.days ?? []).find((day) => day.date === dayOf(index))?.from
check(
	'every goal whose facts or stale indices carry an until date lists its day-start message among its facts',
	goals
		.filter((goal) => [...goal.facts, ...(goal.stale ?? [])].some((index) => truthOf(index).until !== undefined))
		.filter((goal) => !goal.facts.includes(dayStart(goal.after)))
		.map((goal) => `${goal.id}: posed on ${dayOf(goal.after)} without day-start message ${dayStart(goal.after)}`),
)

// The call a tool message answers.
function callOf(index) {
	const tool = seed[index]
	for (let back = index - 1; back >= 0; back -= 1) {
		const call = seed[back].calls?.find((entry) => entry.id === tool?.call)
		if (call) return call
	}
}
const callKey = (call) => call && `${call.name} ${call.arguments.id ?? call.arguments.account}`
const mentions = (text, terms) => terms.some((term) => lower(text).includes(lower(term)))

// Each ending the notes name: a later amend or supersede, a passed until date, a close of one of its threads not reopened by then, the reopen of a close it states, a wide close that names it, or a later result of the same lookup.
function endedBy(index, at) {
	const truth = truthOf(index)
	if (truth.until !== undefined && dayOf(at) > truth.until) return true
	const reopened = (thread, from) => seed.slice(from + 1, at + 1).some((message) => message.truth?.reopens?.thread === thread)
	for (let later = index + 1; later <= at; later += 1) {
		const other = truthOf(later)
		if ([...(other.amends ?? []), ...(other.supersedes ?? [])].includes(index)) return true
		if (other.closes && !truth.closes && (truth.topics ?? []).includes(other.closes.thread) && !reopened(other.closes.thread, later)) return true
		if (truth.closes && other.reopens?.thread === truth.closes.thread) return true
		if (seed[index].role === 'tool' && seed[later].role === 'tool' && callKey(callOf(later)) === callKey(callOf(index))) return true
	}
	return cases.some((item) => item.case === 'wide-close' && item.satisfied > index && item.satisfied <= at && mentions(content(index), item.terms))
}
check(
	'every stale index has ended by the goal that lists it',
	goals.flatMap((goal) => (goal.stale ?? []).filter((index) => !endedBy(index, goal.after)).map((index) => `${goal.id}: stale ${index} has not ended by ${goal.after}`)),
)

{
	const problems = []
	const tables = { lookup_order: (id) => `Order ${id} for account `, lookup_customer: (id) => `Account ${id}: ` }
	for (const [tool, opening] of Object.entries(tables)) {
		for (const [id, text] of Object.entries(long.tools?.[tool] ?? {})) if (!text.startsWith(opening(id))) problems.push(`${tool} ${id}: text is not an ${tool === 'lookup_order' ? 'order' : 'account'} record`)
	}
	for (const entry of long.lookups ?? []) if (!tables[entry.tool] || !entry.text.startsWith(tables[entry.tool](entry.id))) problems.push(`lookups ${entry.tool} ${entry.id}: text is not a record of its table`)
	const text = [...seed.map((message) => message.content), ...goals.map((goal) => goal.request)].join('\n')
	for (const [, kind, id] of text.matchAll(/\b(order|account)\s+(LH-\d{5})\b/gi)) {
		const tool = lower(kind) === 'order' ? 'lookup_order' : 'lookup_customer'
		if (long.tools?.[tool]?.[id] === undefined) problems.push(`${id} is named as an ${lower(kind)} but has no ${tool} entry`)
	}
	check('every canned id sits in the table of its kind', problems)
}

// Lifetime cases.
const lifetime = {
	'explicit-close'(item) {
		const goal = goalById.get(item.goal)
		return [
			...item.at.flatMap((index) => (truthOf(index).closes?.thread === item.thread && index >= 48 ? [] : [`${index} does not close ${item.thread} in a new block`])),
			...(goal && goal.after > Math.max(...item.at) ? [] : [`${item.goal} is not posed after the close`]),
		]
	},
	'wide-close'(item) {
		const goal = goalById.get(item.goal)
		const problems = []
		if (!(item.satisfied >= 48)) problems.push(`${item.satisfied} is not in a new block`)
		if (truthOf(item.satisfied).closes) problems.push(`${item.satisfied} carries closes, so it is local`)
		if (!mentions(content(item.satisfied), item.terms)) problems.push(`${item.satisfied} does not name the thread`)
		if (seed.some((message) => message.truth?.closes?.thread === item.thread || message.truth?.reopens?.thread === item.thread)) problems.push(`a message closes or reopens ${item.thread} locally`)
		for (let index = item.satisfied + 1; index < seed.length; index += 1) if (mentions(content(index), item.terms)) problems.push(`${index} names the thread after it went quiet`)
		if (!goal || goal.after < item.satisfied + 2) problems.push(`${item.goal} is not posed 2 or more messages after ${item.satisfied}`)
		return problems
	},
	reopen(item) {
		const problems = item.at.flatMap((index) => (truthOf(index).reopens?.thread === item.thread && truthOf(index).reopens?.index === item.closed ? [] : [`${index} does not reopen ${item.thread} from ${item.closed}`]))
		if (truthOf(item.closed).closes?.thread !== item.thread) problems.push(`${item.closed} does not close ${item.thread}`)
		const goal = goalById.get(item.goal)
		if (!goal || !goal.facts.some((index) => item.at.includes(index))) problems.push(`${item.goal} does not need the reopen`)
		return problems
	},
	'opinion-change'(item) {
		const problems = []
		for (const index of item.old) if (truthOf(index).category !== 'opinion') problems.push(`${index} is not an opinion`)
		if (seed[item.old.at(-1)]?.role !== 'assistant') problems.push(`${item.old.at(-1)} is not an acknowledgment`)
		const scorer = goalById.get(item.goal)
		if (scorer && !stale(scorer, content(item.old.at(-1)))) problems.push(`acknowledgment ${item.old.at(-1)} does not repeat the old value`)
		if (truthOf(item.by).category !== 'opinion' || !item.old.every((index) => truthOf(item.by).supersedes?.includes(index))) problems.push(`${item.by} does not supersede ${item.old.join(', ')} as an opinion`)
		const goal = goalById.get(item.goal)
		if (!goal || !goal.facts.includes(item.by) || !item.old.some((index) => stale(goal, content(index)))) problems.push(`${item.goal} does not forbid the old opinion`)
		return problems
	},
	expiry(item) {
		const problems = item.at.flatMap((index) => (truthOf(index).until === item.until ? [] : [`${index} does not carry until ${item.until}`]))
		const goal = goalById.get(item.goal)
		if (!goal || !(dayOf(goal.after) > item.until)) problems.push(`${item.goal} is not posed after ${item.until}`)
		if (goal && !item.at.some((index) => stale(goal, content(index)))) problems.push(`${item.goal} does not forbid the expired value`)
		if (item.valid) {
			const valid = goalById.get(item.valid)
			if (!valid || !(dayOf(valid.after) <= item.until) || !valid.facts.some((index) => item.at.includes(index))) problems.push(`${item.valid} does not use the value while it holds`)
		}
		return problems
	},
	'returning-customer'(item) {
		const goal = goalById.get(item.goal)
		const last = goalById.get(item.last)
		if (!goal || !last) return ['unknown goal']
		const problems = []
		if (!mentions(last.request, item.terms)) problems.push(`${item.last} does not name the customer`)
		const end = item.returns ?? goal.after + 1
		for (let index = last.after + 1; index < end; index += 1) if (mentions(content(index), item.terms)) problems.push(`${index} names the customer inside the gap`)
		const between = goals.slice(position.get(item.last) + 1, position.get(item.goal)).filter((other) => other.after < end)
		for (const other of between) if (mentions(other.request, item.terms)) problems.push(`${other.id} names the customer inside the gap`)
		if (between.length < 8) problems.push(`gap is ${between.length} goals`)
		if (item.returns !== undefined && !mentions(content(item.returns), item.terms)) problems.push(`${item.returns} does not name the customer`)
		if (!item.needs?.length || !item.needs.every((index) => index <= last.after && goal.facts.includes(index))) problems.push(`${item.goal} does not need facts ${item.needs} from before the gap`)
		// The harness keeps every goal turn, so a fresh value is one no earlier goal's request or expected values carry.
		const earlier = goals.slice(0, position.get(item.goal))
		if (!Array.isArray(item.fresh)) problems.push('no fresh list')
		for (const value of item.fresh ?? []) {
			if (!goal.expected.includes(value)) problems.push(`fresh ${value} is not expected by ${item.goal}`)
			if (!item.needs.some((index) => lower(content(index)).includes(lower(value)))) problems.push(`fresh ${value} is in none of ${item.needs}`)
			for (const other of earlier) if (lower(other.request).includes(lower(value)) || other.expected.some((expected) => lower(expected).includes(lower(value)))) problems.push(`fresh ${value} is carried by ${other.id}`)
		}
		return problems
	},
	amend(item) {
		const problems = []
		if (truthOf(item.by).category !== 'correction' || !item.earlier.every((index) => truthOf(item.by).amends?.includes(index))) problems.push(`${item.by} does not amend ${item.earlier.join(', ')}`)
		const goal = goalById.get(item.goal)
		if (!goal || !item.earlier.some((index) => stale(goal, content(index)))) problems.push(`${item.goal} does not forbid the amended value`)
		return problems
	},
	supersede(item) {
		const problems = []
		if (!item.earlier.every((index) => truthOf(item.by).supersedes?.includes(index))) problems.push(`${item.by} does not supersede ${item.earlier.join(', ')}`)
		const goal = goalById.get(item.goal)
		if (!goal || !goal.facts.includes(item.by) || !item.earlier.some((index) => stale(goal, content(index)))) problems.push(`${item.goal} does not forbid the superseded value`)
		return problems
	},
	'replaced-lookup'(item) {
		const problems = []
		for (const index of [item.old, item.by]) {
			const call = callOf(index)
			if (!call || call.name !== item.tool || (call.arguments.id ?? call.arguments.account) !== item.id) problems.push(`${index} is not a ${item.tool} result for ${item.id}`)
		}
		if (content(item.old) === content(item.by)) problems.push('the later result repeats the earlier data')
		const goal = goalById.get(item.goal)
		if (!goal || !goal.facts.includes(item.by) || !goal.stale?.includes(item.old) || !stale(goal, content(item.old))) problems.push(`${item.goal} does not forbid the replaced data`)
		return problems
	},
	'stale-instruction'(item) {
		const problems = []
		for (const index of item.instruction) if (!['rule', 'fact'].includes(truthOf(index).category) || !(index < item.closed)) problems.push(`${index} is no instruction before the close at ${item.closed}`)
		if (truthOf(item.instruction[0]).category !== 'rule') problems.push(`${item.instruction[0]} is not a rule`)
		const local = truthOf(item.closed).closes?.thread === item.thread
		const wide = cases.some((other) => other.case === 'wide-close' && other.thread === item.thread && other.satisfied === item.closed)
		if (item.scale === 'local' ? !local : !wide) problems.push(`${item.closed} is not a ${item.scale} close of ${item.thread}`)
		const goal = goalById.get(item.goal)
		if (!goal || !(goal.after > item.closed) || !item.instruction.some((index) => stale(goal, content(index)))) problems.push(`${item.goal} does not forbid following the instruction`)
		return problems
	},
}

check(
	'every lifetime case exists at the indices it names',
	cases.flatMap((item) => {
		const rule = lifetime[item.case]
		if (!rule) return [`unknown case ${item.case}`]
		if (!goalById.has(item.goal)) return [`${item.case}: unknown goal ${item.goal}`]
		return rule(item).map((problem) => `${item.case} ${item.thread ?? item.customer ?? item.id ?? item.until ?? ''}: ${problem}`)
	}),
)

check(
	'every required lifetime case appears at least twice',
	REQUIRED_CASES.filter((name) => cases.filter((item) => item.case === name).length < 2).map((name) => `${name}: ${cases.filter((item) => item.case === name).length}`),
)

const INDEX_FIELDS = ['at', 'old', 'by', 'earlier', 'instruction', 'satisfied', 'closed', 'returns', 'needs']
function caseLine(item) {
	const key = item.thread ?? item.customer ?? item.id ?? item.until ?? ''
	const indices = [...new Set(Object.entries(item).flatMap(([name, value]) => (INDEX_FIELDS.includes(name) ? [value].flat() : [])))].sort((a, b) => a - b)
	return `Case ${item.case}${key ? ` (${key})` : ''}: indices ${indices.join(', ')}; ${item.scored === false ? `unscored, nearest goal ${item.goal}` : `scored by ${item.goal}`}.`
}
check('notes name every lifetime case with its indices', cases.filter((item) => !long.notes.includes(caseLine(item))).map((item) => `missing: ${caseLine(item)}`))

const caseIndices = (item) => [...new Set(Object.entries(item).flatMap(([name, value]) => (INDEX_FIELDS.includes(name) ? [value].flat() : [])))].sort((a, b) => a - b)
const caseKey = (item) => `${item.case} ${caseIndices(item).join(',')}`
// The messages that carry the case's current version: the reopen, the correction, the changed opinion, or the later lookup.
const LATER = { reopen: (item) => item.at, amend: (item) => [item.by], supersede: (item) => [item.by], 'opinion-change': (item) => [item.by], 'replaced-lookup': (item) => [item.by] }
check(
	'every scored case goal fails a reply that applies the stale version, and every reopen, amend, supersede, opinion change, and replaced lookup is scored by a value only its message supplies',
	cases.flatMap((item) => {
		const goal = goalById.get(item.goal)
		if (!goal || item.scored === false) return []
		const problems = []
		const own = new Set(caseIndices(item))
		const rest = lower([...goal.facts.filter((index) => !own.has(index)).map(content), ...(goal.sources ?? []).map((source) => canned(source.tool, source.id, goal.after))].join('\n'))
		const reply = CASE_REPLIES[caseKey(item)]
		if (reply === undefined) problems.push('no stale reply')
		else {
			if (scores(goal, reply)) problems.push(`${goal.id} passes ${JSON.stringify(reply)}`)
			for (const value of goal.expected) if (rest.includes(lower(value)) && !lower(reply).includes(lower(value))) problems.push(`stale reply lacks ${value}, which the case does not decide`)
		}
		if (LATER[item.case]) {
			const later = lower(LATER[item.case](item).map(content).join('\n'))
			if (![...goal.expected, ...goal.forbidden].some((value) => later.includes(lower(value)) && !rest.includes(lower(value)))) problems.push(`${goal.id} expects or forbids no value only ${LATER[item.case](item).join(', ')} supplies`)
		}
		return problems.map((problem) => `${caseKey(item)}: ${problem}`)
	}),
)

check(
	'notes state why each unscored case is unscored and how returning goals retire',
	[
		...cases.filter((item) => item.scored === false && !/unscored/.test(long.notes.split('Lifetime cases in words.')[1] ?? '')).map((item) => `${caseKey(item)}: no reason`),
		...(long.notes.includes('the goal turns about a customer retire with the customer facts') ? [] : ['returning goals under the ledger arm']),
	],
)

check(
	'notes state the seed size, goal count, both noise shares, and distances',
	[
		...(long.notes.includes(`The seed has ${seed.length} messages`) ? [] : ['seed size']),
		...(long.notes.includes(`Goals: ${goals.length}.`) ? [] : ['goal count']),
		...(long.notes.includes(`by kind, ${noise} of ${seed.length} messages (${share.toFixed(1)} percent)`) ? [] : ['noise share by kind']),
		...(long.notes.includes(`by truth.category, ${categoryNoise} of ${seed.length} messages (${categoryShare.toFixed(1)} percent)`) ? [] : ['noise share by truth.category']),
		...(long.notes.includes('The ledger arms use the kind share') ? [] : ['which share the ledger arms use']),
		...goals.filter((goal) => !long.notes.includes(`${goal.id.slice(0, 3)} ${goal.distance} (after ${goal.after}, facts ${goal.facts.join(', ')})`)).map((goal) => `distance of ${goal.id}`),
	],
)

// The audit labels replies under the rules before its changes ('current') and under the changed rules ('changed'). Only the changed rules are in the tree, so the 'changed' twin of a 'current' reply stands for it, and every other reply must score as labelled under the tree's rules.
{
	const problems = []
	const entries = audit.goals ?? {}
	for (const goal of goals.slice(10)) {
		const entry = entries[goal.id]
		if (!entry) {
			problems.push(`${goal.id}: no audit entry`)
			continue
		}
		for (const [field, ruling] of Object.entries(entry.fields ?? {})) {
			if (!['keep', 'change'].includes(ruling.ruling)) problems.push(`${goal.id}.${field}: ruling ${ruling.ruling}`)
			if (ruling.ruling === 'change' && !isDeepStrictEqual(goal[field], ruling.value)) problems.push(`${goal.id}.${field}: differs from the accepted change`)
		}
		const rules = compileRules(goal)
		const replies = entry.replies ?? []
		const changed = new Map(replies.filter((reply) => reply.under === 'changed').map((reply) => [reply.text, reply.label]))
		if (!replies.some((reply) => reply.under === 'current')) problems.push(`${goal.id}: no current reply`)
		for (const reply of replies) {
			if (!['current', 'changed'].includes(reply.under) || !['pass', 'fail'].includes(reply.label)) {
				problems.push(`${goal.id}: reply ${JSON.stringify(reply.text)} has under ${reply.under} and label ${reply.label}`)
				continue
			}
			if (reply.under === 'current' && changed.has(reply.text)) continue
			const label = clean(scoreText(rules, reply.text)) ? 'pass' : 'fail'
			if (label !== reply.label) problems.push(`${goal.id}: ${reply.under} reply ${JSON.stringify(reply.text)} is labelled ${reply.label} and scores ${label}`)
		}
	}
	check('long-audit.json has an entry for every goal from g11 on, its accepted changes are applied, and every reply scores as labelled', problems)
}

console.log(`\n${passed} passed, ${failures.length} failed`)
process.exit(failures.length === 0 ? 0 : 3)
