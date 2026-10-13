// Totals of measurement run 3 over the records-report.mjs outputs it names: per wire, the goals with `over` true,
// with every goal fact at entry, with every slot of the facts plus the date line, with an old-token line in the
// briefing, with an account record the request does not name, with `records.faults`, with an old token in the tail,
// with a tail message of another account, with a tail unlike the installed harness's, with a stub state that differs
// from it, and with a cut record line, the
// range of the first-call scale under `on` and under the installed harness, and the judge bodies that matched a
// recorded one. Usage: node records-totals.mjs REPORT...
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
const range = (values) => (values.some((value) => typeof value !== 'number') ? 'unread' : `${Math.min(...values)} to ${Math.max(...values)}`)
let go = true
for (const file of process.argv.slice(2)) {
	const lines = readFileSync(file, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
	const goals = lines.filter((line) => line.goal !== undefined)
	const tail = lines.at(-1)
	const full = (cell) => cell.split('/')[0] === cell.split('/')[1]
	const names = (test) => goals.filter(test).map((goal) => goal.goal).join(',') || 'none'
	const over = goals.filter((goal) => goal.over).length
	const facts = goals.filter((goal) => full(goal.facts)).length
	if (over > 0 || facts < goals.length) go = false
	console.log(
		`${basename(file, '.jsonl')}: ${goals.length} goals; over ${over} (${names((goal) => goal.over)}); facts full ${facts} of ${goals.length}; facts plus date full ${goals.filter((goal) => full(goal.dated)).length}; old-token briefing lines in ${names((goal) => goal.oldLines.length > 0)}; foreign account records in ${names((goal) => goal.foreign.length > 0)}; records.faults in ${names((goal) => (goal.records?.faults.length ?? 1) > 0)}; old tokens in the tail in ${names((goal) => goal.tailOld.length > 0 || (goal.records?.tail.length ?? 0) > 0)}; tail of another account in ${names((goal) => goal.tailForeign.length > 0)}; tail unlike the installed harness's in ${names((goal) => goal.tailSame === false)}; stub state changed in ${names((goal) => (goal.stubsChanged ?? 0) > 0)}; record lines cut in ${names((goal) => (goal.records?.cut ?? 0) > 0)}; unscoped ${names((goal) => !goal.scoped)}; scale ${range(goals.map((goal) => goal.scale))} against ${range(goals.map((goal) => goal.offScale))}; judge bodies exact ${tail.judgeBodies}`,
	)
}
console.log(`run 3 rule (over false and full fact recall in every goal): ${go ? 'go' : 'no-go'}`)
