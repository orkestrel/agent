// Writes the g06-only scenario sets for the rule experiment, each copy rendered in one date frame by the date
// renderer and cut to g06:
//   node variants.mjs --date YYYY-MM-DD
// It writes four sets under tmp/bench/variants/g06/: `records-DATE` and `records-plain-DATE` from the ledger copies,
// `view-DATE` and `view-plain-DATE` from the full view's copies. A plain set replaces seed 6's rule sentence
// "And never promise a customer a delivery date in writing." with "And never put a delivery date, a carrier estimate
// included, in a customer reply." and changes nothing else.
// Exit: 0; 1 when a copy's seed 6 lacks the rule sentence or a rendered file differs from its source in more than
// the dated strings and the rule; 64 on usage.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

const BENCH = join(import.meta.dirname, '..', '..', '..')
const RENDER = join(BENCH, 'dated', 'render.mjs')
const GOAL = 'g06-kenji-shipping'
const PROMISE = 'And never promise a customer a delivery date in writing.'
const PLAIN = 'And never put a delivery date, a carrier estimate included, in a customer reply.'

const { values } = parseArgs({ options: { date: { type: 'string' } } })
if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date ?? '')) {
	process.stderr.write('usage: node variants.mjs --date YYYY-MM-DD\n')
	process.exit(64)
}
const date = values.date
const sets = [
	{ name: `records-${date}`, source: (n) => join(BENCH, 'variants', 'ledger', `v${n}.json`), plain: false },
	{ name: `records-plain-${date}`, source: (n) => join(BENCH, 'variants', 'ledger', `v${n}.json`), plain: true },
	{ name: `view-${date}`, source: (n) => join(BENCH, 'variants', `v${n}.json`), plain: false },
	{ name: `view-plain-${date}`, source: (n) => join(BENCH, 'variants', `v${n}.json`), plain: true },
]
let failed = false
for (const set of sets) {
	const dir = join(BENCH, 'variants', 'g06', set.name)
	mkdirSync(dir, { recursive: true })
	for (let n = 1; n <= 8; n += 1) {
		const out = join(dir, `v${n}.json`)
		execFileSync(process.execPath, [RENDER, '--date', date, '--source', set.source(n), '--out', out, '--goals', GOAL], { stdio: 'inherit' })
		if (!set.plain) continue
		const scenario = JSON.parse(readFileSync(out, 'utf8'))
		if (!scenario.seed[6].content.includes(PROMISE)) {
			process.stderr.write(`${set.name}/v${n}: seed 6 lacks the rule sentence\n`)
			failed = true
			continue
		}
		scenario.seed[6].content = scenario.seed[6].content.replace(PROMISE, PLAIN)
		writeFileSync(out, `${JSON.stringify(scenario, null, '\t')}\n`)
	}
	process.stdout.write(`${set.name}: 8 copies\n`)
}
process.exit(failed ? 1 : 0)
