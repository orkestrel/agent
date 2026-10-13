import { it } from 'node:test'
import type { MatrixDevelopment, MatrixExecution, MatrixOutcome } from '../types.js'
import type { CallRole } from '../../types.js'
import type { SustainedExecution } from '../../sustained/types.js'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
	buildBudget,
	readCapacity,
	readRequestOutcome,
	listCapacityFailures,
	listCapacityFiles,
	listResourceFailures,
	matchesCappedSummary,
	readResponseOutcome,
} from '../helpers.js'
import { isMatrixBudget, isMatrixRequest } from '../validators.js'
import { MODELS, SAMPLER } from '../../constants.js'
import { FLUSH_SYSTEM, shapeBody } from '../../Driver.js'
import { buildCapacityFreeze, writeCapacityRequest } from './helpers.js'

it('admits only explicitly permitted measured capped summaries and preserves every hard-stop boundary', () => {
	const directory = mkdtempSync(join(tmpdir(), 'capacity-summary-'))
	try {
		const original = buildCapacityFreeze(directory)
		const frozen = { ...original, configuration: { ...original.configuration, predict: 160 } }
		const reference = frozen.deployment
		const policy: MatrixDevelopment = {
			phase: 'development',
			frozen: reference,
			calibration: reference,
			diagnosis: reference,
			labels: reference,
			packet: reference,
			generation: reference,
			resource: reference,
			full: reference,
			agree: 0.67,
			change: 0.56,
			selection: 'highest-grid-majority-occurrences-and-identities',
			continuation: 'failed-goal-after-xml-function-parameter-error',
			withhold: true,
			limitation: 'seed-candidates-do-not-certify-diverged-history',
			paired: buildBudget(512),
			expanded: buildBudget(512),
		}
		const execution: MatrixExecution = {
			protocol: 'l6',
			phase: 'development',
			key: 'q2',
			think: false,
			arm: 'aggregate',
			copy: 1,
			frozen: reference,
			development: reference,
			budget: policy.paired,
		}
		const body = {
			model: frozen.summarizer.model,
			think: false,
			truncate: false,
			options: { ...frozen.summarizer.sampler, num_predict: 160 },
			messages: [],
		}
		const response = {
			done: true,
			done_reason: 'length',
			prompt_eval_count: 625,
			eval_count: 160,
			message: { role: 'assistant', content: 'The standing rule applies through 2026-' },
		}
		const request = writeCapacityRequest(directory, {
			role: 'summarizer',
			request: body,
			response: JSON.stringify(response),
		})
		assert.equal(readRequestOutcome(request, policy.paired, frozen), 'refused')
		assert.equal(matchesCappedSummary(request, frozen, execution, policy, false), true)
		const study: SustainedExecution = {
			protocol: 'e1',
			key: 'q2',
			think: false,
			arm: 'aggregate',
			phase: 'development',
			frozen: reference,
			resource: reference,
			runtime: reference,
			budget: policy.paired,
			policy: reference,
			limits: {
				calls: 1,
				tokens: 1000,
				retries: 0,
				wall: 1000,
				goals: 1,
				derivation: 'fixture',
				evidence: [reference],
			},
		}
		const route = { qualified: reference, withhold: true }
		assert.equal(matchesCappedSummary(request, frozen, study, route, false), true)
		assert.equal(
			matchesCappedSummary(request, frozen, { ...study, phase: 'evaluation' }, route, false),
			true,
		)
		assert.equal(
			matchesCappedSummary(request, frozen, { ...study, phase: 'filing' }, route, false),
			false,
		)
		assert.equal(
			matchesCappedSummary(request, frozen, { ...study, policy: undefined }, route, false),
			false,
		)
		assert.equal(
			matchesCappedSummary(request, frozen, study, { ...route, withhold: false }, false),
			false,
		)
		assert.equal(matchesCappedSummary(request, frozen, study, route, true), false)
		assert.equal(matchesCappedSummary(request, frozen, study, route, false, 'earlier stop'), false)
		for (const changed of [
			{ sent: false },
			{ status: 500 },
			{ error: 'connection closed' },
			{ role: 'agent' as const },
			{ failures: ['transport'] as const },
			{ response: '{"done":true' },
			{ response: JSON.stringify({ ...response, done: false }) },
			{ response: JSON.stringify({ ...response, error: 'upstream failure' }) },
			{ response: JSON.stringify({ ...response, prompt_eval_count: undefined }) },
			{ response: JSON.stringify({ ...response, eval_count: undefined }) },
			{ response: JSON.stringify({ ...response, truncated: true }) },
			{ response: JSON.stringify({ ...response, truncation: true }) },
			{ response: JSON.stringify({ ...response, prompt_eval_count: 2912 }) },
			{ response: JSON.stringify({ ...response, eval_count: 161 }) },
			{ response: JSON.stringify({ ...response, eval_count: 159 }) },
			{ response: JSON.stringify({ ...response, done_reason: 'stop' }) },
			{ request: { ...body, model: 'unbound' } },
			{ request: { ...body, think: true } },
			{ request: { ...body, truncate: true } },
			{ request: { ...body, options: { ...body.options, seed: 8 } } },
			{ request: { ...body, options: { ...body.options, num_ctx: 4096 } } },
			{ request: { ...body, options: { ...body.options, num_predict: 161 } } },
		])
			assert.equal(
				matchesCappedSummary({ ...request, ...changed }, frozen, execution, policy, false),
				false,
			)
		for (const count of [-1, 1.5, Infinity, NaN, '625', null])
			assert.equal(
				matchesCappedSummary(
					{ ...request, response: JSON.stringify({ ...response, prompt_eval_count: count }) },
					frozen,
					execution,
					policy,
					false,
				),
				false,
			)
		for (const withhold of [undefined, false])
			assert.equal(
				matchesCappedSummary(request, frozen, execution, { ...policy, withhold }, false),
				false,
			)
		assert.equal(matchesCappedSummary(request, frozen, execution, undefined, false), false)
		assert.equal(matchesCappedSummary(request, frozen, undefined, policy, false), false)
		assert.equal(matchesCappedSummary(request, frozen, execution, policy, true), false)
		assert.equal(
			matchesCappedSummary(request, frozen, execution, policy, false, 'earlier stop'),
			false,
		)
		for (const phase of ['resource', 'full', 'pilot', 'evaluation'] as const)
			assert.equal(
				matchesCappedSummary(request, frozen, { ...execution, phase }, policy, false),
				false,
			)
		for (const cap of [0, -1, Infinity, NaN])
			assert.equal(
				matchesCappedSummary(
					request,
					{ ...frozen, configuration: { ...frozen.configuration, predict: cap } },
					execution,
					policy,
					false,
				),
				false,
			)
		for (const context of [0, -1, Infinity, NaN])
			assert.equal(
				matchesCappedSummary(
					request,
					{
						...frozen,
						summarizer: {
							...frozen.summarizer,
							sampler: { ...frozen.summarizer.sampler, num_ctx: context },
						},
					},
					execution,
					policy,
					false,
				),
				false,
			)
		assert.equal(
			matchesCappedSummary(
				request,
				{ ...frozen, summarizer: { ...frozen.summarizer, think: true } },
				execution,
				policy,
				false,
			),
			false,
		)
		const mixed =
			JSON.stringify({ ...response, truncated: true }) +
			'\n' +
			JSON.stringify({ error: 'later upstream error' })
		assert.equal(readResponseOutcome(mixed), 'fault')
		assert.equal(
			readRequestOutcome({ ...request, response: mixed }, policy.paired, frozen),
			'fault',
		)
		assert.equal(
			matchesCappedSummary({ ...request, response: mixed }, frozen, execution, policy, false),
			false,
		)
		assert.equal(readResponseOutcome(JSON.stringify({ truncated: true })), 'refused')
		assert.equal(readResponseOutcome(JSON.stringify({ done: true })), 'complete')
	} finally {
		rmSync(directory, { recursive: true, force: true })
	}
})

it('requires observed allocation, raw integer usage, exact controls, and the frozen strict ceiling', () => {
	const directory = mkdtempSync(join(tmpdir(), 'capacity-proof-'))
	try {
		const frozen = buildCapacityFreeze(directory)
		const budget = buildBudget(512)
		const request = writeCapacityRequest(directory)
		assert.equal(readRequestOutcome(request, budget, frozen), 'complete')
		assert.deepEqual(listCapacityFailures([request], frozen, budget), [])
		assert.deepEqual(listCapacityFiles([request]), [request.capacity?.evidence])
		assert.equal(readRequestOutcome({ ...request, capacity: undefined }, budget, frozen), 'fault')
		assert.equal(
			readRequestOutcome(
				{ ...request, response: '{"done":true,"done_reason":"stop"}' },
				budget,
				frozen,
			),
			'fault',
		)
		assert.equal(
			readRequestOutcome({ ...request, response: '{"done":false}' }, budget, frozen),
			'fault',
		)
		assert.equal(
			readRequestOutcome(
				{ ...request, response: '{"error":"context exceeded"}', status: 500 },
				budget,
				frozen,
			),
			'fault',
		)
		for (const count of [-1, 1.5, Infinity, NaN, '12', null]) {
			const response = JSON.stringify({
				done: true,
				done_reason: 'stop',
				prompt_eval_count: count,
				eval_count: 1,
			})
			assert.equal(readRequestOutcome({ ...request, response }, budget, frozen), 'fault')
		}
		const cases: ReadonlyArray<readonly [number, number, MatrixOutcome]> = [
			[2559, 512, 'complete'],
			[2560, 512, 'refused'],
			[2558, 513, 'refused'],
		]
		for (const [prompt, completion, outcome] of cases) {
			const response = JSON.stringify({
				done: true,
				done_reason: 'stop',
				prompt_eval_count: prompt,
				eval_count: completion,
				prompt_eval_cached: prompt,
			})
			assert.equal(readRequestOutcome({ ...request, response }, budget, frozen), outcome)
		}
		assert.equal(
			readRequestOutcome(
				{ ...request, response: request.response?.replace('stop', 'length') },
				budget,
				frozen,
			),
			'refused',
		)
		assert.equal(
			readRequestOutcome(
				{
					...request,
					response: request.response?.replace('"done":true', '"done":true,"truncated":true'),
				},
				budget,
				frozen,
			),
			'refused',
		)
		for (const controls of [
			{ shift: undefined, truncate: false },
			{ shift: false, truncate: undefined },
		]) {
			const changed = writeCapacityRequest(directory, {
				request: {
					model: MODELS.q2,
					...controls,
					options: { ...SAMPLER, num_ctx: 3072, num_predict: 512 },
				},
			})
			assert.equal(readRequestOutcome(changed, budget, frozen), 'fault')
		}
		const clamped = writeCapacityRequest(
			directory,
			{},
			{
				models: [
					{
						name: MODELS.q2,
						digest: '1'.repeat(64),
						runner: 'llamacpp',
						context_length: 2048,
						expires_at: '2099-01-01T00:00:00Z',
					},
				],
			},
		)
		assert.ok(clamped.capacity)
		assert.equal(
			readRequestOutcome(
				{ ...clamped, capacity: { ...clamped.capacity, window: 2048 } },
				budget,
				frozen,
			),
			'fault',
		)
		assert.equal(
			readRequestOutcome(clamped, budget, frozen),
			'fault',
			'requested W copied into A does not match raw snapshot',
		)
		assert.equal(isMatrixBudget({ ...budget, ceiling: undefined }), false)
		assert.equal(isMatrixRequest({ ...request, started: undefined }), false)
	} finally {
		rmSync(directory, { recursive: true, force: true })
	}
})

it('admits finite full trajectories with B above metadata C and refuses adapting C to the output', () => {
	const directory = mkdtempSync(join(tmpdir(), 'capacity-full-'))
	try {
		const frozen = buildCapacityFreeze(directory)
		const budget = { ...buildBudget(512), window: 1000000, ceiling: 262144 }
		const request = writeCapacityRequest(
			directory,
			{
				request: {
					model: MODELS.q2,
					shift: false,
					truncate: false,
					think: false,
					options: { ...SAMPLER, num_ctx: budget.window, num_predict: 512 },
				},
			},
			{
				models: [
					{
						name: MODELS.q2,
						digest: '1'.repeat(64),
						runner: 'llamacpp',
						context_length: 262144,
						expires_at: '2099-01-01T00:00:00Z',
					},
				],
			},
		)
		assert.ok(request.capacity)
		const observed = { ...request, capacity: { ...request.capacity, window: 262144 } }
		assert.equal(readRequestOutcome(observed, budget, frozen), 'complete')
		assert.deepEqual(listCapacityFailures([observed], frozen, budget), [])
		assert.equal(readRequestOutcome(observed, { ...budget, ceiling: 3072 }, frozen), 'fault')
		assert.equal(
			readRequestOutcome(observed, { ...budget, ceiling: budget.window }, frozen),
			'fault',
		)
	} finally {
		rmSync(directory, { recursive: true, force: true })
	}
})

it('rejects stale, foreign, ambiguous, reordered and failed snapshots while retaining the raw inference', () => {
	const directory = mkdtempSync(join(tmpdir(), 'capacity-custody-'))
	try {
		const frozen = buildCapacityFreeze(directory)
		const budget = buildBudget(512)
		const entry = {
			name: MODELS.q2,
			digest: '1'.repeat(64),
			runner: 'llamacpp',
			context_length: 3072,
			expires_at: '2099-01-01T00:00:00Z',
		}
		for (const models of [
			[],
			[entry, entry],
			[{ ...entry, name: MODELS.q4 }],
			[{ ...entry, digest: '9'.repeat(64) }],
			[{ ...entry, runner: 'unknown' }],
			[{ ...entry, expires_at: '1970-01-01T00:00:00Z' }],
		]) {
			const request = writeCapacityRequest(directory, {}, { models })
			assert.equal(readRequestOutcome(request, budget, frozen), 'fault')
		}
		for (const snapshot of [
			{ sequence: 2 },
			{ request: 'other' },
			{ buffered: 19 },
			{ started: 19 },
			{ finished: 31 },
			{ status: 500 },
			{ error: 'metadata connection closed' },
			{ raw: 'partial', hash: 'invalid' },
		]) {
			const request = writeCapacityRequest(directory, {}, undefined, snapshot)
			assert.equal(readRequestOutcome(request, budget, frozen), 'fault')
			assert.ok(request.response?.includes('prompt_eval_count'))
		}
		const request = writeCapacityRequest(directory)
		assert.throws(() => readCapacity({ ...request, role: 'judge' }, frozen))
		assert.throws(() => readCapacity({ ...request, sequence: 2 }, frozen))
		assert.ok(
			listCapacityFailures([request, { ...request, sequence: 2 }], frozen, budget).some((failure) =>
				failure.includes('order'),
			),
		)
		assert.ok(
			listCapacityFailures([request], frozen, { ...budget, window: 9999 }).some((failure) =>
				failure.includes('sampler'),
			),
		)
	} finally {
		rmSync(directory, { recursive: true, force: true })
	}
})

it('limits the length-finish exception to intentional one-token nonthinking gauge calibration', () => {
	const directory = mkdtempSync(join(tmpdir(), 'capacity-gauge-'))
	try {
		const frozen = buildCapacityFreeze(directory)
		const budget = buildBudget(512)
		const body: unknown = JSON.parse(
			shapeBody(
				'agent',
				JSON.stringify({
					model: MODELS.q2,
					options: { ...SAMPLER, num_predict: 512 },
					think: true,
				}),
				true,
			),
		)
		const gauge = writeCapacityRequest(directory, {
			goal: undefined,
			request: body,
			response: JSON.stringify({
				done: true,
				done_reason: 'length',
				prompt_eval_count: 200,
				eval_count: 1,
			}),
		})
		assert.equal(readRequestOutcome(gauge, budget, frozen), 'complete')
		assert.deepEqual(
			listResourceFailures(
				'agent',
				body,
				gauge.response,
				budget,
				200,
				undefined,
				gauge.capacity,
				true,
			),
			[],
		)
		assert.equal(readRequestOutcome({ ...gauge, goal: 'decision' }, budget, frozen), 'fault')
		assert.equal(
			readRequestOutcome(
				{ ...gauge, response: gauge.response?.replace('"eval_count":1', '"eval_count":2') },
				budget,
				frozen,
			),
			'refused',
		)
		assert.equal(
			readRequestOutcome(
				{
					...gauge,
					response: gauge.response?.replace('"prompt_eval_count":200', '"prompt_eval_count":3071'),
				},
				budget,
				frozen,
			),
			'refused',
		)
		assert.equal(readRequestOutcome({ ...gauge, capacity: undefined }, budget, frozen), 'fault')
	} finally {
		rmSync(directory, { recursive: true, force: true })
	}
})

it('admits only successful intentional one-token nonthinking length-terminated flushes', () => {
	const directory = mkdtempSync(join(tmpdir(), 'capacity-flush-'))
	try {
		const frozen = buildCapacityFreeze(directory)
		const budget = buildBudget(512)
		const body = {
			model: MODELS.q2,
			think: false,
			options: { ...SAMPLER, num_ctx: 3072, num_predict: 1 },
			messages: [
				{ role: 'system', content: FLUSH_SYSTEM },
				{ role: 'user', content: '' },
			],
		}
		const response = {
			done: true,
			done_reason: 'length',
			prompt_eval_count: 22,
			eval_count: 1,
		}
		const flush = writeCapacityRequest(directory, {
			role: 'flush',
			request: body,
			response: JSON.stringify(response),
		})
		assert.equal(readRequestOutcome(flush, budget, frozen), 'complete')
		assert.equal(
			readRequestOutcome(
				{ ...flush, response: JSON.stringify({ ...response, done_reason: 'stop' }) },
				budget,
				frozen,
			),
			'complete',
		)
		for (const changes of [
			{ status: 500 },
			{ response: JSON.stringify({ ...response, done: false }) },
			{ response: JSON.stringify({ done: true, done_reason: 'length' }) },
			{ response: '{"done":true' },
		])
			assert.equal(readRequestOutcome({ ...flush, ...changes }, budget, frozen), 'fault')
		for (const changes of [
			{ response: JSON.stringify({ ...response, truncated: true }) },
			{ response: JSON.stringify({ ...response, prompt_eval_count: 3071 }) },
			{ response: JSON.stringify({ ...response, eval_count: 0 }) },
			{ response: JSON.stringify({ ...response, eval_count: 2 }) },
			{ request: { ...body, options: { ...body.options, num_predict: 2 } } },
			{ request: { ...body, think: true } },
		])
			assert.equal(readRequestOutcome({ ...flush, ...changes }, budget, frozen), 'refused')
		const roles: readonly CallRole[] = ['judge', 'summarizer']
		for (const role of roles)
			assert.equal(readRequestOutcome({ ...flush, role }, budget, frozen), 'refused')
		const decision = writeCapacityRequest(directory, { response: JSON.stringify(response) })
		assert.equal(readRequestOutcome(decision, budget, frozen), 'refused')
	} finally {
		rmSync(directory, { recursive: true, force: true })
	}
})
it('limits judge length completion to the exact raw single-token logprob protocol', () => {
	const directory = mkdtempSync(join(tmpdir(), 'capacity-judge-'))
	try {
		const frozen = buildCapacityFreeze(directory)
		const budget = buildBudget(512)
		const body = {
			model: MODELS.q2,
			raw: true,
			stream: false,
			logprobs: true,
			top_logprobs: 20,
			options: { num_ctx: 4096, num_predict: 1, temperature: 1 },
		}
		const response = {
			done: true,
			done_reason: 'length',
			response: 'No',
			prompt_eval_count: 805,
			eval_count: 1,
		}
		const judge = writeCapacityRequest(directory, {
			role: 'judge',
			request: body,
			response: JSON.stringify(response),
		})
		assert.equal(readRequestOutcome(judge, budget, frozen), 'complete')
		for (const changes of [
			{ sent: false },
			{ status: 500 },
			{ error: 'connection closed' },
			{ response: '{"done":true' },
			{ response: JSON.stringify({ ...response, done: false }) },
			{ response: JSON.stringify({ done: true, done_reason: 'length' }) },
			{ response: JSON.stringify({ ...response, prompt_eval_count: undefined }) },
			{ response: JSON.stringify({ ...response, eval_count: undefined }) },
		])
			assert.equal(readRequestOutcome({ ...judge, ...changes }, budget, frozen), 'fault')
		for (const changes of [
			{ response: JSON.stringify({ ...response, truncated: true }) },
			{ response: JSON.stringify({ ...response, truncation: true }) },
			{ response: JSON.stringify({ ...response, prompt_eval_count: 4095 }) },
			{ response: JSON.stringify({ ...response, eval_count: 0 }) },
			{ response: JSON.stringify({ ...response, eval_count: 2 }) },
			{ request: { ...body, raw: undefined } },
			{ request: { ...body, raw: false } },
			{ request: { ...body, stream: undefined } },
			{ request: { ...body, stream: true } },
			{ request: { ...body, logprobs: undefined } },
			{ request: { ...body, logprobs: false } },
			{ request: { ...body, top_logprobs: undefined } },
			{ request: { ...body, top_logprobs: 19 } },
			{ request: { ...body, options: undefined } },
			{ request: { ...body, options: { ...body.options, num_predict: 2 } } },
			{ request: { ...body, options: { ...body.options, temperature: 0 } } },
			{ request: { model: body.model, messages: [], options: body.options } },
		])
			assert.equal(readRequestOutcome({ ...judge, ...changes }, budget, frozen), 'refused')
		assert.equal(readRequestOutcome({ ...judge, role: 'summarizer' }, budget, frozen), 'refused')
		assert.equal(
			readRequestOutcome({ ...judge, request: { ...body, think: false } }, budget, frozen),
			'complete',
		)
	} finally {
		rmSync(directory, { recursive: true, force: true })
	}
})
