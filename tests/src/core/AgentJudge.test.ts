import type { JudgeEntry, JudgeRequest } from '@src/core'
import type { JSONValue } from '@orkestrel/contract'
import {
	DEFAULT_PROVIDER_TIMEOUT,
	isJudgeAbortError,
	isJudgeError,
	JudgeAbortError,
	JudgeError,
	MAX_ERROR_BODY_LENGTH,
	SystemOneJudge,
} from '@src/core'
import { requireValue } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import {
	createRefusingTransport,
	JUDGE_ENVELOPE,
	RecordedBody,
	RecordedHeaders,
	RecordedTransport,
	rejectTransportOnAbort,
	ScriptedJudge,
	SYSTEM_ONE_JUDGE_REQUEST,
	SYSTEM_ONE_TEV1,
	SYSTEM_ONE_TEV1_REQUEST,
	TEV1_ANSWERS,
	TEV1_CHOICE,
	TEV1_NOUL,
	TEV1_REQUEST,
} from '../../setup.js'

describe('AgentJudge — identity and request composition', () => {
	it('mints an instance UUID and exposes the configured model', () => {
		const judge = new ScriptedJudge({ url: 'http://judge.test', model: 'tev1:0.8b' })
		const other = new ScriptedJudge({ url: 'http://judge.test', model: 'tev1:0.8b' })
		expect(judge.id).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/)
		expect(judge.id).not.toBe(other.id)
		expect(judge.model).toBe('tev1:0.8b')
		expect(judge.name).toBe('scripted')
		expect(DEFAULT_PROVIDER_TIMEOUT).toBe(120_000)
	})

	it('posts one JSON call carrying every question when batch is omitted', async () => {
		const transport = new RecordedTransport(() => new Response(JUDGE_ENVELOPE))
		const judge = new ScriptedJudge({
			url: 'http://judge.test',
			path: '/v1/systemone',
			model: 'tev1:0.8b',
			fetch: transport.fetch,
			answers: TEV1_ANSWERS,
		})
		const result = await judge.ask(TEV1_REQUEST, new AbortController().signal)
		expect(result).toEqual({
			model: 'tev1:0.8b',
			answers: TEV1_ANSWERS,
			usage: { prompt: 975, completion: 4, total: 979 },
		})
		expect(transport.requests).toHaveLength(1)
		const request = requireValue(transport.requests[0])
		expect(request.url).toBe('http://judge.test/v1/systemone')
		expect(request.method).toBe('POST')
		expect(request.headers.get('content-type')).toBe('application/json')
		expect(await request.json()).toEqual({ model: 'tev1:0.8b', ...TEV1_REQUEST })
		expect(judge.values).toEqual([JSON.parse(JUDGE_ENVELOPE)])
	})

	it('makes one call per question in key order and sums their usage when batch is false', async () => {
		const transport = new RecordedTransport(() => new Response(JUDGE_ENVELOPE))
		const judge = new ScriptedJudge({
			url: 'http://judge.test',
			model: 'tev1:0.8b',
			fetch: transport.fetch,
			batch: false,
			answers: TEV1_ANSWERS,
		})
		const result = await judge.ask(TEV1_REQUEST, new AbortController().signal)
		expect(result).toEqual({
			model: 'tev1:0.8b',
			answers: TEV1_ANSWERS,
			usage: { prompt: 2925, completion: 12, total: 2937 },
		})
		expect(transport.requests).toHaveLength(3)
		const bodies: JSONValue[] = []
		for (const request of transport.requests) bodies.push(await request.json())
		expect(bodies).toEqual(
			['label', 'refund', 'severity'].map((id) => ({
				model: 'tev1:0.8b',
				state: TEV1_REQUEST.state,
				questions: { [id]: TEV1_REQUEST.questions[id] },
			})),
		)
	})

	it('reports the configured model and no usage when the response names neither', async () => {
		const transport = new RecordedTransport(() => new Response('{}'))
		const judge = new ScriptedJudge({
			url: 'http://judge.test',
			model: 'jev-latest',
			fetch: transport.fetch,
			answers: TEV1_ANSWERS,
			refusals: { team: { missing: ['sales'] } },
		})
		const request: JudgeRequest = {
			state: TEV1_REQUEST.state,
			questions: {
				refund: { form: 'noul' },
				team: { form: 'choice', criteria: { billing: null, sales: null } },
			},
		}
		expect(await judge.ask(request, new AbortController().signal)).toEqual({
			model: 'jev-latest',
			answers: { refund: TEV1_NOUL },
			refusals: { team: { missing: ['sales'] } },
		})
	})

	it('uses the global transport when fetch is omitted', async () => {
		const transport = new RecordedTransport(() => new Response(JUDGE_ENVELOPE))
		const original = globalThis.fetch
		globalThis.fetch = transport.fetch
		try {
			const judge = new ScriptedJudge({
				url: 'http://judge.test',
				model: 'tev1:0.8b',
				answers: TEV1_ANSWERS,
			})
			expect((await judge.ask(TEV1_REQUEST, new AbortController().signal)).model).toBe('tev1:0.8b')
		} finally {
			globalThis.fetch = original
		}
		expect(transport.requests).toHaveLength(1)
	})

	it('decodes against the request it sent when the caller mutates its criteria during the call', async () => {
		const criteria: Record<string, JudgeEntry | null> = {
			billing: 'Payments and refunds',
			bug: 'Software errors',
			account: null,
		}
		const request: JudgeRequest = {
			state: SYSTEM_ONE_JUDGE_REQUEST.state,
			questions: {
				...SYSTEM_ONE_JUDGE_REQUEST.questions,
				label: { form: 'choice', instructions: 'Which label fits this ticket?', criteria },
			},
		}
		const { label } = SYSTEM_ONE_TEV1.answers
		const transport = new RecordedTransport(() => {
			criteria.escalation = 'Needs a manager'
			return Response.json({
				...SYSTEM_ONE_TEV1,
				answers: {
					...SYSTEM_ONE_TEV1.answers,
					label: { ...label, probabilities: { ...label.probabilities, escalation: 0 } },
				},
			})
		})
		const judge = new SystemOneJudge({
			url: 'http://judge.test',
			model: 'tev1:0.8b',
			fetch: transport.fetch,
		})
		const result = await judge.ask(request, new AbortController().signal)
		expect(Object.keys(criteria)).toEqual(['billing', 'bug', 'account', 'escalation'])
		expect(result.answers.label).toStrictEqual(TEV1_CHOICE)
		expect(await requireValue(transport.requests[0]).json()).toEqual(SYSTEM_ONE_TEV1_REQUEST)
	})
})

describe('AgentJudge — requests refused before inference', () => {
	it('owns a proxied request through JSON where a structured clone would refuse it', async () => {
		const transport = new RecordedTransport(() => new Response(JUDGE_ENVELOPE))
		const judge = new ScriptedJudge({
			url: 'http://judge.test',
			model: 'tev1:0.8b',
			fetch: transport.fetch,
			answers: TEV1_ANSWERS,
		})
		const proxied: JudgeRequest = new Proxy(
			{ state: TEV1_REQUEST.state, questions: new Proxy(TEV1_REQUEST.questions, {}) },
			{},
		)
		expect(() => structuredClone(proxied)).toThrow(DOMException)
		const result = await judge.ask(proxied, new AbortController().signal)
		expect(result.answers).toEqual(TEV1_ANSWERS)
		expect(judge.bodies[0]).toEqual(TEV1_REQUEST)
		expect(judge.bodies[0]).not.toBe(proxied)
	})

	it('refuses an empty question map with no transport call', async () => {
		const transport = new RecordedTransport(() => new Response(JUDGE_ENVELOPE))
		const judge = new ScriptedJudge({
			url: 'http://judge.test',
			model: 'm',
			fetch: transport.fetch,
		})
		const failure = judge.ask({ state: 'Ticket 4182', questions: {} }, new AbortController().signal)
		await expect(failure).rejects.toBeInstanceOf(JudgeError)
		await expect(failure).rejects.toMatchObject({
			code: 'QUESTION',
			status: undefined,
			message: 'judge error: no questions',
		})
		expect(transport.requests).toHaveLength(0)
		expect(judge.bodies).toHaveLength(0)
	})

	it('refuses a malformed question by id with no transport call', async () => {
		const transport = new RecordedTransport(() => new Response(JUDGE_ENVELOPE))
		const judge = new ScriptedJudge({
			url: 'http://judge.test',
			model: 'm',
			fetch: transport.fetch,
		})
		const request: JudgeRequest = {
			state: 'Ticket 4182',
			questions: {
				refund: { form: 'noul' },
				team: { form: 'choice', criteria: { billing: null } },
			},
		}
		await expect(judge.ask(request, new AbortController().signal)).rejects.toMatchObject({
			name: 'JudgeError',
			code: 'QUESTION',
			message: 'judge error: question team is malformed',
		})
		expect(transport.requests).toHaveLength(0)
		expect(judge.bodies).toHaveLength(0)
	})

	it('refuses a state that is not a judge entry with no transport call', async () => {
		const transport = new RecordedTransport(() => new Response(JUDGE_ENVELOPE))
		const judge = new ScriptedJudge({
			url: 'http://judge.test',
			model: 'm',
			fetch: transport.fetch,
		})
		const state: Record<string, JSONValue> = {}
		state.self = state
		await expect(
			judge.ask({ state, questions: TEV1_REQUEST.questions }, new AbortController().signal),
		).rejects.toMatchObject({
			code: 'QUESTION',
			message: 'judge error: state is not a judge entry',
		})
		expect(transport.requests).toHaveLength(0)
	})

	it('builds every body before the first call, so a refusal on the second sends nothing', async () => {
		const transport = new RecordedTransport(() => new Response(JUDGE_ENVELOPE))
		const judge = new ScriptedJudge({
			url: 'http://judge.test',
			model: 'm',
			fetch: transport.fetch,
			batch: false,
			answers: TEV1_ANSWERS,
			refuse: 'refund',
		})
		const failure = judge.ask(TEV1_REQUEST, new AbortController().signal)
		await expect(failure).rejects.toMatchObject({
			code: 'QUESTION',
			message: 'judge error: question refund is refused',
		})
		expect(judge.bodies.map((body) => Object.keys(body.questions))).toEqual([['label'], ['refund']])
		expect(transport.requests).toHaveLength(0)
	})
})

describe('AgentJudge — HTTP and protocol failures', () => {
	it('carries the status and an excerpt bounded by the error body limit', async () => {
		const body = new RecordedBody(
			Array.from({ length: 16 }, () => new TextEncoder().encode('x'.repeat(512))),
		)
		const transport = new RecordedTransport(() => new Response(body.stream, { status: 429 }))
		const judge = new ScriptedJudge({
			url: 'http://judge.test',
			model: 'm',
			fetch: transport.fetch,
		})
		await expect(judge.ask(TEV1_REQUEST, new AbortController().signal)).rejects.toMatchObject({
			name: 'JudgeError',
			code: 'HTTP',
			status: 429,
			message: 'judge error: 429 - ' + 'x'.repeat(MAX_ERROR_BODY_LENGTH),
		})
		expect(body.bytes).toBe(MAX_ERROR_BODY_LENGTH)
		expect(body.cancelled).toBe(true)
	})

	it('omits the separator for an empty error body', async () => {
		const transport = new RecordedTransport(() => new Response(null, { status: 401 }))
		const judge = new ScriptedJudge({
			url: 'http://judge.test',
			model: 'm',
			fetch: transport.fetch,
		})
		await expect(judge.ask(TEV1_REQUEST, new AbortController().signal)).rejects.toMatchObject({
			code: 'HTTP',
			status: 401,
			message: 'judge error: 401',
		})
	})

	it('reports an unreadable error body with its read failure as the cause', async () => {
		const cause = new Error('socket closed')
		const body = new RecordedBody([], true, cause)
		const transport = new RecordedTransport(() => new Response(body.stream, { status: 500 }))
		const judge = new ScriptedJudge({
			url: 'http://judge.test',
			model: 'm',
			fetch: transport.fetch,
		})
		await expect(judge.ask(TEV1_REQUEST, new AbortController().signal)).rejects.toMatchObject({
			code: 'HTTP',
			status: 500,
			message: 'judge error: 500 - (error body unavailable)',
			cause,
		})
	})

	it('refuses a null body and an invalid JSON body as protocol failures', async () => {
		for (const [response, message] of [
			[() => new Response(null), 'judge error: no response body'],
			[() => new Response('{"model":'), 'judge error: invalid JSON body'],
		] satisfies ReadonlyArray<readonly [() => Response, string]>) {
			const transport = new RecordedTransport(response)
			const judge = new ScriptedJudge({
				url: 'http://judge.test',
				model: 'm',
				fetch: transport.fetch,
			})
			const error: unknown = await judge
				.ask(TEV1_REQUEST, new AbortController().signal)
				.catch((failure: unknown) => failure)
			expect(isJudgeError(error)).toBe(true)
			expect(error).toMatchObject({ code: 'PROTOCOL', status: undefined, message })
			expect(judge.values).toEqual([])
		}
	})

	it('passes a wire read failure and a transport failure to the caller unchanged', async () => {
		const transport = new RecordedTransport(() => new Response(JUDGE_ENVELOPE))
		const judge = new ScriptedJudge({
			url: 'http://judge.test',
			model: 'm',
			fetch: transport.fetch,
		})
		await expect(judge.ask(TEV1_REQUEST, new AbortController().signal)).rejects.toMatchObject({
			code: 'PROTOCOL',
			message: 'judge error: answer label is missing',
		})
		const refusing = createRefusingTransport()
		const offline = new ScriptedJudge({
			url: 'http://judge.test',
			model: 'm',
			fetch: refusing.fetch,
		})
		const error: unknown = await offline
			.ask(TEV1_REQUEST, new AbortController().signal)
			.catch((failure: unknown) => failure)
		expect(error).toMatchObject({ message: 'fetch failed' })
		expect(isJudgeError(error)).toBe(false)
		expect(isJudgeAbortError(error)).toBe(false)
	})
})

describe('AgentJudge — the header hook inside each call’s bound', () => {
	it('passes each call’s combined signal to the hook and sends its headers', async () => {
		const hook = new RecordedHeaders({ authorization: 'Bearer KEY' })
		const transport = new RecordedTransport(() => new Response(JUDGE_ENVELOPE))
		const caller = new AbortController().signal
		const judge = new ScriptedJudge({
			url: 'http://judge.test',
			model: 'm',
			fetch: transport.fetch,
			batch: false,
			answers: TEV1_ANSWERS,
			headers: hook.headers.bind(hook),
		})
		await judge.ask(TEV1_REQUEST, caller)
		expect(hook.signals).toHaveLength(3)
		expect(hook.signals).toEqual(transport.signals)
		expect(new Set(hook.signals).size).toBe(3)
		expect(hook.signals).not.toContain(caller)
		for (const request of transport.requests) {
			expect(request.headers.get('authorization')).toBe('Bearer KEY')
			expect(request.headers.get('content-type')).toBe('application/json')
		}
	})
})

describe('AgentJudge — cancellation and partial results', () => {
	it('throws an empty partial for an aborted signal with no transport call', async () => {
		const transport = new RecordedTransport(() => new Response(JUDGE_ENVELOPE))
		const judge = new ScriptedJudge({
			url: 'http://judge.test',
			model: 'tev1:0.8b',
			fetch: transport.fetch,
		})
		const abort = new AbortController()
		abort.abort()
		const error: unknown = await judge
			.ask(TEV1_REQUEST, abort.signal)
			.catch((failure: unknown) => failure)
		expect(isJudgeAbortError(error)).toBe(true)
		expect(error).toMatchObject({
			name: 'JudgeAbortError',
			code: 'ABORT',
			partial: { model: 'tev1:0.8b', answers: {} },
		})
		expect(transport.requests).toHaveLength(0)
	})

	it('keeps the first call’s answer and usage when the abort lands in the second', async () => {
		const abort = new AbortController()
		const transport = new RecordedTransport(() => {
			if (transport.requests.length === 2) abort.abort()
			return new Response(JUDGE_ENVELOPE)
		})
		const judge = new ScriptedJudge({
			url: 'http://judge.test',
			model: 'jev-latest',
			fetch: transport.fetch,
			batch: false,
			answers: TEV1_ANSWERS,
		})
		const request: JudgeRequest = {
			state: TEV1_REQUEST.state,
			questions: { label: requireValue(TEV1_REQUEST.questions.label), refund: { form: 'noul' } },
		}
		const error: unknown = await judge
			.ask(request, abort.signal)
			.catch((failure: unknown) => failure)
		expect(error).toBeInstanceOf(JudgeAbortError)
		expect(error).not.toHaveProperty('cause')
		expect(error).toMatchObject({
			partial: {
				model: 'tev1:0.8b',
				answers: { label: TEV1_CHOICE },
				usage: { prompt: 975, completion: 4, total: 979 },
			},
		})
		expect(transport.requests).toHaveLength(2)
		expect(judge.values).toHaveLength(1)
	})

	it('reports a cancel that lands while the answer is decoded as an abort with no cause', async () => {
		const abort = new AbortController()
		const transport = new RecordedTransport(() => new Response(JUDGE_ENVELOPE))
		const judge = new ScriptedJudge({
			url: 'http://judge.test',
			model: 'm',
			fetch: transport.fetch,
			answers: TEV1_ANSWERS,
			readAbort: abort,
		})
		const error: unknown = await judge
			.ask(TEV1_REQUEST, abort.signal)
			.catch((failure: unknown) => failure)
		expect(error).toBeInstanceOf(JudgeAbortError)
		expect(error).not.toHaveProperty('cause')
		expect(error).toMatchObject({ partial: { model: 'm', answers: {} } })
		expect(judge.values).toHaveLength(1)
	})

	it('aborts a stalled call at its deadline and carries the transport failure as the cause', async () => {
		const judge = new ScriptedJudge({
			url: 'http://judge.test',
			model: 'm',
			fetch: rejectTransportOnAbort,
			timeout: 10,
		})
		const error: unknown = await judge
			.ask(TEV1_REQUEST, new AbortController().signal)
			.catch((failure: unknown) => failure)
		expect(isJudgeAbortError(error)).toBe(true)
		expect(error).toMatchObject({ partial: { model: 'm', answers: {} } })
		expect(error).toHaveProperty('cause.name', 'AbortError')
	}, 250)

	it('cancels an unresolved header hook through the caller signal', async () => {
		const transport = createRefusingTransport()
		const hook = new RecordedHeaders(new Promise(() => {}))
		const abort = new AbortController()
		const judge = new ScriptedJudge({
			url: 'http://judge.test',
			model: 'm',
			fetch: transport.fetch,
			headers: hook.headers.bind(hook),
		})
		const result = judge.ask(TEV1_REQUEST, abort.signal)
		await hook.entered
		abort.abort()
		await expect(result).rejects.toMatchObject({ code: 'ABORT', partial: { answers: {} } })
		expect(transport.signals).toEqual([])
	})
})
