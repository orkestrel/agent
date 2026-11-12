import { readFileSync } from 'node:fs'
import { parseStudyProfile } from '@orkestrel/study'
import { parseJSON } from '@orkestrel/contract'
import { expect, it } from 'vitest'
import { isStudyChatInput } from '../../../studies/chat/validators.js'
import { validateStudyChatProfile } from '../../../studies/chat/helpers.js'

it('rejects grading metadata at the public boundary and preserves stated facts', () => {
	const input = {
		prompt: 'I want a moderate hotel.',
		system: 'Travel assistant.',
		topic: 'bookings',
	}
	expect(isStudyChatInput(input)).toBe(true)
	for (const key of ['accept', 'refuse', 'check', 'depth', 'slot'])
		expect(isStudyChatInput({ ...input, [key]: 'moderate' })).toBe(false)
	expect(isStudyChatInput(null)).toBe(false)
	const revoked = Proxy.revocable({}, {})
	revoked.revoke()
	expect(isStudyChatInput(revoked.proxy)).toBe(false)
})

it('keeps every treatment field equal except the named capacity', () => {
	const profiles = ['full', 'compact', 'tight'].map((name) =>
		parseStudyProfile(parseJSON(readFileSync(`studies/chat/profiles/${name}.json`, 'utf8'))),
	)
	const pinned = parseStudyProfile(
		parseJSON(readFileSync('studies/memory/profiles/recommended.json', 'utf8')),
	)
	expect(profiles.map((profile) => profile.settings?.capacity)).toEqual([19968, 2400, 1600])
	for (const profile of profiles) {
		validateStudyChatProfile(profile)
		expect(profile.agent).toBe(pinned.agent)
		expect(profile.subject).toBe(pinned.subject)
		expect(profile.roots).toEqual(pinned.roots)
		expect(profile.provider?.url).toBe(pinned.provider?.url)
		expect(profile.provider?.model).toBe(pinned.provider?.model)
		expect(profile.provider?.judge).toBe(pinned.provider?.judge)
		expect(profile.provider?.digest.model).toBe(pinned.provider?.digest.model)
		expect(profile.provider?.digest.judge).toBe(pinned.provider?.digest.judge)
		expect(profile.provider?.url).toBe('http://127.0.0.1:11434')
		expect(profile.provider?.daemon).toBeUndefined()
		expect({ ...profile, name: '', settings: { ...profile.settings, capacity: 0 } }).toEqual({
			...profiles[0],
			name: '',
			settings: { ...profiles[0]?.settings, capacity: 0 },
		})
		expect(() =>
			validateStudyChatProfile({ ...profile, settings: { ...profile.settings, capacity: 42 } }),
		).toThrow(/capacity/i)
		expect(() =>
			validateStudyChatProfile({
				...profile,
				settings: {
					...profile.settings,
					capacity: profile.settings?.capacity === 1600 ? 2400 : 1600,
				},
			}),
		).toThrow(/capacity/i)
	}
})
