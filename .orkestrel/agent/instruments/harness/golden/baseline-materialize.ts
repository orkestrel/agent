// Materializes the unedited ee734c3 ledger suites under tmp/probes/baseline with only their relative imports
// rewritten for the new depth, so the probe project runs them against the final source as the campaign's
// second measurement control. Usage: node tmp/units/baseline-materialize.ts
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const names = ['Ledger', 'Classifier', 'Gauge', 'factories', 'helpers', 'validators']
const out = join('tmp', 'probes', 'baseline')
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
for (const name of names) {
	const source = execFileSync('git', ['show', `ee734c3:tests/src/core/ledgers/${name}.test.ts`], {
		encoding: 'utf8',
	})
	// tests/src/core/ledgers sits four levels under the root; tmp/probes/baseline sits three.
	const rewritten = source
		.replaceAll("'../../../setup.js'", "'../../../tests/setup.js'")
		.replaceAll("'../../../../src/", "'../../../src/")
	const changed = source.split('\n').filter((line, index) => rewritten.split('\n')[index] !== line)
	writeFileSync(join(out, `${name}.test.ts`), rewritten)
	console.log(`${name}.test.ts: ${changed.length} import line(s) rewritten`)
}
