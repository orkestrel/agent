// Loader hook for derive.mjs: rewrites bench.mjs in memory so `--check-ledger` hands its Ledger internals to
// derive.mjs before the fixture suite runs; the file on disk stays unchanged.
import { readFileSync } from 'node:fs'

const TARGET = "if (flags['check-ledger']) process.exit((await checkLedger()) ? 0 : 1)"
const HANDOFF =
	'if (process.env.RECORDS_DERIVE) { await (await import(process.env.RECORDS_DERIVE)).derive({ scenario, seedMessages, createConversationManager, createLedger, readLedgerSettings, buildLedgerSystem, systemOptions, importJudgments, MICA_MODEL, LOOKUPS, LEDGER_FIT, keep }); process.exit(0) }\n'

export async function load(url, context, next) {
	if (!url.endsWith('/bench3/bench.mjs')) return next(url, context)
	const source = readFileSync(new URL(url), 'utf8')
	if (source.split(TARGET).length !== 2) throw new Error(`derive-hooks: expected one check-ledger exit line in ${url}`)
	return { format: 'module', source: source.replace(TARGET, `${HANDOFF}${TARGET}`), shortCircuit: true }
}
