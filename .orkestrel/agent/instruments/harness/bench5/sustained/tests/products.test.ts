import { it } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isRecord } from '@orkestrel/contract'
import { MatrixPeer } from '../../tests/matrixFixture.js'
import { readRows } from '../../helpers.js'
import { readSustainedRun } from '../parsers.js'
import { readSustainedExecution } from '../helpers.js'
import { Peer } from './Peer.js'
import { prepareRuntimeFixture, runCommand } from './helpers.js'

it('keeps an empty measured-refusal suffix without inventing a product and rejects missing or changed produced replies', async () => {
	const parent = resolve('tmp/units/aggregate-product-fixtures')
	mkdirSync(parent, { recursive: true })
	const directory = mkdtempSync(join(parent, 'proof-'))
	const peer = new Peer()
	const matrix = new MatrixPeer()
	matrix.support = true
	const url = await peer.start()
	const matrixUrl = await matrix.start()
	try {
		const fixture = await prepareRuntimeFixture(directory, url, matrixUrl)
		assert.equal(
			await runCommand('sustained', [
				'development',
				'--frozen',
				fixture.frozen,
				'--resource',
				fixture.resource,
				'--pilot',
				join(directory, 'pilot/manifest.json'),
				'--runtime',
				fixture.runtime,
				'--classification',
				fixture.classification,
				'--fit',
				fixture.fit,
				'--out',
				join(directory, 'development'),
				'--live',
				'--url',
				url,
			]),
			0,
		)
		const baselinePath = join(directory, 'development/records/run')
		const baseline = readSustainedRun(baselinePath)
		assert.deepEqual(baseline.failures, [])
		const first = baseline.rows[0]
		const retained = readRows(join(baselinePath, 'rows.jsonl'))[0]
		assert.ok(first && first.reply !== '' && !first.partial)
		assert.ok(isRecord(retained) && typeof retained.last === 'number')
		const last = retained.last
		const calls = baseline.requests.filter(
			(request) => request.sent && request.sequence <= last,
		).length
		assert.equal(calls, last)
		assert.ok(
			baseline.requests.some(
				(request) => request.sequence === calls && request.goal === first.goal,
			),
		)
		const execution = readSustainedExecution(
			join(directory, 'development/records/execution.json'),
		).execution
		const limited = join(directory, 'limited-execution.json')
		writeFileSync(limited, JSON.stringify({ ...execution, limits: { ...execution.limits, calls } }))
		const output = join(directory, 'limited')
		assert.notEqual(
			await runCommand('bench', [
				'--run',
				'--live',
				'--study',
				limited,
				'--cache',
				join(directory, 'limited-cache'),
				'--out',
				output,
				'--url',
				url,
			]),
			0,
		)
		const refused = readSustainedRun(output)
		assert.equal(refused.status, 'failed')
		assert.equal(refused.rows.length, 2)
		const product = refused.rows[0]
		const suffix = refused.rows[1]
		assert.ok(product && product.reply !== '' && !product.partial)
		assert.ok(suffix && suffix.partial && suffix.reply === '')
		assert.equal(
			refused.messages.some(
				(message) => message.role === 'assistant' && message.goal === suffix.goal,
			),
			false,
		)
		assert.equal(refused.requests.filter((request) => request.sent).length, calls)
		assert.ok(
			refused.requests.some(
				(request) =>
					!request.sent &&
					request.goal === suffix.goal &&
					request.error?.includes('whole-trajectory limit reached'),
			),
		)
		assert.ok(
			refused.failures.some((failure) => failure.includes('whole-trajectory limit reached')),
		)
		assert.deepEqual(
			refused.errors,
			[],
			'authentic empty refusal must not become an operational product error',
		)
		const assistant = refused.messages.find(
			(message) =>
				message.role === 'assistant' &&
				message.goal === product.goal &&
				message.content === product.reply,
		)
		assert.ok(assistant)
		const messages = readRows(join(output, 'messages.jsonl'))
		assert.ok(messages.every(isRecord))
		for (const change of ['missing', 'changed']) {
			const control = join(directory, change)
			cpSync(output, control, { recursive: true, errorOnExist: true, force: false })
			const altered = messages
				.filter((message) => change !== 'missing' || message.id !== assistant.id)
				.map((message) =>
					message.id === assistant.id
						? { ...message, content: 'altered retained assistant product' }
						: message,
				)
			writeFileSync(
				join(control, 'messages.jsonl'),
				altered.map((message) => JSON.stringify(message)).join('\n') + '\n',
			)
			const reading = readSustainedRun(control)
			assert.ok(
				reading.failures.some((failure) => failure.includes('whole-trajectory limit reached')),
			)
			assert.ok(
				reading.errors.includes(
					`${product.goal}: response differs from actual conversation product`,
				),
				`${change} produced reply must retain exact product custody`,
			)
		}
		const earlier = join(directory, 'earlier')
		cpSync(output, earlier, { recursive: true, errorOnExist: true, force: false })
		const rows = readRows(join(output, 'rows.jsonl'))
		assert.ok(rows.every(isRecord))
		writeFileSync(
			join(earlier, 'rows.jsonl'),
			rows
				.map((row, at) => JSON.stringify(at === 0 ? { ...row, partial: true, reply: '' } : row))
				.join('\n') + '\n',
		)
		assert.ok(
			readSustainedRun(earlier).errors.includes(
				`${product.goal}: response differs from actual conversation product`,
			),
			'an earlier empty partial row must not borrow a later refusal',
		)
		console.log(`PRODUCT_FIXTURE ${directory}`)
	} finally {
		await peer.destroy()
		await matrix.destroy()
	}
})
