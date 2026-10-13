import type { ExecutionOptions } from './types.ts'
import { strict as assert } from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readArray, readObject, readString, writeArtifact } from '../aggregate-judge-counterfactual/helpers.ts'
import { NetworkWitness } from '../aggregate-judge-counterfactual/NetworkWitness.ts'
import { HOST, INPUT_FILES, LIMITS, OPERATOR_FILES, ORIGINAL_REQUEST, PACKET, PREPARED, ROOT, SAMPLER, UNIT, WORKLOADS } from './constants.ts'
import { Driver } from './Driver.ts'
import { Daemon } from './Daemon.ts'
import { buildPacket, computeOperator, readFileBinding } from './helpers.ts'

/** Guards offline preparation and population checks with the established refusing witness. */
export class Offline {
	#dispatches = 0

	/** Freezes the completed runtime's packet while refusing HTTP dispatch.
	 * @returns Nothing after create-only preparation
	 */
	prepare(): void {
		const native = new NetworkWitness()
		const fetch = globalThis.fetch
		globalThis.fetch = this.#refuseFetch.bind(this)
		try {
			new Driver().prepare()
			assert.equal(this.#dispatches, 0)
			assert.equal(native.count, 0)
			writeArtifact(resolve(UNIT, 'evidence/preparation.json'), { packet: readFileBinding(PACKET), operator: computeOperator(), dispatches: { global: this.#dispatches, native: native.count } })
			console.log(JSON.stringify({ preparation: true, global: this.#dispatches, native: native.count }))
		} finally { globalThis.fetch = fetch; native.close() }
	}

	/** Compares the fixed population and exercises real admission refusals offline.
	 * @returns Nothing when the population and negative controls pass
	 */
	async execute(): Promise<void> {
		const native = new NetworkWitness()
		const fetch = globalThis.fetch
		globalThis.fetch = this.#refuseFetch.bind(this)
		try {
			const packet = buildPacket()
			assert.equal(readFileSync(PACKET, 'utf8'), `${JSON.stringify(packet, null, 2)}\n`)
			assert.deepEqual(WORKLOADS, ['g2'])
			assert.deepEqual(INPUT_FILES, ['generation.json'])
			assert.deepEqual(LIMITS, { inference: 2, request: 32768, response: 262144, metadata: 1048576, timeout: 60000, snapshot: 30000, duration: 180000 })
			const predecessor = readObject(JSON.parse(readFileSync(resolve(ROOT, 'tmp/units/aggregate-capacity-probe/prepared/packet.json'), 'utf8')))
			const frozen = readArray(predecessor.models).map(readObject).filter(model => model.key === 'g2')
			assert.deepEqual(packet.models, frozen)
			assert.deepEqual(packet.models.map(model => ({ key: model.key, tag: model.tag, route: model.route })), [{ key: 'g2', tag: 'gemma4:e2b-it-q4_K_M', route: '/api/chat' }])
			const original = readObject(JSON.parse(readFileSync(ORIGINAL_REQUEST, 'utf8')))
			const prior = readArray(original.messages)
			assert.equal(prior.length, 2)
			assert.deepEqual(prior.map(message => readObject(message).role), ['system', 'user'])
			assert.equal(readObject(prior[0]).content, 'Provide direct output only.')
			assert.equal(readObject(prior[1]).content, 'Output every integer from 1 through 5000, one per line, without commentary or an early stop.')
			const messages = readArray(JSON.parse(readFileSync(resolve(PREPARED, 'generation.json'), 'utf8')))
			assert.deepEqual(messages, [prior[0], { role: 'user', content: ' 1'.repeat(400) }, { role: 'assistant', content: 'Acknowledged the older content.' }, prior[1]])
			assert.deepEqual(packet.vectors.map(vector => ({ id: vector.id, model: vector.model, route: vector.route })), [{ id: 'g2-reachability', model: 'g2', route: '/api/chat' }, { id: 'g2-generation', model: 'g2', route: '/api/chat' }])
			const reachability = packet.vectors[0]
			const generation = packet.vectors[1]
			if (reachability === undefined || generation === undefined) throw new Error('Missing fixed population')
			const first = readObject(JSON.parse(reachability.body))
			const second = readObject(JSON.parse(generation.body))
			assert.deepEqual({ ...first, options: { ...readObject(first.options), num_predict: 4096 } }, second)
			assert.deepEqual(second, { ...original, messages })
			assert.deepEqual(SAMPLER, { temperature: 0, seed: 7, presence_penalty: 1.5, top_k: 20, top_p: 0.95 })
			assert.equal(readObject(first.options).num_predict, 1)
			for (const vector of packet.vectors) {
				assert.equal(readFileSync(resolve(PREPARED, `${vector.id}.request.bin`), 'utf8'), vector.body)
				assert.equal(vector.hash, readFileBinding(resolve(PREPARED, `${vector.id}.request.bin`)).hash)
				assert.equal(vector.bytes, Buffer.byteLength(vector.body))
				assert.ok(vector.bytes <= LIMITS.request)
			}
			const driver = readFileSync(resolve(UNIT, 'Driver.ts'), 'utf8')
			const previous = readFileSync(resolve(ROOT, 'tmp/units/aggregate-capacity-probe/Driver.ts'), 'utf8')
			assert.equal(driver.slice(driver.indexOf('\tasync execute(')), previous.slice(previous.indexOf('\tasync execute(')))
			assert.equal(driver.slice(driver.indexOf('\tasync main('), driver.indexOf('\t/** Writes')), previous.slice(previous.indexOf('\tasync main('), previous.indexOf('\t/** Writes')))
			const helpers = readFileSync(resolve(UNIT, 'helpers.ts'), 'utf8')
			const oldhelpers = readFileSync(resolve(ROOT, 'tmp/units/aggregate-capacity-probe/helpers.ts'), 'utf8')
			assert.equal(helpers.slice(helpers.indexOf('/** Refuses inference')), oldhelpers.slice(oldhelpers.indexOf('/** Refuses inference')))
			assert.equal(helpers.slice(helpers.indexOf('/** Reads exact bytes'), helpers.indexOf('/** Reads declared model')), oldhelpers.slice(oldhelpers.indexOf('/** Reads exact bytes'), oldhelpers.indexOf('/** Reads declared model')))
			for (const name of OPERATOR_FILES.filter(name => !['constants.ts', 'helpers.ts', 'Driver.ts'].includes(name))) assert.deepEqual(readFileSync(resolve(UNIT, name)), readFileSync(resolve(ROOT, 'tmp/units/aggregate-capacity-probe', name)))
			assert.ok(driver.includes("phase === 'initial' ? ['/api/version', '/api/tags', '/api/ps'] : ['/api/tags', '/api/ps']"))
			assert.ok(driver.includes("`initial-show-${model.key}`, '/api/show'"))
			assert.ok(driver.includes("const snapshot = await this.#capture(`${vector.id}-ps`, '/api/ps'"))
			const sequence = ['initial-version', 'initial-tags', 'initial-ps', 'initial-show-g2', 'g2-reachability', 'g2-reachability-ps', 'g2-generation', 'g2-generation-ps', 'final-tags', 'final-ps']
			const metadata = sequence.filter(id => !packet.vectors.some(vector => vector.id === id))
			assert.equal(metadata.length, 8)
			assert.equal(await new Driver().main([]), 0)
			assert.equal(await new Daemon().main([]), 0)
			const options: ExecutionOptions = { packet: readFileBinding(PACKET).hash, operator: computeOperator(), receipt: resolve(UNIT, 'evidence/missing-receipt.json'), custody: '0'.repeat(64), output: resolve(UNIT, 'evidence/never-created'), host: HOST }
			await assert.rejects(new Driver().execute({ ...options, packet: readFileBinding(resolve(ROOT, 'tmp/units/aggregate-capacity-probe/prepared/packet.json')).hash }), /Hash mismatch/)
			await assert.rejects(new Driver().execute({ ...options, operator: readString(predecessor.operator) }), /Operator hash mismatch/)
			await assert.rejects(new Driver().execute(options), /ENOENT/)
			assert.equal(await new Driver().main(['--execute']), 64)
			assert.equal(existsSync(options.output), false)
			assert.equal(existsSync(options.receipt), false)
			assert.equal(this.#dispatches, 0)
			assert.equal(native.count, 0)
			writeArtifact(resolve(UNIT, 'evidence/population.json'), { passed: true, packet: readFileBinding(PACKET), operator: computeOperator(), models: packet.models, inputs: packet.bindings, bodies: packet.vectors, sequence, inference: packet.vectors.length, metadata: metadata.length, dispatches: { global: this.#dispatches, native: native.count }, controls: ['predecessor-packet-identity', 'predecessor-operator-identity', 'missing-receipt', 'explicit-execute-missing-options'], output: { path: options.output, exists: existsSync(options.output) }, coverage: 'Fixed population and unchanged sequencing/capture/admission source comparison; no inference or capture replay.' })
			console.log(JSON.stringify({ pass: true, evidence: readFileBinding(resolve(UNIT, 'evidence/population.json')), inference: packet.vectors.length, metadata: metadata.length, global: this.#dispatches, native: native.count }))
		} finally { globalThis.fetch = fetch; native.close() }
	}

	#refuseFetch(): Promise<Response> {
		this.#dispatches += 1
		throw new Error('Offline witness refuses fetch before native dispatch')
	}
}
