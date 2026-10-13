// Applies the main unit's RFC 6902 scenario patch to bench3/scenario.json.pre-fix strictly and reports each
// operation that cannot apply; with --apply, writes bench3/scenario.json with every goal taken from the fixed
// bench/scenario.json after checking that the goals differ only in their scoring members.
import { readFileSync, writeFileSync } from 'node:fs'
const BENCH3 = '/home/user/agent/tmp/bench3/scenario.json'
const pre = JSON.parse(readFileSync(`${BENCH3}.pre-fix`, 'utf8'))
const main = JSON.parse(readFileSync('/home/user/agent/tmp/bench/scenario.json', 'utf8'))
const ops = JSON.parse(readFileSync('/home/user/agent/tmp/bench/results/v6/fixwork/scenario-patch.json', 'utf8'))
const SCORING = new Set(['expected', 'expectedAny', 'forbidden', 'forbiddenPatterns', 'tools'])
const strict = structuredClone(pre)
for (const [index, { op, path, value }] of ops.entries()) {
	const parts = path.split('/').slice(1)
	const key = parts.pop()
	const parent = parts.reduce((node, part) => node?.[part], strict)
	const problem =
		parent === undefined ? `parent ${parts.join('/')} is absent`
		: Array.isArray(parent) ? (op === 'add' && key === '-' ? undefined : `unsupported ${op}`)
		: op === 'replace' && !Object.hasOwn(parent, key) ? 'replace of a missing member'
		: op === 'add' && Object.hasOwn(parent, key) ? 'add over an existing member'
		: undefined
	if (problem !== undefined) {
		process.stdout.write(`op ${index + 1} ${op} ${path}: cannot apply (${problem})\n`)
		continue
	}
	if (Array.isArray(parent)) parent.push(value)
	else parent[key] = value
}
const mismatched = pre.goals.flatMap((goal, index) => {
	const other = main.goals[index]
	const keys = new Set([...Object.keys(goal), ...Object.keys(other)].filter((key) => !SCORING.has(key)))
	return [...keys].filter((key) => JSON.stringify(goal[key]) !== JSON.stringify(other[key])).map((key) => `${goal.id}.${key}`)
})
process.stdout.write(`goals ${pre.goals.length} against ${main.goals.length}; non-scoring members that differ: ${mismatched.join(', ') || 'none'}\n`)
const scoringDiffs = pre.goals.flatMap((goal, index) => [...SCORING].filter((key) => JSON.stringify(goal[key]) !== JSON.stringify(main.goals[index][key])).map((key) => `${goal.id.slice(0, 3)}.${key}`))
process.stdout.write(`scoring members that differ from the fixed main scenario: ${scoringDiffs.join(', ')}\n`)
if (process.argv.includes('--apply')) {
	if (mismatched.length > 0 || pre.goals.length !== main.goals.length) throw new Error('the goals differ outside their scoring members')
	writeFileSync(BENCH3, `${JSON.stringify({ ...pre, goals: main.goals })}\n`)
	process.stdout.write(`wrote ${BENCH3}\n`)
}
