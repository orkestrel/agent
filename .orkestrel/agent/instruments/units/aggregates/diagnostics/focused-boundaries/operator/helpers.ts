import type { JudgeQuestion } from '../../../.orkestrel/agent/instruments/harness/node_modules/@orkestrel/agent/dist/src/core/index.js'
import type { ExecutionOptions } from '../aggregate-judge-counterfactual/types.ts'
import type { AtomicCheck, BoundaryPair, Candidate, CandidateStatistic, Comparison, ComponentReading, Composition, RankingResult, RequestEntry, ScreenPacket } from './types.ts'
import { existsSync, lstatSync, realpathSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { isJudgeQuestion } from '../../../.orkestrel/agent/instruments/harness/node_modules/@orkestrel/agent/dist/src/core/index.js'
import { BUILD, BUILD_HASH, ROOT } from '../aggregate-judge-counterfactual/constants.ts'
import { computeHash, readArray, readBinding, readJSON, readNumber, readObject, readPacket, readString } from '../aggregate-judge-counterfactual/helpers.ts'
import { partitionCandidate, readSpan, renderState, validateCoverage, validateState } from '../aggregate-focused-screen/helpers.ts'
import { renderState as renderGuard, validateState as validateGuard } from '../aggregate-admission-screen-r2/helpers.ts'
import { FOCUSED, FOCUSED_HASH, LABELS, LABELS_HASH, OPERATOR_FILES, PACKET, POPULATION, POPULATION_HASH, PREDECESSOR, PREDECESSOR_HASH, SPECIFICATION, SPECIFICATION_HASH, UNIT } from './constants.ts'
import { isComponentReading, isSupportLabel } from './validators.ts'

/** Builds complete row membership from frozen population and settled labels.
 * @param population - The decoded original population
 * @param labels - The decoded root label map
 * @param specification - The decoded fixed screen
 * @returns The exact validated composition
 * @example buildComposition(readJSON(POPULATION), readJSON(LABELS), readJSON(SPECIFICATION))
 */
export function buildComposition(population: unknown, labels: unknown, specification: unknown): Composition {
	const original = readObject(population)
	const settled = readObject(labels)
	const screen = readObject(specification)
	if (!isJudgeQuestion(original.question) || screen.revision !== 'focus-boundary-1' || settled.revision !== screen.revision || JSON.stringify(settled.population) !== JSON.stringify(screen.population) || readObject(screen.population).sha256 !== POPULATION_HASH) throw new Error('Frozen population/question/label binding mismatch')
	const labelrows = readArray(settled.rows).map(readObject)
	const rawrows = readArray(original.rows).map(readObject)
	if (rawrows.length === 0 || rawrows.length !== labelrows.length) throw new Error('Root label membership mismatch')
	const rows: Candidate[] = rawrows.map((row, index) => {
		const label = labelrows[index]
		const id = readString(row.id)
		const candidate = readString(row.candidate)
		if (!/^[a-f0-9]{64}$/.test(id) || label === undefined || id !== label.id || !isSupportLabel(label.whole)) throw new Error('Settled row identity/whole mismatch')
		const sources = readArray(row.sources)
		if (sources.length === 0) throw new Error('Ordered original sources absent')
		const declared = readArray(row.spans).map(readSpan)
		validateCoverage(candidate, declared)
		if (JSON.stringify(declared) !== JSON.stringify(partitionCandidate(candidate))) throw new Error('Original exhaustive span partition mismatch')
		const spanlabels = readArray(label.spans).map(readObject)
		if (spanlabels.length !== declared.length) throw new Error('Settled span membership mismatch')
		const spans = declared.map((span, ordinal) => {
			const entry = spanlabels[ordinal]
			if (entry === undefined || entry.start !== span.start || entry.end !== span.end || !isSupportLabel(entry.label)) throw new Error('Settled span offset/label mismatch')
			validateState(renderState(sources, candidate, span), sources, candidate, span)
			return { ...span, label: entry.label }
		})
		return { id, candidate, sources, whole: label.whole, spans }
	})
	if (new Set(rows.map(row => row.id)).size !== rows.length || JSON.stringify(rows.map(row => row.id)) !== JSON.stringify(rows.map(row => row.id).toSorted())) throw new Error('Opaque population order/uniqueness mismatch')
	const pairs: BoundaryPair[] = readArray(screen.pairs).map(value => {
		const pair = readObject(value)
		const supported = readString(pair.supported)
		const unsafe = readString(pair.unsafe)
		const positive = rows.find(row => row.id === supported)
		const negative = rows.find(row => row.id === unsafe)
		if (positive?.whole !== 'supported' || negative === undefined || negative.whole === 'supported' || JSON.stringify(positive.sources) !== JSON.stringify(negative.sources)) throw new Error('Fixed pair settled support/source mismatch')
		return { boundary: readString(pair.boundary), supported, unsafe }
	})
	const anchor = readObject(screen.anchor)
	const supported = readObject(anchor.supported)
	const unsupported = readObject(anchor.unsupported)
	const anchors = { supported: { id: readString(supported.id), start: readNumber(supported.start), end: readNumber(supported.end) }, unsupported: { id: readString(unsupported.id), start: readNumber(unsupported.start), end: readNumber(unsupported.end) } }
	for (const [entry, expected] of [[anchors.supported, 'supported'], [anchors.unsupported, 'unsupported']] as const) {
		const row = rows.find(value => value.id === entry.id)
		if (row === undefined || row.whole === 'supported' || row.spans.find(span => span.start === entry.start && span.end === entry.end)?.label !== expected || pairs.some(pair => pair.supported === entry.id || pair.unsafe === entry.id)) throw new Error('Original anchor focus/whole distinction mismatch')
	}
	const paired = pairs.flatMap(pair => [pair.supported, pair.unsafe])
	if (new Set(paired).size !== paired.length || new Set([...paired, anchors.supported.id, anchors.unsupported.id]).size !== rows.length) throw new Error('Fixed pair/anchor population membership mismatch')
	return { question: original.question, rows, pairs, anchor: anchors }
}

/** Builds every contextual focus followed by its unchanged whole guard.
 * @param composition - The validated complete population
 * @param guard - The unchanged l8 whole-candidate question
 * @returns Atomic checks in exact forward order
 * @example buildChecks(composition, guard)
 */
export function buildChecks(composition: Composition, guard: JudgeQuestion): readonly AtomicCheck[] {
	return composition.rows.flatMap(row => [
		...row.spans.map(span => ({ name: `${row.id}-focus-${span.start}-${span.end}`, row: row.id, category: 'focus' as const, label: span.label, focus: { start: span.start, end: span.end, text: span.text }, state: renderState(row.sources, row.candidate, span), question: composition.question })),
		{ name: `${row.id}-guard`, row: row.id, category: 'guard' as const, label: row.whole, focus: undefined, state: renderGuard(row.sources, row.candidate), question: guard },
	])
}

/** Builds the forward sequence and the exact reverse of all atomic checks.
 * @param checks - Atomic checks in frozen population order
 * @returns Ordinal request membership in independent passes
 * @example buildSequence([]) // []
 */
export function buildSequence(checks: readonly AtomicCheck[]): readonly RequestEntry[] {
	return [...checks.map((check, index) => ({ ordinal: index + 1, name: check.name, pass: 'forward' as const })), ...checks.toReversed().map((check, index) => ({ ordinal: checks.length + index + 1, name: check.name, pass: 'reverse' as const }))]
}

/** Computes owned executable-source custody.
 * @returns The exact runtime-source SHA-256
 * @example computeOperator()
 */
export function computeOperator(): string {
	return computeHash(JSON.stringify(OPERATOR_FILES.map(name => [name, readBinding(resolve(UNIT, name)).hash])))
}

/** Validates complete prepared membership against immutable inputs.
 * @param packet - The prepared packet
 * @returns Nothing when frozen composition and request counts agree
 * @example validatePopulation(packet)
 */
export function validatePopulation(packet: ScreenPacket): void {
	const composition = buildComposition(readJSON(POPULATION), readJSON(LABELS), readJSON(SPECIFICATION))
	const predecessor = readPacket(readJSON(PREDECESSOR))
	const focus = readObject(readJSON(FOCUSED))
	if (!isJudgeQuestion(predecessor.question) || JSON.stringify(packet.guard) !== JSON.stringify(predecessor.question) || JSON.stringify(packet.question) !== JSON.stringify(composition.question) || JSON.stringify(packet.question.criteria) !== JSON.stringify(predecessor.question.criteria) || JSON.stringify(packet.question) !== JSON.stringify(focus.question) || packet.identity !== predecessor.identity || packet.digest !== predecessor.digest || packet.identity !== focus.identity) throw new Error('Unchanged guard/question/identity custody mismatch')
	if (JSON.stringify({ question: packet.question, rows: packet.rows, pairs: packet.pairs, anchor: packet.anchor }) !== JSON.stringify(composition)) throw new Error('Frozen complete composition mismatch')
	const checks = buildChecks(composition, predecessor.question)
	const sequence = buildSequence(checks)
	const requests = readObject(readObject(readJSON(SPECIFICATION)).requests)
	if (checks.length !== requests.forward || checks.length !== requests.reverse || sequence.length !== requests.total || JSON.stringify(packet.checks) !== JSON.stringify(checks) || JSON.stringify(packet.sequence) !== JSON.stringify(sequence) || JSON.stringify(packet.rendering.map(entry => entry.name)) !== JSON.stringify(checks.map(check => check.name))) throw new Error('Frozen atomic membership/sequence/count mismatch')
	for (const check of checks) {
		const row = composition.rows.find(entry => entry.id === check.row)
		if (row === undefined) throw new Error('Check row absent')
		if (check.focus === undefined) validateGuard(check.state, row.sources, row.candidate)
		else validateState(check.state, row.sources, row.candidate, check.focus)
	}
}

/** Reads prepared fields while preserving all frozen data for validation.
 * @param value - The decoded prepared packet
 * @returns A checked packet with recreated complete membership
 * @example readScreen(readJSON(PACKET))
 */
export function readScreen(value: unknown): ScreenPacket {
	const packet = readObject(value)
	const composition = buildComposition(readJSON(POPULATION), readJSON(LABELS), readJSON(SPECIFICATION))
	const guard = packet.guard
	if (!isJudgeQuestion(guard)) throw new Error('Malformed whole guard')
	const checks = buildChecks(composition, guard)
	const sequence = buildSequence(checks)
	if (JSON.stringify(packet.rows) !== JSON.stringify(composition.rows) || JSON.stringify(packet.pairs) !== JSON.stringify(composition.pairs) || JSON.stringify(packet.anchor) !== JSON.stringify(composition.anchor) || JSON.stringify(packet.question) !== JSON.stringify(composition.question) || JSON.stringify(packet.checks) !== JSON.stringify(checks) || JSON.stringify(packet.sequence) !== JSON.stringify(sequence)) throw new Error('Serialized packet composition mismatch')
	return { ...composition, guard, checks, sequence, identity: readString(packet.identity), digest: readString(packet.digest), operator: readString(packet.operator), bindings: readArray(packet.bindings).map(value => { const binding = readObject(value); return readBinding(resolve(ROOT, readString(binding.path)), readString(binding.hash)) }), rendering: readArray(packet.rendering).map(value => { const rendering = readObject(value); return { name: readString(rendering.name), body: readString(rendering.body) } }) }
}

/** Refuses occupied outputs and paths escaping the identity-bound runtime directory.
 * @param path - The proposed output descendant
 * @returns Nothing when output custody holds
 * @example validateDestination('OWNED_DIRECTORY/live')
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

/** Validates all local execution custody before output creation or HTTP.
 * @param options - Exact packet, build, and operator hashes with vacant output
 * @returns The complete admitted packet
 * @example validateExecution({ packet: 'HASH', build: 'HASH', operator: 'HASH', output: 'DIRECTORY' })
 */
export function validateExecution(options: ExecutionOptions): ScreenPacket {
	if (!/^[a-f0-9]{64}$/.test(options.packet) || !/^[a-f0-9]{64}$/.test(options.operator) || options.build !== BUILD_HASH) throw new Error('Expected exact packet/build/operator hashes')
	readBinding(PACKET, options.packet)
	readBinding(BUILD, options.build)
	readBinding(POPULATION, POPULATION_HASH)
	readBinding(LABELS, LABELS_HASH)
	readBinding(SPECIFICATION, SPECIFICATION_HASH)
	readBinding(PREDECESSOR, PREDECESSOR_HASH)
	readBinding(FOCUSED, FOCUSED_HASH)
	if (computeOperator() !== options.operator) throw new Error('Operator hash mismatch')
	validateDestination(options.output)
	const packet = readScreen(readJSON(PACKET))
	if (packet.operator !== options.operator) throw new Error('Frozen operator mismatch')
	validatePopulation(packet)
	return packet
}

/** Reduces every focus and guard separately per pass and compares fixed pairs.
 * @param packet - The validated complete composition and sequence
 * @param readings - Unknown readings; missing or malformed evidence remains incomplete
 * @returns Every component and minimum, with strict independent comparisons
 * @example computeRanking(packet, []).status // 'incomplete'
 */
export function computeRanking(packet: ScreenPacket, readings: readonly unknown[]): RankingResult {
	const valid: ComponentReading[] = []
	let error: string | undefined
	if (readings.length > packet.sequence.length) error = 'Extraneous readings'
	for (const [index, reading] of readings.entries()) {
		const expected = packet.sequence[index]
		const check = expected === undefined ? undefined : packet.checks.find(entry => entry.name === expected.name)
		if (!isComponentReading(reading) || expected === undefined || check === undefined || reading.ordinal !== expected.ordinal || reading.name !== expected.name || reading.pass !== expected.pass || reading.row !== check.row || reading.label !== check.label) { error = 'Malformed or mismatched reading membership'; continue }
		valid.push(reading)
	}
	const statistics: CandidateStatistic[] = []
	for (const pass of ['forward', 'reverse'] as const) for (const row of packet.rows) {
		const expected = packet.checks.filter(check => check.row === row.id)
		const components = valid.filter(reading => reading.row === row.id && reading.pass === pass)
		const complete = components.length === expected.length && new Set(components.map(reading => reading.name)).size === expected.length && expected.every(check => components.some(reading => reading.name === check.name))
		statistics.push({ row: row.id, pass, label: row.whole, components, score: error === undefined && complete ? Math.min(...components.map(reading => reading.score)) : undefined })
	}
	if (error !== undefined || valid.length !== packet.sequence.length || statistics.some(statistic => statistic.score === undefined)) return { status: 'incomplete', statistics, comparisons: [], error }
	const comparisons: Comparison[] = []
	for (const pass of ['forward', 'reverse'] as const) {
		for (const pair of packet.pairs) {
			const supported = statistics.find(statistic => statistic.pass === pass && statistic.row === pair.supported)
			const unsafe = statistics.find(statistic => statistic.pass === pass && statistic.row === pair.unsafe)
			if (supported?.score === undefined || unsafe?.score === undefined) return { status: 'incomplete', statistics, comparisons: [], error: 'Pair statistic absent' }
			comparisons.push({ pass, boundary: pair.boundary, supported: { id: pair.supported, score: supported.score }, unsafe: { id: pair.unsafe, score: unsafe.score }, exceeds: supported.score > unsafe.score })
		}
		const supported = packet.checks.find(check => check.row === packet.anchor.supported.id && check.focus?.start === packet.anchor.supported.start && check.focus.end === packet.anchor.supported.end)
		const unsafe = packet.checks.find(check => check.row === packet.anchor.unsupported.id && check.focus?.start === packet.anchor.unsupported.start && check.focus.end === packet.anchor.unsupported.end)
		const positive = valid.find(reading => reading.pass === pass && reading.name === supported?.name)
		const negative = valid.find(reading => reading.pass === pass && reading.name === unsafe?.name)
		if (positive === undefined || negative === undefined) return { status: 'incomplete', statistics, comparisons: [], error: 'Original anchor reading absent' }
		comparisons.push({ pass, boundary: 'original anchor focus', supported: { id: positive.row, score: positive.score }, unsafe: { id: negative.row, score: negative.score }, exceeds: positive.score > negative.score })
	}
	return { status: comparisons.every(comparison => comparison.exceeds) ? 'passed' : 'refused', statistics, comparisons, error: undefined }
}
