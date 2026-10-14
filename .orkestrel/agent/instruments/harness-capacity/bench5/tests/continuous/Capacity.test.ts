import type { CapacityFault } from './types.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { isRecord } from '@orkestrel/contract'
import { Continuous } from '../../continuous/Continuous.js'
import { readContinuousManifest, computeWindowUnits, matchesOverflow } from '../../continuous/helpers.js'
import { isContinuousBudget, isContinuousManifest } from '../../continuous/validators.js'
import { MICA_MODEL, MODELS } from '../../constants.js'
import { readJSON, readRows } from '../../helpers.js'
import { hashFile } from '../../refit/helpers.js'
import { startDaemon, writeTrialFiles } from './helpers.js'

test('capacity budgets reject mismatch, missing version/policy, and nonpositive compaction room', async () => {
	assert.equal(isContinuousBudget({ window: 12288, ceiling: 12288, reserve: 4096, predict: 4096, safety: 512 }), true)
	for (const budget of [{ window: 4096, ceiling: 4096, reserve: 4096, predict: 4096, safety: 0 }, { window: 12288, ceiling: 12288, reserve: 4096, predict: 512, safety: 512 }, { window: 12288, ceiling: 9000, reserve: 4096, predict: 4096, safety: 512 }, { window: 12288.1, ceiling: 12288.1, reserve: 4096, predict: 4096, safety: 512 }]) assert.equal(isContinuousBudget(budget), false)
	assert.equal(computeWindowUnits({ window: 12288, ceiling: 12288, reserve: 4096, predict: 4096, safety: 512 }, { scale: 2, overhead: 256 }), 3501)
	assert.throws(() => computeWindowUnits({ window: 12288, ceiling: 12288, reserve: 4096, predict: 4096, safety: 512 }, { scale: 2, overhead: 12000 }), /nonpositive/)
	assert.equal(matchesOverflow(JSON.stringify({ error: 'out of memory: cannot allocate buffer' })), false)
	assert.equal(matchesOverflow(JSON.stringify({ error: JSON.stringify({ error: { type: 'exceed_context_size_error', n_prompt_tokens: 3630, n_ctx: 3584 } }) })), true)
})

test('terminal wire faults abort before any subsequent actual HTTP request across both main arms and full', async () => {
	mkdirSync(resolve('tmp'), { recursive: true })
	const directory = mkdtempSync(resolve('tmp/c1-capacity-proof-'))
	const files = writeTrialFiles(join(directory, 'workload'))
	const plain = await startDaemon({ factor: 1, capacity: 100000, decision: MODELS.q2, judge: MICA_MODEL })
	try {
		const freeze = join(directory, 'freeze')
		assert.equal(await Continuous.execute(['freeze', '--key', 'q2', '--out', freeze, '--live', '--url', plain.url, '--workload', files.workload, '--runtime', files.runtime, '--oracle', files.oracle, '--failure', 'continue']), 0)
		const path = join(freeze, 'manifest.json')
		const frozen = readContinuousManifest(path).manifest
		assert.equal(isContinuousManifest({ ...frozen, capacity: undefined }), false)
		assert.equal(isContinuousManifest({ ...frozen, failure: undefined }), false)
		assert.equal(isContinuousManifest({ ...frozen, limits: { ...frozen.limits, requests: 0 } }), false)
		const faults: readonly CapacityFault[] = [{ role: 'agent', response: 'length' }, { role: 'agent', response: 'http' }, { role: 'agent', response: 'usage' }, { role: 'agent', response: 'headroom' }, { role: 'summarizer', response: 'length' }, { role: 'summarizer', response: 'usage' }, { role: 'agent', response: 'oom' }]
		for (const fault of faults) {
		for (const arm of fault.role === 'summarizer' ? ['compaction'] as const : fault.response === 'length' ? ['records', 'compaction', 'full'] as const : fault.response === 'oom' ? ['full'] as const : ['records'] as const) {
			const daemon = await startDaemon({ factor: fault.role === 'summarizer' ? 24 : 1, capacity: 100000, decision: MODELS.q2, judge: MICA_MODEL, fault })
			try {
				const out = join(directory, `${arm}-${fault.role}-${fault.response}`)
				assert.equal(await Continuous.execute(['run', '--manifest', path, '--arm', arm, '--out', out, '--live', '--url', daemon.url]), 3)
				const info = readJSON(join(out, 'run.json'))
				assert.ok(isRecord(info) && isRecord(info.terminal))
				assert.equal(info.terminal.expected, false)
				assert.notEqual(info.status, 'complete')
				if (fault.response === 'oom') assert.equal(info.status, 'fault')
				const rows = readRows(join(out, 'rows.jsonl')).filter(isRecord)
				assert.equal(rows.at(-1)?.success, false)
				assert.equal(rows.at(-1)?.reply, '')
				assert.equal(readRows(join(out, 'observations.jsonl')).filter(isRecord).at(-1)?.complete, false)
				const requests = readRows(join(out, 'requests.jsonl')).filter(isRecord)
				const terminal = requests.find((request) => request.sent === true && request.goal !== undefined && (request.role === fault.role) && (request.reason === 'length' || request.status === 400 || (Array.isArray(request.failures) && request.failures.includes('usage')) || fault.response === 'headroom'))
				assert.ok(terminal !== undefined)
				assert.equal(requests.filter((request) => request.sent === true && typeof request.sequence === 'number' && typeof terminal.sequence === 'number' && request.sequence > terminal.sequence).length, 0)
				assert.equal(daemon.requests.length, requests.filter((request) => request.sent === true).length)
				assert.ok(requests.filter((request) => request.sent === true).every((request) => isRecord(request.request) && isRecord(request.request.options) && request.request.options.num_ctx === (request.role === 'judge' ? 4096 : 12288)))
				assert.ok(requests.filter((request) => request.sent === true).every((request) => isRecord(request.request) && isRecord(request.request.options) && request.request.options.num_predict === (request.role === 'judge' || request.role === 'flush' || request.goal === undefined ? 1 : request.role === 'summarizer' ? 2048 : 4096)))
			} finally { await daemon.close() }
		}
		}
		for (const [name, limits, tokens] of [['calls', { ...frozen.limits, calls: 4 }, frozen.limits.tokens], ['tokens', frozen.limits, 100], ['goal-requests', { ...frozen.limits, requests: 1 }, frozen.limits.tokens]] as const) {
			const limited = join(directory, `${name}-manifest.json`)
			writeFileSync(limited, JSON.stringify({ ...frozen, limits: { ...limits, tokens } }))
			const from = plain.requests.length
			const out = join(directory, name)
			assert.equal(await Continuous.execute(['run', '--manifest', limited, '--arm', 'records', '--out', out, '--live', '--url', plain.url]), 3)
			const info = readJSON(join(out, 'run.json'))
			assert.ok(isRecord(info) && isRecord(info.terminal))
			assert.equal(info.status, 'limit')
			if (name === 'tokens' || name === 'calls') assert.equal(plain.requests.length - from, 0)
			if (name === 'goal-requests') assert.equal(readRows(join(out, 'requests.jsonl')).filter((request) => isRecord(request) && request.goal !== undefined && request.sent === true).length, 1)
		}
		const failure = await startDaemon({ factor: 1, capacity: 100000, decision: MODELS.q2, judge: MICA_MODEL, fault: { role: 'agent', response: 'length' } })
		try {
			const base = join(directory, 'series')
			assert.equal(await Continuous.execute(['series', '--manifest', path, '--base', base, '--live', '--url', failure.url]), 3)
			assert.equal(readRows(join(base, 'series.jsonl')).length, 1)
			assert.equal(existsSync(join(base, 'q2', 'compaction')), false)
			await assert.rejects(Continuous.execute(['series', '--manifest', path, '--base', base, '--live', '--url', plain.url]), /terminal status/)
		} finally { await failure.close() }
	} finally { await plain.close() }
})

test('expected full context overflow permits the next arm and exact bound resume; retained own faults refuse resume', async () => {
	const directory = mkdtempSync(resolve('tmp/c1-capacity-control-'))
	const files = writeTrialFiles(join(directory, 'workload'))
	const daemon = await startDaemon({ factor: 1, capacity: 2200, decision: MODELS.q2, judge: MICA_MODEL })
	try {
		const freeze = join(directory, 'freeze')
		await Continuous.execute(['freeze', '--key', 'q2', '--out', freeze, '--live', '--url', daemon.url, '--workload', files.workload, '--runtime', files.runtime, '--oracle', files.oracle])
		const frozen = readContinuousManifest(join(freeze, 'manifest.json')).manifest
		const path = join(directory, 'ordered-manifest.json')
		writeFileSync(path, JSON.stringify({ ...frozen, arms: ['full', 'records'] }))
		const base = join(directory, 'series')
		assert.equal(await Continuous.execute(['series', '--manifest', path, '--base', base, '--live', '--url', daemon.url]), 0)
		const entries = readRows(join(base, 'series.jsonl')).filter(isRecord)
		assert.deepEqual(entries.map((entry) => entry.status), ['overflow', 'complete'])
		const full = readJSON(join(base, 'q2', 'full', 'run.json'))
		assert.ok(isRecord(full) && isRecord(full.terminal))
		assert.equal(full.terminal.expected, true)
		const before = daemon.requests.length + daemon.metadata.length
		assert.equal(await Continuous.execute(['series', '--manifest', path, '--base', base, '--live', '--url', daemon.url]), 0)
		assert.equal(daemon.requests.length + daemon.metadata.length, before)
		writeFileSync(join(base, 'q2', 'full', 'run.json'), JSON.stringify({ ...full, faults: ['retained operational fault'] }))
		await assert.rejects(Continuous.execute(['series', '--manifest', path, '--base', base, '--live', '--url', daemon.url]), /terminal status/)
		writeFileSync(join(base, 'q2', 'full', 'run.json'), JSON.stringify({ ...full, manifest: { ...hashFile(path), hash: '0'.repeat(64) } }))
		await assert.rejects(Continuous.execute(['series', '--manifest', path, '--base', base, '--live', '--url', daemon.url]), /terminal status/)
		const boundary = await startDaemon({ factor: 1, capacity: 100000, decision: MODELS.q2, judge: MICA_MODEL, fault: { role: 'agent', response: 'boundary' } })
		try {
			const out = join(directory, 'observed-boundary')
			assert.equal(await Continuous.execute(['run', '--manifest', path, '--arm', 'full', '--out', out, '--live', '--url', boundary.url]), 3)
			const info = readJSON(join(out, 'run.json'))
			assert.ok(isRecord(info) && isRecord(info.terminal))
			assert.equal(info.status, 'overflow')
			assert.equal(info.terminal.expected, true)
			assert.equal(boundary.requests.length, 4)
		} finally { await boundary.close() }
	} finally { await daemon.close() }
})

test('goal, trajectory, request, and series deadlines abort stalled response bodies and prohibit later requests', async () => {
	const directory = mkdtempSync(resolve('tmp/c1-capacity-deadline-'))
	const files = writeTrialFiles(join(directory, 'workload'))
	const plain = await startDaemon({ factor: 1, capacity: 100000, decision: MODELS.q2, judge: MICA_MODEL })
	try {
		const freeze = join(directory, 'freeze')
		await Continuous.execute(['freeze', '--key', 'q2', '--out', freeze, '--live', '--url', plain.url, '--workload', files.workload, '--runtime', files.runtime, '--oracle', files.oracle])
		const frozen = readContinuousManifest(join(freeze, 'manifest.json')).manifest
		for (const [name, role, response] of [['goal', 'flush', 'body'], ['wall', 'agent', 'request'], ['timeout', 'summarizer', 'body'], ['series', 'agent', 'body'], ['metadata', 'metadata', 'body']] as const) {
			const manifest = { ...frozen, timeout: name === 'timeout' ? 80 : frozen.timeout, limits: { ...frozen.limits, [name]: 80 } }
			const path = join(directory, `${name}-manifest.json`)
			writeFileSync(path, JSON.stringify(manifest))
			const daemon = await startDaemon({ factor: role === 'summarizer' ? 24 : 1, capacity: 100000, decision: MODELS.q2, judge: MICA_MODEL, fault: { role, response } })
			try {
				const out = join(directory, name)
				assert.equal(await Continuous.execute(['run', '--manifest', path, '--arm', role === 'summarizer' ? 'compaction' : 'records', '--out', out, '--live', '--url', daemon.url]), 3)
				const info = readJSON(join(out, 'run.json'))
				assert.ok(isRecord(info) && isRecord(info.terminal))
				assert.equal(info.status, 'limit')
				const before = daemon.requests.length
				await new Promise((complete) => setTimeout(complete, 30))
				assert.equal(daemon.requests.length, before)
				assert.equal(daemon.closed.length, daemon.requests.length + daemon.metadata.length)
			} finally { await daemon.close() }
		}
	} finally { await plain.close() }
})
