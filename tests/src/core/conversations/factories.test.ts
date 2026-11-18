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
import { buildConversationSnapshot } from '../../../setup.js'

describe('createConversation', () => {
	it('returns a Conversation with the supplied id that stores what it is given', () => {
		const conversation = createConversation({ id: 'desk' })
		conversation.add([
			{ role: 'user', content: 'Is the depot open on Friday?' },
			{ role: 'assistant', content: 'The depot is open on Friday.' },
		])

		expect(conversation).toBeInstanceOf(Conversation)
		expect(conversation.id).toBe('desk')
		expect(conversation.messages().map((message) => message.content)).toEqual([
			'Is the depot open on Friday?',
			'The depot is open on Friday.',
		])
	})

	it('returns an empty conversation with a minted id when called with no options', () => {
		const conversation = createConversation()

		expect(conversation.id.length).toBeGreaterThan(0)
		expect(conversation.count).toBe(0)
	})
})

describe('createConversationManager', () => {
	it('returns an empty ConversationManager whose first add becomes active', () => {
		const manager = createConversationManager()

		expect(manager).toBeInstanceOf(ConversationManager)
		expect(manager.count).toBe(0)
		const conversation = manager.add({ id: 'desk' })
		manager.add({ id: 'other' })

		expect(manager.active).toBe(conversation)
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
