// Keeps this root-reviewed artifact entry self-contained; imports only the frozen production contracts.
import type { MatrixDevelopment, MatrixExecution } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/types.js'
import type { RefitFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/types.js'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { readJSON } from '../../.orkestrel/agent/instruments/harness/.build/bench5/helpers.js'
import { readDevelopment, readExecution, readFrozen, readResource } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'
import { isMatrixDevelopment, isMatrixExecution, isMatrixResource } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/validators.js'
import { hashFile, readRefitAssessment, selectMajorityCutoff } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'

class ExploratoryPreparation {
	readonly #root = resolve(import.meta.dirname, '../..')

	execute(): void {
		const { values, positionals } = parseArgs({
			options: { head: { type: 'string' } },
			allowPositionals: true,
		})
		const [cell, ...extra] = positionals
		const head = values.head
		if ((cell !== 'g4-think0' && cell !== 'g4-think1') || extra.length !== 0 || typeof head !== 'string' || !/^[a-f0-9]{40}$/.test(head)) {
			throw new Error('Usage: node tmp/units/aggregate-successor-g4-exploratory-prepare-2.ts g4-think0|g4-think1 --head SHA1')
		}
		if (resolve(process.cwd()) !== this.#root) throw new Error('Explicit scaffold cwd required')
		this.#checkHead(head)
		const instruments = join(this.#root, '.orkestrel', 'agent', 'instruments')
		const results = join(instruments, 'results', 'l15')
		const directory = join(results, cell)
		const exploration = join(directory, 'exploration-2')
		const policyPath = join(exploration, 'policy.json')
		const executionPath = join(exploration, 'aggregate-execution.json')
		const cachePath = join(exploration, 'aggregate-cache')
		const runPath = join(exploration, 'aggregate-run')
		if ([exploration, policyPath, executionPath, cachePath, runPath].some((path) => existsSync(path))) {
			throw new Error('Exploration artifacts, cache, and run must be absent')
		}
		const resourcePath = join(directory, 'resource', 'manifest.json')
		const fullPath = join(directory, 'full', 'manifest.json')
		for (const path of [resourcePath, fullPath]) {
			if (!existsSync(path)) throw new Error(`Unmet cell prerequisite: ${path}`)
		}
		const build = this.#seal(join(instruments, 'harness', '.build', 'build-manifest.json'), '0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc')
		const calibration = this.#seal(join(results, 'g4-think0', 'freeze', 'manifest.json'), '9fecc71430f9c6af8580bdc7eb43e6ec2b034fa12c45690581af4197ac818f36')
		const frozenReference = cell === 'g4-think0' ? calibration : this.#seal(join(directory, 'freeze', 'manifest.json'), '7f8c4adacf24086e876feca6b91b8e3fcf7013180d223a318497ee2809307124')
		const frozen = readFrozen(frozenReference)
		if (frozen.key !== 'g4' || frozen.think !== (cell === 'g4-think1')) throw new Error('Target freeze differs from the selected G4 cell')
		readFrozen(calibration)
		const calibrationDirectory = join(results, 'calibration', 'g4')
		const diagnosis = this.#seal(join(calibrationDirectory, 'fit', 'diagnosis.json'), 'a459c9fa0ab48114163d9257e6178d7c2a55dd7c140f15de0e1350a01fa4e1ba')
		const sealedLabels = this.#seal(join(calibrationDirectory, 'labels.json'), '09d8e5171e2d65dd1a65fd85cc571a13984d03705b4370fc7e63c8c4ae95d819')
		const sealedPacket = this.#seal(join(calibrationDirectory, 'generation', 'packet.jsonl'), '64b0f89566458745c8099e9351db3b44686102145721ef9395bbd8e06e9d57f5')
		const sealedGeneration = this.#seal(join(calibrationDirectory, 'generation', 'manifest.json'), 'b9c622ed08613260e489f87a8539b8d7c177ece7a20e5fe0ea8108799fc74d26')
		const assessment = readRefitAssessment(diagnosis)
		const labels = assessment.preparation.labels
		const packet = assessment.preparation.packet
		const generation = assessment.preparation.manifest
		for (const reference of [
			{ retained: labels, sealed: sealedLabels },
			{ retained: packet, sealed: sealedPacket },
			{ retained: generation, sealed: sealedGeneration },
		]) {
			if (reference.retained.hash !== reference.sealed.hash || resolve(reference.retained.path) !== resolve(reference.sealed.path)) {
				throw new Error(`Calibration reference differs from the sealed file: ${reference.retained.path}`)
			}
		}
		const agree = selectMajorityCutoff(assessment)
		if (assessment.accepted || assessment.errors.length !== 0 || assessment.change !== 0.56 || agree !== 0.61) {
			throw new Error('Retained G4 diagnosis does not reproduce the released exploratory cutoff')
		}
		const resourceReference = hashFile(resourcePath)
		const resource = readResource(resourceReference, frozenReference)
		if (!resource.accepted || resource.budget === undefined) throw new Error('Accepted cell resource prerequisite required')
		const fullReference = hashFile(fullPath)
		const full = readJSON(fullPath)
		if (!isMatrixResource(full) || full.attempts.length !== 1) throw new Error('Cell full-view manifest prerequisite required')
		const attempt = full.attempts[0]
		if (attempt === undefined) throw new Error('Cell full-view attempt prerequisite required')
		const policy: MatrixDevelopment = {
			phase: 'development',
			frozen: frozenReference,
			calibration,
			diagnosis,
			labels,
			packet,
			generation,
			resource: resourceReference,
			full: fullReference,
			agree,
			change: 0.56,
			selection: 'highest-grid-majority-occurrences-and-identities',
			continuation: 'failed-goal-after-xml-function-parameter-error',
			withhold: true,
			limitation: 'seed-candidates-do-not-certify-diverged-history',
			paired: resource.budget,
			expanded: attempt.budget,
		}
		if (!isMatrixDevelopment(policy)) throw new Error('Development policy contract refused')
		this.#checkHead(head)
		mkdirSync(exploration)
		writeFileSync(policyPath, `${JSON.stringify(policy, null, 2)}\n`, { flag: 'wx' })
		const execution: MatrixExecution = {
			protocol: 'l6',
			phase: 'development',
			key: frozen.key,
			think: frozen.think,
			arm: 'aggregate',
			copy: 1,
			frozen: frozenReference,
			budget: resource.budget,
			development: hashFile(policyPath),
		}
		if (!isMatrixExecution(execution)) throw new Error('Development execution contract refused')
		const admittedPolicy = readDevelopment(execution, frozen)
		if (admittedPolicy.withhold !== true) throw new Error('Accepted withholding policy required')
		writeFileSync(executionPath, `${JSON.stringify(execution, null, 2)}\n`, { flag: 'wx' })
		readExecution(executionPath)
		this.#checkHead(head)
		this.#seal(build.path, build.hash)
		const command = `node "${join(instruments, 'harness', '.build', 'bench5', 'bench.js')}" --run --live --copy 1 --manifest "${executionPath}" --cache "${cachePath}" --out "${runPath}" --url http://127.0.0.1:11435`
		process.stdout.write(`${JSON.stringify({ cell, head, policy: hashFile(policyPath), execution: hashFile(executionPath), cache: cachePath, run: runPath, seed: frozen.seed, agree, change: 0.56, withhold: true, command }, null, 2)}\n`)
	}

	#seal(path: string, expected: string): RefitFile {
		const reference = hashFile(path)
		if (reference.hash !== expected) throw new Error(`Fixed input seal differs: ${path}`)
		return reference
	}

	#checkHead(expected: string): void {
		const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: this.#root, encoding: 'utf8', windowsHide: true }).trim()
		if (head !== expected) throw new Error('Root-released HEAD custody differs')
	}
}

try {
	new ExploratoryPreparation().execute()
} catch (error) {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
	process.exitCode = 1
}
