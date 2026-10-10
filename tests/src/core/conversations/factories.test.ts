import {
	Conversation,
	ConversationManager,
	createConversation,
	createConversationManager,
	createDatabaseConversationStore,
	createMemoryConversationStore,
	DatabaseConversationStore,
	MemoryConversationStore,
} from '@src/core'
import { createMemoryDriver } from '@orkestrel/database'
import { describe, expect, it } from 'vitest'
import { buildConversationSnapshot, createStubSummarizer, renderRecap } from '../../../setup.js'

describe('createConversation', () => {
	it('returns a Conversation that folds through the supplied summarizer and keep', async () => {
		const stub = createStubSummarizer()
		const conversation = createConversation({ id: 'desk', summarize: stub.summarize, keep: 1 })
		conversation.add([
			{ role: 'user', content: 'Is the depot open on Friday?' },
			{ role: 'assistant', content: 'The depot is open on Friday.' },
			{ role: 'user', content: 'Which order is late?' },
		])

		const section = await conversation.compact()

		expect(conversation).toBeInstanceOf(Conversation)
		expect(conversation.id).toBe('desk')
		expect(section?.messages.map((message) => message.content)).toEqual([
			'Is the depot open on Friday?',
			'The depot is open on Friday.',
		])
		expect(conversation.view().map((message) => message.content)).toEqual([
			renderRecap('recap of 2'),
			'Which order is late?',
		])
	})

	it('returns a conversation without a summarizer when called with no options', () => {
		const conversation = createConversation()

		expect(conversation.summarizable).toBe(false)
		expect(conversation.count).toBe(0)
	})
})

describe('createConversationManager', () => {
	it('returns an empty ConversationManager whose first add becomes active and inherits the defaults', async () => {
		const stub = createStubSummarizer()
		const manager = createConversationManager({ summarize: stub.summarize, sections: 1 })

		expect(manager).toBeInstanceOf(ConversationManager)
		expect(manager.count).toBe(0)
		const conversation = manager.add({ id: 'desk' })
		conversation.add({ role: 'assistant', content: 'The depot is open on Friday.' })
		await conversation.compact()
		conversation.add({ role: 'assistant', content: 'Order LH-81660 is late.' })
		await conversation.compact()

		expect(manager.active).toBe(conversation)
		expect(conversation.sections).toHaveLength(1)
	})
})

describe('createMemoryConversationStore', () => {
	it('returns an independent MemoryConversationStore on every call', async () => {
		const first = createMemoryConversationStore()
		const second = createMemoryConversationStore()
		const snapshot = await buildConversationSnapshot('desk')
		await first.set(snapshot)

		expect(first).toBeInstanceOf(MemoryConversationStore)
		expect(await first.get('desk')).toEqual(snapshot)
		expect(await second.get('desk')).toBeUndefined()
	})
})

describe('createDatabaseConversationStore', () => {
	it('returns a DatabaseConversationStore over the supplied driver', async () => {
		const driver = createMemoryDriver()
		const snapshot = await buildConversationSnapshot('desk')
		const store = createDatabaseConversationStore(driver)
		await store.set(snapshot)

		expect(store).toBeInstanceOf(DatabaseConversationStore)
		expect(await createDatabaseConversationStore(driver).get('desk')).toEqual(snapshot)
	})

	it('defaults to a memory driver of its own on every call', async () => {
		const first = createDatabaseConversationStore()
		const second = createDatabaseConversationStore()
		const snapshot = await buildConversationSnapshot('desk')
		await first.set(snapshot)

		expect(await first.get('desk')).toEqual(snapshot)
		expect(await second.get('desk')).toBeUndefined()
	})
})
