import type { ExecutionOptions } from '../aggregate-capacity-probe/types.ts'
import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { computeHash, readArray, readObject, writeArtifact } from '../aggregate-judge-counterfactual/helpers.ts'
import { HOST, LIMITS, OPERATOR_FILES, PACKET, PREPARED, ROOT, UNIT, WORKLOADS } from '../aggregate-capacity-probe/constants.ts'
import { Driver } from '../aggregate-capacity-probe/Driver.ts'
import { buildPacket, computeOperator, readArguments, readFileBinding, validateBounds, validateExecution, validateOutput } from '../aggregate-capacity-probe/helpers.ts'

/** Checks offline admission and frozen diagnostic data without HTTP or daemon startup. */
export class Validation {
	/** Executes syntax checks, inert negative controls, and data comparisons.
	 * @returns Nothing when every named control passes
	 */
	async execute(): Promise<void> {
		const folder = resolve(UNIT, 'independent-check-2')
		mkdirSync(folder)
		const outcomes: { name: string; exit: number | null; stdout: string; stderr: string }[] = []
		for (const name of [...OPERATOR_FILES, 'Validation.ts', 'verify.ts']) {
			const result = spawnSync(process.execPath, ['--check', resolve(UNIT, name)], { encoding: 'utf8', shell: false, windowsHide: true })
			outcomes.push({ name: `syntax-${name}`, exit: result.status, stdout: result.stdout, stderr: result.stderr })
			assert.equal(result.status, 0, result.stderr)
		}
		for (const entry of ['main.ts', 'prepare.ts', 'execute.ts', 'start.ts']) {
			const result = spawnSync(process.execPath, [resolve(UNIT, entry)], { encoding: 'utf8', shell: false, windowsHide: true })
			outcomes.push({ name: `offline-${entry}`, exit: result.status, stdout: result.stdout, stderr: result.stderr })
			assert.equal(result.status, 0)
			assert.equal(readObject(JSON.parse(result.stdout)).offline, true)
		}
		const packet = buildPacket()
		assert.equal(readFileSync(PACKET, 'utf8'), `${JSON.stringify(packet, null, 2)}\n`)
		assert.deepEqual(packet.models.map(model => model.key), [...WORKLOADS, 'mica'])
		assert.equal(packet.vectors.length, 30)
		const history: unknown = JSON.parse(readFileSync(resolve(PREPARED, 'history.json'), 'utf8'))
		assert.deepEqual(readArray(history).map(entry => readObject(entry).role), ['system', 'user', 'assistant', 'user'])
		assert.equal(readObject(readArray(history)[1]).content, ' 1'.repeat(2600))
		assert.equal(readObject(readArray(history)[3]).content, "Reply 'Ready'.")
		for (const model of WORKLOADS) {
			const sequence = packet.vectors.filter(vector => vector.model === model)
			assert.deepEqual(sequence.map(vector => vector.id), ['positive', 'cache', 'reachability', 'overflow', 'smaller', 'restored', 'generation'].map(name => `${model}-${name}`))
			assert.equal(sequence[0]?.body, sequence[1]?.body)
			const adequate = readObject(JSON.parse(sequence[2]?.body ?? ''))
			const overflow = readObject(JSON.parse(sequence[3]?.body ?? ''))
			assert.deepEqual(adequate.messages, overflow.messages)
			assert.deepEqual({ ...readObject(adequate.options), num_ctx: 2048 }, overflow.options)
		}
		for (const vector of packet.vectors) {
			const body = readObject(JSON.parse(vector.body))
			assert.equal(body.truncate, false)
			assert.equal(body.shift, false)
			assert.equal(body.stream, false)
			assert.equal(body.keep_alive, '5m')
			assert.equal(readFileSync(resolve(PREPARED, `${vector.id}.request.bin`), 'utf8'), vector.body)
			assert.ok(vector.bytes <= LIMITS.request)
			if (vector.model === 'mica') {
				assert.equal(vector.route, '/api/generate')
				assert.equal(body.raw, true)
				assert.equal(readObject(body.options).num_predict, 1)
				assert.equal(readObject(body.options).temperature, 1)
			} else {
				assert.equal(vector.route, '/api/chat')
				assert.equal(body.think, false)
			}
		}
		const options: ExecutionOptions = { packet: readFileBinding(PACKET).hash, operator: computeOperator(), receipt: resolve(folder, 'missing-receipt.json'), custody: '0'.repeat(64), output: resolve(folder, 'never-created'), host: HOST }
		assert.throws(() => validateExecution({ ...options, packet: '0'.repeat(64) }), /Hash mismatch/)
		assert.throws(() => validateExecution({ ...options, operator: '0'.repeat(64) }), /Operator hash mismatch/)
		assert.throws(() => validateExecution({ ...options, output: folder }), /occupied/)
		assert.throws(() => validateExecution({ ...options, output: ROOT }), /within the assigned/)
		assert.throws(() => validateExecution(options), /ENOENT/)
		assert.throws(() => validateExecution({ ...options, host: '' }), /host condition/)
		assert.throws(() => validateOutput(resolve(UNIT, 'nul')), /Unsafe/)
		assert.throws(() => readArguments(['--packet', 'x', '--packet', 'y'], ['--packet', '--operator']), /repeated/)
		assert.throws(() => validateBounds([...packet.vectors, ...packet.vectors]), /Inference ceiling/)
		const oversized = 'x'.repeat(LIMITS.request + 1)
		const first = packet.vectors[0]
		if (first === undefined) throw new Error('Missing positive vector')
		assert.throws(() => validateBounds([{ ...first, body: oversized, bytes: Buffer.byteLength(oversized), hash: computeHash(oversized) }]), /Request byte/)
		assert.throws(() => validateBounds([{ ...first, hash: '0'.repeat(64) }]), /Request byte\/hash/)
		assert.throws(() => validateBounds([]), /Inference ceiling/)
		assert.equal(await new Driver().main(['--execute']), 64)
		await assert.rejects(new Driver().execute(options), /ENOENT/)
		assert.equal(existsSync(options.output), false)
		writeArtifact(resolve(folder, 'offline.json'), { outcomes, controls: ['wrong-packet', 'wrong-operator', 'occupied-output', 'escaped-output', 'missing-receipt', 'missing-host', 'reserved-output', 'repeated-argument', 'inference-ceiling', 'request-byte-ceiling', 'request-hash', 'empty-plan', 'explicit-execute-missing-options', 'driver-missing-receipt'], packet: readFileBinding(PACKET), operator: computeOperator(), network: 'No fetch reached: every execution vector failed admission before output creation.' })
		console.log(JSON.stringify({ pass: true, evidence: readFileBinding(resolve(folder, 'offline.json')), inference: packet.vectors.length, maximum: Math.max(...packet.vectors.map(vector => vector.bytes)) }))
	}
}

