import type { SustainedAuditInput, SustainedKeys } from '../audit/types.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { isRecord } from '@orkestrel/contract'
import { Driver, parseFlags, shapeBody } from '../../Driver.js'
import { readJSON, readRows } from '../../helpers.js'
import { isMatrixResource, isMatrixRequest } from '../../matrix/validators.js'
import { listMatrixPairFailures } from '../../matrix/helpers.js'
import { readSustainedDirected, readDirectedPreparation } from '../directed/helpers.js'
import { readSustainedExecution, readSustainedBoundary } from '../helpers.js'
import { isSustainedDirected, isSustainedExecution } from '../validators.js'
import { Packet } from '../audit/Packet.js'
import { Comparison } from '../audit/Comparison.js'
import { verifyAuditIdentity } from '../audit/helpers.js'
import { isSustainedKeys } from '../audit/validators.js'
import { buildAuditFixture, buildComparisonInput } from '../../tests/sustained/audit/helpers.js'
import { AUDIT_REFERENCE } from '../../tests/sustained/audit/constants.js'
import { buildDirectedFixture } from './directed/helpers.js'

for (const think of [false, true])
	test(`admits directed thinking ${think} with sealed original custody and rejects altered inputs`, async () => {
		const fixture = buildDirectedFixture(think)
		assert.deepEqual(readSustainedDirected(fixture.path).directed, fixture.directed)
		assert.deepEqual(
			readSustainedExecution(join(fixture.directory, 'execution.json')).execution,
			fixture.execution,
		)
		const flags = [
			'--seed',
			'--live',
			'--study',
			join(fixture.directory, 'execution.json'),
			'--out',
			join(fixture.directory, 'unused-run'),
			'--url',
			'http://127.0.0.1:11435',
		]
		const parsed = parseFlags(flags)
		assert.ok(parsed.success)
		assert.equal(parsed.value.think, think)
		await assert.rejects(
			new Driver({ ...parsed.value, think: !think }).execute(),
			/effective directed/,
		)
		assert.equal(parseFlags([...flags, '--think', String(!think)]).success, false)
		assert.equal(parseFlags([...flags, '--reserve', think ? '512' : '1024']).success, false)
		assert.equal(isSustainedDirected({ ...fixture.directed, selection: AUDIT_REFERENCE }), false)
		assert.equal(
			isSustainedDirected({
				...fixture.directed,
				budget: { ...fixture.directed.budget, ignored: true },
			}),
			false,
		)
		assert.equal(isSustainedExecution({ ...fixture.execution, selection: AUDIT_REFERENCE }), false)
		assert.equal(
			isSustainedExecution({ ...fixture.execution, directed: undefined, think: true }),
			false,
		)
		for (const [name, altered, expected] of [
			[
				'budget',
				{ ...fixture.directed, budget: { ...fixture.directed.budget, reserve: 99 } },
				/budget/,
			],
			['mode', { ...fixture.directed, think: !think }, /invalid directed/],
			[
				'limits',
				{ ...fixture.directed, limits: { ...fixture.directed.limits, calls: 4097 } },
				/limits/,
			],
			[
				'runtime',
				{ ...fixture.directed, runtime: { ...fixture.directed.runtime, hash: '0'.repeat(64) } },
				/custody/,
			],
			[
				'fit',
				{
					...fixture.directed,
					transfer: {
						...fixture.directed.transfer,
						fit: { ...fixture.directed.transfer.fit, hash: '0'.repeat(64) },
					},
				},
				/custody/,
			],
			[
				'delta',
				{ ...fixture.directed, transfer: { ...fixture.directed.transfer, changes: [] } },
				/source delta/,
			],
		] as const) {
			const path = join(fixture.directory, `${name}.json`)
			writeFileSync(path, JSON.stringify(altered))
			assert.throws(() => readSustainedDirected(path), expected)
		}
		const archive = join(fixture.directory, 'altered-archive')
		cpSync(fixture.directed.transfer.archive, archive, { recursive: true })
		writeFileSync(join(archive, '001-Driver.ts'), 'altered original')
		const tampered = join(fixture.directory, 'archive.json')
		writeFileSync(
			tampered,
			JSON.stringify({ ...fixture.directed, transfer: { ...fixture.directed.transfer, archive } }),
		)
		assert.throws(() => readSustainedDirected(tampered), /custody mismatch/)
		const preparations = readDirectedPreparation(fixture.directed)
		assert.ok(preparations.some((entry) => entry.phase === 'generation'))
		assert.ok(preparations.some((entry) => entry.phase === 'matrix'))
		assert.ok(preparations.some((entry) => entry.costs.wire.some((role) => role.requests > 0)))
		const resource = readJSON(fixture.directed.transfer.resource.path)
		assert.ok(isMatrixResource(resource))
		const attempt = resource.attempts.at(-1)
		assert.ok(attempt)
		const requests = readRows(join(attempt.run, 'requests.jsonl'))
		assert.ok(requests.every(isMatrixRequest))
		const info = readJSON(join(attempt.run, 'run.json'))
		assert.ok(isRecord(info))
		const boundary = readSustainedBoundary(info, requests, fixture.execution, fixture.frozen)
		assert.equal(
			boundary.errors.some((error) => error.includes('thinking differs')),
			false,
		)
		const changed = requests.map((request) =>
			request.role === 'agent' && request.goal !== undefined && isRecord(request.request)
				? { ...request, request: { ...request.request, think: !think } }
				: request,
		)
		assert.ok(
			readSustainedBoundary(info, changed, fixture.execution, fixture.frozen).errors.some((error) =>
				error.includes('thinking differs'),
			),
		)
		const body = JSON.stringify({
			model: fixture.frozen.decision.model,
			think,
			options: { num_predict: fixture.directed.budget.predict },
		})
		assert.equal(JSON.parse(shapeBody('agent', body, true)).think, false)
		assert.equal(JSON.parse(shapeBody('agent', body, false)).think, think)
	})

test('retains directed blind products, actual receipts, suffixes, and comparison checks without ranked qualification', () => {
	const custody = buildDirectedFixture(true)
	const fixture = buildAuditFixture()
	const comparison = buildComparisonInput(fixture)
	const { selection: _selection, ...common } = fixture.input
	const directed = { ...custody.directed, runtime: AUDIT_REFERENCE }
	const input: SustainedAuditInput = {
		...common,
		directed,
		records: {
			...common.records,
			receipts: [
				{
					goal: 'goal-0',
					call: 'fixture-receipt',
					tool: 'lookup_order',
					arguments: { id: 'fixture' },
					success: false,
					content: 'Fixture lookup unavailable.',
					after: 0,
				},
			],
			execution: {
				...common.records.execution,
				selection: undefined,
				directed: AUDIT_REFERENCE,
				think: true,
			},
		},
		aggregate: {
			...common.aggregate,
			execution: {
				...common.aggregate.execution,
				selection: undefined,
				directed: AUDIT_REFERENCE,
				think: true,
			},
		},
	}
	const blind = new Packet().build(input, directed.blind)
	assert.deepEqual(
		blind.packet.items.map((item) => item.product),
		fixture.blind.packet.items.map((item) => item.product),
	)
	assert.ok(blind.packet.items.some((item) => item.receipts.length > 0))
	assert.ok(
		blind.packet.items.some((item) =>
			item.receipts.some(
				(receipt) => receipt.success === false && receipt.content === 'Fixture lookup unavailable.',
			),
		),
	)
	assert.ok(blind.packet.items.some((item) => item.earlier.length > 0))
	const { selection: _reference, ...keys } = fixture.judgment.keys
	const mapping: SustainedKeys = { ...keys, directed: AUDIT_REFERENCE }
	assert.equal(isSustainedKeys(mapping), true)
	assert.equal(isSustainedKeys({ ...mapping, selection: AUDIT_REFERENCE }), false)
	assert.doesNotThrow(() => verifyAuditIdentity(mapping, input, AUDIT_REFERENCE, AUDIT_REFERENCE))
	assert.throws(
		() =>
			verifyAuditIdentity(
				{ ...mapping, directed: { ...AUDIT_REFERENCE, hash: '0'.repeat(64) } },
				input,
				AUDIT_REFERENCE,
				AUDIT_REFERENCE,
			),
		/private keys/,
	)
	assert.throws(
		() =>
			verifyAuditIdentity(
				mapping,
				input,
				{ ...AUDIT_REFERENCE, hash: '0'.repeat(64) },
				AUDIT_REFERENCE,
			),
		/private keys/,
	)
	assert.throws(
		() =>
			verifyAuditIdentity(mapping, input, AUDIT_REFERENCE, {
				...AUDIT_REFERENCE,
				hash: '0'.repeat(64),
			}),
		/private keys/,
	)
	assert.deepEqual(listMatrixPairFailures(input.records, input.aggregate), [])
	assert.ok(
		listMatrixPairFailures(input.records, {
			...input.aggregate,
			gauge: { scale: 99, overhead: 99 },
		}).length > 0,
	)
	const report = new Comparison().build({ ...comparison, ...input, selection: undefined, blind })
	assert.equal(report.recommendation, 'conditional')
	assert.equal(report.selection, undefined)
	assert.deepEqual(report.directed, AUDIT_REFERENCE)
	assert.match(report.limitation, /transferred fixed matrix support/)
	assert.match(report.limitation, /calibration, flush, summarizer, and judge remain non-thinking/)
	const incomplete = new Comparison().build({
		...comparison,
		...input,
		selection: undefined,
		blind,
		aggregate: { ...input.aggregate, rows: input.aggregate.rows.slice(0, -1) },
	})
	assert.equal(incomplete.valid, false)
	assert.ok(incomplete.suffix.aggregate.length > 0)
	assert.throws(
		() =>
			new Packet().build(
				{
					...input,
					aggregate: {
						...input.aggregate,
						execution: {
							...input.aggregate.execution,
							directed: { ...AUDIT_REFERENCE, hash: '0'.repeat(64) },
						},
					},
				},
				31,
			),
		/custody/,
	)
})
