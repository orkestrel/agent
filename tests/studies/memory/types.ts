import type {
	ProviderDelta,
	ProviderInterface,
	ProviderRequest,
	ProviderResult,
} from '@orkestrel/agent'
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
import type { StudyMemoryEstimate, StudyMemoryObserver } from '../../../studies/memory/index.js'

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
	/** Holds the exact pre-encoding request each reading measured, in reading order. */
	readonly requests: ProviderRequest[]
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
	/** Overrides room allowances, such as a window small enough to fold. */
	readonly room?: Partial<StudyProfile['room']>
}
/** Holds what a real trial sent, admitted, retained and returned. */
export interface MemoryTrialResult {
	readonly requests: ReadonlyArray<{ readonly path: string; readonly body: string }>
	readonly products: readonly StudyProduct[]
	readonly failure: string | undefined
	readonly usage: readonly MemoryUsageFixture[]
	readonly evidence: readonly StudyEvidence[]
}
/** Holds what a real trial raised at its first failing goal and at the goal after it, with the wire state at both points. */
export interface MemoryFailureResult {
	/** Holds the value the first failing goal rejected with; undefined when every goal completed. */
	readonly first: unknown
	/** Holds the value the goal after the failure rejected with, which is the latched transport fault. */
	readonly latched: unknown
	readonly products: readonly StudyProduct[]
	/** Holds every request the fixture received, in arrival order. */
	readonly requests: ReadonlyArray<{ readonly path: string; readonly body: string }>
	/** Holds the count of requests received before the goal after the failure ran. */
	readonly sent: number
	/** Holds the count of queued replies the fixture never served. */
	readonly queued: number
	readonly usage: readonly MemoryUsageFixture[]
	readonly evidence: readonly StudyEvidence[]
}

/** Holds one native error value, the status it arrived with and the failure it must read as. */
export interface MemoryFailureFixture {
	readonly name: string
	readonly value: unknown
	readonly status?: number
	readonly code: 'CAPACITY' | 'FAULT'
	/** Holds substrings the readable reason must contain, such as the native message and type. */
	readonly reason: readonly string[]
}

/** Holds one reply the daemon could send to a role's first chat request and the failure it must become. */
export interface MemoryNativeFixture {
	readonly name: string
	/** Holds the responsibility whose first chat request the reply answers. */
	readonly role: 'agent' | 'summary'
	/** Holds the treatment that makes that role's chat request the first one sent; replies are supplied separately. */
	readonly trial: Omit<MemoryTrialFixture, 'responses'>
	/** Holds the HTTP status the fixture answers with. */
	readonly status: number
	readonly body: string
	readonly code: 'CAPACITY' | 'FAULT'
	/** Holds a substring of the readable failure message. */
	readonly message: string
}

/** Holds the observation-independent subset two trials must agree on. */
export type MemoryAdmissionFixture = Pick<
	MemoryTrialResult,
	'requests' | 'products' | 'failure' | 'usage'
>
