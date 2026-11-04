import { createScriptedApprover, createAuthorityContext } from '../../../setup.js'
import { captureError } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import { Authority, createAuthority, isAgentError } from '@src/core'

// Deterministic, Ollama-free unit tests for the Authority policy gate (the mirror of
// src/core/agents/Authority.ts). The gate in ISOLATION: ordered first-match-wins, a
// matched rule carries its required verdict, the required no-match fallback (an allowlist or a
// denylist), that `match` sees the `{ call }` context (so a rule can branch on the call's name AND
// its arguments), and the approver behind `ask`. The gate wired into the loop is covered in
// Agent.test.ts.

describe('Authority — refuses what no default can decide', () => {
	it.each([
		['no options', []],
		['an empty options record', [{}]],
		['a rules list with no fallback', [{ rules: [] }]],
		['a malformed fallback', [{ fallback: { zone: 'default' } }]],
	])('refuses %s with the text a host reads', (_name, args) => {
		const error = captureError(() => Reflect.construct(Authority, args))
		expect(isAgentError(error) && error.code).toBe('AUTHORITY')
		expect(isAgentError(error) && error.message).toBe(
			"an authority needs a fallback for the calls no rule matches; pass fallback: { zone: 'default', verdict: 'deny' } for an allowlist, or fallback: { zone: 'default', verdict: 'allow' } for a denylist",
		)
	})

	it('refuses a rule with no verdict, naming its index', () => {
		const error = captureError(() =>
			Reflect.construct(Authority, [
				{
					fallback: { zone: 'default', verdict: 'deny' },
					rules: [
						{ match: () => true, zone: 'first', verdict: 'allow' },
						{ match: () => true, zone: 'second', verdict: 'ask' },
						{ match: () => true, zone: 'third' },
					],
				},
			]),
		)
		expect(isAgentError(error) && error.code).toBe('AUTHORITY')
		expect(isAgentError(error) && error.message).toBe(
			"rule 2 has no verdict; set verdict: 'allow' | 'ask' | 'deny'",
		)
		expect(isAgentError(error) && error.context).toEqual({ rule: 2 })
	})

	it('refuses an unknown verdict the same way', () => {
		const error = captureError(() =>
			Reflect.construct(Authority, [
				{
					fallback: { zone: 'default', verdict: 'deny' },
					rules: [{ match: () => true, zone: 'first', verdict: 'maybe' }],
				},
			]),
		)
		expect(isAgentError(error) && error.code).toBe('AUTHORITY')
		expect(isAgentError(error) && error.context).toEqual({ rule: 0 })
	})
})

describe('Authority — first-match-wins ordering', () => {
	it('returns the FIRST matching rule, not a later one', () => {
		const authority = createAuthority({
			fallback: { zone: 'default', verdict: 'allow' },
			rules: [
				{ match: (c) => c.call.name === 'add', zone: 'first', reason: 'won', verdict: 'allow' },
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

describe('Authority — a matched rule carries its verdict', () => {
	it('omits the reason of a matched rule that names none', () => {
		const authority = createAuthority({
			fallback: { zone: 'default', verdict: 'deny' },
			rules: [{ match: () => true, zone: 'sensitive', verdict: 'allow' }],
		})
		const decision = authority.evaluate(createAuthorityContext('add'))
		expect(decision).toEqual({ zone: 'sensitive', verdict: 'allow' })
		expect('reason' in decision).toBe(false)
	})

	it.each(['allow', 'ask', 'deny'] as const)(
		'carries the matched rule verdict %s with its zone and reason',
		(verdict) => {
			const authority = createAuthority({
				fallback: { zone: 'default', verdict: 'allow' },
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
	it('an allow fallback makes a denylist: an unmatched call passes', () => {
		const authority = createAuthority({
			fallback: { zone: 'default', verdict: 'allow' },
			rules: [{ match: (c) => c.call.name === 'delete', zone: 'restricted', verdict: 'deny' }],
		})
		// `add` matches no rule → the configured allow fallback.
		expect(authority.evaluate(createAuthorityContext('add'))).toEqual({
			zone: 'default',
			verdict: 'allow',
		})
	})

	it('an empty rules list always returns the fallback', () => {
		const authority = createAuthority({ fallback: { zone: 'default', verdict: 'allow' } })
		expect(authority.evaluate(createAuthorityContext('anything'))).toEqual({
			zone: 'default',
			verdict: 'allow',
		})
	})

	it('a deny-by-default fallback makes every unmatched call denied (allowlist)', () => {
		const authority = createAuthority({
			rules: [{ match: (c) => c.call.name === 'add', zone: 'safe', verdict: 'allow' }],
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
			fallback: { zone: 'default', verdict: 'allow' },
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
		// A small transfer matches no rule → allowed by the fallback.
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
		const authority = createAuthority({
			fallback: { zone: 'default', verdict: 'allow' },
			ask: () => answer,
		})
		await expect(
			authority.ask?.(createAuthorityContext('write'), decision, new AbortController().signal),
		).resolves.toBe(answer)
	})

	it.each([true, false])('returns an async handler answer %s', async (answer) => {
		const authority = createAuthority({
			fallback: { zone: 'default', verdict: 'allow' },
			ask: async () => answer,
		})
		await expect(
			authority.ask?.(createAuthorityContext('write'), decision, new AbortController().signal),
		).resolves.toBe(answer)
	})

	it('passes the context, the decision, and the signal to the handler', async () => {
		const approver = createScriptedApprover([true])
		const context = createAuthorityContext('write', { path: 'note.txt' })
		const signal = new AbortController().signal
		const authority = createAuthority({
			fallback: { zone: 'default', verdict: 'allow' },
			ask: approver.ask,
		})
		await expect(authority.ask?.(context, decision, signal)).resolves.toBe(true)
		expect(approver.calls).toEqual([[context, decision, signal]])
		expect(approver.calls[0]?.[2]).toBe(signal)
	})

	it('turns a synchronous handler throw into a rejection', async () => {
		const failure = new Error('approver crashed')
		const authority = createAuthority({
			fallback: { zone: 'default', verdict: 'allow' },
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
		const authority = createAuthority({ fallback: { zone: 'default', verdict: 'allow' } })
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
