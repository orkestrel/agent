import type { BuildFile, BuildManifest } from './types.js'
import type { RefitFile } from '../refit/types.js'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { isRecord } from '@orkestrel/contract'

export const BUILD = resolve(import.meta.dirname, '..', '..')
export const SOURCE = dirname(BUILD)

function isFile(value: unknown): value is BuildFile {
	return (
		isRecord(value) &&
		typeof value.path === 'string' &&
		typeof value.hash === 'string' &&
		/^[a-f0-9]{64}$/.test(value.hash)
	)
}

function listFiles(path: string): readonly string[] {
	return readdirSync(path, { withFileTypes: true })
		.flatMap((entry) => {
			if (entry.isSymbolicLink()) throw new Error('build population contains a symlink')
			const next = join(path, entry.name)
			return entry.isDirectory() ? listFiles(next) : [next]
		})
		.sort()
}

function verify(root: string, files: readonly BuildFile[]): void {
	for (const file of files) {
		const path = resolve(root, file.path)
		if (
			!path.startsWith(`${root}${sep}`) ||
			!existsSync(path) ||
			createHash('sha256').update(readFileSync(path)).digest('hex') !== file.hash
		)
			throw new Error(`missing or stale build input: ${file.path}`)
	}
}

/** Refuses stale or absent emitted code and returns its exact custody record.
 * @returns The checked build manifest
 */
export function readBuild(): BuildManifest {
	if (!BUILD.endsWith(`${sep}.build`))
		throw new Error('run the canonical emitted .build entrypoint')
	const path = join(BUILD, 'build-manifest.json')
	if (!existsSync(path)) throw new Error('missing canonical build manifest')
	const value: unknown = JSON.parse(readFileSync(path, 'utf8'))
	if (
		!isRecord(value) ||
		value.version !== 1 ||
		!isRecord(value.compiler) ||
		typeof value.compiler.path !== 'string' ||
		typeof value.compiler.hash !== 'string' ||
		typeof value.compiler.version !== 'string' ||
		!Array.isArray(value.compiler.inputs) ||
		!value.compiler.inputs.every(isFile) ||
		value.compiler.inputs.length === 0 ||
		!Array.isArray(value.sources) ||
		!value.sources.every(isFile) ||
		!Array.isArray(value.resources) ||
		!value.resources.every(isFile) ||
		!Array.isArray(value.outputs) ||
		!value.outputs.every(isFile)
	)
		throw new Error('invalid build manifest')
	const manifest: BuildManifest = {
		version: 1,
		compiler: {
			path: value.compiler.path,
			hash: value.compiler.hash,
			version: value.compiler.version,
			inputs: value.compiler.inputs,
		},
		sources: value.sources,
		resources: value.resources,
		outputs: value.outputs,
	}
	verify(SOURCE, manifest.sources)
	verify(BUILD, manifest.outputs)
	for (const resource of manifest.resources)
		if (
			!existsSync(resource.path) ||
			createHash('sha256').update(readFileSync(resource.path)).digest('hex') !== resource.hash
		)
			throw new Error('stale bound workload manifest')
	const expected = ['bench5', 'tools', 'audit', 'vendor', 'bench', 'bench3', 'data']
		.flatMap((name) => listFiles(join(SOURCE, name)))
		.filter((file) => !file.includes(`${sep}node_modules${sep}`))
		.concat(
			['build.json', 'package.json', 'package-lock.json', 'README.md'].map((file) =>
				join(SOURCE, file),
			),
		)
		.map((file) => relative(SOURCE, file).split(sep).join('/'))
		.sort()
	if (JSON.stringify(expected) !== JSON.stringify(manifest.sources.map((file) => file.path).sort()))
		throw new Error('stale source membership; rebuild required')
	if (
		!existsSync(manifest.compiler.path) ||
		createHash('sha256').update(readFileSync(manifest.compiler.path)).digest('hex') !==
			manifest.compiler.hash
	)
		throw new Error('compiler identity changed')
	for (const input of manifest.compiler.inputs)
		if (
			!existsSync(input.path) ||
			createHash('sha256').update(readFileSync(input.path)).digest('hex') !== input.hash
		)
			throw new Error(`compiler or external declaration changed: ${input.path}`)
	return manifest
}

/** Resolves private/public artifact identities through the same frozen build without opening private bytes.
 * @param runtime - Exact safe runtime identity
 * @returns Its bound workload manifest and opaque artifact identities
 */
export function readWorkload(runtime: RefitFile): {
	readonly manifest: RefitFile
	readonly files: readonly RefitFile[]
} {
	const build = readBuild()
	const matches: Array<{ readonly manifest: RefitFile; readonly files: readonly RefitFile[] }> = []
	for (const reference of build.resources) {
		const value: unknown = JSON.parse(readFileSync(reference.path, 'utf8'))
		if (
			!isRecord(value) ||
			value.schema !== 1 ||
			!Array.isArray(value.files) ||
			!value.files.every(isFile)
		)
			throw new Error('invalid bound workload manifest')
		if (
			value.files.some(
				(file) =>
					file.hash === runtime.hash && file.path.replaceAll('\\', '/').includes('/runtime/'),
			)
		)
			matches.push({
				manifest: reference,
				files: value.files.map((file) => ({
					path: resolve(SOURCE, '../../../..', file.path),
					hash: file.hash,
				})),
			})
	}
	if (matches.length !== 1 || matches[0] === undefined)
		throw new Error('runtime has no unique frozen workload manifest')
	return matches[0]
}
