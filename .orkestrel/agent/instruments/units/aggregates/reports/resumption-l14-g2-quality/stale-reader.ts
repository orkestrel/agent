import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { isRecord } from '@orkestrel/contract'
import { readCopy } from '../../.orkestrel/agent/instruments/harness/.build/bench5/Driver.js'
import { readRows, readWireReading, readScoreCarriers, matchesSummaryBlock } from '../../.orkestrel/agent/instruments/harness/.build/bench5/helpers.js'
import { isMatrixRequest, isMatrixSelection } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/validators.js'
import { collectSummaryBodies } from '../../.orkestrel/agent/instruments/harness/.build/bench5/aggregates/helpers.js'
import { INSTRUCTION_SUMMARIES } from '../../.orkestrel/agent/instruments/harness/.build/bench5/aggregates/constants.js'
import { plainText } from '../../.orkestrel/agent/instruments/harness/.build/bench/rescore.mjs'

const root = 'C:/Users/mikes/WebstormProjects/scaffold'
const run = `${root}/.orkestrel/agent/instruments/results/l14/g2-think0/pilot/development/l6-g2-think0-aggregate-v1`
const scenario = `${root}/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json`
const raw = `${run}/requests.jsonl`
const hash = createHash('sha256').update(readFileSync(raw)).digest('hex')
if (hash !== 'b1dc18477a82ae65cd43a6be7c9c3268f88eca223edb0c02e4d5f03241ac70ec') throw new Error('raw hash differs')
const copy = readCopy(scenario)
const requestRows = readRows(raw)
const requests = requestRows.filter((entry) => isRecord(entry) && [63, 64, 66].includes(Number(entry.sequence)))
if (requests.length !== 3 || !requests.every(isMatrixRequest)) throw new Error('missing or malformed selected requests')
const selectionRows = readRows(`${run}/selections.jsonl`)
const selections = selectionRows.filter((entry) => isRecord(entry) && ['g04-halvorsen-ticket', 'g05-luis-approval-note'].includes(String(entry.goal)))
if (!selections.every(isMatrixSelection)) throw new Error('malformed relevant selection')
const evidence = requests.map((request) => {
	const pick = selections.findLast((entry) => entry.goal === request.goal && entry.sequence < request.sequence)
	const goal = copy.goals.find((entry) => entry.id === request.goal)
	if (pick === undefined || goal === undefined) throw new Error('missing selection or goal')
	const body = pick.instructions[INSTRUCTION_SUMMARIES.name] ?? ''
	const reading = readWireReading({ body: request.request }, {})
	if (!matchesSummaryBlock(body, reading.messages)) throw new Error('unmatched actual summary block')
	const bodies = collectSummaryBodies(body)
	const shown = reading.messages.map((message) => message.role === 'system' ? message.content.replace(body, '') : message.content).join('\n')
	const own = readScoreCarriers(goal, bodies.join('\n'))
	const seen = readScoreCarriers(goal, shown)
	const sole = own.stale.filter((phrase) => !seen.stale.includes(phrase))
	const identifier = request.goal === 'g04-halvorsen-ticket' ? 'ESC-2291' : 'MX-4471'
	const sourcePattern = request.goal === 'g04-halvorsen-ticket' ? /ESC-2291|ESC-2219/i : /MX-4471|MX-4486/i
	const control = readScoreCarriers(goal, '')
	if (control.stale.length !== 0) throw new Error('empty-input control unexpectedly carries a stale phrase')
	return {
		sequence: request.sequence,
		row: requestRows.indexOf(request) + 1,
		goal: request.goal,
		after: goal.after,
		selection: pick.sequence,
		selectionRow: selectionRows.indexOf(pick) + 1,
		pass: pick.pass,
		body,
		bodies,
		messages: reading.messages,
		shown,
		own,
		seen,
		sole,
		control,
		prose: bodies.map((value) => readScoreCarriers(goal, value.split('\n').slice(2).join('\n'))),
		outside: shown.split('\n').filter((line) => line.toUpperCase().includes(identifier)),
		matches: sole.map((pattern) => ({ pattern, matches: [...plainText(bodies.join('\n')).matchAll(new RegExp(pattern, 'gi'))].map((match) => ({ text: match[0], offset: match.index })) })),
		source: copy.seed.slice(0, goal.after + 1).flatMap((entry, index) => sourcePattern.test(entry.content) ? [{ index, role: entry.role, content: entry.content }] : []),
	}
})
const output = `${root}/tmp/units/aggregate-final-g2-stale-reading-evidence.json`
writeFileSync(output, `${JSON.stringify({ raw, hash, scenario, evidence }, undefined, '\t')}\n`)
console.log(JSON.stringify(evidence.map(({ sequence, row, selection, selectionRow, outside, prose, control }) => ({ sequence, row, selection, selectionRow, outside, prose, control })), undefined, '\t'))
