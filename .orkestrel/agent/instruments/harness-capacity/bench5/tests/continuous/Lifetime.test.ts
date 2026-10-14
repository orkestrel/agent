import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isRecord } from '@orkestrel/contract'
import { Continuous } from '../../continuous/Continuous.js'
import { readContinuousManifest } from '../../continuous/helpers.js'
import { MICA_MODEL, MODELS } from '../../constants.js'
import { readRows } from '../../helpers.js'
import { startDaemon, writeTrialFiles } from './helpers.js'

for (const arm of ['records', 'full'] as const) {
	test(`cumulative ${arm} calls may exceed one request deadline while fitting the absolute goal deadline`, async () => {
		const directory = mkdtempSync(resolve('tmp/units/c1-capacity-fix-lifetime-'))
		const files = writeTrialFiles(join(directory, 'workload'))
		const daemon = await startDaemon({ factor: 1, capacity: 100000, decision: MODELS.q2, judge: MICA_MODEL, pause: 200 })
		try {
			const freeze = join(directory, 'freeze')
			await Continuous.execute(['freeze', '--key', 'q2', '--out', freeze, '--live', '--url', daemon.url, '--workload', files.workload, '--runtime', files.runtime, '--oracle', files.oracle])
			const frozen = readContinuousManifest(join(freeze, 'manifest.json')).manifest
			const manifest = join(directory, 'manifest.json')
			writeFileSync(manifest, JSON.stringify({ ...frozen, timeout: 300, limits: { ...frozen.limits, goal: 1500 } }))
			const out = join(directory, arm)
			assert.equal(await Continuous.execute(['run', '--manifest', manifest, '--arm', arm, '--out', out, '--live', '--url', daemon.url]), 0, `${arm}: individually valid calls must not inherit a cumulative request cap`)
			const row = readRows(join(out, 'rows.jsonl')).filter(isRecord).find((entry) => entry.goal === 'fx-1-2')
			assert.ok(row !== undefined && row.success === true && typeof row.wall === 'number')
			const calls = readRows(join(out, 'requests.jsonl')).filter((entry) => isRecord(entry) && entry.goal === 'fx-1-2' && entry.role === 'agent' && entry.sent === true).filter(isRecord)
			assert.ok(calls.length >= 2)
			assert.ok(calls.every((entry) => typeof entry.wall === 'number' && entry.wall < 300))
			assert.ok(row.wall > 300 && row.wall < 1500)
			console.log(JSON.stringify({ arm, calls: calls.map((entry) => entry.wall), goal: row.wall, request: 300, bound: 1500, directory }))
		} finally { await daemon.close() }
	})
}
