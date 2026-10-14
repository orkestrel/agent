import type { IncomingMessage } from 'node:http'
import type { AdmissionFixture, AdmissionReplay } from './types.js'
import { isRecord } from '@orkestrel/contract'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { join, resolve as resolvePath } from 'node:path'
import { Driver, parseFlags } from '../Driver.js'
import { HARNESS } from '../constants.js'
import { readJSON, readRows } from '../helpers.js'
import { SUMMARY_PREFIX } from '../aggregates/constants.js'

/** Reads the request bytes received by the protocol fixture. */
function collectRequest(request: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = []
		request.on('data', (chunk: Buffer) => chunks.push(chunk))
		request.once('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
		request.once('error', reject)
	})
}

/**
 * Replays archived calibration, flush, and agent responses through the real Driver.
 * @param root - The owned evidence directory, unique to this replay
 * @param fixture - The summaries and external AGREE answer served by the fixture
 * @returns The unmodified archived body serialization and the raw received request strings
 * @example
 * ```ts
 * const result = await replayAdmission(directory, { arm: 'records', prose: '', allowance: 555, agree: true })
 * ```
 */
export async function replayAdmission(
	root: string,
	fixture: AdmissionFixture,
): Promise<AdmissionReplay> {
	const archive = resolvePath(HARNESS, '..', 'results', 'l5', 'pilot-resumption')
	const wire = join(archive, 'l5-q2-control-v1-wire')
	const archived = readJSON(join(archive, 'l5-q2-control-v1', 'run.json'))
	if (
		!isRecord(archived) ||
		!Array.isArray(archived.goals) ||
		!archived.goals.every((goal) => typeof goal === 'string')
	)
		throw new Error('the archive has no served goals')
	const goals = fixture.complete === true ? archived.goals.join(',') : 'g01'
	const calls = readRows(join(archive, 'l5-q2-control-v1', 'calls.jsonl'))
	const expected = Array.from(
		{ length: fixture.complete === true ? 40 : 5 },
		(_, at) => at + 1,
	).map((sequence) => {
		const envelope = readJSON(
			join(wire, `${String(sequence).padStart(5, '0')}_api_chat-request.json`),
		)
		if (!isRecord(envelope) || !isRecord(envelope.body) || !isRecord(envelope.body.options))
			throw new Error('the archive request has no options')
		const body = envelope.body
		const options = envelope.body.options
		const call = calls.find((entry) => isRecord(entry) && entry.sequence === sequence)
		if (!isRecord(call) || (call.role !== 'agent' && call.role !== 'flush'))
			throw new Error('the archive request has no chat role')
		return JSON.stringify({
			...body,
			options: { ...options, num_predict: options.num_predict ?? 512 },
			...(call.role === 'agent' ? { shift: false } : {}),
		})
	})
	const requests: string[] = []
	const server = createServer((request, response) => {
		collectRequest(request)
			.then((raw) => {
				const body: unknown = JSON.parse(raw)
				if (!isRecord(body)) throw new Error('invalid fixture request')
				if (request.url === '/api/generate') {
					const token = fixture.agree ? 'Yes' : 'No'
					response.setHeader('content-type', 'application/json')
					response.end(
						JSON.stringify({
							model: 'fixture',
							done: true,
							done_reason: 'stop',
							response: token,
							prompt_eval_count: 120,
							eval_count: 1,
							logprobs: [
								{
									token,
									logprob: -0.01,
									top_logprobs: ['Yes', 'No'].map((word) => ({
										token: word,
										logprob: word === token ? -0.01 : -8,
									})),
								},
							],
						}),
					)
					return
				}
				const first: unknown = Array.isArray(body.messages) ? body.messages[0] : undefined
				if (
					isRecord(first) &&
					typeof first.content === 'string' &&
					first.content.startsWith(SUMMARY_PREFIX)
				) {
					response.setHeader('content-type', 'application/x-ndjson')
					response.end(
						`${JSON.stringify({
							model: 'fixture',
							message: { role: 'assistant', content: fixture.prose },
							done: true,
							done_reason: 'stop',
							prompt_eval_count: 100,
							eval_count: 10,
						})}\n`,
					)
					return
				}
				requests.push(raw)
				const envelope = readJSON(
					join(wire, `${String(requests.length).padStart(5, '0')}_api_chat-response.json`),
				)
				if (!isRecord(envelope) || typeof envelope.text !== 'string')
					throw new Error('the archive response has no text')
				response.setHeader('content-type', 'application/x-ndjson')
				response.end(envelope.text)
			})
			.catch((error: unknown) => {
				response.statusCode = 500
				response.end(JSON.stringify({ error: String(error) }))
			})
	})
	try {
		await new Promise<void>((resolve, reject) => {
			server.once('error', reject)
			server.listen(0, '127.0.0.1', resolve)
		})
		const address = server.address()
		if (address === null || typeof address === 'string')
			throw new Error('fixture has no TCP address')
		const cache = join(root, 'cache')
		mkdirSync(cache, { recursive: true })
		writeFileSync(join(cache, 'judge.jsonl'), readFileSync(join(archive, 'cache', 'judge.jsonl')))
		const fit = join(root, 'fit.json')
		writeFileSync(fit, JSON.stringify({ change: 0.56, agree: 0.82, separated: true }))
		const out = join(root, 'run')
		const parsed = parseFlags([
			'--run',
			'--live',
			'--fixture',
			'--copy',
			'1',
			'--goals',
			goals,
			'--arm',
			fixture.arm,
			'--out',
			out,
			'--cache',
			cache,
			'--url',
			`http://127.0.0.1:${address.port}`,
			'--fit',
			fit,
			'--allowance',
			String(fixture.allowance),
			'--retry',
			'0',
		])
		if (!parsed.success) throw new Error(parsed.error)
		await new Driver(parsed.value).execute()
		const received = join(root, 'wire')
		mkdirSync(received, { recursive: true })
		for (const [at, raw] of requests.entries()) {
			writeFileSync(join(received, `${String(at + 1).padStart(5, '0')}-request.txt`), raw)
		}
		const run = readJSON(join(out, 'run.json'))
		if (
			!isRecord(run) ||
			!isRecord(run.gauge) ||
			typeof run.gauge.scale !== 'number' ||
			typeof run.gauge.overhead !== 'number'
		)
			throw new Error('missing gauge')
		return {
			gauge: { scale: run.gauge.scale, overhead: run.gauge.overhead },
			requests,
			expected,
			rows: readRows(join(out, 'rows.jsonl')),
			picks: readRows(join(out, 'selections.jsonl')),
			builds: fixture.arm === 'records' ? [] : readRows(join(out, 'aggregates.jsonl')),
		}
	} finally {
		await new Promise<void>((resolve) => {
			server.close(() => resolve())
			server.closeAllConnections()
		})
	}
}
