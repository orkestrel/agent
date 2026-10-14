import type { CapacityExit, CapacityProcess } from './types.ts'
import { spawn, spawnSync } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { join } from 'node:path'
import { finished } from 'node:stream/promises'
import { writeCapacityJSON } from './helpers.ts'

/** Runs exact serial child processes with retained output and finite cancellation. */
export class Runner {
	/** Executes one node child and waits for its termination.
	 * @param options - Arguments, existing journal directory, absolute deadline
	 * @returns Exact retained process outcome
	 */
	async execute(options: CapacityProcess): Promise<CapacityExit> {
		if (options.deadline <= Date.now())
			throw new Error('qualification deadline exhausted before child launch')
		const stdout = createWriteStream(join(options.out, 'stdout.log'), { flags: 'wx' })
		const stderr = createWriteStream(join(options.out, 'stderr.log'), { flags: 'wx' })
		const child = spawn(process.execPath, [...options.args], {
			shell: false,
			windowsHide: true,
			detached: process.platform !== 'win32',
			stdio: ['ignore', 'pipe', 'pipe'],
		})
		child.stdout.pipe(stdout)
		child.stderr.pipe(stderr)
		let expired = false
		let failure: string | undefined
		const timer = setTimeout(() => {
			expired = true
			const pid = child.pid
			if (pid === undefined) return
			try {
				if (process.platform === 'win32') {
					const killed = spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
						shell: false,
						windowsHide: true,
						encoding: 'utf8',
						timeout: 5000,
					})
					if (killed.status !== 0)
						failure = `child tree cancellation failed: ${killed.status}; ${killed.error?.message ?? killed.stderr}`
				} else process.kill(-pid, 'SIGKILL')
			} catch (error) {
				failure = error instanceof Error ? error.message : String(error)
			}
		}, options.deadline - Date.now())
		try {
			const result = await new Promise<CapacityExit>((resolve) => {
				child.on('error', (error) => {
					failure = error.message
				})
				child.once('close', (code, signal) =>
					resolve({ pid: child.pid, code, signal, expired, error: failure }),
				)
			})
			await Promise.all([finished(stdout), finished(stderr)])
			writeCapacityJSON(join(options.out, 'exit.json'), result)
			return result
		} finally {
			clearTimeout(timer)
		}
	}
}
