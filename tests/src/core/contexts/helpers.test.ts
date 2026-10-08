import type { Message } from '@src/core'
import {
	attachImages,
	attachUserImages,
	collectImageData,
	renderFencedFile,
	intersectKeys,
	renderSection,
	buildConditionKey,
	buildNeededQuestion,
	filterSelectionMessages,
	inferApplicability,
	NEEDED_CRITERION,
	NEEDED_QUESTION,
	renderSelectionState,
} from '@src/core'
import { createFile, createTextContent, isText } from '@orkestrel/workspace'
import { describe, expect, it } from 'vitest'
import {
	buildSelectionMismatches,
	createStockSelectionFixture,
	createToolCall,
	SELECTION_STAND_IN,
	SELECTION_TOOL_MESSAGES,
	SYSTEM_ONE_TEV1,
} from '../../../setup.js'
import { requireValue } from '@orkestrel/test'

describe('stock selection helpers', () => {
	it('encodes separator-bearing ids without collisions', () => {
		expect(buildConditionKey('needed', 'a:b', 'c')).toBe('["needed","a:b","c"]')
		expect(buildConditionKey('needed', 'a:b', 'c')).not.toBe(
			buildConditionKey('needed', 'a', 'b:c'),
		)
		expect(JSON.parse(buildConditionKey('needed', '["needed",', '"\\\n]'))).toEqual([
			'needed',
			'["needed",',
			'"\\\n]',
		])
	})

	it('keeps arithmetic outside the fixed question and renders all message fields with markers', () => {
		const request = requireValue(SELECTION_STAND_IN.at(-1))
		expect(buildNeededQuestion({ ...NEEDED_CRITERION, threshold: 0.9 })).toEqual({
			form: 'noul',
			instructions: NEEDED_QUESTION,
			criteria: { true: NEEDED_CRITERION.yes, false: NEEDED_CRITERION.no },
		})
		expect(buildNeededQuestion({ ...NEEDED_CRITERION, threshold: 0.6 })).toEqual(
			buildNeededQuestion({ ...NEEDED_CRITERION, threshold: 0.9 }),
		)
		const rendered = renderSelectionState(SELECTION_STAND_IN, 'standing', request)
		expect(rendered.split('\n')[0]).toBe(
			'[A] {"id":"standing","role":"user","content":"Use only local files; do not access the internet."}',
		)
		expect(rendered.split('\n').at(-1)).toBe(`[B] ${JSON.stringify(request)}`)
		expect(renderSelectionState([], request.id, request)).toBe(`[A][B] ${JSON.stringify(request)}`)
		const tool = requireValue(SELECTION_TOOL_MESSAGES[2])
		expect(renderSelectionState([tool], tool.id, request)).toContain(JSON.stringify(tool.calls))
	})

	it('reads only matching records and remains pure across all identity mismatches', async () => {
		const fixture = createStockSelectionFixture(0.9, { limit: 1 })
		await fixture.select(fixture.conversation, fixture.request, new AbortController().signal)
		const record = requireValue(fixture.conversation.judgments.judgments()[0])
		expect(inferApplicability(fixture.conversation, fixture.request, fixture.options)[0]).toEqual({
			id: 'standing',
			needed: false,
		})
		for (const [_name, changed] of buildSelectionMismatches(record)) {
			fixture.conversation.judgments.add(changed)
			const before = fixture.conversation.snapshot()
			expect(inferApplicability(fixture.conversation, fixture.request, fixture.options)[0]).toEqual(
				{ id: 'standing' },
			)
			expect(fixture.conversation.snapshot()).toEqual(before)
		}
		expect(fixture.transport.requests).toHaveLength(1)
	})

	it('reinterprets recorded probabilities at both inclusive cutoffs without another ask', async () => {
		const probability = SYSTEM_ONE_TEV1.answers.refund.noul
		const fixture = createStockSelectionFixture(probability, {
			limit: 1,
			probabilities: { standing: probability },
		})
		await fixture.select(fixture.conversation, fixture.request, new AbortController().signal)
		expect(inferApplicability(fixture.conversation, fixture.request, fixture.options)[0]).toEqual({
			id: 'standing',
			needed: true,
		})
		expect(
			inferApplicability(fixture.conversation, fixture.request, {
				...fixture.options,
				needed: { ...NEEDED_CRITERION, threshold: 1 },
			})[0],
		).toEqual({ id: 'standing' })
		const negative = createStockSelectionFixture(probability, {
			limit: 1,
			probabilities: { standing: 1 - probability },
		})
		await negative.select(negative.conversation, negative.request, new AbortController().signal)
		expect(
			inferApplicability(negative.conversation, negative.request, negative.options)[0],
		).toEqual({ id: 'standing', needed: false })
		expect(fixture.transport.requests).toHaveLength(1)
		expect(negative.transport.requests).toHaveLength(1)
	})

	it('keeps unasked and unscreened group members and confirms unique positional call ids', () => {
		const request = requireValue(SELECTION_TOOL_MESSAGES.at(-1))
		const applicability = SELECTION_TOOL_MESSAGES.filter(
			(message) => message.id !== 'duplicate-b',
		).map((message) => ({ id: message.id, needed: false }))
		expect(
			filterSelectionMessages(SELECTION_TOOL_MESSAGES, applicability, request).map(
				(message) => message.id,
			),
		).toEqual(['duplicate', 'duplicate-a', 'duplicate-b', 'request'])
		const assistant = requireValue(SELECTION_TOOL_MESSAGES[2])
		const wrong = {
			id: 'wrong',
			role: 'tool',
			content: 'Unrelated result',
			call: 'different',
		} satisfies Message
		expect(
			filterSelectionMessages(
				[assistant, wrong, request],
				[{ id: assistant.id, needed: false }],
				request,
			),
		).toEqual([wrong, request])
	})
})

describe('renderFencedFile', () => {
	it('assembles a `File:` label + a fenced code block tagged with the language', () => {
		expect(renderFencedFile('src/main.ts', 'typescript', 'const x = 1')).toBe(
			'File: src/main.ts\n```typescript\nconst x = 1\n```',
		)
	})

	it('renders the body verbatim inside the fence (multi-line preserved)', () => {
		expect(renderFencedFile('a.md', 'markdown', '# Title\n\nbody')).toBe(
			'File: a.md\n```markdown\n# Title\n\nbody\n```',
		)
	})

	it('frames a workspace text file from its OWN text arm (path + language + text)', () => {
		// AgentContext.build() renders an active workspace's text files with renderFencedFile, off each
		// file's text arm (`{ text, language }`) — the SOLE in-prompt document context now.
		const file = createFile({
			path: 'x.ts',
			content: createTextContent('const y = 2', 'typescript'),
		})
		if (!isText(file.content)) throw new Error('expected a text file')
		expect(renderFencedFile(file.path, file.content.language, file.content.text)).toBe(
			'File: x.ts\n```typescript\nconst y = 2\n```',
		)
	})
})

describe('renderSection — one assembled context section', () => {
	it('joins the open and each item with blank lines', () => {
		expect(
			renderSection('## Instructions', ['Be terse.', 'Cite sources.'], (one) => one, undefined),
		).toBe('## Instructions\n\nBe terse.\n\nCite sources.')
	})

	it('appends a resolved close as the trailing line', () => {
		expect(renderSection('<rules>', ['Be terse.'], (one) => one, '</rules>')).toBe(
			'<rules>\n\nBe terse.\n\n</rules>',
		)
	})

	it('renders nothing for an empty item list, so open and close never appear alone', () => {
		expect(renderSection('<rules>', [], (one: string) => one, '</rules>')).toBeUndefined()
	})
})

describe('attachImages — the image payload on a copied message', () => {
	it('merges the attached data after the message own images', () => {
		expect(
			attachImages({ id: 'm', role: 'user', content: 'Describe', images: ['own'] }, ['attached']),
		).toEqual({ id: 'm', role: 'user', content: 'Describe', images: ['own', 'attached'] })
	})

	it('never mutates the source message', () => {
		const source: Message = { id: 'm', role: 'user', content: 'Describe' }
		attachImages(source, ['attached'])
		expect(source.images).toBeUndefined()
	})

	it('carries calls only when the source message has them', () => {
		const call = createToolCall({ id: 'c1' })
		expect(
			attachImages({ id: 'm', role: 'assistant', content: '', calls: [call] }, ['a']).calls,
		).toEqual([call])
		expect('calls' in attachImages({ id: 'm', role: 'user', content: 'x' }, ['a'])).toBe(false)
	})
})

describe('attachUserImages — the image payload on a conversation last user turn', () => {
	const conversation: readonly Message[] = [
		{ id: 'u1', role: 'user', content: 'first' },
		{ id: 'a1', role: 'assistant', content: 'reply' },
		{ id: 'u2', role: 'user', content: 'second' },
		{ id: 'a2', role: 'assistant', content: 'later' },
	]

	it('replaces the LAST user message with a copy carrying the data', () => {
		const attached = attachUserImages(conversation, ['payload'])

		expect(attached.map((one) => one.images)).toEqual([
			undefined,
			undefined,
			['payload'],
			undefined,
		])
		// Every other message is the SAME reference — only the target was replaced.
		expect(attached[0]).toBe(conversation[0])
		expect(attached[3]).toBe(conversation[3])
		expect(attached[2]).not.toBe(conversation[2])
	})

	it('never mutates the source conversation', () => {
		attachUserImages(conversation, ['payload'])

		expect(conversation[2]?.images).toBeUndefined()
	})

	it('returns the conversation unchanged for no data', () => {
		expect(attachUserImages(conversation, [])).toBe(conversation)
	})

	it('returns the conversation unchanged when it holds no user message', () => {
		const assistantOnly: readonly Message[] = [{ id: 'a', role: 'assistant', content: 'hi' }]

		expect(attachUserImages(assistantOnly, ['payload'])).toBe(assistantOnly)
	})

	it('merges after a user turn own images, through attachImages', () => {
		const own: readonly Message[] = [{ id: 'u', role: 'user', content: 'x', images: ['own'] }]

		expect(attachUserImages(own, ['payload'])[0]?.images).toEqual(['own', 'payload'])
	})
})

describe('collectImageData — the image carrier split', () => {
	it('collects each image file base64 payload in file order', () => {
		const files = [
			createFile({ path: 'a.png', content: { base64: 'first', mime: 'image/png' } }),
			createFile({ path: 'b.jpg', content: { base64: 'second', mime: 'image/jpeg' } }),
		]
		expect(collectImageData(files)).toEqual(['first', 'second'])
	})

	it('skips a text file — only the binary image arm carries a base64 payload', () => {
		const files = [createFile({ path: 'note.md', content: createTextContent('hello', 'markdown') })]
		expect(collectImageData(files)).toEqual([])
	})

	it('returns an empty list for no files at all', () => {
		expect(collectImageData([])).toEqual([])
	})
})

describe('intersectKeys — the scope narrow primitive', () => {
	it('keeps only the child keys the parent also allows', () => {
		expect(intersectKeys(['read', 'write'], ['write', 'admin'])).toEqual(['write'])
	})

	it('treats an undefined side as the universal set', () => {
		expect(intersectKeys(undefined, ['read'])).toEqual(['read'])
		expect(intersectKeys(['read'], undefined)).toEqual(['read'])
		expect(intersectKeys(undefined, undefined)).toBeUndefined()
	})

	it('returns a copy, so a later mutation of an input cannot leak in', () => {
		const parent = ['read', 'write']
		const result = intersectKeys(parent, undefined)
		parent.push('admin')
		expect(result).toEqual(['read', 'write'])
	})

	it('yields an empty list when nothing is shared', () => {
		expect(intersectKeys(['read'], ['write'])).toEqual([])
	})
})
