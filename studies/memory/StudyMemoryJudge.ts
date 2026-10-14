import type { JudgeInterface, JudgeRequest, JudgeResult } from '@orkestrel/agent'
import type { StudyMemoryTransport } from './StudyMemoryTransport.js'

/** Latches actual judge failures before Ledger can treat a failed classification as absent. */
export class StudyMemoryJudge implements JudgeInterface {
	readonly #judge: JudgeInterface
	readonly #transport: StudyMemoryTransport
	/** Binds a real public judge to the trial's failure owner. @param judge - Actual admitted Ollama judge. @param transport - Sticky operational failure owner. */
	constructor(judge: JudgeInterface, transport: StudyMemoryTransport) {
		this.#judge = judge
		this.#transport = transport
	}
	get id(): string {
		return this.#judge.id
	}
	get name(): string {
		return this.#judge.name
	}
	get model(): string {
		return this.#judge.model
	}
	/** Preserves actual answers and refuses all later dispatch after a thrown protocol failure. @param request - Actual Ledger classification request. @param signal - Actual Ledger cancellation. @returns The unmodified judge result. */
	async ask(request: JudgeRequest, signal: AbortSignal): Promise<JudgeResult> {
		this.#transport.check()
		try {
			return await this.#judge.ask(request, signal)
		} catch (error) {
			this.#transport.fail(error)
			throw error
		}
	}
}
