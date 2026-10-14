import type { JSONValue } from '@orkestrel/contract'
import type { StudyContext, StudyEvidence, StudyProfile } from '@orkestrel/study'

/** Holds one inert native HTTP fixture response. */
export interface MemoryWireFixture {
	readonly path: string
	readonly body: string
	readonly status?: number
	readonly open?: boolean
}
/** Holds an actual protocol fixture and captured request bytes. */
export interface MemoryServerFixture {
	readonly url: string
	readonly requests: Array<{ readonly path: string; readonly body: string }>
	readonly responses: MemoryWireFixture[]
	close(): Promise<void>
}
/** Holds real hierarchical accounting with append-only evidence. */
export interface MemoryContextFixture {
	readonly context: StudyContext
	readonly evidence: StudyEvidence[]
	close(): void
}
/** Holds unchanged public built namespaces in a disposable ordinary-resolution layout. */
export interface MemoryModuleFixture {
	readonly subject: unknown
	readonly provider: unknown
	close(): Promise<void>
}
/** Holds pure profile fixture overrides. */
export interface MemoryProfileFixture {
	readonly url: string
	readonly room?: Partial<StudyProfile['room']>
}
/** Holds an inert model reply fixture. */
export interface MemoryReplyFixture {
	readonly content?: string
	readonly reason?: string
	readonly prompt?: number
	readonly completion?: number
	readonly unknown?: boolean
	readonly calls?: readonly JSONValue[]
}
