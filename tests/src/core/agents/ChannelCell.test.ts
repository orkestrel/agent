import { describe, expect, it } from 'vitest'
import { ChannelCell } from '../../../../src/core/agents/ChannelCell.js'

describe('ChannelCell', () => {
	it('holds its value with no next cell', () => {
		const cell = new ChannelCell(1)
		expect(cell.value).toBe(1)
		expect(cell.next).toBeUndefined()
	})

	it('links one next cell and keeps it', () => {
		const first = new ChannelCell(1)
		const second = new ChannelCell(2)
		const third = new ChannelCell(3)
		first.link(second)
		first.link(third)
		expect(first.next).toBe(second)
		expect(second.next).toBeUndefined()
	})
})
