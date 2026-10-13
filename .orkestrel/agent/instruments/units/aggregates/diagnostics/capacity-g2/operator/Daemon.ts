import type { ChildProcess } from 'node:child_process'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, openSync, closeSync, writeSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { readString, writeArtifact } from '../aggregate-judge-counterfactual/helpers.ts'
import { CHILD_VALUES, UNIT } from './constants.ts'
import { computeOperator, describeError, readArguments, readFileBinding, validateOutput } from './helpers.ts'

/** Starts only an explicitly authorized attached Windows daemon under the canonical launcher. */
export class Daemon {
	#child: ChildProcess | undefined

	/** Refuses default startup and retains an immutable nonsecret start receipt.
	 * @param argv - Explicit start, receipt, and operator arguments
	 * @returns The native child exit code or a usage refusal
	 * @remarks Windows process-tree termination is platform-defined; forced outer termination can prevent a terminal artifact.
	 */
	async main(argv: readonly string[]): Promise<number> {
		try {
			if (argv[0] !== '--start') {
				console.log(JSON.stringify({ offline: true, message: 'No daemon started. Root must dispatch --start through the canonical launcher after closing the prior recorded tree.' }))
				return argv.length === 0 ? 0 : 64
			}
			if (process.platform !== 'win32') throw new Error('Controlled daemon entry requires Windows')
			const args = readArguments(argv.slice(1), ['--receipt', '--operator'])
			const receipt = validateOutput(readString(args['--receipt']))
			if (computeOperator() !== readString(args['--operator'])) throw new Error('Operator hash mismatch before spawn')
			if (!existsSync(dirname(receipt)) || existsSync(`${receipt}.exit.json`)) throw new Error('Receipt parent must exist and terminal artifact must be vacant')
			const executable = readFileBinding(resolve('C:/Users/mikes/scoop/apps/ollama-full/current/ollama.exe'))
			const environment = { ...process.env }
			// Only the named nonsecret overrides enter artifacts; inherited values remain unprinted.
			for (const name of Object.keys(environment)) if (Object.keys(CHILD_VALUES).some(declared => declared.toLowerCase() === name.toLowerCase())) delete environment[name]
			Object.assign(environment, CHILD_VALUES)
			const started = new Date().toISOString()
			const file = openSync(receipt, 'wx')
			try {
				this.#child = spawn(resolve('C:/Users/mikes/scoop/apps/ollama-full/current/ollama.exe'), ['serve'], { cwd: UNIT, env: environment, shell: false, windowsHide: true, detached: false, stdio: ['ignore', 'pipe', 'pipe'] })
				writeSync(file, `${JSON.stringify({ executable, values: CHILD_VALUES, pid: this.#child.pid, started }, null, 2)}\n`)
			} finally { closeSync(file) }
			const child = this.#child
			if (child === undefined) throw new Error('Daemon spawn produced no child')
			process.on('SIGINT', () => this.#terminate())
			process.on('SIGTERM', () => this.#terminate())
			process.on('SIGHUP', () => this.#terminate())
			child.stdout?.pipe(process.stdout)
			child.stderr?.pipe(process.stderr)
			console.log(JSON.stringify({ receipt: readFileBinding(receipt), pid: child.pid }))
			return await new Promise<number>(settle => {
				child.on('error', error => {
					writeArtifact(`${receipt}.exit.json`, { finished: new Date().toISOString(), error: describeError(error) })
					settle(127)
				})
				child.on('close', (code, signal) => {
					if (!existsSync(`${receipt}.exit.json`)) writeArtifact(`${receipt}.exit.json`, { pid: child.pid, finished: new Date().toISOString(), exit: code, signal })
					settle(code ?? 3)
				})
			})
		} catch (error) { console.error(JSON.stringify(describeError(error))); return 64 }
	}

	#terminate(): void {
		const pid = this.#child?.pid
		if (pid === undefined) return
		// Windows has no cooperative SIGTERM handler; the recorded child tree is the termination boundary.
		spawnSync('taskkill.exe', ['/pid', String(pid), '/T', '/F'], { shell: false, windowsHide: true, stdio: 'ignore' })
	}
}
