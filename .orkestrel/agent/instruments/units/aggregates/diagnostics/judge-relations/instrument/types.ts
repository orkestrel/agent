import type { JudgeResult } from '../../../.orkestrel/agent/instruments/harness/node_modules/@orkestrel/agent/dist/src/core/index.js'

/** Carries a file's prospective byte binding. */
export interface Binding {
	readonly path: string
	readonly hash: string
	readonly bytes: number
}

/** Carries one exact diagnostic transformation. */
export interface Variant {
	readonly name: string
	readonly expectation: string
	readonly repair: boolean
	readonly cause: boolean
	readonly candidate: string
	readonly state: string
}

/** Carries the frozen counterfactual packet. */
export interface Packet {
	readonly id: string
	readonly identity: string
	readonly digest: string
	readonly question: unknown
	readonly separator: string
	readonly sources: readonly unknown[]
	readonly suffix: string
	readonly sequence: readonly string[]
	readonly variants: readonly Variant[]
	readonly bindings: readonly Binding[]
	readonly rendering: readonly { readonly name: string; readonly body: string }[]
}

/** Carries the explicit execution custody arguments. */
export interface ExecutionOptions {
	readonly packet: string
	readonly build: string
	readonly operator: string
	readonly output: string
}

/** Carries an actual completed score and its independent replay. */
export interface Reading {
	readonly ordinal: number
	readonly name: string
	readonly score: number
	readonly replay: number
	readonly difference: number
	readonly body: string
	readonly response: string
	readonly usage: unknown
	readonly wall: number
}

/** Carries the response capture and exclusive per-request artifact destination. */
export interface CompletionOptions {
	readonly output: string
	readonly label: string
	readonly capture: { readonly response: Uint8Array | undefined }
}

/** Invokes real request or decoder behavior inside the completion boundary. */
export type CompletionFunction = () => JudgeResult | Promise<JudgeResult>

/** Carries an observed raw field or the reason it cannot be read. */
export type WireField = { readonly availability: 'present'; readonly value: unknown } | { readonly availability: 'absent' | 'unparseable' }

/** Carries independent captured-body accounting without interpreting a score. */
export interface WireEvidence {
	readonly body: { readonly availability: 'present' | 'absent' | 'unparseable'; readonly hash?: string; readonly bytes?: number; readonly error?: string }
	readonly token: WireField
	readonly finish: WireField
	readonly top: WireField
	readonly usage: { readonly prompt: WireField; readonly completion: WireField }
	readonly timing: { readonly total: WireField; readonly load: WireField; readonly prompt: WireField; readonly evaluation: WireField }
}
