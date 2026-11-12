import { isRecord } from '@orkestrel/contract'
import { createNDJSONParser } from '@orkestrel/ndjson'

/** Retains the first nonempty assistant content across every streamed call of one request, in seconds from its start.
 * @remarks The chat bundle holds the same reader; Study loads each bundle from its own source root, so a bundle imports none of another's files.
 * @example new StudyDeskRequest().first // undefined
 */
export class StudyDeskRequest {
	readonly #started = performance.now()
	#first: number | undefined

	/** Holds the seconds to the first nonempty assistant content, or undefined before any arrives. */
	get first(): number | undefined {
		return this.#first
	}

	/**
	 * Passes a response through unchanged while reading its NDJSON frames for the first content.
	 * @param response - A provider response
	 * @returns A response carrying the same bytes, status, and headers
	 */
	observe(response: Response): Response {
		if (response.body === null || !response.ok) return response
		const parser = createNDJSONParser()
		const decoder = new TextDecoder()
		return new Response(
			response.body.pipeThrough(
				new TransformStream<Uint8Array, Uint8Array>({
					transform: (chunk, controller) => {
						this.#read(parser.parse(decoder.decode(chunk, { stream: true })))
						controller.enqueue(chunk)
					},
					flush: () => this.#read(parser.parse(`${decoder.decode()}\n`)),
				}),
			),
			{ status: response.status, statusText: response.statusText, headers: response.headers },
		)
	}

	#read(frames: ReadonlyArray<Readonly<Record<string, unknown>>>): void {
		if (
			this.#first === undefined &&
			frames.some(
				(frame) =>
					isRecord(frame.message) &&
					typeof frame.message.content === 'string' &&
					frame.message.content !== '',
			)
		)
			this.#first = (performance.now() - this.#started) / 1000
	}
}
