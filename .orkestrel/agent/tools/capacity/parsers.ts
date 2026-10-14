import type { CapacityOptions } from './types.ts'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'

/** Parses the qualification CLI before creating any artifact.
 * @param argv - CLI arguments
 * @returns Validated options
 */
export function parseCapacityOptions(argv: readonly string[]): CapacityOptions {
	const { values } = parseArgs({
		args: [...argv],
		options: {
			out: { type: 'string' },
			url: { type: 'string' },
			profile: { type: 'string', default: 'initial' },
			plan: { type: 'boolean', default: false },
			proof: { type: 'string' },
		},
	})
	if (values.out === undefined || values.url === undefined)
		throw new Error('--out and --url are required')
	const url = new URL(values.url)
	if (!['http:', 'https:'].includes(url.protocol) || url.username !== '' || url.password !== '')
		throw new Error('URL must be HTTP(S) without credentials')
	if (values.profile !== 'initial' && values.profile !== 'extended')
		throw new Error('--profile must be initial or extended')
	return {
		out: resolve(values.out),
		url: url.href,
		profile: values.profile,
		plan: values.plan,
		proof: values.proof === undefined ? undefined : resolve(values.proof),
	}
}
