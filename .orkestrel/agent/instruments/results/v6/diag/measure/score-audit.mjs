// Re-derives every head-to-head verdict from the stored reply and checks markdown sensitivity of the scorer.
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { clean, compileRules, scoreText } from '../../../../rescore.mjs'

const BENCH = '/home/user/agent/tmp/bench'
const scenario = JSON.parse(readFileSync(join(BENCH, 'scenario.json'), 'utf8'))
const rules = new Map(scenario.goals.map((goal) => [goal.id, compileRules(goal)]))
const RUNS = ['ab-none-terminal/none', 'ab-none-tool/none', 'ab-comp-terminal/compaction', 'ab-comp-tool/compaction']
const strip = (text) =>
	text
		.replace(/\*\*|__|`/g, '')
		.replace(/^#+\s*/gm, '')
		.replace(/^\s*\|?\s*:?-{3,}.*$/gm, '')
		.replace(/\s*\|\s*/g, ' ')
		.replace(/^\s*[*-]\s+/gm, '')
const DECOYS = /mx-4471|esc-2291|555-0142|245\.65|43\.35|marcus|friday|3 pm|gift wrapped|no charge/gi

for (const run of RUNS) {
	const dir = join(BENCH, 'results/v6', run.split('/')[0])
	if (!existsSync(`${dir}.done`)) {
		console.log(`${run}: no .done, skipped`)
		continue
	}
	const md = readFileSync(join(BENCH, 'results/v6', `${run}.md`), 'utf8')
	const rows = readFileSync(join(BENCH, 'results/v6', `${run}.jsonl`), 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line))
	let passed = 0
	let passedAny = 0
	const mismatches = []
	for (const row of rows) {
		const rule = rules.get(row.goal)
		const success = row.error === undefined && row.reply !== '' && clean(scoreText(rule, row.reply))
		const answerOk = row.error === undefined && row.answerVia !== 'none' && clean(scoreText(rule, row.answer))
		const stripped = row.error === undefined && row.reply !== '' && clean(scoreText(rule, strip(row.reply)))
		if (success !== row.success) mismatches.push(`${row.goal} success stored ${row.success} recomputed ${success}`)
		if (answerOk !== row.successAnswer) mismatches.push(`${row.goal} successAnswer stored ${row.successAnswer} recomputed ${answerOk}`)
		if (stripped !== success) mismatches.push(`${row.goal} markdown-stripped verdict ${stripped} differs from ${success}`)
		if (row.answer.trim() !== row.reply.trim()) mismatches.push(`${row.goal} answer text differs from reply (answerVia ${row.answerVia})`)
		passed += success ? 1 : 0
		passedAny += answerOk ? 1 : 0
		const decoys = [...new Set((row.reply.match(DECOYS) ?? []).map((hit) => hit.toLowerCase()))]
		const lines = row.reply.split('\n').length
		console.log(`${run} ${row.goal.slice(0, 3)} via=${row.replyVia} success=${success} chars=${row.reply.length} lines=${lines} table=${row.reply.includes('| :---')} decoys=[${decoys.join(', ')}]`)
	}
	const summary = md.split('\n')[2]
	const claimed = /Passed (\d+) of \d+; ok any (\d+)/.exec(summary)
	console.log(`${run}: recomputed passed ${passed}, ok any ${passedAny}; md says ${claimed[1]}, ${claimed[2]}; mismatches: ${mismatches.length === 0 ? 'none' : mismatches.join(' | ')}\n`)
}

// Synthetic replies: each pairs a plain form with the same content in markdown; the verdict must not change.
const cases = [
	['g04-halvorsen-ticket', 'The ticket is ESC-2219, not ESC-2291.', 'The ticket is **ESC-2219**, not **ESC-2291**.'],
	['g04-halvorsen-ticket', 'ESC-2219. ESC-2291 was replaced.', '**ESC-2219**. **ESC-2291** was replaced.'],
	['g05-luis-approval-note', 'Code MX-4486; MX-4471 is dead.', '| Code | MX-4486 |\n| Old code | **MX-4471** is dead |'],
	['g01-luis-refund-amount', 'Refund $289.00, not $245.65.', 'Refund **$289.00**, not **$245.65**.'],
	['g07-depot-release', 'Ask Tomasz today, FL-660412; he is off Friday, 2026-10-09.', 'Ask **Tomasz** today, **FL-660412**; he is off **Friday, 2026-10-09**.'],
	['g07-depot-release', 'Ask Tomasz by Friday, pro FL-660412.', 'Ask Tomasz by **Friday**, pro FL-660412.'],
	['g06-kenji-shipping', 'Tracking PW-6013-2280, arriving Oct 12.', 'Tracking PW-6013-2280, arriving **Oct** 12.'],
	['g06-kenji-shipping', 'Tracking PW-6013-2280, arriving 2026-10-12.', '| Tracking | PW-6013-2280 |\n| ETA | 2026-10-12 |'],
	['g05-luis-approval-note', 'MX-4486. The 15% restocking fee was withdrawn.', 'MX-4486.\n| Restocking fee | 15% restocking |\n| Status | withdrawn |'],
	['g10-sigrid-callback', 'Dial extension 4127 after 2 pm.', '**Dial:** ext. **4127**\n**When:** after 2 pm'],
]
for (const [goal, plain, marked] of cases) {
	const rule = rules.get(goal)
	const verdict = (text) => {
		const scored = scoreText(rule, text)
		return clean(scored) ? 'pass' : `fail(${[...scored.missing, ...scored.violations, ...scored.patterns.map((p) => `pattern#${scenario.goals.find((g) => g.id === goal).forbiddenPatterns.indexOf(p) + 1}`)].join(',')})`
	}
	console.log(`${goal.slice(0, 3)} plain=${verdict(plain)} markdown=${verdict(marked)} :: ${JSON.stringify(marked)}`)
}
