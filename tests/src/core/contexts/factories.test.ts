import { createTool, createToolManager } from '@orkestrel/tool'
import type { Criterion, Selection } from '@src/core'
import * as core from '@src/core'
import {
	buildConditionKey,
	createAgentContext,
	createConversation,
	createSelection,
	inferApplicability,
	isSelectionError,
	JudgeAbortError,
	NEEDED_CRITERION,
	NEEDED_QUESTION,
} from '@src/core'
import { isRecord } from '@orkestrel/contract'
import { captureError, requireValue } from '@orkestrel/test'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
	buildSelectionCostMessages,
	createStockSelectionFixture,
	INVALID_SELECTION_THRESHOLDS,
	INVALID_SELECTION_LIMITS,
	JUDGMENT_USAGE,
	SELECTION_STAND_IN,
	SELECTION_TOOL_MESSAGES,
	SYSTEM_ONE_TEV1,
} from '../../../setup.js'

describe('createAgentContext', () => {
	it('builds [system?, ...messages] from a system prompt + a couple messages', () => {
		const context = createAgentContext({ system: 'You are concise.' })
		context.messages.add([
			{ role: 'user', content: 'one' },
			{ role: 'assistant', content: 'two' },
		])

		const built = context.build()

		expect(built.map((message) => message.role)).toEqual(['system', 'user', 'assistant'])
		expect(built.map((message) => message.content)).toEqual(['You are concise.', 'one', 'two'])
	})

	it('exposes a pre-built tool registry via context.tools', () => {
		const tools = createToolManager()
		tools.add(createTool({ name: 'now', execute: () => Date.now() }))
		const context = createAgentContext({ tools })

		expect(context.tools).toBe(tools)
		expect(context.tools.count).toBe(1)
		// Tools are structural — the prompt never carries them.
		expect(context.build()).toEqual([])
	})
})

describe('createSelection', () => {
	it('requires an application cutoff and supplies no default or tool member', () => {
		expectTypeOf<Pick<Criterion, 'yes' | 'no'>>().not.toExtend<Criterion>()
		expectTypeOf<typeof NEEDED_CRITERION>().not.toHaveProperty('threshold')
		expectTypeOf<Selection>().not.toHaveProperty('tools')
		expect(NEEDED_CRITERION).not.toHaveProperty('threshold')
		expect(NEEDED_CRITERION).toEqual({
			yes: 'A states something the work in B must respect',
			no: 'A can be left out and the request in B is still done correctly',
		})
		expect(Object.isFrozen(NEEDED_CRITERION)).toBe(true)
		expectTypeOf({ ...NEEDED_CRITERION, threshold: 0.9 }).toExtend<Criterion>()
		expect(Object.keys(core).filter((name) => name.includes('THRESHOLD'))).toEqual([])
		expect(
			Object.entries(core)
				.filter(([, value]) => isRecord(value) && Object.hasOwn(value, 'threshold'))
				.map(([name]) => name),
		).toEqual([])
		const fixture = createStockSelectionFixture(0.9)
		expect(fixture.transport.requests).toEqual([])
	})

	it.each(INVALID_SELECTION_THRESHOLDS)('refuses invalid threshold %s', (threshold) => {
		const error = captureError(() => createStockSelectionFixture(threshold))
		expect(isSelectionError(error)).toBe(true)
		expect(isSelectionError(error) ? error.code : undefined).toBe('THRESHOLD')
	})

	it('accepts the inclusive upper cutoff of 1', () => {
		expect(() => createStockSelectionFixture(1)).not.toThrow()
	})

	it.each(INVALID_SELECTION_LIMITS)('refuses invalid limit %s', (limit) => {
		const error = captureError(() => createStockSelectionFixture(0.9, { limit }))
		expect(isSelectionError(error)).toBe(true)
		expect(isSelectionError(error) ? error.code : undefined).toBe('LIMIT')
	})

	it('keeps every message without usage for a zero limit or an empty screen', async () => {
		const fixture = createStockSelectionFixture(0.9, { limit: 0 })
		const signal = new AbortController().signal
		expect(await fixture.select(fixture.conversation, fixture.request, signal)).toEqual({
			messages: fixture.conversation.view(),
			judgments: [],
		})
		const empty = createSelection({ ...fixture.options, limit: 6, screen: () => [] })
		expect(await empty(fixture.conversation, fixture.request, signal)).toEqual({
			messages: fixture.conversation.view(),
			judgments: [],
		})
		expect(fixture.transport.requests).toHaveLength(0)
	})

	it('reuses an unchanged view without another request or usage', async () => {
		const fixture = createStockSelectionFixture(0.9)
		const signal = new AbortController().signal
		const first = await fixture.select(fixture.conversation, fixture.request, signal)
		expect(first.fault).toBeUndefined()
		expect(first.messages).toEqual([fixture.request])
		expect(first.judgments).toHaveLength(5)
		expect(first.usage).toEqual({ prompt: 4875, completion: 20, total: 4895 })
		const second = await fixture.select(fixture.conversation, fixture.request, signal)
		expect(fixture.transport.requests).toHaveLength(5)
		expect(second).toEqual({ messages: [fixture.request], judgments: first.judgments })
		const body: unknown = await requireValue(fixture.transport.requests[0]).json()
		expect(body).toMatchObject({
			model: fixture.judge.model,
			questions: {
				'["needed","standing","request"]': {
					type: 'noul',
					instructions: NEEDED_QUESTION,
					criteria: { true: NEEDED_CRITERION.yes, false: NEEDED_CRITERION.no },
				},
			},
		})
		expect(fixture.conversation.judgments.judgments()[0]?.sources).toEqual(['standing', 'request'])
	})

	it('reasks surviving subjects only when compaction changes their rendered state', async () => {
		const fixture = createStockSelectionFixture(0.9)
		const signal = new AbortController().signal
		await fixture.select(fixture.conversation, fixture.request, signal)
		await fixture.conversation.compact({ keep: 6 })
		await fixture.select(fixture.conversation, fixture.request, signal)
		expect(fixture.transport.requests).toHaveLength(5)
		await fixture.conversation.compact({ keep: 2 })
		await fixture.select(fixture.conversation, fixture.request, signal)
		expect(fixture.transport.requests).toHaveLength(7)
		const repeated = await fixture.select(fixture.conversation, fixture.request, signal)
		expect(fixture.transport.requests).toHaveLength(7)
		expect(repeated.usage).toBeUndefined()
		expect(
			fixture.conversation.judgments.judgment(buildConditionKey('needed', 'unrelated', 'request'))
				?.question.instructions,
		).toBe(NEEDED_QUESTION)
	})

	it('reasks dependents after a source is removed and excludes its stale subject', async () => {
		const fixture = createStockSelectionFixture(0.9)
		const signal = new AbortController().signal
		await fixture.select(fixture.conversation, fixture.request, signal)
		fixture.conversation.remove('standing')
		const selected = await fixture.select(fixture.conversation, fixture.request, signal)
		expect(fixture.transport.requests).toHaveLength(9)
		expect(selected.judgments).toHaveLength(4)
		expect(selected.judgments).not.toContain(buildConditionKey('needed', 'standing', 'request'))
		expect(selected.usage).toEqual({ prompt: 3900, completion: 16, total: 3916 })
	})

	it('spends the limit only on fresh questions and keeps the unasked subjects', async () => {
		const fixture = createStockSelectionFixture(0.9, { limit: 1 })
		const signal = new AbortController().signal
		const first = await fixture.select(fixture.conversation, fixture.request, signal)
		expect(first.messages.map((message) => message.id)).toEqual([
			'acceptance',
			'reply',
			'withdrawal',
			'unrelated',
			'request',
		])
		expect(first.usage).toEqual(JUDGMENT_USAGE)
		const second = await fixture.select(fixture.conversation, fixture.request, signal)
		expect(fixture.transport.requests).toHaveLength(2)
		expect(second.judgments).toEqual([
			buildConditionKey('needed', 'standing', 'request'),
			buildConditionKey('needed', 'acceptance', 'request'),
		])
		// The unasked reply keeps its whole exchange, so the dropped acceptance stays.
		expect(second.messages.map((message) => message.id)).toEqual([
			'acceptance',
			'reply',
			'withdrawal',
			'unrelated',
			'request',
		])
		expect(second.usage).toEqual(JUDGMENT_USAGE)
	})

	it('keeps unscreened subjects and the request in view order, ignoring duplicate and unknown ids', async () => {
		const fixture = createStockSelectionFixture(0.9, {
			screen: () => ['unrelated', 'request', 'unrelated', 'missing'],
		})
		const selected = await fixture.select(
			fixture.conversation,
			fixture.request,
			new AbortController().signal,
		)
		expect(selected.messages).toEqual(
			SELECTION_STAND_IN.filter((message) => message.id !== 'unrelated'),
		)
		expect(
			selected.messages.every((message) => fixture.conversation.view().includes(message)),
		).toBe(true)
		expect(fixture.transport.requests).toHaveLength(1)
		expect(selected).not.toHaveProperty('tools')
	})

	it('marks a folded request after the view without fabricating it in the selection', async () => {
		const fixture = createStockSelectionFixture(0.9, {
			probabilities: { request: SYSTEM_ONE_TEV1.answers.refund.noul },
		})
		// A later user message is the newest, so the fold takes the earlier request with it.
		fixture.conversation.add({ role: 'user', content: 'Export the closed accounts too.' })
		await fixture.conversation.compact({ keep: 0 })
		const selected = await fixture.select(
			fixture.conversation,
			fixture.request,
			new AbortController().signal,
		)
		expect(selected.fault).toBeUndefined()
		expect(selected.messages).toEqual([])
		expect(fixture.transport.requests).toHaveLength(2)
		const record = requireValue(fixture.conversation.judgments.judgments()[0])
		expect(record.state.endsWith(`[B] ${JSON.stringify(fixture.request)}`)).toBe(true)
		expect(record.state).toContain('[A]')
		expect(record.sources).toEqual([
			requireValue(fixture.conversation.view()[0]).id,
			fixture.request.id,
		])
	})

	it('keeps each positional, duplicate-id, detached, and orphan tool group whole', async () => {
		const fixture = createStockSelectionFixture(0.9, {
			messages: SELECTION_TOOL_MESSAGES,
			probabilities: {
				'orphan-b': SYSTEM_ONE_TEV1.answers.refund.noul,
				'duplicate-b': SYSTEM_ONE_TEV1.answers.refund.noul,
				detached: SYSTEM_ONE_TEV1.answers.refund.noul,
				'ambiguous-b': SYSTEM_ONE_TEV1.answers.refund.noul,
			},
		})
		const selected = await fixture.select(
			fixture.conversation,
			fixture.request,
			new AbortController().signal,
		)
		expect(selected.messages.map((message) => message.id)).toEqual(
			SELECTION_TOOL_MESSAGES.filter((message) => message.id !== 'recap').map(
				(message) => message.id,
			),
		)
		const all = createStockSelectionFixture(0.9, { messages: SELECTION_TOOL_MESSAGES })
		expect(
			(await all.select(all.conversation, all.request, new AbortController().signal)).messages,
		).toEqual([all.request])
	})

	it('keeps a leading orphan run after a recap without keeping the recap', async () => {
		const fixture = createStockSelectionFixture(0.9, {
			probabilities: { 'duplicate-b': SYSTEM_ONE_TEV1.answers.refund.noul },
		})
		// Compaction never separates a call from its results, so a restored snapshot supplies the
		// recap whose section holds the call while its results stay live.
		const [call, first, second] = SELECTION_TOOL_MESSAGES.slice(4, 7)
		const conversation = createConversation({
			snapshot: {
				id: 'orphan-run',
				sections: [
					{ id: 'recap', summary: 'A duplicate call ran.', messages: [requireValue(call)] },
				],
				messages: [requireValue(first), requireValue(second), fixture.request],
			},
		})
		const selected = await fixture.select(
			conversation,
			fixture.request,
			new AbortController().signal,
		)
		expect(selected.messages.map((message) => message.id)).toEqual([
			'duplicate-a',
			'duplicate-b',
			'request',
		])
	})

	it('removes earlier needed keys before asking and preserves unrelated judgment keys', async () => {
		const fixture = createStockSelectionFixture(0.9)
		await fixture.select(fixture.conversation, fixture.request, new AbortController().signal)
		fixture.conversation.judgments.add({
			...requireValue(fixture.conversation.judgments.judgments()[0]),
			id: 'other-condition',
		})
		const request = fixture.conversation.add({ role: 'user', content: 'Export again.' })
		const limited = createSelection({ ...fixture.options, limit: 0 })
		await limited(fixture.conversation, request, new AbortController().signal)
		expect(fixture.conversation.judgments.judgments().map((record) => record.id)).toEqual([
			'other-condition',
		])
		expect(fixture.transport.requests).toHaveLength(5)
	})

	it('leaves a subject undecided when the judge fails for it and judges the remaining subjects', async () => {
		const cause = new Error('recorded transport unavailable')
		const fixture = createStockSelectionFixture(0.9, { failure: { at: 2, cause } })
		const selected = await fixture.select(
			fixture.conversation,
			fixture.request,
			new AbortController().signal,
		)
		expect(selected.fault).toBeUndefined()
		expect(selected.messages.map((message) => message.id)).toEqual([
			'acceptance',
			'reply',
			'request',
		])
		expect(selected.judgments).toEqual(
			['standing', 'reply', 'withdrawal', 'unrelated'].map((id) =>
				buildConditionKey('needed', id, 'request'),
			),
		)
		expect(selected.usage).toEqual({ prompt: 3900, completion: 16, total: 3916 })
		expect(fixture.transport.requests).toHaveLength(5)
	})

	it('returns the complete view with the first judge error as the fault when every subject fails', async () => {
		const causes = [1, 2, 3, 4, 5].map((index) => new Error(`transport unavailable ${index}`))
		const fixture = createStockSelectionFixture(0.9, {
			respond: (_request, index) => {
				throw requireValue(causes[index - 1])
			},
		})
		const selected = await fixture.select(
			fixture.conversation,
			fixture.request,
			new AbortController().signal,
		)
		expect(selected.fault?.cause).toBe(causes[0])
		expect(selected.messages).toEqual(fixture.conversation.view())
		expect(selected.judgments).toEqual([])
		expect(selected.usage).toBeUndefined()
		expect(fixture.transport.requests).toHaveLength(5)
	})

	it('checks the signal before resolving a fresh question and preserves its original reason', async () => {
		const fixture = createStockSelectionFixture(0.9)
		const controller = new AbortController()
		const cause = new Error('selection cancelled')
		controller.abort(cause)
		const selected = await fixture.select(fixture.conversation, fixture.request, controller.signal)
		expect(selected).toMatchObject({ messages: fixture.conversation.view(), judgments: [] })
		expect(selected.fault?.cause).toBe(cause)
		expect(selected.usage).toBeUndefined()
		expect(fixture.transport.requests).toHaveLength(0)
	})

	it('checks the signal after reusing every judgment and preserves its original reason', async () => {
		const fixture = createStockSelectionFixture(0.9)
		const first = await fixture.select(
			fixture.conversation,
			fixture.request,
			new AbortController().signal,
		)
		const count = fixture.transport.requests.length
		const controller = new AbortController()
		const cause = new Error('selection cancelled after reuse')
		controller.abort(cause)
		const selected = await fixture.select(fixture.conversation, fixture.request, controller.signal)
		expect(selected.fault?.cause).toBe(cause)
		expect(selected.messages).toEqual(fixture.conversation.view())
		expect(selected.judgments).toEqual(first.judgments)
		expect(selected.judgments).toHaveLength(5)
		expect(selected.usage).toBeUndefined()
		expect(fixture.transport.requests).toHaveLength(count)
	})

	it('charges an abort partial and lists its recorded answer without double charging', async () => {
		// The fetch-level throw reaches the handler because the engine rethrows a JudgeAbortError unchanged, and no engine path builds this partial for a one-question request.
		const fixture = createStockSelectionFixture(0.9, {
			respond: (request, index) => {
				const answers = Object.fromEntries(
					Object.keys(request.questions).map((id) => [id, SYSTEM_ONE_TEV1.answers.refund]),
				)
				if (index === 1) return Response.json({ ...SYSTEM_ONE_TEV1, answers })
				throw new JudgeAbortError(fixture.judge.read({ ...SYSTEM_ONE_TEV1, answers }, request))
			},
		})
		const selected = await fixture.select(
			fixture.conversation,
			fixture.request,
			new AbortController().signal,
		)
		expect(selected.fault?.cause).toBeInstanceOf(JudgeAbortError)
		expect(selected.messages).toEqual(fixture.conversation.view())
		expect(selected.judgments).toEqual([
			buildConditionKey('needed', 'standing', 'request'),
			buildConditionKey('needed', 'acceptance', 'request'),
		])
		expect(selected.usage).toEqual({ prompt: 1950, completion: 8, total: 1958 })
		expect(fixture.conversation.judgments.count).toBe(2)
	})

	it('returns spent usage and completed keys when the signal cancels a later transport call', async () => {
		const controller = new AbortController()
		const fixture = createStockSelectionFixture(0.9, {
			respond: (request, index) => {
				if (index === 2) controller.abort('transport cancelled')
				const answers = Object.fromEntries(
					Object.keys(request.questions).map((id) => [id, SYSTEM_ONE_TEV1.answers.refund]),
				)
				return Response.json({ ...SYSTEM_ONE_TEV1, answers })
			},
		})
		const selected = await fixture.select(fixture.conversation, fixture.request, controller.signal)
		expect(selected.fault?.cause).toBeInstanceOf(JudgeAbortError)
		expect(selected.messages).toEqual(fixture.conversation.view())
		expect(selected.usage).toEqual(JUDGMENT_USAGE)
		expect(selected.judgments).toEqual([buildConditionKey('needed', 'standing', 'request')])
		expect(fixture.transport.requests).toHaveLength(2)
	})

	it('does not report a stale pending record as reused when every refresh fails', async () => {
		const fixture = createStockSelectionFixture(0.9, {
			respond: (request, index) => {
				if (index >= 6) throw 'unavailable'
				const answers = Object.fromEntries(
					Object.keys(request.questions).map((id) => [id, SYSTEM_ONE_TEV1.answers.refund]),
				)
				return Response.json({ ...SYSTEM_ONE_TEV1, answers })
			},
		})
		const signal = new AbortController().signal
		await fixture.select(fixture.conversation, fixture.request, signal)
		fixture.conversation.add({ role: 'assistant', content: 'Additional context.' })
		const selected = await fixture.select(fixture.conversation, fixture.request, signal)
		expect(selected.judgments).toEqual([])
		expect(selected.usage).toBeUndefined()
		expect(selected.fault?.cause).toBe('unavailable')
		expect(selected.messages).toEqual(fixture.conversation.view())
	})

	it('keeps a recorded refusal and reuses it without an inference call', async () => {
		const fixture = createStockSelectionFixture(0.9)
		await fixture.select(fixture.conversation, fixture.request, new AbortController().signal)
		const { answer: _answer, ...record } = requireValue(
			fixture.conversation.judgments.judgments()[0],
		)
		fixture.conversation.judgments.add({ ...record, refusal: { missing: ['true'] } })
		const selected = await fixture.select(
			fixture.conversation,
			fixture.request,
			new AbortController().signal,
		)
		expect(selected.messages.map((message) => message.id)).toEqual(['standing', 'request'])
		expect(selected.usage).toBeUndefined()
		expect(fixture.transport.requests).toHaveLength(5)
		expect(inferApplicability(fixture.conversation, fixture.request, fixture.options)[0]).toEqual({
			id: 'standing',
		})
	})

	it('keeps the default context path free of judge requests', () => {
		const context = createAgentContext()
		const request = context.messages.add({ role: 'user', content: 'Continue.' })
		expect(context.select(request, new AbortController().signal)).toBeUndefined()
	})

	it('derives the labelled stand-in expectations from recorded probabilities at the test cutoff', async () => {
		const fixture = createStockSelectionFixture(0.98, {
			probabilities: {
				standing: SYSTEM_ONE_TEV1.answers.refund.noul,
				acceptance: SYSTEM_ONE_TEV1.answers.refund.noul,
				withdrawal: SYSTEM_ONE_TEV1.answers.refund.noul,
				reply: SYSTEM_ONE_TEV1.answers.severity.probabilities['1'],
				unrelated: SYSTEM_ONE_TEV1.answers.label.probabilities.account,
			},
		})
		const selected = await fixture.select(
			fixture.conversation,
			fixture.request,
			new AbortController().signal,
		)
		expect(inferApplicability(fixture.conversation, fixture.request, fixture.options)).toEqual([
			{ id: 'standing', needed: true },
			{ id: 'acceptance', needed: true },
			{ id: 'reply' },
			{ id: 'withdrawal', needed: true },
			{ id: 'unrelated', needed: false },
			{ id: 'request' },
		])
		expect(selected.messages.map((message) => message.id)).toEqual([
			'standing',
			'acceptance',
			'reply',
			'withdrawal',
			'request',
		])
	})

	it('counts requests below and above screen size and across three compactions', async () => {
		const messages = buildSelectionCostMessages()
		const bounded = createStockSelectionFixture(0.9, { messages, limit: 7 })
		const signal = new AbortController().signal
		const selected = await bounded.select(bounded.conversation, bounded.request, signal)
		expect(bounded.transport.requests).toHaveLength(7)
		// The unasked assistant-2 keeps its whole exchange, so the dropped note-2 stays.
		expect(selected.messages.map((message) => message.id)).toEqual(
			messages.slice(6).map((message) => message.id),
		)
		const full = createStockSelectionFixture(0.9, { messages, limit: 30 })
		await full.select(full.conversation, full.request, signal)
		expect(full.transport.requests).toHaveLength(24)
		await full.conversation.compact({ keep: 16 })
		await full.select(full.conversation, full.request, signal)
		expect(full.transport.requests).toHaveLength(40)
		await full.conversation.compact({ keep: 10 })
		await full.select(full.conversation, full.request, signal)
		expect(full.transport.requests).toHaveLength(51)
		await full.conversation.compact({ keep: 4 })
		await full.select(full.conversation, full.request, signal)
		expect(full.transport.requests).toHaveLength(57)
	})
})
