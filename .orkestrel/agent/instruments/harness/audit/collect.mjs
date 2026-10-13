// Collects every finished g06 run under the results directory into one row per run: the condition, the date
// frame, the reply, the live and staged scorer verdicts for that frame, what the reply does with the dates, whether
// the rule and its acknowledgment reached the answering prompt, and whether the thinking cites the rule:
//   node collect.mjs [--out ROWS.json]
// A before run scores staged rules from `u2/rules.json`; an after run scores `dated/rules-DATE.json`.
// Exit: 0; 64 on usage.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { compileRules, scoreText } from '../bench/rescore.mjs'

const ROOT = join(import.meta.dirname, '..')
const RESULTS = process.env.G06_RESULTS ?? join(ROOT, '..', 'results', 'g06')
const BENCH = join(ROOT, 'bench')
const GOAL = 'g06-kenji-shipping'
const RULE = /never promise a customer a delivery date|never put a delivery date/i
const ACK = /no delivery dates go in customer replies/i
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const { values } = parseArgs({ options: { out: { type: 'string' } } })

function frameOf(scenario) {
	const lookup = scenario.tools.lookup_order['LH-81660']
	const shipped = /Shipped (\d{4}-\d{2}-\d{2})/.exec(lookup)[1]
	const estimate = /estimated delivery (\d{4}-\d{2}-\d{2})/.exec(lookup)[1]
	return { today: scenario.ledger?.clock ?? /(\d{4}-\d{2}-\d{2})/.exec(scenario.seed[0].content)[1], shipped, estimate }
}

// The written forms of one date a reply can carry: ISO, month and day, day and month, numeric, and the weekday.
function formsOf(iso) {
	const date = new Date(`${iso}T00:00:00Z`)
	const day = date.getUTCDate()
	const month = MONTHS[date.getUTCMonth()]
	const short = month.slice(0, 3)
	return {
		date: new RegExp(`${iso}|\\b(?:${month}|${short}\\.?)\\s+${day}(?:st|nd|rd|th)?\\b|\\b${day}(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:${month}|${short})\\b|\\b0?${date.getUTCMonth() + 1}/0?${day}\\b`, 'i'),
		weekday: new RegExp(`\\b${WEEKDAYS[date.getUTCDay()]}\\b`, 'i'),
	}
}

function readThinking(wire) {
	let text = ''
	for (const file of readdirSync(wire).filter((name) => name.endsWith('_api_chat-response.json'))) {
		const response = JSON.parse(readFileSync(join(wire, file), 'utf8'))
		for (const line of String(response.text ?? '').split('\n')) {
			if (line.trim() === '') continue
			text += JSON.parse(line).message?.thinking ?? ''
		}
		text += '\n'
	}
	return text
}

// The agent requests of the goal: requests to the agent model that offer tools and generate, which leaves out the
// judge calls and the calibration calls (`num_predict` 1) that send the whole seed.
function readPrompts(wire) {
	return readdirSync(wire)
		.filter((name) => name.endsWith('_api_chat-request.json'))
		.sort()
		.map((file) => JSON.parse(readFileSync(join(wire, file), 'utf8')))
		.map((request) => (typeof request.body === 'string' ? JSON.parse(request.body) : (request.body ?? request)))
		.filter((body) => String(body.model).startsWith('qwen3.5') && Array.isArray(body.tools) && body.tools.length > 0 && body.options?.num_predict !== 1)
		.map((body) => body.messages.map((message) => String(message.content)).join('\n'))
}

// Only runs whose end line in run.log reads exit 0, so a run still writing its output is left out.
const finished = new Set([...readFileSync(join(RESULTS, 'run.log'), 'utf8').matchAll(/^===== (\S+) end \S+ exit 0$/gm)].map((match) => match[1]))
const rows = []
for (const run of readdirSync(RESULTS).filter((name) => finished.has(name)).sort()) {
	const name = existsSync(join(RESULTS, run)) ? readdirSync(join(RESULTS, run)).find((file) => file.endsWith('.jsonl')) : undefined
	if (name === undefined) continue
	const jsonl = join(RESULTS, run, name)
	const row = readFileSync(jsonl, 'utf8').trim().split('\n').map((line) => JSON.parse(line)).find((line) => line.goal === GOAL)
	if (row === undefined) continue
	const [, condition, set, copy] = /^(f2|t2a|f4|t4)-(.+)-v(\d)$/.exec(run)
	const scenario = JSON.parse(readFileSync(join(BENCH, 'variants', 'g06', set, `v${copy}.json`), 'utf8'))
	const goal = scenario.goals.find((one) => one.id === GOAL)
	const staged = JSON.parse(readFileSync(set === 'before' ? join(BENCH, 'u2', 'rules.json') : join(BENCH, 'dated', `rules-${/(\d{4}-\d{2}-\d{2})$/.exec(set)[1]}.json`), 'utf8'))[GOAL]
	const answer = String(row.answer ?? '')
	const live = scoreText(compileRules(goal), answer)
	const stagedScore = scoreText(compileRules({ ...goal, ...staged }), answer)
	const frame = frameOf(scenario)
	const estimate = formsOf(frame.estimate)
	const shipped = formsOf(frame.shipped)
	const wire = join(RESULTS, `${run}-wire`)
	const prompts = existsSync(wire) ? readPrompts(wire) : []
	const thinking = existsSync(wire) ? readThinking(wire) : ''
	rows.push({
		run,
		condition,
		set,
		copy: Number(copy),
		frame,
		liveSuccess: row.success,
		liveCheck: live.missing.length === 0 && live.violations.length === 0 && live.patterns.length === 0,
		stagedSuccess: stagedScore.missing.length === 0 && stagedScore.violations.length === 0 && stagedScore.patterns.length === 0,
		looked: row.tools.some((call) => call.name === 'lookup_order' && call.success),
		estimateDate: estimate.date.test(answer),
		estimateWeekday: estimate.weekday.test(answer),
		shipDate: shipped.date.test(answer),
		claimsDelivery: /\b(?:was|been|got|has been)\s+delivered\b|\barrived\b/i.test(answer),
		tracking: /PW-6013-2280/i.test(answer),
		ruleInPrompt: prompts.some((text) => RULE.test(text)),
		ackInPrompt: prompts.some((text) => ACK.test(text)),
		thinkingCitesRule: /promise|delivery dates?\b[^.\n]{0,40}\b(?:rule|writing|customer)|in writing/i.test(thinking),
		thinkingChars: thinking.length,
		answer,
	})
}
const json = `${JSON.stringify(rows, null, 1)}\n`
if (values.out !== undefined) writeFileSync(values.out, json)
for (const row of rows) {
	process.stdout.write(`${row.run.padEnd(26)} live ${row.liveSuccess ? 'P' : 'f'} staged ${row.stagedSuccess ? 'P' : 'f'} | est ${row.estimateDate ? 'D' : '-'}${row.estimateWeekday ? 'W' : '-'} ship ${row.shipDate ? 'D' : '-'} deliv ${row.claimsDelivery ? 'Y' : '-'} track ${row.tracking ? 'Y' : '-'} | rule ${row.ruleInPrompt ? 'Y' : '-'} ack ${row.ackInPrompt ? 'Y' : '-'} think-cites ${row.thinkingCitesRule ? 'Y' : '-'} (${row.thinkingChars})\n`)
}
