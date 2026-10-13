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
