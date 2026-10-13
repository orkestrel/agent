import { equal } from 'node:assert'
import { test } from 'node:test'
import { readObject, readPacket, readJSON } from '../aggregate-judge-counterfactual/helpers.ts'
import { PREDECESSOR, SEQUENCE } from './constants.ts'
import { computeRanking, renderState, validateState } from './helpers.ts'

test('swapped evidence and candidate control is collected and must fail custody', () => {
	const original = readPacket(readJSON(PREDECESSOR))
	const candidate = original.variants[0]?.candidate ?? ''
	const state = readObject(JSON.parse(renderState(original.sources, candidate)))
	validateState(JSON.stringify({ evidence: state.candidate, candidate: state.evidence }), original.sources, candidate)
})

test('omitted source control is collected and must fail custody', () => {
	const original = readPacket(readJSON(PREDECESSOR))
	const candidate = original.variants[0]?.candidate ?? ''
	validateState(renderState(original.sources.slice(1), candidate), original.sources, candidate)
})

test('candidate byte mutation control independently fails candidate custody', () => {
	const original = readPacket(readJSON(PREDECESSOR))
	const candidate = original.variants[0]?.candidate ?? ''
	validateState(renderState(original.sources, `${candidate}!`), original.sources, candidate)
})

test('source byte mutation control independently fails ordered source custody', () => {
	const original = readPacket(readJSON(PREDECESSOR))
	const candidate = original.variants[0]?.candidate ?? ''
	const sources = original.sources.map((source, index) => index === 0 ? { ...readObject(source), text: 'Mutated source boundary.' } : source)
	validateState(renderState(sources, candidate), original.sources, candidate)
})

test('wrong ranking direction control is collected and must fail strict ordering assertion', () => {
	equal(computeRanking(SEQUENCE.map((name, index) => ({ ordinal: index + 1, name, score: name === 'both-removed' ? 0.1 : 0.9 }))).status, 'passed')
})

test('equal scores control is collected and must fail strict ordering assertion', () => {
	equal(computeRanking(SEQUENCE.map((name, index) => ({ ordinal: index + 1, name, score: 0.5 }))).status, 'passed')
})

test('reversed pass control is collected and must fail its separate pass assertion', () => {
	equal(computeRanking(SEQUENCE.map((name, index) => ({ ordinal: index + 1, name, score: index < 4 ? name === 'both-removed' ? 0.9 : 0.2 : name === 'both-removed' ? 0.1 : 0.8 }))).status, 'passed')
})
