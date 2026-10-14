import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ProviderRequest, ProviderResult } from '../../../vendor/agent-0.0.30-trimmed/index.js'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { isRecord, parseJSONAs } from '@orkestrel/contract'
import {
	estimateMessages,
	providerRequestContract,
} from '../../../vendor/agent-0.0.30-trimmed/index.js'

export class Fixture {
	readonly calls = new Map<string, ProviderRequest[]>()
	readonly judgments: unknown[] = []
	readonly #server = createServer((request, response) => {
		void this.#serve(request, response).catch((error: unknown) => {
			response.writeHead(500)
			response.end(String(error))
		})
	})
	async start(): Promise<string> {
		this.#server.listen(0, '127.0.0.1')
		await once(this.#server, 'listening')
		const address = this.#server.address()
		if (address === null || typeof address === 'string') throw new Error('Missing loopback address')
		return `http://127.0.0.1:${address.port}`
	}
	async stop(): Promise<void> {
		this.#server.close()
		this.#server.closeAllConnections()
		await once(this.#server, 'close')
	}
	async #serve(request: IncomingMessage, response: ServerResponse): Promise<void> {
		const chunks: Buffer[] = []
		for await (const chunk of request) chunks.push(Buffer.from(chunk))
		const body = parseJSONAs(Buffer.concat(chunks).toString(), isRecord)
		if (body === undefined) throw new Error('Invalid request')
		if (request.url === '/v1/systemone') {
			this.judgments.push(body)
			if (!isRecord(body.questions)) throw new Error('Missing questions')
			const answers = Object.fromEntries(
				Object.entries(body.questions).map(([id, question]) => {
					if (!isRecord(question)) throw new Error('Invalid question')
					if (question.type === 'noul') return [id, { type: 'noul', noul: 1 }]
					if (!isRecord(question.criteria)) throw new Error('Missing criteria')
					const winner =
						typeof body.state === 'string' && body.state.includes('RULE-') ? 'rule' : 'chatter'
					return [
						id,
						{
							type: 'choice',
							probabilities: Object.fromEntries(
								Object.keys(question.criteria).map((key) => [key, key === winner ? 1 : 0]),
							),
						},
					]
				}),
			)
			response.setHeader('content-type', 'application/json')
			response.end(
				JSON.stringify({
					model: 'fixture',
					answers,
					usage: { input_tokens: 10, output_tokens: 1 },
				}),
			)
			return
		}
		if (!providerRequestContract.is(body)) throw new Error('Invalid provider request')
		const key = request.url ?? ''
		const calls = this.calls.get(key) ?? []
		calls.push(body)
		this.calls.set(key, calls)
		const prompt = estimateMessages(body.messages) * 3 + 11
		const result: ProviderResult =
			key.startsWith('/full') && calls.length <= 2
				? {
						content: '',
						tools: [{ id: `call-${calls.length}`, name: 'lookup', arguments: { id: 'CASE-1' } }],
						usage: { prompt, completion: 7, total: prompt + 7 },
					}
				: { content: 'Final fixture answer.', usage: { prompt, completion: 7, total: prompt + 7 } }
		response.setHeader('content-type', 'application/x-ndjson')
		response.end(`${JSON.stringify({ channel: 'result', result })}\n`)
	}
}
