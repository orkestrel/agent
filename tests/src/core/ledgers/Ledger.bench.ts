import {
	createLedger,
	LEDGER_EXCHANGE_LIMIT,
	LEDGER_KEY_LIMIT,
	LEDGER_PREVIOUS_KEY,
} from '@src/core'
import { expect, it } from 'vitest'
import {
	buildLedgerGoals,
	buildLedgerOptions,
	createScriptedProvider,
	readLedgerOpening,
} from '../../../setup.js'
import { runLedgerCell } from '../../../setupServer.js'

// Each case runs one cell, chosen with `-t` by its title and read from the file `LEDGER_BENCH_CELL`
// names; with no file named, it times three samples seeded in memory. Each timeout leaves the
// slot runner's 900 s process cap room to report a failure on a heavy text shape.

it('selects at correction 400', async ({ bench }) => {
	expect((await runLedgerCell(bench, 'correction', 400)).digests.length).toBeLessThanOrEqual(1)
}, 570_000)

it('selects at correction 800', async ({ bench }) => {
	expect((await runLedgerCell(bench, 'correction', 800)).digests.length).toBeLessThanOrEqual(1)
}, 570_000)

it('selects at correction 1600', async ({ bench }) => {
	expect((await runLedgerCell(bench, 'correction', 1600)).digests.length).toBeLessThanOrEqual(1)
}, 870_000)

it('selects at control 400', async ({ bench }) => {
	expect((await runLedgerCell(bench, 'control', 400)).digests.length).toBeLessThanOrEqual(1)
}, 570_000)

it('selects at control 800', async ({ bench }) => {
	expect((await runLedgerCell(bench, 'control', 800)).digests.length).toBeLessThanOrEqual(1)
}, 570_000)

it('selects at control 1600', async ({ bench }) => {
	expect((await runLedgerCell(bench, 'control', 1600)).digests.length).toBeLessThanOrEqual(1)
}, 570_000)

it('selects uniform at correction 290', async ({ bench }) => {
	const record = await runLedgerCell(bench, 'correction', 290, process.env, 'uniform')
	expect(record.digests).toHaveLength(1)
}, 570_000)

it('selects real at correction 290', async ({ bench }) => {
	const record = await runLedgerCell(bench, 'correction', 290, process.env, 'real')
	expect(record.digests).toHaveLength(1)
}, 570_000)

it('selects paste at correction 290', async ({ bench }) => {
	const record = await runLedgerCell(bench, 'correction', 290, process.env, 'paste')
	expect(record.digests).toHaveLength(1)
}, 570_000)

it('selects uniform at control 290', async ({ bench }) => {
	const record = await runLedgerCell(bench, 'control', 290, process.env, 'uniform')
	expect(record.digests).toHaveLength(1)
}, 570_000)

it('selects real at control 290', async ({ bench }) => {
	const record = await runLedgerCell(bench, 'control', 290, process.env, 'real')
	expect(record.digests).toHaveLength(1)
}, 570_000)

it('selects paste at control 290', async ({ bench }) => {
	const record = await runLedgerCell(bench, 'control', 290, process.env, 'paste')
	expect(record.digests).toHaveLength(1)
}, 570_000)

it('recalls real at correction 400', async ({ bench }) => {
	const record = await runLedgerCell(bench, 'correction', 400, process.env, 'real', 'recall')
	expect(record.digests).toHaveLength(1)
}, 570_000)

it('recalls real at control 400', async ({ bench }) => {
	const record = await runLedgerCell(bench, 'control', 400, process.env, 'real', 'recall')
	expect(record.digests).toHaveLength(1)
}, 570_000)

// The lean opening's plan over a long history: each sample hydrates 1,600 earlier messages of
// unrelated goals and plans one request, whose index lists the exchange rows, `previous` last, and at
// most the key limit of ids.
it('plans at 1600 earlier messages of unrelated goals', async ({ bench }) => {
	const snapshot = buildLedgerGoals(1600)
	const keys: Array<readonly string[]> = []
	await bench('goals 1600', {}, async () => {
		const provider = createScriptedProvider([{ content: 'Done.' }], { recorded: true })
		const ledger = createLedger(
			provider,
			buildLedgerOptions({ snapshot, topics: [], gauge: { scale: 1, overhead: 0 } }),
		)
		await ledger.respond('What do we do for GL-399?')
		keys.push(readLedgerOpening(provider.calls[0]?.messages ?? []).keys)
	}).run({ time: 0, iterations: 3, warmup: false, throws: true })
	expect(keys).toHaveLength(3)
	for (const listed of keys) {
		expect(listed[LEDGER_EXCHANGE_LIMIT - 1]).toBe(LEDGER_PREVIOUS_KEY)
		expect(listed.length).toBeLessThanOrEqual(LEDGER_EXCHANGE_LIMIT + LEDGER_KEY_LIMIT)
	}
}, 570_000)
