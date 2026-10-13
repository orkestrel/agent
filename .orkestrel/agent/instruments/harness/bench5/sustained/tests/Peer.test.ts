import type { AggregateSource } from '../../types.js'
import type { MatrixBudget, MatrixRequest } from '../../matrix/types.js'
import { it } from 'node:test'
import assert from 'node:assert/strict'
import { isRecord } from '@orkestrel/contract'
import { createOllamaJudge, renderJudgePrompt } from '../../../vendor/ollama/index.js'
import { MICA_MODEL, MICA_SYSTEM, MICA_CONTEXT, MICA_CALIBRATION } from '../../constants.js'
import { AGREE_QUESTION, FOCUS_QUESTION } from '../../aggregates/constants.js'
import { buildSupportPlan } from '../../aggregates/helpers.js'
import { Peer } from './Peer.js'
import { readWireReading } from '../../helpers.js'
import { readRequestOutcome } from '../../matrix/helpers.js'

it('separates complete usage, measured context refusal, and missing-usage operational fault', async () => {
	const peer = new Peer()
	const url = await peer.start()
	try {
		const body = {
			model: MICA_MODEL,
			prompt: renderJudgePrompt(
				'The standing rule applies to this topic.',
				AGREE_QUESTION,
				MICA_SYSTEM,
			),
			stream: false,
			options: { num_ctx: MICA_CONTEXT, num_predict: 1 },
		}
		const budget: MatrixBudget = {
			ceiling: MICA_CONTEXT,
			reserve: 1,
			window: MICA_CONTEXT,
			predict: 1,
		}
		const completed = await fetch(`${url}/api/generate`, {
			method: 'POST',
			body: JSON.stringify(body),
		})
		const completeRaw = await completed.text()
		peer.boundary = true
		const refused = await fetch(`${url}/api/generate`, {
			method: 'POST',
			body: JSON.stringify(body),
		})
		const refusedRaw = await refused.text()
		peer.boundary = false
		peer.filingFailure = true
		const faulted = await fetch(`${url}/api/generate`, {
			method: 'POST',
			body: JSON.stringify(body),
		})
		const faultRaw = await faulted.text()
		const completeReading = readWireReading({ body }, { text: completeRaw })
		const refusedReading = readWireReading({ body }, { text: refusedRaw })
		const faultReading = readWireReading({ body }, { text: faultRaw })
		assert.equal(completeReading.complete, true)
		assert.equal(completeReading.prompt, 50)
		assert.equal(completeReading.completion, 1)
		assert.equal(refusedReading.complete, true)
		assert.equal(faultReading.complete, true)
		assert.equal(faultReading.prompt, undefined)
		assert.equal(faultReading.completion, undefined)
		const evidence: MatrixRequest = {
			started: 0,
			finished: 1,
			sequence: 1,
			role: 'judge',
			sent: true,
			request: body,
			response: completeRaw,
			status: completed.status,
			prompt: completeReading.prompt,
			completion: completeReading.completion,
			reason: completeReading.reason,
			failures: [],
			wall: 1,
		}
		assert.equal(readRequestOutcome(evidence, budget), 'complete')
		assert.equal(
			readRequestOutcome(
				{
					...evidence,
					response: refusedRaw,
					status: refused.status,
					prompt: refusedReading.prompt,
					completion: refusedReading.completion,
					reason: refusedReading.reason,
				},
				budget,
			),
			'refused',
			'complete boundary usage must produce measured refusal',
		)
		assert.equal((refusedReading.prompt ?? 0) + (refusedReading.completion ?? 0), MICA_CONTEXT)
		assert.equal(
			readRequestOutcome(
				{
					...evidence,
					response: faultRaw,
					status: faulted.status,
					prompt: faultReading.prompt,
					completion: faultReading.completion,
					reason: faultReading.reason,
				},
				budget,
			),
			'fault',
			'missing usage must remain operational',
		)
		assert.deepEqual(peer.calls, [body, body, body])
	} finally {
		await peer.destroy()
	}
})

it('recognizes both current contextual support questions only for the exact synthetic candidate', async () => {
	const peer = new Peer()
	const url = await peer.start()
	try {
		const judge = createOllamaJudge({
			model: MICA_MODEL,
			system: MICA_SYSTEM,
			calibration: { temperature: MICA_CALIBRATION },
			options: { num_ctx: MICA_CONTEXT },
			url,
		})
		const sources: readonly AggregateSource[] = [
			{
				id: 'standing-rule',
				sentence: 0,
				role: 'user',
				day: '2026-10-11',
				text: 'The standing rule applies to this topic.',
			},
		]
		const supported = buildSupportPlan('The standing rule applies to this topic.', sources)
		assert.deepEqual(
			new Set(supported.components.map((component) => component.question.instructions)),
			new Set([FOCUS_QUESTION.instructions, AGREE_QUESTION.instructions]),
		)
		for (const component of supported.components) {
			const result = await judge.ask(
				{ state: component.state, questions: { question: component.question } },
				new AbortController().signal,
			)
			const answer = result.answers.question
			assert.ok(answer?.form === 'noul')
			assert.ok(answer.noul > 0.99, `${component.id} must accept the supported candidate`)
			const request = peer.calls.at(-1)
			assert.ok(isRecord(request) && typeof request.prompt === 'string')
			assert.ok(request.prompt.includes(`Question: ${component.question.instructions}\n`))
			assert.ok(
				request.prompt.includes('\n "candidate": "The standing rule applies to this topic."'),
			)
		}
		const contradictory = buildSupportPlan(
			'The standing rule does not apply to this topic.',
			sources,
		)
		assert.deepEqual(contradictory.sources, supported.sources)
		assert.deepEqual(
			new Set(contradictory.components.map((component) => component.question.instructions)),
			new Set([FOCUS_QUESTION.instructions, AGREE_QUESTION.instructions]),
		)
		for (const component of contradictory.components) {
			const result = await judge.ask(
				{ state: component.state, questions: { question: component.question } },
				new AbortController().signal,
			)
			const answer = result.answers.question
			assert.ok(answer?.form === 'noul')
			assert.ok(answer.noul < 0.01, `${component.id} must reject the contradictory candidate`)
		}
		const guard = supported.components.find((component) => component.id === 'guard')
		assert.ok(guard)
		const obsolete = await judge.ask(
			{
				state: guard.state,
				questions: {
					question: {
						...AGREE_QUESTION,
						instructions: 'Does the summary agree with the evidence?',
					},
				},
			},
			new AbortController().signal,
		)
		const answer = obsolete.answers.question
		assert.ok(answer?.form === 'noul')
		assert.ok(answer.noul < 0.01, 'the obsolete support question must remain negative')
	} finally {
		await peer.destroy()
	}
})
