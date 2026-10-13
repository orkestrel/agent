import { deepStrictEqual, equal, notEqual, ok, rejects, throws } from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { AgentJudge } from '../../../.orkestrel/agent/instruments/harness/node_modules/@orkestrel/agent/dist/src/core/index.js'
import { createOllamaJudge } from '../../../.orkestrel/agent/instruments/harness/.build/vendor/ollama/index.js'
import { BUILD_HASH, DAEMON } from '../aggregate-judge-counterfactual/constants.ts'
import { readArray, readBinding, readJSON, readNumber, readObject, readString } from '../aggregate-judge-counterfactual/helpers.ts'
import { NetworkWitness } from '../aggregate-judge-counterfactual/NetworkWitness.ts'
import { LABELS, PACKET, POPULATION, SPECIFICATION, UNIT } from './constants.ts'
import { buildComposition, computeOperator, computeRanking, readScreen, validateExecution, validatePopulation } from './helpers.ts'
import { Operator } from './Operator.ts'
import { buildReadings } from './setup.ts'
import { isComponentReading, isSupportLabel } from './validators.ts'

test('frozen composition derives complete population, spans, guards, and reverse sequence', () => {
	const packet = readScreen(readJSON(PACKET))
	validatePopulation(packet)
	equal(packet.rows.length, 14)
	equal(packet.rows.reduce((count, row) => count + row.spans.length, 0), 30)
	equal(packet.checks.filter(check => check.category === 'guard').length, 14)
	equal(packet.checks.length, 44)
	equal(packet.sequence.length, 88)
	deepStrictEqual(packet.sequence.slice(44).map(entry => entry.name), packet.sequence.slice(0, 44).map(entry => entry.name).toReversed())
	for (const pass of ['forward', 'reverse']) equal(packet.sequence.filter(entry => entry.pass === pass).length, 44)
})

test('actual native bodies preserve every full state and expose only evidence/candidate/focus', () => {
	const packet = readScreen(readJSON(PACKET))
	const tuple = readArray(JSON.parse(packet.identity))
	const judge = createOllamaJudge({ model: readString(tuple[0]), system: readString(tuple[1]), calibration: { temperature: readNumber(tuple[2]) }, options: readObject(tuple[3]), url: DAEMON })
	ok(judge instanceof AgentJudge)
	equal(judge.model, packet.identity)
	for (const [index, check] of packet.checks.entries()) {
		const decoded = readObject(JSON.parse(check.state))
		deepStrictEqual(Object.keys(decoded), check.category === 'guard' ? ['evidence', 'candidate'] : ['evidence', 'candidate', 'focus'])
		const row = packet.rows.find(value => value.id === check.row)
		ok(row !== undefined)
		equal(decoded.candidate, row.candidate)
		equal(readArray(decoded.evidence).length, row.sources.length)
		const body: string = JSON.stringify(judge.body({ state: check.state, questions: { agree: check.question } }))
		equal(body, packet.rendering[index]?.body)
		for (const name of ['boundary', 'supported', 'unsafe', 'whole', 'label', 'rationale', 'pairs', 'ordering']) ok(!Object.hasOwn(decoded, name))
		for (const pair of packet.pairs) ok(!body.includes(pair.boundary))
		ok(!body.includes(check.row))
	}
})

test('complete scoring preserves every component and independent minima without ranking original whole anchors', () => {
	const packet = readScreen(readJSON(PACKET))
	const result = computeRanking(packet, buildReadings(packet))
	equal(result.status, 'passed')
	equal(result.statistics.length, 28)
	equal(result.comparisons.length, 14)
	for (const statistic of result.statistics) {
		equal(statistic.components.length, packet.checks.filter(check => check.row === statistic.row).length)
		equal(statistic.score, Math.min(...statistic.components.map(component => component.score)))
	}
	equal(result.comparisons.filter(comparison => comparison.boundary === 'original anchor focus').length, 2)
	for (const pair of packet.pairs) {
		notEqual(pair.supported, packet.anchor.supported.id)
		notEqual(pair.unsafe, packet.anchor.unsupported.id)
	}
})

test('absent and incomplete readings remain unscored without manufactured zero', () => {
	const packet = readScreen(readJSON(PACKET))
	const readings = buildReadings(packet)
	equal(computeRanking(packet, []).status, 'incomplete')
	equal(computeRanking(packet, readings.slice(0, -1)).status, 'incomplete')
	ok(computeRanking(packet, []).statistics.every(statistic => statistic.score === undefined))
	for (const entry of packet.sequence) equal(computeRanking(packet, readings.filter(reading => reading.ordinal !== entry.ordinal)).status, 'incomplete')
})

test('duplicate and extraneous readings cannot supply complete membership', () => {
	const packet = readScreen(readJSON(PACKET))
	const readings = buildReadings(packet)
	const first = readings[0]
	ok(first !== undefined)
	equal(computeRanking(packet, [...readings, first]).status, 'incomplete')
	equal(computeRanking(packet, readings.map((reading, index) => index === 1 ? first : reading)).status, 'incomplete')
})

test('alien name, row, ordinal, pass, and settled label refuse scoring', () => {
	const packet = readScreen(readJSON(PACKET))
	const readings = buildReadings(packet)
	equal(computeRanking(packet, readings.map((reading, index) => index === 0 ? { ...reading, name: 'alien' } : reading)).status, 'incomplete')
	equal(computeRanking(packet, readings.map((reading, index) => index === 0 ? { ...reading, row: 'alien' } : reading)).status, 'incomplete')
	equal(computeRanking(packet, readings.map((reading, index) => index === 0 ? { ...reading, ordinal: 2 } : reading)).status, 'incomplete')
	equal(computeRanking(packet, readings.map((reading, index) => index === 0 ? { ...reading, pass: 'reverse' } : reading)).status, 'incomplete')
	equal(computeRanking(packet, readings.map((reading, index) => index === 0 ? { ...reading, label: 'unsupported' } : reading)).status, 'incomplete')
})

test('malformed, nonfinite, nonnumeric, and out-of-range scores remain incomplete', () => {
	const packet = readScreen(readJSON(PACKET))
	const readings = buildReadings(packet)
	for (const score of [NaN, Infinity, -Infinity, -0.1, 1.1, '0.9', undefined, null]) equal(computeRanking(packet, readings.map((reading, index) => index === 0 ? { ...reading, score } : reading)).status, 'incomplete')
	equal(computeRanking(packet, readings.map((reading, index) => index === 0 ? undefined : reading)).status, 'incomplete')
	equal(computeRanking(packet, readings.map((reading, index) => index === 0 ? {} : reading)).status, 'incomplete')
	equal(isComponentReading(undefined), false)
	equal(isSupportLabel('intended-positive'), false)
})

test('ties and reversals fail independently in each pass', () => {
	const packet = readScreen(readJSON(PACKET))
	const readings = buildReadings(packet)
	equal(computeRanking(packet, readings.map(reading => ({ ...reading, score: 0.5 }))).status, 'refused')
	for (const pass of ['forward', 'reverse']) {
		const result = computeRanking(packet, readings.map(reading => ({ ...reading, score: reading.pass === pass ? 1 - reading.score : reading.score })))
		equal(result.status, 'refused')
		ok(result.comparisons.filter(comparison => comparison.pass === pass).every(comparison => !comparison.exceeds))
		ok(result.comparisons.filter(comparison => comparison.pass !== pass).every(comparison => comparison.exceeds))
	}
})

test('every supported pair component including its guard can individually fail its boundary', () => {
	const packet = readScreen(readJSON(PACKET))
	const readings = buildReadings(packet)
	for (const pair of packet.pairs) for (const pass of ['forward', 'reverse']) for (const check of packet.checks.filter(entry => entry.row === pair.supported)) {
		const result = computeRanking(packet, readings.map(reading => ({ ...reading, score: reading.name === check.name && reading.pass === pass ? 0.1 : reading.score })))
		equal(result.status, 'refused')
		equal(result.statistics.find(statistic => statistic.row === pair.supported && statistic.pass === pass)?.score, 0.1)
		equal(result.comparisons.find(comparison => comparison.boundary === pair.boundary && comparison.pass === pass)?.exceeds, false)
	}
})

test('whole original anchors have no invented ordering and original focus comparison remains independent', () => {
	const packet = readScreen(readJSON(PACKET))
	const readings = buildReadings(packet)
	equal(computeRanking(packet, readings.map(reading => ({ ...reading, score: reading.row === packet.anchor.supported.id && reading.name.endsWith('-guard') ? 0 : reading.row === packet.anchor.unsupported.id && reading.name.endsWith('-guard') ? 1 : reading.score }))).status, 'passed')
	for (const pass of ['forward', 'reverse']) {
		const check = packet.checks.find(entry => entry.row === packet.anchor.supported.id && entry.focus?.start === packet.anchor.supported.start)
		ok(check !== undefined)
		equal(computeRanking(packet, readings.map(reading => ({ ...reading, score: reading.pass === pass && reading.name === check.name ? 0.1 : reading.score }))).status, 'refused')
	}
})

test('composition refuses altered rows, source ordering, spans, labels, pairs, and anchor selection', () => {
	const population = readObject(readJSON(POPULATION))
	const labels = readObject(readJSON(LABELS))
	const screen = readObject(readJSON(SPECIFICATION))
	throws(() => buildComposition({ ...population, rows: readArray(population.rows).slice(1) }, labels, screen))
	throws(() => buildComposition({ ...population, rows: readArray(population.rows).toReversed() }, labels, screen))
	throws(() => buildComposition(population, { ...labels, rows: readArray(labels.rows).slice(1) }, screen))
	throws(() => buildComposition(population, labels, { ...screen, pairs: [] }))
	throws(() => buildComposition(population, labels, { ...screen, anchor: { supported: { id: 'alien', start: 0, end: 1 }, unsupported: readObject(screen.anchor).unsupported } }))
	throws(() => readScreen({ ...readObject(readJSON(PACKET)), checks: [] }))
	throws(() => readScreen({ ...readObject(readJSON(PACKET)), sequence: [] }))
	const packet = readScreen(readJSON(PACKET))
	throws(() => validatePopulation({ ...packet, rows: packet.rows.map((row, index) => index === 0 ? { ...row, sources: row.sources.toReversed() } : row) }))
	throws(() => validatePopulation({ ...packet, rows: packet.rows.map((row, index) => index === 0 ? { ...row, candidate: `${row.candidate}!` } : row) }))
	throws(() => validatePopulation({ ...packet, rows: packet.rows.map((row, index) => index === 0 ? { ...row, spans: row.spans.slice(1) } : row) }))
	throws(() => validatePopulation({ ...packet, rows: packet.rows.map((row, index) => index === 0 ? { ...row, spans: row.spans.map(span => ({ ...span, label: 'supported' })) } : row) }))
	throws(() => validatePopulation({ ...packet, checks: packet.checks.map((check, index) => index === 0 ? { ...check, state: '{}' } : check) }))
	throws(() => validatePopulation({ ...packet, sequence: packet.sequence.toReversed() }))
})

test('failed explicit admission creates no output and makes no native dispatch', async () => {
	const output = resolve(UNIT, 'must-remain-absent-admission')
	equal(existsSync(output), false)
	const witness = new NetworkWitness()
	try {
		await rejects(new Operator().execute({ packet: '0'.repeat(64), build: BUILD_HASH, operator: computeOperator(), output }))
		throws(() => validateExecution({ packet: readBinding(PACKET).hash, build: BUILD_HASH, operator: '0'.repeat(64), output }))
		throws(() => validateExecution({ packet: readBinding(PACKET).hash, build: BUILD_HASH, operator: computeOperator(), output: UNIT }))
		equal(witness.count, 0)
		equal(existsSync(output), false)
	} finally { witness.close() }
})
