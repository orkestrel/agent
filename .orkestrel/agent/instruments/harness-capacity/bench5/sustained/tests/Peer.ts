import type { IncomingMessage, ServerResponse } from 'node:http'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { setTimeout } from 'node:timers/promises'
import { isRecord } from '@orkestrel/contract'
import { MICA_MODEL, MODELS } from '../../constants.js'
import { AGREE_QUESTION, FOCUS_QUESTION } from '../../aggregates/constants.js'

/** Serves only an ephemeral real Ollama protocol boundary for continuous-history proofs. */
export class Peer {
	readonly #latency: number
	readonly calls: unknown[] = []
	#loaded: unknown[] = []
	missingAt: string | undefined
	lengthAt: string | undefined
	filingFailure = false
	boundary = false
	faults = 0
	status = 500
	hold = false
	disconnect = false
	readonly arrivals = new EventTarget()
	summary = { enabled: false, capped: false, topic: '', counts: new Map<string, number>() }
	readonly #server = createServer((request, response) => {
		void this.#respond(request, response).catch((error: unknown) =>
			response.writeHead(500).end(String(error)),
		)
	})

	/** Configures uniform protocol service work.
	 * @param latency - Real service duration in milliseconds for chat and generate requests
	 */
	constructor(latency = 10) {
		this.#latency = latency
	}

	/** Opens the owned protocol peer. */
	async start(): Promise<string> {
		this.#server.listen(0, '127.0.0.1')
		await once(this.#server, 'listening')
		const address = this.#server.address()
		if (address === null || typeof address === 'string') throw new Error('no fixture port')
		return `http://127.0.0.1:${address.port}`
	}

	/** Closes its socket and connections. */
	async destroy(): Promise<void> {
		this.#server.close()
		this.#server.closeAllConnections()
		await once(this.#server, 'close')
	}

	async #respond(request: IncomingMessage, response: ServerResponse): Promise<void> {
		response.setHeader('connection', 'close')
		if (request.url === '/api/ps') {
			response.setHeader('content-type', 'application/json')
			response.end(JSON.stringify({ models: this.#loaded }))
			return
		}
		if (request.url === '/api/tags') {
			response.setHeader('content-type', 'application/json')
			response.end(
				JSON.stringify({
					models: [...Object.values(MODELS), MICA_MODEL].map((name, at) => ({
						name,
						digest: String(at + 1).repeat(64),
					})),
				}),
			)
			return
		}
		const chunks: Buffer[] = []
		for await (const chunk of request)
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
		const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
		if (!isRecord(body)) throw new Error('invalid peer request')
		this.calls.push(body)
		if (
			request.url === '/api/chat' &&
			isRecord(body.options) &&
			body.options.num_predict !== 1 &&
			body.options.num_predict !== 160
		) {
			if (this.disconnect) {
				response.destroy()
				return
			}
			if (this.hold) {
				const closed = once(response, 'close')
				this.arrivals.dispatchEvent(new Event('hold'))
				await closed
				return
			}
		}
		if (isRecord(body.options))
			this.#loaded = [
				{
					name: body.model,
					digest: String(
						[...Object.values(MODELS), MICA_MODEL].indexOf(String(body.model)) + 1,
					).repeat(64),
					runner: 'llamacpp',
					context_length: Math.min(Number(body.options.num_ctx), 262144),
					expires_at: new Date(Date.now() + 1800000).toISOString(),
				},
			]
		await setTimeout(this.#latency)
		if (request.url === '/api/generate') {
			if (this.faults > 0) {
				this.faults -= 1
				response.writeHead(this.status, { 'content-type': 'application/json' })
				response.end(JSON.stringify({ error: 'context capacity wording in a transport fault' }))
				return
			}
			const prompt = String(body.prompt)
			const noul = prompt.includes('Answer Yes if true, or No if false.')
			const winner = noul
				? ((prompt.includes(`Question: ${FOCUS_QUESTION.instructions}\n`) ||
						prompt.includes(`Question: ${AGREE_QUESTION.instructions}\n`)) &&
						prompt.includes('\n "candidate": "The standing rule applies to this topic."')) ||
					prompt.includes('The message concerns policies:') ||
					(this.summary.enabled &&
						prompt.includes('Does the event change what the summary states about'))
					? 'Yes'
					: 'No'
				: 'A'
			const tokens = noul ? ['Yes', 'No'] : ['A', 'B', 'C', 'D', 'E', 'F', 'G']
			response.setHeader('content-type', 'application/json')
			response.end(
				JSON.stringify({
					model: body.model,
					done: true,
					done_reason: 'stop',
					response: winner,
					...(this.filingFailure
						? {}
						: {
								prompt_eval_count:
									this.boundary && isRecord(body.options) ? Number(body.options.num_ctx) - 1 : 50,
								eval_count: 1,
							}),
					logprobs: [
						{
							token: winner,
							logprob: -0.01,
							top_logprobs: tokens.map((token) => ({
								token,
								logprob: token === winner ? -0.01 : -8,
							})),
						},
					],
				}),
			)
			return
		}
		if (request.url !== '/api/chat' || !Array.isArray(body.messages) || !isRecord(body.options))
			throw new Error('invalid chat')
		const messages = body.messages.filter(isRecord)
		const latest = messages.findLast((message) => message.role === 'user')
		const requestText = String(latest?.content ?? '')
		const goal = /Read-point ([^:]+):/.exec(requestText)?.[1] ?? ''
		const current = messages.slice(messages.lastIndexOf(latest ?? {}))
		const invoke =
			body.options.num_predict !== 1 &&
			Array.isArray(body.tools) &&
			body.tools.length > 0 &&
			!current.some((message) => message.role === 'tool')
		const tool = invoke
			? [{ function: { name: 'lookup_order', arguments: { id: 'FC-1000' } } }]
			: undefined
		const reply =
			body.options.num_predict === 1
				? '.'
				: body.options.num_predict === 160
					? 'The standing rule applies to this topic.'
					: `Actual product ${goal}: ${Array.from({ length: 10 }, (_one, at) => `Review item ${at + 1}: preserve the external receipt, reconcile the current obligation, and treat the earlier draft as work awaiting confirmation.`).join(' ')}`
		const prompt = messages.reduce(
			(total, message) => total + Math.ceil(String(message.content).length / 4) + 4,
			11,
		)
		const title = messages.flatMap((message) =>
			message.role === 'system'
				? (/living summary about (.*?) as of/.exec(String(message.content))?.[1] ?? [])
				: [],
		)[0]
		let summary = false
		if (this.summary.enabled && title !== undefined && body.options.num_predict === 160) {
			const count = (this.summary.counts.get(title) ?? 0) + 1
			this.summary.counts.set(title, count)
			summary = !this.summary.capped && count > 1
			if (summary) this.summary = { ...this.summary, capped: true, topic: title }
		}
		const length =
			summary ||
			(this.lengthAt !== undefined &&
				goal.includes(this.lengthAt) &&
				body.options.num_predict !== 1)
		response.setHeader('content-type', 'application/x-ndjson')
		response.end(
			`${JSON.stringify({ model: body.model, done: true, done_reason: length ? 'length' : 'stop', message: { role: 'assistant', content: summary ? 'Incomplete withheld fixture summary' : invoke ? '' : reply, ...(tool === undefined ? {} : { tool_calls: tool }) }, ...(this.missingAt !== undefined && goal.includes(this.missingAt) && body.options.num_predict !== 1 ? {} : { prompt_eval_count: prompt, eval_count: body.options.num_predict === 1 ? 1 : length ? body.options.num_predict : invoke ? 20 : body.options.num_predict === 160 ? 10 : 350 }) })}\n`,
		)
	}
}
