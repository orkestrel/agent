// Derives the records fixture inputs from bench.mjs's own Ledger at each build point and writes them to
// records-fixtures.json. Run it through derive-register.mjs with the no-net preload; see records-fixtures.json
// `provenance` for the command.
import { readFileSync, writeFileSync } from 'node:fs'

const JUDGMENTS = '/home/user/agent/tmp/bench/results/v3/cal-categories.jsonl'
const REQUEST_ROWS = ['/home/user/agent/tmp/bench/results/v9/a0-ledger-1/ledger.jsonl', '/home/user/agent/tmp/bench/results/v9/a0-ledger-2/ledger.jsonl']
const OUT = '/home/user/agent/tmp/bench3/records-fixtures.json'
// The lookups each goal makes before the next goal enters: the expected lookup of each goal the plan's fixtures
// name, with g07's repeat of the seed's order lookup kept to its own point.
const LOOKUPS_BY_GOAL = {
	g01: [{ name: 'lookup_order', arguments: { id: 'LH-79215' } }],
	g02: [{ name: 'lookup_customer', arguments: { account: 'LH-44870' } }],
	g06: [{ name: 'lookup_order', arguments: { id: 'LH-81660' } }],
	g08: [{ name: 'lookup_customer', arguments: { account: 'LH-31055' } }],
}
const REPEAT = { g07: [{ name: 'lookup_order', arguments: { id: 'LH-80941' } }] }
const POINTS = [
	...['g01', 'g02', 'g03', 'g04', 'g05', 'g06', 'g07', 'g08', 'g09', 'g10'].map((goal, at) => ({ name: `${goal}-entry`, goals: at + 1, own: false, extra: {} })),
	{ name: 'g06-lookup', goals: 6, own: true, extra: {} },
	{ name: 'g10-entry-repeat', goals: 10, own: false, extra: REPEAT },
]

function readRequestDesk(desk) {
	const [first, ...rest] = REQUEST_ROWS.map((file) =>
		Object.fromEntries(
			readFileSync(file, 'utf8')
				.trim()
				.split('\n')
				.map((line) => JSON.parse(line))
				.map((row) => [row.goal.slice(0, 3), row.request.topics.filter((topic) => Object.hasOwn(desk, topic))]),
		),
	)
	for (const other of rest) if (JSON.stringify(other) !== JSON.stringify(first)) throw new Error('derive: the a0 ledger runs disagree on request desk topics')
	return first
}

function buildPoint(bench, settings, system, point) {
	const { scenario, seedMessages, createConversationManager, createLedger, importJudgments, MICA_MODEL, LOOKUPS, keep } = bench
	const conversations = createConversationManager({ keep })
	const conversation = conversations.add()
	conversations.switch(conversation.id)
	const seedIds = conversation.add(seedMessages).map((message) => message.id)
	const ledger = createLedger(conversation, MICA_MODEL, settings, system)
	ledger.load()
	const imported = importJudgments(ledger, seedIds, MICA_MODEL, JUDGMENTS)
	let next = 1
	for (const goal of scenario.goals.slice(0, point.goals)) {
		const key = goal.id.slice(0, 3)
		const last = scenario.goals.indexOf(goal) === point.goals - 1
		const request = conversation.add({ role: 'user', content: goal.request })
		ledger.beginRun(request.id)
		const lookups = last && !point.own ? [] : [...(point.extra[key] ?? []), ...(LOOKUPS_BY_GOAL[key] ?? [])]
		for (const lookup of lookups) {
			const call = { id: `call_${String(next++).padStart(8, '0')}`, ...lookup }
			const value = scenario.tools[call.name][Object.values(call.arguments)[0]]
			conversation.add({ role: 'assistant', content: '', calls: [call] })
			ledger.record(call, { success: true, id: call.id, name: call.name, value })
			conversation.add({ role: 'tool', content: value, call: call.id })
		}
		if (!last) conversation.add({ role: 'assistant', content: `Reply to ${goal.id}.` })
	}
	const list = conversation.messages()
	const handle = new Map(list.map((message, at) => [message.id, `m${at}`]))
	const named = (ids) => [...ids].map((id) => handle.get(id))
	const pairs = (map) => Object.fromEntries([...map].map(([earlier, later]) => [handle.get(earlier), named(later)]))
	const holders = new Map([...ledger.registry.accounts].map((account) => [account, []]))
	for (const [name, owners] of ledger.registry.aliases) for (const owner of owners) holders.set(owner, [...(holders.get(owner) ?? []), name])
	const marks = ledger.marks()
	const results = list.flatMap((message) => {
		const call = ledger.call(message)
		const result = ledger.result(message.id)
		if (call === undefined || !LOOKUPS.has(call.name) || result?.success !== true || ledger.empty(result)) return []
		return [{ id: handle.get(message.id), name: call.name, arguments: call.arguments, text: ledger.text(message.id) }]
	})
	const input = {
		today: ledger.clock,
		system,
		exclude: named([...ledger.runs.map((run) => run.request).filter((id) => id !== undefined), ...ledger.notes]),
		accounts: Object.fromEntries(holders),
		messages: list.map((message) => ({ id: handle.get(message.id), role: message.role, content: ledger.text(message.id) })),
		results,
		entities: Object.fromEntries(list.map((message) => [handle.get(message.id), [...ledger.entities(ledger.text(message.id))]]).filter(([, found]) => found.length > 0)),
		judgments: {
			quiet: named(list.filter((message) => ledger.quiet(message.id)).map((message) => message.id)),
			categories: Object.fromEntries(list.map((message) => [handle.get(message.id), ledger.category(message.id)]).filter(([, category]) => category !== undefined)),
			desk: Object.fromEntries(list.map((message) => [handle.get(message.id), [...ledger.deskTopics(message.id)]]).filter(([, topics]) => topics.length > 0)),
			amended: pairs(marks.amended),
			superseded: pairs(marks.superseded),
		},
	}
	// The pair questions the seed pass asks that the imported file holds no record for, by the loop of `categorize`.
	const unrecorded = []
	for (const later of list.slice(0, seedIds.length)) {
		if (ledger.codeCategory(later) !== undefined || later.role !== 'user' || !ledger.opensCorrection(later.id)) continue
		const near = ledger.topics(later.id, false)
		if (near.size === 0) continue
		for (const earlier of list.slice(0, ledger.position(later.id))) {
			if (ledger.quiet(earlier.id) || ![...ledger.topics(earlier.id, false)].some((topic) => near.has(topic))) continue
			if (ledger.read(ledger.specPair('amends', earlier.id, later.id)) === undefined) unrecorded.push(`amends ${handle.get(earlier.id)} ${handle.get(later.id)}`)
		}
	}
	const goal = scenario.goals[point.goals - 1]
	const wholeNameEntities = Object.fromEntries(list.map((message) => [handle.get(message.id), [...ledger.entities(ledger.text(message.id), false)]]).filter(([, found]) => found.length > 0))
	return { input, wholeNameEntities, request: { goal: goal.id, entities: [...ledger.entities(goal.request)] }, imported, unrecorded }
}

export async function derive(bench) {
	const settings = bench.readLedgerSettings()
	const system = bench.buildLedgerSystem(settings.gate, settings.reply, bench.systemOptions(settings))
	const desk = readRequestDesk(bench.scenario.ledger.topics)
	const points = {}
	const notes = new Set()
	for (const point of POINTS) {
		const { input, wholeNameEntities, request, imported, unrecorded } = buildPoint(bench, settings, system, point)
		points[point.name] = { lookups: { ...LOOKUPS_BY_GOAL, ...point.extra }, own: point.own, request: { ...request, desk: desk[request.goal.slice(0, 3)] }, input, wholeNameEntities }
		notes.add(`imported ${imported}; unrecorded seed pairs ${unrecorded.join(', ') || 'none'}`)
	}
	const fixture = {
		provenance: {
			command:
				'RECORDS_DERIVE=/home/user/agent/tmp/bench/results/v9/recordswork/derive.mjs node --import /home/user/agent/tmp/bench/results/v8/refinework/no-net.mjs --import /home/user/agent/tmp/bench/results/v9/recordswork/derive-register.mjs /home/user/agent/tmp/bench3/bench.mjs --check-ledger --profile refined --reply terminal',
			ledger: `bench.mjs createLedger with readLedgerSettings under --profile refined --reply terminal, MICA_MODEL, load(), and importJudgments of ${JUDGMENTS} at LEDGER_FIT ${JSON.stringify(bench.LEDGER_FIT)}`,
			lookups: 'each goal adds its request (conversation.add, beginRun), then each listed lookup as an assistant call message, Ledger.record, and a tool message carrying scenario.json tools text; an entry point leaves out the entering goal own lookups',
			today: 'Ledger.clock',
			system: 'buildLedgerSystem(settings.gate, settings.reply, systemOptions(settings))',
			exclude: 'Ledger.runs[].request and Ledger.notes',
			accounts: 'Ledger.registry.accounts in learn order, each with the Ledger.registry.aliases names that own it, in learn order (#learn through Ledger.record)',
			messages: 'conversation.messages() with content from Ledger.text(id); ids are position handles mN',
			results: 'tool messages whose Ledger.call(message) is a LOOKUPS name and whose Ledger.result is a success that Ledger.empty does not flag; name and arguments from Ledger.call, text from Ledger.text',
			entities: 'Ledger.entities(Ledger.text(id)), non-empty only',
			wholeNameEntities: 'Ledger.entities(Ledger.text(id), false), non-empty only: the input of an entities() error with name-word matching off',
			'judgments.quiet': 'Ledger.quiet(id)',
			'judgments.categories': 'Ledger.category(id), decided only',
			'judgments.desk': 'Ledger.deskTopics(id), non-empty only',
			'judgments.amended': 'Ledger.marks().amended',
			'judgments.superseded': 'Ledger.marks().superseded',
			'request.entities': 'Ledger.entities(request text) at the point',
			'request.desk': `the desk topics of request.topics in ${REQUEST_ROWS.join(' and ')}, which agree; both runs are live mica readings of these request texts at LEDGER_FIT`,
			derived: [...notes].join(' | '),
		},
		points,
	}
	writeFileSync(OUT, `${JSON.stringify(fixture, null, '\t')}\n`)
	process.stdout.write(`derive: wrote ${Object.keys(points).length} points to ${OUT}; ${[...notes].join(' | ')}\n`)
}
