import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { canonicalStringify, isRecord, parseJSON } from '@orkestrel/contract'
import { buildStudySchedule, parseStudyProfile, validateStudyInputs } from '@orkestrel/study'
import { hashStudyBytes } from '@orkestrel/study/server'
import { createStudyAdapter } from '../../../studies/memory/index.js'
import {
	collectMemoryDeclarations,
	loadMemoryInputs,
	readMemoryProfile,
	STUDY_MEMORY_DECLARATIONS,
	STUDY_MEMORY_PROFILES,
	STUDY_MEMORY_SIBLINGS,
	STUDY_MEMORY_TWINS,
} from '../../setupStudy.js'

describe('the memory declarations', () => {
	it('lists exactly the single-strategy declarations on the memory driver', () => {
		expect(collectMemoryDeclarations()).toEqual(STUDY_MEMORY_DECLARATIONS)
		expect(STUDY_MEMORY_TWINS.flatMap((twin) => [twin.capacity, twin.quality]).toSorted()).toEqual(
			STUDY_MEMORY_DECLARATIONS,
		)
		expect(STUDY_MEMORY_SIBLINGS.flat().toSorted()).toEqual(STUDY_MEMORY_DECLARATIONS)
	})

	it('admits every declaration through the real adapter under each of its strategy profiles', async () => {
		const adapter = createStudyAdapter()
		for (const twin of STUDY_MEMORY_TWINS)
			for (const name of [twin.capacity, twin.quality])
				for (const profile of twin.profiles) {
					const input = await loadMemoryInputs(
						readMemoryProfile(profile, 'http://127.0.0.1:7'),
						name,
					)
					expect(input.definition.arms.filter((arm) => arm !== 'full')).toEqual([twin.strategy])
					expect(() =>
						validateStudyInputs(input.definition, input.scenarios, input.rubric, input.profile),
					).not.toThrow()
					expect(() => adapter.validate(input)).not.toThrow()
				}
	})

	it('keeps each compaction rubric a byte copy of its records sibling', () => {
		const digests = STUDY_MEMORY_SIBLINGS.map((sibling) =>
			sibling.map((name) => hashStudyBytes(readFileSync(`studies/${name}/rubric.json`))),
		)
		for (const [records, compaction] of digests) expect(compaction).toBe(records)
		// Each sibling pair hashes apart from the others, so equal digests read distinct bytes.
		expect(new Set(digests.map(([records]) => records)).size).toBe(STUDY_MEMORY_SIBLINGS.length)
	})

	it('agrees within each profile pair on every member but name and qualification', () => {
		const projections = STUDY_MEMORY_PROFILES.map((pair) =>
			[pair.records, pair.compaction].map((side) => {
				const authored = parseJSON(
					readFileSync(`studies/memory/profiles/${side.name}.json`, 'utf8'),
				)
				if (!isRecord(authored)) throw new Error(`Malformed memory profile ${side.name}`)
				// Study refuses a profile whose name differs from the file it selects, so `name` differs by construction.
				expect(authored.name).toBe(side.name)
				// Each strategy profile names the capacity result its own quality twin pairs with.
				expect(authored.qualification).toBe(side.qualification)
				return canonicalStringify(
					Object.fromEntries(
						Object.entries(authored).filter(([key]) => key !== 'name' && key !== 'qualification'),
					),
				)
			}),
		)
		for (const [records, compaction] of projections) expect(compaction).toBe(records)
		// Each base projects apart from the others, so the agreement compares members that can differ.
		expect(new Set(projections.map(([records]) => records)).size).toBe(STUDY_MEMORY_PROFILES.length)
	})

	it('refuses each local template until a host fills its provider', () => {
		for (const name of ['recordslocal', 'compactionlocal']) {
			const authored = parseJSON(readFileSync(`studies/memory/profiles/${name}.json`, 'utf8'))
			expect(() => parseStudyProfile(authored)).toThrow('profile')
			const profile = readMemoryProfile(name, 'http://127.0.0.1:7')
			expect(profile.bounds.request.tokens).toBe(profile.room.context - profile.room.safety)
			expect(profile.roots).toContain('node_modules/@orkestrel/study')
		}
	})

	it.each(STUDY_MEMORY_TWINS)(
		'qualifies $quality with $capacity under one strategy profile',
		async ({ capacity, quality, profiles }) => {
			const adapter = createStudyAdapter()
			for (const name of profiles) {
				const profile = readMemoryProfile(name, 'http://127.0.0.1:7')
				// The quality twin opens only the sealed capacity result its profile names.
				expect(profile.qualification).toBe(`tmp/studies/${capacity}`)
				const sealed = await loadMemoryInputs(profile, capacity)
				const twin = await loadMemoryInputs(profile, quality)
				expect([sealed.definition.purpose, twin.definition.purpose]).toEqual([
					'capacity',
					'quality',
				])
				for (const member of ['driver', 'arms', 'scenarios', 'order', 'retries'] as const)
					expect(twin.definition[member]).toEqual(sealed.definition[member])
				expect(twin.scenarios).toEqual(sealed.scenarios)
				expect(buildStudySchedule(twin.definition, twin.scenarios)).toEqual(
					buildStudySchedule(sealed.definition, sealed.scenarios),
				)
				expect(
					sealed.rubric.criteria.every(
						(criterion) =>
							criterion.method === 'state' &&
							isRecord(criterion.assertion) &&
							criterion.assertion.observation === 'operational',
					),
				).toBe(true)
				expect(() =>
					adapter.validate({ ...twin, profile: { ...profile, qualification: undefined } }),
				).toThrow(
					expect.objectContaining({
						code: 'CONFIG',
						message: 'Memory quality requires a sealed capacity qualification',
					}),
				)
			}
		},
	)
})
