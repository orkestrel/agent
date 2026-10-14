import type {
	StudyIdentity,
	StudyProfile,
	StudyTicket,
	StudyTrial,
	StudyUsage,
	StudyFailure,
} from '../../../core/studies/types.js'
import type { StudyControl } from '../../../core/studies/engines/StudyControl.js'
import type { StudyChannel } from './StudyChannel.js'
import type { JSONValue } from '@orkestrel/contract'
import type { ChildProcess } from 'node:child_process'

/** Holds the trusted instrument and caller-selected built artifact locations. */
export interface StudyArtifactOptions {
	readonly entry: string
	readonly root: string
	readonly profile: StudyProfile
}

/** Holds the separately bound instrument and selected module inventory identities. */
export interface StudyArtifactIdentity {
	readonly subject: string
	readonly provider: string | undefined
	readonly instrument: string
}

/** Holds actual namespaces loaded only during worker execution. */
export interface StudyArtifactModules {
	readonly subject: unknown
	readonly provider: unknown
}

/** Holds the parent-owned fresh trial process configuration. */
export interface StudyProcessOptions extends StudyArtifactOptions {
	readonly identity: StudyIdentity
	readonly driver: string
	readonly directory: string
}

/** Names the bounded transport's domain operations. */
export type StudyOperation = 'open' | 'goal' | 'close' | 'admit' | 'finish' | 'fail' | 'evidence'

/** Holds a correlated JSON request, reply or cancellation notification. */
export interface StudyFrame {
	readonly version: 1
	readonly id: number
	readonly operation: StudyOperation | 'reply' | 'error' | 'abort'
	readonly value: JSONValue
}

/** Handles validated transport requests at their owning domain boundary. */
export type StudyMessageHandler = (
	operation: StudyOperation,
	value: JSONValue,
) => Promise<JSONValue>

/** Holds one native IPC endpoint and its domain handlers. */
export interface StudyChannelOptions {
	readonly endpoint: ChildProcess | NodeJS.Process
	readonly handle: StudyMessageHandler
	readonly abort: (value: JSONValue) => void
}

/** Holds an outstanding bounded IPC response. */
export interface StudyResponse {
	readonly resolve: (value: JSONValue) => void
	readonly reject: (error: unknown) => void
}

/** Holds one fresh child trial's launch parameters and cancellation. */
export interface StudyProcessSessionOptions extends StudyProcessOptions {
	readonly trial: StudyTrial
	readonly signal: AbortSignal
}

/** Holds an authoritative parent ticket and its transport listener lifetime. */
export interface StudyParentTicket {
	readonly ticket: StudyTicket
	readonly listeners: AbortController
}

/** Holds the worker meter's parent-authorized transport and failure latch. */
export interface StudyRemoteMeterOptions {
	readonly channel: StudyChannel
	readonly control: StudyControl
}

/** Holds one transported ticket's identity and settlement owner. */
export interface StudyRemoteTicketOptions {
	readonly id: number
	readonly signal: AbortSignal
	readonly settle: (operation: 'finish' | 'fail', value: StudyUsage | StudyFailure) => void
}
