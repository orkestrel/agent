import type {
	CapacityCell,
	CapacityExit,
	CapacityFile,
	CapacityOptions,
	CapacityProfile,
	CapacityReading,
} from './types.ts'
import { appendFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
	CAPACITY_BUILD,
	CAPACITY_CELLS,
	CAPACITY_ENTRY,
	CAPACITY_EXTENDED,
	CAPACITY_INITIAL,
	CAPACITY_LIMITS,
} from './constants.ts'
import {
	buildCapacityFixture,
	collectCapacityReading,
	hashCapacityFile,
	inspectCapacityExecution,
	readCapacityCount,
	readCapacityJSON,
	readCapacityLines,
	readCapacityProof,
	writeCapacityJSON,
} from './helpers.ts'
import { Runner } from './Runner.ts'
import { isCapacityRecord } from './validators.ts'

/** Qualifies one frozen candidate without semantic scoring or automatic escalation. */
export class Qualifier {
	#options: CapacityOptions
	#profile: CapacityProfile
	#deadline = 0
	#calls = 0
	#tokens = 0
	#runner = new Runner()

	/** Binds one immutable CLI request.
	 * @param options - Validated input
	 */
	constructor(options: CapacityOptions) {
		this.#options = options
		this.#profile = options.profile === 'initial' ? CAPACITY_INITIAL : CAPACITY_EXTENDED
	}

	/** Creates synthetic custody and optionally executes the frozen serial population.
	 * @returns Zero for a plan or sufficient qualification; three for a retained failed attempt
	 */
	async execute(): Promise<number> {
		const { out, proof, plan } = this.#options
		if (!plan && proof === undefined)
			throw new Error(
				'--proof FILE is required to execute; use --plan to materialize an unqualified plan',
			)
		const receipt = proof === undefined ? undefined : readCapacityProof(proof)
		mkdirSync(out)
		const fixture = buildCapacityFixture()
		const runtime = join(out, 'runtime.json'),
			oracle = join(out, 'oracle.json'),
			workload = join(out, 'workload.json')
		writeCapacityJSON(runtime, fixture.runtime)
		writeCapacityJSON(oracle, fixture.oracle)
		writeCapacityJSON(workload, {
			schema: 1,
			files: [runtime, oracle].map((path) => ({
				...hashCapacityFile(path),
				bytes: statSync(path).size,
			})),
		})
		const files = {
			runtime: hashCapacityFile(runtime),
			oracle: hashCapacityFile(oracle),
			workload: hashCapacityFile(workload),
		}
		writeCapacityJSON(join(out, 'plan.json'), {
			schema: 1,
			policy: 'execution-only',
			qualified: false,
			options: this.#options,
			profile: this.#profile,
			limits: CAPACITY_LIMITS,
			cells: CAPACITY_CELLS,
			files,
			proof: proof === undefined ? undefined : { ...hashCapacityFile(proof), receipt },
			build: existsSync(CAPACITY_BUILD)
				? hashCapacityFile(CAPACITY_BUILD)
				: { path: CAPACITY_BUILD, absent: true },
			entry: CAPACITY_ENTRY,
			commands: CAPACITY_CELLS.map((cell) => ({
				cell,
				freeze: this.#freezeArgs(
					cell,
					files,
					CAPACITY_LIMITS.wall,
					CAPACITY_LIMITS.calls - 3,
					CAPACITY_LIMITS.tokens,
				),
				run: this.#runArgs(cell),
			})),
			accounting:
				'Each freeze reserves two inventory calls. Each run receives only the remaining outer allowance after reserving one post-cell ps request. Subsequent cells use actual prior run totals and the same absolute deadline.',
			controls:
				'Negative capacity/output controls and stalled-body cancellation are offline harness proofs, required by the root receipt. They are not live calls.',
		})
		if (plan) return 0
		this.#deadline = Date.now() + CAPACITY_LIMITS.wall
		try {
			const readings: Array<{ readonly cell: CapacityCell; readonly reading: CapacityReading }> = []
			for (const cell of CAPACITY_CELLS) {
				this.#verifyFiles(Object.values(files))
				if (proof === undefined) throw new Error('proof receipt missing')
				readCapacityProof(proof)
				const remaining = this.#remaining()
				if (remaining.calls <= 3 || remaining.tokens < this.#profile.window)
					throw new Error('qualification outer allowance insufficient for another cell')
				const directory = this.#cellDirectory(cell)
				mkdirSync(directory)
				const freeze = join(directory, 'freeze-process'),
					run = join(directory, 'run-process')
				mkdirSync(freeze)
				const args = this.#freezeArgs(
					cell,
					files,
					remaining.wall,
					remaining.calls - 3,
					remaining.tokens,
				)
				writeCapacityJSON(join(directory, 'launch.json'), {
					cell,
					remaining,
					freeze: args,
					run: this.#runArgs(cell),
				})
				this.#calls += 2
				const frozen = await this.#runner.execute({
					args,
					out: freeze,
					deadline: Math.min(this.#deadline, Date.now() + CAPACITY_LIMITS.metadata * 2),
				})
				if (frozen.code !== 0 || frozen.expired || frozen.error !== undefined)
					throw new Error(`freeze failed for ${cell.key}/${cell.arm}; see exact exit evidence`)
				this.#remaining()
				mkdirSync(run)
				const executed = await this.#runner.execute({
					args: this.#runArgs(cell),
					out: run,
					deadline: this.#deadline,
				})
				const runDirectory = join(directory, 'run')
				const info = existsSync(join(runDirectory, 'run.json'))
					? readCapacityJSON(join(runDirectory, 'run.json'))
					: undefined
				if (info !== undefined) {
					this.#calls += readCapacityCount(info.sent)
					this.#tokens += readCapacityCount(info.tokens)
				}
				const capacity = await this.#capacity(cell)
				writeCapacityJSON(join(directory, 'capacity.json'), capacity)
				if (
					(executed.code !== 0 && executed.code !== 3) ||
					executed.expired ||
					executed.signal !== null ||
					executed.error !== undefined ||
					info === undefined
				)
					throw new Error(
						`cell failed for ${cell.key}/${cell.arm}; see exact child and run evidence`,
					)
				const reading = this.#inspectCell(cell, info, executed)
				writeCapacityJSON(join(directory, 'reading.json'), reading)
				readings.push({ cell, reading })
				if (cell.arm === 'compaction') {
					const group = readings.filter((entry) => entry.cell.key === cell.key)
					if (
						group.reduce((sum, entry) => sum + entry.reading.lookups, 0) === 0 ||
						group.reduce((sum, entry) => sum + entry.reading.folds, 0) === 0
					)
						throw new Error(
							`insufficient qualification for ${cell.key}: lookup and actual compaction fold coverage required`,
						)
				}
				this.#remaining()
				appendFileSync(
					join(out, 'journal.jsonl'),
					`${JSON.stringify({ cell, status: 'complete', calls: this.#calls, tokens: this.#tokens, finished: Date.now() })}\n`,
				)
			}
			writeCapacityJSON(join(out, 'qualification.json'), {
				policy: 'execution-only',
				passed: true,
				calls: this.#calls,
				tokens: this.#tokens,
				elapsed: CAPACITY_LIMITS.wall - (this.#deadline - Date.now()),
				readings,
				limitation:
					'Execution coverage and capacity observations do not guarantee full-horizon semantic quality.',
			})
			return 0
		} catch (error) {
			writeCapacityJSON(join(out, 'qualification.json'), {
				policy: 'execution-only',
				passed: false,
				calls: this.#calls,
				tokens: this.#tokens,
				finished: Date.now(),
				error: error instanceof Error ? error.message : String(error),
			})
			return 3
		}
	}

	#remaining(): { readonly wall: number; readonly calls: number; readonly tokens: number } {
		const remaining = {
			wall: this.#deadline - Date.now(),
			calls: CAPACITY_LIMITS.calls - this.#calls,
			tokens: CAPACITY_LIMITS.tokens - this.#tokens,
		}
		if (remaining.wall <= 0 || remaining.calls <= 0 || remaining.tokens <= 0)
			throw new Error('qualification outer limit exhausted')
		return remaining
	}

	#cellDirectory(cell: CapacityCell): string {
		return join(this.#options.out, `${cell.key}-${cell.arm}`)
	}

	#freezeArgs(
		cell: CapacityCell,
		files: Readonly<Record<'runtime' | 'oracle' | 'workload', CapacityFile>>,
		wall: number,
		calls: number,
		tokens: number,
	): readonly string[] {
		const flags = {
			...this.#profile,
			recap: CAPACITY_LIMITS.recap,
			metadata: CAPACITY_LIMITS.metadata,
			goal: CAPACITY_LIMITS.goal,
			requests: CAPACITY_LIMITS.requests,
			wall,
			calls,
			tokens,
			series: wall,
		}
		return [
			CAPACITY_ENTRY,
			'freeze',
			'--key',
			cell.key,
			'--out',
			join(this.#cellDirectory(cell), 'manifest'),
			'--live',
			'--url',
			this.#options.url,
			'--think',
			'true',
			'--failure',
			'continue',
			'--runtime',
			files.runtime.path,
			'--oracle',
			files.oracle.path,
			'--workload',
			files.workload.path,
			...Object.entries(flags).flatMap(([key, value]) => [`--${key}`, String(value)]),
		]
	}

	#runArgs(cell: CapacityCell): readonly string[] {
		return [
			CAPACITY_ENTRY,
			'run',
			'--manifest',
			join(this.#cellDirectory(cell), 'manifest', 'manifest.json'),
			'--arm',
			cell.arm,
			'--out',
			join(this.#cellDirectory(cell), 'run'),
			'--live',
			'--url',
			this.#options.url,
		]
	}

	#verifyFiles(files: readonly CapacityFile[]): void {
		for (const file of files)
			if (hashCapacityFile(file.path).hash !== file.hash)
				throw new Error('synthetic fixture custody changed')
	}

	async #capacity(cell: CapacityCell): Promise<Readonly<Record<string, unknown>>> {
		const remaining = this.#remaining()
		this.#calls += 1
		const started = Date.now()
		let response: Response
		try {
			response = await fetch(new URL('/api/ps', this.#options.url), {
				signal: AbortSignal.timeout(Math.min(remaining.wall, CAPACITY_LIMITS.metadata)),
			})
		} catch (error) {
			writeCapacityJSON(join(this.#cellDirectory(cell), 'capacity-request.json'), {
				started,
				finished: Date.now(),
				error: error instanceof Error ? error.message : String(error),
			})
			throw error
		}
		writeCapacityJSON(join(this.#cellDirectory(cell), 'capacity-request.json'), {
			started,
			received: Date.now(),
			status: response.status,
		})
		if (!response.ok) throw new Error(`post-cell capacity HTTP ${response.status}`)
		const value: unknown = await response.json()
		if (!isCapacityRecord(value) || !Array.isArray(value.models))
			throw new Error('post-cell capacity models missing')
		const manifest = readCapacityJSON(join(this.#cellDirectory(cell), 'manifest', 'manifest.json'))
		if (!isCapacityRecord(manifest.decision)) throw new Error('frozen decision identity missing')
		const decision = manifest.decision
		const loaded = value.models.find(
			(entry: unknown) =>
				isCapacityRecord(entry) &&
				(entry.name === decision.model || entry.model === decision.model) &&
				entry.digest === decision.digest,
		)
		if (!isCapacityRecord(loaded)) throw new Error('decision model/digest not loaded after cell')
		const safe: Record<string, unknown> = {}
		for (const key of [
			'name',
			'model',
			'digest',
			'context_length',
			'size',
			'size_vram',
			'expires_at',
			'details',
		])
			if (loaded[key] !== undefined) safe[key] = loaded[key]
		writeCapacityJSON(join(this.#cellDirectory(cell), 'capacity-observed.json'), safe)
		if (readCapacityCount(loaded.context_length) < this.#profile.window)
			throw new Error('loaded model context below requested physical window')
		return safe
	}

	#inspectCell(
		cell: CapacityCell,
		info: Readonly<Record<string, unknown>>,
		exit: CapacityExit,
	): CapacityReading {
		const directory = join(this.#cellDirectory(cell), 'run')
		const rows = readCapacityLines(join(directory, 'rows.jsonl'))
		const expected = buildCapacityFixture().runtime.goals.map((goal) => goal.id)
		const requests = readCapacityLines(join(directory, 'requests.jsonl'))
		const observations = readCapacityLines(join(directory, 'observations.jsonl'))
		inspectCapacityExecution(info, rows, observations, requests, expected, exit)
		const sections = existsSync(join(directory, 'sections.jsonl'))
			? readCapacityLines(join(directory, 'sections.jsonl'))
			: []
		const reading = collectCapacityReading(requests, rows, sections)
		for (const request of requests) {
			if (request.sent !== true || !['agent', 'summarizer'].includes(String(request.role))) continue
			if (!isCapacityRecord(request.request) || !isCapacityRecord(request.request.options))
				throw new Error('wire capacity options absent')
			const calibrated = request.goal === undefined && request.request.options.num_predict === 1
			const output = request.role === 'summarizer' ? CAPACITY_LIMITS.recap : this.#profile.reserve
			if (
				request.request.options.num_ctx !== this.#profile.window ||
				(!calibrated && request.request.options.num_predict !== output) ||
				(!calibrated && request.reason === 'length')
			)
				throw new Error('decision/summary capacity or output setting failed')
			if (
				!calibrated &&
				readCapacityCount(request.prompt) + output + this.#profile.safety > this.#profile.window
			)
				throw new Error('observed prompt leaves insufficient output headroom')
			if (request.role === 'summarizer' && request.request.think !== false)
				throw new Error('summary thinking must be disabled')
		}
		return reading
	}
}
