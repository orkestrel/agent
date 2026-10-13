import { equal, ok } from 'node:assert/strict'
import { test } from 'node:test'
import { readJSON } from '../aggregate-judge-counterfactual/helpers.ts'
import { PACKET } from './constants.ts'
import { computeRanking, readScreen } from './helpers.ts'
import { buildReadings } from './setup.ts'

test('missing component control must fail a passing assertion', () => {
	const packet = readScreen(readJSON(PACKET))
	equal(computeRanking(packet, buildReadings(packet).slice(0, -1)).status, 'passed')
})

test('tie control must fail a passing assertion', () => {
	const packet = readScreen(readJSON(PACKET))
	equal(computeRanking(packet, buildReadings(packet).map(reading => ({ ...reading, score: 0.5 }))).status, 'passed')
})

test('failed guard control must fail a passing assertion despite supported focuses', () => {
	const packet = readScreen(readJSON(PACKET))
	const pair = packet.pairs[0]
	ok(pair !== undefined)
	equal(computeRanking(packet, buildReadings(packet).map(reading => ({ ...reading, score: reading.pass === 'reverse' && reading.row === pair.supported && reading.name.endsWith('-guard') ? 0.1 : reading.score }))).status, 'passed')
})
