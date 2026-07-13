import { describe, expect, it } from 'vitest'
import type { AuthorityContextInterface, ToolCall } from '@src/core'
import { createAuthority } from '@src/core'

// Deterministic, Ollama-free unit tests for the Authority policy gate (the mirror of
// src/core/agents/Authority.ts). The gate in ISOLATION: ordered first-match-wins, a
// matched rule allows-by-default / denies on `allowed: false`, the no-match fallback
// (default allow-`'default'`, or a deny-by-default override), and that `match` sees the
// `{ call }` context (so a rule can branch on the call's name AND its arguments). The
// gate wired into the loop is covered in Agent.test.ts.

// Build the `{ call }` context the gate evaluates, from a tool name + optional arguments.
function context(
	name: string,
	args: Readonly<Record<string, unknown>> = {},
): AuthorityContextInterface {
	const call: ToolCall = { id: 'c1', name, arguments: args }
	return { call }
}

describe('Authority — first-match-wins ordering', () => {
	it('returns the FIRST matching rule, not a later one', () => {
		const authority = createAuthority({
			rules: [
				{ match: (c) => c.call.name === 'add', zone: 'first', reason: 'won' },
				{ match: (c) => c.call.name === 'add', zone: 'second', reason: 'lost' },
			],
		})
		const decision = authority.evaluate(context('add'))
		expect(decision.zone).toBe('first')
		expect(decision.reason).toBe('won')
		expect(decision.allowed).toBe(true)
	})
})

describe('Authority — a matched rule allows by default, denies on allowed:false', () => {
	it('allows (allowed defaults to true) when the matched rule omits allowed', () => {
		const authority = createAuthority({
			rules: [{ match: () => true, zone: 'sensitive' }],
		})
		expect(authority.evaluate(context('add'))).toEqual({
			zone: 'sensitive',
			allowed: true,
			reason: undefined,
		})
	})

	it('denies (carrying zone + reason) when the matched rule sets allowed:false', () => {
		const authority = createAuthority({
			rules: [
				{
					match: (c) => c.call.name === 'delete',
					zone: 'restricted',
					allowed: false,
					reason: 'too risky',
				},
			],
		})
		expect(authority.evaluate(context('delete'))).toEqual({
			zone: 'restricted',
			allowed: false,
			reason: 'too risky',
		})
	})
})

describe('Authority — fallback when no rule matches', () => {
	it('default fallback is allow under the default zone', () => {
		const authority = createAuthority({
			rules: [{ match: (c) => c.call.name === 'delete', zone: 'restricted', allowed: false }],
		})
		// `add` matches no rule → the default allow-`'default'` fallback.
		expect(authority.evaluate(context('add'))).toEqual({ zone: 'default', allowed: true })
	})

	it('an empty rules list always returns the fallback', () => {
		const authority = createAuthority()
		expect(authority.evaluate(context('anything'))).toEqual({ zone: 'default', allowed: true })
	})

	it('a deny-by-default fallback makes every unmatched call denied (allowlist)', () => {
		const authority = createAuthority({
			rules: [{ match: (c) => c.call.name === 'add', zone: 'safe' }],
			fallback: { zone: 'restricted', allowed: false, reason: 'not allowlisted' },
		})
		// `add` is allowlisted (matched rule allows); everything else hits the deny fallback.
		expect(authority.evaluate(context('add'))).toEqual({
			zone: 'safe',
			allowed: true,
			reason: undefined,
		})
		expect(authority.evaluate(context('delete'))).toEqual({
			zone: 'restricted',
			allowed: false,
			reason: 'not allowlisted',
		})
	})
})

describe('Authority — match receives the { call } context', () => {
	it('a rule can branch on call.name AND call.arguments', () => {
		// Deny `transfer` only when the amount argument exceeds a threshold — proving the
		// matcher sees both the name and the parsed arguments.
		const authority = createAuthority({
			rules: [
				{
					match: (c) => c.call.name === 'transfer' && Number(c.call.arguments.amount) > 100,
					zone: 'restricted',
					allowed: false,
					reason: 'over limit',
				},
			],
		})
		expect(authority.evaluate(context('transfer', { amount: 500 })).allowed).toBe(false)
		// A small transfer matches no rule → allowed by the default fallback.
		expect(authority.evaluate(context('transfer', { amount: 5 })).allowed).toBe(true)
		// A different tool with a large amount also matches no rule → allowed.
		expect(authority.evaluate(context('add', { amount: 500 })).allowed).toBe(true)
	})
})
