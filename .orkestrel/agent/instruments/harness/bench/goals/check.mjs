// Checks the child goals' mechanical rules (children.json) against their fixtures (fixtures.json), with no daemon:
//   node check.mjs
// Each child's rules compile with compileRules, and each fixture must score the verdict it names (pass, fail, or none for a
// child with no mechanical rule) and show every rule hit it lists. A mutation check drops each forbiddenPatterns entry in turn
// and requires that at least one fail fixture then passes, so no pattern is dead. A pattern copied from scenario.json must still
// equal the scenario's pattern, so a scenario edit shows here. Every child needs a pass and a fail fixture (met and missed audit
// verdicts for a child with no rule).
// Each child's recordedReading must be one of full, violations-only, or parent-check, and its notExercised entries must be well formed;
// read.mjs checks that each entry still fits its recorded row.
// Exit: 0 when every fixture matches and no pattern is dead; 1 after printing each failure; 64 on usage.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileRules } from '../rescore.mjs'
import { judge, loadChildren } from './read.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))

if (process.argv.length > 2) {
	process.stderr.write('usage: node check.mjs\n')
	process.exit(64)
}

const failures = []
const fail = (message) => failures.push(message)

const scenario = JSON.parse(readFileSync(join(HERE, '..', 'scenario.json'), 'utf8'))
const fixtures = JSON.parse(readFileSync(join(HERE, 'fixtures.json'), 'utf8'))
let children = []
try {
	children = loadChildren()
} catch (error) {
	fail(`children.json: ${error.message}`)
}

const byChild = Map.groupBy(fixtures, (fixture) => fixture.child)
const known = new Set(children.map((entry) => entry.id))
for (const fixture of fixtures) if (!known.has(fixture.child)) fail(`${fixture.id}: names no child in children.json`)
const ids = fixtures.map((fixture) => fixture.id)
for (const id of ids.filter((id, i) => ids.indexOf(id) !== i)) fail(`${id}: fixture id repeats`)

let patternCount = 0
let mutationCount = 0
for (const entry of children) {
	const patterns = entry.mechanical.forbiddenPatterns
	patternCount += patterns.length
	if (patterns.length !== entry.patternLabels.length) fail(`${entry.id}: ${patterns.length} patterns but ${entry.patternLabels.length} labels`)
	if (new Set(patterns).size !== patterns.length) fail(`${entry.id}: a pattern repeats`)
	for (const [i, label] of entry.patternLabels.entries()) {
		const copied = /^scenario g(\d\d) #(\d+)$/.exec(label)
		if (copied === null) continue
		const parent = scenario.goals.find((goal) => goal.id.startsWith(`g${copied[1]}-`))
		if (parent?.forbiddenPatterns?.[Number(copied[2]) - 1] !== patterns[i]) fail(`${entry.id}: pattern #${i + 1} no longer equals ${label} in scenario.json`)
	}
	const parentGoal = scenario.goals.find((goal) => goal.id === entry.parent)
	if (parentGoal === undefined) fail(`${entry.id}: parent ${entry.parent} is not in scenario.json`)
	if (!['full', 'violations-only', 'parent-check'].includes(entry.recordedReading)) fail(`${entry.id}: recordedReading ${entry.recordedReading} is not full, violations-only, or parent-check`)
	if ((entry.recordedReading === 'parent-check') !== (entry.recordedMechanical !== undefined)) fail(`${entry.id}: recordedMechanical must be present exactly when recordedReading is parent-check`)
	for (const one of entry.notExercised ?? []) {
		if (typeof one.run !== 'string' || !/-v\d+$/.test(one.run) || typeof one.audit !== 'string' || typeof one.why !== 'string') fail(`${entry.id}: a notExercised entry needs a run ending in -vN, an audit item, and a why`)
	}
	for (const one of entry.diagnostics) for (const term of one.all) {
		try {
			new RegExp(term.pattern, 'i')
		} catch (error) {
			fail(`${entry.id}: diagnostic ${one.name} has an invalid pattern: ${error.message}`)
		}
	}

	const own = byChild.get(entry.id) ?? []
	const ruled = own.filter((fixture) => fixture.verdict !== 'none')
	if (patterns.length + entry.mechanical.expected.length + entry.mechanical.expectedAny.length + entry.mechanical.forbidden.length > 0) {
		if (!own.some((fixture) => fixture.verdict === 'pass')) fail(`${entry.id}: no pass fixture`)
		if (!own.some((fixture) => fixture.verdict === 'fail')) fail(`${entry.id}: no fail fixture`)
	} else {
		if (ruled.length > 0) fail(`${entry.id}: has no rule but a ${ruled[0].verdict} fixture`)
		if (!own.some((fixture) => fixture.auditExpected === 'met')) fail(`${entry.id}: no met audit fixture`)
		if (!own.some((fixture) => fixture.auditExpected === 'missed')) fail(`${entry.id}: no missed audit fixture`)
	}

	for (const fixture of own) {
		const result = judge(entry, fixture.text, { reading: fixture.reading })
		if (result.mechanical !== fixture.verdict) fail(`${fixture.id}: expected ${fixture.verdict}, scored ${result.mechanical} (${result.hits.join(', ') || 'no hits'})`)
		for (const hit of fixture.hits ?? []) if (!result.hits.some((seen) => seen === hit || (!/^pattern:#\d+$/.test(hit) && seen.startsWith(hit)))) fail(`${fixture.id}: expected hit ${hit}, saw ${result.hits.join(', ') || 'none'}`)
	}

	// A pattern is alive when removing it lets a fail fixture pass.
	for (const i of patterns.keys()) {
		mutationCount += 1
		const presence = entry.presencePatterns.filter((n) => n !== i + 1).map((n) => (n > i + 1 ? n - 1 : n))
		const mutated = { ...entry, presencePatterns: presence, mechanical: { ...entry.mechanical, forbiddenPatterns: patterns.filter((_, j) => j !== i) } }
		mutated.rules = compileRules({ id: entry.id, ...mutated.mechanical })
		const freed = own.filter((fixture) => fixture.verdict === 'fail' && judge(mutated, fixture.text, { reading: fixture.reading }).mechanical === 'pass')
		if (freed.length === 0) fail(`${entry.id}: pattern #${i + 1} is dead (${entry.patternLabels[i]}); no fail fixture passes without it`)
	}
}

const total = fixtures.length
if (failures.length > 0) {
	process.stderr.write(`${failures.join('\n')}\n`)
	process.stdout.write(`check: ${failures.length} failures over ${children.length} children, ${total} fixtures, ${patternCount} patterns\n`)
	process.exit(1)
}
process.stdout.write(`check: ${children.length} children, ${total} fixtures, ${patternCount} patterns, ${mutationCount} mutations; all fixtures match and no pattern is dead\n`)
