import type { JSONValue } from '@orkestrel/contract'
import type {
	StudyDriverInterface,
	StudyProfile,
	StudySessionInterface,
	StudyTrial,
} from '@orkestrel/study'
import type {
	StudyExchangeSinkInterface,
	StudyOllamaReplayInterface,
} from '@orkestrel/study/server'
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
	isStudyMemoryCheckpoint,
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
	readonly #exchanges: StudyExchangeSinkInterface | undefined
	readonly #replay: StudyOllamaReplayInterface | undefined

	/** Validates the admitted runtime surfaces and finite profile. @param options - Admitted Agent runtime, tested subject identity, provider, profile and the worker's recording collaborators. */
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
		this.#exchanges = options.exchanges
		this.#replay = options.replay
	}

	/** Creates one independent trial session. @param trial - Scheduled treatment. @param signal - Parent cancellation. @param seed - The checkpoint value of a seeded execution. @returns Fresh state with no previous trial messages, or the seed's state. @throws StudyError - CONFIG when the seed is no checkpoint, or holds the other strategy's state member. */
	async open(
		trial: StudyTrial,
		signal: AbortSignal,
		seed?: JSONValue,
	): Promise<StudySessionInterface> {
		signal.throwIfAborted()
		if (!isStudyMemoryArm(trial.arm)) throw new StudyError('CONFIG', 'Unsupported memory arm')
		validateStudyMemoryProfile(this.#profile, [trial.arm])
		const records = trial.arm === 'records'
		if (
			seed !== undefined &&
			(!isStudyMemoryCheckpoint(seed) || records !== (seed.ledger !== undefined))
		)
			throw new StudyError('CONFIG', 'Memory seed is not a checkpoint of this arm')
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
			...(this.#exchanges === undefined ? {} : { exchanges: this.#exchanges }),
			...(this.#replay === undefined ? {} : { replay: this.#replay }),
			...(seed === undefined ? {} : { seed }),
		})
	}
}
