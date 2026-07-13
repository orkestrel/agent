import { Instruction } from '@src/core'
import { describe, expect, it } from 'vitest'

// Instruction is the immutable named directive an InstructionManager renders by
// descending priority (AGENTS §16 — real behavior, no mocks). Covers id minting,
// verbatim name/content, the priority default (0) + explicit value, distinct ids, and
// immutability (a stored instruction reflects its input, not mutated afterwards).

describe('Instruction', () => {
	it('mints a non-empty id and carries name/content verbatim', () => {
		const instruction = new Instruction({ name: 'tone', content: 'Be concise.' })

		expect(instruction.id.length).toBeGreaterThan(0)
		expect(instruction.name).toBe('tone')
		expect(instruction.content).toBe('Be concise.')
	})

	it('defaults priority to 0 when omitted', () => {
		const instruction = new Instruction({ name: 'tone', content: 'x' })

		expect(instruction.priority).toBe(0)
	})

	it('respects an explicit priority (including 0 and negatives)', () => {
		expect(new Instruction({ name: 'a', content: 'x', priority: 10 }).priority).toBe(10)
		expect(new Instruction({ name: 'b', content: 'x', priority: 0 }).priority).toBe(0)
		expect(new Instruction({ name: 'c', content: 'x', priority: -3 }).priority).toBe(-3)
	})

	it('mints a distinct id for each instance', () => {
		const ids = new Set([
			new Instruction({ name: 'a', content: 'x' }).id,
			new Instruction({ name: 'b', content: 'x' }).id,
			new Instruction({ name: 'c', content: 'x' }).id,
		])

		expect(ids.size).toBe(3)
	})

	it('does not store the caller input object by reference (immutable)', () => {
		const input = { name: 'tone', content: 'original', priority: 1 }
		const instruction = new Instruction(input)

		input.content = 'mutated'
		input.priority = 99

		expect(instruction.content).toBe('original')
		expect(instruction.priority).toBe(1)
	})
})
