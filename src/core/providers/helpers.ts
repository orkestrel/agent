import type {
	FailureRead,
	ProviderOptions,
	ProviderRequest,
	ProviderResult,
	Reading,
	SystemOneAnswer,
	SystemOneQuestion,
	SystemOneUsage,
	TextRead,
} from './types.js'
import type { JudgeAnswer, JudgeQuestion, JudgeResult, Refusal } from '../types.js'
import type { TokenUsage } from '@orkestrel/budget'
import type { ToolCall } from '@orkestrel/tool'
import { isTokenUsage } from '@orkestrel/budget'
import { attempt, boundsOf, isArray, isNumber } from '@orkestrel/contract'
import { JudgeError } from './errors.js'
import { MAX_ERROR_BODY_LENGTH } from './constants.js'
import { sanitizeUsage, sumUsage } from '../helpers.js'

/**
 * Assembles a provider result with only populated optional fields.
 *
 * @param content - The authoritative answer
 * @param thinking - The joined reasoning
 * @param tools - The accumulated calls
 * @param usage - The reported token usage
 * @returns The assembled result
 * @example
 * ```ts
 * buildProviderResult('ok', '', [], undefined) // { content: 'ok' }
 * ```
 */
export function buildProviderResult(
	content: string,
	thinking: string,
	tools: readonly ToolCall[],
	usage: TokenUsage | undefined,
): ProviderResult {
	return {
		content,
		...(thinking.length === 0 ? {} : { thinking }),
		...(tools.length === 0 ? {} : { tools }),
		...(usage === undefined ? {} : { usage }),
	}
}

/**
 * Cancels a stream reader and releases its lock, swallowing a cancellation failure so the
 * caller's own outcome stands.
 *
 * @param reader - The reader to cancel and release
 * @returns A promise that settles after the lock is released
 *
 * @example
 * ```ts
 * const body = new Response('answer').body
 * if (body !== null) await releaseReader(body.getReader())
 * ```
 */
export async function releaseReader(
	reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<void> {
	try {
		await reader.cancel()
	} catch {
		// Preserve the caller's outcome when the source refuses cancellation.
	} finally {
		reader.releaseLock()
	}
}

/**
 * Arms signal propagation to a byte reader and returns the controller that removes the listener.
 *
 * @param reader - The reader whose pending read an abort releases
 * @param signal - The optional caller signal
 * @returns The listener cleanup controller after any already-aborted cancellation settles
 * @example
 * ```ts
 * const reader = new ReadableStream<Uint8Array>().getReader()
 * const cleanup = await armReaderAbort(reader, new AbortController().signal)
 * cleanup.abort()
 * await releaseReader(reader)
 * ```
 */
export async function armReaderAbort(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	signal: AbortSignal | undefined,
): Promise<AbortController> {
	const cleanup = new AbortController()
	signal?.addEventListener(
		'abort',
		() => {
			void reader.cancel(signal.reason).catch(() => {
				// Preserve the caller's outcome when source cancellation rejects.
			})
		},
		{ once: true, signal: cleanup.signal },
	)
	if (signal?.aborted) {
		await reader.cancel(signal.reason).catch(() => {
			// An already-aborted read retains the same cancellation contract.
		})
		cleanup.abort()
	}
	return cleanup
}

/**
 * Reads a bounded HTTP failure excerpt and preserves an unreadable body's cause.
 *
 * @remarks
 * Both HTTP engines, the provider and the judge, translate a non-OK response here and throw
 * their own coded error from the result. When the excerpt is read and `signal` has aborted, the
 * abort is the call's outcome, so the signal's reason is thrown. When the body read fails, the
 * failure is returned as `cause` whether or not `signal` has aborted, so a read that raced the
 * abort stays recorded on the error the caller throws.
 *
 * @param response - The failed HTTP response
 * @param prefix - The error taxonomy prefix, including its trailing colon
 * @param signal - The call's combined caller and deadline signal
 * @returns The status message with any excerpt, the response status, and any body-read failure
 * @throws Thrown when the excerpt is read after `signal` aborts, with the signal's reason
 * @example
 * ```ts
 * await readFailure(new Response('unavailable', { status: 503 }), 'provider error:', new AbortController().signal)
 * // { message: 'provider error: 503 - unavailable', status: 503 }
 * ```
 */
export async function readFailure(
	response: Response,
	prefix: string,
	signal: AbortSignal,
): Promise<FailureRead> {
	const status = response.status
	const body = response.body
	const read =
		body === null
			? { success: true as const, text: '' }
			: await readText(body, MAX_ERROR_BODY_LENGTH, signal).then(
					(value) => ({ success: true as const, text: value.text }),
					(cause: unknown) => ({ success: false as const, cause }),
				)
	if (!read.success) {
		return {
			message: `${prefix} ${status} - (error body unavailable)`,
			status,
			...(read.cause === undefined ? {} : { cause: read.cause }),
		}
	}
	signal.throwIfAborted()
	return { message: `${prefix} ${status}${read.text === '' ? '' : ` - ${read.text}`}`, status }
}

/**
 * Reads a UTF-8 prefix of a byte stream and cancels its remainder.
 *
 * @remarks
 * The `limit` parameter bounds bytes passed to the decoder, including a partial final
 * character. An omitted limit reads to completion. A source may deliver a chunk larger
 * than the remaining limit; its unused bytes are discarded without decoding.
 * The read can overshoot by one source chunk. An abort leaves completion false.
 *
 * @param body - The readable byte stream
 * @param limit - The maximum byte prefix, or undefined for the complete stream
 * @param signal - The optional cancellation bound; abort returns the decoded prefix
 * @returns The decoded prefix and whether EOF occurred within the byte budget
 * @example
 * ```ts
 * import { readText } from '@orkestrel/agent'
 *
 * const body = new Response('answer').body
 * if (body !== null) await readText(body, 3) // { text: 'ans', complete: false }
 * ```
 */
export async function readText(
	body: ReadableStream<Uint8Array>,
	limit?: number,
	signal?: AbortSignal,
): Promise<TextRead> {
	const reader = body.getReader()
	const decoder = new TextDecoder()
	// The decoded prefix, the byte budget left, and whether EOF arrived, one record per call.
	const read = { text: '', remaining: limit ?? Infinity, complete: false }
	try {
		const cleanup = await armReaderAbort(reader, signal)
		try {
			while (read.remaining > 0) {
				if (signal?.aborted) break
				const step = await reader.read()
				if (signal?.aborted) break
				if (step.done) {
					read.complete = true
					break
				}
				const bytes = step.value.subarray(0, read.remaining)
				read.text += decoder.decode(bytes, { stream: true })
				read.remaining -= bytes.byteLength
			}
			return { text: read.text + decoder.decode(), complete: read.complete }
		} finally {
			cleanup.abort()
		}
	} finally {
		await releaseReader(reader)
	}
}

/**
 * Decodes UTF-8 chunks with a final flush and releases the stream on every exit.
 *
 * @param body - The readable byte stream
 * @param signal - The optional cancellation bound; abort ends iteration without further chunks
 * @returns Decoded text chunks, including a held decoder tail
 * @example
 * ```ts
 * const body = new Response('answer').body
 * if (body !== null) for await (const chunk of readChunks(body)) render(chunk)
 * ```
 */
export async function* readChunks(
	body: ReadableStream<Uint8Array>,
	signal?: AbortSignal,
): AsyncGenerator<string> {
	const reader = body.getReader()
	const decoder = new TextDecoder()
	try {
		const cleanup = await armReaderAbort(reader, signal)
		try {
			if (signal?.aborted) return
			for (;;) {
				const step = await reader.read()
				if (signal?.aborted) return
				if (step.done) break
				const chunk = decoder.decode(step.value, { stream: true })
				if (chunk.length > 0) yield chunk
			}
			const tail = decoder.decode()
			if (tail.length > 0) yield tail
		} finally {
			cleanup.abort()
		}
	} finally {
		await releaseReader(reader)
	}
}

/**
 * Derives the winner, its probability, the published confidence, and a score answer's expected
 * level from a judge answer's distribution.
 *
 * @remarks
 * The winner is the first strictly greatest candidate in enumeration order: an option name in
 * criteria order, a level index, or `'false'` then `'true'` for a noul, so a noul of exactly 0.5
 * names `'false'`. Confidence follows the TypeSafe formulas, whatever confidence a server sent: a
 * choice reads `(max(p) - 1/n) / (1 - 1/n)`, a noul reads `|2p - 1|` (the choice formula at
 * n = 2), and a score reads `max(0, 1 - spread / even_spread)`, where `spread` sums each level's
 * probability times its distance from the winning level and `even_spread` is the mean distance
 * from the middle level. `score` is the expected level `sum(i * p_i)` and is set only for a score
 * answer.
 *
 * @param answer - The answer whose distribution is read
 * @returns The derived measures
 * @throws JudgeError Thrown when a choice or score answer has fewer than 2 candidates
 * (code `PROTOCOL`), because the confidence formulas divide by the candidate count
 * @example
 * ```ts
 * computeReading({ form: 'choice', probabilities: { billing: 0.88, technical: 0.12, sales: 0 } })
 * // { winner: 'billing', probability: 0.88, confidence: 0.82 } to 2 decimals
 * computeReading({ form: 'score', probabilities: [0, 0.57, 0.43] })
 * // { winner: '1', probability: 0.57, confidence: 0.355, score: 1.43 } to 3 decimals
 * computeReading({ form: 'noul', noul: 0.5 }) // { winner: 'false', probability: 0.5, confidence: 0 }
 * ```
 */
export function computeReading(answer: JudgeAnswer): Reading {
	if (answer.form === 'noul') {
		const yes = answer.noul > 0.5
		return {
			winner: yes ? 'true' : 'false',
			probability: yes ? answer.noul : 1 - answer.noul,
			confidence: Math.abs(2 * answer.noul - 1),
		}
	}
	const candidates: ReadonlyArray<readonly [string, number]> =
		answer.form === 'choice'
			? Object.entries(answer.probabilities)
			: answer.probabilities.map((probability, level) => [String(level), probability])
	const count = candidates.length
	if (count < 2) {
		throw new JudgeError('PROTOCOL', 'judge error: an answer needs at least 2 candidates')
	}
	// The first strictly greatest candidate wins a tie.
	const { winner, index, probability } = candidates.reduce(
		(top, [name, candidate], position) =>
			candidate > top.probability ? { winner: name, index: position, probability: candidate } : top,
		{ winner: '', index: 0, probability: -Infinity },
	)
	if (answer.form === 'choice') {
		return { winner, probability, confidence: (probability - 1 / count) / (1 - 1 / count) }
	}
	const spread = answer.probabilities.reduce(
		(sum, candidate, level) => sum + candidate * Math.abs(level - index),
		0,
	)
	const even = answer.probabilities.reduce(
		(sum, _candidate, level) => sum + Math.abs(level - (count - 1) / 2),
		0,
	)
	const score = answer.probabilities.reduce((sum, candidate, level) => sum + level * candidate, 0)
	return { winner, probability, confidence: Math.max(0, 1 - spread / (even / count)), score }
}

/**
 * Merges the results of a judge request's calls into one result.
 *
 * @remarks
 * Pure and total. Answers and refusals are joined by question id; `refusals` is omitted when no
 * call refused a question. Each call's usage passes through {@link sanitizeUsage} and the totals
 * add through {@link sumUsage}; `usage` is omitted when no call reported one. The model is the
 * first call's, or the given model when the list is empty, as the empty partial of a cancel
 * before the first call requires.
 *
 * @param model - The judge's configured model, reported when no call completed
 * @param results - The completed calls' results in call order
 * @returns The merged result
 * @example
 * ```ts
 * buildJudgeResult('tev1:0.8b', []) // { model: 'tev1:0.8b', answers: {} }
 * buildJudgeResult('jev-latest', [
 * 	{ model: 'jev-1.13.0', answers: { urgent: { form: 'noul', noul: 0.95 } } },
 * 	{ model: 'jev-1.13.0', answers: {}, refusals: { team: { missing: ['sales'] } } },
 * ])
 * // { model: 'jev-1.13.0', answers: { urgent: ... }, refusals: { team: { missing: ['sales'] } } }
 * ```
 */
export function buildJudgeResult(model: string, results: readonly JudgeResult[]): JudgeResult {
	const answers = results.reduce<Readonly<Record<string, JudgeAnswer>>>(
		(merged, result) => ({ ...merged, ...result.answers }),
		{},
	)
	const refusals = results.reduce<Readonly<Record<string, Refusal>>>(
		(merged, result) => ({ ...merged, ...result.refusals }),
		{},
	)
	const usage = results.reduce<TokenUsage | undefined>(
		(total, result) =>
			result.usage === undefined ? total : sumUsage(total, sanitizeUsage(result.usage)),
		undefined,
	)
	return {
		model: results[0]?.model ?? model,
		answers,
		...(Object.keys(refusals).length === 0 ? {} : { refusals }),
		...(usage === undefined ? {} : { usage }),
	}
}

/**
 * Builds a request's JSON headers, awaiting the caller's header hook inside the call's
 * cancellation bound.
 *
 * @remarks
 * The headers start with `Content-Type: application/json`; each entry the hook returns is set
 * over them, so the hook overrides the content type only when it returns that header. The hook
 * receives `signal` and races its abort, and the abort listener is removed on every exit. Both
 * HTTP engines, the provider and the judge, read their headers here.
 *
 * @param hook - The caller's header hook, or undefined for the JSON content type alone
 * @param signal - The call's combined caller and deadline signal
 * @returns The request headers
 * @throws Thrown when the signal aborts before the hook settles, with the signal's reason, and
 * when the hook throws or rejects, with the hook's own failure
 * @example
 * ```ts
 * const signal = new AbortController().signal
 * // API_KEY stands for the server's bearer key.
 * const headers = await buildProviderHeaders(() => ({ authorization: 'Bearer API_KEY' }), signal)
 * headers.get('authorization') // 'Bearer API_KEY'
 * headers.get('content-type') // 'application/json'
 * ```
 */
export async function buildProviderHeaders(
	hook: ProviderOptions['headers'],
	signal: AbortSignal,
): Promise<Headers> {
	const headers = new Headers({ 'Content-Type': 'application/json' })
	if (hook === undefined) return headers
	const cleanup = new AbortController()
	const aborted = Promise.withResolvers<never>()
	signal.addEventListener('abort', () => aborted.reject(signal.reason), {
		once: true,
		signal: cleanup.signal,
	})
	try {
		signal.throwIfAborted()
		const entries = await Promise.race([
			Promise.resolve().then(() => hook(signal)),
			aborted.promise,
		])
		for (const [key, value] of Object.entries(entries)) headers.set(key, value)
		return headers
	} finally {
		cleanup.abort()
	}
}

/**
 * Projects a provider request onto the declared members the relay wire carries.
 *
 * @remarks
 * Each message keeps `id`, `role`, `content`, and any `calls`, `call`, `images`, and `thinking`;
 * each call keeps only `id`, `name`, and `arguments`, so a local execution context never reaches
 * the wire. Each tool keeps `name` and any `description` and `parameters`, and the options keep
 * any `think` and `schema`. An absent member stays absent. The projection shares every nested
 * value with the input rather than copying it, so the caller snapshots and validates the result;
 * a throwing getter propagates its failure.
 *
 * @param request - The domain conversation and call configuration
 * @returns The request with only the members the relay wire declares
 * @example
 * ```ts
 * requestToRelay({
 * 	messages: [{ id: 'turn-1', role: 'user', content: 'Track BW-5512' }],
 * 	options: { think: false },
 * })
 * // { messages: [{ id: 'turn-1', role: 'user', content: 'Track BW-5512' }], options: { think: false } }
 * ```
 */
export function requestToRelay(request: ProviderRequest): ProviderRequest {
	return {
		messages: request.messages.map((message) => ({
			id: message.id,
			role: message.role,
			content: message.content,
			...(message.calls === undefined
				? {}
				: {
						calls: message.calls.map((call) => ({
							id: call.id,
							name: call.name,
							arguments: call.arguments,
						})),
					}),
			...(message.call === undefined ? {} : { call: message.call }),
			...(message.images === undefined ? {} : { images: message.images }),
			...(message.thinking === undefined ? {} : { thinking: message.thinking }),
		})),
		...(request.tools === undefined
			? {}
			: {
					tools: request.tools.map((tool) => ({
						name: tool.name,
						...(tool.description === undefined ? {} : { description: tool.description }),
						...(tool.parameters === undefined ? {} : { parameters: tool.parameters }),
					})),
				}),
		...(request.options === undefined
			? {}
			: {
					options: {
						...(request.options.think === undefined ? {} : { think: request.options.think }),
						...(request.options.schema === undefined ? {} : { schema: request.options.schema }),
					},
				}),
	}
}

/**
 * Projects a judge question onto the System One wire while preserving omitted members.
 *
 * @param question - The domain question to send
 * @returns The wire question with `type` replacing `form`
 * @example
 * ```ts
 * questionToSystemOne({ form: 'noul' }) // { type: 'noul' }
 * ```
 */
export function questionToSystemOne(question: JudgeQuestion): SystemOneQuestion {
	return {
		type: question.form,
		...(question.instructions === undefined ? {} : { instructions: question.instructions }),
		...(question.criteria === undefined ? {} : { criteria: question.criteria }),
	}
}

/**
 * Extracts a System One distribution in question criteria order and drops server measures.
 *
 * @remarks
 * Every requested candidate must have a finite probability in [0, 1]; the helper checks each
 * requested candidate itself and reads no other member. Score maps and arrays project onto the
 * requested levels. Additional candidates are ignored, sums are unconstrained, and probabilities
 * are preserved without normalization.
 *
 * @param answer - The wire answer to decode
 * @param question - The question defining the form and candidate order
 * @returns The domain answer, or undefined for a mismatched form or a requested candidate whose
 * probability is missing, not finite, or outside [0, 1]
 * @example
 * ```ts
 * extractSystemOneAnswer({ type: 'noul', noul: 0.9 }, { form: 'noul' })
 * // { form: 'noul', noul: 0.9 }
 * ```
 */
export function extractSystemOneAnswer(
	answer: SystemOneAnswer,
	question: JudgeQuestion,
): JudgeAnswer | undefined {
	const bounded = boundsOf(0, 1)
	if (answer.type === 'noul' && question.form === 'noul') {
		return bounded(answer.noul) ? { form: 'noul', noul: answer.noul } : undefined
	}
	if (answer.type === 'choice' && question.form === 'choice') {
		const entries: Array<readonly [string, number]> = []
		for (const label of Object.keys(question.criteria)) {
			if (!Object.hasOwn(answer.probabilities, label)) return undefined
			const probability = answer.probabilities[label]
			if (!bounded(probability)) return undefined
			entries.push([label, probability])
		}
		return { form: 'choice', probabilities: Object.fromEntries(entries) }
	}
	if (answer.type !== 'score' || question.form !== 'score') return undefined
	const probabilities: number[] = []
	for (const level of question.criteria.keys()) {
		if (!Object.hasOwn(answer.probabilities, level)) return undefined
		const probability = isArray(answer.probabilities)
			? answer.probabilities[level]
			: answer.probabilities[String(level)]
		if (!bounded(probability)) return undefined
		probabilities.push(probability)
	}
	return { form: 'score', probabilities }
}

/**
 * Maps complete System One token counts onto validated token usage.
 *
 * @param usage - The optional wire token counts
 * @returns Token usage, or undefined for missing, null, negative, or non-finite counts
 * @example
 * ```ts
 * extractSystemOneUsage({ input_tokens: 975, output_tokens: 4 })
 * // { prompt: 975, completion: 4, total: 979 }
 * ```
 */
export function extractSystemOneUsage(usage: SystemOneUsage | undefined): TokenUsage | undefined {
	const extracted = attempt(() => {
		if (usage === undefined) return undefined
		const { input_tokens: prompt, output_tokens: completion } = usage
		if (!isNumber(prompt) || !isNumber(completion)) return undefined
		const result = { prompt, completion, total: prompt + completion }
		return isTokenUsage(result) ? result : undefined
	})
	return extracted.success ? extracted.value : undefined
}
