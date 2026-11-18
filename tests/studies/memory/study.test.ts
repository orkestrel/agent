import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { canonicalStringify, isRecord, parseJSON } from '@orkestrel/contract'
import {
	buildStudySchedule,
	parseStudyDefinition,
	parseStudyProfile,
	validateStudyInputs,
} from '@orkestrel/study'
import { hashStudyBytes } from '@orkestrel/study/server'
import { createStudyAdapter } from '../../../studies/memory/index.js'
import {
	collectMemoryDeclarations,
	loadMemoryInputs,
	readMemoryProfile,
	STUDY_MEMORY_DECLARATIONS,
	STUDY_MEMORY_PROFILES,
	STUDY_MEMORY_RUBRICS,
	STUDY_MEMORY_TWINS,
} from '../../setupStudy.js'

describe('the memory declarations', () => {
	it('lists exactly the four records declarations on the memory driver (claim S-1)', () => {
		expect(collectMemoryDeclarations()).toEqual([
			'recordscapacity',
			'recordsendurance',
			'recordsmemory',
			'recordsqualification',
		])
	})

	it('resolves exactly one profile for each capacity declaration a quality twin opens (claim S-4)', () => {
		const qualifications = readdirSync('studies/memory/profiles')
			.toSorted()
			.map((file) => {
				const authored = parseJSON(readFileSync(`studies/memory/profiles/${file}`, 'utf8'))
				if (!isRecord(authored)) throw new Error(`Malformed memory profile ${file}`)
				return { name: authored.name, qualification: authored.qualification }
			})
		const capacities = collectMemoryDeclarations().filter(
			(name) =>
				parseStudyDefinition(parseJSON(readFileSync(`studies/${name}/study.json`, 'utf8')))
					.purpose === 'capacity',
		)

		expect(
			capacities.map((capacity) =>
				qualifications
					.filter((profile) => profile.qualification === `tmp/studies/${capacity}`)
					.map((profile) => profile.name),
			),
		).toEqual([['recordslocal'], ['recordsrecommended']])
		expect(
			qualifications.every((profile) =>
				capacities.some((capacity) => profile.qualification === `tmp/studies/${capacity}`),
			),
		).toBe(true)
	})

	it('pins each records rubric to the SHA-256 it held at 2a7c4e9f', () => {
		expect(
			Object.fromEntries(
				collectMemoryDeclarations().map((name) => [
					name,
					hashStudyBytes(readFileSync(`studies/${name}/rubric.json`)),
				]),
			),
		).toEqual(STUDY_MEMORY_RUBRICS)
	})

	it('pairs every declaration on the memory driver into a capacity and quality twin', () => {
		expect(collectMemoryDeclarations()).toEqual(STUDY_MEMORY_DECLARATIONS)
		expect(STUDY_MEMORY_TWINS.flatMap((twin) => [twin.capacity, twin.quality]).toSorted()).toEqual(
			STUDY_MEMORY_DECLARATIONS,
		)
	})

	it('admits every declaration through the real adapter under each of its profiles', async () => {
		const adapter = createStudyAdapter()
		for (const twin of STUDY_MEMORY_TWINS)
			for (const name of [twin.capacity, twin.quality])
				for (const profile of twin.profiles) {
					const input = await loadMemoryInputs(
						readMemoryProfile(profile, 'http://127.0.0.1:7'),
						name,
					)
					expect(input.definition.arms.filter((arm) => arm !== 'full')).toEqual(['records'])
					expect(() =>
						validateStudyInputs(input.definition, input.scenarios, input.rubric, input.profile),
					).not.toThrow()
					expect(() => adapter.validate(input)).not.toThrow()
				}
	})

	it('names each profile after its file, beside the capacity result it qualifies with, and keeps the two apart', () => {
		const projections = STUDY_MEMORY_PROFILES.map((profile) => {
			const authored = parseJSON(
				readFileSync(`studies/memory/profiles/${profile.name}.json`, 'utf8'),
			)
			if (!isRecord(authored)) throw new Error(`Malformed memory profile ${profile.name}`)
			// Study refuses a profile whose name differs from the file it selects.
			expect(authored.name).toBe(profile.name)
			// Each profile names the capacity result its quality twin pairs with.
			expect(authored.qualification).toBe(profile.qualification)
			return canonicalStringify(
				Object.fromEntries(
					Object.entries(authored).filter(([key]) => key !== 'name' && key !== 'qualification'),
				),
			)
		})
		// The local template and the recommended profile differ in more than their names.
		expect(new Set(projections).size).toBe(STUDY_MEMORY_PROFILES.length)
	})

	it('refuses the local template until a host fills its provider', () => {
		const authored = parseJSON(readFileSync('studies/memory/profiles/recordslocal.json', 'utf8'))
		expect(() => parseStudyProfile(authored)).toThrow('profile')
		const profile = readMemoryProfile('recordslocal', 'http://127.0.0.1:7')
		expect(profile.bounds.request.tokens).toBe(profile.room.context - profile.room.safety)
		expect(profile.roots).toContain('node_modules/@orkestrel/study')
	})

	it.each(STUDY_MEMORY_TWINS)(
		'qualifies $quality with $capacity under its profile',
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
