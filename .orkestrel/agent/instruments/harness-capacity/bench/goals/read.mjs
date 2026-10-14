// Applies each child goal's mechanical rules (children.json) to the recorded replies of its parent goal, with no daemon:
//   node read.mjs --out ROWS.jsonl [--runs DIR[,DIR]...] [--skip-recorded] [--full]
// Recorded set: results/v9/a1-control-v1..8, agent-port bench4 results/a5-records-v1..8 and p1-ledger-v1..8, and every
// results/v10/{f4,t2a,t4}-{records,control}-vN present. --runs adds run directories (repeat the flag or join with commas), for
// example results/v11/g2-records-v1 for another model; --skip-recorded reads only those.
// A run directory holds ledger.jsonl (arm records) or none.jsonl (arm control), one row per parent goal. The reply scored is the
// row's `reply`, as rescore.mjs scores `success`: an error or an undelivered reply fails.
// The recorded replies answer the compound parent request. A child reads one of three ways on those replies
// (recordedReading in children.json); --full applies every rule as `full`, as a run of the split request needs:
//   full           every rule.
//   violations-only  only violations, for a requirement the parent request never asks for (g05b, g06b, g06c, g06d, g08c, g08d):
//                  missing expected strings and presence patterns are ignored, so silence is not a fail.
//   parent-check   the child's `recordedMechanical` expected and expectedAny replace its own, for a requirement the parent
//                  request asks for in a weaker form (g07b: "today" answers "by when", so the date forms are not required).
// A child's `notExercised` entries name a run whose reply cannot show the requirement (g05a: R3 fails and the note names no
// code, or R7 fails and no note exists). Such a row scores `not-exercised` and leaves the pass denominator; an entry whose row
// fails for any other reason, or passes, is reported as a problem.
// Output: one JSON line per run, copy, arm, and child to --out:
//   { run, copy, arm, model, child, parent, track, mechanical: pass|fail|none|not-exercised, hits, needsAudit, think, family, reading, diagnostics }
// `none` marks a child with no mechanical rule (g03e), which only an audit decides. Stdout holds a per-child, per-arm pass count
// table and a diagnostic count table for each model and thinking setting.
// Exit: 0; 1 when a run file is missing or unreadable, a parent goal has no reply or repeats in a run, or a `notExercised` entry
// no longer fits its row (the other rows are still written); 64 on usage.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { compileRules, plainText, scoreText } from '../rescore.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const RESULTS = join(HERE, '..', '..', '..', 'results')
const PORT = join(RESULTS, 'port')
const USAGE = 'usage: node read.mjs --out ROWS.jsonl [--runs DIR[,DIR]...] [--skip-recorded] [--full]\n'

export function loadChildren(file = join(HERE, 'children.json')) {
	return JSON.parse(readFileSync(file, 'utf8')).map((entry) => ({ ...entry, rules: compileRules({ id: entry.id, ...entry.mechanical }) }))
}

function hasRules(entry) {
	const { expected, expectedAny, forbidden, forbiddenPatterns } = entry.mechanical
	return expected.length + expectedAny.length + forbidden.length + forbiddenPatterns.length > 0
}

// A diagnostic is a conjunction of patterns on the plain reply; `not` inverts one term.
function diagnose(entry, reply) {
	const plain = plainText(reply)
	return Object.fromEntries(entry.diagnostics.map((one) => [one.name, one.all.every((term) => new RegExp(term.pattern, 'i').test(plain) !== (term.not === true))]))
}

/**
 * Scores one reply against one child goal the way rescore.mjs scores `success`: an error or an undelivered reply fails.
 * @param entry - A child from `loadChildren`
 * @param reply - The reply text
 * @param options - `error` from the row, `delivered` when the row says the reply was not delivered, and `reading`: `violations-only`
 * ignores missing expected strings and the child's presence patterns, and `parent-check` swaps in the child's `recordedMechanical`
 * expected strings
 * @returns The verdict (`none` when the child has no mechanical rule), the rule hits that decided it, and the audit names it needs
 */
export function judge(entry, reply, { error, delivered = reply !== '', reading = 'full' } = {}) {
	const rules = reading === 'parent-check' ? compileRules({ id: entry.id, ...entry.mechanical, ...entry.recordedMechanical }) : entry.rules
	const scored = scoreText(rules, reply)
	const numbers = scored.patterns.map((source) => entry.mechanical.forbiddenPatterns.indexOf(source) + 1)
	const only = reading === 'violations-only'
	const hits = [
		...(error === undefined ? [] : ['error']),
		...(delivered ? [] : ['empty-reply']),
		...(only ? [] : scored.missing.map((text) => `missing:${text}`)),
		...scored.violations.map((text) => `forbidden:${text}`),
		...numbers.filter((n) => !only || !entry.presencePatterns.includes(n)).map((n) => `pattern:#${n}`),
	]
	const mechanical = !hasRules(entry) ? 'none' : hits.length === 0 ? 'pass' : 'fail'
	return { mechanical, hits, needsAudit: entry.audit.map((one) => one.name) }
}

function recordedRuns() {
	const dirs = []
	for (let copy = 1; copy <= 8; copy += 1)
		dirs.push(join(RESULTS, 'v9', `a1-control-v${copy}`), join(PORT, `a5-records-v${copy}`), join(PORT, `p1-ledger-v${copy}`))
	const v10 = join(RESULTS, 'v10')
	if (existsSync(v10))
		dirs.push(...readdirSync(v10).filter((name) => /^(f4|t2a|t4)-(records|control)-v\d+$/.test(name)).sort().map((name) => join(v10, name)))
	return dirs
}

function runFile(dir) {
	return ['ledger.jsonl', 'none.jsonl'].map((name) => join(dir, name)).find((file) => existsSync(file))
}

// The sibling run.json of a port run names the agent model when the rows do not.
function settings(dir, rows) {
	const named = rows.find((row) => row.model !== undefined)
	let agent = {}
	const file = join(dir, 'run.json')
	if (existsSync(file)) agent = JSON.parse(readFileSync(file, 'utf8')).settings?.agent ?? {}
	return { model: named?.model ?? agent.model ?? 'unknown', think: named?.think ?? agent.think ?? null }
}

function readRun(dir, children, problems, strict) {
	const file = runFile(dir)
	if (file === undefined) {
		problems.push(`${dir}: no ledger.jsonl or none.jsonl`)
		return []
	}
	let lines
	try {
		lines = readFileSync(file, 'utf8').split('\n').filter((text) => text.trim() !== '').map((text) => JSON.parse(text))
	} catch (error) {
		problems.push(`${file}: ${error.message}`)
		return []
	}
	const run = basename(dir)
	const replies = new Map()
	// A calibration row holds no reply and is skipped as rescore.mjs skips it. rescore.mjs scores every row of a repeated goal,
	// so a repeat is a problem here rather than a row dropped without a word.
	for (const line of lines) {
		if (typeof line.goal !== 'string' || !Object.hasOwn(line, 'reply')) continue
		if (replies.has(line.goal)) problems.push(`${run}: repeated reply for ${line.goal}`)
		replies.set(line.goal, line)
	}
	const { model, think } = settings(dir, lines)
	const arm = basename(file) === 'ledger.jsonl' ? 'records' : 'control'
	const copy = /-v(\d+)$/.exec(run)?.[1]
	const rows = []
	for (const parent of new Set(children.map((entry) => entry.parent))) {
		if (!replies.has(parent)) problems.push(`${run}: no reply for ${parent}`)
	}
	for (const entry of children) {
		const line = replies.get(entry.parent)
		if (line === undefined) continue
		const reply = line.reply ?? ''
		// A row with `replyVia` delivered the reply its design produced; an older row counts only a sent reply.
		const delivered = line.replyVia !== undefined ? reply !== '' : (line.replied ?? reply !== '')
		const verdict = judge(entry, reply, { error: line.error, delivered, reading: strict ? 'full' : entry.recordedReading })
		// --full reads the reply as the split request would, so it keeps every row scored.
		const excluded = strict ? undefined : entry.notExercised?.find((one) => one.run === run)
		if (excluded !== undefined) {
			if (verdict.mechanical === 'fail' && verdict.hits.every((hit) => hit.startsWith('missing:'))) verdict.mechanical = 'not-exercised'
			else problems.push(`${run}: ${entry.id} lists audit item ${excluded.audit} as not exercised, but the row scores ${verdict.mechanical} (${verdict.hits.join(', ') || 'no hits'})`)
		}
		rows.push({
			run,
			copy: copy === undefined ? null : Number(copy),
			arm,
			model,
			child: entry.id,
			parent: entry.parent,
			track: entry.track,
			...verdict,
			think,
			reading: strict ? 'full' : entry.recordedReading,
			family: run.replace(/-v\d+$/, ''),
			diagnostics: { emptyReply: reply === '', ...diagnose(entry, reply) },
		})
	}
	return rows
}

function table(rows, children) {
	const groups = Map.groupBy(rows, (row) => `${row.model}, thinking ${row.think === null ? 'unknown' : row.think ? 'on' : 'off'}`)
	const lines = []
	for (const [group, groupRows] of groups) {
		const families = [...new Set(groupRows.map((row) => row.family))].sort((a, b) => (a.includes('control') === b.includes('control') ? a.localeCompare(b) : a.includes('control') ? -1 : 1))
		const arms = families.map((family) => `${family} (${groupRows.find((row) => row.family === family).arm})`)
		lines.push(`## ${group}`, '', 'Mechanical passes over copies per child; `n/a` marks a child with no mechanical rule, `*` a child read for violations only because the parent request never asks for its requirement, `†` a child whose expected strings follow the parent request, and `(n not exercised)` rows the child leaves out of the denominator because the reply cannot show its requirement.', '', `| child | track | ${arms.join(' | ')} |`, `| --- | --- | ${families.map(() => '---:').join(' | ')} |`)
		for (const entry of children) {
			const cells = families.map((family) => {
				const mine = groupRows.filter((row) => row.family === family && row.child === entry.id)
				if (mine.length === 0) return '-'
				if (mine[0].mechanical === 'none') return 'n/a'
				const skipped = mine.filter((row) => row.mechanical === 'not-exercised').length
				return `${mine.filter((row) => row.mechanical === 'pass').length}/${mine.length - skipped}${skipped === 0 ? '' : ` (${skipped} not exercised)`}`
			})
			const reading = groupRows.find((row) => row.child === entry.id)?.reading
			lines.push(`| ${entry.id}${reading === 'violations-only' ? ' *' : reading === 'parent-check' ? ' †' : ''} | ${entry.track} | ${cells.join(' | ')} |`)
		}
		lines.push('', 'Diagnostic counts (replies where the diagnostic holds, over replies read):', '', `| child | diagnostic | ${arms.join(' | ')} |`, `| --- | --- | ${families.map(() => '---:').join(' | ')} |`)
		const names = [...new Set(children.flatMap((entry) => entry.diagnostics.map((one) => `${entry.id}|${one.name}`)))]
		for (const name of names) {
			const [childId, diagnostic] = name.split('|')
			const cells = families.map((family) => {
				const mine = groupRows.filter((row) => row.family === family && row.child === childId)
				return mine.length === 0 ? '-' : `${mine.filter((row) => row.diagnostics[diagnostic]).length}/${mine.length}`
			})
			lines.push(`| ${childId} | ${diagnostic} | ${cells.join(' | ')} |`)
		}
		const empties = families.map((family) => {
			const replies = new Map(groupRows.filter((row) => row.family === family).map((row) => [`${row.run}|${row.parent}`, row.diagnostics.emptyReply]))
			return `${family} ${[...replies.values()].filter(Boolean).length}/${replies.size}`
		})
		lines.push('', `Empty parent replies over parent replies read: ${empties.join(', ')}`, '')
	}
	return lines.join('\n')
}

function main() {
	let parsed
	try {
		parsed = parseArgs({ options: { out: { type: 'string' }, runs: { type: 'string', multiple: true }, 'skip-recorded': { type: 'boolean' }, full: { type: 'boolean' } }, allowPositionals: false, strict: true })
	} catch {
		process.stderr.write(USAGE)
		process.exit(64)
	}
	const { values } = parsed
	if (values.out === undefined) {
		process.stderr.write(USAGE)
		process.exit(64)
	}
	const extra = (values.runs ?? []).flatMap((text) => text.split(',')).filter((text) => text !== '').map((text) => resolve(text))
	const dirs = [...(values['skip-recorded'] ? [] : recordedRuns()), ...extra]
	const children = loadChildren()
	const problems = []
	const rows = dirs.flatMap((dir) => readRun(dir, children, problems, values.full === true))
	writeFileSync(resolve(values.out), rows.map((row) => `${JSON.stringify(row)}\n`).join(''))
	if (rows.length > 0) process.stdout.write(`${table(rows, children)}\n`)
	process.stdout.write(`Read ${dirs.length} run directories; wrote ${rows.length} rows to ${resolve(values.out)}.\n`)
	if (problems.length > 0) {
		process.stderr.write(`${problems.join('\n')}\n`)
		process.exit(1)
	}
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
