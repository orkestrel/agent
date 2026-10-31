import { createApprover, createAuthorityContext } from '../../../setup.js'
import { describe, expect, it } from 'vitest'
import { createAuthority, isAgentError } from '@src/core'

// Deterministic, Ollama-free unit tests for the Authority policy gate (the mirror of
// src/core/agents/Authority.ts). The gate in ISOLATION: ordered first-match-wins, a
// matched rule allows when it names no verdict and otherwise carries its verdict, the no-match
// fallback (default allow-`'default'`, or a deny-by-default override), that `match` sees the
// `{ call }` context (so a rule can branch on the call's name AND its arguments), and the
// approver behind `ask`. The gate wired into the loop is covered in Agent.test.ts.

describe('Authority — first-match-wins ordering', () => {
	it('returns the FIRST matching rule, not a later one', () => {
		const authority = createAuthority({
			rules: [
				{ match: (c) => c.call.name === 'add', zone: 'first', reason: 'won' },
				{ match: (c) => c.call.name === 'add', zone: 'second', verdict: 'deny', reason: 'lost' },
			],
		})
		expect(authority.evaluate(createAuthorityContext('add'))).toEqual({
			zone: 'first',
			verdict: 'allow',
			reason: 'won',
		})
	})
})

describe('Authority — a matched rule allows by default and carries its verdict', () => {
	it('allows when the matched rule omits verdict', () => {
		const authority = createAuthority({
			rules: [{ match: () => true, zone: 'sensitive' }],
		})
		const decision = authority.evaluate(createAuthorityContext('add'))
		expect(decision).toEqual({ zone: 'sensitive', verdict: 'allow' })
		expect('reason' in decision).toBe(false)
	})

	it.each(['allow', 'ask', 'deny'] as const)(
		'carries the matched rule verdict %s with its zone and reason',
		(verdict) => {
			const authority = createAuthority({
				rules: [
					{ match: (c) => c.call.name === 'delete', zone: 'restricted', verdict, reason: 'why' },
				],
			})
			expect(authority.evaluate(createAuthorityContext('delete'))).toEqual({
				zone: 'restricted',
				verdict,
				reason: 'why',
			})
		},
	)
})

describe('Authority — fallback when no rule matches', () => {
	it('default fallback is allow under the default zone', () => {
		const authority = createAuthority({
			rules: [{ match: (c) => c.call.name === 'delete', zone: 'restricted', verdict: 'deny' }],
		})
		// `add` matches no rule → the default allow-`'default'` fallback.
		expect(authority.evaluate(createAuthorityContext('add'))).toEqual({
			zone: 'default',
			verdict: 'allow',
		})
	})

	it('an empty rules list always returns the fallback', () => {
		const authority = createAuthority()
		expect(authority.evaluate(createAuthorityContext('anything'))).toEqual({
			zone: 'default',
			verdict: 'allow',
		})
	})

	it('a deny-by-default fallback makes every unmatched call denied (allowlist)', () => {
		const authority = createAuthority({
			rules: [{ match: (c) => c.call.name === 'add', zone: 'safe' }],
			fallback: { zone: 'restricted', verdict: 'deny', reason: 'not allowlisted' },
		})
		// `add` is allowlisted (matched rule allows); everything else hits the deny fallback.
		expect(authority.evaluate(createAuthorityContext('add'))).toEqual({
			zone: 'safe',
			verdict: 'allow',
		})
		expect(authority.evaluate(createAuthorityContext('delete'))).toEqual({
			zone: 'restricted',
			verdict: 'deny',
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
					verdict: 'deny',
					reason: 'over limit',
				},
			],
		})
		expect(authority.evaluate(createAuthorityContext('transfer', { amount: 500 })).verdict).toBe(
			'deny',
		)
		// A small transfer matches no rule → allowed by the default fallback.
		expect(authority.evaluate(createAuthorityContext('transfer', { amount: 5 })).verdict).toBe(
			'allow',
		)
		// A different tool with a large amount also matches no rule → allowed.
		expect(authority.evaluate(createAuthorityContext('add', { amount: 500 })).verdict).toBe('allow')
	})
})

describe('Authority — ask answers through the approver', () => {
	const decision = { zone: 'sensitive', verdict: 'ask', reason: 'confirm' } as const

	it.each([true, false])('returns a synchronous handler answer %s', async (answer) => {
		const authority = createAuthority({ ask: () => answer })
		await expect(
			authority.ask?.(createAuthorityContext('write'), decision, new AbortController().signal),
		).resolves.toBe(answer)
	})

	it.each([true, false])('returns an async handler answer %s', async (answer) => {
		const authority = createAuthority({ ask: async () => answer })
		await expect(
			authority.ask?.(createAuthorityContext('write'), decision, new AbortController().signal),
		).resolves.toBe(answer)
	})

	it('passes the context, the decision, and the signal to the handler', async () => {
		const approver = createApprover([true])
		const context = createAuthorityContext('write', { path: 'note.txt' })
		const signal = new AbortController().signal
		const authority = createAuthority({ ask: approver.ask })
		await expect(authority.ask?.(context, decision, signal)).resolves.toBe(true)
		expect(approver.calls).toEqual([[context, decision, signal]])
		expect(approver.calls[0]?.[2]).toBe(signal)
	})

	it('turns a synchronous handler throw into a rejection', async () => {
		const failure = new Error('approver crashed')
		const authority = createAuthority({
			ask: () => {
				throw failure
			},
		})
		const pending = authority.ask?.(
			createAuthorityContext('write'),
			decision,
			new AbortController().signal,
		)
		await expect(pending).rejects.toBe(failure)
	})

	it('rejects with an APPROVER AgentError when no handler is set', async () => {
		const authority = createAuthority()
		const pending = authority.ask?.(
			createAuthorityContext('write'),
			decision,
			new AbortController().signal,
		)
		expect(pending).toBeInstanceOf(Promise)
		const error = await pending?.then(
			() => undefined,
			(reason: unknown) => reason,
		)
		expect(isAgentError(error)).toBe(true)
		expect(isAgentError(error) && error.code).toBe('APPROVER')
		expect(isAgentError(error) && error.context).toEqual({ tool: 'write' })
	})
})
