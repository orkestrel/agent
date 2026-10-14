import type {
	AgentOptions,
	AgentResult,
	AgentRunOptions,
	MessageInput,
	ProviderInterface,
} from '@orkestrel/agent'
import type { JSONValue } from '@orkestrel/contract'
import type { ToolCall } from '@orkestrel/tool'
import type { StudyContext, StudyJudgment } from '@orkestrel/study'

/** Holds the admitted namespace and exclusive parent scratch directory. */
export interface StudyToolsOptions {
	readonly subject: unknown
	readonly directory: string
}

/** Holds the one admitted built constructor the consumer invokes. */
export interface StudyToolsSubject {
	readonly Agent: new (provider: ProviderInterface, options?: AgentOptions) => unknown
}

/** Holds only the foreign agent operations this consumer dereferences. */
export interface StudyToolsAgentInterface {
	readonly context: { readonly messages: { add(message: MessageInput): unknown } }
	readonly emitter: { destroy(): void }
	generate(options?: AgentRunOptions): Promise<AgentResult>
	abort(reason?: unknown): void
}

/** Holds one inert scripted provider response and its explicit workload controls. */
export interface StudyToolsResponse {
	readonly content: string
	readonly calls: readonly ToolCall[]
	readonly consume: string | undefined
	readonly cancel: boolean | undefined
	readonly tokens: number | undefined
	readonly bytes: number | undefined
}

/** Holds public mechanism input without any criterion or expected outcome. */
export interface StudyToolsInput {
	readonly prompt: string
	readonly responses: readonly StudyToolsResponse[]
	readonly files: readonly string[]
	readonly admitted: boolean
}

/** Holds one provider workload with separate operational and workload signals. */
export interface ScriptedStudyOptions {
	readonly input: StudyToolsInput
	readonly goal: string
	readonly context: StudyContext
	readonly workload: AbortController
}

/** Holds the fresh trial resources supplied by the driver. */
export interface StudyToolsSessionOptions {
	readonly subject: StudyToolsSubject
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
