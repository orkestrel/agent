import { writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { readBuild } from '../../.orkestrel/agent/instruments/harness/.build/bench5/build/helpers.js'
import { hashFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'
import { readMatrixFiles } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'

const root = 'C:/Users/mikes/WebstormProjects/scaffold'
const results = join(root, '.orkestrel/agent/instruments/results/l14')
const run = join(results, 'q4-think0/pilot/development/l6-q4-think0-aggregate-v1')
const build = readBuild()
const matrixFiles = readMatrixFiles()
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const files = {
	buildManifest: hashFile(join(root, '.orkestrel/agent/instruments/harness/.build/build-manifest.json')),
	deployment: hashFile(join(root, 'tmp/units/aggregate-final-daemon-deployment.json')),
	frozen: hashFile(join(results, 'q4-think0/freeze/manifest.json')),
	resource: hashFile(join(results, 'q4-think0/resource/manifest.json')),
	fit: hashFile(join(results, 'calibration/q4/fit/fit.json')),
	pilotManifest: hashFile(join(results, 'q4-think0/pilot/manifest.json')),
	journal: hashFile(join(results, 'logs/q4-think0-pilot.jsonl')),
	errors: hashFile(join(results, 'logs/q4-think0-pilot.err')),
	run: {
		metadata: hashFile(join(run, 'run.json')),
		rows: hashFile(join(run, 'rows.jsonl')),
		requests: hashFile(join(run, 'requests.jsonl')),
		turns: hashFile(join(run, 'turns.jsonl')),
		selections: hashFile(join(run, 'selections.jsonl')),
		aggregates: hashFile(join(run, 'aggregates.jsonl'))
	}
}
const receipt = {
	head,
	files,
	build: {
		sources: build.sources.length,
		resources: build.resources.length,
		compilerInputs: build.compiler.inputs.length,
		outputs: build.outputs.length,
		matrixFiles: matrixFiles.length,
		compiler: build.compiler
	}
}
writeFileSync(join(root, 'tmp/units/aggregate-final-q4-pilot-custody.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' })
process.stdout.write(`${JSON.stringify({ head, files, counts: { sources: build.sources.length, resources: build.resources.length, compilerInputs: build.compiler.inputs.length, outputs: build.outputs.length, matrixFiles: matrixFiles.length } }, null, 2)}\n`)
