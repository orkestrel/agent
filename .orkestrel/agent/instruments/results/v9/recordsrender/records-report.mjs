// Reads a `--records on` dry render for measurement run 3 of RECORDS-PLAN.md, apart from the harness's own row
// fields where it can: per goal, the briefing tokens against the room, `over`, the goal facts and the date line at
// entry, each old-token line in the briefing outside its correcting message, each account record of an account the
// request does not name, `records.faults`, the old tokens of the tail, each tail message that names an account the
// request does not name, and whether every judge body matched a recorded one. Beside OFF_DRY_DIR, a dry render of the
// installed harness under the same preload, it also reads whether the goal's tail holds that render's messages, each
// lookup stub read by its call alone, the count of stubs whose state differs, and the scale each render's first agent
// call of the goal measured. Usage: node records-report.mjs DRY_DIR VARIANT [OFF_DRY_DIR];
// prints JSON lines, one per goal.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const [dir, variantPath, offDir] = process.argv.slice(2)
const scenario = JSON.parse(readFileSync(variantPath, 'utf8'))
// Each old token with the seed message that corrects it and that message's acknowledgment, the governing pairs of
// bench.mjs `STALE`; a briefing line from the correction, or a tail message that is either, may state it.
const OLD = [
	{ pattern: /MX-4471/i, correcting: 29, acknowledged: 30 },
	{ pattern: /ESC-2291/i, correcting: 27, acknowledged: 28 },
	{ pattern: /restocking fee/i, correcting: 44, acknowledged: 45 },
]
const readLines = (file) => readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line))
const rowsOf = (base) => readLines(join(base, 'out', 'ledger.jsonl'))
const rows = rowsOf(dir)
const off = offDir === undefined ? undefined : rowsOf(offDir)
const report = readLines(join(dir, 'report.jsonl'))
const bodiesOf = (base) => new Map(readdirSync(join(base, 'bodies')).map((name) => [name.slice(0, 5), join(base, 'bodies', name)]))
const bodies = bodiesOf(dir)
// The messages of the first agent body of goal NUMBER in a dry render.
const firstBody = (base, number) => {
	const entry = readLines(join(base, 'report.jsonl')).find((one) => one.path === '/api/chat' && one.goal === number)
	return entry === undefined ? undefined : JSON.parse(readFileSync(bodiesOf(base).get(entry.n), 'utf8')).messages
}
// The token scale the harness fits to a goal's first agent call: its prompt less the fixed cost, over its estimate.
// A tail message with a stub read by its call alone, because the stub's state follows the briefing beside it.
const selected = (message) => JSON.stringify({ ...message, content: message.role === 'tool' && message.content.includes('}: ') ? message.content.slice(0, message.content.lastIndexOf('}: ') + 1) : message.content })
const scaleOf = (base, row) => {
	const { fixed } = JSON.parse(readFileSync(join(base, 'out', 'seed.json'), 'utf8')).measured
	const call = row.calls.find((one) => one.label === 'agent' && typeof one.prompt === 'number')
	return call === undefined ? undefined : Number(((call.prompt - fixed) / call.estimate).toFixed(3))
}

// The accounts each holder name and order id stand for, read from the lookup texts.
const holders = new Map()
const orders = new Map()
for (const text of Object.values(scenario.tools.lookup_customer)) {
	const [, id, name] = /^Account (\S+): ([^,]+),/.exec(text)
	holders.set(name, id)
}
for (const [order, text] of Object.entries(scenario.tools.lookup_order)) {
	const [, id, name] = /for account (\S+) \(([^)]+)\)/.exec(text)
	orders.set(order, id)
	holders.set(name, id)
}
const named = (request) => {
	const found = new Set()
	for (const id of new Set(holders.values())) if (request.includes(id)) found.add(id)
	for (const [order, id] of orders) if (request.includes(order)) found.add(id)
	for (const [name, id] of holders) if (name.split(' ').some((word) => new RegExp(`(?<![\\p{L}])${word}(?![\\p{L}])`, 'u').test(request))) found.add(id)
	return found
}

// Judge bodies go to the goal whose first agent request follows them; the seed pass's go to `seed`.
const judged = new Map()
let pending = []
for (const entry of report) {
	if (entry.path === '/api/generate') pending.push(entry.exact)
	else if (entry.path === '/api/chat') {
		const key = entry.goal ?? 'seed'
		judged.set(key, [...(judged.get(key) ?? []), ...pending])
		pending = []
	}
}
if (pending.length > 0) judged.set(rows.length, [...(judged.get(rows.length) ?? []), ...pending])

const out = []
for (const [at, row] of rows.entries()) {
	const goal = scenario.goals[at]
	const chats = report.filter((entry) => entry.path === '/api/chat' && entry.goal === at + 1)
	const messages = chats.map((entry) => JSON.parse(readFileSync(bodies.get(entry.n), 'utf8')).messages)
	const systems = new Set(messages.map((list) => list[0].content))
	const system = messages[0][0].content
	const briefing = system.includes('\n\n\n\n') ? system.slice(system.indexOf('\n\n\n\n') + 4) : ''
	const oldLines = []
	for (const line of briefing.split('\n')) {
		for (const old of OLD) {
			if (!old.pattern.test(line)) continue
			const text = line.replace(/^- /, '').replace(/^m\d+: /, '').replace(/ \[amended by [^\]]+\]$/, '')
			if (!scenario.seed[old.correcting].content.includes(text)) oldLines.push(line)
		}
	}
	const asked = named(goal.request)
	const foreign = [...briefing.matchAll(/^###? .+ \(account (\S+)\)$/gm)].map((match) => match[1]).filter((id) => !asked.has(id))
	const request = messages[0].findLastIndex((message) => message.role === 'user' && message.content === goal.request)
	const governing = (old, message) => [old.correcting, old.acknowledged].some((index) => scenario.seed[index].content === message.content)
	const tail = messages[0].slice(1, request).filter((message) => OLD.some((old) => old.pattern.test(message.content) && !governing(old, message)))
	// A tail request or lookup of another account, which records leave in the tail because the tail stays refined's.
	const tailForeign = messages[0].slice(1, request).filter((message) => (message.role === 'user' || message.role === 'tool') && [...named(message.content)].some((id) => !asked.has(id)))
	const offMessages = offDir === undefined ? undefined : firstBody(offDir, at + 1)
	const judges = judged.get(at + 1) ?? []
	out.push({
		goal: goal.id.slice(0, 3),
		tokens: row.briefing.tokens,
		room: row.briefing.room,
		over: row.briefing.over,
		facts: `${row.briefing.facts.covered}/${row.briefing.facts.slots}`,
		dated: `${row.briefing.dated.covered}/${row.briefing.dated.slots}`,
		records: row.records,
		scoped: Object.keys(row.records?.versions ?? {}).some((key) => key !== 'rules'),
		oldLines,
		foreign,
		tailOld: tail.map((message) => `${message.role}: ${message.content.slice(0, 60)}`),
		tailForeign: tailForeign.map((message) => `${message.role}: ${message.content.slice(0, 60)}`),
		scale: scaleOf(dir, row),
		judges: `${judges.filter(Boolean).length}/${judges.length}`,
		oneSystem: systems.size === 1,
		...(off === undefined
			? {}
			: {
					offTokens: off[at].briefing.tokens,
					offRoom: off[at].briefing.room,
					offOver: off[at].briefing.over,
					offFacts: `${off[at].briefing.facts.covered}/${off[at].briefing.facts.slots}`,
					offScale: scaleOf(offDir, off[at]),
					tailSame: offMessages !== undefined && JSON.stringify(offMessages.slice(1)) === JSON.stringify(messages[0].slice(1)),
					stubsChanged: offMessages === undefined ? undefined : messages[0].slice(1).filter((message, index) => message.role === 'tool' && message.content !== offMessages[index + 1]?.content).length,
				}),
	})
}
const seed = judged.get('seed') ?? []
for (const line of out) process.stdout.write(`${JSON.stringify(line)}\n`)
process.stdout.write(`${JSON.stringify({ seedJudges: `${seed.filter(Boolean).length}/${seed.length}`, judgeBodies: `${report.filter((entry) => entry.path === '/api/generate' && entry.exact).length}/${report.filter((entry) => entry.path === '/api/generate').length}` })}\n`)
