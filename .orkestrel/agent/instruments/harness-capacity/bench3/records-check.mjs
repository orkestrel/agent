// Offline check of records.mjs (RECORDS-PLAN.md, measurement run 1): parity with bench.mjs's sentence and token
// rules, or, after bench.mjs imports both from records.mjs, the import and the outputs the last harness with its own
// copies recorded in records-fixtures.json `parity`; the plan's fixture texts byte for byte, the edge fixtures, the amount comparison, one injected fault per
// check, and the source sweep. It asks no judge, reaches no network, and exits 1 on any failed assertion.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildRecords, checkRecords, compareAmounts, extractTokens, linkAccounts, renderRecord, selectRecords, splitSentences } from './records.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const BENCH = join(HERE, 'bench.mjs')
const RECORDS = join(HERE, 'records.mjs')
const SCENARIO = join(HERE, 'scenario.json')
const FIXTURES = join(HERE, 'records-fixtures.json')
const PLAN = join(ROOT, '..', 'results', 'v9', 'RECORDS-PLAN.md')
// The plan's `Rules` fixture lines in the g03 desk order (escalations, delivery): m6 and m8 meet it, m2 and m29 follow.
const G03_RULES_ORDER = [3, 4, 5, 6, 0, 1, 2]
const FICTIONAL_ACCOUNT = 'BW-20931'
const FICTIONAL_ORDER = 'BW-5512'

const sections = new Map()
const failures = []

function check(section, name, ok, detail) {
	const counts = sections.get(section) ?? { passed: 0, failed: 0 }
	counts[ok ? 'passed' : 'failed'] += 1
	sections.set(section, counts)
	if (!ok) failures.push(`${section}: ${name}${detail === undefined ? '' : `\n    ${String(detail).replaceAll('\n', '\n    ')}`}`)
}

// A top-level function of bench.mjs by name, as its source text; the file is read, never imported.
function readBenchFunction(source, name) {
	const start = source.indexOf(`\nfunction ${name}(`)
	const end = source.indexOf('\n}\n', start)
	if (start < 0 || end < 0) throw new Error(`records-check: bench.mjs has no top-level function ${name}`)
	return source.slice(start + 1, end + 2)
}

function readBenchConstant(source, name) {
	const match = new RegExp(`^const ${name} = (.+)$`, 'm').exec(source)
	if (match === null) throw new Error(`records-check: bench.mjs has no constant ${name}`)
	return match[1]
}

// The rules bench.mjs defines, or undefined when it holds neither function.
function loadBenchRules() {
	const source = readFileSync(BENCH, 'utf8')
	if (!source.includes('\nfunction splitSentences(') && !source.includes('\nfunction extractTokens(')) return undefined
	const body = [
		`const ID_SHAPE = ${readBenchConstant(source, 'ID_SHAPE')}`,
		`const NUMERIC = ${readBenchConstant(source, 'NUMERIC')}`,
		readBenchFunction(source, 'splitSentences'),
		readBenchFunction(source, 'extractTokens'),
		'return { splitSentences, extractTokens }',
	].join('\n')
	return new Function(body)()
}

function readTokens(tokens) {
	return JSON.stringify([[...tokens.ids], [...tokens.numbers]])
}

// The request's accounts: each entity that is an account, or the account its lookup links it to.
function readAccounts(input, entities) {
	const links = linkAccounts(input)
	return [...new Set(entities.map((entity) => (Object.hasOwn(input.accounts, entity) ? entity : links[entity])).filter((account) => account !== undefined))]
}

function viewPoint(point, input = point.input) {
	const built = buildRecords(input)
	const request = { accounts: readAccounts(input, point.request.entities), desk: point.request.desk }
	return { built, request, views: selectRecords(built, request) }
}

function clone(value) {
	return structuredClone(value)
}

function hasCheck(faults, name) {
	return faults.some((fault) => fault === name || fault.startsWith(`${name} `) || fault.startsWith(`${name}:`))
}

// Every id, person or holder name, and amount with a currency sign or decimals in the seed or the tools, matched
// whole and case-sensitively in a source text.
function sweepSource(text, scenario) {
	const corpus = [...scenario.seed.map((message) => message.content), ...Object.values(scenario.tools).flatMap((table) => [...Object.keys(table), ...Object.values(table)])]
	const ids = new Set(corpus.flatMap((one) => [...extractTokens(one).ids]))
	const names = new Set()
	for (const one of corpus)
		for (const sentence of splitSentences(one))
			for (const match of sentence.matchAll(/(?<![\p{L}\p{N}'-])\p{Lu}\p{Ll}+(?: \p{Lu}\p{Ll}+)*(?![\p{L}\p{N}-])/gu)) {
				if (match.index === 0) continue
				names.add(match[0])
				for (const word of match[0].split(' ')) names.add(word)
			}
	const amounts = new Set(
		corpus
			.flatMap((one) => [...(one.match(/\$\d[\d,]*(?:\.\d+)?|\d[\d,]*\.\d+/g) ?? [])].map((amount) => amount.replace(/[.,]$/, '')))
			.flatMap((amount) => (amount.includes('.') ? [amount, amount.replace('$', '')] : [amount])),
	)
	const escape = (literal) => literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const found = []
	for (const id of ids) if (new RegExp(`(?<![\\w-])${escape(id)}(?![\\w-])`, 'i').test(text)) found.push(`id ${id}`)
	for (const name of names) if (new RegExp(`(?<![\\p{L}\\p{N}])${escape(name)}(?![\\p{L}\\p{N}])`, 'u').test(text)) found.push(`name ${name}`)
	for (const amount of amounts) if (text.includes(amount)) found.push(`amount ${amount}`)
	return { found, counts: { ids: ids.size, names: names.size, amounts: amounts.size }, literals: { ids: [...ids], names: [...names], amounts: [...amounts] } }
}

const scenario = JSON.parse(readFileSync(SCENARIO, 'utf8'))
const fixtures = JSON.parse(readFileSync(FIXTURES, 'utf8'))
const points = fixtures.points
const bench = loadBenchRules()

// Parity with bench.mjs on every seed message and every lookup text while it keeps its own copies; after it imports
// them, the import is the one home, and records.mjs still matches the outputs the last own copies recorded.
const texts = [...scenario.seed.map((message) => message.content), ...Object.values(scenario.tools).flatMap((table) => Object.values(table))]
if (bench === undefined) {
	const source = readFileSync(BENCH, 'utf8')
	const named = /^import \{([^}]*)\} from '\.\/records\.mjs'$/m.exec(source)?.[1].split(',').map((name) => name.trim()) ?? []
	check('parity', 'bench.mjs imports splitSentences and extractTokens from records.mjs', named.includes('splitSentences') && named.includes('extractTokens'), named)
	check('parity', 'bench.mjs defines no own sentence or token rule', !/^(?:function (?:splitSentences|extractTokens)\(|const (?:ID_SHAPE|NUMERIC) = )/m.test(source))
	for (const [at, recorded] of fixtures.parity.texts.entries()) {
		check('parity', `splitSentences on recorded text ${at}`, JSON.stringify(splitSentences(recorded.text)) === JSON.stringify(recorded.sentences), recorded.text)
		check('parity', `extractTokens on recorded text ${at}`, readTokens(extractTokens(recorded.text)) === JSON.stringify(recorded.tokens), recorded.text)
	}
} else
	for (const [at, text] of texts.entries()) {
		check('parity', `splitSentences on text ${at}`, JSON.stringify(splitSentences(text)) === JSON.stringify(bench.splitSentences(text)), text)
		check('parity', `extractTokens on text ${at}`, readTokens(extractTokens(text)) === readTokens(bench.extractTokens(text)), text)
	}

// Each stored message and result comes from scenario.json: the seed, a goal request, or a canned lookup text.
const requests = new Set(scenario.goals.map((goal) => goal.request))
for (const [name, point] of Object.entries(points)) {
	const { messages, results } = point.input
	const seedOk = scenario.seed.every((message, at) => messages[at]?.content === message.content && messages[at]?.role === message.role)
	check('provenance', `${name}: the first ${scenario.seed.length} messages are the seed`, seedOk)
	const loop = messages.slice(scenario.seed.length)
	const loopOk = loop.every((message) => (message.role === 'user' ? requests.has(message.content) : message.role === 'assistant' || message.role === 'tool'))
	check('provenance', `${name}: each later user message is a goal request`, loopOk)
	const resultOk = results.every((result) => scenario.tools[result.name]?.[Object.values(result.arguments)[0]] === result.text && messages.find((message) => message.id === result.id)?.content === result.text)
	check('provenance', `${name}: each result text is its canned lookup text`, resultOk)
	check('provenance', `${name}: today is the scenario clock`, point.input.today === scenario.ledger.clock)
}

// The plan's fixture texts, byte for byte.
const plan = readFileSync(PLAN, 'utf8')
const fences = [...plan.matchAll(/```text\n([\s\S]*?)\n```/g)].map((match) => match[1]).filter((fence) => fence.startsWith('## '))
check('plan', 'the plan holds 4 record fences', fences.length === 4, fences.length)
const [graceText, halvorsenText, luisText, kenjiText] = fences
const luisRules = luisText.split('\n\n')[1].split('\n').slice(1)

const g03 = viewPoint(points['g03-entry'])
check('plan', 'g03: the request reads Grace and Rules', JSON.stringify(g03.views.map((view) => view.key)) === JSON.stringify(['account:LH-20418', 'rules']), g03.views.map((view) => view.key))
check('plan', 'g03: Grace fixture', renderRecord(g03.views[0]) === graceText, renderRecord(g03.views[0]))
const g03Rules = ['## Rules', ...G03_RULES_ORDER.map((at) => luisRules[at])].join('\n')
check('plan', 'g03: Rules holds the 7 Luis-fixture Rules lines in the g03 desk order', renderRecord(g03.views[1]) === g03Rules, renderRecord(g03.views[1]))

const g05 = viewPoint(points['g05-entry'])
const g05Text = g05.views.map(renderRecord).join('\n\n')
check('plan', 'g05: Luis and Rules fixture', g05Text === luisText, g05Text)
check('plan', "g05: m2's MX-4471 sentence is in stale", g05.built.stale.some((entry) => entry.source === 'm2' && entry.sentence === 1 && entry.tokens.includes('MX-4471')))
check('plan', 'g05: m44 renders only in Luis', g05.built.records.filter((record) => record.lines.some((line) => line.source === 'm44')).map((record) => record.key).join() === 'account:LH-44870')
const g01Result = points['g05-entry'].input.results.find((result) => result.name === 'lookup_order' && result.arguments.id === 'LH-79215' && result.id !== 'm42')
check('plan', "g05: g01's LH-79215 lookup replaces the seed's and follows m44", g05.views[0].lines.some((line) => line.source === g01Result?.id) && !g05.views[0].lines.some((line) => line.source === 'm42'))

const g10 = viewPoint(points['g10-entry'])
check('plan', 'g10: Halvorsen fixture', renderRecord(g10.views[0]) === halvorsenText, renderRecord(g10.views[0]))
check('plan', "g10: m22's ESC-2291 sentence is in stale", g10.built.stale.some((entry) => entry.source === 'm22' && entry.sentence === 1 && entry.tokens.includes('ESC-2291')))
check('plan', "g10: m24's first sentence takes no prefix", g10.views[0].lines.find((line) => line.source === 'm24' && line.sentence === 0)?.party === undefined)
const repeat = viewPoint(points['g10-entry-repeat'])
const g07Result = points['g10-entry-repeat'].input.results.find((result) => result.arguments.id === 'LH-80941' && result.id !== 'm36')
check('plan', 'g10: a repeat lookup of LH-80941 in g07 changes no byte', renderRecord(repeat.views[0]) === renderRecord(g10.views[0]) && repeat.views[0].lines.some((line) => line.source === g07Result?.id) && !repeat.views[0].lines.some((line) => line.source === 'm36'))

const g06Entry = viewPoint(points['g06-entry'])
const g06Lookup = viewPoint(points['g06-lookup'])
const g09 = viewPoint(points['g09-entry'])
check('plan', 'g06 entry: no Kenji record, m11 in loose', !g06Entry.built.records.some((record) => record.key === 'account:LH-52307') && g06Entry.built.loose.includes('m11'))
check('plan', "g06 after its lookup: Kenji fixture", renderRecord(g06Lookup.views[0]) === kenjiText, renderRecord(g06Lookup.views[0]))
const kenji = (built) => built.records.find((record) => record.key === 'account:LH-52307')
check('plan', 'g09 reads the version built after the g06 lookup', g09.views[0]?.key === 'account:LH-52307' && kenji(g09.built).hash === kenji(g06Lookup.built).hash)

const joined = (view) => view.views.map(renderRecord).join('\n\n').length
const sizes = { g03: joined(g03), g05: joined(g05), g10: joined(g10) }
// The fixture texts are the byte reference, so the expected counts come from them and not from the plan's prose.
const fenceSizes = { g03: graceText.length + 2 + luisText.split('\n\n')[1].length, g05: luisText.length, g10: halvorsenText.length + 2 + luisText.split('\n\n')[1].length }
check('plan', 'selected record characters at g03, g05, and g10 equal the plan fixture texts joined', JSON.stringify(sizes) === JSON.stringify(fenceSizes), `built ${JSON.stringify(sizes)}, fixture texts ${JSON.stringify(fenceSizes)}`)

// An entities() error, name-word matching off, passes every check and fails the Halvorsen fixture.
const strict = { ...clone(points['g10-entry'].input), entities: clone(points['g10-entry'].wholeNameEntities) }
const strictView = viewPoint(points['g10-entry'], strict)
check('plan', 'name-word matching off passes checkRecords', checkRecords(strictView.built, strict).length === 0, checkRecords(strictView.built, strict).join('\n'))
check('plan', 'name-word matching off fails the Halvorsen fixture', renderRecord(strictView.views[0]) !== halvorsenText)

// Edge fixtures.
const undecided = clone(points['g05-entry'].input)
delete undecided.judgments.categories.m29
const undecidedBuilt = buildRecords(undecided)
const rulesOf = (built) => built.records.find((record) => record.key === 'rules')
check('edge', "m29 undecided: m29 stays in Rules through m2's pair and MX-4486 renders", rulesOf(undecidedBuilt).members.includes('m29') && rulesOf(undecidedBuilt).lines.some((line) => line.text.includes('MX-4486')))
check('edge', 'm29 undecided: the build is clean', checkRecords(undecidedBuilt, undecided).length === 0)
const pairOff = clone(undecided)
delete pairOff.judgments.amended.m2
const pairOffBuilt = buildRecords(pairOff)
check('edge', "m29 and m2's pair undecided: m29 stays in Rules through the decided m3 pair", rulesOf(pairOffBuilt).members.includes('m29') && !pairOffBuilt.loose.includes('m29'))
check('edge', "m29 and m2's pair undecided: m2 keeps both sentences", rulesOf(pairOffBuilt).lines.filter((line) => line.source === 'm2').length === 2)
const pairsOff = clone(pairOff)
delete pairsOff.judgments.amended.m3
const pairsOffBuilt = buildRecords(pairsOff)
check('edge', 'm29 with no decided pair: m29 is in loose', pairsOffBuilt.loose.includes('m29') && !rulesOf(pairsOffBuilt).members.includes('m29'))
check('edge', 'm29 with no decided pair: m2 keeps both sentences', rulesOf(pairsOffBuilt).lines.filter((line) => line.source === 'm2').length === 2)
check('edge', 'm29 with no decided pair: the build is clean', checkRecords(pairsOffBuilt, pairsOff).length === 0)

const contact = {
	today: '2026-03-02',
	system: 'You are the trade desk assistant for Fernhill Supply.',
	exclude: [],
	accounts: { [FICTIONAL_ACCOUNT]: ['Brightwater Studio'] },
	messages: [
		{ id: 'm0', role: 'user', content: 'Their buyer is Odile Marlow. She orders on Mondays.' },
		{ id: 'm1', role: 'assistant', content: '', calls: [] },
		{ id: 'm2', role: 'tool', content: `Account ${FICTIONAL_ACCOUNT}: Brightwater Studio, trade tier, net 15 terms.` },
	],
	results: [{ id: 'm2', name: 'lookup_customer', arguments: { account: FICTIONAL_ACCOUNT }, text: `Account ${FICTIONAL_ACCOUNT}: Brightwater Studio, trade tier, net 15 terms.` }],
	entities: { m2: [FICTIONAL_ACCOUNT] },
	judgments: { quiet: [], categories: { m0: 'fact', m2: 'fact' }, desk: { m0: ['contacts'] }, amended: {}, superseded: {} },
}
const contactBuilt = buildRecords(contact)
check('edge', 'Brightwater contact: the message names no account and lands in loose', contactBuilt.loose.includes('m0') && !contactBuilt.records.some((record) => record.lines.some((line) => line.source === 'm0')))
check('edge', 'Brightwater contact: the build is clean', checkRecords(contactBuilt, contact).length === 0)
const joinedContact = { ...clone(contact), entities: { m0: [FICTIONAL_ACCOUNT], m2: [FICTIONAL_ACCOUNT] } }
const joinedBuilt = buildRecords(joinedContact)
const brightwater = `## Brightwater Studio (account ${FICTIONAL_ACCOUNT})\n- Their buyer is Odile Marlow.\n- Odile Marlow: She orders on Mondays.\n- Account ${FICTIONAL_ACCOUNT}: Brightwater Studio, trade tier, net 15 terms.`
check('edge', 'Brightwater contact joined to its account: the second line takes the prefix Odile Marlow', renderRecord(joinedBuilt.records[0]) === brightwater, renderRecord(joinedBuilt.records[0]))
check('edge', 'Brightwater contact joined to its account: the build is clean', checkRecords(joinedBuilt, joinedContact).length === 0)

const g05Input = points['g05-entry'].input
check('edge', 'm44 with its decided m4 pair: the pair is in the input', g05Input.judgments.amended.m4?.includes('m44') && g05Input.judgments.superseded.m4?.includes('m44'))
check('edge', "m44 with its decided m4 pair: m44 joins Luis's record and no Rules line", g05.built.records.find((record) => record.key === 'account:LH-44870').members.includes('m44') && !rulesOf(g05.built).lines.some((line) => line.source === 'm44'))
check('edge', 'm44 with its decided m4 pair: superseded m4 renders nowhere', !g05.built.records.some((record) => record.members.includes('m4')) && !g05.built.loose.includes('m4'))

// An amending message outside the members renders nowhere, so it can carry no value its earlier side drops.
const amenderOut = clone(points['g05-entry'].input)
amenderOut.exclude.push('m29')
const amenderOutBuilt = buildRecords(amenderOut)
check('edge', 'amending message excluded: m2 keeps both sentences and stale lists none of them', rulesOf(amenderOutBuilt).lines.filter((line) => line.source === 'm2').length === 2 && !amenderOutBuilt.stale.some((entry) => entry.source === 'm2'))
check('edge', 'amending message excluded: the build is clean', checkRecords(amenderOutBuilt, amenderOut).length === 0, checkRecords(amenderOutBuilt, amenderOut).join('\n'))

const emptySuperseded = clone(points['g05-entry'].input)
emptySuperseded.judgments.superseded.m40 = []
const emptySupersededBuilt = buildRecords(emptySuperseded)
check('edge', 'a superseded entry with no later id leaves m40 live and the build clean', emptySupersededBuilt.records.some((record) => record.members.includes('m40')) && checkRecords(emptySupersededBuilt, emptySuperseded).length === 0, checkRecords(emptySupersededBuilt, emptySuperseded).join('\n'))

// A lookup with two id arguments links each, so the key order of its arguments decides nothing.
const orderText = `Order ${FICTIONAL_ORDER} for account ${FICTIONAL_ACCOUNT}: walnut shelving, total $75.00.`
const twoIds = {
	...clone(contact),
	messages: [
		{ id: 'm0', role: 'user', content: `Order ${FICTIONAL_ORDER} left the dock two days late.` },
		{ id: 'm1', role: 'assistant', content: '' },
		{ id: 'm2', role: 'tool', content: orderText },
	],
	results: [{ id: 'm2', name: 'lookup_order', arguments: { account: FICTIONAL_ACCOUNT, id: FICTIONAL_ORDER }, text: orderText }],
	entities: { m0: [FICTIONAL_ORDER], m2: [FICTIONAL_ORDER, FICTIONAL_ACCOUNT] },
	judgments: { quiet: [], categories: { m0: 'fact', m2: 'fact' }, desk: {}, amended: {}, superseded: {} },
}
const twoIdsReversed = { ...clone(twoIds), results: [{ ...twoIds.results[0], arguments: { id: FICTIONAL_ORDER, account: FICTIONAL_ACCOUNT } }] }
const twoIdsBuilt = buildRecords(twoIds)
check('edge', 'two-id lookup: m0 joins Brightwater through the order id', twoIdsBuilt.records.find((record) => record.key === `account:${FICTIONAL_ACCOUNT}`)?.members.includes('m0') === true, JSON.stringify(twoIdsBuilt.loose))
check('edge', 'two-id lookup: reversing the argument keys changes no byte', twoIdsBuilt.hash === buildRecords(twoIdsReversed).hash)
check('edge', 'two-id lookup: the build is clean', checkRecords(twoIdsBuilt, twoIds).length === 0, checkRecords(twoIdsBuilt, twoIds).join('\n'))

const aliasInput = clone(points['g05-entry'].input)
const aliasBuilt = buildRecords(aliasInput)
const aliasBefore = JSON.stringify([aliasInput.judgments.desk, aliasBuilt.records.map((record) => record.lines)])
for (const view of selectRecords(aliasBuilt, g05.request))
	for (const line of view.lines) {
		line.desk.push('placeholder')
		line.text = 'placeholder'
	}
check('edge', 'editing a view leaves its record and the input unchanged', JSON.stringify([aliasInput.judgments.desk, aliasBuilt.records.map((record) => record.lines)]) === aliasBefore)

// The amount comparison on the seed, then one fictional case per comparator word.
const luisGoals = new Set(['g01-entry', 'g02-entry', 'g05-entry'])
for (const name of ['g01-entry', 'g02-entry', 'g03-entry', 'g04-entry', 'g05-entry', 'g06-entry', 'g07-entry', 'g08-entry', 'g09-entry', 'g10-entry']) {
	const { views, request } = viewPoint(points[name])
	const expected = luisGoals.has(name) ? ['$289.00 is over $200.'] : []
	const found = compareAmounts(views, request)
	check('compare', `${name}: ${expected.length === 0 ? 'nothing' : expected[0]}`, JSON.stringify(found) === JSON.stringify(expected), JSON.stringify(found))
}
const orderView = { key: `account:${FICTIONAL_ACCOUNT}`, title: 'Brightwater Studio', lines: [{ text: 'Order BW-5512: walnut shelving, total $75.00.', source: 'm2', sentence: 0, desk: [], role: 'tool' }, { text: 'They mentioned a $40 budget.', source: 'm0', sentence: 0, desk: [], role: 'user' }] }
const ruleView = (text, desk = ['pricing']) => ({ key: 'rules', title: 'Rules', lines: [{ text, source: 'm1', sentence: 0, desk, role: 'user' }] })
const cases = [
	['over', 'Any order over $50 ships free.', '$75.00 is over $50.'],
	['above', 'Orders above $100 need a second check.', '$75.00 is under $100.'],
	['more than', 'An order of more than $60 earns a sample.', '$75.00 is over $60.'],
	['under', 'Orders under $80 ship by ground.', '$75.00 is under $80.'],
	['below', 'Orders below $20.50 carry a handling fee.', '$75.00 is over $20.50.'],
	['less than', 'Anything less than $75 waits for the weekly run.', '$75.00 equals $75.'],
	['at least', 'Credit terms need at least $70 on the order.', '$75.00 is over $70.'],
	['at most', 'Card orders run at most $1,000.00 without a call.', '$75.00 is under $1,000.00.'],
]
for (const [word, rule, expected] of cases) {
	const found = compareAmounts([orderView, ruleView(rule)], { desk: ['pricing'] })
	check('compare', `comparator "${word}"`, JSON.stringify(found) === JSON.stringify([expected]), JSON.stringify(found))
}
check('compare', 'a rule whose desk topics miss the request emits nothing', compareAmounts([orderView, ruleView(cases[0][1], ['returns'])], { desk: ['pricing'] }).length === 0)
check('compare', 'a rule with no comparator word emits nothing', compareAmounts([orderView, ruleView('Quote every order in dollars, such as $90.')], { desk: ['pricing'] }).length === 0)
check('compare', 'an amount in a line that is not a lookup result is skipped', !compareAmounts([orderView, ruleView(cases[0][1])], { desk: ['pricing'] }).some((line) => line.startsWith('$40')))

// Every fixture build is clean; each check fires on its injected fault.
for (const [name, point] of Object.entries(points)) {
	const faults = checkRecords(buildRecords(point.input), point.input)
	check('faults', `${name}: the build is clean`, faults.length === 0, faults.join('\n'))
}
const base = points['g05-entry'].input
const fresh = () => clone(buildRecords(base))
const rulesRecord = (built) => built.records.find((record) => record.key === 'rules')
const lineOf = (built, source, sentence) => built.records.flatMap((record) => record.lines).find((line) => line.source === source && line.sentence === sentence)

const edited = fresh()
lineOf(edited, 'm6', 0).text += ' today'
check('faults', 'verbatim fires on an edited line', hasCheck(checkRecords(edited, base), 'verbatim'))
const party = fresh()
Object.assign(lineOf(party, 'm8', 1), { party: 'Priya Raman', text: lineOf(party, 'm8', 1).text.replace('Tomasz Brennan: ', 'Priya Raman: ') })
check('faults', 'verbatim fires on a party absent from the preceding sentence', hasCheck(checkRecords(party, base), 'verbatim'))

const staleLine = fresh()
rulesRecord(staleLine).lines.push({ text: splitSentences(base.messages[2].content)[1], source: 'm2', sentence: 1, desk: ['refunds'], role: 'user' })
check('faults', 'dead fires on a line that holds a stale token', checkRecords(staleLine, base).some((fault) => fault.startsWith('dead') && fault.includes('which stale lists')))
for (const [source, reason] of [['m3', 'assistant'], ['m60', 'excluded'], ['m4', 'superseded'], ['m42', 'replaced'], ['m33', 'quiet']]) {
	const dead = fresh()
	rulesRecord(dead).lines.push({ text: splitSentences(base.messages.find((message) => message.id === source).content)[0], source, sentence: 0, desk: [], role: 'user' })
	check('faults', `dead fires on a line from a ${reason} source`, checkRecords(dead, base).some((fault) => fault.startsWith('dead') && fault.includes(`a ${reason} source`)))
}

const dropped = fresh()
rulesRecord(dropped).lines = rulesRecord(dropped).lines.filter((line) => !(line.source === 'm29' && line.sentence === 0))
check('faults', 'coverage fires on a dropped sentence', hasCheck(checkRecords(dropped, base), 'coverage'))

const moved = fresh()
const grace = moved.records.find((record) => record.key === 'account:LH-20418')
const halvorsen = moved.records.find((record) => record.key === 'account:LH-31055')
grace.members = grace.members.filter((id) => id !== 'm18')
halvorsen.members.push('m18')
halvorsen.lines.push(...grace.lines.filter((line) => line.source === 'm18'))
grace.lines = grace.lines.filter((line) => line.source !== 'm18')
check('faults', "placement fires on a member moved to another account's record", hasCheck(checkRecords(moved, base), 'placement'))

const emptied = fresh()
emptied.stale = []
check('faults', 'stale fires on stale emptied', hasCheck(checkRecords(emptied, base), 'stale'))

const handled = fresh()
lineOf(handled, 'm40', 0).text += ' See m12.'
check('faults', 'handle fires on a handle its source lacks', hasCheck(checkRecords(handled, base), 'handle'))

const partOfName = fresh()
Object.assign(lineOf(partOfName, 'm8', 1), { party: 'Tom', text: lineOf(partOfName, 'm8', 1).text.replace('Tomasz Brennan: ', 'Tom: ') })
check('faults', 'verbatim fires on a party that is only part of a name in the preceding sentence', hasCheck(checkRecords(partOfName, base), 'verbatim'))

// The build a subject rule reading the first argument key returns: the order id links nowhere.
const firstKey = buildRecords({ ...clone(twoIds), results: [{ ...twoIds.results[0], arguments: { account: FICTIONAL_ACCOUNT } }] })
check('faults', 'order fires on the build of a subject rule that reads the first argument key', hasCheck(checkRecords(firstKey, twoIds), 'order'))

const recordsSource = readFileSync(RECORDS, 'utf8')
const sweep = sweepSource(recordsSource, scenario)
check('faults', 'sweep: records.mjs holds no scenario id, name, or amount', sweep.found.length === 0, sweep.found.join(', '))
check('faults', 'sweep fires on an injected holder name', sweepSource(`${recordsSource}\n// Grace Okafor\n`, scenario).found.includes('name Grace Okafor'))
check('faults', 'sweep fires on an injected id', sweepSource(`${recordsSource}\nconst code = 'MX-4486'\n`, scenario).found.includes('id MX-4486'))
check('faults', 'sweep fires on an injected amount', sweepSource(`${recordsSource}\nconst limit = '$5,000.00'\n`, scenario).found.includes('amount $5,000.00'))
const imports = [...recordsSource.matchAll(/^import .* from '([^']+)'$/gm)].map((match) => match[1])
check('faults', 'records.mjs imports only node:crypto', JSON.stringify(imports) === JSON.stringify(['node:crypto']), imports)

let total = 0
for (const [section, counts] of sections) {
	total += counts.passed + counts.failed
	process.stdout.write(`${section}: ${counts.passed} of ${counts.passed + counts.failed} passed\n`)
}
process.stdout.write(`selected record characters: ${JSON.stringify(sizes)}\n`)
process.stdout.write(`sweep: ${sweep.counts.ids} ids, ${sweep.counts.names} names, ${sweep.counts.amounts} amounts\n`)
process.stdout.write(`total: ${total - failures.length} of ${total} passed\n`)
for (const failure of failures) process.stdout.write(`FAIL ${failure}\n`)
process.exit(failures.length === 0 ? 0 : 1)
