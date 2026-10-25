import type {
	StudySentenceAlias,
	StudySentenceBlind,
	StudySentenceControl,
	StudySentenceForecast,
	StudySentenceIdentity,
	StudySentenceInput,
	StudySentenceManifest,
	StudySentencePacket,
	StudySentencePartition,
	StudySentencePopulation,
	StudySentenceRuntime,
	StudySentenceSource,
	StudySentenceStratum,
	StudySentenceTarget,
	StudySentenceLabel,
	StudySentenceCell,
	StudySentenceSample,
	StudySentenceGoal,
	StudySentenceCategory,
	StudySentenceBinding,
	StudySentenceObservation,
	StudySentenceMatrix,
	StudySentenceSelection,
	StudySentenceTargetLabel,
	StudySentenceAssertion,
	StudySentenceDeclarations,
} from './types.js'
import type { StudyScenario, StudyProfile, StudyRubric } from '@orkestrel/study'
import type { StudyAdjudication, StudyOllamaPolicy } from '@orkestrel/study/server'
import type { JSONValue } from '@orkestrel/contract'
import { encodeStudyJSON, hashStudyBytes, valueToWire } from '@orkestrel/study/server'
import { parseStudyProfile, StudyError } from '@orkestrel/study'
import {
	STUDY_SENTENCE_BUDGET,
	STUDY_SENTENCE_CORRECTIONS,
	STUDY_SENTENCE_QUESTION,
	STUDY_SENTENCE_REQUIRED,
	STUDY_SENTENCE_VALIDATION,
	STUDY_SENTENCE_POLICY,
	STUDY_SENTENCE_GRID,
} from './constants.js'
import {
	isStudySentenceGoal,
	isStudySentenceObservation,
	isStudySentenceSelection,
	isStudySentenceMemory,
	isStudySentencePopulation,
	isStudySentenceRuntime,
} from './validators.js'

/** Mirrors the memory judge's exact role policy using the declared judge pin. @param profile - Selected runtime profile. @returns The real one-token judge policy. */
export function buildStudySentenceRole(profile: StudyProfile): StudyOllamaPolicy {
	const judge = profile.provider?.judge
	if (judge === undefined || profile.provider?.digest.judge === undefined)
		throw new StudyError('CONFIG', 'Sentence judge pin is required')
	return {
		model: judge,
		options: { num_ctx: profile.room.context, num_predict: 1, temperature: 1, seed: 0 },
		think: false,
		strict: false,
		length: true,
	}
}

/** Builds a public scenario from admitted sample identities. @param sample - Frozen sample without scores. @returns Label-free ordered goals. */
export function buildStudySentenceScenario(sample: StudySentenceSample): StudyScenario {
	return {
		id: 'd1',
		goals: sample.goals.map((input) => ({ id: input.observation, input: valueToWire(input) })),
	}
}

/** Builds complete rubric coverage with one independent calibration criterion. @param scenario - Public trajectory. @param assertion - Initial, fitting, or held-out criterion. @returns Grading coverage with no labels on other criteria. */
export function buildStudySentenceRubric(
	scenario: StudyScenario,
	assertion: StudySentenceAssertion,
): StudyRubric {
	return {
		version: 'd1-v1',
		criteria: scenario.goals.map((goal, index) => ({
			id: index === 0 ? 'calibration' : goal.id,
			scenario: scenario.id,
			goal: goal.id,
			method: 'state',
			critical: true,
			assertion: valueToWire(
				index === 0 ? assertion : { phase: 'initial', binding: assertion.binding, targets: [] },
			),
		})),
	}
}

/** Generates label-separated declarations and finite execution allowances. @param manifest - Admitted enumeration. @param labels - Frozen independent labels. @param binding - Exact source receipts before scenario generation. @param profile - Receipted daemon and package selections. @returns Public declarations and private grading declarations. */
export function buildStudySentenceDeclarations(
	manifest: StudySentenceManifest,
	labels: readonly StudySentenceLabel[],
	binding: Pick<StudySentenceBinding, 'manifest' | 'labels' | 'agent'>,
	profile: StudyProfile,
): StudySentenceDeclarations {
	const sample = sampleStudySentences(manifest, labels)
	const scenario = buildStudySentenceScenario(sample)
	const targets = sample.packets.map((packet) => ({
		id: packet.id,
		partition: packet.partition,
		label: labels.find((entry) => entry.id === packet.id)?.label === 'yes',
		control: packet.control?.intent ?? packet.constraint?.intent,
	}))
	const fitting = targets
		.filter((target) => target.partition === 'fitting')
		.map(({ partition: _partition, ...target }) => target)
	const validation = targets
		.filter((target) => target.partition === 'validation')
		.map(({ partition: _partition, ...target }) => target)
	const identity = {
		...binding,
		scenario: hashStudyBytes(encodeStudyJSON(scenario)),
		fitting: hashStudyBytes(encodeStudyJSON(fitting)),
		validation: hashStudyBytes(encodeStudyJSON(validation)),
	}
	const initial: StudySentenceAssertion = {
		phase: 'initial',
		binding: identity,
		targets: [],
		selection: undefined,
		digest: undefined,
		grading: undefined,
	}
	const settings = {
		binding: identity,
		inputs: Object.fromEntries(
			scenario.goals.map((goal) => [goal.id, hashStudyBytes(encodeStudyJSON(goal.input))]),
		),
		goals: scenario.goals.map((goal) => goal.id),
		version: '0.40.10',
		metadata: { calls: 16, bytes: 1048576, duration: 30000 },
	}
	return {
		scenario,
		initial: buildStudySentenceRubric(scenario, initial),
		fitting: buildStudySentenceRubric(scenario, { ...initial, phase: 'fitting', targets: fitting }),
		validation: buildStudySentenceRubric(scenario, {
			...initial,
			phase: 'validation',
			targets: validation,
		}),
		profile: parseStudyProfile({
			...profile,
			name: 'calibration',
			room: { context: 20480, output: 1, safety: 512, think: false },
			bounds: {
				request: { duration: 120000, calls: 1, tokens: 19968, bytes: 1048576 },
				goal: { duration: 180000, calls: 1, tokens: 19968, bytes: 4194304 },
				trial: { duration: 900000, calls: 226, tokens: 4512768, bytes: 1073741824 },
				series: { duration: 900000, calls: 226, tokens: 4512768, bytes: 1073741824 },
			},
			record: { bytes: 134217728, calls: 227, duration: 900000 },
			settings: valueToWire(settings),
			qualification: undefined,
		}),
	}
}

/** Reads the complete declared observation population and refuses partial or contradictory custody. @param input - Independently retained grading inputs. @param binding - Immutable scenario receipt. @returns Every validated score in declared order. */
export function collectStudySentenceObservations(
	input: StudyAdjudication,
	binding: StudySentenceBinding,
): readonly StudySentenceObservation[] {
	const scenario = input.manifest.scenarios[0]
	const attempt = input.attempts[0]
	if (
		input.manifest.scenarios.length !== 1 ||
		scenario === undefined ||
		hashStudyBytes(encodeStudyJSON(scenario)) !== binding.scenario
	)
		throw new StudyError('EVIDENCE', 'Sentence scenario identity changed')
	if (
		input.attempts.length !== 1 ||
		attempt === undefined ||
		!attempt.executed ||
		attempt.failure !== undefined ||
		attempt.observations.length !== scenario.goals.length
	)
		throw new StudyError('EVIDENCE', 'Sentence observation population is incomplete')
	if (
		new Set(attempt.observations.map((observation) => observation.goal)).size !==
		scenario.goals.length
	)
		throw new StudyError('EVIDENCE', 'Sentence observation identity is duplicated')
	return scenario.goals.map((goal) => {
		const observation = attempt.observations.find((entry) => entry.goal === goal.id)
		const product = observation?.product
		if (
			!isStudySentenceGoal(goal.input) ||
			observation === undefined ||
			!observation.executed ||
			observation.failure !== undefined ||
			product === undefined ||
			product.partial ||
			!isStudySentenceObservation(product.value)
		)
			throw new StudyError('EVIDENCE', 'Sentence observation is invalid or refused')
		const score = product.value
		if (
			score.id !== goal.input.id ||
			score.observation !== goal.id ||
			goal.input.observation !== goal.id ||
			score.digest !== hashStudyBytes(encodeStudyJSON(goal.input)) ||
			score.binding !== hashStudyBytes(encodeStudyJSON(binding))
		)
			throw new StudyError('EVIDENCE', 'Sentence packet or observation identity changed')
		const evidence = input.evidence[attempt.trial.id]?.filter(
			(row) => row.event === 'sentence' && row.goal === goal.id,
		)
		if (
			evidence?.length !== 1 ||
			hashStudyBytes(encodeStudyJSON(evidence[0]?.value)) !== hashStudyBytes(encodeStudyJSON(score))
		)
			throw new StudyError('EVIDENCE', 'Sentence observation evidence is missing or duplicated')
		return score
	})
}

/** Joins one partition to complete base and noise readings. @param targets - Independent partition labels. @param goals - Public identities. @param observations - Validated readings. @returns Partition readings without inspecting other score magnitudes. */
export function selectStudySentenceObservations(
	targets: readonly StudySentenceTargetLabel[],
	goals: readonly StudySentenceGoal[],
	observations: readonly StudySentenceObservation[],
): readonly StudySentenceObservation[] {
	if (
		new Set(targets.map((target) => target.id)).size !== targets.length ||
		targets.filter((target) => target.label).length < 8 ||
		targets.filter((target) => !target.label).length < 30
	)
		throw new StudyError('EVIDENCE', 'Sentence grading partition is inadequate or duplicated')
	const selected = observations.filter((observation) =>
		targets.some((target) => target.id === observation.id),
	)
	if (
		targets.some(
			(target) =>
				goals.filter((goal) => goal.id === target.id && goal.kind === 'base').length !== 1,
		) ||
		selected.length !==
			goals.filter((goal) => targets.some((target) => target.id === goal.id)).length
	)
		throw new StudyError('EVIDENCE', 'Sentence partition identity is incomplete')
	return selected
}

/** Measures within-partition repeat and sham uncertainty. @param goals - Public request identities. @param observations - Only this partition's readings. @returns Twice the greatest absolute paired difference, refusing absent noise samples. */
export function computeStudySentenceNoise(
	goals: readonly StudySentenceGoal[],
	observations: readonly StudySentenceObservation[],
): number {
	const samples = observations.filter((observation) =>
		goals.some((goal) => goal.observation === observation.observation && goal.kind !== 'base'),
	)
	if (
		(['repeat', 'sham'] as const).some(
			(category) =>
				!samples.some((sample) =>
					goals.some((goal) => goal.observation === sample.observation && goal.kind === category),
				),
		)
	)
		throw new StudyError('EVIDENCE', 'Sentence repeat and sham samples must be nonempty')
	const noise =
		2 *
		Math.max(
			...samples.map((sample) => {
				const base = observations.find(
					(observation) =>
						observation.id === sample.id &&
						goals.some(
							(goal) => goal.observation === observation.observation && goal.kind === 'base',
						),
				)
				if (base === undefined)
					throw new StudyError('EVIDENCE', 'Sentence noise sample lacks its base')
				return Math.abs(sample.score - base.score)
			}),
		)
	if (noise > STUDY_SENTENCE_POLICY.noise)
		throw new StudyError('EVIDENCE', 'Sentence noise exceeds 0.05')
	return noise
}

/** Computes finite-set precision, recall, and margins at an exact cutoff. @param targets - Partition labels. @param bases - Validated base scores. @param cutoff - Inclusive decision threshold. @returns The complete confusion matrix. */
export function computeStudySentenceMatrix(
	targets: readonly StudySentenceTargetLabel[],
	bases: readonly StudySentenceObservation[],
	cutoff: number,
): StudySentenceMatrix {
	const readings = targets.map((target) => {
		const observation = bases.find((entry) => entry.id === target.id)
		if (observation === undefined)
			throw new StudyError('EVIDENCE', 'Sentence base reading is missing')
		return {
			label: target.label,
			positive: observation.score >= cutoff,
			margin: Math.abs(observation.score - cutoff),
		}
	})
	const tp = readings.filter((row) => row.label && row.positive).length
	const fp = readings.filter((row) => !row.label && row.positive).length
	const tn = readings.filter((row) => !row.label && !row.positive).length
	const fn = readings.filter((row) => row.label && !row.positive).length
	return {
		cutoff,
		tp,
		fp,
		tn,
		fn,
		precision: tp + fp === 0 ? 0 : tp / (tp + fp),
		recall: tp + fn === 0 ? 0 : tp / (tp + fn),
		margin: Math.min(...readings.map((row) => row.margin)),
	}
}

/** Tests the finite-set precision and recall floors without a universal error limit. @param matrix - Candidate confusion matrix. @returns True if nonempty predictions and both floors pass; false otherwise. */
export function qualifiesStudySentenceMatrix(matrix: StudySentenceMatrix): boolean {
	return (
		matrix.tp + matrix.fp > 0 &&
		matrix.fp <= Math.floor(matrix.tp / 9) &&
		matrix.tp * 2 >= matrix.tp + matrix.fn
	)
}

/** Selects the smallest qualifying fitting cutoff without held-out labels or readings. @param binding - Immutable input receipts. @param targets - Fitting labels only. @param goals - Fitting public identities only. @param observations - Fitting scores only. @returns A frozen selection for later independent validation. */
export function selectStudySentenceCutoff(
	binding: StudySentenceBinding,
	targets: readonly StudySentenceTargetLabel[],
	goals: readonly StudySentenceGoal[],
	observations: readonly StudySentenceObservation[],
): StudySentenceSelection {
	if (hashStudyBytes(encodeStudyJSON(targets)) !== binding.fitting)
		throw new StudyError('EVIDENCE', 'Sentence fitting label identity changed')
	const selected = selectStudySentenceObservations(targets, goals, observations)
	if (
		selected.length !== observations.length ||
		goals.some((goal) => !targets.some((target) => target.id === goal.id))
	)
		throw new StudyError('EVIDENCE', 'Fitting inputs contain a foreign partition')
	const noise = computeStudySentenceNoise(goals, selected)
	const bases = selected.filter((observation) =>
		goals.some((goal) => goal.observation === observation.observation && goal.kind === 'base'),
	)
	const candidate = STUDY_SENTENCE_GRID.map((cutoff) => ({
		cutoff,
		matrices: [cutoff, cutoff - noise, cutoff + noise].map((threshold) =>
			computeStudySentenceMatrix(targets, bases, threshold),
		),
	})).find((entry) => entry.matrices.every(qualifiesStudySentenceMatrix))
	if (candidate === undefined)
		throw new StudyError('EVIDENCE', 'Sentence fitting has no qualifying cutoff')
	return Object.freeze({
		binding: Object.freeze({ ...binding }),
		cutoff: candidate.cutoff,
		noise,
		matrices: Object.freeze(candidate.matrices.map((matrix) => Object.freeze(matrix))),
		observations: hashStudyBytes(encodeStudyJSON(selected)),
		targets: Object.freeze(targets.map((target) => Object.freeze({ ...target }))),
		policy: hashStudyBytes(encodeStudyJSON(STUDY_SENTENCE_POLICY)),
	})
}

/** Refuses decision crossings and hard-control failures on every reading. @param targets - Partition labels and explicit hard controls. @param goals - Public request identities. @param observations - Partition readings. @param cutoff - Frozen fitting cutoff. @returns Nothing if every reading retains its base decision and control intent. */
export function validateStudySentenceDecisions(
	targets: readonly StudySentenceTargetLabel[],
	goals: readonly StudySentenceGoal[],
	observations: readonly StudySentenceObservation[],
	cutoff: number,
): void {
	for (const observation of observations) {
		const target = targets.find((entry) => entry.id === observation.id)
		const base = observations.find(
			(entry) =>
				entry.id === observation.id &&
				goals.some((goal) => goal.observation === entry.observation && goal.kind === 'base'),
		)
		if (target === undefined || base === undefined)
			throw new StudyError('EVIDENCE', 'Sentence decision identity is incomplete')
		if (observation.score >= cutoff !== base.score >= cutoff)
			throw new StudyError('EVIDENCE', 'Sentence repeat or sham crosses the frozen decision')
		if (target.control !== undefined && observation.score >= cutoff !== target.control)
			throw new StudyError('EVIDENCE', 'Sentence hard control failed')
	}
}

/** Verifies a copied fitting selection before reading held-out magnitudes. @param selection - Copied fitting carrier. @param digest - Immutable carrier receipt. @param binding - Expected input identities. @param goals - Full public identities. @param observations - Complete valid observations. @returns Nothing if recomputed fitting policy and identity agree exactly. */
export function validateStudySentenceSelection(
	selection: StudySentenceSelection,
	digest: string,
	binding: StudySentenceBinding,
	goals: readonly StudySentenceGoal[],
	observations: readonly StudySentenceObservation[],
): void {
	if (
		!isStudySentenceSelection(selection) ||
		hashStudyBytes(encodeStudyJSON(selection)) !== digest ||
		hashStudyBytes(encodeStudyJSON(selection.binding)) !== hashStudyBytes(encodeStudyJSON(binding))
	)
		throw new StudyError('EVIDENCE', 'Sentence frozen selection digest or input identity changed')
	const fitting = selectStudySentenceObservations(selection.targets, goals, observations)
	const expected = selectStudySentenceCutoff(
		binding,
		selection.targets,
		goals.filter((goal) => selection.targets.some((target) => target.id === goal.id)),
		fitting,
	)
	if (hashStudyBytes(encodeStudyJSON(expected)) !== digest)
		throw new StudyError('EVIDENCE', 'Sentence frozen fitting cutoff or policy changed')
	validateStudySentenceDecisions(selection.targets, goals, fitting, selection.cutoff)
}

/** Grades one independent partition after validating the full observation population. @param assertion - Rubric-owned labels and copied selection. @param input - Sealed execution custody. @returns Machine-readable fitting selection or held-out measurements. */
export function gradeStudySentencePartition(
	assertion: StudySentenceAssertion,
	input: StudyAdjudication,
): JSONValue {
	const observations = collectStudySentenceObservations(input, assertion.binding)
	const goals = input.manifest.scenarios.flatMap((scenario) =>
		scenario.goals.map((goal) => {
			if (!isStudySentenceGoal(goal.input))
				throw new StudyError('EVIDENCE', 'Sentence public goal is malformed')
			return goal.input
		}),
	)
	if (assertion.phase === 'initial') {
		if (
			assertion.targets.length !== 0 ||
			assertion.selection !== undefined ||
			assertion.digest !== undefined ||
			assertion.grading !== undefined
		)
			throw new StudyError('EVIDENCE', 'Initial sentence grading must contain no labels')
		return {
			explanation: 'Every declared observation completed with valid attributable evidence',
			observations: observations.length,
		}
	}
	if (assertion.phase === 'fitting') {
		if (
			assertion.selection !== undefined ||
			assertion.digest !== undefined ||
			assertion.grading !== undefined
		)
			throw new StudyError('EVIDENCE', 'Fitting cannot consume a prior selection')
		const fitting = selectStudySentenceObservations(assertion.targets, goals, observations)
		const selection = selectStudySentenceCutoff(
			assertion.binding,
			assertion.targets,
			goals.filter((goal) => assertion.targets.some((target) => target.id === goal.id)),
			fitting,
		)
		validateStudySentenceDecisions(assertion.targets, goals, fitting, selection.cutoff)
		return valueToWire({
			explanation: 'Smallest fitting cutoff passes the fixed grid and noise floors',
			selection,
		})
	}
	const selection = assertion.selection
	if (selection === undefined || assertion.digest === undefined || assertion.grading === undefined)
		throw new StudyError('EVIDENCE', 'Validation requires the frozen fitting selection')
	validateStudySentenceSelection(
		selection,
		assertion.digest,
		assertion.binding,
		goals,
		observations,
	)
	if (hashStudyBytes(encodeStudyJSON(assertion.targets)) !== assertion.binding.validation)
		throw new StudyError('EVIDENCE', 'Sentence validation label identity changed')
	if (
		assertion.targets.some((target) =>
			selection.targets.some((fitting) => fitting.id === target.id),
		) ||
		goals.some(
			(goal) =>
				![...assertion.targets, ...selection.targets].some((target) => target.id === goal.id),
		)
	)
		throw new StudyError(
			'EVIDENCE',
			'Sentence fitting and validation partitions overlap or omit a target',
		)
	const validation = selectStudySentenceObservations(assertion.targets, goals, observations)
	const noise = computeStudySentenceNoise(goals, validation)
	const bases = validation.filter((observation) =>
		goals.some((goal) => goal.observation === observation.observation && goal.kind === 'base'),
	)
	const matrices = [selection.cutoff, selection.cutoff - noise, selection.cutoff + noise].map(
		(cutoff) => computeStudySentenceMatrix(assertion.targets, bases, cutoff),
	)
	if (!matrices.every(qualifiesStudySentenceMatrix))
		throw new StudyError('EVIDENCE', 'Sentence validation floors failed')
	validateStudySentenceDecisions(assertion.targets, goals, validation, selection.cutoff)
	return valueToWire({
		explanation: 'Frozen cutoff passes held-out floors and every hard control',
		cutoff: selection.cutoff,
		noise,
		matrices,
		selection: assertion.digest,
	})
}

/** Ranks a noise candidate using the frozen canonical tuple. @param packet - Canonical base packet. @param category - Independent sample category. @returns Domain-separated SHA-256 rank. */
export function rankStudySentenceSample(
	packet: StudySentencePacket,
	category: 'repeat' | 'sham',
): string {
	return hashStudyBytes(
		JSON.stringify([
			category === 'repeat' ? 'd1-repeat-v1' : 'd1-sham-v1',
			packet.earlier.id,
			packet.earlier.version,
			packet.later.id,
			packet.later.version,
			packet.sentence,
		]),
	)
}

/** Builds a label-free request with an independent observation identity. @param packet - Canonical base packet. @param category - Observation category. @returns Public input containing no control intent. */
export function buildStudySentenceGoal(
	packet: StudySentencePacket,
	category: StudySentenceCategory,
): StudySentenceGoal {
	const observation = hashStudyBytes(JSON.stringify(['d1-observation-v1', category, packet.id]))
	return {
		id: packet.id,
		observation,
		kind: category,
		state: packet.state + (category === 'sham' ? ' ' : ''),
		key: category === 'base' ? packet.key : JSON.stringify([packet.key, observation]),
		digests: [packet.earlier.digest, packet.later.digest],
	}
}

/** Reduces noise cells in the frozen tie order until the forecast fits. @param base - Mandatory base count. @param cells - Starting cells in tie order. @returns Reduced counts, refusing an unaffordable minimum. */
export function reduceStudySentenceCells(
	base: number,
	cells: readonly StudySentenceCell[],
): readonly StudySentenceCell[] {
	if (
		(base + STUDY_SENTENCE_BUDGET.repeats) * STUDY_SENTENCE_BUDGET.seconds >
		STUDY_SENTENCE_BUDGET.limit
	)
		throw new StudyError('CONFIG', 'Sentence mandatory population exceeds the forecast allowance')
	return Array.from({ length: cells.reduce((sum, cell) => sum + cell.count, 0) }).reduce<
		readonly StudySentenceCell[]
	>((current) => {
		if (
			(base + current.reduce((sum, cell) => sum + cell.count, 0)) * STUDY_SENTENCE_BUDGET.seconds <=
			STUDY_SENTENCE_BUDGET.limit
		)
			return current
		const selected = current
			.filter((cell) => cell.count > 1)
			.toSorted((left, right) => right.count - left.count)[0]
		if (selected === undefined)
			throw new StudyError('CONFIG', 'Sentence minimum sample exceeds the forecast allowance')
		return current.map((cell) => (cell === selected ? { ...cell, count: cell.count - 1 } : cell))
	}, cells)
}

/** Admits deterministic repeat and sham samples from frozen blind labels. @param manifest - Complete A1 enumeration. @param labels - Frozen labels without scores. @returns Independent sample counts, public goals, and forecast. */
export function sampleStudySentences(
	manifest: StudySentenceManifest,
	labels: readonly StudySentenceLabel[],
): StudySentenceSample {
	if (
		new Set(labels.map((entry) => entry.id)).size !== labels.length ||
		labels.length !== manifest.packets.length ||
		labels.some((entry) => !manifest.packets.some((packet) => packet.id === entry.id))
	)
		throw new StudyError('CONFIG', 'Sentence labels do not cover the exact base population')
	const indexed = new Map(labels.map((entry) => [entry.id, entry.label]))
	if (manifest.packets.some((packet) => packet.required && indexed.get(packet.id) === 'unresolved'))
		throw new StudyError('CONFIG', 'Sentence required target remains unresolved')
	const packets = manifest.packets.filter((packet) => indexed.get(packet.id) !== 'unresolved')
	const initial = (['fitting', 'validation'] as const).flatMap((partition) =>
		(['repeat', 'sham'] as const).flatMap((category) =>
			(['no', 'yes'] as const).map((label): StudySentenceCell => {
				const candidates = packets.filter(
					(packet) => packet.partition === partition && indexed.get(packet.id) === label,
				)
				if (candidates.length < (label === 'yes' ? 8 : 30))
					throw new StudyError(
						'CONFIG',
						`Sentence partition lacks adequate ${partition} ${label} targets`,
					)
				return {
					partition,
					category,
					label,
					packets: candidates.toSorted((left, right) =>
						rankStudySentenceSample(left, category) < rankStudySentenceSample(right, category)
							? -1
							: rankStudySentenceSample(left, category) > rankStudySentenceSample(right, category)
								? 1
								: 0,
					),
					count: Math.max(1, Math.ceil(candidates.length / (category === 'repeat' ? 4 : 8))),
				}
			}),
		),
	)
	const cells = reduceStudySentenceCells(packets.length, initial)
	const goals = [
		...packets.map((packet) => buildStudySentenceGoal(packet, 'base')),
		...cells.flatMap((cell) =>
			cell.packets
				.slice(0, cell.count)
				.map((packet) => buildStudySentenceGoal(packet, cell.category)),
		),
	]
	return {
		packets,
		excluded: labels.filter((entry) => entry.label === 'unresolved').map((entry) => entry.id),
		initial,
		cells,
		goals,
		requests: goals.length,
		seconds: goals.length * STUDY_SENTENCE_BUDGET.seconds,
	}
}

/** Compares exact released sentence targets. @param left - Declared target. @param right - Candidate target. @returns Whether every identity component matches. */
export function matchesStudySentenceTarget(
	left: StudySentenceTarget,
	right: StudySentenceTarget,
): boolean {
	return (
		left.earlier.id === right.earlier.id &&
		left.earlier.version === right.earlier.version &&
		left.later.id === right.later.id &&
		left.later.version === right.later.version &&
		left.sentence === right.sentence
	)
}

/** Compares ordinal hexadecimal ranks without host collation. @param left - First ranked packet. @param right - Second ranked packet. @returns Ordinal comparison. */
export function compareStudySentenceRank(
	left: StudySentencePacket,
	right: StudySentencePacket,
): number {
	return left.rank < right.rank ? -1 : left.rank > right.rank ? 1 : 0
}

/** Renders the frozen index-bearing request state. @param earlier - Complete earlier source. @param later - Complete later source. @param sentence - Original zero-based index. @param text - Exact split sentence. @returns Frozen proposal state bytes. */
export function renderStudySentenceState(
	earlier: Pick<StudySentenceSource, 'role' | 'text'>,
	later: Pick<StudySentenceSource, 'role' | 'text'>,
	sentence: number,
	text: string,
): string {
	return `Earlier message: ${earlier.role}: ${earlier.text}\nLater message: ${later.role}: ${later.text}\nSentence index (zero-based): ${sentence}\nSentence of the earlier message: ${text}`
}

/** Derives complete-text membership, refusing undeclared case-bearing sources. @param id - Canonical source id. @param text - Complete rendered text. @param population - Explicit public register and membership. @returns All continuing cases in ordinal order. */
export function collectStudySentenceCases(
	id: string,
	text: string,
	population: StudySentencePopulation,
): readonly string[] {
	const declared = population.membership[id]
	if (declared === undefined) throw new StudyError('CONFIG', `Unassigned source identity: ${id}`)
	const unknown = [...text.matchAll(/\bbc-\d{4}\b/giu)]
		.map((match) => match[0].toUpperCase())
		.filter(
			(token) => !population.cases.some((entry) => entry.id === token || entry.account === token),
		)
	if (unknown.length > 0)
		throw new StudyError('CONFIG', `Unassigned case identity: ${unknown.join(', ')}`)
	const matched = population.cases
		.filter((entry) =>
			[entry.id, entry.account, ...entry.names].some((name) =>
				new RegExp(`(?<![a-z])${name}(?![a-z])`, 'iu').test(text),
			),
		)
		.map((entry) => entry.id)
	const cases = [...new Set([...declared, ...matched])].toSorted()
	if (cases.some((entry) => !population.cases.some((known) => known.id === entry)))
		throw new StudyError('CONFIG', `Unassigned declared case: ${id}`)
	if (cases.length === 0 && !population.neutral.includes(id))
		throw new StudyError('CONFIG', `Undeclared neutral source: ${id}`)
	if (cases.length > 0 && population.neutral.includes(id))
		throw new StudyError('CONFIG', `Case-bearing neutral source: ${id}`)
	return cases
}

/** Resolves one exact canonical source/version, including verified UUID aliases. @param identity - Requested source or alias. @param sources - Canonical sources. @param aliases - Recorded alias declarations. @returns Exact canonical source, or throws on ambiguity or byte mismatch. */
export function resolveStudySentenceSource(
	identity: StudySentenceIdentity,
	sources: readonly StudySentenceSource[],
	aliases: readonly StudySentenceAlias[],
): StudySentenceSource {
	const alias = aliases.find((entry) => entry.id === identity.id)
	if (alias !== undefined && identity.version !== alias.source.version)
		throw new StudyError('CONFIG', `Incompatible alias version: ${alias.id}`)
	const target = alias?.source ?? identity
	const matches = sources.filter(
		(entry) => entry.id === target.id && entry.version === target.version,
	)
	const source = matches[0]
	if (matches.length !== 1 || source === undefined)
		throw new StudyError(
			'CONFIG',
			`Missing or incompatible source: ${target.id} v${target.version}`,
		)
	if (alias !== undefined && (alias.role !== source.role || alias.text !== source.text))
		throw new StudyError('CONFIG', `Incompatible alias rendering: ${alias.id}`)
	return source
}

/** Collects actual public arrival and lookup renderings with release identities. @param input - Complete named public inputs and admitted helpers. @returns Every canonical source/version. */
export function collectStudySentenceSources(
	input: StudySentenceInput,
): readonly StudySentenceSource[] {
	return input.scenario.goals.flatMap((goal, boundary) => {
		if (!isStudySentenceMemory(goal.input))
			throw new StudyError('CONFIG', `Invalid public scenario input: ${goal.id}`)
		return [
			...goal.input.arrivals.map((arrival, position): StudySentenceSource => {
				const text = `[Source ${arrival.id}] ${arrival.content}`
				return {
					id: arrival.id,
					version: boundary,
					boundary,
					position,
					category: 'arrival',
					role: 'user',
					text,
					cases: collectStudySentenceCases(arrival.id, text, input.population),
					digest: hashStudyBytes(text),
				}
			}),
			...goal.input.records.map((record): StudySentenceSource => {
				const text = `${record.id}: ${record.name}\n${record.content}`
				return {
					id: record.id,
					version: boundary,
					boundary,
					position: -1,
					category: 'lookup',
					role: 'tool',
					text,
					cases: collectStudySentenceCases(record.id, text, input.population),
					digest: hashStudyBytes(text),
				}
			}),
		]
	})
}

/** Selects arrivals preceding a correction and strictly prior last lookup releases. @param later - Correction boundary. @param sources - All released versions. @returns Chronologically eligible complete sources. */
export function collectStudySentenceEarlier(
	later: StudySentenceSource,
	sources: readonly StudySentenceSource[],
): readonly StudySentenceSource[] {
	return sources.filter((source) =>
		source.category === 'arrival'
			? source.boundary < later.boundary ||
				(source.boundary === later.boundary && source.position < later.position)
			: source.category === 'lookup' &&
				source.boundary < later.boundary &&
				!sources.some(
					(other) =>
						other.category === 'lookup' &&
						other.id === source.id &&
						other.boundary < later.boundary &&
						other.boundary > source.boundary,
				),
	)
}

/** Checks the real id/number sentence gate against the complete later text. @param text - Exact earlier sentence. @param later - Complete later message. @param agent - Admitted actual lexical helpers. @returns True if ids or numbers overlap; false otherwise. */
export function sharesStudySentenceTokens(
	text: string,
	later: string,
	agent: StudySentenceRuntime,
): boolean {
	const own = agent.extractTokens(text)
	const other = agent.extractTokens(later)
	return (
		[...own.ids].some((token) => other.ids.has(token)) ||
		[...own.numbers].some((token) => other.numbers.has(token))
	)
}

/** Assembles one sentence observation retaining both canonical versions. @param earlier - Complete earlier source. @param later - Complete correction. @param sentence - Original sentence index. @param text - Exact sentence bytes. @param population - Partition and standing declarations. @param required - If true, retains required R membership; if false, adds no required constraint. @param control - Authored fictional metadata, if applicable. @returns Canonical packet before eligibility and partition filtering. */
export function buildStudySentencePacket(
	earlier: StudySentenceSource,
	later: StudySentenceSource,
	sentence: number,
	text: string,
	population: StudySentencePopulation,
	required: boolean,
	control?: StudySentenceControl,
): StudySentencePacket {
	const cases = [...new Set([...earlier.cases, ...later.cases])].toSorted()
	const partition: StudySentencePartition =
		control?.partition ??
		(later.cases.some((entry) => STUDY_SENTENCE_VALIDATION.includes(entry))
			? 'validation'
			: 'fitting')
	const stratum: StudySentenceStratum =
		control !== undefined
			? 'control'
			: earlier.cases.some((entry) => later.cases.includes(entry))
				? 'same'
				: population.standing.includes(earlier.id)
					? 'standing'
					: 'cross'
	const tuple = [earlier.id, earlier.version, later.id, later.version, sentence]
	const constraint =
		control === undefined
			? required && earlier.category === 'arrival' && sentence === 0
				? { category: 'recorded-header', intent: false }
				: undefined
			: { category: control.category, intent: control.intent }
	return {
		id: hashStudyBytes(JSON.stringify(['d1-target-v1', ...tuple])),
		earlier,
		later,
		sentence,
		text,
		state: renderStudySentenceState(earlier, later, sentence, text),
		key: JSON.stringify(['changes', earlier.id, later.id, sentence]),
		rank: hashStudyBytes(JSON.stringify(['d1-partition-v1', ...tuple])),
		cases,
		partition,
		stratum,
		required,
		control,
		constraint,
	}
}

/** Retains two representatives per partition/stratum after one per correction/stratum. @param packets - Eligible partition-admitted candidates. @returns Deterministic bounded standing and cross-case draw. */
export function drawStudySentencePackets(
	packets: readonly StudySentencePacket[],
): readonly StudySentencePacket[] {
	const ranked = packets
		.filter((packet) => packet.stratum === 'standing' || packet.stratum === 'cross')
		.toSorted(compareStudySentenceRank)
	const representatives = ranked.filter(
		(packet, index) =>
			!ranked
				.slice(0, index)
				.some(
					(earlier) =>
						earlier.later.id === packet.later.id &&
						earlier.later.version === packet.later.version &&
						earlier.stratum === packet.stratum,
				),
	)
	return representatives.filter(
		(packet, index) =>
			representatives
				.slice(0, index)
				.filter(
					(earlier) => earlier.partition === packet.partition && earlier.stratum === packet.stratum,
				).length < 2,
	)
}

/** Projects only public evidence into an unlabeled packet. @param packet - Canonical manifest packet. @returns Blind text view without sampling or control metadata. */
export function projectStudySentenceBlind(packet: StudySentencePacket): StudySentenceBlind {
	return {
		id: packet.id,
		earlier: { role: packet.earlier.role, text: packet.earlier.text },
		later: { role: packet.later.role, text: packet.later.text },
		sentence: packet.sentence,
		target: packet.text,
	}
}

/** Forecasts the unconditional base plus minimum eight noise requests. @param base - Unchanged mandatory base count. @returns Forecast and pre-call refusal independently of label adequacy. */
export function forecastStudySentenceRequests(base: number): StudySentenceForecast {
	if (!Number.isSafeInteger(base) || base < 0) throw new StudyError('CONFIG', 'Invalid base count')
	const requests = base + STUDY_SENTENCE_BUDGET.repeats
	const seconds = requests * STUDY_SENTENCE_BUDGET.seconds
	return {
		base,
		added: STUDY_SENTENCE_BUDGET.repeats,
		requests,
		seconds,
		excess: Math.max(0, seconds - STUDY_SENTENCE_BUDGET.limit),
		refused: seconds > STUDY_SENTENCE_BUDGET.limit,
	}
}

/** Assembles fictional source identities without admitting their authored intent into blind texts. @param control - Public authored control. @returns Complete earlier/later fictional source pair. */
export function buildStudySentenceControlSources(
	control: StudySentenceControl,
): readonly [StudySentenceSource, StudySentenceSource] {
	return [
		{
			id: `${control.id}-earlier`,
			version: 0,
			boundary: 0,
			position: 0,
			category: 'fictional',
			role: 'user',
			text: control.earlier,
			cases: [],
			digest: hashStudyBytes(control.earlier),
		},
		{
			id: `${control.id}-later`,
			version: 0,
			boundary: 0,
			position: 1,
			category: 'fictional',
			role: 'user',
			text: control.later,
			cases: [],
			digest: hashStudyBytes(control.later),
		},
	]
}

/** Enumerates the complete accepted public population before labels or scores. @param input - Public scenario, frozen membership declarations, and admitted real Agent helpers. @returns Canonical manifest, blind packets, exclusions, and unconditional forecast; throws on unresolved identity. */
export function buildStudySentenceManifest(input: StudySentenceInput): StudySentenceManifest {
	if (!isStudySentencePopulation(input.population) || !isStudySentenceRuntime(input.agent))
		throw new StudyError('CONFIG', 'Invalid sentence population or runtime')
	const population = input.population
	if (
		population.cases.some(
			(entry) =>
				entry.partition !==
				(STUDY_SENTENCE_VALIDATION.includes(entry.id) ? 'validation' : 'fitting'),
		)
	)
		throw new StudyError('CONFIG', 'Changed partition policy')
	const sources = collectStudySentenceSources(input)
	if (
		sources.some((source, index) =>
			sources
				.slice(0, index)
				.some((earlier) => earlier.id === source.id && earlier.version === source.version),
		)
	)
		throw new StudyError('CONFIG', 'Duplicate canonical source/version')
	const aliases = population.aliases.map((alias) => ({
		id: alias.id,
		source: resolveStudySentenceSource(
			{ id: alias.id, version: alias.source.version },
			sources,
			population.aliases,
		),
		disposition: 'collapsed' as const,
	}))
	if (new Set(aliases.map((alias) => alias.id)).size !== aliases.length)
		throw new StudyError('CONFIG', 'Duplicate recorded alias')
	const corrections = STUDY_SENTENCE_CORRECTIONS.map((id) => {
		const source = sources.find((entry) => entry.id === id && entry.category === 'arrival')
		if (source === undefined || source.cases.length !== 1)
			throw new StudyError('CONFIG', `Missing or ambiguous correction: ${id}`)
		return source
	})
	if (
		!STUDY_SENTENCE_REQUIRED.every((target) =>
			population.pairs.some(
				(pair) =>
					pair.required &&
					matchesStudySentenceTarget(target, { ...pair, sentence: target.sentence }),
			),
		)
	)
		throw new StudyError('CONFIG', 'Missing required R pair declaration')
	const automatic = corrections.flatMap((later) =>
		collectStudySentenceEarlier(later, sources).flatMap((earlier) =>
			input.agent
				.splitSentences(earlier.text)
				.map((text, sentence) =>
					buildStudySentencePacket(earlier, later, sentence, text, population, false),
				),
		),
	)
	const supplemental = population.pairs.flatMap((pair) => {
		const earlier = resolveStudySentenceSource(pair.earlier, sources, population.aliases)
		const later = resolveStudySentenceSource(pair.later, sources, population.aliases)
		return input.agent
			.splitSentences(earlier.text)
			.map((text, sentence) =>
				buildStudySentencePacket(
					earlier,
					later,
					sentence,
					text,
					population,
					pair.required &&
						STUDY_SENTENCE_REQUIRED.some((target) =>
							matchesStudySentenceTarget(target, { earlier, later, sentence }),
						),
				),
			)
	})
	const combined = [...supplemental, ...automatic]
	const unique = combined.filter(
		(packet, index) => !combined.slice(0, index).some((earlier) => earlier.id === packet.id),
	)
	const eligible = unique.filter((packet) =>
		sharesStudySentenceTokens(packet.text, packet.later.text, input.agent),
	)
	const admitted = eligible.filter(
		(packet) =>
			packet.earlier.id !== 'ev-register' &&
			packet.cases.every(
				(entry) =>
					(STUDY_SENTENCE_VALIDATION.includes(entry) ? 'validation' : 'fitting') ===
					packet.partition,
			),
	)
	const drawn = drawStudySentencePackets(admitted)
	const controls = population.controls.map((control) => {
		if (!control.id.startsWith('fictional-'))
			throw new StudyError('CONFIG', 'Control identity is not fictional')
		const [earlier, later] = buildStudySentenceControlSources(control)
		const text = input.agent.splitSentences(earlier.text)[control.sentence]
		if (text === undefined || !sharesStudySentenceTokens(text, later.text, input.agent))
			throw new StudyError('CONFIG', `Token-ineligible fictional target: ${control.id}`)
		return buildStudySentencePacket(
			earlier,
			later,
			control.sentence,
			text,
			population,
			false,
			control,
		)
	})
	for (const partition of ['fitting', 'validation']) {
		for (const intent of [true, false]) {
			if (
				controls.filter(
					(packet) => packet.control?.intent === intent && packet.partition === partition,
				).length !== 6
			)
				throw new StudyError('CONFIG', 'Changed fictional control balance')
		}
	}
	const packets = [
		...admitted.filter((packet) => packet.stratum === 'same' || packet.required),
		...drawn.filter((packet) => !packet.required),
		...controls,
	].toSorted((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
	if (new Set(packets.map((packet) => packet.id)).size !== packets.length)
		throw new StudyError('CONFIG', 'Duplicate target identity')
	if (
		!STUDY_SENTENCE_REQUIRED.every((target) =>
			packets.some((packet) => packet.required && matchesStudySentenceTarget(target, packet)),
		)
	)
		throw new StudyError('CONFIG', 'Missing required R target')
	return {
		question: STUDY_SENTENCE_QUESTION,
		sources: [...sources, ...controls.flatMap((packet) => [packet.earlier, packet.later])],
		population,
		packets,
		blind: packets.map(projectStudySentenceBlind),
		aliases: aliases.map((alias) => ({
			id: alias.id,
			source: { id: alias.source.id, version: alias.source.version },
			disposition: alias.disposition,
		})),
		duplicates: combined
			.filter((packet, index) =>
				combined.slice(0, index).some((earlier) => earlier.id === packet.id),
			)
			.map((packet) => packet.id),
		excluded: unique
			.filter((packet) => !packets.some((selected) => selected.id === packet.id))
			.map((packet) => ({
				packet,
				reason: !sharesStudySentenceTokens(packet.text, packet.later.text, input.agent)
					? 'ineligible'
					: packet.earlier.id === 'ev-register'
						? 'register'
						: !admitted.some((candidate) => candidate.id === packet.id)
							? 'partition'
							: 'draw',
			})),
		forecast: forecastStudySentenceRequests(packets.length),
	}
}
