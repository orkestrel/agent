import { isRecord } from '@orkestrel/contract'
import { createNDJSONParser } from '@orkestrel/ndjson'

/** Retains first nonempty assistant content across every streamed call of one request.
 * @example new StudyChatRequest().first // undefined
 */
export class StudyChatRequest {
	readonly #started = performance.now()
	#first: number | undefined
	get first(): number | undefined {
		return this.#first
	}
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
