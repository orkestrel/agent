// Recounts `fabricated` over recorded ledger rows with the token rules lifted verbatim from bench3/bench.mjs.
// The corpus is the seed, every goal request, and every lookup record: a superset of what a run's lookups
// returned, so a count here can only be lower than one over the run's own corpus.
import { readFileSync } from 'node:fs'

const [benchFile, scenarioFile, ...rowFiles] = process.argv.slice(2)
const source = readFileSync(benchFile, 'utf8')
const lift = (pattern) => {
	const match = pattern.exec(source)
	if (match === null) throw new Error(`no ${pattern}`)
	return match[0]
}
const code = [
	lift(/^const ID_SHAPE = .*$/m),
	lift(/^const NUMERIC = .*$/m),
	lift(/^function extractTokens\(text\) \{[\s\S]*?\n\}/m),
	lift(/^function listMissingTokens\(value, source\) \{[\s\S]*?\n\}/m),
	lift(/^function escapePattern\(text\) \{[\s\S]*?\n\}/m),
	lift(/^function listFabricated\(text, corpus\) \{[\s\S]*?\n\}/m),
	'return { old: (text, corpus) => listMissingTokens(extractTokens(text), extractTokens(corpus)), now: listFabricated }',
].join('\n')
const rules = new Function(code)()
const scenario = JSON.parse(readFileSync(scenarioFile, 'utf8'))
const corpus = [
	...scenario.seed.map((message) => message.content),
	...scenario.goals.map((goal) => goal.request),
	...Object.values(scenario.tools).flatMap((table) => Object.values(table)),
].join('\n')
for (const file of rowFiles) {
	const rows = readFileSync(file, 'utf8').split('\n').filter((line) => line.trim() !== '').map((line) => JSON.parse(line)).filter((row) => row.goal !== undefined)
	let before = 0
	let after = 0
	for (const row of rows) {
		const old = rules.old(row.answer ?? '', corpus)
		const now = rules.now(row.answer ?? '', corpus)
		before += old.length > 0 ? 1 : 0
		after += now.length > 0 ? 1 : 0
		if (old.length + now.length + (row.fabricated?.length ?? 0) > 0) process.stdout.write(`${file} ${row.goal}: recorded ${JSON.stringify(row.fabricated)}, old rule ${JSON.stringify(old)}, new rule ${JSON.stringify(now)}\n`)
	}
	process.stdout.write(`${file}: replies with a fabricated token, old rule ${before}, new rule ${after}, of ${rows.length}\n`)
}
