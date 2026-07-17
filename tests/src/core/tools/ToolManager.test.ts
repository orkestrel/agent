import type { ToolCall } from '@src/core'
import { Tool, ToolManager } from '@src/core'
import { describe, expect, it } from 'vitest'

// ToolManager is the tool registry + per-call error-isolated dispatch the agent loop
// runs model tool-calls through (AGENTS §16 — real Tool handlers, no mocks). Covers
// add (single + batch §9.2) with last-write-wins overwrite that PRESERVES insertion
// position, count, tool/tools order, definitions stripping execute (full / bare /
// partial — optional fields omitted not present-but-undefined), the execute isolation
// (success / async / throw Error / async reject / non-Error throws of every shape /
// not-found), falsy + null + undefined return values preserved, arguments forwarded
// verbatim, batch correlation by id in input order (including out-of-order settling,
// duplicate ids, a large fan-out, and an empty batch), and remove/clear across the
// tool lifecycle (execute after remove / clear, re-add after remove).

function call(
	name: string,
	args: Record<string, unknown> = {},
	id: string = crypto.randomUUID(),
): ToolCall {
	return { id, name, arguments: args }
}

describe('ToolManager — registry', () => {
	it('adds a single tool and reports the count', () => {
		const manager = new ToolManager()
		manager.add(new Tool({ name: 'a', execute: () => 1 }))

		expect(manager.count).toBe(1)
		expect(manager.tool('a')?.name).toBe('a')
	})

	it('starts empty (count 0, no tools, no definitions)', () => {
		const manager = new ToolManager()

		expect(manager.count).toBe(0)
		expect(manager.tools()).toEqual([])
		expect(manager.definitions()).toEqual([])
	})

	it('adds a batch of tools (§9.2)', () => {
		const manager = new ToolManager()
		manager.add([
			new Tool({ name: 'a', execute: () => 1 }),
			new Tool({ name: 'b', execute: () => 2 }),
			new Tool({ name: 'c', execute: () => 3 }),
		])

		expect(manager.count).toBe(3)
		expect(manager.tool('b')?.name).toBe('b')
	})

	it('adds an empty batch as a no-op', () => {
		const manager = new ToolManager()
		manager.add([])

		expect(manager.count).toBe(0)
	})

	it('lists tools in insertion order', () => {
		const manager = new ToolManager()
		manager.add(new Tool({ name: 'first', execute: () => 0 }))
		manager.add([
			new Tool({ name: 'second', execute: () => 0 }),
			new Tool({ name: 'third', execute: () => 0 }),
		])

		expect(manager.tools().map((tool) => tool.name)).toEqual(['first', 'second', 'third'])
	})

	it('returns undefined for an unknown tool name', () => {
		const manager = new ToolManager()

		expect(manager.tool('missing')).toBeUndefined()
	})

	it('returns the exact registered tool instance from tool(name)', () => {
		const tool = new Tool({ name: 'a', execute: () => 0 })
		const manager = new ToolManager()
		manager.add(tool)

		// The registry stores the instance by reference — no clone, no wrapper.
		expect(manager.tool('a')).toBe(tool)
	})

	it('re-adding a name overwrites the prior tool (last write wins)', () => {
		const manager = new ToolManager()
		manager.add(new Tool({ name: 'a', description: 'old', execute: () => 1 }))
		manager.add(new Tool({ name: 'a', description: 'new', execute: () => 2 }))

		expect(manager.count).toBe(1)
		expect(manager.tool('a')?.description).toBe('new')
	})

	it('an overwrite keeps the original insertion position (does not move to the end)', async () => {
		const manager = new ToolManager()
		manager.add([
			new Tool({ name: 'a', execute: () => 'a-old' }),
			new Tool({ name: 'b', execute: () => 'b' }),
			new Tool({ name: 'c', execute: () => 'c' }),
		])
		// Overwrite the FIRST-inserted tool after later tools exist.
		manager.add(new Tool({ name: 'a', execute: () => 'a-new' }))

		// Map.set on an existing key updates in place — 'a' stays first, not last.
		expect(manager.tools().map((tool) => tool.name)).toEqual(['a', 'b', 'c'])
		expect(manager.definitions().map((definition) => definition.name)).toEqual(['a', 'b', 'c'])
		// …and the value is the new handler (last write wins).
		const result = await manager.execute(call('a', {}, 'ov'))
		expect(result).toEqual({ id: 'ov', name: 'a', value: 'a-new' })
	})

	it('an overwrite via a batch also keeps insertion position and takes the last in the batch', () => {
		const manager = new ToolManager()
		manager.add(new Tool({ name: 'a', description: 'first', execute: () => 0 }))
		manager.add(new Tool({ name: 'b', execute: () => 0 }))
		// A batch that re-adds 'a' twice: in-batch last write wins, position preserved.
		manager.add([
			new Tool({ name: 'a', description: 'second', execute: () => 0 }),
			new Tool({ name: 'a', description: 'third', execute: () => 0 }),
		])

		expect(manager.count).toBe(2)
		expect(manager.tools().map((tool) => tool.name)).toEqual(['a', 'b'])
		expect(manager.tool('a')?.description).toBe('third')
	})

	it('strips execute from definitions, leaving the schema a provider can send', () => {
		const parameters = { type: 'object', properties: { a: { type: 'number' } } }
		const manager = new ToolManager()
		manager.add(new Tool({ name: 'add', description: 'Add', parameters, execute: () => 0 }))
		manager.add(new Tool({ name: 'bare', execute: () => 0 }))

		const definitions = manager.definitions()

		expect(definitions).toHaveLength(2)
		const first = definitions[0]
		expect(first).toEqual({ name: 'add', description: 'Add', parameters })
		expect('execute' in first).toBe(false)
		// A bare tool's optional fields are omitted, not present-but-undefined.
		expect(definitions[1]).toEqual({ name: 'bare' })
	})

	it('omits each optional definition field independently (description-only / parameters-only)', () => {
		const parameters = { type: 'object' }
		const manager = new ToolManager()
		manager.add(new Tool({ name: 'desc-only', description: 'has a description', execute: () => 0 }))
		manager.add(new Tool({ name: 'params-only', parameters, execute: () => 0 }))

		const definitions = manager.definitions()

		// description present, parameters absent — and the absent key is omitted, not undefined.
		expect(definitions[0]).toEqual({ name: 'desc-only', description: 'has a description' })
		expect('parameters' in definitions[0]).toBe(false)
		// parameters present, description absent.
		expect(definitions[1]).toEqual({ name: 'params-only', parameters })
		expect('description' in definitions[1]).toBe(false)
	})

	it('definitions carry the parameters object by reference (forwarded verbatim)', () => {
		const parameters = { type: 'object', properties: { a: { type: 'number' } } }
		const manager = new ToolManager()
		manager.add(new Tool({ name: 'add', parameters, execute: () => 0 }))

		expect(manager.definitions()[0].parameters).toBe(parameters)
	})
})

describe('ToolManager — summary advertisement', () => {
	it('advertises the summary in place of the full description via definitions()', () => {
		const manager = new ToolManager()
		manager.add(
			new Tool({
				name: 'search',
				description: 'A very long, detailed explanation of how the search tool works internally.',
				summary: 'Search the index.',
				execute: () => 0,
			}),
		)

		expect(manager.definitions()).toEqual([{ name: 'search', description: 'Search the index.' }])
		// The full description stays on the tool itself for on-demand retrieval.
		expect(manager.tool('search')?.description).toBe(
			'A very long, detailed explanation of how the search tool works internally.',
		)
	})

	it('advertises the full description exactly as before when no summary is set', () => {
		const manager = new ToolManager()
		manager.add(
			new Tool({ name: 'plain', description: 'Full description only.', execute: () => 0 }),
		)

		expect(manager.definitions()).toEqual([
			{ name: 'plain', description: 'Full description only.' },
		])
	})

	it('omits description when neither summary nor description is set', () => {
		const manager = new ToolManager()
		manager.add(new Tool({ name: 'bare', execute: () => 0 }))

		expect(manager.definitions()).toEqual([{ name: 'bare' }])
		expect('description' in manager.definitions()[0]).toBe(false)
	})
})

describe('ToolManager — execute isolation', () => {
	it('resolves a successful call to { id, name, value }', async () => {
		const manager = new ToolManager()
		manager.add(new Tool({ name: 'add', execute: (args) => Number(args.a) + Number(args.b) }))

		const result = await manager.execute(call('add', { a: 2, b: 5 }, 'call-1'))

		expect(result).toEqual({ id: 'call-1', name: 'add', value: 7 })
	})

	it('resolves an async handler call to its awaited value', async () => {
		const manager = new ToolManager()
		manager.add(
			new Tool({
				name: 'echo',
				execute: async (args) => {
					await Promise.resolve()
					return args.text
				},
			}),
		)

		const result = await manager.execute(call('echo', { text: 'ok' }, 'call-2'))

		expect(result).toEqual({ id: 'call-2', name: 'echo', value: 'ok' })
	})

	it('forwards the call arguments object to the handler verbatim', async () => {
		const seen: Record<string, unknown>[] = []
		const manager = new ToolManager()
		manager.add(
			new Tool({
				name: 'capture',
				execute: (args) => {
					seen.push(args)
					return 'ok'
				},
			}),
		)
		const args = { x: 1, nested: { y: [1, 2, 3] } }

		await manager.execute(call('capture', args, 'cap'))

		// The manager passes call.arguments straight through — same reference, no copy.
		expect(seen).toHaveLength(1)
		expect(seen[0]).toBe(args)
	})

	it('forwards an empty arguments object to the handler', async () => {
		const seen: Record<string, unknown>[] = []
		const manager = new ToolManager()
		manager.add(
			new Tool({
				name: 'noargs',
				execute: (args) => {
					seen.push(args)
					return 'ok'
				},
			}),
		)

		const result = await manager.execute(call('noargs', {}, 'na'))

		expect(seen[0]).toEqual({})
		expect(result).toEqual({ id: 'na', name: 'noargs', value: 'ok' })
	})

	it('preserves a falsy return value (0 / "" / false) as value, never treats it as missing', async () => {
		const manager = new ToolManager()
		manager.add([
			new Tool({ name: 'zero', execute: () => 0 }),
			new Tool({ name: 'empty', execute: () => '' }),
			new Tool({ name: 'falsy', execute: () => false }),
		])

		expect(await manager.execute(call('zero', {}, 'z'))).toEqual({
			id: 'z',
			name: 'zero',
			value: 0,
		})
		expect(await manager.execute(call('empty', {}, 'e'))).toEqual({
			id: 'e',
			name: 'empty',
			value: '',
		})
		expect(await manager.execute(call('falsy', {}, 'f'))).toEqual({
			id: 'f',
			name: 'falsy',
			value: false,
		})
	})

	it('preserves an undefined return as value: undefined (a successful empty result, not an error)', async () => {
		const manager = new ToolManager()
		manager.add(new Tool({ name: 'void', execute: () => undefined }))

		const result = await manager.execute(call('void', {}, 'v'))

		// A successful run with no value: value present (undefined), error absent.
		expect(result).toEqual({ id: 'v', name: 'void', value: undefined })
		expect('value' in result).toBe(true)
		expect(result.error).toBeUndefined()
		expect('error' in result).toBe(false)
	})

	it('preserves a null return as value: null', async () => {
		const manager = new ToolManager()
		manager.add(new Tool({ name: 'nuller', execute: () => null }))

		const result = await manager.execute(call('nuller', {}, 'n'))

		expect(result).toEqual({ id: 'n', name: 'nuller', value: null })
		expect(result.value).toBeNull()
	})

	it('catches a throwing handler into an error result (never throws)', async () => {
		const manager = new ToolManager()
		manager.add(
			new Tool({
				name: 'boom',
				execute: () => {
					throw new Error('handler failed')
				},
			}),
		)

		const result = await manager.execute(call('boom', {}, 'call-3'))

		expect(result).toEqual({ id: 'call-3', name: 'boom', error: 'handler failed' })
	})

	it('an error result carries error only — no value key', async () => {
		const manager = new ToolManager()
		manager.add(
			new Tool({
				name: 'boom',
				execute: () => {
					throw new Error('nope')
				},
			}),
		)

		const result = await manager.execute(call('boom', {}, 'b'))

		expect('value' in result).toBe(false)
		expect(result.value).toBeUndefined()
	})

	it('catches an async rejection into an error result', async () => {
		const manager = new ToolManager()
		manager.add(
			new Tool({ name: 'reject', execute: () => Promise.reject(new Error('async boom')) }),
		)

		const result = await manager.execute(call('reject', {}, 'call-4'))

		expect(result).toEqual({ id: 'call-4', name: 'reject', error: 'async boom' })
	})

	it('uses an Error subclass message (instanceof Error branch)', async () => {
		class CustomError extends Error {}
		const manager = new ToolManager()
		manager.add(
			new Tool({
				name: 'custom',
				execute: () => {
					throw new CustomError('custom message')
				},
			}),
		)

		const result = await manager.execute(call('custom', {}, 'ce'))

		expect(result).toEqual({ id: 'ce', name: 'custom', error: 'custom message' })
	})

	it('stringifies a non-Error string throw into the error message', async () => {
		const manager = new ToolManager()
		manager.add(
			new Tool({
				name: 'weird',
				execute: () => {
					throw 'just a string'
				},
			}),
		)

		const result = await manager.execute(call('weird', {}, 'call-5'))

		expect(result).toEqual({ id: 'call-5', name: 'weird', error: 'just a string' })
	})

	it('stringifies every non-Error throw shape (number / object / null / undefined)', async () => {
		const manager = new ToolManager()
		manager.add([
			new Tool({
				name: 'throw-number',
				execute: () => {
					throw 42
				},
			}),
			new Tool({
				name: 'throw-object',
				execute: () => {
					// A plain object is NOT an Error — String(obj) → '[object Object]', proving the
					// branch keys on `instanceof Error`, not on duck-typing a `.message`.
					throw { message: 'I look like an error but am not one' }
				},
			}),
			new Tool({
				name: 'throw-null',
				execute: () => {
					throw null
				},
			}),
			new Tool({
				name: 'throw-undefined',
				execute: () => {
					throw undefined
				},
			}),
		])

		expect(await manager.execute(call('throw-number', {}, 'tn'))).toEqual({
			id: 'tn',
			name: 'throw-number',
			error: '42',
		})
		expect(await manager.execute(call('throw-object', {}, 'to'))).toEqual({
			id: 'to',
			name: 'throw-object',
			error: '[object Object]',
		})
		expect(await manager.execute(call('throw-null', {}, 'tnull'))).toEqual({
			id: 'tnull',
			name: 'throw-null',
			error: 'null',
		})
		expect(await manager.execute(call('throw-undefined', {}, 'tu'))).toEqual({
			id: 'tu',
			name: 'throw-undefined',
			error: 'undefined',
		})
	})

	it('resolves an unknown tool name to a not-found error result', async () => {
		const manager = new ToolManager()

		const result = await manager.execute(call('ghost', {}, 'call-6'))

		expect(result).toEqual({ id: 'call-6', name: 'ghost', error: 'tool not found: ghost' })
	})

	it('a not-found result names the missing tool and carries no value', async () => {
		const manager = new ToolManager()
		manager.add(new Tool({ name: 'present', execute: () => 0 }))

		const result = await manager.execute(call('absent', {}, 'nf'))

		expect(result.error).toBe('tool not found: absent')
		expect('value' in result).toBe(false)
	})
})

describe('ToolManager — batch execute', () => {
	it('correlates results by id in order, resolving success + throw + not-found together', async () => {
		const manager = new ToolManager()
		manager.add([
			new Tool({ name: 'add', execute: (args) => Number(args.a) + Number(args.b) }),
			new Tool({
				name: 'boom',
				execute: () => {
					throw new Error('nope')
				},
			}),
		])

		const results = await manager.execute([
			call('add', { a: 1, b: 1 }, 'a'),
			call('boom', {}, 'b'),
			call('ghost', {}, 'c'),
		])

		// One bad call does not fail the batch — every call resolves, ordered + keyed by id.
		expect(results).toEqual([
			{ id: 'a', name: 'add', value: 2 },
			{ id: 'b', name: 'boom', error: 'nope' },
			{ id: 'c', name: 'ghost', error: 'tool not found: ghost' },
		])
	})

	it('preserves input order even when handlers settle out of order (slow first, fast last)', async () => {
		const order: string[] = []
		const manager = new ToolManager()
		manager.add([
			new Tool({
				name: 'slow',
				execute: async () => {
					await new Promise((resolve) => {
						setTimeout(resolve, 25)
					})
					order.push('slow')
					return 'slow-value'
				},
			}),
			new Tool({
				name: 'fast',
				execute: async () => {
					await Promise.resolve()
					order.push('fast')
					return 'fast-value'
				},
			}),
		])

		const results = await manager.execute([call('slow', {}, 's'), call('fast', {}, 'f')])

		// fast settles before slow, but Promise.all keeps the array correlated by INPUT order.
		expect(order).toEqual(['fast', 'slow'])
		expect(results).toEqual([
			{ id: 's', name: 'slow', value: 'slow-value' },
			{ id: 'f', name: 'fast', value: 'fast-value' },
		])
	})

	it('gives each call its own result even when ids are duplicated (positional, not deduped)', async () => {
		const manager = new ToolManager()
		manager.add(new Tool({ name: 'echo', execute: (args) => args.tag }))

		const results = await manager.execute([
			call('echo', { tag: 'first' }, 'dup'),
			call('echo', { tag: 'second' }, 'dup'),
		])

		// Same id twice → two positional results, each with its own value (no collapse).
		expect(results).toEqual([
			{ id: 'dup', name: 'echo', value: 'first' },
			{ id: 'dup', name: 'echo', value: 'second' },
		])
	})

	it('preserves falsy and undefined values positionally across a mixed batch', async () => {
		const manager = new ToolManager()
		manager.add([
			new Tool({ name: 'zero', execute: () => 0 }),
			new Tool({ name: 'void', execute: () => undefined }),
			new Tool({ name: 'nuller', execute: () => null }),
			new Tool({ name: 'falsy', execute: () => false }),
		])

		const results = await manager.execute([
			call('zero', {}, '0'),
			call('void', {}, 'u'),
			call('nuller', {}, 'n'),
			call('falsy', {}, 'b'),
		])

		expect(results).toEqual([
			{ id: '0', name: 'zero', value: 0 },
			{ id: 'u', name: 'void', value: undefined },
			{ id: 'n', name: 'nuller', value: null },
			{ id: 'b', name: 'falsy', value: false },
		])
	})

	it('resolves a large fan-out concurrently, each correlated to its own id', async () => {
		const manager = new ToolManager()
		manager.add(new Tool({ name: 'sq', execute: (args) => Number(args.n) * Number(args.n) }))
		const calls = Array.from({ length: 200 }, (_unused, index) =>
			call('sq', { n: index }, `id-${index}`),
		)

		const results = await manager.execute(calls)

		expect(results).toHaveLength(200)
		expect(results.every((result, index) => result.id === `id-${index}`)).toBe(true)
		expect(results[7]).toEqual({ id: 'id-7', name: 'sq', value: 49 })
		expect(results[199]).toEqual({ id: 'id-199', name: 'sq', value: 199 * 199 })
	})

	it('resolves an empty batch to an empty array', async () => {
		const manager = new ToolManager()

		await expect(manager.execute([])).resolves.toEqual([])
	})

	it('a single throwing handler in a batch never rejects the whole batch', async () => {
		const manager = new ToolManager()
		manager.add([
			new Tool({ name: 'ok', execute: () => 'fine' }),
			new Tool({
				name: 'boom',
				execute: () => {
					throw new Error('isolated')
				},
			}),
		])

		// The promise resolves (does not reject) despite the throwing handler.
		const results = await manager.execute([call('boom', {}, '1'), call('ok', {}, '2')])

		expect(results).toEqual([
			{ id: '1', name: 'boom', error: 'isolated' },
			{ id: '2', name: 'ok', value: 'fine' },
		])
	})
})

describe('ToolManager — remove & clear', () => {
	it('removes a single tool and reports whether it was present', () => {
		const manager = new ToolManager()
		manager.add(new Tool({ name: 'a', execute: () => 0 }))

		expect(manager.remove('a')).toBe(true)
		expect(manager.remove('a')).toBe(false)
		expect(manager.count).toBe(0)
	})

	it('removes a batch and returns true when any was removed', () => {
		const manager = new ToolManager()
		manager.add([
			new Tool({ name: 'a', execute: () => 0 }),
			new Tool({ name: 'b', execute: () => 0 }),
		])

		expect(manager.remove(['a', 'missing'])).toBe(true)
		expect(manager.count).toBe(1)
		expect(manager.remove(['nope', 'gone'])).toBe(false)
	})

	it('an empty remove batch removes nothing and returns false', () => {
		const manager = new ToolManager()
		manager.add(new Tool({ name: 'a', execute: () => 0 }))

		expect(manager.remove([])).toBe(false)
		expect(manager.count).toBe(1)
	})

	it('a removed tool is gone from tool / tools / definitions', () => {
		const manager = new ToolManager()
		manager.add([
			new Tool({ name: 'a', execute: () => 0 }),
			new Tool({ name: 'b', execute: () => 0 }),
		])

		manager.remove('a')

		expect(manager.tool('a')).toBeUndefined()
		expect(manager.tools().map((tool) => tool.name)).toEqual(['b'])
		expect(manager.definitions().map((definition) => definition.name)).toEqual(['b'])
	})

	it('execute after removing a tool resolves a not-found error (no stale handler)', async () => {
		const manager = new ToolManager()
		manager.add(new Tool({ name: 'a', execute: () => 'live' }))
		manager.remove('a')

		const result = await manager.execute(call('a', {}, 'r'))

		expect(result).toEqual({ id: 'r', name: 'a', error: 'tool not found: a' })
	})

	it('re-adds a tool after removing it (lifecycle: add → remove → add)', async () => {
		const manager = new ToolManager()
		manager.add(new Tool({ name: 'a', execute: () => 'old' }))
		manager.remove('a')
		manager.add(new Tool({ name: 'a', execute: () => 'new' }))

		expect(manager.count).toBe(1)
		const result = await manager.execute(call('a', {}, 're'))
		expect(result).toEqual({ id: 're', name: 'a', value: 'new' })
	})

	it('a re-added tool lands at the end (a removed key frees its insertion slot)', () => {
		const manager = new ToolManager()
		manager.add([
			new Tool({ name: 'a', execute: () => 0 }),
			new Tool({ name: 'b', execute: () => 0 }),
		])
		manager.remove('a')
		manager.add(new Tool({ name: 'a', execute: () => 0 }))

		// Unlike an overwrite (which keeps position), a remove+add is a fresh insertion → last.
		expect(manager.tools().map((tool) => tool.name)).toEqual(['b', 'a'])
	})

	it('clears every tool', () => {
		const manager = new ToolManager()
		manager.add([
			new Tool({ name: 'a', execute: () => 0 }),
			new Tool({ name: 'b', execute: () => 0 }),
		])

		manager.clear()

		expect(manager.count).toBe(0)
		expect(manager.tools()).toEqual([])
	})

	it('execute after clear resolves a not-found error for every prior tool', async () => {
		const manager = new ToolManager()
		manager.add([
			new Tool({ name: 'a', execute: () => 0 }),
			new Tool({ name: 'b', execute: () => 0 }),
		])
		manager.clear()

		const results = await manager.execute([call('a', {}, 'a'), call('b', {}, 'b')])

		expect(results).toEqual([
			{ id: 'a', name: 'a', error: 'tool not found: a' },
			{ id: 'b', name: 'b', error: 'tool not found: b' },
		])
	})

	it('clear on an empty registry is a no-op', () => {
		const manager = new ToolManager()

		manager.clear()

		expect(manager.count).toBe(0)
	})
})
