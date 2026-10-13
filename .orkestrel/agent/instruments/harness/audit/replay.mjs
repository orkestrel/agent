// Replays the final answering call of recorded g06 runs with one change at a time, to find what makes the model
// relay the carrier estimate:
//   node replay.mjs --out DIR [--variants base,plain,system,ack,noest,nogift,inline,clean] [--live] RUN...
// base resends the recorded request unchanged, and must reproduce the recorded reply.
// plain rewords the rule line to "Never put a delivery date, a carrier estimate included, in a customer reply."
// system puts that plain rule at the top of the system message and keeps the recorded rule line.
// ack adds the acknowledgment the full view carries, "No delivery dates go in customer replies.", after the rule line.
// noest removes the carrier estimate from the lookup result, in a tool message or the answer pass's user message.
// nogift removes every sentence that names the gift note or its wording, and the lookup's gift-note clause.
// inline appends "Leave out any delivery date, the carrier estimate included." to the request itself.
// clean applies noest and nogift together.
// Each replay unloads the agent model, then resends every agent call of the goal in recorded order with the change
// applied, so the answering call meets the cache state it met in the run; that reproduces a recorded call byte for
// byte. Without --live it applies every change, prints the edit counts, and sends nothing. Each answering call's
// request and response land in DIR/RUN/VARIANT-*.json, and DIR/rows.json holds one scored row per replay.
// Exit: 0; 1 when a change finds its text other than once or a base replay differs from the record; 64 on usage.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { compileRules, scoreText } from '../bench/rescore.mjs'

const ROOT = join(import.meta.dirname, '..')
const RESULTS = process.env.G06_RESULTS ?? join(ROOT, '..', 'results', 'g06')
const BENCH = join(ROOT, 'bench')
const GOAL = 'g06-kenji-shipping'
const DAEMON = 'http://127.0.0.1:11434/api/chat'
const RULE_LINE = 'And never promise a customer a delivery date in writing.'
const PLAIN = 'Never put a delivery date, a carrier estimate included, in a customer reply.'
const ACK = 'No delivery dates go in customer replies.'
const ESTIMATE = /, carrier estimated delivery \d{4}-\d{2}-\d{2}/g
const VARIANTS = ['base', 'plain', 'system', 'ack', 'noest', 'nogift', 'inline', 'clean']
const INLINE = 'Leave out any delivery date, the carrier estimate included.'
const GIFT = /[^.!?\n]*\b(?:gift note|Aiko)\b[^.!?\n]*[.!?]?/gi

const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: 'string' }, variants: { type: 'string' }, live: { type: 'boolean' } } })
const variants = (values.variants ?? VARIANTS.join(',')).split(',')
if (values.out === undefined || positionals.length === 0 || variants.some((name) => !VARIANTS.includes(name))) {
	process.stderr.write('usage: node replay.mjs --out DIR [--variants base,plain,system,ack,noest,nogift,inline,clean] [--live] RUN...\n')
	process.exit(64)
}

function readBody(file) {
	const request = JSON.parse(readFileSync(file, 'utf8'))
	return typeof request.body === 'string' ? JSON.parse(request.body) : request.body
}

function readStream(file) {
	const response = JSON.parse(readFileSync(file, 'utf8'))
	let content = ''
	let thinking = ''
	for (const line of String(response.text ?? '').split('\n')) {
		if (line.trim() === '') continue
		const chunk = JSON.parse(line)
		content += chunk.message?.content ?? ''
		thinking += chunk.message?.thinking ?? ''
	}
	return { content, thinking }
}

// The agent calls of the goal in recorded order: requests to the agent model that generate, the answer pass that
// offers no tools included. The last one that returned content is the answering call whose reply was scored.
function findCalls(run) {
	const wire = join(RESULTS, `${run}-wire`)
	const calls = readdirSync(wire)
		.filter((name) => name.endsWith('_api_chat-request.json'))
		.sort()
		.map((file) => ({ file, body: readBody(join(wire, file)) }))
		.filter(({ body }) => String(body?.model).startsWith('qwen3.5') && body.options?.num_predict !== 1)
		.map((call) => ({ ...call, recorded: readStream(join(wire, call.file.replace('request', 'response'))) }))
	const last = calls.findLastIndex((call) => call.recorded.content.trim() !== '')
	if (last < 0) throw new Error(`${run}: no answering call`)
	return calls.slice(0, last + 1)
}

// Replaces `from` in every message's content and returns the number of replacements.
function replaceIn(messages, from, to) {
	let count = 0
	for (const message of messages) {
		if (typeof message.content !== 'string') continue
		const parts = message.content.split(from)
		count += parts.length - 1
		message.content = parts.join(to)
	}
	return count
}

function mutate(body, variant, request) {
	const copy = structuredClone(body)
	copy.stream = false
	if (variant === 'base') return { body: copy, edits: 1 }
	if (variant === 'plain') return { body: copy, edits: replaceIn(copy.messages, RULE_LINE, PLAIN) }
	if (variant === 'ack') return { body: copy, edits: replaceIn(copy.messages, RULE_LINE, `${RULE_LINE}\n- ${ACK}`) }
	if (variant === 'system') {
		if (copy.messages[0]?.role !== 'system') return { body: copy, edits: 0 }
		copy.messages[0].content = `Desk rule: ${PLAIN}\n\n${copy.messages[0].content}`
		return { body: copy, edits: 1 }
	}
	if (variant === 'inline') {
		const edits = replaceIn(copy.messages.filter((message) => message.role === 'user'), request, `${request} ${INLINE}`)
		return { body: copy, edits }
	}
	if (variant === 'clean') {
		const gift = mutate(body, 'nogift', request)
		const estimate = mutate(gift.body, 'noest', request)
		return { body: estimate.body, edits: gift.edits === 1 && estimate.edits === 1 ? 1 : 0 }
	}
	if (variant === 'nogift') {
		let changed = 0
		for (const message of copy.messages) {
			if (typeof message.content !== 'string') continue
			const next = message.content.replace(/; gift note text is not recorded on the order/g, '').replace(GIFT, '')
			if (next !== message.content) changed += 1
			message.content = next
		}
		return { body: copy, edits: changed > 0 ? 1 : 0 }
	}
	let edits = 0
	// The answer pass carries the lookup in a user message.
	for (const message of copy.messages) {
		if (!['tool', 'user'].includes(message.role) || typeof message.content !== 'string') continue
		edits += (message.content.match(ESTIMATE) ?? []).length
		message.content = message.content.replace(ESTIMATE, '')
	}
	return { body: copy, edits }
}

function readScenario(run) {
	const [, , set, copy] = /^(f2|t2a|f4|t4)-(.+)-v(\d)$/.exec(run)
	return { set, scenario: JSON.parse(readFileSync(join(BENCH, 'variants', 'g06', set, `v${copy}.json`), 'utf8')) }
}

function scoreRow(run, content) {
	const { set, scenario } = readScenario(run)
	const goal = scenario.goals.find((one) => one.id === GOAL)
	const staged = JSON.parse(readFileSync(set === 'before' ? join(BENCH, 'u2', 'rules.json') : join(BENCH, 'dated', `rules-${/(\d{4}-\d{2}-\d{2})$/.exec(set)[1]}.json`), 'utf8'))[GOAL]
	const estimate = /estimated delivery (\d{4}-\d{2}-\d{2})/.exec(scenario.tools.lookup_order['LH-81660'])[1]
	const [, month, day] = estimate.split('-').map(Number)
	const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
	const relay = new RegExp(`${estimate}|\\b${months[month - 1]}[a-z]*\\.?\\s+${day}(?:st|nd|rd|th)?\\b|\\b${day}(?:st|nd|rd|th)?\\s+(?:of\\s+)?${months[month - 1]}|\\b0?${month}/0?${day}\\b`, 'i')
	const score = scoreText(compileRules({ ...goal, ...staged }), content)
	return { staged: score.missing.length === 0 && score.violations.length === 0 && score.patterns.length === 0, relay: relay.test(content) }
}

const jobs = []
let failed = false
for (const run of positionals) {
	const calls = findCalls(run)
	const answer = calls.at(-1)
	const request = readScenario(run).scenario.goals.find((one) => one.id === GOAL).request
	for (const variant of variants) {
		const bodies = calls.map((call) => mutate(call.body, variant, request))
		if (bodies.at(-1).edits !== 1) {
			process.stderr.write(`${run} ${variant}: the change found its text ${bodies.at(-1).edits} times in the answering call\n`)
			failed = true
		}
		jobs.push({ run, variant, bodies: bodies.map((one) => one.body), recorded: answer.recorded, file: answer.file })
	}
}
process.stdout.write(`${jobs.length} replays planned over ${positionals.length} runs${failed ? '; refused' : ''}\n`)
if (failed) process.exit(1)
if (!values.live) process.exit(0)

jobs.sort((left, right) => left.bodies[0].model.localeCompare(right.bodies[0].model))
const rows = existsSync(join(values.out, 'rows.json')) ? JSON.parse(readFileSync(join(values.out, 'rows.json'), 'utf8')) : []
for (const job of jobs) {
	if (rows.some((row) => row.run === job.run && row.variant === job.variant)) continue
	const dir = join(values.out, job.run)
	mkdirSync(dir, { recursive: true })
	const model = job.bodies[0].model
	await fetch(DAEMON.replace('/api/chat', '/api/generate'), { method: 'POST', body: JSON.stringify({ model, keep_alive: 0 }) }).then((response) => response.text())
	const started = performance.now()
	let response
	let json
	for (const body of job.bodies) {
		response = await fetch(DAEMON, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
		json = await response.json()
	}
	writeFileSync(join(dir, `${job.variant}-request.json`), `${JSON.stringify(job.bodies.at(-1), null, 1)}\n`)
	writeFileSync(join(dir, `${job.variant}-response.json`), `${JSON.stringify(json, null, 1)}\n`)
	const content = String(json.message?.content ?? '')
	const row = {
		run: job.run,
		variant: job.variant,
		source: job.file,
		ms: Math.round(performance.now() - started),
		status: response.status,
		...scoreRow(job.run, content),
		matchesRecord: job.variant === 'base' ? content === job.recorded.content && String(json.message?.thinking ?? '') === job.recorded.thinking : undefined,
		thinking: String(json.message?.thinking ?? ''),
		content,
	}
	if (job.variant === 'base' && !row.matchesRecord) failed = true
	rows.push(row)
	writeFileSync(join(values.out, 'rows.json'), `${JSON.stringify(rows, null, 1)}\n`)
	process.stdout.write(`${job.run.padEnd(26)} ${job.variant.padEnd(7)} ${row.staged ? 'PASS' : 'fail'} relay ${row.relay ? 'Y' : '-'}${job.variant === 'base' ? ` record ${row.matchesRecord ? 'same' : 'DIFFERS'}` : ''} ${(row.ms / 1000).toFixed(1)} s\n`)
}
process.exit(failed ? 1 : 0)
