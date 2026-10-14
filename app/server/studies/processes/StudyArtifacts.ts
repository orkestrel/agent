import type { StudyArtifactIdentity, StudyArtifactModules, StudyArtifactOptions } from './types.js'
import { createHash } from 'node:crypto'
import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import { Artifacts } from '../../../../tools/artifacts/Artifacts.ts'
import { StudyError } from '../../../core/studies/errors.js'

/** Binds trusted instrument bytes separately from selected built module inventories. */
export class StudyArtifacts {
	#options: StudyArtifactOptions
	#loader: Artifacts | undefined
	#identity: StudyArtifactIdentity | undefined

	/** Owns resolved artifact locations without evaluating selected code.
	 * @param options - Built instrument, repository root and resolved profile.
	 */
	constructor(options: StudyArtifactOptions) {
		this.#options = structuredClone(options)
		if (
			![
				options.entry,
				options.root,
				options.profile.subject,
				...options.profile.roots,
				...(options.profile.provider === undefined ? [] : [options.profile.provider.entry]),
			].every(isAbsolute)
		)
			throw new StudyError('CONFIG', 'Study artifact paths must be absolute')
	}

	/** Inventories bytes without importing caller-selected subject or provider modules.
	 * @returns The exact subject, provider and instrument identities.
	 */
	async inspect(): Promise<StudyArtifactIdentity> {
		if (this.#identity !== undefined) {
			this.verify()
			return this.#identity
		}
		const instrument = this.#instrument()
		const profile = this.#options.profile
		const loader = new Artifacts({
			entries: [
				profile.subject,
				...(profile.provider === undefined ? [] : [profile.provider.entry]),
			],
			roots: profile.roots,
			hook: join(this.#options.root, 'tools', 'artifacts', 'handlers.ts'),
		})
		const inventory = loader.inspect()
		this.#loader = loader
		this.#identity = Object.freeze({
			subject: inventory.digest,
			provider: profile.provider === undefined ? undefined : inventory.digest,
			instrument,
		})
		this.verify()
		return this.#identity
	}

	/** Loads only the selected entries through the verified native inventory loader.
	 * @returns Actual subject and optional provider namespaces.
	 */
	async load(): Promise<StudyArtifactModules> {
		await this.inspect()
		if (this.#loader === undefined)
			throw new StudyError('CONFIG', 'Artifact inspection is required')
		const subject = await this.#loader.load(this.#options.profile.subject)
		const provider =
			this.#options.profile.provider === undefined
				? undefined
				: await this.#loader.load(this.#options.profile.provider.entry)
		this.verify()
		return Object.freeze({ subject, provider })
	}

	/** Refuses instrument or selected inventory drift after inspection. */
	verify(): void {
		if (this.#identity === undefined || this.#loader === undefined)
			throw new StudyError('CONFIG', 'Artifact inspection is required')
		if (this.#instrument() !== this.#identity.instrument)
			throw new StudyError('FAULT', 'Study instrument bytes drifted')
		this.#loader.verify()
	}

	#instrument(): string {
		const directory = join(this.#options.root, 'tools', 'artifacts')
		const paths = [
			this.#options.entry,
			...readdirSync(directory)
				.filter((name) => name.endsWith('.ts'))
				.sort()
				.map((name) => join(directory, name)),
		]
		const hash = createHash('sha256')
		for (const path of paths) {
			if (realpathSync(path) !== path || !lstatSync(path).isFile())
				throw new StudyError('CONFIG', 'Instrument files must be canonical regular files')
			hash.update(
				JSON.stringify([path, createHash('sha256').update(readFileSync(path)).digest('hex')]),
			)
		}
		return hash.digest('hex')
	}
}
