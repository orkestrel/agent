// Serves a protocol-faithful stand-in for the Ollama daemon on 127.0.0.1 for the offline proofs of the continuous
// comparison. It answers /api/version, /api/tags, /api/ps, the judge's /api/generate with logprobs, an unload
// request, and NDJSON /api/chat replies computed from the request: a recap for the summarizer system text,
// a lookup call when a goal asks for one, a text product otherwise, and a context-length refusal past `capacity`.
import type { ContinuousKey } from '../../continuous/audit/types.js'
import type { EnduranceOracle, EnduranceRuntime } from '../../endurance/types.js'
import type { SustainedItem, SustainedLabel } from '../../sustained/audit/types.js'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { mkdirSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { COMPACTION_SYSTEM } from '../../continuous/constants.js'
import { FLUSH_SYSTEM } from '../../Driver.js'
import { hashFile } from '../../refit/helpers.js'

export interface DaemonOptions {
	/** Multiplies the reported prompt tokens, which sets the calibrated scale a run measures. */
	readonly factor: number
	/** Refuses a chat whose message characters exceed this count, as the daemon refuses an over-window prompt. */
	readonly capacity: number
	readonly decision: string
	readonly judge: string
	/** Answers a request whose text carries this marker with no content, so the goal yields no product. */
	readonly silent?: string
}

export interface Daemon {
	readonly url: string
	readonly requests: readonly unknown[]
	close(): Promise<void>
}

export interface TrialFiles {
	readonly runtime: string
	readonly oracle: string
	readonly workload: string
}

export const DAEMON_VERSION = 'fixture-0.40.3'
export const DAEMON_DIGEST = `sha256:${'1'.repeat(64)}`
export const JUDGE_DIGEST = `sha256:${'2'.repeat(64)}`
export const LOOKUP_ID = 'LH-1001'
export const LOOKUP_BASE = 'Order LH-1001: pending at the depot.'
export const LOOKUP_LATER = 'Order LH-1001: shipped on 2031-02-02.'
export const TOPICS = Object.freeze(['Mara Ellison', 'Ivo Mercer', 'Nadia Solano'])
export const SHIFTS = 4

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readText(request: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = []
		request.on('data', (chunk: Buffer) => chunks.push(chunk))
		request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
		request.on('error', reject)
	})
}

function sendJSON(response: ServerResponse, status: number, value: unknown): void {
	const text = JSON.stringify(value)
	response.writeHead(status, {
		'content-type': 'application/json',
		'content-length': Buffer.byteLength(text),
	})
	response.end(text)
}

/**
 * Answers a judge prompt with logprobs: Yes when the state names the topic the question asks about, the first label for a choice.
 * @param prompt - The raw generate prompt
 * @returns The non-streaming generate reply
 */
export function answerJudge(prompt: string): unknown {
	const noul = prompt.includes('Answer Yes if true, or No if false.')
	const state = /<state>\n([\s\S]*?)\n<\/state>/.exec(prompt)?.[1] ?? ''
	let tokens: readonly string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
	let first = 'A'
	if (noul) {
		const topic = /The message concerns ([^:]+):/.exec(prompt)?.[1] ?? ''
		tokens = ['Yes', 'No']
		first = topic !== '' && state.includes(topic) ? 'Yes' : 'No'
	}
	return {
		model: 'stub',
		done: true,
		done_reason: 'stop',
		response: first,
		prompt_eval_count: 120,
		eval_count: 1,
		logprobs: [
			{
				token: first,
				logprob: -0.05,
				top_logprobs: tokens.map((token) => ({ token, logprob: token === first ? -0.05 : -6 })),
			},
		],
	}
}

/**
 * Builds the NDJSON reply of one chat request.
 * @param content - The reply text, split into two frames
 * @param prompt - The reported prompt tokens
 * @param call - An optional tool call carried on the final frame
 * @returns The NDJSON body
 */
export function renderChat(
	content: string,
	prompt: number,
	call?: { readonly name: string; readonly arguments: Readonly<Record<string, string>> },
): string {
	const half = Math.ceil(content.length / 2)
	const frames: unknown[] = [
		{ model: 'stub', created_at: '2031-02-01T00:00:00Z', message: { role: 'assistant', content: content.slice(0, half) }, done: false },
		{
			model: 'stub',
			created_at: '2031-02-01T00:00:01Z',
			message: {
				role: 'assistant',
				content: content.slice(half),
				...(call === undefined ? {} : { tool_calls: [{ function: call }] }),
			},
			done: true,
			done_reason: 'stop',
			prompt_eval_count: prompt,
			eval_count: Math.max(1, Math.ceil(content.length / 4)),
		},
	]
	return `${frames.map((frame) => JSON.stringify(frame)).join('\n')}\n`
}

// Decides one chat reply from the request body; the policy of the stand-in lives here.
function answerChat(
	body: unknown,
	options: DaemonOptions,
	called: Set<string>,
): { readonly status: number; readonly text: string; readonly ndjson: boolean } {
	if (!isRecord(body) || !Array.isArray(body.messages))
		return { status: 400, text: JSON.stringify({ error: 'messages missing' }), ndjson: false }
	const messages = body.messages.filter(isRecord)
	const characters = messages.reduce(
		(sum, message) => sum + (typeof message.content === 'string' ? message.content.length : 0),
		0,
	)
	if (characters > options.capacity)
		return {
			status: 400,
			text: JSON.stringify({ error: `input length exceeds the context length (${options.capacity})` }),
			ndjson: false,
		}
	const prompt = Math.ceil((characters / 4) * options.factor)
	const system = messages.find((message) => message.role === 'system')
	const systemText = typeof system?.content === 'string' ? system.content : ''
	const last = messages.at(-1)
	const lastText = typeof last?.content === 'string' ? last.content : ''
	const options2 = isRecord(body.options) ? body.options : {}
	if (options2.num_predict === 1) return { status: 200, text: renderChat('x', prompt), ndjson: true }
	if (systemText.startsWith(COMPACTION_SYSTEM))
		return { status: 200, text: renderChat(`Recap of ${messages.length - 1} lines: ${lastText.slice(0, 60)}`, prompt), ndjson: true }
	if (systemText === FLUSH_SYSTEM) return { status: 200, text: renderChat('ok', prompt), ndjson: true }
	if (options.silent !== undefined && last?.role === 'user' && lastText.includes(options.silent))
		return { status: 200, text: renderChat('', prompt), ndjson: true }
	const tools = Array.isArray(body.tools) ? body.tools : []
	if (last?.role === 'user' && tools.length > 0 && lastText.includes('LOOKUP') && !called.has(lastText)) {
		called.add(lastText)
		return {
			status: 200,
			text: renderChat('', prompt, { name: 'lookup_order', arguments: { id: LOOKUP_ID } }),
			ndjson: true,
		}
	}
	if (last?.role === 'tool')
		return { status: 200, text: renderChat(`Done after the lookup: ${lastText.slice(0, 40)}`, prompt), ndjson: true }
	return { status: 200, text: renderChat(`Done: ${lastText.slice(0, 48)}`, prompt), ndjson: true }
}

async function handle(
	request: IncomingMessage,
	response: ServerResponse,
	options: DaemonOptions,
	requests: unknown[],
	called: Set<string>,
): Promise<void> {
	const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
	if (request.method === 'GET' && path === '/api/version')
		return sendJSON(response, 200, { version: DAEMON_VERSION })
	if (request.method === 'GET' && path === '/api/tags')
		return sendJSON(response, 200, {
			models: [
				{ name: options.decision, model: options.decision, digest: DAEMON_DIGEST },
				{ name: options.judge, model: options.judge, digest: JUDGE_DIGEST },
			],
		})
	if (request.method === 'GET' && path === '/api/ps') return sendJSON(response, 200, { models: [] })
	const text = await readText(request)
	let body: unknown
	try {
		body = JSON.parse(text)
	} catch {
		body = text
	}
	requests.push(body)
	if (request.method === 'POST' && path === '/api/generate') {
		if (!isRecord(body) || typeof body.prompt !== 'string') return sendJSON(response, 200, {})
		return sendJSON(response, 200, answerJudge(body.prompt))
	}
	if (request.method === 'POST' && path === '/api/chat') {
		const reply = answerChat(body, options, called)
		response.writeHead(reply.status, {
			'content-type': reply.ndjson ? 'application/x-ndjson' : 'application/json',
			'content-length': Buffer.byteLength(reply.text),
		})
		response.end(reply.text)
		return
	}
	sendJSON(response, 404, { error: `${request.method ?? 'GET'} ${path} is not served` })
}

function listenOn(server: Server): Promise<number> {
	return new Promise((resolve, reject) => {
		server.once('error', reject)
		server.listen(0, '127.0.0.1', () => {
			const address = server.address()
			if (address === null || typeof address === 'string')
				reject(new Error('the stand-in has no port'))
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
 * Starts the daemon stand-in on an ephemeral loopback port.
 * @param options - The prompt factor, the refusal capacity, and the model tags it serves
 * @returns The base URL, every request body in arrival order, and a method that stops it
 */
export async function startDaemon(options: DaemonOptions): Promise<Daemon> {
	const requests: unknown[] = []
	const called = new Set<string>()
	const server = createServer((request, response) => {
		handle(request, response, options, requests, called).catch((error: unknown) => {
			sendJSON(response, 500, { error: error instanceof Error ? error.message : String(error) })
		})
	})
	const port = await listenOn(server)
	return { url: `http://127.0.0.1:${port}`, requests, close: () => closeServer(server) }
}

/**
 * Builds a small workload that passes the runtime checks: four shifts of two arrivals and four goals, one versioned lookup.
 * @returns The runtime
 */
export function buildTrialRuntime(): EnduranceRuntime {
	const seed: Array<EnduranceRuntime['seed'][number]> = [
		{
			id: 'fx-opening',
			shift: 0,
			date: '2031-02-01',
			role: 'user',
			content: 'Opening note: the desk serves Mara Ellison, Ivo Mercer, and Nadia Solano this week.',
		},
	]
	const days: Array<EnduranceRuntime['days'][number]> = []
	const goals: Array<EnduranceRuntime['goals'][number]> = []
	let lookupFrom = 0
	for (let shift = 1; shift <= SHIFTS; shift += 1) {
		const date = `2031-02-0${shift}`
		days.push({ date, from: seed.length })
		if (shift === 2) lookupFrom = seed.length
		for (const letter of ['a', 'b']) {
			const topic = TOPICS[(shift + (letter === 'a' ? 0 : 1)) % TOPICS.length] ?? 'Mara Ellison'
			seed.push({
				id: `fx-s${shift}-${letter}`,
				shift,
				date,
				role: 'user',
				content: `Shift ${shift} arrival ${letter}: ${topic} wrote about order ${LOOKUP_ID}; the amount is ${shift * 10 + (letter === 'a' ? 1 : 2)} dollars.`,
			})
		}
		const after = seed.length - 1
		for (let product = 1; product <= 4; product += 1)
			goals.push({
				id: `fx-${shift}-${product}`,
				shift,
				after,
				request: `Shift ${shift} product ${product}: prepare the ${['queue', 'packet', 'reconciliation', 'handoff'][product - 1]} for ${TOPICS[product % TOPICS.length]}${product === 2 ? ` after a LOOKUP of order ${LOOKUP_ID}` : ''}.`,
			})
	}
	return {
		id: 'fixture-continuous',
		system:
			'You are the support desk assistant for Larkspur Home. You must finish every request by calling send_reply with the complete answer; only the send_reply text counts as your answer.',
		topics: TOPICS.map((name) => ({ name, criterion: `${name}'s orders and messages` })),
		days,
		seed,
		tools: { lookup_order: { [LOOKUP_ID]: LOOKUP_BASE }, lookup_customer: {} },
		lookups: [{ id: LOOKUP_ID, tool: 'lookup_order', from: lookupFrom, text: LOOKUP_LATER }],
		goals,
	}
}

/**
 * Builds the private truth of the fixture runtime: one fact per arrival, one obligation, a rubric per goal, and the three audit controls.
 * @param runtime - The fixture runtime
 * @returns An oracle the real oracle checks accept
 */
export function buildTrialOracle(runtime: EnduranceRuntime): EnduranceOracle {
	const arrivals = runtime.seed.map((source, index) => ({ source, index }))
	return {
		runtime: runtime.id,
		facts: arrivals.map(({ source, index }) => ({
			id: `amount-${index}`,
			version: 1,
			value: source.content,
			from: index,
			sources: [source.id],
			transition: 'arrival' as const,
			case: TOPICS[index % TOPICS.length] ?? 'Mara Ellison',
		})),
		obligations: [
			{
				id: 'ship-reminder',
				version: 1,
				case: 'Mara Ellison',
				from: 1,
				due: runtime.seed.length - 1,
				closed: runtime.seed.length - 1,
				prerequisites: ['amount-1'],
				sources: [runtime.seed[1]?.id ?? 'fx-opening'],
				description: 'Send the shipping reminder.',
				evidence: [runtime.seed.at(-1)?.id ?? 'fx-opening'],
			},
		],
		goals: runtime.goals.map((goal, index) => ({
			goal: goal.id,
			product: 'handoff' as const,
			case: TOPICS[index % TOPICS.length] ?? 'Mara Ellison',
			earlier: index === 0 ? [] : [runtime.goals[index - 1]?.id ?? goal.id],
			atoms: (['facts', 'work', 'obligations', 'revision', 'evidence'] as const).map((dimension) => ({
				id: `${goal.id}-${dimension}`,
				dimension,
				requirement: `Carry the ${dimension} requirement.`,
				alternatives: [],
				// Every arrival of the goal's shift, and the opening note for the first goal, so no source stays uncovered.
				sources: runtime.seed
					.filter((source, at) => at <= goal.after && (source.shift === goal.shift || (index === 0 && source.shift === 0)))
					.map((source) => source.id),
				mandatory: true,
			})),
			critical: [
				'Action under withdrawn authorization or through a superseded destination.',
				'Fabricated external completion or receipt.',
			],
			distant: [],
			lookups: [],
			obligations: ['ship-reminder'],
		})),
		controls: [
			{
				id: 'control-stale',
				goal: runtime.goals[0]?.id ?? 'fx-1-1',
				artifact: 'Use the retired depot address.',
				verdict: 'stale',
				reason: 'Directs a superseded destination.',
			},
			{
				id: 'control-fabricated',
				goal: runtime.goals[0]?.id ?? 'fx-1-1',
				artifact: 'The reminder is sent and confirmed.',
				verdict: 'fabricated',
				reason: 'Claims an unevidenced completion.',
			},
			{
				id: 'control-ambiguous',
				goal: runtime.goals[0]?.id ?? 'fx-1-1',
				artifact: 'The amount is handled at ten.',
				verdict: 'ambiguous',
				reason: 'Names no unit or action.',
			},
		],
		calculations: [],
	}
}

/**
 * Builds a complete inert label for one blind item: every atom passes with a source citation, controls fire their rule.
 * @param item - The blind item
 * @param key - Its private key
 * @returns A label the real adjudication validator accepts
 */
export function buildTrialLabel(item: SustainedItem, key: ContinuousKey): SustainedLabel {
	const source = item.evidence.find((entry) =>
		item.rubric.atoms.some((atom) => atom.sources.some((id) => entry.id === `source:${id}`)),
	)
	if (source === undefined) throw new Error('fixture citation source missing')
	const evidence = [`product|${item.product}`, `${source.id}|${source.content}`]
	const control = key.control?.verdict
	return {
		id: item.id,
		atoms: item.rubric.atoms.map((atom) => ({
			id: atom.id,
			verdict:
				control === 'ambiguous' && atom.dimension === 'facts'
					? 'ambiguous'
					: key.arm === 'full' && atom.dimension === 'work'
						? 'fail'
						: 'pass',
			evidence,
		})),
		critical: item.rubric.critical.map((rule) => ({
			rule,
			violated:
				control === 'stale'
					? rule.startsWith('Action under')
					: control === 'fabricated'
						? rule.startsWith('Fabricated')
						: false,
			evidence,
		})),
		obligations: item.rubric.obligations.map((id) => ({ id, disposition: 'carried', evidence })),
		ambiguous: control === 'ambiguous' ? [`product|${item.product}`] : [],
		leaks: [],
	}
}

/**
 * Writes the fixture runtime, its oracle, and the workload manifest that pins both.
 * @param directory - The owned scratch directory
 * @returns The three file paths
 */
export function writeTrialFiles(directory: string): TrialFiles {
	mkdirSync(directory, { recursive: true })
	const runtime = join(directory, 'runtime.json')
	const oracle = join(directory, 'oracle.json')
	const workload = join(directory, 'workload.json')
	const built = buildTrialRuntime()
	writeFileSync(runtime, `${JSON.stringify(built, null, 2)}\n`)
	writeFileSync(oracle, `${JSON.stringify(buildTrialOracle(built), null, 2)}\n`)
	const files = [runtime, oracle].map((path) => ({
		...hashFile(path),
		bytes: statSync(path).size,
	}))
	writeFileSync(workload, `${JSON.stringify({ schema: 1, files }, null, 2)}\n`)
	return { runtime, oracle, workload }
}
