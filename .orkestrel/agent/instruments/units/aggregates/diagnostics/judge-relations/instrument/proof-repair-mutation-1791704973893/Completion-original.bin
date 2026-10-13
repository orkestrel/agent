import type { JudgeResult } from '../../../.orkestrel/agent/instruments/harness/node_modules/@orkestrel/agent/dist/src/core/index.js'
import type { CompletionFunction, CompletionOptions } from './types.ts'
import { resolve } from 'node:path'
import { describeWire, writeArtifact } from './helpers.ts'

/** Persists result availability and raw-field evidence around real request completion. */
export class Completion {
	readonly #options: CompletionOptions

	constructor(options: CompletionOptions) { this.#options = options }

	/** Records either the actual result or its rejection, then preserves the original outcome.
	 * @param operation - The real ask or decoder invocation; never a replacement implementation
	 * @returns The actual result unchanged
	 * @throws The original operation failure after recording its unavailable result
	 */
	async execute(operation: CompletionFunction): Promise<JudgeResult> {
		const { output, label, capture } = this.#options
		const started = performance.now()
		let result: JudgeResult
		try { result = await operation() }
		catch (error) {
			try {
				writeArtifact(resolve(output, `${label}.normalized.json`), { availability: 'unavailable', error: { name: error instanceof Error ? error.name : 'Thrown value', message: error instanceof Error ? error.message : String(error) }, wall: performance.now() - started })
				writeArtifact(resolve(output, `${label}.wire-evidence.json`), describeWire(capture.response))
			} finally { throw error }
		}
		writeArtifact(resolve(output, `${label}.normalized.json`), { availability: 'present', result, wall: performance.now() - started })
		writeArtifact(resolve(output, `${label}.wire-evidence.json`), describeWire(capture.response))
		return result
	}
}
