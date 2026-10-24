import { expect, it } from 'vitest'
import { buildStudySentenceFixture } from '../../setupStudy.js'
import {
	isStudySentencePopulation,
	isStudySentenceRuntime,
} from '../../../studies/sentences/index.js'

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
