import { describe, expect, it } from 'vitest'
import * as provider from '@orkestrel/ollama'
import * as agent from '../../../src/core/index.js'
import {
	STUDY_DESK_ARMS,
	STUDY_DESK_SKILLS,
	STUDY_DESK_TOOLS,
	isStudyDeskArea,
	isStudyDeskArm,
	isStudyDeskAssertion,
	isStudyDeskInput,
	isStudyDeskProvider,
	isStudyDeskRuntime,
	isStudyDeskSettings,
	validateStudyDeskProfile,
} from '../../../studies/desk/index.js'
import { buildStudyDeskProfile } from '../../setupStudy.js'

describe('the public boundary', () => {
	it('admits a prompt and a known area, and refuses the expected tool or any other member', () => {
		const input = { prompt: 'Is invoice INV-3310 paid?', area: 'billing' }
		expect(isStudyDeskInput(input)).toBe(true)
		for (const key of ['tool', 'arguments', 'outcome'])
			expect(isStudyDeskInput({ ...input, [key]: 'payment_status' })).toBe(false)
		expect(isStudyDeskInput({ ...input, area: 'shipping' })).toBe(false)
		expect(isStudyDeskInput({ ...input, prompt: ' ' })).toBe(false)
		expect(isStudyDeskInput(null)).toBe(false)
		const revoked = Proxy.revocable({}, {})
		revoked.revoke()
		expect(isStudyDeskInput(revoked.proxy)).toBe(false)
	})

	it('admits an assertion only for a catalog tool in its own area', () => {
		expect(isStudyDeskAssertion({ tool: 'payment_status', area: 'billing' })).toBe(true)
		expect(isStudyDeskAssertion({ tool: 'payment_status', area: 'orders' })).toBe(false)
		expect(isStudyDeskAssertion({ tool: 'refund', area: 'billing' })).toBe(false)
		expect(isStudyDeskAssertion({ tool: 'status', area: 'orders', extra: 1 })).toBe(false)
		expect(isStudyDeskArea('staff')).toBe(true)
		expect(isStudyDeskArea('Staff')).toBe(false)
		expect(STUDY_DESK_ARMS).toEqual(['area', 'index'])
		expect(['area', 'index'].every(isStudyDeskArm)).toBe(true)
		for (const arm of ['all', 'shown', 'records']) expect(isStudyDeskArm(arm)).toBe(false)
	})
})

describe('the catalog', () => {
	it('holds 36 distinct tools, 6 in each of the 6 areas the skills name', () => {
		expect(new Set(STUDY_DESK_TOOLS.map((tool) => tool.name)).size).toBe(36)
		expect(STUDY_DESK_SKILLS.map((skill) => skill.name)).toEqual([
			'tickets',
			'customers',
			'billing',
			'orders',
			'inventory',
			'staff',
		])
		for (const skill of STUDY_DESK_SKILLS)
			expect(STUDY_DESK_TOOLS.filter((tool) => tool.area === skill.name)).toHaveLength(6)
	})
})

describe('the treatment', () => {
	it('admits the source provider namespace and refuses one without the timing reader', () => {
		expect(isStudyDeskProvider(provider)).toBe(true)
		expect(isStudyDeskProvider({ ...provider, extractTiming: undefined })).toBe(false)
	})

	it('admits the source Agent namespace and the screen settings, and refuses a partial runtime or another switch', () => {
		expect(isStudyDeskRuntime(agent)).toBe(true)
		expect(isStudyDeskRuntime({ ...agent, createSkillManager: undefined })).toBe(false)
		expect(isStudyDeskRuntime({})).toBe(false)
		const settings = { version: '0.40.16', metadata: { calls: 64, bytes: 1024, duration: 1000 } }
		expect(isStudyDeskSettings(settings)).toBe(true)
		expect(isStudyDeskSettings({ ...settings, capacity: 19968 })).toBe(false)
		expect(isStudyDeskSettings({ version: '0.40.16' })).toBe(false)
	})

	it('admits the screen profile, which declares no judge, and refuses another room, a judge, or a triage role', () => {
		const profile = buildStudyDeskProfile('http://127.0.0.1:9')
		validateStudyDeskProfile(profile)
		const pinned = profile.provider
		if (pinned === undefined) throw new Error('Missing provider')
		expect(() =>
			validateStudyDeskProfile({ ...profile, room: { ...profile.room, output: 4096 } }),
		).toThrow(/treatment/)
		expect(() =>
			validateStudyDeskProfile({ ...profile, room: { ...profile.room, think: true } }),
		).toThrow(/treatment/)
		expect(pinned.judge).toBeUndefined()
		expect(() =>
			validateStudyDeskProfile({
				...profile,
				provider: {
					...pinned,
					judge: 'judge',
					digest: { ...pinned.digest, judge: 'b'.repeat(64) },
				},
			}),
		).toThrow(/treatment/)
		expect(() =>
			validateStudyDeskProfile({
				...profile,
				provider: {
					...pinned,
					triage: 'triage',
					digest: { ...pinned.digest, triage: 'c'.repeat(64) },
				},
			}),
		).toThrow(/treatment/)
		expect(() => validateStudyDeskProfile({ ...profile, provider: undefined })).toThrow(/treatment/)
		expect(() =>
			validateStudyDeskProfile({ ...profile, settings: { version: '0.40.16' } }),
		).toThrow(/settings/)
	})
})
