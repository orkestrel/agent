import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readObject, writeArtifact } from '../aggregate-judge-counterfactual/helpers.ts'
import { ROOT, UNIT } from './constants.ts'

/** Records scoped offline commands with complete unfiltered output. */
export class Gates {
	/** Checks types and syntax before guarded preparation and population proof.
	 * @returns Nothing when every expected exit and witness count matches
	 */
	execute(): void {
		mkdirSync(resolve(UNIT, 'evidence/gates-2'))
		this.#run('types', [resolve(ROOT, 'node_modules/typescript/bin/tsc'), '-p', resolve(UNIT, 'tsconfig.json')], 0)
		for (const name of readdirSync(UNIT).filter(name => name.endsWith('.ts')).sort()) this.#run(`syntax-${name}`, ['--check', resolve(UNIT, name)], 0)
		const control = this.#run('witness-negative', [resolve(UNIT, 'witness-negative.ts')], 3)
		assert.match(control.stderr, /Offline witness refuses fetch before native dispatch/)
		assert.match(control.stdout, /"global":1,"native":0/)
		for (const entry of ['main.ts', 'prepare.ts', 'execute.ts', 'start.ts']) {
			const result = this.#run(`default-${entry}`, ['--import', pathToFileURL(resolve(UNIT, 'witness.ts')).href, resolve(UNIT, entry)], 0)
			const lines = result.stdout.trim().split(/\r\n|\n/)
			assert.equal(readObject(JSON.parse(lines[0] ?? '')).offline, true)
			assert.deepEqual(readObject(JSON.parse(lines[1] ?? '')), { witness: true, global: 0, native: 0 })
		}
		this.#run('prepare', [resolve(UNIT, 'prepare-offline.ts')], 0)
		this.#run('population', [resolve(UNIT, 'verify.ts')], 0)
		assert.equal(readObject(JSON.parse(readFileSync(resolve(UNIT, 'evidence/population.json'), 'utf8'))).passed, true)
		console.log(JSON.stringify({ gates: true, service: false }))
	}

	#run(name: string, args: readonly string[], expected: number): { readonly stdout: string; readonly stderr: string } {
		const started = performance.now()
		const result = spawnSync(process.execPath, [...args], { cwd: ROOT, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30000 })
		writeArtifact(resolve(UNIT, `evidence/gates-2/${name}.json`), { executable: process.execPath, args, exit: result.status, signal: result.signal, stdout: result.stdout, stderr: result.stderr, duration: performance.now() - started })
		console.log(JSON.stringify({ command: [process.execPath, ...args], exit: result.status }))
		process.stdout.write(result.stdout)
		process.stderr.write(result.stderr)
		assert.equal(result.status, expected, result.stderr)
		return { stdout: result.stdout, stderr: result.stderr }
	}
}
