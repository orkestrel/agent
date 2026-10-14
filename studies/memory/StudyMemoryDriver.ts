import type { StudyDriverInterface, StudySessionInterface, StudyTrial } from '@orkestrel/study'
import type { StudyMemoryOptions, StudyMemoryProvider, StudyMemorySubject } from './types.js'
import { StudyError } from '@orkestrel/study'
import { validateStudyMemoryProfile } from './helpers.js'
import { StudyMemorySession } from './StudyMemorySession.js'
import { isStudyMemoryArm, isStudyMemoryProvider, isStudyMemorySubject } from './validators.js'

/** Opens fresh real runtime state for every arm and repetition. */
export class StudyMemoryDriver implements StudyDriverInterface {
	readonly #options: StudyMemoryOptions
	readonly #subject: StudyMemorySubject
	readonly #provider: StudyMemoryProvider
	/** Validates the admitted runtime surfaces and finite profile. @param options - Admitted subject, provider and profile. */
	constructor(options: StudyMemoryOptions) {
		if (!isStudyMemorySubject(options.subject) || !isStudyMemoryProvider(options.provider))
			throw new StudyError(
				'CONFIG',
				'Memory requires the admitted Agent and Ollama public factories',
			)
		validateStudyMemoryProfile(options.profile)
		this.#options = options
		this.#subject = options.subject
		this.#provider = options.provider
	}
	/** Creates one independent trial session. @param trial - Scheduled treatment. @param signal - Parent cancellation. @returns Fresh state with no previous trial messages. */
	async open(trial: StudyTrial, signal: AbortSignal): Promise<StudySessionInterface> {
		signal.throwIfAborted()
		if (!isStudyMemoryArm(trial.arm)) throw new StudyError('CONFIG', 'Unsupported memory arm')
		return new StudyMemorySession({
			subject: this.#subject,
			provider: this.#provider,
			profile: this.#options.profile,
			arm: trial.arm,
			signal,
		})
	}
}
