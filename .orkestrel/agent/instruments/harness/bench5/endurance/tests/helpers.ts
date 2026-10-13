import type { EnduranceMutation } from './types.js'
import { isRecord } from '@orkestrel/contract'
import { EnduranceError } from '../errors.js'

/** Applies a frozen inert mutation to an owned JSON clone.
 * @param original - Parsed valid artifact
 * @param mutation - Offline invalid control
 * @returns The independently mutated parsed artifact
 */
export function mutateArtifact(original: unknown, mutation: EnduranceMutation): unknown {
	const cloned: unknown = JSON.parse(JSON.stringify(original))
	let parent: unknown = cloned
	for (const part of mutation.path.slice(0, -1)) {
		if (Array.isArray(parent) && typeof part === 'number') parent = parent[part]
		else if (isRecord(parent) && typeof part === 'string') parent = parent[part]
		else throw new EnduranceError(`invalid control path ${mutation.id}`)
	}
	const last = mutation.path.at(-1)
	if (Array.isArray(parent) && typeof last === 'number') parent[last] = mutation.value
	else if (isRecord(parent) && typeof last === 'string') parent[last] = mutation.value
	else throw new EnduranceError(`invalid control destination ${mutation.id}`)
	return cloned
}
