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
} from './types.js'
import { hashStudyBytes } from '@orkestrel/study/server'
import { StudyError } from '@orkestrel/study'
import { isStudyMemoryInput } from '../memory/validators.js'
import {
	STUDY_SENTENCE_BUDGET,
	STUDY_SENTENCE_CORRECTIONS,
	STUDY_SENTENCE_QUESTION,
	STUDY_SENTENCE_REQUIRED,
	STUDY_SENTENCE_VALIDATION,
} from './constants.js'
import { isStudySentencePopulation, isStudySentenceRuntime } from './validators.js'

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
		if (!isStudyMemoryInput(goal.input))
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
			packets.some(
				(packet) =>
					packet.required &&
					matchesStudySentenceTarget(target, packet),
			),
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
