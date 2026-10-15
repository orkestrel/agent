import type { ProviderDelta, ProviderInterface, ProviderResult } from '@orkestrel/agent'
import type { JSONValue } from '@orkestrel/contract'
import type {
	StudyContext,
	StudyEvidence,
	StudyGoal,
	StudyProduct,
	StudyProfile,
	StudyRole,
} from '@orkestrel/study'
import type { ScratchInterface } from '@orkestrel/test/server'
import type { StudyMemoryEstimate, StudyMemoryObserver } from '../../../../studies/memory/index.js'

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
	/** Supplies driver-owned settings verbatim; omission and `undefined` both emit an absent profile setting. */
	readonly settings?: StudyProfile['settings']
	/** Overrides the per-request deadline in milliseconds. */
	readonly duration?: number
}
/** Holds an inert model reply fixture; `timing` adds raw daemon fields to the terminal row. */
export interface MemoryReplyFixture {
	readonly content?: string
	readonly reason?: string
	readonly prompt?: number
	readonly completion?: number
	readonly unknown?: boolean
	readonly calls?: readonly JSONValue[]
	readonly timing?: Readonly<Record<string, JSONValue>>
}
/** Holds a real observing provider, the real provider it delegates to and every reading it recorded. */
export interface MemoryObserverFixture {
	readonly observer: StudyMemoryObserver
	readonly inner: ProviderInterface
	readonly readings: StudyMemoryEstimate[]
}
/** Holds the deltas a drained stream yielded in order and the result it returned. */
export interface MemoryStreamFixture {
	readonly deltas: readonly ProviderDelta[]
	readonly result: ProviderResult
}
/** Holds one finished request's comparable measurements without its real elapsed clock. */
export interface MemoryUsageFixture {
	readonly role: StudyRole
	readonly calls: number
	readonly tokens: number | undefined
	readonly bytes: number | undefined
}
/** Holds a real trial's inputs: queued protocol replies, ordered goals and optional driver settings. */
export interface MemoryTrialFixture {
	readonly arm: 'records' | 'compaction' | 'full'
	readonly responses: readonly MemoryWireFixture[]
	readonly goals: readonly StudyGoal[]
	readonly settings?: Readonly<Record<string, JSONValue>>
	readonly duration?: number
}
/** Holds what a real trial sent, admitted, retained and returned. */
export interface MemoryTrialResult {
	readonly requests: ReadonlyArray<{ readonly path: string; readonly body: string }>
	readonly products: readonly StudyProduct[]
	readonly failure: string | undefined
	readonly usage: readonly MemoryUsageFixture[]
	readonly evidence: readonly StudyEvidence[]
}
/** Holds the observation-independent subset two trials must agree on. */
export type MemoryAdmissionFixture = Pick<
	MemoryTrialResult,
	'requests' | 'products' | 'failure' | 'usage'
>
