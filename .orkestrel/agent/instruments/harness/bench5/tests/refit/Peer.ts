import type { IncomingMessage, ServerResponse } from 'node:http'
import type { PeerOptions } from './types.js'
import { createServer } from 'node:http'
import { isRecord } from '@orkestrel/contract'

/** Serves protocol-faithful Ollama replies on an ephemeral loopback port. */
export class Peer {
	readonly #options: PeerOptions
	readonly #requests: unknown[] = []
	readonly #server = createServer((request, response) => {
		void this.#respond(request, response)
	})
	constructor(options: PeerOptions) {
		this.#options = options
	}
	get requests(): readonly unknown[] {
		return this.#requests
	}
	async start(): Promise<string> {
		await new Promise<void>((resolve) => this.#server.listen(0, '127.0.0.1', resolve))
		const address = this.#server.address()
		if (address === null || typeof address === 'string') throw new Error('missing peer port')
		return `http://127.0.0.1:${address.port}`
	}
	async close(): Promise<void> {
		this.#server.closeAllConnections()
		await new Promise<void>((resolve, reject) =>
			this.#server.close((error) => (error === undefined ? resolve() : reject(error))),
		)
	}
	async #respond(request: IncomingMessage, response: ServerResponse): Promise<void> {
		const chunks: Buffer[] = []
		for await (const chunk of request)
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
		const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
		this.#requests.push(body)
		this.#options.abort?.abort(new Error('sent cancellation'))
		if (!isRecord(body)) {
			response.writeHead(400).end()
			return
		}
		const usage = this.#options.usage ? { prompt_eval_count: 50, eval_count: 5 } : {}
		if (request.url === '/api/chat' && body.stream === true && Array.isArray(body.messages)) {
			const retry = JSON.stringify(body.messages).includes('failed these checks')
			response.writeHead(200, { 'content-type': 'application/x-ndjson' })
			response.end(
				`${JSON.stringify({ model: body.model, message: { role: 'assistant', content: retry ? this.#options.retry : this.#options.initial }, done: true, done_reason: 'stop', ...usage })}\n`,
			)
		} else if (request.url === '/api/generate' && body.stream === false && body.logprobs === true) {
			response.writeHead(200, { 'content-type': 'application/json' })
			response.end(
				JSON.stringify({
					model: body.model,
					response: 'Yes',
					done: true,
					...(this.#options.judge === false ? {} : usage),
					logprobs: [
						{
							top_logprobs: [
								{ token: 'Yes', logprob: this.#options.yes },
								{ token: 'No', logprob: this.#options.no },
							],
						},
					],
				}),
			)
		} else response.writeHead(404).end()
	}
}
