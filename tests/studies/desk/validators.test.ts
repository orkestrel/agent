import { describe, expect, it } from 'vitest'
import * as provider from '@orkestrel/ollama'
import * as agent from '../../../src/core/index.js'
import {
	STUDY_CHAT_JUDGE,
	STUDY_CHAT_OPTIONS,
	STUDY_CHAT_THRESHOLDS,
} from '../../../studies/chat/constants.js'
import {
	STUDY_DESK_JUDGE,
	STUDY_DESK_JUDGE_OPTIONS,
	STUDY_DESK_SKILLS,
	STUDY_DESK_THRESHOLDS,
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
		expect(['all', 'area', 'index', 'shown'].every(isStudyDeskArm)).toBe(true)
		expect(isStudyDeskArm('records')).toBe(false)
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
	it('files with the chat study judge wiring, which Study bars the bundle from importing', () => {
		expect(STUDY_DESK_JUDGE).toBe(STUDY_CHAT_JUDGE)
		expect(STUDY_DESK_JUDGE_OPTIONS).toEqual(STUDY_CHAT_OPTIONS)
		expect(STUDY_DESK_THRESHOLDS).toEqual(STUDY_CHAT_THRESHOLDS)
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

	it('admits the screen profile and refuses another room, a missing judge, or a triage role', () => {
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
		expect(() =>
			validateStudyDeskProfile({
				...profile,
				provider: {
					...pinned,
					judge: undefined,
					digest: { model: pinned.digest.model, judge: undefined },
				},
			}),
		).toThrow(/treatment/)
		expect(() =>
			validateStudyDeskProfile({ ...profile, settings: { version: '0.40.16' } }),
		).toThrow(/settings/)
	})
})
