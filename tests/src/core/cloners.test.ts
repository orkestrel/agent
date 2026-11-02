import { copyJSON, freezeJSON } from '@src/core'
import { isArray, isRecord, parseJSON } from '@orkestrel/contract'
import { describe, expect, it } from 'vitest'

describe('copyJSON — ownership through JSON', () => {
	it('copies a proxied record where a structured clone refuses it', () => {
		const proxied = new Proxy({ state: 'A ticket.', tags: ['billing'] }, {})
		expect(() => structuredClone(proxied)).toThrow(DOMException)
		const copy = copyJSON(proxied)
		expect(copy).toEqual({ state: 'A ticket.', tags: ['billing'] })
		expect(copy).not.toBe(proxied)
	})

	it('returns undefined for a value JSON cannot carry', () => {
		const cyclic: Record<string, unknown> = {}
		cyclic.self = cyclic
		expect(copyJSON(cyclic)).toBeUndefined()
		expect(copyJSON(() => 1)).toBeUndefined()
		expect(copyJSON(1n)).toBeUndefined()
	})
})

describe('freezeJSON — deep freeze', () => {
	it('freezes every nested record and list', () => {
		const input = { outer: { list: [{ leaf: 'value' }] } }
		const frozen = freezeJSON(input)
		const outer = isRecord(frozen) ? frozen.outer : undefined
		const list = isRecord(outer) ? outer.list : undefined
		const leaf = isArray(list) ? list[0] : undefined
		expect(frozen).toEqual(input)
		expect(leaf).toEqual({ leaf: 'value' })
		expect(Object.isFrozen(frozen)).toBe(true)
		expect(Object.isFrozen(outer)).toBe(true)
		expect(Object.isFrozen(list)).toBe(true)
		expect(Object.isFrozen(leaf)).toBe(true)
	})

	it('returns a frozen copy of its input', () => {
		const input = { outer: { tag: 'value' } }
		const copy = freezeJSON(input)
		const outer = isRecord(copy) ? copy.outer : undefined
		const cyclic: Record<string, unknown> = {}
		cyclic.self = cyclic
		expect(copy).not.toBe(input)
		expect(copy).toEqual(input)
		expect(outer).toEqual(input.outer)
		expect(Object.isFrozen(copy)).toBe(true)
		expect(Object.isFrozen(outer)).toBe(true)
		expect(Object.isFrozen(input)).toBe(false)
		expect(Object.isFrozen(input.outer)).toBe(false)
		expect(freezeJSON('text')).toBe('text')
		expect(freezeJSON(1)).toBe(1)
		expect(freezeJSON(null)).toBeNull()
		expect(freezeJSON(() => 1)).toBeUndefined()
		expect(freezeJSON(cyclic)).toBeUndefined()
	})

	it('returns undefined wherever copyJSON does', () => {
		const readings = Array.from({ length: 40 }, (_, index) => {
			const depth = (index + 1) * 250
			const nested = parseJSON(`${'['.repeat(depth)}${']'.repeat(depth)}`)
			return { copied: copyJSON(nested), frozen: freezeJSON(nested) }
		})
		const levels: unknown[] = readings
			.map(({ frozen }) => frozen)
			.filter((frozen) => frozen !== undefined)
		for (const level of levels) {
			for (const child of isArray(level) ? level : []) levels.push(child)
		}
		expect(readings.map(({ frozen }) => frozen === undefined)).toEqual(
			readings.map(({ copied }) => copied === undefined),
		)
		expect(levels.length).toBeGreaterThanOrEqual(250)
		expect(levels.every((level) => isArray(level) && Object.isFrozen(level))).toBe(true)
	})

	it('freezes every member of a very wide list', () => {
		// Past the arguments a call takes on a default Node stack, so a spread push would throw.
		const input = Array.from({ length: 300000 }, () => ({}))
		const frozen = freezeJSON(input)
		const members: readonly unknown[] = isArray(frozen) ? frozen : []
		expect(members.length).toBe(input.length)
		expect(Object.isFrozen(frozen)).toBe(true)
		expect(members.every((member) => Object.isFrozen(member))).toBe(true)
	})
})
