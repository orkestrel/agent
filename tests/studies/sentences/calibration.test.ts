import { describe, expect, it } from 'vitest'
import { requireValue } from '@orkestrel/test'
import { encodeStudyJSON, hashStudyBytes } from '@orkestrel/study/server'
import { OllamaJudge } from '@orkestrel/ollama'
import { parseStudyProfile } from '@orkestrel/study'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import {
	buildStudySentenceAdjudication,
	buildStudySentenceCalibration,
	buildStudySentenceNoiseVectors,
} from '../../setupStudy.js'
import { STUDY_MEMORY_JUDGE } from '../../../studies/memory/constants.js'
import { buildStudyMemoryRoles } from '../../../studies/memory/helpers.js'
import { isStudyMemoryInput } from '../../../studies/memory/validators.js'
import {
	STUDY_SENTENCE_JUDGE,
	STUDY_SENTENCE_QUESTION,
	STUDY_SENTENCE_GRID,
	buildStudySentenceGoal,
	buildStudySentenceRole,
	buildStudySentenceScenario,
	collectStudySentenceObservations,
	computeStudySentenceMatrix,
	computeStudySentenceNoise,
	gradeStudySentencePartition,
	isStudySentenceAssertion,
	isStudySentenceMemory,
	isStudySentenceGoal,
	isStudySentenceSettings,
	qualifiesStudySentenceMatrix,
	reduceStudySentenceCells,
	sampleStudySentences,
	selectStudySentenceCutoff,
	selectStudySentenceObservations,
	validateStudySentenceDecisions,
	validateStudySentenceSelection,
	StudySentenceAdapter,
} from '../../../studies/sentences/index.js'
import memoryScenario from '../../../studies/memory/scenarios/endurance.json'
import committedScenario from '../../../studies/sentences/scenarios/d1.json'

const fixture = buildStudySentenceCalibration()
const assertion: unknown = fixture.declarations.fitting.criteria[0]?.assertion
if (!isStudySentenceAssertion(assertion)) throw new Error('Synthetic fitting assertion is absent')
const observations = collectStudySentenceObservations(fixture.input, assertion.binding)
const fitting = selectStudySentenceObservations(
	assertion.targets,
	fixture.sample.goals,
	observations,
)
const goals = fixture.sample.goals.filter((goal) =>
	assertion.targets.some((target) => target.id === goal.id),
)
const selection = selectStudySentenceCutoff(assertion.binding, assertion.targets, goals, fitting)
const heldout: unknown = fixture.declarations.validation.criteria[0]?.assertion
if (!isStudySentenceAssertion(heldout)) throw new Error('Synthetic validation assertion is absent')
const validation = {
	...heldout,
	selection,
	digest: hashStudyBytes(encodeStudyJSON(selection)),
	grading: 'c'.repeat(64),
}

describe('source-contained calibration', () => {
	it('pins noise members to independent canonical SHA-256 tuples and reduction order', () => {
		const vectors = buildStudySentenceNoiseVectors()
		expect(fixture.sample.cells.map((cell) => cell.count)).toEqual([1, 1, 2, 2, 2, 2, 2, 2])
		expect(fixture.sample.cells.map((cell) => [cell.partition, cell.category, cell.label])).toEqual(
			vectors.map((cell) => [cell.partition, cell.category, cell.label]),
		)
		for (const [index, vector] of vectors.entries()) {
			const cell = requireValue(fixture.sample.cells[index])
			expect(cell.packets.slice(0, cell.count).map((packet) => packet.id)).toEqual(
				vector.expected.map((packet) => packet.id),
			)
			for (const expected of vector.expected) {
				expect(
					createHash('sha256').update(JSON.stringify(expected.tuple), 'utf8').digest('hex'),
				).toBe(expected.rank)
				const packet = requireValue(
					fixture.manifest.packets.find((entry) => entry.id === expected.id),
				)
				expect([
					vector.category === 'repeat' ? 'd1-repeat-v1' : 'd1-sham-v1',
					packet.earlier.id,
					packet.earlier.version,
					packet.later.id,
					packet.later.version,
					packet.sentence,
				]).toEqual(expected.tuple)
			}
		}
	})

	it('mirrors the public memory contract and judge bytes without sibling source imports', () => {
		expect(STUDY_SENTENCE_JUDGE).toBe(STUDY_MEMORY_JUDGE)
		expect(buildStudySentenceRole(fixture.declarations.profile)).toEqual(
			buildStudyMemoryRoles(fixture.declarations.profile, 'records').judge,
		)
		for (const goal of memoryScenario.goals)
			expect(isStudySentenceMemory(goal.input)).toBe(isStudyMemoryInput(goal.input))
		for (const control of [
			null,
			{},
			{ prompt: '', arrivals: [], records: [] },
			{ prompt: 'public', arrivals: [{ id: '', content: '' }], records: [] },
		])
			expect(isStudySentenceMemory(control)).toBe(false)
		for (const file of [
			'types.ts',
			'constants.ts',
			'helpers.ts',
			'validators.ts',
			'factories.ts',
			'StudySentenceAdapter.ts',
			'StudySentenceDriver.ts',
			'StudySentenceSession.ts',
			'index.ts',
		])
			expect(readFileSync(`studies/sentences/${file}`, 'utf8')).not.toMatch(
				/(?:from\s*|import\s*\()['"]\.\.\//u,
			)
	})

	it('admits deterministic ranked samples and refuses invalid, unresolved, and unaffordable populations', () => {
		expect(sampleStudySentences(fixture.manifest, [...fixture.labels].reverse())).toEqual(
			fixture.sample,
		)
		expect(fixture.sample.seconds).toBeLessThanOrEqual(810)
		expect(fixture.sample.cells.every((cell) => cell.count >= 1)).toBe(true)
		expect(() => reduceStudySentenceCells(220, fixture.sample.initial)).toThrow(
			'mandatory population',
		)
		expect(() => sampleStudySentences(fixture.manifest, [])).toThrow('exact base population')
		expect(() =>
			sampleStudySentences(
				fixture.manifest,
				fixture.labels.map((label) => ({ ...label, label: 'no' })),
			),
		).toThrow('adequate')
		const required = requireValue(fixture.manifest.packets.find((packet) => packet.required))
		expect(() =>
			sampleStudySentences(
				fixture.manifest,
				fixture.labels.map((label) =>
					label.id === required.id ? { ...label, label: 'unresolved' } : label,
				),
			),
		).toThrow('required target')
		const optional = requireValue(fixture.manifest.packets.find((packet) => !packet.required))
		expect(
			sampleStudySentences(
				fixture.manifest,
				fixture.labels.map((label) =>
					label.id === optional.id ? { ...label, label: 'unresolved' } : label,
				),
			).excluded,
		).toEqual([optional.id])
	})

	it('generates label-free goals with exact public base bytes and verifies the scenario receipt', () => {
		expect(buildStudySentenceScenario(fixture.sample)).toEqual(fixture.declarations.scenario)
		expect(committedScenario.goals.filter((goal) => goal.input.kind === 'base')).toEqual(
			fixture.declarations.scenario.goals.filter(
				(goal) => isStudySentenceGoal(goal.input) && goal.input.kind === 'base',
			),
		)
		for (const goal of fixture.sample.goals) {
			expect(Object.keys(goal).sort()).toEqual([
				'digests',
				'id',
				'key',
				'kind',
				'observation',
				'state',
			])
			expect(isStudySentenceGoal({ ...goal, control: true })).toBe(false)
		}
		const input = {
			definition: fixture.input.manifest.definition,
			scenarios: [fixture.declarations.scenario],
			rubric: fixture.declarations.initial,
			profile: fixture.declarations.profile,
		}
		expect(() => new StudySentenceAdapter().validate(input)).not.toThrow()
		const settings = fixture.declarations.profile.settings
		if (!isStudySentenceSettings(settings)) throw new Error('Synthetic settings are absent')
		const changed = {
			...fixture.declarations.scenario,
			goals: fixture.declarations.scenario.goals.map((goal) => ({
				...goal,
				input: {
					...requireValue(fixture.sample.goals.find((entry) => entry.observation === goal.id)),
					state: 'changed packet',
				},
			})),
		}
		const profile = parseStudyProfile({
			...fixture.declarations.profile,
			settings: {
				...settings,
				inputs: Object.fromEntries(
					changed.goals.map((goal) => [goal.id, hashStudyBytes(encodeStudyJSON(goal.input))]),
				),
			},
		})
		expect(() =>
			new StudySentenceAdapter().validate({ ...input, scenarios: [changed], profile }),
		).toThrow('scenario receipt')
		expect(() =>
			new StudySentenceAdapter().validate({
				...input,
				scenarios: [
					{ ...fixture.declarations.scenario, goals: fixture.declarations.scenario.goals.slice(1) },
				],
			}),
		).toThrow(/.+/u)
	})

	it('encodes repeats identically and inserts exactly one ASCII space at the sham state boundary', () => {
		const packet = requireValue(fixture.manifest.packets[0])
		const judge = new OllamaJudge({
			model: 'judge',
			system: STUDY_SENTENCE_JUDGE,
			url: 'http://127.0.0.1:1',
			options: buildStudySentenceRole(fixture.declarations.profile).options,
		})
		const base = buildStudySentenceGoal(packet, 'base')
		const repeat = buildStudySentenceGoal(packet, 'repeat')
		const sham = buildStudySentenceGoal(packet, 'sham')
		const encoded = judge.encode({
			state: base.state,
			questions: { [base.key]: STUDY_SENTENCE_QUESTION },
		})
		expect(
			judge.encode({ state: repeat.state, questions: { [repeat.key]: STUDY_SENTENCE_QUESTION } }),
		).toEqual(encoded)
		const other = judge.encode({
			state: sham.state,
			questions: { [sham.key]: STUDY_SENTENCE_QUESTION },
		})
		expect(other).toEqual({
			...encoded,
			prompt: encoded.prompt.replace('\n</state>', ' \n</state>'),
		})
		expect(
			Buffer.byteLength(JSON.stringify(other)) - Buffer.byteLength(JSON.stringify(encoded)),
		).toBe(1)
		expect(new Set([base.observation, repeat.observation, sham.observation]).size).toBe(3)
	})
})

describe('independent fitting and held-out grading', () => {
	it('isolates held-out accuracy failure while fitting, hard controls, decisions, and noise remain valid', () => {
		const negatives = new Set(
			validation.targets
				.filter((target) => !target.label && target.control === undefined)
				.map((target) => target.id),
		)
		expect(negatives.size).toBeGreaterThan(10)
		const failed = buildStudySentenceAdjudication(
			fixture,
			Object.fromEntries(
				fixture.sample.goals
					.filter((goal) => negatives.has(goal.id))
					.map((goal) => [goal.observation, 0.9]),
			),
		)
		const observed = collectStudySentenceObservations(failed, assertion.binding)
		const readings = selectStudySentenceObservations(
			validation.targets,
			fixture.sample.goals,
			observed,
		)
		expect(computeStudySentenceNoise(fixture.sample.goals, readings)).toBe(0)
		expect(() =>
			validateStudySentenceDecisions(
				validation.targets,
				fixture.sample.goals,
				readings,
				selection.cutoff,
			),
		).not.toThrow()
		expect(
			selectStudySentenceCutoff(
				assertion.binding,
				assertion.targets,
				goals,
				selectStudySentenceObservations(assertion.targets, fixture.sample.goals, observed),
			),
		).toEqual(selection)
		expect(() => gradeStudySentencePartition(validation, failed)).toThrow(
			'Sentence validation floors failed',
		)
	})

	it('binds each label partition and refuses a changed selection before held-out grading', () => {
		expect(() => gradeStudySentencePartition(validation, fixture.input)).not.toThrow()
		expect(() =>
			gradeStudySentencePartition({ ...validation, selection: undefined }, fixture.input),
		).toThrow('requires')
		expect(() =>
			gradeStudySentencePartition({ ...validation, digest: '0'.repeat(64) }, fixture.input),
		).toThrow('digest')
		expect(() =>
			gradeStudySentencePartition(
				{
					...assertion,
					targets: assertion.targets.map((target, index) =>
						index === 0 ? { ...target, label: !target.label } : target,
					),
				},
				fixture.input,
			),
		).toThrow('label identity')
		expect(() =>
			gradeStudySentencePartition(
				{
					...validation,
					targets: validation.targets.map((target, index) =>
						index === 0 ? { ...target, label: !target.label } : target,
					),
				},
				fixture.input,
			),
		).toThrow('label identity')
		const changed = {
			...selection,
			targets: selection.targets.map((target, index) =>
				index === 0 ? { ...target, label: !target.label } : target,
			),
		}
		expect(() =>
			gradeStudySentencePartition(
				{ ...validation, selection: changed, digest: hashStudyBytes(encodeStudyJSON(changed)) },
				fixture.input,
			),
		).toThrow('label identity')
	})

	it('applies the held-out floors and its own noise without refitting the selected cutoff', () => {
		const failed = buildStudySentenceAdjudication(
			fixture,
			Object.fromEntries(
				fixture.sample.goals
					.filter((goal) => validation.targets.some((target) => target.id === goal.id))
					.map((goal) => [goal.observation, 0.1]),
			),
		)
		expect(() => gradeStudySentencePartition(validation, failed)).toThrow('validation floors')
		const repeated = requireValue(
			fixture.sample.goals.find(
				(goal) =>
					goal.kind === 'repeat' && validation.targets.some((target) => target.id === goal.id),
			),
		)
		const baseline = requireValue(
			observations.find((observation) => observation.observation === repeated.observation),
		).score
		const changed = buildStudySentenceAdjudication(fixture, {
			[repeated.observation]: baseline + 0.02,
		})
		expect(gradeStudySentencePartition(validation, changed)).toMatchObject({
			cutoff: 0.55,
			noise: expect.closeTo(0.04, 8),
		})
		expect(() =>
			gradeStudySentencePartition(
				validation,
				buildStudySentenceAdjudication(fixture, { [repeated.observation]: baseline + 0.03 }),
			),
		).toThrow('noise exceeds')
	})

	it('rejects a cutoff whose uncertainty endpoints violate recall', () => {
		const repeat = requireValue(goals.find((goal) => goal.kind === 'repeat'))
		const bounded = fitting.map((observation) => ({
			...observation,
			score: assertion.targets.find((target) => target.id === observation.id)?.label ? 0.56 : 0.1,
		}))
		const value = requireValue(
			bounded.find((observation) => observation.observation === repeat.observation),
		)
		expect(() =>
			selectStudySentenceCutoff(
				assertion.binding,
				assertion.targets,
				goals,
				bounded.map((observation) =>
					observation.observation === repeat.observation
						? { ...observation, score: value.score + 0.02 }
						: observation,
				),
			),
		).toThrow('no qualifying cutoff')
	})

	it('selects the smallest fixed-grid cutoff and ignores held-out magnitudes', () => {
		expect(STUDY_SENTENCE_GRID).toEqual([0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95])
		expect(selection.cutoff).toBe(0.55)
		expect(selection.noise).toBe(0)
		const changed = buildStudySentenceAdjudication(
			fixture,
			Object.fromEntries(
				fixture.sample.goals
					.filter((goal) => !assertion.targets.some((target) => target.id === goal.id))
					.map((goal) => [goal.observation, 0.7]),
			),
		)
		expect(gradeStudySentencePartition(assertion, changed)).toEqual(
			gradeStudySentencePartition(assertion, fixture.input),
		)
		expect(() =>
			validateStudySentenceSelection(
				selection,
				hashStudyBytes(encodeStudyJSON(selection)),
				assertion.binding,
				fixture.sample.goals,
				observations,
			),
		).not.toThrow()
		for (const changedSelection of [
			{ ...selection, cutoff: 0.6 },
			{ ...selection, observations: '0'.repeat(64) },
			{ ...selection, policy: '0'.repeat(64) },
			{ ...selection, binding: { ...selection.binding, manifest: '0'.repeat(64) } },
		]) {
			expect(() =>
				validateStudySentenceSelection(
					changedSelection,
					hashStudyBytes(encodeStudyJSON(changedSelection)),
					assertion.binding,
					fixture.sample.goals,
					observations,
				),
			).toThrow(/.+/u)
		}
		expect(() =>
			validateStudySentenceSelection(
				selection,
				'0'.repeat(64),
				assertion.binding,
				fixture.sample.goals,
				observations,
			),
		).toThrow('digest')
	})

	it('uses inclusive decisions, finite-set FP floors, and refuses zero positives', () => {
		const targets = observations
			.slice(0, 27)
			.map((observation) => ({ id: observation.id, label: true, control: undefined }))
		const bases = observations.slice(0, 27).map((observation) => ({ ...observation, score: 0.55 }))
		const matrix = computeStudySentenceMatrix(targets, bases, 0.55)
		expect(matrix.tp).toBe(27)
		expect(qualifiesStudySentenceMatrix({ ...matrix, fp: 3 })).toBe(true)
		expect(qualifiesStudySentenceMatrix({ ...matrix, fp: 4 })).toBe(false)
		expect(qualifiesStudySentenceMatrix({ ...matrix, tp: 0, fp: 0, fn: 0 })).toBe(false)
		expect(qualifiesStudySentenceMatrix(computeStudySentenceMatrix(targets, bases, 0.6))).toBe(
			false,
		)
		expect(() =>
			selectStudySentenceCutoff(
				assertion.binding,
				assertion.targets,
				goals,
				fitting.map((observation) => ({ ...observation, score: 0.1 })),
			),
		).toThrow('no qualifying cutoff')
	})

	it('requires both noise samples and distinguishes the exact 0.05 boundary', () => {
		const sample = requireValue(goals.find((goal) => goal.kind === 'repeat'))
		const baseline = fitting.map((observation) => ({ ...observation, score: 0 }))
		expect(
			computeStudySentenceNoise(
				goals,
				baseline.map((observation) =>
					observation.observation === sample.observation
						? { ...observation, score: 0.025 }
						: observation,
				),
			),
		).toBe(0.05)
		expect(() =>
			computeStudySentenceNoise(
				goals,
				baseline.map((observation) =>
					observation.observation === sample.observation
						? { ...observation, score: 0.025001 }
						: observation,
				),
			),
		).toThrow('noise exceeds')
		expect(() =>
			computeStudySentenceNoise(
				goals.filter((goal) => goal.kind !== 'sham'),
				fitting.filter(
					(observation) =>
						!goals.some(
							(goal) => goal.observation === observation.observation && goal.kind === 'sham',
						),
				),
			),
		).toThrow('nonempty')
	})

	it('refuses decision crossings and checks hard controls on every reading', () => {
		const repeat = requireValue(goals.find((goal) => goal.kind === 'repeat'))
		const base = requireValue(fitting.find((observation) => observation.id === repeat.id))
		expect(() =>
			validateStudySentenceDecisions(
				assertion.targets,
				goals,
				fitting.map((observation) =>
					observation.observation === repeat.observation
						? { ...observation, score: base.score >= 0.55 ? 0.54 : 0.56 }
						: observation,
				),
				0.55,
			),
		).toThrow('crosses')
		const controlled = requireValue(
			assertion.targets.find((target) => target.control !== undefined),
		)
		expect(() =>
			validateStudySentenceDecisions(
				assertion.targets,
				goals,
				fitting.map((observation) =>
					observation.id === controlled.id
						? { ...observation, score: controlled.control ? 0.1 : 0.9 }
						: observation,
				),
				0.55,
			),
		).toThrow('hard control')
	})

	it('refuses invalid, partial, missing, duplicate, and altered observation custody', () => {
		const attempt = requireValue(fixture.input.attempts[0])
		const first = requireValue(attempt.observations[0])
		for (const invalid of [NaN, Infinity, -0.1, 1.1])
			expect(() =>
				collectStudySentenceObservations(
					buildStudySentenceAdjudication(fixture, { [first.goal]: invalid }),
					assertion.binding,
				),
			).toThrow('invalid')
		for (const changed of [
			{ ...attempt, observations: attempt.observations.slice(1) },
			{
				...attempt,
				observations: attempt.observations.map((observation, index) =>
					index === 1 ? first : observation,
				),
			},
			{
				...attempt,
				observations: attempt.observations.map((observation, index) =>
					index === 0 ? { ...observation, product: undefined } : observation,
				),
			},
			{
				...attempt,
				observations: attempt.observations.map((observation, index) =>
					index === 0
						? { ...observation, product: { ...requireValue(first.product), partial: true } }
						: observation,
				),
			},
		])
			expect(() =>
				collectStudySentenceObservations(
					{ ...fixture.input, attempts: [changed] },
					assertion.binding,
				),
			).toThrow(/.+/u)
		expect(() =>
			collectStudySentenceObservations({ ...fixture.input, evidence: {} }, assertion.binding),
		).toThrow('evidence')
		expect(() =>
			collectStudySentenceObservations(fixture.input, {
				...assertion.binding,
				manifest: '0'.repeat(64),
			}),
		).toThrow('identity')
	})
})
