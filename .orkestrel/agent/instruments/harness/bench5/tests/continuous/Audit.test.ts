import type { ContinuousReport } from '../../continuous/audit/types.js'
import type { Daemon, TrialFiles } from './helpers.js'
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MICA_MODEL, MODELS } from '../../constants.js'
import { Audit } from '../../continuous/audit/Audit.js'
import { Continuous } from '../../continuous/Continuous.js'
import { isContinuousKeys } from '../../continuous/validators.js'
import { readJSON, readRows } from '../../helpers.js'
import { hashFile } from '../../refit/helpers.js'
import { isSustainedLabels } from '../../sustained/audit/validators.js'
import { SHIFTS, buildTrialLabel, startDaemon, writeTrialFiles } from './helpers.js'

const directory = mkdtempSync(join(tmpdir(), 'bench5-continuous-audit-'))
const GOALS = SHIFTS * 4

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isReport(value: unknown): value is ContinuousReport {
	return isRecord(value) && value.protocol === 'c1' && typeof value.verdict === 'string'
}

describe('continuous audit', () => {
	let files: TrialFiles
	let plain: Daemon
	let inflated: Daemon
	let narrow: Daemon
	let manifest = ''
	const runs: Record<string, string> = {}

	before(async () => {
		files = writeTrialFiles(join(directory, 'workload'))
		const models = { decision: MODELS.q2, judge: MICA_MODEL }
		plain = await startDaemon({ factor: 1, capacity: 100000, ...models })
		inflated = await startDaemon({ factor: 24, capacity: 100000, ...models })
		narrow = await startDaemon({ factor: 1, capacity: 2200, ...models })
		const out = join(directory, 'freeze')
		assert.equal(
			await Continuous.execute(['freeze', '--key', 'q2', '--out', out, '--live', '--url', plain.url, '--workload', files.workload, '--runtime', files.runtime, '--oracle', files.oracle]),
			0,
		)
		manifest = join(out, 'manifest.json')
		for (const [arm, daemon] of [
			['records', plain],
			['compaction', inflated],
			['full', narrow],
		] as const) {
			runs[arm] = join(directory, arm)
			await Continuous.execute(['run', '--manifest', manifest, '--arm', arm, '--out', runs[arm], '--live', '--url', daemon.url])
		}
	})

	after(async () => {
		await Promise.all([plain.close(), inflated.close(), narrow.close()])
		rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
	})

	it('blinds every served product once, with each control once, and refuses a shared output directory', async () => {
		const packet = join(directory, 'public', 'packet.json')
		const keys = join(directory, 'private', 'keys.json')
		const args = ['blind', '--manifest', manifest, '--run', runs.records ?? '', '--run', runs.compaction ?? '', '--run', runs.full ?? '', '--oracle', files.oracle, '--out', packet, '--keys', keys]
		assert.equal(await Continuous.execute(args), 0)
		const built = readJSON(packet)
		assert.ok(isRecord(built))
		const items = built.items
		assert.ok(Array.isArray(items))
		const mapping = readJSON(keys)
		assert.ok(isContinuousKeys(mapping))
		const fullRows = readRows(join(runs.full ?? '', 'rows.jsonl')).filter(
			(row) => isRecord(row) && row.reply !== '',
		).length
		assert.ok(fullRows > 0 && fullRows < GOALS)
		assert.equal(mapping.keys.filter((key) => key.control === undefined).length, GOALS + GOALS + fullRows)
		assert.equal(mapping.keys.filter((key) => key.control !== undefined).length, 3)
		assert.equal(items.length, mapping.keys.length)
		assert.ok(items.every((item: unknown) => isRecord(item) && !('arm' in item) && !('run' in item)))
		assert.deepEqual([...new Set(mapping.keys.map((key) => key.arm))].sort(), ['compaction', 'full', 'records'])
		await assert.rejects(Continuous.execute(args), /create-only/)
		await assert.rejects(
			Continuous.execute(['blind', '--manifest', manifest, '--run', runs.records ?? '', '--oracle', files.oracle, '--out', join(directory, 'same', 'packet.json'), '--keys', join(directory, 'same', 'keys.json')]),
			/must differ/,
		)
		const foreign = join(directory, 'foreign-oracle.json')
		writeFileSync(foreign, readFileSync(files.oracle, 'utf8').replace('Send the shipping reminder.', 'Send the reminder.'))
		await assert.rejects(
			Continuous.execute(['blind', '--manifest', manifest, '--run', runs.records ?? '', '--oracle', foreign, '--out', join(directory, 'public2', 'packet.json'), '--keys', join(directory, 'private2', 'keys.json')]),
			/oracle bytes differ/,
		)
	})

	it('reports every arm against records from complete labels and refuses altered custody', async () => {
		const packet = join(directory, 'public', 'packet.json')
		const keys = join(directory, 'private', 'keys.json')
		const built = readJSON(packet)
		const mapping = readJSON(keys)
		assert.ok(isRecord(built))
		const items = built.items
		assert.ok(Array.isArray(items) && isContinuousKeys(mapping))
		const labels = {
			authority: 'root-adjudicated',
			packet: hashFile(packet).hash,
			keys: hashFile(keys).hash,
			labels: mapping.keys.map((key) => {
				const item = items.find((entry: unknown) => isRecord(entry) && entry.id === key.id)
				if (!isRecord(item)) throw new Error('fixture item missing')
				return buildTrialLabel(JSON.parse(JSON.stringify(item)), key)
			}),
		}
		assert.ok(isSustainedLabels(labels))
		const labelsPath = join(directory, 'labels.json')
		writeFileSync(labelsPath, JSON.stringify(labels))
		assert.equal(await Continuous.execute(['labels', '--packet', packet, '--labels', labelsPath]), 0)
		const partial = join(directory, 'partial-labels.json')
		const [first, second] = labels.labels
		assert.ok(first !== undefined && second !== undefined)
		writeFileSync(
			partial,
			JSON.stringify({
				...labels,
				labels: [first, { ...second, atoms: second.atoms.map((atom) => ({ ...atom, evidence: ['product|not in the product'] })) }],
			}),
		)
		assert.equal(await Continuous.execute(['labels', '--packet', packet, '--labels', partial]), 3)
		const checked = new Audit().labels(packet, partial)
		assert.deepEqual(checked.refused.map((entry) => entry.id), [second.id])
		assert.ok(checked.refused[0]?.failures.some((failure) => failure.includes('unbound or empty evidence citation')))
		assert.equal(checked.unlabeled.length, labels.labels.length - 2)
		const out = join(directory, 'report.json')
		assert.equal(
			await Continuous.execute(['report', '--manifest', manifest, '--run', runs.records ?? '', '--run', runs.compaction ?? '', '--run', runs.full ?? '', '--oracle', files.oracle, '--packet', packet, '--keys', keys, '--labels', labelsPath, '--out', out]),
			0,
		)
		const report = readJSON(out)
		assert.ok(isReport(report))
		assert.equal(report.valid, true)
		assert.deepEqual(report.batches.map((batch) => batch.valid), [true])
		assert.equal(report.status.records, 'complete')
		assert.equal(report.status.compaction, 'complete')
		assert.equal(report.status.full, 'overflow')
		assert.equal(report.served.records, GOALS)
		assert.equal(report.common, 0)
		assert.equal(report.intervals.length, 1)
		assert.equal(report.overall.arms.length, 3)
		const records = report.overall.arms.find((arm) => arm.arm === 'records')
		const compaction = report.overall.arms.find((arm) => arm.arm === 'compaction')
		const full = report.overall.arms.find((arm) => arm.arm === 'full')
		assert.ok(records && compaction && full)
		assert.equal(records.judged, GOALS)
		assert.equal(records.acceptable.low, GOALS)
		assert.equal(compaction.acceptable.low, GOALS)
		assert.ok(compaction.folded > 0)
		assert.equal(full.acceptable.high, 0)
		assert.ok(full.judged > 0 && full.judged < GOALS)
		const pair = report.overall.pairs.find((entry) => entry.arm === 'compaction')
		assert.ok(pair && pair.goals === GOALS && pair.ties === GOALS && pair.gain.low === 0)
		const fullPair = report.overall.pairs.find((entry) => entry.arm === 'full')
		assert.ok(fullPair && fullPair.losses === fullPair.goals && fullPair.gain.high < 0)
		assert.equal(report.verdict, 'records')
		assert.ok(report.costs.some((cost) => cost.arm === 'records' && cost.judge.requests > 0))
		assert.ok(report.costs.some((cost) => cost.arm === 'compaction' && cost.summarizer.requests > 0))
		const ambiguous = mapping.keys.find((key) => key.control?.verdict === 'ambiguous')
		assert.ok(ambiguous !== undefined)
		const leaking = join(directory, 'leaking-labels.json')
		writeFileSync(
			leaking,
			JSON.stringify({
				...labels,
				labels: labels.labels.map((label) =>
					label.id === first.id
						? { ...label, leaks: ['product|Done'] }
						: label.id === ambiguous.id
							? { ...label, atoms: label.atoms.map((atom) => ({ ...atom, verdict: 'pass' })), ambiguous: [] }
							: label,
				),
			}),
		)
		const leakingOut = join(directory, 'report-leaking.json')
		assert.equal(
			await Continuous.execute(['report', '--manifest', manifest, '--run', runs.records ?? '', '--run', runs.compaction ?? '', '--run', runs.full ?? '', '--oracle', files.oracle, '--packet', packet, '--keys', keys, '--labels', leaking, '--out', leakingOut]),
			0,
		)
		const tolerated = readJSON(leakingOut)
		assert.ok(isReport(tolerated))
		assert.equal(tolerated.valid, true)
		assert.deepEqual(tolerated.batches.map((batch) => batch.valid), [false])
		assert.deepEqual(tolerated.audit.leaks, { [mapping.keys.find((key) => key.id === first.id)?.arm ?? '']: 1 })
		assert.deepEqual(tolerated.audit.foreign, [])
		assert.ok(tolerated.audit.controls.some((control) => control.startsWith('missed ambiguous control ')))
		assert.equal(tolerated.verdict, 'records')
		const foreign = join(directory, 'foreign-labels.json')
		writeFileSync(
			foreign,
			JSON.stringify({
				...labels,
				labels: labels.labels.map((label) =>
					label.id === first.id ? { ...label, leaks: ['source:fx-opening|Opening note'] } : label,
				),
			}),
		)
		const foreignOut = join(directory, 'report-foreign.json')
		assert.equal(
			await Continuous.execute(['report', '--manifest', manifest, '--run', runs.records ?? '', '--run', runs.compaction ?? '', '--run', runs.full ?? '', '--oracle', files.oracle, '--packet', packet, '--keys', keys, '--labels', foreign, '--out', foreignOut]),
			0,
		)
		const voided = readJSON(foreignOut)
		assert.ok(isReport(voided))
		assert.equal(voided.valid, false)
		assert.ok(voided.failures.some((failure) => failure.startsWith('foreign identity leak ')))
		assert.equal(voided.verdict, 'inconclusive')
		const tampered = join(directory, 'tampered-labels.json')
		writeFileSync(tampered, JSON.stringify({ ...labels, labels: labels.labels.slice(1) }))
		await assert.rejects(
			Continuous.execute(['report', '--manifest', manifest, '--run', runs.records ?? '', '--run', runs.compaction ?? '', '--run', runs.full ?? '', '--oracle', files.oracle, '--packet', packet, '--keys', keys, '--labels', tampered, '--out', join(directory, 'report2.json')]),
			/missing, duplicate, or unknown/,
		)
		await assert.rejects(
			Continuous.execute(['report', '--manifest', manifest, '--run', runs.records ?? '', '--run', runs.compaction ?? '', '--oracle', files.oracle, '--packet', packet, '--keys', keys, '--labels', labelsPath, '--out', join(directory, 'report3.json')]),
			/differ from the actual run products/,
		)
	})
})
