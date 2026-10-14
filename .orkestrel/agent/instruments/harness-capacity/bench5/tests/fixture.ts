// Serves a protocol-faithful Ollama daemon on 127.0.0.1 for the offline proofs of the aggregate arm.
// POST /api/chat replays the exchange in data/chat-final.json: the recorded status, content type, and NDJSON body.
// A request whose first system message opens with the summarizer prefix gets the same envelope with the message
// content replaced by the summary of the topic that the request names. Every other path answers 404.
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'

export interface Exchange {
	readonly stream: boolean
	readonly status: number
	readonly contentType: string
	readonly body: string
}

export interface FixtureOptions {
	readonly summaries?: Readonly<Record<string, string>>
	readonly prefix?: string
	readonly observe?: (body: unknown) => void
}

export interface Fixture {
	readonly url: string
	readonly requests: readonly unknown[]
	close(): Promise<void>
}

interface Reply {
	readonly status: number
	readonly contentType: string
	readonly text: string
}

const RECORDING = join(import.meta.dirname, 'data', 'chat-final.json')
const JSON_TYPE = 'application/json'
const CHAT_PATH = '/api/chat'

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isExchange(value: unknown): value is Exchange {
	return (
		isRecord(value) &&
		typeof value.stream === 'boolean' &&
		typeof value.status === 'number' &&
		typeof value.contentType === 'string' &&
		typeof value.body === 'string'
	)
}

/**
 * Reads the recorded daemon exchange from `data/chat-final.json`.
 *
 * @returns The recorded stream flag, status, content type, and NDJSON body
 * @remarks Thrown when the file does not hold an exchange of that shape.
 */
export function loadExchange(): Exchange {
	const value: unknown = JSON.parse(readFileSync(RECORDING, 'utf8'))
	if (!isExchange(value)) throw new Error(`${RECORDING} does not hold an exchange`)
	return value
}

/**
 * Parses a request body as JSON.
 *
 * @param text - The raw request body
 * @returns The parsed value, or `undefined` when the text is not JSON
 */
export function parseBody(text: string): unknown {
	try {
		return JSON.parse(text)
	} catch {
		return undefined
	}
}

/**
 * Collects the string contents of the messages in an `/api/chat` request body, in order.
 *
 * @param body - The parsed request body
 * @returns The message contents; empty when the body carries no message list
 */
export function collectContents(body: unknown): readonly string[] {
	if (!isRecord(body) || !Array.isArray(body.messages)) return []
	const contents: string[] = []
	for (const message of body.messages) {
		if (isRecord(message) && typeof message.content === 'string') contents.push(message.content)
	}
	return contents
}

/**
 * Reads the content of the first system message in an `/api/chat` request body.
 *
 * @param body - The parsed request body
 * @returns The content, or `undefined` when no system message carries a string
 */
export function readSystem(body: unknown): string | undefined {
	if (!isRecord(body) || !Array.isArray(body.messages)) return undefined
	for (const message of body.messages) {
		if (isRecord(message) && message.role === 'system' && typeof message.content === 'string')
			return message.content
	}
	return undefined
}

/**
 * Selects the topic that a summarizer request names.
 *
 * @param topics - The topic names the fixture holds a summary for
 * @param text - The request's message contents joined in order
 * @returns The longest topic name that occurs in the text, or `undefined` when none does
 */
export function selectTopic(topics: readonly string[], text: string): string | undefined {
	let chosen: string | undefined
	for (const topic of topics) {
		if (topic === '' || !text.includes(topic)) continue
		if (chosen === undefined || topic.length > chosen.length) chosen = topic
	}
	return chosen
}

/**
 * Replaces the streamed message content of a recorded NDJSON body with one summary.
 *
 * @param body - The recorded NDJSON text
 * @param summary - The text that becomes the reply content
 * @returns NDJSON with the summary in the first record that carried content and an empty string in the later ones
 */
export function replaceContent(body: string, summary: string): string {
	let placed = false
	const records = body
		.split('\n')
		.filter((line) => line !== '')
		.map((line): unknown => {
			const record: unknown = JSON.parse(line)
			if (!isRecord(record) || !isRecord(record.message)) return record
			if (typeof record.message.content !== 'string' || record.message.content === '') return record
			const content = placed ? '' : summary
			placed = true
			return { ...record, message: { ...record.message, content } }
		})
	if (!placed) throw new Error('the recorded body carries no content record to replace')
	return `${records.map((record) => JSON.stringify(record)).join('\n')}\n`
}

function failure(status: number, message: string): Reply {
	return { status, contentType: JSON_TYPE, text: JSON.stringify({ error: message }) }
}

// Chooses the reply to one /api/chat body; the replay-or-summary decision lives here.
function answerChat(body: unknown, exchange: Exchange, options: FixtureOptions): Reply {
	if (!isRecord(body)) return failure(400, 'request body is not a JSON object')
	if (body.stream !== exchange.stream) {
		return failure(
			400,
			`stream flag mismatch: request stream ${String(body.stream)}, recording stream ${String(exchange.stream)}`,
		)
	}
	const system = readSystem(body)
	const summarize =
		options.prefix !== undefined && system !== undefined && system.startsWith(options.prefix)
	if (!summarize)
		return { status: exchange.status, contentType: exchange.contentType, text: exchange.body }
	const summaries = options.summaries ?? {}
	const topic = selectTopic(Object.keys(summaries), collectContents(body).join('\n'))
	const summary = topic === undefined ? undefined : summaries[topic]
	if (summary === undefined)
		return failure(
			400,
			`no summary topic occurs in the summarizer request; topics: ${Object.keys(summaries).join(', ')}`,
		)
	return {
		status: exchange.status,
		contentType: exchange.contentType,
		text: replaceContent(exchange.body, summary),
	}
}

function readText(request: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = []
		request.on('data', (chunk: Buffer) => chunks.push(chunk))
		request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
		request.on('error', reject)
	})
}

function sendReply(response: ServerResponse, reply: Reply): void {
	response.writeHead(reply.status, {
		'content-type': reply.contentType,
		'content-length': Buffer.byteLength(reply.text),
	})
	response.end(reply.text)
}

async function handleRequest(
	request: IncomingMessage,
	response: ServerResponse,
	exchange: Exchange,
	options: FixtureOptions,
	requests: unknown[],
): Promise<void> {
	const text = await readText(request)
	const body = parseBody(text)
	requests.push(body === undefined ? text : body)
	options.observe?.(body)
	const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
	if (request.method !== 'POST' || path !== CHAT_PATH)
		return sendReply(response, failure(404, `${request.method ?? 'GET'} ${path} is not served`))
	return sendReply(response, answerChat(body, exchange, options))
}

function listenOn(server: Server): Promise<number> {
	return new Promise((resolve, reject) => {
		server.once('error', reject)
		server.listen(0, '127.0.0.1', () => {
			const address = server.address()
			if (address === null || typeof address === 'string')
				reject(new Error('the fixture server has no port'))
			else resolve(address.port)
		})
	})
}

function closeServer(server: Server): Promise<void> {
	return new Promise((resolve, reject) => {
		server.close((error) => (error === undefined ? resolve() : reject(error)))
		server.closeAllConnections()
	})
}

/**
 * Starts the Ollama fixture on 127.0.0.1 at an ephemeral port.
 *
 * @param options - `summaries` maps a topic name to its summary text; `prefix` is the summarizer system text that marks a request for a summary
 * @returns The base URL, a live list of every request body in arrival order, and a method that stops the server
 * @remarks Thrown when `summaries` holds a topic and `prefix` is absent, because no request could then select a summary.
 * A request body that is not JSON is recorded as its text.
 */
export async function startFixture(options: FixtureOptions = {}): Promise<Fixture> {
	if (options.prefix === undefined && Object.keys(options.summaries ?? {}).length > 0)
		throw new Error('summaries need a prefix')
	const exchange = loadExchange()
	const requests: unknown[] = []
	const server = createServer((request, response) => {
		handleRequest(request, response, exchange, options, requests).catch((error: unknown) => {
			sendReply(response, failure(500, error instanceof Error ? error.message : String(error)))
		})
	})
	const port = await listenOn(server)
	return { url: `http://127.0.0.1:${port}`, requests, close: () => closeServer(server) }
}
