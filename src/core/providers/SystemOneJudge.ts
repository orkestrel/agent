import type {
	JudgeAnswer,
	JudgeRequest,
	JudgeResult,
	SystemOneJudgeOptions,
	SystemOneRequest,
} from '../types.js'
import { AgentJudge } from '../AgentJudge.js'
import { SYSTEM_ONE_PATH } from '../constants.js'
import { JudgeError } from '../errors.js'
import { extractSystemOneAnswer, extractSystemOneUsage, questionToSystemOne } from '../helpers.js'
import { isSystemOneAnswer, isSystemOneResponse } from '../validators.js'

/**
 * Carries judge questions over the System One protocol and derives answers from server distributions.
 *
 * @remarks
 * The caller supplies the server origin and model. Every question travels in one request.
 * Server measures are ignored; the response model is preserved.
 * `headers` supplies authentication through the shared judge engine.
 *
 * @example Asking a System One server a choice, a noul, and a score
 * ```ts
 * import { computeReading, createSystemOneJudge } from '@orkestrel/agent'
 *
 * const judge = createSystemOneJudge({ url: 'http://localhost:11434', model: 'tev1:0.8b' })
 * const result = await judge.ask(
 * 	{
 * 		state: 'Our checkout has returned 500 errors since 9am. I want a refund for today.',
 * 		questions: {
 * 			label: {
 * 				form: 'choice',
 * 				instructions: 'Which label fits this ticket?',
 * 				criteria: { billing: 'Payments and refunds', bug: 'Software errors', account: null },
 * 			},
 * 			refund: {
 * 				form: 'noul',
 * 				instructions: 'Does the customer ask for money back?',
 * 				criteria: {
 * 					true: 'The customer asks for a refund or for money back.',
 * 					false: 'The customer does not ask for money back.',
 * 				},
 * 			},
 * 			severity: {
 * 				form: 'score',
 * 				instructions: 'How severe is the reported issue?',
 * 				criteria: ['Cosmetic; no impact', 'Degraded, workaround exists', 'Blocking; no workaround'],
 * 			},
 * 		},
 * 	},
 * 	AbortSignal.timeout(30_000),
 * )
 * const readings = Object.fromEntries(
 * 	Object.entries(result.answers).map(([id, answer]) => [id, computeReading(answer)]),
 * )
 * result.model // 'tev1:0.8b' — the model the server named
 * result.usage // { prompt: 975, completion: 4, total: 979 }
 * readings.label // { winner: 'bug', probability: 0.9691, confidence: 0.9536 } to four decimals
 * readings.refund // { winner: 'true', probability: 0.9979, confidence: 0.9958 } to four decimals
 * readings.severity // { winner: '1', probability: 0.9494, confidence: 0.9241, score: 0.9919 } to four decimals
 * ```
 */
export class SystemOneJudge extends AgentJudge {
	constructor(options: SystemOneJudgeOptions) {
		super({ ...options, path: SYSTEM_ONE_PATH, batch: true })
	}

	/** Identifies the System One protocol. */
	readonly name = 'systemone'

	/**
	 * Projects the state and questions onto the System One request with the configured model.
	 *
	 * @param request - The state and questions keyed by caller id
	 * @returns The System One request body
	 */
	body(request: JudgeRequest): SystemOneRequest {
		return {
			state: request.state,
			model: this.model,
			questions: Object.fromEntries(
				Object.entries(request.questions).map(([id, question]) => [
					id,
					questionToSystemOne(question),
				]),
			),
		}
	}

	/**
	 * Decodes requested System One answers and reports the server model and available usage.
	 *
	 * @param value - The parsed response body
	 * @param request - The questions defining the expected answers
	 * @returns The decoded distributions, model, and available usage
	 * @throws JudgeError Thrown with code `PROTOCOL` for a malformed envelope or an invalid answer naming its question id
	 */
	read(value: unknown, request: JudgeRequest): JudgeResult {
		if (!isSystemOneResponse(value)) {
			throw new JudgeError('PROTOCOL', 'judge error: invalid System One response envelope')
		}
		const entries: Array<readonly [string, JudgeAnswer]> = []
		for (const [id, question] of Object.entries(request.questions)) {
			if (!Object.hasOwn(value.answers, id)) {
				throw new JudgeError('PROTOCOL', `judge error: question ${id} has no System One answer`)
			}
			const wire = value.answers[id]
			if (!isSystemOneAnswer(wire)) {
				throw new JudgeError(
					'PROTOCOL',
					`judge error: question ${id} has an invalid System One answer`,
				)
			}
			const answer = extractSystemOneAnswer(wire, question)
			if (answer === undefined) {
				throw new JudgeError(
					'PROTOCOL',
					`judge error: question ${id} has a mismatched or incomplete System One answer`,
				)
			}
			entries.push([id, answer])
		}
		const usage = extractSystemOneUsage(value.usage)
		return {
			model: value.model ?? this.model,
			answers: Object.fromEntries(entries),
			...(usage === undefined ? {} : { usage }),
		}
	}
}
