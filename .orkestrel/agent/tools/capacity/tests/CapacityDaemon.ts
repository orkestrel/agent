import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import type { CapacityDaemonOptions } from './types.ts'
import { createServer } from 'node:http'
import {
	MICA_MODEL,
	MODELS,
} from '../../../instruments/harness-capacity/.build/bench5/constants.js'
import {
	answerJudge,
	DAEMON_DIGEST,
	DAEMON_VERSION,
	JUDGE_DIGEST,
	renderChat,
} from '../../../instruments/harness-capacity/.build/bench5/tests/continuous/helpers.js'
import { COMPACTION_SYSTEM } from '../../../instruments/harness-capacity/.build/bench5/continuous/constants.js'
import { buildCapacityFixture } from '../helpers.ts'
import { isCapacityRecord } from '../validators.ts'
import { readCapacityBody, sendCapacityJSON } from './helpers.ts'

/** Serves faithful Ollama protocol replies to real canonical subprocesses. */
export class CapacityDaemon {
	#options: CapacityDaemonOptions
	#server: Server
	#url = ''
	#loaded = new Map<string, number>()
	#goals = new Map<string, string>()
	#records = new Set<string>()
	#requests: Array<Readonly<Record<string, unknown>>> = []

	/** Configures only external protocol replies.
	 * @param options - Loop, empty-outcome and operational-fault controls
	 */
	constructor(options: CapacityDaemonOptions) {
		this.#options = options
		this.#server = createServer((request, response) => {
			this.#respond(request, response).catch((error: unknown) =>
				sendCapacityJSON(response, 500, {
					error: error instanceof Error ? error.message : String(error),
				}),
			)
		})
	}

	get url(): string {
		return this.#url
	}
	get requests(): ReadonlyArray<Readonly<Record<string, unknown>>> {
		return this.#requests
	}

	/** Listens on an ephemeral loopback port.
	 * @returns Nothing
	 */
	async start(): Promise<void> {
		await new Promise<void>((complete, reject) => {
			this.#server.once('error', reject)
			this.#server.listen(0, '127.0.0.1', complete)
		})
		const address = this.#server.address()
		if (address === null || typeof address === 'string') throw new Error('fixture port absent')
		this.#url = `http://127.0.0.1:${address.port}`
	}

	/** Closes only the fixture server and its connections.
	 * @returns Nothing
	 */
	async close(): Promise<void> {
		this.#server.closeAllConnections()
		await new Promise<void>((complete, reject) =>
			this.#server.close((error) => (error === undefined ? complete() : reject(error))),
		)
	}

	async #respond(request: IncomingMessage, response: ServerResponse): Promise<void> {
		if (request.method === 'GET' && request.url === '/api/version')
			return sendCapacityJSON(response, 200, { version: DAEMON_VERSION })
		if (request.method === 'GET' && request.url === '/api/tags')
			return sendCapacityJSON(response, 200, {
				models: [
					{ name: MODELS.q4, model: MODELS.q4, digest: DAEMON_DIGEST },
					{ name: MODELS.q2, model: MODELS.q2, digest: DAEMON_DIGEST },
					{ name: MICA_MODEL, model: MICA_MODEL, digest: JUDGE_DIGEST },
				],
			})
		if (request.method === 'GET' && request.url === '/api/ps')
			return sendCapacityJSON(response, 200, {
				models: [...this.#loaded].map(([model, context]) => ({
					name: model,
					model,
					digest: model === MICA_MODEL ? JUDGE_DIGEST : DAEMON_DIGEST,
					context_length: context,
				})),
			})
		const raw: unknown = JSON.parse(await readCapacityBody(request))
		if (!isCapacityRecord(raw) || typeof raw.model !== 'string')
			return sendCapacityJSON(response, 400, { error: 'model missing' })
		this.#requests.push(raw)
		if (request.url === '/api/generate' && raw.keep_alive === 0) {
			this.#loaded.delete(raw.model)
			this.#goals.delete(raw.model)
			this.#records.delete(raw.model)
			return sendCapacityJSON(response, 200, { done: true })
		}
		if (!isCapacityRecord(raw.options))
			return sendCapacityJSON(response, 400, { error: 'options missing' })
		const context = raw.options.num_ctx
		if (typeof context !== 'number')
			return sendCapacityJSON(response, 400, { error: 'context missing' })
		this.#loaded.set(raw.model, context)
		if (request.url === '/api/generate' && typeof raw.prompt === 'string')
			return sendCapacityJSON(response, 200, answerJudge(raw.prompt))
		if (
			request.url !== '/api/chat' ||
			!Array.isArray(raw.messages) ||
			!raw.messages.every(isCapacityRecord)
		)
			return sendCapacityJSON(response, 400, { error: 'messages missing' })
		const messages = raw.messages
		const prompt = Math.ceil(
			messages.reduce(
				(sum, message) => sum + (typeof message.content === 'string' ? message.content.length : 0),
				0,
			) / 4,
		)
		const system = messages.find((message) => message.role === 'system')?.content
		let text: string
		if (raw.options.num_predict === 1) text = renderChat('x', prompt)
		else if (typeof system === 'string' && system.startsWith(COMPACTION_SYSTEM))
			text = renderChat(
				'Synthetic recap retains SO-1001 quantity3, three customers, missing tracking receipts and source arrival6.',
				prompt,
			)
		else {
			if (this.#options.fault)
				return sendCapacityJSON(response, 400, { error: 'protocol fixture transport fault' })
			const goals = buildCapacityFixture().runtime.goals
			const current = messages.findLast(
				(message) =>
					message.role === 'user' && goals.some((goal) => message.content === goal.request),
			)?.content
			if (typeof current === 'string') this.#goals.set(raw.model, current)
			if (
				Array.isArray(raw.tools) &&
				raw.tools.some(
					(tool: unknown) =>
						isCapacityRecord(tool) &&
						isCapacityRecord(tool.function) &&
						tool.function.name === 'recall',
				)
			)
				this.#records.add(raw.model)
			const records = this.#records.has(raw.model)
			const unfinished =
				this.#options.unfinished &&
				!records &&
				(this.#options.empty || this.#goals.get(raw.model) === goals[0]?.request)
			if (unfinished || messages.at(-1)?.role === 'user')
				text = renderChat(
					unfinished ? 'Synthetic pending lookup context. '.repeat(50) : '',
					prompt,
					{ name: 'lookup_order', arguments: { id: 'SO-1001' } },
				)
			else if (this.#options.empty) text = renderChat('', prompt)
			else text = renderChat('Synthetic final support product. '.repeat(350), prompt)
		}
		response.writeHead(200, { 'content-type': 'application/x-ndjson' })
		response.end(text)
	}
}
