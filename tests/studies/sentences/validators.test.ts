import { expect, it } from 'vitest'
import { buildStudySentenceFixture } from '../../setupStudy.js'
import {
	isStudySentencePopulation,
	isStudySentenceRuntime,
	isStudySentenceBinding,
} from '../../../studies/sentences/index.js'
import { buildStudySentenceCalibration } from '../../setupStudy.js'

it('validates public declarations and real helper capability shapes with total guards', () => {
	const input = buildStudySentenceFixture()
	expect(isStudySentencePopulation(input.population)).toBe(true)
	expect(isStudySentenceRuntime(input.agent)).toBe(true)
	expect(isStudySentencePopulation(undefined)).toBe(false)
	expect(isStudySentencePopulation({ ...input.population, controls: [{ id: 'incomplete' }] })).toBe(
		false,
	)
	expect(isStudySentenceRuntime({})).toBe(false)
	expect(isStudySentenceRuntime({ extractTokens: 1, splitSentences: 2 })).toBe(false)
	const accessor = {
		get cases(): unknown {
			throw new Error('unreadable')
		},
	}
	expect(isStudySentencePopulation(accessor)).toBe(false)
	const { proxy, revoke } = Proxy.revocable({}, {})
	revoke()
	expect(isStudySentenceRuntime(proxy)).toBe(false)
	expect(isStudySentencePopulation(proxy)).toBe(false)
})

it('requires the request digest in every immutable binding', () => {
	const fixture = buildStudySentenceCalibration()
	const criterion = fixture.declarations.initial.criteria[0]
	if (
		criterion === undefined ||
		typeof criterion.assertion !== 'object' ||
		criterion.assertion === null ||
		!('binding' in criterion.assertion)
	)
		throw new Error('Missing binding')
	const binding: unknown = criterion.assertion.binding
	expect(isStudySentenceBinding(binding)).toBe(true)
	if (!isStudySentenceBinding(binding)) throw new Error('Invalid binding')
	const { request: _request, ...preceding } = binding
	expect(isStudySentenceBinding(preceding)).toBe(false)
	expect(isStudySentenceBinding({ ...binding, request: 'old' })).toBe(false)
})
