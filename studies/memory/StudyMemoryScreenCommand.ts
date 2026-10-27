import type { StudyCommandOptions } from '@orkestrel/study/server'
import type { StudyMemoryScreenRecipe, StudyMemoryScreenPopulation } from './types.js'
import { canonicalStringify, recordOf, isString, parseJSON } from '@orkestrel/contract'
import { StudyError, parseStudyProfile } from '@orkestrel/study'
import {
	StudyCommand,
	readStudyClosure,
	readStudyDeclaration,
	readStudyDeclarationBytes,
	decodeStudyJSON,
	resolveStudyProfile,
	readStudyReplayHistory,
	readStudyBytes,
} from '@orkestrel/study/server'
import { access } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
	readStudyMemoryAdmission,
	validateStudyMemoryClosures,
	validateStudyMemoryProfile,
	validateStudyMemoryScreen,
	buildStudyMemoryMatched,
	validateStudyMemoryHost,
} from './helpers.js'
import { isStudyMemoryOptions, isStudyMemoryScreenLaunch } from './validators.js'

/** Binds the actual root CLI selection to checked custody before a daemon can start. */
export class StudyMemoryScreenCommand {
	readonly #options: StudyCommandOptions
	/** Retains the existing installed host entry and consumer root. @param options - Native Study host selection. */
	constructor(options: StudyCommandOptions) {
		this.#options = { ...options }
	}

	/** Reconstructs all four matched declarations from checked preparation, without executing them. @param input - Absolute source directory, closure and retained seal. @param signal - Offline admission deadline. @returns One immutable source receipt and fixed control profiles. */
	async prepare(input: unknown, signal: AbortSignal): Promise<StudyMemoryScreenPopulation> {
		if (
			!recordOf({ directory: isString, closure: isString, seal: isString })(input) ||
			!isAbsolute(input.directory) ||
			!isAbsolute(input.closure)
		)
			throw new StudyError(
				'CONFIG',
				'Screen preparation reading requires exact absolute source selection',
			)
		const source = readStudyClosure(input.closure)
		validateStudyMemoryHost(source, this.#options.entry)
		await new StudyCommand(this.#options).execute(
			['check', source.target, '--profile', source.profile, '--closure', input.closure],
			signal,
		)
		const declaration = await readStudyDeclaration(source.root, source.target, signal)
		const authored = parseStudyProfile(
			decodeStudyJSON(
				await readStudyDeclarationBytes(
					source.root,
					join(declaration.bundle, 'profiles', `${source.profile}.json`),
				),
			),
		)
		const profile = resolveStudyProfile(source.root, authored, source.closure)
		const admission = await readStudyMemoryAdmission({
			directory: input.directory,
			definition: declaration.definition,
			scenarios: declaration.scenarios,
			profile,
			identity: source.identity,
		})
		if (input.seal !== admission.seal)
			throw new StudyError('CUSTODY', 'Screen preparation seal differs')
		return {
			admission,
			profiles: [
				{ name: 'r2-off-04011', work: false, sham: false },
				{ name: 'r2-repeat-04011', work: false, sham: false },
				{ name: 'r2-sham-04011', work: false, sham: true },
				{ name: 'r2-on-04011', work: true, sham: false },
			].map((treatment) => buildStudyMemoryMatched(authored, admission, treatment)),
		}
	}

	/** Checks the exact closures and source prefix and returns fixed execute arguments. @param input - Immutable root-owned selection. @param signal - Admission deadline. @returns The sole admitted argv; this method starts no daemon. */
	async admit(input: unknown, signal: AbortSignal): Promise<StudyMemoryScreenRecipe> {
		if (
			!isStudyMemoryScreenLaunch(input) ||
			!isAbsolute(input.output) ||
			!isAbsolute(input.closure) ||
			(input.source !== undefined &&
				(!isAbsolute(input.source.directory) || !isAbsolute(input.source.closure)))
		)
			throw new StudyError('CONFIG', 'Screen requires an exact selection with absolute paths')
		await access(input.output).then(
			() => {
				throw new StudyError('CUSTODY', 'Screen output already exists')
			},
			(error: unknown) => {
				if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
			},
		)
		const closure = readStudyClosure(input.closure)
		if (closure.target !== 'r2-request-screen' || closure.fingerprint !== input.expected)
			throw new StudyError('CUSTODY', 'Screen expected fingerprint or study differs')
		validateStudyMemoryHost(closure, this.#options.entry)
		const command = new StudyCommand(this.#options)
		await command.execute(
			['check', closure.target, '--profile', closure.profile, '--closure', input.closure],
			signal,
		)
		const declaration = await readStudyDeclaration(closure.root, closure.target, signal)
		const profile = resolveStudyProfile(
			closure.root,
			parseStudyProfile(
				decodeStudyJSON(
					await readStudyDeclarationBytes(
						closure.root,
						join(declaration.bundle, 'profiles', `${closure.profile}.json`),
					),
				),
			),
			closure.closure,
		)
		validateStudyMemoryProfile(profile, ['records'])
		validateStudyMemoryScreen(declaration.definition, declaration.scenarios, profile)
		const settings = isStudyMemoryOptions(profile.settings) ? profile.settings : undefined
		const screen = settings?.screen
		if (screen === undefined || screen === false)
			throw new StudyError('CONFIG', 'Screen launch requires enabled settings')
		const prefix =
			screen.admission === undefined
				? undefined
				: Object.fromEntries(screen.admission.trials.map((trial) => [trial.id, trial.prefix]))
		if (screen.preparation) {
			if (input.source !== undefined || input.replay !== undefined)
				throw new StudyError('CONFIG', 'Screen preparation cannot select replay')
		} else {
			if (
				input.source === undefined ||
				input.replay === undefined ||
				screen.admission === undefined
			)
				throw new StudyError('CONFIG', 'Screen matched launch lacks source admission')
			const source = readStudyClosure(input.source.closure)
			validateStudyMemoryHost(source, this.#options.entry)
			await command.execute(
				['check', source.target, '--profile', source.profile, '--closure', input.source.closure],
				signal,
			)
			const original = await readStudyDeclaration(source.root, source.target, signal)
			const preparation = resolveStudyProfile(
				source.root,
				parseStudyProfile(
					decodeStudyJSON(
						await readStudyDeclarationBytes(
							source.root,
							join(original.bundle, 'profiles', `${source.profile}.json`),
						),
					),
				),
				source.closure,
			)
			const admission = await readStudyMemoryAdmission({
				directory: input.source.directory,
				definition: original.definition,
				scenarios: original.scenarios,
				profile: preparation,
				identity: source.identity,
			})
			if (
				input.source.seal !== admission.seal ||
				canonicalStringify(admission) !== canonicalStringify(screen.admission) ||
				canonicalStringify(input.replay) !==
					canonicalStringify({ result: admission.directory, prefix, offline: false })
			)
				throw new StudyError(
					'CUSTODY',
					'Screen CLI source or prefix differs from immutable admission',
				)
			validateStudyMemoryClosures(source, closure)
			const originalSettings = isStudyMemoryOptions(preparation.settings)
				? preparation.settings
				: undefined
			const {
				screen: _originalScreen,
				ledger: _originalLedger,
				...originalRest
			} = originalSettings ?? {}
			const { screen: _screen, ledger: _ledger, ...rest } = settings ?? {}
			const { entry: _originalEntry, ...originalProvider } = preparation.provider ?? {}
			const { entry: _entry, ...provider } = profile.provider ?? {}
			if (
				canonicalStringify(originalRest) !== canonicalStringify(rest) ||
				canonicalStringify(profile.room) !== canonicalStringify(preparation.room) ||
				canonicalStringify(provider) !== canonicalStringify(originalProvider)
			)
				throw new StudyError('CUSTODY', 'Screen non-treatment settings or serving runtime differ')
			for (const [index, scenario] of declaration.scenarios.entries())
				await readStudyReplayHistory(input.replay, profile, {
					id: `r1-s${index + 1}-a1`,
					scenario: scenario.id,
					arm: 'records',
					repetition: 0,
				})
		}
		return {
			entry: this.#options.entry,
			root: this.#options.root,
			fingerprint: closure.fingerprint,
			duration: profile.bounds.series.duration + 15000,
			admission: screen.admission,
			arguments: [
				'execute',
				closure.target,
				'--profile',
				closure.profile,
				'--expected',
				closure.fingerprint,
				'--closure',
				input.closure,
				'--out',
				input.output,
				...(input.replay === undefined
					? []
					: [
							'--replay',
							input.replay.result,
							'--prefix',
							JSON.stringify(input.replay.prefix),
							'--offline',
							'false',
						]),
			],
		}
	}
}

// The consumer module is also its native admission entry; launchers import only node: modules.
if (
	process.argv[1] !== undefined &&
	pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
	const [root, entry, operation, path] = process.argv.slice(2)
	if (
		process.argv.length !== 6 ||
		root === undefined ||
		entry === undefined ||
		path === undefined ||
		(operation !== 'admit' && operation !== 'prepare')
	)
		throw new StudyError('CONFIG', 'Expected root entry admit|prepare selection.json')
	try {
		const input = parseJSON(Buffer.from(await readStudyBytes(path, 1048576)).toString('utf8'))
		const command = new StudyMemoryScreenCommand({ root, entry })
		const result = await (operation === 'admit'
			? command.admit(input, AbortSignal.timeout(60000))
			: command.prepare(input, AbortSignal.timeout(60000)))
		process.stdout.write(JSON.stringify(result) + '\n')
	} catch (error) {
		process.stderr.write(String(error) + '\n')
		process.exitCode = 1
	}
}
