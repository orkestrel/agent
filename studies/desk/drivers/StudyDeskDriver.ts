import type { StudyDriverInterface, StudySessionInterface, StudyTrial } from '@orkestrel/study'
import type { StudyDriverOptions } from '@orkestrel/study/server'
import type { JSONValue } from '@orkestrel/contract'
import type { StudyDeskProvider, StudyDeskRuntime } from '../types.js'
import { StudyError } from '@orkestrel/study'
import { validateStudyDeskProfile } from '../helpers.js'
import { isStudyDeskArm, isStudyDeskProvider, isStudyDeskRuntime } from '../validators.js'
import { StudyDeskSession } from '../sessions/StudyDeskSession.js'

/** Opens a fresh conversation of the trial's arm over the admitted built capabilities.
 * @example await new StudyDeskDriver(options).open(trial, signal)
 */
export class StudyDeskDriver implements StudyDriverInterface {
	readonly #options: StudyDriverOptions
	readonly #agent: StudyDeskRuntime
	readonly #provider: StudyDeskProvider

	/**
	 * Checks the profile and the admitted capabilities before any trial opens.
	 * @param options - The admitted namespaces, the profile, and the scratch parent
	 * @throws StudyError - Thrown with code `CONFIG` when a capability or the treatment differs
	 */
	constructor(options: StudyDriverOptions) {
		validateStudyDeskProfile(options.profile)
		if (!isStudyDeskRuntime(options.agent) || !isStudyDeskProvider(options.provider))
			throw new StudyError('CONFIG', 'Desk requires admitted Agent and Ollama factories')
		this.#options = options
		this.#agent = options.agent
		this.#provider = options.provider
	}

	/**
	 * Opens one trial's session on its arm with fresh state.
	 * @param trial - The scheduled trial
	 * @param signal - The trial's cancellation
	 * @param seed - A seeded checkpoint, which this driver refuses
	 * @returns The trial's session
	 * @throws StudyError - Thrown with code `CONFIG` for an unknown arm or a seed
	 */
	async open(
		trial: StudyTrial,
		signal: AbortSignal,
		seed?: JSONValue,
	): Promise<StudySessionInterface> {
		signal.throwIfAborted()
		if (!isStudyDeskArm(trial.arm) || seed !== undefined)
			throw new StudyError('CONFIG', 'Desk requires a declared arm and fresh trials')
		return new StudyDeskSession({
			...this.#options,
			arm: trial.arm,
			agent: this.#agent,
			provider: this.#provider,
			signal,
		})
	}
}
