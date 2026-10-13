import { strict as assert } from 'node:assert'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, relative, resolve, sep } from 'node:path'
import type { Binding, Capture } from '../aggregate-capacity-probe/types.ts'
import { LIMITS, PACKET, PREPARED, ROOT, UNIT } from '../aggregate-capacity-probe/constants.ts'
import { buildPacket, computeOperator, readFileBinding } from '../aggregate-capacity-probe/helpers.ts'
import { computeHash, readArray, readNumber, readObject, readString, writeArtifact } from '../aggregate-judge-counterfactual/helpers.ts'

interface CheckedCapture {
	readonly capture: Capture
	readonly request: Record<string, unknown>
	readonly head: Record<string, unknown>
	readonly response: Buffer
}

function readJSON(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'))
}

function readCapture(value: unknown): Capture {
	const row = readObject(value)
	if (typeof row.complete !== 'boolean' || typeof row.breached !== 'boolean') throw new Error('Capture flags are absent')
	const status = row.status === undefined ? undefined : readNumber(row.status)
	return {
		id: readString(row.id),
		complete: row.complete,
		breached: row.breached,
		bytes: readNumber(row.bytes),
		hash: readString(row.hash),
		...(status === undefined ? {} : { status }),
		started: readString(row.started),
		finished: readString(row.finished),
		duration: readNumber(row.duration),
		...(row.error === undefined ? {} : { error: row.error }),
	}
}

function readBinding(value: unknown): Binding {
	const row = readObject(value)
	return { path: readString(row.path), hash: readString(row.hash), bytes: readNumber(row.bytes) }
}

function verifyBinding(value: unknown): Binding {
	const expected = readBinding(value)
	const actual = readFileBinding(resolve(ROOT, expected.path), expected.hash)
	assert.equal(actual.path, expected.path)
	assert.equal(actual.bytes, expected.bytes)
	return actual
}

function required<T>(map: ReadonlyMap<string, T>, key: string): T {
	const value = map.get(key)
	if (value === undefined) throw new Error(`Missing capture: ${key}`)
	return value
}

function stringField(row: Record<string, unknown>, key: string): string | undefined {
	return typeof row[key] === 'string' ? readString(row[key]) : undefined
}

function numberField(row: Record<string, unknown>, key: string): number | undefined {
	return typeof row[key] === 'number' ? readNumber(row[key]) : undefined
}

const live = resolve(UNIT, 'live1')
const output = resolve(ROOT, 'tmp/units/aggregate-capacity-probe-live-reading')
const packetTextBefore = readFileSync(PACKET)
const sourceInventoryPath = resolve(UNIT, 'final-source-inventory.json')
const sourceInventoryTextBefore = readFileSync(sourceInventoryPath)
const sourceInventory = readObject(JSON.parse(sourceInventoryTextBefore.toString('utf8')))
const packet = buildPacket()
const packetText = packetTextBefore.toString('utf8')
const packetHash = computeHash(packetTextBefore)
const operator = computeOperator()
const receiptPath = resolve(UNIT, 'daemon-start.json')
const receiptBinding = readFileBinding(receiptPath)
const expectedReceiptHash = '19c077e9190accb54e1e791d2be4493412431d22a86778a1b1e229255854a120'
assert.equal(packetHash, '27ff15eb80f8dba7d236cdf08e4330a3e37ddd8fd9a46afaf11ddd77f2a9f7d2')
assert.equal(operator, 'b054ebc86779435ff2935b9a1a669d9a7eac6f20b538ab5fe5d8d6dcce50aa6f')
assert.equal(receiptBinding.hash, expectedReceiptHash)
assert.equal(packetText, `${JSON.stringify(packet, null, 2)}\n`)

const receipt = readObject(readJSON(receiptPath))
const runtime = readObject(readJSON(resolve(live, 'runtime.json')))
const livePacket = readFileBinding(resolve(live, 'packet.json'))
const liveReceipt = readFileBinding(resolve(live, 'daemon-start.bin'))
const runtimePacket = readBinding(runtime.packet)
const runtimeReceipt = readBinding(runtime.receipt)
assert.equal(livePacket.hash, packetHash)
assert.equal(runtimePacket.hash, packetHash)
assert.equal(readString(runtime.operator), operator)
assert.equal(liveReceipt.hash, receiptBinding.hash)
assert.equal(liveReceipt.bytes, receiptBinding.bytes)
assert.deepEqual(runtimeReceipt, receiptBinding)
assert.deepEqual(readArray(runtime.sources).map(readBinding), packet.bindings)
assert.deepEqual(readObject(runtime.limits), LIMITS)
const receiptValues = readObject(receipt.values)
assert.deepEqual(receiptValues, {
	OLLAMA_HOST: 'http://127.0.0.1:11434',
	OLLAMA_NUM_PARALLEL: '1',
	OLLAMA_MAX_LOADED_MODELS: '0',
	LLAMA_ARG_CONTEXT_SHIFT: '0',
	LLAMA_ARG_N_PARALLEL: '1',
})
assert.equal(readNumber(receipt.pid), 38284)

const finalRows = [...readArray(sourceInventory.sources), ...readArray(sourceInventory.checks)]
const finalSourceBindings = finalRows.map(verifyBinding)
const expectedOperatorBinding = readBinding(sourceInventory.packet)
const expectedPreparedBinding = readBinding(sourceInventory.prepared)
assert.equal(expectedOperatorBinding.hash, packetHash)
assert.equal(readFileBinding(resolve(ROOT, expectedPreparedBinding.path), expectedPreparedBinding.hash).bytes, expectedPreparedBinding.bytes)
const baselinePath = resolve(UNIT, 'independent-check-2/independent-bindings.json')
const baseline = readObject(readJSON(baselinePath))
const baselineBindings = readObject(baseline.bindings)
assert.deepEqual(finalSourceBindings, readArray(baselineBindings.sourcesAndChecks).map(readBinding))

const liveInventoryPath = resolve(live, 'inventory.json')
const liveInventoryBinding = readFileBinding(liveInventoryPath)
const liveInventory = readObject(readJSON(liveInventoryPath))
if (liveInventory.complete !== true) throw new Error('Live inventory is incomplete')
assert.deepEqual(readArray(liveInventory.planned).map(readString), packet.vectors.map(vector => vector.id))
const captureRows = readArray(liveInventory.captures).map(readCapture)
const initialIds = ['initial-version', 'initial-tags', 'initial-ps', ...packet.models.map(model => `initial-show-${model.key}`)]
const expectedIds = [...initialIds, ...packet.vectors.flatMap(vector => [vector.id, `${vector.id}-ps`]), 'final-tags', 'final-ps']
assert.deepEqual(captureRows.map(capture => capture.id), expectedIds)
assert.equal(captureRows.length, 70)
const fileRows = readArray(liveInventory.files).map(readBinding)
const inventoryFiles = new Map(fileRows.map(binding => [binding.path, binding]))
const expectedNames = new Set<string>(['inventory.json'])
for (const entry of fileRows) {
	const actual = verifyBinding(entry)
	assert.deepEqual(actual, entry)
	const path = resolve(ROOT, entry.path)
	expectedNames.add(relative(live, path).split(sep).join('/'))
}
const actualNames = readdirSync(live, { withFileTypes: true }).map(entry => {
	if (!entry.isFile()) throw new Error(`Unexpected directory in live output: ${entry.name}`)
	return entry.name
})
assert.deepEqual([...actualNames].sort(), [...expectedNames].sort())

const vectorById = new Map(packet.vectors.map(vector => [vector.id, vector]))
const checked: CheckedCapture[] = []
for (const capture of captureRows) {
	const requestPath = resolve(live, `${capture.id}.request.json`)
	const captureFile = readCapture(readJSON(resolve(live, `${capture.id}.capture.json`)))
	assert.deepEqual(captureFile, capture, `${capture.id}: capture file differs from inventory`)
	const requestBytesPath = resolve(live, `${capture.id}.request.bin`)
	const headPath = resolve(live, `${capture.id}.response-head.json`)
	const responsePath = resolve(live, `${capture.id}.response.bin`)
	const request = readObject(readJSON(requestPath))
	const head = readObject(readJSON(headPath))
	const requestBinBinding = readFileBinding(requestBytesPath)
	const headBinding = readFileBinding(headPath)
	const responseBinding = readFileBinding(responsePath, capture.hash)
	assert.deepEqual(requestBinBinding, required(inventoryFiles, requestBinBinding.path))
	assert.deepEqual(headBinding, required(inventoryFiles, headBinding.path))
	assert.deepEqual(responseBinding, required(inventoryFiles, responseBinding.path))
	const bodyBytes = readFileSync(requestBytesPath)
	const responseBytes = readFileSync(responsePath)
	assert.equal(capture.bytes, responseBytes.byteLength, `${capture.id}: response byte count`)
	assert.equal(capture.hash, computeHash(responseBytes), `${capture.id}: response hash`)
	assert.equal(head.status, capture.status, `${capture.id}: response status`)
	assert.equal(capture.complete, true, `${capture.id}: incomplete response`)
	assert.equal(capture.breached, false, `${capture.id}: response ceiling`)
	const requestUrl = readString(request.url)
	const route = new URL(requestUrl).pathname
	const method = readString(request.method)
	assert.ok(bodyBytes.byteLength <= LIMITS.request, `${capture.id}: request ceiling`)
	if (request.body !== undefined) {
		const body = readObject(request.body)
		assert.equal(body.bytes, bodyBytes.byteLength, `${capture.id}: request byte count`)
		assert.equal(body.hash, computeHash(bodyBytes), `${capture.id}: request hash`)
	} else {
		assert.equal(bodyBytes.byteLength, 0, `${capture.id}: unexpected request body`)
	}
	const vectorId = vectorById.has(capture.id) ? capture.id : undefined
	if (vectorId !== undefined) {
		const vector = required(vectorById, vectorId)
		assert.equal(method, 'POST')
		assert.equal(route, vector.route)
		assert.equal(bodyBytes.toString('utf8'), vector.body, `${capture.id}: frozen request body`)
		assert.equal(bodyBytes.byteLength, vector.bytes)
		assert.equal(computeHash(bodyBytes), vector.hash)
	} else if (capture.id.endsWith('-ps')) {
		assert.equal(method, 'GET')
		assert.equal(route, '/api/ps')
	} else if (capture.id === 'initial-version') {
		assert.equal(method, 'GET')
		assert.equal(route, '/api/version')
	} else if (capture.id === 'initial-tags' || capture.id === 'final-tags') {
		assert.equal(method, 'GET')
		assert.equal(route, '/api/tags')
	} else if (capture.id === 'initial-ps' || capture.id === 'final-ps') {
		assert.equal(method, 'GET')
		assert.equal(route, '/api/ps')
	} else if (capture.id.startsWith('initial-show-')) {
		assert.equal(method, 'POST')
		assert.equal(route, '/api/show')
	} else {
		throw new Error(`Unexpected capture id: ${capture.id}`)
	}
	const limit = vectorId === undefined ? LIMITS.metadata : LIMITS.response
	assert.ok(responseBytes.byteLength <= limit, `${capture.id}: response ceiling`)
	checked.push({ capture, request, head, response: responseBytes })
}

for (let index = 0; index < captureRows.length - 1; index++) {
	const current = captureRows[index]
	const next = captureRows[index + 1]
	if (current === undefined || next === undefined) throw new Error('Capture sequence has a gap')
	assert.ok(Date.parse(current.finished) <= Date.parse(next.started), `${current.id}: next request started before capture finished`)
}
for (const vector of packet.vectors) {
	const inferenceIndex = captureRows.findIndex(capture => capture.id === vector.id)
	assert.ok(inferenceIndex >= 0)
	assert.equal(captureRows[inferenceIndex + 1]?.id, `${vector.id}-ps`)
}

const checkedById = new Map(checked.map(row => [row.capture.id, row]))
const decoded = new Map<string, Record<string, unknown>>()
const decodeErrors = new Map<string, string>()
for (const row of checked) {
	try {
		decoded.set(row.capture.id, readObject(JSON.parse(row.response.toString('utf8'))))
	} catch (error) {
		decodeErrors.set(row.capture.id, error instanceof Error ? error.message : String(error))
	}
}
const observations = packet.vectors.map(vector => {
	const checkedCapture = required(checkedById, vector.id)
	const native = decoded.get(vector.id)
	const message = native?.message === undefined ? undefined : readObject(native.message)
	const text = typeof native?.response === 'string' ? readString(native.response) : typeof message?.content === 'string' ? readString(message.content) : undefined
	const thinking = typeof message?.thinking === 'string' ? readString(message.thinking) : undefined
	return {
		id: vector.id,
		model: vector.model,
		route: vector.route,
		configuredContext: readObject(JSON.parse(vector.body)).options === undefined ? undefined : readNumber(readObject(readObject(JSON.parse(vector.body)).options).num_ctx),
		configuredPredict: readNumber(readObject(readObject(JSON.parse(vector.body)).options).num_predict),
		status: checkedCapture.capture.status,
		transport: { complete: checkedCapture.capture.complete, breached: checkedCapture.capture.breached, durationMs: checkedCapture.capture.duration, responseBytes: checkedCapture.capture.bytes, responseHash: checkedCapture.capture.hash },
		modelReported: stringField(native ?? {}, 'model'),
		done: typeof native?.done === 'boolean' ? native.done : undefined,
		doneReason: stringField(native ?? {}, 'done_reason'),
		promptEvalCount: numberField(native ?? {}, 'prompt_eval_count'),
		evalCount: numberField(native ?? {}, 'eval_count'),
		promptEvalDuration: numberField(native ?? {}, 'prompt_eval_duration'),
		evalDuration: numberField(native ?? {}, 'eval_duration'),
		totalDuration: numberField(native ?? {}, 'total_duration'),
		loadDuration: numberField(native ?? {}, 'load_duration'),
		serviceError: stringField(native ?? {}, 'error'),
		responseContent: text === undefined ? undefined : { bytes: Buffer.byteLength(text), hash: computeHash(text) },
		thinkingContent: thinking === undefined ? undefined : { bytes: Buffer.byteLength(thinking), hash: computeHash(thinking) },
		decodeError: decodeErrors.get(vector.id),
	}
})
const snapshots = packet.vectors.map(vector => {
	const id = `${vector.id}-ps`
	const native = decoded.get(id)
	const models = native?.models === undefined ? [] : readArray(native.models).map(readObject)
	return { after: vector.id, capture: required(checkedById, id).capture, models }
})
const metadata = ['initial-version', 'initial-tags', 'initial-ps', ...packet.models.map(model => `initial-show-${model.key}`), 'final-tags', 'final-ps'].map(id => ({ id, capture: required(checkedById, id).capture, native: decoded.get(id), decodeError: decodeErrors.get(id) }))
const statusCounts = new Map<number, number>()
for (const row of checked) {
	const status = row.capture.status
	if (status !== undefined) statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1)
}
const packetTextAfter = readFileSync(PACKET)
const sourceInventoryTextAfter = readFileSync(sourceInventoryPath)
assert.ok(packetTextBefore.equals(packetTextAfter), 'Frozen packet changed during live run')
assert.ok(sourceInventoryTextBefore.equals(sourceInventoryTextAfter), 'Final source inventory changed during live run')
assert.equal(readFileBinding(PACKET).hash, packetHash)
assert.equal(readFileBinding(receiptPath).hash, expectedReceiptHash)

writeArtifact(resolve(output, 'analysis-verified.json'), {
	pass: true,
	launcher: { exit: 0, capped: false, durationMs: 306155 },
	packet: { hash: packetHash, bytes: packetTextBefore.byteLength },
	operator,
	receipt: { hash: receiptBinding.hash, bytes: receiptBinding.bytes, pid: readNumber(receipt.pid), values: receiptValues },
	runtime: { packet: runtimePacket, receipt: runtimeReceipt, sources: readArray(runtime.sources).length },
	inventory: { hash: liveInventoryBinding.hash, bytes: liveInventoryBinding.bytes, complete: liveInventory.complete, captures: captureRows.length, captureFiles: fileRows.length },
	statusCounts: Object.fromEntries(statusCounts),
	limits: LIMITS,
	planned: packet.vectors.map(vector => vector.id),
	observations,
	snapshots,
	metadata,
	unchanged: { packet: computeHash(packetTextAfter), finalSourceInventory: computeHash(sourceInventoryTextAfter) },
})
console.log(JSON.stringify({ pass: true, inventory: liveInventoryBinding, captures: captureRows.length, files: fileRows.length, statusCounts: Object.fromEntries(statusCounts), packet: packetHash, operator, receipt: expectedReceiptHash }))
