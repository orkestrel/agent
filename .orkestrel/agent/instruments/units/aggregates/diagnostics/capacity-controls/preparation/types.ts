/** Describes an exact retained file binding. */
export interface Binding {
	readonly path: string
	readonly hash: string
	readonly bytes: number
}

/** Describes a frozen deployed model identity. */
export interface Model {
	readonly key: string
	readonly tag: string
	readonly digest: string
	readonly route: '/api/chat' | '/api/generate'
}

/** Describes a diagnostic request in serial execution order. */
export interface Vector {
	readonly id: string
	readonly model: string
	readonly route: '/api/chat' | '/api/generate'
	readonly body: string
	readonly hash: string
	readonly bytes: number
}

/** Describes the offline packet without certifying service behavior. */
export interface Packet {
	readonly version: 1
	readonly daemon: string
	readonly models: readonly Model[]
	readonly bindings: readonly Binding[]
	readonly operator: string
	readonly limits: Limits
	readonly vectors: readonly Vector[]
}

/** Describes operational ceilings rather than experimental resource settings. */
export interface Limits {
	readonly inference: number
	readonly request: number
	readonly response: number
	readonly metadata: number
	readonly timeout: number
	readonly snapshot: number
	readonly duration: number
}

/** Describes exact operator authorization supplied before HTTP. */
export interface ExecutionOptions {
	readonly packet: string
	readonly operator: string
	readonly receipt: string
	readonly custody: string
	readonly output: string
	readonly host: string
}

/** Describes an attached controlled daemon's retained nonsecret launch facts. */
export interface DaemonReceipt {
	readonly executable: Binding
	readonly values: Readonly<Record<string, string>>
	readonly pid?: number
	readonly started: string
	readonly finished?: string
	readonly exit?: number | null
	readonly signal?: NodeJS.Signals | null
}

/** Describes raw HTTP custody independently of response semantics. */
export interface Capture {
	readonly id: string
	readonly complete: boolean
	readonly breached: boolean
	readonly bytes: number
	readonly hash: string
	readonly status?: number
	readonly started: string
	readonly finished: string
	readonly duration: number
	readonly error?: unknown
}

/** Describes preflight results before an execution directory is created. */
export interface Admission {
	readonly packet: Packet
	readonly output: string
	readonly receipt: DaemonReceipt
	readonly binding: Binding
}
