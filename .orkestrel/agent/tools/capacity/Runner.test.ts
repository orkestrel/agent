import { strict as assert } from 'node:assert'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { CAPACITY_BUILD } from './constants.ts'
import {
	buildCapacityFixture,
	collectCapacityReading,
	hashCapacityFile,
	readCapacityJSON,
	readCapacityCount,
	readCapacityProof,
	writeCapacityJSON,
} from './helpers.ts'
import { parseCapacityOptions } from './parsers.ts'
import { Qualifier } from './Qualifier.ts'
import { Runner } from './Runner.ts'
import { isCapacityFaultless } from './validators.ts'

test('run faults require an empty string collection while numeric expenditure remains strict', () => {
	assert.equal(isCapacityFaultless([]), true)
	assert.equal(isCapacityFaultless(['retained transport fault']), false)
	for (const value of [undefined, null, 0, '', {}, [0], ['fault', undefined]])
		assert.equal(isCapacityFaultless(value), false)
	assert.equal(readCapacityCount(0), 0)
	assert.equal(readCapacityCount(512), 512)
	assert.throws(() => readCapacityCount([]), /missing or invalid measured count/)
	assert.throws(() => readCapacityCount(['fault']), /missing or invalid measured count/)
})

test('plan materializes identical public custody without contacting an unavailable URL; refuses existing output', async () => {
	const scratch = mkdtempSync(resolve('tmp/units/capacity-plan-'))
	try {
		const initial = join(scratch, 'initial'),
			extended = join(scratch, 'extended')
		assert.equal(
			await new Qualifier(
				parseCapacityOptions(['--out', initial, '--url', 'http://127.0.0.1:1', '--plan']),
			).execute(),
			0,
		)
		assert.equal(
			await new Qualifier(
				parseCapacityOptions([
					'--out',
					extended,
					'--url',
					'http://127.0.0.1:1',
					'--plan',
					'--profile',
					'extended',
				]),
			).execute(),
			0,
		)
		assert.equal(
			hashCapacityFile(join(initial, 'runtime.json')).hash,
			hashCapacityFile(join(extended, 'runtime.json')).hash,
		)
		assert.equal(
			hashCapacityFile(join(initial, 'oracle.json')).hash,
			hashCapacityFile(join(extended, 'oracle.json')).hash,
		)
		assert.equal(readCapacityJSON(join(initial, 'plan.json')).qualified, false)
		await assert.rejects(
			new Qualifier(
				parseCapacityOptions(['--out', initial, '--url', 'http://127.0.0.1:1', '--plan']),
			).execute(),
			/EEXIST/,
		)
	} finally {
		rmSync(scratch, { recursive: true })
	}
})

test('public fixture has coherent synthetic identifiers, correction boundary and fixed horizon', () => {
	const { runtime, oracle } = buildCapacityFixture()
	assert.equal(runtime.days.length, 1)
	assert.equal(runtime.seed.length, 13)
	assert.equal(runtime.goals.length, 4)
	assert.deepEqual(
		runtime.goals.map((goal) => goal.after),
		[12, 12, 12, 12],
	)
	assert.equal(runtime.lookups[0]?.from, 6)
	assert.equal(runtime.topics.length, 3)
	for (const arrival of runtime.seed.slice(1))
		assert.ok(arrival.content.length > 2300 && arrival.content.length < 3000)
	assert.equal(oracle.runtime, runtime.id)
})

test('wire metadata counts fresh usage and detects supplied thinking without retaining product text', () => {
	const reading = collectCapacityReading(
		[
			{
				sent: true,
				role: 'agent',
				prompt: 120,
				completion: 35,
				reason: 'stop',
				status: 200,
				failures: [],
				request: { options: { num_ctx: 12288, num_predict: 4096 }, think: true },
				response: JSON.stringify({
					message: { thinking: 'synthetic reasoning', content: 'synthetic response' },
					done: true,
				}),
			},
			{
				sent: true,
				role: 'summarizer',
				prompt: 100,
				completion: 20,
				reason: 'stop',
				status: 200,
				failures: [],
				request: { options: { num_ctx: 12288, num_predict: 2048 }, think: false },
			},
			{ sent: false, role: 'agent', error: 'admission refusal', failures: [] },
		],
		[{ lookups: { calls: 1, repeats: 1 } }],
		[{ event: 'compact' }, { event: 'collapse' }],
	)
	assert.equal(reading.calls, 2)
	assert.equal(reading.tokens, 275)
	assert.equal(reading.thinking, true)
	assert.equal(reading.lookups, 1)
	assert.equal(reading.folds, 1)
	assert.equal(reading.roles.summarizer, 1)
	assert.ok(!JSON.stringify(reading).includes('synthetic response'))
})

test('missing summary usage and retained wire failures refuse qualification metadata', () => {
	assert.throws(
		() =>
			collectCapacityReading(
				[{ sent: true, role: 'summarizer', status: 200, failures: [] }],
				[],
				[],
			),
		/measured count/,
	)
	assert.throws(
		() =>
			collectCapacityReading(
				[{ sent: true, role: 'agent', status: 400, failures: ['context'] }],
				[],
				[],
			),
		/wire request failed/,
	)
})

test('missing or mismatched receipt prevents all child scheduling and output creation', async () => {
	const scratch = mkdtempSync(resolve('tmp/units/capacity-proof-'))
	try {
		const out = join(scratch, 'execute')
		await assert.rejects(
			new Qualifier(parseCapacityOptions(['--out', out, '--url', 'http://127.0.0.1:1'])).execute(),
			/--proof/,
		)
		const report = join(scratch, 'report.json'),
			receipt = join(scratch, 'proof.json')
		writeCapacityJSON(report, { passed: true })
		writeCapacityJSON(receipt, {
			passed: true,
			build: { path: CAPACITY_BUILD, hash: '0'.repeat(64) },
			report: hashCapacityFile(report),
		})
		assert.throws(() => readCapacityProof(receipt))
		await assert.rejects(
			new Qualifier(
				parseCapacityOptions(['--out', out, '--url', 'http://127.0.0.1:1', '--proof', receipt]),
			).execute(),
		)
		assert.throws(() => readFileSync(join(out, 'plan.json')))
	} finally {
		rmSync(scratch, { recursive: true })
	}
})

test('real child nonzero exit preserves exact result and output', async () => {
	const scratch = mkdtempSync(resolve('tmp/units/capacity-child-'))
	try {
		const child = join(scratch, 'child.ts'),
			journal = join(scratch, 'journal')
		writeFileSync(
			child,
			"process.stdout.write('retained evidence\\n')\nprocess.stderr.write('failure evidence\\n')\nprocess.exitCode = 7\n",
			{ flag: 'wx' },
		)
		mkdirSync(journal)
		const result = await new Runner().execute({
			args: [child],
			out: journal,
			deadline: Date.now() + 5000,
		})
		assert.equal(result.code, 7)
		assert.equal(result.expired, false)
		assert.equal(readFileSync(join(journal, 'stdout.log'), 'utf8'), 'retained evidence\n')
		assert.equal(readCapacityJSON(join(journal, 'exit.json')).code, 7)
	} finally {
		rmSync(scratch, { recursive: true })
	}
})

test('real stalled child is terminated at its finite deadline and expired launches are refused', async () => {
	const scratch = mkdtempSync(resolve('tmp/units/capacity-deadline-'))
	try {
		const child = join(scratch, 'child.ts'),
			journal = join(scratch, 'journal')
		writeFileSync(child, "process.stdout.write('ready\\n')\nsetInterval(() => {}, 1000)\n", {
			flag: 'wx',
		})
		mkdirSync(journal)
		const runner = new Runner()
		const result = await runner.execute({ args: [child], out: journal, deadline: Date.now() + 500 })
		assert.equal(result.expired, true)
		assert.notEqual(result.code, 0)
		assert.equal(result.error, undefined)
		const pid = result.pid
		if (pid === undefined) assert.fail('child pid absent')
		assert.throws(() => process.kill(pid, 0))
		await assert.rejects(
			runner.execute({
				args: [child],
				out: join(scratch, 'not-launched'),
				deadline: Date.now() - 1,
			}),
			/deadline exhausted/,
		)
	} finally {
		rmSync(scratch, { recursive: true })
	}
})
