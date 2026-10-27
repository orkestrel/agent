import type {
	StudyDriverInterface,
	StudyProfile,
	StudySessionInterface,
	StudyTrial,
} from '@orkestrel/study'
import type {
	StudyMemoryClassifier,
	StudyMemoryDriverOptions,
	StudyMemoryLedger,
	StudyMemoryProvider,
	StudyMemoryRuntime,
} from './types.js'
import { StudyError } from '@orkestrel/study'
import { validateStudyMemoryProfile } from './helpers.js'
import { StudyMemorySession } from './StudyMemorySession.js'
import {
	isStudyMemoryArm,
	isStudyMemoryClassifier,
	isStudyMemoryLedger,
	isStudyMemoryProvider,
	isStudyMemoryRuntime,
} from './validators.js'

/** Opens fresh real runtime state for every arm and repetition. */
export class StudyMemoryDriver implements StudyDriverInterface {
	readonly #profile: StudyProfile
	readonly #agent: StudyMemoryRuntime
	readonly #provider: StudyMemoryProvider
	// Present only when the admitted namespace exposes what the records arm alone invokes.
	readonly #ledger: StudyMemoryLedger | undefined
	readonly #classifier: StudyMemoryClassifier | undefined

	/** Validates the admitted runtime surfaces and finite profile. @param options - Admitted Agent runtime, tested subject identity, provider and profile. */
	constructor(options: StudyMemoryDriverOptions) {
		if (!isStudyMemoryRuntime(options.agent) || !isStudyMemoryProvider(options.provider))
			throw new StudyError(
				'CONFIG',
				'Memory requires the admitted Agent runtime and Ollama public factories',
			)
		validateStudyMemoryProfile(options.profile, [])
		this.#profile = options.profile
		this.#agent = options.agent
		this.#provider = options.provider
		this.#ledger = isStudyMemoryLedger(options.agent) ? options.agent : undefined
		this.#classifier = isStudyMemoryClassifier(options.provider) ? options.provider : undefined
	}

	/** Creates one independent trial session. @param trial - Scheduled treatment. @param signal - Parent cancellation. @returns Fresh state with no previous trial messages. */
	async open(trial: StudyTrial, signal: AbortSignal): Promise<StudySessionInterface> {
		signal.throwIfAborted()
		if (!isStudyMemoryArm(trial.arm)) throw new StudyError('CONFIG', 'Unsupported memory arm')
		validateStudyMemoryProfile(this.#profile, [trial.arm])
		const records = trial.arm === 'records'
		if (records && (this.#ledger === undefined || this.#classifier === undefined))
			throw new StudyError(
				'CONFIG',
				'Memory records require the admitted Ledger and judge factories',
			)
		return new StudyMemorySession({
			agent: this.#agent,
			ledger: records ? this.#ledger : undefined,
			provider: this.#provider,
			classifier: records ? this.#classifier : undefined,
			profile: this.#profile,
			arm: trial.arm,
			signal,
		})
	}
}
