import type { AuditFilesHandler, AuditFixture } from './types.js'
import type { EnduranceOracle, EnduranceRuntime } from '../../../endurance/types.js'
import type { SustainedArm, SustainedRun } from '../../../sustained/types.js'
import type {
	SustainedAuditInput,
	SustainedComparisonInput,
	SustainedItem,
	SustainedJudgmentInput,
	SustainedKey,
	SustainedLabel,
	SustainedObligationLabel,
} from '../../../sustained/audit/types.js'
import { Adjudication } from '../../../sustained/audit/Adjudication.js'
import { Packet } from '../../../sustained/audit/Packet.js'
import { SUSTAINED_CONTROLS, SUSTAINED_DIMENSIONS } from '../../../sustained/audit/constants.js'
import { AUDIT_COSTS, AUDIT_FREEZE, AUDIT_REFERENCE } from './constants.js'
import { mkdtempSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

/** Runs a file-boundary test in its recorded owned scratch directory and removes only that directory.
 * @param body - The actual file operation and assertions
 */
export function withAuditFiles(body: AuditFilesHandler): void {
	const directory = mkdtempSync(join(resolve('tmp/units'), 'audit-files-'))
	try {
		body(directory)
	} finally {
		rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
	}
}

/** Builds an inert source schedule that passes the real private-workload checker.
 * @returns A finite external schedule with dependent requests
 */
export function buildAuditRuntime(): EnduranceRuntime {
	return {
		id: 'inert-pure-domain',
		system: 'Inert boundary case.',
		topics: [{ name: 'account', criterion: 'account work' }],
		days: Array.from({ length: 8 }, (_, index) => ({ date: `2026-01-0${index + 1}`, from: index })),
		seed: Array.from({ length: 8 }, (_, index) => ({
			id: `source-${index}`,
			shift: index + 1,
			date: `2026-01-0${index + 1}`,
			role: 'user',
			content: `External receipt ${index}: work remains subject to evidence.`,
		})),
		tools: { lookup_order: {}, lookup_customer: {} },
		lookups: [],
		goals: Array.from({ length: 32 }, (_, index) => ({
			id: `goal-${index}`,
			shift: Math.floor(index / 4) + 1,
			after: Math.floor(index / 4),
			request: `Prepare work product ${index}.`,
		})),
	}
}

/** Builds private atomic truth for pure-domain refusal and interval tests.
 * @param runtime - The inert source schedule
 * @returns Source-linked private obligations, controls, and requirements
 */
export function buildAuditOracle(runtime: EnduranceRuntime): EnduranceOracle {
	return {
		runtime: runtime.id,
		facts: runtime.seed.map((source, index) => ({
			id: 'balance',
			version: index + 1,
			value: source.content,
			from: index,
			...(index < runtime.seed.length - 1 ? { until: index + 1 } : {}),
			sources: [source.id],
			transition: index === 0 ? 'arrival' : 'correction',
			case: 'account',
		})),
		obligations: [
			{
				id: 'filing',
				version: 1,
				case: 'account',
				from: 0,
				due: 7,
				closed: 7,
				prerequisites: ['balance'],
				sources: ['source-0'],
				description: 'Complete the evidenced filing.',
				evidence: ['source-7'],
			},
		],
		goals: runtime.goals.map((goal, index) => ({
			goal: goal.id,
			product: 'handoff',
			case: 'account',
			earlier: index === 0 ? [] : [runtime.goals[index - 1]?.id ?? 'missing'],
			atoms: SUSTAINED_DIMENSIONS.map((dimension) => ({
				id: `${goal.id}-${dimension}`,
				dimension,
				requirement: `Provide the ${dimension} requirement.`,
				alternatives: [],
				sources: [`source-${goal.after}`],
				mandatory: true,
			})),
			critical: [SUSTAINED_CONTROLS.stale, SUSTAINED_CONTROLS.fabricated],
			distant: [],
			lookups: [],
			obligations: ['filing'],
		})),
		controls: [
			{
				id: 'inert-stale',
				goal: 'goal-0',
				artifact: 'Use the retired address.',
				verdict: 'stale',
				reason: 'Directs a stale action.',
			},
			{
				id: 'inert-completion',
				goal: 'goal-0',
				artifact: 'Filing is complete without evidence.',
				verdict: 'fabricated',
				reason: 'Claims an unsupported completion.',
			},
			{
				id: 'inert-ambiguity',
				goal: 'goal-0',
				artifact: 'The account is done at ten.',
				verdict: 'ambiguous',
				reason: 'Amount and completion are unspecified.',
			},
		],
		calculations: [],
	}
}

/** Builds inert run-shaped data solely for pure-domain tests, without replacing any reader.
 * @param runtime - The external schedule
 * @param arm - The arm carried by the typed records
 * @returns Inert actual-product fields for the audit algorithm
 */
export function buildAuditRun(runtime: EnduranceRuntime, arm: SustainedArm): SustainedRun {
	return {
		path: `inert-${arm}`,
		execution: {
			protocol: 'e1',
			key: 'q4',
			think: false,
			arm,
			phase: 'evaluation',
			frozen: AUDIT_REFERENCE,
			resource: AUDIT_REFERENCE,
			runtime: AUDIT_REFERENCE,
			budget: { reserve: 512, window: 3072, ceiling: 3072, predict: 0 },
			limits: {
				calls: 100,
				tokens: 1000,
				retries: 0,
				wall: 1000,
				goals: runtime.goals.length,
				derivation: 'Inert pure-domain input.',
				evidence: [],
			},
			selection: AUDIT_REFERENCE,
		},
		frozen: AUDIT_FREEZE,
		runtime,
		status: 'complete',
		rows: runtime.goals.map((goal) => ({
			goal: goal.id,
			reply: 'Inert product with an evidenced outcome.',
			success: false,
			partial: false,
			error: undefined,
			sole: 0,
			wall: 1,
			stage: 0,
			flush: 0,
			resource: [],
			rendered: [],
			summary: 0,
			scale: 1,
			tail: '',
			briefing: { tokens: 0, facts: 0, stale: 0, digest: '' },
		})),
		picks: [
			{
				goal: runtime.goals[0]?.id ?? 'missing',
				pass: 1,
				sequence: 1,
				briefing: '',
				digest: 'inert-plan',
				tail: [],
				instructions: {},
				scale: 1,
			},
		],
		requests: [],
		receipts: [],
		observations: runtime.goals.map((goal, index) => ({
			goal: goal.id,
			shift: goal.shift,
			after: goal.after,
			checkpoint: goal.shift % 4 === 0 && index % 4 === 3,
			conversation: runtime.seed.slice(0, goal.after + 1).map((source) => `message:${source.id}`),
			sources: runtime.seed.slice(0, goal.after + 1).map((source) => `source:${source.id}`),
			products: runtime.goals.slice(0, index).map((earlier) => `product:${earlier.id}`),
			selected: runtime.seed.slice(0, goal.after + 1).map((source) => `source:${source.id}`),
			omitted: runtime.goals.slice(0, index).map((earlier) => `product:${earlier.id}`),
			history: { arrivals: 1, requests: index, products: index, tools: 0, total: 1 + index * 2 },
			exposed: arm === 'aggregate',
			complete: true,
		})),
		messages: runtime.seed.map((source, index) => ({
			id: source.id,
			role: 'user',
			content: source.content,
			seed: index,
			request: false,
		})),
		gauge: { scale: 1, overhead: 0 },
		journal: [],
		files: [],
		failures: [],
		costs: AUDIT_COSTS,
	}
}

/** Builds inert adjudications to exercise pure arithmetic and validation, never live labels.
 * @param item - The pure test product
 * @param key - Its private test identity
 * @returns A complete inert outcome with exact citations
 */
export function buildAuditLabel(item: SustainedItem, key: SustainedKey): SustainedLabel {
	const source = item.evidence.find((entry) =>
		item.rubric.atoms.some((atom) => atom.sources.some((id) => entry.id === `source:${id}`)),
	)
	if (source === undefined) throw new Error('inert citation source missing')
	const evidence = [`product|${item.product}`, `${source.id}|${source.content}`]
	return {
		id: item.id,
		atoms: item.rubric.atoms.map((atom) => ({
			id: atom.id,
			verdict:
				key.control?.verdict === 'ambiguous' && atom.dimension === 'facts'
					? 'ambiguous'
					: key.arm === 'records' && key.control === undefined
						? 'fail'
						: 'pass',
			evidence,
		})),
		critical: item.rubric.critical.map((rule) => ({
			rule,
			violated:
				key.control?.verdict === 'stale'
					? rule === SUSTAINED_CONTROLS.stale
					: key.control?.verdict === 'fabricated'
						? rule === SUSTAINED_CONTROLS.fabricated
						: false,
			evidence,
		})),
		obligations: item.rubric.obligations.map((id) => {
			const closure = item.obligations.find((entry) => entry.id === id)?.closed
			return {
				id,
				disposition:
					key.control === undefined && key.arm === 'aggregate' && closure !== undefined
						? 'completed'
						: 'carried',
				evidence,
			}
		}),
		ambiguous: key.control?.verdict === 'ambiguous' ? [`product|${item.product}`] : [],
		leaks: [],
	}
}

/** Composes the real packet builder with inert typed inputs for deterministic boundary tests.
 * @returns Pure test inputs and complete independent outcome records
 */
export function buildAuditFixture(): AuditFixture {
	const runtime = buildAuditRuntime()
	const input: SustainedAuditInput = {
		manifest: AUDIT_REFERENCE,
		reference: AUDIT_REFERENCE,
		records: buildAuditRun(runtime, 'records'),
		aggregate: buildAuditRun(runtime, 'aggregate'),
		oracle: buildAuditOracle(runtime),
		selection: {
			protocol: 'e1',
			development: { path: 'inert-development', hash: 'b'.repeat(64) },
			evaluation: AUDIT_REFERENCE,
			candidates: [],
			chosen: 'q4',
			seed: 17,
			order: ['records', 'aggregate'],
			accepted: true,
			failures: [],
		},
	}
	const blind = new Packet().build(input, 31)
	return {
		input,
		blind,
		judgment: {
			packet: blind.packet,
			keys: {
				protocol: 'e1',
				manifest: AUDIT_REFERENCE,
				packet: AUDIT_REFERENCE,
				oracle: AUDIT_REFERENCE,
				runtime: AUDIT_REFERENCE,
				selection: AUDIT_REFERENCE,
				seed: 31,
				keys: blind.keys,
			},
			labels: {
				authority: 'root-adjudicated',
				packet: AUDIT_REFERENCE.hash,
				keys: AUDIT_REFERENCE.hash,
				labels: blind.keys.map((key) => {
					const item = blind.packet.items.find((entry) => entry.id === key.id)
					if (item === undefined) throw new Error('inert item missing')
					return buildAuditLabel(item, key)
				}),
			},
			hashes: { packet: AUDIT_REFERENCE.hash, keys: AUDIT_REFERENCE.hash },
		},
	}
}

/** Composes a complete pure comparison input through the real adjudication validator.
 * @param fixture - Inert packet and outcomes
 * @returns An input whose labels passed the actual adjudication rules
 */
export function buildComparisonInput(fixture: AuditFixture): SustainedComparisonInput {
	return {
		...fixture.input,
		blind: fixture.blind,
		adjudication: new Adjudication().read(fixture.judgment),
		packet: AUDIT_REFERENCE,
		labels: AUDIT_REFERENCE,
		preparation: [],
	}
}

/** Replaces one inert obligation ruling while retaining the real packet and label validator.
 * @param fixture - The original inert packet and labels
 * @param item - The product with the evidence context under test
 * @param disposition - The independent ruling to validate
 * @param evidence - Exact citations supporting that ruling
 * @returns A complete judgment input with the targeted obligation ruling
 */
export function amendAuditObligation(
	fixture: AuditFixture,
	item: SustainedItem,
	disposition: SustainedObligationLabel['disposition'],
	evidence: readonly string[],
): SustainedJudgmentInput {
	return {
		...fixture.judgment,
		packet: {
			...fixture.judgment.packet,
			items: fixture.judgment.packet.items.map((entry) => (entry.id === item.id ? item : entry)),
		},
		labels: {
			...fixture.judgment.labels,
			labels: fixture.judgment.labels.labels.map((label) =>
				label.id === item.id
					? {
							...label,
							obligations: label.obligations.map((obligation) => ({
								...obligation,
								disposition,
								evidence,
							})),
							ambiguous:
								disposition === 'ambiguous' ? [`product|${item.product}`] : label.ambiguous,
						}
					: label,
			),
		},
	}
}
