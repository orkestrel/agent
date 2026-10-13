import { deepStrictEqual, equal, ok, rejects } from 'node:assert'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { createOllamaJudge, OllamaJudge } from '../../../.orkestrel/agent/instruments/harness/.build/vendor/ollama/index.js'
import { isJudgeQuestion } from '../../../.orkestrel/agent/instruments/harness/node_modules/@orkestrel/agent/dist/src/core/index.js'
import { Completion } from './Completion.ts'
import { PACKET, UNIT } from './constants.ts'
import { computeHash, describeField, readArray, readJSON, readNumber, readObject, readPacket, readString } from './helpers.ts'
import { NetworkWitness } from './NetworkWitness.ts'

test('real decoder rejection retains per-request unavailable result and explicit missing logprobs evidence', async () => {
	const output = resolve(UNIT, `proof-completion-rejected-${process.pid}-${Date.now()}`)
	mkdirSync(output)
	const packet = readPacket(readJSON(PACKET))
	const tuple = readArray(JSON.parse(packet.identity))
	const judge = createOllamaJudge({ model: readString(tuple[0]), system: readString(tuple[1]), calibration: { temperature: readNumber(tuple[2]) }, options: readObject(tuple[3]) })
	ok(judge instanceof OllamaJudge)
	ok(isJudgeQuestion(packet.question))
	const request = { state: packet.variants[0]?.state ?? '', questions: { agree: packet.question } }
	const witness = new NetworkWitness()
	try {
		for (const [index, raw] of [{ done: true, response: 'Yes', done_reason: 'length', prompt_eval_count: 20, eval_count: 1 }, { done: true }].entries()) {
			const label = `rejected-${index}`
			const bytes = Buffer.from(JSON.stringify(raw))
			const original = Buffer.from(bytes)
			writeFileSync(resolve(output, `${label}.response.bin`), bytes, { flag: 'wx' })
			let rejection: unknown
			await rejects(new Completion({ output, label, capture: { response: bytes } }).execute(() => {
				try { return judge.read(raw, request) }
				catch (error) { rejection = error; throw error }
			}), error => { equal(error, rejection); return true })
			ok(rejection instanceof Error)
			equal(readObject(rejection).code, 'PROTOCOL')
			const normalized = readObject(readJSON(resolve(output, `${label}.normalized.json`)))
			equal(normalized.availability, 'unavailable')
			equal(readObject(normalized.error).message, rejection.message)
			ok(!('result' in normalized))
			const wire = readObject(readJSON(resolve(output, `${label}.wire-evidence.json`)))
			deepStrictEqual(wire.top, { availability: 'absent' })
			if (index === 1) {
				deepStrictEqual(wire.token, { availability: 'absent' })
				deepStrictEqual(wire.finish, { availability: 'absent' })
				deepStrictEqual(readObject(wire.usage).prompt, { availability: 'absent' })
			} else {
				deepStrictEqual(wire.token, { availability: 'present', value: 'Yes' })
				deepStrictEqual(wire.finish, { availability: 'present', value: 'length' })
			}
			deepStrictEqual(readObject(wire.timing).total, { availability: 'absent' })
			equal(readObject(wire.body).hash, computeHash(original))
			deepStrictEqual(bytes, original)
			deepStrictEqual(readFileSync(resolve(output, `${label}.response.bin`)), original)
		}
		equal(witness.count, 0)
	} finally { witness.close() }
})

test('complete emitted decoder result passes through unchanged with present raw evidence', async () => {
	const output = resolve(UNIT, `proof-completion-returned-${process.pid}-${Date.now()}`)
	mkdirSync(output)
	const packet = readPacket(readJSON(PACKET))
	const tuple = readArray(JSON.parse(packet.identity))
	const judge = createOllamaJudge({ model: readString(tuple[0]), system: readString(tuple[1]), calibration: { temperature: readNumber(tuple[2]) }, options: readObject(tuple[3]) })
	ok(judge instanceof OllamaJudge)
	ok(isJudgeQuestion(packet.question))
	const request = { state: packet.variants[0]?.state ?? '', questions: { agree: packet.question } }
	const raw = { done: true, response: 'Yes', done_reason: 'length', prompt_eval_count: 20, eval_count: 1, logprobs: [{ top_logprobs: [{ token: 'Yes', logprob: -0.2 }, { token: 'No', logprob: -2.2 }] }] }
	let actual: ReturnType<typeof judge.read> | undefined
	const result = await new Completion({ output, label: 'returned', capture: { response: Buffer.from(JSON.stringify(raw)) } }).execute(() => { actual = judge.read(raw, request); return actual })
	equal(result, actual)
	const normalized = readObject(readJSON(resolve(output, 'returned.normalized.json')))
	equal(normalized.availability, 'present')
	deepStrictEqual(normalized.result, actual)
	ok(!('error' in normalized))
	const wire = readObject(readJSON(resolve(output, 'returned.wire-evidence.json')))
	deepStrictEqual(wire.top, { availability: 'present', value: raw.logprobs })
	deepStrictEqual(readObject(wire.usage).completion, { availability: 'present', value: 1 })
	deepStrictEqual(readObject(wire.timing).evaluation, { availability: 'absent' })
	deepStrictEqual(describeField({ response: null }, 'response', 'absent'), { availability: 'present', value: null })
})

test('malformed JSON and absent capture describe raw fields and preserve the original rejection', async () => {
	const output = resolve(UNIT, `proof-completion-unreadable-${process.pid}-${Date.now()}`)
	mkdirSync(output)
	const packet = readPacket(readJSON(PACKET))
	const tuple = readArray(JSON.parse(packet.identity))
	const judge = createOllamaJudge({ model: readString(tuple[0]), system: readString(tuple[1]), calibration: { temperature: readNumber(tuple[2]) }, options: readObject(tuple[3]) })
	ok(judge instanceof OllamaJudge)
	ok(isJudgeQuestion(packet.question))
	const request = { state: packet.variants[0]?.state ?? '', questions: { agree: packet.question } }
	for (const [index, bytes] of [Buffer.from('{invalid'), undefined].entries()) {
		const label = `unreadable-${index}`
		let rejection: unknown
		await rejects(new Completion({ output, label, capture: { response: bytes } }).execute(() => {
			try { return judge.read(bytes === undefined ? undefined : JSON.parse(bytes.toString('utf8')), request) }
			catch (error) { rejection = error; throw error }
		}), error => { equal(error, rejection); return true })
		ok(rejection instanceof Error)
		const normalized = readObject(readJSON(resolve(output, `${label}.normalized.json`)))
		equal(normalized.availability, 'unavailable')
		equal(readObject(normalized.error).message, rejection.message)
		const wire = readObject(readJSON(resolve(output, `${label}.wire-evidence.json`)))
		const availability = bytes === undefined ? 'absent' : 'unparseable'
		equal(readObject(wire.body).availability, availability)
		for (const field of [wire.token, wire.finish, wire.top, ...Object.values(readObject(wire.usage)), ...Object.values(readObject(wire.timing))]) deepStrictEqual(field, { availability })
		if (bytes !== undefined) equal(readObject(wire.body).hash, computeHash(bytes))
	}
})
