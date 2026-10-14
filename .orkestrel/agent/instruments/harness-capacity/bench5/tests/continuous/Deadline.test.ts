import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isRecord } from '@orkestrel/contract'
import { Continuous } from '../../continuous/Continuous.js'
import { readContinuousManifest } from '../../continuous/helpers.js'
import { MICA_MODEL, MODELS } from '../../constants.js'
import { readJSON } from '../../helpers.js'
import { startDaemon, writeTrialFiles } from './helpers.js'

for (const name of ['goal', 'goal-summary', 'trajectory', 'series', 'metadata', 'flush', 'judge', 'agent', 'summarizer'] as const) {
	test(`deadline ${name} reaches its stalled role and returns before unrelated backup bounds`, async () => {
		const directory = mkdtempSync(resolve('tmp/units/c1-capacity-fix-deadline-'))
		const files = writeTrialFiles(join(directory, 'workload'))
		const plain = await startDaemon({ factor: 1, capacity: 100000, decision: MODELS.q2, judge: MICA_MODEL })
		const role = name === 'goal' ? 'flush' : name === 'goal-summary' ? 'summarizer' : name === 'trajectory' || name === 'series' ? 'agent' : name
		const daemon = await startDaemon({ factor: role === 'summarizer' ? 24 : 1, capacity: 100000, decision: MODELS.q2, judge: MICA_MODEL, fault: { role, response: name === 'trajectory' || name === 'agent' ? 'request' : 'body', ...(name === 'metadata' ? { path: '/api/tags' } : {}) } })
		try {
			const freeze = join(directory, 'freeze')
			await Continuous.execute(['freeze', '--key', 'q2', '--out', freeze, '--live', '--url', plain.url, '--workload', files.workload, '--runtime', files.runtime, '--oracle', files.oracle])
			const frozen = readContinuousManifest(join(freeze, 'manifest.json')).manifest
			const profile = { ...frozen, timeout: name === 'agent' || name === 'summarizer' ? 250 : 2500, limits: { ...frozen.limits, goal: name === 'goal' || name === 'goal-summary' ? 250 : 2500, wall: name === 'trajectory' ? 500 : 3500, series: name === 'series' ? 500 : 3500, metadata: name === 'metadata' || name === 'flush' || name === 'judge' ? 250 : 2500 } }
			const manifest = join(directory, 'manifest.json')
			writeFileSync(manifest, JSON.stringify(profile))
			const out = name === 'series' ? join(directory, 'series', 'q2', 'records') : join(directory, 'run')
			const code = name === 'series' ? await Continuous.execute(['series', '--manifest', manifest, '--base', join(directory, 'series'), '--arms', 'records', '--live', '--url', daemon.url]) : await Continuous.execute(['run', '--manifest', manifest, '--arm', role === 'summarizer' ? 'compaction' : 'records', '--out', out, '--live', '--url', daemon.url])
			const returned = Date.now()
			assert.equal(code, 3)
			assert.equal(daemon.stalls.length, 1, `${name}: intended stalled role must be reached exactly once`)
			const stall = daemon.stalls[0]
			assert.ok(stall !== undefined)
			assert.equal(stall.role, role)
			const elapsed = returned - stall.started
			assert.ok(elapsed >= 100 && elapsed < 1200, `${name}: return from reached stall ${elapsed}ms must precede unrelated 2500ms backup bounds`)
			const info = readJSON(join(out, 'run.json'))
			assert.ok(isRecord(info) && isRecord(info.terminal))
			assert.equal(info.status, 'limit')
			const causes = name === 'goal' || name === 'goal-summary' ? ['goal deadline'] : name === 'trajectory' ? ['trajectory deadline'] : name === 'series' ? ['series aborted'] : name === 'metadata' ? ['Error: metadata deadline'] : name === 'flush' || name === 'judge' ? [`Error: ${name} request deadline`] : [`Error: ${name} request deadline`, 'TimeoutError: The operation was aborted due to timeout', 'TimeoutError: deadline reached', 'AbortError: This operation was aborted']
			assert.ok(causes.includes(String(info.terminal.reason)), `${name}: unexpected first cause ${String(info.terminal.reason)}`)
			const sent = daemon.requests.length + daemon.metadata.length
			await new Promise((complete) => setTimeout(complete, 30))
			assert.equal(daemon.requests.length + daemon.metadata.length, sent)
			assert.equal(daemon.closed.length, sent, `${name}: stalled HTTP response must close before fixture cleanup`)
			console.log(JSON.stringify({ deadline: name, role, cause: info.terminal.reason, elapsed, bound: 1200, backup: 2500, directory }))
		} finally { await daemon.close(); await plain.close() }
	})
}
