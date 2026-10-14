import type {
	EnduranceControl,
	EnduranceFact,
	EnduranceObligation,
	EnduranceOracle,
	EnduranceRubric,
} from '../../endurance/types.js'
import type { MatrixRow } from '../../matrix/types.js'
import type { RefitFile } from '../../refit/types.js'
import type { SustainedPreparation, SustainedRun } from '../types.js'
import type {
	SustainedAuditInput,
	SustainedAuditSource,
	SustainedBounds,
	SustainedCostDetail,
	SustainedCoverage,
	SustainedEvidence,
	SustainedItem,
	SustainedKeys,
	SustainedLabel,
} from './types.js'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { isFiniteNumber, isRecord } from '@orkestrel/contract'
import { SUSTAINED_CONTROLS } from './constants.js'
import { SustainedAuditError } from './errors.js'

/** Refuses an oracle whose exact bytes were not pinned by the runtime's frozen workload resource.
 * @param oracle - The actual private file's byte identity
 * @param files - File identities from the shared build-bound workload reader
 */
export function verifyOracleCustody(oracle: RefitFile, files: readonly RefitFile[]): void {
	if (!files.some((file) => file.hash === oracle.hash))
		throw new SustainedAuditError('oracle bytes differ from frozen workload resource')
}

/** Refuses private keys whose workload, runtime, oracle, selection, or packet identity changed.
 * @param keys - The parsed private key envelope
 * @param input - The freshly validated run pair and frozen workload identity
 * @param oracle - The actual private oracle file
 * @param packet - The actual public packet file
 */
export function verifyAuditIdentity(
	keys: SustainedKeys,
	input: SustainedAuditInput,
	oracle: RefitFile,
	packet: RefitFile,
): void {
	if (
		!isDeepStrictEqual(keys.manifest, input.manifest) ||
		!isDeepStrictEqual(keys.oracle, oracle) ||
		!isDeepStrictEqual(keys.runtime, input.directed?.runtime ?? input.selection?.evaluation) ||
		!isDeepStrictEqual(
			input.directed === undefined ? keys.selection : keys.directed,
			input.reference,
		) ||
		(input.directed === undefined ? keys.directed !== undefined : keys.selection !== undefined) ||
		(input.directed !== undefined && keys.seed !== input.directed.blind) ||
		!isDeepStrictEqual(keys.packet, packet)
	)
		throw new SustainedAuditError(
			'private keys bind another workload manifest, oracle, runtime, selection, or packet',
		)
}

/** Measures known fresh token totals and retains support timings independently of overlapping stages.
 * @param run - Exact shared-reader requests and maintenance evidence
 * @returns Fresh usage, actual failed requests, support event readings, and attribution limits
 */
export function measureAuditCosts(run: SustainedRun): SustainedCostDetail {
	const sent = run.requests.filter((request) => request.sent)
	return {
		total: {
			prompt: sent.reduce((sum, request) => sum + (request.prompt ?? 0), 0),
			completion: sent.reduce((sum, request) => sum + (request.completion ?? 0), 0),
			missing: sent.filter(
				(request) => request.prompt === undefined || request.completion === undefined,
			).length,
		},
		failed: run.requests.filter(
			(request) =>
				request.error !== undefined ||
				(request.status ?? 200) >= 400 ||
				request.failures.length > 0,
		),
		support: run.journal.flatMap((event) =>
			isRecord(event) &&
			(event.event === 'agree' || event.event === 'change') &&
			typeof event.goal === 'string'
				? [
						{
							goal: event.goal,
							event: event.event,
							wall: isFiniteNumber(event.wall) ? event.wall : undefined,
							cached: typeof event.cached === 'boolean' ? event.cached : undefined,
						},
					]
				: [],
		),
		limitations: [
			'Judge wire usage combines filing and summary checks; the retained request records do not establish per-operation token attribution or actual retry identities.',
			'Support event, wire, stage, flush, and elapsed wall readings overlap; no elapsed total is formed by summing them.',
			'Token totals include only known usage. Incremental missing usage counts both arms and cannot cancel.',
		],
	}
}

/** Computes an opaque deterministic identity without exposing its private inputs.
 * @param seed - The retained shuffle seed
 * @param members - The private identity components
 * @returns A SHA-256 identity
 */
export function computeAuditId(seed: number, members: readonly string[]): string {
	if (!Number.isSafeInteger(seed)) throw new SustainedAuditError('seed must be a safe integer')
	return createHash('sha256')
		.update(JSON.stringify([seed, ...members]))
		.digest('hex')
}

/** Compares opaque ASCII identities without locale-dependent ordering.
 * @param left - The first identity
 * @param right - The second identity
 * @returns The ordering of the identities
 */
export function compareAuditIds(
	left: { readonly id: string },
	right: { readonly id: string },
): number {
	return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
}

/** Selects arrived fact versions without disclosing a future supersession boundary.
 * @param oracle - The private version history
 * @param after - The last available external source
 * @returns Arrived facts with evidenced historical endings only
 */
export function collectAuditFacts(
	oracle: EnduranceOracle,
	after: number,
): readonly EnduranceFact[] {
	return oracle.facts
		.filter((fact) => fact.from <= after)
		.map((fact) => {
			const { until, ...arrived } = fact
			return until !== undefined && until <= after ? { ...arrived, until } : arrived
		})
}

/** Selects the latest arrived obligation versions with only arrived closure evidence.
 * @param oracle - The private obligation history
 * @param after - The last available external source
 * @returns Active and historically ended obligations without future receipts
 */
export function collectAuditObligations(
	oracle: EnduranceOracle,
	after: number,
): readonly EnduranceObligation[] {
	const latest = new Map<string, EnduranceObligation>()
	for (const obligation of oracle.obligations) {
		if (obligation.from > after || obligation.version <= (latest.get(obligation.id)?.version ?? 0))
			continue
		const { closed, withdrawn, evidence, ...arrived } = obligation
		latest.set(obligation.id, {
			...arrived,
			...(closed !== undefined && closed <= after ? { closed } : {}),
			...(withdrawn !== undefined && withdrawn <= after ? { withdrawn } : {}),
			evidence:
				(closed !== undefined && closed <= after) || (withdrawn !== undefined && withdrawn <= after)
					? evidence
					: [],
		})
	}
	return [...latest.values()]
}

/** Checks whether a served row completed without a declared resource refusal.
 * @param row - The actual served row
 * @returns True if the row completed; false otherwise
 */
export function matchesCompleteRow(row: MatrixRow): boolean {
	return !row.partial && row.error === undefined && (row.resource?.length ?? 0) === 0
}

/** Counts the uninterrupted completed prefix of a shared-reader trajectory.
 * @param run - The shared reader's validated evidence
 * @returns The number of completed goals before its first invalid or absent response
 */
export function countCompleteGoals(run: SustainedRun): number {
	let count = 0
	for (const goal of run.runtime.goals) {
		const row = run.rows[count]
		const observation = run.observations.find((entry) => entry.goal === goal.id)
		if (row?.goal !== goal.id || !matchesCompleteRow(row) || observation?.complete !== true) break
		count++
	}
	return count
}

/** Computes full-product possibility bounds from mandatory atoms and critical rulings.
 * @param item - The exact rubric-bearing blind product
 * @param label - Its complete independently supplied adjudication
 * @returns Conservative and possible acceptability indicators
 */
export function computeAcceptability(item: SustainedItem, label: SustainedLabel): SustainedBounds {
	const mandatory = item.rubric.atoms
		.filter((atom) => atom.mandatory)
		.map((atom) => {
			const outcome = label.atoms.find((entry) => entry.id === atom.id)
			if (outcome === undefined) throw new SustainedAuditError(`missing atom ${atom.id}`)
			return outcome.verdict
		})
	if (label.critical.some((entry) => entry.violated) || mandatory.includes('fail'))
		return { low: 0, high: 0 }
	return { low: Number(!mandatory.includes('ambiguous') && label.ambiguous.length === 0), high: 1 }
}

/** Joins exact original sources, received lookup versions, and earlier products to their ages.
 * @param run - The validated shared run
 * @param rubric - The private goal requirements
 * @returns Selection readings that keep summary-only exposure separate
 */
export function collectAuditCoverage(
	run: SustainedRun,
	rubric: EnduranceRubric,
): readonly SustainedCoverage[] {
	const observation = run.observations.find((entry) => entry.goal === rubric.goal)
	if (observation === undefined) throw new SustainedAuditError(`missing observation ${rubric.goal}`)
	const result: SustainedCoverage[] = []
	for (const id of [...observation.sources, ...observation.products]) {
		let shift: number | undefined
		let category: SustainedCoverage['category']
		let required: boolean
		if (id.startsWith('source:')) {
			const source = run.runtime.seed.find((entry) => entry.id === id.slice(7))
			shift = source?.shift
			category = 'source'
			required = rubric.atoms.some((atom) => atom.sources.includes(id.slice(7)))
		} else if (id.startsWith('lookup:')) {
			const lookup = run.runtime.lookups.find((entry) => `lookup:${entry.id}@${entry.from}` === id)
			shift = lookup === undefined ? undefined : run.runtime.seed[lookup.from]?.shift
			category = 'lookup'
			required = rubric.lookups.some((entry) => `lookup:${entry.id}@${entry.from}` === id)
		} else if (id.startsWith('product:')) {
			const goal = run.runtime.goals.find((entry) => entry.id === id.slice(8))
			shift = goal?.shift
			category = 'product'
			required = rubric.earlier.includes(id.slice(8))
		} else throw new SustainedAuditError(`unknown observation identity ${id}`)
		if (shift === undefined || shift > observation.shift)
			throw new SustainedAuditError(`missing or future coverage join ${id}`)
		result.push({
			id,
			category,
			shift,
			age: observation.shift - shift,
			selected: observation.selected.includes(id),
			required,
		})
	}
	return result
}

/** Resolves a label citation to exact product, external, receipt, or rubric text.
 * @param item - The blinded work product
 * @param citation - A reference followed by a vertical bar and a verbatim quotation
 * @returns The cited reference after its nonempty quotation has been checked
 */
export function readAuditCitation(item: SustainedItem, citation: string): string {
	const split = citation.indexOf('|')
	const reference = citation.slice(0, split)
	const quote = citation.slice(split + 1)
	const texts = new Map<string, string>([
		['product', item.product],
		['request', item.request],
		...item.evidence.map((entry): [string, string] => [entry.id, entry.content]),
		...item.earlier.map((entry): [string, string] => [`product:${entry.id}`, entry.product]),
		...item.receipts.map((entry): [string, string] => [`receipt:${entry.call}`, entry.content]),
		...item.facts.map((entry): [string, string] => [
			`fact:${entry.id}@${entry.version}`,
			entry.value,
		]),
		...item.obligations.map((entry): [string, string] => [
			`obligation:${entry.id}@${entry.version}`,
			entry.description,
		]),
		...item.rubric.atoms.map((entry): [string, string] => [`atom:${entry.id}`, entry.requirement]),
		...item.rubric.critical.map((entry): [string, string] => [`critical:${entry}`, entry]),
	])
	if (split < 1 || quote.trim() === '' || !texts.get(reference)?.includes(quote))
		throw new SustainedAuditError(`unbound or empty evidence citation for ${item.id}`)
	return reference
}

/** Checks whether an exact citation supplies external support for an atom's source population.
 * @param item - The blinded work product
 * @param references - Already validated citation references
 * @param sources - The atom's authored source identities
 * @returns True if source or fact evidence joins the atom's external truth; false otherwise
 */
export function matchesFactualEvidence(
	item: SustainedItem,
	references: readonly string[],
	sources: readonly string[],
): boolean {
	return references.some(
		(reference) =>
			sources.some((source) => reference === `source:${source}`) ||
			item.facts.some(
				(fact) =>
					reference === `fact:${fact.id}@${fact.version}` &&
					fact.sources.some((source) => sources.includes(source)),
			),
	)
}

/** Checks whether completion cites the obligation's arrived closure or its required lookup receipt.
 * @param item - The blinded product and temporally available evidence
 * @param obligation - The exact obligation version being adjudicated
 * @param references - Already validated citation references
 * @returns True if the closure and cited external evidence have exact custody; false otherwise
 */
export function matchesCompletionEvidence(
	item: SustainedItem,
	obligation: EnduranceObligation,
	references: readonly string[],
): boolean {
	const closed = obligation.closed
	if (closed === undefined || closed > item.point.after) return false
	return references.some(
		(reference) =>
			obligation.evidence.some((source) => reference === `source:${source}`) ||
			item.receipts.some(
				(receipt) =>
					reference === `receipt:${receipt.call}` &&
					receipt.success &&
					receipt.after >= closed &&
					receipt.after <= item.point.after &&
					item.rubric.lookups.some(
						(lookup) =>
							lookup.tool === receipt.tool &&
							lookup.id === String(receipt.arguments.id ?? receipt.arguments.account) &&
							lookup.from === receipt.version &&
							lookup.from <= receipt.after &&
							item.evidence.some(
								(entry) =>
									entry.id === `lookup:${lookup.id}@${lookup.from}` &&
									entry.content === receipt.content,
							),
					),
			),
	)
}

/** Builds one blind item from actual same-run work and the separately held truth available at its read point.
 * @param source - The run's runtime, rows, observations, messages, and receipts
 * @param oracle - The private truth
 * @param goalId - The served goal
 * @param id - The opaque item identity
 * @param product - The product text the item carries: the actual reply or a prefrozen control artifact
 * @returns The item with its earlier same-run products, available evidence, receipts, arrived facts, obligations, and rubric
 * @throws SustainedAuditError when a goal, rubric, observation, conversation, earlier product, or evidence join is missing
 */
export function buildAuditItem(
	source: SustainedAuditSource,
	oracle: EnduranceOracle,
	goalId: string,
	id: string,
	product: string,
): SustainedItem {
	const goal = source.runtime.goals.find((entry) => entry.id === goalId)
	const rubric = oracle.goals.find((entry) => entry.goal === goalId)
	const observation = source.observations.find((entry) => entry.goal === goalId)
	if (goal === undefined || rubric === undefined || observation === undefined)
		throw new SustainedAuditError(`missing product join ${goalId}`)
	for (const reference of observation.conversation) {
		if (
			!reference.startsWith('message:') ||
			!source.messages.some((message) => message.id === reference.slice(8))
		)
			throw new SustainedAuditError(`missing conversation join ${reference}`)
	}
	const earlier = rubric.earlier.map((reference) => {
		const row = source.rows.find((entry) => entry.goal === reference)
		const request = source.runtime.goals.find((entry) => entry.id === reference)
		if (
			row === undefined ||
			request === undefined ||
			!observation.products.includes(`product:${reference}`)
		)
			throw new SustainedAuditError(`missing earlier same-arm product ${reference}`)
		return { id: reference, request: request.request, product: row.reply }
	})
	const evidence: SustainedEvidence[] = []
	for (const reference of observation.sources) {
		const found = source.runtime.seed.find((entry) => `source:${entry.id}` === reference)
		const lookup = source.runtime.lookups.find(
			(entry) => `lookup:${entry.id}@${entry.from}` === reference,
		)
		if (found !== undefined && source.runtime.seed.indexOf(found) <= goal.after)
			evidence.push({ id: reference, content: found.content, shift: found.shift })
		else if (
			lookup !== undefined &&
			lookup.from <= goal.after &&
			source.runtime.seed[lookup.from] !== undefined
		)
			evidence.push({
				id: reference,
				content: lookup.text,
				shift: source.runtime.seed[lookup.from]?.shift ?? 0,
			})
		else throw new SustainedAuditError(`missing external evidence join ${reference}`)
	}
	for (const atom of rubric.atoms) {
		for (const atomSource of atom.sources)
			if (!evidence.some((entry) => entry.id === `source:${atomSource}`))
				throw new SustainedAuditError(`missing rubric source join ${atomSource}`)
	}
	for (const required of rubric.lookups) {
		const reference = `lookup:${required.id}@${required.from}`
		if (evidence.some((entry) => entry.id === reference)) continue
		const lookup = source.runtime.lookups.find(
			(entry) =>
				entry.id === required.id && entry.tool === required.tool && entry.from === required.from,
		)
		const arrival = lookup === undefined ? undefined : source.runtime.seed[lookup.from]
		if (lookup === undefined || arrival === undefined || lookup.from > goal.after)
			throw new SustainedAuditError(`missing available lookup ${reference}`)
		evidence.push({ id: reference, content: lookup.text, shift: arrival.shift })
	}
	return {
		id,
		point: { shift: goal.shift, after: goal.after },
		request: goal.request,
		product,
		earlier,
		evidence,
		receipts: source.receipts.filter(
			(receipt) =>
				receipt.after <= goal.after &&
				(receipt.goal === goalId || observation.products.includes(`product:${receipt.goal}`)),
		),
		facts: collectAuditFacts(oracle, goal.after),
		obligations: collectAuditObligations(oracle, goal.after),
		rubric,
	}
}

/** Refuses a prefrozen control whose rubric lacks the critical rule its verdict names.
 * @param item - The blind item built around the control artifact
 * @param control - The prefrozen control
 * @throws SustainedAuditError when a stale or fabricated control's rubric lacks its exact rule
 */
export function verifyAuditControl(item: SustainedItem, control: EnduranceControl): void {
	if (
		control.verdict !== 'ambiguous' &&
		!item.rubric.critical.includes(SUSTAINED_CONTROLS[control.verdict])
	)
		throw new SustainedAuditError(`prefrozen control lacks its exact critical rule ${control.id}`)
}

/** Reads every citation of one ruling, refusing an empty list or one that never cites the current product.
 * @param item - The blinded work product
 * @param evidence - The ruling's citations
 * @returns The validated references, or the failures that refuse them
 */
export function readRulingEvidence(
	item: SustainedItem,
	evidence: readonly string[],
): { readonly references: readonly string[]; readonly failures: readonly string[] } {
	if (evidence.length === 0)
		return { references: [], failures: [`empty adjudication evidence ${item.id}`] }
	const references: string[] = []
	const failures: string[] = []
	for (const citation of evidence) {
		try {
			references.push(readAuditCitation(item, citation))
		} catch (error) {
			failures.push(error instanceof Error ? error.message : String(error))
		}
	}
	if (failures.length === 0 && !references.includes('product'))
		failures.push(`ruling does not cite current product ${item.id}`)
	return { references, failures }
}

/** Lists every rule one label breaks against its item: populations, citations, factual support, completion custody, and ambiguity evidence.
 * @param item - The blinded work product
 * @param label - The independent adjudication of that product
 * @returns The failures in reading order; empty when the label is admissible
 */
export function listLabelFailures(item: SustainedItem, label: SustainedLabel): readonly string[] {
	const failures: string[] = []
	const populations: ReadonlyArray<readonly [string, readonly string[], readonly string[]]> = [
		['atom', item.rubric.atoms.map((atom) => atom.id), label.atoms.map((atom) => atom.id)],
		['critical', item.rubric.critical, label.critical.map((critical) => critical.rule)],
		[
			'obligation',
			item.rubric.obligations,
			label.obligations.map((obligation) => obligation.id),
		],
	]
	for (const [name, expected, actual] of populations)
		if (
			new Set(expected).size !== expected.length ||
			new Set(actual).size !== actual.length ||
			actual.length !== expected.length ||
			actual.some((id) => !expected.includes(id))
		)
			failures.push(
				`missing, duplicate, or unknown ${name} outcomes: expected ${expected.join(', ')}; found ${actual.join(', ')}`,
			)
	for (const atom of label.atoms) {
		const definition = item.rubric.atoms.find((entry) => entry.id === atom.id)
		const evidence = readRulingEvidence(item, atom.evidence)
		failures.push(...evidence.failures.map((failure) => `${atom.id}: ${failure}`))
		if (definition === undefined) {
			failures.push(`unknown atom ${atom.id}`)
			continue
		}
		if (
			evidence.failures.length === 0 &&
			atom.verdict === 'pass' &&
			definition.dimension === 'facts' &&
			!matchesFactualEvidence(item, evidence.references, definition.sources)
		)
			failures.push(`earlier work cannot supply factual credit ${atom.id}`)
	}
	for (const critical of label.critical)
		failures.push(
			...readRulingEvidence(item, critical.evidence).failures.map(
				(failure) => `critical ${critical.rule}: ${failure}`,
			),
		)
	for (const obligation of label.obligations) {
		const evidence = readRulingEvidence(item, obligation.evidence)
		failures.push(...evidence.failures.map((failure) => `${obligation.id}: ${failure}`))
		const definition = item.obligations.find((entry) => entry.id === obligation.id)
		if (definition === undefined) {
			failures.push(`unrelated obligation ${obligation.id}`)
			continue
		}
		if (evidence.failures.length > 0) continue
		if (
			obligation.disposition === 'completed' &&
			!matchesCompletionEvidence(item, definition, evidence.references)
		)
			failures.push(`downstream outcome lacks bound completion evidence ${obligation.id}`)
		if (
			obligation.disposition === 'repaired' &&
			!evidence.references.some(
				(reference) => reference.startsWith('source:') || reference.startsWith('receipt:'),
			)
		)
			failures.push(`downstream outcome lacks external evidence ${obligation.id}`)
		if (
			obligation.disposition === 'repaired' &&
			!evidence.references.some((reference) => reference.startsWith('product:'))
		)
			failures.push(`repaired outcome lacks earlier-work evidence ${obligation.id}`)
	}
	if (
		(label.atoms.some((atom) => atom.verdict === 'ambiguous') ||
			label.obligations.some((obligation) => obligation.disposition === 'ambiguous')) &&
		label.ambiguous.length === 0
	)
		failures.push(`missing ambiguity evidence ${item.id}`)
	for (const citation of [...label.ambiguous, ...label.leaks]) {
		try {
			readAuditCitation(item, citation)
		} catch (error) {
			failures.push(error instanceof Error ? error.message : String(error))
		}
	}
	return failures
}

/** Merges aliases of one measured preparation without charging its work twice.
 * @param preparations - Independently retained preparation readings
 * @returns Distinct generation or run readings with every referring manifest
 */
export function collectPreparations(
	preparations: readonly SustainedPreparation[],
): readonly SustainedPreparation[] {
	const unique = new Map<string, SustainedPreparation>()
	for (const preparation of preparations) {
		const prior = unique.get(preparation.identity)
		if (prior === undefined) unique.set(preparation.identity, preparation)
		else {
			if (
				prior.phase !== preparation.phase ||
				!isDeepStrictEqual(prior.costs, preparation.costs) ||
				!isDeepStrictEqual(prior.failures, preparation.failures)
			)
				throw new SustainedAuditError(`conflicting preparation identity ${preparation.identity}`)
			for (const file of preparation.files)
				if (prior.files.some((entry) => entry.path === file.path && entry.hash !== file.hash))
					throw new SustainedAuditError(`conflicting preparation custody ${file.path}`)
			unique.set(preparation.identity, {
				...prior,
				files: [
					...prior.files,
					...preparation.files.filter(
						(entry) =>
							!prior.files.some((file) => file.path === entry.path && file.hash === entry.hash),
					),
				],
			})
		}
	}
	return [...unique.values()]
}
