import { deepStrictEqual, equal, match, notEqual, ok, throws } from 'node:assert'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { createOllamaJudge, computeAnswer, renderJudgePrompt } from '../../../.orkestrel/agent/instruments/harness/.build/vendor/ollama/index.js'
import { AgentJudge, isJudgeQuestion } from '../../../.orkestrel/agent/instruments/harness/node_modules/@orkestrel/agent/dist/src/core/index.js'
import { BUILD_HASH, CAUSE_REPLACEMENT, CAUSE_TARGET, PACKET, REPAIR_TARGET, SEQUENCE, UNIT } from './constants.ts'
import { computeOperator, computeReplay, readArray, readBinding, readJSON, readNumber, readObject, readPacket, readString, replaceTarget, validateExecution } from './helpers.ts'
import { NetworkWitness } from './NetworkWitness.ts'

test('exact complete variant cross retains identical question, source suffix and ordered sources', () => {
	const packet = readPacket(readJSON(PACKET))
	const original = packet.variants.find(variant => variant.name === 'original')
	ok(original !== undefined)
	equal(packet.sources.length, 21)
	deepStrictEqual(packet.sequence, SEQUENCE)
	for (const variant of packet.variants) {
		let expected = original.candidate
		if (variant.repair) expected = replaceTarget(expected, REPAIR_TARGET, '')
		if (variant.cause) expected = replaceTarget(expected, CAUSE_TARGET, CAUSE_REPLACEMENT)
		equal(variant.candidate, expected)
		equal(variant.state, `${expected}${packet.separator}${packet.suffix}`)
		equal(variant.expectation, variant.repair && variant.cause ? 'supported' : 'unsupported')
	}
	throws(() => replaceTarget('', REPAIR_TARGET, ''), /exactly one/)
	throws(() => replaceTarget(`${REPAIR_TARGET}${REPAIR_TARGET}`, REPAIR_TARGET, ''), /exactly one/)
})

test('emitted judge identity, actual superclass and rendered serialized bodies match retained identity', () => {
	const packet = readPacket(readJSON(PACKET))
	const tuple = readArray(JSON.parse(packet.identity))
	const judge = createOllamaJudge({ model: readString(tuple[0]), system: readString(tuple[1]), calibration: { temperature: readNumber(tuple[2]) }, options: readObject(tuple[3]) })
	ok(judge instanceof AgentJudge)
	equal(judge.model, packet.identity)
	deepStrictEqual(tuple[3], { num_ctx: 4096, num_predict: 1, temperature: 1 })
	equal(tuple[2], 1.1244734010661372)
	equal(tuple[4], 'mica-native-2026-10-07-v1')
	ok(isJudgeQuestion(packet.question))
	for (const variant of packet.variants) {
		const body = readObject(judge.body({ state: variant.state, questions: { agree: packet.question } }))
		equal(body.prompt, renderJudgePrompt(variant.state, packet.question, readString(tuple[1])))
		equal(JSON.stringify(body), packet.rendering.find(entry => entry.name === variant.name)?.body)
	}
	for (const binding of packet.bindings) equal(readBinding(resolve(UNIT, '../../..', binding.path)).hash, binding.hash)
})

test('changed expected hashes and occupied outputs refuse with zero native fetch dispatches', () => {
	const witness = new NetworkWitness()
	try {
		const valid = { packet: readBinding(PACKET).hash, build: BUILD_HASH, operator: computeOperator(), output: resolve(UNIT, `proof-vacant-${process.pid}`) }
		for (const field of ['packet', 'build', 'operator']) {
			throws(() => validateExecution({ ...valid, [field]: '0'.repeat(64) }), /hash|Hash/)
			const child = spawnSync(process.execPath, [resolve(UNIT, 'offline.ts'), '--execute', '--packet', field === 'packet' ? '0'.repeat(64) : valid.packet, '--build', field === 'build' ? '0'.repeat(64) : valid.build, '--operator', field === 'operator' ? '0'.repeat(64) : valid.operator, '--output', valid.output], { encoding: 'utf8' })
			equal(child.status, 1)
			match(child.stdout, /Observed native fetch dispatches: 0/)
			match(child.stderr, /hash|Hash/)
		}
		const occupied = resolve(UNIT, `proof-occupied-${process.pid}`)
		mkdirSync(occupied)
		throws(() => validateExecution({ ...valid, output: occupied }), /occupied/)
		const child = spawnSync(process.execPath, [resolve(UNIT, 'offline.ts'), '--execute', '--packet', valid.packet, '--build', valid.build, '--operator', valid.operator, '--output', occupied], { encoding: 'utf8' })
		equal(child.status, 1)
		match(child.stdout, /Observed native fetch dispatches: 0/)
		match(child.stderr, /occupied/)
		throws(() => validateExecution({ ...valid, output: resolve(UNIT, '..') }), /descendant/)
		equal(witness.count, 0)
	} finally { witness.close() }
})

test('default entry import and invocation execute zero native fetch dispatches', () => {
	const child = spawnSync(process.execPath, [resolve(UNIT, 'offline.ts')], { encoding: 'utf8' })
	equal(child.status, 0)
	match(child.stdout, /Offline default: no model or network request/)
	match(child.stdout, /Observed native fetch dispatches: 0/)
	const result = spawnSync(process.execPath, [resolve(UNIT, 'main.ts')], { encoding: 'utf8' })
	equal(result.status, 0)
	match(result.stdout, /Offline default/)
})

test('independent mathematical replay agrees with library pure scorer and refuses malformed evidence', () => {
	const packet = readPacket(readJSON(PACKET))
	const temperature = readNumber(readArray(JSON.parse(packet.identity))[2])
	const top = [{ token: 'Yes', logprob: -0.2 }, { token: 'No', logprob: -2.2 }, { token: 'Other', logprob: -0.01 }]
	const vector = { logprobs: [{ top_logprobs: top }] }
	ok(isJudgeQuestion(packet.question))
	const answer = computeAnswer(packet.question, top, temperature)
	ok('form' in answer && answer.form === 'noul')
	ok(Math.abs(computeReplay(vector, temperature) - answer.noul) < 1e-12)
	ok(computeReplay(vector, temperature) > 0.5)
	notEqual(computeReplay(vector, temperature), 1 - answer.noul)
	throws(() => computeReplay({ logprobs: [] }, temperature))
	throws(() => computeReplay({ logprobs: [{ top_logprobs: [{ token: 'Yes', logprob: 0 }] }] }, temperature), /Missing/)
	throws(() => computeReplay({ logprobs: [{ top_logprobs: [{ token: 'Yes', logprob: 0 }, { token: 'Yes', logprob: -1 }] }] }, temperature), /Duplicate/)
	throws(() => computeReplay({ logprobs: [{ top_logprobs: [{ token: 'Yes', logprob: Number.NaN }] }] }, temperature), /finite/)
	throws(() => computeReplay(vector, 0), /calibration/)
	const negative = spawnSync(process.execPath, ['--test', resolve(UNIT, 'negative.test.ts')], { encoding: 'utf8', env: {} })
	equal(negative.status, 1)
	match(negative.stdout, /arithmetic direction negative control is collected and must fail/)
	match(negative.stdout, /fail 1/)
})
