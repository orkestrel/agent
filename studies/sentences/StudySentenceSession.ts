import type { StudyContext, StudyGoal, StudyProduct, StudySessionInterface } from '@orkestrel/study'
import type {
	StudySentenceGoal,
	StudySentenceSessionOptions,
	StudySentenceSettings,
} from './types.js'
import { isObject } from '@orkestrel/contract'
import { StudyAgentJudge, StudyError } from '@orkestrel/study'
import {
	StudyOllamaTransport,
	buildStudyOllamaModels,
	encodeStudyJSON,
	hashStudyBytes,
	valueToWire,
} from '@orkestrel/study/server'
import { buildStudySentenceRole } from './helpers.js'
import { STUDY_SENTENCE_JUDGE, STUDY_SENTENCE_QUESTION } from './constants.js'
import { isStudySentenceGoal, isStudySentenceScore, isStudySentenceSettings } from './validators.js'

/** Dispatches each frozen observation through one real judge request and retains its evidence. */
export class StudySentenceSession implements StudySessionInterface {
	readonly #settings: StudySentenceSettings
	readonly #transport: StudyOllamaTransport
	readonly #judge: StudyAgentJudge
	readonly #seen = new Set<string>()
	readonly #flights = new Set<Promise<StudyProduct>>()
	#closing: Promise<void> | undefined

	/** Composes the admitted judge and transport under the declared request ceilings. @param options - Trial provider, profile, cancellation, and recording sink. */
	constructor(options: StudySentenceSessionOptions) {
		const profile = options.profile
		const provider = profile.provider
		if (provider === undefined || !isStudySentenceSettings(profile.settings))
			throw new StudyError('CONFIG', 'Sentence profile lacks provider or frozen receipts')
		if (profile.record !== undefined && options.exchanges === undefined)
			throw new StudyError('CONFIG', 'Sentence recording requires its exchange sink')
		this.#settings = profile.settings
		const role = buildStudySentenceRole(profile)
		this.#transport = new StudyOllamaTransport({
			url: provider.url,
			room: profile.room,
			limit: profile.bounds.request,
			metadata: this.#settings.metadata,
			models: buildStudyOllamaModels(provider),
			roles: { judge: role },
			signal: options.signal,
			observe: true,
			timing: options.provider.extractTiming,
			...(options.exchanges === undefined ? {} : { exchanges: options.exchanges }),
			...(options.replay === undefined ? {} : { fetch: options.replay.fetch }),
		})
		this.#judge = new StudyAgentJudge(
			options.provider.createOllamaJudge({
				model: role.model,
				system: STUDY_SENTENCE_JUDGE,
				url: provider.url,
				timeout: profile.bounds.request.duration,
				options: role.options,
				fetch: (input, init) => this.#transport.fetch('judge', input, init),
			}),
			this.#transport,
		)
	}

	/** Executes one immutable goal without a shared judgment cache. @param goal - Public frozen input. @param context - Study-owned accounting and evidence. @returns The observed probability and immutable request receipts. */
	async execute(goal: StudyGoal, context: StudyContext): Promise<StudyProduct> {
		if (this.#closing !== undefined || this.#flights.size > 0)
			throw new StudyError('CONFIG', 'Sentence session is closed or busy')
		if (
			!isStudySentenceGoal(goal.input) ||
			goal.id !== goal.input.observation ||
			this.#settings.inputs[goal.id] !== hashStudyBytes(encodeStudyJSON(goal.input))
		)
			throw new StudyError('CONFIG', 'Sentence packet bytes differ from the frozen receipt')
		if (this.#seen.has(goal.id) || this.#settings.goals[this.#seen.size] !== goal.id)
			throw new StudyError('CONFIG', 'Sentence observation is duplicated or out of order')
		context.signal.throwIfAborted()
		this.#seen.add(goal.id)
		const flight = this.#execute(goal.id, goal.input, context)
		this.#flights.add(flight)
		try {
			return await flight
		} finally {
			this.#flights.delete(flight)
		}
	}

	/** Cancels outstanding native work and joins every active goal. @returns Completion after transport cleanup and goal settlement. */
	close(): Promise<void> {
		this.#closing ??= this.#dispose()
		return this.#closing
	}

	async #execute(
		goal: string,
		input: StudySentenceGoal,
		context: StudyContext,
	): Promise<StudyProduct> {
		this.#transport.prepare({ goal, context, checkpoint: undefined })
		try {
			if (this.#settings.goals[0] === goal) await this.#transport.verify()
			const result = await this.#judge.ask(
				{ state: input.state, questions: { [input.key]: STUDY_SENTENCE_QUESTION } },
				context.signal,
			)
			await context.evidence.append({ event: 'answer', goal, value: valueToWire(result) })
			this.#transport.check()
			const answer = result.answers[input.key]
			if (
				result.refusals?.[input.key] !== undefined ||
				Object.keys(result.answers).length !== 1 ||
				answer?.form !== 'noul' ||
				!isStudySentenceScore(answer.noul)
			)
				throw new StudyError('FAULT', 'Sentence observation is refused or has an invalid score', {
					cause: 'content',
					role: 'judge',
					message: 'Sentence answer is unusable',
					stop: undefined,
				})
			const value = {
				id: input.id,
				observation: input.observation,
				score: answer.noul,
				digest: hashStudyBytes(encodeStudyJSON(input)),
				binding: hashStudyBytes(encodeStudyJSON(this.#settings.binding)),
			}
			await context.evidence.append({ event: 'sentence', goal, value })
			if (this.#settings.goals.at(-1) === goal) await this.#transport.verify()
			return { value, partial: false }
		} catch (error) {
			await context.evidence.append({
				event: 'failure',
				goal,
				value: valueToWire({
					message: error instanceof Error ? error.message : String(error),
					...(isObject(error) && 'partial' in error ? { partial: error.partial } : {}),
				}),
			})
			throw error
		} finally {
			this.#transport.clear()
		}
	}

	async #dispose(): Promise<void> {
		await this.#transport.close()
		await Promise.allSettled([...this.#flights])
	}
}
