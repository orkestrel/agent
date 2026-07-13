import { Tool } from '@src/core'
import { describe, expect, it } from 'vitest'

// Tool binds a ToolDefinition schema to an execute handler (AGENTS §16 — real
// handlers, no mocks). A sync and an async handler both run and return their value;
// execute forwards the exact args and passes a return value through verbatim (falsy,
// null, undefined alike); a thrown / rejecting handler is NOT caught here (isolation is
// the ToolManager's job — Tool returns the rejecting promise / re-throws verbatim); the
// definition fields the provider sends are present on the tool (each optional field
// independent), and parameters are kept by reference (the open JSON-Schema forwarded
// verbatim, never cloned).

describe('Tool', () => {
	it('runs a synchronous handler and returns its value', () => {
		const tool = new Tool({ name: 'add', execute: (args) => Number(args.a) + Number(args.b) })

		expect(tool.execute({ a: 2, b: 3 })).toBe(5)
	})

	it('runs an asynchronous handler and resolves its value', async () => {
		const tool = new Tool({
			name: 'echo',
			execute: async (args) => {
				await Promise.resolve()
				return args.text
			},
		})

		await expect(tool.execute({ text: 'hi' })).resolves.toBe('hi')
	})

	it('forwards the exact args object to the handler', () => {
		const received: Record<string, unknown>[] = []
		const tool = new Tool({
			name: 'capture',
			execute: (args) => {
				received.push(args)
				return undefined
			},
		})
		const args = { x: 1, nested: { y: 2 }, list: [1, 2, 3] }

		tool.execute(args)

		expect(received).toHaveLength(1)
		expect(received[0]).toBe(args)
	})

	it('exposes the definition fields the provider advertises', () => {
		const parameters = { type: 'object', properties: { a: { type: 'number' } } }
		const tool = new Tool({
			name: 'add',
			description: 'Add two numbers',
			parameters,
			execute: () => 0,
		})

		expect(tool.name).toBe('add')
		expect(tool.description).toBe('Add two numbers')
		expect(tool.parameters).toBe(parameters)
	})

	it('leaves an omitted description and parameters undefined', () => {
		const tool = new Tool({ name: 'noop', execute: () => undefined })

		expect(tool.name).toBe('noop')
		expect(tool.description).toBeUndefined()
		expect(tool.parameters).toBeUndefined()
	})

	it('keeps each optional schema field independent (description without parameters)', () => {
		const tool = new Tool({ name: 'desc', description: 'only a description', execute: () => 0 })

		expect(tool.description).toBe('only a description')
		expect(tool.parameters).toBeUndefined()
	})

	it('keeps each optional schema field independent (parameters without description)', () => {
		const parameters = { type: 'object' }
		const tool = new Tool({ name: 'params', parameters, execute: () => 0 })

		expect(tool.description).toBeUndefined()
		// parameters is kept by reference (forwarded verbatim, not cloned).
		expect(tool.parameters).toBe(parameters)
	})

	it('passes a falsy return value through verbatim (0 / "" / false)', () => {
		expect(new Tool({ name: 'zero', execute: () => 0 }).execute({})).toBe(0)
		expect(new Tool({ name: 'empty', execute: () => '' }).execute({})).toBe('')
		expect(new Tool({ name: 'falsy', execute: () => false }).execute({})).toBe(false)
	})

	it('passes null and undefined returns through verbatim', () => {
		expect(new Tool({ name: 'nuller', execute: () => null }).execute({})).toBeNull()
		expect(new Tool({ name: 'void', execute: () => undefined }).execute({})).toBeUndefined()
	})

	it('does not catch a synchronous throw — it propagates (isolation is the manager job)', () => {
		const tool = new Tool({
			name: 'boom',
			execute: () => {
				throw new Error('sync boom')
			},
		})

		// Tool.execute delegates verbatim; the throw escapes (the ToolManager catches it).
		expect(() => tool.execute({})).toThrow('sync boom')
	})

	it('does not swallow an async rejection — it returns the rejecting promise verbatim', async () => {
		const tool = new Tool({
			name: 'reject',
			execute: () => Promise.reject(new Error('async boom')),
		})

		await expect(tool.execute({})).rejects.toThrow('async boom')
	})
})
