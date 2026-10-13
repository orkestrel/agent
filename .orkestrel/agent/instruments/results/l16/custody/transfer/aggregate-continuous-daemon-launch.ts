// Root tracks aggregate-continuous-daemon-root.jsonl under the prior 259200-second cap; this successor retains the accepted environment and uses a separate receipt after the hold.
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const values = Object.freeze({
	OLLAMA_HOST: 'http://127.0.0.1:11435',
	OLLAMA_NUM_PARALLEL: '1',
	OLLAMA_MAX_LOADED_MODELS: '0',
	LLAMA_ARG_CONTEXT_SHIFT: '0',
	LLAMA_ARG_N_PARALLEL: '1',
})
const environment = { ...process.env }
for (const name of Object.keys(environment)) {
	if (Object.keys(values).some((key) => key.toLowerCase() === name.toLowerCase())) delete environment[name]
}
Object.assign(environment, values)
const executable = 'C:/Users/mikes/scoop/apps/ollama-full/current/ollama.exe'
const cwd = resolve('tmp/units/aggregate-capacity-probe')
const child = spawn(executable, ['serve'], {
	cwd,
	env: environment,
	shell: false,
	windowsHide: true,
	detached: false,
	stdio: ['ignore', 'pipe', 'pipe'],
})
if (child.pid === undefined) throw new Error('Ollama spawn produced no PID')
const receipt = { pid: child.pid, executable, args: ['serve'], cwd, values, started: new Date().toISOString() }
writeFileSync('tmp/units/aggregate-continuous-daemon-start.json', `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify(receipt))
child.stdout?.pipe(process.stdout)
child.stderr?.pipe(process.stderr)
process.on('SIGINT', () => child.kill())
process.on('SIGTERM', () => child.kill())
process.on('SIGHUP', () => child.kill())
child.on('error', (error) => {
	console.error(error.message)
	process.exitCode = 127
})
child.on('close', (code) => {
	process.exitCode = code ?? 3
})
