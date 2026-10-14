import type { SustainedItem } from '../../../sustained/audit/types.js'
import type { SustainedReceipt } from '../../../sustained/types.js'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { readOracle } from '../../../endurance/helpers.js'
import { hashFile } from '../../../refit/helpers.js'
import { Adjudication } from '../../../sustained/audit/Adjudication.js'
import { SUSTAINED_CONTROLS } from '../../../sustained/audit/constants.js'
import {
	computeAcceptability,
	verifyAuditIdentity,
	verifyOracleCustody,
} from '../../../sustained/audit/helpers.js'
import { isSustainedKeys, isSustainedLabels } from '../../../sustained/audit/validators.js'
import { amendAuditObligation, buildAuditFixture, withAuditFiles } from './helpers.js'
import { AUDIT_REFERENCE } from './constants.js'

test('refuses a structurally valid same-ID edited oracle against frozen byte custody', () => {
	withAuditFiles((directory) => {
		const original = resolve(
			'.orkestrel/agent/instruments/units/aggregates/endurance/private/evaluation.json',
		)
		const oracle = readOracle(original)
		const edited = join(directory, 'edited-oracle.json')
		writeFileSync(
			edited,
			JSON.stringify({
				...oracle,
				facts: oracle.facts.map((fact, index) =>
					index === 0 ? { ...fact, value: 'A changed external obligation.' } : fact,
				),
			}),
		)
		assert.equal(readOracle(edited).runtime, oracle.runtime)
		assert.doesNotThrow(() => verifyOracleCustody(hashFile(original), [hashFile(original)]))
		assert.throws(
			() => verifyOracleCustody(hashFile(edited), [hashFile(original)]),
			/oracle bytes differ/,
		)
	})
})

test('refuses a different workload manifest even when packet and oracle references are unchanged', () => {
	const fixture = buildAuditFixture()
	assert.doesNotThrow(() =>
		verifyAuditIdentity(fixture.judgment.keys, fixture.input, AUDIT_REFERENCE, AUDIT_REFERENCE),
	)
	assert.throws(
		() =>
			verifyAuditIdentity(
				{ ...fixture.judgment.keys, manifest: { ...AUDIT_REFERENCE, hash: 'b'.repeat(64) } },
				fixture.input,
				AUDIT_REFERENCE,
				AUDIT_REFERENCE,
			),
		/another workload manifest/,
	)
})

test('requires exact packet and key hashes plus every atom, critical rule, and obligation', () => {
	const { judgment } = buildAuditFixture()
	assert.equal(
		new Adjudication().read(judgment).batches.every((batch) => batch.valid),
		true,
	)
	assert.throws(
		() =>
			new Adjudication().read({
				...judgment,
				hashes: { ...judgment.hashes, keys: 'c'.repeat(64) },
			}),
		/custody/,
	)
	assert.throws(
		() =>
			new Adjudication().read({
				...judgment,
				labels: { ...judgment.labels, labels: judgment.labels.labels.slice(1) },
			}),
		/missing, duplicate/,
	)
	assert.throws(
		() =>
			new Adjudication().read({
				...judgment,
				labels: {
					...judgment.labels,
					labels: [...judgment.labels.labels, ...judgment.labels.labels],
				},
			}),
		/missing, duplicate/,
	)
	for (const field of ['atoms', 'critical', 'obligations'] as const)
		assert.throws(
			() =>
				new Adjudication().read({
					...judgment,
					labels: {
						...judgment.labels,
						labels: judgment.labels.labels.map((label, index) =>
							index === 0 ? { ...label, [field]: [] } : label,
						),
					},
				}),
			/missing, duplicate/,
		)
})

test('missed stale controls invalidate the shared packet batch', () => {
	const { judgment } = buildAuditFixture()
	const key = judgment.keys.keys.find((entry) => entry.control?.verdict === 'stale')
	assert.ok(key)
	const result = new Adjudication().read({
		...judgment,
		labels: {
			...judgment.labels,
			labels: judgment.labels.labels.map((label) =>
				label.id === key.id
					? {
							...label,
							critical: label.critical.map((critical) => ({ ...critical, violated: false })),
						}
					: label,
			),
		},
	})
	assert.equal(result.batches.find((batch) => batch.id === key.batch)?.valid, false)
	assert.equal(result.batches.length, 1)
	assert.equal(result.batches.filter((batch) => batch.valid).length, 0)
	assert.ok(
		result.batches.some((batch) =>
			batch.failures.some((failure) => failure.includes('missed stale control')),
		),
	)
})

test('missed ambiguous controls and identity leaks invalidate the affected audit batch', () => {
	const { judgment } = buildAuditFixture()
	const key = judgment.keys.keys.find((entry) => entry.control?.verdict === 'ambiguous')
	assert.ok(key)
	const result = new Adjudication().read({
		...judgment,
		labels: {
			...judgment.labels,
			labels: judgment.labels.labels.map((label) =>
				label.id === key.id
					? {
							...label,
							atoms: label.atoms.map((atom) => ({ ...atom, verdict: 'pass' })),
							ambiguous: [],
						}
					: label,
			),
		},
	})
	assert.equal(result.batches.find((batch) => batch.id === key.batch)?.valid, false)
	const leaked = new Adjudication().read({
		...judgment,
		labels: {
			...judgment.labels,
			labels: judgment.labels.labels.map((label) =>
				label.id === key.id ? { ...label, leaks: label.ambiguous } : label,
			),
		},
	})
	assert.ok(
		leaked.batches.some((batch) =>
			batch.failures.some((failure) => failure.includes('identity leak')),
		),
	)
})

test('missed fabricated controls and unavailable controls invalidate the shared packet batch', () => {
	const { judgment } = buildAuditFixture()
	const key = judgment.keys.keys.find((entry) => entry.control?.verdict === 'fabricated')
	assert.ok(key)
	const missed = new Adjudication().read({
		...judgment,
		labels: {
			...judgment.labels,
			labels: judgment.labels.labels.map((label) =>
				label.id === key.id
					? {
							...label,
							critical: label.critical.map((entry) => ({ ...entry, violated: false })),
						}
					: label,
			),
		},
	})
	assert.equal(missed.batches.length, 1)
	assert.equal(missed.batches[0]?.valid, false)
	assert.ok(
		missed.batches[0]?.failures.some((failure) => failure.includes('missed fabricated control')),
	)
	const unavailable = new Adjudication().read({
		...judgment,
		packet: {
			...judgment.packet,
			items: judgment.packet.items.filter((entry) => entry.id !== key.id),
		},
		keys: { ...judgment.keys, keys: judgment.keys.keys.filter((entry) => entry.id !== key.id) },
		labels: {
			...judgment.labels,
			labels: judgment.labels.labels.filter((entry) => entry.id !== key.id),
		},
	})
	assert.equal(unavailable.batches[0]?.valid, false)
	assert.ok(unavailable.batches[0]?.failures.includes('unavailable fabricated control context'))
	assert.throws(
		() =>
			new Adjudication().read({
				...judgment,
				labels: {
					...judgment.labels,
					labels: judgment.labels.labels.map((label) =>
						label.id === key.id ? { ...label, id: 'unknown' } : label,
					),
				},
			}),
		/unknown label/,
	)
})

test('refuses unrelated obligations and fabricated evidence citations', () => {
	const { judgment } = buildAuditFixture()
	assert.throws(
		() =>
			new Adjudication().read({
				...judgment,
				labels: {
					...judgment.labels,
					labels: judgment.labels.labels.map((label, index) =>
						index === 0
							? {
									...label,
									obligations: label.obligations.map((obligation) => ({
										...obligation,
										id: 'unrelated',
									})),
								}
							: label,
					),
				},
			}),
		/obligation/,
	)
	assert.throws(
		() =>
			new Adjudication().read({
				...judgment,
				labels: {
					...judgment.labels,
					labels: judgment.labels.labels.map((label, index) =>
						index === 0
							? {
									...label,
									critical: label.critical.map((critical) => ({
										...critical,
										evidence: ['product|words that were never written'],
									})),
								}
							: label,
					),
				},
			}),
		/unbound/,
	)
})

test('does not accept earlier work as factual support or as an external completion receipt', () => {
	const { judgment } = buildAuditFixture()
	const key = judgment.keys.keys.find(
		(entry) => entry.goal === 'goal-1' && entry.arm === 'aggregate' && entry.control === undefined,
	)
	const item = judgment.packet.items.find((entry) => entry.id === key?.id)
	assert.ok(item)
	const earlier = item.earlier[0]
	assert.ok(earlier)
	const evidence = [`product|${item.product}`, `product:${earlier.id}|${earlier.product}`]
	assert.throws(
		() =>
			new Adjudication().read({
				...judgment,
				labels: {
					...judgment.labels,
					labels: judgment.labels.labels.map((label) =>
						label.id === item.id
							? { ...label, atoms: label.atoms.map((atom) => ({ ...atom, evidence })) }
							: label,
					),
				},
			}),
		/factual credit/,
	)
	assert.throws(
		() =>
			new Adjudication().read({
				...judgment,
				labels: {
					...judgment.labels,
					labels: judgment.labels.labels.map((label) =>
						label.id === item.id
							? {
									...label,
									obligations: label.obligations.map((obligation) => ({
										...obligation,
										disposition: 'completed',
										evidence,
									})),
								}
							: label,
					),
				},
			}),
		/completion evidence/,
	)
})

test('preserves ambiguity bounds and makes evidenced critical violations fully unacceptable', () => {
	const { judgment } = buildAuditFixture()
	const key = judgment.keys.keys.find(
		(entry) => entry.arm === 'aggregate' && entry.control === undefined,
	)
	const item = judgment.packet.items.find((entry) => entry.id === key?.id)
	const label = judgment.labels.labels.find((entry) => entry.id === key?.id)
	assert.ok(item && label)
	assert.deepEqual(computeAcceptability(item, label), { low: 1, high: 1 })
	assert.deepEqual(
		computeAcceptability(item, {
			...label,
			atoms: label.atoms.map((atom, index) =>
				index === 0 ? { ...atom, verdict: 'ambiguous' } : atom,
			),
			ambiguous: [`product|${item.product}`],
		}),
		{ low: 0, high: 1 },
	)
	assert.deepEqual(
		computeAcceptability(item, {
			...label,
			critical: label.critical.map((entry) =>
				entry.rule === SUSTAINED_CONTROLS.fabricated ? { ...entry, violated: true } : entry,
			),
		}),
		{ low: 0, high: 0 },
	)
})

test('closed guards reject coercible outcome arrays, missing limitation fields, and hostile getters', () => {
	const { judgment } = buildAuditFixture()
	assert.equal(isSustainedLabels(judgment.labels), true)
	assert.equal(isSustainedKeys(judgment.keys), true)
	assert.equal(
		isSustainedLabels({
			...judgment.labels,
			labels: judgment.labels.labels.map((label) => ({
				...label,
				atoms: label.atoms.map((atom) => ({ ...atom, verdict: ['pass'] })),
			})),
		}),
		false,
	)
	assert.equal(
		isSustainedLabels({
			...judgment.labels,
			labels: judgment.labels.labels.map(({ leaks: _leaks, ...label }) => label),
		}),
		false,
	)
	assert.equal(
		isSustainedLabels(
			Object.defineProperty({}, 'authority', {
				enumerable: true,
				get() {
					throw new Error('hostile getter')
				},
			}),
		),
		false,
	)
})

test('completion requires the exact arrived closure and refuses a foreign available source', () => {
	const fixture = buildAuditFixture()
	const early = fixture.blind.packet.items.find((entry) => entry.rubric.goal === 'goal-0')
	const late = fixture.blind.packet.items.find((entry) => entry.rubric.goal === 'goal-31')
	assert.ok(early && late)
	assert.equal(early.obligations[0]?.closed, undefined)
	assert.equal(late.obligations[0]?.closed, 7)
	const opening = early.evidence.find((entry) => entry.id === 'source:source-0')
	const closing = late.evidence.find((entry) => entry.id === 'source:source-7')
	assert.ok(opening && closing)
	assert.throws(
		() =>
			new Adjudication().read(
				amendAuditObligation(fixture, early, 'completed', [
					`product|${early.product}`,
					`${opening.id}|${opening.content}`,
				]),
			),
		/completion evidence/,
	)
	assert.throws(
		() =>
			new Adjudication().read(
				amendAuditObligation(fixture, late, 'completed', [
					`product|${late.product}`,
					`${opening.id}|${opening.content}`,
				]),
			),
		/completion evidence/,
	)
	const evidence = [`product|${late.product}`, `${closing.id}|${closing.content}`]
	assert.doesNotThrow(() =>
		new Adjudication().read(amendAuditObligation(fixture, late, 'completed', evidence)),
	)
	const future = {
		...late,
		obligations: late.obligations.map((entry) => ({ ...entry, closed: late.point.after + 1 })),
	}
	assert.throws(
		() => new Adjudication().read(amendAuditObligation(fixture, future, 'completed', evidence)),
		/completion evidence/,
	)
	const foreign = {
		...late,
		obligations: late.obligations.map((entry) => ({ ...entry, evidence: ['source-0'] })),
	}
	assert.throws(
		() => new Adjudication().read(amendAuditObligation(fixture, foreign, 'completed', evidence)),
		/completion evidence/,
	)
})

test('completion receipts bind a required arrived lookup and the same obligation closure', () => {
	const fixture = buildAuditFixture()
	const late = fixture.blind.packet.items.find((entry) => entry.rubric.goal === 'goal-31')
	assert.ok(late)
	const receipt: SustainedReceipt = {
		goal: late.rubric.goal,
		call: 'filing-call',
		tool: 'lookup_order',
		arguments: { id: 'filing' },
		success: true,
		content: 'Filing has been received.',
		after: 7,
		version: 7,
	}
	const item: SustainedItem = {
		...late,
		evidence: [...late.evidence, { id: 'lookup:filing@7', content: receipt.content, shift: 8 }],
		receipts: [receipt],
		rubric: { ...late.rubric, lookups: [{ tool: receipt.tool, id: 'filing', from: 7 }] },
	}
	const evidence = [`product|${item.product}`, `receipt:${receipt.call}|${receipt.content}`]
	assert.doesNotThrow(() =>
		new Adjudication().read(amendAuditObligation(fixture, item, 'completed', evidence)),
	)
	for (const changed of [
		{ ...receipt, success: false },
		{ ...receipt, after: 6 },
		{ ...receipt, after: 8 },
		{ ...receipt, version: 6 },
		{ ...receipt, arguments: { id: 'unrelated' } },
		{ ...receipt, tool: 'lookup_customer' },
		{ ...receipt, content: `${receipt.content} Altered output.` },
	]) {
		assert.throws(
			() =>
				new Adjudication().read(
					amendAuditObligation(fixture, { ...item, receipts: [changed] }, 'completed', evidence),
				),
			/completion evidence/,
		)
	}
	assert.throws(
		() =>
			new Adjudication().read(
				amendAuditObligation(
					fixture,
					{ ...item, rubric: { ...item.rubric, lookups: [] } },
					'completed',
					evidence,
				),
			),
		/completion evidence/,
	)
	assert.throws(
		() =>
			new Adjudication().read(
				amendAuditObligation(
					fixture,
					{ ...item, obligations: item.obligations.map(({ closed: _closed, ...entry }) => entry) },
					'completed',
					evidence,
				),
			),
		/completion evidence/,
	)
	const earlier: SustainedItem = {
		...item,
		evidence: [...late.evidence, { id: 'lookup:filing@6', content: receipt.content, shift: 7 }],
		receipts: [{ ...receipt, after: 6, version: 6 }],
		rubric: { ...item.rubric, lookups: [{ tool: receipt.tool, id: 'filing', from: 6 }] },
	}
	assert.throws(
		() => new Adjudication().read(amendAuditObligation(fixture, earlier, 'completed', evidence)),
		/completion evidence/,
	)
})

test('open obligations allow product-only carry, miss, ambiguity and externally supported repair', () => {
	const fixture = buildAuditFixture()
	const item = fixture.blind.packet.items.find((entry) => entry.rubric.goal === 'goal-1')
	assert.ok(item)
	assert.equal(item.obligations[0]?.closed, undefined)
	const earlier = item.earlier[0]
	const source = item.evidence[0]
	assert.ok(earlier && source)
	const product = `product|${item.product}`
	const external = `${source.id}|${source.content}`
	const prior = `product:${earlier.id}|${earlier.product}`
	for (const disposition of ['carried', 'missed', 'ambiguous'] as const)
		assert.doesNotThrow(() =>
			new Adjudication().read(amendAuditObligation(fixture, item, disposition, [product])),
		)
	assert.doesNotThrow(() =>
		new Adjudication().read(
			amendAuditObligation(fixture, item, 'repaired', [product, external, prior]),
		),
	)
	assert.throws(
		() =>
			new Adjudication().read(amendAuditObligation(fixture, item, 'repaired', [product, prior])),
		/external evidence/,
	)
	assert.throws(
		() =>
			new Adjudication().read(amendAuditObligation(fixture, item, 'repaired', [product, external])),
		/earlier-work evidence/,
	)
})

test('an open obligation permits receipt-backed repair only with the earlier product', () => {
	const fixture = buildAuditFixture()
	const original = fixture.blind.packet.items.find((entry) => entry.rubric.goal === 'goal-1')
	assert.ok(original)
	assert.equal(original.obligations[0]?.closed, undefined)
	const earlier = original.earlier[0]
	assert.ok(earlier)
	const receipt: SustainedReceipt = {
		goal: original.rubric.goal,
		call: 'repair-call',
		tool: 'lookup_order',
		arguments: { id: 'filing' },
		success: true,
		content: 'The corrected filing address is available; filing remains open.',
		after: original.point.after,
		version: original.point.after,
	}
	const item: SustainedItem = {
		...original,
		receipts: [receipt],
		evidence: [
			...original.evidence,
			{
				id: `lookup:filing@${original.point.after}`,
				content: receipt.content,
				shift: original.point.shift,
			},
		],
		rubric: {
			...original.rubric,
			lookups: [{ tool: receipt.tool, id: 'filing', from: original.point.after }],
		},
	}
	const product = `product|${item.product}`
	const external = `receipt:${receipt.call}|${receipt.content}`
	const prior = `product:${earlier.id}|${earlier.product}`
	assert.doesNotThrow(() =>
		new Adjudication().read(
			amendAuditObligation(fixture, item, 'repaired', [product, external, prior]),
		),
	)
	assert.throws(
		() => new Adjudication().read(amendAuditObligation(fixture, item, 'repaired', [product])),
		/external evidence/,
	)
	assert.throws(
		() =>
			new Adjudication().read(amendAuditObligation(fixture, item, 'repaired', [product, external])),
		/earlier-work evidence/,
	)
})
