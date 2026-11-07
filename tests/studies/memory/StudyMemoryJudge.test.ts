import { describe, expect, it } from 'vitest'
import { JudgeAbortError, isJudgeAbortError, measureAnswer, JudgmentManager } from '@src/core'
import { createSettledJudge } from '../../setup.js'
import { canonicalStringify } from '@orkestrel/contract'
import {
	createMemoryRouting,
	MEMORY_ROUTE_REQUEST,
	MEMORY_ROUTE_FIRST,
	MEMORY_ROUTE_SECOND,
	MEMORY_ROUTE_UNUSABLE,
	MEMORY_ROUTE_TIE,
	MEMORY_ROUTE_TIED,
	MEMORY_ROUTE_PARTIAL,
} from '../../setupStudy.js'

describe('StudyMemoryJudge', () => {
	it('passes the caller signal to each leg in one call', async () => {
		const fixture = createMemoryRouting()
		const signal = new AbortController().signal
		await fixture.judge.ask(MEMORY_ROUTE_REQUEST, signal)
		expect(fixture.first.calls).toEqual([[signal]])
		expect(fixture.second.calls).toEqual([[signal]])
		expect(fixture.first.calls[0]?.[0]).toBe(signal)
		expect(fixture.second.calls[0]?.[0]).toBe(signal)
	})
	it('passes the referred question object and caller state unchanged to second', async () => {
		const fixture = createMemoryRouting()
		await fixture.judge.ask(MEMORY_ROUTE_REQUEST, new AbortController().signal)
		expect(fixture.requests.count).toBe(1)
		expect(fixture.requests.calls[0]?.[0].questions.low).toBe(MEMORY_ROUTE_REQUEST.questions.low)
		expect(fixture.requests.calls[0]?.[0].state).toBe(MEMORY_ROUTE_REQUEST.state)
	})
	it('refuses a high-probability own-abort partial while the caller remains live', async () => {
		const fixture = createMemoryRouting(() =>
			Promise.reject(new JudgeAbortError(MEMORY_ROUTE_PARTIAL)),
		)
		const signal = new AbortController().signal
		const result = await fixture.judge.ask(MEMORY_ROUTE_REQUEST, signal)
		expect(signal.aborted).toBe(false)
		expect(fixture.requests.count).toBe(1)
		expect(fixture.requests.calls[0]?.[0].questions.low).toBe(MEMORY_ROUTE_REQUEST.questions.low)
		expect(result.answers.low).toBe(MEMORY_ROUTE_SECOND.answers.low)
		expect(result.answers.low).not.toBe(MEMORY_ROUTE_PARTIAL.answers.low)
	})
	it('uses caller criteria order for a tied winner', async () => {
		const fixture = createMemoryRouting(() => Promise.resolve(MEMORY_ROUTE_TIED))
		await fixture.judge.ask(MEMORY_ROUTE_TIE, new AbortController().signal)
		expect(fixture.evidence.calls).toMatchObject([
			[
				'route',
				{ questions: [{ id: 'tie', winner: 'correction', probability: 0.5, outcome: 'referred' }] },
			],
		])
	})
	it('returns an empty composed result without calls and refuses a pre-aborted caller', async () => {
		const fixture = createMemoryRouting()
		expect(
			await fixture.judge.ask({ state: '', questions: {} }, new AbortController().signal),
		).toEqual({ model: fixture.judge.model, answers: {} })
		const controller = new AbortController()
		controller.abort()
		await expect(fixture.judge.ask(MEMORY_ROUTE_REQUEST, controller.signal)).rejects.toMatchObject({
			code: 'ABORT',
		})
		expect(fixture.calls.count).toBe(0)
		expect(fixture.evidence.count).toBe(0)
	})
	it('refers absent, refused, mismatched, incomplete, and non-finite first answers', async () => {
		const edge = MEMORY_ROUTE_REQUEST.questions.edge
		if (edge === undefined) throw new Error('Missing edge')
		for (const result of MEMORY_ROUTE_UNUSABLE) {
			const fixture = createMemoryRouting(() => Promise.resolve(result))
			const returned = await fixture.judge.ask(
				{ state: '', questions: { edge } },
				new AbortController().signal,
			)
			expect(returned.answers.edge).toBe(MEMORY_ROUTE_SECOND.answers.edge)
			expect(fixture.calls.count).toBe(2)
		}
	})
	it('re-asks a judgment stored under the Mica identity and then reuses the composite identity', async () => {
		const edge = MEMORY_ROUTE_REQUEST.questions.edge
		if (edge === undefined) throw new Error('Missing edge')
		const request = { state: 'held', questions: { edge } }
		const manager = new JudgmentManager()
		const signal = new AbortController().signal
		await manager.resolve(
			createSettledJudge({
				model: 'second',
				answers: { edge: MEMORY_ROUTE_SECOND.answers.edge ?? { form: 'noul', noul: 1 } },
			}),
			request,
			['source'],
			signal,
		)
		const fixture = createMemoryRouting()
		await manager.resolve(fixture.judge, request, ['source'], signal)
		expect(fixture.calls.count).toBe(1)
		await manager.resolve(fixture.judge, request, ['source'], signal)
		expect(fixture.calls.count).toBe(1)
	})
	it('keeps 0.65 raw probability, refers 0.64 and correction, and sends other forms only to second', async () => {
		const fixture = createMemoryRouting()
		const result = await fixture.judge.ask(MEMORY_ROUTE_REQUEST, new AbortController().signal)
		expect(fixture.calls.calls.map((call) => call[0])).toEqual([
			'low',
			'edge',
			'correction',
			'low',
			'correction',
			'noul',
			'score',
		])
		expect(result.answers.edge).toBe(MEMORY_ROUTE_FIRST.answers.edge)
		expect(result.answers.low).toBe(MEMORY_ROUTE_SECOND.answers.low)
		expect(result.answers.unrequested).toBeUndefined()
		expect(result.refusals).toEqual({ correction: { missing: ['fact'] } })
		expect(result.usage).toEqual({ prompt: 30, completion: 5, total: 35 })
		const edge = MEMORY_ROUTE_FIRST.answers.edge
		if (edge === undefined) throw new Error('Missing edge')
		expect(measureAnswer(edge).confidence).toBeLessThan(0.65)
		expect(result.model).toBe(fixture.judge.model)
		expect(fixture.evidence.count).toBe(1)
		expect(fixture.evidence.calls).toMatchObject([
			[
				'route',
				{
					model: 'first',
					ms: expect.any(Number),
					usage: MEMORY_ROUTE_FIRST.usage,
					questions: [
						{ id: 'low', outcome: 'referred', winner: 'fact', probability: 0.64 },
						{ id: 'edge', outcome: 'kept', winner: 'fact', probability: 0.65 },
						{ id: 'correction', outcome: 'referred', winner: 'correction', probability: 0.9 },
					],
				},
			],
		])
		expect(JSON.stringify(fixture.evidence.calls)).not.toContain(MEMORY_ROUTE_REQUEST.state)
	})
	it('skips first without choices and skips second when all choices are kept', async () => {
		const fixture = createMemoryRouting()
		await fixture.judge.ask(
			{ state: '', questions: { noul: { form: 'noul' } } },
			new AbortController().signal,
		)
		expect(fixture.evidence.count).toBe(0)
		const edge = MEMORY_ROUTE_REQUEST.questions.edge
		if (edge === undefined) throw new Error('Missing edge')
		await fixture.judge.ask({ state: '', questions: { edge } }, new AbortController().signal)
		expect(fixture.calls.calls.map((call) => call[0])).toEqual(['noul', 'edge'])
		expect(fixture.evidence.count).toBe(1)
	})
	it('refers a first fault and records it, but propagates a second fault', async () => {
		const fault = new Error('first unavailable')
		const fixture = createMemoryRouting(() => Promise.reject(fault))
		const result = await fixture.judge.ask(MEMORY_ROUTE_REQUEST, new AbortController().signal)
		expect(result.answers.low).toBe(MEMORY_ROUTE_SECOND.answers.low)
		expect(fixture.evidence.count).toBe(1)
		expect(JSON.stringify(fixture.evidence.calls)).toContain('fault')
		const failed = createMemoryRouting(undefined, () => Promise.reject(fault))
		await expect(failed.judge.ask(MEMORY_ROUTE_REQUEST, new AbortController().signal)).rejects.toBe(
			fault,
		)
	})
	it('stops on caller abort during first and retains only accepted partial answers', async () => {
		const controller = new AbortController()
		const fixture = createMemoryRouting(() => {
			controller.abort()
			return Promise.reject(new JudgeAbortError(MEMORY_ROUTE_FIRST))
		})
		const error: unknown = await fixture.judge
			.ask(MEMORY_ROUTE_REQUEST, controller.signal)
			.catch((caught: unknown) => caught)
		expect(isJudgeAbortError(error)).toBe(true)
		if (!isJudgeAbortError(error)) throw error
		expect(error.partial.answers).toEqual({ edge: MEMORY_ROUTE_FIRST.answers.edge })
		expect(error.partial.model).toBe(fixture.judge.model)
		expect(fixture.calls.count).toBe(3)
	})
	it('merges accepted first answers with settled second outcomes on caller abort', async () => {
		const controller = new AbortController()
		const fixture = createMemoryRouting(undefined, () => {
			controller.abort()
			return Promise.reject(new JudgeAbortError(MEMORY_ROUTE_SECOND))
		})
		const error: unknown = await fixture.judge
			.ask(MEMORY_ROUTE_REQUEST, controller.signal)
			.catch((caught: unknown) => caught)
		expect(isJudgeAbortError(error)).toBe(true)
		if (!isJudgeAbortError(error)) throw error
		expect(error.partial.answers.edge).toBe(MEMORY_ROUTE_FIRST.answers.edge)
		expect(error.partial.answers.low).toBe(MEMORY_ROUTE_SECOND.answers.low)
		expect(error.partial.answers.unrequested).toBeUndefined()
		expect(error.partial.refusals?.edge).toBeUndefined()
		expect(error.partial.usage).toEqual({ prompt: 30, completion: 5, total: 35 })
	})
	it('refers an internal first abort with a live caller and preserves unknown usage', async () => {
		const fixture = createMemoryRouting(
			() => Promise.reject(new JudgeAbortError({ model: 'first', answers: {} })),
			() => Promise.resolve({ model: 'second', answers: {} }),
		)
		const result = await fixture.judge.ask(MEMORY_ROUTE_REQUEST, new AbortController().signal)
		expect(fixture.calls.count).toBe(8)
		expect(result.usage).toBeUndefined()
	})
	it('includes both legs and the policy in a canonical model identity', () => {
		const fixture = createMemoryRouting()
		expect(fixture.judge.model).not.toBe(
			createMemoryRouting(undefined, undefined, ['changed', 'second']).judge.model,
		)
		expect(fixture.judge.model).not.toBe(
			createMemoryRouting(undefined, undefined, ['first', 'changed']).judge.model,
		)
		expect(canonicalStringify(JSON.parse(fixture.judge.model))).toBe(fixture.judge.model)
	})
})
