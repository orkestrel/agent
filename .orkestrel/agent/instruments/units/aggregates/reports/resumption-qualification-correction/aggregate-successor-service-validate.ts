// Read-only service validation; captures metadata under this prefix and makes no inference request.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { readDeployment } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'
import { hashFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'

const started = performance.now()
const reference = hashFile('tmp/units/aggregate-successor-daemon-deployment.json')
const deployment = readDeployment(reference)
const receipt: unknown = JSON.parse(readFileSync(deployment.receipt.path, 'utf8'))
assert.ok(typeof receipt === 'object' && receipt !== null && 'pid' in receipt && receipt.pid === 1620)
assert.equal(deployment.environment.OLLAMA_HOST, 'http://127.0.0.1:11435')
const invalid = { ...reference, hash: '0'.repeat(64) }
assert.throws(() => readDeployment(invalid), /custody mismatch:/)
const readings: { readonly endpoint: string; readonly status: number; readonly path: string; readonly hash: string }[] = []
for (const endpoint of ['version', 'tags', 'ps']) {
	const response = await fetch(`${deployment.environment.OLLAMA_HOST}/api/${endpoint}`, { signal: AbortSignal.timeout(10000) })
	const bytes = Buffer.from(await response.arrayBuffer())
	const path = `tmp/units/aggregate-successor-service-${endpoint}.json`
	writeFileSync(path, bytes, { flag: 'wx' })
	assert.equal(response.status, 200)
	const value: unknown = JSON.parse(bytes.toString('utf8'))
	assert.ok(typeof value === 'object' && value !== null)
	if (endpoint === 'version') {
		assert.ok('version' in value)
		assert.equal(value.version, deployment.version)
	} else {
		assert.ok('models' in value && Array.isArray(value.models))
		const models: unknown[] = value.models
		if (endpoint === 'ps') assert.equal(models.length, 0)
		else for (const expected of deployment.models) {
			assert.ok(models.some((model) => typeof model === 'object' && model !== null &&
				'name' in model && model.name === expected.model && 'digest' in model && model.digest === expected.digest))
		}
	}
	readings.push({ endpoint, status: response.status, path, hash: createHash('sha256').update(bytes).digest('hex') })
}
const result = { deployment: reference, receipt: deployment.receipt, pid: receipt.pid, invalidHashRejected: true, readings, durationMs: performance.now() - started }
writeFileSync('tmp/units/aggregate-successor-service-validation.json', `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify(result, null, 2))
