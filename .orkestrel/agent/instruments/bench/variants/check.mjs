// Checks the reworded scenario variants against their scenario files. A variant with a `ledger` member is the
// briefing harness's twin and compares with tmp/bench3/scenario.json; any other compares with scenario.json here.
// Each variant must equal its scenario file in every byte outside goals[].request, and each reworded request
// must keep the original's ids, amounts, and proper names while adding no id, number, name, rule word, or
// scoring phrase the original lacks, so a pass difference between variants comes from phrasing alone. The two
// files of one variant must carry the same requests, so both harnesses run the same wording.
// Usage: node variants/check.mjs [VARIANT_FILE ...]; with no argument it checks v1.json to v8.json here and
// their twins ledger/v1.json to ledger/v8.json.
import { readFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ORIGINAL_FILE = join(HERE, '..', 'scenario.json')
const LEDGER_FILE = join(HERE, '..', '..', 'bench3', 'scenario.json')
const BASES = { main: readBase(ORIGINAL_FILE), ledger: readBase(LEDGER_FILE) }
const original = BASES.main.scenario
if (JSON.stringify(BASES.ledger.scenario.goals) !== JSON.stringify(original.goals)) fail(`${LEDGER_FILE} and ${ORIGINAL_FILE} carry different goals, so their variants cannot share requests`)
const files =
	process.argv.length > 2
		? process.argv.slice(2).map((file) => resolve(file))
		: ['', 'ledger'].flatMap((folder) => Array.from({ length: 8 }, (_, at) => join(HERE, folder, `v${at + 1}.json`)))

// The variants are written with JSON.stringify, so a byte comparison needs each scenario file in that form too.
function readBase(file) {
	const text = readFileSync(file, 'utf8')
	const scenario = JSON.parse(text)
	if (`${JSON.stringify(scenario)}\n` !== text) fail(`${file} does not round-trip through JSON.stringify, so no byte comparison holds`)
	return { file, text, scenario }
}

// Words that name a rule, a deadline, a contact route, or a correction in the seed; a request that adds one
// points the model at the fact it must find. A group counts as present when any of its forms is.
const RULE_WORDS = {
	day: ['today', 'tonight', 'tomorrow', 'yesterday', 'morning', 'afternoon', 'evening', 'noon', 'midday', 'pm', 'am', 'deadline', 'asap', 'urgent', 'urgently', 'week', 'weekend', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'date', 'dated', 'hour', 'hours', 'eod'],
	sequence: ['before', 'after', 'until', 'till', 'unless'],
	phone: ['extension', 'ext', 'switchboard', 'direct', 'mobile', 'cell', 'desk'],
	approve: ['approval', 'approvals', 'approve', 'approved', 'approves', 'approving'],
	authorize: ['authorize', 'authorizes', 'authorized', 'authorizing', 'authorization', 'authorise', 'authorises', 'authorised', 'authorisation'],
	sign: ['sign', 'signs', 'signed', 'signing', 'signoff', 'sign-off', 'signature'],
	code: ['code', 'codes'],
	manager: ['manager', 'managers', 'supervisor', 'supervisors', 'director', 'directors', 'boss'],
	copy: ['copy', 'copies', 'copied', 'cc', 'cced', 'loop'],
	correction: ['correction', 'corrected', 'corrects', 'update', 'updated', 'updates', 'new', 'newest', 'latest', 'current', 'currently', 'old', 'older', 'previous', 'prior', 'superseded', 'replaced', 'revised', 'withdrawn', 'scrapped', 'retired', 'changed', 'amended', 'valid', 'invalid', 'instead'],
	fee: ['fee', 'fees', 'restocking', 'percent', 'percentage', 'deduct', 'deducted', 'deduction', 'full', 'partial', 'minus'],
	window: ['return', 'returns', 'returned', 'returning', 'window'],
	arrival: ['estimate', 'estimated', 'eta', 'arrive', 'arrives', 'arrived', 'arrival', 'deliver', 'delivers', 'delivered', 'delivery', 'deliveries', 'expected', 'expect'],
	rule: ['rule', 'rules', 'policy', 'policies', 'require', 'requires', 'required', 'requirement', 'requirements', 'must', 'mandatory'],
	limit: ['limit', 'limits', 'threshold', 'exceed', 'exceeds', 'over', 'above', 'cap', 'outstanding', 'balance'],
	tier: ['tier', 'gold', 'silver', 'wholesale', 'standard', 'member', 'membership', 'vip'],
	ticket: ['ticket', 'tickets'],
	escalation: ['escalation', 'escalations', 'escalate', 'escalated', 'escalating'],
	carrier: ['carrier', 'carriers', 'courier', 'tracking', 'trace', 'tracked', 'parcel'],
	release: ['release', 'releases', 'released', 'releasing'],
	availability: ['available', 'availability', 'unavailable', 'away', 'vacation', 'holiday', 'absent', 'reachable'],
	occasion: ['birthday', 'anniversary', 'wedding', 'congratulations', 'happy'],
	count: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'twenty', 'thirty', 'forty', 'fifty', 'hundred', 'thousand', 'half', 'twice', 'dozen'],
}
const ID = /\b[A-Z]{2,}-\d+(?:-\d+)*\b/g
const NUMBER = /\$?\d(?:[\d,]*\d)?(?:\.\d+)?/g
const CAPITALIZED = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g
const SENTENCE_START = /(?:^|[.!?:;]["'“”’)]*\s+|["“(]\s*)$/

// A capitalized word counts as a name when it sits mid-sentence, or opens a sentence and appears
// mid-sentence somewhere in the scenario text or the original requests.
const KNOWN = new Set()
for (const text of [original.system, ...original.seed.map((message) => message.content), ...Object.values(original.tools).flatMap((table) => Object.values(table)), ...original.goals.map((goal) => goal.request)])
	for (const match of text.matchAll(CAPITALIZED)) {
		const words = match[0].split(/\s+/)
		for (const word of SENTENCE_START.test(text.slice(0, match.index)) ? words.slice(1) : words) KNOWN.add(word)
	}

function fail(message) {
	process.stderr.write(`check: ${message}\n`)
	process.exit(2)
}

function names(text) {
	const out = []
	for (const match of text.matchAll(CAPITALIZED)) {
		const words = match[0].split(/\s+/)
		const kept = SENTENCE_START.test(text.slice(0, match.index)) && !KNOWN.has(words[0]) ? words.slice(1) : words
		if (kept.length > 0) out.push(kept.join(' '))
	}
	return out
}

function words(text) {
	return new Set((text.toLowerCase().replace(/['’]s\b/g, '').match(/[a-z]+(?:[-'’][a-z]+)*/g) ?? []).map((word) => word.replace(/’/g, "'")))
}

function groups(text) {
	const present = words(text)
	return new Set(Object.entries(RULE_WORDS).filter(([, forms]) => forms.some((form) => present.has(form))).map(([group]) => group))
}

function phrase(text, needle) {
	const escaped = needle.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`).test(text.toLowerCase())
}

// Returns the reasons a reworded request breaks the rules, or none.
function compare(goal, reworded) {
	const reasons = []
	const before = goal.request
	if (typeof reworded !== 'string' || reworded.trim() === '') return ['the request is empty']
	if (reworded === before) reasons.push('the request is the original text')
	for (const [label, pattern] of [
		['id', ID],
		['number', NUMBER],
	]) {
		// Digits inside an id belong to the id, so numbers are read with the ids taken out.
		const read = (text) => new Set((label === 'id' ? text : text.replace(ID, ' ')).match(pattern) ?? [])
		const kept = read(before)
		const now = read(reworded)
		for (const token of kept) if (!now.has(token)) reasons.push(`drops ${label} ${token}`)
		for (const token of now) if (!kept.has(token)) reasons.push(`adds ${label} ${token}`)
	}
	const keptNames = names(before)
	const keptWords = new Set(keptNames.flatMap((name) => name.split(' ')))
	for (const name of keptNames) if (!reworded.includes(name)) reasons.push(`drops name ${name}`)
	for (const word of new Set(names(reworded).flatMap((name) => name.split(' ')))) if (!keptWords.has(word)) reasons.push(`adds name ${word}`)
	const had = groups(before)
	for (const group of groups(reworded)) if (!had.has(group)) reasons.push(`adds ${group} words (${RULE_WORDS[group].filter((form) => words(reworded).has(form)).join(', ')})`)
	for (const needle of [...goal.expected, ...(goal.expectedAny ?? []), ...goal.forbidden])
		if (phrase(reworded, needle) && !phrase(before, needle)) reasons.push(`adds scoring phrase "${needle}"`)
	return reasons
}

// Each edit of an original request breaks one rule, so a check that passes all of them would pass anything.
const REFUSALS = [
	['g10', (text) => `${text} Is it extension 4127 after 2 pm?`, 'adds phone words'],
	['g08', (text) => text.replace('$3,000 ', ''), 'drops number $3,000'],
	['g07', (text) => text.replace('Who do I ask', 'Do I ask Tomasz'), 'adds name Tomasz'],
	['g02', (text) => `${text} It is account LH-44870.`, 'adds id LH-44870'],
	['g08', (text) => text.replace('whether it fits', 'whether it fits within'), 'adds scoring phrase "within"'],
	['g03', (text) => text.replace('Grace Okafor', 'Grace'), 'drops name Grace Okafor'],
	['g05', (text) => text, 'the request is the original text'],
]
for (const [prefix, edit, reason] of REFUSALS) {
	const goal = original.goals.find((one) => one.id.startsWith(prefix))
	if (goal === undefined || !compare(goal, edit(goal.request)).some((one) => one.startsWith(reason))) fail(`the check does not refuse a ${prefix} request that ${reason}`)
}

// Returns the variant's kind and the reasons it breaks the rules against its scenario file, or none.
function inspect(text, label) {
	const variant = JSON.parse(text)
	const kind = Object.hasOwn(variant, 'ledger') ? 'ledger' : 'main'
	const base = BASES[kind]
	const problems = []
	if (!Array.isArray(variant.goals) || variant.goals.length !== original.goals.length || variant.goals.some((goal, at) => goal?.id !== original.goals[at].id))
		return { kind, variant, problems: ['goals differ in count, order, or id'] }
	// Restoring the original requests must give back the scenario file byte for byte.
	const restored = { ...variant, goals: variant.goals.map((goal, at) => ({ ...goal, request: original.goals[at].request })) }
	if (`${JSON.stringify(restored)}\n` !== base.text) {
		const fields = Object.keys({ ...base.scenario, ...variant }).filter((key) => JSON.stringify(restored[key]) !== JSON.stringify(base.scenario[key]))
		problems.push(`differs from ${base.file} outside goals[].request${fields.length > 0 ? ` in ${fields.join(', ')}` : ' in key order or serialization'}`)
	}
	if (text !== `${JSON.stringify(variant)}\n`) problems.push(`is not serialized as ${base.file} is`)
	for (const [at, goal] of original.goals.entries()) {
		const reworded = variant.goals[at].request
		for (const reason of compare(goal, reworded)) problems.push(`${goal.id}: ${reason}`)
		if (label === undefined) continue
		const earlier = seen[kind].get(goal.id).get(reworded)
		if (earlier !== undefined) problems.push(`${goal.id}: same request as ${earlier}`)
		else seen[kind].get(goal.id).set(reworded, label)
	}
	return { kind, variant, problems }
}

// Returns the goals whose request differs between the two files of one variant, or none.
function compareTwins(main, ledger) {
	return original.goals.filter((goal, at) => main.goals[at].request !== ledger.goals[at].request).map((goal) => goal.id)
}

// Each kind keeps its own record of the requests seen, because the two files of one variant share their requests.
const seen = { main: new Map(original.goals.map((goal) => [goal.id, new Map()])), ledger: new Map(original.goals.map((goal) => [goal.id, new Map()])) }

// A briefing variant that lost its `ledger` member, or twins whose one request differs, must be refused.
{
	const reworded = structuredClone(BASES.ledger.scenario)
	reworded.goals[6].request = original.goals[6].request.replace('Who do I ask', 'Who should I ask')
	if (JSON.stringify(compareTwins(original, reworded)) !== JSON.stringify([original.goals[6].id])) fail('the check does not refuse twins whose g07 requests differ')
	delete reworded.ledger
	if (inspect(`${JSON.stringify(reworded)}\n`).problems.length === 0) fail('the check does not refuse a briefing variant without its ledger member')
}

const lines = []
let failed = 0
const pairs = new Map()
for (const file of files) {
	const label = basename(file)
	let inspected
	try {
		inspected = inspect(readFileSync(file, 'utf8'), file)
	} catch (error) {
		failed += 1
		lines.push(`${file}: unreadable, ${error.message}`)
		continue
	}
	const { kind, variant, problems } = inspected
	if (problems.length > 0) failed += 1
	else pairs.set(label, { ...pairs.get(label), [kind]: variant })
	lines.push(problems.length === 0 ? `${file}: ok, fields equal ${BASES[kind].file} outside the 10 requests; 10 requests keep their ids, amounts, and names and add no id, number, name, rule word, or scoring phrase` : `${file}: ${problems.length} problems`, ...problems.map((problem) => `  ${problem}`))
}
lines.push(`${files.length - failed} of ${files.length} variant files pass against their scenario files`)
// With no argument every variant needs both files; with arguments only the pairs they name are compared.
let compared = 0
for (const [label, pair] of pairs) {
	if (pair.main === undefined || pair.ledger === undefined) {
		if (process.argv.length > 2) continue
		failed += 1
		lines.push(`${label}: no passing ${pair.main === undefined ? 'main' : 'ledger'} twin`)
		continue
	}
	compared += 1
	const differing = compareTwins(pair.main, pair.ledger)
	if (differing.length > 0) failed += 1
	lines.push(differing.length === 0 ? `${label}: both twins carry the same 10 requests` : `${label}: the twins differ in ${differing.join(', ')}`)
}
lines.push(`${compared} twin pairs compared`)
process.stdout.write(`${lines.join('\n')}\n`)
process.exit(failed === 0 ? 0 : 1)
