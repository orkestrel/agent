import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { readBuild } from '../../.orkestrel/agent/instruments/harness/.build/bench5/build/helpers.js'
import { readFrozen, readResource } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'
import { hashFile, readRefitAssessment, verifyFiles } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'

const expectedHead = '6099fd155d3382e91f80e80b17f9a6d47638c30f'
const expectedBuildHash = '0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc'
const root = process.cwd()
const prefix = '.orkestrel/agent/instruments/results/l15'
const fitPath = resolve(root, prefix, 'calibration/q4/fit/fit.json')
const diagnosisPath = resolve(root, prefix, 'calibration/q4/fit/diagnosis.json')

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function same(left: unknown, right: unknown): boolean {
	return JSON.stringify(left) === JSON.stringify(right)
}

function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'))
}

function fail(message: string): never {
	throw new Error(message)
}

const started = performance.now()
const steps: Array<Record<string, unknown>> = []
const record = <T>(name: string, action: () => T): T => {
	const stepStarted = performance.now()
	try {
		const result = action()
		steps.push({ name, exitCode: 0, elapsedMs: performance.now() - stepStarted })
		return result
	} catch (error) {
		const diagnostic = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
		steps.push({ name, exitCode: 1, elapsedMs: performance.now() - stepStarted, diagnostic })
		throw error
	}
}

try {
	const build = record('readBuild', () => readBuild())
	const manifestPath = resolve(root, '.orkestrel/agent/instruments/harness/.build/build-manifest.json')
	const manifest = record('hash emitted build manifest', () => hashFile(manifestPath))
	if (manifest.hash !== expectedBuildHash) fail(`emitted build manifest hash mismatch: expected ${expectedBuildHash}, found ${manifest.hash}`)
	const head = record('verify HEAD', () => {
		const value = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
		if (value !== expectedHead) fail(`HEAD identity mismatch: expected ${expectedHead}, found ${value}`)
		return value
	})

	const freezeReferences = ['q4-think0', 'q4-think1'].map((arm) => ({
		arm,
		path: resolve(root, prefix, arm, 'freeze/manifest.json'),
	}))
	const freezes = freezeReferences.map(({ arm, path }) => {
		const reference = record(`${arm} freeze hash`, () => hashFile(path))
		const value = record(`${arm} readFrozen`, () => readFrozen(reference))
		const resourcePath = resolve(root, prefix, arm, 'resource/manifest.json')
		const resourceReference = record(`${arm} resource hash`, () => hashFile(resourcePath))
		const resource = record(`${arm} readResource`, () => readResource(resourceReference, reference))
		if (resource.accepted !== true || resource.budget === undefined) fail(`${arm} resource decision is not accepted with a budget`)
		return { arm, reference, value, resourceReference, resource }
	})

	const diagnosisReference = record('diagnosis hash', () => hashFile(diagnosisPath))
	const assessment = record('readRefitAssessment', () => readRefitAssessment(diagnosisReference))
	const fitValue = record('read retained fit', () => readJson(fitPath))
	if (!isRecord(fitValue) || !isRecord(fitValue.matrix)) fail('fit contract missing matrix object')
	const matrix = fitValue.matrix
	if (!isRecord(matrix.summarizer) || !isRecord(matrix.judge) || !Array.isArray(matrix.files) || typeof matrix.settings !== 'string' || typeof matrix.seed !== 'string') fail('fit matrix role/settings/seed/file identities are malformed')
	const fitFiles = matrix.files.filter(isRecord).map((file) => ({ path: file.path, hash: file.hash }))
	if (fitFiles.length !== matrix.files.length || fitFiles.some((file) => typeof file.path !== 'string' || typeof file.hash !== 'string')) fail('fit source identities are malformed')
	const freezeComparisons = freezes.map(({ arm, value }) => {
		const files = value.files.map((file) => ({ path: file.path, hash: file.hash }))
		const fitIdentityMatch = same(fitFiles, files)
		const settingsMatch = matrix.settings === value.settings.hash
		const seedMatch = matrix.seed === value.seed.hash
		const roleMatch = same(matrix.summarizer, value.summarizer) && same(matrix.judge, value.judge)
		if (!fitIdentityMatch || !settingsMatch || !seedMatch || !roleMatch) fail(`${arm} fit role/settings/seed/source identity mismatch`)
		return { arm, fitIdentityMatch, settingsMatch, seedMatch, roleMatch, decisionThink: value.think, summarizer: value.summarizer, judge: value.judge, settings: value.settings, seed: value.seed, sourceCount: files.length }
	})

	const wrongReference = { ...diagnosisReference, hash: '0'.repeat(64) }
	const negativeControl = record('negative control via verifyFiles', () => {
		try {
			verifyFiles([wrongReference])
			return { refused: false, diagnostic: 'guard unexpectedly accepted incorrect hash' }
		} catch (error) {
			return { refused: true, diagnostic: error instanceof Error ? `${error.name}: ${error.message}` : String(error) }
		}
	})
	if (!negativeControl.refused) fail(negativeControl.diagnostic)

	const refs = new Map<string, string>()
	for (const { value } of freezes) {
		for (const file of value.files) {
			const existing = refs.get(file.path)
			if (existing !== undefined && existing !== file.hash) fail(`conflicting historical source hashes for ${file.path}`)
			refs.set(file.path, file.hash)
		}
	}
	const archiveName = `aggregate-continuous-transfer-proof-source-bytes-${Date.now()}`
	const archiveDirectory = resolve(root, 'tmp/units', archiveName)
	mkdirSync(archiveDirectory)
	const archiveFiles: Array<Record<string, unknown>> = []
	let capturedBytes = 0
	let index = 0
	for (const [originalPath, originalHash] of refs) {
		const archivedPath = join(archiveDirectory, `${String(index).padStart(3, '0')}-${originalPath.split(/[\\/]/).at(-1) ?? 'source'}`)
		const current = hashFile(originalPath)
		if (current.hash !== originalHash) fail(`historical source custody mismatch before archive: ${originalPath}; expected ${originalHash}, found ${current.hash}`)
		copyFileSync(originalPath, archivedPath, 1)
		const archived = hashFile(archivedPath)
		if (archived.hash !== originalHash) fail(`archived source byte mismatch: ${originalPath}`)
		capturedBytes += readFileSync(archivedPath).byteLength
		archiveFiles.push({ originalPath, originalHash, archivedPath, archivedHash: archived.hash, bytes: readFileSync(archivedPath).byteLength })
		index += 1
	}
	const archivedManifestPath = join(archiveDirectory, 'build-manifest.json')
	copyFileSync(manifestPath, archivedManifestPath, 1)
	const archivedManifest = hashFile(archivedManifestPath)
	if (archivedManifest.hash !== expectedBuildHash) fail('archived build-manifest byte mismatch')
	capturedBytes += readFileSync(archivedManifestPath).byteLength
	archiveFiles.push({ originalPath: manifestPath, originalHash: manifest.hash, archivedPath: archivedManifestPath, archivedHash: archivedManifest.hash, bytes: readFileSync(archivedManifestPath).byteLength })
	const mappingPath = join(archiveDirectory, 'mapping.json')
	writeFileSync(mappingPath, `${JSON.stringify({ files: archiveFiles, totalBytes: capturedBytes }, null, 2)}\n`, { flag: 'wx' })

	const receipt = {
		unit: 'aggregate-continuous-transfer-proof',
		status: 'validated',
		head,
		build: { manifestPath, manifestHash: manifest.hash, sourceCount: build.sources.length, outputCount: build.outputs.length, resourceCount: build.resources.length },
		inputs: {
			freezes: freezes.map(({ arm, reference }) => ({ arm, ...reference })),
			resources: freezes.map(({ arm, resourceReference }) => ({ arm, ...resourceReference })),
			fit: hashFile(fitPath),
			diagnosis: diagnosisReference,
		},
		budgets: freezes.map(({ arm, resource }) => ({ arm, accepted: resource.accepted, budget: resource.budget })),
		fit: { roleSettingsSeedAndSourceComparisons: freezeComparisons, agree: fitValue.agree, change: fitValue.change, separated: fitValue.separated, settings: matrix.settings, seed: matrix.seed },
		assessment: { status: assessment.status, agree: assessment.agree, change: assessment.change, errors: assessment.errors, cutoff: assessment.cutoff, custody: assessment.custody },
		negativeControl,
		archive: { directory: archiveDirectory, mappingPath, fileCount: archiveFiles.length, totalBytes: capturedBytes, allHashesEqual: archiveFiles.every((file) => file.originalHash === file.archivedHash), files: archiveFiles },
		steps,
		elapsedMs: performance.now() - started,
	}
	writeFileSync(resolve(root, 'tmp/units/aggregate-continuous-transfer-proof-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' })
	console.log(JSON.stringify(receipt, null, 2))
} catch (error) {
	const diagnostic = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
	const failure = { unit: 'aggregate-continuous-transfer-proof', status: 'refused', diagnostic, steps, elapsedMs: performance.now() - started }
	writeFileSync(resolve(root, 'tmp/units/aggregate-continuous-transfer-proof-refusal.json'), `${JSON.stringify(failure, null, 2)}\n`, { flag: 'wx' })
	console.error(JSON.stringify(failure, null, 2))
	process.exitCode = 3
}
