// Captures prospective pilot preparation only; invokes no model operator or saved-reader runtime.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DIRECTORY = 'C:/Users/mikes/WebstormProjects/scaffold'
const PREFIX = 'tmp/units/aggregate-successor-q4-pilot-2'
const SOURCE = '.orkestrel/agent/instruments/results/l15/custody/q4-pilot/aggregate-successor-q4-pilot-closure-2.ts'
const READER = `${PREFIX}-read.ts`
const BRIEF = `${PREFIX}-verifier-brief.md`
const DIFF = `${PREFIX}-reader.diff`
const COMMAND = `${PREFIX}-command.txt`
const CAPTURE = `${PREFIX}-preparation-capture.json`
const INPUTS = Object.freeze([
	{ path: '.orkestrel/agent/instruments/results/l15/q4-think0/freeze/manifest.json', expected: '95da49bbb6f4811f2bcad63e87ace42c380ba15ceb5ee42c0bd113b509ac72a9' },
	{ path: '.orkestrel/agent/instruments/results/l15/q4-think0/resource/manifest.json', expected: 'a4db9c340ad82e69b0f8b6b877ca4d330dac8d3375bb363e0378e58c96f1edcb' },
	{ path: '.orkestrel/agent/instruments/results/l15/calibration/q4/fit/fit.json', expected: '46f1bcf297ccd0989c20280f3e50bdaf692c8ab47b8d936487d6996eecd928a8' },
	{ path: '.orkestrel/agent/instruments/harness/.build/build-manifest.json', expected: '0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc' },
	{ path: 'tmp/units/aggregate-successor-daemon-deployment.json', expected: '40442197423b574b61548feb702b55c948d77f61dd719d9d6b26e24ad3016e19' },
	{ path: '.orkestrel/agent/instruments/harness/bench5/settings.json', expected: '760a4598c84f4e94cd22646959858b20eeab03a4e18494778e33f9849eee9bc9' },
])
if (resolve(process.cwd()) !== resolve(DIRECTORY)) throw new Error('Explicit scaffold cwd required')
for (const path of [DIFF, COMMAND, CAPTURE]) if (existsSync(path)) throw new Error(`Owned preparation output occupied: ${path}`)
const absent = [
	'.orkestrel/agent/instruments/results/l15/q4-think0/pilot-2',
	...['.jsonl', '.err', '.jsonl.pid', '.jsonl.status-before.txt', '.jsonl.status-after.txt'].map(suffix => `.orkestrel/agent/instruments/results/l15/logs/q4-think0-pilot-2${suffix}`),
	`${PREFIX}-execution-report.md`,
]
for (const path of absent) if (existsSync(path)) throw new Error(`Prospective output occupied: ${path}`)
const inputs = INPUTS.map(input => {
	const bytes = readFileSync(input.path)
	const sha256 = createHash('sha256').update(bytes).digest('hex')
	if (sha256 !== input.expected) throw new Error(`Fixed input differs: ${input.path}; expected ${input.expected}; found ${sha256}`)
	return { path: input.path, bytes: bytes.length, sha256 }
})
const source = readFileSync(SOURCE)
if (createHash('sha256').update(source).digest('hex') !== 'fe5190cf4b145f21b72d6d830ec836e21761a435663218be0437b168400e35f3') throw new Error('Accepted retained reader seal differs')
const reader = readFileSync(READER)
if (!Buffer.from(reader.toString('utf8').replace("join(cell, 'pilot-2', 'manifest.json')", "join(cell, 'pilot', 'manifest.json')"), 'utf8').equals(source)) throw new Error('Nonliteral or encoding reader difference')
const originalBrief = '.orkestrel/agent/instruments/results/l15/custody/q4-pilot/aggregate-successor-q4-pilot-brief.md'
const oldCommand = readFileSync(originalBrief, 'utf8').split(/\r\n|\n/u).find(line => line.startsWith('node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal '))
if (oldCommand === undefined) throw new Error('Exact retained pilot command missing')
const command = oldCommand.replaceAll('/logs/q4-think0-pilot.', '/logs/q4-think0-pilot-2.').replace('--out .orkestrel/agent/instruments/results/l15/q4-think0/pilot ', '--out .orkestrel/agent/instruments/results/l15/q4-think0/pilot-2 ')
if (!readFileSync(BRIEF, 'utf8').includes(command)) throw new Error('Verifier command differs from exact retained transcription')
writeFileSync(COMMAND, `${command}\n`, { flag: 'wx' })
const syntax = spawnSync(process.execPath, ['--check', READER], { cwd: DIRECTORY, encoding: 'utf8', shell: false, windowsHide: true })
if (syntax.status !== 0 || syntax.error !== undefined) throw new Error(`Reader syntax failed: ${syntax.stdout}${syntax.stderr}`)
const check = spawnSync(process.execPath, ['.agents/skills/orkestrel-dispatch/scripts/brief.ts', '--check', BRIEF], { cwd: DIRECTORY, encoding: 'utf8', shell: false, windowsHide: true })
if (check.status !== 0 || check.error !== undefined) throw new Error(`Verifier brief check failed: ${check.stdout}${check.stderr}`)
const difference = spawnSync('git', ['diff', '--no-index', '--no-ext-diff', '--', SOURCE, READER], { cwd: DIRECTORY, encoding: 'utf8', shell: false, windowsHide: true, maxBuffer: 1024 * 1024 })
if (difference.status !== 1 || difference.error !== undefined) throw new Error(`Literal diff failed: ${difference.stdout}${difference.stderr}`)
writeFileSync(DIFF, difference.stdout, { flag: 'wx' })
for (const input of inputs) if (createHash('sha256').update(readFileSync(input.path)).digest('hex') !== input.sha256) throw new Error(`Input changed: ${input.path}`)
if (!readFileSync(SOURCE).equals(source)) throw new Error('Original reader changed')
for (const path of absent) if (existsSync(path)) throw new Error(`Prospective output appeared: ${path}`)
const artifacts = [SOURCE, READER, BRIEF, DIFF, COMMAND].map(path => {
	const bytes = readFileSync(path)
	return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
})
const capture = { operation: 'prepare-only', inputs, artifacts, command, sourceSelection: { report: '.orkestrel/agent/instruments/results/l15/custody/q4-pilot/aggregate-successor-q4-pilot-report.md', exactAcceptedReader: SOURCE, expectedSha256: 'fe5190cf4b145f21b72d6d830ec836e21761a435663218be0437b168400e35f3' }, literal: { substitutions: 1, reverseByteEquality: true, incidentalEncodingChange: false, historicalExpectedHead: 'ae7af6e946ec8117111a753ff9f37e2ed1bef59a', releaseHead: 'Supplied separately by root; validated by verifier outside inherited historical report data.' }, syntax: { command: `node --check ${READER}`, exit: syntax.status, stdout: syntax.stdout, stderr: syntax.stderr }, factory: { command: 'node .agents/skills/orkestrel-dispatch/scripts/brief.ts --unit aggregate-successor-q4-pilot-2-verifier --lane units --subject "Execute the separately released fresh Q4 pilot observation"', exit: 0 }, check: { command: `node .agents/skills/orkestrel-dispatch/scripts/brief.ts --check ${BRIEF}`, exit: check.status, stdout: check.stdout, stderr: check.stderr }, diff: { command: `git diff --no-index --no-ext-diff -- ${SOURCE} ${READER}`, exit: difference.status, stderr: difference.stderr }, absent, scope: 'No operator, materializer, or saved-reader runtime; no model/service call, source/Git mutation, cleanup, or live Gemma4 evidence reading.' }
writeFileSync(CAPTURE, `${JSON.stringify(capture, null, 2)}\n`, { flag: 'wx' })
process.stdout.write(`${JSON.stringify(capture, null, 2)}\n`)
