import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { isRecord, parseJSON } from '@orkestrel/contract'
import { parseStudyDefinition, parseStudyProfile, validateStudyInputs } from '@orkestrel/study'
import { createStudyAdapter } from '../../../../studies/memory/index.js'
import { buildMemoryProfile, loadMemoryInputs } from '../../../setupService.js'

describe('shared memory and capacity declarations', () => {
	it('uses one driver and identical public scenario horizon and arm order', async () => {
		const memory = parseStudyDefinition(
			parseJSON(await readFile('studies/memory/study.json', 'utf8')),
		)
		const capacity = parseStudyDefinition(
			parseJSON(await readFile('studies/capacity/study.json', 'utf8')),
		)
		expect(memory.name).toBe('memory')
		expect(capacity.name).toBe('capacity')
		expect(memory.driver).toBe('memory')
		expect(capacity.driver).toBe(memory.driver)
		expect(capacity.scenarios).toEqual(memory.scenarios)
		expect(capacity.arms).toEqual(memory.arms)
		expect(capacity.order).toEqual(memory.order)
		expect(capacity.retries).toEqual(memory.retries)
		expect(memory.purpose).toBe('quality')
		expect(capacity.purpose).toBe('capacity')
	})

	it('fits the authored profile to generic room limits and the capacity result location', async () => {
		const authored = parseJSON(await readFile('studies/memory/profiles/local.json', 'utf8'))
		if (!isRecord(authored)) throw new Error('Malformed authored profile')
		expect(() => parseStudyProfile(authored)).toThrow('profile')
		const profile = parseStudyProfile({
			...authored,
			provider: buildMemoryProfile({ url: 'http://127.0.0.1:7' }).provider,
		})
		const input = await loadMemoryInputs(profile)
		expect(() =>
			validateStudyInputs(input.definition, input.scenarios, input.rubric, profile),
		).not.toThrow()
		expect(profile.bounds.request.tokens).toBe(profile.room.context - profile.room.safety)
		expect(profile.qualification).toBe('tmp/studies/memory-capacity')
		expect(profile.roots).toContain('node_modules/@orkestrel/study')
	})

	it('requires quality qualification and refuses semantic capacity assertions offline', () => {
		const adapter = createStudyAdapter()
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		const definition = {
			name: 'test',
			version: '1',
			question: 'mechanisms',
			purpose: 'capacity',
			driver: 'memory',
			arms: ['full'],
			scenarios: ['desk'],
			order: [['full']],
			retries: 0,
			rubric: 'rubric.json',
		} as const
		expect(() =>
			adapter.validate({
				definition,
				scenarios: [],
				rubric: { version: '1', criteria: [] },
				profile,
			}),
		).not.toThrow()
		expect(() =>
			adapter.validate({
				definition: { ...definition, purpose: 'quality' },
				scenarios: [],
				rubric: { version: '1', criteria: [] },
				profile: { ...profile, qualification: undefined },
			}),
		).toThrow('qualification')
		expect(() =>
			adapter.validate({
				definition,
				scenarios: [],
				rubric: {
					version: '1',
					criteria: [
						{
							id: 'meaning',
							scenario: 'desk',
							goal: 'goal',
							method: 'semantic',
							critical: true,
							assertion: 'correct',
						},
					],
				},
				profile,
			}),
		).toThrow('operational')
	})
})
