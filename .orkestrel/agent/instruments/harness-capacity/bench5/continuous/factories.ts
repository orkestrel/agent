import type { LedgerLookup } from '../../vendor/agent-0.0.30-trimmed/index.js'
import type { ScenarioLookups } from '../types.js'
import { createTool } from '@orkestrel/tool'
import { LOOKUP_TOOLS } from '../constants.js'
import { readLookup, resolveLookup } from '../helpers.js'

/**
 * Creates the application lookups every arm advertises, served from the scenario tables at the read point `position` reports.
 *
 * @param tables - The scenario's lookup tables and their versions
 * @param position - Reads the index of the last seed message added, which selects the lookup version
 * @returns One ledger lookup per tool, each carrying the tool and the reader the ledger files results with
 *
 * @example
 * ```ts
 * const lookups = createLookups(copy.tables, () => position)
 * const tools = createToolManager()
 * for (const lookup of lookups) tools.add(lookup.tool)
 * ```
 */
export function createLookups(
	tables: ScenarioLookups,
	position: () => number,
): readonly LedgerLookup[] {
	return LOOKUP_TOOLS.map((spec) => ({
		tool: createTool({
			name: spec.name,
			description: spec.description,
			parameters: {
				type: 'object',
				properties: { [spec.key]: { type: 'string', description: spec.summary } },
				required: [spec.key],
			},
			execute: (args) => resolveLookup(tables, spec.name, String(args[spec.key] ?? ''), position()),
		}),
		read: readLookup,
	}))
}
