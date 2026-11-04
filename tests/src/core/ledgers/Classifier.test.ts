import type { JudgeAnswer, LedgerTopic, Message } from '@src/core'
import { createConversation, JudgeAbortError } from '@src/core'
import { isRecord } from '@orkestrel/contract'
import { captureError, createRecorder, requireValue, waitForDelay } from '@orkestrel/test'
import { createScheduler } from '@orkestrel/workflow'
import { describe, expect, it, onTestFinished } from 'vitest'
import { Classifier } from '../../../../src/core/ledgers/Classifier.js'
import {
	DETERMINISTIC_JUDGE_ERROR,
	LEDGER_QUESTIONS,
	LEDGER_SLICE,
} from '../../../../src/core/ledgers/constants.js'
import { extractLiterals } from '../../../../src/core/helpers.js'
import { buildLedgerIndex, matchEntities } from '../../../../src/core/ledgers/helpers.js'
import { JudgeError } from '../../../../src/core/providers/errors.js'
import {
	buildCategoryAnswer,
	createOnceFailingJudge,
	LEDGER_ONCE_FAILURES,
	buildLedgerMessage,
	buildLedgerJudgment,
	buildClassifierOptions,
	buildCorrectionSeed,
	buildDeliverySeed,
	buildLedgerPairJudgment,
	buildLedgerResponse,
	buildLedgerTopicJudgment,
	buildAttemptSummaries,
	CLASSIFIER_PINNED_ASKS,
	createDeafScheduler,
	createFailingScheduler,
	createGatedScheduler,
	createLedgerJudge,
	createPhraseJudge,
	createRecordedScheduler,
	LEDGER_DESK_THRESHOLDS,
	LEDGER_REFUNDS_TOPIC,
	type AttemptSummary,
	RecordedTransport,
	SilentJudge,
	ScriptedJudge,
	SequentialSystemOneJudge,
	summarizeAttempts,
	SwitchableJudge,
} from '../../../setup.js'

describe('Classifier', () => {
	it('refuses a hole in the topic list, as a for…of visits it as an undefined topic', () => {
		const conversation = createConversation()
		const message = conversation.add({ role: 'user', content: 'Refund AB-12 is 20.' })
		const topics: LedgerTopic[] = []
		topics[1] = { name: 'refunds', criterion: 'refund amounts' }
		const classifier = new Classifier(buildClassifierOptions({ conversation, topics }))
		expect(captureError(() => classifier.topics(message.id))).toBeInstanceOf(TypeError)
	})

	it('returns completed judgments when an assign throw cannot be converted to a string', async () => {
		const conversation = createConversation()
		const message = conversation.add({ role: 'user', content: 'Refund AB-12 is 20.' })
		const transport: RecordedTransport = new RecordedTransport(() =>
			buildLedgerResponse(requireValue(transport.requests.at(-1))),
		)
		const classifier = new Classifier(
			buildClassifierOptions({
				conversation,
				judge: new SequentialSystemOneJudge({
					url: 'http://judge.test',
					model: 'filing',
					fetch: transport.fetch,
				}),
				assign: () => {
					if (conversation.judgments.count > 0) throw Object.create(null)
					return undefined
				},
			}),
		)
		const result = await classifier.classify(new Set(), new AbortController().signal)
		expect(result.fault).toBeInstanceOf(Error)
		expect(result.fault?.message.length).toBeGreaterThan(0)
		expect(result.judgments).toEqual([JSON.stringify(['category', message.id])])
		expect(result.usage).toEqual({ prompt: 50, completion: 1, total: 51 })
		expect(conversation.judgments.count).toBe(1)
	})

	it('pairs a correction with assistant calls carrying bigint or JSON arguments', async () => {
		for (const key of [1n, 1]) {
			const earlier = {
				id: 'earlier',
				role: 'assistant',
				content: 'Refund AB-12 is 20.',
				calls: [{ id: 'lookup', name: 'lookup', arguments: { key } }],
			} as const
			const conversation = createConversation({
				snapshot: { id: 'correction', sections: [], messages: [earlier] },
			})
			const later = conversation.add({ role: 'user', content: 'Refund AB-12 is 30, not 20.' })
			conversation.judgments.add(
				buildLedgerJudgment(later, {
					answer: buildCategoryAnswer({ correction: 1 }),
				}),
			)
			const judge = new SilentJudge()
			const classifier = new Classifier(
				buildClassifierOptions({
					conversation,
					judge,
					assign: (message) => (message.role === 'assistant' ? 'fact' : undefined),
					entities: (text) => extractLiterals(text).ids,
				}),
			)
			const result = await classifier.classify(new Set(), new AbortController().signal)
			expect(result.fault).toBeUndefined()
			expect(judge.requests.map((request) => Object.keys(request.questions))).toEqual([
				[JSON.stringify(['amends', earlier.id, later.id])],
			])
		}
	})

	it.each(LEDGER_ONCE_FAILURES)(
		'holds nothing after a %s by default, reporting it once and asking again',
		async (_, failure) => {
			const conversation = createConversation()
			conversation.add({ role: 'user', content: 'The depot opens at nine.' })
			const classifier = new Classifier(
				buildClassifierOptions({
					conversation,
					judge: createOnceFailingJudge(failure, createPhraseJudge([])),
				}),
			)
			const first = await classifier.classify(new Set(), new AbortController().signal)
			const second = await classifier.classify(new Set(), new AbortController().signal)
			expect(first.failure).toBe(failure)
			expect(second.failure).toBeUndefined()
			expect(second.judgments).toHaveLength(1)
			expect(summarizeAttempts(second.attempts).map(({ outcome }) => outcome)).toEqual(['resolved'])
		},
	)

	it('keeps held fingerprints when the judge model alternates A B A', async () => {
		const conversation = createConversation()
		const message = conversation.add({ role: 'user', content: 'Refund AB-12 is 20.' })
		const transport = new RecordedTransport(() => {
			throw new JudgeError('QUESTION', 'refused question')
		})
		// The judge reports the model the loop below last set, `A` before any.
		const judge = new SwitchableJudge(
			new SequentialSystemOneJudge({
				url: 'http://judge.test',
				model: 'A',
				fetch: transport.fetch,
			}),
		)
		const classifier = new Classifier(
			buildClassifierOptions({
				strict: false,
				conversation,
				judge,
				topics: [],
			}),
		)
		for (const next of ['A', 'A', 'B', 'B', 'A']) {
			judge.use(next)
			await classifier.classify(new Set(), new AbortController().signal)
		}
		expect(transport.requests).toHaveLength(2)
		expect(classifier.category(message.id)).toBeUndefined()
	})

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
		const classifier = new Classifier(
			buildClassifierOptions({
				strict: false,
				conversation,
				judge,
				topics: [],
			}),
		)
		const first = await classifier.classify(new Set(), new AbortController().signal)
		expect(first.judgments).toEqual([])
		expect(summarizeAttempts(first.attempts)).toEqual([
			{ key, phase: 'category', outcome: 'failed', duration: 'valid' },
		])
		expect(judge.bodies).toHaveLength(1)
		const second = await classifier.classify(new Set(), new AbortController().signal)
		expect(second.judgments).toEqual([])
		expect(summarizeAttempts(second.attempts)).toEqual([
			{ key, phase: 'category', outcome: 'skipped', duration: 'absent' },
		])
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
		const transport: RecordedTransport = new RecordedTransport(async () => {
			return buildLedgerResponse(
				requireValue(transport.requests.at(-1)),
				(key, question) =>
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
				{ input_tokens: 2, output_tokens: 1 },
			)
		})
		const judge = new SequentialSystemOneJudge({
			url: 'http://judge.test',
			model: 'filing',
			batch: false,
			fetch: transport.fetch,
		})
		const classifier = new Classifier(
			buildClassifierOptions({
				conversation,
				judge,
				topics: [
					{ name: 'refunds', criterion: 'Refund amounts' },
					{ name: 'warehouse', criterion: 'Warehouse work', requested: false },
				],
				assign: (message) => (message.role === 'tool' ? 'fact' : undefined),
				entities: (text) => extractLiterals(text).ids,
			}),
		)
		const result = await classifier.classify(new Set(['m4']), new AbortController().signal)
		const { attempts, ...filed } = result
		expect(filed).toEqual({
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
		expect(summarizeAttempts(attempts)).toEqual(
			buildAttemptSummaries(CLASSIFIER_PINNED_ASKS, 'resolved'),
		)
		expect(attempts.map((attempt) => attempt.key)).toEqual(result.judgments)
		expect(transport.requests).toHaveLength(
			attempts.filter((attempt) => attempt.outcome === 'resolved').length,
		)
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
			amendments: new Map([['m1', ['m2']]]),
			supersessions: new Map(),
		})
		const repeat = await classifier.classify(new Set(['m4']), new AbortController().signal)
		expect(repeat.judgments).toEqual(result.judgments)
		expect(repeat.usage).toBeUndefined()
		expect(summarizeAttempts(repeat.attempts)).toEqual(
			buildAttemptSummaries(CLASSIFIER_PINNED_ASKS, 'cached'),
		)
		expect(repeat.attempts).not.toBe(attempts)
		expect(summarizeAttempts(attempts)).toEqual(
			buildAttemptSummaries(CLASSIFIER_PINNED_ASKS, 'resolved'),
		)
		expect(transport.requests).toHaveLength(10)
	})

	it('files a sorted tie by category order', () => {
		const conversation = createConversation()
		const message = conversation.add({ role: 'user', content: 'Refund rules.' })
		const judge = new SilentJudge()
		const classifier = new Classifier(
			buildClassifierOptions({
				conversation,
				judge,
				thresholds: { ...LEDGER_DESK_THRESHOLDS, category: 0.4 },
			}),
		)
		conversation.judgments.add({
			id: JSON.stringify(['category', message.id]),
			model: judge.model,
			sources: [message.id],
			state: 'user: Refund rules.',
			question: LEDGER_QUESTIONS.category,
			answer: buildCategoryAnswer({ chatter: 0.5, fact: 0.5 }),
		})
		expect(classifier.category(message.id)).toBe('fact')
	})

	it('reads group sums and exact cutoffs, rejects stale records, and preserves canonical criteria order', async () => {
		const conversation = createConversation()
		const message = conversation.add({ role: 'user', content: 'Refund rules.' })
		const judge = new SilentJudge()
		const classifier = new Classifier(
			buildClassifierOptions({
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
			}),
		)
		const record = conversation.judgments.add({
			id: JSON.stringify(['category', message.id]),
			model: judge.model,
			sources: [message.id],
			state: 'user: Refund rules.',
			question: LEDGER_QUESTIONS.category,
			answer: buildCategoryAnswer({
				chatter: 0.35,
				distractor: 0.35,
				fact: 0.3,
			}),
		})
		expect(classifier.quiet(message.id)).toBe(true)
		expect(classifier.category(message.id)).toBeUndefined()
		expect(classifier.decisive(message.id)).toBe(false)
		conversation.judgments.add({
			...record,
			answer: buildCategoryAnswer({
				fact: 0.35,
				rule: 0.2,
				correction: 0.15,
				opinion: 0.3,
			}),
		})
		expect(classifier.decisive(message.id)).toBe(true)
		conversation.judgments.add({
			...record,
			answer: buildCategoryAnswer({ fact: 0.7, opinion: 0.3 }),
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
		const judge = new SilentJudge()
		const classifier = new Classifier(
			buildClassifierOptions({
				conversation,
				judge,
				topics: [],
				assign: (message) =>
					message.id === 'quiet' ? 'chatter' : message.id === 'call' ? 'fact' : undefined,
				entities: (text, partial) =>
					matchEntities(
						buildLedgerIndex({
							ids: new Set(['OM-12']),
							owners: new Map([['OM-12', ['Odile Marlow']]]),
						}),
						text,
						partial,
					),
			}),
		)
		for (const message of conversation.messages()) {
			conversation.judgments.add({
				id: JSON.stringify(['category', message.id]),
				model: judge.model,
				sources: [message.id],
				state: `${message.role}: ${message.content}`,
				question: LEDGER_QUESTIONS.category,
				answer: buildCategoryAnswer({
					correction: message.id === 'later' ? 0.3 : 0,
					fact: message.id === 'later' ? 0.7 : 1,
				}),
			})
		}
		await classifier.classify(new Set(), new AbortController().signal)
		expect(judge.requests.map((request) => Object.keys(request.questions)[0])).toEqual([
			'["amends","whole","later"]',
			'["amends","call","later"]',
		])
		const whole = requireValue(conversation.message('whole'))
		for (const later of ['last', 'later']) {
			const after = requireValue(conversation.message(later))
			conversation.judgments.add(buildLedgerPairJudgment('amends', whole, after, 0.8))
		}
		expect(classifier.classification().amendments.size).toBe(0)
		for (const later of ['last', 'later']) {
			const after = requireValue(conversation.message(later))
			conversation.judgments.add(buildLedgerPairJudgment('supersedes', whole, after, 0.8))
		}
		expect(classifier.classification().amendments.get('whole')).toEqual(['later', 'last'])
		expect(classifier.classification().supersessions.get('whole')).toEqual(['later', 'last'])
		conversation.remove('later')
		expect(classifier.classification().supersessions.get('whole')).toEqual(['last'])
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
		const classifier = new Classifier(
			buildClassifierOptions({
				strict: false,
				conversation,
				judge,
				topics: [],
			}),
		)
		const keys = [first, second].map((message) => JSON.stringify(['category', message.id]))
		const initial = await classifier.classify(new Set(), new AbortController().signal)
		expect(initial.judgments).toEqual([])
		expect(summarizeAttempts(initial.attempts)).toEqual(
			buildAttemptSummaries(
				keys.map((key) => ['category', key] as const),
				'failed',
			),
		)
		expect(transport.requests).toHaveLength(2)
		const retried = await classifier.classify(new Set(), new AbortController().signal)
		expect(retried.judgments).toEqual([])
		expect(summarizeAttempts(retried.attempts)).toEqual([
			{ key: keys[0], phase: 'category', outcome: 'skipped', duration: 'absent' },
			{ key: keys[1], phase: 'category', outcome: 'failed', duration: 'valid' },
		])
		expect(transport.requests).toHaveLength(3)
		expect(await requireValue(transport.requests[2]).json()).toMatchObject({
			state: `user: ${second.content}`,
		})
		const replacement = new Classifier(
			buildClassifierOptions({
				conversation,
				judge,
				topics: [],
			}),
		)
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
		const transport: RecordedTransport = new RecordedTransport(async () => {
			if (transport.requests.length === 2) controller.abort()
			return buildLedgerResponse(requireValue(transport.requests.at(-1)))
		})
		const judge = new SequentialSystemOneJudge({
			url: 'http://judge.test',
			model: 'filing',
			batch: false,
			fetch: transport.fetch,
		})
		const classifier = new Classifier(
			buildClassifierOptions({
				conversation,
				judge,
				topics: [],
			}),
		)
		const result = await classifier.classify(new Set(), controller.signal)
		expect(result.fault).toBeInstanceOf(JudgeAbortError)
		expect(result.judgments).toEqual([JSON.stringify(['category', conversation.messages()[0]?.id])])
		expect(result.usage).toEqual({ prompt: 50, completion: 1, total: 51 })
		expect(summarizeAttempts(result.attempts)).toEqual([
			{
				key: JSON.stringify(['category', conversation.messages()[0]?.id]),
				phase: 'category',
				outcome: 'resolved',
				duration: 'valid',
			},
			{
				key: JSON.stringify(['category', conversation.messages()[1]?.id]),
				phase: 'category',
				outcome: 'aborted',
				duration: 'valid',
			},
		])
		expect(conversation.judgments.count).toBeGreaterThanOrEqual(1)
		expect(classifier.category(requireValue(conversation.messages()[0]).id)).toBe('fact')
		conversation.judgments.clear()
		const refused = await classifier.classify(new Set(), AbortSignal.abort())
		expect(refused).toMatchObject({
			judgments: [],
			fault: expect.objectContaining({ name: 'AbortError' }),
		})
		expect(refused.attempts).toEqual([])
		expect(transport.requests).toHaveLength(2)
	})

	it('records no attempt for a question the abort preceded and keeps the completed one', async () => {
		const conversation = createConversation()
		const messages = conversation.add([
			{ role: 'user', content: 'First statement.' },
			{ role: 'user', content: 'Second statement.' },
		])
		const controller = new AbortController()
		const asked = createRecorder<readonly [key: string]>()
		const classifier = new Classifier(
			buildClassifierOptions({
				conversation,
				judge: createLedgerJudge(asked, (request) => {
					controller.abort()
					const key = requireValue(Object.keys(request.questions)[0])
					return Promise.resolve({
						model: 'partial',
						answers: { [key]: buildCategoryAnswer({ fact: 1 }) },
						usage: { prompt: 4, completion: 1, total: 5 },
					})
				}),
				topics: [],
			}),
		)
		const result = await classifier.classify(new Set(), controller.signal)
		expect(result.fault).toEqual(expect.objectContaining({ name: 'AbortError' }))
		expect(result.judgments).toEqual([JSON.stringify(['category', requireValue(messages[0]).id])])
		expect(result.usage).toEqual({ prompt: 4, completion: 1, total: 5 })
		expect(asked.calls.map(([key]) => key)).toEqual(result.judgments)
		expect(summarizeAttempts(result.attempts)).toEqual([
			{
				key: JSON.stringify(['category', requireValue(messages[0]).id]),
				phase: 'category',
				outcome: 'resolved',
				duration: 'valid',
			},
		])
	})

	it('counts resolver requests as the resolve outcomes of a closed serial fixture', async () => {
		const conversation = createConversation()
		const messages = conversation.add([
			{ role: 'user', content: 'First statement.' },
			{ role: 'user', content: 'Second statement.' },
		])
		const judge = new SilentJudge()
		const classifier = new Classifier(
			buildClassifierOptions({
				conversation,
				judge,
				topics: [{ name: 'refunds', criterion: 'Refund amounts' }],
			}),
		)
		const [one, two] = messages.map((message) => message.id)
		const asks = [
			['category', JSON.stringify(['category', one])],
			['category', JSON.stringify(['category', two])],
			['topic', JSON.stringify(['topic', one, 'refunds'])],
			['topic', JSON.stringify(['topic', two, 'refunds'])],
		] as const
		const first = await classifier.classify(new Set(), new AbortController().signal)
		expect(first.judgments).toHaveLength(asks.length)
		expect(summarizeAttempts(first.attempts)).toEqual(buildAttemptSummaries(asks, 'resolved'))
		expect(judge.requests).toHaveLength(asks.length)
		// A refusal files as a judgment, so the second round finds each question settled and asks nothing.
		const second = await classifier.classify(new Set(), new AbortController().signal)
		expect(judge.requests).toHaveLength(asks.length)
		expect(
			[...first.attempts, ...second.attempts].filter((attempt) =>
				['resolved', 'failed', 'aborted'].includes(attempt.outcome),
			),
		).toHaveLength(judge.requests.length)
		expect(judge.requests.map((request) => Object.keys(request.questions))).toEqual(
			asks.map(([, key]) => [key]),
		)
	})
	it('returns a partial fault when a classification handler throws', async () => {
		const conversation = createConversation()
		conversation.add({ role: 'user', content: 'A statement.' })
		const fault = new Error('assignment failed')
		const classifier = new Classifier(
			buildClassifierOptions({
				conversation,
				judge: new SilentJudge(),
				topics: [],
				assign: () => {
					throw fault
				},
			}),
		)
		expect(await classifier.classify(new Set(), new AbortController().signal)).toEqual({
			judgments: [],
			attempts: [],
			fault,
		})
	})

	it('wraps a non-Error handler throw in an Error that carries its text', async () => {
		const conversation = createConversation()
		conversation.add({ role: 'user', content: 'A statement.' })
		const refusal: unknown = 'assignment refused'
		const classifier = new Classifier(
			buildClassifierOptions({
				conversation,
				judge: new SilentJudge(),
				topics: [],
				assign: () => {
					throw refusal
				},
			}),
		)
		const result = await classifier.classify(new Set(), new AbortController().signal)
		expect(result.judgments).toEqual([])
		expect(result.fault).toBeInstanceOf(Error)
		expect(result.fault?.message).toBe('assignment refused')
	})

	it('files nothing and asks nothing for an empty conversation', async () => {
		const judge = new SilentJudge()
		const classifier = new Classifier(
			buildClassifierOptions({ conversation: createConversation(), judge }),
		)
		expect(await classifier.classify(new Set(), new AbortController().signal)).toEqual({
			judgments: [],
			attempts: [],
		})
		expect(judge.requests).toEqual([])
		expect(classifier.classification()).toEqual({
			quiet: new Set(),
			categories: new Map(),
			topics: new Map(),
			amendments: new Map(),
			supersessions: new Map(),
		})
		expect(classifier.decisive('missing')).toBe(false)
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
			const asked = createRecorder<readonly [key: string]>()
			const classifier = new Classifier(
				buildClassifierOptions({
					conversation,
					judge: createLedgerJudge(asked, (request, count) => {
						const key = requireValue(Object.keys(request.questions)[0])
						if (count === 1)
							return Promise.resolve({
								model: 'partial',
								answers: {
									[key]: buildCategoryAnswer({ fact: 1 }),
								},
								usage: { prompt: 4, completion: 1, total: 5 },
							})
						controller.abort()
						return Promise.reject(
							new JudgeAbortError({
								model: 'partial',
								answers: refused
									? {}
									: {
											[key]: buildCategoryAnswer({
												fact: 1,
											}),
										},
								...(refused
									? {
											refusals: {
												[key]: { missing: ['evidence'] },
											},
										}
									: {}),
								usage: { prompt: 40, completion: 1, total: 41 },
							}),
						)
					}),
					topics: [],
				}),
			)
			const result = await classifier.classify(new Set(), controller.signal)
			expect(result.fault).toBeInstanceOf(JudgeAbortError)
			expect(result.judgments).toEqual(
				messages.slice(0, 2).map((message) => JSON.stringify(['category', message.id])),
			)
			expect(result.usage).toEqual({ prompt: 44, completion: 2, total: 46 })
			expect(summarizeAttempts(result.attempts)).toEqual([
				{
					key: requireValue(result.judgments[0]),
					phase: 'category',
					outcome: 'resolved',
					duration: 'valid',
				},
				{
					key: requireValue(result.judgments[1]),
					phase: 'category',
					outcome: 'aborted',
					duration: 'valid',
				},
			])
			expect(asked.calls.map(([key]) => key)).toEqual(result.judgments)
			expect(conversation.judgments.count).toBe(2)
		}
	})

	it('leaves an item undecided when the judge aborts under a live signal and asks the following spec', async () => {
		const conversation = createConversation()
		conversation.add({ role: 'user', content: 'First statement.' })
		conversation.add({ role: 'user', content: 'Second statement.' })
		const asked = createRecorder<readonly [key: string]>()
		const judge = createLedgerJudge(
			asked,
			() => Promise.reject(new JudgeAbortError({ model: 'aborting-model', answers: {} })),
			'aborting-model',
		)
		const classifier = new Classifier(
			buildClassifierOptions({
				conversation,
				judge,
				topics: [],
			}),
		)
		const result = await classifier.classify(new Set(), new AbortController().signal)
		expect(result.judgments).toEqual([])
		expect(result.fault).toBeUndefined()
		expect(summarizeAttempts(result.attempts)).toEqual(
			conversation.messages().map((message) => ({
				key: JSON.stringify(['category', message.id]),
				phase: 'category',
				outcome: 'aborted',
				duration: 'valid',
			})),
		)
		expect(asked.calls.map(([key]) => key)).toEqual(
			conversation.messages().map((message) => JSON.stringify(['category', message.id])),
		)
	})

	it('holds a deterministic failure that sits as the cause of another error', async () => {
		const conversation = createConversation()
		const statement = conversation.add({ role: 'user', content: 'First statement.' })
		const asked = createRecorder<readonly [key: string]>()
		const judge = createLedgerJudge(
			asked,
			() =>
				Promise.reject(
					new Error('judge failed', {
						cause: new JudgeError('PROTOCOL', DETERMINISTIC_JUDGE_ERROR.source),
					}),
				),
			'wrapping-model',
		)
		const classifier = new Classifier(
			buildClassifierOptions({
				strict: false,
				conversation,
				judge,
				topics: [],
			}),
		)
		await classifier.classify(new Set(), new AbortController().signal)
		await classifier.classify(new Set(), new AbortController().signal)
		expect(asked.calls).toEqual([[JSON.stringify(['category', statement.id])]])
	})

	it('keeps the recorded topic of an assigned message and files an assigned distractor as quiet', () => {
		const conversation = createConversation()
		const tool = conversation.add({ role: 'tool', content: 'Refund AB-12 is 30.' })
		const noise = conversation.add({ role: 'user', content: 'Weather is fine.' })
		const refunds = { name: 'refunds', criterion: 'Refund amounts' }
		const classifier = new Classifier(
			buildClassifierOptions({
				conversation,
				judge: new SilentJudge(),
				topics: [refunds],
				assign: (message) =>
					message.role === 'tool' ? 'fact' : message.id === noise.id ? 'distractor' : undefined,
			}),
		)
		conversation.judgments.add(buildLedgerTopicJudgment(tool, refunds, 0.9))
		expect(classifier.classification().topics.get(tool.id)).toEqual(['refunds'])
		expect(classifier.quiet(noise.id)).toBe(true)
	})

	it('reads each eligibility once per pass', async () => {
		const conversation = createConversation()
		const [refund, order, , account] = conversation.add([
			{ role: 'user', content: 'Refund AB-12 is 20.' },
			{ role: 'user', content: 'Order AB-12 ships Tuesday.' },
			{ role: 'user', content: 'Correction: refund AB-12 is 25.' },
			{ role: 'user', content: 'Account AB-12 is open.' },
			{ role: 'user', content: 'Correction: order AB-12 ships Friday.' },
		])
		const phrase = createPhraseJudge([], ['Correction:'])
		// The judge reports the model the case last set, `A` before any.
		const judge = new SwitchableJudge(
			createLedgerJudge(
				createRecorder<readonly [key: string]>(),
				(request) => phrase.ask(request, new AbortController().signal),
				'A',
			),
		)
		const assigned = createRecorder<readonly [id: string]>()
		const entities = createRecorder<readonly [text: string]>()
		const classifier = new Classifier(
			buildClassifierOptions({
				conversation,
				judge,
				topics: [],
				assign: (message) => {
					assigned.handler(message.id)
					return undefined
				},
				entities: (text) => {
					entities.handler(text)
					return extractLiterals(text).ids
				},
			}),
		)
		await classifier.classify(new Set(), new AbortController().signal)
		expect(entities.calls.map(([text]) => text)).toEqual([
			'Correction: refund AB-12 is 25.',
			'Refund AB-12 is 20.',
			'Order AB-12 ships Tuesday.',
			'Correction: order AB-12 ships Friday.',
			'Account AB-12 is open.',
		])
		expect(
			[requireValue(refund).id, requireValue(account).id].map(
				(id) => assigned.calls.filter(([one]) => one === id).length,
			),
		).toEqual([3, 3])
		conversation.remove(requireValue(order).id)
		const second = entities.count
		await classifier.classify(new Set(), new AbortController().signal)
		expect(entities.calls.slice(second).map(([text]) => text)).toEqual([
			'Correction: refund AB-12 is 25.',
			'Refund AB-12 is 20.',
			'Correction: order AB-12 ships Friday.',
			'Account AB-12 is open.',
		])
		judge.use('B')
		const third = entities.count
		await classifier.classify(new Set(), new AbortController().signal)
		expect(entities.calls.slice(third).map(([text]) => text)).toEqual([
			'Correction: refund AB-12 is 25.',
			'Refund AB-12 is 20.',
			'Correction: order AB-12 ships Friday.',
			'Account AB-12 is open.',
		])
	})

	it('keeps a near set read once per pass', async () => {
		const conversation = createConversation({
			snapshot: {
				id: 'near',
				sections: [],
				messages: [
					buildLedgerMessage('early', 'user', 'Shipping is delayed.'),
					buildLedgerMessage('order', 'user', 'Refund AB-12 is 20.'),
					buildLedgerMessage('first', 'user', 'Correction: refund AB-12 is 25.'),
					buildLedgerMessage('second', 'user', 'Correction: the refund total is 30.'),
				],
			},
		})
		const refunds = { name: 'refunds', criterion: 'Refund amounts' }
		const early = requireValue(conversation.message('early'))
		const phrase = createPhraseJudge([])
		const asked = createRecorder<readonly [key: string]>()
		// Answering the first pair files a refunds topic for `early`, whose near set the pass already read.
		const judge = createLedgerJudge(
			asked,
			(request) => {
				if (Object.hasOwn(request.questions, '["amends","order","first"]'))
					conversation.judgments.add({
						...buildLedgerTopicJudgment(early, refunds, 0.9),
						model: 'widening',
					})
				return phrase.ask(request, new AbortController().signal)
			},
			'widening',
		)
		const classifier = new Classifier(
			buildClassifierOptions({
				conversation,
				judge,
				topics: [refunds],
				entities: (text) => extractLiterals(text).ids,
			}),
		)
		await classifier.classify(new Set(), new AbortController().signal)
		expect(asked.calls.map(([key]) => key)).toEqual([
			'["category","early"]',
			'["category","order"]',
			'["category","first"]',
			'["category","second"]',
			'["topic","early","refunds"]',
			'["topic","order","refunds"]',
			'["topic","first","refunds"]',
			'["topic","second","refunds"]',
			'["amends","order","first"]',
			'["amends","order","second"]',
			'["amends","first","second"]',
		])
	})

	it('asks a pair per statement, uncapped', async () => {
		const asked: number[] = []
		for (const count of [1, 4, 6, 9]) {
			const conversation = createConversation()
			conversation.add(buildCorrectionSeed(count))
			const classifier = new Classifier(
				buildClassifierOptions({
					conversation,
					judge: createPhraseJudge([]),
					topics: [LEDGER_REFUNDS_TOPIC],
					entities: (text) => extractLiterals(text).ids,
				}),
			)
			const result = await classifier.classify(new Set(), new AbortController().signal)
			asked.push(result.attempts.filter((attempt) => attempt.phase === 'amends').length)
		}
		expect(asked).toEqual([1, 4, 6, 9])
	})

	it('asks only the eligible earlier messages', async () => {
		const seed = buildCorrectionSeed(3)
		const conversation = createConversation()
		// A statement sharing no id or topic and a quiet statement sharing both sit before the correction.
		conversation.add([
			...seed.slice(0, -1),
			...buildDeliverySeed(1),
			{ role: 'user', content: 'Account BW-20931 thanked the desk for the refund.' },
			...seed.slice(-1),
		])
		const messages = conversation.messages()
		const quiet = requireValue(messages.at(-2))
		const correction = requireValue(messages.at(-1))
		const classifier = new Classifier(
			buildClassifierOptions({
				conversation,
				judge: createPhraseJudge([], ['Correction:']),
				topics: [LEDGER_REFUNDS_TOPIC],
				assign: (message) => (message.id === quiet.id ? 'chatter' : undefined),
				entities: (text) => extractLiterals(text).ids,
			}),
		)
		const result = await classifier.classify(new Set(), new AbortController().signal)
		expect(
			result.attempts
				.filter((attempt) => attempt.phase === 'amends' || attempt.phase === 'supersedes')
				.map((attempt) => attempt.key),
		).toEqual(
			messages
				.slice(0, 3)
				.flatMap((earlier) => [
					JSON.stringify(['amends', earlier.id, correction.id]),
					JSON.stringify(['supersedes', earlier.id, correction.id]),
				]),
		)
	})

	describe('under the narrow option', () => {
		const whole = buildLedgerMessage('whole', 'user', 'Odile Marlow called.')
		const call: Message = {
			...buildLedgerMessage('call', 'assistant', ''),
			calls: [{ id: 'lookup', name: 'lookup', arguments: { owner: 'OM-12' } }],
		}
		const number = buildLedgerMessage('number', 'user', 'The refund desk shut at 1730.')
		const desk = buildLedgerMessage('desk', 'user', 'The refund desk stayed open.')
		const refused = buildLedgerMessage('refused', 'user', 'The parcel left at 1730.')
		const quiet = buildLedgerMessage('quiet', 'user', 'Odile Marlow chatted at 1730.')
		const later = buildLedgerMessage('later', 'user', 'Odile Marlow moved the refund to 1730.')
		const index = buildLedgerIndex({
			ids: new Set(['OM-12']),
			owners: new Map([['OM-12', ['Odile Marlow']]]),
		})
		const seeded = createConversation({
			snapshot: {
				id: 'narrow',
				sections: [],
				messages: [whole, call, number, desk, refused, quiet, later],
			},
		})
		// The category and topic rows sit recorded, so `judge.requests` holds only the pair questions.
		for (const [message, weight] of [
			[whole, 0],
			[number, 1],
			[desk, 1],
			[refused, 0],
			[later, 1],
		] as const) {
			seeded.judgments.add(
				buildLedgerJudgment(message, {
					answer: buildCategoryAnswer(message === later ? { correction: 1 } : { fact: 1 }),
				}),
			)
			seeded.judgments.add(buildLedgerTopicJudgment(message, LEDGER_REFUNDS_TOPIC, weight))
		}
		const snapshot = seeded.snapshot()
		const options = buildClassifierOptions({
			topics: [LEDGER_REFUNDS_TOPIC],
			assign: (message) =>
				message.id === 'quiet' ? 'chatter' : message.id === 'call' ? 'fact' : undefined,
			entities: (text, partial) => matchEntities(index, text, partial),
		})

		it('drops a topic-only pair, keeps the entity and shared-literal pairs, and leaves a refused literal pair unasked', async () => {
			const asks: Array<readonly unknown[]> = []
			for (const correction of [undefined, { narrow: true }]) {
				const judge = new SilentJudge()
				const classifier = new Classifier({
					...options,
					conversation: createConversation({ snapshot }),
					judge,
					...(correction === undefined ? {} : { correction }),
				})
				await classifier.classify(new Set(), new AbortController().signal)
				asks.push(judge.requests.map((request) => Object.keys(request.questions)[0]))
			}
			expect(asks).toEqual([
				[
					'["amends","whole","later"]',
					'["amends","call","later"]',
					'["amends","number","later"]',
					'["amends","desk","later"]',
				],
				['["amends","whole","later"]', '["amends","call","later"]', '["amends","number","later"]'],
			])
		})

		it('keeps the whole and call pairs, files nothing on amends alone, and files both on supersedes', async () => {
			const conversation = createConversation({ snapshot })
			const judge = new SilentJudge()
			const classifier = new Classifier({
				...options,
				conversation,
				judge,
				correction: { narrow: true },
			})
			await classifier.classify(new Set(), new AbortController().signal)
			expect(judge.requests.map((request) => Object.keys(request.questions)[0])).toEqual([
				'["amends","whole","later"]',
				'["amends","call","later"]',
				'["amends","number","later"]',
			])
			for (const earlier of [whole, call])
				conversation.judgments.add(buildLedgerPairJudgment('amends', earlier, later, 0.8))
			expect(classifier.classification().amendments.size).toBe(0)
			for (const earlier of [whole, call])
				conversation.judgments.add(buildLedgerPairJudgment('supersedes', earlier, later, 0.8))
			const filed = classifier.classification()
			expect(filed.amendments).toEqual(
				new Map([
					['whole', ['later']],
					['call', ['later']],
				]),
			)
			expect(filed.supersessions).toEqual(filed.amendments)
		})

		it('asks fewer questions over a burst holding one true supersession and files the same classification', async () => {
			const filedRecords: Array<{
				readonly asked: readonly string[]
				readonly classification: unknown
			}> = []
			for (const correction of [undefined, { narrow: true }]) {
				const asked = createRecorder<readonly [key: string]>()
				const classifier = new Classifier({
					...options,
					conversation: createConversation({ snapshot }),
					judge: createLedgerJudge(
						asked,
						(request) =>
							Promise.resolve({
								model: 'recording-model',
								answers: Object.fromEntries(
									Object.keys(request.questions).map((key): readonly [string, JudgeAnswer] => [
										key,
										{ form: 'noul', noul: key.includes('"whole"') ? 1 : 0.1 },
									]),
								),
							}),
						'recording-model',
					),
					...(correction === undefined ? {} : { correction }),
				})
				await classifier.classify(new Set(), new AbortController().signal)
				filedRecords.push({
					asked: asked.calls.map(([key]) => key),
					// Spreading each set and map keeps its iteration order in the comparison.
					classification: Object.entries(classifier.classification()).map(([name, value]) => [
						name,
						[...value],
					]),
				})
			}
			const [unset, narrow] = filedRecords
			expect(requireValue(unset).asked).toEqual([
				'["amends","whole","later"]',
				'["supersedes","whole","later"]',
				'["amends","call","later"]',
				'["amends","number","later"]',
				'["amends","desk","later"]',
			])
			expect(requireValue(narrow).asked).toEqual([
				'["amends","whole","later"]',
				'["supersedes","whole","later"]',
				'["amends","call","later"]',
				'["amends","number","later"]',
			])
			expect(requireValue(narrow).classification).toEqual(requireValue(unset).classification)
			expect(requireValue(narrow).classification).toContainEqual([
				'supersessions',
				[['whole', ['later']]],
			])
		})

		it('reads alike with narrow false and with no narrow', async () => {
			const filedRecords: Array<{
				readonly requests: readonly unknown[]
				readonly attempts: readonly AttemptSummary[]
				readonly classification: unknown
			}> = []
			for (const correction of [undefined, {}, { narrow: false }]) {
				const judge = new SilentJudge()
				const classifier = new Classifier({
					...options,
					conversation: createConversation({ snapshot }),
					judge,
					...(correction === undefined ? {} : { correction }),
				})
				const result = await classifier.classify(new Set(), new AbortController().signal)
				filedRecords.push({
					requests: judge.requests,
					attempts: summarizeAttempts(result.attempts),
					classification: Object.entries(classifier.classification()).map(([name, value]) => [
						name,
						[...value],
					]),
				})
			}
			const [unset, ...rest] = filedRecords
			expect(requireValue(unset).requests).toHaveLength(4)
			for (const record of rest) expect(record).toEqual(unset)
		})

		it('asks no pair for a correction sharing no entity and no literal, and none for an empty near set', async () => {
			const asks: Array<readonly unknown[]> = []
			for (const [earlier, weight, content] of [
				[desk, 1, 'The refund stays open.'],
				[number, 0, 'Nothing moved at 1730.'],
			] as const) {
				const correction = buildLedgerMessage('lone', 'user', content)
				for (const arm of [undefined, { narrow: true }]) {
					const conversation = createConversation({
						snapshot: { id: 'lone', sections: [], messages: [earlier, correction] },
					})
					conversation.judgments.add(buildLedgerJudgment(earlier))
					conversation.judgments.add(
						buildLedgerJudgment(correction, {
							answer: buildCategoryAnswer({ correction: 1 }),
						}),
					)
					conversation.judgments.add(buildLedgerTopicJudgment(earlier, LEDGER_REFUNDS_TOPIC, 1))
					conversation.judgments.add(
						buildLedgerTopicJudgment(correction, LEDGER_REFUNDS_TOPIC, weight),
					)
					const judge = new SilentJudge()
					const classifier = new Classifier({
						...options,
						conversation,
						judge,
						...(arm === undefined ? {} : { correction: arm }),
					})
					await classifier.classify(new Set(), new AbortController().signal)
					asks.push(judge.requests.map((request) => Object.keys(request.questions)[0]))
				}
			}
			expect(asks).toEqual([['["amends","desk","lone"]'], [], [], []])
		})

		it('asks a same-topic pair with different numbers unset and not under narrow', async () => {
			const stated = buildLedgerMessage('stated', 'user', 'The refund limit is 500.')
			const replaced = buildLedgerMessage('replaced', 'user', 'No, the refund limit is 600.')
			const asks: Array<readonly unknown[]> = []
			for (const correction of [undefined, { narrow: true }]) {
				const conversation = createConversation({
					snapshot: { id: 'replaced', sections: [], messages: [stated, replaced] },
				})
				conversation.judgments.add(buildLedgerJudgment(stated))
				conversation.judgments.add(
					buildLedgerJudgment(replaced, {
						answer: buildCategoryAnswer({ correction: 1 }),
					}),
				)
				for (const message of [stated, replaced])
					conversation.judgments.add(buildLedgerTopicJudgment(message, LEDGER_REFUNDS_TOPIC, 1))
				const judge = new SilentJudge()
				const classifier = new Classifier({
					...options,
					conversation,
					judge,
					...(correction === undefined ? {} : { correction }),
				})
				await classifier.classify(new Set(), new AbortController().signal)
				asks.push(judge.requests.map((request) => Object.keys(request.questions)[0]))
			}
			expect(asks).toEqual([['["amends","stated","replaced"]'], []])
		})

		it('reads each message once per call for its entities, and never a quiet message', async () => {
			const texts = createRecorder<readonly [text: string]>()
			const classifier = new Classifier({
				...options,
				conversation: createConversation({ snapshot }),
				judge: new SilentJudge(),
				correction: { narrow: true },
				entities: (text, partial) => {
					texts.handler(text)
					return matchEntities(index, text, partial)
				},
			})
			await classifier.classify(new Set(), new AbortController().signal)
			const read = texts.calls.map(([text]) => text)
			expect(read).toHaveLength(6)
			expect(new Set(read).size).toBe(6)
			expect(read).not.toContain(quiet.content)
		})
	})

	it('yields once a slice is spent', async () => {
		const conversation = createConversation()
		conversation.add([
			{ role: 'user', content: 'Refund AB-12 is 20.' },
			{ role: 'user', content: 'Refund CD-34 is 30.' },
		])
		const scheduler = createRecordedScheduler()
		// The judge waits past a slice, so the second question opens with the slice spent.
		const classifier = new Classifier(
			buildClassifierOptions({
				conversation,
				scheduler,
				judge: createLedgerJudge(createRecorder(), async () => {
					await waitForDelay(LEDGER_SLICE * 2)
					return { model: 'partial', answers: {} }
				}),
			}),
		)
		await classifier.classify(new Set(), new AbortController().signal)
		expect(scheduler.yields).toBe(2)
	})

	it('holds a live slice without a host turn', async () => {
		const conversation = createConversation()
		conversation.add(buildDeliverySeed(200))
		conversation.judgments.add(
			conversation.messages().map((message) => buildLedgerJudgment(message)),
		)
		const scheduler = createRecordedScheduler()
		const classifier = new Classifier(buildClassifierOptions({ conversation, scheduler }))
		const result = await classifier.classify(new Set(), new AbortController().signal)
		expect(result.attempts).toHaveLength(200)
		expect(scheduler.yields).toBeGreaterThan(0)
		expect(scheduler.yields).toBeLessThan(200)
	})

	it('takes a host turn on a real scheduler', async () => {
		const conversation = createConversation()
		const message = conversation.add({ role: 'user', content: 'Refund AB-12 is 20.' })
		conversation.judgments.add(buildLedgerJudgment(message))
		const classifier = new Classifier(
			buildClassifierOptions({ conversation, scheduler: createScheduler() }),
		)
		const fired = createRecorder<[]>()
		setTimeout(fired.handler, 0)
		await classifier.classify(new Set(), new AbortController().signal)
		expect(fired.count).toBe(1)
	})

	it('takes no host turn with no scheduler', async () => {
		const conversation = createConversation()
		const message = conversation.add({ role: 'user', content: 'Refund AB-12 is 20.' })
		conversation.judgments.add(buildLedgerJudgment(message))
		const classifier = new Classifier(buildClassifierOptions({ conversation }))
		const fired = createRecorder<[]>()
		setTimeout(fired.handler, 0)
		const result = await classifier.classify(new Set(), new AbortController().signal)
		expect(fired.count).toBe(0)
		expect(result.attempts.map((attempt) => attempt.outcome)).toEqual(['cached'])
	})

	it('asks the same questions when paced', async () => {
		const seed = createConversation()
		seed.add(buildCorrectionSeed(3))
		const snapshot = seed.snapshot()
		const phrase = createPhraseJudge([], ['Correction:'])
		const plainAsked = createRecorder<readonly [key: string]>()
		const pacedAsked = createRecorder<readonly [key: string]>()
		const scheduler = createRecordedScheduler()
		const plain = new Classifier(
			buildClassifierOptions({
				conversation: createConversation({ snapshot }),
				judge: createLedgerJudge(
					plainAsked,
					(request) => phrase.ask(request, new AbortController().signal),
					phrase.model,
				),
				topics: [LEDGER_REFUNDS_TOPIC],
				entities: (text) => extractLiterals(text).ids,
			}),
		)
		const paced = new Classifier(
			buildClassifierOptions({
				conversation: createConversation({ snapshot }),
				judge: createLedgerJudge(
					pacedAsked,
					(request) => phrase.ask(request, new AbortController().signal),
					phrase.model,
				),
				topics: [LEDGER_REFUNDS_TOPIC],
				entities: (text) => extractLiterals(text).ids,
				scheduler,
			}),
		)
		const unpaced = await plain.classify(new Set(), new AbortController().signal)
		const stepped = await paced.classify(new Set(), new AbortController().signal)
		expect(scheduler.yields).toBeGreaterThan(0)
		expect(plainAsked.count).toBeGreaterThan(0)
		expect(pacedAsked.calls).toEqual(plainAsked.calls)
		expect(summarizeAttempts(stepped.attempts)).toEqual(summarizeAttempts(unpaced.attempts))
		expect(stepped.judgments).toEqual(unpaced.judgments)
	})

	it('skips asks on a removed source', async () => {
		const conversation = createConversation()
		const [first, second] = conversation.add([
			{ role: 'user', content: 'Refund AB-12 is 20.' },
			{ role: 'user', content: 'Refund CD-34 is 30.' },
		])
		const kept = requireValue(first)
		const removed = requireValue(second)
		const phrase = createPhraseJudge([])
		const asked = createRecorder<readonly [key: string]>()
		const classifier = new Classifier(
			buildClassifierOptions({
				conversation,
				topics: [LEDGER_REFUNDS_TOPIC],
				// The first question's wait is where the source goes.
				judge: createLedgerJudge(
					asked,
					(request) => {
						conversation.remove(removed.id)
						return phrase.ask(request, new AbortController().signal)
					},
					phrase.model,
				),
			}),
		)
		const result = await classifier.classify(new Set(), new AbortController().signal)
		expect(asked.calls).toEqual([
			[JSON.stringify(['category', kept.id])],
			[JSON.stringify(['topic', kept.id, LEDGER_REFUNDS_TOPIC.name])],
		])
		expect(
			result.attempts
				.filter((attempt) => attempt.key.includes(removed.id))
				.map((attempt) => [attempt.phase, attempt.outcome]),
		).toEqual([
			['category', 'skipped'],
			['topic', 'skipped'],
		])
		expect(result.judgments.some((key) => key.includes(removed.id))).toBe(false)
	})

	it('an abort during a turn asks nothing more', async () => {
		const conversation = createConversation()
		conversation.add({ role: 'user', content: 'Refund AB-12 is 20.' })
		const judge = new SilentJudge()
		const scheduler = createGatedScheduler(Promise.withResolvers<void>())
		const classifier = new Classifier(buildClassifierOptions({ conversation, judge, scheduler }))
		const caller = new AbortController()
		const reason = new Error('stopped')
		const pending = classifier.classify(new Set(), caller.signal)
		await scheduler.reached
		caller.abort(reason)
		const result = await pending
		expect(result.fault).toBe(reason)
		expect(result.attempts).toEqual([])
		expect(judge.requests).toEqual([])
	})

	it('a scheduler that ignores its signal still ends on abort', async () => {
		const conversation = createConversation()
		conversation.add({ role: 'user', content: 'Refund AB-12 is 20.' })
		const judge = new SilentJudge()
		const gate = Promise.withResolvers<void>()
		onTestFinished(() => gate.resolve())
		const scheduler = createDeafScheduler(gate)
		const classifier = new Classifier(buildClassifierOptions({ conversation, judge, scheduler }))
		const caller = new AbortController()
		const reason = new Error('stopped')
		const pending = classifier.classify(new Set(), caller.signal)
		await scheduler.reached
		caller.abort(reason)
		const result = await pending
		expect(result.fault).toBe(reason)
		expect(judge.requests).toEqual([])
		expect(scheduler.yields).toBe(1)
	})

	it('a scheduler fault returns the fault', async () => {
		const conversation = createConversation()
		conversation.add({ role: 'user', content: 'Refund AB-12 is 20.' })
		const judge = new SilentJudge()
		const classifier = new Classifier(
			buildClassifierOptions({ conversation, judge, scheduler: createFailingScheduler() }),
		)
		const result = await classifier.classify(new Set(), new AbortController().signal)
		expect(result.fault?.message).toBe('scheduler fault')
		expect(result.attempts).toEqual([])
		expect(judge.requests).toEqual([])
	})
})
