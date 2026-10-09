import type { JudgeInterface, JudgeRequest, JudgeResult } from '@src/core'
import { createConversation, JudgeAbortError } from '@src/core'
import { isRecord } from '@orkestrel/contract'
import { requireValue } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import { Classifier } from '../../../../src/core/ledgers/Classifier.js'
import {
	DETERMINISTIC_JUDGE_ERROR,
	LEDGER_QUESTIONS,
} from '../../../../src/core/ledgers/constants.js'
import { extractTokens, matchEntities } from '../../../../src/core/ledgers/helpers.js'
import { JudgeError } from '../../../../src/core/providers/errors.js'
import {
	RecordedTransport,
	RecordingJudge,
	ScriptedJudge,
	SequentialSystemOneJudge,
} from '../../../setup.js'
import { buildLedgerMessage } from '../../../setupLedger.js'

describe('Classifier', () => {
	it('holds a QUESTION rejection without asking the refused spec twice', async () => {
		const conversation = createConversation()
		const message = conversation.add({ role: 'user', content: 'Refund AB-12 is 20.' })
		const key = JSON.stringify(['category', message.id])
		const judge = new ScriptedJudge({
			url: 'http://judge.test',
			model: 'filing',
			refuse: key,
			fetch: new RecordedTransport(() => Response.json({ model: 'filing' })).fetch,
		})
		const classifier = new Classifier({
			conversation,
			judge,
			questions: LEDGER_QUESTIONS,
			topics: [],
			thresholds: { category: 0.7, topic: 0.8, correction: 0.3, amends: 0.8, supersedes: 0.8 },
			assign: () => undefined,
			entities: () => new Set(),
		})
		expect(await classifier.classify(new Set(), new AbortController().signal)).toEqual({
			judgments: [],
		})
		expect(judge.bodies).toHaveLength(1)
		expect(await classifier.classify(new Set(), new AbortController().signal)).toEqual({
			judgments: [],
		})
		expect(judge.bodies).toHaveLength(1)
		expect(classifier.category(message.id)).toBeUndefined()
	})

	it('pins measured category, topic, and pair bytes, asking order, request trimming, reuse, and usage', async () => {
		const conversation = createConversation({
			snapshot: {
				id: 'filing',
				sections: [],
				messages: [
					buildLedgerMessage('m1', 'user', 'Refund AB-12 is 20.'),
					buildLedgerMessage('m2', 'user', 'Correction: refund AB-12 is 30, not 20.'),
					buildLedgerMessage('m3', 'user', 'Thanks.'),
					buildLedgerMessage('m4', 'user', 'Check AB-12.'),
					buildLedgerMessage('m5', 'tool', 'Refund AB-12 is 30.'),
				],
			},
		})
		const transport = new RecordedTransport(async () => {
			const request: unknown = await requireValue(transport.requests.at(-1)).json()
			if (!isRecord(request) || !isRecord(request.questions)) throw new Error('invalid request')
			return Response.json({
				model: 'filing',
				answers: Object.fromEntries(
					Object.entries(request.questions).map(([key, question]) => [
						key,
						isRecord(question) && question.type === 'choice'
							? {
									type: 'choice',
									probabilities: {
										fact: key.includes('m1') ? 1 : 0,
										rule: 0,
										correction: key.includes('m2') ? 1 : 0,
										request: 0,
										opinion: 0,
										chatter: key.includes('m3') ? 1 : 0,
										distractor: 0,
									},
								}
							: { type: 'noul', noul: key.includes('supersedes') ? 0.2 : 0.9 },
					]),
				),
				usage: { input_tokens: 2, output_tokens: 1 },
			})
		})
		const judge = new SequentialSystemOneJudge({
			url: 'http://judge.test',
			model: 'filing',
			batch: false,
			fetch: transport.fetch,
		})
		const classifier = new Classifier({
			conversation,
			judge,
			questions: LEDGER_QUESTIONS,
			topics: [
				{ name: 'refunds', criterion: 'Refund amounts' },
				{ name: 'warehouse', criterion: 'Warehouse work', requested: false },
			],
			thresholds: { category: 0.7, topic: 0.8, correction: 0.3, amends: 0.8, supersedes: 0.8 },
			assign: (message) => (message.role === 'tool' ? 'fact' : undefined),
			entities: (text) => extractTokens(text).ids,
		})
		const result = await classifier.classify(new Set(['m4']), new AbortController().signal)
		expect(result).toEqual({
			judgments: [
				'["category","m1"]',
				'["category","m2"]',
				'["category","m3"]',
				'["topic","m1","refunds"]',
				'["topic","m1","warehouse"]',
				'["topic","m2","refunds"]',
				'["topic","m2","warehouse"]',
				'["topic","m4","refunds"]',
				'["amends","m1","m2"]',
				'["supersedes","m1","m2"]',
			],
			usage: { prompt: 20, completion: 10, total: 30 },
		})
		const category = requireValue(conversation.judgments.judgment('["category","m1"]'))
		expect(category.id).toBe('["category","m1"]')
		expect(category.state).toBe('user: Refund AB-12 is 20.')
		expect(category.sources).toEqual(['m1'])
		expect(JSON.stringify(category.question)).toBe(
			'{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}}',
		)
		const topic = requireValue(conversation.judgments.judgment('["topic","m1","refunds"]'))
		expect(topic.id).toBe('["topic","m1","refunds"]')
		expect(topic.state).toBe('user: Refund AB-12 is 20.')
		expect(topic.sources).toEqual(['m1'])
		expect(JSON.stringify(topic.question)).toBe(
			'{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}}',
		)
		const pair = requireValue(conversation.judgments.judgment('["amends","m1","m2"]'))
		expect(pair.id).toBe('["amends","m1","m2"]')
		expect(pair.state).toBe(
			'Earlier message: user: Refund AB-12 is 20.\nLater message: user: Correction: refund AB-12 is 30, not 20.',
		)
		expect(pair.sources).toEqual(['m1', 'm2'])
		expect(JSON.stringify(pair.question)).toBe(
			'{"form":"noul","instructions":"Does the later message replace or withdraw any value or rule the earlier message states?","criteria":{"true":"The later message replaces or withdraws at least one value or rule the earlier message states","false":"Every value and rule the earlier message states stays in force after the later message"}}',
		)
		expect(
			JSON.stringify(
				requireValue(conversation.judgments.judgment('["supersedes","m1","m2"]')).question,
			),
		).toBe(JSON.stringify(LEDGER_QUESTIONS.supersedes))
		expect(classifier.category('m1')).toBe('fact')
		expect(classifier.category('m4')).toBeUndefined()
		expect(classifier.category('m5')).toBe('fact')
		expect(classifier.quiet('m3')).toBe(true)
		expect(classifier.decisive('m2')).toBe(true)
		expect(classifier.decisive('m5')).toBe(false)
		expect(classifier.topics('m4')).toEqual(new Set(['refunds']))
		expect(classifier.topics('m5')).toEqual(new Set())
		expect(classifier.classification()).toEqual({
			quiet: new Set(['m3']),
			categories: new Map([
				['m1', 'fact'],
				['m2', 'correction'],
				['m3', 'chatter'],
				['m5', 'fact'],
			]),
			topics: new Map([
				['m1', ['refunds', 'warehouse']],
				['m2', ['refunds', 'warehouse']],
				['m3', []],
				['m4', ['refunds']],
				['m5', []],
			]),
			amended: new Map([['m1', ['m2']]]),
			superseded: new Map(),
		})
		expect(await classifier.classify(new Set(['m4']), new AbortController().signal)).toEqual({
			judgments: result.judgments,
		})
		expect(transport.requests).toHaveLength(10)
	})

	it('reads group sums and exact cutoffs, rejects stale records, and preserves canonical criteria order', async () => {
		const conversation = createConversation()
		const message = conversation.add({ role: 'user', content: 'Refund rules.' })
		const judge = new RecordingJudge()
		const classifier = new Classifier({
			conversation,
			judge,
			questions: {
				...LEDGER_QUESTIONS,
				category: {
					...LEDGER_QUESTIONS.category,
					criteria: {
						...Object.fromEntries(Object.entries(LEDGER_QUESTIONS.category.criteria).reverse()),
						...LEDGER_QUESTIONS.category.criteria,
					},
				},
			},
			topics: [],
			thresholds: { category: 0.7, topic: 0.8, correction: 0.3, amends: 0.8, supersedes: 0.8 },
			assign: () => undefined,
			entities: () => new Set(),
		})
		const record = conversation.judgments.add({
			id: JSON.stringify(['category', message.id]),
			model: judge.model,
			sources: [message.id],
			state: 'user: Refund rules.',
			question: LEDGER_QUESTIONS.category,
			answer: { form: 'choice', probabilities: { chatter: 0.35, distractor: 0.35, fact: 0.3 } },
		})
		expect(classifier.quiet(message.id)).toBe(true)
		expect(classifier.category(message.id)).toBeUndefined()
		expect(classifier.decisive(message.id)).toBe(false)
		conversation.judgments.add({
			...record,
			answer: {
				form: 'choice',
				probabilities: { fact: 0.35, rule: 0.2, correction: 0.15, opinion: 0.3 },
			},
		})
		expect(classifier.decisive(message.id)).toBe(true)
		conversation.judgments.add({
			...record,
			answer: { form: 'choice', probabilities: { fact: 0.7, opinion: 0.3 } },
		})
		expect(classifier.category(message.id)).toBe('fact')
		conversation.judgments.add({ ...record, model: 'different' })
		expect(classifier.category(message.id)).toBeUndefined()
		await classifier.classify(new Set(), new AbortController().signal)
		expect(judge.requests).toHaveLength(1)
		expect(requireValue(judge.requests[0]).questions[record.id]).toEqual(LEDGER_QUESTIONS.category)
		expect(
			Object.keys(
				requireValue(requireValue(requireValue(judge.requests[0]).questions[record.id]).criteria),
			),
		).toEqual(['fact', 'rule', 'correction', 'request', 'opinion', 'chatter', 'distractor'])
		conversation.judgments.add({ ...record, state: 'changed' })
		await classifier.classify(new Set(), new AbortController().signal)
		conversation.judgments.add({ ...record, sources: ['different'] })
		await classifier.classify(new Set(), new AbortController().signal)
		conversation.judgments.add({
			...record,
			question: { ...LEDGER_QUESTIONS.category, instructions: 'Changed' },
		})
		await classifier.classify(new Set(), new AbortController().signal)
		expect(judge.requests).toHaveLength(4)
		expect(classifier.category('missing')).toBeUndefined()
		expect(classifier.quiet('missing')).toBe(false)
		expect(classifier.topics('missing')).toEqual(new Set())
	})

	it('asks pairs using whole names and call arguments, and requires tokens only for amends marks', async () => {
		const conversation = createConversation({
			snapshot: {
				id: 'pairs',
				sections: [],
				messages: [
					buildLedgerMessage('partial', 'user', 'Odile called.'),
					buildLedgerMessage('whole', 'user', 'Odile Marlow called.'),
					{
						...buildLedgerMessage('call', 'assistant', ''),
						calls: [{ id: 'lookup', name: 'lookup', arguments: { owner: 'OM-12' } }],
					},
					buildLedgerMessage('quiet', 'user', 'Odile Marlow chatted.'),
					buildLedgerMessage('later', 'user', 'Odile Marlow withdrew the call.'),
					buildLedgerMessage('last', 'user', 'Odile Marlow withdrew everything.'),
				],
			},
		})
		const judge = new RecordingJudge()
		const classifier = new Classifier({
			conversation,
			judge,
			questions: LEDGER_QUESTIONS,
			topics: [],
			thresholds: { category: 0.7, topic: 0.8, correction: 0.3, amends: 0.8, supersedes: 0.8 },
			assign: (message) =>
				message.id === 'quiet' ? 'chatter' : message.id === 'call' ? 'fact' : undefined,
			entities: (text, partial) =>
				matchEntities(
					{ ids: new Set(['OM-12']), owners: new Map([['OM-12', ['Odile Marlow']]]) },
					text,
					partial,
				),
		})
		for (const message of conversation.messages()) {
			conversation.judgments.add({
				id: JSON.stringify(['category', message.id]),
				model: judge.model,
				sources: [message.id],
				state: `${message.role}: ${message.content}`,
				question: LEDGER_QUESTIONS.category,
				answer: {
					form: 'choice',
					probabilities: {
						correction: message.id === 'later' ? 0.3 : 0,
						fact: message.id === 'later' ? 0.7 : 1,
					},
				},
			})
		}
		await classifier.classify(new Set(), new AbortController().signal)
		expect(judge.requests.map((request) => Object.keys(request.questions)[0])).toEqual([
			'["amends","whole","later"]',
			'["amends","call","later"]',
		])
		for (const later of ['last', 'later']) {
			const after = requireValue(conversation.message(later))
			conversation.judgments.add({
				id: JSON.stringify(['amends', 'whole', later]),
				model: judge.model,
				sources: ['whole', later],
				state: `Earlier message: user: Odile Marlow called.\nLater message: user: ${after.content}`,
				question: LEDGER_QUESTIONS.amends,
				answer: { form: 'noul', noul: 0.8 },
			})
		}
		expect(classifier.classification().amended.size).toBe(0)
		for (const later of ['last', 'later']) {
			const after = requireValue(conversation.message(later))
			conversation.judgments.add({
				id: JSON.stringify(['supersedes', 'whole', later]),
				model: judge.model,
				sources: ['whole', later],
				state: `Earlier message: user: Odile Marlow called.\nLater message: user: ${after.content}`,
				question: LEDGER_QUESTIONS.supersedes,
				answer: { form: 'noul', noul: 0.8 },
			})
		}
		expect(classifier.classification().amended.get('whole')).toEqual(['later', 'last'])
		expect(classifier.classification().superseded.get('whole')).toEqual(['later', 'last'])
		conversation.remove('later')
		expect(classifier.classification().superseded.get('whole')).toEqual(['last'])
	})

	it('holds deterministic failures for their exact spec, retries transient failures, and resets with its lifetime', async () => {
		const conversation = createConversation()
		const first = conversation.add({ role: 'user', content: 'First statement.' })
		const second = conversation.add({ role: 'user', content: 'Second statement.' })
		const transport: RecordedTransport = new RecordedTransport(() =>
			Response.json(
				{
					error:
						transport.requests.length === 1
							? 'invalid or duplicate top logprob token'
							: 'temporarily unavailable',
				},
				{ status: 500 },
			),
		)
		const judge = new SequentialSystemOneJudge({
			url: 'http://judge.test',
			model: 'filing',
			batch: false,
			fetch: transport.fetch,
		})
		const classifier = new Classifier({
			conversation,
			judge,
			questions: LEDGER_QUESTIONS,
			topics: [],
			thresholds: { category: 0.7, topic: 0.8, correction: 0.3, amends: 0.8, supersedes: 0.8 },
			assign: () => undefined,
			entities: () => new Set(),
		})
		expect(await classifier.classify(new Set(), new AbortController().signal)).toEqual({
			judgments: [],
		})
		expect(transport.requests).toHaveLength(2)
		expect(await classifier.classify(new Set(), new AbortController().signal)).toEqual({
			judgments: [],
		})
		expect(transport.requests).toHaveLength(3)
		expect(await requireValue(transport.requests[2]).json()).toMatchObject({
			state: `user: ${second.content}`,
		})
		const replacement = new Classifier({
			conversation,
			judge,
			questions: LEDGER_QUESTIONS,
			topics: [],
			thresholds: { category: 0.7, topic: 0.8, correction: 0.3, amends: 0.8, supersedes: 0.8 },
			assign: () => undefined,
			entities: () => new Set(),
		})
		await replacement.classify(new Set([second.id]), new AbortController().signal)
		expect(transport.requests).toHaveLength(4)
		expect(await requireValue(transport.requests[3]).json()).toMatchObject({
			state: `user: ${first.content}`,
		})
	})

	it('returns abort faults with completed judgments and usage and refuses an already aborted ask', async () => {
		const conversation = createConversation()
		conversation.add({ role: 'user', content: 'First statement.' })
		conversation.add({ role: 'user', content: 'Second statement.' })
		const controller = new AbortController()
		const transport = new RecordedTransport(async () => {
			if (transport.requests.length === 2) controller.abort()
			const request: unknown = await requireValue(transport.requests.at(-1)).json()
			if (!isRecord(request) || !isRecord(request.questions)) throw new Error('invalid request')
			return Response.json({
				model: 'filing',
				usage: { input_tokens: 50, output_tokens: 1 },
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
			})
		})
		const judge = new SequentialSystemOneJudge({
			url: 'http://judge.test',
			model: 'filing',
			batch: false,
			fetch: transport.fetch,
		})
		const classifier = new Classifier({
			conversation,
			judge,
			questions: LEDGER_QUESTIONS,
			topics: [],
			thresholds: { category: 0.7, topic: 0.8, correction: 0.3, amends: 0.8, supersedes: 0.8 },
			assign: () => undefined,
			entities: () => new Set(),
		})
		const result = await classifier.classify(new Set(), controller.signal)
		expect(result.fault).toBeInstanceOf(JudgeAbortError)
		expect(result.judgments).toEqual([JSON.stringify(['category', conversation.messages()[0]?.id])])
		expect(result.usage).toEqual({ prompt: 50, completion: 1, total: 51 })
		expect(conversation.judgments.count).toBeGreaterThanOrEqual(1)
		expect(classifier.category(requireValue(conversation.messages()[0]).id)).toBe('fact')
		conversation.judgments.clear()
		expect(await classifier.classify(new Set(), AbortSignal.abort())).toMatchObject({
			judgments: [],
			fault: expect.objectContaining({ name: 'AbortError' }),
		})
		expect(transport.requests).toHaveLength(2)
	})
	it('returns a partial fault when a classification handler throws', async () => {
		const conversation = createConversation()
		conversation.add({ role: 'user', content: 'A statement.' })
		const fault = new Error('assignment failed')
		const classifier = new Classifier({
			conversation,
			judge: new RecordingJudge(),
			questions: LEDGER_QUESTIONS,
			topics: [],
			thresholds: { category: 0.7, topic: 0.8, correction: 0.3, amends: 0.8, supersedes: 0.8 },
			assign: () => {
				throw fault
			},
			entities: () => new Set(),
		})
		expect(await classifier.classify(new Set(), new AbortController().signal)).toEqual({
			judgments: [],
			fault,
		})
	})

	it('folds an aborted judge partial into completed usage and answered or refused keys', async () => {
		for (const refused of [false, true]) {
			const conversation = createConversation()
			const messages = conversation.add([
				{ role: 'user', content: 'First statement.' },
				{ role: 'user', content: 'Second statement.' },
				{ role: 'user', content: 'Unasked statement.' },
			])
			const controller = new AbortController()
			const asked: string[] = []
			const classifier = new Classifier({
				conversation,
				judge: {
					id: 'partial',
					name: 'partial',
					model: 'partial',
					ask(request: JudgeRequest): Promise<JudgeResult> {
						const key = requireValue(Object.keys(request.questions)[0])
						asked.push(key)
						if (asked.length === 1)
							return Promise.resolve({
								model: 'partial',
								answers: { [key]: { form: 'choice', probabilities: { fact: 1 } } },
								usage: { prompt: 4, completion: 1, total: 5 },
							})
						controller.abort()
						return Promise.reject(
							new JudgeAbortError({
								model: 'partial',
								answers: refused ? {} : { [key]: { form: 'choice', probabilities: { fact: 1 } } },
								...(refused ? { refusals: { [key]: { missing: ['evidence'] } } } : {}),
								usage: { prompt: 40, completion: 1, total: 41 },
							}),
						)
					},
				},
				questions: LEDGER_QUESTIONS,
				topics: [],
				thresholds: { category: 0.7, topic: 0.8, correction: 0.3, amends: 0.8, supersedes: 0.8 },
				assign: () => undefined,
				entities: () => new Set(),
			})
			const result = await classifier.classify(new Set(), controller.signal)
			expect(result.fault).toBeInstanceOf(JudgeAbortError)
			expect(result.judgments).toEqual(
				messages.slice(0, 2).map((message) => JSON.stringify(['category', message.id])),
			)
			expect(result.usage).toEqual({ prompt: 44, completion: 2, total: 46 })
			expect(asked).toEqual(result.judgments)
			expect(conversation.judgments.count).toBe(2)
		}
	})

	it('leaves an item undecided when the judge aborts under a live signal and asks the following spec', async () => {
		const conversation = createConversation()
		conversation.add({ role: 'user', content: 'First statement.' })
		conversation.add({ role: 'user', content: 'Second statement.' })
		const asked: string[] = []
		const judge: JudgeInterface = {
			id: 'aborting',
			name: 'aborting',
			model: 'aborting-model',
			ask(request: JudgeRequest): Promise<JudgeResult> {
				asked.push(...Object.keys(request.questions))
				return Promise.reject(new JudgeAbortError({ model: 'aborting-model', answers: {} }))
			},
		}
		const classifier = new Classifier({
			conversation,
			judge,
			questions: LEDGER_QUESTIONS,
			topics: [],
			thresholds: { category: 0.7, topic: 0.8, correction: 0.3, amends: 0.8, supersedes: 0.8 },
			assign: () => undefined,
			entities: () => new Set(),
		})
		expect(await classifier.classify(new Set(), new AbortController().signal)).toEqual({
			judgments: [],
		})
		expect(asked).toHaveLength(2)
	})

	it('holds a deterministic failure that sits as the cause of another error', async () => {
		const conversation = createConversation()
		conversation.add({ role: 'user', content: 'First statement.' })
		const asked: string[] = []
		const judge: JudgeInterface = {
			id: 'wrapping',
			name: 'wrapping',
			model: 'wrapping-model',
			ask(request: JudgeRequest): Promise<JudgeResult> {
				asked.push(...Object.keys(request.questions))
				return Promise.reject(
					new Error('judge failed', {
						cause: new JudgeError('PROTOCOL', DETERMINISTIC_JUDGE_ERROR.source),
					}),
				)
			},
		}
		const classifier = new Classifier({
			conversation,
			judge,
			questions: LEDGER_QUESTIONS,
			topics: [],
			thresholds: { category: 0.7, topic: 0.8, correction: 0.3, amends: 0.8, supersedes: 0.8 },
			assign: () => undefined,
			entities: () => new Set(),
		})
		await classifier.classify(new Set(), new AbortController().signal)
		await classifier.classify(new Set(), new AbortController().signal)
		expect(asked).toHaveLength(1)
	})

	it('keeps the recorded topic of an assigned message and files an assigned distractor as quiet', () => {
		const conversation = createConversation()
		const tool = conversation.add({ role: 'tool', content: 'Refund AB-12 is 30.' })
		const noise = conversation.add({ role: 'user', content: 'Weather is fine.' })
		const judge = new RecordingJudge()
		const classifier = new Classifier({
			conversation,
			judge,
			questions: LEDGER_QUESTIONS,
			topics: [{ name: 'refunds', criterion: 'Refund amounts' }],
			thresholds: { category: 0.7, topic: 0.8, correction: 0.3, amends: 0.8, supersedes: 0.8 },
			assign: (message) =>
				message.role === 'tool' ? 'fact' : message.id === noise.id ? 'distractor' : undefined,
			entities: () => new Set(),
		})
		conversation.judgments.add({
			id: JSON.stringify(['topic', tool.id, 'refunds']),
			model: judge.model,
			sources: [tool.id],
			state: 'tool: Refund AB-12 is 30.',
			question: {
				form: 'noul',
				instructions: LEDGER_QUESTIONS.topic,
				criteria: {
					true: 'The message concerns refunds: Refund amounts',
					false: 'The message does not concern refunds',
				},
			},
			answer: { form: 'noul', noul: 0.9 },
		})
		expect(classifier.classification().topics.get(tool.id)).toEqual(['refunds'])
		expect(classifier.quiet(noise.id)).toBe(true)
	})
})
