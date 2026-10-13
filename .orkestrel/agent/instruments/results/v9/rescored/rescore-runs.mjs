// Usage: node rescore-runs.mjs
// Rescores every finished a0-, a1-, and a2- run and every finished aN-NAME-vN run under results/v9 that holds 10 goal
// rows with the edited scoring fields of the scenario the run named, and writes rescored/RUN/FILE with the row shape the harness wrote. The originals stay untouched.
// Writes rescored/RUN/FILE.sha256 with the original's hash, so band.mjs can refuse a copy of an earlier run.
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { clean, compileRules, scoreText } from '../../../rescore.mjs'

const V9 = path.resolve(import.meta.dirname, '..')
const BENCH = path.resolve(V9, '../..')
const EDITED = [
	path.join(BENCH, 'scenario.json'),
	path.resolve(BENCH, '../bench3/scenario.json'),
	...['', 'ledger'].flatMap((folder) => Array.from({ length: 8 }, (_, at) => path.join(BENCH, 'variants', folder, `v${at + 1}.json`))),
]
// The backups each edit of the scoring fields left, in the order the edits landed; a run started between two edits
// scored with the backup of the later one.
const BACKUPS = ['pre-negation', 'pre-room']
const STALE = /245\.65|43\.35|esc-2291|mx-4471/i
const log = fs.readFileSync(path.join(V9, 'run.log'), 'utf8')
const goalsOf = (file) => JSON.parse(fs.readFileSync(file, 'utf8')).goals

// A run that named a scenario outside the edited set, such as a .pre-refine copy, takes the edited goals of the
// file whose pre-edit goals equal its own, the same harness's file first, so its requests and every other scoring
// field stay what it ran.
function editedGoals(scenario) {
	if (EDITED.includes(scenario)) return { goals: goalsOf(scenario), before: BACKUPS.map((suffix) => ({ label: suffix, goals: goalsOf(`${scenario}.${suffix}`) })), source: scenario }
	const own = JSON.stringify(goalsOf(scenario))
	const twin = [...EDITED.filter((file) => scenario.startsWith(`${file}.`)), ...EDITED].find((file) => JSON.stringify(goalsOf(`${file}.pre-negation`)) === own)
	if (twin === undefined) throw new Error(`${scenario} matches the pre-edit goals of no edited scenario`)
	return { goals: goalsOf(twin), before: [{ label: path.basename(scenario), goals: goalsOf(scenario) }], source: `${twin} (goals equal ${scenario})` }
}

// The harness's rule: the first run did not throw and the delivered reply is not empty and scores clean.
function rescore(row, rules) {
	const scored = scoreText(rules, row.reply)
	const answered = scoreText(rules, row.answer ?? '')
	return {
		...row,
		missing: scored.missing,
		violations: scored.violations,
		patternViolations: scored.patterns,
		success: row.error === undefined && row.reply !== '' && clean(scored),
		...(Object.hasOwn(row, 'answer')
			? { answerMissing: answered.missing, answerViolations: [...answered.violations, ...answered.patterns], successAnswer: row.error === undefined && row.answerVia !== 'none' && clean(answered) }
			: {}),
	}
}

function excerpt(reply) {
	const flat = reply.replace(/\s+/g, ' ')
	const at = flat.search(STALE)
	return at < 0 ? flat.slice(0, 200) : flat.slice(Math.max(0, at - 120), at + 80)
}

let failed = false
const runs = fs
	.readdirSync(V9)
	.filter((name) => (/^a[012]-/.test(name) || /^a\d+-[a-z]+-v\d+$/.test(name)) && !name.endsWith('-wire') && fs.statSync(path.join(V9, name)).isDirectory())
	.sort()
for (const run of runs) {
	const finished = new RegExp(`^===== ${run} end \\S+ exit 0$`, 'm').test(log)
	const named = log.match(new RegExp(`^===== ${run} start \\S+ \\[.*--scenario ([^\\s\\]]+)`, 'm'))?.[1]
	const file = fs.readdirSync(path.join(V9, run)).find((entry) => entry.endsWith('.jsonl') && !entry.startsWith('memory'))
	const raw = file === undefined ? '' : fs.readFileSync(path.join(V9, run, file), 'utf8')
	const rows = raw.split('\n').filter((line) => line.trim() !== '').map((line) => JSON.parse(line))
	const goalRows = rows.filter((row) => row.goal !== undefined && Object.hasOwn(row, 'reply'))
	if (!finished || named === undefined || goalRows.length !== 10) {
		console.log(`${run}: skipped (${!finished ? 'no exit 0 end line' : named === undefined ? 'no --scenario' : `${goalRows.length} goal rows`})`)
		continue
	}
	const { goals, before, source } = editedGoals(named)
	const rulesAfter = new Map(goals.map((goal) => [goal.id, compileRules(goal)]))
	// Some pre-edit rules must give back the recorded fields, so every change the run reports comes from the edits alone.
	const drifts = before.map(({ label, goals: earlier }) => {
		const rules = new Map(earlier.map((goal) => [goal.id, compileRules(goal)]))
		const drift = goalRows.filter((row) => {
			const again = rescore(row, rules.get(row.goal))
			return again.success !== row.success || again.successAnswer !== row.successAnswer
		})
		return { label, drift }
	})
	const reproducing = drifts.filter(({ drift }) => drift.length === 0).map(({ label }) => label)
	if (reproducing.length === 0) {
		failed = true
		console.log(`${run}: no pre-edit rules reproduce the recorded fields (${drifts.map(({ label, drift }) => `${label}: ${drift.map((row) => row.goal).join(', ')}`).join('; ')}); not written`)
		continue
	}
	const out = rows.map((row) => (row.goal !== undefined && Object.hasOwn(row, 'reply') ? rescore(row, rulesAfter.get(row.goal)) : row))
	const target = path.join(V9, 'rescored', run, file)
	fs.mkdirSync(path.dirname(target), { recursive: true })
	fs.writeFileSync(target, out.map((row) => `${JSON.stringify(row)}\n`).join(''))
	fs.writeFileSync(`${target}.sha256`, `${createHash('sha256').update(raw).digest('hex')}\n`)
	const passes = (list) => list.filter((row) => row.success === true).length
	const changed = out.filter((row, at) => row.success !== rows[at].success || row.successAnswer !== rows[at].successAnswer)
	console.log(`${run}: ${source}; recorded fields equal the ${reproducing.join(', ')} rules; success ${passes(rows)} -> ${passes(out)} of ${goalRows.length}; wrote ${path.relative(V9, target)}`)
	for (const row of changed) {
		const was = rows[out.indexOf(row)]
		console.log(`  ${row.goal}: success ${was.success} -> ${row.success}, successAnswer ${was.successAnswer} -> ${row.successAnswer}; "${excerpt(row.reply)}"`)
	}
}
process.exit(failed ? 1 : 0)
