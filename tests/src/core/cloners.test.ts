import { copyJSON } from '@src/core'
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
