import type { StudyMemoryInput } from '../../../studies/memory/types.js'
import { createHash } from 'node:crypto'
import { OllamaJudge } from '@orkestrel/ollama'
import { requireValue } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import * as actual from '@src/core'
import { buildStudySentenceFixture, STUDY_SENTENCE_DRAW } from '../../setupStudy.js'
import { STUDY_MEMORY_JUDGE } from '../../../studies/memory/constants.js'
import { isStudyMemoryInput } from '../../../studies/memory/validators.js'
import {
	buildStudySentenceManifest,
	buildStudySentencePacket,
	collectStudySentenceCases,
	collectStudySentenceEarlier,
	collectStudySentenceSources,
	compareStudySentenceRank,
	drawStudySentencePackets,
	forecastStudySentenceRequests,
	projectStudySentenceBlind,
	renderStudySentenceState,
	resolveStudySentenceSource,
	sharesStudySentenceTokens,
	matchesStudySentenceTarget,
	STUDY_SENTENCE_QUESTION,
} from '../../../studies/sentences/index.js'

describe('public sentence population', () => {
	it('distinguishes every exact target identity component', () => {
		const target = {
			earlier: { id: 'receipt', version: 4 },
			later: { id: 'correction', version: 52 },
			sentence: 0,
		}
		expect(
			matchesStudySentenceTarget(target, {
				earlier: { id: 'receipt', version: 4 },
				later: { id: 'correction', version: 52 },
				sentence: 0,
			}),
		).toBe(true)
		for (const other of [
			{
				earlier: { id: 'other', version: 4 },
				later: { id: 'correction', version: 52 },
				sentence: 0,
			},
			{
				earlier: { id: 'receipt', version: 5 },
				later: { id: 'correction', version: 52 },
				sentence: 0,
			},
			{ earlier: { id: 'receipt', version: 4 }, later: { id: 'other', version: 52 }, sentence: 0 },
			{
				earlier: { id: 'receipt', version: 4 },
				later: { id: 'correction', version: 53 },
				sentence: 0,
			},
			{
				earlier: { id: 'receipt', version: 4 },
				later: { id: 'correction', version: 52 },
				sentence: 1,
			},
		])
			expect(matchesStudySentenceTarget(target, other)).toBe(false)
	})

	it('retains the exact shared-case opening target before standing drawing', () => {
		const input = buildStudySentenceFixture()
		const manifest = buildStudySentenceManifest(input)
		const packet = requireValue(
			manifest.packets.find(
				(entry) => entry.id === '94c4a4d03f27571c25b98a043ac77456418c8fb624edbbc481a66ac3659ca5bf',
			),
		)
		expect([
			packet.earlier.id,
			packet.earlier.version,
			packet.later.id,
			packet.later.version,
			packet.sentence,
		]).toEqual(['ev-opening', 0, 'ev-source-13-3', 48, 9])
		expect(packet.earlier.cases).toEqual(['BC-7301', 'BC-7312'])
		expect(packet.later.cases).toEqual(['BC-7301'])
		expect(packet.partition).toBe('fitting')
		expect(packet.stratum).toBe('same')
		expect(packet.text).toBe(
			"Mara Ellison's BC-7301 case will have no updates during shifts 2 through 12; do not invent progress while it is dormant.",
		)
		expect(packet.text).toBe(input.agent.splitSentences(packet.earlier.text)[9])
		expect(sharesStudySentenceTokens(packet.text, packet.later.text, input.agent)).toBe(true)
		expect(input.population.standing).toContain('ev-opening')
		expect(manifest.packets.some((entry) => entry.earlier.id === 'ev-register')).toBe(false)
		expect(
			manifest.excluded.some(
				(row) =>
					row.reason === 'partition' &&
					row.packet.earlier.id === 'ev-source-2-2' &&
					row.packet.later.id === 'ev-source-13-2' &&
					row.packet.sentence === 3,
			),
		).toBe(true)
	})

	it('refuses an eligible sibling replacing the exact required original sentence', () => {
		const input = buildStudySentenceFixture()
		const baseline = buildStudySentenceManifest(input)
		expect(
			baseline.packets
				.filter((packet) => packet.required && packet.earlier.id === 'ev-source-2-1')
				.map((packet) => packet.sentence),
		).toEqual([0])
		const variants = [
			'Receipt remains filed. Order BC-7302 remains open.',
			'Receipt remains filed. Correspondence stays available.',
			'Order BC-7302 remains filed. Order BC-7302 remains open.',
		].map((content) => ({
			...input,
			population: {
				...input.population,
				aliases: input.population.aliases.map((alias) =>
					alias.source.id === 'ev-source-2-1' && alias.source.version === 4
						? { ...alias, text: `[Source ev-source-2-1] ${content}` }
						: alias,
				),
			},
			scenario: {
				...input.scenario,
				goals: input.scenario.goals.map((goal) => {
					if (!isStudyMemoryInput(goal.input)) throw new Error('Invalid public scenario input')
					const released: StudyMemoryInput = goal.input
					return {
						...goal,
						input: {
							...released,
							arrivals: released.arrivals.map((arrival) =>
								arrival.id === 'ev-source-2-1' ? { ...arrival, content } : arrival,
							),
						},
					}
				}),
			},
		}))
		const sibling = requireValue(variants[0])
		const empty = requireValue(variants[1])
		const sources = collectStudySentenceSources(sibling)
		const earlier = resolveStudySentenceSource(
			{ id: 'ev-source-2-1', version: 4 },
			sources,
			sibling.population.aliases,
		)
		const later = resolveStudySentenceSource(
			{ id: 'ev-source-14-2', version: 52 },
			sources,
			sibling.population.aliases,
		)
		const sentences = input.agent.splitSentences(earlier.text)
		expect(sharesStudySentenceTokens(requireValue(sentences[0]), later.text, input.agent)).toBe(
			false,
		)
		expect(sharesStudySentenceTokens(requireValue(sentences[1]), later.text, input.agent)).toBe(
			true,
		)
		expect(() => buildStudySentenceManifest(sibling)).toThrow('Missing required R target')
		expect(() => buildStudySentenceManifest(empty)).toThrow('Missing required R target')
		const both = buildStudySentenceManifest(requireValue(variants[2]))
		expect(
			both.packets
				.filter((packet) => packet.required && packet.earlier.id === 'ev-source-2-1')
				.map((packet) => packet.sentence),
		).toEqual([0])
		expect(
			both.packets.some(
				(packet) =>
					packet.earlier.id === 'ev-source-2-1' &&
					packet.later.id === 'ev-source-14-2' &&
					packet.sentence === 1 &&
					!packet.required,
			),
		).toBe(true)
	})

	it('retains complete public bytes, side membership, required R versions, and blind custody', () => {
		const input = buildStudySentenceFixture()
		const manifest = buildStudySentenceManifest(input)
		expect(manifest.question).toEqual(STUDY_SENTENCE_QUESTION)
		const side = requireValue(
			manifest.packets.find(
				(packet) =>
					packet.earlier.id === 'ev-side-5' &&
					packet.later.id === 'ev-source-15-1' &&
					packet.sentence === 1,
			),
		)
		expect(side.cases).toEqual(['BC-7303'])
		const recorded = requireValue(
			manifest.packets.find((packet) => packet.required && packet.earlier.id === 'order:BC-7302'),
		)
		expect(recorded.earlier.version).toBe(4)
		expect(recorded.earlier.role).toBe('tool')
		expect(recorded.earlier.text).toBe(
			'order:BC-7302: Ivo Mercer\nOrder BC-7302; owner Ivo Mercer; four moisture meters; $744.00 settled; disputed carrier delivery; destination Linden pump room; no replacement or refund authorized.',
		)
		expect(recorded.earlier.digest).toBe(
			createHash('sha256').update(recorded.earlier.text).digest('hex'),
		)
		expect(manifest.packets.filter((packet) => packet.required)).toHaveLength(5)
		expect(
			manifest.packets.filter((packet) => packet.constraint?.category === 'recorded-header'),
		).toHaveLength(4)
		expect(
			manifest.sources.find((source) => source.id === 'order:BC-7302' && source.version === 52)
				?.text,
		).toContain('receiver Petra Salcedo')
		expect(manifest.sources.find((source) => source.id === 'ev-side-10')?.cases).toEqual([
			'BC-7308',
		])
		expect(manifest.aliases).toHaveLength(30)
		expect(manifest.duplicates.length).toBeGreaterThan(0)
		for (const packet of manifest.packets) {
			expect(packet.text).toBe(actual.splitSentences(packet.earlier.text)[packet.sentence])
			expect(sharesStudySentenceTokens(packet.text, packet.later.text, actual)).toBe(true)
			expect(packet.state).toContain(`Sentence index (zero-based): ${packet.sentence}`)
		}
		expect(manifest.blind).toEqual(manifest.packets.map(projectStudySentenceBlind))
		expect(Object.keys(requireValue(manifest.blind[0])).toSorted()).toEqual([
			'earlier',
			'id',
			'later',
			'sentence',
			'target',
		])
		expect(Object.keys(requireValue(manifest.blind[0]).earlier).toSorted()).toEqual([
			'role',
			'text',
		])
	})

	it('matches all public account and name aliases without treating organizations as customers', () => {
		const input = buildStudySentenceFixture()
		expect(
			collectStudySentenceCases(
				'ev-source-1-1',
				'Account bc-4102 belongs to Ivo; Mara has a separate case at Beacon Cooperative.',
				input.population,
			),
		).toEqual(['BC-7301', 'BC-7302'])
		expect(
			collectStudySentenceCases(
				'endurance-desk',
				'Beacon Cooperative and Linden equipment annex.',
				input.population,
			),
		).toEqual([])
	})

	it('refuses unknown case ids and unassigned source identities', () => {
		const input = buildStudySentenceFixture()
		expect(() =>
			collectStudySentenceCases('endurance-desk', 'Customer account BC-4199.', input.population),
		).toThrow('Unassigned case identity')
		expect(() =>
			collectStudySentenceCases('unknown-source', 'Mara Ellison BC-7301.', input.population),
		).toThrow('Unassigned source identity')
		expect(() =>
			collectStudySentenceCases('ev-source-1-1', 'Mara.', {
				...input.population,
				membership: { ...input.population.membership, 'ev-source-1-1': ['BC-7399'] },
			}),
		).toThrow('Unassigned declared case')
	})

	it('distinguishes neutral standing context from the case-bearing opening', () => {
		const input = buildStudySentenceFixture()
		expect(
			collectStudySentenceCases(
				'ev-opening',
				requireValue(
					collectStudySentenceSources(input).find((source) => source.id === 'ev-opening'),
				).text,
				input.population,
			),
		).toEqual(['BC-7301', 'BC-7312'])
		expect(() =>
			collectStudySentenceCases('ev-opening', 'Mara Ellison and Soren Ashby.', {
				...input.population,
				neutral: [...input.population.neutral, 'ev-opening'],
			}),
		).toThrow('Case-bearing neutral')
		expect(() =>
			collectStudySentenceCases('endurance-desk', 'Standing desk policy.', {
				...input.population,
				neutral: [],
			}),
		).toThrow('Undeclared neutral')
	})

	it('collapses a recorded arrival UUID only with equal role and complete bytes', () => {
		const input = buildStudySentenceFixture()
		const sources = collectStudySentenceSources(input)
		const alias = requireValue(
			input.population.aliases.find((entry) => entry.source.id === 'ev-source-2-2'),
		)
		const source = resolveStudySentenceSource(
			{ id: alias.id, version: 4 },
			sources,
			input.population.aliases,
		)
		expect(source.id).toBe('ev-source-2-2')
		expect(() =>
			resolveStudySentenceSource({ id: alias.id, version: 4 }, sources, [
				{ ...alias, text: `${alias.text} ` },
			]),
		).toThrow('Incompatible alias rendering')
		expect(() =>
			resolveStudySentenceSource({ id: alias.id, version: 4 }, sources, [
				{ ...alias, role: 'tool' },
			]),
		).toThrow('Incompatible alias rendering')
		expect(() =>
			resolveStudySentenceSource({ id: alias.id, version: 52 }, sources, [alias]),
		).toThrow('Incompatible alias version')
	})

	it('separates lookup versions and arrivals even for identical sentence texts', () => {
		const input = buildStudySentenceFixture()
		const sources = collectStudySentenceSources(input)
		const earlier = resolveStudySentenceSource({ id: 'order:BC-7302', version: 4 }, sources, [])
		const later = resolveStudySentenceSource({ id: 'ev-source-14-2', version: 52 }, sources, [])
		const text = requireValue(input.agent.splitSentences(earlier.text)[0])
		const packet = buildStudySentencePacket(earlier, later, 0, text, input.population, false)
		const changed = buildStudySentencePacket(
			{ ...earlier, version: 52 },
			later,
			0,
			text,
			input.population,
			false,
		)
		const arrival = buildStudySentencePacket(
			{ ...earlier, id: 'ev-source-copy', category: 'arrival', role: 'user' },
			later,
			0,
			text,
			input.population,
			false,
		)
		expect(changed.id).not.toBe(packet.id)
		expect(changed.rank).not.toBe(packet.rank)
		expect(arrival.id).not.toBe(packet.id)
		expect(packet.rank).toBe(
			createHash('sha256')
				.update(JSON.stringify(['d1-partition-v1', earlier.id, 4, later.id, 52, 0]))
				.digest('hex'),
		)
	})

	it('uses prior arrival positions and lookup releases strictly before the correction boundary', () => {
		const input = buildStudySentenceFixture()
		const sources = collectStudySentenceSources(input)
		const later = resolveStudySentenceSource({ id: 'ev-source-14-2', version: 52 }, sources, [])
		const earlier = collectStudySentenceEarlier(later, sources)
		expect(earlier.some((source) => source.id === 'ev-source-14-1')).toBe(true)
		expect(earlier.some((source) => source.id === 'ev-source-14-3')).toBe(false)
		expect(
			earlier.filter((source) => source.id === 'order:BC-7302').map((source) => source.version),
		).toEqual([4])
	})

	it('excludes complete Ivo/Mara crossings and the register before bounded drawing', () => {
		const manifest = buildStudySentenceManifest(buildStudySentenceFixture())
		const crossing = requireValue(
			manifest.excluded.find(
				(row) =>
					row.packet.earlier.id === 'ev-source-2-2' &&
					row.packet.later.id === 'ev-source-13-2' &&
					row.packet.sentence === 3,
			),
		)
		expect(crossing.reason).toBe('partition')
		expect(crossing.packet.text).toBe(
			'The carrier marks delivered at 14:08 yesterday under signature IM.',
		)
		expect(crossing.packet.cases).toEqual(['BC-7301', 'BC-7302'])
		expect(
			manifest.excluded.some(
				(row) => row.packet.earlier.id === 'ev-register' && row.reason === 'register',
			),
		).toBe(true)
		expect(manifest.packets.some((packet) => packet.earlier.id === 'ev-register')).toBe(false)
		expect(
			manifest.packets.every((packet) =>
				packet.cases.every(
					(id) =>
						requireValue(manifest.population.cases.find((entry) => entry.id === id)).partition ===
						packet.partition,
				),
			),
		).toBe(true)
	})

	it('refuses a missing required R source or declaration', () => {
		const input = buildStudySentenceFixture()
		expect(() =>
			buildStudySentenceManifest({
				...input,
				scenario: {
					...input.scenario,
					goals: input.scenario.goals.map((goal) => {
						if (
							goal.id !== 'ev-02-1' ||
							!('input' in goal) ||
							typeof goal.input !== 'object' ||
							goal.input === null
						)
							return goal
						return { ...goal, input: { ...goal.input, records: [] } }
					}),
				},
			}),
		).toThrow('Missing or incompatible source')
		expect(() =>
			buildStudySentenceManifest({
				...input,
				population: {
					...input.population,
					pairs: input.population.pairs.filter((pair) => !pair.required),
				},
			}),
		).toThrow('Missing required R pair declaration')
	})

	it('excludes the register independently of a mixed-partition exclusion', () => {
		const input = buildStudySentenceFixture()
		const manifest = buildStudySentenceManifest({
			...input,
			population: {
				...input.population,
				membership: { ...input.population.membership, 'ev-register': ['BC-7301'] },
				standing: input.population.standing.filter((id) => id !== 'ev-register'),
				aliases: input.population.aliases.filter((alias) => alias.source.id !== 'ev-register'),
			},
			scenario: {
				...input.scenario,
				goals: input.scenario.goals.map((goal) => {
					if (!isStudyMemoryInput(goal.input)) throw new Error('Invalid public input')
					const released: StudyMemoryInput = goal.input
					return {
						...goal,
						input: {
							...released,
							arrivals: released.arrivals.map((arrival) =>
								arrival.id === 'ev-register'
									? { ...arrival, content: 'Case BC-7301 has a register entry for batch 8.' }
									: arrival,
							),
						},
					}
				}),
			},
		})
		expect(
			manifest.excluded.some(
				(row) => row.reason === 'register' && row.packet.later.id === 'ev-source-13-2',
			),
		).toBe(true)
		expect(manifest.packets.some((packet) => packet.earlier.id === 'ev-register')).toBe(false)
	})

	it('rejects a token-ineligible authored target through the actual tokenizer', () => {
		const input = buildStudySentenceFixture()
		expect(
			sharesStudySentenceTokens('No numeric or identifier token.', 'Code MX-4471.', input.agent),
		).toBe(false)
		const control = requireValue(input.population.controls[0])
		expect(() =>
			buildStudySentenceManifest({
				...input,
				population: {
					...input.population,
					controls: [
						{ ...control, earlier: 'No numeric or identifier token.' },
						...input.population.controls.slice(1),
					],
				},
			}),
		).toThrow('Token-ineligible fictional target')
	})

	it('keeps original indices distinct in the published Ollama encoder', () => {
		const input = buildStudySentenceFixture()
		const control = requireValue(
			input.population.controls.find((entry) => entry.category === 'pronoun-context'),
		)
		const earlier = { role: 'user' as const, text: control.earlier }
		const later = { role: 'user' as const, text: control.later }
		const text = requireValue(input.agent.splitSentences(earlier.text)[1])
		expect(text).toBe(input.agent.splitSentences(earlier.text)[3])
		const judge = new OllamaJudge({
			model: 'mica',
			system: STUDY_MEMORY_JUDGE,
			url: 'http://127.0.0.1:1',
		})
		const first = judge.encode({
			state: renderStudySentenceState(earlier, later, 1, text),
			questions: { first: STUDY_SENTENCE_QUESTION },
		})
		const second = judge.encode({
			state: renderStudySentenceState(earlier, later, 3, text),
			questions: { second: STUDY_SENTENCE_QUESTION },
		})
		expect(first).not.toEqual(second)
		expect(first.prompt).toContain('Sentence index (zero-based): 1')
		expect(second.prompt).toContain('Sentence index (zero-based): 3')
		expect(first.prompt).toContain(STUDY_SENTENCE_QUESTION.instructions)
	})

	it('draws deterministically by ordinal ranks with distinct correction representatives and empty cells', () => {
		const manifest = buildStudySentenceManifest(buildStudySentenceFixture())
		const candidates = [
			...manifest.packets,
			...manifest.excluded.filter((row) => row.reason === 'draw').map((row) => row.packet),
		]
		const draw = drawStudySentencePackets(candidates)
		for (const packet of draw) {
			expect(packet.rank).toBe(
				createHash('sha256')
					.update(
						JSON.stringify([
							'd1-partition-v1',
							packet.earlier.id,
							packet.earlier.version,
							packet.later.id,
							packet.later.version,
							packet.sentence,
						]),
					)
					.digest('hex'),
			)
			expect(
				candidates.filter(
					(other) =>
						other.later.id === packet.later.id &&
						other.later.version === packet.later.version &&
						other.stratum === packet.stratum &&
						other.rank < packet.rank,
				),
			).toEqual([])
		}
		expect(draw.map((packet) => packet.rank)).toEqual(STUDY_SENTENCE_DRAW)
		expect(drawStudySentencePackets(candidates.toReversed())).toEqual(draw)
		expect(draw.length).toBeLessThanOrEqual(8)
		expect(new Set(draw.map((packet) => `${packet.later.id}:${packet.stratum}`)).size).toBe(
			draw.length,
		)
		for (const partition of ['fitting', 'validation']) {
			for (const stratum of ['standing', 'cross']) {
				const cell = draw.filter(
					(packet) => packet.partition === partition && packet.stratum === stratum,
				)
				expect(cell.length).toBeLessThanOrEqual(2)
			}
		}
		expect(drawStudySentencePackets([])).toEqual([])
		const ranked = candidates.toSorted(compareStudySentenceRank)
		expect(requireValue(ranked[0]).rank <= requireValue(ranked.at(-1)).rank).toBe(true)
	})

	it('retains balanced authored companions and refuses unaffordable unchanged populations', () => {
		const manifest = buildStudySentenceManifest(buildStudySentenceFixture())
		const fitting = new Set(
			manifest.packets
				.filter((packet) => packet.control !== undefined && packet.partition === 'fitting')
				.map((packet) => packet.earlier.text.match(/^\[Fictional case (FX-\d+)\]/u)?.[1]),
		)
		const validation = new Set(
			manifest.packets
				.filter((packet) => packet.control !== undefined && packet.partition === 'validation')
				.map((packet) => packet.earlier.text.match(/^\[Fictional case (FX-\d+)\]/u)?.[1]),
		)
		expect(fitting.size).toBe(6)
		expect(validation.size).toBe(6)
		expect([...fitting].every((id) => id !== undefined && !validation.has(id))).toBe(true)
		expect([...validation].every((id) => id !== undefined)).toBe(true)
		for (const partition of ['fitting', 'validation']) {
			expect(
				manifest.packets.filter(
					(packet) => packet.partition === partition && packet.control?.intent === true,
				),
			).toHaveLength(6)
			expect(
				manifest.packets.filter(
					(packet) => packet.partition === partition && packet.control?.intent === false,
				),
			).toHaveLength(6)
		}
		expect(forecastStudySentenceRequests(218)).toMatchObject({ requests: 226, refused: false })
		expect(forecastStudySentenceRequests(219)).toMatchObject({ requests: 227, refused: true })
		expect(forecastStudySentenceRequests(219).excess).toBeCloseTo(0.9575)
		expect(manifest.forecast).toEqual(forecastStudySentenceRequests(manifest.packets.length))
		expect(() => forecastStudySentenceRequests(-1)).toThrow('Invalid base count')
	})
})
