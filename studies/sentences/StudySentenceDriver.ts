import type { StudyDriverInterface, StudySessionInterface, StudyTrial } from '@orkestrel/study'
import type { StudyDriverOptions } from '@orkestrel/study/server'
import { StudyError } from '@orkestrel/study'
import { isStudySentenceProvider, isStudySentenceSettings } from './validators.js'
import { StudySentenceSession } from './StudySentenceSession.js'

/** Opens one isolated calibration session over captured provider code. */
export class StudySentenceDriver implements StudyDriverInterface {
	readonly #options: StudyDriverOptions

	/** Retains admitted modules and refuses absent execution receipts. @param options - Captured module namespaces and selected profile. */
	constructor(options: StudyDriverOptions) {
		if (
			!isStudySentenceSettings(options.profile.settings) ||
			!isStudySentenceProvider(options.provider)
		)
			throw new StudyError('CONFIG', 'Sentence provider or execution receipts are missing')
		this.#options = options
	}

	/** Opens fresh trial-local accounting and one real judge. @param trial - Declared calibration trial. @param signal - Parent cancellation. @returns A session with no previous observations. */
	async open(trial: StudyTrial, signal: AbortSignal): Promise<StudySessionInterface> {
		signal.throwIfAborted()
		const provider = this.#options.provider
		if (trial.arm !== 'calibration' || !isStudySentenceProvider(provider))
			throw new StudyError('CONFIG', 'Sentence trial or provider is incompatible')
		return new StudySentenceSession({ ...this.#options, provider, signal })
	}
}
