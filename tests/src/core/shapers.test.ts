import { WORKSPACE_TOOL_EXAMPLE, workspaceToolShape } from '@src/core'
import { createContract } from '@orkestrel/contract'
import { describe, expect, it } from 'vitest'

// The workspace-tool shape compiles (createContract) into the four lockstep outputs; this pins the
// guard/parser side — the contract ACCEPTS each of the 13 operation arms (a valid sample per arm,
// incl. the `workspaces` / `switch` registry ops) and REJECTS malformed input (missing `operation`,
// wrong field type), and the embedded WORKSPACE_TOOL_EXAMPLE satisfies the contract's `is` (the
// anti-drift pin). REAL data, no mocks.

const contract = createContract(workspaceToolShape)

// One valid sample per operation arm — every arm's required fields present.
const SAMPLES = [
	{ operation: 'read', path: 'a.ts' },
	{ operation: 'list' },
	{ operation: 'has', path: 'a.ts' },
	{ operation: 'search', query: 'const' },
	{ operation: 'search', query: 'c.nst', regex: true, exact: false, limit: 3 },
	{ operation: 'replace', query: 'const', replacement: 'let' },
	{ operation: 'replace', query: 'a', replacement: 'b', regex: false, exact: true, limit: 1 },
	{ operation: 'write', path: 'a.ts', content: 'const x = 1' },
	{
		operation: 'splice',
		path: 'a.ts',
		content: '0',
		fromLine: 1,
		fromColumn: 11,
		toLine: 1,
		toColumn: 12,
	},
	{ operation: 'prepend', path: 'a.ts', content: '// head\n' },
	{ operation: 'append', path: 'a.ts', content: '\n// tail' },
	{ operation: 'move', from: 'a.ts', to: 'b.ts' },
	{ operation: 'remove', path: 'a.ts' },
	{ operation: 'workspaces' },
	{ operation: 'switch', id: 'ws-123' },
] as const

describe('workspaceToolShape — the compiled operation contract', () => {
	it('accepts a valid sample of each of the 13 operation arms', () => {
		for (const sample of SAMPLES) {
			expect(contract.is(sample)).toBe(true)
			// The parser round-trips a valid op back to an equal value (parse↔guard soundness).
			expect(contract.parse(sample)).toEqual(sample)
		}
	})

	it('rejects a blob with no `operation` discriminant', () => {
		expect(contract.is({ path: 'a.ts' })).toBe(false)
		expect(contract.parse({ path: 'a.ts' })).toBeUndefined()
	})

	it('rejects an unknown operation value', () => {
		expect(contract.is({ operation: 'delete', path: 'a.ts' })).toBe(false)
		expect(contract.parse({ operation: 'frobnicate' })).toBeUndefined()
	})

	it('rejects a wrong-typed required field (a missing / non-string path or switch id)', () => {
		expect(contract.is({ operation: 'read' })).toBe(false)
		expect(contract.is({ operation: 'read', path: 42 })).toBe(false)
		expect(contract.is({ operation: 'write', path: 'a.ts' })).toBe(false) // missing content
		expect(contract.is({ operation: 'switch' })).toBe(false) // missing id
		expect(contract.is({ operation: 'switch', id: 7 })).toBe(false) // non-string id
	})

	it('rejects a non-integer / sub-1 splice caret (the four flat ints are positive integers)', () => {
		const base = { operation: 'splice', path: 'a.ts', content: 'x' }
		expect(contract.is({ ...base, fromLine: 1, fromColumn: 1, toLine: 1, toColumn: 1 })).toBe(true)
		expect(contract.is({ ...base, fromLine: 0, fromColumn: 1, toLine: 1, toColumn: 1 })).toBe(false)
		expect(contract.is({ ...base, fromLine: 1.5, fromColumn: 1, toLine: 1, toColumn: 1 })).toBe(
			false,
		)
	})

	it('pins WORKSPACE_TOOL_EXAMPLE as a contract-valid operation (anti-drift)', () => {
		expect(contract.is(WORKSPACE_TOOL_EXAMPLE)).toBe(true)
	})

	it('emits an anyOf union schema whose splice arm carries the four FLAT int fields (not a nested range)', () => {
		const schema = contract.schema
		expect(Array.isArray(schema.anyOf)).toBe(true)
		const arms: readonly unknown[] = Array.isArray(schema.anyOf) ? schema.anyOf : []
		// Find the splice arm by its `operation` const.
		const splice = arms.find((arm) => {
			if (typeof arm !== 'object' || arm === null) return false
			const properties = (arm as { properties?: unknown }).properties
			if (typeof properties !== 'object' || properties === null) return false
			const operation = (properties as { operation?: unknown }).operation
			if (typeof operation !== 'object' || operation === null) return false
			const constValue = (operation as { const?: unknown }).const
			const enumValues = (operation as { enum?: unknown }).enum
			return constValue === 'splice' || (Array.isArray(enumValues) && enumValues.includes('splice'))
		})
		expect(splice).toBeDefined()
		const properties =
			typeof splice === 'object' && splice !== null
				? (splice as { properties?: Record<string, unknown> }).properties
				: undefined
		const keys = properties === undefined ? [] : Object.keys(properties).sort()
		expect(keys).toEqual([
			'content',
			'fromColumn',
			'fromLine',
			'operation',
			'path',
			'toColumn',
			'toLine',
		])
		// The four caret fields are FLAT integer schemas, NOT a nested `range` / `start` / `end`.
		expect(properties !== undefined && 'range' in properties).toBe(false)
		expect(properties !== undefined && 'start' in properties).toBe(false)
	})
})
