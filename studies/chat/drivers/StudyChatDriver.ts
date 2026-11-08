import type { StudyDriverInterface, StudySessionInterface, StudyTrial } from '@orkestrel/study'
import type { StudyDriverOptions } from '@orkestrel/study/server'
import type { JSONValue } from '@orkestrel/contract'
import type { StudyChatProvider, StudyChatRuntime } from '../types.js'
import { StudyError } from '@orkestrel/study'
import { validateStudyChatProfile } from '../helpers.js'
import { isStudyChatProvider, isStudyChatRuntime } from '../validators.js'
import { StudyChatSession } from '../sessions/StudyChatSession.js'

/** Opens a fresh ledger for each records trial using admitted built capabilities.
 * @example await new StudyChatDriver(options).open(trial, signal)
 */
export class StudyChatDriver implements StudyDriverInterface {
	readonly #options: StudyDriverOptions
	readonly #agent: StudyChatRuntime
	readonly #provider: StudyChatProvider
	constructor(options: StudyDriverOptions) {
		validateStudyChatProfile(options.profile)
		if (!isStudyChatRuntime(options.agent) || !isStudyChatProvider(options.provider))
			throw new StudyError('CONFIG', 'Chat requires admitted Ledger and Ollama factories')
		this.#options = options
		this.#agent = options.agent
		this.#provider = options.provider
	}
	async open(
		trial: StudyTrial,
		signal: AbortSignal,
		seed?: JSONValue,
	): Promise<StudySessionInterface> {
		signal.throwIfAborted()
		if (trial.arm !== 'records' || seed !== undefined)
			throw new StudyError('CONFIG', 'Chat requires fresh records trials')
		return new StudyChatSession({
			...this.#options,
			agent: this.#agent,
			provider: this.#provider,
			signal,
		})
	}
}
