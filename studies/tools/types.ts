import type {
	AgentOptions,
	AgentResult,
	AgentRunOptions,
	MessageInput,
	ProviderInterface,
} from '@orkestrel/agent'
import type { JSONValue } from '@orkestrel/contract'
import type { StudyContext, StudyEvidence, StudyJudgment } from '@orkestrel/study'
import type { StudyAgentResponse } from '@orkestrel/study/server'

/**
 * Holds the admitted modules and exclusive parent scratch directory.
 * @remarks
 * `agent` supplies the runtime whose constructor the driver invokes; `subject` identifies the
 * artifact under study and is never loaded or read here.
 */
export interface StudyToolsDriverOptions {
	readonly agent: unknown
	readonly subject: unknown
	readonly directory: string
}

/** Holds the one admitted built constructor the consumer invokes. */
export interface StudyToolsRuntime {
	readonly Agent: new (provider: ProviderInterface, options?: AgentOptions) => unknown
}

/** Holds only the foreign agent operations this consumer dereferences. */
export interface StudyToolsAgentInterface {
	readonly context: { readonly messages: { add(message: MessageInput): unknown } }
	readonly emitter: { destroy(): void }
	generate(options?: AgentRunOptions): Promise<AgentResult>
	abort(reason?: unknown): void
}

/** Holds public mechanism input without any criterion or expected outcome. */
export interface StudyToolsInput {
	readonly prompt: string
	readonly responses: readonly StudyAgentResponse[]
	readonly files: readonly string[]
	readonly admitted: boolean
}

/** Holds the values one goal's workload is created from. */
export interface StudyToolsWorkloadOptions {
	readonly input: StudyToolsInput
	readonly goal: string
	readonly context: StudyContext
}

/** Holds one goal's parsed workload with its operational context, workload controller, retained trace and latest fault. */
export interface StudyToolsWorkloadInterface {
	readonly input: StudyToolsInput
	readonly goal: string
	readonly context: StudyContext
	readonly controller: AbortController
	readonly trace: readonly StudyEvidence[]
	readonly fault: unknown
	/**
	 * Appends one observed row to the retained trace in emission order.
	 * @param row - The evidence row the actual Agent produced
	 */
	record(row: StudyEvidence): void
	/**
	 * Holds the latest fault the admitted Agent or its observation raised.
	 * @param error - The raised value
	 */
	fail(error: unknown): void
}

/** Holds the fresh trial resources supplied by the driver. */
export interface StudyToolsSessionOptions {
	readonly agent: StudyToolsRuntime
	readonly directory: string
	readonly signal: AbortSignal
}

/** Holds an admitted tool operation whose output remains JSON evidence. */
export type StudyToolsOperation = (signal: AbortSignal) => Promise<JSONValue>

/** Holds validated write arguments for a new bounded scratch file. */
export interface StudyToolsWrite {
	readonly path: string
	readonly content: string
}

/** Holds validated read arguments for a bounded scratch file. */
export interface StudyToolsRead {
	readonly path: string
}

/** Holds an independently authored state or trace predicate. */
export type StudyToolsAssertion =
	| {
			readonly observation: 'file'
			readonly path: string
			readonly exists: boolean
			readonly content?: string
	  }
	| { readonly observation: 'tool'; readonly name: 'write' | 'read'; readonly success: boolean }
	| { readonly observation: 'denial'; readonly name: 'write' | 'read' }
	| { readonly observation: 'result'; readonly partial: boolean; readonly content?: string }

/** Holds an observed bounded file state after actual filesystem inspection. */
export interface StudyToolsFile {
	readonly path: string
	readonly exists: boolean
	readonly content?: string
	readonly bytes?: number
}

/** Holds one independent predicate reading and its retained row attribution. */
export interface StudyToolsReading {
	readonly verdict: StudyJudgment['verdict']
	readonly row: number | undefined
}
