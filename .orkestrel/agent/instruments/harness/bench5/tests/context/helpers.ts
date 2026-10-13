import type { Message, MessageInput } from '../../../vendor/agent-0.0.30-trimmed/index.js'

export function buildSeed(): readonly MessageInput[] {
	return Array.from({ length: 18 }, (_, index) => ({
		role: 'user',
		content: `RULE-${index + 1}: Refund limit ${index + 1}. ${'Every refund needs written approval and a current receipt. '.repeat(18)}`,
	}))
}

export function projectMessages(messages: readonly Message[]): readonly object[] {
	return messages.map(({ id: _id, ...message }) => message)
}
