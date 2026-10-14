import type { JSONValue } from '@orkestrel/contract'
import type { StudyContext, StudyEvidence, StudyProfile } from '@orkestrel/study'
import type { ScratchInterface } from '@orkestrel/test/server'

/** Holds one copied package selection in the installed fixture closure. */
export interface StudyServicePackage {
	readonly name: string
	readonly source: string
	readonly target: string
}
/** Holds an actual installed CLI and its exclusive scratch workspace. */
export interface StudyServiceFixture {
	readonly scratch: ScratchInterface
	readonly entry: string
	readonly packages: readonly StudyServicePackage[]
}
/** Holds native command output without discarding failed-command diagnostics. */
export interface StudyServiceResult {
	readonly code: number
	readonly stdout: string
	readonly stderr: string
}

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
