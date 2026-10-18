import type { StudyContext, StudyEvidence } from '@orkestrel/study'
import type {
	StudyToolsInput,
	StudyToolsWorkloadInterface,
	StudyToolsWorkloadOptions,
} from './types.js'

/** Holds one goal's parsed workload, its workload controller, retained trace and latest fault. */
export class StudyToolsWorkload implements StudyToolsWorkloadInterface {
	readonly #input: StudyToolsInput
	readonly #goal: string
	readonly #context: StudyContext
	readonly #controller = new AbortController()
	readonly #trace: StudyEvidence[] = []
	#fault: unknown

	/**
	 * Creates the fresh state of one goal, so nothing a previous goal observed is visible to it.
	 * @param options - The parsed input, goal identity and enclosing operational context
	 */
	constructor(options: StudyToolsWorkloadOptions) {
		this.#input = options.input
		this.#goal = options.goal
		this.#context = options.context
	}

	/** Holds the goal's parsed public mechanism input. */
	get input(): StudyToolsInput {
		return this.#input
	}

	/** Holds the declared goal id every retained row names. */
	get goal(): string {
		return this.#goal
	}

	/** Holds the enclosing meter, evidence sink and operational signal. */
	get context(): StudyContext {
		return this.#context
	}

	/** Holds the controller a scripted reply aborts to cancel this workload apart from the study. */
	get controller(): AbortController {
		return this.#controller
	}

	/** Holds the rows observed so far, in emission order. */
	get trace(): readonly StudyEvidence[] {
		return this.#trace
	}

	/** Holds the latest fault, or undefined when none was raised. */
	get fault(): unknown {
		return this.#fault
	}

	/**
	 * Appends one observed row to the retained trace.
	 * @param row - The evidence row the actual Agent produced
	 */
	record(row: StudyEvidence): void {
		this.#trace.push(row)
	}

	/**
	 * Holds the latest fault the admitted Agent or its observation raised.
	 * @param error - The raised value
	 */
	fail(error: unknown): void {
		this.#fault = error
	}
}
