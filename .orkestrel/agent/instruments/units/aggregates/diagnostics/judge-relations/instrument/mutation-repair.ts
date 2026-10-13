import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { ROOT, UNIT } from './constants.ts'
import { computeHash, readBinding, writeArtifact } from './helpers.ts'

const output = resolve(UNIT, `proof-repair-mutation-${Date.now()}`)
mkdirSync(output)
const path = resolve(UNIT, 'Completion.ts')
const original = readFileSync(path)
const source = original.toString('utf8')
const lines = source.split(/\r\n|\n/)
const targets = lines.filter(line => line.includes('writeArtifact') && line.includes("availability: 'unavailable'"))
const target = targets[0]
if (targets.length !== 1 || target === undefined) throw new Error('Expected one load-bearing rejection-result write')
const mutant = source.replace(target, '\t\t\t\t// The scoped mutation disables rejected-result custody.')
const args = ['--test', '--test-name-pattern', '^real decoder rejection retains per-request unavailable result and explicit missing logprobs evidence$', resolve(UNIT, 'Completion.test.ts')]
writeFileSync(resolve(output, 'Completion-original.bin'), original, { flag: 'wx' })
writeFileSync(resolve(output, 'Completion-mutant.bin'), mutant, { flag: 'wx' })
let failed = false
try {
	writeFileSync(path, mutant)
	const started = performance.now()
	const child = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', env: {} })
	writeArtifact(resolve(output, 'red.json'), { command: [process.execPath, ...args], exit: child.status, stdout: child.stdout, stderr: child.stderr, wall: performance.now() - started })
	failed = child.status === 1 && child.stdout.includes('real decoder rejection retains per-request unavailable result and explicit missing logprobs evidence') && /fail 1/.test(child.stdout) && child.stdout.includes('ENOENT') && child.stdout.includes('normalized.json')
} finally { writeFileSync(path, original) }
if (!failed) throw new Error(`Mutation did not distinguish the missing artifact; see ${output}`)
if (readBinding(path).hash !== computeHash(original)) throw new Error('Restored completion bytes differ')
const started = performance.now()
const child = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', env: {} })
writeArtifact(resolve(output, 'green.json'), { command: [process.execPath, ...args], exit: child.status, stdout: child.stdout, stderr: child.stderr, wall: performance.now() - started })
if (child.status !== 0 || !/pass 1/.test(child.stdout)) throw new Error(`Restored mutation test failed; see ${output}`)
writeArtifact(resolve(output, 'summary.json'), { original: computeHash(original), mutant: computeHash(mutant), restored: readBinding(path), removed: target, replacement: '\t\t\t\t// The scoped mutation disables rejected-result custody.', red: readBinding(resolve(output, 'red.json')), green: readBinding(resolve(output, 'green.json')), inference: 0 })
console.log(JSON.stringify({ output, red: 1, green: 0, restored: readBinding(path).hash }))
