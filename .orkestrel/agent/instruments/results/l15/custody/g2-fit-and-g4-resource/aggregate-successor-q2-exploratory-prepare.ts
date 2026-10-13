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
		if ((cell !== 'q2-think0' && cell !== 'q2-think1') || extra.length !== 0 || typeof head !== 'string' || !/^[a-f0-9]{40}$/.test(head)) {
			throw new Error('Usage: node tmp/units/aggregate-successor-q2-exploratory-prepare.ts q2-think0|q2-think1 --head SHA1')
		}
		if (resolve(process.cwd()) !== this.#root) throw new Error('Explicit scaffold cwd required')
		this.#checkHead(head)
		const instruments = join(this.#root, '.orkestrel', 'agent', 'instruments')
		const results = join(instruments, 'results', 'l15')
		const directory = join(results, cell)
		const exploration = join(directory, 'exploration')
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
		const calibration = this.#seal(join(results, 'q2-think0', 'freeze', 'manifest.json'), '442dfeb697d843e28ab3c8985aabb720d768d9f9646b33a128124a74560b53fd')
		const frozenReference = cell === 'q2-think0' ? calibration : this.#seal(join(directory, 'freeze', 'manifest.json'), 'b356f869b71480ed759e274e2587cf87437c1551987583c2bac81e0e8b4f8f5f')
		const frozen = readFrozen(frozenReference)
		if (frozen.key !== 'q2' || frozen.think !== (cell === 'q2-think1')) throw new Error('Target freeze differs from the selected Q2 cell')
		readFrozen(calibration)
		const calibrationDirectory = join(results, 'calibration', 'q2')
		const diagnosis = this.#seal(join(calibrationDirectory, 'fit-2', 'diagnosis.json'), '626ac28ed56f4b0f1e1ce51ff2ebdece035ba2760ce532c551642c74d89fc5ca')
		const labels = this.#seal(join(calibrationDirectory, 'labels.json'), 'ae937346c5e0abdc1b4543511b171e93ec117f795b90b9fd93af87e67b53f661')
		const packet = this.#seal(join(calibrationDirectory, 'generation', 'packet.jsonl'), 'a67c510650eaa2ffae29fe5c461fcf56d4cd91e9e3376a3ac4b5fba2b3c14999')
		const generation = this.#seal(join(calibrationDirectory, 'generation', 'manifest.json'), '10e654ee24fe25b7a32af7e8f6610467154a8c1c5cc65dcbeeb2c6335e722d23')
		const assessment = readRefitAssessment(diagnosis)
		const agree = selectMajorityCutoff(assessment)
		if (assessment.accepted || assessment.errors.length !== 0 || assessment.change !== 0.56 || agree !== 0.68) {
			throw new Error('Retained Q2 diagnosis does not reproduce the released exploratory cutoff')
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
