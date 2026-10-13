// Prospective outer journal: tmp/units/aggregate-successor-cell-CELL-live.jsonl, cap 25920 seconds.
// Rebinds the predecessor cell driver to l15, Q4, and root-supplied HEAD and fit custody.
import type { MatrixAttempt, MatrixResource, MatrixRun } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/types.js'
import type { RefitFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/types.js'
import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isDeepStrictEqual, parseArgs } from 'node:util'
import { isRecord } from '@orkestrel/contract'
import { readBuild } from '../../.orkestrel/agent/instruments/harness/.build/bench5/build/helpers.js'
import { describeError, readJSON } from '../../.orkestrel/agent/instruments/harness/.build/bench5/helpers.js'
import { hashFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'
import { buildMatrixBound, listMatrixPairFailures, matchesMatrixExposure, readAttempt, readExecution, readFrozen, readResource, verifyMatrixFeasibility } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'
import { isMatrixAttempt, isMatrixResource } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/validators.js'

class CellDriver {
	#root = resolve(import.meta.dirname, '..', '..')

	execute(): void {
		const { values, positionals } = parseArgs({
			options: { fit: { type: 'string' }, head: { type: 'string' }, live: { type: 'boolean' } },
			allowPositionals: true,
		})
		const [cell, ...extra] = positionals
		const head = values.head
		const releasedFit = values.fit
		const live = values.live === true
		if (cell === undefined || !['q4-think0', 'q4-think1'].includes(cell) || typeof head !== 'string' || !/^[a-f0-9]{40}$/.test(head) || typeof releasedFit !== 'string' || !/^[a-f0-9]{64}$/.test(releasedFit) || extra.length !== 0)
			throw new Error('usage: aggregate-successor-cell-run.ts q4-think0|q4-think1 --head SHA1 --fit SHA256 [--live]')
		if (resolve(process.cwd()) !== this.#root)
			throw new Error(`explicit scaffold cwd required: ${this.#root}`)
		this.#checkHead(head)
		const results = join(this.#root, '.orkestrel', 'agent', 'instruments', 'results', 'l15')
		const directory = join(results, cell)
		const frozen = hashFile(join(directory, 'freeze', 'manifest.json'))
		const checked = readFrozen(frozen)
		if (`${checked.key}-think${checked.think ? 1 : 0}` !== cell)
			throw new Error('frozen cell identity differs from selected cell')
		const build = hashFile(join(this.#root, '.orkestrel', 'agent', 'instruments', 'harness', '.build', 'build-manifest.json'))
		readBuild()
		if (build.hash !== '0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc' || checked.deployment.hash !== '40442197423b574b61548feb702b55c948d77f61dd719d9d6b26e24ad3016e19')
			throw new Error('canonical build or deployment seal differs')
		const fit = hashFile(join(results, 'calibration', checked.key, 'fit', 'fit.json'))
		if (fit.hash !== releasedFit)
			throw new Error('released strict fit seal differs')
		const sequence = join(this.#root, 'tmp', 'units', `aggregate-successor-cell-${cell}-sequence.jsonl`)
		const stages = ['resource', 'full', 'pilot'].map((stage) => {
			const journal = join(results, 'logs', `${cell}-${stage}.jsonl`)
			const errors = join(results, 'logs', `${cell}-${stage}.err`)
			const out = join(directory, stage)
			const operator = [process.execPath, join(this.#root, '.orkestrel', 'agent', 'instruments', 'harness', '.build', 'bench5', 'matrix.js'), stage, '--frozen', frozen.path, ...(stage === 'resource' ? [] : ['--resource', join(directory, 'resource', 'manifest.json')]), ...(stage === 'pilot' ? ['--fit', fit.path] : []), '--out', out, '--live', '--url', 'http://127.0.0.1:11435']
			return { stage, out, journal, errors, argv: [process.execPath, join(this.#root, '.agents', 'skills', 'orkestrel-dispatch', 'scripts', 'launch.ts'), '--journal', journal, '--errors', errors, '--cap', stage === 'pilot' ? '10800' : '7200', '--status', '--', ...operator] }
		})
		const paths = [sequence, ...stages.flatMap((stage) => [stage.out, stage.journal, stage.errors, `${stage.journal}.pid`, `${stage.journal}.status-before.txt`, `${stage.journal}.status-after.txt`])]
		if (new Set(paths).size !== paths.length) throw new Error('output, log, and sequence paths must differ')
		const plan = { cell, head, live, frozen, build, deployment: checked.deployment, fit, admission: 'released fit bytes; strict admission belongs to emitted operator', sequence, paths: paths.map((path) => ({ path, absent: !existsSync(path) })), commands: stages, outer: { cap: 25920, argv: [process.execPath, join(this.#root, '.agents', 'skills', 'orkestrel-dispatch', 'scripts', 'launch.ts'), '--journal', join(this.#root, 'tmp', 'units', `aggregate-successor-cell-${cell}-live.jsonl`), '--errors', join(this.#root, 'tmp', 'units', `aggregate-successor-cell-${cell}-live.err`), '--cap', '25920', '--status', '--', process.execPath, join(this.#root, 'tmp', 'units', 'aggregate-successor-cell-run.ts'), cell, '--head', head, '--fit', releasedFit, '--live'] } }
		process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)
		if (!live) {
			this.#checkHead(head)
			if (!isDeepStrictEqual(readFrozen(frozen), checked)) throw new Error('frozen custody changed during dry preflight')
			return
		}
		for (const path of paths) if (existsSync(path)) throw new Error(`create-only path already exists: ${path}`)
		writeFileSync(sequence, `${JSON.stringify({ event: 'start', started: new Date().toISOString(), plan })}\n`, { flag: 'wx' })
		let refusal = false
		let original: number | undefined
		let resource: MatrixResource | undefined
		try {
			for (const stage of stages) {
				for (const path of [stage.out, stage.journal, stage.errors, `${stage.journal}.pid`, `${stage.journal}.status-before.txt`, `${stage.journal}.status-after.txt`])
					if (existsSync(path)) throw new Error(`create-only stage path already exists: ${path}`)
				this.#checkHead(head)
				if (!isDeepStrictEqual(readFrozen(frozen), checked)) throw new Error('frozen custody changed before stage')
				if (!isDeepStrictEqual(hashFile(fit.path), fit)) throw new Error('released fit custody changed before stage')
				const started = Date.now()
				appendFileSync(sequence, `${JSON.stringify({ event: 'command', stage: stage.stage, started: new Date(started).toISOString(), argv: stage.argv })}\n`)
				const result = spawnSync(process.execPath, stage.argv.slice(1), { cwd: this.#root, stdio: 'inherit', shell: false, windowsHide: true })
				original = result.status ?? 1
				appendFileSync(sequence, `${JSON.stringify({ event: 'result', stage: stage.stage, pid: result.pid, started: new Date(started).toISOString(), finished: new Date().toISOString(), exit: result.status, signal: result.signal, wall: Date.now() - started, error: result.error === undefined ? undefined : describeError(result.error) })}\n`)
				this.#checkHead(head)
				if (result.error !== undefined) throw result.error
				if (result.signal !== null || (result.status !== 0 && result.status !== 3)) throw new Error('operator ended with an operational exit or signal')
				const manifest = hashFile(join(stage.out, 'manifest.json'))
				let accepted: boolean
				if (stage.stage === 'resource') {
					resource = readResource(manifest, frozen)
					accepted = resource.accepted
				} else {
					if (resource === undefined || !resource.accepted) throw new Error('dependent stage lacks accepted resource')
					const records = resource.attempts.at(-1)
					if (records === undefined) throw new Error('resource lacks terminal attempt')
					const baseline = readAttempt(records)
					if (baseline === undefined) throw new Error('resource lacks decoded raw evidence')
					const value = readJSON(manifest.path)
					if (stage.stage === 'full') {
						if (!isRecord(value) || !isMatrixResource(value) || !isDeepStrictEqual(value.frozen, frozen) || value.attempts.length !== 1 || !isDeepStrictEqual(value.bound, buildMatrixBound(baseline)))
							throw new Error('full manifest or empirical bound differs')
						const attempt = value.attempts[0]
						if (attempt === undefined) throw new Error('full manifest lacks attempt')
						this.#readStage(attempt, 'full', frozen, hashFile(join(directory, 'resource', 'manifest.json')))
						if (value.accepted !== attempt.accepted || (value.accepted && !isDeepStrictEqual(value.budget, attempt.budget)) || (!value.accepted && value.budget !== undefined))
							throw new Error('full decision differs from measured attempt')
						accepted = value.accepted
					} else {
						if (!isRecord(value) || value.protocol !== 'l6' || !isDeepStrictEqual(value.frozen, frozen) || !isDeepStrictEqual(value.resource, hashFile(join(directory, 'resource', 'manifest.json'))) || !isDeepStrictEqual(value.fit, fit) || !isMatrixAttempt(value.attempt))
							throw new Error('pilot manifest custody differs')
						const run = this.#readStage(value.attempt, 'pilot', frozen, hashFile(join(directory, 'resource', 'manifest.json')))
						if (!isDeepStrictEqual(run.execution.fit, fit)) throw new Error('pilot released fit custody differs')
						const exposed = run.rows.filter((row) => matchesMatrixExposure(run, row.goal)).length
						const failures = [...value.attempt.failures, ...listMatrixPairFailures(baseline, run)]
						if (exposed <= run.rows.length / 2) failures.push('nonempty wire body exposure is not a majority of served development goals')
						if (value.served !== run.rows.length || value.exposed !== exposed || !isDeepStrictEqual(value.failures, failures) || value.accepted !== (failures.length === 0))
							throw new Error('pilot decision differs from emitted evidence helpers')
						accepted = failures.length === 0
					}
				}
				if (result.status !== (accepted ? 0 : 3)) throw new Error('operator exit differs from validated measured decision')
				appendFileSync(sequence, `${JSON.stringify({ event: 'validated', stage: stage.stage, manifest, accepted, finished: new Date().toISOString() })}\n`)
				refusal ||= !accepted
				if (stage.stage === 'resource' && !accepted) break
			}
			this.#checkHead(head)
			if (!isDeepStrictEqual(readFrozen(frozen), checked)) throw new Error('frozen custody changed at closure')
			if (!isDeepStrictEqual(hashFile(fit.path), fit)) throw new Error('released fit custody changed at closure')
			appendFileSync(sequence, `${JSON.stringify({ event: 'complete', finished: new Date().toISOString(), exit: refusal ? 3 : 0 })}\n`)
			process.exitCode = refusal ? 3 : 0
		} catch (error) {
			appendFileSync(sequence, `${JSON.stringify({ event: 'fault', finished: new Date().toISOString(), original, error: describeError(error) })}\n`)
			try {
				this.#checkHead(head)
				if (!isDeepStrictEqual(readFrozen(frozen), checked)) throw new Error('frozen custody changed at fault closure')
			} catch (closure) {
				appendFileSync(sequence, `${JSON.stringify({ event: 'custody', finished: new Date().toISOString(), error: describeError(closure) })}\n`)
			}
			process.stderr.write(`${describeError(error)}\n`)
			process.exitCode = original !== undefined && original !== 0 && original !== 3 ? original : 1
		}
	}

	#checkHead(expected: string): void {
		const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: this.#root, encoding: 'utf8', windowsHide: true }).trim()
		if (head !== expected) throw new Error('released HEAD custody differs')
	}

	#readStage(attempt: MatrixAttempt, phase: string, frozen: RefitFile, resource: RefitFile): MatrixRun {
		const run = readAttempt(attempt)
		verifyMatrixFeasibility(run)
		if (run === undefined || run.execution.phase !== phase || run.execution.arm !== (phase === 'full' ? 'full' : 'aggregate') || run.execution.copy !== 1 || !isDeepStrictEqual(run.execution.frozen, frozen) || !isDeepStrictEqual(run.execution.resource, resource))
			throw new Error('dependent attempt configuration differs')
		const admitted = readExecution(attempt.execution.path)
		if (!isDeepStrictEqual(admitted.execution, run.execution)) throw new Error('emitted execution admission differs from raw run')
		return run
	}
}

try {
	new CellDriver().execute()
} catch (error) {
	process.stderr.write(`${describeError(error)}\n`)
	process.exitCode = 1
}
