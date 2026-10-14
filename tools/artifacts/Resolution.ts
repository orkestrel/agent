import type {
	LoadHookContext,
	LoadFnOutput,
	ResolveHookContext,
	ResolveFnOutput,
} from 'node:module'
import type { ArtifactHookInput, ArtifactLoadHandler, ArtifactResolveHandler } from './types.ts'
import { isBuiltin } from 'node:module'
import { basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readArtifact } from './helpers.ts'

/** Enforces the admitted namespace in Node's separate asynchronous loader thread. */
export class Resolution {
	#input: ArtifactHookInput | undefined

	/** Receives the trusted parent's captured inventory.
	 * @param input - Structured-cloned inventory and namespace token.
	 */
	initialize(input: ArtifactHookInput): void {
		if (this.#input !== undefined) throw new Error('Artifact hook was initialized twice')
		this.#input = input
	}

	/** Resolves native ESM edges and refuses targets outside the inventory.
	 * @param specifier - The native import specifier.
	 * @param context - Node's resolution context.
	 * @param next - The remaining native resolution chain.
	 * @returns The admitted URL with the inventory namespace preserved.
	 */
	async resolve(
		specifier: string,
		context: ResolveHookContext,
		next: ArtifactResolveHandler,
	): Promise<ResolveFnOutput> {
		const input = this.#input
		if (input === undefined) throw new Error('Artifact hook is uninitialized')
		const parent = context.parentURL === undefined ? undefined : new URL(context.parentURL)
		const initial = specifier.startsWith('file:') ? new URL(specifier) : undefined
		if (
			parent?.searchParams.get('artifact') !== input.token &&
			initial?.searchParams.get('artifact') !== input.token
		)
			return next(specifier, context)
		if (isBuiltin(specifier)) {
			if (
				['module', 'vm', 'worker_threads', 'child_process', 'cluster'].includes(
					specifier.replace(/^node:/, ''),
				)
			)
				throw new Error(`Artifact alternate loader is unsupported: ${specifier}`)
			return next(specifier, context)
		}
		for (const file of input.files) {
			if (basename(file.path) === 'package.json' && readArtifact(file.path).digest !== file.digest)
				throw new Error(`Artifact manifest drifted: ${file.path}`)
		}
		const result = await next(specifier, context)
		const url = new URL(result.url)
		if (
			url.protocol !== 'file:' ||
			url.hash !== '' ||
			(url.search !== '' && url.searchParams.get('artifact') !== input.token)
		)
			throw new Error(`Artifact URL is unsupported: ${result.url}`)
		url.search = ''
		const file = input.files.find((item) => item.path === fileURLToPath(url))
		if (
			file === undefined ||
			!['.js', '.mjs', '.json'].includes(extname(file.path)) ||
			(result.format !== 'module' && result.format !== 'json')
		)
			throw new Error(`Artifact dependency is not admitted ESM: ${result.url}`)
		if (readArtifact(file.path).digest !== file.digest)
			throw new Error(`Artifact dependency drifted: ${file.path}`)
		url.searchParams.set('artifact', input.token)
		return { ...result, url: url.href }
	}

	/** Loads captured bytes after checking their current disk identity.
	 * @param href - Node's resolved URL.
	 * @param context - Node's load context.
	 * @param next - The remaining native load chain.
	 * @returns The exact admitted source bytes.
	 */
	async load(
		href: string,
		context: LoadHookContext,
		next: ArtifactLoadHandler,
	): Promise<LoadFnOutput> {
		const input = this.#input
		if (input === undefined) throw new Error('Artifact hook is uninitialized')
		const url = new URL(href)
		if (url.searchParams.get('artifact') !== input.token) return next(href, context)
		url.search = ''
		const file = input.files.find((item) => item.path === fileURLToPath(url))
		if (file === undefined || (context.format !== 'module' && context.format !== 'json'))
			throw new Error(`Artifact load is unsupported: ${href}`)
		if (readArtifact(file.path).digest !== file.digest)
			throw new Error(`Artifact dependency drifted: ${file.path}`)
		// Node transfers this buffer out of the hook thread; retain the captured inventory.
		return { format: context.format, source: new Uint8Array(file.source), shortCircuit: true }
	}
}
