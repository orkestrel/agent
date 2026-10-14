/** Describes validated driver inputs and spending bounds. */
export interface Options {
	readonly packet: string
	readonly hashes: { readonly packet: string; readonly keys: string }
	readonly unit: string
	readonly concurrency: number
	readonly limit: number | undefined
	readonly cap: number
	readonly plan: boolean
}

/** Describes a stable assignment and its sole output path. */
export interface Batch {
	readonly name: string
	readonly ids: readonly string[]
	readonly output: string
}
