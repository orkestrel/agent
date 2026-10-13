import type { ProviderParserInterface } from '../../../vendor/agent-0.0.30-trimmed/index.js'
import { isRecord, parseJSONAs } from '@orkestrel/contract'

export class RelayFrameParser implements ProviderParserInterface {
	#pending = ''
	parse(chunk: string): ReadonlyArray<Readonly<Record<string, unknown>>> {
		this.#pending += chunk
		const lines = this.#pending.split(/\r\n|\n/)
		this.#pending = lines.pop() ?? ''
		return lines
			.filter((line) => line.trim() !== '')
			.map((line) => {
				const value = parseJSONAs(line, isRecord)
				if (value === undefined) throw new Error('Invalid NDJSON fixture frame')
				return value
			})
	}
	clear(): void {
		this.#pending = ''
	}
}
