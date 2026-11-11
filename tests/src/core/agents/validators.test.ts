import { describe, expect, it } from 'vitest'
import { isAgentBuiltin, isAuthorityDecision } from '@src/core'
import { createHostileValues } from '@orkestrel/test'
import { BUILTIN_NAMES } from '../../../setup.js'

describe('isAuthorityDecision', () => {
	it.each(['allow', 'ask', 'deny'] as const)(
		'accepts the %s verdict with and without a reason',
		(verdict) => {
			expect(isAuthorityDecision({ zone: 'default', verdict })).toBe(true)
			expect(isAuthorityDecision({ zone: 'default', verdict, reason: 'why' })).toBe(true)
		},
	)

	it('accepts unknown members and inherited members', () => {
		expect(isAuthorityDecision({ zone: 'z', verdict: 'allow', extra: 1 })).toBe(true)
		expect(isAuthorityDecision(Object.create({ zone: 'z', verdict: 'deny' }))).toBe(true)
	})

	it.each([
		['a 0.0.34 allowed decision', { zone: 'z', allowed: true }],
		['a 0.0.34 denied decision', { zone: 'z', allowed: false, reason: 'no' }],
		['an unknown verdict', { zone: 'z', verdict: 'maybe' }],
		['a boolean verdict', { zone: 'z', verdict: true }],
		['a missing zone', { verdict: 'allow' }],
		['a non-string zone', { zone: 1, verdict: 'allow' }],
		['a non-string reason', { zone: 'z', verdict: 'deny', reason: 1 }],
		['null', null],
		['undefined', undefined],
		['a string', 'allow'],
		['a number', 0],
		['an array', ['z', 'allow']],
	])('refuses %s', (_label, value) => {
		expect(isAuthorityDecision(value)).toBe(false)
	})

	it('refuses a throwing getter without throwing', () => {
		const value = new Proxy(
			{ zone: 'z', verdict: 'allow' },
			{
				get(target, key) {
					if (key === 'verdict') throw new Error('getter crashed')
					return Reflect.get(target, key)
				},
			},
		)
		expect(() => isAuthorityDecision(value)).not.toThrow()
		expect(isAuthorityDecision(value)).toBe(false)
		expect(
			isAuthorityDecision({
				zone: 'z',
				get verdict(): string {
					throw new Error('getter crashed')
				},
			}),
		).toBe(false)
	})

	it('refuses a revoked Proxy without throwing', () => {
		const { proxy, revoke } = Proxy.revocable({ zone: 'z', verdict: 'allow' }, {})
		revoke()
		expect(() => isAuthorityDecision(proxy)).not.toThrow()
		expect(isAuthorityDecision(proxy)).toBe(false)
	})

	it('refuses a Proxy whose get trap throws without throwing', () => {
		const proxy = new Proxy(
			{ zone: 'z', verdict: 'allow' },
			{
				get() {
					throw new Error('trap crashed')
				},
			},
		)
		expect(() => isAuthorityDecision(proxy)).not.toThrow()
		expect(isAuthorityDecision(proxy)).toBe(false)
	})

	it('refuses every hostile value without throwing', () => {
		for (const [index, value] of createHostileValues().entries()) {
			expect(() => isAuthorityDecision(value), `hostile value ${index}`).not.toThrow()
			expect(isAuthorityDecision(value), `hostile value ${index}`).toBe(false)
		}
	})
})

describe('isAgentBuiltin', () => {
	it.each(BUILTIN_NAMES)('accepts the %s built-in', (name) => {
		expect(isAgentBuiltin(name)).toBe(true)
	})

	it.each(['task', 'open', 'LOAD', 'load ', ''])('refuses the name %j', (name) => {
		expect(isAgentBuiltin(name)).toBe(false)
	})

	it('refuses every hostile value without throwing', () => {
		for (const [index, value] of createHostileValues().entries()) {
			expect(() => isAgentBuiltin(value), `hostile value ${index}`).not.toThrow()
			expect(isAgentBuiltin(value), `hostile value ${index}`).toBe(false)
		}
	})
})
