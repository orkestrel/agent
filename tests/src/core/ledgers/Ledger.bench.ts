import { expect, it } from 'vitest'
import { runLedgerCell } from '../../../setupServer.js'

// Each case runs one cell, chosen with `-t` by its title and read from the file `LEDGER_BENCH_CELL`
// names; with no file named, it times three samples seeded in memory. The timeouts sit under the
// slot runner's process caps from rc-a3's readings: a correction-1600 cell seeds in about 183 s of
// CPU and takes about 125 s per sample before the fix, so its 1 warmup and 3 samples fit 870 s under
// the 900 s cap; every other cell, at most 18 s of seeding and 15 s per sample, fits 570 s under 600 s.

it('selects at correction 800', async ({ bench }) => {
	expect((await runLedgerCell(bench, 'correction', 800)).digests.length).toBeLessThanOrEqual(1)
}, 570_000)

it('selects at correction 1600', async ({ bench }) => {
	expect((await runLedgerCell(bench, 'correction', 1600)).digests.length).toBeLessThanOrEqual(1)
}, 870_000)

it('selects at control 800', async ({ bench }) => {
	expect((await runLedgerCell(bench, 'control', 800)).digests.length).toBeLessThanOrEqual(1)
}, 570_000)

it('selects at control 1600', async ({ bench }) => {
	expect((await runLedgerCell(bench, 'control', 1600)).digests.length).toBeLessThanOrEqual(1)
}, 570_000)
