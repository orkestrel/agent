import type { Daemon, TrialFiles } from './helpers.js'
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MICA_MODEL, MODELS } from '../../constants.js'
import { Continuous } from '../../continuous/Continuous.js'
import { COMPACTION_SYSTEM } from '../../continuous/constants.js'
import { readContinuousManifest, readContinuousRun } from '../../continuous/helpers.js'
import { readRows } from '../../helpers.js'
import { hashFile } from '../../refit/helpers.js'
import { SHIFTS, startDaemon, writeTrialFiles } from './helpers.js'

const directory = mkdtempSync(join(tmpdir(), 'bench5-continuous-'))
const GOALS = SHIFTS * 4

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readSystem(body: unknown): string {
	if (!isRecord(body) || !Array.isArray(body.messages)) return ''
	const first: unknown = body.messages[0]
	return isRecord(first) && first.role === 'system' && typeof first.content === 'string'
		? first.content
		: ''
}

describe('continuous', () => {
	let files: TrialFiles
	let plain: Daemon
	let inflated: Daemon
	let narrow: Daemon
	let manifest = ''

	before(async () => {
		files = writeTrialFiles(join(directory, 'workload'))
		const models = { decision: MODELS.q2, judge: MICA_MODEL }
		plain = await startDaemon({ factor: 1, capacity: 100000, ...models })
		inflated = await startDaemon({ factor: 24, capacity: 100000, ...models })
		narrow = await startDaemon({ factor: 1, capacity: 2200, ...models })
		const out = join(directory, 'freeze')
		assert.equal(
			await Continuous.execute([
				'freeze',
				'--key',
				'q2',
				'--out',
				out,
				'--live',
				'--url',
				plain.url,
				'--workload',
				files.workload,
				'--runtime',
				files.runtime,
				'--oracle',
				files.oracle,
			]),
			0,
		)
		manifest = join(out, 'manifest.json')
	})

	after(async () => {
		await Promise.all([plain.close(), inflated.close(), narrow.close()])
		rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
	})

	it('freezes a manifest bound to the workload and refuses changed custody', () => {
		const { manifest: frozen, runtime } = readContinuousManifest(manifest)
		assert.equal(frozen.key, 'q2')
		assert.equal(frozen.think, false)
		assert.equal(frozen.limits.goals, GOALS)
		assert.equal(runtime.goals.length, GOALS)
		assert.deepEqual(frozen.arms, ['records', 'compaction', 'full'])
		assert.equal(frozen.failure, 'stop')
		assert.equal(frozen.budget.window, 3072)
		const altered = join(directory, 'altered-manifest.json')
		writeFileSync(
			altered,
			JSON.stringify({ ...frozen, runtime: { ...frozen.runtime, hash: '0'.repeat(64) } }),
		)
		assert.throws(() => readContinuousManifest(altered), /custody mismatch/)
		const unpinned = join(directory, 'unpinned-manifest.json')
		const foreign = join(directory, 'foreign.json')
		writeFileSync(foreign, '{"foreign":true}\n')
		writeFileSync(unpinned, JSON.stringify({ ...frozen, oracle: hashFile(foreign) }))
		assert.throws(() => readContinuousManifest(unpinned), /does not pin/)
	})

	it('freezes a thinking manifest at a higher rung of the reserve ladder', async () => {
		const out = join(directory, 'freeze-thinking')
		assert.equal(
			await Continuous.execute([
				'freeze',
				'--key',
				'q2',
				'--out',
				out,
				'--live',
				'--url',
				plain.url,
				'--think',
				'true',
				'--reserve',
				'1024',
				'--workload',
				files.workload,
				'--runtime',
				files.runtime,
				'--oracle',
				files.oracle,
			]),
			0,
		)
		const { manifest: frozen } = readContinuousManifest(join(out, 'manifest.json'))
		assert.equal(frozen.think, true)
		assert.deepEqual(frozen.budget, { reserve: 1024, window: 3584, ceiling: 3584, predict: 512 })
		await assert.rejects(
			Continuous.execute([
				'freeze',
				'--key',
				'q2',
				'--out',
				join(directory, 'freeze-off-ladder'),
				'--live',
				'--url',
				plain.url,
				'--reserve',
				'700',
				'--workload',
				files.workload,
				'--runtime',
				files.runtime,
				'--oracle',
				files.oracle,
			]),
			/fixed ladder/,
		)
	})

	it('serves the records arm with live filing and retained receipts', async () => {
		const out = join(directory, 'records')
		const from = plain.requests.length
		assert.equal(
			await Continuous.execute(['run', '--manifest', manifest, '--arm', 'records', '--out', out, '--live', '--url', plain.url]),
			0,
		)
		const run = readContinuousRun(out)
		assert.equal(run.status, 'complete')
		assert.deepEqual(run.failures, [])
		assert.equal(run.rows.length, GOALS)
		assert.ok(run.rows.every((row) => row.success && row.reply !== '' && !row.partial))
		assert.ok(run.requests.some((request) => request.role === 'judge' && request.sent))
		assert.ok(run.requests.some((request) => request.role === 'flush' && request.sent))
		assert.equal(run.requests.filter((request) => request.goal === undefined && request.role === 'agent').length, 2)
		assert.ok(run.receipts.length > 0)
		assert.ok(run.receipts.every((receipt) => receipt.success && receipt.tool === 'lookup_order'))
		assert.ok(run.receipts.some((receipt) => receipt.version !== undefined))
		assert.ok(run.observations.every((observation) => observation.selected.length > 0))
		assert.ok(run.observations.at(-1)?.products.length === GOALS - 1)
		assert.ok(run.observations.every((observation) => observation.folded.length === 0))
		assert.ok(run.gauge !== undefined && run.gauge.scale > 0)
		assert.ok(run.messages.filter((message) => message.request).length === GOALS)
		assert.ok(run.costs.wire.some((cost) => cost.role === 'judge' && cost.phase === 'trajectory'))
		assert.ok(plain.requests.slice(from).some((body) => isRecord(body) && typeof body.prompt === 'string'))
		await assert.rejects(
			Continuous.execute(['run', '--manifest', manifest, '--arm', 'records', '--out', out, '--live', '--url', plain.url]),
			/already exists/,
		)
		const tampered = join(out, 'rows.jsonl')
		const rows = readRows(tampered)
		const first = rows[0]
		assert.ok(isRecord(first))
		writeFileSync(
			tampered,
			[{ ...first, reply: 'another product' }, ...rows.slice(1)].map((row) => JSON.stringify(row)).join('\n') + '\n',
		)
		assert.ok(readContinuousRun(out).failures.some((failure) => failure.includes('response differs')))
	})

	it('folds the compaction arm through the package summarizer when the prompt reaches the window', async () => {
		const out = join(directory, 'compaction')
		const from = inflated.requests.length
		assert.equal(
			await Continuous.execute(['run', '--manifest', manifest, '--arm', 'compaction', '--out', out, '--live', '--url', inflated.url]),
			0,
		)
		const run = readContinuousRun(out)
		assert.equal(run.status, 'complete')
		assert.deepEqual(run.failures, [])
		assert.equal(run.rows.length, GOALS)
		assert.ok(run.sections.length > 0)
		assert.ok(run.sections.some((section) => section.event === 'compact'))
		assert.ok(run.rows.some((row) => row.folds > 0))
		assert.ok(run.rows.at(-1)?.sections !== undefined && (run.rows.at(-1)?.sections ?? 0) <= run.manifest.compaction.sections + 1)
		assert.ok(run.requests.some((request) => request.role === 'summarizer' && request.sent))
		assert.ok(inflated.requests.slice(from).some((body) => readSystem(body).startsWith(COMPACTION_SYSTEM)))
		assert.ok(run.requests.every((request) => request.role !== 'judge'))
		assert.ok(run.observations.some((observation) => observation.folded.length > 0))
		assert.ok(run.messages.some((message) => isRecord(message) && typeof message.section === 'string'))
		assert.ok(run.rows.some((row) => row.recap > 0))
	})

	it('ends the full arm at the context-length refusal and retains the prefix', async () => {
		const out = join(directory, 'full')
		assert.equal(
			await Continuous.execute(['run', '--manifest', manifest, '--arm', 'full', '--out', out, '--live', '--url', narrow.url]),
			3,
		)
		const run = readContinuousRun(out)
		assert.equal(run.status, 'overflow')
		assert.deepEqual(run.failures, [])
		assert.ok(run.rows.length > 0 && run.rows.length < GOALS)
		const last = run.rows.at(-1)
		assert.ok(last !== undefined && last.overflow && last.reply === '' && !last.success)
		assert.ok(run.rows.slice(0, -1).every((row) => row.success))
		assert.ok(run.requests.some((request) => request.status === 400 && request.failures.includes('transport')))
		assert.equal(run.sections.length, 0)
		assert.ok(run.requests.every((request) => request.role !== 'judge' && request.role !== 'summarizer'))
	})

	it('ends at a goal with no product under stop, and records it then serves the rest under continue', async () => {
		const silent = await startDaemon({
			factor: 1,
			capacity: 100000,
			decision: MODELS.q2,
			judge: MICA_MODEL,
			silent: 'Shift 2 product 3',
		})
		try {
			const stopped = join(directory, 'silent-stop')
			assert.equal(
				await Continuous.execute(['run', '--manifest', manifest, '--arm', 'full', '--out', stopped, '--live', '--url', silent.url]),
				3,
			)
			const ended = readContinuousRun(stopped)
			assert.equal(ended.status, 'failed')
			assert.deepEqual(ended.failures, [])
			assert.equal(ended.rows.length, 7)
			const last = ended.rows.at(-1)
			assert.ok(last !== undefined && last.goal === 'fx-2-3' && last.reply === '' && !last.success && !last.overflow)
			assert.ok(ended.rows.slice(0, -1).every((row) => row.success))
			const frozen = join(directory, 'freeze-continue')
			assert.equal(
				await Continuous.execute([
					'freeze',
					'--key',
					'q2',
					'--out',
					frozen,
					'--live',
					'--url',
					silent.url,
					'--workload',
					files.workload,
					'--runtime',
					files.runtime,
					'--oracle',
					files.oracle,
					'--failure',
					'continue',
				]),
				0,
			)
			const continuing = join(frozen, 'manifest.json')
			assert.equal(readContinuousManifest(continuing).manifest.failure, 'continue')
			const continued = join(directory, 'silent-continue')
			assert.equal(
				await Continuous.execute(['run', '--manifest', continuing, '--arm', 'full', '--out', continued, '--live', '--url', silent.url]),
				3,
			)
			const run = readContinuousRun(continued)
			assert.equal(run.status, 'complete')
			assert.deepEqual(run.failures, [])
			assert.equal(run.rows.length, GOALS)
			assert.deepEqual(run.rows.filter((row) => !row.success).map((row) => row.goal), ['fx-2-3'])
			assert.ok(run.rows.find((row) => row.goal === 'fx-2-3')?.reply === '')
			assert.ok(run.observations.some((observation) => observation.goal === 'fx-2-3' && !observation.complete))
			assert.ok(run.observations.filter((observation) => observation.complete).length === GOALS - 1)
			await assert.rejects(
				Continuous.execute([
					'freeze',
					'--key',
					'q2',
					'--out',
					join(directory, 'freeze-retry'),
					'--live',
					'--url',
					silent.url,
					'--workload',
					files.workload,
					'--runtime',
					files.runtime,
					'--oracle',
					files.oracle,
					'--failure',
					'retry',
				]),
				/--failure must be/,
			)
		} finally {
			await silent.close()
		}
	})

	it('refuses a daemon whose model digest or version differs from the freeze', async () => {
		const foreign = await startDaemon({ factor: 1, capacity: 100000, decision: MODELS.q2, judge: MICA_MODEL })
		try {
			const { manifest: frozen } = readContinuousManifest(manifest)
			const altered = join(directory, 'digest-manifest.json')
			writeFileSync(altered, JSON.stringify({ ...frozen, decision: { ...frozen.decision, digest: `sha256:${'9'.repeat(64)}` } }))
			await assert.rejects(
				Continuous.execute(['run', '--manifest', altered, '--arm', 'full', '--out', join(directory, 'digest'), '--live', '--url', foreign.url]),
				/digest changed/,
			)
			const version = join(directory, 'version-manifest.json')
			writeFileSync(version, JSON.stringify({ ...frozen, daemon: { ...frozen.daemon, version: 'other' } }))
			await assert.rejects(
				Continuous.execute(['run', '--manifest', version, '--arm', 'full', '--out', join(directory, 'version'), '--live', '--url', foreign.url]),
				/version differs/,
			)
		} finally {
			await foreign.close()
		}
	})

	it('runs a series that skips terminal runs and refuses a non-terminal directory', async () => {
		const base = join(directory, 'series')
		assert.equal(
			await Continuous.execute(['series', '--manifest', manifest, '--base', base, '--live', '--url', plain.url, '--arms', 'records,full']),
			0,
		)
		const journal = readRows(join(base, 'series.jsonl'))
		assert.equal(journal.length, 2)
		assert.ok(journal.every((entry) => isRecord(entry) && entry.status === 'complete'))
		assert.equal(
			await Continuous.execute(['series', '--manifest', manifest, '--base', base, '--live', '--url', plain.url, '--arms', 'records,full']),
			0,
		)
		assert.ok(readRows(join(base, 'series.jsonl')).every((entry) => isRecord(entry) && entry.status === 'skipped'))
		const partial = join(base, 'q2', 'compaction')
		writeFileSync(join(base, 'q2', 'placeholder.txt'), '')
		assert.ok(!existsSync(partial))
		writeFileSync(join(base, 'q2', 'compaction'), 'not a run')
		await assert.rejects(
			Continuous.execute(['series', '--manifest', manifest, '--base', base, '--live', '--url', plain.url, '--arms', 'compaction']),
			/terminal status/,
		)
	})
})
