import type { LedgerOptions, MessageInput, Selection } from '@src/core'
import {
	LEDGER_NOTES,
	LEDGER_QUESTIONS,
	Ledger,
	createLedger,
	createScope,
	estimateMessages,
} from '@src/core'
import { isRecord, isString } from '@orkestrel/contract'
import { createTool } from '@orkestrel/tool'
import { requireValue } from '@orkestrel/test'
import { beforeEach, describe, expect, it } from 'vitest'
import {
	RecordedTransport,
	RecordingJudge,
	SequentialSystemOneJudge,
	createScriptedProvider,
} from '../../../setup.js'

describe('Ledger', () => {
	let judge: RecordingJudge
	let options: LedgerOptions
	beforeEach(() => {
		judge = new RecordingJudge()
		options = {
			judge,
			system: 'Serve the desk.',
			questions: LEDGER_QUESTIONS,
			thresholds: { category: 0.7, topic: 0.8, correction: 0.3, amends: 0.8, supersedes: 0.8 },
			topics: [{ name: 'refunds', criterion: 'Refund amounts' }],
			capacity: 4096,
			gauge: { scale: 1, fixed: 0 },
			lookups: [
				{
					tool: createTool({
						name: 'lookup',
						description: 'Read an owner record.',
						parameters: { type: 'object' },
						execute: (args) =>
							args.id === 'missing'
								? 'No record'
								: 'Account BW-20931: Brightwater Studio. Refund is $148.50.',
					}),
					read: (_args, text) =>
						text === 'No record'
							? undefined
							: { ids: ['BW-20931'], owners: [{ id: 'BW-20931', names: ['Brightwater Studio'] }] },
				},
			],
		}
	})

	it('rejects invalid generation caps with CAPACITY even before calibration', () => {
		const { gauge: _gauge, ...uncalibrated } = options
		for (const predict of [
			-1,
			0.5,
			4096,
			4097,
			Number.NaN,
			Infinity,
			Number.MAX_SAFE_INTEGER + 1,
		]) {
			expect(() => new Ledger(createScriptedProvider([]), { ...uncalibrated, predict })).toThrow(
				expect.objectContaining({ code: 'CAPACITY' }),
			)
		}
		for (const predict of [0, -0, 4095]) {
			expect(
				() => new Ledger(createScriptedProvider([]), { ...uncalibrated, predict }),
			).not.toThrow()
		}
	})

	it('fits the same plan at 4096 with predict 1024 as at 3072 without predict', async () => {
		// The tail total is 2150.4 / 1.06 = 2028.679... units: 2028 fits, 2029 does not.
		for (const length of [8048, 8052]) {
			for (const capacity of [3072, 4096]) {
				const provider = createScriptedProvider([{ content: 'Done.' }], { record: true })
				const ledger = createLedger(provider, {
					...options,
					capacity,
					...(capacity === 4096 ? { predict: 1024 } : {}),
					share: { prompt: 0.7, tail: 1 },
				})
				ledger.conversation.add([
					{ role: 'user', content: 'Seed.' },
					{ role: 'assistant', content: 'a'.repeat(length) },
				])
				await ledger.respond('Review.')
				expect(provider.calls[0]?.messages.some((message) => message.role === 'assistant')).toBe(
					length === 8048,
				)
			}
		}
	})

	it('forwards thinking per pass and omits each absent member', async () => {
		for (const think of [
			undefined,
			{ first: true, answer: false },
			{ first: false },
			{ answer: true },
		]) {
			const provider = createScriptedProvider([{ content: '' }, { content: 'Answer.' }], {
				record: true,
			})
			const ledger = createLedger(provider, {
				...options,
				...(think === undefined ? {} : { think }),
			})
			expect((await ledger.respond('Review.')).passes).toHaveLength(2)
			expect(provider.calls.map((call) => call.options)).toEqual([
				think?.first === undefined ? undefined : { think: think.first },
				think?.answer === undefined ? undefined : { think: think.answer },
			])
		}
	})

	it('prices the wire tail and turn observation without discarded thinking', async () => {
		const prices: Array<number | undefined> = []
		const prompts: string[][] = []
		for (const thinking of [undefined, 'a'.repeat(20000)]) {
			const provider = createScriptedProvider(
				[{ content: 'Done.', usage: { prompt: 200, completion: 4, total: 204 } }],
				{ record: true },
			)
			const ledger = createLedger(provider, options)
			ledger.conversation.add([
				{ role: 'user', content: 'Seed.' },
				{
					role: 'assistant',
					content: 'Earlier reply.',
					...(thinking === undefined ? {} : { thinking }),
				},
			])
			await ledger.respond('Review.')
			const messages = requireValue(provider.calls[0]).messages
			expect(messages.some((message) => message.content === 'Earlier reply.')).toBe(true)
			expect(messages.every((message) => message.thinking === undefined)).toBe(true)
			expect(ledger.gauge?.scale).toBe(200 / estimateMessages(messages))
			prices.push(ledger.gauge?.scale)
			prompts.push(messages.map((message) => message.content))
		}
		expect(prices[1]).toBe(prices[0])
		expect(prompts[1]).toEqual(prompts[0])
	})

	it('reads thinking before recall sizes its result and before the following call observation', async () => {
		const results: string[] = []
		for (const thinking of [undefined, 'a'.repeat(800)]) {
			const calls = [{ id: 'recall', name: 'recall', arguments: { topic: 'delivery' } }]
			const completion = JSON.stringify(calls).length + (thinking?.length ?? 0)
			const provider = createScriptedProvider(
				[
					{
						content: '',
						tools: calls,
						...(thinking === undefined ? {} : { thinking }),
						usage: { prompt: 2700, completion, total: 2700 + completion },
					},
					{ content: 'Done.' },
				],
				{ record: true },
			)
			const ledger = createLedger(provider, {
				...options,
				capacity: thinking === undefined ? 3072 : 4096,
				...(thinking === undefined ? {} : { predict: 1024 }),
			})
			ledger.conversation.add(
				Array.from({ length: 20 }, (_unused, at): MessageInput => ({
					role: 'user',
					content: `Delivery ${at} arrived Tuesday with a completed receipt.`,
				})),
			)
			await ledger.respond('Review.')
			const recalled = requireValue(
				provider.calls[1]?.messages.findLast((message) => message.role === 'tool')?.content,
			)
			expect(recalled).toContain('Delivery 19')
			expect(recalled).toContain('older items not shown')
			results.push(recalled)
		}
		expect(results[1]).toBe(results[0])
	})

	it('reserves the generation cap and retains within-pass thinking when closing recall', async () => {
		for (const replay of ['none', 'turn', 'all'] as const) {
			const calls = [{ id: 'recall', name: 'recall', arguments: { topic: 'absent' } }]
			const completion = JSON.stringify(calls).length + 800
			const provider = Object.assign(
				createScriptedProvider(
					[
						{
							content: '',
							tools: calls,
							thinking: 'a'.repeat(800),
							usage: { prompt: 2700, completion, total: 2700 + completion },
						},
						{ content: 'Done.' },
					],
					{ record: true },
				),
				{ replay },
			)
			const ledger = createLedger(provider, { ...options, predict: 1024 })
			await ledger.respond('Review.')
			expect(
				provider.calls[1]?.messages.findLast((message) => message.role === 'tool')?.content,
			).toBe(
				replay === 'none'
					? 'nothing on "absent"; recall an owner name, an id, or one of refunds'
					: LEDGER_NOTES.closed,
			)
		}
	})

	it('reads the final reply thinking before observing its reserve for a later request', async () => {
		const provider = createScriptedProvider(
			[
				{
					content: 'Done.',
					thinking: 'a'.repeat(3995),
					usage: { prompt: 100, completion: 4000, total: 4100 },
				},
				{
					content: '',
					tools: [{ id: 'recall', name: 'recall', arguments: { topic: 'absent' } }],
					usage: { prompt: 2000, completion: 20, total: 2020 },
				},
				{ content: 'Done.' },
			],
			{ record: true },
		)
		const ledger = createLedger(provider, { ...options, predict: 1024 })
		await ledger.respond('First.')
		await ledger.respond('Second.')
		expect(
			provider.calls[2]?.messages.findLast((message) => message.role === 'tool')?.content,
		).toBe('nothing on "absent"; recall an owner name, an id, or one of refunds')
	})

	it('passes the generation reserve to supplied and calibrated gauges', async () => {
		for (const calibrated of [false, true]) {
			const provider = createScriptedProvider(
				[
					...(calibrated
						? [
								{ content: '', usage: { prompt: 8, completion: 1, total: 9 } },
								{ content: '', usage: { prompt: 8, completion: 1, total: 9 } },
							]
						: []),
					{
						content: '',
						tools: [{ id: 'recall', name: 'recall', arguments: { topic: 'absent' } }],
						usage: { prompt: 3500, completion: 1, total: 3501 },
					},
					{ content: 'Done.' },
				],
				{ record: true },
			)
			const { gauge: _gauge, ...uncalibrated } = options
			const ledger = createLedger(provider, {
				...(calibrated ? uncalibrated : options),
				predict: 1024,
			})
			await ledger.respond('Review.')
			expect(
				provider.calls.at(-1)?.messages.findLast((message) => message.role === 'tool')?.content,
			).toBe(LEDGER_NOTES.closed)
		}
	})

	it('answers in one pass with owner records, a truthful seed stub, and a seed-only tail', async () => {
		const provider = createScriptedProvider(
			[{ content: 'Approved.', usage: { prompt: 100, completion: 3, total: 103 } }],
			{ record: true },
		)
		const ledger = createLedger(provider, options)
		ledger.conversation.add([
			{ role: 'user', content: 'Brightwater Studio called.' },
			{ role: 'assistant', content: 'An obsolete assistant answer.' },
			{
				role: 'assistant',
				content: 'Reading the seed account.',
				calls: [{ id: 'seed', name: 'lookup', arguments: { id: 'BW-20931' } }],
			},
			{
				role: 'tool',
				call: 'seed',
				content: 'Account BW-20931: Brightwater Studio. Refund is $148.50.',
			},
		])
		const result = await ledger.respond('Check Brightwater Studio.')
		expect(result).toMatchObject({
			content: 'Approved.',
			partial: false,
			usage: { prompt: 100, completion: 3, total: 103 },
		})
		expect(result.passes).toHaveLength(1)
		const first = requireValue(provider.calls[0])
		expect(first.messages[0]?.content).toContain(
			'## Pinned\n### Brightwater Studio (account BW-20931)',
		)
		expect(first.messages.find((message) => message.role === 'tool')?.content).toContain(
			'result shown under Pinned',
		)
		expect(first.messages.map((message) => message.content).join('\n')).toContain(
			'obsolete assistant answer',
		)
		expect(first.messages.find((message) => message.calls?.length)?.content).toBe(
			'Reading the seed account.',
		)
		expect(first.messages[0]?.content).toContain('- Account BW-20931: Brightwater Studio.')
		expect(first.messages[0]?.content).not.toContain('lookup {"id":"BW-20931"}:')
		expect(first.tools?.map((tool) => tool.name)).toEqual(['lookup', 'recall'])
		await ledger.respond('Check the desk again.')
		const second = requireValue(provider.calls[1])
		expect(
			second.messages.some(
				(message) =>
					message.content === 'Check Brightwater Studio.' || message.content === 'Approved.',
			),
		).toBe(false)
		expect(ledger.conversation.summarizable).toBe(false)
		expect(ledger.conversation.sections).toEqual([])
	})

	it('opens the seed tail on a user and keeps empty assistants and text from dropped calls', async () => {
		const provider = createScriptedProvider([{ content: 'Done.' }], { record: true })
		const ledger = createLedger(provider, options)
		const seed = ledger.conversation.add([
			{ role: 'assistant', content: 'Welcome to the desk.' },
			{ role: 'user', content: 'Order LH-12345 is late.' },
			{ role: 'assistant', content: '' },
			{
				role: 'assistant',
				content: 'The earlier call was dropped.',
				calls: [{ id: 'dropped', name: 'unregistered', arguments: {} }],
			},
			{ role: 'tool', call: 'dropped', content: 'Unregistered result.' },
		])
		await ledger.respond('Check LH-12345.')
		const messages = requireValue(provider.calls[0]).messages.slice(1)
		expect(messages.map((message) => message.content)).toEqual([
			'Order LH-12345 is late.',
			'',
			'The earlier call was dropped.',
			'Check LH-12345.',
		])
		expect(messages.find((message) => message.id === seed[3]?.id)).not.toHaveProperty('calls')
	})

	it('detects repeats with reused call ids and nested argument order, then collapses every call including the seed', async () => {
		const provider = createScriptedProvider(
			[
				{
					content: 'Looking.',
					tools: [
						{ id: 'same', name: 'lookup', arguments: { id: 'BW-20931', detail: { a: 1, b: 2 } } },
					],
					usage: { prompt: 100, completion: 5, total: 105 },
				},
				{
					content: '',
					tools: [
						{ id: 'same', name: 'lookup', arguments: { detail: { b: 2, a: 1 }, id: 'BW-20931' } },
					],
					usage: { prompt: 120, completion: 5, total: 125 },
				},
				{
					content: 'Refund is $148.50.',
					thinking: 'Answered from results.',
					usage: { prompt: 130, completion: 8, total: 138 },
				},
			],
			{ record: true },
		)
		const ledger = createLedger(provider, options)
		ledger.conversation.add([
			{ role: 'user', content: 'Brightwater Studio called.' },
			{
				role: 'assistant',
				content: '',
				calls: [{ id: 'same', name: 'lookup', arguments: { id: 'BW-20931' } }],
			},
			{
				role: 'tool',
				call: 'same',
				content: 'Account BW-20931: Brightwater Studio. Refund is $140.',
			},
		])
		const selections: Selection[] = []
		const aborts: unknown[] = []
		ledger.agent.emitter.on('select', (selection) => selections.push(selection))
		ledger.agent.emitter.on('abort', (reason) => aborts.push(reason))
		const result = await ledger.respond('Check Brightwater Studio.')
		expect(result.passes.map((pass) => pass.partial)).toEqual([true, false])
		expect(result.content).toBe('Refund is $148.50.')
		expect(result.usage).toEqual({ prompt: 350, completion: 18, total: 368 })
		expect(result.thinking).toBe('Answered from results.')
		expect(aborts).toEqual(['repeat'])
		expect(
			ledger.conversation
				.messages()
				.some((message) => message.role === 'tool' && message.content === LEDGER_NOTES.repeat),
		).toBe(true)
		const answer = requireValue(provider.calls[2])
		expect(answer.tools).toBeUndefined()
		expect(
			answer.messages.every((message) => message.role !== 'tool' && message.calls === undefined),
		).toBe(true)
		expect(answer.messages.at(-1)?.content).toBe(LEDGER_NOTES.cue)
		expect(
			answer.messages.some(
				(message) =>
					message.content ===
					`${LEDGER_NOTES.results}\nlookup {"id":"BW-20931","detail":{"a":1,"b":2}}: Account BW-20931: Brightwater Studio. Refund is $148.50.`,
			),
		).toBe(true)
		expect(selections[1]?.briefing).toBe(selections[0]?.briefing)
		expect(selections[1]?.judgments).toEqual([])
		const entered = requireValue(selections[0])
		const requestAt = ledger.conversation
			.messages()
			.findIndex((message) => message.content === 'Check Brightwater Studio.')
		const cueAt = ledger.conversation
			.messages()
			.findIndex((message) => message.content === LEDGER_NOTES.cue)
		expect(selections[1]?.messages).toEqual(
			[
				...entered.messages,
				...ledger.conversation.messages().slice(requestAt + 1, cueAt + 1),
			].filter((message) => message.role !== 'tool' && (message.calls?.length ?? 0) === 0),
		)
		expect(ledger.agent.context.scope).toBeUndefined()
	})

	it('runs an answer pass after an empty result or an exhausted first pass', async () => {
		const empty = createScriptedProvider([{ content: '' }, { content: 'Answer.' }], {
			record: true,
		})
		const ledger = createLedger(empty, options)
		expect((await ledger.respond('Answer this.')).passes).toHaveLength(2)
		expect(empty.calls[1]?.tools).toBeUndefined()
		const exhausted = createScriptedProvider(
			[
				{ content: '', tools: [{ id: 'read', name: 'lookup', arguments: { id: 'BW-20931' } }] },
				{ content: 'Recovered.' },
			],
			{ record: true },
		)
		const bounded = createLedger(exhausted, { ...options, agent: { limit: 1 } })
		expect((await bounded.respond('Read the account.')).passes.map((pass) => pass.partial)).toEqual(
			[true, false],
		)
	})

	it('attempts the answer pass after transport failure and local timeout', async () => {
		const broken = createScriptedProvider(
			[
				{
					content: '',
					tools: [{ id: 'one', name: 'lookup', arguments: { id: 'BW-20931' } }],
					usage: { prompt: 10, completion: 2, total: 12 },
				},
				{ content: 'transport failed' },
				{ content: 'Recovered.', usage: { prompt: 20, completion: 3, total: 23 } },
			],
			{
				record: true,
				deltasOf: (content) => {
					if (content === 'transport failed') throw new Error(content)
					return [content]
				},
			},
		)
		const ledger = createLedger(broken, options)
		const result = await ledger.respond('Check the account.')
		expect(result.passes).toHaveLength(2)
		expect(result.partial).toBe(false)
		expect(result.content).toBe('Recovered.')
		expect(result.usage).toEqual({ prompt: 30, completion: 5, total: 35 })
		expect(broken.calls[2]?.tools).toBeUndefined()
		const slow = createScriptedProvider([{ content: 'Delayed.' }], { delay: 15, record: true })
		const timed = createLedger(slow, { ...options, agent: { timeout: 1 } })
		expect((await timed.respond('Check the account.')).passes).toHaveLength(2)
		expect(slow.calls[1]?.tools).toBeUndefined()
	})

	it('skips the answer pass after caller abort and refuses concurrency before appending', async () => {
		const caller = new AbortController()
		const provider = createScriptedProvider([{ content: 'Delayed.' }], { delay: 10, record: true })
		const ledger = createLedger(provider, options)
		ledger.agent.emitter.on('turn', () => caller.abort('caller'))
		const first = ledger.respond('First request.', caller.signal)
		const count = ledger.conversation.count
		await expect(ledger.respond('Concurrent request.')).rejects.toMatchObject({
			code: 'CONCURRENCY',
		})
		expect(ledger.conversation.count).toBe(count)
		const result = await first
		expect(result.passes).toHaveLength(1)
		expect(result.partial).toBe(true)
		expect(
			ledger.conversation.messages().some((message) => message.content === LEDGER_NOTES.cue),
		).toBe(false)
	})

	it('calibrates with and without tools, disables thinking, and reuses the stored gauge', async () => {
		const provider = createScriptedProvider(
			[
				{ content: '', usage: { prompt: 30, completion: 1, total: 31 } },
				{ content: '', usage: { prompt: 10, completion: 1, total: 11 } },
				{ content: 'Answer.' },
			],
			{ record: true },
		)
		const { gauge: _gauge, ...uncalibrated } = options
		const ledger = createLedger(provider, uncalibrated)
		expect(ledger.gauge).toBeUndefined()
		await ledger.respond('Check the desk.')
		expect(ledger.gauge).toEqual({
			scale: 10 / estimateMessages([{ id: 'system', role: 'system', content: options.system }]),
			fixed: 20,
		})
		expect(provider.calls[0]?.tools?.map((tool) => tool.name)).toEqual(['lookup', 'recall'])
		expect(provider.calls[1]?.tools).toBeUndefined()
		expect(provider.calls[0]?.options).toEqual({ think: false })
		expect(provider.calls[1]?.options).toEqual({ think: false })
		expect(provider.calls[0]?.messages).toEqual(provider.calls[1]?.messages)
		await ledger.respond('Check again.')
		expect(provider.calls).toHaveLength(4)
	})

	it('rejects calibration without usage', async () => {
		const { gauge: _gauge, ...uncalibrated } = options
		const ledger = createLedger(createScriptedProvider([{ content: '' }]), uncalibrated)
		await expect(ledger.calibrate(new AbortController().signal)).rejects.toMatchObject({
			code: 'GAUGE',
		})
		expect(ledger.gauge).toBeUndefined()
	})

	it('validates constructor options with LedgerError', () => {
		expect(() => new Ledger(createScriptedProvider([]), { ...options, capacity: 0 })).toThrow(
			expect.objectContaining({ code: 'CAPACITY' }),
		)
	})

	it('holds calibration admission until it settles and releases it after success or failure', async () => {
		for (const prompt of [0, 30]) {
			const provider = createScriptedProvider(
				[
					{ content: '', usage: { prompt, completion: 1, total: prompt + 1 } },
					{ content: '', usage: { prompt: 10, completion: 1, total: 11 } },
					{ content: 'Done.' },
				],
				{ record: true },
			)
			const ledger = createLedger(provider, options)
			const pending = ledger.calibrate(new AbortController().signal)
			const settled = Promise.allSettled([pending])
			await Promise.all([
				expect(ledger.respond('Concurrent request.')).rejects.toMatchObject({
					code: 'CONCURRENCY',
				}),
				expect(ledger.calibrate(new AbortController().signal)).rejects.toMatchObject({
					code: 'CONCURRENCY',
				}),
			])
			expect((await settled)[0]?.status).toBe(prompt === 0 ? 'rejected' : 'fulfilled')
			expect((await ledger.respond('After calibration.')).content).toBe('Done.')
			expect(provider.calls).toHaveLength(3)
		}
	})

	it('preserves the full view and fault on answer-pass selection failure', async () => {
		const provider = createScriptedProvider([{ content: '' }, { content: 'Recovered.' }], {
			record: true,
		})
		let failed = false
		const fault = new Error('planning failed')
		const ledger = createLedger(provider, {
			...options,
			get system() {
				if (failed) throw fault
				return options.system
			},
		})
		ledger.conversation.add([
			{ role: 'user', content: 'Read the account.' },
			{
				role: 'assistant',
				content: '',
				calls: [{ id: 'seed', name: 'lookup', arguments: { id: 'BW-20931' } }],
			},
			{ role: 'tool', call: 'seed', content: 'Account BW-20931: Brightwater Studio.' },
		])
		const selections: Selection[] = []
		const views: Array<readonly MessageInput[]> = []
		ledger.agent.emitter.on('start', () => {
			failed = true
		})
		ledger.agent.emitter.on('select', (selection) => {
			failed = false
			selections.push(selection)
			views.push(ledger.conversation.view())
		})
		expect((await ledger.respond('Check the account.')).content).toBe('Recovered.')
		expect(selections).toHaveLength(2)
		expect(selections[1]?.fault).toBe(fault)
		expect(selections[1]?.messages).toEqual(views[1])
		expect(provider.calls[1]?.messages.slice(1)).toEqual(views[1])
		expect(provider.calls[1]?.tools).toBeUndefined()
		expect(ledger.agent.context.scope).toBeUndefined()
	})

	it('refuses nonpositive priced usage and recovers the next respond after GAUGE', async () => {
		const { gauge: _gauge, ...uncalibrated } = options
		for (const prompt of [0, -1]) {
			const provider = createScriptedProvider([
				{ content: '', usage: { prompt, completion: 1, total: prompt + 1 } },
				{ content: '', usage: { prompt: 10, completion: 1, total: 11 } },
				{ content: '', usage: { prompt: 30, completion: 1, total: 31 } },
				{ content: '', usage: { prompt: 10, completion: 1, total: 11 } },
				{ content: 'Recovered.' },
			])
			const ledger = createLedger(provider, uncalibrated)
			await expect(ledger.respond('First.')).rejects.toMatchObject({ code: 'GAUGE' })
			expect(ledger.conversation.count).toBe(0)
			expect(ledger.gauge).toBeUndefined()
			expect((await ledger.respond('Second.')).content).toBe('Recovered.')
		}
	})

	it('rejects calibration with the abort reason and refuses calibration during respond', async () => {
		const { gauge: _gauge, ...uncalibrated } = options
		const reason = new Error('caller stopped calibration')
		for (const responding of [false, true]) {
			const ledger = createLedger(createScriptedProvider([{ content: '' }]), uncalibrated)
			await expect(
				responding
					? ledger.respond('Request.', AbortSignal.abort(reason))
					: ledger.calibrate(AbortSignal.abort(reason)),
			).rejects.toBe(reason)
		}
		const provider = createScriptedProvider([{ content: 'Answer.' }], { record: true })
		const ledger = createLedger(provider, options)
		const pending = ledger.respond('Request.')
		await expect(ledger.calibrate(new AbortController().signal)).rejects.toMatchObject({
			code: 'CONCURRENCY',
		})
		expect((await pending).content).toBe('Answer.')
		expect(provider.calls).toHaveLength(1)
	})

	it('returns fallback selections with judgments and spent usage when planning fails', async () => {
		const transport = new RecordedTransport(async () => {
			const request: unknown = await requireValue(transport.requests.at(-1)).json()
			if (!isRecord(request) || !isRecord(request.questions)) throw new Error('invalid request')
			return Response.json({
				model: 'filing',
				answers: Object.fromEntries(
					Object.keys(request.questions).map((key) => [
						key,
						{
							type: 'choice',
							probabilities: {
								fact: 1,
								rule: 0,
								correction: 0,
								request: 0,
								opinion: 0,
								chatter: 0,
								distractor: 0,
							},
						},
					]),
				),
				usage: { input_tokens: 50, output_tokens: 1 },
			})
		})
		let failed = false
		const fault = new Error('system unavailable')
		const ledger = createLedger(createScriptedProvider([]), {
			...options,
			topics: [],
			judge: new SequentialSystemOneJudge({
				url: 'http://judge.test',
				model: 'filing',
				batch: false,
				fetch: transport.fetch,
			}),
			get system() {
				if (failed) throw fault
				return 'Serve the desk.'
			},
		})
		const request = ledger.conversation.add({ role: 'user', content: 'Statement.' })
		failed = true
		const selection = await ledger.agent.context.select(request, new AbortController().signal)
		expect(selection).toEqual({
			messages: ledger.conversation.view(),
			judgments: [JSON.stringify(['category', request.id])],
			usage: { prompt: 50, completion: 1, total: 51 },
			fault,
		})
	})

	it('retains judge usage when the caller aborts classification', async () => {
		const controller = new AbortController()
		const transport = new RecordedTransport(async () => {
			if (transport.requests.length === 2) controller.abort()
			const request: unknown = await requireValue(transport.requests.at(-1)).json()
			if (!isRecord(request) || !isRecord(request.questions)) throw new Error('invalid request')
			return Response.json({
				model: 'filing',
				answers: Object.fromEntries(
					Object.keys(request.questions).map((key) => [
						key,
						{
							type: 'choice',
							probabilities: {
								fact: 1,
								rule: 0,
								correction: 0,
								request: 0,
								opinion: 0,
								chatter: 0,
								distractor: 0,
							},
						},
					]),
				),
				usage: { input_tokens: 50, output_tokens: 1 },
			})
		})
		const provider = createScriptedProvider([], { record: true })
		const ledger = createLedger(provider, {
			...options,
			topics: [],
			judge: new SequentialSystemOneJudge({
				url: 'http://judge.test',
				model: 'filing',
				batch: false,
				fetch: transport.fetch,
			}),
		})
		ledger.conversation.add([
			{ role: 'user', content: 'First.' },
			{ role: 'user', content: 'Second.' },
		])
		const result = await ledger.respond('Request.', controller.signal)
		expect(result.usage).toEqual({ prompt: 50, completion: 1, total: 51 })
		expect(result.partial).toBe(true)
		expect(result.passes).toHaveLength(1)
		expect(provider.calls).toEqual([])
	})

	it('resets selection and message boundaries before a pass whose selection throws', async () => {
		const provider = createScriptedProvider(
			[
				{ content: 'First.', usage: { prompt: 100, completion: 2, total: 102 } },
				{ content: 'Second.', usage: { prompt: 200, completion: 2, total: 202 } },
			],
			{ record: true },
		)
		const ledger = createLedger(provider, options)
		await ledger.respond('First request.')
		ledger.agent.context.apply(
			createScope({
				name: 'failed',
				select: async () => {
					throw new Error('selection failed')
				},
			}),
		)
		await ledger.respond('Second request.')
		expect(ledger.gauge?.scale).toBe(
			200 / estimateMessages(requireValue(provider.calls[1]).messages),
		)
	})

	it('files failed lookups as chatter and preserves a successful seed reading after a reader throws', async () => {
		const lookup = requireValue(options.lookups?.[0])
		const provider = createScriptedProvider(
			[
				{
					content: '',
					tools: [
						{ id: 'unreadable', name: 'lookup', arguments: { id: 'BW-20931' } },
						{ id: 'failed', name: 'lookup', arguments: { id: 'FX-111' } },
					],
				},
				{ content: 'First.' },
				{ content: 'Second.' },
			],
			{ record: true },
		)
		const ledger = createLedger(provider, {
			...options,
			lookups: [
				{
					tool: createTool({
						name: 'lookup',
						execute: (args) => {
							if (args.id === 'FX-111') throw new Error('FX-111 failed')
							return 'BW-20931 unreadable'
						},
					}),
					read: (args, text) => {
						if (text.includes('unreadable')) throw new Error('reading failed')
						return lookup.read(args, text)
					},
				},
			],
		})
		ledger.conversation.add([
			{ role: 'user', content: 'Seed.' },
			{
				role: 'assistant',
				content: '',
				calls: [{ id: 'seed', name: 'lookup', arguments: { id: 'BW-20931' } }],
			},
			{
				role: 'tool',
				call: 'seed',
				content: 'Account BW-20931: Brightwater Studio. Refund is $148.50.',
			},
			{
				role: 'assistant',
				content: '',
				calls: [{ id: 'bad-seed', name: 'lookup', arguments: { id: 'BW-20931' } }],
			},
			{ role: 'tool', call: 'bad-seed', content: 'BW-20931 unreadable seed' },
		])
		await ledger.respond('Read the account.')
		expect(
			provider.calls[0]?.messages.find((message) => message.call === 'bad-seed')?.content,
		).toContain('failed')
		const correction = ledger.conversation.add({
			role: 'user',
			content: 'Correction BW-20931 and FX-111: refund is 150.',
		})
		ledger.conversation.judgments.add({
			id: JSON.stringify(['category', correction.id]),
			question: LEDGER_QUESTIONS.category,
			sources: [correction.id],
			state: `user: ${correction.content}`,
			model: judge.model,
			answer: {
				form: 'choice',
				probabilities: {
					fact: 0,
					rule: 0,
					correction: 1,
					request: 0,
					opinion: 0,
					chatter: 0,
					distractor: 0,
				},
			},
		})
		await ledger.respond('Check Brightwater Studio.')
		const briefing = requireValue(provider.calls[2]?.messages[0]?.content)
		expect(briefing).toContain('Refund is $148.50.')
		expect(briefing).not.toContain('unreadable')
		expect(briefing).not.toContain('FX-111 failed')
		const pairs = judge.requests
			.map((request) => request.state)
			.filter(isString)
			.filter((state) => state.startsWith('Earlier message: tool:'))
		expect(pairs.some((state) => state?.includes('Refund is $148.50.'))).toBe(true)
		expect(
			pairs.some((state) => state?.includes('unreadable') || state?.includes('FX-111 failed')),
		).toBe(false)
	})

	it('counts an empty recall against its limit and permits a short nonclosed result', async () => {
		const provider = createScriptedProvider([
			{ content: '', tools: [{ id: 'empty', name: 'recall', arguments: { topic: '' } }] },
			{ content: '', tools: [{ id: 'next', name: 'recall', arguments: { topic: 'delivery' } }] },
			{ content: 'Done.' },
		])
		const ledger = createLedger(provider, { ...options, recall: { limit: 1 } })
		await ledger.respond('Request.')
		expect(
			ledger.conversation
				.messages()
				.filter((message) => message.role === 'tool')
				.map((message) => message.content),
		).toEqual([
			'recall needs a topic: an owner name, an id, or one of refunds',
			LEDGER_NOTES.closed,
		])
		const short = createLedger(createScriptedProvider([]), { ...options, capacity: 1 })
		const result = await short.agent.context.tools.execute([
			{ id: 'short', name: 'recall', arguments: { topic: 'absent' } },
		])
		expect(result[0]).toMatchObject({
			success: true,
			value: 'nothing on "absent"; recall an owner name, an id, or one of refunds',
		})
	})

	it('recalls joined topics with lookup leads and stops a repeated recall irrespective of category', async () => {
		const provider = createScriptedProvider(
			[
				{
					content: '',
					tools: [
						{
							id: 'recall',
							name: 'recall',
							arguments: { topic: 'Brightwater Studio and delivery', category: 'fact' },
						},
					],
				},
				{
					content: '',
					tools: [
						{
							id: 'recall',
							name: 'recall',
							arguments: { topic: '  Brightwater Studio and delivery  ', category: 'rule' },
						},
					],
				},
				{ content: 'Recalled.' },
			],
			{ record: true },
		)
		const ledger = createLedger(provider, options)
		ledger.conversation.add([
			{ role: 'user', content: 'The delivery arrived on Tuesday.' },
			{
				role: 'assistant',
				content: '',
				calls: [{ id: 'seed', name: 'lookup', arguments: { id: 'BW-20931' } }],
			},
			{
				role: 'tool',
				call: 'seed',
				content: 'Account BW-20931: Brightwater Studio. Refund is $148.50.',
			},
		])
		const result = await ledger.respond('What is known?')
		expect(result.passes).toHaveLength(2)
		const recalled = requireValue(provider.calls[1])
			.messages.filter((message) => message.role === 'tool')
			.at(-1)?.content
		expect(recalled).toContain('Refund is $148.50.')
		expect(recalled).toContain('The delivery arrived on Tuesday.')
		expect(recalled).not.toMatch(/\b[mrp]\d+\b/)
		expect(recalled).toContain('lookup {"id":"BW-20931"}: Account BW-20931: Brightwater Studio.')
		expect(
			provider.calls[0]?.tools?.find((tool) => tool.name === 'recall')?.description,
		).not.toMatch(/handle|\b[mrp]\d+\b/)
	})

	it('closes recall at its limit and when the provider leaves insufficient room', async () => {
		const limited = createScriptedProvider(
			[
				{ content: '', tools: [{ id: 'one', name: 'recall', arguments: { topic: 'delivery' } }] },
				{ content: '', tools: [{ id: 'two', name: 'recall', arguments: { topic: 'refunds' } }] },
				{ content: 'Done.' },
			],
			{ record: true },
		)
		const ledger = createLedger(limited, { ...options, recall: { limit: 1 } })
		ledger.conversation.add({ role: 'user', content: 'Delivery arrived Tuesday.' })
		await ledger.respond('Check the desk.')
		expect(
			ledger.conversation
				.messages()
				.filter((message) => message.role === 'tool')
				.at(-1)?.content,
		).toBe(LEDGER_NOTES.closed)
		const crowded = createScriptedProvider(
			[
				{
					content: '',
					tools: [{ id: 'one', name: 'recall', arguments: { topic: 'refunds' } }],
					usage: { prompt: 4090, completion: 5, total: 4095 },
				},
				{ content: 'Done.' },
			],
			{ record: true },
		)
		const tight = createLedger(crowded, options)
		await tight.respond('Check the desk.')
		expect(tight.conversation.messages().find((message) => message.role === 'tool')?.content).toBe(
			LEDGER_NOTES.closed,
		)
	})

	it('assigns notes, tool failures, calls, and generated answers without category questions', async () => {
		const provider = createScriptedProvider([
			{ content: '', tools: [{ id: 'one', name: 'lookup', arguments: { id: 'BW-20931' } }] },
			{ content: '', tools: [{ id: 'one', name: 'lookup', arguments: { id: 'BW-20931' } }] },
			{ content: 'First answer.' },
			{ content: 'Second answer.' },
		])
		const ledger = createLedger(provider, options)
		const seed = ledger.conversation.add({
			role: 'assistant',
			content: 'Seed assistant statement.',
		})
		await ledger.respond('First request.')
		const written = ledger.conversation
			.messages()
			.filter((message) => message.id !== seed.id && message.role !== 'user')
		await ledger.respond('Second request.')
		const states = judge.requests.map((request) => request.state)
		expect(states).toContain('assistant: Seed assistant statement.')
		for (const message of written)
			expect(states).not.toContain(`${message.role}: ${message.content}`)
		expect(states).not.toContain(`user: ${LEDGER_NOTES.cue}`)
	})

	it('removes stale sentences from the briefing, seed tail, recall, and answer digest for an unscoped request', async () => {
		const provider = createScriptedProvider(
			[
				{ content: '', tools: [{ id: 'read', name: 'recall', arguments: { topic: 'refunds' } }] },
				{ content: '', tools: [{ id: 'read', name: 'recall', arguments: { topic: 'refunds' } }] },
				{ content: 'Use the corrected code.' },
			],
			{ record: true },
		)
		const ledger = createLedger(provider, options)
		const old = ledger.conversation.add({
			role: 'user',
			content: 'Refunds over $200 require approval. Use code MX-4471.',
		})
		const correction = ledger.conversation.add({
			role: 'user',
			content: 'Correction: replace MX-4471 with MX-4486.',
		})
		for (const message of [old, correction]) {
			ledger.conversation.judgments.add({
				id: JSON.stringify(['category', message.id]),
				question: LEDGER_QUESTIONS.category,
				sources: [message.id],
				state: `user: ${message.content}`,
				model: judge.model,
				answer: {
					form: 'choice',
					probabilities: {
						fact: 0,
						rule: message === old ? 1 : 0,
						correction: message === correction ? 1 : 0,
						request: 0,
						opinion: 0,
						chatter: 0,
						distractor: 0,
					},
				},
			})
			ledger.conversation.judgments.add({
				id: JSON.stringify(['topic', message.id, 'refunds']),
				question: {
					form: 'noul',
					instructions: LEDGER_QUESTIONS.topic,
					criteria: {
						true: 'The message concerns refunds: Refund amounts',
						false: 'The message does not concern refunds',
					},
				},
				sources: [message.id],
				state: `user: ${message.content}`,
				model: judge.model,
				answer: { form: 'noul', noul: 1 },
			})
		}
		ledger.conversation.judgments.add({
			id: JSON.stringify(['amends', old.id, correction.id]),
			question: LEDGER_QUESTIONS.amends,
			sources: [old.id, correction.id],
			state: `Earlier message: user: ${old.content}\nLater message: user: ${correction.content}`,
			model: judge.model,
			answer: { form: 'noul', noul: 1 },
		})
		ledger.conversation.judgments.add({
			id: JSON.stringify(['supersedes', old.id, correction.id]),
			question: LEDGER_QUESTIONS.supersedes,
			sources: [old.id, correction.id],
			state: `Earlier message: user: ${old.content}\nLater message: user: ${correction.content}`,
			model: judge.model,
			answer: { form: 'noul', noul: 0 },
		})
		const result = await ledger.respond('Review the desk.')
		expect(result.passes).toHaveLength(2)
		expect(provider.calls[0]?.messages[0]?.content).toContain(
			'## Rules\n- Refunds over $200 require approval.',
		)
		for (const call of provider.calls)
			expect(call.messages.map((message) => message.content).join('\n')).not.toContain(
				'Use code MX-4471.',
			)
		expect(
			provider.calls[1]?.messages.findLast((message) => message.role === 'tool')?.content,
		).toContain('Refunds over $200 require approval.')
		expect(
			provider.calls[2]?.messages.find((message) =>
				message.content.startsWith(LEDGER_NOTES.results),
			)?.content,
		).toContain('MX-4486')
		expect(ledger.conversation.message(old.id)?.content).toContain('Use code MX-4471.')
	})

	it('pins owner corrections while holding owner rules for a request with no owner', async () => {
		const provider = createScriptedProvider([{ content: 'Done.' }], { record: true })
		const ledger = createLedger(provider, { ...options, share: { tail: 0.001 } })
		ledger.conversation.add([
			{
				role: 'assistant',
				content: '',
				calls: [{ id: 'seed', name: 'lookup', arguments: { id: 'BW-20931' } }],
			},
			{ role: 'tool', call: 'seed', content: 'Account BW-20931: Brightwater Studio.' },
		])
		const ownerRule = ledger.conversation.add({
			role: 'user',
			content: 'For Brightwater, require approval for $150.',
		})
		const correction = ledger.conversation.add({
			role: 'user',
			content: 'For Brightwater, the corrected limit is $160.',
		})
		const deskRule = ledger.conversation.add({
			role: 'user',
			content: 'Desk rule: keep 2 receipts.',
		})
		for (const message of [ownerRule, correction, deskRule])
			ledger.conversation.judgments.add({
				id: JSON.stringify(['category', message.id]),
				question: LEDGER_QUESTIONS.category,
				sources: [message.id],
				state: `user: ${message.content}`,
				model: judge.model,
				answer: {
					form: 'choice',
					probabilities: {
						fact: 0,
						rule: message === correction ? 0 : 1,
						correction: message === correction ? 1 : 0,
						request: 0,
						opinion: 0,
						chatter: 0,
						distractor: 0,
					},
				},
			})
		await ledger.respond('Review the desk.')
		const briefing = requireValue(provider.calls[0]?.messages[0]?.content)
		expect(briefing).toContain('## Pinned\nFor Brightwater, the corrected limit is $160.')
		expect(briefing).toContain('## Rules\n- Desk rule: keep 2 receipts.')
		expect(briefing).not.toContain('require approval for $150')
	})

	it('orders group three by score regardless of whether a source is decisive', async () => {
		const provider = createScriptedProvider([{ content: 'Done.' }], { record: true })
		const ledger = createLedger(provider, { ...options, share: { tail: 0.001 } })
		const decisive = ledger.conversation.add({ role: 'user', content: 'For Mira, quantity 10.' })
		const loose = ledger.conversation.add({
			role: 'user',
			content: 'For Mira, special delivery receipt 20.',
		})
		ledger.conversation.judgments.add({
			id: JSON.stringify(['category', decisive.id]),
			question: LEDGER_QUESTIONS.category,
			sources: [decisive.id],
			state: `user: ${decisive.content}`,
			model: judge.model,
			answer: {
				form: 'choice',
				probabilities: {
					fact: 1,
					rule: 0,
					correction: 0,
					request: 0,
					opinion: 0,
					chatter: 0,
					distractor: 0,
				},
			},
		})
		await ledger.respond('Check Mira special delivery receipt.')
		const briefing = requireValue(provider.calls[0]?.messages[0]?.content)
		expect(briefing).toContain(`## Pinned\n${loose.content}\n${decisive.content}`)
	})

	it('renders live amendments after their loose source in briefing and recall and removes superseded turns', async () => {
		const provider = createScriptedProvider(
			[
				{
					content: '',
					tools: [{ id: 'recall', name: 'recall', arguments: { topic: 'Mira' } }],
				},
				{
					content: '',
					tools: [{ id: 'joined', name: 'recall', arguments: { topic: 'Mira and AA-11' } }],
				},
				{ content: 'Done.' },
			],
			{ record: true },
		)
		const ledger = createLedger(provider, { ...options, share: { tail: 0.001 } })
		ledger.conversation.add([
			{
				role: 'assistant',
				content: '',
				calls: [{ id: 'seed', name: 'lookup', arguments: { id: 'BW-20931' } }],
			},
			{ role: 'tool', call: 'seed', content: 'Account BW-20931: Brightwater Studio.' },
		])
		const source = ledger.conversation.add({
			role: 'user',
			content: 'For Mira, keep the receipt. Code AA-10.',
		})
		const correction = ledger.conversation.add({
			role: 'user',
			content: 'Brightwater Studio: replace AA-10 with AA-11.',
		})
		const retired = ledger.conversation.add({ role: 'user', content: 'Retired instruction 42.' })
		ledger.conversation.judgments.add({
			id: JSON.stringify(['category', correction.id]),
			question: LEDGER_QUESTIONS.category,
			sources: [correction.id],
			state: `user: ${correction.content}`,
			model: judge.model,
			answer: {
				form: 'choice',
				probabilities: {
					fact: 0.6,
					rule: 0,
					correction: 0.4,
					request: 0,
					opinion: 0,
					chatter: 0,
					distractor: 0,
				},
			},
		})
		for (const earlier of [source, retired]) {
			for (const head of ['amends', 'supersedes'] as const)
				ledger.conversation.judgments.add({
					id: JSON.stringify([head, earlier.id, correction.id]),
					question: LEDGER_QUESTIONS[head],
					sources: [earlier.id, correction.id],
					state: `Earlier message: user: ${earlier.content}\nLater message: user: ${correction.content}`,
					model: judge.model,
					answer: { form: 'noul', noul: head === 'amends' || earlier === retired ? 1 : 0 },
				})
		}
		await ledger.respond('Check Mira receipt.')
		const expected = `For Mira, keep the receipt.\n${correction.content}`
		expect(provider.calls[0]?.messages[0]?.content).toContain(expected)
		expect(
			provider.calls[1]?.messages.findLast((message) => message.role === 'tool')?.content,
		).toBe(expected)
		expect(
			provider.calls[2]?.messages.findLast((message) => message.role === 'tool')?.content,
		).toBe(`${correction.content}\nFor Mira, keep the receipt.`)
		expect(provider.calls[0]?.messages[0]?.content).not.toContain('[amended by')
		ledger.conversation.judgments.add({
			id: JSON.stringify(['category', source.id]),
			question: LEDGER_QUESTIONS.category,
			sources: [source.id],
			state: `user: ${source.content}`,
			model: judge.model,
			answer: { form: 'choice', probabilities: { rule: 1 } },
		})
		const request = ledger.conversation.add({ role: 'user', content: 'Inspect the full seed.' })
		const selection = await ledger.agent.context.select(request, new AbortController().signal)
		expect(selection?.messages.some((message) => message.id === retired.id)).toBe(false)
		expect(selection?.briefing).toContain('For Mira, keep the receipt.')
		expect(selection?.briefing).not.toContain(correction.content)
	})

	it('leaves a live owner-record amendment out of the briefing when a decisive rule unit is amended', async () => {
		const provider = createScriptedProvider([{ content: 'Done.' }], { record: true })
		const ledger = createLedger(provider, { ...options, share: { tail: 0.001 } })
		ledger.conversation.add([
			{
				role: 'assistant',
				content: '',
				calls: [{ id: 'seed', name: 'lookup', arguments: { id: 'BW-20931' } }],
			},
			{ role: 'tool', call: 'seed', content: 'Account BW-20931: Brightwater Studio.' },
		])
		const rule = ledger.conversation.add({
			role: 'user',
			content: 'Brightwater Studio: keep the receipt. Code AA-10.',
		})
		const amendment = ledger.conversation.add({
			role: 'user',
			content: 'Brightwater Studio: replace AA-10 with AA-11.',
		})
		ledger.conversation.judgments.add({
			id: JSON.stringify(['category', rule.id]),
			question: LEDGER_QUESTIONS.category,
			sources: [rule.id],
			state: `user: ${rule.content}`,
			model: judge.model,
			answer: { form: 'choice', probabilities: { rule: 1 } },
		})
		ledger.conversation.judgments.add({
			id: JSON.stringify(['category', amendment.id]),
			question: LEDGER_QUESTIONS.category,
			sources: [amendment.id],
			state: `user: ${amendment.content}`,
			model: judge.model,
			answer: { form: 'choice', probabilities: { fact: 0.6, correction: 0.4 } },
		})
		for (const head of ['amends', 'supersedes'] as const)
			ledger.conversation.judgments.add({
				id: JSON.stringify([head, rule.id, amendment.id]),
				question: LEDGER_QUESTIONS[head],
				sources: [rule.id, amendment.id],
				state: `Earlier message: user: ${rule.content}\nLater message: user: ${amendment.content}`,
				model: judge.model,
				answer: { form: 'noul', noul: head === 'amends' ? 1 : 0 },
			})
		await ledger.respond('Greet the desk.')
		const request = ledger.conversation.add({ role: 'user', content: 'Inspect the full seed.' })
		const selection = await ledger.agent.context.select(request, new AbortController().signal)
		expect(selection?.briefing).toContain('Brightwater Studio: keep the receipt.')
		expect(selection?.briefing).not.toContain('AA-11')
	})

	it('drops an empty seed assistant whose calls were all dropped but keeps an empty assistant without calls', async () => {
		const provider = createScriptedProvider([{ content: 'Done.' }], { record: true })
		const ledger = createLedger(provider, options)
		ledger.conversation.add([
			{ role: 'user', content: 'Order LH-12345 is late.' },
			{
				role: 'assistant',
				content: '',
				calls: [{ id: 'dropped', name: 'unregistered', arguments: {} }],
			},
			{ role: 'tool', call: 'dropped', content: 'Unregistered result.' },
		])
		await ledger.respond('Check LH-12345.')
		const messages = requireValue(provider.calls[0]).messages.slice(1)
		expect(messages.map((message) => message.content)).toEqual([
			'Order LH-12345 is late.',
			'Check LH-12345.',
		])
	})

	it('matches partial owner words on units and recall but uses exact ids and label substrings for query topics', async () => {
		const provider = createScriptedProvider(
			[
				{
					content: '',
					tools: [{ id: 'partial', name: 'recall', arguments: { topic: 'Brightw' } }],
				},
				{
					content: '',
					tools: [
						{ id: 'exact', name: 'recall', arguments: { topic: 'account BW-20931 unrelated' } },
					],
				},
				{
					content: '',
					tools: [{ id: 'unmatched', name: 'recall', arguments: { topic: 'Brightwater unknown' } }],
				},
				{ content: 'Done.' },
			],
			{ record: true },
		)
		const ledger = createLedger(provider, {
			...options,
			share: { tail: 0.001 },
			recall: { limit: 3 },
		})
		ledger.conversation.add([
			{
				role: 'assistant',
				content: '',
				calls: [{ id: 'seed', name: 'lookup', arguments: { id: 'BW-20931' } }],
			},
			{ role: 'tool', call: 'seed', content: 'Account BW-20931: Brightwater Studio.' },
			{ role: 'user', content: 'For Brightwater, keep receipt 42.' },
		])
		await ledger.respond('Check Brightwater.')
		expect(provider.calls[0]?.messages[0]?.content).toContain('- For Brightwater, keep receipt 42.')
		for (const at of [1, 2])
			expect(
				provider.calls[at]?.messages.findLast((message) => message.role === 'tool')?.content,
			).toContain('For Brightwater, keep receipt 42.')
		expect(
			provider.calls[3]?.messages.findLast((message) => message.role === 'tool')?.content,
		).toBe('nothing on "Brightwater unknown"; recall an owner name, an id, or one of refunds')
	})

	it('omits superseded user messages from an otherwise uncut seed tail', async () => {
		const provider = createScriptedProvider([{ content: 'Done.' }], { record: true })
		const ledger = createLedger(provider, options)
		const old = ledger.conversation.add({ role: 'user', content: 'Use instruction 42.' })
		const reply = ledger.conversation.add({ role: 'assistant', content: 'Using instruction 42.' })
		const correction = ledger.conversation.add({
			role: 'user',
			content: 'Replace instruction 42 with 43.',
		})
		ledger.conversation.judgments.add({
			id: JSON.stringify(['supersedes', old.id, correction.id]),
			question: LEDGER_QUESTIONS.supersedes,
			sources: [old.id, correction.id],
			state: `Earlier message: user: ${old.content}\nLater message: user: ${correction.content}`,
			model: judge.model,
			answer: { form: 'noul', noul: 1 },
		})
		await ledger.respond('Request.')
		expect(provider.calls[0]?.messages.some((message) => message.id === old.id)).toBe(false)
		expect(provider.calls[0]?.messages.some((message) => message.id === reply.id)).toBe(false)
		expect(
			provider.calls[0]?.messages.find((message) => message.id === correction.id)?.content,
		).toBe(correction.content)
	})

	it('reserves only the final answer completion when a later request recalls', async () => {
		const provider = createScriptedProvider(
			[
				{
					content: '',
					tools: [{ id: 'lookup', name: 'lookup', arguments: { id: 'missing' } }],
					usage: { prompt: 100, completion: 2000, total: 2100 },
				},
				{ content: 'Done.', usage: { prompt: 100, completion: 3, total: 103 } },
				{
					content: '',
					tools: [{ id: 'recall', name: 'recall', arguments: { topic: 'absent' } }],
					usage: { prompt: 100, completion: 3, total: 103 },
				},
				{ content: 'Done.' },
			],
			{ record: true },
		)
		const ledger = createLedger(provider, options)
		await ledger.respond('First request.')
		await ledger.respond('Second request.')
		expect(
			provider.calls[3]?.messages.findLast((message) => message.role === 'tool')?.content,
		).toBe('nothing on "absent"; recall an owner name, an id, or one of refunds')
	})

	it('cuts off-topic rules before owner lines and keeps tail exchanges and call groups whole', async () => {
		const provider = createScriptedProvider([{ content: 'Done.' }], { record: true })
		const ledger = createLedger(provider, {
			...options,
			capacity: 260,
			share: { prompt: 1, tail: 0.2 },
		})
		const rule = ledger.conversation.add({
			role: 'user',
			content: `Standing rule for warehouse 42: ${'Keep the loading area clear. '.repeat(20)}`,
		})
		ledger.conversation.judgments.add({
			id: JSON.stringify(['category', rule.id]),
			question: LEDGER_QUESTIONS.category,
			sources: [rule.id],
			state: `user: ${rule.content}`,
			model: judge.model,
			answer: {
				form: 'choice',
				probabilities: {
					fact: 0,
					rule: 1,
					correction: 0,
					request: 0,
					opinion: 0,
					chatter: 0,
					distractor: 0,
				},
			},
		})
		ledger.conversation.add([
			{ role: 'user', content: 'Brightwater Studio called.' },
			{
				role: 'assistant',
				content: '',
				calls: [{ id: 'seed', name: 'lookup', arguments: { id: 'BW-20931' } }],
			},
			{
				role: 'tool',
				call: 'seed',
				content: 'Account BW-20931: Brightwater Studio. Refund is $148.50.',
			},
		])
		await ledger.respond('Check Brightwater Studio.')
		const call = requireValue(provider.calls[0])
		expect(call.messages[0]?.content).toContain('Refund is $148.50.')
		expect(call.messages[0]?.content).not.toContain('Keep the loading area clear. '.repeat(20))
		expect(estimateMessages(call.messages)).toBeLessThanOrEqual(260 / 1.06)
		expect(call.messages.filter((message) => message.role === 'tool')).toHaveLength(0)
		expect(call.messages.filter((message) => message.calls !== undefined)).toHaveLength(0)
	})

	it('uses the measured default turn limit and the default recall limit', async () => {
		const provider = createScriptedProvider(
			Array.from({ length: 8 }, (_unused, at) => ({
				content: '',
				tools: [{ id: `call-${at}`, name: 'lookup', arguments: { id: `BW-${at}` } }],
			})),
			{ record: true },
		)
		const ledger = createLedger(provider, options)
		const result = await ledger.respond('Check the desk.')
		expect(result.passes[0]?.partial).toBe(true)
		expect(provider.calls).toHaveLength(9)
		expect(provider.calls[8]?.tools).toBeUndefined()
		const recalls = createScriptedProvider([
			{ content: '', tools: [{ id: 'one', name: 'recall', arguments: { topic: 'one' } }] },
			{ content: '', tools: [{ id: 'two', name: 'recall', arguments: { topic: 'two' } }] },
			{ content: '', tools: [{ id: 'three', name: 'recall', arguments: { topic: 'three' } }] },
			{ content: 'Done.' },
		])
		const limited = createLedger(recalls, options)
		await limited.respond('Check the desk.')
		expect(
			limited.conversation
				.messages()
				.filter((message) => message.role === 'tool')
				.map((message) => message.content),
		).toEqual([
			'nothing on "one"; recall an owner name, an id, or one of refunds',
			'nothing on "two"; recall an owner name, an id, or one of refunds',
			LEDGER_NOTES.closed,
		])
	})

	it('prices only the recall topic and cuts whole source results to the available room', async () => {
		const provider = createScriptedProvider(
			[
				{
					content: '',
					tools: [
						{
							id: 'one',
							name: 'recall',
							arguments: { topic: 'delivery', category: 'unused'.repeat(1000) },
						},
					],
				},
				{ content: 'Done.' },
			],
			{ record: true },
		)
		const ledger = createLedger(provider, {
			...options,
			capacity: 350,
			share: { prompt: 0.2, tail: 0.1 },
		})
		ledger.conversation.add(
			Array.from({ length: 20 }, (_unused, at): MessageInput => ({
				role: 'user',
				content: `Delivery ${at} arrived Tuesday with a completed receipt.`,
			})),
		)
		await ledger.respond('Review the desk.')
		const recalled = requireValue(
			provider.calls[1]?.messages.findLast((message) => message.role === 'tool')?.content,
		)
		expect(recalled).toContain('Delivery 19 arrived Tuesday with a completed receipt.')
		expect(recalled).toContain('Delivery 18 arrived Tuesday with a completed receipt.')
		expect(recalled).toMatch(/\d+ older items not shown/)
		expect(recalled).not.toContain('unused')
	})

	it('removes recalled results from the digest when a later empty lookup replaces their source', async () => {
		const provider = createScriptedProvider(
			[
				{
					content: '',
					tools: [{ id: 'recall', name: 'recall', arguments: { topic: 'Brightwater Studio' } }],
				},
				{ content: '', tools: [{ id: 'lookup', name: 'lookup', arguments: { id: 'BW-20931' } }] },
				{ content: '', tools: [{ id: 'lookup', name: 'lookup', arguments: { id: 'BW-20931' } }] },
				{ content: 'No record remains.' },
			],
			{ record: true },
		)
		const lookup = requireValue(options.lookups?.[0])
		const ledger = createLedger(provider, {
			...options,
			lookups: [{ ...lookup, tool: createTool({ name: 'lookup', execute: () => 'No record' }) }],
		})
		ledger.conversation.add([
			{ role: 'user', content: 'The caller asked about the account.' },
			{
				role: 'assistant',
				content: '',
				calls: [{ id: 'seed', name: 'lookup', arguments: { id: 'BW-20931' } }],
			},
			{
				role: 'tool',
				call: 'seed',
				content: 'Account BW-20931: Brightwater Studio. Refund is $140.',
			},
		])
		await ledger.respond('Check the account.')
		expect(
			provider.calls[1]?.messages.findLast((message) => message.role === 'tool')?.content,
		).toContain('Refund is $140.')
		expect(
			provider.calls[3]?.messages.find((message) =>
				message.content.startsWith(LEDGER_NOTES.results),
			)?.content,
		).toBe(`${LEDGER_NOTES.results}\nlookup {"id":"BW-20931"}: No record`)
		await ledger.respond('Check Brightwater Studio again.')
		expect(provider.calls[4]?.messages[0]?.content).not.toContain('Refund is $140.')
	})
})
