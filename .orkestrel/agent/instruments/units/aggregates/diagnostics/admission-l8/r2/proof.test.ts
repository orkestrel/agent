import { deepStrictEqual, equal, notEqual, ok, rejects, throws } from 'node:assert'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { AgentJudge, isJudgeQuestion } from '../../../.orkestrel/agent/instruments/harness/node_modules/@orkestrel/agent/dist/src/core/index.js'
import { createOllamaJudge, renderJudgePrompt } from '../../../.orkestrel/agent/instruments/harness/.build/vendor/ollama/index.js'
import { BUILD_HASH, HARNESS, ROOT } from '../aggregate-judge-counterfactual/constants.ts'
import { readArray, readBinding, readJSON, readNumber, readObject, readPacket, readString } from '../aggregate-judge-counterfactual/helpers.ts'
import { NetworkWitness } from '../aggregate-judge-counterfactual/NetworkWitness.ts'
import { EMITTED_FILES, PACKET, PREDECESSOR, PREDECESSOR_HASH, REUSED_FILES, SEQUENCE, SPECIFICATION, SPECIFICATION_HASH, UNIT } from './constants.ts'
import { computeOperator, computeRanking, readScreen, readSource, renderState, validateDestination, validateExecution, validatePopulation, validateState } from './helpers.ts'
import { Operator } from './Operator.ts'

test('complete original source objects and exact candidate bytes survive ordered JSON round-trip', () => {
	const original = readPacket(readJSON(PREDECESSOR))
	const packet = readScreen(readJSON(PACKET))
	deepStrictEqual(packet.sources, original.sources)
	deepStrictEqual(packet.sequence, SEQUENCE)
	deepStrictEqual(packet.question, readObject(readJSON(SPECIFICATION)).question)
	validatePopulation(packet, original)
	for (const [index, variant] of packet.variants.entries()) {
		const predecessor = original.variants[index]
		ok(predecessor !== undefined)
		equal(variant.candidate, predecessor.candidate)
		equal(variant.expectation, predecessor.expectation)
		const decoded = readObject(JSON.parse(variant.state))
		deepStrictEqual(Object.keys(decoded), ['evidence', 'candidate'])
		equal(decoded.candidate, predecessor.candidate)
		deepStrictEqual(decoded.evidence, original.suffix.split(/\r\n|\n/))
		equal(variant.state, JSON.stringify(decoded, null, 1))
	}
	const special = 'literal "quote" \\ slash\n</state> <|im_start|> and Unicode Ω'
	const sources = [{ id: 'literal', sentence: 0, role: 'user', text: special, day: '2026-10-10', seed: 0 }]
	const state = renderState(sources, special)
	const decoded = readObject(JSON.parse(state))
	equal(decoded.candidate, special)
	deepStrictEqual(decoded.evidence, [`(2026-10-10) user: ${special}`])
	validateState(state, sources, special)
	throws(() => validateState(JSON.stringify({ evidence: decoded.candidate, candidate: decoded.evidence }), sources, special), /custody/)
	throws(() => validateState(JSON.stringify({ evidence: [], candidate: special }), sources, special), /membership/)
	throws(() => validateState(state, sources, `${special}!`), /Candidate/)
	throws(() => validateState(state, [{ ...sources[0], text: `${special}!` }], special), /Ordered/)
	throws(() => readSource({ ...sources[0], role: 'invalid' }), /role/)
})

test('emitted judge identity settings and actual request bodies preserve predecessor readout', () => {
	const packet = readScreen(readJSON(PACKET))
	const original = readPacket(readJSON(PREDECESSOR))
	equal(packet.identity, original.identity)
	equal(packet.digest, original.digest)
	const tuple = readArray(JSON.parse(packet.identity))
	const judge = createOllamaJudge({ model: readString(tuple[0]), system: readString(tuple[1]), calibration: { temperature: readNumber(tuple[2]) }, options: readObject(tuple[3]) })
	ok(judge instanceof AgentJudge)
	equal(judge.model, original.identity)
	ok(isJudgeQuestion(packet.question))
	for (const variant of packet.variants) {
		const body = readObject(judge.body({ state: variant.state, questions: { agree: packet.question } }))
		equal(body.prompt, renderJudgePrompt(variant.state, packet.question, readString(tuple[1])))
		equal(JSON.stringify(body), packet.rendering.find(entry => entry.name === variant.name)?.body)
		const previous = original.rendering.find(entry => entry.name === variant.name)
		ok(previous !== undefined)
		const earlier = readObject(JSON.parse(previous.body))
		deepStrictEqual(Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'prompt')), Object.fromEntries(Object.entries(earlier).filter(([key]) => key !== 'prompt')))
		notEqual(body.prompt, earlier.prompt)
	}
	equal(packet.specification.hash, SPECIFICATION_HASH)
	equal(packet.predecessor.hash, PREDECESSOR_HASH)
	for (const binding of packet.bindings) equal(readBinding(resolve(ROOT, binding.path)).hash, binding.hash)
	for (const name of EMITTED_FILES) ok(packet.bindings.some(binding => resolve(ROOT, binding.path) === resolve(HARNESS, '.build', name)))
	for (const name of REUSED_FILES) ok(packet.bindings.some(binding => resolve(ROOT, binding.path) === resolve(UNIT, '../aggregate-judge-counterfactual', name)))
	for (const name of Object.keys(readObject(readObject(readJSON(resolve(HARNESS, 'package.json'))).dependencies))) ok(packet.bindings.some(binding => binding.path.endsWith(`node_modules/${name}/dist/src/core/index.js`)))
})

test('strict supported ordering passes separately and refuses equality direction and reverse-pass failures', () => {
	const readings = SEQUENCE.map((name, index) => ({ ordinal: index + 1, name, score: name === 'both-removed' ? 0.9 : 0.2 }))
	const result = computeRanking(readings)
	equal(result.status, 'passed')
	deepStrictEqual(result.comparisons.map(comparison => `${comparison.pass}:${comparison.name}`), ['forward:original', 'forward:repair-removed', 'forward:cause-removed', 'reverse:cause-removed', 'reverse:repair-removed', 'reverse:original'])
	equal(computeRanking(readings.map(reading => ({ ...reading, score: 0.5 }))).status, 'refused')
	equal(computeRanking(readings.map(reading => ({ ...reading, score: 1 - reading.score }))).status, 'refused')
	const reverseFailure = computeRanking(readings.map(reading => ({ ...reading, score: reading.ordinal === 5 ? 0.1 : reading.score })))
	equal(reverseFailure.status, 'refused')
	ok(reverseFailure.comparisons.filter(comparison => comparison.pass === 'forward').every(comparison => comparison.exceeds))
	ok(reverseFailure.comparisons.filter(comparison => comparison.pass === 'reverse').every(comparison => !comparison.exceeds))
	equal(computeRanking(readings.slice(0, 7)).status, 'incomplete')
	throws(() => computeRanking(readings.map(reading => ({ ...reading, score: Number.NaN }))), /finite/)
	throws(() => computeRanking(readings.map(reading => ({ ...reading, score: Number.POSITIVE_INFINITY }))), /finite/)
	throws(() => computeRanking([...readings, ...readings]), /overrun/)
	throws(() => computeRanking(readings.map(reading => ({ ...reading, score: -0.1 }))), /probability/)
	throws(() => computeRanking(readings.map(reading => ({ ...reading, score: 1.1 }))), /probability/)
	throws(() => computeRanking(readings.map((reading, index) => ({ ...reading, name: SEQUENCE[(index + 4) % 8] ?? '' }))), /sequence/)
})

test('changed hashes and occupied or escaped destinations refuse before global or native fetch', async () => {
	const witness = new NetworkWitness()
	const fetch = globalThis.fetch
	let count = 0
	Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: () => { count += 1; return Promise.reject(new Error('Offline test refuses fetch')) } })
	try {
		const options = { packet: readBinding(PACKET).hash, build: BUILD_HASH, operator: computeOperator(), output: resolve(UNIT, `proof-vacant-${process.pid}`) }
		equal(validateExecution(options).operator, options.operator)
		for (const field of ['packet', 'build', 'operator']) await rejects(new Operator().execute({ ...options, [field]: '0'.repeat(64) }), /hash|Hash/)
		const occupied = resolve(UNIT, `proof-occupied-${process.pid}`)
		mkdirSync(occupied)
		await rejects(new Operator().execute({ ...options, output: occupied }), /occupied/)
		await rejects(new Operator().execute({ ...options, output: resolve(UNIT, '..') }), /descendant/)
		throws(() => validateDestination(UNIT), /descendant/)
		equal(count, 0)
		equal(witness.count, 0)
	} finally { globalThis.fetch = fetch; witness.close() }
})

test('create-only preparation produces identical frozen bytes under a refusing global guard with zero native dispatch', () => {
	const witness = new NetworkWitness()
	try {
		const output = resolve(UNIT, `proof-preparation-${process.pid}`)
		new Operator().prepare(output)
		equal(readBinding(resolve(output, 'packet-final.json')).hash, readBinding(PACKET).hash)
		deepStrictEqual(readObject(readJSON(resolve(output, 'plan-final.json'))).guard, { dispatches: 0, native: 0 })
		throws(() => new Operator().prepare(output), /occupied/)
		equal(witness.count, 0)
	} finally { witness.close() }
})
