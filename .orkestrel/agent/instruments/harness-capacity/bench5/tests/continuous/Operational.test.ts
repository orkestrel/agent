import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isRecord } from '@orkestrel/contract'
import { Continuous } from '../../continuous/Continuous.js'
import { readContinuousManifest, listContinuousFailures } from '../../continuous/helpers.js'
import { MICA_MODEL, MODELS } from '../../constants.js'
import { readJSON, readRows } from '../../helpers.js'
import { startDaemon, writeTrialFiles } from './helpers.js'

test('valid usage explicit truncation and protocol errors fail every role before provider success', async () => {
	const directory = mkdtempSync(resolve('tmp/units/c1-capacity-fix-operational-'))
	const files = writeTrialFiles(join(directory, 'workload'))
	const plain = await startDaemon({ factor: 1, capacity: 100000, decision: MODELS.q2, judge: MICA_MODEL })
	try {
		const freeze = join(directory, 'freeze')
		await Continuous.execute(['freeze', '--key', 'q2', '--out', freeze, '--live', '--url', plain.url, '--workload', files.workload, '--runtime', files.runtime, '--oracle', files.oracle, '--failure', 'continue'])
		const path = join(freeze, 'manifest.json')
		for (const role of ['agent', 'summarizer', 'flush', 'judge', 'calibration'] as const) {
			for (const response of ['truncated', 'truncation', 'protocol'] as const) {
				const daemon = await startDaemon({ factor: role === 'summarizer' ? 24 : 1, capacity: 100000, decision: MODELS.q2, judge: MICA_MODEL, fault: { role, response } })
				try {
					const out = join(directory, `${role}-${response}`)
					assert.equal(await Continuous.execute(['run', '--manifest', path, '--arm', role === 'summarizer' ? 'compaction' : 'records', '--out', out, '--live', '--url', daemon.url]), 3, `${role}/${response} must refuse before success`)
					const info = readJSON(join(out, 'run.json'))
					assert.ok(isRecord(info) && isRecord(info.terminal))
					assert.equal(info.status, 'fault')
					assert.equal(info.terminal.reason, response === 'protocol' ? 'explicit response protocol fault' : 'explicit response truncation')
					assert.equal(info.terminal.expected, false)
					const requests = readRows(join(out, 'requests.jsonl')).filter(isRecord)
					const at = requests.findIndex((request) => typeof request.response === 'string' && request.response.includes(response === 'protocol' ? 'explicit fixture protocol error' : `${response}\":true`))
					assert.ok(at >= 0, 'the valid-usage fault must reach the wire recorder')
					assert.equal(requests[at]?.prompt, 120)
					assert.equal(requests[at]?.completion, 1)
					assert.equal(requests.slice(at + 1).filter((request) => request.sent === true).length, 0)
					assert.equal(daemon.requests.length, requests.filter((request) => request.sent === true).length)
					const rows = readRows(join(out, 'rows.jsonl')).filter(isRecord)
					if (rows.length > 0) assert.equal(rows.at(-1)?.success, false)
				} finally { await daemon.close() }
			}
		}
		for (const response of ['combined', 'protocol'] as const) {
			const daemon = await startDaemon({ factor: 1, capacity: 100000, decision: MODELS.q2, judge: MICA_MODEL, fault: { role: 'agent', response } })
			try {
				const out = join(directory, `full-${response}`)
				assert.equal(await Continuous.execute(['run', '--manifest', path, '--arm', 'full', '--out', out, '--live', '--url', daemon.url]), 3)
				const info = readJSON(join(out, 'run.json'))
				assert.ok(isRecord(info) && isRecord(info.terminal))
				assert.equal(info.status, 'fault')
				assert.equal(info.terminal.expected, false)
				assert.equal(daemon.requests.length, 4)
			} finally { await daemon.close() }
		}
	} finally { await plain.close() }
})

test('resume rejects retained operational wire faults in old complete output without terminal metadata', async () => {
	const directory = mkdtempSync(resolve('tmp/units/c1-capacity-fix-resume-'))
	const files = writeTrialFiles(join(directory, 'workload'))
	const daemon = await startDaemon({ factor: 1, capacity: 100000, decision: MODELS.q2, judge: MICA_MODEL })
	try {
		const freeze = join(directory, 'freeze')
		await Continuous.execute(['freeze', '--key', 'q2', '--out', freeze, '--live', '--url', daemon.url, '--workload', files.workload, '--runtime', files.runtime, '--oracle', files.oracle, '--failure', 'continue'])
		const frozen = readContinuousManifest(join(freeze, 'manifest.json')).manifest
		const manifest = join(directory, 'manifest.json')
		writeFileSync(manifest, JSON.stringify({ ...frozen, arms: ['full'] }))
		const base = join(directory, 'series')
		assert.equal(await Continuous.execute(['series', '--manifest', manifest, '--base', base, '--live', '--url', daemon.url]), 0)
		const path = join(base, 'q2', 'full', 'requests.jsonl')
		const original = readRows(path).filter(isRecord)
		for (const response of ['truncated', 'protocol'] as const) {
			const changed = original.map((request) => {
				if (request.role !== 'agent' || request.goal === undefined || typeof request.response !== 'string') return request
				const text = request.response.split(/\r\n|\n/).filter((line) => line !== '').map((line) => {
					const frame: unknown = JSON.parse(line)
					assert.ok(isRecord(frame))
					return JSON.stringify({ ...frame, ...(response === 'truncated' ? { truncated: true } : { error: 'explicit fixture protocol error' }) })
				}).join('\n') + '\n'
				return { ...request, response: text, failures: listContinuousFailures('agent', request.request, text, frozen.budget, 200, undefined, false) }
			})
			writeFileSync(path, changed.map((request) => JSON.stringify(request)).join('\n') + '\n')
			const before = daemon.requests.length + daemon.metadata.length
			await assert.rejects(Continuous.execute(['series', '--manifest', manifest, '--base', base, '--live', '--url', daemon.url]), /retained operational request/)
			assert.equal(daemon.requests.length + daemon.metadata.length, before)
		}
	} finally { await daemon.close() }
})
