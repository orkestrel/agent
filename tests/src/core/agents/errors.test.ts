import type { AgentResult } from '@src/core'
import { AgentJobError, isAgentJobError, ProviderAbortError } from '@src/core'
import { describe, expect, it } from 'vitest'

// -- AgentJobError / isAgentJobError (the partial-carrying failure) ------------
//
// The real error type the shared `settle` throws on a default-partial job (a
// real Error, not a sentinel) — it CARRIES the partial AgentResult so a caller can
// still inspect what accumulated. Mirrors ProviderAbortError / isProviderAbortError.

describe('AgentJobError / isAgentJobError', () => {
	it('constructs with a message and carries the partial AgentResult', () => {
		const partial: AgentResult = { content: 'half', partial: true }
		const error = new AgentJobError('agent job ended partial', partial)
		expect(error).toBeInstanceOf(Error)
		expect(error.name).toBe('AgentJobError')
		expect(error.message).toBe('agent job ended partial')
		// The partial is the EXACT object handed in (carried by reference, not copied).
		expect(error.partial).toBe(partial)
		expect(error.partial.content).toBe('half')
		expect(error.partial.partial).toBe(true)
	})

	it('the guard narrows a real AgentJobError to true', () => {
		const error = new AgentJobError('x', { content: '', partial: true })
		expect(isAgentJobError(error)).toBe(true)
	})

	it('the guard is false for a plain Error, a non-error, null, and undefined', () => {
		expect(isAgentJobError(new Error('plain'))).toBe(false)
		expect(isAgentJobError(new ProviderAbortError({ content: '' }))).toBe(false)
		expect(isAgentJobError('agent job ended partial')).toBe(false)
		expect(isAgentJobError({ partial: { content: '', partial: true } })).toBe(false)
		expect(isAgentJobError(null)).toBe(false)
		expect(isAgentJobError(undefined)).toBe(false)
	})
})
