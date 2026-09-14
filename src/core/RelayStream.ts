import type { ProviderDelta, ProviderResult, RelayFrame, RelayStreamOptions } from './types.js'
import { RELAY_CONTENT_TYPE, RELAY_PROVIDER_MESSAGE } from './constants.js'
import { relayFrameContract } from './contracts.js'
import { ProviderAbortError, ProviderError } from './errors.js'

/**
 * Streams a provider call as validated NDJSON frames under response backpressure.
 *
 * @remarks
 * Cancellation aborts upstream before returning its iterator. Request listeners are
 * released on settlement. Unexpected provider failures carry a fixed public message.
 *
 * @example
 * ```ts
 * const response = new RelayStream({ provider, request: { messages: [] }, signal }).response
 * ```
 */
export class RelayStream {
	readonly #upstream = new AbortController()
	readonly #encoder = new TextEncoder()
	readonly #iterator: AsyncGenerator<ProviderDelta, ProviderResult>
	readonly #signal: AbortSignal
	readonly #abort: () => void
	readonly #response: Response
	#settled = false

	constructor(options: RelayStreamOptions) {
		this.#signal = options.signal
		this.#abort = this.#abortProvider.bind(this)
		this.#signal.addEventListener('abort', this.#abort, { once: true })
		if (this.#signal.aborted) this.#abortProvider()
		this.#iterator = options.provider.stream(
			options.request.messages,
			this.#upstream.signal,
			options.request.tools,
			options.request.options,
		)
		this.#response = new Response(
			new ReadableStream<Uint8Array>({
				pull: this.#pull.bind(this),
				cancel: this.#cancel.bind(this),
			}),
			{ headers: { 'content-type': RELAY_CONTENT_TYPE, 'cache-control': 'no-store' } },
		)
	}

	/** Exposes the pull-driven response for the provider call. */
	get response(): Response {
		return this.#response
	}

	async #pull(controller: ReadableStreamDefaultController<Uint8Array>): Promise<void> {
		if (this.#settled) return
		try {
			const step = await this.#iterator.next()
			if (this.#settled) return
			this.#write(controller, step.done ? { channel: 'result', result: step.value } : step.value)
			if (step.done) this.#finish(controller)
		} catch (error) {
			if (this.#settled) return
			const frame: RelayFrame =
				error instanceof ProviderAbortError
					? { channel: 'abort', partial: error.partial }
					: { channel: 'error', code: 'PROVIDER', message: RELAY_PROVIDER_MESSAGE }
			this.#write(
				controller,
				relayFrameContract.is(frame)
					? frame
					: { channel: 'error', code: 'PROVIDER', message: RELAY_PROVIDER_MESSAGE },
			)
			this.#finish(controller)
			this.#abortProvider()
			await this.#return()
		}
	}

	async #cancel(): Promise<void> {
		if (this.#settled) return
		this.#settled = true
		this.#abortProvider()
		try {
			await this.#return()
		} finally {
			this.#release()
		}
	}

	async #return(): Promise<void> {
		try {
			await this.#iterator.return({ content: '' })
		} catch {
			// A settled response has no error channel for upstream cleanup failures.
		}
	}

	#write(controller: ReadableStreamDefaultController<Uint8Array>, frame: RelayFrame): void {
		if (!relayFrameContract.is(frame)) throw new ProviderError('PROTOCOL', 'invalid relay frame')
		controller.enqueue(this.#encoder.encode(`${JSON.stringify(frame)}\n`))
	}

	#finish(controller: ReadableStreamDefaultController<Uint8Array>): void {
		this.#settled = true
		this.#release()
		controller.close()
	}

	#abortProvider(): void {
		this.#upstream.abort(this.#signal.reason)
	}

	#release(): void {
		this.#signal.removeEventListener('abort', this.#abort)
	}
}
