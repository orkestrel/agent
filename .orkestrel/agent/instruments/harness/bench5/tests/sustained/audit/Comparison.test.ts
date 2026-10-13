import type { SustainedRun } from '../../../sustained/types.js'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Comparison } from '../../../sustained/audit/Comparison.js'
import {
	collectAuditCoverage,
	collectPreparations,
	countCompleteGoals,
	readAuditCitation,
	measureAuditCosts,
} from '../../../sustained/audit/helpers.js'
import { SUSTAINED_CONTROLS } from '../../../sustained/audit/constants.js'
import { AUDIT_COSTS, AUDIT_REFERENCE } from './constants.js'
import { buildAuditFixture, buildComparisonInput } from './helpers.js'

test('reports common fourth-shift checkpoints and disjoint intervals with final downstream gain', () => {
	const input = buildComparisonInput(buildAuditFixture())
	const report = new Comparison().build(input)
	assert.equal(report.valid, true)
	assert.equal(report.recommendation, 'conditional')
	assert.equal(report.common, 8)
	assert.deepEqual(
		report.checkpoints.map((entry) => [entry.from, entry.through]),
		[
			[1, 4],
			[1, 8],
		],
	)
	assert.deepEqual(
		report.intervals.map((entry) => [entry.from, entry.through]),
		[
			[1, 4],
			[5, 8],
		],
	)
	assert.equal(report.overall?.wins, 32)
	assert.deepEqual(report.final?.gain, { low: 16, high: 16 })
	assert.equal(report.final?.downstream.length, 4)
	assert.equal(report.overall?.dimensions.facts.aggregate.total, 32)
	assert.deepEqual(report.suffix, { records: [], aggregate: [] })
	assert.deepEqual(
		report.costs.map((entry) => entry.reading),
		[AUDIT_COSTS, AUDIT_COSTS],
	)
})

test('positive gains without completed or repaired downstream work remain inconclusive', () => {
	const fixture = buildAuditFixture()
	const judgment = {
		...fixture.judgment,
		labels: {
			...fixture.judgment.labels,
			labels: fixture.judgment.labels.labels.map((label) => ({
				...label,
				obligations: label.obligations.map((obligation) => ({
					...obligation,
					disposition: 'carried' as const,
				})),
			})),
		},
	}
	const report = new Comparison().build(buildComparisonInput({ ...fixture, judgment }))
	assert.equal(report.valid, true)
	assert.deepEqual(report.overall?.gain, { low: 32, high: 32 })
	assert.deepEqual(report.final?.gain, { low: 16, high: 16 })
	assert.deepEqual(report.overall?.downstream, [])
	assert.deepEqual(report.final?.downstream, [])
	assert.equal(report.recommendation, 'inconclusive')
	assert.deepEqual(report.reasons, [
		'A conservative gain with completed or repaired downstream work is absent overall or in the final interval.',
	])
})

test('refuses conditional adoption from exploratory provenance despite every positive quality condition', () => {
	const input = buildComparisonInput(buildAuditFixture())
	assert.equal(input.directed, undefined)
	assert.ok(input.selection)
	assert.equal(new Comparison().build(input).recommendation, 'conditional')
	const policy = { ...AUDIT_REFERENCE, path: 'exploratory-policy.json' }
	const report = new Comparison().build({
		...input,
		selection: { ...input.selection, policy },
		records: { ...input.records, execution: { ...input.records.execution, policy } },
		aggregate: { ...input.aggregate, execution: { ...input.aggregate.execution, policy } },
	})
	assert.equal(report.valid, true)
	assert.deepEqual(report.policy, policy)
	assert.equal(report.recommendation, 'inconclusive')
	assert.ok(
		report.reasons.includes(
			'Exploratory provenance does not qualify support or permit an adoption recommendation.',
		),
	)
})

test('a missed packet control invalidates products in every reporting interval', () => {
	const fixture = buildAuditFixture()
	const key = fixture.blind.keys.find((entry) => entry.control?.verdict === 'stale')
	assert.ok(key)
	const judgment = {
		...fixture.judgment,
		labels: {
			...fixture.judgment.labels,
			labels: fixture.judgment.labels.labels.map((label) =>
				label.id === key.id
					? {
							...label,
							critical: label.critical.map((entry) => ({ ...entry, violated: false })),
						}
					: label,
			),
		},
	}
	const report = new Comparison().build(buildComparisonInput({ ...fixture, judgment }))
	assert.equal(report.valid, false)
	assert.equal(report.recommendation, 'inconclusive')
	assert.equal(report.intervals.length, 2)
	for (const interval of report.intervals) {
		assert.equal(interval.valid, false)
		assert.ok(interval.failures.includes(`invalid batch ${key.batch}`))
	}
	assert.deepEqual(report.served, { records: 32, aggregate: 32 })
})

test('a nonpositive overall upper gain remains negative', () => {
	const fixture = buildAuditFixture()
	const judgment = {
		...fixture.judgment,
		labels: {
			...fixture.judgment.labels,
			labels: fixture.judgment.labels.labels.map((label) => {
				const key = fixture.blind.keys.find((entry) => entry.id === label.id)
				if (key?.control !== undefined || key?.arm !== 'records') return label
				return {
					...label,
					atoms: label.atoms.map((atom) => ({ ...atom, verdict: 'pass' as const })),
				}
			}),
		},
	}
	const report = new Comparison().build(buildComparisonInput({ ...fixture, judgment }))
	assert.equal(report.valid, true)
	assert.deepEqual(report.overall?.gain, { low: 0, high: 0 })
	assert.equal(report.recommendation, 'negative')
})

test('preserves served counts, invalid suffix, and the last common checkpoint after a partial response', () => {
	const input = buildComparisonInput(buildAuditFixture())
	const aggregate = {
		...input.aggregate,
		failures: ['usage incomplete'],
		rows: input.aggregate.rows
			.slice(0, 19)
			.map((row, index) =>
				index === 18 ? { ...row, partial: true, resource: ['usage'] as const } : row,
			),
		observations: input.aggregate.observations
			.slice(0, 19)
			.map((entry, index) => (index === 18 ? { ...entry, complete: false } : entry)),
	}
	assert.equal(countCompleteGoals(aggregate), 18)
	const report = new Comparison().build({ ...input, aggregate })
	assert.equal(report.valid, false)
	assert.equal(report.recommendation, 'inconclusive')
	assert.deepEqual(report.served, { records: 32, aggregate: 19 })
	assert.equal(report.common, 4)
	assert.equal(report.suffix.aggregate[0], 'goal-16')
	assert.equal(report.final?.valid, false)
	assert.equal(report.final?.acceptable.aggregate.low, 2)
	assert.ok(report.failures.includes('aggregate: usage incomplete'))
})

test('empty treatment and exact-half exposure remain inconclusive despite positive outcomes', () => {
	const input = buildComparisonInput(buildAuditFixture())
	for (const limit of [0, 8]) {
		const aggregate = {
			...input.aggregate,
			observations: input.aggregate.observations.map((entry, index) => ({
				...entry,
				exposed: index % 16 < limit,
			})),
		}
		const report = new Comparison().build({ ...input, aggregate })
		assert.equal(report.recommendation, 'inconclusive')
		assert.equal(
			report.intervals.every((interval) => !interval.exposure.majority),
			true,
		)
	}
})

test('a final-interval decline prevents an overall positive conditional recommendation', () => {
	const fixture = buildAuditFixture()
	const judgment = {
		...fixture.judgment,
		labels: {
			...fixture.judgment.labels,
			labels: fixture.judgment.labels.labels.map((label) => {
				const key = fixture.blind.keys.find((entry) => entry.id === label.id)
				if (key?.control !== undefined || key === undefined || Number(key.goal.slice(5)) < 16)
					return label
				return {
					...label,
					atoms: label.atoms.map((atom) => ({
						...atom,
						verdict:
							key.arm === 'records' && Number(key.goal.slice(5)) < 24
								? ('pass' as const)
								: ('fail' as const),
					})),
				}
			}),
		},
	}
	const report = new Comparison().build(buildComparisonInput({ ...fixture, judgment }))
	assert.equal(report.overall?.gain.low, 8)
	assert.equal(report.final?.gain.high, -8)
	assert.equal(report.recommendation, 'negative')
})

test('aggregate-only critical regression blocks the conditional recommendation', () => {
	const fixture = buildAuditFixture()
	const key = fixture.blind.keys.find(
		(entry) => entry.control === undefined && entry.arm === 'aggregate',
	)
	assert.ok(key)
	const judgment = {
		...fixture.judgment,
		labels: {
			...fixture.judgment.labels,
			labels: fixture.judgment.labels.labels.map((label) =>
				label.id === key.id
					? {
							...label,
							critical: label.critical.map((entry) =>
								entry.rule === SUSTAINED_CONTROLS.fabricated ? { ...entry, violated: true } : entry,
							),
						}
					: label,
			),
		},
	}
	const report = new Comparison().build(buildComparisonInput({ ...fixture, judgment }))
	assert.equal(report.recommendation, 'negative')
	assert.equal(report.overall?.critical.aggregate, 1)
	assert.equal(report.overall?.regressions.length, 1)
})

test('an unaccepted selection needs no fabricated runs, packets, or labels', () => {
	const fixture = buildAuditFixture()
	assert.ok(fixture.input.selection)
	const { chosen: _chosen, ...selection } = fixture.input.selection
	const report = new Comparison().inconclusive(
		{ ...selection, accepted: false, failures: ['no feasible candidate'] },
		AUDIT_REFERENCE,
	)
	assert.equal(report.recommendation, 'inconclusive')
	assert.equal(report.packet, undefined)
	assert.equal(report.labels, undefined)
	assert.deepEqual(report.costs, [])
	assert.throws(
		() => new Comparison().inconclusive({ ...selection, chosen: 'q4' }, AUDIT_REFERENCE),
		/actual pair/,
	)
})

test('summary exposure cannot select omitted originals or erase prior-product ages', () => {
	const fixture = buildAuditFixture()
	const rubric = fixture.input.oracle.goals.at(-1)
	assert.ok(rubric)
	const run = {
		...fixture.input.aggregate,
		observations: fixture.input.aggregate.observations.map((entry) => ({
			...entry,
			selected: [],
			omitted: [...entry.sources, ...entry.products],
			exposed: true,
		})),
	}
	const coverage = collectAuditCoverage(run, rubric)
	assert.equal(
		coverage.every((entry) => !entry.selected),
		true,
	)
	assert.equal(coverage.find((entry) => entry.id === 'source:source-0')?.age, 7)
	assert.equal(coverage.find((entry) => entry.id === 'product:goal-0')?.age, 7)
	assert.equal(coverage.find((entry) => entry.id === 'product:goal-30')?.required, true)
})

test('deduplicates generation aliases and preserves missing usage and overlapping wall fields', () => {
	const costs = {
		...AUDIT_COSTS,
		wire: [
			{
				phase: 'calibration' as const,
				role: 'summarizer',
				requests: 1,
				wall: 10,
				prompt: 0,
				completion: 0,
				missing: 1,
			},
		],
	}
	const preparation = {
		identity: 'generation:one',
		phase: 'generation' as const,
		files: [AUDIT_REFERENCE],
		costs,
		failures: ['usage absent'],
	}
	const readings = collectPreparations([
		preparation,
		{ ...preparation, files: [{ path: 'fit.json', hash: 'b'.repeat(64) }] },
		preparation,
	])
	assert.equal(readings.length, 1)
	assert.equal(readings[0]?.files.length, 2)
	assert.deepEqual(readings[0]?.costs, costs)
	assert.deepEqual(readings[0]?.failures, ['usage absent'])
	assert.throws(
		() => collectPreparations([preparation, { ...preparation, costs: { ...costs, elapsed: 20 } }]),
		/conflicting preparation identity/,
	)
	assert.throws(
		() =>
			collectPreparations([
				preparation,
				{ ...preparation, files: [{ ...AUDIT_REFERENCE, hash: 'd'.repeat(64) }] },
			]),
		/custody/,
	)
})

test('citations bind exact text and reject unknown references and empty quotations', () => {
	const fixture = buildAuditFixture()
	const item = fixture.blind.packet.items[0]
	assert.ok(item)
	assert.equal(readAuditCitation(item, `product|${item.product}`), 'product')
	assert.throws(() => readAuditCitation(item, 'product|'), /empty evidence/)
	assert.throws(() => readAuditCitation(item, 'unknown|Inert'), /unbound/)
})

test('shared paired-selection validation refuses changed initial plans and permits later scale differences', () => {
	const input = buildComparisonInput(buildAuditFixture())
	const aggregate = {
		...input.aggregate,
		picks: input.aggregate.picks.map((pick) => ({ ...pick, digest: 'different-plan' })),
	}
	const report = new Comparison().build({ ...input, aggregate })
	assert.equal(report.valid, false)
	assert.equal(report.recommendation, 'inconclusive')
	assert.ok(report.failures.includes('initial paired selection or calibrated gauge differs'))
	assert.equal(report.final?.valid, false)
	const drift = new Comparison().build({
		...input,
		aggregate: {
			...input.aggregate,
			rows: input.aggregate.rows.map((row) => ({ ...row, scale: 2 })),
		},
	})
	assert.equal(drift.valid, true)
	assert.deepEqual(drift.failures, [])
	assert.equal(drift.recommendation, new Comparison().build(input).recommendation)
	assert.deepEqual(drift.final, new Comparison().build(input).final)
})

test('keeps exposed maintained transitions, retained versions, and absent categories separate', () => {
	const input = buildComparisonInput(buildAuditFixture())
	const aggregate: SustainedRun = {
		...input.aggregate,
		picks: [
			...input.aggregate.picks,
			{
				goal: 'goal-0',
				pass: 1,
				sequence: 2,
				briefing: '',
				digest: 'inert-plan',
				tail: [],
				instructions: {},
				scale: 1,
				aggregates: [
					{
						topic: 'account',
						prose: 'Earlier supported state.',
						state: {
							version: 1,
							goal: 'goal-0',
							point: 0,
							sources: [
								{
									id: 'source-0',
									sentence: 0,
									role: 'user',
									text: 'First source.',
									day: '2026-01-01',
								},
							],
						},
					},
				],
			},
			{
				goal: 'goal-4',
				pass: 1,
				sequence: 3,
				briefing: '',
				digest: 'inert-plan',
				tail: [],
				instructions: {},
				scale: 1,
				aggregates: [
					{
						topic: 'account',
						prose: 'Retained supported state.',
						state: {
							version: 1,
							goal: 'goal-4',
							point: 1,
							sources: [
								{
									id: 'source-1',
									sentence: 0,
									role: 'user',
									text: 'Changed source.',
									day: '2026-01-02',
								},
							],
						},
					},
				],
			},
		],
	}
	const report = new Comparison().build({ ...input, aggregate })
	assert.deepEqual(report.maintenance[1], {
		arm: 'aggregate',
		chains: [
			{
				topic: 'account',
				before: 'goal-0',
				after: 'goal-4',
				prior: 1,
				version: 1,
				retained: true,
				sources: ['source-0', 'source-1'],
				transitions: ['correction'],
			},
		],
		absent: ['arrival', 'repetition', 'withdrawal', 'supersession', 'tool'],
		journal: [],
	})
})

test('keeps missing usage and actual failed requests without inventing retry allocations or summed wall time', () => {
	const input = buildComparisonInput(buildAuditFixture())
	const records: SustainedRun = {
		...input.records,
		requests: [
			{
				started: 1,
				finished: 2,
				sequence: 1,
				role: 'agent',
				goal: 'goal-0',
				sent: true,
				request: {},
				prompt: 5,
				failures: [],
				wall: 10,
			},
		],
	}
	const aggregate: SustainedRun = {
		...input.aggregate,
		requests: [
			{
				started: 1,
				finished: 2,
				sequence: 1,
				role: 'judge',
				goal: 'goal-0',
				sent: true,
				request: {},
				prompt: 7,
				failures: ['usage'],
				wall: 12,
			},
		],
		journal: [
			{ event: 'agree', goal: 'goal-0', wall: 15, cached: false },
			{ event: 'change', goal: 'goal-1', wall: 2, cached: true },
		],
	}
	const reading = measureAuditCosts(aggregate)
	assert.deepEqual(reading.total, { prompt: 7, completion: 0, missing: 1 })
	assert.equal(reading.failed.length, 1)
	assert.deepEqual(reading.support, [
		{ event: 'agree', goal: 'goal-0', wall: 15, cached: false },
		{ event: 'change', goal: 'goal-1', wall: 2, cached: true },
	])
	const report = new Comparison().build({ ...input, records, aggregate })
	assert.deepEqual(report.incremental, { prompt: 2, completion: 0, missing: 2 })
	assert.equal(report.costs[1]?.reading.elapsed, 10)
	assert.equal(report.costs[1]?.reading.stage, 6)
	assert.equal(report.costs[1]?.reading.flush, 5)
})
