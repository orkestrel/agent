import type { SkillEventName } from '../../../../setup.js'
import type { Skill, SkillManagerEventMap } from '@src/core'
import { renderSection, SKILL_SECTION_HEADER, SkillManager } from '@src/core'
import { describe, expect, it } from 'vitest'
import { captureError, createRecorder, createRecorders, invokeUnchecked } from '@orkestrel/test'
import { isContractError } from '@orkestrel/contract'
import { createFile, createTextContent } from '@orkestrel/workspace'
import { createShiftingToolsInput, SKILL_EVENTS, SKILL_TOOLS_REFUSALS } from '../../../../setup.js'

// SkillManager is the name-keyed registry of host-supplied skills: last write wins, insertion
// order kept, files minted through `createFile`. Real behavior, no mocks.

describe('SkillManager — add & lookup', () => {
	it('starts empty', () => {
		const manager = new SkillManager()

		expect(manager.count).toBe(0)
		expect(manager.skills()).toEqual([])
	})

	it('adds a skill with a minted id, the verbatim fields, and no files by default', () => {
		const manager = new SkillManager()
		const skill = manager.add({
			name: 'review',
			description: 'Reviews a change for defects.',
			content: 'Read the diff, then list each defect.',
		})

		expect(skill.id.length).toBeGreaterThan(0)
		expect(skill.name).toBe('review')
		expect(skill.description).toBe('Reviews a change for defects.')
		expect(skill.content).toBe('Read the diff, then list each defect.')
		expect(skill.files).toEqual([])
		expect(skill.tools).toEqual([])
		expect(manager.skill('review')).toBe(skill)
		expect(manager.count).toBe(1)
	})

	it('copies the tools a skill names, so a later mutation of the input cannot leak in', () => {
		const manager = new SkillManager()
		const tools = ['refund', 'lookup']
		const skill = manager.add({
			name: 'refunds',
			description: 'Refunds.',
			content: 'Check.',
			tools,
		})
		tools.push('delete')

		expect(skill.tools).toEqual(['refund', 'lookup'])
		expect(skill.tools).not.toBe(tools)
		expect(manager.skill('refunds')?.tools).toEqual(['refund', 'lookup'])
	})

	it('mints each file through createFile', () => {
		const manager = new SkillManager()
		const input = {
			path: 'checklist.md',
			content: createTextContent('- Tests pass\n- Docs match', 'markdown'),
		}
		const skill = manager.add({
			name: 'review',
			description: 'Reviews a change.',
			content: 'Read the diff.',
			files: [input],
		})

		expect(skill.files).toEqual([createFile(input)])
		expect(skill.files[0]?.lines).toBe(2)
		expect(skill.files[0]?.state).toBe('created')
	})

	it('adds a batch and returns the skills in input order', () => {
		const manager = new SkillManager()
		const created = manager.add([
			{ name: 'review', description: 'Reviews a change.', content: 'Read the diff.' },
			{ name: 'release', description: 'Cuts a release.', content: 'Bump the version.' },
		])

		expect(created.map((one) => one.name)).toEqual(['review', 'release'])
		expect(new Set(created.map((one) => one.id)).size).toBe(2)
		expect(manager.skills()).toEqual(created)
	})

	it('replaces a same-name skill with a fresh id and keeps its position', () => {
		const manager = new SkillManager()
		const first = manager.add({ name: 'review', description: 'v1', content: 'v1' })
		const release = manager.add({ name: 'release', description: 'Cuts.', content: 'Bump.' })
		const second = manager.add({ name: 'review', description: 'v2', content: 'v2' })

		expect(second.id).not.toBe(first.id)
		expect(manager.skill('review')).toBe(second)
		expect(manager.skills()).toEqual([second, release])
		expect(manager.count).toBe(2)
	})

	it('returns undefined for an unknown name', () => {
		expect(new SkillManager().skill('missing')).toBeUndefined()
	})
})

describe('SkillManager — remove & clear', () => {
	it('removes one by name and reports presence', () => {
		const manager = new SkillManager()
		manager.add({ name: 'review', description: 'Reviews.', content: 'Read.' })

		expect(manager.remove('review')).toBe(true)
		expect(manager.remove('review')).toBe(false)
		expect(manager.count).toBe(0)
	})

	it('removes a batch and returns true only when every supplied name was removed', () => {
		const manager = new SkillManager()
		manager.add([
			{ name: 'a', description: 'a', content: 'a' },
			{ name: 'b', description: 'b', content: 'b' },
			{ name: 'c', description: 'c', content: 'c' },
		])

		expect(manager.remove(['a', 'missing', 'b'])).toBe(false)
		expect(manager.skills().map((one) => one.name)).toEqual(['c'])
		expect(manager.remove(['c'])).toBe(true)
	})

	it('clears every skill', () => {
		const manager = new SkillManager()
		manager.add({ name: 'review', description: 'Reviews.', content: 'Read.' })

		manager.clear()

		expect(manager.count).toBe(0)
		expect(manager.skills()).toEqual([])
	})
})

describe('SkillManager — format cascade', () => {
	it('uses the built-in open, render, and close', () => {
		const manager = new SkillManager()
		const skill = manager.add({ name: 'review', description: 'Reviews a change.', content: 'x' })

		expect(manager.open).toBe('## Skills')
		expect(manager.open).toBe(SKILL_SECTION_HEADER)
		expect(manager.render(skill)).toBe('- review: Reviews a change.')
		expect(manager.close).toBeUndefined()
	})

	it('overrides open alone', () => {
		const manager = new SkillManager({ format: { open: '<skills>' } })
		const skill = manager.add({ name: 'review', description: 'Reviews a change.', content: 'x' })

		expect(manager.open).toBe('<skills>')
		expect(manager.render(skill)).toBe('- review: Reviews a change.')
		expect(manager.close).toBeUndefined()
	})

	it('overrides render alone', () => {
		const manager = new SkillManager({ format: { render: (one) => `* ${one.name}` } })
		const skill = manager.add({ name: 'review', description: 'Reviews a change.', content: 'x' })

		expect(manager.open).toBe('## Skills')
		expect(manager.render(skill)).toBe('* review')
		expect(manager.close).toBeUndefined()
	})

	it('overrides close alone', () => {
		const manager = new SkillManager({ format: { close: '</skills>' } })
		const skill = manager.add({ name: 'review', description: 'Reviews a change.', content: 'x' })

		expect(manager.open).toBe('## Skills')
		expect(manager.render(skill)).toBe('- review: Reviews a change.')
		expect(manager.close).toBe('</skills>')
	})

	it('renders one skill section through renderSection', () => {
		const manager = new SkillManager()
		manager.add({ name: 'review', description: 'Reviews a change.', content: 'x' })

		expect(
			renderSection(manager.open, manager.skills(), (one) => manager.render(one), manager.close),
		).toBe('## Skills\n\n- review: Reviews a change.')
	})
})

describe('SkillManager — emitter', () => {
	it('fires add on each created skill (single + batch), in order, and again on a replace', () => {
		const manager = new SkillManager()
		const events = createRecorders<SkillManagerEventMap, SkillEventName>(
			manager.emitter,
			SKILL_EVENTS,
		)
		const one = manager.add({ name: 'a', description: 'a', content: 'a' })
		const [two, three] = manager.add([
			{ name: 'b', description: 'b', content: 'b' },
			{ name: 'a', description: 'a', content: 'a2' },
		])

		expect(events.add.calls).toEqual([[one], [two], [three]])
	})

	it('fires remove once per removed name, a miss emits nothing', () => {
		const manager = new SkillManager()
		manager.add([
			{ name: 'a', description: 'a', content: 'a' },
			{ name: 'b', description: 'b', content: 'b' },
		])
		const events = createRecorders<SkillManagerEventMap, SkillEventName>(
			manager.emitter,
			SKILL_EVENTS,
		)

		expect(manager.remove('a')).toBe(true)
		expect(manager.remove('missing')).toBe(false)
		manager.remove(['b', 'missing'])

		expect(events.remove.calls).toEqual([['a'], ['b']])
	})

	it('fires clear when emptied', () => {
		const manager = new SkillManager()
		const events = createRecorders<SkillManagerEventMap, SkillEventName>(
			manager.emitter,
			SKILL_EVENTS,
		)

		manager.clear()

		expect(events.clear.calls).toEqual([[]])
	})

	it('wires initial listeners through the reserved on option', () => {
		const add = createRecorder<[skill: Skill]>()
		const manager = new SkillManager({ on: { add: add.handler } })
		const skill = manager.add({ name: 'a', description: 'a', content: 'a' })

		expect(add.calls).toEqual([[skill]])
	})

	it('routes a throwing add listener to the error handler with the skill applied', () => {
		const errors = createRecorder<readonly [error: unknown, event: string]>()
		const manager = new SkillManager({ error: errors.handler })
		manager.emitter.on('add', () => {
			throw new Error('the add observer failed')
		})

		const skill = manager.add({ name: 'a', description: 'a', content: 'a' })

		expect(manager.skill('a')).toBe(skill)
		expect(errors.calls).toEqual([[expect.any(Error), 'add']])
	})

	it('swallows a throwing error handler without recursion', () => {
		const errors = createRecorder<readonly [error: unknown, event: string]>()
		const manager = new SkillManager({
			error: (error, event) => {
				errors.handler(error, event)
				throw new Error('the error handler failed')
			},
		})
		manager.emitter.on('add', () => {
			throw new Error('the add listener failed')
		})

		manager.add({ name: 'a', description: 'a', content: 'a' })

		expect(manager.skill('a')?.content).toBe('a')
		expect(errors.count).toBe(1)
		expect(errors.calls[0]?.[1]).toBe('add')
	})
})

describe('SkillManager — the tools a skill names', () => {
	it('mints an absent tools member as none, and copies a list', () => {
		const manager = new SkillManager()
		const names = ['refund']
		const named = manager.add({
			name: 'billing',
			description: 'Billing',
			content: 'B',
			tools: names,
		})
		const bare = manager.add({ name: 'claims', description: 'Claims', content: 'C' })

		expect(named.tools).toEqual(['refund'])
		expect(named.tools).not.toBe(names)
		expect(bare.tools).toEqual([])
	})

	it.each(SKILL_TOOLS_REFUSALS)(
		'refuses $name with a placement error and stores nothing',
		({ tools }) => {
			const added = createRecorder<SkillManagerEventMap['add']>()
			const manager = new SkillManager({ on: { add: added.handler } })
			const error = captureError(() =>
				invokeUnchecked(manager, manager.add, [
					{ name: 'billing', description: 'Billing', content: 'B', tools },
				]),
			)

			expect(isContractError(error) && error.code === 'placement').toBe(true)
			expect(isContractError(error) ? error.context?.path : undefined).toEqual(['input', 'tools'])
			expect(manager.count).toBe(0)
			expect(added.count).toBe(0)
		},
	)

	it('reads the tools member once, so a getter cannot pass the check with one value and store another', () => {
		const manager = new SkillManager()
		const skill = manager.add(createShiftingToolsInput())

		expect(skill.tools).toEqual(['refund'])
	})
})
