// Checks the reworded copies of the long scenario against bench/scenario-long.json:
//   node bench5/copies.ts [COPY_FILE ...]
// With no argument it checks bench/variants/long/v1.json to v8.json. A copy file must be named vN.json, where N
// selects its ledger copy. Each copy must equal the base in every field outside goals[].request and must be
// serialized as JSON.stringify(copy, null, '\t') plus a newline. In g01 to g10 the request must equal the request
// of bench/variants/ledger/vN.json. In every goal, a reworded request must keep the original's ids, numbers, and
// proper names and add no id, number, name, rule word, scoring phrase, or forbiddenPatterns match, so a pass
// difference between copies comes from phrasing alone. In g11 to g24 the request must differ from the original and
// from the same goal in every other checked copy. The checker refuses a rule it cannot refuse before it reads a
// copy: each startup self-test edits one original request to break one rule and must see that rule's reason.
// Exit: 0 when every copy passes; 2 when a copy or a self-test fails; 64 on usage.
import { readFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

interface Goal {
	readonly id: string
	readonly request: string
	readonly expected: readonly string[]
	readonly expectedAny: readonly string[]
	readonly forbidden: readonly string[]
	readonly patterns: readonly RegExp[]
}

interface Base {
	readonly text: string
	readonly value: Record<string, unknown>
	readonly goals: readonly Goal[]
	readonly known: ReadonlySet<string>
}

interface Context {
	readonly base: Base
	readonly ledger: Map<number, readonly string[]>
	readonly seen: Map<string, Map<string, string>>
}

interface Refusal {
	readonly prefix: string
	readonly edit: (text: string) => string
	readonly reason: string
}

type Inspection = readonly string[]

const USAGE = 'usage: node bench5/copies.ts [COPY_FILE ...]'
const HARNESS = dirname(import.meta.dirname)
const BASE_FILE = join(HARNESS, 'bench', 'scenario-long.json')
const LEDGER_DIR = join(HARNESS, 'bench', 'variants', 'ledger')
const COPY_DIR = join(HARNESS, 'bench', 'variants', 'long')
const COPY_COUNT = 8
const LEDGER_GOALS = 10
const COPY_NAME = /^v(\d+)\.json$/
// Words that name a rule, a deadline, a contact route, or a correction in the seed; a request that adds one
// points the model at the fact it must find. A group counts as present when any of its forms is.
const RULE_WORDS: Readonly<Record<string, readonly string[]>> = Object.freeze({
	day: [
		'today',
		'tonight',
		'tomorrow',
		'yesterday',
		'morning',
		'afternoon',
		'evening',
		'noon',
		'midday',
		'pm',
		'am',
		'deadline',
		'asap',
		'urgent',
		'urgently',
		'week',
		'weekend',
		'monday',
		'tuesday',
		'wednesday',
		'thursday',
		'friday',
		'saturday',
		'sunday',
		'date',
		'dated',
		'hour',
		'hours',
		'eod',
	],
	sequence: ['before', 'after', 'until', 'till', 'unless'],
	phone: ['extension', 'ext', 'switchboard', 'direct', 'mobile', 'cell', 'desk'],
	approve: ['approval', 'approvals', 'approve', 'approved', 'approves', 'approving'],
	authorize: [
		'authorize',
		'authorizes',
		'authorized',
		'authorizing',
		'authorization',
		'authorise',
		'authorises',
		'authorised',
		'authorisation',
	],
	sign: ['sign', 'signs', 'signed', 'signing', 'signoff', 'sign-off', 'signature'],
	code: ['code', 'codes'],
	manager: ['manager', 'managers', 'supervisor', 'supervisors', 'director', 'directors', 'boss'],
	copy: ['copy', 'copies', 'copied', 'cc', 'cced', 'loop'],
	correction: [
		'correction',
		'corrected',
		'corrects',
		'update',
		'updated',
		'updates',
		'new',
		'newest',
		'latest',
		'current',
		'currently',
		'old',
		'older',
		'previous',
		'prior',
		'superseded',
		'replaced',
		'revised',
		'withdrawn',
		'scrapped',
		'retired',
		'changed',
		'amended',
		'valid',
		'invalid',
		'instead',
	],
	fee: [
		'fee',
		'fees',
		'restocking',
		'percent',
		'percentage',
		'deduct',
		'deducted',
		'deduction',
		'full',
		'partial',
		'minus',
	],
	window: ['return', 'returns', 'returned', 'returning', 'window'],
	arrival: [
		'estimate',
		'estimated',
		'eta',
		'arrive',
		'arrives',
		'arrived',
		'arrival',
		'deliver',
		'delivers',
		'delivered',
		'delivery',
		'deliveries',
		'expected',
		'expect',
	],
	rule: [
		'rule',
		'rules',
		'policy',
		'policies',
		'require',
		'requires',
		'required',
		'requirement',
		'requirements',
		'must',
		'mandatory',
	],
	limit: [
		'limit',
		'limits',
		'threshold',
		'exceed',
		'exceeds',
		'over',
		'above',
		'cap',
		'outstanding',
		'balance',
	],
	tier: ['tier', 'gold', 'silver', 'wholesale', 'standard', 'member', 'membership', 'vip'],
	ticket: ['ticket', 'tickets'],
	escalation: ['escalation', 'escalations', 'escalate', 'escalated', 'escalating'],
	carrier: ['carrier', 'carriers', 'courier', 'tracking', 'trace', 'tracked', 'parcel'],
	release: ['release', 'releases', 'released', 'releasing'],
	availability: [
		'available',
		'availability',
		'unavailable',
		'away',
		'vacation',
		'holiday',
		'absent',
		'reachable',
	],
	occasion: ['birthday', 'anniversary', 'wedding', 'congratulations', 'happy'],
	count: [
		'one',
		'two',
		'three',
		'four',
		'five',
		'six',
		'seven',
		'eight',
		'nine',
		'ten',
		'eleven',
		'twelve',
		'twenty',
		'thirty',
		'forty',
		'fifty',
		'hundred',
		'thousand',
		'half',
		'twice',
		'dozen',
	],
})
const ID = /\b[A-Z]{2,}-\d+(?:-\d+)*\b/g
const NUMBER = /\$?\d(?:[\d,]*\d)?(?:\.\d+)?/g
const CAPITALIZED = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g
const SENTENCE_START = /(?:^|[.!?:;]["'“”’)]*\s+|["“(]\s*)$/
// Each edit of an original request breaks one rule, so a check that passes all of them would pass anything.
const REFUSALS: readonly Refusal[] = Object.freeze([
	{
		prefix: 'g10',
		edit: (text) => `${text} Is it extension 4127 after 2 pm?`,
		reason: 'adds phone words',
	},
	{ prefix: 'g08', edit: (text) => text.replace('$3,000 ', ''), reason: 'drops number $3,000' },
	{
		prefix: 'g07',
		edit: (text) => text.replace('Who do I ask', 'Do I ask Tomasz'),
		reason: 'adds name Tomasz',
	},
	{ prefix: 'g02', edit: (text) => `${text} It is account LH-44870.`, reason: 'adds id LH-44870' },
	{
		prefix: 'g08',
		edit: (text) => text.replace('whether it fits', 'whether it fits within'),
		reason: 'adds scoring phrase "within"',
	},
	{
		prefix: 'g03',
		edit: (text) => text.replace('Grace Okafor', 'Grace'),
		reason: 'drops name Grace Okafor',
	},
	{ prefix: 'g05', edit: (text) => text, reason: 'the request is the original text' },
	{ prefix: 'g11', edit: (text) => `${text} Check with Zoltan.`, reason: 'adds name Zoltan' },
	{
		prefix: 'g12',
		edit: (text) => `${text} Offer a $50 store credit.`,
		reason: 'adds forbidden pattern',
	},
	{ prefix: 'g20', edit: (text) => `${text} Marcus can join.`, reason: 'adds name Marcus' },
])

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTextList(value: unknown): value is readonly string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function readTexts(value: unknown, key: string): readonly string[] {
	if (!isRecord(value)) return []
	const member = value[key]
	return isTextList(member) ? member : []
}

function readGoal(value: unknown): Goal {
	if (!isRecord(value) || typeof value.id !== 'string' || typeof value.request !== 'string')
		throw new Error('a goal lacks a string id or request')
	const sources = readTexts(value, 'forbiddenPatterns')
	return {
		id: value.id,
		request: value.request,
		expected: readTexts(value, 'expected'),
		expectedAny: readTexts(value, 'expectedAny'),
		forbidden: readTexts(value, 'forbidden'),
		patterns: sources.map((source) => new RegExp(source, 'i')),
	}
}

function readContents(value: unknown): readonly string[] {
	if (!Array.isArray(value)) return []
	return value.flatMap((message) =>
		isRecord(message) && typeof message.content === 'string' ? [message.content] : [],
	)
}

function listStrings(value: unknown): readonly string[] {
	if (typeof value === 'string') return [value]
	if (Array.isArray(value)) return value.flatMap((item) => listStrings(item))
	if (isRecord(value)) return Object.values(value).flatMap((item) => listStrings(item))
	return []
}

// A capitalized word counts as a name when it sits mid-sentence, or opens a sentence and appears
// mid-sentence somewhere in the scenario text or the original requests.
function buildKnown(texts: readonly string[]): ReadonlySet<string> {
	const known = new Set<string>()
	for (const text of texts)
		for (const match of text.matchAll(CAPITALIZED)) {
			const words = match[0].split(/\s+/)
			for (const word of SENTENCE_START.test(text.slice(0, match.index)) ? words.slice(1) : words)
				known.add(word)
		}
	return known
}

function readBase(): Base {
	const text = readFileSync(BASE_FILE, 'utf8')
	const value: unknown = JSON.parse(text)
	if (!isRecord(value) || !Array.isArray(value.goals))
		throw new Error(`${BASE_FILE} holds no goals`)
	if (`${JSON.stringify(value, null, '\t')}\n` !== text)
		throw new Error(
			`${BASE_FILE} does not round-trip through JSON.stringify with a tab indent, so no serialization comparison holds`,
		)
	const goals = value.goals.map((goal) => readGoal(goal))
	const texts = [
		...listStrings(value.system),
		...readContents(value.seed),
		...listStrings(value.tools),
		...goals.map((goal) => goal.request),
	]
	return { text, value, goals, known: buildKnown(texts) }
}

function findNames(text: string, known: ReadonlySet<string>): readonly string[] {
	const out: string[] = []
	for (const match of text.matchAll(CAPITALIZED)) {
		const words = match[0].split(/\s+/)
		const kept =
			SENTENCE_START.test(text.slice(0, match.index)) && !known.has(words[0])
				? words.slice(1)
				: words
		if (kept.length > 0) out.push(kept.join(' '))
	}
	return out
}

function listWords(text: string): ReadonlySet<string> {
	return new Set(
		(
			text
				.toLowerCase()
				.replace(/['’]s\b/g, '')
				.match(/[a-z]+(?:[-'’][a-z]+)*/g) ?? []
		).map((word) => word.replace(/’/g, "'")),
	)
}

function listGroups(text: string): ReadonlySet<string> {
	const present = listWords(text)
	return new Set(
		Object.entries(RULE_WORDS)
			.filter(([, forms]) => forms.some((form) => present.has(form)))
			.map(([group]) => group),
	)
}

function matchPhrase(text: string, needle: string): boolean {
	const escaped = needle.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`).test(text.toLowerCase())
}

function readTokens(text: string, label: 'id' | 'number'): ReadonlySet<string> {
	// Digits inside an id belong to the id, so numbers are read with the ids taken out.
	const source = label === 'id' ? text : text.replace(ID, ' ')
	return new Set(source.match(label === 'id' ? ID : NUMBER) ?? [])
}

// Returns the reasons a reworded request breaks the rules, or none.
function compareRequest(
	goal: Goal,
	reworded: unknown,
	known: ReadonlySet<string>,
): readonly string[] {
	if (typeof reworded !== 'string' || reworded.trim() === '') return ['the request is empty']
	const reasons: string[] = []
	const before = goal.request
	if (reworded === before) reasons.push('the request is the original text')
	for (const label of ['id', 'number'] as const) {
		const kept = readTokens(before, label)
		const added = readTokens(reworded, label)
		for (const token of kept) if (!added.has(token)) reasons.push(`drops ${label} ${token}`)
		for (const token of added) if (!kept.has(token)) reasons.push(`adds ${label} ${token}`)
	}
	const keptNames = findNames(before, known)
	const keptWords = new Set(keptNames.flatMap((name) => name.split(' ')))
	for (const name of keptNames) if (!reworded.includes(name)) reasons.push(`drops name ${name}`)
	for (const word of new Set(findNames(reworded, known).flatMap((name) => name.split(' '))))
		if (!keptWords.has(word)) reasons.push(`adds name ${word}`)
	const had = listGroups(before)
	const present = listWords(reworded)
	for (const group of listGroups(reworded))
		if (!had.has(group))
			reasons.push(
				`adds ${group} words (${(RULE_WORDS[group] ?? []).filter((form) => present.has(form)).join(', ')})`,
			)
	for (const needle of [...goal.expected, ...goal.expectedAny, ...goal.forbidden])
		if (matchPhrase(reworded, needle) && !matchPhrase(before, needle))
			reasons.push(`adds scoring phrase "${needle}"`)
	for (const [at, pattern] of goal.patterns.entries())
		if (pattern.test(reworded) && !pattern.test(before))
			reasons.push(`adds forbidden pattern ${at + 1} of ${goal.patterns.length}`)
	return reasons
}

function runSelfTests(base: Base): readonly string[] {
	const failures: string[] = []
	for (const { prefix, edit, reason } of REFUSALS) {
		const goal = base.goals.find((one) => one.id.startsWith(prefix))
		if (
			goal === undefined ||
			!compareRequest(goal, edit(goal.request), base.known).some((one) => one.startsWith(reason))
		)
			failures.push(`the check does not refuse a ${prefix} request that ${reason}`)
	}
	return failures
}

function readLedger(context: Context, copy: number): readonly string[] {
	const cached = context.ledger.get(copy)
	if (cached !== undefined) return cached
	const file = join(LEDGER_DIR, `v${copy}.json`)
	const value: unknown = JSON.parse(readFileSync(file, 'utf8'))
	if (!isRecord(value) || !Array.isArray(value.goals)) throw new Error(`${file} holds no goals`)
	const requests = value.goals.map((goal) =>
		isRecord(goal) && typeof goal.request === 'string' ? goal.request : '',
	)
	context.ledger.set(copy, requests)
	return requests
}

function restoreRequests(
	copy: Record<string, unknown>,
	goals: readonly Goal[],
): Record<string, unknown> {
	const list: readonly unknown[] = Array.isArray(copy.goals) ? copy.goals : []
	return {
		...copy,
		goals: list.map((goal, at) =>
			isRecord(goal) ? { ...goal, request: goals[at]?.request } : goal,
		),
	}
}

// Returns the reasons a copy file breaks the rules, or none.
function inspectCopy(
	context: Context,
	text: string,
	label: string,
	copy: number | undefined,
): Inspection {
	const { base } = context
	const parsed: unknown = JSON.parse(text)
	if (!isRecord(parsed) || !Array.isArray(parsed.goals)) return ['holds no goals']
	const ids: readonly unknown[] = parsed.goals.map((goal) => (isRecord(goal) ? goal.id : undefined))
	if (ids.length !== base.goals.length || ids.some((id, at) => id !== base.goals[at]?.id))
		return ['goals differ in count, order, or id']
	const problems: string[] = []
	const restored = restoreRequests(parsed, base.goals)
	if (!isDeepStrictEqual(restored, base.value)) {
		const fields = [...new Set([...Object.keys(base.value), ...Object.keys(restored)])].filter(
			(key) => !isDeepStrictEqual(restored[key], base.value[key]),
		)
		problems.push(`differs from ${BASE_FILE} outside goals[].request in ${fields.join(', ')}`)
	}
	if (text !== `${JSON.stringify(parsed, null, '\t')}\n`)
		problems.push(`is not serialized as JSON.stringify(copy, null, '\\t') plus a newline`)
	if (copy === undefined || copy < 1 || copy > COPY_COUNT)
		problems.push(
			`file name ${label} is not v1.json to v${COPY_COUNT}.json, so no ledger copy applies`,
		)
	const ledger =
		copy === undefined || copy < 1 || copy > COPY_COUNT ? [] : readLedger(context, copy)
	for (const [at, goal] of base.goals.entries()) {
		const reworded = parsed.goals[at]?.request
		for (const reason of compareRequest(goal, reworded, base.known))
			problems.push(`${goal.id}: ${reason}`)
		if (at < LEDGER_GOALS) {
			if (ledger.length > at && reworded !== ledger[at])
				problems.push(
					`${goal.id}: the request differs from goals[${at}].request of ledger/v${copy}.json`,
				)
			continue
		}
		const record = context.seen.get(goal.id)
		const earlier = typeof reworded === 'string' ? record?.get(reworded) : undefined
		if (earlier !== undefined) problems.push(`${goal.id}: same request as ${earlier}`)
		else if (typeof reworded === 'string') record?.set(reworded, label)
	}
	return problems
}

function parseCopy(file: string): number | undefined {
	const match = COPY_NAME.exec(basename(file))
	return match === null ? undefined : Number(match[1])
}

function describeError(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

function main(argv: readonly string[]): number {
	if (argv.some((argument) => argument.startsWith('-'))) {
		console.error(USAGE)
		return 64
	}
	let base: Base
	try {
		base = readBase()
	} catch (error) {
		console.error(`copies: ${describeError(error)}`)
		return 2
	}
	const failures = runSelfTests(base)
	if (failures.length > 0) {
		for (const failure of failures) console.error(`copies: ${failure}`)
		return 2
	}
	const files =
		argv.length > 0
			? argv.map((file) => resolve(file))
			: Array.from({ length: COPY_COUNT }, (_, at) => join(COPY_DIR, `v${at + 1}.json`))
	const context: Context = {
		base,
		ledger: new Map(),
		seen: new Map(base.goals.map((goal) => [goal.id, new Map()])),
	}
	let failed = 0
	console.log(`self-tests ${REFUSALS.length} refused as expected`)
	for (const file of files) {
		let problems: Inspection
		try {
			problems = inspectCopy(context, readFileSync(file, 'utf8'), basename(file), parseCopy(file))
		} catch (error) {
			problems = [`unreadable, ${describeError(error)}`]
		}
		if (problems.length > 0) failed += 1
		console.log(
			problems.length === 0
				? `${file}: ok, ${base.goals.length} requests keep their ids, numbers, and names and add no id, number, name, rule word, scoring phrase, or forbidden pattern`
				: `${file}: ${problems.length} problems`,
		)
		for (const problem of problems) console.log(`  ${problem}`)
	}
	console.log(`${files.length - failed} of ${files.length} copy files pass against ${BASE_FILE}`)
	return failed === 0 ? 0 : 2
}

process.exitCode = main(process.argv.slice(2))
