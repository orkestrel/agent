import type { AggregateSource } from '../../../.orkestrel/agent/instruments/harness/.build/bench5/types.js'
import type { ExecutionOptions, Packet } from '../aggregate-judge-counterfactual/types.ts'
import type { Comparison, RankingReading, RankingResult, ScreenPacket } from './types.ts'
import { existsSync, lstatSync, realpathSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { renderSource } from '../../../.orkestrel/agent/instruments/harness/.build/bench5/aggregates/helpers.js'
import { BUILD, BUILD_HASH, ROOT } from '../aggregate-judge-counterfactual/constants.ts'
import { computeHash, readArray, readBinding, readJSON, readNumber, readObject, readPacket, readString } from '../aggregate-judge-counterfactual/helpers.ts'
import { OPERATOR_FILES, PACKET, PREDECESSOR, PREDECESSOR_HASH, SEQUENCE, SPECIFICATION, SPECIFICATION_HASH, UNIT } from './constants.ts'

/** Reads only the fields the emitted source renderer consumes.
 * @param value - An original source object; extra fields remain in the packet
 * @returns A source projection accepted by the installed renderer
 * @example readSource({ id: 'source', sentence: 0, role: 'user', text: 'Complete.', day: '2026-10-10' })
 */
export function readSource(value: unknown): AggregateSource {
	const source = readObject(value)
	const role = source.role
	if (role !== 'system' && role !== 'user' && role !== 'assistant' && role !== 'tool') throw new Error('Malformed source role')
	return { id: readString(source.id), sentence: readNumber(source.sentence), role, text: readString(source.text), day: readString(source.day) }
}

/** Renders evidence before the candidate with the specification's serialization.
 * @param sources - The complete original ordered sources
 * @param candidate - The complete unchanged variant prose
 * @returns The JSON state with one-space indentation and retained escaping
 * @example renderState([], 'Complete.')
 */
export function renderState(sources: readonly unknown[], candidate: string): string {
	return JSON.stringify({ evidence: sources.map(source => renderSource(readSource(source))), candidate }, null, 1)
}

/** Checks custody through a separate JSON decode of a rendered state.
 * @param state - The serialized state to check
 * @param sources - The expected original ordered sources
 * @param candidate - The expected exact variant prose
 * @returns Nothing when complete source and candidate custody holds
 * @example validateState(renderState([], 'Complete.'), [], 'Complete.')
 */
export function validateState(state: string, sources: readonly unknown[], candidate: string): void {
	const decoded = readObject(JSON.parse(state))
	if (JSON.stringify(Object.keys(decoded)) !== JSON.stringify(['evidence', 'candidate']) || decoded.candidate !== candidate) throw new Error('Candidate/property custody mismatch')
	const evidence = readArray(decoded.evidence).map(readString)
	if (evidence.length !== sources.length) throw new Error('Source membership custody mismatch')
	for (const [index, value] of sources.entries()) {
		const source = readObject(value)
		if (evidence[index] !== `(${readString(source.day)}) ${readString(source.role)}: ${readString(source.text)}`) throw new Error('Ordered source custody mismatch')
	}
}

/** Computes the digest of the exact executable instrument bytes.
 * @returns The source-population SHA-256
 * @example computeOperator()
 */
export function computeOperator(): string {
	return computeHash(JSON.stringify(OPERATOR_FILES.map(name => [name, readBinding(resolve(UNIT, name)).hash])))
}

/** Reads the packet and its additional frozen custody fields.
 * @param value - The decoded packet
 * @returns The checked packet shape
 * @example readScreen(readJSON(PACKET))
 */
export function readScreen(value: unknown): ScreenPacket {
	const row = readObject(value)
	return { ...readPacket(row), specification: readBinding(SPECIFICATION, readString(readObject(row.specification).hash)), predecessor: readBinding(PREDECESSOR, readString(readObject(row.predecessor).hash)), operator: readString(row.operator) }
}

/** Checks predecessor custody while allowing only the frozen question and rendering changes.
 * @param packet - The screen packet
 * @param predecessor - The accepted diagnostic packet
 * @returns Nothing when every unchanged semantic field agrees
 * @example validatePopulation(readScreen(readJSON(PACKET)), readPacket(readJSON(PREDECESSOR)))
 */
export function validatePopulation(packet: Packet, predecessor: Packet): void {
	if (packet.id !== predecessor.id || packet.identity !== predecessor.identity || packet.digest !== predecessor.digest || packet.separator !== predecessor.separator || packet.suffix !== predecessor.suffix || JSON.stringify(packet.sources) !== JSON.stringify(predecessor.sources) || JSON.stringify(packet.sequence) !== JSON.stringify(SEQUENCE) || JSON.stringify(predecessor.sequence) !== JSON.stringify(SEQUENCE)) throw new Error('Predecessor population custody mismatch')
	if (packet.variants.length !== predecessor.variants.length) throw new Error('Variant membership custody mismatch')
	for (const [index, variant] of packet.variants.entries()) {
		const original = predecessor.variants[index]
		if (original === undefined || variant.name !== original.name || variant.expectation !== original.expectation || variant.repair !== original.repair || variant.cause !== original.cause || variant.candidate !== original.candidate) throw new Error('Variant semantic custody mismatch')
		validateState(variant.state, predecessor.sources, original.candidate)
		if (variant.state !== renderState(predecessor.sources, original.candidate)) throw new Error('Frozen state serialization mismatch')
	}
}

/** Validates exact execution hashes, every runtime binding, and a vacant owned descendant.
 * @param options - Explicit execution custody arguments
 * @returns The frozen screen packet before any fetch can run
 * @example validateExecution({ packet: 'HASH', build: 'HASH', operator: 'HASH', output: 'DIRECTORY' })
 */
export function validateExecution(options: ExecutionOptions): ScreenPacket {
	if (!/^[a-f0-9]{64}$/.test(options.packet) || !/^[a-f0-9]{64}$/.test(options.operator) || options.build !== BUILD_HASH) throw new Error('Expected exact packet/build/operator hash arguments')
	readBinding(PACKET, options.packet)
	readBinding(BUILD, options.build)
	if (computeOperator() !== options.operator) throw new Error('Operator hash mismatch')
	validateDestination(options.output)
	const packet = readScreen(readJSON(PACKET))
	if (packet.operator !== options.operator || packet.specification.hash !== SPECIFICATION_HASH || packet.predecessor.hash !== PREDECESSOR_HASH) throw new Error('Frozen packet custody mismatch')
	for (const binding of packet.bindings) readBinding(resolve(ROOT, binding.path), binding.hash)
	const specification = readObject(readJSON(SPECIFICATION))
	if (JSON.stringify(packet.question) !== JSON.stringify(specification.question)) throw new Error('Frozen question mismatch')
	validatePopulation(packet, readPacket(readJSON(PREDECESSOR)))
	return packet
}

/** Refuses occupied output or a path outside the owned directory.
 * @param path - The proposed create-only descendant
 * @returns Nothing when output custody holds
 * @example validateDestination('OWNED_DIRECTORY')
 */
export function validateDestination(path: string): void {
	const output = resolve(path)
	const descendant = relative(realpathSync(UNIT), output)
	if (descendant === '' || descendant === '..' || descendant.startsWith(`..${sep}`) || isAbsolute(descendant)) throw new Error('Output must be a descendant of the owned directory')
	let cursor = realpathSync(UNIT)
	for (const segment of descendant.split(sep)) {
		cursor = resolve(cursor, segment)
		if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) throw new Error('Output crosses a symbolic link')
	}
	if (existsSync(output)) throw new Error('Output directory is occupied')
}

/** Compares supported and unsupported scores separately in each frozen pass.
 * @param readings - Sequential normalized scores without averaging
 * @returns Incomplete for a prefix, refused for any failed comparison, or passed
 * @example computeRanking([]).status // 'incomplete'
 */
export function computeRanking(readings: readonly RankingReading[]): RankingResult {
	if (readings.length > SEQUENCE.length) throw new Error('Ranking sequence overrun')
	for (const [index, reading] of readings.entries()) {
		if (reading.ordinal !== index + 1 || reading.name !== SEQUENCE[index] || !Number.isFinite(reading.score) || reading.score < 0 || reading.score > 1) throw new Error('Ranking sequence or finite probability mismatch')
	}
	if (readings.length !== SEQUENCE.length) return { status: 'incomplete', comparisons: [] }
	const comparisons: Comparison[] = []
	for (const [offset, pass] of [[0, 'forward'], [4, 'reverse']] as const) {
		const batch = readings.slice(offset, offset + 4)
		const supported = batch.find(reading => reading.name === 'both-removed')
		if (supported === undefined) throw new Error('Supported ranking member absent')
		for (const unsupported of batch.filter(reading => reading.name !== 'both-removed')) comparisons.push({ pass, name: unsupported.name, supported: supported.score, unsupported: unsupported.score, exceeds: supported.score > unsupported.score })
	}
	return { status: comparisons.every(comparison => comparison.exceeds) ? 'passed' : 'refused', comparisons }
}
