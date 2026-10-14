import type { ArtifactSource } from './types.ts'
import { createHash } from 'node:crypto'
import { lstatSync, readFileSync, realpathSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'

/** Computes a SHA-256 identity for exact bytes.
 * @param input - Bytes or UTF-8 text to identify.
 * @returns The lowercase hexadecimal digest.
 */
export function hashBytes(input: string | Uint8Array): string {
	return createHash('sha256').update(input).digest('hex')
}

/** Reads a regular file only through its canonical absolute path.
 * @param path - The absolute path to inspect.
 * @returns Captured bytes with their identity.
 * @throws Thrown when the path is relative, linked, or not a regular file.
 */
export function readArtifact(path: string): ArtifactSource {
	if (
		!isAbsolute(path) ||
		resolve(path) !== path ||
		realpathSync(path) !== path ||
		!lstatSync(path).isFile()
	) {
		throw new Error(`Artifact requires a canonical regular file: ${path}`)
	}
	const source = readFileSync(path)
	return { path, digest: hashBytes(source), size: source.byteLength, source }
}
