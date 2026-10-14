import type {
	EnduranceRuntime,
	EnduranceOracle,
	EnduranceCopy,
	EnduranceReading,
	EnduranceCensus,
} from './types.js'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { estimateTokens } from '../../vendor/agent-0.0.30-trimmed/index.js'
import { EnduranceError } from './errors.js'
import { isEnduranceRuntime, isEnduranceOracle } from './validators.js'

/** Reads and validates only an external runtime artifact.
 * @param path - External JSON path
 * @returns Validated external input
 * @throws EnduranceError when the schema or chronology is refused
 */
export function readRuntime(path: string): EnduranceRuntime {
	const value: unknown = JSON.parse(readFileSync(path, 'utf8'))
	if (!isEnduranceRuntime(value))
		throw new EnduranceError('runtime schema: unknown, nested private, or invalid field')
	const failures = inspectRuntime(value)
	if (failures.length > 0) throw new EnduranceError(failures.join('\n'))
	return value
}

/** Reads the separately held offline oracle.
 * @param path - Private JSON path
 * @returns Validated private records
 * @throws EnduranceError when the private schema is refused
 */
export function readOracle(path: string): EnduranceOracle {
	const value: unknown = JSON.parse(readFileSync(path, 'utf8'))
	if (!isEnduranceOracle(value)) throw new EnduranceError('oracle schema')
	return value
}

/** Projects validated external input to the existing Copy seam with every scoring array empty.
 * @param runtime - External input; private fields are refused even on structurally wider objects
 * @returns An owned runtime projection with no oracle references
 * @throws EnduranceError when input is invalid
 */
export function projectCopy(runtime: EnduranceRuntime): EnduranceCopy {
	if (!isEnduranceRuntime(runtime)) throw new EnduranceError('runtime schema before projection')
	const failures = inspectRuntime(runtime)
	if (failures.length > 0) throw new EnduranceError(failures.join('\n'))
	return {
		system: runtime.system,
		topics: runtime.topics.map((topic) => ({ ...topic, requested: true })),
		days: runtime.days.map((day) => ({ ...day })),
		seed: runtime.seed.map((message) => ({ role: message.role, content: message.content })),
		tables: {
			tools: Object.fromEntries(
				Object.entries(runtime.tools).map(([name, table]) => [name, { ...table }]),
			),
			lookups: runtime.lookups.map((lookup) => ({ ...lookup })),
		},
		goals: runtime.goals.map((goal) => ({
			id: goal.id,
			request: goal.request,
			after: goal.after,
			facts: [],
			stale: [],
			expected: [],
			expectedAny: [],
			forbidden: [],
			forbiddenPatterns: [],
		})),
	}
}

/** Finds chronology and scheduling failures independently of private truth.
 * @param runtime - Schema-valid external input
 * @returns Every found scheduling refusal
 */
export function inspectRuntime(runtime: EnduranceRuntime): readonly string[] {
	const failures: string[] = []
	const ids = new Set<string>()
	for (const [index, source] of runtime.seed.entries()) {
		if (ids.has(source.id)) failures.push(`duplicate source ${source.id}`)
		if (source.id.trim() === '') failures.push('empty source identity')
		ids.add(source.id)
		const previous = runtime.seed[index - 1]
		if (previous !== undefined && (source.shift < previous.shift || source.date < previous.date))
			failures.push(`shifted arrival ${source.id}`)
		if (!/^\d{4}-\d{2}-\d{2}$/.test(source.date) || source.content.trim() === '')
			failures.push(`invalid source ${source.id}`)
		if (source.shift > 0 && runtime.days[source.shift - 1]?.date !== source.date)
			failures.push(`source date ${source.id}`)
	}
	for (const [index, day] of runtime.days.entries()) {
		if (
			runtime.seed[day.from]?.shift !== index + 1 ||
			runtime.seed[day.from - 1]?.shift === index + 1
		)
			failures.push(`arrival boundary shift ${index + 1}`)
		if (index > 0 && day.from <= (runtime.days[index - 1]?.from ?? -1))
			failures.push(`day chronology ${index + 1}`)
	}
	const groups = new Map<number, number>()
	for (const [index, goal] of runtime.goals.entries()) {
		if (ids.has(goal.id)) failures.push(`duplicate goal ${goal.id}`)
		if (goal.id.trim() === '' || goal.request.trim() === '' || goal.shift === 0)
			failures.push(`empty goal ${goal.id}`)
		ids.add(goal.id)
		const boundary = runtime.seed[goal.after]
		if (boundary?.shift !== goal.shift || runtime.seed[goal.after + 1]?.shift === goal.shift)
			failures.push(`goal boundary ${goal.id}`)
		if (
			goal.after < (runtime.goals[index - 1]?.after ?? -1) ||
			goal.shift < (runtime.goals[index - 1]?.shift ?? 0)
		)
			failures.push(`goal chronology ${goal.id}`)
		groups.set(goal.shift, (groups.get(goal.shift) ?? 0) + 1)
	}
	if (groups.size !== runtime.days.length || [...groups.values()].some((count) => count !== 4))
		failures.push('incomplete shift product group')
	const versions = new Map<string, number>()
	for (const lookup of runtime.lookups) {
		const key = `${lookup.tool}:${lookup.id}`
		if (lookup.from <= (versions.get(key) ?? -1) || runtime.seed[lookup.from] === undefined)
			failures.push(`lookup chronology ${key}`)
		versions.set(key, lookup.from)
		if (!/^[A-Z]{2}-\d{4}$/.test(lookup.id) || lookup.text.trim() === '')
			failures.push(`lookup identity ${key}`)
	}
	if (runtime.seed.length === 0 || runtime.goals.length === 0 || runtime.topics.length === 0)
		failures.push('empty workload')
	if (
		runtime.system.trim() === '' ||
		runtime.topics.some((topic) => topic.name.trim() === '' || topic.criterion.trim() === '') ||
		new Set(runtime.topics.map((topic) => topic.name)).size !== runtime.topics.length
	)
		failures.push('invalid topics or system')
	return failures
}

/** Finds offline truth, dependency, evidence, and arithmetic contradictions.
 * @param runtime - External input
 * @param oracle - Separately parsed private truth
 * @returns Every found custody or truth refusal
 */
export function inspectOracle(
	runtime: EnduranceRuntime,
	oracle: EnduranceOracle,
): readonly string[] {
	const failures: string[] = []
	if (oracle.runtime !== runtime.id) failures.push('oracle custody')
	const sources = new Map(runtime.seed.map((source, index) => [source.id, index]))
	const goals = new Map(runtime.goals.map((goal, index) => [goal.id, { ...goal, index }]))
	const covered = new Set<string>()
	const atoms = new Set<string>()
	const versions = new Map<
		string,
		{ readonly version: number; readonly from: number; readonly until?: number }
	>()
	for (const fact of oracle.facts) {
		const prior = versions.get(fact.id)
		if (
			fact.version !== (prior?.version ?? 0) + 1 ||
			(prior !== undefined && (prior.until !== fact.from || prior.from >= fact.from))
		)
			failures.push(`fact version ${fact.id}`)
		if (
			fact.from >= runtime.seed.length ||
			(fact.until !== undefined && (fact.until <= fact.from || fact.until >= runtime.seed.length))
		)
			failures.push(`fact lifespan ${fact.id}`)
		if (
			fact.sources.length === 0 ||
			fact.sources.some((id) => !sources.has(id) || (sources.get(id) ?? Infinity) > fact.from)
		)
			failures.push(`fact provenance ${fact.id}`)
		versions.set(fact.id, fact)
	}
	const obligations = new Map<string, number>()
	const activations = new Map<string, number>()
	for (const obligation of oracle.obligations) {
		if (obligation.version !== (obligations.get(obligation.id) ?? 0) + 1)
			failures.push(`obligation version ${obligation.id}`)
		if (obligation.from <= (activations.get(obligation.id) ?? -1))
			failures.push(`obligation chronology ${obligation.id}`)
		obligations.set(obligation.id, obligation.version)
		activations.set(obligation.id, obligation.from)
		if (
			obligation.due < obligation.from ||
			obligation.from >= runtime.seed.length ||
			obligation.due >= runtime.seed.length
		)
			failures.push(`obligation boundary ${obligation.id}`)
		if (
			obligation.sources.length === 0 ||
			obligation.sources.some(
				(id) => !sources.has(id) || (sources.get(id) ?? Infinity) > obligation.from,
			)
		)
			failures.push(`obligation provenance ${obligation.id}`)
		if (
			obligation.prerequisites.some(
				(id) => !oracle.facts.some((fact) => fact.id === id && fact.from <= obligation.from),
			)
		)
			failures.push(`obligation prerequisite ${obligation.id}`)
		const end = obligation.closed ?? obligation.withdrawn
		if (
			end !== undefined &&
			(end < obligation.from ||
				end >= runtime.seed.length ||
				obligation.evidence.length === 0 ||
				obligation.evidence.some((id) => !sources.has(id) || (sources.get(id) ?? Infinity) > end))
		)
			failures.push(`unsupported closed obligation ${obligation.id}`)
		if (obligation.closed !== undefined && obligation.withdrawn !== undefined)
			failures.push(`conflicting obligation ending ${obligation.id}`)
	}
	if (
		oracle.goals.length !== runtime.goals.length ||
		new Set(oracle.goals.map((goal) => goal.goal)).size !== runtime.goals.length
	)
		failures.push('rubric coverage')
	for (const rubric of oracle.goals) {
		const goal = goals.get(rubric.goal)
		if (goal === undefined) {
			failures.push(`missing rubric goal ${rubric.goal}`)
			continue
		}
		if (rubric.atoms.length === 0 || rubric.critical.length === 0)
			failures.push(`empty rubric ${rubric.goal}`)
		for (const earlier of rubric.earlier)
			if ((goals.get(earlier)?.index ?? Infinity) >= goal.index)
				failures.push(`broken dependency ${rubric.goal}:${earlier}`)
		for (const atom of rubric.atoms) {
			if (atoms.has(atom.id)) failures.push(`duplicate atom ${atom.id}`)
			atoms.add(atom.id)
			if (
				atom.requirement.trim() === '' ||
				atom.sources.length === 0 ||
				atom.sources.some((id) => !sources.has(id) || (sources.get(id) ?? Infinity) > goal.after)
			)
				failures.push(`atom source ${atom.id}`)
			for (const source of atom.sources) covered.add(source)
		}
		for (const link of rubric.distant)
			if (
				!sources.has(link.source) ||
				(sources.get(link.source) ?? Infinity) > goal.after ||
				runtime.seed[sources.get(link.source) ?? -1]?.shift === goal.shift ||
				link.requirement.trim() === ''
			)
				failures.push(`distant source ${rubric.goal}`)
		for (const lookup of rubric.lookups) {
			const available = runtime.lookups
				.filter(
					(version) =>
						version.tool === lookup.tool && version.id === lookup.id && version.from <= goal.after,
				)
				.at(-1)
			if (available?.from !== lookup.from)
				failures.push(`future lookup ${rubric.goal}:${lookup.id}`)
		}
		if (
			rubric.product === 'packet' &&
			(rubric.lookups.length !== 2 ||
				new Set(rubric.lookups.map((lookup) => lookup.tool)).size !== 2)
		)
			failures.push(`incomplete packet lookups ${rubric.goal}`)
		if (
			rubric.obligations.some(
				(id) =>
					!oracle.obligations.some(
						(obligation) => obligation.id === id && obligation.from <= goal.after,
					),
			)
		)
			failures.push(`unknown obligation ${rubric.goal}`)
	}
	for (const source of runtime.seed)
		if (!covered.has(source.id)) failures.push(`uncovered source ${source.id}`)
	for (const calculation of oracle.calculations) {
		const goal = goals.get(calculation.goal)
		if (
			goal === undefined ||
			calculation.sources.length === 0 ||
			calculation.sources.some(
				(id) => !sources.has(id) || (sources.get(id) ?? Infinity) > goal.after,
			)
		)
			failures.push(`calculation source ${calculation.id}`)
		if (
			calculation.terms.length === 0 ||
			calculation.terms.some((term) => !Number.isSafeInteger(term)) ||
			!Number.isSafeInteger(calculation.divisor) ||
			calculation.divisor <= 0 ||
			Math.round(calculation.terms.reduce((sum, term) => sum + term, 0) / calculation.divisor) !==
				calculation.result
		)
			failures.push(`wrong calculation ${calculation.id}`)
	}
	for (const verdict of ['stale', 'fabricated', 'ambiguous'])
		if (
			!oracle.controls.some(
				(control) =>
					control.verdict === verdict &&
					goals.has(control.goal) &&
					control.artifact.length > 0 &&
					control.reason.length > 0,
			)
		)
			failures.push(`missing audit control ${verdict}`)
	return failures
}

/** Selects the latest arrived obligation versions and removes evidenced ended work.
 * @param oracle - Private obligation history
 * @param after - Last arrived source index
 * @returns Active versions, including reopened obligations and overdue work
 */
export function collectObligations(
	oracle: EnduranceOracle,
	after: number,
): EnduranceOracle['obligations'] {
	const latest = new Map<string, EnduranceOracle['obligations'][number]>()
	for (const obligation of oracle.obligations)
		if (obligation.from <= after && obligation.version > (latest.get(obligation.id)?.version ?? 0))
			latest.set(obligation.id, obligation)
	return [...latest.values()].filter(
		(obligation) =>
			(obligation.closed === undefined || obligation.closed > after) &&
			(obligation.withdrawn === undefined || obligation.withdrawn > after),
	)
}

/** Measures raw text with the final vendored estimator without claiming provider usage.
 * @param text - Exact text population
 * @returns Bytes, UTF-16 length, estimated tokens, and SHA-256
 */
export function measureText(text: string): EnduranceReading {
	return {
		bytes: Buffer.byteLength(text),
		characters: text.length,
		tokens: estimateTokens(text),
		hash: createHash('sha256').update(text).digest('hex'),
	}
}

/** Measures separate input populations and declared relevant-source bounds.
 * @param runtime - Validated external workload
 * @param oracle - Validated source references
 * @returns Finite workload census and checkpoint bands
 */
export function measureWorkload(
	runtime: EnduranceRuntime,
	oracle: EnduranceOracle,
): EnduranceCensus {
	const sources = new Map(runtime.seed.map((source) => [source.id, source]))
	const checkpoints = runtime.days.flatMap((_, index) => {
		const shift = index + 1
		const goal = runtime.goals.filter((entry) => entry.shift === shift).at(-1)
		return shift % 4 !== 0 || goal === undefined
			? []
			: [
					{
						shift,
						goal: goal.id,
						arrivals: measureText(
							runtime.seed
								.filter((source) => source.shift <= shift)
								.map((source) => source.content)
								.join('\n'),
						),
						requests: measureText(
							runtime.goals
								.filter((entry) => entry.shift <= shift)
								.map((entry) => entry.request)
								.join('\n'),
						),
					},
				]
	})
	return {
		shifts: runtime.days.length,
		goals: runtime.goals.length,
		threads: runtime.topics.length,
		system: measureText(runtime.system),
		arrivals: measureText(runtime.seed.map((source) => source.content).join('\n')),
		requests: measureText(runtime.goals.map((goal) => goal.request).join('\n')),
		lookups: measureText(runtime.lookups.map((lookup) => lookup.text).join('\n')),
		bounds: {
			initial: estimateTokens(
				[
					runtime.system,
					...runtime.seed.filter((source) => source.shift === 0).map((source) => source.content),
				].join('\n'),
			),
			shift: Math.max(
				...runtime.days.map((_, index) =>
					estimateTokens(
						[
							...runtime.seed
								.filter((source) => source.shift === index + 1)
								.map((source) => source.content),
							...runtime.goals
								.filter((goal) => goal.shift === index + 1)
								.map((goal) => goal.request),
						].join('\n'),
					),
				),
			),
			request: Math.max(...runtime.goals.map((goal) => estimateTokens(goal.request))),
			sources: Math.max(
				...oracle.goals.map((rubric) =>
					estimateTokens(
						[...new Set(rubric.atoms.flatMap((atom) => atom.sources))]
							.map((id) => sources.get(id)?.content ?? '')
							.join('\n'),
					),
				),
			),
			current: Math.max(
				...runtime.goals.map((goal) =>
					estimateTokens(
						[
							...new Set(
								oracle.facts
									.filter(
										(fact) =>
											fact.from <= goal.after &&
											(fact.until === undefined || fact.until > goal.after),
									)
									.flatMap((fact) => fact.sources),
							),
						]
							.map((id) => sources.get(id)?.content ?? '')
							.join('\n'),
					),
				),
			),
		},
		checkpoints,
	}
}
