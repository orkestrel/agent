import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { COPIES_DIR } from '../constants.js'
import { computeDigest } from '../helpers.js'
import { collectTransitions } from '../transitions/helpers.js'

describe('source transition census', () => {
	it('freezes copy-1 opportunities without claiming observed maintenance coverage', () => {
		const text = readFileSync(join(COPIES_DIR, 'v1.json'), 'utf8')
		const scenario: unknown = JSON.parse(text)
		const rows = collectTransitions(scenario)
		assert.deepEqual(rows, collectTransitions(scenario))
		assert.deepEqual([...new Set(rows.map((row) => row.transition))].sort(), [
			'arrival',
			'correction',
			'repetition',
			'supersession',
			'tool',
			'withdrawal',
		])
		assert.deepEqual(
			rows
				.filter((row) => row.transition === 'tool')
				.map((row) => [row.index, row.prior, row.before, row.after]),
			[
				[81, [36], 47, 89],
				[135, [65], 133, 137],
			],
		)
		assert.deepEqual(
			rows.find((row) => row.transition === 'withdrawal' && row.index === 122)?.prior,
			[112, 113],
		)
		assert.deepEqual(
			rows.filter((row) => row.transition === 'repetition').map((row) => row.index),
			[3, 5, 49, 89, 113],
		)
		assert.equal(rows.find((row) => row.index === 3)?.before, undefined)
		assert.deepEqual(
			rows.find((row) => row.transition === 'correction' && row.index === 103)?.prior,
			[99, 102],
		)
		mkdirSync('tmp/units', { recursive: true })
		writeFileSync(
			'tmp/units/aggregate-transition-census.json',
			`${JSON.stringify({ copy: 1, digest: computeDigest(text), evidence: 'scenario opportunities; no observed live coverage', annotations: 'bounded repetition and withdrawal examples; truth-derived arrivals, corrections, supersessions, and scheduled tool versions', rows }, null, 2)}\n`,
		)
	})

	it('refuses an empty or changed source population instead of reporting a passing census', () => {
		assert.throws(() => collectTransitions({ seed: [], goals: [], lookups: [] }), /annotation/)
		assert.throws(() => collectTransitions({}), /requires/)
		const text = readFileSync(join(COPIES_DIR, 'v1.json'), 'utf8')
		assert.throws(
			() =>
				collectTransitions(
					JSON.parse(text.replace('Noted: LATE10 takes', 'Changed: LATE10 takes')),
				),
			/annotation 49/,
		)
	})
})
