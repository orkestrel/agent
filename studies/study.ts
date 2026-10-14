// Runs the optional built study command under a process-tree deadline.
// Usage: node --experimental-strip-types studies/study.ts <operation> [arguments].
// Exits with the command's code; 64 for invalid input, 124 for deadline, 130 for interruption.
import type { ChildProcess } from 'node:child_process'
import { execFileSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

interface StudyLaunchResult {
	readonly code: number
	readonly output: string
}

class StudyLauncher {
	readonly #root = fileURLToPath(new URL('../', import.meta.url))
	readonly #signal: () => void
	#child: ChildProcess | undefined
	#interrupted = false

	constructor() {
		this.#signal = this.#interrupt.bind(this)
	}

	async execute(arguments_: readonly string[]): Promise<number> {
		const entry = join(this.#root, 'dist', 'app', 'server', 'main.cjs')
		if (!existsSync(entry)) {
			process.stderr.write('Build the application before running a study: npm run build\n')
			return 64
		}
		process.on('SIGINT', this.#signal)
		process.on('SIGTERM', this.#signal)
		try {
			let duration = 60000
			if (arguments_[0] === 'execute') {
				const check = ['check', ...arguments_.slice(1)]
				const out = check.indexOf('--out')
				if (out !== -1) check.splice(out, 2)
				const reading = await this.#launch(entry, check, duration, false)
				if (reading.code !== 0) {
					process.stdout.write(reading.output)
					return reading.code
				}
				const value: unknown = JSON.parse(reading.output)
				if (
					typeof value !== 'object' ||
					value === null ||
					!('bounds' in value) ||
					typeof value.bounds !== 'object' ||
					value.bounds === null ||
					!('series' in value.bounds) ||
					typeof value.bounds.series !== 'object' ||
					value.bounds.series === null ||
					!('duration' in value.bounds.series) ||
					typeof value.bounds.series.duration !== 'number' ||
					!Number.isSafeInteger(value.bounds.series.duration) ||
					value.bounds.series.duration <= 0 ||
					value.bounds.series.duration > 86400000
				)
					throw new Error(
						'Study execution requires a validated series duration within the 24-hour host ceiling',
					)
				duration = value.bounds.series.duration + 15000
			}
			if (this.#interrupted) return 130
			return (await this.#launch(entry, arguments_, duration, true)).code
		} finally {
			process.removeListener('SIGINT', this.#signal)
			process.removeListener('SIGTERM', this.#signal)
		}
	}

	#launch(
		entry: string,
		arguments_: readonly string[],
		duration: number,
		forward: boolean,
	): Promise<StudyLaunchResult> {
		return new Promise((resolve, reject) => {
			const child = spawn(process.execPath, ['--experimental-strip-types', entry, ...arguments_], {
				cwd: this.#root,
				shell: false,
				windowsHide: true,
				detached: process.platform !== 'win32',
				stdio: ['ignore', 'pipe', 'pipe'],
			})
			this.#child = child
			const chunks: Buffer[] = []
			let bytes = 0
			let failure: Error | undefined
			let expired = false
			const timer = setTimeout(() => {
				expired = true
				this.#terminate(child)
			}, duration)
			child.stdout.on('data', (chunk: Buffer) => {
				bytes += chunk.byteLength
				if (bytes > 16777216) {
					failure ??= new Error('Study command output exceeds the 16 MiB host allowance')
					this.#terminate(child)
					return
				}
				if (forward) process.stdout.write(chunk)
				else chunks.push(chunk)
			})
			child.stderr.on('data', (chunk: Buffer) => {
				bytes += chunk.byteLength
				if (bytes > 16777216) {
					failure ??= new Error('Study command output exceeds the 16 MiB host allowance')
					this.#terminate(child)
					return
				}
				process.stderr.write(chunk)
			})
			child.once('error', (error) => {
				failure ??= error
			})
			child.once('close', (code) => {
				clearTimeout(timer)
				if (this.#child === child) this.#child = undefined
				if (failure !== undefined) {
					reject(failure)
					return
				}
				if (expired)
					process.stderr.write(`Study process tree exceeded its ${duration} ms deadline\n`)
				resolve({
					code: this.#interrupted ? 130 : expired ? 124 : (code ?? 1),
					output: Buffer.concat(chunks).toString('utf8'),
				})
			})
			if (this.#interrupted) this.#terminate(child)
		})
	}

	#interrupt(): void {
		this.#interrupted = true
		if (this.#child !== undefined) this.#terminate(this.#child)
	}

	#terminate(child: ChildProcess): void {
		if (child.pid === undefined) return
		try {
			// Windows signals do not run cooperative cleanup; taskkill targets the recorded tree.
			if (process.platform === 'win32')
				execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
					windowsHide: true,
					timeout: 5000,
					stdio: 'ignore',
				})
			else process.kill(-child.pid, 'SIGKILL')
		} catch (error) {
			if (child.exitCode === null && child.signalCode === null) {
				process.stderr.write(
					`Unable to terminate study child ${child.pid}: ${error instanceof Error ? error.message : String(error)}\n`,
				)
				child.kill('SIGKILL')
			}
		}
	}
}

try {
	process.exitCode = await new StudyLauncher().execute(process.argv.slice(2))
} catch (error) {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
	process.exitCode = 1
}
