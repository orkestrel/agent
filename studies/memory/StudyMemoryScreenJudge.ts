import type { JudgeInterface, JudgeRequest, JudgeResult } from '@orkestrel/agent'
import type { StudyMemoryScreen } from './StudyMemoryScreen.js'
import { validateStudyAgentUsage } from '@orkestrel/study'

/** Keeps native classifier failures and missing usage inside the same case refusal. */
export class StudyMemoryScreenJudge implements JudgeInterface {
	readonly #judge: JudgeInterface
	readonly #screen: StudyMemoryScreen
	/** Binds the real classifier and case account. @param judge - Native classifier. @param screen - Shared case admission owner. */
	constructor(judge: JudgeInterface, screen: StudyMemoryScreen) {
		this.#judge = judge
		this.#screen = screen
	}
	/** Returns the delegate identity. */
	get id(): string {
		return this.#judge.id
	}
	/** Returns the delegate backend. */
	get name(): string {
		return this.#judge.name
	}
	/** Returns the delegate model identity. */
	get model(): string {
		return this.#judge.model
	}
	/** Validates actual classified usage and preserves native results. @param request - Unchanged questions and state. @param signal - Caller cancellation. @returns The native result. */
	async ask(request: JudgeRequest, signal: AbortSignal): Promise<JudgeResult> {
		this.#screen.check()
		const before = this.#screen.requests
		try {
			const result = await this.#judge.ask(request, AbortSignal.any([signal, this.#screen.signal]))
			if (this.#screen.requests > before) validateStudyAgentUsage(result.usage, 'judge')
			this.#screen.check()
			return result
		} catch (error) {
			return this.#screen.fail(error)
		}
	}
}
