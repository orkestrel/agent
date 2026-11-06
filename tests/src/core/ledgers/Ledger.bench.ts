import { expect, it } from 'vitest'
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
