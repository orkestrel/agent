import type { LoadHook, ResolveHook } from 'node:module'

/** Names Node's asynchronous resolution continuation. */
export type ArtifactResolveHandler = Parameters<ResolveHook>[2]

/** Names Node's asynchronous loading continuation. */
export type ArtifactLoadHandler = Parameters<LoadHook>[2]

/** Describes caller-selected built packages and the trusted hook entry. */
export interface ArtifactOptions {
	readonly entries: readonly string[]
	readonly roots: readonly string[]
	readonly hook: string
}

/** Records the exact bytes admitted at one absolute file path. */
export interface ArtifactFile {
	readonly path: string
	readonly digest: string
	readonly size: number
}

/** Records the identity declared by an admitted package manifest. */
export interface ArtifactPackage {
	readonly root: string
	readonly name: string
	readonly version: string
}

/** Records the complete admitted module inventory, including unused modules. */
export interface ArtifactInventory {
	readonly digest: string
	readonly node: string
	readonly runtime: ArtifactRuntime
	readonly entries: readonly string[]
	readonly packages: readonly ArtifactPackage[]
	readonly files: readonly ArtifactFile[]
}

/** Binds native conditions and host-sensitive builtin behavior to the inventory. */
export interface ArtifactRuntime {
	readonly arguments: readonly string[]
	readonly platform: string
	readonly architecture: string
	readonly options?: string
}

/** Carries captured bytes to the native loader's separate thread. */
export interface ArtifactSource extends ArtifactFile {
	readonly source: Uint8Array
}

/** Supplies the private namespace and captured inventory to the loader. */
export interface ArtifactHookInput {
	readonly token: string
	readonly files: readonly ArtifactSource[]
}
