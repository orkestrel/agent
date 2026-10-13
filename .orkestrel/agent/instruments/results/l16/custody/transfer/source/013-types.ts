/** Binds one source or emitted resource to its relative path and exact bytes. */
export interface BuildFile {
	readonly path: string
	readonly hash: string
}

/** Records the complete compiler boundary used by measured entrypoints. */
export interface BuildManifest {
	readonly version: 1
	readonly compiler: {
		readonly path: string
		readonly hash: string
		readonly version: string
		readonly inputs: readonly BuildFile[]
	}
	readonly sources: readonly BuildFile[]
	readonly resources: readonly BuildFile[]
	readonly outputs: readonly BuildFile[]
}
