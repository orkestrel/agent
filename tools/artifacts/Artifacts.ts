import type {
	ArtifactInventory,
	ArtifactOptions,
	ArtifactPackage,
	ArtifactSource,
} from './types.ts'
import { randomUUID } from 'node:crypto'
import { lstatSync, readdirSync, realpathSync } from 'node:fs'
import { register } from 'node:module'
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { hashBytes, readArtifact } from './helpers.ts'

/** Captures and loads an explicit built ESM inventory in a dedicated process.
 * @remarks
 * Supports trusted ESM and JSON below each package's dist directory. It is not a
 * sandbox: eval, process APIs, native addons, alternate loaders and child execution
 * are outside the contract. CommonJS and direct loader-builtin imports are refused.
 * One instance may load per process; terminate that process after its trial.
 */
export class Artifacts {
	static #active = false
	#options: ArtifactOptions
	#inventory: ArtifactInventory | undefined
	#sources: readonly ArtifactSource[] = []
	#token: string | undefined

	/** Captures options without reading or executing selected code.
	 * @param options - Absolute entries, package roots, and the trusted loader hook path.
	 */
	constructor(options: ArtifactOptions) {
		this.#options = { ...options, entries: [...options.entries], roots: [...options.roots] }
	}

	/** Reads and hashes the admitted files without importing any selected module.
	 * @returns Immutable evidence identifying all admitted module bytes and Node.
	 * @throws Thrown for invalid paths, duplicate packages, unsupported manifests, or drift.
	 */
	inspect(): ArtifactInventory {
		if (this.#inventory !== undefined) {
			this.verify()
			return this.#inventory
		}
		if (this.#options.entries.length === 0 || this.#options.roots.length === 0) {
			throw new Error('Artifact entries and roots must be nonempty')
		}
		const sources: ArtifactSource[] = []
		const packages: ArtifactPackage[] = []
		for (const root of [...this.#options.roots].sort()) {
			if (
				!isAbsolute(root) ||
				resolve(root) !== root ||
				realpathSync(root) !== root ||
				!lstatSync(root).isDirectory()
			) {
				throw new Error(`Artifact requires a canonical package root: ${root}`)
			}
			const manifest = readArtifact(join(root, 'package.json'))
			const value: unknown = JSON.parse(Buffer.from(manifest.source).toString('utf8'))
			if (
				typeof value !== 'object' ||
				value === null ||
				!('type' in value) ||
				value.type !== 'module' ||
				!('name' in value) ||
				typeof value.name !== 'string' ||
				value.name.length === 0 ||
				!('version' in value) ||
				typeof value.version !== 'string' ||
				value.version.length === 0
			) {
				throw new Error(`Artifact requires a named, versioned ESM package: ${root}`)
			}
			if (packages.some((item) => item.name === value.name || item.root === root)) {
				throw new Error(`Artifact package identity is duplicated: ${value.name}`)
			}
			packages.push(Object.freeze({ root, name: value.name, version: value.version }))
			sources.push(manifest)
			this.#walk(join(root, 'dist'), sources)
		}
		const entries = [...new Set(this.#options.entries)].sort()
		for (const entry of entries) {
			if (
				!['.js', '.mjs'].includes(extname(entry)) ||
				!sources.some((file) => file.path === entry) ||
				!packages.some((item) => {
					const location = relative(join(item.root, 'dist'), entry)
					return (
						location !== '' &&
						!location.startsWith(`..${sep}`) &&
						location !== '..' &&
						!isAbsolute(location)
					)
				})
			) {
				throw new Error(`Artifact entry must be admitted built ESM: ${entry}`)
			}
		}
		sources.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0))
		const settings = process.env.NODE_OPTIONS
		const evidence = {
			node: process.version,
			runtime: Object.freeze({
				arguments: Object.freeze([...process.execArgv]),
				platform: process.platform,
				architecture: process.arch,
				...(settings === undefined ? {} : { options: settings }),
			}),
			entries: Object.freeze(entries),
			packages: Object.freeze(packages),
			files: Object.freeze(
				sources.map(({ path, digest, size }) => Object.freeze({ path, digest, size })),
			),
		}
		this.#sources = sources
		this.#inventory = Object.freeze({ digest: hashBytes(JSON.stringify(evidence)), ...evidence })
		this.verify()
		return this.#inventory
	}

	/** Refuses byte or inventory drift since inspection.
	 * @throws Thrown when an admitted file or the admitted file population changes.
	 */
	verify(): void {
		if (this.#inventory === undefined) throw new Error('Artifact inspection is required')
		const current: ArtifactSource[] = []
		for (const item of this.#inventory.packages) {
			current.push(readArtifact(join(item.root, 'package.json')))
			this.#walk(join(item.root, 'dist'), current)
		}
		if (
			current.length !== this.#sources.length ||
			current.some(
				(file) =>
					!this.#sources.some(
						(source) => source.path === file.path && source.digest === file.digest,
					),
			)
		) {
			throw new Error('Artifact inventory drifted')
		}
	}

	/** Imports a selected entry through the captured inventory's native loader hook.
	 * @param entry - One exact absolute entry named in the inspected inventory.
	 * @returns The actual module namespace, for the caller to narrow.
	 * @throws Thrown for drift, unsupported imports, or another active inventory.
	 */
	async load(entry: string): Promise<unknown> {
		const inventory = this.inspect()
		if (!inventory.entries.includes(entry)) throw new Error('Artifact entry was not selected')
		if (this.#token === undefined) {
			if (Artifacts.#active) throw new Error('Artifact loading requires a fresh process')
			readArtifact(this.#options.hook)
			this.#token = randomUUID()
			Artifacts.#active = true
			register(pathToFileURL(this.#options.hook), {
				data: { token: this.#token, files: this.#sources },
			})
		}
		const url = pathToFileURL(entry)
		url.searchParams.set('artifact', this.#token)
		const namespace: unknown = await import(url.href)
		this.verify()
		return namespace
	}

	#walk(directory: string, sources: ArtifactSource[]): void {
		if (realpathSync(directory) !== directory || !lstatSync(directory).isDirectory()) {
			throw new Error(`Artifact directory must not be linked: ${directory}`)
		}
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const path = join(directory, entry.name)
			if (entry.isSymbolicLink()) throw new Error(`Artifact links are unsupported: ${path}`)
			if (entry.isDirectory()) this.#walk(path, sources)
			else if (['.js', '.mjs', '.cjs', '.json'].includes(extname(path)))
				sources.push(readArtifact(path))
		}
	}
}
