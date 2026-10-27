import type { ChildProcess } from 'node:child_process'
import type { JSONValue } from '@orkestrel/contract'
import type {
	AgentInterface,
	LedgerResult,
	LedgerInterface,
	LedgerOptions,
	ProviderInterface,
	JudgeInterface,
} from '@orkestrel/agent'
import type { StudyMemoryScreen } from '../../../studies/memory/StudyMemoryScreen.js'
import type {
	StudyAttempt,
	StudyContext,
	StudyDaemon,
	StudyCriterion,
	StudyDefinition,
	StudyEvidence,
	StudyFailure,
	StudyGoal,
	StudyManifest,
	StudyProduct,
	StudyProfile,
	StudyRole,
	StudySessionInterface,
	StudyRubric,
	StudyTrial,
	StudyScenario,
} from '@orkestrel/study'
import type { ScratchInterface } from '@orkestrel/test/server'
import type { FileHandle } from 'node:fs/promises'
import type {
	StudyResultReading,
	StudyExchangeHistory,
	StudySealedResult,
} from '@orkestrel/study/server'
import type {
	StudyMemoryDifferential,
	StudyMemoryScreenAdmission,
} from '../../../studies/memory/types.js'

/** Owns the shared real resources of the serial forced and native timeout proofs. */
export interface MemoryScreenTimeoutFixture {
	readonly scratch: ScratchInterface
	readonly server: MemoryServerFixture
	readonly daemon: MemoryDaemonFixture
	readonly sentinel: ChildProcess
	readonly launcher: MemoryScreenLauncherFixture
	readonly frozen: string
	readonly selection: string
	readonly options: StudyInstallOptions
}

/** Shares one checked source and its real peer across the ordered matched-arm tests. */
export interface MemoryScreenGroupFixture {
	readonly fixture: MemoryScreenFixture
	readonly server: MemoryServerFixture
	readonly frozen: string
	readonly output: string
	readonly result: StudySealedResult
	readonly admission: StudyMemoryScreenAdmission
}

/** Retains the failed real source-hook child and its collected arm dispositions. */
export interface MemorySourceFailureResult extends StudyInstallResult {
	readonly report: unknown
}

/** Holds a CPU recording and the settings replayed against its sealed history. */
export interface MemoryRecordingFixture {
	readonly arm: 'records' | 'compaction'
	readonly goals: readonly StudyGoal[]
	readonly responses?: readonly MemoryWireFixture[]
	readonly treatments: Readonly<Record<string, Readonly<Record<string, JSONValue>>>>
	readonly room?: Partial<StudyProfile['room']>
}

/** Holds the strict differential and native outcome of one offline treatment replay. */
export interface MemoryRecordingReading {
	readonly name: string
	readonly command: StudyInstallResult
	readonly status: StudyResultReading['status']
	readonly differential: StudyMemoryDifferential
}

/** Holds a sealed CPU history and its offline treatment readings after cleanup. */
export interface MemoryRecordingResult {
	readonly history: StudyExchangeHistory
	readonly evidence: readonly StudyEvidence[]
	readonly readings: readonly MemoryRecordingReading[]
	readonly sent: number
	readonly replayed: number
}

/** Holds a resolved real Ledger fallback and its independently captured conversation order. */
export interface MemoryFallbackResult extends LedgerResult {
	readonly messages: readonly string[]
}

/** Holds the worker's process identity, supplied environment, and resolved Intl options. */
export interface MemoryWorker {
	readonly pid: number
	readonly tz: string
	readonly lang: string
	/** Mirrors the locale and timeZone members of Intl.ResolvedDateTimeFormatOptions. */
	readonly intl: Pick<Intl.ResolvedDateTimeFormatOptions, 'locale' | 'timeZone'>
}

/** Holds an authored recording fixture and its exact executing profile. */
export interface MemoryReplayFixture extends StudyInstallFixture {
	readonly profile: StudyProfile
}

/** Holds the grouped R2 protocol fixture and its exact public declarations. */
export interface MemoryScreenFixture extends StudyInstallFixture {
	readonly admission: string
	readonly profile: StudyProfile
	readonly definition: StudyDefinition
	readonly scenarios: readonly StudyScenario[]
	readonly rubric: StudyRubric
}

/** Selects observations applied exclusively to copied fixture inputs before capture. */
export interface MemoryScreenFixtureOptions {
	/** Records the actual worker's selected Agent constructor and runtime files. */
	readonly identity?: boolean
	/** Selects an already installed real Study package for the mismatched-host control. */
	readonly study?: string
}

/** Holds a fixture-local launcher and its physical-input receipt. */
export interface MemoryScreenLauncherFixture {
	readonly launcher: string
	readonly physical: string
	readonly trace: string
	readonly original: string
}

/** Owns a real screen session, recorded exchange sink and loopback peer for focused controls. */
export interface MemoryScreenSessionFixture {
	readonly session: StudySessionInterface
	readonly profile: StudyProfile
	readonly scenario: StudyScenario
	readonly server: MemoryServerFixture
	readonly context: MemoryContextFixture
	close(): Promise<void>
}

/** Exposes actual constructor-owned resources and disk descriptor for a real retention failure. */
export interface MemoryCleanupFixture extends MemoryScreenSessionFixture {
	readonly agent: AgentInterface
	readonly file: FileHandle
	readonly path: string
}

/** Places a real retention boundary behind an externally released observation gate. */
export interface MemoryCleanupOptions {
	readonly responses?: readonly MemoryWireFixture[]
	readonly boundary?: 'eof' | 'admitted'
	readonly entered?: () => void
	readonly release?: Promise<void>
}

/** Owns real providers and the shared screen counter before any Agent tool dispatch. */
export interface MemoryScreenBoundaryFixture {
	readonly native: ProviderInterface
	readonly screen: StudyMemoryScreen
	readonly provider: ProviderInterface
	readonly judge: JudgeInterface
	readonly server: MemoryServerFixture
	readonly context: MemoryContextFixture
	close(): Promise<void>
}

/** Holds optional recording horizon and execution-owned daemon declarations. */
export interface MemoryReplayOptions {
	readonly goals?: readonly StudyGoal[]
	readonly daemon?: StudyDaemon
	readonly settings?: Readonly<Record<string, JSONValue>>
	readonly room?: Partial<StudyProfile['room']>
}

/** Holds a prospective treatment trajectory and the text it must add to a request. */
export interface MemoryDifferentialFixture {
	/** Predicts the first changed request; absent for an inert trajectory. */
	readonly ordinal?: number
	readonly goals: readonly StudyGoal[]
	readonly responses: readonly MemoryWireFixture[]
	readonly marker: string
}

/** Holds the native replay command outcome and its retained result reading. */
export interface MemoryDifferentialResult {
	readonly command: StudyInstallResult
	readonly result: StudyResultReading
}

/** Holds environment overrides passed through the CLI to fresh workers. */
export interface StudyInstallOptions {
	readonly environment?: Readonly<Record<string, string>>
}

/** Holds a reserved daemon origin and its protocol preload declaration. */
export interface MemoryDaemonFixture {
	readonly url: string
	readonly declaration: StudyDaemon
	readonly requests: readonly MemoryDaemonRequest[]
	readonly pids: readonly number[]
	close(): Promise<void>
}

/** Holds a request received by the execution-owned stand-in daemon. */
export interface MemoryDaemonRequest {
	readonly method: string
	readonly path: string
	readonly body: string
	readonly positions: ReadonlyArray<{
		readonly ordinal: number
		readonly goal: string
		readonly stage: string
	}>
}

/** Holds one copied package selection in the installed fixture closure. */
export interface StudyInstallPackage {
	readonly name: string
	readonly source: string
	readonly target: string
}
/** Holds an actual installed CLI and its exclusive scratch workspace. */
export interface StudyInstallFixture {
	readonly scratch: ScratchInterface
	readonly entry: string
	readonly packages: readonly StudyInstallPackage[]
}
/** Holds native command output without discarding failed-command diagnostics. */
export interface StudyInstallResult {
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
	/** Parks the response until this fixture-owned signal aborts. */
	readonly signal?: AbortSignal
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

/** Holds a live session and the unchanged real Ledger captured at its factory boundary. */
export interface MemoryLedgerFixture {
	readonly session: StudySessionInterface
	readonly ledger: LedgerInterface
	readonly options: LedgerOptions
	readonly server: MemoryServerFixture
	readonly context: MemoryContextFixture
	close(): Promise<void>
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

/** Holds a two-trial mechanical grading population: one complete retained trial and one faulted trial, with one criterion per predicate family. */
export interface MemoryGradingFixture {
	readonly profile: StudyProfile
	readonly definition: StudyDefinition
	readonly manifest: StudyManifest
	/** Holds the trial that completed with retained evidence, its attempt, and the rows retained for it: one foreign-goal row, then the arrival that cites `receipt`. */
	readonly complete: {
		readonly trial: StudyTrial
		readonly attempt: StudyAttempt
		readonly evidence: readonly StudyEvidence[]
	}
	/** Holds the trial that failed with a capacity refusal and its attempt. */
	readonly faulted: {
		readonly trial: StudyTrial
		readonly attempt: StudyAttempt
	}
	readonly operational: StudyCriterion
	readonly meaning: StudyCriterion
	readonly source: StudyCriterion
	readonly lookup: StudyCriterion
	readonly result: StudyCriterion
	readonly rubric: StudyRubric
	readonly failure: StudyFailure
	readonly attempts: readonly StudyAttempt[]
	/** Holds the evidence rows keyed by trial id. */
	readonly evidence: Readonly<Record<string, readonly StudyEvidence[]>>
}

/** Holds the observation-independent subset two trials must agree on. */
export type MemoryAdmissionFixture = Pick<
	MemoryTrialResult,
	'requests' | 'products' | 'failure' | 'usage'
>
