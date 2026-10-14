import type { Message, ProviderDelta, ProviderInterface, ProviderResult } from '@orkestrel/agent'
import type { StudyTicket } from '../../../core/studies/types.js'
import type { ScriptedStudyOptions } from './types.js'
import { cloneJSONValue, isRecord } from '@orkestrel/contract'
import { randomUUID } from 'node:crypto'
import { StudyError } from '../../../core/studies/errors.js'
import { readStudyFailure } from '../../../core/studies/engines/helpers.js'
import { encodeStudyJSON } from '../stores/helpers.js'
import { STUDY_TOOLS_BYTES } from './constants.js'
import { readStudyToolsMessages } from './helpers.js'
import { parseStudyToolsInput } from './parsers.js'

/** Serves declared inert responses through the actual Agent provider boundary. */
export class ScriptedStudyProvider implements ProviderInterface {
	readonly id = randomUUID()
	readonly name = 'scripted-study'
	#options: ScriptedStudyOptions | undefined
	#cursor = 0
	#running = false

	/**
	 * Prepares one goal's declared response sequence and metered operational boundary.
	 * @param options - The validated workload and its operational context
	 * @returns Nothing when the provider is ready
	 * @throws StudyError - Thrown when a response is still running
	 */
	prepare(options: ScriptedStudyOptions): void {
		if (this.#running) throw new StudyError('CONFIG', 'Cannot replace a running scripted workload')
		this.#options = { ...options, input: parseStudyToolsInput(options.input) }
		this.#cursor = 0
	}

	/**
	 * Consumes the same streaming response into its assembled provider result.
	 * @param messages - The actual Agent conversation
	 * @param signal - The enclosing Agent run signal
	 * @returns The assembled declared response
	 */
	async generate(messages: readonly Message[], signal: AbortSignal): Promise<ProviderResult> {
		const stream = this.stream(messages, signal)
		let next = await stream.next()
		while (!next.done) next = await stream.next()
		return next.value
	}

	/**
	 * Streams a declared response after authoritative admission and retains actual request bytes.
	 * @param messages - The actual Agent conversation
	 * @param signal - The enclosing Agent run signal
	 * @returns The declared response, optionally consuming an actual prior tool message
	 * @throws StudyError - Thrown when responses are exhausted or admission fails
	 */
	async *stream(
		messages: readonly Message[],
		signal: AbortSignal,
	): AsyncGenerator<ProviderDelta, ProviderResult> {
		const options = this.#options
		if (options === undefined || this.#running)
			throw new StudyError('CONFIG', 'Scripted provider is unavailable')
		const response = options.input.responses[this.#cursor]
		if (response === undefined)
			throw new StudyError('CONFIG', 'Scripted provider response sequence is exhausted')
		this.#cursor++
		this.#running = true
		let ticket: StudyTicket | undefined
		let terminal = false
		const started = performance.now()
		try {
			const request = readStudyToolsMessages(messages)
			let content = response.content
			if (response.consume !== undefined) {
				const prior = request.findLast(
					(message) =>
						isRecord(message) && message.role === 'tool' && message.call === response.consume,
				)
				if (!isRecord(prior) || typeof prior.content !== 'string')
					throw new StudyError('FAULT', 'Continuation has no actual referenced tool result')
				content = prior.content
			}
			const result: ProviderResult = {
				content,
				...(response.calls.length === 0 ? {} : { tools: response.calls }),
			}
			const bytes = encodeStudyJSON({ request, response: result }).byteLength
			if (bytes > STUDY_TOOLS_BYTES)
				throw new StudyError('CAPACITY', 'Scripted request exceeds its encoded workload bound')
			try {
				ticket = await options.context.meter.admit({
					role: 'agent',
					tokens: response.tokens ?? 1,
					bytes: response.bytes ?? STUDY_TOOLS_BYTES,
				})
			} catch (error) {
				await options.context.evidence.append({
					event: 'admission',
					goal: options.goal,
					value: { role: 'agent', refused: true },
				})
				throw error
			}
			const bounded = AbortSignal.any([
				signal,
				options.context.signal,
				options.context.meter.signal,
				ticket.signal,
			])
			bounded.throwIfAborted()
			await options.context.evidence.append({
				event: 'provider',
				goal: options.goal,
				value: {
					request,
					response: {
						content,
						calls: response.calls.map((call) => ({
							id: call.id,
							name: call.name,
							arguments: cloneJSONValue(call.arguments),
						})),
					},
				},
			})
			if (content.length > 0) yield { channel: 'content', text: content }
			bounded.throwIfAborted()
			terminal = true
			ticket.finish({
				role: 'agent',
				calls: 1,
				tokens: undefined,
				bytes,
				duration: Math.ceil(performance.now() - started),
			})
			if (response.cancel === true) {
				await options.context.evidence.append({
					event: 'workload',
					goal: options.goal,
					value: { cancelled: true },
				})
				options.workload.abort(new Error('Declared workload cancellation'))
			}
			return result
		} catch (error) {
			if (ticket !== undefined && !terminal && !ticket.signal.aborted)
				ticket.fail({ ...readStudyFailure(error), role: 'agent' })
			throw error
		} finally {
			this.#running = false
		}
	}
}
