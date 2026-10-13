import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolve } from 'node:path'
import { readOracle, readRuntime } from '../../../endurance/helpers.js'
import { Packet } from '../../../sustained/audit/Packet.js'
import {
	collectAuditFacts,
	collectAuditObligations,
	computeAuditId,
} from '../../../sustained/audit/helpers.js'
import { buildAuditFixture, buildAuditRun } from './helpers.js'

test('randomizes reproducibly and keeps identity/control metadata only in private joins', () => {
	const fixture = buildAuditFixture()
	assert.deepEqual(new Packet().build(fixture.input, 31), fixture.blind)
	assert.notDeepEqual(
		new Packet().build(fixture.input, 32).packet.items.map((item) => item.id),
		fixture.blind.packet.items.map((item) => item.id),
	)
	assert.equal(new Set(fixture.blind.packet.items.map((item) => item.id)).size, 67)
	assert.equal(new Set(fixture.blind.keys.map((key) => key.batch)).size, 1)
	assert.deepEqual(Object.keys(fixture.blind.packet.items[0] ?? {}).sort(), [
		'earlier',
		'evidence',
		'facts',
		'id',
		'obligations',
		'point',
		'product',
		'receipts',
		'request',
		'rubric',
	])
	for (const batch of new Set(fixture.blind.keys.map((key) => key.batch)))
		assert.deepEqual(
			fixture.blind.keys
				.filter((key) => key.batch === batch && key.control !== undefined)
				.map((key) => key.control?.verdict)
				.sort(),
			['ambiguous', 'fabricated', 'stale'],
		)
})

test('retains actual earlier wrong work separately from external truth', () => {
	const fixture = buildAuditFixture()
	const records = {
		...fixture.input.records,
		rows: fixture.input.records.rows.map((row, index) =>
			index === 0 ? { ...row, reply: 'An earlier wrong answer.' } : row,
		),
	}
	const blind = new Packet().build({ ...fixture.input, records }, 31)
	const key = blind.keys.find((entry) => entry.arm === 'records' && entry.goal === 'goal-1')
	const item = blind.packet.items.find((entry) => entry.id === key?.id)
	assert.equal(item?.earlier[0]?.product, 'An earlier wrong answer.')
	assert.ok(item?.facts.every((fact) => fact.value !== 'An earlier wrong answer.'))
})

test('refuses missing earlier products, observations, source joins, and corrupt oracle identity', () => {
	const fixture = buildAuditFixture()
	assert.throws(
		() =>
			new Packet().build(
				{
					...fixture.input,
					records: { ...fixture.input.records, rows: fixture.input.records.rows.slice(1) },
				},
				31,
			),
		/missing earlier/,
	)
	assert.throws(
		() =>
			new Packet().build(
				{ ...fixture.input, records: { ...fixture.input.records, observations: [] } },
				31,
			),
		/missing product join/,
	)
	assert.throws(
		() =>
			new Packet().build(
				{
					...fixture.input,
					records: {
						...fixture.input.records,
						observations: fixture.input.records.observations.map((entry) => ({
							...entry,
							sources: [...entry.sources, 'source:absent'],
						})),
					},
				},
				31,
			),
		/missing external evidence/,
	)
	assert.throws(
		() =>
			new Packet().build(
				{ ...fixture.input, oracle: { ...fixture.input.oracle, runtime: 'foreign' } },
				31,
			),
		/oracle custody/,
	)
})

test('withholds future closure and supersession metadata while preserving ended history', () => {
	const fixture = buildAuditFixture()
	const early = collectAuditFacts(fixture.input.oracle, 0)
	assert.equal(early[0]?.until, undefined)
	const late = collectAuditFacts(fixture.input.oracle, 2)
	assert.equal(late[0]?.until, 1)
	assert.equal(late.at(-1)?.until, undefined)
	assert.equal(collectAuditObligations(fixture.input.oracle, 0)[0]?.closed, undefined)
	assert.deepEqual(collectAuditObligations(fixture.input.oracle, 0)[0]?.evidence, [])
	assert.equal(collectAuditObligations(fixture.input.oracle, 7)[0]?.closed, 7)
})

test('uses the real immutable evaluation reader and oracle checker for packet correspondence', () => {
	const root = resolve('.orkestrel/agent/instruments/units/aggregates/endurance')
	const runtime = readRuntime(resolve(root, 'runtime/evaluation.json'))
	const oracle = readOracle(resolve(root, 'private/evaluation.json'))
	const fixture = buildAuditFixture()
	const blind = new Packet().build(
		{
			...fixture.input,
			records: buildAuditRun(runtime, 'records'),
			aggregate: buildAuditRun(runtime, 'aggregate'),
			oracle,
		},
		31,
	)
	assert.equal(blind.keys.filter((key) => key.control === undefined).length, 192)
	const controls = blind.keys.filter((key) => key.control !== undefined)
	assert.equal(controls.length, oracle.controls.length)
	assert.equal(new Set(controls.map((key) => key.control?.id)).size, controls.length)
	assert.equal(new Set(blind.keys.map((key) => key.batch)).size, 1)
	for (const control of oracle.controls) {
		const matches = controls.filter((key) => key.control?.id === control.id)
		assert.equal(matches.length, 1)
		assert.equal(
			blind.packet.items.find((item) => item.id === matches[0]?.id)?.product,
			control.artifact,
		)
	}
	for (const run of [buildAuditRun(runtime, 'records'), buildAuditRun(runtime, 'aggregate')]) {
		for (const row of run.rows) {
			const id = computeAuditId(31, [fixture.input.reference.hash, run.path, row.goal])
			assert.equal(blind.packet.items.find((item) => item.id === id)?.product, row.reply)
		}
	}
	const key = blind.keys.find(
		(entry) => entry.goal === 'ev-13-2' && entry.arm === 'records' && entry.control === undefined,
	)
	const item = blind.packet.items.find((entry) => entry.id === key?.id)
	assert.ok(item?.earlier.length)
	assert.ok(item?.facts.some((fact) => fact.until !== undefined))
	assert.ok(item?.evidence.some((entry) => entry.id.startsWith('lookup:')))
	assert.deepEqual(item?.receipts, [])
})
