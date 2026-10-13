import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Binding } from '../aggregate-capacity-probe/types.ts'
import { LIMITS, PACKET, PREPARED, ROOT, UNIT } from '../aggregate-capacity-probe/constants.ts'
import { buildPacket, computeOperator, readFileBinding } from '../aggregate-capacity-probe/helpers.ts'
import { readArray, readNumber, readObject, readString, writeArtifact, computeHash } from '../aggregate-judge-counterfactual/helpers.ts'
import { Validation } from './Validation.ts'

const WORK = resolve(UNIT, '../aggregate-capacity-probe-verify-2')
const EVIDENCE = resolve(UNIT, 'independent-check-2')
const INVENTORY = resolve(UNIT, 'final-source-inventory.json')
const PREPARED_INVENTORY = resolve(PREPARED, 'inventory.json')
const expectedPacket = '27ff15eb80f8dba7d236cdf08e4330a3e37ddd8fd9a46afaf11ddd77f2a9f7d2'
const expectedOperator = 'b054ebc86779435ff2935b9a1a669d9a7eac6f20b538ab5fe5d8d6dcce50aa6f'

function capture(name: string, args: readonly string[]): void {
	const result = spawnSync(process.execPath, [...args], { cwd: ROOT, encoding: 'utf8', shell: false, windowsHide: true })
	writeFileSync(resolve(WORK, `${name}.stdout.txt`), result.stdout ?? '')
	writeFileSync(resolve(WORK, `${name}.stderr.txt`), result.stderr ?? '')
	writeFileSync(resolve(WORK, `${name}.exit.txt`), `${result.status ?? 1}\n`)
	if (result.error !== undefined) throw result.error
	assert.equal(result.status, 0, `${name}: ${result.stderr}`)
}

function verifyEntry(value: unknown): Binding {
	const entry = readObject(value)
	const path = readString(entry.path)
	const hash = readString(entry.hash)
	const bytes = readNumber(entry.bytes)
	const binding = readFileBinding(resolve(ROOT, path), hash)
	assert.equal(binding.path, path)
	assert.equal(binding.bytes, bytes)
	return binding
}

if (existsSync(EVIDENCE)) throw new Error(`Evidence destination was not vacant: ${EVIDENCE}`)
const packetBefore = readFileSync(PACKET)
const inventoryBefore = readFileSync(INVENTORY)
const tsc = resolve(ROOT, 'node_modules/typescript/bin/tsc')
capture('strict-tsc', [tsc, '-p', resolve(UNIT, 'tsconfig.json')])
capture('verify-validation-syntax', ['--check', resolve(WORK, 'Validation.ts')])
capture('verify-wrapper-syntax', ['--check', resolve(WORK, 'verify.ts')])

await new Validation().execute()

const packet = buildPacket()
assert.equal(computeOperator(), expectedOperator)
assert.equal(computeHash(readFileSync(PACKET)), expectedPacket)
assert.equal(readFileSync(PACKET, 'utf8'), `${JSON.stringify(packet, null, 2)}\n`)
const sourceInventory = readObject(JSON.parse(inventoryBefore.toString('utf8')))
const sourceRows = [...readArray(sourceInventory.sources), ...readArray(sourceInventory.checks)]
const sourceBindings = sourceRows.map(verifyEntry)
const sourcePacket = verifyEntry(sourceInventory.packet)
const preparedBinding = verifyEntry(sourceInventory.prepared)
const preparedInventory = readObject(JSON.parse(readFileSync(PREPARED_INVENTORY, 'utf8')))
const preparedPacket = verifyEntry(preparedInventory.packet)
assert.equal(readString(preparedInventory.operator), expectedOperator)
const preparedFiles = readArray(preparedInventory.files).map(verifyEntry)
const packetBindings = packet.bindings.map(verifyEntry)
const bodyBindings: Binding[] = []
for (const vector of packet.vectors) {
	const path = resolve(PREPARED, `${vector.id}.request.bin`)
	const body = readFileSync(path, 'utf8')
	assert.equal(body, vector.body, `${vector.id}: request body mismatch`)
	assert.equal(Buffer.byteLength(body), vector.bytes, `${vector.id}: request byte count mismatch`)
	bodyBindings.push(readFileBinding(path, vector.hash))
}
const maximum = Math.max(...packet.vectors.map(vector => vector.bytes))
assert.equal(packet.vectors.length, LIMITS.inference)
assert.ok(maximum <= LIMITS.request)
const membership = packet.models.map(model => ({ model: model.key, ids: packet.vectors.filter(vector => vector.model === model.key).map(vector => vector.id) }))
const packetAfter = readFileSync(PACKET)
const inventoryAfter = readFileSync(INVENTORY)
assert.ok(packetBefore.equals(packetAfter), 'Frozen packet bytes changed during verification')
assert.ok(inventoryBefore.equals(inventoryAfter), 'Frozen source inventory bytes changed during verification')

writeArtifact(resolve(EVIDENCE, 'independent-bindings.json'), {
	pass: true,
	packet: readFileBinding(PACKET),
	operator: computeOperator(),
	finalInventory: readFileBinding(INVENTORY),
	preparedInventory: readFileBinding(PREPARED_INVENTORY),
	unchanged: { packet: computeHash(packetAfter), finalInventory: computeHash(inventoryAfter) },
	counts: { declaredSourcesAndChecks: sourceBindings.length, finalPacketAndPrepared: 2, preparedInventoryFiles: preparedFiles.length, packetBindings: packetBindings.length, requestBodies: bodyBindings.length, inference: packet.vectors.length },
	maximumRequestBytes: maximum,
	membership,
	bindings: { sourcesAndChecks: sourceBindings, sourcePacket: [sourcePacket], sourcePrepared: [preparedBinding], preparedPacket: [preparedPacket], preparedFiles, packet: packetBindings, requestBodies: bodyBindings },
})
console.log(JSON.stringify({ pass: true, packet: readFileBinding(PACKET), operator: computeOperator(), inference: packet.vectors.length, maximum, membership }))


