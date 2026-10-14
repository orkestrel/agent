import type { Message } from '../../vendor/agent-0.0.30-trimmed/index.js'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isRecord } from '@orkestrel/contract'
import { mkdirSync, mkdtempSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { ADMISSION_LIMIT, HARNESS } from '../constants.js'
import { estimateMessages } from '../../vendor/agent-0.0.30-trimmed/index.js'
import { isMessageRole } from '../helpers.js'
import { replayAdmission } from './setupAdmission.js'

describe('archived records messages with explicit l6 wire caps', () => {
	it('preserves archived messages through empty, rejected, and all-cut treatment while explicitly capping previously uncapped decisions at 512', async () => {
		const parent = resolve(HARNESS, '..', '..', '..', '..', 'tmp', 'units', 'aggregate-admission')
		mkdirSync(parent, { recursive: true })
		const root = mkdtempSync(join(parent, 'replay-'))
		const control = await replayAdmission(join(root, 'records'), {
			arm: 'records',
			prose: '',
			allowance: 555,
			agree: true,
			complete: true,
		})
		assert.equal(control.requests.length, 40)
		assert.equal(control.rows.length, 12)
		assert.deepEqual(control.requests, control.expected)
		assert.throws(() =>
			assert.deepEqual(
				control.requests,
				control.expected.map((text, index) =>
					index === 0
						? text.replace('operations assistant', 'unrelated changed instruction')
						: text,
				),
			),
		)
		for (const [name, prose, allowance, agree] of [
			['empty', '', 555, true],
			['rejected', 'The standing rule applies to this topic.', 555, false],
			['cut', 'The standing rule applies to this topic.', 1, true],
		] as const) {
			const run = await replayAdmission(join(root, name), {
				arm: 'aggregate',
				prose,
				allowance,
				agree,
				complete: true,
			})
			assert.deepEqual(
				run.requests,
				control.expected,
				`${name}: raw bodies including the calibration and flush prefix`,
			)
			assert.equal(run.rows.length, 12)
			for (const served of run.rows) {
				assert.ok(isRecord(served))
				assert.deepEqual(served.rendered, [])
				assert.equal(served.summary, 0)
			}
			const row = run.rows[0]
			assert.ok(isRecord(row))
			assert.deepEqual(row.rendered, [])
			assert.equal(row.summary, 0)
			const own = control.picks[0]
			const other = run.picks[0]
			assert.ok(isRecord(own) && isRecord(other))
			assert.deepEqual(other.tail, own.tail)
			assert.equal(other.briefing, own.briefing)
			assert.ok(
				Array.isArray(other.tail) &&
					other.tail.some((message: unknown) => isRecord(message) && message.index === 33),
			)
			if (name === 'cut') assert.ok(Array.isArray(row.cut) && row.cut.length > 0)
			else assert.ok(Array.isArray(row.withheld) && row.withheld.length > 0)
			assert.ok(
				run.builds.some(
					(build) =>
						isRecord(build) &&
						build.event === 'build' &&
						build.status === (name === 'cut' ? 'current' : 'stale'),
				),
			)
		}
		const first = control.expected[3]
		assert.ok(first !== undefined)
		const heading = first.replace(
			'## Instructions\\n\\n',
			'## Instructions\\n\\n### Topic summaries\\n\\n',
		)
		assert.notEqual(heading, first, 'heading-only bytes fail the same identity oracle')
	})

	it('cuts accepted whole entries using the complete provider request price including fixed tool overhead', async () => {
		const parent = resolve(HARNESS, '..', '..', '..', '..', 'tmp', 'units', 'aggregate-admission')
		mkdirSync(parent, { recursive: true })
		const root = mkdtempSync(join(parent, 'ceiling-'))
		const run = await replayAdmission(root, {
			arm: 'aggregate',
			prose: 'The standing rule applies to this topic. '.repeat(40),
			allowance: 3000,
			agree: true,
		})
		const row = run.rows[0]
		assert.ok(isRecord(row) && Array.isArray(row.cut) && row.cut.length > 0)
		const request: unknown = JSON.parse(run.requests[3] ?? '')
		assert.ok(isRecord(request) && Array.isArray(request.messages))
		const messages: readonly Message[] = request.messages.map((message: unknown, at: number) => {
			assert.ok(
				isRecord(message) && isMessageRole(message.role) && typeof message.content === 'string',
			)
			return { id: String(at), role: message.role, content: message.content }
		})
		assert.ok(estimateMessages(messages) * run.gauge.scale + run.gauge.overhead <= ADMISSION_LIMIT)
		const candidate = [
			...messages,
			{
				id: 'oversize',
				role: 'system' as const,
				content: 'The standing rule applies to this topic. '.repeat(40),
			},
		]
		assert.ok(estimateMessages(candidate) * run.gauge.scale + run.gauge.overhead > ADMISSION_LIMIT)
	})
})
