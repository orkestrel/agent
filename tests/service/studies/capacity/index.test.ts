import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { isRecord } from '@orkestrel/contract'
import { createStudyAdapter } from '../../../../studies/memory/index.js'
import { buildMemoryProfile } from '../../../setupService.js'

describe('shared memory and capacity declarations', () => {
	it('uses one driver and identical public scenario horizon and arm order', async () => {
		const memory: unknown = JSON.parse(await readFile('studies/memory/study.json', 'utf8'))
		const capacity: unknown = JSON.parse(await readFile('studies/capacity/study.json', 'utf8'))
		if (!isRecord(memory) || !isRecord(capacity)) throw new Error('Malformed declaration')
		expect(memory.driver).toBe('memory')
		expect(capacity.driver).toBe(memory.driver)
		expect(capacity.scenarios).toEqual(memory.scenarios)
		expect(capacity.arms).toEqual(memory.arms)
		expect(capacity.order).toEqual(memory.order)
		expect(capacity.retries).toEqual(memory.retries)
		expect(memory.purpose).toBe('quality')
		expect(capacity.purpose).toBe('capacity')
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
