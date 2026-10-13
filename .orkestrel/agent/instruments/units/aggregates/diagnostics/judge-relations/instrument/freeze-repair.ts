import { resolve } from 'node:path'
import { BUILD, PACKET, ROOT, UNIT } from './constants.ts'
import { computeOperator, readArray, readBinding, readJSON, readObject, readString, writeArtifact } from './helpers.ts'

const precursor = resolve(UNIT, 'plan-ready.json')
const plan = readObject(readJSON(precursor))
const packet = readObject(readJSON(PACKET))
readBinding(PACKET, readString(readObject(plan.packet).hash))
readBinding(BUILD, readString(plan.build))
for (const entry of readArray(packet.bindings)) {
	const binding = readObject(entry)
	readBinding(resolve(ROOT, readString(binding.path)), readString(binding.hash))
}
const successor = resolve(UNIT, 'plan-ready-repair-typed.json')
writeArtifact(successor, { ...plan, operator: computeOperator(), frozen: new Date().toISOString(), supersedes: { plan: readBinding(precursor), operator: plan.operator, reason: 'Per-request completion persists actual result or unavailable/error status and independent explicit raw-field absence even when actual decoding rejects; packet, identities, settings, renderings, and sequence unchanged' } })
console.log(JSON.stringify({ successor: readBinding(successor), packet: readBinding(PACKET), operator: computeOperator(), inference: 0 }))
