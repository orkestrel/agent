// This Node preload cannot import Vitest setup or sibling .js modules: it runs before the unused serve entry.
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs'
import { createServer, request as forwardRequest } from 'node:http'
import { join } from 'node:path'

const host = process.env.OLLAMA_HOST
const target = process.env.MEMORY_DAEMON_TARGET
const journal = process.env.MEMORY_DAEMON_REQUESTS
const processes = process.env.MEMORY_DAEMON_PIDS
const evidence = process.env.MEMORY_DAEMON_EVIDENCE
const version = process.env.MEMORY_DAEMON_VERSION
if (
	host === undefined ||
	target === undefined ||
	journal === undefined ||
	processes === undefined ||
	evidence === undefined ||
	version === undefined
)
	throw new Error('Missing memory daemon declaration')
const origin = new URL(host.startsWith('http:') ? host : `http://${host}`)
if (origin.hostname !== '127.0.0.1' || !origin.port || origin.port === '11434')
	throw new Error('A dedicated loopback port is required')
appendFileSync(processes, JSON.stringify(process.pid) + '\n')
const server = createServer(async (request, response) => {
	const chunks: Buffer[] = []
	for await (const chunk of request)
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
	const bytes = Buffer.concat(chunks)
	const body = bytes.toString('utf8')
	const positions = ['ancestor', 'extended'].flatMap((result) => {
		const directory = join(evidence, result, 'execution/trials')
		return existsSync(directory)
			? readdirSync(directory).flatMap((trial) => {
					const path = join(directory, trial, 'exchanges.jsonl')
					if (!existsSync(path)) return []
					const last = readFileSync(path, 'utf8')
						.split(/\r\n|\n/)
						.filter(Boolean)
						.at(-1)
					if (last === undefined) return []
					const row: unknown = JSON.parse(last)
					return typeof row === 'object' &&
						row !== null &&
						'phase' in row &&
						row.phase === 'attempt' &&
						'path' in row &&
						row.path === request.url &&
						'body' in row &&
						typeof row.body === 'string' &&
						Buffer.from(row.body, 'base64').equals(bytes) &&
						'ordinal' in row &&
						typeof row.ordinal === 'number' &&
						'goal' in row &&
						typeof row.goal === 'string' &&
						'stage' in row &&
						typeof row.stage === 'string'
						? [{ ordinal: row.ordinal, goal: row.goal, stage: row.stage }]
						: []
				})
			: []
	})
	appendFileSync(
		journal,
		JSON.stringify({ method: request.method, path: request.url, body, positions }) + '\n',
	)
	response.setHeader('content-type', 'application/json')
	if (request.url === '/api/version') response.end(JSON.stringify({ version }))
	else if (request.url === '/api/tags')
		response.end(
			JSON.stringify({
				models: [
					{ name: 'model', digest: 'a'.repeat(64) },
					{ name: 'judge', digest: 'b'.repeat(64) },
				],
			}),
		)
	else {
		const parsed: unknown = body.length === 0 ? undefined : JSON.parse(body)
		if (
			request.url === '/api/generate' &&
			typeof parsed === 'object' &&
			parsed !== null &&
			'keep_alive' in parsed &&
			parsed.keep_alive === 0 &&
			'model' in parsed
		) {
			response.end(JSON.stringify({ model: parsed.model, done: true, done_reason: 'unload' }))
			return
		}
		const forwarded = forwardRequest(
			new URL(request.url ?? '', target),
			{
				method: request.method,
				headers: { ...request.headers, host: new URL(target).host },
			},
			(received) => {
				response.writeHead(received.statusCode ?? 500, received.headers)
				received.pipe(response)
			},
		)
		forwarded.on('error', (error) => response.destroy(error))
		forwarded.end(bytes)
	}
})
server.listen(Number(origin.port), '127.0.0.1', () =>
	process.stderr.write(`Listening on 127.0.0.1:${origin.port} (version ${version})\n`),
)
await new Promise(() => {})
