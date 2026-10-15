import type { StudyDriverInterface, StudySessionInterface, StudyTrial } from '@orkestrel/study'
import type { StudyToolsOptions, StudyToolsRuntime } from './types.js'
import { mkdtemp, realpath, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { StudyError } from '@orkestrel/study'
import { isStudyCustodyTrial } from '@orkestrel/study/server'
import { StudyToolsSession } from './StudyToolsSession.js'
import { isStudyToolsRuntime } from './validators.js'

/** Opens isolated trials through the caller's admitted built Agent runtime. */
export class StudyToolsDriver implements StudyDriverInterface {
	readonly #agent: StudyToolsRuntime
	readonly #directory: string

	/**
	 * Records the admitted runtime and exclusive scratch parent without loading any module.
	 * @param options - The supplied Agent runtime namespace and scratch parent
	 * @throws StudyError - Thrown when the namespace or parent declaration is malformed
	 */
	constructor(options: StudyToolsOptions) {
		if (
			!isStudyToolsRuntime(options.agent) ||
			typeof options.directory !== 'string' ||
			options.directory.trim().length === 0
		)
			throw new StudyError('CONFIG', 'Invalid tools driver namespace or scratch parent')
		this.#agent = options.agent
		this.#directory = options.directory
	}

	/**
	 * Creates fresh scratch and actual Agent state for one declared trial.
	 * @param trial - The scheduled agent arm
	 * @param signal - The enclosing operational signal
	 * @returns One owned session whose close removes its recorded scratch child
	 * @throws StudyError - Thrown when trial or scratch ownership is invalid
	 */
	async open(trial: StudyTrial, signal: AbortSignal): Promise<StudySessionInterface> {
		if (!isStudyCustodyTrial(trial) || trial.arm !== 'agent')
			throw new StudyError('CONFIG', 'Unsupported tools trial')
		signal.throwIfAborted()
		const parent = await realpath(this.#directory)
		if (resolve(parent) !== resolve(this.#directory))
			throw new StudyError('CONFIG', 'Tools scratch parent must be canonical')
		const directory = await mkdtemp(join(parent, 'trial-'))
		try {
			signal.throwIfAborted()
			return new StudyToolsSession({ agent: this.#agent, directory, signal })
		} catch (error) {
			await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 10 })
			throw error
		}
	}
}
