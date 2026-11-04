import {
	AGENT_WIRE_FRAMES,
	REFUSED_WIRE_ANSWERS,
	REFUSED_WIRE_FRAMES,
	REFUSED_WIRE_PROMPTS,
	AGENT_JOB_CASES,
} from '../../../setup.js'
import { seededRandom } from '@orkestrel/contract'
import { describe, expect, it } from 'vitest'
import {
	agentAnswerContract,
	agentFrameContract,
	agentPromptContract,
	agentJobContract,
} from '@src/core'

// The agent wire contracts: every frame arm accepted, every off-wire member refused, and the
// guard, the parser, and the generator agreeing.

describe('agent wire contracts', () => {
	it.each(AGENT_JOB_CASES)('job: $name', ({ value, admitted }) => {
		expect(agentJobContract.is(value)).toBe(admitted)
	})

	it('parses seeded durable jobs', () => {
		for (const seed of Array.from({ length: 32 }, (_, index) => index + 1)) {
			const value = agentJobContract.generate(seededRandom(seed))
			expect(agentJobContract.is(value)).toBe(true)
			expect(agentJobContract.parse(value)).toEqual(value)
		}
	})
	it('accepts every frame arm', () => {
		for (const [title, frame] of AGENT_WIRE_FRAMES) {
			expect([title, agentFrameContract.is(frame)]).toEqual([title, true])
		}
	})

	it('refuses frame members off the wire', () => {
		for (const [title, frame] of REFUSED_WIRE_FRAMES) {
			expect([title, agentFrameContract.is(frame)]).toEqual([title, false])
		}
	})

	it('refuses a prompt with a role or id', () => {
		expect(
			agentPromptContract.is({ content: 'Check the invoice.', images: ['aW52b2ljZQ=='] }),
		).toBe(true)
		for (const [title, prompt] of REFUSED_WIRE_PROMPTS) {
			expect([title, agentPromptContract.is(prompt)]).toEqual([title, false])
		}
	})

	it('refuses an answer that is not exact', () => {
		expect(agentAnswerContract.is({ id: 'a1', approved: false })).toBe(true)
		for (const [title, answer] of REFUSED_WIRE_ANSWERS) {
			expect([title, agentAnswerContract.is(answer)]).toEqual([title, false])
		}
	})

	it('refuses a throwing Proxy', () => {
		const hostile = new Proxy(
			{ category: 'error', content: '', id: 'a1', approved: true },
			{
				get() {
					throw new Error('unreadable member')
				},
			},
		)

		expect([
			agentFrameContract.is(hostile),
			agentPromptContract.is(hostile),
			agentAnswerContract.is(hostile),
		]).toEqual([false, false, false])
	})

	it('agrees with parse on seeded values', () => {
		for (const seed of Array.from({ length: 32 }, (_, index) => index + 1)) {
			expect(agentFrameContract.is(agentFrameContract.generate(seededRandom(seed)))).toBe(true)
			expect(agentPromptContract.is(agentPromptContract.generate(seededRandom(seed)))).toBe(true)
			expect(agentAnswerContract.is(agentAnswerContract.generate(seededRandom(seed)))).toBe(true)
		}
		for (const [, frame] of AGENT_WIRE_FRAMES) {
			expect(agentFrameContract.parse(frame)).toEqual(frame)
		}
		const prompt = { content: 'Check the invoice.', images: ['aW52b2ljZQ=='] }
		const answer = { id: 'a1', approved: true }
		expect([agentPromptContract.parse(prompt), agentAnswerContract.parse(answer)]).toEqual([
			prompt,
			answer,
		])
	})
})
