// Writes a records-against-full-view plan for one agent model under the measured thinking-off arguments, both arms
// interleaved per copy, so a series stopped early still holds whole copies:
//   node plan.mjs --model TAG --prefix NAME --copies FIRST-LAST --out PLAN.json [--estimate RECORDS,CONTROL]
// The records arm repeats the a5-records and f4-records arguments (ledger copies, a 3,072-token window, the
// default budget share 0.7, the Mica judge and its recorded categories); the full view repeats a1-control and
// f4-control (a 6,144-token window, word search). Only `--model` differs from the measured Qwen runs.
// Exit: 0; 64 on usage.
import { writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { parseArgs } from 'node:util'

const ROOT = dirname(import.meta.dirname)
const BENCH = `${ROOT}/bench`
const { values } = parseArgs({ options: { model: { type: 'string' }, prefix: { type: 'string' }, copies: { type: 'string' }, out: { type: 'string' }, estimate: { type: 'string' } } })
const copies = /^(\d)-(\d)$/.exec(values.copies ?? '')
const estimate = (values.estimate ?? '900,600').split(',').map(Number)
if (values.model === undefined || !/^[a-z0-9]+$/.test(values.prefix ?? '') || copies === null || values.out === undefined || estimate.length !== 2 || estimate.some((one) => !(one > 0))) {
	process.stderr.write('usage: node plan.mjs --model TAG --prefix NAME --copies FIRST-LAST --out PLAN.json [--estimate RECORDS,CONTROL]\n')
	process.exit(64)
}
const plan = []
for (let copy = Number(copies[1]); copy <= Number(copies[2]); copy += 1) {
	plan.push({
		name: `${values.prefix}-records-v${copy}`,
		harness: 'bench3',
		estimate: estimate[0],
		args: [
			'--mode', 'ledger', '--profile', 'refined', '--scenario', `${BENCH}/variants/ledger/v${copy}.json`,
			'--ctx', '3072', '--judge', 'mica', '--judge-ctx', '4096', '--tail', '0.35',
			'--judgments', `${ROOT}/data/cal-categories.jsonl`, '--reply', 'terminal', '--records', 'on', '--model', values.model,
		],
	})
	plan.push({
		name: `${values.prefix}-control-v${copy}`,
		harness: 'bench',
		estimate: estimate[1],
		args: ['--mode', 'none', '--ctx', '6144', '--search', 'words', '--reply', 'terminal', '--scenario', `${BENCH}/variants/v${copy}.json`, '--model', values.model],
	})
}
writeFileSync(values.out, `${JSON.stringify(plan, null, '\t')}\n`)
process.stdout.write(`${plan.length} runs written to ${values.out}\n`)
